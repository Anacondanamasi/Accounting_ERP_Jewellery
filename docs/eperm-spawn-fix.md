# EPERM Spawn Workaround (Windows sandbox)

## What this means
In this workspace environment, creating child processes can fail with:
`Error: spawn EPERM`.

## What was changed
- Root `dev` command now prints a spawn-safe run guide.
- Root scripts now use direct `node` entry points for build/typecheck.
- Frontend and backend package scripts use direct `node` launch commands.

## How to run locally in this environment
1. Start frontend in terminal 1:
   `npm run dev:frontend`
2. Start backend in terminal 2:
   `npm run dev:backend`
3. Typecheck all packages:
   `npm run typecheck`

## Notes
- Parallel workspace commands like `pnpm -r --parallel ...` can trigger EPERM here.
- PDF generation tools that rely on browser child processes may require a non-sandboxed machine.
