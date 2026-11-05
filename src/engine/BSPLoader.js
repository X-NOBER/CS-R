import * as THREE from "three";
import { BinaryReader } from "./BinaryReader.js";
import { toThreePos } from "./math.js";

const LUMP = {
  ENTITIES: 0,
  PLANES: 1,
  TEXTURES: 2,
  VERTICES: 3,
  TEXINFO: 6,
  FACES: 7,
  LIGHTING: 8,
  EDGES: 12,
  SURFEDGES: 13,
  MODELS: 14,
};

const SKIP_TEX = new Set([
  "sky",
  "clip",
  "trigger",
  "hint",
  "skip",
  "origin",
  "aaatrigger",
  "null",
  "bevel",
  "noclip",
  "solidhint",
]);

function parseEntities(text) {
  const blocks = [];
  for (const raw of text.split("}")) {
    if (!raw.includes("{")) continue;
    const kv = {};
    for (const m of raw.matchAll(/"([^"]+)"\s+"([^"]*)"/g)) kv[m[1]] = m[2];
    if (kv.classname) blocks.push(kv);
  }
  return blocks;
}

function parseVec(str) {
  if (!str) return [0, 0, 0];
  const p = str.split(/\s+/).map(Number);
  return [p[0] || 0, p[1] || 0, p[2] || 0];
}

function decodeMiptex(reader, offset, end) {
  const r = reader.at(offset);
  const name = r.cstring(16);
  const width = r.u32();
  const height = r.u32();
  const mip0 = r.u32();
  r.u32();
  r.u32();
  r.u32();
  if (!width || !height || !mip0) {
    return { name, width: width || 16, height: height || 16, rgba: fallbackRgba(name, 16, 16), missing: true };
  }
  const pixels = width * height;
  const pix = reader.bytes.subarray(offset + mip0, offset + mip0 + pixels);
  const palStart = offset + mip0 + Math.floor((pixels * 85) / 64) + 2;
  let palette = null;
  if (palStart + 768 <= end) {
    palette = reader.bytes.subarray(palStart, palStart + 768);
  } else if (offset + mip0 + pixels + 768 <= end) {
    palette = reader.bytes.subarray(offset + mip0 + pixels, offset + mip0 + pixels + 768);
  }
  const rgba = new Uint8Array(pixels * 4);
  const keyed = name.startsWith("{");
  for (let i = 0; i < pixels; i++) {
    const idx = pix[i] || 0;
    const o = i * 4;
    if (palette) {
      rgba[o] = palette[idx * 3];
      rgba[o + 1] = palette[idx * 3 + 1];
      rgba[o + 2] = palette[idx * 3 + 2];
    } else {
      rgba[o] = idx;
      rgba[o + 1] = idx;
      rgba[o + 2] = idx;
    }
    rgba[o + 3] = keyed && idx === 255 ? 0 : 255;
  }
  return { name, width, height, rgba, missing: false };
}

function parseWad3(bytes) {
  const r = new BinaryReader(bytes);
  const magic = r.cstring(4);
  if (magic !== "WAD3") return new Map();
  const count = r.u32();
  const dir = r.u32();
  const textures = new Map();
  for (let i = 0; i < count; i++) {
    r.seek(dir + i * 32);
    const offset = r.u32();
    const diskSize = r.u32();
    r.u32();
    const type = r.u8();
    if (type !== 0x43 && type !== 0x40) continue;
    r.u8();
    r.u16();
    const name = r.cstring(16);
    const end = diskSize ? Math.min(bytes.length, offset + diskSize) : bytes.length;
    try {
      const tex = decodeMiptex(r, offset, end);
      if (tex?.name && !tex.missing) textures.set(tex.name.toLowerCase(), tex);
      else if (name) textures.set(name.toLowerCase(), tex);
    } catch {
      /* skip corrupt wad entry */
    }
  }
  return textures;
}

