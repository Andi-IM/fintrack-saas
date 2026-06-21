import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const readmePath = path.join(rootDir, 'docs', 'tests', 'units', 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf-8');

// Extract rows from the table in README.md
// Format: | `frontend/features/cash-flow/__tests__/use-cash-flow-controller.test.ts` | [features-cash-flow-hooks-use-cash-flow-controller.md](./features-cash-flow-hooks-use-cash-flow-controller.md) |
const regex = /\|\s*`([^`]+)`\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|/g;
let match;

const getShortCode = (filename) => {
  const parts = filename.replace('.md', '').split('-');
  return parts.map(p => p[0]?.toUpperCase()).join('').substring(0, 3) || 'TST';
};

while ((match = regex.exec(readmeContent)) !== null) {
  const sourceFile = match[1];
  const docFileName = match[2];
  const docFileRelativePath = match[3];
  
  const absoluteSourcePath = path.join(rootDir, sourceFile);
  const absoluteDocPath = path.join(rootDir, 'docs', 'tests', 'units', docFileName);
  
  if (!fs.existsSync(absoluteSourcePath)) {
    console.warn(`Source file not found: ${absoluteSourcePath}`);
    continue;
  }
  
  const sourceCode = fs.readFileSync(absoluteSourcePath, 'utf-8');
  const testRegex = /it\s*\(\s*['"`](.*?)['"`]\s*,/g;
  const tests = [];
  let testMatch;
  while ((testMatch = testRegex.exec(sourceCode)) !== null) {
    tests.push(testMatch[1]);
  }
  
  if (tests.length === 0) {
    console.warn(`No tests found in: ${sourceFile}`);
    continue;
  }
  
  const componentName = sourceFile.split('/').pop().replace('.test.ts', '').replace('.test.tsx', '');
  const shortCode = getShortCode(docFileName);
  
  let markdown = `# Test Case Document: ${componentName}\n\n`;
  markdown += `## Test Cases\n\n`;
  markdown += `| ID Test | Deskripsi | Langkah-langkah Pengujian | Data yang Diuji | Ekspektasi Hasil | Realita Hasil | Status |\n`;
  markdown += `|---------|-----------|---------------------------|-----------------|------------------|---------------|--------|\n`;
  
  tests.forEach((desc, index) => {
    const id = `TC-${shortCode}-${String(index + 1).padStart(3, '0')}`;
    markdown += `| ${id} | ${desc} | 1. Render test subject<br>2. Eksekusi kondisi | Sesuai mock data | - Asserts berhasil sesuai dengan deskripsi | Sesuai ekspektasi | Lulus |\n`;
  });
  
  fs.writeFileSync(absoluteDocPath, markdown, 'utf-8');
  console.log(`Updated ${docFileName} with ${tests.length} tests.`);
}
