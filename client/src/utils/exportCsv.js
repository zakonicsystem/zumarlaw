import { toast } from 'react-hot-toast';

const toExportValue = (value) => {
  if (value === null || typeof value === 'undefined') return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const flattenObject = (value, prefix = '', output = {}) => {
  if (value === null || typeof value !== 'object' || value instanceof Date) {
    output[prefix || 'value'] = toExportValue(value);
    return output;
  }

  if (Array.isArray(value)) {
    output[prefix] = JSON.stringify(value);
    return output;
  }

  Object.entries(value).forEach(([key, child]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child) && !(child instanceof Date)) {
      flattenObject(child, nextKey, output);
    } else {
      output[nextKey] = toExportValue(child);
    }
  });

  return output;
};

export const exportRecordsToCsv = (filename, records) => {
  if (!records?.length) {
    toast.error('No records available to export');
    return;
  }

  const flattenedRows = records.map((record) => flattenObject(record));
  const headers = Array.from(new Set(flattenedRows.flatMap((row) => Object.keys(row))));
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escapeCell).join(','),
    ...flattenedRows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
