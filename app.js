/**
 * Y2K Photo Booth - app.js
 * Controls webcam streams, file uploads, Y2K interactive widgets,
 * retro speech bubble stickers, and composite canvas saving.
 * Clean modern typography edition (Inter / Noto Sans KR).
 */

// --- STATE MANAGEMENT ---
const state = {
  activeSlotIndex: 0,
  layoutMode: 'four-cut', // 'four-cut' | 'single'
  inputMode: 'camera',    // 'camera' | 'upload'
  theme: 'cyber-chrome',  // Y2K default
  cameraStream: null,
  capturedImages: [null, null, null, null],
  stickers: [],
  selectedStickerId: null,
  devices: []
};

// --- DOM SELECTORS ---
const photoFrameContainer = document.getElementById('photoFrameContainer');
const slotsGrid = document.getElementById('slotsGrid');
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

// Actions
const btnDownload = document.getElementById('btnDownload');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const flashOverlay = document.getElementById('flashOverlay');
const compositeCanvas = document.getElementById('compositeCanvas');

// --- INITIALIZATION ---
function init() {
  formatCurrentDate();
  setupEventListeners();
  detectCameras();
  selectSlot(0);

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

// --- SLOT HIGHLIGHTS & MODES ---
function selectSlot(index) {
  if (state.inputMode === 'camera' && state.cameraStream && state.activeSlotIndex !== index) {
    stopCameraStream();
    btnStartCamera.classList.remove('hidden');
    btnTriggerCapture.classList.add('hidden');
  }

  state.activeSlotIndex = index;
  slots.forEach((slot, i) => {
    if (i === index) {
      slot.classList.add('active-capture');
    } else {
      slot.classList.remove('active-capture');
    }
  });

  if (state.inputMode === 'camera' && state.cameraStream) {
    startCameraStream();
  }
}

// --- EVENT BINDINGS ---
function setupEventListeners() {
  slots.forEach((slot, index) => {
    slot.addEventListener('click', (e) => {
      if (e.target.classList.contains('retake-btn') || countdownOverlay.classList.contains('active')) {
        return;
      }
      selectSlot(index);
    });

    const retakeBtn = slot.querySelector('.retake-btn');
    retakeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSlot(index);
      selectSlot(index);
    });
  });

  btnModeCamera.addEventListener('click', () => setInputMode('camera'));
  btnModeUpload.addEventListener('click', () => setInputMode('upload'));

  btnStartCamera.addEventListener('click', startCameraStream);
  btnTriggerCapture.addEventListener('click', triggerPhotoCountdown);
  cameraSelect.addEventListener('change', () => {
    if (state.cameraStream) startCameraStream();
  });

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

  btnLayoutFour.addEventListener('click', () => setLayoutMode('four-cut'));
  btnLayoutSingle.addEventListener('click', () => setLayoutMode('single'));

  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      setTheme(card.dataset.theme);
    });
  });

  stickerItems.forEach(item => {
    item.addEventListener('click', () => addSticker('emoji', item.dataset.sticker));
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

  photoFrameContainer.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.placed-sticker')) deselectAllStickers();
  });
  
  photoFrameContainer.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.placed-sticker')) deselectAllStickers();
  });

  btnDownload.addEventListener('click', downloadComposite);
}

// --- STATE MANAGEMENT COMPONENT EVENTS ---

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
}

function clearSlot(index) {
  state.capturedImages[index] = null;
  const slot = slots[index];
  const placeholder = slot.querySelector('.slot-placeholder');
  const img = slot.querySelector('.photo-preview');
  const retakeBtn = slot.querySelector('.retake-btn');
  const video = slot.querySelector('.video-preview');

  img.src = '';
  img.classList.add('hidden');
  retakeBtn.classList.add('hidden');
  placeholder.classList.remove('hidden');
  
  if (state.inputMode === 'camera' && state.activeSlotIndex === index && state.cameraStream) {
    video.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    video.classList.add('hidden');
  }
}

// --- DEVICE ACCESS ---

