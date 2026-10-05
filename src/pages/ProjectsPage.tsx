import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  Clock,
  MoreVertical,
  Activity,
} from 'lucide-react';
import { Project } from '../types/index.ts';
import { api } from '../services/api.ts';
import { StatusBadge, PriorityBadge } from '../components/common/Badge.tsx';
import { ProjectModal } from '../components/projects/ProjectModal.tsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const ProjectsPage: React.FC = () => {
  const { success, error } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        sort: sortBy !== 'newest' ? sortBy : undefined,
      });
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      error(err.message || 'Failed to fetch projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, priorityFilter, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Listen to global "project-created" event from AppLayout header button
  useEffect(() => {
    const handleGlobalProjectCreated = () => {
      fetchProjects();
    };
    window.addEventListener('project-created', handleGlobalProjectCreated);
    return () => window.removeEventListener('project-created', handleGlobalProjectCreated);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    try {
      setDeleteLoading(true);
      await api.deleteProject(deletingProject.id);
      success(`Project "${deletingProject.name}" deleted.`);
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      setDeletingProject(null);
    } catch (err: any) {
      error(err.message || 'Failed to delete project.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Extract unique statuses and priorities for filter dropdowns
  const availableStatuses = Array.from(
    new Set(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled', ...projects.map((p) => p.status)])
  );
  const availablePriorities = Array.from(
    new Set(['Low', 'Medium', 'High', 'Urgent', ...projects.map((p) => p.priority)])
  );

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            {availableStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Priorities</option>
            {availablePriorities.map((pr) => (
              <option key={pr} value={pr}>
                {pr}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="deadline_asc">Sort: Nearest Deadline</option>
            <option value="progress_desc">Sort: Highest Progress</option>
            <option value="name_asc">Sort: Name (A-Z)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Project CTA */}
          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setProjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Projects Presentation */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FolderGit2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No projects found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {search || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'No projects match your filter criteria. Try resetting filters.'
              : 'You have not created any projects yet. Start tracking your first initiative!'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setProjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Project
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const isWorking =
              p.is_currently_working ||
              p.deadline === 'Present' ||
              p.deadline === 'Ongoing';

            const deadlineTime = new Date(p.deadline).getTime();
            const isOverdue =
              !isWorking &&
              !isNaN(deadlineTime) &&
              deadlineTime < Date.now() &&
              p.status !== 'Completed' &&
              p.status !== 'Cancelled';

            return (
              <div
                key={p.id}
                className="flex flex-col justify-between p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all group"
              >
                <div>
                  {/* Status & Priority */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusBadge status={p.status} size="sm" />
                    <PriorityBadge priority={p.priority} size="sm" />
                  </div>

                  {/* Title & Link */}
                  <Link
                    to={`/projects/${p.id}`}
                    className="block text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2 line-clamp-1"
                  >
                    {p.name}
                  </Link>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {p.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                  {/* Milestone Progress */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-500 text-[11px]">Milestone</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{p.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Timeline Metadata and Actions */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {isWorking ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Present (Ongoing)
                        </span>
                      ) : (
                        <span className={isOverdue ? 'text-rose-600 font-semibold' : ''}>
                          {p.deadline}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProject(p);
                          setProjectModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingProject(p)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Project Name</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Milestone</th>
                  <th className="py-3.5 px-4">End Date / Deadline</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {projects.map((p) => {
                  const isWorking =
                    p.is_currently_working ||
                    p.deadline === 'Present' ||
                    p.deadline === 'Ongoing';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <Link
                          to={`/projects/${p.id}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={p.priority} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 w-28">
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full"
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-semibold">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {isWorking ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Present (Ongoing)
                          </span>
                        ) : (
                          p.deadline
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProject(p);
                              setProjectModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProject(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={editingProject}
        onSaved={() => fetchProjects()}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? All associated files, audit logs, and metrics will be permanently purged.`}
        confirmText="Delete Project"
        isLoading={deleteLoading}
      />
    </div>
  );
};
