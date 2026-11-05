import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { parseMDL } from "./MDLParser.js";
import { parseSMD, smdPoseFromFrame, textureKey } from "./SMDParser.js";
import { decodeBmp, makeTexture, makeMaterial } from "./BMPLoader.js";
import { goldSrcLocalMatrix, goldSrcQuat, toThreePos, toThreeQuat, boneWorldMatrices } from "./math.js";
import { playerById } from "../game/Players.js";

const fileCache = new Map();
const _groundAt = new THREE.Vector3();

export async function loadBytes(url) {
  if (fileCache.has(url)) return fileCache.get(url);
  const pending = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.arrayBuffer();
  });
  fileCache.set(url, pending);
  return pending;
}

export async function loadText(url) {
  const buffer = await loadBytes(url);
  return new TextDecoder("latin1").decode(buffer);
}

function restPoseFromBones(bones) {
  return bones.map((bone) => ({
    pos: bone.pos ? bone.pos.slice() : [0, 0, 0],
    rot: bone.rot ? bone.rot.slice() : [0, 0, 0],
  }));
}

function applyPoseToBones(threeBones, pose) {
  const matrix = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  for (let i = 0; i < threeBones.length; i++) {
    const p = pose[i];
    if (!p) continue;
    goldSrcLocalMatrix(p.pos[0], p.pos[1], p.pos[2], p.rot[0], p.rot[1], p.rot[2], matrix);
    matrix.decompose(pos, quat, scl);
    threeBones[i].position.copy(pos);
    threeBones[i].quaternion.copy(quat);
  }
}

function buildSkeleton(bones, pose) {
  const threeBones = bones.map((bone, i) => {
    const b = new THREE.Bone();
    b.name = bone.name || `bone_${i}`;
    return b;
  });
  const roots = [];
  for (let i = 0; i < bones.length; i++) {
    const parent = bones[i].parent;
    if (parent >= 0) threeBones[parent].add(threeBones[i]);
    else roots.push(threeBones[i]);
  }
  applyPoseToBones(threeBones, pose);
  return { threeBones, roots, skeleton: new THREE.Skeleton(threeBones) };
}

function remapPose(srcBones, srcPose, dstBones) {
  const byName = new Map();
  srcBones.forEach((bone, i) => byName.set(bone.name, srcPose[i]));
  return dstBones.map((bone, i) => {
    const hit = byName.get(bone.name);
    if (hit) return { pos: hit.pos.slice(), rot: hit.rot.slice() };
    if (bone.pos) return { pos: bone.pos.slice(), rot: bone.rot.slice() };
    return { pos: [0, 0, 0], rot: [0, 0, 0] };
  });
}

function pushSkinnedVertex(builder, pos, norm, uv, boneIndex) {
  builder.positions.push(pos.x, pos.y, pos.z);
  builder.normals.push(norm.x, norm.y, norm.z);
  builder.uvs.push(uv[0], uv[1]);
  builder.skinIndex.push(boneIndex, 0, 0, 0);
  builder.skinWeight.push(1, 0, 0, 0);
}

