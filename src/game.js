(() => {
  const canvas = document.getElementById("view");
  const stage = document.getElementById("screen");
  const fireBtn = document.getElementById("fire");
  const hud = document.getElementById("hud");
  const preview = document.getElementById("preview");
  const cats = document.getElementById("cats");
  const catList = document.getElementById("cat-list");
  const shopEl = document.getElementById("shop");
  const shopMoney = document.getElementById("shop-money");
  const shopRockets = document.getElementById("shop-rockets");
  const shopUps = document.getElementById("shop-ups");
  const previewCtx = preview.getContext("2d", { alpha: true });
  const ctx = canvas.getContext("2d", { alpha: false });
  let aimYaw = 0;
  let aimPitch = 0.15;
  let lookYaw = 0;
  let lookPitch = 0.15;
  let yaw = 0;
  let pitch = 0.15;
  let x = 0;
  let y = 11.35;
  let z = 0;
  let moveX = 0;
  let moveY = 11.35;
  let moveZ = 0;
  let laserX = 0;
  let laserY = 3.35;
  let laserZ = 16;
  let boom = 0;
  let fuse = 0;
  let shakeT = 0;
  let boomX = 0;
  let boomY = 0;
  let boomZ = 0;
  let meshX = 0;
  let meshY = 11.35;
  let meshZ = 0;
  let meshYaw = 0;
  let meshPitch = 0.15;
  const spawnX = 0;
  const spawnY = 11.35;
  const spawnZ = 0;
  let vx = 0;
  let vy = 0;
  let vz = 0;
  let rightHeld = false;
  function pressRight(e) {
    if (e && e.target && e.target.closest && e.target.closest("#shop")) return;
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
  const violetShip = {
    id: "violet",
    name: "보라",
    body: [68, 26, 112],
    nose: [18, 18, 20],
    fin: [18, 18, 20],
    fat: 1,
    len: 1,
    wing: 1,
    flame: 1,
    speed: 1,
    fuel: 0.85,
    mass: 1,
  };
  const bandShip = {
    id: "band",
    name: "파랑",
    body: [42, 108, 230],
    nose: [42, 108, 230],
    fin: [42, 108, 230],
    fat: 1,
    len: 1,
    wing: 1,
    flame: 1,
    speed: 1,
    fuel: 1.2,
    mass: 1,
  };
  const rocketCats = [
    { ship: basicShip, kids: [heavyShip, fireworkShip, bandShip, violetShip] },
  ];
  let rocketId = "basic";
  let openCat = "";
  let grounded = false;
  let flaming = false;
  let meteorOn = false;
  let meteorClock = 0;
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
  let mineBinStore = [];

  function resize() {
    const sw = Math.max(1, stage ? stage.clientWidth : window.innerWidth);
    const sh = Math.max(1, stage ? stage.clientHeight : window.innerHeight);
    const scale = 3;
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
  let finTris = [];
  let finDiags = [];
  let wingBits = [];
  let wingSkill = 0;
  let wingDone = false;
  let noBoost = false;
  let violetOn = false;
  let violetMix = 0;
  let viewTan = 2.2;
  let flameScaleNow = 1;
  let basicFov = 0;
  let dashMul = 0;
  let dashBase = 0;
  let dashKick = 0;
  let dashDX = 0;
  let dashDY = 1;
  let dashDZ = 0;
  let violetEnergy = 1;
  const violetEnergySec = 10;
  let basicCool = 0;
  const basicCoolSec = 2;

  function dashEnv(u) {
    const open = 1.7 / 2.7;
    const t = u < open ? u / open : Math.max(0, (1 - u) / (1 - open));
    return t * t * (3 - 2 * t);
  }
  let speedMix = 1;

  function triFinT(lx, ly, lz, ldx, ldy, ldz, tri, far) {
    const limit = far || 40;
    let tEnter = 0.05;
    let tExit = limit;
    const thick = tri[1];
    let oFlat;
    let dFlat;
    let oA;
    let dA;
    let oB;
    let dB;
    if (tri[0] === 0) {
      oFlat = lx;
      dFlat = ldx;
      oA = ly;
      dA = ldy;
      oB = lz;
      dB = ldz;
    } else {
      oFlat = ly;
      dFlat = ldy;
      oA = lx;
      dA = ldx;
      oB = lz;
      dB = ldz;
    }
    if (Math.abs(dFlat) < 1e-8) {
      if (oFlat < -thick || oFlat > thick) return -1;
    } else {
      let a = (-thick - oFlat) / dFlat;
      let b = (thick - oFlat) / dFlat;
      if (a > b) {
        const swap = a;
        a = b;
        b = swap;
      }
      if (a > tEnter) tEnter = a;
      if (b < tExit) tExit = b;
      if (tEnter > tExit) return -1;
    }
    const poly = [
      [tri[2], tri[3]],
      [tri[4], tri[5]],
      [tri[6], tri[7]],
    ];
    for (let i = 0; i < 3; i += 1) {
      const x0 = poly[i][0];
      const z0 = poly[i][1];
      const x1 = poly[(i + 1) % 3][0];
      const z1 = poly[(i + 1) % 3][1];
      const x2 = poly[(i + 2) % 3][0];
      const z2 = poly[(i + 2) % 3][1];
      let nx = z0 - z1;
      let nz = x1 - x0;
      if (nx * (x2 - x0) + nz * (z2 - z0) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const s0 = nx * (oA - x0) + nz * (oB - z0);
      const sd = nx * dA + nz * dB;
      if (Math.abs(sd) < 1e-8) {
        if (s0 < -1e-5) return -1;
        continue;
      }
      const t = -s0 / sd;
      if (sd > 0) {
        if (t > tEnter) tEnter = t;
      } else if (t < tExit) tExit = t;
      if (tEnter > tExit) return -1;
    }
    if (tEnter <= tExit && tEnter >= 0.05 && tEnter < limit) return tEnter;
    return -1;
  }

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
      const cz = lz + ldz * cone;
      if (cz >= bodyFront && cz <= noseTip) {
        best = cone;
        kind = 2;
        hx = lx + ldx * cone;
        hy = ly + ldy * cone;
        hz = cz;
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
    if (!(rocketId === "band" && (wingSkill > 0 || wingDone))) {
      for (let i = 0; i < fins.length; i += 1) {
        const f = fins[i];
        const hit = boxT(lx, ly, lz, ldx, ldy, ldz, f[0], f[1], f[2], f[3], f[4], f[5]);
        if (hit > 0.05 && hit < best) {
          best = hit;
          kind = 4;
        }
      }
      for (let i = 0; i < finTris.length; i += 1) {
        const hit = triFinT(lx, ly, lz, ldx, ldy, ldz, finTris[i], 40);
        if (hit > 0.05 && hit < best) {
          best = hit;
          kind = 4;
        }
      }
      for (let i = 0; i < finDiags.length; i += 1) {
        const hit = diagFinT(lx, ly, lz, ldx, ldy, ldz, finDiags[i], 40);
        if (hit > 0.05 && hit < best) {
          best = hit;
          kind = 4;
        }
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
    if (meteorOn) {
      const flick = Math.abs(Math.sin(hit.hx * 9.1 + hit.hy * 6.4 + hit.hz * 4.2 + meteorClock * 22));
      if (flick > 0.72) {
        cR = 255;
        cG = 248;
        cB = 220;
      } else if (flick > 0.38) {
        cR = 255;
        cG = 168;
        cB = 36;
    } else {
        cR = 255;
        cG = 64;
        cB = 14;
      }
      return;
    }
    if (boomRed() && hit.kind !== 3) {
      cR = 255;
      cG = 32;
      cB = 32;
      return;
    }
    if (hit.kind === 3) {
      const m = rocketId === "violet" ? violetMix : 0;
      cR = 255 + (140 - 255) * m;
      cG = 148 + (245 - 148) * m;
      cB = 42 + (206 - 42) * m;
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
      if (rocketId === "band") {
        const span = bodyFront - bodyBack || 1;
        const band = span * 0.2;
        if (hit.hz >= bodyFront - band || hit.hz <= bodyBack + band) {
          cR = 18;
          cG = 18;
          cB = 20;
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

  function rainbowCss(angle) {
    return "conic-gradient(from " + angle + "deg, #ff0040, #ff8a00, #ffea00, #00ff66, #00c8ff, #b400ff, #ff0040)";
  }

  function showHud() {
    const cash = money + "원";
    if (gameOver) {
      hud.textContent = "스폰 파괴  ·  패배  ·  부활 불가  ·  " + cash;
      syncShopPanel();
      return;
    }
    if (won) {
      hud.textContent = "승리  ·  연료 무한  ·  " + cash;
      syncShopPanel();
      return;
    }
    const speed = Math.hypot(vx, vy, vz);
    const locked = document.pointerLockElement === canvas;
    const lock = locked ? "" : "  ·  클릭해서 조종";
    const place = onRail ? (locked ? "발사대  ·  좌클릭으로 발사  ·  " : "발사대  ·  ") : "";
    const room = inLobby ? "로비  ·  " : "";
    hud.textContent = room + place + "속도 " + Math.round(speed) + "  ·  " + cash + "  ·  나와 적은 다른 팀" + lock;
    syncShopPanel();
  }

  function syncShopPanel() {
    cats.hidden = true;
    if (shopEl) shopEl.hidden = true;
  }

  function checkWin() {
    if (won || gameOver || !foesOn) return;
    if (!foeSpawnAlive() && foes.length === 0 && foeDown <= 0) {
      won = true;
      fuel = 1;
      winClock = 0;
    }
  }

  function shipById(id) {
    if (id === "heavy") return heavyShip;
    if (id === "firework") return fireworkShip;
    if (id === "band") return bandShip;
    if (id === "violet") return violetShip;
    return basicShip;
  }

  function randomShip() {
    const kinds = [basicShip, heavyShip, fireworkShip, bandShip, violetShip];
    return kinds[(Math.random() * kinds.length) | 0];
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

  function corpseRest(c) {
    let rest = 1.15;
    const hit = floorStand(c.x, c.y, c.z);
    if (hit > rest) rest = hit;
    return rest;
  }

  function stepCorpses(dt) {
    const down = -Math.PI / 2;
    for (let i = 0; i < corpses.length; i += 1) {
      const c = corpses[i];
      const rest = corpseRest(c);
      if (c.y > rest) {
        c.vy -= 32 * dt;
        const drag = Math.exp(-0.35 * dt);
        c.vx *= drag;
        c.vz *= drag;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
      }
      if (c.y < rest) {
        c.y = rest;
        c.vx = 0;
        c.vy = 0;
        c.vz = 0;
      }
      c.pitch += (down - c.pitch) * Math.min(1, dt * 1.6);
      c.ax = axes(c.yaw, c.pitch);
    }
  }

  let downTime = 0;
  let gameOver = false;
  let won = false;
  let winClock = 0;
  let money = 0;
  let moneyTick = 0;
  let flyMoney = 0;
  let speedLv = 0;
  let fuelLv = 0;
  const ownedRockets = { basic: true };
  const shopPrice = { basic: 0, heavy: 0, firework: 0, band: 0, violet: 0 };
  const upMax = 5;

  function upPrice() {
    return 0;
  }

  function randomOwnedShip() {
    const kinds = [basicShip, heavyShip, fireworkShip, bandShip, violetShip].filter((spec) => ownedRockets[spec.id]);
    return kinds[(Math.random() * kinds.length) | 0] || basicShip;
  }

  function addMoney(n) {
    if (n <= 0) return;
    money += n;
  }

  function mySpawnAlive() {
    return spawnPads[0] && spawnPads[0].alive;
  }

  function foeSpawnAlive() {
    return spawnPads[1] && spawnPads[1].alive;
  }

  function resetPlayer() {
    if (!mySpawnAlive()) {
      downTime = 0;
      gameOver = true;
      return;
    }
    x = spawnX;
    y = spawnY;
    z = spawnZ;
    moveX = x;
    moveY = y;
    moveZ = z;
    vx = 0;
    vy = 0;
    vz = 0;
    yaw = aimYaw;
    pitch = aimPitch;
    lookYaw = aimYaw;
    lookPitch = aimPitch;
    const aim = forward(aimYaw, aimPitch);
    laserX = x + aim[0] * 18;
    laserY = y + aim[1] * 18;
    laserZ = z + aim[2] * 18;
    wingBits = [];
    wingSkill = 0;
    wingDone = false;
    noBoost = false;
    violetOn = false;
    violetMix = 0;
    flameScaleNow = 1;
    viewTan = 2.2;
    basicFov = 0;
    dashMul = 0;
    dashBase = 0;
    dashKick = 0;
    violetEnergy = 1;
    basicCool = 0;
    speedMix = 1;
    onRail = true;
    railLocked = false;
    railDist = 0;
    fuel = 1;
    hurt = 0;
    boomWait = 0;
    downTime = 0;
    gameOver = false;
    pickRocket(randomOwnedShip());
    if (typeof paintCats === "function") paintCats();
  }

  function downPlayer(quiet) {
    if (downTime > 0 || gameOver) return;
    if (!quiet) playNoise(0.2, 0.06, 180);
    dropPlayer();
    vx = 0;
    vy = 0;
    vz = 0;
    boomWait = 0;
    chaser = null;
    if (!mySpawnAlive()) {
      downTime = 0;
      gameOver = true;
      engineOff();
      return;
    }
    downTime = 0;
    engineOff();
    resetPlayer();
  }

  function bandLockDeath() {
    if (rocketId !== "band" || (wingSkill <= 0 && !wingDone)) return;
    if (downTime > 0 || gameOver) return;
    downPlayer();
  }

  const sparks = [];
  const pops = [];
  const sparkYellow = [245, 208, 40];
  const fireworkColors = [
    [255, 70, 70],
    [255, 168, 42],
    [255, 236, 74],
    [86, 255, 96],
    [72, 220, 255],
    [96, 128, 255],
    [214, 96, 255],
    [255, 255, 255],
  ];
  let dying = false;
  let boomWait = 0;
  let boomClock = 0;
  let audioCtx = null;
  let engine = null;
  let engineGain = null;
  let crack = 0;

  let music = null;

  function musicLayer(freq, type, detune, master) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    return gain;
  }

  function musicStart() {
    if (!audioCtx || music) return;
    const master = audioCtx.createGain();
    master.gain.value = 0.62;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 880;
    filter.Q.value = 0.35;
    master.connect(filter);
    filter.connect(audioCtx.destination);
    music = {
      filter: filter,
      bed: [
        musicLayer(110, "sine", -7, master),
        musicLayer(110, "sine", 8, master),
        musicLayer(164.81, "sine", 0, master),
      ],
      fly: [
        musicLayer(220, "triangle", -5, master),
        musicLayer(329.63, "sine", 4, master),
      ],
      drive: [
        musicLayer(55, "sine", 0, master),
        musicLayer(82.41, "triangle", -3, master),
      ],
      lift: [
        musicLayer(440, "sine", 3, master),
        musicLayer(523.25, "sine", -4, master),
      ],
      bedG: 0,
      flyG: 0,
      driveG: 0,
      liftG: 0,
    };
  }

  function musicToward(cur, target, dt) {
    return cur + (target - cur) * (1 - Math.exp(-dt * 1.15));
  }

  function musicStep(dt, state) {
    if (!music || !audioCtx) return;
    const bedT = state.dead ? 0 : state.calm ? 0.028 : 0.046;
    const flyT = state.dead ? 0 : state.flying ? 0.04 : 0.01;
    const driveT = state.dead || state.glide ? 0 : state.thrusting ? 0.055 : 0;
    const liftT = state.dead ? 0 : state.won ? 0.05 : state.lift ? 0.038 : 0;
    music.bedG = musicToward(music.bedG, bedT, dt);
    music.flyG = musicToward(music.flyG, flyT, dt);
    music.driveG = musicToward(music.driveG, driveT, dt);
    music.liftG = musicToward(music.liftG, liftT, dt);
    const now = audioCtx.currentTime;
    const setG = (nodes, value) => {
      for (let i = 0; i < nodes.length; i += 1) nodes[i].gain.setTargetAtTime(value, now, 0.12);
    };
    setG(music.bed, music.bedG);
    setG(music.fly, music.flyG);
    setG(music.drive, music.driveG);
    setG(music.lift, music.liftG);
    const open = state.dead ? 360 : state.thrusting ? 1680 : state.lift ? 1320 : state.flying ? 980 : 640;
    music.filter.frequency.setTargetAtTime(open, now, 0.28);
  }

  function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    musicStart();
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

  function boomRed() {
    return boomWait > 0 && Math.floor(boomClock / 0.5) % 2 === 0;
  }

  function blast() {
    const wide = rocketId === "firework";
    const reach = wide ? 18 : 12;
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
        removeFoe(i);
      }
    }
    boomWait = 0;
    carveBuilding(x, y, z, wide ? 18 : 40 / 4.4);
    if (rocketId === "firework") fireworkBurst(x, y, z);
    else realBoom(x, y, z);
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
      grav: 9,
    });
    if (sparks.length > 1100) sparks.splice(0, sparks.length - 1100);
  }

  function fireworkBurst(ox, oy, oz) {
    const n = 480;
    for (let i = 0; i < n; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.cos(phi);
      const dz = Math.sin(phi) * Math.sin(theta);
      const speed = 13 + Math.random() * 9;
      const life = 1.15 + Math.random() * 0.45;
      const color = fireworkColors[(Math.random() * fireworkColors.length) | 0];
      sparks.push({
        x: ox,
        y: oy,
        z: oz,
        vx: dx * speed,
        vy: dy * speed,
        vz: dz * speed,
        life: life,
        max: life,
        color: color,
        grav: 1.4,
        px: 2,
      });
    }
    if (sparks.length > 1100) sparks.splice(0, sparks.length - 1100);
  }

  function realBoom(ox, oy, oz) {
    const fire = [[255, 244, 220], [255, 186, 48], [255, 96, 24], [180, 32, 12]];
    const smoke = [[78, 78, 82], [46, 46, 50], [28, 28, 32]];
    for (let i = 0; i < 220; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.65;
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.cos(phi);
      const dz = Math.sin(phi) * Math.sin(theta);
      const speed = 10 + Math.random() * 26;
      const life = 0.35 + Math.random() * 0.65;
      sparks.push({
        x: ox,
        y: oy,
        z: oz,
        vx: dx * speed,
        vy: dy * speed,
        vz: dz * speed,
        life: life,
        max: life,
        color: fire[(Math.random() * fire.length) | 0],
        grav: 18,
        px: Math.random() < 0.22 ? 3 : 2,
      });
    }
    for (let i = 0; i < 70; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const life = 1.1 + Math.random() * 0.8;
      sparks.push({
        x: ox,
        y: oy,
        z: oz,
        vx: Math.cos(theta) * speed,
        vy: 2 + Math.random() * 4,
        vz: Math.sin(theta) * speed,
        life: life,
        max: life,
        color: smoke[(Math.random() * smoke.length) | 0],
        grav: -1.4,
        px: 3,
      });
    }
    if (sparks.length > 1100) sparks.splice(0, sparks.length - 1100);
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
    downPlayer(true);
  }

  function diagFinT(lx, ly, lz, ldx, ldy, ldz, fin, far) {
    const c = Math.cos(fin.ang);
    const s = Math.sin(fin.ang);
    const ox = c * lx + s * ly;
    const oy = -s * lx + c * ly;
    const dx = c * ldx + s * ldy;
    const dy = -s * ldx + c * ldy;
    return boxT(ox, oy, lz, dx, dy, ldz, fin.x0, -fin.thick, fin.z0, fin.x1, fin.thick, fin.z1, far);
  }

  function buildFins(spec) {
    const fat = spec.fat;
    const len = spec.len;
    const inner = 0.4 * fat;
    const outer = inner + 0.65 * spec.wing;
    const thick = 0.06 * fat;
    const z0 = -1.45 * len;
    const z1 = -0.25 * len;
    const fins = [
      [inner, -thick, z0, outer, thick, z1],
      [-outer, -thick, z0, -inner, thick, z1],
      [-thick, inner, z0, thick, outer, z1],
      [-thick, -outer, z0, thick, -inner, z1],
    ];
    let wingOut = outer;
    const tris = [];
    const diags = [];
    if (spec.id === "violet") {
      const angles = [Math.PI / 4, Math.PI * 3 / 4, -Math.PI * 3 / 4, -Math.PI / 4];
      for (let i = 0; i < angles.length; i += 1) {
        diags.push({
          ang: angles[i],
          x0: 0.36 * fat,
          x1: 0.82 * fat,
          z0: -1.2 * len,
          z1: -0.5 * len,
          thick: 0.05 * fat,
        });
      }
    }
    return { fins: fins, tris: tris, diags: diags, wingOut: wingOut, wingZ: (z0 + z1) * 0.5 };
  }

  function makeLook(spec) {
    const fat = spec.fat;
    const len = spec.len;
    const bodyR2 = 0.46 * fat * (0.46 * fat);
    const bodyBack = -1.55 * len;
    const bodyFront = 1.25 * len;
    const noseTip = bodyFront + 1.2 * len * (spec.noseMul || 1);
    const noseK = (spec.noseSharp == null ? 0.48 : spec.noseSharp) * fat / len;
    const noseK2 = noseK * noseK;
    const frontR2 = 0.58 * fat * (0.58 * fat);
    const flameLen = 1.15 * 1.5 * spec.flame;
    const flameRoot = 0.253 * spec.flame;
    const flameK = flameRoot / flameLen;
    const hole = 0.26 * spec.flame;
    const built = buildFins(spec);
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
      fins: built.fins,
      tris: built.tris,
      diags: built.diags,
    };
  }

  let foeDown = 0;

  function makeFoe() {
    const spec = randomShip();
    const shot = forward(Math.PI, 0.2);
    const speed = 26;
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
  }

  function spawnFoes() {
    if (inLobby) return;
    foesOn = true;
    foeDown = 0;
    foes = [makeFoe()];
  }

  function removeFoe(i) {
    foes.splice(i, 1);
    if (foesOn) addMoney(200);
    if (foesOn && foes.length === 0 && foeSpawnAlive()) foeDown = 5;
    checkWin();
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
    if (fuel <= 0 && boomWait <= 0) downPlayer();
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
    carveBuilding(foe.x, foe.y, foe.z, 40 / 4.4);
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
    if (foeDown > 0) {
      if (!foeSpawnAlive()) foeDown = 0;
      else {
        foeDown -= dt;
        if (foeDown <= 0) foes.push(makeFoe());
      }
    }
    for (let i = 0; i < foes.length; i += 1) {
      const foe = foes[i];
      if (foe.boom > 0) {
        foe.boomClock += dt;
        foe.boom -= dt;
        if (foe.boom <= 0) {
          explodeFoe(foe);
          if (!foesOn || dying) return;
          removeFoe(i);
          i -= 1;
          continue;
        }
    } else {
        foe.fuel = Math.max(0, foe.fuel - dt / 30);
        if (foe.fuel <= 0 && !armFoeBoom(foe)) {
          burstAt(foe.x, foe.y, foe.z, 14);
          dropFoe(foe);
          removeFoe(i);
          i -= 1;
          continue;
        }
      }
      const pdx = x - foe.x;
      const pdy = y - foe.y;
      const pdz = z - foe.z;
      const pdist = Math.hypot(pdx, pdy, pdz) || 0.001;
      const myPad = spawnPads[0];
      const ownPad = spawnPads[1];
      const toMySpawn = myPad.alive
        ? Math.hypot(myPad.x - foe.x, myPad.y - foe.y, myPad.z - foe.z)
        : 1e9;
      const playerToMySpawn = myPad.alive
        ? Math.hypot(myPad.x - x, myPad.y - y, myPad.z - z)
        : 1e9;
      const ahead = 0.32;
      let aimX = x + vx * ahead;
      let aimY = y + vy * ahead;
      let aimZ = z + vz * ahead;
      let mode = "hunt";
      if (myPad.alive && toMySpawn < 24) {
        mode = "smash";
        aimX = myPad.x;
        aimY = myPad.y;
        aimZ = myPad.z;
      } else if (myPad.alive && playerToMySpawn < 20 && pdist < toMySpawn) {
        mode = "defend";
        aimX = ownPad.x;
        aimY = ownPad.y;
        aimZ = ownPad.z;
      } else if (myPad.alive && pdist > 14) {
        mode = "smash";
        aimX = myPad.x;
        aimY = myPad.y;
        aimZ = myPad.z;
      }
      if (mode !== "hunt" && foe.charge <= 0 && Math.hypot(aimX - foe.x, aimY - foe.y, aimZ - foe.z) > 26) {
        foe.charge = 0.9;
        const bx = foe.x - aimX;
        const by = foe.y - aimY;
        const bz = foe.z - aimZ;
        const bl = Math.hypot(bx, by, bz) || 1;
        for (let s = 0; s < 5; s += 1) addSpark(foe.x, foe.y, foe.z, bx / bl, by / bl, bz / bl, 14, 1.4);
      }
      if (foe.charge > 0) foe.charge -= dt;
      foe.tx = aimX;
      foe.ty = aimY;
      foe.tz = aimZ;
      let dx = foe.tx - foe.x;
      let dy = foe.ty - foe.y;
      let dz = foe.tz - foe.z;
      const dist = Math.hypot(dx, dy, dz) || 0.001;
      dx /= dist;
      dy /= dist;
      dz /= dist;
      const charging = mode === "smash" || mode === "defend" || pdist > 16;
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
      harm(ramDamage(fSpeed));
      if (!foesOn || dying) return;
      if (foe.fuel <= 0 && foe.boom <= 0 && !armFoeBoom(foe)) {
        burstAt(foe.x, foe.y, foe.z, 14);
        dropFoe(foe);
        removeFoe(i);
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
        hx = lx + ldx * cone;
        hy = ly + ldy * cone;
        hz = cz;
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
    for (let i = 0; i < fins.length; i += 1) {
      const f = fins[i];
      const hit = boxT(lx, ly, lz, ldx, ldy, ldz, f[0], f[1], f[2], f[3], f[4], f[5], 160);
      if (hit > 0.05 && hit < best) {
        best = hit;
        kind = 4;
      }
    }
    const tris = g.tris || [];
    for (let i = 0; i < tris.length; i += 1) {
      const hit = triFinT(lx, ly, lz, ldx, ldy, ldz, tris[i], 160);
      if (hit > 0.05 && hit < best) {
        best = hit;
        kind = 4;
      }
    }
    const diags = g.diags || [];
    for (let i = 0; i < diags.length; i += 1) {
      const hit = diagFinT(lx, ly, lz, ldx, ldy, ldz, diags[i], 160);
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
      if (look.spec.id === "band") {
        const span = look.bodyFront - look.bodyBack || 1;
        const band = span * 0.2;
        if (hit.hz >= look.bodyFront - band || hit.hz <= look.bodyBack + band) return [18, 18, 20];
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

  const spawnBallR = 3.2;
  const spawnBallR2 = spawnBallR * spawnBallR;
  const crouchSquat = 0.78;
  function bodyY0(py) {
    return py - spawnBallR;
  }
  function bodyY1(py) {
    return py + spawnBallR * (crouchHeld ? crouchSquat * 2 - 1 : 1);
  }
  const foePadX = 0;
  const foePadY = 8;
  const foePadZ = 86;
  let inLobby = true;
  const mapGroundY0 = 0.15;
  const CHUNK = 32;
  const CHUNK_LOAD = 2;
  const chunks = new Map();
  const mapBoxes = [];
  const mapRgb = [
    [48, 56, 44],
    [120, 118, 108],
    [74, 82, 90],
    [168, 150, 72],
    [176, 184, 190],
    [32, 40, 54],
    [24, 26, 30],
    [232, 198, 96],
  ];
  mapRgb[9] = [255, 78, 18];
  const spawnPads = [
    { mine: true, immortal: true, x: spawnX, y: spawnY, z: spawnZ, hp: 75, hurt: 0, alive: true },
    { mine: false, immortal: false, x: foePadX, y: foePadY, z: foePadZ, hp: 75, hurt: 0, alive: false },
  ];
  const spawnDraw = [];
  const mapDraw = [];
  let chaser = null;

  function chunkKey(cx, cz) {
    return cx + ":" + cz;
  }

  function worldChunk(wx, wz) {
    return [Math.floor(wx / CHUNK), Math.floor(wz / CHUNK)];
  }

  function ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    let c = chunks.get(key);
    if (c) return c;
    c = { cx: cx, cz: cz, structures: [] };
    chunks.set(key, c);
    return c;
  }

  function updateChunks() {
    const pair = worldChunk(x, z);
    const cx = pair[0];
    const cz = pair[1];
    for (let iz = cz - CHUNK_LOAD; iz <= cz + CHUNK_LOAD; iz += 1) {
      for (let ix = cx - CHUNK_LOAD; ix <= cx + CHUNK_LOAD; ix += 1) {
        ensureChunk(ix, iz);
      }
    }
    if (chunks.size > 80) {
      const keep = new Set();
      for (let iz = cz - CHUNK_LOAD - 1; iz <= cz + CHUNK_LOAD + 1; iz += 1) {
        for (let ix = cx - CHUNK_LOAD - 1; ix <= cx + CHUNK_LOAD + 1; ix += 1) {
          keep.add(chunkKey(ix, iz));
        }
      }
      chunks.forEach((v, k) => {
        if (!keep.has(k)) chunks.delete(k);
      });
    }
  }

  function chunkFloorColor(wx, wz) {
    const cx = Math.floor(wx / CHUNK);
    const cz = Math.floor(wz / CHUNK);
    const localX = wx - cx * CHUNK;
    const localZ = wz - cz * CHUNK;
    const edge = localX < 0.55 || localZ < 0.55 || localX > CHUNK - 0.55 || localZ > CHUNK - 0.55;
    if (edge) return [78, 92, 70];
    if (((cx + cz) & 1) === 0) return [46, 54, 42];
    return [38, 46, 36];
  }

  function ballHit(ox, oy, oz, dx, dy, dz, pad) {
    const px = ox - pad.x;
    const py = oy - pad.y;
    const pz = oz - pad.z;
    return quadT(1, 2 * (px * dx + py * dy + pz * dz), px * px + py * py + pz * pz - spawnBallR2);
  }

  function ellipsoidHit(ox, oy, oz, dx, dy, dz, cx, cy, cz, rx, ry, rz) {
    const px = (ox - cx) / rx;
    const py = (oy - cy) / ry;
    const pz = (oz - cz) / rz;
    const ddx = dx / rx;
    const ddy = dy / ry;
    const ddz = dz / rz;
    return quadT(ddx * ddx + ddy * ddy + ddz * ddz, 2 * (px * ddx + py * ddy + pz * ddz), px * px + py * py + pz * pz - 1);
  }

  function mapGroundHit() {
    return -1;
  }

  function mapBoxHit(ox, oy, oz, dx, dy, dz, m) {
    return boxT(ox, oy, oz, dx, dy, dz, m[0], m[1], m[2], m[3], m[4], m[5], 360);
  }

  function mapGroundY() {
    let top = null;
    for (let i = 0; i < mapBoxes.length; i += 1) {
      const m = mapBoxes[i];
      if (m[6] === 5 || m[6] === 7) continue;
      if (x < m[0] - 0.4 || x > m[3] + 0.4 || z < m[2] - 0.4 || z > m[5] + 0.4) continue;
      if (y < m[4] - 0.2 || y > m[4] + 1.5) continue;
      if (top == null || m[4] > top) top = m[4];
    }
    const ix = Math.floor((x - voxX) / CELL);
    const iz = Math.floor((z - voxZ) / CELL);
    if (ix >= 0 && iz >= 0 && ix < VW && iz < VD) {
      for (let iy = VH - 1; iy >= 0; iy -= 1) {
        if (!voxAt(ix, iy, iz)) continue;
        const face = voxY + (iy + 1) * CELL;
        if (y >= face - 0.2 && y <= face + 1.5 && (top == null || face > top)) top = face;
        break;
      }
    }
    const mix = Math.floor(x / CELL);
    const miz = Math.floor(z / CELL);
    const iyTop = Math.floor((y + 1.5 - mapGroundY0) / CELL);
    const iyBot = Math.floor((y - 0.2 - mapGroundY0) / CELL);
    for (let iy = iyTop; iy >= iyBot; iy -= 1) {
      if (!mineShell.has(mineKey(mix, iy, miz))) continue;
      const face = mapGroundY0 + (iy + 1) * CELL;
      if (y >= face - 0.2 && y <= face + 1.5 && (top == null || face > top)) top = face;
      break;
    }
    const floor = floorStand(x, y, z);
    if (floor > 1.15 && (top == null || floor - 1 > top)) top = floor - 1;
    return top;
  }

  function collideBoxes() {
    const pad = spawnBallR;
    const y0 = bodyY0(y);
    const y1 = bodyY1(y);
    for (let i = 0; i < mapBoxes.length; i += 1) {
      const m = mapBoxes[i];
      if (m[6] === 5 || m[6] === 7) continue;
      const bx0 = m[6] === 4 ? m[0] + blockInset : m[0];
      const bx1 = m[6] === 4 ? m[3] - blockInset : m[3];
      const bz0 = m[6] === 4 ? m[2] + blockInset : m[2];
      const bz1 = m[6] === 4 ? m[5] - blockInset : m[5];
      if (x < bx0 - pad || x > bx1 + pad || y1 < m[1] || y0 > m[4] || z < bz0 - pad || z > bz1 + pad) continue;
      const left = x - (bx0 - pad);
      const right = (bx1 + pad) - x;
      const below = y1 - m[1];
      const above = m[4] - y0;
      const near = z - (bz0 - pad);
      const far = (bz1 + pad) - z;
      const min = Math.min(left, right, below, above, near, far);
      if (min === above) {
        y = m[4] + spawnBallR;
        if (vy < 0) vy = 0;
        grounded = true;
      } else if (min === below) {
        y = m[1] - (y1 - y);
        if (vy > 0) vy = 0;
      } else if (min === left) {
        x = bx0 - pad;
        if (vx > 0) vx = 0;
      } else if (min === right) {
        x = bx1 + pad;
        if (vx < 0) vx = 0;
      } else if (min === near) {
        z = bz0 - pad;
        if (vz > 0) vz = 0;
    } else {
        z = bz1 + pad;
        if (vz < 0) vz = 0;
      }
    }
  }

  const CELL = 8;
  const blockInset = 1.25;
  function blockX0(origin, i) {
    return origin + i * CELL + blockInset;
  }
  function blockX1(origin, i) {
    return origin + (i + 1) * CELL - blockInset;
  }
  const VW = 16;
  const VH = 16;
  const VD = 16;
  const voxX = -64;
  const voxY = mapGroundY0;
  const voxZ = -64;
  const wallTop = 40;
  const wallT = 2;
  const plateX0 = voxX;
  const plateX1 = voxX + VW * CELL;
  const plateZ0 = voxZ;
  const plateZ1 = voxZ + VD * CELL;
  mapBoxes.push([plateX0 - wallT, voxY, plateZ0 - wallT, plateX0, wallTop, plateZ1 + wallT, 8]);
  mapBoxes.push([plateX1, voxY, plateZ0 - wallT, plateX1 + wallT, wallTop, plateZ1 + wallT, 8]);
  mapBoxes.push([plateX0, voxY, plateZ0 - wallT, plateX1, wallTop, plateZ0, 8]);
  mapBoxes.push([plateX0, voxY, plateZ1, plateX1, wallTop, plateZ1 + wallT, 8]);
  const LAVA_N = 30;
  const LAVA_H = 40;
  const PILLAR = 10;
  const lavaX = -LAVA_N * CELL * 0.5;
  const lavaY = mapGroundY0 - CELL;
  const lavaZ = plateZ1;
  const lavaMid = 14;
  const lavaCx = lavaX + 15 * CELL;
  const lavaCz = lavaZ + 15 * CELL;
  const lavaOuter = 14.5 * CELL;
  const lavaInner = lavaOuter - CELL;
  function lavaInside(ix, iz) {
    const dx = lavaX + (ix + 0.5) * CELL - lavaCx;
    const dz = lavaZ + (iz + 0.5) * CELL - lavaCz;
    return dx * dx + dz * dz <= lavaInner * lavaInner;
  }
  const lavaGrid = new Uint8Array(LAVA_N * LAVA_H * LAVA_N);
  const lavaRgb = [[176, 184, 190], [255, 78, 18]];
  let lavaLevel = 1;
  let lavaClock = 0;
  const lavaRiseSec = 8;
  function lavaSheetY() {
    return lavaY + (lavaLevel - 1 + lavaClock / lavaRiseSec) * CELL;
  }
  function lavaAt(ix, iy, iz) {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= LAVA_N || iy >= LAVA_H || iz >= LAVA_N) return 0;
    return lavaGrid[ix + iz * LAVA_N + iy * LAVA_N * LAVA_N];
  }
  function setLava(ix, iy, iz, id) {
    lavaGrid[ix + iz * LAVA_N + iy * LAVA_N * LAVA_N] = id;
  }
  for (let iy = 0; iy < PILLAR; iy += 1) setLava(lavaMid, iy, lavaMid, 1);
  for (let iz = 0; iz < LAVA_N; iz += 1) {
    for (let ix = 0; ix < LAVA_N; ix += 1) {
      if (ix === lavaMid && iz === lavaMid) continue;
      if (!lavaInside(ix, iz)) continue;
      setLava(ix, 0, iz, 2);
    }
  }
  function riseLava() {
    if (lavaLevel >= LAVA_H) return;
    const old = lavaLevel - 1;
    for (let iz = 0; iz < LAVA_N; iz += 1) {
      for (let ix = 0; ix < LAVA_N; ix += 1) {
        if (lavaAt(ix, old, iz) === 2) setLava(ix, old, iz, 0);
      }
    }
    const iy = lavaLevel;
    for (let iz = 0; iz < LAVA_N; iz += 1) {
      for (let ix = 0; ix < LAVA_N; ix += 1) {
        if (lavaAt(ix, iy, iz)) continue;
        if (!lavaInside(ix, iz)) continue;
        setLava(ix, iy, iz, 2);
      }
    }
    lavaLevel += 1;
  }
  let roundLeft = 20;
  let teleported = false;
  const clockEl = document.getElementById("clock");
  const voxGrid = new Uint8Array(VW * VH * VD);
  const voxRgb = [
    [176, 184, 190],
    [32, 40, 54],
    [24, 26, 30],
    [232, 198, 96],
  ];
  const FLOOR_N = 16;
  const FLOOR_W = 8;
  const floorX0 = -16;
  const floorZ0 = -16;
  const floorRgb = [176, 184, 190];
  const floorGrids = [];
  let floorFace = [];

  function floorLayerY(layer) {
    return mapGroundY0 + layer * 8;
  }

  function rebuildFloorFace() {
    floorFace = [];
    for (let layer = 0; layer < FLOOR_N; layer += 1) {
      const grid = floorGrids[layer];
      const y0 = floorLayerY(layer);
      for (let iz = 0; iz < FLOOR_W; iz += 1) {
        for (let ix = 0; ix < FLOOR_W; ix += 1) {
          if (!grid[ix + iz * FLOOR_W]) continue;
          const x0 = floorX0 + ix * CELL;
          const z0 = floorZ0 + iz * CELL;
          floorFace.push({
            x0: x0,
            y0: y0,
            z0: z0,
            x1: x0 + CELL,
            y1: y0 + CELL,
            z1: z0 + CELL,
            cx: x0 + CELL * 0.5,
            cy: y0 + CELL * 0.5,
            cz: z0 + CELL * 0.5,
            gray: 1,
          });
        }
      }
    }
  }

  function carveFloors(ox, oy, oz, radius) {
    const r2 = radius * radius;
    let changed = false;
    for (let layer = 0; layer < FLOOR_N; layer += 1) {
      const cy = floorLayerY(layer) + CELL * 0.5;
      if (Math.abs(cy - oy) > radius + CELL) continue;
      const grid = floorGrids[layer];
      for (let iz = 0; iz < FLOOR_W; iz += 1) {
        for (let ix = 0; ix < FLOOR_W; ix += 1) {
          const at = ix + iz * FLOOR_W;
          if (!grid[at]) continue;
          const cx = floorX0 + (ix + 0.5) * CELL;
          const cz = floorZ0 + (iz + 0.5) * CELL;
          const dx = cx - ox;
          const dy = cy - oy;
          const dz = cz - oz;
          if (dx * dx + dy * dy + dz * dz > r2) continue;
          grid[at] = 0;
          changed = true;
        }
      }
    }
    if (changed) rebuildFloorFace();
  }

  function floorBlocked(px, py, pz) {
    const pad = 1.05;
    const ix0 = Math.floor((px - pad - floorX0) / CELL);
    const ix1 = Math.floor((px + pad - floorX0) / CELL);
    const iz0 = Math.floor((pz - pad - floorZ0) / CELL);
    const iz1 = Math.floor((pz + pad - floorZ0) / CELL);
    for (let iz = iz0; iz <= iz1; iz += 1) {
      if (iz < 0 || iz >= FLOOR_W) continue;
      for (let ix = ix0; ix <= ix1; ix += 1) {
        if (ix < 0 || ix >= FLOOR_W) continue;
        for (let layer = 0; layer < FLOOR_N; layer += 1) {
          if (!floorGrids[layer][ix + iz * FLOOR_W]) continue;
          const y0 = floorLayerY(layer);
          if (py > y0 - pad && py < y0 + CELL + pad) return true;
        }
      }
    }
    return false;
  }

  function floorStand(px, py, pz) {
    const ix = Math.floor((px - floorX0) / CELL);
    const iz = Math.floor((pz - floorZ0) / CELL);
    if (ix < 0 || iz < 0 || ix >= FLOOR_W || iz >= FLOOR_W) return 0;
    let stand = 0;
    for (let layer = 0; layer < FLOOR_N; layer += 1) {
      if (!floorGrids[layer][ix + iz * FLOOR_W]) continue;
      const top = floorLayerY(layer) + CELL + 1;
      if (top <= py + 1.2 && top > stand) stand = top;
    }
    return stand;
  }

  for (let layer = 0; layer < FLOOR_N; layer += 1) floorGrids.push(new Uint8Array(FLOOR_W * FLOOR_W));

  function voxAt(ix, iy, iz) {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= VW || iy >= VH || iz >= VD) return 0;
    return voxGrid[ix + iz * VW + iy * VW * VD];
  }

  function buildVoxels() {
    for (let iz = 0; iz < VD; iz += 1) {
      for (let ix = 0; ix < VW; ix += 1) voxGrid[ix + iz * VW] = 1;
    }
  }

  buildVoxels();

  function carveBuilding(ox, oy, oz, radius) {
    const r2 = radius * radius;
    for (let iy = 0; iy < VH; iy += 1) {
      for (let iz = 0; iz < VD; iz += 1) {
        for (let ix = 0; ix < VW; ix += 1) {
          const cx = voxX + (ix + 0.5) * CELL;
          const cy = voxY + (iy + 0.5) * CELL;
          const cz = voxZ + (iz + 0.5) * CELL;
          const dx = cx - ox;
          const dy = cy - oy;
          const dz = cz - oz;
          if (dx * dx + dy * dy + dz * dz > r2) continue;
          voxGrid[ix + iz * VW + iy * VW * VD] = 0;
        }
      }
    }
    mineCarve(ox, oy, oz, radius);
    carveFloors(ox, oy, oz, radius);
  }

  const MINE = 8;
  const mineIX = 8;
  const mineIZ = 0;
  const mineShell = new Map();
  const mineAir = new Set();
  const mineChunks = new Map();
  const mineRgb = [132, 116, 96];
  let mineFace = [];

  function mineKey(ix, iy, iz) {
    return ix + "," + iy + "," + iz;
  }

  function mineChunkKey(ix, iy, iz) {
    return Math.floor(ix / MINE) + "," + Math.floor(iy / MINE) + "," + Math.floor(iz / MINE);
  }

  function mineChunk(ix, iy, iz) {
    const key = mineChunkKey(ix, iy, iz);
    let chunk = mineChunks.get(key);
    if (chunk) return chunk;
    chunk = {
      cx: Math.floor(ix / MINE),
      cy: Math.floor(iy / MINE),
      cz: Math.floor(iz / MINE),
      grid: new Uint8Array(MINE * MINE * MINE),
      n: 0,
    };
    mineChunks.set(key, chunk);
    return chunk;
  }

  function mineIndex(chunk, ix, iy, iz) {
    const lx = ix - chunk.cx * MINE;
    const ly = iy - chunk.cy * MINE;
    const lz = iz - chunk.cz * MINE;
    if (lx < 0 || ly < 0 || lz < 0 || lx >= MINE || ly >= MINE || lz >= MINE) return -1;
    return lx + lz * MINE + ly * MINE * MINE;
  }

  function mineInChunk(ix, iy, iz) {
    return ix >= mineIX && ix < mineIX + MINE && iz >= mineIZ && iz < mineIZ + MINE && iy <= -1 && iy >= -MINE;
  }

  function minePut(ix, iy, iz) {
    if (!mineInChunk(ix, iy, iz)) return;
    const key = mineKey(ix, iy, iz);
    if (mineAir.has(key) || mineShell.has(key)) return;
    mineShell.set(key, 1);
    const chunk = mineChunk(ix, iy, iz);
    const at = mineIndex(chunk, ix, iy, iz);
    if (at >= 0 && !chunk.grid[at]) {
      chunk.grid[at] = 1;
      chunk.n += 1;
    }
  }

  function mineShellRemove(ix, iy, iz) {
    const key = mineKey(ix, iy, iz);
    if (!mineShell.has(key)) return;
    mineShell.delete(key);
    const chunk = mineChunks.get(mineChunkKey(ix, iy, iz));
    if (!chunk) return;
    const at = mineIndex(chunk, ix, iy, iz);
    if (at >= 0 && chunk.grid[at]) {
      chunk.grid[at] = 0;
      chunk.n -= 1;
      if (chunk.n <= 0) mineChunks.delete(mineChunkKey(ix, iy, iz));
    }
  }

  function mineCarve(ox, oy, oz, radius) {
    const r2 = radius * radius;
    const hit = [];
    mineShell.forEach((v, key) => {
      const part = key.split(",");
      const ix = +part[0];
      const iy = +part[1];
      const iz = +part[2];
      const cx = (ix + 0.5) * CELL;
      const cy = mapGroundY0 + (iy + 0.5) * CELL;
      const cz = (iz + 0.5) * CELL;
      const dx = cx - ox;
      const dy = cy - oy;
      const dz = cz - oz;
      if (dx * dx + dy * dy + dz * dz > r2) return;
      hit.push(ix, iy, iz);
    });
    for (let i = 0; i < hit.length; i += 3) {
      const ix = hit[i];
      const iy = hit[i + 1];
      const iz = hit[i + 2];
      mineAir.add(mineKey(ix, iy, iz));
      mineShellRemove(ix, iy, iz);
    }
    if (hit.length) mineMark();
  }

  function mineAirDist(ix, iy, iz) {
    const near = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (let i = 0; i < near.length; i += 1) {
      if (mineAir.has(mineKey(ix + near[i][0], iy + near[i][1], iz + near[i][2]))) return 1;
    }
    for (let i = 0; i < near.length; i += 1) {
      const ax = ix + near[i][0];
      const ay = iy + near[i][1];
      const az = iz + near[i][2];
      for (let j = 0; j < near.length; j += 1) {
        if (mineAir.has(mineKey(ax + near[j][0], ay + near[j][1], az + near[j][2]))) return 2;
      }
    }
    return 9;
  }

  function mineMark() {
    const drop = [];
    mineShell.forEach((v, key) => {
      const part = key.split(",");
      const ix = +part[0];
      const iy = +part[1];
      const iz = +part[2];
      const dist = mineAirDist(ix, iy, iz);
      if (dist > 2) drop.push(ix, iy, iz);
      else mineShell.set(key, dist);
    });
    for (let i = 0; i < drop.length; i += 3) mineShellRemove(drop[i], drop[i + 1], drop[i + 2]);
    mineFace = [];
    mineShell.forEach((dist, key) => {
      if (dist !== 1) return;
      const part = key.split(",");
      const ix = +part[0];
      const iy = +part[1];
      const iz = +part[2];
      mineFace.push({
        x0: ix * CELL,
        y0: mapGroundY0 + iy * CELL,
        z0: iz * CELL,
        x1: (ix + 1) * CELL,
        y1: mapGroundY0 + (iy + 1) * CELL,
        z1: (iz + 1) * CELL,
        cx: (ix + 0.5) * CELL,
        cy: mapGroundY0 + (iy + 0.5) * CELL,
        cz: (iz + 0.5) * CELL,
      });
    });
  }

  function inMineMouth(wx, wz) {
    return wx >= mineIX * CELL && wx < (mineIX + MINE) * CELL && wz >= mineIZ * CELL && wz < (mineIZ + MINE) * CELL;
  }

  function openMine() {
    for (let iy = -MINE; iy <= -1; iy += 1) {
      for (let iz = 0; iz < MINE; iz += 1) {
        for (let ix = 0; ix < MINE; ix += 1) {
          const side = ix <= 1 || ix >= MINE - 2 || iz <= 1 || iz >= MINE - 2;
          const bed = iy <= -MINE + 1;
          if (iy < -1 && (side || bed)) minePut(mineIX + ix, iy, mineIZ + iz);
          else mineAir.add(mineKey(mineIX + ix, iy, mineIZ + iz));
        }
      }
    }
    mineMark();
  }

  function mineChunkHit(ox, oy, oz, dx, dy, dz, chunk) {
    const x0 = chunk.cx * MINE * CELL;
    const y0 = mapGroundY0 + chunk.cy * MINE * CELL;
    const z0 = chunk.cz * MINE * CELL;
    const x1 = x0 + MINE * CELL;
    const y1 = y0 + MINE * CELL;
    const z1 = z0 + MINE * CELL;
    let tmin = 0.05;
    let tmax = 160;
    const slabs = [
      [dx, ox, x0, x1],
      [dy, oy, y0, y1],
      [dz, oz, z0, z1],
    ];
    for (let i = 0; i < 3; i += 1) {
      const d = slabs[i][0];
      const o = slabs[i][1];
      const a = slabs[i][2];
      const b = slabs[i][3];
      if (Math.abs(d) < 1e-8) {
        if (o < a || o > b) return null;
      } else {
        let ta = (a - o) / d;
        let tb = (b - o) / d;
        if (ta > tb) {
          const swap = ta;
          ta = tb;
          tb = swap;
        }
        if (ta > tmin) tmin = ta;
        if (tb < tmax) tmax = tb;
        if (tmin > tmax) return null;
      }
    }
    const px = ox + dx * (tmin + 0.0001);
    const py = oy + dy * (tmin + 0.0001);
    const pz = oz + dz * (tmin + 0.0001);
    let ix = Math.floor(px / CELL);
    let iy = Math.floor((py - mapGroundY0) / CELL);
    let iz = Math.floor(pz / CELL);
    const stepX = dx >= 0 ? 1 : -1;
    const stepY = dy >= 0 ? 1 : -1;
    const stepZ = dz >= 0 ? 1 : -1;
    const tDeltaX = Math.abs(dx) > 1e-8 ? CELL / Math.abs(dx) : 1e9;
    const tDeltaY = Math.abs(dy) > 1e-8 ? CELL / Math.abs(dy) : 1e9;
    const tDeltaZ = Math.abs(dz) > 1e-8 ? CELL / Math.abs(dz) : 1e9;
    let tMaxX = Math.abs(dx) > 1e-8 ? tmin + ((dx > 0 ? (ix + 1) * CELL : ix * CELL) - px) / dx : 1e9;
    let tMaxY = Math.abs(dy) > 1e-8 ? tmin + ((dy > 0 ? mapGroundY0 + (iy + 1) * CELL : mapGroundY0 + iy * CELL) - py) / dy : 1e9;
    let tMaxZ = Math.abs(dz) > 1e-8 ? tmin + ((dz > 0 ? (iz + 1) * CELL : iz * CELL) - pz) / dz : 1e9;
    let tHit = tmin;
    for (let n = 0; n < MINE * 3 + 3; n += 1) {
      const at = mineIndex(chunk, ix, iy, iz);
      if (at >= 0 && chunk.grid[at]) return tHit;
      if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
        if (tMaxX > tmax) return null;
        ix += stepX;
        tHit = tMaxX;
        tMaxX += tDeltaX;
      } else if (tMaxY <= tMaxZ) {
        if (tMaxY > tmax) return null;
        iy += stepY;
        tHit = tMaxY;
        tMaxY += tDeltaY;
    } else {
        if (tMaxZ > tmax) return null;
        iz += stepZ;
        tHit = tMaxZ;
        tMaxZ += tDeltaZ;
      }
    }
    return null;
  }

  function mineBlocked(px, py, pz) {
    const pad = 1.05;
    const ix0 = Math.floor((px - pad) / CELL);
    const ix1 = Math.floor((px + pad) / CELL);
    const iy0 = Math.floor((py - pad - mapGroundY0) / CELL);
    const iy1 = Math.floor((py + pad - mapGroundY0) / CELL);
    const iz0 = Math.floor((pz - pad) / CELL);
    const iz1 = Math.floor((pz + pad) / CELL);
    for (let iy = iy0; iy <= iy1; iy += 1) {
      for (let iz = iz0; iz <= iz1; iz += 1) {
        for (let ix = ix0; ix <= ix1; ix += 1) {
          if (!mineShell.has(mineKey(ix, iy, iz))) continue;
          const a0 = ix * CELL;
          const a1 = a0 + CELL;
          const b0 = mapGroundY0 + iy * CELL;
          const b1 = b0 + CELL;
          const c0 = iz * CELL;
          const c1 = c0 + CELL;
          if (px > a0 - pad && px < a1 + pad && py > b0 - pad && py < b1 + pad && pz > c0 - pad && pz < c1 + pad) return true;
        }
      }
    }
    return false;
  }

  function gridHit(ox, oy, oz, dx, dy, dz, far, gx, gy, gz, gw, gh, gd, at) {
    const x1 = gx + gw * CELL;
    const y1 = gy + gh * CELL;
    const z1 = gz + gd * CELL;
    let tmin = 0.05;
    let tmax = far || 160;
    const slabs = [
      [dx, ox, gx, x1],
      [dy, oy, gy, y1],
      [dz, oz, gz, z1],
    ];
    for (let i = 0; i < 3; i += 1) {
      const d = slabs[i][0];
      const o = slabs[i][1];
      const a = slabs[i][2];
      const b = slabs[i][3];
      if (Math.abs(d) < 1e-8) {
        if (o < a || o > b) return null;
      } else {
        let ta = (a - o) / d;
        let tb = (b - o) / d;
        if (ta > tb) {
          const swap = ta;
          ta = tb;
          tb = swap;
        }
        if (ta > tmin) tmin = ta;
        if (tb < tmax) tmax = tb;
        if (tmin > tmax) return null;
      }
    }
    const px = ox + dx * (tmin + 0.0001);
    const py = oy + dy * (tmin + 0.0001);
    const pz = oz + dz * (tmin + 0.0001);
    let ix = Math.floor((px - gx) / CELL);
    let iy = Math.floor((py - gy) / CELL);
    let iz = Math.floor((pz - gz) / CELL);
    if (ix < 0) ix = 0;
    if (iy < 0) iy = 0;
    if (iz < 0) iz = 0;
    if (ix >= gw) ix = gw - 1;
    if (iy >= gh) iy = gh - 1;
    if (iz >= gd) iz = gd - 1;
    const stepX = dx >= 0 ? 1 : -1;
    const stepY = dy >= 0 ? 1 : -1;
    const stepZ = dz >= 0 ? 1 : -1;
    const tDeltaX = Math.abs(dx) > 1e-8 ? CELL / Math.abs(dx) : 1e9;
    const tDeltaY = Math.abs(dy) > 1e-8 ? CELL / Math.abs(dy) : 1e9;
    const tDeltaZ = Math.abs(dz) > 1e-8 ? CELL / Math.abs(dz) : 1e9;
    let tMaxX = Math.abs(dx) > 1e-8 ? tmin + ((dx > 0 ? gx + (ix + 1) * CELL : gx + ix * CELL) - px) / dx : 1e9;
    let tMaxY = Math.abs(dy) > 1e-8 ? tmin + ((dy > 0 ? gy + (iy + 1) * CELL : gy + iy * CELL) - py) / dy : 1e9;
    let tMaxZ = Math.abs(dz) > 1e-8 ? tmin + ((dz > 0 ? gz + (iz + 1) * CELL : gz + iz * CELL) - pz) / dz : 1e9;
    let tHit = tmin;
    const limit = gw + gh + gd + 3;
    for (let n = 0; n < limit; n += 1) {
      const id = at(ix, iy, iz);
      if (id) return { t: tHit, id: id, ix: ix, iy: iy, iz: iz };
      if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
        if (tMaxX > tmax) return null;
        ix += stepX;
        tHit = tMaxX;
        tMaxX += tDeltaX;
      } else if (tMaxY <= tMaxZ) {
        if (tMaxY > tmax) return null;
        iy += stepY;
        tHit = tMaxY;
        tMaxY += tDeltaY;
      } else {
        if (tMaxZ > tmax) return null;
        iz += stepZ;
        tHit = tMaxZ;
        tMaxZ += tDeltaZ;
      }
    }
    return null;
  }

  function layerHit(ox, oy, oz, dx, dy, dz, far, gx, gy, gz, gw, gd, at) {
    const x1 = gx + gw * CELL;
    const y1 = gy + CELL;
    const z1 = gz + gd * CELL;
    let tmin = 0.05;
    let tmax = far || 160;
    if (Math.abs(dx) < 1e-8) {
      if (ox < gx || ox > x1) return null;
    } else {
      let ta = (gx - ox) / dx;
      let tb = (x1 - ox) / dx;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > tmin) tmin = ta;
      if (tb < tmax) tmax = tb;
      if (tmin > tmax) return null;
    }
    if (Math.abs(dy) < 1e-8) {
      if (oy < gy || oy > y1) return null;
    } else {
      let ta = (gy - oy) / dy;
      let tb = (y1 - oy) / dy;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > tmin) tmin = ta;
      if (tb < tmax) tmax = tb;
      if (tmin > tmax) return null;
    }
    if (Math.abs(dz) < 1e-8) {
      if (oz < gz || oz > z1) return null;
    } else {
      let ta = (gz - oz) / dz;
      let tb = (z1 - oz) / dz;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > tmin) tmin = ta;
      if (tb < tmax) tmax = tb;
      if (tmin > tmax) return null;
    }
    const px = ox + dx * (tmin + 0.0001);
    const pz = oz + dz * (tmin + 0.0001);
    let ix = Math.floor((px - gx) / CELL);
    let iz = Math.floor((pz - gz) / CELL);
    if (ix < 0) ix = 0;
    if (iz < 0) iz = 0;
    if (ix >= gw) ix = gw - 1;
    if (iz >= gd) iz = gd - 1;
    const stepX = dx >= 0 ? 1 : -1;
    const stepZ = dz >= 0 ? 1 : -1;
    const tDeltaX = Math.abs(dx) > 1e-8 ? CELL / Math.abs(dx) : 1e9;
    const tDeltaZ = Math.abs(dz) > 1e-8 ? CELL / Math.abs(dz) : 1e9;
    let tMaxX = Math.abs(dx) > 1e-8 ? tmin + ((dx > 0 ? gx + (ix + 1) * CELL : gx + ix * CELL) - px) / dx : 1e9;
    let tMaxZ = Math.abs(dz) > 1e-8 ? tmin + ((dz > 0 ? gz + (iz + 1) * CELL : gz + iz * CELL) - pz) / dz : 1e9;
    let tHit = tmin;
    const limit = gw + gd + 2;
    for (let n = 0; n < limit; n += 1) {
      const id = at(ix, 0, iz);
      if (id) return { t: tHit, id: id, ix: ix, iy: 0, iz: iz };
      if (tMaxX < tMaxZ) {
        if (tMaxX > tmax) return null;
        ix += stepX;
        if (ix < 0 || ix >= gw) return null;
        tHit = tMaxX;
        tMaxX += tDeltaX;
      } else {
        if (tMaxZ > tmax) return null;
        iz += stepZ;
        if (iz < 0 || iz >= gd) return null;
        tHit = tMaxZ;
        tMaxZ += tDeltaZ;
      }
    }
    return null;
  }

  function voxelHit(ox, oy, oz, dx, dy, dz, far) {
    return layerHit(ox, oy, oz, dx, dy, dz, far, voxX, voxY, voxZ, VW, VD, voxAt);
  }

  function lavaHit(ox, oy, oz, dx, dy, dz, far) {
    if (lavaLevel <= 0) return null;
    const iy = lavaLevel - 1;
    return layerHit(ox, oy, oz, dx, dy, dz, far, lavaX, lavaSheetY(), lavaZ, LAVA_N, LAVA_N, function (ix, localIy, iz) {
      return lavaAt(ix, iy, iz) === 2 ? 2 : 0;
    });
  }

  function ringHit(ox, oy, oz, dx, dy, dz, far) {
    const y0 = lavaSheetY();
    const y1 = y0 + CELL;
    let best = far || 360;
    let hit = false;
    if (Math.abs(dy) > 1e-8) {
      const caps = [y0, y1];
      for (let i = 0; i < caps.length; i += 1) {
        const t = (caps[i] - oy) / dy;
        if (t <= 0.05 || t >= best) continue;
        const hx = ox + dx * t - lavaCx;
        const hz = oz + dz * t - lavaCz;
        const d2 = hx * hx + hz * hz;
        if (d2 <= lavaOuter * lavaOuter && d2 >= lavaInner * lavaInner) {
          best = t;
          hit = true;
        }
      }
    }
    const a = dx * dx + dz * dz;
    if (a > 1e-8) {
      const px = ox - lavaCx;
      const pz = oz - lavaCz;
      const b = 2 * (px * dx + pz * dz);
      const radii = [lavaOuter, lavaInner];
      for (let i = 0; i < radii.length; i += 1) {
        const c = px * px + pz * pz - radii[i] * radii[i];
        const disc = b * b - 4 * a * c;
        if (disc < 0) continue;
        const s = Math.sqrt(disc);
        const ts = [(-b - s) / (2 * a), (-b + s) / (2 * a)];
        for (let k = 0; k < ts.length; k += 1) {
          const t = ts[k];
          if (t <= 0.05 || t >= best) continue;
          const hy = oy + dy * t;
          if (hy < y0 || hy > y1) continue;
          best = t;
          hit = true;
        }
      }
    }
    return hit ? { t: best } : null;
  }

  function pillarHit(ox, oy, oz, dx, dy, dz, far) {
    return gridHit(ox, oy, oz, dx, dy, dz, far, lavaX + lavaMid * CELL, lavaY, lavaZ + lavaMid * CELL, 1, PILLAR, 1, function (ix, iy) {
      return lavaAt(lavaMid, iy, lavaMid) === 1 ? 1 : 0;
    });
  }

  function lavaEdge(ox, oy, oz, dx, dy, dz, t, gy, gx, gz) {
    const hx = ox + dx * t;
    const hy = oy + dy * t;
    const hz = oz + dz * t;
    const baseX = gx == null ? lavaX : gx;
    const baseY = gy == null ? lavaY : gy;
    const baseZ = gz == null ? lavaZ : gz;
    const du = Math.abs((hx - baseX) / CELL - Math.round((hx - baseX) / CELL));
    const dv = Math.abs((hy - baseY) / CELL - Math.round((hy - baseY) / CELL));
    const dw = Math.abs((hz - baseZ) / CELL - Math.round((hz - baseZ) / CELL));
    const edge = 0.12;
    if (du <= dv && du <= dw) return dv < edge || dw < edge;
    if (dv <= dw) return du < edge || dw < edge;
    return du < edge || dv < edge;
  }

  function voxCrack(ox, oy, oz, dx, dy, dz, t, hurt) {
    if (hurt <= 0) return false;
    const hx = ox + dx * t;
    const hy = oy + dy * t;
    const hz = oz + dz * t;
    const du = Math.abs((hx - voxX) / CELL - Math.round((hx - voxX) / CELL));
    const dv = Math.abs((hy - voxY) / CELL - Math.round((hy - voxY) / CELL));
    const dw = Math.abs((hz - voxZ) / CELL - Math.round((hz - voxZ) / CELL));
    let a;
    let b;
    if (du <= dv && du <= dw) {
      a = (hy - voxY) / CELL;
      b = (hz - voxZ) / CELL;
    } else if (dv <= dw) {
      a = (hx - voxX) / CELL;
      b = (hz - voxZ) / CELL;
    } else {
      a = (hx - voxX) / CELL;
      b = (hy - voxY) / CELL;
    }
    const fa = a - Math.floor(a);
    const fb = b - Math.floor(b);
    const bands = Math.max(1, Math.ceil(hurt * 4));
    const line = 0.045;
    for (let i = 1; i <= bands; i += 1) {
      const p = i / (bands + 1);
      if (Math.abs(fa - p) < line || Math.abs(fb - p) < line) return true;
      if (Math.abs(fa + fb - p * 1.3) < line) return true;
    }
    return false;
  }

  function voxEdge(ox, oy, oz, dx, dy, dz, t) {
    const hx = ox + dx * t;
    const hy = oy + dy * t;
    const hz = oz + dz * t;
    const du = Math.abs((hx - voxX) / CELL - Math.round((hx - voxX) / CELL));
    const dv = Math.abs((hy - voxY) / CELL - Math.round((hy - voxY) / CELL));
    const dw = Math.abs((hz - voxZ) / CELL - Math.round((hz - voxZ) / CELL));
    const edge = 0.12;
    if (du <= dv && du <= dw) return dv < edge || dw < edge;
    if (dv <= dw) return du < edge || dw < edge;
    return du < edge || dv < edge;
  }

  function mineEdge(ox, oy, oz, dx, dy, dz, t) {
    const hx = ox + dx * t;
    const hy = oy + dy * t;
    const hz = oz + dz * t;
    const du = Math.abs(hx / CELL - Math.round(hx / CELL));
    const dv = Math.abs((hy - mapGroundY0) / CELL - Math.round((hy - mapGroundY0) / CELL));
    const dw = Math.abs(hz / CELL - Math.round(hz / CELL));
    const edge = 0.12;
    if (du <= dv && du <= dw) return dv < edge || dw < edge;
    if (dv <= dw) return du < edge || dw < edge;
    return du < edge || dv < edge;
  }

  function voxelBlocked(px, py, pz) {
    const pad = spawnBallR;
    const y0 = bodyY0(py);
    const y1 = bodyY1(py);
    const ix0 = Math.floor((px - pad - voxX) / CELL);
    const ix1 = Math.floor((px + pad - voxX) / CELL);
    const iy0 = Math.floor((y0 - voxY) / CELL);
    const iy1 = Math.floor((y1 - voxY) / CELL);
    const iz0 = Math.floor((pz - pad - voxZ) / CELL);
    const iz1 = Math.floor((pz + pad - voxZ) / CELL);
    for (let iy = iy0; iy <= iy1; iy += 1) {
      for (let iz = iz0; iz <= iz1; iz += 1) {
        for (let ix = ix0; ix <= ix1; ix += 1) {
          if (!voxAt(ix, iy, iz)) continue;
          const a0 = blockX0(voxX, ix);
          const a1 = blockX1(voxX, ix);
          const b0 = voxY + iy * CELL;
          const b1 = b0 + CELL;
          const c0 = blockX0(voxZ, iz);
          const c1 = blockX1(voxZ, iz);
          if (px > a0 - pad && px < a1 + pad && y1 > b0 && y0 < b1 && pz > c0 - pad && pz < c1 + pad) return true;
        }
      }
    }
    if (mineBlocked(px, py, pz)) return true;
    if (lavaOverlap(px, py, pz, false)) return true;
    return floorBlocked(px, py, pz);
  }

  function lavaOverlap(px, py, pz, side) {
    return cellOverlap(px, py, pz, side, lavaX, lavaY, lavaZ, lavaAt);
  }

  function cellOverlap(px, py, pz, side, ox, oy, oz, at) {
    const pad = spawnBallR;
    const y0 = bodyY0(py);
    const y1 = bodyY1(py);
    const feet = y0;
    const ix0 = Math.floor((px - pad - ox) / CELL);
    const ix1 = Math.floor((px + pad - ox) / CELL);
    const iy0 = Math.floor((y0 - oy) / CELL);
    const iy1 = Math.floor((y1 - oy) / CELL);
    const iz0 = Math.floor((pz - pad - oz) / CELL);
    const iz1 = Math.floor((pz + pad - oz) / CELL);
    for (let iy = iy0; iy <= iy1; iy += 1) {
      for (let iz = iz0; iz <= iz1; iz += 1) {
        for (let ix = ix0; ix <= ix1; ix += 1) {
          if (at(ix, iy, iz) !== 1) continue;
          const b1 = oy + (iy + 1) * CELL;
          if (side && b1 <= feet + 0.4) continue;
          const a0 = blockX0(ox, ix);
          const a1 = blockX1(ox, ix);
          const b0 = oy + iy * CELL;
          const c0 = blockX0(oz, iz);
          const c1 = blockX1(oz, iz);
          if (px > a0 - pad && px < a1 + pad && y1 > b0 && y0 < b1 && pz > c0 - pad && pz < c1 + pad) return true;
        }
      }
    }
    return false;
  }

  function touchesLava(px, py, pz) {
    const pad = spawnBallR;
    const iy = lavaLevel - 1;
    const b0 = lavaSheetY();
    const b1 = b0 + CELL;
    const y0 = bodyY0(py);
    const y1 = bodyY1(py);
    if (y1 <= b0 || y0 >= b1) return false;
    if (Math.hypot(px - lavaCx, pz - lavaCz) - pad > lavaInner) return false;
    const ix0 = Math.floor((px - pad - lavaX) / CELL);
    const ix1 = Math.floor((px + pad - lavaX) / CELL);
    const iz0 = Math.floor((pz - pad - lavaZ) / CELL);
    const iz1 = Math.floor((pz + pad - lavaZ) / CELL);
    for (let iz = iz0; iz <= iz1; iz += 1) {
      for (let ix = ix0; ix <= ix1; ix += 1) {
        if (lavaAt(ix, iy, iz) !== 2) continue;
        const a0 = lavaX + ix * CELL;
        const a1 = a0 + CELL;
        const c0 = lavaZ + iz * CELL;
        const c1 = c0 + CELL;
        if (px > a0 - pad && px < a1 + pad && pz > c0 - pad && pz < c1 + pad) return true;
      }
    }
          return false;
  }

  function voxelSideBlocked(px, py, pz) {
    const pad = spawnBallR;
    const y0 = bodyY0(py);
    const y1 = bodyY1(py);
    const feet = y0;
    const ix0 = Math.floor((px - pad - voxX) / CELL);
    const ix1 = Math.floor((px + pad - voxX) / CELL);
    const iy0 = Math.floor((y0 - voxY) / CELL);
    const iy1 = Math.floor((y1 - voxY) / CELL);
    const iz0 = Math.floor((pz - pad - voxZ) / CELL);
    const iz1 = Math.floor((pz + pad - voxZ) / CELL);
    for (let iy = iy0; iy <= iy1; iy += 1) {
      for (let iz = iz0; iz <= iz1; iz += 1) {
        for (let ix = ix0; ix <= ix1; ix += 1) {
          if (!voxAt(ix, iy, iz)) continue;
          const b1 = voxY + (iy + 1) * CELL;
          if (b1 <= feet + 0.4) continue;
          const a0 = blockX0(voxX, ix);
          const a1 = blockX1(voxX, ix);
          const b0 = voxY + iy * CELL;
          const c0 = blockX0(voxZ, iz);
          const c1 = blockX1(voxZ, iz);
          if (px > a0 - pad && px < a1 + pad && y1 > b0 && y0 < b1 && pz > c0 - pad && pz < c1 + pad) return true;
        }
      }
    }
    if (lavaOverlap(px, py, pz, true)) return true;
    return false;
  }

  function escapeVoxels(px, py, pz) {
    if (!voxelBlocked(px, py, pz)) return [px, py, pz];
    const step = 0.5;
    let bestX = px;
    let bestY = py;
    let bestZ = pz;
    let bestD = 1e9;
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (let d = 0; d < dirs.length; d += 1) {
      const dir = dirs[d];
      for (let n = 1; n <= 48; n += 1) {
        const qx = px + dir[0] * step * n;
        const qy = py + dir[1] * step * n;
        const qz = pz + dir[2] * step * n;
        if (voxelBlocked(qx, qy, qz)) continue;
        if (step * n < bestD) {
          bestD = step * n;
          bestX = qx;
          bestY = qy;
          bestZ = qz;
        }
        break;
      }
    }
    return [bestX, bestY, bestZ];
  }

  function collideVoxels() {
    const out = escapeVoxels(moveX, moveY, moveZ);
    moveX = out[0];
    moveY = out[1];
    moveZ = out[2];
    const dx = x - moveX;
    const dy = y - moveY;
    const dz = z - moveZ;
    const dist = Math.hypot(dx, dy, dz);
    const steps = Math.max(1, Math.ceil(dist / Math.max(0.8, CELL * 0.35)));
    let cx = moveX;
    let cy = moveY;
    let cz = moveZ;
    const sx = dx / steps;
    const sy = dy / steps;
    const sz = dz / steps;
    for (let i = 0; i < steps; i += 1) {
      const ny = cy + sy;
      if (voxelBlocked(cx, ny, cz)) {
        if (sy < 0) {
          vy = Math.max(vy, 0);
          grounded = true;
        } else if (sy > 0) vy = Math.min(vy, 0);
      } else cy = ny;
      const nx = cx + sx;
      if (voxelSideBlocked(nx, cy, cz)) {
        if (sx > 0) vx = Math.min(vx, 0);
        else if (sx < 0) vx = Math.max(vx, 0);
      } else cx = nx;
      const nz = cz + sz;
      if (voxelSideBlocked(cx, cy, nz)) {
        if (sz > 0) vz = Math.min(vz, 0);
        else if (sz < 0) vz = Math.max(vz, 0);
      } else cz = nz;
    }
    x = cx;
    y = cy;
    z = cz;
    separateRing();
    moveX = x;
    moveY = y;
    moveZ = z;
  }

  function separateRing() {
    const b0 = lavaSheetY();
    const b1 = b0 + CELL;
    const y0 = bodyY0(y);
    const y1 = bodyY1(y);
    if (y1 <= b0 || y0 >= b1) return;
    const dx = x - lavaCx;
    const dz = z - lavaCz;
    const dist = Math.hypot(dx, dz);
    const pad = spawnBallR;
    if (dist + pad <= lavaInner || dist - pad >= lavaOuter) return;
    const nx = dist > 1e-4 ? dx / dist : 1;
    const nz = dist > 1e-4 ? dz / dist : 0;
    const fromOut = dist >= (lavaInner + lavaOuter) * 0.5;
    if (fromOut) {
      x = lavaCx + nx * (lavaOuter + pad);
      z = lavaCz + nz * (lavaOuter + pad);
    } else {
      x = lavaCx + nx * (lavaInner - pad);
      z = lavaCz + nz * (lavaInner - pad);
    }
    const vn = vx * nx + vz * nz;
    if ((fromOut && vn < 0) || (!fromOut && vn > 0)) {
      vx -= vn * nx;
      vz -= vn * nz;
    }
  }

  function collideMap() {
    collideBoxes();
    collideVoxels();
  }

  function hurtPad(pad, amount) {
    if (!pad.alive || pad.immortal || amount <= 0 || pad.hurt > 0) return false;
    pad.hp = Math.max(0, pad.hp - amount);
    pad.hurt = 0.5;
    playHit();
    popText(pad.x, pad.y + 3, pad.z, "때림 " + amount, "#ffe14a");
    if (pad.hp <= 0) {
      pad.alive = false;
      burstAt(pad.x, pad.y, pad.z, 22);
      playBoom();
      if (pad.mine) {
        if (downTime > 0 || fuel <= 0) {
          downTime = 0;
          gameOver = true;
        }
    } else {
        foeDown = 0;
        addMoney(600);
        checkWin();
      }
    }
    return true;
  }

  function stepChaser(dt) {
    if (!chaser) return;
    if (chaser.hurt > 0) chaser.hurt -= dt;
    let dx = x - chaser.x;
    let dy = y - chaser.y;
    let dz = z - chaser.z;
    let dist = Math.hypot(dx, dy, dz);
    if (dist < 0.05) {
      dx = 1;
      dy = 0;
      dz = 0;
      dist = 1;
    }
    const speed = 22;
    chaser.x += (dx / dist) * speed * dt;
    chaser.y += (dy / dist) * speed * dt;
    chaser.z += (dz / dist) * speed * dt;
    const reach = spawnBallR + hitHalf;
    const ndx = x - chaser.x;
    const ndy = y - chaser.y;
    const ndz = z - chaser.z;
    const nd = Math.hypot(ndx, ndy, ndz);
    if (nd >= reach || nd < 0.001) return;
    const push = reach - nd;
    chaser.x -= (ndx / nd) * push;
    chaser.y -= (ndy / nd) * push;
    chaser.z -= (ndz / nd) * push;
    if (downTime > 0 || gameOver || chaser.hurt > 0) return;
    if (harm(ramDamage(speed))) chaser.hurt = 0.55;
  }

  function hitSpawns(dt) {
    const reach = spawnBallR + hitHalf;
    const reach2 = reach * reach;
    for (let i = 0; i < spawnPads.length; i += 1) {
      const pad = spawnPads[i];
      if (!pad.alive) continue;
      if (pad.hurt > 0) pad.hurt -= dt;
    }
    if (downTime <= 0) {
      const speed = Math.hypot(vx, vy, vz);
      for (let i = 0; i < spawnPads.length; i += 1) {
        const pad = spawnPads[i];
        if (!pad.alive || pad.immortal || pad.mine || pad.hurt > 0) continue;
        const dx = x - pad.x;
        const dy = y - pad.y;
        const dz = z - pad.z;
        if (dx * dx + dy * dy + dz * dz >= reach2) continue;
        hurtPad(pad, ramDamage(speed));
      }
    }
    if (!foesOn) return;
    for (let fi = 0; fi < foes.length; fi += 1) {
      const foe = foes[fi];
      const fSpeed = Math.hypot(foe.vx, foe.vy, foe.vz);
      for (let i = 0; i < spawnPads.length; i += 1) {
        const pad = spawnPads[i];
        if (!pad.alive || pad.immortal || !pad.mine || pad.hurt > 0) continue;
        const dx = foe.x - pad.x;
        const dy = foe.y - pad.y;
        const dz = foe.z - pad.z;
        if (dx * dx + dy * dy + dz * dz >= reach2) continue;
        hurtPad(pad, ramDamage(fSpeed));
      }
    }
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
      if (s.meteor) {
      const q = projectShot(s.x - s.vx * 0.07, s.y - s.vy * 0.07, s.z - s.vz * 0.07);
      ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
      if (q) {
        const steps = Math.max(1, Math.min(12, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]))));
        for (let k = 0; k <= steps; k += 1) {
          const u = k / steps;
          const sx = Math.floor(q[0] + (p[0] - q[0]) * u);
          const sy = Math.floor(q[1] + (p[1] - q[1]) * u);
          if (sx < 0 || sy < 0 || sx >= bw || sy >= bh) continue;
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.fillRect(Math.floor(p[0]), Math.floor(p[1]), 2, 2);
        continue;
      }
    ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
      const sz = s.px || (a > 0.45 ? 2 : 1);
      ctx.fillRect(Math.floor(p[0]), Math.floor(p[1]), sz, sz);
    }
  }

  function spinPoint(p, axis, ang) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const oc = 1 - c;
    const x = p[0];
    const y = p[1];
    const z = p[2];
    const ax = axis[0];
    const ay = axis[1];
    const az = axis[2];
    return [
      (c + ax * ax * oc) * x + (ax * ay * oc - az * s) * y + (ax * az * oc + ay * s) * z,
      (ay * ax * oc + az * s) * x + (c + ay * ay * oc) * y + (ay * az * oc - ax * s) * z,
      (az * ax * oc - ay * s) * x + (az * ay * oc + ax * s) * y + (c + az * az * oc) * z,
    ];
  }

  function startBandSkill() {
    if (wingSkill > 0 || wingDone) return;
    unlockAudio();
    noBoost = true;
    boost = 0;
    const b = axes(yaw, pitch);
    wingBits = [];
    for (let i = 0; i < fins.length; i += 1) {
      const f = fins[i];
      const lx = (f[0] + f[3]) * 0.5;
      const ly = (f[1] + f[4]) * 0.5;
      const lz = (f[2] + f[5]) * 0.5;
      const hx = Math.abs(f[3] - f[0]) * 0.5;
      const hy = Math.abs(f[4] - f[1]) * 0.5;
      const hz = Math.abs(f[5] - f[2]) * 0.5;
      let corners;
      if (hy <= hx && hy <= hz) corners = [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz]];
      else if (hx <= hy && hx <= hz) corners = [[0, -hy, -hz], [0, hy, -hz], [0, hy, hz], [0, -hy, hz]];
      else corners = [[-hx, -hy, 0], [hx, -hy, 0], [hx, hy, 0], [-hx, hy, 0]];
      let ox = b.rx * lx + b.ux * ly + b.fx * lz;
      let oy = b.ry * lx + b.uy * ly + b.fy * lz;
      let oz = b.rz * lx + b.uz * ly + b.fz * lz;
      const ol = Math.hypot(ox, oy, oz) || 1;
      ox /= ol;
      oy /= ol;
      oz /= ol;
      wingBits.push({
        x: x + b.rx * lx + b.ux * ly + b.fx * lz,
        y: y + b.ry * lx + b.uy * ly + b.fy * lz,
        z: z + b.rz * lx + b.uz * ly + b.fz * lz,
        vx: ox * 8 + vx * 0.2,
        vy: oy * 8 - 3 + vy * 0.2,
        vz: oz * 8 + vz * 0.2,
        axis: [ox, oy, oz],
        ang: 0,
        spin: (i % 2 === 0 ? 2.4 : -2.4),
        age: 0,
        corners: corners,
      });
    }
    wingSkill = 0.001;
    syncSkill();
  }

  function stepWingSkill(dt) {
    if (wingSkill <= 0) return;
    wingSkill += dt;
    for (let i = wingBits.length - 1; i >= 0; i -= 1) {
      const bit = wingBits[i];
      bit.age += dt;
      bit.vy -= 16 * dt;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.z += bit.vz * dt;
      bit.ang += bit.spin * dt;
      if (bit.age >= 3) wingBits.splice(i, 1);
    }
    if (wingSkill >= 3 && !wingDone) {
      wingDone = true;
      noBoost = true;
      if (downTime <= 0 && !gameOver) {
        vx *= 2;
        vy *= 2;
        vz *= 2;
      }
      wingBits = [];
      syncSkill();
    }
  }

  function drawWingBits() {
    ctx.globalAlpha = 1;
    for (let i = 0; i < wingBits.length; i += 1) {
      const bit = wingBits[i];
      let alpha = 1;
      if (bit.age > 2) alpha = Math.max(0, 1 - (bit.age - 2));
      if (alpha <= 0) continue;
      const spread = 1 + Math.min(1, bit.age / 2) * 0.85;
      const pts = [];
      let visible = true;
      for (let k = 0; k < bit.corners.length; k += 1) {
        const c = bit.corners[k];
        const spun = spinPoint([c[0] * spread, c[1] * spread, c[2] * spread], bit.axis, bit.ang);
        const p = projectShot(bit.x + spun[0], bit.y + spun[1], bit.z + spun[2]);
        if (!p) {
          visible = false;
          break;
        }
        pts.push(p);
      }
      if (!visible) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgb(42,108,230)";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.lineTo(pts[3][0], pts[3][1]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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
    noseTip = bodyFront + 1.2 * len * (spec.noseMul || 1);
    const noseK = (spec.noseSharp == null ? 0.48 : spec.noseSharp) * fat / len;
    noseK2 = noseK * noseK;
    frontR2 = 0.58 * fat * (0.58 * fat);
    flameMul = spec.flame;
    flameRoot = 0.253 * flameMul;
    const hole = 0.26 * flameMul;
    flameHole2 = hole * hole;
    const built = buildFins(spec);
    fins = built.fins;
    finTris = built.tris;
    finDiags = built.diags || [];
    wingOut = built.wingOut;
    wingZ = built.wingZ;
    speedMul = spec.speed * (1 + speedLv * 0.12);
    fuelSec = 30 * spec.fuel * (1 + fuelLv * 0.2);
    mass = spec.mass;
    shipFat = fat;
    shipWing = spec.wing;
  }

  const skillEl = document.getElementById("skill");
  const skillCoolEl = document.getElementById("skill-cool");
  const skillCoolFill = document.getElementById("skill-cool-fill");
  function drawSkillMark() {
    const mark = document.getElementById("skill-mark");
    if (!mark) return;
    const g = mark.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 16, 20);
    g.fillStyle = "#f2f2f4";
    const rows = ["11111", "10000", "10000", "11110", "10000", "10000", "11111"];
    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        if (rows[y][x] === "1") g.fillRect(3 + x * 2, 3 + y * 2, 2, 2);
      }
    }
  }
  function paintSkillCool() {
    if (!skillCoolFill || skillCoolFill.tagName !== "CANVAS") return;
    const g = skillCoolFill.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#3c3c42";
    g.fillRect(0, 0, 34, 4);
    let ratio = 0;
    if (rocketId === "violet") ratio = violetEnergy;
    else if (rocketId === "basic") ratio = 1 - basicCool / basicCoolSec;
    const n = Math.round(34 * Math.max(0, Math.min(1, ratio)));
    if (n > 0) {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, n, 4);
    }
  }
  function syncSkill() {
    if (!skillEl) return;
    const bandReady = rocketId === "band" && wingSkill <= 0 && !wingDone;
    const violetReady = rocketId === "violet";
    const basicReady = rocketId === "basic";
    skillEl.hidden = !bandReady && !violetReady && !basicReady;
    if (skillCoolEl) skillCoolEl.hidden = rocketId !== "violet" && rocketId !== "basic";
    paintSkillCool();
  }

  function pickRocket(spec) {
    rocketId = spec.id;
    applyShip(spec);
    if (onRail && !railLocked) fuel = 1;
    syncSkill();
  }

  function paintRocketCanvas(pctx, gw, gh, view) {
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
    const tan = 0.72 * (view || 1);
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

  function refreshShopState() {
    if (!shopMoney || !shopRockets || !shopUps) return;
    shopMoney.textContent = money + "원";
    shopRockets.querySelectorAll(".shop-row").forEach((btn) => {
      const id = btn.dataset.id;
      const priceEl = btn.querySelector(".price");
      const owned = !!ownedRockets[id];
      const price = shopPrice[id];
      if (owned) {
        priceEl.textContent = "보유";
        btn.classList.remove("poor");
      } else {
        priceEl.textContent = price + "원";
        btn.classList.toggle("poor", money < price);
      }
      btn.classList.toggle("on", rocketId === id);
    });
    shopUps.querySelectorAll(".shop-row").forEach((btn) => {
      const id = btn.dataset.id;
      const lv = id === "speed" ? speedLv : fuelLv;
      const priceEl = btn.querySelector(".price");
      const lvEl = btn.querySelector(".lv");
      lvEl.textContent = lv + "/" + upMax;
      if (lv >= upMax) {
        priceEl.textContent = "최대";
        btn.classList.add("poor");
      } else {
        const price = upPrice(lv);
        priceEl.textContent = price + "원";
        btn.classList.toggle("poor", money < price);
      }
    });
  }

  function buyRocket(spec) {
    if (!onRail || railLocked || gameOver) return;
    if (ownedRockets[spec.id]) {
      unlockAudio();
      playClick();
      pickRocket(spec);
      refreshShopState();
      return;
    }
    const price = shopPrice[spec.id];
    if (money < price) return;
    money -= price;
    ownedRockets[spec.id] = true;
    unlockAudio();
    playClick();
    pickRocket(spec);
    refreshShopState();
  }

  function buyUpgrade(id) {
    if (!onRail || railLocked || gameOver) return;
    const lv = id === "speed" ? speedLv : fuelLv;
    if (lv >= upMax) return;
    const price = upPrice(lv);
    if (money < price) return;
    money -= price;
    if (id === "speed") speedLv += 1;
    else fuelLv += 1;
    unlockAudio();
    playClick();
    applyShip(shipById(rocketId));
    refreshShopState();
  }

  function paintShop() {
    if (!shopRockets || !shopUps) return;
    shopRockets.textContent = "";
    shopUps.textContent = "";
    [basicShip, heavyShip, fireworkShip, bandShip, violetShip].forEach((spec) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-row";
      btn.dataset.id = spec.id;
      const pic = document.createElement("canvas");
      const meta = document.createElement("span");
      meta.className = "meta";
      const name = document.createElement("span");
      name.textContent = spec.name;
      const price = document.createElement("span");
      price.className = "price";
      meta.appendChild(name);
      meta.appendChild(price);
      btn.appendChild(pic);
      btn.appendChild(meta);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        buyRocket(spec);
      });
      shopRockets.appendChild(btn);
      shotRocket(pic, spec);
    });
    [
      { id: "speed", name: "속도" },
      { id: "fuel", name: "연료" },
    ].forEach((up) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-row";
      btn.dataset.id = up.id;
      const meta = document.createElement("span");
      meta.className = "meta";
      const name = document.createElement("span");
      name.textContent = up.name;
      const lv = document.createElement("span");
      lv.className = "lv";
      const price = document.createElement("span");
      price.className = "price";
      meta.appendChild(name);
      meta.appendChild(lv);
      meta.appendChild(price);
      btn.appendChild(meta);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        buyUpgrade(up.id);
      });
      shopUps.appendChild(btn);
    });
    refreshShopState();
  }

  applyShip(basicShip);
  drawSkillMark();
  syncSkill();
  paintCats();
  paintShop();

  let previewTick = 0;
  function drawPreview() {
    previewTick += 1;
    if (previewTick % 3 !== 0) return;
    paintRocketCanvas(previewCtx, 378, 432, 2.7);
  }

  if (fireBtn) {
    fireBtn.hidden = !window.matchMedia("(pointer: coarse)").matches;
  }
  resize();
  window.addEventListener("resize", resize);
  function pressPlay() {
    if (!onRail || railLocked || launchKick) return;
    unlockAudio();
    launchKick = true;
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
  }
  const startBtn = document.getElementById("start");
  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      unlockAudio();
      const aim = forward(aimYaw, aimPitch);
      const gap = spawnBallR * 2 + 3;
      chaser = {
        x: spawnX + aim[0] * gap,
        y: spawnY + aim[1] * gap,
        z: spawnZ + aim[2] * gap,
        hurt: 0,
      };
    });
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
    if (e.target.closest && (e.target.closest("#cats") || e.target.closest("#fire") || e.target.closest("#shop") || e.target.closest("#start"))) return;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
      return;
    }
    leftHeld = true;
    leftTime = 0;
    digTime = 0;
    digBroke = false;
    mineX = -1e9;
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    if (leftHeld && inGameArea() && !digBroke && leftTime < 0.22) placeSelected();
    leftHeld = false;
    digTime = 0;
    mineX = -1e9;
  });
  window.addEventListener("blur", () => {
    leftHeld = false;
    digTime = 0;
    mineX = -1e9;
    rightHeld = false;
    skillHeld = false;
    jumpEdge = false;
    jumpHeld = false;
    moveW = false;
    moveA = false;
    moveS = false;
    moveD = false;
    sprintHeld = false;
    crouchHeld = false;
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
  let skillEdge = false;
  let skillHeld = false;
  let boomEdge = false;
  let viewMode = 1;
  let leftHeld = false;
  let leftTime = 0;
  let digBroke = false;
  let mineX = -1e9;
  let mineY = -1e9;
  let mineZ = -1e9;
  let digTime = 0;
  let moveW = false;
  let moveA = false;
  let moveS = false;
  let moveD = false;
  let jumpEdge = false;
  let jumpHeld = false;
  let sprintHeld = false;
  let crouchHeld = false;
  let stepGround = false;
  function floorTop(px, pz, limit) {
    let stand = -1e9;
    const ix0 = Math.floor((px - spawnBallR - voxX) / CELL);
    const ix1 = Math.floor((px + spawnBallR - voxX) / CELL);
    const iz0 = Math.floor((pz - spawnBallR - voxZ) / CELL);
    const iz1 = Math.floor((pz + spawnBallR - voxZ) / CELL);
    for (let iz = iz0; iz <= iz1; iz += 1) {
      for (let ix = ix0; ix <= ix1; ix += 1) {
        for (let iy = VH - 1; iy >= 0; iy -= 1) {
          if (!voxAt(ix, iy, iz)) continue;
          if (px + spawnBallR <= blockX0(voxX, ix) || px - spawnBallR >= blockX1(voxX, ix) || pz + spawnBallR <= blockX0(voxZ, iz) || pz - spawnBallR >= blockX1(voxZ, iz)) break;
          const top = voxY + (iy + 1) * CELL;
          if (top > limit) continue;
          if (top > stand) stand = top;
          break;
        }
      }
    }
    const lax0 = Math.floor((px - spawnBallR - lavaX) / CELL);
    const lax1 = Math.floor((px + spawnBallR - lavaX) / CELL);
    const laz0 = Math.floor((pz - spawnBallR - lavaZ) / CELL);
    const laz1 = Math.floor((pz + spawnBallR - lavaZ) / CELL);
    for (let iz = laz0; iz <= laz1; iz += 1) {
      for (let ix = lax0; ix <= lax1; ix += 1) {
        for (let iy = LAVA_H - 1; iy >= 0; iy -= 1) {
          if (lavaAt(ix, iy, iz) !== 1) continue;
          if (px + spawnBallR <= blockX0(lavaX, ix) || px - spawnBallR >= blockX1(lavaX, ix) || pz + spawnBallR <= blockX0(lavaZ, iz) || pz - spawnBallR >= blockX1(lavaZ, iz)) break;
          const top = lavaY + (iy + 1) * CELL;
          if (top > limit) continue;
          if (top > stand) stand = top;
          break;
        }
      }
    }
    for (let i = 0; i < mapBoxes.length; i += 1) {
      const m = mapBoxes[i];
      const bx0 = m[6] === 4 ? m[0] + blockInset : m[0];
      const bx1 = m[6] === 4 ? m[3] - blockInset : m[3];
      const bz0 = m[6] === 4 ? m[2] + blockInset : m[2];
      const bz1 = m[6] === 4 ? m[5] - blockInset : m[5];
      if (px + spawnBallR <= bx0 || px - spawnBallR >= bx1 || pz + spawnBallR <= bz0 || pz - spawnBallR >= bz1) continue;
      if (m[4] > limit) continue;
      if (m[4] > stand) stand = m[4];
    }
    const ringTop = lavaSheetY() + CELL;
    if (ringTop <= limit) {
      const dx = px - lavaCx;
      const dz = pz - lavaCz;
      const dist = Math.hypot(dx, dz);
      if (dist + spawnBallR > lavaInner && dist - spawnBallR < lavaOuter && ringTop > stand) stand = ringTop;
    }
    return stand;
  }
  let jumpReady = true;
  const hotKinds = {
    stone: [176, 184, 190],
  };
  const hotbar = new Array(9).fill(null);
  let hotSelect = 0;
  let giveClock = 0;
  const hotEl = document.getElementById("hotbar");
  const hotSlots = [];
  let hp = 20;
  const hpMax = 20;
  const hpFill = document.getElementById("hp-fill");
  function paintHp() {
    if (!hpFill) return;
    const n = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
    hpFill.style.width = (n * 100) + "%";
  }
  paintHp();
  function paintHotbar() {
    for (let i = 0; i < hotSlots.length; i += 1) {
      const item = hotbar[i];
      const ui = hotSlots[i];
      ui.slot.classList.toggle("on", i === hotSelect);
      if (!item) {
        ui.cube.hidden = true;
        ui.num.hidden = true;
        continue;
      }
      const color = hotKinds[item.id];
      ui.cube.hidden = false;
      ui.cube.style.background = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
      ui.num.hidden = item.count < 2;
      if (item.count >= 2) ui.num.textContent = String(item.count);
    }
  }
  function giveBlock(id) {
    for (let i = 0; i < hotbar.length; i += 1) {
      const slot = hotbar[i];
      if (slot && slot.id === id && slot.count < 64) {
        slot.count += 1;
        paintHotbar();
        return;
      }
    }
    for (let i = 0; i < hotbar.length; i += 1) {
      if (hotbar[i]) continue;
      hotbar[i] = { id: id, count: 1 };
      paintHotbar();
      return;
    }
  }
  if (hotEl) {
    for (let i = 0; i < 9; i += 1) {
      const slot = document.createElement("div");
      slot.className = "hot-slot";
      const cube = document.createElement("span");
      cube.className = "hot-cube";
      cube.hidden = true;
      const num = document.createElement("span");
      num.className = "hot-num";
      num.hidden = true;
      slot.appendChild(cube);
      slot.appendChild(num);
      hotEl.appendChild(slot);
      hotSlots.push({ slot: slot, cube: cube, num: num });
    }
    paintHotbar();
  }
  function inGameArea() {
    return x < plateX0 || x > plateX1 || z < plateZ0 || z > plateZ1;
  }
  function overSheet(ox, oz) {
    return x >= ox && x <= ox + LAVA_N * CELL && z >= oz && z <= oz + LAVA_N * CELL;
  }
  function aimSolid() {
    const ox = shotCamX;
    const oy = shotCamY;
    const oz = shotCamZ;
    const dx = shotLx;
    const dy = shotLy;
    const dz = shotLz;
    const lobby = voxelHit(ox, oy, oz, dx, dy, dz, 64);
    const lava = lavaHit(ox, oy, oz, dx, dy, dz, 64);
    const pillar = pillarHit(ox, oy, oz, dx, dy, dz, 64);
    let bestT = 64;
    let x0 = 0;
    let y0 = 0;
    let z0 = 0;
    function consider(t, ax, ay, az) {
      if (t > 0.05 && t < bestT) {
        bestT = t;
        x0 = ax;
        y0 = ay;
        z0 = az;
      }
    }
    if (lobby) consider(lobby.t, voxX + lobby.ix * CELL, voxY + lobby.iy * CELL, voxZ + lobby.iz * CELL);
    if (lava) consider(lava.t, lavaX + lava.ix * CELL, lavaSheetY() + lava.iy * CELL, lavaZ + lava.iz * CELL);
    if (pillar) consider(pillar.t, lavaX + lavaMid * CELL, lavaY + pillar.iy * CELL, lavaZ + lavaMid * CELL);
    for (let i = 0; i < mapBoxes.length; i += 1) {
      const m = mapBoxes[i];
      if (m[6] === 8) continue;
      const t = mapBoxHit(ox, oy, oz, dx, dy, dz, m);
      if (t > 0.05) consider(t, m[0], m[1], m[2]);
    }
    if (bestT >= 64) return null;
    return { x0: x0, y0: y0, z0: z0, t: bestT, ox: ox, oy: oy, oz: oz, dx: dx, dy: dy, dz: dz };
  }
  function lavaCellHere(wx, wy, wz) {
    const lix = Math.round((wx - lavaX) / CELL);
    const liz = Math.round((wz - lavaZ) / CELL);
    if (lix < 0 || liz < 0 || lix >= LAVA_N || liz >= LAVA_N) return false;
    if (Math.abs(wy - lavaSheetY()) >= 0.35) return false;
    return lavaAt(lix, lavaLevel - 1, liz) === 2;
  }
  function clearSolid(wx, wy, wz) {
    if (lavaCellHere(wx, wy, wz)) return false;
    let stone = false;
    let cleared = false;
    const vix = Math.round((wx - voxX) / CELL);
    const viy = Math.round((wy - voxY) / CELL);
    const viz = Math.round((wz - voxZ) / CELL);
    if (vix >= 0 && viy >= 0 && viz >= 0 && vix < VW && viy < VH && viz < VD && voxAt(vix, viy, viz)) {
      if (voxAt(vix, viy, viz) === 1) stone = true;
      voxGrid[vix + viz * VW + viy * VW * VD] = 0;
      cleared = true;
    }
    const lix = Math.round((wx - lavaX) / CELL);
    const liz = Math.round((wz - lavaZ) / CELL);
    const liy = Math.round((wy - lavaY) / CELL);
    if (lix >= 0 && liy >= 0 && liz >= 0 && lix < LAVA_N && liy < LAVA_H && liz < LAVA_N && lavaAt(lix, liy, liz) === 1) {
      stone = true;
      setLava(lix, liy, liz, 0);
      cleared = true;
    }
    for (let i = mapBoxes.length - 1; i >= 0; i -= 1) {
      const m = mapBoxes[i];
      if (m[6] !== 4) continue;
      if (Math.abs(m[0] - wx) > 0.2 || Math.abs(m[1] - wy) > 0.2 || Math.abs(m[2] - wz) > 0.2) continue;
      mapBoxes.splice(i, 1);
      stone = true;
      cleared = true;
    }
    if (stone) giveBlock("stone");
    return cleared;
  }
  function mineShade(shade, hx, hy, hz) {
    if (digTime <= 0) return shade;
    if (hx < mineX - 0.35 || hy < mineY - 0.35 || hz < mineZ - 0.35) return shade;
    if (hx > mineX + CELL + 0.35 || hy > mineY + CELL + 0.35 || hz > mineZ + CELL + 0.35) return shade;
    const hurt = Math.min(1, digTime / 2);
    let next = shade * (1 - hurt * 0.45);
    const du = Math.abs((hx - mineX) / CELL - Math.round((hx - mineX) / CELL));
    const dv = Math.abs((hy - mineY) / CELL - Math.round((hy - mineY) / CELL));
    const dw = Math.abs((hz - mineZ) / CELL - Math.round((hz - mineZ) / CELL));
    let a;
    let b;
    if (du <= dv && du <= dw) {
      a = (hy - mineY) / CELL;
      b = (hz - mineZ) / CELL;
    } else if (dv <= dw) {
      a = (hx - mineX) / CELL;
      b = (hz - mineZ) / CELL;
    } else {
      a = (hx - mineX) / CELL;
      b = (hy - mineY) / CELL;
    }
    const fa = a - Math.floor(a);
    const fb = b - Math.floor(b);
    const bands = Math.max(1, Math.ceil(hurt * 4));
    const line = 0.045;
    for (let i = 1; i <= bands; i += 1) {
      const p = i / (bands + 1);
      if (Math.abs(fa - p) < line || Math.abs(fb - p) < line || Math.abs(fa + fb - p * 1.3) < line) {
        next *= 0.35;
          break;
        }
      }
    return next;
  }
  function placeSelected() {
    if (!inGameArea()) return;
    const item = hotbar[hotSelect];
    if (!item || item.count <= 0) return;
    const aimed = aimSolid();
    if (!aimed || lavaCellHere(aimed.x0, aimed.y0, aimed.z0)) return;
    const hx = aimed.ox + aimed.dx * aimed.t;
    const hy = aimed.oy + aimed.dy * aimed.t;
    const hz = aimed.oz + aimed.dz * aimed.t;
    const x0 = aimed.x0;
    const y0 = aimed.y0;
    const z0 = aimed.z0;
    const gaps = [
      [hx - x0, -1, 0, 0],
      [x0 + CELL - hx, 1, 0, 0],
      [hy - y0, 0, -1, 0],
      [y0 + CELL - hy, 0, 1, 0],
      [hz - z0, 0, 0, -1],
      [z0 + CELL - hz, 0, 0, 1],
    ];
    let face = gaps[0];
    for (let i = 1; i < gaps.length; i += 1) if (gaps[i][0] < face[0]) face = gaps[i];
    const wx = x0 + face[1] * CELL;
    const wy = y0 + face[2] * CELL;
    const wz = z0 + face[3] * CELL;
    if (x + spawnBallR > wx && x - spawnBallR < wx + CELL && bodyY1(y) > wy && bodyY0(y) < wy + CELL && z + spawnBallR > wz && z - spawnBallR < wz + CELL) return;
    const vix = Math.round((wx - voxX) / CELL);
    const viy = Math.round((wy - voxY) / CELL);
    const viz = Math.round((wz - voxZ) / CELL);
    let placed = false;
    if (vix >= 0 && viy >= 0 && viz >= 0 && vix < VW && viy < VH && viz < VD && Math.abs(voxX + vix * CELL - wx) < 0.2 && Math.abs(voxY + viy * CELL - wy) < 0.2 && Math.abs(voxZ + viz * CELL - wz) < 0.2) {
      if (voxAt(vix, viy, viz)) return;
      voxGrid[vix + viz * VW + viy * VW * VD] = 1;
      if (viy >= 1) mapBoxes.push([wx, wy, wz, wx + CELL, wy + CELL, wz + CELL, 4]);
      placed = true;
    }
    const lix = Math.round((wx - lavaX) / CELL);
    const liy = Math.round((wy - lavaY) / CELL);
    const liz = Math.round((wz - lavaZ) / CELL);
    if (!placed && lix >= 0 && liy >= 0 && liz >= 0 && lix < LAVA_N && liy < LAVA_H && liz < LAVA_N && Math.abs(lavaX + lix * CELL - wx) < 0.2 && Math.abs(lavaY + liy * CELL - wy) < 0.2 && Math.abs(lavaZ + liz * CELL - wz) < 0.2) {
      if (lavaAt(lix, liy, liz)) return;
      setLava(lix, liy, liz, 1);
      if (liy >= lavaLevel) mapBoxes.push([wx, wy, wz, wx + CELL, wy + CELL, wz + CELL, 4]);
      placed = true;
    }
    if (!placed) return;
    item.count -= 1;
    if (item.count <= 0) hotbar[hotSelect] = null;
    paintHotbar();
  }
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyW") { moveW = true; e.preventDefault(); return; }
    if (e.code === "KeyA") { moveA = true; e.preventDefault(); return; }
    if (e.code === "KeyS") { moveS = true; e.preventDefault(); return; }
    if (e.code === "KeyD") { moveD = true; e.preventDefault(); return; }
    if (e.code === "F1") { e.preventDefault(); viewMode = 1; return; }
    if (e.code === "F2") { e.preventDefault(); viewMode = 3; return; }
    if (e.code.startsWith("Digit")) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 9) {
        hotSelect = n - 1;
        paintHotbar();
        e.preventDefault();
      }
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      jumpHeld = true;
      if (!e.repeat) jumpEdge = true;
      return;
    }
    if (e.code === "KeyQ") {
      if (!e.repeat) boomEdge = true;
      return;
    }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      crouchHeld = true;
      e.preventDefault();
      return;
    }
    if (e.code !== "KeyE") return;
    sprintHeld = true;
    e.preventDefault();
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "KeyW") moveW = false;
    else if (e.code === "KeyA") moveA = false;
    else if (e.code === "KeyS") moveS = false;
    else if (e.code === "KeyD") moveD = false;
    else if (e.code === "Space") jumpHeld = false;
    else if (e.code === "ShiftLeft" || e.code === "ShiftRight") crouchHeld = false;
    else if (e.code === "KeyE") sprintHeld = false;
  });
  document.addEventListener("pointerlockchange", showHud);
  window.addEventListener("mousemove", (e) => {
    const locked = document.pointerLockElement === canvas;
    const waiting = onRail && !railLocked && !launchKick;
    if (waiting && !locked && Math.hypot(e.movementX, e.movementY) > 28) return;
    aimYaw += e.movementX * 0.0007;
    aimPitch -= e.movementY * 0.0007;
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
      if (downTime <= 0) {
        if (mySpawnAlive()) resetPlayer();
        else {
          downTime = 0;
          gameOver = true;
        }
      }
    }
    const dead = downTime > 0 || gameOver;
    if (won) {
      winClock += dt;
      fuel = 1;
    }
    if (foesOn && !gameOver) {
      moneyTick += dt;
      while (moneyTick >= 10) {
        moneyTick -= 10;
        addMoney(25);
      }
    }
    if (!dead && Math.hypot(vx, vy, vz) >= 1) {
      flyMoney += dt * 2.5;
      const gain = Math.floor(flyMoney);
      if (gain > 0) {
        flyMoney -= gain;
        addMoney(gain);
      }
    }
    checkWin();
    violetOn = skillHeld && rocketId === "violet" && violetEnergy > 0 && downTime <= 0 && !gameOver;
    if (violetOn) violetEnergy = Math.max(0, violetEnergy - dt / violetEnergySec);
    if (skillEdge && downTime <= 0 && !gameOver && rocketId === "band") startBandSkill();
    if (basicCool > 0) basicCool = Math.max(0, basicCool - dt);
    if (skillEdge && downTime <= 0 && !gameOver && rocketId === "basic" && basicFov <= 0 && basicCool <= 0) {
      const sp = Math.hypot(vx, vy, vz);
      const cap = Math.max(0.01, (20 + boost * 20) * speedMul);
      dashBase = sp;
      dashKick = Math.min(1, sp / cap);
      if (sp > 0.001) {
        dashDX = vx / sp;
        dashDY = vy / sp;
        dashDZ = vz / sp;
      }
      basicFov = 0.0001;
      basicCool = basicCoolSec;
    }
    if (basicFov > 0) {
      basicFov += dt;
      if (basicFov >= 0.5) {
        basicFov = 0;
        dashMul = 0;
      }
    }
    const infinite = (boomWait > 0 || won) && !dead;
    const thrusting = !dead && !noBoost && (rightHeld || violetOn) && (fuel > 0 || infinite);
    flaming = thrusting && rocketId !== "firework" && !(rocketId === "band" && (wingSkill > 0 || wingDone));
    const flySpeed = Math.hypot(vx, vy, vz);
    meteorOn = !dead && flySpeed > 200;
    if (meteorOn) {
      meteorClock += dt;
      flaming = true;
      const inv = 1 / flySpeed;
      const bx = -vx * inv;
      const by = -vy * inv;
      const bz = -vz * inv;
      const meteorColors = [[255, 255, 255], [255, 236, 120], [255, 150, 32], [255, 64, 16]];
      for (let i = 0; i < 28; i += 1) {
        const back = 40 + Math.random() * 90;
        const spray = 14;
        const color = meteorColors[(Math.random() * meteorColors.length) | 0];
        const life = 0.28 + Math.random() * 0.4;
        sparks.push({
          x: x + (Math.random() - 0.5) * 3.2,
          y: y + (Math.random() - 0.5) * 3.2,
          z: z + (Math.random() - 0.5) * 3.2,
          vx: bx * back + (Math.random() - 0.5) * spray,
          vy: by * back + (Math.random() - 0.5) * spray,
          vz: bz * back + (Math.random() - 0.5) * spray,
          life: life,
          max: life,
          color: color,
          grav: 0,
          px: 2,
          meteor: true,
        });
      }
      if (sparks.length > 1100) sparks.splice(0, sparks.length - 1100);
    }
    if (!dead && thrusting && !onRail && !infinite) {
      const burn = violetOn && rocketId === "violet" ? 1.75 : 1;
      fuel = Math.max(0, fuel - dt / fuelSec * burn);
    }
    if (!dead && !onRail && !infinite && fuel <= 0) downPlayer();
    if (thrusting) {
      engineOn();
      if (engine) engine.frequency.setTargetAtTime(58 + boost * 46, audioCtx.currentTime, 0.05);
    } else engineOff();
    boost += ((thrusting ? 1 : 0) - boost) * Math.min(1, dt * 7);
    if (rocketId === "band" && (wingSkill > 0 || wingDone)) boost = 0;
    if (violetOn && !rightHeld) violetMix = 1;
    else if (violetOn) violetMix = Math.min(1, violetMix + dt / 0.1);
    else violetMix = Math.max(0, violetMix - dt / 0.1);
    const speedTarget = violetOn ? 2 : 1;
    if (speedMix < speedTarget) speedMix = Math.min(speedTarget, speedMix + dt / 0.1);
    else if (speedMix > speedTarget) speedMix = Math.max(speedTarget, speedMix - dt / 0.1);
    const flameTarget = violetOn && rocketId === "violet" ? 2 : 1;
    flameScaleNow += (flameTarget - flameScaleNow) * (1 - Math.exp(-dt / 0.55));
    const flameScale = flameScaleNow;
    const flameLen = 1.15 * (1 + boost * 0.5) * flameMul * flameScale;
    flameTip = bodyBack - flameLen;
    const flameK = flameRoot * flameScale / flameLen;
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
      s.vy -= (s.grav == null ? 9 : s.grav) * dt;
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
    if (dead) {
      flaming = false;
      engineOff();
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
      moveX = x;
      moveY = y;
      moveZ = z;
      const aim = forward(aimYaw, aimPitch);
      const lead = 1 - Math.exp(-7 * dt);
      laserX += (x + aim[0] * 18 - laserX) * lead;
      laserY += (y + aim[1] * 18 - laserY) * lead;
      laserZ += (z + aim[2] * 18 - laserZ) * lead;
      const fx = Math.sin(aimYaw);
      const fz = Math.cos(aimYaw);
      const rx = Math.cos(aimYaw);
      const rz = -Math.sin(aimYaw);
      let mx = 0;
      let mz = 0;
      if (moveW) { mx += fx; mz += fz; }
      if (moveS) { mx -= fx; mz -= fz; }
      if (moveD) { mx += rx; mz += rz; }
      if (moveA) { mx -= rx; mz -= rz; }
      const len = Math.hypot(mx, mz);
      const wishSpeed = crouchHeld ? 8 : sprintHeld ? 38 : 24;
      const wishX = len > 0 ? mx / len * wishSpeed : 0;
      const wishZ = len > 0 ? mz / len * wishSpeed : 0;
      const gain = 1 - Math.pow(0.3, dt * 60);
      vx += (wishX - vx) * gain;
      vz += (wishZ - vz) * gain;
      vy -= 32 * dt;
      const speed = Math.hypot(vx, vy, vz);
      if (speed > 200) {
        const cut = 200 / speed;
        vx *= cut;
        vy *= cut;
        vz *= cut;
      }
      x += vx * dt;
      z += vz * dt;
      if (crouchHeld && stepGround && vy <= 0) {
        const feetNow = y - spawnBallR;
        const fit = (px, pz) => floorTop(px, pz, feetNow + 0.35) > feetNow - 0.45;
        if (!fit(x, z)) {
          const keepX = fit(x, z - vz * dt);
          const keepZ = fit(x - vx * dt, z);
          if (keepX && !keepZ) {
            z -= vz * dt;
            vz = 0;
          } else if (keepZ && !keepX) {
            x -= vx * dt;
            vx = 0;
          } else {
            x -= vx * dt;
            z -= vz * dt;
            vx = 0;
            vz = 0;
          }
        }
      }
      y += vy * dt;
      let stand = -1e9;
      const feet = y - spawnBallR;
      const prevFeet = feet - vy * dt;
      stand = floorTop(x, z, prevFeet + 0.35);
      let onGround = false;
      if (stand > -1e8) {
        stand += spawnBallR;
        onGround = y <= stand + 0.05;
        if (y < stand) {
          y = stand;
          if (vy < 0) vy = 0;
        }
      }
      if ((jumpEdge || jumpHeld) && onGround && jumpReady) {
        vy = Math.sqrt(64 * CELL * 1.4);
        jumpReady = false;
      }
      jumpEdge = false;
      if (!onGround) jumpReady = true;
      stepGround = onGround;
      yaw = aimYaw;
      pitch = aimPitch;
    }
    collideMap();
    if (downTime <= 0 && !gameOver && touchesLava(x, y, z)) downPlayer();
    updateChunks();
    stepFoes(dt);
    stepChaser(dt);
    hitSpawns(dt);
    stepCorpses(dt);
    if (boomEdge && downTime <= 0 && !gameOver) {
      unlockAudio();
      blast();
    }
    stepWingSkill(dt);
    const shake = fuse > 0 ? (1 - fuse / 0.95) : 0;
    const amp = shake * shake * 1.7;
    meshX = x + Math.sin(shakeT * 62) * amp;
    meshY = y + Math.cos(shakeT * 78) * amp * 0.75;
    meshZ = z + Math.sin(shakeT * 51) * amp;
    meshYaw = yaw + Math.sin(shakeT * 70) * shake * 0.95;
    meshPitch = pitch + Math.cos(shakeT * 64) * shake * 0.55;
    showHud();
    if (roundLeft > 0) {
      roundLeft -= dt;
      if (roundLeft <= 0) {
        roundLeft = 0;
        if (!teleported) {
          teleported = true;
          x = lavaX + (lavaMid + 0.5) * CELL;
          y = lavaY + PILLAR * CELL + spawnBallR;
          z = lavaZ + (lavaMid + 0.5) * CELL;
          moveX = x;
          moveY = y;
          moveZ = z;
          vx = 0;
          vy = 0;
          vz = 0;
        }
      }
    }
    if (overSheet(lavaX, lavaZ) && lavaLevel < LAVA_H) {
      lavaClock += dt;
      if (lavaClock >= lavaRiseSec) {
        lavaClock -= lavaRiseSec;
        riseLava();
      }
    }
    if (inGameArea()) {
      giveClock += dt;
      if (giveClock >= 6) {
        giveClock -= 6;
        giveBlock("stone");
      }
    }
    if (clockEl) clockEl.textContent = String(Math.ceil(roundLeft));
    paintSkillCool();

    if (Math.hypot(vx, vy, vz) >= 15) {
      trail.push({ t: now, w: wingPoints(axes(meshYaw, meshPitch)) });
    }
    const trailCut = now - 1000;
    let trailDrop = 0;
    while (trailDrop < trail.length && trail[trailDrop].t < trailCut) trailDrop += 1;
    if (trailDrop > 0) trail.splice(0, trailDrop);

    const ax = axes(meshYaw, meshPitch);
    const view = axes(aimYaw, aimPitch - 0.9);
    let camX = x;
    let camY = y;
    let camZ = z;
    if (viewMode !== 1) {
      camX = x - view.fx * 10 + view.ux * 2.3 + view.rx * 3.5;
      camY = y - view.fy * 10 + view.uy * 2.3 + view.ry * 3.5;
      camZ = z - view.fz * 10 + view.uz * 2.3 + view.rz * 3.5;
    }
    if (crouchHeld) camY -= spawnBallR * 2 * (1 - crouchSquat);
    if (viewMode !== 1 && pointInObject(camX, camY, camZ)) {
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
    let tanTarget = 2.2 + boost * 0.28;
    if (violetOn && rocketId === "violet") tanTarget *= 2;
    viewTan += (tanTarget - viewTan) * (1 - Math.exp(-dt / 0.55));
    let basicMul = 1;
    if (basicFov > 0) basicMul = 1 + dashEnv(Math.min(1, basicFov / 0.5)) * dashKick;
    const tan = viewTan * basicMul;
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
    if (leftHeld && inGameArea()) {
      leftTime += dt;
      if (leftTime >= 0.22) {
        const aimed = aimSolid();
        if (!aimed || lavaCellHere(aimed.x0, aimed.y0, aimed.z0)) {
          mineX = -1e9;
          digTime = 0;
        } else if (aimed.x0 !== mineX || aimed.y0 !== mineY || aimed.z0 !== mineZ) {
          mineX = aimed ? aimed.x0 : -1e9;
          mineY = aimed ? aimed.y0 : -1e9;
          mineZ = aimed ? aimed.z0 : -1e9;
          digTime = 0;
        } else {
          digTime += dt;
          if (digTime >= 2) {
            clearSolid(mineX, mineY, mineZ);
            digBroke = true;
            digTime = 0;
            mineX = -1e9;
          }
        }
      }
    }
    shotAspect = aspect;
    shown.length = 0;
    const foeDraw = [];
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
    let chaserBox = null;
    if (chaser) {
      let x0 = bw;
      let y0 = bh;
      let x1 = 0;
      let y1 = 0;
      let seen = 0;
      const rad = spawnBallR;
      for (let ix = 0; ix < 2; ix += 1) {
        for (let iy = 0; iy < 2; iy += 1) {
          for (let iz = 0; iz < 2; iz += 1) {
            const vxw = chaser.x + (ix ? rad : -rad) - camX;
            const vyw = chaser.y + (iy ? rad : -rad) - camY;
            const vzw = chaser.z + (iz ? rad : -rad) - camZ;
            const df = vxw * lx + vyw * ly + vzw * lz;
            if (df < 0.2) continue;
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
      if (seen) {
        x0 = Math.max(0, Math.floor(x0) - 3);
        y0 = Math.max(0, Math.floor(y0) - 3);
        x1 = Math.min(bw - 1, Math.ceil(x1) + 3);
        y1 = Math.min(bh - 1, Math.ceil(y1) + 3);
        if (x1 >= x0 && y1 >= y0) chaserBox = { x0, y0, x1, y1 };
      }
    }
    let playerBox = null;
    if (viewMode !== 1 && downTime <= 0 && !gameOver) {
      let x0 = bw;
      let y0 = bh;
      let x1 = 0;
      let y1 = 0;
      let seen = 0;
      const rad = spawnBallR;
      const squat = crouchHeld ? crouchSquat : 1;
      const bodyRy = rad * squat;
      const cy = y - rad * (1 - squat);
      for (let ix = 0; ix < 2; ix += 1) {
        for (let iy = 0; iy < 2; iy += 1) {
          for (let iz = 0; iz < 2; iz += 1) {
            const vxw = x + (ix ? rad : -rad) - camX;
            const vyw = cy + (iy ? bodyRy : -bodyRy) - camY;
            const vzw = z + (iz ? rad : -rad) - camZ;
            const df = vxw * lx + vyw * ly + vzw * lz;
            if (df < 0.2) continue;
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
      if (seen) {
        x0 = Math.max(0, Math.floor(x0) - 3);
        y0 = Math.max(0, Math.floor(y0) - 3);
        x1 = Math.min(bw - 1, Math.ceil(x1) + 3);
        y1 = Math.min(bh - 1, Math.ceil(y1) + 3);
        if (x1 >= x0 && y1 >= y0) playerBox = { x0, y0, x1, y1 };
      }
    }
    mapDraw.length = 0;
    for (let mi = 0; mi < mapBoxes.length; mi += 1) {
      const m = mapBoxes[mi];
      if (m[6] === 8) continue;
      let x0 = bw;
      let y0 = bh;
      let x1 = 0;
      let y1 = 0;
      let seen = 0;
      const xs = [m[0], m[3]];
      const ys = [m[1], m[4]];
      const zs = [m[2], m[5]];
      for (let ix = 0; ix < 2; ix += 1) {
        for (let iy = 0; iy < 2; iy += 1) {
          for (let iz = 0; iz < 2; iz += 1) {
            const vxw = xs[ix] - camX;
            const vyw = ys[iy] - camY;
            const vzw = zs[iz] - camZ;
            const df = vxw * lx + vyw * ly + vzw * lz;
            if (df < 0.35) continue;
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
      x0 = Math.max(0, Math.floor(x0) - 2);
      y0 = Math.max(0, Math.floor(y0) - 2);
      x1 = Math.min(bw - 1, Math.ceil(x1) + 2);
      y1 = Math.min(bh - 1, Math.ceil(y1) + 2);
      if (x1 < x0 || y1 < y0) continue;
      mapDraw.push({ m, x0, y0, x1, y1 });
    }
    function screenBox(xa, xb, ya, yb, za, zb) {
      const near = 0.35;
      const xs = [xa, xb];
      const ys = [ya, yb];
      const zs = [za, zb];
      const corner = new Array(8);
      for (let iz = 0; iz < 2; iz += 1) {
        for (let iy = 0; iy < 2; iy += 1) {
          for (let ix = 0; ix < 2; ix += 1) {
            const vxw = xs[ix] - camX;
            const vyw = ys[iy] - camY;
            const vzw = zs[iz] - camZ;
            corner[ix + iy * 2 + iz * 4] = {
              df: vxw * lx + vyw * ly + vzw * lz,
              dr: vxw * rx + vyw * ry + vzw * rz,
              du: vxw * ux + vyw * uy + vzw * uz,
            };
          }
        }
      }
      let x0 = bw;
      let y0 = bh;
      let x1 = 0;
      let y1 = 0;
      let seen = 0;
      function addView(df, dr, du) {
        const sx0 = ((dr / (df * aspect * tan)) + 1) * 0.5 * bw;
        const sy0 = (1 - du / (df * tan)) * 0.5 * bh;
        if (sx0 < x0) x0 = sx0;
        if (sy0 < y0) y0 = sy0;
        if (sx0 > x1) x1 = sx0;
        if (sy0 > y1) y1 = sy0;
        seen += 1;
      }
      function clipEdge(a, b) {
        const pa = corner[a];
        const pb = corner[b];
        const fa = pa.df >= near;
        const fb = pb.df >= near;
        if (fa && fb) {
          addView(pa.df, pa.dr, pa.du);
          addView(pb.df, pb.dr, pb.du);
          return;
        }
        if (!fa && !fb) return;
        const t = (near - pa.df) / (pb.df - pa.df);
        addView(near, pa.dr + (pb.dr - pa.dr) * t, pa.du + (pb.du - pa.du) * t);
        if (fa) addView(pa.df, pa.dr, pa.du);
        else addView(pb.df, pb.dr, pb.du);
      }
      clipEdge(0, 1);
      clipEdge(2, 3);
      clipEdge(4, 5);
      clipEdge(6, 7);
      clipEdge(0, 2);
      clipEdge(1, 3);
      clipEdge(4, 6);
      clipEdge(5, 7);
      clipEdge(0, 4);
      clipEdge(1, 5);
      clipEdge(2, 6);
      clipEdge(3, 7);
      if (!seen) return null;
      x0 = Math.max(0, Math.floor(x0) - 4);
      y0 = Math.max(0, Math.floor(y0) - 4);
      x1 = Math.min(bw - 1, Math.ceil(x1) + 4);
      y1 = Math.min(bh - 1, Math.ceil(y1) + 4);
      if (x1 < x0 || y1 < y0) return null;
      return { x0: x0, y0: y0, x1: x1, y1: y1 };
    }
    const voxBox = screenBox(voxX, voxX + VW * CELL, voxY, voxY + CELL, voxZ, voxZ + VD * CELL);
    const lavaBottom = lavaSheetY();
    const lavaBox = lavaLevel > 0 ? screenBox(lavaX, lavaX + LAVA_N * CELL, lavaBottom, lavaBottom + CELL, lavaZ, lavaZ + LAVA_N * CELL) : null;
    const pillarBox = screenBox(lavaX + lavaMid * CELL, lavaX + (lavaMid + 1) * CELL, lavaY, lavaY + PILLAR * CELL, lavaZ + lavaMid * CELL, lavaZ + (lavaMid + 1) * CELL);
    const mineOn = mineFace.length > 0 || floorFace.length > 0;
    let mineBins = null;
    let mineTile = 32;
    let mineTw = 1;
    if (mineOn) {
    mineTw = Math.ceil(bw / mineTile);
    const mineTh = Math.ceil(bh / mineTile);
    if (mineBinStore.length < mineTw * mineTh) mineBinStore = new Array(mineTw * mineTh);
    mineBins = mineBinStore;
    for (let i = 0; i < mineTw * mineTh; i += 1) {
      if (mineBins[i]) mineBins[i].length = 0;
      else mineBins[i] = [];
    }
    function binWorldCells(list) {
    for (let fi = 0; fi < list.length; fi += 1) {
      const cell = list[fi];
      const vxw = cell.cx - camX;
      const vyw = cell.cy - camY;
      const vzw = cell.cz - camZ;
      const df = vxw * lx + vyw * ly + vzw * lz;
      if (df < 0.55) continue;
      if (vxw * vxw + vyw * vyw + vzw * vzw > 140 * 140) continue;
      const span = Math.min(96, (CELL * 1.3) * (bh * 0.5) / (df * tan) + 2);
      const dr = vxw * rx + vyw * ry + vzw * rz;
      const du = vxw * ux + vyw * uy + vzw * uz;
      const sx0 = ((dr / (df * aspect * tan)) + 1) * 0.5 * bw;
      const sy0 = (1 - du / (df * tan)) * 0.5 * bh;
      const bx0 = Math.max(0, Math.floor(sx0 - span));
      const by0 = Math.max(0, Math.floor(sy0 - span));
      const bx1 = Math.min(bw - 1, Math.ceil(sx0 + span));
      const by1 = Math.min(bh - 1, Math.ceil(sy0 + span));
      if (bx1 < bx0 || by1 < by0) continue;
      const tx0 = Math.floor(bx0 / mineTile);
      const ty0 = Math.floor(by0 / mineTile);
      const tx1 = Math.min(mineTw - 1, Math.floor(bx1 / mineTile));
      const ty1 = Math.min(mineTh - 1, Math.floor(by1 / mineTile));
      for (let ty = ty0; ty <= ty1; ty += 1) {
        for (let tx = tx0; tx <= tx1; tx += 1) mineBins[tx + ty * mineTw].push(cell);
      }
    }
    }
    binWorldCells(mineFace);
    binWorldCells(floorFace);
    }
    let beamBox = null;
    {
      const vxw = laserX - camX;
      const vyw = laserY - camY;
      const vzw = laserZ - camZ;
      const df = vxw * lx + vyw * ly + vzw * lz;
      if (df >= 0.35) {
        const dr = vxw * rx + vyw * ry + vzw * rz;
        const du = vxw * ux + vyw * uy + vzw * uz;
        const pr = Math.max(6, 1.2 * bh * 0.5 / (df * tan));
        const sx0 = ((dr / (df * aspect * tan)) + 1) * 0.5 * bw;
        const sy0 = (1 - du / (df * tan)) * 0.5 * bh;
        beamBox = {
          x0: Math.max(0, Math.floor(sx0 - pr)),
          y0: Math.max(0, Math.floor(sy0 - pr)),
          x1: Math.min(bw - 1, Math.ceil(sx0 + pr)),
          y1: Math.min(bh - 1, Math.ceil(sy0 + pr)),
        };
      }
    }
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
        let best = 360;
        if (beamBox && sx >= beamBox.x0 && sx <= beamBox.x1 && sy >= beamBox.y0 && sy <= beamBox.y1) {
          const beam = beamHit(camX, camY, camZ, dx, dy, dz, view);
          if (beam && beam < best) {
            best = beam;
            r = 255;
            g = 70;
            b = 64;
          }
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
        if (chaserBox && chaser && sx >= chaserBox.x0 && sx <= chaserBox.x1 && sy >= chaserBox.y0 && sy <= chaserBox.y1) {
          const ct = ballHit(camX, camY, camZ, dx, dy, dz, chaser);
          if (ct > 0.05 && ct < best) {
            best = ct;
            r = 0;
            g = 0;
            b = 0;
          }
        }
        if (playerBox && sx >= playerBox.x0 && sx <= playerBox.x1 && sy >= playerBox.y0 && sy <= playerBox.y1) {
          const squat = crouchHeld ? crouchSquat : 1;
          const cy = y - spawnBallR * (1 - squat);
          const pt = ellipsoidHit(camX, camY, camZ, dx, dy, dz, x, cy, z, spawnBallR, spawnBallR * squat, spawnBallR);
          if (pt > 0.05 && pt <= best) {
            best = pt;
            r = 220;
            g = 36;
            b = 36;
          }
        }
        if (mapDraw.length) {
          for (let mi = 0; mi < mapDraw.length; mi += 1) {
            const slot = mapDraw[mi];
            if (sx < slot.x0 || sx > slot.x1 || sy < slot.y0 || sy > slot.y1) continue;
            const mt = mapBoxHit(camX, camY, camZ, dx, dy, dz, slot.m);
            if (mt > 0.05 && mt < best) {
              best = mt;
              const tint = mapRgb[slot.m[6]] || mapRgb[1];
              let shade = 1;
              if (slot.m[6] === 4) shade = lavaEdge(camX, camY, camZ, dx, dy, dz, mt, slot.m[1], slot.m[0], slot.m[2]) ? 0.72 : 1;
              shade = mineShade(shade, camX + dx * mt, camY + dy * mt, camZ + dz * mt);
              r = Math.round(tint[0] * shade);
              g = Math.round(tint[1] * shade);
              b = Math.round(tint[2] * shade);
            }
          }
        }
        if (voxBox && sx >= voxBox.x0 && sx <= voxBox.x1 && sy >= voxBox.y0 && sy <= voxBox.y1) {
          const vh = voxelHit(camX, camY, camZ, dx, dy, dz, best);
          if (vh && vh.t < best) {
            best = vh.t;
            const tint = voxRgb[vh.id - 1];
            let shade = voxEdge(camX, camY, camZ, dx, dy, dz, vh.t) ? 0.72 : 1;
            shade = mineShade(shade, camX + dx * vh.t, camY + dy * vh.t, camZ + dz * vh.t);
            r = Math.round(tint[0] * shade);
            g = Math.round(tint[1] * shade);
            b = Math.round(tint[2] * shade);
          }
        }
        if (lavaBox && sx >= lavaBox.x0 && sx <= lavaBox.x1 && sy >= lavaBox.y0 && sy <= lavaBox.y1) {
          const rh = ringHit(camX, camY, camZ, dx, dy, dz, best);
          if (rh && rh.t < best) {
            best = rh.t;
            r = 0;
            g = 0;
            b = 0;
          }
          const lh = lavaHit(camX, camY, camZ, dx, dy, dz, best);
          if (lh && lh.t < best) {
            const hx = camX + dx * lh.t - lavaCx;
            const hz = camZ + dz * lh.t - lavaCz;
            if (hx * hx + hz * hz <= lavaInner * lavaInner) {
              best = lh.t;
              r = 255;
              g = 78;
              b = 18;
            }
          }
        }
        if (pillarBox && sx >= pillarBox.x0 && sx <= pillarBox.x1 && sy >= pillarBox.y0 && sy <= pillarBox.y1) {
          const ph = pillarHit(camX, camY, camZ, dx, dy, dz, best);
          if (ph && ph.t < best) {
            best = ph.t;
            const shade = mineShade(lavaEdge(camX, camY, camZ, dx, dy, dz, ph.t) ? 0.72 : 1, camX + dx * ph.t, camY + dy * ph.t, camZ + dz * ph.t);
            r = Math.round(176 * shade);
            g = Math.round(184 * shade);
            b = Math.round(190 * shade);
          }
        }
        if (mineOn) {
        const mineBin = mineBins[Math.floor(sx / mineTile) + Math.floor(sy / mineTile) * mineTw];
        if (mineBin && mineBin.length) {
          for (let mi = 0; mi < mineBin.length; mi += 1) {
            const cell = mineBin[mi];
            const mt = boxT(camX, camY, camZ, dx, dy, dz, cell.x0, cell.y0, cell.z0, cell.x1, cell.y1, cell.z1, best);
            if (mt < 0.05 || mt >= best) continue;
            best = mt;
            const shade = mineEdge(camX, camY, camZ, dx, dy, dz, mt) ? 0.72 : 1;
            const tint = cell.gray ? floorRgb : mineRgb;
            r = Math.round(tint[0] * shade);
            g = Math.round(tint[1] * shade);
            b = Math.round(tint[2] * shade);
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
    const lavaGap = (y - spawnBallR - lavaSheetY()) / CELL;
    const lavaNear = inGameArea() && lavaGap < 5 ? Math.max(0, Math.min(1, (5 - lavaGap) / 5)) : 0;
    if (lavaNear > 0) {
      const toX = lavaX + LAVA_N * CELL * 0.5 - camX;
      const toY = lavaSheetY() - camY;
      const toZ = lavaZ + LAVA_N * CELL * 0.5 - camZ;
      const toL = Math.hypot(toX, toY, toZ) || 1;
      const look = Math.max(0, (lx * toX + ly * toY + lz * toZ) / toL);
      const heat = lavaNear * look;
      if (heat > 0.02) {
        const edge = ctx.createRadialGradient(
          bw * 0.5,
          bh * (0.46 - heat * 0.1),
          Math.min(bw, bh) * (0.62 - heat * 0.46),
          bw * 0.5,
          bh * 0.55,
          Math.hypot(bw, bh) * 0.62
        );
        const alpha = 0.18 + heat * 0.72;
        edge.addColorStop(0, "rgba(255,78,18,0)");
        edge.addColorStop(0.5, "rgba(255,96,20," + (alpha * 0.22) + ")");
        edge.addColorStop(1, "rgba(255,58,8," + alpha + ")");
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, bw, bh);
        const rise = ctx.createLinearGradient(0, bh, 0, bh * (1 - heat * 0.92));
        rise.addColorStop(0, "rgba(255,72,12," + (0.12 + heat * 0.5) + ")");
        rise.addColorStop(1, "rgba(255,72,12,0)");
        ctx.fillStyle = rise;
        ctx.fillRect(0, 0, bw, bh);
      }
    }
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
    if (won) {
      const cx = bw * 0.5;
      const cy = bh * 0.5;
      const hue = (winClock * 110) % 360;
      const glow = ctx.createRadialGradient(cx, cy, Math.min(bw, bh) * 0.24, cx, cy, Math.hypot(cx, cy));
      glow.addColorStop(0, "rgba(0,0,0,0)");
      glow.addColorStop(0.58, "rgba(0,0,0,0)");
      glow.addColorStop(0.78, "hsla(" + hue + ",100%,55%,0.2)");
      glow.addColorStop(0.9, "hsla(" + ((hue + 80) % 360) + ",100%,55%,0.62)");
      glow.addColorStop(1, "hsla(" + ((hue + 160) % 360) + ",100%,50%,0.9)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, bw, bh);
    }
    drawSparks();
    drawPops();
    musicStep(dt, {
      dead: dead,
      calm: onRail && !railLocked,
      flying: !dead && Math.hypot(vx, vy, vz) >= 1,
      thrusting: thrusting,
      glide: rocketId === "band" && (wingSkill > 0 || wingDone),
      lift: violetOn || wingSkill > 0 || basicFov > 0,
      won: won,
    });
    skillEdge = false;
    boomEdge = false;
  }
  requestAnimationFrame(loop);
})();
