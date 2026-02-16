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

  const mockDocuments: DocumentRecord[] = [];

  describe('exportToCSV()', () => {
    it('should return success result', async () => {
      const result = await exportToCSV(mockDocuments, mockSettings);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('export.csv');
    });

    it('should include header in data', async () => {
      const result = await exportToCSV(mockDocuments, mockSettings);

      expect(result.data).toContain('id,fileName,amount');
    });
  });

  describe('exportToSQL()', () => {
    it('should return success result', async () => {
      const result = await exportToSQL(mockDocuments, mockSettings);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('export.sql');
    });

    it('should include SQL header', async () => {
      const result = await exportToSQL(mockDocuments, mockSettings);

      expect(result.data).toContain('-- SQL Export');
    });
  });

  describe('exportToPDF()', () => {
    it('should return success result', async () => {
      const result = await exportToPDF(mockDocuments, mockSettings);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('export.pdf');
    });

    it('should return placeholder message', async () => {
      const result = await exportToPDF(mockDocuments, mockSettings);

      expect(result.data).toContain('PDF export placeholder');
    });
  });

  describe('backward compatibility aliases', () => {
    it('generateCSVExport should be alias for exportToCSV', async () => {
      const result = await generateCSVExport(mockDocuments, mockSettings);

      expect(result.filename).toBe('export.csv');
    });

    it('generatePdfReport should be alias for exportToPDF', async () => {
      const result = await generatePdfReport(mockDocuments, mockSettings);

      expect(result.filename).toBe('export.pdf');
    });
  });

  describe('error handling', () => {
    it('should handle missing settings', async () => {
      const result = await exportToCSV(mockDocuments);

      expect(result.success).toBe(true);
    });

    it('should handle empty documents array', async () => {
      const result = await exportToCSV([], mockSettings);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
