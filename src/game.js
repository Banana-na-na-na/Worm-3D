(() => {
  const canvas = document.getElementById("view");
  const speedEl = document.getElementById("speed");
  const ctx = canvas.getContext("2d", { alpha: false });
  const GRID = 48;
  const keys = {};
  const car = { x: 0, y: 0, ang: 0, speed: 0 };
  let velAng = 0;
  let steer = 0;
  let driftHeld = 0;
  let surge = 0;
  let surgeTime = 0;
  let kmh = 0;
  let gauge = 0;
  let hitFace = 0;
  let viewTan = 0.72;
  let camAng = 0;
  let camMode = 0;
  let fixX = 0;
  let fixZ = 0;
  const skid = new Map();
  let cR = 0;
  let cG = 0;
  let cB = 0;
  let bw = 320;
  let bh = 180;
  let scale = 3;
  let frameBuf = null;
  let blurCopy = null;
  let shownKmh = 0;
  let boost = 0;
  let trailTick = 0;
  let wheelSpin = 0;
  let frontYaw = 0;
  const trail = [
    { x: 0, y: 0, ang: 0 },
    { x: 0, y: 0, ang: 0 },
  ];

  function resize() {
    const sw = Math.max(1, window.innerWidth);
    const sh = Math.max(1, window.innerHeight);
    scale = Math.max(1, Math.floor(Math.max(3, Math.ceil(sw / 420)) / 2));
    bw = Math.floor(sw / scale);
    bh = Math.floor(sh / scale);
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = bw * scale + "px";
    canvas.style.height = bh * scale + "px";
    ctx.imageSmoothingEnabled = false;
    frameBuf = ctx.createImageData(bw, bh);
    blurCopy = new Uint8ClampedArray(bw * bh * 4);
  }

  window.addEventListener("resize", resize);
  resize();
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "KeyC" && !e.repeat) {
      camMode = camMode ? 0 : 1;
      if (camMode === 1) {
        fixX = car.x;
        fixZ = car.y;
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });
  function showSpeed() {
    const n = Math.round(gauge);
    if (n === shownKmh) return;
    shownKmh = n;
    speedEl.textContent = n + " km/h";
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function angDiff(a, b) {
    let d = a - b;
    d = mod(d + Math.PI, Math.PI * 2) - Math.PI;
    return d;
  }

  function hitBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
    let tmin = 0.05;
    let tmax = 900;
    let face = 0;
    if (Math.abs(dx) < 1e-8) {
      if (ox < x0 || ox > x1) return -1;
    } else {
      let ta = (x0 - ox) / dx;
      let tb = (x1 - ox) / dx;
      let fa = 0;
      let fb = 1;
      if (ta > tb) {
        const st = ta;
        ta = tb;
        tb = st;
        const sf = fa;
        fa = fb;
        fb = sf;
      }
      if (ta > tmin) {
        tmin = ta;
        face = fa;
      }
      if (tb < tmax) tmax = tb;
      if (tmin > tmax) return -1;
    }
    if (Math.abs(dy) < 1e-8) {
      if (oy < y0 || oy > y1) return -1;
    } else {
      let ta = (y0 - oy) / dy;
      let tb = (y1 - oy) / dy;
      let fa = 2;
      let fb = 3;
      if (ta > tb) {
        const st = ta;
        ta = tb;
        tb = st;
        const sf = fa;
        fa = fb;
        fb = sf;
      }
      if (ta > tmin) {
        tmin = ta;
        face = fa;
      }
      if (tb < tmax) tmax = tb;
      if (tmin > tmax) return -1;
    }
    if (Math.abs(dz) < 1e-8) {
      if (oz < z0 || oz > z1) return -1;
    } else {
      let ta = (z0 - oz) / dz;
      let tb = (z1 - oz) / dz;
      let fa = 4;
      let fb = 5;
      if (ta > tb) {
        const st = ta;
        ta = tb;
        tb = st;
        const sf = fa;
        fa = fb;
        fb = sf;
      }
      if (ta > tmin) {
        tmin = ta;
        face = fa;
      }
      if (tb < tmax) tmax = tb;
      if (tmin > tmax) return -1;
    }
    hitFace = face;
    return tmin;
  }

  function shade(r, g, b, face, t) {
    const m = face === 3 ? 230 : face === 0 || face === 4 ? 150 : 200;
    const f = t > 640 ? 80 : t > 340 ? 150 : 255;
    const s = (m * f) >> 8;
    cR = (r * s) >> 8;
    cG = (g * s) >> 8;
    cB = (b * s) >> 8;
  }

  function gridPixel(wx, wz) {
    const mark = Math.floor(wx / 2) + "," + Math.floor(wz / 2);
    if (skid.has(mark)) {
      cR = 125;
      cG = 230;
      cB = 255;
      return;
    }
    const x = Math.floor(wx);
    const z = Math.floor(wz);
    if (mod(x, GRID) < 2 || mod(z, GRID) < 2) {
      cR = 86;
      cG = 92;
      cB = 102;
      return;
    }
    cR = 26;
    cG = 28;
    cB = 32;
  }

  function carPixel(lx, ly, lz, face) {
    if (ly < 0.98) {
      cR = 12;
      cG = 14;
      cB = 18;
      return;
    }
    if (face === 1 && ly > 1.05 && ly < 1.75 && Math.abs(lz) > 0.55) {
      cR = 255;
      cG = 246;
      cB = 214;
      return;
    }
    if (face === 0 && ly > 0.95 && Math.abs(lz) > 0.7) {
      cR = 255;
      cG = 36;
      cB = 32;
      return;
    }
    if (lx > 6.2 && ly < 1.4 && Math.abs(lz) < 1.15) {
      cR = 8;
      cG = 10;
      cB = 14;
      return;
    }
    if (ly > 1.9 && lx > -0.8 && lx < 3.6 && Math.abs(lz) < 1.2) {
      cR = 126;
      cG = 214;
      cB = 232;
      return;
    }
    if (Math.abs(lz) < 0.24) {
      cR = 246;
      cG = 247;
      cB = 250;
      return;
    }
    if (Math.abs(lz) > 1.4 && ly < 1.85) {
      cR = 255;
      cG = 118;
      cB = 24;
      return;
    }
    if (ly > 2.55) {
      cR = 20;
      cG = 22;
      cB = 26;
      return;
    }
    cR = 28;
    cG = 74;
    cB = 214;
  }

  function wheelPixel(lx, ly, lz, spin) {
    const rad = Math.hypot(lx, ly);
    const ang = Math.atan2(ly, lx) + spin;
    if (rad > 0.74) {
      const tread = Math.sin(ang * 8) > 0.2;
      if (Math.abs(lz) > 0.72) {
        cR = tread ? 22 : 48;
        cG = tread ? 22 : 48;
        cB = tread ? 24 : 52;
        return;
      }
      cR = tread ? 10 : 36;
      cG = tread ? 10 : 36;
      cB = tread ? 12 : 40;
      return;
    }
    if (rad < 0.2) {
      cR = 232;
      cG = 176;
      cB = 42;
      return;
    }
    const turn = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const spoke = Math.abs(((turn / (Math.PI * 2)) * 5) % 1 - 0.5) < 0.1;
    if (spoke) {
      cR = 236;
      cG = 238;
      cB = 242;
      return;
    }
    cR = 14;
    cG = 16;
    cB = 20;
  }

  function addWheel(best, ox, oy, oz, dx, dy, dz, wx, wz, yaw) {
    const x = ox - wx;
    const y = oy - 1.08;
    const z = oz - wz;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const lx = x * c + z * s;
    const lz = -x * s + z * c;
    const ldx = dx * c + dz * s;
    const ldz = -dx * s + dz * c;
    const t = hitBox(lx, y, lz, ldx, dy, ldz, -1.08, -1.08, -1.02, 1.08, 1.08, 1.02);
    if (t <= 0 || t >= best) return best;
    wheelPixel(lx + ldx * t, y + dy * t, lz + ldz * t, wheelSpin);
    shade(cR, cG, cB, hitFace, t);
    return t;
  }

  function sampleCar(ox, oy, oz, dx, dy, dz, limit) {
    const bound = hitBox(ox, oy, oz, dx, dy, dz, -9, 0, -3.6, 8, 3.5, 3.6);
    if (bound <= 0 || bound >= limit) return -1;
    let best = limit;
    const body = hitBox(ox, oy, oz, dx, dy, dz, -7.5, 0.55, -2.05, 7.9, 3.2, 2.05);
    if (body > 0 && body < best) {
      best = body;
      carPixel(ox + dx * body, oy + dy * body, oz + dz * body, hitFace);
      shade(cR, cG, cB, hitFace, body);
    }
    const wing = hitBox(ox, oy, oz, dx, dy, dz, -9, 2.2, -2.75, -7.15, 3.45, 2.75);
    if (wing > 0 && wing < best) {
      best = wing;
      if (Math.abs(oz + dz * wing) > 2.2) {
        cR = 255;
        cG = 118;
        cB = 24;
      } else {
        cR = 16;
        cG = 16;
        cB = 18;
      }
      shade(cR, cG, cB, hitFace, wing);
    }
    best = addWheel(best, ox, oy, oz, dx, dy, dz, 5.05, 2.5, frontYaw);
    best = addWheel(best, ox, oy, oz, dx, dy, dz, 5.05, -2.5, frontYaw);
    best = addWheel(best, ox, oy, oz, dx, dy, dz, -5.55, 2.5, 0);
    best = addWheel(best, ox, oy, oz, dx, dy, dz, -5.55, -2.5, 0);
    return best < limit ? best : -1;
  }

  function edgeBlur(amount) {
    if (amount < 0.04) return;
    const data = frameBuf.data;
    if (!blurCopy || blurCopy.length !== data.length) blurCopy = new Uint8ClampedArray(data.length);
    blurCopy.set(data);
    const cx = (bw - 1) * 0.5;
    const cy = (bh - 1) * 0.5;
    const inv = 1 / (Math.hypot(cx, cy) || 1);
    for (let sy = 0; sy < bh; sy += 1) {
      const dy = sy - cy;
      const row = sy * bw;
      for (let sx = 0; sx < bw; sx += 1) {
        const dx = sx - cx;
        const dist = Math.hypot(dx, dy) * inv;
        const t = Math.max(0, (dist - 0.3) / 0.7) * amount;
        if (t < 0.06) continue;
        const px = sx + (cx - sx) * t * 0.24 - dy * inv * t * 6;
        const py = sy + (cy - sy) * t * 0.24 + dx * inv * t * 6;
        let x0 = px | 0;
        let y0 = py | 0;
        if (x0 < 0) x0 = 0;
        else if (x0 > bw - 2) x0 = bw - 2;
        if (y0 < 0) y0 = 0;
        else if (y0 > bh - 2) y0 = bh - 2;
        const tx = Math.max(0, Math.min(1, px - x0));
        const ty = Math.max(0, Math.min(1, py - y0));
        const i00 = (y0 * bw + x0) * 4;
        const i10 = i00 + 4;
        const i01 = i00 + bw * 4;
        const i11 = i01 + 4;
        const w00 = (1 - tx) * (1 - ty);
        const w10 = tx * (1 - ty);
        const w01 = (1 - tx) * ty;
        const w11 = tx * ty;
        const sr = blurCopy[i00] * w00 + blurCopy[i10] * w10 + blurCopy[i01] * w01 + blurCopy[i11] * w11;
        const sg = blurCopy[i00 + 1] * w00 + blurCopy[i10 + 1] * w10 + blurCopy[i01 + 1] * w01 + blurCopy[i11 + 1] * w11;
        const sb = blurCopy[i00 + 2] * w00 + blurCopy[i10 + 2] * w10 + blurCopy[i01 + 2] * w01 + blurCopy[i11 + 2] * w11;
        const i = (row + sx) * 4;
        data[i] += (sr - data[i]) * t;
        data[i + 1] += (sg - data[i + 1]) * t;
        data[i + 2] += (sb - data[i + 2]) * t;
      }
    }
  }

  function paint(dt) {
    let input = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0) + (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
    if (input > 1) input = 1;
    if (input < -1) input = -1;
    const gas = !!keys.KeyW;
    const brake = !!keys.KeyS;
    const shift = !!(keys.ShiftLeft || keys.ShiftRight);
    if (brake && kmh !== 0) {
      const step = 32 * dt;
      if (Math.abs(kmh) <= step) kmh = 0;
      else kmh -= Math.sign(kmh) * step;
    } else if (gas) {
      const climb = Math.min(1, Math.max(0, kmh / 220));
      kmh = Math.min(305, kmh + 24 * (1 - climb * 0.7) * dt);
    } else if (kmh !== 0) {
      const slip = Math.abs(angDiff(car.ang, velAng));
      let drag = 1;
      if (Math.abs(steer) > 0.35) drag += 0.7;
      if (slip > 0.35) drag += 0.8;
      if (Math.abs(kmh) > 160) drag += 0.4;
      if (slip > 0.65) drag *= 5;
      const step = drag * dt;
      if (Math.abs(kmh) <= step) kmh = 0;
      else kmh -= Math.sign(kmh) * step;
    }
    if (surgeTime > 0) {
      surgeTime -= dt;
      if (surgeTime <= 0) {
        surgeTime = 0;
        surge = 0;
      }
    }
    const drive = kmh + surge;
    const pace = Math.abs(drive);
    const steerSign = drive < 0 ? -1 : 1;
    steer += (input - steer) * Math.min(1, dt * 8);
    const sliding = Math.abs(steer) > 0.45 && pace > 36;
    if (pace < 5) {
      car.ang += angDiff(velAng, car.ang) * Math.min(1, dt * 10);
      driftHeld = 0;
    } else if (sliding) {
      driftHeld += dt;
      const depth = Math.min(1, Math.max(0, (pace - 36) / 50));
      const target = Math.sign(steer) * steerSign * (0.38 + depth * 0.42);
      car.ang += angDiff(velAng + target, car.ang) * Math.min(1, dt * 7);
      velAng += Math.sign(steer) * (1.15 + depth * 0.7) * dt * steerSign;
      velAng += angDiff(car.ang, velAng) * Math.min(1, dt * 0.85);
    } else {
      if (driftHeld > 0.28) {
        const tier = Math.min(1, (driftHeld - 0.28) / 0.9);
        surge = 16 + tier * 36;
        surgeTime = 0.55 + tier * 0.75;
      }
      driftHeld = 0;
      const slip = angDiff(car.ang, velAng);
      car.ang -= slip * Math.min(1, dt * 8);
      velAng += slip * Math.min(1, dt * 5);
      const yaw = steer * 2.4 * dt * steerSign;
      car.ang += yaw;
      velAng += yaw * 0.85;
    }
    gauge += (kmh + surge - gauge) * Math.min(1, dt * 8);
    car.speed = ((kmh + surge) / 3.6) / (4.5 / 17);
    car.x += Math.cos(velAng) * car.speed * dt;
    car.y += Math.sin(velAng) * car.speed * dt;
    if (driftHeld > 0) {
      const mark = Math.floor(car.x / 2) + "," + Math.floor(car.y / 2);
      if (!skid.has(mark)) {
        skid.set(mark, 1);
        if (skid.size > 6000) skid.delete(skid.keys().next().value);
      }
    }
    wheelSpin += car.speed * dt * 0.95;
    frontYaw = Math.max(-0.85, Math.min(0.85, steer * 0.95));
    showSpeed();
    boost += ((shift ? 1 : 0) - boost) * Math.min(1, dt * 1.15);
    trailTick += dt;
    if (trailTick > 0.05) {
      trailTick = 0;
      trail[1].x = trail[0].x;
      trail[1].y = trail[0].y;
      trail[1].ang = trail[0].ang;
      trail[0].x = car.x;
      trail[0].y = car.y;
      trail[0].ang = car.ang;
    }

    camAng += angDiff(car.ang, camAng) * Math.min(1, dt * 3);
    const rush = Math.min(1, Math.max(0, pace - 100) / 180);
    viewTan += (0.72 + rush * 0.42 - viewTan) * Math.min(1, dt * 1.35);
    let camX = car.x;
    let camY = 17;
    let camZ = car.y;
    let vx = 0;
    let vy = -1;
    let vz = 0;
    let rx = 1;
    let ry = 0;
    let rz = 0;
    let ux = 0;
    let uy = 0;
    let uz = 1;
    let tan = 0.92;
    if (camMode === 0) {
      const fx = Math.cos(camAng);
      const fz = Math.sin(camAng);
      camX = car.x - fx * 36;
      camZ = car.y - fz * 36;
      vx = fx * 64;
      vy = 6 - camY;
      vz = fz * 64;
      const vl = Math.hypot(vx, vy, vz) || 1;
      vx /= vl;
      vy /= vl;
      vz /= vl;
      rx = vz;
      rz = -vx;
      const rl = Math.hypot(rx, rz) || 1;
      rx /= rl;
      rz /= rl;
      ux = vy * rz - vz * ry;
      uy = vz * rx - vx * rz;
      uz = vx * ry - vy * rx;
      tan = viewTan;
    } else {
      camX = fixX;
      camY = 175;
      camZ = fixZ;
    }
    const aspect = bw / bh;
    const data = frameBuf.data;
    const cfx = Math.cos(car.ang);
    const cfz = Math.sin(car.ang);
    const crx = -cfz;
    const crz = cfx;
    const ghostOn = boost > 0.08;
    let g0x = 0;
    let g0z = 0;
    let g0fx = 1;
    let g0fz = 0;
    let g0rx = 0;
    let g0rz = 1;
    let g1x = 0;
    let g1z = 0;
    let g1fx = 1;
    let g1fz = 0;
    let g1rx = 0;
    let g1rz = 1;
    if (ghostOn) {
      g0fx = Math.cos(trail[0].ang);
      g0fz = Math.sin(trail[0].ang);
      g0x = camX - trail[0].x;
      g0z = camZ - trail[0].y;
      g0rx = -g0fz;
      g0rz = g0fx;
      g1fx = Math.cos(trail[1].ang);
      g1fz = Math.sin(trail[1].ang);
      g1x = camX - trail[1].x;
      g1z = camZ - trail[1].y;
      g1rx = -g1fz;
      g1rz = g1fx;
    }
    const g0a = 0.4 * boost;
    const g1a = 0.22 * boost;

    for (let sy = 0; sy < bh; sy += 1) {
      const ndcY = 1 - ((sy + 0.5) / bh) * 2;
      for (let sx = 0; sx < bw; sx += 1) {
        const ndcX = ((sx + 0.5) / bw) * 2 - 1;
        let dx = vx + rx * ndcX * aspect * tan + ux * ndcY * tan;
        let dy = vy + ry * ndcX * aspect * tan + uy * ndcY * tan;
        let dz = vz + rz * ndcX * aspect * tan + uz * ndcY * tan;
        const dl = Math.hypot(dx, dy, dz) || 1;
        dx /= dl;
        dy /= dl;
        dz /= dl;

        let bestT = 900;
        let r = 150;
        let g = 196;
        let b = 230;
        const band = sy >> 3;
        if (band < 3) {
          r = 110;
          g = 164;
          b = 220;
        } else if (band < 7) {
          r = 150;
          g = 196;
          b = 230;
        }

        const lx = camX - car.x;
        const lz = camZ - car.y;
        const ct = sampleCar(
          lx * cfx + lz * cfz,
          camY,
          lx * crx + lz * crz,
          dx * cfx + dz * cfz,
          dy,
          dx * crx + dz * crz,
          bestT
        );
        if (ct > 0) {
          bestT = ct;
          r = cR;
          g = cG;
          b = cB;
        }

        if (dy < 0) {
          const gt = -camY / dy;
          if (gt > 0.05 && gt < bestT) {
            gridPixel(camX + dx * gt, camZ + dz * gt);
            shade(cR, cG, cB, 3, gt);
            r = cR;
            g = cG;
            b = cB;
            bestT = gt;
          }
        }

        if (ghostOn) {
          const t0 = sampleCar(
            g0x * g0fx + g0z * g0fz,
            camY,
            g0x * g0rx + g0z * g0rz,
            dx * g0fx + dz * g0fz,
            dy,
            dx * g0rx + dz * g0rz,
            bestT
          );
          if (t0 > 0) {
            r += (cR - r) * g0a;
            g += (cG - g) * g0a;
            b += (cB - b) * g0a;
            bestT = t0;
          }
          const t1 = sampleCar(
            g1x * g1fx + g1z * g1fz,
            camY,
            g1x * g1rx + g1z * g1rz,
            dx * g1fx + dz * g1fz,
            dy,
            dx * g1rx + dz * g1rz,
            bestT
          );
          if (t1 > 0) {
            r += (cR - r) * g1a;
            g += (cG - g) * g1a;
            b += (cB - b) * g1a;
            bestT = t1;
          }
        }

        const i = (sy * bw + sx) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    edgeBlur(boost);
    ctx.putImageData(frameBuf, 0, 0);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    paint(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