function wadFileNames(entities) {
  const world = entities.find((e) => e.classname === "worldspawn");
  const listed = world?.wad ? world.wad.split(/;+/) : [];
  const extras = [
    "de_molino.wad",
    "de_mirage_btm.wad",
    "cstrike.wad",
    "halflife.wad",
    "tswad.wad",
    "chateau.wad",
    "cs_assault.wad",
    "cs_bdog.wad",
    "cs_cbble.wad",
    "cs_havana.wad",
    "de_airstrip.wad",
    "de_aztec.wad",
    "de_piranesi.wad",
    "de_storm.wad",
    "de_vertigo.wad",
    "itsitaly.wad",
    "n0th1ng.wad",
    "torntextures.wad",
  ];
  const names = [];
  const seen = new Set();
  for (const raw of [...extras, ...listed]) {
    const base = String(raw).trim().split(/[/\\]/).pop();
    if (!base || !/\.wad$/i.test(base)) continue;
    const key = base.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(base);
  }
  return names;
}

function applyWadTextures(bsp, library) {
  bsp.textures = bsp.textures.map((tex) => {
    if (!tex.missing) return tex;
    const hit = library.get(String(tex.name || "").toLowerCase());
    if (!hit || hit.missing || !hit.rgba) return tex;
    return { ...hit, name: tex.name, missing: false };
  });
}

async function fetchWad(file) {
  for (const url of [`/wads/${file}`, `/maps/${file}`]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      return parseWad3(new Uint8Array(await res.arrayBuffer()));
    } catch {
      /* missing wad is expected */
    }
  }
  return null;
}

function fallbackRgba(name, w, h) {
  const rgba = new Uint8Array(w * h * 4);
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 33 + name.charCodeAt(i)) >>> 0;
  const r = 80 + (hash & 127);
  const g = 70 + ((hash >> 8) & 127);
  const b = 60 + ((hash >> 16) & 127);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const checker = ((i % w) ^ (i / w | 0)) & 8;
    rgba[o] = checker ? r : r * 0.65;
    rgba[o + 1] = checker ? g : g * 0.65;
    rgba[o + 2] = checker ? b : b * 0.65;
    rgba[o + 3] = 255;
  }
  return rgba;
}

