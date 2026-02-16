import { DocumentStatus, type DocumentRecord, type AppSettings } from '../../types';
import {
  exportToCSV,
  exportToSQL,
  exportToPDF,
  generateCSVExport,
  generatePdfReport,
} from '../exportService';
import { describe, expect, it } from 'vitest';

describe('exportService.ts', () => {
  const mockSettings: AppSettings = {
    id: 'test-settings',
    accountGroups: [],
    accountDefinitions: [],
    taxDefinitions: [],
    ocrConfig: {
      scores: {},
      required_fields: [],
      field_weights: {},
      regex_patterns: {},
      validation_rules: { sum_check: true, date_check: true, min_confidence: 0.5 },
    },
  };

  const mockDocuments: DocumentRecord[] = [
    {
      id: 'test-1',
      fileName: 'test-rechnung.pdf',
      fileType: 'application/pdf',
      uploadDate: '2025-01-15',
      status: 'COMPLETED' as DocumentStatus,
      data: {
        belegDatum: '2025-01-10',
        lieferantName: 'Test Lieferant GmbH',
        lieferantAdresse: 'Teststraße 1, 12345 Berlin',
        nettoBetrag: 100.0,
        bruttoBetrag: 119.0,
        mwstBetrag19: 19.0,
        mwstBetrag7: 0,
        mwstBetrag0: 0,
        mwstSatz19: 19,
        mwstSatz7: 0,
        mwstSatz0: 0,
        lieferantSteuernummer: '123456789',
        belegNummerLieferant: 'RE-001',
        steuerkategorie: '19%',
        sollKonto: '4200',
        habenKonto: '1600',
        ocr_score: 0.95,
        ocr_rationale: 'Test extraction',
      },
      previewUrl: '',
    },
  ];

  describe('exportToCSV()', () => {
    it('should return success result', async () => {
      const result = await exportToCSV(mockDocuments, mockSettings);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/^zoe_belege_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should include header in data', async () => {
      const result = await exportToCSV(mockDocuments, mockSettings);

      expect(result.data).toContain('ID');
      expect(result.data).toContain('Dateiname');
    });
  });

  describe('exportToSQL()', () => {
    it('should return success result', async () => {
      const result = await exportToSQL(mockDocuments, mockSettings);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/^zoe_backup_\d{4}-\d{2}-\d{2}\.sql$/);
    });

    it('should include SQL header', async () => {
      const result = await exportToSQL(mockDocuments, mockSettings);

      expect(result.data).toContain('-- ZOE Solar Accounting OCR SQL Export');
    });
  });

  describe('exportToPDF()', () => {
    it('should return success result', async () => {
      const result = await exportToPDF(mockDocuments, mockSettings);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/^zoe_bericht_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should return PDF with document data', async () => {
      const result = await exportToPDF(mockDocuments, mockSettings);

      expect(result.data).toMatch(/^JVBERi0x/);
    });
  });

  describe('backward compatibility aliases', () => {
    it('generateCSVExport should be alias for exportToCSV', async () => {
      const result = await generateCSVExport(mockDocuments, mockSettings);

      expect(result.filename).toMatch(/^zoe_belege_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('generatePdfReport should be alias for exportToPDF', async () => {
      const result = await generatePdfReport(mockDocuments, mockSettings);

      expect(result.filename).toMatch(/^zoe_bericht_\d{4}-\d{2}-\d{2}\.pdf$/);
    });
  });

  describe('error handling', () => {
    it('should handle missing settings', async () => {
      const result = await exportToCSV(mockDocuments);

      expect(result.success).toBe(true);
    });

    it('should return error for empty documents array', async () => {
      const result = await exportToCSV([], mockSettings);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
