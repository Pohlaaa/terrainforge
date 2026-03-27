import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Project, Zone, WorkOrderStep } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZonePacketData {
  zone: Zone;
  steps: WorkOrderStep[];
  crewName: string;        // resolved from zone.crew ID
  equipmentNames: string[]; // resolved from zone.equipment[].name
}

export interface CrewPacketPDFProps {
  project: Project;
  zonePackets: ZonePacketData[];
  foremanName?: string;
  generatedAt?: string;
}

// ── Palette ───────────────────────────────────────────────────────────────────

const GREEN      = '#2D6A4F';
const GREEN_PALE = '#e8f5ee';
const GRAY_DARK  = '#1a1a1a';
const GRAY       = '#444444';
const GRAY_LIGHT = '#888888';
const BORDER     = '#d1d5db';
const ROW_ALT    = '#f9fafb';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Page ──
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    color: GRAY_DARK,
  },

  // ── Cover page ──
  coverPage: {
    paddingTop: 60,
    paddingBottom: 56,
    paddingHorizontal: 60,
    fontSize: 10,
    color: GRAY_DARK,
    justifyContent: 'flex-start',
  },
  coverLogoText: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    marginBottom: 4,
  },
  coverDocType: {
    fontSize: 9,
    color: GRAY_LIGHT,
    letterSpacing: 2,
    marginBottom: 40,
  },
  coverDivider: {
    borderBottomWidth: 3,
    borderBottomColor: GREEN,
    marginBottom: 36,
  },
  coverProjectName: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_DARK,
    marginBottom: 6,
  },
  coverProjectSub: {
    fontSize: 13,
    color: GRAY,
    marginBottom: 32,
  },
  coverMetaBlock: {
    marginBottom: 8,
  },
  coverMetaLabel: {
    fontSize: 7.5,
    color: GRAY_LIGHT,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  coverMetaValue: {
    fontSize: 13,
    color: GRAY_DARK,
    fontFamily: 'Helvetica-Bold',
  },
  coverMetaValueLarge: {
    fontSize: 16,
    color: GREEN,
    fontFamily: 'Helvetica-Bold',
  },
  coverForemanBlock: {
    backgroundColor: GREEN_PALE,
    borderLeftWidth: 4,
    borderLeftColor: GREEN,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 28,
  },
  coverForemanLabel: {
    fontSize: 7.5,
    color: GRAY_LIGHT,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  coverForemanName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },
  coverSafetyBox: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 'auto',
  },
  coverSafetyTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coverSafetyText: {
    fontSize: 8.5,
    color: '#78350f',
    lineHeight: 1.5,
  },
  coverZoneTable: {
    marginTop: 28,
  },
  coverZoneTableHeader: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  coverZoneTableHeaderText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  coverZoneRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  coverZoneRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: ROW_ALT,
  },
  coverZoneCell: {
    fontSize: 9,
    color: GRAY_DARK,
  },
  coverZoneCellMuted: {
    fontSize: 9,
    color: GRAY_LIGHT,
  },

  // ── Header (repeating) ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: GREEN,
  },
  headerLogo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },
  headerDocType: {
    fontSize: 6.5,
    color: GRAY_LIGHT,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerMeta: {
    fontSize: 7.5,
    color: GRAY_LIGHT,
    marginBottom: 1,
  },
  headerMetaBold: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: GRAY,
  },

  // ── Zone header ──
  zoneHeader: {
    backgroundColor: GREEN,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 0,
  },
  zoneSequence: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  zoneName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 3,
  },
  zoneMeta: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Assignment pills ──
  assignmentRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: GREEN_PALE,
    marginBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#b7d9c9',
  },
  assignmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignmentLabel: {
    fontSize: 7,
    color: GRAY_LIGHT,
    letterSpacing: 0.6,
    marginRight: 4,
  },
  assignmentValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },

  // ── Steps ──
  stepsHeading: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_LIGHT,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 11,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderColor: GRAY,
    marginRight: 10,
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumber: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_LIGHT,
    width: 18,
    flexShrink: 0,
    marginTop: 2,
  },
  stepText: {
    fontSize: 10.5,
    color: GRAY_DARK,
    lineHeight: 1.55,
    flex: 1,
  },

  // ── Notes section ──
  notesHeading: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_LIGHT,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },
  notesLine: {
    borderBottomWidth: 0.75,
    borderBottomColor: '#d1d5db',
    marginBottom: 16,
  },

  // ── Zone dependencies ──
  depsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 0.5,
    borderColor: '#f59e0b',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  depsLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    marginRight: 6,
  },
  depsText: {
    fontSize: 8,
    color: '#78350f',
  },

  // ── Equipment list ──
  equipHeading: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_LIGHT,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 2,
  },
  equipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  equipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GREEN,
    marginRight: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  equipName: {
    fontSize: 9.5,
    color: GRAY_DARK,
  },

  // ── Divider ──
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    marginVertical: 12,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
  },
  footerLeft: {
    fontSize: 7,
    color: GRAY_LIGHT,
  },
  footerCenter: {
    fontSize: 7,
    color: GRAY_LIGHT,
  },
  footerRight: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },
});

