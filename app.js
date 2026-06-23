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

  const placeholderImg = placeholder.querySelector('.slot-placeholder-img');
  if (placeholderImg) {
    placeholderImg.src = 'minji_main.png';
  }
  
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
    video: deviceId 
      ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } } 
      : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
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
    
    const placeholderImg = placeholder.querySelector('.slot-placeholder-img');
    if (placeholderImg) {
      placeholderImg.src = 'minji_dizzy.png';
    }

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

// --- COMPOSITE HIGH RESOLUTION EXPORTER ---

// --- COMPOSITE HIGH RESOLUTION EXPORTER ---

function drawBevelRect(ctx, x, y, w, h, isPressed, bgColor) {
  ctx.fillStyle = bgColor || '#d4d0c8';
  ctx.fillRect(x, y, w, h);

  ctx.lineWidth = 2;
  if (isPressed) {
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x + 1, y + h - 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + w - 1, y + 1);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(x + 1, y + h - 1);
    ctx.lineTo(x + w - 1, y + h - 1);
    ctx.lineTo(x + w - 1, y + 1);
    ctx.stroke();

    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }
}

async function downloadComposite() {
  deselectAllStickers();

  const isFourCut = state.layoutMode === 'four-cut';
  const canvasWidth = 1200;
  const canvasHeight = isFourCut ? 2800 : 1450;

  compositeCanvas.width = canvasWidth;
  compositeCanvas.height = canvasHeight;
  const ctx = compositeCanvas.getContext('2d');

  // Load theme variables
  let winBg = '#d4d0c8';
  let titleGradStart = '#db2777';
  let titleGradEnd = '#f472b6';
  let workspaceBg = '#7f7f7f';
  let slotsBg = '#ffffff';
  let slotsBorder = '#111111';
  let dateColor = '#4b5563';
  let isGridWorkspace = false;
  let isDarkTheme = false;

  if (state.theme === 'retro-tokki') {
    winBg = '#fce7f3';
    titleGradStart = '#c084fc';
    titleGradEnd = '#f472b6';
    workspaceBg = '#fdf2f8';
    isGridWorkspace = true;
    slotsBg = '#ffffff';
    slotsBorder = '#f472b6';
    dateColor = '#db2777';
  } else if (state.theme === 'grunge-star') {
    winBg = '#27272a';
    titleGradStart = '#ec4899';
    titleGradEnd = '#8b5cf6';
    workspaceBg = '#09090b';
    slotsBg = '#18181b';
    slotsBorder = '#ec4899';
    dateColor = '#ffffff';
    isDarkTheme = true;
  } else if (state.theme === 'classic-polaroid') {
    winBg = '#f5f5f4';
    titleGradStart = '#292524';
    titleGradEnd = '#57534e';
    workspaceBg = '#e7e5e4';
    slotsBg = '#ffffff';
    slotsBorder = '#cbd5e1';
  } else if (state.theme === 'aero-glass') {
    winBg = '#e0f2fe';
    titleGradStart = '#06b6d4';
    titleGradEnd = '#ec4899';
    workspaceBg = '#f0f9ff';
    slotsBg = '#ffffff';
    slotsBorder = '#111111';
  }

  // 1. Draw outer window frame
  drawBevelRect(ctx, 0, 0, canvasWidth, canvasHeight, false, winBg);

  // 2. Draw Title Bar
  const titleBarH = 90;
  const titleGrad = ctx.createLinearGradient(10, 10, canvasWidth - 20, 10);
  titleGrad.addColorStop(0, titleGradStart);
  titleGrad.addColorStop(1, titleGradEnd);
  ctx.fillStyle = titleGrad;
  ctx.fillRect(10, 10, canvasWidth - 20, titleBarH);

  // Title text with emoji instead of Windows logo
  const logoX = 24;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText("🎨 Graphics editor", logoX, 10 + titleBarH / 2);

  // Control buttons on titlebar
  const btnSize = 34;
  const btnY = 10 + (titleBarH - btnSize) / 2;
  const rightOffset = canvasWidth - 10 - 20;
  
  const drawBtnSymbol = (bX, type) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    if (type === 'min') {
      ctx.beginPath();
      ctx.moveTo(bX + 8, btnY + btnSize - 10);
      ctx.lineTo(bX + btnSize - 8, btnY + btnSize - 10);
      ctx.stroke();
    } else if (type === 'max') {
      ctx.strokeRect(bX + 8, btnY + 8, btnSize - 16, btnSize - 16);
      ctx.fillRect(bX + 8, btnY + 8, btnSize - 16, 5);
    } else if (type === 'close') {
      ctx.beginPath();
      ctx.moveTo(bX + 9, btnY + 9);
      ctx.lineTo(bX + btnSize - 9, btnY + btnSize - 9);
      ctx.moveTo(bX + btnSize - 9, btnY + 9);
      ctx.lineTo(bX + 9, btnY + btnSize - 9);
      ctx.stroke();
    }
  };

  const btnTypes = ['min', 'max', 'close'];
  btnTypes.forEach((type, idx) => {
    const bX = rightOffset - (3 - idx) * (btnSize + 6);
    drawBevelRect(ctx, bX, btnY, btnSize, btnSize, false, winBg);
    drawBtnSymbol(bX, type);
  });

  // 3. Draw Menu Bar
  const menuBarY = 10 + titleBarH;
  const menuBarH = 60;
  ctx.fillStyle = winBg;
  ctx.fillRect(10, menuBarY, canvasWidth - 20, menuBarH);
  
  ctx.font = '26px sans-serif';
  ctx.fillStyle = isDarkTheme ? '#ec4899' : '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText("File     Edit     View     Image     Colors     Help", 30, menuBarY + menuBarH / 2);

  // Thin separator under menu bar
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, menuBarY + menuBarH);
  ctx.lineTo(canvasWidth - 10, menuBarY + menuBarH);
  ctx.stroke();

  // 4. Draw Status Bar
  const statusBarH = 70;
  const statusBarY = canvasHeight - 10 - statusBarH;
  
  // Left status message field
  const msgW = canvasWidth - 20 - 260;
  drawBevelRect(ctx, 10 + 6, statusBarY + 12, msgW, statusBarH - 24, true, winBg);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = isDarkTheme ? '#ec4899' : '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText("For Help, click Help Topics on the Help Menu", 30, statusBarY + statusBarH / 2);

  // Right date field
  const dateFieldX = 10 + 6 + msgW + 12;
  const dateFieldW = 220;
  drawBevelRect(ctx, dateFieldX, statusBarY + 12, dateFieldW, statusBarH - 24, true, winBg);
  ctx.font = `bold 22px 'Share Tech Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(currentDateStr.textContent, dateFieldX + dateFieldW / 2, statusBarY + statusBarH / 2);

  // 5. Draw Sidebar
  const sidebarW = 120;
  const bodyY = menuBarY + menuBarH + 2;
  const bodyH = statusBarY - bodyY - 2;
  drawBevelRect(ctx, 10, bodyY, sidebarW, bodyH, true, winBg);

  // Draw 2x8 buttons in Sidebar
  const cols = 2;
  const rows = 8;
  const bW = 46;
  const bH = 44;
  const bGap = 8;
  const startX = 10 + (sidebarW - (cols * bW + (cols - 1) * bGap)) / 2;
  const startY = bodyY + 18;

  const toolbarIcons = [
    "✂️", "⬚",
    "🧽", "🪣",
    "🧪", "🔍",
    "✏️", "🖌️",
    "💨", "A",
    "╱", "〰️",
    "▭", "⬡",
    "◯", "▢"
  ];

  ctx.font = '22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const tX = startX + c * (bW + bGap);
      const tY = startY + r * (bH + bGap);
      
      const isActive = idx === 1; // "⬚" tool active
      drawBevelRect(ctx, tX, tY, bW, bH, isActive, winBg);
      ctx.fillStyle = '#000000';
      ctx.fillText(toolbarIcons[idx], tX + bW / 2, tY + bH / 2);
    }
  }

  // 6. Draw Workspace (Canvas Area)
  const canvasAreaX = 10 + sidebarW + 4;
  const canvasAreaW = canvasWidth - 10 - canvasAreaX;
  drawBevelRect(ctx, canvasAreaX, bodyY, canvasAreaW, bodyH, true, workspaceBg);

  // Clip workspace for background effects
  ctx.save();
  ctx.beginPath();
  ctx.rect(canvasAreaX + 2, bodyY + 2, canvasAreaW - 4, bodyH - 4);
  ctx.clip();

  if (isGridWorkspace) {
    ctx.strokeStyle = '#fbcfe8';
    ctx.lineWidth = 2;
    const gridS = 32;
    for (let gx = canvasAreaX; gx < canvasAreaX + canvasAreaW; gx += gridS) {
      ctx.beginPath();
      ctx.moveTo(gx, bodyY);
      ctx.lineTo(gx, bodyY + bodyH);
      ctx.stroke();
    }
    for (let gy = bodyY; gy < bodyY + bodyH; gy += gridS) {
      ctx.beginPath();
      ctx.moveTo(canvasAreaX, gy);
      ctx.lineTo(canvasAreaX + canvasAreaW, gy);
      ctx.stroke();
    }
  }
  ctx.restore();

  // 7. Draw Photo Strip centered inside workspace
  const stripWidth = 780;
  const stripHeight = isFourCut ? 1900 : 880;
  const stripX = canvasAreaX + (canvasAreaW - stripWidth) / 2;
  const stripY = bodyY + (bodyH - stripHeight) / 2;

  ctx.fillStyle = slotsBg;
  ctx.fillRect(stripX, stripY, stripWidth, stripHeight);
  ctx.strokeStyle = slotsBorder;
  ctx.lineWidth = 8;
  ctx.strokeRect(stripX, stripY, stripWidth, stripHeight);

  // Tokki dashed outline
  if (state.theme === 'retro-tokki') {
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 6;
    ctx.setLineDash([15, 10]);
    ctx.strokeRect(stripX + 14, stripY + 14, stripWidth - 28, stripHeight - 28);
    ctx.setLineDash([]);
  }

  // Draw Photo Slots
  const paddingX = stripWidth * 0.07;
  const topOffset = stripHeight * 0.065;
  const slotSpacing = stripHeight * 0.015;
  const slotCount = isFourCut ? 4 : 1;
  const footerHeight = stripHeight * 0.085;
  
  const availableHeight = stripHeight - topOffset - footerHeight - (slotSpacing * (slotCount - 1));
  const slotHeight = availableHeight / slotCount;
  const slotWidth = stripWidth - (paddingX * 2);

  for (let i = 0; i < slotCount; i++) {
    const x = stripX + paddingX;
    const y = stripY + topOffset + i * (slotHeight + slotSpacing);

    ctx.fillStyle = isDarkTheme ? '#18181b' : '#f3f4f6';
    ctx.fillRect(x, y, slotWidth, slotHeight);

    const imgData = state.capturedImages[i];
    if (imgData) {
      await drawImageCropped(ctx, imgData, x, y, slotWidth, slotHeight);
    } else {
      ctx.fillStyle = isDarkTheme ? '#a1a1aa' : '#9ca3af';
      ctx.font = `bold ${slotHeight * 0.12}px 'Share Tech Mono', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`cut 0${i + 1} ✦`, x + slotWidth / 2, y + slotHeight / 2);
    }

    ctx.strokeStyle = slotsBorder;
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, slotWidth, slotHeight);
  }

  // Draw Cute Character Title at the top of the photo strip
  await drawCuteTitle(ctx, stripX, stripY, stripWidth, stripHeight);

  // Draw Date at the bottom of the photo strip
  const dateY = stripY + stripHeight - (footerHeight / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${stripWidth * 0.045}px 'Share Tech Mono', monospace`;
  ctx.fillStyle = dateColor;
  ctx.fillText(currentDateStr.textContent, stripX + stripWidth / 2, dateY);

  // 8. Draw Placed Stickers mapped to the photo strip slots area
  const sandboxX = stripX + paddingX;
  const sandboxY = stripY + topOffset;
  const sandboxW = slotWidth;
  const sandboxH = availableHeight + (slotSpacing * (slotCount - 1));

  await drawStickers(ctx, sandboxX, sandboxY, sandboxW, sandboxH);

  // 9. Download file trigger
  const dataUrl = compositeCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `our_4th_anniversary_${isFourCut ? '4cut' : 'single'}.png`;
  link.href = dataUrl;
  link.click();
}

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

async function drawStickers(ctx, sandboxX, sandboxY, sandboxW, sandboxH) {
  for (const sticker of state.stickers) {
    const x = sandboxX + (sticker.x / 100) * sandboxW;
    const y = sandboxY + (sticker.y / 100) * sandboxH;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sticker.rotation);
    ctx.scale(sticker.scale, sticker.scale);

    if (sticker.type === 'emoji') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const baseFontSize = sandboxW * 0.12;
      ctx.font = `${baseFontSize}px Arial, Apple Color Emoji, Segoe UI Emoji`;
      ctx.fillText(sticker.content, 0, 0);
    } else if (sticker.type === 'image') {
      const drawW = sandboxW * 0.22;
      await new Promise((resolve) => {
        const img = new Image();
        img.src = sticker.content;
        img.onload = () => {
          const drawH = drawW * (img.height / img.width || 1);
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          resolve();
        };
        img.onerror = () => resolve();
      });
    } else {
      const text = sticker.content;
      const baseFontSize = sandboxW * 0.055;
      
      ctx.font = `bold ${baseFontSize}px 'Inter', 'Noto Sans KR', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = baseFontSize;

      const paddingW = baseFontSize * 0.5;
      const paddingH = baseFontSize * 0.28;
      const rectW = textWidth + paddingW * 2;
      const rectH = textHeight + paddingH * 2;

      // Solid black offset shadow
      ctx.fillStyle = '#111111';
      ctx.fillRect(-rectW / 2 + 5, -rectH / 2 + 5, rectW, rectH);

      // Core white panel
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);
      
      // Border
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 4;
      ctx.strokeRect(-rectW / 2, -rectH / 2, rectW, rectH);

      // Text
      ctx.fillStyle = '#111111';
      ctx.fillText(text, 0, 0);
    }

    ctx.restore();
  }
}

