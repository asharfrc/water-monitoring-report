import React, { useState, useEffect } from 'react';
import {
  MASTER_DEEPWELLS,
  DeepwellId,
  ShiftNumber,
  PlantId,
  ShiftReport,
  DeepwellReadingInput,
  AppRole,
  PLANT1_DEEPWELLS,
  PLANT2_DEEPWELLS,
  getShiftByCurrentTime,
  SHIFT_SCHEDULES,
} from '../types';
import { getLatestMeterReading } from '../services/storage';
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  Droplet,
  Info,
  Calendar,
  Clock,
  User,
  Building,
  RotateCcw,
  Sparkles,
  HelpCircle,
  HardHat,
  ShieldCheck,
} from 'lucide-react';

interface OperatorFormProps {
  onSubmitReport: (report: ShiftReport) => Promise<void>;
  isSyncing: boolean;
  userRole?: AppRole;
  currentUser?: {
    displayName: string | null;
    email: string | null;
    photoURL?: string | null;
  } | null;
  isSupervisorUser?: boolean;
}

export const OperatorForm: React.FC<OperatorFormProps> = ({
  onSubmitReport,
  isSyncing,
  userRole = 'operator_plant1',
  currentUser,
  isSupervisorUser,
}) => {
  // Header Meta State
  const todayStr = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [selectedShift, setSelectedShift] = useState<ShiftNumber>(1);
  const [operatorName, setOperatorName] = useState<string>(
    currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : '')
  );

  // Determine active plant restriction based on role
  const defaultPlantFilter: 'ALL' | PlantId =
    userRole === 'operator_plant1'
      ? 'Plant 1'
      : userRole === 'operator_plant2'
      ? 'Plant 2'
      : 'ALL';

  const [activePlantFilter, setActivePlantFilter] = useState<'ALL' | PlantId>(defaultPlantFilter);

  // Sync plant filter if role changes
  useEffect(() => {
    if (userRole === 'operator_plant1') {
      setActivePlantFilter('Plant 1');
    } else if (userRole === 'operator_plant2') {
      setActivePlantFilter('Plant 2');
    }
  }, [userRole]);

  // Determine which deepwells this user role is authorized to input
  const authorizedDeepwells = MASTER_DEEPWELLS.filter((dw) => {
    if (userRole === 'operator_plant1') {
      return dw.plant === 'Plant 1';
    }
    if (userRole === 'operator_plant2') {
      return dw.plant === 'Plant 2';
    }
    // Supervisor can input either all or based on filter
    if (activePlantFilter === 'ALL') return true;
    return dw.plant === activePlantFilter;
  });

  // Update operator name when currentUser changes
  useEffect(() => {
    if (currentUser?.displayName && !operatorName) {
      setOperatorName(currentUser.displayName);
    } else if (currentUser?.email && !operatorName) {
      setOperatorName(currentUser.email.split('@')[0]);
    }
  }, [currentUser]);

  // Verification checkbox
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Deepwell Readings State
  const [readings, setReadings] = useState<
    Record<
      DeepwellId,
      {
        meterAwal: string;
        meterAkhir: string;
        keteranganOver: string;
      }
    >
  >(() => {
    const initial: any = {};
    MASTER_DEEPWELLS.forEach((dw) => {
      const lastMeter = getLatestMeterReading(dw.id);
      initial[dw.id] = {
        meterAwal: lastMeter !== null ? lastMeter.toString() : '0',
        meterAkhir: '',
        keteranganOver: '',
      };
    });
    return initial;
  });

  // Calculate shift based on current time automatically on mount (Shift 1: 07-16, Shift 2: 16-24, Shift 3: 24-07)
  useEffect(() => {
    setSelectedShift(getShiftByCurrentTime());
  }, []);

  const handleInputChange = (
    dwId: DeepwellId,
    field: 'meterAwal' | 'meterAkhir' | 'keteranganOver',
    value: string
  ) => {
    setReadings((prev) => ({
      ...prev,
      [dwId]: {
        ...prev[dwId],
        [field]: value,
      },
    }));
    setSubmitError(null);
  };

  const handleAutoFillPreviousMeters = () => {
    setReadings((prev) => {
      const updated: any = { ...prev };
      MASTER_DEEPWELLS.forEach((dw) => {
        const last = getLatestMeterReading(dw.id);
        if (last !== null) {
          updated[dw.id] = {
            ...updated[dw.id],
            meterAwal: last.toString(),
          };
        }
      });
      return updated;
    });
  };

  // Helper calculation for each deepwell
  const calculateDeepwellStats = (dwId: DeepwellId) => {
    const config = MASTER_DEEPWELLS.find((d) => d.id === dwId)!;
    const awal = parseFloat(readings[dwId]?.meterAwal || '0');
    const akhir = parseFloat(readings[dwId]?.meterAkhir || '0');

    let pemakaian = 0;
    let isInvalid = false;
    let errorMessage = '';

    if (!isNaN(awal) && !isNaN(akhir) && readings[dwId]?.meterAkhir !== '') {
      if (akhir < awal) {
        isInvalid = true;
        errorMessage = 'Meter akhir tidak boleh lebih kecil dari meter awal';
      } else {
        pemakaian = parseFloat((akhir - awal).toFixed(2));
      }
    }

    const shiftQuota = config.shiftQuota;
    let isOverQuota = false;
    let persenKuota = 0;

    if (shiftQuota === 0) {
      // For DW 4 (quota 0 m3)
      isOverQuota = pemakaian > 0;
      persenKuota = pemakaian > 0 ? 100 : 0;
    } else {
      persenKuota = (pemakaian / shiftQuota) * 100;
      isOverQuota = pemakaian >= shiftQuota;
    }

    return {
      awal,
      akhir,
      pemakaian,
      isInvalid,
      errorMessage,
      shiftQuota,
      persenKuota: parseFloat(persenKuota.toFixed(1)),
      isOverQuota,
    };
  };

  // Total summary of current form - limited to authorized deepwells
  const computedReadings: DeepwellReadingInput[] = authorizedDeepwells.map((dw) => {
    const stats = calculateDeepwellStats(dw.id);
    return {
      deepwellId: dw.id,
      meterAwal: stats.awal,
      meterAkhir: stats.akhir,
      pemakaian: stats.pemakaian,
      kuotaShift: stats.shiftQuota,
      persenKuota: stats.persenKuota,
      isOverQuota: stats.isOverQuota,
      keteranganOver: readings[dw.id]?.keteranganOver || '',
    };
  });

  const totalPemakaian = computedReadings.reduce((sum, r) => sum + r.pemakaian, 0);
  const overQuotaCount = computedReadings.filter((r) => r.isOverQuota).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation 1: Operator Name
    if (!operatorName.trim()) {
      setSubmitError('Nama operator wajib diisi sebelum mengirim laporan.');
      return;
    }

    // Validation 2: Check any negative usage on authorized deepwells
    for (const dw of authorizedDeepwells) {
      const stats = calculateDeepwellStats(dw.id);
      if (stats.isInvalid) {
        setSubmitError(`Nilai meter untuk ${dw.name} tidak valid: ${stats.errorMessage}.`);
        return;
      }
      if (readings[dw.id]?.meterAkhir === '') {
        setSubmitError(`Mohon masukkan Meter Akhir untuk ${dw.name}.`);
        return;
      }
    }

    // Validation 3: Check Over Quota Explanations
    for (const r of computedReadings) {
      if (r.isOverQuota && !r.keteranganOver.trim()) {
        const dw = MASTER_DEEPWELLS.find((d) => d.id === r.deepwellId)!;
        setSubmitError(
          `Deepwell ${dw.name} over kuota (${r.pemakaian} m³ / limit ${r.kuotaShift} m³). Anda wajib memberikan penjelasan!`
        );
        return;
      }
    }

    // Validation 4: Must verify
    if (!isVerified) {
      setSubmitError('Harap centang verifikasi data sebelum mengirimkan laporan.');
      return;
    }

    const reportPlant: PlantId | 'Semua Plant' =
      userRole === 'operator_plant1'
        ? 'Plant 1'
        : userRole === 'operator_plant2'
        ? 'Plant 2'
        : activePlantFilter === 'ALL'
        ? 'Semua Plant'
        : activePlantFilter;

    const now = new Date();
    const newReport: ShiftReport = {
      id: `REP-${reportDate.replace(/-/g, '')}-S${selectedShift}-${Date.now().toString().slice(-4)}`,
      timestamp: now.toISOString(),
      submittedAt: `${reportDate} ${now.toTimeString().slice(0, 5)} WIB`,
      date: reportDate,
      shift: selectedShift,
      plant: reportPlant,
      operatorName: operatorName.trim() || currentUser?.displayName || 'Operator',
      operatorEmail: currentUser?.email || undefined,
      readings: computedReadings,
      totalPemakaian: parseFloat(totalPemakaian.toFixed(2)),
      hasOverQuota: overQuotaCount > 0,
      verified: true,
      syncedToGoogleSheets: false,
    };

    try {
      await onSubmitReport(newReport);
      // Reset after success
      setIsVerified(false);
      setShowSubmitConfirm(false);
      // Advance meter awal to current meter akhir
      setReadings((prev) => {
        const nextState: any = { ...prev };
        authorizedDeepwells.forEach((dw) => {
          nextState[dw.id] = {
            meterAwal: prev[dw.id]?.meterAkhir || '0',
            meterAkhir: '',
            keteranganOver: '',
          };
        });
        return nextState;
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi kesalahan saat menyimpan laporan.');
    }
  };

  const visibleDeepwells = authorizedDeepwells;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Banner / Form Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800">
                {userRole === 'operator_plant1'
                  ? 'Form Input Meter Air — Plant 1'
                  : userRole === 'operator_plant2'
                  ? 'Form Input Meter Air — Plant 2'
                  : 'Form Input Meter Air Harian'}
              </h2>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  userRole === 'operator_plant1'
                    ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                    : userRole === 'operator_plant2'
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                {userRole === 'operator_plant1'
                  ? 'Otoritas: DW 1 & DW 2'
                  : userRole === 'operator_plant2'
                  ? 'Otoritas: DW 3, 4, 5 & 6'
                  : 'Akses Supervisor Penuh'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {userRole === 'operator_plant1'
                ? 'Catat meter awal & akhir untuk Deepwell 1 & 2 di Plant 1. Sistem otomatis menghitung pemakaian per shift.'
                : userRole === 'operator_plant2'
                ? 'Catat meter awal & akhir untuk Deepwell 3, 4, 5 & 6 di Plant 2. Sistem otomatis menghitung pemakaian per shift.'
                : 'Catat meter awal & akhir untuk Deepwell 1 - 6 (Plant 1 & Plant 2).'}
            </p>
          </div>

          <button
            type="button"
            id="btn-autofill-previous-meters"
            onClick={handleAutoFillPreviousMeters}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition"
            title="Ambil meter akhir dari input shift sebelumnya sebagai meter awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tarik Meter Awal Otomatis</span>
          </button>
        </div>

        {/* Authenticated Google Account Banner */}
        {currentUser && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {currentUser.displayName || 'Operator'}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isSupervisorUser
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-sky-100 text-sky-800 border-sky-300'
                    }`}
                  >
                    {isSupervisorUser ? 'Supervisor (Input Mode)' : 'Operator Terverifikasi Google'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {currentUser.email}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hidden sm:flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Akun Google Valid</span>
            </div>
          </div>
        )}

        {/* Shift & Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Tanggal Laporan
            </label>
            <input
              type="date"
              id="input-report-date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full text-sm font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              required
            />
          </div>

          {/* Shift Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Shift Kerja
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {SHIFT_SCHEDULES.map((sched) => (
                <button
                  key={sched.shift}
                  type="button"
                  id={`shift-select-${sched.shift}`}
                  onClick={() => setSelectedShift(sched.shift)}
                  className={`py-2 px-1 text-xs font-semibold rounded-lg border transition ${
                    selectedShift === sched.shift
                      ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Shift {sched.shift}
                  <span className="block text-[10px] font-normal opacity-90 mt-0.5">
                    {sched.shortHours}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Nama Operator
            </label>
            <input
              type="text"
              id="input-operator-name"
              placeholder="Contoh: Budi Santoso"
              value={operatorName}
              onChange={(e) => {
                setOperatorName(e.target.value);
                setSubmitError(null);
              }}
              className="w-full text-sm font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              required
            />
          </div>
        </div>
      </div>

      {/* Plant Filter Buttons / Role Restriction Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {userRole === 'supervisor' ? (
            <>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Filter Plant:
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-xs">
                <button
                  type="button"
                  id="filter-plant-all"
                  onClick={() => setActivePlantFilter('ALL')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    activePlantFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua (DW 1 - 6)
                </button>
                <button
                  type="button"
                  id="filter-plant-1"
                  onClick={() => setActivePlantFilter('Plant 1')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    activePlantFilter === 'Plant 1'
                      ? 'bg-cyan-700 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Plant 1 (DW 1 - 2)
                </button>
                <button
                  type="button"
                  id="filter-plant-2"
                  onClick={() => setActivePlantFilter('Plant 2')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    activePlantFilter === 'Plant 2'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Plant 2 (DW 3 - 6)
                </button>
              </div>
            </>
          ) : userRole === 'operator_plant1' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-800">
              <Building className="w-3.5 h-3.5 text-cyan-600" />
              <span>Plant 1: Deepwell 1 & Deepwell 2</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-800">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              <span>Plant 2: Deepwell 3, 4, 5, dan 6</span>
            </div>
          )}
        </div>

        {/* Live Pemakaian Counter */}
        <div className="text-right">
          <span className="text-xs text-slate-500">Estimasi Total Shift Ini: </span>
          <span className="text-sm font-bold text-slate-800 font-mono">
            {totalPemakaian.toFixed(1)} m³
          </span>
          {overQuotaCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
              <AlertTriangle className="w-3 h-3" />
              {overQuotaCount} Over Kuota
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deepwell Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleDeepwells.map((dw) => {
            const stats = calculateDeepwellStats(dw.id);
            const isPlant1 = dw.plant === 'Plant 1';

            return (
              <div
                key={dw.id}
                id={`card-deepwell-${dw.id.replace(' ', '')}`}
                className={`bg-white rounded-xl p-5 border transition-all duration-200 shadow-xs relative ${
                  stats.isOverQuota
                    ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header of each Deepwell Card */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isPlant1
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {dw.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm">{dw.name}</h3>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                            isPlant1
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {dw.plant}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{dw.description}</p>
                    </div>
                  </div>

                  {/* Quota Badge */}
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-medium">Kuota Shift:</div>
                    <div className="text-xs font-bold text-slate-700 font-mono">
                      {dw.shiftQuota === 0 ? '0 m³ (Standby)' : `${dw.shiftQuota} m³`}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      ({dw.monthlyQuota.toLocaleString()} m³/bln)
                    </div>
                  </div>
                </div>

                {/* Meter Inputs Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Meter Awal (m³)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        id={`input-meter-awal-${dw.id.replace(' ', '')}`}
                        value={readings[dw.id]?.meterAwal || ''}
                        onChange={(e) =>
                          handleInputChange(dw.id, 'meterAwal', e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full text-sm font-mono px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Meter Akhir (m³)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        id={`input-meter-akhir-${dw.id.replace(' ', '')}`}
                        value={readings[dw.id]?.meterAkhir || ''}
                        onChange={(e) =>
                          handleInputChange(dw.id, 'meterAkhir', e.target.value)
                        }
                        placeholder="Contoh: 45285.50"
                        className={`w-full text-sm font-mono px-3 py-1.5 border rounded-lg focus:bg-white focus:ring-2 transition ${
                          stats.isInvalid
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                            : 'bg-slate-50 border-slate-300 focus:ring-sky-500'
                        }`}
                        required
                      />
                    </div>
                  </div>
                </div>

                {stats.isInvalid && (
                  <p className="text-xs text-red-600 mb-2 font-medium">
                    ⚠️ {stats.errorMessage}
                  </p>
                )}

                {/* Calculation Result Display */}
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Pemakaian Air:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 font-mono text-sm">
                        {stats.pemakaian.toFixed(1)} m³
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          stats.isOverQuota
                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                            : stats.persenKuota > 80
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {stats.shiftQuota === 0
                          ? stats.pemakaian > 0
                            ? 'Over (Kuota 0)'
                            : '0%'
                          : `${stats.persenKuota}% kuota`}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {dw.shiftQuota > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          stats.isOverQuota
                            ? 'bg-rose-500'
                            : stats.persenKuota > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(stats.persenKuota, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* CONDITIONAL WARNING: Over Kuota Banner & Mandatory Explanation */}
                {stats.isOverQuota && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg animate-in fade-in duration-200">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-amber-900">
                          Over kuota, berikan penjelasan
                        </div>
                        <div className="text-[11px] text-amber-700">
                          Pemakaian {stats.pemakaian} m³ mencapai / melampaui kuota shift (
                          {dw.shiftQuota} m³). Kolom ini wajib diisi!
                        </div>
                      </div>
                    </div>

                    <textarea
                      id={`textarea-keterangan-${dw.id.replace(' ', '')}`}
                      rows={2}
                      value={readings[dw.id]?.keteranganOver || ''}
                      onChange={(e) =>
                        handleInputChange(dw.id, 'keteranganOver', e.target.value)
                      }
                      placeholder="Contoh: Kenaikan beban pendinginan cooling tower / pencucian filter berkala..."
                      className="w-full text-xs p-2 bg-white border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error Notification */}
        {submitError && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 font-medium flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Mohon periksa kembali input Anda:</p>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        {/* VERIFICATION SECTION (As explicitly requested by user) */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 mt-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Verifikasi & Pernyataan Operator
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Pastikan angka meter awal dan meter akhir pada fisik meteran air di Plant 1 & Plant 2 sesuai dengan data yang Anda catat.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 mb-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="checkbox-operator-verify"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-sky-500 focus:ring-sky-400 focus:ring-offset-slate-900 border-slate-600 bg-slate-700"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-100 text-sm block">
                  "Apakah data yang Anda input sudah benar?"
                </span>
                <span className="text-slate-400 block mt-0.5">
                  Ya, saya (<strong className="text-slate-200">{operatorName || 'Operator'}</strong>) menyatakan bahwa data pembacaan meter Deepwell 1 s/d 6 untuk Shift {selectedShift} pada {reportDate} telah diperiksa dan sudah benar.
                </span>
              </div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Timestamp submit akan tercatat otomatis secara presisi saat tombol submit ditekan.
            </div>

            <button
              type="submit"
              id="btn-submit-shift-report"
              disabled={isSyncing || !isVerified}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md ${
                !isVerified || isSyncing
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/20 active:scale-[0.99]'
              }`}
            >
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan ke Sistem...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Laporan Shift {selectedShift}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
