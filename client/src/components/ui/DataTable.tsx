import React from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Inbox, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  // Actions & Filters
  filters?: React.ReactNode;
  headerActions?: React.ReactNode;
  onClearFilters?: () => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalRecords = 0,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSort,
  filters,
  headerActions,
  onClearFilters,
  emptyMessage = 'No records found matching criteria.',
}: DataTableProps<T>) {
  return (
    <div className="w-full space-y-4">
      {/* Search, Filters, and Actions toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {onSearchChange && (
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition"
              />
            </div>
          )}
          {filters}
          {onClearFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} icon={<RotateCcw className="w-3.5 h-3.5" />}>
              Reset
            </Button>
          )}
        </div>
        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/75 dark:bg-slate-950/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-3.5 px-4 sm:px-6 select-none ${col.className || ''}`}
                    onClick={() => {
                      if (col.sortable && col.accessorKey && onSort) {
                        onSort(col.accessorKey as string);
                      }
                    }}
                  >
                    <div className={`flex items-center gap-1.5 ${col.sortable ? 'cursor-pointer hover:text-slate-900 dark:hover:text-slate-200' : ''}`}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <ArrowUpDown className={`w-3.5 h-3.5 transition ${sortBy === col.accessorKey ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 opacity-60'}`} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-300">
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((_, colIdx) => (
                      <td key={colIdx} className="py-4 px-4 sm:px-6">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                    <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{emptyMessage}</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition duration-150"
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`py-3.5 px-4 sm:px-6 align-middle ${col.className || ''}`}>
                        {col.cell ? col.cell(row) : (row as any)[col.accessorKey as string]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {onPageChange && totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-800 dark:text-slate-200">{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                <strong className="text-slate-800 dark:text-slate-200">{Math.min(totalRecords, currentPage * pageSize)}</strong> of{' '}
                <strong className="text-slate-800 dark:text-slate-200">{totalRecords}</strong> entries
              </span>
              {onPageSizeChange && (
                <div className="flex items-center gap-1.5 ml-2">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs py-1 px-2 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-800 dark:text-slate-200">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
