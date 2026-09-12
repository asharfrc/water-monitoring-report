import * as XLSX from 'xlsx';
import { ShiftReport, MASTER_DEEPWELLS, getShiftHoursLabel } from '../types';

export function exportReportsToExcel(
  reports: ShiftReport[],
  filenamePrefix: string = 'Laporan_Penggunaan_Air_Deepwell'
): void {
  const wb = XLSX.utils.book_new();

  // 1. Detailed Readings Sheet
  const detailedRows: any[] = [];
  reports.forEach((rep) => {
    rep.readings.forEach((r) => {
      const dwConfig = MASTER_DEEPWELLS.find((d) => d.id === r.deepwellId);
      detailedRows.push({
        'ID Laporan': rep.id,
        'Tanggal': rep.date,
        'Shift': `Shift ${rep.shift}`,
        'Jam Kerja': getShiftHoursLabel(rep.shift),
        'Plant': dwConfig?.plant || rep.plant,
        'Deepwell ID': r.deepwellId,
        'Nama Deepwell': dwConfig?.name || r.deepwellId,
        'Meter Awal (m³)': r.meterAwal,
        'Meter Akhir (m³)': r.meterAkhir,
        'Pemakaian (m³)': r.pemakaian,
        'Kuota Shift (m³)': r.kuotaShift,
        '% Kuota': Number(r.persenKuota.toFixed(1)),
        'Status': r.isOverQuota ? 'OVER KUOTA' : 'Normal',
        'Keterangan / Alasan Over': r.keteranganOver || '-',
        'Operator': rep.operatorName,
        'Waktu Submit': rep.submittedAt,
        'Status Revisi': rep.isRevised ? `Direvisi (${rep.revisedBy})` : 'Asli',
        'Alasan Revisi': rep.revisionReason || '-',
      });
    });
  });

  const wsDetailed = XLSX.utils.json_to_sheet(detailedRows);
  // Auto-fit column widths
  const colWidths = [
    { wch: 22 }, // ID Laporan
    { wch: 12 }, // Tanggal
    { wch: 10 }, // Shift
    { wch: 16 }, // Jam Kerja
    { wch: 10 }, // Plant
    { wch: 12 }, // Deepwell ID
    { wch: 16 }, // Nama Deepwell
    { wch: 15 }, // Meter Awal
    { wch: 15 }, // Meter Akhir
    { wch: 15 }, // Pemakaian
    { wch: 15 }, // Kuota Shift
    { wch: 10 }, // % Kuota
    { wch: 14 }, // Status
    { wch: 30 }, // Keterangan
    { wch: 18 }, // Operator
    { wch: 20 }, // Waktu Submit
    { wch: 16 }, // Status Revisi
    { wch: 25 }, // Alasan Revisi
  ];
  wsDetailed['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, wsDetailed, 'Detail_Penggunaan_Air');

  // 2. Summary per Deepwell Sheet
  const dwSummaryMap: Record<
    string,
    {
      plant: string;
      name: string;
      totalUsage: number;
      shiftCount: number;
      overCount: number;
      monthlyQuota: number;
    }
  > = {};

  MASTER_DEEPWELLS.forEach((dw) => {
    dwSummaryMap[dw.id] = {
      plant: dw.plant,
      name: dw.name,
      totalUsage: 0,
      shiftCount: 0,
      overCount: 0,
      monthlyQuota: dw.monthlyQuota,
    };
  });

  reports.forEach((rep) => {
    rep.readings.forEach((r) => {
      if (dwSummaryMap[r.deepwellId]) {
        dwSummaryMap[r.deepwellId].totalUsage += r.pemakaian;
        dwSummaryMap[r.deepwellId].shiftCount += 1;
        if (r.isOverQuota) dwSummaryMap[r.deepwellId].overCount += 1;
      }
    });
  });

  const summaryRows = MASTER_DEEPWELLS.map((dw) => {
    const stats = dwSummaryMap[dw.id];
    const avgUsage = stats.shiftCount > 0 ? stats.totalUsage / stats.shiftCount : 0;
    return {
      'Deepwell ID': dw.id,
      'Nama Deepwell': dw.name,
      'Lokasi': dw.plant,
      'Total Pemakaian (m³)': Number(stats.totalUsage.toFixed(1)),
      'Jumlah Shift Terdata': stats.shiftCount,
      'Rata-rata / Shift (m³)': Number(avgUsage.toFixed(1)),
      'Kuota Shift Acuan (m³)': dw.shiftQuota,
      'Total Kuota Bulanan (m³)': dw.monthlyQuota,
      'Frekuensi Over Kuota': stats.overCount,
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Deepwell');

  // 3. Master Deepwell Config Sheet
  const masterRows = MASTER_DEEPWELLS.map((dw) => ({
    'ID Deepwell': dw.id,
    'Nama': dw.name,
    'Plant': dw.plant,
    'Kuota Bulanan (m³)': dw.monthlyQuota,
    'Kuota Harian (m³)': dw.dailyQuota,
    'Kuota Shift (m³)': dw.shiftQuota,
    'Deskripsi': dw.description || '',
  }));
  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  wsMaster['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Master_Deepwell');

  const todayStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${todayStr}.xlsx`);
}

/**
 * Downloads a pre-formatted Excel template for importing historical data.
 */
export function downloadImportExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Template 1: Format Baris per Deepwell (Sangat Disarankan)
  const templateRows = [
    {
      'Tanggal (YYYY-MM-DD)': '2026-01-01',
      'Shift (1/2/3)': 1,
      'Deepwell (DW 1 - DW 6)': 'DW 1',
      'Meter Awal': 12500,
      'Meter Akhir': 12575,
      'Pemakaian (Opsional)': 75,
      'Operator': 'Budi Santoso',
      'Keterangan Over (Jika ada)': '',
    },
    {
      'Tanggal (YYYY-MM-DD)': '2026-01-01',
      'Shift (1/2/3)': 1,
      'Deepwell (DW 1 - DW 6)': 'DW 2',
      'Meter Awal': 8400,
      'Meter Akhir': 8460,
      'Pemakaian (Opsional)': 60,
      'Operator': 'Budi Santoso',
      'Keterangan Over (Jika ada)': '',
    },
    {
      'Tanggal (YYYY-MM-DD)': '2026-01-01',
      'Shift (1/2/3)': 1,
      'Deepwell (DW 1 - DW 6)': 'DW 3',
      'Meter Awal': 15200,
      'Meter Akhir': 15280,
      'Pemakaian (Opsional)': 80,
      'Operator': 'Ahmad Fauzi',
      'Keterangan Over (Jika ada)': '',
    },
    {
      'Tanggal (YYYY-MM-DD)': '2026-01-01',
      'Shift (1/2/3)': 1,
      'Deepwell (DW 1 - DW 6)': 'DW 4',
      'Meter Awal': 500,
      'Meter Akhir': 500,
      'Pemakaian (Opsional)': 0,
      'Operator': 'Ahmad Fauzi',
      'Keterangan Over (Jika ada)': 'Standby',
    },
    {
      'Tanggal (YYYY-MM-DD)': '2026-01-01',
      'Shift (1/2/3)': 1,
      'Deepwell (DW 1 - DW 6)': 'DW 5',
      'Meter Awal': 3100,
      'Meter Akhir': 3125,
      'Pemakaian (Opsional)': 25,
      'Operator': 'Ahmad Fauzi',
      'Keterangan Over (Jika ada)': '',
    },
    {
      'Tanggal (YYYY-MM-DD)': '2026-01-01',
      'Shift (1/2/3)': 1,
      'Deepwell (DW 1 - DW 6)': 'DW 6',
      'Meter Awal': 21400,
      'Meter Akhir': 21515,
      'Pemakaian (Opsional)': 115,
      'Operator': 'Ahmad Fauzi',
      'Keterangan Over (Jika ada)': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateRows);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Import_Air');

  // Panduan Pengisian Sheet
  const guideRows = [
    {
      'Kolom': 'Tanggal',
      'Aturan': 'Format YYYY-MM-DD (contoh: 2026-01-01) atau format tanggal Excel standar.',
    },
    {
      'Kolom': 'Shift',
      'Aturan': 'Angka 1, 2, atau 3 (Shift 1: 07-16, Shift 2: 16-24, Shift 3: 24-07).',
    },
    {
      'Kolom': 'Deepwell',
      'Aturan': 'Gunakan kode sumur: DW 1, DW 2, DW 3, DW 4, DW 5, atau DW 6.',
    },
    {
      'Kolom': 'Meter Awal & Meter Akhir',
      'Aturan': 'Angka meteran air dalam m³. Sistem otomatis menghitung selisih Pemakaian.',
    },
    {
      'Kolom': 'Operator',
      'Aturan': 'Nama operator atau petugas pelapor shift.',
    },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 25 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk_Pengisian');

  XLSX.writeFile(wb, 'Template_Import_Data_Deepwell_2026.xlsx');
}
