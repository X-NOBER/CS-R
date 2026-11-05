import { RiotEngine } from "./engine/Engine.js";
import { ARSENAL_CATEGORIES, BUY_CATEGORIES, EQUIPMENT, combatStats, damageCard, formatHit, isArsenalGun, isBuyable, speedImpact } from "./game/WeaponStats.js";
import { PLAYER_MODELS } from "./game/Players.js";

const CATEGORY_LABEL = {
  melee: "Melee",
  pistol: "Pistols",
  shotgun: "Shotguns",
  smg: "SMGs",
  rifle: "Rifles",
  sniper: "Snipers",
  lmg: "LMG",
  equip: "Equipment",
  shield: "Shield",
};

class HUD {
  constructor() {
    this.statusEl = document.getElementById("status");
    this.weaponsEl = document.getElementById("weapons");
    this.animsEl = document.getElementById("anims");
    this.weaponName = document.getElementById("weaponName");
    this.weaponMeta = document.getElementById("weaponMeta");
    this.sourceLabel = document.getElementById("sourceLabel");
    this.healthEl = document.getElementById("health");
    this.armorEl = document.getElementById("armor");
    this.ammoEl = document.getElementById("ammo");
    this.hint = document.getElementById("hint");
    this.crosshair = document.getElementById("crosshair");
    this.hitmarker = document.getElementById("hitmarker");
    this.dmgBox = document.getElementById("dmgIndicator");
    this.dmgHits = [];
    this.catalog = null;
    this.engine = null;
    this.buyCat = "rifle";
    this.startSelected = "usp";
  }

  attach(engine) {
    this.engine = engine;
    engine.controls.addEventListener("lock", () => this.hint.classList.add("hidden"));
    engine.controls.addEventListener("unlock", () => {
      if (engine.startOpen || engine.buyOpen) return;
      if (engine.mode === "fps") this.hint.classList.remove("hidden");
    });
    document.getElementById("pack").addEventListener("change", (e) => engine.setPack(e.target.value));
    document.getElementById("screen").addEventListener("change", (e) => engine.setScreen(e.target.value));
    document.getElementById("teamHands").addEventListener("change", (e) => engine.setTeamHands(e.target.value));
    document.getElementById("source").addEventListener("change", (e) => engine.setSource(e.target.value));
    document.getElementById("hands").addEventListener("change", (e) => engine.setHands(e.target.value));
    document.getElementById("inspectBtn").addEventListener("click", () => engine.toggleMode());
    document.getElementById("startPlay").addEventListener("click", () => engine.startMatch());
    document.getElementById("pickCT").addEventListener("click", () => engine.setPlayerTeam("ct"));
    document.getElementById("pickT").addEventListener("click", () => engine.setPlayerTeam("t"));
    document.getElementById("buyReady").addEventListener("click", () => {
      engine.mission.skipBuy();
      engine.beginLive();
    });
    document.getElementById("buyClose").addEventListener("click", () => engine.toggleBuyMenu(false));
    this.bindViewmodelControls(engine);
    this.syncPack(engine);
    this.syncTeam(engine);
    this.buildBuyCats();
    this.buildPlayers();
  }

  buildPlayers() {
    const box = document.getElementById("players");
    if (!box) return;
    box.innerHTML = "";
    for (const team of ["ct", "t"]) {
      const header = document.createElement("div");
      header.className = "sub";
      header.textContent = team === "ct" ? "CT" : "Terrorist";
      box.append(header);
      for (const def of PLAYER_MODELS.filter((p) => p.team === team)) {
        const button = document.createElement("button");
        button.textContent = def.name;
        button.dataset.id = def.id;
        if (def.id === "sas" || def.id === "leet") button.classList.add("current");
        button.addEventListener("click", () => this.engine.previewPlayer(def.id));
        box.append(button);
      }
    }
  }

