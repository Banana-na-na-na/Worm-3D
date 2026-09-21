(() => {
  "use strict";

  if (typeof THREE === "undefined") {
    alert("Three.js 로드 실패");
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2e34);
  scene.fog = new THREE.Fog(0x2a2e34, 28, 90);
  const fogCol = scene.fog.color;
  let fogBlend = 0; // 0=방, 1=미로 안개
  const caveFogEl = document.getElementById("cave-fog");
  const FOG_FADE_SEC = 1;

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.05,
    220
  );

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xe8eef4, 0x3a4048, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dd, 0.4);
  sun.position.set(6, 14, 4);
  scene.add(sun);
  const roomFill = new THREE.PointLight(0xfff5e8, 0.4, 32);
  roomFill.position.set(0, 3.2, 0);
  scene.add(roomFill);
  const hemiColA = new THREE.Color(0xe8eef4);
  const hemiColB = new THREE.Color(0x3a4048);
  const hemiCaveA = new THREE.Color(0x2a1c14);
  const hemiCaveB = new THREE.Color(0x080604);
  const sunColRoom = new THREE.Color(0xfff2dd);
  const sunColCave = new THREE.Color(0x3a2010);
  const fillColRoom = new THREE.Color(0xfff5e8);
  const fillColCave = new THREE.Color(0x1a1008);

  // ---- 돌 텍스처 (작은 픽셀) ----
  const MC = 64;
  const BLOCK = 2; // 월드 2m = 텍스처 1장 → 픽셀이 더 작게 보임

  function hash2(ix, iy, seed) {
    let n = (ix * 374761393 + iy * 668265263 + seed * 982451653) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function wrapI(i, period) {
    return ((i % period) + period) % period;
  }

  function smoothNoise(x, y, seed, period) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash2(wrapI(x0, period), wrapI(y0, period), seed);
    const b = hash2(wrapI(x0 + 1, period), wrapI(y0, period), seed);
    const c = hash2(wrapI(x0, period), wrapI(y0 + 1, period), seed);
    const d = hash2(wrapI(x0 + 1, period), wrapI(y0 + 1, period), seed);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, seed) {
    // x,y: 픽셀 좌표 0..MC-1 → 가장자리 이음새 없는 돌 노이즈
    let v = 0;
    let a = 0.55;
    let freq = 3;
    for (let i = 0; i < 4; i += 1) {
      v +=
        a *
        smoothNoise(
          (x / MC) * freq,
          (y / MC) * freq,
          seed + i * 17,
          freq
        );
      a *= 0.5;
      freq *= 2;
    }
    return v;
  }

  function paintStone(x, y, seed) {
    const n = fbm(x, y, seed);
    const n2 = fbm((x + 17) % MC, (y + 9) % MC, seed + 91);
    const speck = hash2(x, y, seed + 3);
    let g = 100 + n * 50 + (n2 - 0.5) * 24;
    if (speck > 0.93) g += 16;
    if (speck < 0.07) g -= 20;
    const cool = (n2 - 0.5) * 10;
    const r = Math.max(45, Math.min(175, g + cool * 0.3));
    const gre = Math.max(45, Math.min(175, g));
    const b = Math.max(45, Math.min(175, g - cool * 0.4));
    return [r | 0, gre | 0, b | 0];
  }

  function makeStoneTex(seed) {
    const c = document.createElement("canvas");
    c.width = c.height = MC;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(MC, MC);
    const d = img.data;
    for (let y = 0; y < MC; y += 1) {
      for (let x = 0; x < MC; x += 1) {
        const rgb = paintStone(x, y, seed);
        const i = (y * MC + x) * 4;
        d[i] = rgb[0];
        d[i + 1] = rgb[1];
        d[i + 2] = rgb[2];
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  function makeStoneMat(seed) {
    return new THREE.MeshLambertMaterial({
      map: makeStoneTex(seed),
      color: 0xffffff,
    });
  }

  /** 면 길이 + 월드 오프셋으로 UV를 월드 격자에 맞춤 → 인접 벽 이음새 정렬 */
  function tileMat(base, metersU, metersV, ox, oz) {
    const m = base.clone();
    const ru = Math.max(0.01, metersU / BLOCK);
    const rv = Math.max(0.01, metersV / BLOCK);
    if (base.map) {
      m.map = base.map.clone();
      m.map.repeat.set(ru, rv);
      // 월드 좌표 기준 오프셋 (겹침 없이 맞닿을 때 패턴이 이어지게)
      const ou = (ox - metersU * 0.5) / BLOCK;
      const ov = (oz - metersV * 0.5) / BLOCK;
      m.map.offset.set(ou - Math.floor(ou), ov - Math.floor(ov));
      m.map.needsUpdate = true;
    }
    // 맞닿는 면의 z-fighting 완화
    m.polygonOffset = true;
    m.polygonOffsetFactor = 1;
    m.polygonOffsetUnits = 1;
    return m;
  }

  const wallMatBase = makeStoneMat(101);
  const floorMatBase = makeStoneMat(202);
  const ceilMatBase = makeStoneMat(303);

  // 미로 ? 흙 (웜용)
  function paintDirt(x, y, seed) {
    const n = fbm(x, y, seed);
    const n2 = fbm((x + 11) % MC, (y + 7) % MC, seed + 44);
    const speck = hash2(x, y, seed + 5);
    let r = 110 + n * 40 + (n2 - 0.5) * 18;
    let g = 78 + n * 28 + (n2 - 0.5) * 12;
    let b = 48 + n * 16;
    if (speck > 0.9) {
      r += 20;
      g += 12;
    }
    if (speck < 0.1) {
      r -= 18;
      g -= 14;
      b -= 10;
    }
    return [
      Math.max(40, Math.min(170, r)) | 0,
      Math.max(30, Math.min(130, g)) | 0,
      Math.max(20, Math.min(90, b)) | 0,
    ];
  }

  function makeDirtTex(seed) {
    const c = document.createElement("canvas");
    c.width = c.height = MC;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(MC, MC);
    const d = img.data;
    for (let y = 0; y < MC; y += 1) {
      for (let x = 0; x < MC; x += 1) {
        const rgb = paintDirt(x, y, seed);
        const i = (y * MC + x) * 4;
        d[i] = rgb[0];
        d[i + 1] = rgb[1];
        d[i + 2] = rgb[2];
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function makeDirtMat(seed) {
    return new THREE.MeshLambertMaterial({
      map: makeDirtTex(seed),
      color: 0xffffff,
    });
  }

  const caveMatBase = makeDirtMat(404);
  const caveFloorMatBase = makeDirtMat(505);
  const caveCeilMatBase = makeDirtMat(606);

  const roomFogColor = new THREE.Color(0x2a2e34);
  const caveFogColor = new THREE.Color(0x000000);

  // ---- 네모난 방 (+Z 벽 중앙에 동굴 입구) ----
  const ROOM = 16;
  const WALL_H = 4;
  const HALF = ROOM * 0.5;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM, ROOM),
    tileMat(floorMatBase, ROOM, ROOM, 0, 0)
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM, ROOM),
    tileMat(floorMatBase, ROOM, ROOM, 0, 0)
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = WALL_H;
  ceil.userData.devCeil = true;
  scene.add(ceil);

  const colliders = [];
  function addCollider(x, z, w, d) {
    colliders.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
    });
  }

  function wall(w, h, d, x, y, z, mat, solid) {
    const uSpan = Math.max(w, d);
    const useMat = mat || tileMat(wallMatBase, uSpan, h, x, z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), useMat);
    m.position.set(x, y, z);
    scene.add(m);
    if (solid !== false) addCollider(x, z, w, d);
    return m;
  }

  const t = 0.35;
  const DOOR_W = 4.4; // 복도 칸(CELL)과 맞춰 입구에서 흙이 안 삐치게

  // -Z, ±X 벽 (막힘)
  wall(ROOM + t, WALL_H, t, 0, WALL_H * 0.5, -HALF);
  wall(t, WALL_H, ROOM + t, -HALF, WALL_H * 0.5, 0);
  wall(t, WALL_H, ROOM + t, HALF, WALL_H * 0.5, 0);

  // +Z 벽: 좌/우 + 위 인방(방 재질) ? 동굴 높이까지만 입구
  const sideW = (ROOM - DOOR_W) * 0.5;
  wall(sideW, WALL_H, t, -(DOOR_W * 0.5 + sideW * 0.5), WALL_H * 0.5, HALF);
  wall(sideW, WALL_H, t, DOOR_W * 0.5 + sideW * 0.5, WALL_H * 0.5, HALF);

  // 바닥 격자(방) ? 재질 위에 아주 약하게
  const grid = new THREE.GridHelper(ROOM, 16, 0x5a6a78, 0x2a333c);
  grid.position.y = 0.015;
  const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (let i = 0; i < gridMats.length; i += 1) {
    gridMats[i].transparent = true;
    gridMats[i].opacity = 0.22;
  }
  scene.add(grid);

  // ---- 미로 동굴: 청크마다 랜덤 생성, 앞으로 가면 계속 이어짐 ----
  const CELL = 4.4; // 복도 폭 2배 (기존 2.2)
  const MW = 57; // 좌우 칸 수 (기존 19의 3배, 홀수)
  const SEG = 21; // 청크 깊이(홀수)
  const CAVE_H = 3.2;
  // 입구 위: 방 벽 재질 인방 (시각만 — 콜라이더 있으면 문 전체가 막힘)
  {
    const lintelH = WALL_H - CAVE_H;
    wall(DOOR_W, lintelH, t, 0, CAVE_H + lintelH * 0.5, HALF, null, false);
    // 인방을 동굴 쪽으로 조금 더 밀어 천장 틈 가림
    const ceilExt = wall(
      DOOR_W,
      0.16,
      CELL * 0.55,
      0,
      CAVE_H - 0.08,
      HALF + t * 0.5 + CELL * 0.25,
      tileMat(caveFloorMatBase, DOOR_W, CELL * 0.55, 0, HALF + t * 0.5),
      false
    );
    ceilExt.userData.devCeil = true;
  }
  const MAZE_START_SEGS = 24; // 저장고 200개+간격 수용
  const WALL_S = CELL; // 딱 맞춤 (겹침·틈 없음)
  const mazeW = MW * CELL;
  // 문 뒷면(+t/2)에 맞춰 미로를 붙여 흙 벽이 로비로 안 삐짐
  const mazeOriginX = -((MW - 1) * CELL) * 0.5;
  const mazeOriginZ = HALF + t * 0.5 + CELL * 0.5;
  const enterX = (MW / 2) | 0;

  // 큰 방: 맵에 여러 개, 면당 연결 0~1, 크기 2배, 스폰 근처
  const NEST_COUNT = 5;
  const STORAGE_COUNT = 200; // 저장고(막다른 길)
  const HALL_COUNT = STORAGE_COUNT + NEST_COUNT;
  const HALL_SPAN = 18; // 둥지(큰방) 한 변
  const STORAGE_SPAN = 8; // 저장고: 200개+간격이 들어가도록 작게
  const HALL_MIN_GAP = 2; // 로비 제외 방끼리 최소 빈 칸
  const HALL_H = 9.5;
  const halls = [];
  const SMALL_EGG_R = 0.48;
  const STORAGE_EGG_COUNT = 10;
  const smallEggs = []; // 미니웜 부화용 작은 알 (통과 가능)
  const HIDE_COUNT = 400;
  const HIDE_GAP = 0.34; // 틈새 안쪽 폭 (칸 대비, 양옆 좁힘)
  const HIDE_MIN_GAP = 2; // 틈새·굴 서로 최소 칸 간격
  const FAKE_HIDE_COUNT = 40; // 가짜 틈새(조개 괴물)
  const FAKE_HIDE_KILL_SEC = 1;
  const hideMap = []; // cz → cx → { dx, dz, fake? }
  const fakeHides = []; // 조개 함정 인스턴스
  const HOLE_COUNT = 350; // 굴(틈새형 + 낮은 천장, 웅크리기 필수)
  const HOLE_LEN = 2; // 약 2칸
  const HOLE_PASS_Y = 1.12; // 이보다 눈높이 낮아야 통과 (웅크리면 CROUCH_EYE_H)
  const holeMap = []; // cz → cx → { dx, dz } ? 굴

  const mazeGroup = new THREE.Group();
  scene.add(mazeGroup);
  const roomColliderCount = colliders.length;
  const cells = []; // 행(z) → 열(x), true=통로
  let mazeRows = 0;

  function mazeWall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      tileMat(caveMatBase, Math.max(w, d), h, x, z)
    );
    m.position.set(x, y, z);
    m.userData.sprayWall = true;
    mazeGroup.add(m);
    addCollider(x, z, w, d);
    return m;
  }

  const sprayGroup = new THREE.Group();
  scene.add(sprayGroup);

  function clearSprayMarks() {
    while (sprayGroup.children.length) {
      const m = sprayGroup.children[0];
      sprayGroup.remove(m);
      if (m.material) {
        if (m.material.map) m.material.map.dispose();
        m.material.dispose();
      }
      if (m.geometry) m.geometry.dispose();
    }
  }

  function clearMaze() {
    clearSprayMarks();
    clearShovelOutlines();
    setShovelMode(false);
    while (mazeGroup.children.length) {
      const m = mazeGroup.children[0];
      mazeGroup.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    colliders.length = roomColliderCount;
    cells.length = 0;
    mazeRows = 0;
    halls.length = 0;
    smallEggs.length = 0;
    hideMap.length = 0;
    holeMap.length = 0;
    fakeHides.length = 0;
  }

  function isHideCell(cx, cz) {
    return !!(hideMap[cz] && hideMap[cz][cx]);
  }

  function isFakeHideCell(cx, cz) {
    const v = hideMap[cz] && hideMap[cz][cx];
    return !!(v && v.fake);
  }

  function hideOpenDir(cx, cz) {
    const v = hideMap[cz] && hideMap[cz][cx];
    if (!v) return null;
    if (typeof v === "object") return v;
    return { dx: 0, dz: 1 };
  }

  function isInHideSpot() {
    if (isInLobby()) return false;
    const c = cellFromWorld(pos.x, pos.z);
    return isHideCell(c.cx, c.cz);
  }

  function isInFakeHide() {
    if (isInLobby()) return false;
    const c = cellFromWorld(pos.x, pos.z);
    return isFakeHideCell(c.cx, c.cz);
  }

  function isHoleCell(cx, cz) {
    return !!(holeMap[cz] && holeMap[cz][cx]);
  }

  function holeDir(cx, cz) {
    const v = holeMap[cz] && holeMap[cz][cx];
    if (!v) return null;
    return v;
  }

  function isInHole() {
    if (isInLobby()) return false;
    const c = cellFromWorld(pos.x, pos.z);
    return isHoleCell(c.cx, c.cz);
  }

  function canPassHoleStance() {
    return isCrouching() || isLegless() || pos.y <= HOLE_PASS_Y + 0.02;
  }

  /** 서 있으면 굴 칸 진입/이동 불가 */
  function holeBlocksPlayerAt(x, z) {
    const c = cellFromWorld(x, z);
    if (!isHoleCell(c.cx, c.cz)) return false;
    return !canPassHoleStance();
  }

  function placeHideSpots() {
    hideMap.length = 0;
    for (let z = 0; z < mazeRows; z += 1) hideMap[z] = [];

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const candidates = [];
    for (let cz = 3; cz < mazeRows - 2; cz += 1) {
      if (!cells[cz]) continue;
      for (let cx = 1; cx < MW - 1; cx += 1) {
        if (cells[cz][cx]) continue; // 벽만 후보
        if (hallAt(cx, cz)) continue;
        let walkN = 0;
        let openDx = 0;
        let openDz = 0;
        for (let di = 0; di < 4; di += 1) {
          const nx = cx + dirs[di][0];
          const nz = cz + dirs[di][1];
          if (nz < 0 || nz >= mazeRows || !cells[nz]) continue;
          if (!cells[nz][nx]) continue;
          if (hallAt(nx, nz)) continue;
          walkN += 1;
          openDx = dirs[di][0];
          openDz = dirs[di][1];
        }
        // 복도 옆에 붙은 한 칸짜리 벽장
        if (walkN === 1) candidates.push({ cx, cz, openDx, openDz });
      }
    }

    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = (Math.random() * (i + 1)) | 0;
      const t0 = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = t0;
    }

    const placedList = [];
    function tooCloseHide(cx, cz) {
      for (let i = 0; i < placedList.length; i += 1) {
        const p = placedList[i];
        if (
          Math.max(Math.abs(p.cx - cx), Math.abs(p.cz - cz)) <= HIDE_MIN_GAP
        ) {
          return true;
        }
      }
      return false;
    }

    let placed = 0;
    for (let i = 0; i < candidates.length && placed < HIDE_COUNT; i += 1) {
      const { cx, cz, openDx, openDz } = candidates[i];
      if (cells[cz][cx]) continue;
      if (tooCloseHide(cx, cz)) continue;
      cells[cz][cx] = true;
      if (!hideMap[cz]) hideMap[cz] = [];
      hideMap[cz][cx] = { dx: openDx, dz: openDz, fake: false };
      placedList.push({ cx, cz });
      placed += 1;
    }

    // 배치된 틈새 중 일부를 가짜(조개)로
    for (let i = placedList.length - 1; i > 0; i -= 1) {
      const j = (Math.random() * (i + 1)) | 0;
      const t1 = placedList[i];
      placedList[i] = placedList[j];
      placedList[j] = t1;
    }
    const fakeN = Math.min(FAKE_HIDE_COUNT, placedList.length);
    for (let i = 0; i < fakeN; i += 1) {
      const { cx, cz } = placedList[i];
      if (hideMap[cz] && hideMap[cz][cx]) hideMap[cz][cx].fake = true;
    }
  }

  function placeHoles() {
    holeMap.length = 0;
    for (let z = 0; z < mazeRows; z += 1) holeMap[z] = [];

    function corridorOpen(x, z) {
      return (
        z >= 0 &&
        z < mazeRows &&
        x >= 0 &&
        x < MW &&
        cells[z] &&
        cells[z][x] &&
        !hallAt(x, z)
      );
    }

    /** 축 방향 직선 복도만 (교차·T자·모서리 제외) */
    function isStraightCorridorCell(x, z, dx, dz) {
      if (!corridorOpen(x, z) || isHideCell(x, z)) return false;
      const px = -dz;
      const pz = dx;
      if (corridorOpen(x + px, z + pz) || corridorOpen(x - px, z - pz)) {
        return false;
      }
      if (!corridorOpen(x + dx, z + dz) || !corridorOpen(x - dx, z - dz)) {
        return false;
      }
      let n = 0;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (let di = 0; di < 4; di += 1) {
        if (corridorOpen(x + dirs[di][0], z + dirs[di][1])) n += 1;
      }
      return n === 2;
    }

    const candidates = [];
    const axes = [
      [1, 0],
      [0, 1],
    ];
    for (let cz = 4; cz < mazeRows - 3; cz += 1) {
      if (!cells[cz]) continue;
      for (let cx = 2; cx < MW - 2; cx += 1) {
        for (let ai = 0; ai < axes.length; ai += 1) {
          const dx = axes[ai][0];
          const dz = axes[ai][1];
          let ok = true;
          const segs = [];
          // 굴 칸 + 앞뒤 1칸까지 전부 직선 복도여야 함 (교차 근처 제외)
          for (let k = -1; k <= HOLE_LEN; k += 1) {
            const x = cx + dx * k;
            const z = cz + dz * k;
            if (!isStraightCorridorCell(x, z, dx, dz)) {
              ok = false;
              break;
            }
            if (k >= 0 && k < HOLE_LEN) segs.push({ cx: x, cz: z });
          }
          if (!ok || segs.length !== HOLE_LEN) continue;
          candidates.push({ segs, dx, dz });
        }
      }
    }

    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = t;
    }

    let placed = 0;
    for (let i = 0; i < candidates.length && placed < HOLE_COUNT; i += 1) {
      const cand = candidates[i];
      let overlap = false;
      for (let k = 0; k < cand.segs.length; k += 1) {
        const s = cand.segs[k];
        if (isHoleCell(s.cx, s.cz) || isHideCell(s.cx, s.cz) || hallAt(s.cx, s.cz)) {
          overlap = true;
          break;
        }
        // 틈새와 동일: HIDE_MIN_GAP 칸 이내 다른 굴 금지
        for (let oz = -HIDE_MIN_GAP; oz <= HIDE_MIN_GAP && !overlap; oz += 1) {
          for (let ox = -HIDE_MIN_GAP; ox <= HIDE_MIN_GAP; ox += 1) {
            if (ox === 0 && oz === 0) continue;
            if (isHoleCell(s.cx + ox, s.cz + oz)) {
              overlap = true;
              break;
            }
          }
        }
        if (overlap) break;
      }
      if (overlap) continue;
      for (let k = 0; k < cand.segs.length; k += 1) {
        const s = cand.segs[k];
        if (!holeMap[s.cz]) holeMap[s.cz] = [];
        holeMap[s.cz][s.cx] = { dx: cand.dx, dz: cand.dz };
      }
      placed += 1;
    }
  }

  function hallAt(cx, cz) {
    for (let i = 0; i < halls.length; i += 1) {
      const h = halls[i];
      if (cx >= h.x0 && cx <= h.x1 && cz >= h.z0 && cz <= h.z1) return h;
    }
    return null;
  }

  function hallsOverlap(x0, z0, x1, z1) {
    const g = HALL_MIN_GAP;
    for (let i = 0; i < halls.length; i += 1) {
      const h = halls[i];
      if (
        x0 <= h.x1 + g &&
        x1 >= h.x0 - g &&
        z0 <= h.z1 + g &&
        z1 >= h.z0 - g
      ) {
        return true;
      }
    }
    return false;
  }

  function countOpenCells() {
    let n = 0;
    for (let z = 0; z < mazeRows; z += 1) {
      if (!cells[z]) continue;
      for (let x = 0; x < MW; x += 1) if (cells[z][x]) n += 1;
    }
    return n;
  }

  /** 입구에서 BFS ? 모든 통로가 연결됐는지 */
  function isMazeFullyConnected() {
    const startZ = 1;
    const startX = enterX;
    if (!cells[startZ] || !cells[startZ][startX]) return false;
    const total = countOpenCells();
    if (total === 0) return false;
    const seen = new Set();
    const q = [[startX, startZ]];
    seen.add(`${startX},${startZ}`);
    let reached = 0;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    while (q.length) {
      const [cx, cz] = q.pop();
      reached += 1;
      for (let di = 0; di < 4; di += 1) {
        const nx = cx + dirs[di][0];
        const nz = cz + dirs[di][1];
        if (nx < 0 || nx >= MW || nz < 0 || nz >= mazeRows) continue;
        if (!cells[nz] || !cells[nz][nx]) continue;
        const k = `${nx},${nz}`;
        if (seen.has(k)) continue;
        seen.add(k);
        q.push([nx, nz]);
      }
    }
    return reached === total;
  }

  function cloneCellsGrid() {
    const copy = [];
    for (let z = 0; z < mazeRows; z += 1) {
      copy[z] = cells[z].slice();
    }
    return copy;
  }

  function restoreCellsGrid(copy) {
    for (let z = 0; z < mazeRows; z += 1) {
      cells[z] = copy[z].slice();
    }
  }

  /** 큰방을 기존 복도 위에 깎지 않도록 */
  function hallOverlapsCorridorTooMuch(x0, z0, x1, z1) {
    let open = 0;
    let total = 0;
    for (let z = z0; z <= z1; z += 1) {
      if (!cells[z]) continue;
      for (let x = x0; x <= x1; x += 1) {
        total += 1;
        if (cells[z][x]) open += 1;
      }
    }
    if (total <= 0) return true;
    return open / total > 0.12;
  }

  function openHallDoor(x0, z0, x1, z1, side) {
    let dx = 0;
    let dz = 0;
    let doorX = ((x0 + x1) / 2) | 0;
    let doorZ = ((z0 + z1) / 2) | 0;
    if (side === "n") {
      doorZ = z0;
      dz = -1;
    } else if (side === "s") {
      doorZ = z1;
      dz = 1;
    } else if (side === "w") {
      doorX = x0;
      dx = -1;
    } else {
      doorX = x1;
      dx = 1;
    }
    cells[doorZ][doorX] = true;
    const ox = doorX + dx;
    const oz = doorZ + dz;
    if (oz >= 0 && oz < mazeRows && ox >= 0 && ox < MW) {
      cells[oz][ox] = true;
      // 바깥이 막혀 있으면 한 칸 더 열어 복도와 이어지게
      const ox2 = ox + dx;
      const oz2 = oz + dz;
      if (oz2 >= 0 && oz2 < mazeRows && ox2 >= 1 && ox2 < MW - 1) {
        if (!cells[oz2][ox2]) cells[oz2][ox2] = true;
      }
    }
    return { x: doorX, z: doorZ, side };
  }

  function carveOneHall(x0, z0, x1, z1, opts) {
    const kind = (opts && opts.kind) || "nest";
    for (let z = z0; z <= z1; z += 1) {
      if (!cells[z]) continue;
      for (let x = x0; x <= x1; x += 1) {
        const edge = x === x0 || x === x1 || z === z0 || z === z1;
        cells[z][x] = !edge;
      }
    }
    const sides = shuffleDirs(["n", "s", "e", "w"]);
    const doors = [];
    if (kind === "storage") {
      // 저장고: 무조건 막다른 길 (문 1개)
      doors.push(openHallDoor(x0, z0, x1, z1, sides[0]));
    } else {
      for (let i = 0; i < sides.length; i += 1) {
        // 면마다 0 또는 1개
        if (Math.random() < 0.7) {
          doors.push(openHallDoor(x0, z0, x1, z1, sides[i]));
        }
      }
      if (!doors.length) {
        doors.push(openHallDoor(x0, z0, x1, z1, sides[0]));
      }
    }
    halls.push({
      x0,
      z0,
      x1,
      z1,
      doors,
      kind,
      storageLooted: false,
    });
  }

  function placeBigHalls() {
    halls.length = 0;
    if (mazeRows < STORAGE_SPAN + 10) return;
    const zMin = 5;

    function hallsOverlapGap(x0, z0, x1, z1, gap) {
      const g = gap;
      for (let i = 0; i < halls.length; i += 1) {
        const h = halls[i];
        if (
          x0 <= h.x1 + g &&
          x1 >= h.x0 - g &&
          z0 <= h.z1 + g &&
          z1 >= h.z0 - g
        ) {
          return true;
        }
      }
      return false;
    }

    function attemptPlace(kind) {
      const span = kind === "storage" ? STORAGE_SPAN : HALL_SPAN;
      const gap = kind === "storage" ? 1 : HALL_MIN_GAP;
      const zMax = mazeRows - span - 2;
      if (zMax <= zMin) return false;
      const x0 = 2 + ((Math.random() * (MW - span - 3)) | 0);
      const z0 = zMin + ((Math.random() * Math.max(1, zMax - zMin)) | 0);
      const x1 = x0 + span - 1;
      const z1 = z0 + span - 1;
      if (x1 >= MW - 2 || z1 >= mazeRows - 2) return false;
      if (hallsOverlapGap(x0, z0, x1, z1, gap)) return false;
      // 저장고는 복도 위에 조금 더 올려도 됨 (문만 잘 이어지면 OK)
      const prevOpenLimit = kind === "storage" ? 0.22 : 0.12;
      let open = 0;
      let total = 0;
      for (let z = z0; z <= z1; z += 1) {
        if (!cells[z]) continue;
        for (let x = x0; x <= x1; x += 1) {
          total += 1;
          if (cells[z][x]) open += 1;
        }
      }
      if (total <= 0 || open / total > prevOpenLimit) return false;

      const prevCells = cloneCellsGrid();
      for (let z = z0; z <= z1; z += 1) {
        if (!cells[z]) continue;
        for (let x = x0; x <= x1; x += 1) {
          const edge = x === x0 || x === x1 || z === z0 || z === z1;
          cells[z][x] = !edge;
        }
      }
      const shellCells = cloneCellsGrid();
      const sides = shuffleDirs(["n", "s", "e", "w"]);
      let doors = [];
      let ok = false;

      if (kind === "storage") {
        for (let si = 0; si < sides.length; si += 1) {
          restoreCellsGrid(shellCells);
          doors = [openHallDoor(x0, z0, x1, z1, sides[si])];
          if (isMazeFullyConnected()) {
            ok = true;
            break;
          }
        }
      } else {
        for (let i = 0; i < sides.length; i += 1) {
          if (Math.random() < 0.7) {
            doors.push(openHallDoor(x0, z0, x1, z1, sides[i]));
          }
        }
        if (!doors.length) {
          doors.push(openHallDoor(x0, z0, x1, z1, sides[0]));
        }
        ok = isMazeFullyConnected();
      }

      if (!ok) {
        restoreCellsGrid(prevCells);
        return false;
      }
      halls.push({
        x0,
        z0,
        x1,
        z1,
        doors,
        kind,
        storageLooted: false,
      });
      return true;
    }

    // 둥지 먼저, 저장고는 가능한 만큼 (실패해도 다음으로 — 예전엔 한 칸에 막혀 전부 실패)
    for (let i = 0; i < NEST_COUNT; i += 1) {
      for (let t = 0; t < 2500; t += 1) {
        if (attemptPlace("nest")) break;
      }
    }
    for (let i = 0; i < STORAGE_COUNT; i += 1) {
      let placed = false;
      for (let t = 0; t < 500; t += 1) {
        if (attemptPlace("storage")) {
          placed = true;
          break;
        }
      }
      if (!placed) break; // 더 이상 자리 없으면 조기 종료
    }
  }

  function hallCenterWorld(h) {
    return {
      x: mazeOriginX + ((h.x0 + h.x1) * 0.5) * CELL,
      z: mazeOriginZ + ((h.z0 + h.z1) * 0.5) * CELL,
    };
  }

  function pickDragHallNear(fromX, fromZ) {
    if (!halls.length) return null;
    const MIN_DRAG = CELL * 8;
    let best = null;
    let bestScore = Infinity;
    // 둥지(큰방) 우선 — 저장고보다 끌기 연출이 안정적
    const order = halls.slice().sort((a, b) => {
      const an = a.kind === "nest" ? 0 : 1;
      const bn = b.kind === "nest" ? 0 : 1;
      return an - bn;
    });
    for (let i = 0; i < order.length; i += 1) {
      const h = order[i];
      const c = hallCenterWorld(h);
      const d = Math.hypot(c.x - fromX, c.z - fromZ);
      if (d < CELL * 3) continue;
      const path = findMazePathWorld(fromX, fromZ, c.x, c.z);
      if (!path || path.length < 2) continue;
      // 거리·경로 길이 균형, 너무 가까우면 패널티
      const score =
        path.length + d / CELL + (d < MIN_DRAG ? 40 : 0) + (h.kind === "storage" ? 8 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = { hall: h, path };
      }
    }
    if (best) return best;
    // 최후: 아무 방이든 경로 있는 곳
    for (let i = 0; i < halls.length; i += 1) {
      const h = halls[i];
      const c = hallCenterWorld(h);
      const path = findMazePathWorld(fromX, fromZ, c.x, c.z);
      if (path && path.length >= 2) return { hall: h, path };
    }
    const h = halls[0];
    const goal = hallCenterWorld(h);
    return {
      hall: h,
      path: findMazePathWorld(fromX, fromZ, goal.x, goal.z) || [goal],
    };
  }

  function shuffleDirs(dirs) {
    for (let i = dirs.length - 1; i > 0; i -= 1) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = dirs[i];
      dirs[i] = dirs[j];
      dirs[j] = tmp;
    }
    return dirs;
  }

  function carveInRange(cx, cz, z0, z1) {
    cells[cz][cx] = true;
    const dirs = shuffleDirs([
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]);
    for (let i = 0; i < dirs.length; i += 1) {
      const nx = cx + dirs[i][0];
      const nz = cz + dirs[i][1];
      if (nx <= 0 || nx >= MW - 1) continue;
      if (nz < z0 || nz >= z1) continue;
      if (nz <= 0 && mazeRows > 0) continue; // 전체 맨 앞 행은 입구만
      if (cells[nz][nx]) continue;
      cells[cz + dirs[i][1] / 2][cx + dirs[i][0] / 2] = true;
      carveInRange(nx, nz, z0, z1);
    }
  }

  /** 서로 다른 통로 사이에 가끔 지름길/연결 뚫기 */
  function addExtraConnections(z0, z1) {
    const candidates = [];
    for (let z = Math.max(1, z0); z < z1 - 1; z += 1) {
      for (let x = 1; x < MW - 1; x += 1) {
        if (cells[z][x]) continue;
        const horiz = cells[z][x - 1] && cells[z][x + 1];
        const vert =
          cells[z - 1] &&
          cells[z + 1] &&
          cells[z - 1][x] &&
          cells[z + 1][x];
        if (horiz || vert) candidates.push([x, z]);
      }
    }
    shuffleDirs(candidates);
    const n = Math.max(2, Math.min(candidates.length, (candidates.length * (0.12 + Math.random() * 0.06)) | 0));
    for (let i = 0; i < n; i += 1) {
      const p = candidates[i];
      cells[p[1]][p[0]] = true;
    }
  }

  /** 셀만 깎기 (메시는 remesh / append 쪽에서) */
  function carveMazeSegment() {
    const z0 = mazeRows;
    const z1 = mazeRows + SEG;

    for (let z = z0; z < z1; z += 1) {
      cells[z] = [];
      for (let x = 0; x < MW; x += 1) cells[z][x] = false;
    }

    if (z0 === 0) {
      cells[0][enterX] = true;
      cells[1][enterX] = true;
      carveInRange(enterX, 1, 1, z1 - 1);
    } else {
      const seeds = [];
      for (let x = 1; x < MW - 1; x += 2) {
        if (cells[z0 - 1][x]) {
          cells[z0][x] = true;
          if (z0 + 1 < z1) {
            cells[z0 + 1][x] = true;
            seeds.push(x);
          }
        }
      }
      if (!seeds.length) {
        cells[z0][enterX] = true;
        cells[z0 + 1][enterX] = true;
        seeds.push(enterX);
      }
      shuffleDirs(seeds);
      for (let i = 0; i < seeds.length; i += 1) {
        carveInRange(seeds[i], z0 + 1, z0 + 1, z1 - 1);
      }
    }

    const last = z1 - 1;
    for (let x = 1; x < MW - 1; x += 2) {
      if (cells[last - 1] && cells[last - 1][x]) cells[last][x] = true;
    }
    if (!cells[last][enterX]) {
      cells[last][enterX] = true;
      if (cells[last - 1]) cells[last - 1][enterX] = true;
    }

    addExtraConnections(z0, z1);
    mazeRows = z1;
    return { z0, z1 };
  }

  function buildFakeHideAt(cx, cz) {
    const wx = mazeOriginX + cx * CELL;
    const wz = mazeOriginZ + cz * CELL;
    const open = hideOpenDir(cx, cz) || { dx: 0, dz: 1 };
    const ox = open.dx;
    const oz = open.dz;
    const px = -oz;
    const pz = ox;
    const gap = CELL * HIDE_GAP;
    const side = (CELL - gap) * 0.5;
    const off = (gap + side) * 0.5;
    const alongX = Math.abs(px) > Math.abs(pz);

    // 충돌은 고정(평소 틈새와 동일), 시각만 맥박/입 다물기
    if (alongX) {
      addCollider(wx + px * off, wz, side, CELL * 0.98);
      addCollider(wx - px * off, wz, side, CELL * 0.98);
    } else {
      addCollider(wx, wz + pz * off, CELL * 0.98, side);
      addCollider(wx, wz - pz * off, CELL * 0.98, side);
    }

    const shellMat = tileMat(caveMatBase, Math.max(side, CELL), CAVE_H, wx, wz);
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x141018 });
    shellMat.userData.fakeHideShell = true;
    darkMat.userData.fakeHideDark = true;
    const group = new THREE.Group();
    group.position.set(wx, 0, wz);

    let left;
    let right;
    if (alongX) {
      left = new THREE.Mesh(
        new THREE.BoxGeometry(side, CAVE_H, CELL * 0.98),
        shellMat
      );
      right = new THREE.Mesh(
        new THREE.BoxGeometry(side, CAVE_H, CELL * 0.98),
        shellMat
      );
      left.position.set(px * off, CAVE_H * 0.5, 0);
      right.position.set(-px * off, CAVE_H * 0.5, 0);
    } else {
      left = new THREE.Mesh(
        new THREE.BoxGeometry(CELL * 0.98, CAVE_H, side),
        shellMat
      );
      right = new THREE.Mesh(
        new THREE.BoxGeometry(CELL * 0.98, CAVE_H, side),
        shellMat
      );
      left.position.set(0, CAVE_H * 0.5, pz * off);
      right.position.set(0, CAVE_H * 0.5, -pz * off);
    }
    left.userData.sprayWall = true;
    right.userData.sprayWall = true;

    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.abs(ox) > 0 ? gap : CELL * 0.92,
        0.28,
        Math.abs(oz) > 0 ? gap : CELL * 0.92
      ),
      darkMat
    );
    lip.position.set(0, CAVE_H - 0.35, 0);

    // 조개 속 어두운 바닥감
    const gullet = new THREE.Mesh(
      new THREE.BoxGeometry(
        alongX ? gap * 0.92 : CELL * 0.7,
        0.08,
        alongX ? CELL * 0.7 : gap * 0.92
      ),
      darkMat
    );
    gullet.position.set(0, 0.04, 0);

    group.add(left, right, lip, gullet);
    mazeGroup.add(group);

    fakeHides.push({
      cx,
      cz,
      group,
      left,
      right,
      lip,
      shellMat,
      darkMat,
      alongX,
      px,
      pz,
      baseOff: off,
      side,
      gap,
      phase: Math.random() * Math.PI * 2,
      state: "idle", // idle | snap | crushing
      stateT: 0,
      insideT: 0,
      wasInside: false,
    });
  }

  function heartbeatPulse(t) {
    // 약 66bpm, 작게 두 번 뛰는 심장 리듬
    const cycle = ((t % 0.9) + 0.9) % 0.9;
    let beat = 0;
    if (cycle < 0.1) beat = Math.sin((cycle / 0.1) * Math.PI);
    else if (cycle > 0.18 && cycle < 0.3) {
      beat = 0.55 * Math.sin(((cycle - 0.18) / 0.12) * Math.PI);
    }
    return 1 + beat * 0.038;
  }

  function setFakeHideJaw(fh, close01) {
    // 0=열림(틈새), 1=완전히 다물림
    const t = Math.max(0, Math.min(1, close01));
    const off = fh.baseOff * (1 - t * 0.82);
    if (fh.alongX) {
      fh.left.position.x = fh.px * off;
      fh.right.position.x = -fh.px * off;
    } else {
      fh.left.position.z = fh.pz * off;
      fh.right.position.z = -fh.pz * off;
    }
    if (fh.lip) {
      const g = Math.max(0.08, fh.gap * (1 - t * 0.9));
      fh.lip.scale.set(
        fh.alongX ? g / fh.gap : 1,
        1,
        fh.alongX ? 1 : g / fh.gap
      );
    }
  }

  let clamCrushT = 0;
  const CLAM_CRUSH_SEC = 1.15;
  let clamCrushFh = null;

  function playThumpSound() {
    if (!audioCtx || !masterGain) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    osc.type = "sine";
    osc.frequency.setValueAtTime(70, t0);
    osc.frequency.exponentialRampToValueAtTime(28, t0 + 0.35);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.45 * soundVol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    osc.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.6);
    // 짧은 저역 노이즈 쿵
    const len = Math.floor(audioCtx.sampleRate * 0.18);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      const env = Math.exp(-i / (audioCtx.sampleRate * 0.05));
      data[i] = (Math.random() * 2 - 1) * env * 0.7;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const bp = audioCtx.createBiquadFilter();
    bp.type = "lowpass";
    bp.frequency.value = 140;
    const ng = audioCtx.createGain();
    ng.gain.value = 0.28 * soundVol;
    src.connect(bp);
    bp.connect(ng);
    ng.connect(masterGain);
    src.start(t0);
  }

  function beginClamCrush(fh) {
    if (devMode || clamCrushT > 0 || bitten || isRagdoll()) return;
    endBite({ toss: false });
    cancelBandage();
    breakPaint();
    clamCrushT = CLAM_CRUSH_SEC;
    clamCrushFh = fh;
    fh.state = "crushing";
    fh.stateT = 0;
    playThumpSound();
    playerMesh.visible = true;
    playerMesh.position.set(pos.x, Math.max(0.1, pos.y - EYE_H * 0.7), pos.z);
    playerMesh.rotation.set(1.2, yaw + Math.PI, 0.2);
    playerMesh.scale.set(1, 1, 1);
  }

  function cancelClamCrushSafe() {
    if (clamCrushT <= 0) return;
    clamCrushT = 0;
    if (clamCrushFh) {
      clamCrushFh.state = "idle";
      clamCrushFh.stateT = 0;
      clamCrushFh.insideT = 0;
      setFakeHideJaw(clamCrushFh, 0);
      clamCrushFh = null;
    }
    playerMesh.visible = false;
    playerMesh.scale.set(1, 1, 1);
    playerMesh.rotation.set(0, yaw + Math.PI, 0);
  }

  function updateClamCrush(dt) {
    if (clamCrushT <= 0) return;
    clamCrushT -= dt;
    const u = 1 - Math.max(0, clamCrushT) / CLAM_CRUSH_SEC;
    if (clamCrushFh) setFakeHideJaw(clamCrushFh, Math.min(1, u * 1.4));
    // 찌부짜부
    const squash = Math.max(0.06, 1 - u * 0.94);
    const bulge = 1 + u * 0.85;
    playerMesh.visible = true;
    playerMesh.scale.set(bulge, squash, bulge);
    playerMesh.position.set(
      pos.x,
      Math.max(0.05, pos.y - EYE_H * (0.55 + u * 0.4)),
      pos.z
    );
    if (clamCrushT <= 0) {
      clamCrushT = 0;
      if (clamCrushFh) {
        clamCrushFh.state = "idle";
        clamCrushFh.stateT = 0;
        clamCrushFh.insideT = 0;
        setFakeHideJaw(clamCrushFh, 0);
        clamCrushFh = null;
      }
      playerMesh.visible = false;
      playerMesh.scale.set(1, 1, 1);
      playerMesh.rotation.set(0, yaw + Math.PI, 0);
      respawnPlayerOnDeath();
    }
  }

  function updateFakeHides(dt) {
    if (clamCrushT > 0) {
      // 죽는 중엔 해당 조개만 다물고 맥박 정지
      for (let i = 0; i < fakeHides.length; i += 1) {
        const fh = fakeHides[i];
        if (fh === clamCrushFh) continue;
        fh.phase += dt;
        const pulse = heartbeatPulse(fh.phase);
        fh.group.scale.set(pulse, pulse, pulse);
        if (fh.state === "snap") {
          fh.stateT += dt;
          const close = fh.stateT < 0.22 ? fh.stateT / 0.22 : Math.max(0, 1 - (fh.stateT - 0.22) / 0.45);
          setFakeHideJaw(fh, close);
          if (fh.stateT > 0.7) {
            fh.state = "idle";
            fh.stateT = 0;
            setFakeHideJaw(fh, 0);
          }
        }
      }
      updateClamCrush(dt);
      return;
    }

    const pc = cellFromWorld(pos.x, pos.z);
    for (let i = 0; i < fakeHides.length; i += 1) {
      const fh = fakeHides[i];
      fh.phase += dt;
      const inside =
        !isInLobby() &&
        !bitten &&
        !isRagdoll() &&
        pc.cx === fh.cx &&
        pc.cz === fh.cz;

      if (fh.state === "snap") {
        fh.stateT += dt;
        const close =
          fh.stateT < 0.22
            ? fh.stateT / 0.22
            : Math.max(0, 1 - (fh.stateT - 0.22) / 0.45);
        setFakeHideJaw(fh, close);
        const pulse = heartbeatPulse(fh.phase);
        fh.group.scale.set(pulse, pulse, pulse);
        if (fh.stateT > 0.7) {
          fh.state = "idle";
          fh.stateT = 0;
          setFakeHideJaw(fh, 0);
        }
        fh.wasInside = inside;
        if (inside) fh.insideT += dt;
        else fh.insideT = 0;
        continue;
      }

      // idle: 심장박동
      const pulse = heartbeatPulse(fh.phase);
      fh.group.scale.set(pulse, pulse, pulse);
      setFakeHideJaw(fh, 0);

      if (inside) {
        fh.insideT += dt;
        if (fh.insideT >= FAKE_HIDE_KILL_SEC) {
          if (devMode) {
            // 개발: 죽지 않고 입 다무는 연출만
            fh.state = "snap";
            fh.stateT = 0;
            fh.insideT = 0;
          } else {
            beginClamCrush(fh);
          }
          continue;
        }
      } else if (fh.wasInside && fh.insideT > 0.05 && fh.insideT < FAKE_HIDE_KILL_SEC) {
        // 1초 전에 탈출 → 입 딱 다무는 연출
        fh.state = "snap";
        fh.stateT = 0;
        fh.insideT = 0;
      } else {
        fh.insideT = 0;
      }
      fh.wasInside = inside;
    }
  }

  function buildMazeMeshesRange(z0, z1) {
    const segDepth = (z1 - z0) * CELL;
    const segCenterZ = mazeOriginZ + (z0 + (z1 - z0) * 0.5 - 0.5) * CELL;

    const caveFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(mazeW, segDepth),
      tileMat(caveFloorMatBase, mazeW, segDepth, 0, segCenterZ)
    );
    caveFloor.rotation.x = -Math.PI / 2;
    caveFloor.position.set(0, 0.02, segCenterZ);
    caveFloor.userData.sprayFloor = true;
    mazeGroup.add(caveFloor);

    // 복도 천장: 큰 방·굴 영역은 비움 (굴은 낮은 천장 따로)
    for (let cz = z0; cz < z1; cz += 1) {
      for (let cx = 0; cx < MW; cx += 1) {
        if (!cells[cz] || !cells[cz][cx]) continue;
        if (hallAt(cx, cz) || isHoleCell(cx, cz)) continue;
        const wx = mazeOriginX + cx * CELL;
        const wz = mazeOriginZ + cz * CELL;
        const ceilTile = new THREE.Mesh(
          new THREE.PlaneGeometry(CELL, CELL),
          tileMat(caveFloorMatBase, CELL, CELL, wx, wz)
        );
        ceilTile.rotation.x = Math.PI / 2;
        ceilTile.position.set(wx, CAVE_H, wz);
        markDevCeil(ceilTile);
        mazeGroup.add(ceilTile);
      }
    }

    for (let cz = z0; cz < z1; cz += 1) {
      for (let cx = 0; cx < MW; cx += 1) {
        if (cells[cz][cx]) continue;
        const wx = mazeOriginX + cx * CELL;
        const wz = mazeOriginZ + cz * CELL;
        const h = hallAt(cx, cz) ? HALL_H : CAVE_H;
        mazeWall(WALL_S, h, WALL_S, wx, h * 0.5, wz);
      }
    }

    // 틈새: 보라/바닥 표시 없음. 양옆 벽으로 폭만 좁힘 / 가짜는 조개 그룹
    for (let cz = z0; cz < z1; cz += 1) {
      for (let cx = 0; cx < MW; cx += 1) {
        if (!isHideCell(cx, cz)) continue;
        if (isFakeHideCell(cx, cz)) {
          buildFakeHideAt(cx, cz);
          continue;
        }
        const wx = mazeOriginX + cx * CELL;
        const wz = mazeOriginZ + cz * CELL;
        const open = hideOpenDir(cx, cz) || { dx: 0, dz: 1 };
        const ox = open.dx;
        const oz = open.dz;
        const px = -oz;
        const pz = ox;
        const gap = CELL * HIDE_GAP;
        const side = (CELL - gap) * 0.5;
        const off = (gap + side) * 0.5;
        if (Math.abs(px) > Math.abs(pz)) {
          mazeWall(side, CAVE_H, CELL * 0.98, wx + px * off, CAVE_H * 0.5, wz);
          mazeWall(side, CAVE_H, CELL * 0.98, wx - px * off, CAVE_H * 0.5, wz);
        } else {
          mazeWall(CELL * 0.98, CAVE_H, side, wx, CAVE_H * 0.5, wz + pz * off);
          mazeWall(CELL * 0.98, CAVE_H, side, wx, CAVE_H * 0.5, wz - pz * off);
        }
        const lip = new THREE.Mesh(
          new THREE.BoxGeometry(
            Math.abs(ox) > 0 ? gap : CELL * 0.92,
            0.28,
            Math.abs(oz) > 0 ? gap : CELL * 0.92
          ),
          new THREE.MeshLambertMaterial({ color: 0x121018 })
        );
        lip.position.set(wx, CAVE_H - 0.35, wz);
        mazeGroup.add(lip);
      }
    }

    // 굴: 틈새처럼 양옆 좁힘 + 천장이 많이 내려와 웅크리기 필수
    const holeCeilMat = tileMat(caveMatBase, CELL, CAVE_H, 0, 0);
    const holeLipMat = new THREE.MeshLambertMaterial({ color: 0x121018 });
    for (let cz = z0; cz < z1; cz += 1) {
      for (let cx = 0; cx < MW; cx += 1) {
        if (!isHoleCell(cx, cz)) continue;
        const dir = holeDir(cx, cz) || { dx: 0, dz: 1 };
        const wx = mazeOriginX + cx * CELL;
        const wz = mazeOriginZ + cz * CELL;
        const ox = dir.dx;
        const oz = dir.dz;
        const px = -oz;
        const pz = ox;
        const gap = CELL * HIDE_GAP;
        const side = (CELL - gap) * 0.5;
        const off = (gap + side) * 0.5;
        // 양옆 좁힘 (틈새와 동일)
        if (Math.abs(px) > Math.abs(pz)) {
          mazeWall(side, CAVE_H, CELL * 0.98, wx + px * off, CAVE_H * 0.5, wz);
          mazeWall(side, CAVE_H, CELL * 0.98, wx - px * off, CAVE_H * 0.5, wz);
        } else {
          mazeWall(CELL * 0.98, CAVE_H, side, wx, CAVE_H * 0.5, wz + pz * off);
          mazeWall(CELL * 0.98, CAVE_H, side, wx, CAVE_H * 0.5, wz - pz * off);
        }
        // 낮은 천장 (서서 못 지나감 — 충돌은 holeBlocksPlayerAt)
        const ceilH = Math.max(0.35, CAVE_H - HOLE_PASS_Y);
        const lowCeil = new THREE.Mesh(
          new THREE.BoxGeometry(CELL * 0.98, ceilH, CELL * 0.98),
          holeCeilMat
        );
        lowCeil.position.set(wx, HOLE_PASS_Y + ceilH * 0.5, wz);
        lowCeil.userData.sprayWall = true;
        markDevCeil(lowCeil);
        mazeGroup.add(lowCeil);
        // 입구 쪽 어두운 턱 (천장 내려온 느낌)
        const lip = new THREE.Mesh(
          new THREE.BoxGeometry(
            Math.abs(ox) > 0 ? gap : CELL * 0.92,
            0.22,
            Math.abs(oz) > 0 ? gap : CELL * 0.92
          ),
          holeLipMat
        );
        lip.position.set(wx, HOLE_PASS_Y - 0.05, wz);
        mazeGroup.add(lip);
      }
    }

    const pl = new THREE.PointLight(0xff6a3a, 0.35, 16);
    pl.position.set(0, 2.1, segCenterZ);
    mazeGroup.add(pl);
    if (((z0 / SEG) | 0) % 2 === 0) {
      const cold = new THREE.PointLight(0x334455, 0.14, 12);
      cold.position.set(CELL * 2, 1.4, segCenterZ + CELL * 3);
      mazeGroup.add(cold);
    }
  }

  function makeSmallEggShellMat() {
    return new THREE.MeshLambertMaterial({
      color: 0xc8e878,
      emissive: 0x2a4010,
      emissiveIntensity: 0.2,
    });
  }

  function makeWholeSmallEgg() {
    const g = new THREE.Group();
    const mat = makeSmallEggShellMat();
    const egg = new THREE.Mesh(
      new THREE.SphereGeometry(SMALL_EGG_R, 14, 12),
      mat
    );
    egg.position.y = SMALL_EGG_R * 0.95;
    egg.scale.set(1, 1.2, 1);
    g.add(egg);
    return g;
  }

  function makeBrokenSmallEgg() {
    const g = new THREE.Group();
    const mat = makeSmallEggShellMat();
    // 반구 껍질 두 조각이 벌어진 모습
    const shellGeo = new THREE.SphereGeometry(
      SMALL_EGG_R,
      12,
      10,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.55
    );
    const a = new THREE.Mesh(shellGeo, mat);
    a.position.set(-0.22, SMALL_EGG_R * 0.25, 0.05);
    a.rotation.z = 0.85;
    a.rotation.y = -0.4;
    const b = new THREE.Mesh(shellGeo, mat);
    b.position.set(0.24, SMALL_EGG_R * 0.2, -0.06);
    b.rotation.z = -0.9;
    b.rotation.y = 0.55;
    // 바닥에 조각
    const chip = new THREE.Mesh(
      new THREE.SphereGeometry(SMALL_EGG_R * 0.28, 8, 6),
      mat
    );
    chip.position.set(0.05, SMALL_EGG_R * 0.12, 0.28);
    chip.scale.set(1, 0.45, 0.8);
    g.add(a, b, chip);
    g.visible = false;
    return g;
  }

  function addSmallEgg(hall, x, z, opts) {
    const whole = makeWholeSmallEgg();
    const broken = makeBrokenSmallEgg();
    whole.position.set(x, 0, z);
    broken.position.set(x, 0, z);
    mazeGroup.add(whole);
    mazeGroup.add(broken);
    const awaitTrigger = !!(opts && opts.awaitTrigger);
    smallEggs.push({
      hall,
      x,
      z,
      whole,
      broken,
      hatched: false,
      awaitTrigger,
      // 일반: 알마다 랜덤 5~13초 / 저장고: 코인 먹기 전엔 대기
      timer: awaitTrigger ? 9999 : 5 + Math.random() * 8,
    });
  }

  function placeEggsInHall(h, count, opts) {
    const used = [];
    let placed = 0;
    const spanX = h.x1 - h.x0 + 1;
    const spanZ = h.z1 - h.z0 + 1;
    const innerX = Math.max(1, spanX - 4);
    const innerZ = Math.max(1, spanZ - 4);
    for (let t = 0; t < count * 40 && placed < count; t += 1) {
      const ix = h.x0 + 2 + ((Math.random() * innerX) | 0);
      const iz = h.z0 + 2 + ((Math.random() * innerZ) | 0);
      if (!cells[iz] || !cells[iz][ix]) continue;
      const p = worldFromCell(ix, iz);
      let clash = false;
      for (let u = 0; u < used.length; u += 1) {
        if (Math.hypot(used[u].x - p.x, used[u].z - p.z) < 1.6) {
          clash = true;
          break;
        }
      }
      if (clash) continue;
      used.push({ x: p.x, z: p.z });
      addSmallEgg(h, p.x, p.z, opts);
      placed += 1;
    }
  }

  function buildHallMeshes() {
    smallEggs.length = 0;

    for (let i = 0; i < halls.length; i += 1) {
      const h = halls[i];
      const w = (h.x1 - h.x0 + 1) * CELL;
      const d = (h.z1 - h.z0 + 1) * CELL;
      const cx = mazeOriginX + ((h.x0 + h.x1) * 0.5) * CELL;
      const cz = mazeOriginZ + ((h.z0 + h.z1) * 0.5) * CELL;

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.04, d - 0.04),
        tileMat(caveFloorMatBase, w, d, cx, cz)
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(cx, 0.03, cz);
      floor.userData.sprayFloor = true;
      mazeGroup.add(floor);

      const ceil = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.04, d - 0.04),
        tileMat(caveFloorMatBase, w, d, cx, cz)
      );
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(cx, HALL_H, cz);
      markDevCeil(ceil);
      mazeGroup.add(ceil);

      const lampCol = h.kind === "storage" ? 0xb088ff : 0xfff0dd;
      const lamp = new THREE.PointLight(lampCol, 0.55, Math.max(w, d) * 1.2);
      lamp.position.set(cx, HALL_H - 1.2, cz);
      mazeGroup.add(lamp);

      if (h.kind === "storage") {
        // 저장고: 미니웜 알 10개 (코인 먹기 전엔 부화 안 함)
        placeEggsInHall(h, STORAGE_EGG_COUNT, { awaitTrigger: true });
        continue;
      }

      // 일반 큰방: 가운데에 알 클러스터
      const center = hallCenterWorld(h);
      const clusterN = 2 + ((Math.random() * 2) | 0);
      const offsets = [
        [0, 0],
        [0.75, 0.15],
        [0.25, 0.85],
        [-0.55, 0.45],
        [0.5, -0.55],
        [-0.35, -0.7],
        [0.9, 0.55],
        [-0.8, 0.1],
        [0.1, 1.0],
      ];
      let placed = 0;
      const need = clusterN * 3;
      for (let e = 0; e < offsets.length && placed < need; e += 1) {
        const jitter = (Math.random() - 0.5) * 0.2;
        addSmallEgg(
          h,
          center.x + offsets[e][0] + jitter,
          center.z + offsets[e][1] + jitter
        );
        placed += 1;
      }
    }
  }

  function remeshEntireMaze() {
    fakeHides.length = 0;
    while (mazeGroup.children.length) {
      const m = mazeGroup.children[0];
      mazeGroup.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    colliders.length = roomColliderCount;
    smallEggs.length = 0;
    clearMiniWorms();
    for (let z0 = 0; z0 < mazeRows; z0 += SEG) {
      const z1 = Math.min(mazeRows, z0 + SEG);
      buildMazeMeshesRange(z0, z1);
    }
    buildHallMeshes();
    syncHideDetectorVisual();
  }

  function appendMazeSegment() {
    const range = carveMazeSegment();
    buildMazeMeshesRange(range.z0, range.z1);
  }

  // 입구는 위에서 방 재질 인방으로 처리 (흙 프레임 없음)

  function rebuildMaze() {
    clearMaze();
    for (let i = 0; i < MAZE_START_SEGS; i += 1) {
      carveMazeSegment();
    }
    placeBigHalls();
    placeHideSpots();
    placeHoles();
    remeshEntireMaze();
  }

  function ensureMazeAhead(playerZ) {
    while (playerZ > HALF + (mazeRows - 10) * CELL) {
      appendMazeSegment();
      if (mazeRows > 900) break;
    }
  }

  function collideMove(nx, nz) {
    const r = PLAYER_R;
    for (let i = 0; i < colliders.length; i += 1) {
      const c = colliders[i];
      const nearX = Math.max(c.minX, Math.min(nx, c.maxX));
      const nearZ = Math.max(c.minZ, Math.min(nz, c.maxZ));
      let dx = nx - nearX;
      let dz = nz - nearZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= r * r) continue;
      if (distSq < 1e-8) {
        const left = nx - c.minX;
        const right = c.maxX - nx;
        const near = nz - c.minZ;
        const far = c.maxZ - nz;
        const m = Math.min(left, right, near, far);
        if (m === left) nx = c.minX - r;
        else if (m === right) nx = c.maxX + r;
        else if (m === near) nz = c.minZ - r;
        else nz = c.maxZ + r;
        continue;
      }
      const dist = Math.sqrt(distSq);
      const push = (r - dist) / dist;
      nx += dx * push;
      nz += dz * push;
    }
    return { x: nx, z: nz };
  }

  // ---- 1인칭 플레이어 ----
  const EYE_H = 1.6;
  const CROUCH_EYE_H = 1.05;
  const LEGLESS_EYE_H = 0.42;
  const pos = { x: 0, y: EYE_H, z: 0 };
  let yaw = Math.PI; // 동굴 입구(+Z)를 바라봄
  let pitch = 0;
  const PITCH_LIM = Math.PI * 0.45;

  const keys = Object.create(null);
  let rmbDown = false;
  let lastMX = 0;
  let lastMY = 0;

  const LOOK_SENS_BASE = 0.005;
  let lookSens = LOOK_SENS_BASE;
  let soundVol = 1;
  let shakeEnabled = true;
  let shiftToggleEnabled = false;
  let crouchToggled = false;
  const SETTINGS_KEY = "jaea_settings_v2";
  const UI_DEFAULTS = {
    showHelp: true,
    showRadar: true,
    showFx: true,
  };
  let uiSettings = { ...UI_DEFAULTS };
  const SHAKE_START_DIST = 9;
  const SHAKE_FULL_DIST = 2.2;
  const SHAKE_MAX_AMP = 0.07;
  const MOVE_SPEED = 5.5;
  const CROUCH_SPEED_MUL = 2 / 3;
  const BOOTS_SPEED_MUL = 1.38;
  const PLAYER_R = 0.35;
  const SPAWN = { x: 0, y: EYE_H, z: 0, yaw: Math.PI, pitch: 0 };
  let playerInvulnT = 0;

  const MAZE_RESET_SEC = 600;
  let mazeTimer = MAZE_RESET_SEC;
  let wormBalance = 1; // 초보자 자금
  let restrictionBalance = 0;
  let devMode = false;
  const DEV_MONEY = 999999;

  function markDevCeil(mesh) {
    if (!mesh) return;
    mesh.userData.devCeil = true;
    // 개발 모드에서만 숨김 — 평소엔 항상 보임
    mesh.visible = devMode ? false : true;
  }

  function syncDevCeilings() {
    const show = !devMode;
    scene.traverse((obj) => {
      if (obj && obj.userData && obj.userData.devCeil) {
        obj.visible = show;
      }
    });
  }

  let restrictionCoinUnlocked = false;
  const ownedGame = Object.create(null);
  const itemStock = Object.create(null);
  const CONSUMABLE_ITEMS = { bait: true, bandage: true, shovel: true };
  const MAX_EQUIP = 3;
  const equippedList = [];
  const SKILL_KEYCODES = ["Digit1", "Digit2", "Digit3"];
  let flashlightOn = false;
  let detectorOn = false;
  let bootsOn = false;
  let compassOn = false;
  let magnetOn = false;
  let paintOn = false;
  let bandageHold = 0;
  const BANDAGE_SEC = 5;
  const paintTintEl = document.getElementById("paint-tint");
  const activeBaits = [];
  const BAIT_HEAR = 16;
  const BAIT_LISTEN_NEED = 5;
  const baitRoot = new THREE.Group();
  scene.add(baitRoot);
  let sprayKind = "arrow";
  let sprayDir = 0;
  let sprayFreehandOn = false;
  let lastSprayStroke = null;
  const SPRAY_FREE_GAP = 0.045;
  const SPRAY_BRUSH_R = 0.042;
  const sprayTexCache = Object.create(null);
  let sprayStrokeMat = null;
  let shovelMode = false;
  let shovelClickTimer = null;
  const shovelOutlineGroup = new THREE.Group();
  scene.add(shovelOutlineGroup);
  const digDust = [];
  const shovelOutlineMat = new THREE.LineBasicMaterial({
    color: 0xffe14a,
    depthTest: true,
    transparent: true,
    opacity: 0.95,
  });
  const shovelOutlineFocusMat = new THREE.LineBasicMaterial({
    color: 0xfff59a,
    depthTest: true,
    transparent: true,
    opacity: 1,
  });
  const _strokeDir = new THREE.Vector3();
  const _strokeY = new THREE.Vector3(0, 1, 0);
  const _strokeMid = new THREE.Vector3();
  let compassLevel = 0;
  const compassGaugeEl = document.getElementById("compass-gauge");
  const compassFillEl = document.getElementById("compass-gauge-fill");
  const sprayRaycaster = new THREE.Raycaster();
  const sprayRayOrigin = new THREE.Vector3();
  const sprayRayDir = new THREE.Vector3();
  const sprayHitNormal = new THREE.Vector3();
  const sprayLookTarget = new THREE.Vector3();
  let detectorBeepAcc = 0;
  const radarEl = document.getElementById("detector-radar");
  const bootsTintEl = document.getElementById("boots-tint");
  const DETECT_RANGE = 18;
  const flashLight = new THREE.SpotLight(0xfff5dd, 0, 28, 0.42, 0.45, 1.2);
  flashLight.position.set(0, 0, 0);
  flashLight.target.position.set(0, 0, -1);
  camera.add(flashLight);
  camera.add(flashLight.target);
  const flashCore = new THREE.PointLight(0xfff0c8, 0, 10, 2);
  flashCore.position.set(0, 0, -0.15);
  camera.add(flashCore);

  scene.add(camera);

  // ---- 플레이어 메시: UI와 같은 네모 사람 (파츠 사이 틈) ----
  function makePlayerMonsterMesh() {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xd0d0d0, fog: false });
    const gap = 0.05;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), mat);
    head.position.y = 1.52;
    head.name = "head";
    g.add(head);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), mat);
    torso.position.y = 0.95;
    torso.name = "torso";
    g.add(torso);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.2), mat);
    armL.position.set(-(0.26 + gap + 0.1), 0.95, 0);
    armL.name = "leftArm";
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.2), mat);
    armR.position.set(0.26 + gap + 0.1, 0.95, 0);
    armR.name = "rightArm";
    g.add(armL, armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.22), mat);
    legL.position.set(-(0.11 + gap * 0.5), 0.29, 0);
    legL.name = "leftLeg";
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.22), mat);
    legR.position.set(0.11 + gap * 0.5, 0.29, 0);
    legR.name = "rightLeg";
    g.add(legL, legR);

    return g;
  }

  const playerMesh = makePlayerMonsterMesh();
  playerMesh.visible = false;
  scene.add(playerMesh);

  let ragdollT = 0;
  let ragVelX = 0;
  let ragVelY = 0;
  let ragVelZ = 0;
  let ragSpinX = 0;
  let ragSpinZ = 0;
  const RAGDOLL_SEC = 1;
  const RAG_CAM_DIST = 4.2;
  const BITE_CAM_DIST = 4.0;

  function isRagdoll() {
    return ragdollT > 0;
  }

  function isCrouching() {
    if (bitten || isRagdoll() || paintOn || clamCrushT > 0) {
      crouchToggled = false;
      return false;
    }
    if (shiftToggleEnabled) return !!crouchToggled;
    return !!(keys.ShiftLeft || keys.ShiftRight);
  }

  function startTossRagdoll(hall) {
    const c = hallCenterWorld(hall);
    const dx = c.x - pos.x;
    const dz = c.z - pos.z;
    const len = Math.hypot(dx, dz) || 1;
    // 중앙을 향해 던지듯
    const throwSpd = 16 + Math.min(8, len * 0.35);
    ragVelX = (dx / len) * throwSpd;
    ragVelZ = (dz / len) * throwSpd;
    ragVelY = 7.5;
    ragdollT = RAGDOLL_SEC;
    ragSpinX = 3.5 + Math.random() * 2;
    ragSpinZ = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random());
    // 잡힌 자세처럼 기울인 채 시작
    playerMesh.rotation.set(1.15, yaw + Math.PI, 0.45);
    playerMesh.scale.set(1, 1, 1);
    playerMesh.visible = true;
  }

  function updateRagdoll(dt) {
    if (ragdollT <= 0) return;
    ragdollT -= dt;

    ragVelY -= 22 * dt;
    let nx = pos.x + ragVelX * dt;
    let nz = pos.z + ragVelZ * dt;
    pos.y += ragVelY * dt;

    const hitX = collideMove(nx, pos.z);
    pos.x = hitX.x;
    if (Math.abs(hitX.x - nx) > 0.001) ragVelX *= -0.35;
    const hitZ = collideMove(pos.x, nz);
    pos.z = hitZ.z;
    if (Math.abs(hitZ.z - nz) > 0.001) ragVelZ *= -0.35;

    if (pos.y <= EYE_H) {
      pos.y = EYE_H;
      if (ragVelY < 0) ragVelY *= -0.28;
      ragVelX *= 0.82;
      ragVelZ *= 0.82;
    }

    playerMesh.rotation.x += ragSpinX * dt;
    playerMesh.rotation.z += ragSpinZ * dt;
    playerMesh.position.set(pos.x, Math.max(0, pos.y - EYE_H * 0.55), pos.z);
    playerMesh.visible = true;

    if (ragdollT <= 0) {
      ragdollT = 0;
      ragVelX = 0;
      ragVelY = 0;
      ragVelZ = 0;
      pos.y = EYE_H;
      playerMesh.visible = false;
      playerMesh.scale.set(1, 1, 1);
      playerMesh.rotation.set(0, yaw + Math.PI, 0);
    }
  }

  function nearestWormDist() {
    let best = Infinity;
    for (let i = 0; i < worms.length; i += 1) {
      const w = worms[i];
      if (!w || !w.active) continue;
      const d = Math.hypot(pos.x - w.hx, pos.z - w.hz);
      if (d < best) best = d;
    }
    return best;
  }

  function applyCameraShake() {
    if (!shakeEnabled || bitten || isRagdoll() || isInLobby()) return;
    const d = nearestWormDist();
    if (!(d < SHAKE_START_DIST)) return;
    let t =
      (SHAKE_START_DIST - d) / Math.max(0.01, SHAKE_START_DIST - SHAKE_FULL_DIST);
    t = Math.max(0, Math.min(1, t));
    t *= t;
    const amp = SHAKE_MAX_AMP * t;
    const now = performance.now() * 0.001;
    camera.position.x += Math.sin(now * 27.3) * amp;
    camera.position.y += Math.sin(now * 21.7 + 1.1) * amp * 0.65;
    camera.position.z += Math.cos(now * 24.1) * amp * 0.45;
    camera.rotation.z = Math.sin(now * 18.5) * amp * 0.4;
  }

  function updatePlayerCamera() {
    if (clamCrushT > 0) {
      playerMesh.visible = true;
      const bodyY = Math.max(0.15, pos.y - EYE_H * 0.35);
      camera.position.set(
        pos.x + Math.sin(yaw) * 3.2,
        bodyY + 1.4,
        pos.z + Math.cos(yaw) * 3.2
      );
      camera.lookAt(pos.x, bodyY, pos.z);
      return;
    }
    if (isRagdoll() || bitten) {
      // 3인칭: 물림/래그돌
      playerMesh.visible = true;
      if (bitten && biteWorm) {
        playerMesh.scale.set(1, 1, 1);
        const lie = isLegless() ? 1.25 : 0.35;
        playerMesh.position.set(
          pos.x,
          Math.max(0, pos.y - EYE_H * (isLegless() ? 0.35 : 0.92)),
          pos.z
        );
        playerMesh.rotation.set(lie, biteWorm.yaw + Math.PI, 0.15);
      } else if (isRagdoll()) {
        playerMesh.position.set(pos.x, Math.max(0, pos.y - EYE_H * 0.55), pos.z);
      }
      const bodyY = Math.max(0.25, pos.y - EYE_H * 0.2);
      const dist = isRagdoll() ? RAG_CAM_DIST : BITE_CAM_DIST;
      const backX = Math.sin(yaw) * dist;
      const backZ = Math.cos(yaw) * dist;
      camera.position.set(pos.x + backX, bodyY + 1.6, pos.z + backZ);
      camera.lookAt(pos.x, bodyY, pos.z);
      applyCameraShake();
      return;
    }
    playerMesh.visible = false;
    camera.position.set(pos.x, pos.y, pos.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.rotation.z = 0;
    applyCameraShake();
  }

  function isInMaze() {
    return pos.z > HALF - 0.15;
  }

  function isInLobby() {
    return !isInMaze();
  }

  function clearEffectOf(id) {
    if (id === "flashlight") {
      flashlightOn = false;
      flashLight.intensity = 0;
      flashCore.intensity = 0;
    } else if (id === "detector") {
      detectorOn = false;
      detectorBeepAcc = 0;
      setDetectorRadar(false, 900);
      syncCoinFogVisual();
      syncSprayFogVisual();
      syncHideDetectorVisual();
    } else if (id === "boots") {
      bootsOn = false;
      syncBootsTint();
    } else if (id === "compass") {
      compassOn = false;
      compassLevel = 0;
      setCompassGauge(false, 0);
    } else if (id === "magnet") {
      magnetOn = false;
    } else if (id === "paint") {
      paintOn = false;
      syncPaintTint();
    } else if (id === "bandage") {
      cancelBandage();
    } else if (id === "spray") {
      sprayFreehandOn = false;
      lastSprayStroke = null;
    } else if (id === "shovel") {
      setShovelMode(false);
    }
  }

  function clearItemEffects() {
    clearEffectOf("flashlight");
    clearEffectOf("detector");
    clearEffectOf("boots");
    clearEffectOf("compass");
    clearEffectOf("magnet");
    clearEffectOf("paint");
    clearEffectOf("bandage");
    clearEffectOf("spray");
    clearEffectOf("shovel");
    detectorBeepAcc = 0;
    setDetectorRadar(false, 900);
    syncBootsTint();
    applyCaveFog(fogBlend);
  }

  function isEquipped(id) {
    return equippedList.indexOf(id) >= 0;
  }

  function getSkillList() {
    return equippedList.slice();
  }

  function syncBootsTint() {
    if (!bootsTintEl) return;
    bootsTintEl.classList.toggle("on", bootsOn);
    bootsTintEl.setAttribute("aria-hidden", bootsOn ? "false" : "true");
  }

  function syncPaintTint() {
    if (!paintTintEl) return;
    paintTintEl.classList.toggle("on", paintOn);
    paintTintEl.setAttribute("aria-hidden", paintOn ? "false" : "true");
  }

  function hasHealableLimb() {
    const order = ["rightLeg", "leftLeg", "rightArm", "leftArm"];
    for (let i = 0; i < order.length; i += 1) {
      if (!playerLimbs[order[i]]) return true;
    }
    return false;
  }

  function restoreOneLimb() {
    const order = ["rightLeg", "leftLeg", "rightArm", "leftArm"];
    for (let i = 0; i < order.length; i += 1) {
      const id = order[i];
      if (!playerLimbs[id]) {
        playerLimbs[id] = true;
        syncLimbUi();
        syncPlayerMeshLimbs();
        if (window.__refreshSkillUi) window.__refreshSkillUi();
        return true;
      }
    }
    return false;
  }

  function cancelBandage() {
    bandageHold = 0;
  }

  function updateBandage(dt) {
    const slot = equippedList.indexOf("bandage");
    const holding =
      slot >= 0 &&
      canUseSkillSlot(slot) &&
      !!keys[SKILL_KEYCODES[slot]] &&
      isEquipped("bandage") &&
      (itemStock.bandage || 0) > 0 &&
      isInMaze() &&
      !bitten &&
      !isRagdoll() &&
      hasHealableLimb();

    if (!holding) {
      if (bandageHold > 0) cancelBandage();
      return;
    }

    bandageHold += dt;
    if (bandageHold >= BANDAGE_SEC) {
      bandageHold = 0;
      restoreOneLimb();
      consumeItem("bandage");
    }
  }

  function togglePaint() {
    if (bitten || isRagdoll()) return;
    paintOn = !paintOn;
    if (paintOn) {
      bootsOn = false;
      syncBootsTint();
    }
    syncPaintTint();
  }

  function breakPaint() {
    if (!paintOn) return;
    paintOn = false;
    syncPaintTint();
  }

  function makeBaitMesh() {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xc4a35a, fog: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.45), mat);
    body.position.y = 0.2;
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshLambertMaterial({ color: 0x8b5a2b, fog: true })
    );
    tip.position.set(0, 0.28, 0.28);
    g.add(body, tip);
    return g;
  }

  function removeBait(bait) {
    if (!bait) return;
    if (bait.mesh && bait.mesh.parent) bait.mesh.parent.remove(bait.mesh);
    const ix = activeBaits.indexOf(bait);
    if (ix >= 0) activeBaits.splice(ix, 1);
  }

  function clearBait() {
    while (activeBaits.length) {
      removeBait(activeBaits[0]);
    }
    for (let i = 0; i < worms.length; i += 1) {
      worms[i].baitListenT = 0;
      worms[i].baitTarget = null;
    }
  }

  function playEggCrackSound() {
    if (!audioCtx || !masterGain) return;
    const t0 = audioCtx.currentTime;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const env = Math.exp(-i / (audioCtx.sampleRate * 0.04));
      data[i] = (Math.random() * 2 - 1) * env * (i < 80 ? 1.2 : 0.7);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 1.2;
    const g = audioCtx.createGain();
    g.gain.value = 0.11 * soundVol;
    src.connect(bp);
    bp.connect(g);
    g.connect(masterGain);
    src.start(t0);
  }

  function throwBait() {
    if (bitten || isRagdoll()) return;
    if ((itemStock.bait || 0) < 1) return;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    let x = pos.x + fx * 5.5;
    let z = pos.z + fz * 5.5;
    const hit = collideMove(x, z);
    x = hit.x;
    z = hit.z;
    const mesh = makeBaitMesh();
    mesh.position.set(x, 0, z);
    baitRoot.add(mesh);
    activeBaits.push({
      x,
      z,
      mesh,
      crackT: Math.random() * 0.3,
    });
    consumeItem("bait");
  }

  function consumeItem(id) {
    if (!CONSUMABLE_ITEMS[id]) return false;
    if ((itemStock[id] || 0) < 1) return false;
    itemStock[id] -= 1;
    if (itemStock[id] <= 0) {
      itemStock[id] = 0;
      delete ownedGame[id];
      const idx = equippedList.indexOf(id);
      if (idx >= 0) {
        equippedList.splice(idx, 1);
        clearEffectOf(id);
      }
    }
    if (typeof window.__refreshSkillUi === "function") {
      window.__refreshSkillUi();
    }
    return true;
  }

  function nearestHeardBait(w) {
    if (isInLobby() || !activeBaits.length) return null;
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < activeBaits.length; i += 1) {
      const b = activeBaits[i];
      const dist = Math.hypot(b.x - w.hx, b.z - w.hz);
      if (dist > BAIT_HEAR) continue;
      if (!hasLineOfSight(w.hx, w.hz, b.x, b.z)) continue;
      if (dist < bestD) {
        bestD = dist;
        best = b;
      }
    }
    return best;
  }

  function wormCanHearBait(w) {
    return !!nearestHeardBait(w);
  }

  function updateBait(dt) {
    for (let i = 0; i < activeBaits.length; i += 1) {
      const b = activeBaits[i];
      b.crackT -= dt;
      if (b.crackT <= 0) {
        playEggCrackSound();
        b.crackT = 1;
      }
      if (b.mesh) b.mesh.rotation.y += dt * 1.2;
    }
  }

  /** 부츠 슬롯 키를 누르고 있는 동안만 효과 */
  function updateBoots() {
    const bootsSlot = equippedList.indexOf("boots");
    const holding =
      bootsSlot >= 0 &&
      canUseSkillSlot(bootsSlot) &&
      !!keys[SKILL_KEYCODES[bootsSlot]];
    const want = holding && isInMaze() && !paintOn;
    if (bootsOn !== want) {
      bootsOn = want;
      syncBootsTint();
    }
  }

  function setCompassGauge(on, level) {
    if (!compassGaugeEl || !compassFillEl) return;
    if (on) {
      compassGaugeEl.classList.remove("hidden");
      compassGaugeEl.setAttribute("aria-hidden", "false");
      const pct = Math.max(0, Math.min(1, level)) * 100;
      compassFillEl.style.height = `${pct}%`;
    } else {
      compassGaugeEl.classList.add("hidden");
      compassGaugeEl.setAttribute("aria-hidden", "true");
      compassFillEl.style.height = "0%";
    }
  }

  /** 입구 방향을 볼수록 노란 게이지 상승 */
  function updateCompass(dt) {
    if (!compassOn || !isEquipped("compass") || !isInMaze()) {
      if (compassOn && !isInMaze()) compassOn = false;
      compassLevel = 0;
      setCompassGauge(false, 0);
      return;
    }

    const enter = worldFromCell(enterX, 0);
    const dx = enter.x - pos.x;
    const dz = enter.z - pos.z;
    const len = Math.hypot(dx, dz);
    let target = 0;
    if (len > 0.05) {
      const lx = -Math.sin(yaw);
      const lz = -Math.cos(yaw);
      const align = (lx * dx + lz * dz) / len;
      // 입구 쪽을 볼수록 1에 가까움
      target = Math.max(0, align);
      target = target * target;
    }

    const k = 1 - Math.exp(-dt * 7);
    compassLevel += (target - compassLevel) * k;
    setCompassGauge(true, compassLevel);
  }

  function setDetectorRadar(on, ms) {
    if (!radarEl) return;
    if (on) {
      radarEl.classList.remove("hidden");
      radarEl.setAttribute("aria-hidden", "false");
      radarEl.style.setProperty("--radar-ms", `${Math.max(80, ms | 0)}ms`);
    } else {
      radarEl.classList.add("hidden");
      radarEl.setAttribute("aria-hidden", "true");
    }
  }

  function playDetectorBeep() {
    if (!audioCtx) {
      startBgmEngine();
      if (!audioCtx) return;
    }
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 1180;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.045, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  function nearestWormDist() {
    let nearest = Infinity;
    for (let i = 0; i < worms.length; i += 1) {
      const w = worms[i];
      if (!w.active) continue;
      const d = Math.hypot(pos.x - w.hx, pos.z - w.hz);
      if (d < nearest) nearest = d;
    }
    return nearest;
  }

  function updateDetector(dt) {
    if (!detectorOn || !isEquipped("detector") || !isInMaze()) {
      if (detectorOn && (!isInMaze() || !isEquipped("detector"))) {
        detectorOn = false;
        detectorBeepAcc = 0;
        syncCoinFogVisual();
        syncSprayFogVisual();
        syncHideDetectorVisual();
      }
      setDetectorRadar(false, 900);
      return;
    }

    const nearest = nearestWormDist();
    let interval = 1.2;
    if (isFinite(nearest) && nearest < DETECT_RANGE) {
      const t = 1 - nearest / DETECT_RANGE;
      // 가장 가까운 웜 기준: 멀리 느림 → 가까이 빠름
      interval = 1.2 - t * 1.12; // ~1.2s → ~0.08s
      const ms = interval * 1000;
      setDetectorRadar(true, ms);
      detectorBeepAcc += dt;
      if (detectorBeepAcc >= interval) {
        detectorBeepAcc = 0;
        playDetectorBeep();
      }
    } else {
      // 범위 안 웜 없음: 레이더만 느리게
      setDetectorRadar(true, 1400);
      detectorBeepAcc = 0;
    }
  }

  const timerEl = document.getElementById("maze-timer");
  function updateTimerUi() {
    if (timerEl) timerEl.textContent = String(Math.max(0, Math.ceil(mazeTimer)));
  }
  function syncWormBalanceUi() {
    if (typeof window.__setWormBalance === "function") {
      window.__setWormBalance(wormBalance);
    }
  }
  function syncRestrictionBalanceUi() {
    if (typeof window.__setRestrictionCoinBalance === "function") {
      window.__setRestrictionCoinBalance(
        restrictionBalance,
        restrictionCoinUnlocked
      );
    }
  }
  window.__addWormBalance = (n) => {
    const add = n == null ? 1 : n | 0;
    wormBalance = Math.max(0, wormBalance + add);
    syncWormBalanceUi();
    return wormBalance;
  };
  window.__tryBuyItem = (id, price) => {
    const consumable = !!CONSUMABLE_ITEMS[id];
    if (!consumable && ownedGame[id]) return true;
    if (!devMode) {
      if (wormBalance < price) return false;
      wormBalance -= price;
    }
    if (consumable) {
      itemStock[id] = (itemStock[id] || 0) + 1;
      ownedGame[id] = true;
    } else {
      ownedGame[id] = true;
    }
    syncWormBalanceUi();
    if (typeof window.__refreshSkillUi === "function") {
      window.__refreshSkillUi();
    }
    return true;
  };
  window.__equipItem = (id) => {
    if (CONSUMABLE_ITEMS[id]) {
      if ((itemStock[id] || 0) < 1) return { ok: false, reason: "not_owned" };
    } else if (!ownedGame[id]) {
      return { ok: false, reason: "not_owned" };
    }
    const idx = equippedList.indexOf(id);
    if (idx >= 0) {
      equippedList.splice(idx, 1);
      clearEffectOf(id);
      applyCaveFog(fogBlend);
      syncBootsTint();
      return { ok: true, equipped: false };
    }
    if (equippedList.length >= MAX_EQUIP) {
      return { ok: false, reason: "full" };
    }
    equippedList.push(id);
    syncBootsTint();
    return { ok: true, equipped: true };
  };
  window.__getEquippedItems = () => equippedList.slice();
  window.__getSkills = () => getSkillList();
  window.__hasSkill = (id) =>
    CONSUMABLE_ITEMS[id] ? (itemStock[id] || 0) > 0 : !!ownedGame[id];
  window.__getItemCount = (id) => {
    if (CONSUMABLE_ITEMS[id]) return itemStock[id] || 0;
    return ownedGame[id] ? 1 : 0;
  };
  window.__setSprayStyle = (kind, dir) => {
    sprayKind = kind || "arrow";
    sprayDir = ((dir | 0) % 360 + 360) % 360;
    if (sprayKind !== "circle") {
      sprayFreehandOn = false;
      lastSprayStroke = null;
    }
  };
  window.__setSprayFreehand = (on) => {
    sprayFreehandOn = !!on;
    if (!sprayFreehandOn) lastSprayStroke = null;
  };
  window.__isSprayFreehand = () => !!sprayFreehandOn;
  window.__onLeaveLobby = () => {};
  window.__onEnterLobby = () => {
    clearItemEffects();
    endBite();
  };

  function makeSprayTexture(kind, dirDeg) {
    const cacheKey = kind + ":" + ((dirDeg | 0) % 360);
    if (sprayTexCache[cacheKey]) return sprayTexCache[cacheKey];

    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    function strokeFillPath(fill) {
      ctx.fillStyle = fill || "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 7;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.fill();
      ctx.stroke();
    }

    function drawXArm(ang) {
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-10, -44);
      ctx.lineTo(10, -44);
      ctx.lineTo(10, 44);
      ctx.lineTo(-10, 44);
      ctx.closePath();
      strokeFillPath("#e53935");
      ctx.restore();
    }

    ctx.save();
    ctx.translate(size * 0.5, size * 0.5);
    if (kind === "arrow") {
      ctx.rotate((dirDeg * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -42);
      ctx.lineTo(30, 10);
      ctx.lineTo(14, 10);
      ctx.lineTo(14, 40);
      ctx.lineTo(-14, 40);
      ctx.lineTo(-14, 10);
      ctx.lineTo(-30, 10);
      ctx.closePath();
      strokeFillPath("#ffffff");
    } else if (kind === "stop") {
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fillStyle = "#d32f2f";
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(-22, -8, 44, 16);
      strokeFillPath("#ffffff");
    } else if (kind === "stairs") {
      ctx.beginPath();
      ctx.moveTo(-40, 40);
      ctx.lineTo(-40, 22);
      ctx.lineTo(-18, 22);
      ctx.lineTo(-18, 4);
      ctx.lineTo(4, 4);
      ctx.lineTo(4, -14);
      ctx.lineTo(26, -14);
      ctx.lineTo(26, -32);
      ctx.lineTo(42, -32);
      ctx.lineTo(42, 40);
      ctx.closePath();
      strokeFillPath("#ffffff");
    } else if (kind === "x") {
      drawXArm(Math.PI / 4);
      drawXArm(-Math.PI / 4);
    } else if (kind === "circle") {
      // UI용 동그라미 아이콘 (자유형 모드 표시)
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      strokeFillPath("#ffffff");
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    sprayTexCache[cacheKey] = tex;
    return tex;
  }

  function raycastSpraySurface() {
    sprayRayOrigin.set(pos.x, pos.y, pos.z);
    sprayRayDir
      .set(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      )
      .normalize();
    sprayRaycaster.set(sprayRayOrigin, sprayRayDir);
    sprayRaycaster.far = 8;
    const hits = sprayRaycaster.intersectObjects(mazeGroup.children, false);
    for (let i = 0; i < hits.length; i += 1) {
      const obj = hits[i].object;
      if (!obj) continue;
      if (obj.userData.sprayWall) {
        return { hit: hits[i], onFloor: false };
      }
      if (obj.userData.sprayFloor) {
        return { hit: hits[i], onFloor: true };
      }
    }
    return null;
  }

  function getSprayStrokeMat() {
    if (!sprayStrokeMat) {
      sprayStrokeMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        fog: true,
      });
    }
    sprayStrokeMat.fog = !detectorOn;
    return sprayStrokeMat;
  }

  function sprayDirFromLook() {
    // 플레이어가 보는 수평 방향을 5° 단위로
    const lx = -Math.sin(yaw);
    const lz = -Math.cos(yaw);
    let deg = (Math.atan2(lx, lz) * 180) / Math.PI;
    deg = Math.round(deg / 5) * 5;
    return ((deg % 360) + 360) % 360;
  }

  function placeSprayMarkAt(hit, onFloor, kind, sizeMul) {
    if (!hit) return false;
    if (kind === "circle") return false; // 자유형은 선으로만
    if (onFloor) {
      sprayHitNormal.set(0, 1, 0);
    } else if (hit.face) {
      sprayHitNormal
        .copy(hit.face.normal)
        .transformDirection(hit.object.matrixWorld)
        .normalize();
    } else {
      return false;
    }

    const isX = kind === "x";
    const arrowDir = kind === "arrow" ? sprayDirFromLook() : 0;
    const tex = makeSprayTexture(kind, arrowDir);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: isX ? -8 : -2,
      polygonOffsetUnits: isX ? -8 : -2,
      fog: true,
    });
    const geoSize = 1.15 * (sizeMul || 1);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(geoSize, geoSize), mat);
    const pull = isX ? 0.09 : 0.04;
    mesh.position.copy(hit.point).addScaledVector(sprayHitNormal, pull);
    sprayLookTarget.copy(hit.point).add(sprayHitNormal);
    mesh.lookAt(sprayLookTarget);
    mesh.renderOrder = isX ? 1000 : 10;
    mesh.userData.sprayKind = kind;
    sprayGroup.add(mesh);
    syncSprayFogVisual();
    return true;
  }

  function placeSprayMark() {
    if (!isInMaze() || !isEquipped("spray")) return;
    if (sprayKind === "circle") return;
    const cast = raycastSpraySurface();
    if (!cast) return;
    placeSprayMarkAt(cast.hit, cast.onFloor, sprayKind, 1);
  }

  function addFreehandStrokePoint(point, normal) {
    const mat = getSprayStrokeMat();
    const pull = 0.04;
    if (
      lastSprayStroke &&
      lastSprayStroke.normal.dot(normal) > 0.35
    ) {
      const len = lastSprayStroke.point.distanceTo(point);
      if (len > 1.5) {
        lastSprayStroke = null;
      } else if (len >= SPRAY_FREE_GAP) {
        _strokeDir.subVectors(point, lastSprayStroke.point);
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(SPRAY_BRUSH_R, SPRAY_BRUSH_R, len, 5),
          mat
        );
        _strokeMid.copy(lastSprayStroke.point).add(point).multiplyScalar(0.5);
        _strokeMid.addScaledVector(normal, pull);
        mesh.position.copy(_strokeMid);
        mesh.quaternion.setFromUnitVectors(_strokeY, _strokeDir.normalize());
        mesh.renderOrder = 9;
        mesh.userData.sprayKind = "freehand";
        sprayGroup.add(mesh);
        lastSprayStroke = {
          point: point.clone(),
          normal: normal.clone(),
        };
        return;
      } else {
        return;
      }
    }
    const blob = new THREE.Mesh(new THREE.SphereGeometry(SPRAY_BRUSH_R, 6, 6), mat);
    blob.position.copy(point).addScaledVector(normal, pull);
    blob.renderOrder = 9;
    blob.userData.sprayKind = "freehand";
    sprayGroup.add(blob);
    lastSprayStroke = {
      point: point.clone(),
      normal: normal.clone(),
    };
  }

  function updateSprayFreehand() {
    if (!sprayFreehandOn || sprayKind !== "circle") return;
    if (!isInMaze() || !isEquipped("spray") || bitten || isRagdoll()) {
      sprayFreehandOn = false;
      lastSprayStroke = null;
      return;
    }
    const cast = raycastSpraySurface();
    if (!cast || !cast.hit) {
      lastSprayStroke = null;
      return;
    }
    if (cast.onFloor) {
      sprayHitNormal.set(0, 1, 0);
    } else if (cast.hit.face) {
      sprayHitNormal
        .copy(cast.hit.face.normal)
        .transformDirection(cast.hit.object.matrixWorld)
        .normalize();
    } else {
      lastSprayStroke = null;
      return;
    }
    addFreehandStrokePoint(cast.hit.point, sprayHitNormal);
  }

  function syncSprayFogVisual() {
    const clear = !!detectorOn;
    if (sprayStrokeMat) {
      sprayStrokeMat.fog = !clear;
      sprayStrokeMat.needsUpdate = true;
    }
    for (let i = 0; i < sprayGroup.children.length; i += 1) {
      const m = sprayGroup.children[i];
      if (!m.material) continue;
      m.material.fog = !clear;
      m.material.needsUpdate = true;
    }
  }

  function clearShovelOutlines() {
    while (shovelOutlineGroup.children.length) {
      const m = shovelOutlineGroup.children[0];
      shovelOutlineGroup.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
  }

  function setShovelMode(on) {
    shovelMode = !!on && isEquipped("shovel") && (itemStock.shovel || 0) > 0;
    if (!shovelMode) {
      clearShovelOutlines();
      if (shovelClickTimer) {
        clearTimeout(shovelClickTimer);
        shovelClickTimer = null;
      }
    }
  }

  function addShovelOutlineAt(cx, cz, focus) {
    const p = worldFromCell(cx, cz);
    const h = hallAt(cx, cz) ? HALL_H : CAVE_H;
    const box = new THREE.BoxGeometry(CELL * 0.98, h * 0.98, CELL * 0.98);
    const edges = new THREE.EdgesGeometry(box);
    const line = new THREE.LineSegments(
      edges,
      focus ? shovelOutlineFocusMat : shovelOutlineMat
    );
    line.position.set(p.x, h * 0.5, p.z);
    line.renderOrder = 20;
    shovelOutlineGroup.add(line);
    box.dispose();
  }

  function shovelOpenFromNormal(nx, nz) {
    if (Math.abs(nx) > Math.abs(nz)) {
      return { dx: nx > 0 ? 1 : -1, dz: 0 };
    }
    return { dx: 0, dz: nz > 0 ? 1 : -1 };
  }

  function canDigHideAt(cx, cz, openDx, openDz) {
    if (cz < 2 || cz >= mazeRows - 2 || cx < 1 || cx >= MW - 1) return false;
    if (!cells[cz] || cells[cz][cx]) return false;
    if (hallAt(cx, cz) || isHideCell(cx, cz) || isHoleCell(cx, cz)) return false;
    const nx = cx + openDx;
    const nz = cz + openDz;
    if (!isWalkableCell(nx, nz) || hallAt(nx, nz)) return false;
    return true;
  }

  function removeWallMeshesNear(wx, wz) {
    const lim = CELL * 0.42;
    for (let i = mazeGroup.children.length - 1; i >= 0; i -= 1) {
      const m = mazeGroup.children[i];
      if (!m || !m.position) continue;
      if (Math.hypot(m.position.x - wx, m.position.z - wz) > lim) continue;
      if (!m.userData.sprayWall && !m.userData.shovelHidePart) continue;
      mazeGroup.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
  }

  function removeCollidersNear(wx, wz) {
    const lim = CELL * 0.42;
    for (let i = colliders.length - 1; i >= roomColliderCount; i -= 1) {
      const c = colliders[i];
      const cx = (c.minX + c.maxX) * 0.5;
      const cz = (c.minZ + c.maxZ) * 0.5;
      if (Math.hypot(cx - wx, cz - wz) <= lim) colliders.splice(i, 1);
    }
  }

  function buildHideMeshesAt(cx, cz) {
    const wx = mazeOriginX + cx * CELL;
    const wz = mazeOriginZ + cz * CELL;
    const open = hideOpenDir(cx, cz) || { dx: 0, dz: 1 };
    const ox = open.dx;
    const oz = open.dz;
    const px = -oz;
    const pz = ox;
    const gap = CELL * HIDE_GAP;
    const side = (CELL - gap) * 0.5;
    const off = (gap + side) * 0.5;
    let a;
    let b;
    if (Math.abs(px) > Math.abs(pz)) {
      a = mazeWall(side, CAVE_H, CELL * 0.98, wx + px * off, CAVE_H * 0.5, wz);
      b = mazeWall(side, CAVE_H, CELL * 0.98, wx - px * off, CAVE_H * 0.5, wz);
    } else {
      a = mazeWall(CELL * 0.98, CAVE_H, side, wx, CAVE_H * 0.5, wz + pz * off);
      b = mazeWall(CELL * 0.98, CAVE_H, side, wx, CAVE_H * 0.5, wz - pz * off);
    }
    if (a) a.userData.shovelHidePart = true;
    if (b) b.userData.shovelHidePart = true;
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.abs(ox) > 0 ? gap : CELL * 0.92,
        0.28,
        Math.abs(oz) > 0 ? gap : CELL * 0.92
      ),
      new THREE.MeshLambertMaterial({ color: 0x121018 })
    );
    lip.position.set(wx, CAVE_H - 0.35, wz);
    lip.userData.shovelHidePart = true;
    mazeGroup.add(lip);
  }

  /** 삽 먼지 ? 설정(효과) 꺼도 항상 표시 */
  function spawnDigDust(x, y, z) {
    for (let i = 0; i < 34; i += 1) {
      const s = 0.04 + Math.random() * 0.09;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(s, s, s),
        new THREE.MeshBasicMaterial({
          color: Math.random() > 0.45 ? 0x8b6840 : 0x6a4e32,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        })
      );
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.35,
        y + Math.random() * 0.4,
        z + (Math.random() - 0.5) * 0.35
      );
      mesh.renderOrder = 30;
      scene.add(mesh);
      digDust.push({
        mesh,
        vx: (Math.random() - 0.5) * 3.2,
        vy: 1.1 + Math.random() * 2.6,
        vz: (Math.random() - 0.5) * 3.2,
        life: 0.55 + Math.random() * 0.65,
        maxLife: 1,
      });
      digDust[digDust.length - 1].maxLife = digDust[digDust.length - 1].life;
    }
  }

  function updateDigDust(dt) {
    for (let i = digDust.length - 1; i >= 0; i -= 1) {
      const p = digDust[i];
      p.life -= dt;
      p.vy -= 11 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.z += dt * 3;
      if (p.mesh.material) {
        p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
      }
      if (p.life <= 0 || p.mesh.position.y < -0.2) {
        scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        digDust.splice(i, 1);
      }
    }
  }

  function resolveShovelTarget() {
    const cast = raycastSpraySurface();
    if (!cast || cast.onFloor || !cast.hit) return null;
    let nx = 0;
    let ny = 1;
    let nz = 0;
    if (cast.hit.face) {
      sprayHitNormal
        .copy(cast.hit.face.normal)
        .transformDirection(cast.hit.object.matrixWorld)
        .normalize();
      nx = sprayHitNormal.x;
      ny = sprayHitNormal.y;
      nz = sprayHitNormal.z;
    }
    if (Math.abs(ny) > 0.7) return null;
    sprayHitNormal.set(nx, ny, nz).normalize();
    const inward = cast.hit.point
      .clone()
      .addScaledVector(sprayHitNormal, -0.12);
    const cell = cellFromWorld(inward.x, inward.z);
    let open = shovelOpenFromNormal(nx, nz);
    if (!canDigHideAt(cell.cx, cell.cz, open.dx, open.dz)) {
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      let found = null;
      for (let di = 0; di < 4; di += 1) {
        if (canDigHideAt(cell.cx, cell.cz, dirs[di][0], dirs[di][1])) {
          found = { dx: dirs[di][0], dz: dirs[di][1] };
          break;
        }
      }
      if (!found) return null;
      open = found;
    }
    return {
      cx: cell.cx,
      cz: cell.cz,
      openDx: open.dx,
      openDz: open.dz,
      point: cast.hit.point,
    };
  }

  function updateShovelOutlines() {
    clearShovelOutlines();
    if (!shovelMode || !isEquipped("shovel") || !isInMaze()) {
      if (shovelMode) setShovelMode(false);
      return;
    }
    const focus = resolveShovelTarget();
    const pc = cellFromWorld(pos.x, pos.z);
    const lookX = -Math.sin(yaw);
    const lookZ = -Math.cos(yaw);
    const seen = Object.create(null);
    if (focus) {
      const k = `${focus.cx},${focus.cz}`;
      seen[k] = true;
      addShovelOutlineAt(focus.cx, focus.cz, true);
    }
    const range = 7;
    for (let dz = -range; dz <= range; dz += 1) {
      for (let dx = -range; dx <= range; dx += 1) {
        const cx = pc.cx + dx;
        const cz = pc.cz + dz;
        const key = `${cx},${cz}`;
        if (seen[key]) continue;
        if (cz < 1 || cz >= mazeRows || cx < 1 || cx >= MW - 1) continue;
        if (!cells[cz] || cells[cz][cx]) continue;
        if (hallAt(cx, cz) || isHideCell(cx, cz)) continue;
        const p = worldFromCell(cx, cz);
        const toX = p.x - pos.x;
        const toZ = p.z - pos.z;
        const dist = Math.hypot(toX, toZ);
        if (dist < 0.4 || dist > 11) continue;
        const dot = (toX * lookX + toZ * lookZ) / dist;
        if (dot < 0.35) continue;
        // 복도와 맞닿은 벽만
        let openOk = false;
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (let di = 0; di < 4; di += 1) {
          if (
            canDigHideAt(cx, cz, dirs[di][0], dirs[di][1])
          ) {
            openOk = true;
            break;
          }
        }
        if (!openOk) continue;
        addShovelOutlineAt(cx, cz, false);
      }
    }
  }

  function tryDigWithShovel() {
    if (!shovelMode || !isEquipped("shovel") || !isInMaze()) return;
    if ((itemStock.shovel || 0) < 1) return;
    if (bitten || isRagdoll()) return;
    const target = resolveShovelTarget();
    if (!target) return;
    const { cx, cz, openDx, openDz, point } = target;
    cells[cz][cx] = true;
    if (!hideMap[cz]) hideMap[cz] = [];
    hideMap[cz][cx] = { dx: openDx, dz: openDz };
    const wx = mazeOriginX + cx * CELL;
    const wz = mazeOriginZ + cz * CELL;
    removeWallMeshesNear(wx, wz);
    removeCollidersNear(wx, wz);
    buildHideMeshesAt(cx, cz);
    spawnDigDust(point.x, point.y, point.z);
    consumeItem("shovel");
    setShovelMode(false);
  }

  function onShovelLeftClick() {
    if (!isEquipped("shovel") || (itemStock.shovel || 0) < 1) return;
    if (!isInMaze() || bitten || isRagdoll()) return;
    if (typeof window.__isUiBlocking === "function" && window.__isUiBlocking()) {
      return;
    }
    if (!shovelMode) {
      setShovelMode(true);
      return;
    }
    // 모드 중: 조준한 벽이 있으면 바로 파기, 없으면 모드 해제
    if (resolveShovelTarget()) {
      tryDigWithShovel();
    } else {
      setShovelMode(false);
    }
  }

  function useSkill(id) {
    if (!id || !isEquipped(id)) return;
    if (CONSUMABLE_ITEMS[id]) {
      if ((itemStock[id] || 0) < 1) return;
    } else if (!ownedGame[id]) {
      return;
    }
    if (!isInMaze()) return;
    if (id === "flashlight") {
      flashlightOn = !flashlightOn;
      flashLight.intensity = flashlightOn ? 3.2 : 0;
      flashCore.intensity = flashlightOn ? 1.1 : 0;
      applyCaveFog(fogBlend);
    } else if (id === "compass") {
      compassOn = !compassOn;
    } else if (id === "detector") {
      detectorOn = !detectorOn;
      detectorBeepAcc = 0;
      if (!detectorOn) setDetectorRadar(false, 900);
      syncCoinFogVisual();
      syncSprayFogVisual();
      syncHideDetectorVisual();
    } else if (id === "spray") {
      if (sprayKind === "circle") {
        sprayFreehandOn = !sprayFreehandOn;
        if (!sprayFreehandOn) lastSprayStroke = null;
      } else {
        sprayFreehandOn = false;
        lastSprayStroke = null;
        placeSprayMark();
      }
    } else if (id === "magnet") {
      magnetOn = !magnetOn;
    } else if (id === "boots") {
      // 홀드형 ? updateBoots에서 키 누르는 동안만 발동
    } else if (id === "bandage") {
      // 홀드형 ? updateBandage에서 키를 5초 누르는 동안만
    } else if (id === "paint") {
      togglePaint();
    } else if (id === "bait") {
      throwBait();
    } else if (id === "shovel") {
      setShovelMode(!shovelMode);
    }
  }

  function useSkillAt(slot) {
    if (!canUseSkillSlot(slot)) return;
    useSkill(equippedList[slot]);
  }

  function canUseSkillSlot(slot) {
    // 왼팔→2번, 오른팔→3번
    if (slot === 1 && playerLimbs && !playerLimbs.leftArm) return false;
    if (slot === 2 && playerLimbs && !playerLimbs.rightArm) return false;
    return true;
  }
  window.__canUseSkillSlot = canUseSkillSlot;

  updateTimerUi();
  syncWormBalanceUi();
  syncRestrictionBalanceUi();
  syncBootsTint();

  /** 타이머 만료: 미로 재생성 + 스폰 */
  function resetMazeAndPlayer() {
    rebuildMaze();
    pos.x = SPAWN.x;
    pos.y = SPAWN.y;
    pos.z = SPAWN.z;
    yaw = SPAWN.yaw;
    pitch = SPAWN.pitch;
    mazeTimer = MAZE_RESET_SEC;
    updateTimerUi();
    fogBlend = 0;
    applyCaveFog(0);
    resetWorms();
  }

  /** 예전 사망 리스폰 ? 물림 시스템에선 사용 안 함(로비용 유지) */
  function respawnPlayerOnDeath() {
    if (!devMode) {
      wormBalance = Math.floor(wormBalance * 0.5);
      syncWormBalanceUi();
    }
    pos.x = SPAWN.x;
    pos.y = SPAWN.y;
    pos.z = SPAWN.z;
    yaw = SPAWN.yaw;
    pitch = SPAWN.pitch;
    fogBlend = 0;
    applyCaveFog(0);
    clearItemEffects();
    endBite();
    resetPlayerLimbs();
    clearBait();
    for (let i = 0; i < worms.length; i += 1) {
      worms[i].aggro = true;
      worms[i].speed = Math.max(WORM_MIN_SPEED, WORM_SPEED * 0.9);
      worms[i].dragging = false;
      worms[i].dragHall = null;
    }
  }

  // ---- 물림 / 끌려가기 ----
  let bitten = false;
  let biteWorm = null;
  const INVULN_SEC = 3;
  const WORM_KEEP_GOING_SEC = 5;
  const biteUiEl = document.getElementById("bite-ui");
  const biteNeedleEl = document.getElementById("bite-needle");
  const biteWhiteEl = document.getElementById("bite-zone-white");
  const bitePerfectEl = document.getElementById("bite-zone-perfect");
  const biteScoreEl = document.getElementById("bite-score");
  const hideUiEl = document.getElementById("hide-ui");

  // 탈출 QTE: 도넛 ? 빨간 침 회전, Space로 멈춰 점수 채우기
  const BITE_WHITE_DEG = 42;
  const BITE_PERFECT_DEG = 12; // 하얀 앞쪽 민트(작음)
  const BITE_NEEDLE_SPEED = 220; // deg/sec
  const BITE_SCORE_NEED = 5;
  const BITE_WHITE_PTS = 1;
  const BITE_PERFECT_PTS = 2;
  const BITE_MISS_LOCK = 2; // 빗나감 후 대기(초)
  const BITE_HIT_PAUSE = 1; // 성공(퍼펙트/일반) 후 다음 판 전 대기
  let biteNeedleAngle = 0;
  let biteWhiteStart = 0;
  let biteSpinning = true;
  let biteStopLock = false;
  let biteMissT = 0;
  let biteHitPauseT = 0;
  let biteScore = 0;

  function syncHideUi() {
    if (!hideUiEl) return;
    const on = isInHideSpot() && !bitten && !isRagdoll();
    hideUiEl.classList.toggle("hidden", !on);
    hideUiEl.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function polarRingPoint(deg, r) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: 50 + Math.cos(rad) * r,
      y: 50 + Math.sin(rad) * r,
    };
  }

  function ringArcPath(startDeg, sweepDeg, r) {
    if (sweepDeg <= 0) return "";
    const endDeg = startDeg + sweepDeg;
    const a0 = polarRingPoint(startDeg, r);
    const a1 = polarRingPoint(endDeg, r);
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${a0.x} ${a0.y} A ${r} ${r} 0 ${large} 1 ${a1.x} ${a1.y}`;
  }

  function normDeg(d) {
    let x = d % 360;
    if (x < 0) x += 360;
    return x;
  }

  function angleInSweep(angle, start, sweep) {
    const a = normDeg(angle - start);
    return a <= sweep;
  }

  function layoutBiteZones() {
    // 하얀 구간 랜덤, 민트(퍼펙트)는 하얀 "앞쪽"(회전 방향에서 먼저 닿는 쪽)
    biteWhiteStart = Math.random() * 360;
    const perfectStart = normDeg(biteWhiteStart - BITE_PERFECT_DEG);
    if (biteWhiteEl) {
      biteWhiteEl.setAttribute(
        "d",
        ringArcPath(biteWhiteStart, BITE_WHITE_DEG, 38)
      );
    }
    if (bitePerfectEl) {
      bitePerfectEl.setAttribute(
        "d",
        ringArcPath(perfectStart, BITE_PERFECT_DEG, 38)
      );
    }
  }

  function syncBiteNeedle() {
    if (biteNeedleEl) {
      biteNeedleEl.setAttribute(
        "transform",
        `rotate(${normDeg(biteNeedleAngle)} 50 50)`
      );
    }
  }

  function syncBiteScoreUi() {
    if (biteScoreEl) {
      biteScoreEl.textContent = `${biteScore}/${BITE_SCORE_NEED}`;
    }
  }

  function resumeBiteSpin() {
    if (!bitten) return;
    biteSpinning = true;
    biteStopLock = false;
    biteMissT = 0;
    biteHitPauseT = 0;
    if (biteUiEl) biteUiEl.classList.remove("miss");
    biteNeedleAngle = Math.random() * 360;
    layoutBiteZones();
    syncBiteNeedle();
  }

  function syncBiteUi() {
    if (!biteUiEl) return;
    if (bitten) {
      biteUiEl.classList.remove("hidden");
      biteUiEl.setAttribute("aria-hidden", "false");
      syncBiteNeedle();
      syncBiteScoreUi();
    } else {
      biteUiEl.classList.add("hidden");
      biteUiEl.classList.remove("miss");
      biteUiEl.setAttribute("aria-hidden", "true");
      if (biteScoreEl) biteScoreEl.textContent = `0/${BITE_SCORE_NEED}`;
    }
  }

  function startBite(w) {
    if (
      devMode ||
      bitten ||
      isRagdoll() ||
      isInLobby() ||
      playerInvulnT > 0 ||
      clamCrushT > 0
    ) {
      return;
    }
    if (w && (w.keepGoingT || 0) > 0) return;
    cancelBandage();
    breakPaint();
    bitten = true;
    biteWorm = w;
    biteScore = 0;
    biteNeedleAngle = Math.random() * 360;
    biteSpinning = true;
    biteStopLock = false;
    biteMissT = 0;
    biteHitPauseT = 0;
    if (biteUiEl) biteUiEl.classList.remove("miss");
    layoutBiteZones();
    w.dragging = true;
    const pick = pickDragHallNear(w.hx, w.hz);
    w.dragHall = pick ? pick.hall : null;
    if (pick && pick.path && pick.path.length) {
      w.path = pick.path;
      w.pathI = 0;
      w.pathT = 2.5;
    } else if (w.dragHall) {
      // 경로 실패 시에도 방 쪽으로 직진할 웨이포인트 확보
      const goal = hallCenterWorld(w.dragHall);
      w.path = findMazePathWorld(w.hx, w.hz, goal.x, goal.z);
      if (!w.path || w.path.length < 2) w.path = [goal];
      w.pathI = 0;
      w.pathT = 2.5;
    } else {
      w.pathT = 0;
    }
    w.stuckT = 0;
    w.aggro = true;
    w.speed = Math.max(w.speed, WORM_SPEED * 1.35);
    syncBiteUi();
  }

  function endBite(opts) {
    const hall = biteWorm && biteWorm.dragHall ? biteWorm.dragHall : null;
    const doToss = !!(opts && opts.toss && hall);
    const escaped = !!(opts && opts.escaped);
    if (biteWorm) {
      biteWorm.dragging = false;
      biteWorm.dragHall = null;
      if (escaped) {
        biteWorm.keepGoingT = WORM_KEEP_GOING_SEC;
        // 가던 길 유지: 당장 플레이어로 경로 갱신 안 함
        biteWorm.pathT = Math.max(biteWorm.pathT || 0, 0.8);
      } else {
        biteWorm.pathT = 0;
      }
    }
    if (escaped) playerInvulnT = INVULN_SEC;
    bitten = false;
    biteWorm = null;
    biteSpinning = false;
    biteStopLock = false;
    biteMissT = 0;
    biteHitPauseT = 0;
    biteScore = 0;
    syncBiteUi();
    if (doToss) startTossRagdoll(hall);
  }

  function tryEscapeStop() {
    if (!bitten || biteStopLock || !biteSpinning || biteMissT > 0 || biteHitPauseT > 0) {
      return;
    }
    biteStopLock = true;
    biteSpinning = false;
    const ang = normDeg(biteNeedleAngle);
    const perfectStart = normDeg(biteWhiteStart - BITE_PERFECT_DEG);
    let gained = 0;
    if (angleInSweep(ang, perfectStart, BITE_PERFECT_DEG)) {
      gained = BITE_PERFECT_PTS;
      biteScore = Math.min(BITE_SCORE_NEED, biteScore + gained);
      syncBiteScoreUi();
    } else if (angleInSweep(ang, biteWhiteStart, BITE_WHITE_DEG)) {
      gained = BITE_WHITE_PTS;
      biteScore = Math.min(BITE_SCORE_NEED, biteScore + gained);
      syncBiteScoreUi();
    } else {
      // 빗나감: 문구 없이 빨강+좌우 흔들림 2초 후 재시도
      biteMissT = BITE_MISS_LOCK;
      if (biteUiEl) {
        biteUiEl.classList.remove("miss");
        void biteUiEl.offsetWidth;
        biteUiEl.classList.add("miss");
      }
      return;
    }
    // 점수 다 채우면 바로 탈출 / 아니면 1초 멈춘 뒤 다음 판
    if (biteScore >= BITE_SCORE_NEED) {
      endBite({ toss: false, escaped: true });
      return;
    }
    biteHitPauseT = BITE_HIT_PAUSE;
  }

  function updateBiteQte(dt) {
    if (!bitten) {
      biteMissT = 0;
      biteHitPauseT = 0;
      return;
    }
    if (biteMissT > 0) {
      biteMissT -= dt;
      if (biteMissT <= 0) resumeBiteSpin();
      return;
    }
    if (biteHitPauseT > 0) {
      biteHitPauseT -= dt;
      if (biteHitPauseT <= 0) resumeBiteSpin();
      return;
    }
    if (biteSpinning) {
      biteNeedleAngle = normDeg(biteNeedleAngle + BITE_NEEDLE_SPEED * dt);
      syncBiteNeedle();
    }
  }

  function updateBiteDrag() {
    if (!bitten || !biteWorm || !biteWorm.active) {
      if (bitten) endBite({ toss: false });
      return;
    }
    const w = biteWorm;
    // 웜이 가는 방향 기준 머리 뒤에 붙임 (끌려가는 느낌)
    const back = 1.15;
    const fx = Math.sin(w.yaw);
    const fz = Math.cos(w.yaw);
    pos.x = w.hx - fx * back;
    pos.z = w.hz - fz * back;
    pos.y = EYE_H;

    // 목표 큰방 안쪽이면 던지듯 놓음
    if (w.dragHall) {
      const cell = cellFromWorld(w.hx, w.hz);
      const h = w.dragHall;
      const margin = 2;
      if (
        cell.cx >= h.x0 + margin &&
        cell.cx <= h.x1 - margin &&
        cell.cz >= h.z0 + margin &&
        cell.cz <= h.z1 - margin
      ) {
        endBite({ toss: true });
      }
    }
  }

  // ---- 연두 웜 (머리 경로를 몸통이 시간차 두고 따라감) ----
  const wormRoot = new THREE.Group();
  scene.add(wormRoot);
  const worms = [];
  const WORM_SEG = 14;
  const WORM_SCALE = 1.7 * 1.7 * 2; // 기존 대비 2배
  const WORM_R = 0.34 * WORM_SCALE;
  const WORM_SPEED = MOVE_SPEED * 1.2;
  const WORM_ACCEL = 14;
  const WORM_TURN = 2.4; // rad/s ? 너무 급하면 몸이 일자로 스윙함
  const WORM_SEG_GAP = 0.3 * WORM_SCALE; // 마디 간격(경로 거리)
  const WORM_WRIGGLE = 0.35; // S자 좌우 꿈틀 (요 각도)
  const WORM_WRIGGLE_HZ = 2.1;
  const WORM_CATCH = 1.7; // 잡기 범위(히트박스와 분리)
  const WORM_COLOR = 0xb8e85a;
  const MINI_WORM_COLOR = 0xe3f6b5; // 미니웜: 더 연한 연두
  const WORM_TRAIL_MAX = 360;
  const WORM_VISION = 11; // 어몽어스식 시야 거리
  const WORM_FOV = 1.35; // 약 77° 반각 → 전방 원뿔
  const WORM_SEP = 3.1 * WORM_SCALE; // 웜끼리 최소 간격
  const WORM_MIN_SPEED = MOVE_SPEED * 1.2;
  // 벽 통과 방지: 복도에 들어가되 벽 여유 확보
  const WORM_COL_R = CELL * 0.36;
  const WORM_STUCK_SEC = 0.75;

  function worldFromCell(cx, cz) {
    return {
      x: mazeOriginX + cx * CELL,
      z: mazeOriginZ + cz * CELL,
    };
  }

  function cellFromWorld(x, z) {
    let cx = Math.round((x - mazeOriginX) / CELL);
    let cz = Math.round((z - mazeOriginZ) / CELL);
    if (mazeRows < 1) return { cx: enterX, cz: 0 };
    cx = Math.max(0, Math.min(MW - 1, cx));
    cz = Math.max(0, Math.min(mazeRows - 1, cz));
    return { cx, cz };
  }

  function isWalkableCell(cx, cz) {
    return (
      cz >= 0 &&
      cz < mazeRows &&
      cx >= 0 &&
      cx < MW &&
      cells[cz] &&
      cells[cz][cx]
    );
  }

  /** 일반 웜용 — 굴·틈새는 몸집이 안 들어가 통과 불가 */
  function isWormWalkableCell(cx, cz) {
    return (
      isWalkableCell(cx, cz) &&
      !isHoleCell(cx, cz) &&
      !isHideCell(cx, cz)
    );
  }

  function nearestWalkableCell(cx, cz, opts) {
    const allowHole = !!(opts && opts.allowHole);
    const ok = (x, z) =>
      allowHole ? isWalkableCell(x, z) : isWormWalkableCell(x, z);
    if (ok(cx, cz)) return { cx, cz };
    for (let r = 1; r <= 10; r += 1) {
      for (let dz = -r; dz <= r; dz += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          if (ok(nx, nz)) return { cx: nx, cz: nz };
        }
      }
    }
    return { cx: enterX, cz: Math.max(1, Math.min(mazeRows - 1, 2)) };
  }

  /** 미로 통로 기준 BFS 최단경로 → 월드 웨이포인트 */
  function findMazePathWorld(sx, sz, gx, gz, opts) {
    if (mazeRows < 2) return [];
    const allowHole = !!(opts && opts.allowHole);
    const start = nearestWalkableCell(
      cellFromWorld(sx, sz).cx,
      cellFromWorld(sx, sz).cz,
      opts
    );
    const goal = nearestWalkableCell(
      cellFromWorld(gx, gz).cx,
      cellFromWorld(gx, gz).cz,
      opts
    );
    if (start.cx === goal.cx && start.cz === goal.cz) {
      return [worldFromCell(goal.cx, goal.cz)];
    }

    const keyOf = (cx, cz) => cz * MW + cx;
    const came = new Int32Array(MW * Math.max(1, mazeRows));
    came.fill(-2);
    const qx = new Int16Array(MW * mazeRows);
    const qz = new Int16Array(MW * mazeRows);
    let qh = 0;
    let qt = 0;
    const sk = keyOf(start.cx, start.cz);
    came[sk] = -1;
    qx[qt] = start.cx;
    qz[qt] = start.cz;
    qt += 1;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let found = false;
    const goalK = keyOf(goal.cx, goal.cz);
    const cellOk = allowHole ? isWalkableCell : isWormWalkableCell;
    while (qh < qt) {
      const cx = qx[qh];
      const cz = qz[qh];
      qh += 1;
      const ck = keyOf(cx, cz);
      if (ck === goalK) {
        found = true;
        break;
      }
      for (let di = 0; di < 4; di += 1) {
        const nx = cx + dirs[di][0];
        const nz = cz + dirs[di][1];
        if (!cellOk(nx, nz)) continue;
        const nk = keyOf(nx, nz);
        if (came[nk] !== -2) continue;
        came[nk] = ck;
        qx[qt] = nx;
        qz[qt] = nz;
        qt += 1;
      }
    }
    if (!found) return [];

    const rev = [];
    let cur = goalK;
    while (cur !== -1) {
      const cz = (cur / MW) | 0;
      const cx = cur - cz * MW;
      rev.push(worldFromCell(cx, cz));
      cur = came[cur];
    }
    rev.reverse();
    if (
      rev.length &&
      Math.hypot(rev[0].x - sx, rev[0].z - sz) < CELL * 0.25
    ) {
      rev.shift();
    }
    return rev;
  }

  function pickWormWanderGoal(fromX, fromZ) {
    if (mazeRows < 10) {
      return worldFromCell(enterX, Math.max(2, mazeRows - 2));
    }
    const avoidHall = (() => {
      if (isInLobby()) return null;
      const c = cellFromWorld(pos.x, pos.z);
      return hallAt(c.cx, c.cz) || null;
    })();
    for (let tries = 0; tries < 40; tries += 1) {
      const cz = 6 + ((Math.random() * Math.max(1, mazeRows - 10)) | 0);
      const cx = 1 + ((Math.random() * (MW - 2)) | 0);
      if (!isWalkableCell(cx, cz)) continue;
      if (isHoleCell(cx, cz)) continue;
      if (avoidHall && hallAt(cx, cz) === avoidHall) continue;
      const p = worldFromCell(cx, cz);
      if (p.z < HALF + CELL * 5) continue;
      if (Math.hypot(p.x - fromX, p.z - fromZ) < CELL * 5) continue;
      return p;
    }
    return worldFromCell(
      enterX,
      Math.max(8, Math.min(mazeRows - 2, ((mazeRows * 0.55) | 0)))
    );
  }

  function isPlayerInAnyHall() {
    if (isInLobby()) return false;
    const c = cellFromWorld(pos.x, pos.z);
    return !!hallAt(c.cx, c.cz);
  }

  function refreshWormPath(w) {
    const heardBait = nearestHeardBait(w);
    if (w.dragging && w.dragHall) {
      w.aggro = true;
      const goal = hallCenterWorld(w.dragHall);
      w.path = findMazePathWorld(w.hx, w.hz, goal.x, goal.z);
      if (!w.path || w.path.length < 2) {
        // 경로 실패 시에도 방 중심으로 직진
        w.path = [goal];
      }
    } else if (heardBait) {
      w.aggro = true;
      w.path = findMazePathWorld(w.hx, w.hz, heardBait.x, heardBait.z);
    } else if (
      devMode ||
      (w.keepGoingT || 0) > 0 ||
      isInLobby() ||
      isPlayerInAnyHall() ||
      paintOn ||
      isInHideSpot() ||
      (isCrouching() && !wormCanSeePlayer(w))
    ) {
      // 개발 / 탈출 직후 / 로비 / 큰방 / 은신 / 틈새 / 웅크려 미시야 → 배회
      w.aggro = false;
      const reached =
        !w.wanderGoal ||
        Math.hypot(w.hx - w.wanderGoal.x, w.hz - w.wanderGoal.z) < CELL * 1.5;
      if (reached) {
        w.wanderGoal = pickWormWanderGoal(w.hx, w.hz);
      }
      w.path = findMazePathWorld(w.hx, w.hz, w.wanderGoal.x, w.wanderGoal.z);
    } else {
      w.aggro = true;
      w.wanderGoal = null;
      w.path = findMazePathWorld(w.hx, w.hz, pos.x, pos.z);
    }
    w.pathI = 0;
    w.pathT = 0.22 + Math.random() * 0.12;
  }

  function snapWormToWalkable(w) {
    const cell = nearestWalkableCell(cellFromWorld(w.hx, w.hz).cx, cellFromWorld(w.hx, w.hz).cz);
    const p = worldFromCell(cell.cx, cell.cz);
    const cleared = collideMoveSoft(p.x, p.z, WORM_COL_R);
    w.hx = cleared.x;
    w.hz = Math.max(cleared.z, HALF + CELL * 1.5);
    w.stuckT = 0;
    w.path = [];
    w.pathI = 0;
    w.pathT = 0;
    initWormTrail(w, w.hx, w.hz, w.yaw);
    placeWormOnTrail(w);
  }

  function findOpenCellNear(targetZ) {
    const cz = Math.max(
      2,
      Math.min(mazeRows - 2, Math.round((targetZ - mazeOriginZ) / CELL))
    );
    const xs = [];
    for (let x = 1; x < MW - 1; x += 1) xs.push(x);
    for (let i = xs.length - 1; i > 0; i -= 1) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = xs[i];
      xs[i] = xs[j];
      xs[j] = t;
    }
    const zTry = [cz, cz + 2, cz - 1, cz + 4, cz + 1];
    for (let zi = 0; zi < zTry.length; zi += 1) {
      const z = zTry[zi];
      if (z < 0 || z >= mazeRows || !cells[z]) continue;
      for (let i = 0; i < xs.length; i += 1) {
        if (!cells[z][xs[i]]) continue;
        if (isHoleCell(xs[i], z)) continue;
        const p = worldFromCell(xs[i], z);
        if (!isSpotFreeForWorm(p.x, p.z, null)) continue;
        return p;
      }
    }
    return worldFromCell(enterX, Math.max(2, Math.min(mazeRows - 2, cz)));
  }

  function isSpotFreeForWorm(x, z, self) {
    for (let i = 0; i < worms.length; i += 1) {
      const o = worms[i];
      if (o === self || !o.active) continue;
      if (Math.hypot(o.hx - x, o.hz - z) < WORM_SEP) return false;
    }
    return true;
  }

  /** 벽 사이로 플레이어가 보이는지 (2D 선분 vs AABB) */
  function hasLineOfSight(x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const steps = Math.max(4, Math.ceil(Math.hypot(dx, dz) / 0.35));
    for (let s = 1; s < steps; s += 1) {
      const t = s / steps;
      const x = x0 + dx * t;
      const z = z0 + dz * t;
      for (let i = roomColliderCount; i < colliders.length; i += 1) {
        const c = colliders[i];
        if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
          return false;
        }
      }
    }
    return true;
  }

  function wormCanSeePlayer(w) {
    if (isInHideSpot()) return false;
    const dx = pos.x - w.hx;
    const dz = pos.z - w.hz;
    const dist = Math.hypot(dx, dz);
    if (dist > WORM_VISION || dist < 0.01) return dist < 0.01;
    let ang = Math.atan2(dx, dz) - w.yaw;
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;
    if (Math.abs(ang) > WORM_FOV) return false;
    return hasLineOfSight(w.hx, w.hz, pos.x, pos.z);
  }

  function makeWormMesh(scaleMul, colorHex) {
    const s = scaleMul == null ? 1 : scaleMul;
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({
      color: colorHex != null ? colorHex : WORM_COLOR,
      emissive: 0x000000,
    });
    const segs = [];
    const segCount = s < 0.2 ? 8 : WORM_SEG;
    for (let i = 0; i < segCount; i += 1) {
      const tip = i === 0 || i === segCount - 1;
      const rad =
        WORM_R *
        s *
        (tip ? 0.95 : 1) *
        (1 - (i / Math.max(1, segCount - 1)) * 0.12);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.04, rad), 10, 8),
        mat
      );
      group.add(mesh);
      segs.push({ mesh, baseR: rad });
    }
    return { group, segs, mat, segGap: WORM_SEG_GAP * s };
  }

  function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function approachAngle(current, target, maxRad) {
    let d = target - current;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (d > maxRad) d = maxRad;
    if (d < -maxRad) d = -maxRad;
    return current + d;
  }

  /** 경로에서 head로부터 distBack 만큼 뒤 지점 (시간차 ? 거리/속도) */
  function sampleTrail(trail, distBack) {
    if (!trail.length) return { x: 0, z: 0, yaw: 0 };
    if (distBack <= 0) return trail[0];
    let left = distBack;
    for (let i = 0; i < trail.length - 1; i += 1) {
      const a = trail[i];
      const b = trail[i + 1];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d < 1e-6) continue;
      if (left <= d) {
        const t = left / d;
        // 위치 보간 + 구간 방향 yaw (꺾일 때 허리가 따라가게)
        const yawAlong = Math.atan2(a.x - b.x, a.z - b.z);
        return {
          x: a.x + (b.x - a.x) * t,
          z: a.z + (b.z - a.z) * t,
          yaw: yawAlong,
        };
      }
      left -= d;
    }
    return trail[trail.length - 1];
  }

  function pushTrail(w, x, z, yaw) {
    const minStep = 0.07;
    if (!w.trail) w.trail = [];
    const head = w.trail[0];
    if (!head) {
      w.trail.unshift({ x, z, yaw });
      return;
    }

    const dx = x - head.x;
    const dz = z - head.z;
    const d = Math.hypot(dx, dz);
    let dyaw = yaw - head.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    const adyaw = Math.abs(dyaw);

    // 거의 안 움직임 + 각도도 같음 → 헤드만 갱신
    if (d < minStep * 0.35 && adyaw < 0.035) {
      head.x = x;
      head.z = z;
      head.yaw = yaw;
      return;
    }

    const pts = [];
    // 급회전/장거리면 중간 점을 넣어 몸이 직선으로 스윙하지 않게
    let steps = 1;
    if (adyaw > 0.1) {
      steps = Math.max(steps, Math.min(12, Math.ceil(adyaw / 0.09)));
    }
    if (d > minStep * 1.5) {
      steps = Math.max(steps, Math.min(10, Math.ceil(d / minStep)));
    }

    if (steps <= 1) {
      if (d < minStep && adyaw >= 0.035) {
        // 제자리 회전에 가까움: 이전 진행 반대 흔적을 남겨 허리 꺾임 생성
        const back = minStep * 0.9;
        pts.push({
          x: head.x - Math.sin(head.yaw) * back * 0.35,
          z: head.z - Math.cos(head.yaw) * back * 0.35,
          yaw: head.yaw,
        });
      }
      pts.push({ x, z, yaw });
    } else {
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        const iy = lerpAngle(head.yaw, yaw, t);
        let px;
        let pz;
        if (d >= minStep * 0.5) {
          px = head.x + dx * t;
          pz = head.z + dz * t;
        } else {
          // 짧은 이동+큰 회전: 진행방향 블렌드로 작은 호
          const ox = Math.sin(head.yaw);
          const oz = Math.cos(head.yaw);
          const nx = Math.sin(iy);
          const nz = Math.cos(iy);
          const arc = minStep * (0.55 + adyaw * 0.25);
          px = head.x + (ox * (1 - t) + nx * t) * arc * t;
          pz = head.z + (oz * (1 - t) + nz * t) * arc * t;
        }
        pts.push({ x: px, z: pz, yaw: iy });
      }
      pts[pts.length - 1] = { x, z, yaw };
    }

    for (let i = 0; i < pts.length; i += 1) {
      w.trail.unshift(pts[i]);
    }
    if (w.trail.length > WORM_TRAIL_MAX) w.trail.length = WORM_TRAIL_MAX;
  }

  function placeWormOnTrail(w) {
    const gap = w.segGap != null ? w.segGap : WORM_SEG_GAP;
    for (let i = 0; i < w.segs.length; i += 1) {
      const p = sampleTrail(w.trail, i * gap);
      const seg = w.segs[i];
      seg.mesh.position.set(p.x, seg.baseR * 0.9, p.z);
      let yaw = p.yaw;
      // 머리 쪽을 바라보게 해 꺾인 허리가 보이게
      if (i > 0) {
        const toward = sampleTrail(w.trail, Math.max(0, (i - 0.5) * gap));
        const dd = Math.hypot(toward.x - p.x, toward.z - p.z);
        if (dd > 1e-4) {
          yaw = Math.atan2(toward.x - p.x, toward.z - p.z);
        }
      }
      seg.mesh.rotation.y = yaw;
      seg.mesh.scale.set(1, 1, 1.05);
    }
  }

  function initWormTrail(w, x, z, yaw) {
    const gap = w.segGap != null ? w.segGap : WORM_SEG_GAP;
    w.trail.length = 0;
    for (let i = 0; i < w.segs.length + 2; i += 1) {
      w.trail.push({
        x: x - Math.sin(yaw) * i * gap,
        z: z - Math.cos(yaw) * i * gap,
        yaw,
      });
    }
  }

  function spawnWorm(atZ) {
    const built = makeWormMesh(1);
    const p = findOpenCellNear(atZ);
    const yaw = 0;
    built.group.position.set(0, 0, 0);
    wormRoot.add(built.group);
    const cleared = collideMoveSoft(p.x, p.z, WORM_COL_R);
    const w = {
      group: built.group,
      segs: built.segs,
      mat: built.mat,
      segGap: built.segGap,
      hx: cleared.x,
      hz: Math.max(cleared.z, HALF + CELL * 1.5),
      yaw,
      speed: 0,
      phase: Math.random() * Math.PI * 2,
      trail: [],
      active: true,
      aggro: true,
      wanderT: Math.random() * 3,
      path: [],
      pathI: 0,
      pathT: 0,
      wanderGoal: null,
      wasLobby: true,
      wasPlayerHall: false,
      wasCrouchHide: false,
      keepGoingT: 0,
      stuckT: 0,
      dragging: false,
      dragHall: null,
    };
    initWormTrail(w, w.hx, w.hz, yaw);
    placeWormOnTrail(w);
    worms.push(w);
  }

  // ---- 미니 웜: 큰 방 전용, 사지→몸통→머리 순서대로 뜯어먹음 ----
  const miniWorms = [];
  const MINI_SCALE = 0.1;
  const MINI_SPEED = MOVE_SPEED / 5; // 본웜보다 5배 느림
  const MINI_CATCH = 0.85;
  const MINI_COL_R = 0.22;
  const MINI_EAT_DIST = 3.2 * 3; // 뜯고 멀리 떨어져 먹음
  const MINI_SEP = 0.85;
  const MINI_EAT_SEC = 1.6;
  const MINI_STORAGE_LIFE = 5; // 저장고 미니웜 생존 시간
  const MINI_BURROW_SEC = 1.15; // 땅 파고 내려가는 연출
  const LIMB_ORDER = [
    "leftArm",
    "rightArm",
    "leftLeg",
    "rightLeg",
    "torso", // 몸통 뜯기면 사망 (머리만 남아도 끝)
  ];
  const LIMB_UI_IDS = [
    "leftLeg",
    "rightLeg",
    "leftArm",
    "rightArm",
    "torso",
    "head",
  ];
  const playerLimbs = {
    leftArm: true,
    rightArm: true,
    leftLeg: true,
    rightLeg: true,
    torso: true,
    head: true,
  };
  let limbBusy = false;
  const limbUiEl = document.getElementById("limb-ui");
  const limbIconEls = {};
  if (limbUiEl) {
    const icons = limbUiEl.querySelectorAll("[data-limb]");
    for (let i = 0; i < icons.length; i += 1) {
      limbIconEls[icons[i].getAttribute("data-limb")] = icons[i];
    }
  }

  function missingLegCount() {
    return (playerLimbs.leftLeg ? 0 : 1) + (playerLimbs.rightLeg ? 0 : 1);
  }

  function legSpeedMul() {
    const n = missingLegCount();
    if (n >= 2) return 1 / 3;
    if (n === 1) return 2 / 3;
    return 1;
  }

  function isLegless() {
    return missingLegCount() >= 2;
  }

  function nextLimbId() {
    for (let i = 0; i < LIMB_ORDER.length; i += 1) {
      if (playerLimbs[LIMB_ORDER[i]]) return LIMB_ORDER[i];
    }
    return null;
  }

  function syncPlayerMeshLimbs() {
    playerMesh.traverse((obj) => {
      if (!obj.name || !(obj.name in playerLimbs)) return;
      obj.visible = !!playerLimbs[obj.name];
    });
  }

  function makeCarriedLimbMesh(id) {
    const mat = new THREE.MeshLambertMaterial({
      color: 0x1a1a1e,
      fog: false,
      emissive: 0x331111,
      emissiveIntensity: 0.35,
    });
    let mesh;
    if (id === "leftArm" || id === "rightArm") {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.22), mat);
    } else if (id === "leftLeg" || id === "rightLeg") {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.26), mat);
    } else if (id === "torso") {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.32), mat);
    } else {
      mesh = new THREE.Group();
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.42), mat);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2020, fog: false });
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), eyeMat);
      eyeL.position.set(-0.14, 0.05, 0.22);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.14;
      mesh.add(head, eyeL, eyeR);
    }
    // 머리 세그먼트 로컬 앞쪽에 크게 붙임 (들고 가는 게 보이게)
    mesh.position.set(0, 0.35, 0.55);
    mesh.rotation.x = 0.35;
    mesh.rotation.z = id === "leftArm" || id === "leftLeg" ? 0.45 : -0.45;
    mesh.scale.setScalar(1.2);
    mesh.name = "carriedLimb";
    return mesh;
  }

  function attachCarriedLimb(m, id) {
    clearCarriedLimb(m);
    const prop = makeCarriedLimbMesh(id);
    const head = m.segs && m.segs[0] ? m.segs[0].mesh : m.group;
    head.add(prop);
    m.carryMesh = prop;
  }

  function clearCarriedLimb(m) {
    if (!m || !m.carryMesh) return;
    if (m.carryMesh.parent) m.carryMesh.parent.remove(m.carryMesh);
    m.carryMesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          for (let i = 0; i < obj.material.length; i += 1) obj.material[i].dispose();
        } else {
          obj.material.dispose();
        }
      }
    });
    m.carryMesh = null;
  }

  function resetPlayerLimbs() {
    for (let i = 0; i < LIMB_ORDER.length; i += 1) {
      playerLimbs[LIMB_ORDER[i]] = true;
    }
    playerLimbs.head = true;
    limbBusy = false;
    syncLimbUi();
    syncPlayerMeshLimbs();
  }

  function syncLimbUi() {
    for (let i = 0; i < LIMB_UI_IDS.length; i += 1) {
      const id = LIMB_UI_IDS[i];
      const el = limbIconEls[id];
      if (!el) continue;
      if (playerLimbs[id]) el.classList.remove("torn");
      else el.classList.add("torn");
    }
  }

  syncLimbUi();
  syncPlayerMeshLimbs();

  function takeLimb(id) {
    if (devMode) return false;
    if (!id || !playerLimbs[id]) return false;
    playerLimbs[id] = false;
    syncLimbUi();
    syncPlayerMeshLimbs();
    if (window.__refreshSkillUi) window.__refreshSkillUi();
    return true;
  }

  function checkLimbsDead() {
    // 몸통이 뜯기면 사망 (머리·몸통만 남은 뒤 한 번 더)
    if (!playerLimbs.torso || !nextLimbId()) {
      endBite();
      respawnPlayerOnDeath();
      resetPlayerLimbs();
      if (window.__refreshSkillUi) window.__refreshSkillUi();
    }
  }

  function clearMiniWorms() {
    for (let i = 0; i < miniWorms.length; i += 1) {
      const m = miniWorms[i];
      clearCarriedLimb(m);
      if (m.group && m.group.parent) m.group.parent.remove(m.group);
    }
    miniWorms.length = 0;
    limbBusy = false;
  }

  function hallInteriorSpot(h) {
    const spanX = h.x1 - h.x0 + 1;
    const spanZ = h.z1 - h.z0 + 1;
    const innerX = Math.max(1, spanX - 4);
    const innerZ = Math.max(1, spanZ - 4);
    for (let t = 0; t < 40; t += 1) {
      const cx = h.x0 + 2 + ((Math.random() * innerX) | 0);
      const cz = h.z0 + 2 + ((Math.random() * innerZ) | 0);
      if (!isWalkableCell(cx, cz)) continue;
      return worldFromCell(cx, cz);
    }
    return hallCenterWorld(h);
  }

  function clampMiniToHall(m) {
    const h = m.hall;
    if (!h) return;
    const minX = mazeOriginX + (h.x0 + 1) * CELL;
    const maxX = mazeOriginX + (h.x1 - 1) * CELL;
    const minZ = mazeOriginZ + (h.z0 + 1) * CELL;
    const maxZ = mazeOriginZ + (h.z1 - 1) * CELL;
    if (m.hx < minX) m.hx = minX;
    if (m.hx > maxX) m.hx = maxX;
    if (m.hz < minZ) m.hz = minZ;
    if (m.hz > maxZ) m.hz = maxZ;
  }

  function playerInHall(h) {
    const c = cellFromWorld(pos.x, pos.z);
    return (
      c.cx >= h.x0 &&
      c.cx <= h.x1 &&
      c.cz >= h.z0 &&
      c.cz <= h.z1 &&
      !isInLobby()
    );
  }

  function removeMiniWorm(m) {
    if (!m) return;
    clearCarriedLimb(m);
    m.stealLimb = null;
    m.active = false;
    if (m.group && m.group.parent) m.group.parent.remove(m.group);
    const ix = miniWorms.indexOf(m);
    if (ix >= 0) miniWorms.splice(ix, 1);
  }

  function startMiniBurrow(m) {
    if (!m || m.burrowing) return;
    if (m.stealLimb) {
      clearCarriedLimb(m);
      m.stealLimb = null;
      limbBusy = false;
    }
    m.burrowing = true;
    m.burrowT = 0;
    m.state = "burrow";
    m.speed = 0;
  }

  function spawnMiniWorm(hall, x, z) {
    const built = makeWormMesh(MINI_SCALE, MINI_WORM_COLOR);
    const px = x != null ? x : hallInteriorSpot(hall).x;
    const pz = z != null ? z : hallInteriorSpot(hall).z;
    const fromStorage = !!(hall && hall.kind === "storage");
    wormRoot.add(built.group);
    const m = {
      group: built.group,
      segs: built.segs,
      mat: built.mat,
      segGap: built.segGap,
      hx: px,
      hz: pz,
      yaw: Math.random() * Math.PI * 2,
      speed: MINI_SPEED,
      phase: Math.random() * Math.PI * 2,
      trail: [],
      active: true,
      hall,
      fromStorage,
      lifeT: fromStorage ? MINI_STORAGE_LIFE : Infinity,
      burrowing: false,
      burrowT: 0,
      state: "chase",
      stateT: 0,
      stealLimb: null,
      carryMesh: null,
      fleeX: px,
      fleeZ: pz,
    };
    initWormTrail(m, m.hx, m.hz, m.yaw);
    placeWormOnTrail(m);
    miniWorms.push(m);
    return m;
  }

  function hatchSmallEgg(egg) {
    if (!egg || egg.hatched) return;
    egg.hatched = true;
    egg.awaitTrigger = false;
    if (egg.whole) egg.whole.visible = false;
    if (egg.broken) egg.broken.visible = true;
    spawnMiniWorm(egg.hall, egg.x, egg.z);
  }

  /** 저장고 코인 습득 → 그 방 알들이 0.5~2초 사이 흩어져 부화 */
  function triggerStorageEggs(hall) {
    if (!hall) return;
    for (let i = 0; i < smallEggs.length; i += 1) {
      const egg = smallEggs[i];
      if (egg.hall !== hall || egg.hatched) continue;
      egg.awaitTrigger = false;
      egg.timer = 0.5 + Math.random() * 1.5;
    }
  }

  function updateSmallEggs(dt) {
    for (let i = 0; i < smallEggs.length; i += 1) {
      const egg = smallEggs[i];
      if (egg.hatched) continue;
      if (egg.awaitTrigger) continue;
      const storageArmed =
        egg.hall && egg.hall.kind === "storage" && egg.hall.storageLooted;
      if (!storageArmed && !playerInHall(egg.hall)) continue;
      egg.timer -= dt;
      if (egg.timer <= 0) hatchSmallEgg(egg);
    }
  }

  function updateMiniWorms(dt) {
    for (let i = miniWorms.length - 1; i >= 0; i -= 1) {
      const m = miniWorms[i];
      if (!m.active) continue;
      m.phase += dt * Math.PI * 2 * 3.2;

      // 저장고 미니웜: 5초 뒤 땅 파고 죽음
      if (m.fromStorage && !m.burrowing) {
        m.lifeT -= dt;
        if (m.lifeT <= 0) startMiniBurrow(m);
      }

      if (m.burrowing) {
        m.burrowT += dt;
        const t = Math.min(1, m.burrowT / MINI_BURROW_SEC);
        const ease = t * t * (3 - 2 * t);
        const sink = ease * 1.55;
        placeWormOnTrail(m);
        for (let s = 0; s < m.segs.length; s += 1) {
          const seg = m.segs[s];
          seg.mesh.position.y -= sink;
          seg.mesh.rotation.x = ease * 0.85;
          const shrink = 1 - ease * 0.35;
          seg.mesh.scale.set(shrink, shrink, 1.05);
        }
        if (t >= 1) removeMiniWorm(m);
        continue;
      }

      if (m.mat) {
        const near =
          detectorOn &&
          Math.hypot(pos.x - m.hx, pos.z - m.hz) < DETECT_RANGE;
        m.mat.fog = !near;
        m.mat.emissive.setHex(near ? 0x66ff88 : 0x000000);
        m.mat.emissiveIntensity = near ? 1.2 : 0;
        m.mat.needsUpdate = true;
      }

      const inHall = playerInHall(m.hall);
      let wantX = m.hx;
      let wantZ = m.hz;

      if (m.state === "eat") {
        m.stateT -= dt;
        wantX = m.fleeX;
        wantZ = m.fleeZ;
        if (m.stateT <= 0) {
          clearCarriedLimb(m);
          m.stealLimb = null;
          limbBusy = false;
          m.state = "chase";
          checkLimbsDead();
        }
      } else if (m.state === "flee") {
        wantX = m.fleeX;
        wantZ = m.fleeZ;
        const dFlee = Math.hypot(m.hx - m.fleeX, m.hz - m.fleeZ);
        if (dFlee < 0.45) {
          m.state = "eat";
          m.stateT = MINI_EAT_SEC;
        }
      } else if (inHall && !bitten && !devMode) {
        wantX = pos.x;
        wantZ = pos.z;
        const dist = Math.hypot(pos.x - m.hx, pos.z - m.hz);
        const limb = nextLimbId();
        if (limb && !limbBusy && dist < MINI_CATCH) {
          // 뜯어간 뒤 거리 벌려서 먹음
          if (!takeLimb(limb)) continue;
          limbBusy = true;
          m.stealLimb = limb;
          attachCarriedLimb(m, limb);
          m.state = "flee";
          const ang =
            Math.atan2(m.hx - pos.x, m.hz - pos.z) +
            (Math.random() - 0.5) * 0.8;
          m.fleeX = pos.x + Math.sin(ang) * MINI_EAT_DIST;
          m.fleeZ = pos.z + Math.cos(ang) * MINI_EAT_DIST;
          const tmp = { hx: m.fleeX, hz: m.fleeZ, hall: m.hall };
          clampMiniToHall(tmp);
          m.fleeX = tmp.hx;
          m.fleeZ = tmp.hz;
        }
      } else {
        // 배회
        m.stateT -= dt;
        if (m.stateT <= 0) {
          const spot = hallInteriorSpot(m.hall);
          m.fleeX = spot.x;
          m.fleeZ = spot.z;
          m.stateT = 1.5 + Math.random() * 2;
        }
        wantX = m.fleeX;
        wantZ = m.fleeZ;
      }

      const dx = wantX - m.hx;
      const dz = wantZ - m.hz;
      const dist = Math.hypot(dx, dz);
      let wantYaw = m.yaw;
      if (dist > 0.05) wantYaw = Math.atan2(dx, dz);
      wantYaw += Math.sin(m.phase) * 0.35;
      m.yaw = approachAngle(m.yaw, wantYaw, 5 * dt);
      m.speed = MINI_SPEED;

      let nx = m.hx + Math.sin(m.yaw) * m.speed * dt;
      let nz = m.hz + Math.cos(m.yaw) * m.speed * dt;
      const hitX = collideMoveSoft(nx, m.hz, MINI_COL_R);
      m.hx = hitX.x;
      const hitZ = collideMoveSoft(m.hx, nz, MINI_COL_R);
      m.hz = hitZ.z;
      clampMiniToHall(m);

      pushTrail(m, m.hx, m.hz, m.yaw);
      placeWormOnTrail(m);
    }
    separateMiniWorms();
    for (let i = 0; i < miniWorms.length; i += 1) {
      const m = miniWorms[i];
      if (!m.active || m.burrowing) continue;
      pushTrail(m, m.hx, m.hz, m.yaw);
      placeWormOnTrail(m);
    }
  }

  function separateMiniWorms() {
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < miniWorms.length; i += 1) {
        const a = miniWorms[i];
        if (!a.active || a.burrowing) continue;
        for (let j = i + 1; j < miniWorms.length; j += 1) {
          const b = miniWorms[j];
          if (!b.active || b.burrowing) continue;
          // 같은 큰방끼리만
          if (a.hall !== b.hall) continue;
          let dx = a.hx - b.hx;
          let dz = a.hz - b.hz;
          let d = Math.hypot(dx, dz);
          if (d < 1e-4) {
            dx = (Math.random() - 0.5) * 0.3;
            dz = (Math.random() - 0.5) * 0.3;
            d = Math.hypot(dx, dz) || 0.1;
          }
          if (d >= MINI_SEP) continue;
          const push = ((MINI_SEP - d) * 0.55) / d;
          const ha = collideMoveSoft(a.hx + dx * push, a.hz + dz * push, MINI_COL_R);
          const hb = collideMoveSoft(b.hx - dx * push, b.hz - dz * push, MINI_COL_R);
          a.hx = ha.x;
          a.hz = ha.z;
          b.hx = hb.x;
          b.hz = hb.z;
          clampMiniToHall(a);
          clampMiniToHall(b);
          const ang = Math.atan2(dx, dz);
          a.yaw = approachAngle(a.yaw, ang, 0.4);
          b.yaw = approachAngle(b.yaw, ang + Math.PI, 0.4);
        }
      }
    }
  }

  function clearWorms() {
    clearMiniWorms();
    clearBait();
    while (wormRoot.children.length) {
      wormRoot.remove(wormRoot.children[0]);
    }
    worms.length = 0;
    clearCoinDrops();
  }

  function resetWorms() {
    clearWorms();
  }

  // ---- 웜코인: 메인 씬(안개 적용) + 감지기 켜면 하양/안개무시 ----
  const coinRoot = new THREE.Group();
  scene.add(coinRoot);
  const coinDrops = [];
  let coinSpawnAcc = 0;
  const COIN_SPAWN_SEC = 5;
  const COIN_MIN_DIST = CELL * 2.2;
  const COIN_PICK_R = 1.7;
  const COIN_SIZE = 1.6;
  const MAGNET_RANGE = CELL * 2.4; // 조금 근처
  const MAGNET_SPEED = 2.1; // 천천히 끌림
  const IMG_TEX_MAX = 2048; // 어떤 크기 원본이든 이 안으로 맞춤
  const coinPlaneGeo = new THREE.PlaneGeometry(1, 1);
  let coinSharedMat = null;
  let storageCoinMat = null;
  // 저장고 특수 코인: Restriction Coin (리스트릭션 코인)

  function makeFallbackCoinTexture() {
    const s = 128;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, s, s);
    const cx = s * 0.5;
    const cy = s * 0.5;
    const r = 52;
    function hexPath(rad) {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    const cols = ['#c8e060', '#d8f070', '#b8c040', '#a09030', '#e06070', '#d8e850'];
    for (let i = 0; i < 6; i += 1) {
      const a0 = -Math.PI / 2 + (i * Math.PI) / 3;
      const a1 = a0 + Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      ctx.closePath();
      ctx.fillStyle = cols[i];
      ctx.fill();
    }
    hexPath(r * 0.42);
    ctx.fillStyle = '#f090a8';
    ctx.fill();
    hexPath(r);
    ctx.strokeStyle = '#101010';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 14, cy - 18, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#101010';
    ctx.lineWidth = 2;
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    tex.userData.aspect = 1;
    return tex;
  }

  /** 어떤 해상도 이미지든 면(텍스처)으로 로드 ? 너무 크면 축소 */
  function imageToTexture(image, opts) {
    const punchBlack = !(opts && opts.punchBlack === false);
    let w = image.naturalWidth || image.width || 0;
    let h = image.naturalHeight || image.height || 0;
    if (!w || !h) return null;
    const scale = Math.min(1, IMG_TEX_MAX / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d", { willReadFrequently: punchBlack });
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(image, 0, 0, cw, ch);
    if (punchBlack) {
      const img = ctx.getImageData(0, 0, cw, ch);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] <= 10 && d[i + 1] <= 10 && d[i + 2] <= 10) d[i + 3] = 0;
      }
      ctx.putImageData(img, 0, 0);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    tex.userData.aspect = cw / ch;
    return tex;
  }

  function punchBlackToAlpha(image) {
    return imageToTexture(image, { punchBlack: true }) || makeFallbackCoinTexture();
  }

  function makeCoinMaterial(map) {
    const mat = new THREE.MeshBasicMaterial({
      map: map,
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    mat.fog = true;
    mat.userData.aspect =
      (map && map.userData && map.userData.aspect) || 1;
    return mat;
  }

  function coinAspectOf(mat) {
    if (mat && mat.userData && mat.userData.aspect) return mat.userData.aspect;
    if (mat && mat.map && mat.map.userData && mat.map.userData.aspect) {
      return mat.map.userData.aspect;
    }
    return 1;
  }

  function fitCoinPlane(mesh, mat) {
    if (!mesh) return;
    const aspect = coinAspectOf(mat);
    const w = aspect >= 1 ? COIN_SIZE : COIN_SIZE * aspect;
    const h = aspect >= 1 ? COIN_SIZE / aspect : COIN_SIZE;
    mesh.scale.set(w, h, 1);
  }

  function applyCoinTexture(tex) {
    if (!tex) tex = makeFallbackCoinTexture();
    if (!tex.userData) tex.userData = {};
    if (!tex.userData.aspect && tex.image) {
      const iw = tex.image.width || 1;
      const ih = tex.image.height || 1;
      tex.userData.aspect = iw / ih;
    }
    if (!coinSharedMat) {
      coinSharedMat = makeCoinMaterial(tex);
    } else {
      coinSharedMat.map = tex;
      coinSharedMat.userData.aspect = tex.userData.aspect || 1;
      coinSharedMat.needsUpdate = true;
    }
    if (storageCoinMat) {
      storageCoinMat.map = tex;
      storageCoinMat.userData.aspect = tex.userData.aspect || 1;
      storageCoinMat.needsUpdate = true;
    } else if (coinSharedMat) {
      getRestrictionCoinMat();
    }
    syncCoinFogVisual();
    for (let i = 0; i < coinDrops.length; i += 1) {
      const d = coinDrops[i];
      if (!d.coin) continue;
      d.coin.material =
        d.kind === "restriction" ? getRestrictionCoinMat() : coinSharedMat;
      fitCoinPlane(d.coin, d.coin.material);
    }
  }

  function syncHideDetectorVisual() {
    // 감지기 ON: 가짜 틈새만 조금 어둡게 (일반 틈새와 구분)
    for (let i = 0; i < fakeHides.length; i += 1) {
      const fh = fakeHides[i];
      if (fh.shellMat) {
        if (detectorOn) {
          fh.shellMat.color.setHex(0x8f8274);
          fh.shellMat.fog = false;
        } else {
          fh.shellMat.color.setHex(0xffffff);
          fh.shellMat.fog = true;
        }
        fh.shellMat.needsUpdate = true;
      }
      if (fh.darkMat) {
        if (detectorOn) {
          fh.darkMat.color.setHex(0x07050a);
          fh.darkMat.fog = false;
        } else {
          fh.darkMat.color.setHex(0x141018);
          fh.darkMat.fog = true;
        }
        fh.darkMat.needsUpdate = true;
      }
    }
  }

  function syncCoinFogVisual() {
    if (!coinSharedMat) return;
    if (detectorOn) {
      // 감지 ON: 하양 + 안개 무시
      coinSharedMat.fog = false;
      coinSharedMat.color.setHex(0xffffff);
    } else {
      // 감지 OFF: 안개에 가려짐
      coinSharedMat.fog = true;
      coinSharedMat.color.setHex(0xffffff);
    }
    coinSharedMat.needsUpdate = true;
    if (storageCoinMat) {
      storageCoinMat.fog = !detectorOn;
      storageCoinMat.color.setHex(detectorOn ? 0xddbbff : 0xb44dff);
      storageCoinMat.needsUpdate = true;
    }
  }

  function getRestrictionCoinMat() {
    if (!coinSharedMat) applyCoinTexture(makeFallbackCoinTexture());
    if (!storageCoinMat) {
      storageCoinMat = coinSharedMat.clone();
      storageCoinMat.color.setHex(0xb44dff);
      storageCoinMat.fog = true;
      storageCoinMat.userData.aspect =
        (coinSharedMat.userData && coinSharedMat.userData.aspect) || 1;
    }
    return storageCoinMat;
  }

  function loadCoinTexture() {
    const finish = (img) => {
      try {
        applyCoinTexture(punchBlackToAlpha(img));
      } catch (err) {
        applyCoinTexture(makeFallbackCoinTexture());
      }
    };
    const domImg = document.querySelector('#worm-balance img.shop-worm-icon');
    if (domImg && domImg.complete && domImg.naturalWidth > 0) {
      finish(domImg);
      return;
    }
    const img = new Image();
    img.onload = () => finish(img);
    img.onerror = () => applyCoinTexture(makeFallbackCoinTexture());
    img.src = new URL('./images/dnja.png', window.location.href).href;
    if (domImg) {
      domImg.addEventListener('load', () => {
        if (domImg.naturalWidth > 0) finish(domImg);
      }, { once: true });
    }
  }

  applyCoinTexture(makeFallbackCoinTexture());
  loadCoinTexture();

  function coinTargetCount() {
    let open = 0;
    for (let z = 2; z < mazeRows - 1; z += 1) {
      const row = cells[z];
      if (!row) continue;
      for (let x = 1; x < MW - 1; x += 1) if (row[x]) open += 1;
    }
    const byDensity = Math.floor(open / 5);
    return Math.max(90, Math.min(260, byDensity));
  }

  function isCoinSpotFree(x, z) {
    for (let i = 0; i < coinDrops.length; i += 1) {
      if (Math.hypot(coinDrops[i].x - x, coinDrops[i].z - z) < COIN_MIN_DIST) {
        return false;
      }
    }
    return true;
  }

  function makeCoinDrop(x, z, opts) {
    const kind = (opts && opts.kind) || "normal";
    const hall = (opts && opts.hall) || null;
    const name =
      (opts && opts.name) ||
      (kind === "restriction" ? "Restriction Coin" : null);
    const group = new THREE.Group();
    group.position.set(x, 1.25, z);
    if (!coinSharedMat) applyCoinTexture(makeFallbackCoinTexture());
    const mat = kind === "restriction" ? getRestrictionCoinMat() : coinSharedMat;
    const coin = new THREE.Mesh(coinPlaneGeo, mat);
    coin.renderOrder = 10;
    coin.frustumCulled = false;
    fitCoinPlane(coin, mat);
    group.add(coin);
    coinRoot.add(group);
    const drop = {
      mesh: group,
      coin,
      x,
      z,
      spin: Math.random() * Math.PI * 2,
      kind,
      hall,
      name,
    };
    coinDrops.push(drop);
    return drop;
  }

  function ensureStorageCoins() {
    for (let i = 0; i < halls.length; i += 1) {
      const h = halls[i];
      if (h.kind !== "storage" || h.storageLooted) continue;
      let has = false;
      for (let c = 0; c < coinDrops.length; c += 1) {
        if (coinDrops[c].kind === "restriction" && coinDrops[c].hall === h) {
          has = true;
          break;
        }
      }
      if (has) continue;
      const p = hallCenterWorld(h);
      makeCoinDrop(p.x, p.z, {
        kind: "restriction",
        hall: h,
        name: "Restriction Coin",
      });
    }
  }

  function removeCoinDrop(i) {
    const d = coinDrops[i];
    if (!d) return;
    coinRoot.remove(d.mesh);
    coinDrops.splice(i, 1);
  }

  function clearCoinDrops() {
    while (coinDrops.length) removeCoinDrop(0);
    coinSpawnAcc = 0;
  }

  function seedCoinsEvenly(target) {
    if (mazeRows < 4) return;
    const opens = [];
    for (let z = 2; z < mazeRows - 1; z += 1) {
      const row = cells[z];
      if (!row) continue;
      for (let x = 1; x < MW - 1; x += 1) {
        if (!row[x]) continue;
        const h = hallAt(x, z);
        if (h && h.kind === "storage") continue; // 저장고는 특수 코인만
        opens.push(worldFromCell(x, z));
      }
    }
    if (!opens.length) return;
    opens.sort((a, b) => a.z - b.z || a.x - b.x);
    const need = Math.max(0, target - coinDrops.length);
    if (need <= 0) return;
    const step = Math.max(1, Math.floor(opens.length / need));
    let placed = 0;
    for (let i = 0; i < opens.length && placed < need; i += step) {
      const jitter = opens[Math.min(opens.length - 1, i + ((Math.random() * step) | 0))];
      const p = jitter || opens[i];
      if (!isCoinSpotFree(p.x, p.z)) continue;
      makeCoinDrop(p.x, p.z);
      placed += 1;
    }
    for (let i = 0; i < opens.length && coinDrops.length < target; i += 1) {
      if (opens[i].z > mazeOriginZ + CELL * 18) break;
      if (!isCoinSpotFree(opens[i].x, opens[i].z)) continue;
      makeCoinDrop(opens[i].x, opens[i].z);
    }
  }

  function pickRandomOpenCellPos() {
    if (mazeRows < 4) return null;
    for (let tries = 0; tries < 80; tries += 1) {
      const cz = 2 + ((Math.random() * (mazeRows - 3)) | 0);
      const cx = 1 + ((Math.random() * (MW - 2)) | 0);
      if (cells[cz] && cells[cz][cx]) {
        const h = hallAt(cx, cz);
        if (h && h.kind === "storage") continue;
        const p = worldFromCell(cx, cz);
        if (isCoinSpotFree(p.x, p.z)) return p;
      }
    }
    return null;
  }

  function ensureCoinPopulation() {
    const target = coinTargetCount();
    if (coinDrops.length >= target) return;
    if (coinDrops.length < target * 0.55) seedCoinsEvenly(target);
    while (coinDrops.length < target) {
      const p = pickRandomOpenCellPos();
      if (!p) break;
      makeCoinDrop(p.x, p.z);
    }
  }

  function hasClearCoinPath(fromX, fromZ, toX, toZ) {
    const dist = Math.hypot(toX - fromX, toZ - fromZ);
    if (dist < 0.05) return true;
    const steps = Math.max(2, Math.ceil(dist / (CELL * 0.22)));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const x = fromX + (toX - fromX) * t;
      const z = fromZ + (toZ - fromZ) * t;
      const cell = cellFromWorld(x, z);
      if (!isWalkableCell(cell.cx, cell.cz)) return false;
    }
    return true;
  }

  function updateCoinDrops(dt) {
    ensureStorageCoins();
    ensureCoinPopulation();
    coinSpawnAcc += dt;
    if (coinSpawnAcc >= COIN_SPAWN_SEC) {
      coinSpawnAcc = 0;
      const target = coinTargetCount();
      if (coinDrops.length < target) {
        const p = pickRandomOpenCellPos();
        if (p) makeCoinDrop(p.x, p.z);
      }
    }
    if (coinSharedMat) syncCoinFogVisual();

    const magnetActive =
      magnetOn && isEquipped("magnet") && isInMaze();

    for (let i = coinDrops.length - 1; i >= 0; i -= 1) {
      const d = coinDrops[i];
      d.spin += dt * 2.8;
      // 항상 카메라 면으로 보이게 (크기·각도 상관없이)
      d.mesh.quaternion.copy(camera.quaternion);
      d.coin.rotation.set(0, 0, d.spin * 0.45);
      d.mesh.position.y = 1.25 + Math.sin(d.spin * 2.2) * 0.14;

      if (magnetActive) {
        const dx = pos.x - d.x;
        const dz = pos.z - d.z;
        const dist = Math.hypot(dx, dz);
        if (
          dist > 0.08 &&
          dist < MAGNET_RANGE &&
          hasClearCoinPath(pos.x, pos.z, d.x, d.z)
        ) {
          const step = Math.min(dist, MAGNET_SPEED * dt);
          d.x += (dx / dist) * step;
          d.z += (dz / dist) * step;
          d.mesh.position.x = d.x;
          d.mesh.position.z = d.z;
        }
      }

      const pickDist = Math.hypot(pos.x - d.x, pos.z - d.z);
      if (pickDist < COIN_PICK_R) {
        if (d.kind === "restriction" && d.hall) {
          d.hall.storageLooted = true;
          triggerStorageEggs(d.hall);
          restrictionCoinUnlocked = true;
          restrictionBalance += 1;
          syncRestrictionBalanceUi();
        } else {
          wormBalance += 1;
          syncWormBalanceUi();
        }
        removeCoinDrop(i);
      }
    }
  }

  function collideMoveSoft(nx, nz, r) {
    for (let i = 0; i < colliders.length; i += 1) {
      const c = colliders[i];
      const nearX = Math.max(c.minX, Math.min(nx, c.maxX));
      const nearZ = Math.max(c.minZ, Math.min(nz, c.maxZ));
      let dx = nx - nearX;
      let dz = nz - nearZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= r * r) continue;
      if (distSq < 1e-8) {
        const left = nx - c.minX;
        const right = c.maxX - nx;
        const near = nz - c.minZ;
        const far = c.maxZ - nz;
        const m = Math.min(left, right, near, far);
        if (m === left) nx = c.minX - r;
        else if (m === right) nx = c.maxX + r;
        else if (m === near) nz = c.minZ - r;
        else nz = c.maxZ + r;
        continue;
      }
      const dist = Math.sqrt(distSq);
      const push = (r - dist) / dist;
      nx += dx * push;
      nz += dz * push;
    }
    return { x: nx, z: nz };
  }

  function ensureWorms() {
    if (mazeRows < 8) return;
    const WORM_COUNT = 1;
    while (worms.length < WORM_COUNT) {
      const row =
        4 + (((worms.length * 17 + 3) % Math.max(1, mazeRows - 8)) | 0);
      spawnWorm(mazeOriginZ + row * CELL);
    }
  }

  function separateWorms() {
    // 여러 번 밀어 겹침을 확실히 해소
    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i < worms.length; i += 1) {
        const a = worms[i];
        if (!a.active) continue;
        for (let j = i + 1; j < worms.length; j += 1) {
          const b = worms[j];
          if (!b.active) continue;
          let dx = a.hx - b.hx;
          let dz = a.hz - b.hz;
          let d = Math.hypot(dx, dz);
          if (d < 1e-4) {
            dx = (Math.random() - 0.5) * 0.4;
            dz = (Math.random() - 0.5) * 0.4;
            d = Math.hypot(dx, dz) || 0.1;
          }
          if (d >= WORM_SEP) continue;
          const push = ((WORM_SEP - d) * 0.55) / d;
          const ax = a.hx + dx * push;
          const az = a.hz + dz * push;
          const bx = b.hx - dx * push;
          const bz = b.hz - dz * push;
          const ha = collideMoveSoft(ax, az, WORM_COL_R);
          const hb = collideMoveSoft(bx, bz, WORM_COL_R);
          a.hx = ha.x;
          a.hz = ha.z;
          b.hx = hb.x;
          b.hz = hb.z;
          // 서로 반대 방향으로 틀어 다시 안 붙게
          const ang = Math.atan2(dx, dz);
          a.yaw = approachAngle(a.yaw, ang, 0.35);
          b.yaw = approachAngle(b.yaw, ang + Math.PI, 0.35);
        }
      }
    }
  }

  function updateWorms(dt) {
    ensureWorms();

    for (let wi = 0; wi < worms.length; wi += 1) {
      const w = worms[wi];
      if (!w.active) continue;
      w.group.visible = true;
      w.phase += dt * Math.PI * 2 * WORM_WRIGGLE_HZ;

      if (w.mat) {
        const near =
          detectorOn &&
          Math.hypot(pos.x - w.hx, pos.z - w.hz) < DETECT_RANGE;
        w.mat.fog = !near;
        w.mat.emissive.setHex(near ? 0x66ff88 : 0x000000);
        w.mat.emissiveIntensity = near ? 1.4 : 0;
        w.mat.needsUpdate = true;
      }

      const toPlayerX = pos.x - w.hx;
      const toPlayerZ = pos.z - w.hz;
      const dist = Math.hypot(toPlayerX, toPlayerZ);
      const lobby = isInLobby();
      const playerHall = isPlayerInAnyHall();
      if ((w.keepGoingT || 0) > 0) w.keepGoingT -= dt;
      const keepGoing = (w.keepGoingT || 0) > 0;
      if (w._wasKeepGoing && !keepGoing) {
        w.pathT = 0;
        w.wanderGoal = null;
      }
      w._wasKeepGoing = keepGoing;
      const crouchHidden = isCrouching() && !wormCanSeePlayer(w);
      const inHide = isInHideSpot();
      const inHole = isInHole();
      const heardBait = nearestHeardBait(w);
      const hearingBait = !!heardBait;
      if (hearingBait) {
        if (w.baitTarget !== heardBait) {
          w.baitTarget = heardBait;
          w.baitListenT = 0;
          w.pathT = 0;
        }
        w.baitListenT = (w.baitListenT || 0) + dt;
        if (w.baitListenT >= BAIT_LISTEN_NEED) {
          removeBait(heardBait);
          w.baitListenT = 0;
          w.baitTarget = null;
          w.pathT = 0;
        }
      } else {
        w.baitListenT = 0;
        w.baitTarget = null;
      }
      const noChase =
        devMode ||
        lobby ||
        playerHall ||
        keepGoing ||
        crouchHidden ||
        inHide ||
        inHole ||
        (paintOn && !hearingBait) ||
        hearingBait;

      if (
        !devMode &&
        !lobby &&
        !playerHall &&
        !inHole &&
        !bitten &&
        !keepGoing &&
        playerInvulnT <= 0 &&
        dist < WORM_CATCH &&
        fogBlend > 0.55
      ) {
        if (paintOn) {
          // 닿으면 은신 발각
          breakPaint();
        }
        // 틈새에 있어도 닿으면 물림
        if (!paintOn) startBite(w);
      }

      // 로비/큰방/은신/틈새/굴/웅크리기/미끼 전환 시 경로 갱신
      const hideKey = crouchHidden || paintOn || inHide || inHole || hearingBait;
      if (
        w.wasLobby !== lobby ||
        w.wasPlayerHall !== playerHall ||
        w.wasCrouchHide !== hideKey
      ) {
        w.wasLobby = lobby;
        w.wasPlayerHall = playerHall;
        w.wasCrouchHide = hideKey;
        if (!keepGoing) {
          w.wanderGoal = null;
          w.pathT = 0;
        }
      }

      // 미로 최단경로: 끌면 큰방 / 미끼 / 배회 조건 / 추적
      w.pathT -= dt;
      if (!w.path) w.path = [];
      // 탈출 후 5초: 남은 경로가 있으면 그대로 가고, 끝나면 배회로만 갱신
      if (keepGoing) {
        if (w.pathI >= w.path.length) {
          w.aggro = false;
          w.wanderGoal = pickWormWanderGoal(w.hx, w.hz);
          w.path = findMazePathWorld(w.hx, w.hz, w.wanderGoal.x, w.wanderGoal.z);
          w.pathI = 0;
          w.pathT = 0.35;
        }
      } else if (w.pathT <= 0 || w.pathI >= w.path.length) {
        refreshWormPath(w);
      }
      const reachR = CELL * 0.4;
      while (w.pathI < w.path.length) {
        const wp = w.path[w.pathI];
        if (Math.hypot(wp.x - w.hx, wp.z - w.hz) > reachR) break;
        w.pathI += 1;
      }

      let wantYaw = w.yaw;
      if (w.pathI < w.path.length) {
        const wp = w.path[w.pathI];
        wantYaw = Math.atan2(wp.x - w.hx, wp.z - w.hz);
      } else if (w.dragging && w.dragHall) {
        const goal = hallCenterWorld(w.dragHall);
        wantYaw = Math.atan2(goal.x - w.hx, goal.z - w.hz);
      } else if (hearingBait && heardBait) {
        wantYaw = Math.atan2(heardBait.x - w.hx, heardBait.z - w.hz);
      } else if (!noChase && !bitten && dist > 0.15) {
        wantYaw = Math.atan2(toPlayerX, toPlayerZ);
      }
      const targetSpd = w.dragging ? WORM_SPEED * 1.45 : WORM_SPEED;

      wantYaw += Math.sin(w.phase) * WORM_WRIGGLE * (w.dragging ? 0.05 : 0.45);
      w.yaw = approachAngle(
        w.yaw,
        wantYaw,
        WORM_TURN * (w.dragging ? 1.6 : 1) * dt
      );

      if (w.speed < targetSpd) {
        w.speed = Math.min(targetSpd, w.speed + WORM_ACCEL * dt);
      } else {
        w.speed = Math.max(targetSpd, w.speed - WORM_ACCEL * dt);
      }
      w.speed = Math.max(WORM_MIN_SPEED, w.speed);

      const fx = Math.sin(w.yaw);
      const fz = Math.cos(w.yaw);
      // 끌기 중엔 충돌 반지름을 줄여 코너에서 덜 끼임
      const colR = w.dragging ? Math.min(WORM_COL_R, CELL * 0.3) : WORM_COL_R;

      const look = 1.1;
      const probe = collideMoveSoft(w.hx + fx * look, w.hz + fz * look, colR);
      const blocked =
        Math.hypot(probe.x - (w.hx + fx * look), probe.z - (w.hz + fz * look)) > 0.08;
      if (blocked) {
        w.pathT = 0; // 막히면 바로 경로 재계산
        if (!w.dragging) {
          const side = Math.sin(w.phase * 0.7 + wi) > 0 ? 1 : -1;
          w.yaw += side * 0.9 * dt;
        }
      }

      let nx = w.hx + Math.sin(w.yaw) * w.speed * dt;
      let nz = w.hz + Math.cos(w.yaw) * w.speed * dt;
      const prevX = w.hx;
      const prevZ = w.hz;
      // 축 분리 충돌 — 코너/벽 뚫림 방지
      const hitX = collideMoveSoft(nx, w.hz, colR);
      w.hx = hitX.x;
      const hitZ = collideMoveSoft(w.hx, nz, colR);
      w.hz = hitZ.z;

      // 통로 밖·굴·틈새면 거부하고 가까운 통로로
      const cell = cellFromWorld(w.hx, w.hz);
      if (!isWormWalkableCell(cell.cx, cell.cz)) {
        w.hx = prevX;
        w.hz = prevZ;
        w.pathT = 0;
        if (!w.dragging) {
          w.yaw += (Math.sin(w.phase * 0.7 + wi) > 0 ? 1 : -1) * 1.1 * dt;
        }
      } else if (Math.hypot(w.hx - nx, w.hz - nz) > 0.001) {
        w.pathT = Math.min(w.pathT, 0.05);
        if (!w.dragging) {
          w.yaw += (Math.sin(w.phase * 0.7 + wi) > 0 ? 1 : -1) * 0.9 * dt;
        }
      }

      const moved = Math.hypot(w.hx - prevX, w.hz - prevZ);
      const wantMove = w.speed * dt;
      if (wantMove > 0.02 && moved < wantMove * 0.12) {
        w.stuckT = (w.stuckT || 0) + dt;
      } else {
        w.stuckT = Math.max(0, (w.stuckT || 0) - dt * 1.5);
      }
      if ((w.stuckT || 0) >= WORM_STUCK_SEC) {
        if (w.dragging && w.dragHall) {
          // 끌기 중 끼면 다음 웨이포인트로 살짝 점프해 앞으로 진행
          if (w.path && w.path.length && w.pathI < w.path.length) {
            const skip = Math.min(w.path.length - 1, w.pathI + 2);
            const wp = w.path[skip];
            const cleared = collideMoveSoft(wp.x, wp.z, colR);
            w.hx = cleared.x;
            w.hz = Math.max(cleared.z, HALF + CELL * 1.5);
            w.pathI = skip;
          } else {
            const nc = nearestWalkableCell(
              cellFromWorld(w.hx, w.hz).cx,
              cellFromWorld(w.hx, w.hz).cz
            );
            const p = worldFromCell(nc.cx, nc.cz);
            const cleared = collideMoveSoft(p.x, p.z, colR);
            w.hx = cleared.x;
            w.hz = Math.max(cleared.z, HALF + CELL * 1.5);
          }
          w.stuckT = 0;
          refreshWormPath(w);
        } else {
          snapWormToWalkable(w);
          continue;
        }
      }

      if (w.hz < HALF + CELL * 0.85) {
        w.yaw = 0;
        w.hz = HALF + CELL;
      }

      if (w.hz < HALF + 0.35) {
        respawnWormInMaze(w);
        continue;
      }

      pushTrail(w, w.hx, w.hz, w.yaw);
      placeWormOnTrail(w);

      const anchorZ = Math.max(pos.z, HALF + CELL * 4);
      if (w.hz < anchorZ - CELL * 28 || dist > CELL * 36) {
        respawnWormInMaze(w, anchorZ + CELL * 10);
      }
    }

    separateWorms();
    for (let wi = 0; wi < worms.length; wi += 1) {
      const w = worms[wi];
      if (!w.active) continue;
      // 분리 후에도 벽 여유 유지
      const cleared = collideMoveSoft(w.hx, w.hz, WORM_COL_R);
      w.hx = cleared.x;
      w.hz = cleared.z;
      w.speed = Math.max(WORM_MIN_SPEED, w.speed);
      if (w.hz < HALF + 0.35) {
        respawnWormInMaze(w);
        continue;
      }
      pushTrail(w, w.hx, w.hz, w.yaw);
      placeWormOnTrail(w);
    }

    updateGravelProximityAudio();
  }

  function respawnWormInMaze(w, preferZ) {
    const zHint =
      preferZ != null
        ? preferZ
        : Math.max(mazeOriginZ + CELL * 8, (pos.z > HALF ? pos.z : mazeOriginZ) + CELL * 10);
    const p = findOpenCellNear(zHint);
    const cleared = collideMoveSoft(p.x, p.z, WORM_COL_R);
    w.hx = cleared.x;
    w.hz = Math.max(cleared.z, HALF + CELL * 1.5);
    w.yaw = Math.random() * Math.PI * 2;
    w.speed = Math.max(WORM_MIN_SPEED, WORM_SPEED * 0.9);
    w.aggro = true;
    w.path = [];
    w.pathI = 0;
    w.pathT = 0;
    w.wanderGoal = null;
    w.wasLobby = isInLobby();
    w.wasPlayerHall = isPlayerInAnyHall();
    w.wasCrouchHide = false;
    w.keepGoingT = 0;
    w._wasKeepGoing = false;
    w.stuckT = 0;
    initWormTrail(w, w.hx, w.hz, w.yaw);
    placeWormOnTrail(w);
  }

  function applyCaveFog(t) {
    // 개발 모드: 안개 없음 (비네팅·채도 설정과 별개)
    const fogT = devMode ? 0 : t;
    fogCol.copy(roomFogColor).lerp(caveFogColor, fogT);
    scene.background.copy(fogCol);

    if (devMode) {
      scene.fog.near = 800;
      scene.fog.far = 2000;
      if (caveFogEl) caveFogEl.style.opacity = "0";
      hemi.intensity = 0.95;
      sun.intensity = 0.5;
      roomFill.intensity = 0.5;
      hemi.color.copy(hemiColA);
      hemi.groundColor.copy(hemiColB);
      sun.color.copy(sunColRoom);
      roomFill.color.copy(fillColRoom);
      return;
    }

    // 손전등 켜면 안개가 살짝 옅어짐 (더 멀리 보임)
    const clear = flashlightOn ? 0.45 : 0;
    let fogNear = 28 + (1.2 - 28) * fogT;
    let fogFar = 90 + (8 - 90) * fogT;
    fogNear = fogNear + (12 - fogNear) * clear * fogT;
    fogFar = fogFar + (28 - fogFar) * clear * fogT;

    // 플레이어(카메라) 기준 안개
    scene.fog.near = fogNear;
    scene.fog.far = fogFar;

    if (caveFogEl) {
      // 미로에선 가장자리 깊이감 조금 더
      const base = fogT * 0.34;
      caveFogEl.style.opacity = String(base * (1 - clear * 0.55));
    }

    const dark = 0.39;
    hemi.intensity = 0.85 * (1 - fogT * dark);
    sun.intensity = 0.4 * (1 - fogT * dark);
    roomFill.intensity = 0.4 * (1 - fogT * dark);
    hemi.color.copy(hemiColA).lerp(hemiCaveA, fogT * 0.5);
    hemi.groundColor.copy(hemiColB).lerp(hemiCaveB, fogT * 0.5);
    sun.color.copy(sunColRoom).lerp(sunColCave, fogT * 0.5);
    roomFill.color.copy(fillColRoom).lerp(fillColCave, fogT * 0.5);
  }

  const ctrlPicEls = Array.from(document.querySelectorAll("[data-code]"));

  function syncCtrlPics() {
    for (let i = 0; i < ctrlPicEls.length; i += 1) {
      const el = ctrlPicEls[i];
      const codes = (el.getAttribute("data-code") || "").split(/\s+/);
      let on = false;
      for (let c = 0; c < codes.length; c += 1) {
        const code = codes[c];
        if (!code) continue;
        if (code === "MouseRight") on = !!rmbDown;
        else if (
          shiftToggleEnabled &&
          crouchToggled &&
          (code === "ShiftLeft" || code === "ShiftRight")
        ) {
          on = true;
        } else if (keys[code]) on = true;
        if (on) break;
      }
      el.classList.toggle("pressed", on);
    }
  }

  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (
      shiftToggleEnabled &&
      !e.repeat &&
      (e.code === "ShiftLeft" || e.code === "ShiftRight") &&
      !bitten &&
      !isRagdoll() &&
      !paintOn
    ) {
      crouchToggled = !crouchToggled;
    }
    syncCtrlPics();
    if (bitten && e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) tryEscapeStop();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
    syncCtrlPics();
  });

  window.__useSkillAt = (slot) => useSkillAt(slot);

  window.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      onShovelLeftClick();
    }
    if (e.button === 2) {
      rmbDown = true;
      lastMX = e.clientX;
      lastMY = e.clientY;
      syncCtrlPics();
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
      rmbDown = false;
      syncCtrlPics();
    }
  });
  window.addEventListener("blur", () => {
    rmbDown = false;
    for (const k of Object.keys(keys)) keys[k] = false;
    syncCtrlPics();
  });
  window.addEventListener("contextmenu", (e) => {
    if (e.target && e.target.closest && e.target.closest("#shop-panel")) return;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!rmbDown || bitten || isRagdoll()) return;
    const dx = e.clientX - lastMX;
    const dy = e.clientY - lastMY;
    lastMX = e.clientX;
    lastMY = e.clientY;
    yaw -= dx * lookSens;
    pitch -= dy * lookSens;
    if (pitch > PITCH_LIM) pitch = PITCH_LIM;
    if (pitch < -PITCH_LIM) pitch = -PITCH_LIM;
  });

  // ---- 미스터리 BGM ----
  let audioCtx = null;
  let bgmReady = false;
  let masterGain = null;
  let windGain = null;
  let droneFilter = null;
  let gravelGain = null;
  let gravelReady = false;
  const BGM_VOL_CAVE = 0.26;
  const GRAVEL_HEAR = 12; // 이 거리 안이면 자갈 소리
  const GRAVEL_VOL_MAX = 0.07;

  function startGravelAudio() {
    if (!audioCtx || gravelReady) return;
    gravelReady = true;
    const sr = audioCtx.sampleRate;
    const len = sr * 2;
    const buf = audioCtx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    // 거친 자갈/모래 느낌의 노이즈 + 드문 클릭
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.92 + white * 0.08;
      let v = last * 0.65 + white * 0.2;
      if (Math.random() < 0.012) v += (Math.random() * 2 - 1) * 0.55;
      data[i] = v * 0.9;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 920;
    bp.Q.value = 0.7;
    const hp = audioCtx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 280;
    gravelGain = audioCtx.createGain();
    gravelGain.gain.value = 0;
    src.connect(hp);
    hp.connect(bp);
    bp.connect(gravelGain);
    gravelGain.connect(audioCtx.destination);
    src.start();
  }

  function updateGravelProximityAudio() {
    if (!audioCtx || !gravelGain) return;
    let nearest = Infinity;
    for (let i = 0; i < worms.length; i += 1) {
      const w = worms[i];
      if (!w.active) continue;
      const d = Math.hypot(pos.x - w.hx, pos.z - w.hz);
      if (d < nearest) nearest = d;
    }
    let vol = 0;
    if (nearest < GRAVEL_HEAR) {
      const t = 1 - nearest / GRAVEL_HEAR;
      vol = GRAVEL_VOL_MAX * t * t;
    }
    const now = audioCtx.currentTime;
    gravelGain.gain.setTargetAtTime(vol, now, 0.12);
  }

  function startBgmEngine() {
    if (bgmReady) {
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      startGravelAudio();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    bgmReady = true;
    audioCtx = new AC();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioCtx.destination);

    function addDrone(freq, type, level, detune) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = type;
      osc.frequency.value = freq;
      if (detune) osc.detune.value = detune;
      filter.type = "lowpass";
      filter.frequency.value = 320;
      gain.gain.value = level;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start();
      return filter;
    }

    droneFilter = addDrone(49, "sine", 0.22);
    addDrone(73.4, "triangle", 0.07, 6);
    addDrone(98, "sine", 0.05, -4);

    const nLen = audioCtx.sampleRate * 3;
    const nBuf = audioCtx.createBuffer(1, nLen, audioCtx.sampleRate);
    const nData = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i += 1) nData[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    noise.buffer = nBuf;
    noise.loop = true;
    const nFilter = audioCtx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 180;
    windGain = audioCtx.createGain();
    windGain.gain.value = 0.012;
    noise.connect(nFilter);
    nFilter.connect(windGain);
    windGain.connect(masterGain);
    noise.start();

    const motif = [196.0, 207.65, 233.08, 293.66, 311.13];
    function scheduleMotif() {
      if (!audioCtx) return;
      const t0 = audioCtx.currentTime;
      const freq = motif[(Math.random() * motif.length) | 0];
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.04, t0 + 1.4);
      gain.gain.linearRampToValueAtTime(0, t0 + 5.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 5.5);
      setTimeout(scheduleMotif, 3200 + Math.random() * 5200);
    }
    setTimeout(scheduleMotif, 1800);
    startGravelAudio();
  }

  function unlockBgm() {
    startBgmEngine();
  }
  window.addEventListener("keydown", unlockBgm);
  window.addEventListener("pointerdown", unlockBgm);

  function onResize() {
      const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", onResize);

  let last = performance.now();
  let wasInLobby = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const bootsMul = bootsOn ? BOOTS_SPEED_MUL : 1;
    const crouch = isCrouching();
    const crouchMul = crouch ? CROUCH_SPEED_MUL : 1;
    const legsMul = legSpeedMul();
    const base = MOVE_SPEED * crouchMul * legsMul;
    const speed = base * bootsMul * dt;
    const inputRight =
      bitten || isRagdoll() || clamCrushT > 0
        ? 0
        : (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const inputFwd =
      bitten || isRagdoll() || clamCrushT > 0
        ? 0
        : (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);

    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    if (playerInvulnT > 0) playerInvulnT = Math.max(0, playerInvulnT - dt);

    // 시야 높이: 다리 없음 → 쓰러짐 / Shift 웅크리기 / 굴 안에서는 낮게
    // 개발 모드 비행 중에는 눈높이 고정 안 함
    const inHole = isInHole();
    if (!devMode && !bitten && !isRagdoll() && clamCrushT <= 0) {
      let eyeTarget = EYE_H;
      if (isLegless()) eyeTarget = LEGLESS_EYE_H;
      else if (crouch || inHole) eyeTarget = CROUCH_EYE_H;
      pos.y += (eyeTarget - pos.y) * Math.min(1, 14 * dt);
    }

    if (!bitten && !isRagdoll() && clamCrushT <= 0) {
      let mx = rx * inputRight + fx * inputFwd;
      let mz = rz * inputRight + fz * inputFwd;
      const inputUp = devMode
        ? (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0)
        : 0;
      // 굴은 웅크리기(또는 다리 없음)로만 이동 (개발 비행은 예외)
      if (!devMode && inHole && !canPassHoleStance()) {
        mx = 0;
        mz = 0;
      }
      const mLen = Math.hypot(mx, mz);
      if (mLen > 1e-6) {
        mx /= mLen;
        mz /= mLen;
      }
      let nx = pos.x + mx * speed;
      let nz = pos.z + mz * speed;
      if (devMode) {
        pos.x = nx;
        pos.z = nz;
        if (inputUp) pos.y += inputUp * speed;
      } else {
        if (holeBlocksPlayerAt(nx, pos.z)) nx = pos.x;
        if (holeBlocksPlayerAt(pos.x, nz)) nz = pos.z;
        if (holeBlocksPlayerAt(nx, nz)) {
          nx = pos.x;
          nz = pos.z;
        }
        const hitX = collideMove(nx, pos.z);
        pos.x = hitX.x;
        const hitZ = collideMove(pos.x, nz);
        pos.z = hitZ.z;
      }
    }

    mazeTimer -= dt;
    if (mazeTimer <= 0) {
      endBite({ toss: false });
      ragdollT = 0;
      resetMazeAndPlayer();
        } else {
      updateTimerUi();
    }

    ensureMazeAhead(pos.z);
    updateBoots();
    updateBandage(dt);
    updateBait(dt);
    updateSprayFreehand();
    updateShovelOutlines();
    updateDigDust(dt);
    updateFakeHides(dt);
    syncHideUi();
    updateWorms(dt);
    updateSmallEggs(dt);
    updateMiniWorms(dt);
    updateBiteDrag();
    updateBiteQte(dt);
    updateRagdoll(dt);
    updateCoinDrops(dt);
    updateDetector(dt);
    updateCompass(dt);

    const wantFog = pos.z > HALF - 0.15 ? 1 : 0;
    if (fogBlend < wantFog) {
      fogBlend = Math.min(1, fogBlend + dt / FOG_FADE_SEC);
    } else if (fogBlend > wantFog) {
      fogBlend = Math.max(0, fogBlend - dt / FOG_FADE_SEC);
    }

    if (typeof window.__setLobbyUi === "function") {
      const inLobby = fogBlend < 0.25 && pos.z < HALF + 0.5;
      window.__setLobbyUi(inLobby);
      if (inLobby && !wasInLobby) {
        if (typeof window.__onEnterLobby === "function") window.__onEnterLobby();
      }
      if (!inLobby && wasInLobby) {
        if (typeof window.__onLeaveLobby === "function") window.__onLeaveLobby();
      }
      wasInLobby = inLobby;
    }

    if (masterGain && audioCtx) {
      const tAud = audioCtx.currentTime;
      masterGain.gain.setTargetAtTime(BGM_VOL_CAVE * fogBlend * soundVol, tAud, 0.35);
      if (droneFilter) {
        droneFilter.frequency.setTargetAtTime(320 - fogBlend * 140, tAud, 0.5);
      }
      if (windGain) {
        windGain.gain.setTargetAtTime(0.012 + fogBlend * 0.02, tAud, 0.5);
      }
    }

    if (devMode) {
      const needFar = Math.max(800, pos.z + 200);
      if (camera.far < needFar) {
        camera.far = needFar;
        camera.updateProjectionMatrix();
      }
    } else if (fogBlend < 0.2) {
      const needFar = pos.z + 80;
      if (camera.far < needFar) {
        camera.far = needFar;
        camera.updateProjectionMatrix();
      }
    }

    updatePlayerCamera();
    applyCaveFog(fogBlend);

    renderer.autoClear = true;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  onResize();
  applyCaveFog(0);
  if (caveFogEl) caveFogEl.style.opacity = "0";

  function applyUiSettings() {
    const helpOn = uiSettings.showHelp !== false;
    const radarOn = uiSettings.showRadar !== false;
    const fxOn = uiSettings.showFx !== false;
    uiSettings.showHelp = helpOn;
    uiSettings.showRadar = radarOn;
    uiSettings.showFx = fxOn;

    document.body.classList.toggle("ui-help-off", !helpOn);
    document.body.classList.toggle("ui-radar-off", !radarOn);
    document.body.classList.toggle("ui-fx-off", !fxOn);

    const helpEl = document.getElementById("ui-show-help");
    const radarEl = document.getElementById("ui-show-radar");
    const fxEl = document.getElementById("ui-show-fx");
    if (helpEl) helpEl.checked = helpOn;
    if (radarEl) radarEl.checked = radarOn;
    if (fxEl) fxEl.checked = fxOn;
  }

  function applyDevMoney() {
    if (!devMode) return;
    wormBalance = DEV_MONEY;
    restrictionBalance = DEV_MONEY;
    restrictionCoinUnlocked = true;
    syncWormBalanceUi();
    syncRestrictionBalanceUi();
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          sensPct: Math.round((lookSens / LOOK_SENS_BASE) * 100),
          volPct: Math.round(soundVol * 100),
          shake: !!shakeEnabled,
          shiftToggle: !!shiftToggleEnabled,
          ui: {
            showHelp: !!uiSettings.showHelp,
            showRadar: !!uiSettings.showRadar,
            showFx: !!uiSettings.showFx,
          },
        })
      );
    } catch (_) {}
  }

  function applySettingsFromUi() {
    const sensEl = document.getElementById("set-sens");
    const volEl = document.getElementById("set-vol");
    const shakeEl = document.getElementById("set-shake");
    const shiftToggleEl = document.getElementById("set-shift-toggle");
    const devEl = document.getElementById("set-dev");
    const sensVal = document.getElementById("set-sens-val");
    const volVal = document.getElementById("set-vol-val");
    if (sensEl) {
      const pct = Math.max(20, Math.min(200, Number(sensEl.value) || 100));
      lookSens = LOOK_SENS_BASE * (pct / 100);
      if (sensVal) sensVal.textContent = pct + "%";
    }
    if (volEl) {
      const pct = Math.max(0, Math.min(100, Number(volEl.value) || 0));
      soundVol = pct / 100;
      if (volVal) volVal.textContent = pct + "%";
      if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(
          BGM_VOL_CAVE * fogBlend * soundVol,
          audioCtx.currentTime,
          0.05
        );
      }
    }
    if (shakeEl) shakeEnabled = !!shakeEl.checked;
    if (shiftToggleEl) {
      const next = !!shiftToggleEl.checked;
      if (!next) crouchToggled = false;
      shiftToggleEnabled = next;
    }
    if (devEl) {
      const next = !!devEl.checked;
      const turnedOn = next && !devMode;
      const turnedOff = !next && devMode;
      devMode = next;
      if (turnedOn) {
        applyDevMoney();
        if (bitten) endBite({ toss: false });
        cancelClamCrushSafe();
        for (let i = 0; i < worms.length; i += 1) {
          worms[i].aggro = false;
          worms[i].pathT = 0;
        }
      }
      if (turnedOff && pos.y < EYE_H * 0.5) pos.y = EYE_H;
      syncDevCeilings();
      applyCaveFog(fogBlend);
    }

    const helpEl = document.getElementById("ui-show-help");
    const radarToggle = document.getElementById("ui-show-radar");
    const fxEl = document.getElementById("ui-show-fx");
    if (helpEl) uiSettings.showHelp = !!helpEl.checked;
    if (radarToggle) uiSettings.showRadar = !!radarToggle.checked;
    if (fxEl) uiSettings.showFx = !!fxEl.checked;

    applyUiSettings();
    saveSettings();
  }

  function resetAllSettings() {
    lookSens = LOOK_SENS_BASE;
    soundVol = 1;
    shakeEnabled = true;
    shiftToggleEnabled = false;
    crouchToggled = false;
    uiSettings = { ...UI_DEFAULTS };

    const sensEl = document.getElementById("set-sens");
    const volEl = document.getElementById("set-vol");
    const shakeEl = document.getElementById("set-shake");
    const shiftToggleEl = document.getElementById("set-shift-toggle");
    const devEl = document.getElementById("set-dev");
    if (sensEl) sensEl.value = "100";
    if (volEl) volEl.value = "100";
    if (shakeEl) shakeEl.checked = true;
    if (shiftToggleEl) shiftToggleEl.checked = false;
    if (devEl) devEl.checked = false;

    applySettingsFromUi();
  }

  function loadSettingsUi() {
    const sensEl = document.getElementById("set-sens");
    const volEl = document.getElementById("set-vol");
    const shakeEl = document.getElementById("set-shake");
    const shiftToggleEl = document.getElementById("set-shift-toggle");
    const devEl = document.getElementById("set-dev");
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    } catch (_) {
      data = null;
    }
    if (!data) {
      try {
        data = JSON.parse(localStorage.getItem("jaea_settings_v1") || "null");
      } catch (_) {
        data = null;
      }
    }
    if (data) {
      if (sensEl && data.sensPct != null) sensEl.value = String(data.sensPct);
      if (volEl && data.volPct != null) volEl.value = String(data.volPct);
      if (shakeEl && data.shake != null) shakeEl.checked = !!data.shake;
      if (shiftToggleEl) {
        shiftToggleEl.checked = !!data.shiftToggle;
      }
      if (devEl) devEl.checked = false;
      if (data.ui && typeof data.ui === "object") {
        uiSettings = {
          showHelp:
            data.ui.showHelp != null
              ? !!data.ui.showHelp
              : data.ui.showControls != null
                ? !!data.ui.showControls
                : true,
          showRadar: data.ui.showRadar != null ? !!data.ui.showRadar : true,
          showFx: data.ui.showFx != null ? !!data.ui.showFx : true,
        };
      }
    }
    applySettingsFromUi();

    if (sensEl) sensEl.addEventListener("input", applySettingsFromUi);
    if (volEl) volEl.addEventListener("input", applySettingsFromUi);
    if (shakeEl) shakeEl.addEventListener("change", applySettingsFromUi);
    if (shiftToggleEl) {
      shiftToggleEl.addEventListener("change", applySettingsFromUi);
    }
    if (devEl) devEl.addEventListener("change", applySettingsFromUi);

    ["ui-show-help", "ui-show-radar", "ui-show-fx"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", applySettingsFromUi);
    });

    const resetBtn = document.getElementById("settings-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetAllSettings);
    }

    document.querySelectorAll(".settings-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.getAttribute("data-stab");
        document.querySelectorAll(".settings-tab").forEach((t) => {
          t.classList.toggle("active", t === tab);
        });
        document.querySelectorAll(".settings-page").forEach((p) => {
          p.classList.toggle("hidden", p.getAttribute("data-spage") !== name);
        });
      });
    });

    const settingsOverlay = document.getElementById("settings-overlay");
    const settingsPanel = document.getElementById("settings-panel");
    const settingsBody = document.querySelector(".settings-body");
    function stopWheelBubble(e) {
      e.stopPropagation();
    }
    if (settingsOverlay) {
      settingsOverlay.addEventListener("wheel", stopWheelBubble, {
        passive: true,
      });
    }
    if (settingsPanel) {
      settingsPanel.addEventListener("wheel", stopWheelBubble, { passive: true });
    }
    if (settingsBody) {
      settingsBody.addEventListener("wheel", stopWheelBubble, { passive: true });
    }
  }

  loadSettingsUi();

  // 방만 먼저 그리고 바로 시작 (미로는 다음 프레임에)
  camera.position.set(0, 1.6, 0);
  camera.rotation.order = "YXZ";
  camera.rotation.y = Math.PI;
  camera.rotation.x = 0;
  renderer.autoClear = true;
  renderer.render(scene, camera);

  let mazeBooted = false;
  function bootMazeOnce() {
    if (mazeBooted) return;
    mazeBooted = true;
    rebuildMaze();
    syncDevCeilings();
  }

  requestAnimationFrame(() => {
    bootMazeOnce();
    requestAnimationFrame(frame);
  });
})();
