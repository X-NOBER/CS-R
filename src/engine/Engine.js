import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { loadStudioModel, loadPlayerModel, cloneStudioModel } from "./StudioModel.js";
import { DEFAULT_CT, DEFAULT_T, playerById } from "../game/Players.js";
import { SoundBank, clipHasMuzzle } from "./Sound.js";
import { combatStats, EQUIPMENT, worldModelFile, canDropWeapon } from "../game/WeaponStats.js";
import { MovementController } from "../game/Movement.js";
import { CombatState, aimRay } from "../game/Combat.js";
import { Loadout } from "../game/Loadout.js";
import { Squad } from "../game/AI.js";
import { Mission } from "../game/Mission.js";
import { pickClips, cycleName, pickShootClip, pickIdleClip } from "../game/Animations.js";
import { loadGoldSrcMap } from "./BSPLoader.js";

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

export class RiotEngine {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;
    this.clock = new THREE.Clock();
    this.mode = "fps";
    this.pack = "reanims";
    this.screen = "normal";
    this.teamHands = "ct";
    this.playerTeam = "ct";
    this.source = "auto";
    this.hands = "cs";
    this.loadPackSettings();
    this.playerTeam = this.playerTeam === "t" ? "t" : "ct";
    this.catalog = null;
    this.weapon = null;
    this.model = null;
    this.keys = new Set();
    this.mouseDown = false;
    this.velocity = new THREE.Vector3();
    this.bob = 0;
    this.health = 100;
    this.armor = 0;
    this.clip = 0;
    this.reserve = 0;
    this.busy = false;
    this.busyReason = null;
    this.silenced = true;
    this.jumpQueued = false;
    this.shootIndex = 0;
    this.eliteLeftIndex = 0;
    this.eliteRightIndex = 0;
    this.slashIndex = 0;
    this.drawIndex = 0;
    this.reloadIndex = 0;
    this.idleFidget = 0;
    this.sounds = new SoundBank();
    this.movement = new MovementController();
    this.combat = new CombatState();
    this.loadout = new Loadout();
    this.mission = new Mission();
    this.squad = null;
    this.colliders = [];
    this.coverPoints = [];
    this.buyOpen = false;
    this.startOpen = true;
    this.devOpen = false;
    this.liveSpawned = false;
    this.spawning = false;
    this.roundLive = false;
    this.shotgunReload = false;
    this.stepTimer = 0;
    this.playerCache = new Map();
    this.playerPreview = null;
    this.inspectTarget = "weapon";
    this.ctModelId = DEFAULT_CT;
    this.tModelId = DEFAULT_T;
    this.rayOrigin = new THREE.Vector3();
    this.rayDir = new THREE.Vector3();
    this._lookEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this._dmgFwd = new THREE.Vector3();
    this._dropMove = new THREE.Vector3();
    this.fx = [];
    this.drops = [];
    this.worldGunCache = new Map();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;

    this.world = new THREE.Scene();
    this.world.background = new THREE.Color(0x6a7a88);
    this.world.fog = new THREE.Fog(0x6a7a88, 700, 3600);

