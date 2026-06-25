/**
 * canvas.js
 * Handles high-resolution canvas composite drawings, theme configuration rendering,
 * and sori-player visualizer vector drawing.
 */

import { state, themeTitles } from './state.js';
import { deselectAllStickers } from './stickers.js';

// DOM Selectors
const compositeCanvas = document.getElementById('compositeCanvas');
const currentDateStr = document.getElementById('currentDateStr');

export function drawBevelRect(ctx, x, y, w, h, isPressed, bgColor) {
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

export function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, strokeWidth) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle && strokeWidth) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

export async function downloadComposite() {
  deselectAllStickers();

  const isFourCut = state.layoutMode === 'four-cut';
  const canvasWidth = 1200;
  const canvasHeight = isFourCut ? 2800 : 1450;

  compositeCanvas.width = canvasWidth;
  compositeCanvas.height = canvasHeight;
  const ctx = compositeCanvas.getContext('2d');

  // If theme is Soribada Player, bypass standard Windows 95 editor rendering
  if (state.theme === 'sori-player') {
    await drawSoriPlayerComposite(ctx, canvasWidth, canvasHeight, isFourCut);
    const dataUrl = compositeCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `our_4th_anniversary_${isFourCut ? '4cut' : 'single'}.png`;
    link.href = dataUrl;
    link.click();
    return;
  }

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
  const titleInfo = themeTitles[state.theme] || themeTitles['cyber-chrome'];
  ctx.fillText(`${titleInfo.icon} ${titleInfo.text}`, logoX, 10 + titleBarH / 2);

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
      let placeholderText = `cut 0${i + 1} ✦`;
      let fontSizeFactor = 0.12;
      if (state.theme === 'sori-player') {
        placeholderText = "click! 📸";
        ctx.fillStyle = '#facc15';
        fontSizeFactor = 0.1;
      } else {
        ctx.fillStyle = isDarkTheme ? '#a1a1aa' : '#9ca3af';
      }
      ctx.font = `bold ${slotHeight * fontSizeFactor}px 'Share Tech Mono', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(placeholderText, x + slotWidth / 2, y + slotHeight / 2);
    }

    ctx.strokeStyle = slotsBorder;
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, slotWidth, slotHeight);
  }

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

export function drawImageCropped(ctx, dataUrl, destX, destY, destWidth, destHeight) {
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

export async function drawStickers(ctx, sandboxX, sandboxY, sandboxW, sandboxH) {
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

export async function drawSoriPlayerComposite(ctx, canvasWidth, canvasHeight, isFourCut) {
  // 1. Draw outer brushed metal player body
  const bodyGrad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  bodyGrad.addColorStop(0, '#f8fafc');
  bodyGrad.addColorStop(0.3, '#cbd5e1');
  bodyGrad.addColorStop(0.5, '#94a3b8');
  bodyGrad.addColorStop(0.7, '#cbd5e1');
  bodyGrad.addColorStop(1, '#64748b');

  drawRoundedRect(ctx, 10, 10, canvasWidth - 20, canvasHeight - 20, 60, bodyGrad, '#475569', 8);

  // 2. Draw Top Capsule Header
  const headerY = 36;
  const headerH = 110;
  // Outer glowing bar
  const glowGrad = ctx.createLinearGradient(40, headerY + 15, canvasWidth - 40, headerY + 15);
  glowGrad.addColorStop(0, 'rgba(6,182,212,0.1)');
  glowGrad.addColorStop(0.5, '#00ffff');
  glowGrad.addColorStop(1, 'rgba(6,182,212,0.1)');
  drawRoundedRect(ctx, 40, headerY + 15, canvasWidth - 80, 20, 10, glowGrad, '#ffffff', 2);

  // Center Capsule shape
  const capW = 540;
  const capH = 85;
  const capX = (canvasWidth - capW) / 2;
  const capY = headerY + 5;
  const capGrad = ctx.createLinearGradient(capX, capY, capX, capY + capH);
  capGrad.addColorStop(0, '#ffffff');
  capGrad.addColorStop(0.5, '#cbd5e1');
  capGrad.addColorStop(1, '#94a3b8');
  drawRoundedRect(ctx, capX, capY, capW, capH, 40, capGrad, '#475569', 4);

  // Capsule Arrow Button - Left
  const btnLX = capX + 26;
  const btnLY = capY + 28;
  const btnR = 20;
  const arrowGrad = ctx.createRadialGradient(btnLX, btnLY, 0, btnLX, btnLY, btnR);
  arrowGrad.addColorStop(0, '#60a5fa');
  arrowGrad.addColorStop(1, '#2563eb');
  ctx.beginPath();
  ctx.arc(btnLX, btnLY, btnR, 0, Math.PI * 2);
  ctx.fillStyle = arrowGrad;
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('◀', btnLX, btnLY);

  // Capsule Arrow Button - Right
  const btnRX = capX + capW - 26;
  const btnRY = capY + 28;
  ctx.beginPath();
  ctx.arc(btnRX, btnRY, btnR, 0, Math.PI * 2);
  ctx.fillStyle = arrowGrad;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillText('▶', btnRX, btnRY);

  // Titles inside Capsule
  ctx.fillStyle = '#0b1d4f';
  ctx.font = `bold 32px 'Jua', 'Noto Sans KR', sans-serif`;
  ctx.fillText('파 도', capX + capW / 2, capY + 32);

  ctx.fillStyle = '#d97706';
  ctx.font = `bold 16px 'Share Tech Mono', sans-serif`;
  ctx.fillText('Player for Soribada', capX + capW / 2, capY + 64);

  // 3. Draw Metadata Display panel
  const metaY = 160;
  const metaH = 140;
  const metaW = canvasWidth - 80;
  const metaX = 40;
  drawRoundedRect(ctx, metaX, metaY, metaW, metaH, 16, '#050c24', '#64748b', 4);

  // Mode button & Spect. button on metadata
  const drawMetaCapsuleBtn = (x, y, text) => {
    const btnW = 110;
    const btnH = 34;
    const grad = ctx.createLinearGradient(x, y, x, y + btnH);
    grad.addColorStop(0, '#60a5fa');
    grad.addColorStop(1, '#2563eb');
    drawRoundedRect(ctx, x, y, btnW, btnH, 10, grad, '#1e3a8a', 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + btnW / 2, y + btnH / 2);
  };
  drawMetaCapsuleBtn(metaX + 30, metaY + 20, 'Mode');
  drawMetaCapsuleBtn(metaX + metaW - 140, metaY + 20, 'Spect.');

  // Timer counter
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 42px 'Share Tech Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('00:28.23', metaX + metaW / 2, metaY + 38);

  // Track info texts
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(metaX + 20, metaY + 74);
  ctx.lineTo(metaX + metaW - 20, metaY + 74);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = `bold 22px 'Share Tech Mono', monospace`;
  ctx.fillStyle = '#facc15';
  ctx.fillText('1. 1-02시~1.MP3', metaX + 30, metaY + 105);

  ctx.textAlign = 'right';
  ctx.font = `20px 'Share Tech Mono', monospace`;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('[MP3]-[128K]-[Stereo]-[27:32]', metaX + metaW - 30, metaY + 105);

  // 4. Draw Screen/Workspace Area (containing photo strip slots)
  const screenY = 320;
  const screenH = canvasHeight - 320 - 240; // available space before footer
  const screenW = canvasWidth - 80;
  const screenX = 40;

  drawRoundedRect(ctx, screenX, screenY, screenW, screenH, 20, '#0d2054', '#475569', 6);

  // Clip workspace area for visualizer scanlines & cyan gradient background
  ctx.save();
  ctx.beginPath();
  ctx.rect(screenX + 4, screenY + 4, screenW - 8, screenH - 8);
  ctx.clip();

  // Draw bright cyan visualizer gradient behind the strip
  const stripWidth = 780;
  const stripHeight = isFourCut ? 1720 : 660;
  const stripX = screenX + (screenW - stripWidth) / 2;
  const stripY = screenY + (screenH - stripHeight) / 2;

  const visGrad = ctx.createLinearGradient(stripX, stripY, stripX, stripY + stripHeight);
  visGrad.addColorStop(0, '#00ffff');
  visGrad.addColorStop(1, '#00a8cc');
  ctx.fillStyle = visGrad;
  ctx.fillRect(stripX, stripY, stripWidth, stripHeight);
  
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 8;
  ctx.strokeRect(stripX, stripY, stripWidth, stripHeight);

  // Soundwave visualizer line in the center-back of the strip
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  const waveY = stripY + stripHeight / 2;
  ctx.moveTo(stripX, waveY);
  // draw a stylized sine-like waveform
  for (let sx = stripX; sx <= stripX + stripWidth; sx += 20) {
    const waveAmp = 40 * Math.sin((sx - stripX) * 0.05);
    ctx.lineTo(sx, waveY + waveAmp);
  }
  ctx.stroke();

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
    const sx = stripX + paddingX;
    const sy = stripY + topOffset + i * (slotHeight + slotSpacing);

    ctx.fillStyle = 'rgba(11, 29, 79, 0.95)';
    ctx.fillRect(sx, sy, slotWidth, slotHeight);

    const imgData = state.capturedImages[i];
    if (imgData) {
      await drawImageCropped(ctx, imgData, sx, sy, slotWidth, slotHeight);
    } else {
      ctx.fillStyle = '#facc15';
      ctx.font = `bold ${slotHeight * 0.1}px 'Share Tech Mono', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("click! 📸", sx + slotWidth / 2, sy + slotHeight / 2);
    }

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(sx, sy, slotWidth, slotHeight);
  }

  // Draw Date at the bottom of the photo strip
  const dateY = stripY + stripHeight - (footerHeight / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${stripWidth * 0.045}px 'Share Tech Mono', monospace`;
  ctx.fillStyle = '#facc15';
  ctx.fillText(currentDateStr.textContent, stripX + stripWidth / 2, dateY);

  ctx.restore(); // remove clipping

  // 5. Draw Footer controls
  const footerY = canvasHeight - 210;
  const footerH = 170;
  const footerW = canvasWidth - 80;
  const footerX = 40;

  const footerGrad = ctx.createLinearGradient(footerX, footerY, footerX, footerY + footerH);
  footerGrad.addColorStop(0, '#cbd5e1');
  footerGrad.addColorStop(1, '#94a3b8');
  drawRoundedRect(ctx, footerX, footerY, footerW, footerH, 20, footerGrad, '#64748b', 4);

  // Helper to draw circular playback buttons
  const drawCtrlCircleBtn = (x, y, r, symbol) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#cbd5e1');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, y);
  };

  // Draw Playback buttons (left group)
  const pbY = footerY + 54;
  const pbStart = footerX + 45;
  const pbGap = 65;
  const playbackSymbols = ['⏮', '⏹', '⏯', '⏭'];
  playbackSymbols.forEach((sym, idx) => {
    drawCtrlCircleBtn(pbStart + idx * pbGap, pbY, 26, sym);
  });

  // Draw Action buttons (right group)
  const actY = footerY + 54;
  const actEnd = footerX + footerW - 45;
  const actionSymbols = ['⚙️', '🔊', '☰', '📊'];
  actionSymbols.forEach((sym, idx) => {
    drawCtrlCircleBtn(actEnd - idx * pbGap, actY, 26, sym);
  });

  // Draw Progress Bar (middle)
  const progX = pbStart + 4 * pbGap + 10;
  const progW = actEnd - 3 * pbGap - 10 - progX;
  const progY = footerY + 52;
  const progH = 10;
  drawRoundedRect(ctx, progX, progY, progW, progH, 4, '#334155', null, 0);

  // Progress Knob (circle)
  const knobX = progX + progW * 0.28;
  const knobY = progY + 5;
  const knobR = 15;
  const knobGrad = ctx.createRadialGradient(knobX, knobY, 0, knobX, knobY, knobR);
  knobGrad.addColorStop(0, '#ffffff');
  knobGrad.addColorStop(1, '#cbd5e1');
  ctx.beginPath();
  ctx.arc(knobX, knobY, knobR, 0, Math.PI * 2);
  ctx.fillStyle = knobGrad;
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bottom Logo Badge (glowing cyan capsule)
  const badgeW = 200;
  const badgeH = 46;
  const badgeX = footerX + footerW - badgeW - 30;
  const badgeY = footerY + 110;
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  badgeGrad.addColorStop(0, '#0284c7');
  badgeGrad.addColorStop(1, '#06b6d4');
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 20, badgeGrad, '#00f0ff', 3);

  ctx.fillStyle = '#ffffff';
  ctx.font = `italic bold 24px 'Share Tech Mono', 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Sorinara', badgeX + badgeW / 2, badgeY + badgeH / 2);
}
