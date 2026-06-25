/**
 * Y2K Photo Booth - app.js (Refactored Module Version)
 * Serves as the central orchestrator and application entry point.
 * Integrates states, camera controls, sticker widgets, and high-res rendering.
 */

import { state, themeTitles } from './state.js';
import { 
  detectCameras, 
  startCameraStream, 
  stopCameraStream, 
  triggerPhotoCountdown, 
  selectSlot, 
  clearSlot 
} from './camera.js';
import { 
  addSticker, 
  deselectAllStickers 
} from './stickers.js';
import { 
  downloadComposite 
} from './canvas.js';

// --- DOM SELECTORS ---
const photoFrameContainer = document.getElementById('photoFrameContainer');
const slots = Array.from(document.querySelectorAll('.photo-slot'));
const stickersSandbox = document.getElementById('stickersSandbox');
const currentDateStr = document.getElementById('currentDateStr');
const y2kCdPlayer = document.getElementById('y2kCdPlayer');

// Controls
const btnModeCamera = document.getElementById('btnModeCamera');
const btnModeUpload = document.getElementById('btnModeUpload');
const cameraControlPanel = document.getElementById('cameraControlPanel');
const uploadControlPanel = document.getElementById('uploadControlPanel');
const cameraSelect = document.getElementById('cameraSelect');
const btnStartCamera = document.getElementById('btnStartCamera');
const btnTriggerCapture = document.getElementById('btnTriggerCapture');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

// Layouts & Themes
const btnLayoutFour = document.getElementById('btnLayoutFour');
const btnLayoutSingle = document.getElementById('btnLayoutSingle');
const themeCards = document.querySelectorAll('.theme-card');

// Stickers
const stickerItems = document.querySelectorAll('.sticker-item');
const stickerTextInput = document.getElementById('stickerTextInput');
const btnCreateTextSticker = document.getElementById('btnCreateTextSticker');
const btnClearStickers = document.getElementById('btnClearStickers');

// Actions & Overlay
const btnDownload = document.getElementById('btnDownload');
const countdownOverlay = document.getElementById('countdownOverlay');

// --- STATE ACTIONS ---

function setInputMode(mode) {
  state.inputMode = mode;
  if (mode === 'camera') {
    btnModeCamera.classList.add('active');
    btnModeUpload.classList.remove('active');
    cameraControlPanel.classList.remove('hidden');
    uploadControlPanel.classList.add('hidden');
    if (!state.cameraStream) startCameraStream();
  } else {
    btnModeCamera.classList.remove('active');
    btnModeUpload.classList.add('active');
    cameraControlPanel.classList.add('hidden');
    uploadControlPanel.classList.remove('hidden');
    stopCameraStream();
    
    slots.forEach((slot, index) => {
      const video = slot.querySelector('.video-preview');
      const img = slot.querySelector('.photo-preview');
      const placeholder = slot.querySelector('.slot-placeholder');
      const retakeBtn = slot.querySelector('.retake-btn');

      video.classList.add('hidden');
      if (state.capturedImages[index]) {
        img.src = state.capturedImages[index];
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
        retakeBtn.classList.remove('hidden');
      } else {
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
        retakeBtn.classList.add('hidden');
      }
    });
  }
}

function setLayoutMode(mode) {
  state.layoutMode = mode;
  if (mode === 'four-cut') {
    btnLayoutFour.classList.add('active');
    btnLayoutSingle.classList.remove('active');
    photoFrameContainer.classList.remove('format-single-cut');
    photoFrameContainer.classList.add('format-four-cut');
  } else {
    btnLayoutFour.classList.remove('active');
    btnLayoutSingle.classList.add('active');
    photoFrameContainer.classList.remove('format-four-cut');
    photoFrameContainer.classList.add('format-single-cut');
    if (state.activeSlotIndex > 0) selectSlot(0);
  }
}

function setTheme(theme) {
  photoFrameContainer.className = `frame-container format-${state.layoutMode === 'four-cut' ? 'four-cut' : 'single-cut'} frame-style-${theme}`;
  state.theme = theme;

  const titleTextEl = photoFrameContainer.querySelector('.win-title-text');
  if (titleTextEl) {
    const titleInfo = themeTitles[theme] || themeTitles['cyber-chrome'];
    titleTextEl.innerHTML = `<span class="win-title-icon">${titleInfo.icon}</span> ${titleInfo.text}`;
  }
}

// Format date as "YYYY.MM.DD (DAY)"
function formatCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayStr = days[now.getDay()];
  
  currentDateStr.textContent = `${year}.${month}.${date} (${dayStr})`;
}