    this.viewScene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(90, innerWidth / innerHeight, 1, 8192);
    this.camera.position.set(0, 64, 80);
    this.viewCamera = new THREE.PerspectiveCamera(90, innerWidth / innerHeight, 0.1, 200);
    this.packVmDefaults = {
      original: { x: 1.5, y: 3.2, z: 0, rx: 0, ry: 180, rz: 0, scale: 1, fov: 90 },
      reanims: { x: 1.5, y: 1.05, z: 0, rx: 0, ry: 90, rz: 0, scale: 1, fov: 90 },
    };
    this.vmDefaults = this.packVmDefaults[this.pack] || this.packVmDefaults.reanims;
    this.vm = { ...this.vmDefaults };
    this.loadViewmodelSettings();
    this.applyViewmodelCamera();
    this.inspectCamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 8192);
    this.inspectCamera.position.set(48, 52, 78);

    this.controls = new PointerLockControls(this.camera, canvas);
    this.world.add(this.controls.getObject());
    this.controls.getObject().position.set(0, 64, 72);

    this.inspectPivot = new THREE.Object3D();
    this.world.add(this.inspectPivot);
    this.orbit = new OrbitControls(this.inspectCamera, canvas);
    this.orbit.enabled = false;
    this.orbit.enableDamping = true;
    this.orbit.target.set(0, 36, 0);

    this.mapRoot = new THREE.Group();
    this.world.add(this.mapRoot);
    this.collisionMesh = null;
    this.mapSpawns = { ct: [], t: [] };
    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.enable(1);
    this.raycaster.firstHitOnly = true;
    this._traceDown = new THREE.Vector3(0, -1, 0);
    this._traceDir = new THREE.Vector3();
    this._traceFrom = new THREE.Vector3();
    this._hullDirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0.7071, 0.7071],
      [-0.7071, 0.7071],
      [0.7071, -0.7071],
      [-0.7071, -0.7071],
    ];

    this.buildLights();
    this.buildFallbackMap();
    this.squad = new Squad(this.world);
    this.squad.setCover(this.coverPoints);
    this.bindInput();
    addEventListener("resize", () => this.resize());
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xc9d6c0, 0x2a2e24, 1.1);
    this.world.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1c9, 1.35);
    sun.position.set(40, 120, 30);
    sun.castShadow = true;
    this.world.add(sun);
    this.viewScene.add(new THREE.HemisphereLight(0xffffff, 0x334433, 1.6));
    const key = new THREE.DirectionalLight(0xfff4d2, 1.4);
    key.position.set(8, 18, 12);
    this.viewScene.add(key);
    const fill = new THREE.DirectionalLight(0x88aacc, 0.55);
    fill.position.set(-12, 6, 8);
    this.viewScene.add(fill);
  }

  buildFallbackMap() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d4338, roughness: 0.92 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a5244, roughness: 0.88 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 0.8 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a32, roughness: 0.7 });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(240, 2, 240), floorMat);
    floor.position.y = -1;
    floor.receiveShadow = true;
    this.mapRoot.add(floor);

    const grid = new THREE.GridHelper(240, 24, 0x5a634c, 0x3a4034);
    grid.position.y = 0.05;
    this.mapRoot.add(grid);

    for (const [x, z, w, d, h] of [
      [0, -120, 240, 4, 72],
      [0, 120, 240, 4, 72],
      [-120, 0, 4, 240, 72],
      [120, 0, 4, 240, 72],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, h / 2, z);
      wall.receiveShadow = true;
      this.mapRoot.add(wall);
    }

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(240, 2, 240), trimMat);
    ceiling.position.y = 73;
    this.mapRoot.add(ceiling);

    this.colliders = [];
    this.coverPoints = [];
    const crateSpots = [
      [-70, -40], [-48, -40], [-26, -40], [-4, -40], [18, -40],
      [-70, -16], [-48, -16], [40, -8], [62, -28], [-80, -72],
      [-40, -78], [8, -82], [48, -76], [-20, -54], [28, -58],
    ];
    for (const [x, z] of crateSpots) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), crateMat);
      crate.position.set(x, 7, z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      this.mapRoot.add(crate);
      this.colliders.push({ minX: x - 8, maxX: x + 8, minZ: z - 8, maxZ: z + 8 });
      this.coverPoints.push(new THREE.Vector3(x, 0, z - 16));
    }

    const range = new THREE.Mesh(new THREE.BoxGeometry(90, 36, 4), wallMat);
    range.position.set(0, 18, -110);
    this.mapRoot.add(range);
  }

  async loadMap() {
    try {
      const map = await loadGoldSrcMap("/maps/de_molino.bsp");
      this.installMap(map);
    } catch (err) {
      console.error(err);
      this.hud?.setStatus?.("Map load failed — using fallback yard");
    }
  }

  installMap(map) {
    while (this.mapRoot.children.length) this.mapRoot.remove(this.mapRoot.children[0]);
    this.mapRoot.add(map.group);
    this.collisionMesh = map.collisionMesh;
    this.collisionMesh.geometry.computeBoundsTree();
    this.world.add(this.collisionMesh);
    this.collisionMesh.updateMatrixWorld(true);
    this.mapSpawns = { ct: map.ct, t: map.t };
    this.coverPoints = map.t.length ? map.t.map((s) => s.feet.clone()) : map.cover.length ? map.cover : this.coverPoints;
    this.squad.setCover(this.coverPoints);
    this.colliders = [];
    const sky = new THREE.Color(map.light[0] / 255, map.light[1] / 255, map.light[2] / 255).multiplyScalar(0.42);
    this.world.background = sky;
    const span = map.bounds ? map.bounds.max.distanceTo(map.bounds.min) : 4000;
    this.world.fog = new THREE.Fog(sky, Math.max(1200, span * 0.28), Math.max(5000, span * 0.95));
    this.camera.far = 16384;
    this.camera.updateProjectionMatrix();
    this.spawnPlayer(this.playerTeam);
    this.mission.id = "de_molino";
    this.mission.name = "de_molino";
    this.mission.objective = "Clear Molino of hostiles.";
    this.hud?.setMission?.(this.mission, this.loadout);
  }

  setPlayerLook(yawRad, pitchRad = 0) {
    this._lookEuler.set(pitchRad, yawRad, 0, "YXZ");
    this.camera.quaternion.setFromEuler(this._lookEuler);
  }

  spawnPlayer(side = "ct") {
    const list = side === "t" ? this.mapSpawns.t : this.mapSpawns.ct;
    const spawn = list[0] || this.mapSpawns.ct[0] || this.mapSpawns.t[0];
    const pos = this.controls.object.position;
    if (spawn) {
      pos.copy(spawn.eye);
      this.setPlayerLook(THREE.MathUtils.degToRad(90 - spawn.yaw));
      const ground = this.groundY(pos.x, pos.z, pos.y + 64);
      if (Number.isFinite(ground)) pos.y = ground + this.movement.eye;
    } else {
      pos.set(0, this.movement.eye, 72);
      this.setPlayerLook(0);
    }
    this.movement.velocity.set(0, 0, 0);
    this.combat.punch.set(0, 0);
    this.combat.punchVel.set(0, 0);
    this.combat.resetSpray();
  }

  groundY(x, z, fromY = 1024) {
    if (!this.collisionMesh) return 0;
    this._traceFrom.set(x, fromY, z);
    this.raycaster.set(this._traceFrom, this._traceDown);
    this.raycaster.far = 4096;
    const hits = this.raycaster.intersectObject(this.collisionMesh, false);
    return hits.length ? hits[0].point.y : 0;
  }

  traceMove(x, y, z, dx, dy, dz, dist) {
    if (!this.collisionMesh || dist <= 0) return [];
    this._traceFrom.set(x, y, z);
    this._traceDir.set(dx, dy, dz);
    if (this._traceDir.lengthSq() < 1e-8) return [];
    this._traceDir.normalize();
    this.raycaster.set(this._traceFrom, this._traceDir);
    this.raycaster.far = dist;
    return this.raycaster.intersectObject(this.collisionMesh, false);
  }

  firstHit(x, y, z, dx, dy, dz, dist) {
    return this.traceMove(x, y, z, dx, dy, dz, dist)[0] || null;
  }

  firstWallHit(x, y, z, dx, dy, dz, dist) {
    for (const hit of this.traceMove(x, y, z, dx, dy, dz, dist)) {
      const ny = hit.normal?.y ?? hit.face?.normal?.y ?? 0;
      if (Math.abs(ny) < 0.55) return hit;
    }
    return null;
  }

  bindInput() {
    addEventListener("pointerdown", () => this.sounds.resume());
    addEventListener("keydown", (e) => {
      const typing = e.target.matches("input, select, textarea");
      if (e.code === "F9" || (e.code === "Digit9" && this.keys.has("KeyF"))) {
        e.preventDefault();
        this.toggleDeveloper();
        return;
      }
      if (typing) return;
      this.sounds.resume();
      this.keys.add(e.code);
      if (this.startOpen) {
        if (e.code === "Enter") this.startMatch();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        this.jumpQueued = true;
      }
      if (e.code === "KeyR" && !e.repeat) this.reload();
      if (e.code === "KeyG" && !e.repeat) this.dropHeld();
      if (e.code === "KeyF") this.inspectWeapon();
      if (e.code === "KeyB") this.toggleBuyMenu();
      if (e.code === "KeyQ") this.selectOwned(-1);
      if (e.code === "Digit1") this.selectLoadoutSlot("primary");
      if (e.code === "Digit2") this.selectLoadoutSlot("pistol");
      if (e.code === "Digit3") this.selectLoadoutSlot("melee");
      if (e.code === "Digit4") this.selectLoadoutSlot("grenade");
      if (e.code === "Enter" && this.mission.buying()) {
        this.mission.skipBuy();
        this.beginLive();
      }
      if (e.code === "Escape") {
        if (this.buyOpen) this.toggleBuyMenu(false);
        else this.controls.unlock();
      }
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    this.canvas.addEventListener("mousedown", (e) => {
      this.sounds.resume();
      if (this.startOpen || this.buyOpen) return;
      if (this.mode === "fps" && !this.controls.isLocked) {
        this.controls.lock();
        return;
      }
      if (e.button === 0) {
        this.mouseDown = true;
        this.attack();
      }
      if (e.button === 2) {
        if (this.weapon?.category === "melee") this.attack({ stab: true });
        else this.toggleSilencer();
      }
    });
    addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("wheel", (e) => {
      if (this.startOpen || this.buyOpen) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      this.selectOwned(dir);
    });
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    this.viewCamera.aspect = w / h;
    this.inspectCamera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewCamera.updateProjectionMatrix();
    this.inspectCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  async loadCatalog() {
    const catalogP = fetch("/weapons.json").then((r) => r.json());
    const mapP = this.loadMap();
    this.catalog = await catalogP;
    this.loadout.applyTeamPistol(this.playerTeam);
    this.armor = this.loadout.armor;
    this.hud.setCatalog(this.catalog);
    this.hud?.setMission?.(this.mission, this.loadout);
    this.hud?.setStartOpen?.(true, this);
    this.sounds.preloadFootsteps();
    await mapP;
  }

  weapons() {
    return this.catalog?.weapons || [];
  }

  toggleDeveloper() {
    this.devOpen = !this.devOpen;
    this.hud?.setDevOpen?.(this.devOpen);
    if (this.devOpen) {
      window.engine = this;
      this.controls.unlock();
      if (this.weapon && this.model) this.hud?.setWeapon?.(this.weapon, this.model);
      this.hud?.setStatus?.("Developer overlay — F9 to hide");
    } else {
      if (window.engine === this) delete window.engine;
      if (this.mode === "inspect") this.toggleMode();
      this.hud?.setStatus?.(this.startOpen ? "Arsenal briefing" : "First-person campaign");
    }
  }

  async equip(id, { holster = true, fromDev = false } = {}) {
    if (this.startOpen && !fromDev) return;
    const weapon = this.weapons().find((w) => w.id === id);
    if (!weapon) return;
    if (this.weapon) this.loadout.rememberAmmo(this.weapon, this.clip, this.reserve);
    if (holster && this.model && this.weapon && this.weapon.id !== id) {
      const packs = pickClips(this.model, { silenced: this.silenced });
      const holsterClip = packs.holster[0];
      if (holsterClip && !this.busy) {
        this.busy = true;
        this.busyReason = "holster";
        this.model.play(holsterClip, { loop: false });
        await new Promise((resolve) => {
          this.model.onFinished = () => resolve();
          setTimeout(resolve, 700);
        });
      }
    }
    this.hud.setStatus(`Loading ${weapon.name}…`);
    this.busy = true;
    this.busyReason = "draw";
    try {
      const model = await this.loadWeaponModel(weapon);
      this.model?.dispose();
      this.model = model;
      this.model.onEvent = (event, clip) => this.sounds.handleEvent(event, clip, weapon);
      this.sounds.preloadWeapon(weapon, model);
      this.weapon = weapon;
      const ammo = this.loadout.ammoFor(weapon);
      this.clip = ammo.clip;
      this.reserve = ammo.reserve;
      this.silenced = /m4a1|usp/i.test(weapon.id);
      this.combat.resetSpray();
      this.shootIndex = 0;
      this.eliteLeftIndex = 0;
      this.eliteRightIndex = 0;
      this.inspectTarget = "weapon";
      this.mountModel();
      this.playDraw();
      this.hud.setWeapon(weapon, model);
      this.ensureWorldTemplate(weapon).catch(() => {});
    } catch (err) {
      console.error(err);
      this.hud.setStatus(err.message);
      this.busy = false;
      this.busyReason = null;
    }
  }

  readViewmodelStore() {
    try {
      const saved = JSON.parse(localStorage.getItem("csriot.viewmodel") || "null");
      if (!saved || typeof saved !== "object") return {};
      if (Number.isFinite(saved.x)) return { original: saved };
      return saved;
    } catch {
      return {};
    }
  }

  loadViewmodelSettings() {
    const store = this.readViewmodelStore();
    const saved = store[this.pack];
    this.vmDefaults = this.packVmDefaults[this.pack] || this.packVmDefaults.reanims;
    this.vm = { ...this.vmDefaults };
    if (saved && typeof saved === "object") {
      for (const key of Object.keys(this.vmDefaults)) {
        if (Number.isFinite(saved[key])) this.vm[key] = saved[key];
      }
    }
  }

  saveViewmodelSettings() {
    const store = this.readViewmodelStore();
    store[this.pack] = { ...this.vm };
    localStorage.setItem("csriot.viewmodel", JSON.stringify(store));
  }

  setViewmodel(partial, { persist = true } = {}) {
    for (const [key, value] of Object.entries(partial)) {
      if (key in this.vm && Number.isFinite(value)) this.vm[key] = value;
    }
    this.applyViewmodel();
    if (persist) this.saveViewmodelSettings();
    this.hud?.syncViewmodel?.(this.vm);
  }

  resetViewmodel() {
    this.vm = { ...this.vmDefaults };
    this.applyViewmodel();
    this.saveViewmodelSettings();
    this.hud?.syncViewmodel?.(this.vm);
  }

  applyViewmodelCamera() {
    this.viewCamera.fov = this.vm.fov;
    this.viewCamera.updateProjectionMatrix();
  }

  applyViewmodel() {
    this.applyViewmodelCamera();
    if (!this.model || this.mode !== "fps") return;
    const deg = THREE.MathUtils.degToRad;
    this.model.root.position.set(this.vm.x, this.vm.y, this.vm.z);
    this.model.root.rotation.set(deg(this.vm.rx), deg(this.vm.ry), deg(this.vm.rz));
    this.model.root.scale.setScalar(this.vm.scale);
  }

  mountModel() {
    this.model?.root.removeFromParent();
    this.playerPreview?.root.removeFromParent();
    if (this.mode === "fps") {
      this.inspectTarget = "weapon";
      this.orbit.enabled = false;
      if (this.model) {
        this.viewScene.add(this.model.root);
        this.applyViewmodel();
      }
      return;
    }
    this.orbit.enabled = true;
    this.controls.unlock();
    if (this.inspectTarget === "player" && this.playerPreview) {
      this.inspectPivot.add(this.playerPreview.root);
      this.playerPreview.root.position.set(0, 0, 0);
      this.playerPreview.root.rotation.set(0, Math.PI, 0);
      this.playerPreview.root.scale.setScalar(1);
      this.orbit.target.set(0, 36, 0);
      this.inspectCamera.position.set(80, 52, 96);
    } else if (this.model) {
      this.inspectPivot.add(this.model.root);
      this.model.root.position.set(0, 40, 0);
      this.model.root.rotation.set(0, Math.PI, 0);
      this.model.root.scale.setScalar(2);
      this.orbit.target.set(0, 38, -8);
      this.inspectCamera.position.set(25, 50, 20);
    }
    this.orbit.update();
  }

  toggleMode() {
    if (this.startOpen && !this.devOpen) return;
    this.mode = this.mode === "fps" ? "inspect" : "fps";
    this.orbit.enabled = this.mode === "inspect";
    if (this.mode === "inspect") this.controls.unlock();
    if (this.mode === "fps") this.inspectTarget = "weapon";
    this.mountModel();
    this.hud.setMode(this.mode);
  }

  async getPlayerTemplate(id) {
    if (!this.playerCache.has(id)) this.playerCache.set(id, loadPlayerModel(id));
    return this.playerCache.get(id);
  }

  async previewPlayer(id) {
    const def = playerById(id);
    this.hud.setStatus(`Loading ${def.name}…`);
    try {
      const template = await this.getPlayerTemplate(id);
      this.playerPreview?.root.removeFromParent();
      this.playerPreview = cloneStudioModel(template);
      this.inspectTarget = "player";
      this.mode = "inspect";
      this.mountModel();
      this.playerPreview.play("idle1", { loop: true });
      this.hud.setPlayerPreview?.(def, this.playerPreview);
      this.hud.setMode(this.mode);
    } catch (err) {
      console.error(err);
      this.hud.setStatus(err.message);
    }
  }

  loadPackSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("csriot.pack") || "null");
      if (saved?.pack) this.pack = saved.pack;
      if (saved?.screen) this.screen = saved.screen;
      if (saved?.teamHands) this.teamHands = saved.teamHands;
      if (saved?.playerTeam) this.playerTeam = saved.playerTeam;
      if (saved?.source) this.source = saved.source;
      if (saved?.hands) this.hands = saved.hands;
    } catch {
      /* keep defaults */
    }
  }

  savePackSettings() {
    localStorage.setItem(
      "csriot.pack",
      JSON.stringify({
        pack: this.pack,
        screen: this.screen,
        teamHands: this.teamHands,
        playerTeam: this.playerTeam,
        source: this.source,
        hands: this.hands,
      })
    );
  }

  reanimsMdlUrl(weapon) {
    const screen = this.screen === "wide" ? "Widescreen" : "Normalscreen";
    const hands = this.teamHands === "t" ? "T-Hands" : "CT-Hands";
    const parts = weapon.mdl.replace(/\\/g, "/").split("/");
    const file = parts.pop();
    const sub = parts.includes("shield") ? "shield/" : "";
    return `/reanims/${screen}/${hands}/models/${sub}${file}`;
  }

  async loadWeaponModel(weapon) {
    const originalUrl = `${this.catalog.baseUrl}/${weapon.mdl}`;
    if (this.pack !== "reanims") {
      return loadStudioModel(weapon, {
        baseUrl: this.catalog.baseUrl,
        mdlUrl: originalUrl,
        source: this.source,
        hands: this.hands,
        catalog: this.catalog,
      });
    }
    const reanimsUrl = this.reanimsMdlUrl(weapon);
    try {
      return await loadStudioModel(weapon, {
        baseUrl: this.catalog.baseUrl,
        mdlUrl: reanimsUrl,
        source: "mdl",
        catalog: this.catalog,
      });
    } catch (err) {
      console.warn("Reanims model missing, falling back to original", reanimsUrl, err);
      return loadStudioModel(weapon, {
        baseUrl: this.catalog.baseUrl,
        mdlUrl: originalUrl,
        source: this.source,
        hands: this.hands,
        catalog: this.catalog,
      });
    }
  }

  setPack(pack) {
    this.pack = pack;
    this.savePackSettings();
    this.loadViewmodelSettings();
    this.applyViewmodel();
    this.hud?.syncPack?.(this);
    this.hud?.syncViewmodel?.(this.vm);
    if (this.weapon) this.equip(this.weapon.id);
  }

  setScreen(screen) {
    this.screen = screen;
    this.savePackSettings();
    if (this.weapon) this.equip(this.weapon.id);
  }

  setTeamHands(teamHands) {
    this.teamHands = teamHands;
    this.savePackSettings();
    if (this.weapon) this.equip(this.weapon.id);
  }

  setSource(source) {
    this.source = source;
    this.savePackSettings();
    if (this.weapon) this.equip(this.weapon.id);
  }

  setHands(hands) {
    this.hands = hands;
    this.savePackSettings();
    if (this.weapon) this.equip(this.weapon.id);
  }

  cycleWeapon(dir) {
    this.selectOwned(dir);
  }

  selectOwned(dir) {
    const id = this.loadout.cycleSlot(dir);
    if (id && id !== this.weapon?.id) this.equip(id);
  }

  selectLoadoutSlot(slot) {
    const id = this.loadout.selectSlot(slot);
    if (id && id !== this.weapon?.id) this.equip(id);
  }

  equipSlot(category) {
    const hit = this.weapons().find((w) => w.category === category);
    if (hit) this.equip(hit.id);
  }

  equipByIndex() {}

  worldMdlUrl(weapon) {
    const file = worldModelFile(weapon?.id);
    return file ? `/models/${file}` : null;
  }

  async ensureWorldTemplate(weapon) {
    const url = this.worldMdlUrl(weapon);
    if (!url) throw new Error("No world model");
    let hit = this.worldGunCache.get(url);
    if (!hit) {
      hit = loadStudioModel(
        { id: weapon.id, name: weapon.name, mdl: url, sequences: [], bodies: [] },
        { baseUrl: "/models", mdlUrl: url, source: "mdl" }
      ).then((model) => {
        this.worldGunCache.set(url, model);
        return model;
      });
      this.worldGunCache.set(url, hit);
    }
    return hit;
  }

  async loadWorldGun(weapon) {
    const template = await this.ensureWorldTemplate(weapon);
    return cloneStudioModel(template);
  }

  plantDroppedGun(root, x, z, floorY, yaw) {
    root.position.set(x, floorY + 6, z);
    root.rotation.set(0, yaw, 0);
  }

  async dropHeld() {
    if (this.startOpen || this.mode !== "fps" || this._dropping) return;
    const weapon = this.weapon;
    if (!canDropWeapon(weapon)) return;
    this._dropping = true;
    this.sounds.load("items/weapondrop.mp3");
    this.loadout.rememberAmmo(weapon, this.clip, this.reserve);
    const ammo = { ...this.loadout.ammoFor(weapon) };
    const result = this.loadout.dropWeapon(weapon);
    if (!result.ok) return;
    this.busy = false;
    this.busyReason = null;
    this.weapon = null;
    this.model?.dispose();
    this.model = null;
    this.clip = 0;
    this.reserve = 0;
    const origin = this.camera.position.clone();
    this.camera.getWorldDirection(this._dmgFwd);
    if (this._dmgFwd.lengthSq() < 1e-6) this._dmgFwd.set(0, 0, -1);
    this._dmgFwd.normalize();
    const look = this._dmgFwd.clone();
    const playerVel = this.movement.velocity.clone();
    if (result.nextId) this.equip(result.nextId, { holster: false });
    try {
      const model = await this.loadWorldGun(weapon);
      const start = origin.clone().addScaledVector(look, 14);
      start.y -= 6;
      const yaw = Math.atan2(look.x, look.z);
      model.root.position.copy(start);
      model.root.rotation.set(0.35, yaw, 0.2);
      this.world.add(model.root);
      const speed = 290;
      this.drops.push({
        weapon,
        clip: ammo.clip,
        reserve: ammo.reserve,
        model,
        root: model.root,
        vel: new THREE.Vector3(
          look.x * speed + playerVel.x * 0.85,
          look.y * speed + 110,
          look.z * speed + playerVel.z * 0.85
        ),
        yaw,
        lift: 6,
        flying: true,
        bounces: 0,
        armedAt: Infinity,
      });
    } catch (err) {
      console.warn("Drop failed", err);
      if (this.loadout.takePickup(weapon, ammo).ok) this.equip(weapon.id, { holster: false });
    } finally {
      this._dropping = false;
    }
  }

  removeDrop(index) {
    const drop = this.drops[index];
    if (!drop) return;
    drop.model?.root?.removeFromParent();
    this.drops.splice(index, 1);
  }

  clearDrops() {
    for (const drop of this.drops) drop.model?.root?.removeFromParent();
    this.drops = [];
  }

  playGunHit(drop, impact) {
    const vol = Math.max(0.28, Math.min(0.92, 0.34 + impact / 480));
    this.sounds.play("items/weapondrop.mp3", { volume: vol });
  }

  settleDrop(drop, floorY) {
    const y = Number.isFinite(floorY) ? floorY : drop.root.position.y - drop.lift;
    this.plantDroppedGun(drop.root, drop.root.position.x, drop.root.position.z, y, drop.yaw);
    drop.flying = false;
    drop.vel.set(0, 0, 0);
    drop.armedAt = performance.now() + 220;
  }

  bounceDrop(drop, floorY) {
    const impact = Math.max(0, -drop.vel.y);
    this.playGunHit(drop, impact);
    drop.bounces = (drop.bounces || 0) + 1;
    if (drop.bounces > 2 || impact < 90) {
      this.settleDrop(drop, floorY);
      return;
    }
    drop.root.position.y = floorY + drop.lift + 1.4;
    drop.vel.y = impact * (drop.bounces === 1 ? 0.28 : 0.14);
    drop.vel.x *= 0.48;
    drop.vel.z *= 0.48;
  }

  tickDropPhysics(drop, dt) {
    if (!drop.flying) return;
    const root = drop.root;
    const vel = drop.vel;
    const step = Math.min(dt, 0.05);
    vel.y -= 800 * step;
    this._dropMove.copy(vel).multiplyScalar(step);
    const horiz = Math.hypot(this._dropMove.x, this._dropMove.z);
    if (horiz > 0.05) {
      const wall = this.firstWallHit(
        root.position.x,
        root.position.y,
        root.position.z,
        this._dropMove.x / horiz,
        0,
        this._dropMove.z / horiz,
        horiz + 10
      );
      if (wall && wall.distance < horiz + 8) {
        vel.x *= -0.22;
        vel.z *= -0.22;
        this._dropMove.x = 0;
        this._dropMove.z = 0;
      }
    }
    if (vel.y > 0) {
      const ceil = this.firstHit(root.position.x, root.position.y, root.position.z, 0, 1, 0, this._dropMove.y + 8);
      if (ceil) {
        vel.y = 0;
        this._dropMove.y = 0;
      }
    }
    root.position.add(this._dropMove);
    if (!Number.isFinite(root.position.x) || !Number.isFinite(root.position.y) || !Number.isFinite(root.position.z)) {
      this.settleDrop(drop, this.controls.getObject().position.y - 36);
      return;
    }
    const spinScale = drop.bounces ? 0.45 : 1;
    root.rotation.x += 7.5 * step * spinScale;
    root.rotation.y += 9.5 * step * spinScale;
    root.rotation.z += 4.2 * step * spinScale;
    const floor = this.groundY(root.position.x, root.position.z, root.position.y + 36);
    if (Number.isFinite(floor) && vel.y <= 0 && root.position.y - drop.lift <= floor) this.bounceDrop(drop, floor);
  }

  tickDrops(dt) {
    if (!this.drops.length) return;
    const pos = this.controls.getObject().position;
    const now = performance.now();
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      this.tickDropPhysics(drop, dt);
      if (this.startOpen || drop.flying || now < drop.armedAt) continue;
      const dx = drop.root.position.x - pos.x;
      const dz = drop.root.position.z - pos.z;
      if (dx * dx + dz * dz > 56 * 56) continue;
      if (!this.loadout.takePickup(drop.weapon, { clip: drop.clip, reserve: drop.reserve }).ok) continue;
      this.removeDrop(i);
      this.equip(drop.weapon.id, { holster: false });
      break;
    }
  }

  clips() {
    return pickClips(this.model, { silenced: this.silenced });
  }

  idleName() {
    const packs = this.clips();
    const emptyIdle = pickIdleClip(packs, this.clip);
    if (emptyIdle) return emptyIdle;
    return packs.idle[0] || null;
  }

  clipName(kind) {
    const names = this.model?.listClips() || [];
    const suffix = this.silenced ? "" : "_unsil";
    const prefer = names.filter((n) => n.toLowerCase().includes(kind) && (this.silenced || n.toLowerCase().includes("unsil") || !names.some((x) => x.toLowerCase().includes(`${kind}_unsil`))));
    const plain = names.filter((n) => n.toLowerCase().includes(kind) && !n.toLowerCase().includes("unsil"));
    const pool = this.silenced ? plain : prefer.length ? prefer : plain;
    return pool;
  }

  playIdle() {
    this.busy = false;
    this.busyReason = null;
    this.shotgunReload = false;
    const packs = this.clips();
    const emptyIdle = pickIdleClip(packs, this.clip);
    if (emptyIdle) {
      const loop = /idle/i.test(emptyIdle);
      this.model.play(emptyIdle, { loop, restart: false });
      this.model.onFinished = loop ? null : () => {};
      return;
    }
    const moving = this.movement.speed > 40 && this.movement.grounded;
    if (moving && packs.walk.length) {
      this.model.play(packs.walk[0], { loop: true, restart: false });
      return;
    }
    const idles = packs.idle;
    this.idleFidget += 1;
    const fidget = idles.length > 1 && this.idleFidget % 9 === 0;
    const name = fidget ? cycleName(idles, this.idleFidget) : this.idleName();
    if (name) this.model.play(name, { loop: true, restart: false });
  }

  playDraw() {
    const packs = this.clips();
    const name = cycleName(packs.draw, this.drawIndex++) || this.idleName();
    if (!name) {
      this.playIdle();
      return;
    }
    this.busy = true;
    this.busyReason = "draw";
    this.model.play(name, { loop: false });
    if (!(this.model.current?.events?.length) && this.weapon.category === "melee") {
      this.sounds.play("weapons/knife_deploy1.wav");
    }
    this.model.onFinished = () => this.playIdle();
  }

  inspectWeapon() {
    if (this.startOpen) return;
    if (!this.model) return;
    const packs = this.clips();
    const name = cycleName(packs.inspect, this.shootIndex);
    if (!name) {
      this.hud.setStatus("No inspect animation");
      return;
    }
    if (this.busyReason === "reload") return;
    this.busy = true;
    this.busyReason = "inspect";
    this.model.play(name, { loop: false, restart: true });
    this.model.onFinished = () => this.playIdle();
  }

  actionLocked() {
    return ["reload", "draw", "holster", "silencer", "melee"].includes(this.busyReason);
  }

  attack({ stab = false } = {}) {
    if (!this.model || this.mode !== "fps") return;
    if (this.startOpen || this.buyOpen || this.mission.buying()) return;
    if (this.actionLocked()) return;
    const now = performance.now() / 1000;
    const stats = combatStats(this.weapon);
    const isKnife = this.weapon.category === "melee";
    const isNade = this.weapon.category === "equip" && this.weapon.id !== "c4";
    if (!isKnife && this.weapon.id !== "c4" && this.clip <= 0) {
      this.playIdle();
      return;
    }
    if (isKnife) {
      if (!this.combat.canFire(now)) return;
    } else if (!isNade && !this.combat.canFire(now, stats.auto)) return;

    const packs = this.clips();
    let name = null;
    let knifeHit = false;
    if (isKnife) {
      this.combat.noteMelee(now, stab);
      const mid = packs.slash.filter((n) => /midslash/i.test(n));
      const slashes = mid.length ? mid : packs.slash;
      if (stab) {
        knifeHit = this.fireHitscan({ ...stats, damage: stats.damage * 2.4, range: 48 });
        name =
          (knifeHit ? packs.stab[0] || packs.stabMiss[0] : packs.stabMiss[0] || packs.stab[0]) ||
          cycleName(packs.slash, this.slashIndex++);
      } else {
        name = cycleName(slashes, this.slashIndex++) || packs.stab[0];
      }
    } else if (isNade) name = cycleName(packs.throw, this.shootIndex++);
    else if (this.weapon.id === "c4") name = cycleName(packs.button.concat(packs.drop), this.shootIndex++);
    else {
      name = pickShootClip(packs, {
        clip: this.clip,
        shootIndex: this.shootIndex++,
        eliteLeft: this.eliteLeftIndex,
        eliteRight: this.eliteRightIndex,
      });
      if (packs.shootLeft.length || packs.shootRight.length) {
        if (this.clip % 2 === 0) this.eliteLeftIndex += 1;
        else this.eliteRightIndex += 1;
      }
    }
    if (!name) return;
    if (!isKnife && this.weapon.id !== "c4") this.clip = Math.max(0, this.clip - 1);
    this.loadout.rememberAmmo(this.weapon, this.clip, this.reserve);

    if (isNade || this.weapon.id === "c4") {
      this.busy = true;
      this.busyReason = "melee";
    } else {
      this.busy = false;
      this.busyReason = null;
    }

    this.model.play(name, { loop: false, restart: true });
    if (!clipHasMuzzle(this.model.current)) this.sounds.playFire(this.weapon, name);
    this.model.onFinished = () => this.playIdle();

    if (!isKnife && !isNade && this.weapon.id !== "c4") {
      this.combat.fire(this.weapon, now);
      this.fireHitscan(stats);
    } else if (isKnife && !stab) {
      this.fireHitscan(stats);
    }
    this.hud.punch();
    this.squad?.alertAll(this.controls.getObject().position, 520, this.enemyTeam());
  }

  fireHitscan(stats) {
    const pellets = stats.pellets || 1;
    let hitSomething = false;
    const melee = (stats.range || 4000) <= 64;
    for (let i = 0; i < pellets; i++) {
      aimRay(this.camera, this.combat, this.rayOrigin, this.rayDir);
      const hit = this.squad?.hitTest(this.rayOrigin, this.rayDir, stats.range || 4000, this.enemyTeam());
      if (!melee) this.spawnTracer(this.rayOrigin, this.rayDir, hit?.dist || 180);
      if (!hit) continue;
      hitSomething = true;
      const dmg = stats.damage * (hit.headshot ? stats.head : 1);
      const result = hit.enemy.takeDamage(dmg, hit.headshot);
      this.hud.hitMarker?.(hit.headshot);
      if (result?.killed) {
        const pay = this.mission.onKill(hit.headshot);
        this.loadout.addMoney(pay.money);
        this.hud.setStatus(`${hit.headshot ? "Headshot · " : ""}$${pay.money}`);
      }
    }
    if (!hitSomething) this.hud.punch();
    return hitSomething;
  }

  spawnTracer(origin, dir, dist) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      origin.clone(),
      origin.clone().addScaledVector(dir, Math.min(dist, 200)),
    ]);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0.7 }));
    this.world.add(line);
    this.fx.push({ mesh: line, life: 0.06 });
  }

  reload() {
    if (this.startOpen) return;
    if (!this.model || this.mode !== "fps") return;
    if (this.shotgunReload) {
      this.finishShotgunReload();
      return;
    }
    if (this.actionLocked()) return;
    const stats = combatStats(this.weapon);
    if (stats.clip <= 0) return;
    if (this.clip >= stats.clip || this.reserve <= 0) return;
    const packs = this.clips();
    if (stats.shotgun && (packs.insert.length || packs.startReload.length)) {
      this.beginShotgunReload();
      return;
    }
    const empty = this.clip === 0;
    const reloads = packs.reload;
    const name = empty && reloads[1] ? reloads[1] : reloads[0];
    if (!name) return;
    this.busy = true;
    this.busyReason = "reload";
    this.mouseDown = false;
    this.model.play(name, { loop: false });
    this.model.onFinished = () => {
      const needed = stats.clip - this.clip;
      const taken = Math.min(needed, this.reserve);
      this.clip += taken;
      this.reserve -= taken;
      this.eliteLeftIndex = 0;
      this.eliteRightIndex = 0;
      this.shootIndex = 0;
      this.loadout.rememberAmmo(this.weapon, this.clip, this.reserve);
      this.playIdle();
    };
  }

  beginShotgunReload() {
    const packs = this.clips();
    this.busy = true;
    this.busyReason = "reload";
    this.shotgunReload = true;
    const start = packs.startReload[0];
    const insert = packs.insert[0];
    const playInsert = () => {
      if (!this.shotgunReload) return;
      if (this.clip >= combatStats(this.weapon).clip || this.reserve <= 0) {
        this.finishShotgunReload();
        return;
      }
      this.model.play(insert || start, { loop: false, restart: true });
      this.model.onFinished = () => {
        this.clip += 1;
        this.reserve -= 1;
        this.loadout.rememberAmmo(this.weapon, this.clip, this.reserve);
        playInsert();
      };
    };
    if (start) {
      this.model.play(start, { loop: false });
      this.model.onFinished = playInsert;
    } else playInsert();
  }

  finishShotgunReload() {
    const after = this.clips().afterReload[0];
    this.shotgunReload = false;
    if (after) {
      this.model.play(after, { loop: false });
      this.model.onFinished = () => this.playIdle();
    } else this.playIdle();
  }

  toggleSilencer() {
    const packs = this.clips();
    const name = this.silenced ? packs.detachSilencer[0] : packs.addSilencer[0];
    if (!name || this.actionLocked()) return;
    this.busy = true;
    this.busyReason = "silencer";
    this.model.play(name, { loop: false });
    this.model.onFinished = () => {
      this.silenced = !this.silenced;
      this.playIdle();
    };
  }

  enemyTeam() {
    return this.playerTeam === "t" ? "ct" : "t";
  }

  spawnsFor(team) {
    const list = team === "t" ? this.mapSpawns.t : this.mapSpawns.ct;
    if (list?.length) return list.map((s) => s.feet.clone());
    return this.coverPoints;
  }

  setPlayerTeam(team) {
    this.playerTeam = team === "t" ? "t" : "ct";
    this.teamHands = this.playerTeam;
    this.loadout.applyTeamPistol(this.playerTeam);
    if (!this.startOpen) this.spawnPlayer(this.playerTeam);
    this.savePackSettings();
    this.hud?.syncTeam?.(this);
    this.hud?.syncPack?.(this);
  }

  refillRoundAmmo() {
    this.loadout.refillAllAmmo(this.catalog);
    if (this.weapon) {
      const ammo = this.loadout.ammoFor(this.weapon);
      this.clip = ammo.clip;
      this.reserve = ammo.reserve;
      this.shootIndex = 0;
      this.eliteLeftIndex = 0;
      this.eliteRightIndex = 0;
    }
  }

  startMatch() {
    if (!this.startOpen) return;
    this.startOpen = false;
    this.clearDrops();
    this.hud?.setStartOpen?.(false, this);
    this.spawnPlayer(this.playerTeam);
    this.loadout.applyTeamPistol(this.playerTeam);
    this.refillRoundAmmo();
    this.mission.startBuy();
    this.toggleBuyMenu(true);
    this.hud?.setMission?.(this.mission, this.loadout);
    this.hud.setStatus("Buy phase — kit up");
    this.equip(this.loadout.currentId() || (this.playerTeam === "t" ? "glock18" : "usp"), { holster: false });
  }

  toggleBuyMenu(force) {
    if (this.startOpen) return;
    const next = force === undefined ? !this.buyOpen : force;
    if (next && !this.mission.buying()) {
      this.hud.setStatus("Buy menu is only open during the buy phase");
      return;
    }
    this.buyOpen = next;
    if (this.buyOpen) this.controls.unlock();
    this.hud?.setBuyOpen?.(this.buyOpen, this);
  }

  buyWeapon(id) {
    if (!this.mission.buying()) return;
    const weapon = this.weapons().find((w) => w.id === id);
    const result = this.loadout.buyWeapon(weapon);
    if (!result.ok) {
      this.hud.setStatus(result.reason);
      return;
    }
    this.hud.setStatus(`Bought ${weapon.name} — $${this.loadout.money}`);
    this.equip(weapon.id, { holster: false });
    this.hud?.setMission?.(this.mission, this.loadout);
    this.hud?.renderBuyItems?.();
  }

  buyGear(itemId) {
    if (!this.mission.buying()) return;
    const item = EQUIPMENT.find((g) => g.id === itemId);
    if (!item) return;
    const result = this.loadout.buyGear(item, this.catalog);
    if (!result.ok) {
      this.hud.setStatus(result.reason);
      return;
    }
    this.armor = this.loadout.armor;
    if (item.kind === "ammo" && this.weapon) {
      const ammo = this.loadout.ammoFor(this.weapon);
      this.clip = ammo.clip;
      this.reserve = ammo.reserve;
    }
    this.hud.setStatus(`Purchased ${item.name}`);
    this.hud?.setMission?.(this.mission, this.loadout);
    this.hud?.renderBuyItems?.();
  }

  listenPose() {
    this.camera.getWorldDirection(this._dmgFwd);
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
      fx: this._dmgFwd.x,
      fy: this._dmgFwd.y,
      fz: this._dmgFwd.z,
    };
  }

  botFire(enemy, dir, stats, target) {
    const origin = enemy.eye();
    this.sounds.playFire({ id: enemy.weaponId, category: "rifle", stats: {} }, "shoot1", origin, this.listenPose());
    this.squad?.alertAll(enemy.root.position, 520, enemy.team === "ct" ? "t" : "ct");
    const playerPos = this.controls.getObject().position;
    const aimPoint =
      target?.kind === "agent" && target.agent
        ? target.agent.root.position.clone().add(new THREE.Vector3(0, 32, 0))
        : playerPos.clone().add(new THREE.Vector3(0, -10, 0));
    const to = aimPoint.sub(origin);
    const dist = to.length();
    if (dist > 2800 || dist < 1) return;
    to.normalize();
    const wall = this.firstHit(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, dist);
    const travel = wall && wall.distance < dist - 10 ? wall.distance : dist;
    this.spawnTracer(origin, dir, travel);
    if (wall && wall.distance < dist - 10) return;
    const aim = dir.dot(to);
    const vsPlayer = target?.kind !== "agent";
    const need = vsPlayer
      ? dist < 160 ? 0.9 : dist < 480 ? 0.935 : 0.96
      : dist < 180 ? 0.955 : dist < 500 ? 0.975 : 0.986;
    if (aim < need) return;
    let dmg = stats.damage || 28;
    if (vsPlayer) {
      if (aim > 0.992 && Math.random() < 0.08) dmg *= stats.head || 4;
    } else if (aim > 0.996 && Math.random() < 0.22) dmg *= stats.head || 4;
    if (target?.kind === "agent" && target.agent) {
      target.agent.takeDamage(dmg, aim > 0.996);
      return;
    }
    this.hurt(dmg, origin);
  }

  damageAngle(from) {
    if (!from) return 0;
    this.camera.getWorldDirection(this._dmgFwd);
    const tx = from.x - this.camera.position.x;
    const tz = from.z - this.camera.position.z;
    if (tx * tx + tz * tz < 1e-4) return 0;
    return Math.atan2(this._dmgFwd.x * tz - this._dmgFwd.z * tx, this._dmgFwd.x * tx + this._dmgFwd.z * tz);
  }

  playNpcStep(agent) {
    if (!agent?.alive) return;
    this.sounds.playFootstepAt(agent.root.position, this.listenPose());
  }

  hurt(amount, from = null) {
    let dmg = amount;
    if (this.armor > 0) {
      const soak = Math.min(this.armor, dmg * 0.5);
      this.armor -= soak;
      this.loadout.armor = this.armor;
      dmg -= soak * 0.45;
    }
    this.health = Math.max(0, this.health - dmg);
    this.hud.pain?.(from, dmg);
    if (this.health <= 0) this.failMission();
  }

  failMission() {
    const reward = this.mission.fail();
    this.loadout.addMoney(reward.money);
    this.toggleBuyMenu(false);
    this.hud.clearDamage?.();
    this.clearDrops();
    this.hud.setStatus(`Round lost · +$${reward.money}`);
    this.health = 100;
    this.spawnPlayer(this.playerTeam);
    this.squad.clear();
    this.liveSpawned = false;
    this.spawning = false;
    this.roundLive = false;
    this.refillRoundAmmo();
    this.mission.startBuy();
    this.toggleBuyMenu(true);
    this.hud?.setMission?.(this.mission, this.loadout);
  }

  async beginLive() {
    if (this.liveSpawned || this.spawning) return;
    this.spawning = true;
    this.roundLive = false;
    this.liveSpawned = true;
    this.mission.skipBuy();
    this.refillRoundAmmo();
    this.toggleBuyMenu(false);
    this.hud.setStatus("Loading squads…");
    try {
      this.squad.clear();
      const foe = this.enemyTeam();
      await this.squad.spawnSide({
        team: foe,
        count: 7,
        difficulty: this.mission.difficulty,
        makePlayer: () => this.getPlayerTemplate(foe === "t" ? this.tModelId : this.ctModelId),
        spots: this.spawnsFor(foe),
      });
      await this.squad.spawnSide({
        team: this.playerTeam,
        count: 4,
        difficulty: this.mission.difficulty,
        makePlayer: () => this.getPlayerTemplate(this.playerTeam === "t" ? this.tModelId : this.ctModelId),
        spots: this.spawnsFor(this.playerTeam),
        skipFirst: true,
      });
      for (const enemy of this.squad.enemies) this.placeAgent(enemy);
      this.roundLive = true;
      this.hud.setStatus(
        this.playerTeam === "t" ? "Weapons free — hold the site" : "Weapons free — clear the yard"
      );
    } catch (err) {
      console.error(err);
      this.liveSpawned = false;
      this.roundLive = false;
      this.hud.setStatus("Failed to load hostiles");
    } finally {
      this.spawning = false;
    }
    this.hud?.setMission?.(this.mission, this.loadout);
  }

  placeAgent(enemy) {
    const p = enemy.root.position;
    const fromY = (Number.isFinite(p.y) ? p.y : 0) + 80;
    const floor = this.groundY(p.x, p.z, fromY);
    if (Number.isFinite(floor)) p.y = floor + 1;
  }

  completeIfClear() {
    if (!this.mission.live() || this.spawning || !this.roundLive) return;
    if (this.squad.livingTeam(this.enemyTeam()).length) return;
    const reward = this.mission.completeMission();
    this.loadout.addMoney(reward.money);
    this.hud.setStatus(`Round won · +$${reward.money}`);
    this.hud?.setMission?.(this.mission, this.loadout);
    setTimeout(() => {
      this.health = 100;
      this.clearDrops();
      this.spawnPlayer(this.playerTeam);
      this.mission.difficulty = this.mission.difficulty === "easy" ? "normal" : "hard";
      this.liveSpawned = false;
      this.roundLive = false;
      this.spawning = false;
      this.refillRoundAmmo();
      this.mission.startBuy();
      this.toggleBuyMenu(true);
      this.hud?.setMission?.(this.mission, this.loadout);
    }, 2500);
  }

  resolveCollision(pos, radius = 16) {
    if (this.collisionMesh) {
      this.slideAxis(pos, "x", 0, radius);
      this.slideAxis(pos, "z", 0, radius);
      return;
    }
    pos.x = THREE.MathUtils.clamp(pos.x, -110, 110);
    pos.z = THREE.MathUtils.clamp(pos.z, -110, 110);
    for (const box of this.colliders) {
      const cx = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX);
      const cz = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > 0 && d2 < radius * radius) {
        const d = Math.sqrt(d2);
        pos.x += (dx / d) * (radius - d);
        pos.z += (dz / d) * (radius - d);
      } else if (d2 === 0) {
        pos.x += radius;
      }
    }
  }

  agentClearance(pos, dx, dz, dist, radius = 16) {
    const len = Math.hypot(dx, dz);
    if (len < 1e-6 || dist <= 0) return dist;
    dx /= len;
    dz /= len;
    if (!this.collisionMesh) return dist;
    let best = dist;
    for (const y of [pos.y + 36, pos.y + 52]) {
      const hit = this.firstWallHit(pos.x, y, pos.z, dx, 0, dz, dist + radius);
      if (hit) best = Math.min(best, Math.max(0, hit.distance - radius));
    }
    const ahead = Math.min(24, best);
    if (ahead > 8) {
      const fromY = pos.y + 72;
      this._traceFrom.set(pos.x + dx * ahead, fromY, pos.z + dz * ahead);
      this.raycaster.set(this._traceFrom, this._traceDown);
      this.raycaster.far = 160;
      const floors = this.raycaster.intersectObject(this.collisionMesh, false);
      if (floors.length && pos.y - floors[0].point.y > 56) best = Math.min(best, 8);
    }
    return best;
  }

  hasLine(ax, ay, az, bx, by, bz) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 6) return true;
    if (!this.collisionMesh) return true;
    return !this.firstWallHit(ax, ay, az, dx, dy, dz, Math.max(8, dist - 10));
  }

  moveAgent(pos, dx, dz, radius = 18) {
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-8) return 0;
    const nx = dx / dist;
    const nz = dz / dist;
    if (!this.collisionMesh) {
      pos.x += dx;
      pos.z += dz;
      return dist;
    }
    const room = this.agentClearance(pos, nx, nz, dist + 12, radius);
    const go = Math.max(0, Math.min(dist, room - 8));
    pos.x += nx * go;
    pos.z += nz * go;
    const floor = this.groundY(pos.x, pos.z, pos.y + 72);
    if (Number.isFinite(floor)) pos.y = floor + 1;
    return go;
  }

  hullHeights(pos) {
    const feet = pos.y - this.movement.eye;
    return [feet + 16, pos.y - 18, pos.y - 8];
  }

  slideAxis(pos, axis, delta, radius) {
    const sign = Math.sign(delta);
    if (!sign) return Math.abs(delta);
    const heights = this.hullHeights(pos);
    let allowed = Math.abs(delta);
    const dx = axis === "x" ? sign : 0;
    const dz = axis === "z" ? sign : 0;
    const ox = axis === "x" ? 0 : 1;
    const oz = axis === "z" ? 0 : 1;
    const reach = Math.abs(delta) + radius;
    for (const y of heights) {
      for (const off of [0, radius * 0.7, -radius * 0.7]) {
        const hit = this.firstWallHit(pos.x + ox * off, y, pos.z + oz * off, dx, 0, dz, reach);
        if (hit && hit.distance < reach) {
          allowed = Math.min(allowed, Math.max(0, hit.distance - radius));
        }
      }
    }
    pos[axis] += sign * allowed;
    if (allowed + 0.05 < Math.abs(delta)) this.movement.velocity[axis] = 0;
    return allowed;
  }

  depenetrate(pos, radius) {
    const heights = this.hullHeights(pos);
    for (const y of heights) {
      for (const [dx, dz] of this._hullDirs) {
        const hit = this.firstWallHit(pos.x, y, pos.z, dx, 0, dz, radius);
        if (!hit) continue;
        const push = radius - hit.distance + 0.5;
        if (push <= 0) continue;
        pos.x -= dx * push;
        pos.z -= dz * push;
      }
    }
  }

  updateMovement(dt) {
    if (this.mode !== "fps") {
      this.orbit.update();
      return;
    }
    const locked = this.controls.isLocked && !this.buyOpen;
    this.movement.tick(dt, {
      keys: this.keys,
      getForward: (out) => this.controls.getDirection(out),
      weapon: this.weapon,
      locked,
      jump: this.jumpQueued,
      collide: (step) => {
        const pos = this.controls.getObject().position;
        if (this.collisionMesh) {
          const dist = Math.hypot(step.x, step.z);
          if (dist > 0.02) {
            const parts = dist > 18 ? 2 : 1;
            let blocked = false;
            for (let i = 0; i < parts; i++) {
              const sx = step.x / parts;
              const sz = step.z / parts;
              if (this.slideAxis(pos, "x", sx, 16) + 0.05 < Math.abs(sx)) blocked = true;
              if (this.slideAxis(pos, "z", sz, 16) + 0.05 < Math.abs(sz)) blocked = true;
            }
            if (blocked) this.depenetrate(pos, 16);
          }
          pos.y += step.y;
          const floor = this.groundY(pos.x, pos.z, pos.y + 8);
          const want = floor + this.movement.eye;
          const fall = Math.max(6, -this.movement.velocity.y * dt + 2);
          if (!this.movement.didJump && this.movement.velocity.y <= 0 && pos.y <= want + fall) {
            pos.y = want;
            this.movement.land();
          } else if (pos.y > want + fall) {
            this.movement.grounded = false;
            this.movement.airborne = true;
          }
          const ceil = this.firstHit(pos.x, pos.y + 2, pos.z, 0, 1, 0, 10);
          if (ceil && this.movement.velocity.y > 0) {
            this.movement.velocity.y = 0;
          }
        } else {
          pos.x += step.x;
          pos.z += step.z;
          this.resolveCollision(pos);
          pos.y += step.y;
          if (!this.movement.didJump && pos.y <= this.movement.eye) {
            pos.y = this.movement.eye;
            if (this.movement.velocity.y <= 0) this.movement.land();
          } else if (pos.y > this.movement.eye) {
            this.movement.grounded = false;
            this.movement.airborne = true;
          }
        }
      },
    });
    if (this.movement.didJump || !this.keys.has("Space")) this.jumpQueued = false;
    if (!locked) return;
    const moving = this.movement.speed > 18 && this.movement.grounded;
    if (moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.sounds.playFootstep();
        const speed = Math.max(80, this.movement.speed);
        this.stepTimer = Math.max(0.28, 0.28 * (250 / speed));
      }
    } else {
      this.stepTimer = 0;
    }
    this.bob += dt * (moving ? 10 : 2) * (this.movement.crouched ? 0.6 : 1);
    if (this.model && this.mode === "fps") {
      const landKick = this.movement.justLanded && !this.keys.has("Space") ? -0.45 : 0;
      this.model.root.position.x = this.vm.x + Math.cos(this.bob * 0.5) * (moving ? 0.12 : 0.03);
      this.model.root.position.y = this.vm.y + Math.sin(this.bob) * (moving ? 0.22 : 0.05) + landKick;
      this.model.root.position.z = this.vm.z;
    }
    this.combat.tick(dt, {
      moving,
      crouched: this.movement.crouched,
      airborne: this.movement.airborne,
      landed: this.movement.justLanded,
      walking: this.movement.walking,
      weapon: this.weapon,
    });
    if (this.movement.justLanded) this.combat.inaccuracy += 4;
  }

  tickFx(dt) {
    this.fx = this.fx.filter((item) => {
      item.life -= dt;
      if (item.life <= 0) {
        item.mesh.removeFromParent();
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        return false;
      }
      item.mesh.material.opacity = Math.max(0, item.life * 10);
      return true;
    });
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const wasBuy = this.mission.phase;
      this.mission.tick(dt);
      if (wasBuy === "buy" && this.mission.live()) this.beginLive();
      if (this.mouseDown && this.weapon && (combatStats(this.weapon).auto || this.weapon.category === "melee")) this.attack();
      this.model?.update(dt);
      this.playerPreview?.update(dt);
      this.updateMovement(dt);
      this.tickDrops(dt);
      if (this.mission.live() && this.roundLive) {
        const playerPos = this.controls.getObject().position;
        this.squad.tick(dt, {
          playerPos,
          playerTeam: this.playerTeam,
          now: performance.now() / 1000,
          cover: this.coverPoints,
          nav: {
            move: (pos, dx, dz) => this.moveAgent(pos, dx, dz),
            clearance: (pos, dx, dz, dist) => this.agentClearance(pos, dx, dz, dist),
            ground: (x, z, y) => this.groundY(x, z, y),
            los: (ax, ay, az, bx, by, bz) => this.hasLine(ax, ay, az, bx, by, bz),
          },
          onShoot: (enemy, dir, stats, target) => this.botFire(enemy, dir, stats, target),
          onStep: (agent) => this.playNpcStep(agent),
        });
        this.completeIfClear();
      }
      this.tickFx(dt);
      this.hud.sync(this);
      this.renderer.clear();
      this._lookEuler.setFromQuaternion(this.camera.quaternion, "YXZ");
      const yaw = this._lookEuler.y;
      const pitch = this._lookEuler.x;
      this._lookEuler.set(
        pitch + THREE.MathUtils.degToRad(this.combat.punch.x),
        yaw + THREE.MathUtils.degToRad(this.combat.punch.y),
        0,
        "YXZ"
      );
      this.camera.quaternion.setFromEuler(this._lookEuler);
      if (this.mode === "inspect") {
        this.renderer.render(this.world, this.inspectCamera);
      } else {
        this.renderer.render(this.world, this.camera);
        if (this.model) {
          this.renderer.clearDepth();
          this.renderer.render(this.viewScene, this.viewCamera);
        }
      }
      this._lookEuler.set(pitch, yaw, 0, "YXZ");
      this.camera.quaternion.setFromEuler(this._lookEuler);
    };
    loop();
  }
}
