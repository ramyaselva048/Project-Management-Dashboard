export type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled' | string;
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Urgent' | string;

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_color: string;
  role: string;
  created_at?: string;
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
  files_count?: number;
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
  project_name?: string;
}

export interface Activity {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
}

export interface ReportSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  totalFiles: number;
  avgProgress: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  statusChart: { name: string; count: number; color: string }[];
  progressChart: { name: string; progress: number }[];
  monthlyStats: { month: string; created: number; completed: number }[];
}

export interface DatabaseStatus {
  connected: boolean;
  host: string;
  port: number;
  user: string;
  database: string;
  hasPassword: boolean;
  version: string | null;
  latencyMs: number;
  error: string | null;
  engine: string;
  connectionUri: string;
}

