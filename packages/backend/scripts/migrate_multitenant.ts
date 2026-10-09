import { prisma } from '../src/lib/prisma';
import crypto from 'crypto';

async function migrate() {
  console.log('--- Starting Multi-Tenant Organisation & IAM Migration ---');

  // 1. Add missing columns to users table
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_org_id TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`);
  console.log('✓ Updated users table columns');

  // 2. Add missing columns to companies table
  await prisma.$executeRawUnsafe(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;`);
  console.log('✓ Updated companies table columns');

  // 3. Create dedicated invitations table for high-performance invitations & token hashing
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT NOT NULL PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      accepted_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_key ON invitations(token_hash);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS invitations_company_status_idx ON invitations(company_id, status);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS invitations_email_status_idx ON invitations(email, status);`);
  console.log('✓ Created dedicated invitations table and indexes');

  // 4. Ensure composite indexes on tenant tables for high performance
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON user_company_memberships(user_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_memberships_company_id ON user_company_memberships(company_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_memberships_company_status ON user_company_memberships(company_id, status);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at);`);
  console.log('✓ Ensured composite indexes for multi-tenant scalability');

  // 5. Ensure System Roles exist: Owner, Admin, Accountant, Bookkeeper, Standard User, Read-Only, Advisor
  const systemRoles = [
    { name: 'owner', description: 'Full access to organization, settings, billing and ownership transfer' },
    { name: 'admin', description: 'Full operational access and team management' },
    { name: 'accountant', description: 'Full accounting, invoicing, journal and financial reporting access' },
    { name: 'bookkeeper', description: 'Day-to-day transaction recording, bills and invoices' },
    { name: 'standard_user', description: 'Standard operational permissions without financial settings' },
    { name: 'read_only', description: 'View-only access across financial modules' },
    { name: 'advisor', description: 'External accountant or advisor with multi-client access' },
  ];

  for (const r of systemRoles) {
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM roles WHERE company_id IS NULL AND name = $1 AND deleted_at IS NULL LIMIT 1`,
      r.name
    );
    if (!existing || existing.length === 0) {
      const roleId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO roles (id, company_id, name, is_system_role, description, created_at, updated_at)
         VALUES ($1, NULL, $2, TRUE, $3, NOW(), NOW())`,
        roleId,
        r.name,
        r.description
      );
      console.log(`+ Created system role: ${r.name}`);
    }
  }

  // 6. Backfill existing users: ensure last_active_org_id is set to their first active membership
  const usersWithoutActiveOrg = await prisma.$queryRawUnsafe<any[]>(
    `SELECT u.id, m.company_id 
     FROM users u
     INNER JOIN user_company_memberships m ON m.user_id = u.id AND m.status = 'active' AND m.deleted_at IS NULL
     WHERE u.last_active_org_id IS NULL
     ORDER BY m.created_at ASC`
  );

  for (const u of usersWithoutActiveOrg) {
    await prisma.$executeRawUnsafe(
      `UPDATE users SET last_active_org_id = $1 WHERE id = $2`,
      u.company_id,
      u.id
    );
  }
  console.log(`✓ Backfilled last_active_org_id for users`);

  console.log('--- Migration completed successfully with zero data loss ---');
}

migrate()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
