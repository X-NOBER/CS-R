import * as THREE from "three";
import { combatStats } from "./WeaponStats.js";

export class CombatState {
  constructor() {
    this.punch = new THREE.Vector2();
    this.punchVel = new THREE.Vector2();
    this.spray = 0;
    this.inaccuracy = 0;
    this.nextShot = 0;
    this.lastShot = -999;
    this.recoveryDelay = 0.22;
  }

  tick(dt, { moving, crouched, airborne, landed, walking, weapon }) {
    const stats = combatStats(weapon || { category: "pistol", stats: {} });
    const rec = stats.recovery ?? 0.3;
    this.punchVel.x -= this.punch.x * 18 * rec * dt;
    this.punchVel.y -= this.punch.y * 18 * rec * dt;
    this.punchVel.multiplyScalar(Math.max(0, 1 - dt * 14 * rec));
    this.punch.addScaledVector(this.punchVel, dt);
    if (this.punch.length() < 0.01 && this.punchVel.length() < 0.01) this.punch.set(0, 0);

    if (performance.now() / 1000 - this.lastShot > this.recoveryDelay + rec) {
      this.spray = Math.max(0, this.spray - dt * 18);
    }

    const acc = stats.inaccuracy || { stand: 0.4, crouch: 0.2, move: 2, jump: 10 };
    let inacc = crouched ? acc.crouch : acc.stand;
    if (moving && !crouched) inacc += walking ? acc.move * 0.45 : acc.move;
    if (airborne) inacc += acc.jump;
    if (landed) inacc += acc.jump * 0.55;
    inacc += this.spray * 0.08;
    this.inaccuracy += (inacc - this.inaccuracy) * Math.min(1, dt * 10);
    return this.inaccuracy;
  }

  canFire(now, auto) {
    return now >= this.nextShot;
  }

  noteMelee(now, stab) {
    this.nextShot = now + (stab ? 0.95 : 0.4);
    this.lastShot = now;
  }

  fire(weapon, now) {
    const stats = combatStats(weapon);
    const rpm = Math.max(40, stats.rpm || (stats.auto ? 600 : 180));
    this.nextShot = now + 60 / rpm;
    this.lastShot = now;
    const shot = Math.min(this.spray | 0, (stats.pattern?.length || 1) - 1);
    const kick = stats.pattern?.[shot] || [0.6, 0];
    this.punchVel.x -= kick[0];
    this.punchVel.y += kick[1];
    this.spray += 1;
    this.recoveryDelay = stats.auto ? 0.18 : 0.28;
    return { stats, shot };
  }

  spreadRadians() {
    return THREE.MathUtils.degToRad(this.inaccuracy * 0.35);
  }

  resetSpray() {
    this.spray = 0;
  }
}

export function aimRay(camera, combat, origin, direction) {
  camera.getWorldDirection(direction);
  origin.copy(camera.position);
  const spread = combat.spreadRadians();
  if (spread > 0) {
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(direction, up).normalize();
    const trueUp = new THREE.Vector3().crossVectors(right, direction).normalize();
    const yaw = (Math.random() * 2 - 1) * spread;
    const pitch = (Math.random() * 2 - 1) * spread;
    direction.addScaledVector(right, yaw).addScaledVector(trueUp, pitch).normalize();
  }
  direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(combat.punch.y));
  const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
  if (right.lengthSq() > 0.01) direction.applyAxisAngle(right, THREE.MathUtils.degToRad(combat.punch.x));
  direction.normalize();
}
