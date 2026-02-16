import { DocumentRecord, DatevConfig, ExtractedData } from '../types';

export interface DatevBuchungssatz {
  belegDatum: string;
  belegNummer: string;
  konto: string;
  gegenKonto: string;
  betrag: number;
  steuerCode: string;
  steuerBetrag: number;
  text: string;
  herkunftKz?: string;
}

export interface DatevExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  recordCount?: number;
  error?: string;
}

const DATEV_STEUER_CODES: Record<string, string> = {
  '19%': '9',
  '7%': '7',
  '0%': '0',
  PV: '0',
  KLEIN: '0',
  REVERSE: '8',
};

function formatDateDE(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}${month}${year}`;
}

function formatDateYYYYMMDD(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

function formatBetrag(betrag: number | undefined): string {
  if (betrag === undefined || betrag === null) return '0,00';
  const parts = Math.abs(betrag).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (betrag < 0 ? '-' : '') + parts.join(',');
}

function getSteuerCode(steuerkategorie: string | undefined, config: DatevConfig): string {
  if (!steuerkategorie) return '0';
  return config.taxCategoryToBuKey?.[steuerkategorie] || DATEV_STEUER_CODES[steuerkategorie] || '0';
}

function mapToBuchungssatz(doc: DocumentRecord, config: DatevConfig): DatevBuchungssatz {
  const data = doc.data;
  const steuerkategorie = data?.steuerkategorie || data?.steuerKategorie || '19%';

  const betrag = data?.bruttoBetrag || data?.nettoBetrag || 0;
  const steuerBetrag = (data?.mwstBetrag19 || 0) + (data?.mwstBetrag7 || 0);

  const sollKonto = data?.sollKonto || data?.konto_skr03 || data?.kontierungskonto || '1400';
  const habenKonto = data?.habenKonto || '1600';

  return {
    belegDatum: formatDateDE(data?.belegDatum),
    belegNummer: doc.id.slice(0, 8).toUpperCase(),
    konto: habenKonto,
    gegenKonto: sollKonto,
    betrag: betrag,
    steuerCode: getSteuerCode(steuerkategorie, config),
    steuerBetrag: steuerBetrag,
    text: data?.lieferantName?.substring(0, 30) || doc.fileName.substring(0, 30),
    herkunftKz: config.herkunftKz || 'RE',
  };
}

function formatEXTFLine(buchung: DatevBuchungssatz, kontoLaenge: number): string {
  const fields: string[] = [];

  fields.push(buchung.belegDatum);
  fields.push(buchung.belegNummer.padEnd(8, ' ').substring(0, 8));
  fields.push(buchung.konto.padStart(kontoLaenge, '0').slice(-kontoLaenge));
  fields.push(buchung.gegenKonto.padStart(kontoLaenge, '0').slice(-kontoLaenge));
  fields.push(formatBetrag(buchung.betrag));
  fields.push(buchung.steuerCode);
  fields.push(formatBetrag(buchung.steuerBetrag));
  fields.push(buchung.text.substring(0, 40).padEnd(40, ' '));
  fields.push(buchung.herkunftKz || 'RE');

  return fields.join(';');
}

function generateHeaderSatz(config: DatevConfig, anzahlBuchungen: number): string {
  const datum = new Date();
  const dat = formatDateYYYYMMDD(datum.toISOString());
  const uhrzeit = datum.toTimeString().split(' ')[0].replace(/:/g, '');

  const headerParts = [
    'HEADER',
    'DATENTRAEGER',
    'EXTERN',
    'ExtProgramm',
    formatDateYYYYMMDD(config.wirtschaftsjahrBeginn),
    config.beraterNr,
    config.mandantNr,
    '',
    config.sachkontenlaenge || 4,
    anzahlBuchungen.toString(),
    config.waehrung || 'EUR',
    'D',
    '',
    '',
    dat,
    uhrzeit,
    '',
    '',
    '',
  ];

  return headerParts.join(';');
}

function generateKontenHeader(config: DatevConfig): string {
  return [
    'KONTEN',
    config.beraterNr,
    config.mandantNr,
    formatDateYYYYMMDD(config.wirtschaftsjahrBeginn),
    '',
  ].join(';');
}

function generateBuchungsstapelHeader(config: DatevConfig, anzahlBuchungen: number): string {
  const datum = new Date();

  return [
    'BUCHUNGSSATZ',
    '1',
    config.beraterNr,
    config.mandantNr,
    formatDateYYYYMMDD(config.wirtschaftsjahrBeginn),
    '',
    config.sachkontenlaenge || 4,
    anzahlBuchungen.toString(),
    '',
    config.waehrung || 'EUR',
    formatDateYYYYMMDD(datum.toISOString()),
    datum.toTimeString().split(' ')[0].replace(/:/g, ''),
    config.stapelBezeichnung || 'ZOE Export',
    config.diktatkuerzel || 'ZOE',
  ].join(';');
}

export async function generateBuchungsstapel(
  documents: DocumentRecord[],
  config: DatevConfig
): Promise<DatevExportResult> {
  try {
    const completed = documents.filter((d) => d.status === 'COMPLETED' && d.data);

    if (completed.length === 0) {
      return {
        success: false,
        error: 'Keine abgeschlossenen Belege zum Exportieren gefunden.',
      };
    }

    const buchungen = completed.map((doc) => mapToBuchungssatz(doc, config));

    const lines: string[] = [];

    lines.push(generateHeaderSatz(config, buchungen.length));
    lines.push(generateKontenHeader(config));
    lines.push(generateBuchungsstapelHeader(config, buchungen.length));

    for (const buchung of buchungen) {
      lines.push(formatEXTFLine(buchung, config.sachkontenlaenge || 4));
    }

    lines.push('ENDE');

    const result = lines.join('\r\n');

    const datum = new Date();
    const datumsStr = datum.toISOString().split('T')[0].replace(/-/g, '');

    return {
      success: true,
      data: result,
      filename: `datev_buchungsstapel_${datumsStr}.csv`,
      recordCount: buchungen.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler bei DATEV-Generierung',
    };
  }
}

export async function downloadDatevExtf(
  documents: DocumentRecord[],
  config: DatevConfig
): Promise<void> {
  const result = await generateBuchungsstapel(documents, config);

  if (!result.success || !result.data) {
    throw new Error(result.error || 'DATEV-Export fehlgeschlagen');
  }

  const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename || 'datev_buchungsstapel.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default { generateBuchungsstapel, downloadDatevExtf };
