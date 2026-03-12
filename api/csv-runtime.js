import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_FILES = {
  expenses: 'expenses.csv',
  investments: 'investments.csv',
  subscriptions: 'subscriptions.csv',
};

function parseCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    return headers.reduce((row, header, i) => {
      row[header] = cols[i] ?? '';
      return row;
    }, {});
  });
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [expenses, investments, subscriptions] = await Promise.all([
      readFile(resolve(process.cwd(), 'src/data', DATA_FILES.expenses), 'utf8'),
      readFile(resolve(process.cwd(), 'src/data', DATA_FILES.investments), 'utf8'),
      readFile(resolve(process.cwd(), 'src/data', DATA_FILES.subscriptions), 'utf8'),
    ]);

    return response.status(200).json({
      source: 'runtime-csv',
      generatedAt: new Date().toISOString(),
      data: {
        expenses: parseCsv(expenses),
        investments: parseCsv(investments),
        subscriptions: parseCsv(subscriptions),
      },
    });
  } catch (error) {
    return response.status(500).json({
      error: 'Failed to read CSV files at runtime',
      details: error.message,
    });
  }
}
