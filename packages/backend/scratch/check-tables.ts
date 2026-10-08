import { prisma } from '../src/lib/prisma';

async function createTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS settings_center_records (
      id TEXT PRIMARY KEY NOT NULL,
      company_id INTEGER NOT NULL,
      section TEXT NOT NULL,
      record_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      sort_order INTEGER NOT NULL DEFAULT 0,
      effective_from TIMESTAMP,
      effective_to TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      UNIQUE(company_id, section, record_key)
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS settings_center_records_company_section_idx ON settings_center_records(company_id, section, status)`,
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS settings_center_user_meta (
      id TEXT PRIMARY KEY NOT NULL,
      company_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      favorite_sections TEXT NOT NULL DEFAULT '[]',
      recent_sections TEXT NOT NULL DEFAULT '[]',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, user_id)
    )
  `);
  console.log("Tables created successfully.");
}

createTables().catch(console.error);
