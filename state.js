/**
 * state.js
 * Manages the global state and configuration variables for the Y2K Photo Booth.
 */

export const state = {
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

export const themeTitles = {
  'cyber-chrome': { text: 'Graphics editor', icon: '🎨' },
  'retro-tokki': { text: 'Tokki World', icon: '🐰' },
  'grunge-star': { text: 'Grunge Booth', icon: '🎸' },
  'classic-polaroid': { text: 'Polaroid Camera', icon: '📷' },
  'aero-glass': { text: 'Glass Studio', icon: '✨' },
  'sori-player': { text: '파도 Player for Soribada', icon: '🎵' }
};
