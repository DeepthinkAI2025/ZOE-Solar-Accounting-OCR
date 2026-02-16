/**
 * DetailModal - Refactored (2026 Best Practices)
 * Split into smaller components + custom hook for logic
 */
import { useState, useEffect } from 'react';
import { DocumentRecord, ExtractedData, AppSettings } from '../../types';

// Hooks
import { useDocumentEditor } from './hooks/useDocumentEditor';

// Sub-components
import { DetailModalHeader } from './Header';
import { DocumentView } from './DocumentView';
import { EditorView } from './EditorView';
import { ValidationView } from './ValidationView';
import { DetailModalActions } from './Actions';

// Services
import { rateLimitWrapper, exportRateLimiter } from '../../services/rateLimiter';
import { validateDocumentData } from '../../services/validation';
import { toast } from 'react-hot-toast';
import { generatePdfReport } from '../../services/exportService';

interface DetailModalProps {
  document: DocumentRecord;
  allDocuments: DocumentRecord[];
  isOpen: boolean;
  onSave: (doc: DocumentRecord) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onRetryOCR: (doc: DocumentRecord) => Promise<void>;
  onSelectDocument: (doc: DocumentRecord) => void;
  onClose: () => void;
  onMerge: (sourceId: string, targetId: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  document,
  allDocuments,
  isOpen,
  onSave,
  onDelete,
  onRetryOCR,
  onSelectDocument,
  onClose,
  onMerge,
}) => {
  const [mobileTab, setMobileTab] = useState<'preview' | 'data'>('data');

  // Use the custom hook for all editor logic
  const editor = useDocumentEditor({
    document,
    allDocuments,
    onSave,
  });

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Arrow navigation
      if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const idx = allDocuments.findIndex((d) => d.id === document.id);
        if (idx < 0) return;
        const nextIndex = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
        const nextDoc = allDocuments[nextIndex];
        if (nextDoc) onSelectDocument(nextDoc);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, allDocuments, document.id, onSelectDocument]);

  // Focus management for required fields
  useEffect(() => {
    if (!isOpen || !editor.settings) return;
    if (!editor.isError && !editor.isReview) return;

    const required = editor.settings.ocrConfig?.required_fields || [
      'belegDatum',
      'lieferantName',
      'bruttoBetrag',
    ];

    const tryFocus = (field: string): boolean => {
      if (field === 'belegDatum' && !editor.formData.belegDatum) {
        setMobileTab('data');
        requestAnimationFrame(() => editor.belegDatumRef.current?.focus());
        return true;
      }
      if (field === 'lieferantName' && !editor.formData.lieferantName) {
        setMobileTab('data');
        requestAnimationFrame(() => editor.lieferantNameRef.current?.focus());
        return true;
      }
      if (field === 'bruttoBetrag' && !editor.formData.bruttoBetrag) {
        setMobileTab('data');
        requestAnimationFrame(() => editor.bruttoBetragRef.current?.focus());
        return true;
      }
      return false;
    };

    for (const field of required) {
      if (tryFocus(field)) return;
    }
  }, [isOpen, document.id, editor.settings, editor.isError, editor.isReview, editor.formData]);

  if (!isOpen) return null;

  // Delete handler
  const handleDelete = async () => {
    if (confirm('Dokument wirklich löschen?')) {
      await onDelete(document.id);
      onClose();
    }
  };

  // Retry OCR with rate limiting
  const handleRetryOCR = async () => {
    try {
      await rateLimitWrapper(
        'ocr',
        async () => {
          await onRetryOCR(document);
        },
        exportRateLimiter
      );
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {
      // Validate before export
      const validation = validateDocumentData(editor.formData);
      if (!validation.isValid) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      // Rate limit
      await rateLimitWrapper(
        'export',
        async () => {
          await generatePdfReport([document]);
          toast.success('PDF wurde heruntergeladen');
        },
        exportRateLimiter
      );
    } catch (error: any) {
      toast.error(error.message || 'Export fehlgeschlagen');
    }
  };

  // Merge handler
  const handleMergeClick = (targetDoc: DocumentRecord) => {
    if (confirm(`Dokument verbinden mit ${targetDoc.fileName}?`)) {
      onMerge(targetDoc.id, document.id);
      editor.setShowMergeSearch(false);
      editor.setMergeQuery('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <DetailModalHeader
          document={document}
          onClose={onClose}
          onSave={editor.handleSaveNow}
          onDelete={handleDelete}
          onRetryOCR={handleRetryOCR}
        />

        {/* Validation View */}
        <ValidationView
          isDuplicate={editor.isDuplicate}
          isError={editor.isError}
          isReview={editor.isReview}
          errorMessage={editor.errorMessage}
          errorNextSteps={editor.errorNextSteps}
          shortcutHint={editor.shortcutHint}
          originalDoc={editor.originalDoc}
        />

        {/* Content - Split View for Desktop, Tabs for Mobile */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Document Preview */}
          <div
            className={`flex-1 overflow-hidden md:border-r ${
              mobileTab === 'preview' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <DocumentView
              viewUrl={editor.viewUrl}
              viewType={editor.viewType}
              document={document}
              activeFileIndex={editor.activeFileIndex}
              setActiveFileIndex={editor.setActiveFileIndex}
              onAddFileClick={editor.handleAddFileClick}
            />
          </div>

          {/* Editor */}
          <div
            className={`flex-1 overflow-hidden ${mobileTab === 'data' ? 'flex' : 'hidden md:flex'}`}
          >
            <EditorView
              formData={editor.formData}
              settings={editor.settings}
              onChange={editor.handleInputChange}
              onCheckboxChange={editor.handleCheckboxChange}
              onLineItemChange={editor.handleLineItemChange}
              onAddLineItem={editor.handleAddLineItem}
              onRemoveLineItem={editor.handleRemoveLineItem}
              onBlur={editor.handleBlur}
              belegDatumRef={editor.belegDatumRef}
              lieferantNameRef={editor.lieferantNameRef}
              bruttoBetragRef={editor.bruttoBetragRef}
            />
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex border-t bg-gray-50">
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 text-sm font-medium ${
              mobileTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Vorschau
          </button>
          <button
            onClick={() => setMobileTab('data')}
            className={`flex-1 py-2 text-sm font-medium ${
              mobileTab === 'data' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Daten
          </button>
        </div>

        {/* Actions */}
        <DetailModalActions
          onMergeClick={handleMergeClick}
          onExportPDF={handleExportPDF}
          showMergeSearch={editor.showMergeSearch}
          setShowMergeSearch={editor.setShowMergeSearch}
          mergeQuery={editor.mergeQuery}
          setMergeQuery={editor.setMergeQuery}
          filteredMergeCandidates={editor.filteredMergeCandidates}
        />

        {/* Hidden File Input */}
        <input
          ref={editor.fileInputRef}
          type="file"
          onChange={editor.handleFileChange}
          accept="application/pdf,image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};

// Convenience export
export { useDocumentEditor } from './hooks/useDocumentEditor';
export type { UseDocumentEditorProps, UseDocumentEditorReturn } from './hooks/useDocumentEditor';
