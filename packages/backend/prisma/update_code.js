import fs from 'fs';
import path from 'path';

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const updateFile = (filePath) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Zod replacements
  content = content.replace(/z\.string\(\)\.uuid\(\)/g, 'z.coerce.number()');
  
  const zodFields = ['companyId', 'branchId', 'userId', 'roleId', 'accountId', 'entryId', 'customerId', 'invoiceId', 'itemId', 'supplierId', 'billId', 'adjustmentId', 'karigarId', 'bankAccountId', 'schemeId', 'employeeId', 'noteId', 'salespersonId', 'memberId'];
  zodFields.forEach(f => {
    const regexMin1 = new RegExp(`(\\b${f}:\\s+)z\\.string\\(\\)\\.min\\(1[^)]*\\)`, 'g');
    content = content.replace(regexMin1, `$1z.coerce.number()`);
    const regexSimple = new RegExp(`(\\b${f}:\\s+)z\\.string\\(\\)`, 'g');
    content = content.replace(regexSimple, `$1z.coerce.number()`);
  });

  // 2. TypeScript Type replacements
  const typeFields = ['id', 'companyId', 'branchId', 'userId', 'roleId', 'accountId', 'entryId', 'customerId', 'invoiceId', 'itemId', 'supplierId', 'billId', 'adjustmentId', 'karigarId', 'bankAccountId', 'schemeId', 'employeeId', 'noteId', 'salespersonId', 'parentAccountId', 'taxId', 'bankTransactionId', 'referenceId', 'recordId', 'memberId', 'batchId', 'matchedJournalLineId', 'importBatchId'];
  typeFields.forEach(f => {
    const regex = new RegExp(`(\\b${f}:\\s+)string(\\b|;)`, 'g');
    content = content.replace(regex, `$1number$2`);
    const regexOptional = new RegExp(`(\\b${f}\\?:\\s+)string(\\b|;)`, 'g');
    content = content.replace(regexOptional, `$1number$2`);
    const regexNull = new RegExp(`(\\b${f}:\\s+)string\\s*\\|\\s*null`, 'g');
    content = content.replace(regexNull, `$1number | null`);
    const regexOptionalNull = new RegExp(`(\\b${f}\\?:\\s+)string\\s*\\|\\s*null`, 'g');
    content = content.replace(regexOptionalNull, `$1number | null`);
  });

  // 3. requireCompany replacement
  content = content.replace(/const requireCompany = \(req: Request\): string \| null =>/g, 'const requireCompany = (req: Request): number | null =>');
  // Handle variations with or without spaces
  content = content.replace(/const requireCompany = \(req: Request\):string\|null =>/g, 'const requireCompany = (req: Request): number | null =>');

  // 4. Literal ID replacements
  content = content.replace(/["']cust-1["']/g, '1');
  content = content.replace(/["']sup-1["']/g, '1');
  content = content.replace(/["']item-1["']/g, '1');
  content = content.replace(/["']bank-1["']/g, '1');
  content = content.replace(/supplierId: ["']1010["']/g, 'supplierId: 1010');
  content = content.replace(/accountId: ["'](\d+)["']/g, 'accountId: $1');

  // 5. Params conversion
  if (filePath.includes('packages/backend')) {
    // Avoid double conversion if already Number(...)
    content = content.replace(/Number\(req\.params\.id\)/g, 'req.params.id'); // Temporarily revert to standard
    content = content.replace(/req\.params\.id/g, 'Number(req.params.id)');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
};

console.log('Updating backend...');
walk('packages/backend/src', updateFile);
console.log('Updating frontend...');
walk('packages/frontend/src', updateFile);
console.log('Updating shared...');
walk('packages/shared/src', updateFile);
console.log('Done!');
