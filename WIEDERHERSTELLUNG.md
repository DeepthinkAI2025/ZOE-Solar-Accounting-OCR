# 🚨 ZOE APP - NOTFALL-WIEDERHERSTELLUNG

## Problem

Die App wurde durch einen defekten Platzhalter ersetzt (170 Zeilen statt 1301 Zeilen).

## Lösung

Die vollständige App wurde aus `App.tsx.backup` wiederhergestellt.

## Status

- ✅ App.tsx: 1301 Zeilen (vollständig)
- ✅ Datenbank: Supabase (belege Tabelle)
- ✅ OCR: NVIDIA Qwen 3.5 konfiguriert
- ⏳ Dependencies: Werden neu installiert

## Belege-Stand

**0 Dokumente angezeigt** - Die Belege sind in der Supabase Cloud (https://supabase.aura-call.de)

Sobald der Server läuft, werden die Belege automatisch aus der Cloud geladen.

## Start-Befehl

```bash
cd /Users/jeremy/dev/projects/archive/conductor/repos/zoe-solar-accounting-ocr
npm run dev
```

## Datenbank-Schema

- Tabelle: `belege`
- Spalten: id, file_name, extracted_data (JSONB), creditor, total_amount, etc.
- Verbindung: In `.env` konfiguriert
