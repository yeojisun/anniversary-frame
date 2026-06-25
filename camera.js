/**
 * camera.js
 * Handles webcam stream registration, start/stop preview streams,
 * photo slot highlights (selectSlot), capture countdowns, and image capture.
 */

import { state } from './state.js';

// DOM Selectors
const slots = Array.from(document.querySelectorAll('.photo-slot'));
const cameraSelect = document.getElementById('cameraSelect');
const btnStartCamera = document.getElementById('btnStartCamera');
const btnTriggerCapture = document.getElementById('btnTriggerCapture');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const flashOverlay = document.getElementById('flashOverlay');

export async function detectCameras() {
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

export function stopCameraStream() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  slots.forEach(slot => {
    const video = slot.querySelector('.video-preview');
    if (video) video.classList.add('hidden');
  });
}

export async function startCameraStream(triggerCapture = false) {
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

  // If the stream is already running, reuse it immediately with zero delay!
  if (state.cameraStream) {
    video.srcObject = state.cameraStream;
    video.play().catch(err => console.error("Error playing video preview:", err));

    btnStartCamera.classList.add('hidden');
    btnTriggerCapture.classList.remove('hidden');

    if (triggerCapture === true) {
      triggerPhotoCountdown();
    }
    return;
  }

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

    if (triggerCapture === true) {
      setTimeout(() => {
        triggerPhotoCountdown();
      }, 350);
    }
  } catch (err) {
    console.error(err);
    video.classList.add('hidden');
    placeholder.classList.remove('hidden');

    alert('카메라에 연결할 수 없습니다. 권한 설정을 확인하시거나 사진 업로드 모드를 이용해주세요!');
    
    // Dispatch custom event to let app.js trigger input mode switch
    document.dispatchEvent(new CustomEvent('switch-input-mode', { detail: 'upload' }));
  }
}

export function selectSlot(index, autoStart = true) {
  if (state.inputMode === 'camera' && state.activeSlotIndex !== index) {
    // Hide the previous slot's video element (but keep stream active!)
    const prevSlot = slots[state.activeSlotIndex];
    if (prevSlot) {
      const prevVideo = prevSlot.querySelector('.video-preview');
      const prevPlaceholder = prevSlot.querySelector('.slot-placeholder');
      const prevImg = prevSlot.querySelector('.photo-preview');
      const prevRetakeBtn = prevSlot.querySelector('.retake-btn');

      if (prevVideo) prevVideo.classList.add('hidden');
      if (state.capturedImages[state.activeSlotIndex]) {
        if (prevImg) prevImg.classList.remove('hidden');
        if (prevRetakeBtn) prevRetakeBtn.classList.remove('hidden');
      } else {
        if (prevPlaceholder) prevPlaceholder.classList.remove('hidden');
      }
    }
  }

  state.activeSlotIndex = index;
  slots.forEach((slot, i) => {
    if (i === index) {
      slot.classList.add('active-capture');
    } else {
      slot.classList.remove('active-capture');
    }
  });

  if (state.inputMode === 'camera' && autoStart) {
    startCameraStream(true);
  }
}

export function triggerPhotoCountdown() {
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

export function capturePhoto() {
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

  // Remove slot highlight after capture
  slots.forEach(slot => slot.classList.remove('active-capture'));

  const nextEmptyIndex = state.layoutMode === 'four-cut'
    ? state.capturedImages.findIndex((img, idx) => img === null)
    : -1;

  if (nextEmptyIndex === -1) {
    stopCameraStream();
    btnStartCamera.classList.remove('hidden');
    btnTriggerCapture.classList.add('hidden');
  } else {
    // Keep camera stream warm, but do not auto-progress to the next slot.
    btnStartCamera.classList.add('hidden');
    btnTriggerCapture.classList.add('hidden');
  }
}

export function clearSlot(index) {
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