  setPlayerPreview(def, model) {
    this.weaponName.textContent = `${def.name} (${def.team.toUpperCase()})`;
    this.weaponMeta.textContent = `${model.source} · player · ${model.listClips().length} seqs`;
    this.animsEl.innerHTML = "";
    for (const name of model.listClips()) {
      const button = document.createElement("button");
      button.textContent = name;
      button.addEventListener("click", () => {
        model.play(name, { loop: /idle|walk|run|aim/i.test(name) });
        model.onFinished = () => model.play("idle1", { loop: true });
        this.markAnim(name);
      });
      this.animsEl.append(button);
    }
    for (const button of document.querySelectorAll("#players button")) {
      button.classList.toggle("current", button.dataset.id === def.id);
    }
    this.setStatus(`${def.name} — orbit inspect`);
  }

  setDevOpen(open) {
    document.getElementById("devHud").classList.toggle("hidden", !open);
  }

  syncPack(engine) {
    const packEl = document.getElementById("pack");
    const screenEl = document.getElementById("screen");
    const teamEl = document.getElementById("teamHands");
    const sourceEl = document.getElementById("source");
    const handsEl = document.getElementById("hands");
    if (packEl) packEl.value = engine.pack;
    if (screenEl) screenEl.value = engine.screen;
    if (teamEl) teamEl.value = engine.teamHands;
    if (sourceEl) sourceEl.value = engine.source;
    if (handsEl) handsEl.value = engine.hands;
    document.getElementById("reanimsOpts").hidden = engine.pack !== "reanims";
    document.getElementById("originalOpts").hidden = engine.pack === "reanims";
    const packName = engine.pack === "reanims" ? "Reanims Reborn" : "Original CS 1.6";
    const screenName = engine.screen === "wide" ? "Wide screen" : "Normal screen";
    const handsName = engine.teamHands === "t" ? "T hands" : "CT hands";
    this.sourceLabel.textContent =
      engine.pack === "reanims" ? `${packName} · ${screenName} · ${handsName}` : packName;
  }

  bindViewmodelControls(engine) {
    this.vmRows = [...document.querySelectorAll(".slider-row[data-vm]")].map((row) => {
      const key = row.dataset.vm;
      const range = row.querySelector("input[type=range]");
      const number = row.querySelector("input[type=number]");
      const write = (value, persist) => {
        engine.setViewmodel({ [key]: Number(value) }, { persist });
      };
      range.addEventListener("input", () => write(range.value, false));
      range.addEventListener("change", () => write(range.value, true));
      number.addEventListener("input", () => write(number.value, false));
      number.addEventListener("change", () => write(number.value, true));
      return { key, range, number };
    });
    document.getElementById("vmReset").addEventListener("click", () => engine.resetViewmodel());
    this.syncViewmodel(engine.vm);
  }

  syncViewmodel(vm) {
    if (!this.vmRows) return;
    for (const row of this.vmRows) {
      const value = vm[row.key];
      row.range.value = String(value);
      row.number.value = String(value);
    }
  }

  setCatalog(catalog) {
    this.catalog = catalog;
    this.renderStartArsenal();
    this.weaponsEl.innerHTML = "";
    const groups = new Map();
    for (const weapon of catalog.weapons) {
      if (!groups.has(weapon.category)) groups.set(weapon.category, []);
      groups.get(weapon.category).push(weapon);
    }
    for (const [category, list] of groups) {
      const header = document.createElement("div");
      header.className = "sub";
      header.textContent = CATEGORY_LABEL[category] || category;
      this.weaponsEl.append(header);
      for (const weapon of list) {
        const button = document.createElement("button");
        button.textContent = weapon.name;
        button.dataset.id = weapon.id;
        button.addEventListener("click", () => this.engine.equip(weapon.id, { fromDev: true }));
        this.weaponsEl.append(button);
      }
    }
  }