async function detectCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    state.devices = videoDevices;
    
    cameraSelect.innerHTML = '';
    
    if (videoDevices.length === 0) {
      cameraSelect.innerHTML = '<option value="">카메라 탐지 실패</option>';
      return;
    }
    
    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `카메라 ${index + 1}`;
      cameraSelect.appendChild(option);
    });
  } catch (err) {
    console.error(err);
    cameraSelect.innerHTML = '<option value="">카메라 접근 제한</option>';
  }
}

async function startCameraStream() {
  stopCameraStream();

  const slotIndex = state.activeSlotIndex;
  const slot = slots[slotIndex];
  const video = slot.querySelector('.video-preview');
  const placeholder = slot.querySelector('.slot-placeholder');
  const img = slot.querySelector('.photo-preview');
  const retakeBtn = slot.querySelector('.retake-btn');

  img.classList.add('hidden');
  retakeBtn.classList.add('hidden');
  placeholder.classList.add('hidden');
  video.classList.remove('hidden');

  const deviceId = cameraSelect.value;
  const constraints = {
    video: deviceId ? { deviceId: { exact: deviceId }, width: 640, height: 480 } : { width: 640, height: 480 },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    state.cameraStream = stream;
    video.srcObject = stream;
    btnStartCamera.classList.add('hidden');
    btnTriggerCapture.classList.remove('hidden');
    
    if (state.devices.length > 0 && !state.devices[0].label) {
      await detectCameras();
    }
  } catch (err) {
    console.error(err);
    video.classList.add('hidden');
    placeholder.classList.remove('hidden');
    alert('카메라에 연결할 수 없습니다. 권한 설정을 확인하시거나 사진 업로드 모드를 이용해주세요!');
    setInputMode('upload');
  }
}

function stopCameraStream() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  slots.forEach(slot => slot.querySelector('.video-preview').classList.add('hidden'));
}

// --- PHOTO CAPTURING ---

function triggerPhotoCountdown() {
  if (!state.cameraStream) return;

  btnTriggerCapture.disabled = true;
  countdownOverlay.classList.add('active');
  
  let count = 3;
  countdownNumber.textContent = count;

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
    } else {
      clearInterval(timer);
      countdownOverlay.classList.remove('active');
      capturePhoto();
      btnTriggerCapture.disabled = false;
    }
  }, 1000);
}

function capturePhoto() {
  const slotIndex = state.activeSlotIndex;
  const slot = slots[slotIndex];
  const video = slot.querySelector('.video-preview');
  const img = slot.querySelector('.photo-preview');
  const retakeBtn = slot.querySelector('.retake-btn');

  flashOverlay.classList.add('flash-active');
  setTimeout(() => flashOverlay.classList.remove('flash-active'), 500);

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/png');
  state.capturedImages[slotIndex] = dataUrl;

  img.src = dataUrl;
  img.classList.remove('hidden');
  video.classList.add('hidden');
  retakeBtn.classList.remove('hidden');

  stopCameraStream();
  btnStartCamera.classList.remove('hidden');
  btnTriggerCapture.classList.add('hidden');

  if (state.layoutMode === 'four-cut') {
    const nextEmptyIndex = state.capturedImages.findIndex((img, idx) => img === null);
    if (nextEmptyIndex !== -1) selectSlot(nextEmptyIndex);
  }
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

// --- STICKER PLACEMENT ---

function addSticker(type, content) {
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

function renderStickerDOM(sticker) {
  const stickerEl = document.createElement('div');
  stickerEl.classList.add('placed-sticker');
  stickerEl.id = sticker.id;
  
  stickerEl.style.left = `${sticker.x}%`;
  stickerEl.style.top = `${sticker.y}%`;
  stickerEl.style.transform = `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}rad)`;

  const contentEl = document.createElement('span');
  if (sticker.type === 'emoji') {
    contentEl.classList.add('sticker-content');
    contentEl.textContent = sticker.content;
  } else {
    contentEl.classList.add('sticker-text-content');
    contentEl.textContent = sticker.content;
  }
  stickerEl.appendChild(contentEl);

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

function selectSticker(id) {
  deselectAllStickers();
  state.selectedStickerId = id;
  const stickerEl = document.getElementById(id);
  if (stickerEl) stickerEl.classList.add('selected');
}

function deselectAllStickers() {
  state.selectedStickerId = null;
  document.querySelectorAll('.placed-sticker').forEach(el => el.classList.remove('selected'));
}

function deleteSticker(id) {
  state.stickers = state.stickers.filter(s => s.id !== id);
  const el = document.getElementById(id);
  if (el) el.remove();
  if (state.selectedStickerId === id) state.selectedStickerId = null;
}

function setupStickerInteractions(stickerEl, handleEl, sticker) {
  let isDragging = false;
  let isResizing = false;

  let startX, startY;
  let initialLeft, initialTop;
  let initialScale, initialRotation;
  let centerClientX, centerClientY;
  let initialDist, initialAngle;

  stickerEl.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('sticker-delete-btn') || e.target.classList.contains('sticker-resize-handle')) return;
    e.stopPropagation();
    selectSticker(sticker.id);
    startDrag(e.clientX, e.clientY);
  });

  stickerEl.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('sticker-delete-btn') || e.target.classList.contains('sticker-resize-handle')) return;
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
    const parentRect = photoFrameContainer.getBoundingClientRect();
    
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
    const parentRect = photoFrameContainer.getBoundingClientRect();
    
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

