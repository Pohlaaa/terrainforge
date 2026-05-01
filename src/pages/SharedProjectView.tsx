import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  fetchSharedProjectByToken,
  respondToShareToken,
  clientUpdateElementGeometry,
  submitDesignChanges,
} from '@/services/supabaseShareTokens'
import type { ElementGeometry, Project, ProjectElement, ShareToken, Material } from '@/types'
import PlanView2D from '@/components/plan/PlanView2D'
import PlanView3D from '@/components/plan/PlanView3D'
import { ELEMENT_TYPE_LABELS } from '@/lib/elements'

// ===== SharedProjectView =====
//
// Public route: /share/:token
// No auth. Anon RLS policies from migration 028 scope every SELECT through
// the token row. If the token is invalid, revoked, or expired, we show a
// "Link not available" screen instead of the project.
//
// Sprint 2 Phase B adds client approve / request-changes.

const SharedProjectView: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | {
        status: 'ready'
        project: Project
        elements: ProjectElement[]
        tokenRow: ShareToken
        materialsById: Record<string, Material>
        companyName: string | null
      }
  >({ status: 'loading' })
  const [responding, setResponding] = useState<'approved' | 'changes_requested' | null>(null)
  const [note, setNote] = useState('')
  const [noteFormFor, setNoteFormFor] = useState<'approved' | 'changes_requested' | null>(null)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')

  // Phase C v0: client design edit state
  const [submitOpen, setSubmitOpen] = useState(false)
  const [designNote, setDesignNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'Missing share token.' })
      return
    }
    fetchSharedProjectByToken(token).then((result) => {
      if (!result) {
        setState({
          status: 'error',
          message:
            'This link is no longer valid. It may have expired or been revoked. Contact your contractor for a fresh link.',
        })
        return
      }
      setState({
        status: 'ready',
        project: result.project,
        elements: result.elements,
        tokenRow: result.token,
        materialsById: result.materialsById,
        companyName: result.companyName,
      })
    })
  }, [token])

  // Phase C v0: client edits one element's geometry. Optimistic — update
  // local state immediately, then call the RPC. On failure, reload from
  // server (cheapest correctness recovery for an anon flow).
  async function handleClientGeometryChange(elementId: string, geometry: ElementGeometry) {
    if (!token || state.status !== 'ready') return
    setEditError(null)
    // Optimistic local update so the canvas visually settles instantly.
    setState({
      ...state,
      elements: state.elements.map((el) =>
        el.id === elementId ? { ...el, geometry } : el,
      ),
    })
    const result = await clientUpdateElementGeometry(token, elementId, geometry)
    if (!result.ok) {
      setEditError(result.error)
      // Refetch to revert (cheaper than tracking pre-edit state)
      const refresh = await fetchSharedProjectByToken(token)
      if (refresh) {
        setState({
          status: 'ready',
          project: refresh.project,
          elements: refresh.elements,
          tokenRow: refresh.token,
          materialsById: refresh.materialsById,
          companyName: refresh.companyName,
        })
      }
    }
  }

  async function handleSubmitDesign() {
    if (!token || state.status !== 'ready') return
    setSubmitting(true)
    const trimmed = designNote.trim()
    const result = await submitDesignChanges(token, trimmed || undefined)
    setSubmitting(false)
    if (!result.ok) return
    // Stamp local state so the UI flips to "submitted"
    setState({
      ...state,
      tokenRow: {
        ...state.tokenRow,
        clientChangesSubmittedAt: new Date().toISOString(),
        clientChangesNote: trimmed || null,
      },
    })
    setSubmitOpen(false)
    setDesignNote('')
  }

  async function handleSubmitResponse(response: 'approved' | 'changes_requested') {
    if (!token || state.status !== 'ready') return
    setResponding(response)
    const trimmed = note.trim()
    const result = await respondToShareToken(token, response, trimmed || undefined)
    setResponding(null)
    if (!result.ok) {
      // Keep the form open so the client can retry
      return
    }
    // Stamp local state with the response so the UI flips immediately
    setState({
      ...state,
      tokenRow: {
        ...state.tokenRow,
        clientResponse: response,
        clientRespondedAt: new Date().toISOString(),
        clientNote: trimmed || null,
      },
    })
    setNoteFormFor(null)
    setNote('')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-bg, #0A0A0A)',
        color: 'var(--text-primary, #F9FAFB)',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Branded header */}
        <header style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--text-tertiary, #9CA3AF)',
            }}
          >
            {/* F-CW-15b: surface contractor's company name first so the
                client recognizes whose proposal they're viewing. Falls back
                to "Your contractor" when org name lookup fails (anon RLS
                may return null on legacy projects). */}
            <span
              style={{
                fontWeight: 600,
                color: 'var(--text-primary, #F9FAFB)',
                fontSize: 14,
              }}
            >
              {state.status === 'ready' ? (state.companyName ?? 'Your contractor') : ' '}
            </span>
            <span>·</span>
            <span>Design proposal</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>
              powered by{' '}
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  color: 'var(--brand-primary, #10B981)',
                }}
              >
                TerrainForge
              </span>
            </span>
          </div>

          {state.status === 'ready' && (
            <>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  marginBottom: 4,
                  color: 'var(--text-primary, #F9FAFB)',
                }}
              >
                {state.project.name}
              </h1>
              {state.project.address && (
                <div style={{ fontSize: 14, color: 'var(--text-tertiary, #9CA3AF)' }}>
                  {state.project.address}
                </div>
              )}
            </>
          )}
        </header>

        {state.status === 'loading' && (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: 'var(--text-tertiary, #9CA3AF)',
            }}
          >
            Loading your project preview…
          </div>
        )}

        {state.status === 'error' && (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              border: '1px solid var(--border-default, #374151)',
              borderRadius: 12,
              background: 'var(--surface-card, #111827)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Link not available</h2>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary, #9CA3AF)' }}>{state.message}</p>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            {/* Phase C v0: client_design role banner */}
            {state.tokenRow.role === 'client_design' && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #10B981',
                  background: 'rgba(16,185,129,0.08)',
                  fontSize: 13,
                  color: 'var(--text-primary, #F9FAFB)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>✎</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Edit mode</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary, #9CA3AF)' }}>
                    Click any element on the canvas to select it, then drag to move, or use the
                    rotate / resize handles. Submit your changes when you're done.
                  </div>
                </div>
              </div>
            )}

            <section style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  justifyContent: 'flex-end',
                  marginBottom: 12,
                }}
                role="tablist"
                aria-label="View mode"
              >
                {(['2d', '3d'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border-default, #374151)',
                      background: viewMode === mode ? '#10B981' : 'transparent',
                      color: viewMode === mode ? '#fff' : 'var(--text-secondary, #D1D5DB)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {viewMode === '2d' ? (
                <PlanView2D
                  elements={state.elements}
                  height={560}
                  labelMode="full"
                  backdrop={
                    state.project.lat != null && state.project.lng != null
                      ? { lat: state.project.lat, lng: state.project.lng }
                      : null
                  }
                  editable={state.tokenRow.role === 'client_design'}
                  onElementGeometryChange={
                    state.tokenRow.role === 'client_design' ? handleClientGeometryChange : undefined
                  }
                  buildableArea={state.project.buildableAreaGeometry ?? null}
                  obstacles={state.project.obstaclesGeometry ?? []}
                  lotGeometry={state.project.lotGeometry ?? null}
                />
              ) : (
                <PlanView3D
                  elements={state.elements}
                  height={560}
                  backdrop={
                    state.project.lat != null && state.project.lng != null
                      ? { lat: state.project.lat, lng: state.project.lng }
                      : null
                  }
                  materialsById={state.materialsById}
                  editable={state.tokenRow.role === 'client_design'}
                  onElementGeometryChange={
                    state.tokenRow.role === 'client_design' ? handleClientGeometryChange : undefined
                  }
                  buildableArea={state.project.buildableAreaGeometry ?? null}
                  obstacles={state.project.obstaclesGeometry ?? []}
                />
              )}
              {editError && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #F59E0B',
                    background: 'rgba(245,158,11,0.08)',
                    fontSize: 12,
                    color: '#F59E0B',
                  }}
                >
                  Couldn't save that change: {editError}. Try again or refresh the page.
                </div>
              )}
            </section>

            <section>
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 12,
                  color: 'var(--text-secondary, #D1D5DB)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Elements in this design
              </h2>
              {state.elements.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-tertiary, #9CA3AF)',
                    padding: 16,
                    border: '1px dashed var(--border-default, #374151)',
                    borderRadius: 8,
                  }}
                >
                  Your contractor hasn't added measurements yet.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 12,
                  }}
                >
                  {state.elements.map((el) => (
                    <div
                      key={el.id}
                      style={{
                        padding: 14,
                        border: '1px solid var(--border-default, #374151)',
                        borderRadius: 10,
                        background: 'var(--surface-card, #111827)',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{el.name}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-tertiary, #9CA3AF)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          marginBottom: 8,
                        }}
                      >
                        {ELEMENT_TYPE_LABELS[el.elementType] ?? el.elementType}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary, #D1D5DB)' }}>
                        {formatDimensions(el)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Phase C v0: client_design submit-for-review panel. Otherwise
                fall through to the Phase B approve/request-changes flow. */}
            {state.tokenRow.role === 'client_design' && (
              <section style={{ marginTop: 32 }}>
                {state.tokenRow.clientChangesSubmittedAt ? (
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      border: '1px solid #10B981',
                      background: 'rgba(16,185,129,0.08)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#10B981',
                        marginBottom: 6,
                      }}
                    >
                      ✓ Design submitted
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary, #9CA3AF)' }}>
                      Submitted{' '}
                      {new Date(state.tokenRow.clientChangesSubmittedAt).toLocaleString()}.
                      Your contractor has been notified — they'll review and follow up.
                    </div>
                    {state.tokenRow.clientChangesNote && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 10,
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.04)',
                          fontSize: 13,
                          color: 'var(--text-secondary, #D1D5DB)',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--text-tertiary, #9CA3AF)',
                            marginBottom: 4,
                          }}
                        >
                          Your note
                        </div>
                        {state.tokenRow.clientChangesNote}
                      </div>
                    )}
                    <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary, #9CA3AF)' }}>
                      You can keep tweaking and resubmit if you change your mind.
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmitOpen(true)}
                      style={{
                        marginTop: 8,
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: '1px solid var(--border-default, #374151)',
                        background: 'transparent',
                        color: 'var(--text-secondary, #D1D5DB)',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Resubmit
                    </button>
                  </div>
                ) : submitOpen ? (
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      border: '1px solid var(--border-default, #374151)',
                      background: 'var(--surface-card, #111827)',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                      Anything to tell your contractor about your changes?
                    </div>
                    <textarea
                      value={designNote}
                      onChange={(e) => setDesignNote(e.target.value)}
                      maxLength={2000}
                      rows={4}
                      placeholder="Optional — e.g. &quot;Moved the patio further from the deck and made the bed smaller.&quot;"
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid var(--border-default, #374151)',
                        background: 'var(--surface-bg, #0A0A0A)',
                        color: 'var(--text-primary, #F9FAFB)',
                        fontSize: 13,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        marginBottom: 12,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => { setSubmitOpen(false); setDesignNote('') }}
                        disabled={submitting}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 8,
                          border: '1px solid var(--border-default, #374151)',
                          background: 'transparent',
                          color: 'var(--text-secondary, #D1D5DB)',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitDesign}
                        disabled={submitting}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#10B981',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {submitting ? 'Sending…' : 'Submit changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      border: '1px solid var(--border-default, #374151)',
                      background: 'var(--surface-card, #111827)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                      Done editing?
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary, #9CA3AF)', marginBottom: 16 }}>
                      Submit your changes for your contractor to review.
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmitOpen(true)}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#10B981',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Submit design changes
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Approve / Request changes (Phase B — migration 029). */}
            {state.tokenRow.role !== 'client_design' && (
            <section style={{ marginTop: 32 }}>
              {state.tokenRow.clientResponse ? (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: `1px solid ${state.tokenRow.clientResponse === 'approved' ? '#10B981' : '#F59E0B'}`,
                    background:
                      state.tokenRow.clientResponse === 'approved'
                        ? 'rgba(16,185,129,0.08)'
                        : 'rgba(245,158,11,0.08)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: state.tokenRow.clientResponse === 'approved' ? '#10B981' : '#F59E0B',
                      marginBottom: 6,
                    }}
                  >
                    {state.tokenRow.clientResponse === 'approved'
                      ? '✓ Design approved'
                      : '✎ Changes requested'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary, #9CA3AF)' }}>
                    Your contractor has been notified. You can close this page.
                  </div>
                  {state.tokenRow.clientNote && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 10,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)',
                        fontSize: 13,
                        color: 'var(--text-secondary, #D1D5DB)',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary, #9CA3AF)', marginBottom: 4 }}>
                        Your note
                      </div>
                      {state.tokenRow.clientNote}
                    </div>
                  )}
                </div>
              ) : noteFormFor ? (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: '1px solid var(--border-default, #374151)',
                    background: 'var(--surface-card, #111827)',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                    {noteFormFor === 'approved'
                      ? 'Anything to tell your contractor?'
                      : 'What needs to change?'}
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder={noteFormFor === 'approved' ? 'Optional — e.g. "Looks great, go for it."' : 'Be specific about what you\u2019d like to change. Mention which element (e.g. the walkway, the wall, a planting bed) and how.'}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid var(--border-default, #374151)',
                      background: 'var(--surface-bg, #0A0A0A)',
                      color: 'var(--text-primary, #F9FAFB)',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      marginBottom: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setNoteFormFor(null); setNote('') }}
                      disabled={responding !== null}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: '1px solid var(--border-default, #374151)',
                        background: 'transparent',
                        color: 'var(--text-secondary, #D1D5DB)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: responding !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitResponse(noteFormFor)}
                      disabled={responding !== null}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: noteFormFor === 'approved' ? '#10B981' : '#F59E0B',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: responding !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {responding
                        ? 'Sending…'
                        : noteFormFor === 'approved'
                          ? 'Submit approval'
                          : 'Submit request'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: '1px solid var(--border-default, #374151)',
                    background: 'var(--surface-card, #111827)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                    What do you think?
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary, #9CA3AF)', marginBottom: 16 }}>
                    Let your contractor know if the design looks good, or request changes.
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setNoteFormFor('approved')}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#10B981',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Approve design
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteFormFor('changes_requested')}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: '1px solid #F59E0B',
                        background: 'transparent',
                        color: '#F59E0B',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ✎ Request changes
                    </button>
                  </div>
                </div>
              )}
            </section>
            )}

            <footer
              style={{
                marginTop: 40,
                paddingTop: 16,
                borderTop: '1px solid var(--border-default, #374151)',
                fontSize: 12,
                color: 'var(--text-tertiary, #9CA3AF)',
                textAlign: 'center',
              }}
            >
              Preview-only. Contact your contractor with questions.
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

function formatDimensions(el: ProjectElement): string {
  const parts: string[] = []
  if (el.lengthFt && el.widthFt) parts.push(`${el.lengthFt}' × ${el.widthFt}'`)
  else if (el.areaSqft) parts.push(`${el.areaSqft} sqft`)
  else if (el.computedAreaSqft > 0) parts.push(`${Math.round(el.computedAreaSqft)} sqft`)
  if (el.linearFt) parts.push(`${el.linearFt} ln ft`)
  if (el.heightFt) parts.push(`${el.heightFt}' high`)
  if (el.depthIn) parts.push(`${el.depthIn}" depth`)
  return parts.length > 0 ? parts.join(' · ') : 'Dimensions pending'
}

export default SharedProjectView
