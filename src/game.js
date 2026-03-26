// 2D 시작 장면: 회색 바닥 + 가운데 플레이어 + 원형 돌벽

let canvas, ctx;
let lastTime = performance.now();
const keys = new Set();

const gameState = {
    running: false,
    score: 0,
    dead: false
};

const world = {
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
    wallRadius: 0
};

const player = {
    x: 0,
    y: 0,
    size: 28,
    speed: 280
};

let isStartTransitioning = false;
let ballLaunchTimer = 0;
let playerInvincibleTimer = 0;
const PLAYER_INVINCIBLE_DURATION_BASE = 6;
let playerInvincibleDuration = PLAYER_INVINCIBLE_DURATION_BASE;
let survivalStartMs = null; // 시작 이후 경과 시간 측정용
let survivalElapsedMs = 0; // running이 꺼져도 멈춘 값을 저장
let playerBaseSpeed = player.speed;

// 불공 피격 상태(색 빨강 + 속도 느려짐)
let fireSlowTimer = 0;
const fireSlowDuration = 3.0; // 초
const fireSlowMultiplier = 0.75; // 25% 느려짐
let invincibleRewindApplied = false;

let lastEventText = "";
function setEvent(text) {
    const el = document.getElementById("eventLog");
    if (!el) return;
    if (lastEventText === text) return;
    el.textContent = text;
    lastEventText = text;
}

// 다른 기능에서 이벤트를 띄울 때 쓸 수 있게 노출
window.setEvent = setEvent;

// 로비 상점(아직 비어있음: 탭 UI만 존재)
let shopCoins = 20;

function renderShopCoins() {
    const coinsEl = document.getElementById("shopCoinsValue");
    if (!coinsEl) return;
    coinsEl.textContent = String(shopCoins);
}

function setupLobbyShopTabs() {
    const upgradesPanel = document.getElementById("shopUpgradesPanel");
    const coinsEl = document.getElementById("shopCoinsValue");

    if (!upgradesPanel || !coinsEl) return;

    renderShopCoins();
    upgradesPanel.classList.remove("hidden");

    setupStrengthSkillUI();
}

const CODEX_STORAGE_KEY = "jaea_codex_discovered";
/** @type {Record<string, boolean>} */
let codexDiscovered = {};

const CODEX_EVENT_IDS = new Set([
    "fire",
    "slime",
    "teleport",
    "elastic",
    "sniper",
    "electric",
    "gravity",
    "time",
    "dodge",
    "alligator",
]);

const CODEX_ENTRIES = [
    {
        id: "basic",
        name: "기본 공",
        artClass: "codex-art--basic",
        lines: [
            "게임 시작 후 5초 뒤 맵 중앙에서 발사된다.",
            "플레이어에 닿으면 즉시 사망한다.",
            "반지름·속도는 게임 내 일반 공 기준과 동일하다.",
            "도감에는 플레이 없이도 항상 표시된다.",
        ],
    },
    {
        id: "fire",
        name: "불 공",
        artClass: "codex-art--fire",
        lines: [
            "이벤트마다 2개 등장. 크기는 일반 공의 25%, 속도는 일반의 약 40%.",
            "맞으면 사망이 아니라 3초간 이동 속도가 약 75%로 감소(빨간 디버프).",
            "20초 이벤트 중, 텔레포트/탄성/저격/중력/시간/전류가 아닌 분기에서 불·점액 중 하나로 나온다(초기 약 50% vs 50%, 같은 종목 반복 시 확률이 조금씩 깎임).",
        ],
    },
    {
        id: "slime",
        name: "점액 공",
        artClass: "codex-art--slime",
        lines: [
            "이벤트마다 1개. 속도는 일반 공의 약 20%.",
            "벽에 닿으면 잠시 멈췄다가 다시 튕겨 나온다.",
            "맞으면 3초간 이동 속도가 140으로 고정(초록 디버프).",
            "등장 확률은 불 공과 대칭으로 선택되며, 반복 시 확률 감쇠 규칙이 같다.",
        ],
    },
    {
        id: "teleport",
        name: "텔레포트 공",
        artClass: "codex-art--teleport",
        lines: [
            "불 이벤트와 점액 이벤트가 동시에 진행 중일 때, 다음 20초 이벤트가 50% 확률로 텔레포트로 대체된다.",
            "검은 공. 플레이어에 닿으면 사망한다.",
            "벽에 닿으면 맵 안쪽 임의 위치로 이동한 뒤 잠시 멈췄다가 다시 날아간다.",
        ],
    },
    {
        id: "elastic",
        name: "탄성 공",
        artClass: "codex-art--elastic",
        lines: [
            "20초 이벤트에서(텔레포트 분기가 아닐 때) 약 75% 확률로 먼저 선택된다.",
            "속도는 일반 공보다 빠르다(약 1.35배).",
            "맞으면 사망은 아니며, 공 진행 방향 반대로 크게 밀려난다.",
        ],
    },
    {
        id: "sniper",
        name: "저격 공",
        artClass: "codex-art--sniper",
        lines: [
            "탄성이 아닌 나머지 약 25% 구간 중, 약 20% 비중으로 저격이 선택된다(전체로 보면 대략 5% 전후).",
            "플레이어 쪽으로 빔이 천천히 늘어나고, 닿은 뒤 1초 뒤 탄환이 발사된다.",
            "탄환에 맞으면 사망한다.",
        ],
    },
    {
        id: "gravity",
        name: "중력 공",
        artClass: "codex-art--gravity",
        lines: [
            "탄성·저격 다음 분기(일반 이벤트 풀)에서 약 60%로 등장한다.",
            "크기는 일반 공의 약 2/3. 주황색.",
            "플레이어가 중력 공 반경 240px 안에 있을 때만 기본 공이 중력 공 쪽으로 끌린다.",
            "플레이어와 닿아도 넉백·사망 없음.",
        ],
    },
    {
        id: "time",
        name: "시간 공",
        artClass: "codex-art--time",
        lines: [
            "중력이 아닌 경우 그 안에서 약 25%로 등장한다.",
            "보라 계열. 닿으면 1초간 이동·근력 스킬 사용 불가(넘어짐).",
            "동안 플레이어는 검은 빛/실루엣처럼 보인다.",
        ],
    },
    {
        id: "dodge",
        name: "회피 공",
        artClass: "codex-art--dodge",
        lines: [
            "중력·시간 다음 분기에서 약 20%로 '회피·악어' 풀에 들어가며, 그 안에서 악어와 각각 50%로 갈린다.",
            "녹색. 진행 방향은 유지한 채 수직 방향으로 지그재그로 움직인다.",
            "플레이어에 닿으면 사망한다.",
        ],
    },
    {
        id: "alligator",
        name: "악어 공",
        artClass: "codex-art--alligator",
        lines: [
            "회피·악어 풀(약 20% 진입) 안에서 회피 공과 50%씩 나뉜다.",
            "점액 공과 같은 느린 속도로 플레이어를 쫓는다. 육각형 무늬의 초록색.",
            "닿으면 3초간 넘어짐(이동·스킬 불가), 공은 플레이어 반대 방향으로 이동한다. 넘어짐이 끝나면 다시 추적한다.",
        ],
    },
    {
        id: "electric",
        name: "전류 공",
        artClass: "codex-art--electric",
        lines: [
            "중력·시간·회피·악어가 아닐 때 그 다음 분기에서 약 50%로 등장한다.",
            "불 공과 같은 크기·속도의 어두운 회색 공 2개가 한 쌍으로 나온다.",
            "두 공 중심을 잇는 직선(표시는 민트 지그재그)에 닿으면 사망. 다른 쌍과 전류는 이어지지 않는다.",
        ],
    },
];

function loadCodexDiscovered() {
    codexDiscovered = { basic: true };
    try {
        const raw = localStorage.getItem(CODEX_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
            Object.assign(codexDiscovered, parsed);
        }
    } catch (_) {
        /* ignore */
    }
    codexDiscovered.basic = true;
}

function saveCodexDiscovered() {
    try {
        localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify(codexDiscovered));
    } catch (_) {
        /* ignore */
    }
}

function discoverCodexForEvent(type) {
    if (!CODEX_EVENT_IDS.has(type)) return;
    if (codexDiscovered[type]) return;
    codexDiscovered[type] = true;
    saveCodexDiscovered();
}

function resetLobbyToShopView() {
    document.getElementById("lobbyShop")?.classList.remove("hidden");
    document.getElementById("lobbyCodex")?.classList.add("hidden");
}

function openLobbyCodex() {
    document.getElementById("lobbyShop")?.classList.add("hidden");
    document.getElementById("lobbyCodex")?.classList.remove("hidden");
    renderCodex();
}

function closeLobbyCodex() {
    resetLobbyToShopView();
}

function renderCodex() {
    const grid = document.getElementById("codexGrid");
    if (!grid) return;

    grid.innerHTML = "";
    for (const entry of CODEX_ENTRIES) {
        const found = !!codexDiscovered[entry.id];
        const card = document.createElement("div");
        card.className = "codex-card" + (found ? "" : " codex-unknown");

        const art = document.createElement("div");
        art.className = found ? `codex-art ${entry.artClass}` : "codex-art codex-art-silhouette";
        card.appendChild(art);

        if (found) {
            const info = document.createElement("div");
            info.className = "codex-info";
            const title = document.createElement("div");
            title.className = "codex-name";
            title.textContent = entry.name;
            info.appendChild(title);
            const ul = document.createElement("ul");
            ul.className = "codex-lines";
            for (const line of entry.lines) {
                const li = document.createElement("li");
                li.textContent = line;
                ul.appendChild(li);
            }
            info.appendChild(ul);
            card.appendChild(info);
        }

        grid.appendChild(card);
    }
}

function setupLobbyCodex() {
    loadCodexDiscovered();
    const openBtn = document.getElementById("lobbyCodexBtn");
    const backBtn = document.getElementById("codexBackBtn");
    openBtn?.addEventListener("click", openLobbyCodex);
    backBtn?.addEventListener("click", closeLobbyCodex);
}

// 스킬 시스템(근력)
let strengthEquippedSlot = null; // "left" | "right" | null (←/→ 슬롯)
let strengthTimer = 0; // 초(0~STRENGTH_TOTAL), 0이면 비활성
let strengthCastSpeed = 0; // 사용 순간 "현재 속도" 스냅샷
const STRENGTH_PHASE1_SECONDS = 1.0; // 1초: 현재속도 -100
const STRENGTH_PHASE2_SECONDS = 2.0; // 2초: 현재속도 +70
const STRENGTH_TOTAL_SECONDS = STRENGTH_PHASE1_SECONDS + STRENGTH_PHASE2_SECONDS;

