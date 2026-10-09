const lines = [
  "HKS Accounting - spawn-safe development launcher",
  "",
  "This environment blocks child-process spawning (EPERM).",
  "Run frontend and backend in separate terminals using:",
  "  npm run dev:frontend",
  "  npm run dev:backend",
  "",
  "You can still run type checks with:",
  "  npm run typecheck",
];

process.stdout.write(`${lines.join("\n")}\n`);
