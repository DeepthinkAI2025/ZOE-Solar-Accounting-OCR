/**
 * ZOE SOLAR ACCOUNTING OCR - FREE AI SERVICE
 *
 * NVIDIA NIM API Configuration
 * Only uses NVIDIA NIM with Qwen 3 model
 *
 * Best Practices February 2026:
 * - Only NVIDIA NIM API
 * - Qwen 3 model for document OCR
 * - TypeScript Strict Mode
 */

import type { ProviderConfig } from './types';

export const OCR_PROMPT = `Extrahiere alle relevanten Daten aus diesem Rechnungsdokument.

Gib das Ergebnis als JSON zurück:

{
  "documentType": "RECHNUNG|QUITTUNG|KAUFBELEG|GUTSCHRIFT|LOHNABRECHNUNG",
  "lieferantName": "Name des Lieferanten/Unternehmens",
  "lieferantAdresse": "Vollständige Adresse",
  "steuernummer": "Steuernummer des Lieferanten",
  "belegNummerLieferant": "Rechnungs-/Belegnummer",
  "belegDatum": "YYYY-MM-DD",
  "nettoBetrag": 0.00,
  "bruttoBetrag": 0.00,
  "mwstSatz19": 19,
  "mwstBetrag19": 0.00,
  "mwstSatz7": 7,
  "mwstBetrag7": 0.00,
  "mwstSatz0": 0,
  "mwstBetrag0": 0.00,
  "zahlungsmethode": "Überweisung|Kreditkarte|Bar|Lastschrift|PayPal",
  "zahlungsDatum": "YYYY-MM-DD",
  "lineItems": [
    {
      "description": "Beschreibung der Position",
      "amount": 0.00,
      "quantity": 1
    }
  ],
  "beschreibung": "Zusätzliche Informationen",
  "ocr_rationale": "Kurze Erklärung der wichtigsten erkannten Daten"
}

WICHTIG:
- Bei Solar-Unternehmen: Achte auf Fachbegriffe wie Module, Wechselrichter, Montagesysteme
- Netto/Brutto müssen mathematisch korrekt sein (Netto + MwSt = Brutto)
- Rechnungsnummer ist oft als "Rechnung Nr.", "Invoice", "Beleg-Nr." gekennzeichnet
- Bei Mehrwertsteuer: Standard 19%, reduziert 7%, befreit 0%`;

export const DEFAULT_OCR_SCORE = 0.85;

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  NVIDIA: {
    enabled: true,
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'qwen/qwen3-next-80b-a3b-instruct',
    apiKey: import.meta.env.VITE_NVIDIA_API_KEY || '',
    priority: 1,
    timeout: 60000,
    maxRetries: 3,
  },
};

export const FREE_TIER_INFO: Record<string, string> = {
  NVIDIA: 'NVIDIA NIM - Qwen3 30B',
};
