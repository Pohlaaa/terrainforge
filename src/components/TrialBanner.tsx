/**
 * TrialBanner — persistent banner shown to trialing users with escalating urgency.
 *
 * Visual states:
 *  - Days 14-8 (relaxed): green-tinted, dismissible per session
 *  - Days 7-3  (nudge):   amber-tinted, NOT dismissible
 *  - Days 2-1  (urgent):  red-tinted, NOT dismissible
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface TrialBannerProps {
  daysRemaining: number;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ daysRemaining }) => {
  const [dismissed, setDismissed] = useState(false);

  // Determine visual state
  const isRelaxed = daysRemaining >= 8;
  const isNudge = daysRemaining >= 3 && daysRemaining <= 7;
  const isUrgent = daysRemaining <= 2;

  // Relaxed banners can be dismissed for the session
  if (isRelaxed && dismissed) return null;

  // ── Text ────────────────────────────────────────────────────────────────
  let message: string;
  if (isUrgent) {
    message = daysRemaining <= 1
      ? 'Your trial ends today! Subscribe now to keep full access.'
      : 'Your trial ends tomorrow! Subscribe now to keep full access.';
  } else if (isNudge) {
    message = `Your free trial ends in ${daysRemaining} days. Subscribe now to keep your projects.`;
  } else {
    message = `You're on a 14-day free trial. ${daysRemaining} days remaining.`;
  }

  // ── Styles per state ────────────────────────────────────────────────────
  const bgStyle = isUrgent
    ? 'rgba(153, 27, 27, 0.2)'
    : isNudge
    ? 'rgba(146, 64, 14, 0.2)'
    : 'rgba(45, 106, 79, 0.15)';

  const borderStyle = isUrgent
    ? 'rgba(153, 27, 27, 0.4)'
    : isNudge
    ? 'rgba(146, 64, 14, 0.4)'
    : 'rgba(45, 106, 79, 0.3)';

  const accentColor = isUrgent ? '#DC2626' : isNudge ? '#D97706' : 'var(--green-l)';

  const height = isUrgent ? '48px' : isNudge ? '44px' : '40px';

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between gap-3 px-5"
      style={{
        background: bgStyle,
        borderBottom: `1px solid ${borderStyle}`,
        minHeight: height,
      }}
    >
      <span className="text-[14px]" style={{ color: 'var(--text-2)' }}>
        {message}
      </span>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          to="/billing"
          className="text-[13px] font-semibold no-underline transition-colors px-3 py-1 rounded-md"
          style={
            isUrgent
              ? { background: '#DC2626', color: '#fff' }
              : isNudge
              ? { border: `1px solid ${accentColor}`, color: accentColor }
              : { color: accentColor }
          }
        >
          {isUrgent ? 'Subscribe Now' : isNudge ? 'View Plans' : 'Choose a Plan'}
        </Link>
        {isRelaxed && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss trial banner"
            className="text-[16px] leading-none bg-transparent border-none cursor-pointer p-[2px] transition-colors"
            style={{ color: accentColor }}
          >
            &#x2715;
          </button>
        )}
      </div>
    </div>
  );
};

export default TrialBanner;
