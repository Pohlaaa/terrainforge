import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Project, Zone, ManifestItem } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZoneManifestData {
  zone: Zone;
  items: ManifestItem[];
  subtotal: number;
}

export interface ManifestPDFProps {
  project: Project;
  zoneManifests: ZoneManifestData[];
  consolidatedManifest: ManifestItem[];
  totalCost: number;
  generatedAt?: string;
  /** Map of crew member ID → display name for resolving zone.crew */
  crewLookup?: Record<string, string>;
}

// ── Palette ───────────────────────────────────────────────────────────────────

const GREEN       = '#2D6A4F';
const GREEN_PALE  = '#e8f5ee';
const GRAY_DARK   = '#1a1a1a';
const GRAY        = '#555555';
const GRAY_LIGHT  = '#888888';
const BORDER      = '#d1d5db';
const ROW_ALT     = '#f9fafb';

// ── Column widths (points, A4 content = 515pt at 40pt padding each side) ─────

const COL = {
  material:   200,
  qty:         52,
  reserve:     52,
  totalOrder:  60,
  unit:        40,
  unitCost:    58,
  subtotal:    53,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Page
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9,
    color: GRAY_DARK,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: GREEN,
  },
  logoText: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },
  docType: {
    fontSize: 7,
    color: GRAY_LIGHT,
    marginTop: 3,
    letterSpacing: 1.5,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerMeta: {
    fontSize: 8,
    color: GRAY_LIGHT,
    marginBottom: 2,
  },
  headerMetaBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRAY,
  },

  // ── Project summary ──
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: ROW_ALT,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 8,
  },
  summaryLabel: {
    fontSize: 6.5,
    color: GRAY_LIGHT,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_DARK,
  },
  summaryValueGreen: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },
  summaryValueRed: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#DC2626',
  },
  summarySubtext: {
    fontSize: 7,
    color: GRAY_LIGHT,
    marginTop: 2,
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: GREEN,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  sectionMeta: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Zone header ──
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: GREEN_PALE,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  zoneTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },
  zoneMeta: {
    fontSize: 7.5,
    color: GRAY_LIGHT,
  },

  // ── Table ──
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#3d7a5e',
    paddingVertical: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 4,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 4,
    backgroundColor: ROW_ALT,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 0.4,
    paddingHorizontal: 5,
  },
  td: {
    fontSize: 8,
    color: GRAY_DARK,
    paddingHorizontal: 5,
  },
  tdMuted: {
    fontSize: 8,
    color: GRAY,
    paddingHorizontal: 5,
  },
  tdBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_DARK,
    paddingHorizontal: 5,
  },
  tdGreen: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    paddingHorizontal: 5,
  },

  // ── Subtotal row ──
  subtotalRow: {
    flexDirection: 'row',
    backgroundColor: GREEN_PALE,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: GREEN,
  },
  subtotalLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    paddingHorizontal: 5,
  },
  subtotalValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    paddingHorizontal: 5,
    textAlign: 'right',
  },

  // ── Grand total ──
  grandTotalRow: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    paddingVertical: 7,
    marginTop: 2,
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    paddingHorizontal: 5,
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    paddingHorizontal: 5,
    textAlign: 'right',
  },

  // ── Empty state ──
  emptyZone: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: GRAY_LIGHT,
    fontSize: 8,
    fontStyle: 'italic',
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
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

const TableHeader: React.FC<{ showZone?: boolean }> = ({ showZone }) => (
  <View style={s.tableHeaderRow}>
    <Text style={[s.th, { width: showZone ? COL.material - 70 : COL.material }]}>Material</Text>
    {showZone && <Text style={[s.th, { width: 70 }]}>Zone(s)</Text>}
    <Text style={[s.th, { width: COL.qty, textAlign: 'right' }]}>Qty Needed</Text>
    <Text style={[s.th, { width: COL.reserve, textAlign: 'right' }]}>Reserve</Text>
    <Text style={[s.th, { width: COL.totalOrder, textAlign: 'right' }]}>Total Order</Text>
    <Text style={[s.th, { width: COL.unit, textAlign: 'center' }]}>Unit</Text>
    <Text style={[s.th, { width: COL.unitCost, textAlign: 'right' }]}>Unit Cost</Text>
    <Text style={[s.th, { width: COL.subtotal, textAlign: 'right' }]}>Subtotal</Text>
  </View>
);

