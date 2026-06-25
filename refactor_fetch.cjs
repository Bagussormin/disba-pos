const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'components/admin/PrinterSettings.tsx',
  'components/admin/SalesReport.tsx',
  'components/kasir/KasirHome.tsx',
  'components/receipt/ReceiptPrint.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace standard fetch with fetchWithTimeout
    if (content.includes('await fetch(') && !content.includes('fetchWithTimeout')) {
      const depth = file.split('/').length - 2; 
      const relativePath = depth === 1 ? '../../lib/printer' : '../../../lib/printer';
      content = `import { fetchWithTimeout } from "${relativePath}";\n` + content;
      content = content.replace(/await fetch\(/g, 'await fetchWithTimeout(');
      
      fs.writeFileSync(filePath, content);
      console.log(`Updated fetch in ${file}`);
    }
  }
});
