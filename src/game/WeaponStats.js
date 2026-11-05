/** CS2-inspired combat, weight, and economy overlay. Merged at runtime; does not replace weapons.json. */

function pattern(shots, rise, sway, settle = 0.55) {
  const out = [];
  for (let i = 0; i < shots; i++) {
    const t = i / Math.max(1, shots - 1);
    const up = rise * Math.min(1, 0.28 + i * 0.14) * (1 - t * settle * 0.35);
    const side = Math.sin(i * 0.73 + 0.4) * sway * Math.min(1, i / 5);
    out.push([up, side]);
  }
  return out;
}

const CATEGORY_DEFAULTS = {
  melee: { weight: 0.5, price: 0, speed: 250, accel: 1, switch: 0.35, rpm: 0, inaccuracy: { stand: 0, crouch: 0, move: 0, jump: 0 }, recovery: 1, head: 1, armor: 0.85, pen: 0, pellets: 1, range: 48, slot: "melee" },
  pistol: { weight: 1.1, price: 300, speed: 240, accel: 1, switch: 0.4, rpm: 400, inaccuracy: { stand: 0.35, crouch: 0.22, move: 1.4, jump: 8 }, recovery: 0.28, head: 4, armor: 0.85, pen: 0.4, pellets: 1, range: 4096, slot: "pistol" },
  smg: { weight: 2.4, price: 1250, speed: 235, accel: 0.95, switch: 0.55, rpm: 750, inaccuracy: { stand: 0.55, crouch: 0.35, move: 0.7, jump: 9 }, recovery: 0.22, head: 4, armor: 0.75, pen: 0.45, pellets: 1, range: 4096, slot: "primary" },
  rifle: { weight: 3.5, price: 2700, speed: 221, accel: 0.85, switch: 0.75, rpm: 600, inaccuracy: { stand: 0.28, crouch: 0.16, move: 3.2, jump: 12 }, recovery: 0.32, head: 4, armor: 0.7, pen: 0.85, pellets: 1, range: 8192, slot: "primary" },
  shotgun: { weight: 4.2, price: 1700, speed: 210, accel: 0.75, switch: 0.85, rpm: 70, inaccuracy: { stand: 2.2, crouch: 1.6, move: 3.5, jump: 12 }, recovery: 0.45, head: 2, armor: 0.5, pen: 0.3, pellets: 8, range: 1200, slot: "primary" },
  sniper: { weight: 5.5, price: 4750, speed: 100, accel: 0.55, switch: 1.1, rpm: 41, inaccuracy: { stand: 0.08, crouch: 0.04, move: 18, jump: 24 }, recovery: 0.9, head: 4, armor: 0.7, pen: 0.97, pellets: 1, range: 8192, slot: "primary" },
  lmg: { weight: 8.5, price: 5200, speed: 195, accel: 0.5, switch: 1.35, rpm: 750, inaccuracy: { stand: 0.7, crouch: 0.45, move: 4.5, jump: 14 }, recovery: 0.4, head: 4, armor: 0.7, pen: 0.8, pellets: 1, range: 8192, slot: "primary" },
  equip: { weight: 0.4, price: 300, speed: 245, accel: 1, switch: 0.4, rpm: 0, inaccuracy: { stand: 0, crouch: 0, move: 0, jump: 0 }, recovery: 1, head: 1, armor: 1, pen: 0, pellets: 1, range: 64, slot: "grenade" },
  shield: { weight: 6, price: 1000, speed: 200, accel: 0.6, switch: 1, rpm: 400, inaccuracy: { stand: 0.5, crouch: 0.3, move: 2, jump: 10 }, recovery: 0.3, head: 4, armor: 0.8, pen: 0.4, pellets: 1, range: 4096, slot: "primary" },
};

