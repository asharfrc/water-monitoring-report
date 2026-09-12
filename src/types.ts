export type PlantId = 'Plant 1' | 'Plant 2';
export type ShiftNumber = 1 | 2 | 3;
export type DeepwellId = 'DW 1' | 'DW 2' | 'DW 3' | 'DW 4' | 'DW 5' | 'DW 6';

export interface DeepwellConfig {
  id: DeepwellId;
  name: string;
  plant: PlantId;
  monthlyQuota: number; // m3/month (30 days)
  dailyQuota: number;   // m3/day (monthly / 30)
  shiftQuota: number;   // m3/shift (daily / 3)
  description?: string;
}

export const MASTER_DEEPWELLS: DeepwellConfig[] = [
  {
    id: 'DW 1',
    name: 'Deepwell 1',
    plant: 'Plant 1',
    monthlyQuota: 7500,
    dailyQuota: 250,
    shiftQuota: 83.33,
    description: 'Plant 1 Utilitas Utama',
  },
  {
    id: 'DW 2',
    name: 'Deepwell 2',
    plant: 'Plant 1',
    monthlyQuota: 7500,
    dailyQuota: 250,
    shiftQuota: 83.33,
    description: 'Plant 1 Cadangan & Proses',
  },
  {
    id: 'DW 3',
    name: 'Deepwell 3',
    plant: 'Plant 2',
    monthlyQuota: 7500,
    dailyQuota: 250,
    shiftQuota: 83.33,
    description: 'Plant 2 Produksi Utama',
  },
  {
    id: 'DW 4',
    name: 'Deepwell 4',
    plant: 'Plant 2',
    monthlyQuota: 0,
    dailyQuota: 0,
    shiftQuota: 0,
    description: 'Plant 2 Standby / Kuota 0 m³',
  },
  {
    id: 'DW 5',
    name: 'Deepwell 5',
    plant: 'Plant 2',
    monthlyQuota: 2500,
    dailyQuota: 83.33,
    shiftQuota: 27.78,
    description: 'Plant 2 Domestik & Fasilitas',
  },
  {
    id: 'DW 6',
    name: 'Deepwell 6',
    plant: 'Plant 2',
    monthlyQuota: 11000,
    dailyQuota: 366.67,
    shiftQuota: 122.22,
    description: 'Plant 2 Boiler & Cooling Tower',
  },
];

export type AppRole = 'operator_plant1' | 'operator_plant2' | 'supervisor';

export const PLANT1_DEEPWELLS: DeepwellId[] = ['DW 1', 'DW 2'];
export const PLANT2_DEEPWELLS: DeepwellId[] = ['DW 3', 'DW 4', 'DW 5', 'DW 6'];

export interface DeepwellReadingInput {
  deepwellId: DeepwellId;
  meterAwal: number;
  meterAkhir: number;
  pemakaian: number;
  kuotaShift: number;
  persenKuota: number;
  isOverQuota: boolean;
  keteranganOver: string;
}

export interface ShiftReport {
  id: string;
  timestamp: string; // ISO string
  submittedAt: string; // Formatted datetime string
  date: string; // YYYY-MM-DD
  shift: ShiftNumber;
  plant: PlantId | 'Semua Plant';
  operatorName: string;
  operatorEmail?: string;
  readings: DeepwellReadingInput[];
  totalPemakaian: number;
  hasOverQuota: boolean;
  verified: boolean;
  syncedToGoogleSheets?: boolean;
  syncedAt?: string;
  // Revision tracking (Only Supervisor can revise)
  isRevised?: boolean;
  revisedBy?: string;
  revisedAt?: string;
  revisionReason?: string;
}

export interface GoogleDriveStatus {
  connected: boolean;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetName: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  error: string | null;
}

export interface ShiftScheduleItem {
  shift: ShiftNumber;
  label: string;
  hours: string;
  shortHours: string;
  startHour: number;
  endHour: number;
}

export const SHIFT_SCHEDULES: ShiftScheduleItem[] = [
  {
    shift: 1,
    label: 'Shift 1',
    hours: '07:00 - 16:00',
    shortHours: '07-16',
    startHour: 7,
    endHour: 16,
  },
  {
    shift: 2,
    label: 'Shift 2',
    hours: '16:00 - 24:00',
    shortHours: '16-24',
    startHour: 16,
    endHour: 24,
  },
  {
    shift: 3,
    label: 'Shift 3',
    hours: '24:00 - 07:00',
    shortHours: '24-07',
    startHour: 0,
    endHour: 7,
  },
];

export function getShiftByCurrentTime(): ShiftNumber {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 16) {
    return 1;
  } else if (hour >= 16 && hour < 24) {
    return 2;
  } else {
    // 00:00 - 06:59:59 (24:00 - 07:00)
    return 3;
  }
}

export function getShiftHoursLabel(shift: ShiftNumber): string {
  switch (shift) {
    case 1:
      return '07:00 - 16:00';
    case 2:
      return '16:00 - 24:00';
    case 3:
      return '24:00 - 07:00';
    default:
      return '';
  }
}