  setWeapon(weapon, model) {
    if (this.engine?.startOpen && !this.engine?.devOpen) {
      this.setStatus(`${weapon.name} ready`);
      return;
    }
    this.weaponName.textContent = weapon.name;
    if (model) {
      const stats = combatStats(weapon);
      const impact = speedImpact(weapon);
      this.weaponMeta.textContent = `${model.source} · ${stats.weight.toFixed(1)} kg · ${impact.speed} speed · ${model.listClips().length} seqs`;
      if (this.engine) this.syncPack(this.engine);
      else this.sourceLabel.textContent = model.source;
      this.animsEl.innerHTML = "";
      for (const name of model.listClips()) {
        const button = document.createElement("button");
        button.textContent = name;
        button.addEventListener("click", () => {
          this.engine.busy = true;
          model.play(name, { loop: /idle/i.test(name) });
          model.onFinished = () => this.engine.playIdle();
          this.markAnim(name);
        });
        this.animsEl.append(button);
      }
    }
    for (const button of this.weaponsEl.querySelectorAll("button")) {
      button.classList.toggle("current", button.dataset.id === weapon.id);
    }
    this.setStatus(`${weapon.name} ready`);
  }

  markAnim(name) {
    for (const button of this.animsEl.querySelectorAll("button")) {
      button.classList.toggle("active", button.textContent === name);
    }
  }

  setMode(mode) {
    this.crosshair.classList.toggle("hidden", mode !== "fps");
    this.hint.classList.toggle("hidden", mode !== "fps" || this.engine?.startOpen || this.engine?.buyOpen);
    const inspectBtn = document.getElementById("inspectBtn");
    if (inspectBtn) inspectBtn.textContent = mode === "inspect" ? "Back to first person" : "Orbit inspect";
    if (this.engine?.devOpen) {
      this.setStatus(mode === "inspect" ? "Inspect mode — drag to orbit" : "First-person campaign");
    }
    if (this.engine?.startOpen) {
      document.getElementById("startMenu").classList.toggle("hidden", mode === "inspect");
    }
  }

  setStatus(text) {
    this.statusEl.textContent = text;
  }

  punch() {
    const spread = 1 + (this.engine?.combat?.inaccuracy || 0) * 0.08;
    this.crosshair.style.transform = `translate(-50%, -50%) scale(${1.35 + spread * 0.04})`;
    setTimeout(() => this.syncCrosshair(this.engine), 60);
  }

  syncCrosshair(engine) {
    const spread = 1 + (engine?.combat?.inaccuracy || 0) * 0.12;
    this.crosshair.style.transform = `translate(-50%, -50%) scale(${spread})`;
  }

  hitMarker(headshot) {
    this.hitmarker.classList.add("show");
    this.hitmarker.classList.toggle("head", Boolean(headshot));
    setTimeout(() => this.hitmarker.classList.remove("show", "head"), 90);
  }

  pain(from, amount = 0) {
    document.getElementById("hud").classList.add("pain");
    setTimeout(() => document.getElementById("hud").classList.remove("pain"), 120);
    if (!from) return;
    const now = performance.now();
    const existing = this.dmgHits.find((hit) => Math.hypot(hit.x - from.x, hit.z - from.z) < 48);
    if (existing) {
      existing.until = now + 1600;
      existing.amount = (existing.amount || 0) + amount;
    } else {
      this.dmgHits.push({ x: from.x, y: from.y || 0, z: from.z, until: now + 1600, amount });
    }
    if (this.dmgHits.length > 8) this.dmgHits.splice(0, this.dmgHits.length - 8);
  }

  clearDamage() {
    this.dmgHits = [];
    if (this.dmgBox) this.dmgBox.innerHTML = "";
  }

  syncDamage(engine) {
    const box = this.dmgBox;
    if (!box) return;
    const now = performance.now();
    this.dmgHits = this.dmgHits.filter((hit) => hit.until > now);
    while (box.children.length < this.dmgHits.length) {
      const pip = document.createElement("div");
      pip.className = "dmg-pip";
      pip.innerHTML = "<i></i><b></b>";
      box.append(pip);
    }
    for (let i = 0; i < box.children.length; i++) {
      const el = box.children[i];
      const hit = this.dmgHits[i];
      if (!hit) {
        el.style.opacity = "0";
        continue;
      }
      const life = Math.max(0, (hit.until - now) / 1600);
      const ang = engine.damageAngle(hit);
      el.style.transform = `rotate(${(ang * 180) / Math.PI}deg)`;
      el.style.opacity = String(0.2 + life * 0.8);
    }
  }

