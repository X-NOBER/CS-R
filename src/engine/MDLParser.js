import { BinaryReader } from "./BinaryReader.js";

const SEQ_SIZE = 176;
const BONE_SIZE = 112;
const TEXTURE_SIZE = 80;
const BODY_SIZE = 76;
const MODEL_SIZE = 112;
const MESH_SIZE = 20;
const ANIM_SIZE = 12;

function isMagenta(r, g, b) {
  return r >= 250 && g <= 8 && b >= 250;
}

function decodeAnimChannel(reader, entryOffset, base, scale, numFrames) {
  const values = new Array(numFrames).fill(base);
  if (!entryOffset) return values;

  let frame = 0;
  let cursor = entryOffset;
  while (frame < numFrames) {
    if (cursor + 2 > reader.size) break;
    const valid = reader.bytes[cursor];
    const total = reader.bytes[cursor + 1];
    cursor += 2;
    if (total === 0) break;
    for (let t = 0; t < total && frame < numFrames; t++, frame++) {
      if (valid === 0) {
        values[frame] = base;
        continue;
      }
      const valueIndex = t < valid ? t : valid - 1;
      const shortOffset = cursor + valueIndex * 2;
      if (shortOffset + 2 > reader.size) {
        values[frame] = base;
        continue;
      }
      const delta = new DataView(reader.bytes.buffer, reader.bytes.byteOffset + shortOffset, 2).getInt16(0, true);
      values[frame] = base + delta * scale;
    }
    cursor += valid * 2;
  }
  return values;
}

