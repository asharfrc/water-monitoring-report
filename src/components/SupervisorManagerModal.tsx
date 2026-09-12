import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Mail,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  getSupervisorEmails,
  addSupervisorEmail,
  removeSupervisorEmail,
  isSuperUser,
  SUPER_USER_EMAIL,
} from '../services/supervisorAuth';

interface SupervisorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
  onSupervisorsChanged?: () => void;
}

export const SupervisorManagerModal: React.FC<SupervisorManagerModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onSupervisorsChanged,
}) => {
  const isCallerSuperUser = isSuperUser(currentUserEmail);
  const [emails, setEmails] = useState<string[]>(() => getSupervisorEmails());
  const [newEmailInput, setNewEmailInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!isCallerSuperUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Akses Ditolak</h3>
          <p className="text-xs text-slate-500">
            Hanya Super User / Administrator yang memiliki hak akses untuk mengelola daftar supervisor.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const refreshList = () => {
    const updated = getSupervisorEmails();
    setEmails(updated);
    if (onSupervisorsChanged) onSupervisorsChanged();
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newEmailInput.trim()) {
      setErrorMsg('Masukkan alamat email.');
      return;
    }

    const res = addSupervisorEmail(newEmailInput, currentUserEmail);
    if (res.success) {
      setSuccessMsg(`Email ${newEmailInput.trim().toLowerCase()} berhasil ditambahkan sebagai Supervisor.`);
      setNewEmailInput('');
      refreshList();
    } else {
      setErrorMsg(res.error || 'Gagal menambahkan email.');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = removeSupervisorEmail(email, currentUserEmail);
    if (res.success) {
      setSuccessMsg(`Email ${email} telah dicabut dari kategori Supervisor.`);
      refreshList();
    } else {
      setErrorMsg(res.error || 'Gagal menghapus email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Kelola Daftar Supervisor
            </h3>
            <p className="text-xs text-slate-500">
              Hak Akses Khusus Super User: Atur siapa saja yang memiliki hak akses membuka Portal Supervisor.
            </p>
          </div>
        </div>

        {/* Explanation Card */}
        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 mb-4 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Aturan Hak Akses Pengguna:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-900">
            <li>
              <strong>Operator:</strong> Siapa saja dengan akun Google bebas masuk untuk menginput laporan shift.
            </li>
            <li>
              <strong>Supervisor:</strong> Hanya email di daftar bawah ini yang dapat membuka dashboard analisis, grafik, rekap kuota, dan ekspor data.
            </li>
          </ul>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Add Email Form */}
        <form onSubmit={handleAddEmail} className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tambah Email Supervisor Baru
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="contoh: nama.supervisor@perusahaan.com"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </form>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Daftar Supervisor Aktif ({emails.length})
            </span>
          </div>

          <div className="space-y-2">
            {emails.map((email) => {
              const isPrimary = email.toLowerCase() === SUPER_USER_EMAIL.toLowerCase();
              const isCurrent = currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase();

              return (
                <div
                  key={email}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-800 truncate">{email}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isPrimary && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded">
                            Super User (Administrator)
                          </span>
                        )}
                        {!isPrimary && isCurrent && (
                          <span className="text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.2 rounded">
                            Anda
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">Akses Penuh</span>
                      </div>
                    </div>
                  </div>

                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 ml-2"
                      title="Hapus dari daftar supervisor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
