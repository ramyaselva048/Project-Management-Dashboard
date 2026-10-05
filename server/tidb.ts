import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface TiDBConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl: {
    rejectUnauthorized: boolean;
    minVersion?: string;
  };
}

const CONFIG_PATH = path.resolve(process.cwd(), 'data', 'tidb_config.json');

const DEFAULT_CONFIG: TiDBConfig = {
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2zWeNSGrm7sUDKF.root',
  password: 'BNYnihhRu4nA4VtP',
  database: 'projectflow',
  ssl: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
};

export class TiDBManager {
  private config: TiDBConfig;
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;
  private lastError: string | null = null;
  private version: string | null = null;
  private latencyMs: number = 0;

  constructor() {
    this.config = this.loadConfig();
    // Initialize pool asynchronously on boot
    if (this.config.password) {
      this.initPool().catch((err) => {
        console.warn('[TiDB] Background connection attempt notice:', err.message);
      });
    }
  }

  private loadConfig(): TiDBConfig {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          password: parsed.password || process.env.TIDB_PASSWORD || DEFAULT_CONFIG.password,
          database: parsed.database === 'sys' ? 'projectflow' : (parsed.database || 'projectflow'),
        };
      }
    } catch (e) {
      console.error('Failed to load TiDB config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(newConfig: Partial<TiDBConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.config.database === 'sys') {
      this.config.database = 'projectflow';
    }
    try {
      const dataDir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist TiDB config:', e);
    }
  }

  public async initPool(overrideConfig?: Partial<TiDBConfig>): Promise<{ success: boolean; message: string; version?: string }> {
    if (overrideConfig) {
      this.saveConfig(overrideConfig);
    }

    if (!this.config.password) {
      this.isConnected = false;
      this.lastError = 'Password required to connect to TiDB Cloud gateway';
      return { success: false, message: this.lastError };
    }

    try {
      if (this.pool) {
        try {
          await this.pool.end();
        } catch {
          // ignore cleanup error
        }
        this.pool = null;
      }

      // Ensure target database exists
      try {
        const tempConn = await mysql.createConnection({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          ssl: { rejectUnauthorized: false },
          connectTimeout: 8000,
        });
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\`;`);
        await tempConn.end();
      } catch (err: any) {
        console.warn('[TiDB] Pre-connect database check notice:', err.message);
      }

      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        ssl: {
          rejectUnauthorized: false,
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 8000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });

      const start = Date.now();
      const [rows]: any = await this.pool.query('SELECT VERSION() as ver, DATABASE() as db');
      this.latencyMs = Date.now() - start;

      this.isConnected = true;
      this.lastError = null;
      this.version = rows[0]?.ver || 'TiDB Cloud';

      console.log(`[TiDB] Connected successfully to ${this.config.host}:${this.config.port}/${this.config.database} (${this.version})`);

      // Initialize database schema tables
      await this.initializeTables();

      return {
        success: true,
        message: 'Successfully connected to TiDB Cloud',
        version: this.version || undefined,
      };
    } catch (err: any) {
      this.isConnected = false;
      this.lastError = err.message || 'Connection failed';
      console.error('[TiDB] Connection error:', err.message);
      return {
        success: false,
        message: err.message || 'Connection to TiDB Cloud failed',
      };
    }
  }

  public async initializeTables(): Promise<void> {
    if (!this.pool) return;

    try {
      // 1. Users table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          avatar_color VARCHAR(32) NOT NULL DEFAULT '#4f46e5',
          role VARCHAR(64) NOT NULL DEFAULT 'Project Manager',
          created_at VARCHAR(64) NOT NULL,
          updated_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Projects table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(64) NOT NULL DEFAULT 'Planning',
          priority VARCHAR(64) NOT NULL DEFAULT 'Medium',
          progress INT NOT NULL DEFAULT 0,
          start_date VARCHAR(64) NOT NULL,
          deadline VARCHAR(64) NOT NULL,
          is_currently_working TINYINT(1) DEFAULT 0,
          end_date VARCHAR(64),
          created_at VARCHAR(64) NOT NULL,
          updated_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Add end_date column if not present
      try {
        await this.pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date VARCHAR(64);');
      } catch {
        // column may exist or table has column
      }

      // 3. Project Files table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS project_files (
          id VARCHAR(64) PRIMARY KEY,
          project_id VARCHAR(64) NOT NULL,
          user_id VARCHAR(64) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          stored_filename VARCHAR(255) NOT NULL,
          file_type VARCHAR(128) NOT NULL,
          file_size INT NOT NULL,
          path VARCHAR(512) NOT NULL,
          upload_date VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Activities table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS activities (
          id VARCHAR(64) PRIMARY KEY,
          project_id VARCHAR(64) NOT NULL,
          user_id VARCHAR(64) NOT NULL,
          action VARCHAR(128) NOT NULL,
          details TEXT NOT NULL,
          created_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      console.log('[TiDB] Tables schema verified in TiDB Cloud.');
    } catch (err: any) {
      console.error('[TiDB] Failed to create or verify schema tables:', err.message);
    }
  }

  public async pullDataFromRemote(): Promise<{
    users: any[];
    projects: any[];
    files: any[];
    activities: any[];
  } | null> {
    if (!this.pool || !this.isConnected) return null;

    try {
      const [users]: any = await this.pool.query('SELECT * FROM users');
      const [projects]: any = await this.pool.query('SELECT * FROM projects');
      const [files]: any = await this.pool.query('SELECT * FROM project_files');
      const [activities]: any = await this.pool.query('SELECT * FROM activities');

      const normalizedProjects = projects.map((p: any) => ({
        ...p,
        progress: Number(p.progress || 0),
        is_currently_working: Boolean(p.is_currently_working),
      }));

      const normalizedFiles = files.map((f: any) => ({
        ...f,
        file_size: Number(f.file_size || 0),
      }));

      return {
        users: users || [],
        projects: normalizedProjects || [],
        files: normalizedFiles || [],
        activities: activities || [],
      };
    } catch (err: any) {
      console.error('[TiDB] Failed to pull data from TiDB Cloud:', err.message);
      return null;
    }
  }

  public async syncDataFromLocal(data: {
    users: any[];
    projects: any[];
    files: any[];
    activities: any[];
  }): Promise<{ usersCount: number; projectsCount: number; filesCount: number; activitiesCount: number }> {
    if (!this.pool || !this.isConnected) {
      throw new Error('TiDB is not currently connected');
    }

    // Sync users
    for (const u of data.users) {
      await this.pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, avatar_color, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         avatar_color = VALUES(avatar_color),
         role = VALUES(role),
         updated_at = VALUES(updated_at)`,
        [u.id, u.email, u.password_hash, u.full_name, u.avatar_color || '#4f46e5', u.role || 'Project Manager', u.created_at, u.updated_at]
      );
    }

    // Sync projects
    for (const p of data.projects) {
      await this.pool.query(
        `INSERT INTO projects (id, user_id, name, description, status, priority, progress, start_date, deadline, is_currently_working, end_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         status = VALUES(status),
         priority = VALUES(priority),
         progress = VALUES(progress),
         start_date = VALUES(start_date),
         deadline = VALUES(deadline),
         is_currently_working = VALUES(is_currently_working),
         end_date = VALUES(end_date),
         updated_at = VALUES(updated_at)`,
        [
          p.id,
          p.user_id,
          p.name,
          p.description || '',
          p.status,
          p.priority,
          p.progress || 0,
          p.start_date || '',
          p.deadline || '',
          p.is_currently_working ? 1 : 0,
          p.end_date || null,
          p.created_at,
          p.updated_at,
        ]
      );
    }

    // Sync files
    for (const f of data.files) {
      await this.pool.query(
        `INSERT INTO project_files (id, project_id, user_id, filename, stored_filename, file_type, file_size, path, upload_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         filename = VALUES(filename),
         stored_filename = VALUES(stored_filename),
         file_type = VALUES(file_type),
         file_size = VALUES(file_size),
         path = VALUES(path)`,
        [f.id, f.project_id, f.user_id, f.filename, f.stored_filename, f.file_type, f.file_size, f.path, f.upload_date]
      );
    }

    // Sync activities
    for (const a of data.activities) {
      await this.pool.query(
        `INSERT INTO activities (id, project_id, user_id, action, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         action = VALUES(action),
         details = VALUES(details)`,
        [a.id, a.project_id, a.user_id, a.action, a.details, a.created_at]
      );
    }

    return {
      usersCount: data.users.length,
      projectsCount: data.projects.length,
      filesCount: data.files.length,
      activitiesCount: data.activities.length,
    };
  }

  public getPool(): mysql.Pool | null {
    return this.pool;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      database: this.config.database,
      hasPassword: Boolean(this.config.password),
      version: this.version || '8.0.11-TiDB-v8.5.3-serverless',
      latencyMs: this.latencyMs,
      error: this.lastError,
      engine: 'TiDB Cloud (Serverless / Distributed MySQL)',
      connectionUri: `mysql://${this.config.user}:****@${this.config.host}:${this.config.port}/${this.config.database}`,
    };
  }
}

export const tidbManager = new TiDBManager();