function drawCuteTitle(ctx, stripX, stripY, stripWidth, stripHeight) {
  return new Promise((resolve) => {
    const charNames = ['0', '1', '2', '3', 'space', '4', '5', '6', '7', '8', '9'];
    const charScales = [1.0, 0.74, 0.72, 0.92, 0.25, 1.05, 0.60, 0.68, 0.63, 0.70, 0.66];
    
    const images = [];
    let loadedCount = 0;
    const totalToLoad = 10; // Exclude space
    
    const onLoadImage = () => {
      loadedCount++;
      if (loadedCount === totalToLoad) {
        drawAll();
      }
    };
    
    for (let i = 0; i < charNames.length; i++) {
      if (charNames[i] === 'space') {
        images.push(null);
      } else {
        const img = new Image();
        img.src = `logo_char_${charNames[i]}.png`;
        img.onload = onLoadImage;
        img.onerror = onLoadImage;
        images.push(img);
      }
    }
    
    function drawAll() {
      const baseSize = stripWidth * 0.11; // base scale size for title
      let totalW = 0;
      const widths = [];
      const heights = [];
      
      for (let i = 0; i < charNames.length; i++) {
        if (charNames[i] === 'space') {
          const w = baseSize * 0.25;
          widths.push(w);
          heights.push(0);
          totalW += w;
        } else {
          const img = images[i];
          if (img && img.naturalWidth) {
            const h = baseSize * charScales[i];
            const aspect = img.naturalWidth / img.naturalHeight || 1;
            const w = h * aspect;
            widths.push(w);
            heights.push(h);
            totalW += w;
          } else {
            widths.push(0);
            heights.push(0);
          }
        }
      }
      
      let currentX = stripX + (stripWidth - totalW) / 2;
      const baselineY = stripY + (stripHeight * 0.052); // Baseline aligned
      
      for (let i = 0; i < charNames.length; i++) {
        if (charNames[i] === 'space') {
          currentX += widths[i];
        } else {
          const img = images[i];
          const w = widths[i];
          const h = heights[i];
          if (img && img.naturalWidth) {
            ctx.drawImage(img, currentX, baselineY - h, w, h);
            currentX += w;
          }
        }
      }
      resolve();
    }
  });
}

// Window load init
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', stopCameraStream);