function finishGeometry(builder) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(builder.positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(builder.normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(builder.uvs, 2));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(builder.skinIndex, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(builder.skinWeight, 4));
  for (const group of builder.groups) {
    geometry.addGroup(group.start, group.count, group.materialIndex);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function emptyBuilder() {
  return {
    positions: [],
    normals: [],
    uvs: [],
    skinIndex: [],
    skinWeight: [],
    groups: [],
  };
}

function mdlToGeometry(mdl) {
  const rest = restPoseFromBones(mdl.bones);
  const worlds = boneWorldMatrices(mdl.bones, rest);
  const builder = emptyBuilder();
  const materials = [];
  const materialOf = new Map();

  const ensureMaterial = (skinref) => {
    let texIndex = skinref;
    if (texIndex >= 0 && texIndex < mdl.skinTable.length) texIndex = mdl.skinTable[texIndex];
    if (materialOf.has(texIndex)) return materialOf.get(texIndex);
    const tex = mdl.textures[texIndex];
    const texture = tex
      ? makeTexture(tex.width, tex.height, tex.data, { masked: tex.masked })
      : null;
    const material = makeMaterial(texture, tex?.flags || 0);
    const index = materials.length;
    materials.push(material);
    materialOf.set(texIndex, index);
    return index;
  };

  const tmpPos = new THREE.Vector3();
  const tmpNorm = new THREE.Vector3();

  for (const body of mdl.bodyparts) {
    const model = body.models[0];
    if (!model) continue;
    for (const mesh of model.meshes) {
      const materialIndex = ensureMaterial(mesh.skinref);
      const start = builder.positions.length / 3;
      const tex = mdl.textures[mdl.skinTable[mesh.skinref] ?? mesh.skinref];
      const tw = tex?.width || 1;
      const th = tex?.height || 1;
      for (const tri of mesh.tris) {
        const vi = tri.vi;
        const ni = tri.ni;
        const boneIndex = model.vertBone[vi] || 0;
        const normBone = model.normBone[ni] || 0;
        const v = model.vertices[vi];
        const n = model.normals[ni];
        toThreePos(v[0], v[1], v[2], tmpPos);
        toThreePos(n[0], n[1], n[2], tmpNorm);
        if (worlds[boneIndex]) tmpPos.applyMatrix4(worlds[boneIndex]);
        if (worlds[normBone]) tmpNorm.transformDirection(worlds[normBone]).normalize();
        pushSkinnedVertex(builder, tmpPos.clone(), tmpNorm.clone(), [tri.s / tw, tri.t / th], boneIndex);
      }
      builder.groups.push({
        start,
        count: builder.positions.length / 3 - start,
        materialIndex,
      });
    }
  }

  return { geometry: finishGeometry(builder), materials, rest };
}

function smdToGeometry(smdList, bones, textureMap) {
  const rest = smdPoseFromFrame(smdList[0], 0);
  const builder = emptyBuilder();
  const materials = [];
  const materialOf = new Map();
  const boneIndexOf = new Map(bones.map((b, i) => [b.name, i]));

  const ensureMaterial = (name) => {
    const key = textureKey(name);
    if (materialOf.has(key)) return materialOf.get(key);
    const tex = textureMap.get(key);
    const material = makeMaterial(tex, tex?.userData?.masked ? 0x0040 : 0);
    const index = materials.length;
    materials.push(material);
    materialOf.set(key, index);
    return index;
  };

  const tmpPos = new THREE.Vector3();
  const tmpNorm = new THREE.Vector3();

  for (const smd of smdList) {
    const nameToCanonical = smd.bones.map((b) => boneIndexOf.get(b.name) ?? 0);
    for (const tri of smd.triangles) {
      const materialIndex = ensureMaterial(tri.material);
      const start = builder.positions.length / 3;
      for (const vert of tri.verts) {
        toThreePos(vert.pos[0], vert.pos[1], vert.pos[2], tmpPos);
        toThreePos(vert.norm[0], vert.norm[1], vert.norm[2], tmpNorm).normalize();
        const boneIndex = nameToCanonical[vert.bone] ?? 0;
        pushSkinnedVertex(builder, tmpPos.clone(), tmpNorm.clone(), [vert.uv[0], 1 - vert.uv[1]], boneIndex);
      }
      builder.groups.push({
        start,
        count: builder.positions.length / 3 - start,
        materialIndex,
      });
    }
  }

  return { geometry: finishGeometry(builder), materials, rest };
}

async function loadBmpTextures(urls) {
  const map = new Map();
  await Promise.all(
    urls.map(async (url) => {
      try {
        const decoded = decodeBmp(await loadBytes(url));
        const texture = makeTexture(decoded.width, decoded.height, decoded.data, { masked: true });
        map.set(textureKey(url), texture);
      } catch {
        // missing texture is non-fatal
      }
    })
  );
  return map;
}

function collectTextureUrls(baseUrl, weapon, smdList) {
  const names = new Set();
  for (const smd of smdList) {
    for (const tri of smd.triangles) names.add(textureKey(tri.material));
  }
  const folders = [weapon.cd, ...(weapon.textures || []), "01_hands", "02_shield"].filter(Boolean);
  const urls = [];
  for (const name of names) {
    for (const folder of folders) {
      urls.push(`${baseUrl}/${folder}/${name}`);
    }
  }
  return urls;
}

function clipFromSmd(name, smd, dstBones, fps, loop, events = []) {
  const frames = smd.frames.map((_, i) => remapPose(smd.bones, smdPoseFromFrame(smd, i), dstBones));
  return {
    name,
    fps: fps || 30,
    loop,
    frames,
    events,
  };
}

function clipFromMdlSeq(seq) {
  return {
    name: seq.name,
    fps: seq.fps || 30,
    loop: seq.loop,
    frames: seq.frames,
    events: seq.events || [],
  };
}

function eventsForClip(name, mdl) {
  const lower = String(name || "").toLowerCase();
  const seq = mdl?.sequences?.find((item) => item.name.toLowerCase() === lower);
  return seq?.events || [];
}

export class StudioModel {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = "Viewmodel";
    this.mesh = null;
    this.bones = [];
    this.threeBones = [];
    this.skeleton = null;
    this.clips = new Map();
    this.current = null;
    this.time = 0;
    this.source = "";
    this.weapon = null;
    this.onFinished = null;
    this.onEvent = null;
    this.ownsGpu = true;
    this.plantFeet = false;
  }

  dispose() {
    this.root.removeFromParent();
    if (!this.ownsGpu || !this.mesh) return;
    this.mesh.geometry.dispose();
    const mats = Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material];
    for (const mat of mats) {
      mat?.map?.dispose();
      mat?.dispose();
    }
  }

  play(name, { loop, restart = true } = {}) {
    const clip = this.findClip(name);
    if (!clip) return false;
    if (!restart && this.current?.name === clip.name) return true;
    this.current = clip;
    this.time = 0;
    if (loop !== undefined) clip.loopOverride = loop;
    this.applyFrame(0, 0);
    this.fireEvents(-1, 1);
    return true;
  }

  fireEvents(from, to) {
    const events = this.current?.events;
    if (!events?.length || !this.onEvent) return;
    for (const event of events) {
      if (event.frame > from && event.frame <= to) this.onEvent(event, this.current);
    }
  }

  findClip(name) {
    if (!name) return null;
    if (this.clips.has(name)) return this.clips.get(name);
    const lower = name.toLowerCase();
    const wantUnsil = /unsil/i.test(lower);
    const family = (key) => /unsil/i.test(key) === wantUnsil;
    for (const [key, clip] of this.clips) {
      if (key.toLowerCase() === lower) return clip;
    }
    for (const [key, clip] of this.clips) {
      if (!family(key)) continue;
      const k = key.toLowerCase();
      if (k.startsWith(lower) || lower.startsWith(k)) return clip;
    }
    return null;
  }

  listClips() {
    return [...this.clips.keys()];
  }

  applyFrame(i0, t) {
    const clip = this.current;
    if (!clip?.frames?.length) return;
    const i1 = Math.min(i0 + 1, clip.frames.length - 1);
    const a = clip.frames[i0];
    const b = clip.frames[i1];
    const pos = new THREE.Vector3();
    const quatA = new THREE.Quaternion();
    const quatB = new THREE.Quaternion();
    for (let i = 0; i < this.threeBones.length; i++) {
      const pa = a[i];
      const pb = b[i];
      if (!pa || !pb) continue;
      toThreePos(
        pa.pos[0] + (pb.pos[0] - pa.pos[0]) * t,
        pa.pos[1] + (pb.pos[1] - pa.pos[1]) * t,
        pa.pos[2] + (pb.pos[2] - pa.pos[2]) * t,
        pos
      );
      goldSrcQuat(pa.rot[0], pa.rot[1], pa.rot[2], quatA);
      goldSrcQuat(pb.rot[0], pb.rot[1], pb.rot[2], quatB);
      toThreeQuat(quatA, quatA);
      toThreeQuat(quatB, quatB);
      quatA.slerp(quatB, t);
      this.threeBones[i].position.copy(pos);
      this.threeBones[i].quaternion.copy(quatA);
    }
    if (this.plantFeet) this.alignToGround();
  }

  alignToGround() {
    if (!this.mesh || !this.threeBones.length) return;
    this.mesh.position.y = 0;
    this.root.updateMatrixWorld(true);
    let minY = Infinity;
    for (const bone of this.threeBones) {
      if (!/Foot|Toe/i.test(bone.name)) continue;
      bone.getWorldPosition(_groundAt);
      if (_groundAt.y < minY) minY = _groundAt.y;
    }
    if (!Number.isFinite(minY)) {
      for (const bone of this.threeBones) {
        bone.getWorldPosition(_groundAt);
        if (_groundAt.y < minY) minY = _groundAt.y;
      }
    }
    if (!Number.isFinite(minY)) return;
    this.root.getWorldPosition(_groundAt);
    this.mesh.position.y = _groundAt.y - minY;
  }

  update(dt) {
    const clip = this.current;
    if (!clip?.frames?.length) return;
    const looping = clip.loopOverride ?? clip.loop;
    const prev = this.time;
    this.time += dt * clip.fps;
    const last = clip.frames.length - 1;
    if (this.time >= last) {
      this.fireEvents(prev, last);
      if (looping) {
        this.time %= Math.max(last, 1);
        this.fireEvents(-1, this.time);
      } else {
        this.time = last;
        this.applyFrame(last, 0);
        if (this.onFinished) {
          const cb = this.onFinished;
          this.onFinished = null;
          cb(clip.name);
        }
        return;
      }
    } else {
      this.fireEvents(prev, this.time);
    }
    const i0 = Math.floor(this.time);
    this.applyFrame(i0, this.time - i0);
  }
}

