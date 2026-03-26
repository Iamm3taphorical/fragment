# Fragment

<p align="center">
  <strong>A smart, local-first code snippet manager built with Electron.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/HTML%2FCSS%2FJS-Vanilla-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT License">
</p>

---

## Features

- **Local-First Storage** — Your snippets are stored locally as JSON. No cloud, no accounts, no tracking.
- **Multi-Language Syntax Highlighting** — 30+ languages powered by [highlight.js](https://highlightjs.org/).
- **Lightning-Fast Search** — Filter by title, code content, language, or tags instantly.
- **Tag System** — Organize snippets with custom tags.
- **Star Favorites** — Mark important snippets for quick access.
- **Export to File** — Save any snippet as a standalone file.
- **Copy to Clipboard** — One-click copy.
- **Keyboard Shortcuts** — `Ctrl+N` (new), `Ctrl+F` (search), `Ctrl+S` (save), `Ctrl+Shift+D` (delete).
- **Dark Professional Theme** — Premium deep-oceanic dark UI with refined typography.

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)

### Steps

```bash
# Clone the repository
git clone https://github.com/Iamm3taphorical/fragment.git
cd fragment

# Install dependencies
npm install

# Launch the app
npm start
```

## Development

```bash
# Run in development mode
npm start
```

## Project Structure

```
fragment/
├── main.js          # Electron main process
├── preload.js       # Secure IPC bridge
├── index.html       # Application UI
├── style.css        # Design system
├── renderer.js      # Application logic
├── package.json     # Project manifest
└── README.md        # This file
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New snippet |
| `Ctrl+F` | Focus search |
| `Ctrl+S` | Force save |
| `Ctrl+Shift+D` | Delete snippet |
| `Tab` | Insert 2 spaces in editor |

## License

MIT License — see [LICENSE](LICENSE) for details.
