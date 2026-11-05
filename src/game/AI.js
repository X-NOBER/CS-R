import * as THREE from "three";
import { combatStats } from "./WeaponStats.js";
import { cloneStudioModel } from "../engine/StudioModel.js";

function cloneForEnemy(template) {
  return cloneStudioModel(template);
}

const WEAPON_POOL = {
  t: {
    easy: ["glock18", "tmp", "mp5"],
    normal: ["ak47", "galil", "sg552", "deagle", "mp5"],
    hard: ["ak47", "awp", "m249", "sg552", "galil"],
  },
  ct: {
    easy: ["usp", "tmp", "mp5"],
    normal: ["m4a1", "famas", "aug", "usp", "mp5"],
    hard: ["m4a1", "awp", "m249", "aug", "famas"],
  },
};

const PROBE_ANGLES = [0.32, 0.62, 0.95, 1.28, 1.65, 2.05, 2.45];

function rotY(dx, dz, angle, out) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  out.x = dx * c - dz * s;
  out.z = dx * s + dz * c;
  return out;
}

export class Enemy {
  constructor(scene, { position, weaponId, difficulty, cover, studio, team = "t" }) {
    this.health = difficulty === "hard" ? 115 : difficulty === "easy" ? 80 : 100;
    this.armor = difficulty === "easy" ? 0 : 50;
    this.alive = true;
    this.team = team === "ct" ? "ct" : "t";
    this.weaponId = weaponId;
    this.difficulty = difficulty;
    this.cover = cover;
    this.stepTimer = Math.random() * 0.28;
    this.origin = position.clone();
    this.nextShot = 0;
    this.reloadAt = 0;
    this.clip = 20;
    this.alert = 0;
    this.aim = new THREE.Vector3();
    this._eye = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    this._steer = new THREE.Vector3();
    this._probe = new THREE.Vector3();
    this.playerId = studio?.weapon?.id || "leet";
    this.walkSpeed = difficulty === "hard" ? 200 : difficulty === "easy" ? 170 : 185;
    this.runSpeed = difficulty === "hard" ? 240 : difficulty === "easy" ? 215 : 225;
    this.vx = 0;
    this.vz = 0;
    this.moveMode = "push";
    this.moveTimer = 0.2 + Math.random() * 0.4;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.trackingPlayer = false;
    this.acquireAt = 0;
    this.roamTarget = null;
    this.idleTimer = 0;
    this.lookDir = Math.random() < 0.5 ? 1 : -1;
    this.steerSide = Math.random() < 0.5 ? 1 : -1;
    this.heading = Math.random() * Math.PI * 2;
    this.stuckTimer = 0;
    this.lastSeen = null;
    this.state = "roam";

    this.root = new THREE.Group();
    this.root.position.copy(position);
    this.root.rotation.set(0, this.heading, 0);
    this.studio = studio || null;
    if (studio) {
      this.root.add(studio.root);
      studio.play("idle1", { loop: true });
    } else {
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(8, 28, 4, 8),
        new THREE.MeshStandardMaterial({ color: this.team === "ct" ? 0x3a5a88 : 0x6a2a24, roughness: 0.8 })
      );
      body.position.y = 22;
      body.castShadow = true;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(6.2, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xc4a07a, roughness: 0.7 })
      );
      head.position.y = 46;
      head.castShadow = true;
      this.body = body;
      this.head = head;
      this.root.add(body);
      this.root.add(head);
    }
    scene.add(this.root);
  }

  eye() {
    const head = this.studio?.threeBones?.find((b) => /head/i.test(b.name));
    if (head) return head.getWorldPosition(this._eye);
    return this.root.position.clone().add(new THREE.Vector3(0, 64, 0));
  }

  playAnim(name, { loop = true, restart = false } = {}) {
    if (!this.studio) return;
    if (this.studio.play(name, { loop, restart })) return;
    if (name === "walk") this.studio.play("run", { loop, restart });
  }

  pickRoam(coverPoints, nav) {
    const here = this.root.position;
    let bx = -Math.sin(this.heading);
    let bz = -Math.cos(this.heading);
    let best = nav?.clearance ? nav.clearance(here, bx, bz, 140) : 80;
    if (nav?.clearance) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + Math.random() * 0.2;
        const dx = Math.cos(a);
        const dz = Math.sin(a);
        const clear = nav.clearance(here, dx, dz, 140);
        if (clear > best) {
          best = clear;
          bx = dx;
          bz = dz;
        }
      }
    }
    if (best < 16) {
      bx = Math.sin(this.heading);
      bz = Math.cos(this.heading);
      best = Math.max(best, 24);
    }
    const dist = Math.max(22, Math.min(96, best * 0.72));
    const p = here.clone().add(new THREE.Vector3(bx * dist, 0, bz * dist));
    if (nav?.ground) {
      const floor = nav.ground(p.x, p.z, here.y + 72);
      if (Number.isFinite(floor)) p.y = floor;
    }
    return p;
  }

  canSee(playerPos, nav) {
    const pos = this.root.position;
    const dx = playerPos.x - pos.x;
    const dz = playerPos.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 20) return true;
    const { x: fx, z: fz } = this.forward();
    const facing = dist > 0.001 ? (fx * dx + fz * dz) / dist : 1;
    if (facing < 0.42) return false;
    const range = this.difficulty === "easy" ? 900 : 1600;
    if (dist > range) return false;
    if (!nav?.los) return true;
    const eye = this.eye();
    return nav.los(eye.x, eye.y, eye.z, playerPos.x, playerPos.y, playerPos.z);
  }

  faceDir(dx, dz, dt = 1 / 30) {
    if (dx * dx + dz * dz < 1e-4) return;
    const want = Math.atan2(-dz, dx);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += THREE.MathUtils.clamp(diff, -14 * dt, 14 * dt);
    this.applyFacing();
  }

  applyFacing() {
    this.root.rotation.set(0, this.heading, 0);
  }

  faceToward(x, z, dt = 1 / 30) {
    this.faceDir(x - this.root.position.x, z - this.root.position.z, dt);
  }

  steerDir(desX, desZ, dist, nav) {
    const pos = this.root.position;
    const look = Math.min(96, Math.max(40, dist));
    if (!nav?.clearance) {
      this._steer.set(desX, 0, desZ);
      return this._steer;
    }
    const ahead = nav.clearance(pos, desX, desZ, look);
    if (ahead > 18) {
      rotY(desX, desZ, 0.55, this._probe);
      const left = nav.clearance(pos, this._probe.x, this._probe.z, 52);
      rotY(desX, desZ, -0.55, this._probe);
      const right = nav.clearance(pos, this._probe.x, this._probe.z, 52);
      if (left < 24 && right > left + 6) rotY(desX, desZ, -0.5, this._steer);
      else if (right < 24 && left > right + 6) rotY(desX, desZ, 0.5, this._steer);
      else this._steer.set(desX, 0, desZ);
      return this._steer;
    }
    let bestScore = -1e9;
    let bestX = -desX;
    let bestZ = -desZ;
    for (const angle of PROBE_ANGLES) {
      for (const sign of [this.steerSide, -this.steerSide]) {
        rotY(desX, desZ, angle * sign, this._probe);
        const clear = nav.clearance(pos, this._probe.x, this._probe.z, look);
        const score = clear - angle * 22 - (clear < 28 ? 50 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestX = this._probe.x;
          bestZ = this._probe.z;
          if (sign !== this.steerSide && angle > 0.8) this.steerSide = sign;
        }
      }
    }
    rotY(desX, desZ, Math.PI, this._probe);
    const back = nav.clearance(pos, this._probe.x, this._probe.z, 56);
    if (back > 24 && bestScore < back - 10) {
      bestX = this._probe.x;
      bestZ = this._probe.z;
    }
    this._steer.set(bestX, 0, bestZ);
    const len = this._steer.length();
    if (len > 1e-4) this._steer.multiplyScalar(1 / len);
    return this._steer;
  }

  forward() {
    return { x: Math.cos(this.heading), z: -Math.sin(this.heading) };
  }

  groundSpeed() {
    return Math.hypot(this.vx, this.vz);
  }

  wishMove(dt, wishX, wishZ, speed, nav) {
    const pos = this.root.position;
    const spd = Math.hypot(this.vx, this.vz);
    if (spd > 1) {
      const drop = Math.max(spd, 80) * 4 * dt;
      const next = Math.max(spd - drop, 0) / spd;
      this.vx *= next;
      this.vz *= next;
    } else {
      this.vx = 0;
      this.vz = 0;
    }
    const wlen = Math.hypot(wishX, wishZ);
    if (wlen > 1e-4 && speed > 1) {
      const wx = wishX / wlen;
      const wz = wishZ / wlen;
      const current = this.vx * wx + this.vz * wz;
      const add = speed - current;
      if (add > 0) {
        const acc = Math.min(add, 5.5 * speed * dt);
        this.vx += wx * acc;
        this.vz += wz * acc;
      }
    }
    const mx = this.vx * dt;
    const mz = this.vz * dt;
    if (Math.hypot(mx, mz) < 0.02) return;
    const ox = pos.x;
    const oz = pos.z;
    if (nav?.move) nav.move(pos, mx, mz);
    else {
      pos.x += mx;
      pos.z += mz;
    }
    if (Math.abs(pos.x - ox) < Math.abs(mx) * 0.35) this.vx *= 0.12;
    if (Math.abs(pos.z - oz) < Math.abs(mz) * 0.35) this.vz *= 0.12;
  }

  combatMove(dt, sees, dist, nav) {
    this.moveTimer -= dt;
    if (this.moveTimer <= 0) {
      if (!sees) this.moveMode = "push";
      else if (dist < 64) this.moveMode = "fall";
      else if (dist > 560) this.moveMode = Math.random() < 0.72 ? "push" : "peek";
      else this.moveMode = Math.random() < 0.42 ? "hold" : Math.random() < 0.6 ? "peek" : "push";
      this.moveTimer =
        this.moveMode === "hold"
          ? 0.28 + Math.random() * 0.38
          : this.moveMode === "peek"
            ? 0.36 + Math.random() * 0.55
            : this.moveMode === "fall"
              ? 0.32 + Math.random() * 0.28
              : 0.5 + Math.random() * 0.55;
      if (this.moveMode === "peek" && Math.random() < 0.5) this.strafeDir *= -1;
    }
    const { x: fx, z: fz } = this.forward();
    if (this.moveMode === "hold") this.wishMove(dt, 0, 0, 0, nav);
    else if (this.moveMode === "fall") {
      this.wishMove(dt, -fx + fz * this.strafeDir * 0.55, -fz - fx * this.strafeDir * 0.55, this.walkSpeed, nav);
    } else if (this.moveMode === "peek") {
      this.wishMove(
        dt,
        fz * this.strafeDir * 0.88 + fx * 0.18,
        -fx * this.strafeDir * 0.88 + fz * 0.18,
        this.walkSpeed * 0.9,
        nav
      );
    } else this.wishMove(dt, fx, fz, this.runSpeed, nav);
  }

  advance(dt, nav, speed) {
    const pos = this.root.position;
    const look = 56;
    let bestOff = 0;
    let bestScore = -1e9;
    const offsets = [0, 0.4, -0.4, 0.85, -0.85, 1.3, -1.3, 1.9, -1.9, 2.5, -2.5];
    for (const off of offsets) {
      const h = this.heading + off;
      const fx = Math.cos(h);
      const fz = -Math.sin(h);
      const clear = nav?.clearance ? nav.clearance(pos, fx, fz, look) : look;
      const bias = off === 0 || Math.sign(off) === this.steerSide ? 8 : 0;
      const score = clear - Math.abs(off) * 18 + bias;
      if (score > bestScore) {
        bestScore = score;
        bestOff = off;
      }
    }
    if (bestOff !== 0) this.steerSide = Math.sign(bestOff);
    this.heading += bestOff;
    while (this.heading > Math.PI) this.heading -= Math.PI * 2;
    while (this.heading < -Math.PI) this.heading += Math.PI * 2;
    const { x: fx, z: fz } = this.forward();
    const room = nav?.clearance ? nav.clearance(pos, fx, fz, 40) : 40;
    if (room > 18) {
      this.wishMove(dt, fx, fz, speed, nav);
      this.stuckTimer = 0;
    } else {
      this.wishMove(dt, 0, 0, 0, nav);
      this.stuckTimer += dt;
      this.heading += this.steerSide * 0.45;
      if (this.stuckTimer > 0.35) {
        this.steerSide *= -1;
        this.stuckTimer = 0;
      }
    }
    this.applyFacing();
  }

  turnToward(x, z, dt) {
    this.faceDir(x - this.root.position.x, z - this.root.position.z, dt);
  }

  steerToward(target, speed, dt, nav, { faceMove = true } = {}) {
    const pos = this.root.position;
    this._wish.set(target.x - pos.x, 0, target.z - pos.z);
    const dist = this._wish.length();
    if (dist < 8) return dist;
    this._wish.multiplyScalar(1 / dist);
    const dir = this.steerDir(this._wish.x, this._wish.z, dist, nav);
    let step = Math.min(dist, speed * dt);
    if (nav?.clearance) {
      const room = nav.clearance(pos, dir.x, dir.z, Math.max(36, step + 16));
      if (room < 10) step = Math.min(step, 0.2);
      else step = Math.min(step, Math.max(step * 0.45, room - 4));
    }
    const ox = pos.x;
    const oz = pos.z;
    if (step < 0.4) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 0.35 && this.stuckTimer - dt <= 0.35) this.steerSide *= -1;
      if (nav?.move) nav.move(pos, -this._wish.x * speed * dt * 0.55, -this._wish.z * speed * dt * 0.55);
      if (faceMove) this.faceDir(dir.x, dir.z, dt);
      return dist;
    }
    if (nav?.move) nav.move(pos, dir.x * step, dir.z * step);
    else pos.addScaledVector(dir, step);
    const moved = Math.hypot(pos.x - ox, pos.z - oz);
    if (moved < step * 0.25) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 0.4 && this.stuckTimer - dt <= 0.4) this.steerSide *= -1;
    } else {
      this.stuckTimer = 0;
    }
    if (faceMove) this.faceDir(dir.x, dir.z, dt);
    return dist;
  }

  takeDamage(amount, headshot) {
    if (!this.alive) return false;
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.5);
      this.armor -= absorbed;
      dmg -= absorbed * 0.5;
    }
    this.health -= dmg;
    this.alert = 4;
    this.state = "combat";
    if (this.health <= 0) {
      this.alive = false;
      this.state = "dead";
      this.root.visible = false;
      return { killed: true, headshot };
    }
    return { killed: false, headshot };
  }

  dispose(scene) {
    this.studio?.root.removeFromParent();
    scene.remove(this.root);
  }
}

