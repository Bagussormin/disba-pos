const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'components/kasir/KasirHome.tsx',
  'components/waiter/WaiterHome.tsx',
  'components/waiter/WaiterOrder.tsx',
  'components/admin/OrderHistory.tsx',
  'components/admin/ReprintModal.tsx',
  'components/admin/SalesReport.tsx',
  'components/admin/ShiftReports.tsx',
  'components/receipt/ReceiptPrint.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if not exists and JSON.parse is used
    if (content.includes('JSON.parse') && !content.includes('safeJSONParse')) {
      const depth = file.split('/').length - 2; // e.g. components/kasir/KasirHome.tsx -> depth = 3-2 = 1 => '../'
      const relativePath = depth === 1 ? '../../lib/utils' : '../../../lib/utils';
      content = `import { safeJSONParse } from "${relativePath}";\n` + content;
    }

    // Replace JSON.parse(localStorage...)
    content = content.replace(/JSON\.parse\(localStorage\.getItem\((.*?)\) \|\| "\[\]"\)/g, 'safeJSONParse(localStorage.getItem($1), [])');
    content = content.replace(/JSON\.parse\(localStorage\.getItem\((.*?)\)\)/g, 'safeJSONParse(localStorage.getItem($1), null)');
    
    // Replace JSON.parse(queue) type logic
    content = content.replace(/JSON\.parse\(queue\)/g, "safeJSONParse(queue, [])");
    content = content.replace(/JSON\.parse\(cached(.*?)\)/g, "safeJSONParse(cached$1, [])");
    
    // Replace JSON.parse(trx.items) type logic
    content = content.replace(/typeof (.*?) === 'string' \? JSON\.parse\((.*?)\) : (.*?)/g, "typeof $1 === 'string' ? safeJSONParse($2, []) : $3");

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