const TABLE = {
  knife: { weight: 0.5, price: 0, speed: 250, rpm: 0, damage: 65, killReward: 1500 },
  knife_r: { weight: 0.5, price: 0, speed: 250, rpm: 0, damage: 65, killReward: 1500 },
  shield_knife: { weight: 0.6, price: 0, speed: 240, rpm: 0, damage: 65, killReward: 1500 },

  glock18: { weight: 0.9, price: 200, speed: 240, rpm: 400, damage: 25, killReward: 300, pattern: pattern(20, 0.55, 0.18) },
  usp: { weight: 1.0, price: 200, speed: 240, rpm: 352, damage: 33, killReward: 300, pattern: pattern(12, 0.5, 0.12) },
  p228: { weight: 1.0, price: 300, speed: 240, rpm: 400, damage: 32, killReward: 300, pattern: pattern(13, 0.62, 0.16) },
  fiveseven: { weight: 0.85, price: 500, speed: 240, rpm: 400, damage: 31, killReward: 300, pattern: pattern(20, 0.48, 0.14) },
  elite: { weight: 1.5, price: 300, speed: 240, rpm: 375, damage: 38, killReward: 300, pattern: pattern(15, 0.7, 0.22) },
  deagle: { weight: 2.0, price: 700, speed: 230, rpm: 267, damage: 53, killReward: 300, pattern: pattern(7, 1.6, 0.35, 0.2), inaccuracy: { stand: 0.4, crouch: 0.22, move: 4.2, jump: 12 } },

  mac10: { weight: 2.1, price: 1050, speed: 240, rpm: 800, damage: 28, killReward: 600, pattern: pattern(30, 0.85, 0.55) },
  tmp: { weight: 1.9, price: 1250, speed: 245, rpm: 857, damage: 20, killReward: 600, pattern: pattern(30, 0.7, 0.4) },
  mp5: { weight: 2.5, price: 1500, speed: 235, rpm: 750, damage: 26, killReward: 600, pattern: pattern(30, 0.72, 0.42) },
  ump45: { weight: 2.5, price: 1200, speed: 230, rpm: 571, damage: 29, killReward: 600, pattern: pattern(25, 0.8, 0.38) },
  p90: { weight: 2.8, price: 2350, speed: 230, rpm: 857, damage: 22, killReward: 300, pattern: pattern(50, 0.65, 0.5) },

  m3: { weight: 4.0, price: 1700, speed: 220, rpm: 68, damage: 22, pellets: 9, killReward: 900, shotgun: true, pattern: pattern(8, 1.8, 0.2) },
  xm1014: { weight: 4.3, price: 2000, speed: 215, rpm: 240, damage: 16, pellets: 6, killReward: 900, shotgun: true, pattern: pattern(7, 1.4, 0.25) },

  famas: { weight: 3.3, price: 2050, speed: 220, rpm: 666, damage: 30, killReward: 300, pattern: pattern(25, 0.7, 0.32) },
  galil: { weight: 3.4, price: 1800, speed: 215, rpm: 666, damage: 30, killReward: 300, pattern: pattern(35, 0.78, 0.4) },
  m4a1: { weight: 3.4, price: 3100, speed: 225, rpm: 666, damage: 33, killReward: 300, pattern: pattern(30, 0.62, 0.28) },
  ak47: { weight: 3.6, price: 2700, speed: 215, rpm: 600, damage: 36, killReward: 300, pattern: pattern(30, 0.95, 0.55) },
  aug: { weight: 3.8, price: 3300, speed: 220, rpm: 666, damage: 32, killReward: 300, pattern: pattern(30, 0.58, 0.25) },
  sg552: { weight: 3.7, price: 3000, speed: 210, rpm: 666, damage: 33, killReward: 300, pattern: pattern(30, 0.7, 0.34) },

  scout: { weight: 4.0, price: 1700, speed: 230, rpm: 48, damage: 75, killReward: 300, inaccuracy: { stand: 0.06, crouch: 0.03, move: 12, jump: 20 } },
  awp: { weight: 6.0, price: 4750, speed: 100, rpm: 41, damage: 115, killReward: 100, inaccuracy: { stand: 0.02, crouch: 0.01, move: 22, jump: 28 } },
  g3sg1: { weight: 5.8, price: 5000, speed: 150, rpm: 240, damage: 80, killReward: 300, pattern: pattern(20, 0.85, 0.3) },
  sg550: { weight: 5.7, price: 4200, speed: 150, rpm: 240, damage: 70, killReward: 300, pattern: pattern(30, 0.8, 0.28) },

  m249: { weight: 9.0, price: 5200, speed: 195, rpm: 750, damage: 32, killReward: 300, pattern: pattern(100, 0.9, 0.7) },

  hegrenade: { weight: 0.4, price: 300, speed: 245, killReward: 300, nade: "he" },
  flashbang: { weight: 0.3, price: 200, speed: 245, killReward: 300, nade: "flash" },
  smokegrenade: { weight: 0.4, price: 300, speed: 245, killReward: 300, nade: "smoke" },
  c4: { weight: 1.2, price: 0, speed: 230, killReward: 0 },
};

