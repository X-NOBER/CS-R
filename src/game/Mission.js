export class Mission {
  constructor() {
    this.id = "de_molino";
    this.name = "de_molino";
    this.objective = "Clear Molino of hostiles.";
    this.phase = "menu";
    this.buySeconds = 60;
    this.remaining = 60;
    this.kills = 0;
    this.headshots = 0;
    this.wave = 1;
    this.difficulty = "normal";
    this.complete = false;
    this.failed = false;
  }

  startBuy() {
    this.phase = "buy";
    this.remaining = this.buySeconds;
    this.complete = false;
    this.failed = false;
    this.kills = 0;
    this.headshots = 0;
  }

  tick(dt) {
    if (this.phase !== "buy") return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining <= 0) this.phase = "live";
  }

  skipBuy() {
    this.remaining = 0;
    this.phase = "live";
  }

  onKill(headshot) {
    this.kills += 1;
    if (headshot) this.headshots += 1;
    return {
      money: 300 + (headshot ? 150 : 0),
      headshot,
    };
  }

  completeMission() {
    this.phase = "complete";
    this.complete = true;
    return { money: 2500 };
  }

  fail() {
    this.phase = "failed";
    this.failed = true;
    return { money: 1400 };
  }

  buying() {
    return this.phase === "buy";
  }

  live() {
    return this.phase === "live";
  }
}
