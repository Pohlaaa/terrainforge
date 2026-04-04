import React, { useState } from 'react'
import { SectionHeading } from './SectionHeading'

function applyTheme(newTheme: 'light' | 'dark' | 'system') {
  localStorage.setItem('tf-theme', newTheme)
  if (newTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', newTheme)
  }
}

export const PreferencesSection: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() =>
    (localStorage.getItem('tf-theme') as 'light' | 'dark' | 'system') || 'light'
  )

  const [projectView, setProjectView] = useState<'cards' | 'list'>(() => {
    const saved = localStorage.getItem('tf-projects-view')
    return (saved === 'list' || saved === 'cards') ? saved : 'cards'
  })

  function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  function handleProjectViewChange(mode: 'cards' | 'list') {
    setProjectView(mode)
    localStorage.setItem('tf-projects-view', mode)
  }

  return (
    <div>
      <SectionHeading title="Preferences" subtitle="Customize your experience" />

      {/* Theme */}
      <div className="mb-8">
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-4">Theme</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'light' as const, icon: '\u2600\uFE0F', label: 'Light', gradient: 'from-[#FAFAFA] to-[#FFFFFF]', dir: 'b' },
            { id: 'dark' as const, icon: '\uD83C\uDF19', label: 'Dark', gradient: 'from-[#0F172A] to-[#1E293B]', dir: 'b' },
            { id: 'system' as const, icon: '\uD83D\uDCBB', label: 'System', gradient: 'from-[#FAFAFA] via-[#FAFAFA] to-[#0F172A]', dir: 'r' },
          ].map(t => (
            <div
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                theme === t.id
                  ? 'border-[var(--brand-primary)] bg-[var(--surface-selected)] shadow-[var(--shadow-card)]'
                  : 'border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]'
              }`}
            >
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                  <span className="text-white text-[10px]">&#10003;</span>
                </div>
              )}
              <div
                className={`w-full h-[60px] rounded-lg mb-3 border border-[var(--border-light)] bg-gradient-to-${t.dir} ${t.gradient}`}
              />
              <div className="text-[20px] mb-1">{t.icon}</div>
              <div className="text-[13px] font-[500] text-[var(--text-primary)]">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Default project view */}
      <div>
        <div className="text-[14px] font-[500] text-[var(--text-primary)] mb-4">Default project view</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'cards' as const, icon: '\u25A6', label: 'Card view' },
            { id: 'list' as const, icon: '\u2630', label: 'List view' },
          ].map(v => (
            <div
              key={v.id}
              onClick={() => handleProjectViewChange(v.id)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                projectView === v.id
                  ? 'border-[var(--brand-primary)] bg-[var(--surface-selected)] shadow-[var(--shadow-card)]'
                  : 'border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]'
              }`}
            >
              {projectView === v.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                  <span className="text-white text-[10px]">&#10003;</span>
                </div>
              )}
              <div className="text-[24px] mb-2 text-[var(--text-secondary)]">{v.icon}</div>
              <div className="text-[13px] font-[500] text-[var(--text-primary)]">{v.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
