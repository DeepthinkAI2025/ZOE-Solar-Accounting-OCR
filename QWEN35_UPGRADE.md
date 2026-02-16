# Qwen 3.5 397B A17B Upgrade

## Übersicht
Upgrade auf das neue **Qwen 3.5 397B A17B** Modell über NVIDIA API.

## Warum Qwen 3.5?
- **397B Parameter** - Massiv größeres Modell
- **A17B Architektur** - Advanced reasoning
- **Bessere OCR** - Superior text recognition
- **Thinking Mode** - Enable thinking für komplexe Dokumente

## Technische Details

### Modell
```
Modell: qwen/qwen3.5-397b-a17b
Provider: NVIDIA API
Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
```

### Parameter
```json
{
  "max_tokens": 16384,
  "temperature": 0.60,
  "top_p": 0.95,
  "top_k": 20,
  "min_p": 0,
  "presence_penalty": 0,
  "repetition_penalty": 1,
  "stream": false,
  "chat_template_kwargs": {
    "enable_thinking": true
  }
}
```

### Request Format
```json
{
  "model": "qwen/qwen3.5-397b-a17b",
  "messages": [
    {
      "role": "user",
      "content": "OCR Prompt... <img src=\"data:image/png;base64,...\" />"
    }
  ],
  "max_tokens": 16384,
  "temperature": 0.60,
  "top_p": 0.95,
  "top_k": 20,
  "chat_template_kwargs": {
    "enable_thinking": true
  }
}
```

## Geänderte Dateien
1. `src/services/freeAIService/config.ts` - Modell auf qwen3.5-397b-a17b geändert
2. Timeout erhöht auf 60s (größeres Modell)
3. Dokumentation aktualisiert

## Vorteile gegenüber Kimi K2.5
- 397B vs ~100B Parameter
- Advanced reasoning (A17B)
- Bessere deutsche Spracherkennung
- Überlegene Tabellen-Extraktion