// ── Sub-components ────────────────────────────────────────────────────────────

const PageFooter: React.FC<{ projectName: string; generatedAt: string }> = ({
  projectName,
  generatedAt,
}) => (
  <View style={s.footer} fixed>
    <Text style={s.footerLeft}>{projectName} — Crew Packet</Text>
    <Text style={s.footerCenter}>Generated {generatedAt}</Text>
    <Text
      style={s.footerRight}
      render={({ pageNumber, totalPages }) =>
        `TerrainForge  ·  Page ${pageNumber} of ${totalPages}`
      }
    />
  </View>
);

const NotesLines: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <View>
    <Text style={s.notesHeading}>NOTES / FIELD OBSERVATIONS</Text>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={s.notesLine} />
    ))}
  </View>
);

// ── Main component ────────────────────────────────────────────────────────────

export const CrewPacketPDF: React.FC<CrewPacketPDFProps> = ({
  project,
  zonePackets,
  foremanName,
  generatedAt,
}) => {
  const dateStr = generatedAt ?? new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Document
      title={`Crew Packet — ${project.name}`}
      author="TerrainForge"
      subject="Crew Job Packet"
    >
      {/* ── Cover Page ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>

        <Text style={s.coverLogoText}>TerrainForge</Text>
        <Text style={s.coverDocType}>CREW JOB PACKET</Text>

        <View style={s.coverDivider} />

        <Text style={s.coverProjectName}>{project.name}</Text>
        <Text style={s.coverProjectSub}>Material & Installation Work Order</Text>

        {/* Project details */}
        <View style={s.coverMetaBlock}>
          <Text style={s.coverMetaLabel}>CLIENT</Text>
          <Text style={s.coverMetaValue}>{project.client}</Text>
        </View>
        <View style={[s.coverMetaBlock, { marginTop: 10 }]}>
          <Text style={s.coverMetaLabel}>SITE ADDRESS</Text>
          <Text style={s.coverMetaValue}>{project.address || '—'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 10 }}>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>START DATE</Text>
            <Text style={s.coverMetaValue}>{fmtDate(project.startDate)}</Text>
          </View>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>TARGET COMPLETION</Text>
            <Text style={s.coverMetaValue}>{fmtDate(project.targetDate)}</Text>
          </View>
        </View>

        {/* Foreman block */}
        {foremanName && (
          <View style={s.coverForemanBlock}>
            <Text style={s.coverForemanLabel}>ASSIGNED FOREMAN</Text>
            <Text style={s.coverForemanName}>{foremanName}</Text>
          </View>
        )}

        {/* Zone summary table */}
        {zonePackets.length > 0 && (
          <View style={s.coverZoneTable}>
            <View style={s.coverZoneTableHeader}>
              <Text style={[s.coverZoneTableHeaderText, { width: 30 }]}>#</Text>
              <Text style={[s.coverZoneTableHeaderText, { flex: 2 }]}>ZONE</Text>
              <Text style={[s.coverZoneTableHeaderText, { flex: 1.5 }]}>CREW</Text>
              <Text style={[s.coverZoneTableHeaderText, { width: 70, textAlign: 'right' }]}>AREA</Text>
              <Text style={[s.coverZoneTableHeaderText, { width: 50, textAlign: 'right' }]}>STEPS</Text>
            </View>
            {zonePackets.map(({ zone, steps, crewName }, i) => (
              <View key={zone.id} style={i % 2 === 0 ? s.coverZoneRow : s.coverZoneRowAlt}>
                <Text style={[s.coverZoneCell, { width: 30, color: GRAY_LIGHT }]}>
                  {zone.sequence}
                </Text>
                <Text style={[s.coverZoneCell, { flex: 2, fontFamily: 'Helvetica-Bold' }]}>
                  {zone.name}
                </Text>
                <Text style={[s.coverZoneCellMuted, { flex: 1.5 }]}>
                  {crewName || '—'}
                </Text>
                <Text style={[s.coverZoneCellMuted, { width: 70, textAlign: 'right' }]}>
                  {zone.area.toLocaleString()} sqft
                </Text>
                <Text style={[s.coverZoneCellMuted, { width: 50, textAlign: 'right' }]}>
                  {steps.length}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Safety reminder */}
        <View style={s.coverSafetyBox}>
          <Text style={s.coverSafetyTitle}>⚠  SAFETY REMINDER</Text>
          <Text style={s.coverSafetyText}>
            Review all safety procedures before commencing work. Wear required PPE at all times.
            Verify utilities are marked before any excavation. Report hazards to foreman immediately.
          </Text>
        </View>

        <PageFooter projectName={project.name} generatedAt={dateStr} />
      </Page>

      {/* ── Zone Pages ──────────────────────────────────────────────────────── */}
      {zonePackets.map(({ zone, steps, crewName, equipmentNames }) => (
        <Page key={zone.id} size="A4" style={s.page}>

          {/* Repeating page header */}
          <View style={s.header} fixed>
            <View>
              <Text style={s.headerLogo}>TerrainForge</Text>
              <Text style={s.headerDocType}>CREW JOB PACKET</Text>
            </View>
            <View style={s.headerRight}>
              <Text style={s.headerMeta}>
                Project: <Text style={s.headerMetaBold}>{project.name}</Text>
              </Text>
              <Text style={s.headerMeta}>
                Client: <Text style={s.headerMetaBold}>{project.client}</Text>
              </Text>
            </View>
          </View>

          {/* Zone title */}
          <View style={s.zoneHeader}>
            <Text style={s.zoneSequence}>ZONE {zone.sequence}</Text>
            <Text style={s.zoneName}>{zone.name}</Text>
            <Text style={s.zoneMeta}>
              {zone.area.toLocaleString()} sqft
              {zone.perimeter ? `  ·  ${zone.perimeter.toLocaleString()} lnft perimeter` : ''}
            </Text>
          </View>

          {/* Assignments */}
          <View style={s.assignmentRow}>
            <View style={s.assignmentPill}>
              <Text style={s.assignmentLabel}>CREW  </Text>
              <Text style={s.assignmentValue}>{crewName || 'Unassigned'}</Text>
            </View>
            {equipmentNames.length > 0 && (
              <View style={[s.assignmentPill, { marginLeft: 24 }]}>
                <Text style={s.assignmentLabel}>EQUIPMENT  </Text>
                <Text style={s.assignmentValue}>{equipmentNames.join('  ·  ')}</Text>
              </View>
            )}
          </View>

          {/* Dependencies warning */}
          {zone.dependencies && zone.dependencies.length > 0 && (
            <View style={s.depsRow}>
              <Text style={s.depsLabel}>⚠ WAIT FOR:</Text>
              <Text style={s.depsText}>{zone.dependencies.join(', ')}</Text>
            </View>
          )}

          {/* Equipment detail (if any) */}
          {equipmentNames.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={s.equipHeading}>REQUIRED EQUIPMENT</Text>
              {equipmentNames.map((name, i) => (
                <View key={i} style={s.equipRow}>
                  <View style={s.equipDot} />
                  <Text style={s.equipName}>{name}</Text>
                </View>
              ))}
              <View style={s.divider} />
            </View>
          )}

          {/* Installation steps */}
          <Text style={s.stepsHeading}>INSTALLATION STEPS</Text>
          {steps.length === 0 ? (
            <Text style={{ fontSize: 9, color: GRAY_LIGHT, fontStyle: 'italic' }}>
              No steps generated for this zone.
            </Text>
          ) : (
            steps.map((step) => (
              <View key={step.n} style={s.stepRow}>
                <View style={s.checkbox} />
                <Text style={s.stepNumber}>{step.n}.</Text>
                <Text style={s.stepText}>{step.text}</Text>
              </View>
            ))
          )}

          {/* Notes area */}
          <NotesLines count={5} />

          <PageFooter projectName={project.name} generatedAt={dateStr} />
        </Page>
      ))}
    </Document>
  );
};

export default CrewPacketPDF;
