import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  UploadCloud,
  FileText,
  Download,
  Eye,
  Activity as ActivityIcon,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
} from 'lucide-react';
import { Project, ProjectFile, Activity } from '../types/index.ts';
import { api } from '../services/api.ts';
import { StatusBadge, PriorityBadge } from '../components/common/Badge.tsx';
import { ProjectModal } from '../components/projects/ProjectModal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { FilePreviewModal } from '../components/files/FilePreviewModal.tsx';
import { FileUploadModal } from '../components/files/FileUploadModal.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [project, setProject] = useState<
    (Project & { files: ProjectFile[]; activities: Activity[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [deletingFile, setDeletingFile] = useState<ProjectFile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProjectDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getProjectById(id);
      setProject(data);
    } catch (err: any) {
      console.error('Failed to load project details:', err);
      error(err.message || 'Failed to load project details.');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      setDeleteLoading(true);
      await api.deleteProject(project.id);
      success(`Project "${project.name}" was deleted.`);
      navigate('/projects');
    } catch (err: any) {
      error(err.message || 'Failed to delete project.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!deletingFile) return;
    try {
      setDeleteLoading(true);
      await api.deleteFile(deletingFile.id);
      success(`File "${deletingFile.filename}" deleted.`);
      setDeletingFile(null);
      fetchProjectDetails();
    } catch (err: any) {
      error(err.message || 'Failed to delete file.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    if (['xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    if (['zip'].includes(ext || '')) return <FileArchive className="w-5 h-5 text-amber-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading || !project) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isWorking =
    project.is_currently_working ||
    project.deadline === 'Present' ||
    project.deadline === 'Ongoing';

  const deadlineTime = new Date(project.deadline).getTime();
  const isOverdue =
    !isWorking &&
    !isNaN(deadlineTime) &&
    deadlineTime < Date.now() &&
    project.status !== 'Completed' &&
    project.status !== 'Cancelled';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {project.name}
              </h2>
              <StatusBadge status={project.status} size="sm" />
              <PriorityBadge priority={project.priority} size="sm" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Created on {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Project
          </button>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 hover:bg-rose-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          Executive Overview & Context
        </h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {project.description || 'No detailed description provided for this project.'}
        </p>

        {/* Milestone & Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex justify-between items-center text-xs font-medium mb-1.5">
              <span className="text-slate-500">Milestone Progress</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                {project.progress}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Initiation Date</p>
              <p className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                {project.start_date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isWorking
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : isOverdue
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">
                {isWorking ? 'Current Status' : 'End Date / Target'}
              </p>
              <p
                className={`text-xs font-mono font-medium ${
                  isWorking
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5'
                    : isOverdue
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {isWorking ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Currently Working (Present)
                  </>
                ) : (
                  <>
                    {project.deadline} {isOverdue && '(Overdue)'}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Files Vault & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Files (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Project Files ({project.files.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Specifications, documentation, and attached deliverables
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              Upload File
            </button>
          </div>

          {project.files.length === 0 ? (
            <div className="py-12 text-center">
              <UploadCloud className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No files uploaded to this project yet
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-4">
                Attach PDFs, spreadsheets, images, or technical specs.
              </p>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60"
              >
                Upload Document Now
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {project.files.map((file) => (
                <div
                  key={file.id}
                  className="py-3 flex items-center justify-between gap-4 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {getFileIcon(file.filename)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {file.filename}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatFileSize(file.file_size)} · {new Date(file.upload_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      title="Preview Document"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={api.getDownloadUrl(file.id)}
                      download
                      title="Download Document"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setDeletingFile(file)}
                      title="Delete Document"
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Audit Trail (1 Col) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Activity History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit trail of changes and uploads
            </p>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[420px] pr-1">
            {project.activities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No activity recorded yet.
              </p>
            ) : (
              project.activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ActivityIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {act.details}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {new Date(act.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ProjectModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
        onSaved={() => fetchProjectDetails()}
      />

      {/* Delete Project Dialog */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${project.name}"? This action cannot be reversed.`}
        confirmText="Delete Project"
        isLoading={deleteLoading}
      />

      {/* Upload File to this project */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        defaultProjectId={project.id}
        projects={[project]}
        onUploaded={() => fetchProjectDetails()}
      />

      {/* Preview File */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Delete File Dialog */}
      <ConfirmDialog
        isOpen={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        onConfirm={handleDeleteFile}
        title="Delete File"
        message={`Delete "${deletingFile?.filename}" permanently from the server?`}
        confirmText="Delete File"
        isLoading={deleteLoading}
      />
    </div>
  );
};
