import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D6A4F',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
});

export const TestPDF: React.FC = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View>
        <Text style={styles.title}>TerrainForge</Text>
        <Text style={styles.subtitle}>PDF rendering is working correctly.</Text>
      </View>
    </Page>
  </Document>
);

export default TestPDF;
