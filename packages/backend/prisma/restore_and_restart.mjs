#!/usr/bin/env node
// Run after Supabase project is restored
// Command: node prisma/restore_and_restart.mjs

import { execSync } from 'child_process';

const steps = [
  { label: 'Pushing new schema to DB...', cmd: 'npx prisma db push --force-reset' },
  { label: 'Re-seeding database...', cmd: 'npx prisma db seed' },
  { label: 'Regenerating Prisma client...', cmd: 'npx prisma generate' },
];

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`);
  try {
    const out = execSync(step.cmd, { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' });
    console.log(out || 'Done.');
  } catch (e) {
    console.error(`FAILED:\n${e.stdout}\n${e.stderr}`);
    process.exit(1);
  }
}

console.log('\n✅ All done! Restart the backend server now:\n  node --import tsx src/server.ts');
