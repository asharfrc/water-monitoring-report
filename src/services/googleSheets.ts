import { ShiftReport, MASTER_DEEPWELLS } from '../types';

const SPREADSHEET_TITLE = 'Water_Monitoring_System - Plant 1 & Plant 2';

export interface SyncResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  rowsAdded?: number;
  message?: string;
}

/**
 * Searches Google Drive for an existing spreadsheet with title SPREADSHEET_TITLE
 */
export async function findExistingSpreadsheet(accessToken: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(
      `name = '${SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      console.warn('Could not query Google Drive files:', res.statusText);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error('Error finding spreadsheet in Google Drive:', err);
    return null;
  }
}

/**
 * Creates the Water Monitoring spreadsheet in Google Drive with initial schema and master deepwell data
 */
export async function createMonitoringSpreadsheet(
  accessToken: string
): Promise<{ id: string; url: string }> {
  // 1. Create spreadsheet with two sheets
  const body = {
    properties: {
      title: SPREADSHEET_TITLE,
    },
    sheets: [
      {
        properties: {
          title: 'Laporan_Harian',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Master_Deepwell',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errorDetails = await createRes.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${errorDetails}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Initialize Headers and Master Deepwell data
  const laporanHeaders = [
    [
      'ID Laporan',
      'Timestamp Submit',
      'Tanggal',
      'Shift',
      'Plant',
      'Deepwell',
      'Meter Awal (m³)',
      'Meter Akhir (m³)',
      'Pemakaian (m³)',
      'Kuota Shift (m³)',
      'Persen Kuota (%)',
      'Status Kuota',
      'Keterangan Over Kuota',
      'Operator',
      'Email Operator (Google)',
      'Status Verifikasi',
    ],
  ];

  const masterRows = [
    [
      'Deepwell',
      'Plant',
      'Kuota Bulanan (m³/bln)',
      'Kuota Harian (m³/hari)',
      'Kuota Shift (m³/shift)',
      'Deskripsi / Catatan',
    ],
    ...MASTER_DEEPWELLS.map((dw) => [
      dw.id,
      dw.plant,
      dw.monthlyQuota,
      dw.dailyQuota,
      dw.shiftQuota,
      dw.description || '',
    ]),
  ];

  // Write headers to Laporan_Harian
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Laporan_Harian!A1:O1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: laporanHeaders }),
    }
  );

  // Write Master_Deepwell table
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Master_Deepwell!A1:F7?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: masterRows }),
    }
  );

  return { id: spreadsheetId, url: spreadsheetUrl };
}

/**
 * Appends shift report readings to the Laporan_Harian sheet
 */
export async function appendReportToSheet(
  accessToken: string,
  spreadsheetId: string,
  report: ShiftReport
): Promise<SyncResult> {
  try {
    const rows = report.readings.map((reading) => {
      const isOver = reading.isOverQuota;
      return [
        report.id,
        report.submittedAt,
        report.date,
        `Shift ${report.shift}`,
        MASTER_DEEPWELLS.find((d) => d.id === reading.deepwellId)?.plant || '',
        reading.deepwellId,
        reading.meterAwal,
        reading.meterAkhir,
        reading.pemakaian,
        reading.kuotaShift,
        `${reading.persenKuota.toFixed(1)}%`,
        isOver ? 'OVER KUOTA' : 'NORMAL',
        reading.keteranganOver || '-',
        report.operatorName,
        report.operatorEmail || '-',
        report.verified ? 'Terverifikasi Operator' : 'Belum Terverifikasi',
      ];
    });

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Laporan_Harian!A:O:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gagal menyimpan ke Google Sheets: ${err}`);
    }

    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      rowsAdded: rows.length,
      message: `${rows.length} baris data berhasil disinkronkan ke Google Sheets!`,
    };
  } catch (error: unknown) {
    console.error('Error appending report to Google Sheets:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
}

/**
 * Loads or ensures the monitoring spreadsheet exists, returning its ID and URL
 */
export async function getOrCreateSpreadsheet(
  accessToken: string,
  storedId?: string | null
): Promise<{ id: string; url: string }> {
  // If we already have a saved ID, verify it exists and is accessible
  if (storedId) {
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${storedId}?fields=spreadsheetId,properties.title`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (res.ok) {
        return {
          id: storedId,
          url: `https://docs.google.com/spreadsheets/d/${storedId}/edit`,
        };
      }
    } catch {
      // Fall through to search/create
    }
  }

  // Look in Google Drive
  const existingId = await findExistingSpreadsheet(accessToken);
  if (existingId) {
    return {
      id: existingId,
      url: `https://docs.google.com/spreadsheets/d/${existingId}/edit`,
    };
  }

  // Create new
  return await createMonitoringSpreadsheet(accessToken);
}
