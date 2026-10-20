import * as THREE from 'three';

/**
 * Procedural Canvas Textures for CityLife RP
 * Generates high quality materials in memory with sRGB color space and max anisotropy.
 */

// Helper to create a canvas
function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

// Asphalt Road Texture (with dashed yellow central line and asphalt grain)
export function createRoadTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 512);

  // Dark asphalt base
  ctx.fillStyle = '#232528';
  ctx.fillRect(0, 0, 512, 512);

  // Grain noise
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const c = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)';
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 2, 2);
  }

  // Outer solid white road edges
  ctx.strokeStyle = '#e6e8eb';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(35, 0);
  ctx.lineTo(35, 512);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(512 - 35, 0);
  ctx.lineTo(512 - 35, 512);
  ctx.stroke();

  // Double dashed yellow center lines (Brazilian road style)
  ctx.strokeStyle = '#f5b027';
  ctx.lineWidth = 6;
  ctx.setLineDash([48, 32]);

  ctx.beginPath();
  ctx.moveTo(250, 0);
  ctx.lineTo(250, 512);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(262, 0);
  ctx.lineTo(262, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  if (renderer) {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  return texture;
}

// Sidewalk texture (Calçada padrão concreto / mosaico)
export function createSidewalkTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);

  ctx.fillStyle = '#b0b5bc';
  ctx.fillRect(0, 0, 256, 256);

  // Tile joints
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  const tileSize = 32;
  for (let x = 0; x <= 256; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Subtle flecks
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (renderer) {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  return texture;
}

// Grass / Park texture
export function createGrassTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);

  ctx.fillStyle = '#3f7832';
  ctx.fillRect(0, 0, 256, 256);

  // Grass blades / specks
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const colors = ['#336528', '#4c8a3c', '#5ca349', '#2c5622'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(x, y, 2, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Signboard / Store Billboard texture
export function createSignTexture(title: string, subtitle: string, bgColor: string, textColor: string = '#ffffff'): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 128);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 128);

  // Border highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, 256, 60);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = textColor === '#ffffff' ? '#ffd700' : '#444444';
  ctx.fillText(subtitle, 256, 102);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Brazilian Octagonal "PARE" Stop Sign Texture
export function createStopSignTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);

  ctx.clearRect(0, 0, 256, 256);

  // Octagon math: center 128, radius 120
  const cx = 128;
  const cy = 128;
  const r = 118;
  const numSides = 8;
  const angleStep = (Math.PI * 2) / numSides;
  const startAngle = Math.PI / 8;

  // Outer Red Octagon
  ctx.beginPath();
  for (let i = 0; i < numSides; i++) {
    const a = startAngle + i * angleStep;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#dc2626';
  ctx.fill();

  // White inner border
  ctx.beginPath();
  const innerR = 106;
  for (let i = 0; i < numSides; i++) {
    const a = startAngle + i * angleStep;
    const px = cx + Math.cos(a) * innerR;
    const py = cy + Math.sin(a) * innerR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Bold "PARE" Brazilian Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 68px "Arial Black", sans-serif';
  ctx.fillText('PARE', cx, cy + 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Clean Intersection Road Texture (Dark asphalt with asphalt grain, no conflicting lines)
export function createIntersectionRoadTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 512);

  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle grain
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (renderer) {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  return texture;
}
