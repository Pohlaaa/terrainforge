import React from 'react';

const BudgetHub: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 text-center">
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="text-4xl mb-4">📊</div>
        <h1
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Budget & Finance
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          Coming soon — org-wide financial overview with revenue/expense charts,
          expense breakdown, and project budget tracking.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Total Revenue', 'Total Expenses', 'Net Profit', 'Outstanding'].map((label) => (
            <div
              key={label}
              className="rounded-lg p-4 kpi-card-accent"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {label}
              </div>
              <div
                className="text-lg font-semibold"
                style={{ color: 'var(--text-disabled)' }}
              >
                —
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetHub;
