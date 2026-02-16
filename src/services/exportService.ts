import { DocumentRecord, AppSettings } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE');
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '0,00 €';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

export async function exportToCSV(
  documents: DocumentRecord[],
  settings?: AppSettings
): Promise<ExportResult> {
  try {
    const completed = documents.filter((d) => d.status === 'COMPLETED' && d.data);

    if (completed.length === 0) {
      return { success: false, error: 'Keine abgeschlossenen Belege gefunden' };
    }

    const headers = [
      'ID',
      'Dateiname',
      'Belegdatum',
      'Lieferant',
      'Rechnungsnummer',
      'Netto',
      'MwSt 19%',
      'MwSt 7%',
      'MwSt 0%',
      'Brutto',
      'Steuerkategorie',
      'Soll-Konto',
      'Haben-Konto',
      'Status',
    ];

    const rows = completed.map((doc) => {
      const data = doc.data!;
      return [
        doc.id,
        doc.fileName,
        formatDate(data.belegDatum),
        data.lieferantName || '',
        data.belegNummerLieferant || '',
        data.nettoBetrag?.toFixed(2) || '0,00',
        data.mwstBetrag19?.toFixed(2) || '0,00',
        data.mwstBetrag7?.toFixed(2) || '0,00',
        data.mwstBetrag0?.toFixed(2) || '0,00',
        data.bruttoBetrag?.toFixed(2) || '0,00',
        data.steuerkategorie || data.steuerKategorie || '',
        data.sollKonto || data.konto_skr03 || '',
        data.habenKonto || '',
        doc.status,
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
    ].join('\n');

    const bom = '\uFEFF';
    const date = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: bom + csvContent,
      filename: `zoe_belege_${date}.csv`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'CSV-Export fehlgeschlagen',
    };
  }
}

export async function exportToSQL(
  documents: DocumentRecord[],
  settings?: AppSettings
): Promise<ExportResult> {
  try {
    const completed = documents.filter((d) => d.status === 'COMPLETED' && d.data);

    if (completed.length === 0) {
      return { success: false, error: 'Keine abgeschlossenen Belege gefunden' };
    }

    const lines: string[] = [];
    lines.push('-- ZOE Solar Accounting OCR SQL Export');
    lines.push(`-- Exportdatum: ${new Date().toISOString()}`);
    lines.push(`-- Anzahl Belege: ${completed.length}`);
    lines.push('');

    lines.push('BEGIN TRANSACTION;');
    lines.push('');

    for (const doc of completed) {
      const data = doc.data!;

      lines.push(`-- Beleg: ${doc.fileName}`);
      lines.push(
        `INSERT INTO documents (id, filename, filetype, "uploadDate", status, "belegDatum", "lieferantName", "lieferantAdresse", "belegNummerLieferant", "nettoBetrag", "mwstBetrag19", "mwstBetrag7", "mwstBetrag0", "bruttoBetrag", "steuerkategorie", "sollKonto", "habenKonto", "ocrScore") VALUES (`
      );
      lines.push(`  '${doc.id}',`);
      lines.push(`  '${doc.fileName.replace(/'/g, "''")}',`);
      lines.push(`  '${doc.fileType}',`);
      lines.push(`  '${doc.uploadDate}',`);
      lines.push(`  '${doc.status}',`);
      lines.push(`  ${data.belegDatum ? `'${data.belegDatum}'` : 'NULL'},`);
      lines.push(
        `  ${data.lieferantName ? `'${data.lieferantName.replace(/'/g, "''")}'` : 'NULL'},`
      );
      lines.push(
        `  ${data.lieferantAdresse ? `'${data.lieferantAdresse.replace(/'/g, "''")}'` : 'NULL'},`
      );
      lines.push(`  ${data.belegNummerLieferant ? `'${data.belegNummerLieferant}'` : 'NULL'},`);
      lines.push(`  ${data.nettoBetrag || 0},`);
      lines.push(`  ${data.mwstBetrag19 || 0},`);
      lines.push(`  ${data.mwstBetrag7 || 0},`);
      lines.push(`  ${data.mwstBetrag0 || 0},`);
      lines.push(`  ${data.bruttoBetrag || 0},`);
      lines.push(`  ${data.steuerkategorie ? `'${data.steuerkategorie}'` : 'NULL'},`);
      lines.push(`  ${data.sollKonto ? `'${data.sollKonto}'` : 'NULL'},`);
      lines.push(`  ${data.habenKonto ? `'${data.habenKonto}'` : 'NULL'},`);
      lines.push(`  ${data.ocr_score || data.qualityScore || 0}`);
      lines.push(');');
      lines.push('');
    }

    lines.push('COMMIT;');
    lines.push('');
    lines.push('-- END SQL Export');

    const date = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: lines.join('\n'),
      filename: `zoe_backup_${date}.sql`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SQL-Export fehlgeschlagen',
    };
  }
}

