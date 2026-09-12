import * as XLSX from 'xlsx';
import {
  ShiftReport,
  DeepwellReadingInput,
  DeepwellId,
  MASTER_DEEPWELLS,
  ShiftNumber,
} from '../types';

export interface ImportPreviewResult {
  fileName: string;
  totalRawRows: number;
  validReadingsCount: number;
  reports: ShiftReport[];
  startDate: string;
  endDate: string;
  deepwellsFound: DeepwellId[];
  totalPemakaian: number;
  overQuotaCount: number;
  warnings: string[];
}

/**
 * Normalizes deepwell identifier string into 'DW 1' .. 'DW 6'
 */
function normalizeDeepwellId(raw: string | number): DeepwellId | null {
  if (!raw) return null;
  const str = String(raw).toUpperCase().trim();
  
  if (str === 'DW 1' || str === 'DW1' || str === 'DEEPWELL 1' || str === 'DEEPWELL1' || str === 'SUMUR 1') return 'DW 1';
  if (str === 'DW 2' || str === 'DW2' || str === 'DEEPWELL 2' || str === 'DEEPWELL2' || str === 'SUMUR 2') return 'DW 2';
  if (str === 'DW 3' || str === 'DW3' || str === 'DEEPWELL 3' || str === 'DEEPWELL3' || str === 'SUMUR 3') return 'DW 3';
  if (str === 'DW 4' || str === 'DW4' || str === 'DEEPWELL 4' || str === 'DEEPWELL4' || str === 'SUMUR 4') return 'DW 4';
  if (str === 'DW 5' || str === 'DW5' || str === 'DEEPWELL 5' || str === 'DEEPWELL5' || str === 'SUMUR 5') return 'DW 5';
  if (str === 'DW 6' || str === 'DW6' || str === 'DEEPWELL 6' || str === 'DEEPWELL6' || str === 'SUMUR 6') return 'DW 6';
  
  // Try pattern matching
  const match = str.match(/(?:DW|DEEPWELL|SUMUR)\s*([1-6])/i);
  if (match && match[1]) {
    return `DW ${match[1]}` as DeepwellId;
  }
  
  return null;
}

/**
 * Parses dates from Excel serial numbers, ISO strings, or DD/MM/YYYY
 */
function parseExcelDate(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;

  // If already a JS Date
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }

  // If Excel serial number (e.g. 45292 for 2024-01-01)
  if (typeof val === 'number') {
    // Excel epoch offset
    const dateObj = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().slice(0, 10);
    }
  }

  const str = String(val).trim();

  // Pattern YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Pattern DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback standard parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Normalizes shift number from 1, 2, 3 or 'Shift 1', 'S1'
 */
function parseShiftNumber(val: any): ShiftNumber | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === '1' || /shift\s*1/i.test(str) || /s1/i.test(str)) return 1;
  if (str === '2' || /shift\s*2/i.test(str) || /s2/i.test(str)) return 2;
  if (str === '3' || /shift\s*3/i.test(str) || /s3/i.test(str)) return 3;
  return null;
}

/**
 * Parses numeric meter values
 */
function parseNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim().replace(/\s/g, '');
  // If format is Indonesian "1.234,56", convert dots to empty and comma to dot
  if (/\.\d{3}/.test(str) && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses an Excel file buffer or ArrayBuffer into structured ShiftReports
 */
export async function parseWaterUsageExcel(file: File): Promise<ImportPreviewResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  // Use the first sheet or find one named with Laporan / Data
  const sheetName =
    workbook.SheetNames.find((s) => /laporan|data|air|deepwell|shift/i.test(s)) ||
    workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Tidak ditemukan sheet yang valid dalam file ${file.name}.`);
  }

  // Convert to array of objects
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new Error(`Sheet "${sheetName}" kosong atau tidak memiliki baris data.`);
  }

  const warnings: string[] = [];
  const deepwellsFoundSet = new Set<DeepwellId>();

  // Group readings by date + shift: Map<`${date}_S${shift}`, { date, shift, operator, readings: Map<DeepwellId, DeepwellReadingInput> }>
  interface GroupedShift {
    date: string;
    shift: ShiftNumber;
    operatorName: string;
    readings: Map<DeepwellId, DeepwellReadingInput>;
  }

  const shiftGroups = new Map<string, GroupedShift>();

  // Helper to find column key by regex
  const findColKey = (row: any, pattern: RegExp): string | undefined => {
    return Object.keys(row).find((k) => pattern.test(k.trim()));
  };

  // Inspect first row to determine if row-by-row or matrix format
  const firstRow = rawRows[0];
  const dateKey = findColKey(firstRow, /tanggal|date|tgl/i);
  const shiftKey = findColKey(firstRow, /shift/i);
  const deepwellKey = findColKey(firstRow, /deepwell|sumur|dw\s*id|dw/i);

  let validRowsCount = 0;

  // Process rows
  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-based + 1 for header
    const rawDate = dateKey ? row[dateKey] : row['Tanggal'] || row['Date'];
    const parsedDate = parseExcelDate(rawDate);

    if (!parsedDate) {
      // Ignore completely empty rows silently
      const hasAnyVal = Object.values(row).some((v) => v !== '' && v !== null);
      if (hasAnyVal) {
        warnings.push(`Baris ${rowNum}: Format tanggal "${rawDate}" tidak dikenali, baris dilewati.`);
      }
      return;
    }

    const rawShift = shiftKey ? row[shiftKey] : row['Shift'];
    const parsedShift = parseShiftNumber(rawShift) || 1;

    const opKey = findColKey(row, /operator|petugas|nama/i);
    const operatorName = (opKey ? String(row[opKey]) : '') || 'Operator Import';

    const groupKey = `${parsedDate}_S${parsedShift}`;
    if (!shiftGroups.has(groupKey)) {
      shiftGroups.set(groupKey, {
        date: parsedDate,
        shift: parsedShift,
        operatorName,
        readings: new Map(),
      });
    }
    const currentGroup = shiftGroups.get(groupKey)!;

    // Check if row has deepwell specified in a column (Row-per-reading layout)
    const rawDw = deepwellKey ? row[deepwellKey] : null;
    const normalizedDw = rawDw ? normalizeDeepwellId(rawDw) : null;

    if (normalizedDw) {
      // Row-by-row layout
      const meterAwalKey = findColKey(row, /meter\s*awal|awal|m_awal/i);
      const meterAkhirKey = findColKey(row, /meter\s*akhir|akhir|m_akhir/i);
      const pemakaianKey = findColKey(row, /pemakaian|volume|debit|kubik|m3|m³/i);
      const ketKey = findColKey(row, /keterangan|catatan|alasan/i);

      let meterAwal = meterAwalKey ? parseNumber(row[meterAwalKey]) : 0;
      let meterAkhir = meterAkhirKey ? parseNumber(row[meterAkhirKey]) : 0;
      let pemakaian = pemakaianKey ? parseNumber(row[pemakaianKey]) : 0;

      if (pemakaian === 0 && meterAkhir > meterAwal) {
        pemakaian = Number((meterAkhir - meterAwal).toFixed(1));
      } else if (meterAkhir === 0 && meterAwal > 0 && pemakaian > 0) {
        meterAkhir = Number((meterAwal + pemakaian).toFixed(1));
      }

      const dwConfig = MASTER_DEEPWELLS.find((d) => d.id === normalizedDw);
      const shiftQuota = dwConfig ? dwConfig.shiftQuota : 83.33;
      const isOverQuota = shiftQuota > 0 ? pemakaian >= shiftQuota : pemakaian > 0;
      const persenKuota = shiftQuota > 0 ? (pemakaian / shiftQuota) * 100 : pemakaian > 0 ? 100 : 0;
      const keteranganOver = ketKey ? String(row[ketKey] || '').trim() : '';

      currentGroup.readings.set(normalizedDw, {
        deepwellId: normalizedDw,
        meterAwal,
        meterAkhir,
        pemakaian,
        kuotaShift: shiftQuota,
        persenKuota,
        isOverQuota,
        keteranganOver,
      });

      deepwellsFoundSet.add(normalizedDw);
      validRowsCount += 1;
    } else {
      // Check for Matrix Layout (where each DW has its own columns, e.g. "DW 1", "DW 2" or "DW 1 Akhir")
      MASTER_DEEPWELLS.forEach((dw) => {
        // Try finding columns for this dw
        const dwPatternAwal = new RegExp(`(${dw.id}|${dw.id.replace(' ', '')}).*(awal)`, 'i');
        const dwPatternAkhir = new RegExp(`(${dw.id}|${dw.id.replace(' ', '')}).*(akhir)`, 'i');
        const dwPatternUsage = new RegExp(`^(${dw.id}|${dw.id.replace(' ', '')})$`, 'i');

        const colAwal = findColKey(row, dwPatternAwal);
        const colAkhir = findColKey(row, dwPatternAkhir);
        const colUsage = findColKey(row, dwPatternUsage);

        if (colAwal || colAkhir || colUsage) {
          let meterAwal = colAwal ? parseNumber(row[colAwal]) : 0;
          let meterAkhir = colAkhir ? parseNumber(row[colAkhir]) : 0;
          let pemakaian = colUsage ? parseNumber(row[colUsage]) : 0;

          if (pemakaian === 0 && meterAkhir > meterAwal) {
            pemakaian = Number((meterAkhir - meterAwal).toFixed(1));
          } else if (meterAkhir === 0 && meterAwal > 0 && pemakaian > 0) {
            meterAkhir = Number((meterAwal + pemakaian).toFixed(1));
          }

          const shiftQuota = dw.shiftQuota;
          const isOverQuota = shiftQuota > 0 ? pemakaian >= shiftQuota : pemakaian > 0;
          const persenKuota = shiftQuota > 0 ? (pemakaian / shiftQuota) * 100 : pemakaian > 0 ? 100 : 0;

          currentGroup.readings.set(dw.id, {
            deepwellId: dw.id,
            meterAwal,
            meterAkhir,
            pemakaian,
            kuotaShift: shiftQuota,
            persenKuota,
            isOverQuota,
            keteranganOver: '',
          });

          deepwellsFoundSet.add(dw.id);
          validRowsCount += 1;
        }
      });
    }
  });

  if (shiftGroups.size === 0 || validRowsCount === 0) {
    throw new Error(
      'Gagal memproses baris data. Pastikan file Excel memiliki kolom Tanggal, Shift, Deepwell, dan Meter Awal/Akhir.'
    );
  }

  // Convert shiftGroups to final ShiftReport array
  const finalReports: ShiftReport[] = [];
  let totalUsageAll = 0;
  let overQuotaCountAll = 0;
  const dates: string[] = [];

  shiftGroups.forEach((group, key) => {
    dates.push(group.date);
    const readingsArray = Array.from(group.readings.values());
    let repUsage = 0;
    let hasOver = false;

    readingsArray.forEach((r) => {
      repUsage += r.pemakaian;
      totalUsageAll += r.pemakaian;
      if (r.isOverQuota) {
        hasOver = true;
        overQuotaCountAll += 1;
      }
    });

    const repId = `REP-${group.date.replace(/-/g, '')}-S${group.shift}`;
    const submitTime =
      group.shift === 1 ? '15:45' : group.shift === 2 ? '23:45' : '06:45';

    finalReports.push({
      id: repId,
      timestamp: `${group.date}T${submitTime}:00.000Z`,
      submittedAt: `${group.date} ${submitTime} WIB (Import Excel)`,
      date: group.date,
      shift: group.shift,
      plant: 'Semua Plant',
      operatorName: group.operatorName,
      readings: readingsArray,
      totalPemakaian: Number(repUsage.toFixed(1)),
      hasOverQuota: hasOver,
      verified: true,
      syncedToGoogleSheets: false,
    });
  });

  // Sort chronological
  finalReports.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.shift - b.shift;
  });

  dates.sort();
  const startDate = dates[0] || '';
  const endDate = dates[dates.length - 1] || '';

  return {
    fileName: file.name,
    totalRawRows: rawRows.length,
    validReadingsCount: validRowsCount,
    reports: finalReports,
    startDate,
    endDate,
    deepwellsFound: Array.from(deepwellsFoundSet).sort(),
    totalPemakaian: Number(totalUsageAll.toFixed(1)),
    overQuotaCount: overQuotaCountAll,
    warnings: warnings.slice(0, 10), // Return max 10 warnings
  };
}
