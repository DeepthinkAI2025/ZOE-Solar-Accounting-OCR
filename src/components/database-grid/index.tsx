/**
 * DatabaseGrid - Refactored (2026 Best Practices)
 * Split into smaller components + custom hook for logic
 */

import { DocumentRecord } from '../../types';

// Hooks
import { useTableState } from './hooks/useTableState';

// Sub-components
import { FilterBar } from './FilterBar';
import { TableRow } from './TableRow';
import { Pagination } from './Pagination';
import { BulkActions } from './BulkActions';

// Services
import { rateLimitWrapper, exportRateLimiter } from '../../services/rateLimiter';
import { generatePdfReport, generateCSVExport } from '../../services/exportService';
import { toast } from 'react-hot-toast';

interface DatabaseGridProps {
  documents: DocumentRecord[];
  onOpen: (doc: DocumentRecord) => void;
  onDelete: (id: string) => void;
  onMerge: (sourceId: string, targetId: string) => void;
  onDuplicateCompare: (doc: DocumentRecord) => void;
}

export const DatabaseGrid: React.FC<DatabaseGridProps> = ({
  documents,
  onOpen,
  onDelete,
  onMerge,
  onDuplicateCompare,
}) => {
  const table = useTableState(documents);

  // Handlers
  const handleExport = async (doc: DocumentRecord) => {
    try {
      await rateLimitWrapper(
        'export',
        async () => {
          await generatePdfReport([doc]);
          toast.success('PDF Export erfolgreich');
        },
        exportRateLimiter
      );
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Dokument wirklich löschen?')) {
      await onDelete(id);
      toast.success('Dokument gelöscht');
    }
  };

  // Bulk Actions
  const handleBulkExport = async () => {
    try {
      const selectedDocs = documents.filter((d) => table.selectedIds.has(d.id));
      await rateLimitWrapper(
        'export',
        async () => {
          await generatePdfReport(selectedDocs);
          toast.success(`${selectedDocs.length} PDFs exportiert`);
        },
        exportRateLimiter
      );
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBulkExportCSV = async () => {
    try {
      const selectedDocs = documents.filter((d) => table.selectedIds.has(d.id));
      await rateLimitWrapper(
        'export',
        async () => {
          await generateCSVExport(selectedDocs);
          toast.success('CSV Export erfolgreich');
        },
        exportRateLimiter
      );
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Alle ${table.selectedIds.size} ausgewählten Dokumente löschen?`)) return;

    for (const id of table.selectedIds) {
      await onDelete(id);
    }
    table.clearSelection();
    toast.success('Dokumente gelöscht');
  };

  const handleBulkMarkPrivate = async () => {
    toast.success('In Entwicklung...'); // Placeholder
  };

  return (
    <div className="flex flex-col bg-surface border-border rounded-lg overflow-hidden border">
      {/* Filter Bar */}
      <FilterBar
        filters={table.filters}
        onFilterChange={table.updateFilters}
        onReset={table.resetFilters}
        selectionCount={table.selectionCount}
        onSelectAll={table.selectAll}
        onClearSelection={table.clearSelection}
        selectedIds={table.selectedIds}
        totalItems={table.totalItems}
      />

      {/* Bulk Actions */}
      {table.hasSelection && (
        <BulkActions
          selectedIds={table.selectedIds}
          onBulkExport={handleBulkExport}
          onBulkDelete={handleBulkDelete}
          onBulkMarkPrivate={handleBulkMarkPrivate}
          onBulkExportCSV={handleBulkExportCSV}
        />
      )}

      {/* Empty State */}
      {table.sortedDocuments.length === 0 && (
        <div className="p-8 text-center text-text-muted">
          <svg
            className="w-16 h-16 mx-auto mb-2 opacity-30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p>Keine Dokumente gefunden</p>
        </div>
      )}

      {/* Table */}
      {table.sortedDocuments.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface border-b border-border sticky top-0 z-10">
                <tr className="border-b">
                  <th className="p-2">
                    <input
                      type="checkbox"
                      checked={table.selectionCount === table.totalItems && table.totalItems > 0}
                      onChange={table.selectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="p-2 text-xs font-semibold text-gray-600">ZOE-ID</th>
                  <th
                    className="p-2 text-xs font-semibold text-gray-600 cursor-pointer"
                    onClick={() => table.sortBy('uploadDate' as any)}
                  >
                    Datum{' '}
                    {table.sortField === 'uploadDate'
                      ? table.sortDirection === 'asc'
                        ? '↑'
                        : '↓'
                      : ''}
                  </th>
                  <th
                    className="p-2 text-xs font-semibold text-gray-600 cursor-pointer"
                    onClick={() => table.sortBy('lieferantName' as any)}
                  >
                    Lieferant{' '}
                    {table.sortField === 'lieferantName'
                      ? table.sortDirection === 'asc'
                        ? '↑'
                        : '↓'
                      : ''}
                  </th>
                  <th
                    className="p-2 text-xs font-semibold text-gray-600 cursor-pointer"
                    onClick={() => table.sortBy('amountBrutto' as any)}
                  >
                    Betrag{' '}
                    {table.sortField === 'amountBrutto'
                      ? table.sortDirection === 'asc'
                        ? '↑'
                        : '↓'
                      : ''}
                  </th>
                  <th className="p-2 text-xs font-semibold text-gray-600">Konto</th>
                  <th className="p-2 text-xs font-semibold text-gray-600">Status</th>
                  <th className="p-2 text-xs font-semibold text-gray-600 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {table.paginatedDocuments.map((doc) => (
                  <TableRow
                    key={doc.id}
                    document={doc}
                    isSelected={table.selectedIds.has(doc.id)}
                    onToggleSelect={() => table.toggleSelection(doc.id)}
                    onOpen={() => onOpen(doc)}
                    onExport={() => handleExport(doc)}
                    onDelete={() => handleDelete(doc.id)}
                    onDuplicate={() => onDuplicateCompare(doc)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            totalItems={table.totalItems}
            itemsPerPage={table.itemsPerPage}
            hasPrev={table.hasPrev}
            hasMore={table.hasMore}
            onPrev={table.prevPage}
            onNext={table.nextPage}
            onGoToPage={table.goToPage}
          />
        </>
      )}
    </div>
  );
};

// Export hooks for advanced usage
export { useTableState };
export type { FilterState } from './hooks/useTableState';
