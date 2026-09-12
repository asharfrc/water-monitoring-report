import React, { useState } from 'react';
import {
  Droplets,
  Building2,
  FileSpreadsheet,
  ExternalLink,
  UserCheck,
  ShieldAlert,
  HardHat,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Users,
  Lock,
  ChevronDown,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { GoogleDriveStatus, AppRole } from '../types';

interface NavbarProps {
  currentView: 'operator' | 'daily_view' | 'supervisor';
  onSelectView: (view: 'operator' | 'daily_view' | 'supervisor') => void;
  userRole: AppRole;
  onSelectRole?: (role: AppRole) => void;
  driveStatus: GoogleDriveStatus;
  onConnectDrive: () => void;
  onOpenDriveModal: () => void;
  currentUser: {
    displayName: string | null;
    email: string | null;
    photoURL?: string | null;
  } | null;
  isUserSupervisor: boolean;
  isSuperUser?: boolean;
  onOpenSupervisorManager: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  userRole,
  onSelectRole,
  driveStatus,
  onConnectDrive,
  onOpenDriveModal,
  currentUser,
  isUserSupervisor,
  isSuperUser = false,
  onOpenSupervisorManager,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Role display label
  const roleDisplayLabel =
    userRole === 'operator_plant1'
      ? 'Operator Plant 1 (DW 1-2)'
      : userRole === 'operator_plant2'
      ? 'Operator Plant 2 (DW 3-6)'
      : 'Supervisor (Full Akses)';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Plants */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-inner">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base sm:text-lg text-slate-100 tracking-tight">
                  Water Monitoring
                </h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  DW 1 - DW 6
                </span>
              </div>
              <div className="hidden sm:flex items-center text-xs text-slate-400 space-x-2">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-cyan-400" /> Plant 1 (DW 1-2)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-emerald-400" /> Plant 2 (DW 3-6)
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation: Input Operator, Rekap Harian (Read-Only), Supervisor Portal */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 shadow-inner">
            {/* Input Operator */}
            <button
              id="nav-operator-view-btn"
              onClick={() => onSelectView('operator')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentView === 'operator'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <HardHat className="w-4 h-4" />
              <span>
                {userRole === 'operator_plant1'
                  ? 'Input Plant 1'
                  : userRole === 'operator_plant2'
                  ? 'Input Plant 2'
                  : 'Input Meter'}
              </span>
            </button>

            {/* Rekap Harian (Read-Only for Operators) */}
            <button
              id="nav-daily-view-btn"
              onClick={() => onSelectView('daily_view')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentView === 'daily_view'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
              title="Lihat total penggunaan air harian (hanya lihat, tanpa hak revisi)"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Rekap Harian</span>
              <span className="sm:hidden">Rekap</span>
              <span className="text-[9px] bg-slate-700 text-slate-300 font-bold px-1.5 py-0.2 rounded hidden md:inline">
                Read-Only
              </span>
            </button>

            {/* Supervisor Portal */}
            <button
              id="nav-supervisor-view-btn"
              onClick={() => onSelectView('supervisor')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentView === 'supervisor'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {isUserSupervisor ? (
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden sm:inline">Supervisor Portal</span>
              <span className="sm:hidden">Supervisor</span>
              {!isUserSupervisor && (
                <span className="hidden md:inline-block text-[9px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded">
                  Terkunci
                </span>
              )}
            </button>
          </div>

          {/* Right Action: Drive Status & Google User Account */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Google Sheets / Drive Quick Link */}
            {driveStatus.connected && driveStatus.spreadsheetUrl && (
              <a
                id="open-google-sheets-link"
                href={driveStatus.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-medium transition-colors"
                title="Buka Spreadsheet di Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sheets</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}

            {/* User Profile & Role Info */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs transition"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-6 h-6 rounded-full object-cover border border-slate-600"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-sky-500/30 text-sky-300 flex items-center justify-center font-bold text-[11px]">
                      {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-semibold text-slate-200 text-xs truncate max-w-[110px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        userRole === 'supervisor' ? 'text-amber-400' : 'text-sky-400'
                      }`}
                    >
                      {userRole === 'operator_plant1'
                        ? 'Operator P1'
                        : userRole === 'operator_plant2'
                        ? 'Operator P2'
                        : 'Supervisor'}
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    {/* User info header */}
                    <div className="px-4 py-2 border-b border-slate-700">
                      <p className="text-xs font-bold text-white truncate">
                        {currentUser.displayName || 'User'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate font-mono">
                        {currentUser.email}
                      </p>
                      <div className="mt-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            userRole === 'supervisor'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          }`}
                        >
                          {userRole === 'supervisor' ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-amber-400" />
                              Role: Supervisor
                            </>
                          ) : (
                            <>
                              <HardHat className="w-3 h-3 text-sky-400" />
                              Role: {roleDisplayLabel}
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Role Switcher */}
                    {onSelectRole && (
                      <div className="px-4 py-2.5 border-b border-slate-700 bg-slate-850/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Ganti Mode Peran:
                        </p>
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              onSelectRole('operator_plant1');
                              setShowUserMenu(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                              userRole === 'operator_plant1'
                                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                                : 'text-slate-300 hover:bg-slate-700/60'
                            }`}
                          >
                            <span>Operator Plant 1 (DW 1-2)</span>
                            {userRole === 'operator_plant1' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              onSelectRole('operator_plant2');
                              setShowUserMenu(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                              userRole === 'operator_plant2'
                                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                                : 'text-slate-300 hover:bg-slate-700/60'
                            }`}
                          >
                            <span>Operator Plant 2 (DW 3-6)</span>
                            {userRole === 'operator_plant2' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              if (isUserSupervisor) {
                                onSelectRole('supervisor');
                                setShowUserMenu(false);
                              } else {
                                alert('Email Anda belum terdaftar dalam daftar Supervisor.');
                              }
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                              userRole === 'supervisor'
                                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                                : isUserSupervisor
                                ? 'text-slate-300 hover:bg-slate-700/60'
                                : 'text-slate-500 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span>Supervisor Portal</span>
                              {!isUserSupervisor && <Lock className="w-3 h-3 text-slate-500" />}
                            </span>
                            {userRole === 'supervisor' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Super User Management Menu - Hidden from other supervisors */}
                    {isSuperUser && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSupervisorManager();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-amber-300 hover:bg-slate-700 flex items-center gap-2 transition"
                      >
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>Kelola Daftar Supervisor</span>
                      </button>
                    )}

                    {/* Google Drive Status Modal Trigger */}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenDriveModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Status Google Sheets & Drive</span>
                    </button>

                    <div className="border-t border-slate-700 my-1" />

                    {/* Logout */}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-700 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar / Ganti Akun</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="connect-google-drive-btn"
                onClick={onConnectDrive}
                className="flex items-center space-x-2 px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-sm transition border border-slate-200"
              >
                {/* Official Google G Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Masuk Google</span>
                <span className="sm:hidden">Masuk</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
