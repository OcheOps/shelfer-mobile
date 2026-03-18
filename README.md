# Shelfer Mobile POS

Mobile point-of-sale app for Supermarket Shelfer OS.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (iOS App Store / Google Play)
- Backend running on your network

## Quick Start

```bash
cd shelfer-mobile

# Install dependencies
npm install

# Set backend URL (use your machine's local IP, not localhost)
echo "EXPO_PUBLIC_API_URL=http://YOUR_IP:8080" > .env

# Start dev server
npx expo start
```

Scan the QR code with Expo Go on your phone.

## Login

Use any seeded account:
- `owner@single-demo.com` / `demo1234`
- `owner@multi-demo.com` / `demo1234`

## Screens

- **Login** — Email/password authentication
- **Branch Select** — Choose operating branch (auto-selects if only one)
- **POS** — Product search, barcode scanning, cart, checkout
- **Sale Success** — Confirmation + optional WhatsApp receipt prompt
- **Scanner** — Camera barcode scanner
- **Sales History** — Recent transactions
- **Settings** — Branch info, network status, logout

## Architecture

```
app/                    → Expo Router screens
  _layout.tsx           → Root layout with QueryClient
  index.tsx             → Auth check + redirect
  login.tsx             → Login screen
  branch-select.tsx     → Branch picker
  pos.tsx               → Main POS/checkout
  sale-success.tsx      → Success + receipt prompt
  scanner.tsx           → Camera barcode scanner
  sales.tsx             → Sales history
  settings.tsx          → Device info + logout
src/
  lib/api/client.ts     → API client with token refresh
  lib/api/endpoints.ts  → Typed API functions
  lib/storage/session.ts → AsyncStorage persistence
  lib/network/status.ts → NetInfo network hook
  types/                → TypeScript interfaces
```

## Key Features

- **Online-first** with offline queue fallback
- **Camera barcode scanning** via expo-camera
- **WhatsApp receipt** prompt after sale completion
- **Token refresh** on 401 responses
- **Network status** banner (online/poor/offline)
- **Queued sales** persist locally when offline
