/**
 * PIN hashing and verification using Web Crypto API (SHA-256).
 * Used for crew member PIN-based authentication.
 */

/** Hash a PIN string to SHA-256 hex. */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Verify a PIN against a stored hash. */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}

/** Validate PIN format: 4-6 digits only. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/** Crew session stored in localStorage. */
export interface CrewSession {
  crewMemberId: string;
  orgId: string;
  expiresAt: number; // Unix timestamp ms
}

const CREW_SESSION_KEY = 'tf_crew_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Save a crew session to localStorage. */
export function saveCrewSession(crewMemberId: string, orgId: string): void {
  const session: CrewSession = {
    crewMemberId,
    orgId,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  localStorage.setItem(CREW_SESSION_KEY, JSON.stringify(session));
  // Also set the legacy key for backward compat with CrewDashboard/CrewLayout
  localStorage.setItem('tf_crew_member_id', crewMemberId);
}

/** Get the current crew session, or null if expired/missing. */
export function getCrewSession(): CrewSession | null {
  const raw = localStorage.getItem(CREW_SESSION_KEY);
  if (!raw) return null;
  try {
    const session: CrewSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      clearCrewSession();
      return null;
    }
    return session;
  } catch {
    clearCrewSession();
    return null;
  }
}

/** Clear crew session from localStorage. */
export function clearCrewSession(): void {
  localStorage.removeItem(CREW_SESSION_KEY);
  localStorage.removeItem('tf_crew_member_id');
}
