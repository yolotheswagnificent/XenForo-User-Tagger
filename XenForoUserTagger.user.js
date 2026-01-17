// ==UserScript==
// @name         XenForo User Tagger (Inline UI)
// @namespace    xf-user-tagger-inline-ui
// @author       yolotheswagnificent
// @version      1.1.0
// @description  Tag users with label + color using an inline UI under profiles
// @match        *://*/*
// @grant        none
// @downloadURL  https://github.com/yolotheswagnificent/XenForo-User-Tagger/raw/main/XenForoUserTagger.user.js
// @updateURL    https://github.com/yolotheswagnificent/XenForo-User-Tagger/raw/main/XenForoUserTagger.user.js
// ==/UserScript==

function isXenForo() {
  // Common XenForo patterns (v1/v2 themes vary, but these are good heuristics)
  return (
    document.querySelector('article.message .message-user[data-user-id]') ||
    document.querySelector('article.message .messageUserBlock') ||
    document.querySelector('meta[name="generator"][content*="XenForo"]')
  );
}

(function () {
  'use strict';

  //Stop here if not XenForo
  if (!isXenForo()) return;

  const STORAGE_KEY = `forumUserTags:${location.hostname}`;

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

  const loadTags = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  const saveTags = tags =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));

  function applyTags() {
    const tags = loadTags();

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

  function openTagEditor(userSection) {
    const userId = userSection.dataset.userId;
    const username =
      userSection.querySelector('.username')?.textContent.trim() || 'user';

    const tags = loadTags();
    const existing = tags[userId] || { label: '', color: COLORS[0] };

    // Remove any existing editor
    userSection.querySelector('.tag-editor')?.remove();

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

    // Label input
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

    // Color picker
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
        colorRow.querySelectorAll('div').forEach(d => d.style.outline = 'none');
        swatch.style.outline = '2px solid #fff';
      });
      colorRow.appendChild(swatch);
    });

    // Buttons
    const buttons = document.createElement('div');
    buttons.style.cssText = `display: flex; gap: 6px;`;

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

    saveBtn.onclick = () => {
      if (!input.value.trim()) return;
      tags[userId] = { label: input.value.trim(), color: selectedColor };
      saveTags(tags);
      location.reload();
    };

    removeBtn.onclick = () => {
      delete tags[userId];
      saveTags(tags);
      location.reload();
    };

    cancelBtn.onclick = () => editor.remove();

    buttons.append(saveBtn, removeBtn, cancelBtn);

    editor.append(input, colorRow, buttons);
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

  function init() {
    document
      .querySelectorAll('.message-user[data-user-id]')
      .forEach(addTagButton);
    applyTags();
  }

  init();

  new MutationObserver(init).observe(document.body, {
    childList: true,
    subtree: true
  });

})();
