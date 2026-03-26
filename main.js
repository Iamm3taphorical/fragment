const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// --- Data Persistence ---
const STORE_PATH = path.join(app.getPath('userData'), 'fragment-snippets.json');

function loadSnippets() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load snippets:', e);
  }
  return [];
}

function saveSnippets(snippets) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(snippets, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save snippets:', e);
  }
}

// --- Window ---
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---
ipcMain.handle('snippets:load', () => {
  return loadSnippets();
});

ipcMain.handle('snippets:save', (_event, snippets) => {
  saveSnippets(snippets);
  return { success: true };
});

ipcMain.handle('window:minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return mainWindow.isMaximized();
});

ipcMain.handle('window:close', () => {
  mainWindow.close();
});

ipcMain.handle('dialog:export', async (_event, content, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'All Files', extensions: ['*'] }],
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, path: result.filePath };
  }
  return { success: false };
});
