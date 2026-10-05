import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  avatar_color: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  progress: number; // 0 - 100
  start_date: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD or "Present" / "Ongoing"
  is_currently_working?: boolean;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  path: string;
  upload_date: string;
}

export interface Activity {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  projects: Project[];
  files: ProjectFile[];
  activities: Activity[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'projectflow.db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class RelationalDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
    if (this.data.users.length === 0) {
      this.seedInitialData();
    }
    this.initFromTiDB().catch((err) => {
      console.warn('[DB] Background TiDB sync warning:', err.message);
    });
  }

  public async initFromTiDB(): Promise<void> {
    try {
      const { tidbManager } = await import('./tidb.ts');
      let status = tidbManager.getStatus();
      if (!status.connected) {
        await tidbManager.initPool();
        status = tidbManager.getStatus();
      }
      if (status.connected) {
        const remoteData = await tidbManager.pullDataFromRemote();
        if (remoteData && remoteData.users.length > 0) {
          console.log(`[DB] Successfully loaded from TiDB Cloud: ${remoteData.users.length} users, ${remoteData.projects.length} projects, ${remoteData.files.length} files`);
          this.data = {
            users: remoteData.users,
            projects: remoteData.projects,
            files: remoteData.files,
            activities: remoteData.activities,
          };
          fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        }
      }
    } catch (err: any) {
      console.warn('[DB] TiDB pull notice:', err.message);
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading database file, initializing empty schema:', err);
    }
    return {
      users: [],
      projects: [],
      files: [],
      activities: [],
    };
  }

  private syncTimer: NodeJS.Timeout | null = null;

