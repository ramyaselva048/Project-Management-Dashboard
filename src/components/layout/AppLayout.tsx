import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  Plus,
  Search,
  Bell,
  Layers,
  LogOut,
} from 'lucide-react';
import { Sidebar } from './Sidebar.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ProjectModal } from '../projects/ProjectModal.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { useToast } from '../../context/ToastContext.tsx';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { info } = useToast();

  const getPageTitle = (): string => {
    const p = location.pathname;
    if (p.startsWith('/dashboard')) return 'Dashboard';
    if (p.startsWith('/projects/')) return 'Project Details';
    if (p.startsWith('/projects')) return 'Projects';
    if (p.startsWith('/files')) return 'Files';
    if (p.startsWith('/reports')) return 'Reports & Analytics';
    if (p.startsWith('/settings')) return 'Settings';
    return 'ProjectFlow';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action: New Project */}
            <button
              type="button"
              onClick={() => setProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-800 active:scale-95"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* User Avatar linking to Settings */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              title="Open Profile Settings"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer"
              style={{ backgroundColor: user?.avatar_color || '#4f46e5' }}
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </button>

            {/* Direct Logout Button in Header */}
            <button
              type="button"
              onClick={() => setLogoutDialogOpen(true)}
              title="Sign Out of Account"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Project Create Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSaved={() => {
          window.dispatchEvent(new CustomEvent('project-created'));
          info('Project created. Refreshing workspace view...');
        }}
      />

      {/* Global Logout Dialog */}
      <ConfirmDialog
        isOpen={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={logout}
        title="Sign Out of Workspace"
        message="Are you sure you want to sign out? You will need to log in again to view your projects and files."
        confirmText="Sign Out"
        isDestructive={true}
      />
    </div>
  );
};
