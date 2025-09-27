import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

// Styles for PDF
const styles = StyleSheet.create({
  page: { padding: 30 },
  header: { marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 20, marginBottom: 10 },
  section: { margin: 10, padding: 10 },
  row: { flexDirection: 'row', borderBottomWidth: 1, padding: 5 },
  label: { width: '40%', fontWeight: 'bold' },
  value: { width: '60%' }
});

// PDF Document Component
const ServiceInvoicePDF = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Zumar Law Firm - Service Details</Text>
        <Text>Generated on: {new Date().toLocaleDateString()}</Text>
        {data.fullName && <Text>Customer Name: {data.fullName}</Text>}
        {data.email && <Text>Email: {data.email}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>Service: {data.serviceTitle}</Text>

        {Object.keys(data.fields).length > 0 ? (
          Object.entries(data.fields).map(([key, value]) => (
            <View style={styles.row} key={key}>
              <Text style={styles.label}>
                {key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, char => char.toUpperCase())}
              </Text>
              <Text style={styles.value}>
                {typeof value === 'string'
                  ? value
                  : value?.name || 'File Uploaded'}
              </Text>
            </View>
          ))
        ) : (
          <Text>No fields provided.</Text>
        )}
      </View>
    </Page>
  </Document>
);

// PDF Download Link Wrapper
const ServiceInvoice = ({ serviceData }) => {
  return (
    <div className="p-4">
      <PDFDownloadLink
        document={<ServiceInvoicePDF data={serviceData} />}
        fileName={`service-invoice-${serviceData.id}.pdf`}
        className="bg-[#57123f] text-white px-4 py-2 rounded hover:bg-opacity-90"
      >
        {({ loading }) => loading ? 'Generating PDF...' : 'Download Invoice'}
      </PDFDownloadLink>
    </div>
  );
};

export default ServiceInvoice;
