/** Route every available sequence to a mechanic. */

function lower(name) {
  return String(name || "").toLowerCase();
}

export function clipsOf(model, pred) {
  return (model?.listClips() || []).filter((name) => pred(lower(name)));
}

function isUnsilClip(name) {
  return /unsil/i.test(name);
}

export function silencerClips(names, silenced) {
  const list = names || [];
  const unsil = list.filter((n) => isUnsilClip(n));
  const def = list.filter((n) => !isUnsilClip(n));
  if (silenced) return def.length ? def : list;
  return unsil.length ? unsil : def;
}

export function pickClips(model, { silenced = true, include } = {}) {
  const names = model?.listClips() || [];
  const match = (test) => silencerClips(
    names.filter((n) => test(lower(n))),
    silenced
  );

  const by = (keys) => match((l) => keys.some((k) => l.includes(k)));
  const shoots = by(["shoot", "fire"]);
  const isLast = (n) => /last|empty/i.test(n);
  const isAltFire = (n) => /prefire|postfire/i.test(n);
  const shootLeft = sortNumeric(shoots.filter((n) => /left/i.test(n) && !isLast(n)));
  const shootRight = sortNumeric(shoots.filter((n) => /right/i.test(n) && !isLast(n)));
  const idles = by(["idle"]);

  return {
    idle: idles.filter((n) => !/empty/i.test(n)),
    idleEmpty: idles.filter((n) => /empty/i.test(n)),
    walk: by(["walk", "run"]),
    shoot: sortNumeric(shoots.filter((n) => !isLast(n) && !/left|right/i.test(n) && !isAltFire(n))),
    shootLeft,
    shootRight,
    shootLeftLast: shoots.filter((n) => /left/i.test(n) && isLast(n)),
    shootRightLast: shoots.filter((n) => /right/i.test(n) && isLast(n)),
    shootEmpty: shoots.filter((n) => isLast(n) && !/left|right/i.test(n)),
    empty: by(["empty", "shootlast", "shoot_empty"]),
    reload: by(["reload"]).filter((n) => !lower(n).includes("start") && !lower(n).includes("after")),
    startReload: by(["start_reload"]),
    insert: by(["insert"]),
    afterReload: by(["after_reload"]),
    draw: by(["draw", "deploy", "select"]),
    holster: by(["holster", "unequip"]),
    inspect: by(["inspect", "observe"]),
    slash: by(["slash", "midslash"]).filter((n) => !/stab/i.test(n)),
    stab: by(["stab"]).filter((n) => !/miss/i.test(n)),
    stabMiss: match((l) => /stab.*miss|miss.*stab/.test(l)),
    addSilencer: by(["add_silencer", "changemode"]),
    detachSilencer: by(["detach_silencer", "changemode"]),
    throw: by(["throw", "pullpin"]),
    drop: by(["drop"]),
    button: by(["pressbutton"]),
    extra: names,
    include,
  };
}

export function cycleName(list, index) {
  if (!list?.length) return null;
  return list[index % list.length];
}

function sortNumeric(names) {
  return [...names].sort((a, b) => {
    const na = Number((a.match(/\d+/) || ["0"])[0]);
    const nb = Number((b.match(/\d+/) || ["0"])[0]);
    return na - nb || a.localeCompare(b);
  });
}

export function pickIdleClip(packs, clip, allNames = []) {
  const dual = packs.shootLeft?.length || packs.shootRight?.length;
  if (clip > 0 && !(dual && clip === 1)) return null;
  const names = allNames.length
    ? allNames
    : [...(packs.idleEmpty || []), ...(packs.idle || []), ...(packs.shootEmpty || []), ...(packs.empty || [])];
  const hit = (pred) => names.find((n) => pred(lower(n)));
  return (
    packs.idleEmpty?.[0] ||
    hit((l) => l === "idle_empty" || l === "idleempty" || l === "empty_idle") ||
    hit((l) => l.includes("idle") && l.includes("empty")) ||
    packs.shootEmpty?.[0] ||
    hit((l) => /empty|shootlast|shoot_last/.test(l) && !l.includes("reload")) ||
    null
  );
}

export function pickShootClip(packs, { clip, shootIndex, eliteLeft, eliteRight }) {
  const dual = packs.shootLeft?.length || packs.shootRight?.length;
  if (dual) {
    const left = clip % 2 === 0;
    if (left) {
      if (clip <= 2 && packs.shootLeftLast?.[0]) return packs.shootLeftLast[0];
      return cycleName(packs.shootLeft, eliteLeft);
    }
    if (clip <= 1 && packs.shootRightLast?.[0]) return packs.shootRightLast[0];
    return cycleName(packs.shootRight, eliteRight);
  }
  if (clip === 1 && packs.shootEmpty?.[0]) return packs.shootEmpty[0];
  return cycleName(packs.shoot, shootIndex);
}

export function isLocomotion(name) {
  const l = lower(name);
  return l.includes("idle") || l.includes("walk") || l.includes("run");
}