const MaterialRow: React.FC<{ item: ManifestItem; index: number; showZone?: boolean }> = ({
  item, index, showZone,
}) => {
  const rowStyle = index % 2 === 0 ? s.tableRow : s.tableRowAlt;
  return (
    <View style={rowStyle}>
      <Text style={[s.td, { width: showZone ? COL.material - 70 : COL.material }]}>
        {item.materialName}
      </Text>
      {showZone && (
        <Text style={[s.tdMuted, { width: 70 }]}>{item.zoneName}</Text>
      )}
      <Text style={[s.tdMuted, { width: COL.qty, textAlign: 'right' }]}>
        {fmtQty(item.qtyNeeded)}
      </Text>
      <Text style={[s.tdMuted, { width: COL.reserve, textAlign: 'right' }]}>
        +{fmtQty(item.reserveQty)}
      </Text>
      <Text style={[s.tdBold, { width: COL.totalOrder, textAlign: 'right' }]}>
        {item.totalOrder}
      </Text>
      <Text style={[s.tdMuted, { width: COL.unit, textAlign: 'center' }]}>
        {item.unit}
      </Text>
      <Text style={[s.td, { width: COL.unitCost, textAlign: 'right' }]}>
        ${fmt(item.unitCost)}
      </Text>
      <Text style={[s.tdGreen, { width: COL.subtotal, textAlign: 'right' }]}>
        ${fmt(item.subtotal)}
      </Text>
    </View>
  );
};

const PageFooter: React.FC<{ projectName: string; generatedAt: string }> = ({
  projectName, generatedAt,
}) => (
  <View style={s.footer} fixed>
    <Text style={s.footerLeft}>{projectName}</Text>
    <Text style={s.footerCenter}>
      Generated {generatedAt}
    </Text>
    <Text
      style={s.footerRight}
      render={({ pageNumber, totalPages }) => `TerrainForge  ·  Page ${pageNumber} of ${totalPages}`}
    />
  </View>
);

// ── Main component ────────────────────────────────────────────────────────────