  syncTeam(engine) {
    const team = engine.playerTeam === "t" ? "t" : "ct";
    document.getElementById("pickCT")?.classList.toggle("active", team === "ct");
    document.getElementById("pickT")?.classList.toggle("active", team === "t");
    const badge = document.getElementById("missionTeam");
    if (badge) {
      badge.textContent = team === "t" ? "T" : "CT";
      badge.style.color = team === "t" ? "#d4a04a" : "#7eafd4";
    }
  }

  setMission(mission, loadout) {
    if (this.engine) this.syncTeam(this.engine);
    document.getElementById("missionName").textContent = mission.name;
    document.getElementById("missionPhase").textContent =
      mission.phase === "menu" ? "START" : mission.phase === "buy" ? "BUY PHASE" : mission.phase === "live" ? "LIVE" : mission.phase.toUpperCase();
    const t = Math.ceil(mission.remaining);
    document.getElementById("buyTimer").textContent =
      mission.phase === "menu" ? "ARSENAL" : mission.buying() ? `0:${String(t).padStart(2, "0")}` : `${mission.kills} kills`;
    document.getElementById("money").textContent = `$${loadout.money}`;
    document.getElementById("moneyHud").textContent = `$${loadout.money}`;
    document.getElementById("buyMoney").textContent = `$${loadout.money}`;
    document.getElementById("buyClock").textContent = mission.buying() ? `0:${String(t).padStart(2, "0")}` : "CLOSED";
    if (!mission.buying() && this.engine?.buyOpen) this.engine.toggleBuyMenu(false);
  }

  setStartOpen(open, engine) {
    document.getElementById("startMenu").classList.toggle("hidden", !open);
    document.getElementById("hud").classList.toggle("hidden", open);
    this.hint.classList.toggle("hidden", open || engine?.mode !== "fps");
    if (open) {
      this.syncTeam(engine);
      this.renderStartArsenal();
      const current = this.catalog?.weapons?.find((w) => w.id === this.startSelected);
      if (current) this.selectStartWeapon(current);
    }
  }

  renderStartArsenal() {
    const box = document.getElementById("startArsenal");
    if (!box || !this.catalog) return;
    box.innerHTML = "";
    for (const cat of ARSENAL_CATEGORIES) {
      const guns = this.catalog.weapons.filter((w) => w.category === cat.id && isArsenalGun(w));
      if (!guns.length) continue;
      const section = document.createElement("section");
      section.className = "start-cat";
      const title = document.createElement("h2");
      title.textContent = cat.label;
      const cols = document.createElement("div");
      cols.className = "start-cols";
      cols.innerHTML = "<span>Weapon</span><span>Body</span><span>Head</span>";
      section.append(title, cols);
      for (const weapon of guns) {
        const card = damageCard(weapon);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "start-gun";
        button.dataset.id = weapon.id;
        if (weapon.id === this.startSelected) button.classList.add("selected");
        button.innerHTML = `<span>${weapon.name}</span><span class="body">${formatHit(card.body, card.pellets)}</span><span class="head">${formatHit(card.head, card.pellets)}</span>`;
        button.addEventListener("click", () => this.selectStartWeapon(weapon));
        section.append(button);
      }
      box.append(section);
    }
  }

  selectStartWeapon(weapon) {
    if (!weapon) return;
    this.startSelected = weapon.id;
    const card = damageCard(weapon);
    const stats = combatStats(weapon);
    document.getElementById("startDetailName").textContent = weapon.name;
    document.getElementById("startBody").textContent = formatHit(card.body, card.pellets);
    document.getElementById("startHead").textContent = formatHit(card.head, card.pellets);
    document.getElementById("startBodyHint").textContent =
      card.pellets > 1 ? `${card.bodyTotal} max` : card.body >= 100 ? "1-tap unarmored" : "";
    document.getElementById("startHeadHint").textContent =
      card.pellets > 1 ? `${card.headTotal} max` : card.head >= 100 ? "1-tap unarmored" : `×${stats.head} multiplier`;
    document.getElementById("startDetailStats").textContent =
      stats.clip > 0
        ? `$${stats.price} · clip ${stats.clip} · ${stats.rpm} RPM · ${stats.weight.toFixed(1)} kg`
        : `${stats.weight.toFixed(1)} kg · melee`;
    document.getElementById("startDetailBlurb").textContent =
      card.pellets > 1
        ? `${card.pellets} pellets. Body ${card.body} each (${card.bodyTotal} if all connect). Head ${card.head} each (${card.headTotal} max).`
        : `Body ${card.body}. Head ${card.head}. Armor soaks ${(stats.armor * 100) | 0}%.`;
    for (const button of document.querySelectorAll(".start-gun")) {
      button.classList.toggle("selected", button.dataset.id === weapon.id);
    }
  }

