# Security Notice

## Credential Rotation Required

The `.env` file was previously committed to this repository. All credentials that were exposed in git history **must be rotated immediately**:

1. **Supabase** — Regenerate project API keys (anon key + service role key) in Supabase Dashboard → Settings → API
2. **Anthropic** — Rotate API key at https://console.anthropic.com/settings/keys
3. **GitHub** — Rotate personal access token at https://github.com/settings/tokens
4. **Exa** — Rotate API key at https://dashboard.exa.ai/api-keys
5. **Stripe** — Rotate secret key and webhook secret at https://dashboard.stripe.com/apikeys

After rotating, update the new values in:
- Your local `.env` file (for development)
- Supabase Dashboard → Edge Functions → Secrets (for production)
- Any CI/CD environment variables

## Scrubbing Git History

To fully remove the `.env` file from git history, run one of:

```bash
# Option A: git filter-repo (recommended, install via pip install git-filter-repo)
git filter-repo --path .env --invert-paths

# Option B: BFG Repo-Cleaner (install from https://rtyley.github.io/bfg-repo-cleaner/)
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Then force-push (CAUTION: rewrites history for all collaborators)
git push --force --all
```

**Warning:** Force-pushing rewrites history. Coordinate with all collaborators before running.

## Ongoing Security Practices

- Never commit `.env` files — they are now in `.gitignore`
- Use `.env.example` as a template (contains only placeholder values)
- Store production secrets in Supabase Dashboard → Edge Functions → Secrets
- The `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key) is safe to expose client-side — it's designed for that. But the service role key, Stripe keys, and API keys must never be in client code.
