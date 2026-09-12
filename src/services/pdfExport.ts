import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ShiftReport, MASTER_DEEPWELLS, getShiftHoursLabel } from '../types';

export function exportReportsToPdf(
  reports: ShiftReport[],
  filterInfo?: {
    timeframe?: string;
    dateLabel?: string;
    shiftLabel?: string;
    supervisorName?: string;
  }
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const nowTimeFormatted = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN MONITORING PENGGUNAAN AIR DEEPWELL', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Plant 1 (DW 1-2) & Plant 2 (DW 3-6) • Terintegrasi Google Sheets & Firestore', 14, 18);
  doc.text(`Waktu Cetak Dokumen: ${todayFormatted} pukul ${nowTimeFormatted} WIB`, 14, 23);

  // Status Badge on Right
  doc.setFillColor(14, 165, 233); // sky-500
  doc.roundedRect(pageWidth - 65, 8, 51, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DOKUMEN RESMI', pageWidth - 40, 15.5, { align: 'center' });

  // 2. Metadata / Filter Section
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI FILTER & PERIODE:', 14, 35);

  doc.setFont('helvetica', 'normal');
  const filterDesc = [
    `Periode: ${filterInfo?.timeframe ? filterInfo.timeframe.toUpperCase() : 'SEMUA RIWAYAT'}`,
    `Tanggal: ${filterInfo?.dateLabel || 'Semua Tanggal'}`,
    `Shift: ${filterInfo?.shiftLabel || 'Semua Shift'}`,
    `Penyusun/Supervisor: ${filterInfo?.supervisorName || 'Supervisor On Duty'}`,
  ].join('   |   ');
  doc.text(filterDesc, 14, 40);

  // 3. Summary Statistics
  let totalUsage = 0;
  let totalOverCount = 0;
  let totalReadingCount = 0;

  reports.forEach((rep) => {
    rep.readings.forEach((r) => {
      totalUsage += r.pemakaian;
      totalReadingCount += 1;
      if (r.isOverQuota) totalOverCount += 1;
    });
  });

  const cardY = 44;
  const cardHeight = 16;
  const cardWidth = 63;
  const gap = 6;

  // Metric Card 1: Total Pemakaian
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PEMAKAIAN AIR', 18, cardY + 5.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalUsage.toLocaleString('id-ID')} m³`, 18, cardY + 12.5);

  // Metric Card 2: Laporan Shift
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14 + cardWidth + gap, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('JUMLAH LAPORAN SHIFT', 18 + cardWidth + gap, cardY + 5.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${reports.length} Laporan (${totalReadingCount} Meter)`, 18 + cardWidth + gap, cardY + 12.5);

  // Metric Card 3: Kejadian Over Kuota
  doc.setFillColor(totalOverCount > 0 ? 254 : 241, totalOverCount > 0 ? 242 : 245, totalOverCount > 0 ? 242 : 249);
  doc.setDrawColor(totalOverCount > 0 ? 252 : 203, totalOverCount > 0 ? 165 : 213, totalOverCount > 0 ? 165 : 225);
  doc.roundedRect(14 + (cardWidth + gap) * 2, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(totalOverCount > 0 ? 185 : 100, totalOverCount > 0 ? 28 : 116, totalOverCount > 0 ? 28 : 139);
  doc.text('STATUS OVER KUOTA', 18 + (cardWidth + gap) * 2, cardY + 5.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(totalOverCount > 0 ? 185 : 15, totalOverCount > 0 ? 28 : 23, totalOverCount > 0 ? 28 : 42);
  doc.text(`${totalOverCount} Kejadian`, 18 + (cardWidth + gap) * 2, cardY + 12.5);

  // Metric Card 4: Status Kuota
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14 + (cardWidth + gap) * 3, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL KUOTA BULANAN ACUAN', 18 + (cardWidth + gap) * 3, cardY + 5.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('28.500 m³', 18 + (cardWidth + gap) * 3, cardY + 12.5);

  // 4. Main Data Table
  const tableRows: any[] = [];
  let rowCounter = 1;

  reports.forEach((rep) => {
    rep.readings.forEach((r) => {
      const dwConfig = MASTER_DEEPWELLS.find((d) => d.id === r.deepwellId);
      const isOver = r.isOverQuota;
      tableRows.push([
        rowCounter++,
        rep.date,
        `Shift ${rep.shift}\n(${getShiftHoursLabel(rep.shift)})`,
        dwConfig?.plant || rep.plant,
        `${r.deepwellId}\n${dwConfig?.name || ''}`,
        r.meterAwal.toLocaleString('id-ID'),
        r.meterAkhir.toLocaleString('id-ID'),
        `${r.pemakaian.toLocaleString('id-ID')} m³`,
        `${r.kuotaShift} m³`,
        `${r.persenKuota.toFixed(0)}%`,
        isOver ? 'OVER KUOTA' : 'Normal',
        rep.operatorName + (rep.isRevised ? `\n(Rev: ${rep.revisedBy})` : ''),
        r.keteranganOver || '-',
      ]);
    });
  });

  autoTable(doc, {
    startY: 65,
    head: [
      [
        'No',
        'Tanggal',
        'Shift',
        'Plant',
        'Deepwell',
        'Awal (m³)',
        'Akhir (m³)',
        'Pemakaian',
        'Kuota Shift',
        '% Kuota',
        'Status',
        'Operator',
        'Catatan/Over',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'left', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      8: { halign: 'right', cellWidth: 18 },
      9: { halign: 'center', cellWidth: 14 },
      10: { halign: 'center', cellWidth: 20 },
      11: { halign: 'left', cellWidth: 26 },
      12: { halign: 'left' },
    },
    didParseCell: function (data) {
      // Highlight over quota
      if (data.column.index === 10 && data.cell.raw === 'OVER KUOTA') {
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: function (data) {
      // Footer page numbering
      const str = `Halaman ${data.pageNumber} dari ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth - 35, doc.internal.pageSize.getHeight() - 8);
      doc.text(
        'Sistem Pemantauan Air Deepwell PT • Dokumen Rahasia & Internal',
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  doc.save(`Laporan_Monitoring_Deepwell_${todayStr}.pdf`);
}