  private saveDatabase(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');

      // Asynchronous continuous replication to TiDB Cloud
      if (this.syncTimer) clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(async () => {
        try {
          const { tidbManager } = await import('./tidb.ts');
          if (tidbManager.getStatus().connected) {
            await tidbManager.syncDataFromLocal(this.data);
          }
        } catch {
          // Resilient replication - local storage protects data integrity
        }
      }, 400);
    } catch (err) {
      console.error('Error saving database file:', err);
    }
  }

  private seedInitialData(): void {
    // Seed default demo user: demo@projectflow.io / Password123!
    // bcrypt hash of Password123! with salt 10
    const demoUserId = 'usr_' + crypto.randomUUID().slice(0, 8);
    const demoUser: User = {
      id: demoUserId,
      email: 'demo@projectflow.io',
      password_hash: '$2a$10$wE9qfVn1QO7T9tZ0zH3sUe7Oq1QZ9sF0g2t5W6p3K8m1L4n7J9xGy', // Password123!
      full_name: 'Alex Morgan',
      avatar_color: '#4f46e5',
      role: 'Lead Project Director',
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const project1Id = 'prj_' + crypto.randomUUID().slice(0, 8);
    const project2Id = 'prj_' + crypto.randomUUID().slice(0, 8);
    const project3Id = 'prj_' + crypto.randomUUID().slice(0, 8);
    const project4Id = 'prj_' + crypto.randomUUID().slice(0, 8);

    const now = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const projects: Project[] = [
      {
        id: project1Id,
        user_id: demoUserId,
        name: 'Nexus Cloud Infrastructure Migration',
        description: 'Complete architecture migration from legacy monolith to hybrid Kubernetes microservices with zero-downtime deployment pipelines.',
        status: 'In Progress',
        priority: 'High',
        progress: 68,
        start_date: formatDate(new Date(now.getTime() - 25 * 24 * 3600 * 1000)),
        deadline: formatDate(new Date(now.getTime() + 15 * 24 * 3600 * 1000)),
        created_at: new Date(now.getTime() - 25 * 24 * 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: project2Id,
        user_id: demoUserId,
        name: 'Quantum Design System v3.0',
        description: 'Unified cross-platform component library with strict WCAG AAA contrast, semantic token governance, and automated Figma sync.',
        status: 'In Progress',
        priority: 'Urgent',
        progress: 85,
        start_date: formatDate(new Date(now.getTime() - 40 * 24 * 3600 * 1000)),
        deadline: formatDate(new Date(now.getTime() + 7 * 24 * 3600 * 1000)),
        created_at: new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: project3Id,
        user_id: demoUserId,
        name: 'Enterprise Security & SOC2 Compliance',
        description: 'Penetration testing audits, access control hardening, automated vulnerability scans, and comprehensive data residency policies.',
        status: 'Completed',
        priority: 'High',
        progress: 100,
        start_date: formatDate(new Date(now.getTime() - 60 * 24 * 3600 * 1000)),
        deadline: formatDate(new Date(now.getTime() - 5 * 24 * 3600 * 1000)),
        created_at: new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: project4Id,
        user_id: demoUserId,
        name: 'Mobile Client v2.5 Performance Tuning',
        description: 'Optimizing startup cold-launch latency, memory footprint on low-spec devices, and offline cache synchronization.',
        status: 'Planning',
        priority: 'Medium',
        progress: 20,
        start_date: formatDate(new Date(now.getTime() - 10 * 24 * 3600 * 1000)),
        deadline: formatDate(new Date(now.getTime() + 45 * 24 * 3600 * 1000)),
        created_at: new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Create a sample seed file on disk for project 1
    const sampleStoredFilename = 'seed_architecture_spec_' + Date.now() + '.txt';
    const sampleFilePath = path.join(UPLOADS_DIR, sampleStoredFilename);
    const sampleContent = `# ProjectFlow Architecture Specification
Project: Nexus Cloud Infrastructure Migration
Lead: Alex Morgan

1. Scope:
- Microservices decomposition
- Container orchestration via Kubernetes
- PostgreSQL replication across multi-region VPCs
- Envoy proxy routing & mutual TLS encryption

2. Invariants:
- High availability 99.99% uptime
- Maximum round-trip latency p99 < 80ms
- Real-time audit trails with cryptographically verified logs
`;
    fs.writeFileSync(sampleFilePath, sampleContent, 'utf-8');

    const sampleFile: ProjectFile = {
      id: 'fil_' + crypto.randomUUID().slice(0, 8),
      project_id: project1Id,
      user_id: demoUserId,
      filename: 'Architecture_Spec_v1.0.txt',
      stored_filename: sampleStoredFilename,
      file_type: 'text/plain',
      file_size: Buffer.byteLength(sampleContent, 'utf-8'),
      path: sampleFilePath,
      upload_date: new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString(),
    };

    const activities: Activity[] = [
      {
        id: 'act_' + crypto.randomUUID().slice(0, 8),
        project_id: project1Id,
        user_id: demoUserId,
        action: 'PROJECT_CREATED',
        details: 'Project "Nexus Cloud Infrastructure Migration" was initialized',
        created_at: new Date(now.getTime() - 25 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'act_' + crypto.randomUUID().slice(0, 8),
        project_id: project1Id,
        user_id: demoUserId,
        action: 'FILE_UPLOADED',
        details: 'Uploaded technical specification document "Architecture_Spec_v1.0.txt"',
        created_at: new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'act_' + crypto.randomUUID().slice(0, 8),
        project_id: project1Id,
        user_id: demoUserId,
        action: 'PROGRESS_UPDATED',
        details: 'Updated milestone completion progress to 68%',
        created_at: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'act_' + crypto.randomUUID().slice(0, 8),
        project_id: project2Id,
        user_id: demoUserId,
        action: 'PROJECT_CREATED',
        details: 'Project "Quantum Design System v3.0" was initialized',
        created_at: new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'act_' + crypto.randomUUID().slice(0, 8),
        project_id: project3Id,
        user_id: demoUserId,
        action: 'STATUS_CHANGED',
        details: 'Status changed to Completed after successful SOC2 Type II audit',
        created_at: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      },
    ];

    this.data = {
      users: [demoUser],
      projects,
      files: [sampleFile],
      activities,
    };
    this.saveDatabase();
  }

  // --- Users Operations ---
  findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const newUser: User = {
      ...user,
      id: 'usr_' + crypto.randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.saveDatabase();
    return newUser;
  }

  updateUser(id: string, updates: Partial<Pick<User, 'full_name' | 'avatar_color' | 'role' | 'password_hash'>>): User | null {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return user;
  }

  // --- Projects Operations ---
  getProjects(userId?: string): Project[] {
    return this.data.projects;
  }

  getProjectById(id: string, userId?: string): Project | undefined {
    return this.data.projects.find(p => p.id === id);
  }

  createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Project {
    const newProject: Project = {
      ...project,
      id: 'prj_' + crypto.randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.projects.unshift(newProject);
    this.saveDatabase();

    // Log activity
    this.createActivity({
      project_id: newProject.id,
      user_id: newProject.user_id,
      action: 'PROJECT_CREATED',
      details: `Project "${newProject.name}" was created with priority ${newProject.priority}`,
    });

    return newProject;
  }

  updateProject(id: string, userId: string, updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Project | null {
    const project = this.getProjectById(id, userId);
    if (!project) return null;

    const changes: string[] = [];
    if (updates.status && updates.status !== project.status) {
      changes.push(`Status changed from ${project.status} to ${updates.status}`);
    }
    if (updates.progress !== undefined && updates.progress !== project.progress) {
      changes.push(`Progress updated to ${updates.progress}%`);
    }
    if (updates.priority && updates.priority !== project.priority) {
      changes.push(`Priority changed to ${updates.priority}`);
    }

    Object.assign(project, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();

    if (changes.length > 0) {
      this.createActivity({
        project_id: project.id,
        user_id: userId,
        action: 'PROJECT_UPDATED',
        details: changes.join('; '),
      });
    }

    return project;
  }

  deleteProject(id: string, userId: string): boolean {
    const index = this.data.projects.findIndex(p => p.id === id && p.user_id === userId);
    if (index === -1) return false;

    // Delete associated files on disk as well
    const projectFiles = this.data.files.filter(f => f.project_id === id);
    for (const f of projectFiles) {
      try {
        if (fs.existsSync(f.path)) {
          fs.unlinkSync(f.path);
        }
      } catch (e) {
        console.error('Error deleting file from disk:', e);
      }
    }

    // Filter out files and activities
    this.data.files = this.data.files.filter(f => f.project_id !== id);
    this.data.activities = this.data.activities.filter(a => a.project_id !== id);
    this.data.projects.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // --- Files Operations ---
  getFiles(userId?: string, projectId?: string): (ProjectFile & { project_name?: string })[] {
    const files = projectId
      ? this.data.files.filter(f => f.project_id === projectId)
      : this.data.files;

    return files.map(file => {
      const proj = this.data.projects.find(p => p.id === file.project_id);
      return {
        ...file,
        project_name: proj ? proj.name : 'Unknown Project',
      };
    });
  }

  getFileById(id: string, userId?: string): (ProjectFile & { project_name?: string }) | undefined {
    let file = userId ? this.data.files.find(f => f.id === id && f.user_id === userId) : undefined;
    if (!file) {
      file = this.data.files.find(f => f.id === id);
    }
    if (!file) return undefined;
    const proj = this.data.projects.find(p => p.id === file.project_id);
    return {
      ...file,
      project_name: proj ? proj.name : 'Unknown Project',
    };
  }

  createFile(file: Omit<ProjectFile, 'id' | 'upload_date'>): ProjectFile {
    const newFile: ProjectFile = {
      ...file,
      id: 'fil_' + crypto.randomUUID().slice(0, 8),
      upload_date: new Date().toISOString(),
    };
    this.data.files.unshift(newFile);
    this.saveDatabase();

    // Log activity
    this.createActivity({
      project_id: newFile.project_id,
      user_id: newFile.user_id,
      action: 'FILE_UPLOADED',
      details: `File "${newFile.filename}" (${(newFile.file_size / 1024).toFixed(1)} KB) uploaded`,
    });

    return newFile;
  }

  deleteFile(id: string, userId?: string): boolean {
    const index = this.data.files.findIndex(f => f.id === id);
    if (index === -1) return false;

    const file = this.data.files[index];
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      } else if (file.stored_filename) {
        const storedPath = path.resolve(uploadsDir, file.stored_filename);
        if (fs.existsSync(storedPath)) {
          fs.unlinkSync(storedPath);
        }
      }
    } catch (err) {
      console.error('Error removing file from disk:', err);
    }

    this.createActivity({
      project_id: file.project_id,
      user_id: userId || file.user_id,
      action: 'FILE_DELETED',
      details: `File "${file.filename}" was deleted`,
    });

    this.data.files.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // --- Activities Operations ---
  getActivities(userId: string, projectId?: string): Activity[] {
    const acts = projectId
      ? this.data.activities.filter(a => a.user_id === userId && a.project_id === projectId)
      : this.data.activities.filter(a => a.user_id === userId);
    
    return acts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createActivity(activity: Omit<Activity, 'id' | 'created_at'>): Activity {
    const newActivity: Activity = {
      ...activity,
      id: 'act_' + crypto.randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
    };
    this.data.activities.unshift(newActivity);
    // Keep max 500 activities to prevent uncontrolled growth
    if (this.data.activities.length > 500) {
      this.data.activities = this.data.activities.slice(0, 500);
    }
    this.saveDatabase();
    return newActivity;
  }
}

export const db = new RelationalDatabase();
