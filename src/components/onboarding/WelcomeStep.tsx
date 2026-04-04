import React from 'react'
import { Button } from '@/components/ui/Button'

interface WelcomeStepProps {
  onContinue: () => void
  onSkip: () => void
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onContinue, onSkip }) => (
  <div className="text-center">
    <div className="text-5xl mb-6">&#x2B21;</div>
    <h1 className="text-[28px] font-[700] text-[var(--text-primary)] tracking-[-0.01em] mb-4">
      Welcome to TerrainForge
    </h1>
    <p className="text-[15px] text-[var(--text-secondary)] mb-2 leading-relaxed max-w-md mx-auto">
      The all-in-one platform for landscaping contractors. Manage projects, track crews and equipment, estimate budgets, and streamline your entire operation.
    </p>
    <p className="text-[14px] text-[var(--text-tertiary)] mb-10">
      Let's set up your account in about 2 minutes.
    </p>
    <Button variant="primary" onClick={onContinue} className="w-full h-[48px] text-[15px]">
      Let's get started
    </Button>
    <button
      onClick={onSkip}
      className="mt-4 text-[14px] bg-transparent border-none cursor-pointer transition-colors block mx-auto"
      style={{ color: 'rgba(255,255,255,0.5)' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
    >
      I'll set this up later &rarr;
    </button>
  </div>
)
