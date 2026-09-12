import React, { useState } from 'react';
import {
  X,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Save,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Info,
} from 'lucide-react';
import { ShiftReport, DeepwellReadingInput, MASTER_DEEPWELLS, getShiftHoursLabel } from '../types';

interface RevisionModalProps {
  report: ShiftReport | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveRevision: (
    reportId: string,
    updatedReadings: DeepwellReadingInput[],
    reason: string
  ) => Promise<void>;
  supervisorEmail: string;
}

export const RevisionModal: React.FC<RevisionModalProps> = ({
  report,
  isOpen,
  onClose,
  onSaveRevision,
  supervisorEmail,
}) => {
  if (!isOpen || !report) return null;

  // Initialize form state from report readings
  const [readingsState, setReadingsState] = useState<
    Record<
      string,
      {
        meterAwal: string;
        meterAkhir: string;
        keteranganOver: string;
      }
    >
  >(() => {
    const map: Record<string, { meterAwal: string; meterAkhir: string; keteranganOver: string }> =
      {};
    report.readings.forEach((r) => {
      map[r.deepwellId] = {
        meterAwal: r.meterAwal.toString(),
        meterAkhir: r.meterAkhir.toString(),
        keteranganOver: r.keteranganOver || '',
      };
    });
    return map;
  });

  const [revisionReason, setRevisionReason] = useState<string>(
    report.revisionReason || ''
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleInputChange = (
    dwId: string,
    field: 'meterAwal' | 'meterAkhir' | 'keteranganOver',
    value: string
  ) => {
    setReadingsState((prev) => ({
      ...prev,
      [dwId]: {
        ...prev[dwId],
        [field]: value,
      },
    }));
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!revisionReason.trim()) {
      setErrorMsg('Harap masukkan alasan revisi data untuk keperluan audit trail.');
      return;
    }

    const updatedReadings: DeepwellReadingInput[] = [];

    for (const r of report.readings) {
      const dwConfig = MASTER_DEEPWELLS.find((d) => d.id === r.deepwellId)!;
      const state = readingsState[r.deepwellId];
      const awal = parseFloat(state.meterAwal || '0');
      const akhir = parseFloat(state.meterAkhir || '0');

      if (isNaN(awal) || isNaN(akhir)) {
        setErrorMsg(`Format angka meter untuk ${dwConfig.name} tidak valid.`);
        return;
      }

      if (akhir < awal) {
        setErrorMsg(
          `Meter akhir (${akhir}) tidak boleh lebih kecil dari meter awal (${awal}) untuk ${dwConfig.name}.`
        );
        return;
      }

      const pemakaian = parseFloat((akhir - awal).toFixed(2));
      const isOverQuota = dwConfig.shiftQuota > 0 ? pemakaian > dwConfig.shiftQuota : pemakaian > 0;
      const persenKuota =
        dwConfig.shiftQuota > 0
          ? parseFloat(((pemakaian / dwConfig.shiftQuota) * 100).toFixed(1))
          : pemakaian > 0
          ? 100
          : 0;

      if (isOverQuota && !state.keteranganOver.trim()) {
        setErrorMsg(`Harap lengkapi keterangan over kuota untuk ${dwConfig.name}.`);
        return;
      }

      updatedReadings.push({
        deepwellId: r.deepwellId,
        meterAwal: awal,
        meterAkhir: akhir,
        pemakaian,
        kuotaShift: dwConfig.shiftQuota,
        persenKuota,
        isOverQuota,
        keteranganOver: state.keteranganOver.trim(),
      });
    }

    setIsSaving(true);
    try {
      await onSaveRevision(report.id, updatedReadings, revisionReason.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan revisi laporan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Revisi / Perbaikan Data Laporan
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                <ShieldCheck className="w-3 h-3" />
                Otoritas Supervisor
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {report.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Shift {report.shift} ({getShiftHoursLabel(report.shift)})
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Input Awal: {report.operatorName}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Ketentuan Revisi Supervisor:</span>
            </div>
            <p className="text-[11px] text-amber-900">
              Perbaikan data ini hanya dapat dilakukan oleh Supervisor. Hasil revisi akan tercatat dalam riwayat audit (diaudit oleh <span className="font-mono font-semibold">{supervisorEmail}</span>) dan otomatis disinkronkan ke Google Sheets.
            </p>
          </div>

          {/* Deepwells to revise */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Koreksi Nilai Meter Deepwell
            </h4>

            {report.readings.map((reading) => {
              const dwConfig = MASTER_DEEPWELLS.find((d) => d.id === reading.deepwellId)!;
              const curState = readingsState[reading.deepwellId] || {
                meterAwal: '0',
                meterAkhir: '0',
                keteranganOver: '',
              };
              const awalVal = parseFloat(curState.meterAwal || '0');
              const akhirVal = parseFloat(curState.meterAkhir || '0');
              const pemakaianVal = akhirVal >= awalVal ? (akhirVal - awalVal).toFixed(2) : '0.00';
              const isOver =
                dwConfig.shiftQuota > 0
                  ? parseFloat(pemakaianVal) > dwConfig.shiftQuota
                  : parseFloat(pemakaianVal) > 0;

              return (
                <div
                  key={reading.deepwellId}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {reading.deepwellId}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {dwConfig.name} ({dwConfig.plant})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Kuota Shift: <strong className="text-slate-800">{dwConfig.shiftQuota} m³</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Meter Awal (m³)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={curState.meterAwal}
                        onChange={(e) =>
                          handleInputChange(reading.deepwellId, 'meterAwal', e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Meter Akhir (m³)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={curState.meterAkhir}
                        onChange={(e) =>
                          handleInputChange(reading.deepwellId, 'meterAkhir', e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Pemakaian Hasil Revisi
                      </label>
                      <div
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-between ${
                          isOver
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}
                      >
                        <span>{pemakaianVal} m³</span>
                        <span className="text-[10px] uppercase">
                          {isOver ? 'Over Kuota' : 'Normal'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isOver && (
                    <div>
                      <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                        Keterangan Over Kuota (Wajib):
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Kenaikan beban pendingin cooling tower"
                        value={curState.keteranganOver}
                        onChange={(e) =>
                          handleInputChange(reading.deepwellId, 'keteranganOver', e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-xs"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Revision Reason Field */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Alasan & Catatan Perbaikan Data (Wajib) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan alasan perbaikan, contoh: Koreksi salah catat angka desimal oleh operator shift 1 berdasarkan pengecekan fisik meteran air."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perbaikan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
