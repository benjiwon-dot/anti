---
description: How to run the MEMOTILE dev server
---

1. Install dependencies
```bash
npm install
```

2. Start the development server
// turbo
```bash
npm run dev -- --host
```

3. Open the browser to the local URL (usually http://localhost:5173).
   - If on mobile on the same network, use the Network IP shown in the terminal.

## Architecture
- **Framework**: Vite + React
- **Styling**: Vanilla CSS with iOS Design System Variables (`src/index.css`)
- **Navigation**: React Router DOM (Bottom Tabs + Stack)
- **State**: Local State + SessionStorage for the creation flow.

## Key Components
- `src/components/TabBar.jsx`: Mobile bottom navigation.
- `src/pages/PhotoSelect.jsx`: iOS-style multi-select grid.
- `src/pages/Editor.jsx`: Canvas for cropping/zooming (1:1 aspect ratio).
