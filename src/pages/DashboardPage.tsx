import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Search,
  ChevronRight,
  TrendingUp,
  FileText,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Project, ReportSummary } from '../types/index.ts';
import { api } from '../services/api.ts';
import { StatusBadge, PriorityBadge } from '../components/common/Badge.tsx';
import { ProjectModal } from '../components/projects/ProjectModal.tsx';

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsData, summaryData] = await Promise.all([
        api.getProjects(),
        api.getReportsSummary(),
      ]);
      setProjects(projectsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const recentProjects = filteredProjects.slice(0, 5);

  const statCards = [
    {
      title: 'Total Projects',
      value: summary?.totalProjects ?? 0,
      icon: FolderGit2,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/50',
    },
    {
      title: 'Active Projects',
      value: summary?.activeProjects ?? 0,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50',
    },
    {
      title: 'Completed',
      value: summary?.completedProjects ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50',
    },
    {
      title: 'Overdue Alerts',
      value: summary?.overdueProjects ?? 0,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className={`p-5 rounded-2xl border ${c.bg} transition-all duration-200 hover:shadow-xs`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {c.title}
                </span>
                <div className={`p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 ${c.color} shadow-xs`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
                  {c.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Donut Chart */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Project Status Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Breakdown of active vs planned initiatives
              </p>
            </div>
          </div>

          <div className="h-60 w-full">
            {summary && summary.statusChart.some((s) => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.statusChart.filter((s) => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {summary.statusChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No project metrics recorded yet.
              </div>
            )}
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            {summary?.statusChart.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name} ({s.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Progress Overview Bar Chart */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Project Milestone Completion
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current progress rates across initiatives
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-md border border-indigo-200/50">
              Avg: {summary?.avgProgress ?? 0}%
            </span>
          </div>

          <div className="h-64 w-full">
            {summary && summary.progressChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.progressChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Progress']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="progress" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active projects to compare.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Projects
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quickly monitor project health and upcoming deadlines
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40 sm:w-56"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Planning">Planning</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>

            <Link
              to="/projects"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Projects List */}
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {recentProjects.length === 0 ? (
            <div className="py-12 text-center">
              <FolderGit2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No matching projects found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search query or create a new project.
              </p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Project
              </button>
            </div>
          ) : (
            recentProjects.map((p) => {
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
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-3 rounded-xl transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/projects/${p.id}`}
                        className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate"
                      >
                        {p.name}
                      </Link>
                      <StatusBadge status={p.status} size="sm" />
                      <PriorityBadge priority={p.priority} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {p.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Progress & Deadline */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="w-32">
                      <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                        <span>Milestone</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{p.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right text-xs min-w-[70px]">
                      <span className="block text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">
                        {isWorking ? 'Timeline' : 'Deadline'}
                      </span>
                      {isWorking ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Present
                        </span>
                      ) : (
                        <span
                          className={`font-mono font-medium ${
                            isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p.deadline}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/projects/${p.id}`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSaved={() => fetchData()}
      />
    </div>
  );
};
