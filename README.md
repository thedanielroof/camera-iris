# CAMERA IRIS

Space-styled generation studio UI for image/video workflows.

## Secure API Key Setup

1) Create a `.env` file in `secure-keys/` (preferred) or in this folder (both are git-ignored):

```
A2E_API_BASE=https://your-a2e-api-base
A2E_API_KEY=your-key
NANO_BANANA_API_BASE=https://your-nano-banana-api-base
NANO_BANANA_API_KEY=your-nano-banana-key
PORT=8080
```

2) Start the server:

```bash
cd "/Users/editor10/Documents/AIRIS"
node server.js
```

Open `http://localhost:8080`.

## How It Works

- The frontend sends requests to `http://localhost:8080/api/...`.
- `server.js` proxies those requests to the upstream A2E API using your secret key.
- API keys never live in the browser.

## Files

- `index.html`: UI structure
- `styles.css`: visual system + responsive layout
- `app.js`: model logic, payload building, API integration
- `server.js`: secure proxy + static file server
- `.env.example`: environment variable template