function getCurrentMovementSpeedWithoutStrength() {
    if (timeStunTimer > 0 || alligatorStunTimer > 0) return 0;
    if (fireSlowTimer > 0) return playerBaseSpeed * fireSlowMultiplier;
    if (slimeSlowTimer > 0) return playerBaseSpeed * slimeSlowMultiplier;
    return playerBaseSpeed;
}

function updateStrengthStatusUI() {
    const statusEl = document.getElementById("skillStrengthStatus");
    const equipBtn = document.getElementById("skillEquipStrength");
    if (!statusEl || !equipBtn) return;

    if (!strengthEquippedSlot) {
        statusEl.textContent = "비장착";
        equipBtn.textContent = "장착";
    } else {
        statusEl.textContent =
            strengthEquippedSlot === "left" ? "장착중 (←)" : "장착중 (→)";
        equipBtn.textContent = "장착중";
    }
}

function updateSkillHUD() {
    const leftEl = document.getElementById("skillHUD_Left");
    const rightEl = document.getElementById("skillHUD_Right");
    const hintEl = document.getElementById("skillHUDHint");
    if (!leftEl || !rightEl || !hintEl) return;

    leftEl.textContent = strengthEquippedSlot === "left" ? "근력" : "없음";
    rightEl.textContent = strengthEquippedSlot === "right" ? "근력" : "없음";

    if (strengthEquippedSlot === "left") hintEl.textContent = "← 눌러 근력 사용";
    else if (strengthEquippedSlot === "right") hintEl.textContent = "→ 눌러 근력 사용";
    else hintEl.textContent = "근력을 장착해야 합니다";
}

function setSkillHUDVisible(visible) {
    const hud = document.getElementById("skillHUD");
    if (!hud) return;
    if (visible) hud.classList.remove("hidden");
    else hud.classList.add("hidden");
}

function openStrengthEquipChooser() {
    const chooser = document.getElementById("skillEquipChooserStrength");
    if (!chooser) return;
    chooser.classList.remove("hidden");
}

function closeStrengthEquipChooser() {
    const chooser = document.getElementById("skillEquipChooserStrength");
    if (!chooser) return;
    chooser.classList.add("hidden");
}

function equipStrengthTo(slot) {
    strengthEquippedSlot = slot;
    closeStrengthEquipChooser();
    updateStrengthStatusUI();
    updateSkillHUD();
}

function tryUseStrength(slot) {
    if (!gameState.running) return;
    if (gameState.dead) return;
    if (timeStunTimer > 0 || alligatorStunTimer > 0) return;
    if (strengthEquippedSlot !== slot) return;
    if (strengthTimer > 0) return; // 스킬 중엔 재사용 방지

    strengthCastSpeed = getCurrentMovementSpeedWithoutStrength();
    strengthTimer = 0.0001;
    setEvent("근력 사용!");
}

function setupStrengthSkillUI() {
    const statusEl = document.getElementById("skillStrengthStatus");
    const equipBtn = document.getElementById("skillEquipStrength");
    const chooser = document.getElementById("skillEquipChooserStrength");
    const toLeftBtn = document.getElementById("skillEquipToLeft");
    const toRightBtn = document.getElementById("skillEquipToRight");
    const closeBtn = document.getElementById("skillEquipChooserClose");

    // HTML이 로드되기 전/다른 페이지면 스킵
    if (!statusEl || !equipBtn || !chooser || !toLeftBtn || !toRightBtn || !closeBtn) return;

    updateStrengthStatusUI();
    updateSkillHUD();

    equipBtn.addEventListener("click", () => {
        openStrengthEquipChooser();
    });

    toLeftBtn.addEventListener("click", () => equipStrengthTo("left"));
    toRightBtn.addEventListener("click", () => equipStrengthTo("right"));
    closeBtn.addEventListener("click", () => closeStrengthEquipChooser());
    closeStrengthEquipChooser();
}

const ball = {
    x: 0,
    y: 0,
    r: 22,
    vx: 0,
    vy: 0,
    speed: 260,
    active: false
};

// 개발자모드: 공/이벤트 공 물리 정지
let ballsFrozen = false;

// 첫번째 이벤트: 불 이벤트 (불 공 2개, 한판 지속)
const FIRE_BALL_COUNT = 2;
const fireBalls = [];
let fireEventStarted = false;
const fireSpawnIntervalMs = 20000;
let fireNextSpawnInMs = fireSpawnIntervalMs;
let fireSpawnCount = 0;

// 두번째 이벤트: 점액 공
const SLIME_BALL_COUNT = 1;
const slimeBalls = [];
let slimeEventStarted = false;
let slimeSpawnCount = 0;

// 세번째 이벤트: 텔레포트 공 (검정 공)
const TELEPORT_BALL_COUNT = 1;
const teleportBalls = [];
let teleportEventStarted = false;
let teleportSpawnCount = 0;

// 텔레포트 공: 벽에 붙으면 안쪽 랜덤 위치로 이동 후 2초 뒤 다시 랜덤 방향으로 발사
const TELEPORT_STICK_DURATION = 2.0; // 초

// 네번째 이벤트: 탄성 공 (플레이어 넉백)
const ELASTIC_BALL_COUNT = 1;
const elasticBalls = [];
let elasticEventStarted = false;
let elasticSpawnCount = 0;
const ELASTIC_BALL_SPEED_MULTIPLIER = 1.35; // 일반 공 대비 더 빠르게
const ELASTIC_MAX_TILT_DEG = 45; // 벽 튕길 때 각도 랜덤 범위
const ELASTIC_KNOCKBACK_DISTANCE = 230; // 플레이어 넉백 거리(즉시 이동)
const ELASTIC_EVENT_PROB = 0.75; // (20초 스폰에서) 탄성 이벤트가 나올 기본 확률

// 다섯번째 이벤트: 저격 공 (빔 -> 1초 뒤 탄환 발사)
const SNIPER_BALL_COUNT = 1;
const sniperBalls = [];
let sniperEventStarted = false;
let sniperSpawnCount = 0;

const SNIPER_EVENT_PROB_RATIO = 0.2; // 탄성 이벤트 다음 구간에서의 비율(나머지 확률 중 일부)
const SNIPER_BEAM_GROWTH_SPEED = 260; // px/s, 플레이어까지 선이 "천천히" 늘어나는 속도
const SNIPER_CHARGE_DURATION = 1.0; // 초, 빔이 플레이어에 닿은 뒤 탄환 발사까지

const SNIPER_BULLET_SPEED_MULTIPLIER = 0.6; // 일반 공 대비 느린 편
const SNIPER_BULLET_RADIUS_SCALE = 0.28; // 탄환 반지름(일반 공 기준)

const SNIPER_BALL_RADIUS_SCALE = 0.55; // 저격 공 소스 반지름(일반 공 기준)
const SNIPER_HIT_EPS = 2.0; // 빔 판정 여유(픽셀)

const sniperBullets = [];

const SNIPER_BALL_SPEED_MULTIPLIER = 0.65; // 일반 공 대비 저격 공 이동 속도

// 점액은 벽에 닿으면 잠깐 멈췄다가 다시 튕김(끈적한 느낌)
const SLIME_STICK_DURATION = 1.8; // 초
const SLIME_BALL_SPEED_MULTIPLIER = 0.2; // 일반 공 대비 느린 속도

// 시간 공: 플레이어 비행(넘어짐) — 1초간 이동 불가
let timeStunTimer = 0;
const TIME_STUN_DURATION = 1.0;

// 악어 공: 넘어짐 3초
let alligatorStunTimer = 0;
const ALLIGATOR_STUN_DURATION = 3.0;

// 점액 공 피격 상태(초록 + 속도 느려짐)
let slimeSlowTimer = 0;
const slimeSlowDuration = 3.0; // 초
// 점액에 맞으면 플레이어 속도는 정확히 140으로 고정
let slimeSlowMultiplier = 140 / playerBaseSpeed;

// 이벤트 스폰 횟수(첫 이벤트는 불 고정)
let eventSpawnIndex = 0;

// 최근 이벤트 2개 기록 (불/점액 나오고 난 뒤 텔레포트 확률 올라가게)
let lastTwoEventTypes = [];

function recordEventType(type) {
    lastTwoEventTypes.push(type);
    if (lastTwoEventTypes.length > 2) lastTwoEventTypes.shift();
    discoverCodexForEvent(type);
}

function shouldSpawnTeleportEvent() {
    // 불과 점액 이벤트가 "이미 걸려있으면"(영구 지속),
    // 다음 이벤트 선택에서 텔레포트 확률 50%
    if (!(fireEventStarted && slimeEventStarted)) return false;
    return Math.random() < 0.5;
}

// 이벤트 확률 감쇠(직전에 나온 이벤트가 다음에 나올 확률 감소)
// 직전에 나온 이벤트가 다음에 나올 확률을 "조금" 낮춤
// (0.5에서 시작하면 대략 0.49, 0.48... 정도로 천천히 감소)
const EVENT_REPEAT_PENALTY = 0.01; // 1%
const EVENT_MIN_PROB = 0.05; // 너무 내려가지 않게 바닥
let fireEventProb = 0.5;
let slimeEventProb = 0.5;

function applyEventRepeatProbabilityDecay(type) {
    // "방금 나온 이벤트"만 다음 선택에서 약간 불리하게 하고,
    // 다른 이벤트의 확률은 이전에 깎인 만큼 '복구'되도록 기본값으로 리셋 후 재적용
    fireEventProb = 0.5;
    slimeEventProb = 0.5;

    if (type === "fire") {
        fireEventProb = Math.max(EVENT_MIN_PROB, fireEventProb - EVENT_REPEAT_PENALTY);
        slimeEventProb = 1 - fireEventProb;
    } else if (type === "slime") {
        slimeEventProb = Math.max(EVENT_MIN_PROB, slimeEventProb - EVENT_REPEAT_PENALTY);
        fireEventProb = 1 - slimeEventProb;
    }
}
// 불공 크기 조절 (반지름 기준: 일반 공 반지름 * 스케일)
// 불공 반지름 = 일반 공 반지름의 0.25배
const FIRE_BALL_RADIUS_SCALE = 0.25;
// 불공 속도 조절 (일반 공 속도 * 배수)
const FIRE_BALL_SPEED_MULTIPLIER = 0.4;

// 전류 공: 불공과 동일 크기·속도, 페어마다 민트 전류(지그재그 표시, 판정은 직선)
const ELECTRIC_EVENT_PROB = 0.5; // 불/점액 대신 뽑힐 때 전류 이벤트(50%)
const ELECTRIC_LINE_HIT_RADIUS = 7; // 직선 전류 히트 반경(두께의 절반)
const ELECTRIC_ZIGZAG_SEGMENTS = 14;
const ELECTRIC_ZIGZAG_AMP = 9;
const electricPairs = []; // { b0, b1 } — 같은 스폰에서 나온 2개만 서로 연결
let electricSpawnCount = 0;

