(() => {
  const canvas = document.getElementById("view");
  const stage = document.getElementById("screen");
  const pick = document.getElementById("pick");
  const fireBtn = document.getElementById("fire");
  let screenMode = "";
  const hud = document.getElementById("hud");
  const fuelFill = document.getElementById("fuel-fill");
  const preview = document.getElementById("preview");
  const cats = document.getElementById("cats");
  const catList = document.getElementById("cat-list");
  const previewCtx = preview.getContext("2d", { alpha: true });
  const ctx = canvas.getContext("2d", { alpha: false });
  let aimYaw = 0;
  let aimPitch = 0.15;
  let yaw = 0;
  let pitch = 0.15;
  let x = 0;
  let y = 8;
  let z = 0;
  let laserX = 0;
  let laserY = 8;
  let laserZ = 16;
  let boom = 0;
  let fuse = 0;
  let shakeT = 0;
  let boomX = 0;
  let boomY = 0;
  let boomZ = 0;
  let meshX = 0;
  let meshY = 8;
  let meshZ = 0;
  let meshYaw = 0;
  let meshPitch = 0.15;
  const spawnX = 0;
  const spawnY = 8;
  const spawnZ = 0;
  let vx = 0;
  let vy = 0;
  let vz = 0;
  let rightHeld = false;
  function pressRight(e) {
    unlockAudio();
    rightHeld = true;
    if (e && e.preventDefault) e.preventDefault();
  }
  function releaseRight(e) {
    if (e && (e.buttons & 2) !== 0) return;
    rightHeld = false;
  }
  let boost = 0;
  let fuel = 1;
  let bodyColor = [220, 36, 36];
  let noseColor = [18, 18, 20];
  let finColor = [18, 18, 20];
  const basicShip = {
    id: "basic",
    name: "기본",
    body: [220, 36, 36],
    nose: [18, 18, 20],
    fin: [18, 18, 20],
    fat: 1,
    len: 1,
    wing: 1,
    flame: 1,
    speed: 1,
    fuel: 1,
    mass: 1,
  };
  const heavyShip = {
    id: "heavy",
    name: "무거움",
    body: [245, 208, 40],
    nose: [18, 18, 20],
    fin: [18, 18, 20],
    fat: 1.5,
    len: 0.74,
    wing: 1.85,
    flame: 1.7,
    speed: 2,
    fuel: 0.75,
    mass: 1.5,
  };
  const fireworkShip = {
    id: "firework",
    name: "폭죽",
    body: [52, 186, 64],
    nose: [18, 18, 20],
    fin: [18, 18, 20],
    fat: 0.92,
    len: 1,
    wing: 1,
    flame: 1,
    speed: 1,
    fuel: 1,
    mass: 1,
  };
  const rocketCats = [
    { ship: basicShip, kids: [heavyShip, fireworkShip] },
  ];
  let rocketId = "basic";
  let openCat = "";
  let grounded = false;
  let flaming = false;
  let onRail = true;
  let railLocked = false;
  let railYaw = 0;
  let railPitch = 0.15;
  let railDist = 0;
  let launchKick = false;
  let hurt = 0;
  let foesOn = false;
  let foes = [];
  const corpses = [];
  const railLen = 6;
  const trail = [];
  let flameTip = -2.7;
  let flameK2 = 0.0484;
  let bw = 320;
  let bh = 180;
  let frame = null;

  function fitStage() {
    if (!stage) return;
    if (screenMode !== "phone" && screenMode !== "pad") {
      stage.style.width = "100%";
      stage.style.height = "100%";
      return;
    }
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const aspect = screenMode === "phone" ? 9 / 19.5 : 3 / 4;
    let w = sw;
    let h = sh;
    if (sw / sh > aspect) {
      h = sh;
      w = Math.floor(h * aspect);
    } else {
      w = sw;
      h = Math.floor(w / aspect);
    }
    stage.style.width = Math.max(1, w) + "px";
    stage.style.height = Math.max(1, h) + "px";
  }

  function resize() {
    fitStage();
    const sw = Math.max(1, stage ? stage.clientWidth : window.innerWidth);
    const sh = Math.max(1, stage ? stage.clientHeight : window.innerHeight);
    const scale = Math.max(2, Math.ceil(Math.max(sw, sh) / 520));
    bw = Math.max(1, Math.floor(sw / scale));
    bh = Math.max(1, Math.floor(sh / scale));
    canvas.width = bw;
    canvas.height = bh;
    ctx.imageSmoothingEnabled = false;
    frame = ctx.createImageData(bw, bh);
  }

  function angDiff(a, b) {
    let d = a - b;
    d = ((d % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return d;
  }

  function forward(ay, ap) {
    const cp = Math.cos(ap);
    return [Math.sin(ay) * cp, Math.sin(ap), Math.cos(ay) * cp];
  }

  function axes(ay, ap) {
    const cp = Math.cos(ap);
    const sp = Math.sin(ap);
    const fx = Math.sin(ay) * cp;
    const fy = sp;
    const fz = Math.cos(ay) * cp;
    const rx = Math.cos(ay);
    const ry = 0;
    const rz = -Math.sin(ay);
    const ux = fy * rz - fz * ry;
    const uy = fz * rx - fx * rz;
    const uz = fx * ry - fy * rx;
    return { fx, fy, fz, rx, ry, rz, ux, uy, uz };
  }

  function beamHit(ox, oy, oz, dx, dy, dz, ax) {
    const lx = (ox - laserX) * ax.rx + (oy - laserY) * ax.ry + (oz - laserZ) * ax.rz;
    const ly = (ox - laserX) * ax.ux + (oy - laserY) * ax.uy + (oz - laserZ) * ax.uz;
    const lz = (ox - laserX) * ax.fx + (oy - laserY) * ax.fy + (oz - laserZ) * ax.fz;
    const ldx = dx * ax.rx + dy * ax.ry + dz * ax.rz;
    const ldy = dx * ax.ux + dy * ax.uy + dz * ax.uz;
    const ldz = dx * ax.fx + dy * ax.fy + dz * ax.fz;
    const t = quadT(ldx * ldx + ldy * ldy, 2 * (lx * ldx + ly * ldy), lx * lx + ly * ly - 0.08 * 0.08);
    if (t < 0.05) return null;
    const hz = lz + ldz * t;
    if (hz < -6 || hz > 28) return null;
    return t;
  }

  function quadT(a, b, c) {
    if (Math.abs(a) < 1e-8) return -1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const s = Math.sqrt(disc);
    const t1 = (-b - s) / (2 * a);
    const t2 = (-b + s) / (2 * a);
    if (t1 > 0.05) return t1;
    if (t2 > 0.05) return t2;
    return -1;
  }

  function boxT(lx, ly, lz, ldx, ldy, ldz, x0, y0, z0, x1, y1, z1, far) {
    let tmin = 0.05;
    let tmax = far || 40;
    const dims = [
      [ldx, lx, x0, x1],
      [ldy, ly, y0, y1],
      [ldz, lz, z0, z1],
    ];
    for (let i = 0; i < 3; i += 1) {
      const d = dims[i][0];
      const o = dims[i][1];
      const a = dims[i][2];
      const b = dims[i][3];
      if (Math.abs(d) < 1e-8) {
        if (o < a || o > b) return -1;
      } else {
        let ta = (a - o) / d;
        let tb = (b - o) / d;
        if (ta > tb) {
          const st = ta;
          ta = tb;
          tb = st;
        }
        if (ta > tmin) tmin = ta;
        if (tb < tmax) tmax = tb;
        if (tmin > tmax) return -1;
      }
    }
    return tmin;
  }

  const tubes = [];
  const shown = [];
  let boomRad = 8;

  function cylT(ox, oy, oz, dx, dy, dz, c) {
    const rOut = c[4];
    const rIn = c[5];
    const a0 = c[6];
    const a1 = c[7];
    let u;
    let v;
    let du;
    let dv;
    let w;
    let dw;
    if (c[0] === 2) {
      u = ox - c[1];
      v = oy - c[2];
      du = dx;
      dv = dy;
      w = oz;
      dw = dz;
    } else {
      u = ox - c[1];
      v = oz - c[3];
      du = dx;
      dv = dz;
      w = oy;
      dw = dy;
    }
    let best = 160;
    let hit = false;
    const outer = quadT(du * du + dv * dv, 2 * (u * du + v * dv), u * u + v * v - rOut * rOut);
    if (outer > 0.05 && outer < best) {
      const hw = w + dw * outer;
      if (hw >= a0 && hw <= a1) {
        best = outer;
        hit = true;
      }
    }
    if (rIn > 0) {
      const inner = quadT(du * du + dv * dv, 2 * (u * du + v * dv), u * u + v * v - rIn * rIn);
      if (inner > 0.05 && inner < best) {
        const hw = w + dw * inner;
        if (hw >= a0 && hw <= a1) {
          best = inner;
          hit = true;
        }
      }
    }
    if (Math.abs(dw) > 1e-8) {
      const tA = (a0 - w) / dw;
      const tB = (a1 - w) / dw;
      const rO2 = rOut * rOut;
      const rI2 = rIn * rIn;
      if (tA > 0.05 && tA < best) {
        const hu = u + du * tA;
        const hv = v + dv * tA;
        const rr = hu * hu + hv * hv;
        if (rr <= rO2 && rr >= rI2) {
          best = tA;
          hit = true;
        }
      }
      if (tB > 0.05 && tB < best) {
        const hu = u + du * tB;
        const hv = v + dv * tB;
        const rr = hu * hu + hv * hv;
        if (rr <= rO2 && rr >= rI2) {
          best = tB;
          hit = true;
        }
      }
    }
    return hit ? best : -1;
  }

  const dug = new Set();
  const digs = [];
  const VOX = 3;
  let digX = 0;
  let digY = 0;
  let digZ = 0;
  let digFull = 11.25;
  let digList = [];
  let digShown = 0;

  function vkey(ix, iy, iz) {
    return (ix + 8192) + (iz + 8192) * 16384 + (iy + 512) * 268435456;
  }

  function isSolid(ix, iy, iz) {
    return iy < 0 && !dug.has(vkey(ix, iy, iz));
  }

  function queueDig() {
    const rad = digFull;
    digs.push({ x: digX, y: digY, z: digZ, r2: rad * rad });
    const list = [];
    const minX = Math.floor((digX - rad) / VOX);
    const maxX = Math.floor((digX + rad) / VOX);
    const minY = Math.floor((digY - rad) / VOX);
    const maxY = Math.floor((digY + rad) / VOX);
    const minZ = Math.floor((digZ - rad) / VOX);
    const maxZ = Math.floor((digZ + rad) / VOX);
    const r2 = rad * rad;
    for (let ix = minX; ix <= maxX; ix += 1) {
      for (let iy = minY; iy <= maxY; iy += 1) {
        if (iy >= 0) continue;
        for (let iz = minZ; iz <= maxZ; iz += 1) {
          const dx = (ix + 0.5) * VOX - digX;
          const dy = (iy + 0.5) * VOX - digY;
          const dz = (iz + 0.5) * VOX - digZ;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 <= r2) list.push(d2, vkey(ix, iy, iz));
        }
      }
    }
    const order = [];
    for (let i = 0; i < list.length; i += 2) order.push(i);
    order.sort((a, b) => list[a] - list[b]);
    digList = [];
    for (let i = 0; i < order.length; i += 1) digList.push(list[order[i]], list[order[i] + 1]);
    digShown = 0;
  }

  function growDig(rad) {
    const r2 = rad * rad;
    while (digShown < digList.length && digList[digShown] <= r2) {
      dug.add(digList[digShown + 1]);
      digShown += 2;
    }
  }

  function touchesEarth() {
    const reach = 1.05;
    const minX = Math.floor((x - reach) / VOX);
    const maxX = Math.floor((x + reach) / VOX);
    const minY = Math.floor((y - reach) / VOX);
    const maxY = Math.floor((y + reach) / VOX);
    const minZ = Math.floor((z - reach) / VOX);
    const maxZ = Math.floor((z + reach) / VOX);
    const r2 = reach * reach;
    for (let ix = minX; ix <= maxX; ix += 1) {
      for (let iy = minY; iy <= maxY; iy += 1) {
        for (let iz = minZ; iz <= maxZ; iz += 1) {
          if (!isSolid(ix, iy, iz)) continue;
          const x0 = ix * VOX;
          const y0 = iy * VOX;
          const z0 = iz * VOX;
          const qx = x < x0 ? x0 : x > x0 + VOX ? x0 + VOX : x;
          const qy = y < y0 ? y0 : y > y0 + VOX ? y0 + VOX : y;
          const qz = z < z0 ? z0 : z > z0 + VOX ? z0 + VOX : z;
          const dx = x - qx;
          const dy = y - qy;
          const dz = z - qz;
          if (dx * dx + dy * dy + dz * dz < r2) return true;
        }
      }
    }
    return false;
  }

  function bumped() {
    if (touchesEarth()) return true;
    const pad = 1.05;
    for (let i = 0; i < tubes.length; i += 1) {
      const c = tubes[i];
      if (c[0] === 2) {
        if (z < c[6] - pad || z > c[7] + pad) continue;
        const dx = x - c[1];
        const dy = y - c[2];
        const dist = Math.hypot(dx, dy) || 0.001;
        const inner = c[5] > 0 && dist < (c[4] + c[5]) * 0.5;
        if (inner ? dist + pad > c[5] && dist < c[4] : dist - pad < c[4] && dist + pad > c[5]) return true;
      } else if (y > c[6] - pad && y < c[7] + pad) {
        const dx = x - c[1];
        const dz = z - c[3];
        const dist = Math.hypot(dx, dz) || 0.001;
        if (dist - pad < c[4] && dist + pad > c[5]) return true;
      }
    }
    return false;
  }

  function pointInObject(px, py, pz) {
    const margin = 0.45;
    const minX = Math.floor((px - margin) / VOX);
    const maxX = Math.floor((px + margin) / VOX);
    const minY = Math.floor((py - margin) / VOX);
    const maxY = Math.floor((py + margin) / VOX);
    const minZ = Math.floor((pz - margin) / VOX);
    const maxZ = Math.floor((pz + margin) / VOX);
    const r2 = margin * margin;
    for (let ix = minX; ix <= maxX; ix += 1) {
      for (let iy = minY; iy <= maxY; iy += 1) {
        for (let iz = minZ; iz <= maxZ; iz += 1) {
          if (!isSolid(ix, iy, iz)) continue;
          const x0 = ix * VOX;
          const y0 = iy * VOX;
          const z0 = iz * VOX;
          const qx = px < x0 ? x0 : px > x0 + VOX ? x0 + VOX : px;
          const qy = py < y0 ? y0 : py > y0 + VOX ? y0 + VOX : py;
          const qz = pz < z0 ? z0 : pz > z0 + VOX ? z0 + VOX : pz;
          const dx = px - qx;
          const dy = py - qy;
          const dz = pz - qz;
          if (dx * dx + dy * dy + dz * dz < r2) return true;
        }
      }
    }
    for (let i = 0; i < tubes.length; i += 1) {
      const c = tubes[i];
      const rOut = c[4] + margin;
      const rIn = c[5] > 0 ? Math.max(0, c[5] - margin) : 0;
      if (c[0] === 2) {
        if (pz < c[6] - margin || pz > c[7] + margin) continue;
        const dist = Math.hypot(px - c[1], py - c[2]);
        if (dist <= rOut && dist >= rIn) return true;
      } else if (py > c[6] - margin && py < c[7] + margin) {
        const dist = Math.hypot(px - c[1], pz - c[3]);
        if (dist <= rOut && dist >= rIn) return true;
      }
    }
    return false;
  }

  function caveHit(ox, oy, oz, dx, dy, dz, t0) {
    let t = t0 < 0.2 ? 0.2 : t0;
    for (let n = 0; n < 8; n += 1) {
      const py = oy + dy * t;
      if (py < 0) {
        let air = false;
        const px = ox + dx * t;
        const pz = oz + dz * t;
        for (let i = 0; i < digs.length; i += 1) {
          const s = digs[i];
          const sx = px - s.x;
          const sy = py - s.y;
          const sz = pz - s.z;
          if (sx * sx + sy * sy + sz * sz <= s.r2) {
            air = true;
            break;
          }
        }
        if (!air) return t;
      }
      t += 2.4;
    }
    return -1;
  }

  let bodyR2 = 0.2116;
  let bodyBack = -1.55;
  let bodyFront = 1.25;
  let noseTip = 2.45;
  let noseK2 = 0.2304;
  let frontR2 = 0.3364;
  let flameRoot = 0.253;
  let flameHole2 = 0.0676;
  let wingOut = 1.05;
  let wingZ = -0.85;
  let speedMul = 1;
  let fuelSec = 30;
  let mass = 1;
  let flameMul = 1;
  let shipFat = 1;
  let shipWing = 1;
  let fins = [
    [0.4, -0.06, -1.45, 1.05, 0.06, -0.25],
    [-1.05, -0.06, -1.45, -0.4, 0.06, -0.25],
    [-0.06, 0.4, -1.45, 0.06, 1.05, -0.25],
    [-0.06, -1.05, -1.45, 0.06, -0.4, -0.25],
  ];

  function rocketHit(ox, oy, oz, dx, dy, dz, ax) {
    const lx = (ox - meshX) * ax.rx + (oy - meshY) * ax.ry + (oz - meshZ) * ax.rz;
    const ly = (ox - meshX) * ax.ux + (oy - meshY) * ax.uy + (oz - meshZ) * ax.uz;
    const lz = (ox - meshX) * ax.fx + (oy - meshY) * ax.fy + (oz - meshZ) * ax.fz;
    const ldx = dx * ax.rx + dy * ax.ry + dz * ax.rz;
    const ldy = dx * ax.ux + dy * ax.uy + dz * ax.uz;
    const ldz = dx * ax.fx + dy * ax.fy + dz * ax.fz;
    let best = 40;
    let kind = 0;
    let hx = 0;
    let hy = 0;
    let hz = 0;
    const body = quadT(ldx * ldx + ldy * ldy, 2 * (lx * ldx + ly * ldy), lx * lx + ly * ly - bodyR2);
    if (body > 0.05 && body < best && lz + ldz * body > bodyBack && lz + ldz * body < bodyFront) {
      best = body;
      kind = 1;
      hx = lx + ldx * body;
      hy = ly + ldy * body;
      hz = lz + ldz * body;
    }
    const cone = quadT(
      ldx * ldx + ldy * ldy - noseK2 * ldz * ldz,
      2 * (lx * ldx + ly * ldy - noseK2 * (lz - noseTip) * ldz),
      lx * lx + ly * ly - noseK2 * (lz - noseTip) * (lz - noseTip)
    );
    if (cone > 0.05 && cone < best) {
      const hz = lz + ldz * cone;
      if (hz >= bodyFront && hz <= noseTip) {
        best = cone;
        kind = 2;
      }
    }
    if (flaming) {
      const flame = quadT(
        ldx * ldx + ldy * ldy - flameK2 * ldz * ldz,
        2 * (lx * ldx + ly * ldy - flameK2 * (lz - flameTip) * ldz),
        lx * lx + ly * ly - flameK2 * (lz - flameTip) * (lz - flameTip)
      );
      if (flame > 0.05 && flame < best) {
        const hz = lz + ldz * flame;
        if (hz <= bodyBack && hz >= flameTip) {
          best = flame;
          kind = 3;
        }
      }
    }
    for (let i = 0; i < 4; i += 1) {
      const f = fins[i];
      const hit = boxT(lx, ly, lz, ldx, ldy, ldz, f[0], f[1], f[2], f[3], f[4], f[5]);
      if (hit > 0.05 && hit < best) {
        best = hit;
        kind = 4;
      }
    }
    if (Math.abs(ldz) > 1e-8) {
      const back = (bodyBack - lz) / ldz;
      if (back > 0.05 && back < best) {
        const px = lx + ldx * back;
        const py = ly + ldy * back;
        const rr = px * px + py * py;
        if (rr <= bodyR2) {
          best = back;
          kind = flaming && rr <= flameHole2 ? 3 : 1;
          hx = px;
          hy = py;
          hz = bodyBack;
        }
      }
      const front = (bodyFront - lz) / ldz;
      if (front > 0.05 && front < best) {
        const hx = lx + ldx * front;
        const hy = ly + ldy * front;
        if (hx * hx + hy * hy <= frontR2) {
          best = front;
          kind = 2;
        }
      }
    }
    if (!kind) return null;
    return { t: best, kind, hx, hy, hz };
  }

  function paintPixel(hit) {
    if (boomRed() && hit.kind !== 3) {
      cR = 255;
      cG = 32;
      cB = 32;
      return;
    }
    if (hit.kind === 3) {
      cR = 255;
      cG = 148;
      cB = 42;
      return;
    }
    if (hit.kind === 1) {
      if (rocketId === "firework") {
        const span = bodyFront - bodyBack || 1;
        const u = (hit.hz - bodyBack) / span;
        let w = Math.atan2(hit.hy, hit.hx) - u * Math.PI * 2 * 2.5;
        w = ((w % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (w > Math.PI) w -= Math.PI * 2;
        if (Math.abs(w) < 0.42) {
          cR = 16;
          cG = 96;
          cB = 42;
          return;
        }
      }
      cR = bodyColor[0];
      cG = bodyColor[1];
      cB = bodyColor[2];
      return;
    }
    if (hit.kind === 2) {
      cR = noseColor[0];
      cG = noseColor[1];
      cB = noseColor[2];
      return;
    }
    cR = finColor[0];
    cG = finColor[1];
    cB = finColor[2];
  }

  let cR = 0;
  let cG = 0;
  let cB = 0;

  function showHud() {
    const speed = Math.hypot(vx, vy, vz);
    const locked = document.pointerLockElement === canvas;
    const lock = locked ? "" : "  ·  클릭해서 조종";
    const place = onRail ? (locked ? "발사대  ·  좌클릭으로 발사  ·  " : "발사대  ·  ") : "";
    hud.textContent = place + "속도 " + Math.round(speed) + "  ·  레이저를 따라 미끄러짐" + lock;
    fuelFill.style.transform = "scaleY(" + Math.max(0, fuel) + ")";
    cats.hidden = !(onRail && !railLocked);
  }

  function shipById(id) {
    if (id === "heavy") return heavyShip;
    if (id === "firework") return fireworkShip;
    return basicShip;
  }

  function dropCorpse(px, py, pz, pvx, pvy, pvz, yaw, pitch, look) {
    const body = Object.assign({}, look, { showFlame: false });
    corpses.push({
      x: px,
      y: py,
      z: pz,
      vx: pvx,
      vy: pvy,
      vz: pvz,
      yaw: yaw,
      pitch: pitch,
      look: body,
      ax: axes(yaw, pitch),
    });
    if (corpses.length > 24) corpses.shift();
  }

  function dropPlayer() {
    dropCorpse(x, y, z, vx, vy, vz, yaw, pitch, makeLook(shipById(rocketId)));
  }

  function dropFoe(foe) {
    const yaw = Math.atan2(foe.ax.fx, foe.ax.fz);
    const pitch = Math.asin(Math.max(-1, Math.min(1, foe.ax.fy)));
    dropCorpse(foe.x, foe.y, foe.z, foe.vx, foe.vy, foe.vz, yaw, pitch, foe.look);
  }

  function stepCorpses(dt) {
    const down = -Math.PI / 2;
    for (let i = 0; i < corpses.length; i += 1) {
      const c = corpses[i];
      if (c.y > 1.15) {
        c.vy -= 32 * dt;
        const drag = Math.exp(-0.35 * dt);
        c.vx *= drag;
        c.vz *= drag;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
      }
      if (c.y < 1.15) {
        c.y = 1.15;
        c.vx = 0;
        c.vy = 0;
        c.vz = 0;
      }
      c.pitch += (down - c.pitch) * Math.min(1, dt * 1.6);
      c.ax = axes(c.yaw, c.pitch);
    }
  }

  let downTime = 0;

  function resetPlayer() {
    x = spawnX;
    y = spawnY;
    z = spawnZ;
    vx = 0;
    vy = 0;
    vz = 0;
    yaw = aimYaw;
    pitch = aimPitch;
    const aim = forward(aimYaw, aimPitch);
    laserX = x + aim[0] * 18;
    laserY = y + aim[1] * 18;
    laserZ = z + aim[2] * 18;
    onRail = true;
    railLocked = false;
    railDist = 0;
    fuel = 1;
    hurt = 0;
    boomWait = 0;
    for (let i = 0; i < spawnPads.length; i += 1) {
      spawnPads[i].hp = 150;
      spawnPads[i].hurt = 0;
      spawnPads[i].alive = true;
    }
    foesOn = false;
    foes = [];
    downTime = 0;
  }

  function downPlayer(quiet) {
    if (downTime > 0) return;
    if (!quiet) playNoise(0.2, 0.06, 180);
    dropPlayer();
    vx = 0;
    vy = 0;
    vz = 0;
    boomWait = 0;
    downTime = 5;
    engineOff();
  }

  const sparks = [];
  const pops = [];
  const sparkYellow = [245, 208, 40];
  let dying = false;
  let boomWait = 0;
  let boomClock = 0;
  let audioCtx = null;
  let engine = null;
  let engineGain = null;
  let crack = 0;

  function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function playTone(freq, dur, type, vol, slide) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function playNoise(dur, vol, freq) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const n = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(t);
  }

  function playClick() {
    playTone(520, 0.06, "square", 0.04, 320);
  }

  function playLaunch() {
    playTone(180, 0.28, "sawtooth", 0.06, 520);
    playNoise(0.22, 0.05, 900);
  }

  function playHit() {
    playNoise(0.08, 0.07, 420);
    playTone(140, 0.07, "square", 0.04, 70);
  }

  function playFuse() {
    playTone(880, 0.08, "square", 0.05, 660);
  }

  function playBoom() {
    playNoise(0.45, 0.12, 240);
    playTone(90, 0.35, "sawtooth", 0.07, 40);
  }

  function engineOn() {
    if (!audioCtx || engine) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 62;
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    engine = osc;
    engineGain = gain;
  }

  function engineOff() {
    if (!engine || !audioCtx) return;
    const t = audioCtx.currentTime;
    engineGain.gain.cancelScheduledValues(t);
    engineGain.gain.setValueAtTime(Math.max(0.001, engineGain.gain.value), t);
    engineGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    engine.stop(t + 0.12);
    engine = null;
    engineGain = null;
  }

  function armBoom() {
    if (rocketId !== "firework" || boomWait > 0 || dying) return;
    boomWait = 2;
    boomClock = 0;
    playFuse();
  }

  function boomRed() {
    return boomWait > 0 && Math.floor(boomClock / 0.5) % 2 === 0;
  }

  function blast() {
    const reach = 12;
    for (let i = foes.length - 1; i >= 0; i -= 1) {
      const foe = foes[i];
      const dx = foe.x - x;
      const dy = foe.y - y;
      const dz = foe.z - z;
      if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
      foe.fuel = Math.max(0, foe.fuel - 20 / 100);
      popText(foe.x, foe.y + 2, foe.z, "때림 20", "#ffe14a");
      if (foe.fuel <= 0) {
        burstAt(foe.x, foe.y, foe.z, 14);
        dropFoe(foe);
        foes.splice(i, 1);
      }
    }
    boomWait = 0;
    die();
  }

  function addSpark(ox, oy, oz, dx, dy, dz, power, spread) {
    const j = power * (0.55 + Math.random() * 0.5);
    const s = spread == null ? power : spread;
    sparks.push({
      x: ox,
      y: oy,
      z: oz,
      vx: dx * j + (Math.random() - 0.5) * s,
      vy: dy * j + (Math.random() - 0.5) * s,
      vz: dz * j + (Math.random() - 0.5) * s,
      life: 0.45 + Math.random() * 0.4,
      max: 0.85,
      color: sparkYellow,
    });
    if (sparks.length > 420) sparks.splice(0, sparks.length - 420);
  }

  function burstAt(ox, oy, oz, n) {
    for (let i = 0; i < n; i += 1) {
      const ay = Math.random() * Math.PI * 2;
      const ap = Math.random() * Math.PI - Math.PI / 2;
      addSpark(ox, oy, oz, Math.cos(ay) * Math.cos(ap), Math.sin(ap), Math.sin(ay) * Math.cos(ap), 18);
    }
  }

  function die() {
    if (dying) return;
    dying = true;
    playBoom();
    burstAt(x, y, z, 40);
    downPlayer(true);
  }

  function makeLook(spec) {
    const fat = spec.fat;
    const len = spec.len;
    const bodyR2 = 0.46 * fat * (0.46 * fat);
    const bodyBack = -1.55 * len;
    const bodyFront = 1.25 * len;
    const noseTip = bodyFront + 1.2 * len;
    const noseK = 0.48 * fat / len;
    const noseK2 = noseK * noseK;
    const frontR2 = 0.58 * fat * (0.58 * fat);
    const flameLen = 1.15 * 1.5 * spec.flame;
    const flameRoot = 0.253 * spec.flame;
    const flameK = flameRoot / flameLen;
    const hole = 0.26 * spec.flame;
    const inner = 0.4 * fat;
    const outer = inner + 0.65 * spec.wing;
    const thick = 0.06 * fat;
    const z0 = -1.45 * len;
    const z1 = -0.25 * len;
    return {
      spec: spec,
      bodyR2: bodyR2,
      bodyBack: bodyBack,
      bodyFront: bodyFront,
      noseTip: noseTip,
      noseK2: noseK2,
      frontR2: frontR2,
      flameK2: flameK * flameK,
      flameTip: bodyBack - flameLen,
      flameHole2: hole * hole,
      spiral: spec.id === "firework",
      showFlame: spec.id !== "firework",
      fins: [
        [inner, -thick, z0, outer, thick, z1],
        [-outer, -thick, z0, -inner, thick, z1],
        [-thick, inner, z0, thick, outer, z1],
        [-thick, -outer, z0, thick, -inner, z1],
      ],
    };
  }

  function spawnFoes() {
    foesOn = true;
    const kinds = [basicShip, heavyShip, fireworkShip];
    const shot = forward(Math.PI, 0.2);
    const speed = 26;
    foes = [0].map((side) => {
      const spec = kinds[(Math.random() * kinds.length) | 0];
      return {
        x: foePadX,
        y: foePadY,
        z: foePadZ,
        vx: shot[0] * speed,
        vy: shot[1] * speed,
        vz: shot[2] * speed,
        fuel: 1,
        hurt: 0,
        charge: 0,
        boom: 0,
        boomClock: 0,
        tx: spawnX,
        ty: spawnY,
        tz: spawnZ,
        look: makeLook(spec),
        ax: axes(Math.PI, 0.2),
      };
    });
  }

  const hitHalf = 1.85;

  function ramDamage(speed) {
    return Math.floor(speed / 10) * 10 / 5;
  }

  function harm(amount) {
    if (hurt > 0 || dying || downTime > 0 || amount <= 0) return false;
    fuel = Math.max(0, fuel - amount / 100);
    hurt = 0.55;
    playHit();
    if (fuel <= 0 && boomWait <= 0) {
      if (rocketId === "firework") armBoom();
      else downPlayer();
    }
    return true;
  }

  function armFoeBoom(foe) {
    if (!foe.look.spiral || foe.boom > 0) return false;
    foe.boom = 2;
    foe.boomClock = 0;
    playFuse();
    return true;
  }

  function explodeFoe(foe) {
    playBoom();
    burstAt(foe.x, foe.y, foe.z, 40);
    dropFoe(foe);
    const reach2 = 144;
    for (let j = 0; j < foes.length; j += 1) {
      const other = foes[j];
      if (other === foe || other.boom > 0) continue;
      const ox = other.x - foe.x;
      const oy = other.y - foe.y;
      const oz = other.z - foe.z;
      if (ox * ox + oy * oy + oz * oz > reach2) continue;
      other.fuel = Math.max(0, other.fuel - 0.2);
      popText(other.x, other.y + 2, other.z, "때림 20", "#ffe14a");
      if (other.fuel <= 0) armFoeBoom(other);
    }
    const dx = x - foe.x;
    const dy = y - foe.y;
    const dz = z - foe.z;
    if (dx * dx + dy * dy + dz * dz <= reach2) harm(20);
  }

  function stepFoes(dt) {
    if (hurt > 0) hurt -= dt;
    if (!foesOn) return;
    for (let i = 0; i < foes.length; i += 1) {
      const foe = foes[i];
      if (foe.boom > 0) {
        foe.boomClock += dt;
        foe.boom -= dt;
        if (foe.boom <= 0) {
          explodeFoe(foe);
          if (!foesOn || dying) return;
          foes.splice(i, 1);
          i -= 1;
          continue;
        }
      } else {
        foe.fuel = Math.max(0, foe.fuel - dt / 30);
        if (foe.fuel <= 0 && !armFoeBoom(foe)) {
          burstAt(foe.x, foe.y, foe.z, 14);
          dropFoe(foe);
          foes.splice(i, 1);
          i -= 1;
          continue;
        }
      }
      const pdx = x - foe.x;
      const pdy = y - foe.y;
      const pdz = z - foe.z;
      const pdist = Math.hypot(pdx, pdy, pdz) || 0.001;
      const ahead = 0.32;
      if (pdist > 16) {
        if (foe.charge <= 0) {
          foe.tx = x + vx * ahead;
          foe.ty = y + vy * ahead;
          foe.tz = z + vz * ahead;
          foe.charge = 0.9;
          if (pdist > 26) {
            const bx = foe.x - foe.tx;
            const by = foe.y - foe.ty;
            const bz = foe.z - foe.tz;
            const bl = Math.hypot(bx, by, bz) || 1;
            for (let s = 0; s < 5; s += 1) addSpark(foe.x, foe.y, foe.z, bx / bl, by / bl, bz / bl, 14, 1.4);
          }
        }
        foe.charge -= dt;
      } else {
        foe.charge = 0;
        foe.tx = x + vx * ahead;
        foe.ty = y + vy * ahead;
        foe.tz = z + vz * ahead;
      }
      let dx = foe.tx - foe.x;
      let dy = foe.ty - foe.y;
      let dz = foe.tz - foe.z;
      const dist = Math.hypot(dx, dy, dz) || 0.001;
      dx /= dist;
      dy /= dist;
      dz /= dist;
      const charging = pdist > 16;
      const accel = charging ? 34 : 22;
      const cap = charging ? 24 : 18;
      foe.vx += dx * accel * dt;
      foe.vy += dy * accel * dt;
      foe.vz += dz * accel * dt;
      const sp = Math.hypot(foe.vx, foe.vy, foe.vz);
      if (sp > cap) {
        const cut = cap / sp;
        foe.vx *= cut;
        foe.vy *= cut;
        foe.vz *= cut;
      }
      foe.x += foe.vx * dt;
      foe.y += foe.vy * dt;
      foe.z += foe.vz * dt;
      if (foe.y < 2.2) foe.y = 2.2;
      const yaw = Math.atan2(dx, dz);
      const pitch = Math.asin(Math.max(-1, Math.min(1, dy)));
      foe.ax = axes(yaw, pitch);
      if (foe.hurt > 0) foe.hurt -= dt;
      const overlap = Math.abs(x - foe.x) < hitHalf * 2 && Math.abs(y - foe.y) < hitHalf * 2 && Math.abs(z - foe.z) < hitHalf * 2;
      if (!overlap) continue;
      const pSpeed = Math.hypot(vx, vy, vz);
      const fSpeed = Math.hypot(foe.vx, foe.vy, foe.vz);
      if (foe.hurt <= 0) {
        const dealt = ramDamage(pSpeed);
        if (dealt > 0) {
          foe.fuel = Math.max(0, foe.fuel - dealt / 100);
          foe.hurt = 0.5;
          playHit();
          popText(foe.x, foe.y + 2, foe.z, "때림 " + dealt, "#ffe14a");
        }
      }
      if (rocketId === "firework" && pSpeed > 20) armBoom();
      harm(ramDamage(fSpeed));
      if (!foesOn || dying) return;
      if (foe.fuel <= 0 && foe.boom <= 0 && !armFoeBoom(foe)) {
        burstAt(foe.x, foe.y, foe.z, 14);
        dropFoe(foe);
        foes.splice(i, 1);
        i -= 1;
        continue;
      }
      const ox = foe.x - x;
      const oy = foe.y - y;
      const oz = foe.z - z;
      const penX = hitHalf * 2 - Math.abs(ox);
      const penY = hitHalf * 2 - Math.abs(oy);
      const penZ = hitHalf * 2 - Math.abs(oz);
      if (penX <= penY && penX <= penZ) {
        const s = ox < 0 ? -1 : 1;
        foe.x += s * (penX + 0.2);
        foe.vx = s * 10;
      } else if (penY <= penZ) {
        const s = oy < 0 ? -1 : 1;
        foe.y += s * (penY + 0.2);
        foe.vy = s * 10;
      } else {
        const s = oz < 0 ? -1 : 1;
        foe.z += s * (penZ + 0.2);
        foe.vz = s * 10;
      }
    }
  }

  function foeRay(ox, oy, oz, dx, dy, dz, foe) {
    const ax = foe.ax;
    const g = foe.look;
    const lx = (ox - foe.x) * ax.rx + (oy - foe.y) * ax.ry + (oz - foe.z) * ax.rz;
    const ly = (ox - foe.x) * ax.ux + (oy - foe.y) * ax.uy + (oz - foe.z) * ax.uz;
    const lz = (ox - foe.x) * ax.fx + (oy - foe.y) * ax.fy + (oz - foe.z) * ax.fz;
    const ldx = dx * ax.rx + dy * ax.ry + dz * ax.rz;
    const ldy = dx * ax.ux + dy * ax.uy + dz * ax.uz;
    const ldz = dx * ax.fx + dy * ax.fy + dz * ax.fz;
    let best = 160;
    let kind = 0;
    let hx = 0;
    let hy = 0;
    let hz = 0;
    const body = quadT(ldx * ldx + ldy * ldy, 2 * (lx * ldx + ly * ldy), lx * lx + ly * ly - g.bodyR2);
    if (body > 0.05 && body < best && lz + ldz * body > g.bodyBack && lz + ldz * body < g.bodyFront) {
      best = body;
      kind = 1;
      hx = lx + ldx * body;
      hy = ly + ldy * body;
      hz = lz + ldz * body;
    }
    const cone = quadT(
      ldx * ldx + ldy * ldy - g.noseK2 * ldz * ldz,
      2 * (lx * ldx + ly * ldy - g.noseK2 * (lz - g.noseTip) * ldz),
      lx * lx + ly * ly - g.noseK2 * (lz - g.noseTip) * (lz - g.noseTip)
    );
    if (cone > 0.05 && cone < best) {
      const cz = lz + ldz * cone;
      if (cz >= g.bodyFront && cz <= g.noseTip) {
        best = cone;
        kind = 2;
      }
    }
    if (g.showFlame) {
      const flame = quadT(
        ldx * ldx + ldy * ldy - g.flameK2 * ldz * ldz,
        2 * (lx * ldx + ly * ldy - g.flameK2 * (lz - g.flameTip) * ldz),
        lx * lx + ly * ly - g.flameK2 * (lz - g.flameTip) * (lz - g.flameTip)
      );
      if (flame > 0.05 && flame < best) {
        const fz = lz + ldz * flame;
        if (fz <= g.bodyBack && fz >= g.flameTip) {
          best = flame;
          kind = 3;
        }
      }
    }
    const fins = g.fins;
    for (let i = 0; i < 4; i += 1) {
      const f = fins[i];
      const hit = boxT(lx, ly, lz, ldx, ldy, ldz, f[0], f[1], f[2], f[3], f[4], f[5], 160);
      if (hit > 0.05 && hit < best) {
        best = hit;
        kind = 4;
      }
    }
    if (!kind) return null;
    return { t: best, kind: kind, hx: hx, hy: hy, hz: hz };
  }

  function foeColor(hit, look, fuseRed) {
    if (fuseRed && hit.kind !== 3) return [255, 32, 32];
    if (hit.kind === 3) return [255, 148, 42];
    if (hit.kind === 1) {
      if (look.spiral) {
        const span = look.bodyFront - look.bodyBack || 1;
        const u = (hit.hz - look.bodyBack) / span;
        let w = Math.atan2(hit.hy, hit.hx) - u * Math.PI * 2 * 2.5;
        w = ((w % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (w > Math.PI) w -= Math.PI * 2;
        if (Math.abs(w) < 0.42) return [16, 96, 42];
      }
      return look.spec.body;
    }
    if (hit.kind === 2) return look.spec.nose;
    return look.spec.fin;
  }

  let shotCamX = 0;
  let shotCamY = 0;
  let shotCamZ = 0;
  let shotLx = 0;
  let shotLy = 0;
  let shotLz = 1;
  let shotRx = 1;
  let shotRy = 0;
  let shotRz = 0;
  let shotUx = 0;
  let shotUy = 1;
  let shotUz = 0;
  let shotTan = 2.2;
  let shotAspect = 1;

  function drawBoom() {
    const age = 1 - boom / 2;
    const vxw = boomX - shotCamX;
    const vyw = boomY - shotCamY;
    const vzw = boomZ - shotCamZ;
    const df = vxw * shotLx + vyw * shotLy + vzw * shotLz;
    if (df < 0.25) return;
    const dr = vxw * shotRx + vyw * shotRy + vzw * shotRz;
    const du = vxw * shotUx + vyw * shotUy + vzw * shotUz;
    const cx = ((dr / (df * shotAspect * shotTan)) + 1) * 0.5 * bw;
    const cy = (1 - du / (df * shotTan)) * 0.5 * bh;
    const radius = Math.max(3, (1.2 + age * boomRad) * (bh * 0.5) / (df * shotTan));
    const r0 = Math.floor(radius);
    for (let py = -r0; py <= r0; py += 1) {
      for (let px = -r0; px <= r0; px += 1) {
        const d = Math.hypot(px, py);
        if (d > radius || d < radius * 0.32) continue;
        const sx = Math.floor(cx + px);
        const sy = Math.floor(cy + py);
        if (sx < 0 || sy < 0 || sx >= bw || sy >= bh) continue;
        const edge = d / radius;
        if (edge > 0.82) ctx.fillStyle = "#5a4038";
        else if (edge > 0.62) ctx.fillStyle = "#e23a22";
        else if (edge > 0.48) ctx.fillStyle = "#ffb02e";
        else ctx.fillStyle = "#fff2c4";
        ctx.fillRect(sx, sy, 1, 1);
      }
    }
  }

  function projectShot(wx, wy, wz) {
    const vxw = wx - shotCamX;
    const vyw = wy - shotCamY;
    const vzw = wz - shotCamZ;
    const df = vxw * shotLx + vyw * shotLy + vzw * shotLz;
    if (df < 0.2) return null;
    const dr = vxw * shotRx + vyw * shotRy + vzw * shotRz;
    const du = vxw * shotUx + vyw * shotUy + vzw * shotUz;
    return [
      ((dr / (df * shotAspect * shotTan)) + 1) * 0.5 * bw,
      (1 - du / (df * shotTan)) * 0.5 * bh,
    ];
  }

  function wingPoints(body) {
    const tips = [
      [wingOut, 0, wingZ],
      [-wingOut, 0, wingZ],
      [0, wingOut, wingZ],
      [0, -wingOut, wingZ],
    ];
    const out = [];
    for (let i = 0; i < tips.length; i += 1) {
      const tip = tips[i];
      out.push([
        meshX + body.rx * tip[0] + body.ux * tip[1] + body.fx * tip[2],
        meshY + body.ry * tip[0] + body.uy * tip[1] + body.fy * tip[2],
        meshZ + body.rz * tip[0] + body.uz * tip[1] + body.fz * tip[2],
      ]);
    }
    return out;
  }

  function strokeWorld(ax, ay, az, bx, by, bz, size) {
    const a = projectShot(ax, ay, az);
    const b = projectShot(bx, by, bz);
    if (!a || !b) return;
    const w = size || 2;
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let s = 0; s <= steps; s += 1) {
      const u = s / steps;
      const sx = Math.floor(a[0] + (b[0] - a[0]) * u);
      const sy = Math.floor(a[1] + (b[1] - a[1]) * u);
      if (sx < 0 || sy < 0 || sx >= bw || sy >= bh) continue;
      ctx.fillRect(sx, sy, w, w);
    }
  }

  const spawnRingR = 3.4;
  const spawnTubeR = 0.85;
  const foePadX = 0;
  const foePadY = 8;
  const foePadZ = 86;
  const spawnPads = [
    { mine: true, x: spawnX, y: spawnY, z: spawnZ, hp: 150, hurt: 0, alive: true },
    { mine: false, x: foePadX, y: foePadY, z: foePadZ, hp: 150, hurt: 0, alive: true },
  ];

  function hitSpawns(dt) {
    if (downTime > 0) return;
    const speed = Math.hypot(vx, vy, vz);
    const tubeReach = spawnTubeR + hitHalf;
    for (let i = 0; i < spawnPads.length; i += 1) {
      const pad = spawnPads[i];
      if (!pad.alive) continue;
      if (pad.hurt > 0) pad.hurt -= dt;
      const radial = Math.hypot(x - pad.x, y - pad.y);
      const tube = Math.hypot(radial - spawnRingR, z - pad.z);
      const hit = tube < tubeReach;
      if (!hit || pad.mine || pad.hurt > 0) continue;
      if (rocketId === "firework" && speed > 20) armBoom();
      const dealt = ramDamage(speed);
      if (dealt <= 0) continue;
      pad.hp = Math.max(0, pad.hp - dealt);
      pad.hurt = 0.5;
      playHit();
      popText(pad.x, pad.y + 3, pad.z, "때림 " + dealt, "#ffe14a");
      if (pad.hp <= 0) {
        pad.alive = false;
        burstAt(pad.x, pad.y, pad.z, 22);
        playBoom();
      }
    }
  }
  function ringHit(ox, oy, oz, dx, dy, dz, pad) {
    const px = ox - pad.x;
    const py = oy - pad.y;
    const pz = oz - pad.z;
    let t = 0.05;
    for (let i = 0; i < 28; i += 1) {
      const sx = px + dx * t;
      const sy = py + dy * t;
      const sz = pz + dz * t;
      const dist = Math.hypot(Math.hypot(sx, sy) - spawnRingR, sz) - spawnTubeR;
      if (dist < 0.05) return t;
      t += Math.max(0.05, dist);
      if (t > 160) return -1;
    }
    return -1;
  }

  function drawTrail() {
    if (trail.length < 1) return;
    ctx.fillStyle = "rgba(214, 232, 255, 0.5)";
    const live = Math.hypot(vx, vy, vz) >= 15 ? wingPoints(axes(meshYaw, meshPitch)) : null;
    for (let w = 0; w < 4; w += 1) {
      let prev = null;
      for (let i = 0; i <= trail.length; i += 1) {
        const spot = i < trail.length ? trail[i].w[w] : live ? live[w] : null;
        if (!spot) break;
        const p = projectShot(spot[0], spot[1], spot[2]);
        if (prev && p) {
          const steps = Math.max(1, Math.ceil(Math.hypot(p[0] - prev[0], p[1] - prev[1])));
          for (let s = 0; s <= steps; s += 1) {
            const u = s / steps;
            const sx = Math.floor(prev[0] + (p[0] - prev[0]) * u);
            const sy = Math.floor(prev[1] + (p[1] - prev[1]) * u);
            if (sx < 0 || sy < 0 || sx >= bw || sy >= bh) continue;
            ctx.fillRect(sx, sy, 1, 1);
          }
        }
        prev = p;
      }
    }
  }

  function popText(wx, wy, wz, text, color) {
    pops.push({ x: wx, y: wy, z: wz, text: text, color: color, life: 0.7, max: 0.7 });
    if (pops.length > 12) pops.splice(0, pops.length - 12);
  }

  function drawPops() {
    ctx.font = "700 16px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < pops.length; i += 1) {
      const pop = pops[i];
      const vxw = pop.x - shotCamX;
      const vyw = pop.y - shotCamY;
      const vzw = pop.z - shotCamZ;
      const df = vxw * shotLx + vyw * shotLy + vzw * shotLz;
      if (df < 0.2 || df > 160) continue;
      const p = projectShot(pop.x, pop.y, pop.z);
      if (!p) continue;
      const a = Math.max(0, pop.life / pop.max);
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = a;
      ctx.fillText(pop.text, Math.floor(p[0]), Math.floor(p[1]));
    }
    ctx.globalAlpha = 1;
  }

  function drawSparks() {
    for (let i = 0; i < sparks.length; i += 1) {
      const s = sparks[i];
      const p = projectShot(s.x, s.y, s.z);
      if (!p) continue;
      const a = Math.max(0, s.life / s.max);
      const c = s.color;
      ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
      const sz = a > 0.45 ? 2 : 1;
      ctx.fillRect(Math.floor(p[0]), Math.floor(p[1]), sz, sz);
    }
  }

  function applyShip(spec) {
    bodyColor = spec.body;
    noseColor = spec.nose;
    finColor = spec.fin;
    const fat = spec.fat;
    const len = spec.len;
    bodyR2 = 0.46 * fat * (0.46 * fat);
    bodyBack = -1.55 * len;
    bodyFront = 1.25 * len;
    noseTip = bodyFront + 1.2 * len;
    const noseK = 0.48 * fat / len;
    noseK2 = noseK * noseK;
    frontR2 = 0.58 * fat * (0.58 * fat);
    flameMul = spec.flame;
    flameRoot = 0.253 * flameMul;
    const hole = 0.26 * flameMul;
    flameHole2 = hole * hole;
    const inner = 0.4 * fat;
    const outer = inner + 0.65 * spec.wing;
    const thick = 0.06 * fat;
    const z0 = -1.45 * len;
    const z1 = -0.25 * len;
    fins = [
      [inner, -thick, z0, outer, thick, z1],
      [-outer, -thick, z0, -inner, thick, z1],
      [-thick, inner, z0, thick, outer, z1],
      [-thick, -outer, z0, thick, -inner, z1],
    ];
    wingOut = outer;
    wingZ = (z0 + z1) * 0.5;
    speedMul = spec.speed;
    fuelSec = 30 * spec.fuel;
    mass = spec.mass;
    shipFat = fat;
    shipWing = spec.wing;
    fuelFill.style.background = "rgb(" + bodyColor[0] + "," + bodyColor[1] + "," + bodyColor[2] + ")";
  }

  function pickRocket(spec) {
    rocketId = spec.id;
    applyShip(spec);
    if (onRail && !railLocked) fuel = 1;
  }

  function paintRocketCanvas(pctx, gw, gh) {
    if (pctx.canvas.width !== gw) {
      pctx.canvas.width = gw;
      pctx.canvas.height = gh;
      pctx.imageSmoothingEnabled = false;
    }
    const shot = pctx.createImageData(gw, gh);
    const pix = shot.data;
    const keepX = meshX;
    const keepY = meshY;
    const keepZ = meshZ;
    meshX = 0;
    meshY = 0;
    meshZ = 0;
    const ax = axes(0, 0);
    const look = axes(Math.PI * 8 / 9, -Math.PI / 4);
    const dist = 3.6 * Math.max(1, shipWing * 0.42 + shipFat * 0.35);
    const cx = -look.fx * dist;
    const cy = -look.fy * dist;
    const cz = -look.fz * dist;
    const tan = 0.72;
    const aspect = gw / gh;
    for (let sy = 0; sy < gh; sy += 1) {
      const ndcY = 1 - ((sy + 0.5) / gh) * 2;
      for (let sx = 0; sx < gw; sx += 1) {
        const ndcX = ((sx + 0.5) / gw) * 2 - 1;
        let dx = look.fx + look.rx * ndcX * aspect * tan + look.ux * ndcY * tan;
        let dy = look.fy + look.ry * ndcX * aspect * tan + look.uy * ndcY * tan;
        let dz = look.fz + look.rz * ndcX * aspect * tan + look.uz * ndcY * tan;
        const dl = Math.hypot(dx, dy, dz) || 1;
        dx /= dl;
        dy /= dl;
        dz /= dl;
        const hit = rocketHit(cx, cy, cz, dx, dy, dz, ax);
        const i = (sy * gw + sx) * 4;
        if (!hit) {
          pix[i + 3] = 0;
          continue;
        }
        paintPixel(hit);
        pix[i] = cR;
        pix[i + 1] = cG;
        pix[i + 2] = cB;
        pix[i + 3] = 255;
      }
    }
    meshX = keepX;
    meshY = keepY;
    meshZ = keepZ;
    pctx.putImageData(shot, 0, 0);
  }

  function shotRocket(target, spec) {
    const keep = rocketId;
    rocketId = spec.id;
    applyShip(spec);
    paintRocketCanvas(target.getContext("2d", { alpha: true }), 120, 90);
    rocketId = keep;
    applyShip(shipById(keep));
  }

  function catButton(spec, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", spec.name);
    const pic = document.createElement("canvas");
    btn.appendChild(pic);
    if (rocketId === spec.id) btn.classList.add("on");
    btn.addEventListener("click", onClick);
    shotRocket(pic, spec);
    return btn;
  }

  function paintCats() {
    catList.textContent = "";
    rocketCats.forEach((group) => {
      catList.appendChild(catButton(group.ship, (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCat = openCat === group.ship.id ? "" : group.ship.id;
        unlockAudio();
        playClick();
        pickRocket(group.ship);
        paintCats();
      }));
      const sub = document.createElement("div");
      sub.className = "sub";
      sub.hidden = openCat !== group.ship.id;
      group.kids.forEach((kid) => {
        sub.appendChild(catButton(kid, (e) => {
          e.preventDefault();
          e.stopPropagation();
          unlockAudio();
          playClick();
          pickRocket(kid);
          paintCats();
        }));
      });
      catList.appendChild(sub);
    });
  }

  applyShip(basicShip);
  paintCats();

  function drawPreview() {
    paintRocketCanvas(previewCtx, 140, 160);
  }

  resize();
  window.addEventListener("resize", resize);
  if (pick) {
    pick.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      unlockAudio();
      playClick();
      screenMode = btn.dataset.screen || "pc";
      pick.hidden = true;
      if (fireBtn) fireBtn.hidden = screenMode !== "phone" && screenMode !== "pad";
      resize();
    });
  }
  function pressPlay() {
    if (!onRail || railLocked || launchKick) return;
    unlockAudio();
    launchKick = true;
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
  }
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("mousedown", (e) => {
    if (e.button === 2) pressRight(e);
  }, true);
  document.addEventListener("mouseup", (e) => {
    if (e.button === 2) releaseRight(e);
  }, true);
  document.addEventListener("pointerdown", (e) => {
    if (e.button === 2) pressRight(e);
  }, true);
  document.addEventListener("pointerup", (e) => {
    if (e.button === 2) releaseRight(e);
  }, true);
  window.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest && (e.target.closest("#cats") || e.target.closest("#pick") || e.target.closest("#fire"))) return;
    if (pick && !pick.hidden) return;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
      return;
    }
    pressPlay();
  });
  window.addEventListener("blur", () => {
    rightHeld = false;
  });
  if (fireBtn) {
    fireBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fireBtn.setPointerCapture(e.pointerId);
      pressRight(e);
    });
    fireBtn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      rightHeld = false;
    });
    fireBtn.addEventListener("pointercancel", () => {
      rightHeld = false;
    });
    fireBtn.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  document.addEventListener("pointerlockchange", showHud);
  window.addEventListener("mousemove", (e) => {
    const locked = document.pointerLockElement === canvas;
    const waiting = onRail && !railLocked && !launchKick;
    if (waiting && !locked && Math.hypot(e.movementX, e.movementY) > 28) return;
    aimYaw += e.movementX * 0.0022;
    aimPitch -= e.movementY * 0.0022;
    if (aimPitch > 1.15) aimPitch = 1.15;
    if (aimPitch < -1.15) aimPitch = -1.15;
  });

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    dying = false;
    if (downTime > 0) {
      downTime -= dt;
      engineOff();
      flaming = false;
      if (downTime <= 0) resetPlayer();
    }
    const infinite = boomWait > 0 && downTime <= 0;
    const thrusting = downTime <= 0 && rightHeld && (fuel > 0 || infinite);
    flaming = thrusting && rocketId !== "firework";
    if (downTime <= 0 && thrusting && !onRail && !infinite) fuel = Math.max(0, fuel - dt / fuelSec);
    if (downTime <= 0 && !onRail && !infinite && fuel <= 0) {
      if (rocketId === "firework") armBoom();
      else downPlayer();
    }
    if (thrusting) {
      engineOn();
      if (engine) engine.frequency.setTargetAtTime(58 + boost * 46, audioCtx.currentTime, 0.05);
    } else engineOff();
    boost += ((thrusting ? 1 : 0) - boost) * Math.min(1, dt * 7);
    const flameLen = 1.15 * (1 + boost * 0.5) * flameMul;
    flameTip = bodyBack - flameLen;
    const flameK = flameRoot / flameLen;
    flameK2 = flameK * flameK;
    if (rocketId === "firework" && thrusting) {
      crack -= dt;
      if (crack <= 0) {
        crack = 0.14;
        playNoise(0.05, 0.028, 2200);
      }
      const b = axes(yaw, pitch);
      const tx = x + b.fx * bodyBack;
      const ty = y + b.fy * bodyBack;
      const tz = z + b.fz * bodyBack;
      if (Math.random() < 0.55) burstAt(tx, ty, tz, 16);
      if (Math.hypot(vx, vy, vz) > 1) {
        for (let i = 0; i < 6; i += 1) addSpark(tx, ty, tz, -b.fx, -b.fy, -b.fz, 18, 2.2);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      s.vy -= 9 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
    }
    for (let i = pops.length - 1; i >= 0; i -= 1) {
      const pop = pops[i];
      pop.life -= dt;
      pop.y += dt * 1.6;
      if (pop.life <= 0) pops.splice(i, 1);
    }
    if (downTime > 0) {
      flaming = false;
    } else if (boom > 0) {
      boom -= dt;
      if (boom <= 0) {
        boom = 0;
        downPlayer();
      }
    } else if (fuse > 0) {
      fuse -= dt;
      shakeT += dt;
      if (fuse <= 0) {
        fuse = 0;
        downPlayer();
      }
    } else {
      const aim = forward(aimYaw, aimPitch);
      const lead = 1 - Math.exp(-7 * dt);
      laserX += (x + aim[0] * 18 - laserX) * lead;
      laserY += (y + aim[1] * 18 - laserY) * lead;
      laserZ += (z + aim[2] * 18 - laserZ) * lead;
      if (onRail) {
        if (!railLocked) {
          if (launchKick || (rightHeld && fuel > 0)) {
            railYaw = aimYaw;
            railPitch = aimPitch;
            railLocked = true;
            launchKick = false;
            railDist = 0;
            if (!foesOn) spawnFoes();
            playLaunch();
          } else {
            railYaw = aimYaw;
            railPitch = aimPitch;
            x = spawnX;
            y = spawnY;
            z = spawnZ;
            railDist = 0;
            vx = 0;
            vy = 0;
            vz = 0;
            yaw = aimYaw;
            pitch = aimPitch;
            grounded = true;
          }
        }
        if (railLocked) {
          const rail = forward(railYaw, railPitch);
          const along = 40;
          vx = rail[0] * along;
          vy = rail[1] * along;
          vz = rail[2] * along;
          railDist += along * dt;
          if (railDist >= railLen) {
            railDist = railLen;
            onRail = false;
            railLocked = false;
          }
          x = spawnX + rail[0] * railDist;
          y = spawnY + rail[1] * railDist;
          z = spawnZ + rail[2] * railDist;
          yaw += angDiff(railYaw, yaw) * Math.min(1, dt * 14);
          pitch += (railPitch - pitch) * Math.min(1, dt * 14);
          grounded = false;
          if (rocketId === "firework" && along > 20 && bumped()) armBoom();
        }
      } else {
      const accel = 20 * (1 + boost * 2) * speedMul / mass;
      const lift = boost * (10 * Math.PI / 180);
      const falling = boost < 0.04 && !touchesEarth() && Math.hypot(vx, vy, vz) > 0.35;
      if (boost < 0.04 && !falling) {
        vx = 0;
        vy = 0;
        vz = 0;
        grounded = touchesEarth();
        if (grounded) {
          for (let n = 0; n < 5 && touchesEarth(); n += 1) y += 0.3;
        }
      } else if (falling) {
        grounded = false;
        vy -= 32 * dt;
        const nose = forward(aimYaw, aimPitch);
        const along = vx * nose[0] + vy * nose[1] + vz * nose[2];
        const steer = 1 - Math.exp(-18 * dt);
        vx += (nose[0] * along - vx) * steer;
        vy += (nose[1] * along - vy) * steer;
        vz += (nose[2] * along - vz) * steer;
        const glide = Math.exp(-0.02 * dt);
        vx *= glide;
        vy *= glide;
        vz *= glide;
        yaw += angDiff(aimYaw, yaw) * Math.min(1, dt * 16);
        pitch += (aimPitch - pitch) * Math.min(1, dt * 16);
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        if (touchesEarth()) {
          if (rocketId === "firework" && Math.hypot(vx, vy, vz) > 20) armBoom();
          vx = 0;
          vy = 0;
          vz = 0;
          grounded = true;
          for (let n = 0; n < 5 && touchesEarth(); n += 1) y += 0.3;
        }
      } else {
        const fly = forward(aimYaw, aimPitch + lift);
        vx += fly[0] * accel * dt;
        vy += fly[1] * accel * dt;
        vz += fly[2] * accel * dt;
        yaw += angDiff(aimYaw, yaw) * Math.min(1, dt * 16);
        pitch += (aimPitch + lift - pitch) * Math.min(1, dt * 16);
        const drag = Math.exp(-0.42 * dt);
        vx *= drag;
        vy *= drag;
        vz *= drag;
        const speed = Math.hypot(vx, vy, vz);
        const cap = (20 + boost * 20) * speedMul;
        if (speed > cap) {
          const cut = cap / speed;
          vx *= cut;
          vy *= cut;
          vz *= cut;
        }
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        grounded = touchesEarth();
        if (grounded) {
          if (rocketId === "firework" && Math.hypot(vx, vy, vz) > 20) armBoom();
          if (vy < 0) vy = 0;
          for (let n = 0; n < 5 && touchesEarth(); n += 1) y += 0.3;
        }
      }
      const pad = 1.05;
      for (let i = 0; i < tubes.length; i += 1) {
        const c = tubes[i];
        if (c[0] === 2) {
          if (z < c[6] - pad || z > c[7] + pad) continue;
          const dx = x - c[1];
          const dy = y - c[2];
          const dist = Math.hypot(dx, dy) || 0.001;
          const inner = c[5] > 0 && dist < (c[4] + c[5]) * 0.5;
          const hit = inner ? dist + pad > c[5] && dist < c[4] : dist - pad < c[4] && dist + pad > c[5];
          if (!hit) continue;
          if (rocketId === "firework" && Math.hypot(vx, vy, vz) > 20) armBoom();
          const nx = dx / dist;
          const ny = dy / dist;
          const target = inner ? c[5] - pad : c[4] + pad;
          x = c[1] + nx * target;
          y = c[2] + ny * target;
          const into = vx * nx + vy * ny;
          if ((inner && into > 0) || (!inner && into < 0)) {
            vx -= into * nx;
            vy -= into * ny;
          }
        } else if (y > c[6] - pad && y < c[7] + pad) {
          const dx = x - c[1];
          const dz = z - c[3];
          const dist = Math.hypot(dx, dz) || 0.001;
          if (dist - pad >= c[4] || dist + pad <= c[5]) continue;
          if (rocketId === "firework" && Math.hypot(vx, vy, vz) > 20) armBoom();
          const nx = dx / dist;
          const nz = dz / dist;
          const target = c[5] > 0 && dist < (c[4] + c[5]) * 0.5 ? c[5] - pad : c[4] + pad;
          x = c[1] + nx * target;
          z = c[3] + nz * target;
          const into = vx * nx + vz * nz;
          if (into < 0) {
            vx -= into * nx;
            vz -= into * nz;
          }
        }
      }
      }
    }
    stepFoes(dt);
    hitSpawns(dt);
    stepCorpses(dt);
    if (boomWait > 0) {
      boomClock += dt;
      boomWait -= dt;
      if (boomWait <= 0) blast();
    }
    const shake = fuse > 0 ? (1 - fuse / 0.95) : 0;
    const amp = shake * shake * 1.7;
    meshX = x + Math.sin(shakeT * 62) * amp;
    meshY = y + Math.cos(shakeT * 78) * amp * 0.75;
    meshZ = z + Math.sin(shakeT * 51) * amp;
    meshYaw = yaw + Math.sin(shakeT * 70) * shake * 0.95;
    meshPitch = pitch + Math.cos(shakeT * 64) * shake * 0.55;
    showHud();

    if (Math.hypot(vx, vy, vz) >= 15) {
      trail.push({ t: now, w: wingPoints(axes(meshYaw, meshPitch)) });
    }
    const trailCut = now - 1000;
    let trailDrop = 0;
    while (trailDrop < trail.length && trail[trailDrop].t < trailCut) trailDrop += 1;
    if (trailDrop > 0) trail.splice(0, trailDrop);

    const ax = axes(meshYaw, meshPitch);
    const view = axes(aimYaw, aimPitch);
    let camX = x - view.fx * 10 + view.ux * 2.3 + view.rx * 3.5;
    let camY = y - view.fy * 10 + view.uy * 2.3 + view.ry * 3.5;
    let camZ = z - view.fz * 10 + view.uz * 2.3 + view.rz * 3.5;
    if (pointInObject(camX, camY, camZ)) {
      const dx = camX - x;
      const dy = camY - y;
      const dz = camZ - z;
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 10; i += 1) {
        const mid = (lo + hi) * 0.5;
        if (pointInObject(x + dx * mid, y + dy * mid, z + dz * mid)) hi = mid;
        else lo = mid;
      }
      const t = Math.max(0.04, lo * 0.9);
      camX = x + dx * t;
      camY = y + dy * t;
      camZ = z + dz * t;
      if (pointInObject(camX, camY, camZ)) {
        for (let n = 0; n < 6 && pointInObject(camX, camY, camZ); n += 1) camY += 1.2;
      }
    }
    const lx = view.fx;
    const ly = view.fy;
    const lz = view.fz;
    const rx = view.rx;
    const ry = view.ry;
    const rz = view.rz;
    const ux = view.ux;
    const uy = view.uy;
    const uz = view.uz;
    const tan = 2.2 + boost * 0.28;
    const aspect = bw / bh;
    shotCamX = camX;
    shotCamY = camY;
    shotCamZ = camZ;
    shotLx = lx;
    shotLy = ly;
    shotLz = lz;
    shotRx = rx;
    shotRy = ry;
    shotRz = rz;
    shotUx = ux;
    shotUy = uy;
    shotUz = uz;
    shotTan = tan;
    shotAspect = aspect;
    shown.length = 0;
    const foeDraw = [];
    if (foesOn) {
      for (let fi = 0; fi < foes.length; fi += 1) {
        const foe = foes[fi];
        const vxw = foe.x - camX;
        const vyw = foe.y - camY;
        const vzw = foe.z - camZ;
        const df = vxw * lx + vyw * ly + vzw * lz;
        if (df < 0.6) continue;
        const dr = vxw * rx + vyw * ry + vzw * rz;
        const du = vxw * ux + vyw * uy + vzw * uz;
        const sx = ((dr / (df * aspect * tan)) + 1) * 0.5 * bw;
        const sy = (1 - du / (df * tan)) * 0.5 * bh;
        const pr = Math.max(12, 6 * bh * 0.5 / (df * tan));
        const x0 = Math.max(0, Math.floor(sx - pr));
        const y0 = Math.max(0, Math.floor(sy - pr));
        const x1 = Math.min(bw - 1, Math.ceil(sx + pr));
        const y1 = Math.min(bh - 1, Math.ceil(sy + pr));
        if (x1 < x0 || y1 < y0) continue;
        foeDraw.push({ foe, x0, y0, x1, y1 });
      }
    }
    for (let ci = 0; ci < corpses.length; ci += 1) {
      const foe = corpses[ci];
      const vxw = foe.x - camX;
      const vyw = foe.y - camY;
      const vzw = foe.z - camZ;
      const df = vxw * lx + vyw * ly + vzw * lz;
      if (df < 0.6) continue;
      const dr = vxw * rx + vyw * ry + vzw * rz;
      const du = vxw * ux + vyw * uy + vzw * uz;
      const sx = ((dr / (df * aspect * tan)) + 1) * 0.5 * bw;
      const sy = (1 - du / (df * tan)) * 0.5 * bh;
      const pr = Math.max(12, 6 * bh * 0.5 / (df * tan));
      const x0 = Math.max(0, Math.floor(sx - pr));
      const y0 = Math.max(0, Math.floor(sy - pr));
      const x1 = Math.min(bw - 1, Math.ceil(sx + pr));
      const y1 = Math.min(bh - 1, Math.ceil(sy + pr));
      if (x1 < x0 || y1 < y0) continue;
      foeDraw.push({ foe, x0, y0, x1, y1 });
    }
    for (let i = 0; i < tubes.length; i += 1) {
      const cyl = tubes[i];
      const rad = cyl[4];
      let x0 = bw;
      let y0 = bh;
      let x1 = 0;
      let y1 = 0;
      let seen = 0;
      let behind = false;
      const xs = [cyl[1] - rad, cyl[1] + rad];
      const ys = cyl[0] === 2 ? [cyl[2] - rad, cyl[2] + rad] : [cyl[6], cyl[7]];
      const zs = cyl[0] === 2 ? [cyl[6], cyl[7]] : [cyl[3] - rad, cyl[3] + rad];
      for (let ix = 0; ix < 2; ix += 1) {
        for (let iy = 0; iy < 2; iy += 1) {
          for (let iz = 0; iz < 2; iz += 1) {
            const vxw = xs[ix] - camX;
            const vyw = ys[iy] - camY;
            const vzw = zs[iz] - camZ;
            const df = vxw * lx + vyw * ly + vzw * lz;
            if (df < 0.35) {
              behind = true;
              continue;
            }
            const dr = vxw * rx + vyw * ry + vzw * rz;
            const du = vxw * ux + vyw * uy + vzw * uz;
            const sx0 = ((dr / (df * aspect * tan)) + 1) * 0.5 * bw;
            const sy0 = (1 - du / (df * tan)) * 0.5 * bh;
            if (sx0 < x0) x0 = sx0;
            if (sy0 < y0) y0 = sy0;
            if (sx0 > x1) x1 = sx0;
            if (sy0 > y1) y1 = sy0;
            seen += 1;
          }
        }
      }
      if (!seen) continue;
      if (behind) {
        x0 = 0;
        y0 = 0;
        x1 = bw - 1;
        y1 = bh - 1;
      } else {
        x0 = Math.max(0, Math.floor(x0) - 1);
        y0 = Math.max(0, Math.floor(y0) - 1);
        x1 = Math.min(bw - 1, Math.ceil(x1) + 1);
        y1 = Math.min(bh - 1, Math.ceil(y1) + 1);
      }
      if (x1 < x0 || y1 < y0) continue;
      shown.push({ cyl, x0, y0, x1, y1 });
    }
    const padQx = spawnX - camX;
    const padQy = spawnY - camY;
    const padQz = spawnZ - camZ;
    const foeQx = foePadX - camX;
    const foeQy = foePadY - camY;
    const foeQz = foePadZ - camZ;
    const data = frame.data;
    for (let sy = 0; sy < bh; sy += 1) {
      const ndcY = 1 - ((sy + 0.5) / bh) * 2;
      for (let sx = 0; sx < bw; sx += 1) {
        const ndcX = ((sx + 0.5) / bw) * 2 - 1;
        let dx = lx + rx * ndcX * aspect * tan + ux * ndcY * tan;
        let dy = ly + ry * ndcX * aspect * tan + uy * ndcY * tan;
        let dz = lz + rz * ndcX * aspect * tan + uz * ndcY * tan;
        const dl = Math.hypot(dx, dy, dz) || 1;
        dx /= dl;
        dy /= dl;
        dz /= dl;
        let r = 150;
        let g = 196;
        let b = 230;
        if (dy > 0.15) {
          r = 186;
          g = 214;
          b = 242;
        }
        const beam = beamHit(camX, camY, camZ, dx, dy, dz, view);
        const px = camX - meshX;
        const py = camY - meshY;
        const pz = camZ - meshZ;
        const aimB = px * dx + py * dy + pz * dz;
        const aimC = px * px + py * py + pz * pz - 18;
        const aimDisc = aimB * aimB - aimC;
        const hit = downTime > 0 || boom > 0 || aimDisc < 0 || -aimB + Math.sqrt(Math.max(0, aimDisc)) <= 0.05
          ? null
          : rocketHit(camX, camY, camZ, dx, dy, dz, ax);
        let best = 160;
        if (beam && beam < best) {
          best = beam;
          r = 255;
          g = 70;
          b = 64;
        }
        if (hit && hit.t < best) {
          best = hit.t;
          paintPixel(hit);
          r = cR;
          g = cG;
          b = cB;
        }
        if (foeDraw.length) {
          for (let fi = 0; fi < foeDraw.length; fi += 1) {
            const slot = foeDraw[fi];
            if (sx < slot.x0 || sx > slot.x1 || sy < slot.y0 || sy > slot.y1) continue;
            const fh = foeRay(camX, camY, camZ, dx, dy, dz, slot.foe);
            if (!fh || fh.t >= best) continue;
            best = fh.t;
            const fuseRed = slot.foe.boom > 0 && Math.floor(slot.foe.boomClock / 0.5) % 2 === 0;
            const tint = foeColor(fh, slot.foe.look, fuseRed);
            r = tint[0];
            g = tint[1];
            b = tint[2];
          }
        }
        for (let bi = 0; bi < shown.length; bi += 1) {
          const slot = shown[bi];
          if (sx < slot.x0 || sx > slot.x1 || sy < slot.y0 || sy > slot.y1) continue;
          const bt = cylT(camX, camY, camZ, dx, dy, dz, slot.cyl);
          if (bt > 0.05 && bt < best) {
            best = bt;
            r = 232;
            g = 108;
            b = 28;
          }
        }
        const padAlong = padQx * dx + padQy * dy + padQz * dz;
        if (spawnPads[0].alive && padAlong > 0.4 && padAlong < 90) {
          const padMiss = padQx * padQx + padQy * padQy + padQz * padQz - padAlong * padAlong;
          if (padMiss <= 100) {
            const lt = ringHit(camX, camY, camZ, dx, dy, dz, spawnPads[0]);
            if (lt > 0.05 && lt < best) {
              best = lt;
              r = 226;
              g = 230;
              b = 214;
            }
          }
        }
        const foeAlong = foeQx * dx + foeQy * dy + foeQz * dz;
        if (spawnPads[1].alive && foeAlong > 0.4 && foeAlong < 160) {
          const foeMiss = foeQx * foeQx + foeQy * foeQy + foeQz * foeQz - foeAlong * foeAlong;
          if (foeMiss <= 100) {
            const lt = ringHit(camX, camY, camZ, dx, dy, dz, spawnPads[1]);
            if (lt > 0.05 && lt < best) {
              best = lt;
              r = 226;
              g = 230;
              b = 214;
            }
          }
        }
        if (camY < 0) {
          if (dy > 0.25) {
            const gt = -camY / dy;
            if (gt > 0.05 && gt < best) {
              const ix = Math.floor((camX + dx * gt) / VOX);
              const iz = Math.floor((camZ + dz * gt) / VOX);
              if (isSolid(ix, -1, iz)) {
                best = gt;
                r = 78;
                g = 58;
                b = 40;
              }
            }
          } else {
            const earth = caveHit(camX, camY, camZ, dx, dy, dz, 0.2);
            if (earth > 0.05 && earth < best) {
              best = earth;
              r = dy < -0.45 ? 40 : 78;
              g = dy < -0.45 ? 30 : 58;
              b = dy < -0.45 ? 22 : 40;
            } else if (dy < 0.05) {
              r = 36;
              g = 26;
              b = 18;
            }
          }
        } else if (dy < -1e-6) {
          const gt = -camY / dy;
          if (gt > 0.05 && gt < best) {
            const wx = camX + dx * gt;
            const wz = camZ + dz * gt;
            const ix = Math.floor(wx / VOX);
            const iz = Math.floor(wz / VOX);
            if (isSolid(ix, -1, iz)) {
              const gx = Math.floor(wx);
              const gz = Math.floor(wz);
              const line = ((gx % 16) + 16) % 16 < 1 || ((gz % 16) + 16) % 16 < 1;
              best = gt;
              r = line ? 86 : 34;
              g = line ? 96 : 40;
              b = line ? 78 : 36;
            } else {
              const earth = caveHit(camX, camY, camZ, dx, dy, dz, gt + 0.3);
              if (earth > 0.05 && earth < best) {
                best = earth;
                r = dy < -0.45 ? 40 : 78;
                g = dy < -0.45 ? 30 : 58;
                b = dy < -0.45 ? 22 : 40;
              }
            }
          }
        }
        const i = (sy * bw + sx) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(frame, 0, 0);
    if (downTime > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "700 " + Math.max(20, Math.floor(bh * 0.09)) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(Math.ceil(downTime)), bw * 0.5, bh * 0.64);
    }
    if (boomWait > 0) {
      const cx = bw * 0.5;
      const cy = bh * 0.5;
      const glow = ctx.createRadialGradient(cx, cy, Math.min(bw, bh) * 0.22, cx, cy, Math.hypot(cx, cy));
      glow.addColorStop(0, "rgba(255, 24, 24, 0)");
      glow.addColorStop(0.62, "rgba(255, 24, 24, 0)");
      glow.addColorStop(1, "rgba(210, 12, 12, 0.88)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, bw, bh);
    }
    drawTrail();
    drawSparks();
    drawPops();
    drawPreview();
  }
  requestAnimationFrame(loop);
})();
