import React from 'react';
import { GoogleDriveStatus } from '../types';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  LogOut,
  FolderSync,
  AlertCircle,
  HardDrive,
  Sparkles,
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: GoogleDriveStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  status,
  onConnect,
  onDisconnect,
  onSyncNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Integrasi Google Drive & Sheets
            </h3>
            <p className="text-xs text-slate-500">
              Sinkronisasi data laporan pemakaian air otomatis ke spreadsheet Google Drive Anda.
            </p>
          </div>
        </div>

        {/* Status Content */}
        {status.connected ? (
          <div className="space-y-4">
            {/* Account Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status.userPhoto ? (
                  <img
                    src={status.userPhoto}
                    alt={status.userName || 'User'}
                    className="w-10 h-10 rounded-full border border-slate-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm">
                    {status.userName?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {status.userName || 'Pengguna Google'}
                  </div>
                  <div className="text-xs text-slate-500">{status.userEmail}</div>
                </div>
              </div>

              <button
                onClick={onDisconnect}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2.5 py-1 rounded-lg hover:bg-rose-50 transition flex items-center gap-1"
                title="Putuskan sambungan"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putus</span>
              </button>
            </div>

            {/* Target Spreadsheet Details */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Spreadsheet Aktif di Google Drive
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {status.spreadsheetName || 'Water_Monitoring_System - Plant 1 & Plant 2'}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
                    <span>
                      • Tab 1: <strong>Laporan_Harian</strong> (ID, Shift, Plant, Meter, Pemakaian, Overkuota)
                    </span>
                    <span>
                      • Tab 2: <strong>Master_Deepwell</strong> (Daftar kuota shift & izin bulanan)
                    </span>
                  </div>
                </div>
              </div>

              {status.spreadsheetUrl && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
                  <a
                    href={status.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <span>Buka di Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {status.lastSyncedAt && (
                    <span className="text-[11px] text-emerald-800">
                      Sync terakhir: {status.lastSyncedAt}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Google AppSheet Connection Guide Tip */}
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sky-950">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Dapat Digunakan Langsung di Google AppSheet:
              </div>
              <p className="text-[11px] text-sky-800">
                Spreadsheet di Google Drive ini memiliki struktur kolom yang sudah 100% kompatibel dengan Google AppSheet (Tabel <strong>Laporan_Harian</strong> dan <strong>Master_Deepwell</strong>).
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onSyncNow}
                disabled={status.isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${status.isSyncing ? 'animate-spin' : ''}`}
                />
                <span>{status.isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
              <p>
                Hubungkan dengan akun Google Anda untuk mengaktifkan:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Pembuatan spreadsheet <strong>Water_Monitoring_System</strong> otomatis di Drive Anda.</li>
                <li>Setiap submit laporan operator langsung terkirim baris demi baris ke Google Sheets.</li>
                <li>Supervisor dapat membuka file Google Sheets kapan saja dari laptop atau smartphone.</li>
              </ul>
            </div>

            {status.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{status.error}</span>
              </div>
            )}

            <button
              onClick={onConnect}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-800 shadow-sm transition active:scale-[0.99]"
            >
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
              <span>Masuk dengan Akun Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
