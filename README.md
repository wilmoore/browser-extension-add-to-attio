# Add to Attio - Chrome Extension

Capture LinkedIn, X (Twitter), and Reddit profiles and add them to Attio with a single click.

## Features

- **LinkedIn Support**: Capture name, headline, and profile URL from LinkedIn profiles
- **X (Twitter) Support**: Capture display name, handle, and bio from X profiles
- **Reddit Support**: Capture username from Reddit user pages
- **Smart Badge Indicator**: Icon badge shows contact status at a glance
  - Green dot: Person already in Attio
  - Orange dot: Capturable profile, not yet in Attio
  - No badge: Not on a capturable page
- **Duplicate Detection**: Checks if person exists before showing capture options
- **Deduplication**: Uses LinkedIn URL or Twitter handle for automatic deduplication
- **Instant Feedback**: Toast notifications confirm success or show errors

## Installation

### Development / Local Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the project directory

### Getting an Attio API Key

To use this extension, you need an Attio API access token with the correct scopes.

#### Required Scopes

| Scope | Purpose |
|-------|---------|
| `record_permission:read-write` | Create and update person records |
| `object_configuration:read` | Read object schema (required for all record operations) |

#### Step-by-Step Setup

1. Log in to your [Attio workspace](https://app.attio.com)
2. Click the dropdown next to your workspace name
3. Navigate to **Workspace settings**
4. Click the **Developers** tab
5. Click **+ New access token**
6. Enter a descriptive name (e.g., "Add To Attio")
7. Configure the scopes as shown below:
   - **Records**: Read-write
   - **Object Configuration**: Read
   - All other scopes: Disabled
8. Click **Save changes**
9. Copy the token immediately (it won't be shown again)

![Attio API Token Setup](docs/attio-api-token-setup.png)

> **Security Note**: Treat your API token like a password. Never share it publicly or commit it to version control. If compromised, delete it immediately from the Developers page and create a new one.

For more details, see the official [Attio API key documentation](https://attio.com/help/apps/other-apps/generating-an-api-key).

## Usage

1. Click the extension icon in your browser toolbar
2. Enter your Attio API key and click "Connect"
3. Navigate to a supported profile page:
   - LinkedIn: `linkedin.com/in/{username}`
   - X: `x.com/{username}` or `twitter.com/{username}`
   - Reddit: `reddit.com/user/{username}`
4. Click the extension icon and press "Add to Attio"
5. The profile will be created or updated in your Attio workspace

## Supported Platforms

| Platform | URL Pattern | Fields Captured |
|----------|-------------|-----------------|
| LinkedIn | `linkedin.com/in/*` | Name, Headline, Profile URL |
| X (Twitter) | `x.com/*`, `twitter.com/*` | Display Name, Handle, Bio |
| Reddit | `reddit.com/user/*` | Username, Profile URL |

## How It Works

The extension uses the Attio API's "assert" endpoint (`PUT /v2/objects/people/records`) with a matching attribute for atomic upsert operations:

- **LinkedIn**: Uses `linkedin_url` as the matching attribute
- **Twitter**: Uses `twitter` handle as the matching attribute
- **Reddit**: Uses `name` as the matching attribute

This ensures no duplicate records are created when capturing the same profile multiple times.

## Project Structure

```
browser-extension-add-to-attio/
├── manifest.json          # Extension manifest (V3)
├── src/
│   ├── background.js      # Service worker for API calls
│   ├── content/
│   │   ├── linkedin.js    # LinkedIn profile extraction
│   │   ├── twitter.js     # X/Twitter profile extraction
│   │   ├── reddit.js      # Reddit profile extraction
│   │   └── feedback.css   # Toast notification styles
│   ├── popup/
│   │   ├── popup.html     # Auth UI
│   │   ├── popup.js       # Auth logic
│   │   └── popup.css      # Popup styles
│   └── lib/
│       ├── attio-api.js   # Attio API client
│       └── storage.js     # Chrome storage wrapper
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

## Permissions

- **activeTab**: Access the current tab to extract profile data
- **storage**: Store API key locally
- **tabs**: Monitor tab changes to update badge indicator
- **host_permissions**: `https://api.attio.com/*` for API calls

## Development

No build step required. The extension uses ES modules directly.

To test changes:
1. Make your edits
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test on a profile page

## Privacy

- Your API key is stored locally in Chrome storage
- Profile data is sent directly to Attio's API
- No data is sent to third parties
- No analytics or tracking

## License

MIT
