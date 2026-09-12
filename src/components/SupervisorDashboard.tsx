import React, { useState, useMemo } from 'react';
import {
  ShiftReport,
  MASTER_DEEPWELLS,
  DeepwellId,
  GoogleDriveStatus,
  DeepwellReadingInput,
  SHIFT_SCHEDULES,
  getShiftHoursLabel,
} from '../types';
import {
  Calendar,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  ExternalLink,
  Droplets,
  TrendingUp,
  Layers,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw,
  Users,
  Lock,
  ArrowRight,
  HardHat,
  Edit3,
  CheckCircle2,
  Upload,
  FileText,
} from 'lucide-react';
import { getSupervisorEmails } from '../services/supervisorAuth';
import { RevisionModal } from './RevisionModal';
import { ImportExportModal } from './ImportExportModal';

interface SupervisorDashboardProps {
  reports: ShiftReport[];
  driveStatus: GoogleDriveStatus;
  onSyncAllToSheets: () => Promise<void>;
  currentUserEmail: string | null;
  isUserSupervisor: boolean;
  isSuperUser?: boolean;
  onOpenSupervisorManager: () => void;
  onSwitchToOperator: () => void;
  onReviseReport?: (
    reportId: string,
    updatedReadings: DeepwellReadingInput[],
    reason: string
  ) => Promise<void>;
  onReportsUpdated?: (updatedReports: ShiftReport[]) => void;
}