function makeTexture(mip) {
  const tex = new THREE.DataTexture(mip.rgba, mip.width, mip.height, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.flipY = false;
  return tex;
}

function skipRender(name) {
  const n = name.toLowerCase();
  if (SKIP_TEX.has(n)) return true;
  if (n.startsWith("sky")) return true;
  return false;
}

function skipCollision(name) {
  const n = name.toLowerCase();
  if (n === "clip") return false;
  if (SKIP_TEX.has(n)) return true;
  if (n.startsWith("sky")) return true;
  return false;
}

function sampleLight(lighting, ofs, lmW, lmH, u, v) {
  if (ofs < 0 || !lighting.length || lmW <= 0 || lmH <= 0) return [180, 180, 170];
  const x = THREE.MathUtils.clamp(u, 0, lmW - 1);
  const y = THREE.MathUtils.clamp(v, 0, lmH - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, lmW - 1);
  const y1 = Math.min(y0 + 1, lmH - 1);
  const fx = x - x0;
  const fy = y - y0;
  const pix = (ix, iy) => {
    const i = ofs + (iy * lmW + ix) * 3;
    if (i + 2 >= lighting.length) return [180, 180, 170];
    return [lighting[i], lighting[i + 1], lighting[i + 2]];
  };
  const a = pix(x0, y0);
  const b = pix(x1, y0);
  const c = pix(x0, y1);
  const d = pix(x1, y1);
  const mix = (p, q, t) => p + (q - p) * t;
  return [
    mix(mix(a[0], b[0], fx), mix(c[0], d[0], fx), fy),
    mix(mix(a[1], b[1], fx), mix(c[1], d[1], fx), fy),
    mix(mix(a[2], b[2], fx), mix(c[2], d[2], fx), fy),
  ];
}

export function parseGoldSrcBsp(buffer) {
  const reader = new BinaryReader(buffer);
  const version = reader.i32();
  if (version !== 30) throw new Error(`Unsupported BSP version ${version} (need GoldSrc 30)`);
  const lumps = [];
  for (let i = 0; i < 15; i++) lumps.push({ ofs: reader.i32(), len: reader.i32() });

  const slice = (id) => reader.bytes.subarray(lumps[id].ofs, lumps[id].ofs + lumps[id].len);
  const at = (id) => new BinaryReader(slice(id));

  const entities = parseEntities(new TextDecoder("latin1").decode(slice(LUMP.ENTITIES)));
  const planes = [];
  {
    const r = at(LUMP.PLANES);
    const n = Math.floor(lumps[LUMP.PLANES].len / 20);
    for (let i = 0; i < n; i++) planes.push({ n: r.vec3(), dist: r.f32(), type: r.i32() });
  }

  const texLump = lumps[LUMP.TEXTURES];
  const texReader = reader.at(texLump.ofs);
  const numMip = texReader.i32();
  const mipOfs = [];
  for (let i = 0; i < numMip; i++) mipOfs.push(texReader.i32());
  const textures = [];
  for (let i = 0; i < numMip; i++) {
    const start = texLump.ofs + mipOfs[i];
    const end = i + 1 < numMip ? texLump.ofs + mipOfs[i + 1] : texLump.ofs + texLump.len;
    textures.push(decodeMiptex(reader, start, end));
  }

  const vertices = [];
  {
    const r = at(LUMP.VERTICES);
    const n = Math.floor(lumps[LUMP.VERTICES].len / 12);
    for (let i = 0; i < n; i++) vertices.push(r.vec3());
  }

  const texinfos = [];
  {
    const r = at(LUMP.TEXINFO);
    const n = Math.floor(lumps[LUMP.TEXINFO].len / 40);
    for (let i = 0; i < n; i++) {
      texinfos.push({
        s: [r.f32(), r.f32(), r.f32(), r.f32()],
        t: [r.f32(), r.f32(), r.f32(), r.f32()],
        miptex: r.i32(),
        flags: r.i32(),
      });
    }
  }

  const faces = [];
  {
    const r = at(LUMP.FACES);
    const n = Math.floor(lumps[LUMP.FACES].len / 20);
    for (let i = 0; i < n; i++) {
      faces.push({
        planenum: r.u16(),
        side: r.i16(),
        firstedge: r.i32(),
        numedges: r.i16(),
        texinfo: r.i16(),
        styles: [r.u8(), r.u8(), r.u8(), r.u8()],
        lightofs: r.i32(),
      });
    }
  }

  const lighting = slice(LUMP.LIGHTING);
  const edges = [];
  {
    const r = at(LUMP.EDGES);
    const n = Math.floor(lumps[LUMP.EDGES].len / 4);
    for (let i = 0; i < n; i++) edges.push([r.u16(), r.u16()]);
  }
  const surfedges = [];
  {
    const r = at(LUMP.SURFEDGES);
    const n = Math.floor(lumps[LUMP.SURFEDGES].len / 4);
    for (let i = 0; i < n; i++) surfedges.push(r.i32());
  }
  const models = [];
  {
    const r = at(LUMP.MODELS);
    const n = Math.floor(lumps[LUMP.MODELS].len / 64);
    for (let i = 0; i < n; i++) {
      models.push({
        mins: r.vec3(),
        maxs: r.vec3(),
        origin: r.vec3(),
        headnode: [r.i32(), r.i32(), r.i32(), r.i32()],
        visleafs: r.i32(),
        firstface: r.i32(),
        numfaces: r.i32(),
      });
    }
  }

  return { entities, planes, textures, vertices, texinfos, faces, lighting, edges, surfedges, models };
}

function projectST(p, info) {
  const s = p[0] * info.s[0] + p[1] * info.s[1] + p[2] * info.s[2] + info.s[3];
  const t = p[0] * info.t[0] + p[1] * info.t[1] + p[2] * info.t[2] + info.t[3];
  return [s, t];
}

function faceVerts(bsp, face) {
  const out = [];
  for (let i = 0; i < face.numedges; i++) {
    const se = bsp.surfedges[face.firstedge + i];
    const v = se >= 0 ? bsp.edges[se][0] : bsp.edges[-se][1];
    out.push(bsp.vertices[v]);
  }
  return out;
}

function lightmapSize(sts) {
  let smin = Infinity;
  let smax = -Infinity;
  let tmin = Infinity;
  let tmax = -Infinity;
  for (const [s, t] of sts) {
    if (s < smin) smin = s;
    if (s > smax) smax = s;
    if (t < tmin) tmin = t;
    if (t > tmax) tmax = t;
  }
  const lms = Math.floor(smin / 16);
  const lmt = Math.floor(tmin / 16);
  const w = Math.ceil(smax / 16) - lms + 1;
  const h = Math.ceil(tmax / 16) - lmt + 1;
  return { smin, tmin, lms, lmt, w, h };
}

export function buildGoldSrcMap(bsp) {
  const group = new THREE.Group();
  group.name = "de_molino";
  const buckets = new Map();
  const collidePos = [];
  const collideIdx = [];

  const addFace = (face, solid) => {
    const info = bsp.texinfos[face.texinfo];
    if (!info) return;
    const mip = bsp.textures[info.miptex];
    if (!mip) return;
    const noDraw = skipRender(mip.name);
    const noCollide = skipCollision(mip.name);
    if (noDraw && noCollide) return;
    const verts = faceVerts(bsp, face);
    if (verts.length < 3) return;
    const sts = verts.map((p) => projectST(p, info));
    const lm = lightmapSize(sts);
    const hasLm = face.styles[0] !== 255 && face.lightofs >= 0 && lm.w > 0 && lm.h > 0;
    let bucket = null;
    let base = 0;
    if (!noDraw) {
      bucket = buckets.get(info.miptex);
      if (!bucket) {
        bucket = { mip, pos: [], uv: [], col: [], idx: [] };
        buckets.set(info.miptex, bucket);
      }
      base = bucket.pos.length / 3;
      for (let i = 0; i < verts.length; i++) {
        const p = verts[i];
        const tp = toThreePos(p[0], p[1], p[2]);
        bucket.pos.push(tp.x, tp.y, tp.z);
        bucket.uv.push(sts[i][0] / mip.width, sts[i][1] / mip.height);
        let rgb = [160, 160, 150];
        if (hasLm) {
          const u = sts[i][0] / 16 - lm.lms;
          const v = sts[i][1] / 16 - lm.lmt;
          rgb = sampleLight(bsp.lighting, face.lightofs, lm.w, lm.h, u, v);
        }
        bucket.col.push(
          Math.min(1, (rgb[0] / 255) * 2.0),
          Math.min(1, (rgb[1] / 255) * 2.0),
          Math.min(1, (rgb[2] / 255) * 2.0)
        );
      }
    }
    const cBase = collidePos.length / 3;
    if (solid && !noCollide) {
      for (let i = 0; i < verts.length; i++) {
        const tp = toThreePos(verts[i][0], verts[i][1], verts[i][2]);
        collidePos.push(tp.x, tp.y, tp.z);
      }
    }
    for (let i = 1; i < verts.length - 1; i++) {
      if (bucket) bucket.idx.push(base, base + i, base + i + 1);
      if (solid && !noCollide) collideIdx.push(cBase, cBase + i + 1, cBase + i);
    }
  };

  const world = bsp.models[0];
  if (world) {
    for (let i = 0; i < world.numfaces; i++) addFace(bsp.faces[world.firstface + i], true);
  }

  const brushClass = new Map();
  for (const ent of bsp.entities) {
    if (!ent.model || !ent.model.startsWith("*")) continue;
    const idx = Number(ent.model.slice(1));
    if (!Number.isFinite(idx)) continue;
    brushClass.set(idx, ent.classname);
  }
  for (let m = 1; m < bsp.models.length; m++) {
    const cls = brushClass.get(m) || "";
    const solid = cls === "func_wall" || cls === "func_breakable" || cls === "func_door_rotating";
    const model = bsp.models[m];
    for (let i = 0; i < model.numfaces; i++) addFace(bsp.faces[model.firstface + i], solid);
  }

  for (const bucket of buckets.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(bucket.pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(bucket.uv, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(bucket.col, 3));
    geo.setIndex(bucket.idx);
    geo.computeVertexNormals();
    const keyed = bucket.mip.name.startsWith("{");
    const mat = new THREE.MeshBasicMaterial({
      map: makeTexture(bucket.mip),
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: keyed,
      alphaTest: keyed ? 0.4 : 0,
      depthWrite: !keyed,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = bucket.mip.name;
    group.add(mesh);
  }

  const collision = new THREE.BufferGeometry();
  collision.setAttribute("position", new THREE.Float32BufferAttribute(collidePos, 3));
  collision.setIndex(collideIdx);
  collision.computeVertexNormals();
  collision.computeBoundingBox();
  collision.computeBoundingSphere();
  const collisionMesh = new THREE.Mesh(
    collision,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false })
  );
  collisionMesh.name = "collision";
  collisionMesh.layers.set(1);
  collisionMesh.frustumCulled = false;

  const toSpawn = (ent) => {
    const [x, y, z] = parseVec(ent.origin);
    const [, yaw] = parseVec(ent.angles);
    const origin = toThreePos(x, y, z);
    const eye = toThreePos(x, y, z + 28);
    return { origin, eye, yaw, feet: toThreePos(x, y, z - 36) };
  };

  const ct = bsp.entities.filter((e) => e.classname === "info_player_start").map(toSpawn);
  const t = bsp.entities.filter((e) => e.classname === "info_player_deathmatch").map(toSpawn);
  const cover = [...t, ...ct].map((s) => s.feet.clone());

  const env = bsp.entities.find((e) => e.classname === "light_environment");
  const light = env ? parseVec(env._light || env.light) : [180, 190, 200];

  const mins = world ? toThreePos(world.mins[0], world.mins[1], world.mins[2]) : new THREE.Vector3(-1024, -128, -1024);
  const maxs = world ? toThreePos(world.maxs[0], world.maxs[1], world.maxs[2]) : new THREE.Vector3(1024, 1024, 1024);
  const bbMin = new THREE.Vector3(Math.min(mins.x, maxs.x), Math.min(mins.y, maxs.y), Math.min(mins.z, maxs.z));
  const bbMax = new THREE.Vector3(Math.max(mins.x, maxs.x), Math.max(mins.y, maxs.y), Math.max(mins.z, maxs.z));

  return { group, collisionMesh, ct, t, cover, light, bounds: { min: bbMin, max: bbMax } };
}

export async function loadGoldSrcMap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Map load failed ${res.status}`);
  const bsp = parseGoldSrcBsp(new Uint8Array(await res.arrayBuffer()));
  const library = new Map();
  for (const file of wadFileNames(bsp.entities)) {
    if (!bsp.textures.some((tex) => tex.missing)) break;
    const wad = await fetchWad(file);
    if (!wad) continue;
    for (const [name, tex] of wad) {
      if (!library.has(name) && tex && !tex.missing) library.set(name, tex);
    }
    applyWadTextures(bsp, library);
  }
  return buildGoldSrcMap(bsp);
}
