import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  sortable?: boolean;
}

export const DataTable = React.forwardRef<
  HTMLTableElement,
  DataTableProps<any>
>(({ data, columns, onRowClick, sortable = false }, ref) => {
  return (
    <div className="overflow-x-auto border rounded-[10px] border-[var(--border)]">
      <table ref={ref} className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.accessor)}
                className="bg-[var(--green)] text-white px-[14px] py-[10px] text-left text-[10px] font-[700] uppercase tracking-[0.05em]"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className="border-b border-[var(--border)] hover:bg-[rgba(45,106,79,.06)] transition-colors duration-150 cursor-pointer odd:bg-[rgba(255,255,255,.02)]"
            >
              {columns.map((col) => (
                <td
                  key={String(col.accessor)}
                  className="px-[14px] py-[10px] text-[var(--text-2)] align-middle"
                >
                  {col.render
                    ? col.render(row[col.accessor], row)
                    : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

DataTable.displayName = 'DataTable';

export default DataTable;
