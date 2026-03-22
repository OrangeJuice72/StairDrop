    const { cubeSkins, stairThemes, trailItems, effectItems, upgradeItems, perkPool, modes, cubeClasses } = window.STAIR_CONFIG;
    const { loadProgressState, persistProgressState } = window.STAIR_STORAGE;

    const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Constraint = Matter.Constraint,
      Events = Matter.Events,
      Vector = Matter.Vector,
      Body = Matter.Body,
      Bounds = Matter.Bounds;

    const progress = loadProgressState();
    let coins = progress.coins;
    let unlockedCubes = progress.unlockedCubes;
    let unlockedStairs = progress.unlockedStairs;
    let unlockedTrails = progress.unlockedTrails;
    let unlockedEffects = progress.unlockedEffects;
    let equippedCube = progress.equippedCube;
    let equippedStair = progress.equippedStair;
    let equippedTrail = progress.equippedTrail;
    let equippedEffect = progress.equippedEffect;
    let selectedMode = progress.selectedMode;
    let selectedClass = progress.selectedClass;
    let purchasedUpgrades = progress.purchasedUpgrades;
    let shopTab = "packs";

    const validCubeIds = new Set(cubeSkins.map(item => item.id));
    const validThemeIds = new Set(stairThemes.map(item => item.id));
    unlockedCubes = unlockedCubes.filter(id => validCubeIds.has(id));
    unlockedStairs = unlockedStairs.filter(id => validThemeIds.has(id));
    if (!unlockedCubes.length) unlockedCubes = ["alchemist"];
    if (!unlockedStairs.length) unlockedStairs = [stairThemes[0].id];
    if (!validCubeIds.has(equippedCube)) equippedCube = "alchemist";
    if (!validThemeIds.has(equippedStair)) equippedStair = stairThemes[0].id;
    if (!unlockedCubes.includes(equippedCube)) unlockedCubes.unshift(equippedCube);
    if (!unlockedStairs.includes(equippedStair)) unlockedStairs.unshift(equippedStair);

    let stats = progress.stats;
    stats.totalWins = stats.totalWins || 0;

    let claimedChallenges = progress.claimedChallenges;

    const challenges = [
      { id: "steps25", name: "Reach 25 steps in a run", reward: 40, check: () => runStats.steps >= 25 },
      { id: "steps50", name: "Reach 50 steps in a run", reward: 65, check: () => runStats.steps >= 50 },
      { id: "steps100", name: "Reach 100 steps in a run", reward: 110, check: () => runStats.steps >= 100 },
      { id: "combo5", name: "Hit a x5 combo", reward: 55, check: () => runStats.bestCombo >= 5 },
      { id: "combo10", name: "Hit a x10 combo", reward: 90, check: () => runStats.bestCombo >= 10 },
      { id: "perfect3", name: "Land 3 perfect launches total", reward: 45, check: () => stats.perfectLaunches >= 3 },
      { id: "special20", name: "Touch 20 special stairs total", reward: 60, check: () => stats.specialHits >= 20 },
      { id: "air20", name: "Earn 20 air bonus in one run", reward: 60, check: () => runStats.airBonus >= 20 },
      { id: "coin10", name: "Hit 10 coin stairs in one run", reward: 70, check: () => runStats.coinStairs >= 10 },
      { id: "finish_run", name: "Reach the finish line once", reward: 100, check: () => stats.totalWins >= 1 },
      { id: "top_step", name: "Land on the top step", reward: 95, check: () => runStats.landedTopStep },
      { id: "golden67", name: "Land on step 67", reward: 120, check: () => runStats.hitGoldenStep67 },
      { id: "jump50", name: "Jump over 50 steps in one launch", reward: 140, check: () => runStats.maxStepSkip >= 50 },
      { id: "special_run", name: "Hit 8 special stairs in one run", reward: 80, check: () => runStats.specialHits >= 8 }
    ];

    function saveGame() {
      persistProgressState({
        coins,
        unlockedCubes,
        unlockedStairs,
        unlockedTrails,
        unlockedEffects,
        equippedCube,
        equippedStair,
        equippedTrail,
        equippedEffect,
        selectedMode,
        selectedClass,
        purchasedUpgrades,
        stats,
        claimedChallenges
      });
      updateCoinDisplays();
      updateRecordDisplays();
    }

    let saveTimer = null;
    function queueSave(delay = 250) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveGame, delay);
    }

    function updateCoinDisplays() {
      document.getElementById("menu-coins").innerText = coins;
      document.getElementById("shop-coins").innerText = coins;
      document.getElementById("hud-coins").innerText = coins;
    }

    function updateRecordDisplays() {
      document.getElementById("menu-high-score").innerText = stats.highScore;
      document.getElementById("menu-best-steps").innerText = stats.bestSteps;
      const hudHigh = document.getElementById("hud-high-score");
      const hudBest = document.getElementById("hud-best-steps");
      if (hudHigh) hudHigh.innerText = stats.highScore;
      if (hudBest) hudBest.innerText = stats.bestSteps;
      document.getElementById("game-over-high-score").innerText = stats.highScore;
      document.getElementById("game-over-best-steps").innerText = stats.bestSteps;
    }

    const cubeSpriteCache = {};
    const trailTextureCache = {};
    const themeTextureCache = {};
    const EMPTY_SPRITE = {
      texture: "",
      xScale: 1,
      yScale: 1,
      xOffset: 0,
      yOffset: 0
    };
    const cubeTextureReady = {};

    function getCubeSkin(id = equippedCube) {
      return cubeSkins.find(item => item.id === id) || cubeSkins[0];
    }

    function getStairTheme(id = equippedStair) {
      return stairThemes.find(item => item.id === id) || stairThemes[0];
    }

    function isRainbowCubeSkin(skin) {
      return skin && skin.id === "rainbow";
    }

    function isSpriteCubeSkin(skin) {
      return skin && !!skin.texture;
    }

    function getCubeAccentColor(id = equippedCube) {
      const skin = getCubeSkin(id);
      if (!skin) return "#8b6cff";
      if (isRainbowCubeSkin(skin)) return `hsl(${(gameTick * 3) % 360}, 100%, 65%)`;
      if (isSpriteCubeSkin(skin)) return skin.accent || "#dfe9ff";
      return skin.id;
    }

    function getCubePreviewMarkup(item) {
      if (isSpriteCubeSkin(item)) {
        return `<div class="card-preview" style="background-image:url('${item.texture}'); background-color:rgba(255,255,255,0.06);"></div>`;
      }

      const previewStyles = isRainbowCubeSkin(item)
        ? "background: linear-gradient(135deg, #ff5a7a, #ffd166, #79e38d, #2ee6c9, #7c5cff);"
        : `background:${item.id};`;

      return `<div class="card-preview" style="${previewStyles}"></div>`;
    }

    function getPackPreviewMarkup(item) {
      const overlay = item.stairTexture
        ? `, linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.02))`
        : "";
      if (item.preview) {
        return `<div class="card-preview" style="background-image:${overlay ? overlay + ',' : ''}url('${item.preview}'); background-size:cover; background-position:center;"></div>`;
      }

      return `<div class="card-preview" style="background:linear-gradient(135deg, ${item.c1}, ${item.c2});"></div>`;
    }

    function applyHudTheme() {
      const hud = document.getElementById("hud");
      if (!hud) return;
      const theme = getStairTheme();
      if (theme?.hudFrame) {
        hud.classList.add("hud-art");
        hud.style.backgroundImage = `url('${theme.hudFrame}')`;
        hud.style.backgroundSize = "contain";
        hud.style.backgroundRepeat = "no-repeat";
        hud.style.backgroundPosition = "center top";
      } else {
        hud.classList.remove("hud-art");
        hud.style.backgroundImage = "";
        hud.style.backgroundSize = "";
        hud.style.backgroundRepeat = "";
        hud.style.backgroundPosition = "";
      }
    }

    function getThemeTextureImage(texture) {
      if (!texture) return null;
      if (!themeTextureCache[texture]) {
        const img = new Image();
        img.src = texture;
        themeTextureCache[texture] = img;
      }
      return themeTextureCache[texture];
    }

    function getThemeStairTexture(theme, stair) {
      if (!theme) return null;
      const variants = Array.isArray(theme.stairTextures) ? theme.stairTextures : null;
      if (variants && variants.length && stair?.plugin?.index != null) {
        return variants[stair.plugin.index % variants.length];
      }
      return theme.stairTexture || (variants && variants[0]) || null;
    }

    function getStairSpriteRenderConfig(theme, stair) {
      const texture = getThemeStairTexture(theme, stair);
      if (!texture || !stair) return null;
      const sprite = getThemeTextureImage(texture);
      if (!sprite) return null;
      const spriteWidth = sprite.naturalWidth || sprite.width || 1;
      const spriteHeight = sprite.naturalHeight || sprite.height || 1;
      const stairWidth = stair.bounds.max.x - stair.bounds.min.x;
      const stairHeight = stair.bounds.max.y - stair.bounds.min.y;
      return {
        texture,
        xScale: stairWidth / spriteWidth,
        yScale: stairHeight / spriteHeight,
        xOffset: 0.5,
        yOffset: 0.5
      };
    }

    function applyThemeToStair(stair, theme, stairColor, stroke, effectLabel) {
      if (!stair) return;
      stair.render.strokeStyle = stroke;
      stair.render.lineWidth = effectLabel === "normal" ? 1.2 : 2.4;
      if (getThemeStairTexture(theme, stair)) {
        stair.render.fillStyle = effectLabel === "normal" ? "rgba(0,0,0,0)" : stairColor;
        stair.render.sprite = getStairSpriteRenderConfig(theme, stair) || { ...EMPTY_SPRITE };
        stair.render.opacity = effectLabel === "normal" ? 1 : 0.92;
      } else {
        stair.render.fillStyle = stairColor;
        stair.render.sprite = { ...EMPTY_SPRITE };
        stair.render.opacity = 1;
      }
    }

    function getCubeSpriteImage(texture) {
      if (!texture) return null;
      if (!cubeSpriteCache[texture]) {
        const img = new Image();
        cubeTextureReady[texture] = false;
        img.addEventListener("load", () => {
          cubeTextureReady[texture] = true;
          if (!cube) return;
          const activeSkin = getCubeSkin();
          if (!activeSkin || activeSkin.texture !== texture) return;
          const spriteConfig = getCubeSpriteRenderConfig(activeSkin);
          if (!spriteConfig) return;
          cube.render.sprite = spriteConfig;
        });
        img.addEventListener("error", () => {
          cubeTextureReady[texture] = false;
        });
        img.src = texture;
        cubeSpriteCache[texture] = img;
      }
      return cubeSpriteCache[texture];
    }

    function isCubeTextureReady(texture) {
      if (!texture) return false;
      if (!(texture in cubeTextureReady)) getCubeSpriteImage(texture);
      return !!cubeTextureReady[texture];
    }

    function getCubeSpriteRenderConfig(skin) {
      if (!isSpriteCubeSkin(skin)) return null;
      const sprite = getCubeSpriteImage(skin.texture);
      if (!sprite) return null;
      if (!sprite.complete || !(sprite.naturalWidth || sprite.width)) return null;
      const spriteScale = skin.spriteScale || 1;
      const targetSize = 30 * spriteScale;
      return {
        texture: skin.texture,
        xScale: targetSize / (sprite.naturalWidth || sprite.width || 150),
        yScale: targetSize / (sprite.naturalHeight || sprite.height || 150),
        xOffset: 0.5,
        yOffset: 0.5
      };
    }

    function applyCubeSkinToBody(body, skin = getCubeSkin()) {
      if (!body || !skin) return;

      if (isSpriteCubeSkin(skin)) {
        body.render.fillStyle = "rgba(0,0,0,0)";
        body.render.strokeStyle = "rgba(0,0,0,0)";
        body.render.lineWidth = 0;
        body.render.sprite = getCubeSpriteRenderConfig(skin) || { ...EMPTY_SPRITE };
      } else if (isRainbowCubeSkin(skin)) {
        body.render.fillStyle = `hsl(${(gameTick * 3) % 360}, 100%, 65%)`;
        body.render.strokeStyle = "rgba(255,255,255,0.9)";
        body.render.lineWidth = 2.2;
        body.render.sprite = { ...EMPTY_SPRITE };
      } else {
        body.render.fillStyle = skin.id;
        body.render.strokeStyle = "rgba(255,255,255,0.9)";
        body.render.lineWidth = 2.2;
        body.render.sprite = { ...EMPTY_SPRITE };
      }
    }

    function createCubeBody(position, classCfg = getClassConfig()) {
      const activeCubeSkin = getCubeSkin();
      let initialColor = isRainbowCubeSkin(activeCubeSkin) ? `hsl(0, 100%, 65%)` : activeCubeSkin.id;
      if (isSpriteCubeSkin(activeCubeSkin)) {
        getCubeSpriteImage(activeCubeSkin.texture);
        initialColor = "rgba(0,0,0,0)";
      }

      const body = Bodies.rectangle(position.x, position.y, 30, 30, {
        label: "cube",
        restitution: classCfg.restitution,
        friction: 0.01,
        frictionAir: classCfg.frictionAir,
        density: classCfg.density,
        chamfer: isSpriteCubeSkin(activeCubeSkin) ? undefined : { radius: 7 },
        render: {
          fillStyle: initialColor,
          strokeStyle: isSpriteCubeSkin(activeCubeSkin) ? "rgba(0,0,0,0)" : "rgba(255,255,255,0.9)",
          lineWidth: isSpriteCubeSkin(activeCubeSkin) ? 0 : 2.2,
          sprite: isSpriteCubeSkin(activeCubeSkin) ? (getCubeSpriteRenderConfig(activeCubeSkin) || { ...EMPTY_SPRITE }) : { ...EMPTY_SPRITE }
        }
      });

      applyCubeSkinToBody(body, activeCubeSkin);
      return body;
    }

    function drawCubeOverlay(ctx, skin = getCubeSkin()) {
      if (!cube || !skin) return;
      const isSprite = isSpriteCubeSkin(skin);
      const size = 30 * (isSprite ? (skin.spriteScale || 1) : 1);
      const radius = isSprite ? 4 : 7;
      const fill = isRainbowCubeSkin(skin) ? `hsl(${(gameTick * 3) % 360}, 100%, 65%)` : (isSprite ? (skin.accent || "#cfd8ff") : skin.id);
      const stroke = isSprite ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.9)";
      const sprite = isSprite ? getCubeSpriteImage(skin.texture) : null;
      const textureReady = isSprite ? isCubeTextureReady(skin.texture) : false;

      ctx.save();
      ctx.translate(cube.position.x, cube.position.y);
      ctx.rotate(cube.angle);
      if (!isSprite || !textureReady) {
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size, radius);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = isSprite ? 1.6 : 2.2;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
      ctx.restore();
    }

    function focusCameraOnCube() {
      if (!cube) return;
      const cameraOffset = getCameraOffset();
      Render.lookAt(render, {
        min: { x: cube.position.x - width / 2 + cameraOffset.x, y: cube.position.y - height / 2 + cameraOffset.y },
        max: { x: cube.position.x + width / 2 + cameraOffset.x, y: cube.position.y + height / 2 + cameraOffset.y }
      });
    }

    function getCameraOffset() {
      if (deviceProfile.tier === "mobile") {
        return { x: 0, y: 50 };
      }
      if (deviceProfile.tier === "tablet") {
        return { x: 40, y: 90 };
      }
      return { x: 100, y: 150 };
    }

    function getStageStartConfig(isPlayable) {
      if (deviceProfile.tier === "mobile") {
        return {
          x: Math.max(24, width * 0.08),
          y: isPlayable ? Math.max(120, height * 0.16) : 80,
          startIndex: 3
        };
      }

      return {
        x: 0,
        y: isPlayable ? INITIAL_STAGE_OFFSET_Y : 80,
        startIndex: 10
      };
    }

    const engine = Engine.create();
    engine.positionIterations = 8;
    engine.velocityIterations = 8;

    const world = engine.world;
    function getViewportSize() {
      const viewport = window.visualViewport;
      return {
        width: Math.round(viewport?.width || window.innerWidth),
        height: Math.round(viewport?.height || window.innerHeight)
      };
    }

    let { width, height } = getViewportSize();
    let deviceProfile = detectDeviceProfile();

    const render = Render.create({
      element: document.body,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
        hasBounds: true,
        pixelRatio: deviceProfile.maxPixelRatio
      }
    });

    let runner = Runner.create();

    let cube, elastic, finishLine;
    let stairsArr = [];
    let movingStairs = [];
    let particles = [];
    let popups = [];
    let heroMoments = [];
    let touchedStairs = new Set();
    let specialTouchedStairs = new Set();
    let brokenStairs = new Set();
    let perkSelectionsTaken = new Set();
    let activePerks = [];
    let pendingPerkStep = null;
    let perkCharges = { bump: 0, slam: 0, relaunch: 0 };
    let startPos = { x: 0, y: 0 };
    let launchOrigin = { x: 0, y: 0 };
    let recentStairContact = { id: null, time: 0 };
    let slamLockUntil = 0;
    let relaunchPrimed = false;
    let launchContext = "normal";

    let isLaunched = false;
    let gameOver = false;
    let hasWon = false;
    let isPaused = false;
    let perkPaused = false;

    let currentScore = 0;
    let currentSteps = 0;
    let currentRunCoins = 0;
    let stationaryFrames = 0;
    let trail = [];
    let bestComboThisRun = 1;

    let cameraShake = 0;
    let gameTick = 0;
    let trailSampleTick = 0;

    const MAX_PULL = 220;
    const MAX_CUBE_SPEED = 58;
    const INITIAL_STAGE_OFFSET_Y = 170;
    const LAUNCH_DEADZONE = 0.03;
    const LAUNCH_POWER_CURVE = 1.4;
    const LAUNCH_VELOCITY_CURVE = 1.65;
    const LAUNCH_VELOCITY_BOOST = 1.95;
    const RELAUNCH_POWER_SCALE = 0.72;
    const OPENING_LAUNCH_SCALE = 1.12;
    const PERFECT_CHARGE_MIN = 0.68;
    const PERFECT_CHARGE_MAX = 0.84;

    let isDragging = false;
    let dragPointerId = null;
    let aimPoint = null;

    let combo = 1;
    let comboStreak = 0;
    let lastHitTime = 0;
    let launchCharge = 0;
    let launchWasPerfect = false;
    let airStartY = 0;
    let airStartTime = 0;
    let lastLaunchVector = { x: 0, y: -1 };

    let runStats = {
      steps: 0,
      bestCombo: 1,
      specialHits: 0,
      perfectLaunch: false,
      airBonus: 0,
      coinStairs: 0,
      scoreFromHits: 0,
      stepMilestoneCoins: 0,
      perkChoices: 0,
      lastStepIndex: null,
      maxStepSkip: 0,
      landedTopStep: false,
      hitGoldenStep67: false,
      topStepIndex: 0
    };

    function setCanvasInput(enabled) {
      render.canvas.style.pointerEvents = enabled ? "auto" : "none";
    }

    function updateLegendVisibility() {
      const legend = document.getElementById("legend");
      const hudVisible = document.getElementById("hud").style.display === "block";
      legend.style.display = hudVisible && deviceProfile.tier === "desktop" ? "block" : "none";
    }

    function normalizeUiCopy() {
      const topButtons = document.querySelectorAll("#top-controls .mini-btn");
      if (topButtons[0]) topButtons[0].textContent = "Pause";
      if (topButtons[1]) topButtons[1].textContent = "Goals";

      const challengeTitle = document.querySelector("#challenge-panel .shop-title");
      if (challengeTitle) challengeTitle.textContent = "Achievements";

      const challengeButton = document.querySelector("#main-menu .menu-actions .secondary-btn");
      if (challengeButton) challengeButton.textContent = "Achievements";

      const subtitle = document.querySelector("#main-menu .subtitle");
      if (subtitle) subtitle.textContent = "Cleaner scoring, tighter economy, and a sharper upgrade loop.";

      const coinLabels = document.querySelectorAll(".coin-card");
      coinLabels.forEach(card => {
        const span = card.querySelector("span");
        if (!span) return;
        card.childNodes[0].textContent = "Credits ";
      });
    }

    function setStatus(text, state = "idle") {
      const pill = document.getElementById("status-pill");
      pill.innerText = text;

      if (state === "live") {
        pill.style.background = "rgba(46, 230, 201, 0.10)";
        pill.style.borderColor = "rgba(46, 230, 201, 0.18)";
        pill.style.color = "#a8fff0";
      } else if (state === "danger") {
        pill.style.background = "rgba(255, 90, 122, 0.10)";
        pill.style.borderColor = "rgba(255, 90, 122, 0.18)";
        pill.style.color = "#ffc0cd";
      } else {
        pill.style.background = "rgba(124, 92, 255, 0.10)";
        pill.style.borderColor = "rgba(124, 92, 255, 0.18)";
        pill.style.color = "#ddd3ff";
      }
    }

    function updateHud() {
      document.getElementById("steps-display").innerText = currentSteps;
      document.getElementById("score-display").innerText = Math.floor(currentScore);
      updateCoinDisplays();
      updateRecordDisplays();
    }

    function setMenuBackdropVisible(visible) {
      const backdrop = document.getElementById("menu-backdrop");
      if (!backdrop) return;
      backdrop.style.display = visible ? "block" : "none";
    }

    function refreshInRunControls() {
      const hudVisible = document.getElementById("hud").style.display === "block";
      const modalOpen =
        document.getElementById("shop-menu").style.display === "block" ||
        document.getElementById("challenge-panel").style.display === "block" ||
        document.getElementById("mode-panel").style.display === "block" ||
        document.getElementById("perk-panel").style.display === "block" ||
        document.getElementById("pause-panel").style.display === "block" ||
        document.getElementById("game-over").style.display === "block";

      document.getElementById("top-controls").style.display = hudVisible && !modalOpen ? "flex" : "none";
      const perkWrap = document.getElementById("perk-actions");
      if (!perkWrap) return;
      if (modalOpen || !hudVisible) {
        perkWrap.style.display = "none";
      } else {
        perkWrap.style.display = perkWrap.innerHTML.trim() ? "flex" : "none";
      }
    }

    function getTrailColor() {
      const t = getTrailItem();
      if (!t) return "#8b6cff";
      return t.color;
    }

    function detectDeviceProfile() {
      const viewport = getViewportSize();
      const shortestSide = Math.min(viewport.width, viewport.height);
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      const memory = navigator.deviceMemory || 4;
      const cores = navigator.hardwareConcurrency || 4;
      const tier = shortestSide <= 520 ? "mobile" : shortestSide <= 900 ? "tablet" : "desktop";
      const quality = memory <= 4 || cores <= 4 || shortestSide <= 520 ? "low" : memory <= 8 || cores <= 8 ? "medium" : "high";
      const maxPixelRatio = quality === "low" ? 1 : quality === "medium" ? 1.15 : 1.35;

      return {
        tier,
        quality,
        isTouch,
        maxPixelRatio
      };
    }

    function applyDeviceProfile() {
      document.body.dataset.device = deviceProfile.tier;
      document.body.dataset.quality = deviceProfile.quality;
      document.documentElement.style.setProperty("--viewport-width", `${width}px`);
      document.documentElement.style.setProperty("--viewport-height", `${height}px`);
    }

    function getRenderPixelRatio() {
      return Math.min(window.devicePixelRatio || 1, deviceProfile.maxPixelRatio);
    }

    function isWorldPointVisible(x, y, padding = 120) {
      return x >= render.bounds.min.x - padding &&
        x <= render.bounds.max.x + padding &&
        y >= render.bounds.min.y - padding &&
        y <= render.bounds.max.y + padding;
    }

    function getTrailItem(id = equippedTrail) {
      return trailItems.find(item => item.id === id) || trailItems[0];
    }

    function isTextureTrail(item) {
      return item && !!item.texture;
    }

    function getTrailPreviewMarkup(item) {
      if (isTextureTrail(item)) {
        const shapeClass = item.previewShape === "square" ? "" : " round";
        const animatedClass = item.animated ? " animated-trail-preview" : "";
        const frameData = getTrailFrameData(item, 0);
        const previewWidth = frameData ? Math.round(frameData.sw) : 512;
        const previewHeight = frameData ? Math.round(frameData.sh) : 512;
        const previewScale = item.previewScale || 1;
        return `<div class="card-preview${shapeClass}${animatedClass}" style="background-image:url('${item.texture}'); background-size:${previewWidth * (item.frameCols || 1)}px ${previewHeight * (item.frameRows || 1)}px; background-position:0 0; background-color:rgba(255,255,255,0.06); transform:scale(${previewScale});"></div>`;
      }

      const previewStyles = item.id === "rainbow"
        ? "background: linear-gradient(135deg, #ff5a7a, #ffd166, #79e38d, #2ee6c9, #7c5cff);"
        : `background:${item.color};`;

      return `<div class="card-preview round" style="${previewStyles}"></div>`;
    }

    function getTrailTextureImage(texture) {
      if (!texture) return null;
      if (!trailTextureCache[texture]) {
        const img = new Image();
        img.src = texture;
        trailTextureCache[texture] = img;
      }
      return trailTextureCache[texture];
    }

    function drawPackBackground(ctx) {
      const activeTheme = getStairTheme();
      const boundsMinX = render.bounds.min.x;
      const boundsMinY = render.bounds.min.y;
      const boundsWidth = render.bounds.max.x - render.bounds.min.x;
      const boundsHeight = render.bounds.max.y - render.bounds.min.y;

      ctx.save();
      (activeTheme.parallaxClouds || []).forEach(layer => {
        const image = getThemeTextureImage(layer.texture);
        if (!image || !image.complete || !(image.naturalWidth || image.width)) return;

        const imageWidth = (image.naturalWidth || image.width) * (layer.scale || 1);
        const imageHeight = (image.naturalHeight || image.height) * (layer.scale || 1);
        const gap = layer.gap || 160;
        const span = imageWidth + gap;
        const offset = ((boundsMinX * (layer.speed || 0.12)) % span + span) % span;
        const y = boundsMinY + boundsHeight * (layer.y || 0.2);

        ctx.save();
        ctx.globalAlpha = layer.alpha == null ? 0.7 : layer.alpha;
        for (let x = boundsMinX - offset - span; x < boundsMinX + boundsWidth + span; x += span) {
          ctx.drawImage(image, x, y, imageWidth, imageHeight);
        }
        ctx.restore();
      });

      if (activeTheme.backgroundImage) {
        const bg = getThemeTextureImage(activeTheme.backgroundImage);
        if (bg && bg.complete && (bg.naturalWidth || bg.width)) {
          const parallaxX = boundsMinX * 0.08;
          const parallaxY = boundsMinY * 0.04;
          ctx.drawImage(bg, boundsMinX - parallaxX, boundsMinY - parallaxY, boundsWidth + Math.abs(parallaxX) * 2, boundsHeight + Math.abs(parallaxY) * 2);
        }
      }

      const gradient = ctx.createLinearGradient(boundsMinX, boundsMinY, boundsMinX, boundsMinY + boundsHeight);
      gradient.addColorStop(0, activeTheme.c1 || "#182235");
      gradient.addColorStop(1, activeTheme.c2 || "#24344f");
      ctx.fillStyle = gradient;
      ctx.fillRect(boundsMinX, boundsMinY, boundsWidth, boundsHeight);

      ctx.restore();
    }

    function getTrailFrameData(item, frameIndex = 0) {
      if (!isTextureTrail(item)) return null;
      const image = getTrailTextureImage(item.texture);
      if (!image) return null;

      const cols = item.frameCols || 1;
      const rows = item.frameRows || 1;
      const count = item.frameCount || cols * rows;
      const safeIndex = ((frameIndex % count) + count) % count;
      const frameWidth = (image.naturalWidth || image.width || 1) / cols;
      const frameHeight = (image.naturalHeight || image.height || 1) / rows;
      const col = safeIndex % cols;
      const row = Math.floor(safeIndex / cols);

      return {
        image,
        sx: col * frameWidth,
        sy: row * frameHeight,
        sw: frameWidth,
        sh: frameHeight
      };
    }

    function getAnimatedTrailFrameIndex(item, seed = 0) {
      const frameCount = item.frameCount || 1;
      const frameRate = item.frameRate || 0.2;
      return Math.floor((gameTick * frameRate) + seed) % frameCount;
    }

    function drawTrail(ctx) {
      const activeTrail = getTrailItem();
      let baseTrailColor = getTrailColor();
      if (baseTrailColor === "rainbow") {
        baseTrailColor = `hsl(${(gameTick * 3) % 360}, 100%, 65%)`;
      }

      if (trail.length > 2 && isTextureTrail(activeTrail)) {
        const trailTexture = getTrailTextureImage(activeTrail.texture);
        if (trailTexture && trailTexture.complete) {
          for (let i = 0; i < trail.length - 1; i += 3) {
            const p1 = trail[i];
            const p2 = trail[i + 1];
            if (!isWorldPointVisible(p1.x, p1.y, 60) && !isWorldPointVisible(p2.x, p2.y, 60)) continue;
            const progress = 1 - (i / trail.length);
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const pulse = 0.88 + Math.sin(gameTick * 0.18 + i * 0.55) * 0.12;
            const baseStampSize = activeTrail.stampSize || 22;
            const stampGrowth = activeTrail.stampGrowth || 10;
            const width = (baseStampSize + progress * stampGrowth) * pulse;
            const frameData = getTrailFrameData(activeTrail, getAnimatedTrailFrameIndex(activeTrail, i * 0.35));
            if (!frameData) continue;
            const height = width * (frameData.sh / frameData.sw);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.globalAlpha = 0.16 + progress * 0.48;
            ctx.drawImage(
              frameData.image,
              frameData.sx,
              frameData.sy,
              frameData.sw,
              frameData.sh,
              -width * 0.62,
              -height / 2,
              width,
              height
            );
            ctx.restore();
          }
        }
      } else if (trail.length > 2) {
        for (let i = 0; i < trail.length - 1; i++) {
          const p1 = trail[i];
          const p2 = trail[i + 1];
          if (!isWorldPointVisible(p1.x, p1.y, 60) && !isWorldPointVisible(p2.x, p2.y, 60)) continue;
          const progress = 1 - (i / trail.length);
          let maxLineWidth = (equippedTrail === "gold" || equippedTrail === "rainbow") ? 22 : 18;
          let currentWidth = maxLineWidth * Math.pow(progress, 0.65);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = baseTrailColor;
          ctx.globalAlpha = 0.12 * progress;
          ctx.lineWidth = currentWidth;
          ctx.shadowColor = baseTrailColor;
          ctx.shadowBlur = currentWidth * 0.45;
          ctx.stroke();

          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = 0.22 * progress;
          ctx.lineWidth = currentWidth * 0.22;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }
    }

    function getEffectColor() {
      const e = effectItems.find(x => x.id === equippedEffect);
      return e ? e.color : "#ffffff";
    }

    function showPopup(text, x, y, color = "#ffffff") {
      popups.push({ text, x, y, color, life: 60, vy: -1.15 });
    }

    function showHeroMoment(text, color = "#ffffff", accent = "rgba(255,255,255,0.16)") {
      heroMoments.push({ text, color, accent, life: 50 });
      if (heroMoments.length > 2) heroMoments.shift();
    }

    function spawnBurst(x, y, color, count = 12, speed = 4) {
      const effectBoost = equippedEffect === "nova" ? 1.4 : equippedEffect === "spark" ? 1.15 : 1;
      const qualityScale = deviceProfile.quality === "low" ? 0.55 : deviceProfile.quality === "medium" ? 0.8 : 1;
      const actualCount = Math.max(4, Math.floor(count * effectBoost * qualityScale));
      for (let i = 0; i < actualCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.4 + Math.random());
        particles.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 26 + Math.random() * 18,
          size: 2 + Math.random() * 4,
          color
        });
      }
    }

    function shake(amount) {
      cameraShake = Math.min(cameraShake + amount, 22);
    }

    function getPerkValue(id) {
      return activePerks.includes(id);
    }

    function getPerfectChargeWindow() {
      return { min: PERFECT_CHARGE_MIN, max: PERFECT_CHARGE_MAX };
    }

    function updatePerkActionButtons() {
      const wrap = document.getElementById("perk-actions");
      if (!wrap) return;

      const actions = [];
      if (perkCharges.bump > 0) {
        actions.push(`<button class="mini-btn perk-action" onclick="usePerkAction('bump')">Bump ${perkCharges.bump}</button>`);
      }
      if (perkCharges.slam > 0) {
        actions.push(`<button class="mini-btn perk-action" onclick="usePerkAction('slam')">Slam ${perkCharges.slam}</button>`);
      }
      if (perkCharges.relaunch > 0) {
        actions.push(`<button class="mini-btn perk-action" onclick="usePerkAction('relaunch')">Re-Launch ${perkCharges.relaunch}</button>`);
      }

      wrap.innerHTML = actions.join("");
      refreshInRunControls();
    }

    function consumePerkCharge(id) {
      if (!perkCharges[id]) return false;
      perkCharges[id]--;
      updatePerkActionButtons();
      return true;
    }

    function usePerkAction(id) {
      if (!cube || !isLaunched || gameOver || hasWon || isPaused || perkPaused) return false;

      if (id === "bump" && perkCharges.bump > 0) {
        const classCfg = getClassConfig();
        const baseStrength = MAX_PULL * 0.3 * classCfg.launchPower;
        const currentDirection = cube.speed > 0.3
          ? Vector.normalise(cube.velocity)
          : lastLaunchVector;
        Body.setVelocity(cube, {
          x: cube.velocity.x + currentDirection.x * baseStrength,
          y: cube.velocity.y + currentDirection.y * baseStrength
        });
        consumePerkCharge("bump");
        showPopup("BUMP", cube.position.x, cube.position.y - 34, "#8fffe0");
        setStatus("Bump Fired", "live");
        shake(5);
        return true;
      }

      if (id === "slam" && perkCharges.slam > 0) {
        Body.setVelocity(cube, {
          x: cube.velocity.x * 0.18,
          y: Math.max(28, Math.abs(cube.velocity.y) + 18)
        });
        slamLockUntil = performance.now() + 450;
        consumePerkCharge("slam");
        showPopup("SLAM", cube.position.x, cube.position.y - 34, "#ffd166");
        setStatus("Slam Attack", "danger");
        shake(7);
        return true;
      }

      if (id === "relaunch" && perkCharges.relaunch > 0) {
        const relaunchPoint = { x: cube.position.x, y: cube.position.y };
        if (Composite.get(world, cube.id, "body")) Composite.remove(world, cube);
        cube = createCubeBody(relaunchPoint);
        Composite.add(world, cube);
        startPos = { ...relaunchPoint };
        launchOrigin = { ...relaunchPoint };
        aimPoint = null;
        isLaunched = false;
        isDragging = false;
        dragPointerId = null;
        launchCharge = 0;
        relaunchPrimed = true;
        launchContext = "relaunch";
        trail = [];
        focusCameraOnCube();
        setCanvasInput(true);
        consumePerkCharge("relaunch");
        showPopup("RE-LAUNCH", cube.position.x, cube.position.y - 34, "#c7b6ff");
        setStatus("Drag To Re-Launch", "idle");
        return true;
      }

      return false;
    }

    function openModePanel() {
      document.getElementById("main-menu").style.display = "none";
      setMenuBackdropVisible(false);
      document.getElementById("mode-panel").style.display = "block";
      setCanvasInput(false);
      renderModePanel();
    }

    function closeModePanel() {
      document.getElementById("mode-panel").style.display = "none";
      document.getElementById("main-menu").style.display = "block";
      setMenuBackdropVisible(true);
      setCanvasInput(false);
    }

    function renderModePanel() {
      const modeList = document.getElementById("mode-list");
      const classList = document.getElementById("class-list");

      modeList.innerHTML = `<div class="info-card"><h4>Game Modes</h4><p>Pick a run style.</p></div>`;
      Object.entries(modes).forEach(([id, mode]) => {
        modeList.innerHTML += `
          <div class="info-card">
            <h4>${mode.name}</h4>
            <p>${mode.desc}</p>
            <div style="margin-top:10px;">
              <button class="shop-btn ${selectedMode === id ? "equipped-btn" : ""}" ${selectedMode === id ? "disabled" : `onclick="setMode('${id}')"`}>
                ${selectedMode === id ? "Selected" : "Choose"}
              </button>
            </div>
          </div>
        `;
      });

      classList.innerHTML = `<div class="info-card"><h4>Cube Classes</h4><p>Same cube, different personality.</p></div>`;
      Object.entries(cubeClasses).forEach(([id, c]) => {
        classList.innerHTML += `
          <div class="info-card">
            <h4>${c.name}</h4>
            <p>Launch ${c.launchPower.toFixed(2)} • Bounce ${c.restitution.toFixed(2)} • Control ${c.control.toFixed(2)}</p>
            <div style="margin-top:10px;">
              <button class="shop-btn ${selectedClass === id ? "equipped-btn" : ""}" ${selectedClass === id ? "disabled" : `onclick="setCubeClass('${id}')"`}>
                ${selectedClass === id ? "Selected" : "Choose"}
              </button>
            </div>
          </div>
        `;
      });
    }

    function setMode(id) {
      selectedMode = id;
      saveGame();
      renderModePanel();
    }

    function setCubeClass(id) {
      selectedClass = id;
      saveGame();
      renderModePanel();
    }

    function openChallenges() {
      document.getElementById("challenge-panel").style.display = "block";
      document.getElementById("main-menu").style.display = "none";
      setMenuBackdropVisible(false);
      setCanvasInput(false);
      refreshInRunControls();
      renderChallenges();
    }

    function closeChallenges() {
      document.getElementById("challenge-panel").style.display = "none";
      if (document.getElementById("hud").style.display !== "block") {
        document.getElementById("main-menu").style.display = "block";
        setMenuBackdropVisible(true);
      }
      setCanvasInput(document.getElementById("hud").style.display === "block" && !perkPaused);
      refreshInRunControls();
    }

    function renderChallenges() {
      const wrap = document.getElementById("challenge-list");
      wrap.innerHTML = "";

      challenges.forEach(ch => {
        const done = ch.check();
        const claimed = claimedChallenges.includes(ch.id);
        let btn = "";
        if (claimed) {
          btn = `<button class="shop-btn equipped-btn" disabled>Claimed</button>`;
        } else if (done) {
          btn = `<button class="shop-btn equip-btn" onclick="claimChallenge('${ch.id}', ${ch.reward})">Claim ${ch.reward}</button>`;
        } else {
          btn = `<button class="shop-btn" disabled>In Progress</button>`;
        }

        wrap.innerHTML += `
          <div class="info-card">
            <h4>${ch.name}</h4>
            <p>Reward: ${ch.reward} credits</p>
            <div style="margin-top:10px;">${btn}</div>
          </div>
        `;
      });

      wrap.innerHTML += `
        <div class="info-card">
          <h4>Lifetime Stats</h4>
          <p>Games: ${stats.gamesPlayed} • Wins: ${stats.totalWins} • Steps: ${stats.lifetimeSteps} • Best Combo: x${stats.highestCombo} • Perfect Launches: ${stats.perfectLaunches} • Special Hits: ${stats.specialHits} • High Score: ${stats.highScore} • Best Steps: ${stats.bestSteps}</p>
        </div>
      `;
    }

    function claimChallenge(id, reward) {
      if (claimedChallenges.includes(id)) return;
      const ch = challenges.find(c => c.id === id);
      if (!ch || !ch.check()) return;
      claimedChallenges.push(id);
      coins += reward;
      saveGame();
      renderChallenges();
    }

    function openShop() {
      document.getElementById("main-menu").style.display = "none";
      setMenuBackdropVisible(false);
      document.getElementById("shop-menu").style.display = "block";
      setCanvasInput(false);
      refreshInRunControls();
      renderShop();
    }

    function closeShop() {
      document.getElementById("shop-menu").style.display = "none";
      document.getElementById("main-menu").style.display = "block";
      setMenuBackdropVisible(true);
      setCanvasInput(false);
      refreshInRunControls();
    }

    function switchShopTab(tab) {
      const allowedTabs = ["packs", "skins", "trails"];
      shopTab = allowedTabs.includes(tab) ? tab : "packs";
      document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
      const activeBtn = document.getElementById(`tab-${shopTab}`);
      if (activeBtn) activeBtn.classList.add("active");
      renderShopContent();
    }

    function renderShop() {
      switchShopTab(shopTab);
    }

    function renderShopContent() {
      const title = document.getElementById("shop-section-title");
      const content = document.getElementById("shop-content");
      content.innerHTML = "";

      if (shopTab === "packs") {
        title.innerText = "World Packs";
        stairThemes.forEach(item => {
          content.innerHTML += createShopCard({
            name: item.name,
            desc: item.desc,
            cost: item.cost,
            owned: unlockedStairs.includes(item.id),
            equipped: equippedStair === item.id,
            preview: getPackPreviewMarkup(item),
            buyAction: `buyStair('${item.id}', ${item.cost})`,
            equipAction: `equipStair('${item.id}')`,
            ownedLabel: "Active"
          });
        });
      }

      if (shopTab === "skins") {
        title.innerText = "Cube Skins";
        cubeSkins.forEach(item => {
          content.innerHTML += createShopCard({
            name: item.name,
            desc: item.desc,
            cost: item.cost,
            owned: unlockedCubes.includes(item.id),
            equipped: equippedCube === item.id,
            preview: getCubePreviewMarkup(item),
            buyAction: `buyCube('${item.id}', ${item.cost})`,
            equipAction: `equipCube('${item.id}')`
          });
        });
      }

      if (shopTab === "trails") {
        title.innerText = "Trails";
        trailItems.forEach(item => {
          content.innerHTML += createShopCard({
            name: item.name,
            desc: item.desc,
            cost: item.cost,
            owned: unlockedTrails.includes(item.id),
            equipped: equippedTrail === item.id,
            preview: getTrailPreviewMarkup(item),
            buyAction: `buyTrail('${item.id}', ${item.cost})`,
            equipAction: `equipTrail('${item.id}')`
          });
        });
      }

    }

    function createShopCard({ name, desc, cost, owned, equipped, preview, buyAction, equipAction, ownedLabel }) {
      let button = "";
      if (equipped) {
        button = `<button class="shop-btn equipped-btn" disabled>${ownedLabel || "Equipped"}</button>`;
      } else if (owned) {
        button = `<button class="shop-btn equip-btn" onclick="${equipAction}">Equip</button>`;
      } else {
        button = `<button class="shop-btn" onclick="${buyAction}" ${coins < cost ? "disabled" : ""}>Buy</button>`;
      }

      return `
        <div class="shop-card">
          <div class="shop-card-top">
            ${preview}
            <div class="card-info">
              <div class="card-title">${name}</div>
              <div class="card-subtitle">${desc}</div>
            </div>
          </div>
          <div class="card-footer">
            <div class="card-price">🪙 ${cost}</div>
            ${button}
          </div>
        </div>
      `;
    }

    function buyCube(id, cost) {
      if (coins >= cost && !unlockedCubes.includes(id)) {
        coins -= cost;
        unlockedCubes.push(id);
        equippedCube = id;
        if (cube) applyCubeSkinToBody(cube, getCubeSkin(id));
        saveGame();
        renderShopContent();
      }
    }

    function equipCube(id) {
      equippedCube = id;
      if (cube) applyCubeSkinToBody(cube, getCubeSkin(id));
      saveGame();
      renderShopContent();
    }

    function buyStair(id, cost) {
      if (coins >= cost && !unlockedStairs.includes(id)) {
        coins -= cost;
        unlockedStairs.push(id);
        equippedStair = id;
        saveGame();
        renderShopContent();
      }
    }

    function equipStair(id) {
      equippedStair = id;
      applyHudTheme();
      saveGame();
      renderShopContent();
    }

    function buyTrail(id, cost) {
      if (coins >= cost && !unlockedTrails.includes(id)) {
        coins -= cost;
        unlockedTrails.push(id);
        equippedTrail = id;
        saveGame();
        renderShopContent();
      }
    }

    function equipTrail(id) {
      equippedTrail = id;
      saveGame();
      renderShopContent();
    }

    function buyEffect(id, cost) {
      if (coins >= cost && !unlockedEffects.includes(id)) {
        coins -= cost;
        unlockedEffects.push(id);
        equippedEffect = id;
        saveGame();
        renderShopContent();
      }
    }

    function equipEffect(id) {
      equippedEffect = id;
      saveGame();
      renderShopContent();
    }

    function buyUpgrade(id, cost) {
      if (coins >= cost && !purchasedUpgrades.includes(id)) {
        coins -= cost;
        purchasedUpgrades.push(id);
        saveGame();
        renderShopContent();
      }
    }

    function getPerkChoices() {
      const remaining = perkPool.filter(p => !perkSelectionsTaken.has(p.id));
      const pool = [...remaining];
      const picks = [];
      while (pool.length && picks.length < 2) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(idx, 1)[0]);
      }
      return picks;
    }

    function maybeOpenPerkChoice() {
      if (perkPaused || gameOver || hasWon) return;
      const milestones = [15, 30, 50];
      for (const step of milestones) {
        if (currentSteps >= step && !perkSelectionsTaken.has(`milestone_${step}`)) {
          perkSelectionsTaken.add(`milestone_${step}`);
          pendingPerkStep = step;
          openPerkPanel();
          break;
        }
      }
    }

    function openPerkPanel() {
      if (perkPaused) return;
      const list = document.getElementById("perk-list");
      const picks = getPerkChoices();
      if (!picks.length) return;
      perkPaused = true;
      engine.timing.timeScale = 0;
      setCanvasInput(false);
      document.getElementById("perk-panel").style.display = "block";
      refreshInRunControls();
      setStatus("Choose Perk", "idle");
      list.innerHTML = picks.map(p => `
        <div class="perk-card">
          <div class="perk-badge">${p.badge}</div>
          <h4>${p.name}</h4>
          <p>${p.desc}</p>
          <div style="margin-top:12px;">
            <button class="perk-btn" onclick="choosePerk('${p.id}')">Take Perk</button>
          </div>
        </div>
      `).join("");
    }

    function choosePerk(id) {
      if (activePerks.includes(id)) return;
      activePerks.push(id);
      perkSelectionsTaken.add(id);
      if (id === "bump") perkCharges.bump += 2;
      if (id === "slam") perkCharges.slam += 3;
      if (id === "relaunch") perkCharges.relaunch += 1;
      runStats.perkChoices++;
      document.getElementById("perk-panel").style.display = "none";
      perkPaused = false;
      pendingPerkStep = null;
      engine.timing.timeScale = isPaused ? 0 : 1;
      setCanvasInput(true);
      updatePerkActionButtons();
      refreshInRunControls();
      showPopup("PERK +", cube.position.x, cube.position.y - 40, "#c7b6ff");
      setStatus("Perk Applied", "live");
    }

    function showMainMenu() {
      isPaused = false;
      perkPaused = false;
      engine.timing.timeScale = 1;
      document.getElementById("game-over").style.display = "none";
      document.getElementById("shop-menu").style.display = "none";
      document.getElementById("challenge-panel").style.display = "none";
      document.getElementById("mode-panel").style.display = "none";
      document.getElementById("perk-panel").style.display = "none";
      document.getElementById("pause-panel").style.display = "none";
      document.getElementById("hud").style.display = "none";
      document.getElementById("top-controls").style.display = "none";
      updateLegendVisibility();
      document.getElementById("main-menu").style.display = "block";
      setMenuBackdropVisible(true);
      setCanvasInput(false);
      refreshInRunControls();
      updateHud();
      setStatus("Ready", "idle");
      generateLevel(false);
    }

    function startGame() {
      isPaused = false;
      perkPaused = false;
      engine.timing.timeScale = 1;
      document.getElementById("main-menu").style.display = "none";
      document.getElementById("shop-menu").style.display = "none";
      document.getElementById("challenge-panel").style.display = "none";
      document.getElementById("mode-panel").style.display = "none";
      document.getElementById("perk-panel").style.display = "none";
      document.getElementById("pause-panel").style.display = "none";
      document.getElementById("game-over").style.display = "none";
      setMenuBackdropVisible(false);
      document.getElementById("hud").style.display = "block";
      updateLegendVisibility();
      setCanvasInput(true);
      refreshInRunControls();

      currentScore = 0;
      currentSteps = 0;
      currentRunCoins = 0;
      combo = 1;
      comboStreak = 0;
      bestComboThisRun = 1;
      launchWasPerfect = false;
      activePerks = [];
      perkCharges = { bump: 0, slam: 0, relaunch: 0 };
      perkSelectionsTaken = new Set();
      pendingPerkStep = null;
      runStats = {
        steps: 0,
        bestCombo: 1,
        specialHits: 0,
        perfectLaunch: false,
        airBonus: 0,
        coinStairs: 0,
        scoreFromHits: 0,
        stepMilestoneCoins: 0,
        perkChoices: 0,
        lastStepIndex: null,
        maxStepSkip: 0,
        landedTopStep: false,
        hitGoldenStep67: false,
        topStepIndex: 0
      };

      stats.gamesPlayed++;
      queueSave();
      updateHud();
      updatePerkActionButtons();
      setStatus("Aiming", "idle");
      generateLevel(true);
    }

    function togglePause() {
      if (gameOver || document.getElementById("hud").style.display !== "block" || perkPaused) return;
      isPaused = !isPaused;
      engine.timing.timeScale = isPaused ? 0 : 1;
      document.getElementById("pause-panel").style.display = isPaused ? "block" : "none";
      setCanvasInput(!isPaused);
      refreshInRunControls();
      setStatus(isPaused ? "Paused" : "In Motion", isPaused ? "danger" : "live");
    }

    function getModeConfig() {
      return modes[selectedMode] || modes.endless;
    }

    function getClassConfig() {
      return cubeClasses[selectedClass] || cubeClasses.balanced;
    }

    function generateLevel(isPlayable) {
      Composite.clear(world);
      Engine.clear(engine);

      stairsArr = [];
      movingStairs = [];
      touchedStairs.clear();
      specialTouchedStairs.clear();
      brokenStairs.clear();
      trail = [];
      particles = [];
      popups = [];
      heroMoments = [];
      isLaunched = false;
      gameOver = false;
      hasWon = false;
      isPaused = false;
      perkPaused = false;
      stationaryFrames = 0;
      isDragging = false;
      dragPointerId = null;
      aimPoint = null;
      elastic = null;
      cameraShake = 0;
      gameTick = 0;
      trailSampleTick = 0;
      launchCharge = 0;
      launchOrigin = { x: 0, y: 0 };
      recentStairContact = { id: null, time: 0 };
      slamLockUntil = 0;
      relaunchPrimed = false;
      launchContext = "normal";

      const stageStart = getStageStartConfig(isPlayable);
      let currentX = stageStart.x;
      let currentY = stageStart.y;
      const mode = getModeConfig();
      const classCfg = getClassConfig();
      const numStairs = isPlayable ? mode.stairCount : 60;
      runStats.topStepIndex = Math.max(0, numStairs - 1);
      const startIndex = stageStart.startIndex;
      const stepHeight = 40;
      const activeTheme = getStairTheme();

      for (let i = 0; i < numStairs; i++) {
        let stepWidth = 65 + Math.random() * 85;
        let x = currentX + stepWidth / 2;
        let y = currentY + stepHeight / 2;

        let stairColor = i % 2 === 0 ? activeTheme.c1 : activeTheme.c2;
        let effectLabel = "normal";
        let stroke = "rgba(255,255,255,0.08)";
        let meta = { moving: false, breakable: false, portalTarget: null, flash: 0, telegraph: 0 };

        if (isPlayable && i > startIndex + 3) {
          const stage = i / numStairs;
          let specialChance = mode.specialRate;
          if (stage > 0.65) specialChance += 0.06;
          if (selectedMode === "chaos") specialChance += 0.02;

          if (Math.random() < specialChance) {
            const randType = Math.random();

            if (randType < 0.14) {
              stairColor = "#56d7ff"; effectLabel = "dash"; stroke = "rgba(86, 215, 255, 0.65)";
            } else if (randType < 0.22) {
              stairColor = "#ff61ee"; effectLabel = "chaos"; stroke = "rgba(255, 97, 238, 0.65)";
            } else if (randType < 0.34) {
              stairColor = "#79e38d"; effectLabel = "bouncy"; stroke = "rgba(121, 227, 141, 0.65)";
            } else if (randType < 0.44) {
              stairColor = "#ffb35c"; effectLabel = "sticky"; stroke = "rgba(255, 179, 92, 0.65)";
            } else if (randType < 0.54) {
              stairColor = "#dff9ff"; effectLabel = "ice"; stroke = "rgba(223, 249, 255, 0.8)";
            } else if (randType < 0.64) {
              stairColor = "#ffd166"; effectLabel = "coin"; stroke = "rgba(255, 209, 102, 0.85)";
            } else if (randType < 0.74) {
              stairColor = "#ff7a7a"; effectLabel = "break"; stroke = "rgba(255, 122, 122, 0.8)"; meta.breakable = true;
            } else if (randType < 0.83) {
              stairColor = "#7a7cff"; effectLabel = "gravity"; stroke = "rgba(122, 124, 255, 0.82)";
            } else if (randType < 0.89) {
              stairColor = "#94a3ff"; effectLabel = "portal"; stroke = "rgba(148, 163, 255, 0.8)";
            } else if (randType < 0.95) {
              stairColor = "#d7ecff"; effectLabel = "glass"; stroke = "rgba(215, 236, 255, 0.92)"; meta.breakable = true;
            } else {
              stairColor = "#c27dff"; effectLabel = "roulette"; stroke = "rgba(194, 125, 255, 0.85)";
            }
          }
        }

        if (isPlayable && i === 67) {
          stairColor = "#ffd166";
          effectLabel = "normal";
          stroke = "rgba(255, 209, 102, 0.95)";
          meta = { moving: false, breakable: false, portalTarget: null, flash: 0, telegraph: 0, goldenTarget: true };
        }

        let stair = Bodies.rectangle(x, y, stepWidth, stepHeight, {
          isStatic: true,
          label: `stair_${effectLabel}_${i}`,
          chamfer: { radius: 8 },
          render: {
            fillStyle: stairColor,
            strokeStyle: stroke,
            lineWidth: effectLabel === "normal" ? 1.2 : 2.4,
            sprite: { ...EMPTY_SPRITE },
            opacity: 1
          }
        });

        stair.plugin = {
          originalColor: stairColor,
          originalStroke: stroke,
          homeX: x,
          homeY: y,
          index: i,
          phase: Math.random() * Math.PI * 2,
          range: 18 + Math.random() * 25,
          effect: effectLabel,
          ...meta
        };

        applyThemeToStair(stair, activeTheme, stairColor, stroke, effectLabel);

        stairsArr.push(stair);
        if (meta.moving) movingStairs.push(stair);

        if (i === startIndex) {
          startPos = { x: x, y: y - stepHeight - 10 };
          launchOrigin = { ...startPos };
        }

        currentX += stepWidth;
        currentY += stepHeight;
      }

      const portals = stairsArr.filter(s => s.label.includes("portal"));
      for (let i = 0; i < portals.length; i++) {
        const next = portals[(i + 1) % portals.length];
        portals[i].plugin.portalTarget = next;
      }

      if (isPlayable) {
        finishLine = Bodies.rectangle(currentX + 320, currentY + 100, 1500, 100, {
          isStatic: true,
          label: "finish_line",
          chamfer: { radius: 10 },
          render: {
            fillStyle: "#ffd166",
            strokeStyle: "rgba(255,255,255,0.9)",
            lineWidth: 6
          }
        });
        stairsArr.push(finishLine);
      }

      Composite.add(world, stairsArr);

      cube = createCubeBody(startPos, classCfg);

      Composite.add(world, cube);

      if (isPlayable) {
        elastic = Constraint.create({
          pointA: { x: startPos.x, y: startPos.y },
          bodyB: cube,
          stiffness: 0.04,
          damping: 0.01,
          render: {
            strokeStyle: "rgba(180, 220, 255, 0.55)",
            lineWidth: 4,
            type: "line"
          }
        });

        Composite.add(world, elastic);
      } else {
        focusCameraOnCube();
      }

      focusCameraOnCube();
    }

    function getWorldPointFromClient(clientX, clientY) {
      const rect = render.canvas.getBoundingClientRect();
      const boundsWidth = render.bounds.max.x - render.bounds.min.x;
      const boundsHeight = render.bounds.max.y - render.bounds.min.y;

      const scaleX = boundsWidth / rect.width;
      const scaleY = boundsHeight / rect.height;

      return {
        x: render.bounds.min.x + (clientX - rect.left) * scaleX,
        y: render.bounds.min.y + (clientY - rect.top) * scaleY
      };
    }

    function pointInCube(worldPoint) {
      return cube && Bounds.contains(cube.bounds, worldPoint);
    }

    function getLaunchChargeFromPullDistance(dist) {
      const raw = Math.max(0, Math.min(1, dist / MAX_PULL));
      if (raw <= LAUNCH_DEADZONE) return 0;
      const normalized = (raw - LAUNCH_DEADZONE) / (1 - LAUNCH_DEADZONE);
      return Math.max(0, Math.min(1, Math.pow(normalized, LAUNCH_POWER_CURVE)));
    }

    function getPullDistanceFromLaunchCharge(charge) {
      const clamped = Math.max(0, Math.min(1, charge));
      if (clamped <= 0) return MAX_PULL * LAUNCH_DEADZONE;
      const normalized = Math.pow(clamped, 1 / LAUNCH_POWER_CURVE);
      return MAX_PULL * (LAUNCH_DEADZONE + normalized * (1 - LAUNCH_DEADZONE));
    }

    function getLaunchVectorFromPosition(position) {
      const classCfg = getClassConfig();
      const boost = getPerkValue("turbo_launch") ? 1.18 : 1;
      const pullVector = Vector.sub(launchOrigin, position);
      const rawDistance = Vector.magnitude(Vector.sub(position, launchOrigin));
      const charge = getLaunchChargeFromPullDistance(rawDistance);
      const direction = Vector.magnitude(pullVector) > 0.0001 ? Vector.normalise(pullVector) : { x: 0, y: 0 };
      const contextScale = launchContext === "relaunch" ? RELAUNCH_POWER_SCALE : OPENING_LAUNCH_SCALE;
      const scaledMagnitude = MAX_PULL * Math.pow(charge, LAUNCH_VELOCITY_CURVE) * LAUNCH_VELOCITY_BOOST * contextScale;
      return {
        charge,
        velocity: Vector.mult(direction, scaledMagnitude * classCfg.launchPower * boost)
      };
    }

    function getCurrentAimPoint() {
      return aimPoint || launchOrigin;
    }

    function getClampedDragPosition(worldPoint) {
      const delta = Vector.sub(worldPoint, launchOrigin);
      const dist = Vector.magnitude(delta);
      if (dist <= MAX_PULL) return worldPoint;
      const dir = Vector.normalise(delta);
      return Vector.add(launchOrigin, Vector.mult(dir, MAX_PULL));
    }

    function beginDrag(worldPoint, pointerId = "mouse") {
      if (!cube || isLaunched || gameOver || isPaused || perkPaused) return;
      if (!relaunchPrimed && !pointInCube(worldPoint)) return;

      isDragging = true;
      const wasRelaunch = relaunchPrimed;
      relaunchPrimed = false;
      launchContext = wasRelaunch ? "relaunch" : "normal";
      dragPointerId = pointerId;
      Body.setStatic(cube, true);
      launchOrigin = { x: cube.position.x, y: cube.position.y };
      Body.setPosition(cube, launchOrigin);
      Body.setVelocity(cube, { x: 0, y: 0 });
      Body.setAngularVelocity(cube, 0);
      Body.setAngle(cube, 0);
      aimPoint = { ...launchOrigin };
      launchCharge = 0;
      setStatus("Aiming", "idle");
    }

    function updateDrag(worldPoint) {
      if (!isDragging || !cube) return;

      const clampedPos = getClampedDragPosition(worldPoint);
      aimPoint = clampedPos;
      Body.setPosition(cube, launchOrigin);
      Body.setVelocity(cube, { x: 0, y: 0 });
      Body.setAngularVelocity(cube, 0);

      const pullDist = Vector.magnitude(Vector.sub(aimPoint, launchOrigin));
      launchCharge = getLaunchChargeFromPullDistance(pullDist);
    }

    function endDrag() {
      if (!isDragging || !cube || isLaunched) return;

      isDragging = false;
      dragPointerId = null;

      const launchData = getLaunchVectorFromPosition(getCurrentAimPoint());
      const pullStrength = launchData.charge;
      const launchVelocity = launchData.velocity;

      const perfectWindow = getPerfectChargeWindow();
      launchWasPerfect = pullStrength >= perfectWindow.min && pullStrength <= perfectWindow.max;
      airStartY = cube.position.y;
      airStartTime = performance.now();
      lastLaunchVector = Vector.magnitude(launchVelocity) > 0.0001 ? Vector.normalise(launchVelocity) : { x: 0, y: -1 };

      Body.setStatic(cube, false);
      Body.setPosition(cube, launchOrigin);
      Body.setVelocity(cube, launchVelocity);

      isLaunched = true;
      setStatus(launchWasPerfect ? "Perfect Launch" : "In Motion", launchWasPerfect ? "idle" : "live");

      if (launchWasPerfect) {
        currentScore += 8;
        runStats.perfectLaunch = true;
        stats.perfectLaunches++;
        showPopup("PERFECT +8", cube.position.x, cube.position.y - 30, "#8effff");
        spawnBurst(cube.position.x, cube.position.y, "#8effff", 14, 5);
        queueSave();
      }

      setTimeout(() => {
        if (elastic) {
          Composite.remove(world, elastic);
          elastic = null;
        }
      }, 20);

      launchContext = "normal";
      aimPoint = null;
      updateHud();
    }

    function cancelDrag() {
      if (!cube) return;

      isDragging = false;
      relaunchPrimed = false;
      dragPointerId = null;
      Body.setStatic(cube, false);
      Body.setPosition(cube, launchOrigin);
      Body.setVelocity(cube, { x: 0, y: 0 });
      Body.setAngularVelocity(cube, 0);
      Body.setAngle(cube, 0);
      launchCharge = 0;
      launchContext = "normal";
      aimPoint = null;
    }

    render.canvas.addEventListener("mousedown", (e) => {
      if (isLaunched && usePerkAction("slam")) return;
      beginDrag(getWorldPointFromClient(e.clientX, e.clientY), "mouse");
    });

    window.addEventListener("mousemove", (e) => {
      if (dragPointerId !== "mouse") return;
      updateDrag(getWorldPointFromClient(e.clientX, e.clientY));
    });

    window.addEventListener("mouseup", () => {
      if (dragPointerId === "mouse") endDrag();
    });

    render.canvas.addEventListener("touchstart", (e) => {
      for (const touch of e.changedTouches) {
        if (isLaunched && usePerkAction("slam")) return;
        if (!isDragging) beginDrag(getWorldPointFromClient(touch.clientX, touch.clientY), touch.identifier);
      }
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      const shopOpen = document.getElementById("shop-menu").style.display === "block";
      const menuOpen = document.getElementById("main-menu").style.display === "block";
      const gameOverOpen = document.getElementById("game-over").style.display === "block";
      const challengeOpen = document.getElementById("challenge-panel").style.display === "block";
      const modeOpen = document.getElementById("mode-panel").style.display === "block";
      const perkOpen = document.getElementById("perk-panel").style.display === "block";
      const pauseOpen = document.getElementById("pause-panel").style.display === "block";

      if (!isDragging) {
        if (!(shopOpen || menuOpen || gameOverOpen || challengeOpen || modeOpen || perkOpen || pauseOpen)) {
          e.preventDefault();
        }
        return;
      }

      for (const touch of e.changedTouches) {
        if (touch.identifier === dragPointerId) {
          updateDrag(getWorldPointFromClient(touch.clientX, touch.clientY));
          break;
        }
      }

      e.preventDefault();
    }, { passive: false });

    window.addEventListener("touchend", (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === dragPointerId) {
          endDrag();
          break;
        }
      }
    });

    window.addEventListener("touchcancel", () => {
      if (isDragging) cancelDrag();
    });

    const keys = {};
    window.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

    function getComboWindow() {
      let base = purchasedUpgrades.includes("impact_master") ? 1200 : 900;
      if (getPerkValue("combo_buffer")) base += 450;
      return base;
    }

    function addComboHit(baseScore = 1, isSpecial = false, x = 0, y = 0) {
      const now = performance.now();

      if (now - lastHitTime < getComboWindow()) comboStreak++;
      else comboStreak = 1;

      lastHitTime = now;
      combo = Math.min(1 + Math.floor(comboStreak / 2), 12);
      bestComboThisRun = Math.max(bestComboThisRun, combo);
      runStats.bestCombo = Math.max(runStats.bestCombo, combo);
      stats.highestCombo = Math.max(stats.highestCombo, combo);

      let earned = baseScore * combo;
      if (getPerkValue("score_boost")) earned *= 1.2;
      earned = Math.round(earned * 10) / 10;
      currentScore += earned;
      runStats.scoreFromHits += earned;

      showPopup(`+${earned}`, x, y - 10, isSpecial ? "#ffd166" : "#ffffff");
      if (combo >= 3) {
        const comboText = combo >= 10 ? `UNREAL x${combo}` : combo >= 7 ? `WOW x${combo}` : combo >= 5 ? `SICK x${combo}` : `COMBO x${combo}`;
        const comboColor = combo >= 7 ? "#ffd166" : "#8fbeff";
        showHeroMoment(comboText, comboColor, combo >= 7 ? "rgba(255,209,102,0.18)" : "rgba(143,190,255,0.18)");
      }

      updateHud();
    }

    function checkAirBonus() {
      const airTime = (performance.now() - airStartTime) / 1000;
      const rise = Math.max(0, airStartY - cube.position.y);

      if (airTime > 0.65 || rise > 120) {
        const bonus = Math.max(3, Math.floor(airTime * 6 + rise / 80));
        currentScore += bonus;
        runStats.airBonus += bonus;
        showPopup(`AIR +${bonus}`, cube.position.x, cube.position.y - 42, "#a8fff0");
        updateHud();
      }
    }

    function applySpecialEffect(stair, effect, sourceEffect = effect) {
      if (effect === "dash") {
        Body.setVelocity(cube, { x: 22, y: -4 });
        setStatus(sourceEffect === "roulette" ? "Roulette Dash" : "Dash Boost", "live");
        shake(5);
        return;
      }

      if (effect === "chaos") {
        let randX = (Math.random() - 0.5) * 40;
        let randY = -15 - Math.random() * 15;
        Body.setVelocity(cube, { x: randX, y: randY });
        setStatus(sourceEffect === "roulette" ? "Roulette Chaos" : "Chaos Kick", "danger");
        shake(6);
        return;
      }

      if (effect === "bouncy") {
        if (performance.now() < slamLockUntil) {
          Body.setVelocity(cube, {
            x: cube.velocity.x * 0.3,
            y: Math.min(cube.velocity.y, 6)
          });
          setStatus("Slam Impact", "danger");
        } else {
          Body.setVelocity(cube, { x: cube.velocity.x * 1.18, y: -18 });
          setStatus(sourceEffect === "roulette" ? "Roulette Bounce" : "Bounce Boost", "live");
          shake(7);
        }
        return;
      }

      if (effect === "sticky") {
        if (getPerkValue("anti_stick")) {
          Body.setVelocity(cube, { x: cube.velocity.x * 1.02, y: cube.velocity.y * 0.98 });
          showPopup("NO STICK", stair.position.x, stair.position.y - 32, "#b8ffb7");
          setStatus("Slipstream", "live");
        } else {
          const stickyScale = getPerkValue("spring_shell") ? 0.45 : 0.15;
          Body.setVelocity(cube, { x: cube.velocity.x * stickyScale, y: cube.velocity.y * stickyScale });
          setStatus("Sticky Drag", "danger");
        }
        return;
      }

      if (effect === "ice") {
        Body.setVelocity(cube, { x: cube.velocity.x + 1.5, y: cube.velocity.y });
        setStatus("Ice Slide", "idle");
        return;
      }

      if (effect === "coin") {
        const coinGain = getPerkValue("coin_surge") ? 3 : 2;
        currentRunCoins += coinGain;
        runStats.coinStairs += 1;
        Body.setVelocity(cube, { x: cube.velocity.x * 1.04, y: Math.min(cube.velocity.y, -6) });
        showPopup(`+${coinGain} COINS`, stair.position.x, stair.position.y - 34, "#ffd166");
        setStatus(sourceEffect === "roulette" ? "Roulette Riches" : "Coin Cache", "live");
        return;
      }

      if (effect === "break") {
        if (!brokenStairs.has(stair.id)) {
          brokenStairs.add(stair.id);
          stair.plugin.breakTimer = getPerkValue("spring_shell") ? 18 : 10;
          stair.plugin.flash = 1.4;
          showPopup("CRACK", stair.position.x, stair.position.y - 30, "#ff9d9d");
          setStatus(sourceEffect === "roulette" ? "Roulette Break" : "Breakaway", "danger");
        }
        return;
      }

      if (effect === "portal") {
        if (stair.plugin.portalTarget) {
          const t = stair.plugin.portalTarget;
          const exitDir = Math.sign(cube.velocity.x || lastLaunchVector.x || 1) || 1;
          Body.setPosition(cube, { x: t.position.x + exitDir * 14, y: t.position.y - 82 });
          Body.setVelocity(cube, { x: exitDir * 10, y: -14 });
          showPopup("PORTAL", t.position.x, t.position.y - 36, "#b4beff");
          setStatus(sourceEffect === "roulette" ? "Roulette Warp" : "Warp Jump", "live");
          shake(8);
        }
        return;
      }

      if (effect === "gravity") {
        Body.setVelocity(cube, {
          x: cube.velocity.x * 0.72,
          y: Math.max(24, cube.velocity.y + 16)
        });
        showPopup("HEAVY", stair.position.x, stair.position.y - 34, "#9ca7ff");
        setStatus(sourceEffect === "roulette" ? "Roulette Gravity" : "Gravity Well", "danger");
        shake(8);
        return;
      }

      if (effect === "glass") {
        if (!brokenStairs.has(stair.id)) {
          brokenStairs.add(stair.id);
          stair.plugin.breakTimer = 1;
          Body.setVelocity(cube, { x: cube.velocity.x * 0.82, y: Math.max(-2, cube.velocity.y * 0.2) });
          showPopup("SHATTER", stair.position.x, stair.position.y - 34, "#e7f7ff");
          setStatus("Glass Step", "danger");
        }
        return;
      }

      if (effect === "roulette") {
        const options = ["dash", "chaos", "bouncy", "sticky", "ice", "coin", "break", "portal", "gravity", "glass"];
        const chosen = options[Math.floor(Math.random() * options.length)];
        showPopup(`? ${chosen.toUpperCase()}`, stair.position.x, stair.position.y - 48, "#e0b3ff");
        applySpecialEffect(stair, chosen, "roulette");
        return;
      }

      if (effect === "moving") {
        setStatus("Moving Platform", "idle");
      }
    }

    function hitSpecial(stair, effect) {
      if (!specialTouchedStairs.has(stair.id)) {
        specialTouchedStairs.add(stair.id);
        stats.specialHits++;
        runStats.specialHits++;
        queueSave();
      }
      applySpecialEffect(stair, effect);
    }

    function triggerGameOver(won) {
      gameOver = true;
      isDragging = false;
      setCanvasInput(false);

      document.getElementById("hud").style.display = "none";
      document.getElementById("top-controls").style.display = "none";
      updateLegendVisibility();
      document.getElementById("perk-panel").style.display = "none";
      document.getElementById("game-over").style.display = "block";
      refreshInRunControls();

      const title = document.getElementById("game-over-title");
      title.innerText = won ? "You Win" : "Game Over";
      title.style.color = won ? "#ffd166" : "#ffffff";

      const stepCoins = Math.floor(currentSteps / 9);
      const comboCoins = Math.floor(runStats.bestCombo / 5) * 2;
      const styleCoins = Math.floor(runStats.airBonus / 12) + Math.floor(runStats.specialHits / 6);
      const milestoneCoins = (currentSteps >= 20 ? 3 : 0) + (currentSteps >= 40 ? 4 : 0) + (currentSteps >= 60 ? 5 : 0);
      runStats.stepMilestoneCoins = milestoneCoins;
      let earnedCoins = stepCoins + comboCoins + styleCoins + milestoneCoins + currentRunCoins;
      if (won) earnedCoins += 6;
      if (purchasedUpgrades.includes("coin_magnet")) earnedCoins += 2;
      if (getPerkValue("coin_surge")) earnedCoins += 3;

      document.getElementById("final-steps").innerText = currentSteps;
      document.getElementById("final-score").innerText = Math.floor(currentScore);
      document.getElementById("earned-coins").innerText = earnedCoins;
      document.getElementById("best-combo-run").innerText = "x" + bestComboThisRun;

      coins += earnedCoins;
      stats.lifetimeSteps += currentSteps;
      stats.lifetimeCoins += earnedCoins;
      stats.highScore = Math.max(stats.highScore, Math.floor(currentScore));
      stats.bestSteps = Math.max(stats.bestSteps, currentSteps);

      const breakdown = document.getElementById("run-breakdown");
      breakdown.innerHTML = `
        <div>Hit Score: ${Math.floor(runStats.scoreFromHits)} • Air Bonus: ${runStats.airBonus}</div>
        <div>Special Stairs: ${runStats.specialHits} • Coin Stairs: ${runStats.coinStairs} • Perks Chosen: ${runStats.perkChoices}</div>
        <div>Coin Breakdown → Steps ${stepCoins}, Combo ${comboCoins}, Style ${styleCoins}, Milestones ${milestoneCoins}, Pickups ${currentRunCoins}${won ? ', Win +10' : ''}</div>
      `;

      saveGame();
      renderChallenges();
      updateHud();
    }

    Events.on(engine, "beforeUpdate", function() {
      if (isPaused || perkPaused) return;
      gameTick++;

      if (isRainbowCubeSkin(getCubeSkin()) && cube) {
        cube.render.fillStyle = `hsl(${(gameTick * 3) % 360}, 100%, 65%)`;
      }

      if (movingStairs.length) {
        movingStairs.forEach(stair => {
          const x = stair.plugin.homeX + Math.sin(gameTick * 0.035 + stair.plugin.phase) * stair.plugin.range;
          Body.setPosition(stair, { x, y: stair.plugin.homeY });
        });
      }

      stairsArr.forEach(stair => {
        if (!stair.plugin) return;
        const fx = stair.plugin.effect;
        stair.plugin.telegraph += 0.06;
        if (stair.plugin.flash > 0) stair.plugin.flash -= 0.08;
        if (stair.plugin.breakTimer != null) {
          stair.plugin.breakTimer -= 1;
          if (stair.plugin.breakTimer <= 0) {
            if (Composite.get(world, stair.id, "body")) Composite.remove(world, stair);
            stair.plugin.breakTimer = null;
          }
        }
        const flashMix = Math.max(0, stair.plugin.flash || 0);
        const baseWidth = fx === "normal" ? 1.2 : 2.4;
        stair.render.lineWidth = baseWidth + flashMix * 1.8;
        stair.render.strokeStyle = stair.plugin.originalStroke;
      });

      if (cube && !gameOver && document.getElementById("hud").style.display === "block") {
        if (isDragging) {
          Body.setVelocity(cube, { x: 0, y: 0 });
          Body.setAngularVelocity(cube, 0);
        }

        if (!isDragging && cube.speed > MAX_CUBE_SPEED) {
          const ratio = MAX_CUBE_SPEED / cube.speed;
          Body.setVelocity(cube, {
            x: cube.velocity.x * ratio,
            y: cube.velocity.y * ratio
          });
        }

        if (isLaunched) {
          const controlBoost = (purchasedUpgrades.includes("air_control") ? 0.12 : 0) + (getPerkValue("air_drift") ? 0.18 : 0);
          const airControl = getClassConfig().control + controlBoost;
          if (keys["arrowleft"] || keys["a"]) Body.applyForce(cube, cube.position, { x: -0.0008 * airControl, y: 0 });
          if (keys["arrowright"] || keys["d"]) Body.applyForce(cube, cube.position, { x: 0.0008 * airControl, y: 0 });
          if (getPerkValue("glide") && cube.velocity.y > 5) {
            Body.setVelocity(cube, { x: cube.velocity.x, y: cube.velocity.y * 0.955 });
          }
        }

        const shakeX = (Math.random() - 0.5) * cameraShake;
        const shakeY = (Math.random() - 0.5) * cameraShake;

        const cameraOffset = getCameraOffset();
        Render.lookAt(render, {
          min: { x: cube.position.x - width / 2 + cameraOffset.x + shakeX, y: cube.position.y - height / 2 + cameraOffset.y + shakeY },
          max: { x: cube.position.x + width / 2 + cameraOffset.x + shakeX, y: cube.position.y + height / 2 + cameraOffset.y + shakeY }
        });

        cameraShake *= 0.86;
        if (cameraShake < 0.1) cameraShake = 0;

        if (isLaunched && !hasWon) {
          const activeTrail = getTrailItem();
          trailSampleTick++;
          const shouldCapture = !isTextureTrail(activeTrail) || trailSampleTick % 3 === 0;
          if (shouldCapture) {
            trail.unshift({ x: cube.position.x, y: cube.position.y });
            const maxTrailLength = isTextureTrail(activeTrail)
              ? (deviceProfile.tier === "desktop" ? 10 : 6)
              : (deviceProfile.tier === "desktop" ? 40 : 24);
            if (trail.length > maxTrailLength) trail.pop();
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) popups.splice(i, 1);
      }

      for (let i = heroMoments.length - 1; i >= 0; i--) {
        heroMoments[i].life--;
        if (heroMoments[i].life <= 0) heroMoments.splice(i, 1);
      }
    });

    function drawTrajectoryGuide(ctx) {
      if (!cube || !isDragging) return;
      const launchData = getLaunchVectorFromPosition(getCurrentAimPoint());
      const velocity = launchData.velocity;
      let px = launchOrigin.x;
      let py = launchOrigin.y;
      let vx = velocity.x;
      let vy = velocity.y;
      const gravityY = engine.gravity.y * engine.gravity.scale * 60 * 60;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 8]);
      for (let i = 0; i < 24; i++) {
        px += vx * 0.55;
        py += vy * 0.55;
        vy += gravityY * 0.00026;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.34)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    function drawStairTelegraphs(ctx) {
      stairsArr.forEach(stair => {
        if (!stair.plugin || !stair.plugin.effect || stair.plugin.effect === "normal") return;
        if (!isWorldPointVisible(stair.position.x, stair.position.y, 80)) return;
        const effect = stair.plugin.effect;
        const pulse = 0.5 + Math.sin(stair.plugin.telegraph) * 0.5;
        ctx.save();
        ctx.translate(stair.position.x, stair.position.y);
        ctx.globalAlpha = 0.22 + pulse * 0.18 + Math.max(0, stair.plugin.flash || 0) * 0.4;
        ctx.strokeStyle = stair.plugin.originalStroke;
        ctx.fillStyle = stair.plugin.originalStroke;
        ctx.lineWidth = 2;

        if (effect === "dash") {
          ctx.beginPath();
          ctx.moveTo(-16, -6); ctx.lineTo(-2, -6); ctx.lineTo(-2, -12); ctx.lineTo(16, 0); ctx.lineTo(-2, 12); ctx.lineTo(-2, 6); ctx.lineTo(-16, 6); ctx.closePath();
          ctx.stroke();
        } else if (effect === "chaos") {
          ctx.beginPath();
          ctx.moveTo(-10, -12); ctx.lineTo(-2, -2); ctx.lineTo(-6, -2); ctx.lineTo(8, 12); ctx.lineTo(2, 1); ctx.lineTo(6, 1); ctx.closePath();
          ctx.stroke();
        } else if (effect === "sticky") {
          ctx.beginPath();
          ctx.arc(0, 0, 10 + pulse * 2, 0, Math.PI * 2);
          ctx.stroke();
        } else if (effect === "break") {
          ctx.beginPath();
          ctx.moveTo(-12, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10);
          ctx.moveTo(4, -10); ctx.lineTo(-2, -1); ctx.lineTo(9, 10);
          ctx.stroke();
        } else if (effect === "portal") {
          ctx.beginPath();
          ctx.arc(0, 0, 8 + pulse * 3, 0, Math.PI * 2);
          ctx.stroke();
        } else if (effect === "coin") {
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.stroke();
        } else if (effect === "ice") {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
          }
          ctx.stroke();
        } else if (effect === "bouncy") {
          ctx.beginPath();
          ctx.moveTo(-10, 6);
          ctx.quadraticCurveTo(-4, -10, 0, 6);
          ctx.quadraticCurveTo(4, -10, 10, 6);
          ctx.stroke();
        } else if (effect === "gravity") {
          ctx.beginPath();
          ctx.moveTo(0, -12); ctx.lineTo(0, 8);
          ctx.moveTo(-5, 2); ctx.lineTo(0, 8); ctx.lineTo(5, 2);
          ctx.stroke();
        } else if (effect === "glass") {
          ctx.beginPath();
          ctx.moveTo(-10, -10); ctx.lineTo(-2, -1); ctx.lineTo(-8, 10);
          ctx.moveTo(10, -10); ctx.lineTo(2, -1); ctx.lineTo(8, 10);
          ctx.moveTo(-2, -1); ctx.lineTo(2, -1);
          ctx.stroke();
        } else if (effect === "roulette") {
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = "900 14px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("?", 0, 1);
        } else if (effect === "moving") {
          ctx.beginPath();
          ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
          ctx.moveTo(8, -4); ctx.lineTo(12, 0); ctx.lineTo(8, 4);
          ctx.moveTo(-8, -4); ctx.lineTo(-12, 0); ctx.lineTo(-8, 4);
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    function drawAchievementMarkers(ctx) {
      stairsArr.forEach(stair => {
        if (!stair.plugin?.goldenTarget) return;
        if (!isWorldPointVisible(stair.position.x, stair.position.y, 100)) return;

        ctx.save();
        ctx.translate(stair.position.x, stair.position.y - 2);
        ctx.fillStyle = "#1b1607";
        ctx.font = "bold 16px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("67", 0, 5);
        ctx.strokeStyle = "rgba(255, 248, 204, 0.9)";
        ctx.lineWidth = 3;
        ctx.strokeText("67", 0, 5);
        ctx.restore();
      });
    }

    function getStairMarker(effect) {
      const markers = {
        dash: "D",
        chaos: "C",
        bouncy: "B",
        sticky: "S",
        ice: "I",
        coin: "$",
        break: "X",
        portal: "P",
        gravity: "G",
        glass: "GL",
        roulette: "?",
        moving: "M"
      };
      return markers[effect] || "";
    }

    function drawStepIdentifiers(ctx) {
      stairsArr.forEach(stair => {
        const effect = stair.plugin?.effect;
        if (!effect || effect === "normal") return;
        if (!isWorldPointVisible(stair.position.x, stair.position.y, 80)) return;

        const marker = getStairMarker(effect);
        if (!marker) return;

        ctx.save();
        ctx.translate(stair.position.x, stair.position.y + 1);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = marker.length > 1 ? "900 11px Inter, sans-serif" : "900 14px Inter, sans-serif";
        ctx.fillStyle = "rgba(8, 14, 28, 0.78)";
        ctx.beginPath();
        ctx.roundRect(-18, -11, 36, 22, 10);
        ctx.fill();
        ctx.strokeStyle = stair.plugin.originalStroke;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#f4f8ff";
        ctx.fillText(marker, 0, 1);
        ctx.restore();
      });
    }

    Events.on(render, "afterRender", function() {
      const ctx = render.context;

      ctx.save();

      const boundsWidth = render.bounds.max.x - render.bounds.min.x;
      const boundsHeight = render.bounds.max.y - render.bounds.min.y;
      ctx.scale(render.options.width / boundsWidth, render.options.height / boundsHeight);
      ctx.translate(-render.bounds.min.x, -render.bounds.min.y);
      ctx.globalCompositeOperation = "destination-over";
      drawPackBackground(ctx);
      drawTrail(ctx);
      ctx.globalCompositeOperation = "source-over";

      drawAchievementMarkers(ctx);
      drawStairTelegraphs(ctx);
      drawStepIdentifiers(ctx);

      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 40);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      popups.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 60);
        ctx.fillStyle = p.color;
        ctx.font = "bold 16px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      });

      if (!gameOver && !isLaunched && cube) {
        ctx.save();

        ctx.beginPath();
        ctx.arc(launchOrigin.x, launchOrigin.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(launchOrigin.x, launchOrigin.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = getCubeAccentColor();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(launchOrigin.x, launchOrigin.y, MAX_PULL, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 10]);
        ctx.stroke();

        const perfectWindow = getPerfectChargeWindow();
        const perfectStart = getPullDistanceFromLaunchCharge(perfectWindow.min);
        const perfectEnd = getPullDistanceFromLaunchCharge(perfectWindow.max);
        ctx.beginPath();
        ctx.arc(launchOrigin.x, launchOrigin.y, (perfectStart + perfectEnd) / 2, Math.PI * 0.8, Math.PI * 1.2);
        ctx.strokeStyle = "rgba(46,230,201,0.6)";
        ctx.lineWidth = perfectEnd - perfectStart;
        ctx.setLineDash([]);
        ctx.stroke();

        if (isDragging) {
          const currentAim = getCurrentAimPoint();
          const dx = launchOrigin.x - currentAim.x;
          const dy = launchOrigin.y - currentAim.y;

          ctx.beginPath();
          ctx.moveTo(launchOrigin.x, launchOrigin.y);
          ctx.lineTo(currentAim.x, currentAim.y);
          ctx.strokeStyle = "rgba(180, 220, 255, 0.65)";
          ctx.lineWidth = 4;
          ctx.shadowColor = "rgba(180, 220, 255, 0.35)";
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;

          const aimAngle = Math.atan2(dy, dx);
          const arrowLength = Math.max(14, Math.min(28, Math.hypot(dx, dy) * 0.18));
          ctx.beginPath();
          ctx.moveTo(launchOrigin.x, launchOrigin.y);
          ctx.lineTo(launchOrigin.x - Math.cos(aimAngle - 0.32) * arrowLength, launchOrigin.y - Math.sin(aimAngle - 0.32) * arrowLength);
          ctx.moveTo(launchOrigin.x, launchOrigin.y);
          ctx.lineTo(launchOrigin.x - Math.cos(aimAngle + 0.32) * arrowLength, launchOrigin.y - Math.sin(aimAngle + 0.32) * arrowLength);
          ctx.stroke();

          drawTrajectoryGuide(ctx);

          const inPerfectWindow = launchCharge >= perfectWindow.min && launchCharge <= perfectWindow.max;
          ctx.fillStyle = launchWasPerfect ? "rgba(46,230,201,0.9)" : inPerfectWindow ? "rgba(46,230,201,0.9)" : "rgba(124,92,255,0.85)";
          ctx.fillRect(launchOrigin.x - 60, launchOrigin.y + 165, 120 * launchCharge, 10);
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.strokeRect(launchOrigin.x - 60, launchOrigin.y + 165, 120, 10);
          ctx.fillStyle = "rgba(46,230,201,0.18)";
          ctx.fillRect(launchOrigin.x - 60 + 120 * perfectWindow.min, launchOrigin.y + 165, 120 * (perfectWindow.max - perfectWindow.min), 10);
          ctx.fillStyle = "#dfe9ff";
          ctx.font = "bold 12px Inter, sans-serif";
          ctx.textAlign = "center";
          const launchPercent = Math.round(launchCharge * 100);
          const launchText = inPerfectWindow ? `Perfect power · ${launchPercent}%` : launchCharge > perfectWindow.max ? `Too much power · ${launchPercent}%` : `Power ${launchPercent}%`;
          ctx.fillText(launchText, launchOrigin.x, launchOrigin.y + 155);
        }

        ctx.restore();
      }

      if (cube) {
        const activeCubeSkin = getCubeSkin();
        drawCubeOverlay(ctx, activeCubeSkin);
        if (!isSpriteCubeSkin(activeCubeSkin)) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cube.position.x, cube.position.y, 26, 0, Math.PI * 2);
          ctx.strokeStyle = getCubeAccentColor();
          ctx.globalAlpha = 0.12;
          ctx.lineWidth = 10;
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();

      if (heroMoments.length) {
        const hero = heroMoments[heroMoments.length - 1];
        const alpha = Math.max(0, hero.life / 50);
        const rise = (1 - alpha) * 22;
        const screenX = render.options.width / 2;
        const screenY = render.options.height * 0.28 - rise;

        ctx.save();
        ctx.textAlign = "center";
        ctx.globalAlpha = alpha;
        ctx.fillStyle = hero.accent;
        ctx.beginPath();
        ctx.roundRect(screenX - 140, screenY - 28, 280, 56, 18);
        ctx.fill();
        ctx.strokeStyle = hero.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.font = "900 30px Inter, sans-serif";
        ctx.fillStyle = hero.color;
        ctx.fillText(hero.text, screenX, screenY + 10);
        ctx.restore();
      }
    });

    Events.on(engine, "collisionStart", function(event) {
      if (gameOver || !isLaunched || isPaused || perkPaused) return;

      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        if (bodyA.label === "cube" || bodyB.label === "cube") {
          const otherBody = bodyA.label === "cube" ? bodyB : bodyA;

          if (otherBody.label === "finish_line") {
            hasWon = true;
            stats.totalWins++;
            queueSave();
            setStatus("Finish Reached", "live");
            triggerGameOver(true);
            return;
          }

          if (otherBody.label.startsWith("stair_")) {
            const effect = otherBody.label.split("_")[1];
            const hitX = otherBody.position.x;
            const hitY = otherBody.position.y;

            const now = performance.now();
            if (recentStairContact.id === otherBody.id && now - recentStairContact.time < 220) {
              continue;
            }
            recentStairContact = { id: otherBody.id, time: now };

            checkAirBonus();

            if (!touchedStairs.has(otherBody.id)) {
              touchedStairs.add(otherBody.id);
              const stepIndex = otherBody.plugin?.index ?? 0;
              if (runStats.lastStepIndex != null) {
                runStats.maxStepSkip = Math.max(runStats.maxStepSkip, Math.max(0, stepIndex - runStats.lastStepIndex - 1));
              }
              runStats.lastStepIndex = stepIndex;
              if (stepIndex === runStats.topStepIndex) runStats.landedTopStep = true;
              if (otherBody.plugin?.goldenTarget || stepIndex === 67) runStats.hitGoldenStep67 = true;
              currentSteps += 1;
              runStats.steps = currentSteps;
              addComboHit(effect === "coin" ? 2 : 1, effect !== "normal", hitX, hitY);
              maybeOpenPerkChoice();
            } else {
              currentScore += 0.25;
            }

            otherBody.plugin.flash = 1;
            spawnBurst(hitX, hitY, effect === "coin" ? "#ffd166" : getEffectColor(), 10, 3.5);
            shake(Math.min(8, 1.5 + Math.abs(cube.velocity.y) * 0.18));

            if (effect !== "normal") hitSpecial(otherBody, effect);
            else setStatus("In Motion", "live");

            updateHud();
          }
        }
      }
    });

    Events.on(engine, "afterUpdate", function() {
      if (gameOver || hasWon || !isLaunched || isPaused || perkPaused) return;

      if (Math.abs(cube.velocity.x) < 0.1 && Math.abs(cube.velocity.y) < 0.1) stationaryFrames++;
      else stationaryFrames = 0;

      const deathThreshold = finishLine ? finishLine.position.y + Math.max(500, height * 0.7) : cube.position.y + 9999;
      if (stationaryFrames > 120 || cube.position.y > deathThreshold) {
        setStatus("Run Failed", "danger");
        triggerGameOver(false);
      }
    });

    Runner.run(runner, engine);
    Render.run(render);
    applyDeviceProfile();
    normalizeUiCopy();
    applyHudTheme();
    setCanvasInput(false);
    updateCoinDisplays();
    updateRecordDisplays();
    updateHud();
    updatePerkActionButtons();
    showMainMenu();

    function handleResize() {
      const viewport = getViewportSize();
      width = viewport.width;
      height = viewport.height;
      deviceProfile = detectDeviceProfile();
      applyDeviceProfile();
      const pixelRatio = getRenderPixelRatio();
      render.canvas.width = width * pixelRatio;
      render.canvas.height = height * pixelRatio;
      render.canvas.style.width = width + 'px';
      render.canvas.style.height = height + 'px';
      render.options.width = width;
      render.options.height = height;
      render.options.pixelRatio = pixelRatio;
      if (cube) {
        focusCameraOnCube();
      }
      updateLegendVisibility();
    }

    window.addEventListener("resize", handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }
  

    Object.assign(window, {
      switchShopTab,
      openModePanel,
      closeModePanel,
      openChallenges,
      closeChallenges,
      openShop,
      closeShop,
      setMode,
      setCubeClass,
      claimChallenge,
      buyCube,
      equipCube,
      buyStair,
      equipStair,
      buyTrail,
      equipTrail,
      buyEffect,
      equipEffect,
      buyUpgrade,
      choosePerk,
      usePerkAction,
      startGame,
      showMainMenu,
      togglePause
    });
