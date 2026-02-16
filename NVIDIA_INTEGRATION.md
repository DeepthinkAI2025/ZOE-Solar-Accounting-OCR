# NVIDIA Kimi K2.5 OCR Integration

## Übersicht
Ab sofort verwendet ZOE Solar Accounting OCR ausschließlich die **NVIDIA API** mit **Kimi K2.5** für OCR-Operationen.

## Konfiguration

### API Key
Der NVIDIA API Key ist in `.env` hinterlegt:
```
VITE_NVIDIA_API_KEY=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
```

### Verwendetes Modell
- **Modell**: `moonshotai/kimi-k2.5`
- **Provider**: NVIDIA API (integrate.api.nvidia.com)
- **Qualität**: Premium OCR für deutsche Rechnungen

## Deaktivierte Provider
Folgende Provider wurden deaktiviert (nur NVIDIA wird verwendet):
- ❌ Google Gemini
- ❌ SiliconFlow Qwen
- ❌ Mistral AI
- ❌ OpenCode ZEN

## Geänderte Dateien
1. `.env` - NVIDIA API Key hinzugefügt, andere Keys auskommentiert
2. `src/services/freeAIService/config.ts` - Nur NVIDIA aktiviert
3. `src/services/betterUploadServer.ts` - Verwendet jetzt `analyzeDocumentFree()`
4. `src/hooks/useUpload.ts` - Verwendet jetzt `analyzeDocumentFree()`
5. `src/services/geminiService.ts` - Als deprecated markiert

## Technische Details

### API-Endpunkt
```
POST https://integrate.api.nvidia.com/v1/chat/completions
```

### Request Format (OpenAI-kompatibel)
```json
{
  "model": "moonshotai/kimi-k2.5",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "OCR_PROMPT" },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
      ]
    }
  ]
}
```

### Extrahierte Daten
- Lieferant Name & Adresse
- Steuernummer
- Rechnungsnummer & Datum
- Netto/Brutto Beträge
- MwSt-Sätze (19%, 7%, 0%)
- Zahlungsmethode & -datum
- Positionen (Line Items)

## Fehlerbehandlung
- Timeout: 30 Sekunden
- Max Retries: 3
- Fallback: Keiner (nur NVIDIA)