type TimeframeMode = 'shift' | 'daily' | 'monthly' | 'yearly';
type ChartMode = 'daily_shifts' | 'monthly_deepwells' | 'plant_split';

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  reports,
  driveStatus,
  onSyncAllToSheets,
  currentUserEmail,
  isUserSupervisor,
  isSuperUser = false,
  onOpenSupervisorManager,
  onSwitchToOperator,
  onReviseReport,
  onReportsUpdated,
}) => {
  // If the logged in user is not a registered supervisor, show restricted access view
  if (!isUserSupervisor) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Akses Terbatas: Khusus Supervisor
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">
            Halaman Dashboard Supervisor, analisis debit kuota, dan ekspor data hanya dapat dibuka oleh email yang telah didaftarkan ke dalam kategori Supervisor.
          </p>

          <div className="my-6 max-w-md mx-auto p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Akun Google Anda:</span>
              <span className="font-bold text-slate-800 font-mono">{currentUserEmail || 'Tidak terdeteksi'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Kategori Saat Ini:</span>
              <span className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                <HardHat className="w-3 h-3" />
                Operator Lapangan
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Perlu akses supervisor?</span> Hubungi Administrator untuk verifikasi pendaftaran akun Anda.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onSwitchToOperator}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <HardHat className="w-4 h-4" />
              <span>Buka Form Input Operator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  // Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
  const currentYearStr = todayStr.slice(0, 4); // YYYY

  const [timeframe, setTimeframe] = useState<TimeframeMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | 1 | 2 | 3>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  const [chartMode, setChartMode] = useState<ChartMode>('daily_shifts');
  const [plantFilter, setPlantFilter] = useState<'ALL' | 'Plant 1' | 'Plant 2'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOverQuotaOnly, setFilterOverQuotaOnly] = useState<boolean>(false);
  const [isResyncing, setIsResyncing] = useState<boolean>(false);

  // Revision state
  const [selectedReportForRevision, setSelectedReportForRevision] = useState<ShiftReport | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);

  // Import / Export state
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [importExportInitialTab, setImportExportInitialTab] = useState<'import' | 'export'>('import');

  // 1. Filtered reports based on selected timeframe
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (timeframe === 'shift') {
        const matchesDate = r.date === selectedDate;
        const matchesShift = selectedShiftFilter === 'ALL' || r.shift === selectedShiftFilter;
        return matchesDate && matchesShift;
      } else if (timeframe === 'daily') {
        return r.date === selectedDate;
      } else if (timeframe === 'monthly') {
        return r.date.startsWith(selectedMonth);
      } else {
        return r.date.startsWith(selectedYear);
      }
    });
  }, [reports, timeframe, selectedDate, selectedShiftFilter, selectedMonth, selectedYear]);

  // 2. Flattened reading items for the master table
  const flattenedReadings = useMemo(() => {
    const list: Array<{
      reportId: string;
      submittedAt: string;
      date: string;
      shift: number;
      operatorName: string;
      operatorEmail?: string;
      deepwellId: DeepwellId;
      plant: string;
      meterAwal: number;
      meterAkhir: number;
      pemakaian: number;
      kuotaShift: number;
      persenKuota: number;
      isOverQuota: boolean;
      keteranganOver: string;
      synced: boolean;
      isRevised?: boolean;
      revisedBy?: string;
      revisedAt?: string;
      revisionReason?: string;
    }> = [];

    filteredReports.forEach((rep) => {
      rep.readings.forEach((reading) => {
        const dwConfig = MASTER_DEEPWELLS.find((d) => d.id === reading.deepwellId);
        const plant = dwConfig?.plant || 'Plant 1';

        if (plantFilter !== 'ALL' && plant !== plantFilter) {
          return;
        }

        if (filterOverQuotaOnly && !reading.isOverQuota) {
          return;
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match =
            reading.deepwellId.toLowerCase().includes(q) ||
            plant.toLowerCase().includes(q) ||
            rep.operatorName.toLowerCase().includes(q) ||
            rep.date.includes(q) ||
            reading.keteranganOver.toLowerCase().includes(q) ||
            (rep.revisionReason && rep.revisionReason.toLowerCase().includes(q));
          if (!match) return;
        }

        list.push({
          reportId: rep.id,
          submittedAt: rep.submittedAt,
          date: rep.date,
          shift: rep.shift,
          operatorName: rep.operatorName,
          operatorEmail: rep.operatorEmail,
          deepwellId: reading.deepwellId,
          plant,
          meterAwal: reading.meterAwal,
          meterAkhir: reading.meterAkhir,
          pemakaian: reading.pemakaian,
          kuotaShift: reading.kuotaShift,
          persenKuota: reading.persenKuota,
          isOverQuota: reading.isOverQuota,
          keteranganOver: reading.keteranganOver,
          synced: !!rep.syncedToGoogleSheets,
          isRevised: !!rep.isRevised,
          revisedBy: rep.revisedBy,
          revisedAt: rep.revisedAt,
          revisionReason: rep.revisionReason,
        });
      });
    });

    return list;
  }, [filteredReports, plantFilter, filterOverQuotaOnly, searchQuery]);

  // 3. Daily & Monthly Overquota Alerts Calculation
  // Daily Quotas: DW1: 250 m3, DW2: 250 m3, DW3: 250 m3, DW4: 0 m3, DW5: 83.33 m3, DW6: 366.67 m3
  const dailyAggregation = useMemo(() => {
    const todayReports = reports.filter((r) => r.date === selectedDate);
    const totals: Record<DeepwellId, { usage: number; shiftCount: number }> = {
      'DW 1': { usage: 0, shiftCount: 0 },
      'DW 2': { usage: 0, shiftCount: 0 },
      'DW 3': { usage: 0, shiftCount: 0 },
      'DW 4': { usage: 0, shiftCount: 0 },
      'DW 5': { usage: 0, shiftCount: 0 },
      'DW 6': { usage: 0, shiftCount: 0 },
    };

    todayReports.forEach((rep) => {
      rep.readings.forEach((r) => {
        totals[r.deepwellId].usage += r.pemakaian;
        totals[r.deepwellId].shiftCount += 1;
      });
    });

    const warnings: Array<{
      dwId: DeepwellId;
      name: string;
      plant: string;
      actual: number;
      quota: number;
      delta: number;
      percent: number;
    }> = [];

    MASTER_DEEPWELLS.forEach((dw) => {
      const actual = parseFloat(totals[dw.id].usage.toFixed(1));
      const quota = dw.dailyQuota;
      const isOver = quota === 0 ? actual > 0 : actual > quota;

      if (isOver) {
        warnings.push({
          dwId: dw.id,
          name: dw.name,
          plant: dw.plant,
          actual,
          quota,
          delta: parseFloat((actual - quota).toFixed(1)),
          percent: quota > 0 ? parseFloat(((actual / quota) * 100).toFixed(1)) : 100,
        });
      }
    });

    return { totals, warnings };
  }, [reports, selectedDate]);

  // Monthly Quotas: DW1: 7500, DW2: 7500, DW3: 7500, DW4: 0, DW5: 2500, DW6: 11000
  const monthlyAggregation = useMemo(() => {
    const monthReports = reports.filter((r) => r.date.startsWith(selectedMonth));
    const totals: Record<DeepwellId, { usage: number; count: number }> = {
      'DW 1': { usage: 0, count: 0 },
      'DW 2': { usage: 0, count: 0 },
      'DW 3': { usage: 0, count: 0 },
      'DW 4': { usage: 0, count: 0 },
      'DW 5': { usage: 0, count: 0 },
      'DW 6': { usage: 0, count: 0 },
    };

    monthReports.forEach((rep) => {
      rep.readings.forEach((r) => {
        totals[r.deepwellId].usage += r.pemakaian;
        totals[r.deepwellId].count += 1;
      });
    });

    const warnings: Array<{
      dwId: DeepwellId;
      name: string;
      plant: string;
      actual: number;
      quota: number;
      delta: number;
      percent: number;
    }> = [];

    MASTER_DEEPWELLS.forEach((dw) => {
      const actual = parseFloat(totals[dw.id].usage.toFixed(1));
      const quota = dw.monthlyQuota;
      const isOver = quota === 0 ? actual > 0 : actual > quota;

      if (isOver) {
        warnings.push({
          dwId: dw.id,
          name: dw.name,
          plant: dw.plant,
          actual,
          quota,
          delta: parseFloat((actual - quota).toFixed(1)),
          percent: quota > 0 ? parseFloat(((actual / quota) * 100).toFixed(1)) : 100,
        });
      }
    });

    return { totals, warnings };
  }, [reports, selectedMonth]);

  // Total summary for KPI cards
  const totalPeriodUsage = useMemo(() => {
    return filteredReports.reduce((acc, rep) => acc + rep.totalPemakaian, 0);
  }, [filteredReports]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Laporan',
      'Timestamp Submit',
      'Tanggal',
      'Shift',
      'Plant',
      'Deepwell',
      'Meter Awal (m3)',
      'Meter Akhir (m3)',
      'Pemakaian (m3)',
      'Kuota Shift (m3)',
      'Persen Kuota (%)',
      'Status Kuota',
      'Keterangan Over Kuota',
      'Operator',
      'Email Operator (Google)',
    ];

    const rows = flattenedReadings.map((r) => [
      r.reportId,
      r.submittedAt,
      r.date,
      `Shift ${r.shift}`,
      r.plant,
      r.deepwellId,
      r.meterAwal,
      r.meterAkhir,
      r.pemakaian,
      r.kuotaShift,
      `${r.persenKuota}%`,
      r.isOverQuota ? 'OVER KUOTA' : 'NORMAL',
      `"${(r.keteranganOver || '').replace(/"/g, '""')}"`,
      `"${r.operatorName}"`,
      `"${r.operatorEmail || '-'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Water_Monitoring_Export_${timeframe}_${selectedDate || selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerResync = async () => {
    setIsResyncing(true);
    try {
      await onSyncAllToSheets();
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header & Timeframe Selection */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Dashboard Supervisor & Analisis Air
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Monitoring Real-Time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekap pemakaian air harian, bulanan, tahunan dengan deteksi dini overkuota untuk Plant 1 & Plant 2.
          </p>
        </div>

        {/* Timeframe selector (Per Shift / Harian / Bulanan / Tahunan) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 shadow-inner">
            <button
              id="timeframe-shift-btn"
              onClick={() => setTimeframe('shift')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeframe === 'shift'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Shift
            </button>
            <button
              id="timeframe-daily-btn"
              onClick={() => setTimeframe('daily')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeframe === 'daily'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harian
            </button>
            <button
              id="timeframe-monthly-btn"
              onClick={() => setTimeframe('monthly')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeframe === 'monthly'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulanan
            </button>
            <button
              id="timeframe-yearly-btn"
              onClick={() => setTimeframe('yearly')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeframe === 'yearly'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahunan
            </button>
          </div>

          {/* Time Picker based on timeframe */}
          {timeframe === 'shift' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  id="select-supervisor-shift-date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-slate-700 outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="select-supervisor-shift-number"
                  value={selectedShiftFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedShiftFilter(val === 'ALL' ? 'ALL' : (Number(val) as 1 | 2 | 3));
                  }}
                  className="text-xs font-semibold bg-transparent text-slate-700 outline-none"
                >
                  <option value="ALL">Semua Shift</option>
                  {SHIFT_SCHEDULES.map((sched) => (
                    <option key={sched.shift} value={sched.shift}>
                      {sched.label} ({sched.hours})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {timeframe === 'daily' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                id="select-supervisor-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-700 outline-none"
              />
            </div>
          )}

          {timeframe === 'monthly' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                id="select-supervisor-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-700 outline-none"
              />
            </div>
          )}

          {timeframe === 'yearly' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="select-supervisor-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-700 outline-none"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y.toString()}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Import & Export Actions */}
          <button
            id="btn-open-import-excel"
            onClick={() => {
              setImportExportInitialTab('import');
              setIsImportExportOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition border border-emerald-300 shadow-2xs"
            title="Import data riwayat penggunaan air dari file Excel (.xlsx)"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            id="btn-open-export-modal"
            onClick={() => {
              setImportExportInitialTab('export');
              setIsImportExportOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300"
            title="Export data ke format Excel (.xlsx) atau dokumen PDF (.pdf)"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export (Excel / PDF)</span>
          </button>

          {/* Supervisor Email Management Button - Strictly for Super User only */}
          {isSuperUser && (
            <button
              id="btn-manage-supervisors"
              onClick={onOpenSupervisorManager}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
              title="Atur siapa saja yang memiliki akses Supervisor (Khusus Super User)"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola Supervisor</span>
            </button>
          )}
        </div>
      </div>

      {/* OVERQUOTA WARNING BANNERS (As explicitly requested by user) */}
      <div className="space-y-3">
        {/* Daily Overquota Alert Banner */}
        {dailyAggregation.warnings.length > 0 && (
          <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-amber-900">
                    Peringatan Overkuota Harian ({selectedDate})
                  </h4>
                  <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                    {dailyAggregation.warnings.length} Deepwell Melebihi Kuota
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Terdeteksi akumulasi pemakaian air harian melampaui batas kuota yang ditentukan:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2.5">
                  {dailyAggregation.warnings.map((w) => (
                    <div
                      key={w.dwId}
                      className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{w.name}</span>
                        <span className="text-amber-700">+{w.delta} m³</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Pemakaian: <strong>{w.actual} m³</strong> / Limit:{' '}
                        {w.quota === 0 ? '0 m³ (Standby)' : `${w.quota} m³`} ({w.percent}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Overquota Alert Banner */}
        {monthlyAggregation.warnings.length > 0 && (
          <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-rose-900">
                    Peringatan Overkuota Bulanan ({selectedMonth})
                  </h4>
                  <span className="text-xs font-semibold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
                    {monthlyAggregation.warnings.length} Deepwell Over Kuota Bulanan
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-1">
                  Akumulasi pemakaian air bulan ini telah melampaui kuota izin bulanan pabrik:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2.5">
                  {monthlyAggregation.warnings.map((w) => (
                    <div
                      key={w.dwId}
                      className="bg-white/80 p-2.5 rounded-lg border border-rose-200 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{w.name}</span>
                        <span className="text-rose-700">+{w.delta} m³</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Bulan ini: <strong>{w.actual.toLocaleString()} m³</strong> / Limit:{' '}
                        {w.quota.toLocaleString()} m³ ({w.percent}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Pemakaian Air
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 mt-2">
            {totalPeriodUsage.toFixed(1)} <span className="text-sm font-sans font-normal text-slate-500">m³</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 capitalize">
            Periode {timeframe} terpilih ({filteredReports.length} laporan shift)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Plant 1 (DW 1 & 2)
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          {(() => {
            const p1Usage = filteredReports.reduce((sum, rep) => {
              const p1 = rep.readings
                .filter((r) => r.deepwellId === 'DW 1' || r.deepwellId === 'DW 2')
                .reduce((s, r) => s + r.pemakaian, 0);
              return sum + p1;
            }, 0);
            return (
              <>
                <div className="text-2xl font-bold font-mono text-cyan-900 mt-2">
                  {p1Usage.toFixed(1)}{' '}
                  <span className="text-sm font-sans font-normal text-slate-500">m³</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Kuota harian per sumur: 250 m³
                </p>
              </>
            );
          })()}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Plant 2 (DW 3, 4, 5, 6)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          {(() => {
            const p2Usage = filteredReports.reduce((sum, rep) => {
              const p2 = rep.readings
                .filter((r) => ['DW 3', 'DW 4', 'DW 5', 'DW 6'].includes(r.deepwellId))
                .reduce((s, r) => s + r.pemakaian, 0);
              return sum + p2;
            }, 0);
            return (
              <>
                <div className="text-2xl font-bold font-mono text-emerald-900 mt-2">
                  {p2Usage.toFixed(1)}{' '}
                  <span className="text-sm font-sans font-normal text-slate-500">m³</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sumur produksi, boiler & domestik
                </p>
              </>
            );
          })()}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sinkronisasi Google Drive
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                driveStatus.connected ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
            <span className="text-sm font-bold text-slate-800">
              {driveStatus.connected ? 'Tersinkron ke Sheets' : 'Offline / Local'}
            </span>
          </div>
          {driveStatus.spreadsheetUrl ? (
            <a
              href={driveStatus.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-sky-600 hover:text-sky-800 font-medium inline-flex items-center gap-1 mt-1"
            >
              <span>Buka Google Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">
              Data tersimpan aman di sistem lokal
            </p>
          )}
        </div>
      </div>

      {/* INTERACTIVE WATER USAGE CHARTS (User Requirement: "Ada juga grafik pemakaian air harian-bulanan yang bisa dipilih") */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              Grafik Pemakaian Air & Perbandingan Kuota
            </h3>
            <p className="text-xs text-slate-500">
              Visualisasi debit meter air per deepwell dan per shift kerja.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setChartMode('daily_shifts')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                chartMode === 'daily_shifts'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Deepwell (Shift)
            </button>
            <button
              onClick={() => setChartMode('monthly_deepwells')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                chartMode === 'monthly_deepwells'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Komparasi Kuota
            </button>
            <button
              onClick={() => setChartMode('plant_split')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                chartMode === 'plant_split'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Plant 1 vs Plant 2
            </button>
          </div>
        </div>

        {/* Dynamic Chart Display using Clean SVG */}
        <div className="w-full h-72 flex flex-col justify-end">
          {chartMode === 'daily_shifts' && (
            <div className="h-full w-full flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 pb-2">
                <span>m³ / Shift</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-sky-500" /> Pemakaian Air (m³)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-amber-500 rounded" /> Garis Kuota Shift
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500" /> Over Kuota
                  </span>
                </div>
              </div>

              {/* Bar Columns for DW 1 to 6 */}
              <div className="grid grid-cols-6 gap-2 sm:gap-4 h-52 items-end pt-4">
                {MASTER_DEEPWELLS.map((dw) => {
                  // Calculate average or latest usage in filtered reports
                  const readings = filteredReports.flatMap((rep) =>
                    rep.readings.filter((r) => r.deepwellId === dw.id)
                  );
                  const total = readings.reduce((s, r) => s + r.pemakaian, 0);
                  const avg = readings.length > 0 ? total / readings.length : 0;
                  const isOver = dw.shiftQuota > 0 ? avg >= dw.shiftQuota : avg > 0;
                  const maxDisplay = 150; // max scale
                  const barHeight = Math.min((avg / maxDisplay) * 100, 100);
                  const quotaHeight = dw.shiftQuota > 0 ? (dw.shiftQuota / maxDisplay) * 100 : 0;

                  return (
                    <div key={dw.id} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[11px] font-bold font-mono text-slate-700 mb-1">
                        {avg.toFixed(1)} <span className="text-[9px] font-normal">m³</span>
                      </div>

                      <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg h-44 relative flex items-end justify-center overflow-hidden border border-slate-200">
                        {/* Quota threshold line */}
                        {quotaHeight > 0 && (
                          <div
                            className="absolute w-full border-t-2 border-dashed border-amber-500 z-10"
                            style={{ bottom: `${quotaHeight}%` }}
                            title={`Batas Kuota Shift: ${dw.shiftQuota} m³`}
                          />
                        )}

                        {/* Usage Bar */}
                        <div
                          className={`w-full rounded-t transition-all duration-500 ${
                            isOver
                              ? 'bg-rose-500 group-hover:bg-rose-600'
                              : 'bg-sky-500 group-hover:bg-sky-600'
                          }`}
                          style={{ height: `${Math.max(barHeight, 4)}%` }}
                        />
                      </div>

                      <span className="text-xs font-bold text-slate-700 mt-2">{dw.id}</span>
                      <span className="text-[10px] text-slate-400">{dw.plant}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {chartMode === 'monthly_deepwells' && (
            <div className="h-full w-full flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 pb-2">
                <span>Perbandingan Akumulasi vs Kuota ({selectedMonth})</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-600" /> Aktual Bulanan
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-slate-300" /> Target Kuota Izin
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-3 h-52 items-end pt-4">
                {MASTER_DEEPWELLS.map((dw) => {
                  const actual = monthlyAggregation.totals[dw.id].usage;
                  const quota = dw.monthlyQuota;
                  const percent = quota > 0 ? (actual / quota) * 100 : actual > 0 ? 100 : 0;
                  const isOver = quota === 0 ? actual > 0 : actual > quota;

                  return (
                    <div key={dw.id} className="flex flex-col items-center h-full justify-end">
                      <span className="text-[10px] font-bold font-mono text-slate-700 mb-1">
                        {actual.toFixed(0)} / {quota === 0 ? '0' : quota.toLocaleString()}
                      </span>

                      <div className="w-full max-w-[42px] bg-slate-100 rounded-t-lg h-44 relative flex items-end justify-center overflow-hidden border border-slate-200">
                        <div
                          className={`w-full rounded-t transition-all duration-500 ${
                            isOver ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ height: `${Math.min(percent, 100)}%` }}
                        />
                      </div>

                      <span className="text-xs font-bold text-slate-700 mt-2">{dw.id}</span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isOver ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {chartMode === 'plant_split' && (
            <div className="h-full flex items-center justify-around">
              {(() => {
                const p1 = filteredReports.reduce((s, rep) => {
                  return (
                    s +
                    rep.readings
                      .filter((r) => ['DW 1', 'DW 2'].includes(r.deepwellId))
                      .reduce((sub, r) => sub + r.pemakaian, 0)
                  );
                }, 0);

                const p2 = filteredReports.reduce((s, rep) => {
                  return (
                    s +
                    rep.readings
                      .filter((r) => ['DW 3', 'DW 4', 'DW 5', 'DW 6'].includes(r.deepwellId))
                      .reduce((sub, r) => sub + r.pemakaian, 0)
                  );
                }, 0);

                const total = p1 + p2 || 1;
                const p1Pct = ((p1 / total) * 100).toFixed(1);
                const p2Pct = ((p2 / total) * 100).toFixed(1);

                return (
                  <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full">
                    {/* Plant 1 Card */}
                    <div className="bg-cyan-50/60 border border-cyan-200 p-5 rounded-2xl text-center min-w-[220px]">
                      <div className="text-xs font-bold uppercase text-cyan-800 tracking-wider">
                        Plant 1 (DW 1 & 2)
                      </div>
                      <div className="text-3xl font-bold font-mono text-cyan-900 mt-1">
                        {p1.toFixed(1)} m³
                      </div>
                      <div className="text-xs font-semibold text-cyan-700 mt-1">
                        Porsi {p1Pct}% dari Total
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2">
                        Kuota Total: 15.000 m³/bulan
                      </div>
                    </div>

                    {/* Plant 2 Card */}
                    <div className="bg-emerald-50/60 border border-emerald-200 p-5 rounded-2xl text-center min-w-[220px]">
                      <div className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
                        Plant 2 (DW 3, 4, 5, 6)
                      </div>
                      <div className="text-3xl font-bold font-mono text-emerald-900 mt-1">
                        {p2.toFixed(1)} m³
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 mt-1">
                        Porsi {p2Pct}% dari Total
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2">
                        Kuota Total: 21.000 m³/bulan
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* MASTER DATA TABLE (With search, filter, and detail views) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Log Data Pembacaan Meter Air
            </h3>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              {flattenedReadings.length} Entri
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari DW, operator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 transition w-36 sm:w-44"
              />
            </div>

            {/* Plant Filter */}
            <select
              value={plantFilter}
              onChange={(e: any) => setPlantFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="ALL">Semua Plant</option>
              <option value="Plant 1">Plant 1 (DW 1-2)</option>
              <option value="Plant 2">Plant 2 (DW 3-6)</option>
            </select>

            {/* Over Quota Only Filter Toggle */}
            <button
              onClick={() => setFilterOverQuotaOnly(!filterOverQuotaOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                filterOverQuotaOnly
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Hanya Over Kuota
            </button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Tanggal & Shift</th>
                <th className="py-3 px-3">Deepwell</th>
                <th className="py-3 px-3">Plant</th>
                <th className="py-3 px-3 text-right">Meter Awal</th>
                <th className="py-3 px-3 text-right">Meter Akhir</th>
                <th className="py-3 px-3 text-right">Pemakaian</th>
                <th className="py-3 px-3 text-right">Kuota Shift</th>
                <th className="py-3 px-3 text-center">% Kuota</th>
                <th className="py-3 px-4">Keterangan / Penjelasan</th>
                <th className="py-3 px-3">Operator</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi Supervisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flattenedReadings.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-400">
                    Tidak ada data pembacaan meter untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                flattenedReadings.map((row, idx) => (
                  <tr
                    key={`${row.reportId}-${row.deepwellId}-${idx}`}
                    className={`hover:bg-slate-50/80 transition ${
                      row.isOverQuota ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{row.date}</span>
                        {row.isRevised && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title={`Direvisi oleh ${row.revisedBy || 'Supervisor'} (${row.revisedAt}): ${row.revisionReason}`}
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            Direvisi
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Shift {row.shift} • {row.submittedAt.slice(-8)}
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-800">{row.deepwellId}</span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          row.plant === 'Plant 1'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {row.plant}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {row.meterAwal.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-800 font-medium">
                      {row.meterAkhir.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {row.pemakaian.toFixed(1)} m³
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {row.kuotaShift === 0 ? '0 m³' : `${row.kuotaShift} m³`}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          row.isOverQuota
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : row.persenKuota > 80
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {row.kuotaShift === 0
                          ? row.pemakaian > 0
                            ? 'Over (0 m³)'
                            : '0%'
                          : `${row.persenKuota.toFixed(0)}%`}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                      {row.isOverQuota ? (
                        <div className="flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate font-medium">{row.keteranganOver}</span>
                        </div>
                      ) : row.isRevised ? (
                        <span className="text-amber-800 text-[11px] truncate italic" title={row.revisionReason}>
                          {row.revisionReason}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">{row.operatorName}</div>
                      {row.operatorEmail && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <span>{row.operatorEmail}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {row.synced ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                          title="Tersinkron ke Google Sheets"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Synced
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Local</span>
                      )}
                    </td>

                    {/* Supervisor Revision Action Button */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          const target = reports.find((r) => r.id === row.reportId);
                          if (target) {
                            setSelectedReportForRevision(target);
                            setIsRevisionModalOpen(true);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition shadow-xs"
                        title="Hanya Supervisor yang berhak merevisi atau memperbaiki data pembacaan meter"
                      >
                        <Edit3 className="w-3 h-3 text-amber-700" />
                        <span>Revisi</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revision Modal for Supervisor */}
      {selectedReportForRevision && (
        <RevisionModal
          report={selectedReportForRevision}
          isOpen={isRevisionModalOpen}
          onClose={() => {
            setIsRevisionModalOpen(false);
            setSelectedReportForRevision(null);
          }}
          onSaveRevision={async (reportId, updatedReadings, reason) => {
            if (onReviseReport) {
              await onReviseReport(reportId, updatedReadings, reason);
            }
            setIsRevisionModalOpen(false);
            setSelectedReportForRevision(null);
          }}
          supervisorEmail={currentUserEmail || 'supervisor'}
        />
      )}

      {/* Import & Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        reports={reports}
        filteredReports={filteredReports}
        initialTab={importExportInitialTab}
        onReportsUpdated={(updated) => {
          if (onReportsUpdated) {
            onReportsUpdated(updated);
          }
        }}
        activeFilterInfo={{
          timeframe,
          dateLabel:
            timeframe === 'shift'
              ? selectedDate
              : timeframe === 'daily'
              ? selectedDate
              : timeframe === 'monthly'
              ? selectedMonth
              : selectedYear,
          shiftLabel:
            timeframe === 'shift'
              ? selectedShiftFilter === 'ALL'
                ? 'Semua Shift'
                : `Shift ${selectedShiftFilter}`
              : 'Semua Shift',
          supervisorName: currentUserEmail || 'Supervisor On Duty',
        }}
      />
    </div>
  );
};
