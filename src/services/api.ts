import { Project, ProjectFile, Activity, ReportSummary, User, DatabaseStatus } from '../types/index.ts';

const TOKEN_KEY = 'projectflow_token';

export const getAuthToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return null;
  }
  return token;
};

export const setAuthToken = (token: string): void => {
  if (token && token !== 'null' && token !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Unauthorized or token expired - clear stale token from storage
    removeAuthToken();
  }

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data && data.error ? data.error : `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  signup: (payload: { email: string; password: string; full_name: string }) =>
    request<{ user: User; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getProfile: () => request<User>('/api/auth/me'),

  updateProfile: (payload: { full_name?: string; role?: string; avatar_color?: string }) =>
    request<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: { current_password?: string; new_password: string }) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload: { new_password: string }) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  resetPasswordByEmail: (payload: { email: string; new_password: string }) =>
    request<{ user: User; token: string; message: string }>('/api/auth/reset-password-by-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Projects
  getProjects: (params?: { status?: string; priority?: string; search?: string; sort?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    const qs = query.toString();
    return request<Project[]>(`/api/projects${qs ? `?${qs}` : ''}`);
  },

  getProjectById: (id: string) =>
    request<Project & { files: ProjectFile[]; activities: Activity[] }>(`/api/projects/${id}`),

  createProject: (payload: Partial<Project>) =>
    request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProject: (id: string, payload: Partial<Project>) =>
    request<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProject: (id: string) =>
    request<{ message: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    }),

  // Files
  getFiles: (params?: { project_id?: string; type?: string; search?: string; sort?: string }) => {
    const query = new URLSearchParams();
    if (params?.project_id) query.append('project_id', params.project_id);
    if (params?.type) query.append('type', params.type);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    const qs = query.toString();
    return request<ProjectFile[]>(`/api/files${qs ? `?${qs}` : ''}`);
  },

  uploadFile: (
    file: File,
    projectId: string,
    onProgress?: (percent: number) => void
  ): Promise<ProjectFile> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);

      xhr.open('POST', '/api/files');
      const token = getAuthToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve(xhr.responseText as any);
          }
        } else {
          try {
            const errResponse = JSON.parse(xhr.responseText);
            reject(new Error(errResponse.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload'));
      };

      xhr.send(formData);
    });
  },

  deleteFile: (id: string) =>
    request<{ message: string }>(`/api/files/${id}`, {
      method: 'DELETE',
    }),

  getDownloadUrl: (id: string) => {
    const token = getAuthToken();
    return `/api/files/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  getPreviewUrl: (id: string) => {
    const token = getAuthToken();
    return `/api/files/${id}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // Reports
  getReportsSummary: () => request<ReportSummary>('/api/reports/summary'),

  // TiDB Cloud Database
  getDatabaseStatus: () => request<DatabaseStatus>('/api/database/status'),

  connectDatabase: (payload: { password?: string; connection_string?: string; database?: string }) =>
    request<{ message: string; version?: string; status: DatabaseStatus }>('/api/database/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  syncDatabase: () =>
    request<{ message: string; counts: any; status: DatabaseStatus }>('/api/database/sync', {
      method: 'POST',
    }),
};

