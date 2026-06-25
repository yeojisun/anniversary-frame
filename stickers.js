/**
 * stickers.js
 * Handles adding stickers, rendering DOM nodes, managing sticker selection,
 * and binding complex mouse/touch gestures for dragging, rotating, and resizing.
 */

import { state } from './state.js';

// DOM Selectors
const stickersSandbox = document.getElementById('stickersSandbox');

export function addSticker(type, content) {
  const id = 'sticker_' + Date.now();
  const newSticker = {
    id: id,
    type: type,
    content: content,
    x: 45 + Math.random() * 10,
    y: 45 + Math.random() * 10,
    scale: 1.0,
    rotation: 0
  };

  state.stickers.push(newSticker);
  renderStickerDOM(newSticker);
  selectSticker(id);
}

export function renderStickerDOM(sticker) {
  const stickerEl = document.createElement('div');
  stickerEl.classList.add('placed-sticker');
  stickerEl.id = sticker.id;
  
  stickerEl.style.left = `${sticker.x}%`;
  stickerEl.style.top = `${sticker.y}%`;
  stickerEl.style.transform = `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}rad)`;

  if (sticker.type === 'emoji') {
    const contentEl = document.createElement('span');
    contentEl.classList.add('sticker-content');
    contentEl.textContent = sticker.content;
    stickerEl.appendChild(contentEl);
  } else if (sticker.type === 'image') {
    const imgEl = document.createElement('img');
    imgEl.src = sticker.content;
    imgEl.classList.add('sticker-image-content');
    imgEl.style.width = '80px';
    imgEl.style.height = 'auto';
    imgEl.style.pointerEvents = 'none';
    imgEl.style.userSelect = 'none';
    stickerEl.appendChild(imgEl);
  } else {
    const contentEl = document.createElement('span');
    contentEl.classList.add('sticker-text-content');
    contentEl.textContent = sticker.content;
    stickerEl.appendChild(contentEl);
  }

  const delBtn = document.createElement('div');
  delBtn.classList.add('sticker-delete-btn');
  delBtn.innerHTML = '✕';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteSticker(sticker.id);
  });
  stickerEl.appendChild(delBtn);

  const handle = document.createElement('div');
  handle.classList.add('sticker-resize-handle');
  handle.innerHTML = '⤗';
  stickerEl.appendChild(handle);

  setupStickerInteractions(stickerEl, handle, sticker);
  stickersSandbox.appendChild(stickerEl);
}

export function selectSticker(id) {
  deselectAllStickers();
  state.selectedStickerId = id;
  const stickerEl = document.getElementById(id);
  if (stickerEl) stickerEl.classList.add('selected');
}

export function deselectAllStickers() {
  state.selectedStickerId = null;
  document.querySelectorAll('.placed-sticker').forEach(el => el.classList.remove('selected'));
}

export function deleteSticker(id) {
  state.stickers = state.stickers.filter(s => s.id !== id);
  const el = document.getElementById(id);
  if (el) el.remove();
  if (state.selectedStickerId === id) state.selectedStickerId = null;
}

export function setupStickerInteractions(stickerEl, handleEl, sticker) {
  let isDragging = false;
  let isResizing = false;

  let startX, startY;
  let initialLeft, initialTop;
  let initialScale, initialRotation;
  let centerClientX, centerClientY;
  let initialDist, initialAngle;

  stickerEl.addEventListener('mousedown', (e) => {
    if (e.target.closest('.sticker-delete-btn') || e.target.closest('.sticker-resize-handle')) return;
    e.stopPropagation();
    selectSticker(sticker.id);
    startDrag(e.clientX, e.clientY);
  });

  stickerEl.addEventListener('touchstart', (e) => {
    if (e.target.closest('.sticker-delete-btn') || e.target.closest('.sticker-resize-handle')) return;
    e.stopPropagation();
    selectSticker(sticker.id);
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  });

  function startDrag(clientX, clientY) {
    isDragging = true;
    startX = clientX;
    startY = clientY;
    
    const rect = stickerEl.getBoundingClientRect();
    const parentRect = stickersSandbox.getBoundingClientRect();
    
    initialLeft = rect.left - parentRect.left + rect.width / 2;
    initialTop = rect.top - parentRect.top + rect.height / 2;
    
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onTouchDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
  }

  function onDragMove(e) {
    if (!isDragging) return;
    performDrag(e.clientX, e.clientY);
  }

  function onTouchDragMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    performDrag(touch.clientX, touch.clientY);
  }

  function performDrag(clientX, clientY) {
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    const newX = initialLeft + dx;
    const newY = initialTop + dy;
    const parentRect = stickersSandbox.getBoundingClientRect();
    
    const pctX = (newX / parentRect.width) * 100;
    const pctY = (newY / parentRect.height) * 100;

    sticker.x = pctX;
    sticker.y = pctY;

    stickerEl.style.left = `${pctX}%`;
    stickerEl.style.top = `${pctY}%`;
  }

  function onDragEnd() {
    isDragging = false;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onTouchDragMove);
    document.removeEventListener('touchend', onDragEnd);
  }

  // Handle Resize and Rotate
  handleEl.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    startResize(e.clientX, e.clientY);
  });

  handleEl.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    const touch = e.touches[0];
    startResize(touch.clientX, touch.clientY);
  });

  function startResize(clientX, clientY) {
    isResizing = true;
    const rect = stickerEl.getBoundingClientRect();
    centerClientX = rect.left + rect.width / 2;
    centerClientY = rect.top + rect.height / 2;

    initialScale = sticker.scale;
    initialRotation = sticker.rotation;

    const dx = clientX - centerClientX;
    const dy = clientY - centerClientY;
    initialDist = Math.hypot(dx, dy);
    initialAngle = Math.atan2(dy, dx);

    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
    document.addEventListener('touchmove', onTouchResizeMove, { passive: false });
    document.addEventListener('touchend', onResizeEnd);
  }

  function onResizeMove(e) {
    if (!isResizing) return;
    performResize(e.clientX, e.clientY);
  }

  function onTouchResizeMove(e) {
    if (!isResizing) return;
    e.preventDefault();
    const touch = e.touches[0];
    performResize(touch.clientX, touch.clientY);
  }

  function performResize(clientX, clientY) {
    const dx = clientX - centerClientX;
    const dy = clientY - centerClientY;
    
    const currentDist = Math.hypot(dx, dy);
    const currentAngle = Math.atan2(dy, dx);

    let scale = initialScale * (currentDist / initialDist);
    scale = Math.max(0.3, Math.min(4.0, scale));

    const dAngle = currentAngle - initialAngle;
    const rotation = initialRotation + dAngle;

    sticker.scale = scale;
    sticker.rotation = rotation;

    stickerEl.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotation}rad)`;
  }

  function onResizeEnd() {
    isResizing = false;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    document.removeEventListener('touchmove', onTouchResizeMove);
    document.removeEventListener('touchend', onResizeEnd);
  }
}