export const ManifestPDF: React.FC<ManifestPDFProps> = ({
  project,
  zoneManifests,
  consolidatedManifest,
  totalCost,
  generatedAt,
  crewLookup = {},
}) => {
  const dateStr = generatedAt ?? new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const budgetDelta = totalCost - project.budget;
  const budgetOver = budgetDelta > 0;
  const totalArea = project.zones.reduce((s, z) => s + (z.area || 0), 0);

  return (
    <Document
      title={`Material Manifest — ${project.name}`}
      author="TerrainForge"
      subject="Material Manifest"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={s.header} fixed>
          <View>
            <Text style={s.logoText}>TerrainForge</Text>
            <Text style={s.docType}>MATERIAL MANIFEST</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerMeta}>Generated: <Text style={s.headerMetaBold}>{dateStr}</Text></Text>
            <Text style={s.headerMeta}>Project: <Text style={s.headerMetaBold}>{project.name}</Text></Text>
          </View>
        </View>

        {/* ── Project summary cards ────────────────────────────────────────── */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>CLIENT</Text>
            <Text style={s.summaryValue}>{project.client}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>SITE ADDRESS</Text>
            <Text style={s.summaryValue}>{project.address || '—'}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>TIMELINE</Text>
            <Text style={s.summaryValue}>{fmtDate(project.startDate)}</Text>
            <Text style={s.summarySubtext}>→ {fmtDate(project.targetDate)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>TOTAL AREA</Text>
            <Text style={s.summaryValue}>{totalArea.toLocaleString()} sqft</Text>
            <Text style={s.summarySubtext}>{project.zones.length} zone{project.zones.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Budget vs estimate */}
        <View style={[s.summaryRow, { marginBottom: 4 }]}>
          <View style={[s.summaryCard, { flex: 1 }]}>
            <Text style={s.summaryLabel}>MATERIAL ESTIMATE</Text>
            <Text style={s.summaryValueGreen}>${totalCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>
          <View style={[s.summaryCard, { flex: 1 }]}>
            <Text style={s.summaryLabel}>PROJECT BUDGET</Text>
            <Text style={s.summaryValue}>${project.budget.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>
          <View style={[s.summaryCard, { flex: 1 }]}>
            <Text style={s.summaryLabel}>BUDGET VARIANCE</Text>
            <Text style={budgetOver ? s.summaryValueRed : s.summaryValueGreen}>
              {budgetOver ? '+' : '-'}${Math.abs(budgetDelta).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
            <Text style={s.summarySubtext}>{budgetOver ? 'Over budget' : 'Under budget'}</Text>
          </View>
          <View style={[s.summaryCard, { flex: 1 }]}>
            <Text style={s.summaryLabel}>TOTAL LINE ITEMS</Text>
            <Text style={s.summaryValue}>{consolidatedManifest.length}</Text>
            <Text style={s.summarySubtext}>unique materials</Text>
          </View>
        </View>

        {/* ── Per-zone sections ────────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Zone Breakdown</Text>
          <Text style={s.sectionMeta}>{zoneManifests.length} zone{zoneManifests.length !== 1 ? 's' : ''}</Text>
        </View>

        {zoneManifests.map(({ zone, items, subtotal }) => (
          <View key={zone.id}>
            {/* Zone header */}
            <View style={s.zoneHeader}>
              <Text style={s.zoneTitle}>
                Zone {zone.sequence}: {zone.name}
              </Text>
              <Text style={s.zoneMeta}>
                {zone.area.toLocaleString()} sqft  ·  {(zone.perimeter || 0).toLocaleString()} lnft perimeter
                {zone.crew ? `  ·  Crew: ${crewLookup[zone.crew] ?? zone.crew}` : ''}
              </Text>
            </View>

            {items.length === 0 ? (
              <Text style={s.emptyZone}>No materials assigned to this zone.</Text>
            ) : (
              <View>
                <TableHeader />
                {items.map((item, i) => (
                  <MaterialRow key={item.materialId} item={item} index={i} />
                ))}
                {/* Zone subtotal */}
                <View style={s.subtotalRow}>
                  <Text style={[s.subtotalLabel, { width: COL.material + COL.qty + COL.reserve + COL.totalOrder + COL.unit + COL.unitCost }]}>
                    Zone Subtotal
                  </Text>
                  <Text style={[s.subtotalValue, { width: COL.subtotal }]}>
                    ${fmt(subtotal)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* ── Consolidated summary ─────────────────────────────────────────── */}
        <View style={s.sectionHeader} break>
          <Text style={s.sectionTitle}>Consolidated Order Summary</Text>
          <Text style={s.sectionMeta}>All zones combined</Text>
        </View>

        {consolidatedManifest.length === 0 ? (
          <Text style={s.emptyZone}>No materials in manifest.</Text>
        ) : (
          <View>
            <TableHeader showZone />
            {consolidatedManifest.map((item, i) => (
              <MaterialRow key={item.materialId} item={item} index={i} showZone />
            ))}
            {/* Grand total */}
            <View style={s.grandTotalRow}>
              <Text style={[s.grandTotalLabel, {
                width: COL.material - 70 + 70 + COL.qty + COL.reserve + COL.totalOrder + COL.unit + COL.unitCost,
              }]}>
                Grand Total — All Materials
              </Text>
              <Text style={[s.grandTotalValue, { width: COL.subtotal }]}>
                ${fmt(totalCost)}
              </Text>
            </View>
          </View>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <PageFooter projectName={project.name} generatedAt={dateStr} />

      </Page>
    </Document>
  );
};

export default ManifestPDF;
