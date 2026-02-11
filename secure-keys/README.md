# Secure API Keys

Place secret keys or credential files in this folder.

Notes:
- This folder is protected by `secure-keys/.gitignore`, so files you add here won't be committed to git.
- `server.js` loads `secure-keys/.env` first (then falls back to the project root `.env`).
- Prefer environment variables for runtime configuration when possible.

Example `secure-keys/.env`:
```
A2E_API_BASE=https://your-a2e-api-base
A2E_API_KEY=your-a2e-key
NANO_BANANA_API_BASE=https://your-nano-banana-api-base
NANO_BANANA_API_KEY=your-nano-banana-key
GOOGLE_API_KEY=your-google-api-key
```