  setBuyOpen(open, engine) {
    document.getElementById("buyMenu").classList.toggle("hidden", !open);
    if (open) {
      this.renderBuyItems();
      document.getElementById("buyMoney").textContent = `$${engine.loadout.money}`;
    }
  }

  buildBuyCats() {
    const nav = document.getElementById("buyCats");
    nav.innerHTML = "";
    for (const cat of BUY_CATEGORIES) {
      const button = document.createElement("button");
      button.textContent = cat.label;
      button.dataset.id = cat.id;
      button.addEventListener("click", () => {
        this.buyCat = cat.id;
        this.renderBuyItems();
      });
      nav.append(button);
    }
  }

  renderBuyItems() {
    const engine = this.engine;
    if (!engine?.catalog) return;
    for (const button of document.getElementById("buyCats").querySelectorAll("button")) {
      button.classList.toggle("active", button.dataset.id === this.buyCat);
    }
    const box = document.getElementById("buyItems");
    box.innerHTML = "";
    if (this.buyCat === "gear") {
      for (const item of EQUIPMENT) {
        const button = document.createElement("button");
        button.className = "buy-item";
        if (engine.loadout.money < item.price) button.classList.add("cant");
        button.innerHTML = `<span>${item.name}</span><span class="price">$${item.price}</span><small>Equipment</small>`;
        button.addEventListener("click", () => engine.buyGear(item.id));
        box.append(button);
      }
      return;
    }
    const list = engine.catalog.weapons.filter((w) => w.category === this.buyCat && isBuyable(w));
    for (const weapon of list) {
      const stats = combatStats(weapon);
      const impact = speedImpact(weapon);
      const button = document.createElement("button");
      button.className = "buy-item";
      if (engine.loadout.slots[stats.slot] === weapon.id) button.classList.add("owned");
      if (engine.loadout.money < stats.price) button.classList.add("cant");
      button.innerHTML = `<span>${weapon.name}</span><span class="price">$${stats.price}</span>
        <small>${stats.weight.toFixed(1)} kg · ${stats.speed} u/s (${impact.pct}%) · ${stats.damage} dmg</small>`;
      button.addEventListener("click", () => {
        document.getElementById("buyDetailName").textContent = weapon.name;
        document.getElementById("buyDetailStats").textContent =
          `$${stats.price} · ${stats.weight.toFixed(1)} kg · speed ${stats.speed} · ${stats.rpm} RPM · ${stats.damage} dmg · clip ${stats.clip}`;
        document.getElementById("buyDetailBlurb").textContent =
          `${weapon.name} movement ${impact.pct}% vs knife. Armor pen ${(stats.pen * 100) | 0}%. Head x${stats.head}.`;
        engine.buyWeapon(weapon.id);
      });
      box.append(button);
    }
  }

  sync(engine) {
    this.healthEl.textContent = String(Math.max(0, engine.health | 0));
    this.armorEl.textContent = String(Math.max(0, engine.armor | 0));
    const clip = engine.weapon?.stats.clip ? `${engine.clip} | ${engine.reserve}` : "—";
    this.ammoEl.textContent = clip;
    this.syncCrosshair(engine);
    this.syncDamage(engine);
    if (engine.mission) this.setMission(engine.mission, engine.loadout);
  }
}

const hud = new HUD();
const engine = new RiotEngine(document.getElementById("view"), hud);
hud.attach(engine);
engine.start();
engine.loadCatalog();
