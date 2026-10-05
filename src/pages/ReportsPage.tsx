import React, { useState, useEffect } from 'react';
import {
  Download,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Files,
  Calendar,
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
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { ReportSummary } from '../types/index.ts';
import { api, getAuthToken } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

export const ReportsPage: React.FC = () => {
  const { success, error } = useToast();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await api.getReportsSummary();
        setSummary(data);
      } catch (err: any) {
        console.error('Failed to load reports:', err);
        error('Failed to generate reports data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const token = getAuthToken();
      const res = await fetch('/api/reports/csv', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('Failed to generate CSV export.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ProjectFlow_Executive_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      success('CSV report exported successfully.');
    } catch (err: any) {
      console.error('Export error:', err);
      error(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const priorityChartData = [
    { name: 'Low', count: summary.priorityCounts['Low'] || 0, fill: '#94a3b8' },
    { name: 'Medium', count: summary.priorityCounts['Medium'] || 0, fill: '#3b82f6' },
    { name: 'High', count: summary.priorityCounts['High'] || 0, fill: '#f59e0b' },
    { name: 'Urgent', count: summary.priorityCounts['Urgent'] || 0, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-8">
      {/* Header with Export CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Operational Analytics & Health Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated metrics, completion velocities, and verifiable project exports.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all shadow-indigo-600/20 active:scale-95 shrink-0 self-start sm:self-auto"
        >
          {exporting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating CSV...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export CSV Report
            </>
          )}
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Projects</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {summary.totalProjects}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Completion</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {summary.avgProgress}%
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.completedProjects}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Files Stored</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {summary.totalFiles}
          </p>
        </div>
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Project Lifecycle Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Proportional status distribution across all records
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.statusChart.filter((s) => s.count > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
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
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {summary.statusChart.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name} ({s.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Activity Velocity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Monthly Project Trajectory
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Projects initialized vs completed over the last 6 months
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.25} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Initiated"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#createdGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#completedGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>Initiated Projects</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Completed Projects</span>
            </div>
          </div>
        </div>

        {/* Priority Spectrum Bar Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Priority Tier Distribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Workload distribution categorized by urgency
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]}>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
