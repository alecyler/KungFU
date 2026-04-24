# Cloudflare deploy notes

This archive's lockfile currently resolves Vite 8. Vite 8 requires Node `^20.19.0 || >=22.12.0`, so Cloudflare can fail even when local builds work if its build image uses an older Node version.

Added in this patch:
- `.nvmrc` -> `22.12.0`
- `.node-version` -> `22.12.0`

Cloudflare Pages settings to double-check:
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` if the repo root contains `package.json`
- If Cloudflare still uses an older Node image, set environment variable `NODE_VERSION=22.12.0`.

Do not use `wrangler deploy` as the Pages deploy command for this Vite static site unless you intentionally convert it into a Worker. Pages should build `dist` and serve it as static output.