// --- COMPOSITE HIGH RESOLUTION EXPORTER ---

async function downloadComposite() {
  deselectAllStickers();

  const isFourCut = state.layoutMode === 'four-cut';
  const canvasWidth = 1200;
  const canvasHeight = isFourCut ? 2800 : 1350;

  compositeCanvas.width = canvasWidth;
  compositeCanvas.height = canvasHeight;
  const ctx = compositeCanvas.getContext('2d');

  // 1. Draw Y2K Background style
  drawThemeBackground(ctx, canvasWidth, canvasHeight);

  // 2. Draw slots
  const paddingX = canvasWidth * 0.06;
  const topOffset = canvasHeight * 0.06; 
  const slotSpacing = canvasHeight * 0.015;
  
  const slotCount = isFourCut ? 4 : 1;
  const availableHeight = canvasHeight - topOffset - (canvasHeight * 0.08) - (slotSpacing * (slotCount - 1));
  const slotHeight = availableHeight / slotCount;
  const slotWidth = canvasWidth - (paddingX * 2);

  for (let i = 0; i < slotCount; i++) {
    const x = paddingX;
    const y = topOffset + i * (slotHeight + slotSpacing);

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(x, y, slotWidth, slotHeight);

    const imgData = state.capturedImages[i];
    if (imgData) {
      await drawImageCropped(ctx, imgData, x, y, slotWidth, slotHeight);
    } else {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `bold ${slotHeight * 0.12}px 'Share Tech Mono', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EMPTY SLOT ✦', x + slotWidth / 2, y + slotHeight / 2);
    }

    // Outer line around photo slots
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, slotWidth, slotHeight);
  }

  // 3. Draw footer logo text
  drawFrameOverlays(ctx, canvasWidth, canvasHeight);

  // 4. Draw placed stickers
  drawStickers(ctx, canvasWidth, canvasHeight);

  // 5. Render flat cute title at the top
  drawCuteTitle(ctx, canvasWidth, canvasHeight);

  // Download Action
  const dataUrl = compositeCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `our_4th_anniversary_${isFourCut ? '4cut' : 'single'}.png`;
  link.href = dataUrl;
  link.click();
}

// Draw Y2K Styled Backgrounds for High-Res Print
function drawThemeBackground(ctx, width, height) {
  const theme = state.theme;

  if (theme === 'cyber-chrome') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#f1f5f9');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, width - 12, height - 12);

  } else if (theme === 'retro-tokki') {
    ctx.fillStyle = '#fdf2f8';
    ctx.fillRect(0, 0, width, height);

    // Pink Grid Line Patterns
    ctx.strokeStyle = '#fbcfe8';
    ctx.lineWidth = 3;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, width - 12, height - 12);

  } else if (theme === 'grunge-star') {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(236, 72, 153, 0.06)';
    for (let i = 0; i < 6; i++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      drawStarPattern(ctx, cx, cy, 4, 160, 35);
    }

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, width - 12, height - 12);

  } else if (theme === 'classic-polaroid') {
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, width - 10, height - 10);

  } else if (theme === 'aero-glass') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(1, '#fce7f3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(15, 15, width - 30, height - 30);

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, width - 20, height - 20);
  }
}

// Center crop image placement logic
function drawImageCropped(ctx, dataUrl, destX, destY, destWidth, destHeight) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = function() {
      const srcWidth = img.width;
      const srcHeight = img.height;

      const srcRatio = srcWidth / srcHeight;
      const destRatio = destWidth / destHeight;

      let drawWidth, drawHeight, drawX, drawY;

      if (srcRatio > destRatio) {
        drawHeight = srcHeight;
        drawWidth = srcHeight * destRatio;
        drawX = (srcWidth - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = srcWidth;
        drawHeight = srcWidth / destRatio;
        drawX = 0;
        drawY = (srcHeight - drawHeight) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight, destX, destY, destWidth, destHeight);
      resolve();
    };
  });
}

// Draw Frame Footer Text in clean modern sans-serif/monospace font
function drawFrameOverlays(ctx, width, height) {
  const dateStr = currentDateStr.textContent;
  const footerY = height - (height * 0.04);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Use clean Share Tech Mono for the date
  ctx.font = `bold ${width * 0.032}px 'Share Tech Mono', monospace`;
  ctx.fillStyle = '#4b5563';
  ctx.fillText(dateStr, width / 2, footerY);
}

// Draw Stickers onto composite high-res Canvas
function drawStickers(ctx, canvasWidth, canvasHeight) {
  state.stickers.forEach(sticker => {
    const x = (sticker.x / 100) * canvasWidth;
    const y = (sticker.y / 100) * canvasHeight;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sticker.rotation);
    ctx.scale(sticker.scale, sticker.scale);

    if (sticker.type === 'emoji') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const baseFontSize = canvasWidth * 0.075;
      ctx.font = `${baseFontSize}px Arial, Apple Color Emoji, Segoe UI Emoji`;
      ctx.fillText(sticker.content, 0, 0);
    } else {
      // Y2K Rectangular Speech Bubble with solid black borders
      const text = sticker.content;
      
      // Clean modern typography for text bubble
      ctx.font = `bold ${canvasWidth * 0.032}px 'Inter', 'Noto Sans KR', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = canvasWidth * 0.032;

      const paddingW = 20;
      const paddingH = 10;
      const rectW = textWidth + paddingW * 2;
      const rectH = textHeight + paddingH * 2;

      // Solid Y2K Black Offset shadow
      ctx.fillStyle = '#111111';
      ctx.fillRect(-rectW / 2 + 6, -rectH / 2 + 6, rectW, rectH);

      // Core white panel
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);
      
      // Flat solid black border
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 5;
      ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);

      // Print clean text inside bubble
      ctx.fillStyle = '#111111';
      ctx.fillText(text, 0, 0);
    }

    ctx.restore();
  });
}

