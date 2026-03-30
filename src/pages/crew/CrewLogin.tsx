/**
 * CrewLogin — PIN-based login for crew members.
 *
 * Flow:
 *   1. Enter company code (org shortcode)
 *   2. Pick your name from the crew list
 *   3. Enter your PIN
 *   4. Session saved to localStorage, redirect to /crew
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrgByShortcode, fetchCrewForLogin } from '@/services/supabaseData';
import { verifyPin, isValidPin, saveCrewSession } from '@/lib/pin';

type Step = 'code' | 'pick' | 'pin';

interface CrewOption {
  id: string;
  name: string;
  role: string;
  pinHash: string | null;
}

export const CrewLogin: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('code');
  const [shortcode, setShortcode] = useState('');
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string } | null>(null);
  const [crewList, setCrewList] = useState<CrewOption[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewOption | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (shortcode.trim().length < 3) {
      setError('Enter a valid company code');
      return;
    }
    setLoading(true);
    setError('');
    const org = await fetchOrgByShortcode(shortcode.trim());
    if (!org) {
      setError('Company not found. Check the code and try again.');
      setLoading(false);
      return;
    }
    setOrgInfo(org);
    const crew = await fetchCrewForLogin(org.id);
    if (crew.length === 0) {
      setError('No crew members found for this company.');
      setLoading(false);
      return;
    }
    setCrewList(crew);
    setStep('pick');
    setLoading(false);
  }

  function handlePickCrew(member: CrewOption) {
    setSelectedCrew(member);
    setPin('');
    setError('');
    if (!member.pinHash) {
      // No PIN set — log in directly (MVP fallback)
      if (orgInfo) {
        saveCrewSession(member.id, orgInfo.id);
      }
      navigate('/crew');
      return;
    }
    setStep('pin');
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCrew || !orgInfo) return;
    if (!isValidPin(pin)) {
      setError('Enter a 4-6 digit PIN');
      return;
    }
    setLoading(true);
    setError('');
    const valid = await verifyPin(pin, selectedCrew.pinHash!);
    if (!valid) {
      setError('Incorrect PIN. Try again.');
      setLoading(false);
      return;
    }
    saveCrewSession(selectedCrew.id, orgInfo.id);
    navigate('/crew');
  }

  const ROLE_COLORS: Record<string, string> = {
    foreman: 'var(--status-green)',
    lead: 'var(--teal, #14B8A6)',
    installer: 'var(--status-blue)',
    laborer: 'var(--status-amber)',
    specialist: 'var(--purple, #A78BFA)',
    apprentice: 'var(--status-amber)',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(180deg, var(--surface-bg) 0%, var(--surface-hover) 100%)' }}
    >
      <div
        className="w-full max-w-[380px] p-6"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 mb-3"
            style={{
              background: 'var(--sidebar-active)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--sidebar-accent)',
              fontSize: '18px',
              fontWeight: 800,
            }}
          >
            TF
          </div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Crew Login
          </h1>
          {orgInfo && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {orgInfo.name}
            </p>
          )}
        </div>

        {/* Step 1: Company code */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Company Code
            </label>
            <input
              type="text"
              value={shortcode}
              onChange={e => { setShortcode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="e.g. A3F9K2"
              maxLength={6}
              className="w-full px-3 py-3 text-center text-lg font-mono font-bold tracking-[0.15em] mb-3"
              style={{
                background: 'var(--surface-bg)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
            {error && (
              <p className="text-xs mb-3" style={{ color: 'var(--status-red)' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold text-white border-none cursor-pointer transition-colors"
              style={{
                background: 'var(--brand-primary)',
                borderRadius: 'var(--radius-md)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Looking up…' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2: Pick crew member */}
        {step === 'pick' && (
          <div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Who are you?
            </p>
            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
              {crewList.map(member => (
                <button
                  key={member.id}
                  onClick={() => handlePickCrew(member)}
                  className="w-full text-left px-3 py-3 flex items-center gap-3 border-none cursor-pointer transition-all duration-100"
                  style={{
                    background: 'var(--surface-bg)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-bg)'; }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: ROLE_COLORS[member.role] || 'var(--status-gray)' }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{member.name}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>
                      {member.role}
                    </div>
                  </div>
                  {member.pinHash && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>🔒</span>
                  )}
                </button>
              ))}
            </div>
            {error && (
              <p className="text-xs mt-2" style={{ color: 'var(--status-red)' }}>{error}</p>
            )}
            <button
              onClick={() => { setStep('code'); setError(''); setShortcode(''); }}
              className="w-full mt-3 py-2 text-xs bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ← Different company
            </button>
          </div>
        )}

        {/* Step 3: Enter PIN */}
        {step === 'pin' && selectedCrew && (
          <form onSubmit={handlePinSubmit}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {selectedCrew.name}
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Enter your PIN to continue
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="••••"
              maxLength={6}
              className="w-full px-3 py-3 text-center text-2xl font-mono tracking-[0.3em] mb-3"
              style={{
                background: 'var(--surface-bg)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
            {error && (
              <p className="text-xs mb-3" style={{ color: 'var(--status-red)' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold text-white border-none cursor-pointer transition-colors"
              style={{
                background: 'var(--brand-primary)',
                borderRadius: 'var(--radius-md)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Verifying…' : 'Log In'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('pick'); setError(''); setPin(''); }}
              className="w-full mt-2 py-2 text-xs bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ← Different person
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CrewLogin;
