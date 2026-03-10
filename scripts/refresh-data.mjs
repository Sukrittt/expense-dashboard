import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = resolve(__dirname, '..');
const sourceRoot = resolve(root, '..');
const targetDir = resolve(root, 'src/data');

const files = ['expenses.csv', 'investments.csv', 'subscriptions.csv'];

async function refresh() {
  await mkdir(targetDir, { recursive: true });

  await Promise.all(
    files.map(async (name) => {
      const from = resolve(sourceRoot, name);
      const to = resolve(targetDir, name);
      await copyFile(from, to);
      console.log(`Copied ${name}`);
    }),
  );

  console.log(`\nData refresh complete -> ${targetDir}`);
}

refresh().catch((error) => {
  console.error('Failed to refresh CSV data:', error.message);
  process.exit(1);
});