// 중력 공: 주황, 반지름 = 일반공 × 2/3. 플레이어가 중력공 근처일 때만 일반공이 중력공 쪽으로 끌림
const GRAVITY_BALL_COUNT = 1;
const GRAVITY_BALL_RADIUS_SCALE = 2 / 3;
const GRAVITY_BALL_SPEED_MULTIPLIER = 1.0;
const GRAVITY_EVENT_PROB = 0.6; // 탄성/저격 제외 분기에서 중력 이벤트(60%)
const GRAVITY_PLAYER_RANGE = 240; // 플레이어–중력공 거리 이하일 때만 끌림
const GRAVITY_PULL_ACCEL = 480; // 일반공 가속 (px/s²)
const GRAVITY_PULL_MAX_SPEED_MULT = 2.8; // 일반공 속도 상한 = 기본 × 배수
const gravityBalls = [];
let gravityEventStarted = false;
let gravitySpawnCount = 0;

// 시간 공: 닿으면 1초 스턴(이동 불가). 보라·시계 느낌
const TIME_BALL_COUNT = 1;
const TIME_BALL_RADIUS_SCALE = 0.58;
const TIME_BALL_SPEED_MULTIPLIER = 0.88;
const TIME_EVENT_PROB = 0.25; // 중력 제외 분기에서 시간 이벤트
const timeBalls = [];
let timeEventStarted = false;
let timeSpawnCount = 0;

// 회피 공: 녹색, 진행 방향 유지 + 수직 지그재그
const DODGE_BALL_COUNT = 1;
const DODGE_BALL_RADIUS_SCALE = 1.0;
const DODGE_BALL_SPEED_MULTIPLIER = 1.05;
const DODGE_EVENT_PROB = 0.2; // 중력·시간 제외 분기에서 회피·악어 풀 진입(내부 50% vs 50%)
const DODGE_ZIG_OMEGA = 11; // rad/s, 지그재그 위상 속도
const DODGE_ZIG_PERP_SPEED = 150; // 수직 속도 진폭(px/s)
const dodgeBalls = [];
let dodgeEventStarted = false;
let dodgeSpawnCount = 0;

// 악어 공: 점액과 동일 속도로 추적, 맞으면 3초 넘어짐 + 공은 반대로 도망 후 스턴 종료 시 재추적
const ALLIGATOR_BALL_COUNT = 1;
const ALLIGATOR_BALL_RADIUS_SCALE = 1.0;
const alligatorBalls = []; // { x,y,r,vx,vy,speed, mode: "chase"|"flee" }
let alligatorEventStarted = false;
let alligatorSpawnCount = 0;

const maxTiltDeg = 60;
const maxTiltRad = maxTiltDeg * Math.PI / 180;

function init() {
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");
    document.getElementById("gameContainer").appendChild(canvas);

    resizeCanvas();
    setupKeyboardControls();
    setupDevModeUI();
    setupLobbyShopTabs();
    setupLobbyCodex();
    window.addEventListener("resize", resizeCanvas);

    updateUI();
    requestAnimationFrame(animate);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    world.width = canvas.width;
    world.height = canvas.height;
    world.centerX = world.width / 2;
    world.centerY = world.height / 2;
    world.wallRadius = Math.min(world.width, world.height) * 0.32;
}

function setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
        // 이동: WASD + (방향키 ↑↓만)
        if (e.code === "KeyW" || e.code === "ArrowUp") keys.add("up");
        if (e.code === "KeyS" || e.code === "ArrowDown") keys.add("down");
        if (e.code === "KeyA") keys.add("left");
        if (e.code === "KeyD") keys.add("right");

        // 스킬 사용: 방향키 ←/→ 만 (슬롯 left / right)
        if (!e.repeat) {
            if (e.code === "ArrowLeft") tryUseStrength("left");
            if (e.code === "ArrowRight") tryUseStrength("right");
        }
    });

    document.addEventListener("keyup", (e) => {
        if (e.code === "KeyW" || e.code === "ArrowUp") keys.delete("up");
        if (e.code === "KeyS" || e.code === "ArrowDown") keys.delete("down");
        if (e.code === "KeyA") keys.delete("left");
        if (e.code === "KeyD") keys.delete("right");
    });
}

function updateMovement(dt) {
    if (timeStunTimer > 0 || alligatorStunTimer > 0) return;

    let dx = 0;
    let dy = 0;
    if (keys.has("up")) dy -= 1;
    if (keys.has("down")) dy += 1;
    if (keys.has("left")) dx -= 1;
    if (keys.has("right")) dx += 1;

    // 근력 스킬 중이면 속도 우선 적용
    if (strengthTimer > 0) {
        if (strengthTimer < STRENGTH_PHASE1_SECONDS) {
            player.speed = Math.max(0, strengthCastSpeed - 100);
        } else {
            player.speed = strengthCastSpeed + 70;
        }
    } else {
        // 이벤트 공에 맞으면 속도가 느려짐
        if (fireSlowTimer > 0) {
            player.speed = playerBaseSpeed * fireSlowMultiplier;
        } else if (slimeSlowTimer > 0) {
            player.speed = playerBaseSpeed * slimeSlowMultiplier;
        } else {
            player.speed = playerBaseSpeed;
        }
    }

    const len = Math.hypot(dx, dy);
    if (len > 0) {
        dx /= len;
        dy /= len;
        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
    }

    // 원형 벽 안쪽으로 제한
    const vx = player.x - world.centerX;
    const vy = player.y - world.centerY;
    const dist = Math.hypot(vx, vy);
    const playerRadiusForCollision = player.size * 0.5;
    const maxDist = world.wallRadius - 18 - playerRadiusForCollision;
    if (dist > maxDist && dist > 0) {
        player.x = world.centerX + (vx / dist) * maxDist;
        player.y = world.centerY + (vy / dist) * maxDist;
    }
}

function launchBallFromCenter() {
    const angle = Math.random() * Math.PI * 2;
    ball.x = world.centerX;
    ball.y = world.centerY;
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.active = true;
}

function startFireEventFromCenter() {
    // 불 이벤트는 영구 지속, 단 "불 이벤트가 다시 나오면" 기존 불 공은 리스폰(누적 방지)
    fireEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;
    const speed = ball.speed * FIRE_BALL_SPEED_MULTIPLIER;

    fireSpawnCount++;
    for (let i = 0; i < FIRE_BALL_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        fireBalls.push({
            x: centerX,
            y: centerY,
            r: ball.r * FIRE_BALL_RADIUS_SCALE, // 불공 반지름
            vx,
            vy,
            speed
        });
    }

    setEvent(`불 이벤트! (${fireSpawnCount})`);
    applyEventRepeatProbabilityDecay("fire");
    recordEventType("fire");
}

function startElectricEventFromCenter() {
    const centerX = world.centerX;
    const centerY = world.centerY;
    const speed = ball.speed * FIRE_BALL_SPEED_MULTIPLIER;
    const r = ball.r * FIRE_BALL_RADIUS_SCALE;

    electricSpawnCount++;

    const b0 = {
        x: centerX,
        y: centerY,
        r,
        vx: 0,
        vy: 0,
        speed
    };
    const b1 = {
        x: centerX,
        y: centerY,
        r,
        vx: 0,
        vy: 0,
        speed
    };
    const a0 = Math.random() * Math.PI * 2;
    const a1 = Math.random() * Math.PI * 2;
    b0.vx = Math.cos(a0) * speed;
    b0.vy = Math.sin(a0) * speed;
    b1.vx = Math.cos(a1) * speed;
    b1.vy = Math.sin(a1) * speed;

    electricPairs.push({ b0, b1 });

    setEvent(`전류 이벤트! (${electricSpawnCount})`);
    recordEventType("electric");
}

function updateElectricBalls(dt) {
    if (electricPairs.length === 0) return;
    if (ballsFrozen) return;

    for (const pair of electricPairs) {
        for (const p of [pair.b0, pair.b1]) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            const dx = p.x - world.centerX;
            const dy = p.y - world.centerY;
            const dist = Math.hypot(dx, dy);
            const limit = world.wallRadius - 18 - p.r;

            if (dist > limit && dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;

                p.x = world.centerX + nx * limit;
                p.y = world.centerY + ny * limit;

                const speed = Math.hypot(p.vx, p.vy) || p.speed;

                const inwardX = -nx;
                const inwardY = -ny;
                const randomDeg = (Math.random() * 2 - 1) * maxTiltDeg;
                const randomRad = randomDeg * Math.PI / 180;
                const cos = Math.cos(randomRad);
                const sin = Math.sin(randomRad);

                const dirX = inwardX * cos - inwardY * sin;
                const dirY = inwardX * sin + inwardY * cos;
                p.vx = dirX * speed;
                p.vy = dirY * speed;
            }
        }
    }
}

/** 점과 선분 (ax,ay)-(bx,by) 사이 거리의 제곱 */
function distSqPointToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;
    let t = abLenSq < 1e-8 ? 0 : (apx * abx + apy * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy;
}

function drawElectricZigzagBetween(ax, ay, ar, bx, by, br) {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < ar + br + 2) return;

    const ux = dx / len;
    const uy = dy / len;

    const startX = ax + ux * ar;
    const startY = ay + uy * ar;
    const endX = bx - ux * br;
    const endY = by - uy * br;
    const segLen = Math.hypot(endX - startX, endY - startY);
    if (segLen < 4) return;

    const n = Math.max(4, Math.min(ELECTRIC_ZIGZAG_SEGMENTS, Math.floor(segLen / 18)));
    const sux = (endX - startX) / segLen;
    const suy = (endY - startY) / segLen;
    const spx = -suy;
    const spy = sux;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    for (let i = 1; i < n; i++) {
        const t = i / n;
        const mx = startX + (endX - startX) * t;
        const my = startY + (endY - startY) * t;
        const sign = (i % 2 === 0) ? 1 : -1;
        ctx.lineTo(mx + spx * ELECTRIC_ZIGZAG_AMP * sign, my + spy * ELECTRIC_ZIGZAG_AMP * sign);
    }
    ctx.lineTo(endX, endY);

    ctx.save();
    ctx.strokeStyle = "rgba(120, 255, 220, 0.95)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(80, 255, 200, 0.75)";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.strokeStyle = "rgba(200, 255, 245, 0.9)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
}

