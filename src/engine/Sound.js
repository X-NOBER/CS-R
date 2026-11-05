const MUZZLE_EVENTS = new Set([5001, 5011, 5021]);
const SOUND_EVENTS = new Set([5004, 5005]);

/** Stored player pack. Only these four are used for default footsteps. */
export const FOOTSTEPS = ["player/pl_step1.wav", "player/pl_step2.wav", "player/pl_step3.wav", "player/pl_step4.wav"];

function weaponKey(weapon) {
  return String(weapon?.id || "").replace(/^shield_/, "").replace(/_r$/, "");
}

export function fireSoundCandidates(weapon, clipName = "") {
  const id = weaponKey(weapon);
  const clip = String(clipName || "").toLowerCase();
  if (/stab.*miss|miss.*stab/.test(clip) || /slash|midslash/.test(clip)) {
    return ["weapons/knife_slash1.wav", "weapons/knife_slash2.wav"];
  }
  if (clip.includes("stab")) return ["weapons/knife_stab.wav"];
  if (clip.includes("pullpin")) return ["weapons/pinpull.wav"];
  if (id === "c4") return ["weapons/c4_click.wav", "weapons/c4_button.wav"];
  if (id === "hegrenade") return ["weapons/hegrenade-1.wav", "weapons/hegrenade-2.wav"];
  if (id === "flashbang") return ["weapons/flashbang-1.wav", "weapons/flashbang-2.wav"];
  if (id === "smokegrenade") return ["weapons/pinpull.wav"];
  const unsil = clip.includes("unsil");
  if (id === "usp") {
    return unsil
      ? ["weapons/usp_unsil-1.wav", "weapons/usp_unsil-2.wav"]
      : ["weapons/usp1.wav", "weapons/usp2.wav"];
  }
  if (id === "m4a1") {
    return unsil
      ? ["weapons/m4a1_unsil-1.wav", "weapons/m4a1_unsil-2.wav"]
      : ["weapons/m4a1-1.wav", "weapons/m4a1-2.wav"];
  }
  if (id === "awp") return ["weapons/awp1.wav", "weapons/awp2.wav"];
  if (id === "scout") return ["weapons/scout_fire-1.wav", "weapons/scout_fire-2.wav"];
  if (id === "elite") return ["weapons/elite_fire.wav"];
  if (id === "glock18") return ["weapons/glock18-1.wav", "weapons/glock18-2.wav"];
  if (id === "famas") return clip.includes("burst") ? ["weapons/famas-burst.wav"] : ["weapons/famas-1.wav", "weapons/famas-2.wav"];
  return [`weapons/${id}-1.wav`, `weapons/${id}-2.wav`, `weapons/${id}1.wav`, `weapons/${id}2.wav`];
}

