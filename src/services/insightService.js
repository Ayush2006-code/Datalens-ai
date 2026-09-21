export const generateDatasetInsights = (dataset) => {
  if (!dataset || !dataset.rows || dataset.rows.length === 0) {
    return { summary: [], kpis: [] };
  }

  const { headers, rows } = dataset;
  const totalRows = rows.length;
  const totalColumns = headers.length;

  const columnStats = [];
  const kpis = [
    { label: 'Total Records', value: totalRows.toLocaleString(), icon: '📋' },
    { label: 'Total Fields', value: totalColumns.toLocaleString(), icon: '📊' },
  ];

  // Analyze each column
  headers.forEach((header) => {
    const values = rows
      .map((row) => row[header])
      .filter((val) => val !== null && val !== undefined && val !== '');

    if (values.length === 0) return;

    // Check if values are numeric
    const numericValues = values
      .map((v) => Number(v))
      .filter((v) => !isNaN(v));

    const isNumeric = numericValues.length / values.length > 0.8;

    if (isNumeric && numericValues.length > 0) {
      const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / numericValues.length;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);

      columnStats.push({
        column: header,
        type: 'Numeric',
        sum: sum.toFixed(2),
        avg: avg.toFixed(2),
        min: min,
        max: max,
      });

      // Add top numeric KPI if applicable
      if (kpis.length < 4) {
        kpis.push({
          label: `Avg ${header}`,
          value: avg.toFixed(2),
          icon: '📈',
        });
      }
    } else {
      // Categorical column analysis
      const freqMap = {};
      values.forEach((v) => {
        freqMap[v] = (freqMap[v] || 0) + 1;
      });

      const uniqueCount = Object.keys(freqMap).length;

      columnStats.push({
        column: header,
        type: 'Categorical',
        uniqueCount: uniqueCount,
      });
    }
  });

  return { columnStats, kpis };
};