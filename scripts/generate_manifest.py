import json
import os
import re

ROOT = r"C:\Users\nylib\Downloads\CS16_v_weapons_unified_arms"
OUT = r"D:\CursorProjects\CS_RIOT\public\weapons.json"

NAMES = {
    "ak47": "AK-47",
    "aug": "AUG",
    "awp": "AWP",
    "c4": "C4",
    "deagle": "Desert Eagle",
    "elite": "Dual Elites",
    "famas": "FAMAS",
    "fiveseven": "Five-SeveN",
    "flashbang": "Flashbang",
    "g3sg1": "G3SG1",
    "galil": "Galil",
    "glock18": "Glock-18",
    "hegrenade": "HE Grenade",
    "knife": "Knife",
    "knife_r": "Knife (Classic)",
    "m249": "M249",
    "m3": "M3 Super 90",
    "m4a1": "M4A1",
    "mac10": "MAC-10",
    "mp5": "MP5",
    "p228": "P228",
    "p90": "P90",
    "scout": "Scout",
    "sg550": "SG 550",
    "sg552": "SG 552",
    "smokegrenade": "Smoke Grenade",
    "tmp": "TMP",
    "ump45": "UMP-45",
    "usp": "USP",
    "xm1014": "XM1014",
    "shield_usp": "Shield USP",
    "shield_smokegrenade": "Shield Smoke",
    "shield_r": "Shield Five-SeveN",
    "shield_p228": "Shield P228",
    "shield_knife": "Shield Knife",
    "shield_hegrenade": "Shield HE",
    "shield_glock18": "Shield Glock",
    "shield_flashbang": "Shield Flash",
    "shield_fiveseven": "Shield Five-SeveN",
    "shield_deagle": "Shield Deagle",
}

CATS = {
    "knife": "melee",
    "knife_r": "melee",
    "shield_knife": "melee",
    "usp": "pistol",
    "glock18": "pistol",
    "deagle": "pistol",
    "p228": "pistol",
    "fiveseven": "pistol",
    "elite": "pistol",
    "m3": "shotgun",
    "xm1014": "shotgun",
    "mp5": "smg",
    "tmp": "smg",
    "p90": "smg",
    "mac10": "smg",
    "ump45": "smg",
    "ak47": "rifle",
    "m4a1": "rifle",
    "galil": "rifle",
    "famas": "rifle",
    "aug": "rifle",
    "sg552": "rifle",
    "awp": "sniper",
    "scout": "sniper",
    "g3sg1": "sniper",
    "sg550": "sniper",
    "m249": "lmg",
    "c4": "equip",
    "hegrenade": "equip",
    "flashbang": "equip",
    "smokegrenade": "equip",
}

STATS = {
    "ak47": dict(clip=30, reserve=90, auto=True, damage=36),
    "aug": dict(clip=30, reserve=90, auto=True, damage=32),
    "awp": dict(clip=10, reserve=30, auto=False, damage=115),
    "c4": dict(clip=1, reserve=0, auto=False, damage=0),
    "deagle": dict(clip=7, reserve=35, auto=False, damage=54),
    "elite": dict(clip=30, reserve=120, auto=False, damage=38),
    "famas": dict(clip=25, reserve=90, auto=True, damage=30),
    "fiveseven": dict(clip=20, reserve=100, auto=False, damage=25),
    "flashbang": dict(clip=1, reserve=2, auto=False, damage=0),
    "g3sg1": dict(clip=20, reserve=60, auto=True, damage=80),
    "galil": dict(clip=35, reserve=90, auto=True, damage=30),
    "glock18": dict(clip=20, reserve=120, auto=False, damage=25),
    "hegrenade": dict(clip=1, reserve=1, auto=False, damage=98),
    "knife": dict(clip=0, reserve=0, auto=False, damage=65),
    "knife_r": dict(clip=0, reserve=0, auto=False, damage=65),
    "m249": dict(clip=100, reserve=200, auto=True, damage=32),
    "m3": dict(clip=8, reserve=32, auto=False, damage=120),
    "m4a1": dict(clip=30, reserve=90, auto=True, damage=32),
    "mac10": dict(clip=30, reserve=100, auto=True, damage=29),
    "mp5": dict(clip=30, reserve=120, auto=True, damage=26),
    "p228": dict(clip=13, reserve=52, auto=False, damage=32),
    "p90": dict(clip=50, reserve=100, auto=True, damage=21),
    "scout": dict(clip=10, reserve=90, auto=False, damage=75),
    "sg550": dict(clip=30, reserve=90, auto=True, damage=70),
    "sg552": dict(clip=30, reserve=90, auto=True, damage=33),
    "smokegrenade": dict(clip=1, reserve=1, auto=False, damage=0),
    "tmp": dict(clip=30, reserve=120, auto=True, damage=20),
    "ump45": dict(clip=25, reserve=100, auto=True, damage=30),
    "usp": dict(clip=12, reserve=100, auto=False, damage=34),
    "xm1014": dict(clip=7, reserve=32, auto=False, damage=120),
}