export class Squad {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.cover = [];
  }

  setCover(points) {
    this.cover = points;
  }

  async spawnSide({ team = "t", count, difficulty = "normal", makePlayer, spots, skipFirst = false }) {
    const pool = WEAPON_POOL[team]?.[difficulty] || WEAPON_POOL[team]?.normal || WEAPON_POOL.t.normal;
    let template = null;
    try {
      template = await makePlayer?.();
    } catch (err) {
      console.warn("Player model load failed, using capsules", err);
    }
    const points = spots?.length ? spots : this.cover;
    const start = skipFirst && points.length > 1 ? 1 : 0;
    for (let i = 0; i < count; i++) {
      const cover =
        points[(start + i) % Math.max(1, points.length)] || new THREE.Vector3((i - count / 2) * 28, 0, team === "ct" ? 70 : -70);
      const jitter = new THREE.Vector3((Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 12);
      const pos = cover.clone ? cover.clone().add(jitter) : new THREE.Vector3(cover.x, cover.y, cover.z).add(jitter);
      const weaponId = pool[i % pool.length];
      const studio = template ? cloneForEnemy(template) : null;
      this.enemies.push(new Enemy(this.scene, { position: pos, weaponId, difficulty, cover, studio, team }));
    }
  }

  livingTeam(team) {
    return this.enemies.filter((e) => e.alive && e.team === team);
  }

  clear() {
    for (const e of this.enemies) e.dispose(this.scene);
    this.enemies = [];
  }

  living() {
    return this.enemies.filter((e) => e.alive);
  }

  hitTest(origin, dir, maxDist = 4000, team = null) {
    let best = null;
    let bestDist = maxDist;
    const ray = new THREE.Ray(origin, dir);
    for (const enemy of this.living()) {
      if (team && enemy.team !== team) continue;
      const head = enemy.eye();
      const toHead = head.distanceTo(origin);
      if (toHead < bestDist && ray.distanceSqToPoint(head) <= 6.2 * 6.2) {
        best = { enemy, headshot: true, point: head, dist: toHead };
        bestDist = toHead;
        continue;
      }
      const body = enemy.root.position.clone().add(new THREE.Vector3(0, 32, 0));
      const toBody = body.distanceTo(origin);
      if (toBody < bestDist && ray.distanceSqToPoint(body) <= 12 * 12) {
        best = { enemy, headshot: false, point: body, dist: toBody };
        bestDist = toBody;
      }
    }
    return best;
  }

  alertAll(origin, radius = 180, team = null) {
    for (const e of this.living()) {
      if (team && e.team !== team) continue;
      if (e.root.position.distanceTo(origin) < radius) {
        e.alert = 5;
        e.lastSeen = origin.clone();
        e.state = "combat";
      }
    }
  }

  pickTarget(e, playerPos, playerTeam, nav) {
    let best = null;
    let bestDist = 1e9;
    const consider = (kind, pos, agent, dist) => {
      if (dist >= bestDist) return;
      if (!e.canSee(pos, nav)) return;
      bestDist = dist;
      best = { kind, pos, agent, dist };
    };
    if (e.team !== playerTeam) {
      const dist = Math.hypot(playerPos.x - e.root.position.x, playerPos.z - e.root.position.z);
      consider("player", playerPos, null, dist);
    }
    for (const other of this.living()) {
      if (other === e || other.team === e.team) continue;
      const pos = other.eye();
      const dist = Math.hypot(pos.x - e.root.position.x, pos.z - e.root.position.z);
      consider("agent", pos, other, dist);
    }
    return best;
  }

  tick(dt, { playerPos, playerTeam = "ct", now, onShoot, onStep, nav }) {
    for (const e of this.living()) {
      const ox = e.root.position.x;
      const oz = e.root.position.z;
      e.studio?.update(dt);

      if (e.alert > 0) e.alert -= dt;
      const target = this.pickTarget(e, playerPos, playerTeam, nav);
      const sees = Boolean(target);
      const dist = target?.dist ?? Math.hypot(playerPos.x - e.root.position.x, playerPos.z - e.root.position.z);
      if (sees) {
        e.alert = Math.max(e.alert, 3.2);
        if (!e.lastSeen) e.lastSeen = target.pos.clone();
        else e.lastSeen.copy(target.pos);
        e.lastSeen.y = e.root.position.y;
        e.state = "combat";
      } else if (e.state === "combat" && e.alert <= 0 && !e.lastSeen) {
        e.state = "roam";
        e.roamTarget = null;
        e.idleTimer = 0.4 + Math.random();
      }

      const vsPlayer = target?.kind === "player";
      if (vsPlayer) {
        if (!e.trackingPlayer) {
          e.trackingPlayer = true;
          const react = e.difficulty === "hard" ? 0.32 : e.difficulty === "easy" ? 0.7 : 0.48;
          e.acquireAt = now + react + Math.random() * 0.28;
        }
      } else if (!sees) {
        e.trackingPlayer = false;
      }

      if (e.state === "combat") {
        const goal = sees ? target.pos : e.lastSeen || playerPos;
        e.turnToward(goal.x, goal.z, dt);
        e.combatMove(dt, sees, dist, nav);
        e.applyFacing();
        if (!sees && e.lastSeen && (e.root.position.distanceTo(e.lastSeen) < 20 || e.stuckTimer > 0.8)) {
          e.lastSeen = null;
          if (e.alert <= 0) {
            e.state = "roam";
            e.stuckTimer = 0;
          }
        }

        const moving = e.groundSpeed() > 40;
        if (!/shoot/i.test(e.studio?.current?.name || "")) {
          e.playAnim(moving ? (e.moveMode === "push" ? "run" : "walk") : "ref_aim_carbine", { loop: true, restart: false });
        }
        const ready = !vsPlayer || (now >= e.acquireAt && e.moveMode !== "push");
        if (now >= e.nextShot && sees && dist < 2000 && ready) {
          const eye = e.eye();
          const stats = combatStats({ id: e.weaponId, category: "rifle", stats: { auto: true, damage: 28 } });
          const delay = 60 / Math.max(80, (stats.rpm || 400) * (e.difficulty === "hard" ? 0.5 : 0.32));
          e.nextShot = now + delay + Math.random() * (vsPlayer ? 0.28 : 0.16);
          e.clip -= 1;
          const accuracy = vsPlayer
            ? (e.difficulty === "hard" ? 0.12 : e.difficulty === "easy" ? 0.22 : 0.17) + dist * 0.00012 + (moving ? 0.06 : 0)
            : (e.difficulty === "hard" ? 0.04 : 0.07) + dist * 0.00005;
          const aimAt = target.pos.clone();
          if (vsPlayer) aimAt.y -= 8;
          const dir = aimAt.sub(eye).normalize();
          dir.x += (Math.random() * 2 - 1) * accuracy;
          dir.y += (Math.random() * 2 - 1) * accuracy * 0.6;
          dir.z += (Math.random() * 2 - 1) * accuracy;
          dir.normalize();
          onShoot?.(e, dir, stats, target);
          e.playAnim("ref_shoot_carbine", { loop: false, restart: true });
          if (e.studio) e.studio.onFinished = () => e.playAnim("ref_aim_carbine", { loop: true });
          if (e.clip <= 0) {
            e.state = "reload";
            e.reloadAt = now + 2.2;
          }
        }
      } else if (e.state === "reload") {
        e.wishMove(dt, 0, 0, 0, nav);
        if (sees) e.faceToward(target.pos.x, target.pos.z, dt);
        e.playAnim("ref_reload_carbine", { loop: false, restart: false });
        if (now >= e.reloadAt) {
          e.clip = 20;
          e.state = "combat";
        }
      } else if (e.state === "idle") {
        e.wishMove(dt, 0, 0, 0, nav);
        e.playAnim("idle1", { loop: true, restart: false });
        e.heading += dt * 0.7 * e.lookDir;
        e.applyFacing();
        e.idleTimer -= dt;
        if (e.idleTimer <= 0) {
          e.state = "roam";
          e.lookDir *= -1;
        }
      } else {
        e.advance(dt, nav, e.walkSpeed);
        e.playAnim(e.groundSpeed() > 30 ? "walk" : "idle1", { loop: true, restart: false });
        e.idleTimer -= dt;
        if (e.idleTimer < -3.5 - Math.random()) {
          e.state = "idle";
          e.idleTimer = 0.4 + Math.random() * 0.6;
        }
      }

      const moved = Math.hypot(e.root.position.x - ox, e.root.position.z - oz);
      if (moved > 0.35) {
        e.stepTimer -= dt;
        if (e.stepTimer <= 0) {
          onStep?.(e);
          const speed = Math.max(80, e.groundSpeed() || e.walkSpeed);
          e.stepTimer = Math.max(0.28, 0.28 * (250 / speed));
        }
      } else {
        e.stepTimer = 0;
      }
    }
  }
}
