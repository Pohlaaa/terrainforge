import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchSharedProjectByToken } from '@/services/supabaseShareTokens'
import type { Project, ProjectElement } from '@/types'
import PlanView2D from '@/components/plan/PlanView2D'
import { ELEMENT_TYPE_LABELS } from '@/lib/elements'

// ===== SharedProjectView =====
//
// Public route: /share/:token
// No auth. Anon RLS policies from migration 028 scope every SELECT through
// the token row. If the token is invalid, revoked, or expired, we show a
// "Link not available" screen instead of the project.
//
// First slice: read-only plan + summary. Later: client-approve workflow.

const SharedProjectView: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; project: Project; elements: ProjectElement[] }
  >({ status: 'loading' })

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
      setState({ status: 'ready', project: result.project, elements: result.elements })
    })
  }, [token])

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
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                color: 'var(--brand-primary, #10B981)',
                fontSize: 15,
              }}
            >
              TerrainForge
            </span>
            <span>·</span>
            <span>Shared project preview</span>
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
            <section style={{ marginBottom: 24 }}>
              <PlanView2D elements={state.elements} height={560} labelMode="full" />
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
              Preview-only. Contact your contractor with questions or to approve the design.
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
