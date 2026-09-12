import { ShiftReport, DeepwellId, MASTER_DEEPWELLS } from '../types';

const STORAGE_KEY = 'water_monitoring_reports_v1';
const SPREADSHEET_META_KEY = 'water_monitoring_sheet_meta';

export interface StoredSheetMeta {
  id: string;
  url: string;
}

export function getSavedSpreadsheetMeta(): StoredSheetMeta | null {
  try {
    const raw = localStorage.getItem(SPREADSHEET_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSpreadsheetMeta(meta: StoredSheetMeta | null): void {
  if (!meta) {
    localStorage.removeItem(SPREADSHEET_META_KEY);
  } else {
    localStorage.setItem(SPREADSHEET_META_KEY, JSON.stringify(meta));
  }
}

/**
 * Generates initial seed data for demo/testing across recent shifts
 */
function generateSeedReports(): ShiftReport[] {
  const reports: ShiftReport[] = [];
  const today = new Date();
  
  // Baseline initial meter values for DW 1 to DW 6
  const baseMeters: Record<DeepwellId, number> = {
    'DW 1': 45210.5,
    'DW 2': 38140.2,
    'DW 3': 52900.0,
    'DW 4': 12050.0,
    'DW 5': 18420.3,
    'DW 6': 84310.8,
  };

  // Generate 7 days of historical reports (Shift 1, 2, 3)
  for (let d = 6; d >= 0; d--) {
    const dateObj = new Date(today);
    dateObj.setDate(today.getDate() - d);
    const dateStr = dateObj.toISOString().split('T')[0];

    const shifts: (1 | 2 | 3)[] = d === 0 ? [1] : [1, 2, 3];

    for (const shift of shifts) {
      const readings = MASTER_DEEPWELLS.map((dw) => {
        const meterAwal = Number(baseMeters[dw.id].toFixed(1));
        let pemakaian = 0;
        let isOver = false;
        let keterangan = '';

        if (dw.id === 'DW 4') {
          // DW 4 has 0 quota. Occasionally 0 usage or small emergency usage
          pemakaian = (d === 2 && shift === 2) ? 14.5 : 0;
          isOver = pemakaian > 0;
          if (isOver) {
            keterangan = 'Pengoperasian darurat selama 30 menit pembersihan filter Plant 2.';
          }
        } else if (dw.id === 'DW 1' || dw.id === 'DW 2' || dw.id === 'DW 3') {
          // Quota is 83.33 m3/shift.
          const variance = (d === 1 && shift === 3 && dw.id === 'DW 1') ? 12 : (shift * 2 - 3);
          pemakaian = Number((72 + variance + Math.sin(d + shift) * 6).toFixed(1));
          if (pemakaian >= dw.shiftQuota) {
            isOver = true;
            keterangan = 'Kenaikan debit air untuk proses pencucian tanki utama Shift 3.';
          }
        } else if (dw.id === 'DW 5') {
          // Quota is 27.78 m3/shift
          pemakaian = Number((22 + (d % 3) * 3).toFixed(1));
          if (pemakaian >= dw.shiftQuota) {
            isOver = true;
            keterangan = 'Pengisian air utilitas domestik mess karyawan & kantin.';
          }
        } else if (dw.id === 'DW 6') {
          // Quota is 122.22 m3/shift
          const spike = (d === 3 && shift === 1) ? 25 : 0;
          pemakaian = Number((105 + spike + (shift === 1 ? 10 : 0)).toFixed(1));
          if (pemakaian >= dw.shiftQuota) {
            isOver = true;
            keterangan = 'Over kuota akibat penambahan beban pendinginan Cooling Tower unit 2.';
          }
        }

        const meterAkhir = Number((meterAwal + pemakaian).toFixed(1));
        baseMeters[dw.id] = meterAkhir; // advance meter

        const persenKuota = dw.shiftQuota > 0 ? (pemakaian / dw.shiftQuota) * 100 : (pemakaian > 0 ? 100 : 0);

        return {
          deepwellId: dw.id,
          meterAwal,
          meterAkhir,
          pemakaian,
          kuotaShift: dw.shiftQuota,
          persenKuota: Number(persenKuota.toFixed(1)),
          isOverQuota: isOver,
          keteranganOver: keterangan,
        };
      });

      const totalPemakaian = readings.reduce((acc, curr) => acc + curr.pemakaian, 0);
      const hasOverQuota = readings.some((r) => r.isOverQuota);

      reports.push({
        id: `REP-${dateStr.replace(/-/g, '')}-S${shift}`,
        timestamp: `${dateStr}T${shift === 1 ? '15:45:00' : shift === 2 ? '23:45:00' : '06:45:00'}.000Z`,
        submittedAt: `${dateStr} ${shift === 1 ? '15:45' : shift === 2 ? '23:45' : '06:45'} WIB`,
        date: dateStr,
        shift,
        plant: 'Semua Plant',
        operatorName: shift === 1 ? 'Budi Santoso' : shift === 2 ? 'Agus Setiawan' : 'Hendra Wijaya',
        readings,
        totalPemakaian: Number(totalPemakaian.toFixed(1)),
        hasOverQuota,
        verified: true,
        syncedToGoogleSheets: true,
      });
    }
  }

  return reports;
}

export function getReports(): ShiftReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = generateSeedReports();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading reports from localStorage:', err);
    return [];
  }
}

export function saveReport(newReport: ShiftReport): void {
  const existing = getReports();
  // Prepend new report
  const updated = [newReport, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function updateReport(reportId: string, updates: Partial<ShiftReport>): void {
  const existing = getReports();
  const index = existing.findIndex((r) => r.id === reportId);
  if (index !== -1) {
    existing[index] = { ...existing[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}

export function reviseReportInStorage(
  reportId: string,
  updatedReadings: ShiftReport['readings'],
  supervisorEmail: string,
  revisionReason: string
): ShiftReport | null {
  const existing = getReports();
  const index = existing.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const totalPemakaian = updatedReadings.reduce((acc, curr) => acc + curr.pemakaian, 0);
  const hasOverQuota = updatedReadings.some((r) => r.isOverQuota);

  const updated: ShiftReport = {
    ...existing[index],
    readings: updatedReadings,
    totalPemakaian: parseFloat(totalPemakaian.toFixed(2)),
    hasOverQuota,
    isRevised: true,
    revisedBy: supervisorEmail,
    revisedAt: new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    revisionReason: revisionReason.trim() || 'Perbaikan data pembacaan meter oleh Supervisor',
  };

  existing[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return updated;
}

/**
 * Returns the most recent meter akhir recorded for a specific deepwell.
 * Used to auto-populate Meter Awal for the next shift entry.
 */
export function getLatestMeterReading(deepwellId: DeepwellId): number | null {
  const reports = getReports();
  // Iterate from newest report to oldest
  for (const rep of reports) {
    const reading = rep.readings.find((r) => r.deepwellId === deepwellId);
    if (reading && reading.meterAkhir > 0) {
      return reading.meterAkhir;
    }
  }

  // Fallback defaults
  const defaults: Record<DeepwellId, number> = {
    'DW 1': 45210.5,
    'DW 2': 38140.2,
    'DW 3': 52900.0,
    'DW 4': 12050.0,
    'DW 5': 18420.3,
    'DW 6': 84310.8,
  };
  return defaults[deepwellId];
}

/**
 * Batch merges imported reports into existing storage.
 * If a report for the same date & shift already exists, it updates it.
 * Otherwise, it adds the new report.
 */
export function batchUpsertReports(importedReports: ShiftReport[]): ShiftReport[] {
  const existing = getReports();
  const map = new Map<string, ShiftReport>();

  // Load existing into map keyed by `${date}_S${shift}`
  existing.forEach((rep) => {
    map.set(`${rep.date}_S${rep.shift}`, rep);
  });

  // Upsert imported
  importedReports.forEach((imported) => {
    const key = `${imported.date}_S${imported.shift}`;
    const prev = map.get(key);
    if (prev) {
      // Merge readings: keep any existing readings that weren't in imported, override matching
      const mergedReadingsMap = new Map<DeepwellId, any>();
      prev.readings.forEach((r) => mergedReadingsMap.set(r.deepwellId, r));
      imported.readings.forEach((r) => mergedReadingsMap.set(r.deepwellId, r));

      const mergedReadings = Array.from(mergedReadingsMap.values());
      const totalPemakaian = mergedReadings.reduce((acc, curr) => acc + curr.pemakaian, 0);
      const hasOver = mergedReadings.some((r) => r.isOverQuota);

      map.set(key, {
        ...prev,
        readings: mergedReadings,
        totalPemakaian: Number(totalPemakaian.toFixed(1)),
        hasOverQuota: hasOver,
        operatorName: imported.operatorName || prev.operatorName,
      });
    } else {
      map.set(key, imported);
    }
  });

  // Sort descending by date & shift
  const combined = Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.shift - a.shift;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
  return combined;
}

/**
 * Replaces all reports in storage with a new set of reports.
 */
export function replaceAllReports(newReports: ShiftReport[]): ShiftReport[] {
  const sorted = [...newReports].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.shift - a.shift;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  return sorted;
}