export const EQUIPMENT = [
  { id: "vest", name: "Kevlar Vest", price: 650, kind: "armor" },
  { id: "helmet", name: "Kevlar + Helmet", price: 1000, kind: "helmet" },
  { id: "ammo_primary", name: "Primary ammo", price: 60, kind: "ammo", slot: "primary" },
  { id: "ammo_pistol", name: "Pistol ammo", price: 30, kind: "ammo", slot: "pistol" },
];

export const ARSENAL_CATEGORIES = [
  { id: "pistol", label: "Pistols" },
  { id: "smg", label: "SMGs" },
  { id: "shotgun", label: "Shotguns" },
  { id: "rifle", label: "Rifles" },
  { id: "sniper", label: "Snipers" },
  { id: "lmg", label: "Machine Guns" },
  { id: "melee", label: "Melee" },
];

export const BUY_CATEGORIES = [
  { id: "pistol", label: "Pistols" },
  { id: "smg", label: "SMGs" },
  { id: "shotgun", label: "Shotguns" },
  { id: "rifle", label: "Rifles" },
  { id: "sniper", label: "Snipers" },
  { id: "lmg", label: "Machine Guns" },
  { id: "equip", label: "Grenades" },
  { id: "gear", label: "Equipment" },
];

export function combatStats(weapon) {
  const base = CATEGORY_DEFAULTS[weapon.category] || CATEGORY_DEFAULTS.rifle;
  const extra = TABLE[weapon.id] || {};
  const inaccuracy = { ...base.inaccuracy, ...(extra.inaccuracy || {}) };
  return {
    clip: weapon.stats?.clip ?? 0,
    reserve: weapon.stats?.reserve ?? 0,
    auto: Boolean(weapon.stats?.auto),
    damage: extra.damage ?? weapon.stats?.damage ?? 30,
    ...base,
    ...extra,
    inaccuracy,
    pattern: extra.pattern || base.pattern || pattern(30, 0.7, 0.3),
  };
}

export function movementSpeed(weapon, { walk = false, crouch = false } = {}) {
  const stats = combatStats(weapon);
  let speed = stats.speed;
  if (crouch) speed *= 0.34;
  else if (walk) speed *= 0.52;
  return speed;
}

export function speedImpact(weapon) {
  const stats = combatStats(weapon);
  const delta = stats.speed - 250;
  const pct = Math.round((delta / 250) * 100);
  return { speed: stats.speed, delta, pct, weight: stats.weight };
}

export function damageCard(weapon) {
  const stats = combatStats(weapon);
  const pellets = Math.max(1, stats.pellets || 1);
  const body = Math.round(stats.damage);
  const head = Math.round(stats.damage * (stats.head || 1));
  return {
    body,
    head,
    pellets,
    bodyTotal: body * pellets,
    headTotal: head * pellets,
    rpm: stats.rpm,
    clip: stats.clip,
    price: stats.price,
    armor: stats.armor,
  };
}

export function formatHit(value, pellets) {
  return pellets > 1 ? `${value}×${pellets}` : String(value);
}

export function isArsenalGun(weapon) {
  if (!weapon) return false;
  if (weapon.id.startsWith("shield")) return false;
  if (weapon.id === "knife_r") return false;
  return ["melee", "pistol", "smg", "shotgun", "rifle", "sniper", "lmg"].includes(weapon.category);
}

export function isBuyable(weapon) {
  if (!weapon) return false;
  if (weapon.id.startsWith("shield")) return false;
  if (weapon.id === "knife" || weapon.id === "knife_r" || weapon.id === "c4") return false;
  return ["pistol", "smg", "shotgun", "rifle", "sniper", "lmg", "equip"].includes(weapon.category);
}

export function worldModelFile(id) {
  const key = String(id || "").replace(/^shield_/, "").replace(/_r$/, "");
  if (!key || key === "knife" || key === "c4" || key === "r") return null;
  return `w_${key}.mdl`;
}

export function canDropWeapon(weapon) {
  if (!weapon) return false;
  if (weapon.category === "melee") return false;
  return Boolean(worldModelFile(weapon.id));
}
