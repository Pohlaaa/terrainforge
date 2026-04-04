import React from 'react'

interface SectionHeadingProps {
  title: string
  subtitle?: string
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-[18px] font-[600] text-[var(--text-primary)]">{title}</h2>
    {subtitle && <p className="text-[13px] text-[var(--text-secondary)] mt-1">{subtitle}</p>}
  </div>
)
