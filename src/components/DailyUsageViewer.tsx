import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building2,
  HardHat,
  Eye,
  ChevronRight,
  Info,
  Clock,
  User,
  Layers,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { exportReportsToExcel } from '../services/excelExport';
import { exportReportsToPdf } from '../services/pdfExport';
import {
  ShiftReport,
  PlantId,
  AppRole,
  MASTER_DEEPWELLS,
  PLANT1_DEEPWELLS,
  PLANT2_DEEPWELLS,
  DeepwellId,
  getShiftHoursLabel,
} from '../types';

interface DailyUsageViewerProps {
  reports: ShiftReport[];
  userRole: AppRole;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  onSwitchToInput: () => void;
}

export const DailyUsageViewer: React.FC<DailyUsageViewerProps> = ({
  reports,
  userRole,
  currentUserEmail,
  currentUserName,
  onSwitchToInput,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Plant selection:
  // Operator Plant 1: view Plant 1
  // Operator Plant 2: view Plant 2 or Plant 1 (as requested: "serta bisa melihat penggunaan harian di plant 1")
  const defaultPlant: PlantId = userRole === 'operator_plant2' ? 'Plant 2' : 'Plant 1';
  const [activePlant, setActivePlant] = useState<PlantId>(defaultPlant);

  // Filter reports by date and deepwells for active plant
  const deepwellsForPlant = useMemo(() => {
    return activePlant === 'Plant 1' ? PLANT1_DEEPWELLS : PLANT2_DEEPWELLS;
  }, [activePlant]);

  const activePlantConfig = useMemo(() => {
    return MASTER_DEEPWELLS.filter((dw) => dw.plant === activePlant);
  }, [activePlant]);

  // Reports matching selected date
  const dateReports = useMemo(() => {
    return reports
      .filter((r) => r.date === selectedDate)
      .sort((a, b) => a.shift - b.shift);
  }, [reports, selectedDate]);

  // Aggregate readings for this plant's deepwells today
  const dailyDeepwellStats = useMemo(() => {
    return deepwellsForPlant.map((dwId) => {
      const dwConfig = MASTER_DEEPWELLS.find((d) => d.id === dwId)!;
      let totalUsage = 0;
      let minMeterAwal: number | null = null;
      let maxMeterAkhir: number | null = null;
      const shiftReadings: Array<{
        shift: number;
        operator: string;
        awal: number;
        akhir: number;
        pemakaian: number;
        isOver: boolean;
        keterangan: string;
        submittedAt: string;
        isRevised?: boolean;
      }> = [];

      dateReports.forEach((rep) => {
        const found = rep.readings.find((r) => r.deepwellId === dwId);
        if (found) {
          totalUsage += found.pemakaian;
          if (minMeterAwal === null || found.meterAwal < minMeterAwal) {
            minMeterAwal = found.meterAwal;
          }
          if (maxMeterAkhir === null || found.meterAkhir > maxMeterAkhir) {
            maxMeterAkhir = found.meterAkhir;
          }
          shiftReadings.push({
            shift: rep.shift,
            operator: rep.operatorName,
            awal: found.meterAwal,
            akhir: found.meterAkhir,
            pemakaian: found.pemakaian,
            isOver: found.isOverQuota,
            keterangan: found.keteranganOver,
            submittedAt: rep.submittedAt,
            isRevised: rep.isRevised,
          });
        }
      });

      const totalQuota = dwConfig.dailyQuota;
      const percentUsed = totalQuota > 0 ? (totalUsage / totalQuota) * 100 : totalUsage > 0 ? 100 : 0;
      const isDailyOver = totalQuota > 0 && totalUsage > totalQuota;

      return {
        id: dwId,
        config: dwConfig,
        totalUsage: parseFloat(totalUsage.toFixed(2)),
        dailyQuota: totalQuota,
        percentUsed: parseFloat(percentUsed.toFixed(1)),
        isDailyOver,
        minMeterAwal,
        maxMeterAkhir,
        shiftReadings,
      };
    });
  }, [deepwellsForPlant, dateReports]);

  // Overall totals for active plant
  const plantTotalUsage = useMemo(() => {
    return dailyDeepwellStats.reduce((acc, curr) => acc + curr.totalUsage, 0);
  }, [dailyDeepwellStats]);

  const plantTotalQuota = useMemo(() => {
    return activePlantConfig.reduce((acc, curr) => acc + curr.dailyQuota, 0);
  }, [activePlantConfig]);

  const plantPercentUsed = useMemo(() => {
    return plantTotalQuota > 0 ? (plantTotalUsage / plantTotalQuota) * 100 : 0;
  }, [plantTotalUsage, plantTotalQuota]);

  const hasAnyOverQuota = dailyDeepwellStats.some((s) => s.isDailyOver);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner: Read-Only Disclaimer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Rekap Penggunaan Air Harian
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Mode Hanya Lihat (Read-Only)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                  <HardHat className="w-3 h-3" />
                  {userRole === 'operator_plant1' ? 'Operator Plant 1' : 'Operator Plant 2'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {userRole === 'operator_plant1'
                  ? 'Menampilkan rekap harian Plant 1 (Deepwell 1 & 2). Data bersifat read-only.'
                  : 'Menampilkan rekap harian Plant 2 (Deepwell 3-6) & Plant 1. Data bersifat read-only.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSwitchToInput}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <HardHat className="w-4 h-4" />
              <span>Input Data Baru</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notice Info Box */}
        <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong className="font-semibold text-amber-950">Akses Terbatas:</strong> Anda hanya memiliki otoritas untuk melihat data pembacaan meter yang telah diinput. Sesuai prosedur operasional standar, operator <strong>tidak dapat melakukan revisi atau perbaikan data</strong>. Apabila terdapat selisih atau kekeliruan pencatatan, silakan laporkan ke Supervisor jaga untuk dilakukan revisi resmi.
          </div>
        </div>
      </div>

      {/* Date and Plant Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Plant Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActivePlant('Plant 1')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activePlant === 'Plant 1'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Plant 1 (DW 1 & DW 2)</span>
          </button>

          {/* Plant 2 tab (always visible for Operator Plant 2, and switchable) */}
          <button
            onClick={() => setActivePlant('Plant 2')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activePlant === 'Plant 2'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Plant 2 (DW 3, 4, 5, 6)</span>
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              selectedDate === todayStr
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Hari Ini
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 font-medium outline-none text-xs"
            />
          </div>

          {/* Export Quick Buttons */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={() => {
                exportReportsToExcel(
                  dateReports,
                  `Rekap_Harian_Air_${selectedDate}_${activePlant.replace(' ', '_')}`
                );
              }}
              disabled={dateReports.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition"
              title="Download Excel rekap harian"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportReportsToPdf(dateReports, {
                  timeframe: 'Harian',
                  dateLabel: selectedDate,
                  shiftLabel: 'Semua Shift Hari Ini',
                  supervisorName: currentUserName || 'Petugas Monitoring',
                });
              }}
              disabled={dateReports.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold transition"
              title="Download PDF rekap harian"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Total Daily Usage for Selected Plant */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pemakaian */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Pemakaian Harian
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {plantTotalUsage.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">m³</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Akumulasi seluruh shift pada {selectedDate}
          </p>
        </div>

        {/* Card 2: Batas Kuota Harian */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Batas Kuota {activePlant}
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800">
              {plantTotalQuota.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">m³/hari</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {activePlant === 'Plant 1' ? 'DW 1 (250) + DW 2 (250)' : 'DW 3 (250) + DW 5 (83.3) + DW 6 (366.7)'}
          </p>
        </div>

        {/* Card 3: Persentase Kuota */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Realisasi Kuota
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                plantPercentUsed > 100
                  ? 'bg-rose-50 text-rose-600'
                  : plantPercentUsed > 85
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {plantPercentUsed > 100 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold ${
                plantPercentUsed > 100
                  ? 'text-rose-600'
                  : plantPercentUsed > 85
                  ? 'text-amber-600'
                  : 'text-emerald-700'
              }`}
            >
              {plantPercentUsed.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                plantPercentUsed > 100
                  ? 'bg-rose-500'
                  : plantPercentUsed > 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(plantPercentUsed, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Shift Terlaporkan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Shift Terlaporkan
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {dateReports.length} / 3
            </span>
            <span className="text-xs font-medium text-slate-500">Shift</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {dateReports.length === 3
              ? 'Lengkap seluruh shift hari ini'
              : `Tersisa ${3 - dateReports.length} shift belum terinput`}
          </p>
        </div>
      </div>

      {/* Deepwell Breakdown Cards for Active Plant */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-600" />
          <span>Rincian Deepwell — {activePlant}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dailyDeepwellStats.map((stat) => {
            const isDw4 = stat.id === 'DW 4';
            return (
              <div
                key={stat.id}
                className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition ${
                  stat.isDailyOver
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                        {stat.id}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800">
                        {stat.config.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {stat.config.description}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      stat.isDailyOver
                        ? 'bg-rose-100 text-rose-800'
                        : stat.totalUsage > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {stat.isDailyOver ? (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        Over Kuota
                      </>
                    ) : stat.totalUsage > 0 ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Normal
                      </>
                    ) : (
                      'Belum Ada Data'
                    )}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Pemakaian Hari Ini:</span>
                    <span className="font-bold text-slate-900">
                      {stat.totalUsage.toLocaleString('id-ID')} m³{' '}
                      <span className="text-slate-400 font-normal">
                        / {stat.dailyQuota.toLocaleString('id-ID')} m³
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        stat.isDailyOver
                          ? 'bg-rose-500'
                          : stat.percentUsed > 80
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.min(stat.percentUsed, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {stat.percentUsed.toFixed(1)}% dari kuota harian (24 jam)
                    </span>
                    {isDw4 && (
                      <span className="text-amber-600 font-medium">Standby unit</span>
                    )}
                  </div>
                </div>

                {/* Meter status summary */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">
                      Meter Awal Hari Ini
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {stat.minMeterAwal !== null ? `${stat.minMeterAwal} m³` : '-'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">
                      Meter Terakhir Hari Ini
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {stat.maxMeterAkhir !== null ? `${stat.maxMeterAkhir} m³` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Readings Log Table (Read-Only) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Log Pembacaan Meter Shift — {selectedDate}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar laporan shift yang telah tersimpan di sistem untuk {activePlant}.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Hanya Lihat (Tidak Dapat Direvisi Operator)</span>
          </span>
        </div>

        {dateReports.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              Belum ada laporan shift yang diinput pada tanggal {selectedDate}.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Gunakan formulir input operator untuk mencatat shift hari ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Deepwell</th>
                  <th className="py-3 px-4 text-right">Meter Awal (m³)</th>
                  <th className="py-3 px-4 text-right">Meter Akhir (m³)</th>
                  <th className="py-3 px-4 text-right">Pemakaian (m³)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Operator Pelapor</th>
                  <th className="py-3 px-4">Waktu Submit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dateReports.flatMap((rep) =>
                  rep.readings
                    .filter((r) => deepwellsForPlant.includes(r.deepwellId))
                    .map((reading) => {
                      const dwConfig = MASTER_DEEPWELLS.find((d) => d.id === reading.deepwellId);
                      return (
                        <tr key={`${rep.id}-${reading.deepwellId}`} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                              Shift {rep.shift}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {getShiftHoursLabel(rep.shift as 1 | 2 | 3)}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{reading.deepwellId}</span>
                            <span className="text-[11px] text-slate-400 ml-1.5">
                              ({dwConfig?.name})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                            {reading.meterAwal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                            {reading.meterAkhir.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {reading.pemakaian.toLocaleString('id-ID')} m³
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {reading.isOverQuota ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Over Kuota
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Normal
                              </span>
                            )}
                            {rep.isRevised && (
                              <span className="ml-1 text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
                                Direvisi
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                            <div className="font-medium">{rep.operatorName}</div>
                            {rep.operatorEmail && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {rep.operatorEmail}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                            {rep.submittedAt.split(' ')[1] || rep.submittedAt} WIB
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          Untuk perbaikan data atau koreksi angka meter, hubungi Supervisor untuk membuka portal revisi resmi.
        </div>
      </div>
    </div>
  );
};
