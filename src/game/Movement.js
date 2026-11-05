import * as THREE from "three";
import { combatStats } from "./WeaponStats.js";

const UP = new THREE.Vector3(0, 1, 0);

export class MovementController {
  constructor() {
    this.velocity = new THREE.Vector3();
    this.grounded = true;
    this.crouched = false;
    this.walking = false;
    this.airborne = false;
    this.justLanded = false;
    this.didJump = false;
    this.speed = 0;
    this.eye = 64;
    this.standEye = 64;
    this.crouchEye = 42;
    this.gravity = 800;
    this.jumpSpeed = 268.3;
    this.friction = 4;
    this.stopspeed = 80;
    this.groundAccel = 5.5;
    this.airAccel = 12;
    this.airCap = 30;
    this.jumpBuffer = 0;
  }

  wishFromInput(keys, getForward) {
    const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
    const side = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const look = new THREE.Vector3();
    getForward(look);
    look.y = 0;
    if (look.lengthSq() < 1e-6) look.set(0, 0, -1);
    look.normalize();
    const right = new THREE.Vector3().crossVectors(look, UP).normalize();
    const wish = new THREE.Vector3();
    wish.addScaledVector(look, forward);
    wish.addScaledVector(right, side);
    if (wish.lengthSq() > 1) wish.normalize();
    return wish;
  }

  maxSpeed(weapon, { walk, crouch }) {
    const stats = combatStats(weapon || { category: "melee", stats: {} });
    let speed = stats.speed || 250;
    if (crouch) speed *= 0.34;
    else if (walk) speed *= 0.52;
    return speed;
  }

  accelerate(wishDir, wishSpeed, accel, dt) {
    const current = this.velocity.dot(wishDir);
    const add = wishSpeed - current;
    if (add <= 0) return;
    const acc = Math.min(add, accel * wishSpeed * dt);
    this.velocity.addScaledVector(wishDir, acc);
  }

  airAccelerate(wishDir, wishSpeed, dt) {
    const wishspd = Math.min(wishSpeed, this.airCap);
    const current = this.velocity.dot(wishDir);
    const add = wishspd - current;
    if (add <= 0) return;
    const acc = Math.min(add, this.airAccel * wishSpeed * dt);
    this.velocity.addScaledVector(wishDir, acc);
  }

  applyFriction(dt) {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed < 1) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      return;
    }
    const control = Math.max(speed, this.stopspeed);
    const drop = control * this.friction * dt;
    const next = Math.max(speed - drop, 0) / speed;
    this.velocity.x *= next;
    this.velocity.z *= next;
  }

  tick(dt, { keys, getForward, weapon, locked, collide, jump }) {
    this.justLanded = false;
    this.didJump = false;
    if (!locked) {
      this.jumpBuffer = 0;
      this.speed = Math.hypot(this.velocity.x, this.velocity.z);
      return this;
    }
    this.walking = keys.has("ShiftLeft") || keys.has("ShiftRight");
    this.crouched = keys.has("ControlLeft") || keys.has("ControlRight");
    const targetEye = this.crouched ? this.crouchEye : this.standEye;
    this.eye += (targetEye - this.eye) * Math.min(1, dt * 14);

    if (jump || keys.has("Space")) this.jumpBuffer = 0.12;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    const wish = this.wishFromInput(keys, getForward);
    const max = this.maxSpeed(weapon, { walk: this.walking, crouch: this.crouched });
    const stats = combatStats(weapon || { category: "melee", stats: {} });
    const accelMul = stats.accel ?? 1;
    const wishSpeed = wish.lengthSq() > 0 ? max : 0;

    if (this.grounded && this.jumpBuffer > 0) {
      this.velocity.y = this.jumpSpeed;
      this.grounded = false;
      this.airborne = true;
      this.didJump = true;
      this.jumpBuffer = 0;
    }

    if (this.grounded) {
      this.applyFriction(dt);
      if (wishSpeed > 0) this.accelerate(wish, wishSpeed, this.groundAccel * accelMul, dt);
    } else {
      this.velocity.y -= this.gravity * dt;
      if (wishSpeed > 0) this.airAccelerate(wish, wishSpeed, dt);
    }

    const step = this.velocity.clone().multiplyScalar(dt);
    collide?.(step, this);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    return this;
  }

  land() {
    if (this.didJump) return;
    if (!this.grounded) {
      this.justLanded = true;
      this.velocity.y = 0;
    }
    this.grounded = true;
    this.airborne = false;
  }
}
