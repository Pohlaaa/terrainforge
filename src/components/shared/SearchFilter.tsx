import React from 'react';

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterValue: string;
  onFilterChange: (value: string) => void;
  placeholder?: string;
  filterOptions: { value: string; label: string }[];
  filterLabel?: string;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchValue,
  onSearchChange,
  filterValue,
  onFilterChange,
  placeholder = 'Search...',
  filterOptions,
  filterLabel = 'Filter',
}) => {
  return (
    <div className="flex gap-[8px] items-center flex-wrap">
      <input
        type="text"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="px-[10px] py-[6px] text-[12px] bg-[var(--surface2)] border border-[var(--border)] rounded-[6px] text-[var(--text)] outline-none focus:border-[var(--green-l)]"
      />
      <select
        value={filterValue}
        onChange={(e) => onFilterChange(e.target.value)}
        className="px-[10px] py-[6px] text-[12px] bg-[var(--surface2)] border border-[var(--border)] rounded-[6px] text-[var(--text)] cursor-pointer outline-none focus:border-[var(--green-l)]"
      >
        <option value="">{filterLabel}</option>
        {filterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SearchFilter;