function startGravityEventFromCenter() {
    gravityEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;
    const speed = ball.speed * GRAVITY_BALL_SPEED_MULTIPLIER;
    const r = ball.r * GRAVITY_BALL_RADIUS_SCALE;

    gravitySpawnCount++;
    for (let i = 0; i < GRAVITY_BALL_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        gravityBalls.push({
            x: centerX,
            y: centerY,
            r,
            vx,
            vy,
            speed
        });
    }

    setEvent(`중력 이벤트! (${gravitySpawnCount})`);
    recordEventType("gravity");
}

function startTimeEventFromCenter() {
    timeEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;
    const speed = ball.speed * TIME_BALL_SPEED_MULTIPLIER;
    const r = ball.r * TIME_BALL_RADIUS_SCALE;

    timeSpawnCount++;
    for (let i = 0; i < TIME_BALL_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        timeBalls.push({
            x: centerX,
            y: centerY,
            r,
            vx,
            vy,
            speed
        });
    }

    setEvent(`시간 이벤트! (${timeSpawnCount})`);
    recordEventType("time");
}

function startDodgeEventFromCenter() {
    dodgeEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;
    const speed = ball.speed * DODGE_BALL_SPEED_MULTIPLIER;
    const r = ball.r * DODGE_BALL_RADIUS_SCALE;

    dodgeSpawnCount++;
    for (let i = 0; i < DODGE_BALL_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        dodgeBalls.push({
            x: centerX,
            y: centerY,
            r,
            vx,
            vy,
            speed,
            zigPhase: Math.random() * Math.PI * 2
        });
    }

    setEvent(`회피 이벤트! (${dodgeSpawnCount})`);
    recordEventType("dodge");
}

function startAlligatorEventFromCenter() {
    alligatorEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;
    const slowSpeed = ball.speed * SLIME_BALL_SPEED_MULTIPLIER;
    const r = ball.r * ALLIGATOR_BALL_RADIUS_SCALE;

    alligatorSpawnCount++;
    for (let i = 0; i < ALLIGATOR_BALL_COUNT; i++) {
        alligatorBalls.push({
            x: centerX,
            y: centerY,
            r,
            vx: 0,
            vy: 0,
            speed: slowSpeed,
            mode: "chase"
        });
    }

    setEvent(`악어 이벤트! (${alligatorSpawnCount})`);
    recordEventType("alligator");
}

function updateAlligatorBalls(dt) {
    if (!alligatorEventStarted) return;
    if (ballsFrozen) return;

    const slowSpeed = ball.speed * SLIME_BALL_SPEED_MULTIPLIER;

    if (alligatorStunTimer <= 0) {
        for (const p of alligatorBalls) {
            if (p.mode === "flee") p.mode = "chase";
        }
    }

    for (const p of alligatorBalls) {
        if (p.mode === "chase") {
            const dx = player.x - p.x;
            const dy = player.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d < 1e-4) {
                p.vx = 0;
                p.vy = 0;
            } else {
                p.vx = (dx / d) * slowSpeed;
                p.vy = (dy / d) * slowSpeed;
            }
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const dxw = p.x - world.centerX;
        const dyw = p.y - world.centerY;
        const dist = Math.hypot(dxw, dyw);
        const limit = world.wallRadius - 18 - p.r;

        if (dist > limit && dist > 0) {
            const nx = dxw / dist;
            const ny = dyw / dist;

            p.x = world.centerX + nx * limit;
            p.y = world.centerY + ny * limit;

            const speedNow = Math.hypot(p.vx, p.vy) || p.speed;

            const inwardX = -nx;
            const inwardY = -ny;
            const randomDeg = (Math.random() * 2 - 1) * maxTiltDeg;
            const randomRad = randomDeg * Math.PI / 180;
            const cos = Math.cos(randomRad);
            const sin = Math.sin(randomRad);

            const dirX = inwardX * cos - inwardY * sin;
            const dirY = inwardX * sin + inwardY * cos;
            p.vx = dirX * speedNow;
            p.vy = dirY * speedNow;
        }
    }
}

function updateDodgeBalls(dt) {
    if (!dodgeEventStarted) return;
    if (ballsFrozen) return;

    for (const p of dodgeBalls) {
        const sp = Math.hypot(p.vx, p.vy) || p.speed;
        const ux = p.vx / sp;
        const uy = p.vy / sp;
        const px = -uy;
        const py = ux;

        p.zigPhase += DODGE_ZIG_OMEGA * dt;
        const zig = Math.sin(p.zigPhase) * DODGE_ZIG_PERP_SPEED;

        p.x += ux * sp * dt + px * zig * dt;
        p.y += uy * sp * dt + py * zig * dt;

        const dx = p.x - world.centerX;
        const dy = p.y - world.centerY;
        const dist = Math.hypot(dx, dy);
        const limit = world.wallRadius - 18 - p.r;

        if (dist > limit && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            p.x = world.centerX + nx * limit;
            p.y = world.centerY + ny * limit;

            const speedNow = Math.hypot(p.vx, p.vy) || p.speed;

            const inwardX = -nx;
            const inwardY = -ny;
            const randomDeg = (Math.random() * 2 - 1) * maxTiltDeg;
            const randomRad = randomDeg * Math.PI / 180;
            const cos = Math.cos(randomRad);
            const sin = Math.sin(randomRad);

            const dirX = inwardX * cos - inwardY * sin;
            const dirY = inwardX * sin + inwardY * cos;
            p.vx = dirX * speedNow;
            p.vy = dirY * speedNow;
        }
    }
}

function updateTimeBalls(dt) {
    if (!timeEventStarted) return;
    if (ballsFrozen) return;

    for (const p of timeBalls) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const dx = p.x - world.centerX;
        const dy = p.y - world.centerY;
        const dist = Math.hypot(dx, dy);
        const limit = world.wallRadius - 18 - p.r;

        if (dist > limit && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            p.x = world.centerX + nx * limit;
            p.y = world.centerY + ny * limit;

            const speed = Math.hypot(p.vx, p.vy) || p.speed;

            const inwardX = -nx;
            const inwardY = -ny;
            const randomDeg = (Math.random() * 2 - 1) * maxTiltDeg;
            const randomRad = randomDeg * Math.PI / 180;
            const cos = Math.cos(randomRad);
            const sin = Math.sin(randomRad);

            const dirX = inwardX * cos - inwardY * sin;
            const dirY = inwardX * sin + inwardY * cos;
            p.vx = dirX * speed;
            p.vy = dirY * speed;
        }
    }
}

function updateGravityBalls(dt) {
    if (!gravityEventStarted) return;
    if (ballsFrozen) return;

    for (const p of gravityBalls) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const dx = p.x - world.centerX;
        const dy = p.y - world.centerY;
        const dist = Math.hypot(dx, dy);
        const limit = world.wallRadius - 18 - p.r;

        if (dist > limit && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            p.x = world.centerX + nx * limit;
            p.y = world.centerY + ny * limit;

            const speed = Math.hypot(p.vx, p.vy) || p.speed;

            const inwardX = -nx;
            const inwardY = -ny;
            const randomDeg = (Math.random() * 2 - 1) * maxTiltDeg;
            const randomRad = randomDeg * Math.PI / 180;
            const cos = Math.cos(randomRad);
            const sin = Math.sin(randomRad);

            const dirX = inwardX * cos - inwardY * sin;
            const dirY = inwardX * sin + inwardY * cos;
            p.vx = dirX * speed;
            p.vy = dirY * speed;
        }
    }
}

function startSlimeEventFromCenter() {
    // 점액 이벤트는 영구 지속, "점액 이벤트가 다시 나오면" 기존 점액 공 위에 추가 생성
    slimeEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;
    const speed = ball.speed * SLIME_BALL_SPEED_MULTIPLIER;
    slimeSpawnCount++;

    for (let i = 0; i < SLIME_BALL_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        slimeBalls.push({
            x: centerX,
            y: centerY,
            r: ball.r,
            vx,
            vy,
            speed,
            stuckTimer: 0
        });
    }

    setEvent(`점액 이벤트! (${slimeSpawnCount})`);
    applyEventRepeatProbabilityDecay("slime");
    recordEventType("slime");
}

function updateBall(dt) {
    if (ballsFrozen) return;
    if (!ball.active) return;

    // 중력 공: 플레이어가 중력 공 근처에 있을 때만 일반 공이 중력 공 방향으로 가속
    if (gravityBalls.length > 0) {
        const rangeSq = GRAVITY_PLAYER_RANGE * GRAVITY_PLAYER_RANGE;
        for (const g of gravityBalls) {
            const dpx = player.x - g.x;
            const dpy = player.y - g.y;
            if (dpx * dpx + dpy * dpy > rangeSq) continue;

            const dx = g.x - ball.x;
            const dy = g.y - ball.y;
            const d = Math.hypot(dx, dy);
            if (d < 1e-4) continue;
            const inv = 1 / d;
            ball.vx += dx * inv * GRAVITY_PULL_ACCEL * dt;
            ball.vy += dy * inv * GRAVITY_PULL_ACCEL * dt;
        }
        const maxSp = ball.speed * GRAVITY_PULL_MAX_SPEED_MULT;
        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > maxSp) {
            const k = maxSp / sp;
            ball.vx *= k;
            ball.vy *= k;
        }
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // 원형 벽에서 반사
    const dx = ball.x - world.centerX;
    const dy = ball.y - world.centerY;
    const dist = Math.hypot(dx, dy);
    const limit = world.wallRadius - 18 - ball.r;

    if (dist > limit && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        // 벽 안으로 되돌리기
        ball.x = world.centerX + nx * limit;
        ball.y = world.centerY + ny * limit;

        // 반지름 기준(중심 -> 충돌점의 반대, 즉 안쪽 방향)을 기준으로
        // -60도 ~ +60도 범위 안에서 랜덤하게 튕기게 함
        const speed = Math.hypot(ball.vx, ball.vy) || ball.speed;
        const inwardX = -nx;
        const inwardY = -ny;
        const randomDeg = (Math.random() * 2 - 1) * maxTiltDeg;
        const randomRad = randomDeg * Math.PI / 180;
        const cos = Math.cos(randomRad);
        const sin = Math.sin(randomRad);
        const dirX = inwardX * cos - inwardY * sin;
        const dirY = inwardX * sin + inwardY * cos;
        ball.vx = dirX * speed;
        ball.vy = dirY * speed;
    }
}