export function parseMDL(buffer) {
  const reader = new BinaryReader(buffer);
  const id = reader.cstring(4);
  const version = reader.i32();
  if (id !== "IDST" || version !== 10) {
    throw new Error(`Unsupported MDL (${id} v${version}). Expected GoldSrc IDST v10.`);
  }

  const name = reader.cstring(64);
  const length = reader.i32();
  reader.vec3();
  reader.vec3();
  reader.vec3();
  reader.vec3();
  reader.vec3();
  reader.i32();

  const numbones = reader.i32();
  const boneindex = reader.i32();
  reader.i32();
  reader.i32();
  reader.i32();
  reader.i32();
  const numseq = reader.i32();
  const seqindex = reader.i32();
  reader.i32();
  reader.i32();
  const numtextures = reader.i32();
  const textureindex = reader.i32();
  reader.i32();
  const numskinref = reader.i32();
  const numskinfamilies = reader.i32();
  const skinindex = reader.i32();
  const numbodyparts = reader.i32();
  const bodypartindex = reader.i32();

  const bones = [];
  for (let i = 0; i < numbones; i++) {
    reader.seek(boneindex + i * BONE_SIZE);
    const boneName = reader.cstring(32) || `bone_${i}`;
    const parent = reader.i32();
    reader.i32();
    const controllers = [reader.i32(), reader.i32(), reader.i32(), reader.i32(), reader.i32(), reader.i32()];
    const value = [reader.f32(), reader.f32(), reader.f32(), reader.f32(), reader.f32(), reader.f32()];
    const scale = [reader.f32(), reader.f32(), reader.f32(), reader.f32(), reader.f32(), reader.f32()];
    bones.push({
      name: boneName,
      parent,
      controllers,
      pos: [value[0], value[1], value[2]],
      rot: [value[3], value[4], value[5]],
      scale,
      value,
    });
  }

  const textures = [];
  for (let i = 0; i < numtextures; i++) {
    reader.seek(textureindex + i * TEXTURE_SIZE);
    const texName = reader.cstring(64);
    const flags = reader.i32();
    const width = reader.i32();
    const height = reader.i32();
    const index = reader.i32();
    const pixelCount = width * height;
    const data = new Uint8Array(pixelCount * 4);
    if (index > 0 && index + pixelCount + 768 <= reader.size) {
      const pixels = reader.bytes.subarray(index, index + pixelCount);
      const palette = reader.bytes.subarray(index + pixelCount, index + pixelCount + 768);
      const masked = Boolean(flags & 0x0040);
      for (let p = 0; p < pixelCount; p++) {
        const idx = pixels[p];
        const r = palette[idx * 3];
        const g = palette[idx * 3 + 1];
        const b = palette[idx * 3 + 2];
        let a = 255;
        if ((masked && idx === 255) || isMagenta(r, g, b)) a = 0;
        data[p * 4] = r;
        data[p * 4 + 1] = g;
        data[p * 4 + 2] = b;
        data[p * 4 + 3] = a;
      }
    }
    textures.push({ name: texName, flags, width, height, data, masked: Boolean(flags & 0x0040) || isMagenta(data[0], data[1], data[2]) });
  }

  const skinTable = [];
  if (numskinref > 0 && numskinfamilies > 0) {
    reader.seek(skinindex);
    for (let i = 0; i < numskinref * numskinfamilies; i++) {
      skinTable.push(reader.i16());
    }
  }

  const bodyparts = [];
  for (let bp = 0; bp < numbodyparts; bp++) {
    reader.seek(bodypartindex + bp * BODY_SIZE);
    const bpName = reader.cstring(64);
    const nummodels = reader.i32();
    reader.i32();
    const modelindex = reader.i32();
    const models = [];
    for (let m = 0; m < nummodels; m++) {
      reader.seek(modelindex + m * MODEL_SIZE);
      const modelName = reader.cstring(64);
      reader.i32();
      reader.f32();
      const nummesh = reader.i32();
      const meshindex = reader.i32();
      const numverts = reader.i32();
      const vertinfoindex = reader.i32();
      const vertindex = reader.i32();
      const numnorms = reader.i32();
      const norminfoindex = reader.i32();
      const normindex = reader.i32();

      const vertices = [];
      reader.seek(vertindex);
      for (let v = 0; v < numverts; v++) vertices.push(reader.vec3());
      const normals = [];
      reader.seek(normindex);
      for (let n = 0; n < numnorms; n++) normals.push(reader.vec3());
      const vertBone = Array.from(reader.bytes.subarray(vertinfoindex, vertinfoindex + numverts));
      const normBone = Array.from(reader.bytes.subarray(norminfoindex, norminfoindex + numnorms));

      const meshes = [];
      for (let mi = 0; mi < nummesh; mi++) {
        reader.seek(meshindex + mi * MESH_SIZE);
        reader.i32();
        const triindex = reader.i32();
        const skinref = reader.i32();
        const tris = [];
        let cursor = triindex;
        while (cursor + 2 <= reader.size) {
          const cmd = new DataView(reader.bytes.buffer, reader.bytes.byteOffset + cursor, 2).getInt16(0, true);
          cursor += 2;
          if (cmd === 0) break;
          const fan = cmd < 0;
          const count = Math.abs(cmd);
          const strip = [];
          for (let v = 0; v < count; v++) {
            const dv = new DataView(reader.bytes.buffer, reader.bytes.byteOffset + cursor, 8);
            strip.push({
              vi: dv.getInt16(0, true),
              ni: dv.getInt16(2, true),
              s: dv.getInt16(4, true),
              t: dv.getInt16(6, true),
            });
            cursor += 8;
          }
          for (let v = 2; v < count; v++) {
            let a;
            let b;
            let c;
            if (fan) {
              a = strip[0];
              b = strip[v - 1];
              c = strip[v];
            } else if (v % 2 === 0) {
              a = strip[v - 2];
              b = strip[v - 1];
              c = strip[v];
            } else {
              a = strip[v - 1];
              b = strip[v - 2];
              c = strip[v];
            }
            tris.push(a, b, c);
          }
        }
        meshes.push({ skinref, tris });
      }

      models.push({
        name: modelName,
        vertices,
        normals,
        vertBone,
        normBone,
        meshes,
      });
    }
    bodyparts.push({ name: bpName, models });
  }

  const sequences = [];
  for (let i = 0; i < numseq; i++) {
    reader.seek(seqindex + i * SEQ_SIZE);
    const label = reader.cstring(32);
    const fps = reader.f32();
    const flags = reader.i32();
    reader.i32();
    reader.i32();
    const numevents = reader.i32();
    const eventindex = reader.i32();
    const numframes = reader.i32();
    reader.i32();
    reader.i32();
    reader.i32();
    reader.i32();
    reader.vec3();
    reader.i32();
    reader.i32();
    reader.vec3();
    reader.vec3();
    const numblends = reader.i32();
    const animindex = reader.i32();
    const frames = decodeSequence(reader, bones, animindex, numframes, numblends);
    const events = [];
    if (numevents > 0 && numevents < 64 && eventindex > 0) {
      for (let e = 0; e < numevents; e++) {
        reader.seek(eventindex + e * 76);
        const frame = reader.i32();
        const event = reader.i32();
        const type = reader.i32();
        const options = reader.cstring(64);
        events.push({ frame, event, type, options });
      }
    }
    sequences.push({
      name: label,
      fps,
      flags,
      numframes,
      loop: Boolean(flags & 1) || label.toLowerCase().startsWith("idle"),
      frames,
      events,
    });
  }

  return {
    name,
    length,
    bones,
    textures,
    skinTable,
    numskinref,
    numskinfamilies,
    bodyparts,
    sequences,
  };
}

function decodeSequence(reader, bones, animindex, numframes, numblends) {
  if (numframes <= 0 || bones.length === 0 || animindex <= 0) return [];
  const frames = Array.from({ length: numframes }, () =>
    bones.map((bone) => ({
      pos: bone.pos.slice(),
      rot: bone.rot.slice(),
    }))
  );

  const blend = 0;
  const animOffset = animindex + blend * bones.length * ANIM_SIZE;
  for (let b = 0; b < bones.length; b++) {
    const bone = bones[b];
    const entry = animOffset + b * ANIM_SIZE;
    if (entry + ANIM_SIZE > reader.size) continue;
    const offsets = [];
    const dv = new DataView(reader.bytes.buffer, reader.bytes.byteOffset + entry, ANIM_SIZE);
    for (let c = 0; c < 6; c++) offsets.push(dv.getUint16(c * 2, true));

    for (let channel = 0; channel < 6; channel++) {
      const base = bone.value[channel];
      const scale = bone.scale[channel];
      const values = offsets[channel]
        ? decodeAnimChannel(reader, entry + offsets[channel], base, scale, numframes)
        : new Array(numframes).fill(base);
      for (let f = 0; f < numframes; f++) {
        if (channel < 3) frames[f][b].pos[channel] = values[f];
        else frames[f][b].rot[channel - 3] = values[f];
      }
    }
  }
  return frames;
}