function drawStarPattern(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// Draw clean flat character by character title in cute font Jua onto canvas
function drawCuteTitle(ctx, canvasWidth, canvasHeight) {
  const text = "4th anniversary";
  const colors = [
    "#ff70a6", "#ff70a6", "#ff9770", " ", 
    "#ffd670", "#e9ff70", "#70e8ff", "#a78bfa", 
    "#f472b6", "#fb7185", "#fb923c", "#38bdf8", 
    "#818cf8", "#f472b6", "#34d399", "#a78bfa"
  ];

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const fontSize = canvasWidth * 0.075;
  ctx.font = `bold ${fontSize}px 'Genty', 'Jua', 'Gaegu', sans-serif`;
  
  let totalWidth = 0;
  const charWidths = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const width = char === " " ? fontSize * 0.28 : ctx.measureText(char).width;
    charWidths.push(width);
    totalWidth += width;
  }

  let currentX = (canvasWidth - totalWidth) / 2;
  const y = canvasHeight * 0.032;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charW = charWidths[i];
    const color = colors[i];

    if (char !== " ") {
      // Flat solid shadow
      ctx.fillStyle = "#111111";
      ctx.fillText(char, currentX + charW / 2 + 5, y + 5);

      // Cute flat color fill
      ctx.fillStyle = color;
      ctx.fillText(char, currentX + charW / 2, y);
    }

    currentX += charW;
  }

  ctx.restore();
}

// Window load init
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', stopCameraStream);
