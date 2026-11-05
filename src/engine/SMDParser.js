function tokenizeLine(line) {
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let match;
  while ((match = re.exec(line))) {
    tokens.push(match[1] !== undefined ? match[1] : match[2]);
  }
  return tokens;
}

export function parseSMD(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const bones = [];
  const frames = [];
  const triangles = [];
  let section = null;
  let currentMaterial = "default";
  let vertexBuffer = [];
  let currentFrame = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    const lower = line.toLowerCase();

    if (lower === "nodes") {
      section = "nodes";
      continue;
    }
    if (lower === "skeleton") {
      section = "skeleton";
      continue;
    }
    if (lower === "triangles") {
      section = "triangles";
      continue;
    }
    if (lower === "end") {
      section = section === "triangles" ? null : null;
      continue;
    }

    if (section === "nodes") {
      const tokens = tokenizeLine(line);
      if (tokens.length < 3) continue;
      bones.push({
        id: Number(tokens[0]),
        name: tokens[1],
        parent: Number(tokens[2]),
      });
      continue;
    }

    if (section === "skeleton") {
      if (lower.startsWith("time ")) {
        currentFrame = {
          time: Number(line.split(/\s+/)[1]),
          bones: [],
        };
        frames.push(currentFrame);
        continue;
      }
      const parts = line.split(/\s+/).map(Number);
      if (parts.length < 7 || !currentFrame) continue;
      currentFrame.bones[parts[0]] = {
        pos: [parts[1], parts[2], parts[3]],
        rot: [parts[4], parts[5], parts[6]],
      };
      continue;
    }

    if (section === "triangles") {
      const nums = line.split(/\s+/);
      const looksLikeVertex = nums.length >= 9 && !Number.isNaN(Number(nums[0])) && !Number.isNaN(Number(nums[1]));
      if (!looksLikeVertex) {
        currentMaterial = line;
        continue;
      }
      const bone = Number(nums[0]);
      const pos = [Number(nums[1]), Number(nums[2]), Number(nums[3])];
      const norm = [Number(nums[4]), Number(nums[5]), Number(nums[6])];
      const uv = [Number(nums[7]), Number(nums[8])];
      const links = [];
      if (nums.length > 9) {
        const count = Number(nums[9]) || 0;
        for (let i = 0; i < count; i++) {
          links.push({
            bone: Number(nums[10 + i * 2]),
            weight: Number(nums[11 + i * 2]),
          });
        }
      }
      if (!links.length) links.push({ bone, weight: 1 });
      vertexBuffer.push({ bone, pos, norm, uv, links });
      if (vertexBuffer.length === 3) {
        triangles.push({
          material: currentMaterial,
          verts: vertexBuffer,
        });
        vertexBuffer = [];
      }
    }
  }

  bones.sort((a, b) => a.id - b.id);
  return { bones, frames, triangles };
}

export function smdPoseFromFrame(smd, frameIndex = 0) {
  const frame = smd.frames[Math.max(0, Math.min(frameIndex, smd.frames.length - 1))];
  return smd.bones.map((bone) => {
    const entry = frame?.bones[bone.id];
    return {
      pos: entry ? entry.pos.slice() : [0, 0, 0],
      rot: entry ? entry.rot.slice() : [0, 0, 0],
    };
  });
}

export function textureKey(name) {
  return name.replace(/\\/g, "/").split("/").pop().toLowerCase();
}