function cleanSoundPath(path) {
  return String(path || "")
    .replace(/\0/g, "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^sound\//i, "");
}

function soundUrls(path) {
  const clean = cleanSoundPath(path);
  if (!clean) return [];
  const file = /\.(wav|mp3|ogg)$/i.test(clean) ? clean : `${clean}.wav`;
  return [`/sound/${file}`, `/reanims/Custom Sound/sound/${file}`, `/reanims/Sound/${file}`];
}

function findWavChunk(bytes, name) {
  let i = 12;
  while (i + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
    const size = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
    const len = size >>> 0;
    if (id === name) return { offset: i + 8, size: len };
    i += 8 + len + (len & 1);
  }
  return null;
}

function decodePcmWav(ctx, raw) {
  try {
    const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    if (bytes.length < 44) return null;
    const fmt = findWavChunk(bytes, "fmt ");
    const data = findWavChunk(bytes, "data");
    if (!fmt || !data) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const format = view.getUint16(fmt.offset, true);
    const channels = view.getUint16(fmt.offset + 2, true);
    const rate = view.getUint32(fmt.offset + 4, true);
    const bits = view.getUint16(fmt.offset + 14, true);
    if (format !== 1 || !channels || !rate || (bits !== 8 && bits !== 16)) return null;
    const sampleBytes = bits / 8;
    const frames = Math.floor(data.size / (channels * sampleBytes));
    if (frames <= 0) return null;
    const buffer = ctx.createBuffer(channels, frames, rate);
    for (let ch = 0; ch < channels; ch++) {
      const out = buffer.getChannelData(ch);
      for (let i = 0; i < frames; i++) {
        const at = data.offset + (i * channels + ch) * sampleBytes;
        if (at + sampleBytes > bytes.length) break;
        out[i] = bits === 8 ? (bytes[at] - 128) / 128 : view.getInt16(at, true) / 32768;
      }
    }
    return buffer;
  } catch {
    return null;
  }
}

const SPATIAL = {
  fire: { volume: 1, ref: 180, max: 2400, rolloff: 1.2 },
  step: { volume: 0.7, ref: 52, max: 820, rolloff: 1.45 },
};

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.missing = new Set();
    this.cycle = new Map();
    this.stepSrc = null;
    this.stepGain = null;
    this.npcStep = 0;
  }

  ensureCtx() {
    this.ctx ??= new AudioContext();
    return this.ctx;
  }

  resume() {
    this.ensureCtx();
    if (this.ctx.state === "suspended") return this.ctx.resume().then(() => this.ctx);
    return Promise.resolve(this.ctx);
  }

  soundKey(path) {
    return String(path || "").replace(/\\/g, "/").toLowerCase();
  }

  cached(path) {
    const buf = this.buffers.get(this.soundKey(path));
    return buf && typeof buf.then !== "function" ? buf : null;
  }

  load(path) {
    const key = this.soundKey(path);
    if (!key || this.missing.has(key)) return Promise.resolve(null);
    const existing = this.buffers.get(key);
    if (existing && typeof existing.then !== "function") return Promise.resolve(existing);
    if (existing) return existing;
    const pending = this.fetchBuffer(path, key);
    this.buffers.set(key, pending);
    return pending;
  }

  async fetchBuffer(path, cacheKey) {
    this.ensureCtx();
    const key = cacheKey || this.soundKey(path);
    const urls = [];
    for (const url of [...soundUrls(path), ...soundUrls(key)]) {
      if (url && !urls.includes(url)) urls.push(url);
    }
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const raw = await res.arrayBuffer();
        let buffer = null;
        try {
          buffer = await this.ctx.decodeAudioData(raw.slice(0));
        } catch {
          buffer = decodePcmWav(this.ctx, raw);
        }
        if (!buffer) continue;
        this.buffers.set(key, buffer);
        return buffer;
      } catch {
        /* try next candidate */
      }
    }
    this.missing.add(key);
    this.buffers.delete(key);
    return null;
  }

  startSource(buffer, volume = 1, { oneShot = true } = {}) {
    if (!buffer || !this.ctx || this.ctx.state !== "running") return;
    if (oneShot && this.stepSrc) {
      try {
        this.stepSrc.stop();
      } catch {
        /* already ended */
      }
      this.stepSrc = null;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    if (oneShot) {
      if (!this.stepGain) {
        this.stepGain = this.ctx.createGain();
        this.stepGain.connect(this.ctx.destination);
      }
      this.stepGain.gain.value = volume;
      src.connect(this.stepGain);
      this.stepSrc = src;
      src.onended = () => {
        if (this.stepSrc === src) this.stepSrc = null;
      };
    } else {
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain).connect(this.ctx.destination);
    }
    src.start();
  }

  play(path, { volume = 1 } = {}) {
    if (!path) return;
    const start = (buffer) => {
      if (!buffer) return;
      this.resume().then(() => this.startSource(buffer, volume, { oneShot: false }));
    };
    const cached = this.cached(path);
    if (cached) {
      start(cached);
      return;
    }
    this.load(path).then(start);
  }

  distanceGain(world, listener, { ref = 96, max = 1400, rolloff = 1.2 } = {}) {
    const dx = world.x - listener.x;
    const dy = (world.y || 0) - (listener.y || 0);
    const dz = world.z - listener.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist >= max) return { gain: 0, pan: 0, dist };
    const atten = dist <= ref ? 1 : Math.pow(ref / dist, rolloff);
    const rx = -(listener.fz || 0);
    const rz = listener.fx || 0;
    const rlen = Math.hypot(rx, rz) || 1;
    const pan = dist > 1 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / (rlen * dist))) : 0;
    return { gain: atten, pan, dist };
  }

  playFootstep() {
    const index = this.cycle.get("footstep") || 0;
    this.cycle.set("footstep", index + 1);
    const file = FOOTSTEPS[index % FOOTSTEPS.length];
    const cached = this.cached(file);
    if (cached) {
      this.startSource(cached, 0.7, { oneShot: true });
      return;
    }
    this.load(file).then((buffer) => {
      if (buffer) this.startSource(buffer, 0.7, { oneShot: true });
    });
  }

  playFootstepAt(world, listener) {
    if (!world || !listener) return;
    const file = FOOTSTEPS[this.npcStep++ % FOOTSTEPS.length];
    const cached = this.cached(file);
    if (cached) {
      this.startSpatial(cached, world, listener, SPATIAL.step);
      return;
    }
    this.load(file).then((buffer) => {
      if (buffer) this.startSpatial(buffer, world, listener, SPATIAL.step);
    });
  }

  startSpatial(buffer, world, listener, preset = SPATIAL.step) {
    if (!buffer || !this.ctx || this.ctx.state !== "running") return;
    const fall = this.distanceGain(world, listener, preset);
    const volume = (preset.volume ?? 1) * fall.gain;
    if (volume < 0.02) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = fall.pan;
        src.connect(gain).connect(pan).connect(this.ctx.destination);
      } else {
        src.connect(gain).connect(this.ctx.destination);
      }
      src.start();
    } catch {
      this.startSource(buffer, volume, { oneShot: false });
    }
  }

  preloadFootsteps() {
    for (const file of FOOTSTEPS) this.load(file);
  }

  playFire(weapon, clipName, world = null, listener = null) {
    const files = fireSoundCandidates(weapon, clipName);
    if (!files.length) return;
    const key = `${weaponKey(weapon)}:${String(clipName || "").toLowerCase()}`;
    const index = this.cycle.get(key) || 0;
    this.cycle.set(key, index + 1);
    const ordered = files.map((_, i) => files[(index + i) % files.length]);
    this.playFirst(ordered, world && listener ? { world, listener, kind: "fire" } : null);
  }

  playFirst(paths, spatial = null) {
    const tryNext = (i) => {
      if (i >= paths.length) return;
      const playBuf = (buffer) => {
        if (!buffer) {
          tryNext(i + 1);
          return;
        }
        this.resume().then(() => {
          if (spatial) this.startSpatial(buffer, spatial.world, spatial.listener, SPATIAL[spatial.kind] || SPATIAL.fire);
          else this.startSource(buffer, 1, { oneShot: false });
        });
      };
      const cached = this.cached(paths[i]);
      if (cached) playBuf(cached);
      else {
        this.load(paths[i]).then(playBuf);
      }
    };
    tryNext(0);
  }

  handleEvent(event, clip, weapon) {
    if (!event) return;
    const clipName = clip?.name || "";
    const miss = /stab.*miss|miss.*stab/i.test(clipName);
    if (SOUND_EVENTS.has(event.event) && /[./]/.test(event.options || "")) {
      if (miss && /stab/i.test(event.options) && !/slash/i.test(event.options)) return;
      this.play(event.options);
      return;
    }
    if (MUZZLE_EVENTS.has(event.event) && !/empty/i.test(clipName)) {
      this.playFire(weapon, clipName);
    }
  }

  preloadWeapon(weapon, model) {
    const paths = new Set(fireSoundCandidates(weapon, "shoot1"));
    for (const clip of model?.clips?.values() || []) {
      for (const event of clip.events || []) {
        if (SOUND_EVENTS.has(event.event) && event.options) paths.add(event.options);
        if (MUZZLE_EVENTS.has(event.event)) {
          for (const file of fireSoundCandidates(weapon, clip.name)) paths.add(file);
        }
      }
    }
    for (const path of paths) if (path) this.load(path);
  }
}

export function clipHasMuzzle(clip) {
  return (clip?.events || []).some((event) => MUZZLE_EVENTS.has(event.event));
}
