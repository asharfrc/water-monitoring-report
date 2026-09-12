import React, { useState } from 'react';
import {
  Droplets,
  Building2,
  HardHat,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  Info,
} from 'lucide-react';
import { AppRole } from '../types';

interface LoginScreenProps {
  onLogin: (selectedRole: AppRole) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  defaultRole?: AppRole;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  isLoading = false,
  error,
  defaultRole = 'operator_plant1',
}) => {
  const [selectedRole, setSelectedRole] = useState<AppRole>(defaultRole);
  const [internalLoading, setInternalLoading] = useState(false);

  const handleSignIn = async () => {
    setInternalLoading(true);
    try {
      await onLogin(selectedRole);
    } finally {
      setInternalLoading(false);
    }
  };

  const loading = isLoading || internalLoading;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 mx-auto mb-4 shadow-lg shadow-sky-500/10">
            <Droplets className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Water Monitoring System
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 font-medium">
            Sistem Pemantauan Kuota Air: Plant 1 (DW 1 & 2) & Plant 2 (DW 3, 4, 5, 6)
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-white">Daftar Masuk & Pilih Otoritas</h2>
            <p className="text-xs text-slate-400 mt-1">
              Pilih peran Anda di bawah ini, lalu masuk dengan Akun Google untuk verifikasi identitas.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 3 Role Selection Cards */}
          <div className="space-y-3 mb-6">
            {/* Option 1: Operator Plant 1 */}
            <button
              type="button"
              onClick={() => setSelectedRole('operator_plant1')}
              className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition cursor-pointer relative ${
                selectedRole === 'operator_plant1'
                  ? 'bg-sky-950/50 border-sky-400 ring-2 ring-sky-500/30'
                  : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedRole === 'operator_plant1'
                      ? 'bg-sky-500 text-white'
                      : 'bg-sky-500/20 text-sky-400'
                  }`}
                >
                  <HardHat className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>Operator Plant 1</span>
                      <span className="text-[10px] px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-md border border-sky-500/30">
                        DW 1 & DW 2
                      </span>
                    </span>
                    {selectedRole === 'operator_plant1' && (
                      <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    <strong>Otoritas:</strong> Input data Deepwell 1 & Deepwell 2.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-slate-400" />
                    <span>Bisa melihat rekap harian Plant 1 (Read-only, tanpa hak revisi).</span>
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Operator Plant 2 */}
            <button
              type="button"
              onClick={() => setSelectedRole('operator_plant2')}
              className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition cursor-pointer relative ${
                selectedRole === 'operator_plant2'
                  ? 'bg-indigo-950/50 border-indigo-400 ring-2 ring-indigo-500/30'
                  : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedRole === 'operator_plant2'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}
                >
                  <HardHat className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>Operator Plant 2</span>
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
                        DW 3, 4, 5 & 6
                      </span>
                    </span>
                    {selectedRole === 'operator_plant2' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    <strong>Otoritas:</strong> Input data Deepwell 3, 4, 5, dan 6.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-slate-400" />
                    <span>Bisa melihat rekap harian Plant 2 & Plant 1 (Read-only, tanpa revisi).</span>
                  </p>
                </div>
              </div>
            </button>

            {/* Option 3: Supervisor / Manajemen */}
            <button
              type="button"
              onClick={() => setSelectedRole('supervisor')}
              className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition cursor-pointer relative ${
                selectedRole === 'supervisor'
                  ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedRole === 'supervisor'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>Supervisor / Manajemen</span>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30">
                        Akses Penuh & Revisi
                      </span>
                    </span>
                    {selectedRole === 'supervisor' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    <strong>Otoritas:</strong> Revisi/perbaikan data meter, dashboard keseluruhan (per shift, harian, bulanan, tahunan).
                  </p>
                  <p className="text-[11px] text-amber-300/80 mt-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Khusus email yang terdaftar pada whitelist Supervisor.</span>
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 font-bold text-sm rounded-xl shadow-md transition active:scale-[0.99] disabled:opacity-50 cursor-pointer ${
              selectedRole === 'supervisor'
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-white hover:bg-slate-100 text-slate-900'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                <span>Menghubungkan ke Akun Google...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <span>
                  Masuk sebagai{' '}
                  {selectedRole === 'operator_plant1'
                    ? 'Operator Plant 1'
                    : selectedRole === 'operator_plant2'
                    ? 'Operator Plant 2'
                    : 'Supervisor'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Water Monitoring System &bull; Plant 1 &amp; Plant 2
        </div>
      </div>
    </div>
  );
};
