// ==UserScript==
// @name         XenForo User Tagger (Inline UI)
// @namespace    xf-user-tagger-inline-ui
// @author       yolotheswagnificent
// @version      1.2.0
// @description  Tag users with label + color using an inline UI under profiles, with quick tags
// @match        *://*/*
// @grant        GM.getValue
// @grant        GM.setValue
// @downloadURL  https://github.com/yolotheswagnificent/XenForo-User-Tagger/raw/refs/heads/main/XenForoUserTagger.user.js
// @updateURL    https://github.com/yolotheswagnificent/XenForo-User-Tagger/raw/refs/heads/main/XenForoUserTagger.user.js
// ==/UserScript==

function isXenForo() {
  return !!(
    document.querySelector('article.message .message-user[data-user-id]') ||
    document.querySelector('article.message .messageUserBlock') ||
    document.querySelector('meta[name="generator"][content*="XenForo"]')
  );
}

(function () {
  'use strict';

  if (!isXenForo()) return;

  const STORAGE_KEY = `forumUserTags:${location.hostname}`;
  const QUICK_TAGS_KEY = `forumUserQuickTags:${location.hostname}`;
  const MAX_QUICK_TAGS = 12;

  const COLORS = [
    '#d9534f', // red (default)
    '#f0ad4e',
    '#ffd23f',
    '#5cb85c',
    '#5bc0de',
    '#428bca',
    '#9b59b6',
    '#6c757d'
  ];

  const loadTags = () => GM.getValue(STORAGE_KEY, {});
  const saveTags = tags => GM.setValue(STORAGE_KEY, tags);
  const loadQuickTags = () => GM.getValue(QUICK_TAGS_KEY, []);
  const saveQuickTags = tags => GM.setValue(QUICK_TAGS_KEY, tags);

  async function applyTags() {
    const tags = await loadTags();

    document.querySelectorAll('article.message').forEach(post => {
      const userSection = post.querySelector('.message-user[data-user-id]');
      if (!userSection) return;

      const userId = userSection.dataset.userId;
      const tag = tags[userId];
      if (!tag) return;

      post.style.borderLeft = `4px solid ${tag.color}`;
      post.style.background = `${tag.color}22`;

      const username = userSection.querySelector('.username');
      if (username && !username.dataset.tagApplied) {
        const badge = document.createElement('span');
        badge.textContent = tag.label;
        badge.style.cssText = `
          margin-left: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: bold;
          color: #fff;
          background: ${tag.color};
          border-radius: 4px;
          display: inline-block;
          max-width: 100%;
          white-space: nowrap;
        `;
        username.after(badge);
        username.dataset.tagApplied = 'true';
      }
    });
  }

  function updateSwatchOutlines(colorRow, selectedColor) {
    colorRow.querySelectorAll('div').forEach(d => {
      d.style.outline = d.dataset.color === selectedColor ? '2px solid #fff' : 'none';
    });
  }

  async function openTagEditor(userSection) {
    const userId = userSection.dataset.userId;
    const username =
      userSection.querySelector('.username')?.textContent.trim() || 'user';

    const tags = await loadTags();
    const existing = tags[userId] || { label: '', color: COLORS[0] };

    document.querySelectorAll('.tag-editor').forEach(e => e.remove());

    const editor = document.createElement('div');
    editor.className = 'tag-editor';
    editor.style.cssText = `
      position: absolute;
      z-index: 1000;
      top: 100%;
      left: 0;
      margin-top: 6px;
      padding: 14px;
      width: 340px;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 8px;
      color: #e6e6e6;
      font-size: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Tag for ${username}`;
    input.value = existing.label;
    input.style.cssText = `
      width: 100%;
      margin-bottom: 6px;
      padding: 4px;
      background: #2b2b2b;
      color: #fff;
      border: 1px solid #555;
      border-radius: 4px;
    `;

    const colorRow = document.createElement('div');
    colorRow.style.cssText = `
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    `;

    let selectedColor = existing.color;

    COLORS.forEach(color => {
      const swatch = document.createElement('div');
      swatch.dataset.color = color;
      swatch.style.cssText = `
        width: 22px;
        height: 22px;
        border-radius: 4px;
        cursor: pointer;
        background: ${color};
        outline: ${color === selectedColor ? '2px solid #fff' : 'none'};
      `;
      swatch.addEventListener('click', () => {
        selectedColor = color;
        updateSwatchOutlines(colorRow, selectedColor);
      });
      colorRow.appendChild(swatch);
    });

    // --- Quick Tags Section ---
    const quickTagsSection = document.createElement('div');
    quickTagsSection.style.cssText = `
      margin-bottom: 10px;
      border-top: 1px solid #444;
      padding-top: 10px;
    `;

    const quickTagsLabel = document.createElement('div');
    quickTagsLabel.textContent = 'Quick Tags:';
    quickTagsLabel.style.cssText = `
      margin-bottom: 6px;
      font-weight: bold;
      color: #aaa;
    `;

    const quickTagsList = document.createElement('div');
    quickTagsList.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
      max-height: 100px;
      overflow-y: auto;
    `;

    async function renderQuickTags() {
      const quickTags = await loadQuickTags();
      quickTagsList.innerHTML = '';

      if (quickTags.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'No quick tags saved yet.';
        empty.style.color = '#777';
        quickTagsList.appendChild(empty);
        return;
      }

      quickTags.forEach((qt, index) => {
        const chip = document.createElement('div');
        chip.style.cssText = `
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: ${qt.color};
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: bold;
          max-width: 100%;
        `;

        const label = document.createElement('span');
        label.textContent = qt.label;
        label.style.cssText = `
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `;

        chip.appendChild(label);

        chip.addEventListener('click', () => {
          input.value = qt.label;
          selectedColor = qt.color;
          updateSwatchOutlines(colorRow, selectedColor);
        });

        const deleteBtn = document.createElement('span');
        deleteBtn.textContent = '×';
        deleteBtn.style.cssText = `
          margin-left: 2px;
          cursor: pointer;
          font-weight: bold;
          opacity: 0.8;
        `;
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const current = await loadQuickTags();
          current.splice(index, 1);
          await saveQuickTags(current);
          renderQuickTags();
        });

        chip.appendChild(deleteBtn);
        quickTagsList.appendChild(chip);
      });
    }

    const saveQuickBtn = document.createElement('button');
    saveQuickBtn.textContent = '+ Save as Quick Tag';
    saveQuickBtn.style.cssText = `
      padding: 4px 8px;
      background: #428bca;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: #fff;
      font-size: 11px;
    `;

    saveQuickBtn.onclick = async () => {
      const label = input.value.trim();
      if (!label) return;

      const current = await loadQuickTags();
      const exists = current.some(qt => qt.label === label && qt.color === selectedColor);
      if (exists) return;

      if (current.length >= MAX_QUICK_TAGS) current.shift();
      current.push({ label, color: selectedColor });
      await saveQuickTags(current);
      renderQuickTags();
    };

    quickTagsSection.append(quickTagsLabel, quickTagsList, saveQuickBtn);
    renderQuickTags();
    // --- End Quick Tags Section ---

    const buttons = document.createElement('div');
    buttons.style.cssText = `display: flex; gap: 6px; margin-top: 10px;`;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = `
      padding: 4px 8px;
      background: #5cb85c;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: #000;
    `;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.cssText = `
      padding: 4px 8px;
      background: #d9534f;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: #fff;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 4px 8px;
      background: #6c757d;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: #fff;
    `;

    saveBtn.onclick = async () => {
      if (!input.value.trim()) return;
      saveBtn.disabled = true;
      removeBtn.disabled = true;
      tags[userId] = { label: input.value.trim(), color: selectedColor };
      await saveTags(tags);
      location.reload();
    };

    removeBtn.onclick = async () => {
      saveBtn.disabled = true;
      removeBtn.disabled = true;
      delete tags[userId];
      await saveTags(tags);
      location.reload();
    };

    cancelBtn.onclick = () => editor.remove();

    buttons.append(saveBtn, removeBtn, cancelBtn);

    editor.append(input, colorRow, quickTagsSection, buttons);
    userSection.appendChild(editor);
  }

  function addTagButton(userSection) {
    if (userSection.dataset.tagButtonAdded) return;

    const btn = document.createElement('button');
    btn.textContent = 'Tag user';
    btn.style.cssText = `
      margin-top: 6px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid #444;
      background: #2b2b2b;
      color: #e6e6e6;
    `;

    btn.onclick = () => openTagEditor(userSection);

    (userSection.querySelector('.message-userExtras') || userSection)
      .appendChild(btn);

    userSection.dataset.tagButtonAdded = 'true';
  }

  async function init() {
    document
      .querySelectorAll('.message-user[data-user-id]')
      .forEach(addTagButton);
    await applyTags();
  }

  function createBackupUI() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      font-family: sans-serif;
    `;

    const btn = document.createElement('button');
    btn.textContent = '💾 Tags';
    btn.title = 'Backup / restore tags';
    btn.style.cssText = `
      padding: 8px 12px;
      border-radius: 6px;
      border: none;
      background: #222;
      color: #eee;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;

    const menu = document.createElement('div');
    menu.style.cssText = `
      position: absolute;
      bottom: 110%;
      right: 0;
      width: 280px;
      padding: 12px;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      display: none;
      flex-direction: column;
      gap: 8px;
    `;

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📤 Export tags to file';
    exportBtn.style.cssText = baseBtnStyle('#428bca', '#fff');

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,.txt';
    importInput.style.display = 'none';

    const importBtn = document.createElement('button');
    importBtn.textContent = '📥 Import tags from file';
    importBtn.style.cssText = baseBtnStyle('#5cb85c', '#fff');

    exportBtn.onclick = async () => {
      const tags = await loadTags();
      const blob = new Blob([JSON.stringify(tags, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forumUserTags.${location.hostname}.${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    importBtn.onclick = () => importInput.click();

    importInput.onchange = () => {
      const file = importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const imported = JSON.parse(reader.result);
          if (typeof imported !== 'object') throw new Error('Invalid file');
          await saveTags(imported);
          location.reload();
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    function baseBtnStyle(bg, color) {
      return `
        padding: 6px;
        background: ${bg};
        color: ${color};
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
    }

    btn.onclick = () => {
      menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    };

    menu.append(exportBtn, importBtn);
    wrapper.append(btn, menu, importInput);
    document.body.appendChild(wrapper);
  }

  init();
  createBackupUI();

  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(init, 50);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();