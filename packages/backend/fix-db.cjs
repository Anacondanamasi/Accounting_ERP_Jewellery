const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getHeadingForType = (type) => {
  const map = {
    "Current Asset": "ASSETS", "Fixed Asset": "ASSETS", "Inventory": "ASSETS", "Non-current Asset": "ASSETS", "Prepayment": "ASSETS", "Bank": "ASSETS",
    "Asset": "ASSETS",
    "Equity": "EQUITY",
    "Depreciation": "EXPENSES", "Direct Costs": "EXPENSES", "Expense": "EXPENSES", "Overhead": "EXPENSES",
    "Current Liability": "LIABILITIES", "Liability": "LIABILITIES", "Non-current Liability": "LIABILITIES",
    "Other Income": "REVENUE", "Revenue": "REVENUE", "Sales": "REVENUE", "Income": "REVENUE"
  };
  return map[type] || "EXPENSES";
};

async function main() {
  const accounts = await prisma.account.findMany();
  for (const account of accounts) {
    const correctHeading = getHeadingForType(account.type);
    if (account.heading !== correctHeading) {
      await prisma.account.update({
        where: { id: account.id },
        data: { heading: correctHeading }
      });
      console.log(`Updated account ${account.name} to heading ${correctHeading}`);
    }
  }

  const groups = await prisma.accountGroup.findMany();
  for (const group of groups) {
    const correctHeading = getHeadingForType(group.type);
    if (group.heading !== correctHeading) {
      await prisma.accountGroup.update({
        where: { id: group.id },
        data: { heading: correctHeading }
      });
      console.log(`Updated group ${group.name} to heading ${correctHeading}`);
    }
  }
}

main()
  .then(() => console.log('Done!'))
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
