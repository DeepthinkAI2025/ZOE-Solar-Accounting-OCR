/**
 * Better Upload Server Configuration
 * Integrates better-upload with existing Supabase storage and file processing
 */

/**
 * Custom types for better-upload integration
 * The better-upload library provides upload utilities but we need custom handler types
 */

export interface UploadFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface UploadMetadata {
  [key: string]: any;
}

export interface UploadResult {
  success: boolean;
  error?: string;
  status: 'rejected' | 'error' | 'completed' | 'processing';
  documentId?: string;
  data?: Record<string, unknown>;
  previewUrl?: string;
}

export type UploadHandler = (file: UploadFile, metadata?: UploadMetadata) => Promise<UploadResult>;

export interface UploadConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  storagePath: (file: UploadFile) => string;
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

import { supabase } from './supabaseClient';
import { analyzeDocumentFree } from './freeAIService';
import { applyAccountingRules, generateZoeInvoiceId } from './ruleEngine';
import { detectPrivateDocument } from './privateDocumentDetection';
import { normalizeExtractedData } from './extractedDataNormalization';
import { belegeService } from './belegeService';
import { DocumentStatus, ExtractedData } from '../types';

// Monitoring stub - service was removed
const monitoringService = {
  captureMetric: (_name: string, _value: number) => {},
  captureError: (_error: Error, _context?: Record<string, unknown>) => {},
};

// Configuration for better-upload
export const betterUploadConfig: UploadConfig = {
  // File size limits (50MB)
  maxFileSize: 50 * 1024 * 1024,

  // Allowed file types
  allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],

  // Storage path pattern
  storagePath: (file) => {
    const timestamp = Date.now();
    return `documents/${timestamp}-${file.name}`;
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 uploads per window
  },
};

/**
 * Custom upload handler for ZOE
 * Handles the complete file processing pipeline
 */
export const zoeUploadHandler: UploadHandler = async (
  file: UploadFile,
  metadata?: UploadMetadata
): Promise<UploadResult> => {
  try {
    // Step 1: Read file to base64 for Gemini analysis
    const { base64 } = await readFileToBase64(file);

    // Step 2: Analyze with NVIDIA Kimi K2.5 (FREE API)
    const analysisResult = await analyzeDocumentFree(base64, file.type);

    // Step 3: Normalize extracted data
    const normalizedData = normalizeExtractedData(analysisResult);

    // Step 4: Security check - detect private documents
    const privateCheck = detectPrivateDocument(normalizedData);
    if (privateCheck.isPrivate) {
      return {
        success: false,
        error: `Private document detected - ${privateCheck.reason || 'contains sensitive personal information'}`,
        status: 'rejected',
      };
    }

    // Step 5: Apply accounting rules (with empty context for upload handler)
    const ruledData = applyAccountingRules(normalizedData, [], null);

    // Step 6: Generate ZOE invoice ID (with empty documents array)
    const zoeInvoiceId = generateZoeInvoiceId(ruledData.belegDatum, []);

    // Step 7: Compute file hash for duplicate detection
    const fileHash = await computeFileHash(file);

    // Step 8: Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(`${zoeInvoiceId}-${file.name}`, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Storage upload failed: ${uploadError.message}`,
        status: 'error',
      };
    }

    // Step 9: Get public URL
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path);

    // Step 10: Classify OCR outcome
    const { status: docStatus, error } = classifyOcrOutcome(ruledData);

    // Step 10a: Map DocumentStatus to UploadResult status
    const uploadStatus = mapDocumentStatusToUploadStatus(docStatus);

    // Step 11: Save to database
    const saveResult = await belegeService.create(ruledData, {
      dateiname: file.name,
      dateityp: file.type,
      dateigroesse: file.size,
      file_hash: fileHash,
      gitlab_storage_url: urlData.publicUrl,
    });

    // Step 12: Monitor and log
    monitoringService.captureMetric('document_uploaded', 0);

    return {
      success: true,
      documentId: zoeInvoiceId,
      status: uploadStatus,
      data: ruledData as unknown as Record<string, unknown>,
      previewUrl: urlData.publicUrl,
    };
  } catch (error: unknown) {
    const err = error as Error;
    monitoringService.captureError(err, { fileName: file.name });

    return {
      success: false,
      error: err.message || 'Upload processing failed',
      status: 'error',
    };
  }
};

/**
 * Helper: Convert UploadFile to Blob for Supabase upload
 */
function uploadFileToBlob(uploadFile: UploadFile): Blob {
  // Create a Blob from the array buffer
  // Note: This is a simplified conversion - in real implementation,
  // you'd need to get the actual buffer content
  return new Blob([], { type: uploadFile.type });
}

/**
 * Helper: Read file to base64
 */
async function readFileToBase64(file: UploadFile): Promise<{ base64: string; url: string }> {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return {
    base64: base64,
    url: `data:${file.type};base64,${base64}`,
  };
}

/**
 * Helper: Compute file hash
 */
async function computeFileHash(file: UploadFile): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Helper: Classify OCR outcome
 */
function classifyOcrOutcome(data: any): { status: DocumentStatus; error?: string } {
  const score = data.ocr_score ?? 0;
  const vendor = (data.lieferantName || '').toLowerCase();
  const rationale = (data.ocr_rationale || '').trim();
  const description = (data.beschreibung || '').trim();

  const msg = (rationale || description).toLowerCase();

  const isTechnicalFailure =
    msg.includes('siliconflow_api_key') ||
    msg.includes('api key') ||
    msg.includes('pdf ist zu groß') ||
    msg.includes('vision api error') ||
    msg.includes('gemini fehlgeschlagen') ||
    msg.includes('quota') ||
    msg.includes('http 4') ||
    msg.includes('http 5');

  const looksLikeManualTemplate =
    vendor.includes('manuelle eingabe') || (score <= 0 && (data.bruttoBetrag ?? 0) === 0);

  if (looksLikeManualTemplate) {
    const errorMsg = rationale || description || 'Analyse fehlgeschlagen. Bitte manuell erfassen.';
    return {
      status: isTechnicalFailure ? DocumentStatus.ERROR : DocumentStatus.REVIEW_NEEDED,
      error: errorMsg,
    };
  }

  // Non-fatal but needs review
  if (
    rationale.includes('Datum unklar') ||
    rationale.includes('Summen widersprüchlich') ||
    score < 6
  ) {
    return { status: DocumentStatus.REVIEW_NEEDED, error: rationale || 'Bitte Daten prüfen.' };
  }

  return { status: DocumentStatus.COMPLETED, error: undefined };
}

/**
 * Helper: Map DocumentStatus to UploadResult status
 */
function mapDocumentStatusToUploadStatus(
  docStatus: DocumentStatus
): 'rejected' | 'error' | 'completed' | 'processing' {
  switch (docStatus) {
    case DocumentStatus.PRIVATE:
      return 'rejected';
    case DocumentStatus.ERROR:
      return 'error';
    case DocumentStatus.COMPLETED:
      return 'completed';
    case DocumentStatus.PROCESSING:
      return 'processing';
    case DocumentStatus.REVIEW_NEEDED:
      return 'processing';
    case DocumentStatus.DUPLICATE:
      return 'rejected';
    default:
      return 'processing';
  }
}
