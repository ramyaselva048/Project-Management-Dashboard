import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  FolderGit2,
  Plus,
  X,
  RotateCcw,
} from 'lucide-react';
import { ProjectFile, Project } from '../types/index.ts';
import { api } from '../services/api.ts';
import { FileUploadModal } from '../components/files/FileUploadModal.tsx';
import { FilePreviewModal } from '../components/files/FilePreviewModal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { downloadFileDirectly } from '../utils/fileDownloader.ts';

export const FilesPage: React.FC = () => {
  const { success, error } = useToast();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [deletingFile, setDeletingFile] = useState<ProjectFile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFiles = useCallback(
    async (overrideType?: string, overrideProject?: string, overrideSearch?: string) => {
      try {
        setLoading(true);
        const activeType = overrideType !== undefined ? overrideType : typeFilter;
        const activeProject = overrideProject !== undefined ? overrideProject : projectFilter;
        const activeSearch = overrideSearch !== undefined ? overrideSearch : search;

        const [filesData, projectsData] = await Promise.all([
          api.getFiles({
            search: activeSearch.trim() || undefined,
            type: activeType !== 'all' ? activeType : undefined,
            project_id: activeProject !== 'all' ? activeProject : undefined,
            sort: sortBy !== 'newest' ? sortBy : undefined,
          }),
          api.getProjects(),
        ]);
        setFiles(filesData);
        setProjects(projectsData);
      } catch (err: any) {
        console.error('Failed to load files:', err);
        error(err.message || 'Failed to load files.');
      } finally {
        setLoading(false);
      }
    },
    [typeFilter, projectFilter, search, sortBy, error]
  );

  useEffect(() => {
    fetchFiles();
  }, [typeFilter, projectFilter, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFiles();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleClearFilters = () => {
    setTypeFilter('all');
    setProjectFilter('all');
    setSearch('');
    fetchFiles('all', 'all', '');
  };

  const handleFileUploaded = (uploadedFile: ProjectFile) => {
    // Reset filters so the newly uploaded file is immediately visible at the top!
    setTypeFilter('all');
    setProjectFilter('all');
    setSearch('');
    fetchFiles('all', 'all', '');
    success(`File "${uploadedFile.filename}" uploaded successfully!`);
  };

  const handleDownloadFile = async (file: ProjectFile) => {
    try {
      setDownloadingId(file.id);
      await downloadFileDirectly(file.id, file.filename);
      success(`Downloaded "${file.filename}"`);
    } catch (err: any) {
      error(err.message || 'Failed to download file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteFile = async () => {
    if (!deletingFile) return;
    try {
      setDeleteLoading(true);
      await api.deleteFile(deletingFile.id);
      success(`File "${deletingFile.filename}" deleted.`);
      setFiles((prev) => prev.filter((f) => f.id !== deletingFile.id));
      setDeletingFile(null);
    } catch (err: any) {
      error(err.message || 'Failed to delete file.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) {
      return (
        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
          <ImageIcon className="w-5 h-5" />
        </div>
      );
    }
    if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
      );
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <FileArchive className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const hasActiveFilters = typeFilter !== 'all' || projectFilter !== 'all' || search.trim().length > 0;
  const currentProjectName = projects.find((p) => p.id === projectFilter)?.name;

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files by name..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All File Types</option>
              <option value="documents">Documents (PDF, Word, Text)</option>
              <option value="spreadsheets">Spreadsheets (Excel, CSV)</option>
              <option value="images">Images (PNG, JPG, SVG)</option>
              <option value="archives">Archives (ZIP, RAR, 7Z)</option>
            </select>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-xs truncate"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="newest">Upload Date (Newest)</option>
              <option value="size_desc">File Size (Largest)</option>
              <option value="name_asc">File Name (A-Z)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="self-end md:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all shadow-indigo-600/20 active:scale-95 shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Active Filters Summary Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Active filters:</span>

            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Type: {typeFilter}
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    fetchFiles('all', undefined, undefined);
                  }}
                  className="hover:text-indigo-900 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {projectFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 max-w-[200px] truncate">
                Project: {currentProjectName || projectFilter}
                <button
                  type="button"
                  onClick={() => {
                    setProjectFilter('all');
                    fetchFiles(undefined, 'all', undefined);
                  }}
                  className="hover:text-indigo-900 p-0.5 shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Search: "{search}"
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    fetchFiles(undefined, undefined, '');
                  }}
                  className="hover:text-indigo-900 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Files Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <UploadCloud className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {hasActiveFilters ? 'No files match current filter' : 'No files uploaded yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {hasActiveFilters ? (
              <>
                You have active filters enabled
                {typeFilter !== 'all' ? ` (Type: ${typeFilter})` : ''}
                {projectFilter !== 'all' ? ` (Project: ${currentProjectName || projectFilter})` : ''}.
                Clear your filters to reveal all your documents.
              </>
            ) : (
              'Securely upload PDFs, Word documents, Excel sheets, and diagrams to your projects.'
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All Filters & Show All
              </button>
            )}

            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Upload File
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="flex items-start gap-3.5 mb-3">
                {getFileIcon(file.filename)}
                <div className="min-w-0 flex-1">
                  <h4
                    onClick={() => setPreviewFile(file)}
                    className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer truncate transition-colors"
                    title={file.filename}
                  >
                    {file.filename}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {formatFileSize(file.file_size)} · {new Date(file.upload_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <div className="truncate max-w-[140px]">
                  {file.project_name && (
                    <Link
                      to={`/projects/${file.project_id}`}
                      className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-medium truncate block"
                      title={file.project_name}
                    >
                      {file.project_name}
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    title="Preview File"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file)}
                    disabled={downloadingId === file.id}
                    title="Download File"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {downloadingId === file.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingFile(file)}
                    title="Delete File"
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projects={projects}
        defaultProjectId={projectFilter !== 'all' ? projectFilter : undefined}
        onUploaded={handleFileUploaded}
      />

      {/* Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Delete Dialog */}
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