function updateFireBalls(dt) {
    if (!fireEventStarted) return;
    if (ballsFrozen) return;
    for (const p of fireBalls) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 원형 벽에서 반사 + 반지름 기준 -60도~+60도 내 랜덤
        const dx = p.x - world.centerX;
        const dy = p.y - world.centerY;
        const dist = Math.hypot(dx, dy);
        const limit = world.wallRadius - 18 - p.r;

        if (dist > limit && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            // 벽 안으로 되돌리기
            p.x = world.centerX + nx * limit;
            p.y = world.centerY + ny * limit;

            const speed = Math.hypot(p.vx, p.vy) || p.speed;

            // 안쪽(중심 방향) 기준으로 회전 제한
            const inwardX = -nx;
            const inwardY = -ny;
            const randomDeg = (Math.random() * 2 - 1) * maxTiltDeg;
            const randomRad = randomDeg * Math.PI / 180;
            const cos = Math.cos(randomRad);
            const sin = Math.sin(randomRad);

            const dirX = inwardX * cos - inwardY * sin;
            const dirY = inwardX * sin + inwardY * cos;
            p.vx = dirX * speed;
            p.vy = dirY * speed;
        }
    }
}

function updateSlimeBalls(dt) {
    if (!slimeEventStarted) return;
    if (ballsFrozen) return;

    for (const p of slimeBalls) {
        if (p.stuckTimer > 0) {
            p.stuckTimer -= dt;

            // 시간이 끝나면 다시 튕겨 나감
            if (p.stuckTimer <= 0) {
                const dx = p.x - world.centerX;
                const dy = p.y - world.centerY;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;

                const inwardX = -nx;
                const inwardY = -ny;
                const randomDeg = (Math.random() * 2 - 1) * Math.min(25, maxTiltDeg);
                const randomRad = randomDeg * Math.PI / 180;
                const cos = Math.cos(randomRad);
                const sin = Math.sin(randomRad);

                const dirX = inwardX * cos - inwardY * sin;
                const dirY = inwardX * sin + inwardY * cos;

                const speed = p.speed ?? (ball.speed * SLIME_BALL_SPEED_MULTIPLIER);
                p.vx = dirX * speed;
                p.vy = dirY * speed;
            }
            continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 원형 벽에서 충돌 시 "붙었다가" 다시 튕김
        const dx = p.x - world.centerX;
        const dy = p.y - world.centerY;
        const dist = Math.hypot(dx, dy);
        const limit = world.wallRadius - 18 - p.r;

        if (dist > limit && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            // 벽 안으로 밀어넣고 멈춤
            p.x = world.centerX + nx * limit;
            p.y = world.centerY + ny * limit;

            p.vx = 0;
            p.vy = 0;
            p.stuckTimer = SLIME_STICK_DURATION;
        }
    }
}

function startElasticEventFromCenter() {
    elasticEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;
    const speed = ball.speed * ELASTIC_BALL_SPEED_MULTIPLIER;

    elasticSpawnCount++;
    for (let i = 0; i < ELASTIC_BALL_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        elasticBalls.push({
            x: centerX,
            y: centerY,
            r: ball.r,
            vx,
            vy,
            speed,
        });
    }

    setEvent(`탄성 공 이벤트! (${elasticSpawnCount})`);
    recordEventType("elastic");
}

function updateElasticBalls(dt) {
    if (!elasticEventStarted) return;
    if (ballsFrozen) return;

    for (const p of elasticBalls) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 원형 벽에서 반사(일반 공보다 더 빠르게 움직임)
        const dx = p.x - world.centerX;
        const dy = p.y - world.centerY;
        const dist = Math.hypot(dx, dy);
        const limit = world.wallRadius - 18 - p.r;

        if (dist > limit && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            // 벽 안으로 되돌리기
            p.x = world.centerX + nx * limit;
            p.y = world.centerY + ny * limit;

            const speed = Math.hypot(p.vx, p.vy) || p.speed;

            const inwardX = -nx;
            const inwardY = -ny;
            const randomDeg = (Math.random() * 2 - 1) * ELASTIC_MAX_TILT_DEG;
            const randomRad = randomDeg * Math.PI / 180;
            const cos = Math.cos(randomRad);
            const sin = Math.sin(randomRad);

            const dirX = inwardX * cos - inwardY * sin;
            const dirY = inwardX * sin + inwardY * cos;

            p.vx = dirX * speed;
            p.vy = dirY * speed;
        }
    }
}

function startSniperEventFromCenter() {
    sniperEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;

    sniperSpawnCount++;
    for (let i = 0; i < SNIPER_BALL_COUNT; i++) {
        const speed = ball.speed * SNIPER_BALL_SPEED_MULTIPLIER;
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        sniperBalls.push({
            x: centerX,
            y: centerY,
            r: ball.r * SNIPER_BALL_RADIUS_SCALE,
            vx,
            vy,
            speed,
            beamLen: 0,
            chargeTimer: 0,
        });
    }

    setEvent(`저격 공 이벤트! (${sniperSpawnCount})`);
    recordEventType("sniper");
}

function updateSniperBalls(dt) {
    if (!sniperEventStarted) return;
    if (ballsFrozen) return;

    for (const s of sniperBalls) {
        // 저격 공 이동(원형 벽에서 반사)
        s.x += (s.vx ?? 0) * dt;
        s.y += (s.vy ?? 0) * dt;

        const dxWall = s.x - world.centerX;
        const dyWall = s.y - world.centerY;
        const distWall = Math.hypot(dxWall, dyWall);
        const limitWall = world.wallRadius - 18 - s.r;

        if (distWall > limitWall && distWall > 0) {
            const nx = dxWall / distWall;
            const ny = dyWall / distWall;

            // 겹침 방지 보정
            s.x = world.centerX + nx * limitWall;
            s.y = world.centerY + ny * limitWall;

            const speedNow = Math.hypot(s.vx, s.vy) || s.speed || ball.speed;
            // 반사: v' = v - 2*(v·n)*n
            const dot = s.vx * nx + s.vy * ny;
            s.vx = s.vx - 2 * dot * nx;
            s.vy = s.vy - 2 * dot * ny;

            // 수치 오차로 속도 줄어드는 것 방지
            const vmag = Math.hypot(s.vx, s.vy) || 1;
            s.vx = (s.vx / vmag) * speedNow;
            s.vy = (s.vy / vmag) * speedNow;
        }

        const dx = player.x - s.x;
        const dy = player.y - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.0001) continue;

        const nx = dx / dist;
        const ny = dy / dist;

        // 빔 길이를 천천히 늘림
        s.beamLen += SNIPER_BEAM_GROWTH_SPEED * dt;
        const hit = s.beamLen >= dist - SNIPER_HIT_EPS;

        if (hit) {
            s.chargeTimer += dt;
            // 1초 뒤 탄환 발사
            if (s.chargeTimer >= SNIPER_CHARGE_DURATION) {
                const bulletSpeed = ball.speed * SNIPER_BULLET_SPEED_MULTIPLIER;
                const bulletR = ball.r * SNIPER_BULLET_RADIUS_SCALE;
                const spawnOffset = s.r + bulletR + 4;

                sniperBullets.push({
                    x: s.x + nx * spawnOffset,
                    y: s.y + ny * spawnOffset,
                    r: bulletR,
                    vx: nx * bulletSpeed,
                    vy: ny * bulletSpeed,
                    speed: bulletSpeed,
                });

                // 빔 재생성
                s.beamLen = 0;
                s.chargeTimer = 0;

                setEvent("저격 발사!");
            }
        } else {
            // 플레이어가 선에 닿지 않으면 충전 리셋
            s.chargeTimer = 0;
        }
    }
}

function updateSniperBullets(dt) {
    if (!sniperEventStarted && sniperBullets.length === 0) return;
    if (ballsFrozen) return;

    for (let i = sniperBullets.length - 1; i >= 0; i--) {
        const b = sniperBullets[i];

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // 원형 벽 충돌하면 튕기고(반사), 바로 사라짐
        const dx = b.x - world.centerX;
        const dy = b.y - world.centerY;
        const dist = Math.hypot(dx, dy);
        const limit = world.wallRadius - 18 - b.r;

        if (dist > limit && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            // 벽 안쪽으로 보정
            b.x = world.centerX + nx * limit;
            b.y = world.centerY + ny * limit;

            // 속도 반사: v' = v - 2*(v·n)*n
            const dot = b.vx * nx + b.vy * ny;
            b.vx = b.vx - 2 * dot * nx;
            b.vy = b.vy - 2 * dot * ny;

            // "벽에 튕기면 사라짐"
            sniperBullets.splice(i, 1);
        }
    }
}

function startTeleportEventFromCenter() {
    // 텔레포트는 영구 지속(로직상), 단 "텔레포트 이벤트가 다시 나오면" 텔레포트 공만 리스폰
    teleportEventStarted = true;

    const centerX = world.centerX;
    const centerY = world.centerY;
    const speed = ball.speed; // 텔레포트 공은 일반 공과 비슷한 속도
    teleportSpawnCount++;

    for (let i = 0; i < TELEPORT_BALL_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        teleportBalls.push({
            x: centerX,
            y: centerY,
            r: ball.r / 3, // 텔레포트 공 크기(일반 공의 1/3)
            vx,
            vy,
            speed,
            stuckTimer: 0,
        });
    }

    setEvent(`텔레포트 공 이벤트! (${teleportSpawnCount})`);
    // 텔레포트는 불/점액 확률 디케이 로직에 영향을 주지 않게만,
    // 다음 선택의 "최근 이벤트" 기록은 갱신
    recordEventType("teleport");
}

