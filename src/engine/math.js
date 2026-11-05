import * as THREE from "three";

/** GoldSrc AngleQuaternion — angles are XYZ Euler in radians. */
export function goldSrcQuat(rx, ry, rz, target = new THREE.Quaternion()) {
  const cx = Math.cos(rx * 0.5);
  const sx = Math.sin(rx * 0.5);
  const cy = Math.cos(ry * 0.5);
  const sy = Math.sin(ry * 0.5);
  const cz = Math.cos(rz * 0.5);
  const sz = Math.sin(rz * 0.5);
  target.set(
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz
  );
  return target;
}

/**
 * GoldSrc (X right, Y forward, Z up) → Three.js (X right, Y up, Z toward camera).
 * Position (x, y, z) → (x, z, -y). Quaternion (x, y, z, w) → (x, z, -y, w).
 */
export function toThreePos(x, y, z, target = new THREE.Vector3()) {
  return target.set(x, z, -y);
}

export function toThreeQuat(q, target = new THREE.Quaternion()) {
  return target.set(q.x, q.z, -q.y, q.w);
}

export function goldSrcLocalMatrix(px, py, pz, rx, ry, rz, target = new THREE.Matrix4()) {
  const quat = goldSrcQuat(rx, ry, rz);
  toThreeQuat(quat, quat);
  const pos = toThreePos(px, py, pz);
  return target.compose(pos, quat, new THREE.Vector3(1, 1, 1));
}

export function boneWorldMatrices(bones, pose) {
  const worlds = new Array(bones.length);
  const local = new THREE.Matrix4();
  for (let i = 0; i < bones.length; i++) {
    const p = pose[i];
    goldSrcLocalMatrix(p.pos[0], p.pos[1], p.pos[2], p.rot[0], p.rot[1], p.rot[2], local);
    if (bones[i].parent >= 0) {
      worlds[i] = worlds[bones[i].parent].clone().multiply(local);
    } else {
      worlds[i] = local.clone();
    }
  }
  return worlds;
}
