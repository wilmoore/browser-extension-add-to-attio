# Chrome Web Store Publishing Guide

This guide explains how to set up automated publishing to the Chrome Web Store.

## Prerequisites

- A [Chrome Web Store Developer account](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)
- Your extension already published (at least once manually)
- A [Google Cloud Console](https://console.cloud.google.com/) project

## Step 1: Get Your Extension ID

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click on your extension
3. Copy the **Extension ID** from the URL or the extension details
   - Example URL: `https://chrome.google.com/webstore/detail/your-extension/YOUR_EXTENSION_ID`

## Step 2: Create Google Cloud OAuth Credentials

### 2.1 Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note: Project name doesn't matter, but something like "Chrome Web Store Publishing" is descriptive

### 2.2 Enable the Chrome Web Store API

1. Go to **APIs & Services** → **Library**
2. Search for "Chrome Web Store API"
3. Click **Enable**

### 2.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace org)
3. Fill in required fields:
   - **App name**: "Chrome Extension Publisher" (or similar)
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **Save and Continue**
5. Skip **Scopes** (click Save and Continue)
6. Add yourself as a **Test user** (your Google account email)
7. Click **Save and Continue**

### 2.4 Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Desktop app**
4. Name: "Chrome Web Store Upload CLI"
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 3: Get Refresh Token

Run the initialization command:

```bash
make cws-init
# or
npm run cws:init
```

This will:
1. Open a browser window for Google OAuth
2. Ask you to authorize the application
3. Display a refresh token

Copy the refresh token.

## Step 4: Configure Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```
   EXTENSION_ID=your_extension_id_here
   CLIENT_ID=your_client_id.apps.googleusercontent.com
   CLIENT_SECRET=your_client_secret
   REFRESH_TOKEN=your_refresh_token
   ```

## Usage

### Using Make (recommended)

```bash
# Show all available commands
make help

# Build and create dist.zip
make package

# Upload to Chrome Web Store (as draft)
make upload

# Publish the draft
make publish

# Upload and publish in one step
make release
```

### Using npm

```bash
# Build and create dist.zip
npm run package

# Upload to Chrome Web Store
npm run cws:upload

# Publish
npm run cws:publish

# Full deploy (package + upload + publish)
npm run release
```

## Workflow

1. **Make your changes** and test locally
2. **Bump version** (if needed):
   ```bash
   make bump-patch  # 1.0.0 → 1.0.1
   make bump-minor  # 1.0.0 → 1.1.0
   make bump-major  # 1.0.0 → 2.0.0
   ```
3. **Commit your changes**
4. **Deploy**:
   ```bash
   make release
   ```
5. Extension will be published (may take a few minutes to propagate)

## Troubleshooting

### "Invalid client_id" or "Invalid client_secret"

- Verify credentials in `.env` match Google Cloud Console
- Ensure no extra whitespace in `.env` values

### "The item is not currently published"

- Your extension must be published at least once manually first
- Check extension status in Developer Dashboard

### "Rate limit exceeded"

- Chrome Web Store has rate limits on publishing
- Wait a few minutes and try again

### "Item not found"

- Verify `EXTENSION_ID` is correct
- Ensure you're using the same Google account that owns the extension

### Refresh token expired

- Re-run `make cws-init` to get a new refresh token
- Update `.env` with the new token

## Security Notes

- **Never commit `.env`** to version control (it's already in `.gitignore`)
- Keep your `CLIENT_SECRET` and `REFRESH_TOKEN` private
- Consider using a dedicated Google account for publishing
- Rotate credentials if you suspect they've been compromised

## GitHub Actions (CI/CD)

The repository includes a GitHub Actions workflow for automated publishing.

### Setup GitHub Secrets

Go to your repository **Settings** → **Secrets and variables** → **Actions** and add:

| Secret Name | Value |
|-------------|-------|
| `EXTENSION_ID` | Your Chrome Web Store extension ID |
| `CWS_CLIENT_ID` | OAuth Client ID from Google Cloud |
| `CWS_CLIENT_SECRET` | OAuth Client Secret |
| `CWS_REFRESH_TOKEN` | Refresh token from `make cws-init` |

### Trigger Methods

#### 1. Tag Push (auto-publish)

Create and push a version tag to automatically build and publish:

```bash
# Bump version and create tag
make bump-patch
git add package.json public/manifest.json
git commit -m "chore: bump version to $(make version)"
git tag v$(make version)
git push && git push --tags
```

This will automatically upload AND publish to Chrome Web Store.

#### 2. Manual Dispatch (draft or publish)

1. Go to **Actions** tab in GitHub
2. Select **Publish to Chrome Web Store** workflow
3. Click **Run workflow**
4. Choose whether to publish immediately or just upload as draft

### Workflow Features

- Runs tests before building
- Creates ZIP package artifact (retained 30 days)
- Uploads to Chrome Web Store
- Conditionally publishes based on trigger type
- Generates job summary with results

## References

- [Chrome Web Store API Documentation](https://developer.chrome.com/docs/webstore/using_webstore_api/)
- [chrome-webstore-upload-cli](https://github.com/nickytonline/chrome-webstore-upload-cli)
- [Google Cloud Console](https://console.cloud.google.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