export async function exportToPDF(
  documents: DocumentRecord[],
  settings?: AppSettings
): Promise<ExportResult> {
  try {
    const completed = documents.filter((d) => d.status === 'COMPLETED' && d.data);

    if (completed.length === 0) {
      return { success: false, error: 'Keine abgeschlossenen Belege gefunden' };
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text('ZOE Solar Accounting - Belegübersicht', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Exportdatum: ${new Date().toLocaleDateString('de-DE')}`, pageWidth / 2, 28, {
      align: 'center',
    });
    doc.text(`Anzahl Belege: ${completed.length}`, pageWidth / 2, 34, { align: 'center' });

    const tableData = completed.map((d) => [
      formatDate(d.data!.belegDatum),
      d.data!.lieferantName?.substring(0, 20) || '-',
      d.data!.belegNummerLieferant || '-',
      formatCurrency(d.data!.nettoBetrag),
      formatCurrency(d.data!.bruttoBetrag),
      d.data!.steuerkategorie || d.data!.steuerKategorie || '-',
    ]);

    autoTable(doc, {
      head: [['Datum', 'Lieferant', 'Rechnungs-Nr.', 'Netto', 'Brutto', 'MwSt']],
      body: tableData,
      startY: 45,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    const totalY = (doc as any).lastAutoTable.finalY + 10;

    let totalNetto = 0;
    let totalBrutto = 0;
    let totalMwSt19 = 0;
    let totalMwSt7 = 0;

    for (const d of completed) {
      totalNetto += d.data!.nettoBetrag || 0;
      totalBrutto += d.data!.bruttoBetrag || 0;
      totalMwSt19 += d.data!.mwstBetrag19 || 0;
      totalMwSt7 += d.data!.mwstBetrag7 || 0;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summen:', 120, totalY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(totalNetto), 160, totalY);
    doc.text(formatCurrency(totalMwSt19 + totalMwSt7), 180, totalY);
    doc.text(formatCurrency(totalBrutto), 195, totalY, { align: 'right' });

    const pdfOutput = doc.output('arraybuffer');
    const base64 = btoa(
      new Uint8Array(pdfOutput).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const date = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: base64,
      filename: `zoe_bericht_${date}.pdf`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF-Export fehlgeschlagen',
    };
  }
}

export async function downloadCSV(
  documents: DocumentRecord[],
  settings?: AppSettings
): Promise<void> {
  const result = await exportToCSV(documents, settings);

  if (!result.success || !result.data) {
    throw new Error(result.error || 'CSV-Export fehlgeschlagen');
  }

  const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename || 'export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadPDF(
  documents: DocumentRecord[],
  settings?: AppSettings
): Promise<void> {
  const result = await exportToPDF(documents, settings);

  if (!result.success || !result.data) {
    throw new Error(result.error || 'PDF-Export fehlgeschlagen');
  }

  const binaryString = atob(result.data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename || 'export.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const generatePdfReport = exportToPDF;
export const generateCSVExport = exportToCSV;