async function attachTextureMdl(mdl, mdlUrl, textureUrl) {
  if (mdl.textures.length) return mdl;
  const candidates = [textureUrl, String(mdlUrl || "").replace(/\.mdl$/i, "T.mdl")].filter(Boolean);
  for (const url of [...new Set(candidates)]) {
    if (url === mdlUrl) continue;
    try {
      const texMdl = parseMDL(await loadBytes(url));
      if (!texMdl.textures.length) continue;
      mdl.textures = texMdl.textures;
      if (!mdl.skinTable.length) mdl.skinTable = texMdl.skinTable;
      return mdl;
    } catch {
      /* viewmodels often have no T.mdl */
    }
  }
  return mdl;
}

export function cloneStudioModel(src) {
  const model = new StudioModel();
  model.source = src.source;
  model.bones = src.bones;
  model.clips = src.clips;
  model.weapon = src.weapon;
  model.ownsGpu = false;
  model.plantFeet = src.plantFeet;
  model.root = cloneSkeleton(src.root);
  model.root.traverse((obj) => {
    if (!obj.isSkinnedMesh) return;
    model.mesh = obj;
    model.skeleton = obj.skeleton;
    model.threeBones = obj.skeleton.bones;
  });
  return model;
}

export async function loadPlayerModel(id) {
  const def = playerById(id);
  const folder = def.folder || def.id;
  const model = await loadStudioModel(
    { id: def.id, name: def.name, mdl: `${folder}/${def.id}.mdl`, sequences: [], bodies: [] },
    {
      baseUrl: "/players",
      mdlUrl: `/players/${folder}/${def.id}.mdl`,
      textureUrl: `/players/${folder}/${def.id}T.mdl`,
      source: "mdl",
    }
  );
  model.plantFeet = true;
  return model;
}

