import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Sun,
  Moon,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Palette,
  KeyRound,
  ShieldCheck,
  Database,
  Server,
  RefreshCw,
  HardDrive,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { api } from '../services/api.ts';
import { DatabaseStatus } from '../types/index.ts';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance' | 'database' | 'account'>('profile');

  // TiDB Database State
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [dbPassword, setDbPassword] = useState('');
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [connectingDb, setConnectingDb] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);
  const [syncCounts, setSyncCounts] = useState<any>(null);

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const fetchDbStatus = async () => {
    try {
      const status = await api.getDatabaseStatus();
      setDbStatus(status);
    } catch (err) {
      console.warn('Could not fetch DB status:', err);
    }
  };

  const handleConnectDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbPassword.trim()) {
      error('Please enter your TiDB Cloud password.');
      return;
    }

    try {
      setConnectingDb(true);
      const res = await api.connectDatabase({
        password: dbPassword.trim(),
        database: 'sys',
      });
      setDbStatus(res.status);
      success(res.message || 'Connected to TiDB Cloud successfully!');
    } catch (err: any) {
      console.error('TiDB connect failed:', err);
      error(err.message || 'Failed to connect to TiDB Cloud. Please check your password.');
    } finally {
      setConnectingDb(false);
    }
  };

  const handleSyncDb = async () => {
    try {
      setSyncingDb(true);
      const res = await api.syncDatabase();
      setSyncCounts(res.counts);
      setDbStatus(res.status);
      success('Local projects and files synchronized to TiDB Cloud!');
    } catch (err: any) {
      console.error('TiDB sync failed:', err);
      error(err.message || 'Failed to sync data to TiDB Cloud.');
    } finally {
      setSyncingDb(false);
    }
  };

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [role, setRole] = useState(user?.role || 'Project Lead');
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color || '#4f46e5');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Logout Dialog
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const avatarColors = [
    '#4f46e5', // Indigo
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#059669', // Emerald
    '#d97706', // Amber
    '#dc2626', // Red
    '#0891b2', // Cyan
    '#e11d48', // Rose
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      error('Full name cannot be empty.');
      return;
    }

    try {
      setSavingProfile(true);
      const res = await api.updateProfile({
        full_name: fullName.trim(),
        role: role.trim(),
        avatar_color: avatarColor,
      });
      updateUser(res.user);
      success('Profile preferences updated successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      if (currentPassword) {
        await api.changePassword({
          current_password: currentPassword,
          new_password: newPassword,
        });
      } else {
        await api.resetPassword({
          new_password: newPassword,
        });
      }

      success('Password has been reset successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to reset password.');
      error(err.message || 'Failed to reset password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Top Header & Quick Logout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Account & Workspace Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage your personal profile, reset security credentials, and workspace preferences.
          </p>
        </div>

        {/* Prominent Quick Logout Button */}
        <button
          type="button"
          onClick={() => setLogoutDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out / Logout</span>
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'profile'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile & Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'password'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Reset Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'appearance'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Theme & Appearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'database'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>TiDB Cloud Database</span>
          {dbStatus?.connected ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'account'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Session & Logout</span>
        </button>
      </div>

      {/* Profile & Security Tab (Unified so user has everything right here) */}
      {(activeTab === 'profile' || activeTab === 'password') && (
        <div className="space-y-6">
          {/* Card 1: Personal Information */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Personal Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Update your public profile details and workspace display identity.
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              {/* Avatar Preview & Color */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
                  style={{ backgroundColor: avatarColor }}
                >
                  {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Avatar Theme Color
                  </p>
                  <div className="flex items-center gap-2">
                    {avatarColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAvatarColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          avatarColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Job Title / Workspace Role
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Work Email (Read Only)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3.5 py-2.5 cursor-not-allowed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setLogoutDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {savingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Reset Password (Directly on this page!) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Password
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Ensure your workspace account is using a strong password of at least 6 characters.
            </p>

            {passwordError && (
              <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password (Optional if resetting)
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password (if known)"
                    className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password (min 6 chars)"
                    className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password to confirm"
                  className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {savingPassword ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Reset Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Display Appearance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Choose your preferred color theme for the ProjectFlow workspace.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                theme === 'light'
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-white shadow-xs text-slate-900">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Light Mode</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Clean crisp high-contrast daylight aesthetic.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                theme === 'dark'
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-800 shadow-xs text-white">
                <Moon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Modern deep slate aesthetic easy on the eyes.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TiDB Cloud Database Tab */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    TiDB Cloud Distributed Database
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Connect and synchronize ProjectFlow with your AWS ap-southeast-1 TiDB Cloud gateway.
                </p>
              </div>

              {dbStatus?.connected ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online · {dbStatus.latencyMs}ms</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{dbStatus?.hasPassword ? 'Connecting...' : 'Needs TiDB Password'}</span>
                </div>
              )}
            </div>

            {/* Connection Information Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-medium text-slate-400">Gateway Host</p>
                <p className="text-xs font-semibold font-mono text-slate-900 dark:text-white mt-1 truncate" title={dbStatus?.host || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com'}>
                  {dbStatus?.host || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-medium text-slate-400">Port & Protocol</p>
                <p className="text-xs font-semibold font-mono text-slate-900 dark:text-white mt-1">
                  4000 (MySQL Protocol)
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-medium text-slate-400">Database User</p>
                <p className="text-xs font-semibold font-mono text-slate-900 dark:text-white mt-1 truncate">
                  {dbStatus?.user || '2zWeNSGrm7sUDKF.root'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-medium text-slate-400">Database Target</p>
                <p className="text-xs font-semibold font-mono text-slate-900 dark:text-white mt-1">
                  {dbStatus?.database || 'sys'}
                </p>
              </div>
            </div>

            {/* Password Connection Form */}
            <form onSubmit={handleConnectDb} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  TiDB Cloud Root Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative max-w-lg">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showDbPassword ? 'text' : 'password'}
                    required
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="Enter TiDB root password provided in TiDB Cloud console"
                    className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDbPassword(!showDbPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showDbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  Connection URI: <span className="font-mono text-slate-600 dark:text-slate-300">mysql://2zWeNSGrm7sUDKF.root:&lt;PASSWORD&gt;@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/sys</span>
                </p>
              </div>

              {dbStatus?.error && (
                <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2 max-w-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{dbStatus.error}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={connectingDb}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {connectingDb ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Connecting to TiDB...</span>
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4" />
                      <span>{dbStatus?.connected ? 'Reconnect & Verify' : 'Connect to TiDB Cloud'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sync Local Data to TiDB Cloud Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  Synchronize Data to TiDB Cloud
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Push current users, projects (including &quot;College No Due Management System&quot;), files metadata, and activity logs into TiDB Cloud relational tables.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncDb}
                disabled={syncingDb || !dbStatus?.connected}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              >
                {syncingDb ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing Data...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync to TiDB Now</span>
                  </>
                )}
              </button>
            </div>

            {syncCounts && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Synchronization Complete:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div>Users: {syncCounts.usersCount}</div>
                  <div>Projects: {syncCounts.projectsCount}</div>
                  <div>Files: {syncCounts.filesCount}</div>
                  <div>Activities: {syncCounts.activitiesCount}</div>
                </div>
              </div>
            )}

            {/* Schema Tables verified in TiDB */}
            <div className="mt-6">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                Managed TiDB Cloud Tables:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  <p className="text-xs font-semibold font-mono text-slate-900 dark:text-white">users</p>
                  <p className="text-[11px] text-slate-500 mt-1">Credentials, roles, and profiles</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  <p className="text-xs font-semibold font-mono text-slate-900 dark:text-white">projects</p>
                  <p className="text-[11px] text-slate-500 mt-1">Status, progress, and milestones</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  <p className="text-xs font-semibold font-mono text-slate-900 dark:text-white">project_files</p>
                  <p className="text-[11px] text-slate-500 mt-1">Storage metadata, sizes, and paths</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  <p className="text-xs font-semibold font-mono text-slate-900 dark:text-white">activities</p>
                  <p className="text-[11px] text-slate-500 mt-1">Audit trail and user actions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'account' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Active Session & Authentication
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Review active session and sign out securely from this device.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: user?.avatar_color || '#4f46e5' }}
              >
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{user?.email}</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              ● Active Now
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">
              Sign Out of Account
            </h4>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mb-4">
              Logging out will clear your authenticated session from this device.
            </p>
            <button
              type="button"
              onClick={() => setLogoutDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out Now
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={logout}
        title="Sign Out of Workspace"
        message="Are you sure you want to log out? You will need to sign in again to access your projects and files."
        confirmText="Sign Out"
        isDestructive={true}
      />
    </div>
  );
};
