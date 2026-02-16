# NVIDIA NIM Integration

## Overview

ZOE Solar Accounting OCR uses **NVIDIA NIM (NVIDIA Inference Microservices)** for document OCR processing.

## Provider

| Provider   | Model      | Endpoint                              |
| ---------- | ---------- | ------------------------------------- |
| NVIDIA NIM | Qwen 3 30B | `https://integrate.api.nvidia.com/v1` |

## Configuration

### Environment Variables

```env
VITE_NVIDIA_API_KEY=your-nvidia-api-key
```

### Getting NVIDIA API Key

1. Visit [NVIDIA NGC](https://org.ngc.nvidia.com/)
2. Create an account or sign in
3. Go to API Keys section
4. Generate a new API key
5. Add to `.env` file

## Architecture

```
Document Upload
      ↓
Free AIService (analyzeDocumentFree)
      ↓
NVIDIA NIM Provider (tryNVIDIA)
      ↓
Qwen 3 Model (qwen/qwen3-30b-a3b)
      ↓
Extracted Data (JSON)
```

## Model Details

| Model              | Parameters | Context | Use Case     |
| ------------------ | ---------- | ------- | ------------ |
| qwen/qwen3-30b-a3b | 30B        | 32K     | Document OCR |

## Features

- **Free Tier**: NVIDIA NIM offers free API credits
- **Fast Inference**: Optimized for production
- **Vision Capable**: Can process images and PDFs
- **JSON Output**: Structured extraction

## Error Handling

The service includes:

- Automatic retry (3 attempts)
- Timeout handling (60s)
- Error logging
- Fallback to error message

## Testing

Run the test suite:

```bash
npm run test
```

Run type checking:

```bash
npm run typecheck
```

Build for production:

```bash
npm run build
```
