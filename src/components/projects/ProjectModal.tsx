import React, { useState, useEffect } from 'react';
import { Project } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { CreatableSelect } from '../common/CreatableSelect.tsx';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (project: Project) => void;
  project?: Project | null;
}

const DEFAULT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
const DEFAULT_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  project,
}) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('Planning');
  const [priority, setPriority] = useState<string>('Medium');
  const [progress, setProgress] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      if (project) {
        setName(project.name);
        setDescription(project.description || '');
        setStatus(project.status || 'Planning');
        setPriority(project.priority || 'Medium');
        setProgress(project.progress || 0);
        setStartDate(project.start_date || '');

        const isWorking =
          project.is_currently_working ||
          project.deadline === 'Present' ||
          project.deadline === 'Ongoing';

        setIsCurrentlyWorking(isWorking);
        setEndDate(isWorking ? '' : project.end_date || project.deadline || '');
      } else {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
        setName('');
        setDescription('');
        setStatus('In Progress');
        setPriority('Medium');
        setProgress(0);
        setStartDate(today);
        setEndDate(nextMonth);
        setIsCurrentlyWorking(false);
      }
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('Project name is required.');
      return;
    }

    if (!startDate) {
      setValidationError('Start date is required.');
      return;
    }

    if (!isCurrentlyWorking && !endDate) {
      setValidationError('Please specify an End Date or check "Currently working on this project".');
      return;
    }

    try {
      setLoading(true);
      setValidationError(null);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        status: status.trim() || 'Planning',
        priority: priority.trim() || 'Medium',
        progress: Number(progress),
        start_date: startDate,
        deadline: isCurrentlyWorking ? 'Present' : endDate,
        is_currently_working: isCurrentlyWorking,
        end_date: isCurrentlyWorking ? undefined : endDate,
      };

      let result: Project;
      if (project) {
        result = await api.updateProject(project.id, payload);
        success(`Project "${result.name}" updated successfully.`);
      } else {
        result = await api.createProject(payload);
        success(`Project "${result.name}" created successfully.`);
      }

      onSaved(result);
      onClose();
    } catch (err: any) {
      console.error('Failed to save project:', err);
      const msg = err.message || 'Failed to save project. Please check your inputs.';
      setValidationError(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'Edit Project' : 'Create New Project'}
      subtitle={
        project
          ? 'Modify project specifications, milestones, and timeline.'
          : 'Define project objectives, timeline, and initial priorities.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {validationError && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg">
            {validationError}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Project Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Student Performance Portal"
            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key deliverables, requirements, and operational context..."
            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-none"
          />
        </div>

        {/* Status & Priority with Type & Add Option */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CreatableSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={DEFAULT_STATUSES}
            placeholder="Select or type custom status..."
          />

          <CreatableSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={DEFAULT_PRIORITIES}
            placeholder="Select or type custom priority..."
          />
        </div>

        {/* Progress Slider */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Completion Progress
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {progress}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Timeline: Start Date, End Date & Currently Working Option */}
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Project Timeline
            </span>

            {/* Currently Working Toggle / Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
              <input
                type="checkbox"
                checked={isCurrentlyWorking}
                onChange={(e) => setIsCurrentlyWorking(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Currently working on this project (Present)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  End Date / Deadline
                </label>
                {isCurrentlyWorking && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    🟢 Present / Ongoing
                  </span>
                )}
              </div>

              {isCurrentlyWorking ? (
                <div className="w-full text-sm rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-3.5 py-2 font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Ongoing (Present)</span>
                </div>
              ) : (
                <input
                  type="date"
                  required={!isCurrentlyWorking}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : project ? (
              'Save Changes'
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
