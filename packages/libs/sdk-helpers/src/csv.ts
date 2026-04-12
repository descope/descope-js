const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

const sanitizeFormulaInjection = (str: string): string => {
  if (str.length > 0 && FORMULA_PREFIXES.includes(str[0])) {
    return `'${str}`;
  }
  return str;
};

export const escapeCsvValue = (value: unknown): string => {
  const raw = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  const str = sanitizeFormulaInjection(raw);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const generateCsv = (
  records: Record<string, unknown>[],
  columns: { header: string; path: string }[],
): string => {
  const header = columns.map((col) => escapeCsvValue(col.header)).join(',');
  const rows = records.map((record) =>
    columns.map((col) => escapeCsvValue(record[col.path])).join(','),
  );
  return [header, ...rows].join('\n');
};

export const downloadCsv = (csv: string, filename: string) => {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
