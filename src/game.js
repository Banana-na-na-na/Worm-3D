(function () {
  const canvas = document.getElementById("gameCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const aiLog = document.getElementById("aiLog");
  const craftBtn = document.getElementById("craftAbilityBtn");
  const abilityNameInput = document.getElementById("abilityName");
  const abilityPromptInput = document.getElementById("abilityPrompt");
  const equipSlotsEl = document.getElementById("equipSlots");
  const inventoryEl = document.getElementById("abilityInventory");

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const STORAGE_KEY = "jaea.abilities.v1";
  const EQUIP_SLOT_COUNT = 3;
  const RARITIES = [
    { name: "일반", chance: 0.55, bonus: 1 },
    { name: "희귀", chance: 0.3, bonus: 1.2 },
    { name: "영웅", chance: 0.12, bonus: 1.5 },
    { name: "전설", chance: 0.03, bonus: 2 },
  ];

  const state = {
    inventory: [],
    equipSlots: [null, null, null],
  };
  const enemies = [];
  const bombs = [];
  const explosions = [];

  const player = {
    x: canvas.width * 0.5,
    y: canvas.height * 0.5,
    baseSize: 28,
    baseSpeed: 260,
    size: 28,
    speed: 260,
    color: "#3b82f6",
  };
  const camera = {
    x: player.x,
    y: player.y,
  };

  function setLog(text) {
    if (aiLog) {
      aiLog.textContent = text;
    }
  }

  function randomRarity() {
    let roll = Math.random();
    for (let i = 0; i < RARITIES.length; i += 1) {
      roll -= RARITIES[i].chance;
      if (roll <= 0) return RARITIES[i];
    }
    return RARITIES[0];
  }

  function countKeywords(text, keywords) {
    let score = 0;
    keywords.forEach((word) => {
      if (text.includes(word)) score += 1;
    });
    return score;
  }

  function resolveTypeFromPrompt(prompt) {
    const speedScore = countKeywords(prompt, ["빠", "신속", "질주", "가속", "속도", "번개", "민첩", "바람"]);
    const sizeScore = countKeywords(prompt, ["거대", "강철", "육중", "단단", "방어", "몸집", "중량", "갑옷"]);
    const energyScore = countKeywords(prompt, ["에너지", "불꽃", "화염", "폭발", "레이저", "전기", "마력", "광선"]);

    if (speedScore >= sizeScore && speedScore >= energyScore) return "speed";
    if (sizeScore >= speedScore && sizeScore >= energyScore) return "size";
    return "energy";
  }

  function resolveRarityFromPrompt(prompt) {
    if (/(신화|초월|절대|궁극)/.test(prompt)) return RARITIES[3];
    if (/(전설|legend|유일|고대)/.test(prompt)) return RARITIES[3];
    if (/(영웅|hero|정예|희대)/.test(prompt)) return RARITIES[2];
    if (/(희귀|rare|특수)/.test(prompt)) return RARITIES[1];
    return randomRarity();
  }

  function parsePromptToBehavior(prompt) {
    const trigger = /(좌클릭|왼쪽 클릭|left click|마우스 좌클릭)/.test(prompt) ? "leftClick" : null;
    const action = /(폭탄|bomb|발사|쏘)/.test(prompt) ? "fireBomb" : null;
    const target = /(포인터|마우스|커서|위치|지점)/.test(prompt) ? "cursorWorld" : "forward";

    if (!trigger || !action) return null;
    return { trigger, action, target };
  }

  function behaviorLabel(behavior) {
    if (!behavior) return "패시브";
    if (behavior.trigger === "leftClick" && behavior.action === "fireBomb") {
      return "좌클릭: 포인터로 폭탄 발사";
    }
    return "행동 능력";
  }

  function makeAbility() {
    const promptRaw = abilityPromptInput && "value" in abilityPromptInput ? abilityPromptInput.value.trim() : "";
    const prompt = promptRaw.toLowerCase();
    const type = resolveTypeFromPrompt(prompt);
    const customName = abilityNameInput && "value" in abilityNameInput ? abilityNameInput.value.trim() : "";
    const rarity = resolveRarityFromPrompt(prompt);
    const ability = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      rarity: rarity.name,
      value: 0,
      name: customName || `${rarity.name} ${type.toUpperCase()} 코어`,
      behavior: parsePromptToBehavior(prompt),
    };

    if (type === "speed") {
      const fastBoost = countKeywords(prompt, ["매우", "엄청", "초고속", "빛", "폭풍", "순간"]);
      ability.value = Math.round((20 + Math.random() * 65 + fastBoost * 8) * rarity.bonus);
    } else if (type === "size") {
      const tankBoost = countKeywords(prompt, ["초거대", "철벽", "난공불락", "무적", "방패", "요새"]);
      ability.value = Math.round((3 + Math.random() * 10 + tankBoost * 1.5) * rarity.bonus);
    } else {
      const powerBoost = countKeywords(prompt, ["파괴", "초전하", "핵", "폭렬", "심연", "천둥"]);
      ability.value = Math.round((20 + Math.random() * 80 + powerBoost * 10) * rarity.bonus);
    }
    return ability;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      setLog("AI: 로컬 저장에 실패했습니다.");
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.inventory) && Array.isArray(parsed.equipSlots)) {
        state.inventory = parsed.inventory;
        state.equipSlots = parsed.equipSlots.slice(0, EQUIP_SLOT_COUNT);
        while (state.equipSlots.length < EQUIP_SLOT_COUNT) state.equipSlots.push(null);
      }
    } catch (error) {
      setLog("AI: 저장 데이터가 손상되어 초기화합니다.");
    }
  }

  function applyEquipEffects() {
    let speedBonus = 0;
    let sizeBonus = 0;
    let energyBonus = 0;
    for (let i = 0; i < state.equipSlots.length; i += 1) {
      const ability = state.equipSlots[i];
      if (!ability) continue;
      const value = Number(ability.value);
      const safeValue = Number.isFinite(value) ? value : 0;
      if (ability.type === "speed") speedBonus += safeValue;
      if (ability.type === "size") sizeBonus += safeValue;
      if (ability.type === "energy") energyBonus += safeValue;
    }

    player.speed = player.baseSpeed + speedBonus;
    player.size = Math.max(18, player.baseSize + sizeBonus * 0.3);
    const blueBoost = Math.min(255, 210 + Math.floor(energyBonus * 0.5));
    player.color = `rgb(59, 130, ${blueBoost})`;
  }

  function rarityEmoji(rarity) {
    if (rarity === "전설") return "🌟";
    if (rarity === "영웅") return "✨";
    if (rarity === "희귀") return "🔷";
    return "🔹";
  }

  function equipAbility(abilityId, slotIndex) {
    const target = state.inventory.find((ability) => ability.id === abilityId);
    if (!target) return;
    state.equipSlots[slotIndex] = target;
    applyEquipEffects();
    renderPanels();
    saveState();
    setLog(`AI: ${target.name} 를 슬롯 ${slotIndex + 1}에 장착했습니다.`);
  }

  function renderSlots() {
    if (!equipSlotsEl) return;
    equipSlotsEl.innerHTML = "";
    for (let i = 0; i < EQUIP_SLOT_COUNT; i += 1) {
      const slot = document.createElement("div");
      slot.className = "slot-item";
      const current = state.equipSlots[i];
      if (!current) {
        slot.innerHTML = `<strong>슬롯 ${i + 1}</strong><div class="slot-empty">비어 있음</div>`;
      } else {
        slot.innerHTML = `<strong>슬롯 ${i + 1}</strong><div>${rarityEmoji(current.rarity)} ${current.name} (+${current.value})</div>`;
      }
      equipSlotsEl.appendChild(slot);
    }
  }

  function renderInventory() {
    if (!inventoryEl) return;
    inventoryEl.innerHTML = "";
    if (state.inventory.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "inventory-item";
      emptyItem.textContent = "제작된 능력이 없습니다.";
      inventoryEl.appendChild(emptyItem);
      return;
    }

    state.inventory.forEach((ability) => {
      const li = document.createElement("li");
      li.className = "inventory-item";
      li.innerHTML = `<strong>${ability.name}</strong><div class="ability-badge">${rarityEmoji(ability.rarity)} ${ability.rarity} / ${ability.type} +${ability.value}</div><div class="ability-badge">${behaviorLabel(ability.behavior)}</div>`;
      for (let i = 0; i < EQUIP_SLOT_COUNT; i += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = `슬롯 ${i + 1} 장착`;
        btn.addEventListener("click", () => equipAbility(ability.id, i));
        li.appendChild(btn);
      }
      inventoryEl.appendChild(li);
    });
  }

  function renderPanels() {
    renderSlots();
    renderInventory();
  }

  function getWorldFromScreen(screenX, screenY) {
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.5;
    return {
      x: screenX + camera.x - centerX,
      y: screenY + camera.y - centerY,
    };
  }

  function getEquippedBehavior(trigger) {
    for (let i = 0; i < state.equipSlots.length; i += 1) {
      const ability = state.equipSlots[i];
      if (!ability || !ability.behavior) continue;
      if (ability.behavior.trigger === trigger) return ability.behavior;
    }
    return null;
  }

  function fireBombTo(targetWorldX, targetWorldY) {
    const dx = targetWorldX - player.x;
    const dy = targetWorldY - player.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = 520;
    bombs.push({
      x: player.x,
      y: player.y,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      radius: 7,
      ttl: 0.9,
    });
  }

  if (craftBtn) {
    craftBtn.addEventListener("click", () => {
      const newAbility = makeAbility();
      state.inventory.unshift(newAbility);
      if (state.inventory.length > 40) {
        state.inventory.length = 40;
      }
      saveState();
      renderPanels();
      setLog(`AI: ${rarityEmoji(newAbility.rarity)} ${newAbility.name} 제작 완료!`);
      if (abilityNameInput && "value" in abilityNameInput) {
        abilityNameInput.value = "";
      }
      if (abilityPromptInput && "value" in abilityPromptInput) {
        abilityPromptInput.value = "";
      }
    });
  }

  canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const behavior = getEquippedBehavior("leftClick");
    if (!behavior) return;
    if (behavior.action === "fireBomb") {
      const rect = canvas.getBoundingClientRect();
      const screenX = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const screenY = ((event.clientY - rect.top) / rect.height) * canvas.height;
      const worldPos = getWorldFromScreen(screenX, screenY);
      fireBombTo(worldPos.x, worldPos.y);
      setLog("AI: 좌클릭 행동 인식 - 폭탄 발사!");
    }
  });

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const command = button.getAttribute("data-command");
      if (command === "enemy") {
        enemies.push({
          x: player.x,
          y: player.y,
          radius: 12,
          color: "#ef4444",
        });
        setLog("AI: 플레이어 위치에 적을 스폰했습니다.");
        return;
      }
      const messages = {
        wall: "AI: 방어용 벽 생성 규칙을 적용했습니다.",
        boost: "AI: 플레이어 기본 버프를 적용했습니다.",
        goal: "AI: 목표 지점을 다시 계산했습니다.",
        chaos: "AI: 혼돈 패치로 변수값을 뒤섞었습니다.",
      };
      setLog(messages[command] || "AI: 명령을 처리했습니다.");
    });
  });

  loadState();
  applyEquipEffects();
  renderPanels();

  const keys = Object.create(null);
  window.addEventListener("keydown", (event) => {
    keys[event.code] = true;
  });
  window.addEventListener("keyup", (event) => {
    keys[event.code] = false;
  });

  let previous = performance.now();

  function update(deltaSec) {
    const left = keys.KeyA || keys.ArrowLeft;
    const right = keys.KeyD || keys.ArrowRight;
    const up = keys.KeyW || keys.ArrowUp;
    const down = keys.KeyS || keys.ArrowDown;

    const dx = Number(right) - Number(left);
    const dy = Number(down) - Number(up);

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      player.x += (dx / length) * player.speed * deltaSec;
      player.y += (dy / length) * player.speed * deltaSec;
    }

    for (let i = bombs.length - 1; i >= 0; i -= 1) {
      const bomb = bombs[i];
      bomb.x += bomb.vx * deltaSec;
      bomb.y += bomb.vy * deltaSec;
      bomb.ttl -= deltaSec;
      if (bomb.ttl <= 0) {
        explosions.push({ x: bomb.x, y: bomb.y, radius: 16, life: 0.35, maxLife: 0.35 });
        for (let j = enemies.length - 1; j >= 0; j -= 1) {
          const ex = enemies[j].x - bomb.x;
          const ey = enemies[j].y - bomb.y;
          if (Math.hypot(ex, ey) < 34) {
            enemies.splice(j, 1);
          }
        }
        bombs.splice(i, 1);
      }
    }

    for (let i = explosions.length - 1; i >= 0; i -= 1) {
      const boom = explosions[i];
      boom.life -= deltaSec;
      if (boom.life <= 0) explosions.splice(i, 1);
    }
    camera.x = player.x;
    camera.y = player.y;
  }

  function draw() {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.5;
    const offsetX = centerX - camera.x;
    const offsetY = centerY - camera.y;

    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1;
    const grid = 40;
    const startX = ((offsetX % grid) + grid) % grid;
    const startY = ((offsetY % grid) + grid) % grid;
    for (let x = startX; x <= canvas.width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = startY; y <= canvas.height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }

    enemies.forEach((enemy) => {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x + offsetX, enemy.y + offsetY, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    bombs.forEach((bomb) => {
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(bomb.x + offsetX, bomb.y + offsetY, bomb.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    explosions.forEach((boom) => {
      const alpha = Math.max(0, boom.life / boom.maxLife);
      ctx.strokeStyle = `rgba(251, 146, 60, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(boom.x + offsetX, boom.y + offsetY, boom.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    const playerRadius = Number.isFinite(player.size) ? player.size * 0.5 : 14;
    const playerX = centerX;
    const playerY = centerY;

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function loop(now) {
    const deltaSec = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    update(deltaSec);
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
