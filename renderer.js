// ============================================
// Fragment — Renderer Process
// ============================================

(() => {
  'use strict';

  // --- State ---
  let snippets = [];
  let activeSnippetId = null;
  let currentFilter = 'all';
  let currentTag = null;
  let searchQuery = '';
  let previewMode = false;
  let saveTimeout = null;

  // --- DOM References ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    searchInput: $('#search-input'),
    snippetList: $('#snippet-list'),
    tagFilters: $('#tag-filters'),
    emptyState: $('#empty-state'),
    editorView: $('#editor-view'),
    titleInput: $('#snippet-title'),
    languageSelect: $('#snippet-language'),
    tagsInput: $('#snippet-tags'),
    snippetDate: $('#snippet-date'),
    codeEditor: $('#code-editor'),
    lineNumbers: $('#line-numbers'),
    codePreview: $('#code-preview'),
    highlightedCode: $('#highlighted-code'),
    charCount: $('#char-count'),
    toastContainer: $('#toast-container'),
  };

  // --- Utility ---
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // --- Persistence ---
  async function loadSnippetsFromDisk() {
    snippets = await window.fragment.loadSnippets();
    if (!Array.isArray(snippets)) snippets = [];
  }

  function scheduleSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      window.fragment.saveSnippets(snippets);
    }, 500);
  }

  // --- Tags ---
  function getAllTags() {
    const tagSet = new Set();
    snippets.forEach(s => {
      if (s.tags && Array.isArray(s.tags)) {
        s.tags.forEach(t => {
          if (t.trim()) tagSet.add(t.trim().toLowerCase());
        });
      }
    });
    return [...tagSet].sort();
  }

  function renderTagFilters() {
    const tags = getAllTags();
    dom.tagFilters.innerHTML = tags.map(tag => `
      <span class="tag-chip ${currentTag === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>
    `).join('');
  }

  // --- Filtering ---
  function getFilteredSnippets() {
    let result = [...snippets];

    // Filter by favorites
    if (currentFilter === 'favorites') {
      result = result.filter(s => s.favorite);
    }

    // Filter by tag
    if (currentTag) {
      result = result.filter(s => s.tags && s.tags.map(t => t.toLowerCase()).includes(currentTag));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.code || '').toLowerCase().includes(q) ||
        (s.language || '').toLowerCase().includes(q) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort by last updated
    result.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    return result;
  }

  // --- Render Snippet List ---
  function renderSnippetList() {
    const filtered = getFilteredSnippets();

    if (snippets.length === 0) {
      dom.emptyState.classList.remove('hidden');
      dom.editorView.classList.add('hidden');
      dom.snippetList.innerHTML = '';
      return;
    }

    dom.emptyState.classList.add('hidden');

    if (filtered.length === 0) {
      dom.snippetList.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-tertiary); font-size: 13px;">
          No snippets match your search.
        </div>
      `;
      return;
    }

    dom.snippetList.innerHTML = filtered.map(s => {
      const preview = (s.code || '').split('\n')[0].substring(0, 60);
      return `
        <div class="snippet-item ${s.id === activeSnippetId ? 'active' : ''}" data-id="${s.id}">
          <div class="snippet-item-header">
            <span class="snippet-item-title">${escapeHtml(s.title || 'Untitled')}</span>
            <span class="snippet-item-lang">${escapeHtml(s.language || 'txt')}</span>
          </div>
          <div class="snippet-item-preview">${escapeHtml(preview)}</div>
          <div class="snippet-item-footer">
            <span class="snippet-item-date">${formatDate(s.updatedAt || s.createdAt)}</span>
            ${s.favorite ? '<span class="snippet-item-star">★</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    renderTagFilters();
  }

  // --- Editor ---
  function openSnippet(id) {
    const snippet = snippets.find(s => s.id === id);
    if (!snippet) return;

    activeSnippetId = id;
    dom.editorView.classList.remove('hidden');
    dom.emptyState.classList.add('hidden');

    dom.titleInput.value = snippet.title || '';
    dom.languageSelect.value = snippet.language || 'plaintext';
    dom.tagsInput.value = (snippet.tags || []).join(', ');
    dom.codeEditor.value = snippet.code || '';
    dom.snippetDate.textContent = `Created ${formatDate(snippet.createdAt)}`;

    updateLineNumbers();
    updateCharCount();
    updateFavoriteButton(snippet.favorite);
    updatePreview();
    renderSnippetList();
  }

  function updateLineNumbers() {
    const lines = dom.codeEditor.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= Math.max(lines, 1); i++) {
      html += `<div class="line-number">${i}</div>`;
    }
    dom.lineNumbers.innerHTML = html;
  }

  function updateCharCount() {
    const code = dom.codeEditor.value;
    const lines = code.split('\n').length;
    const chars = code.length;
    dom.charCount.textContent = `${lines} lines · ${chars} chars`;
  }

  function updateFavoriteButton(isFav) {
    const btn = $('#btn-favorite');
    if (isFav) {
      btn.classList.add('favorited');
    } else {
      btn.classList.remove('favorited');
    }
  }

  function updatePreview() {
    if (!previewMode) {
      dom.codePreview.classList.add('hidden');
      return;
    }
    dom.codePreview.classList.remove('hidden');
    const snippet = snippets.find(s => s.id === activeSnippetId);
    if (!snippet) return;

    const code = dom.codeEditor.value;
    dom.highlightedCode.textContent = code;
    dom.highlightedCode.className = '';

    if (snippet.language && snippet.language !== 'plaintext') {
      dom.highlightedCode.classList.add(`language-${snippet.language}`);
    }

    hljs.highlightElement(dom.highlightedCode);
  }

  function saveActiveSnippet() {
    if (!activeSnippetId) return;
    const snippet = snippets.find(s => s.id === activeSnippetId);
    if (!snippet) return;

    snippet.title = dom.titleInput.value.trim() || 'Untitled';
    snippet.language = dom.languageSelect.value;
    snippet.tags = dom.tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    snippet.code = dom.codeEditor.value;
    snippet.updatedAt = Date.now();

    scheduleSave();
    renderSnippetList();
  }

  // --- Actions ---
  function createSnippet() {
    const snippet = {
      id: generateId(),
      title: '',
      language: 'javascript',
      tags: [],
      code: '',
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    snippets.unshift(snippet);
    scheduleSave();
    openSnippet(snippet.id);
    dom.titleInput.focus();
    showToast('New snippet created', 'success');
  }

  function deleteActiveSnippet() {
    if (!activeSnippetId) return;
    const idx = snippets.findIndex(s => s.id === activeSnippetId);
    if (idx === -1) return;

    snippets.splice(idx, 1);
    activeSnippetId = null;
    scheduleSave();

    if (snippets.length > 0) {
      openSnippet(snippets[0].id);
    } else {
      dom.editorView.classList.add('hidden');
      dom.emptyState.classList.remove('hidden');
      renderSnippetList();
    }
    showToast('Snippet deleted', 'info');
  }

  function toggleFavorite() {
    if (!activeSnippetId) return;
    const snippet = snippets.find(s => s.id === activeSnippetId);
    if (!snippet) return;
    snippet.favorite = !snippet.favorite;
    updateFavoriteButton(snippet.favorite);
    scheduleSave();
    renderSnippetList();
    showToast(snippet.favorite ? 'Added to starred' : 'Removed from starred', 'info');
  }

  async function copyToClipboard() {
    const code = dom.codeEditor.value;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showToast('Copied to clipboard!', 'success');
    } catch {
      showToast('Failed to copy', 'error');
    }
  }

  async function exportSnippet() {
    if (!activeSnippetId) return;
    const snippet = snippets.find(s => s.id === activeSnippetId);
    if (!snippet) return;

    const langExtMap = {
      javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
      c: 'c', cpp: 'cpp', csharp: 'cs', go: 'go', rust: 'rs',
      ruby: 'rb', php: 'php', swift: 'swift', kotlin: 'kt',
      html: 'html', css: 'css', scss: 'scss', sql: 'sql',
      bash: 'sh', powershell: 'ps1', json: 'json', yaml: 'yml',
      xml: 'xml', markdown: 'md', dockerfile: 'Dockerfile',
      graphql: 'graphql', lua: 'lua', r: 'r', dart: 'dart',
      elixir: 'ex', plaintext: 'txt',
    };

    const ext = langExtMap[snippet.language] || 'txt';
    const fileName = `${(snippet.title || 'snippet').replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;

    const result = await window.fragment.exportSnippet(snippet.code, fileName);
    if (result.success) {
      showToast('Snippet exported!', 'success');
    }
  }

  // --- Sync line numbers scroll ---
  function syncScroll() {
    dom.lineNumbers.scrollTop = dom.codeEditor.scrollTop;
  }

  // --- Tab key support in editor ---
  function handleTab(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = dom.codeEditor.selectionStart;
      const end = dom.codeEditor.selectionEnd;
      const value = dom.codeEditor.value;
      dom.codeEditor.value = value.substring(0, start) + '  ' + value.substring(end);
      dom.codeEditor.selectionStart = dom.codeEditor.selectionEnd = start + 2;
      saveActiveSnippet();
      updateLineNumbers();
    }
  }

  // --- Event Listeners ---
  function bindEvents() {
    // Window controls
    $('#btn-minimize').addEventListener('click', () => window.fragment.minimizeWindow());
    $('#btn-maximize').addEventListener('click', () => window.fragment.maximizeWindow());
    $('#btn-close').addEventListener('click', () => window.fragment.closeWindow());

    // New snippet
    $('#btn-new-snippet').addEventListener('click', createSnippet);
    $('#btn-empty-new').addEventListener('click', createSnippet);

    // Search
    dom.searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderSnippetList();
    });

    // Filters
    $$('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderSnippetList();
      });
    });

    // Tag filters (delegated)
    dom.tagFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.tag-chip');
      if (!chip) return;
      const tag = chip.dataset.tag;
      currentTag = currentTag === tag ? null : tag;
      renderSnippetList();
    });

    // Snippet list click (delegated)
    dom.snippetList.addEventListener('click', (e) => {
      const item = e.target.closest('.snippet-item');
      if (!item) return;
      openSnippet(item.dataset.id);
    });

    // Editor inputs — auto-save
    dom.titleInput.addEventListener('input', saveActiveSnippet);
    dom.languageSelect.addEventListener('change', () => {
      saveActiveSnippet();
      updatePreview();
    });
    dom.tagsInput.addEventListener('input', saveActiveSnippet);
    dom.codeEditor.addEventListener('input', () => {
      saveActiveSnippet();
      updateLineNumbers();
      updateCharCount();
      if (previewMode) updatePreview();
    });
    dom.codeEditor.addEventListener('scroll', syncScroll);
    dom.codeEditor.addEventListener('keydown', handleTab);

    // Toolbar buttons
    $('#btn-favorite').addEventListener('click', toggleFavorite);
    $('#btn-copy').addEventListener('click', copyToClipboard);
    $('#btn-export').addEventListener('click', exportSnippet);
    $('#btn-delete').addEventListener('click', deleteActiveSnippet);

    // Preview toggle
    $('#btn-toggle-preview').addEventListener('click', () => {
      previewMode = !previewMode;
      $('#btn-toggle-preview').classList.toggle('active', previewMode);
      updatePreview();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+N — new snippet
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createSnippet();
      }
      // Ctrl+F — focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        dom.searchInput.focus();
        dom.searchInput.select();
      }
      // Ctrl+S — force save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeSnippetId) {
          saveActiveSnippet();
          window.fragment.saveSnippets(snippets);
          showToast('Saved', 'success');
        }
      }
      // Delete (Ctrl+Shift+D)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        deleteActiveSnippet();
      }
    });
  }

  // --- Landing Page Transition ---
  function initLandingPage() {
    const startBtn = document.querySelector('#btn-start-app');
    const landingPage = document.querySelector('#landing-page');
    const titlebar = document.querySelector('#titlebar');
    const app = document.querySelector('#app');

    if (!startBtn || !landingPage) {
      // No landing page present, go straight to app
      startApp();
      return;
    }

    startBtn.addEventListener('click', () => {
      // Add exit animation
      landingPage.classList.add('exiting');

      // After the CSS transition completes, remove landing and show app
      setTimeout(() => {
        landingPage.style.display = 'none';
        titlebar.classList.remove('app-hidden');
        app.classList.remove('app-hidden');
        startApp();
      }, 600);
    });
  }

  // --- Start App (after landing) ---
  async function startApp() {
    await loadSnippetsFromDisk();
    renderSnippetList();
    bindEvents();

    // Open first snippet if exists
    if (snippets.length > 0) {
      openSnippet(snippets[0].id);
    }
  }

  // --- Init ---
  initLandingPage();
})();
