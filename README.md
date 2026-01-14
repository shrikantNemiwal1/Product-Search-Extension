# Product Search Extension using AI and Google Cloud Vision API

## Overview

Capture any portion of the page, send it to a lightweight Node.js backend powered by Google Cloud Vision, and immediately view visually similar products. This repository contains both the browser extension (Manifest v3) and the backend service that turns screenshots into actionable shopping leads.

## Features

- **Image-based search** powered by Google Cloud Vision Web Detection.
- **Chrome extension** with crop, viewport, and full-page capture modes.
- **Rich results view** rendered with EJS templates and friendly fallbacks when no preview image exists.
- **Shortcut support** (Alt+S) and toolbar action for fast captures.

## Project Structure

```
.
├── backend             # Express server + Vision API integration
└── chrome extension    # Manifest v3 extension source
```

## Prerequisites

- Node.js v18+ (earlier LTS versions with fetch support will also work)
- A Google Cloud project with the Vision API enabled
- A service-account key (JSON) for the Vision API
- Google Chrome (or Chromium-based browser) for loading the extension

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env   # populate with your Vision service-account values
npm install
npm run dev
```

Key environment variables (all described in `.env.example`):

- `PROJECT_ID` – Google Cloud project id
- `CLIENT_EMAIL` – service-account email
- `PRIVATE_KEY` – private key (keep newline escapes as `\n`)
- Optional hardening and safety:
	- `API_KEY` – set to require `x-api-key` on requests
	- `ALLOWED_ORIGINS` – comma-separated origins for CORS
	- `MAX_IMAGE_BYTES` – max upload size (bytes); default 5MB
	- `ALLOWED_MIME_TYPES` – allowed image types
	- `VISION_TIMEOUT_MS` / `VISION_MAX_RETRIES` – Vision call limits

The backend listens on `http://localhost:3000/search` by default and responds with an HTML page containing visually similar products. It validates payloads, applies timeouts/retries, and renders a friendly empty state when no matches are found.

### 2. Chrome Extension

1. Open `chrome://extensions/` and enable **Developer mode**.
2. Click **Load unpacked** and select the `chrome extension` directory.
3. Pin the “Product Search” action if you want it visible in the toolbar.

The extension needs access to the backend. By default it points to `http://localhost:3000/search` and the manifest whitelists localhost (http/https). If you deploy elsewhere, update `host_permissions` in `chrome extension/manifest.json` and set `endpoint` via `chrome.storage.sync` (or add an options UI) to match your deployment.

### 3. Usage

1. Click the extension action (or press **Alt+S**) to trigger capture mode.
2. Draw a selection on the page, or use the keyboard shortcut to capture the viewport/page.
3. The captured image is uploaded to the backend, Vision looks for visually similar pages, and a new tab opens with the rendered results.

## Troubleshooting

- **Missing Vision credentials** – ensure `.env` contains every field listed in `.env.example`. The backend now fails fast with a descriptive error if any critical values are absent.
- **Extension cannot capture tabs** – confirm the extension is reloaded after cloning; the manifest includes the required `tabs` permission.
- **No similar products returned** – the backend falls back to visually similar images when direct matches are absent and now renders an empty state if nothing is found. Check the console for additional details.
- **Backend rejects upload** – image payloads are size- and type-checked. Adjust `MAX_IMAGE_BYTES` / `ALLOWED_MIME_TYPES` if needed.

## Tests & Quality

- Backend helper tests: `npm test`
- Syntax check: `npm run lint`

Happy building!


