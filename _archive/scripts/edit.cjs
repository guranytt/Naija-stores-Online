const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split(/\r?\n/);

const newLines = [
  ...lines.slice(0, 26),
  'import { useSEO } from "./hooks/useSEO";',
  ...lines.slice(26, 410),
  '  useSEO(currentScreen, selectedProductId, initialCategory, selectedVendorSlug, products, vendors, categories);',
  ...lines.slice(754)
];

fs.writeFileSync('src/App.tsx', newLines.join('\n'));
