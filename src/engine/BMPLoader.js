import * as THREE from "three";

function isMagenta(r, g, b) {
  return r >= 250 && g <= 8 && b >= 250;
}

export function decodeBmp(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
    throw new Error("Not a BMP file");
  }

  const dataOffset = view.getUint32(10, true);
  const headerSize = view.getUint32(14, true);
  const width = view.getInt32(18, true);
  const heightRaw = view.getInt32(22, true);
  const height = Math.abs(heightRaw);
  const topDown = heightRaw < 0;
  const bpp = view.getUint16(28, true);
  const compression = headerSize >= 20 ? view.getUint32(30, true) : 0;
  if (compression !== 0) {
    throw new Error(`Unsupported BMP compression ${compression}`);
  }

  const paletteCountField = headerSize >= 36 ? view.getUint32(46, true) : 0;
  let palette = null;
  if (bpp <= 8) {
    const count = paletteCountField || 1 << bpp;
    const paletteOffset = 14 + headerSize;
    palette = [];
    for (let i = 0; i < count; i++) {
      const o = paletteOffset + i * 4;
      palette.push([bytes[o + 2], bytes[o + 1], bytes[o], bytes[o + 3]]);
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4;

  for (let y = 0; y < height; y++) {
    const srcY = topDown ? y : height - 1 - y;
    const row = dataOffset + srcY * rowSize;
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;
      if (bpp === 8) {
        const idx = bytes[row + x];
        const color = palette[idx] || [0, 0, 0, 255];
        r = color[0];
        g = color[1];
        b = color[2];
        if (idx === 255 || isMagenta(r, g, b)) a = 0;
      } else if (bpp === 24) {
        b = bytes[row + x * 3];
        g = bytes[row + x * 3 + 1];
        r = bytes[row + x * 3 + 2];
        if (isMagenta(r, g, b)) a = 0;
      } else if (bpp === 32) {
        b = bytes[row + x * 4];
        g = bytes[row + x * 4 + 1];
        r = bytes[row + x * 4 + 2];
        a = bytes[row + x * 4 + 3];
        if (isMagenta(r, g, b)) a = 0;
      } else if (bpp === 4) {
        const packed = bytes[row + (x >> 1)];
        const idx = x & 1 ? packed & 0xf : packed >> 4;
        const color = palette[idx] || [0, 0, 0, 255];
        r = color[0];
        g = color[1];
        b = color[2];
        if (isMagenta(r, g, b)) a = 0;
      } else {
        throw new Error(`Unsupported BMP bit depth ${bpp}`);
      }
      const o = (y * width + x) * 4;
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = a;
    }
  }

  return { width, height, data: rgba };
}

export function makeTexture(width, height, data, { masked = false } = {}) {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.userData.masked = masked;
  return texture;
}

export function makeMaterial(texture, flags = 0) {
  const masked = Boolean(flags & 0x0040) || texture?.userData?.masked;
  const additive = Boolean(flags & 0x0020);
  const fullbright = Boolean(flags & 0x0004);
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: masked || additive,
    alphaTest: masked ? 0.5 : 0,
    depthWrite: !additive,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide,
    emissive: fullbright ? new THREE.Color(0x222222) : new THREE.Color(0x111111),
  });
  return material;
}
