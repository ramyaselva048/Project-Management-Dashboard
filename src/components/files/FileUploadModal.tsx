import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Plus, List } from 'lucide-react';
import { Project, ProjectFile } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { Modal } from '../common/Modal.tsx';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (file: ProjectFile) => void;
  defaultProjectId?: string;
  projects?: Project[];
}

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.pptx',
  '.ppt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.gif',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.txt',
  '.csv',
  '.json',
  '.md',
];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  defaultProjectId,
  projects = [],
}) => {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isNewProjectMode, setIsNewProjectMode] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialProjId = defaultProjectId || (projects.length > 0 ? projects[0].id : '');
      setSelectedProjectId(initialProjId);
      setIsNewProjectMode(false);
      setNewProjectName('');
      setSelectedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      setValidationError(null);
    }
  }, [isOpen, defaultProjectId, projects]);

  const validateFile = (file: File): boolean => {
    setValidationError(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(`Unsupported format "${ext}". Allowed: PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP, TXT, etc.`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`File size exceeds 25 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError('Please select a file to upload.');
      return;
    }

    let targetProjId = selectedProjectId;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // If user typed a new project name, create it first
      if (isNewProjectMode) {
        if (!newProjectName.trim()) {
          setValidationError('Please enter a name for the new project.');
          setIsUploading(false);
          return;
        }
        const today = new Date().toISOString().split('T')[0];
        const newProj = await api.createProject({
          name: newProjectName.trim(),
          description: `Project created during file upload of ${selectedFile.name}`,
          status: 'In Progress',
          priority: 'Medium',
          progress: 0,
          start_date: today,
          deadline: 'Present',
          is_currently_working: true,
        });
        targetProjId = newProj.id;
        success(`Created project "${newProj.name}"`);
      }

      if (!targetProjId) {
        targetProjId = projects.length > 0 ? projects[0].id : '';
      }

      if (!targetProjId) {
        setValidationError('Please select or type a project name.');
        setIsUploading(false);
        return;
      }

      const uploaded = await api.uploadFile(selectedFile, targetProjId, (percent) => {
        setUploadProgress(percent);
      });

      success(`Successfully uploaded "${uploaded.filename}"`);
      onUploaded(uploaded);
      onClose();
    } catch (err: any) {
      console.error('File upload error:', err);
      const msg = err.message || 'File upload failed. Please try again.';
      setValidationError(msg);
      error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isUploading) onClose();
      }}
      title="Upload File"
      subtitle="Attach documents, diagrams, sheets, or archives to your project."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Project selector with Type & Add option */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assign to Project <span className="text-rose-500">*</span>
            </label>
            {!defaultProjectId && (
              <button
                type="button"
                onClick={() => setIsNewProjectMode(!isNewProjectMode)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                {isNewProjectMode ? (
                  <>
                    <List className="w-3 h-3" /> Select existing project
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" /> Type & Add New Project
                  </>
                )}
              </button>
            )}
          </div>

          {isNewProjectMode ? (
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Type new project name (e.g. AI Research Lab)..."
              disabled={isUploading}
              className="w-full text-sm rounded-lg border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isUploading || !!defaultProjectId}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-60"
            >
              {projects.length === 0 ? (
                <option value="" disabled>
                  No projects available - click "Type & Add New Project" above
                </option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            accept={ALLOWED_EXTENSIONS.join(',')}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Click to browse</span> or drag and drop
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP, TXT, etc. (up to 25 MB)
          </p>
        </div>

        {/* Selected file preview */}
        {selectedFile && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Progress bar */}
        {isUploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Uploading to server...</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {validationError && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload File'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
