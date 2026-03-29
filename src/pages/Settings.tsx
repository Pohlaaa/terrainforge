import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgStore } from '@/stores/orgStore';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { org, updateOrgName } = useOrgStore();
  const { projects, setProjects, setActiveProject } = useProjectStore();
  const { setMaterials } = useMaterialStore();
  const { setCrew } = useCrewStore();
  const { setEquipment } = useEquipmentStore();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState(org?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const hasDemoData = projects.some(p => p.isDemo === true);

  async function handleSaveOrgName() {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await updateOrgName(orgName.trim());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClearDemoData() {
    setProjects(projects.filter(p => !p.isDemo));
    setActiveProject(null);
    setMaterials([]);
    setCrew([]);
    setEquipment([]);
    setShowClearConfirm(false);
    navigate('/');
  }

  return (
    <div className="max-w-[640px]">
      <PageHeader title="Settings" subtitle="Account and app preferences" />

      {/* Account section */}
      <div className="mb-[24px]">
        <div className="text-[11px] font-[700] uppercase tracking-[0.1em] text-[var(--text-3)] mb-[12px]">Account</div>
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] divide-y divide-[var(--border)]">

          {/* Email — read only */}
          <div className="px-[20px] py-[16px] flex items-center justify-between gap-4">
            <div>
              <div className="text-[12px] font-[600] text-[var(--text-2)] mb-[2px]">Email address</div>
              <div className="text-[13px] text-[var(--text)]">{user?.email ?? '—'}</div>
            </div>
            <span className="text-[16px] opacity-40">🔒</span>
          </div>

          {/* Org name — editable */}
          <div className="px-[20px] py-[16px]">
            <div className="text-[12px] font-[600] text-[var(--text-2)] mb-[8px]">Company / Org name</div>
            <div className="flex gap-[8px] items-center">
              <input
                type="text"
                value={orgName}
                onChange={e => { setOrgName(e.target.value); setSaveStatus('idle'); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveOrgName(); }}
                placeholder="Your company name"
                className="flex-1 px-[10px] py-[7px] text-[13px] rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                onClick={handleSaveOrgName}
                disabled={isSaving || orgName.trim() === (org?.name ?? '')}
                className="px-[14px] py-[7px] text-[12px] font-[600] rounded-[6px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {saveStatus === 'saved' && (
              <div className="text-[11px] text-[var(--color-primary)] mt-[6px]">Saved successfully</div>
            )}
            {saveStatus === 'error' && (
              <div className="text-[11px] text-red-500 mt-[6px]">Failed to save — please try again</div>
            )}
          </div>

          {/* Billing shortcut */}
          <div className="px-[20px] py-[16px] flex items-center justify-between">
            <div>
              <div className="text-[12px] font-[600] text-[var(--text-2)] mb-[2px]">Subscription</div>
              <div className="text-[13px] text-[var(--text-3)] capitalize">
                {org?.subscriptionTier ?? 'starter'} · {org?.subscriptionStatus ?? 'trialing'}
              </div>
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="text-[12px] font-[500] text-[var(--color-primary)] hover:underline"
            >
              Manage subscription →
            </button>
          </div>
        </div>
      </div>

      {/* App section */}
      <div>
        <div className="text-[11px] font-[700] uppercase tracking-[0.1em] text-[var(--text-3)] mb-[12px]">App</div>
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px]">
          {hasDemoData ? (
            <div className="px-[20px] py-[16px]">
              <div className="text-[12px] font-[600] text-[var(--text-2)] mb-[4px]">Demo data</div>
              <div className="text-[12px] text-[var(--text-3)] mb-[12px] leading-relaxed">
                Demo projects, materials, crew, and equipment were loaded automatically when you signed up. Clear them when you're ready to use your own data.
              </div>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-[14px] py-[7px] text-[12px] font-[600] rounded-[6px] transition-colors"
                style={{ color: '#FB923C', backgroundColor: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.3)' }}
              >
                ⚠ Clear Demo Data
              </button>
            </div>
          ) : (
            <div className="px-[20px] py-[16px]">
              <div className="text-[12px] font-[600] text-[var(--text-2)] mb-[2px]">Demo data</div>
              <div className="text-[12px] text-[var(--text-3)]">No demo data found — you're working with your own data.</div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Demo Data"
        message="This will remove all demo projects, materials, crew, and equipment. Your account settings and billing will not be affected. This cannot be undone."
        confirmText="Start Fresh"
        confirmVariant="danger"
        onConfirm={handleClearDemoData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

export default Settings;
