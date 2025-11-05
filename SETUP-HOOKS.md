# Setting Up Git Hooks

## Git Secrets Pre-Commit Hook

To enable the secrets scanning pre-commit hook:

```bash
# Configure git to use .githooks directory
git config core.hooksPath .githooks

# Verify it's set
git config core.hooksPath
# Should output: .githooks
```

## What It Does

The pre-commit hook scans staged files for:
- AWS keys
- API keys and secrets
- Private keys (RSA, DSA, EC, etc.)
- JWT secrets
- Database connection strings with passwords
- Slack tokens (xoxb-, xoxp-, etc.)
- OAuth client secrets
- Encryption keys
- `.env` files (should never be committed)

## Testing

To test the hook:

```bash
# Try to commit a fake secret
echo "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE" > test-secret.txt
git add test-secret.txt
git commit -m "Test"

# Should be blocked with:
# ❌ FOUND POTENTIAL SECRET
```

## Bypass (NOT RECOMMENDED)

If you need to bypass (only for false positives):

```bash
git commit --no-verify
```

## Updating Patterns

Edit `.git-secrets-patterns` to add or remove patterns.

## First Time Setup

```bash
cd /path/to/SlackShield
git config core.hooksPath .githooks
```

That's it! Now all commits will be scanned for secrets.
