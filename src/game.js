class TacticalGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 스터드(타일) 설정
        this.studSize = 50; // 1 스터드 크기 (픽셀)
        this.gridWidth = 0; // 가로 스터드 개수 (setupCanvas에서 계산)
        this.gridHeight = 0; // 세로 스터드 개수 (setupCanvas에서 계산)
        
        // 맵 데이터 (2D 배열) - true = 밝은 타일, false = 회색 바닥
        this.grid = [];
        
        // 선택된 타일
        this.selectedTile = null; // {x, y} 형태
        
        // 플레이어 설정
        this.player = {
            x: 0, // 픽셀 X 좌표 (setupCanvas 후 설정)
            y: 0, // 픽셀 Y 좌표 (setupCanvas 후 설정)
            width: 0, // 플레이어 너비 (스터드보다 조금 큼)
            height: 0, // 플레이어 높이 (스터드보다 조금 큼)
            speed: 3, // 이동 속도 (픽셀/프레임)
            stunTimer: 0, // 기절 타이머 (0이면 기절하지 않음)
            fireSpeedBoostTimer: 0, // 불 속도 증가 타이머 (10초 = 600프레임)
            fireEffect: { active: false, damageCooldown: 0, durationTimer: 0 } // 불 효과 (1초마다 대미지, 벗어난 후 7초 지속)
        };
        
        // 마우스 상태
        this.mouse = { x: 0, y: 0, isDown: false }; // 마우스 누름 상태
        
        // 키 입력 상태
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        
        // 적 설정
        this.enemies = []; // 적 배열
        this.enemySpawnTimer = 0; // 적 생성 타이머 (프레임 단위)
        this.enemySpawnInterval = 5 * 60; // 5초 (60fps 기준)
        this.monkeySpawnTimer = 0; // 원숭이 소환 타이머 (12스테이지용, 프레임 단위)
        this.monkeySpawnInterval = 50 * 60; // 50초 (60fps 기준)
        this.bossKilled = false; // 워터밤을 죽였는지 여부
        this.frameCount = 0; // 프레임 카운터
        this.enemySpeed = 2; // 적 이동 속도
        
        // 웨이브 시스템
        this.waveNumber = 1; // 현재 웨이브 번호
        this.waveTime = 30; // 웨이브 시간 (초)
        this.waveTimer = 30; // 현재 웨이브 타이머 (초)
        this.waveStarted = false; // 웨이브 시작 여부
        this.waveEnded = false; // 웨이브 종료 여부
        this.stage13InitialSkunkSpawned = false; // 13스테이지 첫 스컹크 소환 여부
        this.showRewardSelection = false; // 보상 선택 화면 표시 여부
        this.rewards = []; // 보상 선택지 배열
        this.rewardButtons = []; // 보상 버튼 영역 배열
        this.skipRewardButtonArea = null; // 건너뛰기 버튼 영역
        this.rerollRewardButtonArea = null; // 리롤 버튼 영역
        this.rerollCost = 50; // 리롤 비용 (처음 50, 누를 때마다 50씩 증가)
        this.rerollCountdown = null; // 리롤 카운트다운 (null이면 리롤 가능, 3,2,1,0)
        this.showCraftingTableReward = false; // 제작대 보상 화면 표시 여부
        this.craftingTableRewardButtonArea = null; // 제작대 보상 받기 버튼 영역
        this.showCraftingTable = false; // 제작대 UI 표시 여부
        this.craftingTableWindowArea = null; // 제작대 창 영역
        this.craftingSlots = [null, null]; // 조합 슬롯 2개
        this.craftingSlotColors = [null, null]; // 색상 슬롯 정보
        this.craftingResult = null; // 조합 결과
        this.craftingRecipes = {}; // 조합 레시피 { '아이템1,아이템2': '결과아이템' }
        this.craftingSlotAreas = [null, null]; // 조합 슬롯 영역
        this.craftingResultArea = null; // 조합 결과 영역
        this.craftingTableCloseButtonArea = null; // 제작대 닫기 버튼 영역
        this.showCraftingItemSelection = false; // 아이템 선택 창 표시 여부
        this.selectedCraftingSlot = null; // 현재 선택된 슬롯 인덱스 (0 또는 1)
        this.craftingItemSelectionWindowArea = null; // 아이템 선택 창 영역
        this.craftingItemButtonAreas = []; // 아이템 버튼 영역들
        this.craftingItemSelectionScrollOffset = 0; // 아이템 선택 창 스크롤 오프셋
        this.colorPalette = [
            { name: '회색', color: '#808080' },
            { name: '빨강', color: '#ff4d4d' },
            { name: '주황', color: '#ffa500' },
            { name: '노랑', color: '#ffd700' },
            { name: '초록', color: '#00c957' },
            { name: '파랑', color: '#1e90ff' },
            { name: '남색', color: '#4b0082' },
            { name: '보라', color: '#8a2be2' }
        ];
        
        // 조합 레시피 초기화
        this.initCraftingRecipes();
        this.startWaveButtonArea = null; // 웨이브 시작 버튼 영역
        this.skipWaveButtonArea = null; // 웨이브 건너뛰기 버튼 영역
        
        // 체력 시스템
        this.health = 100; // 초기 체력 100
        this.playerHitColorTimer = 0; // 플레이어 피격 색상 타이머
        this.enemyAttackCooldown = {}; // 적별 공격 쿨다운 (적 ID를 키로 사용)
        
        // 메인 메뉴 시스템
        this.showMainMenu = true; // 메인 메뉴 표시 여부
        this.menuState = 'start'; // 'start', 'modeSelect', 'chapterSelect'
        this.selectedMode = null; // 'main', 'sub'
        this.selectedChapter = null; // 1, 2, ...
        this.chapterScrollX = 0; // 장 선택 화면 스크롤 X
        this.targetScrollX = 0; // 목표 스크롤 X
        this.hoveredChapter = null; // 마우스 오버된 장
        this.chapterLastClickTime = {}; // 장별 마지막 클릭 시간 (더블클릭용)
        this.defenseTextShake = { x: 0, y: 0, timer: 0 }; // '공 방어' 텍스트 흔들림
        this.defeatedBosses = new Set(); // 잡은 보스 목록 (10: 워터밤, 20: 코뿔소, 30: 탱크)
        this.chapterClearMessage = { show: false, timer: 0, duration: 60 }; // 1장 클리어 메시지 (1초 = 60프레임)
        
        // 게임 오버 시스템
        this.gameOver = false; // 게임 오버 상태
        this.fadeAlpha = 0; // 페이드 아웃 알파값 (0 = 투명, 1 = 완전히 검음)
        this.fadeSpeed = 0.01; // 페이드 속도
        this.showGameOverMessage = false; // 게임 오버 메시지 표시 여부
        this.messageShowTime = 0; // 메시지가 표시된 후 경과 시간 (프레임)
        this.showRestartButton = false; // 재시작 버튼 표시 여부
        this.restartButtonArea = null; // 재시작 버튼 영역
        this.monsterName = '동그라미'; // 몬스터 이름
        this.diedFromPoison = false; // 독으로 죽었는지 여부
        this.diedFromBleeding = false; // 출혈로 죽었는지 여부
        this.diedFromFire = false; // 불로 죽었는지 여부
        this.savedWaveNumber = 1; // 저장된 웨이브 번호 (재시작 시 사용)
        this.savedInventory = []; // 저장된 인벤토리 (재시작 시 사용)
        this.savedExperience = 0; // 저장된 경험치 (재시작 시 사용)
        this.savedBlocks = []; // 저장된 블럭 (재시작 시 사용)
        
        // 코뿔소 먼지 효과
        this.dustEffect = { active: false, alpha: 0, duration: 0, maxDuration: 300, fadeOut: false, fadeOutTimer: 0 }; // 5초 = 300프레임
        this.dustParticles = []; // 먼지 파티클 배열 (코뿔소 뒤에서 나오는 먼지)
        
        // 아이템 이미지 로드
        this.itemImages = {}; // 아이템 타입별 이미지 저장
        this.enemyImages = {}; // 적 타입별 이미지 저장
        this.loadItemImages();
        this.loadEnemyImages();
        
        // 스컹크 방구 효과
        this.skunkFartEffect = { active: false, timer: 0, maxDuration: 600 }; // 10초 = 600프레임
        this.skunkFartDuration = 10; // 기본 방구 효과 시간 (초)
        
        // 인벤토리 시스템
        this.inventory = []; // 인벤토리 아이템 배열 [{type: '벽', count: 5, appearFrame: 0}, ...]
        this.inventoryOpen = false; // 인벤토리 창 열림 여부
        this.inventoryButtonArea = null; // 가방 버튼 영역
        this.inventoryWindowArea = null; // 인벤토리 창 영역
        this.closeButtonArea = null; // 닫기 버튼 영역
        this.deleteButtonArea = null; // 쓰레기통 버튼 영역
        this.upgradeButtonArea = null; // 업그레이드 버튼 영역
        this.giveItemsButtonArea = null; // 아이템 지급 버튼 영역
        this.spawnEnemyButtonArea = null; // 적 소환 버튼 영역 (노란색 X)
        this.showEnemySpawnWindow = false; // 적 소환 창 표시 여부
        this.enemySpawnWindowArea = null; // 적 소환 창 영역
        this.enemySpawnButtonAreas = {}; // 적 타입 선택 버튼 영역들
        this.enemySpawnScrollOffset = 0; // 적 소환 창 스크롤 오프셋
        this.gatlingButtonAreas = {}; // 캐틀링건 변환 버튼 영역들 (블록 인덱스를 키로 사용)
        this.fishSpawnButtonArea = null; // 물고기 소환 버튼 영역
        this.showFishSpawnWindow = false; // 물고기 소환 창 표시 여부
        this.fishSpawnWindowArea = null; // 물고기 소환 창 영역
        this.fishSpawnButtonAreas = {}; // 물고기 타입 선택 버튼 영역들
        this.selectedInventoryItem = null; // 선택된 인벤토리 아이템 인덱스
        this.deleteMode = false; // 블록 삭제 모드
        this.upgradeMode = false; // 블록 업그레이드 모드
        
        // 경험치 시스템
        this.experience = 0; // 현재 경험치
        this.blockUpgradeBaseCost = 200; // 블록 업그레이드 기본 비용
        this.experienceOrbs = []; // 경험치 구슬 배열 [{x, y, expValue, radius, ...}]
        this.expParticles = []; // 경험치 획득 파티클 배열 [{x, y, vx, vy, life, maxLife, ...}]
        this.waterPools = []; // 물 웅덩이 배열 [{x, y, width, height, ...}]
        this.waterParticles = []; // 물 파티클 배열 [{x, y, vx, vy, life, maxLife, ...}]
        this.waterPoolsGenerated = false; // 물 웅덩이 생성 완료 플래그
        
        // 화염병 시스템
        this.gasolineBombProjectiles = []; // 화염병 발사체 배열 [{x, y, vx, vy, radius, targetEnemy}]
        this.gasolineBombHitboxes = []; // 화염병 히트박스 배열 [{x, y, radius, timer, duration, particles}]
        this.fireParticles = []; // 불 파티클 배열 [{x, y, vx, vy, life, maxLife, size}]
        
        // 플레이어 업그레이드 시스템
        this.playerUpgrades = {
            damage: { level: 1, baseCost: 100 }, // 대미지 레벨 및 기본 비용
            health: { level: 1, baseCost: 100 }, // 체력 레벨 및 기본 비용
            speed: { level: 1, baseCost: 100 },   // 속도 레벨 및 기본 비용
            range: { level: 1, baseCost: 50 }   // 사거리 레벨 및 기본 비용 (처음 50, 레벨당 +25)
        };
        this.showPlayerUpgradeWindow = false; // 플레이어 업그레이드 창 표시 여부
        this.playerUpgradeWindowArea = null; // 플레이어 업그레이드 창 영역
        this.playerUpgradeCloseButtonArea = null; // 닫기 버튼 영역
        this.playerUpgradeButtonAreas = {}; // 업그레이드 버튼 영역들
        this.lastClickTime = 0; // 더블 클릭 감지용
        this.lastClickPos = null; // 더블 클릭 위치
        this.inventoryAppearDelay = 10; // 인벤토리 아이템이 나타나는 프레임 간격
        
        // 블록 시스템
        this.blocks = []; // 설치된 블록 배열 [{type: '벽', x, y, health, ...}]
        this.blockHealths = {
            '물블럭': 20,
            '물총': 15,
            '물대포': 20,
            '깊은물블럭': 30,
            '심연블럭': 50,
            '벽': 20,
            '아처': 10,
            '가시': 5,
            '문': 30,
            '지뢰': 1,
            '물먹은스펀지벽': 20,
            '석궁': 10,
            '가시가있는벽': 20,
            '강철아처': 50,
            '모래벽': 50,
            '섬광탄': 10,
            '섬광 지뢰': 1,
            '총알 지뢰': 1,
            '화염병': 1,
            '색상(제작용)': 5
        };
        
        // 방어 동그라미가 소환하는 벽 시스템
        this.enemyWalls = []; // 적이 소환한 벽 배열 [{x, y, width, height, direction}]
        
        // 아처 발사체 시스템
        this.archerProjectiles = [];
        this.playerBullets = [];
        this.gunCooldown = 0;
        this.minigunCooldown = 0;
        this.flashbangCooldown = 0; // 섬광탄 쿨다운
        this.selectedWeapon = 'sword';
        this.flashbangs = []; // 섬광탄 감지 히트박스 배열 [{x, y, hitboxRadius, triggered}]
        this.flashbangProjectiles = []; // 섬광탄 발사체 배열 [{x, y, vx, vy, radius, life, explosionRadius}]
        this.flashbangExplosions = []; // 섬광탄 폭발 이펙트 배열 [{x, y, radius, timer, duration}]
        this.screenFlash = { active: false, timer: 0, duration: 0, fadeDuration: 0, fadeOut: false, fadeTimer: 0 }; // 화면 하얀색 효과
        this.enemyFlashEffects = {}; // 적별 섬광 이펙트 타이머
        this.enemyStunTimers = {}; // 적별 기절 타이머
        this.flashbangUnlocked = false; // 섬광탄 해금 여부
        this.enemyProjectiles = []; // 아처 발사체 배열 [{x, y, vx, vy, damage, ...}]
        
        // 적 발사체 시스템 (석궁 동그라미용)
        this.enemyProjectiles = []; // 적 발사체 배열 [{x, y, vx, vy, damage, ...}]
        
        // 물고기 시스템 (10스테이지용)
        this.fishes = []; // 물고기 배열 [{x, y, vx, vy, color, ...}]
        this.fishSpawnTimer = 0; // 물고기 생성 타이머
        this.fishSpawnInterval = 0.2 * 60; // 0.2초 (60fps 기준)
        this.hitByFish = false; // 물고기에 맞았는지 여부 (보스 스킬용)
        
        // 보스 시스템
        this.boss = null; // 보스 객체
        this.bossProjectiles = []; // 보스 발사체 배열 [{x, y, vx, vy, damage, isPoison, ...}]
        this.cannonProjectiles = []; // 대포 발사체 배열 [{x, y, vx, vy, radius, damage}]
        this.poisonEffect = { active: false, damage: 0, timer: 0, initialDamage: 0 }; // 독 효과 (initialDamage로 뱀/보스 구분)
        this.bleedingEffect = { active: false, damage: 0, timer: 0, particles: [] }; // 출혈 효과 (15대미지까지 2대미지씩)
        this.speedDebuffTimer = 0; // 속도 감소 타이머 (5초 = 300프레임)
        
        // 맵 도트딜 시스템 (맵에 닿으면 독 효과로 20데미지)
        this.mapDotDamage = { active: false, damage: 0, timer: 0, interval: 0.2 * 60, totalDamage: 20 }; // 0.2초마다 1데미지씩 총 20데미지
        
        // 검 공격 시스템
        this.swordAttack = {
            isAttacking: false, // 공격 중인지
            angle: 0, // 검의 각도 (라디안)
            progress: 0, // 공격 진행도 (0 ~ 1)
            duration: 6, // 공격 지속 시간 (프레임, 약 0.1초) - 속도 대폭 증가
            length: 120, // 검의 길이 - 거리 증가
            damage: 2, // 검 데미지
            hitEnemies: [] // 이번 공격에서 이미 맞은 적 ID 배열 (중복 데미지 방지)
        };
        
        // 총 발사체 시스템
        this.playerBullets = []; // 플레이어 총알 배열 [{x, y, vx, vy, damage, ...}]
        this.gunCooldown = 0; // 총 발사 쿨다운
        this.minigunCooldown = 0; // 미니건 발사 쿨다운
        
        // 무기 선택 시스템
        this.selectedWeapon = 'sword'; // 'sword', 'gun', 'minigun'
        
        // 아이템 설명 데이터
        this.itemDescriptions = {
            '벽': '적과 플레이어를 막는 벽\n체력: 20',
            '아처': '원거리 공격을 하는 아처\n체력: 10\n플레이어와 적이 통과 가능',
            '가시': '적에게 데미지를 주는 가시\n체력: 5\n플레이어와 적이 통과 가능',
            '문': '플레이어만 통과 가능한 문\n체력: 30\n플레이어가 가까이 가면 적도 통과 가능',
            '물블럭': '하늘색 불투명 블럭\n플레이어: 속도 증가\n적: 속도 감소\n물 튀김 효과\n10레벨: 깊은물블럭으로 변환',
            '물총': '사거리가 넓은 물총\n히트박스 안의 적을 공격\n맞은 적: 속도 1/3',
            '물대포': '강력한 물대포\n사거리가 넓고 히트박스 안의 적을 공격',
            '깊은물블럭': '깊은 물 블럭\n플레이어: 통과 불가\n적: 매우 느려짐\n30레벨: 심연블럭으로 변환',
            '심연블럭': '검은 심연 블럭\n플레이어: 통과 불가\n적: 보스 제외 즉사\n보스: 위에서 재생성, 체력 반감, 3초 무적',
            '지뢰': '투명한 지뢰 블럭\n범위 내 적에게 128 대미지\n방어력과 체력 동시 공격\n1회용 폭발',
            '섬광 지뢰': '섬광 효과를 가진 지뢰\n폭발 시 범위 내 적에게 데미지와 섬광 효과 적용',
            '총알 지뢰': '아처와 지뢰를 조합한 총알 지뢰\n범위 내 적이 들어오면 사방으로 파란 총알을 발사합니다',
            '제작대': '아이템을 조합할 수 있는 제작대\n2개의 아이템을 조합하여\n새로운 아이템을 만들 수 있습니다',
            '물먹은스펀지벽': '물을 먹은 스펀지 벽\n적이 튕길 때 히트박스 안의 적에게\n물 버프를 걸어 5초 동안 속도를 느리게 합니다',
            '나무(제작용)': '제작용 나무\n다른 아이템과 조합할 수 있는 재료입니다',
            '빛(제작용)': '제작용 원소\n다른 아이템과 조합할 수 있는 재료입니다',
            '색상(제작용)': '제작용 색상\n다른 아이템과 조합해 색을 바꿀 수 있습니다',
            '석궁': '강력한 석궁\n한 발에 총알 3개를 발사하며\n각 총알의 공격력은 15입니다',
            '가시가있는벽': '가시가 있는 벽\n적이 닿을 때마다 10 데미지를 받습니다',
            '강철아처': '강철 아처\n공격 속도가 느리지만\n공격력이 높고 체력이 많습니다',
            '모래벽': '모래 벽\n때릴 때마다 점점 커지다가\n체력이 다 닳으면 사라집니다',
            '스펀치 벽': '스펀지 벽\n적을 튕겨내는 벽',
            '개틀링 건': '연사력이 빠른 개틀링 건\n빠른 속도로 적을 공격합니다',
            '자석석': '자석석\n자석 효과를 가진 블럭',
            '스펀치벽': '스펀지 벽\n적을 튕겨내는 벽',
            '섬광탄': '섬광탄\n0 키로 장착\n히트박스 안의 적을 5초간 기절시킵니다\n쿨타임 2초',
            '화염병': '화염병\n범위 안에 적이 들어오면 발사체를 발사합니다\n적에게 닿으면 7.5초 동안 화염 히트박스를 생성합니다'
        };
        
        // 물총 발사체 배열
        this.waterGunProjectiles = [];
        
        // 물대포 시스템
        this.waterCannonTargets = []; // 물대포 타겟 배열 [{x, y, hitboxRadius, damage, timer, fadeOut, fadeOutTimer}]
        
        // 호버된 아이템 인덱스
        this.hoveredInventoryItem = null;
        
        // 렌더링 일시정지 플래그 (화면만 멈추고 게임 로직은 계속 작동)
        this.renderPaused = false;
        
        this.setupCanvas();
        this.initGrid();
        this.setupEventListeners();
        this.updateHealthDisplay(); // 초기 체력 표시
        this.gameLoop();
    }
    
    loadItemImages() {
        // 벽 이미지 로드
        const wallImage = new Image();
        wallImage.onload = () => {
            this.itemImages['벽'] = wallImage;
        };
        wallImage.onerror = () => {
            console.warn('벽 이미지를 로드할 수 없습니다.');
        };
        // 이미지 파일 경로 (사용자가 제공한 이미지 파일명에 맞게 수정 필요)
        wallImage.src = 'src/images/wall.png'; // 또는 실제 이미지 파일 경로
        
        // 모든 아이템 이미지 로드 (인벤토리 표시용)
        const itemImageMap = {
            '벽': 'wall.png',
            '스펀치 벽': 'sponge_wall.png',
            '개틀링 건': 'gatling_gun.png',
            '자석석': 'magnet_stone.png',
            '깊은물블럭': 'depp_mule.png',
            '심연블럭': 'abyss.png',
            '아처': 'archer.png',
            '가시': 'thorn.png',
            '물블럭': 'water.png',
            '물총': 'water_gun.png',
            '물대포': 'water_cannon.png',
            '제작대': 'production_stand.png',
            '지뢰': 'mine.png',
            '석궁': 'crossbow.png',
            '나무(제작용)': 'tree.png',
            '물먹은스펀지벽': 'water_sponge.png',
            '가시가있는벽': 'thorn_wall.png',
            '강철아처': 'steel_archer.png',
            '모래벽': 'Sand_wall.png',
            '섬광탄': 'flash_bomb.png',
            '섬광 지뢰': 'flash_mine.png',
            '빛(제작용)': 'Light.png',
            '색상(제작용)': 'color_element.png',
            '총알 지뢰': 'Bullets_mine.png',
            '화염병': 'gasoline_bomb.png'
        };
        
        // 각 아이템 타입별 이미지 로드
        for (let [itemType, imageFile] of Object.entries(itemImageMap)) {
            const img = new Image();
            img.onload = () => {
                this.itemImages[itemType] = img;
                console.log(`${itemType} 이미지(${imageFile}) 로드 성공`);
            };
            img.onerror = () => {
                console.warn(`${itemType} 이미지(${imageFile})를 로드할 수 없습니다. 경로: images/${imageFile}`);
            };
            img.src = `images/${imageFile}`;
        }
    }
    
    loadEnemyImages() {
        const loadEnemyImage = (type, file) => {
            const img = new Image();
            img.onload = () => {
                this.enemyImages[type] = img;
                console.log(`${type} 적 이미지(${file}) 로드 성공`);
            };
            img.onerror = () => {
                console.warn(`${type} 적 이미지(${file})를 로드할 수 없습니다. 경로: images/${file}`);
            };
            // 적 이미지들은 src/index.html 기준으로 images 폴더에 있음
            img.src = `images/${file}`;
        };
        
        loadEnemyImage('normal', 'e-1.png');
        loadEnemyImage('defense', 'e-2.png');
        loadEnemyImage('archer', 'e-4.png');
        loadEnemyImage('sharp', 'e-3.png');
        loadEnemyImage('snakeHead', 'e-5.png');
        loadEnemyImage('snakeBody', 'e-5-1.png');
        loadEnemyImage('monkey', 'e-6.png');
        loadEnemyImage('elephant', 'e-7.png');
        loadEnemyImage('rhino', 'e-8.png');
        loadEnemyImage('skunk', 'e-9.png');
        loadEnemyImage('knight', 'e-10.png');
        loadEnemyImage('soldier', 'e-11.png');
        loadEnemyImage('flash', 'e-12.png'); // 섬광 동그라미 이미지
        loadEnemyImage('fire', 'e-13.png'); // 화염 동그라미 이미지
        loadEnemyImage('cannon', 'e-14.png'); // 대포 이미지
        loadEnemyImage('tank', 'e-15.png'); // 탱크 이미지
    }
    
    setupCanvas() {
        // 전체 화면 크기 사용
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // 스터드 크기 고정
        this.studSize = 50;
        
        // 화면 전체를 스터드로 채우기 위해 그리드 크기 계산
        this.gridWidth = Math.ceil(this.canvas.width / this.studSize);
        this.gridHeight = Math.ceil(this.canvas.height / this.studSize);
        
        // 플레이어 크기 설정 (스터드보다 조금 큼)
        this.player.width = this.studSize * 0.8;
        this.player.height = this.studSize * 1.2; // 키가 큰 네모
        
        // 플레이어를 게임 가운데에 배치
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height / 2 - this.player.height / 2;
        
        // 그리드 재초기화
        this.initGrid();
    }
    
    initGrid() {
        // 그리드 초기화 - 화면 전체를 스터드로 채움
        this.grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = true; // 모든 타일 동일
            }
        }
    }
    
    setupEventListeners() {
        // 마우스 이동
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            this.mouse.x = mouseX;
            this.mouse.y = mouseY;
            
            // 메인 메뉴 호버 처리
            if (this.showMainMenu && this.menuState === 'chapterSelect' && this.chapterAreas) {
                let foundHover = false;
                for (let chapter in this.chapterAreas) {
                    const area = this.chapterAreas[chapter];
                    if (mouseX >= area.x && 
                        mouseX <= area.x + area.width &&
                        mouseY >= area.y && 
                        mouseY <= area.y + area.height) {
                        this.hoveredChapter = parseInt(chapter);
                        foundHover = true;
                        break;
                    }
                }
                if (!foundHover) {
                    this.hoveredChapter = null;
                }
            }
        });
        
        // 마우스 누름
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDown = true;
        });
        
        // 마우스 뗌
        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.isDown = false;
        });
        
        // 마우스가 캔버스 밖으로 나갔을 때
        this.canvas.addEventListener('mouseleave', (e) => {
            this.mouse.isDown = false;
        });
        
        // 마우스 휠 이벤트 (스컹크 효과 시간 조절)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // 적 소환 창이 열려있을 때만 작동
            if (this.showEnemySpawnWindow) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // 스컹크 버튼 위에 마우스가 있는지 확인
                const skunkButtonArea = this.enemySpawnButtonAreas['skunk'];
                if (skunkButtonArea) {
                    if (mouseX >= skunkButtonArea.x && 
                        mouseX <= skunkButtonArea.x + skunkButtonArea.width &&
                        mouseY >= skunkButtonArea.y && 
                        mouseY <= skunkButtonArea.y + skunkButtonArea.height) {
                        // 휠을 위로 올리면 시간 증가, 아래로 내리면 시간 감소
                        if (e.deltaY < 0) {
                            // 위로 스크롤 (시간 증가)
                            this.skunkFartDuration = Math.min(30, this.skunkFartDuration + 1);
                        } else {
                            // 아래로 스크롤 (시간 감소)
                            this.skunkFartDuration = Math.max(1, this.skunkFartDuration - 1);
                        }
                    }
                }
            }
        });
        
        // 마우스 클릭
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // 메인 메뉴 클릭 처리
            if (this.showMainMenu) {
                if (this.menuState === 'start' && this.playButtonArea) {
                    if (mouseX >= this.playButtonArea.x && 
                        mouseX <= this.playButtonArea.x + this.playButtonArea.width &&
                        mouseY >= this.playButtonArea.y && 
                        mouseY <= this.playButtonArea.y + this.playButtonArea.height) {
                        this.menuState = 'modeSelect';
                        return;
                    }
                } else if (this.menuState === 'modeSelect') {
                    if (this.mainModeButtonArea) {
                        if (mouseX >= this.mainModeButtonArea.x && 
                            mouseX <= this.mainModeButtonArea.x + this.mainModeButtonArea.width &&
                            mouseY >= this.mainModeButtonArea.y && 
                            mouseY <= this.mainModeButtonArea.y + this.mainModeButtonArea.height) {
                            this.selectedMode = 'main';
                            this.menuState = 'chapterSelect';
                            this.selectedChapter = 1;
                            this.targetScrollX = 0;
                            return;
                        }
                    }
                    if (this.subModeButtonArea) {
                        if (mouseX >= this.subModeButtonArea.x && 
                            mouseX <= this.subModeButtonArea.x + this.subModeButtonArea.width &&
                            mouseY >= this.subModeButtonArea.y && 
                            mouseY <= this.subModeButtonArea.y + this.subModeButtonArea.height) {
                            this.selectedMode = 'sub';
                            // 서브 모드 처리 (나중에 구현)
                            return;
                        }
                    }
                } else if (this.menuState === 'chapterSelect' && this.chapterAreas) {
                    // 장 클릭 처리
                    for (let chapter in this.chapterAreas) {
                        const area = this.chapterAreas[chapter];
                        if (mouseX >= area.x && 
                            mouseX <= area.x + area.width &&
                            mouseY >= area.y && 
                            mouseY <= area.y + area.height) {
                            const chapterNum = parseInt(chapter);
                            
                            // 더블클릭 체크
                            const now = Date.now();
                            const lastClickTime = this.chapterLastClickTime[chapterNum] || 0;
                            if (now - lastClickTime < 300) { // 300ms 내 더블클릭
                                // 게임 시작 (웨이브는 시작하지 않음, 버튼을 눌러야 시작)
                                this.showMainMenu = false;
                                this.waveNumber = 1;
                                this.waveStarted = false; // 웨이브 시작 안 함
                                // startWave() 호출하지 않음 - 웨이브 시작 버튼을 눌러야 시작
                                return;
                            }
                            this.chapterLastClickTime[chapterNum] = now;
                            
                            // 장 선택
                            const centerX = this.canvas.width / 2;
                            const chapterWidth = 400;
                            const chapterSpacing = 50;
                            
                            // 이미 선택된 장을 다시 클릭한 경우
                            if (this.selectedChapter === chapterNum && chapterNum === 2) {
                                // 2장이 이미 선택되어 있고 다시 클릭하면 '1장 클리어' 메시지 표시
                                this.chapterClearMessage.show = true;
                                this.chapterClearMessage.timer = 0;
                            } else {
                                // 장 선택
                                this.selectedChapter = chapterNum;
                                // 선택된 장이 화면 중앙에 오도록 스크롤
                                // 1장은 중앙(0), 2장은 오른쪽(chapterWidth + chapterSpacing)
                                const targetOffset = (chapterNum - 1) * (chapterWidth + chapterSpacing);
                                this.targetScrollX = -targetOffset;
                            }
                            return;
                        }
                    }
                }
                return; // 메인 메뉴가 표시되면 다른 클릭 처리는 하지 않음
            }
            
            // 게임 오버 상태에서 돌아가기 버튼 클릭 체크
            if (this.gameOver && this.showRestartButton && this.restartButtonArea) {
                if (mouseX >= this.restartButtonArea.x && 
                    mouseX <= this.restartButtonArea.x + this.restartButtonArea.width &&
                    mouseY >= this.restartButtonArea.y && 
                    mouseY <= this.restartButtonArea.y + this.restartButtonArea.height) {
                    this.restartGame();
                    return;
                }
            }
            
            // 웨이브 시작 버튼 클릭 체크
            if (!this.waveStarted && this.startWaveButtonArea) {
                if (mouseX >= this.startWaveButtonArea.x && 
                    mouseX <= this.startWaveButtonArea.x + this.startWaveButtonArea.width &&
                    mouseY >= this.startWaveButtonArea.y && 
                    mouseY <= this.startWaveButtonArea.y + this.startWaveButtonArea.height) {
                    this.startWave();
                    return;
                }
            }
            
            // 웨이브 건너뛰기 버튼 클릭 체크
            if (!this.waveStarted && this.skipWaveButtonArea) {
                if (mouseX >= this.skipWaveButtonArea.x && 
                    mouseX <= this.skipWaveButtonArea.x + this.skipWaveButtonArea.width &&
                    mouseY >= this.skipWaveButtonArea.y && 
                    mouseY <= this.skipWaveButtonArea.y + this.skipWaveButtonArea.height) {
                    this.skipWave();
                    return;
                }
            }
            
            // 아이템 지급 버튼 클릭 체크 (웨이브가 시작 안됐을 때만, 다른 모드와 상관없이 동작)
            if (this.giveItemsButtonArea && !this.gameOver && !this.showRewardSelection && !this.waveStarted) {
                if (mouseX >= this.giveItemsButtonArea.x && 
                    mouseX <= this.giveItemsButtonArea.x + this.giveItemsButtonArea.width &&
                    mouseY >= this.giveItemsButtonArea.y && 
                    mouseY <= this.giveItemsButtonArea.y + this.giveItemsButtonArea.height) {
                    this.giveItems();
                    return;
                }
            }
            
            // 적 소환 버튼 클릭 체크
            if (this.spawnEnemyButtonArea && !this.gameOver && !this.showRewardSelection) {
                if (mouseX >= this.spawnEnemyButtonArea.x && 
                    mouseX <= this.spawnEnemyButtonArea.x + this.spawnEnemyButtonArea.width &&
                    mouseY >= this.spawnEnemyButtonArea.y && 
                    mouseY <= this.spawnEnemyButtonArea.y + this.spawnEnemyButtonArea.height) {
                    this.showEnemySpawnWindow = !this.showEnemySpawnWindow;
                    if (this.showEnemySpawnWindow) {
                        this.enemySpawnScrollOffset = 0; // 창을 열 때 스크롤 초기화
                    }
                    return;
                }
            }
            
            // 적 소환 창 내부 클릭 체크
            if (this.showEnemySpawnWindow && this.enemySpawnWindowArea) {
                // 창 외부 클릭 시 닫기
                if (mouseX < this.enemySpawnWindowArea.x || 
                    mouseX > this.enemySpawnWindowArea.x + this.enemySpawnWindowArea.width ||
                    mouseY < this.enemySpawnWindowArea.y || 
                    mouseY > this.enemySpawnWindowArea.y + this.enemySpawnWindowArea.height) {
                    this.showEnemySpawnWindow = false;
                    return;
                }
                
                // 적 타입 버튼 클릭 체크
                const enemyTypes = ['normal', 'defense', 'sharp', 'archer', 'flash', 'snake', 'poisonSnake', 'monkey', 'elephant', 'rhino', 'skunk', 'soldier', 'knight', 'boss'];
                for (let i = 0; i < enemyTypes.length; i++) {
                    const enemyType = enemyTypes[i];
                    const buttonArea = this.enemySpawnButtonAreas[enemyType];
                    if (buttonArea) {
                        if (mouseX >= buttonArea.x && 
                            mouseX <= buttonArea.x + buttonArea.width &&
                            mouseY >= buttonArea.y && 
                            mouseY <= buttonArea.y + buttonArea.height) {
                            // 선택한 적 타입 소환
                            if (enemyType === 'boss') {
                                // X(적 소환 창)를 통해 워터밤을 소환할 때는 물고기 소환 비활성화
                                this.spawnBoss(true, { disableFishSpawn: true });
                            } else {
                                this.spawnEnemy(enemyType);
                            }
                            this.showEnemySpawnWindow = false;
                            return;
                        }
                    }
                }
            }
            
            // 가방 버튼 클릭 체크 (웨이브가 시작 안됐을 때만)
            if (this.inventoryButtonArea && !this.gameOver && !this.showRewardSelection && !this.waveStarted) {
                if (mouseX >= this.inventoryButtonArea.x && 
                    mouseX <= this.inventoryButtonArea.x + this.inventoryButtonArea.width &&
                    mouseY >= this.inventoryButtonArea.y && 
                    mouseY <= this.inventoryButtonArea.y + this.inventoryButtonArea.height) {
                    this.inventoryOpen = !this.inventoryOpen;
                    if (this.inventoryOpen) {
                        // 인벤토리 모드 활성화 시 다른 모드 비활성화
                        this.deleteMode = false;
                        this.upgradeMode = false;
                        this.selectedInventoryItem = null;
                    } else {
                        this.selectedInventoryItem = null;
                    }
                    return; // 인벤토리 버튼 클릭 시 다른 처리 방지
                }
            }
            
            // 쓰레기통 버튼 클릭 체크 (웨이브가 시작 안됐을 때만)
            if (this.deleteButtonArea && !this.gameOver && !this.showRewardSelection && !this.waveStarted) {
                if (mouseX >= this.deleteButtonArea.x && 
                    mouseX <= this.deleteButtonArea.x + this.deleteButtonArea.width &&
                    mouseY >= this.deleteButtonArea.y && 
                    mouseY <= this.deleteButtonArea.y + this.deleteButtonArea.height) {
                    this.deleteMode = !this.deleteMode;
                    if (this.deleteMode) {
                        // 삭제 모드 활성화 시 다른 모드 비활성화
                        this.selectedInventoryItem = null;
                        this.upgradeMode = false;
                        this.inventoryOpen = false;
                    }
                    // return 제거 - 다른 버튼도 눌리게 함
                }
            }
            
            // 업그레이드 버튼 클릭 체크 (웨이브가 시작 안됐을 때만)
            if (this.upgradeButtonArea && !this.gameOver && !this.showRewardSelection && !this.waveStarted) {
                if (mouseX >= this.upgradeButtonArea.x && 
                    mouseX <= this.upgradeButtonArea.x + this.upgradeButtonArea.width &&
                    mouseY >= this.upgradeButtonArea.y && 
                    mouseY <= this.upgradeButtonArea.y + this.upgradeButtonArea.height) {
                    this.upgradeMode = !this.upgradeMode;
                    if (this.upgradeMode) {
                        // 업그레이드 모드 활성화 시 다른 모드 비활성화
                        this.selectedInventoryItem = null;
                        this.deleteMode = false;
                        this.inventoryOpen = false;
                    }
                    // return 제거 - 다른 버튼도 눌리게 함
                }
            }
            
            // 인벤토리 창 내부 클릭 체크
            if (this.inventoryOpen) {
                // 닫기 버튼 클릭
                if (this.closeButtonArea) {
                    if (mouseX >= this.closeButtonArea.x && 
                        mouseX <= this.closeButtonArea.x + this.closeButtonArea.width &&
                        mouseY >= this.closeButtonArea.y && 
                        mouseY <= this.closeButtonArea.y + this.closeButtonArea.height) {
                        this.inventoryOpen = false;
                        this.selectedInventoryItem = null;
                        return;
                    }
                }
                
                // 인벤토리 아이템 클릭
                const itemSize = 80;
                const itemSpacing = 10;
                const startX = this.inventoryWindowArea.x + 20;
                const startY = this.inventoryWindowArea.y + 20;
                
                let visibleItemIndex = 0;
                const itemsPerRow = 5; // 한 줄에 5개씩
                for (let i = 0; i < this.inventory.length; i++) {
                    const item = this.inventory[i];
                    
                    // 아이템이 나타날 시간이 되었는지 확인
                    if (this.frameCount < item.appearFrame) {
                        continue; // 아직 나타나지 않음
                    }
                    
                    const row = Math.floor(visibleItemIndex / itemsPerRow); // 줄 번호 (0 또는 1)
                    const col = visibleItemIndex % itemsPerRow; // 열 번호
                    const itemX = startX + col * (itemSize + itemSpacing);
                    const itemY = startY + row * (itemSize + itemSpacing);
                    
                    if (mouseX >= itemX && mouseX <= itemX + itemSize &&
                        mouseY >= itemY && mouseY <= itemY + itemSize) {
                        // 제작대 아이템 클릭 시 제작대 UI 열기
                        if (item.type === '제작대') {
                            this.showCraftingTable = true;
                            this.inventoryOpen = false;
                            return;
                        }
                        
                        if (item.type === '색상(제작용)') {
                            const swatchSize = 24;
                            const swatchX = itemX + (itemSize - swatchSize) / 2;
                            const swatchY = itemY + 32;
                            if (mouseX >= swatchX && mouseX <= swatchX + swatchSize &&
                                mouseY >= swatchY && mouseY <= swatchY + swatchSize) {
                                this.cycleColorInventoryItem(item);
                                return;
                            }
                        }
                        
                        // 아이템 선택/해제
                        if (this.selectedInventoryItem === i) {
                            this.selectedInventoryItem = null;
                        } else {
                            this.selectedInventoryItem = i;
                            // 아이템 선택 시 인벤토리 창 자동 닫기
                            this.inventoryOpen = false;
                        }
                        return;
                    }
                    
                    visibleItemIndex++;
                }
                
                // 인벤토리 창 내부 클릭 (아이템이 아닌 곳)은 무시
                if (mouseX >= this.inventoryWindowArea.x && 
                    mouseX <= this.inventoryWindowArea.x + this.inventoryWindowArea.width &&
                    mouseY >= this.inventoryWindowArea.y && 
                    mouseY <= this.inventoryWindowArea.y + this.inventoryWindowArea.height) {
                    return;
                }
                
                // 인벤토리 버튼 클릭은 제외 (이미 위에서 처리됨)
                if (this.inventoryButtonArea && 
                    mouseX >= this.inventoryButtonArea.x && 
                    mouseX <= this.inventoryButtonArea.x + this.inventoryButtonArea.width &&
                    mouseY >= this.inventoryButtonArea.y && 
                    mouseY <= this.inventoryButtonArea.y + this.inventoryButtonArea.height) {
                    return; // 인벤토리 버튼 클릭은 무시
                }
                
                // 인벤토리 창 외부 클릭 시 창 닫기
                this.inventoryOpen = false;
            }
            
            // 플레이어 업그레이드 창 클릭 체크 (업그레이드 모드 체크보다 먼저)
            if (this.showPlayerUpgradeWindow && !this.gameOver && !this.showRewardSelection && !this.waveStarted) {
                // 닫기 버튼 (X) 클릭 체크
                if (this.playerUpgradeCloseButtonArea) {
                    if (mouseX >= this.playerUpgradeCloseButtonArea.x && 
                        mouseX <= this.playerUpgradeCloseButtonArea.x + this.playerUpgradeCloseButtonArea.width &&
                        mouseY >= this.playerUpgradeCloseButtonArea.y && 
                        mouseY <= this.playerUpgradeCloseButtonArea.y + this.playerUpgradeCloseButtonArea.height) {
                        this.showPlayerUpgradeWindow = false;
                        return;
                    }
                }
                
                // 업그레이드 버튼 클릭 체크
                for (let upgradeType in this.playerUpgradeButtonAreas) {
                    const buttonArea = this.playerUpgradeButtonAreas[upgradeType];
                    if (buttonArea && 
                        mouseX >= buttonArea.x && 
                        mouseX <= buttonArea.x + buttonArea.width &&
                        mouseY >= buttonArea.y && 
                        mouseY <= buttonArea.y + buttonArea.height) {
                        this.upgradePlayerStat(upgradeType);
                        return;
                    }
                }
                
                // 창 외부 클릭 시 창 닫기
                if (this.playerUpgradeWindowArea) {
                    if (mouseX < this.playerUpgradeWindowArea.x || 
                        mouseX > this.playerUpgradeWindowArea.x + this.playerUpgradeWindowArea.width ||
                        mouseY < this.playerUpgradeWindowArea.y || 
                        mouseY > this.playerUpgradeWindowArea.y + this.playerUpgradeWindowArea.height) {
                        this.showPlayerUpgradeWindow = false;
                        return;
                    }
                }
            }
            
            // 캐틀링건 변환 버튼 클릭 체크 (웨이브가 시작 안됐을 때만)
            // 주의: 석궁이 만렙이 되면 자동으로 캐틀링건이 되므로, 여기서는 수동 변환만 처리
            if (this.gatlingButtonAreas && !this.waveStarted && !this.gameOver && !this.showRewardSelection) {
                for (let blockIndex in this.gatlingButtonAreas) {
                    const buttonArea = this.gatlingButtonAreas[blockIndex];
                    if (buttonArea && 
                        mouseX >= buttonArea.x && 
                        mouseX <= buttonArea.x + buttonArea.width &&
                        mouseY >= buttonArea.y && 
                        mouseY <= buttonArea.y + buttonArea.height) {
                        // 아처만 캐틀링건으로 변환 가능 (캐틀링건은 다시 아처로 되돌릴 수 없음)
                        const block = this.blocks[buttonArea.blockIndex];
                        if (block && block.type === '아처' && (block.level || 1) >= 10) {
                            // 블록 타입을 캐틀링건으로 변경
                            block.type = '캐틀링건';
                            // 캐틀링건 능력치 설정
                            block.attackRange = 300; // 공격 범위 증가
                            block.isGatling = true; // 캐틀링건 모드
                        }
                        // 캐틀링건은 다시 아처로 되돌릴 수 없음
                        return;
                    }
                }
            }
            
            // 블록 업그레이드 모드 체크 (웨이브가 시작 안됐을 때만)
            if (this.upgradeMode && !this.waveStarted && !this.gameOver && !this.showRewardSelection) {
                // 플레이어 업그레이드 창이 열려있으면 블록 업그레이드 체크 건너뛰기
                if (this.showPlayerUpgradeWindow) {
                    return;
                }
                
                // 캐틀링건 버튼 클릭 체크
                if (this.gatlingButtonAreas) {
                    for (let blockIndex in this.gatlingButtonAreas) {
                        const buttonArea = this.gatlingButtonAreas[blockIndex];
                        if (buttonArea && 
                            mouseX >= buttonArea.x && 
                            mouseX <= buttonArea.x + buttonArea.width &&
                            mouseY >= buttonArea.y && 
                            mouseY <= buttonArea.y + buttonArea.height) {
                            // 캐틀링건 버튼 클릭은 무시 (이미 위에서 처리됨)
                            return;
                        }
                    }
                }
                
                // 플레이어 클릭 체크
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const playerDx = mouseX - playerCenterX;
                const playerDy = mouseY - playerCenterY;
                const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                const playerRadius = Math.max(this.player.width, this.player.height) / 2;
                
                // 플레이어 클릭 시 업그레이드 창 열기
                if (playerDistance < playerRadius + 20) {
                    this.showPlayerUpgradeWindow = true;
                    return;
                }
                
                // 다른 UI 요소와 충돌하지 않는지 확인
                if (this.inventoryButtonArea && 
                    mouseX >= this.inventoryButtonArea.x && 
                    mouseX <= this.inventoryButtonArea.x + this.inventoryButtonArea.width &&
                    mouseY >= this.inventoryButtonArea.y && 
                    mouseY <= this.inventoryButtonArea.y + this.inventoryButtonArea.height) {
                    // 가방 버튼 클릭은 무시
                } else if (this.deleteButtonArea && 
                    mouseX >= this.deleteButtonArea.x && 
                    mouseX <= this.deleteButtonArea.x + this.deleteButtonArea.width &&
                    mouseY >= this.deleteButtonArea.y && 
                    mouseY <= this.deleteButtonArea.y + this.deleteButtonArea.height) {
                    // 쓰레기통 버튼 클릭은 무시
                } else if (this.upgradeButtonArea && 
                    mouseX >= this.upgradeButtonArea.x && 
                    mouseX <= this.upgradeButtonArea.x + this.upgradeButtonArea.width &&
                    mouseY >= this.upgradeButtonArea.y && 
                    mouseY <= this.upgradeButtonArea.y + this.upgradeButtonArea.height) {
                    // 업그레이드 버튼 클릭은 무시
                } else if (this.startWaveButtonArea && 
                    mouseX >= this.startWaveButtonArea.x && 
                    mouseX <= this.startWaveButtonArea.x + this.startWaveButtonArea.width &&
                    mouseY >= this.startWaveButtonArea.y && 
                    mouseY <= this.startWaveButtonArea.y + this.startWaveButtonArea.height) {
                    // 웨이브 시작 버튼 클릭은 무시
                } else {
                    // 블록 업그레이드
                    this.upgradeBlock(mouseX, mouseY);
                    return; // 타일 선택 방지
                }
            }
            
            // 블록 삭제 모드 체크 (웨이브가 시작 안됐을 때만)
            if (this.deleteMode && !this.waveStarted && !this.gameOver && !this.showRewardSelection) {
                // 다른 UI 요소와 충돌하지 않는지 확인
                if (this.inventoryButtonArea && 
                    mouseX >= this.inventoryButtonArea.x && 
                    mouseX <= this.inventoryButtonArea.x + this.inventoryButtonArea.width &&
                    mouseY >= this.inventoryButtonArea.y && 
                    mouseY <= this.inventoryButtonArea.y + this.inventoryButtonArea.height) {
                    // 가방 버튼 클릭은 무시
                } else if (this.deleteButtonArea && 
                    mouseX >= this.deleteButtonArea.x && 
                    mouseX <= this.deleteButtonArea.x + this.deleteButtonArea.width &&
                    mouseY >= this.deleteButtonArea.y && 
                    mouseY <= this.deleteButtonArea.y + this.deleteButtonArea.height) {
                    // 쓰레기통 버튼 클릭은 무시 (이미 위에서 처리됨)
                } else if (this.upgradeButtonArea && 
                    mouseX >= this.upgradeButtonArea.x && 
                    mouseX <= this.upgradeButtonArea.x + this.upgradeButtonArea.width &&
                    mouseY >= this.upgradeButtonArea.y && 
                    mouseY <= this.upgradeButtonArea.y + this.upgradeButtonArea.height) {
                    // 업그레이드 버튼 클릭은 무시
                } else if (this.startWaveButtonArea && 
                    mouseX >= this.startWaveButtonArea.x && 
                    mouseX <= this.startWaveButtonArea.x + this.startWaveButtonArea.width &&
                    mouseY >= this.startWaveButtonArea.y && 
                    mouseY <= this.startWaveButtonArea.y + this.startWaveButtonArea.height) {
                    // 웨이브 시작 버튼 클릭은 무시
                } else {
                    // 블록 삭제
                    this.deleteBlock(mouseX, mouseY);
                    return; // 타일 선택 방지
                }
            }
            
            // 블록 설치 모드 체크 (인벤토리 창이 닫혀있고 아이템이 선택되어 있을 때)
            // 단일 클릭으로도 블록 설치 가능 (더블 클릭도 가능)
            if (!this.inventoryOpen && this.selectedInventoryItem !== null && !this.deleteMode) {
                // 다른 UI 요소와 충돌하지 않는지 확인
                if (this.inventoryButtonArea && 
                    mouseX >= this.inventoryButtonArea.x && 
                    mouseX <= this.inventoryButtonArea.x + this.inventoryButtonArea.width &&
                    mouseY >= this.inventoryButtonArea.y && 
                    mouseY <= this.inventoryButtonArea.y + this.inventoryButtonArea.height) {
                    // 가방 버튼 클릭은 무시 (이미 위에서 처리됨)
                } else if (this.deleteButtonArea && 
                    mouseX >= this.deleteButtonArea.x && 
                    mouseX <= this.deleteButtonArea.x + this.deleteButtonArea.width &&
                    mouseY >= this.deleteButtonArea.y && 
                    mouseY <= this.deleteButtonArea.y + this.deleteButtonArea.height) {
                    // 쓰레기통 버튼 클릭은 무시
                } else if (this.startWaveButtonArea && 
                    mouseX >= this.startWaveButtonArea.x && 
                    mouseX <= this.startWaveButtonArea.x + this.startWaveButtonArea.width &&
                    mouseY >= this.startWaveButtonArea.y && 
                    mouseY <= this.startWaveButtonArea.y + this.startWaveButtonArea.height) {
                    // 웨이브 시작 버튼 클릭은 무시
                } else if (this.skipWaveButtonArea && 
                    mouseX >= this.skipWaveButtonArea.x && 
                    mouseX <= this.skipWaveButtonArea.x + this.skipWaveButtonArea.width &&
                    mouseY >= this.skipWaveButtonArea.y && 
                    mouseY <= this.skipWaveButtonArea.y + this.skipWaveButtonArea.height) {
                    // 웨이브 건너뛰기 버튼 클릭은 무시
                } else {
                    // 블록 설치 (단일 클릭)
                    this.placeBlock(mouseX, mouseY);
                    return; // 타일 선택 방지
                }
            }
            
            // 제작대 보상 받기 버튼 클릭 체크
            if (this.showCraftingTableReward && this.craftingTableRewardButtonArea) {
                if (mouseX >= this.craftingTableRewardButtonArea.x && 
                    mouseX <= this.craftingTableRewardButtonArea.x + this.craftingTableRewardButtonArea.width &&
                    mouseY >= this.craftingTableRewardButtonArea.y && 
                    mouseY <= this.craftingTableRewardButtonArea.y + this.craftingTableRewardButtonArea.height) {
                    // 제작대를 인벤토리 0번째에 추가
                    // 기존에 제작대가 있는지 확인
                    const existingCraftingTable = this.inventory.find(item => item.type === '제작대');
                    if (existingCraftingTable) {
                        // 이미 있으면 개수만 증가
                        existingCraftingTable.count++;
                        console.log('제작대 개수 증가:', existingCraftingTable.count);
                    } else {
                        // 없으면 0번째에 추가 (즉시 표시)
                        this.inventory.unshift({ type: '제작대', count: 1, appearFrame: 0 });
                        console.log('제작대 추가됨, 인벤토리:', this.inventory);
                        console.log('제작대 인덱스:', this.inventory.findIndex(item => item.type === '제작대'));
                        console.log('첫 번째 아이템:', this.inventory[0]);
                    }
                    this.showCraftingTableReward = false;
                    // 다음 웨이브 시작 준비
                    this.waveTimer = this.waveTime;
                    this.waveStarted = false;
                    this.waveEnded = false;
                    return;
                }
            }
            
            // 제작대 UI 클릭 체크
            if (this.showCraftingTable) {
                // 제작대 창 닫기 버튼
                if (this.craftingTableCloseButtonArea) {
                    if (mouseX >= this.craftingTableCloseButtonArea.x && 
                        mouseX <= this.craftingTableCloseButtonArea.x + this.craftingTableCloseButtonArea.width &&
                        mouseY >= this.craftingTableCloseButtonArea.y && 
                        mouseY <= this.craftingTableCloseButtonArea.y + this.craftingTableCloseButtonArea.height) {
                        this.showCraftingTable = false;
                        return;
                    }
                }
                
                // 아이템 선택 창 클릭 체크
                if (this.showCraftingItemSelection) {
                    // 아이템 버튼 클릭 체크
                    for (let i = 0; i < this.craftingItemButtonAreas.length; i++) {
                        const button = this.craftingItemButtonAreas[i];
                        if (button && 
                            mouseX >= button.x && 
                            mouseX <= button.x + button.width &&
                            mouseY >= button.y && 
                            mouseY <= button.y + button.height) {
                            // 선택한 아이템을 슬롯에 넣기
                            const itemType = button.itemType;
                            const inventoryItem = this.inventory.find(item => item.type === itemType);
                            
                            if (inventoryItem && itemType === '색상(제작용)') {
                                const swatchSize = 22;
                                const swatchX = button.x + button.width / 2 - swatchSize / 2;
                                const swatchY = button.y + 32;
                                if (mouseX >= swatchX && mouseX <= swatchX + swatchSize &&
                                    mouseY >= swatchY && mouseY <= swatchY + swatchSize) {
                                    this.cycleColorInventoryItem(inventoryItem);
                                    return;
                                }
                            }
                            
                            if (this.selectedCraftingSlot !== null && this.craftingSlots[this.selectedCraftingSlot] === null) {
                                if (inventoryItem && inventoryItem.count > 0) {
                                    this.craftingSlots[this.selectedCraftingSlot] = itemType;
                                    if (itemType === '색상(제작용)') {
                                        const colorIndex = inventoryItem.colorIndex || 0;
                                        this.craftingSlotColors[this.selectedCraftingSlot] = colorIndex;
                                    } else {
                                        this.craftingSlotColors[this.selectedCraftingSlot] = null;
                                    }
                                    // 인벤토리에서 아이템 제거
                                    inventoryItem.count--;
                                    if (inventoryItem.count <= 0) {
                                        const index = this.inventory.indexOf(inventoryItem);
                                        this.inventory.splice(index, 1);
                                    }
                                    // 조합 결과 업데이트
                                    this.updateCraftingResult();
                                    // 아이템 선택 창 닫기
                                    this.showCraftingItemSelection = false;
                                    this.selectedCraftingSlot = null;
                                    this.craftingItemSelectionScrollOffset = 0; // 스크롤 오프셋 초기화
                                }
                            }
                            return;
                        }
                    }
                    
                    // 창 외부 클릭 시 닫기
                    if (this.craftingItemSelectionWindowArea &&
                        (mouseX < this.craftingItemSelectionWindowArea.x ||
                         mouseX > this.craftingItemSelectionWindowArea.x + this.craftingItemSelectionWindowArea.width ||
                         mouseY < this.craftingItemSelectionWindowArea.y ||
                         mouseY > this.craftingItemSelectionWindowArea.y + this.craftingItemSelectionWindowArea.height)) {
                        this.showCraftingItemSelection = false;
                        this.selectedCraftingSlot = null;
                        this.craftingItemSelectionScrollOffset = 0; // 스크롤 오프셋 초기화
                        return;
                    }
                }
                
                // 조합 슬롯 클릭 체크
                if (this.craftingSlotAreas && !this.showCraftingItemSelection) {
                    for (let i = 0; i < 2; i++) {
                        if (this.craftingSlotAreas[i] && 
                            mouseX >= this.craftingSlotAreas[i].x && 
                            mouseX <= this.craftingSlotAreas[i].x + this.craftingSlotAreas[i].width &&
                            mouseY >= this.craftingSlotAreas[i].y && 
                            mouseY <= this.craftingSlotAreas[i].y + this.craftingSlotAreas[i].height) {
                            // 슬롯이 비어있으면 아이템 선택 창 열기
                            if (this.craftingSlots[i] === null) {
                                this.selectedCraftingSlot = i;
                                this.showCraftingItemSelection = true;
                            } else {
                                // 슬롯에 아이템이 있으면 제거
                                const removedItem = this.craftingSlots[i];
                                const removedColorIndex = this.craftingSlotColors[i];
                                this.craftingSlots[i] = null;
                                this.craftingSlotColors[i] = null;
                                // 인벤토리에 다시 추가
                                this.addToInventory(removedItem, 1, false, removedColorIndex);
                                // 조합 결과 업데이트
                                this.updateCraftingResult();
                            }
                            return;
                        }
                    }
                }
                
                // 조합 결과 클릭 체크
                if (this.craftingResultArea && this.craftingResult && this.craftingResult !== 'X') {
                    if (mouseX >= this.craftingResultArea.x && 
                        mouseX <= this.craftingResultArea.x + this.craftingResultArea.width &&
                        mouseY >= this.craftingResultArea.y && 
                        mouseY <= this.craftingResultArea.y + this.craftingResultArea.height) {
                        // 조합 결과 아이템 획득 (2번째 줄에 배치)
                        this.addToInventory(this.craftingResult, 1, true);
                        // 조합 슬롯 비우기
                        this.craftingSlots = [null, null];
                        this.craftingSlotColors = [null, null];
                        this.craftingResult = null;
                        return;
                    }
                }
            }
            
            // 제작대 아이템 선택 시 제작대 UI 열기
            if (this.selectedInventoryItem !== null && this.inventory[this.selectedInventoryItem] && 
                this.inventory[this.selectedInventoryItem].type === '제작대') {
                this.showCraftingTable = true;
            }
            
            // 보상 선택 버튼 클릭 체크
            if (this.showRewardSelection) {
                // 건너뛰기 버튼 클릭 체크
                if (this.skipRewardButtonArea) {
                    const skipButton = this.skipRewardButtonArea;
                    if (mouseX >= skipButton.x && 
                        mouseX <= skipButton.x + skipButton.width &&
                        mouseY >= skipButton.y && 
                        mouseY <= skipButton.y + skipButton.height) {
                        // 아무것도 안 받고 넘어감
                        this.selectReward(null);
                        return;
                    }
                }
                
                // 리롤 버튼 클릭 체크
                if (this.rerollRewardButtonArea) {
                    const rerollButton = this.rerollRewardButtonArea;
                    if (mouseX >= rerollButton.x && 
                        mouseX <= rerollButton.x + rerollButton.width &&
                        mouseY >= rerollButton.y && 
                        mouseY <= rerollButton.y + rerollButton.height) {
                        // 물블럭 등이 나올 때는 리롤 불가
                        const hasSpecialReward = this.rewards.some(r => 
                            r === '물블럭' || r === '물총' || r === '깊은물블럭'
                        );
                        if (hasSpecialReward) {
                            return; // 리롤 불가
                        }
                        
                        // 0이면 클릭 불가
                        if (this.rerollCountdown === 0) {
                            return;
                        }
                        
                        // 리롤 카운트다운 처리
                        if (this.rerollCountdown === null) {
                            // 처음 리롤 버튼 클릭
                            if (this.experience >= this.rerollCost) {
                                this.experience -= this.rerollCost;
                                this.rerollCountdown = 3;
                                this.rerollRewards(); // 리롤 실행
                            }
                        } else if (this.rerollCountdown > 0) {
                            // 카운트다운 중
                            this.rerollCountdown--;
                            if (this.rerollCountdown > 0) {
                                // 아직 카운트다운 중이면 리롤 실행
                                this.rerollRewards();
                            }
                            // 0이 되면 자동으로 회색으로 변하고 못 누르게 됨
                        }
                        return;
                    }
                }
                
                // 보상 버튼 클릭 체크
                for (let button of this.rewardButtons) {
                    if (mouseX >= button.x && 
                        mouseX <= button.x + button.width &&
                        mouseY >= button.y && 
                        mouseY <= button.y + button.height) {
                        this.selectReward(button.reward);
                        return;
                    }
                }
            }
            
            // 공격 (블록 설치 모드가 아니고, 게임이 진행 중일 때)
            if (!this.inventoryOpen && this.selectedInventoryItem === null && 
                !this.gameOver && !this.showRewardSelection && this.waveStarted) {
                // 플레이어 중심에서 마우스 방향 계산
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const dx = mouseX - playerCenterX;
                const dy = mouseY - playerCenterY;
                const angle = Math.atan2(dy, dx);
                
                // 선택된 무기에 따라 공격 (미니건은 마우스 누름 상태에서 연속 발사되므로 여기서는 첫 발사만)
                if (this.selectedWeapon === 'minigun') {
                    // 미니건: 첫 발사만 (이후는 마우스 누름 상태에서 연속 발사)
                    if (this.minigunCooldown === 0) {
                        this.fireMinigun(angle);
                        this.minigunCooldown = 3; // 매우 빠른 쿨다운 (3프레임)
                    }
                } else if (this.selectedWeapon === 'gun') {
                    // 총 발사
                    if (this.gunCooldown === 0) {
                        this.fireGun(angle);
                        this.gunCooldown = 20; // 0.33초 쿨다운 (20프레임)
                    }
                } else if (this.selectedWeapon === 'flashbang') {
                    // 섬광탄 던지기
                    if (this.flashbangCooldown === 0) {
                        // 인벤토리에 섬광탄이 있는지 확인
                        const flashbangItem = this.inventory.find(item => item.type === '섬광탄');
                        if (flashbangItem && flashbangItem.count > 0) {
                            this.throwFlashbang(mouseX, mouseY);
                            flashbangItem.count--;
                            if (flashbangItem.count <= 0) {
                                const index = this.inventory.indexOf(flashbangItem);
                                this.inventory.splice(index, 1);
                            }
                            this.flashbangCooldown = 120; // 2초 쿨다운 (120프레임)
                        }
                    }
                } else {
                    // 검 공격 (사거리 10레벨 이상이면 10레벨 칼, 아니면 일반 칼)
                    if (this.playerUpgrades && this.playerUpgrades.range && this.playerUpgrades.range.level >= 10) {
                        // 10레벨 칼 데미지 설정
                        this.swordAttack.damage = 11;
                    } else {
                        // 일반 칼 데미지 (레벨당 1.1배씩 증가)
                        const damageLevel = (this.playerUpgrades && this.playerUpgrades.damage) ? this.playerUpgrades.damage.level : 1;
                        this.swordAttack.damage = 2 * Math.pow(1.1, damageLevel - 1);
                    }
                this.startSwordAttack(angle);
                }
                return; // 타일 선택 방지
            }
            
            // 클릭한 타일 좌표 계산 (블록 설치 모드가 아닐 때만)
            if (this.inventoryOpen || this.selectedInventoryItem === null) {
                const gridX = Math.floor(mouseX / this.studSize);
                const gridY = Math.floor(mouseY / this.studSize);
                
                if (gridX >= 0 && gridX < this.gridWidth && 
                    gridY >= 0 && gridY < this.gridHeight) {
                    this.selectedTile = { x: gridX, y: gridY };
                }
            }
        });
        
        // 더블 클릭 이벤트로 블록 설치
        this.canvas.addEventListener('dblclick', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            console.log('더블 클릭 감지:', {
                inventoryOpen: this.inventoryOpen,
                selectedInventoryItem: this.selectedInventoryItem,
                inventory: this.inventory
            });
            
            // 인벤토리 창이 닫혀있고 아이템이 선택되어 있을 때만 블록 설치
            if (!this.inventoryOpen && this.selectedInventoryItem !== null) {
                // 다른 UI 요소와 충돌하지 않는지 확인
                if (this.inventoryButtonArea && 
                    mouseX >= this.inventoryButtonArea.x && 
                    mouseX <= this.inventoryButtonArea.x + this.inventoryButtonArea.width &&
                    mouseY >= this.inventoryButtonArea.y && 
                    mouseY <= this.inventoryButtonArea.y + this.inventoryButtonArea.height) {
                    return; // 가방 버튼 클릭은 무시
                }
                
                
                if (this.startWaveButtonArea && 
                    mouseX >= this.startWaveButtonArea.x && 
                    mouseX <= this.startWaveButtonArea.x + this.startWaveButtonArea.width &&
                    mouseY >= this.startWaveButtonArea.y && 
                    mouseY <= this.startWaveButtonArea.y + this.startWaveButtonArea.height) {
                    return; // 웨이브 시작 버튼 클릭은 무시
                }
                
                // 블록 설치
                console.log('블록 설치 시도:', mouseX, mouseY);
                this.placeBlock(mouseX, mouseY);
            }
        });
        
        // 창 크기 변경
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.initGrid();
        });
        
        // 휠 이벤트 (스크롤)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // 적 소환 창이 열려있을 때만 스크롤
            if (this.showEnemySpawnWindow && !this.gameOver && !this.showRewardSelection) {
                const scrollSpeed = 20;
                this.enemySpawnScrollOffset += e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
                
                // 스크롤 범위 제한은 draw 함수에서 처리
            }
            
            // 아이템 선택 창 스크롤
            if (this.showCraftingItemSelection && this.showCraftingTable) {
                const scrollSpeed = 20;
                this.craftingItemSelectionScrollOffset += e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
                
                // 스크롤 범위 제한 (음수 방지)
                if (this.craftingItemSelectionScrollOffset < 0) {
                    this.craftingItemSelectionScrollOffset = 0;
                }
            }
        });
        
        // 키보드 입력 (WASD)
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = true;
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
                e.preventDefault();
            }
        });
        
        // 무기 선택 키보드 입력 (1, 2, 3)
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') {
                // 10레벨 칼 선택
                this.selectedWeapon = 'sword';
                e.preventDefault();
            } else if (e.key === '2') {
                // 총 선택 (사거리 10레벨 이상일 때만)
                if (this.playerUpgrades && this.playerUpgrades.range && this.playerUpgrades.range.level >= 10) {
                    this.selectedWeapon = 'gun';
                }
                e.preventDefault();
            } else if (e.key === '3') {
                // 미니건 선택 (사거리 11레벨일 때만)
                if (this.playerUpgrades && this.playerUpgrades.range && this.playerUpgrades.range.level >= 11) {
                    this.selectedWeapon = 'minigun';
                }
                e.preventDefault();
            } else if (e.key === '0') {
                // 섬광탄 선택
                this.selectedWeapon = 'flashbang';
                e.preventDefault();
            } else if (e.key === '+' || e.key === '=') {
                // + 키를 누르면 물블럭, 물총, 깊은물블럭, 제작대 각각 99개 추가
                this.addToInventory('물블럭', 99);
                this.addToInventory('물총', 99);
                this.addToInventory('깊은물블럭', 99);
                this.addToInventory('제작대', 99);
                e.preventDefault();
            }
        });
    }
    
    updatePlayer() {
        // 기절 타이머 감소
        if (this.player.stunTimer > 0) {
            this.player.stunTimer--;
        }
        
        // 기절 중이면 이동 불가
        if (this.player.stunTimer > 0) {
            return;
        }
        
        // 플레이어 이동 (WASD) - 자유롭게 픽셀 단위로 이동
        let newX = this.player.x;
        let newY = this.player.y;
        
        // 물에 들어갔는지 체크
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const inWater = this.waveNumber > 10 && this.checkInWater(playerCenterX, playerCenterY, Math.max(this.player.width, this.player.height) / 2);
        
        // 물블럭 위에 있는지 체크
        let onWaterBlock = false;
        for (let block of this.blocks) {
            const blockSize = this.studSize;
            if (playerCenterX >= block.x && playerCenterX <= block.x + blockSize &&
                playerCenterY >= block.y && playerCenterY <= block.y + blockSize) {
                if (block.type === '물블럭') {
                    onWaterBlock = true;
                }
                // 심연블럭은 checkBlockCollision에서 처리되므로 여기서는 체크하지 않음
                break;
            }
        }
        
        // 불 속도 증가 타이머 감소
        if (this.player.fireSpeedBoostTimer > 0) {
            this.player.fireSpeedBoostTimer--;
        }
        
        // 불 효과 업데이트 (1초마다 대미지)
        if (this.player.fireEffect.active) {
            // 불 효과 지속 시간 타이머 감소
            if (this.player.fireEffect.durationTimer > 0) {
                this.player.fireEffect.durationTimer--;
                // 타이머가 0이 되면 불 효과 비활성화
                if (this.player.fireEffect.durationTimer <= 0) {
                    this.player.fireEffect.active = false;
                    this.player.fireEffect.damageCooldown = 0;
                }
            }
            
            // 불 효과가 활성화되어 있으면 1초마다 대미지
            if (this.player.fireEffect.active) {
                this.player.fireEffect.damageCooldown--;
                if (this.player.fireEffect.damageCooldown <= 0) {
                    // 1초마다 대미지 적용
                    const damage = 1;
                    this.health -= damage;
                    if (this.health < 0) this.health = 0;
                    this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                    this.updateHealthDisplay();
                    
                    // 체력이 0이 되면 게임 오버
                    if (this.health <= 0 && !this.gameOver) {
                        this.monsterName = '화염 동그라미';
                        this.diedFromFire = true; // 불로 죽었음을 표시
                        this.saveGameState();
                        this.gameOver = true;
                    }
                    
                    // 다음 대미지를 위해 쿨다운 리셋
                    this.player.fireEffect.damageCooldown = 60; // 1초 = 60프레임
                }
            }
        }
        
        // 속도 계산
        let currentSpeed = this.player.speed;
        if (inWater) {
            currentSpeed = this.player.speed / 3;
            // 물 파티클 생성 (가끔씩)
            if (Math.random() < 0.1) {
                this.createWaterParticles(playerCenterX, playerCenterY);
            }
        } else if (onWaterBlock) {
            // 물블럭 위에 있으면 속도 증가 (1.5배)
            currentSpeed = this.player.speed * 1.5;
        }
        
        // 출혈 효과: 속도 절반으로 감소
        if (this.bleedingEffect.active) {
            currentSpeed = currentSpeed * 0.5;
        }
        
        // 속도 감소 효과 (대포 발사체에 맞았을 때)
        if (this.speedDebuffTimer > 0) {
            this.speedDebuffTimer--;
            currentSpeed = currentSpeed * 0.5; // 속도 절반
        }
        
        // 탱크 총알 속도 감소 효과 (1/2 감소)
        if (this.player.tankSlowTimer > 0) {
            this.player.tankSlowTimer--;
            currentSpeed = currentSpeed * 0.5; // 속도 절반
        }
        
        // 불 속도 증가 효과 (1.5배)
        if (this.player.fireSpeedBoostTimer > 0) {
            currentSpeed = currentSpeed * 1.5;
        }
        
        if (this.keys.w && this.player.y > 0) {
            newY = this.player.y - currentSpeed;
            if (newY < 0) newY = 0;
        }
        if (this.keys.s && this.player.y + this.player.height < this.canvas.height) {
            newY = this.player.y + currentSpeed;
            if (newY + this.player.height > this.canvas.height) {
                newY = this.canvas.height - this.player.height;
            }
        }
        if (this.keys.a && this.player.x > 0) {
            newX = this.player.x - currentSpeed;
            if (newX < 0) newX = 0;
        }
        if (this.keys.d && this.player.x + this.player.width < this.canvas.width) {
            newX = this.player.x + currentSpeed;
            if (newX + this.player.width > this.canvas.width) {
                newX = this.canvas.width - this.player.width;
            }
        }
        
        // 블록과의 충돌 체크 (벽은 플레이어를 막음)
        if (!this.checkBlockCollision(newX, this.player.y, this.player.width, this.player.height) &&
            !this.checkEnemyWallCollision(newX, this.player.y, this.player.width, this.player.height)) {
            this.player.x = newX;
        }
        if (!this.checkBlockCollision(this.player.x, newY, this.player.width, this.player.height) &&
            !this.checkEnemyWallCollision(this.player.x, newY, this.player.width, this.player.height)) {
            this.player.y = newY;
        }
        
        // 플레이어가 벽 속에 들어가 있으면 튕겨 나오게 하기
        this.pushPlayerOutOfWalls();
        
        // 검 공격 업데이트
        this.updateSwordAttack();
        
        // 총 쿨다운 감소
        if (this.gunCooldown > 0) {
            this.gunCooldown--;
        }
        
        // 미니건 쿨다운 감소
        if (this.minigunCooldown > 0) {
            this.minigunCooldown--;
        }
        
        // 섬광탄 쿨다운 감소
        if (this.flashbangCooldown > 0) {
            this.flashbangCooldown--;
        }
        
        // 섬광탄 업데이트 (던지는 버전)
        this.updateFlashbangs();
        
        // 화면 하얀색 효과 업데이트
        if (this.screenFlash.active) {
            this.screenFlash.timer++;
            if (!this.screenFlash.fadeOut && this.screenFlash.timer >= this.screenFlash.duration) {
                this.screenFlash.fadeOut = true;
                this.screenFlash.fadeTimer = 0;
            }
            if (this.screenFlash.fadeOut) {
                this.screenFlash.fadeTimer++;
                if (this.screenFlash.fadeTimer >= this.screenFlash.fadeDuration) {
                    this.screenFlash.active = false;
                    this.screenFlash.timer = 0;
                    this.screenFlash.fadeOut = false;
                    this.screenFlash.fadeTimer = 0;
                }
            }
        }
        
        // 미니건 연속 발사 (마우스를 누르고 있을 때)
        if (this.selectedWeapon === 'minigun' && this.mouse.isDown && 
            !this.inventoryOpen && this.selectedInventoryItem === null && 
            !this.gameOver && !this.showRewardSelection && this.waveStarted) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const dx = this.mouse.x - playerCenterX;
            const dy = this.mouse.y - playerCenterY;
            const angle = Math.atan2(dy, dx);
            
            if (this.minigunCooldown === 0) {
                this.fireMinigun(angle);
                this.minigunCooldown = 3; // 매우 빠른 쿨다운 (3프레임)
            }
        }
        
        // 총알 업데이트
        this.updatePlayerBullets();
        
        // 피격 색상 타이머 감소
        if (this.playerHitColorTimer > 0) {
            this.playerHitColorTimer--;
        }
    }
    
    pushPlayerOutOfWalls() {
        // 현재 플레이어 위치에서 벽과 충돌하는지 확인
        const isInBlock = this.checkBlockCollision(this.player.x, this.player.y, this.player.width, this.player.height);
        const isInEnemyWall = this.checkEnemyWallCollision(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // 맵에 닿으면 독 효과 시작 (0.2초마다 1데미지씩 총 20데미지)
        if (isInBlock || isInEnemyWall) {
            if (!this.mapDotDamage.active) {
                this.mapDotDamage.active = true;
                this.mapDotDamage.damage = 0;
                this.mapDotDamage.timer = 0;
            }
        } else {
            // 맵에서 벗어나면 독 효과 중지
            if (this.mapDotDamage.active) {
                this.mapDotDamage.active = false;
                this.mapDotDamage.damage = 0;
                this.mapDotDamage.timer = 0;
            }
        }
        
        if (isInBlock || isInEnemyWall) {
            // 플레이어 중심점
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            
            let pushX = 0;
            let pushY = 0;
            
            // 모든 벽 블록 확인
            for (let block of this.blocks) {
                if (block.type === '벽' || block.type === '깊은물블럭' || block.type === '심연블럭') {
                    const blockCenterX = block.x + this.studSize / 2;
                    const blockCenterY = block.y + this.studSize / 2;
                    
                    // 플레이어와 블록의 거리
                    const dx = playerCenterX - blockCenterX;
                    const dy = playerCenterY - blockCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < (this.player.width + this.studSize) / 2) {
                        // 충돌 중이면 밀어내기 방향 계산
                        if (distance > 0) {
                            const pushStrength = this.player.speed * 2; // 밀어내기 강도
                            pushX += (dx / distance) * pushStrength;
                            pushY += (dy / distance) * pushStrength;
                        }
                    }
                }
            }
            
            // 적 벽 확인
            for (let wall of this.enemyWalls) {
                const wallCenterX = wall.x + wall.width / 2;
                const wallCenterY = wall.y + wall.height / 2;
                
                // 플레이어와 벽의 거리
                const dx = playerCenterX - wallCenterX;
                const dy = playerCenterY - wallCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < (this.player.width + Math.max(wall.width, wall.height)) / 2) {
                    // 충돌 중이면 밀어내기 방향 계산
                    if (distance > 0) {
                        const pushStrength = this.player.speed * 2; // 밀어내기 강도
                        pushX += (dx / distance) * pushStrength;
                        pushY += (dy / distance) * pushStrength;
                    }
                }
            }
            
            // 플레이어를 밀어내기
            if (pushX !== 0 || pushY !== 0) {
                let newX = this.player.x + pushX;
                let newY = this.player.y + pushY;
                
                // 화면 경계 체크
                if (newX < 0) newX = 0;
                if (newX + this.player.width > this.canvas.width) {
                    newX = this.canvas.width - this.player.width;
                }
                if (newY < 0) newY = 0;
                if (newY + this.player.height > this.canvas.height) {
                    newY = this.canvas.height - this.player.height;
                }
                
                // 밀어낸 위치에서도 충돌하지 않는지 확인
                if (!this.checkBlockCollision(newX, newY, this.player.width, this.player.height) &&
                    !this.checkEnemyWallCollision(newX, newY, this.player.width, this.player.height)) {
                    this.player.x = newX;
                    this.player.y = newY;
                } else {
                    // 여전히 충돌하면 더 강하게 밀어내기
                    const strongerPush = this.player.speed * 3;
                    newX = this.player.x + (pushX > 0 ? strongerPush : -strongerPush);
                    newY = this.player.y + (pushY > 0 ? strongerPush : -strongerPush);
                    
                    // 화면 경계 체크
                    if (newX < 0) newX = 0;
                    if (newX + this.player.width > this.canvas.width) {
                        newX = this.canvas.width - this.player.width;
                    }
                    if (newY < 0) newY = 0;
                    if (newY + this.player.height > this.canvas.height) {
                        newY = this.canvas.height - this.player.height;
                    }
                    
                    this.player.x = newX;
                    this.player.y = newY;
                }
            }
        }
    }
    
    startSwordAttack(angle) {
        // 이미 공격 중이면 무시
        if (this.swordAttack.isAttacking) {
            return;
        }
        
        // 공격 시작
        this.swordAttack.isAttacking = true;
        this.swordAttack.angle = angle;
        this.swordAttack.progress = 0;
        this.swordAttack.hitEnemies = []; // 맞은 적 목록 초기화
    }
    
    updateSwordAttack() {
        if (!this.swordAttack.isAttacking) {
            return;
        }
        
        // 공격 진행도 업데이트
        this.swordAttack.progress += 1 / this.swordAttack.duration;
        
        if (this.swordAttack.progress >= 1) {
            // 공격 종료
            this.swordAttack.isAttacking = false;
            this.swordAttack.progress = 0;
            this.swordAttack.hitEnemies = [];
            return;
        }
        
        // 검과 적의 충돌 체크
        this.checkSwordEnemyCollision();
        
        // 검과 블록의 충돌 체크 (만렙 벽 방어력 활성화)
        this.checkSwordBlockCollision();
    }
    
    unlockFlashbang(reason = '') {
        if (this.flashbangUnlocked) {
            return;
        }
        this.flashbangUnlocked = true;
        this.addToInventory('섬광탄', 1, true);
        console.log(`섬광탄 해금: ${reason || 'unknown reason'}`);
    }
    
    throwFlashbang(targetX, targetY) {
        // 플레이어 위치에서 목표 위치로 섬광탄 던지기
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        // 섬광탄 감지 히트박스 생성
        this.flashbangs.push({
            x: targetX,
            y: targetY,
            hitboxRadius: 160, // 감지 히트박스 반경
            triggered: false,
            life: 600
        });
    }

    spawnFlashbangProjectile(originX, originY, dx, dy) {
        const speed = 8;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let vx = 0;
        let vy = 0;
        if (distance > 0) {
            vx = (dx / distance) * speed;
            vy = (dy / distance) * speed;
        }
        
        this.flashbangProjectiles.push({
            x: originX,
            y: originY,
            vx,
            vy,
            radius: 12,
            innerRadius: 60,
            life: 90,
            explosionRadius: 90
        });
    }
    
    updateFlashbangs() {
        // 감지 히트박스 업데이트
        for (let i = this.flashbangs.length - 1; i >= 0; i--) {
            const flashbang = this.flashbangs[i];
            flashbang.life--;
            if (flashbang.life <= 0) {
                this.flashbangs.splice(i, 1);
                continue;
            }
            let detected = false;
            
            for (let enemy of this.enemies) {
                const dx = enemy.x - flashbang.x;
                const dy = enemy.y - flashbang.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= flashbang.hitboxRadius) {
                    this.spawnFlashbangProjectile(flashbang.x, flashbang.y, dx, dy);
                    
                    detected = true;
                    break;
                }
            }
            
            if (detected) {
                this.flashbangs.splice(i, 1);
            }
        }
        
        // 섬광탄 발사체 이동 및 충돌 체크
        for (let i = this.flashbangProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.flashbangProjectiles[i];
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            projectile.life--;
            
            let shouldDetonate = false;
            
            for (let enemy of this.enemies) {
                const distance = Math.sqrt(
                    Math.pow(enemy.x - projectile.x, 2) + 
                    Math.pow(enemy.y - projectile.y, 2)
                );
                
                if (distance <= projectile.innerRadius + enemy.radius) {
                    shouldDetonate = true;
                    break;
                }
            }
            
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const playerRadius = Math.max(this.player.width, this.player.height) / 2;
            const playerDistance = Math.sqrt(
                Math.pow(playerCenterX - projectile.x, 2) + 
                Math.pow(playerCenterY - projectile.y, 2)
            );
            
            if (playerDistance <= projectile.innerRadius + playerRadius) {
                shouldDetonate = true;
            }
            
            if (shouldDetonate || projectile.life <= 0) {
                this.detonateFlashbang(projectile.x, projectile.y, projectile.innerRadius);
                this.flashbangProjectiles.splice(i, 1);
            }
        }
        
        // 폭발 이펙트 업데이트
        for (let i = this.flashbangExplosions.length - 1; i >= 0; i--) {
            const explosion = this.flashbangExplosions[i];
            explosion.timer++;
            if (explosion.timer >= explosion.duration) {
                this.flashbangExplosions.splice(i, 1);
            }
        }
        
        // 적 기절 타이머 감소
        for (let enemyId in this.enemyStunTimers) {
            if (this.enemyStunTimers[enemyId] > 0) {
                this.enemyStunTimers[enemyId]--;
                if (this.enemyStunTimers[enemyId] <= 0) {
                    delete this.enemyStunTimers[enemyId];
                }
            }
        }
        
        // 적 섬광 이펙트 타이머
        for (let enemyId in this.enemyFlashEffects) {
            const effect = this.enemyFlashEffects[enemyId];
            effect.timer++;
            
            if (!effect.fadeOut && effect.timer >= effect.duration) {
                effect.fadeOut = true;
                effect.fadeTimer = 0;
            } else if (effect.fadeOut) {
                effect.fadeTimer++;
                if (effect.fadeTimer >= effect.fadeDuration) {
                    delete this.enemyFlashEffects[enemyId];
                }
            }
        }
    }
    
    updateFlashbangBlocks() {
        const defaultRadius = this.studSize * 4;
        const cooldownDuration = 150; // 2.5초
        
        for (let block of this.blocks) {
            if (block.type !== '섬광탄') continue;
            
            if (block.flashbangRadius === undefined) {
                block.flashbangRadius = defaultRadius;
            }
            if (block.flashbangCooldown === undefined) {
                block.flashbangCooldown = 0;
            }
            
            if (block.flashbangCooldown > 0) {
                block.flashbangCooldown--;
                continue;
            }
            
            const blockCenterX = block.x + this.studSize / 2;
            const blockCenterY = block.y + this.studSize / 2;
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            for (let enemy of this.enemies) {
                const dx = enemy.x - blockCenterX;
                const dy = enemy.y - blockCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= block.flashbangRadius + enemy.radius) {
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                }
            }
            
            if (closestEnemy) {
                const dx = closestEnemy.x - blockCenterX;
                const dy = closestEnemy.y - blockCenterY;
                this.spawnFlashbangProjectile(blockCenterX, blockCenterY, dx, dy);
                block.flashbangCooldown = block.flashbangCooldownDuration || cooldownDuration;
            }
        }
    }

    detonateFlashbang(x, y, radius) {
        this.flashbangExplosions.push({
            x,
            y,
            radius: radius * 1.5,
            timer: 0,
            duration: 90
        });
        
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const playerRadius = Math.max(this.player.width, this.player.height) / 2;
        const playerDistance = Math.sqrt(
            Math.pow(playerCenterX - x, 2) + 
            Math.pow(playerCenterY - y, 2)
        );
        
        if (playerDistance <= radius + playerRadius) {
            this.triggerPlayerFlash(240, 60);
        }
        
        for (let enemy of this.enemies) {
            const distance = Math.sqrt(
                Math.pow(enemy.x - x, 2) + 
                Math.pow(enemy.y - y, 2)
            );
            
            if (distance <= radius + enemy.radius) {
                this.applyEnemyFlashEffect(enemy.id);
            }
        }
    }
    
    detonateBulletMine(x, y) {
        const projectileCount = 24;
        const projectileSpeed = 10;
        const damage = 100;
        
        for (let i = 0; i < projectileCount; i++) {
            const angle = (Math.PI * 2 * i) / projectileCount;
            const vx = Math.cos(angle) * projectileSpeed;
            const vy = Math.sin(angle) * projectileSpeed;
            
            this.archerProjectiles.push({
                x,
                y,
                vx,
                vy,
                damage,
                radius: 5,
                color: '#4ab0ff',
                fromBulletMine: true
            });
        }
    }
    
    triggerPlayerFlash(duration = 240, fadeDuration = 60) {
        this.screenFlash.active = true;
        this.screenFlash.timer = 0;
        this.screenFlash.duration = duration;
        this.screenFlash.fadeDuration = fadeDuration;
        this.screenFlash.fadeOut = false;
        this.screenFlash.fadeTimer = 0;
    }
    
    applyEnemyFlashEffect(enemyId, options = {}) {
        const {
            stunDuration = 300,
            effectDuration = 300,
            fadeDuration = 60
        } = options;
        
        this.enemyStunTimers[enemyId] = stunDuration;
        this.enemyFlashEffects[enemyId] = {
            timer: 0,
            duration: effectDuration,
            fadeDuration,
            fadeOut: false,
            fadeTimer: 0
        };
    }
    
    applyGlobalFlashEffect(durationFrames = 600) {
        // 플레이어에게 섬광 효과 적용
        this.triggerPlayerFlash(durationFrames, Math.min(120, durationFrames / 5));
        
        // 모든 적에게 섬광 및 기절 효과 적용
        for (let enemy of this.enemies) {
            this.applyEnemyFlashEffect(enemy.id, {
                stunDuration: durationFrames,
                effectDuration: durationFrames,
                fadeDuration: Math.min(120, durationFrames / 5)
            });
        }
    }
    
    checkSwordBlockCollision() {
        if (!this.swordAttack.isAttacking) return;
        
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const angle = this.swordAttack.angle;
        const swordLength = 80;
        const swordRadius = 15;
        
        const swordEndX = playerCenterX + Math.cos(angle) * swordLength;
        const swordEndY = playerCenterY + Math.sin(angle) * swordLength;
        
        // 모든 벽 블록 확인
        for (let block of this.blocks) {
            if (block.type !== '벽') continue;
            
            const blockLevel = block.level || 1;
            const isMaxLevel = blockLevel >= 10;
            
            if (!isMaxLevel) continue; // 만렙 벽만 처리
            
            // 만렙 벽이 적에게 공격받아 방어력 활성화 상태인지 확인
            if (!block.shieldActive) continue;
            
            const blockCenterX = block.x + this.studSize / 2;
            const blockCenterY = block.y + this.studSize / 2;
            
            // 검의 시작점과 끝점
            const swordStartX = playerCenterX;
            const swordStartY = playerCenterY;
            
            // 검의 방향 벡터
            const swordDx = swordEndX - swordStartX;
            const swordDy = swordEndY - swordStartY;
            const swordLength2 = Math.sqrt(swordDx * swordDx + swordDy * swordDy);
            
            if (swordLength2 === 0) continue;
            
            // 블록 중심에서 검의 시작점으로의 벡터
            const toBlockDx = blockCenterX - swordStartX;
            const toBlockDy = blockCenterY - swordStartY;
            
            // 투영 계산
            const projection = (toBlockDx * swordDx + toBlockDy * swordDy) / (swordLength2 * swordLength2);
            
            // 투영이 검의 범위 내에 있는지 확인
            if (projection < 0 || projection > 1) continue;
            
            // 검의 직선에서 가장 가까운 점
            const closestX = swordStartX + projection * swordDx;
            const closestY = swordStartY + projection * swordDy;
            
            // 블록 중심에서 검의 직선까지의 거리
            const dx = blockCenterX - closestX;
            const dy = blockCenterY - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 충돌 체크 (검의 폭 + 블록의 반지름)
            const blockRadius = this.studSize / 2;
            if (distance < swordRadius + blockRadius) {
                // 방어력 활성화 (+100 체력)
                if (!block.shieldHealth) {
                    block.shieldHealth = 0;
                }
                block.shieldHealth = 100; // 방어력 100 추가
                block.maxHealth = (block.maxHealth || block.health) + 100;
                block.health += 100;
                
                // 방어력 활성화 후 동그라미 원래 크기로 복귀
                block.shieldRadius = this.studSize / 6;
                block.shieldActive = false;
            }
        }
    }
    
    checkSwordEnemyCollision() {
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        // 검의 각도는 마우스 방향으로 고정 (회전하지 않음)
        const currentAngle = this.swordAttack.angle;
        
        // 검의 끝점 계산 (공격 진행도에 따라 검의 길이가 늘어남)
        const currentLength = this.swordAttack.length * this.swordAttack.progress;
        const swordEndX = playerCenterX + Math.cos(currentAngle) * currentLength;
        const swordEndY = playerCenterY + Math.sin(currentAngle) * currentLength;
        
        // 검의 충돌 범위 (검의 폭)
        const swordRadius = 10; // 검의 충돌 범위
        
        // 모든 적과 충돌 체크
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            
            // 이미 이번 공격에서 맞은 적은 스킵
            if (this.swordAttack.hitEnemies.includes(enemy.id)) {
                continue;
            }
            
            // 뱀 적 처리 (각 세그먼트별로)
            if (enemy.type === 'snake') {
                for (let segIndex = 0; segIndex < enemy.segments.length; segIndex++) {
                    const segment = enemy.segments[segIndex];
                    
                    // 검의 직선 경로와 세그먼트의 거리 계산
                    const swordStartX = playerCenterX;
                    const swordStartY = playerCenterY;
                    
                    const segmentX = segment.x;
                    const segmentY = segment.y;
                    
                    // 검의 방향 벡터
                    const swordDx = swordEndX - swordStartX;
                    const swordDy = swordEndY - swordStartY;
                    const swordLength = Math.sqrt(swordDx * swordDx + swordDy * swordDy);
                    
                    if (swordLength === 0) continue;
                    
                    // 세그먼트에서 검의 시작점으로의 벡터
                    const toSegmentDx = segmentX - swordStartX;
                    const toSegmentDy = segmentY - swordStartY;
                    
                    // 검의 방향 벡터에 대한 투영
                    const projection = (toSegmentDx * swordDx + toSegmentDy * swordDy) / (swordLength * swordLength);
                    
                    // 투영이 검의 범위 내에 있는지 확인
                    if (projection < 0 || projection > 1) {
                        continue;
                    }
                    
                    // 검의 직선에서 가장 가까운 점
                    const closestX = swordStartX + projection * swordDx;
                    const closestY = swordStartY + projection * swordDy;
                    
                    // 세그먼트의 중심에서 검의 직선까지의 거리
                    const dx = segmentX - closestX;
                    const dy = segmentY - closestY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 충돌 체크
                    if (distance < swordRadius + segment.radius) {
                        // 세그먼트에게 데미지
                        const healthBeforeDamage = segment.health;
                        segment.health -= this.swordAttack.damage;
                        segment.showHealthBar = true;
                        
                        if (segment.health < 0) {
                            segment.health = 0;
                        }
                        
                        // 이번 공격에서 맞은 적으로 기록
                        if (!this.swordAttack.hitEnemies.includes(enemy.id + '_' + segIndex)) {
                            this.swordAttack.hitEnemies.push(enemy.id + '_' + segIndex);
                        }
                    }
                }
                continue; // 뱀은 별도 처리 완료
            }
            
            // 검의 직선 경로와 적의 거리 계산 (점과 직선 사이의 거리)
            // 검의 시작점과 끝점
            const swordStartX = playerCenterX;
            const swordStartY = playerCenterY;
            
            // 적의 중심점
            const enemyX = enemy.x;
            const enemyY = enemy.y;
            
            // 검의 방향 벡터
            const swordDx = swordEndX - swordStartX;
            const swordDy = swordEndY - swordStartY;
            const swordLength = Math.sqrt(swordDx * swordDx + swordDy * swordDy);
            
            if (swordLength === 0) continue; // 검의 길이가 0이면 스킵
            
            // 적에서 검의 시작점으로의 벡터
            const toEnemyDx = enemyX - swordStartX;
            const toEnemyDy = enemyY - swordStartY;
            
            // 검의 방향 벡터에 대한 투영 (검의 시작점에서 적까지의 거리)
            const projection = (toEnemyDx * swordDx + toEnemyDy * swordDy) / (swordLength * swordLength);
            
            // 투영이 검의 범위 내에 있는지 확인
            if (projection < 0 || projection > 1) {
                continue; // 검의 범위 밖
            }
            
            // 검의 직선에서 가장 가까운 점
            const closestX = swordStartX + projection * swordDx;
            const closestY = swordStartY + projection * swordDy;
            
            // 적의 중심에서 검의 직선까지의 거리
            const dx = enemyX - closestX;
            const dy = enemyY - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 충돌 체크 (검의 폭 + 적의 반지름)
            if (distance < swordRadius + enemy.radius) {
                // 무적 상태 체크 (원숭이만)
                if (enemy.type === 'monkey' && enemy.invincibleTimer && enemy.invincibleTimer > 0) {
                    // 무적 상태면 데미지 무시
                    continue;
                }
                
                // 적에게 데미지
                const healthBeforeDamage = enemy.health;
                
                // 기사는 방어력 먼저 감소 (체력처럼 직접 감소)
                if (enemy.type === 'knight') {
                    if (enemy.armor === undefined) enemy.armor = 50;
                    
                    // 방어력이 있으면 방어력 먼저 감소
                    if (enemy.armor > 0) {
                        enemy.armor -= this.swordAttack.damage;
                        if (enemy.armor < 0) enemy.armor = 0;
                    } else {
                        // 방어력이 0이면 체력 감소
                enemy.health -= this.swordAttack.damage;
                    }
                }
                // 군인은 방어력 먼저 감소
                else if (enemy.type === 'soldier') {
                    if (enemy.armor === undefined) enemy.armor = 50; // 처음 생성될 때만 초기화
                    if (!enemy.armorDamage) enemy.armorDamage = 0;
                    
                    // 방어력에 피해 누적 (50 피해를 받아야 1씩 깎임)
                    enemy.armorDamage += this.swordAttack.damage;
                    
                    // 50 피해를 받으면 방어력 1 감소
                    if (enemy.armorDamage >= 50) {
                        const armorReduction = Math.floor(enemy.armorDamage / 50);
                        enemy.armor -= armorReduction;
                        enemy.armorDamage = enemy.armorDamage % 50;
                        
                        if (enemy.armor < 0) enemy.armor = 0;
                    }
                    
                    // 방어력이 모두 닳지 않으면 체력 무적
                    if (enemy.armor > 0) {
                        // 방어력이 있으면 체력에 데미지 안 들어감 (무적)
                    } else {
                        // 방어력이 0이 되어야 체력 감소 (칼 대미지의 1/3만)
                        const reducedDamage = Math.floor(this.swordAttack.damage / 3);
                        enemy.health -= reducedDamage;
                    }
                } else {
                    enemy.health -= this.swordAttack.damage;
                }
                
                // 원숭이는 피격 시 도망가기 시작
                if (enemy.type === 'monkey') {
                    enemy.isFleeing = true;
                    enemy.fleeTimer = 120; // 2초 동안 도망 (120프레임)
                    enemy.lastHealthBeforeDamage = healthBeforeDamage;
                }
                
                // 체력바 표시 (공격받으면 계속 보이게)
                enemy.showHealthBar = true;
                
                // 데미지 받기 전 체력보다 높아지면 원래 값으로 되돌림
                if (enemy.health > healthBeforeDamage) {
                    enemy.health = healthBeforeDamage;
                }
                
                // 체력이 초기 체력보다 높아지면 초기 체력으로 제한
                if (enemy.health > enemy.initialHealth) {
                    enemy.health = enemy.initialHealth;
                }
                
                // 체력이 최대치를 넘지 않도록만 제한
                if (enemy.health > enemy.maxHealth) {
                    enemy.health = enemy.maxHealth;
                }
                
                // 체력이 음수가 되지 않도록만 제한
                if (enemy.health < 0) {
                    enemy.health = 0;
                }
                
                // 현재 체력을 이전 체력으로 저장
                enemy.lastHealth = enemy.health;
                
                // 이번 공격에서 맞은 적으로 기록
                this.swordAttack.hitEnemies.push(enemy.id);
            }
        }
        
        // 보스와 검 충돌 체크
        if (this.boss && !this.swordAttack.hitEnemies.includes(this.boss.id)) {
            const bossX = this.boss.x;
            const bossY = this.boss.y;
            
            // 검의 직선 경로와 보스의 거리 계산
            const swordStartX = playerCenterX;
            const swordStartY = playerCenterY;
            
            const swordDx = swordEndX - swordStartX;
            const swordDy = swordEndY - swordStartY;
            const swordLength = Math.sqrt(swordDx * swordDx + swordDy * swordDy);
            
            if (swordLength > 0) {
                const toBossDx = bossX - swordStartX;
                const toBossDy = bossY - swordStartY;
                const projection = (toBossDx * swordDx + toBossDy * swordDy) / (swordLength * swordLength);
                
                if (projection >= 0 && projection <= 1) {
                    const closestX = swordStartX + projection * swordDx;
                    const closestY = swordStartY + projection * swordDy;
                    const dx = bossX - closestX;
                    const dy = bossY - closestY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < swordRadius + this.boss.radius) {
                        // 보스에게 데미지
                        this.boss.health -= this.swordAttack.damage;
                        if (this.boss.health < 0) this.boss.health = 0;
                        
                        // 이번 공격에서 맞은 보스로 기록
                        this.swordAttack.hitEnemies.push(this.boss.id);
                    }
                }
            }
        }
    }
    
    spawnEnemy(specificType = null) {
        // 화면 밖에서 적 생성 (랜덤한 위치)
        let radius = this.studSize / 2; // 1 스터드 크기 (반지름)
        // 코끼리는 크게, 코뿔소는 조금 작게, 대포는 크게
        if (specificType === 'elephant') {
            radius = this.studSize * 1.5; // 코끼리는 1.5배 크기
        } else if (specificType === 'rhino') {
            radius = this.studSize * 1.2; // 코뿔소는 코끼리보다 조금 작게 (1.2배)
        } else if (specificType === 'cannon') {
            radius = this.studSize * 1.2; // 대포는 플레이어의 2배 크기
        }
        
            let x, y;
            const side = Math.floor(Math.random() * 4); // 0: 위, 1: 오른쪽, 2: 아래, 3: 왼쪽
            
            if (side === 0) { // 위쪽
            x = Math.random() * this.canvas.width;
            y = -radius;
            } else if (side === 1) { // 오른쪽
            x = this.canvas.width + radius;
            y = Math.random() * this.canvas.height;
            } else if (side === 2) { // 아래쪽
            x = Math.random() * this.canvas.width;
            y = this.canvas.height + radius;
            } else { // 왼쪽
            x = -radius;
            y = Math.random() * this.canvas.height;
            }
            
        const enemyId = Date.now() + Math.random(); // 고유 ID 생성
        
        // 현재 원숭이 수 확인
        const currentMonkeyCount = this.enemies.filter(e => e.type === 'monkey').length;
        // 현재 코뿔소 수 확인
        const currentRhinoCount = this.enemies.filter(e => e.type === 'rhino').length;
        // 현재 탱크 수 확인
        const currentTankCount = this.enemies.filter(e => e.type === 'tank').length;
        
        // 적 타입 결정
        let enemyType = 'normal'; // 기본 타입
        
        // 특정 타입이 지정된 경우 그대로 사용 (적 소환 창에서는 원숭이 제한 무시)
        if (specificType) {
            // 적 소환 창에서 소환할 때는 원숭이 제한 무시
            // if (specificType === 'monkey' && currentMonkeyCount >= 10) {
            //     // 원숭이가 10마리 이상이면 소환하지 않음
            //     return;
            // }
            // 코뿔소는 1마리만 소환 가능 (적 소환 창에서도 제한)
            if (specificType === 'rhino' && currentRhinoCount >= 1) {
                return; // 코뿔소가 이미 1마리 있으면 소환하지 않음
            }
            // 탱크는 1마리만 소환 가능 (적 소환 창에서도 제한)
            if (specificType === 'tank' && currentTankCount >= 1) {
                return; // 탱크가 이미 1마리 있으면 소환하지 않음
            }
            enemyType = specificType;
        } else {
            // 기존 로직: 웨이브에 따라 랜덤하게 결정
            if (this.waveNumber === 15) {
                // 15 스테이지: 뱀, 원거리 뱀, 원숭이, 방어 동그라미, 석궁 동그라미, 코끼리 소환
                const rand = Math.random();
                if (rand < 0.15) {
                    enemyType = 'snake';
                } else if (rand < 0.3) {
                    enemyType = 'poisonSnake'; // 원거리 뱀
                } else if (rand < 0.4) {
                    // 원숭이가 10마리 미만일 때만 원숭이로 설정
                    if (currentMonkeyCount < 10) {
                        enemyType = 'monkey';
                    } else {
                        // 원숭이가 10마리 이상이면 뱀으로 대체
                        enemyType = 'snake';
                    }
                } else if (rand < 0.65) {
                    enemyType = 'defense';
                } else if (rand < 0.85) {
                    enemyType = 'archer';
                } else {
                    enemyType = 'elephant'; // 코끼리
                }
            } else if (this.waveNumber >= 21 && this.waveNumber <= 30) {
                // 21-30 스테이지 (전쟁터)
                const rand = Math.random();
                if (this.waveNumber <= 23) {
                    if (this.waveNumber === 22) {
                        // 22 스테이지: 작은 뱀, 동그라미, 기사
                        // (섬광 동그라미는 항상 5명을 따로 유지하므로 여기에서는 소환하지 않음)
                        if (rand < 0.2) {
                            enemyType = 'normal'; // 동그라미 (20%)
                        } else if (rand < 0.7) {
                            enemyType = 'snake'; // 작은 뱀 (50%)
                        } else {
                            enemyType = 'knight'; // 기사 (30%)
                        }
                    } else if (this.waveNumber === 21) {
                        // 21 스테이지: 작은 뱀, 동그라미, 기사
                        if (rand < 0.1) {
                            enemyType = 'normal'; // 동그라미 (10%)
                        } else if (rand < 0.7) {
                            enemyType = 'snake'; // 작은 뱀 (60%)
                        } else {
                            enemyType = 'knight'; // 기사 (30%)
                        }
                    } else if (this.waveNumber === 23) {
                        // 23 스테이지: 스컹크, 화염 동그라미, 기사, 원거리 뱀
                        const currentFireCount = this.enemies.filter(e => e.type === 'fire').length;
                        const canSpawnFire = currentFireCount < 5; // 최대 5명
                        
                        if (rand < 0.5 && canSpawnFire) {
                            enemyType = 'fire'; // 화염 동그라미 (50%)
                        } else {
                            // 화염 동그라미를 스폰할 수 없거나 확률에 해당하지 않으면 다른 적 스폰
                            const adjustedRand = Math.random();
                            if (adjustedRand < 0.3) {
                                enemyType = 'skunk'; // 스컹크 (30%)
                            } else if (adjustedRand < 0.6) {
                                enemyType = 'knight'; // 기사 (30%)
                            } else if (adjustedRand < 0.75) {
                                enemyType = 'poisonSnake'; // 원거리 뱀 (15%)
                            } else {
                                enemyType = 'normal'; // 일반 (25%)
                            }
                        }
                    }
                } else {
                    if (this.waveNumber === 24) {
                        // 24 스테이지: 작은 뱀, 동그라미, 기사, 군인
                        if (rand < 0.1) {
                            enemyType = 'normal'; // 동그라미 (10%)
                        } else if (rand < 0.5) {
                            enemyType = 'snake'; // 작은 뱀 (40%)
                        } else if (rand < 0.75) {
                            enemyType = 'knight'; // 기사 (25%)
                        } else {
                            enemyType = 'soldier'; // 군인 (25%)
                        }
                    } else {
                        if (this.waveNumber === 25) {
                            // 25 스테이지: 기사, 대포, 군인, 섬광 동그라미, 화염 동그라미
                            const currentFireCount = this.enemies.filter(e => e.type === 'fire').length;
                            const canSpawnFire = currentFireCount < 5; // 최대 5명
                            
                            if (rand < 0.2) {
                                enemyType = 'knight'; // 기사 (20%)
                            } else if (rand < 0.4) {
                                enemyType = 'cannon'; // 대포 (20%)
                            } else if (rand < 0.6) {
                                enemyType = 'soldier'; // 군인 (20%)
                            } else if (rand < 0.8) {
                                enemyType = 'flash'; // 섬광 동그라미 (20%)
                            } else {
                                // 화염 동그라미 (20%)
                                if (canSpawnFire) {
                                    enemyType = 'fire';
                                } else {
                                    // 화염 동그라미가 최대치면 기사로 대체
                                    enemyType = 'knight';
                                }
                            }
                        } else {
                            if (this.waveNumber === 30) {
                                // 30 스테이지: 기사, 군인, 화염 동그라미, 섬광 동그라미만
                                const currentFireCount = this.enemies.filter(e => e.type === 'fire').length;
                                const canSpawnFire = currentFireCount < 5; // 최대 5명
                                
                                const rand = Math.random();
                                if (rand < 0.25) {
                                    enemyType = 'knight'; // 기사 (25%)
                                } else if (rand < 0.5) {
                                    enemyType = 'soldier'; // 군인 (25%)
                                } else if (rand < 0.75 && canSpawnFire) {
                                    enemyType = 'fire'; // 화염 동그라미 (25%, 최대 5명)
                                } else if (rand < 0.75) {
                                    // 화염 동그라미가 최대치면 기사로 대체
                                    enemyType = 'knight';
                                } else {
                                    enemyType = 'flash'; // 섬광 동그라미 (25%)
                                }
                            } else {
                                // 26-29 스테이지: 작은 뱀, 동그라미, 기사, 군인
                                if (rand < 0.1) {
                                    enemyType = 'normal'; // 동그라미 (10%)
                                } else if (rand < 0.5) {
                                    enemyType = 'snake'; // 작은 뱀 (40%)
                                } else if (rand < 0.75) {
                                    enemyType = 'knight'; // 기사 (25%)
                                } else {
                                    enemyType = 'soldier'; // 군인 (25%)
                                }
                            }
                        }
                    }
                }
            } else if (this.waveNumber === 20) {
                // 20 스테이지: 스컹크, 뱀, 코뿔소(1마리만), 원거리 뱀 조금, 원숭이
                if (currentRhinoCount >= 1) {
                    // 코뿔소가 이미 1마리 있으면 다른 적으로
                    const rand = Math.random();
                    if (rand < 0.4) {
                        enemyType = 'skunk'; // 스컹크 (40%)
                    } else if (rand < 0.7) {
                        enemyType = 'snake'; // 뱀 (30%)
                    } else if (rand < 0.85) {
                        enemyType = 'monkey'; // 원숭이 (15%)
                    } else {
                        enemyType = 'poisonSnake'; // 원거리 뱀 (15%)
                    }
                } else {
                    enemyType = 'rhino'; // 코뿔소
                }
            } else if (this.waveNumber === 14) {
                // 14 스테이지: 독 뱀만 소환
                enemyType = 'poisonSnake';
            } else if (this.waveNumber === 13) {
                // 13 스테이지: 첫 소환은 반드시 스컹크, 이후 뱀/스컹크 랜덤
                if (!this.stage13InitialSkunkSpawned) {
                    enemyType = 'skunk';
                    this.stage13InitialSkunkSpawned = true;
                } else {
                    enemyType = 'snake';
                }
            } else if (this.waveNumber > 11) {
                // 12번째 웨이브부터: 16.67% 일반, 16.67% 방어, 16.67% 날카로운, 16.67% 석궁, 16.67% 뱀, 16.67% 원숭이
                const rand = Math.random();
                if (rand < 0.1667) {
                    enemyType = 'normal';
                } else if (rand < 0.3334) {
                    enemyType = 'defense';
                } else if (rand < 0.5) {
                    enemyType = 'sharp';
                } else if (rand < 0.6667) {
                    enemyType = 'archer';
                } else if (rand < 0.8334) {
                    enemyType = 'snake';
                } else {
                    // 원숭이가 10마리 미만일 때만 원숭이로 설정
                    if (currentMonkeyCount < 10) {
                    enemyType = 'monkey';
                    } else {
                        // 원숭이가 10마리 이상이면 일반 적으로 대체
                        enemyType = 'normal';
                    }
                }
            } else if (this.waveNumber > 10) {
                // 11번째 웨이브(숲): 20% 일반, 20% 방어, 20% 날카로운, 20% 석궁, 20% 뱀 (원숭이 없음)
                const rand = Math.random();
                if (rand < 0.2) {
                    enemyType = 'normal';
                } else if (rand < 0.4) {
                    enemyType = 'defense';
                } else if (rand < 0.6) {
                    enemyType = 'sharp';
                } else if (rand < 0.8) {
                    enemyType = 'archer';
                } else {
                    enemyType = 'snake';
                }
            } else if (this.waveNumber >= 4) {
                // 4번째 웨이브부터: 25% 일반, 25% 방어, 25% 날카로운, 25% 석궁
                const rand = Math.random();
                if (rand < 0.25) {
                    enemyType = 'normal';
                } else if (rand < 0.5) {
                    enemyType = 'defense';
                } else if (rand < 0.75) {
                    enemyType = 'sharp';
                } else {
                    enemyType = 'archer';
                }
            } else if (this.waveNumber >= 3) {
                // 3번째 웨이브: 33% 일반, 33% 방어, 33% 날카로운
                const rand = Math.random();
                if (rand < 0.33) {
                    enemyType = 'normal';
                } else if (rand < 0.66) {
                    enemyType = 'defense';
                } else {
                    enemyType = 'sharp';
                }
            } else if (this.waveNumber >= 2) {
                // 2번째 웨이브: 50% 일반, 50% 방어
                enemyType = Math.random() < 0.5 ? 'normal' : 'defense';
            }
        }
        
        // 적 체력 설정
        let enemyHealth = 30;
        if (enemyType === 'defense') {
            enemyHealth = 20;
        } else if (enemyType === 'sharp') {
            enemyHealth = 30; // 날카로운 동그라미도 체력 30
        } else if (enemyType === 'archer') {
            enemyHealth = 30; // 석궁 동그라미도 체력 30
        } else if (enemyType === 'flash') {
            enemyHealth = 40; // 섬광 동그라미 체력 40
        } else if (enemyType === 'fire') {
            enemyHealth = 50; // 화염 동그라미 체력 50
        } else if (enemyType === 'monkey') {
            enemyHealth = 5; // 원숭이 체력 5
        } else if (enemyType === 'elephant') {
            enemyHealth = 500; // 코끼리 체력 500 (중간보스)
        } else if (enemyType === 'rhino') {
            enemyHealth = 1000; // 코뿔소 체력 1000
        } else if (enemyType === 'skunk') {
            enemyHealth = 10; // 스컹크 체력 10
        } else if (enemyType === 'soldier') {
            enemyHealth = 50; // 군인 체력 50
        } else if (enemyType === 'knight') {
            enemyHealth = 100; // 기사 체력 100
        } else if (enemyType === 'cannon') {
            enemyHealth = 80; // 대포 체력 80
        } else if (enemyType === 'tank') {
            enemyHealth = 200; // 탱크 체력 200
        }
        
        // 뱀 적 생성
        if (enemyType === 'snake' || enemyType === 'poisonSnake') {
            const segmentCount = 10 + Math.floor(Math.random() * 16); // 몸통 세그먼트 개수 (10~25개 랜덤)
            const bodyRadius = radius * 0.25; // 몸통 반지름 (동그라미의 1/4)
            const headRadius = bodyRadius * 1.2; // 머리 반지름 (몸통보다 20% 크게)
            const segmentSpacing = bodyRadius * 2; // 세그먼트 간격
            // 뱀 머리 체력: 플레이어 공격력의 3배 (항상 3번만에 죽게)
            // 플레이어 공격력은 2 + (레벨 - 1)이므로, 레벨 1일 때 2, 레벨 2일 때 3...
            const playerDamage = 2 * Math.pow(1.1, this.playerUpgrades.damage.level - 1); // 플레이어 공격력 계산 (레벨당 1.1배)
            const headHealth = playerDamage * 3; // 플레이어 공격력의 3배
            const segmentHealth = 20; // 각 몸통 세그먼트 체력
            
            const segments = [];
            for (let i = 0; i < segmentCount; i++) {
                const segmentRadius = i === 0 ? headRadius : bodyRadius;
                const health = i === 0 ? headHealth : segmentHealth;
                segments.push({
                    x: x - i * segmentSpacing, // 머리부터 뒤로 배치
                    y: y,
                    radius: segmentRadius,
                    health: health,
                    maxHealth: health,
                    showHealthBar: false, // 체력바 표시 여부
                    isHead: i === 0 // 머리 여부
                });
            }
            
            this.enemies.push({
                id: enemyId,
                x: x, // 머리 위치
                y: y,
                radius: headRadius, // 머리 반지름
                type: enemyType, // 'snake' 또는 'poisonSnake'
                segments: segments, // 세그먼트 배열
                bodySegmentCount: segmentCount - 1, // 몸통 세그먼트 개수 (머리 제외)
                direction: Math.random() * Math.PI * 2, // 초기 방향
                targetAngle: 0, // 목표 각도
                speed: this.enemySpeed * 0.8, // 뱀 속도 (일반 적보다 조금 느림)
                attackCooldown: 0,
                spikeDamageCooldown: 0,
                projectileCooldown: 0 // 독 발사체 쿨다운 (poisonSnake용)
            });
        } else {
            // 일반 적 생성
            const enemy = {
            id: enemyId,
                x: x,
                y: y,
                radius: radius,
                type: enemyType, // 'normal', 'defense', 'sharp', 'archer', 'monkey', 'elephant'
                health: enemyHealth, // 적 체력
                maxHealth: enemyHealth, // 최대 체력
                initialHealth: enemyHealth, // 초기 체력 (회복 방지용)
                lastHealth: enemyHealth, // 이전 프레임 체력 (회복 방지용)
                attackCooldown: 0, // 공격 쿨다운 (프레임 단위)
                wallSpawnCooldown: 0, // 벽 소환 쿨다운 (방어 동그라미용)
                lastWallSpawnDistance: Infinity, // 마지막 벽 소환 시 플레이어와의 거리
                spikeDamageCooldown: 0, // 가시 데미지 쿨다운
                showHealthBar: false, // 체력바 표시 여부 (공격받으면 true로 설정)
                projectileCooldown: 0 // 발사체 쿨다운 (석궁 동그라미용)
            };
            
            // 원숭이 특수 속성
            if (enemyType === 'monkey') {
                // 적 소환 창에서 소환할 때는 제한 없이 추가
                enemy.healthRegenTimer = 0; // 체력 회복 타이머 (5초 = 300프레임)
                enemy.fleeTimer = 0; // 도망 타이머 (2초 = 120프레임)
                enemy.isFleeing = false; // 도망 중인지 여부
                enemy.lastHealthBeforeDamage = enemyHealth; // 피격 전 체력
                this.enemies.push(enemy);
            } else if (enemyType === 'elephant') {
                // 코끼리 특수 속성 (중간보스)
                enemy.radius = this.studSize * 1.5; // 크기 크게 (1.5배)
                enemy.speed = this.enemySpeed * 0.4; // 느린 편 (40% 속도)
                enemy.attackCooldown = 0; // 공격 쿨타임 (일반 공격도 사용)
                enemy.attackAnimationTimer = 0; // 공격 애니메이션 타이머 (사용 안함)
                enemy.isAttacking = false; // 공격 중인지 여부 (사용 안함)
                enemy.footRaised = false; // 발을 올렸는지 여부 (사용 안함)
                enemy.waterBlockDetected = false; // 물블럭 감지 여부
                enemy.waterSuckTimer = 0; // 물 빨아들이기 타이머
                enemy.waterProjectiles = []; // 물 발사체 배열
                enemy.waterProjectileCount = 0; // 발사한 물 발사체 개수
                this.enemies.push(enemy);
            } else if (enemyType === 'rhino') {
                // 코뿔소 특수 속성
                enemy.radius = this.studSize * 1.2; // 코끼리보다 조금 작게 (1.2배)
                enemy.speed = this.enemySpeed * 0.5; // 기본 속도
                enemy.chargeCooldown = 0; // 돌진 쿨타임 (15초 = 900프레임)
                enemy.isCharging = false; // 돌진 중인지 여부
                enemy.chargeTimer = 0; // 돌진 타이머 (3초 = 180프레임)
                enemy.chargeDirection = { x: 0, y: 0 }; // 돌진 방향
                enemy.dustEffectTimer = 0; // 먼지 효과 타이머
                enemy.isDustActive = false; // 먼지 효과 활성화 여부
                enemy.stoppedAfterCharge = false; // 돌진 후 멈춤 여부
                enemy.stopTimer = 0; // 멈춤 타이머 (2초 = 120프레임)
                enemy.chargeSpeed = this.enemySpeed * 3; // 돌진 속도 (3배 빠름)
                enemy.isEnraged = false; // 분노 상태 (반피 이하)
                enemy.stunTimer = 0; // 기절 타이머 (5초 = 300프레임)
                enemy.infiniteChargeSpeed = this.enemySpeed * 5; // 분노 상태 돌진 속도 (5배 빠름)
                this.enemies.push(enemy);
            } else if (enemyType === 'soldier') {
                // 군인 특수 속성
                enemy.health = 50; // 체력 50
                enemy.maxHealth = 50;
                enemy.initialHealth = 50;
                enemy.lastHealth = 50;
                enemy.speed = this.enemySpeed * 0.8; // 기본 속도 (80%)
                enemy.shootCooldown = 0; // 발사 쿨타임 (1초 = 60프레임)
                enemy.shotsFired = 0; // 발사한 총알 수
                enemy.reloadTimer = 0; // 장전 타이머 (5초 = 300프레임)
                enemy.isReloading = false; // 장전 중인지 여부
                enemy.keepDistance = 220; // 플레이어와 유지할 거리 (플레이어 최대 사거리 수준)
                enemy.armor = 50; // 방어력 (파란 피)
                enemy.armorDamage = 0; // 방어력에 누적된 피해
                this.enemies.push(enemy);
            } else if (enemyType === 'knight') {
                // 기사 특수 속성
                enemy.speed = this.enemySpeed * 0.7; // 조금 느린 편 (70%)
                enemy.attackCooldown = 0; // 공격 쿨타임 (1초 = 60프레임)
                enemy.stabCooldown = 0; // 찌르기 쿨타임 (5초 = 300프레임)
                enemy.isSwinging = false; // 휘두르기 중인지 여부
                enemy.swingTimer = 0; // 휘두르기 타이머
                enemy.swingDuration = 30; // 휘두르기 지속 시간 (30프레임)
                enemy.isStabbing = false; // 찌르기 중인지 여부
                enemy.stabTimer = 0; // 찌르기 타이머
                enemy.stabDuration = 40; // 찌르기 지속 시간 (40프레임, 더 길게 돌진)
                enemy.stabDirection = { x: 0, y: 0 }; // 찌르기 방향
                enemy.stabChargeSpeed = this.enemySpeed * 2; // 찌르기 돌진 속도
                enemy.armor = 50; // 방어력 (파란 피, 체력처럼 작동)
                enemy.armorDamage = 0; // 방어력에 누적된 피해 (사용 안함, 체력처럼 직접 감소)
                this.enemies.push(enemy);
            } else if (enemyType === 'fire') {
                // 화염 동그라미 특수 속성
                enemy.speed = 1.5; // 속도 1.5
                enemy.projectileCooldown = 0; // 화염 발사체 쿨다운
                this.enemies.push(enemy);
            } else if (enemyType === 'skunk') {
                // 스컹크 특수 속성
                enemy.speed = this.enemySpeed * 1.5; // 원숭이와 같은 속도
                enemy.fartCooldown = 0; // 방구 쿨타임 (5초 = 300프레임)
                enemy.fartRange = 100; // 방구를 뀌는 범위 (플레이어와의 거리)
                this.enemies.push(enemy);
            } else if (enemyType === 'cannon') {
                // 대포 특수 속성
                // 플레이어의 2배 크기: 플레이어 최대 크기(studSize * 1.2) * 2 = studSize * 2.4
                // radius는 반지름이므로 지름의 절반: (studSize * 2.4) / 2 = studSize * 1.2
                enemy.radius = this.studSize * 1.2; // 플레이어의 2배 크기
                enemy.speed = this.enemySpeed * 0.6; // 느린 속도 (60%)
                enemy.keepDistance = 250; // 플레이어와 유지할 거리
                enemy.lastDirection = { x: 0, y: 0 }; // 마지막 이동 방향 (뒤로 가지 못하게)
                enemy.cannonCooldown = 0; // 대포 발사 쿨다운 (4초 = 240프레임)
                enemy.lastAngle = 0; // 마지막 각도 (8방향)
                this.enemies.push(enemy);
            } else if (enemyType === 'tank') {
                // 탱크 특수 속성
                enemy.radius = this.studSize * 1.5; // 크게 (1.5배)
                enemy.speed = 4; // 속도 4
                enemy.keepDistance = 300; // 플레이어와 유지할 거리
                enemy.lastDirection = { x: 0, y: 0 }; // 마지막 이동 방향
                enemy.angle = 0; // 현재 각도 (16방향, 0~15)
                enemy.shakeOffset = { x: 0, y: 0 }; // 흔들림 오프셋
                enemy.shakeTimer = 0; // 흔들림 타이머
                enemy.isShaking = false; // 특수 공격 전 흔들림 여부
                enemy.shootCooldown = 0; // 발사 쿨다운
                enemy.shotsFired = 0; // 발사한 총알 수
                enemy.shotsToSpecial = 3 + Math.floor(Math.random() * 3); // 3~5번
                enemy.specialCooldown = 0; // 특수 공격 쿨다운
                enemy.trackMarks = []; // 바퀴 자국 배열 [{x, y, life, maxLife}]
                this.enemies.push(enemy);
            } else {
            this.enemies.push(enemy);
            }
        }
        this.enemyAttackCooldown[enemyId] = 0;
    }
    
    checkCollision(playerX, playerY, playerWidth, playerHeight, enemyX, enemyY, enemyRadius) {
        // 충돌 체크 (사각형 vs 원)
        // 플레이어 중심점
        const playerCenterX = playerX + playerWidth / 2;
        const playerCenterY = playerY + playerHeight / 2;
        
        // 가장 가까운 점 찾기
        const closestX = Math.max(playerX, Math.min(enemyX, playerX + playerWidth));
        const closestY = Math.max(playerY, Math.min(enemyY, playerY + playerHeight));
        
        // 거리 계산
        const dx = enemyX - closestX;
        const dy = enemyY - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < enemyRadius;
    }
    
    updateEnemies() {
        // 10 웨이브 이후 물 웅덩이 생성 체크 (한 번만 생성)
        if (this.waveNumber > 10 && this.waterPools.length === 0 && this.waveStarted && !this.waterPoolsGenerated) {
            this.generateWaterPools();
            this.waterPoolsGenerated = true; // 생성 완료 플래그
        }
        
        // 웨이브가 시작되고 종료되지 않았을 때만 적 생성
        if (this.waveStarted && !this.waveEnded) {
            // 22 스테이지: 섬광 동그라미(flash)가 항상 5명이 되도록 유지
            if (this.waveNumber === 22) {
                const currentFlashCount = this.enemies.filter(e => e.type === 'flash').length;
                for (let i = currentFlashCount; i < 5; i++) {
                    this.spawnEnemy('flash');
                }
            }
            
            // 23 스테이지: 화염 동그라미(fire)는 스폰 확률로만 생성 (최대 5명, 최소 0명)
            // 강제 스폰 로직 제거 - 스폰 확률에 따라 자연스럽게 생성됨
            
            // 적 생성 타이머 업데이트
            this.enemySpawnTimer++;
            
            // 5번째 웨이브부터 적 생성 간격을 1.2배 더 짧게 (더 많이 생성)
            // 워터밤을 죽인 후에는 2배 더 빠르게
            // 11번째 웨이브(숲)부터는 2배 더 빠르게 (3분의 2로 줄임)
            // 13 스테이지는 뱀만 엄청나게 많이 나오도록 매우 빠르게
            // 15 스테이지 이상은 3배 빠르게
            let spawnInterval = this.enemySpawnInterval;
            if (this.waveNumber >= 16) {
                // 16 스테이지 이상: 3배 빠르게
                spawnInterval = Math.floor(this.enemySpawnInterval / 3);
            } else if (this.waveNumber === 15) {
                // 15 스테이지: 3배 빠르게
                spawnInterval = Math.floor(this.enemySpawnInterval / 3);
            } else if (this.waveNumber === 13) {
                // 13 스테이지: 뱀만 엄청나게 많이 (10배 빠르게)
                spawnInterval = Math.floor(this.enemySpawnInterval / 10);
            } else if (this.waveNumber > 10) {
                // 숲부터 2배 빠르게 (3분의 2로 줄임)
                if (this.bossKilled) {
                    spawnInterval = Math.floor(this.enemySpawnInterval / (2.4 * 2)); // 보스 죽인 후 + 숲 = 4.8배
                } else {
                    spawnInterval = Math.floor(this.enemySpawnInterval / 2); // 2배 빠르게
                }
            } else if (this.bossKilled) {
                spawnInterval = Math.floor(this.enemySpawnInterval / 2.4); // 2배 빠르게 (1.2 * 2 = 2.4)
            } else if (this.waveNumber >= 5) {
                spawnInterval = Math.floor(this.enemySpawnInterval / 1.2);
            }
            
            if (this.enemySpawnTimer >= spawnInterval) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
            }
            
        }
        
        // 각 적 업데이트
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            
            // 공격 쿨다운 감소
            if (enemy.attackCooldown > 0) {
                enemy.attackCooldown--;
            }
            
            // 벽 소환 쿨다운 감소 (방어 동그라미용)
            if (enemy.wallSpawnCooldown > 0) {
                enemy.wallSpawnCooldown--;
            }
            
            // 가시 데미지 쿨다운 감소
            if (enemy.spikeDamageCooldown > 0) {
                enemy.spikeDamageCooldown--;
            }
            
            // 발사체 쿨다운 감소 (석궁 동그라미용)
            if (enemy.projectileCooldown > 0) {
                enemy.projectileCooldown--;
            }
            
            // 지뢰 블록 범위 체크 및 폭발
            for (let j = 0; j < this.blocks.length; j++) {
                const block = this.blocks[j];
                if ((block.type === '지뢰' || block.type === '섬광 지뢰' || block.type === '총알 지뢰') && !block.isExploding) {
                    const blockCenterX = block.x + this.studSize / 2;
                    const blockCenterY = block.y + this.studSize / 2;
                    const dx = enemy.x - blockCenterX;
                    const dy = enemy.y - blockCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const range = block.range || (this.studSize * 2);
                    
                    // 적이 범위 안에 들어오면 폭발
                    if (distance < range + enemy.radius) {
                        block.isExploding = true;
                        block.explosionTimer = 0;
                        block.fadeOutTimer = 0;
                        
                        // 범위 안의 모든 적에게 128 대미지 (방어력과 체력을 동시에 공격) - 총알 지뢰는 피해 대신 총알 발사
                        for (let k = 0; k < this.enemies.length; k++) {
                            const targetEnemy = this.enemies[k];
                            const targetDx = targetEnemy.x - blockCenterX;
                            const targetDy = targetEnemy.y - blockCenterY;
                            const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                            
                            if (targetDistance < range + targetEnemy.radius) {
                                if (!block.isBulletMine) {
                                    // 방어력이 있는 적(군인, 기사)은 방어력과 체력을 동시에 감소
                                    if (targetEnemy.type === 'soldier' || targetEnemy.type === 'knight') {
                                        if (targetEnemy.armor === undefined) targetEnemy.armor = 50;
                                        // 방어력과 체력을 동시에 감소
                                        if (targetEnemy.armor > 0) {
                                            targetEnemy.armor -= block.damage;
                                            if (targetEnemy.armor < 0) targetEnemy.armor = 0;
                                        }
                                        // 체력도 동시에 감소
                                        targetEnemy.health -= block.damage;
                                    } else {
                                        targetEnemy.health -= block.damage;
                                    }
                                    
                                    if (targetEnemy.health < 0) targetEnemy.health = 0;
                                }
                                targetEnemy.showHealthBar = true;
                            }
                        }
                        
                        // 보스도 체크
                        if (this.boss) {
                            const bossDx = this.boss.x - blockCenterX;
                            const bossDy = this.boss.y - blockCenterY;
                            const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
                            
                            if (bossDistance < range + this.boss.radius && !block.isBulletMine) {
                                this.boss.health -= block.damage;
                                if (this.boss.health < 0) this.boss.health = 0;
                            }
                        }
                        
                        if (block.isFlashMine) {
                            this.detonateFlashbang(blockCenterX, blockCenterY, range * 1.2);
                            if (!block.flashTriggered) {
                                this.applyGlobalFlashEffect(300); // 5초
                                block.flashTriggered = true;
                            }
                        }
                        if (block.isBulletMine) {
                            this.detonateBulletMine(blockCenterX, blockCenterY);
                        }
                    }
                }
            }
            
            // 가시 블록과의 충돌 체크 및 데미지
            const spikeBlock = this.checkEnemySpikeCollision(enemy.x, enemy.y, enemy.radius);
            if (spikeBlock && enemy.spikeDamageCooldown === 0) {
                // 무적 상태 체크 (원숭이만)
                if (enemy.type === 'monkey' && enemy.invincibleTimer && enemy.invincibleTimer > 0) {
                    // 무적 상태면 데미지 무시
                } else {
                    // 데미지 받기 전 체력 저장
                    const healthBeforeDamage = enemy.health;
                    
                    // 가시 블록 대미지
                    const damage = 50; // 가시 대미지 50
                    
                    // 방어력이 있는 적(군인, 기사)은 방어력이 있을 때는 체력 무적
                    if (enemy.type === 'soldier' || enemy.type === 'knight') {
                        if (enemy.armor === undefined) enemy.armor = 50;
                        // 방어력이 있으면 방어력만 감소 (체력 무적)
                        if (enemy.armor > 0) {
                            enemy.armor -= damage;
                            if (enemy.armor < 0) enemy.armor = 0;
                        } else {
                            // 방어력이 다 닳으면 체력만 감소
                    enemy.health -= damage;
                        }
                    } else {
                        enemy.health -= damage;
                    }
                    enemy.spikeDamageCooldown = 60; // 1초 쿨다운
                    
                    // 체력바 표시 (공격받으면 계속 보이게)
                    enemy.showHealthBar = true;
                
                if (enemy.health <= 0) {
                    enemy.health = 0;
                }
                
                // 데미지 받기 전 체력보다 높아지면 원래 값으로 되돌림 (버그 방지)
                if (enemy.health > healthBeforeDamage) {
                    enemy.health = healthBeforeDamage;
                    }
                }
            }
            
            // 적의 체력이 회복되지 않도록 보장 (체력은 감소만 하고 회복되지 않음)
            // 이전 프레임 체력보다 높아지면 이전 체력으로 되돌림 (회복 완전 방지)
            if (enemy.health > enemy.lastHealth) {
                enemy.health = enemy.lastHealth; // 체력 증가 방지
            }
            // 체력이 초기 체력보다 높아지면 초기 체력으로 제한 (회복 방지)
            if (enemy.health > enemy.initialHealth) {
                enemy.health = enemy.initialHealth;
            }
            // 체력이 최대치를 넘지 않도록만 제한 (버그 방지)
            if (enemy.health > enemy.maxHealth) {
                enemy.health = enemy.maxHealth;
            }
            // 체력이 음수가 되지 않도록만 제한
            if (enemy.health < 0) {
                enemy.health = 0;
            }
            
            // 현재 체력을 이전 체력으로 저장 (다음 프레임 비교용)
            enemy.lastHealth = enemy.health;
            
            // 체력이 0 이하인 적 처리
            if (enemy.health <= 0) {
                // 이미 경험치 구슬이 생성되었는지 확인
                const hasOrb = this.experienceOrbs.some(orb => 
                    !orb.collected && 
                    Math.abs(orb.x - enemy.x) < 5 && 
                    Math.abs(orb.y - enemy.y) < 5
                );
                
                // 원숭이가 죽으면 원숭이 2명 소환
                if (enemy.type === 'monkey') {
                    // 현재 원숭이 수 확인 (죽은 원숭이 제외)
                    const currentMonkeyCount = this.enemies.filter(e => e.type === 'monkey' && e.id !== enemy.id).length;
                    
                    // 원숭이를 죽인 위치 근처에서 원숭이 2명 소환 (최대 10마리 제한)
                    const spawnRadius = 50; // 소환 반경
                    for (let j = 0; j < 2; j++) {
                        // 원숭이가 10마리 이상이면 소환하지 않음
                        if (currentMonkeyCount + j >= 10) {
                            break;
                        }
                        
                        const angle = (Math.PI * 2 / 2) * j; // 0도, 180도 방향
                        const spawnX = enemy.x + Math.cos(angle) * spawnRadius;
                        const spawnY = enemy.y + Math.sin(angle) * spawnRadius;
                        
                        // 화면 밖이면 화면 안으로 조정
                        const clampedX = Math.max(0, Math.min(this.canvas.width, spawnX));
                        const clampedY = Math.max(0, Math.min(this.canvas.height, spawnY));
                        
                        // 원숭이 소환
                        const monkeyId = Date.now() + Math.random() + j;
                        const monkeyHealth = 5;
                        const radius = this.studSize / 2;
                        
                        const newMonkey = {
                            id: monkeyId,
                            x: clampedX,
                            y: clampedY,
                            radius: radius,
                            type: 'monkey',
                            health: monkeyHealth,
                            maxHealth: monkeyHealth,
                            initialHealth: monkeyHealth,
                            lastHealth: monkeyHealth,
                            attackCooldown: 0,
                            wallSpawnCooldown: 0,
                            lastWallSpawnDistance: Infinity,
                            spikeDamageCooldown: 0,
                            showHealthBar: false,
                            projectileCooldown: 0,
                            healthRegenTimer: 0,
                            fleeTimer: 120, // 2초 동안 도망 (120프레임)
                            isFleeing: true, // 처음에 도망가기 시작
                            lastHealthBeforeDamage: monkeyHealth,
                            invincibleTimer: 60 // 1초 무적 (60프레임)
                        };
                        
                        this.enemies.push(newMonkey);
                        this.enemyAttackCooldown[monkeyId] = 0;
                    }
                }
                
                // 경험치 구슬이 없으면 생성
                if (!hasOrb) {
                    let expGain = 0;
                    if (enemy.type === 'normal') {
                        expGain = 25; // 동그라미
                    } else if (enemy.type === 'flash') {
                        expGain = 80; // 섬광 동그라미
                    } else if (enemy.type === 'defense') {
                        expGain = 50; // 방어 동그라미
                    } else if (enemy.type === 'sharp') {
                        expGain = 75; // 날카로운 동그라미
                    } else if (enemy.type === 'archer') {
                        expGain = 100; // 석궁 동그라미
                    } else if (enemy.type === 'monkey') {
                        expGain = 1; // 원숭이
                    } else if (enemy.type === 'elephant') {
                        expGain = 2000; // 코끼리
                    } else if (enemy.type === 'rhino') {
                        expGain = 2000; // 코뿔소
                    } else if (enemy.type === 'skunk') {
                        expGain = 50; // 스컹크
                    } else if (enemy.type === 'soldier') {
                        expGain = 100; // 군인
                    }
                    
                    // 경험치 구슬 생성
                    this.experienceOrbs.push({
                        x: enemy.x,
                        y: enemy.y,
                        expValue: expGain,
                        radius: 10, // 구슬 반지름
                        collected: false, // 수집 여부
                        isBossOrb: enemy.type === 'rhino' // 코뿔소는 초록색 구슬
                    });
                }
                
                // 코뿔소를 잡으면 웨이브 종료 및 보스 기록
                if (enemy.type === 'rhino') {
                    this.defeatedBosses.add(20); // 코뿔소 (20스테이지)
                    this.endWave();
                }
                
                // 탱크를 잡으면 보스 기록
                if (enemy.type === 'tank') {
                    this.defeatedBosses.add(30); // 탱크 (30스테이지)
                }
                
                // 적 제거 (시체는 사라짐)
                this.enemies.splice(i, 1);
                i--;
                continue;
            }
            
            // 뱀 적 처리
            if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                this.updateSnake(enemy, i);
                continue; // 뱀은 별도 처리
            }
            
            // 원숭이는 벽과 문을 쫓아가고, 다른 적은 플레이어를 향해 이동
            let targetX, targetY;
            let dirX = 0, dirY = 0;
            let distance = 0;
            
            if (enemy.type === 'monkey') {
                // 원숭이 도망가기 타이머 처리
                if (!enemy.fleeTimer) enemy.fleeTimer = 0;
                if (!enemy.isFleeing) enemy.isFleeing = false;
                
                // 도망가기 타이머 감소
                if (enemy.fleeTimer > 0) {
                    enemy.fleeTimer--;
                    if (enemy.fleeTimer <= 0) {
                        enemy.isFleeing = false;
                    }
                }
                
                // 도망가는 중이면 플레이어로부터 멀어지는 방향으로 이동
                if (enemy.isFleeing) {
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const dx = enemy.x - playerCenterX; // 플레이어로부터 멀어지는 방향
                    const dy = enemy.y - playerCenterY;
                    distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        dirX = dx / distance;
                        dirY = dy / distance;
                    } else {
                        // 플레이어와 같은 위치면 랜덤 방향으로 도망
                        const randomAngle = Math.random() * Math.PI * 2;
                        dirX = Math.cos(randomAngle);
                        dirY = Math.sin(randomAngle);
                        distance = 1;
                    }
                } else {
                    // 도망가지 않을 때는 벽이나 문을 찾아서 이동
                const blockSize = this.studSize;
                let closestBlock = null;
                let closestDistance = Infinity;
                
                for (let block of this.blocks) {
                    if (block.type === '벽' || block.type === '문') {
                        const blockCenterX = block.x + blockSize / 2;
                        const blockCenterY = block.y + blockSize / 2;
                        const distToBlock = Math.sqrt(
                            Math.pow(enemy.x - blockCenterX, 2) + 
                            Math.pow(enemy.y - blockCenterY, 2)
                        );
                        
                        if (distToBlock < closestDistance) {
                            closestDistance = distToBlock;
                            closestBlock = block;
                        }
                    }
                }
                
                if (closestBlock) {
                    const blockCenterX = closestBlock.x + blockSize / 2;
                    const blockCenterY = closestBlock.y + blockSize / 2;
                    const dx = blockCenterX - enemy.x;
                    const dy = blockCenterY - enemy.y;
                    distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        dirX = dx / distance;
                        dirY = dy / distance;
                    }
                } else {
                    // 벽이나 문이 없으면 이동하지 않음
                    dirX = 0;
                    dirY = 0;
                    distance = 0;
                    }
                }
            } else {
                // 다른 적: 플레이어를 향해 이동
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                
                // 군인은 플레이어와 거리 유지
                if (enemy.type === 'soldier' && !enemy.isReloading) {
                    const dx = playerCenterX - enemy.x;
                    const dy = playerCenterY - enemy.y;
                    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distToPlayer > 0) {
                        // 거리가 너무 가까우면 뒤로, 너무 멀면 앞으로
                        if (distToPlayer < enemy.keepDistance) {
                            // 너무 가까우면 뒤로 이동
                            dirX = -dx / distToPlayer;
                            dirY = -dy / distToPlayer;
                        } else if (distToPlayer > enemy.keepDistance * 1.2) {
                            // 너무 멀면 앞으로 이동
                            dirX = dx / distToPlayer;
                            dirY = dy / distToPlayer;
                        } else {
                            // 적절한 거리면 제자리
                            dirX = 0;
                            dirY = 0;
                        }
                        distance = distToPlayer;
                    } else {
                        dirX = 0;
                        dirY = 0;
                        distance = 0;
                    }
                } else if (enemy.type === 'cannon') {
                    // 대포는 앞으로만 이동, 플레이어와 거리 유지
                    const dx = playerCenterX - enemy.x;
                    const dy = playerCenterY - enemy.y;
                    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distToPlayer > 0) {
                        const targetDirX = dx / distToPlayer;
                        const targetDirY = dy / distToPlayer;
                        
                        // 마지막 이동 방향이 없으면 초기화
                        if (!enemy.lastDirection) {
                            enemy.lastDirection = { x: targetDirX, y: targetDirY };
                        }
                        
                        // 거리가 너무 가까우면 제자리 (뒤로 가지 못함)
                        if (distToPlayer < enemy.keepDistance) {
                            dirX = 0;
                            dirY = 0;
                        } else if (distToPlayer > enemy.keepDistance * 1.2) {
                            // 너무 멀면 앞으로만 이동 (뒤로 가지 못함)
                            // 현재 방향과 목표 방향의 내적을 계산하여 앞으로만 이동
                            const dotProduct = enemy.lastDirection.x * targetDirX + enemy.lastDirection.y * targetDirY;
                            
                            if (dotProduct >= -0.5) {
                                // 앞으로 이동 가능 (약간의 뒤로 이동도 허용하여 자연스럽게)
                                dirX = targetDirX;
                                dirY = targetDirY;
                                enemy.lastDirection.x = targetDirX;
                                enemy.lastDirection.y = targetDirY;
                            } else {
                                // 뒤로 가려고 하면 제자리
                                dirX = 0;
                                dirY = 0;
                            }
                        } else {
                            // 적절한 거리면 제자리
                            dirX = 0;
                            dirY = 0;
                        }
                        distance = distToPlayer;
                    } else {
                        dirX = 0;
                        dirY = 0;
                        distance = 0;
                    }
                } else if (enemy.type === 'tank') {
                    // 탱크는 앞뒤로만 이동, 플레이어와 거리 유지
                    const dx = playerCenterX - enemy.x;
                    const dy = playerCenterY - enemy.y;
                    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distToPlayer > 0) {
                        const targetDirX = dx / distToPlayer;
                        const targetDirY = dy / distToPlayer;
                        
                        // 마지막 이동 방향이 없으면 초기화
                        if (!enemy.lastDirection || (enemy.lastDirection.x === 0 && enemy.lastDirection.y === 0)) {
                            enemy.lastDirection = { x: targetDirX, y: targetDirY };
                        }
                        
                        // 거리가 너무 가까우면 뒤로 이동
                        if (distToPlayer < enemy.keepDistance) {
                            // 뒤로 이동 (마지막 방향의 반대)
                            dirX = -enemy.lastDirection.x;
                            dirY = -enemy.lastDirection.y;
                            enemy.lastDirection.x = dirX;
                            enemy.lastDirection.y = dirY;
                        } else if (distToPlayer > enemy.keepDistance * 1.2) {
                            // 너무 멀면 앞으로 이동
                            // 현재 방향과 목표 방향의 내적을 계산하여 앞뒤로만 이동
                            const dotProduct = enemy.lastDirection.x * targetDirX + enemy.lastDirection.y * targetDirY;
                            
                            if (dotProduct >= -0.5) {
                                // 앞으로 이동 가능
                                dirX = targetDirX;
                                dirY = targetDirY;
                                enemy.lastDirection.x = targetDirX;
                                enemy.lastDirection.y = targetDirY;
                            } else {
                                // 뒤로 이동
                                dirX = -targetDirX;
                                dirY = -targetDirY;
                                enemy.lastDirection.x = dirX;
                                enemy.lastDirection.y = dirY;
                            }
                        } else {
                            // 적절한 거리면 제자리
                            dirX = 0;
                            dirY = 0;
                        }
                        distance = distToPlayer;
                    } else {
                        dirX = 0;
                        dirY = 0;
                        distance = 0;
                    }
                    
                    // 움직일 때 흔들림 효과
                    if (dirX !== 0 || dirY !== 0) {
                        enemy.shakeOffset.x = (Math.random() - 0.5) * 2;
                        enemy.shakeOffset.y = (Math.random() - 0.5) * 2;
                    } else {
                        enemy.shakeOffset.x *= 0.9;
                        enemy.shakeOffset.y *= 0.9;
                    }
                    
                    // 바퀴 자국 생성
                    if (dirX !== 0 || dirY !== 0) {
                        enemy.trackMarks.push({
                            x: enemy.x,
                            y: enemy.y,
                            life: 600, // 10초 = 600프레임
                            maxLife: 600
                        });
                    }
                } else {
                // 만렙 가시 히트박스 체크 (적이 히트박스 안에 들어가면 가시쪽으로 빨려 들어감)
                for (let block of this.blocks) {
                    if (block.type === '가시') {
                        const blockLevel = block.level || 1;
                        const isMaxLevel = blockLevel >= 10;
                        
                        if (isMaxLevel) {
                            // 쿨타임 감소 (10초 = 600프레임)
                            if (!block.pullCooldown) block.pullCooldown = 0;
                            if (block.pullCooldown > 0) {
                                block.pullCooldown--;
                            }
                            
                            const blockSize = this.studSize;
                            const blockCenterX = block.x + blockSize / 2;
                            const blockCenterY = block.y + blockSize / 2;
                            const hitboxRadius = blockSize * 2; // 블록 크기의 2배
                            
                            // 적이 히트박스 안에 있는지 확인
                            const distToSpike = Math.sqrt(
                                Math.pow(enemy.x - blockCenterX, 2) + 
                                Math.pow(enemy.y - blockCenterY, 2)
                            );
                            
                            if (distToSpike < hitboxRadius && distToSpike > blockSize / 2) {
                                // 쿨타임이 0일 때만 빨려 들어가는 효과 발동
                                if (block.pullCooldown === 0) {
                                    // 훅 하고 엄청 빨려 들어가는 효과
                                    const pullForce = 5.0; // 강한 빨려 들어가는 힘
                                    const pullDx = (blockCenterX - enemy.x) / distToSpike;
                                    const pullDy = (blockCenterY - enemy.y) / distToSpike;
                                    enemy.x += pullDx * pullForce;
                                    enemy.y += pullDy * pullForce;
                                    
                                    // 쿨타임 재설정 (10초 = 600프레임)
                                    block.pullCooldown = 600;
                                }
                            }
                        }
                    }
                }
                
                const dx = playerCenterX - enemy.x;
                const dy = playerCenterY - enemy.y;
                distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    dirX = dx / distance;
                    dirY = dy / distance;
                    }
                }
            }
            
            // 기절 상태 확인
            const isStunned = this.enemyStunTimers[enemy.id] && this.enemyStunTimers[enemy.id] > 0;
            
            // 기절 상태가 아니면 이동
            if (!isStunned) {
                // 튕기는 타이머 감소
                if (!enemy.bounceTimer) enemy.bounceTimer = 0;
                if (enemy.bounceTimer > 0) {
                    enemy.bounceTimer--;
                }
                
                // 튕기는 중이 아니고 기절 상태가 아닐 때만 이동
                if (distance > 0 && enemy.bounceTimer === 0) {
                // 적 타입에 따른 이동 속도
                let enemySpeed = this.enemySpeed; // 기본 속도
                
                // 물 버프 타이머 감소 및 속도 감소 적용
                if (enemy.waterBuffTimer !== undefined && enemy.waterBuffTimer > 0) {
                    enemy.waterBuffTimer--;
                    // 물 버프 중일 때 속도 1/3로 감소
                    enemySpeed = enemySpeed / 3;
                }
                
                if (enemy.type === 'sharp') {
                    enemySpeed = this.enemySpeed * 0.75; // 날카로운 동그라미는 25% 느림
                } else if (enemy.type === 'knight') {
                    // 기사는 기본 속도(또는 필요하면 별도 속도)를 사용
                    enemySpeed = this.enemySpeed;
                } else if (enemy.type === 'monkey') {
                    enemySpeed = this.enemySpeed * 1.5; // 원숭이는 50% 빠름
                } else if (enemy.type === 'skunk') {
                    enemySpeed = enemy.speed || (this.enemySpeed * 1.5); // 스컹크는 원숭이와 같은 속도
                } else if (enemy.type === 'soldier') {
                    // 군인은 장전 중이 아니면 이동
                    if (enemy.isReloading) {
                        enemySpeed = 0; // 장전 중에는 이동하지 않음
                    } else {
                        enemySpeed = enemy.speed || (this.enemySpeed * 0.8);
                    }
                } else if (enemy.type === 'elephant') {
                    enemySpeed = enemy.speed || (this.enemySpeed * 0.4); // 코끼리는 느림
                } else if (enemy.type === 'rhino') {
                    // 코뿔소는 돌진 중이 아니고 멈춤 중이 아닐 때만 속도 적용
                    if (!enemy.isCharging && !enemy.stoppedAfterCharge) {
                        enemySpeed = enemy.speed || (this.enemySpeed * 0.5);
                    } else {
                        enemySpeed = 0; // 돌진 중이거나 멈춤 중이면 속도 0
                    }
                } else if (enemy.type === 'cannon') {
                    enemySpeed = enemy.speed || (this.enemySpeed * 0.6); // 대포는 느림
                } else if (enemy.type === 'tank') {
                    enemySpeed = enemy.speed || 4; // 탱크는 속도 4
                }
                
                // 물블럭 위에 있는지 체크
                const enemyCenterX = enemy.x;
                const enemyCenterY = enemy.y;
                let onWaterBlock = false;
                let onDeepWaterBlock = false;
                let onAbyssBlock = false;
                for (let block of this.blocks) {
                    const blockSize = this.studSize;
                    if (enemyCenterX >= block.x && enemyCenterX <= block.x + blockSize &&
                        enemyCenterY >= block.y && enemyCenterY <= block.y + blockSize) {
                        if (block.type === '물블럭') {
                            onWaterBlock = true;
                        } else if (block.type === '깊은물블럭') {
                            onDeepWaterBlock = true;
                        } else if (block.type === '심연블럭') {
                            onAbyssBlock = true;
                        }
                    }
                }
                
                // 심연블럭 효과 적용
                if (onAbyssBlock) {
                    // 보스가 아닌 경우
                    if (enemy.type !== 'boss' && enemy.id !== this.boss?.id) {
                        // 심연블럭에 빨려들어가는 효과
                        if (!enemy.abyssTimer) {
                            enemy.abyssTimer = 0;
                            enemy.abyssMaxTimer = 60; // 1초간 빨려들어감
                            enemy.originalAlpha = 1.0;
                        }
                        enemy.abyssTimer++;
                        // 속도 0으로 멈춤
                        enemySpeed = 0;
                        // 투명도 감소 (그라데이션 효과)
                        const progress = enemy.abyssTimer / enemy.abyssMaxTimer;
                        enemy.abyssAlpha = enemy.originalAlpha * (1 - progress);
                        // 완전히 빨려들어가면 즉시 제거
                        if (enemy.abyssTimer >= enemy.abyssMaxTimer) {
                            enemy.health = 0; // 한방에 죽음
                            // 즉시 제거
                            this.enemies.splice(i, 1);
                            i--;
                            continue;
                        }
                    } else if (enemy.type === 'boss' || enemy.id === this.boss?.id) {
                        // 중간 보스(워터밤) 처리
                        if (!enemy.abyssRespawned) {
                            enemy.abyssRespawned = true;
                            // 최대체력의 반이 깎인 상태로 위에서 다시 튀어나옴
                            const maxHealth = enemy.maxHealth || 500;
                            enemy.health = Math.floor(maxHealth / 2);
                            enemy.maxHealth = maxHealth;
                            // 위에서 다시 튀어나옴
                            enemy.x = Math.random() * this.canvas.width;
                            enemy.y = -enemy.radius;
                            // 3초 무적 (180프레임)
                            enemy.invincibleTimer = 180;
                        }
                        // 무적 중에는 속도 정상
                        if (enemy.invincibleTimer > 0) {
                            enemy.invincibleTimer--;
                        }
                    }
                } else {
                    // 심연블럭 밖으로 나가면 타이머 초기화
                    if (enemy.abyssTimer) {
                        enemy.abyssTimer = 0;
                        enemy.abyssAlpha = 1.0;
                    }
                    if (enemy.abyssRespawned && !onAbyssBlock) {
                        enemy.abyssRespawned = false;
                    }
                }
                
                // 물블럭 효과 적용
                if (onDeepWaterBlock) {
                    enemySpeed = enemySpeed * 0.1; // 깊은물블럭은 매우 느려짐
                } else if (onWaterBlock) {
                    enemySpeed = enemySpeed * 0.5; // 물블럭은 느려짐
                }
                
                // 물총 발사체에 맞았는지 체크 (속도 1/3)
                if (enemy.waterGunSlowTimer && enemy.waterGunSlowTimer > 0) {
                    enemySpeed = enemySpeed * (1/3); // 3분의 1 속도
                    enemy.waterGunSlowTimer--;
                }
                
                // 불 속도 증가 타이머 감소 및 속도 증가 적용
                if (enemy.fireSpeedBoostTimer !== undefined && enemy.fireSpeedBoostTimer > 0) {
                    enemy.fireSpeedBoostTimer--;
                    // 불 속도 증가 효과 (1.5배)
                    enemySpeed = enemySpeed * 1.5;
                }
                
                // 스컹크 방구 로직
                if (enemy.type === 'skunk') {
                    if (!enemy.fartCooldown) enemy.fartCooldown = 0;
                    if (!enemy.fartRange) enemy.fartRange = 100;
                    
                    // 방구 쿨타임 감소
                    if (enemy.fartCooldown > 0) {
                        enemy.fartCooldown--;
                    }
                    
                    // 플레이어와의 거리 확인
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const distToPlayer = Math.sqrt(
                        Math.pow(enemy.x - playerCenterX, 2) + 
                        Math.pow(enemy.y - playerCenterY, 2)
                    );
                    
                    // 플레이어가 범위 안에 있고 쿨타임이 0이면 방구 뀌기
                    if (distToPlayer <= enemy.fartRange && enemy.fartCooldown === 0) {
                        // 방구 효과 활성화
                        this.skunkFartEffect.active = true;
                        this.skunkFartEffect.timer = 0;
                        this.skunkFartEffect.maxDuration = this.skunkFartDuration * 60; // 설정된 시간(초) * 60프레임
                        
                        // 쿨타임 재설정 (5초 = 300프레임)
                        enemy.fartCooldown = 300;
                    }
                }
                
                // 군인 권총 발사 로직
                if (enemy.type === 'soldier') {
                    if (!enemy.shootCooldown) enemy.shootCooldown = 0;
                    if (!enemy.shotsFired) enemy.shotsFired = 0;
                    if (!enemy.reloadTimer) enemy.reloadTimer = 0;
                    if (!enemy.isReloading) enemy.isReloading = false;
                    if (!enemy.keepDistance) enemy.keepDistance = 220; // 플레이어 최대 사거리 수준
                    if (enemy.armor === undefined) enemy.armor = 50; // 처음 생성될 때만 초기화
                        // 장전 중 처리
                        if (enemy.isReloading) {
                            enemy.reloadTimer++;
                            if (enemy.reloadTimer >= 300) { // 5초 = 300프레임
                                enemy.isReloading = false;
                                enemy.reloadTimer = 0;
                                enemy.shotsFired = 0; // 발사 수 리셋
                            }
                        } else {
                        // 발사 쿨타임 감소
                        if (enemy.shootCooldown > 0) {
                            enemy.shootCooldown--;
                        }
                        
                        // 플레이어와의 거리 및 방향 계산
                        const playerCenterX = this.player.x + this.player.width / 2;
                        const playerCenterY = this.player.y + this.player.height / 2;
                        const dx = playerCenterX - enemy.x;
                        const dy = playerCenterY - enemy.y;
                        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
                        
                        // 발사 가능하고 장전 중이 아니면 발사
                        if (enemy.shootCooldown === 0 && distToPlayer > 0) {
                            // 권총 발사
                            const projectileSpeed = 8;
                            const vx = (dx / distToPlayer) * projectileSpeed;
                            const vy = (dy / distToPlayer) * projectileSpeed;
                            
                            this.enemyProjectiles.push({
                                x: enemy.x,
                                y: enemy.y,
                                vx: vx,
                                vy: vy,
                                damage: 5,
                                radius: 4,
                                type: 'soldier' // 군인 총알 표시
                            });
                            
                            // 발사 수 증가
                            enemy.shotsFired++;
                            // 쿨타임 설정 (1초 = 60프레임)
                            enemy.shootCooldown = 60;
                            
                            // 10발 발사하면 장전 시작
                            if (enemy.shotsFired >= 10) {
                                enemy.isReloading = true;
                                enemy.reloadTimer = 0;
                            }
                        }
                    }
                }
                
                // 기사 공격 로직
                if (enemy.type === 'knight') {
                    if (!enemy.attackCooldown) enemy.attackCooldown = 0;
                    if (!enemy.stabCooldown) enemy.stabCooldown = 0;
                    if (!enemy.isSwinging) enemy.isSwinging = false;
                    if (!enemy.swingTimer) enemy.swingTimer = 0;
                    if (!enemy.isStabbing) enemy.isStabbing = false;
                    if (!enemy.stabTimer) enemy.stabTimer = 0;
                    if (!enemy.stabDirection) enemy.stabDirection = { x: 0, y: 0 };
                    if (!enemy.stabChargeSpeed) enemy.stabChargeSpeed = this.enemySpeed * 2;
                    
                    // 공격 쿨타임 감소
                    if (enemy.attackCooldown > 0) {
                        enemy.attackCooldown--;
                    }
                    
                    // 찌르기 쿨타임 감소
                    if (enemy.stabCooldown > 0) {
                        enemy.stabCooldown--;
                    }
                    
                    // 플레이어와의 거리 및 방향 계산
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const dx = playerCenterX - enemy.x;
                    const dy = playerCenterY - enemy.y;
                    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
                    const closeRange = this.studSize * 3; // 찌르기 사용 거리
                    
                    // 찌르기 중 처리
                    if (enemy.isStabbing) {
                        enemy.stabTimer++;
                        
                        // 찌르기 돌진
                        if (enemy.stabTimer < enemy.stabDuration) {
                            enemy.x += enemy.stabDirection.x * enemy.stabChargeSpeed;
                            enemy.y += enemy.stabDirection.y * enemy.stabChargeSpeed;
                        }
                        
                        // 찌르기 충돌 체크 (중간에 한 번만)
                        if (enemy.stabTimer === 10) {
                            const playerDx = playerCenterX - enemy.x;
                            const playerDy = playerCenterY - enemy.y;
                            const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                            
                            if (playerDistance < enemy.radius + Math.max(this.player.width, this.player.height) / 2) {
                                // 찌르기 대미지 5
                                this.health -= 5;
                                if (this.health < 0) this.health = 0;
                                
                                // 출혈 효과 적용 (15대미지까지 2대미지씩)
                                this.bleedingEffect.active = true;
                                this.bleedingEffect.damage = 15; // 총 15대미지
                                this.bleedingEffect.timer = 0;
                                
                                // 피격 색상 적용
                                this.playerHitColorTimer = 10;
                                
                                // UI 업데이트
                                this.updateHealthDisplay();
                                
                                // 체력이 0이 되면 게임 오버
                                if (this.health <= 0 && !this.gameOver) {
                                    this.monsterName = '기사';
                                    this.saveGameState();
                                    this.gameOver = true;
                                }
                            }
                        }
                        
                        // 찌르기 종료
                        if (enemy.stabTimer >= enemy.stabDuration) {
                            enemy.isStabbing = false;
                            enemy.stabTimer = 0;
                            enemy.stabCooldown = 300; // 5초 쿨타임
                        }
                    }
                    // 휘두르기 중 처리
                    else if (enemy.isSwinging) {
                        enemy.swingTimer++;
                        
                        // 휘두르기 충돌 체크 (중간에 한 번만)
                        if (enemy.swingTimer === 15) {
                            const playerDx = playerCenterX - enemy.x;
                            const playerDy = playerCenterY - enemy.y;
                            const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                            
                            // 휘두르기 범위 (검의 범위)
                            const swingRange = enemy.radius * 2;
                            if (playerDistance < swingRange + Math.max(this.player.width, this.player.height) / 2) {
                                // 휘두르기 대미지 10
                                this.health -= 10;
                                if (this.health < 0) this.health = 0;
                                
                                // 피격 색상 적용
                                this.playerHitColorTimer = 10;
                                
                                // UI 업데이트
                                this.updateHealthDisplay();
                                
                                // 체력이 0이 되면 게임 오버
                                if (this.health <= 0 && !this.gameOver) {
                                    this.monsterName = '기사';
                                    this.saveGameState();
                                    this.gameOver = true;
                                }
                            }
                        }
                        
                        // 휘두르기 종료
                        if (enemy.swingTimer >= enemy.swingDuration) {
                            enemy.isSwinging = false;
                            enemy.swingTimer = 0;
                            enemy.attackCooldown = 60; // 1초 쿨타임
                        }
                    }
                    // 공격 가능 상태
                    else if (enemy.attackCooldown === 0 && distToPlayer > 0) {
                        // 플레이어가 가까이 있으면 찌르기
                        if (distToPlayer <= closeRange && enemy.stabCooldown === 0) {
                            // 찌르기 시작
                            enemy.isStabbing = true;
                            enemy.stabTimer = 0;
                            const dirX = dx / distToPlayer;
                            const dirY = dy / distToPlayer;
                            enemy.stabDirection.x = dirX;
                            enemy.stabDirection.y = dirY;
                        }
                        // 그 외에는 휘두르기
                        else {
                            // 휘두르기 시작
                            enemy.isSwinging = true;
                            enemy.swingTimer = 0;
                        }
                    }
                }
                
                // 원숭이 체력 회복 (5초마다 1씩)
                if (enemy.type === 'monkey') {
                    if (!enemy.healthRegenTimer) enemy.healthRegenTimer = 0;
                    enemy.healthRegenTimer++;
                    if (enemy.healthRegenTimer >= 300) { // 5초 = 300프레임
                        if (enemy.health < enemy.maxHealth) {
                            enemy.health = Math.min(enemy.health + 1, enemy.maxHealth);
                        }
                        enemy.healthRegenTimer = 0;
                    }
                    
                    // 무적 타이머 감소
                    if (enemy.invincibleTimer && enemy.invincibleTimer > 0) {
                        enemy.invincibleTimer--;
                    }
                }
                
                // 코끼리 업데이트
                if (enemy.type === 'elephant') {
                    // 물블럭 감지 (물블럭, 깊은물블럭, 심연블럭)
                    const elephantCenterX = enemy.x;
                    const elephantCenterY = enemy.y;
                    let onWaterBlock = false;
                    let waterBlockType = null;
                    for (let block of this.blocks) {
                        const blockSize = this.studSize;
                        if (elephantCenterX >= block.x && elephantCenterX <= block.x + blockSize &&
                            elephantCenterY >= block.y && elephantCenterY <= block.y + blockSize) {
                            if (block.type === '물블럭' || block.type === '깊은물블럭' || block.type === '심연블럭') {
                                onWaterBlock = true;
                                waterBlockType = block.type;
                                break;
                            }
                        }
                    }
                    
                    if (onWaterBlock) {
                        // 물블럭 감지됨
                        if (!enemy.waterBlockDetected) {
                            enemy.waterBlockDetected = true;
                            enemy.waterSuckTimer = 0;
                            enemy.waterProjectiles = [];
                            enemy.waterProjectileCount = 0;
                        }
                        
                        enemy.waterSuckTimer++;
                        
                        // 물 빨아들이기 애니메이션 (60프레임 = 1초)
                        if (enemy.waterSuckTimer <= 60) {
                            // 물을 빨아들이는 중
                        } else if (enemy.waterSuckTimer <= 120) {
                            // 물을 머금는 중
                        } else {
                            // 물 발사
                            if (enemy.waterProjectileCount === 0) {
                                // 물 발사체 개수 결정 (20~40개)
                                const projectileCount = 20 + Math.floor(Math.random() * 21); // 20~40
                                enemy.waterProjectileCount = projectileCount;
                                
                                // 모든 방향으로 물 발사체 생성
                                const playerCenterX = this.player.x + this.player.width / 2;
                                const playerCenterY = this.player.y + this.player.height / 2;
                                for (let i = 0; i < projectileCount; i++) {
                                    const angle = (Math.PI * 2 * i) / projectileCount; // 모든 방향
                                    const delay = i * 2; // 차례대로 발사 (2프레임 간격)
                                    enemy.waterProjectiles.push({
                                        angle: angle,
                                        delay: delay,
                                        x: enemy.x,
                                        y: enemy.y,
                                        vx: 0,
                                        vy: 0,
                                        speed: 8,
                                        radius: 5,
                                        active: false
                                    });
                                }
                            }
                            
                            // 물 발사체 업데이트
                            for (let proj of enemy.waterProjectiles) {
                                if (proj.delay > 0) {
                                    proj.delay--;
                                } else if (!proj.active) {
                                    proj.active = true;
                                    proj.vx = Math.cos(proj.angle) * proj.speed;
                                    proj.vy = Math.sin(proj.angle) * proj.speed;
                                }
                                
                                if (proj.active) {
                                    proj.x += proj.vx;
                                    proj.y += proj.vy;
                                    
                                    // 플레이어와 충돌 체크
                                    const playerCenterX = this.player.x + this.player.width / 2;
                                    const playerCenterY = this.player.y + this.player.height / 2;
                                    const dx = proj.x - playerCenterX;
                                    const dy = proj.y - playerCenterY;
                                    const distance = Math.sqrt(dx * dx + dy * dy);
                                    
                                    if (distance < proj.radius + Math.max(this.player.width, this.player.height) / 2) {
                                        // 플레이어에게 데미지 (10, 속도감소 없음)
                                        this.health -= 10;
                                        if (this.health < 0) this.health = 0;
                                        this.playerHitColorTimer = 10;
                                        this.updateHealthDisplay();
                                        
                                        // 발사체 제거
                                        proj.active = false;
                                        proj.x = -1000; // 화면 밖으로 이동
                                        
                                        if (this.health <= 0 && !this.gameOver) {
                                            this.monsterName = '코끼리';
                                            this.saveGameState();
                                            this.gameOver = true;
                                        }
                                    }
                                    
                                    // 화면 밖으로 나가면 제거
                                    if (proj.x < 0 || proj.x > this.canvas.width ||
                                        proj.y < 0 || proj.y > this.canvas.height) {
                                        proj.active = false;
                                    }
                                }
                            }
                            
                            // 물블럭이 물블럭이면 빨아들이기 (블록 제거)
                            if (waterBlockType === '물블럭' && enemy.waterSuckTimer === 121) {
                                // 물블럭 찾아서 제거
                                for (let j = this.blocks.length - 1; j >= 0; j--) {
                                    const block = this.blocks[j];
                                    if (block.type === '물블럭' &&
                                        elephantCenterX >= block.x && elephantCenterX <= block.x + this.studSize &&
                                        elephantCenterY >= block.y && elephantCenterY <= block.y + this.studSize) {
                                        this.blocks.splice(j, 1);
                                        break;
                                    }
                                }
                            }
                            
                            // 발사 완료 후 리셋
                            if (enemy.waterSuckTimer >= 120 + enemy.waterProjectileCount * 2 + 60) {
                                enemy.waterBlockDetected = false;
                                enemy.waterSuckTimer = 0;
                                enemy.waterProjectiles = [];
                                enemy.waterProjectileCount = 0;
                            }
                        }
                    } else {
                        // 물블럭 밖으로 나감
                        if (enemy.waterBlockDetected) {
                            enemy.waterBlockDetected = false;
                            enemy.waterSuckTimer = 0;
                            enemy.waterProjectiles = [];
                            enemy.waterProjectileCount = 0;
                        }
                        
                        // 코끼리는 일반 공격도 사용 (스킬과 함께)
                    }
                }
                
                // 코뿔소 업데이트
                if (enemy.type === 'rhino') {
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const rhinoCenterX = enemy.x;
                    const rhinoCenterY = enemy.y;
                    const dx = playerCenterX - rhinoCenterX;
                    const dy = playerCenterY - rhinoCenterY;
                    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
                    
                    // 반피 이하 체크 (분노 상태)
                    const healthPercent = enemy.health / enemy.maxHealth;
                    if (healthPercent <= 0.5 && !enemy.isEnraged) {
                        enemy.isEnraged = true;
                        // 분노 상태 시작 시 무한 돌진 시작
                        enemy.isCharging = true;
                        enemy.chargeTimer = 0;
                        enemy.chargeCooldown = 0;
                        enemy.stoppedAfterCharge = false;
                        enemy.stopTimer = 0;
                    }
                    
                    // 기절 타이머 감소
                    if (enemy.stunTimer > 0) {
                        enemy.stunTimer--;
                        // 기절 중에는 이동하지 않음
                        enemySpeed = 0;
                        enemy.isCharging = false;
                    } else if (enemy.isEnraged && !enemy.stoppedAfterCharge) {
                        // 분노 상태: 무한 돌진 (방향을 계속 업데이트)
                        if (!enemy.isCharging) {
                            enemy.isCharging = true;
                            enemy.chargeTimer = 0;
                        }
                        
                        // 플레이어를 향해 방향 업데이트 (꺾을 수 있게)
                        if (distanceToPlayer > 0) {
                            const dirX = dx / distanceToPlayer;
                            const dirY = dy / distanceToPlayer;
                            enemy.chargeDirection.x = dirX;
                            enemy.chargeDirection.y = dirY;
                        }
                        
                        // 빠른 속도로 돌진
                        enemy.x += enemy.chargeDirection.x * enemy.infiniteChargeSpeed;
                        enemy.y += enemy.chargeDirection.y * enemy.infiniteChargeSpeed;
                        enemySpeed = 0; // 돌진 중에는 일반 속도 사용 안함
                        
                        // 먼지 효과 제거됨
                        
                        // 플레이어와 충돌 체크
                        const playerDx = playerCenterX - enemy.x;
                        const playerDy = playerCenterY - enemy.y;
                        const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                        
                        if (playerDistance < enemy.radius + Math.max(this.player.width, this.player.height) / 2) {
                            // 코뿔소 돌진 충돌 시 대미지 (50 대미지)
                            if (enemy.attackCooldown === 0) {
                                this.health -= 50; // 코뿔소 돌진 대미지 50
                                if (this.health < 0) this.health = 0;
                                
                                // 코뿔소도 50 대미지 받음
                                enemy.health -= 50;
                                if (enemy.health < 0) enemy.health = 0;
                                
                                // 피격 색상 적용
                                this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                                
                                // 기절 적용 (5초 = 300프레임)
                                enemy.stunTimer = 300;
                                enemy.isCharging = false;
                                
                                // 공격 쿨다운 설정 (1초 = 60프레임)
                                enemy.attackCooldown = 60;
                                
                                // UI 업데이트
                                this.updateHealthDisplay();
                                
                                // 체력이 0이 되면 게임 오버
                                if (this.health <= 0 && !this.gameOver) {
                                    this.monsterName = '코뿔소';
                                    this.saveGameState(); // 게임 상태 저장
                                    this.gameOver = true;
                                }
                            }
                        }
                    } else {
                        // 일반 모드 (분노 상태가 아닐 때)
                        // 돌진 쿨타임 감소
                        if (enemy.chargeCooldown > 0) {
                            enemy.chargeCooldown--;
                        }
                        
                        // 돌진 후 멈춤 처리
                        if (enemy.stoppedAfterCharge) {
                            enemy.stopTimer++;
                            if (enemy.stopTimer >= 120) { // 2초 = 120프레임
                                enemy.stoppedAfterCharge = false;
                                enemy.stopTimer = 0;
                            }
                            // 멈춤 중에는 이동하지 않음
                            enemySpeed = 0;
                        } else if (enemy.isCharging) {
                            // 돌진 중
                            enemy.chargeTimer++;
                            
                            // 먼지 효과 제거됨
                            
                            // 돌진 이동
                            enemy.x += enemy.chargeDirection.x * enemy.chargeSpeed;
                            enemy.y += enemy.chargeDirection.y * enemy.chargeSpeed;
                            enemySpeed = 0; // 돌진 중에는 일반 속도 사용 안함
                            
                            // 플레이어와 충돌 체크 (돌진 중)
                            const playerDx = playerCenterX - enemy.x;
                            const playerDy = playerCenterY - enemy.y;
                            const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                            
                            if (playerDistance < enemy.radius + Math.max(this.player.width, this.player.height) / 2) {
                                // 코뿔소 돌진 충돌 시 대미지 (30 대미지)
                                if (enemy.attackCooldown === 0) {
                                    this.health -= 30; // 코뿔소 돌진 대미지 30
                                    if (this.health < 0) this.health = 0;
                                    
                                    // 피격 색상 적용
                                    this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                                    
                                    // 공격 쿨다운 설정 (1초 = 60프레임)
                                    enemy.attackCooldown = 60;
                                    
                                    // UI 업데이트
                                    this.updateHealthDisplay();
                                    
                                    // 체력이 0이 되면 게임 오버
                                    if (this.health <= 0 && !this.gameOver) {
                                        this.monsterName = '코뿔소';
                                        this.saveGameState(); // 게임 상태 저장
                                        this.gameOver = true;
                                    }
                                }
                            }
                            
                            // 돌진 종료 (3초 = 180프레임)
                            if (enemy.chargeTimer >= 180) {
                                enemy.isCharging = false;
                                enemy.chargeTimer = 0;
                                enemy.stoppedAfterCharge = true;
                                enemy.stopTimer = 0;
                                enemy.chargeCooldown = 900; // 15초 쿨타임
                                // 먼지 효과 제거됨
                                enemy.isDustActive = false;
                                enemy.dustEffectTimer = 0;
                            }
                        } else {
                            // 일반 추적 모드
                            // 플레이어와의 거리가 일정 거리 이하면 돌진 준비
                            const chargeTriggerDistance = 300; // 돌진 트리거 거리
                            
                            if (distanceToPlayer <= chargeTriggerDistance && enemy.chargeCooldown === 0) {
                                // 돌진 준비 시작
                                enemy.dustEffectTimer++;
                                
                                // 먼지 효과 제거됨
                                if (enemy.dustEffectTimer >= 60) {
                                    // 돌진 방향 설정
                                    const dirX = dx / distanceToPlayer;
                                    const dirY = dy / distanceToPlayer;
                                    enemy.chargeDirection.x = dirX;
                                    enemy.chargeDirection.y = dirY;
                                    
                                    // 돌진 시작
                                    enemy.isCharging = true;
                                    enemy.chargeTimer = 0;
                                    enemy.dustEffectTimer = 0;
                                }
                            }
                            // 일반 추적 모드는 위에서 이미 enemySpeed가 설정됨
                        }
                    }
                }
                
                // 물에 들어갔는지 체크
                const enemyInWater = this.waveNumber > 10 && this.checkInWater(enemy.x, enemy.y, enemy.radius);
                if (enemyInWater) {
                    enemySpeed = enemySpeed / 3; // 물에 들어가면 속도 1/3로 감소
                    // 물 파티클 생성 (가끔씩)
                    if (Math.random() < 0.1) {
                        this.createWaterParticles(enemy.x, enemy.y);
                    }
                }
                
                let moveDirX = dirX;
                let moveDirY = dirY;
                
                // 이동할 위치 계산
                // 기절 상태 확인
                const isStunned = this.enemyStunTimers[enemy.id] && this.enemyStunTimers[enemy.id] > 0;
                
                // 기절 상태가 아니면 이동
                const newEnemyX = isStunned ? enemy.x : enemy.x + moveDirX * enemySpeed;
                const newEnemyY = isStunned ? enemy.y : enemy.y + moveDirY * enemySpeed;
                
                // 이동 전에 블록 충돌 체크 (벽만)
                const blockCollision = this.checkEnemyBlockCollision(newEnemyX, newEnemyY, enemy.radius);
                
                if (blockCollision) {
                    // 벽에 충돌하면 반대 방향으로 튕기기
                    const { block, distance: blockDist, dx: blockDx, dy: blockDy } = blockCollision;
                    const minDistance = enemy.radius;
                    const overlap = minDistance - blockDist;
                    
                    if (overlap > 0 && blockDist > 0 && (block.type === '벽' || block.type === '물먹은스펀지벽' || block.type === '가시가있는벽' || block.type === '모래벽')) {
                        const blockLevel = block.level || 1;
                        const isMaxLevel = blockLevel >= 10;
                        const isSpongeWall = block.type === '물먹은스펀지벽';
                        const isThornWall = block.type === '가시가있는벽';
                        const isSandWall = block.type === '모래벽';
                        
                        // 가시가있는벽: 적이 닿을 때마다 10 데미지
                        if (isThornWall) {
                            // 쿨다운 체크 (1초 = 60프레임)
                            if (!block.thornDamageCooldown) block.thornDamageCooldown = 0;
                            if (block.thornDamageCooldown > 0) {
                                block.thornDamageCooldown--;
                            }
                            
                            if (block.thornDamageCooldown === 0) {
                                // 방어력이 있는 적(군인, 기사)은 방어력과 체력을 동시에 감소
                                if (enemy.type === 'soldier' || enemy.type === 'knight') {
                                    if (enemy.armor === undefined) enemy.armor = 50;
                                    // 방어력과 체력을 동시에 감소
                                    if (enemy.armor > 0) {
                                        enemy.armor -= 10;
                                        if (enemy.armor < 0) enemy.armor = 0;
                                    }
                                    // 체력도 동시에 감소
                                    enemy.health -= 10;
                                } else {
                                    enemy.health -= 10;
                                }
                                block.thornDamageCooldown = 60; // 1초 쿨다운
                            }
                            
                            // 일반 벽처럼 밀어내기
                            const pushX = (blockDx / blockDist) * overlap;
                            const pushY = (blockDy / blockDist) * overlap;
                            enemy.x += pushX;
                            enemy.y += pushY;
                        }
                        // 모래벽: 일반 벽처럼 처리 (크기는 데미지 받을 때 증가)
                        else if (isSandWall) {
                            const pushX = (blockDx / blockDist) * overlap;
                            const pushY = (blockDy / blockDist) * overlap;
                            enemy.x += pushX;
                            enemy.y += pushY;
                        }
                        // 만렙일 때만 튕기는 효과 발동 (물먹은스펀지벽은 항상 튕김)
                        else if (isMaxLevel || isSpongeWall) {
                            // 쿨타임 감소 (3초 = 180프레임)
                            if (!block.bounceCooldown) block.bounceCooldown = 0;
                            if (block.bounceCooldown > 0) {
                                block.bounceCooldown--;
                            }
                            
                            // 쿨타임이 0일 때만 튕기는 효과 발동
                            if (block.bounceCooldown === 0) {
                                // 적을 블록에서 밀어내기 (현재 위치에서)
                                const pushX = (blockDx / blockDist) * overlap;
                                const pushY = (blockDy / blockDist) * overlap;
                                enemy.x += pushX;
                                enemy.y += pushY;
                                
                                // 반대 방향으로 2칸 정도 날아가게 튕기기
                                const blockSize = this.studSize;
                                const bounceDistance = blockSize * 2; // 2칸 정도
                                const bounceDirX = -blockDx / blockDist; // 블록에서 멀어지는 방향
                                const bounceDirY = -blockDy / blockDist;
                                enemy.x += bounceDirX * bounceDistance;
                                enemy.y += bounceDirY * bounceDistance;
                                
                                // 튕긴 후 일정 시간 동안 플레이어를 향해 이동하지 않도록 타이머 설정
                                enemy.bounceTimer = 60; // 1초 동안 튕기는 효과 유지
                                
                                // 벽 블록 튕기는 애니메이션 효과 (크기가 많이 커졌다 작아지는 효과)
                                block.bounceScale = 2.0; // 2배로 많이 커짐
                                
                                // 쿨타임 재설정 (3초 = 180프레임)
                                block.bounceCooldown = 180;
                                
                                // 물먹은스펀지벽일 때 히트박스 안의 적에게 물 버프 적용
                                if (block.type === '물먹은스펀지벽') {
                                    const hitboxRadius = this.studSize * 2; // 히트박스 반경
                                    const blockCenterX = block.x + this.studSize / 2;
                                    const blockCenterY = block.y + this.studSize / 2;
                                    
                                    // 히트박스 안의 모든 적에게 물 버프 적용
                                    for (let k = 0; k < this.enemies.length; k++) {
                                        const targetEnemy = this.enemies[k];
                                        const targetDx = targetEnemy.x - blockCenterX;
                                        const targetDy = targetEnemy.y - blockCenterY;
                                        const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                                        
                                        if (targetDistance < hitboxRadius + targetEnemy.radius) {
                                            // 물 버프 적용 (5초 = 300프레임)
                                            targetEnemy.waterBuffTimer = 300;
                                        }
                                    }
                                }
                            } else {
                                // 쿨타임 중일 때는 기존 로직 (밀어내기만)
                                const pushX = (blockDx / blockDist) * overlap;
                                const pushY = (blockDy / blockDist) * overlap;
                                enemy.x += pushX;
                                enemy.y += pushY;
                            }
                        } else {
                            // 일반 벽: 기존 로직 (밀어내기만)
                            const pushX = (blockDx / blockDist) * overlap;
                            const pushY = (blockDy / blockDist) * overlap;
                            enemy.x += pushX;
                            enemy.y += pushY;
                        }
                        
                        // 블록에 데미지 (적이 블록에 부딪히면 체력 감소)
                        if (enemy.attackCooldown <= 0) {
                            // 원숭이는 벽과 문만 공격
                            if (enemy.type === 'monkey') {
                                if (block.type === '벽' || block.type === '문' || block.type === '물먹은스펀지벽' || block.type === '가시가있는벽' || block.type === '모래벽') {
                                    const blockLevel = block.level || 1;
                                    const isMaxLevel = blockLevel >= 10;
                                    
                                    if (isMaxLevel && block.type === '벽') {
                                        // 만렙 벽: 동그라미 확대 및 반투명 처리
                                        if (!block.shieldRadius) {
                                            block.shieldRadius = this.studSize / 6; // 기본 크기
                                        }
                                        if (!block.shieldActive) {
                                            block.shieldActive = true;
                                        }
                                        // 동그라미를 블록을 감쌀 정도로 확대
                                        const maxRadius = this.studSize / 2 * 1.2; // 블록 크기의 1.2배
                                        if (block.shieldRadius < maxRadius) {
                                            block.shieldRadius = Math.min(block.shieldRadius + 5, maxRadius);
                                        }
                                    } else {
                                        block.health -= 1; // 벽과 문에 데미지
                                    }
                                    enemy.attackCooldown = 60; // 1초 쿨다운
                                }
                            } else {
                                // 다른 적들은 기존 로직
                                const blockLevel = block.level || 1;
                                const isMaxLevel = blockLevel >= 10;
                                
                                if (isMaxLevel && block.type === '벽') {
                                    // 만렙 벽: 동그라미 확대 및 반투명 처리
                                    if (!block.shieldRadius) {
                                        block.shieldRadius = this.studSize / 6; // 기본 크기
                                    }
                                    if (!block.shieldActive) {
                                        block.shieldActive = true;
                                    }
                                    // 동그라미를 블록을 감쌀 정도로 확대
                                    const maxRadius = this.studSize / 2 * 1.2; // 블록 크기의 1.2배
                                    if (block.shieldRadius < maxRadius) {
                                        block.shieldRadius = Math.min(block.shieldRadius + 5, maxRadius);
                                    }
                                } else {
                                    block.health -= 1; // 일반 블록은 데미지
                                }
                                enemy.attackCooldown = 60; // 1초 쿨다운
                            }
                        }
                    } else if (overlap > 0 && blockDist > 0) {
                        // 벽이 아닌 다른 블록 (문 등)에 충돌할 때는 기존 로직
                        const pushX = (blockDx / blockDist) * overlap;
                        const pushY = (blockDy / blockDist) * overlap;
                        enemy.x += pushX;
                        enemy.y += pushY;
                    }
                } else {
                    // 충돌이 없으면 이동
                    enemy.x = newEnemyX;
                    enemy.y = newEnemyY;
                }
                }
            }
            
            // 플레이어와 충돌 체크 및 밀어내기 (원숭이는 플레이어를 공격하지 않음)
            if (enemy.type !== 'monkey') {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const currentDx = playerCenterX - enemy.x;
                const currentDy = playerCenterY - enemy.y;
                const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
                
                const playerRadius = Math.max(this.player.width, this.player.height) / 2;
                const minDistance = playerRadius + enemy.radius;
                
                if (currentDistance < minDistance && currentDistance > 0) {
                    // 겹침 발생 - 서로 밀어내기
                    const overlap = minDistance - currentDistance;
                    const pushX = (currentDx / currentDistance) * overlap * 0.5; // 0.5는 양쪽으로 나눠서 밀기
                    const pushY = (currentDy / currentDistance) * overlap * 0.5;
                    
                    // 적을 밀어내기
                    enemy.x -= pushX;
                    enemy.y -= pushY;
                    
                    // 플레이어를 밀어내기 (화면 경계 체크)
                    const newPlayerX = this.player.x + pushX;
                    const newPlayerY = this.player.y + pushY;
                    
                    if (newPlayerX >= 0 && newPlayerX + this.player.width <= this.canvas.width) {
                        this.player.x = newPlayerX;
                    }
                    if (newPlayerY >= 0 && newPlayerY + this.player.height <= this.canvas.height) {
                        this.player.y = newPlayerY;
                    }
                    
                    // 충돌 시 데미지 처리 (원숭이는 제외, 코끼리는 일반 공격 가능)
                    if ((enemy.type === 'normal' || enemy.type === 'sharp' || enemy.type === 'rhino' || enemy.type === 'elephant') && enemy.attackCooldown === 0) {
                        // 모든 적의 플레이어 공격력은 블럭을 때리는 공격력과 동일하게 1로 통일
                        const damage = 1;
                        this.health -= damage;
                        if (this.health < 0) this.health = 0;
                        
                        // 피격 색상 적용
                        this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                        
                        // 공격 쿨다운 설정 (1초 = 60프레임)
                        enemy.attackCooldown = 60;
                        
                        // UI 업데이트
                        this.updateHealthDisplay();
                        
                        // 체력이 0이 되면 게임 오버
                        if (this.health <= 0 && !this.gameOver) {
                            // 죽인 적의 타입에 따라 몬스터 이름 설정
                            if (enemy.type === 'sharp') {
                                this.monsterName = '날카로운 동그라미';
                            } else if (enemy.type === 'defense') {
                                this.monsterName = '방어 동그라미';
                            } else if (enemy.type === 'archer') {
                                this.monsterName = '석궁 동그라미';
                            } else if (enemy.type === 'flash') {
                                this.monsterName = '섬광 동그라미';
                            } else if (enemy.type === 'soldier') {
                                this.monsterName = '군인';
                            } else if (enemy.type === 'rhino') {
                                this.monsterName = '코뿔소';
                            } else if (enemy.type === 'elephant') {
                                this.monsterName = '코끼리';
                            } else {
                                this.monsterName = '동그라미';
                            }
                            this.saveGameState(); // 게임 상태 저장
                            this.gameOver = true;
                        }
                    }
                }
            }
            
            // 방어 동그라미 벽 소환 로직
            if (enemy.type === 'defense') {
                const spawnDistance = 150; // 벽 소환 거리 (픽셀)
                
                // 플레이어와의 거리 계산
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const currentDx = playerCenterX - enemy.x;
                const currentDy = playerCenterY - enemy.y;
                const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
                
                // 플레이어와 가까워지면 벽 소환
                if (currentDistance <= spawnDistance && 
                    currentDistance < enemy.lastWallSpawnDistance && 
                    enemy.wallSpawnCooldown === 0) {
                    
                    // 플레이어 방향으로 벽 소환
                    const wallLength = 100; // 벽 길이
                    const wallThickness = 8; // 벽 두께
                    
                    // 플레이어 방향 계산
                    const angle = Math.atan2(currentDy, currentDx);
                    
                    // 벽 위치 (적 위치에서 플레이어 방향으로)
                    const wallX = enemy.x + Math.cos(angle) * (enemy.radius + wallThickness / 2);
                    const wallY = enemy.y + Math.sin(angle) * (enemy.radius + wallThickness / 2);
                    
                    // 벽 방향에 따라 가로/세로 결정
                    const isHorizontal = Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle));
                    
                    let wallWidth, wallHeight;
                    if (isHorizontal) {
                        wallWidth = wallLength;
                        wallHeight = wallThickness;
                    } else {
                        wallWidth = wallThickness;
                        wallHeight = wallLength;
                    }
                    
                    // 벽 중심을 기준으로 위치 조정
                    const finalWallX = wallX - wallWidth / 2;
                    const finalWallY = wallY - wallHeight / 2;
                    
                    // 벽 소환
                    this.enemyWalls.push({
                        x: finalWallX,
                        y: finalWallY,
                        width: wallWidth,
                        height: wallHeight
                    });
                    
                    // 쿨다운 설정 (2초 = 120프레임)
                    enemy.wallSpawnCooldown = 120;
                    enemy.lastWallSpawnDistance = currentDistance;
                }
                
                // 거리가 멀어지면 리셋
                if (currentDistance > spawnDistance * 1.5) {
                    enemy.lastWallSpawnDistance = Infinity;
                }
            }
            
            // 석궁 동그라미 발사체 발사 로직
            if (enemy.type === 'archer' && enemy.projectileCooldown === 0) {
                // 플레이어와의 거리 계산
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const dx = playerCenterX - enemy.x;
                const dy = playerCenterY - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // 플레이어 방향으로 발사체 발사
                    const projectileSpeed = 6;
                    const vx = (dx / distance) * projectileSpeed;
                    const vy = (dy / distance) * projectileSpeed;
                    
                    // 발사체 생성
                    this.enemyProjectiles.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx: vx,
                        vy: vy,
                        damage: 10,
                        radius: 5
                    });
                    
                    // 쿨다운 설정 (2초 = 120프레임)
                    enemy.projectileCooldown = 120;
                }
            }
            
            // 섬광 동그라미(플레이어와 거리를 두며 섬광탄을 던지는 적) 로직
            if (enemy.type === 'flash') {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const dx = playerCenterX - enemy.x;
                const dy = playerCenterY - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                const desiredMin = 180; // 너무 가까우면 멀어지기
                const desiredMax = 260; // 너무 멀면 다가가기
                
                let moveDx = 0;
                let moveDy = 0;
                
                if (distance < desiredMin) {
                    // 플레이어와 거리를 벌리기 (반대 방향으로 이동)
                    moveDx = -dx;
                    moveDy = -dy;
                } else if (distance > desiredMax) {
                    // 플레이어와 거리를 줄이기
                    moveDx = dx;
                    moveDy = dy;
                }
                
                const moveDist = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
                if (moveDist > 0) {
                    const speed = this.enemySpeed * 0.9; // 일반 적보다 약간 빠르게
                    enemy.x += (moveDx / moveDist) * speed;
                    enemy.y += (moveDy / moveDist) * speed;
                }
                
                // 섬광탄 던지기: 일정 거리 범위 안에 있을 때 쿨다운마다 1발
                const throwRangeMin = 180;
                const throwRangeMax = 320;
                if (distance >= throwRangeMin && distance <= throwRangeMax && enemy.projectileCooldown === 0) {
                    const projSpeed = 7;
                    const vx = (dx / distance) * projSpeed;
                    const vy = (dy / distance) * projSpeed;
                    
                    this.enemyProjectiles.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx,
                        vy,
                        damage: 0,      // 섬광탄은 데미지 대신 시야를 가림
                        radius: 8,
                        type: 'flash'   // 섬광탄 발사체 타입
                    });
                    
                    enemy.projectileCooldown = 180; // 3초 쿨다운 (180프레임)
                }
            }
            
            // 대포 발사체 생성 로직
            if (enemy.type === 'cannon') {
                // 대포 발사 쿨다운 감소
                if (enemy.cannonCooldown > 0) {
                    enemy.cannonCooldown--;
                }
                
                // 4초마다 발사 (240프레임)
                if (enemy.cannonCooldown === 0) {
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const dx = playerCenterX - enemy.x;
                    const dy = playerCenterY - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    // 8방향으로 제한된 각도 계산
                    let angle = Math.atan2(dy, dx);
                    const directions = 8;
                    const angleStep = (Math.PI * 2) / directions;
                    angle = Math.round(angle / angleStep) * angleStep;
                    enemy.lastAngle = angle;
                    
                    // 발사체 속도
                    const projSpeed = 8;
                    const vx = Math.cos(angle) * projSpeed;
                    const vy = Math.sin(angle) * projSpeed;
                    
                    // 대포 발사체 생성
                    this.cannonProjectiles.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx: vx,
                        vy: vy,
                        radius: 15, // 발사체 반지름
                        damage: Math.floor(Math.random() * 41) + 10 // 10~50 랜덤 대미지
                    });
                    
                    enemy.cannonCooldown = 240; // 4초 쿨다운 (240프레임)
                }
            }
            
            // 화염 동그라미(플레이어와 거리를 두며 화염 발사체를 던지는 적) 로직
            if (enemy.type === 'fire') {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const dx = playerCenterX - enemy.x;
                const dy = playerCenterY - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                const desiredMin = 180; // 너무 가까우면 멀어지기
                const desiredMax = 260; // 너무 멀면 다가가기
                
                let moveDx = 0;
                let moveDy = 0;
                
                if (distance < desiredMin) {
                    // 플레이어와 거리를 벌리기 (반대 방향으로 이동)
                    moveDx = -dx;
                    moveDy = -dy;
                } else if (distance > desiredMax) {
                    // 플레이어와 거리를 줄이기
                    moveDx = dx;
                    moveDy = dy;
                }
                
                const moveDist = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
                if (moveDist > 0) {
                    const speed = 1.5; // 속도 1.5
                    enemy.x += (moveDx / moveDist) * speed;
                    enemy.y += (moveDy / moveDist) * speed;
                }
                
                // 화염 발사체 던지기: 일정 거리 범위 안에 있을 때 쿨다운마다 1발
                const throwRangeMin = 180;
                const throwRangeMax = 320;
                if (distance >= throwRangeMin && distance <= throwRangeMax && enemy.projectileCooldown === 0) {
                    const projSpeed = 7;
                    const vx = (dx / distance) * projSpeed;
                    const vy = (dy / distance) * projSpeed;
                    
                    this.enemyProjectiles.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx,
                        vy,
                        damage: 15,      // 화염 발사체는 데미지를 줌
                        radius: 8,
                        type: 'fire'   // 화염 발사체 타입
                    });
                    
                    enemy.projectileCooldown = 300; // 5초 쿨다운 (300프레임)
                }
            }
            
            // 탱크 공격 로직
            if (enemy.type === 'tank') {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const dx = playerCenterX - enemy.x;
                const dy = playerCenterY - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                // 16방향으로 제한된 각도 계산
                let angle = Math.atan2(dy, dx);
                const directions = 16;
                const angleStep = (Math.PI * 2) / directions;
                angle = Math.round(angle / angleStep) * angleStep;
                enemy.angle = Math.round((angle + Math.PI * 2) % (Math.PI * 2) / angleStep);
                
                // 특수 공격 전 흔들림 처리
                if (enemy.isShaking) {
                    enemy.shakeTimer++;
                    const shakeIntensity = 5;
                    enemy.shakeOffset.x = (Math.random() - 0.5) * shakeIntensity * 2;
                    enemy.shakeOffset.y = (Math.random() - 0.5) * shakeIntensity * 2;
                    
                    if (enemy.shakeTimer >= 60) { // 1초 = 60프레임
                        // 특수 공격 발사
                        const specialSpeed = 12; // 빠른 공
                        const vx = Math.cos(angle) * specialSpeed;
                        const vy = Math.sin(angle) * specialSpeed;
                        
                        this.enemyProjectiles.push({
                            x: enemy.x,
                            y: enemy.y,
                            vx: vx,
                            vy: vy,
                            damage: 20,
                            radius: 10,
                            type: 'tankSpecial', // 어두운 빨강 빠른 공
                            color: '#8b0000' // 어두운 빨강
                        });
                        
                        enemy.isShaking = false;
                        enemy.shakeTimer = 0;
                        enemy.shotsFired = 0;
                        enemy.shotsToSpecial = 3 + Math.floor(Math.random() * 3); // 3~5번
                    }
                } else {
                    // 일반 공격
                    if (enemy.shootCooldown > 0) {
                        enemy.shootCooldown--;
                    }
                    
                    if (enemy.shootCooldown === 0 && enemy.shotsFired < enemy.shotsToSpecial) {
                        // 노란색 총알 발사
                        const projSpeed = 6;
                        const vx = Math.cos(angle) * projSpeed;
                        const vy = Math.sin(angle) * projSpeed;
                        
                        this.enemyProjectiles.push({
                            x: enemy.x,
                            y: enemy.y,
                            vx: vx,
                            vy: vy,
                            damage: 0, // 대미지는 직접 처리 (체력의 1/4)
                            radius: 8,
                            type: 'tank', // 탱크 총알
                            color: '#ffff00' // 노란색
                        });
                        
                        enemy.shootCooldown = 90; // 1.5초 쿨다운 (90프레임)
                        enemy.shotsFired++;
                        
                        // 발사 횟수 도달 시 흔들림 시작
                        if (enemy.shotsFired >= enemy.shotsToSpecial) {
                            enemy.isShaking = true;
                            enemy.shakeTimer = 0;
                        }
                    }
                }
                
                // 바퀴 자국 업데이트
                for (let i = enemy.trackMarks.length - 1; i >= 0; i--) {
                    enemy.trackMarks[i].life--;
                    if (enemy.trackMarks[i].life <= 0) {
                        enemy.trackMarks.splice(i, 1);
                    }
                }
            }
            
            // 다른 몬스터들과 충돌 체크 및 밀어내기
            for (let j = i + 1; j < this.enemies.length; j++) {
                const otherEnemy = this.enemies[j];
                
                const enemyDx = otherEnemy.x - enemy.x;
                const enemyDy = otherEnemy.y - enemy.y;
                const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);
                const minEnemyDistance = enemy.radius + otherEnemy.radius;
                
                if (enemyDistance < minEnemyDistance && enemyDistance > 0) {
                    // 겹침 발생 - 서로 밀어내기
                    const overlap = minEnemyDistance - enemyDistance;
                    const pushX = (enemyDx / enemyDistance) * overlap * 0.5;
                    const pushY = (enemyDy / enemyDistance) * overlap * 0.5;
                    
                    // 양쪽 몬스터를 밀어내기
                    enemy.x -= pushX;
                    enemy.y -= pushY;
                    otherEnemy.x += pushX;
                    otherEnemy.y += pushY;
                }
            }
        }
        
        // 체력이 0 이하인 블록 제거 (적이나 다른 원인으로 파괴된 블록은 인벤토리에 돌아가지 않음)
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (block.health <= 0) {
                // 블록 제거
                this.blocks.splice(i, 1);
            }
        }
        
        // 아처 발사체 업데이트
        this.updateArchers();
        this.updateArcherProjectiles();
        
        // 물총 업데이트 및 발사
        this.updateWaterGuns();
        
        // 물총 발사체 업데이트
        this.updateWaterGunProjectiles();
        
        // 물대포 타겟 업데이트
        this.updateWaterCannonTargets();
        
        // 임시 물 블럭 페이드 아웃 처리
        this.updateTemporaryBlocks();
        
        // 적 발사체 업데이트
        this.updateEnemyProjectiles();
        
        // 대포 발사체 업데이트
        this.updateCannonProjectiles();
        
        // 경험치 구슬 업데이트
        this.updateExperienceOrbs();
        
        // 경험치 파티클 업데이트
        this.updateExpParticles();
        
        // 물 파티클 업데이트
        this.updateWaterParticles();
        
        // 화염병 시스템 업데이트
        this.updateGasolineBombs();
        this.updateGasolineBombProjectiles();
        this.updateGasolineBombHitboxes();
        this.updateFireParticles();
        
        // 10스테이지 물고기 시스템
        if (this.waveNumber >= 10) {
            this.updateFishes();
        }
        
        // 보스 시스템 (5스테이지마다 중간보스, 10스테이지마다 보스)
        if (this.boss) {
            this.updateBoss();
        }
        
                    // 독 효과 업데이트
                    this.updatePoisonEffect();
                    
                    // 출혈 효과 업데이트
                    this.updateBleedingEffect();
                    
                    // 맵 도트딜 업데이트
                    this.updateMapDotDamage();
                }
    
    updateArchers() {
        // 아처, 캐틀링건, 석궁 블록 업데이트
        for (let block of this.blocks) {
            if (block.type !== '아처' && block.type !== '캐틀링건' && block.type !== '석궁' && block.type !== '강철아처') continue;
            
            // 아처 발사 쿨다운 초기화
            if (!block.attackCooldown) {
                block.attackCooldown = 0;
            }
            
            // 발사 범위 초기화
            if (!block.attackRange) {
                block.attackRange = 200; // 기본 발사 범위 (픽셀)
            }
            
            // 블록 타입에 따른 공격 범위 설정
            const blockLevel = block.level || 1;
            if (block.type === '캐틀링건') {
                // 캐틀링건: 공격 범위 넓어짐
                block.attackRange = 300;
            } else if (block.type === '석궁') {
                // 석궁: 기본 범위
                block.attackRange = 200;
            } else if (blockLevel >= 10) {
                // 만렙 아처: 공격 범위 증가
                block.attackRange = 300;
            } else {
                // 일반 모드: 기본 범위
                block.attackRange = 200;
            }
            
            // 쿨다운 감소
            if (block.attackCooldown > 0) {
                block.attackCooldown--;
            }
            
            // 아처 중심점
            const blockCenterX = block.x + this.studSize / 2;
            const blockCenterY = block.y + this.studSize / 2;
            
            // 적이 아처/캐틀링건 블록 위에 올라갔는지 확인
            let enemyOnBlock = null;
            for (let enemy of this.enemies) {
                // 캐틀링건, 석궁, 강철아처도 통과 가능하므로 '아처'로 체크
                const blockType = (block.type === '캐틀링건' || block.type === '석궁' || block.type === '강철아처') ? '아처' : block.type;
                const onBlock = this.checkEnemyOnBlock(enemy.x, enemy.y, enemy.radius, blockType);
                if (onBlock && onBlock === block) {
                    enemyOnBlock = enemy;
                    break; // 블록 위에 올라간 적을 찾으면 즉시 공격
                }
            }
            
            // 히트박스 범위 내의 적 또는 보스 찾기
            let targetEnemy = null;
            let targetBoss = null;
            let closestDistance = Infinity;
            let closestBossDistance = Infinity;
            
            // 블록 위에 적이 있으면 우선적으로 타겟팅
            if (enemyOnBlock) {
                targetEnemy = enemyOnBlock;
                const dx = enemyOnBlock.x - blockCenterX;
                const dy = enemyOnBlock.y - blockCenterY;
                closestDistance = Math.sqrt(dx * dx + dy * dy);
            }
            
                    // 히트박스 범위 내의 모든 적 찾기 (블록 위에 있든 없든, 통과 가능한 블록 위에 있어도)
                    for (let enemy of this.enemies) {
                        // 블록 위에 올라간 적은 이미 처리했으므로 건너뛰기
                        if (enemy === enemyOnBlock) continue;
                        
                        // 뱀은 아처가 공격하지 않음
                        if (enemy.type === 'snake') continue;
                
                const dx = enemy.x - blockCenterX;
                const dy = enemy.y - blockCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 히트박스 범위 내에 있는지 확인
                if (distance <= block.attackRange) {
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        targetEnemy = enemy;
                    }
                }
            }
            
            // 보스가 있으면 보스도 타겟팅 대상에 추가
            if (this.boss) {
                const bossDx = this.boss.x - blockCenterX;
                const bossDy = this.boss.y - blockCenterY;
                const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
                
                // 히트박스 범위 내에 있는지 확인
                if (bossDistance <= block.attackRange) {
                    closestBossDistance = bossDistance;
                    targetBoss = this.boss;
                }
            }
            
            // 물고기 타겟팅 (아처/캐틀링건/석궁/강철아처만, 가시는 제외)
            let targetFish = null;
            let closestFishDistance = Infinity;
            if (block.type === '아처' || block.type === '캐틀링건' || block.type === '석궁' || block.type === '강철아처') {
                for (let fish of this.fishes) {
                    const fishDx = fish.x - blockCenterX;
                    const fishDy = fish.y - blockCenterY;
                    const fishDistance = Math.sqrt(fishDx * fishDx + fishDy * fishDy);
                    
                    // 히트박스 범위 내에 있는지 확인
                    if (fishDistance <= block.attackRange) {
                        if (fishDistance < closestFishDistance) {
                            closestFishDistance = fishDistance;
                            targetFish = fish;
                        }
                    }
                }
            }
            
            // 타겟 결정 (적이 우선, 없으면 보스, 없으면 물고기)
            let finalTarget = targetEnemy;
            if (!finalTarget && targetBoss) {
                finalTarget = targetBoss;
                closestDistance = closestBossDistance;
            }
            if (!finalTarget && targetFish) {
                finalTarget = targetFish;
                closestDistance = closestFishDistance;
            }
            
            // 타겟이 있고 쿨다운이 끝났으면 발사 (블록 위에 올라간 적은 쿨다운 무시하고 즉시 공격)
            if (finalTarget && (block.attackCooldown === 0 || enemyOnBlock)) {
                let targetX = finalTarget.x;
                let targetY = finalTarget.y;
                
                // 물고기 타겟일 때는 물고기의 이동 방향을 고려한 예측 위치 사용
                if (finalTarget === targetFish) {
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const fishToPlayerDx = playerCenterX - targetFish.x;
                    const fishToPlayerDy = playerCenterY - targetFish.y;
                    const fishToPlayerDist = Math.sqrt(fishToPlayerDx * fishToPlayerDx + fishToPlayerDy * fishToPlayerDy);
                    
                    if (fishToPlayerDist > 0) {
                        // 물고기가 플레이어를 향해 이동하므로, 발사체가 도달할 시간 동안 물고기가 이동할 거리를 예측
                        const projectileSpeed = 12;
                        const estimatedTime = Math.sqrt((targetX - blockCenterX) ** 2 + (targetY - blockCenterY) ** 2) / projectileSpeed;
                        const fishMoveX = (fishToPlayerDx / fishToPlayerDist) * targetFish.speed * estimatedTime;
                        const fishMoveY = (fishToPlayerDy / fishToPlayerDist) * targetFish.speed * estimatedTime;
                        targetX += fishMoveX;
                        targetY += fishMoveY;
                    }
                }
                
                const dx = targetX - blockCenterX;
                const dy = targetY - blockCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // 발사체 속도 (물고기 타겟일 때는 더 빠르게)
                    let projectileSpeed = 8;
                    if (finalTarget === targetFish) {
                        projectileSpeed = 12; // 물고기는 빠르게 움직이므로 발사체도 더 빠르게
                    }
                    const vx = (dx / distance) * projectileSpeed;
                    const vy = (dy / distance) * projectileSpeed;
                    
                    // 블록 타입에 따른 능력치 설정
                    const blockLevel = block.level || 1;
                    const isGatling = block.type === '캐틀링건';
                    const isCrossbow = block.type === '석궁';
                    const isSteelArcher = block.type === '강철아처';
                    
                    // 데미지 계산
                    let damage = 10;
                    if (isGatling) {
                        // 캐틀링건: 데미지 작아짐
                        damage = 1;
                    } else if (isCrossbow) {
                        // 석궁: 데미지 15
                        damage = 15;
                    } else if (isSteelArcher) {
                        // 강철아처: 높은 데미지 (30)
                        damage = 30;
                    } else if (blockLevel >= 10) {
                        // 만렙 석궁: 데미지 증가
                        damage = 50;
                    }
                    
                    // 석궁은 한 발에 총알 3개 발사
                    if (isCrossbow) {
                        // 총알 3개를 약간씩 다른 각도로 발사
                        const spreadAngle = Math.PI / 12; // 15도 스프레드
                        for (let i = 0; i < 3; i++) {
                            const angleOffset = (i - 1) * spreadAngle; // -15도, 0도, +15도
                            const angle = Math.atan2(dy, dx) + angleOffset;
                            const spreadVx = Math.cos(angle) * projectileSpeed;
                            const spreadVy = Math.sin(angle) * projectileSpeed;
                            
                            this.archerProjectiles.push({
                                x: blockCenterX,
                                y: blockCenterY,
                                vx: spreadVx,
                                vy: spreadVy,
                                damage: damage,
                                radius: 5
                            });
                        }
                    } else {
                        // 발사체 생성 (아처/캐틀링건 중심에서)
                        this.archerProjectiles.push({
                            x: blockCenterX,
                            y: blockCenterY,
                            vx: vx,
                            vy: vy,
                            damage: damage,
                            radius: 5
                        });
                    }
                    
                    // 쿨다운 설정
                    let baseCooldown = 120; // 기본 2초
                    
                    if (isGatling) {
                        // 캐틀링건: 공격 속도 매우 빠름 (0.1초 = 6프레임)
                        baseCooldown = 6;
                    } else if (isSteelArcher) {
                        // 강철아처: 공격 속도 느림 (4초 = 240프레임)
                        baseCooldown = 240;
                    } else if (isCrossbow) {
                        // 석궁: 기본 쿨다운 (2초 = 120프레임)
                        baseCooldown = 120;
                    } else if (blockLevel >= 10) {
                        // 만렙 아처: 공격 속도 느림 (3초 = 180프레임)
                        baseCooldown = 180;
                    } else {
                        // 일반 모드: 6스테이지부터 1.5배 빠르게, 레벨당 10% 감소
                        const waveCooldown = this.waveNumber >= 6 ? Math.floor(baseCooldown / 1.5) : baseCooldown;
                        const levelMultiplier = Math.max(0.5, 1 - (blockLevel - 1) * 0.1); // 최소 50%까지 감소
                        baseCooldown = Math.floor(waveCooldown * levelMultiplier);
                    }
                    
                    block.attackCooldown = baseCooldown;
                }
            }
        }
    }
    
    updateExperienceOrbs() {
        // 경험치 구슬 업데이트
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const playerRadius = Math.max(this.player.width, this.player.height) / 2;
        
        for (let i = this.experienceOrbs.length - 1; i >= 0; i--) {
            const orb = this.experienceOrbs[i];
            
            if (orb.collected) {
                // 수집된 구슬 제거
                this.experienceOrbs.splice(i, 1);
                continue;
            }
            
            // 플레이어와의 거리 계산
            const dx = playerCenterX - orb.x;
            const dy = playerCenterY - orb.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 플레이어와 충돌 체크
            if (distance < playerRadius + orb.radius) {
                // 경험치 획득
                this.experience += orb.expValue;
                
                // 보스 구슬(초록 구슬)을 먹으면 체력 50 회복
                if (orb.isBossOrb) {
                    // 최대 체력 계산 (업그레이드 반영)
                    const maxHealth = 100 + (this.playerUpgrades.health.level - 1) * 10;
                    this.health = Math.min(this.health + 50, maxHealth); // 체력 50 회복 (최대치 초과 불가)
                    this.updateHealthDisplay();
                }
                
                // 독 효과 경험치 구슬을 먹으면 독 효과 적용 (2 대미지를 1 대미지씩 2번)
                if (orb.isPoisonOrb) {
                    this.poisonEffect.active = true;
                    this.poisonEffect.damage = 2; // 총 2 데미지
                    this.poisonEffect.initialDamage = 2; // 초기 데미지 (뱀 독 구분용)
                    this.poisonEffect.timer = 0; // 타이머 초기화
                }
                
                // 파티클 효과 생성 (캐릭터 중앙에서)
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                this.createExpParticles(playerCenterX, playerCenterY);
                
                orb.collected = true;
                continue;
            }
            
            // 플레이어가 근처에 있으면 자석 효과 (거리에 따라 속도 증가)
            const magnetRange = 200; // 자석 효과 범위
            if (distance < magnetRange && distance > 0) {
                // 거리가 가까울수록 속도 증가 (최대 속도는 거리 0일 때)
                const magnetStrength = 1 - (distance / magnetRange); // 0 (멀 때) ~ 1 (가까울 때)
                const baseSpeed = 2; // 기본 속도
                const maxSpeed = 10; // 최대 속도
                const speed = baseSpeed + (maxSpeed - baseSpeed) * magnetStrength;
                
                // 플레이어 방향으로 이동
                const dirX = dx / distance;
                const dirY = dy / distance;
                orb.x += dirX * speed;
                orb.y += dirY * speed;
            }
        }
    }
    
    createExpParticles(x, y) {
        // 경험치 획득 파티클 생성 (파란 불꽃 효과)
        const particleCount = 8; // 파티클 개수
        
        for (let i = 0; i < particleCount; i++) {
            // 랜덤 각도
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            // 랜덤 속도
            const speed = 2 + Math.random() * 3;
            
            this.expParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20, // 생명력 (프레임)
                maxLife: 20,
                size: 4 + Math.random() * 3 // 크기
            });
        }
    }
    
    updateExpParticles() {
        // 경험치 파티클 업데이트
        for (let i = this.expParticles.length - 1; i >= 0; i--) {
            const particle = this.expParticles[i];
            
            // 생명력 감소
            particle.life--;
            
            // 생명력이 0이면 제거
            if (particle.life <= 0) {
                this.expParticles.splice(i, 1);
                continue;
            }
            
            // 위치 업데이트
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 속도 감소 (저항)
            particle.vx *= 0.95;
            particle.vy *= 0.95;
        }
    }
    
    updateFishes() {
        // 물고기 업데이트
        for (let i = this.fishes.length - 1; i >= 0; i--) {
            const fish = this.fishes[i];
            
            // 하늘색 물고기는 플레이어 속도를 모방
            if (fish.type === 'skyBlue') {
                fish.speed = this.player.speed;
            }
            
            // 플레이어를 향해 이동
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const dx = playerCenterX - fish.x;
            const dy = playerCenterY - fish.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const dirX = dx / distance;
                const dirY = dy / distance;
                fish.x += dirX * fish.speed;
                fish.y += dirY * fish.speed;
            }
            
            // 화면 밖으로 나가면 제거
            if (fish.x < -fish.size || fish.x > this.canvas.width + fish.size ||
                fish.y < -fish.size || fish.y > this.canvas.height + fish.size) {
                this.fishes.splice(i, 1);
                continue;
            }
            
            // 플레이어와 충돌 체크
            const playerRadius = Math.max(this.player.width, this.player.height) / 2;
            const fishRadius = fish.size / 2;
            if (distance < playerRadius + fishRadius) {
                this.handleFishCollision(fish, i);
            }
        }
    }
    
    handleFishCollision(fish, index) {
        if (fish.type === 'purple') {
            // 보라 물고기: 대미지 없음, 닿으면 15 대미지 받을 때까지 2 대미지씩
            if (!fish.damageDealt) {
                fish.damageDealt = 0;
            }
            if (fish.damageDealt < 15) {
                const damage = Math.min(2, 15 - fish.damageDealt);
                this.health -= damage;
                if (this.health < 0) this.health = 0;
                fish.damageDealt += damage;
                
                this.playerHitColorTimer = 10;
                this.updateHealthDisplay();
                
                if (fish.damageDealt >= 15) {
                    this.fishes.splice(index, 1);
                }
            }
        } else if (fish.type === 'explosive') {
            // 폭발 물고기: 플레이어와 주위 블록에 50 대미지
            this.health -= 50;
            if (this.health < 0) this.health = 0;
            
            // 주위 블록에 50 대미지
            const explosionRadius = 100;
            for (let block of this.blocks) {
                const blockCenterX = block.x + this.studSize / 2;
                const blockCenterY = block.y + this.studSize / 2;
                const dx = blockCenterX - fish.x;
                const dy = blockCenterY - fish.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < explosionRadius) {
                    block.health -= 50;
                    if (block.health <= 0) {
                        // 블록 제거는 다른 곳에서 처리
                    }
                }
            }
            
            this.playerHitColorTimer = 10;
            this.updateHealthDisplay();
            this.fishes.splice(index, 1);
            
            if (this.health <= 0 && !this.gameOver) {
                this.monsterName = '폭발 물고기';
                this.saveGameState(); // 게임 상태 저장
                this.gameOver = true;
            }
        } else if (fish.type === 'skyBlue') {
            // 하늘색 물고기: 플레이어만 공격, 블록에는 대미지 없음
            const damage = 10; // 기본 공격력
            this.health -= damage;
            if (this.health < 0) this.health = 0;
            
            // 물고기 체력 감소
            fish.health -= 1;
            if (fish.health <= 0) {
                this.fishes.splice(index, 1);
            }
            
            this.playerHitColorTimer = 10;
            this.updateHealthDisplay();
            
            if (this.health <= 0 && !this.gameOver) {
                this.monsterName = '하늘색 물고기';
                this.saveGameState(); // 게임 상태 저장
                this.gameOver = true;
            }
        } else {
            // 일반 물고기 (연한 빨강, 회색): 기본 공격
            const damage = 10; // 기본 공격력
            this.health -= damage;
            if (this.health < 0) this.health = 0;
            
            // 물고기 체력 감소
            fish.health -= 1;
            if (fish.health <= 0) {
                this.fishes.splice(index, 1);
            }
            
            this.playerHitColorTimer = 10;
            this.updateHealthDisplay();
            
            if (this.health <= 0 && !this.gameOver) {
                this.monsterName = '물고기';
                this.saveGameState(); // 게임 상태 저장
                this.gameOver = true;
            }
        }
    }
    
    spawnBossFish() {
        if (!this.boss) return;
        
        // 물고기 타입 랜덤 선택 (회색 물고기는 2마리씩 소환)
        const types = ['lightRed', 'purple', 'gray', 'explosive', 'skyBlue'];
        const weights = [0.35, 0.25, 0.2, 0.1, 0.1]; // 확률 가중치
        const rand = Math.random();
        let type = 'lightRed';
        let cumulative = 0;
        for (let i = 0; i < types.length; i++) {
            cumulative += weights[i];
            if (rand < cumulative) {
                type = types[i];
                break;
            }
        }
        
        // 회색 물고기는 2마리씩 소환, 나머지는 1마리씩
        const spawnCount = type === 'gray' ? 2 : 1;
        const guns = [this.boss.leftGun, this.boss.rightGun];
        
        for (let i = 0; i < spawnCount; i++) {
            const gun = guns[i % guns.length];
            const gunCenterX = gun.x + gun.width / 2;
            const gunCenterY = gun.y + gun.height / 2;
            
            let fish = {
                x: gunCenterX,
                y: gunCenterY,
                type: type,
                size: 12, // 작은 네모 크기
                health: 1,
                maxHealth: 1,
                speed: 2,
                damageDealt: 0
            };
            
            // 타입별 설정
            if (type === 'lightRed') {
                // 연한 빨강: 체력 1~10, 속도 랜덤
                fish.health = Math.floor(Math.random() * 10) + 1;
                fish.maxHealth = fish.health;
                fish.speed = 1 + Math.random() * 3; // 1~4 속도
            } else if (type === 'purple') {
                // 보라: 체력 1~10, 속도 랜덤
                fish.health = Math.floor(Math.random() * 10) + 1;
                fish.maxHealth = fish.health;
                fish.speed = 1 + Math.random() * 3; // 1~4 속도
            } else if (type === 'gray') {
                // 회색: 체력 10~15, 느린 속도 고정
                fish.health = Math.floor(Math.random() * 6) + 10; // 10~15
                fish.maxHealth = fish.health;
                fish.speed = 1; // 느린 속도 고정
            } else if (type === 'explosive') {
                // 폭발 물고기: 빠른 속도 고정
                fish.health = 1;
                fish.maxHealth = 1;
                fish.speed = 5; // 빠른 속도 고정
            } else if (type === 'skyBlue') {
                // 하늘색 물고기: 체력 20, 크기 큰 편, 속도는 플레이어와 동일
                fish.health = 20;
                fish.maxHealth = 20;
                fish.size = 18; // 조금 큰 편
                fish.speed = this.player.speed; // 플레이어 속도와 동일
            }
            
            this.fishes.push(fish);
        }
    }
    
    spawnBoss(isFinalBoss, options = {}) {
        const { disableFishSpawn = false } = options;
        // 보스 생성 (적 소환 창에서 호출 시 웨이브 제한 없음)
        if (isFinalBoss) {
            const bossId = Date.now() + Math.random();
            
            // 화면 밖에서 랜덤하게 생성 (4방향 중 하나)
            let bossX, bossY;
            const side = Math.floor(Math.random() * 4); // 0: 위, 1: 오른쪽, 2: 아래, 3: 왼쪽
            const bossRadius = 60;
            
            if (side === 0) {
                // 위쪽
                bossX = Math.random() * this.canvas.width;
                bossY = -bossRadius;
            } else if (side === 1) {
                // 오른쪽
                bossX = this.canvas.width + bossRadius;
                bossY = Math.random() * this.canvas.height;
            } else if (side === 2) {
                // 아래쪽
                bossX = Math.random() * this.canvas.width;
                bossY = this.canvas.height + bossRadius;
            } else {
                // 왼쪽
                bossX = -bossRadius;
                bossY = Math.random() * this.canvas.height;
            }
            
            this.boss = {
                id: bossId,
                x: bossX,
                y: bossY,
                radius: bossRadius, // 큰 동그라미
                health: 500,
                maxHealth: 500,
                speed: 0.3, // 매우 느림
                attackRange: 300, // 원거리 공격 범위
                attackCooldown: 0,
                touchCooldown: 0, // 플레이어와 닿았을 때 쿨다운
                spikeDamageCooldown: 0, // 가시 데미지 쿨다운
                fishSpawnCooldown: disableFishSpawn ? -1 : 0, // 물고기 소환 쿨다운 (-1이면 비활성화)
                disableFishSpawn: disableFishSpawn,
                leftGun: { x: 0, y: 0, width: 15, height: 40 }, // 왼쪽 회색 네모
                rightGun: { x: 0, y: 0, width: 15, height: 40 } // 오른쪽 회색 네모
            };
            
            // 총 위치 업데이트
            this.updateBossGuns();
        }
    }
    
    updateBossGuns() {
        if (!this.boss) return;
        
        // 플레이어 위치
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        // 보스에서 플레이어로의 각도
        const dx = playerCenterX - this.boss.x;
        const dy = playerCenterY - this.boss.y;
        const angle = Math.atan2(dy, dx);
        
        // 총의 거리와 각도 (보스 중심에서 약간 떨어진 위치)
        const gunDistance = this.boss.radius + 5;
        
        // 왼쪽 총 위치 (각도에서 약간 왼쪽)
        const leftAngle = angle - Math.PI / 6; // 30도 왼쪽
        this.boss.leftGun.x = this.boss.x + Math.cos(leftAngle) * gunDistance - this.boss.leftGun.width / 2;
        this.boss.leftGun.y = this.boss.y + Math.sin(leftAngle) * gunDistance - this.boss.leftGun.height / 2;
        
        // 오른쪽 총 위치 (각도에서 약간 오른쪽)
        const rightAngle = angle + Math.PI / 6; // 30도 오른쪽
        this.boss.rightGun.x = this.boss.x + Math.cos(rightAngle) * gunDistance - this.boss.rightGun.width / 2;
        this.boss.rightGun.y = this.boss.y + Math.sin(rightAngle) * gunDistance - this.boss.rightGun.height / 2;
    }
    
    updateBoss() {
        if (!this.boss) return;
        
        // 심연블럭 위에 있는지 체크
        const bossCenterX = this.boss.x;
        const bossCenterY = this.boss.y;
        let onAbyssBlock = false;
        for (let block of this.blocks) {
            const blockSize = this.studSize;
            if (bossCenterX >= block.x && bossCenterX <= block.x + blockSize &&
                bossCenterY >= block.y && bossCenterY <= block.y + blockSize) {
                if (block.type === '심연블럭') {
                    onAbyssBlock = true;
                }
                break;
            }
        }
        
        // 심연블럭 효과 적용
        if (onAbyssBlock) {
            // 중간 보스(워터밤) 처리
            if (!this.boss.abyssRespawned) {
                this.boss.abyssRespawned = true;
                // 최대체력의 반이 깎인 상태로 위에서 다시 튀어나옴
                const maxHealth = this.boss.maxHealth || 500;
                this.boss.health = Math.floor(maxHealth / 2);
                this.boss.maxHealth = maxHealth;
                // 위에서 다시 튀어나옴
                this.boss.x = Math.random() * this.canvas.width;
                this.boss.y = -this.boss.radius;
                // 3초 무적 (180프레임)
                this.boss.invincibleTimer = 180;
            }
            // 무적 중에는 이동 정상
            if (this.boss.invincibleTimer > 0) {
                this.boss.invincibleTimer--;
            }
        } else {
            // 심연블럭 밖으로 나가면 리셋
            if (this.boss.abyssRespawned) {
                this.boss.abyssRespawned = false;
            }
        }
        
        // 보스 이동 (플레이어를 향해 매우 느리게)
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const dx = playerCenterX - this.boss.x;
        const dy = playerCenterY - this.boss.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // 이동 전 위치 저장
            const oldX = this.boss.x;
            const oldY = this.boss.y;
            
            // 이동 시도
            this.boss.x += dirX * this.boss.speed;
            this.boss.y += dirY * this.boss.speed;
            
            // 심연블럭과 충돌 체크
            const bossCenterX = this.boss.x;
            const bossCenterY = this.boss.y;
            let onAbyssBlock = false;
            for (let block of this.blocks) {
                const blockSize = this.studSize;
                if (bossCenterX >= block.x && bossCenterX <= block.x + blockSize &&
                    bossCenterY >= block.y && bossCenterY <= block.y + blockSize) {
                    if (block.type === '심연블럭') {
                        onAbyssBlock = true;
                        break;
                    }
                }
            }
            
            // 심연블럭에 들어가려고 하면 원래 위치로 되돌림
            if (onAbyssBlock) {
                this.boss.x = oldX;
                this.boss.y = oldY;
            }
            
            // 총 위치 업데이트
            this.updateBossGuns();
        }
        
        // 공격 쿨다운 감소
        if (this.boss.attackCooldown > 0) {
            this.boss.attackCooldown--;
        }
        
        // 플레이어와 닿았을 때 쿨다운 감소
        if (this.boss.touchCooldown > 0) {
            this.boss.touchCooldown--;
        }
        
        // 가시 데미지 쿨다운 감소
        if (!this.boss.spikeDamageCooldown) {
            this.boss.spikeDamageCooldown = 0;
        }
        if (this.boss.spikeDamageCooldown > 0) {
            this.boss.spikeDamageCooldown--;
        }
        
        // 물고기 소환 쿨다운 감소
        if (!this.boss.disableFishSpawn) {
            if (this.boss.fishSpawnCooldown > 0) {
                this.boss.fishSpawnCooldown--;
            }
            
            // 5초마다 물고기 소환
            if (this.boss.fishSpawnCooldown === 0) {
                this.spawnBossFish();
                this.boss.fishSpawnCooldown = 5 * 60; // 5초
            }
        }
        
        // 가시 블록과의 충돌 체크 및 데미지
        const spikeBlock = this.checkEnemySpikeCollision(this.boss.x, this.boss.y, this.boss.radius);
        if (spikeBlock && this.boss.spikeDamageCooldown === 0) {
            // 가시 블록 대미지
            const damage = 50; // 가시 대미지 50
            
            this.boss.health -= damage;
            if (this.boss.health < 0) {
                this.boss.health = 0;
            }
            
            this.boss.spikeDamageCooldown = 60; // 1초 쿨다운
            
            // 보스 체력이 0 이하가 되면 게임 승리
            if (this.boss.health <= 0 && !this.gameOver) {
                this.saveGameState(); // 게임 상태 저장
                this.gameOver = true;
            }
        }
        
        // 보스와 플레이어 충돌 체크
        if (this.boss.touchCooldown === 0) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const bossDx = playerCenterX - this.boss.x;
            const bossDy = playerCenterY - this.boss.y;
            const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
            
            if (bossDistance < this.boss.radius + Math.max(this.player.width, this.player.height) / 2) {
                // 플레이어 체력을 절반으로 감소
                this.health = Math.floor(this.health / 2);
                if (this.health < 0) this.health = 0;
                
                // 피격 색상 적용
                this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                
                // UI 업데이트
                this.updateHealthDisplay();
                
                // 쿨다운 설정 (1초)
                this.boss.touchCooldown = 60;
                
                // 체력이 0이 되면 게임 오버
                if (this.health <= 0 && !this.gameOver) {
                    this.monsterName = '워터밤';
                    this.saveGameState(); // 게임 상태 저장
                    this.gameOver = true;
                }
            }
        }
        
        // 스킬 1: 플레이어가 물고기에 맞았을 때 보라색 물고기 발사
        if (this.hitByFish && this.boss.attackCooldown === 0) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            
            // 양쪽 총에서 발사
            const guns = [this.boss.leftGun, this.boss.rightGun];
            for (let gun of guns) {
                const gunCenterX = gun.x + gun.width / 2;
                const gunCenterY = gun.y + gun.height / 2;
                
                const projDx = playerCenterX - gunCenterX;
                const projDy = playerCenterY - gunCenterY;
                const projDistance = Math.sqrt(projDx * projDx + projDy * projDy);
                
                if (projDistance > 0) {
                    const projSpeed = 5;
                    const vx = (projDx / projDistance) * projSpeed;
                    const vy = (projDy / projDistance) * projSpeed;
                    
                    this.bossProjectiles.push({
                        x: gunCenterX,
                        y: gunCenterY,
                        vx: vx,
                        vy: vy,
                        damage: 10,
                        isPoison: true,
                        radius: 8,
                        color: '#8b00ff' // 보라색
                    });
                }
            }
            
            this.boss.attackCooldown = 120; // 2초 쿨다운
            this.hitByFish = false; // 한 번만 발사
        }
        
        // 보스 발사체 업데이트
        for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.bossProjectiles[i];
            
            // 발사체 이동
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            // 화면 밖으로 나가면 제거
            if (projectile.x < 0 || projectile.x > this.canvas.width ||
                projectile.y < 0 || projectile.y > this.canvas.height) {
                this.bossProjectiles.splice(i, 1);
                continue;
            }
            
            // 플레이어와 충돌 체크
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const pDx = projectile.x - playerCenterX;
            const pDy = projectile.y - playerCenterY;
            const pDistance = Math.sqrt(pDx * pDx + pDy * pDy);
            
            const playerRadius = Math.max(this.player.width, this.player.height) / 2;
            if (pDistance < playerRadius + projectile.radius) {
                // 플레이어에게 데미지
                this.health -= projectile.damage;
                if (this.health < 0) this.health = 0;
                
                // 피격 색상 적용
                this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                
                // 독 효과 적용
                if (projectile.isPoison) {
                    this.poisonEffect.active = true;
                    this.poisonEffect.damage = 15; // 총 15데미지
                    this.poisonEffect.initialDamage = 15; // 초기 데미지 (보스 독 구분용)
                    this.poisonEffect.timer = 0; // 타이머 초기화
                }
                
                // UI 업데이트
                this.updateHealthDisplay();
                
                // 발사체 제거
                this.bossProjectiles.splice(i, 1);
                
                // 체력이 0이 되면 게임 오버
                if (this.health <= 0 && !this.gameOver) {
                    this.monsterName = '워터밤';
                    this.saveGameState(); // 게임 상태 저장
                    this.gameOver = true;
                }
            }
        }
        
        // 보스 체력이 0이 되면 제거
        if (this.boss && this.boss.health <= 0) {
            // 초록색 큰 경험치 구슬 생성 (500 경험치)
            this.experienceOrbs.push({
                x: this.boss.x,
                y: this.boss.y,
                expValue: 500,
                radius: 20, // 큰 구슬 반지름
                collected: false,
                isBossOrb: true // 보스 구슬 여부
            });
            
            // 워터밤을 죽였는지 표시
            if (this.waveNumber === 10) {
                this.bossKilled = true;
                this.defeatedBosses.add(10); // 워터밤 (10스테이지)
            }
            
            this.boss = null;
            // 10스테이지일 때 보스를 죽이면 웨이브 종료
            if (this.waveNumber === 10) {
                this.endWave();
            }
        }
    }
    
    updateMapDotDamage() {
        // 맵 도트딜 업데이트 (0.2초마다 1데미지씩 총 20데미지)
        if (!this.mapDotDamage.active) return;
        
        this.mapDotDamage.timer++;
        if (this.mapDotDamage.timer >= this.mapDotDamage.interval) {
            // 0.2초마다 1데미지
            this.health -= 1;
            if (this.health < 0) this.health = 0;
            this.updateHealthDisplay();
            
            this.mapDotDamage.damage += 1;
            this.mapDotDamage.timer = 0;
            
            // 총 20데미지에 도달하면 비활성화
            if (this.mapDotDamage.damage >= this.mapDotDamage.totalDamage) {
                this.mapDotDamage.active = false;
                this.mapDotDamage.damage = 0;
                this.mapDotDamage.timer = 0;
            }
            
            // 체력이 0이 되면 게임 오버
            if (this.health <= 0 && !this.gameOver) {
                // 맵 독으로 죽었는지 표시
                this.diedFromPoison = true;
                this.saveGameState(); // 게임 상태 저장
                this.gameOver = true;
            }
        }
    }
    
    updatePoisonEffect() {
        if (!this.poisonEffect.active) return;
        
        // 독 효과는 1초마다 데미지 (60프레임 = 1초)
        // 뱀 독: 1 데미지씩 20번 = 20 데미지
        // 보스 독: 5 데미지씩 3번 = 15 데미지
        // 독 경험치 구슬 독: 1 데미지씩 2번 = 2 데미지
        this.poisonEffect.timer++;
        if (this.poisonEffect.timer >= 60) {
            // 뱀 독인지 보스 독인지 독 경험치 구슬 독인지 확인 (initialDamage로 구분)
            let damagePerTick = 1;
            if (this.poisonEffect.initialDamage === 20) {
                damagePerTick = 1; // 뱀 독
            } else if (this.poisonEffect.initialDamage === 15) {
                damagePerTick = 5; // 보스 독
            } else if (this.poisonEffect.initialDamage === 2) {
                damagePerTick = 1; // 독 경험치 구슬 독
            }
            
            this.health -= damagePerTick;
            if (this.health < 0) this.health = 0;
            
            this.poisonEffect.damage -= damagePerTick;
            this.poisonEffect.timer = 0;
            
            // UI 업데이트
            this.updateHealthDisplay();
            
            // 독 효과가 모두 소진되면 비활성화
            if (this.poisonEffect.damage <= 0) {
                this.poisonEffect.active = false;
                this.poisonEffect.damage = 0;
                this.poisonEffect.initialDamage = 0;
                this.poisonEffect.timer = 0;
            }
            
            // 체력이 0이 되면 게임 오버
            if (this.health <= 0 && !this.gameOver) {
                // 어떤 독으로 죽었는지에 따라 몬스터 이름 설정
                if (this.poisonEffect.initialDamage === 20) {
                    // 뱀/독뱀 독
                    this.monsterName = '독 뱀';
                } else if (this.poisonEffect.initialDamage === 15) {
                    // 보스 독
                    this.monsterName = '워터밤';
                }
                
                // 독으로 죽었는지 표시
                this.diedFromPoison = true;
                this.saveGameState(); // 게임 상태 저장
                this.gameOver = true;
            }
        }
    }
    
    updateBleedingEffect() {
        if (!this.bleedingEffect.active) return;
        
        // 출혈 효과는 1초마다 2대미지씩 (60프레임 = 1초)
        // 총 15대미지까지 (2대미지씩 7번 + 1대미지 1번 = 15대미지)
        this.bleedingEffect.timer++;
        if (this.bleedingEffect.timer >= 60) {
            const damagePerTick = 2; // 2대미지씩
            const actualDamage = Math.min(damagePerTick, this.bleedingEffect.damage); // 남은 대미지만큼만
            
            this.health -= actualDamage;
            if (this.health < 0) this.health = 0;
            
            this.bleedingEffect.damage -= actualDamage;
            this.bleedingEffect.timer = 0;
            
            // 출혈 파티클 생성 (플레이어 가운데에서)
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            for (let i = 0; i < 5; i++) {
                this.bleedingEffect.particles.push({
                    x: playerCenterX,
                    y: playerCenterY,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 30,
                    maxLife: 30
                });
            }
            
            // UI 업데이트
            this.updateHealthDisplay();
            
            // 출혈 효과가 모두 소진되면 비활성화
            if (this.bleedingEffect.damage <= 0) {
                this.bleedingEffect.active = false;
                this.bleedingEffect.damage = 0;
                this.bleedingEffect.timer = 0;
            }
            
            // 체력이 0이 되면 게임 오버
            if (this.health <= 0 && !this.gameOver) {
                this.monsterName = '기사';
                this.diedFromBleeding = true; // 출혈로 죽음
                this.saveGameState();
                this.gameOver = true;
            }
        }
        
        // 출혈 파티클 업데이트
        for (let i = this.bleedingEffect.particles.length - 1; i >= 0; i--) {
            const particle = this.bleedingEffect.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.bleedingEffect.particles.splice(i, 1);
            }
        }
    }
    
    updateWaterGuns() {
        // 물총 및 물대포 블록 업데이트 및 발사
        for (let block of this.blocks) {
            if (block.type === '물대포') {
                // 물대포 업데이트
                if (!block.attackCooldown) {
                    block.attackCooldown = 0;
                }
                
                // 쿨다운 감소
                if (block.attackCooldown > 0) {
                    block.attackCooldown--;
                }
                
                // 쿨다운이 끝났으면 타겟 찾기 및 사격
                if (block.attackCooldown === 0) {
                    // 맵의 모든 곳 중 가장 주변에 적이 많이 있는 곳 찾기
                    let bestTarget = null;
                    let maxEnemyCount = 0;
                    const checkRadius = 100; // 체크 반경
                    const hitboxRadius = 150; // 히트박스 반경
                    
                    // 맵을 그리드로 나누어 체크
                    for (let gridY = 0; gridY < this.gridHeight; gridY++) {
                        for (let gridX = 0; gridX < this.gridWidth; gridX++) {
                            const checkX = gridX * this.studSize + this.studSize / 2;
                            const checkY = gridY * this.studSize + this.studSize / 2;
                            
                            // 이 위치 주변의 적 개수 세기
                            let enemyCount = 0;
                            for (let enemy of this.enemies) {
                                let enemyX, enemyY;
                                
                                // 뱀은 머리 위치 사용
                                if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                                    if (enemy.segments && enemy.segments.length > 0) {
                                        enemyX = enemy.segments[0].x;
                                        enemyY = enemy.segments[0].y;
                                    } else {
                                        continue;
                                    }
                                } else {
                                    enemyX = enemy.x;
                                    enemyY = enemy.y;
                                }
                                
                                const dx = enemyX - checkX;
                                const dy = enemyY - checkY;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                if (distance <= checkRadius) {
                                    enemyCount++;
                                }
                            }
                            
                            // 보스도 체크
                            if (this.boss) {
                                const bossDx = this.boss.x - checkX;
                                const bossDy = this.boss.y - checkY;
                                const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
                                if (bossDistance <= checkRadius) {
                                    enemyCount++;
                                }
                            }
                            
                            // 가장 많은 적이 있는 곳 선택
                            if (enemyCount > maxEnemyCount) {
                                maxEnemyCount = enemyCount;
                                bestTarget = { x: checkX, y: checkY };
                            }
                        }
                    }
                    
                    // 타겟이 있으면 사격 준비
                    if (bestTarget && maxEnemyCount > 0) {
                        // 타겟 위치에 빨간색 히트박스 표시를 위한 타겟 추가
                        this.waterCannonTargets.push({
                            x: bestTarget.x,
                            y: bestTarget.y,
                            hitboxRadius: hitboxRadius,
                            damage: 250,
                            timer: 60, // 1초 후 사격 (60프레임)
                            fadeOut: false,
                            fadeOutTimer: 0,
                            isTemporary: true // 임시 물 블럭 생성용
                        });
                        
                        block.attackCooldown = 600; // 10초 쿨타임 (600프레임)
                    }
                }
                continue;
            }
            
            if (block.type !== '물총') continue;
            
            // 발사 쿨다운 초기화
            if (!block.attackCooldown) {
                block.attackCooldown = 0;
            }
            
            // 발사 범위 초기화
            if (!block.attackRange) {
                block.attackRange = 300; // 넓은 사거리
            }
            
            // 쿨다운 감소
            if (block.attackCooldown > 0) {
                block.attackCooldown--;
            }
            
            // 물총 중심점
            const blockCenterX = block.x + this.studSize / 2;
            const blockCenterY = block.y + this.studSize / 2;
            
            // 히트박스 범위 내의 적 찾기
            let targetEnemy = null;
            let closestDistance = Infinity;
            
            for (let enemy of this.enemies) {
                // 뱀은 세그먼트별로 체크
                if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                    // 뱀의 머리(첫 번째 세그먼트)를 타겟으로
                    if (enemy.segments && enemy.segments.length > 0) {
                        const head = enemy.segments[0];
                        const dx = head.x - blockCenterX;
                        const dy = head.y - blockCenterY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance <= block.attackRange && distance < closestDistance) {
                            closestDistance = distance;
                            targetEnemy = { x: head.x, y: head.y }; // 뱀 머리 위치
                        }
                    }
                } else {
                    // 일반 적
                    const dx = enemy.x - blockCenterX;
                    const dy = enemy.y - blockCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= block.attackRange && distance < closestDistance) {
                        closestDistance = distance;
                        targetEnemy = enemy;
                    }
                }
            }
            
            // 적이 있고 쿨다운이 끝났으면 발사
            if (targetEnemy && block.attackCooldown === 0) {
                const angle = Math.atan2(targetEnemy.y - blockCenterY, targetEnemy.x - blockCenterX);
                this.waterGunProjectiles.push({
                    x: blockCenterX,
                    y: blockCenterY,
                    vx: Math.cos(angle) * 10,
                    vy: Math.sin(angle) * 10,
                    damage: 2, // 물총 데미지 2
                    radius: 5
                });
                block.attackCooldown = 30; // 쿨다운
            }
        }
    }
    
    updateWaterCannonTargets() {
        // 물대포 타겟 업데이트
        for (let i = this.waterCannonTargets.length - 1; i >= 0; i--) {
            const target = this.waterCannonTargets[i];
            
            // 타이머 감소
            if (target.timer > 0) {
                target.timer--;
                
                // 타이머가 0이 되면 사격
                if (target.timer === 0) {
                    // 히트박스 내의 모든 적에게 데미지
                    for (let j = this.enemies.length - 1; j >= 0; j--) {
                        const enemy = this.enemies[j];
                        let enemyX, enemyY;
                        
                        // 뱀은 머리 위치 사용
                        if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                            if (enemy.segments && enemy.segments.length > 0) {
                                enemyX = enemy.segments[0].x;
                                enemyY = enemy.segments[0].y;
                            } else {
                                continue;
                            }
                        } else {
                            enemyX = enemy.x;
                            enemyY = enemy.y;
                        }
                        
                        const dx = enemyX - target.x;
                        const dy = enemyY - target.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance <= target.hitboxRadius) {
                            // 데미지 적용
                            if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                                // 뱀은 모든 세그먼트에 데미지
                                for (let segment of enemy.segments) {
                                    segment.health -= target.damage;
                                    if (segment.health < 0) segment.health = 0;
                                }
                            } else {
                                // 방어력이 있는 적(군인, 기사)은 방어력이 있을 때는 체력 무적
                                if (enemy.type === 'soldier' || enemy.type === 'knight') {
                                    if (enemy.armor === undefined) enemy.armor = 50;
                                    // 방어력이 있으면 방어력만 감소 (체력 무적)
                                    if (enemy.armor > 0) {
                                        enemy.armor -= target.damage;
                                        if (enemy.armor < 0) enemy.armor = 0;
                                    } else {
                                        // 방어력이 다 닳으면 체력만 감소
                                        enemy.health -= target.damage;
                                        if (enemy.health < 0) enemy.health = 0;
                                    }
                                } else {
                                    enemy.health -= target.damage;
                                    if (enemy.health < 0) enemy.health = 0;
                                }
                            }
                        }
                    }
                    
                    // 보스도 체크
                    if (this.boss) {
                        const bossDx = this.boss.x - target.x;
                        const bossDy = this.boss.y - target.y;
                        const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
                        if (bossDistance <= target.hitboxRadius) {
                            this.boss.health -= target.damage;
                            if (this.boss.health < 0) this.boss.health = 0;
                        }
                    }
                    
                    // 임시 물 블럭 생성 (10초 = 600프레임)
                    const gridX = Math.floor(target.x / this.studSize);
                    const gridY = Math.floor(target.y / this.studSize);
                    const blockX = gridX * this.studSize;
                    const blockY = gridY * this.studSize;
                    
                    // 해당 위치에 이미 블럭이 있는지 확인
                    const existingBlock = this.blocks.find(b => 
                        Math.abs(b.x - blockX) < this.studSize / 2 && 
                        Math.abs(b.y - blockY) < this.studSize / 2
                    );
                    
                    // 기존 블럭이 물블럭 계열이 아니거나 임시 블럭이면 임시 블럭 생성
                    if (!existingBlock || (existingBlock.type !== '물블럭' && existingBlock.type !== '깊은물블럭' && existingBlock.type !== '심연블럭') || existingBlock.isTemporary) {
                        // 임시 물 블럭 생성
                        this.blocks.push({
                            type: '물블럭',
                            x: blockX,
                            y: blockY,
                            health: this.blockHealths['물블럭'],
                            maxHealth: this.blockHealths['물블럭'],
                            level: 1,
                            isTemporary: true, // 임시 블럭 표시
                            temporaryTimer: 600, // 10초 = 600프레임
                            fadeOut: false,
                            fadeOutTimer: 0
                        });
                    }
                    
                    // 타겟 제거 (사격 완료, 임시 블럭은 계속 존재)
                    this.waterCannonTargets.splice(i, 1);
                }
            }
        }
    }
    
    updateTemporaryBlocks() {
        // 임시 물 블럭 페이드 아웃 처리
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            
            if (!block.isTemporary) continue;
            
            // 임시 블럭 타이머 감소
            if (block.temporaryTimer > 0) {
                block.temporaryTimer--;
                
                // 타이머가 0이 되면 페이드 아웃 시작
                if (block.temporaryTimer === 0) {
                    block.fadeOut = true;
                    block.fadeOutTimer = 0;
                }
            }
            
            // 페이드 아웃 처리
            if (block.fadeOut) {
                block.fadeOutTimer++;
                const fadeDuration = 120; // 2초 = 120프레임
                
                // 해당 위치에 설치된 물블럭이 있는지 확인
                const permanentBlock = this.blocks.find(b => 
                    Math.abs(b.x - block.x) < this.studSize / 2 && 
                    Math.abs(b.y - block.y) < this.studSize / 2 &&
                    !b.isTemporary &&
                    (b.type === '물블럭' || b.type === '깊은물블럭' || b.type === '심연블럭')
                );
                
                // 설치된 물블럭이 없으면 페이드 아웃
                if (!permanentBlock) {
                    if (block.fadeOutTimer >= fadeDuration) {
                        // 블럭 제거
                        this.blocks.splice(i, 1);
                    }
                } else {
                    // 설치된 물블럭이 있으면 임시 블럭 제거 (페이드 아웃 없이)
                    this.blocks.splice(i, 1);
                }
            }
        }
    }
    
    updateWaterGunProjectiles() {
        // 물총 발사체 업데이트
        for (let i = this.waterGunProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.waterGunProjectiles[i];
            
            // 발사체 이동
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            // 화면 밖으로 나가면 제거
            if (projectile.x < 0 || projectile.x > this.canvas.width ||
                projectile.y < 0 || projectile.y > this.canvas.height) {
                this.waterGunProjectiles.splice(i, 1);
                continue;
            }
            
            // 적과 충돌 체크
            let hitEnemy = false;
            for (let j = 0; j < this.enemies.length; j++) {
                const enemy = this.enemies[j];
                
                // 뱀은 세그먼트별로 체크
                if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                    if (enemy.segments && enemy.segments.length > 0) {
                        for (let segment of enemy.segments) {
                            const dx = projectile.x - segment.x;
                            const dy = projectile.y - segment.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance < projectile.radius + segment.radius) {
                                // 뱀 세그먼트에 데미지
                                segment.health -= projectile.damage;
                                if (segment.health < 0) segment.health = 0;
                                
                                // 체력바 표시
                                segment.showHealthBar = true;
                                
                                // 뱀에게 속도 감소 효과 적용 (5초간 1/3 속도)
                                if (!enemy.waterGunSlowTimer) {
                                    enemy.waterGunSlowTimer = 300; // 5초 = 300프레임
                                } else {
                                    enemy.waterGunSlowTimer = 300; // 다시 맞으면 타이머 리셋
                                }
                                
                                this.waterGunProjectiles.splice(i, 1);
                                hitEnemy = true;
                                break;
                            }
                        }
                        if (hitEnemy) break;
                    }
                } else {
                    // 일반 적
                    const dx = projectile.x - enemy.x;
                    const dy = projectile.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < projectile.radius + enemy.radius) {
                        // 방어력이 있는 적(군인, 기사)은 방어력이 있을 때는 체력 무적
                        if (enemy.type === 'soldier' || enemy.type === 'knight') {
                            if (enemy.armor === undefined) enemy.armor = 50;
                            // 방어력이 있으면 방어력만 감소 (체력 무적)
                            if (enemy.armor > 0) {
                                enemy.armor -= projectile.damage;
                                if (enemy.armor < 0) enemy.armor = 0;
                            } else {
                                // 방어력이 다 닳으면 체력만 감소
                                enemy.health -= projectile.damage;
                                if (enemy.health < 0) enemy.health = 0;
                            }
                        } else {
                            // 적에게 데미지
                            enemy.health -= projectile.damage;
                            if (enemy.health < 0) enemy.health = 0;
                        }
                        
                        // 체력바 표시
                        enemy.showHealthBar = true;
                        
                        // 적에게 속도 감소 효과 적용 (5초간 1/3 속도)
                        if (!enemy.waterGunSlowTimer) {
                            enemy.waterGunSlowTimer = 300; // 5초 = 300프레임
                        } else {
                            enemy.waterGunSlowTimer = 300; // 다시 맞으면 타이머 리셋
                        }
                        
                        this.waterGunProjectiles.splice(i, 1);
                        hitEnemy = true;
                        break;
                    }
                }
            }
            
            if (hitEnemy) continue;
        }
    }
    
    updateCannonProjectiles() {
        // 대포 발사체 업데이트
        for (let i = this.cannonProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.cannonProjectiles[i];
            
            // 발사체 이동
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            // 화면 밖으로 나가면 제거
            if (projectile.x < -projectile.radius || projectile.x > this.canvas.width + projectile.radius ||
                projectile.y < -projectile.radius || projectile.y > this.canvas.height + projectile.radius) {
                this.cannonProjectiles.splice(i, 1);
                continue;
            }
            
            // 플레이어와 충돌 체크
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const dx = projectile.x - playerCenterX;
            const dy = projectile.y - playerCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const playerRadius = Math.max(this.player.width, this.player.height) / 2;
            if (distance < playerRadius + projectile.radius) {
                // 대미지 적용 (10~50 랜덤)
                this.health -= projectile.damage;
                if (this.health < 0) this.health = 0;
                
                // 속도 감소 효과 (5초 = 300프레임)
                this.speedDebuffTimer = 300;
                
                // 출혈 효과 (10초 동안)
                this.bleedingEffect.active = true;
                this.bleedingEffect.damage = 15; // 총 15대미지
                this.bleedingEffect.timer = 0;
                
                // 피격 색상 적용
                this.playerHitColorTimer = 10;
                
                // UI 업데이트
                this.updateHealthDisplay();
                
                // 체력이 0이 되면 게임 오버
                if (this.health <= 0 && !this.gameOver) {
                    this.monsterName = '대포';
                    this.saveGameState();
                    this.gameOver = true;
                }
                
                // 발사체 제거
                this.cannonProjectiles.splice(i, 1);
                continue;
            }
        }
    }
    
    updateEnemyProjectiles() {
        // 적 발사체 업데이트
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.enemyProjectiles[i];
            
            // 발사체 이동
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            // 화면 밖으로 나가면 제거
            if (projectile.x < 0 || projectile.x > this.canvas.width ||
                projectile.y < 0 || projectile.y > this.canvas.height) {
                this.enemyProjectiles.splice(i, 1);
                continue;
            }
            
            // 플레이어와 충돌 체크
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const dx = projectile.x - playerCenterX;
            const dy = projectile.y - playerCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const playerRadius = Math.max(this.player.width, this.player.height) / 2;
            if (distance < playerRadius + projectile.radius) {
                if (projectile.type === 'flash') {
                    // 섬광탄: 데미지 대신 화면 섬광 효과만 적용 (섬광 동그라미의 섬광은 1초 + 그라데이션 페이드아웃)
                    this.triggerPlayerFlash(60, 30); // 약 1초 유지 후 0.5초 동안 그라데이션으로 서서히 사라짐
                } else if (projectile.type === 'fire') {
                    // 화염 발사체: 데미지를 주고 화염 효과 적용
                    this.health -= projectile.damage;
                    if (this.health < 0) this.health = 0;
                    this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                    
                    // 화염 동그라미가 플레이어에게 던질 때,
                    // 플레이어 주변에 큰 히트박스를 생성하고 그 위에 불 파티클을 생성
                    const aoeRadius = 120; // 큰 범위
                    const aoeDuration = 90; // 약 1.5초 (90프레임)
                    this.gasolineBombHitboxes.push({
                        x: playerCenterX,
                        y: playerCenterY,
                        radius: aoeRadius,
                        timer: 0,
                        duration: aoeDuration,
                        particles: [],
                        playerOnly: true // 플레이어만 데미지를 받는 히트박스
                    });
                    
                    // 즉시 한 번 불 파티클 생성 (시작 연출)
                    this.createFireParticles(playerCenterX, playerCenterY);
                } else if (projectile.type === 'tank') {
                    // 탱크 총알: 속도 1/2 감소, 체력 1/4 대미지
                    const maxHealth = this.maxHealth || 100;
                    const damage = Math.floor(maxHealth / 4);
                    this.health -= damage;
                    if (this.health < 0) this.health = 0;
                    this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                    
                    // 속도 1/2 감소 (최소 1초 = 60프레임 동안)
                    if (!this.player.tankSlowTimer) {
                        this.player.tankSlowTimer = 0;
                    }
                    this.player.tankSlowTimer = Math.max(this.player.tankSlowTimer, 60); // 최소 1초
                    
                    this.updateHealthDisplay();
                } else if (projectile.type === 'tankSpecial') {
                    // 탱크 특수 공격: 일반 데미지
                    this.health -= projectile.damage;
                    if (this.health < 0) this.health = 0;
                    this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                    this.updateHealthDisplay();
                } else {
                    // 플레이어에게 데미지
                    this.health -= projectile.damage;
                    if (this.health < 0) this.health = 0;
                    
                    // 독 발사체인 경우 독 효과 추가
                    if (projectile.isPoison && projectile.poisonDamage) {
                        this.poisonEffect.active = true;
                        this.poisonEffect.damage = projectile.poisonDamage; // 5 대미지
                        this.poisonEffect.initialDamage = projectile.poisonDamage;
                        this.poisonEffect.timer = 0;
                    }
                    
                    // 피격 색상 적용 (넉백은 없음 - 아처 발사체)
                    this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                    
                    // UI 업데이트
                    this.updateHealthDisplay();
                    
            // 체력이 0이 되면 게임 오버
            if (this.health <= 0 && !this.gameOver) {
                // 발사체 타입에 따라 몬스터 이름 설정
                if (projectile.type === 'soldier') {
                    this.monsterName = '군인';
                } else if (projectile.type === 'tank' || projectile.type === 'tankSpecial') {
                    this.monsterName = '탱크';
                } else {
                    this.monsterName = projectile.isPoison ? '독 뱀' : '석궁 동그라미';
                }
                
                // 독뱀(독 발사체)에게 즉사했을 때도 독으로 죽은 것으로 처리
                if (projectile.isPoison) {
                    this.diedFromPoison = true;
                }
                
                this.saveGameState(); // 게임 상태 저장
                this.gameOver = true;
            }
                }
                
                // 발사체 제거
                this.enemyProjectiles.splice(i, 1);
                continue;
            }
            
            // 보스와 충돌 체크
            if (this.boss) {
                const bossDx = projectile.x - this.boss.x;
                const bossDy = projectile.y - this.boss.y;
                const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
                
                if (bossDistance < this.boss.radius + projectile.radius) {
                    // 보스에게 데미지
                    this.boss.health -= projectile.damage;
                    if (this.boss.health < 0) {
                        this.boss.health = 0;
                    }
                    
                    // 발사체 제거
                    this.enemyProjectiles.splice(i, 1);
                    continue;
                }
            }
            
            // 블록과 충돌 체크 (벽만)
            let hitBlock = false;
            for (let block of this.blocks) {
                if (block.type !== '벽') continue;
                
                const blockCenterX = block.x + this.studSize / 2;
                const blockCenterY = block.y + this.studSize / 2;
                const blockDx = projectile.x - blockCenterX;
                const blockDy = projectile.y - blockCenterY;
                const blockDistance = Math.sqrt(blockDx * blockDx + blockDy * blockDy);
                
                if (blockDistance < this.studSize / 2 + projectile.radius) {
                    // 블록에 데미지
                    block.health -= projectile.damage;
                    if (block.health < 0) block.health = 0;
                    
                    // 발사체 제거
                    this.enemyProjectiles.splice(i, 1);
                    hitBlock = true;
                    break;
                }
            }
            
            if (hitBlock) continue;
        }
    }
    
    updateArcherProjectiles() {
        // 발사체 업데이트
        for (let i = this.archerProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.archerProjectiles[i];
            
            // 발사체 이동
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            // 화면 밖으로 나가면 제거
            if (projectile.x < 0 || projectile.x > this.canvas.width ||
                projectile.y < 0 || projectile.y > this.canvas.height) {
                this.archerProjectiles.splice(i, 1);
                continue;
            }
            
            // 석궁 동그라미 총알과 충돌 체크 (플레이어 발사체가 석궁 동그라미 총알을 맞추면 대미지)
            let hitEnemyProjectile = false;
            for (let j = this.enemyProjectiles.length - 1; j >= 0; j--) {
                const enemyProjectile = this.enemyProjectiles[j];
                // 석궁 동그라미 총알인지 확인 (type이 없거나 'soldier'가 아니면 석궁 동그라미 총알)
                if (enemyProjectile.type === 'soldier' || enemyProjectile.isPoison) continue; // 군인 총알이나 독 뱀 총알은 제외
                
                const dx = projectile.x - enemyProjectile.x;
                const dy = projectile.y - enemyProjectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < enemyProjectile.radius + projectile.radius) {
                    // 석궁 동그라미 총알에 대미지 (체력이 없으면 생성)
                    if (!enemyProjectile.health) {
                        enemyProjectile.health = 1; // 석궁 동그라미 총알은 체력 1
                    }
                    enemyProjectile.health -= projectile.damage;
                    
                    // 체력이 0 이하면 총알 제거
                    if (enemyProjectile.health <= 0) {
                        this.enemyProjectiles.splice(j, 1);
                    }
                    
                    // 플레이어 발사체 제거
                    this.archerProjectiles.splice(i, 1);
                    hitEnemyProjectile = true;
                    break;
                }
            }
            
            if (hitEnemyProjectile) continue;
            
            // 적과 충돌 체크
            let hitEnemy = false;
            for (let j = 0; j < this.enemies.length; j++) {
                const enemy = this.enemies[j];
                const dx = projectile.x - enemy.x;
                const dy = projectile.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < enemy.radius + projectile.radius) {
                    // 무적 상태 체크 (원숭이만)
                    if (enemy.type === 'monkey' && enemy.invincibleTimer && enemy.invincibleTimer > 0) {
                        // 무적 상태면 데미지 무시
                        continue;
                    }
                    
                    // 데미지 받기 전 체력 저장
                    const healthBeforeDamage = enemy.health;
                    
                    // 방어력이 있는 적(군인, 기사)은 방어력이 있을 때는 체력 무적
                    if (enemy.type === 'soldier' || enemy.type === 'knight') {
                        if (enemy.armor === undefined) enemy.armor = 50;
                        // 방어력이 있으면 방어력만 감소 (체력 무적)
                        if (enemy.armor > 0) {
                            enemy.armor -= projectile.damage;
                            if (enemy.armor < 0) enemy.armor = 0;
                        } else {
                            // 방어력이 다 닳으면 체력만 감소
                            enemy.health -= projectile.damage;
                        }
                    } else {
                    // 적에게 데미지
                    enemy.health -= projectile.damage;
                    }
                    
                    // 원숭이는 피격 시 도망가기 시작
                    if (enemy.type === 'monkey') {
                        enemy.isFleeing = true;
                        enemy.fleeTimer = 120; // 2초 동안 도망 (120프레임)
                        enemy.lastHealthBeforeDamage = healthBeforeDamage;
                    }
                    
                    // 체력바 표시 (공격받으면 계속 보이게)
                    enemy.showHealthBar = true;
                    
                    if (enemy.health <= 0) {
                        enemy.health = 0;
                    }
                    
                    // 적의 체력이 회복되지 않도록 보장 (체력은 감소만 하고 회복되지 않음)
                    // 이전 프레임 체력보다 높아지면 이전 체력으로 되돌림 (회복 완전 방지)
                    if (enemy.health > enemy.lastHealth) {
                        enemy.health = enemy.lastHealth; // 체력 증가 방지
                    }
                    // 데미지 받기 전 체력보다 높아지면 원래 값으로 되돌림 (버그 방지)
                    if (enemy.health > healthBeforeDamage) {
                        enemy.health = healthBeforeDamage;
                    }
                    // 체력이 초기 체력보다 높아지면 초기 체력으로 제한 (회복 방지)
                    if (enemy.health > enemy.initialHealth) {
                        enemy.health = enemy.initialHealth;
                    }
                    // 체력이 최대치를 넘지 않도록만 제한 (버그 방지)
                    if (enemy.health > enemy.maxHealth) {
                        enemy.health = enemy.maxHealth;
                    }
                    // 체력이 음수가 되지 않도록만 제한
                    if (enemy.health < 0) {
                        enemy.health = 0;
                    }
                    
                    // 현재 체력을 이전 체력으로 저장 (다음 프레임 비교용)
                    enemy.lastHealth = enemy.health;
                    
                    // 발사체 제거
                    this.archerProjectiles.splice(i, 1);
                    hitEnemy = true;
                    break;
                }
            }
            
            if (hitEnemy) continue;
            
            // 물고기와 충돌 체크
            let hitFish = false;
            for (let j = 0; j < this.fishes.length; j++) {
                const fish = this.fishes[j];
                const fishRadius = fish.size / 2;
                const dx = projectile.x - fish.x;
                const dy = projectile.y - fish.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < fishRadius + projectile.radius) {
                    // 물고기에게 데미지
                    fish.health -= projectile.damage;
                    if (fish.health <= 0) {
                        this.fishes.splice(j, 1);
                    }
                    
                    // 발사체 제거
                    this.archerProjectiles.splice(i, 1);
                    hitFish = true;
                    break;
                }
            }
            
            if (hitFish) continue;
            
            // 보스와 충돌 체크
            if (this.boss) {
                const bossDx = projectile.x - this.boss.x;
                const bossDy = projectile.y - this.boss.y;
                const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
                
                if (bossDistance < this.boss.radius + projectile.radius) {
                    // 보스에게 데미지
                    this.boss.health -= projectile.damage;
                    if (this.boss.health < 0) {
                        this.boss.health = 0;
                    }
                    
                    // 발사체 제거
                    this.archerProjectiles.splice(i, 1);
                    continue;
                }
            }
        }
    }
    
    updateGasolineBombs() {
        // 화염병 블록 업데이트 (섬광탄 블록과 동일한 쿨타임 사용)
        const cooldownDuration = 150; // 섬광탄 블록과 동일 (2.5초)
        
        for (let block of this.blocks) {
            if (block.type !== '화염병') continue;
            
            // 감지 범위 기본값 설정
            if (block.range === undefined || block.range === null) {
                block.range = this.studSize * 2;
            }
            
            // 쿨타임 초기화
            if (block.gasolineCooldown === undefined) {
                block.gasolineCooldown = 0;
            }
            
            // 쿨타임 감소
            if (block.gasolineCooldown > 0) {
                block.gasolineCooldown--;
                continue;
            }
            
            const blockCenterX = block.x + this.studSize / 2;
            const blockCenterY = block.y + this.studSize / 2;
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            // 범위 안의 가장 가까운 적 찾기
            for (let enemy of this.enemies) {
                const dx = enemy.x - blockCenterX;
                const dy = enemy.y - blockCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= block.range + enemy.radius && distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }
            
            // 적이 범위 안에 있으면 발사체 생성 및 쿨타임 설정
            if (closestEnemy) {
                const dx = closestEnemy.x - blockCenterX;
                const dy = closestEnemy.y - blockCenterY;
                const distToEnemy = Math.sqrt(dx * dx + dy * dy);
                
                if (distToEnemy > 0) {
                    const projectileSpeed = 8;
                    const vx = (dx / distToEnemy) * projectileSpeed;
                    const vy = (dy / distToEnemy) * projectileSpeed;
                    
                    this.gasolineBombProjectiles.push({
                        x: blockCenterX,
                        y: blockCenterY,
                        vx: vx,
                        vy: vy,
                        radius: 8,
                        targetEnemy: closestEnemy
                    });
                    
                    // 쿨타임 설정
                    block.gasolineCooldown = cooldownDuration;
                }
            }
        }
    }
    
    updateGasolineBombProjectiles() {
        // 화염병 발사체 업데이트
        for (let i = this.gasolineBombProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.gasolineBombProjectiles[i];
            
            // 발사체 이동
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            // 화면 밖으로 나가면 제거
            if (projectile.x < 0 || projectile.x > this.canvas.width ||
                projectile.y < 0 || projectile.y > this.canvas.height) {
                this.gasolineBombProjectiles.splice(i, 1);
                continue;
            }
            
            // 타겟 적이 여전히 존재하는지 확인
            if (projectile.targetEnemy && this.enemies.includes(projectile.targetEnemy)) {
                // 적과의 거리 계산
                const dx = projectile.targetEnemy.x - projectile.x;
                const dy = projectile.targetEnemy.y - projectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 적에 닿으면 히트박스 생성
                if (distance < projectile.targetEnemy.radius + projectile.radius) {
                    // 히트박스 생성 (7.5초 = 450프레임)
                    this.gasolineBombHitboxes.push({
                        x: projectile.targetEnemy.x,
                        y: projectile.targetEnemy.y,
                        radius: 50, // 히트박스 반경
                        timer: 0,
                        duration: 450, // 7.5초
                        particles: [] // 불 파티클 배열
                    });
                    
                    // 발사체 제거
                    this.gasolineBombProjectiles.splice(i, 1);
                    continue;
                }
            } else {
                // 타겟 적이 사라졌으면 발사체 제거
                this.gasolineBombProjectiles.splice(i, 1);
                continue;
            }
            
            // 모든 적과 충돌 체크 (타겟이 아닌 적도 체크)
            for (let j = 0; j < this.enemies.length; j++) {
                const enemy = this.enemies[j];
                const dx = projectile.x - enemy.x;
                const dy = projectile.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < enemy.radius + projectile.radius) {
                    // 히트박스 생성 (7.5초 = 450프레임)
                    this.gasolineBombHitboxes.push({
                        x: enemy.x,
                        y: enemy.y,
                        radius: 50, // 히트박스 반경
                        timer: 0,
                        duration: 450, // 7.5초
                        particles: [] // 불 파티클 배열
                    });
                    
                    // 발사체 제거
                    this.gasolineBombProjectiles.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    updateGasolineBombHitboxes() {
        // 화염병 히트박스 업데이트
        let playerInFire = false; // 플레이어가 불에 있는지 확인
        
        for (let i = this.gasolineBombHitboxes.length - 1; i >= 0; i--) {
            const hitbox = this.gasolineBombHitboxes[i];
            
            // 타이머 증가
            hitbox.timer++;
            
            // 지속 시간이 지나면 제거
            if (hitbox.timer >= hitbox.duration) {
                this.gasolineBombHitboxes.splice(i, 1);
                continue;
            }
            
            // 불 파티클 생성 (지속적으로)
            if (hitbox.timer % 5 === 0) { // 5프레임마다 파티클 생성
                this.createFireParticles(hitbox.x, hitbox.y);
            }
            
            // 플레이어 전용 히트박스가 아니면 적에게 데미지
            if (!hitbox.playerOnly) {
                // 히트박스 안의 적에게 데미지 (매 프레임)
                for (let j = 0; j < this.enemies.length; j++) {
                    const enemy = this.enemies[j];
                    const dx = enemy.x - hitbox.x;
                    const dy = enemy.y - hitbox.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < hitbox.radius + enemy.radius) {
                        // 불에 들어가면 10초 동안 속도 증가 효과 적용
                        if (enemy.fireSpeedBoostTimer === undefined) {
                            enemy.fireSpeedBoostTimer = 0;
                        }
                        enemy.fireSpeedBoostTimer = 600; // 10초 = 600프레임
                        
                        // 적에게 데미지 (매 프레임 작은 데미지)
                        const damage = 1; // 매 프레임 1 데미지
                        if (enemy.type === 'soldier' || enemy.type === 'knight') {
                            if (enemy.armor === undefined) enemy.armor = 50;
                            if (enemy.armor > 0) {
                                enemy.armor -= damage;
                                if (enemy.armor < 0) enemy.armor = 0;
                            } else {
                                enemy.health -= damage;
                            }
                        } else {
                            enemy.health -= damage;
                        }
                        
                        if (enemy.health < 0) enemy.health = 0;
                        enemy.showHealthBar = true;
                    }
                }
                
                // 보스도 체크
                if (this.boss) {
                    const bossDx = this.boss.x - hitbox.x;
                    const bossDy = this.boss.y - hitbox.y;
                    const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
                    
                    if (bossDistance < hitbox.radius + this.boss.radius) {
                        const damage = 1;
                        this.boss.health -= damage;
                        if (this.boss.health < 0) this.boss.health = 0;
                    }
                }
            } else {
                // 플레이어 전용 히트박스: 플레이어에게만 데미지
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const dx = playerCenterX - hitbox.x;
                const dy = playerCenterY - hitbox.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const playerRadius = Math.max(this.player.width, this.player.height) / 2;
                
                if (distance < hitbox.radius + playerRadius) {
                    // 불에 들어가면 10초 동안 속도 증가 효과 적용
                    this.player.fireSpeedBoostTimer = 600; // 10초 = 600프레임
                    
                    // 불 효과 활성화 (불이 있을 때만)
                    this.player.fireEffect.active = true;
                    this.player.fireEffect.durationTimer = 420; // 7초 = 420프레임 (불에 있는 동안 계속 갱신)
                    if (this.player.fireEffect.damageCooldown <= 0) {
                        this.player.fireEffect.damageCooldown = 60; // 1초 = 60프레임
                    }
                    playerInFire = true;
                }
            }
        }
        
        // 플레이어가 어떤 불에도 들어가지 않으면 불 효과 지속 타이머 시작 (7초)
        if (!playerInFire && this.player.fireEffect.active) {
            // 불에서 벗어났을 때만 타이머 설정 (이미 설정되어 있으면 유지)
            if (this.player.fireEffect.durationTimer === 0) {
                this.player.fireEffect.durationTimer = 420; // 7초 = 420프레임
            }
        }
    }
    
    createFireParticles(x, y) {
        // 불 파티클 생성
        const particleCount = 3;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            
            this.fireParticles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1, // 위로 올라가는 효과
                life: 30,
                maxLife: 30,
                size: 3 + Math.random() * 3
            });
        }
    }
    
    updateFireParticles() {
        // 불 파티클 업데이트
        for (let i = this.fireParticles.length - 1; i >= 0; i--) {
            const particle = this.fireParticles[i];
            
            particle.life--;
            
            if (particle.life <= 0) {
                this.fireParticles.splice(i, 1);
                continue;
            }
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 속도 감소
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            
            // 위로 올라가는 효과
            particle.vy -= 0.1;
        }
    }
    
    updateHealthDisplay() {
        // 체력 바는 draw 함수에서 자동으로 업데이트됨
        // HTML 버튼은 제거되었으므로 여기서는 아무것도 하지 않음
    }
    
    addToInventory(type, count, insertAtSecondRow = false, colorIndex = null) {
        // 인벤토리에 아이템 추가 (천천히 나타나도록)
        const existingItem = this.inventory.find(item => item.type === type);
        if (existingItem) {
            // 기존 아이템이 있으면 개수만 증가 (제한 없음)
            existingItem.count += count;
            if (type === '색상(제작용)' && colorIndex !== null) {
                existingItem.colorIndex = colorIndex;
            }
        } else {
            // 새 아이템은 즉시 표시되도록 (appearFrame을 현재 프레임으로 설정)
            const appearFrame = this.frameCount;
            const newItem = { 
                type: type, 
                count: count,
                appearFrame: appearFrame // 나타날 프레임
            };
            if (type === '색상(제작용)') {
                newItem.colorIndex = colorIndex !== null ? colorIndex : 0;
            }
            
            // 2번째 줄에 넣기 (5번째 인덱스에 삽입)
            if (insertAtSecondRow && this.inventory.length >= 5) {
                this.inventory.splice(5, 0, newItem);
            } else {
                this.inventory.push(newItem);
            }
        }
    }
    
    getColorPaletteEntry(index = 0) {
        if (!this.colorPalette || this.colorPalette.length === 0) {
            return { name: '', color: '#ffffff' };
        }
        const paletteLength = this.colorPalette.length;
        const normalizedIndex = ((index || 0) % paletteLength + paletteLength) % paletteLength;
        return this.colorPalette[normalizedIndex];
    }
    
    getItemDisplayName(type, colorIndex = null) {
        if (type === '색상(제작용)') {
            const entry = this.getColorPaletteEntry(colorIndex);
            return `색상(${entry.name})`;
        }
        return type;
    }
    
    cycleColorInventoryItem(item) {
        if (!item || item.type !== '색상(제작용)') {
            return;
        }
        if (item.colorIndex === undefined || item.colorIndex === null) {
            item.colorIndex = 0;
        }
        item.colorIndex = (item.colorIndex + 1) % this.colorPalette.length;
    }
    
    initCraftingRecipes() {
        // 조합 레시피 초기화
        // 형식: '아이템1,아이템2' => '결과아이템'
        // 예시 조합 (실제 조합은 게임 디자인에 따라 변경 가능)
        this.craftingRecipes['벽,가시'] = '가시가있는벽';
        this.craftingRecipes['가시,벽'] = '가시가있는벽'; // 순서 무관하게
        this.craftingRecipes['아처,벽'] = '강철아처';
        this.craftingRecipes['벽,아처'] = '강철아처';
        this.craftingRecipes['벽,물블럭'] = '모래벽';
        this.craftingRecipes['물블럭,벽'] = '모래벽';
        this.craftingRecipes['스펀치 벽,물블럭'] = '물먹은스펀지벽';
        this.craftingRecipes['물블럭,스펀치 벽'] = '물먹은스펀지벽';
        this.craftingRecipes['벽,벽'] = '나무(제작용)';
        this.craftingRecipes['아처,나무(제작용)'] = '석궁';
        this.craftingRecipes['나무(제작용),아처'] = '석궁';
        this.craftingRecipes['물블럭,아처'] = '물총';
        this.craftingRecipes['아처,물블럭'] = '물총';
        this.craftingRecipes['깊은물블럭,아처'] = '물대포';
        this.craftingRecipes['아처,깊은물블럭'] = '물대포';
        this.craftingRecipes['심연블럭,자석석'] = '지뢰';
        this.craftingRecipes['자석석,심연블럭'] = '지뢰';
        this.craftingRecipes['심연블럭,심연블럭'] = '빛(제작용)';
        this.craftingRecipes['심연블럭,빛(제작용)'] = '색상(제작용)';
        this.craftingRecipes['빛(제작용),심연블럭'] = '색상(제작용)';
        this.craftingRecipes['빛(제작용),아처'] = '섬광탄';
        this.craftingRecipes['아처,빛(제작용)'] = '섬광탄';
        this.craftingRecipes['지뢰,빛(제작용)'] = '섬광 지뢰';
        this.craftingRecipes['빛(제작용),지뢰'] = '섬광 지뢰';
        this.craftingRecipes['아처,지뢰'] = '총알 지뢰';
        this.craftingRecipes['지뢰,아처'] = '총알 지뢰';
        this.craftingRecipes['빨강,아처'] = '화염병';
        this.craftingRecipes['아처,빨강'] = '화염병';
        // 추가 조합 레시피는 여기에 추가
    }
    
    updateCraftingResult() {
        // 조합 결과 업데이트
        if (this.craftingSlots[0] && this.craftingSlots[1]) {
            // 두 슬롯에 아이템이 모두 있을 때
            // 색상 아이템의 경우 실제 색상 이름으로 변환
            let item1 = this.craftingSlots[0];
            let item2 = this.craftingSlots[1];
            
            // 색상(제작용) 아이템인 경우 실제 색상 이름으로 변환
            if (item1 === '색상(제작용)') {
                const colorIndex1 = this.craftingSlotColors[0] || 0;
                const colorEntry1 = this.getColorPaletteEntry(colorIndex1);
                item1 = colorEntry1.name;
            }
            if (item2 === '색상(제작용)') {
                const colorIndex2 = this.craftingSlotColors[1] || 0;
                const colorEntry2 = this.getColorPaletteEntry(colorIndex2);
                item2 = colorEntry2.name;
            }
            
            const recipeKey1 = `${item1},${item2}`;
            const recipeKey2 = `${item2},${item1}`;
            
            if (this.craftingRecipes[recipeKey1]) {
                this.craftingResult = this.craftingRecipes[recipeKey1];
            } else if (this.craftingRecipes[recipeKey2]) {
                this.craftingResult = this.craftingRecipes[recipeKey2];
            } else {
                this.craftingResult = 'X'; // 조합 불가
            }
        } else {
            this.craftingResult = null; // 슬롯이 비어있음
        }
    }
    
    drawRoundedRectFill(x, y, width, height, radius) {
        // 둥근 모서리 사각형 채우기
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawUpgradeIcon(x, y, size) {
        // 업그레이드 아이콘 그리기 (가운데 파란 동그라미, 주변에 7개의 작은 하늘색 동그라미)
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        // 가운데 파란 동그라미
        this.ctx.fillStyle = '#0066ff'; // 파란색
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, size * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 주변 7개의 작은 하늘색 동그라미
        this.ctx.fillStyle = '#87ceeb'; // 하늘색
        const smallRadius = size * 0.08;
        const orbitRadius = size * 0.25;
        
        for (let i = 0; i < 7; i++) {
            const angle = (i / 7) * Math.PI * 2;
            const smallX = centerX + Math.cos(angle) * orbitRadius;
            const smallY = centerY + Math.sin(angle) * orbitRadius;
            
            this.ctx.beginPath();
            this.ctx.arc(smallX, smallY, smallRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawGatlingIcon(x, y, size) {
        // 캐틀링건 아이콘 그리기 (여러 개의 총열)
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // 캐틀링건 본체 (중앙 원통)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-size * 0.3, -size * 0.4, size * 0.6, size * 0.8);
        
        // 총열들 (3개)
        const barrelWidth = size * 0.15;
        const barrelHeight = size * 0.5;
        const barrelSpacing = size * 0.2;
        
        // 왼쪽 총열
        this.ctx.fillRect(-size * 0.4, -barrelHeight / 2, barrelWidth, barrelHeight);
        // 중앙 총열
        this.ctx.fillRect(-barrelWidth / 2, -barrelHeight / 2, barrelWidth, barrelHeight);
        // 오른쪽 총열
        this.ctx.fillRect(size * 0.25, -barrelHeight / 2, barrelWidth, barrelHeight);
        
        this.ctx.restore();
    }
    
    drawTrashIcon(x, y, size) {
        // 쓰레기통 아이콘 그리기
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        // 쓰레기통 몸체 (사각형)
        const bodyWidth = size * 0.5;
        const bodyHeight = size * 0.5;
        const bodyX = centerX - bodyWidth / 2;
        const bodyY = centerY - bodyHeight / 4;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
        
        // 쓰레기통 뚜껑 (위쪽)
        const lidWidth = size * 0.6;
        const lidHeight = size * 0.15;
        const lidX = centerX - lidWidth / 2;
        const lidY = bodyY - lidHeight;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(lidX, lidY, lidWidth, lidHeight);
        
        // 손잡이 (뚜껑 위)
        const handleWidth = size * 0.2;
        const handleHeight = size * 0.1;
        const handleX = centerX - handleWidth / 2;
        const handleY = lidY - handleHeight;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
        
        // 쓰레기통 테두리
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(bodyX, bodyY, bodyWidth, bodyHeight);
        this.ctx.strokeRect(lidX, lidY, lidWidth, lidHeight);
        this.ctx.strokeRect(handleX, handleY, handleWidth, handleHeight);
    }
    
    drawBagIcon(x, y, size) {
        // 가방 아이콘 그리기 (하양 선만)
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        // 가방 본체 (위쪽 둥근 부분)
        this.ctx.arc(x + size / 2, y + size / 4, size / 4, 0, Math.PI);
        
        // 가방 손잡이
        this.ctx.moveTo(x + size / 2 - size / 6, y + size / 4);
        this.ctx.lineTo(x + size / 2 - size / 8, y + size / 8);
        this.ctx.moveTo(x + size / 2 + size / 6, y + size / 4);
        this.ctx.lineTo(x + size / 2 + size / 8, y + size / 8);
        
        // 가방 몸체
        this.ctx.moveTo(x + size / 4, y + size / 4);
        this.ctx.lineTo(x + size / 4, y + size * 3 / 4);
        this.ctx.lineTo(x + size * 3 / 4, y + size * 3 / 4);
        this.ctx.lineTo(x + size * 3 / 4, y + size / 4);
        
        this.ctx.stroke();
    }
    
    placeBlock(x, y) {
        // 블록 설치
        console.log('placeBlock 호출:', x, y, 'selectedInventoryItem:', this.selectedInventoryItem);
        
        if (this.selectedInventoryItem === null) {
            console.log('아이템이 선택되지 않음');
            return;
        }
        
        const item = this.inventory[this.selectedInventoryItem];
        if (!item || item.count <= 0) {
            console.log('아이템이 없거나 개수가 0:', item);
            return;
        }
        
        // 블록 타입 확인 (인벤토리 이름을 실제 블록 타입으로 변환)
        let blockType = item.type;
        let blockLevel = item.level || 1; // 인벤토리에 저장된 레벨 정보 (기본값 1)
        
        // 인벤토리 이름을 실제 블록 타입으로 변환 (만렙 블록인 경우)
        if (item.type === '스펀치 벽') {
            blockType = '벽';
            blockLevel = item.level || 10; // 스펀치 벽은 만렙(10레벨)
        } else if (item.type === '자석석') {
            blockType = '가시';
            blockLevel = item.level || 10; // 자석석은 만렙(10레벨)
        } else if (item.type === '개틀링 건') {
            blockType = '아처';
            blockLevel = item.level || 10; // 개틀링 건은 만렙(10레벨)
        }
        
        const nonPlaceableItems = ['빛(제작용)', '색상(제작용)'];
        if (nonPlaceableItems.includes(blockType)) {
            console.log(`${blockType}은 설치할 수 없는 제작 재료입니다.`);
            return;
        }
        
        // 그리드 좌표로 변환
        const gridX = Math.floor(x / this.studSize);
        const gridY = Math.floor(y / this.studSize);
        
        console.log('그리드 좌표:', gridX, gridY);
        
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
            console.log('그리드 범위 밖');
            return;
        }
        
        // 이미 블록이 있는지 확인
        const blockX = gridX * this.studSize;
        const blockY = gridY * this.studSize;
        const existingBlock = this.blocks.find(b => 
            Math.abs(b.x - blockX) < this.studSize / 2 && 
            Math.abs(b.y - blockY) < this.studSize / 2
        );
        
        if (existingBlock) {
            console.log('이미 블록이 있음');
            return; // 이미 블록이 있으면 설치 불가
        }
        
        // 플레이어 위치에 블록 설치 불가 (벽, 깊은물블럭, 심연블럭만, 아처와 가시는 통과 가능하므로 설치 가능)
        if (blockType === '벽' || blockType === '깊은물블럭' || blockType === '심연블럭') {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const blockCenterX = blockX + this.studSize / 2;
            const blockCenterY = blockY + this.studSize / 2;
            const distance = Math.sqrt(
                Math.pow(playerCenterX - blockCenterX, 2) + 
                Math.pow(playerCenterY - blockCenterY, 2)
            );
            const playerRadius = Math.max(this.player.width, this.player.height) / 2;
            const blockRadius = this.studSize / 2;
            
            if (distance < playerRadius + blockRadius) {
                console.log('플레이어 위치에 블록 설치 불가');
                return; // 플레이어 위치에 블록 설치 불가
            }
        }
        
        // 블록 설치
        console.log('블록 설치 성공:', blockType, blockX, blockY);
        
        // 타입이 유효한지 확인
        if (!blockType || !this.blockHealths[blockType]) {
            console.error('유효하지 않은 블록 타입:', blockType);
            return;
        }
        
        const newBlock = {
            type: blockType,
            x: blockX,
            y: blockY,
            health: this.blockHealths[blockType],
            maxHealth: this.blockHealths[blockType],
            level: blockLevel // 인벤토리에서 가져온 레벨 (만렙 블록은 10레벨)
        };
        
        // 만렙 아처(10레벨)는 캐틀링건으로 변환
        if (blockType === '아처' && blockLevel >= 10) {
            newBlock.type = '캐틀링건';
        }
        
        // 블록 타입별 만렙 효과 적용
        if (newBlock.type === '물블럭' || newBlock.type === '깊은물블럭' || newBlock.type === '심연블럭') {
            // 물블럭 계열: 체력 증가 (레벨당 10% 증가)
            const healthMultiplier = 1 + (blockLevel - 1) * 0.1;
            newBlock.maxHealth = Math.floor(this.blockHealths[newBlock.type] * healthMultiplier);
            newBlock.health = newBlock.maxHealth;
        } else if (newBlock.type === '아처' || newBlock.type === '캐틀링건') {
            // 아처/캐틀링건: 만렙일 때 체력, 공격 범위 증가
            if (blockLevel >= 10) {
                const healthMultiplier = 1 + (blockLevel - 1) * 0.1;
                newBlock.maxHealth = Math.floor(this.blockHealths[newBlock.type === '캐틀링건' ? '아처' : newBlock.type] * healthMultiplier);
                newBlock.health = newBlock.maxHealth;
                newBlock.attackRange = 300; // 만렙일 때 300으로 증가
            } else {
                newBlock.attackRange = 200; // 기본 발사 범위
            }
            newBlock.isGatling = (newBlock.type === '캐틀링건'); // 캐틀링건 모드
        } else if (newBlock.type === '벽' || newBlock.type === '가시' || newBlock.type === '문') {
            // 벽, 가시, 문: 만렙일 때 체력 증가
            if (blockLevel >= 10) {
                const healthMultiplier = 1 + (blockLevel - 1) * 0.1;
                newBlock.maxHealth = Math.floor(this.blockHealths[newBlock.type] * healthMultiplier);
                newBlock.health = newBlock.maxHealth;
            }
        }
            
            // 아처/캐틀링건 블록의 경우 발사 범위 추가 (위에서 이미 설정했지만 기본값 보장)
            if ((newBlock.type === '아처' || newBlock.type === '캐틀링건') && !newBlock.attackRange) {
                newBlock.attackRange = 200; // 기본 발사 범위
                newBlock.isGatling = (newBlock.type === '캐틀링건'); // 캐틀링건 모드
            }
            
            // 물총 블록의 경우 발사 범위 추가
            if (blockType === '물총') {
                newBlock.attackRange = 300; // 발사 범위 (픽셀)
                newBlock.attackCooldown = 0; // 쿨다운 초기화
            }
            
            // 물대포 블록의 경우 발사 범위 추가
            if (blockType === '물대포') {
                newBlock.attackRange = 400; // 발사 범위 (픽셀)
                newBlock.attackCooldown = 0; // 쿨다운 초기화
            }
            
            // 문 블록의 경우 초기 상태 설정
            if (blockType === '문') {
                newBlock.isOpen = false; // 초기 상태는 닫힘
            }
            
            // 지뢰 블록의 경우 초기 상태 설정
        if (blockType === '지뢰' || blockType === '섬광 지뢰' || blockType === '총알 지뢰') {
                newBlock.pulseTimer = 0; // 맥박 타이머
                newBlock.isExploding = false; // 폭발 중인지
                newBlock.explosionTimer = 0; // 폭발 타이머
                
            // 화염병 블록의 경우 초기 상태 설정
            if (blockType === '화염병') {
                newBlock.hasFired = false; // 발사 여부
                newBlock.range = this.studSize * 2; // 감지 범위
            }
            if (blockType === '섬광 지뢰') {
                newBlock.range = this.studSize * 2.5;
            } else if (blockType === '총알 지뢰') {
                newBlock.range = this.studSize * 2.2;
            } else {
                newBlock.range = this.studSize * 2;
            }
                newBlock.damage = 128; // 대미지
                newBlock.fadeOutTimer = 0; // 페이드아웃 타이머
                newBlock.isFlashMine = blockType === '섬광 지뢰';
            newBlock.isBulletMine = blockType === '총알 지뢰';
            }
        
        this.blocks.push(newBlock);
        
        console.log('설치된 블록:', this.blocks[this.blocks.length - 1]);
        
        // 인벤토리에서 제거
        item.count--;
        if (item.count <= 0) {
            this.inventory.splice(this.selectedInventoryItem, 1);
            this.selectedInventoryItem = null;
        }
    }
    
    deleteBlock(x, y) {
        // 블록 삭제
        const gridX = Math.floor(x / this.studSize);
        const gridY = Math.floor(y / this.studSize);
        
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
            return;
        }
        
        // 클릭한 위치의 블록 찾기
        const blockX = gridX * this.studSize;
        const blockY = gridY * this.studSize;
        const blockIndex = this.blocks.findIndex(b => 
            Math.abs(b.x - blockX) < this.studSize / 2 && 
            Math.abs(b.y - blockY) < this.studSize / 2
        );
        
        if (blockIndex === -1) {
            return; // 블록이 없음
        }
        
        const block = this.blocks[blockIndex];
        
        // 물 블럭은 삭제 불가능
        if (block.type === '물') {
            return;
        }
        
        // 심연블럭은 삭제 가능 (임시 블럭 제외는 유지)
        
        // 임시 블럭은 삭제 불가능
        if (block.isTemporary) {
            return;
        }
        
        // 블록을 인벤토리에 추가 (만렙 블록은 특별한 이름으로 추가)
        let inventoryType = block.type;
        let blockLevel = block.level || 1;
        
        // 만렙 블록(10레벨)은 특별한 이름으로 인벤토리에 추가
        if (block.type === '벽' && blockLevel >= 10) {
            inventoryType = '스펀치 벽';
        } else if (block.type === '가시' && blockLevel >= 10) {
            inventoryType = '자석석';
        } else if ((block.type === '아처' || block.type === '캐틀링건') && blockLevel >= 10) {
            inventoryType = '개틀링 건';
        }
        
        const existingItem = this.inventory.find(item => item.type === inventoryType);
        if (existingItem) {
            // 같은 타입의 아이템이 있으면 개수 증가
            existingItem.count++;
            // 레벨 정보도 저장 (만렙 블록인 경우)
            if (blockLevel >= 10) {
                existingItem.level = blockLevel;
            }
        } else {
            // 새로운 아이템 추가
            const appearFrame = this.inventory.length * this.inventoryAppearDelay;
            const newItem = {
                type: inventoryType,
                count: 1,
                appearFrame: appearFrame
            };
            // 만렙 블록인 경우 레벨 정보도 저장
            if (blockLevel >= 10) {
                newItem.level = blockLevel;
            }
            this.inventory.push(newItem);
        }
        
        // 블록 삭제
        this.blocks.splice(blockIndex, 1);
    }
    
    giveItems() {
        // 제작으로만 가능한 블럭들 (제외할 블럭)
        const craftedOnlyBlocks = ['문', '물블럭', '물먹은스펀지벽', '나무(제작용)', '석궁', '지뢰', '섬광 지뢰', '총알 지뢰', '빛(제작용)', '색상(제작용)'];
        
        // 게임에 존재하는 모든 블록 타입 (제작으로만 가능한 블럭 제외)
        const allItemTypes = ['스펀치 벽', '개틀링 건', '자석석', '깊은물블럭', '심연블럭', '벽', '아처', '가시', '물블럭', '물총', '물대포', '제작대'];
        
        // 각 아이템 타입에 대해
        for (let itemType of allItemTypes) {
            // 인벤토리에서 해당 타입 찾기
            const existingItem = this.inventory.find(item => item.type === itemType);
            
            if (existingItem) {
                // 이미 있으면 99개로 설정
                existingItem.count = 99;
            } else {
                // 없으면 새로 추가 (99개, 즉시 표시되도록 appearFrame을 0으로 설정)
                this.inventory.push({
                    type: itemType,
                    count: 99,
                    appearFrame: 0 // 즉시 표시
                });
            }
        }
        
        // 경험치 99999 지급
        this.experience = 99999;
    }
    
    upgradeBlock(x, y) {
        // 블록 업그레이드
        const gridX = Math.floor(x / this.studSize);
        const gridY = Math.floor(y / this.studSize);
        
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
            return; // 그리드 범위 밖
        }
        
        const blockX = gridX * this.studSize;
        const blockY = gridY * this.studSize;
        
        // 블록 찾기
        const blockIndex = this.blocks.findIndex(b => 
            Math.abs(b.x - blockX) < this.studSize / 2 && 
            Math.abs(b.y - blockY) < this.studSize / 2
        );
        
        if (blockIndex === -1) {
            return; // 블록이 없음
        }
        
        const block = this.blocks[blockIndex];
        
        // 업그레이드 가능한 블록 타입인지 확인
        const upgradeableTypes = ['벽', '아처', '캐틀링건', '석궁', '가시', '문', '물블럭', '물총', '깊은물블럭'];
        if (!upgradeableTypes.includes(block.type)) {
            return;
        }
        
        // 레벨이 없으면 기본값 1로 설정
        if (!block.level) {
            block.level = 1;
        }
        
        // 최대 레벨 확인 (물블럭은 10레벨, 물총은 30레벨, 깊은물블럭은 30레벨까지)
        if (block.type === '물블럭' && block.level >= 10) {
            // 물블럭 10레벨이면 깊은물블럭으로 변환
            block.type = '깊은물블럭';
            block.level = 1; // 깊은물블럭은 1레벨부터 시작
            block.maxHealth = this.blockHealths['깊은물블럭'];
            block.health = block.maxHealth;
            return; // 변환만 하고 업그레이드는 하지 않음
        } else if (block.type === '물총' && block.level >= 30) {
            // 물총 30레벨이면 물대포로 변환
            block.type = '물대포';
            block.level = 1; // 물대포는 1레벨부터 시작
            block.maxHealth = this.blockHealths['물총'];
            block.health = block.maxHealth;
            block.attackCooldown = 0; // 공격 쿨타임 초기화
            return; // 변환만 하고 업그레이드는 하지 않음
        } else if (block.type === '깊은물블럭' && block.level >= 30) {
            // 깊은물블럭 30레벨이면 심연블럭으로 변환
            block.type = '심연블럭';
            block.level = 1; // 심연블럭은 1레벨부터 시작
            block.maxHealth = this.blockHealths['심연블럭'];
            block.health = block.maxHealth;
            return; // 변환만 하고 업그레이드는 하지 않음
        } else if (block.type === '심연블럭') {
            // 심연블럭은 1레벨이 최대레벨 (더 이상 업그레이드 불가)
            if (block.level >= 1) {
                return; // 이미 만렙
            }
        } else if (block.type === '깊은물블럭') {
            // 깊은물블럭은 최대레벨이 없음 (계속 업그레이드 가능)
            // 최대레벨 체크 제거
        } else if (block.type === '물대포') {
            // 물대포는 1레벨이 최대레벨 (더 이상 업그레이드 불가)
            if (block.level >= 1) {
                return; // 이미 만렙
            }
        } else if (block.level >= 10) {
            return; // 이미 만렙
        }
        
        // 블록 업그레이드 비용 계산 (레벨 5까지는 50씩, 5를 넘으면 25씩 증가)
        let blockUpgradeCost;
        if (block.level <= 5) {
            blockUpgradeCost = this.blockUpgradeBaseCost + (block.level - 1) * 50;
        } else {
            // 레벨 5까지: 200 + 4 * 50 = 400
            // 레벨 6 이상: 400 + (레벨 - 5) * 25
            blockUpgradeCost = this.blockUpgradeBaseCost + 4 * 50 + (block.level - 5) * 25;
        }
        
        // 경험치 확인
        if (this.experience < blockUpgradeCost) {
            return; // 경험치 부족
        }
        
        // 업그레이드 실행
        block.level++;
        this.experience -= blockUpgradeCost;
        
        // 석궁(아처)이 만렙이 되면 캐틀링건으로 변환
        if (block.type === '아처' && block.level >= 10) {
            block.type = '캐틀링건';
        }
        
        // 블록 타입별 업그레이드 효과
        if (block.type === '물블럭' || block.type === '깊은물블럭' || block.type === '심연블럭') {
            // 물블럭 계열: 체력 증가 (레벨당 10% 증가)
            const healthMultiplier = 1 + (block.level - 1) * 0.1;
            block.maxHealth = Math.floor(this.blockHealths[block.type] * healthMultiplier);
            block.health = block.maxHealth;
        } else if (block.type === '아처' || block.type === '캐틀링건') {
            // 아처/캐틀링건는 레벨에 따라 효과가 다름
            const blockLevel = block.level || 1;
            
            // 만렙(10레벨)일 때 체력, 공격 범위, 데미지 증가
            if (blockLevel >= 10) {
                // 체력 증가 (만렙일 때만)
                const healthMultiplier = 1 + (blockLevel - 1) * 0.1;
                block.maxHealth = Math.floor(this.blockHealths[block.type === '캐틀링건' ? '아처' : block.type] * healthMultiplier);
                block.health = block.maxHealth;
                
                // 공격 범위 증가 (만렙일 때 1.5배)
                if (!block.attackRange) block.attackRange = 200;
                block.attackRange = 300; // 만렙일 때 300으로 증가
            }
            
            // 공격속도는 attackCooldown 감소로 구현 (레벨당 10% 감소)
            // 실제 쿨다운은 updateArchers에서 레벨에 따라 계산됨
        } else if (block.type === '가시') {
            // 가시: 체력 증가 (레벨당 10% 증가)
            const healthMultiplier = 1 + (block.level - 1) * 0.1;
            block.maxHealth = Math.floor(this.blockHealths[block.type] * healthMultiplier);
            block.health = block.maxHealth;
        } else {
            // 벽: 체력 증가 (레벨당 10% 증가)
            const healthMultiplier = 1 + (block.level - 1) * 0.1;
            block.maxHealth = Math.floor(this.blockHealths[block.type] * healthMultiplier);
            block.health = block.maxHealth; // 체력도 최대치로 회복
        }
    }
    
    upgradePlayerStat(statType) {
        // 플레이어 스탯 업그레이드 (damage, health, speed)
        const upgrade = this.playerUpgrades[statType];
        if (!upgrade) return;
        
        // 최대 레벨 확인
        if (statType === 'range') {
            // 사거리는 11레벨까지 가능
            if (upgrade.level >= 11) {
                return; // 이미 만렙
            }
        } else {
            // 다른 업그레이드는 10레벨까지
        if (upgrade.level >= 10) {
            return; // 이미 만렙
            }
        }
        
        // 업그레이드 비용 계산
        let cost;
        if (statType === 'range') {
            if (upgrade.level === 10) {
                // 11레벨은 50000 경험치
                cost = 50000;
            } else {
                // 사거리: 처음 50, 레벨당 +25
                cost = 50 + (upgrade.level - 1) * 25;
            }
        } else {
            // 다른 업그레이드: 기본 비용 + 레벨당 100
            cost = upgrade.baseCost + (upgrade.level - 1) * 100;
        }
        
        // 경험치 확인
        if (this.experience < cost) {
            return; // 경험치 부족
        }
        
        // 업그레이드 실행
        upgrade.level++;
        this.experience -= cost;
        
        // 스탯 적용
        if (statType === 'damage') {
            // 대미지 업그레이드 (레벨당 1.1배씩 증가)
            // 기본 데미지 2, 레벨 n일 때: 2 * 1.1^(n-1)
            this.swordAttack.damage = 2 * Math.pow(1.1, upgrade.level - 1);
        } else if (statType === 'health') {
            // 체력 업그레이드 (레벨당 +10)
            const newMaxHealth = 100 + (upgrade.level - 1) * 10;
            const healthRatio = this.health / (100 + (upgrade.level - 2) * 10 || 100);
            this.health = Math.floor(newMaxHealth * healthRatio);
            if (this.health > newMaxHealth) this.health = newMaxHealth;
        } else if (statType === 'speed') {
            // 속도 업그레이드 (레벨당 +0.5)
            this.player.speed = 3 + (upgrade.level - 1) * 0.5;
            if (upgrade.level >= 10) {
                this.unlockFlashbang('speed_max');
            }
        } else if (statType === 'range') {
            // 사거리 업그레이드 (레벨당 +10)
            this.swordAttack.length = 120 + (upgrade.level - 1) * 10;
            
            // 10레벨이면 10레벨 칼 (데미지 11)
            if (upgrade.level === 10) {
                this.swordAttack.damage = 11; // 10레벨 칼 데미지
            }
            
            // 11레벨이면 미니건 사용 가능
            if (upgrade.level === 11) {
                this.selectedWeapon = 'minigun'; // 자동으로 미니건 선택
            }
        }
    }
    
    fireGun(angle) {
        // 총 발사
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const bulletSpeed = 15;
        
        this.playerBullets.push({
            x: playerCenterX,
            y: playerCenterY,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            damage: 10, // 총알 데미지 10
            radius: 5
        });
    }
    
    fireMinigun(angle) {
        // 미니건 발사 (데미지 10, 매우 빠른 공속)
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const bulletSpeed = 15;
        
        this.playerBullets.push({
            x: playerCenterX,
            y: playerCenterY,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            damage: 10, // 미니건 데미지 10
            radius: 5
        });
    }
    
    updatePlayerBullets() {
        // 플레이어 총알 업데이트
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            
            // 총알 이동
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            // 화면 밖으로 나가면 제거
            if (bullet.x < 0 || bullet.x > this.canvas.width ||
                bullet.y < 0 || bullet.y > this.canvas.height) {
                this.playerBullets.splice(i, 1);
                continue;
            }
            
            // 적과 충돌 체크
            let hitEnemy = false;
            for (let j = 0; j < this.enemies.length; j++) {
                const enemy = this.enemies[j];
                
                // 뱀은 세그먼트별로 체크
                if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                    for (let k = 0; k < enemy.segments.length; k++) {
                        const segment = enemy.segments[k];
                        const dx = bullet.x - segment.x;
                        const dy = bullet.y - segment.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < bullet.radius + segment.radius) {
                            // 세그먼트에 데미지
                            segment.health -= bullet.damage;
                            if (segment.health < 0) segment.health = 0;
                            
                            // 체력바 표시
                            segment.showHealthBar = true;
                            
                            this.playerBullets.splice(i, 1);
                            hitEnemy = true;
                            break;
                        }
                    }
                    if (hitEnemy) break;
                } else {
                    // 일반 적
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < bullet.radius + enemy.radius) {
                        // 기사는 방어력 먼저 감소 (체력처럼 직접 감소)
                        if (enemy.type === 'knight') {
                            if (enemy.armor === undefined) enemy.armor = 50;
                            
                            // 방어력이 있으면 방어력 먼저 감소
                            if (enemy.armor > 0) {
                                enemy.armor -= bullet.damage;
                                if (enemy.armor < 0) enemy.armor = 0;
                            } else {
                                // 방어력이 0이면 체력 감소
                                enemy.health -= bullet.damage;
                            }
                        }
                        // 군인은 방어력 먼저 감소
                        else if (enemy.type === 'soldier') {
                            if (enemy.armor === undefined) enemy.armor = 50; // 처음 생성될 때만 초기화
                            if (!enemy.armorDamage) enemy.armorDamage = 0;
                            
                            // 방어력에 피해 누적 (50 피해를 받아야 1씩 깎임)
                            enemy.armorDamage += bullet.damage;
                            
                            // 50 피해를 받으면 방어력 1 감소
                            if (enemy.armorDamage >= 50) {
                                const armorReduction = Math.floor(enemy.armorDamage / 50);
                                enemy.armor -= armorReduction;
                                enemy.armorDamage = enemy.armorDamage % 50;
                                
                                if (enemy.armor < 0) enemy.armor = 0;
                            }
                            
                            // 방어력이 모두 닳지 않으면 체력 무적
                            if (enemy.armor > 0) {
                                // 방어력이 있으면 체력에 데미지 안 들어감 (무적)
                            } else {
                                // 방어력이 0이 되어야 체력 감소 (총알 대미지는 그대로)
                                enemy.health -= bullet.damage;
                                if (enemy.health < 0) enemy.health = 0;
                            }
                        } else {
                            // 적에게 데미지
                            enemy.health -= bullet.damage;
                            if (enemy.health < 0) enemy.health = 0;
                        }
                        
                        // 체력바 표시
                        enemy.showHealthBar = true;
                        
                        this.playerBullets.splice(i, 1);
                        hitEnemy = true;
                        break;
                    }
                }
            }
            
            if (hitEnemy) continue;
            
            // 보스와 충돌 체크
            if (this.boss) {
                const dx = bullet.x - this.boss.x;
                const dy = bullet.y - this.boss.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < bullet.radius + this.boss.radius) {
                    // 보스에게 데미지
                    this.boss.health -= bullet.damage;
                    if (this.boss.health < 0) this.boss.health = 0;
                    
                    this.playerBullets.splice(i, 1);
                    continue;
                }
            }
            
            // 블록과 충돌 체크 (플레이어 총알은 블록을 부수지 않음, 단지 통과하지 못함)
            for (let block of this.blocks) {
                if (block.type !== '벽') continue;
                
                const blockCenterX = block.x + this.studSize / 2;
                const blockCenterY = block.y + this.studSize / 2;
                const dx = bullet.x - blockCenterX;
                const dy = bullet.y - blockCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.studSize / 2 + bullet.radius) {
                    // 플레이어 총알은 블록에 데미지를 주지 않고 총알만 제거
                    this.playerBullets.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    checkBlockCollision(x, y, width, height) {
        // 블록과의 충돌 체크 (벽, 닫힌 문, 깊은물블럭만 충돌)
        for (let block of this.blocks) {
            if (block.type === '벽') {
                // 벽은 항상 충돌
            } else if (block.type === '물먹은스펀지벽') {
                // 물먹은스펀지벽은 플레이어가 통과 불가
            } else if (block.type === '가시가있는벽') {
                // 가시가있는벽은 플레이어가 통과 불가
            } else if (block.type === '모래벽') {
                // 모래벽은 플레이어가 통과 불가
            } else if (block.type === '깊은물블럭') {
                // 깊은물블럭은 플레이어가 통과 불가
            } else if (block.type === '심연블럭') {
                // 심연블럭은 플레이어가 통과 불가
            } else if (block.type === '문') {
                // 문은 열려있을 때만 통과 가능 (닫혀있으면 충돌)
                if (block.isOpen) {
                    continue; // 열려있으면 통과
                }
                // 닫혀있으면 충돌 (아래 코드 실행)
            } else {
                continue; // 다른 블록은 통과
            }
            
            const blockSize = this.studSize;
            if (!(x + width < block.x ||
                  x > block.x + blockSize ||
                  y + height < block.y ||
                  y > block.y + blockSize)) {
                return true;
            }
        }
        return false;
    }
    
    checkEnemyBlockCollision(enemyX, enemyY, enemyRadius) {
        // 적과 블록의 충돌 체크 (벽과 닫힌 문만 충돌)
        for (let block of this.blocks) {
            if (block.type === '벽') {
                // 벽은 항상 충돌
            } else if (block.type === '물먹은스펀지벽') {
                // 물먹은스펀지벽은 적이 통과 불가
            } else if (block.type === '가시가있는벽') {
                // 가시가있는벽은 적이 통과 불가
            } else if (block.type === '모래벽') {
                // 모래벽은 적이 통과 불가
            } else if (block.type === '문') {
                // 문은 열려있을 때만 통과 가능 (닫혀있으면 충돌)
                if (block.isOpen) {
                    continue; // 열려있으면 통과
                }
                // 닫혀있으면 충돌 (아래 코드 실행)
            } else {
                continue; // 다른 블록은 통과
            }
            
            const blockSize = this.studSize;
            const blockCenterX = block.x + blockSize / 2;
            const blockCenterY = block.y + blockSize / 2;
            
            // 가장 가까운 점 찾기
            const closestX = Math.max(block.x, Math.min(enemyX, block.x + blockSize));
            const closestY = Math.max(block.y, Math.min(enemyY, block.y + blockSize));
            
            // 거리 계산
            const dx = enemyX - closestX;
            const dy = enemyY - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < enemyRadius) {
                return { block: block, distance: distance, dx: dx, dy: dy };
            }
        }
        return null;
    }
    
    checkEnemyWallCollision(x, y, width, height) {
        // 플레이어와 적 벽의 충돌 체크 (플레이어만 막음, 적은 통과 가능)
        for (let wall of this.enemyWalls) {
            if (!(x + width < wall.x ||
                  x > wall.x + wall.width ||
                  y + height < wall.y ||
                  y > wall.y + wall.height)) {
                return true;
            }
        }
        return false;
    }
    
    checkEnemySpikeCollision(enemyX, enemyY, enemyRadius) {
        // 적과 가시 블록의 충돌 체크 (통과 가능한 블록 위에 있어도 공격)
        // 적이 아처나 가시 블록 위에 있어도 가시 블록과 충돌하면 데미지를 받음
        for (let block of this.blocks) {
            if (block.type !== '가시') continue;
            
            const blockSize = this.studSize;
            const blockCenterX = block.x + blockSize / 2;
            const blockCenterY = block.y + blockSize / 2;
            
            // 적이 가시 블록의 범위 내에 있는지 확인
            // 통과 가능한 블록(아처, 가시) 위에 있어도 가시 블록과 충돌하면 공격
            const dx = enemyX - blockCenterX;
            const dy = enemyY - blockCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 가시 블록의 범위는 블록 크기의 절반 + 적 반지름
            // 통과 가능한 블록 위에 있어도 가시 블록과 충돌하면 공격
            const spikeRange = blockSize / 2 + enemyRadius;
            
            if (distance < spikeRange) {
                // 통과 가능한 블록 위에 있어도 가시 블록과 충돌하면 공격
                return block;
            }
        }
        return null;
    }
    
    updateSnake(snake, index) {
        // 뱀 업데이트 (꼬불꼬불하게 플레이어를 향해 이동)
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        // 머리 위치
        const head = snake.segments[0];
        
        // 플레이어 방향 계산
        const dx = playerCenterX - head.x;
        const dy = playerCenterY - head.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 독 뱀 특수 동작
        if (snake.type === 'poisonSnake') {
            const desiredDistance = 250; // 플레이어와 유지할 거리 (더 많이 벌림)
            
            // 발사체 쿨다운 감소
            if (!snake.projectileCooldown) snake.projectileCooldown = 0;
            if (snake.projectileCooldown > 0) {
                snake.projectileCooldown--;
            }
            
            // 플레이어 방향으로 독 발사체 발사 (2초마다)
            if (snake.projectileCooldown === 0 && distance > 0) {
                const angle = Math.atan2(dy, dx);
                const projectileSpeed = 4;
                
                this.enemyProjectiles.push({
                    x: head.x,
                    y: head.y,
                    vx: Math.cos(angle) * projectileSpeed,
                    vy: Math.sin(angle) * projectileSpeed,
                    damage: 1, // 즉시 1 대미지
                    radius: 5,
                    isPoison: true, // 독 발사체 표시
                    poisonDamage: 1 // 독으로 1 대미지 추가 (총 2 대미지)
                });
                
                snake.projectileCooldown = 120; // 2초 쿨다운
            }
            
            // 플레이어와 일정 거리 유지
        if (distance > 0) {
                if (distance < desiredDistance) {
                    // 너무 가까우면 멀어지는 방향으로 이동
                    const angle = Math.atan2(dy, dx) + Math.PI; // 반대 방향
                    const moveDistance = desiredDistance - distance;
                    const newHeadX = head.x + Math.cos(angle) * moveDistance * 0.1;
                    const newHeadY = head.y + Math.sin(angle) * moveDistance * 0.1;
                    
                    const blockCollision = this.checkEnemyBlockCollision(newHeadX, newHeadY, head.radius);
                    if (!blockCollision) {
                        head.x = newHeadX;
                        head.y = newHeadY;
                        snake.x = head.x;
                        snake.y = head.y;
                    }
                } else if (distance > desiredDistance + 50) {
                    // 너무 멀면 가까워지는 방향으로 이동
                    const angle = Math.atan2(dy, dx);
                    const targetAngle = angle;
                    let angleDiff = targetAngle - snake.direction;
                    
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    const turnSpeed = 0.1;
                    snake.direction += angleDiff * turnSpeed;
                    
                    while (snake.direction > Math.PI * 2) snake.direction -= Math.PI * 2;
                    while (snake.direction < 0) snake.direction += Math.PI * 2;
                    
                    const speed = snake.speed;
                    const newHeadX = head.x + Math.cos(snake.direction) * speed;
                    const newHeadY = head.y + Math.sin(snake.direction) * speed;
                    
                    const blockCollision = this.checkEnemyBlockCollision(newHeadX, newHeadY, head.radius);
                    if (!blockCollision) {
                        head.x = newHeadX;
                        head.y = newHeadY;
                        snake.x = head.x;
                        snake.y = head.y;
                    }
                } else {
                    // 적절한 거리면 원을 그리며 이동
                    const angle = Math.atan2(dy, dx) + Math.PI / 2; // 플레이어 주위를 도는 방향
                    const targetAngle = angle;
                    let angleDiff = targetAngle - snake.direction;
                    
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    const turnSpeed = 0.1;
                    snake.direction += angleDiff * turnSpeed;
                    
                    while (snake.direction > Math.PI * 2) snake.direction -= Math.PI * 2;
                    while (snake.direction < 0) snake.direction += Math.PI * 2;
                    
                    const speed = snake.speed;
                    const newHeadX = head.x + Math.cos(snake.direction) * speed;
                    const newHeadY = head.y + Math.sin(snake.direction) * speed;
                    
                    const blockCollision = this.checkEnemyBlockCollision(newHeadX, newHeadY, head.radius);
                    if (!blockCollision) {
                        head.x = newHeadX;
                        head.y = newHeadY;
                        snake.x = head.x;
                        snake.y = head.y;
                    }
                }
            }
        } else if (distance > 0) {
            // 일반 뱀: 플레이어를 향해 이동
            // 목표 각도
            const targetAngle = Math.atan2(dy, dx);
            
            // 현재 방향과 목표 각도의 차이
            let angleDiff = targetAngle - snake.direction;
            
            // 각도를 -π ~ π 범위로 정규화
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // 꼬불꼬불하게 이동 (각도 변화를 부드럽게)
            const turnSpeed = 0.1; // 회전 속도
            snake.direction += angleDiff * turnSpeed;
            
            // 방향 정규화
            while (snake.direction > Math.PI * 2) snake.direction -= Math.PI * 2;
            while (snake.direction < 0) snake.direction += Math.PI * 2;
            
            // 머리 이동
            const speed = snake.speed;
            const newHeadX = head.x + Math.cos(snake.direction) * speed;
            const newHeadY = head.y + Math.sin(snake.direction) * speed;
            
            // 블록 충돌 체크
            const blockCollision = this.checkEnemyBlockCollision(newHeadX, newHeadY, head.radius);
            if (!blockCollision) {
                head.x = newHeadX;
                head.y = newHeadY;
                snake.x = head.x; // 뱀의 x, y는 머리 위치
                snake.y = head.y;
            }
            }
            
            // 몸통 세그먼트들이 머리를 따라가도록
            for (let i = 1; i < snake.segments.length; i++) {
                const segment = snake.segments[i];
                const prevSegment = snake.segments[i - 1];
                
                // 이전 세그먼트 방향 계산
                const segDx = prevSegment.x - segment.x;
                const segDy = prevSegment.y - segment.y;
                const segDistance = Math.sqrt(segDx * segDx + segDy * segDy);
                
                // 세그먼트 간격 유지
                const desiredDistance = segment.radius + prevSegment.radius;
                if (segDistance > desiredDistance) {
                    const moveDistance = segDistance - desiredDistance;
                    if (segDistance > 0) {
                        segment.x += (segDx / segDistance) * moveDistance;
                        segment.y += (segDy / segDistance) * moveDistance;
                }
            }
        }
        
        // 플레이어와 충돌 체크 (각 세그먼트별로)
        const playerCenterX2 = this.player.x + this.player.width / 2;
        const playerCenterY2 = this.player.y + this.player.height / 2;
        const playerRadius = Math.max(this.player.width, this.player.height) / 2;
        
        for (let i = 0; i < snake.segments.length; i++) {
            const segment = snake.segments[i];
            const segDx = playerCenterX2 - segment.x;
            const segDy = playerCenterY2 - segment.y;
            const segDistance = Math.sqrt(segDx * segDx + segDy * segDy);
            
            if (segDistance < playerRadius + segment.radius) {
                // 플레이어가 몸통에 닿으면 체력 표시
                if (i > 0) { // 머리가 아닌 몸통에 닿았을 때
                    segment.showHealthBar = true;
                }
                
                // 플레이어에게 데미지 (머리만)
                if (i === 0 && snake.attackCooldown === 0) {
                    // 즉시 데미지 5
                    this.health -= 5;
                    if (this.health < 0) this.health = 0;
                    
                    // 피격 색상 적용 (넉백은 없음 - 뱀)
                    this.playerHitColorTimer = 10; // 10프레임 동안 빨강
                    
                    // 독 효과 적용 (1 데미지씩 20번 = 20 데미지)
                    this.poisonEffect.active = true;
                    this.poisonEffect.damage = 20; // 총 20데미지
                    this.poisonEffect.initialDamage = 20; // 초기 데미지 (뱀 독 구분용)
                    this.poisonEffect.timer = 0; // 타이머 초기화
                    
                    snake.attackCooldown = 60; // 1초 쿨다운
                    this.updateHealthDisplay();
                    
                    if (this.health <= 0 && !this.gameOver) {
                        this.monsterName = '뱀';
                        this.saveGameState(); // 게임 상태 저장
                        this.gameOver = true;
                    }
                }
            }
        }
        
        // 머리가 죽으면 모든 세그먼트 제거
        if (head.health <= 0) {
            // 머리 경험치: 일반 뱀 100, 원거리 뱀(poisonSnake) 250
            const headExpValue = snake.type === 'poisonSnake' ? 250 : 100;
            this.experienceOrbs.push({
                x: head.x,
                y: head.y,
                expValue: headExpValue,
                radius: 10,
                collected: false,
                isBossOrb: false,
                isPoisonOrb: snake.type === 'poisonSnake' // 독 뱀만 독 효과 경험치 구슬
            });
            
            this.enemies.splice(index, 1);
            return;
        }
        
        // 몸통 세그먼트 체력이 0 이하인 것 제거 (머리는 제외)
        for (let i = snake.segments.length - 1; i >= 1; i--) {
            const segment = snake.segments[i];
            if (segment.health <= 0) {
                // 몸통 세그먼트가 죽으면 경험치 구슬 생성
                // 몸통 경험치 = 머리 경험치 / 몸통 개수
                const bodyCount = snake.bodySegmentCount || Math.max(snake.segments.length - 1, 1);
                const headExpValue = snake.type === 'poisonSnake' ? 250 : 100;
                const bodyExpValue = headExpValue / bodyCount;
                
                this.experienceOrbs.push({
                    x: segment.x,
                    y: segment.y,
                    expValue: bodyExpValue,
                    radius: 10,
                    collected: false,
                    isBossOrb: false,
                    isPoisonOrb: false
                });
                
                snake.segments.splice(i, 1);
            }
        }
    }
    
    checkEnemyOnBlock(enemyX, enemyY, enemyRadius, blockType) {
        // 적이 특정 타입의 블록 위에 올라갔는지 확인
        for (let block of this.blocks) {
            if (block.type !== blockType) continue;
            
            const blockSize = this.studSize;
            const blockCenterX = block.x + blockSize / 2;
            const blockCenterY = block.y + blockSize / 2;
            
            // 가장 가까운 점 찾기
            const closestX = Math.max(block.x, Math.min(enemyX, block.x + blockSize));
            const closestY = Math.max(block.y, Math.min(enemyY, block.y + blockSize));
            
            // 거리 계산
            const dx = enemyX - closestX;
            const dy = enemyY - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < enemyRadius) {
                return block;
            }
        }
        return null;
    }
    
    getTileAt(gridX, gridY) {
        if (gridX < 0 || gridX >= this.gridWidth || 
            gridY < 0 || gridY >= this.gridHeight) {
            return null;
        }
        return this.grid[gridY][gridX];
    }
    
    drawRoundedRect(x, y, width, height, radius) {
        // 둥근 모서리 사각형 그리기
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.stroke();
    }
    
    draw() {
        try {
            // Canvas 컨텍스트 유효성 확인
            if (!this.ctx || !this.canvas) {
                return;
            }
            
            // 메인 메뉴가 표시되어 있으면 메뉴만 렌더링
            if (this.showMainMenu) {
                this.drawMainMenu();
                return;
            }
            
            // 바닥 배경 (5번째 웨이브부터 조금 붉게, 6번째부터 다시 회색, 10번째는 파란색, 15번째는 매우 짙은 초록, 20번째는 각 스터드마다 랜덤 갈색, 21-30번째는 각 스터드마다 랜덤 사막 색상, 10 이후는 짙은 초록)
            if (this.waveNumber === 30) {
                // 30스테이지: 흑백 바닥
                const grayScaleColors = [
                    '#ffffff', // 흰색
                    '#e0e0e0', // 밝은 회색
                    '#c0c0c0', // 회색
                    '#a0a0a0', // 중간 회색
                    '#808080', // 어두운 회색
                    '#606060', // 더 어두운 회색
                    '#404040', // 매우 어두운 회색
                    '#202020', // 거의 검은색
                    '#000000'  // 검은색
                ];
                
                // 각 스터드를 개별적으로 그리기
                for (let x = 0; x < this.gridWidth; x++) {
                    for (let y = 0; y < this.gridHeight; y++) {
                        // 각 스터드의 위치를 기반으로 고정된 랜덤 색상 선택 (깜빡임 방지)
                        const seed = x * 1000 + y;
                        const colorIndex = seed % grayScaleColors.length;
                        this.ctx.fillStyle = grayScaleColors[colorIndex];
                        this.ctx.fillRect(x * this.studSize, y * this.studSize, this.studSize, this.studSize);
                    }
                }
            } else if (this.waveNumber === 25) {
                // 25스테이지: 바닥을 살짝 어둡게
                const darkDesertColors = [
                    '#b8860b', // 다크골든로드 (어두운 버전)
                    '#8b7355', // 카키 (어두운 버전)
                    '#6b5b3d', // 어두운 갈색
                    '#5c4a2e', // 더 어두운 갈색
                    '#4d3a1f', // 매우 어두운 갈색
                    '#a0522d', // 시에나 (약간 밝게)
                    '#8b4513', // 새들브라운
                    '#654321', // 다크브라운
                    '#5c4033', // 매우 어두운 갈색
                    '#4a3520'  // 거의 검은 갈색
                ]; // 어두운 사막 색상 팔레트
                
                // 각 스터드를 개별적으로 그리기
                for (let x = 0; x < this.gridWidth; x++) {
                    for (let y = 0; y < this.gridHeight; y++) {
                        // 각 스터드의 위치를 기반으로 고정된 랜덤 색상 선택 (깜빡임 방지)
                        const seed = x * 1000 + y;
                        const colorIndex = seed % darkDesertColors.length;
                        this.ctx.fillStyle = darkDesertColors[colorIndex];
                        this.ctx.fillRect(x * this.studSize, y * this.studSize, this.studSize, this.studSize);
                    }
                }
            } else if (this.waveNumber >= 21 && this.waveNumber <= 30) {
                // 21-24, 26-29스테이지: 각 스터드마다 랜덤 사막 색상 (전쟁터 느낌)
                const desertColors = [
                    '#f4a460', // 모래색
                    '#daa520', // 골든로드
                    '#cd853f', // 페루
                    '#d2691e', // 초콜릿
                    '#b8860b', // 다크골든로드
                    '#a0522d', // 시에나
                    '#8b7355', // 카키
                    '#c19a6b', // 카멜
                    '#deb887', // 버윅우드
                    '#d2b48c'  // 탄
                ]; // 사막/전쟁터 색상 팔레트
                
                // 각 스터드를 개별적으로 그리기
                for (let x = 0; x < this.gridWidth; x++) {
                    for (let y = 0; y < this.gridHeight; y++) {
                        // 각 스터드의 위치를 기반으로 고정된 랜덤 색상 선택 (깜빡임 방지)
                        const seed = x * 1000 + y;
                        const colorIndex = seed % desertColors.length;
                        this.ctx.fillStyle = desertColors[colorIndex];
                        this.ctx.fillRect(x * this.studSize, y * this.studSize, this.studSize, this.studSize);
                    }
                }
            } else if (this.waveNumber === 20) {
                // 20스테이지: 각 스터드마다 랜덤 갈색
                const brownColors = ['#d2b48c', '#deb887', '#c9a982', '#8b4513', '#654321', '#5c4033']; // 연한 갈색과 짙은 갈색
                
                // 각 스터드를 개별적으로 그리기
                for (let x = 0; x < this.gridWidth; x++) {
                    for (let y = 0; y < this.gridHeight; y++) {
                        // 각 스터드의 위치를 기반으로 고정된 랜덤 색상 선택 (깜빡임 방지)
                        const seed = x * 1000 + y;
                        const colorIndex = seed % brownColors.length;
                        this.ctx.fillStyle = brownColors[colorIndex];
                        this.ctx.fillRect(x * this.studSize, y * this.studSize, this.studSize, this.studSize);
                    }
                }
            } else {
                // 다른 스테이지는 전체 바닥을 한 번에 그리기
                if (this.waveNumber === 15) {
                    this.ctx.fillStyle = '#1a3d0a'; // 매우 짙은 초록색
                } else if (this.waveNumber > 10) {
                this.ctx.fillStyle = '#2d5016'; // 짙은 초록색
            } else if (this.waveNumber >= 10) {
                this.ctx.fillStyle = '#4a90e2'; // 파란색
            } else if (this.waveNumber >= 6) {
                this.ctx.fillStyle = '#808080'; // 회색
            } else if (this.waveNumber >= 5) {
                this.ctx.fillStyle = '#a08080'; // 약간 붉은 회색
            } else {
                this.ctx.fillStyle = '#808080'; // 회색
            }
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
            
            // 물 웅덩이는 블럭으로 그려지므로 여기서는 제거
            
            // 스터드 구분선 그리기 (작고 둥근 모서리)
            this.ctx.strokeStyle = '#666666';
            this.ctx.lineWidth = 1.5;
            
            // 세로선 그리기 (화면 전체)
            for (let x = 0; x <= this.gridWidth; x++) {
                const lineX = x * this.studSize;
                const lineSize = 2; // 작은 선 두께
                const radius = 1; // 둥근 모서리 반지름
                
                // 작은 둥근 세로선 (화면 높이까지)
                this.drawRoundedRect(
                    lineX - lineSize / 2, 
                    0, 
                    lineSize, 
                    this.canvas.height, 
                    radius
                );
            }
            
            // 가로선 그리기 (화면 전체)
            for (let y = 0; y <= this.gridHeight; y++) {
                const lineY = y * this.studSize;
                const lineSize = 2; // 작은 선 두께
                const radius = 1; // 둥근 모서리 반지름
                
                // 작은 둥근 가로선 (화면 너비까지)
                this.drawRoundedRect(
                    0, 
                    lineY - lineSize / 2, 
                    this.canvas.width, 
                    lineSize, 
                    radius
                );
            }
            
            
            // 블록 설치 미리보기 (인벤토리 아이템이 선택되어 있고 창이 닫혀있을 때)
            if (!this.inventoryOpen && this.selectedInventoryItem !== null && 
                this.inventory[this.selectedInventoryItem] && !this.gameOver && !this.showRewardSelection) {
                const previewGridX = Math.floor(this.mouse.x / this.studSize);
                const previewGridY = Math.floor(this.mouse.y / this.studSize);
                
                if (previewGridX >= 0 && previewGridX < this.gridWidth && 
                    previewGridY >= 0 && previewGridY < this.gridHeight) {
                    const previewX = previewGridX * this.studSize;
                    const previewY = previewGridY * this.studSize;
                    
                    // 이미 블록이 있는지 확인
                    const existingBlock = this.blocks.find(b => 
                        Math.abs(b.x - previewX) < this.studSize / 2 && 
                        Math.abs(b.y - previewY) < this.studSize / 2
                    );
                    
                    // 블록이 없을 때만 미리보기 표시
                    if (!existingBlock) {
                        const selectedItem = this.inventory[this.selectedInventoryItem];
                        
                        // 중앙 기준 반투명 빨강색 배경
                        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                        this.ctx.fillRect(previewX, previewY, this.studSize, this.studSize);
                        
                        // 연한 빨강 반투명 테두리
                        this.ctx.strokeStyle = 'rgba(255, 150, 150, 0.6)';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(previewX, previewY, this.studSize, this.studSize);
                        
                        // 아처인 경우 히트박스도 표시
                        if (selectedItem.type === '아처') {
                            const previewCenterX = previewX + this.studSize / 2;
                            const previewCenterY = previewY + this.studSize / 2;
                            const attackRange = 200; // 발사 범위 (픽셀)
                            
                            // 히트박스 그리기 (원거리 무기 - 아처에만)
                            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // 반투명 노란색
                            this.ctx.lineWidth = 2;
                            this.ctx.beginPath();
                            this.ctx.arc(previewCenterX, previewCenterY, attackRange, 0, Math.PI * 2);
                            this.ctx.stroke();
                        }
                    }
                }
            }
            
            // 블록 그리기
            for (let block of this.blocks) {
                const blockSize = this.studSize;
                
                // 블록 타입에 따른 색상 (명시적으로 설정)
                // 디버깅: 블록 타입 확인
                if (!block.type) {
                    console.warn('블록 타입이 없습니다:', block);
                }
                
                if (block.type === '벽') {
                    const blockLevel = block.level || 1;
                    const isMaxLevel = blockLevel >= 10;
                    
                    // 벽 블록: 만렙일 때만 연두색, 아니면 갈색
                    const bounceScale = block.bounceScale || 1.0;
                    const centerX = block.x + blockSize / 2;
                    const centerY = block.y + blockSize / 2;
                    const scaledSize = blockSize * bounceScale;
                    const offsetX = (scaledSize - blockSize) / 2;
                    const offsetY = (scaledSize - blockSize) / 2;
                    
                    // 만렙일 때만 연두색, 아니면 갈색
                    this.ctx.fillStyle = isMaxLevel ? '#90ee90' : '#8b4513'; // 만렙: 연두색, 일반: 갈색
                    this.ctx.fillRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 애니메이션 업데이트 (튕기는 효과가 있으면 점점 작아짐)
                    if (block.bounceScale && block.bounceScale > 1.0) {
                        block.bounceScale = Math.max(1.0, block.bounceScale - 0.1); // 빠르게 원래 크기로
                    }
                } else if (block.type === '물먹은스펀지벽') {
                    // 물먹은스펀지벽: 하늘색과 갈색의 중간 색상
                    const bounceScale = block.bounceScale || 1.0;
                    const scaledSize = blockSize * bounceScale;
                    const offsetX = (scaledSize - blockSize) / 2;
                    const offsetY = (scaledSize - blockSize) / 2;
                    
                    // 하늘색 배경
                    this.ctx.fillStyle = '#87ceeb'; // 하늘색
                    this.ctx.fillRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 갈색 패턴 추가 (스펀지 느낌)
                    this.ctx.fillStyle = '#8b4513'; // 갈색
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            if ((i + j) % 2 === 0) {
                                const patternSize = scaledSize / 3;
                                this.ctx.fillRect(
                                    block.x - offsetX + i * patternSize,
                                    block.y - offsetY + j * patternSize,
                                    patternSize,
                                    patternSize
                                );
                            }
                        }
                    }
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 애니메이션 업데이트 (튕기는 효과가 있으면 점점 작아짐)
                    if (block.bounceScale && block.bounceScale > 1.0) {
                        block.bounceScale = Math.max(1.0, block.bounceScale - 0.1);
                    }
                } else if (block.type === '모래벽') {
                    // 모래벽: 연한 노란색
                    const bounceScale = block.bounceScale || 1.0;
                    const scaledSize = blockSize * bounceScale;
                    const offsetX = (scaledSize - blockSize) / 2;
                    const offsetY = (scaledSize - blockSize) / 2;
                    
                    // 연한 노란색 배경
                    this.ctx.fillStyle = '#fffacd'; // 연한 노란색
                    this.ctx.fillRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 애니메이션 업데이트 (튕기는 효과가 있으면 점점 작아짐)
                    if (block.bounceScale && block.bounceScale > 1.0) {
                        block.bounceScale = Math.max(1.0, block.bounceScale - 0.1);
                    }
                } else if (block.type === '가시가있는벽') {
                    // 가시가있는벽: 갈색 배경에 가시 패턴
                    const bounceScale = block.bounceScale || 1.0;
                    const scaledSize = blockSize * bounceScale;
                    const offsetX = (scaledSize - blockSize) / 2;
                    const offsetY = (scaledSize - blockSize) / 2;
                    
                    // 갈색 배경
                    this.ctx.fillStyle = '#8b4513'; // 갈색
                    this.ctx.fillRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 가시 패턴 추가
                    const centerX = block.x - offsetX + scaledSize / 2;
                    const centerY = block.y - offsetY + scaledSize / 2;
                    this.ctx.strokeStyle = '#ff6b6b'; // 빨간색 가시
                    this.ctx.fillStyle = '#ff6b6b';
                    this.ctx.lineWidth = 2;
                    
                    // 4방향 가시
                    const spikeLength = scaledSize / 4;
                    const directions = [
                        { x: 0, y: -1 }, // 위
                        { x: 1, y: 0 },  // 오른쪽
                        { x: 0, y: 1 },  // 아래
                        { x: -1, y: 0 }  // 왼쪽
                    ];
                    
                    for (let dir of directions) {
                        const startX = centerX + dir.x * (scaledSize / 4);
                        const startY = centerY + dir.y * (scaledSize / 4);
                        const endX = centerX + dir.x * spikeLength;
                        const endY = centerY + dir.y * spikeLength;
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(startX, startY);
                        this.ctx.lineTo(endX, endY);
                        this.ctx.stroke();
                    }
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 애니메이션 업데이트 (튕기는 효과가 있으면 점점 작아짐)
                    if (block.bounceScale && block.bounceScale > 1.0) {
                        block.bounceScale = Math.max(1.0, block.bounceScale - 0.1);
                    }
                } else if (block.type === '섬광탄') {
                    // 섬광탄 블럭: 밝은 빛나는 느낌의 하얀색
                    const bounceScale = block.bounceScale || 1.0;
                    const scaledSize = blockSize * bounceScale;
                    const offsetX = (scaledSize - blockSize) / 2;
                    const offsetY = (scaledSize - blockSize) / 2;
                    const centerX = block.x - offsetX + scaledSize / 2;
                    const centerY = block.y - offsetY + scaledSize / 2;
                    
                    // 빛나는 효과용 그라데이션
                    const gradient = this.ctx.createRadialGradient(
                        centerX, centerY, scaledSize * 0.1,
                        centerX, centerY, scaledSize * 0.6
                    );
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(1, '#e6e6e6');
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 테두리는 밝은 노란색으로 살짝 빛나게
                    this.ctx.strokeStyle = '#fff6bf';
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeRect(block.x - offsetX, block.y - offsetY, scaledSize, scaledSize);
                    
                    // 교차하는 빛무늬
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(centerX, block.y - offsetY + 5);
                    this.ctx.lineTo(centerX, block.y - offsetY + scaledSize - 5);
                    this.ctx.moveTo(block.x - offsetX + 5, centerY);
                    this.ctx.lineTo(block.x - offsetX + scaledSize - 5, centerY);
                    this.ctx.stroke();
                    
                    // 애니메이션 (튕김) 처리
                    if (block.bounceScale && block.bounceScale > 1.0) {
                        block.bounceScale = Math.max(1.0, block.bounceScale - 0.1);
                    }
                } else if (block.type === '아처' || block.type === '캐틀링건' || block.type === '석궁') {
                    // 아처/캐틀링건/석궁 배경
                    const isGatling = block.type === '캐틀링건';
                    const isCrossbow = block.type === '석궁';
                    if (isGatling) {
                        this.ctx.fillStyle = '#808080'; // 캐틀링건은 회색
                    } else if (isCrossbow) {
                        this.ctx.fillStyle = '#8b4513'; // 석궁은 갈색
                    } else {
                        this.ctx.fillStyle = '#4a90e2'; // 아처는 파란색
                    }
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 블록 테두리
                    if (isGatling) {
                        this.ctx.strokeStyle = '#606060'; // 캐틀링건은 어두운 회색
                    } else if (isCrossbow) {
                        this.ctx.strokeStyle = '#654321'; // 석궁은 어두운 갈색
                    } else {
                        this.ctx.strokeStyle = '#2e5c8a'; // 아처는 어두운 파란색
                    }
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    
                    // 아처/캐틀링건 중심점
                    const centerX = block.x + blockSize / 2;
                    const centerY = block.y + blockSize / 2;
        
                    // 발사 범위 초기화
                    if (!block.attackRange) {
                        block.attackRange = 200; // 발사 범위 (픽셀)
                    }
                    
                    // 히트박스 범위 내의 가장 가까운 적 찾기
                    let targetAngle = 0; // 기본 각도 (위쪽)
                    let targetEnemy = null;
                    let closestDistance = Infinity;
                    
                    for (let enemy of this.enemies) {
                        const dx = enemy.x - centerX;
                        const dy = enemy.y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // 히트박스 범위 내에 있는지 확인
                        if (distance <= block.attackRange) {
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                targetEnemy = enemy;
                                // 화살촉이 위쪽을 향하므로, 적을 향하도록 각도 계산
                                // Math.atan2(dy, dx)는 오른쪽이 0도, 시계방향
                                // 위쪽이 0도가 되도록 하려면 Math.atan2(dx, -dy) 사용
                                targetAngle = Math.atan2(dx, -dy);
                            }
                        }
                    }
                    
                    // 히트박스 그리기 (원거리 무기 - 아처/캐틀링건에만)
                    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // 반투명 노란색
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, block.attackRange, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // 캐틀링건이면 캐틀링건 아이콘, 석궁이면 석궁 아이콘, 아니면 십자가 그리기
                    if (isGatling) {
                        // 캐틀링건 아이콘 그리기
                        this.drawGatlingIcon(centerX, centerY, blockSize * 0.6);
                    } else if (isCrossbow) {
                        // 석궁 그리기 (가시쪽(화살촉)이 적을 향함)
                        this.ctx.save();
                        this.ctx.translate(centerX, centerY);
                        // 화살촉이 적을 향하도록 각도 조정
                        if (targetEnemy) {
                            this.ctx.rotate(targetAngle);
                        }
                        
                        // 석궁 모양 (갈색)
                        this.ctx.strokeStyle = '#654321'; // 어두운 갈색 테두리
                        this.ctx.fillStyle = '#8b4513'; // 갈색
                        this.ctx.lineWidth = 3;
                        
                        // 석궁 몸체 (가로선)
                        this.ctx.beginPath();
                        this.ctx.moveTo(-blockSize / 2 + 5, 0);
                        this.ctx.lineTo(blockSize / 2 - 5, 0);
                        this.ctx.stroke();
                        
                        // 석궁 활시위 (세로선)
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, -blockSize / 2 + 5);
                        this.ctx.lineTo(0, blockSize / 2 - 5);
                        this.ctx.stroke();
                        
                        // 화살촉 (위쪽이 적을 향함)
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, -blockSize / 2 + 5);
                        this.ctx.lineTo(-5, -blockSize / 2 + 15);
                        this.ctx.lineTo(5, -blockSize / 2 + 15);
                        this.ctx.closePath();
                        this.ctx.fill();
                        this.ctx.stroke();
                        
                        this.ctx.restore();
                    } else {
                        // 십자가 그리기 (아처, 가시쪽(화살촉)이 적을 향함)
                        this.ctx.save();
                        this.ctx.translate(centerX, centerY);
                        // 화살촉이 적을 향하도록 각도 조정
                        if (targetEnemy) {
                            this.ctx.rotate(targetAngle);
                        }
                        
                        // 십자가 모양
                        this.ctx.strokeStyle = '#2e5c8a'; // 어두운 파란색 테두리
                        this.ctx.fillStyle = '#4a90e2'; // 파란색
                        this.ctx.lineWidth = 3;
                        
                        // 세로선 (가시쪽이 적을 향함)
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, -blockSize / 2 + 5);
                        this.ctx.lineTo(0, blockSize / 2 - 5);
                        this.ctx.stroke();
                        
                        // 가로선
                        this.ctx.beginPath();
                        this.ctx.moveTo(-blockSize / 2 + 5, 0);
                        this.ctx.lineTo(blockSize / 2 - 5, 0);
                        this.ctx.stroke();
                        
                        // 화살촉 (위쪽이 적을 향함)
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, -blockSize / 2 + 5);
                        this.ctx.lineTo(-5, -blockSize / 2 + 15);
                        this.ctx.lineTo(5, -blockSize / 2 + 15);
                        this.ctx.closePath();
                        this.ctx.fill();
                        this.ctx.stroke();
                        
                        this.ctx.restore();
                    }
                } else if (block.type === '가시') {
                    const blockLevel = block.level || 1;
                    const isMaxLevel = blockLevel >= 10;
                    
                    if (isMaxLevel) {
                        // 만렙 가시: 가시가 둘러싼 네모 형태, 짙은 빨강색
                        const centerX = block.x + blockSize / 2;
                        const centerY = block.y + blockSize / 2;
                        
                        // 짙은 빨강 네모
                        this.ctx.fillStyle = '#8b0000'; // 짙은 빨강
                        this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                        
                        // 블록 테두리
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                        
                        // 가시들이 둘러싸고 있음 (8방향)
                        this.ctx.save();
                        this.ctx.translate(centerX, centerY);
                        
                        this.ctx.strokeStyle = '#8b0000'; // 짙은 빨강
                        this.ctx.fillStyle = '#8b0000'; // 짙은 빨강
                        this.ctx.lineWidth = 3;
                        
                        // 가시들 (8방향)
                        const spikeCount = 8;
                        const spikeLength = blockSize / 2 - 2;
                        for (let i = 0; i < spikeCount; i++) {
                            const angle = (Math.PI * 2 * i) / spikeCount;
                            const startX = Math.cos(angle) * (blockSize / 4);
                            const startY = Math.sin(angle) * (blockSize / 4);
                            const endX = Math.cos(angle) * spikeLength;
                            const endY = Math.sin(angle) * spikeLength;
                            
                            this.ctx.beginPath();
                            this.ctx.moveTo(startX, startY);
                            this.ctx.lineTo(endX, endY);
                            this.ctx.stroke();
                        }
                        
                        this.ctx.restore();
                        
                        // 만렙 가시 히트박스 그리기 (작은 히트박스)
                        const hitboxRadius = blockSize * 2; // 블록 크기의 2배
                        this.ctx.strokeStyle = 'rgba(139, 0, 0, 0.5)'; // 반투명 짙은 빨강
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, centerY, hitboxRadius, 0, Math.PI * 2);
                        this.ctx.stroke();
                    } else {
                        // 일반 가시: 기본 빨간색 네모 형태
                        this.ctx.fillStyle = '#ff6b6b'; // 빨간색
                        this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                        
                        // 블록 테두리
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    }
                } else if (block.type === '물') {
                    // 물 블럭 (파란색 네모)
                    this.ctx.fillStyle = 'rgba(100, 150, 255, 0.6)'; // 반투명 파란색
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = 'rgba(50, 100, 200, 0.8)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                } else if (block.type === '물블럭') {
                    // 물 블럭 (하늘색 불투명)
                    // 임시 블럭인 경우 페이드 아웃 처리
                    let alpha = 0.8;
                    if (block.isTemporary && block.fadeOut) {
                        const fadeProgress = block.fadeOutTimer / 120; // 2초 = 120프레임
                        alpha = 0.8 * (1 - fadeProgress);
                    }
                    
                    this.ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`; // 하늘색 불투명
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = `rgba(135, 206, 235, ${alpha})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    
                    // 물 튀김 효과 (파티클)
                    if (Math.random() < 0.1) {
                        this.createWaterParticles(block.x + blockSize / 2, block.y + blockSize / 2);
                    }
                } else if (block.type === '물총') {
                    // 물총 블럭 (파란색)
                    this.ctx.fillStyle = '#4a90e2'; // 파란색
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = '#2e5c8a';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    
                    // 물총 아이콘 (총 모양)
                    const centerX = block.x + blockSize / 2;
                    const centerY = block.y + blockSize / 2;
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillRect(centerX - 5, centerY - 10, 10, 20);
                    this.ctx.fillRect(centerX - 8, centerY + 10, 16, 5);
                    
                    // 발사 범위 초기화
                    if (!block.attackRange) {
                        block.attackRange = 300; // 넓은 사거리
                    }
                    
                    // 히트박스 그리기
                    this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)'; // 반투명 파란색
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, block.attackRange, 0, Math.PI * 2);
                    this.ctx.stroke();
                } else if (block.type === '물대포') {
                    // 물대포 블럭 (진한 파란색)
                    this.ctx.fillStyle = '#1e3a8a'; // 진한 파란색
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = '#1e40af';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    
                    // 물대포 아이콘 (대포 모양)
                    const centerX = block.x + blockSize / 2;
                    const centerY = block.y + blockSize / 2;
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillRect(centerX - 8, centerY - 12, 16, 24);
                    this.ctx.fillRect(centerX - 10, centerY + 12, 20, 6);
                } else if (block.type === '깊은물블럭') {
                    // 깊은 물 블럭 (진한 파란색)
                    this.ctx.fillStyle = '#1e3a8a'; // 진한 파란색
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = '#000080';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                } else if (block.type === '심연블럭') {
                    // 심연 블럭 (검은색)
                    this.ctx.fillStyle = '#000000'; // 검은색
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 블록 테두리 (약간의 빛나는 효과)
                    this.ctx.strokeStyle = '#333333';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                } else if (block.type === '문') {
                    // 문 블럭
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const blockCenterX = block.x + blockSize / 2;
                    const blockCenterY = block.y + blockSize / 2;
                    
                    const dx = playerCenterX - blockCenterX;
                    const dy = playerCenterY - blockCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 플레이어가 가까이 있으면 반투명 (적도 통과 가능)
                    const openRange = 100; // 문 열림 범위
                    const isOpen = distance < openRange;
                    
                    if (isOpen) {
                        // 반투명 (적도 통과 가능)
                        this.ctx.fillStyle = 'rgba(150, 150, 150, 0.5)'; // 반투명 회색
                        block.isOpen = true;
                    } else {
                        // 불투명 (플레이어만 통과 가능)
                        this.ctx.fillStyle = 'rgba(150, 150, 150, 1.0)'; // 불투명 회색
                        block.isOpen = false;
                    }
                    
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 블록 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    
                    // 문 아이콘 (중앙에 세로선)
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(block.x + blockSize / 2, block.y + 5);
                    this.ctx.lineTo(block.x + blockSize / 2, block.y + blockSize - 5);
                    this.ctx.stroke();
                } else if (block.type === '지뢰' || block.type === '섬광 지뢰' || block.type === '총알 지뢰') {
                    // 지뢰 블럭
                    const centerX = block.x + blockSize / 2;
                    const centerY = block.y + blockSize / 2;
                    const isFlashMine = block.type === '섬광 지뢰';
                    const isBulletMine = block.type === '총알 지뢰';
                    
                    // 맥박 타이머 업데이트
                    if (!block.isExploding) {
                        block.pulseTimer = (block.pulseTimer || 0) + 1;
                    }
                    
                    // 맥박 효과 (0~60 프레임 사이에서 1.0~1.3 사이를 오가도록)
                    const pulsePhase = (block.pulseTimer % 60) / 60;
                    const pulseScale = 1.0 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);
                    
                    // 폭발 시 맥박이 엄청 커짐
                    let explosionScale = 1.0;
                    if (block.isExploding) {
                        block.explosionTimer = (block.explosionTimer || 0) + 1;
                        const growthDuration = isFlashMine ? 15 : 30;
                        explosionScale = 1.0 + (block.explosionTimer / growthDuration) * 4.0;
                        if (explosionScale > 5.0) explosionScale = 5.0;
                    }
                    
                    // 페이드아웃 효과
                    let fadeAlpha = 1.0;
                    const fadeStart = isFlashMine ? 15 : 30;
                    const fadeDuration = isFlashMine ? 10 : 30;
                    if (block.isExploding && block.explosionTimer > fadeStart) {
                        block.fadeOutTimer = (block.fadeOutTimer || 0) + 1;
                        fadeAlpha = Math.max(0, 1.0 - (block.fadeOutTimer / fadeDuration));
                    }
                    
                    // 배경 채우기
                    if (!block.isExploding) {
                        if (isFlashMine) {
                            this.ctx.fillStyle = '#fff8c8';
                        } else if (isBulletMine) {
                            this.ctx.fillStyle = '#b0d9ff';
                        } else {
                            this.ctx.fillStyle = '#ffc4d6';
                        }
                        this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    }

                    // 테두리
                    // 두꺼운 테두리
                    this.ctx.strokeStyle = '#808080';
                    this.ctx.lineWidth = 4; // 두꺼운 선
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    
                    // 빛 효과
                    const lightRadius = (blockSize * 0.3 * pulseScale * explosionScale);
                    const lightGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, lightRadius);
                    if (block.isExploding) {
                        // 폭발 시 빛이 엄청 커짐
                        const bigLightRadius = blockSize * 5 * explosionScale;
                        if (isFlashMine) {
                            lightGradient.addColorStop(0, `rgba(255, 255, 200, ${0.8 * fadeAlpha})`);
                            lightGradient.addColorStop(0.5, `rgba(255, 255, 200, ${0.4 * fadeAlpha})`);
                            lightGradient.addColorStop(1, `rgba(255, 255, 200, 0)`);
                        } else if (isBulletMine) {
                            lightGradient.addColorStop(0, `rgba(173, 216, 230, ${0.8 * fadeAlpha})`);
                            lightGradient.addColorStop(0.5, `rgba(173, 216, 230, ${0.4 * fadeAlpha})`);
                            lightGradient.addColorStop(1, `rgba(173, 216, 230, 0)`);
                        } else {
                            lightGradient.addColorStop(0, `rgba(255, 192, 203, ${0.8 * fadeAlpha})`);
                            lightGradient.addColorStop(0.5, `rgba(255, 192, 203, ${0.4 * fadeAlpha})`);
                            lightGradient.addColorStop(1, `rgba(255, 192, 203, 0)`);
                        }
                        this.ctx.fillStyle = lightGradient;
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, centerY, bigLightRadius, 0, Math.PI * 2);
                        this.ctx.fill();
                    } else {
                        if (isFlashMine) {
                            lightGradient.addColorStop(0, 'rgba(255, 255, 200, 0.65)');
                            lightGradient.addColorStop(0.5, 'rgba(224, 255, 185, 0.35)');
                        } else if (isBulletMine) {
                            lightGradient.addColorStop(0, 'rgba(135, 206, 235, 0.6)');
                            lightGradient.addColorStop(0.5, 'rgba(135, 206, 235, 0.3)');
                        } else {
                            lightGradient.addColorStop(0, 'rgba(255, 192, 203, 0.6)');
                            lightGradient.addColorStop(0.5, 'rgba(255, 192, 203, 0.3)');
                        }
                        lightGradient.addColorStop(1, 'rgba(255, 192, 203, 0)');
                        this.ctx.fillStyle = lightGradient;
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, centerY, lightRadius, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                    
                    // 별 그리기 (반투명 핑크색)
                    const starSize = blockSize * 0.15 * pulseScale * explosionScale;
                    this.ctx.save();
                    this.ctx.translate(centerX, centerY);
                    this.ctx.globalAlpha = 0.7 * fadeAlpha;
                    this.ctx.fillStyle = isFlashMine ? '#baff6d' : isBulletMine ? '#c6f2ff' : '#ff69b4';
                    this.ctx.beginPath();
                    // 5각 별 그리기
                    for (let i = 0; i < 5; i++) {
                        const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                        const x = Math.cos(angle) * starSize;
                        const y = Math.sin(angle) * starSize;
                        if (i === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    }
                    this.ctx.closePath();
                    this.ctx.fill();
                    if (isFlashMine) {
                        this.ctx.fillStyle = '#ffef5a';
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, starSize * 0.45, 0, Math.PI * 2);
                        this.ctx.fill();
                    } else if (isBulletMine) {
                        this.ctx.fillStyle = '#00a2ff';
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, starSize * 0.45, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                    this.ctx.restore();
                    
                    // 하얀 동그라미 (별 안에)
                    const circleSize = starSize * 0.4 * pulseScale * explosionScale;
                    this.ctx.save();
                    this.ctx.translate(centerX, centerY);
                    this.ctx.globalAlpha = 0.9 * fadeAlpha;
                    this.ctx.fillStyle = '#ffffff'; // 하얀색
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, circleSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                    
                    // 폭발 후 검은색 그라데이션으로 변하면서 사라짐
                    if (block.isExploding && block.explosionTimer > 30) {
                        const fadeProgress = block.fadeOutTimer / 30;
                        const blackGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, blockSize * 5 * explosionScale);
                        blackGradient.addColorStop(0, `rgba(0, 0, 0, ${fadeProgress})`);
                        blackGradient.addColorStop(0.5, `rgba(0, 0, 0, ${fadeProgress * 0.7})`);
                        blackGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
                        this.ctx.fillStyle = blackGradient;
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, centerY, blockSize * 5 * explosionScale, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                } else if (block.type === '화염병') {
                    // 화염병 블록
                    const centerX = block.x + blockSize / 2;
                    const centerY = block.y + blockSize / 2;
                    
                    // 빨강 배경
                    this.ctx.fillStyle = '#ff0000'; // 빨강
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                    
                    // 어두운 빨강 테두리
                    this.ctx.strokeStyle = '#8b0000'; // 어두운 빨강
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    
                    // 가운데 어두운 빨강 동그라미
                    this.ctx.fillStyle = '#8b0000'; // 어두운 빨강
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, blockSize * 0.3, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 범위 표시 (적이 감지되면 어두운 초록 테두리)
                    if (block.hasFired) {
                        this.ctx.strokeStyle = '#006400'; // 어두운 초록
                        this.ctx.lineWidth = 3;
                        this.ctx.strokeRect(block.x, block.y, blockSize, blockSize);
                    }
                } else {
                    // 기본 색상 (예상치 못한 타입)
                    console.warn('알 수 없는 블록 타입:', block.type);
                    this.ctx.fillStyle = '#808080'; // 회색
                    this.ctx.fillRect(block.x, block.y, blockSize, blockSize);
                }
                
                // 업그레이드 모드일 때 블록에 레벨 및 비용 표시
                if (this.upgradeMode) {
                    // 레벨이 없으면 기본값 1로 표시
                    const blockLevel = block.level || 1;
                    const centerX = block.x + blockSize / 2;
                    const centerY = block.y + blockSize / 2;
                    
                    // 업그레이드 비용 계산
                    // 블록 업그레이드 비용 계산 (레벨 5까지는 50씩, 5를 넘으면 25씩 증가)
                    let blockUpgradeCost;
                    if (blockLevel <= 5) {
                        blockUpgradeCost = this.blockUpgradeBaseCost + (blockLevel - 1) * 50;
                    } else {
                        // 레벨 5까지: 200 + 4 * 50 = 400
                        // 레벨 6 이상: 400 + (레벨 - 5) * 25
                        blockUpgradeCost = this.blockUpgradeBaseCost + 4 * 50 + (blockLevel - 5) * 25;
                    }
                    
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 16px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(`${blockLevel} 레벨`, centerX, centerY - 10);
                    
                    // 비용 표시 (만렙이 아닐 때만)
                    if (block.type === '깊은물블럭') {
                        // 깊은물블럭은 맥스레벨이 없음 (계속 비용 표시)
                        this.ctx.font = 'bold 12px Arial';
                        this.ctx.fillText(`${blockUpgradeCost} XP`, centerX, centerY + 10);
                    } else if (block.type === '심연블럭' || block.type === '물대포') {
                        // 심연블럭과 물대포는 1레벨이 맥스
                        if (blockLevel >= 1) {
                            this.ctx.font = 'bold 12px Arial';
                            this.ctx.fillText('MAX', centerX, centerY + 10);
                        } else {
                            this.ctx.font = 'bold 12px Arial';
                            this.ctx.fillText(`${blockUpgradeCost} XP`, centerX, centerY + 10);
                        }
                    } else if (blockLevel < 10) {
                        this.ctx.font = 'bold 12px Arial';
                        this.ctx.fillText(`${blockUpgradeCost} XP`, centerX, centerY + 10);
                    } else {
                        // 만렙일 때 MAX 표시
                        this.ctx.font = 'bold 12px Arial';
                        this.ctx.fillText('MAX', centerX, centerY + 10);
                    }
                }
                
                // 만렙 아처에만 캐틀링건 변환 버튼 영역 저장 (캐틀링건은 버튼 표시 안 함)
                if (block.type === '아처' && (block.level || 1) >= 10 && !this.waveStarted && !this.gameOver && !this.showRewardSelection) {
                    const buttonSize = 20;
                    // 블록 오른쪽 위 모서리에 표시
                    const buttonX = block.x + blockSize - buttonSize / 2;
                    const buttonY = block.y - buttonSize / 2;
                    
                    // 버튼 영역 저장 (블록 인덱스로 구분)
                    const blockIndex = this.blocks.indexOf(block);
                    if (!this.gatlingButtonAreas) {
                        this.gatlingButtonAreas = {};
                    }
                    this.gatlingButtonAreas[blockIndex] = {
                        x: buttonX - buttonSize / 2,
                        y: buttonY,
                        width: buttonSize,
                        height: buttonSize,
                        blockIndex: blockIndex,
                        centerX: buttonX,
                        centerY: buttonY + buttonSize / 2,
                        isGatling: false // 아처만 버튼 표시
                    };
                }
                
                // 체력 표시 (체력이 깎였을 때, 아처/캐틀링건 제외)
                if (block.type !== '아처' && block.type !== '캐틀링건' && block.health < block.maxHealth) {
                    const healthPercent = block.health / block.maxHealth;
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    this.ctx.fillRect(block.x, block.y + blockSize * (1 - healthPercent), blockSize, blockSize * healthPercent);
                }
            }
            
            // 캐틀링건 변환 버튼 그리기 (모든 블록을 그린 후에)
            // 주의: 아처만 버튼 표시, 캐틀링건은 버튼 표시 안 함
            if (this.gatlingButtonAreas && !this.waveStarted && !this.gameOver && !this.showRewardSelection) {
                for (let blockIndex in this.gatlingButtonAreas) {
                    const buttonArea = this.gatlingButtonAreas[blockIndex];
                    if (!buttonArea) continue;
                    
                    // 해당 블록이 아직 아처인지 확인 (캐틀링건이면 버튼 표시 안 함)
                    const block = this.blocks[buttonArea.blockIndex];
                    if (!block || block.type !== '아처') continue;
                    
                    const buttonSize = 20;
                    
                    // 파란색 동그라미 그리기
                    this.ctx.fillStyle = '#0066ff'; // 파란색
                    this.ctx.beginPath();
                    this.ctx.arc(buttonArea.centerX, buttonArea.centerY, buttonSize / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 테두리
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            }
            
            // 아처 발사체 그리기
            for (let projectile of this.archerProjectiles) {
                this.ctx.fillStyle = projectile.color || '#4a90e2'; // 파란색
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 발사체 테두리
                this.ctx.strokeStyle = projectile.color || '#2e5c8a'; // 어두운 파란색
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            // 대포 발사체 그리기
            for (let projectile of this.cannonProjectiles) {
                // 회색 동그라미
                this.ctx.fillStyle = '#888888'; // 회색
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 검정 테두리
                this.ctx.strokeStyle = '#000000'; // 검정
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            // 화염병 발사체 그리기
            for (let projectile of this.gasolineBombProjectiles) {
                // 어두운 초록 테두리
                this.ctx.strokeStyle = '#006400'; // 어두운 초록
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // 노란빛 하양 가운데 동그라미
                this.ctx.fillStyle = '#fffacd'; // 노란빛 하양
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius * 0.6, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 플레이어 총알 그리기
            for (let bullet of this.playerBullets) {
                this.ctx.fillStyle = '#ffff00'; // 노란색
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 총알 테두리
                this.ctx.strokeStyle = '#ffaa00'; // 진한 노란색
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            // 물대포 타겟 히트박스 그리기 (빨간색)
            for (let target of this.waterCannonTargets) {
                if (target.timer > 0) {
                    // 사격 준비 중인 타겟에 빨간색 히트박스 표시
                    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // 빨간색 반투명
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(target.x, target.y, target.hitboxRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }
            
            // 물총 발사체 그리기
            for (let projectile of this.waterGunProjectiles) {
                this.ctx.fillStyle = '#0096ff'; // 파란색
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 발사체 테두리
                this.ctx.strokeStyle = '#0066cc'; // 진한 파란색
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            // 적 발사체 그리기 (석궁 동그라미용, 독 뱀용, 화염 동그라미용)
            for (let projectile of this.enemyProjectiles) {
                if (projectile.type === 'fire') {
                    // 화염 발사체: 빨간색
                    this.ctx.fillStyle = '#ff4444'; // 빨간색
                } else if (projectile.type === 'tank') {
                    // 탱크 총알: 노란색
                    this.ctx.fillStyle = projectile.color || '#ffff00'; // 노란색
                } else if (projectile.type === 'tankSpecial') {
                    // 탱크 특수 공격: 어두운 빨강
                    this.ctx.fillStyle = projectile.color || '#8b0000'; // 어두운 빨강
                } else if (projectile.isPoison) {
                    // 독 발사체: 보라색
                    this.ctx.fillStyle = '#8b00ff'; // 보라색
                } else if (projectile.type === 'flash') {
                    // 섬광 발사체: 노란색 (렌더링하지 않거나 투명하게)
                    continue; // 섬광 발사체는 렌더링하지 않음
                } else {
                    // 일반 발사체: 갈색
                    this.ctx.fillStyle = '#8b4513'; // 갈색
                }
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 발사체 테두리
                if (projectile.type === 'fire') {
                    this.ctx.strokeStyle = '#cc0000'; // 진한 빨강
                } else if (projectile.type === 'tank') {
                    this.ctx.strokeStyle = '#cccc00'; // 진한 노란색
                } else if (projectile.type === 'tankSpecial') {
                    this.ctx.strokeStyle = '#660000'; // 매우 어두운 빨강
                } else if (projectile.isPoison) {
                    this.ctx.strokeStyle = '#6a0080'; // 진한 보라색
                } else {
                    this.ctx.strokeStyle = '#654321'; // 진한 갈색
                }
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            // 적 벽 그리기 (주황색)
            for (let wall of this.enemyWalls) {
                this.ctx.fillStyle = '#ff8800'; // 주황색
                this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
                
                // 테두리
                this.ctx.strokeStyle = '#cc6600'; // 진한 주황색
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
            }
            
            // 적 그리기
            for (let enemy of this.enemies) {
                // 가시 위에 있는지 확인
                const spikeBlock = this.checkEnemySpikeCollision(enemy.x, enemy.y, enemy.radius);
                // 체력바 표시: 가시 위에 있거나 공격받았을 때
                const showHealthBar = spikeBlock !== null || enemy.showHealthBar;
                
                // 기절 상태 확인
                const isStunned = this.enemyStunTimers[enemy.id] && this.enemyStunTimers[enemy.id] > 0;
                
                // 심연블럭 투명도 적용
                const alpha = enemy.abyssAlpha !== undefined ? enemy.abyssAlpha : 1.0;
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                
                // 기절 상태일 때 회색으로 표시
                if (isStunned) {
                    this.ctx.globalAlpha = alpha * 0.5; // 반투명
                }
                
                // 타입에 따라 색상 변경
                if (enemy.type === 'defense') {
                    // 방어 동그라미: 이미지가 있으면 사용
                    if (this.enemyImages['defense'] && this.enemyImages['defense'].complete && this.enemyImages['defense'].naturalWidth > 0) {
                        const spriteScale = 1.25;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            this.enemyImages['defense'],
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기존 색상 원으로 표시
                        this.ctx.fillStyle = '#ffaa44'; // 연한 주황색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 주황색 테두리
                        this.ctx.strokeStyle = '#ff8800'; // 주황색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                } else if (enemy.type === 'sharp') {
                    if (this.enemyImages['sharp'] && this.enemyImages['sharp'].complete && this.enemyImages['sharp'].naturalWidth > 0) {
                        const spriteScale = 1.25;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            this.enemyImages['sharp'],
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 날카로운 동그라미: 회색
                        this.ctx.fillStyle = '#999999'; // 회색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 진한 회색 테두리
                        this.ctx.strokeStyle = '#666666'; // 진한 회색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                } else if (enemy.type === 'archer') {
                    if (this.enemyImages['archer'] && this.enemyImages['archer'].complete && this.enemyImages['archer'].naturalWidth > 0) {
                        const spriteScale = 1.25;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            this.enemyImages['archer'],
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 석궁 동그라미: 연한 빨강
                        this.ctx.fillStyle = '#ff9999'; // 연한 빨강
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 빨간 테두리
                        this.ctx.strokeStyle = '#ff0000'; // 빨간색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                        
                        // 석궁 모양 그리기 (플레이어 방향으로)
                        const playerCenterX = this.player.x + this.player.width / 2;
                        const playerCenterY = this.player.y + this.player.height / 2;
                        const dx = playerCenterX - enemy.x;
                        const dy = playerCenterY - enemy.y;
                        const angle = Math.atan2(dy, dx);
                        
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.rotate(angle);
                        
                        // 석궁 모양 (아처와 동일)
                        this.ctx.strokeStyle = '#2e5c8a'; // 어두운 파란색 테두리
                        this.ctx.fillStyle = '#4a90e2'; // 파란색
                        this.ctx.lineWidth = 2;
                        
                        // 세로선
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, -enemy.radius * 0.8);
                        this.ctx.lineTo(0, enemy.radius * 0.8);
                        this.ctx.stroke();
                        
                        // 가로선
                        this.ctx.beginPath();
                        this.ctx.moveTo(-enemy.radius * 0.8, 0);
                        this.ctx.lineTo(enemy.radius * 0.8, 0);
                        this.ctx.stroke();
                        
                        // 석궁 모양 (화살촉)
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, -enemy.radius * 0.8);
                        this.ctx.lineTo(-5, -enemy.radius * 0.8 + 10);
                        this.ctx.lineTo(5, -enemy.radius * 0.8 + 10);
                        this.ctx.closePath();
                        this.ctx.fill();
                        this.ctx.stroke();
                        
                        this.ctx.restore();
                    }
                } else if (enemy.type === 'flash') {
                    // 섬광 동그라미: e-12 이미지 사용
                    const flashImage = this.enemyImages['flash'];
                    const hasFlashImage = flashImage && flashImage.complete && flashImage.naturalWidth > 0;
                    
                    if (hasFlashImage) {
                        const spriteScale = 1.25;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            flashImage,
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기본 노란 동그라미 스타일
                        this.ctx.fillStyle = '#ffff99'; // 연한 노랑
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        this.ctx.strokeStyle = '#ffcc00'; // 노랑 테두리
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                } else if (enemy.type === 'fire') {
                    // 화염 동그라미: e-13 이미지 사용
                    const fireImage = this.enemyImages['fire'];
                    const hasFireImage = fireImage && fireImage.complete && fireImage.naturalWidth > 0;
                    
                    if (hasFireImage) {
                        const spriteScale = 1.25;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            fireImage,
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기본 빨간 동그라미 스타일
                        this.ctx.fillStyle = '#ff6666'; // 연한 빨강
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        this.ctx.strokeStyle = '#ff0000'; // 빨강 테두리
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                } else if (enemy.type === 'knight') {
                    // 기사: e-10 이미지 사용
                    if (this.enemyImages['knight'] && this.enemyImages['knight'].complete && this.enemyImages['knight'].naturalWidth > 0) {
                        const spriteScale = 1.25;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            this.enemyImages['knight'],
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기존 스타일로 표시 (회색 기사)
                        this.ctx.fillStyle = '#bbbbbb';
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        this.ctx.strokeStyle = '#888888';
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                } else if (enemy.type === 'monkey') {
                    const originalAlpha = this.ctx.globalAlpha;
                    const isInvincible = enemy.invincibleTimer && enemy.invincibleTimer > 0;
                    const hasMonkeyImage = this.enemyImages['monkey'] && this.enemyImages['monkey'].complete && this.enemyImages['monkey'].naturalWidth > 0;
                    
                    if (hasMonkeyImage) {
                        const spriteScale = 1.2;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.globalAlpha = originalAlpha * (isInvincible ? 0.5 : 1.0);
                        if (enemy.isFleeing) {
                            this.ctx.rotate(Math.sin(this.frameCount / 10) * 0.1);
                        }
                        this.ctx.drawImage(
                            this.enemyImages['monkey'],
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                        
                        if (enemy.isFleeing) {
                            this.ctx.globalAlpha = originalAlpha;
                            this.ctx.fillStyle = '#87cefa';
                            this.ctx.beginPath();
                            this.ctx.arc(enemy.x + enemy.radius * 0.7, enemy.y - enemy.radius * 0.7, enemy.radius * 0.2, 0, Math.PI * 2);
                            this.ctx.fill();
                            this.ctx.beginPath();
                            this.ctx.arc(enemy.x + enemy.radius * 0.9, enemy.y - enemy.radius * 0.9, enemy.radius * 0.15, 0, Math.PI * 2);
                            this.ctx.fill();
                        }
                    } else {
                        this.ctx.globalAlpha = originalAlpha * (isInvincible ? 0.5 : 1.0);
                        
                        // 바깥 갈색 동그라미
                        this.ctx.fillStyle = '#8b4513'; // 갈색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 진한 갈색 테두리
                        this.ctx.strokeStyle = '#654321'; // 진한 갈색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                        
                        // 안쪽 살구색 동그라미 (조금 작게)
                        const innerRadius = enemy.radius * 0.7; // 70% 크기
                        this.ctx.fillStyle = '#ffd4a3'; // 살구색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, innerRadius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 도망 중이면 땀 표시
                        if (enemy.isFleeing) {
                            this.ctx.fillStyle = '#87cefa'; // 하늘색
                            this.ctx.beginPath();
                            this.ctx.arc(enemy.x + enemy.radius * 0.7, enemy.y - enemy.radius * 0.7, enemy.radius * 0.2, 0, Math.PI * 2);
                            this.ctx.fill();
                            this.ctx.beginPath();
                            this.ctx.arc(enemy.x + enemy.radius * 0.9, enemy.y - enemy.radius * 0.9, enemy.radius * 0.15, 0, Math.PI * 2);
                            this.ctx.fill();
                        }
                    }
                    
                    this.ctx.globalAlpha = originalAlpha;
                } else if (enemy.type === 'elephant') {
                    const elephantImage = this.enemyImages['elephant'];
                    const hasElephantImage = elephantImage && elephantImage.complete && elephantImage.naturalWidth > 0;
                    
                    if (hasElephantImage) {
                        const spriteScale = 1.6;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            elephantImage,
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 코끼리: 회색 큰 동그라미
                        this.ctx.fillStyle = '#888888'; // 회색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 진한 회색 테두리
                        this.ctx.strokeStyle = '#555555'; // 진한 회색
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    }
                } else if (enemy.type === 'rhino') {
                    // 코뿔소: 이미지가 있으면 사용
                    if (this.enemyImages['rhino'] && this.enemyImages['rhino'].complete && this.enemyImages['rhino'].naturalWidth > 0) {
                        const spriteScale = 1.4;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            this.enemyImages['rhino'],
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기존 색상 원으로 표시
                        // 코뿔소: 분노 상태(반피 이하)이고 기절 중이 아니면 연한 빨강색, 기절 중이거나 일반 상태면 회색
                        if (enemy.isEnraged && enemy.stunTimer === 0) {
                            // 분노 상태: 연한 빨강색
                            this.ctx.fillStyle = '#ff9999'; // 연한 빨강색
                        } else {
                            // 일반 상태 또는 기절 중: 회색
                            this.ctx.fillStyle = '#666666'; // 회색
                        }
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 진한 회색 테두리
                        this.ctx.strokeStyle = '#444444'; // 진한 회색
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    }
                    
                    // 코뿔소 체력바 표시
                    const rhinoHealthBarWidth = enemy.radius * 2;
                    const rhinoHealthBarHeight = 8;
                    const rhinoHealthBarX = enemy.x - rhinoHealthBarWidth / 2;
                    const rhinoHealthBarY = enemy.y - enemy.radius - 20;
                    
                    // 체력바 배경
                    this.ctx.fillStyle = '#333333';
                    this.ctx.fillRect(rhinoHealthBarX, rhinoHealthBarY, rhinoHealthBarWidth, rhinoHealthBarHeight);
                    
                    // 체력바 (체력 비율에 따라)
                    const rhinoHealthPercent = enemy.health / enemy.maxHealth;
                    this.ctx.fillStyle = rhinoHealthPercent > 0.5 ? '#00ff00' : rhinoHealthPercent > 0.25 ? '#ffff00' : '#ff0000';
                    this.ctx.fillRect(rhinoHealthBarX, rhinoHealthBarY, rhinoHealthBarWidth * rhinoHealthPercent, rhinoHealthBarHeight);
                    
                    // 체력바 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(rhinoHealthBarX, rhinoHealthBarY, rhinoHealthBarWidth, rhinoHealthBarHeight);
                } else if (enemy.type === 'cannon') {
                    // 대포: 이미지가 있으면 사용
                    const cannonImage = this.enemyImages['cannon'];
                    if (cannonImage && cannonImage.complete && cannonImage.naturalWidth > 0) {
                        const spriteScale = 1.0; // 플레이어의 2배 크기로 설정 (radius가 이미 조정됨)
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        // 플레이어 방향으로 회전 (8방향으로 제한)
                        const playerCenterX = this.player.x + this.player.width / 2;
                        const playerCenterY = this.player.y + this.player.height / 2;
                        const dx = playerCenterX - enemy.x;
                        const dy = playerCenterY - enemy.y;
                        let angle = Math.atan2(dy, dx);
                        
                        // 8방향으로 제한 (0, 45, 90, 135, 180, 225, 270, 315도)
                        const directions = 8;
                        const angleStep = (Math.PI * 2) / directions;
                        // 가장 가까운 방향으로 스냅
                        angle = Math.round(angle / angleStep) * angleStep;
                        
                        this.ctx.rotate(angle);
                        this.ctx.drawImage(
                            cannonImage,
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기존 색상 원으로 표시
                        this.ctx.fillStyle = '#8b4513'; // 갈색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 진한 갈색 테두리
                        this.ctx.strokeStyle = '#654321'; // 진한 갈색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                        
                        // 대포 방향 표시 (플레이어 방향, 8방향으로 제한)
                        const playerCenterX = this.player.x + this.player.width / 2;
                        const playerCenterY = this.player.y + this.player.height / 2;
                        const dx = playerCenterX - enemy.x;
                        const dy = playerCenterY - enemy.y;
                        let angle = Math.atan2(dy, dx);
                        
                        // 8방향으로 제한 (0, 45, 90, 135, 180, 225, 270, 315도)
                        const directions = 8;
                        const angleStep = (Math.PI * 2) / directions;
                        // 가장 가까운 방향으로 스냅
                        angle = Math.round(angle / angleStep) * angleStep;
                        
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.rotate(angle);
                        // 대포 포신 그리기
                        this.ctx.fillStyle = '#555555'; // 회색
                        this.ctx.fillRect(0, -enemy.radius * 0.2, enemy.radius * 0.8, enemy.radius * 0.4);
                        this.ctx.restore();
                    }
                } else if (enemy.type === 'skunk') {
                    const skunkImage = this.enemyImages['skunk'];
                    if (skunkImage && skunkImage.complete && skunkImage.naturalWidth > 0) {
                        const spriteScale = 1.2;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            skunkImage,
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 스컹크: 가운데 하얀 네모가 있는 동그라미
                        this.ctx.fillStyle = '#8b4513'; // 갈색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 진한 갈색 테두리
                        this.ctx.strokeStyle = '#654321'; // 진한 갈색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                        
                        // 가운데 하얀 네모
                        const squareSize = enemy.radius * 0.6;
                        this.ctx.fillStyle = '#ffffff'; // 하얀색
                        this.ctx.fillRect(
                            enemy.x - squareSize / 2,
                            enemy.y - squareSize / 2,
                            squareSize,
                            squareSize
                        );
                        
                        // 하얀 네모 테두리
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(
                            enemy.x - squareSize / 2,
                            enemy.y - squareSize / 2,
                            squareSize,
                            squareSize
                        );
                    }
                } else if (enemy.type === 'soldier') {
                    // 군인: e-11 스프라이트 사용
                    const soldierImg = this.enemyImages['soldier'];
                    const hasSoldierImage = soldierImg && soldierImg.complete && soldierImg.naturalWidth > 0;
                    
                    if (hasSoldierImage) {
                        const spriteScale = 1.4;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.drawImage(
                            soldierImg,
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기존 도형 스타일로 표시
                        this.ctx.fillStyle = '#228b22'; // 녹색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        this.ctx.strokeStyle = '#006400'; // 진한 녹색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                    
                    // 장전 중 표시 (반투명) - 이미지/도형 공통
                    if (enemy.isReloading) {
                        this.ctx.globalAlpha = 0.5;
                        this.ctx.fillStyle = '#ff0000'; // 빨간색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.globalAlpha = 1.0;
                    }
                } else if (enemy.type === 'knight') {
                    // 기사: 회색 갑옷, 검, 방패
                    // 갑옷 (회색 동그라미)
                    this.ctx.fillStyle = '#888888'; // 회색
                    this.ctx.beginPath();
                    this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 테두리
                    this.ctx.strokeStyle = '#555555'; // 진한 회색
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    
                    // 플레이어 방향 계산
                    const playerCenterX = this.player.x + this.player.width / 2;
                    const playerCenterY = this.player.y + this.player.height / 2;
                    const dx = playerCenterX - enemy.x;
                    const dy = playerCenterY - enemy.y;
                    const angle = Math.atan2(dy, dx);
                    
                    this.ctx.save();
                    this.ctx.translate(enemy.x, enemy.y);
                    this.ctx.rotate(angle);
                    
                    // 검 그리기 (휘두르기 중이면 회전)
                    if (enemy.isSwinging) {
                        const swingAngle = (enemy.swingTimer / enemy.swingDuration) * Math.PI * 2; // 0~2π 회전
                        this.ctx.rotate(swingAngle);
                    }
                    
                    // 검 (은색, 길쭉한 모양, 더 크게)
                    this.ctx.fillStyle = '#c0c0c0'; // 은색
                    this.ctx.beginPath();
                    // 검날 (더 크게)
                    this.ctx.rect(enemy.radius * 0.2, -enemy.radius * 0.15, enemy.radius * 1.0, enemy.radius * 0.3);
                    this.ctx.fill();
                    // 검 손잡이 (더 크게)
                    this.ctx.fillStyle = '#8b4513'; // 갈색
                    this.ctx.beginPath();
                    this.ctx.rect(enemy.radius * 0.05, -enemy.radius * 0.12, enemy.radius * 0.25, enemy.radius * 0.24);
                    this.ctx.fill();
                    
                    this.ctx.restore();
                    
                    // 방패 그리기 (플레이어 반대편, 방어력이 있을 때만)
                    if (enemy.armor === undefined) enemy.armor = 50;
                    if (enemy.armor > 0) {
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        this.ctx.rotate(angle + Math.PI); // 플레이어 반대편
                        
                        // 방패 (갈색, 방패 모양)
                        this.ctx.fillStyle = '#8b4513'; // 갈색
                        this.ctx.beginPath();
                        // 방패 모양 (타원형)
                        this.ctx.ellipse(-enemy.radius * 0.5, 0, enemy.radius * 0.4, enemy.radius * 0.5, 0, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 방패 테두리
                        this.ctx.strokeStyle = '#654321'; // 진한 갈색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                        
                        this.ctx.restore();
                    }
                    
                    // 찌르기 중 표시 (돌진 효과)
                    if (enemy.isStabbing) {
                        this.ctx.globalAlpha = 0.7;
                        this.ctx.fillStyle = '#ffff00'; // 노란색
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius * 1.2, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.globalAlpha = 1.0;
                    }
                } else if (enemy.type === 'tank') {
                    // 탱크 렌더링
                    const drawX = enemy.x + enemy.shakeOffset.x;
                    const drawY = enemy.y + enemy.shakeOffset.y;
                    
                    // 16방향 각도 계산
                    const directions = 16;
                    const angleStep = (Math.PI * 2) / directions;
                    const angle = enemy.angle * angleStep;
                    
                    // 탱크 이미지가 있으면 사용
                    const tankImage = this.enemyImages['tank'];
                    const hasTankImage = tankImage && tankImage.complete && tankImage.naturalWidth > 0;
                    
                    if (hasTankImage) {
                        const spriteScale = 1.0;
                        const width = enemy.radius * 2 * spriteScale * 1.5; // 가로로 1.5배 늘림
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.save();
                        this.ctx.translate(drawX, drawY);
                        this.ctx.rotate(angle);
                        // 좌우 반전 (scaleX를 -1로)
                        this.ctx.scale(-1, 1);
                        this.ctx.drawImage(
                            tankImage,
                            width / 2, // 반전 후 위치 조정
                            -height / 2,
                            -width, // 반전을 위해 음수 너비
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기본 도형으로 표시
                        this.ctx.save();
                        this.ctx.translate(drawX, drawY);
                        this.ctx.rotate(angle);
                        
                        // 탱크 본체
                        this.ctx.fillStyle = '#555555'; // 회색
                        this.ctx.fillRect(-enemy.radius * 0.8, -enemy.radius * 0.6, enemy.radius * 1.6, enemy.radius * 1.2);
                        
                        // 탱크 포신 (앞쪽)
                        this.ctx.fillStyle = '#444444'; // 진한 회색
                        this.ctx.fillRect(enemy.radius * 0.6, -enemy.radius * 0.2, enemy.radius * 0.4, enemy.radius * 0.4);
                        
                        // 탱크 바퀴 (양쪽)
                        this.ctx.fillStyle = '#333333'; // 더 진한 회색
                        // 왼쪽 바퀴
                        this.ctx.fillRect(-enemy.radius * 0.7, enemy.radius * 0.3, enemy.radius * 0.3, enemy.radius * 0.4);
                        // 오른쪽 바퀴
                        this.ctx.fillRect(enemy.radius * 0.4, enemy.radius * 0.3, enemy.radius * 0.3, enemy.radius * 0.4);
                        
                        this.ctx.restore();
                    }
                    
                    // 바퀴 자국 렌더링
                    for (let track of enemy.trackMarks) {
                        const alpha = track.life / track.maxLife;
                        this.ctx.globalAlpha = alpha * 0.5; // 반투명
                        this.ctx.fillStyle = '#888888'; // 회색
                        
                        // 바퀴 자국 (타원형)
                        this.ctx.beginPath();
                        this.ctx.ellipse(track.x, track.y, enemy.radius * 0.3, enemy.radius * 0.2, angle, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 다른 바퀴 자국 (약간 옆으로)
                        this.ctx.beginPath();
                        const offsetX = Math.cos(angle + Math.PI / 2) * enemy.radius * 0.5;
                        const offsetY = Math.sin(angle + Math.PI / 2) * enemy.radius * 0.5;
                        this.ctx.ellipse(track.x + offsetX, track.y + offsetY, enemy.radius * 0.3, enemy.radius * 0.2, angle, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        this.ctx.globalAlpha = 1.0;
                    }
                } else if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                    // 뱀 그리기 (동그라미가 빼곡하게 길쭉하게)
                    const snakeHeadImage = this.enemyImages['snakeHead'];
                    for (let i = 0; i < enemy.segments.length; i++) {
                        const segment = enemy.segments[i];
                        const isHead = segment.isHead;
                        const canUseHeadImage = isHead && snakeHeadImage && snakeHeadImage.complete && snakeHeadImage.naturalWidth > 0;
                        const canUseBodyImage = !isHead && this.enemyImages['snakeBody'] && this.enemyImages['snakeBody'].complete && this.enemyImages['snakeBody'].naturalWidth > 0;
                        
                        if (canUseHeadImage) {
                            const spriteScale = 1.3;
                            const width = segment.radius * 2 * spriteScale;
                            const height = segment.radius * 2 * spriteScale;
                            this.ctx.save();
                            if (enemy.type === 'poisonSnake') {
                                this.ctx.filter = 'hue-rotate(-90deg) saturate(1.5)';
                            }
                            this.ctx.translate(segment.x, segment.y);
                            this.ctx.drawImage(
                                snakeHeadImage,
                                -width / 2,
                                -height / 2,
                                width,
                                height
                            );
                            this.ctx.restore();
                        } else if (canUseBodyImage) {
                            const spriteScale = 1.1;
                            const width = segment.radius * 2 * spriteScale;
                            const height = segment.radius * 2 * spriteScale;
                            this.ctx.save();
                            if (enemy.type === 'poisonSnake') {
                                this.ctx.filter = 'hue-rotate(-90deg) saturate(1.5)';
                            }
                            this.ctx.translate(segment.x, segment.y);
                            this.ctx.drawImage(
                                this.enemyImages['snakeBody'],
                                -width / 2,
                                -height / 2,
                                width,
                                height
                            );
                            this.ctx.restore();
                        } else {
                            if (enemy.type === 'poisonSnake') {
                                this.ctx.fillStyle = isHead ? '#4cffd7' : '#1f8a70';
                            } else {
                                // 일반 뱀: 머리는 조금 더 크게, 몸통은 작게
                                if (isHead) {
                                    this.ctx.fillStyle = '#8b4513'; // 갈색 머리
                                } else {
                                    this.ctx.fillStyle = '#654321'; // 진한 갈색 몸통
                                }
                            }
                            
                            this.ctx.beginPath();
                            this.ctx.arc(segment.x, segment.y, segment.radius, 0, Math.PI * 2);
                            this.ctx.fill();
                            
                            // 테두리
                            this.ctx.strokeStyle = '#000000';
                            this.ctx.lineWidth = 1;
                            this.ctx.stroke();
                        }
                        
                        // 체력바 표시 (플레이어가 닿았을 때 또는 머리인 경우)
                        if (segment.showHealthBar || segment.isHead) {
                            const healthBarWidth = segment.radius * 2;
                            const healthBarHeight = 4;
                            const healthBarX = segment.x - healthBarWidth / 2;
                            const healthBarY = segment.y - segment.radius - 10;
                            
                            // 체력바 배경
                            this.ctx.fillStyle = '#333333';
                            this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                            
                            // 체력바
                            const healthPercent = segment.health / segment.maxHealth;
                            this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
                            this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
                            
                            // 체력바 테두리
                            this.ctx.strokeStyle = '#000000';
                            this.ctx.lineWidth = 1;
                            this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                        }
                    }
                } else {
                    // 일반 동그라미: 이미지 사용
                    if (this.enemyImages['normal'] && this.enemyImages['normal'].complete && this.enemyImages['normal'].naturalWidth > 0) {
                        // 이미지가 로드되었으면 이미지 사용
                        this.ctx.save();
                        this.ctx.translate(enemy.x, enemy.y);
                        const spriteScale = 1.25;
                        const width = enemy.radius * 2 * spriteScale;
                        const height = enemy.radius * 2 * spriteScale;
                        this.ctx.drawImage(
                            this.enemyImages['normal'],
                            -width / 2,
                            -height / 2,
                            width,
                            height
                        );
                        this.ctx.restore();
                    } else {
                        // 이미지가 없으면 기본 원형으로 그리기
                        this.ctx.fillStyle = '#ff9999'; // 연한 빨강
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // 빨간 테두리
                        this.ctx.strokeStyle = '#ff0000'; // 빨간색
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                }
                
                // 섬광탄에 맞았을 때 하얀색 오버레이
                const flashEffect = this.enemyFlashEffects[enemy.id];
                if (flashEffect) {
                    let overlayAlpha = 1;
                    if (flashEffect.fadeOut && flashEffect.fadeDuration > 0) {
                        overlayAlpha = Math.max(0, 1 - (flashEffect.fadeTimer / flashEffect.fadeDuration));
                    }
                    
                    this.ctx.save();
                    const glowRadius = enemy.radius + 10;
                    const gradient = this.ctx.createRadialGradient(
                        enemy.x, enemy.y, 0,
                        enemy.x, enemy.y, glowRadius
                    );
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${overlayAlpha})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(enemy.x, enemy.y, glowRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
                
                // 가시 위에 있으면 체력바 표시
                if (showHealthBar) {
                    const healthBarWidth = enemy.radius * 2;
                    const healthBarHeight = 6;
                    const healthBarX = enemy.x - healthBarWidth / 2;
                    let healthBarY = enemy.y - enemy.radius - 15;
                    
                    // 기사는 방어력바 먼저 표시 (체력바 위에, 파란색)
                    if (enemy.type === 'knight') {
                        if (enemy.armor === undefined) enemy.armor = 50;
                        const maxArmor = 50;
                        
                        // 방어력바 배경
                        this.ctx.fillStyle = '#333333';
                        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                        
                        // 방어력바 (파란색)
                        const armorPercent = enemy.armor / maxArmor;
                        this.ctx.fillStyle = '#0066ff'; // 파란색
                        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * armorPercent, healthBarHeight);
                        
                        // 방어력바 테두리
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                        
                        // 체력바는 방어력바 아래에
                        healthBarY += healthBarHeight + 2;
                    }
                    // 군인은 방어력바 먼저 표시 (체력바 위에)
                    else if (enemy.type === 'soldier') {
                        if (enemy.armor === undefined) enemy.armor = 50;
                        const maxArmor = 50;
                        
                        // 방어력바 배경
                        this.ctx.fillStyle = '#333333';
                        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                        
                        // 방어력바 (파란색)
                        const armorPercent = enemy.armor / maxArmor;
                        this.ctx.fillStyle = '#0066ff'; // 파란색
                        this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * armorPercent, healthBarHeight);
                        
                        // 방어력바 테두리
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                        
                        // 체력바는 방어력바 아래에
                        healthBarY += healthBarHeight + 2;
                    }
                    
                    // 체력바 배경
                    this.ctx.fillStyle = '#333333';
                    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                    
                    // 체력바 (체력 비율에 따라)
                    const healthPercent = enemy.health / enemy.maxHealth;
                    this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
                    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
                    
                    // 체력바 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                }
                
                // 불 효과 오버레이 (반투명 빨강)
                if (enemy.fireSpeedBoostTimer !== undefined && enemy.fireSpeedBoostTimer > 0) {
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.3; // 반투명
                    this.ctx.fillStyle = '#ff0000'; // 빨강
                    if (enemy.type === 'snake' || enemy.type === 'poisonSnake') {
                        // 뱀은 각 세그먼트에 오버레이
                        if (enemy.segments) {
                            for (let segment of enemy.segments) {
                                this.ctx.beginPath();
                                this.ctx.arc(segment.x, segment.y, segment.radius, 0, Math.PI * 2);
                                this.ctx.fill();
                            }
                        }
                    } else {
                        // 일반 적은 원형 오버레이
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                    this.ctx.restore();
                }
                
                // 심연블럭 투명도 복원
                this.ctx.restore();
            }
            
            // 경험치 구슬 그리기
            for (let orb of this.experienceOrbs) {
                if (orb.collected) continue;
                
                // 보스 구슬은 초록색, 독 효과 구슬은 보라색/초록색 테두리, 일반 구슬은 파란색
                if (orb.isBossOrb) {
                    // 초록색 큰 구슬
                    this.ctx.fillStyle = '#00ff00'; // 초록색
                    this.ctx.beginPath();
                    this.ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 테두리
                    this.ctx.strokeStyle = '#00cc00'; // 진한 초록색
                    this.ctx.lineWidth = 3;
                    this.ctx.stroke();
                } else if (orb.isPoisonOrb) {
                    // 독 효과 구슬: 보라색 가운데, 초록색 테두리
                    this.ctx.fillStyle = '#8b00ff'; // 보라색
                    this.ctx.beginPath();
                    this.ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 초록색 테두리
                    this.ctx.strokeStyle = '#00ff00'; // 초록색
                    this.ctx.lineWidth = 3;
                    this.ctx.stroke();
                } else {
                    // 파란 공 그리기
                    this.ctx.fillStyle = '#0066ff'; // 파란색
                    this.ctx.beginPath();
                    this.ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 테두리
                    this.ctx.strokeStyle = '#0033cc'; // 진한 파란색
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            }
            
            // 물 파티클 그리기
            for (let particle of this.waterParticles) {
                const alpha = particle.life / particle.maxLife;
                
                // 물 파티클 (파란색)
                this.ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 화염병 히트박스 그리기 (75% 투명 주황, 안 보이게)
            for (let hitbox of this.gasolineBombHitboxes) {
                // 히트박스는 안 보이게 (투명하게)
                // 실제로는 그리지 않지만, 데미지는 계속 적용됨
            }
            
            // 불 파티클 그리기
            for (let particle of this.fireParticles) {
                const alpha = particle.life / particle.maxLife;
                
                // 불 파티클 (주황-빨강 그라데이션)
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size * alpha
                );
                gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha})`); // 밝은 주황
                gradient.addColorStop(0.5, `rgba(255, 50, 0, ${alpha * 0.8})`); // 주황
                gradient.addColorStop(1, `rgba(200, 0, 0, ${alpha * 0.5})`); // 어두운 빨강
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 경험치 파티클 그리기
            for (let particle of this.expParticles) {
            const alpha = particle.life / particle.maxLife; // 투명도 (생명력에 비례)
            
            // 파란 불꽃 효과
            this.ctx.fillStyle = `rgba(0, 150, 255, ${alpha})`; // 파란색, 투명도 적용
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 중심부 밝은 부분
            this.ctx.fillStyle = `rgba(100, 200, 255, ${alpha * 0.8})`; // 밝은 파란색
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * alpha * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            }
            
            // 물고기 그리기 (10스테이지)
            for (let fish of this.fishes) {
                const halfSize = fish.size / 2;
                
                if (fish.type === 'lightRed') {
                    // 연한 빨강 물고기
                    this.ctx.fillStyle = '#ff9999';
                    this.ctx.fillRect(fish.x - halfSize, fish.y - halfSize, fish.size, fish.size);
                } else if (fish.type === 'purple') {
                    // 보라 물고기
                    this.ctx.fillStyle = '#8b00ff';
                    this.ctx.fillRect(fish.x - halfSize, fish.y - halfSize, fish.size, fish.size);
                } else if (fish.type === 'gray') {
                    // 회색 물고기
                    this.ctx.fillStyle = '#808080';
                    this.ctx.fillRect(fish.x - halfSize, fish.y - halfSize, fish.size, fish.size);
                } else if (fish.type === 'explosive') {
                    // 빨강+검정 줄무늬 물고기
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.fillRect(fish.x - halfSize, fish.y - halfSize, fish.size, fish.size);
                    // 줄무늬 그리기
                    this.ctx.fillStyle = '#000000';
                    this.ctx.fillRect(fish.x - halfSize, fish.y - halfSize, fish.size / 3, fish.size);
                    this.ctx.fillRect(fish.x - halfSize + fish.size * 2 / 3, fish.y - halfSize, fish.size / 3, fish.size);
                } else if (fish.type === 'skyBlue') {
                    // 하늘색 물고기
                    this.ctx.fillStyle = '#87ceeb';
                    this.ctx.fillRect(fish.x - halfSize, fish.y - halfSize, fish.size, fish.size);
                }
                
                // 테두리
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(fish.x - halfSize, fish.y - halfSize, fish.size, fish.size);
            }
            
            // 보스 그리기 (워터밤)
            if (this.boss) {
                // 보스 본체 (하늘색 큰 동그라미)
                this.ctx.fillStyle = '#87ceeb'; // 하늘색
                this.ctx.beginPath();
                this.ctx.arc(this.boss.x, this.boss.y, this.boss.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 보스 테두리
                this.ctx.strokeStyle = '#4682b4'; // 진한 하늘색
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                
                // 왼쪽 회색 총
                this.ctx.fillStyle = '#808080'; // 회색
                this.ctx.fillRect(this.boss.leftGun.x, this.boss.leftGun.y, 
                                this.boss.leftGun.width, this.boss.leftGun.height);
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(this.boss.leftGun.x, this.boss.leftGun.y, 
                                  this.boss.leftGun.width, this.boss.leftGun.height);
                
                // 오른쪽 회색 총
                this.ctx.fillStyle = '#808080'; // 회색
                this.ctx.fillRect(this.boss.rightGun.x, this.boss.rightGun.y, 
                                this.boss.rightGun.width, this.boss.rightGun.height);
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(this.boss.rightGun.x, this.boss.rightGun.y, 
                                  this.boss.rightGun.width, this.boss.rightGun.height);
                
                // 보스 체력바
                const healthBarWidth = this.boss.radius * 2;
                const healthBarHeight = 8;
                const healthBarX = this.boss.x - healthBarWidth / 2;
                const healthBarY = this.boss.y - this.boss.radius - 20;
                
                // 체력바 배경
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                
                // 체력바 (체력 비율에 따라)
                const healthPercent = this.boss.health / this.boss.maxHealth;
                this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
                this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
                
                // 체력바 테두리
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            }
            
            // 보스 발사체 그리기
            for (let projectile of this.bossProjectiles) {
                this.ctx.fillStyle = projectile.color || '#8b00ff'; // 보라색
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 발사체 테두리
                this.ctx.strokeStyle = '#4b0082'; // 진한 보라색
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            // 플레이어 그리기 (픽셀 좌표)
            // 기절 중이면 반투명하게
            if (this.player.stunTimer > 0) {
                this.ctx.globalAlpha = 0.5; // 반투명
            } else {
                this.ctx.globalAlpha = 1.0; // 불투명
            }
            // 플레이어 네모 (조금 키가 큰 네모)
            // 색상 결정: 독 효과 중이면 보라색, 피격 중이면 빨강, 기본은 초록
            if (this.poisonEffect.active || this.mapDotDamage.active) {
                this.ctx.fillStyle = '#8b00ff'; // 보라색 (독 효과)
            } else if (this.playerHitColorTimer > 0) {
                this.ctx.fillStyle = '#ff0000'; // 빨강 (피격)
            } else {
                this.ctx.fillStyle = '#00ff00'; // 초록색 (기본)
            }
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
            
            // 플레이어 테두리
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);
            
            // 업그레이드 모드일 때 플레이어 위에 마우스가 올라가면 강조 표시
            if (this.upgradeMode && !this.waveStarted && !this.gameOver && !this.showRewardSelection) {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const mouseDx = this.mouse.x - playerCenterX;
                const mouseDy = this.mouse.y - playerCenterY;
                const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
                const playerRadius = Math.max(this.player.width, this.player.height) / 2;
                
                if (mouseDistance < playerRadius + 20) {
                    // 플레이어 강조 표시 (반투명 노란색 테두리)
                    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
                    this.ctx.lineWidth = 4;
                    this.ctx.strokeRect(this.player.x - 5, this.player.y - 5, 
                        this.player.width + 10, this.player.height + 10);
                }
            }
            
            // 불 효과 오버레이 (반투명 빨강)
            if (this.player.fireEffect.active) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.3; // 반투명
                this.ctx.fillStyle = '#ff0000'; // 빨강
                this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
                this.ctx.restore();
            }
            
            // 기절 알파값 복원
            this.ctx.globalAlpha = 1.0;
            
            // 검 그리기 (공격 중일 때)
            if (this.swordAttack.isAttacking) {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                
                // 검의 각도는 마우스 방향으로 고정
                const currentAngle = this.swordAttack.angle;
                
                // 검의 끝점 계산 (공격 진행도에 따라 검의 길이가 늘어남)
                const currentLength = this.swordAttack.length * this.swordAttack.progress;
                const swordEndX = playerCenterX + Math.cos(currentAngle) * currentLength;
                const swordEndY = playerCenterY + Math.sin(currentAngle) * currentLength;
                
                // 검 그리기 (플레이어 중심에서 끝점까지 직선)
                this.ctx.strokeStyle = '#cccccc'; // 밝은 회색
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(playerCenterX, playerCenterY);
                this.ctx.lineTo(swordEndX, swordEndY);
                this.ctx.stroke();
                
                // 검의 끝 부분 강조
                this.ctx.fillStyle = '#ffffff'; // 흰색
                this.ctx.beginPath();
                this.ctx.arc(swordEndX, swordEndY, 5, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 검의 손잡이 부분
                this.ctx.fillStyle = '#8b4513'; // 갈색 (나무 손잡이)
                this.ctx.beginPath();
                this.ctx.arc(playerCenterX, playerCenterY, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 경험치 표시 (화면 오른쪽 위 모서리)
            if (!this.gameOver && !this.showRewardSelection) {
                // 화면 오른쪽 위 모서리
                const expX = this.canvas.width - 150; // 오른쪽에서 150픽셀 떨어진 위치
                const expY = 20; // 위에서 20픽셀 떨어진 위치
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 24px Arial';
                this.ctx.textAlign = 'right';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(`${this.experience} XP`, expX, expY);
            }
            
            // 먼지 효과 제거됨
            
            // 출혈 효과 그리기 (플레이어 가운데 짙은 빨강 동그라미 + 피 파티클)
            if (this.bleedingEffect.active) {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                
                // 플레이어 가운데 짙은 빨강 동그라미
                this.ctx.fillStyle = '#8b0000'; // 짙은 빨강
                this.ctx.beginPath();
                this.ctx.arc(playerCenterX, playerCenterY, 10, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 출혈 파티클 그리기 (빨간 피 효과)
                for (let particle of this.bleedingEffect.particles) {
                    const alpha = particle.life / particle.maxLife;
                    this.ctx.globalAlpha = alpha;
                    this.ctx.fillStyle = '#ff0000'; // 빨간색
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.ctx.globalAlpha = 1.0;
            }
            
            // 스컹크 방구 효과 그리기 (화면 가운데 연두색 동그라미)
            if (this.skunkFartEffect.active) {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const radius = Math.min(this.canvas.width, this.canvas.height) / 2; // 화면 크기에 맞춰
                
                // 연두색 동그라미 (불투명)
                this.ctx.fillStyle = '#90ee90'; // 연두색 (불투명)
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 무기 선택 UI (화면 오른쪽 아래 모서리)
            if (!this.gameOver && !this.showRewardSelection) {
                const slotSize = 60;
                const slotSpacing = 10;
                const margin = 20; // 화면 가장자리에서의 여백
                
                // 사용 가능한 무기 개수 확인
                const rangeLevel = (this.playerUpgrades && this.playerUpgrades.range) ? this.playerUpgrades.range.level : 1;
                const weaponCount = rangeLevel >= 11 ? 3 : (rangeLevel >= 10 ? 2 : 1);
                
                // 무기 개수에 따라 동적으로 위치 계산
                const totalWidth = slotSize * weaponCount + slotSpacing * (weaponCount - 1);
                const startX = this.canvas.width - (totalWidth + margin); // 오른쪽에서 여백
                const startY = this.canvas.height - (slotSize + margin); // 아래에서 여백
                
                for (let i = 0; i < weaponCount; i++) {
                    const slotX = startX + i * (slotSize + slotSpacing);
                    const slotY = startY;
                    
                    // 무기 타입 결정
                    let weaponType = '';
                    let weaponName = '';
                    let isAvailable = false;
                    
                    if (i === 0) {
                        weaponType = 'sword';
                        weaponName = '칼';
                        isAvailable = true;
                    } else if (i === 1) {
                        weaponType = 'gun';
                        weaponName = '총';
                        isAvailable = (this.playerUpgrades && this.playerUpgrades.range) ? this.playerUpgrades.range.level >= 10 : false;
                    } else if (i === 2) {
                        weaponType = 'minigun';
                        weaponName = '미니건';
                        isAvailable = (this.playerUpgrades && this.playerUpgrades.range) ? this.playerUpgrades.range.level >= 11 : false;
                    }
                    
                    // 선택된 무기인지 확인
                    const isSelected = this.selectedWeapon === weaponType;
                    
                    // 칸 배경
                    if (isSelected) {
                        this.ctx.fillStyle = '#ffff00'; // 노란색 (선택됨)
                    } else if (isAvailable) {
                        this.ctx.fillStyle = '#666666'; // 회색 (사용 가능)
                    } else {
                        this.ctx.fillStyle = '#333333'; // 어두운 회색 (사용 불가)
                    }
                    this.ctx.fillRect(slotX, slotY, slotSize, slotSize);
                    
                    // 칸 테두리
                    this.ctx.strokeStyle = isSelected ? '#ffffff' : '#000000';
                    this.ctx.lineWidth = isSelected ? 3 : 2;
                    this.ctx.strokeRect(slotX, slotY, slotSize, slotSize);
                    
                    // 번호 표시
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(`${i + 1}`, slotX + slotSize / 2, slotY + 5);
                    
                    // 무기 이름 표시
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText(weaponName, slotX + slotSize / 2, slotY + slotSize - 20);
                }
            }
            
            // 보스가 있을 때는 보스 정보 표시, 없을 때는 웨이브 타이머 표시
            if (!this.gameOver && !this.showRewardSelection) {
                // 코뿔소나 탱크가 있는지 확인
                const rhino = this.enemies.find(e => e.type === 'rhino');
                const tank = this.enemies.find(e => e.type === 'tank');
                const bossEnemy = this.boss || rhino || tank;
                
                if (bossEnemy) {
                    // 보스 정보 표시 (화면 중앙 기준 맨 위)
                    const centerX = this.canvas.width / 2;
                    const topY = 20; // 맨 위
                    
                    // 웨이브 번호 표시 (크게)
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 48px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(`웨이브 ${this.waveNumber}`, centerX, topY);
                    
                    // 보스 이름 표시
                    this.ctx.font = 'bold 28px Arial';
                    let bossName = '워터밤';
                    if (rhino) {
                        bossName = '코뿔소';
                    } else if (tank) {
                        bossName = '탱크';
                    }
                    this.ctx.fillText(bossName, centerX, topY + 60);
                    
                    // 보스 체력바 표시 (화면 중앙 기준)
                    const bossHealthBarWidth = 400;
                    const bossHealthBarHeight = 30;
                    const bossHealthBarX = centerX - bossHealthBarWidth / 2;
                    const bossHealthBarY = topY + 100;
                    
                    // 체력바 배경
                    this.ctx.fillStyle = '#333333';
                    this.ctx.fillRect(bossHealthBarX, bossHealthBarY, bossHealthBarWidth, bossHealthBarHeight);
                    
                    // 체력바 (체력 비율에 따라)
                    const bossHealthPercent = bossEnemy.health / bossEnemy.maxHealth;
                    this.ctx.fillStyle = bossHealthPercent > 0.5 ? '#00ff00' : bossHealthPercent > 0.25 ? '#ffff00' : '#ff0000';
                    this.ctx.fillRect(bossHealthBarX, bossHealthBarY, bossHealthBarWidth * bossHealthPercent, bossHealthBarHeight);
                    
                    // 체력바 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(bossHealthBarX, bossHealthBarY, bossHealthBarWidth, bossHealthBarHeight);
                    
                    // 체력 수치 표시
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(`${Math.ceil(bossEnemy.health)} / ${bossEnemy.maxHealth}`, 
                        centerX, bossHealthBarY + bossHealthBarHeight / 2);
                } else {
                    // 웨이브 타이머 표시 (화면 왼쪽 위)
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 24px Arial';
                    this.ctx.textAlign = 'left';
                    this.ctx.textBaseline = 'top';
                    
                    // '웨이브 시간' 텍스트
                    this.ctx.fillText('웨이브 시간', 20, 20);
                    
                    // 시간 초 표시
                    this.ctx.font = 'bold 36px Arial';
                    this.ctx.fillText(`${this.waveTimer}초`, 20, 50);
                    
                    // 웨이브 번호 표시
                    this.ctx.font = 'bold 24px Arial';
                    this.ctx.fillText(`웨이브 ${this.waveNumber}`, 20, 95);
                }
            
            // 웨이브 시작 버튼 (시간초 오른쪽, 겹치지 않게)
            const buttonX = 200; // 시간초 오른쪽에 배치
            const buttonY = 50;
            const buttonWidth = 150;
            const buttonHeight = 40;
            
            // 버튼 영역 저장 (웨이브가 시작되지 않았을 때만 클릭 가능)
            if (!this.waveStarted) {
                this.startWaveButtonArea = {
                    x: buttonX,
                    y: buttonY,
                    width: buttonWidth,
                    height: buttonHeight
                };
            } else {
                this.startWaveButtonArea = null; // 클릭 불가능
            }
            
            // 버튼 배경 (웨이브가 시작되면 회색)
            if (this.waveStarted) {
                this.ctx.fillStyle = '#9e9e9e'; // 회색
            } else {
                this.ctx.fillStyle = '#4caf50'; // 초록색
            }
            this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
            
            // 버튼 테두리
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
            
            // 버튼 텍스트
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('웨이브 시작', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
            
            // 웨이브 건너뛰기 버튼 (웨이브 시작 버튼 오른쪽)
            const skipButtonX = buttonX + buttonWidth + 10;
            const skipButtonY = buttonY;
            const skipButtonWidth = 150;
            const skipButtonHeight = 40;
            
            // 버튼 영역 저장 (웨이브가 시작되지 않았을 때만 클릭 가능)
            if (!this.waveStarted) {
                this.skipWaveButtonArea = {
                    x: skipButtonX,
                    y: skipButtonY,
                    width: skipButtonWidth,
                    height: skipButtonHeight
                };
            } else {
                this.skipWaveButtonArea = null; // 클릭 불가능
            }
            
            // 버튼 배경 (웨이브가 시작되면 회색)
            if (this.waveStarted) {
                this.ctx.fillStyle = '#9e9e9e'; // 회색
            } else {
                this.ctx.fillStyle = '#ff9800'; // 주황색
            }
            this.ctx.fillRect(skipButtonX, skipButtonY, skipButtonWidth, skipButtonHeight);
            
            // 버튼 테두리
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(skipButtonX, skipButtonY, skipButtonWidth, skipButtonHeight);
            
            // 버튼 텍스트
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('웨이브 건너뛰기', skipButtonX + skipButtonWidth / 2, skipButtonY + skipButtonHeight / 2);
            
            // 체력 바 표시 (웨이브 번호 아래)
            const healthBarX = 20;
            const healthBarY = 125;
            const baseHealthBarWidth = 300;
            const healthBarHeight = 20;
            
            // 최대 체력 계산 (업그레이드 반영)
            const maxHealth = 100 + (this.playerUpgrades.health.level - 1) * 10;
            const healthPercent = this.health / maxHealth;
            
            // 체력바 너비는 최대 체력에 비례하여 증가
            const healthBarWidth = baseHealthBarWidth + (maxHealth - 100) * 3; // 체력 10당 3픽셀 증가
            
            // 체력 바 배경 (회색)
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            
            // 체력 바 (체력이 깎이면 빨간색)
            if (this.health < maxHealth) {
                this.ctx.fillStyle = '#ff0000'; // 빨간색
            } else {
                this.ctx.fillStyle = '#4caf50'; // 초록색 (체력이 가득 찬 경우)
            }
            this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
            
            // 체력 바 테두리 (검은 선이 체력바 너비에 맞춰 늘어남)
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            }
            
            // 인벤토리 창 (웨이브가 시작되지 않았을 때만 표시)
            if (this.inventoryOpen && !this.waveStarted) {
                const windowWidth = this.canvas.width * 0.8;
                const windowHeight = this.canvas.height * 0.8;
                const windowX = (this.canvas.width - windowWidth) / 2;
                const windowY = (this.canvas.height - windowHeight) / 2;
            
                // 인벤토리 창 영역 저장
                this.inventoryWindowArea = {
                    x: windowX,
                    y: windowY,
                    width: windowWidth,
                    height: windowHeight
                };
                
                // 반투명 회색 배경
                this.ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
                this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
                
                // 하얀 테두리
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
                
                // 닫기 버튼 (X) - 오른쪽 위
                const closeButtonSize = 30;
                const closeButtonX = windowX + windowWidth - closeButtonSize - 10;
                const closeButtonY = windowY + 10;
                
                this.closeButtonArea = {
                    x: closeButtonX,
                    y: closeButtonY,
                    width: closeButtonSize,
                    height: closeButtonSize
                };
                
                // X 그리기 (대각선)
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(closeButtonX + 5, closeButtonY + 5);
                this.ctx.lineTo(closeButtonX + closeButtonSize - 5, closeButtonY + closeButtonSize - 5);
                this.ctx.moveTo(closeButtonX + closeButtonSize - 5, closeButtonY + 5);
                this.ctx.lineTo(closeButtonX + 5, closeButtonY + closeButtonSize - 5);
                this.ctx.stroke();
                
                // 인벤토리 아이템 표시 (왼쪽 모서리부터, 천천히 나타남)
                const itemSize = 80;
                const itemSpacing = 10;
                const itemsPerRow = 5; // 한 줄에 5개씩
                const startX = windowX + 20;
                const startY = windowY + 20;
                
                let visibleItemIndex = 0; // 실제로 표시되는 아이템 인덱스
                this.hoveredInventoryItem = null; // 호버된 아이템 초기화
                
                for (let i = 0; i < this.inventory.length; i++) {
                    const item = this.inventory[i];
                    
                    // 아이템이 나타날 시간이 되었는지 확인
                    if (this.frameCount < item.appearFrame) {
                        continue; // 아직 나타나지 않음
                    }
                    
                    const row = Math.floor(visibleItemIndex / itemsPerRow); // 줄 번호 (0 또는 1)
                    const col = visibleItemIndex % itemsPerRow; // 열 번호
                    const itemX = startX + col * (itemSize + itemSpacing);
                    const itemY = startY + row * (itemSize + itemSpacing);
                    
                    // 마우스 호버 체크
                    const isHovered = this.mouse.x >= itemX && this.mouse.x <= itemX + itemSize &&
                                      this.mouse.y >= itemY && this.mouse.y <= itemY + itemSize;
                    
                    if (isHovered) {
                        this.hoveredInventoryItem = i;
                    }
                    
                    // 아이템 배경
                    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                    this.ctx.fillRect(itemX, itemY, itemSize, itemSize);
                    
                    // 선택된 아이템은 노란 테두리
                    if (this.selectedInventoryItem === i) {
                        this.ctx.strokeStyle = '#ffff00';
                        this.ctx.lineWidth = 4;
                    } else {
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 2;
                    }
                    this.ctx.strokeRect(itemX, itemY, itemSize, itemSize);
                    
                    // 아이템 이름
                    const displayName = this.getItemDisplayName(item.type, item.colorIndex);
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = 'bold 16px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';
                    const textY = itemY + 5;
                    this.ctx.fillText(displayName, itemX + itemSize / 2, textY);
                    
                    // 모든 아이템의 이미지를 글자 밑에 표시
                    if (this.itemImages[item.type]) {
                        const img = this.itemImages[item.type];
                        // 이미지가 로드되었는지 확인
                        if (img && img.complete && img.naturalWidth > 0) {
                            const imageSize = 50; // 이미지 크기
                            const imageX = itemX + (itemSize - imageSize) / 2;
                            const imageY = textY + 18; // 글자 밑에 배치
                            this.ctx.drawImage(img, imageX, imageY, imageSize, imageSize);
                        }
                    }
                    
                    if (item.type === '색상(제작용)') {
                        const swatchSize = 24;
                        const swatchX = itemX + (itemSize - swatchSize) / 2;
                        const swatchY = textY + 30;
                        const colorEntry = this.getColorPaletteEntry(item.colorIndex);
                        this.ctx.fillStyle = colorEntry.color;
                        this.ctx.fillRect(swatchX, swatchY, swatchSize, swatchSize);
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(swatchX, swatchY, swatchSize, swatchSize);
                    }
                    
                    // 개수 표시 (여러개일 때 왼쪽 아래 대각선 모서리에 x)
                    if (item.count > 1) {
                        this.ctx.fillStyle = '#000000';
                        this.ctx.font = 'bold 20px Arial';
                        this.ctx.textAlign = 'left';
                        this.ctx.textBaseline = 'bottom';
                        this.ctx.fillText(`x${item.count}`, itemX + 5, itemY + itemSize - 5);
                    }
                    
                    // 쿨타임 표시 (총, 미니건, 섬광탄)
                    let cooldown = 0;
                    let maxCooldown = 0;
                    if (item.type === '물총' && this.selectedWeapon === 'gun') {
                        cooldown = this.gunCooldown;
                        maxCooldown = 20; // 0.33초
                    } else if (item.type === '개틀링 건' && this.selectedWeapon === 'minigun') {
                        cooldown = this.minigunCooldown;
                        maxCooldown = 3; // 매우 빠름
                    } else if (item.type === '섬광탄' && this.selectedWeapon === 'flashbang') {
                        cooldown = this.flashbangCooldown;
                        maxCooldown = 120; // 2초
                    }
                    
                    if (cooldown > 0 && maxCooldown > 0) {
                        // 쿨타임 진행도 (0.0 ~ 1.0)
                        const progress = cooldown / maxCooldown;
                        
                        // 회색 반투명 네모가 위에서 아래로 내려오는 효과
                        const cooldownHeight = itemSize * progress;
                        this.ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
                        this.ctx.fillRect(itemX, itemY, itemSize, cooldownHeight);
                        
                        // 가운데에 초 표시
                        const seconds = (cooldown / 60).toFixed(1);
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = 'bold 16px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        // 텍스트 그림자 효과
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 3;
                        this.ctx.strokeText(seconds, itemX + itemSize / 2, itemY + itemSize / 2);
                        this.ctx.fillText(seconds, itemX + itemSize / 2, itemY + itemSize / 2);
                    }
                    
                    visibleItemIndex++;
                }
                
                // 호버된 아이템 설명 표시
                if (this.hoveredInventoryItem !== null && this.inventory[this.hoveredInventoryItem]) {
                    const hoveredItem = this.inventory[this.hoveredInventoryItem];
                    const description = this.itemDescriptions[hoveredItem.type];
                    
                    if (description) {
                        // 설명 텍스트 크기 계산
                        this.ctx.font = '14px Arial';
                        this.ctx.textAlign = 'left';
                        this.ctx.textBaseline = 'top';
                        const lines = description.split('\n');
                        const lineHeight = 18;
                        const padding = 10;
                        let maxWidth = 0;
                        
                        // 최대 너비 계산
                        for (let line of lines) {
                            const metrics = this.ctx.measureText(line);
                            if (metrics.width > maxWidth) {
                                maxWidth = metrics.width;
                            }
                        }
                        
                        const tooltipWidth = maxWidth + padding * 2;
                        const tooltipHeight = lines.length * lineHeight + padding * 2;
                        
                        // 툴팁 위치 (아이템 위쪽 또는 아래쪽)
                        let tooltipX = this.mouse.x + 15;
                        let tooltipY = this.mouse.y + 15;
                        
                        // 화면 밖으로 나가지 않도록 조정
                        if (tooltipX + tooltipWidth > this.canvas.width) {
                            tooltipX = this.mouse.x - tooltipWidth - 15;
                        }
                        if (tooltipY + tooltipHeight > this.canvas.height) {
                            tooltipY = this.mouse.y - tooltipHeight - 15;
                        }
                        
                        // 툴팁 배경
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                        this.ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
                        
                        // 툴팁 테두리
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
                        
                        // 설명 텍스트
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = '14px Arial';
                        this.ctx.textAlign = 'left';
                        this.ctx.textBaseline = 'top';
                        
                        for (let j = 0; j < lines.length; j++) {
                            this.ctx.fillText(lines[j], tooltipX + padding, tooltipY + padding + j * lineHeight);
                        }
                    }
                }
            }
            
            // 선택된 아이템 설명 표시 (인벤토리 창이 닫혀있고 아이템이 선택되어 있을 때)
            if (!this.gameOver && !this.showRewardSelection && !this.inventoryOpen && 
                this.selectedInventoryItem !== null && this.inventory[this.selectedInventoryItem]) {
                const selectedItem = this.inventory[this.selectedInventoryItem];
                const description = this.itemDescriptions[selectedItem.type];
                
                if (description) {
                    // 설명 텍스트 크기 계산
                    this.ctx.font = '16px Arial';
                    this.ctx.textAlign = 'left';
                    this.ctx.textBaseline = 'top';
                    const lines = description.split('\n');
                    const lineHeight = 22;
                    const padding = 15;
                    let maxWidth = 0;
                    
                    // 최대 너비 계산
                    for (let line of lines) {
                        const metrics = this.ctx.measureText(line);
                        if (metrics.width > maxWidth) {
                            maxWidth = metrics.width;
                        }
                    }
                    
                    const tooltipWidth = maxWidth + padding * 2;
                    const titleHeight = 30; // 제목 높이
                    const tooltipHeight = titleHeight + lines.length * lineHeight + padding * 2;
                    
                    // 툴팁 위치 (화면 중앙 아래, 가방 버튼 위)
                    const tooltipX = this.canvas.width / 2 - tooltipWidth / 2;
                    const tooltipY = this.canvas.height - 200; // 가방 버튼 위쪽
                    
                    // 툴팁 배경
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                    this.ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
                    
                    // 툴팁 테두리 (노란색으로 강조)
                    this.ctx.strokeStyle = '#ffff00';
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
                    
                    // 선택된 아이템 이름 표시 (위쪽에)
                    const selectedDisplayName = this.getItemDisplayName(selectedItem.type, selectedItem.colorIndex);
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.font = 'bold 18px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(`선택됨: ${selectedDisplayName}`, tooltipX + tooltipWidth / 2, tooltipY + padding);
                    
                    // 설명 텍스트
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = '16px Arial';
                    this.ctx.textAlign = 'left';
                    this.ctx.textBaseline = 'top';
                    
                    for (let j = 0; j < lines.length; j++) {
                        this.ctx.fillText(lines[j], tooltipX + padding, tooltipY + padding + titleHeight + j * lineHeight);
                    }
                }
            }
        
            // 가방 버튼 (화면 중앙 기준 맨 아래) - 가장 마지막에 그리기 (웨이브가 시작 안됐을 때만 표시)
            if (!this.gameOver && !this.showRewardSelection && !this.showCraftingTableReward && !this.waveStarted) {
                const bagSize = 60;
                const bagX = this.canvas.width / 2 - bagSize / 2;
                const bagY = this.canvas.height - bagSize - 20;
                
                // 가방 버튼 영역 저장
                this.inventoryButtonArea = {
                    x: bagX,
                    y: bagY,
                    width: bagSize,
                    height: bagSize
                };
                
                // 버튼 위치 계산
                const deleteSize = 60;
                const deleteX = bagX - deleteSize - 10; // 가방 버튼 왼쪽
                const deleteY = bagY;
                
                // 쓰레기통 버튼 (웨이브가 시작 안됐을 때만 표시)
                {
                
                // 쓰레기통 버튼 영역 저장
                this.deleteButtonArea = {
                    x: deleteX,
                    y: deleteY,
                    width: deleteSize,
                    height: deleteSize
                };
                
                // 반투명 연한 빨강 배경 (둥근 모서리)
                const bgColor = this.deleteMode ? 'rgba(255, 150, 150, 0.9)' : 'rgba(255, 150, 150, 0.7)';
                this.ctx.fillStyle = bgColor;
                this.drawRoundedRectFill(deleteX, deleteY, deleteSize, deleteSize, 10);
                
                // 테두리
                this.ctx.strokeStyle = this.deleteMode ? '#ff0000' : '#cc0000';
                this.ctx.lineWidth = this.deleteMode ? 3 : 2;
                this.ctx.beginPath();
                this.ctx.moveTo(deleteX + 10, deleteY);
                this.ctx.lineTo(deleteX + deleteSize - 10, deleteY);
                this.ctx.quadraticCurveTo(deleteX + deleteSize, deleteY, deleteX + deleteSize, deleteY + 10);
                this.ctx.lineTo(deleteX + deleteSize, deleteY + deleteSize - 10);
                this.ctx.quadraticCurveTo(deleteX + deleteSize, deleteY + deleteSize, deleteX + deleteSize - 10, deleteY + deleteSize);
                this.ctx.lineTo(deleteX + 10, deleteY + deleteSize);
                this.ctx.quadraticCurveTo(deleteX, deleteY + deleteSize, deleteX, deleteY + deleteSize - 10);
                this.ctx.lineTo(deleteX, deleteY + 10);
                this.ctx.quadraticCurveTo(deleteX, deleteY, deleteX + 10, deleteY);
                this.ctx.closePath();
                this.ctx.stroke();
                
                // 쓰레기통 아이콘 그리기
                this.drawTrashIcon(deleteX, deleteY, deleteSize);
            }
            
            // 업그레이드 버튼 (쓰레기통 버튼 왼쪽)
            {
                const upgradeSize = 60;
                const upgradeX = deleteX - upgradeSize - 10; // 쓰레기통 버튼 왼쪽
                const upgradeY = bagY;
                
                // 업그레이드 버튼 영역 저장
                this.upgradeButtonArea = {
                    x: upgradeX,
                    y: upgradeY,
                    width: upgradeSize,
                    height: upgradeSize
                };
                
                // 반투명 파란색 배경 (둥근 모서리)
                const bgColor = this.upgradeMode ? 'rgba(100, 150, 255, 0.9)' : 'rgba(100, 150, 255, 0.7)';
                this.ctx.fillStyle = bgColor;
                this.drawRoundedRectFill(upgradeX, upgradeY, upgradeSize, upgradeSize, 10);
                
                // 테두리
                this.ctx.strokeStyle = this.upgradeMode ? '#0066ff' : '#0044cc';
                this.ctx.lineWidth = this.upgradeMode ? 3 : 2;
                this.ctx.beginPath();
                this.ctx.moveTo(upgradeX + 10, upgradeY);
                this.ctx.lineTo(upgradeX + upgradeSize - 10, upgradeY);
                this.ctx.quadraticCurveTo(upgradeX + upgradeSize, upgradeY, upgradeX + upgradeSize, upgradeY + 10);
                this.ctx.lineTo(upgradeX + upgradeSize, upgradeY + upgradeSize - 10);
                this.ctx.quadraticCurveTo(upgradeX + upgradeSize, upgradeY + upgradeSize, upgradeX + upgradeSize - 10, upgradeY + upgradeSize);
                this.ctx.lineTo(upgradeX + 10, upgradeY + upgradeSize);
                this.ctx.quadraticCurveTo(upgradeX, upgradeY + upgradeSize, upgradeX, upgradeY + upgradeSize - 10);
                this.ctx.lineTo(upgradeX, upgradeY + 10);
                this.ctx.quadraticCurveTo(upgradeX, upgradeY, upgradeX + 10, upgradeY);
                this.ctx.closePath();
                this.ctx.stroke();
                
                // 업그레이드 아이콘 그리기 (가운데 파란 동그라미, 주변에 7개의 작은 하늘색 동그라미)
                this.drawUpgradeIcon(upgradeX, upgradeY, upgradeSize);
            }
            
            // 반투명 회색 배경 (둥근 모서리) - 더 진하게
            this.ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
            this.drawRoundedRectFill(bagX, bagY, bagSize, bagSize, 10);
            
            // 테두리 추가 (더 명확하게 보이도록)
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(bagX + 10, bagY);
            this.ctx.lineTo(bagX + bagSize - 10, bagY);
            this.ctx.quadraticCurveTo(bagX + bagSize, bagY, bagX + bagSize, bagY + 10);
            this.ctx.lineTo(bagX + bagSize, bagY + bagSize - 10);
            this.ctx.quadraticCurveTo(bagX + bagSize, bagY + bagSize, bagX + bagSize - 10, bagY + bagSize);
            this.ctx.lineTo(bagX + 10, bagY + bagSize);
            this.ctx.quadraticCurveTo(bagX, bagY + bagSize, bagX, bagY + bagSize - 10);
            this.ctx.lineTo(bagX, bagY + 10);
            this.ctx.quadraticCurveTo(bagX, bagY, bagX + 10, bagY);
            this.ctx.closePath();
            this.ctx.stroke();
            
            // 가방 아이콘 그리기
            this.drawBagIcon(bagX, bagY, bagSize);
            
            // 버튼 위치 계산 (블록 밖에서 정의하여 다른 버튼에서도 사용 가능)
            const giveItemsSize = 60;
            const giveItemsX = bagX + bagSize + 10; // 가방 버튼 오른쪽
            const giveItemsY = bagY;
            
            // 아이템 지급 버튼 (가방 버튼 오른쪽)
            {
                
                // 아이템 지급 버튼 영역 저장
                this.giveItemsButtonArea = {
                    x: giveItemsX,
                    y: giveItemsY,
                    width: giveItemsSize,
                    height: giveItemsSize
                };
                
                // 반투명 초록색 배경 (둥근 모서리)
                this.ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
                this.drawRoundedRectFill(giveItemsX, giveItemsY, giveItemsSize, giveItemsSize, 10);
                
                // 테두리
                this.ctx.strokeStyle = '#00aa00';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(giveItemsX + 10, giveItemsY);
                this.ctx.lineTo(giveItemsX + giveItemsSize - 10, giveItemsY);
                this.ctx.quadraticCurveTo(giveItemsX + giveItemsSize, giveItemsY, giveItemsX + giveItemsSize, giveItemsY + 10);
                this.ctx.lineTo(giveItemsX + giveItemsSize, giveItemsY + giveItemsSize - 10);
                this.ctx.quadraticCurveTo(giveItemsX + giveItemsSize, giveItemsY + giveItemsSize, giveItemsX + giveItemsSize - 10, giveItemsY + giveItemsSize);
                this.ctx.lineTo(giveItemsX + 10, giveItemsY + giveItemsSize);
                this.ctx.quadraticCurveTo(giveItemsX, giveItemsY + giveItemsSize, giveItemsX, giveItemsY + giveItemsSize - 10);
                this.ctx.lineTo(giveItemsX, giveItemsY + 10);
                this.ctx.quadraticCurveTo(giveItemsX, giveItemsY, giveItemsX + 10, giveItemsY);
                this.ctx.closePath();
                this.ctx.stroke();
                
                // 아이템 지급 아이콘 그리기 (+ 모양)
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.fillStyle = '#ffffff';
                this.ctx.lineWidth = 4;
                const centerX = giveItemsX + giveItemsSize / 2;
                const centerY = giveItemsY + giveItemsSize / 2;
                const iconSize = 20;
                
                // + 모양
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - iconSize / 2, centerY);
                this.ctx.lineTo(centerX + iconSize / 2, centerY);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - iconSize / 2);
                this.ctx.lineTo(centerX, centerY + iconSize / 2);
                this.ctx.stroke();
            }
            
            // 적 소환 버튼 (노란색 X) - 아이템 지급 버튼 오른쪽
            {
                const spawnEnemySize = 60;
                const spawnEnemyX = giveItemsX + giveItemsSize + 10; // 아이템 지급 버튼 오른쪽
                const spawnEnemyY = giveItemsY;
                
                // 적 소환 버튼 영역 저장
                this.spawnEnemyButtonArea = {
                    x: spawnEnemyX,
                    y: spawnEnemyY,
                    width: spawnEnemySize,
                    height: spawnEnemySize
                };
                
                // 반투명 노란색 배경 (둥근 모서리)
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
                this.drawRoundedRectFill(spawnEnemyX, spawnEnemyY, spawnEnemySize, spawnEnemySize, 10);
                
                // 테두리
                this.ctx.strokeStyle = '#ffaa00';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(spawnEnemyX + 10, spawnEnemyY);
                this.ctx.lineTo(spawnEnemyX + spawnEnemySize - 10, spawnEnemyY);
                this.ctx.quadraticCurveTo(spawnEnemyX + spawnEnemySize, spawnEnemyY, spawnEnemyX + spawnEnemySize, spawnEnemyY + 10);
                this.ctx.lineTo(spawnEnemyX + spawnEnemySize, spawnEnemyY + spawnEnemySize - 10);
                this.ctx.quadraticCurveTo(spawnEnemyX + spawnEnemySize, spawnEnemyY + spawnEnemySize, spawnEnemyX + spawnEnemySize - 10, spawnEnemyY + spawnEnemySize);
                this.ctx.lineTo(spawnEnemyX + 10, spawnEnemyY + spawnEnemySize);
                this.ctx.quadraticCurveTo(spawnEnemyX, spawnEnemyY + spawnEnemySize, spawnEnemyX, spawnEnemyY + spawnEnemySize - 10);
                this.ctx.lineTo(spawnEnemyX, spawnEnemyY + 10);
                this.ctx.quadraticCurveTo(spawnEnemyX, spawnEnemyY, spawnEnemyX + 10, spawnEnemyY);
                this.ctx.closePath();
                this.ctx.stroke();
                
                // X 모양 그리기
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 4;
                const centerX = spawnEnemyX + spawnEnemySize / 2;
                const centerY = spawnEnemyY + spawnEnemySize / 2;
                const iconSize = 20;
                
                // X 모양
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - iconSize / 2, centerY - iconSize / 2);
                this.ctx.lineTo(centerX + iconSize / 2, centerY + iconSize / 2);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(centerX + iconSize / 2, centerY - iconSize / 2);
                this.ctx.lineTo(centerX - iconSize / 2, centerY + iconSize / 2);
                this.ctx.stroke();
            }
        } else {
            // 게임 오버나 보상 선택 화면, 또는 웨이브가 시작되었을 때는 버튼 영역 초기화
            this.inventoryButtonArea = null;
            this.deleteButtonArea = null;
            this.upgradeButtonArea = null;
            this.giveItemsButtonArea = null;
            this.spawnEnemyButtonArea = null;
        }
        
            // 플레이어 업그레이드 창
            if (this.showPlayerUpgradeWindow && !this.gameOver && !this.showRewardSelection && !this.waveStarted) {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const windowWidth = 500;
                const windowHeight = 400;
                const windowX = centerX - windowWidth / 2;
                const windowY = centerY - windowHeight / 2;
                
                // 창 영역 저장
                this.playerUpgradeWindowArea = {
                    x: windowX,
                    y: windowY,
                    width: windowWidth,
                    height: windowHeight
                };
                
                // 검은 창 배경
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
                
                // 창 테두리
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
                
                // 닫기 버튼 (X) - 창 중앙 기준 왼쪽 위 대각선 모서리
                const closeButtonSize = 30;
                const closeButtonX = windowX + 20; // 왼쪽 위
                const closeButtonY = windowY + 20; // 왼쪽 위
                
                this.playerUpgradeCloseButtonArea = {
                    x: closeButtonX,
                    y: closeButtonY,
                    width: closeButtonSize,
                    height: closeButtonSize
                };
                
                // X 버튼 배경
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize);
                
                // X 버튼 테두리
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize);
                
                // X 그리기
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(closeButtonX + 5, closeButtonY + 5);
                this.ctx.lineTo(closeButtonX + closeButtonSize - 5, closeButtonY + closeButtonSize - 5);
                this.ctx.moveTo(closeButtonX + closeButtonSize - 5, closeButtonY + 5);
                this.ctx.lineTo(closeButtonX + 5, closeButtonY + closeButtonSize - 5);
                this.ctx.stroke();
                
                // 업그레이드 항목들
                const upgradeTypes = [
                    { key: 'damage', name: '대미지' },
                    { key: 'health', name: '체력' },
                    { key: 'speed', name: '속도' },
                    { key: 'range', name: '사거리' }
                ];
                
                const itemHeight = 80;
                const itemSpacing = 20;
                const startY = windowY + 80;
                
                this.playerUpgradeButtonAreas = {};
                
                for (let i = 0; i < upgradeTypes.length; i++) {
                    const upgradeType = upgradeTypes[i];
                    const upgrade = this.playerUpgrades[upgradeType.key];
                    const itemY = startY + i * (itemHeight + itemSpacing);
                    
                    // 업그레이드 비용 계산
                    let cost;
                    if (upgradeType.key === 'range') {
                        if (upgrade.level === 10) {
                            // 11레벨은 50000 경험치
                            cost = 50000;
                        } else {
                            // 사거리: 처음 50, 레벨당 +25
                            cost = 50 + (upgrade.level - 1) * 25;
                        }
                    } else {
                        // 다른 업그레이드: 기본 비용 + 레벨당 100
                        cost = upgrade.baseCost + (upgrade.level - 1) * 100;
                    }
                    
                    // 텍스트 표시
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.textAlign = 'left';
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(`${upgradeType.name} 업그레이드`, windowX + 20, itemY);
                    
                    // 레벨 및 비용 표시
                    this.ctx.font = '18px Arial';
                    if (upgradeType.key === 'range') {
                        // 사거리는 11레벨까지
                        this.ctx.fillText(`레벨: ${upgrade.level} / 11`, windowX + 20, itemY + 30);
                    } else {
                    this.ctx.fillText(`레벨: ${upgrade.level}`, windowX + 20, itemY + 30);
                    }
                    
                    // 만렙 체크
                    let isMaxLevel;
                    if (upgradeType.key === 'range') {
                        isMaxLevel = upgrade.level >= 11;
                    } else {
                        isMaxLevel = upgrade.level >= 10;
                    }
                    
                    if (isMaxLevel) {
                        this.ctx.fillText('MAX', windowX + 20, itemY + 55);
                    } else {
                        this.ctx.fillText(`비용: ${cost} XP`, windowX + 20, itemY + 55);
                    }
                    
                    // 초록색 버튼 (하얀 O 모양) - 만렙이 아닐 때만 표시
                    if (!isMaxLevel) {
                        const buttonSize = 40;
                        const buttonX = windowX + windowWidth - buttonSize - 20;
                        const buttonY = itemY + 20;
                        
                        this.playerUpgradeButtonAreas[upgradeType.key] = {
                            x: buttonX,
                            y: buttonY,
                            width: buttonSize,
                            height: buttonSize
                        };
                        
                        // 초록색 버튼 배경
                        this.ctx.fillStyle = '#00ff00';
                        this.ctx.fillRect(buttonX, buttonY, buttonSize, buttonSize);
                        
                        // 버튼 테두리
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(buttonX, buttonY, buttonSize, buttonSize);
                        
                        // 하얀 O 모양 그리기
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.arc(buttonX + buttonSize / 2, buttonY + buttonSize / 2, buttonSize / 3, 0, Math.PI * 2);
                        this.ctx.stroke();
                    } else {
                        // 만렙일 때는 버튼 영역 제거
                        this.playerUpgradeButtonAreas[upgradeType.key] = null;
                    }
                }
            }
            
            // 적 소환 창
            if (this.showEnemySpawnWindow && !this.gameOver && !this.showRewardSelection) {
                // 반투명 배경
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const windowWidth = 600;
                const windowHeight = 400;
                const windowX = centerX - windowWidth / 2;
                const windowY = centerY - windowHeight / 2;
                
                // 창 영역 저장
                this.enemySpawnWindowArea = {
                    x: windowX,
                    y: windowY,
                    width: windowWidth,
                    height: windowHeight
                };
                
                // 검은 창 배경
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
                
                // 창 테두리
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
                
                // 제목
                this.ctx.fillStyle = '#ffff00';
                this.ctx.font = 'bold 28px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText('적 소환', centerX, windowY + 20);
                
                // 적 타입 목록
                const enemyTypes = [
                    { key: 'normal', name: '일반', color: '#ff0000', effect: '데미지: 10' },
                    { key: 'defense', name: '방어', color: '#0000ff', effect: '벽 소환' },
                    { key: 'sharp', name: '날카로운', color: '#ff8800', effect: '데미지: 20' },
                    { key: 'archer', name: '석궁', color: '#8800ff', effect: '원거리 공격' },
                    { key: 'snake', name: '뱀', color: '#00ff00', effect: '독: 20 데미지' },
                    { key: 'poisonSnake', name: '원거리뱀', color: '#ff00ff', effect: '독 발사' },
                    { key: 'monkey', name: '원숭이', color: '#8b4513', effect: '체력 회복' },
                    { key: 'elephant', name: '코끼리', color: '#888888', effect: '중간보스' },
                    { key: 'rhino', name: '코뿔소', color: '#666666', effect: '돌진' },
                    { key: 'skunk', name: '스컹크', color: '#8b4513', effect: '방구 효과' },
                    { key: 'soldier', name: '군인', color: '#228b22', effect: '권총 발사' },
                    { key: 'knight', name: '기사', color: '#888888', effect: '검 공격' },
                    { key: 'boss', name: '보스', color: '#4a90e2', effect: '워터밤' }
                ];
                
                const buttonWidth = 100;
                const buttonHeight = 80;
                const buttonSpacing = 15;
                
                // 적 타입 버튼들 위치
                const totalButtonWidth = enemyTypes.length * buttonWidth + (enemyTypes.length - 1) * buttonSpacing;
                const startX = windowX + (windowWidth - totalButtonWidth) / 2;
                const buttonY = windowY + (windowHeight - buttonHeight) / 2;
                
                // 스크롤 초기화 (가로 배치에서는 스크롤 불필요)
                this.enemySpawnScrollOffset = 0;
                
                this.enemySpawnButtonAreas = {};
                
                for (let i = 0; i < enemyTypes.length; i++) {
                    const enemyType = enemyTypes[i];
                    const buttonX = startX + i * (buttonWidth + buttonSpacing);
                    
                    // 버튼 영역 저장
                    this.enemySpawnButtonAreas[enemyType.key] = {
                        x: buttonX,
                        y: buttonY,
                        width: buttonWidth,
                        height: buttonHeight
                    };
                    
                    // 마우스 호버 체크
                    const isHovered = this.mouse.x >= buttonX && 
                                      this.mouse.x <= buttonX + buttonWidth &&
                                      this.mouse.y >= buttonY && 
                                      this.mouse.y <= buttonY + buttonHeight;
                    
                    // 버튼 배경
                    if (isHovered) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    } else {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    }
                    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                    
                    // 버튼 테두리
                    this.ctx.strokeStyle = isHovered ? '#ffff00' : enemyType.color;
                    this.ctx.lineWidth = isHovered ? 4 : 2;
                    this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
                    
                    // 적 타입 이름
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 18px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(enemyType.name, buttonX + buttonWidth / 2, buttonY + 10);
                    
                    // 효과 표시 (독 효과는 특별히 강조)
                    this.ctx.font = '14px Arial';
                    if (enemyType.key === 'snake') {
                        // 독 효과는 초록색으로 강조
                        this.ctx.fillStyle = '#00ff00';
                        this.ctx.textBaseline = 'bottom';
                        this.ctx.fillText(enemyType.effect, buttonX + buttonWidth / 2, buttonY + buttonHeight - 10);
                    } else if (enemyType.key === 'skunk') {
                        // 스컹크는 방구 효과 시간 표시
                        this.ctx.fillStyle = '#ffff00'; // 노란색으로 강조
                        this.ctx.textBaseline = 'bottom';
                        this.ctx.fillText(`${this.skunkFartDuration}초 (휠)`, buttonX + buttonWidth / 2, buttonY + buttonHeight - 10);
                    } else {
                        this.ctx.fillStyle = '#cccccc';
                    this.ctx.textBaseline = 'bottom';
                    this.ctx.fillText(enemyType.effect, buttonX + buttonWidth / 2, buttonY + buttonHeight - 10);
                    }
                }
            }
        
            // 제작대 보상 화면
            if (this.showCraftingTableReward) {
                // 반투명 배경
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                // 제목
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 36px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText('제작대를 얻었습니다!!', centerX, centerY - 200);
                
                // 제작대 그림 (간단한 사각형으로 표현)
                const tableSize = 150;
                const tableX = centerX - tableSize / 2;
                const tableY = centerY - 100;
                
                // 제작대 배경 (갈색)
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(tableX, tableY, tableSize, tableSize);
                
                // 제작대 테두리
                this.ctx.strokeStyle = '#654321';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(tableX, tableY, tableSize, tableSize);
                
                // 제작대 무늬 (격자)
                this.ctx.strokeStyle = '#654321';
                this.ctx.lineWidth = 2;
                for (let i = 1; i < 3; i++) {
                    // 세로선
                    this.ctx.beginPath();
                    this.ctx.moveTo(tableX + (tableSize / 3) * i, tableY);
                    this.ctx.lineTo(tableX + (tableSize / 3) * i, tableY + tableSize);
                    this.ctx.stroke();
                    // 가로선
                    this.ctx.beginPath();
                    this.ctx.moveTo(tableX, tableY + (tableSize / 3) * i);
                    this.ctx.lineTo(tableX + tableSize, tableY + (tableSize / 3) * i);
                    this.ctx.stroke();
                }
                
                // 보상 받기 버튼
                const buttonWidth = 200;
                const buttonHeight = 60;
                const buttonX = centerX - buttonWidth / 2;
                const buttonY = centerY + 100;
                
                this.craftingTableRewardButtonArea = {
                    x: buttonX,
                    y: buttonY,
                    width: buttonWidth,
                    height: buttonHeight
                };
                
                // 마우스 호버 체크
                const isHovered = this.mouse.x >= buttonX && 
                                  this.mouse.x <= buttonX + buttonWidth &&
                                  this.mouse.y >= buttonY && 
                                  this.mouse.y <= buttonY + buttonHeight;
                
                // 버튼 배경 (파란색)
                this.ctx.fillStyle = isHovered ? '#0066cc' : '#0066ff';
                this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                
                // 버튼 테두리 (하얀색)
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
                
                // 버튼 텍스트 (하얀색)
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('보상 받기', centerX, buttonY + buttonHeight / 2);
            }
            
            // 제작대 UI
            if (this.showCraftingTable) {
                // 반투명 배경
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const windowWidth = 600;
                const windowHeight = 300;
                const windowX = centerX - windowWidth / 2;
                const windowY = centerY - windowHeight / 2;
                
                this.craftingTableWindowArea = {
                    x: windowX,
                    y: windowY,
                    width: windowWidth,
                    height: windowHeight
                };
                
                // 창 배경
                this.ctx.fillStyle = 'rgba(50, 50, 50, 0.95)';
                this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
                
                // 창 테두리
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
                
                // 제목
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 28px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText('제작대', centerX, windowY + 20);
                
                // 닫기 버튼
                const closeButtonSize = 30;
                const closeButtonX = windowX + windowWidth - closeButtonSize - 10;
                const closeButtonY = windowY + 10;
                
                this.craftingTableCloseButtonArea = {
                    x: closeButtonX,
                    y: closeButtonY,
                    width: closeButtonSize,
                    height: closeButtonSize
                };
                
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize);
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize);
                
                // X 그리기
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(closeButtonX + 5, closeButtonY + 5);
                this.ctx.lineTo(closeButtonX + closeButtonSize - 5, closeButtonY + closeButtonSize - 5);
                this.ctx.moveTo(closeButtonX + closeButtonSize - 5, closeButtonY + 5);
                this.ctx.lineTo(closeButtonX + 5, closeButtonY + closeButtonSize - 5);
                this.ctx.stroke();
                
                // 조합 슬롯과 결과 슬롯
                const slotSize = 100;
                const slotY = windowY + 100;
                const slotSpacing = 50;
                
                // 왼쪽 슬롯 2개
                this.craftingSlotAreas = [];
                for (let i = 0; i < 2; i++) {
                    const slotX = windowX + 100 + i * (slotSize + slotSpacing);
                    
                    this.craftingSlotAreas[i] = {
                        x: slotX,
                        y: slotY,
                        width: slotSize,
                        height: slotSize
                    };
                    
                    // 슬롯 배경
                    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
                    this.ctx.fillRect(slotX, slotY, slotSize, slotSize);
                    
                    // 슬롯 테두리
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(slotX, slotY, slotSize, slotSize);
                    
                    // 슬롯 내용
                    if (this.craftingSlots[i]) {
                        const itemType = this.craftingSlots[i];
                        const colorIndex = this.craftingSlotColors[i];
                        const slotDisplayName = this.getItemDisplayName(itemType, colorIndex);
                        
                        // 아이템 이미지가 있으면 그림으로 표시
                        if (this.itemImages[itemType]) {
                            const img = this.itemImages[itemType];
                            if (img && img.complete && img.naturalWidth > 0) {
                                const padding = 12;
                                this.ctx.drawImage(
                                    img,
                                    slotX + padding,
                                    slotY + padding,
                                    slotSize - padding * 2,
                                    slotSize - padding * 2
                                );
                            }
                        }
                        
                        // 아이템 이름 (그림 위에 표시)
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = 'bold 16px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'top';
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 4;
                        this.ctx.strokeText(slotDisplayName, slotX + slotSize / 2, slotY + 6);
                        this.ctx.fillText(slotDisplayName, slotX + slotSize / 2, slotY + 6);
                        
                        if (itemType === '색상(제작용)') {
                            const swatchSize = 26;
                            const swatchX = slotX + slotSize / 2 - swatchSize / 2;
                            const swatchY = slotY + slotSize - swatchSize - 8;
                            const colorEntry = this.getColorPaletteEntry(colorIndex);
                            this.ctx.fillStyle = colorEntry.color;
                            this.ctx.fillRect(swatchX, swatchY, swatchSize, swatchSize);
                            this.ctx.strokeStyle = '#000000';
                            this.ctx.lineWidth = 2;
                            this.ctx.strokeRect(swatchX, swatchY, swatchSize, swatchSize);
                        }
                    }
                }
                
                // 화살표
                const arrowX = windowX + 100 + 2 * (slotSize + slotSpacing);
                const arrowY = slotY + slotSize / 2;
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(arrowX, arrowY);
                this.ctx.lineTo(arrowX + 30, arrowY);
                this.ctx.lineTo(arrowX + 25, arrowY - 5);
                this.ctx.moveTo(arrowX + 30, arrowY);
                this.ctx.lineTo(arrowX + 25, arrowY + 5);
                this.ctx.stroke();
                
                // 결과 슬롯
                const resultX = arrowX + 50;
                this.craftingResultArea = {
                    x: resultX,
                    y: slotY,
                    width: slotSize,
                    height: slotSize
                };
                
                // 결과 슬롯 배경
                this.ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
                this.ctx.fillRect(resultX, slotY, slotSize, slotSize);
                
                // 결과 슬롯 테두리
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(resultX, slotY, slotSize, slotSize);
                
                // 결과 표시
                if (this.craftingResult) {
                    if (this.craftingResult === 'X') {
                        // X 표시
                        this.ctx.strokeStyle = '#ff0000';
                        this.ctx.lineWidth = 5;
                        this.ctx.beginPath();
                        this.ctx.moveTo(resultX + 10, slotY + 10);
                        this.ctx.lineTo(resultX + slotSize - 10, slotY + slotSize - 10);
                        this.ctx.moveTo(resultX + slotSize - 10, slotY + 10);
                        this.ctx.lineTo(resultX + 10, slotY + slotSize - 10);
                        this.ctx.stroke();
                    } else {
                        const resultType = this.craftingResult;
                        
                        // 결과 아이템 이미지
                        if (this.itemImages[resultType]) {
                            const img = this.itemImages[resultType];
                            if (img && img.complete && img.naturalWidth > 0) {
                                const padding = 12;
                                this.ctx.drawImage(
                                    img,
                                    resultX + padding,
                                    slotY + padding,
                                    slotSize - padding * 2,
                                    slotSize - padding * 2
                                );
                            }
                        }
                        
                        // 결과 아이템 이름 (그림 위에 표시)
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = 'bold 16px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'top';
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 4;
                        this.ctx.strokeText(resultType, resultX + slotSize / 2, slotY + 6);
                        this.ctx.fillText(resultType, resultX + slotSize / 2, slotY + 6);
                    }
                }
            }
            
            // 제작대 아이템 선택 창
            if (this.showCraftingItemSelection && this.showCraftingTable) {
                // 반투명 배경
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const windowWidth = 500;
                const windowHeight = 400;
                const windowX = centerX - windowWidth / 2;
                const windowY = centerY - windowHeight / 2;
                
                this.craftingItemSelectionWindowArea = {
                    x: windowX,
                    y: windowY,
                    width: windowWidth,
                    height: windowHeight
                };
                
                // 창 배경
                this.ctx.fillStyle = 'rgba(50, 50, 50, 0.95)';
                this.ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
                
                // 창 테두리
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
                
                // 제목
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText('아이템 선택', centerX, windowY + 20);
                
                // 인벤토리 아이템 목록 표시
                const buttonSize = 80;
                const buttonSpacing = 15;
                const buttonsPerRow = 4;
                const startX = windowX + 30;
                const startY = windowY + 70;
                const contentAreaTop = startY;
                const contentAreaBottom = windowY + windowHeight - 20;
                
                // 클리핑 영역 설정 (창 내부만 그리기)
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.rect(windowX, contentAreaTop, windowWidth, contentAreaBottom - contentAreaTop);
                this.ctx.clip();
                
                this.craftingItemButtonAreas = [];
                let visibleItemIndex = 0;
                
                // 표시 가능한 아이템 개수 계산
                let visibleItemCount = 0;
                for (let i = 0; i < this.inventory.length; i++) {
                    const item = this.inventory[i];
                    if (this.frameCount >= item.appearFrame && item.count > 0) {
                        visibleItemCount++;
                    }
                }
                
                // 최대 스크롤 오프셋 계산
                const totalRows = Math.ceil(visibleItemCount / buttonsPerRow);
                const totalHeight = totalRows * (buttonSize + buttonSpacing) - buttonSpacing;
                const maxScroll = Math.max(0, totalHeight - (contentAreaBottom - contentAreaTop));
                if (this.craftingItemSelectionScrollOffset > maxScroll) {
                    this.craftingItemSelectionScrollOffset = maxScroll;
                }
                
                for (let i = 0; i < this.inventory.length; i++) {
                    const item = this.inventory[i];
                    
                    // 아이템이 나타날 시간이 되었는지 확인
                    if (this.frameCount < item.appearFrame) {
                        continue; // 아직 나타나지 않음
                    }
                    
                    // 개수가 0보다 큰 아이템만 표시
                    if (item.count <= 0) {
                        continue;
                    }
                    
                    const row = Math.floor(visibleItemIndex / buttonsPerRow);
                    const col = visibleItemIndex % buttonsPerRow;
                    const buttonX = startX + col * (buttonSize + buttonSpacing);
                    const buttonY = startY + row * (buttonSize + buttonSpacing) - this.craftingItemSelectionScrollOffset;
                    
                    // 창 밖에 있는 아이템은 그리지 않음
                    if (buttonY + buttonSize < contentAreaTop || buttonY > contentAreaBottom) {
                        visibleItemIndex++;
                        continue;
                    }
                    
                    // 버튼 영역 저장 (스크롤 오프셋 적용)
                    this.craftingItemButtonAreas.push({
                        x: buttonX,
                        y: buttonY,
                        width: buttonSize,
                        height: buttonSize,
                        itemType: item.type
                    });
                    
                    // 마우스 호버 체크
                    const isHovered = this.mouse.x >= buttonX && 
                                      this.mouse.x <= buttonX + buttonSize &&
                                      this.mouse.y >= buttonY && 
                                      this.mouse.y <= buttonY + buttonSize;
                    
                    // 버튼 배경
                    this.ctx.fillStyle = isHovered ? 'rgba(200, 200, 200, 0.8)' : 'rgba(100, 100, 100, 0.8)';
                    this.ctx.fillRect(buttonX, buttonY, buttonSize, buttonSize);
                    
                    // 모든 아이템의 이미지 그리기
                    if (this.itemImages[item.type]) {
                        const img = this.itemImages[item.type];
                        // 이미지가 로드되었는지 확인
                        if (img && img.complete && img.naturalWidth > 0) {
                            this.ctx.drawImage(img, buttonX, buttonY, buttonSize, buttonSize);
                        }
                    }
                    
                    // 버튼 테두리
                    this.ctx.strokeStyle = isHovered ? '#ffff00' : '#ffffff';
                    this.ctx.lineWidth = isHovered ? 3 : 2;
                    this.ctx.strokeRect(buttonX, buttonY, buttonSize, buttonSize);
                    
                    // 아이템 이름 (이미지 위에 표시)
                    const buttonDisplayName = this.getItemDisplayName(item.type, item.colorIndex);
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';
                    // 텍스트 그림자 효과 (가독성 향상)
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeText(buttonDisplayName, buttonX + buttonSize / 2, buttonY + 5);
                    this.ctx.fillText(buttonDisplayName, buttonX + buttonSize / 2, buttonY + 5);
                    
                    if (item.type === '색상(제작용)') {
                        const swatchSize = 22;
                        const swatchX = buttonX + buttonSize / 2 - swatchSize / 2;
                        const swatchY = buttonY + 32;
                        const colorEntry = this.getColorPaletteEntry(item.colorIndex);
                        this.ctx.fillStyle = colorEntry.color;
                        this.ctx.fillRect(swatchX, swatchY, swatchSize, swatchSize);
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(swatchX, swatchY, swatchSize, swatchSize);
                    }
                    
                    // 개수 표시 (이미지 위에 표시)
                    if (item.count > 1) {
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = 'bold 16px Arial';
                        this.ctx.textAlign = 'left';
                        this.ctx.textBaseline = 'bottom';
                        // 텍스트 그림자 효과 (가독성 향상)
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 3;
                        this.ctx.strokeText(`x${item.count}`, buttonX + 5, buttonY + buttonSize - 5);
                        this.ctx.fillText(`x${item.count}`, buttonX + 5, buttonY + buttonSize - 5);
                    }
                    
                    visibleItemIndex++;
                }
                
                // 클리핑 해제
                this.ctx.restore();
            }
            
            // 보상 선택 화면
            if (this.showRewardSelection) {
                // 반투명 배경
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // 호버된 버튼 인덱스
                let hoveredButtonIndex = null;
                
                // 보상 버튼 그리기
                for (let i = 0; i < this.rewardButtons.length; i++) {
                    const button = this.rewardButtons[i];
                    
                    // 마우스 호버 체크
                    const isHovered = this.mouse.x >= button.x && 
                                      this.mouse.x <= button.x + button.width &&
                                      this.mouse.y >= button.y && 
                                      this.mouse.y <= button.y + button.height;
                    
                    if (isHovered) {
                        hoveredButtonIndex = i;
                    }
                    
                    // 버튼 배경 (워터밤 보상은 하늘색, 호버 시 강조)
                    if (this.bossKilled && this.waveNumber === 10) {
                        // 워터밤 보상은 하늘색 배경
                        if (isHovered) {
                            this.ctx.fillStyle = '#b0e0ff'; // 호버 시 약간 밝게
                        } else {
                            this.ctx.fillStyle = '#87ceeb'; // 하늘색
                        }
                    } else {
                        // 일반 보상은 흰색 배경
                    if (isHovered) {
                        this.ctx.fillStyle = '#f0f0f0'; // 호버 시 약간 밝게
                    } else {
                        this.ctx.fillStyle = '#ffffff';
                        }
                    }
                    this.ctx.fillRect(button.x, button.y, button.width, button.height);
                    
                    // 버튼 테두리 (호버 시 강조)
                    if (isHovered) {
                        this.ctx.strokeStyle = '#ffff00'; // 호버 시 노란색
                        this.ctx.lineWidth = 4;
                    } else {
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 3;
                    }
                    this.ctx.strokeRect(button.x, button.y, button.width, button.height);
                    
                    // 버튼 텍스트
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = 'bold 28px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    
                    // 보상 텍스트 및 경험치 비용 표시
                    let displayText = button.reward;
                    // 보상 개수 표기
                    if (button.reward === '벽') {
                        displayText = '벽 5x';
                    } else if (button.reward === '가시') {
                        displayText = '가시 3x';
                    } else if (button.reward === '물블럭') {
                        displayText = '물블럭 20x';
                    } else if (button.reward === '물총') {
                        displayText = '물총 1x';
                    } else if (button.reward === '깊은물블럭') {
                        displayText = '깊은물블럭';
                    }
                    
                    this.ctx.fillText(displayText, button.x + button.width / 2, button.y + button.height / 2);
                    
                    // 보상별 경험치 비용 설정
                    let rewardCost = 0;
                    if (button.reward === '벽') {
                        rewardCost = 50;
                    } else if (button.reward === '아처') {
                        rewardCost = 50;
                    } else if (button.reward === '문') {
                        rewardCost = 25;
                    } else if (button.reward === '가시') {
                        rewardCost = 50;
                    } else if (button.reward === '물블럭') {
                        rewardCost = 100;
                    } else if (button.reward === '물총') {
                        rewardCost = 50;
                    } else if (button.reward === '깊은물블럭') {
                        rewardCost = 150;
                    }
                    
                    // 블록 위에 경험치 비용 표시 (블록 위쪽)
                    this.ctx.fillStyle = '#ffd700'; // 금색
                    this.ctx.font = 'bold 18px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'bottom';
                    this.ctx.fillText(`${rewardCost} XP`, button.x + button.width / 2, button.y - 5);
                }
                
                // 건너뛰기 버튼 그리기
                if (this.skipRewardButtonArea) {
                    const skipButton = this.skipRewardButtonArea;
                    const isHovered = this.mouse.x >= skipButton.x && 
                                    this.mouse.x <= skipButton.x + skipButton.width &&
                                    this.mouse.y >= skipButton.y && 
                                    this.mouse.y <= skipButton.y + skipButton.height;
                    
                    // 버튼 배경
                    this.ctx.fillStyle = isHovered ? '#e0e0e0' : '#cccccc';
                    this.ctx.fillRect(skipButton.x, skipButton.y, skipButton.width, skipButton.height);
                    
                    // 버튼 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(skipButton.x, skipButton.y, skipButton.width, skipButton.height);
                    
                    // 버튼 텍스트
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText('건너뛰기', skipButton.x + skipButton.width / 2, skipButton.y + skipButton.height / 2);
                }
                
                // 리롤 버튼 그리기
                if (this.rerollRewardButtonArea) {
                    const rerollButton = this.rerollRewardButtonArea;
                    const isHovered = this.mouse.x >= rerollButton.x && 
                                    this.mouse.x <= rerollButton.x + rerollButton.width &&
                                    this.mouse.y >= rerollButton.y && 
                                    this.mouse.y <= rerollButton.y + rerollButton.height;
                    
                    // 물블럭 등이 나올 때는 리롤 불가
                    const hasSpecialReward = this.rewards.some(r => 
                        r === '물블럭' || r === '물총' || r === '깊은물블럭'
                    );
                    const canReroll = !hasSpecialReward && this.rerollCountdown === null && this.experience >= this.rerollCost;
                    const isDisabled = hasSpecialReward || this.rerollCountdown === 0;
                    
                    // 버튼 배경
                    if (isDisabled) {
                        this.ctx.fillStyle = '#808080'; // 회색 (비활성화)
                    } else {
                        this.ctx.fillStyle = isHovered ? '#e0e0e0' : '#cccccc';
                    }
                    this.ctx.fillRect(rerollButton.x, rerollButton.y, rerollButton.width, rerollButton.height);
                    
                    // 버튼 테두리
                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(rerollButton.x, rerollButton.y, rerollButton.width, rerollButton.height);
                    
                    // 버튼 텍스트
                    this.ctx.fillStyle = isDisabled ? '#555555' : '#000000';
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    
                    // 리롤 카운트다운 표시
                    if (this.rerollCountdown !== null && this.rerollCountdown > 0) {
                        this.ctx.fillText(`${this.rerollCountdown}`, rerollButton.x + rerollButton.width / 2, rerollButton.y + rerollButton.height / 2);
                    } else if (this.rerollCountdown === 0) {
                        this.ctx.fillText('0', rerollButton.x + rerollButton.width / 2, rerollButton.y + rerollButton.height / 2);
                    } else {
                        this.ctx.fillText('리롤', rerollButton.x + rerollButton.width / 2, rerollButton.y + rerollButton.height / 2);
                    }
                    
                    // 가격 표시 (버튼 위쪽)
                    if (!isDisabled && this.rerollCountdown === null) {
                        this.ctx.fillStyle = '#ffd700'; // 금색
                        this.ctx.font = 'bold 16px Arial';
                        this.ctx.textBaseline = 'bottom';
                        this.ctx.fillText(`${this.rerollCost} XP`, rerollButton.x + rerollButton.width / 2, rerollButton.y - 5);
                    }
                }
                
                // 호버된 버튼 설명 표시
                if (hoveredButtonIndex !== null && this.rewardButtons[hoveredButtonIndex]) {
                    const hoveredButton = this.rewardButtons[hoveredButtonIndex];
                    const rewardType = hoveredButton.reward;
                    const description = this.itemDescriptions[rewardType];
                    
                    if (description) {
                        // 설명 텍스트 크기 계산
                        this.ctx.font = '16px Arial';
                        this.ctx.textAlign = 'left';
                        this.ctx.textBaseline = 'top';
                        const lines = description.split('\n');
                        const lineHeight = 22;
                        const padding = 15;
                        let maxWidth = 0;
                        
                        // 최대 너비 계산
                        for (let line of lines) {
                            const metrics = this.ctx.measureText(line);
                            if (metrics.width > maxWidth) {
                                maxWidth = metrics.width;
                            }
                        }
                        
                        const tooltipWidth = maxWidth + padding * 2;
                        const tooltipHeight = lines.length * lineHeight + padding * 2;
                        
                        // 툴팁 위치 (버튼 위쪽)
                        let tooltipX = hoveredButton.x + hoveredButton.width / 2 - tooltipWidth / 2;
                        let tooltipY = hoveredButton.y - tooltipHeight - 10;
                        
                        // 화면 밖으로 나가지 않도록 조정
                        if (tooltipX < 0) {
                            tooltipX = 10;
                        }
                        if (tooltipX + tooltipWidth > this.canvas.width) {
                            tooltipX = this.canvas.width - tooltipWidth - 10;
                        }
                        if (tooltipY < 0) {
                            tooltipY = hoveredButton.y + hoveredButton.height + 10;
                        }
                        
                        // 툴팁 배경
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                        this.ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
                        
                        // 툴팁 테두리 (노란색으로 강조)
                        this.ctx.strokeStyle = '#ffff00';
                        this.ctx.lineWidth = 3;
                        this.ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
                        
                        // 설명 텍스트
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = '16px Arial';
                        this.ctx.textAlign = 'left';
                        this.ctx.textBaseline = 'top';
                        
                        for (let j = 0; j < lines.length; j++) {
                            this.ctx.fillText(lines[j], tooltipX + padding, tooltipY + padding + j * lineHeight);
                        }
                    }
                }
            }
        
            // 섬광탄 히트박스 그리기
            for (let i = 0; i < this.flashbangs.length; i++) {
                const flashbang = this.flashbangs[i];
                this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(flashbang.x, flashbang.y, flashbang.hitboxRadius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // 섬광탄 블록 히트박스 그리기
            for (let block of this.blocks) {
                if (block.type !== '섬광탄') continue;
                const centerX = block.x + this.studSize / 2;
                const centerY = block.y + this.studSize / 2;
                const radius = block.flashbangRadius || this.studSize * 3;
                
                this.ctx.strokeStyle = 'rgba(255, 255, 150, 0.35)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // 섬광탄 발사체 그리기
            for (let projectile of this.flashbangProjectiles) {
                const gradient = this.ctx.createRadialGradient(
                    projectile.x, projectile.y, 0,
                    projectile.x, projectile.y, projectile.innerRadius
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                gradient.addColorStop(1, 'rgba(255, 255, 0, 0.2)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.innerRadius, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // 섬광탄 폭발 이펙트
            for (let explosion of this.flashbangExplosions) {
                const progress = explosion.timer / explosion.duration;
                const alpha = Math.max(0, 1 - progress);
                const gradient = this.ctx.createRadialGradient(
                    explosion.x, explosion.y, 0,
                    explosion.x, explosion.y, explosion.radius
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 화면 하얀색 효과 (섬광탄)
            if (this.screenFlash.active) {
                let alpha = 1.0;
                if (this.screenFlash.fadeOut && this.screenFlash.fadeDuration > 0) {
                    const fadeProgress = this.screenFlash.fadeTimer / this.screenFlash.fadeDuration;
                    alpha = Math.max(0, 1.0 - fadeProgress);
                }
                
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
            
            // 게임 오버 페이드 아웃 효과
            if (this.gameOver) {
                // 검은색 그라데이션 오버레이
                const gradient = this.ctx.createRadialGradient(
                    this.canvas.width / 2, this.canvas.height / 2, 0,
                    this.canvas.width / 2, this.canvas.height / 2, 
                    Math.max(this.canvas.width, this.canvas.height) / 2
                );
                gradient.addColorStop(0, `rgba(0, 0, 0, ${this.fadeAlpha * 0.5})`);
                gradient.addColorStop(1, `rgba(0, 0, 0, ${this.fadeAlpha})`);
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // 완전히 검어지면 메시지 표시
                if (this.showGameOverMessage) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    // 게임 오버 화면: 중앙 기준 위에서부터
                    const centerX = this.canvas.width / 2;
                    const centerY = this.canvas.height / 2;
                    let currentY = centerY - 120;
                    
                    // 1) 누구에게/어떻게 죽었는지 그림 (enemyImages 또는 상태 기반)
                    if (this.monsterName === '독 뱀') {
                        // 독뱀에게 죽었을 때: 독뱀 머리 이미지 사용
                        const deathImageKeyMap = {
                            '독 뱀': 'snakeHead'
                        };
                        const imageKey = deathImageKeyMap[this.monsterName];
                        const enemyImg = imageKey ? this.enemyImages[imageKey] : null;
                        
                        if (enemyImg && enemyImg.complete && enemyImg.naturalWidth > 0) {
                            const imgSize = 120;
                            this.ctx.drawImage(
                                enemyImg,
                                centerX - imgSize / 2,
                                currentY - imgSize / 2,
                                imgSize,
                                imgSize
                            );
                            
                            // 물고기 계열은 이미지 위에 얼굴 이모티콘을 텍스트로 표시
                            if (this.monsterName === '물고기' ||
                                this.monsterName === '하늘색 물고기' ||
                                this.monsterName === '폭발 물고기') {
                                this.ctx.save();
                                this.ctx.font = '48px Arial';
                                this.ctx.textAlign = 'center';
                                this.ctx.textBaseline = 'middle';
                                
                                if (this.monsterName === '물고기') {
                                    this.ctx.fillStyle = '#ffffff'; // 흰 글씨
                                    this.ctx.fillText(':0', centerX, currentY);
                                } else if (this.monsterName === '하늘색 물고기') {
                                    this.ctx.fillStyle = '#ffffff'; // 흰 글씨
                                    this.ctx.fillText(';)', centerX, currentY);
                                } else if (this.monsterName === '폭발 물고기') {
                                    this.ctx.fillStyle = '#ff3333'; // 빨간 글씨
                                    this.ctx.fillText('XD', centerX, currentY);
                                }
                                
                                this.ctx.restore();
                            }
                        } else {
                            // 이미지가 없으면 기본 독 오라 연출 사용
                            const r = 40;
                            this.ctx.fillStyle = 'rgba(138, 43, 226, 0.7)';
                            this.ctx.beginPath();
                            this.ctx.arc(centerX, currentY, r + 10, 0, Math.PI * 2);
                            this.ctx.fill();
                        }
                    } else if (this.diedFromFire) {
                        // 불로 죽었을 때: 플레이어 실루엣 + 주황색 오라
                        const r = 40;
                        // 주황색 오라
                        this.ctx.fillStyle = 'rgba(255, 140, 0, 0.7)'; // 주황색
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, currentY, r + 10, 0, Math.PI * 2);
                        this.ctx.fill();
                        // 흰색 플레이어 실루엣
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.beginPath();
                        this.ctx.rect(centerX - 12, currentY - 24, 24, 36);
                        this.ctx.fill();
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, currentY - 32, 10, 0, Math.PI * 2);
                        this.ctx.fill();
                    } else if (this.diedFromPoison) {
                        // 독으로 죽었을 때: 플레이어 실루엣 + 보라색 오라
                        const r = 40;
                        // 보라색 오라
                        this.ctx.fillStyle = 'rgba(138, 43, 226, 0.7)'; // 보라색
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, currentY, r + 10, 0, Math.PI * 2);
                        this.ctx.fill();
                        // 흰색 플레이어 실루엣
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.beginPath();
                        this.ctx.rect(centerX - 12, currentY - 24, 24, 36);
                        this.ctx.fill();
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, currentY - 32, 10, 0, Math.PI * 2);
                        this.ctx.fill();
                    } else if (this.diedFromBleeding) {
                        // 출혈로 죽었을 때: 플레이어 실루엣 + 피 효과
                        const r = 40;
                        // 어두운 빨강 배경 원
                        this.ctx.fillStyle = '#4b0000';
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, currentY, r + 10, 0, Math.PI * 2);
                        this.ctx.fill();
                        // 밝은 빨강 피 웅덩이
                        this.ctx.fillStyle = '#b30000';
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, currentY + 10, r, 0, Math.PI * 2);
                        this.ctx.fill();
                        // 흰색 플레이어 실루엣
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.beginPath();
                        this.ctx.rect(centerX - 12, currentY - 24, 24, 36);
                        this.ctx.fill();
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, currentY - 32, 10, 0, Math.PI * 2);
                        this.ctx.fill();
                    } else {
                        // 일반적인 몬스터에게 맞아 죽었을 때: 몬스터 이미지
                        const deathImageKeyMap = {
                            '동그라미': 'normal',
                            '방어 동그라미': 'defense',
                            '날카로운 동그라미': 'sharp',
                            '석궁 동그라미': 'archer',
                            '섬광 동그라미': 'flash',
                            '군인': 'soldier',
                            '코끼리': 'elephant',
                            '코뿔소': 'rhino',
                            '폭발 물고기': 'fishExplode',
                            '하늘색 물고기': 'fishBlue',
                            '물고기': 'fish',
                            '기사': 'knight',
                            '워터밤': 'boss',
                            '뱀': 'snakeHead', // 뱀에게 죽으면 뱀 머리 이미지
                            '독 뱀': 'snakeHead', // 독뱀에게 죽으면 독뱀 머리(같은 스프라이트) 이미지
                            '대포': 'cannon' // 대포에게 죽으면 대포 이미지
                        };
                        
                        const imageKey = deathImageKeyMap[this.monsterName];
                        const enemyImg = imageKey ? this.enemyImages[imageKey] : null;
                        
                        if (enemyImg && enemyImg.complete && enemyImg.naturalWidth > 0) {
                            const imgSize = 120;
                            this.ctx.drawImage(
                                enemyImg,
                                centerX - imgSize / 2,
                                currentY - imgSize / 2,
                                imgSize,
                                imgSize
                            );
                        }
                        // 이미지가 없어도 회색 동그라미를 그리지 않음
                    }
                    
                    // 간격 조정
                    currentY += 90;
                    
                    // 2) 설명 텍스트 (누가 어떻게 죽였는지)
                    this.ctx.fillStyle = '#dddddd';
                    this.ctx.font = '24px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    
                    let detailText;
                    if (this.monsterName === '독 뱀') {
                        // 독뱀에게 죽었을 때 전용 문구
                        detailText = '캬아아아';
                    } else if (this.diedFromPoison) {
                        detailText = '독 상태 이상으로 서서히 체력이 모두 깎였습니다.';
                    } else if (this.diedFromBleeding) {
                        detailText = '출혈로 인해 피를 너무 많이 흘려 쓰러졌습니다.';
                    } else if (this.monsterName === '동그라미') {
                        // 동그라미에게 죽었을 때는 특별한 인삿말을 표시
                        detailText = '안녕하세요?';
                    } else if (this.monsterName === '날카로운 동그라미') {
                        // 날카로운 동그라미에게 죽었을 때 전용 문구
                        detailText = '아우치, 따갑습니다.';
                    } else if (this.monsterName === '석궁 동그라미') {
                        // 석궁 동그라미에게 죽었을 때 전용 문구
                        detailText = '내 총알은 누구보다 빠릅니다!';
                    } else if (this.monsterName === '뱀') {
                        // 뱀에게 죽었을 때 전용 문구
                        detailText = '냐미';
                    } else if (this.monsterName === '코끼리') {
                        // 코끼리에게 죽었을 때 전용 문구
                        detailText = '무게는 무겁지만 발바닥은 말랑합니다!';
                    } else if (this.monsterName === '군인') {
                        // 군인에게 죽었을 때 전용 문구
                        detailText = '전쟁은 무섭습니다...';
                    } else if (this.monsterName === '코뿔소') {
                        // 코뿔소에게 죽었을 때 전용 문구
                        detailText = '맵 밖으로 쉽게 나갈 수 있습니다.';
                    } else if (this.monsterName === '폭발 물고기') {
                        // 폭발 물고기에게 죽었을 때 전용 문구
                        detailText = 'boom!';
                    } else if (this.monsterName === '하늘색 물고기') {
                        // 하늘색 물고기에게 죽었을 때 전용 문구
                        detailText = '나는 강합니다! >: )';
                    } else if (this.monsterName === '물고기') {
                        // 일반 물고기에게 죽었을 때 전용 문구
                        detailText = '생성 완료됨.';
                    } else if (this.monsterName === '기사') {
                        // 기사에게 죽었을 때 전용 문구
                        detailText = '코뿔소에게 배운 기술!!!';
                    } else if (this.monsterName === '워터밤') {
                        // 워터밤에게 죽었을 때 전용 문구
                        detailText = '나는 물고기가 좋아요. ; )';
                    } else {
                        detailText = `'${this.monsterName}'의 공격에 의해 쓰러졌습니다.`;
                    }
                    this.ctx.fillText(detailText, centerX, currentY);
                    
                    // 간격 조정
                    currentY += 60;
                    
                    // 3) 기존 게임 오버 메시지 ("누구에게 죽었습니다")
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 36px Arial';
                    const message = this.diedFromPoison
                        ? '당신은 독 중독으로 죽었습니다'
                        : `당신은 '${this.monsterName}'에게 죽었습니다.`;
                    this.ctx.fillText(message, centerX, currentY);
                    
                    // 1초 후 돌아가기 버튼 표시
                    if (this.showRestartButton) {
                        const buttonY = this.canvas.height / 2 + 100;
                        const buttonWidth = 200;
                        const buttonHeight = 50;
                        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
                        
                        // 버튼 영역 저장 (클릭 체크용)
                        this.restartButtonArea = {
                            x: buttonX,
                            y: buttonY,
                            width: buttonWidth,
                            height: buttonHeight
                        };
                        
                        // 하얀색 버튼 그리기
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                        
                        // 버튼 테두리
                        this.ctx.strokeStyle = '#000000';
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
                        
                        // 버튼 텍스트
                        this.ctx.fillStyle = '#000000';
                        this.ctx.font = 'bold 24px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText('돌아가기', this.canvas.width / 2, buttonY + buttonHeight / 2);
                    }
                }
            }
        } catch (error) {
            console.error('draw 함수 에러:', error);
            // 에러 발생 시 빈 화면이라도 그리기
            if (this.ctx && this.canvas) {
                try {
                    this.ctx.fillStyle = '#000000';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                } catch (e) {
                    // Canvas 에러 무시
                }
            }
        }
    }
    
    // 모든 효과 제거 (게임 오버 시)
    clearAllEffects() {
        // 화염병 관련 효과 제거
        this.gasolineBombProjectiles = [];
        this.gasolineBombHitboxes = [];
        this.fireParticles = [];
        
        // 적 발사체 제거
        this.enemyProjectiles = [];
        
        // 기타 발사체 제거
        this.archerProjectiles = [];
        this.playerBullets = [];
        this.bossProjectiles = [];
        
        // 파티클 효과 제거
        this.expParticles = [];
        this.waterParticles = [];
        
        // 기타 효과 제거
        this.poisonEffect = { active: false, damage: 0, timer: 0, initialDamage: 0 };
        this.mapDotDamage = { active: false, damage: 0, timer: 0, interval: 0.2 * 60, totalDamage: 20 };
        this.bleedingEffect = { active: false, damage: 0, timer: 0, particles: [] };
        this.skunkFartEffect = { active: false, timer: 0, maxDuration: 600 };
    }
    
    // 게임 오버 시 웨이브와 인벤토리 저장
    saveGameState() {
        this.savedWaveNumber = this.waveNumber;
        // 인벤토리 깊은 복사
        this.savedInventory = JSON.parse(JSON.stringify(this.inventory));
        // 경험치 저장
        this.savedExperience = this.experience;
        // 블럭 저장
        this.savedBlocks = JSON.parse(JSON.stringify(this.blocks));
    }
    
    restartGame() {
        // 10스테이지이고 보스가 있으면 웨이브 종료
        if (this.waveNumber === 10 && this.boss) {
            this.endWave();
            return; // endWave가 호출되면 게임 상태가 변경되므로 여기서 종료
        }
        
        // 게임 상태 초기화
        this.gameOver = false;
        this.previousGameOver = false;
        this.fadeAlpha = 0;
        this.showGameOverMessage = false;
        this.messageShowTime = 0;
        this.showRestartButton = false;
        this.restartButtonArea = null;
        this.diedFromPoison = false;
        this.diedFromFire = false;
        
        // 체력 초기화 (실제 값은 아래에서 업그레이드 기준으로 다시 설정됨)
        this.health = 0;
        this.updateHealthDisplay();
        
        // 적 초기화
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.monkeySpawnTimer = 0;
        this.bossKilled = false; // 워터밤 처치 상태 초기화
        
        // 웨이브 복원
        // 기본은 "저장된 웨이브 - 1" 로 한 단계 이전 웨이브에서 재시작하지만,
        // 이전 웨이브가 보스 스테이지(5의 배수)라면 다시 보스 스테이지로 돌아가지 않도록
        // 현재 웨이브(저장된 웨이브)에서 그대로 재시작한다.
        const restoredWaveCandidate = Math.max(1, this.savedWaveNumber - 1);
        const previousIsBossStage = restoredWaveCandidate > 0 && restoredWaveCandidate % 5 === 0;
        const restoredWave = previousIsBossStage ? this.savedWaveNumber : restoredWaveCandidate;
        this.waveNumber = restoredWave;
        this.waveTimer = this.waveTime;
        this.waveStarted = false;
        this.waveEnded = false;
        this.showRewardSelection = false;
        this.rewards = [];
        this.rewardButtons = [];
        this.startWaveButtonArea = null;
        this.skipWaveButtonArea = null;
        
        // 경험치 시스템 복원 (저장된 경험치가 있으면 복원, 없으면 0)
        if (this.savedExperience !== undefined && this.savedExperience !== null) {
            this.experience = this.savedExperience;
        } else {
        this.experience = 0;
        }
        this.blockUpgradeBaseCost = 200;
        this.upgradeMode = false;
        this.experienceOrbs = [];
        this.expParticles = [];
        
        // 플레이어 업그레이드 유지 (무기 선택과 함께 유지)
        // this.playerUpgrades는 그대로 유지 (초기화하지 않음)
        // 무기 선택도 유지 (this.selectedWeapon은 그대로 유지)
        this.showPlayerUpgradeWindow = false;
        this.playerUpgradeWindowArea = null;
        this.playerUpgradeCloseButtonArea = null;
        this.playerUpgradeButtonAreas = {};
        
        // 플레이어 속성 업데이트 (업그레이드 레벨에 맞게)
        if (this.playerUpgrades) {
            // 데미지 업그레이드 반영
            if (this.playerUpgrades.damage) {
                this.swordAttack.damage = 2 * Math.pow(1.1, this.playerUpgrades.damage.level - 1);
            } else {
                this.swordAttack.damage = 2;
            }
            // 체력 업그레이드 반영
            let maxHealth = 100;
            if (this.playerUpgrades.health) {
                maxHealth = 100 + (this.playerUpgrades.health.level - 1) * 10;
            }
            // 죽고 다시 태어날 때 최대 체력의 10%로 시작 (최소 1)
            this.health = Math.max(1, Math.floor(maxHealth * 0.1));
            // 속도 업그레이드 반영
            if (this.playerUpgrades.speed) {
                this.player.speed = 3 + (this.playerUpgrades.speed.level - 1) * 0.5;
            } else {
                this.player.speed = 3;
            }
            // 사거리 업그레이드 반영
            if (this.playerUpgrades.range) {
                this.swordAttack.length = 120 + (this.playerUpgrades.range.level - 1) * 10;
                if (this.playerUpgrades.range.level === 10) {
                    this.swordAttack.damage = 11; // 10레벨 칼 데미지
                }
            } else {
                this.swordAttack.length = 120;
            }
        } else {
            // 업그레이드가 없으면 기본값
            this.swordAttack.damage = 2;
            const maxHealth = 100;
            this.health = Math.max(1, Math.floor(maxHealth * 0.1)); // 기본 최대 체력 100의 10% = 10
            this.player.speed = 3;
        }
        
        // 인벤토리 복원 (저장된 인벤토리가 있으면 복원, 없으면 빈 배열)
        if (this.savedInventory && this.savedInventory.length > 0) {
            this.inventory = JSON.parse(JSON.stringify(this.savedInventory));
        } else {
            this.inventory = [];
        }
        this.inventoryOpen = false;
        this.selectedInventoryItem = null;
        
        // 블록 복원 (저장된 블록이 있으면 복원, 없으면 빈 배열)
        if (this.savedBlocks && this.savedBlocks.length > 0) {
            this.blocks = JSON.parse(JSON.stringify(this.savedBlocks));
        } else {
        this.blocks = [];
        }
        
        // 적 벽 초기화
        this.enemyWalls = [];
        
        // 아처 발사체 초기화
        this.archerProjectiles = [];
        this.playerBullets = [];
        this.gunCooldown = 0;
        this.minigunCooldown = 0;
        // 무기 선택은 유지 (리셋하지 않음)
        // this.selectedWeapon은 그대로 유지
        this.enemyProjectiles = [];
        
        // 화염병 시스템 초기화
        this.gasolineBombProjectiles = [];
        this.gasolineBombHitboxes = [];
        this.fireParticles = [];
        
        // 보스 초기화
        this.boss = null;
        this.bossProjectiles = [];
        this.fishes = [];
        this.fishSpawnTimer = 0;
        this.hitByFish = false;
        this.poisonEffect = { active: false, damage: 0, timer: 0, initialDamage: 0 };
        this.mapDotDamage = { active: false, damage: 0, timer: 0, interval: 0.2 * 60, totalDamage: 20 };
        this.playerHitColorTimer = 0;
        this.waterPools = [];
        this.waterParticles = [];
        this.waterPoolsGenerated = false;
        
        // 플레이어 위치 초기화
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height / 2 - this.player.height / 2;
    }
    
    updateWaveTimer() {
        // 웨이브가 시작되었을 때만 타이머 업데이트
        if (this.waveStarted && !this.waveEnded && !this.gameOver) {
            // 10스테이지이고 보스가 있으면 타이머가 0이 되어도 웨이브 종료하지 않음
            if (this.waveNumber === 10 && this.boss) {
                // 타이머는 계속 감소하지만 웨이브 종료는 하지 않음
                if (this.frameCount % 60 === 0) {
                    this.waveTimer--;
                    if (this.waveTimer < 0) {
                        this.waveTimer = 0;
                    }
                }
            } else {
            // 1초마다 타이머 감소
            if (this.frameCount % 60 === 0) {
                this.waveTimer--;
                if (this.waveTimer <= 0) {
                    this.waveTimer = 0;
                    this.endWave();
                    }
                }
            }
        }
    }
    
    startWave() {
        // 웨이브 시작
        this.waveStarted = true;
        // 숲(11 웨이브 이후)부터는 50초, 그 전에는 30초
        this.waveTimer = this.waveNumber > 10 ? 50 : this.waveTime;
        this.waveEnded = false;
        
        // 인벤토리 닫기 및 선택 해제
        this.inventoryOpen = false;
        this.selectedInventoryItem = null;
        this.deleteMode = false;
        this.upgradeMode = false;
        this.gatlingButtonAreas = {};
        
        // 10 웨이브 이후 물 웅덩이 생성
        if (this.waveNumber > 10) {
            if (this.waterPools.length === 0 && !this.waterPoolsGenerated) {
                this.generateWaterPools();
                this.waterPoolsGenerated = true;
            }
        }

        // 13 스테이지에서는 첫 소환을 스컹크로 고정하기 위해 플래그 초기화
        if (this.waveNumber === 13) {
            this.stage13InitialSkunkSpawned = false;
        }
        
        // 12 스테이지에서 웨이브 시작 시 바로 원숭이 1마리 소환
        if (this.waveNumber === 12) {
            const currentMonkeyCount = this.enemies.filter(e => e.type === 'monkey').length;
            if (currentMonkeyCount < 10) {
                this.spawnEnemy('monkey');
            }
        }
        
        // 10, 20, 30 스테이지에서 보스 생성
        if (this.waveNumber === 10) {
            this.spawnBoss(true); // 워터밤 보스 (10스테이지에서만)
        } else if (this.waveNumber === 20) {
            // 20스테이지: 코뿔소 보스 생성
            const currentRhinoCount = this.enemies.filter(e => e.type === 'rhino').length;
            if (currentRhinoCount === 0) {
                this.spawnEnemy('rhino');
            }
        } else if (this.waveNumber === 30) {
            // 30스테이지: 탱크 보스 생성
            const currentTankCount = this.enemies.filter(e => e.type === 'tank').length;
            if (currentTankCount === 0) {
                this.spawnEnemy('tank');
            }
        } else if (this.waveNumber % 5 === 0) {
            this.spawnBoss(false); // 중간보스 (5의 배수 스테이지)
        }
    }
    
    generateWaterPools() {
        // 물 웅덩이 생성 (호수처럼 크게, 겹치지 않게)
        const poolCount = 3 + Math.floor(Math.random() * 3); // 3~5개
        const canvasSize = Math.min(this.canvas.width, this.canvas.height);
        const minSize = Math.min(200, canvasSize * 0.2); // 최소 크기 (화면 크기에 비례)
        const maxSize = Math.min(400, canvasSize * 0.4); // 최대 크기 (화면 크기에 비례)
        const maxAttempts = 100; // 최대 시도 횟수 감소
        
        let generatedCount = 0;
        let attempts = 0;
        
        // 기존 웅덩이 배열 초기화 (혹시 모를 경우를 대비)
        if (this.waterPools.length === 0) {
            while (generatedCount < poolCount && attempts < maxAttempts) {
                attempts++;
                
                const width = minSize + Math.random() * (maxSize - minSize);
                const height = minSize + Math.random() * (maxSize - minSize);
                
                // 화면 내 랜덤 위치 (경계 체크)
                let x = Math.random() * Math.max(0, this.canvas.width - width);
                let y = Math.random() * Math.max(0, this.canvas.height - height);
                
                // 화면 밖으로 나가지 않도록 보정
                if (x < 0) x = 0;
                if (y < 0) y = 0;
                if (x + width > this.canvas.width) x = this.canvas.width - width;
                if (y + height > this.canvas.height) y = this.canvas.height - height;
                
                // 기존 웅덩이와 겹치는지 체크
                let overlaps = false;
                for (let existingPool of this.waterPools) {
                    const distanceX = Math.abs((x + width / 2) - (existingPool.x + existingPool.width / 2));
                    const distanceY = Math.abs((y + height / 2) - (existingPool.y + existingPool.height / 2));
                    const minDistanceX = (width + existingPool.width) / 2 + 30; // 최소 간격 30픽셀 (줄임)
                    const minDistanceY = (height + existingPool.height) / 2 + 30;
                    
                    if (distanceX < minDistanceX && distanceY < minDistanceY) {
                        overlaps = true;
                        break;
                    }
                }
                
                // 겹치지 않으면 추가
                if (!overlaps) {
                    this.waterPools.push({
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    });
                    generatedCount++;
                }
            }
        }
    }
    
    checkInWater(x, y, radius) {
        // 특정 위치가 물 블럭 안에 있는지 확인
        for (let block of this.blocks) {
            if (block.type !== '물') continue;
            
            // 블럭 중심점
            const blockCenterX = block.x + block.width / 2;
            const blockCenterY = block.y + block.height / 2;
            
            // 거리 계산
            const dx = x - blockCenterX;
            const dy = y - blockCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 블럭 반지름 (대각선 길이의 절반)
            const blockRadius = Math.sqrt(block.width * block.width + block.height * block.height) / 2;
            
            if (distance < blockRadius + radius) {
                return true;
            }
        }
        return false;
    }
    
    createWaterParticles(x, y) {
        // 물 파티클 생성
        const particleCount = 5;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            
            this.waterParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 15,
                maxLife: 15,
                size: 3 + Math.random() * 2
            });
        }
    }
    
    updateWaterParticles() {
        // 물 파티클 업데이트
        for (let i = this.waterParticles.length - 1; i >= 0; i--) {
            const particle = this.waterParticles[i];
            
            particle.life--;
            
            if (particle.life <= 0) {
                this.waterParticles.splice(i, 1);
                continue;
            }
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 중력 효과
            particle.vy += 0.2;
            
            // 속도 감소
            particle.vx *= 0.9;
            particle.vy *= 0.9;
        }
    }
    
    skipWave() {
        // 웨이브 건너뛰기 (1 웨이브 증가)
        this.waveNumber++;
    }
    
    endWave() {
        // 웨이브 종료
        this.waveEnded = true;
        
        if (!this.flashbangUnlocked && this.waveNumber >= 22) {
            this.unlockFlashbang('stage22');
        }
        
        // 모든 적 제거
        this.enemies = [];
        
        // 경험치 구슬은 제거하지 않음 (먹지 않은 이상 남아있음)
        // this.experienceOrbs = [];
        
        // 적 벽 제거
        this.enemyWalls = [];
        
        // 아처 발사체 제거
        this.archerProjectiles = [];
        this.playerBullets = [];
        this.gunCooldown = 0;
        this.minigunCooldown = 0;
        // 무기 선택은 유지 (리셋하지 않음)
        // this.selectedWeapon은 그대로 유지
        this.enemyProjectiles = [];
        
        // 화염병 시스템 초기화
        this.gasolineBombProjectiles = [];
        this.gasolineBombHitboxes = [];
        this.fireParticles = [];
        
        // 20 스테이지 클리어 시 제작대 보상 화면 표시
        if (this.waveNumber === 20) {
            this.showCraftingTableReward = true;
            this.showRewardSelection = false;
        } else {
            // 보상 선택지 생성 (웨이브 번호 증가 전에 생성해야 bossKilled 조건이 맞음)
            this.generateRewards();
            this.showRewardSelection = true;
        }
        
        // 웨이브 번호 증가
        this.waveNumber++;
    }
    
    generateRewards() {
        // 보상 선택지 생성
        this.rewards = [];
        this.rewardButtons = [];
        
        // 리롤 카운트다운 초기화
        this.rerollCountdown = null;
        
        // 워터밤을 잡았을 때는 특별한 보상 3개 고정
        // endWave()에서 웨이브 번호가 증가하기 전에 호출되므로, 10 또는 11 모두 체크
        if (this.bossKilled && (this.waveNumber === 10 || this.waveNumber === 11)) {
            this.rewards = ['물블럭', '물총', '깊은물블럭'];
        } else {
            // 일반 보상: 아처, 벽, 가시, 문 중 랜덤 3개 (지뢰는 제외)
            const allRewards = ['아처', '벽', '가시', '문'];
            // 3개 선택 (중복 가능)
            for (let i = 0; i < 3; i++) {
                const randomReward = allRewards[Math.floor(Math.random() * allRewards.length)];
                // 지뢰는 보상에서 제외
                if (randomReward !== '지뢰') {
                    this.rewards.push(randomReward);
                } else {
                    // 지뢰가 나오면 다시 선택 (다른 보상으로 대체)
                    i--;
                }
            }
        }
        
        // 버튼 영역 설정
        const buttonWidth = 200;
        const buttonHeight = 80;
        const buttonSpacing = 30;
        const totalWidth = buttonWidth * 3 + buttonSpacing * 2;
        const startX = (this.canvas.width - totalWidth) / 2;
        const buttonY = this.canvas.height / 2 + 50;
        
        for (let i = 0; i < 3; i++) {
            this.rewardButtons.push({
                x: startX + i * (buttonWidth + buttonSpacing),
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                reward: this.rewards[i]
            });
        }
        
        // 건너뛰기 버튼 영역 설정 (화면 중앙 기준 맨 아래 오른쪽 모서리)
        const skipButtonWidth = 120;
        const skipButtonHeight = 50;
        const skipButtonX = this.canvas.width / 2 + 150; // 중앙에서 오른쪽으로 150픽셀
        const skipButtonY = this.canvas.height - 80; // 맨 아래에서 80픽셀 위
        this.skipRewardButtonArea = {
            x: skipButtonX,
            y: skipButtonY,
            width: skipButtonWidth,
            height: skipButtonHeight
        };
        
        // 리롤 버튼 영역 설정 (건너뛰기 버튼 왼쪽)
        const rerollButtonWidth = 120;
        const rerollButtonHeight = 50;
        const rerollButtonX = skipButtonX - rerollButtonWidth - 20; // 건너뛰기 버튼 왼쪽에 20픽셀 간격
        const rerollButtonY = skipButtonY;
        this.rerollRewardButtonArea = {
            x: rerollButtonX,
            y: rerollButtonY,
            width: rerollButtonWidth,
            height: rerollButtonHeight
        };
    }
    
    selectReward(reward) {
        // 보상 선택 처리
        // reward가 null이면 건너뛰기 (아무것도 안 받음, 경험치 감소 없음)
        if (reward !== null) {
            // 보상별 경험치 비용 계산
            let rewardCost = 0;
            if (reward === '벽') {
                rewardCost = 50;
            } else if (reward === '아처') {
                rewardCost = 50;
            } else if (reward === '문') {
                rewardCost = 25;
            } else if (reward === '가시') {
                rewardCost = 50;
            } else if (reward === '물블럭') {
                rewardCost = 100;
            } else if (reward === '물총') {
                rewardCost = 50;
            } else if (reward === '깊은물블럭') {
                rewardCost = 150;
            }
            
            // 경험치가 부족하면 보상 선택 불가
            if (this.experience < rewardCost) {
                return;
            }
            
            // 경험치 차감
            this.experience -= rewardCost;
            
            // 보상에 따른 처리 - 인벤토리에 추가
            if (reward === '물블럭') {
                // 물 블럭 20개 추가
                this.addToInventory('물블럭', 20);
            } else if (reward === '물총') {
                // 물총 1개 추가
                this.addToInventory('물총', 1);
            } else if (reward === '깊은물블럭') {
                // 깊은 물블럭 추가
                this.addToInventory('깊은물블럭', 10);
            } else if (reward === '벽') {
                // 벽은 5개씩 추가
                this.addToInventory('벽', 5);
            } else if (reward === '가시') {
                // 가시는 3개씩 추가
                this.addToInventory('가시', 3);
            } else if (reward === '문') {
                // 문은 1개씩 추가
                this.addToInventory('문', 1);
            } else {
                // 아처는 1개씩 추가 (또는 기타 보상)
                this.addToInventory(reward, 1);
            }
        }

        // 보상 창 닫기 및 리롤 상태 초기화
        this.showRewardSelection = false;
        this.rewards = [];
        this.rewardButtons = [];
        this.rerollCountdown = null;
        this.rerollCost = 50; // 리롤 비용 초기화
        
        // 체력 회복하지 않음 (체력이 닳아도 웨이브를 끝내도 다시 안 차게)
        
        // 다음 웨이브 시작 (웨이브 시작 버튼을 다시 표시하기 위해)
        this.waveTimer = this.waveTime;
        this.waveStarted = false;
        this.waveEnded = false;
    }
    
    rerollRewards() {
        // 리롤 비용 증가
        this.rerollCost += 50;
        
        // 보상 다시 생성 (물블럭 등은 제외)
        const allRewards = ['아처', '벽', '가시', '문'];
        this.rewards = [];
        
        // 3개 선택 (중복 가능)
        for (let i = 0; i < 3; i++) {
            const randomReward = allRewards[Math.floor(Math.random() * allRewards.length)];
            this.rewards.push(randomReward);
        }
        
        // 버튼 영역 다시 설정
        const buttonWidth = 200;
        const buttonHeight = 80;
        const buttonSpacing = 30;
        const totalWidth = buttonWidth * 3 + buttonSpacing * 2;
        const startX = (this.canvas.width - totalWidth) / 2;
        const buttonY = this.canvas.height / 2 + 50;
        
        this.rewardButtons = [];
        for (let i = 0; i < 3; i++) {
            this.rewardButtons.push({
                x: startX + i * (buttonWidth + buttonSpacing),
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                reward: this.rewards[i]
            });
        }
    }
    
    gameLoop() {
        try {
            this.frameCount++;
            
            // 게임 오버가 되었을 때 모든 효과 제거 (한 번만)
            if (this.gameOver && !this.previousGameOver) {
                this.clearAllEffects();
            }
            this.previousGameOver = this.gameOver;
            
            // 게임 오버가 아니고 보상 선택 화면이 아닐 때만 업데이트
            if (!this.gameOver && !this.showRewardSelection) {
                this.updateWaveTimer();
                this.updatePlayer();
                this.updateEnemies();
                this.updateFlashbangBlocks();
                
                // 지뢰 블럭 업데이트 (폭발 후 제거)
                for (let i = this.blocks.length - 1; i >= 0; i--) {
                    const block = this.blocks[i];
                    if ((block.type === '지뢰' || block.type === '섬광 지뢰' || block.type === '총알 지뢰') && block.isExploding) {
                        // 폭발 타이머가 60 프레임(1초) 이상이면 제거
                        if (block.explosionTimer >= 60) {
                            this.blocks.splice(i, 1);
                        }
                    }
                }
                
                // 스컹크 방구 효과 업데이트
                if (this.skunkFartEffect.active) {
                    this.skunkFartEffect.timer++;
                    if (this.skunkFartEffect.timer >= this.skunkFartEffect.maxDuration) {
                        this.skunkFartEffect.active = false;
                        this.skunkFartEffect.timer = 0;
                    }
                }
            } else {
                // 게임 오버 시 페이드 아웃 효과
                if (this.fadeAlpha < 1) {
                    this.fadeAlpha += this.fadeSpeed;
                    if (this.fadeAlpha >= 1) {
                        this.fadeAlpha = 1;
                        this.showGameOverMessage = true;
                        this.messageShowTime = 0;
                    }
                }
                
                // 메시지가 표시된 후 1초(60프레임) 뒤 버튼 표시
                if (this.showGameOverMessage) {
                    this.messageShowTime++;
                    if (this.messageShowTime >= 60) {
                        this.showRestartButton = true;
                    }
                }
            }
            
            // 렌더링이 일시정지되지 않았을 때만 화면 그리기
            if (!this.renderPaused) {
                try {
                    this.draw();
                } catch (drawError) {
                    console.error('draw 함수 에러:', drawError);
                    // draw 에러가 발생해도 게임 로직은 계속 실행
                }
            }
        } catch (error) {
            console.error('게임 루프 에러:', error);
        } finally {
            // 에러가 발생해도 게임 루프는 계속 실행
            requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    drawMainMenu() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        if (this.menuState === 'start') {
            // 시작 화면: 1스테이지 맵 미리보기
            this.ctx.fillStyle = '#808080'; // 회색 바닥
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 스터드 구분선
            this.ctx.strokeStyle = '#666666';
            this.ctx.lineWidth = 1.5;
            for (let x = 0; x <= this.gridWidth; x++) {
                const lineX = x * this.studSize;
                this.drawRoundedRect(lineX - 1, 0, 2, this.canvas.height, 1);
            }
            for (let y = 0; y <= this.gridHeight; y++) {
                const lineY = y * this.studSize;
                this.drawRoundedRect(0, lineY - 1, this.canvas.width, 2, 1);
            }
            
            // 플레이어 미리보기 (중앙)
            const playerPreviewX = centerX;
            const playerPreviewY = centerY;
            this.ctx.fillStyle = '#4a90e2'; // 파란색
            this.ctx.fillRect(
                playerPreviewX - this.studSize * 0.4,
                playerPreviewY - this.studSize * 0.6,
                this.studSize * 0.8,
                this.studSize * 1.2
            );
            
            // '공 방어' 텍스트 (흔들림 효과)
            this.defenseTextShake.timer++;
            const shakeAmount = 2;
            const shakeX = Math.sin(this.defenseTextShake.timer * 0.05) * shakeAmount;
            const shakeY = Math.cos(this.defenseTextShake.timer * 0.07) * shakeAmount;
            
            this.ctx.font = 'bold 36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // 검은색 테두리
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 4;
            this.ctx.strokeText('공 방어', centerX + shakeX, centerY - 150 + shakeY);
            
            // 하얀색 글씨
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText('공 방어', centerX + shakeX, centerY - 150 + shakeY);
            
            // 플레이 버튼 (중앙 기준 맨 왼쪽에 살짝 위)
            const playButtonX = centerX - this.canvas.width / 2 + 100;
            const playButtonY = centerY - 50;
            const playButtonWidth = 150;
            const playButtonHeight = 60;
            
            this.playButtonArea = {
                x: playButtonX,
                y: playButtonY,
                width: playButtonWidth,
                height: playButtonHeight
            };
            
            // 버튼 배경
            this.ctx.fillStyle = '#4a90e2';
            this.ctx.fillRect(playButtonX, playButtonY, playButtonWidth, playButtonHeight);
            
            // 버튼 테두리
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(playButtonX, playButtonY, playButtonWidth, playButtonHeight);
            
            // 버튼 텍스트
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('플레이', playButtonX + playButtonWidth / 2, playButtonY + playButtonHeight / 2);
            
        } else if (this.menuState === 'modeSelect') {
            // 모드 선택 화면
            this.ctx.fillStyle = '#1a1a1a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 메인 모드 버튼
            const mainModeButtonY = centerY - 60;
            const buttonWidth = 300;
            const buttonHeight = 80;
            const mainModeButtonX = centerX - buttonWidth / 2;
            
            this.mainModeButtonArea = {
                x: mainModeButtonX,
                y: mainModeButtonY,
                width: buttonWidth,
                height: buttonHeight
            };
            
            this.ctx.fillStyle = '#4a90e2';
            this.ctx.fillRect(mainModeButtonX, mainModeButtonY, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(mainModeButtonX, mainModeButtonY, buttonWidth, buttonHeight);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('메인 모드', centerX, mainModeButtonY + buttonHeight / 2);
            
            // 서브 모드 버튼
            const subModeButtonY = centerY + 60;
            const subModeButtonX = centerX - buttonWidth / 2;
            
            this.subModeButtonArea = {
                x: subModeButtonX,
                y: subModeButtonY,
                width: buttonWidth,
                height: buttonHeight
            };
            
            this.ctx.fillStyle = '#4a90e2';
            this.ctx.fillRect(subModeButtonX, subModeButtonY, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(subModeButtonX, subModeButtonY, buttonWidth, buttonHeight);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText('서브 모드', centerX, subModeButtonY + buttonHeight / 2);
            
        } else if (this.menuState === 'chapterSelect') {
            // 장 선택 화면
            this.ctx.fillStyle = '#1a1a1a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 스크롤 애니메이션
            const scrollSpeed = 0.1;
            this.chapterScrollX += (this.targetScrollX - this.chapterScrollX) * scrollSpeed;
            
            // 장들 그리기
            const chapterWidth = 400;
            const chapterHeight = 500;
            const chapterSpacing = 50;
            const chapters = [1, 2];
            
            chapters.forEach((chapter, index) => {
                // 장 배치: 1장은 중앙(0), 2장은 오른쪽(chapterWidth + chapterSpacing)
                const baseOffset = (chapter - 1) * (chapterWidth + chapterSpacing);
                const chapterX = centerX - chapterWidth / 2 + baseOffset + this.chapterScrollX;
                const chapterY = centerY - chapterHeight / 2;
                
                // 호버 효과
                const isHovered = this.hoveredChapter === chapter;
                const scale = isHovered ? 1.1 : 1.0;
                const scaledWidth = chapterWidth * scale;
                const scaledHeight = chapterHeight * scale;
                const scaledX = chapterX - (scaledWidth - chapterWidth) / 2;
                const scaledY = chapterY - (scaledHeight - chapterHeight) / 2;
                
                // 장 카드 배경
                if (chapter === 1 || this.defeatedBosses.has(10)) {
                    // 1장이거나 10스테이지 보스를 잡았으면 1스테이지 맵 그림
                    this.ctx.fillStyle = '#808080';
                    this.ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
                    
                    // 스터드 구분선
                    this.ctx.strokeStyle = '#666666';
                    this.ctx.lineWidth = 1;
                    const studSize = 20;
                    for (let x = 0; x < scaledWidth / studSize; x++) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(scaledX + x * studSize, scaledY);
                        this.ctx.lineTo(scaledX + x * studSize, scaledY + scaledHeight);
                        this.ctx.stroke();
                    }
                    for (let y = 0; y < scaledHeight / studSize; y++) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(scaledX, scaledY + y * studSize);
                        this.ctx.lineTo(scaledX + scaledWidth, scaledY + y * studSize);
                        this.ctx.stroke();
                    }
                    
                    // 플레이어 미리보기
                    this.ctx.fillStyle = '#4a90e2';
                    this.ctx.fillRect(
                        scaledX + scaledWidth / 2 - studSize * 0.4,
                        scaledY + scaledHeight / 2 - studSize * 0.6,
                        studSize * 0.8,
                        studSize * 1.2
                    );
                } else {
                    // 아직 잡지 않은 보스면 검은색
                    this.ctx.fillStyle = '#000000';
                    this.ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
                }
                
                // 장 번호 텍스트
                this.ctx.font = 'bold 48px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // 검은색 테두리
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 6;
                this.ctx.strokeText(`${chapter}장`, scaledX + scaledWidth / 2, scaledY + scaledHeight - 80);
                
                // 하얀색 글씨
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText(`${chapter}장`, scaledX + scaledWidth / 2, scaledY + scaledHeight - 80);
                
                // 장 영역 저장
                if (!this.chapterAreas) this.chapterAreas = {};
                this.chapterAreas[chapter] = {
                    x: chapterX,
                    y: chapterY,
                    width: chapterWidth,
                    height: chapterHeight
                };
            });
            
            // 선택된 장이 있을 때 양옆에 보스 표시
            if (this.selectedChapter === 1) {
                // 왼쪽 보스 (워터밤 - 10스테이지)
                if (this.defeatedBosses.has(10)) {
                    const bossX = 100;
                    const bossY = centerY;
                    const bossRadius = 60;
                    
                    // 보스 원
                    this.ctx.fillStyle = '#1e90ff';
                    this.ctx.beginPath();
                    this.ctx.arc(bossX, bossY, bossRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 보스 이름
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('워터밤', bossX, bossY + bossRadius + 30);
                }
                
                // 오른쪽 보스 (코뿔소 - 20스테이지)
                if (this.defeatedBosses.has(20)) {
                    const bossX = this.canvas.width - 100;
                    const bossY = centerY;
                    const bossRadius = 60;
                    
                    // 보스 원
                    this.ctx.fillStyle = '#666666';
                    this.ctx.beginPath();
                    this.ctx.arc(bossX, bossY, bossRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 보스 이름
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('코뿔소', bossX, bossY + bossRadius + 30);
                }
            }
            
            // 1장 클리어 메시지 표시
            if (this.chapterClearMessage.show) {
                this.chapterClearMessage.timer++;
                if (this.chapterClearMessage.timer >= this.chapterClearMessage.duration) {
                    this.chapterClearMessage.show = false;
                    this.chapterClearMessage.timer = 0;
                } else {
                    // 연한 빨강 글씨로 '1장 클리어' 표시
                    this.ctx.fillStyle = '#ff9999'; // 연한 빨강
                    this.ctx.font = 'bold 48px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText('1장 클리어', centerX, centerY - 200);
                }
            }
        }
    }
}

// 게임 시작
let game;

window.addEventListener('load', () => {
    game = new TacticalGame();
});