// --- FILE UPLOAD FALLBACK ---
function handleFileSelect() {
  const files = fileInput.files;
  if (files.length === 0) return;

  const file = files[0];
  if (!file.type.startsWith('image/')) {
    alert('이미지만 업로드할 수 있어요!');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const slotIndex = state.activeSlotIndex;
    const slot = slots[slotIndex];
    const placeholder = slot.querySelector('.slot-placeholder');
    const img = slot.querySelector('.photo-preview');
    const retakeBtn = slot.querySelector('.retake-btn');

    state.capturedImages[slotIndex] = dataUrl;
    img.src = dataUrl;
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
    retakeBtn.classList.remove('hidden');

    if (state.layoutMode === 'four-cut') {
      const nextEmptyIndex = state.capturedImages.findIndex((img, idx) => img === null);
      if (nextEmptyIndex !== -1) selectSlot(nextEmptyIndex);
    }
  };
  reader.readAsDataURL(file);
  fileInput.value = '';
}

// --- EVENT BINDINGS ---
function setupEventListeners() {
  // Slots Interaction
  slots.forEach((slot, index) => {
    slot.addEventListener('click', (e) => {
      if (e.target.classList.contains('retake-btn') || countdownOverlay.classList.contains('active')) {
        return;
      }
      selectSlot(index, true);
    });

    const retakeBtn = slot.querySelector('.retake-btn');
    retakeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSlot(index);
      selectSlot(index);
    });
  });

  // Input Modes
  btnModeCamera.addEventListener('click', () => setInputMode('camera'));
  btnModeUpload.addEventListener('click', () => setInputMode('upload'));

  // Camera Actions
  btnStartCamera.addEventListener('click', () => startCameraStream());
  btnTriggerCapture.addEventListener('click', triggerPhotoCountdown);
  cameraSelect.addEventListener('change', () => {
    if (state.cameraStream) startCameraStream();
  });

  // Custom event dispatched from camera.js in case of failure
  document.addEventListener('switch-input-mode', (e) => {
    setInputMode(e.detail);
  });

  // Upload Actions
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelect();
    }
  });

  // Layouts
  btnLayoutFour.addEventListener('click', () => setLayoutMode('four-cut'));
  btnLayoutSingle.addEventListener('click', () => setLayoutMode('single'));

  // Themes
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      setTheme(card.dataset.theme);
    });
  });

  // Stickers
  stickerItems.forEach(item => {
    item.addEventListener('click', () => {
      const type = item.classList.contains('img-sticker') ? 'image' : 'emoji';
      addSticker(type, item.dataset.sticker);
    });
  });

  btnCreateTextSticker.addEventListener('click', () => {
    const text = stickerTextInput.value.trim();
    if (text) {
      addSticker('text', text);
      stickerTextInput.value = '';
    }
  });

  stickerTextInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnCreateTextSticker.click();
  });

  btnClearStickers.addEventListener('click', () => {
    stickersSandbox.innerHTML = '';
    state.stickers = [];
    state.selectedStickerId = null;
  });

  // Deselect on click container
  photoFrameContainer.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.placed-sticker')) deselectAllStickers();
  });
  
  photoFrameContainer.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.placed-sticker')) deselectAllStickers();
  });

  // Composite Download
  btnDownload.addEventListener('click', downloadComposite);
}

// --- INITIALIZATION ---
function init() {
  formatCurrentDate();
  setupEventListeners();
  detectCameras();
  selectSlot(0, false);

  // Y2K CD Player - interactive turntable speed-up + song switcher
  if (y2kCdPlayer) {
    const cdVinyl = y2kCdPlayer.querySelector('.cd-vinyl');
    const songLabel = y2kCdPlayer.querySelector('.cd-label');
    
    y2kCdPlayer.addEventListener('click', () => {
      cdVinyl.style.animationDuration = '0.7s';
      cdVinyl.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.4)';
      
      const tracks = [
        'DITTO 🐰', 'HYPE BOY 🎧', 'ATTENTION 🦋', 
        'OMG 👾', 'HOW SWEET 🍭', 'SUPERNATURAL ☄️',
        'BUBBLE GUM 🎈', 'HURT 💿'
      ];
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      songLabel.textContent = `Now Playing: ${randomTrack}`;
      
      setTimeout(() => {
        cdVinyl.style.animationDuration = '12s';
        cdVinyl.style.boxShadow = '';
      }, 2000);
    });
  }
}

// Window load init
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', stopCameraStream);