def read(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        return handle.read()


def strip_comment(line):
    stripped = line.strip()
    if stripped.startswith("//"):
        return ""
    if "//" in line:
        return line.split("//", 1)[0]
    return line


def expand(text, base):
    lines = []
    for line in text.splitlines():
        cleaned = strip_comment(line)
        match = re.match(r'\$include\s+"?([^"\s]+)"?', cleaned.strip(), re.I)
        if match:
            rel = match.group(1).replace("\\", os.sep)
            candidate = os.path.normpath(os.path.join(ROOT, rel))
            if not os.path.isfile(candidate):
                candidate = os.path.normpath(os.path.join(base, rel))
            if os.path.isfile(candidate):
                lines.append(expand(read(candidate), os.path.dirname(candidate)))
            continue
        lines.append(cleaned)
    return "\n".join(lines)


def norm_smd(path):
    path = path.replace("\\", "/")
    if not path.lower().endswith(".smd"):
        path += ".smd"
    while path.startswith("./"):
        path = path[2:]
    return path


def parse_qc(path):
    text = expand(read(path), os.path.dirname(path))
    model = re.search(r'\$modelname\s+"([^"]+)"', text, re.I)
    cds = re.findall(r'\$cd\s+"([^"]+)"', text, re.I)
    tex = re.findall(r'\$cdtexture\s+"([^"]+)"', text, re.I)
    bodies = re.findall(r'\$body\s+"([^"]+)"\s+"([^"]+)"', text, re.I)
    sequences = []
    for match in re.finditer(r'\$sequence\s+"([^"]+)"\s+"([^"]+)"([^$]*)', text, re.I):
        name, smd, rest = match.group(1), match.group(2), match.group(3)
        fps_match = re.search(r"fps\s+([0-9.]+)", rest, re.I)
        fps = float(fps_match.group(1)) if fps_match else 30.0
        loop = name.lower().startswith("idle") or "loop" in rest.lower()
        sequences.append({"name": name, "smd": smd, "fps": fps, "loop": loop})

    cd = cds[0].replace("\\", "/") if cds else ""
    mdl = model.group(1).replace("\\", "/") if model else ""
    body_files = []
    for body_name, body_ref in bodies:
        body_ref = body_ref.replace("\\", "/")
        if body_ref.startswith("../") or body_ref.startswith("..\\"):
            rel = os.path.normpath(os.path.join(cd or ".", body_ref)).replace("\\", "/")
        else:
            rel = f"{cd}/{body_ref}" if cd else body_ref
        rel = re.sub(r"^(\.\./)+", "", rel.replace("\\", "/"))
        body_files.append({"name": body_name, "file": norm_smd(rel)})

    return {
        "mdl": mdl,
        "cd": cd,
        "textures": [item.replace("\\", "/") for item in tex],
        "bodies": body_files,
        "sequences": sequences,
    }


def main():
    weapons = []
    for filename in sorted(os.listdir(ROOT)):
        if not filename.lower().endswith(".qc") or not filename.lower().startswith("v_"):
            continue
        weapon_id = filename[2:-3]
        info = parse_qc(os.path.join(ROOT, filename))
        category = CATS.get(weapon_id, "shield" if weapon_id.startswith("shield_") else "other")
        stats_key = weapon_id if weapon_id in STATS else weapon_id.replace("shield_", "")
        weapons.append(
            {
                "id": weapon_id,
                "name": NAMES.get(weapon_id, weapon_id),
                "category": category,
                "qc": filename,
                **info,
                "stats": STATS.get(stats_key, dict(clip=0, reserve=0, auto=False, damage=0)),
            }
        )

    payload = {
        "baseUrl": "/cs16",
        "hands": {
            "cs": "01_hands/CS_hands_reference.smd",
            "shaped": "01_hands/CS_shaped_hands_reference.smd",
            "cz": "01_hands/CZ_hands_reference.smd",
        },
        "weapons": weapons,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)

    print(f"wrote {len(weapons)} weapons")
    for weapon in weapons:
        bodies = [body["file"] for body in weapon["bodies"]]
        seqs = [seq["name"] for seq in weapon["sequences"]]
        print(f"{weapon['id']:22} mdl={weapon['mdl']:32} bodies={bodies} seqs={seqs}")


if __name__ == "__main__":
    main()
