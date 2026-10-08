import fs from 'fs';
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');


// Replace all id fields
content = content.replace(/id\s+String\s+@id\s+@default\(uuid\(\)\)/g, 'id Int @id @default(autoincrement())');

// List of foreign key fields and other ID-related fields
const fields = [
  'companyId', 'branchId', 'userId', 'roleId', 'accountId', 'entryId', 'customerId', 
  'invoiceId', 'itemId', 'supplierId', 'billId', 'adjustmentId', 'karigarId', 
  'bankAccountId', 'schemeId', 'employeeId', 'noteId', 'salespersonId', 
  'costCentreId', 'reversalOf', 'referenceId', 'recordId', 'parentId', 
  'matchedJournalLineId', 'importBatchId'
];

fields.forEach(f => {
  // Replace mandatory fields: f String
  const mandatoryRegex = new RegExp(`(\\b${f}\\s+)String(\\b)`, 'g');
  content = content.replace(mandatoryRegex, `$1Int$2`);
  
  // Replace optional fields: f String?
  const optionalRegex = new RegExp(`(\\b${f}\\s+)String\\?`, 'g');
  content = content.replace(optionalRegex, `$1Int?`);
});

fs.writeFileSync('prisma/schema.prisma', content);

console.log('Successfully updated schema.prisma');
