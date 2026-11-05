import { combatStats, EQUIPMENT, isBuyable } from "./WeaponStats.js";

const SAVE_KEY = "csriot.campaign";

export class Loadout {
  constructor() {
    this.money = 800;
    this.armor = 0;
    this.helmet = false;
    this.owned = new Set(["knife", "usp"]);
    this.slots = { primary: null, pistol: "usp", melee: "knife", grenade: null };
    this.ammo = {};
    this.active = "pistol";
    this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!saved) return;
      if (Number.isFinite(saved.money)) this.money = saved.money;
      if (Number.isFinite(saved.armor)) this.armor = saved.armor;
      this.helmet = Boolean(saved.helmet);
      if (Array.isArray(saved.owned)) this.owned = new Set(saved.owned);
      if (saved.slots) this.slots = { ...this.slots, ...saved.slots };
      if (saved.ammo) this.ammo = saved.ammo;
      if (saved.active) this.active = saved.active;
      this.owned = new Set(Object.values(this.slots).filter(Boolean));
    } catch {
      /* keep defaults */
    }
  }

  save() {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        money: this.money,
        armor: this.armor,
        helmet: this.helmet,
        owned: [...this.owned],
        slots: this.slots,
        ammo: this.ammo,
        active: this.active,
      })
    );
  }

  rememberAmmo(weapon, clip, reserve) {
    if (!weapon) return;
    this.ammo[weapon.id] = { clip, reserve };
    this.save();
  }

  ammoFor(weapon) {
    if (!weapon) return { clip: 0, reserve: 0 };
    if (this.ammo[weapon.id]) return this.ammo[weapon.id];
    const stats = combatStats(weapon);
    return { clip: stats.clip, reserve: stats.reserve };
  }

  refillAllAmmo(catalog) {
    const weapons = catalog?.weapons || [];
    const ids = new Set([...this.owned, ...Object.values(this.slots).filter(Boolean), ...Object.keys(this.ammo)]);
    for (const id of ids) {
      const weapon = weapons.find((w) => w.id === id) || { id };
      const stats = combatStats(weapon);
      if (!stats.clip) continue;
      this.ammo[id] = { clip: stats.clip, reserve: stats.reserve };
    }
    this.save();
  }

  currentId() {
    return this.slots[this.active] || this.slots.melee;
  }

  slotFor(weapon) {
    return combatStats(weapon).slot || "primary";
  }

  canAfford(price) {
    return this.money >= price;
  }

  buyWeapon(weapon) {
    if (!isBuyable(weapon)) return { ok: false, reason: "Not for sale" };
    const stats = combatStats(weapon);
    if (!this.canAfford(stats.price)) return { ok: false, reason: "Can't afford" };
    this.money -= stats.price;
    const slot = this.slotFor(weapon);
    const previous = this.slots[slot];
    if (previous && previous !== weapon.id) this.owned.delete(previous);
    this.owned.add(weapon.id);
    this.slots[slot] = weapon.id;
    this.ammo[weapon.id] = { clip: stats.clip, reserve: stats.reserve };
    this.active = slot === "grenade" ? "grenade" : slot;
    this.save();
    return { ok: true, slot };
  }

  buyGear(item, catalog) {
    if (!this.canAfford(item.price)) return { ok: false, reason: "Can't afford" };
    if (item.kind === "armor") {
      if (this.armor >= 100) return { ok: false, reason: "Already armored" };
      this.money -= item.price;
      this.armor = 100;
    } else if (item.kind === "helmet") {
      if (this.helmet && this.armor >= 100) return { ok: false, reason: "Already equipped" };
      this.money -= item.price;
      this.armor = 100;
      this.helmet = true;
    } else if (item.kind === "ammo") {
      const id = this.slots[item.slot];
      if (!id) return { ok: false, reason: "No weapon in that slot" };
      const weapon = catalog.weapons.find((w) => w.id === id);
      const stats = combatStats(weapon);
      this.money -= item.price;
      const cur = this.ammoFor(weapon);
      cur.reserve = stats.reserve;
      cur.clip = stats.clip;
      this.ammo[id] = cur;
    }
    this.save();
    return { ok: true };
  }

  addMoney(amount) {
    this.money = Math.min(16000, this.money + Math.max(0, amount | 0));
    this.save();
  }

  selectSlot(slot) {
    if (!this.slots[slot]) return null;
    this.active = slot;
    this.save();
    return this.slots[slot];
  }

  cycleSlot(dir) {
    const order = ["primary", "pistol", "melee", "grenade"].filter((s) => this.slots[s]);
    if (!order.length) return this.currentId();
    const i = Math.max(0, order.indexOf(this.active));
    this.active = order[(i + dir + order.length) % order.length];
    this.save();
    return this.currentId();
  }

  applyTeamPistol(teamHands) {
    const pistol = teamHands === "t" ? "glock18" : "usp";
    if (!this.slots.pistol || this.slots.pistol === "usp" || this.slots.pistol === "glock18") {
      this.owned.delete("usp");
      this.owned.delete("glock18");
      this.owned.add(pistol);
      this.slots.pistol = pistol;
      this.save();
    }
  }

  dropWeapon(weapon) {
    if (!weapon) return { ok: false };
    const slot = this.slotFor(weapon);
    if (this.slots[slot] !== weapon.id) return { ok: false };
    this.slots[slot] = null;
    this.owned.delete(weapon.id);
    const ammo = this.ammo[weapon.id] || { clip: 0, reserve: 0 };
    delete this.ammo[weapon.id];
    const order = ["primary", "pistol", "melee", "grenade"];
    this.active = order.find((s) => this.slots[s]) || "melee";
    this.save();
    return { ok: true, nextId: this.slots[this.active], ammo, slot };
  }

  takePickup(weapon, ammo = { clip: 0, reserve: 0 }) {
    if (!weapon) return { ok: false };
    const slot = this.slotFor(weapon);
    if (this.slots[slot]) return { ok: false };
    this.slots[slot] = weapon.id;
    this.owned.add(weapon.id);
    this.ammo[weapon.id] = { clip: ammo.clip || 0, reserve: ammo.reserve || 0 };
    this.active = slot;
    this.save();
    return { ok: true, slot };
  }
}
