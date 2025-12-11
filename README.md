# GB QR Studio — Game Boy‑style QR Generator

Web app to create retro Game Boy‑styled QR codes with customizable color palettes and controls for scale, padding, and QR size. Export as PNG or copy the Base64 output, and keep a local history of your generated items.

## Features

- Monochrome QR generation with preset and custom palettes.
- Title and subtitle rendered with pixel font (Press Start 2P).
- Controls for `scale`, `padding`, and `qrSize` to fine‑tune output.
- Quick export: `PNG` (download) and `Base64` (copy to clipboard).
- Local history (up to 5 entries) with load and delete.
- UI built with accessible components and `Tailwind` styling.

## Requirements

- `Node.js` and `npm` installed.

## Install & Run

```bash
npm install
npm run dev
```

The app runs with Vite. Open your browser at the development server URL.

## Available Scripts

- `npm run dev`: start the development server.
- `npm run build`: produce a production build in `dist/`.
- `npm run preview`: serve the built app for verification.
- `npm run lint`: run ESLint on the project.

## Usage

- Enter `TITLE` and `SUBTITLE` (max 12 characters each).
- Provide QR data (`URL` or free text).
- Choose a preset palette or enable `CUSTOM` to use your own colors.
- Adjust `SCALE`, `PADDING`, and `QR SIZE` as needed.
- Click `GENERATE QR` to create the image.
- Use `SAVE PNG` to download or `COPY B64` to copy the Base64.
- Manage results from `HISTORY` (load or delete).

## Project Structure

- `src/components/QRGenerator.tsx`: main UI for generation and export.
- `src/lib/gb-qr.ts`: QR composition engine and palettes (`qrcode` + canvas).
- `src/pages/Index.tsx`: root page mounting the generator.
- `src/App.tsx`: routing and providers (toasts, tooltips, react‑query).
- `index.html`: metadata and entry to `src/main.tsx`.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- `qrcode` for QR rendering
- Simple Icons

## Deployment

1. Build for production:
   ```bash
   npm run build
   ```
2. Serve the `dist/` content on your hosting platform (Vercel, Netlify, GitHub Pages, static server, etc.).
3. To verify the build locally:
   ```bash
   npm run preview
   ```

## Credits

- Font: Press Start 2P (Google Fonts).
- QR library: `qrcode`.
