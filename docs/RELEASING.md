# Releasing to Chrome Web Store

This document explains how releases work for this extension.

## Quick Reference

| Action | Command |
|--------|---------|
| **Release** | `npm run release` |
| Release (minor) | `npm run release:minor` |
| Release (major) | `npm run release:major` |
| Local release | `npm run release:local` (requires `.env`) |

## One-Command Release

```bash
npm run release         # 1.0.0 → 1.0.1 (patch, default)
npm run release:minor   # 1.0.0 → 1.1.0
npm run release:major   # 1.0.0 → 2.0.0
```

Or via Make:

```bash
make release            # patch (default)
make release-minor
make release-major
```

This command will:
1. Check for uncommitted changes (fails if dirty)
2. Bump version in `package.json`
3. Sync version to `manifest.json`
4. Run tests
5. Build the extension
6. Commit the version bump
7. Create and push the git tag
8. Open the GitHub Actions page to watch progress

## How It Works

Releases are triggered by **version tags**, not by pushing code.

The GitHub Actions workflow (`.github/workflows/publish.yml`) will:
1. Run tests
2. Build the extension
3. Upload to Chrome Web Store
4. Publish immediately (make live)

### Manual (Local)

For local releases without GitHub Actions, you need credentials in `.env` (see `.env.example`):

```bash
# Full release (upload + publish)
npm run release:local
# or
make release-local

# Upload only (draft, not published)
make cws-upload

# Publish a previously uploaded draft
make cws-publish
```

## What Happens After Pushing Code?

**Nothing automatically.** Pushing to `main` does NOT trigger a release.

Use `npm run release` (or minor/major) to release - it handles everything.

## Workflow Dispatch (Manual Trigger)

You can also trigger releases from GitHub Actions UI:

1. Go to Actions → "Publish to Chrome Web Store"
2. Click "Run workflow"
3. Choose whether to publish (live) or just upload (draft)

This is useful for:
- Testing the upload without publishing
- Re-running a failed release

## Checking Release Status

```bash
# Check extension status on CWS
make cws-status

# Open developer console
make cws-console

# Open public listing
make cws-listing
```

## Troubleshooting

### "Credentials not set"
Copy `.env.example` to `.env` and fill in your OAuth credentials. See `docs/PUBLISHING.md`.

### "Version already exists"
The Chrome Web Store rejects duplicate versions. Bump the version before releasing.

### Release failed but code was uploaded
The extension may be in "draft" state. Either:
- Run `make cws-publish` to publish it
- Or go to the developer console and publish manually

## Related

- [PUBLISHING.md](./PUBLISHING.md) - OAuth credential setup