function updateTeleportBalls(dt) {
    if (!teleportEventStarted) return;
    if (ballsFrozen) return;

    for (const p of teleportBalls) {
        // 벽에 붙어있는 시간 동안은 멈춰있음
        if (p.stuckTimer > 0) {
            p.stuckTimer -= dt;
            p.vx = 0;
            p.vy = 0;

            if (p.stuckTimer <= 0) {
                // 2초 뒤: 안쪽 랜덤 위치에서 다시 랜덤 방향 발사
                const angle = Math.random() * Math.PI * 2;
                const speed = p.speed ?? ball.speed;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
            }
            continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 원형 벽 충돌: "벽에 붙이치면" 안쪽 랜덤 위치로 순간 이동 + 2초 대기
        const dx = p.x - world.centerX;
        const dy = p.y - world.centerY;
        const dist = Math.hypot(dx, dy);
        const limit = world.wallRadius - 18 - p.r;

        if (dist > limit && dist > 0) {
            // 텔레포트 위치(돌벽 안쪽): 원형 내부 랜덤 포인트
            const innerLimit = limit;
            const theta = Math.random() * Math.PI * 2;
            // 벽에 딱 붙지 않게 약간 안쪽으로 여유를 둠
            const radial = innerLimit * 0.92 * Math.sqrt(Math.random()); // 면적 균등 분포

            p.x = world.centerX + Math.cos(theta) * radial;
            p.y = world.centerY + Math.sin(theta) * radial;

            p.stuckTimer = TELEPORT_STICK_DURATION;
            p.vx = 0;
            p.vy = 0;
        }
    }
}

function checkPlayerHitByBall() {
    if (gameState.dead) return;
    if (playerInvincibleTimer < playerInvincibleDuration) return; // 시작 후 무적

    const half = player.size * 0.5;

    // 1) 일반 공에 맞으면 사망
    if (ball.active) {
        const closestX = Math.max(player.x - half, Math.min(ball.x, player.x + half));
        const closestY = Math.max(player.y - half, Math.min(ball.y, player.y + half));
        const dx = ball.x - closestX;
        const dy = ball.y - closestY;
        const hit = (dx * dx + dy * dy) <= (ball.r * ball.r);
        if (hit) {
            gameState.dead = true;
            gameState.running = false;
            goToStartScreen();
            return;
        }
    }

    // 2) 불 공에 맞으면 빨강 + 속도 느려짐(사망 아님)
    if (fireEventStarted) {
        for (const p of fireBalls) {
            const closestX = Math.max(player.x - half, Math.min(p.x, player.x + half));
            const closestY = Math.max(player.y - half, Math.min(p.y, player.y + half));
            const dx = p.x - closestX;
            const dy = p.y - closestY;
            const hit = (dx * dx + dy * dy) <= (p.r * p.r);
            if (hit) {
                fireSlowTimer = fireSlowDuration;
                return;
            }
        }
    }

    // 3) 점액 공에 맞으면 초록 + 속도 느려짐(사망 아님)
    if (slimeEventStarted) {
        for (const p of slimeBalls) {
            const closestX = Math.max(player.x - half, Math.min(p.x, player.x + half));
            const closestY = Math.max(player.y - half, Math.min(p.y, player.y + half));
            const dx = p.x - closestX;
            const dy = p.y - closestY;
            const hit = (dx * dx + dy * dy) <= (p.r * p.r);
            if (hit) {
                slimeSlowTimer = slimeSlowDuration;
                return;
            }
        }
    }

    // 4) 텔레포트 공(검정 공)에 맞으면 사망
    if (teleportEventStarted) {
        for (const p of teleportBalls) {
            const closestX = Math.max(player.x - half, Math.min(p.x, player.x + half));
            const closestY = Math.max(player.y - half, Math.min(p.y, player.y + half));
            const dx = p.x - closestX;
            const dy = p.y - closestY;
            const hit = (dx * dx + dy * dy) <= (p.r * p.r);
            if (hit) {
                gameState.dead = true;
                gameState.running = false;
                goToStartScreen();
                return;
            }
        }
    }

    // 5) 시간 공에 닿으면 1초간 이동 불가(넘어짐)
    if (timeEventStarted) {
        for (const p of timeBalls) {
            const closestX = Math.max(player.x - half, Math.min(p.x, player.x + half));
            const closestY = Math.max(player.y - half, Math.min(p.y, player.y + half));
            const dx = p.x - closestX;
            const dy = p.y - closestY;
            const hit = (dx * dx + dy * dy) <= (p.r * p.r);
            if (hit) {
                timeStunTimer = TIME_STUN_DURATION;
                setEvent("시간 정지!");
                return;
            }
        }
    }

    // 6) 회피 공에 닿으면 사망
    if (dodgeEventStarted) {
        for (const p of dodgeBalls) {
            const closestX = Math.max(player.x - half, Math.min(p.x, player.x + half));
            const closestY = Math.max(player.y - half, Math.min(p.y, player.y + half));
            const dx = p.x - closestX;
            const dy = p.y - closestY;
            const hit = (dx * dx + dy * dy) <= (p.r * p.r);
            if (hit) {
                gameState.dead = true;
                gameState.running = false;
                goToStartScreen();
                return;
            }
        }
    }

    // 7) 악어 공(추적 중): 3초 넘어짐, 공은 플레이어 반대 방향으로 도주 후 스턴 종료 시 재추적
    if (alligatorEventStarted) {
        const fleeSpd = ball.speed * SLIME_BALL_SPEED_MULTIPLIER;
        for (const p of alligatorBalls) {
            if (p.mode !== "chase") continue;
            const closestX = Math.max(player.x - half, Math.min(p.x, player.x + half));
            const closestY = Math.max(player.y - half, Math.min(p.y, player.y + half));
            const dx = p.x - closestX;
            const dy = p.y - closestY;
            const hit = (dx * dx + dy * dy) <= (p.r * p.r);
            if (hit) {
                alligatorStunTimer = ALLIGATOR_STUN_DURATION;
                const ax = p.x - player.x;
                const ay = p.y - player.y;
                const d = Math.hypot(ax, ay);
                if (d < 1e-4) {
                    p.vx = fleeSpd;
                    p.vy = 0;
                } else {
                    p.vx = (ax / d) * fleeSpd;
                    p.vy = (ay / d) * fleeSpd;
                }
                p.mode = "flee";
                setEvent("악어에게 넘어짐!");
                return;
            }
        }
    }

    // 8) 탄성 공에 맞으면 넉백(사망 아님)
    if (elasticEventStarted) {
        for (const p of elasticBalls) {
            const closestX = Math.max(player.x - half, Math.min(p.x, player.x + half));
            const closestY = Math.max(player.y - half, Math.min(p.y, player.y + half));
            const dx = p.x - closestX;
            const dy = p.y - closestY;
            const hit = (dx * dx + dy * dy) <= (p.r * p.r);
            if (hit) {
                const vel = Math.hypot(p.vx, p.vy) || p.speed || 1;
                // 탄성 공이 가는 방향의 반대 방향으로 넉백
                const knockDirX = -p.vx / vel;
                const knockDirY = -p.vy / vel;

                player.x += knockDirX * ELASTIC_KNOCKBACK_DISTANCE;
                player.y += knockDirY * ELASTIC_KNOCKBACK_DISTANCE;

                // 벽 밖으로 나가지 않게 보정
                const pvx = player.x - world.centerX;
                const pvy = player.y - world.centerY;
                const dist = Math.hypot(pvx, pvy);
                const playerRadiusForCollision = player.size * 0.5;
                const maxDist = world.wallRadius - 18 - playerRadiusForCollision;
                if (dist > maxDist && dist > 0) {
                    player.x = world.centerX + (pvx / dist) * maxDist;
                    player.y = world.centerY + (pvy / dist) * maxDist;
                }

                setEvent("탄성 넉백!");
                return;
            }
        }
    }

    // 9) 저격 탄환에 맞으면 사망
    if (sniperBullets.length > 0) {
        for (const b of sniperBullets) {
            const closestX = Math.max(player.x - half, Math.min(b.x, player.x + half));
            const closestY = Math.max(player.y - half, Math.min(b.y, player.y + half));
            const dx = b.x - closestX;
            const dy = b.y - closestY;
            const hit = (dx * dx + dy * dy) <= (b.r * b.r);
            if (hit) {
                gameState.dead = true;
                gameState.running = false;
                goToStartScreen();
                return;
            }
        }
    }

    // 10) 전류: 같은 페어의 두 전류공 중심을 잇는 직선(히트박스)에 닿으면 사망(표시는 지그재그)
    if (electricPairs.length > 0) {
        const playerRad = half * Math.SQRT2; // 사각형 대각선 반
        const lineThresh = ELECTRIC_LINE_HIT_RADIUS + playerRad;
        const lineThreshSq = lineThresh * lineThresh;

        for (const pair of electricPairs) {
            const { b0, b1 } = pair;
            const d2 = distSqPointToSegment(player.x, player.y, b0.x, b0.y, b1.x, b1.y);
            if (d2 <= lineThreshSq) {
                gameState.dead = true;
                gameState.running = false;
                goToStartScreen();
                return;
            }
        }
    }
}

function drawScene() {
    // 회색 바닥
    ctx.fillStyle = "#8a8a8a";
    ctx.fillRect(0, 0, world.width, world.height);

    // 원형 돌벽(링 형태)
    ctx.beginPath();
    ctx.arc(world.centerX, world.centerY, world.wallRadius, 0, Math.PI * 2);
    ctx.lineWidth = 36;
    ctx.strokeStyle = "#666666";
    ctx.stroke();

    // 돌벽 디테일 라인
    ctx.setLineDash([8, 10]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(90, 90, 90, 0.8)";
    ctx.stroke();
    ctx.setLineDash([]);

    // 화면 중앙(맨 위)에 버틴 시간 문자열 표시
    // running이 꺼져 있으면 시간은 멈춘 값(survivalElapsedMs)으로 표시
    if (survivalStartMs != null && !gameState.dead) {
        const elapsedMs = survivalElapsedMs;
        // 시작 직후 0초로 보이지 않게, 최소 1초로 표시
        const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad2 = (n) => String(n).padStart(2, "0");

        // 1시간(=hours) 전에는 "0시"가 보이지 않게만 구성
        let text = "";
        if (days > 0) {
            text = `${days}일 ${pad2(hours)}시 ${pad2(minutes)}분 ${pad2(seconds)}초`;
        } else if (hours > 0) {
            text = `${hours}시 ${pad2(minutes)}분 ${pad2(seconds)}초`;
        } else {
            // days=0, hours=0 인 경우
            if (minutes > 0) text = `${minutes}분 ${pad2(seconds)}초`;
            else text = `${seconds}초`;
        }

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 6;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(text, world.centerX, 10);
        ctx.restore();
    }

    // 플레이어(파란 사각형) — 시간 스턴 시 검은 빛 + 기울어짐(넘어짐)
    const half = player.size / 2;
    if (playerInvincibleTimer < playerInvincibleDuration) {
        // 무적 시간에는 하얀 빛 테두리
        ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
        ctx.shadowBlur = 16;
    } else if (timeStunTimer > 0 || alligatorStunTimer > 0) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.92)";
        ctx.shadowBlur = 26;
    } else {
        ctx.shadowBlur = 0;
    }
    const isFire = fireSlowTimer > 0;
    const isSlime = !isFire && slimeSlowTimer > 0;
    const isTimeStun = timeStunTimer > 0 || alligatorStunTimer > 0;
    const fill = isTimeStun ? "#121212" : (isFire ? "#ff3b3b" : (isSlime ? "#3cff7a" : "#2f8cff"));
    const stroke = isTimeStun ? "#2a2a2a" : (isFire ? "#7a0f0f" : (isSlime ? "#0f6b25" : "#0f3a73"));
    ctx.fillStyle = fill;
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    if (isTimeStun) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(Math.PI * 0.24);
        ctx.fillRect(-half, -half, player.size, player.size);
        ctx.strokeRect(-half, -half, player.size, player.size);
        ctx.restore();
    } else {
        ctx.fillRect(player.x - half, player.y - half, player.size, player.size);
        ctx.strokeRect(player.x - half, player.y - half, player.size, player.size);
    }
    ctx.shadowBlur = 0;

    // 무적 남은 시간 표시 (플레이어 중앙)
    if (playerInvincibleTimer < playerInvincibleDuration) {
        const remain = Math.max(0, Math.ceil(playerInvincibleDuration - playerInvincibleTimer));
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(remain), player.x, player.y);
    }

    // 공
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    // 공만 컬러로 표시 (흑백 아님)
    ctx.fillStyle = ball.active ? "#fff1a8" : "#dbeaff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ball.active ? "#ffcc33" : "#6a8fcf";
    ctx.stroke();

    // 저격 공 빔 & 탄환
    if (sniperEventStarted) {
        for (const s of sniperBalls) {
            const dx = player.x - s.x;
            const dy = player.y - s.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.0001) continue;

            const nx = dx / dist;
            const ny = dy / dist;
            const len = Math.min(s.beamLen, dist);
            const hit = s.beamLen >= dist - SNIPER_HIT_EPS;

            // 빔
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + nx * len, s.y + ny * len);
            ctx.lineWidth = hit ? 4 : 2;
            ctx.shadowColor = hit ? "rgba(255, 60, 60, 0.85)" : "rgba(255, 60, 60, 0)";
            ctx.shadowBlur = hit ? 22 : 0;
            ctx.strokeStyle = `rgba(255, 60, 60, ${hit ? 0.85 : 0.25})`;
            ctx.stroke();
            ctx.restore();

            // 저격 공 소스
            ctx.save();
            ctx.shadowColor = hit ? "rgba(255, 60, 60, 0.55)" : "rgba(255, 60, 60, 0.25)";
            ctx.shadowBlur = hit ? 18 : 10;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = hit ? "rgba(255, 80, 80, 0.9)" : "rgba(255, 80, 80, 0.45)";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255, 180, 180, 0.65)";
            ctx.stroke();
            ctx.restore();
        }
    }

    if (sniperBullets.length > 0) {
        for (const b of sniperBullets) {
            ctx.save();
            ctx.shadowColor = "rgba(255, 220, 80, 0.95)";
            ctx.shadowBlur = 28;

            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = "#fff2a8";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffcc33";
            ctx.stroke();
            ctx.restore();
        }
    }

    // 시간 공 (보라·시간)
    if (timeEventStarted) {
        for (const p of timeBalls) {
            ctx.save();
            ctx.shadowColor = "rgba(160, 100, 255, 0.75)";
            ctx.shadowBlur = 18;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
            grad.addColorStop(0, "#e8d4ff");
            grad.addColorStop(0.45, "#8b5cf6");
            grad.addColorStop(1, "#3b0764");
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(200, 180, 255, 0.9)";
            ctx.stroke();
            ctx.restore();
        }
    }

    // 회피 공 (녹색·지그재그 이동)
    if (dodgeEventStarted) {
        for (const p of dodgeBalls) {
            ctx.save();
            ctx.shadowColor = "rgba(40, 255, 100, 0.65)";
            ctx.shadowBlur = 16;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
            grad.addColorStop(0, "#d4ffcc");
            grad.addColorStop(0.45, "#2ee85a");
            grad.addColorStop(1, "#0a5c22");
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(20, 120, 40, 0.95)";
            ctx.stroke();
            ctx.restore();
        }
    }

    // 중력 공 (주황)
    if (gravityEventStarted) {
        for (const p of gravityBalls) {
            ctx.save();
            ctx.shadowColor = "rgba(255, 140, 40, 0.85)";
            ctx.shadowBlur = 16;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
            grad.addColorStop(0, "#ffd4a8");
            grad.addColorStop(0.4, "#ff8c2a");
            grad.addColorStop(1, "#b84a00");
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(180, 60, 0, 0.95)";
            ctx.stroke();
            ctx.restore();
        }
    }

    // 탄성 공 (이벤트)
    if (elasticEventStarted) {
        for (const p of elasticBalls) {
            ctx.save();
            ctx.shadowColor = "rgba(0, 255, 200, 0.75)"; // 민트 글로우
            ctx.shadowBlur = 18;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
            grad.addColorStop(0, "#d9fff7");
            grad.addColorStop(0.35, "#2dffd0");
            grad.addColorStop(1, "#006e5a");
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(80, 255, 215, 0.95)";
            ctx.stroke();
            ctx.restore();
        }
    }

    // 텔레포트 공 (검정 공)
    if (teleportEventStarted) {
        for (const p of teleportBalls) {
            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = "#0b0b0b";
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "#2b2b2b";
            ctx.stroke();

            ctx.restore();
        }
    }

    // 전류 공 + 민트 지그재그(페어만 연결)
    if (electricPairs.length > 0) {
        for (const pair of electricPairs) {
            const { b0, b1 } = pair;
            drawElectricZigzagBetween(b0.x, b0.y, b0.r, b1.x, b1.y, b1.r);
        }
        for (const pair of electricPairs) {
            for (const p of [pair.b0, pair.b1]) {
                ctx.save();
                ctx.shadowColor = "rgba(40, 40, 40, 0.5)";
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r);
                g.addColorStop(0, "#5a5a5a");
                g.addColorStop(1, "#2a2a2a");
                ctx.fillStyle = g;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#1a1a1a";
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    // 불 공 (이벤트)
    if (fireEventStarted) {
        for (const p of fireBalls) {
            ctx.save();
            // 불 공은 컬러(불/화염)로 표시
            ctx.shadowColor = "rgba(255, 120, 0, 0.85)";
            ctx.shadowBlur = 16;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
            grad.addColorStop(0, "#ffd36a");
            grad.addColorStop(0.45, "#ff6a00");
            grad.addColorStop(1, "#8a1f00");
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(90, 20, 0, 0.9)";
            ctx.stroke();
            ctx.restore();
        }
    }

    // 점액 공 (이벤트)
    if (slimeEventStarted) {
        for (const p of slimeBalls) {
            ctx.save();
            // 끈적한 느낌: 그림자/광 보정은 약하게
            ctx.shadowColor = "rgba(60, 255, 120, 0.25)";
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

            const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
            grad.addColorStop(0, "#c7ffea");
            grad.addColorStop(0.5, "#39ff7a");
            grad.addColorStop(1, "#0f6b2a");
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(0, 90, 30, 0.85)";
            ctx.stroke();
            ctx.restore();
        }
    }
}

function updateUI() {
    document.getElementById("score").textContent = "점수: 0";
    if (gameState.dead) {
        document.getElementById("items").textContent = "상태: 사망";
    } else if (timeStunTimer > 0) {
        document.getElementById("items").textContent = `상태: 넘어짐(이동 불가) ${Math.max(0, Math.ceil(timeStunTimer))}초`;
    } else if (playerInvincibleTimer < playerInvincibleDuration) {
        document.getElementById("items").textContent = `상태: 무적 ${Math.max(0, Math.ceil(playerInvincibleDuration - playerInvincibleTimer))}초`;
    } else {
        document.getElementById("items").textContent = ball.active ? "상태: 공 이동 중" : `상태: 공 시작까지 ${Math.max(0, Math.ceil(5 - ballLaunchTimer))}초`;
    }
    document.getElementById("gunName").textContent = "플레이어";
    document.getElementById("gunAmmo").textContent = "WASD·↑↓ 이동 / ←→ 스킬";
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playStartFadeTransition() {
    const overlay = document.getElementById("fadeOverlay");
    if (!overlay) return;
    overlay.classList.add("visible");
    await wait(450);
}

async function startGame() {
    if (isStartTransitioning) return;
    isStartTransitioning = true;

    resetLobbyToShopView();

    await playStartFadeTransition();

    // 화면이 완전히 검정이 되었을 때 시작 버튼/로비 UI 바로 숨김
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameOver").classList.add("hidden");
    // 시작 시 개발자 패널 숨김
    document.getElementById("devPanel")?.classList.add("hidden");
    document.getElementById("devAddEventPanel")?.classList.add("hidden");

    gameState.running = true;
    gameState.dead = false;
    ballsFrozen = false;
    strengthTimer = 0;
    strengthCastSpeed = 0;
    updateSkillHUD();
    setSkillHUDVisible(true);
    // 버틴 시간(경과시간) 시작
    survivalStartMs = performance.now();
    survivalElapsedMs = 0;
    lastEventText = "";
    player.x = world.centerX;
    player.y = world.centerY; // 시작 시 정중앙
    ball.x = world.centerX;
    ball.y = world.centerY;
    ball.vx = 0;
    ball.vy = 0;
    ball.active = false;
    ballLaunchTimer = 0;
    playerInvincibleTimer = 0;
    fireSlowTimer = 0;
    fireBalls.length = 0;
    fireEventStarted = false;
    fireNextSpawnInMs = fireSpawnIntervalMs;
    fireSpawnCount = 0;
    fireEventProb = 0.5;
    slimeEventProb = 0.5;
    slimeBalls.length = 0;
    slimeEventStarted = false;
    slimeSpawnCount = 0;
    slimeSlowTimer = 0;
    eventSpawnIndex = 0;
    lastTwoEventTypes = [];
    teleportBalls.length = 0;
    teleportEventStarted = false;
    teleportSpawnCount = 0;
    elasticBalls.length = 0;
    elasticEventStarted = false;
    elasticSpawnCount = 0;
    sniperBalls.length = 0;
    sniperBullets.length = 0;
    sniperEventStarted = false;
    sniperSpawnCount = 0;
    invincibleRewindApplied = false;
    electricPairs.length = 0;
    electricSpawnCount = 0;
    gravityBalls.length = 0;
    gravityEventStarted = false;
    gravitySpawnCount = 0;
    timeBalls.length = 0;
    timeEventStarted = false;
    timeSpawnCount = 0;
    dodgeBalls.length = 0;
    dodgeEventStarted = false;
    dodgeSpawnCount = 0;
    timeStunTimer = 0;
    // 이벤트 로그 초기화 (새 이벤트는 여기서부터 직접 추가)
    setEvent("");

    updateFreezeButtonLabel();

    // 준비 완료 후 검정 페이드 해제
    const overlay = document.getElementById("fadeOverlay");
    if (overlay) {
        overlay.classList.remove("visible");
        await wait(450);
    }

    isStartTransitioning = false;
}

function restartGame() {
    startGame();
}

function spawnEventNow() {
    if (!gameState.running) return;

    // 자동 이벤트 선택 로직과 동일하게 1번 강제 시작
    if (shouldSpawnTeleportEvent()) {
        startTeleportEventFromCenter();
    } else {
        const r = Math.random();
        if (r < ELASTIC_EVENT_PROB) {
            startElasticEventFromCenter();
        } else if (r < ELASTIC_EVENT_PROB + (1 - ELASTIC_EVENT_PROB) * SNIPER_EVENT_PROB_RATIO) {
            startSniperEventFromCenter();
        } else {
            if (Math.random() < GRAVITY_EVENT_PROB) {
                startGravityEventFromCenter();
            } else if (Math.random() < TIME_EVENT_PROB) {
                startTimeEventFromCenter();
            } else if (Math.random() < DODGE_EVENT_PROB) {
                startDodgeEventFromCenter();
            } else if (Math.random() < ELECTRIC_EVENT_PROB) {
                startElectricEventFromCenter();
            } else if (Math.random() < fireEventProb) {
                startFireEventFromCenter();
            } else {
                startSlimeEventFromCenter();
            }
        }
    }

    // 방금 추가한 이벤트 직후에 연속으로 튀어나오지 않게 다음 스폰 타이머를 리셋
    fireNextSpawnInMs = fireSpawnIntervalMs;
}

function killNow() {
    // 디버그 버튼용 즉시 사망
    goToStartScreen();
}

function updateFreezeButtonLabel() {
    const freezeBtn = document.getElementById("devToggleFreeze");
    if (!freezeBtn) return;
    freezeBtn.textContent = ballsFrozen ? "공 재개" : "공 멈추기";
}

function toggleFreezeAllBalls() {
    ballsFrozen = !ballsFrozen;
    updateFreezeButtonLabel();
    setEvent(ballsFrozen ? "개발자모드: 공 멈춤" : "개발자모드: 공 재개");
}

function openDevPanel() {
    const panel = document.getElementById("devPanel");
    if (!panel) return;
    panel.classList.remove("hidden");
}

function closeDevPanel() {
    const panel = document.getElementById("devPanel");
    if (!panel) return;
    panel.classList.add("hidden");
}

function setupDevModeUI() {
    const toggleBtn = document.getElementById("devModeToggle");
    const addEventBtn = document.getElementById("devAddEvent");
    const killBtn = document.getElementById("devKill");
    const freezeBtn = document.getElementById("devToggleFreeze");
    const closeBtn = document.getElementById("devClose");
    const addEventPanel = document.getElementById("devAddEventPanel");
    const addFireBtn = document.getElementById("devAddFire");
    const addSlimeBtn = document.getElementById("devAddSlime");
    const addTeleportBtn = document.getElementById("devAddTeleport");
    const addElasticBtn = document.getElementById("devAddElastic");
    const addSniperBtn = document.getElementById("devAddSniper");
    const addElectricBtn = document.getElementById("devAddElectric");
    const addGravityBtn = document.getElementById("devAddGravity");
    const addTimeBtn = document.getElementById("devAddTime");
    const addDodgeBtn = document.getElementById("devAddDodge");
    const addEventCloseBtn = document.getElementById("devAddEventClose");

    if (!toggleBtn || !addEventBtn || !killBtn || !freezeBtn || !closeBtn) return;

    updateFreezeButtonLabel();

    toggleBtn.addEventListener("click", () => {
        const panel = document.getElementById("devPanel");
        if (!panel) return;
        if (panel.classList.contains("hidden")) openDevPanel();
        else closeDevPanel();
    });

    // 이벤트 추가 버튼: "한개 더" 이벤트 선택창 열기
    addEventBtn.addEventListener("click", () => {
        if (addEventPanel) addEventPanel.classList.remove("hidden");
    });

    if (addEventPanel) {
        addEventCloseBtn?.addEventListener("click", () => addEventPanel.classList.add("hidden"));

        addFireBtn?.addEventListener("click", () => {
            startFireEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
        addSlimeBtn?.addEventListener("click", () => {
            startSlimeEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
        addTeleportBtn?.addEventListener("click", () => {
            startTeleportEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
        addElasticBtn?.addEventListener("click", () => {
            startElasticEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
        addSniperBtn?.addEventListener("click", () => {
            startSniperEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
        addElectricBtn?.addEventListener("click", () => {
            startElectricEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
        addGravityBtn?.addEventListener("click", () => {
            startGravityEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
        addTimeBtn?.addEventListener("click", () => {
            startTimeEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
        addDodgeBtn?.addEventListener("click", () => {
            startDodgeEventFromCenter();
            addEventPanel.classList.add("hidden");
        });
    }

    killBtn.addEventListener("click", () => killNow());
    freezeBtn.addEventListener("click", () => toggleFreezeAllBalls());
    closeBtn.addEventListener("click", () => {
        closeDevPanel();
        if (addEventPanel) addEventPanel.classList.add("hidden");
    });

    // 게임 시작 버튼 누를 때 패널을 닫아두기(선택)
    // (startGame은 아래에서 DOM 조작을 하므로, 여기서는 초기값만 처리)
}

function goToStartScreen() {
    const earnedCoins = Math.max(0, Math.floor(survivalElapsedMs / 1000));

    // 사망하면 다시 "처음 화면"으로 돌아감
    gameState.running = false;
    gameState.dead = true; // 시간 표시/사망 판정을 막기 위함
    ballsFrozen = false;
    updateFreezeButtonLabel();
    strengthTimer = 0;
    strengthCastSpeed = 0;
    setSkillHUDVisible(false);

    // 사망 시 개발자 패널 숨김
    document.getElementById("devPanel")?.classList.add("hidden");
    document.getElementById("devAddEventPanel")?.classList.add("hidden");

    survivalStartMs = null;
    survivalElapsedMs = 0;

    // 공/이벤트/디버프 초기화 (화면에 잔상 방지)
    ball.x = world.centerX;
    ball.y = world.centerY;
    ball.vx = 0;
    ball.vy = 0;
    ball.active = false;
    ballLaunchTimer = 0;

    player.x = world.centerX;
    player.y = world.centerY;
    playerInvincibleTimer = 0;
    fireSlowTimer = 0;
    slimeSlowTimer = 0;
    timeStunTimer = 0;

    fireEventStarted = false;
    fireSpawnCount = 0;
    fireNextSpawnInMs = fireSpawnIntervalMs;
    fireEventProb = 0.5;
    fireBalls.length = 0;

    slimeEventStarted = false;
    slimeSpawnCount = 0;
    slimeBalls.length = 0;
    slimeSlowTimer = 0;
    slimeEventProb = 0.5;

    teleportEventStarted = false;
    teleportSpawnCount = 0;
    teleportBalls.length = 0;
    elasticEventStarted = false;
    elasticSpawnCount = 0;
    elasticBalls.length = 0;
    sniperEventStarted = false;
    sniperSpawnCount = 0;
    sniperBalls.length = 0;
    sniperBullets.length = 0;
    electricPairs.length = 0;
    electricSpawnCount = 0;
    gravityBalls.length = 0;
    gravityEventStarted = false;
    gravitySpawnCount = 0;
    timeBalls.length = 0;
    timeEventStarted = false;
    timeSpawnCount = 0;
    dodgeBalls.length = 0;
    dodgeEventStarted = false;
    dodgeSpawnCount = 0;
    lastTwoEventTypes = [];

    invincibleRewindApplied = false;
    eventSpawnIndex = 0;

    resetLobbyToShopView();

    // UI 전환
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("gameOver").classList.add("hidden");
    if (earnedCoins > 0) {
        shopCoins += earnedCoins;
        renderShopCoins();
        setEvent(`사망! +${earnedCoins}원 획득`);
    } else {
        setEvent("사망!");
    }

    // 로비 상점 탭 UI는 고정(아이템/업그레이드 준비중)
}

function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    // running이 아니어도 "공/이벤트 공"은 계속 움직이도록 물리 업데이트 분리
    if (gameState.running) {
        playerInvincibleTimer += dt;

        // 불/점액 공 피격 디버프 타이머 감소
        fireSlowTimer = Math.max(0, fireSlowTimer - dt);
        slimeSlowTimer = Math.max(0, slimeSlowTimer - dt);
        timeStunTimer = Math.max(0, timeStunTimer - dt);

        // 근력 스킬 타이머
        if (strengthTimer > 0) {
            strengthTimer += dt;
            if (strengthTimer >= STRENGTH_TOTAL_SECONDS) strengthTimer = 0;
        }

        // running이 켜져 있을 때만 경과시간 누적 (숨겨두면 멈춤)
        survivalElapsedMs = performance.now() - survivalStartMs;

        // 남은 무적 시간이 "1초로 표시되기 직전"에 프레임이 건너뛰면
        if (!invincibleRewindApplied && playerInvincibleTimer >= playerInvincibleDuration - 1) {
            playerInvincibleTimer = playerInvincibleDuration - 1;
            invincibleRewindApplied = true;
        }

        // 공/불공 시작 타이머
        if (!ballsFrozen) {
            ballLaunchTimer += dt;
            if (!ball.active && ballLaunchTimer >= 5) {
                launchBallFromCenter();
                setEvent("공 발사!");
            }
        }

        // 이벤트는 시작 후 20초마다 랜덤으로 시작
        fireNextSpawnInMs -= dt * 1000;
        while (fireNextSpawnInMs <= 0) {
            // 최근 2개가 "불 + 점액"이면, 50% 확률로 텔레포트 공(검정 공)을 스폰
            if (shouldSpawnTeleportEvent()) {
                startTeleportEventFromCenter();
            } else {
                const r = Math.random();
                if (r < ELASTIC_EVENT_PROB) {
                    startElasticEventFromCenter();
                } else if (r < ELASTIC_EVENT_PROB + (1 - ELASTIC_EVENT_PROB) * SNIPER_EVENT_PROB_RATIO) {
                    startSniperEventFromCenter();
                } else {
                    if (Math.random() < GRAVITY_EVENT_PROB) {
                        startGravityEventFromCenter();
                    } else if (Math.random() < TIME_EVENT_PROB) {
                        startTimeEventFromCenter();
                    } else if (Math.random() < DODGE_EVENT_PROB) {
                        startDodgeEventFromCenter();
                    } else if (Math.random() < ELECTRIC_EVENT_PROB) {
                        startElectricEventFromCenter();
                    } else if (Math.random() < fireEventProb) {
                        startFireEventFromCenter();
                    } else {
                        startSlimeEventFromCenter();
                    }
                }
            }
            fireNextSpawnInMs += fireSpawnIntervalMs;
        }

        updateMovement(dt);
    }

    // physics는 항상 진행(죽는 판정/UI만 running일 때)
    updateTimeBalls(dt);
    updateDodgeBalls(dt);
    updateGravityBalls(dt);
    updateBall(dt);
    updateElectricBalls(dt);
    updateFireBalls(dt);
    updateSlimeBalls(dt);
    updateElasticBalls(dt);
    updateSniperBalls(dt);
    updateSniperBullets(dt);
    updateTeleportBalls(dt);

    if (gameState.running) {
        checkPlayerHitByBall();
        updateUI();
    }

    drawScene();
}

window.startGame = startGame;
window.restartGame = restartGame;

init();
