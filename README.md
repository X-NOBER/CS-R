# CS RIOT

Browser-based CS 1.6–style FPS with GoldSrc viewmodels, BSP maps, and a short campaign mode.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer (20+ recommended)
- npm (included with Node.js)

Game assets (`public/cs16`, `public/reanims`, maps, models, sounds) are included in this repo.

## Setup

1. Clone the repository and open the project folder:

   ```bash
   git clone https://github.com/X-NOBER/CS-R.git
   cd CS-R
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Run the server

The app is served by [Vite](https://vitejs.dev/). Default port is **5173** (see `vite.config.js`).

### Production preview (recommended)

Build once, then serve the optimized bundle:

```bash
npm run build
npm run preview -- --host --port 5173
```

Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

`--host` exposes the server on your LAN (e.g. `http://192.168.x.x:5173/`) so other devices on the same network can connect.

### Development server

Hot reload while editing code:

```bash
npm run dev
```

Then open **http://localhost:5173/**.

## In-game notes

- **Start match** from the main menu after picking CT or T.
- **F9** toggles the developer HUD (viewmodel offsets, weapon list, player models).
- **G** drops your current weapon (when allowed).
- Click the canvas to capture the mouse for FPS controls.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build (add `-- --host --port 5173` as above) |
