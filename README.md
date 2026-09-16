# Tip Pool Calculator

Split a pooled tip amount among staff by hours worked, with an
optional role weight for splitting unevenly between roles.

- Shares proportional to hours × weight per person
- Largest-remainder (Hamilton) apportionment so shares always sum to
  exactly the pool, never a cent over or under
- Add/remove staff rows
- Shareable link (base64url-encoded)

## Develop

```
npm install
npm run dev
npm run build      # tsc --noEmit && vite build
node --experimental-strip-types --test src/tippool.test.mjs
```

The engine (`effectiveWeight`, `totalWeight`, `allocateShares`) is
in `src/tippool.ts`. 9 Node tests in `src/tippool.test.mjs`,
including exact-sum verification across several uneven-weight
scenarios.

## Deploy

Static assets on Cloudflare Workers (`wrangler.jsonc`). Live at
<https://tip-pool-calculator.correia95.workers.dev/>.
