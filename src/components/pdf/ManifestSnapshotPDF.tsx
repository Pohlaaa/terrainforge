import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Project } from '@/types';
import type { ManifestRow } from '@/services/supabaseManifests';

/**
 * ManifestSnapshotPDF — printable PDF artifact for a versioned manifest
 * snapshot from the materials engine. The contractor takes this to their
 * supplier as the BOM. Mirrors the page layout of ManifestPDF.tsx (the
 * legacy zone-based template) but consumes the new ManifestRow shape.
 */

export interface ManifestSnapshotPDFProps {
  project: Project;
  manifest: ManifestRow;
  /** Optional org name for the letterhead. */
  orgName?: string;
}

// ── Palette (matches ManifestPDF for consistency) ──────────────────────────
const GREEN       = '#2D6A4F';
const GREEN_PALE  = '#e8f5ee';
const GRAY_DARK   = '#1a1a1a';
const GRAY        = '#555555';
const GRAY_LIGHT  = '#888888';
const BORDER      = '#d1d5db';
const ROW_ALT     = '#f9fafb';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: GRAY_DARK,
  },
  header: {
    marginBottom: 18,
    borderBottom: `2pt solid ${GREEN}`,
    paddingBottom: 10,
  },
  orgName: {
    fontSize: 11,
    color: GRAY_LIGHT,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: GREEN,
    marginBottom: 4,
  },
  projectMeta: {
    fontSize: 11,
    color: GRAY,
    marginBottom: 2,
  },
  versionLine: {
    fontSize: 9,
    color: GRAY_LIGHT,
    marginTop: 4,
  },
  sectionHead: {
    fontSize: 11,
    fontWeight: 'bold',
    color: GREEN,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  table: {
    border: `1pt solid ${BORDER}`,
    borderRadius: 3,
  },
  tr: {
    flexDirection: 'row',
    borderBottom: `0.5pt solid ${BORDER}`,
  },
  trLast: {
    flexDirection: 'row',
  },
  trAlt: {
    backgroundColor: ROW_ALT,
  },
  th: {
    padding: 6,
    fontSize: 8,
    fontWeight: 'bold',
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: GREEN_PALE,
  },
  td: {
    padding: 6,
    fontSize: 9,
    color: GRAY_DARK,
  },
  // Column widths (A4 content = ~515pt)
  colName:  { width: 220 },
  colCat:   { width: 80 },
  colQty:   { width: 80, textAlign: 'right' },
  colUnit:  { width: 60, textAlign: 'right' },
  colTotal: { width: 75, textAlign: 'right' },
  // Per-element breakdown (4 cols)
  colEl:       { width: 140 },
  colElMat:    { width: 180 },
  colElQty:    { width: 110, textAlign: 'right' },
  colElCost:   { width: 85, textAlign: 'right' },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
    borderTop: `1pt solid ${BORDER}`,
  },
  totalsLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: GRAY,
    marginRight: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: GREEN,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: GRAY_LIGHT,
    textAlign: 'center',
    paddingTop: 6,
    borderTop: `0.5pt solid ${BORDER}`,
  },
});

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export const ManifestSnapshotPDF: React.FC<ManifestSnapshotPDFProps> = ({
  project,
  manifest,
  orgName,
}) => {
  const totalCost = manifest.summary?.totalCost ?? 0;
  const generatedAt = new Date(manifest.generatedAt).toLocaleString();

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          {orgName && <Text style={styles.orgName}>{orgName}</Text>}
          <Text style={styles.title}>Materials Manifest</Text>
          <Text style={styles.projectMeta}>{project.name}</Text>
          {project.address && (
            <Text style={styles.projectMeta}>{project.address}</Text>
          )}
          {project.clientName && (
            <Text style={styles.projectMeta}>Client: {project.clientName}</Text>
          )}
          <Text style={styles.versionLine}>
            Snapshot v{manifest.version} · Generated {generatedAt}
          </Text>
        </View>

        {/* Purchase list */}
        <Text style={styles.sectionHead}>Purchase List</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.colName]}>Material</Text>
            <Text style={[styles.th, styles.colCat]}>Category</Text>
            <Text style={[styles.th, styles.colQty]}>Quantity</Text>
            <Text style={[styles.th, styles.colUnit]}>Unit cost</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {manifest.purchaseList.map((p, i) => {
            const isLast = i === manifest.purchaseList.length - 1;
            return (
              <View
                key={`${p.materialId}-${i}`}
                style={[
                  isLast ? styles.trLast : styles.tr,
                  i % 2 === 1 ? styles.trAlt : {},
                ]}
                wrap={false}
              >
                <Text style={[styles.td, styles.colName]}>{p.materialName}</Text>
                <Text style={[styles.td, styles.colCat]}>{p.category}</Text>
                <Text style={[styles.td, styles.colQty]}>
                  {p.purchaseQuantity} {p.purchaseUnit}
                </Text>
                <Text style={[styles.td, styles.colUnit]}>{fmt(p.unitCost)}</Text>
                <Text style={[styles.td, styles.colTotal]}>{fmt(p.totalCost)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Subtotal</Text>
          <Text style={styles.totalsValue}>{fmt(totalCost)}</Text>
        </View>

        {/* Per-element breakdown — separate page if it fits, else continues */}
        {manifest.lineItems.length > 0 && (
          <>
            <Text style={styles.sectionHead}>Per-Element Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tr}>
                <Text style={[styles.th, styles.colEl]}>Element</Text>
                <Text style={[styles.th, styles.colElMat]}>Material</Text>
                <Text style={[styles.th, styles.colElQty]}>Quantity</Text>
                <Text style={[styles.th, styles.colElCost]}>Line cost</Text>
              </View>
              {manifest.lineItems.map((li, i) => {
                const isLast = i === manifest.lineItems.length - 1;
                return (
                  <View
                    key={`${li.elementId}-${li.materialId}-${i}`}
                    style={[
                      isLast ? styles.trLast : styles.tr,
                      i % 2 === 1 ? styles.trAlt : {},
                    ]}
                    wrap={false}
                  >
                    <Text style={[styles.td, styles.colEl]}>{li.elementName}</Text>
                    <Text style={[styles.td, styles.colElMat]}>{li.materialName}</Text>
                    <Text style={[styles.td, styles.colElQty]}>
                      {li.purchaseQuantity} {li.purchaseUnit}
                    </Text>
                    <Text style={[styles.td, styles.colElCost]}>{fmt(li.lineCost)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by TerrainForge · {generatedAt} · Manifest v{manifest.version}
        </Text>
      </Page>
    </Document>
  );
};

export default ManifestSnapshotPDF;
