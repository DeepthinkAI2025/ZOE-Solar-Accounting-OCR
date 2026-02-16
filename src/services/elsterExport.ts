import { DocumentRecord, AppSettings, ExtractedData } from '../types';

export interface ElsterUstvaResult {
  success: boolean;
  xml?: string;
  filename?: string;
  error?: string;
}

const ELSTER_NAMESPACES = {
  elster: 'http://www.elster.de/2002/XMLSchema',
  berechtigte: 'http://www.elster.de/2002/XMLSchema/SharedBerechtigtenDaten',
  partner: 'http://www.elster.de/2002/XMLSchema/SharedPartnerDaten',
  ist: 'http://www.elster.de/2002/XMLSchema/IstErwerb',
  grund: 'http://www.elster.de/2002/XMLSchema/IstGrund',
  einzel: 'http://www.elster.de/2002/XMLSchema/IstEinzel',
  summe: 'http://www.elster.de/2002/XMLSchema/IstSumme',
};

function generateElsterHeader(settings: AppSettings): string {
  const st = settings.elsterStammdaten;
  if (!st) {
    throw new Error('ELSTER Stammdaten nicht konfiguriert');
  }

  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const period = month;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="${ELSTER_NAMESPACES.elster}"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.elster.de/2002/XMLSchema IstUStVA.xsd"
         version="10.1">
  <TransferHeader>
    <HerstellerID>ZOE-Solar</HerstellerID>
    <DatenLieferant>
      <Name>${escapeXml(st.unternehmensName)}</Name>
      <Strasse>${escapeXml(st.strasse)}</Strasse>
      <Hausnummer>${escapeXml(st.hausnummer)}</Hausnummer>
      <PLZ>${escapeXml(st.plz)}</PLZ>
      <Ort>${escapeXml(st.ort)}</Ort>
      <Land>${st.land}</Land>
    </DatenLieferant>
    <Steuernummer>${escapeXml(st.eigeneSteuernummer)}</Steuernummer>
    ${st.eigeneUstIdNr ? `<UmsatzsteuerID>${escapeXml(st.eigeneUstIdNr)}</UmsatzsteuerID>` : ''}
    <Zeitraum>
      <Jahr>${year}</Jahr>
      <Zeitraum>${period}</Zeitraum>
    </Zeitraum>
    <Art>UStVA</Art>
    <Hersteller>ZOE Solar Accounting OCR</Hersteller>
  </TransferHeader>
  <Nutzdaten>
    <Nutzdatenblock>
      <Erstellung>
        <Erstellungsdatum>${formatDate(new Date())}</Erstellungsdatum>
        <Uhrzeit>${formatTime(new Date())}</Uhrzeit>
      </Erstellung>
      <Kontoinhaber>
        <Name>${escapeXml(st.unternehmensName)}</Name>
        <Strasse>${escapeXml(st.strasse)}</Strasse>
        <Hausnummer>${escapeXml(st.hausnummer)}</Hausnummer>
        <PLZ>${escapeXml(st.plz)}</PLZ>
        <Ort>${escapeXml(st.ort)}</Ort>
        <Land>${st.land}</Land>
      </Kontoinhaber>
      <Umsatzsteuervoranmeldung>`;
}

function generateElsterFooter(): string {
  return `      </Umsatzsteuervoranmeldung>
    </Nutzdatenblock>
  </Nutzdaten>
</Elster>`;
}

function calculateUstvaTotals(documents: DocumentRecord[]): {
  kz21: number;
  kz35: number;
  kz81: number;
  kz83: number;
  kz86: number;
  kz89: number;
  kz93: number;
} {
  let kz21 = 0;
  let kz35 = 0;
  let kz81 = 0;
  let kz83 = 0;
  let kz86 = 0;
  let kz89 = 0;
  let kz93 = 0;

  for (const doc of documents) {
    if (!doc.data) continue;
    const data = doc.data;

    if (data.steuerkategorie === '0%' || data.steuerkategorie === 'KLEIN') {
      kz21 += data.nettoBetrag || 0;
    }

    if (data.reverseCharge) {
      kz35 += data.nettoBetrag || 0;
    }

    if (data.mwstSatz7 > 0 || data.mwstBetrag7 > 0) {
      kz81 += data.nettoBetrag || 0;
      kz83 += data.mwstBetrag7 || 0;
    }

    if (data.mwstSatz19 > 0 || data.mwstBetrag19 > 0) {
      kz86 += data.nettoBetrag || 0;
      kz89 += data.mwstBetrag19 || 0;
    }

    kz93 += (data.mwstBetrag19 || 0) + (data.mwstBetrag7 || 0) + (data.mwstBetrag0 || 0);
  }

  return { kz21, kz35, kz81, kz83, kz86, kz89, kz93 };
}

function generateUstvaFields(totals: ReturnType<typeof calculateUstvaTotals>): string {
  const fields: string[] = [];

  if (totals.kz21 !== 0) {
    fields.push(`        <Kz21>${formatNumber(totals.kz21)}</Kz21>`);
  }

  if (totals.kz35 !== 0) {
    fields.push(`        <Kz35>${formatNumber(totals.kz35)}</Kz35>`);
  }

  fields.push(`        <Kz81>${formatNumber(totals.kz81)}</Kz81>`);
  fields.push(`        <Kz83>${formatNumber(totals.kz83)}</Kz83>`);
  fields.push(`        <Kz86>${formatNumber(totals.kz86)}</Kz86>`);
  fields.push(`        <Kz89>${formatNumber(totals.kz89)}</Kz89>`);
  fields.push(`        <Kz93>${formatNumber(totals.kz93)}</Kz93>`);

  return fields.join('\n');
}

function escapeXml(str: string | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatNumber(num: number): string {
  return num.toFixed(2).replace('.', ',');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0].replace(/:/g, '');
}

export async function generateUstva(
  documents: DocumentRecord[],
  settings: AppSettings
): Promise<ElsterUstvaResult> {
  try {
    if (!settings.elsterStammdaten) {
      return {
        success: false,
        error: 'ELSTER Stammdaten nicht konfiguriert. Bitte in den Einstellungen konfigurieren.',
      };
    }

    const completedDocs = documents.filter((d) => d.status === 'COMPLETED' && d.data);

    const totals = calculateUstvaTotals(completedDocs);

    const header = generateElsterHeader(settings);
    const fields = generateUstvaFields(totals);
    const footer = generateElsterFooter();

    const xml = header + '\n' + fields + '\n' + footer;

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    return {
      success: true,
      xml,
      filename: `elster_ustva_${year}_${month}.xml`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler bei ELSTER-Generierung',
    };
  }
}

export async function downloadElsterXml(
  documents: DocumentRecord[],
  settings: AppSettings
): Promise<void> {
  const result = await generateUstva(documents, settings);

  if (!result.success || !result.xml) {
    throw new Error(result.error || 'ELSTER-Export fehlgeschlagen');
  }

  const blob = new Blob([result.xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename || 'elster_ustva.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default { generateUstva, downloadElsterXml };
