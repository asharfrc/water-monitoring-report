import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Droplets,
  HardHat,
  ArrowRight,
  RefreshCw,
  FileDown,
  Info,
} from 'lucide-react';
import { ShiftReport, DeepwellId } from '../types';
import { parseWaterUsageExcel, ImportPreviewResult } from '../services/excelImport';
import { exportReportsToExcel, downloadImportExcelTemplate } from '../services/excelExport';
import { exportReportsToPdf } from '../services/pdfExport';
import { batchUpsertReports, replaceAllReports } from '../services/storage';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ShiftReport[];
  filteredReports: ShiftReport[];
  onReportsUpdated: (updatedReports: ShiftReport[]) => void;
  initialTab?: 'import' | 'export';
  activeFilterInfo?: {
    timeframe?: string;
    dateLabel?: string;
    shiftLabel?: string;
    supervisorName?: string;
  };
}

export function ImportExportModal({
  isOpen,
  onClose,
  reports,
  filteredReports,
  onReportsUpdated,
  initialTab = 'import',
  activeFilterInfo,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setImportError(null);
      setImportSuccessMsg(null);
      setPreviewData(null);
    }
  }, [isOpen, initialTab]);
  
  // Import State
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null);
  const [importMode, setImportMode] = useState<'upsert' | 'replace'>('upsert');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export State
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const targetExportReports = exportScope === 'filtered' ? filteredReports : reports;

  const handleFileSelect = async (file: File) => {
    setImportError(null);
    setImportSuccessMsg(null);
    setPreviewData(null);

    // Only allow Excel files
    const validExtensions = ['.xlsx', '.xls'];
    const fileNameLower = file.name.toLowerCase();
    const isExcel = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!isExcel) {
      setImportError('Format file tidak didukung. Harap unggah file Excel (.xlsx atau .xls).');
      return;
    }

    setIsProcessingFile(true);
    try {
      const result = await parseWaterUsageExcel(file);
      setPreviewData(result);
    } catch (err: any) {
      setImportError(err.message || 'Gagal memproses file Excel. Pastikan format tabel sesuai.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = () => {
    if (!previewData) return;

    try {
      let updated: ShiftReport[];
      if (importMode === 'replace') {
        updated = replaceAllReports(previewData.reports);
      } else {
        updated = batchUpsertReports(previewData.reports);
      }

      onReportsUpdated(updated);
      setImportSuccessMsg(
        `Sukses mengimpor ${previewData.reports.length} laporan shift (${previewData.startDate} s/d ${previewData.endDate}) ke database aplikasi.`
      );
      setPreviewData(null);
    } catch (err: any) {
      setImportError(err.message || 'Gagal menyimpan data ke database lokal.');
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportReportsToExcel(
        targetExportReports,
        `Laporan_Air_Deepwell_${exportScope === 'filtered' ? 'Filter' : 'Semua'}`
      );
    } catch (err: any) {
      alert('Gagal mengekspor Excel: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      exportReportsToPdf(targetExportReports, activeFilterInfo);
    } catch (err: any) {
      alert('Gagal mengekspor PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kelola Data: Import & Export
              </h2>
              <p className="text-xs text-slate-500">
                Import histori dari Excel (.xlsx) atau Export laporan resmi (Excel & PDF)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            id="tab-import-excel-btn"
            onClick={() => {
              setActiveTab('import');
              setImportError(null);
              setImportSuccessMsg(null);
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'import'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import Excel (.xlsx)
          </button>
          <button
            id="tab-export-btn"
            onClick={() => {
              setActiveTab('export');
              setImportError(null);
              setImportSuccessMsg(null);
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'export'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Laporan (Excel & PDF)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Info & Template Banner */}
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-900">
                <div>
                  <p className="font-semibold flex items-center gap-1.5 text-sky-950 mb-0.5">
                    <Info className="w-4 h-4 text-sky-600 shrink-0" />
                    Format File Excel (.xlsx)
                  </p>
                  <p className="text-sky-800">
                    Mendukung format baris histori (Tanggal, Shift, Deepwell, Meter Awal, Meter Akhir) dari 1 Jan 2026 hingga kemarin.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-download-excel-template"
                  onClick={downloadImportExcelTemplate}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-sky-300 text-sky-700 font-semibold rounded-lg hover:bg-sky-100 hover:border-sky-400 transition shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Unduh Template Excel
                </button>
              </div>

              {/* Success Notification */}
              {importSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-950">Import Berhasil Disimpan!</p>
                    <p className="mt-0.5">{importSuccessMsg}</p>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {importError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-950">Gagal Memproses Excel</p>
                    <p className="mt-0.5">{importError}</p>
                  </div>
                </div>
              )}

              {/* Dropzone */}
              {!previewData && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    isDragging
                      ? 'border-sky-500 bg-sky-50/70'
                      : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
                    {isProcessingFile ? (
                      <RefreshCw className="w-7 h-7 animate-spin" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    {isProcessingFile ? 'Membaca dan Memvalidasi Data Excel...' : 'Pilih File Excel (.xlsx / .xls)'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Tarik dan lepaskan file Excel Anda di sini, atau klik untuk memilih file dari komputer Anda.
                  </p>
                  <span className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600 shadow-2xs">
                    Hanya file Excel (.xlsx / .xls)
                  </span>
                </div>
              )}

              {/* Preview Result */}
              {previewData && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                        <span className="text-xs font-bold text-slate-800">
                          {previewData.fileName}
                        </span>
                      </div>
                      <button
                        onClick={() => setPreviewData(null)}
                        className="text-xs text-slate-500 hover:text-slate-800 underline"
                      >
                        Ganti File
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block text-[11px]">Rentang Tanggal</span>
                        <strong className="text-slate-900 block mt-0.5 truncate">
                          {previewData.startDate} s/d {previewData.endDate}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block text-[11px]">Laporan Shift</span>
                        <strong className="text-slate-900 block mt-0.5">
                          {previewData.reports.length} Shift
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block text-[11px]">Total Pemakaian</span>
                        <strong className="text-sky-700 block mt-0.5">
                          {previewData.totalPemakaian.toLocaleString('id-ID')} m³
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block text-[11px]">Deepwell Ditemukan</span>
                        <strong className="text-slate-900 block mt-0.5">
                          {previewData.deepwellsFound.join(', ')}
                        </strong>
                      </div>
                    </div>

                    {previewData.warnings.length > 0 && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Catatan Pemeriksaan Data ({previewData.warnings.length}):
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                          {previewData.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Metode Penyimpanan Data:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          importMode === 'upsert'
                            ? 'bg-sky-50 border-sky-400 text-sky-950 ring-1 ring-sky-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="upsert"
                          checked={importMode === 'upsert'}
                          onChange={() => setImportMode('upsert')}
                          className="mt-0.5 text-sky-600 focus:ring-sky-500"
                        />
                        <div>
                          <p className="font-bold">Gabung & Perbarui (Upsert)</p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            Menambah data baru dan mengoreksi data lama pada shift yang sama tanpa menghapus histori lainnya. (Disarankan)
                          </p>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          importMode === 'replace'
                            ? 'bg-amber-50 border-amber-400 text-amber-950 ring-1 ring-amber-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <p className="font-bold">Ganti Seluruh Data (Overwrite)</p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            Menggantikan seluruh database lokal dengan data dari file Excel ini.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPreviewData(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      id="btn-confirm-import-excel"
                      onClick={handleExecuteImport}
                      className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Konfirmasi Simpan ke Database
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              {/* Scope Selection */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Cakupan Laporan yang Diekspor:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('filtered')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      exportScope === 'filtered'
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Sesuai Filter ({filteredReports.length} Shift)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      exportScope === 'all'
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Semua Riwayat ({reports.length} Shift)
                  </button>
                </div>
              </div>

              {/* Export Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Excel Export Card */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-emerald-400 transition space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Export Format Excel (.xlsx)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Menghasilkan file spreadsheet lengkap dengan 3 lembar kerja:
                      Detail Meteran Air, Rekap per Deepwell, dan Master Kuota.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-export-excel-action"
                    disabled={isExporting || targetExportReports.length === 0}
                    onClick={handleExportExcel}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Excel (.xlsx)
                  </button>
                </div>

                {/* PDF Export Card */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-rose-400 transition space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Export Dokumen PDF (.pdf)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Dokumen resmi siap cetak (A4 landscape) berformat tabel industri, metrik ringkasan KPI, dan kolom pengesahan Supervisor.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-export-pdf-action"
                    disabled={isExporting || targetExportReports.length === 0}
                    onClick={handleExportPdf}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF (.pdf)
                  </button>
                </div>
              </div>

              {/* Note on Google Drive */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Jika akun Google Sheets Anda terhubung di menu utama, laporan juga dapat disinkronkan secara real-time ke spreadsheet online.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