export async function loadStudioModel(weapon, options = {}) {
  const baseUrl = options.baseUrl || "/cs16";
  const source = options.source || "auto";
  const handsKey = options.hands || "cs";
  const model = new StudioModel();
  model.weapon = weapon;

  const useSmdMesh = source === "smd";
  const mdlUrl = options.mdlUrl || `${baseUrl}/${weapon.mdl}`;
  let mdl = null;
  if (source !== "smd") {
    mdl = parseMDL(await loadBytes(mdlUrl));
    mdl = await attachTextureMdl(mdl, mdlUrl, options.textureUrl);
  }

  const smdClips = [];
  const bodySmds = [];
  if (source !== "mdl") {
    const wantedBodies = [];
    const handsPath = options.catalog?.hands?.[handsKey];
    if (useSmdMesh && handsPath) wantedBodies.push(handsPath);
    for (const body of weapon.bodies || []) {
      const file = body.file.replace(/\\/g, "/");
      if (file.includes("hands_reference") || file.includes("01_hands")) {
        if (useSmdMesh && !handsPath) wantedBodies.push(file);
        continue;
      }
      wantedBodies.push(file);
    }
    const uniqueBodies = [...new Set(wantedBodies)];
    for (const file of uniqueBodies) {
      try {
        bodySmds.push(parseSMD(await loadText(`${baseUrl}/${file}`)));
      } catch (err) {
        console.warn("Missing body SMD", file, err);
      }
    }
    for (const seq of weapon.sequences || []) {
      const smdPath = `${baseUrl}/${weapon.cd}/${seq.smd}.smd`;
      try {
        const smd = parseSMD(await loadText(smdPath));
        smdClips.push({ seq, smd });
      } catch (err) {
        console.warn("Missing animation SMD", smdPath, err);
      }
    }
  }

  let geometry;
  let materials;
  let rest;
  let bones;

  if (useSmdMesh) {
    if (!bodySmds.length) throw new Error(`No SMD meshes for ${weapon.id}`);
    const restSource = bodySmds.reduce((best, smd) => (smd.bones.length > best.bones.length ? smd : best), bodySmds[0]);
    bones = restSource.bones;
    const textureMap = await loadBmpTextures(collectTextureUrls(baseUrl, weapon, bodySmds));
    ({ geometry, materials } = smdToGeometry(bodySmds, bones, textureMap));
    rest = smdPoseFromFrame(restSource, 0);
    model.source = "SMD";
  } else {
    bones = mdl.bones;
    ({ geometry, materials, rest } = mdlToGeometry(mdl));
    model.source = source === "auto" && smdClips.length ? "MDL + SMD" : "MDL";
  }

  const { threeBones, roots, skeleton } = buildSkeleton(bones, rest);
  const mesh = new THREE.SkinnedMesh(geometry, materials);
  mesh.name = weapon.id;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  for (const rootBone of roots) mesh.add(rootBone);
  mesh.updateMatrixWorld(true);
  mesh.bind(skeleton);
  model.root.add(mesh);
  model.mesh = mesh;
  model.bones = bones;
  model.threeBones = threeBones;
  model.skeleton = skeleton;

  if (smdClips.length) {
    for (const { seq, smd } of smdClips) {
      model.clips.set(seq.name, clipFromSmd(seq.name, smd, bones, seq.fps, seq.loop, eventsForClip(seq.name, mdl)));
    }
  }
  if (mdl && (source === "mdl" || !smdClips.length || source === "auto")) {
    for (const seq of mdl.sequences) {
      if (!model.clips.has(seq.name)) model.clips.set(seq.name, clipFromMdlSeq(seq));
    }
  }

  if (source === "auto" && smdClips.length) {
    for (const { seq, smd } of smdClips) {
      model.clips.set(seq.name, clipFromSmd(seq.name, smd, bones, seq.fps, seq.loop, eventsForClip(seq.name, mdl)));
    }
    model.source = "MDL mesh / SMD anims";
  }

  return model;
}
