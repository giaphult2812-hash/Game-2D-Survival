    // -------------------------------------------------------------
    // 1. CẤU HÌNH QUY CHUẨN 16x16 & ZOOM CAMERA (Yêu cầu 1, 3, 4)
    // -------------------------------------------------------------
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    // QUY CHUẨN KÍCH THƯỚC LOGIC: 16x16 PIXEL (Yêu cầu 1)
    const TILE_SIZE = 16;

    // HỆ SỐ PHÓNG ĐẠI CAMERA: 3X TRÊN MÁY TÍNH, 2X NGUYÊN TRÊN ĐIỆN THOẠI NGANG
    const CAMERA_ZOOM = 3;

    function isMobileMode() {
      const ua = navigator.userAgent || "";
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
                         (navigator.userAgentData && navigator.userAgentData.mobile === true);
      if (isMobileUA) return true;

      // Nếu thiết bị có chuột (pointer: fine) -> chắc chắn là PC/Laptop, không bật giao diện điện thoại
      const hasFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
      if (hasFinePointer) return false;

      const w = window.innerWidth || document.documentElement.clientWidth || 800;
      const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      const hasTouch = ("ontouchstart" in window || navigator.maxTouchPoints > 0);
      return coarse && hasTouch && w <= 1024;
    }

    function getCameraZoom() {
      const w = window.innerWidth || document.documentElement.clientWidth || 800;
      const h = window.innerHeight || document.documentElement.clientHeight || 600;
      if (isMobileMode() && (h <= 540 || w <= 920)) {
        return 2;
      }
      return CAMERA_ZOOM;
    }

    // Bán kính tương tác hành động chặt cây/đào đá/săn heo (theo chuẩn 16px)
    const INTERACTION_RADIUS = 24;

    // Các phần tử DOM
    const valCurrentMap = document.getElementById("valCurrentMap");
    const valPlayerHP = document.getElementById("valPlayerHP");
    const valPlayerPos = document.getElementById("valPlayerPos");
    const valMobCount = document.getElementById("valMobCount");
    const valObjectCounts = document.getElementById("valObjectCounts");
    const valFPS = document.getElementById("valFPS");
    // const btnBuildForge removed
    const notificationToast = document.getElementById("notificationToast");
    const mobileControlsWrapper = document.getElementById("mobileControlsWrapper");
    const btnAction = document.getElementById("btnAction");
    const loadingScreen = document.getElementById("loadingScreen");
    const loadingText = document.getElementById("loadingText");
    const loadingBar = document.getElementById("loadingBar");

    function syncResponsiveMode() {
      const mobile = isMobileMode();
      const w = window.innerWidth || document.documentElement.clientWidth || 800;
      const h = window.innerHeight || document.documentElement.clientHeight || 600;
      document.body.classList.toggle("is-mobile-ui", mobile);
      document.body.classList.toggle("is-portrait-hint", mobile && w < h);
      if (mobileControlsWrapper) {
        mobileControlsWrapper.style.display = mobile ? "flex" : "none";
      }
    }
    syncResponsiveMode();

    // -------------------------------------------------------------
    // HỆ THỐNG TẢI ẢNH (PRELOAD), BẢN ĐỒ LDTK VÀ TÀI NGUYÊN PIXEL ART
    // -------------------------------------------------------------
    const images = {};
    const assetSources = {
      player: "assets/player.png",
      grass: "assets/Grass.png",
      tree1: "assets/Tree1.png",
      stump1: "assets/Stump 1.png",
      rocks: "assets/Rocks.png",
      boar: "assets/Boar.png",
      chicken: "assets/Chicken.png",
      arrow: "Tiny Swords (Free Pack)/Units/Black Units/Archer/Arrow.png",
      crafting_table: "assets/items/placeables/crafting_table.svg",
      chest: "assets/items/placeables/chest.svg",
      diamond: "assets/items/resources/diamond.png",
      magic_wand: "assets/items/tools_weapons/đũa phép.png",
      fishing_rod: "assets/items/tools_weapons/fishing_rod.svg",
      raw_fish: "assets/items/consumables/raw_fish.svg",
      cooked_fish: "assets/items/consumables/cooked_fish.svg",
      golden_fish: "assets/items/consumables/golden_fish.svg",
      gold_nugget: "assets/items/resources/gold_nugget.png",
      iron_ore: "assets/items/resources/iron_ore.svg",
      coal: "assets/items/resources/coal.svg",
      plant_fiber: "assets/items/resources/plant_fiber.svg",
      // 16 Món Giáp Trang Bị
      helmet_leather: "assets/items/armor_equipment/nón da.png",
      chest_leather: "assets/items/armor_equipment/giáp da.png",
      legs_leather: "assets/items/armor_equipment/quần da.png",
      boots_leather: "assets/items/armor_equipment/giày da.png",
      helmet_iron: "assets/items/armor_equipment/nón sắt.png",
      chest_iron: "assets/items/armor_equipment/giáp sắt.png",
      legs_iron: "assets/items/armor_equipment/quần sắt.png",
      boots_iron: "assets/items/armor_equipment/giày sắt.png",
      helmet_gold: "assets/items/armor_equipment/nón vàng.png",
      chest_gold: "assets/items/armor_equipment/giáp vàng.png",
      legs_gold: "assets/items/armor_equipment/quần vàng.png",
      boots_gold: "assets/items/armor_equipment/giày vàng.png",
      helmet_diamond: "assets/items/armor_equipment/nón kim cương.png",
      chest_diamond: "assets/items/armor_equipment/giáp kim cương.png",
      legs_diamond: "assets/items/armor_equipment/quần kim cương.png",
      boots_diamond: "assets/items/armor_equipment/giày kim cương.png"
    };

    const iconImageCache = new Map();
    function getCachedIconImage(src) {
      if (!src) return null;
      let img = iconImageCache.get(src);
      if (!img) {
        img = new Image();
        img.src = src;
        iconImageCache.set(src, img);
      }
      return img;
    }

    // Dữ liệu bản đồ LDtk (lớp Ground, Water, Rock, Fences, Jungles...)
    let homeMapData = null;
    let forestMapData = null;
    let lakeMapData = null;
    let lakeLandGrid = null;
    const mapTilesetImages = {}; // Lưu trữ ảnh Tileset tải theo __tilesetRelPath

    // Hàm tải và đọc file bản đồ LDtk JSON
    async function loadMapData(mapUrl, isForest = false) {
      try {
        if (loadingText) loadingText.textContent = `Đang tải bản đồ ${mapUrl}...`;
        const response = await fetch(mapUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Trích xuất level đầu tiên và các layerInstances
        const level = (data.levels && data.levels[0]) || data;
        const layerInstances = level.layerInstances || [];

        // Trích xuất kích thước bản đồ tính bằng số ô và pixel
        let mapWidthInTiles = 32;
        let mapHeightInTiles = 32;
        if (layerInstances.length > 0) {
          mapWidthInTiles = layerInstances[0].__cWid || 32;
          mapHeightInTiles = layerInstances[0].__cHei || 32;
        }

        const mapObj = {
          widthInTiles: mapWidthInTiles,
          heightInTiles: mapHeightInTiles,
          pxWid: level.pxWid || mapWidthInTiles * TILE_SIZE,
          pxHei: level.pxHei || mapHeightInTiles * TILE_SIZE,
          layerInstances: layerInstances
        };

        if (isForest === "lake") {
          lakeMapData = mapObj;
          lakeLandGrid = Array.from({ length: mapHeightInTiles }, () => new Array(mapWidthInTiles).fill(false));
          const plainsLayer = layerInstances.find(l => l.__identifier === "Plains");
          if (plainsLayer) {
            const tiles = [...(plainsLayer.autoLayerTiles || []), ...(plainsLayer.gridTiles || [])];
            for (const t of tiles) {
              const tx = Math.floor(t.px[0] / TILE_SIZE);
              const ty = Math.floor(t.px[1] / TILE_SIZE);
              if (ty >= 0 && ty < mapHeightInTiles && tx >= 0 && tx < mapWidthInTiles) {
                lakeLandGrid[ty][tx] = true;
              }
            }
          }
        } else if (isForest) {
          forestMapData = mapObj;
        } else {
          homeMapData = mapObj;
        }

        // Thu thập và nạp trước tất cả các ảnh tileset được khai báo trong __tilesetRelPath
        const tilesetPromises = [];
        function resolveTilesetPath(rawPath) {
          let p = (rawPath || "").replace(/\\/g, "/");
          if (p.startsWith("../")) {
            p = "assets/" + p.slice(3);
          } else if (!p.startsWith("assets/") && !p.startsWith("/")) {
            p = "assets/" + p;
          }
          return p;
        }

        layerInstances.forEach((layer) => {
          if (layer.__tilesetRelPath) {
            const relPath = resolveTilesetPath(layer.__tilesetRelPath);
            if (!mapTilesetImages[relPath]) {
              const p = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                  mapTilesetImages[relPath] = img;
                  resolve(img);
                };
                img.onerror = () => {
                  console.warn(`[Map Tileset] Không tải được tileset: ${relPath}`);
                  mapTilesetImages[relPath] = null;
                  resolve(null);
                };
                img.src = relPath;
              });
              mapTilesetImages[relPath] = true; // Đánh dấu đang tải
              tilesetPromises.push(p);
            }
          }
        });

        await Promise.all(tilesetPromises);
        console.log(`[LDtk Map] Đã nạp thành công bản đồ ${mapUrl}: ${mapWidthInTiles}x${mapHeightInTiles} ô`);
        return mapObj;
      } catch (err) {
        console.error(`[LDtk Map] Lỗi khi tải map JSON (${mapUrl}):`, err);
        return null;
      }
    }

    const mapCanvasCache = {};

    function getCachedMapCanvas(mapObj, mapName) {
      if (mapCanvasCache[mapName]) return mapCanvasCache[mapName];
      if (!mapObj || !mapObj.layerInstances) return null;

      const offscreen = document.createElement("canvas");
      offscreen.width = mapObj.pxWid || (mapObj.widthInTiles * TILE_SIZE);
      offscreen.height = mapObj.pxHei || (mapObj.heightInTiles * TILE_SIZE);
      const octx = offscreen.getContext("2d");
      octx.imageSmoothingEnabled = false;

      const layers = mapObj.layerInstances;
      const renderLayers = layers.slice().reverse();

      renderLayers.forEach((layer) => {
        const gridSize = layer.__gridSize || TILE_SIZE;
        let relPath = (layer.__tilesetRelPath || "").replace(/\\/g, "/");
        if (relPath.startsWith("../")) {
          relPath = "assets/" + relPath.slice(3);
        } else if (!relPath.startsWith("assets/") && !relPath.startsWith("/")) {
          relPath = "assets/" + relPath;
        }
        const tilesetImg = mapTilesetImages[relPath];

        if (layer.autoLayerTiles && layer.autoLayerTiles.length > 0) {
          layer.autoLayerTiles.forEach((tile) => {
            const dx = tile.px[0];
            const dy = tile.px[1];
            const sx = tile.src[0];
            const sy = tile.src[1];
            const flip = tile.f || 0;
            const opacity = tile.a !== undefined ? tile.a : 1;

            if (tilesetImg && tilesetImg.naturalWidth > 0) {
              octx.save();
              if (opacity < 1) octx.globalAlpha = opacity;
              if (flip === 0) {
                octx.drawImage(tilesetImg, sx, sy, gridSize, gridSize, dx, dy, gridSize, gridSize);
              } else {
                octx.translate(dx + gridSize / 2, dy + gridSize / 2);
                const scaleX = (flip & 1) ? -1 : 1;
                const scaleY = (flip & 2) ? -1 : 1;
                octx.scale(scaleX, scaleY);
                octx.drawImage(tilesetImg, sx, sy, gridSize, gridSize, -gridSize / 2, -gridSize / 2, gridSize, gridSize);
              }
              octx.restore();
            } else {
              octx.fillStyle = layer.__identifier === "Water" ? "#38bdf8" : (layer.__identifier === "Fences" ? "#b45309" : "#4ade80");
              octx.fillRect(dx, dy, gridSize, gridSize);
            }
          });
        } else if (layer.intGridCsv && layer.intGridCsv.length > 0) {
          const cWid = layer.__cWid || mapObj.widthInTiles;
          for (let i = 0; i < layer.intGridCsv.length; i++) {
            if (layer.intGridCsv[i] > 0) {
              const col = i % cWid;
              const row = Math.floor(i / cWid);
              const dx = col * gridSize;
              const dy = row * gridSize;
              if (tilesetImg && tilesetImg.naturalWidth > 0) {
                octx.drawImage(tilesetImg, 0, 0, gridSize, gridSize, dx, dy, gridSize, gridSize);
              } else {
                octx.fillStyle = layer.__identifier === "Water" ? "#38bdf8" : (layer.__identifier === "Fences" ? "#b45309" : "#4ade80");
                octx.fillRect(dx, dy, gridSize, gridSize);
              }
            }
          }
        }
      });

      mapCanvasCache[mapName] = offscreen;
      return offscreen;
    }

    function drawMap(ctx, mapDataToDraw) {
      const mapName = mapDataToDraw ? "custom" : currentMap;
      const activeMap = mapDataToDraw || (currentMap === "lake" ? lakeMapData : (currentMap === "forest" ? forestMapData : homeMapData));
      if (!activeMap) return;

      const cached = getCachedMapCanvas(activeMap, mapName);
      if (cached) {
        ctx.drawImage(cached, 0, 0);
      }
    }

    function preloadImages(callback) {
      const keys = Object.keys(assetSources);
      let loadedCount = 0;
      const total = keys.length;
      let finished = false;

      function stepDone(key, success) {
        if (finished) return;
        loadedCount++;
        const pct = Math.round((loadedCount / total) * 100);
        if (loadingBar) loadingBar.style.width = pct + "%";
        if (loadingText) loadingText.textContent = `Đang tải: ${key} (${loadedCount}/${total})...`;
        if (loadedCount >= total) {
          finished = true;
          onAllAssetsLoaded(callback);
        }
      }

      // Đặt timeout an toàn 2 giây: Nếu vì bất kỳ lý do gì ảnh bị treo, game vẫn tự động vào ngay!
      const safetyTimeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          console.warn("[Assets] Timeout tải ảnh, buộc vào game!");
          onAllAssetsLoaded(callback);
        }
      }, 2000);

      keys.forEach((key) => {
        const img = new Image();
        img.onload = () => {
          images[key] = img;
          stepDone(key, true);
        };
        img.onerror = () => {
          console.warn(`[Assets] Không tải được: ${assetSources[key]}`);
          images[key] = null;
          stepDone(key, false);
        };
        img.src = assetSources[key];
      });
    }

    function onAllAssetsLoaded(callback) {
      if (loadingText) loadingText.textContent = "Khởi tạo thế giới Pixel...";
      setTimeout(() => {
        if (loadingScreen) {
          loadingScreen.style.opacity = "0";
          loadingScreen.style.transition = "opacity 0.3s ease";
          setTimeout(() => {
            loadingScreen.style.display = "none";
          }, 300);
        }
        if (callback) callback();
      }, 200);
    }

    // -------------------------------------------------------------
    // THIẾT LẬP KHỬ RĂNG CƯA (PIXEL PERFECT) (Yêu cầu 4)
    // Bắt buộc tắt imageSmoothingEnabled để hình ảnh pixel không bị mờ nhòe
    // -------------------------------------------------------------
    function applyPixelPerfectSettings() {
      ctx.imageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
    }

    let needsCanvasRedraw = true;
    let lastRenderedPausedState = false;

    function updateCanvasSize() {
      const w = Math.max(1, Math.round(document.documentElement.clientWidth || window.innerWidth || 800));
      const h = Math.max(1, Math.round(document.documentElement.clientHeight || window.innerHeight || 600));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        // Bắt buộc gọi lại sau mỗi lần gán lại kích thước Canvas (Yêu cầu 4)
        applyPixelPerfectSettings();
        needsCanvasRedraw = true;
      }
      syncResponsiveMode();
    }
    window.addEventListener("resize", updateCanvasSize);
    window.addEventListener("orientationchange", () => setTimeout(updateCanvasSize, 80));
    updateCanvasSize();

    // Hàm vẽ hình hộp bo góc an toàn tuyệt đối
    function drawRoundedBox(context, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) {
      context.save();
      context.beginPath();
      if (typeof context.roundRect === "function") {
        context.roundRect(x, y, width, height, radius);
      } else {
        const r = Math.min(radius, width / 2, height / 2);
        context.moveTo(x + r, y);
        context.arcTo(x + width, y, x + width, y + height, r);
        context.arcTo(x + width, y + height, x, y + height, r);
        context.arcTo(x, y + height, x, y, r);
        context.arcTo(x, y, x + width, y, r);
        context.closePath();
      }
      if (fillStyle) {
        context.fillStyle = fillStyle;
        context.fill();
      }
      if (strokeStyle) {
        context.strokeStyle = strokeStyle;
        context.lineWidth = lineWidth;
        context.stroke();
      }
      context.restore();
    }

    // -------------------------------------------------------------
    // HỆ THỐNG CÀI ĐẶT, CHỈ SỐ SINH VẬT & HIỆU ỨNG CHIẾN ĐẤU (STATS & FX)
    // -------------------------------------------------------------
    // 1. BỘ CHỈ SỐ MẶC ĐỊNH CHO TỪNG SINH VẬT
    const defaultStats = {
      player: {
        maxHp: 150,          // Máu mặc định: 150 HP (3 chữ số)
        baseArmor: 50,       // Giáp mặc định: 50 Giáp
        speed: 65,           // Tốc chạy mặc định: 65 px/s (2 chữ số)
        attackDamage: 10,    // Sức mạnh đánh tay không: 10 DMG (2 chữ số)
        attackAnimSpeed: 0.08,
        attackCooldown: 1.0
      },
      boar: {
        maxHp: 60,           // Máu mặc định: 60 HP
        speed: 42,
        attackDamage: 18,    // Sức mạnh húc: 18 DMG (cân bằng với 150 HP + 50 Giáp)
        attackInterval: 1.2
      },
      chicken: {
        maxHp: 25,           // Máu mặc định: 25 HP
        speed: 34,
        fleeSpeed: 68,
        attackDamage: 0
      }
    };

    // 2. CẤU HÌNH HIỆU ỨNG CHIẾN ĐẤU (ĐÃ GIẢM ĐỘ GIẬT & RUNG NHẸ NHÀNG)
    const combatFxConfig = {
      hitFlash: true,
      hitFlashDuration: 0.08,  // ~80ms rõ hiệu ứng trắng xóa
      impactSound: true,
      soundVolume: 0.8,
      hitParticles: true,
      sparkCount: 12,
      knockback: true,
      knockbackDistance: 18,   // Đẩy heo lùi 18px để tách xa người chơi
      playerRecoil: 1.5,       // Giảm độ giật bật lùi của nhân vật xuống 1.5px (nhẹ nhàng, không giật cục)
      screenShake: true,
      hitStopDuration: 0.06,   // Giảm hit-stop xuống 60ms cho chuyển động êm hơn
      shakeIntensity: 3,       // Giảm độ rung camera xuống 3 (êm ái hơn)
      deathPop: true,
      debrisCount: 20
    };

    const DEFAULT_GRAVITY_FX_CONFIG = {
      step1Enabled: true,
      warnDuration: 0.50,
      warnRadius: 22,
      warnRotateSpeed: 1.2,

      step2Enabled: true,
      beamDuration: 0.16,
      beamWidth: 16,
      streakCount: 10,

      step3Enabled: true,
      force: 1.0,
      squashScaleY: 55,
      squashSpreadX: 1.45,
      squashDuration: 0.45,
      damage: 8,
      overcrushThreshold: 1.6,

      step4Enabled: true,
      craterRadius: 20,
      crackCount: 7,
      debrisCount: 12,
      craterDuration: 3.5,

      step5Enabled: true,
      hitStopFrames: 3,
      shakeIntensity: 9,
      shakeDuration: 0.28,
      shockwaveRadius: 46
    };

    const gravityFxConfig = { ...DEFAULT_GRAVITY_FX_CONFIG };

    const DEFAULT_WOOD_FX_CONFIG = {
      step1Enabled: true,
      waveHeight: 28,
      waveSpeed: 240,
      waveFrequency: 2.2,

      step2Enabled: true,
      branchCount: 4,
      branchSpread: 32,
      staggerDelay: 0.05,

      step3Enabled: true,
      craterRadius: 16,
      rockCount: 6,
      dustDensity: 10,

      step4Enabled: true,
      leafCount: 12,
      leafSize: 4,
      bloomSpeed: 8.0,

      step5Enabled: true,
      coilRings: 3,
      squeezingForce: 12,
      sleepChance: 0.40,
      sleepDuration: 3.5,
      shakeIntensity: 7,
      shakeDuration: 0.25,
      damage: 12
    };

    const woodFxConfig = { ...DEFAULT_WOOD_FX_CONFIG };

    const DEFAULT_TIMESTOP_FX_CONFIG = {
      step1Enabled: true,
      clockRadius: 60,
      handSpeed: 3.5,
      glowColor: "#38bdf8",

      step2Enabled: true,
      slowDuration: 0.50,
      timeScaleMin: 0.00,

      step3Enabled: true,
      waveSpeed: 320,
      desaturatePct: 100,

      step4Enabled: true,
      debrisCount: 22,
      glitterRate: 0.12,

      step5Enabled: true,
      duration: 3.5,
      resumeExplosionDamage: 25,
      knockbackForce: 130,
      shakeIntensity: 12
    };

    const timestopFxConfig = { ...DEFAULT_TIMESTOP_FX_CONFIG };

    // DOM Binding cho Panel Cài đặt hiệu ứng chiến đấu & Giao diện
    const combatFxSettingsBtn = document.getElementById("combatFxSettingsBtn");
    const combatFxPanel = document.getElementById("combatFxPanel");
    const closeCombatFxPanel = document.getElementById("closeCombatFxPanel");
    const minimapOverlay = document.getElementById("minimapOverlay");
    const minimapCanvas = document.getElementById("minimapCanvas");
    const minimapCtx = minimapCanvas ? minimapCanvas.getContext("2d") : null;
    const minimapTitleEl = document.getElementById("minimapTitle");
    const minimapCoordsEl = document.getElementById("minimapCoords");
    const cfgMinimap = document.getElementById("cfgMinimap");

    let isMinimapEnabled = true;
    try {
      const savedMinimap = localStorage.getItem("game_cfg_minimap");
      if (savedMinimap === "false") isMinimapEnabled = false;
    } catch (_) {}

    function setMinimapEnabled(enabled) {
      isMinimapEnabled = Boolean(enabled);
      if (cfgMinimap) cfgMinimap.checked = isMinimapEnabled;
      if (minimapOverlay) minimapOverlay.style.display = isMinimapEnabled ? "flex" : "none";
      try {
        localStorage.setItem("game_cfg_minimap", isMinimapEnabled ? "true" : "false");
      } catch (_) {}
    }
    setMinimapEnabled(isMinimapEnabled);

    if (cfgMinimap) {
      cfgMinimap.addEventListener("change", (e) => {
        setMinimapEnabled(e.target.checked);
      });
    }

    function switchCombatFxTab(tabName) {
      const tabBtns = document.querySelectorAll(".fx-tab-btn");
      tabBtns.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.fxTab === tabName);
      });
      const genPane = document.getElementById("fxTabGeneral");
      const gravPane = document.getElementById("fxTabGravity");
      const woodPane = document.getElementById("fxTabWood");
      const timestopPane = document.getElementById("fxTabTimestop");
      if (genPane) genPane.style.display = tabName === "general" ? "block" : "none";
      if (gravPane) gravPane.style.display = tabName === "gravity" ? "block" : "none";
      if (woodPane) woodPane.style.display = tabName === "wood" ? "block" : "none";
      if (timestopPane) timestopPane.style.display = tabName === "timestop" ? "block" : "none";
    }

    const GRAVITY_STEP_GROUPS = [
      {
        step: 1,
        checkProp: "step1Enabled",
        title: "1. Vòng báo (tím xoay)",
        summary: (cfg) => `${cfg.warnDuration.toFixed(2)}s • ${Math.round(cfg.warnRadius)}px`,
        params: [
          { prop: "warnDuration", label: "Thời gian báo (s):", min: 0.15, max: 1.50, step: 0.05, unit: "s", decimals: 2 },
          { prop: "warnRadius", label: "Bán kính vòng (px):", min: 14, max: 44, step: 1, unit: "px", decimals: 0 },
          { prop: "warnRotateSpeed", label: "Tốc độ xoay:", min: 0.2, max: 4.0, step: 0.1, unit: "", decimals: 1 }
        ]
      },
      {
        step: 2,
        checkProp: "step2Enabled",
        title: "2. Vệt đổ xuống (cột + tia)",
        summary: (cfg) => `${cfg.beamDuration.toFixed(2)}s • ${Math.round(cfg.streakCount)} tia`,
        params: [
          { prop: "beamDuration", label: "Thời gian đổ (s):", min: 0.06, max: 0.45, step: 0.02, unit: "s", decimals: 2 },
          { prop: "beamWidth", label: "Độ rộng cột (px):", min: 8, max: 36, step: 1, unit: "px", decimals: 0 },
          { prop: "streakCount", label: "Số vệt mảnh:", min: 2, max: 24, step: 1, unit: "", decimals: 0 }
        ]
      },
      {
        step: 3,
        checkProp: "step3Enabled",
        title: "3. Đè bẹp & bật lại",
        summary: (cfg) => `${cfg.force.toFixed(1)}x • ${Math.round(cfg.squashScaleY)}%`,
        params: [
          { prop: "force", label: "Lực đè (Force):", min: 0.5, max: 3.0, step: 0.1, unit: "x", decimals: 1 },
          { prop: "squashScaleY", label: "Chiều cao đè (%):", min: 20, max: 85, step: 1, unit: "%", decimals: 0 },
          { prop: "squashSpreadX", label: "Bè ngang (X):", min: 1.10, max: 2.20, step: 0.05, unit: "x", decimals: 2 },
          { prop: "squashDuration", label: "Thời gian đè (s):", min: 0.15, max: 1.00, step: 0.05, unit: "s", decimals: 2 },
          { prop: "damage", label: "Sát thương:", min: 2, max: 40, step: 1, unit: " DMG", decimals: 0 },
          { prop: "overcrushThreshold", label: "Ngưỡng tờ giấy:", min: 1.1, max: 2.8, step: 0.1, unit: "x", decimals: 1 }
        ]
      },
      {
        step: 4,
        checkProp: "step4Enabled",
        title: "4. Đất lún, nứt & đá văng",
        summary: (cfg) => `${Math.round(cfg.craterRadius)}px • ${Math.round(cfg.debrisCount)} đá`,
        params: [
          { prop: "craterRadius", label: "Bán kính hố (px):", min: 10, max: 40, step: 1, unit: "px", decimals: 0 },
          { prop: "crackCount", label: "Số vết nứt tia:", min: 3, max: 14, step: 1, unit: "", decimals: 0 },
          { prop: "debrisCount", label: "Số đá vụn văng:", min: 0, max: 30, step: 1, unit: "", decimals: 0 },
          { prop: "craterDuration", label: "Hố tồn tại (s):", min: 1.0, max: 10.0, step: 0.5, unit: "s", decimals: 1 }
        ]
      },
      {
        step: 5,
        checkProp: "step5Enabled",
        title: "5. Dừng hình, lắc & sóng",
        summary: (cfg) => `${Math.round(cfg.hitStopFrames)}f • Lắc ${Math.round(cfg.shakeIntensity)}`,
        params: [
          { prop: "hitStopFrames", label: "Dừng hình (frame):", min: 0, max: 10, step: 1, unit: "f", decimals: 0 },
          { prop: "shakeIntensity", label: "Cường độ lắc:", min: 1, max: 20, step: 1, unit: "", decimals: 0 },
          { prop: "shakeDuration", label: "Thời gian lắc (s):", min: 0.10, max: 0.60, step: 0.02, unit: "s", decimals: 2 },
          { prop: "shockwaveRadius", label: "Bán kính sóng (px):", min: 20, max: 90, step: 2, unit: "px", decimals: 0 }
        ]
      }
    ];

    function syncGravityFxControlsFromConfig() {
      document.querySelectorAll("input[data-grav-check]").forEach((cb) => {
        const prop = cb.dataset.gravCheck;
        if (!prop) return;
        const enabled = Boolean(gravityFxConfig[prop]);
        cb.checked = enabled;
        const item = cb.closest(".grav-step-item");
        if (item) item.classList.toggle("is-disabled", !enabled);
      });

      document.querySelectorAll("input[data-grav-prop]").forEach((slider) => {
        const prop = slider.dataset.gravProp;
        const unit = slider.dataset.gravUnit || "";
        const decimals = Number(slider.dataset.gravDecimals || 0);
        const val = Number(gravityFxConfig[prop]);
        slider.value = String(val);
        const valSpan = slider.parentElement ? slider.parentElement.querySelector(".grav-val-lbl") : null;
        if (valSpan) {
          valSpan.textContent = (decimals > 0 ? val.toFixed(decimals) : Math.round(val)) + unit;
        }
      });

      document.querySelectorAll("[data-grav-summary]").forEach((el) => {
        const stepNum = Number(el.dataset.gravSummary);
        const grp = GRAVITY_STEP_GROUPS.find((g) => g.step === stepNum);
        if (grp) el.textContent = grp.summary(gravityFxConfig);
      });
    }

    function mountGravityStepAccordion(containerEl) {
      if (!containerEl) return;
      containerEl.innerHTML = "";

      GRAVITY_STEP_GROUPS.forEach((grp, idx) => {
        const item = document.createElement("div");
        item.className = "grav-step-item" + (idx === 0 ? " is-open" : "");

        const header = document.createElement("div");
        header.className = "grav-step-header";

        const label = document.createElement("label");
        label.className = "grav-step-toggle-label";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.gravCheck = grp.checkProp;
        checkbox.checked = Boolean(gravityFxConfig[grp.checkProp]);
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          gravityFxConfig[grp.checkProp] = e.target.checked;
          syncGravityFxControlsFromConfig();
        });
        const titleSpan = document.createElement("span");
        titleSpan.textContent = grp.title;
        label.appendChild(checkbox);
        label.appendChild(titleSpan);

        const meta = document.createElement("div");
        meta.className = "grav-step-meta";
        const summarySpan = document.createElement("span");
        summarySpan.dataset.gravSummary = String(grp.step);
        summarySpan.textContent = grp.summary(gravityFxConfig);
        const chevron = document.createElement("span");
        chevron.className = "grav-step-chevron";
        chevron.textContent = "▾";
        meta.appendChild(summarySpan);
        meta.appendChild(chevron);

        header.appendChild(label);
        header.appendChild(meta);
        header.addEventListener("click", (e) => {
          if (e.target === checkbox) return;
          const willOpen = !item.classList.contains("is-open");
          containerEl.querySelectorAll(".grav-step-item").forEach((other) => {
            other.classList.remove("is-open");
          });
          if (willOpen) item.classList.add("is-open");
        });

        const body = document.createElement("div");
        body.className = "grav-step-body";

        grp.params.forEach((p) => {
          const row = document.createElement("div");
          row.className = "fx-param-row";

          const lbl = document.createElement("span");
          lbl.textContent = p.label;

          const slider = document.createElement("input");
          slider.type = "range";
          slider.min = String(p.min);
          slider.max = String(p.max);
          slider.step = String(p.step);
          slider.value = String(gravityFxConfig[p.prop]);
          slider.dataset.gravProp = p.prop;
          slider.dataset.gravUnit = p.unit;
          slider.dataset.gravDecimals = String(p.decimals);

          const valSpan = document.createElement("span");
          valSpan.className = "grav-val-lbl";

          slider.addEventListener("input", (e) => {
            gravityFxConfig[p.prop] = parseFloat(e.target.value);
            syncGravityFxControlsFromConfig();
          });

          row.appendChild(lbl);
          row.appendChild(slider);
          row.appendChild(valSpan);
          body.appendChild(row);
        });

        item.appendChild(header);
        item.appendChild(body);
        containerEl.appendChild(item);
      });
    }

    function resetGravityFxConfigDefaults() {
      Object.assign(gravityFxConfig, DEFAULT_GRAVITY_FX_CONFIG);
      syncGravityFxControlsFromConfig();
      addFloatingText("↺ Đã khôi phục Trọng Lực mặc định", player.x - 24, player.y - 16, "#e9d5ff");
    }

    function applyGravityOvercrushPreset() {
      gravityFxConfig.force = 2.4;
      gravityFxConfig.overcrushThreshold = 1.6;
      gravityFxConfig.shakeIntensity = 13;
      gravityFxConfig.damage = 14;
      syncGravityFxControlsFromConfig();
      addFloatingText("📄 Bật chế độ Ép Quá Mạnh!", player.x - 24, player.y - 16, "#f0abfc");
    }

    function openGravityFxSettings() {
      if (!combatFxPanel) return;
      combatFxPanel.style.display = "block";
      switchCombatFxTab("gravity");
    }

    // Ngăn chặn sự kiện phím khi đang nhập liệu hoặc thao tác trên Panel
    if (combatFxPanel) {
      combatFxPanel.addEventListener("keydown", (e) => e.stopPropagation());
      combatFxPanel.addEventListener("keyup", (e) => e.stopPropagation());
    }

    mountGravityStepAccordion(document.getElementById("fxGravityAccordion"));
    syncGravityFxControlsFromConfig();

    const WOOD_STEP_GROUPS = [
      {
        step: 1,
        checkProp: "step1Enabled",
        title: "1. Uốn sóng (thân gỗ vòng cung)",
        summary: (cfg) => `${Math.round(cfg.waveHeight)}px • ${cfg.waveFrequency.toFixed(1)}Hz`,
        params: [
          { prop: "waveHeight", label: "Độ cao sóng (px):", min: 10, max: 60, step: 2, unit: "px", decimals: 0 },
          { prop: "waveSpeed", label: "Tốc độ lan (px/s):", min: 100, max: 400, step: 10, unit: "", decimals: 0 },
          { prop: "waveFrequency", label: "Tần số sóng:", min: 1.0, max: 4.0, step: 0.2, unit: "", decimals: 1 }
        ]
      },
      {
        step: 2,
        checkProp: "step2Enabled",
        title: "2. Nhiều nhánh (3-4 thân lệch nhịp)",
        summary: (cfg) => `${Math.round(cfg.branchCount)} nhánh • ${cfg.staggerDelay.toFixed(2)}s`,
        params: [
          { prop: "branchCount", label: "Số nhánh gỗ:", min: 1, max: 6, step: 1, unit: "", decimals: 0 },
          { prop: "branchSpread", label: "Độ tỏa nhánh (px):", min: 10, max: 60, step: 2, unit: "px", decimals: 0 },
          { prop: "staggerDelay", label: "Lệch nhịp (s):", min: 0.01, max: 0.15, step: 0.01, unit: "s", decimals: 2 }
        ]
      },
      {
        step: 3,
        checkProp: "step3Enabled",
        title: "3. Đất vỡ (vết nứt, đá & bụi)",
        summary: (cfg) => `${Math.round(cfg.craterRadius)}px • ${Math.round(cfg.rockCount)} đá`,
        params: [
          { prop: "craterRadius", label: "Bán kính nứt (px):", min: 10, max: 35, step: 1, unit: "px", decimals: 0 },
          { prop: "rockCount", label: "Số đá văng:", min: 2, max: 14, step: 1, unit: "", decimals: 0 },
          { prop: "dustDensity", label: "Hạt bụi đất:", min: 4, max: 24, step: 2, unit: "", decimals: 0 }
        ]
      },
      {
        step: 4,
        checkProp: "step4Enabled",
        title: "4. Lá mọc (bung nở lá tươi)",
        summary: (cfg) => `${Math.round(cfg.leafCount)} lá • ${cfg.bloomSpeed.toFixed(1)}x`,
        params: [
          { prop: "leafCount", label: "Số lượng lá:", min: 4, max: 24, step: 2, unit: "", decimals: 0 },
          { prop: "leafSize", label: "Kích thước lá (px):", min: 2, max: 8, step: 1, unit: "px", decimals: 0 },
          { prop: "bloomSpeed", label: "Tốc độ bung nở:", min: 2.0, max: 15.0, step: 0.5, unit: "x", decimals: 1 }
        ]
      },
      {
        step: 5,
        checkProp: "step5Enabled",
        title: "5. Quấn chặt & Phấn hoa ngủ",
        summary: (cfg) => `${Math.round(cfg.coilRings)} vòng • Ngủ ${cfg.sleepDuration.toFixed(1)}s`,
        params: [
          { prop: "coilRings", label: "Vòng xoắn quấn:", min: 1, max: 6, step: 1, unit: "", decimals: 0 },
          { prop: "squeezingForce", label: "Lực siết chặt:", min: 4, max: 30, step: 2, unit: " DMG", decimals: 0 },
          { prop: "sleepChance", label: "Tỷ lệ phấn ngủ:", min: 0.1, max: 1.0, step: 0.1, unit: "", decimals: 1 },
          { prop: "sleepDuration", label: "Thời gian ngủ (s):", min: 1.0, max: 8.0, step: 0.5, unit: "s", decimals: 1 },
          { prop: "shakeIntensity", label: "Cường độ rung:", min: 2, max: 16, step: 1, unit: "", decimals: 0 }
        ]
      }
    ];

    function syncWoodFxControlsFromConfig() {
      document.querySelectorAll("input[data-wood-check]").forEach((cb) => {
        const prop = cb.dataset.woodCheck;
        if (!prop) return;
        const enabled = Boolean(woodFxConfig[prop]);
        cb.checked = enabled;
        const item = cb.closest(".grav-step-item");
        if (item) item.classList.toggle("is-disabled", !enabled);
      });

      document.querySelectorAll("input[data-wood-prop]").forEach((slider) => {
        const prop = slider.dataset.woodProp;
        const unit = slider.dataset.woodUnit || "";
        const decimals = Number(slider.dataset.woodDecimals || 0);
        const val = Number(woodFxConfig[prop]);
        slider.value = String(val);
        const valSpan = slider.parentElement ? slider.parentElement.querySelector(".grav-val-lbl") : null;
        if (valSpan) {
          valSpan.textContent = (decimals > 0 ? val.toFixed(decimals) : Math.round(val)) + unit;
        }
      });

      document.querySelectorAll("[data-wood-summary]").forEach((el) => {
        const stepNum = Number(el.dataset.woodSummary);
        const grp = WOOD_STEP_GROUPS.find((g) => g.step === stepNum);
        if (grp) el.textContent = grp.summary(woodFxConfig);
      });
    }

    function mountWoodStepAccordion(containerEl) {
      if (!containerEl) return;
      containerEl.innerHTML = "";

      WOOD_STEP_GROUPS.forEach((grp, idx) => {
        const item = document.createElement("div");
        item.className = "grav-step-item" + (idx === 0 ? " is-open" : "");

        const header = document.createElement("div");
        header.className = "grav-step-header";

        const label = document.createElement("label");
        label.className = "grav-step-toggle-label";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.woodCheck = grp.checkProp;
        checkbox.checked = Boolean(woodFxConfig[grp.checkProp]);
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          woodFxConfig[grp.checkProp] = e.target.checked;
          syncWoodFxControlsFromConfig();
        });
        const titleSpan = document.createElement("span");
        titleSpan.textContent = grp.title;
        label.appendChild(checkbox);
        label.appendChild(titleSpan);

        const meta = document.createElement("div");
        meta.className = "grav-step-meta";
        const summarySpan = document.createElement("span");
        summarySpan.dataset.woodSummary = String(grp.step);
        summarySpan.textContent = grp.summary(woodFxConfig);
        const chevron = document.createElement("span");
        chevron.className = "grav-step-chevron";
        chevron.textContent = "▾";
        meta.appendChild(summarySpan);
        meta.appendChild(chevron);

        header.appendChild(label);
        header.appendChild(meta);
        header.addEventListener("click", (e) => {
          if (e.target === checkbox) return;
          const willOpen = !item.classList.contains("is-open");
          containerEl.querySelectorAll(".grav-step-item").forEach((other) => {
            other.classList.remove("is-open");
          });
          if (willOpen) item.classList.add("is-open");
        });

        const body = document.createElement("div");
        body.className = "grav-step-body";

        grp.params.forEach((p) => {
          const row = document.createElement("div");
          row.className = "fx-param-row";

          const lbl = document.createElement("span");
          lbl.textContent = p.label;

          const slider = document.createElement("input");
          slider.type = "range";
          slider.min = String(p.min);
          slider.max = String(p.max);
          slider.step = String(p.step);
          slider.value = String(woodFxConfig[p.prop]);
          slider.dataset.woodProp = p.prop;
          slider.dataset.woodUnit = p.unit;
          slider.dataset.woodDecimals = String(p.decimals);

          const valSpan = document.createElement("span");
          valSpan.className = "grav-val-lbl";

          slider.addEventListener("input", (e) => {
            woodFxConfig[p.prop] = parseFloat(e.target.value);
            syncWoodFxControlsFromConfig();
          });

          row.appendChild(lbl);
          row.appendChild(slider);
          row.appendChild(valSpan);
          body.appendChild(row);
        });

        item.appendChild(header);
        item.appendChild(body);
        containerEl.appendChild(item);
      });
    }

    function resetWoodFxConfigDefaults() {
      Object.assign(woodFxConfig, DEFAULT_WOOD_FX_CONFIG);
      syncWoodFxControlsFromConfig();
      addFloatingText("↺ Đã khôi phục Mộc Độn mặc định", player.x - 24, player.y - 16, "#86efac");
    }

    function applyWoodPreset() {
      woodFxConfig.step1Enabled = true;
      woodFxConfig.step2Enabled = true;
      woodFxConfig.step3Enabled = true;
      woodFxConfig.step4Enabled = true;
      woodFxConfig.step5Enabled = true;
      woodFxConfig.branchCount = 5;
      woodFxConfig.sleepChance = 0.85;
      syncWoodFxControlsFromConfig();
      addFloatingText("🌲 Rừng Thiêng Xanh Thẳm Tối Đa!", player.x - 24, player.y - 16, "#22c55e");
    }

    mountWoodStepAccordion(document.getElementById("fxWoodAccordion"));
    syncWoodFxControlsFromConfig();

    const btnWoodReset = document.getElementById("btnWoodReset");
    if (btnWoodReset) btnWoodReset.addEventListener("click", resetWoodFxConfigDefaults);

    const btnWoodPreset = document.getElementById("btnWoodPreset");
    if (btnWoodPreset) btnWoodPreset.addEventListener("click", applyWoodPreset);

    const TIMESTOP_STEP_GROUPS = [
      {
        step: 1,
        checkProp: "step1Enabled",
        title: "1. Vòng đồng hồ (mặt sáng & kim dừng)",
        summary: (cfg) => `${Math.round(cfg.clockRadius)}px • ${cfg.handSpeed.toFixed(1)}x`,
        params: [
          { prop: "clockRadius", label: "Bán kính đồng hồ (px):", min: 28, max: 120, step: 2, unit: "px", decimals: 0 },
          { prop: "handSpeed", label: "Tốc độ kim ban đầu:", min: 1.0, max: 8.0, step: 0.5, unit: "x", decimals: 1 }
        ]
      },
      {
        step: 2,
        checkProp: "step2Enabled",
        title: "2. Chậm dần (tốc độ 1 → 0 ease-out)",
        summary: (cfg) => `${cfg.slowDuration.toFixed(2)}s → ${cfg.timeScaleMin.toFixed(2)}x`,
        params: [
          { prop: "slowDuration", label: "Thời gian chậm dần (s):", min: 0.15, max: 1.50, step: 0.05, unit: "s", decimals: 2 },
          { prop: "timeScaleMin", label: "Tốc độ tối thiểu:", min: 0.00, max: 0.30, step: 0.02, unit: "x", decimals: 2 }
        ]
      },
      {
        step: 3,
        checkProp: "step3Enabled",
        title: "3. Mất màu (sóng xám giữ màu bản thân)",
        summary: (cfg) => `${Math.round(cfg.waveSpeed)}px/s • ${Math.round(cfg.desaturatePct)}%`,
        params: [
          { prop: "waveSpeed", label: "Tốc độ vòng sóng:", min: 120, max: 600, step: 20, unit: "px/s", decimals: 0 },
          { prop: "desaturatePct", label: "Độ mất màu (%):", min: 20, max: 100, step: 5, unit: "%", decimals: 0 }
        ]
      },
      {
        step: 4,
        checkProp: "step4Enabled",
        title: "4. Lơ lửng (bụi đá lấp lánh giữa không)",
        summary: (cfg) => `${Math.round(cfg.debrisCount)} mảnh • ${cfg.glitterRate.toFixed(2)}s`,
        params: [
          { prop: "debrisCount", label: "Số bụi đá lơ lửng:", min: 6, max: 48, step: 2, unit: "", decimals: 0 },
          { prop: "glitterRate", label: "Nhịp lấp lánh (s):", min: 0.04, max: 0.30, step: 0.02, unit: "s", decimals: 2 }
        ]
      },
      {
        step: 5,
        checkProp: "step5Enabled",
        title: "5. Dồn đòn & Bung nổ thời gian",
        summary: (cfg) => `${cfg.duration.toFixed(1)}s • +${Math.round(cfg.resumeExplosionDamage)} DMG • Lực ${Math.round(cfg.knockbackForce)}`,
        params: [
          { prop: "duration", label: "Thời gian ngưng đọng (s):", min: 1.5, max: 8.0, step: 0.5, unit: "s", decimals: 1 },
          { prop: "resumeExplosionDamage", label: "Sát thương bùng nổ:", min: 0, max: 60, step: 2, unit: " DMG", decimals: 0 },
          { prop: "knockbackForce", label: "Lực hất văng khi chạy lại:", min: 40, max: 240, step: 10, unit: "", decimals: 0 },
          { prop: "shakeIntensity", label: "Rung màn hình bung nổ:", min: 2, max: 20, step: 1, unit: "", decimals: 0 }
        ]
      }
    ];

    function syncTimestopFxControlsFromConfig() {
      document.querySelectorAll("input[data-timestop-check]").forEach((cb) => {
        const prop = cb.dataset.timestopCheck;
        if (!prop) return;
        const enabled = Boolean(timestopFxConfig[prop]);
        cb.checked = enabled;
        const item = cb.closest(".grav-step-item");
        if (item) item.classList.toggle("is-disabled", !enabled);
      });

      document.querySelectorAll("input[data-timestop-prop]").forEach((slider) => {
        const prop = slider.dataset.timestopProp;
        const unit = slider.dataset.timestopUnit || "";
        const decimals = Number(slider.dataset.timestopDecimals || 0);
        const val = Number(timestopFxConfig[prop]);
        slider.value = String(val);
        const valSpan = slider.parentElement ? slider.parentElement.querySelector(".grav-val-lbl") : null;
        if (valSpan) {
          valSpan.textContent = (decimals > 0 ? val.toFixed(decimals) : Math.round(val)) + unit;
        }
      });

      document.querySelectorAll("[data-timestop-summary]").forEach((el) => {
        const stepNum = Number(el.dataset.timestopSummary);
        const grp = TIMESTOP_STEP_GROUPS.find((g) => g.step === stepNum);
        if (grp) el.textContent = grp.summary(timestopFxConfig);
      });
    }

    function mountTimestopStepAccordion(containerEl) {
      if (!containerEl) return;
      containerEl.innerHTML = "";

      TIMESTOP_STEP_GROUPS.forEach((grp, idx) => {
        const item = document.createElement("div");
        item.className = "grav-step-item" + (idx === 0 ? " is-open" : "");

        const header = document.createElement("div");
        header.className = "grav-step-header";

        const label = document.createElement("label");
        label.className = "grav-step-toggle-label";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.timestopCheck = grp.checkProp;
        checkbox.checked = Boolean(timestopFxConfig[grp.checkProp]);
        checkbox.addEventListener("click", (e) => e.stopPropagation());
        checkbox.addEventListener("change", (e) => {
          timestopFxConfig[grp.checkProp] = e.target.checked;
          syncTimestopFxControlsFromConfig();
        });
        const titleSpan = document.createElement("span");
        titleSpan.textContent = grp.title;
        label.appendChild(checkbox);
        label.appendChild(titleSpan);

        const meta = document.createElement("div");
        meta.className = "grav-step-meta";
        const summarySpan = document.createElement("span");
        summarySpan.dataset.timestopSummary = String(grp.step);
        summarySpan.textContent = grp.summary(timestopFxConfig);
        const chevron = document.createElement("span");
        chevron.className = "grav-step-chevron";
        chevron.textContent = "▾";
        meta.appendChild(summarySpan);
        meta.appendChild(chevron);

        header.appendChild(label);
        header.appendChild(meta);
        header.addEventListener("click", (e) => {
          if (e.target === checkbox) return;
          const willOpen = !item.classList.contains("is-open");
          containerEl.querySelectorAll(".grav-step-item").forEach((other) => {
            other.classList.remove("is-open");
          });
          if (willOpen) item.classList.add("is-open");
        });

        const body = document.createElement("div");
        body.className = "grav-step-body";

        grp.params.forEach((p) => {
          const row = document.createElement("div");
          row.className = "fx-param-row";

          const lbl = document.createElement("span");
          lbl.textContent = p.label;

          const slider = document.createElement("input");
          slider.type = "range";
          slider.min = String(p.min);
          slider.max = String(p.max);
          slider.step = String(p.step);
          slider.value = String(timestopFxConfig[p.prop]);
          slider.dataset.timestopProp = p.prop;
          slider.dataset.timestopUnit = p.unit;
          slider.dataset.timestopDecimals = String(p.decimals);

          const valSpan = document.createElement("span");
          valSpan.className = "grav-val-lbl";

          slider.addEventListener("input", (e) => {
            timestopFxConfig[p.prop] = parseFloat(e.target.value);
            syncTimestopFxControlsFromConfig();
          });

          row.appendChild(lbl);
          row.appendChild(slider);
          row.appendChild(valSpan);
          body.appendChild(row);
        });

        item.appendChild(header);
        item.appendChild(body);
        containerEl.appendChild(item);
      });
    }

    function resetTimestopFxConfigDefaults() {
      Object.assign(timestopFxConfig, DEFAULT_TIMESTOP_FX_CONFIG);
      syncTimestopFxControlsFromConfig();
      addFloatingText("↺ Đã khôi phục Dừng Thời Gian mặc định", player.x - 24, player.y - 16, "#7dd3fc");
    }

    function applyTimestopPreset() {
      timestopFxConfig.step1Enabled = true;
      timestopFxConfig.step2Enabled = true;
      timestopFxConfig.step3Enabled = true;
      timestopFxConfig.step4Enabled = true;
      timestopFxConfig.step5Enabled = true;
      timestopFxConfig.clockRadius = 80;
      timestopFxConfig.slowDuration = 0.50;
      timestopFxConfig.timeScaleMin = 0.00;
      timestopFxConfig.waveSpeed = 380;
      timestopFxConfig.desaturatePct = 100;
      timestopFxConfig.debrisCount = 34;
      timestopFxConfig.duration = 4.5;
      timestopFxConfig.resumeExplosionDamage = 35;
      timestopFxConfig.knockbackForce = 180;
      timestopFxConfig.shakeIntensity = 15;
      syncTimestopFxControlsFromConfig();
      addFloatingText("⏳ Bật Tối Thượng Ngưng Đọng Thời Gian!", player.x - 32, player.y - 16, "#38bdf8");
    }

    mountTimestopStepAccordion(document.getElementById("fxTimestopAccordion"));
    syncTimestopFxControlsFromConfig();

    const btnTimestopReset = document.getElementById("btnTimestopReset");
    if (btnTimestopReset) btnTimestopReset.addEventListener("click", resetTimestopFxConfigDefaults);

    const btnTimestopPreset = document.getElementById("btnTimestopPreset");
    if (btnTimestopPreset) btnTimestopPreset.addEventListener("click", applyTimestopPreset);

    if (combatFxSettingsBtn && combatFxPanel) {
      combatFxSettingsBtn.addEventListener("click", () => {
        combatFxPanel.style.display = combatFxPanel.style.display === "block" ? "none" : "block";
      });
      closeCombatFxPanel.addEventListener("click", () => {
        combatFxPanel.style.display = "none";
      });

      document.querySelectorAll(".fx-tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          switchCombatFxTab(btn.dataset.fxTab || "general");
        });
      });

      const bindCfgCheckbox = (id, prop) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", (e) => { combatFxConfig[prop] = e.target.checked; });
      };
      const bindCfgRange = (id, labelId, prop, unit = "", scale = 1) => {
        const el = document.getElementById(id);
        const lbl = document.getElementById(labelId);
        if (el) el.addEventListener("input", (e) => {
          const val = parseFloat(e.target.value);
          combatFxConfig[prop] = val * scale;
          if (lbl) lbl.textContent = val + unit;
        });
      };

      bindCfgCheckbox("cfgHitFlash", "hitFlash");
      bindCfgRange("cfgHitFlashDur", "valHitFlashDur", "hitFlashDuration", "ms", 0.001);

      bindCfgCheckbox("cfgImpactSound", "impactSound");
      bindCfgRange("cfgSoundVol", "valSoundVol", "soundVolume", "%", 0.01);

      bindCfgCheckbox("cfgHitParticles", "hitParticles");
      bindCfgRange("cfgSparkCount", "valSparkCount", "sparkCount", "", 1);

      bindCfgCheckbox("cfgKnockback", "knockback");
      bindCfgRange("cfgKnockbackDist", "valKnockbackDist", "knockbackDistance", "px", 1);
      bindCfgRange("cfgPlayerRecoil", "valPlayerRecoil", "playerRecoil", "px", 1);

      bindCfgCheckbox("cfgScreenShake", "screenShake");
      bindCfgRange("cfgHitStop", "valHitStop", "hitStopDuration", "ms", 0.001);
      bindCfgRange("cfgShakeInt", "valShakeInt", "shakeIntensity", "", 1);

      const btnGravReset = document.getElementById("btnGravReset");
      if (btnGravReset) btnGravReset.addEventListener("click", resetGravityFxConfigDefaults);

      const btnGravOvercrushPreset = document.getElementById("btnGravOvercrushPreset");
      if (btnGravOvercrushPreset) btnGravOvercrushPreset.addEventListener("click", applyGravityOvercrushPreset);

      // Liên kết điều chỉnh Bộ Chỉ Số Người Chơi (Player) & Sinh Vật
      const bindStatRange = (id, labelId, obj, key, unit = "", callback = null, scale = 1) => {
        const el = document.getElementById(id);
        const lbl = document.getElementById(labelId);
        if (el) el.addEventListener("input", (e) => {
          const rawVal = parseFloat(e.target.value);
          const val = scale !== 1 ? Number((rawVal * scale).toFixed(2)) : rawVal;
          obj[key] = val;
          if (lbl) {
            const displayVal = scale === 0.1 ? val.toFixed(1) : val;
            lbl.textContent = displayVal + (unit ? (scale === 0.1 ? "" : " ") + unit : "");
          }
          if (callback) callback(val);
        });
      };

      bindStatRange("statPlayerHp", "lblPlayerHp", defaultStats.player, "maxHp", "", () => {
        recalculatePlayerArmorAndStats();
      });
      bindStatRange("statPlayerSpeed", "lblPlayerSpeed", defaultStats.player, "speed", "px/s", (val) => {
        player.speed = val;
      });
      bindStatRange("statPlayerAtk", "lblPlayerAtk", defaultStats.player, "attackDamage", "DMG");
      bindStatRange("statPlayerCooldown", "lblPlayerCooldown", defaultStats.player, "attackCooldown", "s", null, 0.1);

      // Liên kết điều chỉnh Bộ Chỉ Số Heo Rừng (Boar)
      bindStatRange("statBoarHp", "lblBoarHp", defaultStats.boar, "maxHp", "", (val) => {
        forestMobs.forEach(m => {
          if (m.type === "boar") {
            const ratio = m.maxHp > 0 ? m.hp / m.maxHp : 1;
            m.maxHp = val;
            m.hp = Math.max(1, Math.round(val * ratio));
            m.displayHp = Math.min(val, Math.max(m.hp, m.displayHp));
          }
        });
      });
      bindStatRange("statBoarSpeed", "lblBoarSpeed", defaultStats.boar, "speed", "px/s", (val) => {
        forestMobs.forEach(m => {
          if (m.type === "boar") {
            m.speed = val;
            m.chaseSpeed = val;
          }
        });
      });
      bindStatRange("statBoarAtk", "lblBoarAtk", defaultStats.boar, "attackDamage", "DMG");
      bindStatRange("statBoarAtkSpeed", "lblBoarAtkSpeed", defaultStats.boar, "attackInterval", "s", null, 0.1);

      // Liên kết điều chỉnh Bộ Chỉ Số Gà Rừng (Chicken)
      bindStatRange("statChickenHp", "lblChickenHp", defaultStats.chicken, "maxHp", "", (val) => {
        forestMobs.forEach(m => {
          if (m.type === "chicken") {
            const ratio = m.maxHp > 0 ? m.hp / m.maxHp : 1;
            m.maxHp = val;
            m.hp = Math.max(1, Math.round(val * ratio));
            m.displayHp = Math.min(val, Math.max(m.hp, m.displayHp));
          }
        });
      });
    }

    // --- HỆ THỐNG ÂM THANH TỔNG HỢP WEB AUDIO API (KHÔNG CẦN TẢI FILE MP3 NGOÀI) ---
    let audioCtx = null;
    function getAudioContext() {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      return audioCtx;
    }

    // Phát âm thanh va chạm (Impact Sound) với pitch ngẫu nhiên nhẹ
    function playImpactSound(isDeath = false) {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;

        const now = ctxAudio.currentTime;
        const osc = ctxAudio.createOscillator();
        const gain = ctxAudio.createGain();

        // Đổi cao độ ngẫu nhiên nhẹ (Pitch Randomization ±15%)
        const pitchJitter = 0.85 + Math.random() * 0.3;
        const baseFreq = isDeath ? 120 : 280;
        const startFreq = baseFreq * pitchJitter;

        osc.type = isDeath ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(isDeath ? 40 : 80, now + (isDeath ? 0.25 : 0.12));

        const vol = (combatFxConfig.soundVolume || 0.8) * (isDeath ? 0.45 : 0.35);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isDeath ? 0.25 : 0.12));

        osc.connect(gain);
        gain.connect(ctxAudio.destination);

        osc.start(now);
        osc.stop(now + (isDeath ? 0.25 : 0.12));
      } catch (e) {
        // Fallback im lặng nếu trình duyệt chặn audio
      }
    }

    // Phát âm thanh tung chiêu Đũa Phép (crystalline arcane chime + whoosh)
    function playMagicCastSound() {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        const vol = (combatFxConfig.soundVolume || 0.8) * 0.24;

        // Tầng 1: Tinh thể ma pháp ngân cao nhẹ nhàng
        const osc1 = ctxAudio.createOscillator();
        const gain1 = ctxAudio.createGain();
        const pitchJitter = 0.92 + Math.random() * 0.16;
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(520 * pitchJitter, now);
        osc1.frequency.exponentialRampToValueAtTime(980 * pitchJitter, now + 0.08);
        osc1.frequency.exponentialRampToValueAtTime(360 * pitchJitter, now + 0.22);
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(vol, now + 0.025);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc1.connect(gain1);
        gain1.connect(ctxAudio.destination);
        osc1.start(now);
        osc1.stop(now + 0.24);

        // Tầng 2: Luồng khí vung đũa ấm hơn
        const osc2 = ctxAudio.createOscillator();
        const gain2 = ctxAudio.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(240 * pitchJitter, now);
        osc2.frequency.exponentialRampToValueAtTime(110 * pitchJitter, now + 0.14);
        gain2.gain.setValueAtTime(vol * 0.65, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc2.connect(gain2);
        gain2.connect(ctxAudio.destination);
        osc2.start(now);
        osc2.stop(now + 0.15);
      } catch (e) {}
    }

    function playGravityCastSound() {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        const vol = (combatFxConfig.soundVolume || 0.8) * 0.22;

        const osc = ctxAudio.createOscillator();
        const gain = ctxAudio.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(310, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(ctxAudio.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      } catch (e) {}
    }

    function playGravitySlamSound(isOvercrush = false) {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        const vol = (combatFxConfig.soundVolume || 0.8) * (isOvercrush ? 0.52 : 0.40);

        const bass = ctxAudio.createOscillator();
        const bassGain = ctxAudio.createGain();
        bass.type = "sawtooth";
        bass.frequency.setValueAtTime(isOvercrush ? 155 : 130, now);
        bass.frequency.exponentialRampToValueAtTime(32, now + (isOvercrush ? 0.36 : 0.26));
        bassGain.gain.setValueAtTime(vol, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + (isOvercrush ? 0.38 : 0.28));
        bass.connect(bassGain);
        bassGain.connect(ctxAudio.destination);
        bass.start(now);
        bass.stop(now + (isOvercrush ? 0.38 : 0.28));

        const sub = ctxAudio.createOscillator();
        const subGain = ctxAudio.createGain();
        sub.type = "triangle";
        sub.frequency.setValueAtTime(88, now);
        sub.frequency.exponentialRampToValueAtTime(28, now + 0.28);
        subGain.gain.setValueAtTime(vol * 0.9, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
        sub.connect(subGain);
        subGain.connect(ctxAudio.destination);
        sub.start(now);
        sub.stop(now + 0.30);
      } catch (e) {}
    }

    function playTimeStopCastSound() {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        const vol = (combatFxConfig.soundVolume || 0.8) * 0.34;

        // Chuông đồng hồ trầm ngân vang
        const bell = ctxAudio.createOscillator();
        const bellGain = ctxAudio.createGain();
        bell.type = "sine";
        bell.frequency.setValueAtTime(587.33, now);
        bell.frequency.exponentialRampToValueAtTime(110, now + 0.55);
        bellGain.gain.setValueAtTime(0.001, now);
        bellGain.gain.linearRampToValueAtTime(vol, now + 0.02);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
        bell.connect(bellGain);
        bellGain.connect(ctxAudio.destination);
        bell.start(now);
        bell.stop(now + 0.62);

        // Bass warp chậm dần xuống 0 trong 0.5s
        const bass = ctxAudio.createOscillator();
        const bassGain = ctxAudio.createGain();
        bass.type = "triangle";
        bass.frequency.setValueAtTime(220, now);
        bass.frequency.exponentialRampToValueAtTime(36, now + 0.52);
        bassGain.gain.setValueAtTime(vol * 0.9, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.54);
        bass.connect(bassGain);
        bassGain.connect(ctxAudio.destination);
        bass.start(now);
        bass.stop(now + 0.54);

        // 3 nhịp tích tắc chậm dần
        [0.05, 0.21, 0.42].forEach((offset, idx) => {
          const t0 = now + offset;
          const tick = ctxAudio.createOscillator();
          const tGain = ctxAudio.createGain();
          tick.type = "square";
          tick.frequency.setValueAtTime(1100 - idx * 240, t0);
          tGain.gain.setValueAtTime(vol * 0.28, t0);
          tGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);
          tick.connect(tGain);
          tGain.connect(ctxAudio.destination);
          tick.start(t0);
          tick.stop(t0 + 0.05);
        });
      } catch (e) {}
    }

    function playTimeStopQueuedHitSound(hitCount = 1) {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        const vol = (combatFxConfig.soundVolume || 0.8) * 0.22;
        const osc = ctxAudio.createOscillator();
        const gain = ctxAudio.createGain();
        const baseFreq = 680 + Math.min(600, hitCount * 75);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.06);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctxAudio.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (e) {}
    }

    function playTimeStopResumeSound(hasHits = false) {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        const vol = (combatFxConfig.soundVolume || 0.8) * (hasHits ? 0.5 : 0.32);

        // Cú giật đồng hồ ngược + nổ bung
        const snap = ctxAudio.createOscillator();
        const sGain = ctxAudio.createGain();
        snap.type = "sawtooth";
        snap.frequency.setValueAtTime(95, now);
        snap.frequency.exponentialRampToValueAtTime(hasHits ? 32 : 52, now + 0.32);
        sGain.gain.setValueAtTime(vol, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        snap.connect(sGain);
        sGain.connect(ctxAudio.destination);
        snap.start(now);
        snap.stop(now + 0.34);

        const chime = ctxAudio.createOscillator();
        const cGain = ctxAudio.createGain();
        chime.type = "sine";
        chime.frequency.setValueAtTime(440, now);
        chime.frequency.exponentialRampToValueAtTime(1180, now + 0.14);
        cGain.gain.setValueAtTime(vol * 0.55, now);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        chime.connect(cGain);
        cGain.connect(ctxAudio.destination);
        chime.start(now);
        chime.stop(now + 0.24);
      } catch (e) {}
    }

    function playSpellCastSound(spellId) {
      if (!combatFxConfig.impactSound) return;
      if (spellId === "spell_gravity") {
        playGravityCastSound();
        return;
      }
      if (spellId === "spell_timestop") {
        playTimeStopCastSound();
        return;
      }
      playMagicCastSound();
    }

    // Âm thanh câu cá (quăng cần, phao rơi xuống nước, cá cắn câu, kéo lên)
    function playFishingSound(kind) {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        const vol = (combatFxConfig.soundVolume || 0.8) * 0.22;

        if (kind === "cast") {
          const osc = ctxAudio.createOscillator();
          const gain = ctxAudio.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);
          osc.frequency.exponentialRampToValueAtTime(160, now + 0.19);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(vol * 0.85, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain);
          gain.connect(ctxAudio.destination);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (kind === "splash") {
          const osc = ctxAudio.createOscillator();
          const gain = ctxAudio.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(175, now + 0.09);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.14);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc.connect(gain);
          gain.connect(ctxAudio.destination);
          osc.start(now);
          osc.stop(now + 0.16);
        } else if (kind === "bite") {
          [880, 1245].forEach((freq, idx) => {
            const t0 = now + idx * 0.085;
            const osc = ctxAudio.createOscillator();
            const gain = ctxAudio.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.linearRampToValueAtTime(vol * 1.15, t0 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
            osc.connect(gain);
            gain.connect(ctxAudio.destination);
            osc.start(t0);
            osc.stop(t0 + 0.14);
          });
        } else if (kind === "catch") {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const t0 = now + idx * 0.055;
            const osc = ctxAudio.createOscillator();
            const gain = ctxAudio.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.linearRampToValueAtTime(vol * 0.95, t0 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
            osc.connect(gain);
            gain.connect(ctxAudio.destination);
            osc.start(t0);
            osc.stop(t0 + 0.18);
          });
        }
      } catch (e) {}
    }

    function playDashSound() {
      if (!combatFxConfig.impactSound) return;
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        const now = ctxAudio.currentTime;
        const vol = (combatFxConfig.soundVolume || 0.8) * 0.2;
        const osc = ctxAudio.createOscillator();
        const gain = ctxAudio.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctxAudio.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {}
    }

    // --- HỆ THỐNG HẠT PARTICLE (TIA LỬA, MA PHÁP & MẢNH VỠ NỔ DEATH POP) ---
    const combatParticles = [];

    // Tạo tia lửa tại điểm chạm văng theo hướng chém
    function spawnHitSparks(worldX, worldY, slashAngle) {
      if (!combatFxConfig.hitParticles) return;
      const count = combatFxConfig.sparkCount || 12;

      for (let i = 0; i < count; i++) {
        // Góc phát tán quanh hướng chém (hình nón ~75 độ)
        const spread = (Math.random() - 0.5) * (Math.PI * 0.45);
        const angle = slashAngle + spread;
        const speed = 40 + Math.random() * 90;

        combatParticles.push({
          x: worldX,
          y: worldY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.5 + Math.random() * 2.0,
          color: Math.random() > 0.4 ? "#facc15" : (Math.random() > 0.5 ? "#ffffff" : "#f97316"), // Vàng, Trắng, Cam
          life: 0.18 + Math.random() * 0.15,
          maxLife: 0.3,
          isSpark: true
        });
      }
    }

    // Hiệu ứng vòng tròn phép định hướng + tia sao tại đầu đũa khi tung chiêu
    function spawnMagicCastVfx(worldX, worldY, castAngle, colorA = "#e879f9", colorB = "#7dd3fc") {
      // Vòng xung kích elip 3D vuông góc hướng bắn (tạo cảm giác phóng phép có chiều sâu)
      combatParticles.push({
        x: worldX,
        y: worldY,
        vx: Math.cos(castAngle) * 14,
        vy: Math.sin(castAngle) * 14,
        angle: castAngle,
        radius: 2.5,
        maxRadius: 9.0,
        color: colorA,
        coreColor: colorB,
        life: 0.22,
        maxLife: 0.22,
        isMagicRing: true
      });

      // Các hạt bụi sao bay theo nón phía trước đầu đũa
      const moteCount = 7;
      for (let i = 0; i < moteCount; i++) {
        const spread = (Math.random() - 0.5) * (Math.PI * 0.55);
        const a = castAngle + spread;
        const spd = 28 + Math.random() * 58;
        combatParticles.push({
          x: worldX,
          y: worldY,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 1.6 + Math.random() * 1.4,
          color: i % 3 === 0 ? "#ffffff" : (i % 2 === 0 ? colorA : colorB),
          life: 0.20 + Math.random() * 0.14,
          maxLife: 0.34,
          isMagicMote: true
        });
      }
    }

    // Vụ nổ ma pháp khi cầu phép chạm mục tiêu / vật cản / hết tầm
    function spawnMagicHitBurst(worldX, worldY, impactAngle, colorA = "#c084fc", colorB = "#7dd3fc", maxRadius = 11.5) {
      combatParticles.push({
        x: worldX,
        y: worldY,
        vx: 0,
        vy: 0,
        angle: impactAngle,
        radius: 3.0,
        maxRadius: maxRadius,
        color: colorA,
        coreColor: "#ffffff",
        life: 0.22,
        maxLife: 0.22,
        isMagicRing: true,
        isCircularBurst: true
      });

      const count = 11;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const spd = 30 + Math.random() * 75;
        combatParticles.push({
          x: worldX,
          y: worldY,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 1.6 + Math.random() * 1.6,
          color: i % 3 === 0 ? "#ffffff" : (i % 2 === 0 ? colorA : colorB),
          life: 0.20 + Math.random() * 0.16,
          maxLife: 0.36,
          isMagicMote: true
        });
      }
    }

    function spawnGravityDebris(worldX, worldY, count = 12, radius = 20) {
      const n = Math.max(0, Math.round(count));
      const colors = ["#78716c", "#57534e", "#a8a29e", "#6b21a8", "#9333ea"];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / Math.max(1, n) + (Math.random() - 0.5) * 0.5;
        const dist0 = Math.random() * (radius * 0.35);
        const speed = 28 + Math.random() * 56;
        combatParticles.push({
          x: worldX + Math.cos(a) * dist0,
          y: worldY + Math.sin(a) * dist0,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed * 0.72,
          z: 1,
          vz: 48 + Math.random() * 44,
          size: 1.8 + Math.random() * 2.0,
          color: colors[i % colors.length],
          life: 0.45 + Math.random() * 0.25,
          maxLife: 0.70,
          isGravityDebris: true
        });
      }
    }

    // Tạo vụ nổ tan thành nhiều mảnh vụn khi quái hết máu (Death Pop)
    function spawnDeathPop(worldX, worldY, baseColor = "#8b0000") {
      if (!combatFxConfig.deathPop) return;
      const count = combatFxConfig.debrisCount || 20;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 110;

        combatParticles.push({
          x: worldX + (Math.random() - 0.5) * 8,
          y: worldY + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20, // Nảy lên trên một chút
          size: 2.0 + Math.random() * 2.5,
          color: Math.random() > 0.3 ? baseColor : (Math.random() > 0.5 ? "#ef4444" : "#450a0a"),
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          isDebris: true
        });
      }
    }

    function updateCombatParticles(deltaTime) {
      for (let i = combatParticles.length - 1; i >= 0; i--) {
        const p = combatParticles[i];
        p.life -= deltaTime;
        if (p.life <= 0) {
          combatParticles.splice(i, 1);
          continue;
        }

        if (p.isGravityDebris) {
          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
          p.vx *= 0.93;
          p.vy *= 0.93;
          p.vz -= 240 * deltaTime;
          p.z += p.vz * deltaTime;
          if (p.z < 0) {
            p.z = 0;
            p.vz = Math.abs(p.vz) * 0.42;
            p.vx *= 0.7;
            p.vy *= 0.7;
          }
          continue;
        }

        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;

        // Ma sát giảm tốc
        p.vx *= 0.88;
        p.vy *= 0.88;

        // Trọng lực nhẹ cho mảnh vỡ death pop
        if (p.isDebris) {
          p.vy += 60 * deltaTime;
        }
      }
    }

    // --- QUẢN LÝ HIT-STOP VÀ RUNG CAMERA (SCREEN SHAKE) ---
    let hitStopTimer = 0;
    let hitStopFramesRemaining = 0;
    let screenShakeTimer = 0;
    let screenShakeDuration = 0.18;
    let screenShakeIntensity = 0;
    let screenShakeOffsetX = 0;
    let screenShakeOffsetY = 0;

    function triggerHitJuice(intensity = 5, hitStopMs = 80, shakeDur = 0.18, hitStopFrames = 0) {
      if (combatFxConfig.screenShake) {
        screenShakeIntensity = intensity || combatFxConfig.shakeIntensity;
        screenShakeDuration = Math.max(0.05, shakeDur || 0.18);
        screenShakeTimer = screenShakeDuration;
      }
      if (hitStopFrames > 0) {
        hitStopFramesRemaining = Math.max(hitStopFramesRemaining, Math.round(hitStopFrames));
      } else if (combatFxConfig.hitStopDuration > 0 && hitStopMs !== 0) {
        hitStopTimer = (hitStopMs ? hitStopMs * 0.001 : combatFxConfig.hitStopDuration);
      }
    }

    // --- HỆ THỐNG PHÉP TRỌNG LỰC (5 BƯỚC) & HIỆU ỨNG PHÉP TRÊN MẶT ĐẤT ---
    const activeGravityEffects = [];
    const groundCraters = [];
    const groundShockwaves = [];
    const lightningBolts = [];

    function generateCraterCracks(crackCount, radius) {
      const cracks = [];
      const n = Math.max(1, Math.round(crackCount));
      for (let i = 0; i < n; i++) {
        const baseA = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.35;
        const len = radius * (0.78 + Math.random() * 0.52);
        const pts = [{ x: Math.cos(baseA) * (radius * 0.2), y: Math.sin(baseA) * (radius * 0.2) * 0.72 }];
        const segs = 3;
        for (let s = 1; s <= segs; s++) {
          const frac = s / segs;
          const jitterA = baseA + (Math.random() - 0.5) * 0.32;
          const r = radius * 0.2 + (len - radius * 0.2) * frac;
          pts.push({ x: Math.cos(jitterA) * r, y: Math.sin(jitterA) * r * 0.72 });
        }
        cracks.push(pts);
      }
      return cracks;
    }

    function generateBeamStreaks(count, beamWidth) {
      const streaks = [];
      const n = Math.max(1, Math.round(count));
      for (let i = 0; i < n; i++) {
        streaks.push({
          offsetX: (Math.random() - 0.5) * Math.max(12, beamWidth * 1.45),
          delay: Math.random() * 0.35,
          length: 22 + Math.random() * 28,
          width: 0.8 + Math.random() * 1.1,
          color: i % 3 === 0 ? "#ffffff" : (i % 2 === 0 ? "#e879f9" : "#a855f7")
        });
      }
      return streaks;
    }

    function executeGravityImpact(eff) {
      if (eff.impacted) return;
      eff.impacted = true;

      const x = eff.x;
      const y = eff.y;
      const radius = Math.max(14, gravityFxConfig.warnRadius || 22);
      const isOvercrush = gravityFxConfig.force >= gravityFxConfig.overcrushThreshold;
      const gb = eff.gemBonuses || null;

      // Bước 3: Đè bẹp mục tiêu trong phạm vi vòng tròn (nếu bật)
      let hitCount = 0;
      let totalDealtDmg = 0;
      if (gravityFxConfig.step3Enabled) {
        const squashDur = Math.max(0.15, gravityFxConfig.squashDuration || 0.45);
        const baseDmg = Math.max(1, Math.round((gravityFxConfig.damage || 8) + (gb ? gb.damageBonus : 0)));
        const isCrit = Boolean(gb && gb.critChance > 0 && Math.random() < gb.critChance);
        const dmg = isCrit ? Math.round(baseDmg * 1.75) : baseDmg;
        const targetSY = isOvercrush ? 0.14 : Math.max(0.18, Math.min(0.85, (gravityFxConfig.squashScaleY || 55) / 100));
        const targetSX = isOvercrush ? 1.95 : Math.max(1.1, gravityFxConfig.squashSpreadX || 1.45);

        for (let mIdx = currentMobs.length - 1; mIdx >= 0; mIdx--) {
          const mob = currentMobs[mIdx];
          const mobFeetX = mob.x + mob.width / 2;
          const mobFeetY = mob.y + mob.height;
          const dist = Math.hypot(mobFeetX - x, mobFeetY - y);
          if (mob === eff.targetMob || dist <= radius + 8) {
            hitCount++;
            totalDealtDmg += dmg;
            const critTag = isCrit ? " 💥" : "";
            const gravLabel = isOvercrush ? `-${dmg} HP${critTag} 📄 BẸP TỜ GIẤY!` : `-${dmg} HP${critTag} ⬇`;
            const gravColor = isCrit ? "#fde047" : (isOvercrush ? "#f0abfc" : "#c084fc");
            const hitRes = applyMobDamageWithTimeStop(mob, dmg, {
              angle: Math.atan2(mobFeetY - y, mobFeetX - x),
              color: gravColor,
              isCrit: isOvercrush || isCrit,
              floatingText: gravLabel,
              flashDur: combatFxConfig.hitFlashDuration || 0.08,
              burnTimer: (gb && gb.burnStacks > 0) ? (2.8 + gb.burnStacks * 0.6) : 0,
              burnSpread: Boolean(gb && gb.burnSpread),
              slowTimer: squashDur + 0.6 + (gb && gb.frostStacks > 0 ? 1.8 : 0),
              vampireHeal: (gb && gb.vampirePct > 0) ? Math.max(1, Math.round(dmg * gb.vampirePct)) : 0
            });
            if (!hitRes.queued) {
              mob.gravitySquash = {
                elapsed: 0,
                duration: squashDur,
                targetScaleY: targetSY,
                targetScaleX: targetSX,
                isOvercrush: isOvercrush
              };
              addFloatingText(
                gravLabel,
                mob.x - (isOvercrush ? 18 : 4),
                mob.y - 12,
                gravColor,
                isOvercrush || isCrit
              );

              if (mob.hp <= 0) {
                currentMobs.splice(mIdx, 1);
                handleMobDeath(mob, mobFeetX, mob.y + mob.height / 2);
              }
            }
          }
        }
      }

      if (!(timeStopState.active && timestopFxConfig.step5Enabled) && gb && gb.vampirePct > 0 && totalDealtDmg > 0 && player.hp < player.maxHp && player.action !== "die") {
        // Hút máu cho Gravity đã được xử lý từng mục tiêu trong applyMobDamageWithTimeStop
      }

      // Bước 4: Đất lún thành hố, vết nứt hình tia & đá vụn văng ra
      if (gravityFxConfig.step4Enabled) {
        const craterR = Math.max(8, gravityFxConfig.craterRadius || 20);
        const craterDur = Math.max(0.5, gravityFxConfig.craterDuration || 3.5);
        groundCraters.push({
          x,
          y,
          radius: craterR,
          life: craterDur,
          maxLife: craterDur,
          cracks: generateCraterCracks(gravityFxConfig.crackCount || 7, craterR)
        });
        spawnGravityDebris(x, y, gravityFxConfig.debrisCount || 12, craterR);
      }

      // Bước 5: Dừng hình 3 frame, lắc màn hình mạnh & vòng sóng lan ra
      if (gravityFxConfig.step5Enabled) {
        const shockMaxR = Math.max(16, gravityFxConfig.shockwaveRadius || 46);
        groundShockwaves.push({
          x,
          y,
          radius: 4,
          maxRadius: shockMaxR,
          life: 0.34,
          maxLife: 0.34,
          color: isOvercrush ? "#f0abfc" : "#c084fc",
          coreColor: "#ffffff"
        });
        triggerHitJuice(
          gravityFxConfig.shakeIntensity || 9,
          0,
          gravityFxConfig.shakeDuration || 0.28,
          gravityFxConfig.hitStopFrames
        );
      }

      spawnMagicHitBurst(x, y, 0, isOvercrush ? "#f0abfc" : "#a855f7", "#e9d5ff", radius * 0.65);
      playGravitySlamSound(isOvercrush);
      if (hitCount === 0 && isOvercrush) {
        addFloatingText("📄 ÉP CỰC MẠNH!", x - 20, y - 18, "#f0abfc", true);
      }
    }

    function castGravitySpell(aimAngle, clickWorldPos = null, gemBonuses = null) {
      const pCx = player.x + player.width / 2;
      const pCy = player.y + player.height / 2;

      let targetMob = null;
      let tx = pCx + Math.cos(aimAngle) * 70;
      let ty = pCy + Math.sin(aimAngle) * 70;

      if (clickWorldPos) {
        const dClick = Math.hypot(clickWorldPos.x - pCx, clickWorldPos.y - pCy);
        const clamped = Math.min(dClick, 155);
        const aClick = Math.atan2(clickWorldPos.y - pCy, clickWorldPos.x - pCx);
        tx = pCx + Math.cos(aClick) * clamped;
        ty = pCy + Math.sin(aClick) * clamped;
        // Bắt dính quái gần điểm click
        let bestDist = 26;
        for (const mob of currentMobs) {
          const d = Math.hypot((mob.x + mob.width / 2) - tx, (mob.y + mob.height / 2) - ty);
          if (d < bestDist) {
            bestDist = d;
            targetMob = mob;
          }
        }
      } else {
        // Tự động khóa mục tiêu quái nằm phía trước hướng ngắm (hình nón rộng ~70 độ, tầm 155px)
        let bestScore = Infinity;
        for (const mob of currentMobs) {
          const mx = mob.x + mob.width / 2;
          const my = mob.y + mob.height;
          const dx = mx - pCx;
          const dy = my - pCy;
          const dist = Math.hypot(dx, dy);
          if (dist > 155) continue;
          let diff = Math.abs(Math.atan2(dy, dx) - aimAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff <= Math.PI * 0.42) {
            const score = dist + diff * 32;
            if (score < bestScore) {
              bestScore = score;
              targetMob = mob;
            }
          }
        }
      }

      if (targetMob) {
        tx = targetMob.x + targetMob.width / 2;
        ty = targetMob.y + targetMob.height;
      }

      tx = Math.max(16, Math.min(MAP_SIZE - 16, tx));
      ty = Math.max(16, Math.min(MAP_SIZE - 16, ty));

      const startPhase = gravityFxConfig.step1Enabled
        ? "warning"
        : (gravityFxConfig.step2Enabled ? "beam" : "impact");

      const eff = {
        x: tx,
        y: ty,
        targetMob: targetMob,
        gemBonuses: gemBonuses,
        phase: startPhase,
        timer: 0,
        rotation: 0,
        warnDuration: Math.max(0.05, gravityFxConfig.warnDuration || 0.50),
        warnRadius: Math.max(12, gravityFxConfig.warnRadius || 22),
        beamDuration: Math.max(0.04, gravityFxConfig.beamDuration || 0.16),
        beamWidth: Math.max(6, gravityFxConfig.beamWidth || 16),
        streaks: generateBeamStreaks(gravityFxConfig.streakCount || 10, gravityFxConfig.beamWidth || 16),
        impacted: false
      };

      if (startPhase === "impact") {
        executeGravityImpact(eff);
      } else {
        activeGravityEffects.push(eff);
      }
    }

    const activeWoodEffects = [];
    const woodGroundCraters = [];

    function castWoodSpell(aimAngle, clickWorldPos = null, gemBonuses = null) {
      const pCx = player.x + player.width / 2;
      const pCy = player.y + player.height / 2;

      let tx = pCx + Math.cos(aimAngle) * 90;
      let ty = pCy + Math.sin(aimAngle) * 90;
      let targetMob = null;

      if (clickWorldPos) {
        const dClick = Math.hypot(clickWorldPos.x - pCx, clickWorldPos.y - pCy);
        const clamped = Math.min(dClick, 180);
        const aClick = Math.atan2(clickWorldPos.y - pCy, clickWorldPos.x - pCx);
        tx = pCx + Math.cos(aClick) * clamped;
        ty = pCy + Math.sin(aClick) * clamped;
        let bestDist = 32;
        for (const mob of currentMobs) {
          const d = Math.hypot((mob.x + mob.width / 2) - tx, (mob.y + mob.height / 2) - ty);
          if (d < bestDist) {
            bestDist = d;
            targetMob = mob;
          }
        }
      } else {
        let bestScore = Infinity;
        for (const mob of currentMobs) {
          const mx = mob.x + mob.width / 2;
          const my = mob.y + mob.height;
          const dist = Math.hypot(mx - pCx, my - pCy);
          if (dist > 180) continue;
          let diff = Math.abs(Math.atan2(my - pCy, mx - pCx) - aimAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff <= Math.PI * 0.45) {
            const score = dist + diff * 35;
            if (score < bestScore) {
              bestScore = score;
              targetMob = mob;
            }
          }
        }
      }

      if (targetMob) {
        tx = targetMob.x + targetMob.width / 2;
        ty = targetMob.y + targetMob.height / 2;
      }

      tx = Math.max(16, Math.min(MAP_SIZE - 16, tx));
      ty = Math.max(16, Math.min(MAP_SIZE - 16, ty));

      const totalDist = Math.hypot(tx - pCx, ty - pCy);
      const duration = Math.max(0.3, totalDist / Math.max(80, woodFxConfig.waveSpeed || 240));

      const branches = [];
      const numBranches = woodFxConfig.step2Enabled ? Math.max(1, Math.min(6, woodFxConfig.branchCount || 4)) : 1;
      for (let i = 0; i < numBranches; i++) {
        const angleOffset = (i - (numBranches - 1) / 2) * 0.22;
        const stagger = i * (woodFxConfig.staggerDelay || 0.05);
        branches.push({
          index: i,
          angleOffset: angleOffset,
          stagger: stagger,
          progress: 0
        });
      }

      activeWoodEffects.push({
        startX: pCx,
        startY: pCy,
        targetX: tx,
        targetY: ty,
        targetMob: targetMob,
        gemBonuses: gemBonuses,
        duration: duration,
        timer: 0,
        branches: branches,
        impacted: false
      });
    }

    function executeWoodImpact(eff) {
      const x = eff.targetX;
      const y = eff.targetY;
      const gb = eff.gemBonuses || {};
      const dmg = Math.max(2, Math.round((woodFxConfig.damage || 12) + (gb.damageBonus || 0)));

      if (woodFxConfig.step3Enabled) {
        const craterR = Math.max(10, woodFxConfig.craterRadius || 16);
        woodGroundCraters.push({
          x: x,
          y: y,
          radius: craterR,
          maxRadius: craterR,
          life: 4.5,
          maxLife: 4.5,
          cracks: generateCraterCracks(woodFxConfig.rockCount || 6, craterR)
        });
        spawnWoodDebris(x, y, woodFxConfig.rockCount || 6, craterR);
      }

      let hitCount = 0;
      for (let mIdx = currentMobs.length - 1; mIdx >= 0; mIdx--) {
        const mob = currentMobs[mIdx];
        if (mob.hp <= 0) continue;
        const mCx = mob.x + mob.width / 2;
        const mCy = mob.y + mob.height / 2;
        const dist = Math.hypot(mCx - x, mCy - y);
        if (dist <= 38) {
          hitCount++;
          const hitRes = applyMobDamageWithTimeStop(mob, dmg, {
            angle: Math.atan2(mCy - y, mCx - x),
            color: "#22c55e",
            floatingText: `-${dmg} 🌲`,
            flashDur: combatFxConfig.hitFlashDuration || 0.08
          });
          if (!hitRes.queued) {
            addFloatingText(`-${dmg} 🌲`, mob.x, mob.y - 12, "#22c55e", false);
            if (woodFxConfig.step5Enabled) {
              mob.boundTimer = 2.2;
              if (Math.random() < (woodFxConfig.sleepChance || 0.40)) {
                mob.sleepTimer = woodFxConfig.sleepDuration || 3.5;
                addFloatingText("💤 Ngủ say!", mob.x - 4, mob.y - 24, "#86efac", true);
                spawnSleepPollenParticles(mCx, mCy);
              }
            }
            if (mob.hp <= 0) {
              currentMobs.splice(mIdx, 1);
              handleMobDeath(mob, mCx, mCy);
            }
          }
        }
      }

      if (woodFxConfig.step5Enabled) {
        triggerHitJuice(woodFxConfig.shakeIntensity || 7, 0, woodFxConfig.shakeDuration || 0.25, 2);
      }

      spawnMagicHitBurst(x, y, 0, "#22c55e", "#86efac", 16);
      playSpellCastSound("spell_wood");
      if (hitCount > 0) {
        addFloatingText("🌲 MỘC ĐỘN GIÁNG!", x - 24, y - 18, "#22c55e", true);
      }
    }

    function spawnWoodDebris(x, y, count, radius) {
      for (let k = 0; k < count; k++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * 50;
        combatParticles.push({
          x: x,
          y: y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 20,
          size: 2 + Math.random() * 2,
          color: Math.random() > 0.5 ? "#166534" : "#78716c",
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.7,
          isMagicMote: true
        });
      }
    }

    function spawnSleepPollenParticles(x, y) {
      for (let k = 0; k < 8; k++) {
        const a = Math.random() * Math.PI * 2;
        const dist = Math.random() * 16;
        combatParticles.push({
          x: x + Math.cos(a) * dist,
          y: y + Math.sin(a) * dist,
          vx: (Math.random() - 0.5) * 12,
          vy: -15 - Math.random() * 15,
          size: 1.8 + Math.random() * 1.5,
          color: "#d9f99d",
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          isMagicMote: true
        });
      }
    }

    function updateGravityAndSpellEffects(deltaTime) {
      for (let i = activeGravityEffects.length - 1; i >= 0; i--) {
        const eff = activeGravityEffects[i];
        eff.timer += deltaTime;

        if (eff.phase === "warning") {
          if (eff.targetMob && currentMobs.includes(eff.targetMob) && eff.targetMob.hp > 0) {
            eff.x = eff.targetMob.x + eff.targetMob.width / 2;
            eff.y = eff.targetMob.y + eff.targetMob.height;
          }
          eff.rotation += (gravityFxConfig.warnRotateSpeed || 1.2) * deltaTime * Math.PI;
          if (eff.timer >= eff.warnDuration) {
            eff.timer = 0;
            if (gravityFxConfig.step2Enabled) {
              eff.phase = "beam";
            } else {
              executeGravityImpact(eff);
              activeGravityEffects.splice(i, 1);
            }
          }
        } else if (eff.phase === "beam") {
          if (eff.timer >= eff.beamDuration) {
            executeGravityImpact(eff);
            activeGravityEffects.splice(i, 1);
          }
        }
      }

      for (let i = groundCraters.length - 1; i >= 0; i--) {
        groundCraters[i].life -= deltaTime;
        if (groundCraters[i].life <= 0) {
          groundCraters.splice(i, 1);
        }
      }

      for (let i = groundShockwaves.length - 1; i >= 0; i--) {
        const sw = groundShockwaves[i];
        sw.life -= deltaTime;
        if (sw.life <= 0) {
          groundShockwaves.splice(i, 1);
          continue;
        }
        const p = 1 - sw.life / sw.maxLife;
        sw.radius = 4 + (sw.maxRadius - 4) * (1 - Math.pow(1 - p, 2.2));
      }

      for (let i = lightningBolts.length - 1; i >= 0; i--) {
        lightningBolts[i].life -= deltaTime;
        if (lightningBolts[i].life <= 0) {
          lightningBolts.splice(i, 1);
        }
      }

      for (let i = activeWoodEffects.length - 1; i >= 0; i--) {
        const eff = activeWoodEffects[i];
        eff.timer += deltaTime;
        if (eff.timer >= eff.duration) {
          if (!eff.impacted) {
            eff.impacted = true;
            executeWoodImpact(eff);
          }
          activeWoodEffects.splice(i, 1);
        }
      }

      for (let i = woodGroundCraters.length - 1; i >= 0; i--) {
        woodGroundCraters[i].life -= deltaTime;
        if (woodGroundCraters[i].life <= 0) {
          woodGroundCraters.splice(i, 1);
        }
      }
    }

    function renderGravityGroundEffects(ctx) {
      // 1. Đất lún & vết nứt hình tia (Bước 4)
      for (const c of groundCraters) {
        const alpha = Math.max(0, Math.min(1, c.life / Math.min(0.8, c.maxLife * 0.35)));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(c.x, c.y);

        // Hố lún tối màu (perspective elip 2.5D)
        const grad = ctx.createRadialGradient(0, 0, c.radius * 0.15, 0, 0, c.radius);
        grad.addColorStop(0, "rgba(15, 10, 24, 0.78)");
        grad.addColorStop(0.65, "rgba(41, 32, 46, 0.56)");
        grad.addColorStop(1, "rgba(41, 32, 46, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, c.radius, c.radius * 0.68, 0, 0, Math.PI * 2);
        ctx.fill();

        // Viền miệng hố đất nổi nhẹ
        ctx.strokeStyle = "rgba(88, 28, 135, 0.35)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(0, 0, c.radius * 0.72, c.radius * 0.48, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Vết nứt hình tia tỏa ra xung quanh
        ctx.strokeStyle = "rgba(17, 12, 22, 0.85)";
        ctx.lineWidth = 1.05;
        ctx.lineCap = "round";
        for (const pts of c.cracks) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) {
            ctx.lineTo(pts[k].x, pts[k].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Vòng báo phép tím xoay chậm dưới chân mục tiêu (Bước 1)
      for (const eff of activeGravityEffects) {
        if (eff.phase !== "warning" && eff.phase !== "beam") continue;
        const p = eff.phase === "warning" ? Math.min(1, eff.timer / eff.warnDuration) : 1;
        const r = eff.warnRadius;
        const fade = eff.phase === "beam" ? Math.max(0.25, 1 - eff.timer / eff.beamDuration) : (0.55 + 0.45 * p);

        ctx.save();
        ctx.translate(eff.x, eff.y);
        ctx.scale(1, 0.68); // Nằm bẹp 2.5D trên mặt đất dưới chân mục tiêu
        ctx.globalAlpha = fade;

        // Ánh tím tụ trọng lực ở đáy vòng
        const wellGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
        wellGrad.addColorStop(0, "rgba(168, 85, 247, 0.42)");
        wellGrad.addColorStop(0.75, "rgba(126, 34, 206, 0.16)");
        wellGrad.addColorStop(1, "rgba(88, 28, 135, 0)");
        ctx.fillStyle = wellGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Vòng xoay ngoài + ký tự rune chia vạch
        ctx.save();
        ctx.rotate(eff.rotation);
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(232, 121, 249, 0.85)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
        ctx.stroke();

        // 6 điểm sao ma pháp xoay chậm
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI * 2 * k) / 6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.stroke();
        }
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (Math.PI * 2 * k) / 3;
          if (k === 0) ctx.moveTo(Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76);
          else ctx.lineTo(Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Vòng thu hẹp đếm ngược về tâm trước lúc giáng xuống
        if (eff.phase === "warning") {
          const shrinkR = Math.max(2, r * (1 - p * 0.82));
          ctx.strokeStyle = "#f5d0fe";
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(0, 0, shrinkR, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 3. Vòng sóng lan ra khi chạm đáy (Bước 5)
      for (const sw of groundShockwaves) {
        const a = Math.max(0, sw.life / sw.maxLife);
        ctx.save();
        ctx.translate(sw.x, sw.y);
        ctx.globalAlpha = a;
        ctx.strokeStyle = sw.color || "#c084fc";
        ctx.lineWidth = Math.max(0.8, 2.6 * a);
        ctx.beginPath();
        ctx.ellipse(0, 0, sw.radius, sw.radius * 0.66, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = sw.coreColor || "#ffffff";
        ctx.lineWidth = Math.max(0.5, 1.1 * a);
        ctx.beginPath();
        ctx.ellipse(0, 0, sw.radius * 0.72, sw.radius * 0.72 * 0.66, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function renderGravityAirEffects(ctx) {
      // Bước 2: Cột sáng tím & nhiều vệt mảnh lao từ trên cao xuống mục tiêu
      for (const eff of activeGravityEffects) {
        if (eff.phase !== "beam") continue;
        const p = Math.min(1, eff.timer / eff.beamDuration);
        const skyTop = eff.y - 165;
        const headY = skyTop + (eff.y - skyTop) * Math.min(1, p * 1.25);
        const colW = eff.beamWidth * (0.75 + Math.sin(p * Math.PI) * 0.45);

        ctx.save();
        // Cột sáng tím đổ dọc từ trên cao xuống
        const colGrad = ctx.createLinearGradient(eff.x - colW / 2, 0, eff.x + colW / 2, 0);
        colGrad.addColorStop(0, "rgba(168, 85, 247, 0)");
        colGrad.addColorStop(0.28, "rgba(168, 85, 247, 0.52)");
        colGrad.addColorStop(0.5, "rgba(245, 208, 254, 0.92)");
        colGrad.addColorStop(0.72, "rgba(168, 85, 247, 0.52)");
        colGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
        ctx.fillStyle = colGrad;
        ctx.fillRect(eff.x - colW / 2, skyTop, colW, Math.max(0, headY - skyTop));

        // Lõi trắng sắc nét ở giữa cột
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(eff.x - Math.max(1.2, colW * 0.14), skyTop, Math.max(2.4, colW * 0.28), Math.max(0, headY - skyTop));

        // Nhiều vệt mảnh lao từ trên cao xuống
        for (const st of eff.streaks) {
          const sp = Math.max(0, Math.min(1, (p - st.delay) / Math.max(0.2, 1 - st.delay)));
          if (sp <= 0) continue;
          const sy = skyTop + (eff.y - skyTop) * sp;
          const sx = eff.x + st.offsetX;
          ctx.strokeStyle = st.color;
          ctx.lineWidth = st.width;
          ctx.beginPath();
          ctx.moveTo(sx, Math.max(skyTop, sy - st.length));
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Tia sét của Ngọc Lôi Kích (spell_lightning)
      for (const lb of lightningBolts) {
        const a = Math.max(0, lb.life / lb.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(lb.pts[0].x, lb.pts[0].y);
        for (let k = 1; k < lb.pts.length; k++) ctx.lineTo(lb.pts[k].x, lb.pts[k].y);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(lb.pts[0].x, lb.pts[0].y);
        for (let k = 1; k < lb.pts.length; k++) ctx.lineTo(lb.pts[k].x, lb.pts[k].y);
        ctx.stroke();
        ctx.restore();
      }
    }

    function renderWoodGroundEffects(ctx) {
      for (const c of woodGroundCraters) {
        const alpha = Math.max(0, Math.min(1, c.life / Math.min(1.0, c.maxLife * 0.4)));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(c.x, c.y);

        const grad = ctx.createRadialGradient(0, 0, c.radius * 0.1, 0, 0, c.radius);
        grad.addColorStop(0, "rgba(20, 83, 45, 0.75)");
        grad.addColorStop(0.7, "rgba(54, 83, 20, 0.4)");
        grad.addColorStop(1, "rgba(54, 83, 20, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, c.radius, c.radius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(22, 101, 52, 0.85)";
        ctx.lineWidth = 1.1;
        ctx.lineCap = "round";
        for (const pts of c.cracks) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) {
            ctx.lineTo(pts[k].x, pts[k].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function renderWoodAirEffects(ctx) {
      for (const eff of activeWoodEffects) {
        const p = Math.min(1, eff.timer / eff.duration);
        ctx.save();
        for (const br of eff.branches) {
          const bp = Math.max(0, Math.min(1, (eff.timer - br.stagger) / Math.max(0.1, eff.duration - br.stagger)));
          if (bp <= 0) continue;

          const bx = eff.startX + (eff.targetX - eff.startX) * bp;
          const by = eff.startY + (eff.targetY - eff.startY) * bp;

          const waveH = woodFxConfig.step1Enabled ? (woodFxConfig.waveHeight || 28) * Math.sin(bp * Math.PI * (woodFxConfig.waveFrequency || 2.2)) : 0;
          const finalY = by - waveH + (br.angleOffset * 15);

          ctx.strokeStyle = "#166534";
          ctx.lineWidth = 4.5 - br.index * 0.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(eff.startX, eff.startY);
          const cpX = (eff.startX + bx) / 2 + br.angleOffset * 20;
          const cpY = (eff.startY + finalY) / 2 - Math.abs(waveH) * 1.3;
          ctx.quadraticCurveTo(cpX, cpY, bx, finalY);
          ctx.stroke();

          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(eff.startX, eff.startY);
          ctx.quadraticCurveTo(cpX, cpY, bx, finalY);
          ctx.stroke();

          if (woodFxConfig.step4Enabled && bp > 0.15) {
            ctx.fillStyle = "#86efac";
            for (let l = 0; l < 4; l++) {
              const la = bp * Math.PI * 4 + l * (Math.PI / 2);
              const lx = bx + Math.cos(la) * 8;
              const ly = finalY + Math.sin(la) * 6;
              ctx.beginPath();
              ctx.arc(lx, ly, woodFxConfig.leafSize || 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        if (p >= 0.85 && woodFxConfig.step5Enabled) {
          ctx.strokeStyle = "#14532d";
          ctx.lineWidth = 2.5;
          const rings = woodFxConfig.coilRings || 3;
          for (let r = 0; r < rings; r++) {
            ctx.beginPath();
            ctx.arc(eff.targetX, eff.targetY, 12 + r * 5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    // --- HỆ THỐNG CHIÊU DỪNG THỜI GIAN (5 BƯỚC + BÙNG NỔ KHI CHẠY LẠI) ---
    const timeStopState = {
      active: false,
      originX: 0,
      originY: 0,
      elapsed: 0,
      duration: 3.5,
      slowDuration: 0.50,
      timeScale: 1.0,
      timeScaleMin: 0.0,
      clockRadius: 60,
      handAngleMinute: 0,
      handAngleHour: -Math.PI / 2,
      handSpeed: 3.5,
      waveRadius: 0,
      waveSpeed: 320,
      desaturatePct: 100,
      suspendedDebris: [],
      glitterClock: 0,
      resumeFlashTimer: 0,
      gemBonuses: null
    };

    let timeStopScratchCanvas = null;
    let timeStopScratchCtx = null;

    function getTimeStopWorldScale() {
      return timeStopState.active ? timeStopState.timeScale : 1.0;
    }

    function spawnTimeStopSuspendedDebris(originX, originY, count) {
      timeStopState.suspendedDebris = [];
      const n = Math.max(0, Math.round(count));
      const palette = ["#94a3b8", "#cbd5e1", "#78716c", "#38bdf8", "#e0f2fe", "#a16207"];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 145;
        const px = Math.max(8, Math.min(MAP_SIZE - 8, originX + Math.cos(a) * dist));
        const py = Math.max(8, Math.min(MAP_SIZE - 8, originY + Math.sin(a) * dist));
        const kind = i % 3 === 0 ? "rock" : (i % 3 === 1 ? "shard" : "dust");
        timeStopState.suspendedDebris.push({
          x: px,
          y: py,
          z: 4 + Math.random() * 16,
          targetRise: 2 + Math.random() * 5,
          size: kind === "rock" ? (2.2 + Math.random() * 1.4) : (kind === "shard" ? 2.0 : (1.1 + Math.random() * 1.0)),
          rot: Math.random() * Math.PI * 2,
          color: palette[i % palette.length],
          kind,
          sparklePhase: Math.random() * Math.PI * 2,
          sparkleFreq: 0.8 + Math.random() * 0.7
        });
      }
    }

    function applyMobDamageWithTimeStop(mob, damage, opts = {}) {
      if (!mob || mob.hp <= 0) return { queued: false, died: false };
      const isTimeStoppedHit = Boolean(timeStopState.active && timestopFxConfig.step5Enabled);
      const mCx = mob.x + mob.width / 2;
      const mCy = mob.y + mob.height / 2;
      const hitAngle = opts.angle !== undefined ? opts.angle : Math.atan2(mCy - (player.y + 8), mCx - (player.x + 8));

      if (isTimeStoppedHit) {
        if (!mob.timeStopQueue) {
          mob.timeStopQueue = {
            totalDamage: 0,
            hitCount: 0,
            sumVx: 0,
            sumVy: 0,
            lastAngle: hitAngle,
            slashes: [],
            burnTimer: 0,
            burnSpread: false,
            slowTimer: 0,
            vampireHeal: 0
          };
        }
        const q = mob.timeStopQueue;
        q.totalDamage += damage;
        q.hitCount += 1;
        q.lastAngle = hitAngle;
        q.sumVx += Math.cos(hitAngle);
        q.sumVy += Math.sin(hitAngle);
        if (q.slashes.length < 10) {
          q.slashes.push({
            angle: hitAngle + (Math.random() - 0.5) * 0.45,
            ox: (Math.random() - 0.5) * 7,
            oy: (Math.random() - 0.5) * 7,
            color: opts.color || "#38bdf8",
            len: 7 + Math.random() * 5
          });
        }
        if (opts.burnTimer) q.burnTimer = Math.max(q.burnTimer, opts.burnTimer);
        if (opts.burnSpread) q.burnSpread = true;
        if (opts.slowTimer) q.slowTimer = Math.max(q.slowTimer, opts.slowTimer);
        if (opts.vampireHeal) q.vampireHeal += opts.vampireHeal;

        const label = opts.floatingText || `-${damage} ⏳`;
        const color = opts.color || "#38bdf8";
        addFloatingText(label, mob.x - 4, mob.y - 10 - Math.min(12, (q.hitCount - 1) * 3), color, Boolean(opts.isCrit));
        playTimeStopQueuedHitSound(q.hitCount);
        return { queued: true, died: false };
      }

      mob.hp -= damage;
      if (combatFxConfig.hitFlash) {
        mob.hurtFlashTimer = opts.flashDur || (combatFxConfig.hitFlashDuration || 0.065);
      }
      if (opts.burnTimer) {
        mob.burnTimer = Math.max(mob.burnTimer || 0, opts.burnTimer);
        mob.burnTickTimer = Math.min(mob.burnTickTimer || 0.55, 0.55);
        if (opts.burnSpread) mob.burnSpread = true;
      }
      if (opts.slowTimer) {
        mob.slowTimer = Math.max(mob.slowTimer || 0, opts.slowTimer);
      }
      if (opts.vampireHeal && opts.vampireHeal > 0 && player.hp < player.maxHp && player.action !== "die") {
        player.hp = Math.min(player.maxHp, player.hp + opts.vampireHeal);
        if (player.hp > player.displayHp) player.displayHp = player.hp;
        if (valPlayerHP) valPlayerHP.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
        addFloatingText(`+${opts.vampireHeal} HP 🩸`, player.x - 4, player.y - 14, "#f472b6", false);
      }
      return { queued: false, died: mob.hp <= 0 };
    }

    function detonateAndResumeTimeStop(silent = false) {
      if (!timeStopState.active) return;
      timeStopState.active = false;
      timeStopState.timeScale = 1.0;
      timeStopState.resumeFlashTimer = silent ? 0 : 0.28;

      if (!silent) {
        for (const d of timeStopState.suspendedDebris) {
          const a = Math.atan2(d.y - timeStopState.originY, d.x - timeStopState.originX);
          const burst = 35 + Math.random() * 55;
          combatParticles.push({
            x: d.x,
            y: d.y - d.z,
            vx: Math.cos(a) * burst,
            vy: Math.sin(a) * burst + 15,
            size: d.size,
            color: d.color,
            life: 0.35 + Math.random() * 0.2,
            maxLife: 0.55,
            isDebris: true
          });
        }
      }
      timeStopState.suspendedDebris = [];

      if (silent) {
        for (const mob of currentMobs) {
          delete mob.timeStopQueue;
        }
        return;
      }

      if (timestopFxConfig.step1Enabled || timestopFxConfig.step5Enabled) {
        groundShockwaves.push({
          x: timeStopState.originX,
          y: timeStopState.originY,
          radius: 10,
          maxRadius: Math.max(70, (timestopFxConfig.clockRadius || 60) * 1.6),
          life: 0.35,
          maxLife: 0.35,
          color: timestopFxConfig.glowColor || "#38bdf8",
          coreColor: "#ffffff"
        });
      }

      let totalQueuedMobs = 0;
      let totalVampHeal = 0;

      if (timestopFxConfig.step5Enabled) {
        const extraDmg = Math.max(0, Math.round(timestopFxConfig.resumeExplosionDamage || 0));
        const kbForce = Math.max(0, timestopFxConfig.knockbackForce || 130);
        const tsRadius = (timestopFxConfig.clockRadius || 60) * 1.45;
        const gb = timeStopState.gemBonuses;

        for (let mIdx = currentMobs.length - 1; mIdx >= 0; mIdx--) {
          const mob = currentMobs[mIdx];
          const q = mob.timeStopQueue;
          const mCx = mob.x + mob.width / 2;
          const mCy = mob.y + mob.height / 2;
          const distToOrigin = Math.hypot(mCx - timeStopState.originX, mCy - timeStopState.originY);
          const inRange = distToOrigin <= tsRadius;

          if (!q && (!inRange || extraDmg <= 0)) continue;

          totalQueuedMobs++;
          const stackedDmg = q ? q.totalDamage : 0;
          const gemBonusDmg = gb ? (gb.damageBonus || 0) : 0;
          const bonusDmg = extraDmg > 0 ? extraDmg + gemBonusDmg : 0;
          const totalBurst = stackedDmg + bonusDmg;

          mob.hp -= totalBurst;
          if (combatFxConfig.hitFlash) {
            mob.hurtFlashTimer = Math.max(combatFxConfig.hitFlashDuration || 0.08, 0.14);
          }
          if (q) {
            if (q.burnTimer > 0) {
              mob.burnTimer = Math.max(mob.burnTimer || 0, q.burnTimer);
              mob.burnTickTimer = Math.min(mob.burnTickTimer || 0.45, 0.45);
              if (q.burnSpread) mob.burnSpread = true;
            }
            if (q.slowTimer > 0) {
              mob.slowTimer = Math.max(mob.slowTimer || 0, q.slowTimer);
            }
            totalVampHeal += q.vampireHeal || 0;
          }
          if (gb && gb.burnStacks > 0) {
            mob.burnTimer = Math.max(mob.burnTimer || 0, 2.8);
            mob.burnTickTimer = Math.min(mob.burnTickTimer || 0.45, 0.45);
            if (gb.burnSpread) mob.burnSpread = true;
          }
          if (gb && gb.frostStacks > 0) {
            mob.slowTimer = Math.max(mob.slowTimer || 0, 2.6);
          }

          let kbAngle = Math.atan2(mCy - timeStopState.originY, mCx - timeStopState.originX);
          if (q && (Math.abs(q.sumVx) > 0.05 || Math.abs(q.sumVy) > 0.05)) {
            kbAngle = Math.atan2(q.sumVy, q.sumVx);
          }

          if (kbForce > 0) {
            const launchSpeed = kbForce * 1.95;
            mob.knockbackVx = Math.cos(kbAngle) * launchSpeed;
            mob.knockbackVy = Math.sin(kbAngle) * launchSpeed;
            mob.knockbackTimer = 0.36;
          }

          delete mob.timeStopQueue;

          spawnMagicHitBurst(mCx, mCy, kbAngle, "#38bdf8", "#fde047", 18);
          spawnHitSparks(mCx, mCy, kbAngle);

          const hitSuffix = q && q.hitCount > 0 ? ` (${q.hitCount}× DỒN ĐÒN!)` : " ⏳";
          addFloatingText(`-${totalBurst} HP 💥${hitSuffix}`, mob.x - 16, mob.y - 16, "#fde047", true);

          if (mob.hp <= 0) {
            currentMobs.splice(mIdx, 1);
            handleMobDeath(mob, mCx, mCy);
          }
        }

        if (totalVampHeal > 0 && player.hp < player.maxHp && player.action !== "die") {
          const healAmt = Math.round(totalVampHeal);
          player.hp = Math.min(player.maxHp, player.hp + healAmt);
          if (player.hp > player.displayHp) player.displayHp = player.hp;
          if (valPlayerHP) valPlayerHP.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
          addFloatingText(`+${healAmt} HP 🩸`, player.x - 4, player.y - 14, "#f472b6", false);
        }

        if (totalQueuedMobs > 0) {
          triggerHitJuice(timestopFxConfig.shakeIntensity || 12, 0, 0.32, 3);
          addFloatingText("⏳ THỜI GIAN CHẠY LẠI!", timeStopState.originX - 42, timeStopState.originY - 26, "#38bdf8", true);
        } else {
          triggerHitJuice(Math.max(4, Math.round((timestopFxConfig.shakeIntensity || 12) * 0.5)), 0, 0.22, 0);
        }
      }

      playTimeStopResumeSound(totalQueuedMobs > 0);
    }

    function castTimestopSpell(aimAngle, clickWorldPos = null, gemBonuses = null) {
      if (timeStopState.active) {
        detonateAndResumeTimeStop(false);
        return;
      }

      const ox = player.x + player.width / 2;
      const oy = player.y + player.height - 2;

      timeStopState.active = true;
      timeStopState.originX = ox;
      timeStopState.originY = oy;
      timeStopState.elapsed = 0;
      timeStopState.slowDuration = timestopFxConfig.step2Enabled ? Math.max(0.05, timestopFxConfig.slowDuration || 0.50) : 0;
      timeStopState.duration = Math.max(0.6, timestopFxConfig.duration || 3.5);
      timeStopState.timeScaleMin = Math.max(0, Math.min(0.4, timestopFxConfig.timeScaleMin !== undefined ? timestopFxConfig.timeScaleMin : 0));
      timeStopState.timeScale = timestopFxConfig.step2Enabled ? 1.0 : timeStopState.timeScaleMin;
      timeStopState.clockRadius = Math.max(24, timestopFxConfig.clockRadius || 60);
      timeStopState.handSpeed = Math.max(0.5, timestopFxConfig.handSpeed || 3.5);
      timeStopState.handAngleMinute = -Math.PI / 2;
      timeStopState.handAngleHour = -Math.PI * 0.85;
      timeStopState.waveRadius = 2;
      timeStopState.waveSpeed = Math.max(80, timestopFxConfig.waveSpeed || 320);
      timeStopState.desaturatePct = Math.max(0, Math.min(100, timestopFxConfig.desaturatePct || 100));
      timeStopState.glitterClock = 0;
      timeStopState.resumeFlashTimer = 0;
      timeStopState.gemBonuses = gemBonuses;

      if (timestopFxConfig.step4Enabled) {
        spawnTimeStopSuspendedDebris(ox, oy, timestopFxConfig.debrisCount || 22);
      } else {
        timeStopState.suspendedDebris = [];
      }

      addFloatingText("⏳ DỪNG THỜI GIAN!", player.x - 24, player.y - 18, "#38bdf8", true);
    }

    function updateTimeStopEffect(realDt) {
      if (timeStopState.resumeFlashTimer > 0) {
        timeStopState.resumeFlashTimer = Math.max(0, timeStopState.resumeFlashTimer - realDt);
      }
      if (!timeStopState.active) return;

      timeStopState.elapsed += realDt;
      timeStopState.glitterClock += realDt;

      // Bước 2: Tốc độ thời gian giảm từ 1 về 0 trong slowDuration (Ease-Out)
      if (timestopFxConfig.step2Enabled && timeStopState.slowDuration > 0) {
        const t = Math.min(1, timeStopState.elapsed / timeStopState.slowDuration);
        const easeOut = 1 - Math.pow(1 - t, 3);
        timeStopState.timeScale = 1 - (1 - timeStopState.timeScaleMin) * easeOut;
        if (t >= 1) {
          timeStopState.timeScale = timeStopState.timeScaleMin;
        }
      } else {
        timeStopState.timeScale = timeStopState.timeScaleMin;
      }

      // Bước 1: Kim đồng hồ quay nhanh rồi chậm dần theo tốc độ thời gian và dừng hẳn
      const spinFactor = timeStopState.timeScale;
      if (spinFactor > 0.002) {
        const angularSpeed = timeStopState.handSpeed * Math.PI * 2 * spinFactor;
        timeStopState.handAngleMinute += angularSpeed * realDt;
        timeStopState.handAngleHour += angularSpeed * 0.18 * realDt;
      }

      // Bước 3: Sóng mất màu lan tròn ra khắp bản đồ
      if (timestopFxConfig.step3Enabled) {
        timeStopState.waveRadius += timeStopState.waveSpeed * realDt;
      }

      // Bước 4: Mảnh vụn nhô nhẹ khi đang chậm dần rồi lơ lửng đứng yên giữa không trung
      if (timestopFxConfig.step4Enabled && timeStopState.slowDuration > 0) {
        const t = Math.min(1, timeStopState.elapsed / timeStopState.slowDuration);
        if (t < 1) {
          const liftRate = (1 - t) * realDt * 2.5;
          for (const d of timeStopState.suspendedDebris) {
            d.z += d.targetRise * liftRate;
          }
        }
      }

      const totalLifetime = timeStopState.duration;
      if (timeStopState.elapsed >= totalLifetime) {
        detonateAndResumeTimeStop(false);
      }
    }

    function applyTimeStopGrayscaleWave(ctx, activeZoom, snapPx) {
      if (!timestopFxConfig.step3Enabled) return;
      if (!timeStopState.active && timeStopState.resumeFlashTimer <= 0) return;

      const w = canvas.width;
      const h = canvas.height;
      if (w <= 0 || h <= 0) return;

      if (!timeStopScratchCanvas) {
        timeStopScratchCanvas = document.createElement("canvas");
        timeStopScratchCtx = timeStopScratchCanvas.getContext("2d");
      }
      if (timeStopScratchCanvas.width !== w || timeStopScratchCanvas.height !== h) {
        timeStopScratchCanvas.width = w;
        timeStopScratchCanvas.height = h;
      }
      if (!timeStopScratchCtx) return;

      const snappedCamX = snapPx(camera.x);
      const snappedCamY = snapPx(camera.y);
      const originScreenX = (timeStopState.originX - snappedCamX) * activeZoom;
      const originScreenY = (timeStopState.originY - snappedCamY) * activeZoom;
      const screenWaveRadius = Math.max(1, timeStopState.waveRadius * activeZoom);

      let pct = timestopFxConfig.desaturatePct || 100;
      if (!timeStopState.active && timeStopState.resumeFlashTimer > 0) {
        pct *= Math.max(0, timeStopState.resumeFlashTimer / 0.28);
      }
      if (pct <= 1) return;

      timeStopScratchCtx.clearRect(0, 0, w, h);
      timeStopScratchCtx.drawImage(canvas, 0, 0);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.arc(originScreenX, originScreenY, screenWaveRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = `grayscale(${pct.toFixed(0)}%) contrast(1.06) brightness(0.90)`;
      ctx.drawImage(timeStopScratchCanvas, 0, 0);
      ctx.restore();
    }

    function renderTimeStopGroundEffects(ctx) {
      if (!timeStopState.active || !timestopFxConfig.step1Enabled) return;

      const elapsed = timeStopState.elapsed;
      const spreadT = Math.min(1, elapsed / 0.26);
      const spreadEase = 1 - Math.pow(1 - spreadT, 2.4);
      const r = timeStopState.clockRadius * spreadEase;
      const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.008);
      const glowCol = timestopFxConfig.glowColor || "#38bdf8";

      ctx.save();
      ctx.translate(timeStopState.originX, timeStopState.originY);
      ctx.scale(1, 0.68); // 2.5D nằm trên mặt đất

      // Quầng sáng mặt đồng hồ loang ra dưới đất
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(4, r));
      grad.addColorStop(0, "rgba(224, 242, 254, 0.36)");
      grad.addColorStop(0.55, "rgba(56, 189, 248, 0.24)");
      grad.addColorStop(0.88, "rgba(14, 165, 233, 0.12)");
      grad.addColorStop(1, "rgba(14, 165, 233, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Vòng viền ngoài kép + vòng bánh răng bên trong
      ctx.strokeStyle = glowCol;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(224, 242, 254, ${0.75 * pulse})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(186, 230, 253, 0.45)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      // 12 vạch giờ và 24 vạch chia nhỏ
      for (let h = 0; h < 12; h++) {
        const a = (Math.PI * 2 * h) / 12;
        const inner = (h % 3 === 0) ? r * 0.72 : r * 0.80;
        ctx.strokeStyle = (h % 3 === 0) ? "#ffffff" : "#bae6fd";
        ctx.lineWidth = (h % 3 === 0) ? 1.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94);
        ctx.stroke();
      }

      // Kim giờ & Kim phút quay rồi dừng hẳn
      const isStopped = timeStopState.timeScale <= 0.01;
      const handCol = isStopped ? "#fde047" : "#ffffff";

      // Kim giờ
      ctx.strokeStyle = handCol;
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(timeStopState.handAngleHour) * r * 0.46, Math.sin(timeStopState.handAngleHour) * r * 0.46);
      ctx.stroke();

      // Kim phút
      ctx.strokeStyle = isStopped ? "#fef08a" : "#e0f2fe";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(timeStopState.handAngleMinute) * r * 0.12, -Math.sin(timeStopState.handAngleMinute) * r * 0.12);
      ctx.lineTo(Math.cos(timeStopState.handAngleMinute) * r * 0.74, Math.sin(timeStopState.handAngleMinute) * r * 0.74);
      ctx.stroke();

      // Trục tâm đồng hồ phát sáng
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function renderTimeStopAirEffects(ctx) {
      if (timeStopState.resumeFlashTimer > 0) {
        const a = Math.max(0, timeStopState.resumeFlashTimer / 0.28);
        ctx.save();
        ctx.strokeStyle = `rgba(186, 230, 253, ${a * 0.8})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(timeStopState.originX, timeStopState.originY, (1 - a) * 140 + 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (!timeStopState.active) return;

      // Bước 3: Viền sóng mất màu lan tròn rực rỡ trên mặt trận sóng
      if (timestopFxConfig.step3Enabled && timeStopState.waveRadius < 680) {
        const wr = timeStopState.waveRadius;
        ctx.save();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(timeStopState.originX, timeStopState.originY, wr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(timeStopState.originX, timeStopState.originY, Math.max(1, wr - 2.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Bước 4: Bụi, đá, mảnh vụn đứng yên lơ lửng giữa không trung & lấp lánh
      if (timestopFxConfig.step4Enabled) {
        const rate = Math.max(0.03, timestopFxConfig.glitterRate || 0.12);
        const speedMul = (0.12 / rate) * 3.8;
        const gClk = timeStopState.glitterClock * speedMul;

        for (const d of timeStopState.suspendedDebris) {
          const py = d.y - d.z;
          ctx.save();
          // Bóng nhỏ dưới mặt đất thể hiện vật đang lơ lửng trên không
          ctx.fillStyle = "rgba(15, 23, 42, 0.36)";
          ctx.beginPath();
          ctx.ellipse(d.x, d.y + 1, d.size * 0.7, d.size * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(d.x, py);
          ctx.rotate(d.rot);
          ctx.fillStyle = d.color;
          if (d.kind === "shard") {
            ctx.beginPath();
            ctx.moveTo(0, -d.size);
            ctx.lineTo(d.size * 0.7, 0);
            ctx.lineTo(0, d.size);
            ctx.lineTo(-d.size * 0.7, 0);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
          }

          // Tia lấp lánh (sparkle glint)
          const glint = Math.sin(gClk * d.sparkleFreq + d.sparklePhase);
          if (glint > 0.55) {
            const gAlpha = Math.min(1, (glint - 0.55) / 0.45);
            const arm = d.size * (1.1 + gAlpha * 0.8);
            ctx.rotate(-d.rot);
            ctx.fillStyle = `rgba(255, 255, 255, ${gAlpha})`;
            ctx.fillRect(-arm, -0.4, arm * 2, 0.8);
            ctx.fillRect(-0.4, -arm, 0.8, arm * 2);
          }
          ctx.restore();
        }
      }

      // Bước 5: Vẽ dấu vết chém ngưng đọng & bộ đếm dồn đòn trên đầu quái bị đánh
      if (timestopFxConfig.step5Enabled) {
        for (const mob of currentMobs) {
          const q = mob.timeStopQueue;
          if (!q || q.hitCount <= 0) continue;
          const mCx = mob.x + mob.width / 2;
          const mCy = mob.y + mob.height / 2;

          ctx.save();
          // Vết cắt ánh sáng đóng băng tại vị trí đòn đánh
          for (const sl of q.slashes) {
            ctx.save();
            ctx.translate(mCx + sl.ox, mCy + sl.oy);
            ctx.rotate(sl.angle);
            ctx.strokeStyle = sl.color;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-sl.len, 0);
            ctx.lineTo(sl.len, 0);
            ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(-sl.len * 0.7, 0);
            ctx.lineTo(sl.len * 0.7, 0);
            ctx.stroke();
            ctx.restore();
          }

          // Huy hiệu Dồn Đòn trên đầu mục tiêu
          const badgeY = mob.y - 11;
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.fillRect(mCx - 14, badgeY - 5, 28, 7.5);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 0.7;
          ctx.strokeRect(mCx - 14, badgeY - 5, 28, 7.5);
          ctx.fillStyle = "#fde047";
          ctx.font = "bold 5.5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`⏳-${q.totalDamage}`, mCx, badgeY + 0.5);
          ctx.restore();
        }
      }
    }

    // -------------------------------------------------------------
    // 2. TÚI ĐỒ & THANH HOTBAR (INVENTORY SYSTEM, MINECRAFT CLICKS & DOM OVERLAY)
    // -------------------------------------------------------------
    let currentMap = "home";
    let isPaused = false; // Trạng thái tạm dừng game khi mở bảng UI
    let activeHotbarIndex = 0; // Theo dõi ô đang chọn trên thanh Hotbar (0 đến 8)

    const MAX_STACK = 64; // Giới hạn xếp chồng tối đa chuẩn Minecraft
    let cursorItem = null; // Vật phẩm đang được nhấc lên bởi con trỏ chuột

    const inventory = {
      wood: 0,
      stone: 0,
      meat: 0
    };

    // Mảng toàn cục 36 phần tử chứa dữ liệu túi đồ:
    // - Chỉ số 0 đến 8: 9 ô thanh Hotbar (luôn hiển thị ở đáy màn hình)
    // - Chỉ số 9 đến 35: 27 ô kho đồ chính (Storage Section 3x9)
    const playerInventory = new Array(36).fill(null);

    // Mảng 9 ô cho Lưới Chế Tạo (Crafting Grid 3x3) và 1 ô Kết Quả Chế Tạo
    // Quản lý chế độ giao diện: 'pocket' (túi đồ cá nhân 2x2 khi bấm E) hoặc 'workstation' (bàn chế tạo 3x3 + lò rèn)
    let currentUIMode = 'pocket';

    // Mảng cho Chế Tạo Cá Nhân (Pocket 2x2 = 4 ô) và Kết Quả 2x2
    const pocketCraftingInventory = new Array(4).fill(null);
    let pocketCraftResultItem = null;

    // Mảng cho Bàn Chế Tạo (Workstation 3x3 = 9 ô) và Kết Quả 3x3
    const workstationCraftingInventory = new Array(9).fill(null);
    let workstationCraftResultItem = null;

    // Con trỏ tương thích alias cho craftingInventory
    const craftingInventory = workstationCraftingInventory;
    let craftResultItem = null;

    // Mảng 2 ô cho Lò Rèn Nâng Cấp: ô 0 = Trang bị cần rèn, ô 1 = Nguyên liệu rèn
    const forgeInventory = new Array(2).fill(null);
    let forgeResultItem = null;

    // Theo dõi người chơi đang mở bàn chế tạo gần (gần Bàn Chế Tạo thật trên map) hay túi đồ 2x2 cá nhân
    let isNearCraftingTable = false;

    // Biến quản lý trạng thái kéo giữ chuột trái trượt qua các ô để rải đều 1 vật phẩm (Mouse Drag Distribution)
    let isMouseDraggingLeft = false;
    let draggedSlotKeys = new Set(); // Lưu các ô đã được trượt qua trong 1 lần giữ chuột
    let dragStartSlotInfo = null; // Lưu thông tin ô bắt đầu nhấn chuột xuống { type, slotIndex, startX, startY }
    let hasMovedMouseDuringDrag = false; // Đánh dấu đã di chuyển chuột hay chỉ click tĩnh tại chỗ


    // -------------------------------------------------------------
    // HỆ THỐNG ĐẠN & BẮN CUNG (PROJECTILE SYSTEM)
    // -------------------------------------------------------------
    const activeProjectiles = [];

    // Hệ thống gồng lực kéo Cung & Vung Đũa Phép 8 hướng
    let isBowCharging = false;
    const WAND_CAST_DURATION = 0.34;
    let wandCastTimer = 0;
    let wandCastAngle = Math.PI / 2;
    let pendingPointerAimAngle = null;
    let pendingPointerWorldPos = null;
    const wandSkillCooldowns = [0, 0, 0];
    const wandSkillMaxCooldowns = [0, 0, 0];
    let lastCanvasMouseWorld = null;
    let isHoveringWandAltar = false;
    let wandAltarTriggerLock = false;
    const DASH_DURATION = 0.16;
    const DASH_COOLDOWN = 1.4;
    let dashTimer = 0;
    let dashCooldown = 0;
    let dashDirX = 0;
    let dashDirY = 0;
    let dashTrailTimer = 0;
    let bowChargeTimer = 0;       // Thời gian gồng hiện tại (giây)
    const BOW_MIN_CHARGE = 0.5;   // Gồng < 0.5s: 5 Sát thương
    const BOW_MAX_CHARGE = 1.5;   // Gồng >= 0.5s đến 1.5s: 10 Sát thương (Tối đa)
    // Nếu gồng > 1.5s: Mũi tên quá căng bị gãy!
    let bowAimAngle = 0;          // Góc nhắm theo 8 hướng di chuyển hoặc hướng nhìn

    function snapTo8Directions(angle) {
      return Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    }

    function angleToPlayerFacing(angle) {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      if (Math.abs(sinA) >= Math.abs(cosA) - 0.05) {
        return sinA >= 0 ? 'down' : 'up';
      }
      return cosA >= 0 ? 'right' : 'left';
    }

    function getWandHandAnchor(angle, bobY = 0) {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cx = player.x + player.width / 2;
      const shoulderOffset = (Math.abs(sinA) > 0.85) ? (sinA > 0 ? 3.5 : 4.0) : 0;
      const handX = cx + cosA * 4.5 + shoulderOffset;
      const handY = (player.y + 6 + bobY) + sinA * 3.0;
      return { handX, handY, cosA, sinA };
    }

    // -------------------------------------------------------------
    // HỆ THỐNG CÂU CÁ 8 HƯỚNG XUỐNG MẶT NƯỚC (FISHING SYSTEM)
    // -------------------------------------------------------------
    let pendingFishingClickPos = null;
    const fishingState = {
      phase: "idle", // 'idle' | 'casting' | 'waiting' | 'biting' | 'reeling'
      angle: Math.PI / 2,
      slotIdx: -1,
      timer: 0,
      castDuration: 0.28,
      waitDuration: 2.2,
      biteTimer: 0,
      biteWindow: 1.6,
      reelDuration: 0.25,
      startX: 0,
      startY: 0,
      bobberX: 0,
      bobberY: 0,
      rippleTimer: 0,
      ripples: [],
      fishShadow: { active: false, x: 0, y: 0, startX: 0, startY: 0, progress: 0 },
      caughtArc: null
    };

    function isWaterTileAt(px, py, mapId = null) {
      if (px < 0 || py < 0 || px >= MAP_SIZE || py >= MAP_SIZE) return false;
      const m = mapId || currentMap;
      const col = Math.floor(px / TILE_SIZE);
      const row = Math.floor(py / TILE_SIZE);

      if (m === "lake") {
        if (!lakeLandGrid) return false;
        if (row < 0 || row >= lakeLandGrid.length || col < 0 || col >= lakeLandGrid[0].length) return false;
        return !lakeLandGrid[row][col];
      }

      const mapObj = (m === "forest") ? forestMapData : homeMapData;
      if (!mapObj || !mapObj.layerInstances) return false;
      const cWid = mapObj.widthInTiles || 32;
      const cHei = mapObj.heightInTiles || 32;
      if (col < 0 || col >= cWid || row < 0 || row >= cHei) return false;
      const water = mapObj.layerInstances.find(l => l.__identifier === "Water");
      return Boolean(water && water.intGridCsv && water.intGridCsv[row * cWid + col] > 0);
    }

    function findWaterCastTarget(aimAngle, clickWorld = null) {
      const pCx = player.x + player.width / 2;
      const pCy = player.y + player.height / 2;

      // 1. Nếu người chơi click chuột trực tiếp vào ô nước trong tầm quăng
      if (clickWorld && isWaterTileAt(clickWorld.x, clickWorld.y)) {
        const dist = Math.hypot(clickWorld.x - pCx, clickWorld.y - pCy);
        if (dist >= 12 && dist <= 80) {
          return {
            x: clickWorld.x,
            y: clickWorld.y,
            angle: Math.atan2(clickWorld.y - pCy, clickWorld.x - pCx)
          };
        }
      }

      // 2. Dò tia theo hướng đang ngắm (kèm lệch nhẹ ±18° cho bờ cong)
      const angleOffsets = [0, 0.31, -0.31];
      for (const offset of angleOffsets) {
        const testAngle = aimAngle + offset;
        const cosA = Math.cos(testAngle);
        const sinA = Math.sin(testAngle);
        for (let d = 16; d <= 68; d += 4) {
          const tx = pCx + cosA * d;
          const ty = pCy + sinA * d;
          if (isWaterTileAt(tx, ty)) {
            // Đẩy phao vào sâu thêm chút giữa ô nước nếu vẫn là nước
            let bestX = tx;
            let bestY = ty;
            for (const extra of [12, 8, 4]) {
              const ex = pCx + cosA * Math.min(70, d + extra);
              const ey = pCy + sinA * Math.min(70, d + extra);
              if (isWaterTileAt(ex, ey)) {
                bestX = ex;
                bestY = ey;
                break;
              }
            }
            return { x: bestX, y: bestY, angle: testAngle };
          }
        }
      }
      return null;
    }

    function spawnWaterRipple(x, y, maxR = 9, color = "rgba(224, 242, 254, 0.85)") {
      fishingState.ripples.push({
        x, y,
        r: 1.5,
        maxR,
        life: 0.55,
        maxLife: 0.55,
        color
      });
    }

    function resetFishingState(reasonText = null) {
      if (fishingState.phase !== "idle") {
        fishingState.phase = "idle";
        fishingState.timer = 0;
        fishingState.biteTimer = 0;
        fishingState.fishShadow.active = false;
        if (reasonText) {
          addFloatingText(reasonText, player.x - 10, player.y - 12, "#94a3b8");
        }
        if (window.onMobileHudSync) window.onMobileHudSync();
      }
    }

    window.getFishingPhase = function () {
      return fishingState.phase;
    };

    function rollFishingLoot() {
      const inLake = currentMap === "lake";
      const r = Math.random();
      if (inLake) {
        if (r < 0.04) return { id: "spell_gravity", name: SPELLS_DATABASE.spell_gravity.name, quantity: 1, tag: "⬇✨", rare: true };
        if (r < 0.10) return { id: "gem_frost", name: "Ngọc Băng Sương", quantity: 1, tag: "❄️💎", rare: true };
        if (r < 0.14) return { id: "gem_haste", name: "Ngọc Tốc Độ", quantity: 1, tag: "💨💎", rare: true };
        if (r < 0.45) return { id: "raw_fish", name: "Cá Tươi", quantity: Math.random() < 0.25 ? 2 : 1, tag: "🐟" };
        if (r < 0.64) return { id: "golden_fish", name: "Cá Vàng Quý", quantity: 1, tag: "✨🐟", rare: true };
        if (r < 0.77) return { id: "gold_nugget", name: "Mảnh Vàng", quantity: 1, tag: "🪙", rare: true };
        if (r < 0.87) return { id: "iron_ore", name: "Quặng Sắt", quantity: Math.random() < 0.35 ? 2 : 1, tag: "⛏️" };
        if (r < 0.94) return { id: "coal", name: "Than Đá", quantity: 2, tag: "🪨" };
        return { id: "diamond", name: "Kim Cương", quantity: 1, tag: "💎", rare: true };
      } else {
        if (r < 0.06) return { id: "gem_frost", name: "Ngọc Băng Sương", quantity: 1, tag: "❄️💎", rare: true };
        if (r < 0.50) return { id: "raw_fish", name: "Cá Tươi", quantity: 1, tag: "🐟" };
        if (r < 0.63) return { id: "golden_fish", name: "Cá Vàng Quý", quantity: 1, tag: "✨🐟", rare: true };
        if (r < 0.75) return { id: "plant_fiber", name: "Sợi Dây Gai", quantity: 2, tag: "🌿" };
        if (r < 0.85) return { id: "coal", name: "Than Đá", quantity: 1, tag: "🪨" };
        if (r < 0.92) return { id: "iron_ore", name: "Quặng Sắt", quantity: 1, tag: "⛏️" };
        if (r < 0.97) return { id: "gold_nugget", name: "Mảnh Vàng", quantity: 1, tag: "🪙", rare: true };
        return { id: "diamond", name: "Kim Cương", quantity: 1, tag: "💎", rare: true };
      }
    }

    function getFishingRodGeometry(angle, bobY = 0) {
      const { handX, handY, cosA, sinA } = getWandHandAnchor(angle, bobY);
      const facingLeft = (cosA < -0.15);

      let tiltOffset = -0.35;
      let bend = 0;
      let thrust = 0;

      if (fishingState.phase === "casting") {
        const p = Math.min(1, fishingState.timer / fishingState.castDuration);
        if (p < 0.35) {
          const back = p / 0.35;
          tiltOffset = -0.35 - 0.85 * back;
          thrust = -1.5 * back;
          bend = -1.5 * back;
        } else {
          const fwd = (p - 0.35) / 0.65;
          const ease = 1 - Math.pow(1 - fwd, 3);
          tiltOffset = -1.20 + 1.45 * ease;
          thrust = -1.5 + 4.2 * Math.sin(fwd * Math.PI * 0.75);
          bend = 3.2 * Math.sin(fwd * Math.PI);
        }
      } else if (fishingState.phase === "waiting") {
        tiltOffset = -0.38 + Math.sin(performance.now() * 0.004) * 0.04;
        bend = 0.8;
      } else if (fishingState.phase === "biting") {
        const tug = Math.sin(performance.now() * 0.032);
        tiltOffset = -0.08 + tug * 0.16;
        bend = 4.2 + tug * 1.4;
      } else if (fishingState.phase === "reeling") {
        const p = Math.min(1, fishingState.timer / fishingState.reelDuration);
        tiltOffset = -0.25 - 0.7 * Math.sin(p * Math.PI * 0.7);
        bend = 2.6 * (1 - p);
      }

      const swingDir = (sinA < -0.85 && Math.abs(cosA) < 0.35) ? -1 : 1;
      const rodAngle = angle + tiltOffset * swingDir * (facingLeft ? -1 : 1);
      const foreshorten = 1.0 - Math.abs(Math.sin(rodAngle)) * 0.22;
      const rodLen = 17.5 * foreshorten;

      const baseX = handX + cosA * thrust;
      const baseY = handY + sinA * thrust;
      const rCos = Math.cos(rodAngle);
      const rSin = Math.sin(rodAngle);
      // Vector vuông góc hướng xuống để tạo độ cong ngọn cần chân thực
      const tipX = baseX + rCos * rodLen;
      const tipY = baseY + rSin * rodLen + bend * 0.65;

      return { baseX, baseY, tipX, tipY, rodAngle, foreshorten, bend, cosA, sinA };
    }


    // Hàm giảm độ bền của trang bị đang cầm trên tay
    function degradeEquippedItem(slotIdx = activeHotbarIndex) {
      const item = playerInventory[slotIdx];
      if (!item) return;
      if (item.durability !== undefined) {
        item.durability -= 1;
        if (item.durability <= 0) {
          playImpactSound(true);
          addFloatingText("💥 " + item.name + " ĐÃ GÃY!", player.x - 10, player.y - 20, "#ef4444", true);
          playerInventory[slotIdx] = null;
        }
        renderHotbar();
      }
    }

    // Hàm bắn tên từ Cung Săn
    
    // Lưu trữ góc nhắm bắn gần nhất của người chơi (khởi tạo hướng xuống)
    let lastAimAngle = Math.PI / 2;
    let lastAimVector = { vx: 0, vy: 1, angle: Math.PI / 2 };

    // Giải quyết tổ hợp phím di chuyển 8 hướng (ưu tiên phím bấm sau nếu bấm cả 2 hướng đối nghịch lên/xuống hoặc trái/phải)
    function getMoveAxesFromKeys() {
      let mx = 0, my = 0;

      if (keys.left && keys.right) {
        mx = (lastHorizontalDir === 'left') ? -1 : 1;
      } else if (keys.left) {
        mx = -1;
      } else if (keys.right) {
        mx = 1;
      }

      if (keys.up && keys.down) {
        my = (lastVerticalDir === 'up') ? -1 : 1;
      } else if (keys.up) {
        my = -1;
      } else if (keys.down) {
        my = 1;
      }

      return { mx, my };
    }

    function getPlayerAimVector() {
      const { mx, my } = getMoveAxesFromKeys();

      if (mx !== 0 || my !== 0) {
        lastAimAngle = Math.atan2(my, mx);
        return { vx: mx, vy: my, angle: lastAimAngle };
      }

      // Nếu đang đứng yên: ưu tiên lastAimAngle đã ghi nhận gần nhất
      if (lastAimAngle !== undefined && lastAimAngle !== null) {
        return { vx: Math.cos(lastAimAngle), vy: Math.sin(lastAimAngle), angle: lastAimAngle };
      }

      // Fallback theo playerFacing
      if (playerFacing === 'right') return { vx: 1, vy: 0, angle: 0 };
      if (playerFacing === 'left') return { vx: -1, vy: 0, angle: Math.PI };
      if (playerFacing === 'up') return { vx: 0, vy: -1, angle: -Math.PI / 2 };
      return { vx: 0, vy: 1, angle: Math.PI / 2 }; // down
    }

        // Hàm bắn tên từ Cung Săn (Hỗ trợ sát thương theo thời gian gồng & hướng 8 chiều)
    function tryShootBow(equippedItem, customDamage = 1, customAngle = null) {
      let arrowSlot = -1;
      for (let i = 0; i < playerInventory.length; i++) {
        if (playerInventory[i] && (playerInventory[i].id === 'arrow' || playerInventory[i].name === 'Mũi Tên') && playerInventory[i].quantity > 0) {
          arrowSlot = i;
          break;
        }
      }

      if (arrowSlot === -1) {
        addFloatingText("❌ HẾT MŨI TÊN!", player.x - 10, player.y - 12, "#ef4444");
        showNotification("Bạn không có Mũi Tên trong túi đồ để bắn!", true);
        return false;
      }

      // Tiêu hao 1 mũi tên
      playerInventory[arrowSlot].quantity -= 1;
      if (playerInventory[arrowSlot].quantity <= 0) {
        playerInventory[arrowSlot] = null;
      }
      renderHotbar();

      // Giảm độ bền cung
      degradeEquippedItem(activeHotbarIndex);

      const aim = getPlayerAimVector();
      const angle = (customAngle !== null) ? customAngle : aim.angle;
      const speed = 280; // Tốc độ bay 280px/s
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const spawnX = player.x + player.width / 2;
      const spawnY = player.y + player.height / 2;

      activeProjectiles.push({
        x: spawnX,
        y: spawnY,
        vx: vx,
        vy: vy,
        angle: angle,
        damage: customDamage, // 5 damage (<0.5s) hoặc 10 damage (0.5s - 1.5s)
        traveled: 0,
        maxRange: 320,
        width: 16,
        height: 6
      });

      playImpactSound(false);
      return true;
    }

    const playerEquipment = new Array(4).fill(null); // 0: Nón, 1: Áo, 2: Quần, 3: Giày

    // Chỉ số Giáp và Máu hiện tại
    const BASE_PLAYER_ARMOR = 50;
    let playerArmor = BASE_PLAYER_ARMOR;
    let playerMaxArmor = BASE_PLAYER_ARMOR;
    let playerDisplayArmor = BASE_PLAYER_ARMOR;
    let playerOutOfCombatTimer = 0;

    
    // -------------------------------------------------------------
    // HỆ THỐNG LỬA TRẠI (CAMPFIRE)
    // -------------------------------------------------------------
    

    // -------------------------------------------------------------
    // BƯỚC 1: HỆ THỐNG TÀI KHOẢN, LƯU TRỮ (SAVE/LOAD) & CHỢ REALTIME
    // -------------------------------------------------------------
    const STORAGE_PROFILE_KEY = "game2d_active_profile_v1";
    const STORAGE_MARKET_KEY = "game2d_shared_market_v1";
    const STORAGE_PAYOUTS_KEY = "game2d_market_payouts_v1";
    const marketChannel = (typeof BroadcastChannel !== "undefined") ? new BroadcastChannel("game2d_market_realtime") : null;

    let currentPlayerProfile = { id: "p_" + Math.random().toString(36).slice(2, 8), name: "Lữ Khách" };

    
    // -------------------------------------------------------------
    // BƯỚC 2: KẾT NỐI FIREBASE FIRESTORE (CLOUD SAVE + CHỢ REALTIME)
    // -------------------------------------------------------------
    let fbDb = null;
    let fbMarketUnsub = null;

    function initFirebaseIfConfigured() {
      try {
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || !cfg.apiKey || cfg.apiKey === "YOUR_API_KEY" || typeof firebase === "undefined") {
          return false;
        }
        if (!firebase.apps.length) firebase.initializeApp(cfg);
        fbDb = firebase.firestore();
        console.log("🔥 Firebase Firestore đã kết nối!");
        return true;
      } catch (e) {
        console.warn("Firebase init skipped:", e);
        return false;
      }
    }

    let fbPlayerSnapUnsub = null;
    let currentAuthMode = "register"; // "register" | "login"
    let lastSavedTimeStr = "Chưa lưu";

    function simpleHashPassword(pw) {
      let h = 2166136261 >>> 0;
      const s = String(pw || "");
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return "h_" + (h >>> 0).toString(16);
    }

    function normalizeUsername(raw) {
      return String(raw || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    }

    function exportPlacedStructures() {
      const result = { home: [], forest: [], lake: [] };
      try {
        if (typeof mapConfigs === "undefined" || !mapConfigs) return result;
        ["home", "forest", "lake"].forEach((mKey) => {
          const arr = mapConfigs[mKey] && Array.isArray(mapConfigs[mKey].harvestables)
            ? mapConfigs[mKey].harvestables
            : [];
          arr.forEach((obj) => {
            if (obj && (obj.type === "crafting_table" || obj.type === "chest")) {
              const savedObj = {
                type: obj.type,
                x: obj.x,
                y: obj.y,
                width: obj.width || 16,
                height: obj.height || 16,
                name: obj.name || (obj.type === "chest" ? "Rương Đồ" : "Bàn Chế Tạo")
              };
              if (obj.type === "chest" && Array.isArray(obj.items || obj.inventory)) {
                savedObj.items = obj.items || obj.inventory;
              }
              result[mKey].push(savedObj);
            }
          });
        });
      } catch (e) {}
      return result;
    }

    function applyPlacedStructures(placedData) {
      try {
        if (!placedData || typeof mapConfigs === "undefined" || !mapConfigs) return;
        ["home", "forest", "lake"].forEach((mKey) => {
          if (!mapConfigs[mKey] || !Array.isArray(mapConfigs[mKey].harvestables)) return;
          const targetArr = mapConfigs[mKey].harvestables;
          // Xóa các công trình cũ do người chơi đặt để nạp đúng bản lưu
          for (let i = targetArr.length - 1; i >= 0; i--) {
            if (targetArr[i] && (targetArr[i].type === "crafting_table" || targetArr[i].type === "chest")) {
              targetArr.splice(i, 1);
            }
          }
          const savedList = Array.isArray(placedData[mKey]) ? placedData[mKey] : [];
          savedList.forEach((so) => {
            if (!so || (so.type !== "crafting_table" && so.type !== "chest")) return;
            const restored = {
              type: so.type,
              x: Number(so.x) || 240,
              y: Number(so.y) || 240,
              width: 16,
              height: 16,
              name: so.name || (so.type === "chest" ? "Rương Đồ" : "Bàn Chế Tạo")
            };
            if (so.type === "chest") {
              const rawItems = Array.isArray(so.items) ? so.items : (Array.isArray(so.inventory) ? so.inventory : []);
              restored.items = rawItems.slice(0, 27).concat(new Array(Math.max(0, 27 - rawItems.length)).fill(null));
            }
            targetArr.push(restored);
          });
        });
        if (typeof currentMap !== "undefined" && mapConfigs[currentMap]) {
          currentObjects = mapConfigs[currentMap].harvestables;
        }
      } catch (e) { console.warn("Restore structures err:", e); }
    }

    function applyPlayerSaveData(data) {
      if (!data || typeof data !== "object") return;
      try {
        if (typeof data.gold === "number") playerGold = data.gold;
        if (Array.isArray(data.inventory)) {
          for (let i = 0; i < 36; i++) playerInventory[i] = data.inventory[i] || null;
        }
        if (Array.isArray(data.equipment)) {
          for (let i = 0; i < 4; i++) playerEquipment[i] = data.equipment[i] || null;
        }
        if (data.placedObjects) {
          applyPlacedStructures(data.placedObjects);
        }
        if (data.currentMap && typeof mapConfigs !== "undefined" && mapConfigs[data.currentMap] && typeof loadMap === "function") {
          const px = (typeof data.x === "number" && !Number.isNaN(data.x)) ? data.x : player.x;
          const py = (typeof data.y === "number" && !Number.isNaN(data.y)) ? data.y : player.y;
          loadMap(data.currentMap, { x: px, y: py });
        } else if (typeof player !== "undefined") {
          if (typeof data.x === "number" && !Number.isNaN(data.x)) player.x = data.x;
          if (typeof data.y === "number" && !Number.isNaN(data.y)) player.y = data.y;
        }
        if (typeof recalculatePlayerArmorAndStats === "function" && typeof player !== "undefined") {
          recalculatePlayerArmorAndStats();
        }
        if (typeof player !== "undefined" && typeof data.hp === "number") {
          player.hp = Math.min(player.maxHp, Math.max(1, data.hp));
        }
        if (typeof data.armor === "number") {
          playerArmor = Math.min(playerMaxArmor, Math.max(0, data.armor));
        }
        if (typeof renderInventory === "function") renderInventory();
        if (typeof renderHotbar === "function") renderHotbar();
        const now = new Date(data.updatedAt || Date.now());
        lastSavedTimeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        updatePlayerAccountBtnLabel();
      } catch (e) { console.warn("Apply save err:", e); }
    }

    const STORAGE_PENDING_SYNC_PREFIX = "game2d_pending_sync_";

    function isCloudSyncPending(profileId) {
      try {
        return !!(profileId && localStorage.getItem(STORAGE_PENDING_SYNC_PREFIX + profileId) === "1");
      } catch (e) { return false; }
    }

    function setCloudSyncPending(profileId, pending) {
      try {
        if (!profileId) return;
        if (pending) localStorage.setItem(STORAGE_PENDING_SYNC_PREFIX + profileId, "1");
        else localStorage.removeItem(STORAGE_PENDING_SYNC_PREFIX + profileId);
      } catch (e) {}
    }

    function getLocalSaveObject(profileId) {
      try {
        if (!profileId) return null;
        const raw = localStorage.getItem("game2d_save_" + profileId);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }

    async function loadPlayerFromCloud() {
      if (!fbDb || !currentPlayerProfile || !currentPlayerProfile.id) return false;
      try {
        const docRef = fbDb.collection("players").doc(currentPlayerProfile.id);
        const snap = await docRef.get();
        const isPending = isCloudSyncPending(currentPlayerProfile.id);
        const localData = getLocalSaveObject(currentPlayerProfile.id);

        if (snap.exists) {
          const cloudData = snap.data();
          const localTs = (localData && typeof localData.updatedAt === "number") ? localData.updatedAt : 0;
          const cloudTs = (cloudData && typeof cloudData.updatedAt === "number") ? cloudData.updatedAt : 0;

          if (isPending || (localData && localTs > cloudTs)) {
            // Ưu tiên bản đệm trên máy (chưa kịp đồng bộ trước đó) và đẩy ngược lên Cloud
            if (localData) applyPlayerSaveData(localData);
            await syncPlayerToCloud();
          } else {
            applyPlayerSaveData(cloudData);
            savePlayerToStorage(false);
          }

          if (cloudData.pendingGold && cloudData.pendingGold > 0) {
            playerGold += cloudData.pendingGold;
            if (typeof addFloatingText === "function" && typeof player !== "undefined") {
              addFloatingText(`🤝 +${cloudData.pendingGold} Xu từ Chợ!`, player.x, player.y - 14, "#fde047", true);
            }
            await docRef.set({ pendingGold: 0, gold: playerGold }, { merge: true });
            savePlayerToStorage(false);
          }
        } else if (localData) {
          // Chưa có trên Cloud nhưng có bản đệm trên máy -> đẩy lên Cloud ngay
          await syncPlayerToCloud();
        }
        if (fbPlayerSnapUnsub) {
          fbPlayerSnapUnsub();
          fbPlayerSnapUnsub = null;
        }
        // Lắng nghe realtime nếu có người khác mua đồ của bạn khi bạn đang online
        fbPlayerSnapUnsub = docRef.onSnapshot((s) => {
          if (!s.exists) return;
          const d = s.data();
          if (d && d.pendingGold > 0) {
            const gain = d.pendingGold;
            playerGold += gain;
            if (typeof addFloatingText === "function" && typeof player !== "undefined") {
              addFloatingText(`🤝 +${gain} Xu từ Chợ!`, player.x, player.y - 14, "#fde047", true);
            }
            docRef.set({ pendingGold: 0, gold: playerGold }, { merge: true }).catch(() => {});
            const shopUI = document.getElementById("npc-shop-ui");
            if (shopUI && shopUI.style.display === "flex") renderNpcShopUI();
          }
        });
        return snap.exists;
      } catch (e) {
        console.warn("Cloud load err:", e);
        return false;
      }
    }

    async function syncPlayerToCloud() {
      if (!fbDb || !currentPlayerProfile || !currentPlayerProfile.id) return false;
      try {
        const payload = exportPlayerSaveData();
        if (currentPlayerProfile.passwordHash) {
          payload.passwordHash = currentPlayerProfile.passwordHash;
        }
        if (currentPlayerProfile.username) {
          payload.username = currentPlayerProfile.username;
        }
        await fbDb.collection("players").doc(currentPlayerProfile.id).set(payload, { merge: true });
        // Chỉ xóa cờ pending sau khi Cloud xác nhận ghi thành công 100%
        setCloudSyncPending(currentPlayerProfile.id, false);
        return true;
      } catch (e) {
        console.warn("Cloud save err:", e);
        return false;
      }
    }

    function subscribeCloudMarket() {
      if (!fbDb || fbMarketUnsub) return;
      fbMarketUnsub = fbDb.collection("market_listings")
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(20)
        .onSnapshot((snap) => {
          const cloudList = [];
          snap.forEach((doc) => cloudList.push({ id: doc.id, ...doc.data() }));
          marketListings = cloudList;
          const shopUI = document.getElementById("npc-shop-ui");
          if (shopUI && shopUI.style.display === "flex") renderNpcShopUI();
        });
    }

    function unsubscribeCloudMarket() {
      if (fbMarketUnsub) {
        fbMarketUnsub();
        fbMarketUnsub = null;
      }
    }

    function updatePlayerAccountBtnLabel() {
      const lbl = document.getElementById("playerAccountBtnLabel");
      const isReg = !!(currentPlayerProfile && currentPlayerProfile.username);
      if (lbl) {
        lbl.textContent = isReg
          ? `${currentPlayerProfile.name} (@${currentPlayerProfile.username})`
          : "Đăng ký / Đăng nhập";
      }
      const closeBtn = document.getElementById("closeProfileModalBtn");
      if (closeBtn) closeBtn.style.display = isReg ? "inline-block" : "none";
      const loggedView = document.getElementById("accountLoggedInView");
      const authView = document.getElementById("accountAuthView");
      if (loggedView && authView) {
        if (isReg) {
          loggedView.style.display = "flex";
          authView.style.display = "none";
          const sName = document.getElementById("accSummaryName");
          const sUser = document.getElementById("accSummaryUser");
          const sStats = document.getElementById("accSummaryStats");
          const sBadge = document.getElementById("accCloudBadge");
          if (sName) sName.textContent = `👤 ${currentPlayerProfile.name}`;
          if (sUser) sUser.textContent = `Tài khoản: @${currentPlayerProfile.username} • Lưu lúc: ${lastSavedTimeStr}`;
          const mapLabel = (typeof currentMap !== "undefined" && currentMap === "forest") ? "🌲 Rừng" : ((typeof currentMap !== "undefined" && currentMap === "lake") ? "🌊 Hồ" : "🏠 Nhà");
          if (sStats) sStats.textContent = `🪙 ${typeof playerGold !== "undefined" ? playerGold : 50} Xu • ${mapLabel}`;
          if (sBadge) {
            sBadge.textContent = fbDb ? "🟢 Đã nối Firebase Cloud" : "🟡 Lưu trên Thiết Bị";
          }
        } else {
          loggedView.style.display = "none";
          authView.style.display = "flex";
        }
      }
    }

    function showAuthFeedback(msg, isError = true) {
      const el = document.getElementById("authFeedbackMsg");
      if (!el) return;
      el.style.display = "block";
      el.textContent = msg;
      el.style.background = isError ? "rgba(239,68,68,0.18)" : "rgba(34,197,94,0.18)";
      el.style.color = isError ? "#fca5a5" : "#86efac";
      el.style.border = isError ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(34,197,94,0.4)";
    }

    function switchAuthTab(mode) {
      currentAuthMode = mode === "login" ? "login" : "register";
      const btnReg = document.getElementById("tabBtnRegister");
      const btnLog = document.getElementById("tabBtnLogin");
      const dispGroup = document.getElementById("authDisplayNameGroup");
      const submitBtn = document.getElementById("authSubmitBtn");
      const desc = document.getElementById("authTabDesc");
      const fb = document.getElementById("authFeedbackMsg");
      if (fb) fb.style.display = "none";

      if (currentAuthMode === "register") {
        if (btnReg) { btnReg.style.background = "#eab308"; btnReg.style.color = "#0f172a"; }
        if (btnLog) { btnLog.style.background = "transparent"; btnLog.style.color = "#94a3b8"; }
        if (dispGroup) dispGroup.style.display = "block";
        if (submitBtn) submitBtn.textContent = "🚀 Đăng Ký & Lưu Tiến Trình Ngay";
        if (desc) desc.textContent = "Tạo tài khoản mới để lưu toàn bộ Túi đồ, Xu vàng, Giáp, Vị trí và Công trình đã đặt lên Cloud Firebase.";
      } else {
        if (btnLog) { btnLog.style.background = "#38bdf8"; btnLog.style.color = "#0f172a"; }
        if (btnReg) { btnReg.style.background = "transparent"; btnReg.style.color = "#94a3b8"; }
        if (dispGroup) dispGroup.style.display = "none";
        if (submitBtn) submitBtn.textContent = "🔑 Đăng Nhập & Tải Tiến Trình";
        if (desc) desc.textContent = "Nhập đúng Tên đăng nhập & Mật khẩu đã tạo để tải lại toàn bộ tiến trình chơi từ Cloud hoặc máy.";
      }
    }

    function switchToAuthForm(mode = "login") {
      const closeBtn = document.getElementById("closeProfileModalBtn");
      if (closeBtn) closeBtn.style.display = isReg ? "inline-block" : "none";
      const loggedView = document.getElementById("accountLoggedInView");
      const authView = document.getElementById("accountAuthView");
      if (loggedView) loggedView.style.display = "none";
      if (authView) authView.style.display = "flex";
      switchAuthTab(mode);
    }

    function openPlayerProfileModal() {
      updatePlayerAccountBtnLabel();
      const modal = document.getElementById("player-profile-modal");
      if (modal) modal.style.display = "flex";
    }

    function closePlayerProfileModal() {
      const modal = document.getElementById("player-profile-modal");
      if (modal) modal.style.display = "none";
    }

    async function submitAccountAuth() {
      const uInp = document.getElementById("authUsernameInput");
      const pInp = document.getElementById("authPasswordInput");
      const dInp = document.getElementById("authDisplayNameInput");

      const rawUser = uInp ? uInp.value : "";
      const username = normalizeUsername(rawUser);
      const password = pInp ? pInp.value.trim() : "";
      const displayName = (dInp && dInp.value.trim()) ? dInp.value.trim().slice(0, 18) : username;

      if (username.length < 3) {
        showAuthFeedback("⚠️ Tên đăng nhập phải từ 3 ký tự trở lên (chữ hoặc số, viết liền)!", true);
        return;
      }
      if (password.length < 3) {
        showAuthFeedback("⚠️ Mật khẩu phải từ 3 ký tự trở lên!", true);
        return;
      }

      const accId = "acc_" + username;
      const passHash = simpleHashPassword(password);
      const localAccountsRaw = localStorage.getItem("game2d_accounts_registry_v1");
      const localAccounts = localAccountsRaw ? JSON.parse(localAccountsRaw) : {};

      showAuthFeedback("⏳ Đang xử lý đồng bộ tài khoản...", false);

      if (currentAuthMode === "register") {
        // Kiểm tra xem tài khoản đã tồn tại trên Cloud hoặc máy chưa
        if (fbDb) {
          try {
            const snap = await fbDb.collection("players").doc(accId).get();
            if (snap.exists && snap.data().passwordHash) {
              showAuthFeedback("❌ Tên đăng nhập này đã có người đăng ký! Hãy chuyển sang tab Đăng Nhập.", true);
              return;
            }
          } catch (e) {}
        }
        if (localAccounts[username] && localAccounts[username].passwordHash) {
          showAuthFeedback("❌ Tên đăng nhập này đã tồn tại trên máy! Hãy chuyển sang tab Đăng Nhập.", true);
          return;
        }

        currentPlayerProfile = {
          id: accId,
          username: username,
          name: displayName || username,
          passwordHash: passHash
        };
        localAccounts[username] = currentPlayerProfile;
        localStorage.setItem("game2d_accounts_registry_v1", JSON.stringify(localAccounts));
        localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentPlayerProfile));

        savePlayerToStorage();
        await syncPlayerToCloud();
        updatePlayerAccountBtnLabel();
        showAuthFeedback("✅ Đăng ký thành công! Đã lưu toàn bộ tiến trình game.", false);
        if (typeof showNotification === "function") {
          showNotification(`🎉 Đã đăng ký & lưu tài khoản @${username}!`, false);
        }
        setTimeout(() => closePlayerProfileModal(), 700);
      } else {
        // ĐĂNG NHẬP
        let foundCloudData = null;
        if (fbDb) {
          try {
            const snap = await fbDb.collection("players").doc(accId).get();
            if (snap.exists) {
              foundCloudData = snap.data();
            }
          } catch (e) {}
        }

        const localAcc = localAccounts[username];
        if (!foundCloudData && !localAcc) {
          showAuthFeedback("❌ Không tìm thấy tài khoản này! Vui lòng kiểm tra lại hoặc chọn Đăng Ký Mới.", true);
          return;
        }

        const expectedHash = (foundCloudData && foundCloudData.passwordHash)
          ? foundCloudData.passwordHash
          : (localAcc ? localAcc.passwordHash : null);

        if (expectedHash && expectedHash !== passHash) {
          showAuthFeedback("❌ Mật khẩu không chính xác!", true);
          return;
        }

        const resolvedName = (foundCloudData && foundCloudData.profile && foundCloudData.profile.name)
          ? foundCloudData.profile.name
          : (localAcc && localAcc.name ? localAcc.name : username);

        currentPlayerProfile = {
          id: accId,
          username: username,
          name: resolvedName,
          passwordHash: passHash
        };
        localAccounts[username] = currentPlayerProfile;
        localStorage.setItem("game2d_accounts_registry_v1", JSON.stringify(localAccounts));
        localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentPlayerProfile));

        if (foundCloudData) {
          applyPlayerSaveData(foundCloudData);
          savePlayerToStorage();
        } else {
          loadPlayerSaveFromStorage();
        }
        await loadPlayerFromCloud();
        updatePlayerAccountBtnLabel();
        showAuthFeedback("✅ Đăng nhập & tải tiến trình thành công!", false);
        if (typeof showNotification === "function") {
          showNotification(`👋 Chào mừng trở lại, ${currentPlayerProfile.name} (@${username})!`, false);
        }
        setTimeout(() => closePlayerProfileModal(), 650);
      }
    }

    async function manualSaveGameProgress() {
      if (!currentPlayerProfile || !currentPlayerProfile.username) {
        openPlayerProfileModal();
        switchToAuthForm("register");
        showAuthFeedback("💡 Hãy tạo tài khoản (chỉ mất 5 giây) để lưu tiến trình của bạn!", false);
        return;
      }
      savePlayerToStorage();
      const qLbl = document.getElementById("quickSaveBtnLabel");
      if (qLbl) qLbl.textContent = "Đang lưu...";
      const okCloud = await syncPlayerToCloud();
      if (qLbl) {
        qLbl.textContent = okCloud ? "Đã lưu Cloud ✓" : "Đã lưu Máy ✓";
        setTimeout(() => { if (qLbl) qLbl.textContent = "Lưu Game"; }, 2200);
      }
      updatePlayerAccountBtnLabel();
      if (typeof showNotification === "function") {
        showNotification(okCloud
          ? `💾 Đã lưu tiến trình của @${currentPlayerProfile.username} lên Máy & Firebase Cloud!`
          : `💾 Đã lưu tiến trình của @${currentPlayerProfile.username} vào Thiết bị!`, false);
      }
    }

    async function manualLoadFromCloud() {
      if (!currentPlayerProfile || !currentPlayerProfile.id) return;
      const ok = await loadPlayerFromCloud();
      if (typeof showNotification === "function") {
        showNotification(ok
          ? "☁️ Đã tải tiến trình mới nhất từ Firebase Cloud!"
          : "⚠️ Chưa có bản lưu Cloud hoặc đang ngoại tuyến, đã giữ bản lưu trên máy.", !ok);
      }
      updatePlayerAccountBtnLabel();
    }

    function initPlayerProfileAndSave() {
      initFirebaseIfConfigured();
      try {
        const rawProf = localStorage.getItem(STORAGE_PROFILE_KEY);
        if (rawProf) {
          const parsed = JSON.parse(rawProf);
          if (parsed && parsed.id) {
            currentPlayerProfile = parsed;
            loadPlayerSaveFromStorage();
            loadPlayerFromCloud();
          }
        }
        // Nếu người chơi chưa đăng ký tài khoản chính thức (chưa có username), mở bảng Đăng Ký / Đăng Nhập
        if (!currentPlayerProfile || !currentPlayerProfile.username) {
          const modal = document.getElementById("player-profile-modal");
          if (modal) modal.style.display = "flex";
          switchToAuthForm("register");
        }
      } catch (e) { console.warn("Profile init err:", e); }
      updatePlayerAccountBtnLabel();
      claimPendingMarketPayouts();
    }

    function confirmPlayerProfile() {
      submitAccountAuth();
    }

    function exportPlayerSaveData() {
      const nowTs = Date.now();
      return {
        profile: currentPlayerProfile,
        gold: typeof playerGold === "number" ? playerGold : 50,
        hp: (typeof player !== "undefined" && typeof player.hp === "number") ? player.hp : 150,
        maxHp: (typeof player !== "undefined" && typeof player.maxHp === "number") ? player.maxHp : 150,
        armor: typeof playerArmor === "number" ? playerArmor : 0,
        inventory: playerInventory,
        equipment: playerEquipment,
        currentMap: typeof currentMap !== "undefined" ? currentMap : "home",
        x: (typeof player !== "undefined" && typeof player.x === "number") ? Math.round(player.x) : 248,
        y: (typeof player !== "undefined" && typeof player.y === "number") ? Math.round(player.y) : 248,
        placedObjects: exportPlacedStructures(),
        updatedAt: nowTs
      };
    }

    function savePlayerToStorage(markPending = true) {
      try {
        if (!currentPlayerProfile || !currentPlayerProfile.id) return;
        const payload = exportPlayerSaveData();
        localStorage.setItem("game2d_save_" + currentPlayerProfile.id, JSON.stringify(payload));
        if (markPending) {
          setCloudSyncPending(currentPlayerProfile.id, true);
        }
        const now = new Date(payload.updatedAt);
        lastSavedTimeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        updatePlayerAccountBtnLabel();
      } catch (e) {}
    }

    function loadPlayerSaveFromStorage() {
      try {
        if (!currentPlayerProfile || !currentPlayerProfile.id) return;
        const raw = localStorage.getItem("game2d_save_" + currentPlayerProfile.id);
        if (!raw) return;
        const data = JSON.parse(raw);
        applyPlayerSaveData(data);
      } catch (e) { console.warn("Load save err:", e); }
    }

    function getSharedMarketListings() {
      try {
        const raw = localStorage.getItem(STORAGE_MARKET_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.slice(0, 20);
        }
      } catch (e) {}
      return marketListings;
    }

    function saveSharedMarketListings(list) {
      const capped = list.slice(0, 20);
      marketListings = capped;
      try {
        localStorage.setItem(STORAGE_MARKET_KEY, JSON.stringify(capped));
        if (marketChannel) marketChannel.postMessage({ type: "market_sync", listings: capped });
      } catch (e) {}
    }

    function claimPendingMarketPayouts() {
      try {
        const raw = localStorage.getItem(STORAGE_PAYOUTS_KEY);
        if (!raw) return;
        const payouts = JSON.parse(raw);
        if (payouts[currentPlayerProfile.id] > 0) {
          const earned = payouts[currentPlayerProfile.id];
          playerGold += earned;
          delete payouts[currentPlayerProfile.id];
          localStorage.setItem(STORAGE_PAYOUTS_KEY, JSON.stringify(payouts));
          addFloatingText(`🤝 +${earned} Xu từ Chợ!`, player.x, player.y - 14, "#fde047", true);
          savePlayerToStorage();
        }
      } catch (e) {}
    }

    if (marketChannel) {
      marketChannel.onmessage = (ev) => {
        if (!ev.data) return;
        if (ev.data.type === "market_sync") {
          marketListings = getSharedMarketListings();
          const shopUI = document.getElementById("npc-shop-ui");
          if (shopUI && shopUI.style.display === "flex") renderNpcShopUI();
        } else if (ev.data.type === "payout" && ev.data.sellerId === currentPlayerProfile.id) {
          claimPendingMarketPayouts();
        }
      };
    }

    // -------------------------------------------------------------
    // HỆ THỐNG TIỀN TỆ (XU VÀNG), NPC THƯƠNG NHÂN & 2 CỬA HÀNG
    // -------------------------------------------------------------
    let playerGold = 50;
    const HOME_MERCHANT = { x: 432, y: 224, width: 16, height: 16 };
    let currentShopTab = 'npc';

    const NPC_SHOP_CATALOG = [
      { id: "arrow", price: 3, qty: 5 },
      { id: "coal", price: 5, qty: 2 },
      { id: "apple", price: 5, qty: 1 },
      { id: "gem_damage", price: 65, qty: 1 },
      { id: "gem_frost", price: 95, qty: 1 },
      { id: "gem_vampire", price: 145, qty: 1 },
      { id: "spell_gravity", price: 180, qty: 1 },
      { id: "spell_timestop", price: 220, qty: 1 }
    ];

    let marketListings = [
      { id: "mk_1", seller: "Thợ Săn An", itemId: "leather_hide", qty: 4, price: 14, isPlayer: false },
      { id: "mk_2", seller: "Ngư Dân Bình", itemId: "golden_fish", qty: 1, price: 40, isPlayer: false },
      { id: "mk_3", seller: "Pháp Sư Linh", itemId: "gem_haste", qty: 1, price: 95, isPlayer: false }
    ];
    let marketTickTimer = 0;

    
    // Chạm trực tiếp vào NPC Thương Nhân trên điện thoại (trong bán kính 2 ô)
    canvas.addEventListener("touchstart", (e) => {
      if (currentMap !== "home" || !e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const zoom = getCameraZoom();
      const wx = (touch.clientX - rect.left) / zoom + camera.x;
      const wy = (touch.clientY - rect.top) / zoom + camera.y;
      const distClickNPC = Math.hypot(wx - (HOME_MERCHANT.x + 8), wy - (HOME_MERCHANT.y + 8));
      const distPlayerNPC = Math.hypot((player.x + 8) - (HOME_MERCHANT.x + 8), (player.y + 8) - (HOME_MERCHANT.y + 8));
      if (distClickNPC <= 30 && distPlayerNPC <= 42) {
        e.preventDefault();
        e.stopPropagation();
        toggleNpcShopUI(true);
      }
    }, { passive: false });

    
    // -------------------------------------------------------------
    // BẢNG CHỈ SỐ NHÂN VẬT (PLAYER INFO [I] / MOBILE INFO)
    // -------------------------------------------------------------
    function togglePlayerInfoUI(forceOpen = null) {
      const ui = document.getElementById("player-info-ui");
      if (!ui) return false;
      const isClosed = ui.style.display === "none" || ui.style.display === "";
      const willOpen = forceOpen !== null ? forceOpen : isClosed;
      ui.style.display = willOpen ? "flex" : "none";
      if (willOpen) renderPlayerInfoUI();
      return willOpen;
    }
    window.togglePlayerInfoUI = togglePlayerInfoUI;

    function renderPlayerInfoUI() {
      const body = document.getElementById("playerInfoBody");
      if (!body) return;

      const held = playerInventory[activeHotbarIndex];
      const heldData = held ? (getItemData(held) || held) : null;
      const baseMeleeDmg = defaultStats.player.attackDamage || 1;
      let curDmgLabel = `${baseMeleeDmg} DMG (Tay không)`;
      if (heldData) {
        if (heldData.id === "hunting_bow") curDmgLabel = heldData.rangedDamage || "5–10 DMG";
        else if (heldData.id === "magic_wand") {
          const gemB = getWandGemBonuses({ id: "magic_wand", wandData: ensureWandData(held) });
          curDmgLabel = `${(heldData.damage || 4) + gemB.damageBonus} DMG (Đũa Phép)`;
        } else if (heldData.damage) {
          curDmgLabel = `${heldData.damage} DMG (${heldData.name})`;
        }
      }

      // Tính bonus từ Đũa Phép (nếu đang cầm hoặc có trong túi)
      let wandRef = (held && held.id === "magic_wand") ? held : playerInventory.find(it => it && it.id === "magic_wand");
      const gemB = wandRef ? getWandGemBonuses({ id: "magic_wand", wandData: ensureWandData(wandRef) }) : {
        damageBonus: 0, critChance: 0, cooldownMult: 1, vampirePct: 0, burnStacks: 0, frostStacks: 0
      };
      const cdReducePct = Math.round((1 - (gemB.cooldownMult || 1)) * 100);

      const hungerMult = 1.0;
      const actualSpeed = Math.round((player.speed || 60) * hungerMult);
      const kbPct = Math.round((player.knockbackResist || 0) * 100);

      const hungerStatus = "Bình thường";

      const mapName = currentMap === "lake" ? "🏞️ Hồ" : (currentMap === "forest" ? "🌲 Rừng" : "🏠 Nhà");
      const woodSpeed = heldData && heldData.woodcuttingSpeed ? `x${heldData.woodcuttingSpeed}` : "x1.0 (Tay)";
      const mineSpeed = heldData && heldData.miningSpeed ? `x${heldData.miningSpeed}` : "x1.0 (Tay)";

      const eqNames = ["Nón", "Áo", "Quần", "Giày"].map((lbl, idx) => {
        const eq = playerEquipment[idx];
        return eq ? `${lbl}: <span style="color:#7dd3fc;">${(getItemData(eq)||eq).name}</span>` : `${lbl}: <span style="color:#64748b;">Trống</span>`;
      }).join("<br>");

      const row = (k, v, col = "#f8fafc") =>
        `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(148,163,184,0.1);">
          <span style="color:#94a3b8;">${k}</span>
          <span style="font-weight:700;color:${col};">${v}</span>
        </div>`;

      body.innerHTML = `
        <div style="background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.18);border-radius:10px;padding:10px 12px;">
          <div style="font-size:11.5px;font-weight:700;color:#4ade80;margin-bottom:6px;">❤️ SINH TỒN & TÀI SẢN</div>
          ${row("Máu (HP)", `${Math.round(player.hp)} / ${player.maxHp}`, "#fb7185")}
          ${row("Giáp (Hấp thụ 70%)", `${Math.round(playerArmor)} / ${playerMaxArmor}`, "#38bdf8")}
          ${row("Tài sản", `🪙 ${playerGold} Xu`, "#fde047")}
          ${row("Khu vực", `${mapName} (${Math.round(player.x)}, ${Math.round(player.y)})`, "#cbd5e1")}
        </div>

        <div style="background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.18);border-radius:10px;padding:10px 12px;">
          <div style="font-size:11.5px;font-weight:700;color:#fb7185;margin-bottom:6px;">⚔️ CHIẾN ĐẤU & DI CHUYỂN</div>
          ${row("Sát thương cầm tay", curDmgLabel, "#fb7185")}
          ${row("Tỉ lệ Chí Mạng", `${gemB.critChance || 0}%`, "#facc15")}
          ${row("Giảm Hồi Chiêu", `-${cdReducePct}%`, "#2dd4bf")}
          ${row("Hút Máu Phép", `${gemB.vampirePct || 0}%`, "#f472b6")}
          ${row("Tốc độ di chuyển", `${actualSpeed} px/s`, "#fbbf24")}
          ${row("Kháng đẩy lùi", `${kbPct}%`, "#c4b5fd")}
          ${row("Chặt cây / Đào đá", `${woodSpeed} · ${mineSpeed}`, "#94a3b8")}
        </div>

        <div style="grid-column:1 / -1;background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.18);border-radius:10px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="font-size:11.5px;line-height:1.5;">
            <span style="font-weight:700;color:#38bdf8;">🛡️ TRANG BỊ ĐANG MẶC:</span><br>${eqNames}
          </div>
          <div style="font-size:11px;color:#94a3b8;text-align:right;">
            <div>🔥 Thiêu đốt: <b style="color:#fb923c;">${gemB.burnStacks || 0} tầng</b></div>
            <div>❄️ Làm chậm: <b style="color:#38bdf8;">${gemB.frostStacks || 0} tầng</b></div>
            <div>⚔️ Cộng DMG Ngọc: <b style="color:#f87171;">+${gemB.damageBonus || 0}</b></div>
          </div>
        </div>
      `;
    }

    function toggleNpcShopUI(forceOpen = null) {
      const ui = document.getElementById("npc-shop-ui");
      if (!ui) return;
      const isClosed = ui.style.display === "none" || ui.style.display === "";
      const willOpen = forceOpen !== null ? forceOpen : isClosed;
      ui.style.display = willOpen ? "flex" : "none";
      if (willOpen) { if (fbDb) subscribeCloudMarket(); else marketListings = getSharedMarketListings(); renderNpcShopUI(); } else { unsubscribeCloudMarket(); }
    }

    function switchShopTab(tab) {
      currentShopTab = tab;
      const npcTab = document.getElementById("shopTabNpc");
      const mkTab = document.getElementById("shopTabMarket");
      const btnNpc = document.getElementById("tabBtnNpcShop");
      const btnMk = document.getElementById("tabBtnMarketShop");
      if (!npcTab || !mkTab) return;
      if (tab === 'npc') {
        npcTab.style.display = "grid";
        mkTab.style.display = "none";
        btnNpc.style.borderColor = "#eab308"; btnNpc.style.background = "rgba(234,179,8,0.2)"; btnNpc.style.color = "#fef08a";
        btnMk.style.borderColor = "rgba(148,163,184,0.3)"; btnMk.style.background = "rgba(30,41,59,0.6)"; btnMk.style.color = "#cbd5e1";
      } else {
        npcTab.style.display = "none";
        mkTab.style.display = "flex";
        btnMk.style.borderColor = "#38bdf8"; btnMk.style.background = "rgba(56,189,248,0.2)"; btnMk.style.color = "#e0f2fe";
        btnNpc.style.borderColor = "rgba(148,163,184,0.3)"; btnNpc.style.background = "rgba(30,41,59,0.6)"; btnNpc.style.color = "#cbd5e1";
      }
      renderNpcShopUI();
    }

    let npcSellPage = 0;
    let npcBuyPage = 0;
    const SHOP_PAGE_SIZE = 6;

    function changeShopPage(kind, delta) {
      if (kind === 'sell') npcSellPage = Math.max(0, npcSellPage + delta);
      else npcBuyPage = Math.max(0, npcBuyPage + delta);
      renderNpcShopUI();
    }

    function renderNpcShopUI() {
      const badge = document.getElementById("shopGoldBadge");
      if (badge) badge.textContent = `🪙 ${playerGold} Xu`;

      const sellEl = document.getElementById("npcSellList");
      const buyEl = document.getElementById("npcBuyList");
      const sellPager = document.getElementById("npcSellPager");
      const buyPager = document.getElementById("npcBuyPager");

      if (sellEl) {
        const sellItems = [];
        for (let i = 0; i < playerInventory.length; i++) {
          const it = playerInventory[i];
          if (it && it.quantity > 0) sellItems.push({ idx: i, it });
        }
        const maxSellPage = Math.max(0, Math.ceil(sellItems.length / SHOP_PAGE_SIZE) - 1);
        if (npcSellPage > maxSellPage) npcSellPage = maxSellPage;
        const pageItems = sellItems.slice(npcSellPage * SHOP_PAGE_SIZE, (npcSellPage + 1) * SHOP_PAGE_SIZE);

        if (sellPager) {
          sellPager.innerHTML = sellItems.length > SHOP_PAGE_SIZE
            ? `<button type="button" onclick="changeShopPage('sell',-1)" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:4px;padding:1px 6px;cursor:pointer;">◀</button><span>${npcSellPage + 1}/${maxSellPage + 1}</span><button type="button" onclick="changeShopPage('sell',1)" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:4px;padding:1px 6px;cursor:pointer;">▶</button>`
            : '';
        }

        let sHtml = "";
        for (const { idx, it } of pageItems) {
          const data = getItemData(it) || it;
          const unitVal = data.value || 1;
          sHtml += `<div style="background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.16);border-radius:8px;padding:7px;display:flex;flex-direction:column;gap:5px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <img src="${getItemIcon(it)}" style="width:24px;height:24px;image-rendering:pixelated;" />
              <div style="min-width:0;">
                <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${data.name}</div>
                <div style="font-size:10px;color:#fde047;">×${it.quantity} · +${unitVal} Xu</div>
              </div>
            </div>
            <div style="display:flex;gap:4px;">
              <button type="button" onclick="sellItemToNPC(${idx}, false)" style="flex:1;background:#16a34a;color:#fff;border:none;border-radius:4px;padding:3px 0;font-size:10.5px;font-weight:700;cursor:pointer;">Bán 1</button>
              ${it.quantity > 1 ? `<button type="button" onclick="sellItemToNPC(${idx}, true)" style="flex:1;background:#0284c7;color:#fff;border:none;border-radius:4px;padding:3px 0;font-size:10.5px;font-weight:700;cursor:pointer;">Hết</button>` : ""}
            </div>
          </div>`;
        }
        sellEl.innerHTML = sHtml || '<div style="font-size:11px;color:#64748b;padding:8px 0;">Túi đồ trống.</div>';
      }

      if (buyEl) {
        const maxBuyPage = Math.max(0, Math.ceil(NPC_SHOP_CATALOG.length / SHOP_PAGE_SIZE) - 1);
        if (npcBuyPage > maxBuyPage) npcBuyPage = maxBuyPage;
        const pageBuy = NPC_SHOP_CATALOG.slice(npcBuyPage * SHOP_PAGE_SIZE, (npcBuyPage + 1) * SHOP_PAGE_SIZE);

        if (buyPager) {
          buyPager.innerHTML = NPC_SHOP_CATALOG.length > SHOP_PAGE_SIZE
            ? `<button type="button" onclick="changeShopPage('buy',-1)" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:4px;padding:1px 6px;cursor:pointer;">◀</button><span>${npcBuyPage + 1}/${maxBuyPage + 1}</span><button type="button" onclick="changeShopPage('buy',1)" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:4px;padding:1px 6px;cursor:pointer;">▶</button>`
            : '';
        }

        let bHtml = "";
        for (const entry of pageBuy) {
          const data = ITEMS_DATABASE[entry.id];
          if (!data) continue;
          const canAfford = playerGold >= entry.price;
          bHtml += `<div style="background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.16);border-radius:8px;padding:7px;display:flex;flex-direction:column;gap:5px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <img src="${data.icon}" style="width:24px;height:24px;image-rendering:pixelated;" />
              <div style="min-width:0;">
                <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${data.name} ${entry.qty > 1 ? '×' + entry.qty : ''}</div>
                <div style="font-size:10px;color:#38bdf8;">Giá cố định</div>
              </div>
            </div>
            <button type="button" onclick="buyItemFromNPC('${entry.id}')" style="width:100%;background:${canAfford ? '#eab308' : '#334155'};color:${canAfford ? '#0f172a' : '#94a3b8'};border:none;border-radius:4px;padding:3px 0;font-size:10.5px;font-weight:700;cursor:pointer;">🪙 ${entry.price} Xu</button>
          </div>`;
        }
        buyEl.innerHTML = bHtml;
      }

      const selEl = document.getElementById("marketSellSelect");
      if (selEl) {
        let opts = "";
        for (let i = 0; i < playerInventory.length; i++) {
          const it = playerInventory[i];
          if (!it || it.quantity <= 0) continue;
          const data = getItemData(it) || it;
          opts += `<option value="${i}">${data.name} (×${it.quantity})</option>`;
        }
        selEl.innerHTML = opts || '<option value="-1">Không có đồ</option>';
      }

      const mkListEl = document.getElementById("marketListingsContainer");
      if (mkListEl) {
        let mHtml = "";
        for (const mk of marketListings.slice(0, 6)) {
          const data = ITEMS_DATABASE[mk.itemId];
          if (!data) continue;
          const canAfford = playerGold >= mk.price;
          mHtml += `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(30,41,59,0.75);padding:6px 10px;border-radius:8px;border:1px solid ${mk.isPlayer ? 'rgba(234,179,8,0.4)' : 'rgba(56,189,248,0.2)'};">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${data.icon}" style="width:24px;height:24px;image-rendering:pixelated;" />
              <div>
                <div style="font-size:12px;font-weight:700;">${data.name} ×${mk.qty}</div>
                <div style="font-size:10.5px;color:#94a3b8;">Người bán: <span style="color:${mk.isPlayer ? '#fde047' : '#7dd3fc'};">${mk.seller}</span></div>
              </div>
            </div>
            ${(mk.sellerId === currentPlayerProfile.id || (mk.isPlayer && !mk.sellerId))
              ? `<button type="button" onclick="cancelMarketListing('${mk.id}')" style="background:#475569;color:#fff;border:none;border-radius:5px;padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;">Thu hồi</button>`
              : `<button type="button" onclick="buyFromMarket('${mk.id}')" style="background:${canAfford ? '#0284c7' : '#334155'};color:#fff;border:none;border-radius:5px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">🪙 ${mk.price}</button>`
            }
          </div>`;
        }
        mkListEl.innerHTML = mHtml || '<div style="font-size:11px;color:#64748b;">Chợ hiện đang trống.</div>';
      }
    }

    function sellItemToNPC(invIdx, sellAll) {
      const it = playerInventory[invIdx];
      if (!it || it.quantity <= 0) return;
      const data = getItemData(it) || it;
      const unitVal = data.value || 1;
      const count = sellAll ? it.quantity : 1;
      const earned = unitVal * count;
      playerGold += earned;
      it.quantity -= count;
      if (it.quantity <= 0) playerInventory[invIdx] = null;
      addFloatingText(`+${earned} Xu 🪙`, player.x, player.y - 12, "#fde047", true);
      renderInventory();
      renderNpcShopUI();
    }

    function buyItemFromNPC(itemId) {
      const entry = NPC_SHOP_CATALOG.find(e => e.id === itemId);
      if (!entry || playerGold < entry.price) {
        addFloatingText("❌ Không đủ Xu!", player.x, player.y - 12, "#ef4444");
        return;
      }
      playerGold -= entry.price;
      addItemToInventory(entry.id, entry.qty);
      addFloatingText(`-${entry.price} Xu 🪙`, player.x, player.y - 12, "#38bdf8", true);
      renderInventory();
      renderNpcShopUI();
    }

    async function listSelectedOnMarket() {
      const selEl = document.getElementById("marketSellSelect");
      const priceEl = document.getElementById("marketSellPrice");
      if (!selEl || !priceEl) return;
      const idx = parseInt(selEl.value, 10);
      const price = Math.max(1, parseInt(priceEl.value, 10) || 1);
      const it = playerInventory[idx];
      if (!it || it.quantity <= 0) return;

      const itemCopy = { ...it, quantity: 1 };
      it.quantity -= 1;
      if (it.quantity <= 0) playerInventory[idx] = null;
      savePlayerToStorage();
      renderInventory();

      const payload = {
        sellerId: currentPlayerProfile.id,
        seller: currentPlayerProfile.name,
        itemId: it.id,
        itemData: itemCopy,
        qty: 1,
        price: price,
        status: "active",
        createdAt: Date.now(),
        isPlayer: true
      };

      if (fbDb) {
        try {
          await fbDb.collection("market_listings").add(payload);
          syncPlayerToCloud();
        } catch (e) { console.warn("Cloud list err:", e); }
      } else {
        const list = getSharedMarketListings();
        list.unshift({ id: "mk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5), ...payload });
        saveSharedMarketListings(list);
      }
      renderNpcShopUI();
    }

    async function cancelMarketListing(listingId) {
      if (fbDb) {
        try {
          const ref = fbDb.collection("market_listings").doc(listingId);
          let itemToReturn = null;
          await fbDb.runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            if (!doc.exists) return;
            const mk = doc.data();
            if (mk.status !== "active" || mk.sellerId !== currentPlayerProfile.id) return;
            tx.update(ref, { status: "cancelled" });
            itemToReturn = mk.itemData ? { ...mk.itemData } : { id: mk.itemId, name: ITEMS_DATABASE[mk.itemId]?.name || mk.itemId, quantity: mk.qty };
          });
          if (itemToReturn) {
            pickupItem(itemToReturn);
            savePlayerToStorage();
            syncPlayerToCloud();
          }
        } catch (e) { console.warn("Cloud cancel err:", e); }
        renderInventory();
        renderNpcShopUI();
        return;
      }

      const list = getSharedMarketListings();
      const idx = list.findIndex(m => m.id === listingId);
      if (idx === -1) return;
      const mk = list[idx];
      pickupItem(mk.itemData ? { ...mk.itemData } : { id: mk.itemId, name: ITEMS_DATABASE[mk.itemId]?.name || mk.itemId, quantity: mk.qty });
      list.splice(idx, 1);
      saveSharedMarketListings(list);
      savePlayerToStorage();
      renderInventory();
      renderNpcShopUI();
    }

    async function buyFromMarket(listingId) {
      if (fbDb) {
        try {
          const ref = fbDb.collection("market_listings").doc(listingId);
          let boughtMk = null;
          await fbDb.runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            if (!doc.exists) throw new Error("NOT_FOUND");
            const mk = doc.data();
            if (mk.status !== "active") throw new Error("ALREADY_SOLD");
            if (playerGold < mk.price) throw new Error("NO_GOLD");
            tx.update(ref, { status: "sold", buyerId: currentPlayerProfile.id, soldAt: Date.now() });
            boughtMk = mk;
          });
          if (boughtMk) {
            playerGold -= boughtMk.price;
            const boughtItem = boughtMk.itemData ? { ...boughtMk.itemData } : { id: boughtMk.itemId, name: ITEMS_DATABASE[boughtMk.itemId]?.name || boughtMk.itemId, quantity: boughtMk.qty };
            pickupItem(boughtItem);
            if (boughtMk.sellerId) {
              await fbDb.collection("players").doc(boughtMk.sellerId).set({
                pendingGold: firebase.firestore.FieldValue.increment(boughtMk.price)
              }, { merge: true });
            }
            savePlayerToStorage();
            syncPlayerToCloud();
            addFloatingText(`-${boughtMk.price} Xu 🪙`, player.x, player.y - 12, "#38bdf8", true);
          }
        } catch (e) {
          if (e.message === "NO_GOLD") addFloatingText("❌ Không đủ Xu!", player.x, player.y - 12, "#ef4444");
          else addFloatingText("❌ Món đồ đã có người mua!", player.x, player.y - 12, "#ef4444");
        }
        renderInventory();
        renderNpcShopUI();
        return;
      }

      const list = getSharedMarketListings();
      const idx = list.findIndex(m => m.id === listingId);
      if (idx === -1) { renderNpcShopUI(); return; }
      const mk = list[idx];
      if (playerGold < mk.price) {
        addFloatingText("❌ Không đủ Xu!", player.x, player.y - 12, "#ef4444");
        return;
      }
      playerGold -= mk.price;
      const boughtItem = mk.itemData ? { ...mk.itemData } : { id: mk.itemId, name: ITEMS_DATABASE[mk.itemId]?.name || mk.itemId, quantity: mk.qty };
      pickupItem(boughtItem);
      list.splice(idx, 1);
      saveSharedMarketListings(list);

      if (mk.sellerId) {
        try {
          const payouts = JSON.parse(localStorage.getItem(STORAGE_PAYOUTS_KEY) || "{}");
          payouts[mk.sellerId] = (payouts[mk.sellerId] || 0) + mk.price;
          localStorage.setItem(STORAGE_PAYOUTS_KEY, JSON.stringify(payouts));
          if (marketChannel) marketChannel.postMessage({ type: "payout", sellerId: mk.sellerId });
        } catch (e) {}
      }

      savePlayerToStorage();
      addFloatingText(`-${mk.price} Xu 🪙`, player.x, player.y - 12, "#38bdf8", true);
      renderInventory();
      renderNpcShopUI();
    }

    // Chạm trực tiếp vào NPC Thương Nhân trên điện thoại (trong bán kính 2 ô)
    canvas.addEventListener("touchstart", (e) => {
      if (currentMap !== "home" || !e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const zoom = getCameraZoom();
      const wx = (touch.clientX - rect.left) / zoom + camera.x;
      const wy = (touch.clientY - rect.top) / zoom + camera.y;
      const distClickNPC = Math.hypot(wx - (HOME_MERCHANT.x + 8), wy - (HOME_MERCHANT.y + 8));
      const distPlayerNPC = Math.hypot((player.x + 8) - (HOME_MERCHANT.x + 8), (player.y + 8) - (HOME_MERCHANT.y + 8));
      if (distClickNPC <= 30 && distPlayerNPC <= 42) {
        e.preventDefault();
        e.stopPropagation();
        toggleNpcShopUI(true);
      }
    }, { passive: false });

    
    // -------------------------------------------------------------
    // BẢNG CHỈ SỐ NHÂN VẬT (PLAYER INFO [I] / MOBILE INFO)
    // -------------------------------------------------------------
    
    window.togglePlayerInfoUI = togglePlayerInfoUI;

    

    

    

    

    

    

    

    

    

    

    

    // Chạm trực tiếp vào NPC Thương Nhân trên điện thoại (trong bán kính 2 ô)
    canvas.addEventListener("touchstart", (e) => {
      if (currentMap !== "home" || !e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const zoom = getCameraZoom();
      const wx = (touch.clientX - rect.left) / zoom + camera.x;
      const wy = (touch.clientY - rect.top) / zoom + camera.y;
      const distClickNPC = Math.hypot(wx - (HOME_MERCHANT.x + 8), wy - (HOME_MERCHANT.y + 8));
      const distPlayerNPC = Math.hypot((player.x + 8) - (HOME_MERCHANT.x + 8), (player.y + 8) - (HOME_MERCHANT.y + 8));
      if (distClickNPC <= 30 && distPlayerNPC <= 42) {
        e.preventDefault();
        e.stopPropagation();
        toggleNpcShopUI(true);
      }
    }, { passive: false });

    
    // -------------------------------------------------------------
    // BẢNG CHỈ SỐ NHÂN VẬT (PLAYER INFO [I] / MOBILE INFO)
    // -------------------------------------------------------------
    
    window.togglePlayerInfoUI = togglePlayerInfoUI;

    

    

    

    

    

    

    

    

    

    

    

    const HOME_CAMPFIRE = {
      x: 248,
      y: 248,
      lightRadius: 76,
      healTimer: 0,
      inputItem: null,
      fuelItem: null,
      resultItem: null,
      cookProgress: 0,
      cookDuration: 4.0,
      fuelRemaining: 0,
      fuelMax: 16.0
    };

    // Vòng Khảm Đũa Phép trên bản đồ Nhà (đưa chuột vào nhấn hoặc chạy vào để mở bảng khảm chiêu)
    const HOME_WAND_ALTAR = {
      x: 204,
      y: 248,
      interactRadius: 16,
      hoverRadius: 20
    };

    function getPlayerDistToWandAltar() {
      const distCenter = Math.hypot((player.x + 8) - HOME_WAND_ALTAR.x, (player.y + 8) - HOME_WAND_ALTAR.y);
      const distFeet = Math.hypot((player.x + 8) - HOME_WAND_ALTAR.x, (player.y + 13) - HOME_WAND_ALTAR.y);
      return Math.min(distCenter, distFeet);
    }

    window.checkNearWandAltar = function () {
      return currentMap === "home" && getPlayerDistToWandAltar() <= HOME_WAND_ALTAR.interactRadius + 6;
    };

    function syncCampfireAndInventoryState() {
      const cfUI = document.getElementById("campfire-ui");
      const cfOpen = Boolean(cfUI && cfUI.style.display !== "none" && cfUI.style.display !== "");
      const invOpen = Boolean(inventoryUI && inventoryUI.style.display !== "none" && inventoryUI.style.display !== "");
      document.body.classList.toggle("campfire-and-inv-open", cfOpen && invOpen);

      const bagBtn = document.getElementById("btnCampfireToggleBag");
      if (bagBtn) {
        bagBtn.classList.toggle("active", invOpen);
        bagBtn.textContent = invOpen ? "🎒 Đóng Túi" : "🎒 Mở Túi";
      }
    }

    function toggleCampfireUI(forceOpen = null) {
      const ui = document.getElementById("campfire-ui");
      if (!ui) return;
      const isClosed = ui.style.display === "none" || ui.style.display === "";
      const willOpen = forceOpen !== null ? forceOpen : isClosed;
      if (willOpen && isChestOpen()) toggleChestUI(false);
      ui.style.display = willOpen ? "block" : "none";
      if (willOpen) {
        initCampfireUIEvents();
        renderCampfireUI();
      }
      syncCampfireAndInventoryState();
    }

    // -------------------------------------------------------------
    // HỆ THỐNG RƯƠNG ĐỒ (STORAGE CHEST - 27 Ô)
    // -------------------------------------------------------------
    let activeOpenChest = null;

    function isChestOpen() {
      const el = document.getElementById("chest-ui");
      return Boolean(activeOpenChest && el && el.style.display !== "none" && el.style.display !== "");
    }

    function checkNearChest() {
      let nearest = null;
      let minDist = INTERACTION_RADIUS + 22;
      for (const obj of currentObjects) {
        if (obj.type === "chest") {
          const d = Math.hypot((player.x + 8) - (obj.x + 8), (player.y + 8) - (obj.y + 8));
          if (d <= minDist) {
            minDist = d;
            nearest = obj;
          }
        }
      }
      return nearest;
    }
    window.checkNearChest = checkNearChest;

    function syncChestAndInventoryState() {
      const chestOpen = isChestOpen();
      const invOpen = Boolean(inventoryUI && inventoryUI.style.display !== "none" && inventoryUI.style.display !== "");
      document.body.classList.toggle("chest-and-inv-open", chestOpen && invOpen);
    }

    function initChestUIDOM() {
      const grid = document.getElementById("chestStorageGrid");
      if (grid && grid.children.length === 0) {
        for (let i = 0; i < 27; i++) {
          const slotEl = document.createElement("div");
          slotEl.className = "slot";
          slotEl.dataset.type = "chest";
          slotEl.dataset.index = i;

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("chest", i, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("chest", i), (e) => handleSlotMouseEnter("chest", i, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("chest", i);
          });
          bindSlotTouchEvents(slotEl, "chest", i);

          grid.appendChild(slotEl);
        }
      }

      const closeBtn = document.getElementById("btnCloseChestUI");
      if (closeBtn && !closeBtn.dataset.bound) {
        closeBtn.dataset.bound = "1";
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleChestUI(false);
        });
      }

      const chestEl = document.getElementById("chest-ui");
      if (chestEl && !chestEl.dataset.eventsBound) {
        chestEl.dataset.eventsBound = "1";
        chestEl.addEventListener("keydown", (e) => {
          const k = (e.key || "").toLowerCase();
          if (k === "e" || e.key === "Escape" || e.code === "Escape") return;
          e.stopPropagation();
        });
        chestEl.addEventListener("keyup", (e) => e.stopPropagation());
        chestEl.addEventListener("contextmenu", (e) => e.preventDefault());
      }
    }

    function renderChestUI() {
      if (!isChestOpen() || !activeOpenChest) return;
      initChestUIDOM();
      if (!Array.isArray(activeOpenChest.items)) {
        activeOpenChest.items = new Array(27).fill(null);
      }
      const grid = document.getElementById("chestStorageGrid");
      const badge = document.getElementById("chestCountBadge");
      let usedCount = 0;
      for (let i = 0; i < 27; i++) {
        const it = activeOpenChest.items[i];
        if (it && it.quantity > 0) usedCount++;
        if (grid && grid.children[i]) {
          updateSlotDOM(grid.children[i], it, i, false);
        }
      }
      if (badge) {
        const nextText = `${usedCount}/27`;
        if (badge.textContent !== nextText) badge.textContent = nextText;
      }
    }

    function toggleChestUI(forceOpen = null, chestObj = null) {
      const ui = document.getElementById("chest-ui");
      if (!ui) return;
      const isClosed = ui.style.display === "none" || ui.style.display === "";
      const willOpen = forceOpen !== null ? forceOpen : isClosed;

      if (willOpen) {
        const target = chestObj || activeOpenChest || checkNearChest();
        if (!target) return;
        if (!Array.isArray(target.items)) {
          target.items = new Array(27).fill(null);
        }
        const cfUI = document.getElementById("campfire-ui");
        if (cfUI && cfUI.style.display !== "none" && cfUI.style.display !== "") {
          toggleCampfireUI(false);
        }
        if (isWandModalOpen()) {
          openWandCustomizer(false);
        }
        if (isRecipeBookOpen) {
          setRecipeBookOpen(false);
        }

        activeOpenChest = target;
        keys.up = false; keys.down = false; keys.left = false; keys.right = false;
        isKeyActionHeld = false;
        isMouseActionHeld = false;
        isMobileActionHeld = false;
        isActionKeyHeld = false;
        pendingQuickBowShot = false;
        isBowCharging = false;
        bowChargeTimer = 0;
        resetFishingState();
        if (window.resetMobileJoystick) window.resetMobileJoystick();
        if (player.action !== 'die' && player.action !== 'attack') {
          player.action = 'idle';
        }

        ui.style.display = "block";
        initChestUIDOM();
        renderChestUI();
        if (!isInventoryOpen()) {
          toggleInventory(true, "pocket");
        } else {
          if (pocketCraftingSection) pocketCraftingSection.style.display = "none";
          if (workstationContainer) workstationContainer.style.display = "none";
          isPaused = true;
          needsCanvasRedraw = true;
        }
        syncChestAndInventoryState();
        playImpactSound(false);
      } else {
        cancelActiveTouchInvState(true);
        ui.style.display = "none";
        activeOpenChest = null;
        hideItemTooltip();
        if (isInventoryOpen()) {
          inventoryUI.style.display = "none";
        }
        if (!isWandModalOpen()) {
          if (cursorItem && cursorItem.quantity > 0) {
            pickupItem(cursorItem);
            cursorItem = null;
            updateCursorUI();
          }
          isPaused = false;
          needsCanvasRedraw = true;
        }
        syncChestAndInventoryState();
      }
      if (window.onMobileHudSync) window.onMobileHudSync();
    }
    window.openNearestChest = function () {
      const ch = checkNearChest();
      if (ch) {
        toggleChestUI(true, ch);
        return true;
      }
      return false;
    };

    function renderCampfireUI() {
      const inEl = document.getElementById("campfireInputSlot");
      const fuelEl = document.getElementById("campfireFuelSlot");
      const resEl = document.getElementById("campfireResultSlot");
      const cookBar = document.getElementById("campfireCookBar");
      const fuelBar = document.getElementById("campfireFuelBar");
      const flameIcon = document.getElementById("campfireFlameIcon");
      if (!inEl || !fuelEl || !resEl) return;

      updateSlotDOM(inEl, HOME_CAMPFIRE.inputItem, 0, false);
      updateSlotDOM(fuelEl, HOME_CAMPFIRE.fuelItem, 0, false);
      updateSlotDOM(resEl, HOME_CAMPFIRE.resultItem, 0, false);

      if (cookBar) cookBar.style.width = Math.min(100, (HOME_CAMPFIRE.cookProgress / HOME_CAMPFIRE.cookDuration) * 100) + "%";
      if (fuelBar) fuelBar.style.width = (HOME_CAMPFIRE.fuelMax > 0 ? Math.min(100, (HOME_CAMPFIRE.fuelRemaining / HOME_CAMPFIRE.fuelMax) * 100) : 0) + "%";
      if (flameIcon) flameIcon.style.opacity = HOME_CAMPFIRE.fuelRemaining > 0 ? "1" : "0.3";
    }

    
    // Nhấn chuột trái trực tiếp vào Lửa Trại, Vòng Khảm Đũa hoặc Bàn Chế Tạo trên bản đồ để mở
    canvas.addEventListener("mousemove", (e) => {
      if (isRecentTouchInteraction()) return;
      const rect = canvas.getBoundingClientRect();
      const zoom = getCameraZoom();
      const worldX = (e.clientX - rect.left) / zoom + camera.x;
      const worldY = (e.clientY - rect.top) / zoom + camera.y;
      lastCanvasMouseWorld = { x: worldX, y: worldY };

      if (currentMap === "home" && !isPaused) {
        const distAltar = Math.hypot(worldX - HOME_WAND_ALTAR.x, worldY - HOME_WAND_ALTAR.y);
        isHoveringWandAltar = distAltar <= HOME_WAND_ALTAR.hoverRadius;
      } else {
        isHoveringWandAltar = false;
      }
      canvas.style.cursor = isHoveringWandAltar ? "pointer" : "";
    });

    canvas.addEventListener("mouseleave", () => {
      isHoveringWandAltar = false;
      canvas.style.cursor = "";
    });

    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (inventoryUI && inventoryUI.style.display !== "none" && (!document.getElementById("campfire-ui") || document.getElementById("campfire-ui").style.display === "none")) return;
      if (isWandModalOpen()) return;
      const rect = canvas.getBoundingClientRect();
      const zoom = getCameraZoom();
      const worldX = (e.clientX - rect.left) / zoom + camera.x;
      const worldY = (e.clientY - rect.top) / zoom + camera.y;

      // 1. Kiểm tra click vào Lửa Trại hoặc Vòng Khảm Đũa ở map Nhà
      if (currentMap === "home") {
        const distClickAltar = Math.hypot(worldX - HOME_WAND_ALTAR.x, worldY - HOME_WAND_ALTAR.y);
        if (distClickAltar <= HOME_WAND_ALTAR.hoverRadius + 2) {
          e.preventDefault();
          e.stopPropagation();
          wandAltarTriggerLock = true;
          openWandCustomizer(true);
          return;
        }

        const distClickNPC = Math.hypot(worldX - (HOME_MERCHANT.x + 8), worldY - (HOME_MERCHANT.y + 8));
        const distPlayerNPC = Math.hypot((player.x + 8) - (HOME_MERCHANT.x + 8), (player.y + 8) - (HOME_MERCHANT.y + 8));
        if (distClickNPC <= 34) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (distPlayerNPC <= 52) {
            toggleNpcShopUI(true);
          } else {
            addFloatingText("💬 Lại gần Thương Nhân hơn (2 ô)!", HOME_MERCHANT.x - 24, HOME_MERCHANT.y - 14, "#fde047");
          }
          return;
        }
        const distClickCF = Math.hypot(worldX - HOME_CAMPFIRE.x, worldY - HOME_CAMPFIRE.y);
        const distPlayerCF = Math.hypot((player.x + 8) - HOME_CAMPFIRE.x, (player.y + 8) - HOME_CAMPFIRE.y);
        if (distClickCF <= 18 && distPlayerCF <= 46) {
          initCampfireUIEvents();
          toggleCampfireUI(true);
          return;
        }
      }

      // 2. Kiểm tra click vào Bàn Chế Tạo trên bản đồ
      for (const obj of currentObjects) {
        if (obj.type === "crafting_table") {
          const distClick = Math.hypot(worldX - (obj.x + 8), worldY - (obj.y + 8));
          const distPlayer = Math.hypot((player.x + 8) - (obj.x + 8), (player.y + 8) - (obj.y + 8));
          if (distClick <= 16 && distPlayer <= INTERACTION_RADIUS + 24) {
            toggleInventory(true, 'workstation');
            return;
          }
        }
      }
    });

    function initCampfireUIEvents() {
      const slots = [
        { id: "campfireInputSlot", type: "campfire_in" },
        { id: "campfireFuelSlot", type: "campfire_fuel" },
        { id: "campfireResultSlot", type: "campfire_out" }
      ];
      for (const s of slots) {
        const el = document.getElementById(s.id);
        if (!el || el.dataset.bound) continue;
        el.dataset.bound = "1";
        el.addEventListener("contextmenu", (e) => e.preventDefault());
        el.addEventListener("mousedown", (e) => handleSlotMouseDown(s.type, 0, e));
        bindMouseHoverTooltip(el, () => getSlotItem(s.type, 0));
        bindSlotTouchEvents(el, s.type, 0);
      }
      const bagBtn = document.getElementById("btnCampfireToggleBag");
      if (bagBtn && !bagBtn.dataset.bound) {
        bagBtn.dataset.bound = "1";
        bagBtn.addEventListener("click", () => {
          toggleInventory(null, "pocket");
        });
      }
    }

    function tryEatConsumable(slotIdx) {
      if (player.action === 'die') return false;
      const item = playerInventory[slotIdx];
      if (!item) return false;
      const data = getItemData(item) || item;
      if (data.category !== "consumable") return false;

      if (player.hp >= player.maxHp) {
                return true;
      }

      const hpGain = data.healAmount || 5;
      player.hp = Math.min(player.maxHp, player.hp + hpGain);
      if (player.hp > player.displayHp) player.displayHp = player.hp;

      item.quantity -= 1;
      if (item.quantity <= 0) playerInventory[slotIdx] = null;
      if (valPlayerHP) {
        valPlayerHP.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
      }
      renderHotbar();
      playImpactSound(false);

      addFloatingText(`+${hpGain} HP ❤️`, player.x - 6, player.y - 14, "#4ade80", true);
      return true;
    }

    function createGemIconSvgDataUri(outerCol, midCol, innerCol, strokeCol, facetMarkup = "") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2.5" y="2.5" width="27" height="27" rx="7" fill="rgba(15,23,42,0.88)" stroke="${strokeCol}" stroke-width="1.5" stroke-opacity="0.6"/><polygon points="16,3.5 26.5,10.5 26.5,21.5 16,28.5 5.5,21.5 5.5,10.5" fill="${outerCol}" stroke="${strokeCol}" stroke-width="1.8" stroke-linejoin="round"/><polygon points="16,7 22.5,12 22.5,20 16,25 9.5,20 9.5,12" fill="${midCol}"/><polygon points="16,9.5 20,13 20,19 16,22.5 12,19 12,13" fill="${innerCol}"/><polygon points="16,7 16,9.5 12,13 9.5,12" fill="rgba(255,255,255,0.45)"/><circle cx="13.5" cy="12" r="1.5" fill="#ffffff" opacity="0.9"/>${facetMarkup}</svg>`;
      return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    }

    const SPELLS_DATABASE = {
      spell_gravity: {
        id: "spell_gravity",
        name: "Ngọc Trọng Lực",
        shortName: "Trọng Lực",
        badge: "⬇",
        color: "#a855f7",
        glow: "#f0abfc",
        cooldown: 4.5,
        damage: 22,
        hasSettings: true,
        desc: "Tạo trường trọng lực kéo tụ và ép bẹp quái vật trong vùng chỉ định.",
        icon: "assets/items/skills/spell_gravity.png"
      },
      spell_wood: {
        id: "spell_wood",
        name: "Ngọc Mộc Độn",
        shortName: "Mộc Độn",
        badge: "🪵",
        color: "#22c55e",
        glow: "#86efac",
        cooldown: 5.5,
        damage: 18,
        hasSettings: true,
        desc: "Triệu hồi rễ cây cổ thụ trói chặt mục tiêu và tỏa phấn hoa gây ngủ.",
        icon: "assets/items/skills/spell_wood.png"
      },
      spell_timestop: {
        id: "spell_timestop",
        name: "Ngọc Dừng Thời Gian",
        shortName: "Dừng TG",
        badge: "⏳",
        color: "#38bdf8",
        glow: "#bae6fd",
        cooldown: 9.0,
        damage: 35,
        hasSettings: true,
        desc: "Ngưng đọng thời gian toàn vùng, tích tụ đòn đánh và kích nổ khi hết hiệu lực.",
        icon: "assets/items/skills/spell_timestop.png"
      }
    };

    const WAND_RESONANCE_DATABASE = {
      spell_gravity: {
        spellId: "spell_gravity",
        label: "🌌 Cộng Hưởng Trọng Trường",
        shortCap: "Đánh 🌌",
        badge: "🌌",
        color: "#c084fc",
        glow: "#f0abfc",
        basicDesc: "Cầu Hố Đen (Hút gom & nổ diện rộng)",
        desc: "Đánh thường tạo hố đen mini kéo quái lại gần và gây sát thương lan."
      },
      spell_wood: {
        spellId: "spell_wood",
        label: "🌲 Cộng Hưởng Rừng Thiêng",
        shortCap: "Đánh 🌲",
        badge: "🌲",
        color: "#22c55e",
        glow: "#86efac",
        basicDesc: "Cọc Rễ Gai (Trói chân & gây độc)",
        desc: "Đánh thường phóng rễ gai đâm xuyên mục tiêu, gây độc và giữ chân."
      },
      spell_timestop: {
        spellId: "spell_timestop",
        label: "⏳ Cộng Hưởng Thời Không",
        shortCap: "Đánh ⏳",
        badge: "⏳",
        color: "#38bdf8",
        glow: "#bae6fd",
        basicDesc: "Đạn Thời Không (Làm tê liệt & nổ chậm)",
        desc: "Đánh thường làm chậm mục tiêu và tích tụ năng lượng phát nổ."
      }
    };

    function getWandResonance(wandItem) {
      if (!wandItem || wandItem.id !== "magic_wand") return null;
      const slots = normalizeWandSlots(wandItem.wandData && wandItem.wandData.slots);
      if (slots[0] && slots[0] === slots[1] && slots[1] === slots[2]) {
        return WAND_RESONANCE_DATABASE[slots[0]] || null;
      }
      return null;
    }

    function normalizeWandSlots(rawSlots) {
      if (!Array.isArray(rawSlots)) return [null, null, null];
      const sliced = rawSlots.slice(0, 3);
      const arr = sliced.map((sid) => (sid && SPELLS_DATABASE[sid] ? sid : null));
      while (arr.length < 3) arr.push(null);
      return arr;
    }

    function normalizeGemSlots(rawGemSlots) {
      if (!Array.isArray(rawGemSlots)) return [null, null, null];
      const sliced = rawGemSlots.slice(0, 3);
      const arr = sliced.map((gid) => (gid && ITEMS_DATABASE[gid] && ITEMS_DATABASE[gid].category === "gem" ? gid : null));
      while (arr.length < 3) arr.push(null);
      return arr;
    }

    function cloneWandData(wandData) {
      if (!wandData) return null;
      return {
        slots: normalizeWandSlots(wandData.slots),
        gemSlots: normalizeGemSlots(wandData.gemSlots)
      };
    }

    function ensureWandData(wandItem) {
      if (!wandItem || wandItem.id !== "magic_wand") return null;
      if (!wandItem.wandData || !Array.isArray(wandItem.wandData.slots)) {
        wandItem.wandData = {
          slots: [null, null, null],
          gemSlots: [null, null, null]
        };
      } else {
        wandItem.wandData.slots = normalizeWandSlots(wandItem.wandData.slots);
        wandItem.wandData.gemSlots = normalizeGemSlots(wandItem.wandData.gemSlots);
      }
      return wandItem.wandData;
    }

    function getWandGemBonuses(wandItem) {
      const res = {
        damageBonus: 0,
        burnStacks: 0,
        frostStacks: 0,
        vampirePct: 0,
        hasteStacks: 0,
        critStacks: 0,
        critChance: 0,
        cooldownMult: 1,
        burnSpread: false,
        frostSpread: false,
        allSameGemId: null,
        summaryParts: []
      };
      if (!wandItem || wandItem.id !== "magic_wand") return res;
      const wd = ensureWandData(wandItem);
      const counts = {};
      for (const gid of wd.gemSlots) {
        if (!gid || !ITEMS_DATABASE[gid]) continue;
        counts[gid] = (counts[gid] || 0) + 1;
        if (gid === "gem_damage") res.damageBonus += 3;
        else if (gid === "gem_fire") res.burnStacks += 1;
        else if (gid === "gem_frost") res.frostStacks += 1;
        else if (gid === "gem_vampire") res.vampirePct += 0.15;
        else if (gid === "gem_haste") res.hasteStacks += 1;
        else if (gid === "gem_crit") res.critStacks += 1;
      }
      if (wd.gemSlots[0] && wd.gemSlots[0] === wd.gemSlots[1] && wd.gemSlots[1] === wd.gemSlots[2]) {
        res.allSameGemId = wd.gemSlots[0];
        if (res.allSameGemId === "gem_fire") res.burnSpread = true;
        if (res.allSameGemId === "gem_frost") res.frostSpread = true;
        if (res.allSameGemId === "gem_damage") res.damageBonus += 3;
        if (res.allSameGemId === "gem_vampire") res.vampirePct += 0.10;
      }
      res.critChance = Math.min(0.60, res.critStacks * 0.18);
      res.cooldownMult = Math.max(0.55, 1 - Math.min(0.45, res.hasteStacks * 0.14));

      if (res.damageBonus > 0) res.summaryParts.push(`+${res.damageBonus} DMG`);
      if (res.burnStacks > 0) res.summaryParts.push(res.burnSpread ? "🔥 Cháy Lan AoE" : "🔥 Thiêu Đốt");
      if (res.frostStacks > 0) res.summaryParts.push(res.frostSpread ? "❄️ Đóng Băng Lan" : "❄️ Làm Chậm");
      if (res.vampirePct > 0) res.summaryParts.push(`🩸 +${Math.round(res.vampirePct * 100)}% Hút Máu`);
      if (res.hasteStacks > 0) res.summaryParts.push(`💨 -${Math.round((1 - res.cooldownMult) * 100)}% Hồi Chiêu`);
      if (res.critChance > 0) res.summaryParts.push(`💥 +${Math.round(res.critChance * 100)}% Chí Mạng`);
      return res;
    }

    // -------------------------------------------------------------
    // HỆ THỐNG ROLL CHỈ SỐ VŨ KHÍ ("NHÂN PHẨM") & DÒNG PHỤ CỘNG DỒN
    // -------------------------------------------------------------
    const WEAPON_ROLL_TABLE = {
      wood_sword:     { dmgMin: 6,  dmgMax: 11, tier: 1 },
      wood_axe:       { dmgMin: 4,  dmgMax: 8,  tier: 1 },
      wood_pickaxe:   { dmgMin: 3,  dmgMax: 6,  tier: 1 },
      wooden_pickaxe: { dmgMin: 3,  dmgMax: 6,  tier: 1 },
      stone_sword:    { dmgMin: 11, dmgMax: 18, tier: 2 },
      stone_axe:      { dmgMin: 9,  dmgMax: 14, tier: 2 },
      stone_pickaxe:  { dmgMin: 6,  dmgMax: 10, tier: 2 },
      iron_sword:     { dmgMin: 18, dmgMax: 27, tier: 3 },
      iron_axe:       { dmgMin: 14, dmgMax: 21, tier: 3 },
      iron_pickaxe:   { dmgMin: 10, dmgMax: 16, tier: 3 },
      gold_sword:     { dmgMin: 24, dmgMax: 35, tier: 4 },
      gold_axe:       { dmgMin: 19, dmgMax: 28, tier: 4 },
      gold_pickaxe:   { dmgMin: 14, dmgMax: 21, tier: 4 },
      diamond_sword:  { dmgMin: 34, dmgMax: 48, tier: 5 },
      diamond_axe:    { dmgMin: 27, dmgMax: 38, tier: 5 },
      diamond_pickaxe:{ dmgMin: 20, dmgMax: 30, tier: 5 },
      hunting_bow:    { dmgMin: 18, dmgMax: 30, tier: 2, isBow: true },
      magic_wand:     { dmgMin: 4,  dmgMax: 10, tier: 4 }
    };

    function rollWeaponInstance(item) {
      if (!item || !item.id) return item;
      const cfg = WEAPON_ROLL_TABLE[item.id];
      if (!cfg) return item;
      // Nếu đã roll rồi thì giữ nguyên
      if (item.rollQuality) return item;

      // Xác suất nhân phẩm: 55% Thường, 30% Khá, 12% Tinh Xảo, 3% Cực Phẩm
      const luck = Math.random();
      let frac = 0;
      let quality = "Thường";
      let qualityColor = "#cbd5e1";

      if (luck >= 0.97) {
        frac = 0.92 + Math.random() * 0.08;
        quality = "Cực Phẩm";
        qualityColor = "#fde047";
      } else if (luck >= 0.85) {
        frac = 0.72 + Math.random() * 0.20;
        quality = "Tinh Xảo";
        qualityColor = "#c084fc";
      } else if (luck >= 0.55) {
        frac = 0.42 + Math.random() * 0.30;
        quality = "Khá";
        qualityColor = "#38bdf8";
      } else {
        frac = Math.random() * 0.42;
        quality = "Thường";
        qualityColor = "#cbd5e1";
      }

      const rolledDmg = Math.round(cfg.dmgMin + (cfg.dmgMax - cfg.dmgMin) * frac);
      item.damage = rolledDmg;
      item.dmgMin = cfg.dmgMin;
      item.dmgMax = cfg.dmgMax;
      item.rollQuality = quality;
      item.rollColor = qualityColor;

      // Tỉ lệ nhỏ cộng thêm chỉ số phụ (Giáp, Máu, Tốc chạy): 28% ra 1 dòng, 8% ra 2 dòng
      const affixRoll = Math.random();
      const numAffixes = (affixRoll < 0.08) ? 2 : (affixRoll < 0.36 ? 1 : 0);
      if (numAffixes > 0) {
        const pool = ["armor", "hp", "speed"];
        for (let k = 0; k < numAffixes && pool.length > 0; k++) {
          const pickIdx = Math.floor(Math.random() * pool.length);
          const stat = pool.splice(pickIdx, 1)[0];
          const t = cfg.tier || 1;
          if (stat === "armor") {
            item.bonusArmor = Math.max(2, Math.round((1.5 + Math.random() * 2.0) * t));
          } else if (stat === "hp") {
            item.bonusHp = Math.max(5, Math.round((4 + Math.random() * 4) * t));
          } else if (stat === "speed") {
            item.bonusSpeed = Number((0.02 + Math.random() * 0.015 * t).toFixed(2));
          }
        }
      }
      return item;
    }

    const ITEMS_DATABASE = {
      "magic_wand": {
        id: "magic_wand",
        name: "Đũa Phép",
        category: "weapon",
        rarity: "epic",
        maxStack: 1,
        value: 85,
        damage: 5,
        durability: 200,
        maxDurability: 200,
        perks: [
          "✦ Khảm tối đa 3 Ngọc Chiêu Thức [Z / X / C]",
          "✦ Khảm tối đa 3 Ngọc Bổ Trợ cường hóa đòn đánh"
        ],
        description: "Vũ khí ma pháp tầm xa, tùy biến linh hoạt chiêu thức và ngọc bổ trợ.",
        icon: "assets/items/tools_weapons/đũa phép.png"
      },
      "spell_gravity": {
        id: "spell_gravity",
        name: SPELLS_DATABASE.spell_gravity.name,
        category: "spell",
        spellId: "spell_gravity",
        rarity: "legendary",
        maxStack: 1,
        value: 140,
        damage: 22,
        perks: [
          "✦ Khảm vào ô Chiêu Thức [Z / X / C] của Đũa Phép",
          "✦ Kéo tụ, ép bẹp và làm choáng quái vật trong vùng"
        ],
        description: SPELLS_DATABASE.spell_gravity.desc,
        icon: SPELLS_DATABASE.spell_gravity.icon
      },
      "spell_wood": {
        id: "spell_wood",
        name: SPELLS_DATABASE.spell_wood.name,
        category: "spell",
        spellId: "spell_wood",
        rarity: "legendary",
        maxStack: 1,
        value: 140,
        damage: 18,
        perks: [
          "✦ Khảm vào ô Chiêu Thức [Z / X / C] của Đũa Phép",
          "✦ Trói chân mục tiêu bằng rễ cây và tỏa phấn gây ngủ"
        ],
        description: SPELLS_DATABASE.spell_wood.desc,
        icon: SPELLS_DATABASE.spell_wood.icon
      },
      "spell_timestop": {
        id: "spell_timestop",
        name: SPELLS_DATABASE.spell_timestop.name,
        category: "spell",
        spellId: "spell_timestop",
        rarity: "legendary",
        maxStack: 1,
        value: 160,
        damage: 35,
        perks: [
          "✦ Khảm vào ô Chiêu Thức [Z / X / C] của Đũa Phép",
          "✦ Đóng băng thời gian toàn vùng và dồn sát thương nổ"
        ],
        description: SPELLS_DATABASE.spell_timestop.desc,
        icon: SPELLS_DATABASE.spell_timestop.icon
      },
      "gem_damage": {
        id: "gem_damage",
        name: "Ngọc Sức Mạnh",
        category: "gem",
        gemType: "damage",
        rarity: "uncommon",
        maxStack: 16,
        value: 45,
        damageBonus: 3,
        perks: [
          "✦ Khảm vào ô Ngọc Bổ Trợ của Đũa Phép",
          "✦ Khảm đủ 3 viên: Tổng cộng +12 DMG toàn diện"
        ],
        description: "Tinh thể đỏ gia tăng trực tiếp uy lực cho đòn đánh và phép thuật.",
        icon: createGemIconSvgDataUri("#991b1b", "#ef4444", "#fca5a5", "#fecaca")
      },
      "gem_fire": {
        id: "gem_fire",
        name: "Ngọc Viêm Hỏa",
        category: "gem",
        gemType: "fire",
        rarity: "rare",
        maxStack: 16,
        value: 80,
        effectType: "burn",
        perks: [
          "✦ Khảm vào ô Ngọc Bổ Trợ của Đũa Phép",
          "✦ Khảm đủ 3 viên: Kích hoạt Cháy Lan sang quái lân cận"
        ],
        description: "Tinh thể lửa đốt cháy mục tiêu, rút máu liên tục theo thời gian.",
        icon: createGemIconSvgDataUri("#9a3412", "#f97316", "#fde047", "#fed7aa")
      },
      "gem_frost": {
        id: "gem_frost",
        name: "Ngọc Băng Sương",
        category: "gem",
        gemType: "frost",
        rarity: "rare",
        maxStack: 16,
        value: 75,
        effectType: "slow",
        perks: [
          "✦ Khảm vào ô Ngọc Bổ Trợ của Đũa Phép",
          "✦ Khảm đủ 3 viên: Tỏa Sóng Băng làm chậm diện rộng"
        ],
        description: "Tinh thể băng giá làm tê cóng và giảm 50% tốc độ di chuyển của quái.",
        icon: createGemIconSvgDataUri("#075985", "#0ea5e9", "#bae6fd", "#e0f2fe")
      },
      "gem_vampire": {
        id: "gem_vampire",
        name: "Ngọc Hút Máu",
        category: "gem",
        gemType: "vampire",
        rarity: "epic",
        maxStack: 16,
        value: 120,
        effectType: "vampire",
        perks: [
          "✦ Khảm vào ô Ngọc Bổ Trợ của Đũa Phép",
          "✦ Khảm đủ 3 viên: Tăng hiệu suất hút máu lên 55%"
        ],
        description: "Tinh thể huyết ngọc chuyển hóa sát thương gây ra thành sinh lực.",
        icon: createGemIconSvgDataUri("#701a75", "#c026d3", "#f5d0fe", "#fbcfe8")
      },
      "gem_haste": {
        id: "gem_haste",
        name: "Ngọc Tốc Độ",
        category: "gem",
        gemType: "haste",
        rarity: "rare",
        maxStack: 16,
        value: 85,
        cooldownReduction: 14,
        perks: [
          "✦ Khảm vào ô Ngọc Bổ Trợ của Đũa Phép",
          "✦ Tăng tốc độ xuất chiêu và bay của cầu năng lượng"
        ],
        description: "Tinh thể gió giúp rút ngắn thời gian hồi chiêu thức ma pháp.",
        icon: createGemIconSvgDataUri("#115e59", "#14b8a6", "#99f6e4", "#ccfbf1")
      },
      "gem_crit": {
        id: "gem_crit",
        name: "Ngọc Chí Mạng",
        category: "gem",
        gemType: "crit",
        rarity: "epic",
        maxStack: 16,
        value: 110,
        critChanceBonus: 18,
        perks: [
          "✦ Khảm vào ô Ngọc Bổ Trợ của Đũa Phép",
          "✦ Đòn chí mạng gây x1.75 sát thương nổ ánh kim"
        ],
        description: "Tinh thể sét gia tăng xác suất tung đòn chí mạng uy lực cao.",
        icon: createGemIconSvgDataUri("#854d0e", "#eab308", "#fef08a", "#fef9c3")
      },
      "fishing_rod": {
        id: "fishing_rod",
        name: "Cần Câu",
        category: "tool",
        toolType: "fishing_rod",
        rarity: "uncommon",
        maxStack: 1,
        value: 18,
        durability: 100,
        maxDurability: 100,
        perks: [
          "✦ Quăng phao xuống mặt nước (Nhà / Rừng / Hồ)",
          "✦ Bấm thu cần ngay khi hiện dấu [!] để bắt cá & báu vật"
        ],
        description: "Cần câu dẻo dai dùng để câu cá và vớt ngọc quý dưới hồ nước.",
        icon: "assets/items/tools_weapons/fishing_rod.svg"
      },
      // -------------------------------------------------------------
      // 0. HỆ THỐNG GIÁP & TRANG BỊ (ARMOR & EQUIPMENT)
      // -------------------------------------------------------------
      "leather_helmet": {
        id: "leather_helmet", name: "Nón Da", category: "armor", slotType: "helmet",
        rarity: "common", maxStack: 1, value: 8, armor: 5,
        speedBonus: 0, knockbackResist: 0, maxHpBonus: 0,
        durability: 80, maxDurability: 80, description: "Nón da thú nhẹ nhàng, bảo vệ phần đầu cơ bản.",
        icon: "assets/items/armor_equipment/nón da.png"
      },
      "leather_chest": {
        id: "leather_chest", name: "Giáp Da", category: "armor", slotType: "chest",
        rarity: "common", maxStack: 1, value: 16, armor: 12,
        speedBonus: 0, knockbackResist: 0, maxHpBonus: 0,
        durability: 120, maxDurability: 120, description: "Áo giáp da thuộc dẻo dai, giảm sát thương đòn cắn.",
        icon: "assets/items/armor_equipment/giáp da.png"
      },
      "leather_legs": {
        id: "leather_legs", name: "Quần Da", category: "armor", slotType: "legs",
        rarity: "common", maxStack: 1, value: 12, armor: 8,
        speedBonus: 0.04, knockbackResist: 0, maxHpBonus: 0,
        durability: 100, maxDurability: 100, description: "Quần da linh hoạt, hỗ trợ di chuyển nhanh nhẹn.",
        icon: "assets/items/armor_equipment/quần da.png"
      },
      "leather_boots": {
        id: "leather_boots", name: "Giày Da", category: "armor", slotType: "boots",
        rarity: "common", maxStack: 1, value: 10, armor: 5,
        speedBonus: 0.08, knockbackResist: 0, maxHpBonus: 0,
        durability: 90, maxDurability: 90, description: "Giày da êm ái giúp tăng tốc độ bước chạy.",
        icon: "assets/items/armor_equipment/giày da.png"
      },

      "iron_helmet": {
        id: "iron_helmet", name: "Nón Sắt", category: "armor", slotType: "helmet",
        rarity: "uncommon", maxStack: 1, value: 20, armor: 10,
        speedBonus: 0, knockbackResist: 0.15, maxHpBonus: 0,
        durability: 160, maxDurability: 160, description: "Mũ sắt rèn chắc chắn, giảm chấn động khi bị tấn công.",
        icon: "assets/items/armor_equipment/nón sắt.png"
      },
      "iron_chest": {
        id: "iron_chest", name: "Giáp Sắt", category: "armor", slotType: "chest",
        rarity: "uncommon", maxStack: 1, value: 36, armor: 24,
        speedBonus: 0, knockbackResist: 0.35, maxHpBonus: 0,
        durability: 240, maxDurability: 240, description: "Giáp ngực sắt dày dặn, chống chịu tốt trước quái thú.",
        icon: "assets/items/armor_equipment/giáp sắt.png"
      },
      "iron_legs": {
        id: "iron_legs", name: "Quần Sắt", category: "armor", slotType: "legs",
        rarity: "uncommon", maxStack: 1, value: 28, armor: 16,
        speedBonus: 0, knockbackResist: 0.20, maxHpBonus: 0,
        durability: 200, maxDurability: 200, description: "Quần giáp sắt bảo vệ đôi chân và hạn chế bị đẩy lùi.",
        icon: "assets/items/armor_equipment/quần sắt.png"
      },
      "iron_boots": {
        id: "iron_boots", name: "Giày Sắt", category: "armor", slotType: "boots",
        rarity: "uncommon", maxStack: 1, value: 22, armor: 10,
        speedBonus: 0, knockbackResist: 0.15, maxHpBonus: 0,
        durability: 180, maxDurability: 180, description: "Ủng sắt nặng đầm giúp đứng vững trước lực húc.",
        icon: "assets/items/armor_equipment/giày sắt.png"
      },

      "gold_helmet": {
        id: "gold_helmet", name: "Nón Vàng", category: "armor", slotType: "helmet",
        rarity: "rare", maxStack: 1, value: 45, armor: 12,
        speedBonus: 0, knockbackResist: 0, maxHpBonus: 0,
        durability: 140, maxDurability: 140, description: "Mũ giáp mạ vàng hoàng gia, chế tác tinh xảo.",
        icon: "assets/items/armor_equipment/nón vàng.png"
      },
      "gold_chest": {
        id: "gold_chest", name: "Giáp Vàng", category: "armor", slotType: "chest",
        rarity: "rare", maxStack: 1, value: 75, armor: 28,
        speedBonus: 0, knockbackResist: 0, maxHpBonus: 0,
        durability: 200, maxDurability: 200, description: "Giáp ngực ánh kim rực rỡ với khả năng phòng vệ cao.",
        icon: "assets/items/armor_equipment/giáp vàng.png"
      },
      "gold_legs": {
        id: "gold_legs", name: "Quần Vàng", category: "armor", slotType: "legs",
        rarity: "rare", maxStack: 1, value: 55, armor: 18,
        speedBonus: 0, knockbackResist: 0, maxHpBonus: 0,
        durability: 170, maxDurability: 170, description: "Quần giáp vàng sang trọng, cân bằng giữa giáp và độ bền.",
        icon: "assets/items/armor_equipment/quần vàng.png"
      },
      "gold_boots": {
        id: "gold_boots", name: "Giày Vàng", category: "armor", slotType: "boots",
        rarity: "rare", maxStack: 1, value: 48, armor: 12,
        speedBonus: 0, knockbackResist: 0, maxHpBonus: 0,
        durability: 150, maxDurability: 150, description: "Ủng vàng bóng bẩy, bảo vệ tốt bàn chân người mặc.",
        icon: "assets/items/armor_equipment/giày vàng.png"
      },

      "diamond_helmet": {
        id: "diamond_helmet", name: "Nón Kim Cương", category: "armor", slotType: "helmet",
        rarity: "epic", maxStack: 1, value: 90, armor: 18,
        speedBonus: 0, knockbackResist: 0, maxHpBonus: 10,
        perks: ["✦ Hồi giáp nhanh ngoài giao tranh (+6/s sau 2.5s)"],
        durability: 350, maxDurability: 350, description: "Mũ tinh thể kim cương tự động tái tạo lá chắn giáp.",
        icon: "assets/items/armor_equipment/nón kim cương.png"
      },
      "diamond_chest": {
        id: "diamond_chest", name: "Giáp Kim Cương", category: "armor", slotType: "chest",
        rarity: "epic", maxStack: 1, value: 160, armor: 35,
        speedBonus: 0, knockbackResist: 0.25, maxHpBonus: 20,
        perks: ["✦ Giảm thẳng 5 sát thương nhận vào"],
        durability: 500, maxDurability: 500, description: "Giáp ngực kim cương bất hoại, triệt tiêu sát thương trực diện.",
        icon: "assets/items/armor_equipment/giáp kim cương.png"
      },
      "diamond_legs": {
        id: "diamond_legs", name: "Quần Kim Cương", category: "armor", slotType: "legs",
        rarity: "epic", maxStack: 1, value: 120, armor: 25,
        speedBonus: 0, knockbackResist: 0.15, maxHpBonus: 10,
        durability: 420, maxDurability: 420, description: "Quần giáp kim cương siêu bền, gia tăng sinh lực tối đa.",
        icon: "assets/items/armor_equipment/quần kim cương.png"
      },
      "diamond_boots": {
        id: "diamond_boots", name: "Giày Kim Cương", category: "armor", slotType: "boots",
        rarity: "epic", maxStack: 1, value: 100, armor: 18,
        speedBonus: 0.05, knockbackResist: 0, maxHpBonus: 10,
        durability: 380, maxDurability: 380, description: "Ủng kim cương nhẹ tựa gió, vừa tăng máu vừa tăng tốc chạy.",
        icon: "assets/items/armor_equipment/giày kim cương.png"
      },

      // -------------------------------------------------------------
      // 1. VŨ KHÍ & CÔNG CỤ (TOOLS & WEAPONS)
      // -------------------------------------------------------------
      "wood_sword": {
        id: "wood_sword",
        name: "Kiếm Gỗ",
        category: "weapon",
        rarity: "common",
        maxStack: 1,
        value: 5,
        damage: 8,
        durability: 45,
        maxDurability: 45,
        description: "Kiếm gỗ cơ bản dễ chế tạo cho người mới sinh tồn.",
        icon: "assets/items/tools_weapons/wood_sword.png"
      },
      "wood_axe": {
        id: "wood_axe",
        name: "Rìu Gỗ",
        category: "tool",
        rarity: "common",
        maxStack: 1,
        value: 5,
        damage: 6,
        durability: 50,
        maxDurability: 50,
        woodcuttingSpeed: 1.5,
        description: "Rìu gỗ sơ khởi dùng để đốn củi và tự vệ.",
        icon: "assets/items/tools_weapons/wood_axe.png"
      },
      "wood_pickaxe": {
        id: "wood_pickaxe",
        name: "Cúp Gỗ",
        category: "tool",
        rarity: "common",
        maxStack: 1,
        value: 5,
        damage: 4,
        durability: 40,
        maxDurability: 40,
        miningSpeed: 1.2,
        description: "Cúp gỗ dùng để khai thác đá cuội và than.",
        icon: "assets/items/tools_weapons/wood_pickaxe.png"
      },
      "wooden_pickaxe": {
        id: "wooden_pickaxe",
        name: "Cúp Gỗ",
        category: "tool",
        rarity: "common",
        maxStack: 1,
        value: 5,
        damage: 4,
        durability: 40,
        maxDurability: 40,
        miningSpeed: 1.2,
        description: "Cúp gỗ dùng để khai thác đá cuội và than.",
        icon: "assets/items/tools_weapons/wooden_pickaxe.png"
      },
      "stone_sword": {
        id: "stone_sword",
        name: "Kiếm Đá",
        category: "weapon",
        rarity: "uncommon",
        maxStack: 1,
        value: 15,
        damage: 14,
        durability: 85,
        maxDurability: 85,
        description: "Kiếm đá sắc cạnh, sát thương ổn định hơn kiếm gỗ.",
        icon: "assets/items/tools_weapons/stone_sword.png"
      },
      "stone_axe": {
        id: "stone_axe",
        name: "Rìu Đá",
        category: "tool",
        rarity: "uncommon",
        maxStack: 1,
        value: 15,
        damage: 11,
        durability: 90,
        maxDurability: 90,
        woodcuttingSpeed: 2.5,
        description: "Rìu đá cứng cáp giúp đốn cây nhanh hơn.",
        icon: "assets/items/tools_weapons/stone_axe.png"
      },
      "stone_pickaxe": {
        id: "stone_pickaxe",
        name: "Cúp Đá",
        category: "tool",
        rarity: "uncommon",
        maxStack: 1,
        value: 15,
        damage: 8,
        durability: 90,
        maxDurability: 90,
        miningSpeed: 2.0,
        description: "Cúp đá bền bỉ, khai thác được các mạch quặng sắt.",
        icon: "assets/items/tools_weapons/stone_pickaxe.png"
      },
      "iron_sword": {
        id: "iron_sword",
        name: "Kiếm Sắt",
        category: "weapon",
        rarity: "rare",
        maxStack: 1,
        value: 45,
        damage: 22,
        durability: 160,
        maxDurability: 160,
        description: "Kiếm sắt rèn kỹ, vũ khí cận chiến chủ lực tầm trung.",
        icon: "assets/items/tools_weapons/iron_sword.png"
      },
      "iron_axe": {
        id: "iron_axe",
        name: "Rìu Sắt",
        category: "tool",
        rarity: "rare",
        maxStack: 1,
        value: 45,
        damage: 17,
        durability: 160,
        maxDurability: 160,
        woodcuttingSpeed: 4.0,
        description: "Rìu sắt sắc bén đốn hạ thân cây chỉ trong chớp mắt.",
        icon: "assets/items/tools_weapons/iron_axe.png"
      },
      "iron_pickaxe": {
        id: "iron_pickaxe",
        name: "Cúp Sắt",
        category: "tool",
        rarity: "rare",
        maxStack: 1,
        value: 45,
        damage: 13,
        durability: 160,
        maxDurability: 160,
        miningSpeed: 3.5,
        description: "Cúp sắt chuyên dụng để đào quặng vàng và đá cứng.",
        icon: "assets/items/tools_weapons/iron_pickaxe.png"
      },
      "gold_sword": {
        id: "gold_sword",
        name: "Kiếm Vàng",
        category: "weapon",
        rarity: "epic",
        maxStack: 1,
        value: 80,
        damage: 28,
        durability: 95,
        maxDurability: 95,
        description: "Kiếm vàng sắc lẹm với lực chém mạnh mẽ.",
        icon: "assets/items/tools_weapons/gold_sword.png"
      },
      "gold_axe": {
        id: "gold_axe",
        name: "Rìu Vàng",
        category: "tool",
        rarity: "epic",
        maxStack: 1,
        value: 80,
        damage: 22,
        durability: 95,
        maxDurability: 95,
        woodcuttingSpeed: 5.0,
        description: "Rìu vàng tốc độ chặt cực nhanh nhưng độ bền vừa phải.",
        icon: "assets/items/tools_weapons/gold_axe.png"
      },
      "gold_pickaxe": {
        id: "gold_pickaxe",
        name: "Cúp Vàng",
        category: "tool",
        rarity: "epic",
        maxStack: 1,
        value: 80,
        damage: 17,
        durability: 95,
        maxDurability: 95,
        miningSpeed: 4.5,
        description: "Cúp vàng đào khoáng sản siêu tốc.",
        icon: "assets/items/tools_weapons/gold_pickaxe.png"
      },
      "diamond_sword": {
        id: "diamond_sword",
        name: "Kiếm Kim Cương",
        category: "weapon",
        rarity: "legendary",
        maxStack: 1,
        value: 200,
        damage: 40,
        durability: 350,
        maxDurability: 350,
        description: "Thanh kiếm kim cương tối thượng với sát thương hủy diệt.",
        icon: "assets/items/tools_weapons/diamond_sword.png"
      },
      "diamond_axe": {
        id: "diamond_axe",
        name: "Rìu Kim Cương",
        category: "tool",
        rarity: "legendary",
        maxStack: 1,
        value: 200,
        damage: 32,
        durability: 350,
        maxDurability: 350,
        woodcuttingSpeed: 6.5,
        description: "Rìu kim cương sắc bén bậc nhất, độ bền vượt trội.",
        icon: "assets/items/tools_weapons/diamond_axe.png"
      },
      "diamond_pickaxe": {
        id: "diamond_pickaxe",
        name: "Cúp Kim Cương",
        category: "tool",
        rarity: "legendary",
        maxStack: 1,
        value: 200,
        damage: 25,
        durability: 350,
        maxDurability: 350,
        miningSpeed: 6.0,
        description: "Cúp kim cương phá vỡ mọi loại đá và quặng nhanh nhất.",
        icon: "assets/items/tools_weapons/diamond_pickaxe.png"
      },
      "hunting_bow": {
        id: "hunting_bow",
        name: "Cung Săn Bắn",
        category: "weapon",
        rarity: "uncommon",
        maxStack: 1,
        value: 30,
        rangedDamage: "12–24 DMG",
        perks: [
          "✦ Tầm bắn 320px · Giữ phím ≥0.5s bắn 10 DMG (nhanh 5 DMG)",
          "✦ Cần có Mũi Tên trong túi · Giữ >1.5s sẽ gãy tên"
        ],
        durability: 90,
        maxDurability: 90,
        description: "Cung săn tầm xa, giữ phím để tụ lực bắn tên xuyên phá.",
        icon: "assets/items/tools_weapons/hunting_bow.png"
      },
      "arrow": {
        id: "arrow",
        name: "Mũi Tên",
        category: "ammo",
        rarity: "common",
        maxStack: 64,
        value: 2,
        description: "Mũi tên đầu sắt dùng làm đạn cho Cung Săn Bắn.",
        icon: "assets/items/tools_weapons/arrow.png"
      },

      // -------------------------------------------------------------
      // 2. NGUYÊN LIỆU & KHOÁNG SẢN (RESOURCES)
      // -------------------------------------------------------------
      "wood_log": {
        id: "wood_log",
        name: "Khúc Gỗ",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 1,
        description: "Gỗ súc đốn từ cây sồi trong rừng",
        icon: "assets/items/resources/wood_log.svg"
      },
      "wooden_stick": {
        id: "wooden_stick",
        name: "Cành Cây",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 1,
        description: "Cành cây khô dẻo dai làm cán công cụ",
        icon: "assets/items/resources/wooden_stick.svg"
      },
      "stone_rock": {
        id: "stone_rock",
        name: "Đá Cuội",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 1,
        description: "Đá tảng đập vụn dùng làm vật liệu",
        icon: "assets/items/resources/stone_rock.svg"
      },
      "plant_fiber": {
        id: "plant_fiber",
        name: "Sợi Dây Gai",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 2,
        description: "Sợi thực vật bện chặt làm dây cung",
        icon: "assets/items/resources/plant_fiber.svg"
      },
      "iron_ore": {
        id: "iron_ore",
        name: "Quặng Sắt",
        category: "resource",
        rarity: "uncommon",
        maxStack: 64,
        value: 8,
        description: "Quặng sắt thô chứa kim loại giá trị",
        icon: "assets/items/resources/iron_ore.svg"
      },
      "copper_ore": {
        id: "copper_ore",
        name: "Quặng Đồng",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 4,
        description: "Quặng đồng thô ánh đỏ",
        icon: "assets/items/resources/copper_ore.svg"
      },
      "coal": {
        id: "coal",
        name: "Than Đá",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 3,
        description: "Nhiên liệu đốt nóng cho lò rèn",
        icon: "assets/items/resources/coal.svg"
      },
      "gold_ore": {
        id: "gold_ore",
        name: "Quặng Vàng",
        category: "resource",
        rarity: "rare",
        maxStack: 64,
        value: 20,
        description: "Quặng vàng tự nhiên lấp lánh",
        icon: "assets/items/resources/gold_ore.svg"
      },
      "gold_nugget": {
        id: "gold_nugget",
        name: "Mảnh Vàng",
        category: "resource",
        rarity: "rare",
        maxStack: 64,
        value: 18,
        description: "Mảnh vàng ròng óng ánh vớt được dưới nước",
        icon: "assets/items/resources/gold_nugget.png"
      },
      "diamond": {
        id: "diamond",
        name: "Kim Cương",
        category: "resource",
        rarity: "legendary",
        maxStack: 64,
        value: 100,
        description: "Tinh thể kim cương xanh ngọc phát quang",
        icon: "assets/items/resources/diamond.png"
      },
      
      // --- CHIẾN LỢI PHẨM MỚI TỪ GÀ & HEO RỪNG ---
      "feather": {
        id: "feather",
        name: "Lông Vũ",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 2,
        description: "Lông vũ chim/gà mềm mượt dùng làm cánh mũi tên",
        icon: "assets/items/resources/feather.svg"
      },
      "chicken_unripe": {
        id: "chicken_unripe",
        name: "Thịt Gà Sống",
        category: "consumable",
        rarity: "common",
        maxStack: 64,
        value: 3,
        description: "Thịt gà tươi sống. Có thể nướng chín tại Lửa Trại.",
        healAmount: 4,
        icon: "assets/items/consumables/chicken_unripe.png"
      },
      "boar_unripe": {
        id: "boar_unripe",
        name: "Thịt Heo Sống",
        category: "consumable",
        rarity: "common",
        maxStack: 64,
        value: 4,
        description: "Thịt heo rừng tươi sống. Nướng tại Lửa Trại để hồi nhiều máu hơn.",
        healAmount: 5,
        icon: "assets/items/consumables/boar_unripe.png"
      },
      "chicken_ripe": {
        id: "chicken_ripe",
        name: "Thịt Gà Chín",
        category: "consumable",
        rarity: "uncommon",
        maxStack: 64,
        value: 8,
        description: "Thịt gà nướng chín vàng thơm lừng, phục hồi tốt thể lực.",
        healAmount: 18,
        icon: "assets/items/consumables/chicken_ripe.png"
      },
      "boar_ripe": {
        id: "boar_ripe",
        name: "Thịt Heo Chín",
        category: "consumable",
        rarity: "uncommon",
        maxStack: 64,
        value: 10,
        description: "Thịt heo rừng nướng chín đậm vị, hồi phục lượng lớn máu.",
        healAmount: 25,
        icon: "assets/items/consumables/boar_ripe.png"
      },
      "leather_hide": {
        id: "leather_hide",
        name: "Da Thú",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 4,
        description: "Da lợn rừng dai bền dùng may giáp",
        icon: "assets/items/resources/leather_hide.svg"
      },
      "plant_seeds": {
        id: "plant_seeds",
        name: "Hạt Giống Cây",
        category: "resource",
        rarity: "common",
        maxStack: 64,
        value: 1,
        description: "Hạt giống cây trồng thu thập được",
        icon: "assets/items/resources/plant_seeds.svg"
      },

      // -------------------------------------------------------------
      // 3. VẬT PHẨM TIÊU HAO (CONSUMABLES)
      // -------------------------------------------------------------
      "apple": {
        id: "apple",
        name: "Táo Rừng",
        category: "consumable",
        rarity: "common",
        maxStack: 64,
        value: 3,
        description: "Quả táo rừng tươi mọng giúp giải cơn đói nhanh chóng.",
        healAmount: 15,
        icon: "assets/items/consumables/apple.svg"
      },
      "meat": {
        id: "meat",
        name: "Thịt Nướng",
        category: "consumable",
        rarity: "uncommon",
        maxStack: 64,
        value: 6,
        description: "Đùi thịt nướng thơm phức, bổ sung nhiều sinh lực.",
        healAmount: 35,
        icon: "assets/items/consumables/boar_ripe.png"
      },
      "raw_meat": {
        id: "raw_meat",
        name: "Thịt Tươi Sống",
        category: "consumable",
        rarity: "common",
        maxStack: 64,
        value: 3,
        description: "Thịt sống thu được từ thú rừng, nên nướng chín trước khi ăn.",
        healAmount: 10,
        icon: "assets/items/consumables/boar_unripe.png"
      },
      "raw_fish": {
        id: "raw_fish",
        name: "Cá Tươi",
        category: "consumable",
        rarity: "common",
        maxStack: 64,
        value: 6,
        description: "Cá tươi vừa câu dưới hồ. Đem nướng ở Lửa Trại sẽ ngon hơn.",
        healAmount: 12,
        icon: "assets/items/consumables/raw_fish.svg"
      },
      "cooked_fish": {
        id: "cooked_fish",
        name: "Cá Nướng",
        category: "consumable",
        rarity: "uncommon",
        maxStack: 64,
        value: 14,
        description: "Cá nướng chín giòn thơm phức, hồi phục dồi dào sinh lực.",
        healAmount: 28,
        icon: "assets/items/consumables/cooked_fish.svg"
      },
      "golden_fish": {
        id: "golden_fish",
        name: "Cá Vàng Quý",
        category: "consumable",
        rarity: "rare",
        maxStack: 64,
        value: 45,
        description: "Loài cá vàng quý hiếm dưới đáy hồ, đại bổ sinh lực.",
        healAmount: 45,
        icon: "assets/items/consumables/golden_fish.svg"
      },

      // -------------------------------------------------------------
      // 4. CÔNG TRÌNH & ĐẶT ĐƯỢC (PLACEABLES)
      // -------------------------------------------------------------
      "crafting_table": {
        id: "crafting_table",
        name: "Bàn Chế Tạo",
        category: "placeable",
        rarity: "uncommon",
        maxStack: 16,
        value: 12,
        perks: ["✦ Mở chế tạo 3×3 & Lò Rèn nâng cấp"],
        description: "Đặt xuống đất để mở bàn chế tạo 3×3 và Lò Rèn trang bị.",
        icon: "assets/items/placeables/crafting_table.svg"
      },
      "chest": {
        id: "chest",
        name: "Rương Đồ",
        category: "placeable",
        rarity: "uncommon",
        maxStack: 16,
        value: 16,
        perks: [
          "✦ Kho chứa 27 ô đồ rộng rãi trên bản đồ",
          "✦ Đứng gần bấm [E] hoặc [Chuột Phải] để mở rương"
        ],
        description: "Rương gỗ khóa đồng chắc chắn giúp cất giữ đồ đạc gọn gàng",
        icon: "assets/items/placeables/chest.svg"
      }
    };

    function getItemData(idOrName) {
      if (!idOrName) return null;
      if (typeof idOrName === 'object') {
        return ITEMS_DATABASE[idOrName.id] || ITEMS_DATABASE[idOrName.name] || idOrName;
      }
      return ITEMS_DATABASE[idOrName] || null;
    }

    function getItemIcon(item) {
      if (!item) return "";
      const data = getItemData(item);
      if (data && data.icon) return data.icon;
      return item.iconUrl || item.icon || "";
    }

    // Khởi tạo 10 vật phẩm nguyên liệu chuẩn vào túi đồ để người chơi test hiển thị & kéo thả
        // Khởi tạo các vật phẩm kiểm thử túi đồ: Gỗ, Đá, Gậy, Dây gai, và Bàn chế tạo
        // Khởi tạo các vật phẩm kiểm thử túi đồ: Đầy đủ vật liệu và vũ khí
        // Khởi tạo các vật phẩm kiểm thử: Gỗ, Đá, Thỏi/Quặng Sắt, Vàng, Kim Cương, Cung, Tên, Bàn Chế Tạo
    // Sắp xếp Hotbar (0 đến 8) tiện lợi nhất cho người chơi test Cung & Chế tạo
    playerInventory[0] = {
      id: 'magic_wand',
      name: 'Đũa Phép',
      quantity: 1,
      durability: 200,
      maxDurability: 200,
      wandData: {
        slots: ['spell_gravity', 'spell_wood', 'spell_timestop'],
        gemSlots: [null, null, null]
      }
    };
    playerInventory[1] = { id: 'stone_rock', name: 'Đá Cuội', quantity: 32 };
    playerInventory[2] = { id: 'iron_ore', name: 'Quặng Sắt', quantity: 32 };
    playerInventory[3] = rollWeaponInstance({ id: 'hunting_bow', name: 'Cung Săn Bắn', quantity: 1, durability: 120, maxDurability: 120 }); // Phím 4: Cung Săn
    playerInventory[4] = { id: 'arrow', name: 'Mũi Tên', quantity: 64 };                                             // Phím 5: Mũi Tên
    playerInventory[5] = { id: 'fishing_rod', name: 'Cần Câu', quantity: 1, durability: 100, maxDurability: 100 };  // Phím 6: Cần Câu
    playerInventory[6] = { id: 'iron_sword', name: 'Kiếm Sắt', quantity: 1, durability: 180, maxDurability: 180 };
    playerInventory[7] = { id: 'iron_axe', name: 'Rìu Sắt', quantity: 1, durability: 200, maxDurability: 200 };
    playerInventory[8] = { id: 'crafting_table', name: 'Bàn Chế Tạo', quantity: 2 };                                // Phím 9: Bàn Chế Tạo
    // Các ô trong túi đồ (9 đến 35):
    playerInventory[9] = { id: 'iron_pickaxe', name: 'Cúp Sắt', quantity: 1, durability: 200, maxDurability: 200 };
    playerInventory[10] = { id: 'gold_ore', name: 'Quặng Vàng', quantity: 10 };
    playerInventory[11] = { id: 'diamond', name: 'Kim Cương', quantity: 8 };
    playerInventory[12] = { id: 'wooden_stick', name: 'Cành Cây', quantity: 32 };
    // Trang bị sẵn các món giáp & rương đồ trong kho đồ
    playerInventory[13] = { id: 'gem_haste', name: 'Ngọc Tốc Độ', quantity: 2 };
    playerInventory[14] = { id: 'gem_crit', name: 'Ngọc Chí Mạng', quantity: 2 };
    playerInventory[15] = { id: 'chest', name: 'Rương Đồ', quantity: 1 };
    playerInventory[16] = { id: 'iron_chest', name: 'Giáp Sắt', quantity: 1, durability: 240, maxDurability: 240 };
    playerInventory[17] = { id: 'iron_legs', name: 'Quần Sắt', quantity: 1, durability: 200, maxDurability: 200 };
    playerInventory[18] = { id: 'spell_timestop', name: SPELLS_DATABASE.spell_timestop.name, quantity: 1 };
    playerInventory[19] = { id: 'spell_wood', name: SPELLS_DATABASE.spell_wood.name, quantity: 1 };
    playerInventory[20] = { id: 'diamond_helmet', name: 'Nón Kim Cương', quantity: 1, durability: 350, maxDurability: 350 };
    playerInventory[21] = { id: 'diamond_chest', name: 'Giáp Kim Cương', quantity: 1, durability: 500, maxDurability: 500 };
    playerInventory[22] = { id: 'diamond_legs', name: 'Quần Kim Cương', quantity: 1, durability: 420, maxDurability: 420 };
    playerInventory[23] = { id: 'diamond_boots', name: 'Giày Kim Cương', quantity: 1, durability: 380, maxDurability: 380 };
    playerInventory[24] = { id: 'feather', name: 'Lông Vũ', quantity: 32 };
    playerInventory[25] = { id: 'coal', name: 'Than Đá', quantity: 16 };
    playerInventory[26] = { id: 'boar_unripe', name: 'Thịt Heo Sống', quantity: 4 };
    playerInventory[27] = { id: 'chicken_unripe', name: 'Thịt Gà Sống', quantity: 4 };
    playerInventory[28] = { id: 'apple', name: 'Táo Rừng', quantity: 4 };
    playerInventory[29] = { id: 'wood_log', name: 'Khúc Gỗ', quantity: 32 };
    playerInventory[30] = { id: 'plant_fiber', name: 'Sợi Dây Gai', quantity: 16 };
    playerInventory[31] = { id: 'spell_gravity', name: SPELLS_DATABASE.spell_gravity.name, quantity: 1 };
    playerInventory[32] = { id: 'gem_damage', name: 'Ngọc Sức Mạnh', quantity: 3 };
    playerInventory[33] = { id: 'gem_fire', name: 'Ngọc Viêm Hỏa', quantity: 3 };
    playerInventory[34] = { id: 'gem_frost', name: 'Ngọc Băng Sương', quantity: 3 };
    playerInventory[35] = { id: 'gem_vampire', name: 'Ngọc Hút Máu', quantity: 2 };

    // Tự động đồng bộ số lượng tài nguyên thực tế với các slot đầu nếu chưa có
    function syncRealResourcesToPlayerInventory() {
      // Tôn trọng 100% vị trí ô mà người chơi tự sắp xếp trong túi đồ (0 đến 35)
      // Không bao giờ gán cứng cố định vào ô 0, ô 1 hay ô 8 nữa
    }

    const hotbarUI = document.getElementById("hotbar-ui");
    const inventoryUI = document.getElementById("inventory-ui");
    const invTitleText = document.getElementById("invTitleText");
    const invModeBadge = document.getElementById("invModeBadge");
    const pocketCraftingSection = document.getElementById("pocketCraftingSection");
    const workstationContainer = document.getElementById("workstationContainer");
    const pocketCraftingGrid = document.getElementById("pocketCraftingGrid");
    const pocketCraftResultSlot = document.getElementById("pocketCraftResultSlot");
    const workstationCraftingGrid = document.getElementById("workstationCraftingGrid");
    const workstationCraftResultSlot = document.getElementById("workstationCraftResultSlot");
    const storageGrid = document.getElementById("storageGrid");
    const hotbarInvGrid = document.getElementById("hotbarInvGrid");
    const btnInventoryBtn = document.getElementById("btnInventoryBtn");
    const cursorItemEl = document.getElementById("cursor-item");

    // Quản lý tương tác cảm ứng (Touch-native Inventory Gestures)
    const TOUCH_LONG_PRESS_MS = 260;
    const TOUCH_TOOLTIP_HOLD_MS = 320;
    const TOUCH_DRAG_THRESHOLD_PX = 10;
    const TOUCH_DOUBLE_TAP_MS = 320;
    const TOUCH_REPEAT_DROP1_MS = 210;
    let lastTouchInteractionTime = 0;
    let touchInvState = null;

    function isRecentTouchInteraction() {
      return (performance.now() - lastTouchInteractionTime) < 650;
    }

    // Cập nhật thời điểm chạm & tự động ẩn tooltip cũ khi người dùng chạm vào điểm mới
    window.addEventListener("touchstart", () => {
      lastTouchInteractionTime = performance.now();
      if (tooltipEl && tooltipEl.style.display !== "none") {
        hideItemTooltip();
      }
    }, { capture: true, passive: true });

    // Chỉ hiện tooltip khi đưa CON CHUỘT thật tới trên máy tính (chặn 100% sự kiện giả lập từ cảm ứng)
    function bindMouseHoverTooltip(el, getItemFn, onMouseEnterExtra) {
      if (!el) return;
      el.addEventListener("pointerenter", (e) => {
        if (e.pointerType !== "mouse" || isRecentTouchInteraction()) return;
        if (onMouseEnterExtra) onMouseEnterExtra(e);
        if (cursorItem && cursorItem.quantity > 0) {
          hideItemTooltip();
          return;
        }
        const it = getItemFn();
        if (it) showItemTooltip(it, e.clientX, e.clientY, false);
      });
      el.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse" || isRecentTouchInteraction()) return;
        if (cursorItem && cursorItem.quantity > 0) {
          if (tooltipEl && tooltipEl.style.display !== "none") hideItemTooltip();
          return;
        }
        const it = getItemFn();
        if (it) showItemTooltip(it, e.clientX, e.clientY, false);
      });
      el.addEventListener("pointerleave", (e) => {
        if (e.pointerType === "mouse") hideItemTooltip();
      });
    }

    // Hiện tooltip khi NHẤN GIỮ trên điện thoại (không hiện khi chạm nhanh)
    function bindLongPressTouchTooltip(el, getItemFn, options = {}) {
      if (!el || el.dataset.lpTooltipBound === "true") return;
      el.dataset.lpTooltipBound = "true";
      const preventDefaultOnTouchStart = Boolean(options.preventDefaultOnTouchStart);
      let holdTimer = null;
      let startX = 0;
      let startY = 0;
      let lastX = 0;
      let lastY = 0;
      let activeId = null;
      let triggered = false;
      let suppressClickUntil = 0;

      const clearHold = () => {
        if (holdTimer) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }
        activeId = null;
      };

      el.addEventListener("contextmenu", (e) => e.preventDefault());

      el.addEventListener("touchstart", (e) => {
        lastTouchInteractionTime = performance.now();
        if (!e.touches || e.touches.length !== 1) {
          clearHold();
          return;
        }
        const t = e.changedTouches[0];
        activeId = t.identifier;
        startX = t.clientX;
        startY = t.clientY;
        lastX = t.clientX;
        lastY = t.clientY;
        triggered = false;

        if (preventDefaultOnTouchStart) {
          e.preventDefault();
          e.stopPropagation();
        }

        clearHold();
        activeId = t.identifier;
        holdTimer = setTimeout(() => {
          holdTimer = null;
          const item = getItemFn();
          if (!item) return;
          triggered = true;
          suppressClickUntil = performance.now() + 500;
          showItemTooltip(item, lastX, lastY, true);
          triggerHaptic(10);
        }, TOUCH_TOOLTIP_HOLD_MS);
      }, { passive: !preventDefaultOnTouchStart });

      el.addEventListener("touchmove", (e) => {
        if (activeId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === activeId) {
            lastX = t.clientX;
            lastY = t.clientY;
            if (Math.hypot(lastX - startX, lastY - startY) > TOUCH_DRAG_THRESHOLD_PX) {
              clearHold();
              if (triggered) hideItemTooltip();
            }
            break;
          }
        }
      }, { passive: true });

      el.addEventListener("touchend", (e) => {
        lastTouchInteractionTime = performance.now();
        clearHold();
        if (triggered) {
          suppressClickUntil = performance.now() + 500;
          e.preventDefault();
          e.stopPropagation();
        }
      }, { passive: false });

      el.addEventListener("touchcancel", () => {
        clearHold();
        triggered = false;
      }, { passive: true });

      el.addEventListener("click", (e) => {
        if (performance.now() < suppressClickUntil) {
          e.preventDefault();
          e.stopImmediatePropagation();
          suppressClickUntil = 0;
        }
      }, true);
    }

    function positionCursorEl(clientX, clientY, isTouch = false) {
      if (!cursorItemEl || clientX === undefined || clientY === undefined) return;
      const w = 40;
      const h = 40;
      let left = clientX - w / 2;
      let top = clientY - h / 2;
      if (isTouch) {
        left = clientX - w / 2 - 12;
        top = clientY - h - 22;
      }
      left = Math.max(4, Math.min(window.innerWidth - w - 4, left));
      top = Math.max(4, Math.min(window.innerHeight - h - 4, top));
      cursorItemEl.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)${isTouch ? " scale(1.1)" : ""}`;
    }

    function pulseSlotClass(slotEl, className, durationMs = 300) {
      if (!slotEl) return;
      slotEl.classList.remove(className);
      void slotEl.offsetWidth;
      slotEl.classList.add(className);
      setTimeout(() => {
        slotEl.classList.remove(className);
      }, durationMs);
    }

    function triggerHaptic(ms = 10) {
      if (navigator && typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate(ms);
        } catch (_) {}
      }
    }

    function getInvSlotElementFromPoint(clientX, clientY) {
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return null;
      const slotEl = el.closest("#inventory-ui .slot, #campfire-ui .slot, #chest-ui .slot, #wand-socket-modal .slot");
      if (!slotEl || !slotEl.dataset || !slotEl.dataset.type || slotEl.dataset.index === undefined) return null;
      return slotEl;
    }

    function isPointInsideOpenPanels(clientX, clientY, targetEl = null) {
      if (targetEl && targetEl.closest) {
        if (targetEl.closest("#inventory-ui") || targetEl.closest("#campfire-ui") || targetEl.closest("#chest-ui") || targetEl.closest("#wand-socket-modal")) return true;
      }
      if (inventoryUI && inventoryUI.style.display !== "none") {
        const r = inventoryUI.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true;
      }
      const cfUI = document.getElementById("campfire-ui");
      if (cfUI && cfUI.style.display !== "none" && cfUI.style.display !== "") {
        const r = cfUI.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true;
      }
      const chUI = document.getElementById("chest-ui");
      if (chUI && chUI.style.display !== "none" && chUI.style.display !== "") {
        const r = chUI.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true;
      }
      if (isWandModalOpen()) {
        const wUI = document.getElementById("wand-socket-modal");
        if (wUI) {
          const r = wUI.getBoundingClientRect();
          if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true;
        }
      }
      return false;
    }

    function clearTouchHoverSlot() {
      if (touchInvState && touchInvState.hoverSlotEl) {
        touchInvState.hoverSlotEl.classList.remove("slot-touch-hover");
        touchInvState.hoverSlotEl = null;
      }
      document.querySelectorAll("#inventory-ui .slot.slot-touch-hover, #campfire-ui .slot.slot-touch-hover, #chest-ui .slot.slot-touch-hover, #wand-socket-modal .slot.slot-touch-hover").forEach((s) => s.classList.remove("slot-touch-hover"));
    }

    function cancelActiveTouchInvState(restoreOnCancel = false) {
      if (!touchInvState) return;
      if (touchInvState.longPressTimer) clearTimeout(touchInvState.longPressTimer);
      if (touchInvState.repeatDropTimer) clearInterval(touchInvState.repeatDropTimer);
      if (
        restoreOnCancel &&
        touchInvState.mode === "direct_drag" &&
        cursorItem &&
        !getSlotItem(touchInvState.startType, touchInvState.startIndex)
      ) {
        setSlotItem(touchInvState.startType, touchInvState.startIndex, { ...cursorItem });
        cursorItem = null;
        updateCursorUI();
        renderInventory();
      }
      clearTouchHoverSlot();
      touchInvState = null;
      draggedSlotKeys.clear();
    }

    // Lắng nghe chuột di chuyển toàn trang để cập nhật tọa độ #cursor-item đi theo con trỏ
    window.addEventListener("mousemove", (e) => {
      if (isRecentTouchInteraction()) return;
      if (cursorItemEl && cursorItem) {
        positionCursorEl(e.clientX, e.clientY, false);
      }

      // Nếu đang giữ chuột trái và di chuyển chuột quá 4px từ điểm mousedown -> Kích hoạt chế độ kéo lướt
      if (isMouseDraggingLeft && dragStartSlotInfo && !hasMovedMouseDuringDrag) {
        const dist = Math.hypot(e.clientX - dragStartSlotInfo.startX, e.clientY - dragStartSlotInfo.startY);
        if (dist > 4) {
          hasMovedMouseDuringDrag = true;
          // Áp dụng thả 1 vật phẩm vào chính ô khởi đầu nếu đủ điều kiện
          distributeOneItemToSlot(dragStartSlotInfo.type, dragStartSlotInfo.slotIndex);
        }
      }
    });

    // Khi người dùng nhả chuột ở bất kỳ đâu trên màn hình, kết thúc trạng thái kéo trượt
    window.addEventListener("mouseup", (e) => {
      if (isRecentTouchInteraction()) return;
      if (e.button === 0) {
        // Nếu nhả chuột mà KHÔNG di chuyển kéo lướt (click đơn thuần), thực thi logic click chuột trái bình thường
        // Nếu đang cầm vật phẩm trên con trỏ chuột mà click ra ngoài bảng túi đồ & lửa trại -> ném xuống đất!
        const anyPanelOpen = Boolean((inventoryUI && inventoryUI.style.display !== "none") || isWandModalOpen() || isChestOpen());
        if (cursorItem && cursorItem.quantity > 0 && anyPanelOpen) {
          if (!isPointInsideOpenPanels(e.clientX, e.clientY, e.target)) {
            spawnGroundItem(cursorItem, player.x + 4, player.y + 4);
            playImpactSound(false);
                        cursorItem = null;
            updateCursorUI();
            if (isWandModalOpen()) renderWandCustomizerModal();
            if (isChestOpen()) renderChestUI();
          }
        }

        if (isMouseDraggingLeft && dragStartSlotInfo && !hasMovedMouseDuringDrag) {
          executeNormalLeftClick(dragStartSlotInfo.type, dragStartSlotInfo.slotIndex);
        }
        isMouseDraggingLeft = false;
        dragStartSlotInfo = null;
        hasMovedMouseDuringDrag = false;
        draggedSlotKeys.clear();
      }
    });

    // Xử lý kéo thả / rải đồ / chạm ngoài bảng túi đồ bằng cảm ứng
    window.addEventListener("touchmove", (e) => {
      if (!touchInvState) return;
      let activeTouch = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchInvState.identifier) {
          activeTouch = e.changedTouches[i];
          break;
        }
      }
      if (!activeTouch) return;

      lastTouchInteractionTime = performance.now();
      e.preventDefault();
      hideItemTooltip();

      const tx = activeTouch.clientX;
      const ty = activeTouch.clientY;
      touchInvState.lastX = tx;
      touchInvState.lastY = ty;

      const dist = Math.hypot(tx - touchInvState.startX, ty - touchInvState.startY);
      const hitEl = getInvSlotElementFromPoint(tx, ty);

      if (touchInvState.hoverSlotEl && touchInvState.hoverSlotEl !== hitEl) {
        touchInvState.hoverSlotEl.classList.remove("slot-touch-hover");
      }
      touchInvState.hoverSlotEl = hitEl;
      if (hitEl) {
        hitEl.classList.add("slot-touch-hover");
      }

      if (dist > TOUCH_DRAG_THRESHOLD_PX) {
        if (touchInvState.longPressTimer) {
          clearTimeout(touchInvState.longPressTimer);
          touchInvState.longPressTimer = null;
        }
        if (touchInvState.repeatDropTimer) {
          clearInterval(touchInvState.repeatDropTimer);
          touchInvState.repeatDropTimer = null;
        }

        if (touchInvState.mode === "pending" || touchInvState.mode === "inspect_hold") {
          if (!touchInvState.hadCursorAtStart) {
            const srcItem = getSlotItem(touchInvState.startType, touchInvState.startIndex);
            if (srcItem) {
              cursorItem = { ...srcItem };
              setSlotItem(touchInvState.startType, touchInvState.startIndex, null);
              updateCursorUI();
              renderInventory();
              touchInvState.mode = "direct_drag";
            }
          } else {
            touchInvState.mode = "distribute";
            draggedSlotKeys.clear();
            if (distributeOneItemToSlot(touchInvState.startType, touchInvState.startIndex)) {
              pulseSlotClass(touchInvState.startEl, "slot-touch-drop1", 260);
              triggerHaptic(6);
            }
          }
        } else if (touchInvState.mode === "split_hold" || touchInvState.mode === "drop1_hold") {
          touchInvState.mode = "distribute";
        }
      }

      if (touchInvState.mode === "distribute" && hitEl && cursorItem && cursorItem.quantity > 0) {
        const hitType = hitEl.dataset.type;
        const hitIndex = Number(hitEl.dataset.index);
        if (distributeOneItemToSlot(hitType, hitIndex)) {
          pulseSlotClass(hitEl, "slot-touch-drop1", 260);
          triggerHaptic(6);
        }
      }

      if (cursorItem && cursorItem.quantity > 0) {
        positionCursorEl(tx, ty, true);
      }
    }, { passive: false });

    window.addEventListener("touchend", (e) => {
      if (!touchInvState) {
        // Nếu đang cầm vật phẩm và chạm ra ngoài bảng túi đồ / bàn khảm / rương -> ném vật phẩm xuống đất
        const anyPanelOpenTouch = Boolean((inventoryUI && inventoryUI.style.display !== "none") || isWandModalOpen() || isChestOpen());
        if (
          cursorItem &&
          cursorItem.quantity > 0 &&
          anyPanelOpenTouch &&
          e.changedTouches &&
          e.changedTouches.length > 0
        ) {
          const touch = e.changedTouches[0];
          if (!isPointInsideOpenPanels(touch.clientX, touch.clientY, e.target)) {
            lastTouchInteractionTime = performance.now();
            spawnGroundItem(cursorItem, player.x + 4, player.y + 4);
            playImpactSound(false);
                        cursorItem = null;
            updateCursorUI();
            if (isWandModalOpen()) renderWandCustomizerModal();
            if (isChestOpen()) renderChestUI();
            hideItemTooltip();
          }
        }
        return;
      }

      let activeTouch = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchInvState.identifier) {
          activeTouch = e.changedTouches[i];
          break;
        }
      }
      if (!activeTouch) return;

      lastTouchInteractionTime = performance.now();
      e.preventDefault();

      const state = touchInvState;
      if (state.longPressTimer) clearTimeout(state.longPressTimer);
      if (state.repeatDropTimer) clearInterval(state.repeatDropTimer);
      clearTouchHoverSlot();
      touchInvState = null;

      const endX = activeTouch.clientX;
      const endY = activeTouch.clientY;
      const dropEl = getInvSlotElementFromPoint(endX, endY);

      if (state.mode === "pending") {
        const now = performance.now();
        const slotKey = `${state.startType}_${state.startIndex}`;
        if (lastSlotClickedKey === slotKey && (now - lastSlotClickTime) < TOUCH_DOUBLE_TAP_MS) {
          lastSlotClickTime = 0;
          lastSlotClickedKey = "";
          const tappedIt = !cursorItem ? getSlotItem(state.startType, state.startIndex) : null;
          if (tappedIt && tappedIt.id === "magic_wand") {
            openWandCustomizer(true, tappedIt);
            draggedSlotKeys.clear();
            return;
          }
          executeDoubleClickCollect(state.startType, state.startIndex);
          if (cursorItem) positionCursorEl(endX, endY, true);
          draggedSlotKeys.clear();
          return;
        }
        lastSlotClickTime = now;
        lastSlotClickedKey = slotKey;

        if (state.startType === "equip" && cursorItem && !canItemGoInEquipSlot(cursorItem, state.startIndex)) {
          addFloatingText("❌ Không vừa vị trí trang bị này!", player.x - 16, player.y - 16, "#ef4444");
          positionCursorEl(endX, endY, true);
          draggedSlotKeys.clear();
          return;
        }
        if (state.startType === "wand_socket" && cursorItem && !canItemGoInWandSocket(cursorItem)) {
          addFloatingText("❌ Phần 1 chỉ nhận Ngọc Chiêu Thức!", player.x - 24, player.y - 16, "#ef4444");
          positionCursorEl(endX, endY, true);
          draggedSlotKeys.clear();
          return;
        }
        if (state.startType === "gem_socket" && cursorItem && !canItemGoInGemSlot(cursorItem)) {
          addFloatingText("❌ Phần 2 chỉ nhận Ngọc Khảm Chỉ Số!", player.x - 24, player.y - 16, "#ef4444");
          positionCursorEl(endX, endY, true);
          draggedSlotKeys.clear();
          return;
        }

        executeNormalLeftClick(state.startType, state.startIndex);
        if (cursorItem && cursorItem.quantity > 0) {
          positionCursorEl(endX, endY, true);
        }
      } else if (state.mode === "inspect_hold") {
        // Nhấn giữ xem mô tả trên điện thoại: giữ nguyên đồ tại ô và giữ tooltip hiển thị tới lần chạm kế tiếp
      } else if (state.mode === "direct_drag") {
        if (dropEl) {
          const dropType = dropEl.dataset.type;
          const dropIndex = Number(dropEl.dataset.index);
          if (dropType === "equip" && cursorItem && !canItemGoInEquipSlot(cursorItem, dropIndex)) {
            addFloatingText("❌ Không vừa vị trí trang bị này!", player.x - 16, player.y - 16, "#ef4444");
            if (!getSlotItem(state.startType, state.startIndex)) {
              setSlotItem(state.startType, state.startIndex, { ...cursorItem });
              cursorItem = null;
              updateCursorUI();
              renderInventory();
            }
          } else if (dropType === "wand_socket" && cursorItem && !canItemGoInWandSocket(cursorItem)) {
            addFloatingText("❌ Phần 1 chỉ nhận Ngọc Chiêu Thức!", player.x - 24, player.y - 16, "#ef4444");
            if (!getSlotItem(state.startType, state.startIndex)) {
              setSlotItem(state.startType, state.startIndex, { ...cursorItem });
              cursorItem = null;
              updateCursorUI();
              renderInventory();
            }
          } else if (dropType === "gem_socket" && cursorItem && !canItemGoInGemSlot(cursorItem)) {
            addFloatingText("❌ Phần 2 chỉ nhận Ngọc Khảm Chỉ Số!", player.x - 24, player.y - 16, "#ef4444");
            if (!getSlotItem(state.startType, state.startIndex)) {
              setSlotItem(state.startType, state.startIndex, { ...cursorItem });
              cursorItem = null;
              updateCursorUI();
              renderInventory();
            }
          } else {
            executeNormalLeftClick(dropType, dropIndex);
            pulseSlotClass(dropEl, "slot-touch-drop1", 260);
            triggerHaptic(8);
          }
        } else if (((inventoryUI && inventoryUI.style.display !== "none") || isWandModalOpen() || isChestOpen()) && cursorItem && cursorItem.quantity > 0) {
          if (!isPointInsideOpenPanels(endX, endY)) {
            spawnGroundItem(cursorItem, player.x + 4, player.y + 4);
            playImpactSound(false);
                        cursorItem = null;
            updateCursorUI();
            if (isWandModalOpen()) renderWandCustomizerModal();
            if (isChestOpen()) renderChestUI();
          }
        }
        if (cursorItem && cursorItem.quantity > 0) {
          positionCursorEl(endX, endY, true);
        }
      } else {
        if (cursorItem && cursorItem.quantity > 0) {
          positionCursorEl(endX, endY, true);
        }
      }

      draggedSlotKeys.clear();
    }, { passive: false });

    window.addEventListener("touchcancel", () => {
      cancelActiveTouchInvState(true);
    }, { passive: true });

    // -------------------------------------------------------------
    // HÀM TỰ ĐỘNG GỘP (AUTO-STACK) KHI NHẶT ĐỒ TỪ MAP
    // -------------------------------------------------------------
    
    // -------------------------------------------------------------
    // HỆ THỐNG VẬT PHẨM RƠI TRÊN MẶT ĐẤT (DROPPED GROUND ITEMS)
    // -------------------------------------------------------------
    const droppedItems = [];

    // Hàm tạo 1 vật phẩm rơi trên mặt đất (văng nhẹ từ tâm nhân vật hoặc vị trí thu hoạch)
    function spawnGroundItem(itemData, x = player.x + 4, y = player.y + 4) {
      if (!itemData || itemData.quantity <= 0) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 24 + 16;
      droppedItems.push({
          mapId: currentMap,
        item: { ...itemData, ...(itemData.wandData ? { wandData: cloneWandData(itemData.wandData) } : {}) },
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        bobTimer: Math.random() * Math.PI * 2, // Hiệu ứng bồng bềnh pixel art
        pickupCooldown: 0.8, // 0.8s sau khi ném mới cho nhặt lại tránh nhặt ngay lập tức
        lifetime: 300 // Biến mất sau 5 phút nếu không nhặt
      });
      needsCanvasRedraw = true;
    }

    // Ném vật phẩm đang chọn trên Hotbar hoặc phím Q
    function dropSelectedItem() {
      const item = playerInventory[activeHotbarIndex];
      if (!item || item.quantity <= 0) return;

      // Ném toàn bộ stack của ô được chọn
      spawnGroundItem(item, player.x + 4, player.y + 4);
      playerInventory[activeHotbarIndex] = null;
      renderHotbar();
      playImpactSound(false);
          }

    function pickupItem(newItem) {
      if (!newItem || newItem.quantity <= 0) return false;

      const itemId = newItem.id || (newItem.name ? newItem.name.toLowerCase() : "");
      const dbData = getItemData(itemId) || getItemData(newItem.name) || {};
      const itemName = newItem.name || dbData.name || "Vật phẩm";
      const maxStack = getItemMaxStack({ ...newItem, id: itemId, name: itemName });

      let remaining = newItem.quantity;

      // Bước 1: Quét toàn bộ 36 ô tìm ô ĐÃ CÓ món đồ cùng id hoặc cùng name mà còn chỗ xếp chồng
      for (let i = 0; i < 36; i++) {
        if (remaining <= 0) break;
        const slotItem = playerInventory[i];
        if (slotItem && (slotItem.id === itemId || slotItem.name === itemName) && slotItem.quantity < maxStack) {
          const spaceLeft = maxStack - slotItem.quantity;
          const amountToAdd = Math.min(spaceLeft, remaining);
          slotItem.quantity += amountToAdd;
          remaining -= amountToAdd;
        }
      }

      // Bước 2: Nếu vẫn còn dư, tìm ô trống đầu tiên trong 36 ô để đặt vào
      if (remaining > 0) {
        for (let i = 0; i < 36; i++) {
          if (remaining <= 0) break;
          if (playerInventory[i] === null) {
            const amountToAdd = Math.min(maxStack, remaining);
            playerInventory[i] = {
              id: itemId,
              name: itemName,
              quantity: amountToAdd,
              durability: newItem.durability !== undefined ? newItem.durability : dbData.durability,
              maxDurability: newItem.maxDurability || dbData.maxDurability,
              icon: dbData.icon || newItem.icon || newItem.iconUrl || "",
              ...(newItem.wandData ? { wandData: cloneWandData(newItem.wandData) } : (itemId === "magic_wand" ? { wandData: { slots: [null, null, null], gemSlots: [null, null, null] } } : {}))
            };
            remaining -= amountToAdd;
          }
        }
      }

      // Cập nhật lại Hotbar và Kho đồ
      renderHotbar();
      renderStorage();

      // NẾU TÚI ĐỒ ĐÃ ĐẦY 36 Ô KHÔNG CÒN CHỖ CHỨA:
      // Tự động văng phần còn dư xuống mặt đất ngay tại chân người chơi!
      if (remaining > 0) {
        spawnGroundItem({ ...newItem, quantity: remaining }, player.x + 4, player.y + 4);
        addFloatingText("🎒 TÚI ĐỒ ĐẦY! VẬT PHẨM ĐÃ RƠI XUỐNG ĐẤT", player.x - 20, player.y - 18, "#fbbf24");
      }

      return remaining < newItem.quantity;
    }

    // Cập nhật giao diện vật phẩm lơ lửng trên con trỏ chuột
    function updateCursorUI() {
      if (!cursorItemEl) return;
      if (!cursorItem || cursorItem.quantity <= 0) {
        cursorItem = null;
        cursorItemEl.style.display = "none";
        cursorItemEl.classList.remove("touch-cursor");
        document.body.classList.remove("inv-holding-item");
        return;
      }

      document.body.classList.add("inv-holding-item");
      cursorItemEl.style.display = "block";

      let img = cursorItemEl.querySelector("img");
      let countSpan = cursorItemEl.querySelector(".item-count");

      if (!img) {
        img = document.createElement("img");
        cursorItemEl.appendChild(img);
      }

      const iconSrc = getItemIcon(cursorItem);
      if (img.getAttribute("src") !== iconSrc) {
        img.src = iconSrc;
        img.alt = cursorItem.name;
      }
      img.style.display = "block";

      if (!countSpan) {
        countSpan = document.createElement("span");
        countSpan.className = "item-count";
        cursorItemEl.appendChild(countSpan);
      }
      countSpan.textContent = cursorItem.quantity;
    }

    function canItemGoInSpellSlot(item) {
      return Boolean(item && item.id && SPELLS_DATABASE[item.id]);
    }

    function canItemGoInGemSlot(item) {
      const data = getItemData(item) || item;
      return Boolean(data && data.category === "gem");
    }

    function canItemGoInWandSocket(item) {
      return canItemGoInSpellSlot(item);
    }

    function canFitItemInBagOnly(item) {
      if (!item || !item.id) return false;
      const dbData = getItemData(item.id) || getItemData(item.name) || {};
      const itemName = item.name || dbData.name || "";
      const maxStack = getItemMaxStack(item);
      let needed = item.quantity || 1;
      for (let i = 0; i < 36; i++) {
        const slotItem = playerInventory[i];
        if (!slotItem) {
          needed -= maxStack;
        } else if ((slotItem.id === item.id || slotItem.name === itemName) && slotItem.quantity < maxStack) {
          needed -= (maxStack - slotItem.quantity);
        }
        if (needed <= 0) return true;
      }
      return false;
    }

    function tryReturnItemToBagOnly(item) {
      if (!item || (item.quantity || 1) <= 0) return false;
      if (!canFitItemInBagOnly(item)) return false;
      return pickupItem({ ...item, quantity: item.quantity || 1 });
    }

    // Hàm lấy tham chiếu tới đối tượng dữ liệu của ô (Túi đồ 'inv', Trang bị 'equip', Chế tạo, Lò Rèn, Lửa Trại, Rương 'chest', Khảm Đũa 'wand_socket' / 'gem_socket')
    function getSlotItem(type, index) {
      if (type === "inv") return playerInventory[index];
      if (type === "equip") return playerEquipment[index];
      if (type === "craft" || type === "pocket") return pocketCraftingInventory[index];
      if (type === "workstation") return workstationCraftingInventory[index];
      if (type === "forge") return forgeInventory[index];
      if (type === "campfire_in") return HOME_CAMPFIRE.inputItem;
      if (type === "campfire_fuel") return HOME_CAMPFIRE.fuelItem;
      if (type === "campfire_out") return HOME_CAMPFIRE.resultItem;
      if (type === "chest") {
        if (!activeOpenChest || !Array.isArray(activeOpenChest.items) || index < 0 || index >= 27) return null;
        return activeOpenChest.items[index];
      }
      if (type === "wand_socket") {
        const wand = getCustomizerWandTarget();
        if (!wand || index < 0 || index >= 3) return null;
        const wd = ensureWandData(wand);
        const spellId = wd.slots[index];
        const sp = spellId ? SPELLS_DATABASE[spellId] : null;
        if (!sp) return null;
        return { id: sp.id, name: sp.name, quantity: 1, icon: sp.icon };
      }
      if (type === "gem_socket") {
        const wand = getCustomizerWandTarget();
        if (!wand || index < 0 || index >= 3) return null;
        const wd = ensureWandData(wand);
        const gemId = wd.gemSlots[index];
        const gemData = gemId ? ITEMS_DATABASE[gemId] : null;
        if (!gemData) return null;
        return { id: gemData.id, name: gemData.name, quantity: 1, icon: gemData.icon };
      }
      return null;
    }

    function setSlotItem(type, index, item) {
      if (type === "inv") {
        playerInventory[index] = item;
      } else if (type === "equip") {
        const prevItem = playerEquipment[index];
        playerEquipment[index] = item;
        recalculatePlayerArmorAndStats();
        if (prevItem || item) {
          triggerPaperdollEquipFx(item);
        }
      } else if (type === "craft" || type === "pocket") {
        pocketCraftingInventory[index] = item;
      } else if (type === "workstation") {
        workstationCraftingInventory[index] = item;
      } else if (type === "forge") {
        forgeInventory[index] = item;
      } else if (type === "campfire_in") {
        HOME_CAMPFIRE.inputItem = item;
        HOME_CAMPFIRE.cookProgress = 0;
        renderCampfireUI();
      } else if (type === "campfire_fuel") {
        HOME_CAMPFIRE.fuelItem = item;
        renderCampfireUI();
      } else if (type === "campfire_out") {
        HOME_CAMPFIRE.resultItem = item;
        renderCampfireUI();
      } else if (type === "chest") {
        if (!activeOpenChest || index < 0 || index >= 27) return;
        if (!Array.isArray(activeOpenChest.items)) activeOpenChest.items = new Array(27).fill(null);
        activeOpenChest.items[index] = item;
        renderChestUI();
      } else if (type === "wand_socket") {
        const wand = getCustomizerWandTarget();
        if (!wand || index < 0 || index >= 3) return;
        const wd = ensureWandData(wand);
        const prevSpellId = wd.slots[index];
        const nextSpellId = (item && item.id && SPELLS_DATABASE[item.id]) ? item.id : null;
        const hadResBefore = Boolean(getWandResonance(wand));
        wd.slots[index] = nextSpellId;
        wandSkillCooldowns[index] = 0;
        wandSkillMaxCooldowns[index] = 0;
        if (nextSpellId && nextSpellId !== prevSpellId) {
          playMagicCastSound();
          const resNow = getWandResonance(wand);
          if (resNow && !hadResBefore) {
            addFloatingText(resNow.label.toUpperCase() + "!", player.x - 42, player.y - 20, resNow.glow, true);
          }
        }
        renderHotbar();
        if (window.onMobileHudSync) window.onMobileHudSync();
      } else if (type === "gem_socket") {
        const wand = getCustomizerWandTarget();
        if (!wand || index < 0 || index >= 3) return;
        const wd = ensureWandData(wand);
        const prevGemId = wd.gemSlots[index];
        const nextGemId = (item && item.id && ITEMS_DATABASE[item.id] && ITEMS_DATABASE[item.id].category === "gem") ? item.id : null;
        wd.gemSlots[index] = nextGemId;
        if (nextGemId && nextGemId !== prevGemId) {
          playMagicCastSound();
          if (wd.gemSlots[0] && wd.gemSlots[0] === wd.gemSlots[1] && wd.gemSlots[1] === wd.gemSlots[2]) {
            const gemDb = ITEMS_DATABASE[wd.gemSlots[0]];
            if (gemDb) {
              addFloatingText(`💎 CỘNG HƯỞNG 3× ${gemDb.name.toUpperCase()}!`, player.x - 44, player.y - 22, "#fde047", true);
            }
          }
        }
        renderHotbar();
        if (window.onMobileHudSync) window.onMobileHudSync();
      }
    }

    // Biến ghi nhớ thời điểm click và slot vừa click để bắt double click cực nhạy
    let lastSlotClickTime = 0;
    let lastSlotClickedKey = "";

    // Thả đúng 1 vật phẩm từ tay vào 1 ô (cho giữ lâu để thả từng cái trên cảm ứng & kéo lướt)
    function dropOneItemIntoSlot(type, slotIndex) {
      if (type === "equip") return false;
      if (!cursorItem || cursorItem.quantity <= 0) return false;
      if (type === "wand_socket") {
        if (!canItemGoInWandSocket(cursorItem)) {
          addFloatingText("❌ Chỉ khảm được Ngọc Chiêu Thức!", player.x - 24, player.y - 16, "#ef4444");
          return false;
        }
        if (getSlotItem("wand_socket", slotIndex)) return false;
        setSlotItem("wand_socket", slotIndex, { ...cursorItem, quantity: 1 });
        cursorItem.quantity -= 1;
        if (cursorItem.quantity <= 0) cursorItem = null;
        updateCursorUI();
        renderInventory();
        return true;
      }
      if (type === "gem_socket") {
        if (!canItemGoInGemSlot(cursorItem)) {
          addFloatingText("❌ Chỉ khảm được Ngọc Cường Hóa!", player.x - 24, player.y - 16, "#ef4444");
          return false;
        }
        if (getSlotItem("gem_socket", slotIndex)) return false;
        setSlotItem("gem_socket", slotIndex, { ...cursorItem, quantity: 1 });
        cursorItem.quantity -= 1;
        if (cursorItem.quantity <= 0) cursorItem = null;
        updateCursorUI();
        renderInventory();
        return true;
      }
      const currentItem = getSlotItem(type, slotIndex);
      if (!currentItem) {
        setSlotItem(type, slotIndex, { ...cursorItem, quantity: 1 });
        cursorItem.quantity -= 1;
        if (cursorItem.quantity <= 0) cursorItem = null;
        updateCursorUI();
        renderInventory();
        return true;
      } else if (
        currentItem.id === cursorItem.id &&
        currentItem.name === cursorItem.name &&
        currentItem.quantity < Math.min(getItemMaxStack(currentItem), getItemMaxStack(cursorItem))
      ) {
        currentItem.quantity += 1;
        cursorItem.quantity -= 1;
        if (cursorItem.quantity <= 0) cursorItem = null;
        updateCursorUI();
        renderInventory();
        return true;
      }
      return false;
    }

    // Hàm thực hiện phân phối đúng 1 vật phẩm vào 1 ô (Dùng cho cả ô đầu tiên và các ô trượt qua)
    function distributeOneItemToSlot(type, slotIndex) {
      if (type === "equip") return false;
      if (!cursorItem || cursorItem.quantity <= 0) return false;

      const slotKey = `${type}_${slotIndex}`;
      if (draggedSlotKeys.has(slotKey)) return false;
      draggedSlotKeys.add(slotKey);

      return dropOneItemIntoSlot(type, slotIndex);
    }

    // Logic xử lý Click chuột trái thông thường (khi người dùng click nhả chuột tại chỗ, không kéo lướt)
    function executeNormalLeftClick(type, slotIndex) {
      if (type === "equip" && cursorItem && !canItemGoInEquipSlot(cursorItem, slotIndex)) {
        return;
      }
      const currentItem = getSlotItem(type, slotIndex);

      if (type === "wand_socket" || type === "gem_socket") {
        const canGo = type === "wand_socket" ? canItemGoInWandSocket : canItemGoInGemSlot;
        const errText = type === "wand_socket" ? "❌ Chỉ khảm được Ngọc Chiêu Thức!" : "❌ Chỉ khảm được Ngọc Cường Hóa!";
        if (!cursorItem && currentItem) {
          cursorItem = { ...currentItem, quantity: 1 };
          setSlotItem(type, slotIndex, null);
        } else if (cursorItem) {
          if (!canGo(cursorItem)) {
            addFloatingText(errText, player.x - 24, player.y - 16, "#ef4444");
            return;
          }
          if (!currentItem) {
            setSlotItem(type, slotIndex, { ...cursorItem, quantity: 1 });
            cursorItem.quantity -= 1;
            if (cursorItem.quantity <= 0) cursorItem = null;
          } else if (cursorItem.id === currentItem.id) {
            return;
          } else if (cursorItem.quantity <= 1) {
            const temp = { ...currentItem, quantity: 1 };
            setSlotItem(type, slotIndex, { ...cursorItem, quantity: 1 });
            cursorItem = temp;
          } else {
            if (tryReturnItemToBagOnly({ ...currentItem, quantity: 1 })) {
              setSlotItem(type, slotIndex, { ...cursorItem, quantity: 1 });
              cursorItem.quantity -= 1;
              if (cursorItem.quantity <= 0) cursorItem = null;
            } else {
              addFloatingText("🎒 Túi đầy! Hãy nhấc ngọc cũ ra trước.", player.x - 28, player.y - 16, "#f87171");
              return;
            }
          }
        }
        updateCursorUI();
        renderInventory();
        return;
      }

      if (!cursorItem && currentItem) {
        // 1. Con trỏ trống + Slot có đồ -> Nhấc toàn bộ lên tay
        cursorItem = { ...currentItem };
        setSlotItem(type, slotIndex, null);
      } else if (cursorItem && !currentItem) {
        // 2. Con trỏ có đồ + Slot trống -> Đặt toàn bộ xuống
        setSlotItem(type, slotIndex, { ...cursorItem });
        cursorItem = null;
      } else if (cursorItem && currentItem) {
        const stackCap = Math.min(getItemMaxStack(currentItem), getItemMaxStack(cursorItem));
        if (cursorItem.id === currentItem.id && cursorItem.name === currentItem.name && stackCap > 1 && currentItem.quantity < stackCap) {
          // 4. CÙNG LOẠI & XẾP CHỒNG ĐƯỢC -> Gộp số lượng theo maxStack từng vật phẩm
          const spaceLeft = stackCap - currentItem.quantity;
          const amountToAdd = Math.min(spaceLeft, cursorItem.quantity);
          currentItem.quantity += amountToAdd;
          cursorItem.quantity -= amountToAdd;
          if (cursorItem.quantity <= 0) {
            cursorItem = null;
          }
        } else {
          // 3. KHÁC LOẠI HOẶC ĐÃ ĐẦY / KHÔNG XẾP CHỒNG (VD: Chiêu thức maxStack=1) -> Tráo đổi vị trí
          const temp = { ...currentItem };
          setSlotItem(type, slotIndex, { ...cursorItem });
          cursorItem = temp;
        }
      }

      updateCursorUI();
      renderInventory();
    }

    // --- CƠ CHẾ TƯƠNG TÁC CHUỘT CHUẨN MINECRAFT (LEFT, RIGHT, DBLCLICK & DRAG) ---
    function handleSlotMouseDown(type, slotIndex, event) {
      if (isRecentTouchInteraction()) return;
      hideItemTooltip();
      event.preventDefault();
      event.stopPropagation();

      if (cursorItemEl && event.clientX !== undefined && event.clientY !== undefined) {
        positionCursorEl(event.clientX, event.clientY, false);
      }

      const now = performance.now();
      const isLeftClick = (event.button === 0);
      const slotKey = `${type}_${slotIndex}`;

      // Shift + Click trái: chuyển nhanh giữa Túi <-> Rương Đồ hoặc Túi <-> Khảm Chiêu/Ngọc
      if (isLeftClick && event.shiftKey && !cursorItem) {
        if (isChestOpen() && activeOpenChest) {
          const cur = getSlotItem(type, slotIndex);
          if (type === "chest" && cur) {
            if (tryReturnItemToBagOnly({ ...cur })) {
              setSlotItem("chest", slotIndex, null);
              renderInventory();
            } else {
              addFloatingText("🎒 Túi đồ đã đầy!", player.x - 18, player.y - 16, "#ef4444");
            }
            return;
          }
          if (type === "inv" && cur) {
            if (!Array.isArray(activeOpenChest.items)) activeOpenChest.items = new Array(27).fill(null);
            const maxStk = getItemMaxStack(cur);
            let rem = cur.quantity || 1;
            for (let ci = 0; ci < 27 && rem > 0; ci++) {
              const cIt = activeOpenChest.items[ci];
              if (cIt && cIt.id === cur.id && cIt.name === cur.name && cIt.quantity < maxStk) {
                const addAmt = Math.min(maxStk - cIt.quantity, rem);
                cIt.quantity += addAmt;
                rem -= addAmt;
              }
            }
            for (let ci = 0; ci < 27 && rem > 0; ci++) {
              if (!activeOpenChest.items[ci]) {
                const putAmt = Math.min(maxStk, rem);
                activeOpenChest.items[ci] = {
                  ...cur,
                  quantity: putAmt,
                  ...(cur.wandData ? { wandData: cloneWandData(cur.wandData) } : {})
                };
                rem -= putAmt;
              }
            }
            if (rem < (cur.quantity || 1)) {
              if (rem <= 0) playerInventory[slotIndex] = null;
              else cur.quantity = rem;
              renderChestUI();
              renderInventory();
            } else {
              addFloatingText("📦 Rương đã đầy!", player.x - 18, player.y - 16, "#fbbf24");
            }
            return;
          }
        }

        if (isWandModalOpen()) {
          const cur = getSlotItem(type, slotIndex);
          if (type === "wand_socket" || type === "gem_socket") {
            if (cur) {
              if (tryReturnItemToBagOnly({ ...cur, quantity: 1 })) {
                setSlotItem(type, slotIndex, null);
                renderInventory();
              } else {
                addFloatingText("🎒 Túi đồ đã đầy!", player.x - 18, player.y - 16, "#ef4444");
              }
            }
            return;
          }
          if (type === "inv" && cur) {
            if (canItemGoInWandSocket(cur)) {
              const wand = getCustomizerWandTarget();
              if (wand) {
                const wd = ensureWandData(wand);
                const emptyIdx = wd.slots.indexOf(null);
                if (emptyIdx >= 0) {
                  const oneRune = { ...cur, quantity: 1 };
                  cur.quantity -= 1;
                  if (cur.quantity <= 0) playerInventory[slotIndex] = null;
                  setSlotItem("wand_socket", emptyIdx, oneRune);
                  renderInventory();
                } else {
                  addFloatingText("📜 3 ô chiêu thức đã đầy!", player.x - 24, player.y - 16, "#fbbf24");
                }
              }
              return;
            }
            if (canItemGoInGemSlot(cur)) {
              const wand = getCustomizerWandTarget();
              if (wand) {
                const wd = ensureWandData(wand);
                const emptyIdx = wd.gemSlots.indexOf(null);
                if (emptyIdx >= 0) {
                  const oneGem = { ...cur, quantity: 1 };
                  cur.quantity -= 1;
                  if (cur.quantity <= 0) playerInventory[slotIndex] = null;
                  setSlotItem("gem_socket", emptyIdx, oneGem);
                  renderInventory();
                } else {
                  addFloatingText("💎 3 ô ngọc khảm đã đầy!", player.x - 24, player.y - 16, "#fbbf24");
                }
              }
              return;
            }
            if (cur.id === "magic_wand") {
              customizerTargetWand = cur;
              renderWandCustomizerModal();
              return;
            }
          }
        }
      }

      // KIỂM TRA NHÁY ĐÚP CHUỘT TRÁI (DOUBLE CLICK <= 300ms vào cùng 1 ô)
      if (isLeftClick && lastSlotClickedKey === slotKey && (now - lastSlotClickTime) < 300) {
        lastSlotClickTime = 0;
        lastSlotClickedKey = "";
        isMouseDraggingLeft = false;
        dragStartSlotInfo = null;
        executeDoubleClickCollect(type, slotIndex);
        return;
      }

      lastSlotClickTime = now;
      lastSlotClickedKey = slotKey;

      // A. CHUỘT TRÁI (event.button === 0)
      if (isLeftClick) {
        const currentItem = getSlotItem(type, slotIndex);

        // Trường hợp 1: Tay đang TRỐNG + Ô có đồ -> Nhấc đồ lên tay ngay lập tức
        if (!cursorItem && currentItem) {
          cursorItem = { ...currentItem };
          setSlotItem(type, slotIndex, null);
          updateCursorUI();
          renderInventory();
          return;
        }

        // Nếu thao tác trên ô trang bị (type === "equip"): Kiểm tra hợp lệ slotType
        if (type === "equip" && cursorItem) {
          if (!canItemGoInEquipSlot(cursorItem, slotIndex)) {
            addFloatingText("❌ Không vừa vị trí trang bị này!", player.x - 16, player.y - 16, "#ef4444");
            return;
          }
          const oldEquip = playerEquipment[slotIndex];
          setSlotItem("equip", slotIndex, { ...cursorItem });
          cursorItem = oldEquip ? { ...oldEquip } : null;
          updateCursorUI();
          renderInventory();
          return;
        }

        // Phần 1 chỉ nhận Ngọc Chiêu Thức; Phần 2 chỉ nhận Ngọc Khảm Chỉ Số
        if (type === "wand_socket" && cursorItem && !canItemGoInWandSocket(cursorItem)) {
          addFloatingText("❌ Phần 1 chỉ nhận Ngọc Chiêu Thức!", player.x - 24, player.y - 16, "#ef4444");
          return;
        }
        if (type === "gem_socket" && cursorItem && !canItemGoInGemSlot(cursorItem)) {
          addFloatingText("❌ Phần 2 chỉ nhận Ngọc Khảm Chỉ Số!", player.x - 24, player.y - 16, "#ef4444");
          return;
        }

        // Trường hợp 2: Tay ĐANG CẦM ĐỒ -> Bắt đầu theo dõi kéo lướt chia đồ (Drag Distribution)
        if (cursorItem) {
          isMouseDraggingLeft = true;
          hasMovedMouseDuringDrag = false;
          draggedSlotKeys.clear();
          dragStartSlotInfo = {
            type: type,
            slotIndex: slotIndex,
            startX: event.clientX,
            startY: event.clientY
          };
          return;
        }
      }
      // B. CHUỘT PHẢI (event.button === 2)
      else if (event.button === 2) {
        const currentItem = getSlotItem(type, slotIndex);
        if (type === "equip" && cursorItem) {
          if (!canItemGoInEquipSlot(cursorItem, slotIndex)) {
            addFloatingText("❌ Không vừa vị trí trang bị này!", player.x - 16, player.y - 16, "#ef4444");
            return;
          }
          const oldEquip = playerEquipment[slotIndex];
          setSlotItem("equip", slotIndex, { ...cursorItem });
          cursorItem = oldEquip ? { ...oldEquip } : null;
          updateCursorUI();
          renderInventory();
          return;
        }
        if (type === "wand_socket" && cursorItem) {
          if (!canItemGoInWandSocket(cursorItem)) {
            addFloatingText("❌ Phần 1 chỉ nhận Ngọc Chiêu Thức!", player.x - 24, player.y - 16, "#ef4444");
            return;
          }
          if (!currentItem) {
            setSlotItem("wand_socket", slotIndex, { ...cursorItem, quantity: 1 });
            cursorItem.quantity -= 1;
            if (cursorItem.quantity <= 0) cursorItem = null;
            updateCursorUI();
            renderInventory();
          }
          return;
        }
        if (type === "gem_socket" && cursorItem) {
          if (!canItemGoInGemSlot(cursorItem)) {
            addFloatingText("❌ Phần 2 chỉ nhận Ngọc Khảm Chỉ Số!", player.x - 24, player.y - 16, "#ef4444");
            return;
          }
          if (!currentItem) {
            setSlotItem("gem_socket", slotIndex, { ...cursorItem, quantity: 1 });
            cursorItem.quantity -= 1;
            if (cursorItem.quantity <= 0) cursorItem = null;
            updateCursorUI();
            renderInventory();
          }
          return;
        }
        if (!cursorItem && currentItem) {
          if (currentItem.id === "magic_wand") {
            openWandCustomizer(true, currentItem);
            return;
          }
          // 1. Con trỏ trống + Slot có đồ -> Nhấc một nửa (Math.ceil) lên tay
          const takeAmount = Math.ceil(currentItem.quantity / 2);
          const keepAmount = currentItem.quantity - takeAmount;

          cursorItem = { ...currentItem, quantity: takeAmount };
          if (keepAmount > 0) {
            currentItem.quantity = keepAmount;
          } else {
            setSlotItem(type, slotIndex, null);
          }
        } else if (cursorItem) {
          if (!currentItem) {
            // 2. Con trỏ có đồ + Slot trống -> Thả lẻ đúng 1 cái xuống
            setSlotItem(type, slotIndex, { ...cursorItem, quantity: 1 });
            cursorItem.quantity -= 1;
            if (cursorItem.quantity <= 0) {
              cursorItem = null;
            }
          } else if (
            currentItem.id === cursorItem.id &&
            currentItem.name === cursorItem.name &&
            currentItem.quantity < Math.min(getItemMaxStack(currentItem), getItemMaxStack(cursorItem))
          ) {
            // 3. Con trỏ có đồ + Slot CÙNG LOẠI -> Thả lẻ đúng 1 cái vào slot
            currentItem.quantity += 1;
            cursorItem.quantity -= 1;
            if (cursorItem.quantity <= 0) {
              cursorItem = null;
            }
          }
        }
        updateCursorUI();
        renderInventory();
        return;
      }
    }

    // --- CƠ CHẾ KÉO TRƯỢT CHUỘT TRÁI (DRAG TO DISTRIBUTE 1 ITEM PER SLOT) ---
    function handleSlotMouseEnter(type, slotIndex, event) {
      if (isRecentTouchInteraction()) return;
      // Kiểm tra người dùng có đang giữ nút chuột trái không (e.buttons === 1)
      if (event && event.buttons !== 1) {
        isMouseDraggingLeft = false;
        dragStartSlotInfo = null;
        return;
      }
      if (!isMouseDraggingLeft || !cursorItem || cursorItem.quantity <= 0) return;

      // Đánh dấu đã di chuyển kéo lướt qua ô khác
      hasMovedMouseDuringDrag = true;
      distributeOneItemToSlot(type, slotIndex);
    }

    // --- CƠ CHẾ CẢM ỨNG TRỰC TIẾP TRÊN Ô ĐỒ (TAP / DOUBLE-TAP / LONG-PRESS SPLIT & DROP-1 / DRAG & DROP / SWIPE DISTRIBUTE) ---
    function bindSlotTouchEvents(slotEl, type, slotIndex, options = {}) {
      if (!slotEl || slotEl.dataset.touchBound === "true") return;
      slotEl.dataset.touchBound = "true";

      const isBottomHotbar = Boolean(options.isBottomHotbar);

      slotEl.addEventListener("touchstart", (e) => {
        const invClosed = (!inventoryUI || inventoryUI.style.display === "none" || inventoryUI.style.display === "");
        const panelOpen = !invClosed || isWandModalOpen() || isChestOpen();
        if (isBottomHotbar && !panelOpen && !cursorItem) {
          lastTouchInteractionTime = performance.now();
          e.preventDefault();
          e.stopPropagation();
          activeHotbarIndex = slotIndex;
          renderHotbar();
          if (window.onMobileHotbarSelect) window.onMobileHotbarSelect(slotIndex);
          return;
        }
        if (!panelOpen) return;

        if (!e.touches || e.touches.length !== 1) {
          cancelActiveTouchInvState(false);
          return;
        }

        const touch = e.changedTouches[0];
        const hadCursorAtStart = Boolean(cursorItem && cursorItem.quantity > 0);
        const slotItemAtStart = getSlotItem(type, slotIndex);

        // Chạm vào ô trống khi tay cũng trống -> cho phép cuộn dọc bảng túi đồ nếu vuốt, bỏ qua drag item
        if (!hadCursorAtStart && !slotItemAtStart) {
          return;
        }

        lastTouchInteractionTime = performance.now();
        e.preventDefault();
        e.stopPropagation();
        hideItemTooltip();

        if (hadCursorAtStart) {
          positionCursorEl(touch.clientX, touch.clientY, true);
        }

        cancelActiveTouchInvState(false);
        draggedSlotKeys.clear();

        const startX = touch.clientX;
        const startY = touch.clientY;
        const state = {
          identifier: touch.identifier,
          startType: type,
          startIndex: slotIndex,
          startEl: slotEl,
          startX,
          startY,
          lastX: startX,
          lastY: startY,
          hadCursorAtStart,
          mode: "pending",
          longPressTimer: null,
          repeatDropTimer: null,
          hoverSlotEl: slotEl
        };
        slotEl.classList.add("slot-touch-hover");
        touchInvState = state;

        state.longPressTimer = setTimeout(() => {
          if (touchInvState !== state || state.mode !== "pending") return;
          hideItemTooltip();

          if (!state.hadCursorAtStart) {
            const currentItem = getSlotItem(type, slotIndex);
            if (!currentItem) return;

            if (currentItem.quantity <= 1) {
              // Món đơn (vũ khí, giáp, công cụ...): nhấn giữ để xem mô tả chi tiết mà không tự nhấc khỏi ô
              state.mode = "inspect_hold";
              showItemTooltip(currentItem, state.lastX, state.lastY, true);
              triggerHaptic(10);
              return;
            }

            // Stack >= 2: giữ để chia đôi lên tay kèm xem nhanh thông tin món đồ
            const takeAmount = Math.ceil(currentItem.quantity / 2);
            const keepAmount = currentItem.quantity - takeAmount;
            cursorItem = { ...currentItem, quantity: takeAmount };
            if (keepAmount > 0) {
              currentItem.quantity = keepAmount;
            } else {
              setSlotItem(type, slotIndex, null);
            }
            state.mode = "split_hold";
            draggedSlotKeys.clear();
            draggedSlotKeys.add(`${type}_${slotIndex}`);

            updateCursorUI();
            renderInventory();
            positionCursorEl(state.lastX, state.lastY, true);
            showItemTooltip(currentItem, state.lastX, state.lastY, true);
            pulseSlotClass(slotEl, "slot-touch-split", 340);
            triggerHaptic(14);
          } else if (cursorItem && cursorItem.quantity > 0) {
            if (type === "equip") {
              if (!canItemGoInEquipSlot(cursorItem, slotIndex)) {
                addFloatingText("❌ Không vừa vị trí trang bị này!", player.x - 16, player.y - 16, "#ef4444");
                return;
              }
              const oldEquip = playerEquipment[slotIndex];
              setSlotItem("equip", slotIndex, { ...cursorItem });
              cursorItem = oldEquip ? { ...oldEquip } : null;
              state.mode = "drop1_hold";
              updateCursorUI();
              renderInventory();
              positionCursorEl(state.lastX, state.lastY, true);
              pulseSlotClass(slotEl, "slot-touch-drop1", 260);
              triggerHaptic(10);
              return;
            }
            if (type === "wand_socket" && !canItemGoInWandSocket(cursorItem)) {
              addFloatingText("❌ Phần 1 chỉ nhận Ngọc Chiêu Thức!", player.x - 24, player.y - 16, "#ef4444");
              return;
            }
            if (type === "gem_socket" && !canItemGoInGemSlot(cursorItem)) {
              addFloatingText("❌ Phần 2 chỉ nhận Ngọc Khảm Chỉ Số!", player.x - 24, player.y - 16, "#ef4444");
              return;
            }

            if (dropOneItemIntoSlot(type, slotIndex)) {
              state.mode = "drop1_hold";
              draggedSlotKeys.clear();
              draggedSlotKeys.add(`${type}_${slotIndex}`);
              positionCursorEl(state.lastX, state.lastY, true);
              pulseSlotClass(slotEl, "slot-touch-drop1", 260);
              triggerHaptic(10);

              state.repeatDropTimer = setInterval(() => {
                if (touchInvState !== state || state.mode !== "drop1_hold" || !cursorItem || cursorItem.quantity <= 0) {
                  if (state.repeatDropTimer) {
                    clearInterval(state.repeatDropTimer);
                    state.repeatDropTimer = null;
                  }
                  return;
                }
                if (dropOneItemIntoSlot(type, slotIndex)) {
                  positionCursorEl(state.lastX, state.lastY, true);
                  pulseSlotClass(slotEl, "slot-touch-drop1", 220);
                  triggerHaptic(6);
                }
              }, TOUCH_REPEAT_DROP1_MS);
            }
          }
        }, TOUCH_LONG_PRESS_MS);
      }, { passive: false });
    }

    // THỰC THI GỘP HẾT CÁC VẬT PHẨM GIỐNG NHAU (TỐI ĐA 64 - 1 STACK)
    function executeDoubleClickCollect(type, slotIndex) {
      if (type === "wand_socket" || type === "gem_socket") {
        if (!cursorItem) {
          const cur = getSlotItem(type, slotIndex);
          if (cur) {
            if (tryReturnItemToBagOnly({ ...cur, quantity: 1 })) {
              setSlotItem(type, slotIndex, null);
              renderInventory();
            } else {
              addFloatingText("🎒 Túi đồ đã đầy!", player.x - 18, player.y - 16, "#ef4444");
            }
          }
        }
        return;
      }

      // TH1: Chuẩn Minecraft - Nếu đang cầm vật phẩm trên con trỏ chuột, nháy đúp sẽ gom item giống nhau lên tay theo maxStack của vật phẩm
      if (cursorItem) {
        const cursorCap = getItemMaxStack(cursorItem);
        if (cursorCap > 1) {
          // Quét kho đồ & hotbar
          for (let i = 0; i < 36; i++) {
            if (cursorItem.quantity >= cursorCap) break;
            const it = playerInventory[i];
            if (it && it.id === cursorItem.id && it.name === cursorItem.name) {
              const needed = cursorCap - cursorItem.quantity;
              const take = Math.min(needed, it.quantity);
              cursorItem.quantity += take;
              it.quantity -= take;
              if (it.quantity <= 0) playerInventory[i] = null;
            }
          }
          // Quét Rương Đồ nếu đang mở
          if (isChestOpen() && activeOpenChest && Array.isArray(activeOpenChest.items)) {
            for (let ci = 0; ci < 27; ci++) {
              if (cursorItem.quantity >= cursorCap) break;
              const cIt = activeOpenChest.items[ci];
              if (cIt && cIt.id === cursorItem.id && cIt.name === cursorItem.name) {
                const needed = cursorCap - cursorItem.quantity;
                const take = Math.min(needed, cIt.quantity);
                cursorItem.quantity += take;
                cIt.quantity -= take;
                if (cIt.quantity <= 0) activeOpenChest.items[ci] = null;
              }
            }
          }
          // Quét thêm cả lưới chế tạo
          const activeCraftInv = currentUIMode === 'workstation' ? workstationCraftingInventory : pocketCraftingInventory;
          const craftLen = activeCraftInv.length;
          for (let c = 0; c < craftLen; c++) {
            if (cursorItem.quantity >= cursorCap) break;
            const cit = activeCraftInv[c];
            if (cit && cit.id === cursorItem.id && cit.name === cursorItem.name) {
              const needed = cursorCap - cursorItem.quantity;
              const take = Math.min(needed, cit.quantity);
              cursorItem.quantity += take;
              cit.quantity -= take;
              if (cit.quantity <= 0) activeCraftInv[c] = null;
            }
          }
        }
      } 
      // TH2: Nếu tay trống, nháy đúp vào 1 ô đồ -> hút toàn bộ item cùng loại từ các ô khác vào ô này (theo maxStack)
      else {
        const targetItem = getSlotItem(type, slotIndex);
        const targetCap = getItemMaxStack(targetItem);
        if (targetItem && targetCap > 1) {
          for (let i = 0; i < 36; i++) {
            if (type === "inv" && i === slotIndex) continue;
            if (targetItem.quantity >= targetCap) break;
            const otherItem = playerInventory[i];
            if (otherItem && otherItem.id === targetItem.id && otherItem.name === targetItem.name) {
              const needed = targetCap - targetItem.quantity;
              const take = Math.min(needed, otherItem.quantity);
              targetItem.quantity += take;
              otherItem.quantity -= take;
              if (otherItem.quantity <= 0) playerInventory[i] = null;
            }
          }
          if (isChestOpen() && activeOpenChest && Array.isArray(activeOpenChest.items)) {
            for (let ci = 0; ci < 27; ci++) {
              if (type === "chest" && ci === slotIndex) continue;
              if (targetItem.quantity >= targetCap) break;
              const cOther = activeOpenChest.items[ci];
              if (cOther && cOther.id === targetItem.id && cOther.name === targetItem.name) {
                const needed = targetCap - targetItem.quantity;
                const take = Math.min(needed, cOther.quantity);
                targetItem.quantity += take;
                cOther.quantity -= take;
                if (cOther.quantity <= 0) activeOpenChest.items[ci] = null;
              }
            }
          }
          const activeCraftInv2 = currentUIMode === 'workstation' ? workstationCraftingInventory : pocketCraftingInventory;
          const craftLen2 = activeCraftInv2.length;
          for (let c = 0; c < craftLen2; c++) {
            if ((type === "craft" || type === "pocket" || type === "workstation") && c === slotIndex) continue;
            if (targetItem.quantity >= targetCap) break;
            const cItem = activeCraftInv2[c];
            if (cItem && cItem.id === targetItem.id && cItem.name === targetItem.name) {
              const needed = targetCap - targetItem.quantity;
              const take = Math.min(needed, cItem.quantity);
              targetItem.quantity += take;
              cItem.quantity -= take;
              if (cItem.quantity <= 0) activeCraftInv2[c] = null;
            }
          }
        }
      }

      updateCursorUI();
      renderInventory();
    }

    // Tối ưu cập nhật nội dung bên trong slot mà không xóa/tạo lại DOM thẻ div.slot
    function updateSlotDOM(slotEl, item, index, isHotbar = false) {
      if (!slotEl) return;

      if (isHotbar) {
        const isActiveSlot = (index === activeHotbarIndex);
        slotEl.classList.toggle("active", isActiveSlot);
        const pressedVal = isActiveSlot ? "true" : "false";
        if (slotEl.getAttribute("aria-pressed") !== pressedVal) {
          slotEl.setAttribute("aria-pressed", pressedVal);
        }
        const keyStr = String(index + 1);
        if (slotEl.dataset.hotkey !== keyStr) {
          slotEl.dataset.hotkey = keyStr;
        }
        const nextTitle = item && item.quantity > 0
          ? `[Phím ${index + 1}] ${item.name}`
          : `Phím [${index + 1}]`;
        if (slotEl.title !== nextTitle) {
          slotEl.title = nextTitle;
        }
      }

      let img = slotEl.querySelector("img");
      let countSpan = slotEl.querySelector(".item-count");
      let durBar = slotEl.querySelector(".slot-durability-bar");

      const hasItem = Boolean(item && item.quantity > 0);
      const hasItemStr = hasItem ? "true" : "false";
      if (slotEl.dataset.hasItem !== hasItemStr) {
        slotEl.dataset.hasItem = hasItemStr;
      }

      // Nếu ô trống (không có vật phẩm hoặc số lượng <= 0)
      if (!hasItem) {
        if (img && img.style.display !== "none") img.style.display = "none";
        if (countSpan && countSpan.style.display !== "none") countSpan.style.display = "none";
        // Ẩn ngay thanh độ bền ở ô cũ khi vật phẩm được dời đi
        if (durBar && durBar.style.display !== "none") durBar.style.display = "none";
        return;
      }

      // Có vật phẩm: cập nhật hoặc tạo thẻ img
      if (!img) {
        img = document.createElement("img");
        slotEl.appendChild(img);
      }

      const iconSrc = getItemIcon(item);
      if (img.getAttribute("src") !== iconSrc) {
        img.src = iconSrc;
        img.alt = item.name;
      }
      if (img.style.display !== "block") {
        img.style.display = "block";
      }

      // Cập nhật số lượng (chỉ hiện khi quantity > 1)
      if (!countSpan) {
        countSpan = document.createElement("span");
        countSpan.className = "item-count";
        slotEl.appendChild(countSpan);
      }
      if (item.quantity > 1) {
        const qtyStr = String(item.quantity);
        if (countSpan.textContent !== qtyStr) countSpan.textContent = qtyStr;
        if (countSpan.style.display !== "block") countSpan.style.display = "block";
      } else if (countSpan.style.display !== "none") {
        countSpan.style.display = "none";
      }

      // Cập nhật thanh độ bền mini (chỉ hiển thị nếu vật phẩm có độ bền và maxDurability)
      if (item.durability !== undefined && item.maxDurability) {
        if (!durBar) {
          durBar = document.createElement("div");
          durBar.className = "slot-durability-bar";
          durBar.innerHTML = '<div class="slot-durability-fill"></div>';
          slotEl.appendChild(durBar);
        }
        const pct = Math.max(0, Math.min(100, Math.round((item.durability / item.maxDurability) * 100)));
        if (durBar.dataset.lastPct !== String(pct)) {
          durBar.dataset.lastPct = String(pct);
          const fill = durBar.querySelector(".slot-durability-fill");
          if (fill) {
            fill.style.width = pct + "%";
            fill.style.backgroundColor = pct > 50 ? "#22c55e" : (pct > 25 ? "#eab308" : "#ef4444");
          }
        }
        if (durBar.style.display !== "block") durBar.style.display = "block";
      } else if (durBar && durBar.style.display !== "none") {
        durBar.style.display = "none";
      }
    }

    // Hàm tính toán lại tổng điểm Giáp, Máu và Tốc độ chạy từ các món đang mặc
    function recalculatePlayerArmorAndStats() {
      invalidateEquippedPlayerCache();
      let totalArmor = 0;
      let extraHp = 0;
      let speedMult = 1.0;
      let totalKbResist = 0;

      for (let i = 0; i < 4; i++) {
        const item = playerEquipment[i];
        if (item) {
          const itData = getItemData(item) || item;
          if (itData.armor) totalArmor += itData.armor;
          if (itData.maxHpBonus) extraHp += itData.maxHpBonus;
          if (itData.speedBonus) speedMult += itData.speedBonus;
          if (itData.knockbackResist) totalKbResist += itData.knockbackResist;
        }
      }

      // Cộng dồn chỉ số phụ từ Vũ khí / Công cụ đang cầm trên tay (Active Hotbar)
      const heldNow = playerInventory[activeHotbarIndex];
      if (heldNow) {
        if (heldNow.bonusArmor) totalArmor += heldNow.bonusArmor;
        if (heldNow.bonusHp) extraHp += heldNow.bonusHp;
        if (heldNow.bonusSpeed) speedMult += heldNow.bonusSpeed;
      }

      const prevMaxArmor = playerMaxArmor;
      const prevMaxHp = player.maxHp;

      playerMaxArmor = BASE_PLAYER_ARMOR + totalArmor;
      if (playerMaxArmor <= 0) {
        playerArmor = 0;
      } else if (prevMaxArmor <= 0) {
        // Khi mặc món giáp đầu tiên (từ 0 giáp tối đa): khởi tạo giáp đầy 100%
        playerArmor = playerMaxArmor;
      } else if (playerMaxArmor !== prevMaxArmor) {
        // Cập nhật giáp hiện tại theo đúng tỷ lệ phần trăm trước đó (không cộng dồn thô hay hồi lậu)
        const armorRatio = Math.max(0, Math.min(1, playerArmor / prevMaxArmor));
        playerArmor = Math.max(0, Math.min(playerMaxArmor, Math.round(armorRatio * playerMaxArmor)));
      } else {
        playerArmor = Math.min(playerArmor, playerMaxArmor);
      }
      if (playerMaxArmor !== prevMaxArmor || playerArmor > playerDisplayArmor || playerMaxArmor === 0) {
        playerDisplayArmor = playerArmor;
      }

      const baseHp = defaultStats.player.maxHp || 50;
      const newMaxHp = baseHp + extraHp;
      player.maxHp = newMaxHp;
      if (player.hp <= 0) {
        player.hp = 0;
      } else if (newMaxHp !== prevMaxHp) {
        // Giữ nguyên tỷ lệ % máu hiện tại theo Max HP mới thay vì cộng trực tiếp vào Current HP
        const hpRatio = prevMaxHp > 0 ? Math.max(0, Math.min(1, player.hp / prevMaxHp)) : 1;
        player.hp = Math.max(1, Math.min(player.maxHp, Math.round(hpRatio * player.maxHp)));
      } else {
        player.hp = Math.min(player.hp, player.maxHp);
      }
      if (newMaxHp !== prevMaxHp || player.hp > player.displayHp) {
        player.displayHp = player.hp;
      }
      if (valPlayerHP) {
        valPlayerHP.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
      }

      const baseSpeed = defaultStats.player.speed || 60;
      player.speed = baseSpeed * speedMult;
      player.knockbackResist = Math.min(0.85, totalKbResist);

      // Cập nhật nhãn điểm giáp trong UI
      const badge = document.getElementById("equipArmorBadge");
      if (badge) badge.textContent = playerMaxArmor + " Giáp";

      renderEquipmentSlots();
      renderPaperdoll();
    }

    // Kiểm tra xem một vật phẩm có đúng loại cho slot giáp không (0: helmet, 1: chest, 2: legs, 3: boots)
    function canItemGoInEquipSlot(item, slotIdx) {
      if (!item) return false;
      const itData = getItemData(item) || item;
      const expectedTypes = ['helmet', 'chest', 'legs', 'boots'];
      const exp = expectedTypes[slotIdx];
      if (itData.slotType) return itData.slotType === exp;
      if (itData.id) {
        if (exp === 'helmet' && (itData.id.includes('helmet') || (itData.name && (itData.name.includes('Nón') || itData.name.includes('Mũ'))))) return true;
        if (exp === 'chest' && (itData.id.includes('chest') || (itData.name && itData.name.includes('Giáp')))) return true;
        if (exp === 'legs' && (itData.id.includes('legs') || (itData.name && itData.name.includes('Quần')))) return true;
        if (exp === 'boots' && (itData.id.includes('boots') || (itData.name && (itData.name.includes('Giày') || itData.name.includes('Ủng'))))) return true;
      }
      return false;
    }

    // Khởi tạo các phần tử ô DOM cố định 1 lần duy nhất (In-place DOM pooling)
    function initInventoryDOM() {
      // 0. Khởi tạo 4 ô Trang bị (Equipment Slots)
      for (let eq = 0; eq < 4; eq++) {
        const eqEl = document.getElementById("equipSlot" + eq);
        if (eqEl && !eqEl.dataset.initialized) {
          eqEl.dataset.initialized = "true";
          eqEl.addEventListener("contextmenu", (e) => e.preventDefault());
          eqEl.addEventListener("mousedown", (e) => handleSlotMouseDown("equip", eq, e));
          bindMouseHoverTooltip(eqEl, () => getSlotItem("equip", eq));
          bindSlotTouchEvents(eqEl, "equip", eq);
        }
      }

      // 1. Hotbar chính ngoài màn hình (9 ô: chỉ số 0 -> 8)
      if (hotbarUI && hotbarUI.children.length === 0) {
        for (let i = 0; i < 9; i++) {
          const slotEl = document.createElement("div");
          slotEl.className = "slot";
          slotEl.dataset.type = "inv";
          slotEl.dataset.index = i;

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => {
            if (isRecentTouchInteraction()) return;
            const invClosed = (!inventoryUI || inventoryUI.style.display === "none" || inventoryUI.style.display === "");
            if (invClosed && !cursorItem) {
              if (e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                activeHotbarIndex = i;
                renderHotbar();
                if (window.onMobileHotbarSelect) window.onMobileHotbarSelect(i);
                return;
              }
              if (e.button === 2) {
                e.preventDefault();
                e.stopPropagation();
                const clickedIt = getSlotItem("inv", i);
                if (clickedIt && clickedIt.id === "magic_wand") {
                  activeHotbarIndex = i;
                  renderHotbar();
                  openWandCustomizer(true, clickedIt);
                }
                return;
              }
            }
            handleSlotMouseDown("inv", i, e);
          });
          bindMouseHoverTooltip(slotEl, () => getSlotItem("inv", i), (e) => handleSlotMouseEnter("inv", i, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            const invClosed = (!inventoryUI || inventoryUI.style.display === "none" || inventoryUI.style.display === "");
            if (invClosed) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("inv", i);
          });
          bindSlotTouchEvents(slotEl, "inv", i, { isBottomHotbar: true });

          const keyEl = document.createElement("span");
          keyEl.className = "hotbar-key";
          keyEl.textContent = (i + 1).toString();
          keyEl.setAttribute("aria-hidden", "true");
          slotEl.setAttribute("role", "button");
          slotEl.setAttribute("aria-label", `Ô phím tắt ${i + 1}`);
          slotEl.appendChild(keyEl);

          hotbarUI.appendChild(slotEl);
        }
      }

      // 2. Kho đồ lưu trữ 27 ô bên trong bảng túi đồ (chỉ số 9 -> 35)
      if (storageGrid && storageGrid.children.length === 0) {
        for (let i = 9; i < 36; i++) {
          const slotEl = document.createElement("div");
          slotEl.className = "slot";
          slotEl.dataset.type = "inv";
          slotEl.dataset.index = i;

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("inv", i, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("inv", i), (e) => handleSlotMouseEnter("inv", i, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("inv", i);
          });
          bindSlotTouchEvents(slotEl, "inv", i);

          storageGrid.appendChild(slotEl);
        }
      }

      // 3. 9 ô Hotbar hiển thị trong bảng túi đồ (chỉ số 0 -> 8)
      if (hotbarInvGrid && hotbarInvGrid.children.length === 0) {
        for (let i = 0; i < 9; i++) {
          const slotEl = document.createElement("div");
          slotEl.className = "slot";
          slotEl.dataset.type = "inv";
          slotEl.dataset.index = i;

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("inv", i, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("inv", i), (e) => handleSlotMouseEnter("inv", i, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("inv", i);
          });
          bindSlotTouchEvents(slotEl, "inv", i);

          const subNum = document.createElement("span");
          subNum.className = "hotbar-sub-num";
          subNum.textContent = (i + 1).toString();
          slotEl.appendChild(subNum);

          hotbarInvGrid.appendChild(slotEl);
        }
      }

      // 4. Lưới chế tạo cá nhân 2x2 (4 ô: chỉ số 0 -> 3)
      if (pocketCraftingGrid && pocketCraftingGrid.children.length !== 4) {
        pocketCraftingGrid.innerHTML = "";
        for (let c = 0; c < 4; c++) {
          const slotEl = document.createElement("div");
          slotEl.className = "slot";
          slotEl.dataset.type = "pocket";
          slotEl.dataset.index = c;

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("pocket", c, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("pocket", c), (e) => handleSlotMouseEnter("pocket", c, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("pocket", c);
          });
          bindSlotTouchEvents(slotEl, "pocket", c);

          pocketCraftingGrid.appendChild(slotEl);
        }
      }

      // 5. Lưới bàn chế tạo 3x3 (9 ô: chỉ số 0 -> 8)
      if (workstationCraftingGrid && workstationCraftingGrid.children.length !== 9) {
        workstationCraftingGrid.innerHTML = "";
        for (let c = 0; c < 9; c++) {
          const slotEl = document.createElement("div");
          slotEl.className = "slot";
          slotEl.dataset.type = "workstation";
          slotEl.dataset.index = c;

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("workstation", c, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("workstation", c), (e) => handleSlotMouseEnter("workstation", c, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("workstation", c);
          });
          bindSlotTouchEvents(slotEl, "workstation", c);

          workstationCraftingGrid.appendChild(slotEl);
        }
      }

      // 6. Khởi tạo sự kiện cho 2 ô Lò Rèn Nâng Cấp (forgeSlotItem: 0, forgeSlotMaterial: 1)
      const fItemEl = document.getElementById("forgeSlotItem");
      const fMatEl = document.getElementById("forgeSlotMaterial");
      [fItemEl, fMatEl].forEach((el, fIdx) => {
        if (el && !el.dataset.bound) {
          el.dataset.bound = "true";
          el.dataset.type = "forge";
          el.dataset.index = fIdx;
          el.addEventListener("contextmenu", (e) => e.preventDefault());
          el.addEventListener("mousedown", (e) => handleSlotMouseDown("forge", fIdx, e));
          bindMouseHoverTooltip(el, () => getSlotItem("forge", fIdx), (e) => handleSlotMouseEnter("forge", fIdx, e));
          bindSlotTouchEvents(el, "forge", fIdx);
        }
      });

      // 7. Khởi tạo các ô của Bàn Khảm Đũa Phép (3 ô chiêu + 36 ô túi đồng bộ)
      if (typeof initWandSocketDOM === "function") {
        initWandSocketDOM();
      }
    }

    // -------------------------------------------------------------
    // HỆ THỐNG TOOLTIP & KIỂM TRA CÔNG THỨC CHẾ TẠO (CRAFTING RECIPES)
    // -------------------------------------------------------------
    const tooltipEl = document.getElementById("item-tooltip");
    const tooltipTitle = document.getElementById("tooltipTitle");
    const tooltipDesc = document.getElementById("tooltipDesc");
    const tooltipBadge = document.getElementById("tooltipBadge");
    const tooltipStats = document.getElementById("tooltipStats");
    const tooltipPerks = document.getElementById("tooltipPerks");

    const TOOLTIP_RARITY_STYLES = {
      common:    { border: "#475569", title: "#f8fafc", glow: "rgba(148, 163, 184, 0.14)" },
      uncommon:  { border: "#22c55e", title: "#86efac", glow: "rgba(34, 197, 94, 0.22)" },
      rare:      { border: "#38bdf8", title: "#7dd3fc", glow: "rgba(56, 189, 248, 0.26)" },
      epic:      { border: "#a855f7", title: "#e9d5ff", glow: "rgba(168, 85, 247, 0.28)" },
      legendary: { border: "#f59e0b", title: "#fde047", glow: "rgba(245, 158, 11, 0.34)" }
    };

    function getToolHarvestDurationLabel(itemId, isWood) {
      const id = itemId || "";
      if (isWood) {
        if (id.includes("diamond")) return "0.30s";
        if (id.includes("gold")) return "0.45s";
        if (id.includes("iron")) return "0.65s";
        if (id.includes("stone")) return "1.0s";
        return "1.5s";
      }
      if (id.includes("diamond")) return "0.35s";
      if (id.includes("gold")) return "0.55s";
      if (id.includes("iron")) return "0.80s";
      if (id.includes("stone")) return "1.30s";
      return "2.0s";
    }

    let lastTooltipCacheKey = null;
    let cachedTooltipW = 210;
    let cachedTooltipH = 90;

    function showItemTooltip(item, x, y, isTouch = false) {
      if (!tooltipEl || !item) return;
      const wandSig = item.wandData
        ? `${Array.isArray(item.wandData.slots) ? item.wandData.slots.join(",") : ""}/${Array.isArray(item.wandData.gemSlots) ? item.wandData.gemSlots.join(",") : ""}`
        : "";
      const cacheKey = `${item.id || ""}|${item.name || ""}|${item.durability ?? ""}|${item.maxDurability ?? ""}|${wandSig}`;
      const needsContentRebuild = (tooltipEl.style.display !== "block" || cacheKey !== lastTooltipCacheKey);

      if (needsContentRebuild) {
        lastTooltipCacheKey = cacheKey;
        const data = getItemData(item) || item;
        const rarityStyle = TOOLTIP_RARITY_STYLES[data.rarity] || TOOLTIP_RARITY_STYLES.common;

        tooltipEl.style.borderColor = rarityStyle.border;
        tooltipEl.style.boxShadow = `0 14px 32px rgba(0, 0, 0, 0.9), 0 0 16px ${rarityStyle.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`;
        tooltipTitle.textContent = data.name || item.name || "Vật phẩm";
        tooltipTitle.style.color = rarityStyle.title;

        // Nhãn phân loại ngắn gọn, đồng bộ
        let badgeText = "VẬT PHẨM";
        let badgeColor = "#38bdf8";
        if (data.category === "weapon") {
          if (data.id === "hunting_bow") { badgeText = "🏹 CUNG TẦM XA"; badgeColor = "#fb923c"; }
          else if (data.id === "magic_wand") { badgeText = "🪄 ĐŨA PHÉP"; badgeColor = "#e879f9"; }
          else { badgeText = "⚔️ VŨ KHÍ"; badgeColor = "#fb7185"; }
        } else if (data.category === "spell") {
          badgeText = "🔮 CHIÊU THỨC"; badgeColor = "#c084fc";
        } else if (data.category === "gem") {
          badgeText = "💎 NGỌC BỔ TRỢ"; badgeColor = "#22d3ee";
        } else if (data.category === "armor") {
          badgeColor = "#38bdf8";
          if (data.slotType === "helmet") badgeText = "🛡️ NÓN GIÁP";
          else if (data.slotType === "chest") badgeText = "🛡️ ÁO GIÁP";
          else if (data.slotType === "legs") badgeText = "🛡️ QUẦN GIÁP";
          else if (data.slotType === "boots") badgeText = "🥾 GIÀY GIÁP";
          else badgeText = "🛡️ GIÁP TRỤ";
        } else if (data.category === "tool") {
          badgeColor = "#fbbf24";
          if (data.woodcuttingSpeed) badgeText = "🪓 RÌU";
          else if (data.miningSpeed) badgeText = "⛏️ CÚP";
          else if (data.toolType === "fishing_rod") { badgeText = "🎣 CẦN CÂU"; badgeColor = "#38bdf8"; }
          else badgeText = "🛠️ CÔNG CỤ";
        } else if (data.category === "consumable") {
          badgeText = "🍖 THỨC ĂN"; badgeColor = "#4ade80";
        } else if (data.category === "ammo") {
          badgeText = "🎯 ĐẠN TÊN"; badgeColor = "#38bdf8";
        } else if (data.category === "resource") {
          badgeText = "📦 NGUYÊN LIỆU"; badgeColor = "#94a3b8";
        } else if (data.category === "placeable" || data.category === "building") {
          badgeText = "🔨 CÔNG TRÌNH"; badgeColor = "#c084fc";
        }

        if (tooltipBadge) {
          tooltipBadge.textContent = badgeText;
          tooltipBadge.style.color = badgeColor;
          tooltipBadge.style.borderColor = badgeColor + "55";
          tooltipBadge.style.background = badgeColor + "1a";
        }

        // Bảng chỉ số gọn gàng
        if (tooltipStats) {
          let statsHtml = "";
          if (data.rangedDamage) {
            statsHtml += `<div class="tooltip-stat-row"><span>🏹 Sát thương</span><span class="tooltip-stat-val dmg">${data.rangedDamage}</span></div>`;
          }
          const rollCfg = WEAPON_ROLL_TABLE[data.id];
          const actualDmg = (typeof item.damage === "number") ? item.damage : data.damage;
          if (item.rollQuality) {
            statsHtml += `<div class="tooltip-stat-row"><span>✨ Phẩm chất</span><span class="tooltip-stat-val" style="color:${item.rollColor || '#fde047'};">[${item.rollQuality}]</span></div>`;
          }
          if (actualDmg) {
            let dmgLabel = `+${actualDmg} DMG`;
            if (data.id === "magic_wand") {
              const gemB = getWandGemBonuses({ id: "magic_wand", wandData: ensureWandData({ id: "magic_wand", wandData: item.wandData }) });
              dmgLabel = `+${actualDmg + (gemB.damageBonus || 0)} DMG`;
            }
            const rangeHint = rollCfg ? ` (${rollCfg.dmgMin}–${rollCfg.dmgMax})` : "";
            statsHtml += `<div class="tooltip-stat-row"><span>⚔️ Sát thương</span><span class="tooltip-stat-val dmg">${dmgLabel}${rangeHint}</span></div>`;
          }
          if (item.bonusArmor) {
            statsHtml += `<div class="tooltip-stat-row"><span>🛡️ Giáp cộng thêm</span><span class="tooltip-stat-val armor">+${item.bonusArmor} Giáp</span></div>`;
          }
          if (item.bonusHp) {
            statsHtml += `<div class="tooltip-stat-row"><span>❤️ Máu cộng thêm</span><span class="tooltip-stat-val hp">+${item.bonusHp} HP</span></div>`;
          }
          if (item.bonusSpeed) {
            statsHtml += `<div class="tooltip-stat-row"><span>👟 Tốc chạy cộng thêm</span><span class="tooltip-stat-val spd">+${Math.round(item.bonusSpeed * 100)}%</span></div>`;
          }
          if (data.category === "spell" && data.spellId && SPELLS_DATABASE[data.spellId]) {
            statsHtml += `<div class="tooltip-stat-row"><span>⏱️ Hồi chiêu</span><span class="tooltip-stat-val spd">${SPELLS_DATABASE[data.spellId].cooldown}s</span></div>`;
          }
          if (data.damageBonus) {
            statsHtml += `<div class="tooltip-stat-row"><span>⚔️ Cường hóa</span><span class="tooltip-stat-val dmg">+${data.damageBonus} DMG / viên</span></div>`;
          }
          if (data.cooldownReduction) {
            statsHtml += `<div class="tooltip-stat-row"><span>💨 Giảm hồi chiêu</span><span class="tooltip-stat-val spd">-${data.cooldownReduction}% / viên</span></div>`;
          }
          if (data.critChanceBonus) {
            statsHtml += `<div class="tooltip-stat-row"><span>💥 Tỉ lệ chí mạng</span><span class="tooltip-stat-val dmg">+${data.critChanceBonus}% / viên</span></div>`;
          }
          if (data.effectType === "burn") {
            statsHtml += `<div class="tooltip-stat-row"><span>🔥 Hiệu ứng</span><span class="tooltip-stat-val dmg">Thiêu đốt theo giây</span></div>`;
          } else if (data.effectType === "slow") {
            statsHtml += `<div class="tooltip-stat-row"><span>❄️ Hiệu ứng</span><span class="tooltip-stat-val armor">Làm chậm -50%</span></div>`;
          } else if (data.effectType === "vampire") {
            statsHtml += `<div class="tooltip-stat-row"><span>🩸 Hiệu ứng</span><span class="tooltip-stat-val hp">Hút +15% Máu</span></div>`;
          }
          if (data.id === "chest") {
            statsHtml += `<div class="tooltip-stat-row"><span>📦 Sức chứa</span><span class="tooltip-stat-val spd">27 Ô đồ</span></div>`;
          }
          if (data.armor) {
            statsHtml += `<div class="tooltip-stat-row"><span>🛡️ Giáp phòng thủ</span><span class="tooltip-stat-val armor">+${data.armor} Giáp</span></div>`;
          }
          if (data.maxHpBonus) {
            statsHtml += `<div class="tooltip-stat-row"><span>❤️ Máu tối đa</span><span class="tooltip-stat-val hp">+${data.maxHpBonus} HP</span></div>`;
          }
          if (data.healAmount) {
            statsHtml += `<div class="tooltip-stat-row"><span>❤️ Hồi máu</span><span class="tooltip-stat-val hp">+${data.healAmount} HP</span></div>`;
          }
          if (data.hungerRestore) {
            statsHtml += `<div class="tooltip-stat-row"><span>🍖 Độ no</span><span class="tooltip-stat-val spd">+${data.hungerRestore} Đùi gà</span></div>`;
          }
          if (data.speedBonus) {
            statsHtml += `<div class="tooltip-stat-row"><span>👟 Tốc độ chạy</span><span class="tooltip-stat-val spd">+${Math.round(data.speedBonus * 100)}%</span></div>`;
          }
          if (data.knockbackResist) {
            statsHtml += `<div class="tooltip-stat-row"><span>🪨 Kháng đẩy lùi</span><span class="tooltip-stat-val res">+${Math.round(data.knockbackResist * 100)}%</span></div>`;
          }
          if (data.woodcuttingSpeed) {
            const chopDur = getToolHarvestDurationLabel(data.id, true);
            statsHtml += `<div class="tooltip-stat-row"><span>🪓 Tốc độ chặt</span><span class="tooltip-stat-val spd">${chopDur} (x${data.woodcuttingSpeed})</span></div>`;
          }
          if (data.miningSpeed) {
            const mineDur = getToolHarvestDurationLabel(data.id, false);
            statsHtml += `<div class="tooltip-stat-row"><span>⛏️ Tốc độ đào</span><span class="tooltip-stat-val spd">${mineDur} (x${data.miningSpeed})</span></div>`;
          }
          if (item.durability !== undefined || data.durability !== undefined) {
            const curDur = item.durability !== undefined ? item.durability : data.durability;
            const maxDur = item.maxDurability || data.maxDurability || curDur;
            const pct = Math.round((curDur / maxDur) * 100);
            const durColor = pct > 50 ? "#4ade80" : (pct > 25 ? "#facc15" : "#ef4444");
            statsHtml += `<div class="tooltip-stat-row"><span>🔧 Độ bền</span><span class="tooltip-stat-val" style="color: ${durColor};">${curDur}/${maxDur} (${pct}%)</span></div>`;
          }

          tooltipStats.innerHTML = statsHtml;
          tooltipStats.style.display = statsHtml ? "flex" : "none";
        }

        // Danh sách tính năng / nội tại gọn gàng, không lặp lại chỉ số
        let perks = [];
        if (data.id === "magic_wand") {
          const wd = ensureWandData({ id: "magic_wand", wandData: item.wandData });
          const res = getWandResonance({ id: "magic_wand", wandData: wd });
          const gemB = getWandGemBonuses({ id: "magic_wand", wandData: wd });
          const keys = ["Z", "X", "C"];
          const socketedNames = wd.slots.map((sid, idx) => {
            const sp = sid ? SPELLS_DATABASE[sid] : null;
            return sp ? `[${keys[idx]}] ${sp.badge} ${sp.shortName}` : `[${keys[idx]}] Trống`;
          }).join(" · ");
          const gemCounts = {};
          for (const gid of wd.gemSlots) {
            if (gid && ITEMS_DATABASE[gid]) {
              const shortGem = ITEMS_DATABASE[gid].name.replace("Ngọc ", "");
              gemCounts[shortGem] = (gemCounts[shortGem] || 0) + 1;
            }
          }
          const gemSummary = Object.keys(gemCounts).length > 0
            ? Object.entries(gemCounts).map(([k, v]) => `${k} ×${v}`).join(" · ")
            : "Chưa khảm";

          perks.push(`🔮 Chiêu: ${socketedNames}`);
          perks.push(`💎 Ngọc: ${gemSummary}`);
          if (gemB.summaryParts.length > 0) {
            perks.push(`✨ Bổ trợ: ${gemB.summaryParts.join(" · ")}`);
          }
          if (res) {
            perks.push(`${res.label}: ${res.basicDesc}`);
          }
        } else if (Array.isArray(data.perks)) {
          perks = [...data.perks];
        }

        if (tooltipPerks) {
          if (perks.length > 0) {
            tooltipPerks.innerHTML = perks
              .map(p => `<div class="tooltip-perk-item">${p}</div>`)
              .join("");
            tooltipPerks.style.display = "flex";
          } else {
            tooltipPerks.innerHTML = "";
            tooltipPerks.style.display = "none";
          }
        }

        // Hiển thị dòng mô tả đồng bộ ở chân tooltip cho tất cả vật phẩm
        if (tooltipDesc) {
          if (data.description) {
            tooltipDesc.textContent = data.description;
            tooltipDesc.style.display = "block";
          } else {
            tooltipDesc.style.display = "none";
          }
        }

        tooltipEl.style.display = "block";
        cachedTooltipW = tooltipEl.offsetWidth || 225;
        cachedTooltipH = tooltipEl.offsetHeight || 95;
      }

      const ttWidth = cachedTooltipW;
      const ttHeight = cachedTooltipH;
      let posX;
      let posY;
      if (isTouch) {
        posX = x - ttWidth / 2;
        posY = y - ttHeight - 28;
        if (posY < 10) posY = y + 26;
      } else {
        posX = x + 14;
        posY = y + 14;
        if (posX + ttWidth > window.innerWidth) posX = x - ttWidth - 10;
        if (posY + ttHeight > window.innerHeight) posY = y - ttHeight - 10;
      }
      posX = Math.max(10, Math.min(window.innerWidth - ttWidth - 10, posX));
      posY = Math.max(10, Math.min(window.innerHeight - ttHeight - 10, posY));
      tooltipEl.style.transform = `translate3d(${Math.round(posX)}px, ${Math.round(posY)}px, 0)`;
    }

    function hideItemTooltip() {
      lastTooltipCacheKey = null;
      if (tooltipEl) tooltipEl.style.display = "none";
    }

    // -------------------------------------------------------------
    // LOGIC CÔNG THỨC CHẾ TẠO (2x2 CÁ NHÂN & 3x3 BÀN CHẾ TẠO)
    // -------------------------------------------------------------
    function updateCraftingResult() {
      // 1. Cập nhật kết quả Chế tạo cá nhân 2x2
      updatePocketCraftingResult();

      // 2. Cập nhật kết quả Bàn chế tạo 3x3
      updateWorkstationCraftingResult();
    }

    function updatePocketCraftingResult() {
      if (!pocketCraftResultSlot) return;
      const c = pocketCraftingInventory;
      const counts = {};
      let totalFilled = 0;
      for (let i = 0; i < 4; i++) {
        if (c[i] && c[i].quantity > 0) {
          totalFilled++;
          const id = c[i].id || '';
          counts[id] = (counts[id] || 0) + 1;
        }
      }

      pocketCraftResultItem = null;

      // Công thức 2x2 bỏ túi:
      // - 1 Khúc Gỗ -> 4 Cành Cây
      if (totalFilled === 1 && counts['wood_log'] === 1) {
        pocketCraftResultItem = { id: 'wooden_stick', name: 'Cành Cây', quantity: 4 };
      }
      // - 4 Khúc Gỗ -> 1 Bàn Chế Tạo
      else if (totalFilled === 4 && counts['wood_log'] === 4) {
        pocketCraftResultItem = { id: 'crafting_table', name: 'Bàn Chế Tạo', quantity: 1 };
      }
      // - 1 Khúc Gỗ + 1 Cành Cây -> 1 Kiếm Gỗ
      else if (totalFilled === 2 && counts['wood_log'] === 1 && counts['wooden_stick'] === 1) {
        pocketCraftResultItem = { id: 'wood_sword', name: 'Kiếm Gỗ', quantity: 1, durability: 45, maxDurability: 45 };
      }
      // - 1 Đá Cuội + 1 Cành Cây -> 4 Mũi Tên
      else if (totalFilled === 2 && counts['stone_rock'] === 1 && counts['wooden_stick'] === 1) {
        pocketCraftResultItem = { id: 'arrow', name: 'Mũi Tên', quantity: 4 };
      }

      renderResultSlotDOM(pocketCraftResultSlot, pocketCraftResultItem);
    }

    
    // -------------------------------------------------------------
    // HỆ THỐNG CÔNG THỨC ĐỊNH HÌNH 3X3 CHUẨN MINECRAFT (SHAPED & MIRRORED)
    // -------------------------------------------------------------
    function matchShapedPattern(grid, pattern) {
      const patH = pattern.length;
      const patW = pattern[0].length;

      let minR = 3, maxR = -1, minC = 3, maxC = -1;
      let totalGridItems = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const item = grid[r * 3 + c];
          if (item && item.quantity > 0) {
            totalGridItems++;
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        }
      }

      if (totalGridItems === 0) return false;
      const gridH = maxR - minR + 1;
      const gridW = maxC - minC + 1;

      // Kích thước vùng xếp phải bằng kích thước công thức
      if (gridH !== patH || gridW !== patW) return false;

      // 1. Kiểm tra khớp xuôi bình thường
      let normalMatch = true;
      for (let r = 0; r < patH; r++) {
        for (let c = 0; c < patW; c++) {
          const expected = pattern[r][c];
          const actual = grid[(minR + r) * 3 + (minC + c)];
          const actualId = (actual && actual.quantity > 0) ? (actual.id || actual.name) : null;
          if (expected === null) {
            if (actualId !== null) normalMatch = false;
          } else {
            if (actualId !== expected) normalMatch = false;
          }
        }
      }
      if (normalMatch) return true;

      // 2. Kiểm tra quy tắc đối xứng gương trái - phải (Mirrored)
      let mirrorMatch = true;
      for (let r = 0; r < patH; r++) {
        for (let c = 0; c < patW; c++) {
          const expected = pattern[r][patW - 1 - c];
          const actual = grid[(minR + r) * 3 + (minC + c)];
          const actualId = (actual && actual.quantity > 0) ? (actual.id || actual.name) : null;
          if (expected === null) {
            if (actualId !== null) mirrorMatch = false;
          } else {
            if (actualId !== expected) mirrorMatch = false;
          }
        }
      }
      return mirrorMatch;
    }

    function updateWorkstationCraftingResult() {
      if (!workstationCraftResultSlot) return;
      const c = workstationCraftingInventory;
      const counts = {};
      let totalFilled = 0;
      for (let i = 0; i < 9; i++) {
        if (c[i] && c[i].quantity > 0) {
          totalFilled++;
          const id = c[i].id || '';
          counts[id] = (counts[id] || 0) + 1;
        }
      }

      workstationCraftResultItem = null;

      // --- CÔNG THỨC CƠ BẢN VẬT LIỆU ---
      // 1 Khúc Gỗ -> 4 Cành Cây
      if (totalFilled === 1 && counts['wood_log'] === 1) {
        workstationCraftResultItem = { id: 'wooden_stick', name: 'Cành Cây', quantity: 4 };
      }
      // 4 Khúc Gỗ -> 1 Bàn Chế Tạo (2x2 trong bàn 3x3)
      else if (totalFilled === 4 && counts['wood_log'] === 4 && matchShapedPattern(c, [['wood_log', 'wood_log'], ['wood_log', 'wood_log']])) {
        workstationCraftResultItem = { id: 'crafting_table', name: 'Bàn Chế Tạo', quantity: 1 };
      }

      // --- CÔNG THỨC MŨI TÊN (ARROW) ---
      // 1. Dọc: Sắt - Cành Cây - Lông Vũ (cho phép ở bất kỳ cột nào 0, 1, 2)
      // 2. Ngang xuôi: Lông Vũ - Cành Cây - Sắt (ở bất kỳ hàng nào 0, 1, 2)
      // 3. Ngang ngược: Sắt - Cành Cây - Lông Vũ (đối xứng gương của ngang)
      else if (totalFilled === 3 && counts['iron_ore'] === 1 && counts['wooden_stick'] === 1 && counts['feather'] === 1 && (
        matchShapedPattern(c, [
          ['iron_ore'],
          ['wooden_stick'],
          ['feather']
        ]) ||
        matchShapedPattern(c, [
          ['feather', 'wooden_stick', 'iron_ore']
        ])
      )) {
        workstationCraftResultItem = { id: 'arrow', name: 'Mũi Tên', quantity: 4 };
      }


      // --- CÁC CÔNG THỨC VŨ KHÍ & CÔNG CỤ THEO ĐÚNG MA TRẬN YÊU CẦU ---
      // 1. KIẾM GỖ (Gọc: G/G/C - cho phép ở cột 0, cột 1 hoặc cột 2)
      // G
      // G
      // C
      else if (totalFilled === 3 && counts['wood_log'] === 2 && counts['wooden_stick'] === 1 && matchShapedPattern(c, [
        ['wood_log'],
        ['wood_log'],
        ['wooden_stick']
      ])) {
        workstationCraftResultItem = { id: 'wood_sword', name: 'Kiếm Gỗ', quantity: 1, durability: 45, maxDurability: 45 };
      }

      // 2. RÌU GỖ (Có hỗ trợ đối xứng gương trái - phải)
      // G G .       . G G
      // G C .  hoặc . C G
      // . C .       . C .
      else if (totalFilled === 5 && counts['wood_log'] === 3 && counts['wooden_stick'] === 2 && matchShapedPattern(c, [
        ['wood_log', 'wood_log'],
        ['wood_log', 'wooden_stick'],
        [null, 'wooden_stick']
      ])) {
        workstationCraftResultItem = { id: 'wood_axe', name: 'Rìu Gỗ', quantity: 1, durability: 50, maxDurability: 50 };
      }

      // 3. CÚP GỖ (Pickaxe)
      // G G G
      // . C .
      // . C .
      else if (totalFilled === 5 && counts['wood_log'] === 3 && counts['wooden_stick'] === 2 && matchShapedPattern(c, [
        ['wood_log', 'wood_log', 'wood_log'],
        [null, 'wooden_stick', null],
        [null, 'wooden_stick', null]
      ])) {
        workstationCraftResultItem = { id: 'wood_pickaxe', name: 'Cúp Gỗ', quantity: 1, durability: 40, maxDurability: 40 };
      }

      // 4. CUNG SĂN (Có hỗ trợ đối xứng gương trái - phải)
      // C C D       D C C
      // C D .  hoặc . D C
      // D . .       . . D
      else if (totalFilled === 6 && counts['wooden_stick'] === 3 && counts['plant_fiber'] === 3 && matchShapedPattern(c, [
        ['wooden_stick', 'wooden_stick', 'plant_fiber'],
        ['wooden_stick', 'plant_fiber', null],
        ['plant_fiber', null, null]
      ])) {
        workstationCraftResultItem = { id: 'hunting_bow', name: 'Cung Săn Bắn', quantity: 1, durability: 90, maxDurability: 90 };
      }

      // 5. CẦN CÂU (Hỗ trợ đối xứng gương trái - phải)
      // . . C       C . .
      // . C S  hoặc S C .
      // C . S       S . C
      else if (totalFilled === 5 && counts['wooden_stick'] === 3 && counts['plant_fiber'] === 2 && matchShapedPattern(c, [
        [null, null, 'wooden_stick'],
        [null, 'wooden_stick', 'plant_fiber'],
        ['wooden_stick', null, 'plant_fiber']
      ])) {
        workstationCraftResultItem = { id: 'fishing_rod', name: 'Cần Câu', quantity: 1, durability: 100, maxDurability: 100 };
      }

      // 6. ĐŨA PHÉP (Chéo: Kim Cương / Cành / Cành)
      else if (totalFilled === 3 && counts['diamond'] === 1 && counts['wooden_stick'] === 2 && matchShapedPattern(c, [
        [null, null, 'diamond'],
        [null, 'wooden_stick', null],
        ['wooden_stick', null, null]
      ])) {
        workstationCraftResultItem = {
          id: 'magic_wand',
          name: 'Đũa Phép',
          quantity: 1,
          durability: 200,
          maxDurability: 200,
          wandData: { slots: [null, null, null], gemSlots: [null, null, null] }
        };
      }

      // 7. RƯƠNG ĐỒ (Fill đủ 8 ô gỗ viền 3x3, trừ ô chính giữa [4] trống)
      else if (totalFilled === 8 && counts['wood_log'] === 8 && (!c[4] || c[4].quantity <= 0)) {
        workstationCraftResultItem = { id: 'chest', name: 'Rương Đồ', quantity: 1 };
      }

      // 8. NGỌC TRỌNG LỰC (Chiêu Thức duy nhất — Vòng đá + Sắt + Kim Cương tâm)
      else if (totalFilled === 9 && counts['stone_rock'] === 4 && counts['iron_ore'] === 4 && counts['diamond'] === 1 && matchShapedPattern(c, [
        ['stone_rock', 'iron_ore', 'stone_rock'],
        ['iron_ore', 'diamond', 'iron_ore'],
        ['stone_rock', 'iron_ore', 'stone_rock']
      ])) {
        workstationCraftResultItem = { id: 'spell_gravity', name: SPELLS_DATABASE.spell_gravity.name, quantity: 1 };
      }

      // --- CÁC LOẠI NGỌC KHẢM CHỈ SỐ / HIỆU ỨNG (PHẦN 2 - KHÔNG PHẢI CHIÊU THỨC) ---
      // 9. NGỌC SỨC MẠNH (+3 DMG; 3x = +12 DMG)
      else if (totalFilled === 5 && counts['iron_ore'] === 4 && counts['stone_rock'] === 1 && matchShapedPattern(c, [
        [null, 'iron_ore', null],
        ['iron_ore', 'stone_rock', 'iron_ore'],
        [null, 'iron_ore', null]
      ])) {
        workstationCraftResultItem = { id: 'gem_damage', name: 'Ngọc Sức Mạnh', quantity: 1 };
      }

      // 10. NGỌC VIÊM HỎA (Thiêu đốt; 3x = Cháy Lan AoE)
      else if (totalFilled === 5 && counts['coal'] === 4 && counts['gold_ore'] === 1 && matchShapedPattern(c, [
        [null, 'coal', null],
        ['coal', 'gold_ore', 'coal'],
        [null, 'coal', null]
      ])) {
        workstationCraftResultItem = { id: 'gem_fire', name: 'Ngọc Viêm Hỏa', quantity: 1 };
      }

      // 11. NGỌC BĂNG SƯƠNG (Làm chậm; 3x = Sóng Băng Lan)
      else if (totalFilled === 5 && counts['raw_fish'] === 4 && counts['diamond'] === 1 && matchShapedPattern(c, [
        [null, 'raw_fish', null],
        ['raw_fish', 'diamond', 'raw_fish'],
        [null, 'raw_fish', null]
      ])) {
        workstationCraftResultItem = { id: 'gem_frost', name: 'Ngọc Băng Sương', quantity: 1 };
      }

      // 12. NGỌC HÚT MÁU (+15% Lifesteal; 3x = 55%)
      else if (totalFilled === 5 && counts['boar_unripe'] === 4 && counts['gold_ore'] === 1 && matchShapedPattern(c, [
        [null, 'boar_unripe', null],
        ['boar_unripe', 'gold_ore', 'boar_unripe'],
        [null, 'boar_unripe', null]
      ])) {
        workstationCraftResultItem = { id: 'gem_vampire', name: 'Ngọc Hút Máu', quantity: 1 };
      }

      // 13. NGỌC TỐC ĐỘ (-14% Hồi chiêu mỗi viên)
      else if (totalFilled === 5 && counts['feather'] === 4 && counts['copper_ore'] === 1 && matchShapedPattern(c, [
        [null, 'feather', null],
        ['feather', 'copper_ore', 'feather'],
        [null, 'feather', null]
      ])) {
        workstationCraftResultItem = { id: 'gem_haste', name: 'Ngọc Tốc Độ', quantity: 1 };
      }

      // 14. NGỌC CHÍ MẠNG (+18% Chí mạng x1.75)
      else if (totalFilled === 5 && counts['gold_ore'] === 4 && counts['diamond'] === 1 && matchShapedPattern(c, [
        [null, 'gold_ore', null],
        ['gold_ore', 'diamond', 'gold_ore'],
        [null, 'gold_ore', null]
      ])) {
        workstationCraftResultItem = { id: 'gem_crit', name: 'Ngọc Chí Mạng', quantity: 1 };
      }

      craftResultItem = workstationCraftResultItem;
      renderResultSlotDOM(workstationCraftResultSlot, workstationCraftResultItem);
    }

    function renderResultSlotDOM(slotEl, item) {
      if (!slotEl) return;
      let img = slotEl.querySelector("img");
      let countSpan = slotEl.querySelector(".item-count");

      if (!item) {
        if (img) img.style.display = "none";
        if (countSpan) countSpan.style.display = "none";
        slotEl.classList.add("disabled");
      } else {
        slotEl.classList.remove("disabled");
        if (!img) {
          img = document.createElement("img");
          slotEl.appendChild(img);
        }
        img.src = getItemIcon(item);
        img.alt = item.name;
        img.style.display = "block";

        if (!countSpan) {
          countSpan = document.createElement("span");
          countSpan.className = "item-count";
          slotEl.appendChild(countSpan);
        }
        countSpan.textContent = item.quantity;
        countSpan.style.display = "block";
      }
    }

    function collectPocketCraftResult(clientX, clientY, isTouch = false) {
      if (!pocketCraftResultItem) return;

      const maxS = getItemMaxStack(pocketCraftResultItem);
      if (!cursorItem) {
        cursorItem = rollWeaponInstance({ ...pocketCraftResultItem });
      } else if (cursorItem.id === pocketCraftResultItem.id && cursorItem.name === pocketCraftResultItem.name && cursorItem.quantity + pocketCraftResultItem.quantity <= maxS) {
        cursorItem.quantity += pocketCraftResultItem.quantity;
      } else {
        return;
      }

      // Trừ 1 nguyên liệu ở mỗi ô trong lưới 2x2
      for (let i = 0; i < 4; i++) {
        if (pocketCraftingInventory[i]) {
          pocketCraftingInventory[i].quantity -= 1;
          if (pocketCraftingInventory[i].quantity <= 0) {
            pocketCraftingInventory[i] = null;
          }
        }
      }

      updatePocketCraftingResult();
      renderCrafting();
      updateCursorUI();
      renderRecipeBook();
      if (cursorItem && clientX !== undefined && clientY !== undefined) {
        positionCursorEl(clientX, clientY, isTouch);
      }
      hideItemTooltip();
      if (isTouch) triggerHaptic(10);
    }

    function collectWorkstationCraftResult(clientX, clientY, isTouch = false) {
      if (!workstationCraftResultItem) return;

      const maxS = getItemMaxStack(workstationCraftResultItem);
      if (!cursorItem) {
        cursorItem = rollWeaponInstance({ ...workstationCraftResultItem });
      } else if (cursorItem.id === workstationCraftResultItem.id && cursorItem.name === workstationCraftResultItem.name && cursorItem.quantity + workstationCraftResultItem.quantity <= maxS) {
        cursorItem.quantity += workstationCraftResultItem.quantity;
      } else {
        return;
      }

      // Trừ 1 nguyên liệu ở mỗi ô trong lưới 3x3
      for (let i = 0; i < 9; i++) {
        if (workstationCraftingInventory[i]) {
          workstationCraftingInventory[i].quantity -= 1;
          if (workstationCraftingInventory[i].quantity <= 0) {
            workstationCraftingInventory[i] = null;
          }
        }
      }

      updateWorkstationCraftingResult();
      renderCrafting();
      updateCursorUI();
      renderRecipeBook();
      if (cursorItem && clientX !== undefined && clientY !== undefined) {
        positionCursorEl(clientX, clientY, isTouch);
      }
      hideItemTooltip();
      if (isTouch) triggerHaptic(10);
    }

    function bindCraftResultSlotEvents(resultEl, getResultItemFn, collectFn) {
      if (!resultEl) return;
      resultEl.addEventListener("contextmenu", (e) => e.preventDefault());
      bindMouseHoverTooltip(resultEl, getResultItemFn);

      let holdTimer = null;
      let startX = 0;
      let startY = 0;
      let lastX = 0;
      let lastY = 0;
      let longPressed = false;

      const clearHold = () => {
        if (holdTimer) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }
      };

      resultEl.addEventListener("touchstart", (e) => {
        lastTouchInteractionTime = performance.now();
        e.preventDefault();
        e.stopPropagation();
        if (!e.touches || e.touches.length !== 1) {
          clearHold();
          return;
        }
        const t = e.changedTouches[0];
        startX = t.clientX;
        startY = t.clientY;
        lastX = t.clientX;
        lastY = t.clientY;
        longPressed = false;
        clearHold();
        holdTimer = setTimeout(() => {
          holdTimer = null;
          const item = getResultItemFn();
          if (!item) return;
          longPressed = true;
          showItemTooltip(item, lastX, lastY, true);
          triggerHaptic(10);
        }, TOUCH_TOOLTIP_HOLD_MS);
      }, { passive: false });

      resultEl.addEventListener("touchmove", (e) => {
        const t = e.changedTouches && e.changedTouches[0];
        if (!t) return;
        lastX = t.clientX;
        lastY = t.clientY;
        if (Math.hypot(lastX - startX, lastY - startY) > TOUCH_DRAG_THRESHOLD_PX) {
          clearHold();
        }
      }, { passive: true });

      resultEl.addEventListener("touchend", (e) => {
        lastTouchInteractionTime = performance.now();
        e.preventDefault();
        e.stopPropagation();
        clearHold();
        if (longPressed) {
          longPressed = false;
          return;
        }
        const t = e.changedTouches && e.changedTouches[0];
        collectFn(t ? t.clientX : undefined, t ? t.clientY : undefined, true);
      }, { passive: false });

      resultEl.addEventListener("touchcancel", () => {
        clearHold();
        longPressed = false;
      }, { passive: true });

      resultEl.addEventListener("mousedown", (e) => {
        if (isRecentTouchInteraction()) return;
        e.preventDefault();
        e.stopPropagation();
        collectFn(e.clientX, e.clientY, false);
      });
    }

    // Sự kiện click / chạm lấy sản phẩm ô Chế Tạo Cá Nhân (2x2) & Bàn Chế Tạo (3x3)
    bindCraftResultSlotEvents(pocketCraftResultSlot, () => pocketCraftResultItem, collectPocketCraftResult);
    bindCraftResultSlotEvents(workstationCraftResultSlot, () => workstationCraftResultItem, collectWorkstationCraftResult);

    // Render thanh Hotbar ngoài màn hình (0 đến 8)
    function renderHotbar() {
      try { if (typeof player !== "undefined" && player && typeof recalculatePlayerArmorAndStats === "function" && !window._inRecalc) { window._inRecalc = true; try { recalculatePlayerArmorAndStats(); } finally { window._inRecalc = false; } } } catch (_e) {}
      if (!hotbarUI) return;
      initInventoryDOM();
      for (let i = 0; i < 9; i++) {
        updateSlotDOM(hotbarUI.children[i], playerInventory[i], i, true);
        if (hotbarInvGrid && hotbarInvGrid.children[i]) {
          hotbarInvGrid.children[i].classList.toggle("active-hotbar", i === activeHotbarIndex);
        }
      }
      if (window.onMobileHudSync) window.onMobileHudSync();
    }

    // =============================================================
    // HỆ THỐNG KHẢM 3 CHIÊU THỨC ĐŨA PHÉP (#wand-socket-modal)
    // =============================================================
    const wandSocketModal = document.getElementById("wand-socket-modal");
    const btnCloseWandModal = document.getElementById("btnCloseWandModal");
    const wandResonanceBanner = document.getElementById("wandResonanceBanner");
    const wandSocketGrid = document.getElementById("wandSocketGrid");
    const wandStorageGrid = document.getElementById("wandStorageGrid");
    const wandHotbarGrid = document.getElementById("wandHotbarGrid");

    let customizerTargetWand = null;

    function isWandModalOpen() {
      const modalEl = document.getElementById("wand-socket-modal");
      return Boolean(modalEl && modalEl.style.display !== "none" && modalEl.style.display !== "");
    }

    function getActiveWandItem() {
      const held = playerInventory[activeHotbarIndex];
      if (held && held.id === "magic_wand") {
        ensureWandData(held);
        return held;
      }
      return null;
    }

    function findAnyWandInInventory() {
      const active = getActiveWandItem();
      if (active) return active;
      for (let i = 0; i < 36; i++) {
        const it = playerInventory[i];
        if (it && it.id === "magic_wand") {
          ensureWandData(it);
          return it;
        }
      }
      return null;
    }

    function getCustomizerWandTarget() {
      if (customizerTargetWand && playerInventory.includes(customizerTargetWand)) {
        return customizerTargetWand;
      }
      if (customizerTargetWand && customizerTargetWand.wandData) {
        for (let i = 0; i < 36; i++) {
          const it = playerInventory[i];
          if (it && it.id === "magic_wand" && it.wandData === customizerTargetWand.wandData) {
            customizerTargetWand = it;
            return it;
          }
        }
      }
      if (cursorItem && cursorItem.id === "magic_wand" && (!customizerTargetWand || cursorItem.wandData === customizerTargetWand.wandData)) {
        return cursorItem;
      }
      customizerTargetWand = findAnyWandInInventory();
      return customizerTargetWand;
    }

    function initWandSocketDOM() {
      if (wandSocketGrid && wandSocketGrid.children.length === 0) {
        for (let s = 0; s < 3; s++) {
          const col = document.createElement("div");
          col.className = "wand-socket-col";

          const slotEl = document.createElement("div");
          slotEl.className = "slot wand-socket-slot";
          slotEl.dataset.type = "wand_socket";
          slotEl.dataset.index = s;

          const keyEl = document.createElement("span");
          keyEl.className = "wand-socket-key";
          keyEl.textContent = isMobileMode() ? String(s + 1) : ["Z", "X", "C"][s];

          const wm = document.createElement("span");
          wm.className = "slot-watermark";
          wm.textContent = "✦";

          slotEl.appendChild(keyEl);
          slotEl.appendChild(wm);

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("wand_socket", s, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("wand_socket", s), (e) => handleSlotMouseEnter("wand_socket", s, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("wand_socket", s);
          });
          bindSlotTouchEvents(slotEl, "wand_socket", s);

          const labelEl = document.createElement("div");
          labelEl.className = "wand-socket-label";
          labelEl.textContent = `Chiêu ${s + 1}`;

          col.appendChild(slotEl);
          col.appendChild(labelEl);
          wandSocketGrid.appendChild(col);
        }
      }

      const wandGemGrid = document.getElementById("wandGemGrid");
      if (wandGemGrid && wandGemGrid.children.length === 0) {
        for (let s = 0; s < 3; s++) {
          const col = document.createElement("div");
          col.className = "wand-socket-col";

          const slotEl = document.createElement("div");
          slotEl.className = "slot wand-gem-slot";
          slotEl.dataset.type = "gem_socket";
          slotEl.dataset.index = s;

          const keyEl = document.createElement("span");
          keyEl.className = "wand-socket-key";
          keyEl.textContent = `G${s + 1}`;

          const wm = document.createElement("span");
          wm.className = "slot-watermark";
          wm.textContent = "💎";

          slotEl.appendChild(keyEl);
          slotEl.appendChild(wm);

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("gem_socket", s, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("gem_socket", s), (e) => handleSlotMouseEnter("gem_socket", s, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("gem_socket", s);
          });
          bindSlotTouchEvents(slotEl, "gem_socket", s);

          const labelEl = document.createElement("div");
          labelEl.className = "wand-gem-label wand-socket-label";
          labelEl.textContent = `Ngọc ${s + 1}`;

          col.appendChild(slotEl);
          col.appendChild(labelEl);
          wandGemGrid.appendChild(col);
        }
      }

      if (wandStorageGrid && wandStorageGrid.children.length === 0) {
        for (let i = 9; i < 36; i++) {
          const slotEl = document.createElement("div");
          slotEl.className = "slot";
          slotEl.dataset.type = "inv";
          slotEl.dataset.index = i;

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("inv", i, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("inv", i), (e) => handleSlotMouseEnter("inv", i, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("inv", i);
          });
          bindSlotTouchEvents(slotEl, "inv", i);

          wandStorageGrid.appendChild(slotEl);
        }
      }

      if (wandHotbarGrid && wandHotbarGrid.children.length === 0) {
        for (let i = 0; i < 9; i++) {
          const slotEl = document.createElement("div");
          slotEl.className = "slot";
          slotEl.dataset.type = "inv";
          slotEl.dataset.index = i;

          slotEl.addEventListener("contextmenu", (e) => e.preventDefault());
          slotEl.addEventListener("mousedown", (e) => handleSlotMouseDown("inv", i, e));
          bindMouseHoverTooltip(slotEl, () => getSlotItem("inv", i), (e) => handleSlotMouseEnter("inv", i, e));
          slotEl.addEventListener("dblclick", (e) => {
            if (isRecentTouchInteraction()) return;
            e.preventDefault();
            e.stopPropagation();
            executeDoubleClickCollect("inv", i);
          });
          bindSlotTouchEvents(slotEl, "inv", i);

          const subNum = document.createElement("span");
          subNum.className = "hotbar-sub-num";
          subNum.textContent = (i + 1).toString();
          slotEl.appendChild(subNum);

          wandHotbarGrid.appendChild(slotEl);
        }
      }
    }

    let lastWandResBannerKey = "";

    function isInventoryOpen() {
      return Boolean(inventoryUI && inventoryUI.style.display !== "none" && inventoryUI.style.display !== "");
    }

    function renderWandCustomizerModal() {
      if (!wandSocketModal || !isWandModalOpen()) return;
      initWandSocketDOM();

      const wand = getCustomizerWandTarget();
      const wd = wand ? ensureWandData(wand) : null;
      const resonance = wand ? getWandResonance(wand) : null;
      const equippedCount = wd ? wd.slots.filter(Boolean).length : 0;
      const gemEquippedCount = wd ? wd.gemSlots.filter(Boolean).length : 0;

      const wandSpellCountBadge = document.getElementById("wandSpellCountBadge");
      const wandGemCountBadge = document.getElementById("wandGemCountBadge");
      const wandGemStatsStrip = document.getElementById("wandGemStatsStrip");

      if (wandSpellCountBadge && wandSpellCountBadge.textContent !== `${equippedCount}/3`) {
        wandSpellCountBadge.textContent = `${equippedCount}/3`;
      }
      if (wandGemCountBadge && wandGemCountBadge.textContent !== `${gemEquippedCount}/3`) {
        wandGemCountBadge.textContent = `${gemEquippedCount}/3`;
      }

      const applyBagSlotVisualState = (slotEl, item, isHotbarSlot, slotIdx) => {
        if (!slotEl) return;
        updateSlotDOM(slotEl, item, slotIdx, false);
        const isRune = Boolean(item && canItemGoInSpellSlot(item));
        const isGem = Boolean(item && canItemGoInGemSlot(item));
        const isTargetWand = Boolean(item && wand && (item === wand || (wand.wandData && item.wandData === wand.wandData)));
        slotEl.classList.toggle("is-spell-rune", isRune);
        slotEl.classList.toggle("is-gem-rune", isGem);
        slotEl.classList.toggle("is-active-wand", isTargetWand);
        slotEl.classList.toggle("is-non-spell", Boolean(item && !isRune && !isGem && !isTargetWand));
        if (isHotbarSlot) {
          slotEl.classList.toggle("active-hotbar", slotIdx === activeHotbarIndex);
        }
      };

      if (wandStorageGrid) {
        for (let i = 9; i < 36; i++) {
          applyBagSlotVisualState(wandStorageGrid.children[i - 9], playerInventory[i], false, i);
        }
      }
      if (wandHotbarGrid) {
        for (let i = 0; i < 9; i++) {
          applyBagSlotVisualState(wandHotbarGrid.children[i], playerInventory[i], true, i);
        }
      }

      const wandGemGrid = document.getElementById("wandGemGrid");
      const gemBonuses = wand ? getWandGemBonuses(wand) : null;
      if (wandGemGrid) {
        for (let idx = 0; idx < 3; idx++) {
          const col = wandGemGrid.children[idx];
          if (!col) continue;
          const slotEl = col.querySelector(".slot");
          const labelEl = col.querySelector(".wand-gem-label") || col.querySelector(".wand-socket-label");
          const gemId = wd ? wd.gemSlots[idx] : null;
          const gemData = gemId ? ITEMS_DATABASE[gemId] : null;
          const gemItem = gemData ? { id: gemData.id, name: gemData.name, quantity: 1, icon: gemData.icon } : null;

          if (slotEl) {
            updateSlotDOM(slotEl, gemItem, idx, false);
            slotEl.classList.toggle("is-resonant", Boolean(gemBonuses && gemBonuses.allSameGemId && gemData));
          }
          col.classList.toggle("is-filled", Boolean(gemData));
          const nextLabel = gemData ? gemData.name : `Ngọc ${idx + 1}`;
          if (labelEl && labelEl.textContent !== nextLabel) {
            labelEl.textContent = nextLabel;
          }
        }
        if (wandGemStatsStrip) {
          let stripText = "";
          if (gemBonuses && gemBonuses.allSameGemId === "gem_fire") {
            stripText = `🔥 Cộng Hưởng 3× Viêm Hỏa (Cháy Lan AoE) • ${gemBonuses.summaryParts.join(" • ")}`;
          } else if (gemBonuses && gemBonuses.allSameGemId === "gem_frost") {
            stripText = `❄️ Cộng Hưởng 3× Băng Sương (Đóng Băng Lan) • ${gemBonuses.summaryParts.join(" • ")}`;
          } else if (gemBonuses && gemBonuses.allSameGemId) {
            stripText = `✦ Cộng Hưởng 3× Ngọc • ${gemBonuses.summaryParts.join(" • ")}`;
          } else if (gemBonuses && gemBonuses.summaryParts.length > 0) {
            stripText = `Ngọc: ${gemBonuses.summaryParts.join(" • ")}`;
          }
          wandGemStatsStrip.style.display = stripText ? "block" : "none";
          if (stripText && wandGemStatsStrip.textContent !== stripText) {
            wandGemStatsStrip.textContent = stripText;
          }
        }
      }

      if (wandResonanceBanner) {
        let bannerKey = "none";
        if (!wand) {
          bannerKey = "no-wand";
        } else if (resonance) {
          bannerKey = `res:${resonance.spellId || resonance.label}`;
        } else {
          const counts = {};
          let nearSpell = null;
          for (const sid of wd.slots) {
            if (!sid) continue;
            counts[sid] = (counts[sid] || 0) + 1;
            if (counts[sid] === 2) nearSpell = SPELLS_DATABASE[sid];
          }
          bannerKey = nearSpell ? `near:${nearSpell.id}` : "none";
          if (bannerKey !== lastWandResBannerKey) {
            lastWandResBannerKey = bannerKey;
            wandResonanceBanner.style.removeProperty("--res-color");
            wandResonanceBanner.style.removeProperty("--res-glow");
            if (nearSpell) {
              wandResonanceBanner.style.display = "flex";
              wandResonanceBanner.className = "wand-resonance-banner is-near";
              wandResonanceBanner.textContent = `✦ 2/3 ${nearSpell.shortName} — thêm 1 viên để Cộng Hưởng`;
            } else {
              wandResonanceBanner.style.display = "none";
              wandResonanceBanner.className = "wand-resonance-banner";
              wandResonanceBanner.textContent = "";
            }
          }
        }
        if (!wand && bannerKey !== lastWandResBannerKey) {
          lastWandResBannerKey = bannerKey;
          wandResonanceBanner.style.display = "flex";
          wandResonanceBanner.style.removeProperty("--res-color");
          wandResonanceBanner.style.removeProperty("--res-glow");
          wandResonanceBanner.className = "wand-resonance-banner";
          wandResonanceBanner.textContent = "Chưa có Đũa Phép trong túi";
        } else if (resonance && bannerKey !== lastWandResBannerKey) {
          lastWandResBannerKey = bannerKey;
          wandResonanceBanner.style.display = "flex";
          wandResonanceBanner.className = "wand-resonance-banner is-active";
          wandResonanceBanner.style.setProperty("--res-color", resonance.color);
          wandResonanceBanner.style.setProperty("--res-glow", resonance.glow);
          wandResonanceBanner.textContent = resonance.label;
        }
      }

      if (wandSocketGrid) {
        const keyLabels = isMobileMode() ? ["1", "2", "3"] : ["Z", "X", "C"];
        for (let idx = 0; idx < 3; idx++) {
          const col = wandSocketGrid.children[idx];
          if (!col) continue;
          const slotEl = col.querySelector(".wand-socket-slot");
          const keyEl = col.querySelector(".wand-socket-key");
          const labelEl = col.querySelector(".wand-socket-label");
          const spellId = wd ? wd.slots[idx] : null;
          const sp = spellId ? SPELLS_DATABASE[spellId] : null;
          const spellItem = sp ? { id: sp.id, name: sp.name, quantity: 1, icon: sp.icon } : null;

          if (keyEl && keyEl.textContent !== keyLabels[idx]) keyEl.textContent = keyLabels[idx];
          if (slotEl) {
            updateSlotDOM(slotEl, spellItem, idx, false);
            slotEl.classList.toggle("is-resonant", Boolean(resonance && sp));
            if (sp) {
              slotEl.style.setProperty("--spell-color", sp.color || "#c084fc");
            } else {
              slotEl.style.removeProperty("--spell-color");
            }
            if (resonance) {
              slotEl.style.setProperty("--res-color", resonance.color);
            } else {
              slotEl.style.removeProperty("--res-color");
            }
          }
          col.classList.toggle("is-filled", Boolean(sp));
          const nextLabel = sp ? sp.shortName : "Trống";
          if (labelEl && labelEl.textContent !== nextLabel) {
            labelEl.textContent = nextLabel;
          }
        }
      }
    }

    function openWandCustomizer(forceState = null, wandRef = null) {
      if (!wandSocketModal) return;
      const isCurrentlyOpen = isWandModalOpen();
      const nextOpen = (forceState !== null) ? Boolean(forceState) : !isCurrentlyOpen;

      if (nextOpen) {
        const wand = wandRef || findAnyWandInInventory();
        if (!wand) {
          addFloatingText("🪄 Cần có Đũa Phép để khảm chiêu!", player.x - 24, player.y - 16, "#f87171");
          return;
        }
        customizerTargetWand = wand;
        ensureWandData(wand);

        keys.up = false; keys.down = false; keys.left = false; keys.right = false;
        isKeyActionHeld = false;
        isMouseActionHeld = false;
        isMobileActionHeld = false;
        isActionKeyHeld = false;
        pendingQuickBowShot = false;
        if (window.resetMobileJoystick) window.resetMobileJoystick();
        if (player.action !== 'die' && player.action !== 'attack') {
          player.action = 'idle';
        }
        hideItemTooltip();

        lastWandResBannerKey = "";
        wandSocketModal.style.display = "flex";
        isPaused = true;
        needsCanvasRedraw = true;
        isHoveringWandAltar = false;
        if (canvas) canvas.style.cursor = "";
        renderWandCustomizerModal();
      } else {
        cancelActiveTouchInvState(true);
        wandSocketModal.style.display = "none";
        hideItemTooltip();
        const invOpen = isInventoryOpen();
        if (!invOpen) {
          if (cursorItem && cursorItem.quantity > 0) {
            pickupItem(cursorItem);
            cursorItem = null;
            updateCursorUI();
          }
          isPaused = false;
          needsCanvasRedraw = true;
        }
      }
      if (window.onMobileHudSync) window.onMobileHudSync();
    }
    window.openWandCustomizer = openWandCustomizer;

    if (btnCloseWandModal) {
      btnCloseWandModal.addEventListener("click", (e) => {
        e.stopPropagation();
        openWandCustomizer(false);
      });
    }
    if (wandSocketModal) {
      wandSocketModal.addEventListener("keydown", (e) => e.stopPropagation());
      wandSocketModal.addEventListener("keyup", (e) => e.stopPropagation());
      wandSocketModal.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    // Render kho đồ chính (9 đến 35 = 27 ô) và hotbar phụ bên trong túi đồ (0 đến 8 = 9 ô)
    function renderStorage() {
      if (!isInventoryOpen()) return;
      initInventoryDOM();
      if (storageGrid) {
        for (let i = 9; i < 36; i++) {
          if (storageGrid.children[i - 9]) {
            updateSlotDOM(storageGrid.children[i - 9], playerInventory[i], i, false);
          }
        }
      }
      if (hotbarInvGrid) {
        for (let i = 0; i < 9; i++) {
          if (hotbarInvGrid.children[i]) {
            updateSlotDOM(hotbarInvGrid.children[i], playerInventory[i], i, false);
            if (i === activeHotbarIndex) {
              hotbarInvGrid.children[i].classList.add("active-hotbar");
            } else {
              hotbarInvGrid.children[i].classList.remove("active-hotbar");
            }
          }
        }
      }
    }

    function renderEquipmentSlots() {
      for (let eq = 0; eq < 4; eq++) {
        const slotEl = document.getElementById("equipSlot" + eq);
        if (slotEl) {
          updateSlotDOM(slotEl, playerEquipment[eq], eq, false);
          const wm = slotEl.querySelector(".equip-watermark");
          if (wm) {
            wm.style.display = (playerEquipment[eq]) ? "none" : "block";
          }
        }
      }
    }

    let paperdollFxTimer = null;

    function triggerPaperdollEquipFx(equippedItem = null) {
      const box = document.getElementById("paperdollPreviewBox");
      if (!box) return;

      const data = equippedItem ? (getItemData(equippedItem) || equippedItem) : null;
      const rarityColors = {
        common: "#94a3b8",
        uncommon: "#4ade80",
        rare: "#38bdf8",
        epic: "#c084fc",
        legendary: "#fbbf24"
      };
      const glowColor = (data && data.rarity && rarityColors[data.rarity])
        ? rarityColors[data.rarity]
        : "#38bdf8";
      box.style.setProperty("--equip-glow", glowColor);

      box.classList.remove("equip-flash");
      void box.offsetWidth; // Force reflow để lặp lại animation tức thì khi đổi nhiều món liên tiếp
      box.classList.add("equip-flash");

      const sparklesEl = document.getElementById("paperdollSparkles");
      if (sparklesEl) {
        sparklesEl.innerHTML = "";
        if (equippedItem) {
          const spots = [
            { x: "14%", y: "14%", delay: 0, glyph: "✦" },
            { x: "75%", y: "12%", delay: 55, glyph: "✧" },
            { x: "12%", y: "56%", delay: 110, glyph: "✧" },
            { x: "78%", y: "52%", delay: 145, glyph: "✦" },
            { x: "45%", y: "7%",  delay: 180, glyph: "✦" }
          ];
          spots.forEach((s) => {
            const star = document.createElement("span");
            star.className = "paperdoll-sparkle";
            star.textContent = s.glyph;
            star.style.left = s.x;
            star.style.top = s.y;
            star.style.animationDelay = s.delay + "ms";
            sparklesEl.appendChild(star);
          });
        }
      }

      if (paperdollFxTimer) clearTimeout(paperdollFxTimer);
      paperdollFxTimer = setTimeout(() => {
        box.classList.remove("equip-flash");
        if (sparklesEl) sparklesEl.innerHTML = "";
      }, 650);
    }

    // Vẽ hình nhân vật xem trước (Paperdoll) trong phím E
    function renderPaperdoll() {
      const pCanvas = document.getElementById("paperdollCanvas");
      if (!pCanvas) return;
      const pctx = pCanvas.getContext("2d");
      pctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      pctx.imageSmoothingEnabled = false;

      const pSprite = getEquippedPlayerSprite();
      if (pSprite && (pSprite.naturalWidth > 0 || pSprite.width > 0)) {
        const sw = pSprite.naturalWidth || pSprite.width;
        const sh = pSprite.naturalHeight || pSprite.height;
        const fw = sw / 6;
        const fh = sh / 10;
        pctx.drawImage(pSprite, 0, 0, fw, fh, 0, 0, 48, 48);
        drawHelmetOverlay(pctx, 0, 0, 'down', 0, 'idle');
      } else {
        pctx.fillStyle = "#38bdf8";
        pctx.fillRect(16, 16, 16, 24);
      }
    }

    // Bảng màu lấy chuẩn từ sprite nguyên tác trong assets/items/armor_equipment/
    const ARMOR_SWAP_PALETTES = {
      leather: {
        out: [27, 31, 33],
        deep: [82, 51, 63],
        dark: [125, 56, 51],
        main: [171, 81, 48],
        light: [189, 106, 98],
        trim: [245, 198, 134],
        spec: [255, 232, 190],
        gem: [245, 198, 134]
      },
      iron: {
        out: [20, 24, 46],
        deep: [44, 53, 77],
        dark: [64, 73, 115],
        main: [104, 111, 153],
        light: [163, 167, 194],
        trim: [223, 224, 232],
        spec: [245, 255, 232],
        gem: [245, 255, 232]
      },
      gold: {
        out: [59, 32, 39],
        deep: [125, 56, 51],
        dark: [171, 81, 48],
        main: [207, 117, 43],
        light: [240, 181, 65],
        trim: [255, 238, 131],
        spec: [245, 255, 232],
        gem: [217, 27, 76]
      },
      diamond: {
        out: [20, 24, 46],
        deep: [44, 53, 77],
        dark: [58, 63, 94],
        main: [76, 104, 133],
        light: [79, 164, 184],
        trim: [146, 232, 192],
        spec: [245, 255, 232],
        gem: [146, 232, 192]
      }
    };

    // Mẫu pixel-art cho từng loại nón theo 3 hướng (down / side / up), bám sát sprite nón nguyên tác & khớp 100% khung đầu
    const HELMET_PIXEL_TEMPLATES = {
      leather: {
        oy: 0,
        clearDy: 5,
        down: [
          '...#######...',
          '..#LLMMMMM#..',
          '.#LLMMMMMMMD#',
          '.#LMMMMMMMDD#',
          '#LMMDDDDDMMD#',
          '#MMDTTTTTDMM#',
          '#MD#.....#DM#',
          '#MT#.....#TM#',
          '#D#.......#D#',
          '.#T#.....#T#.',
          '.###.....###.'
        ],
        side: [
          '...########....',
          '..#LLMMMMML#...',
          '.#LLMMMMMMMD#..',
          '.#LMMMMMMMMDD#.',
          '#LMMMDDDDDTTTD#',
          '#MMMMDDDD#TTTT#',
          '#MMMMDDD#......',
          '#MMMDDDD#......',
          '#MMDDDD#.......',
          '#MDDDD#........',
          '.#####.........'
        ],
        up: [
          '...#######...',
          '..#LLMMMMM#..',
          '.#LLMMMMMMMD#',
          '.#LMMMMMMMDD#',
          '#LMMMDDDDMMD#',
          '#MMMMDDDDMMD#',
          '#MMMMDDDDMMD#',
          '#MMMDDDDDMMD#',
          '#MMMDDDDDMMD#',
          '.#TTTTTTTTT#.',
          '.###########.'
        ]
      },
      iron: {
        oy: 0,
        clearDy: 5,
        down: [
          '...#######...',
          '..#SSLLMMM#..',
          '.#SSLLMMMMMD#',
          '.#LLMMMMMMMD#',
          '#LMMMDDDDDMD#',
          '#DDD#DDD#DDD#',
          '#DD#..M..#DD#',
          '#MD#..D..#DM#',
          '#D#.......#D#',
          '.#D#.....#D#.',
          '.###.....###.'
        ],
        side: [
          '...########....',
          '..#SSLLMMMM#...',
          '.#SSLLMMMMMD#..',
          '.#LLMMMMMMMD#..',
          '#LMMMDDDDDDMM#.',
          '#DDDDDDDD#DDDD#',
          '#MMMMDDD#......',
          '#MMMDDDD#......',
          '#MMDDDD#.......',
          '#DDDDD#........',
          '.#####.........'
        ],
        up: [
          '...#######...',
          '..#SSLLMMM#..',
          '.#SSLLMMMMMD#',
          '.#LLMMMMMMMD#',
          '#LMMMMDDMMMD#',
          '#MMMMMLLMMMD#',
          '#MMMMMLLMMMD#',
          '#DDDDDLLDDDD#',
          '#DDDDDDDDDDD#',
          '.#MMMMMMMMM#.',
          '.###########.'
        ]
      },
      gold: {
        oy: -3,
        clearDy: 2,
        down: [
          '.....###.....',
          '..##.#S#.##..',
          '.#L#.#L#.#L#.',
          '#LMML#R#LMML#',
          '#SSLLMMLLMMD#',
          '#DRDMDMDMDRD#',
          '.###########.'
        ],
        side: [
          '.....###.......',
          '..##.#S#.##....',
          '.#L#.#L#.#L#...',
          '#LMML#R#LMML#..',
          '#SSLLMMLLMMMD#.',
          '#DRDMDMDMDRMD#.',
          '.############..'
        ],
        up: [
          '.....###.....',
          '..##.#S#.##..',
          '.#L#.#L#.#L#.',
          '#LMML#R#LMML#',
          '#SSLLMMLLMMD#',
          '#DRDMDMDMDRD#',
          '.###########.'
        ]
      },
      diamond: {
        oy: 0,
        clearDy: 5,
        down: [
          '...#######...',
          '..#SSLLLCC#..',
          '.#SSLLLCCCCC#',
          '.#LLCCCCCDDD#',
          '#CC#DDDDD#CC#',
          '#DD#CCDCC#DD#',
          '#DC#.....#CD#',
          '#C#.......#C#',
          '#D#.......#D#',
          '.#D#.....#D#.',
          '.#C#.....#C#.',
          '..##.....##..'
        ],
        side: [
          '...########....',
          '..#SSLLLCCC#...',
          '.#SSLLLCCCCC#..',
          '.#LLCCCCCCDDD#.',
          '#CC#DDDDD#CCCC#',
          '#DDDDDDDD#DDDD#',
          '#CCCDDDD#......',
          '#CCDDDDD#......',
          '#CCDDDD#.......',
          '#DDDDD#........',
          '.#####.........'
        ],
        up: [
          '...#######...',
          '..#SSLLLCC#..',
          '.#SSLLLCCCCC#',
          '.#LLCCCCCDDD#',
          '#DDDDDCCDDDD#',
          '#DDDDDSSDDDD#',
          '#DDDDDCCDDDD#',
          '#CCCCCSSCCCC#',
          '#DDDDDDDDDDD#',
          '.#CCCCCCCCC#.',
          '.###########.'
        ]
      }
    };

    let cachedEquippedPlayerCanvas = null;
    let cachedEquipKey = '';

    function getArmorTier(item) {
      if (!item) return null;
      const id = (getItemData(item) || item).id || '';
      if (id.includes('diamond')) return 'diamond';
      if (id.includes('gold')) return 'gold';
      if (id.includes('iron')) return 'iron';
      if (id.includes('leather')) return 'leather';
      return null;
    }

    function invalidateEquippedPlayerCache() {
      cachedEquippedPlayerCanvas = null;
      cachedEquipKey = '';
    }

    // Tạo sprite sheet nhân vật mặc giáp hoàn chỉnh (khớp từng pixel trên mọi frame, không lem mặt/vũ khí)
    function getEquippedPlayerSprite() {
      if (!images.player || !images.player.complete || images.player.naturalWidth === 0) {
        return images.player;
      }

      const hTier = getArmorTier(playerEquipment[0]);
      const cTier = getArmorTier(playerEquipment[1]);
      const lTier = getArmorTier(playerEquipment[2]);
      const bTier = getArmorTier(playerEquipment[3]);

      if (!hTier && !cTier && !lTier && !bTier) {
        return images.player;
      }

      const key = `${hTier || ''}|${cTier || ''}|${lTier || ''}|${bTier || ''}`;
      if (cachedEquippedPlayerCanvas && cachedEquipKey === key) {
        return cachedEquippedPlayerCanvas;
      }

      const w = images.player.naturalWidth;
      const h = images.player.naturalHeight;
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      octx.drawImage(images.player, 0, 0);

      const imgData = octx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const hPal = hTier ? ARMOR_SWAP_PALETTES[hTier] : null;
      const cPal = cTier ? ARMOR_SWAP_PALETTES[cTier] : null;
      const lPal = lTier ? ARMOR_SWAP_PALETTES[lTier] : null;
      const bPal = bTier ? ARMOR_SWAP_PALETTES[bTier] : null;

      const setPx = (px, py, col) => {
        if (px < 0 || px >= w || py < 0 || py >= h || !col) return;
        const idx = (py * w + px) * 4;
        data[idx] = col[0];
        data[idx + 1] = col[1];
        data[idx + 2] = col[2];
        data[idx + 3] = 255;
      };

      const clearPx = (px, py) => {
        if (px < 0 || px >= w || py < 0 || py >= h) return;
        const idx = (py * w + px) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      };

      const isSameRGB = (r, g, b, tr, tg, tb) => r === tr && g === tg && b === tb;
      const isSkinOrEye = (r, g, b) =>
        isSameRGB(r, g, b, 193, 172, 143) ||
        isSameRGB(r, g, b, 172, 123, 93) ||
        isSameRGB(r, g, b, 33, 17, 13);

      const ROW_DIRS = ['down', 'side', 'up', 'down', 'side', 'up', 'down', 'side', 'up', 'die'];

      for (let row = 0; row < 10; row++) {
        const dir = ROW_DIRS[row];
        for (let col = 0; col < 6; col++) {
          const ox = col * 48;
          const oy = row * 48;

          let pantsMinY = 99, pantsMaxY = -1, pantsSumX = 0, pantsCount = 0;
          let eyeMinX = 99, eyeMaxX = -1, eyeMinY = 99, eyeCount = 0;
          let shirtAllMinY = 99, shirtAllMaxY = -1, shirtSumX = 0, shirtAllCount = 0;
          let headTopY = 99;
          let opaqueCount = 0;

          for (let fy = 0; fy < 48; fy++) {
            let solidInRow = 0;
            for (let fx = 0; fx < 48; fx++) {
              const i = ((oy + fy) * w + (ox + fx)) * 4;
              if (data[i + 3] < 200) continue; // Bỏ qua bóng/vệt kiếm bán trong suốt (alpha=128)
              opaqueCount++;
              solidInRow++;
              const r = data[i], g = data[i + 1], b = data[i + 2];
              if (isSameRGB(r, g, b, 44, 101, 181) || isSameRGB(r, g, b, 29, 67, 138)) {
                if (fy < pantsMinY) pantsMinY = fy;
                if (fy > pantsMaxY) pantsMaxY = fy;
                pantsSumX += fx;
                pantsCount++;
              } else if (isSameRGB(r, g, b, 33, 17, 13)) {
                if (fx < eyeMinX) eyeMinX = fx;
                if (fx > eyeMaxX) eyeMaxX = fx;
                if (fy < eyeMinY) eyeMinY = fy;
                eyeCount++;
              } else if (isSameRGB(r, g, b, 120, 126, 151) || isSameRGB(r, g, b, 164, 168, 181)) {
                if (fy < shirtAllMinY) shirtAllMinY = fy;
                if (fy > shirtAllMaxY) shirtAllMaxY = fy;
                shirtSumX += fx;
                shirtAllCount++;
              }
            }
            if (solidInRow >= 2 && fy < headTopY) {
              headTopY = fy;
            }
          }

          if (opaqueCount === 0) continue; // Ô trống hoàn toàn trong sprite sheet
          const bodyCx = pantsCount > 0
            ? Math.round(pantsSumX / pantsCount)
            : (eyeCount > 0 ? Math.round((eyeMinX + eyeMaxX) / 2) : (shirtAllCount > 0 ? Math.round(shirtSumX / shirtAllCount) : 24));
          const effectivePantsMinY = pantsCount > 0 ? pantsMinY : (shirtAllMaxY > -1 ? shirtAllMaxY + 1 : 39);
          const effectivePantsMaxY = pantsCount > 0 ? pantsMaxY : effectivePantsMinY;

          // Tìm vùng áo lót trong thân (bỏ qua lưỡi kiếm ở ngoài thân khi tấn công)
          let shirtMinY = 99, shirtMaxY = -1;
          for (let fy = Math.max(0, effectivePantsMinY - 7); fy <= effectivePantsMinY; fy++) {
            for (let fx = Math.max(0, bodyCx - 4); fx <= Math.min(47, bodyCx + 4); fx++) {
              const i = ((oy + fy) * w + (ox + fx)) * 4;
              if (data[i + 3] < 200) continue;
              const r = data[i], g = data[i + 1], b = data[i + 2];
              if (isSameRGB(r, g, b, 120, 126, 151) || isSameRGB(r, g, b, 164, 168, 181)) {
                if (fy < shirtMinY) shirtMinY = fy;
                if (fy > shirtMaxY) shirtMaxY = fy;
              }
            }
          }

          // 1. ÁO GIÁP THÂN (Chestplate): tạo khối vai (pauldrons), giáp ngực sáng & đai lưng (tuyệt đối không chạm da mặt/tay!)
          if (cPal && row !== 9) {
            const torsoTopY = (dir !== 'up' && shirtMinY < 99) ? Math.max(20, shirtMinY - 1) : Math.max(20, effectivePantsMinY - 4);
            const torsoBotY = (dir === 'up') ? effectivePantsMinY - 1 : effectivePantsMinY;
            const halfSpan = 4;

            for (let fy = torsoTopY; fy <= torsoBotY; fy++) {
              for (let fx = Math.max(0, bodyCx - halfSpan); fx <= Math.min(47, bodyCx + halfSpan); fx++) {
                const i = ((oy + fy) * w + (ox + fx)) * 4;
                if (data[i + 3] < 200) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (isSkinOrEye(r, g, b)) continue;

                const isUndershirtLight = isSameRGB(r, g, b, 164, 168, 181);
                const isUndershirtDark = isSameRGB(r, g, b, 120, 126, 151);
                const isJacketLight = isSameRGB(r, g, b, 87, 58, 35);
                const isJacketDark = isSameRGB(r, g, b, 64, 39, 23);

                if (!isUndershirtLight && !isUndershirtDark && !isJacketLight && !isJacketDark) {
                  if (isSameRGB(r, g, b, 0, 0, 0) && fy <= torsoTopY + 1) {
                    setPx(ox + fx, oy + fy, cPal.out);
                  }
                  continue;
                }

                const dxAbs = Math.abs(fx - bodyCx);
                const isWaistRow = (fy === torsoBotY || fy === effectivePantsMinY - 1);

                if (isWaistRow) {
                  if (dxAbs <= (dir === 'side' ? 0 : 1) && fx === bodyCx) {
                    setPx(ox + fx, oy + fy, cPal.trim);
                  } else {
                    setPx(ox + fx, oy + fy, cPal.deep);
                  }
                } else if (dxAbs >= 3 && fy <= torsoTopY + 1) {
                  setPx(ox + fx, oy + fy, (fy === torsoTopY) ? cPal.trim : cPal.light);
                } else if (isUndershirtLight || (dxAbs === 0 && fy === torsoTopY + 1 && dir === 'down')) {
                  setPx(ox + fx, oy + fy, (cTier === 'gold' || cTier === 'diamond') ? cPal.gem : cPal.spec);
                } else if (isUndershirtDark || fy === torsoTopY) {
                  setPx(ox + fx, oy + fy, cPal.light);
                } else if (isJacketLight) {
                  setPx(ox + fx, oy + fy, (dxAbs <= 1 && fy <= torsoTopY + 2) ? cPal.light : cPal.main);
                } else {
                  setPx(ox + fx, oy + fy, cPal.dark);
                }
              }
            }
          }

          // 2. QUẦN GIÁP (Leggings): tạo khối giáp đùi / đầu gối thay vì tô bẹt màu
          if (lPal && pantsCount > 0) {
            for (let fy = pantsMinY; fy <= pantsMaxY; fy++) {
              for (let fx = 0; fx < 48; fx++) {
                const i = ((oy + fy) * w + (ox + fx)) * 4;
                if (data[i + 3] < 200) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (isSameRGB(r, g, b, 44, 101, 181)) {
                  const isKneeHighlight = (fy === pantsMinY + 1 && Math.abs(fx - bodyCx) >= 1);
                  setPx(ox + fx, oy + fy, isKneeHighlight ? lPal.light : lPal.main);
                } else if (isSameRGB(r, g, b, 29, 67, 138)) {
                  setPx(ox + fx, oy + fy, lPal.dark);
                }
              }
            }
          }

          // 3. GIÀY GIÁP (Boots / Sabatons): tách cổ giày sáng + mũi giày giáp + đế tối
          if (bPal) {
            const bootStartY = Math.max(38, effectivePantsMaxY);
            for (let fy = bootStartY; fy < 48; fy++) {
              for (let fx = 0; fx < 48; fx++) {
                const i = ((oy + fy) * w + (ox + fx)) * 4;
                if (data[i + 3] < 200) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (isSameRGB(r, g, b, 87, 58, 35)) {
                  setPx(ox + fx, oy + fy, (fy === bootStartY) ? bPal.light : bPal.main);
                } else if (isSameRGB(r, g, b, 64, 39, 23)) {
                  setPx(ox + fx, oy + fy, bPal.dark);
                }
              }
            }
          }

          // 4. NÓN / MŨ / VƯƠNG MIỆN PIXEL-ART (neo chính xác theo cụm tóc trên đầu, không lệch bởi tia kiếm & không mất pixel)
          if (hPal && HELMET_PIXEL_TEMPLATES[hTier] && (row !== 9 || col < 2)) {
            const tpl = HELMET_PIXEL_TEMPLATES[hTier];
            const viewKey = (dir === 'up') ? 'up' : ((dir === 'side' || dir === 'die') ? 'side' : 'down');
            const rows = tpl[viewKey];

            // Đo tọa độ đầu trực tiếp từ các pixel tóc (87,58,35) & (64,39,23) để miễn nhiễm hoàn toàn với hiệu ứng chém kiếm
            let hairMinX = 99, hairMaxX = -1, hairMinY = 99;
            for (let fy = 16; fy <= 37; fy++) {
              for (let fx = 8; fx <= 39; fx++) {
                const i = ((oy + fy) * w + (ox + fx)) * 4;
                if (data[i + 3] < 200) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (isSameRGB(r, g, b, 87, 58, 35) || isSameRGB(r, g, b, 64, 39, 23)) {
                  if (fy < hairMinY) hairMinY = fy;
                  if (fy <= hairMinY + 5) {
                    if (fx < hairMinX) hairMinX = fx;
                    if (fx > hairMaxX) hairMaxX = fx;
                  }
                }
              }
            }

            let hx = bodyCx - 6;
            let hy = headTopY;
            let headSpanW = rows[0] ? rows[0].length : 13;
            if (hairMinY < 99 && hairMaxX >= hairMinX) {
              hx = hairMinX - 1;
              hy = hairMinY - 1;
              headSpanW = Math.max(headSpanW, hairMaxX - hairMinX + 3);
            }

            // Dọn gọn phần chỏm tóc phía trên trong đúng vùng đầu để không lởm chởm hoặc sót viền đen thừa
            const clearEndDy = tpl.clearDy ?? 5;
            const tplWidth = rows[0] ? rows[0].length : headSpanW;
            const clearSpan = Math.max(headSpanW, tplWidth);
            for (let cy = hy - 1; cy <= hy + clearEndDy; cy++) {
              if (cy < 0 || cy >= 48) continue;
              for (let cx = hx; cx < hx + clearSpan; cx++) {
                if (cx < 0 || cx >= 48) continue;
                const i = ((oy + cy) * w + (ox + cx)) * 4;
                if (data[i + 3] < 200) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (isSkinOrEye(r, g, b)) continue;
                if (
                  isSameRGB(r, g, b, 87, 58, 35) ||
                  isSameRGB(r, g, b, 64, 39, 23) ||
                  isSameRGB(r, g, b, 0, 0, 0)
                ) {
                  clearPx(ox + cx, oy + cy);
                }
              }
            }

            // Đắp từng pixel của mẫu nón chuẩn nguyên tác lên đầu nhân vật (bảo toàn 100% mắt/da mặt)
            const startY = hy + (tpl.oy || 0);
            for (let ty = 0; ty < rows.length; ty++) {
              const line = rows[ty];
              const py = startY + ty;
              if (py < 0 || py >= 48) continue;
              for (let tx = 0; tx < line.length; tx++) {
                const ch = line[tx];
                if (ch === '.') continue;
                const px = hx + tx;
                if (px < 0 || px >= 48) continue;

                const curIdx = ((oy + py) * w + (ox + px)) * 4;
                if (data[curIdx + 3] >= 200 && isSameRGB(data[curIdx], data[curIdx + 1], data[curIdx + 2], 33, 17, 13)) {
                  continue;
                }

                let colRgb = null;
                if (ch === '#') colRgb = hPal.out;
                else if (ch === 'S') colRgb = hPal.spec;
                else if (ch === 'L') colRgb = hPal.light;
                else if (ch === 'M') colRgb = hPal.main;
                else if (ch === 'D') colRgb = hPal.dark;
                else if (ch === 'T') colRgb = hPal.trim;
                else if (ch === 'C') colRgb = hPal.light;
                else if (ch === 'R') colRgb = hPal.gem;

                if (colRgb) {
                  setPx(ox + px, oy + py, colRgb);
                }
              }
            }
          }
        }
      }

      octx.putImageData(imgData, 0, 0);
      cachedEquippedPlayerCanvas = off;
      cachedEquipKey = key;
      return off;
    }

    // Giữ hàm tương thích để không gãy call-site; toàn bộ nón đã được kết xuất pixel-perfect vào sprite sheet
    function drawHelmetOverlay() {}

    // Lấy hình ảnh Image object của món giáp
    function getArmorImage(item) {
      if (!item) return null;
      const itData = getItemData(item) || item;
      const id = itData.id || "";
      if (id.includes("leather")) {
        if (id.includes("helmet")) return images.helmet_leather;
        if (id.includes("chest")) return images.chest_leather;
        if (id.includes("legs")) return images.legs_leather;
        if (id.includes("boots")) return images.boots_leather;
      }
      if (id.includes("iron")) {
        if (id.includes("helmet")) return images.helmet_iron;
        if (id.includes("chest")) return images.chest_iron;
        if (id.includes("legs")) return images.legs_iron;
        if (id.includes("boots")) return images.boots_iron;
      }
      if (id.includes("gold")) {
        if (id.includes("helmet")) return images.helmet_gold;
        if (id.includes("chest")) return images.chest_gold;
        if (id.includes("legs")) return images.legs_gold;
        if (id.includes("boots")) return images.boots_gold;
      }
      if (id.includes("diamond")) {
        if (id.includes("helmet")) return images.helmet_diamond;
        if (id.includes("chest")) return images.chest_diamond;
        if (id.includes("legs")) return images.legs_diamond;
        if (id.includes("boots")) return images.boots_diamond;
      }
      return null;
    }

    // Render lưới chế tạo cá nhân (2x2) hoặc bàn chế tạo (3x3) tùy chế độ
    function renderCrafting() {
      initInventoryDOM();
      if (currentUIMode === 'pocket') {
        updatePocketCraftingResult();
        if (pocketCraftingGrid) {
          for (let c = 0; c < 4; c++) {
            if (pocketCraftingGrid.children[c]) {
              updateSlotDOM(pocketCraftingGrid.children[c], pocketCraftingInventory[c], c, false);
            }
          }
        }
      } else {
        updateWorkstationCraftingResult();
        if (workstationCraftingGrid) {
          for (let c = 0; c < 9; c++) {
            if (workstationCraftingGrid.children[c]) {
              updateSlotDOM(workstationCraftingGrid.children[c], workstationCraftingInventory[c], c, false);
            }
          }
        }
      }
    }

    // Render 2 ô và ô kết quả Lò Rèn Nâng Cấp
    // Bảng định nghĩa thứ tự nâng cấp 2 món cùng loại và tỉ lệ thành công
    const FORGE_UPGRADE_MAP = {
      // Kiếm (Swords)
      "wood_sword": { nextId: "stone_sword", nextName: "Kiếm Đá", rate: 1.00, dur: 85 },
      "stone_sword": { nextId: "iron_sword", nextName: "Kiếm Sắt", rate: 0.75, dur: 160 },
      "iron_sword": { nextId: "gold_sword", nextName: "Kiếm Vàng", rate: 0.55, dur: 95 },
      "gold_sword": { nextId: "diamond_sword", nextName: "Kiếm Kim Cương", rate: 0.35, dur: 350 },

      // Rìu (Axes)
      "wood_axe": { nextId: "stone_axe", nextName: "Rìu Đá", rate: 1.00, dur: 90 },
      "stone_axe": { nextId: "iron_axe", nextName: "Rìu Sắt", rate: 0.75, dur: 160 },
      "iron_axe": { nextId: "gold_axe", nextName: "Rìu Vàng", rate: 0.55, dur: 95 },
      "gold_axe": { nextId: "diamond_axe", nextName: "Rìu Kim Cương", rate: 0.35, dur: 350 },

      // Cúp (Pickaxes)
      "wood_pickaxe": { nextId: "stone_pickaxe", nextName: "Cúp Đá", rate: 1.00, dur: 90 },
      "wooden_pickaxe": { nextId: "stone_pickaxe", nextName: "Cúp Đá", rate: 1.00, dur: 90 },
      "stone_pickaxe": { nextId: "iron_pickaxe", nextName: "Cúp Sắt", rate: 0.75, dur: 160 },
      "iron_pickaxe": { nextId: "gold_pickaxe", nextName: "Cúp Vàng", rate: 0.55, dur: 95 },
      "gold_pickaxe": { nextId: "diamond_pickaxe", nextName: "Cúp Kim Cương", rate: 0.35, dur: 350 }
    };

    let currentForgeRate = 0;

    function renderForge() {
      const fItemEl = document.getElementById("forgeSlotItem");
      const fMatEl = document.getElementById("forgeSlotMaterial");
      const fResEl = document.getElementById("forgeResultSlot");
      const fRateBadge = document.getElementById("forgeRateBadge");

      if (fItemEl) updateSlotDOM(fItemEl, forgeInventory[0], 0, false);
      if (fMatEl) updateSlotDOM(fMatEl, forgeInventory[1], 1, false);

      const itemA = forgeInventory[0];
      const itemB = forgeInventory[1];
      forgeResultItem = null;
      currentForgeRate = 0;

      // Kiểm tra 2 ô lò rèn: BẮT BUỘC ĐẶT 2 VŨ KHÍ CÙNG LOẠI VÀ CÙNG CẤP
      if (itemA && itemB && itemA.quantity > 0 && itemB.quantity > 0) {
        const idA = itemA.id || "";
        const idB = itemB.id || "";

        // Cho phép wood_pickaxe và wooden_pickaxe tương đương
        const normalizedA = idA === "wooden_pickaxe" ? "wood_pickaxe" : idA;
        const normalizedB = idB === "wooden_pickaxe" ? "wood_pickaxe" : idB;

        if (normalizedA === normalizedB && FORGE_UPGRADE_MAP[normalizedA]) {
          const cfg = FORGE_UPGRADE_MAP[normalizedA];
          currentForgeRate = cfg.rate;
          forgeResultItem = {
            id: cfg.nextId,
            name: cfg.nextName,
            quantity: 1,
            durability: cfg.dur,
            maxDurability: cfg.dur
          };
        }
      }

      // Cập nhật nhãn tỉ lệ thành công
      if (fRateBadge) {
        if (forgeResultItem) {
          const pct = Math.round(currentForgeRate * 100);
          const color = pct >= 80 ? "#4ade80" : (pct >= 50 ? "#facc15" : "#f87171");
          fRateBadge.textContent = "Tỉ lệ thành công: " + pct + "%";
          fRateBadge.style.color = color;
        } else {
          fRateBadge.textContent = "Tỉ lệ thành công: --";
          fRateBadge.style.color = "#94a3b8";
        }
      }

      renderResultSlotDOM(fResEl, forgeResultItem);
    }

    // Sự kiện click ô kết quả lò rèn: Xử lý tỉ lệ thành công / thất bại
    // -------------------------------------------------------------
    // LOGIC NÂNG CẤP LÒ RÈN: BẤM NÚT -> HIỆU ỨNG RÈN -> KẾT QUẢ TRỰC TIẾP -> TỰ ĐỘNG CỘNG VÀO TÚI
    // -------------------------------------------------------------
    const btnExecuteForge = document.getElementById("btnExecuteForge");
    const forgeResultBanner = document.getElementById("forgeResultBanner");

    function showForgeBanner(text, isSuccess) {
      if (!forgeResultBanner) return;
      forgeResultBanner.textContent = text;
      forgeResultBanner.style.display = "block";
      if (isSuccess) {
        forgeResultBanner.style.background = "rgba(34, 197, 94, 0.25)";
        forgeResultBanner.style.border = "1.5px solid #22c55e";
        forgeResultBanner.style.color = "#4ade80";
        forgeResultBanner.style.boxShadow = "0 0 10px rgba(34, 197, 94, 0.4)";
      } else {
        forgeResultBanner.style.background = "rgba(239, 68, 68, 0.25)";
        forgeResultBanner.style.border = "1.5px solid #ef4444";
        forgeResultBanner.style.color = "#f87171";
        forgeResultBanner.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.4)";
      }
      setTimeout(() => {
        if (forgeResultBanner) forgeResultBanner.style.display = "none";
      }, 3500);
    }

    if (btnExecuteForge) {
      btnExecuteForge.addEventListener("click", () => {
        if (!forgeResultItem) return;

        // Bắt đầu hiệu ứng rèn: rung màn hình nhẹ và âm thanh búa đập đe
        playImpactSound(true);
        spawnHitSparks(player.x + 8, player.y + 8, -Math.PI / 2);
        triggerHitJuice(4, 50);

        // Quay số tỉ lệ thành công ngẫu nhiên
        const isSuccess = Math.random() <= currentForgeRate;

        if (isSuccess) {
          const product = rollWeaponInstance({ ...forgeResultItem });

          // Tiêu hao cả 2 món vũ khí cũ
          forgeInventory[0] = null;
          forgeInventory[1] = null;

          // TỰ ĐỘNG CỘNG TRỰC TIẾP VÀO 1 Ô TRONG TÚI ĐỒ (Nếu đầy tự rớt xuống đất)
          pickupItem(product);

          showForgeBanner("✨ NÂNG CẤP THÀNH CÔNG! ĐÃ NHẬN " + product.name.toUpperCase(), true);
          playImpactSound(true);
        } else {
          // THẤT BẠI: Tiêu hao 1 món vũ khí phụ, giữ lại món chính cho người chơi
          forgeInventory[1] = null;
          showForgeBanner("💥 NÂNG CẤP THẤT BẠI! ĐÃ TIÊU HAO 1 NGUYÊN LIỆU", false);
          playImpactSound(false);
        }

        renderForge();
        renderHotbar();
        renderStorage();
      });
    }

    // Sự kiện tooltip cho ô kết quả dự kiến (rê chuột trên PC, nhấn giữ trên ĐT)
    const forgeResBtn = document.getElementById("forgeResultSlot");
    if (forgeResBtn) {
      bindMouseHoverTooltip(forgeResBtn, () => forgeResultItem);
      bindLongPressTouchTooltip(forgeResBtn, () => forgeResultItem, { preventDefaultOnTouchStart: true });
    }
    
    // -------------------------------------------------------------
    // SỔ TAY CÔNG THỨC CHUẨN MINECRAFT (RECIPE BOOK SYSTEM)
    // -------------------------------------------------------------
    const btnToggleRecipeBook = document.getElementById("btnToggleRecipeBook");
    const recipeBookPanel = document.getElementById("recipeBookPanel");
    const recipeBookCountBadge = document.getElementById("recipeBookCountBadge");
    const recipeTabsEl = document.getElementById("recipeTabs");
    const recipeSearchInput = document.getElementById("recipeSearchInput");
    const btnClearRecipeSearch = document.getElementById("btnClearRecipeSearch");
    const btnRecipeCraftableFilter = document.getElementById("btnRecipeCraftableFilter");
    const recipeBookGrid = document.getElementById("recipeBookGrid");
    const recipePreviewBox = document.getElementById("recipePreviewBox");

    let isRecipeBookOpen = false;
    let activeRecipeCategory = "all";
    let onlyCraftableRecipes = false;
    let recipeSearchQuery = "";
    let selectedRecipeId = "wooden_stick";

    const RECIPE_BOOK_CATALOG = [
      {
        id: "wooden_stick",
        resultId: "wooden_stick",
        name: "Cành Cây",
        outputQty: 4,
        category: "materials",
        type: "crafting",
        pattern2x2: [["wood_log"]],
        pattern3x3: [["wood_log"]],
        note: "1 Khúc Gỗ → 4 Cành Cây"
      },
      {
        id: "crafting_table",
        resultId: "crafting_table",
        name: "Bàn Chế Tạo",
        outputQty: 1,
        category: "materials",
        type: "crafting",
        pattern2x2: [
          ["wood_log", "wood_log"],
          ["wood_log", "wood_log"]
        ],
        pattern3x3: [
          ["wood_log", "wood_log"],
          ["wood_log", "wood_log"]
        ],
        note: "Đặt xuống đất để mở chế tạo 3x3 & Lò Rèn"
      },
      {
        id: "chest",
        resultId: "chest",
        name: "Rương Đồ",
        outputQty: 1,
        category: "materials",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          ["wood_log", "wood_log", "wood_log"],
          ["wood_log", null, "wood_log"],
          ["wood_log", "wood_log", "wood_log"]
        ],
        note: "Fill 8 Khúc Gỗ viền 3x3 (trừ ô chính giữa) → Rương Đồ 27 ô"
      },
      {
        id: "wood_sword",
        resultId: "wood_sword",
        name: "Kiếm Gỗ",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: [
          ["wood_log"],
          ["wooden_stick"]
        ],
        pattern3x3: [
          ["wood_log"],
          ["wood_log"],
          ["wooden_stick"]
        ],
        note: "2x2 cần 1 Gỗ + 1 Cành • 3x3 cần 2 Gỗ + 1 Cành"
      },
      {
        id: "wood_axe",
        resultId: "wood_axe",
        name: "Rìu Gỗ",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          ["wood_log", "wood_log"],
          ["wood_log", "wooden_stick"],
          [null, "wooden_stick"]
        ],
        note: "Cần Bàn Chế Tạo 3x3 (hỗ trợ xếp đối xứng)"
      },
      {
        id: "wood_pickaxe",
        resultId: "wood_pickaxe",
        name: "Cúp Gỗ",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          ["wood_log", "wood_log", "wood_log"],
          [null, "wooden_stick", null],
          [null, "wooden_stick", null]
        ],
        note: "Cần Bàn Chế Tạo 3x3"
      },
      {
        id: "hunting_bow",
        resultId: "hunting_bow",
        name: "Cung Săn Bắn",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          ["wooden_stick", "wooden_stick", "plant_fiber"],
          ["wooden_stick", "plant_fiber", null],
          ["plant_fiber", null, null]
        ],
        note: "Cần Bàn Chế Tạo 3x3 • Bắn bằng Mũi Tên"
      },
      {
        id: "fishing_rod",
        resultId: "fishing_rod",
        name: "Cần Câu",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          [null, null, "wooden_stick"],
          [null, "wooden_stick", "plant_fiber"],
          ["wooden_stick", null, "plant_fiber"]
        ],
        note: "Cần Bàn Chế Tạo 3x3 • Quăng xuống nước câu cá & kho báu"
      },
      {
        id: "arrow",
        resultId: "arrow",
        name: "Mũi Tên",
        outputQty: 4,
        category: "gear",
        type: "crafting",
        pattern2x2: [
          ["stone_rock"],
          ["wooden_stick"]
        ],
        pattern3x3: [
          ["iron_ore"],
          ["wooden_stick"],
          ["feather"]
        ],
        note: "2x2: Đá + Cành • 3x3: Quặng Sắt + Cành + Lông"
      },
      {
        id: "magic_wand",
        resultId: "magic_wand",
        name: "Đũa Phép",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          [null, null, "diamond"],
          [null, "wooden_stick", null],
          ["wooden_stick", null, null]
        ],
        note: "3x3: 1 Kim Cương + 2 Cành Cây (Phần 1 Chiêu Thức + Phần 2 Ngọc Khảm)"
      },
      {
        id: "spell_gravity",
        resultId: "spell_gravity",
        name: "Ngọc Trọng Lực",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          ["stone_rock", "iron_ore", "stone_rock"],
          ["iron_ore", "diamond", "iron_ore"],
          ["stone_rock", "iron_ore", "stone_rock"]
        ],
        note: "Chiêu thức (Phần 1): Vòng báo → Cột sáng → Đè bẹp → Đất lún"
      },
      {
        id: "gem_damage",
        resultId: "gem_damage",
        name: "Ngọc Sức Mạnh",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          [null, "iron_ore", null],
          ["iron_ore", "stone_rock", "iron_ore"],
          [null, "iron_ore", null]
        ],
        note: "Ngọc khảm (Phần 2): +3 DMG mỗi viên (3 viên: +12 DMG)"
      },
      {
        id: "gem_fire",
        resultId: "gem_fire",
        name: "Ngọc Viêm Hỏa",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          [null, "coal", null],
          ["coal", "gold_ore", "coal"],
          [null, "coal", null]
        ],
        note: "Ngọc khảm (Phần 2): Thiêu đốt; 3 viên kích hoạt Cháy Lan AoE"
      },
      {
        id: "gem_frost",
        resultId: "gem_frost",
        name: "Ngọc Băng Sương",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          [null, "raw_fish", null],
          ["raw_fish", "diamond", "raw_fish"],
          [null, "raw_fish", null]
        ],
        note: "Ngọc khảm (Phần 2): Làm chậm 50%; 3 viên Sóng Băng Lan"
      },
      {
        id: "gem_vampire",
        resultId: "gem_vampire",
        name: "Ngọc Hút Máu",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          [null, "boar_unripe", null],
          ["boar_unripe", "gold_ore", "boar_unripe"],
          [null, "boar_unripe", null]
        ],
        note: "Ngọc khảm (Phần 2): +15% Hút Máu (3 viên: 55%)"
      },
      {
        id: "gem_haste",
        resultId: "gem_haste",
        name: "Ngọc Tốc Độ",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          [null, "feather", null],
          ["feather", "copper_ore", "feather"],
          [null, "feather", null]
        ],
        note: "Ngọc khảm (Phần 2): -14% thời gian hồi chiêu mỗi viên"
      },
      {
        id: "gem_crit",
        resultId: "gem_crit",
        name: "Ngọc Chí Mạng",
        outputQty: 1,
        category: "gear",
        type: "crafting",
        pattern2x2: null,
        pattern3x3: [
          [null, "gold_ore", null],
          ["gold_ore", "diamond", "gold_ore"],
          [null, "gold_ore", null]
        ],
        note: "Ngọc khảm (Phần 2): +18% Chí Mạng (x1.75 DMG) mỗi viên"
      },
      // Công thức Lò Rèn Nâng Cấp (ghép 2 món cùng loại & cùng cấp)
      { id: "forge_stone_sword", resultId: "stone_sword", name: "Kiếm Đá", outputQty: 1, category: "forge", type: "forge", inputId: "wood_sword", rate: 1.00 },
      { id: "forge_iron_sword", resultId: "iron_sword", name: "Kiếm Sắt", outputQty: 1, category: "forge", type: "forge", inputId: "stone_sword", rate: 0.75 },
      { id: "forge_gold_sword", resultId: "gold_sword", name: "Kiếm Vàng", outputQty: 1, category: "forge", type: "forge", inputId: "iron_sword", rate: 0.55 },
      { id: "forge_diamond_sword", resultId: "diamond_sword", name: "Kiếm Kim Cương", outputQty: 1, category: "forge", type: "forge", inputId: "gold_sword", rate: 0.35 },

      { id: "forge_stone_axe", resultId: "stone_axe", name: "Rìu Đá", outputQty: 1, category: "forge", type: "forge", inputId: "wood_axe", rate: 1.00 },
      { id: "forge_iron_axe", resultId: "iron_axe", name: "Rìu Sắt", outputQty: 1, category: "forge", type: "forge", inputId: "stone_axe", rate: 0.75 },
      { id: "forge_gold_axe", resultId: "gold_axe", name: "Rìu Vàng", outputQty: 1, category: "forge", type: "forge", inputId: "iron_axe", rate: 0.55 },
      { id: "forge_diamond_axe", resultId: "diamond_axe", name: "Rìu Kim Cương", outputQty: 1, category: "forge", type: "forge", inputId: "gold_axe", rate: 0.35 },

      { id: "forge_stone_pickaxe", resultId: "stone_pickaxe", name: "Cúp Đá", outputQty: 1, category: "forge", type: "forge", inputId: "wood_pickaxe", rate: 1.00 },
      { id: "forge_iron_pickaxe", resultId: "iron_pickaxe", name: "Cúp Sắt", outputQty: 1, category: "forge", type: "forge", inputId: "stone_pickaxe", rate: 0.75 },
      { id: "forge_gold_pickaxe", resultId: "gold_pickaxe", name: "Cúp Vàng", outputQty: 1, category: "forge", type: "forge", inputId: "iron_pickaxe", rate: 0.55 },
      { id: "forge_diamond_pickaxe", resultId: "diamond_pickaxe", name: "Cúp Kim Cương", outputQty: 1, category: "forge", type: "forge", inputId: "gold_pickaxe", rate: 0.35 }
    ];

    function normalizeRecipeSearchText(str) {
      return (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
    }

    function normalizeForgeItemId(id) {
      return id === "wooden_pickaxe" ? "wood_pickaxe" : (id || "");
    }

    function getEffectiveRecipePattern(recipe, mode = currentUIMode) {
      if (!recipe || recipe.type !== "crafting") return null;
      if (mode === "pocket") return recipe.pattern2x2 || recipe.pattern3x3;
      return recipe.pattern3x3 || recipe.pattern2x2;
    }

    function getPatternIngredientCounts(pattern) {
      const counts = {};
      if (!pattern) return counts;
      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < pattern[r].length; c++) {
          const id = pattern[r][c];
          if (id) counts[id] = (counts[id] || 0) + 1;
        }
      }
      return counts;
    }

    function getOwnedMaterialCounts(includeActiveGrid = true) {
      const counts = {};
      const addSlot = (it) => {
        if (!it || it.quantity <= 0) return;
        const id = normalizeForgeItemId(it.id || "");
        if (!id) return;
        counts[id] = (counts[id] || 0) + it.quantity;
      };
      for (let i = 0; i < 36; i++) addSlot(playerInventory[i]);
      if (includeActiveGrid) {
        if (currentUIMode === "workstation") {
          for (let i = 0; i < 9; i++) addSlot(workstationCraftingInventory[i]);
          for (let i = 0; i < 2; i++) addSlot(forgeInventory[i]);
        } else {
          for (let i = 0; i < 4; i++) addSlot(pocketCraftingInventory[i]);
        }
      }
      return counts;
    }

    function evaluateRecipeStatus(recipe, ownedCounts) {
      if (recipe.type === "forge") {
        const inputId = normalizeForgeItemId(recipe.inputId);
        const owned = ownedCounts[inputId] || 0;
        const needsWorkstation = currentUIMode !== "workstation";
        return {
          needsWorkstation,
          hasMaterials: owned >= 2,
          craftableNow: !needsWorkstation && owned >= 2,
          required: { [inputId]: 2 },
          pattern: null
        };
      }
      const needsWorkstation = currentUIMode === "pocket" && !recipe.pattern2x2;
      const pattern = getEffectiveRecipePattern(recipe, currentUIMode);
      const required = getPatternIngredientCounts(pattern);
      let hasMaterials = true;
      for (const [ingId, needQty] of Object.entries(required)) {
        if ((ownedCounts[ingId] || 0) < needQty) {
          hasMaterials = false;
          break;
        }
      }
      return {
        needsWorkstation,
        hasMaterials,
        craftableNow: !needsWorkstation && hasMaterials,
        required,
        pattern
      };
    }

    function getItemMaxStack(item) {
      if (!item) return MAX_STACK;
      const dbData = getItemData(item.id || item.name) || {};
      if (dbData.category === "spell") return 1;
      if (item.durability !== undefined || dbData.durability !== undefined) return 1;
      return dbData.maxStack || MAX_STACK;
    }

    function canStoreItemsInPlayerInventory(itemsList) {
      const simSlots = playerInventory.map((it) => (it ? { ...it } : null));
      for (const rawItem of itemsList) {
        if (!rawItem || rawItem.quantity <= 0) continue;
        let rem = rawItem.quantity;
        const maxS = getItemMaxStack(rawItem);
        const itemId = rawItem.id || "";
        if (maxS > 1) {
          for (let i = 0; i < 36 && rem > 0; i++) {
            const s = simSlots[i];
            if (s && s.id === itemId && s.name === rawItem.name && s.quantity < maxS) {
              const add = Math.min(maxS - s.quantity, rem);
              s.quantity += add;
              rem -= add;
            }
          }
        }
        for (let i = 0; i < 36 && rem > 0; i++) {
          if (!simSlots[i]) {
            const add = Math.min(maxS, rem);
            simSlots[i] = { ...rawItem, quantity: add };
            rem -= add;
          }
        }
        if (rem > 0) return false;
      }
      return true;
    }

    function storeItemIntoPlayerInventory(rawItem) {
      if (!rawItem || rawItem.quantity <= 0) return;
      let rem = rawItem.quantity;
      const maxS = getItemMaxStack(rawItem);
      const itemId = rawItem.id || "";
      if (maxS > 1) {
        for (let i = 0; i < 36 && rem > 0; i++) {
          const s = playerInventory[i];
          if (s && s.id === itemId && s.name === rawItem.name && s.quantity < maxS) {
            const add = Math.min(maxS - s.quantity, rem);
            s.quantity += add;
            rem -= add;
          }
        }
      }
      for (let i = 0; i < 36 && rem > 0; i++) {
        if (!playerInventory[i]) {
          const add = Math.min(maxS, rem);
          playerInventory[i] = { ...rawItem, quantity: add };
          rem -= add;
        }
      }
    }

    function returnArrayGridToInventory(gridArr) {
      const itemsToReturn = gridArr.filter((it) => it && it.quantity > 0);
      if (itemsToReturn.length === 0) return true;
      if (!canStoreItemsInPlayerInventory(itemsToReturn)) {
        addFloatingText("🎒 Túi đồ đầy, hãy chừa ô trống để thu lưới!", player.x - 24, player.y - 16, "#ef4444");
        return false;
      }
      for (let i = 0; i < gridArr.length; i++) {
        if (gridArr[i] && gridArr[i].quantity > 0) {
          storeItemIntoPlayerInventory(gridArr[i]);
          gridArr[i] = null;
        }
      }
      return true;
    }

    function clearActiveCraftingGridToInventory() {
      const targetGrid = currentUIMode === "workstation" ? workstationCraftingInventory : pocketCraftingInventory;
      const okCraft = returnArrayGridToInventory(targetGrid);
      let okForge = true;
      if (currentUIMode === "workstation") {
        okForge = returnArrayGridToInventory(forgeInventory);
      }
      if (okCraft || okForge) {
        updateCraftingResult();
        renderInventory();
      }
    }

    function takeMaterialUnitsFromInventory(itemId, amountNeeded, normalizeMatch = false) {
      const taken = [];
      let rem = amountNeeded;
      // Ưu tiên lấy từ kho đồ chính (9..35) trước, sau đó mới lấy trên thanh Hotbar (0..8)
      const order = [];
      for (let i = 9; i < 36; i++) order.push(i);
      for (let i = 0; i < 9; i++) order.push(i);

      for (const idx of order) {
        if (rem <= 0) break;
        const slot = playerInventory[idx];
        if (!slot || slot.quantity <= 0) continue;
        const slotId = normalizeMatch ? normalizeForgeItemId(slot.id) : (slot.id || "");
        if (slotId !== itemId) continue;

        const take = Math.min(rem, slot.quantity);
        taken.push({ ...slot, quantity: take });
        slot.quantity -= take;
        if (slot.quantity <= 0) playerInventory[idx] = null;
        rem -= take;
      }
      return taken;
    }

    function isGridMatchingRecipePattern(gridArr, gridSide, pattern) {
      if (!pattern) return false;
      let hasAnyItem = false;
      for (let r = 0; r < gridSide; r++) {
        for (let c = 0; c < gridSide; c++) {
          const expected = (pattern[r] && pattern[r][c]) ? pattern[r][c] : null;
          const actual = gridArr[r * gridSide + c];
          const actualId = (actual && actual.quantity > 0) ? (actual.id || "") : null;
          if (actualId) hasAnyItem = true;
          if (expected === null && actualId !== null) return false;
          if (expected !== null && actualId !== expected) return false;
        }
      }
      return hasAnyItem;
    }

    function autoFillRecipeIntoGrid(recipe, fillMax = false) {
      if (!recipe) return;

      if (recipe.type === "forge") {
        if (currentUIMode !== "workstation") {
          addFloatingText("🔥 Cần mở Bàn Chế Tạo & Lò Rèn!", player.x - 20, player.y - 16, "#f59e0b");
          return;
        }
        const inputId = normalizeForgeItemId(recipe.inputId);
        const alreadyLoaded = (
          forgeInventory[0] &&
          forgeInventory[1] &&
          normalizeForgeItemId(forgeInventory[0].id) === inputId &&
          normalizeForgeItemId(forgeInventory[1].id) === inputId
        );
        if (alreadyLoaded) return;

        if (!returnArrayGridToInventory(forgeInventory)) return;
        const invCounts = getOwnedMaterialCounts(false);
        if ((invCounts[inputId] || 0) < 2) {
          const ingData = getItemData(inputId) || { name: inputId };
          addFloatingText(`❌ Cần 2 ${ingData.name} để nâng cấp!`, player.x - 24, player.y - 16, "#ef4444");
          renderInventory();
          return;
        }
        const grabbed = takeMaterialUnitsFromInventory(inputId, 2, true);
        if (grabbed.length === 1 && grabbed[0].quantity >= 2) {
          forgeInventory[0] = { ...grabbed[0], quantity: 1 };
          forgeInventory[1] = { ...grabbed[0], quantity: 1 };
        } else if (grabbed.length >= 2) {
          forgeInventory[0] = { ...grabbed[0], quantity: 1 };
          forgeInventory[1] = { ...grabbed[1], quantity: 1 };
        }
        renderInventory();
        return;
      }

      // Chế tạo 2x2 hoặc 3x3
      if (currentUIMode === "pocket" && !recipe.pattern2x2) {
        addFloatingText("🔨 Công thức này cần Bàn Chế Tạo (3x3)!", player.x - 24, player.y - 16, "#f59e0b");
        return;
      }

      const gridSide = currentUIMode === "workstation" ? 3 : 2;
      const targetGrid = currentUIMode === "workstation" ? workstationCraftingInventory : pocketCraftingInventory;
      const pattern = getEffectiveRecipePattern(recipe, currentUIMode);
      if (!pattern) return;

      const samePatternInGrid = isGridMatchingRecipePattern(targetGrid, gridSide, pattern);
      if (!samePatternInGrid) {
        if (!returnArrayGridToInventory(targetGrid)) return;
      }

      const reqCounts = getPatternIngredientCounts(pattern);
      const invCounts = getOwnedMaterialCounts(false);

      // Tính số bộ tối đa có thể xếp thêm dựa vào nguyên liệu trong túi & giới hạn MAX_STACK trên từng ô
      let maxSetsByInv = Infinity;
      for (const [ingId, needPerSet] of Object.entries(reqCounts)) {
        maxSetsByInv = Math.min(maxSetsByInv, Math.floor((invCounts[ingId] || 0) / needPerSet));
      }

      let maxSetsBySlotCap = Infinity;
      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < pattern[r].length; c++) {
          const ingId = pattern[r][c];
          if (!ingId) continue;
          const existing = targetGrid[r * gridSide + c];
          const curQty = (existing && existing.quantity > 0) ? existing.quantity : 0;
          const ingMax = getItemMaxStack({ id: ingId });
          maxSetsBySlotCap = Math.min(maxSetsBySlotCap, Math.max(0, ingMax - curQty));
        }
      }

      const availableSets = Math.min(maxSetsByInv, maxSetsBySlotCap);
      if (availableSets <= 0) {
        if (!samePatternInGrid) {
          const missingNames = Object.entries(reqCounts)
            .filter(([id, need]) => (invCounts[id] || 0) < need)
            .map(([id, need]) => `${need - (invCounts[id] || 0)} ${(getItemData(id) || {}).name || id}`);
          if (missingNames.length > 0) {
            addFloatingText("❌ Thiếu: " + missingNames.join(", "), player.x - 24, player.y - 16, "#ef4444");
          }
        }
        updateCraftingResult();
        renderInventory();
        return;
      }

      const setsToAdd = fillMax ? availableSets : 1;
      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < pattern[r].length; c++) {
          const ingId = pattern[r][c];
          if (!ingId) continue;
          const cellIdx = r * gridSide + c;
          const takenList = takeMaterialUnitsFromInventory(ingId, setsToAdd, false);
          if (takenList.length === 0) continue;
          const totalTaken = takenList.reduce((acc, it) => acc + it.quantity, 0);
          if (targetGrid[cellIdx]) {
            targetGrid[cellIdx].quantity += totalTaken;
          } else {
            const dbData = getItemData(ingId) || {};
            targetGrid[cellIdx] = {
              ...takenList[0],
              id: ingId,
              name: dbData.name || takenList[0].name,
              quantity: totalTaken,
              icon: dbData.icon || takenList[0].icon || ""
            };
          }
        }
      }

      updateCraftingResult();
      renderInventory();
    }

    function renderRecipePreview(recipe, status, ownedCounts) {
      if (!recipePreviewBox) return;
      if (!recipe) {
        recipePreviewBox.innerHTML = '<div class="recipe-preview-empty">Chọn công thức để xem cách xếp &amp; tự điền vào lưới</div>';
        return;
      }

      const resultData = getItemData(recipe.resultId) || { id: recipe.resultId, name: recipe.name };
      const qtyBadge = recipe.outputQty > 1 ? ` x${recipe.outputQty}` : "";

      let modeTagHtml = "";
      if (recipe.type === "forge") {
        const pct = Math.round(recipe.rate * 100);
        modeTagHtml = `<span class="recipe-preview-tag forge">🔥 Lò Rèn • ${pct}%</span>`;
      } else if (status.needsWorkstation) {
        modeTagHtml = `<span class="recipe-preview-tag forge">🔨 Cần Bàn 3x3</span>`;
      } else if (currentUIMode === "workstation") {
        modeTagHtml = `<span class="recipe-preview-tag">⚙️ Bàn 3x3</span>`;
      } else {
        modeTagHtml = `<span class="recipe-preview-tag">⚙️ Túi 2x2</span>`;
      }

      // Render mini visual grid
      let miniVisualHtml = "";
      if (recipe.type === "forge") {
        const inId = normalizeForgeItemId(recipe.inputId);
        const inData = getItemData(inId) || { id: inId, name: inId };
        const inIcon = getItemIcon(inData);
        const resIcon = getItemIcon(resultData);
        const owned = ownedCounts[inId] || 0;
        const c1Miss = owned < 1 ? "missing" : "";
        const c2Miss = owned < 2 ? "missing" : "";
        miniVisualHtml = `
          <div class="recipe-mini-forge">
            <div class="recipe-mini-cell ${c1Miss}" data-item-id="${inId}"><img src="${inIcon}" alt="${inData.name}"></div>
            <span style="color:#f59e0b;font-weight:700;">+</span>
            <div class="recipe-mini-cell ${c2Miss}" data-item-id="${inId}"><img src="${inIcon}" alt="${inData.name}"></div>
            <span style="color:#fbbf24;font-weight:700;">➡</span>
            <div class="recipe-mini-cell" data-item-id="${recipe.resultId}"><img src="${resIcon}" alt="${resultData.name}"></div>
          </div>
        `;
      } else {
        const pat = status.pattern || [];
        const previewSide = (currentUIMode === "pocket" && !status.needsWorkstation) ? 2 : 3;
        // Đếm số lượng tích lũy để tô đỏ những ô còn thiếu nguyên liệu
        const runningBudget = { ...ownedCounts };
        let cellsHtml = "";
        for (let r = 0; r < previewSide; r++) {
          for (let c = 0; c < previewSide; c++) {
            const ingId = (pat[r] && pat[r][c]) ? pat[r][c] : null;
            if (!ingId) {
              cellsHtml += '<div class="recipe-mini-cell"></div>';
            } else {
              const ingData = getItemData(ingId) || { id: ingId, name: ingId };
              const ingIcon = getItemIcon(ingData);
              const hasEnoughForCell = (runningBudget[ingId] || 0) > 0;
              if (hasEnoughForCell) runningBudget[ingId] -= 1;
              cellsHtml += `<div class="recipe-mini-cell ${hasEnoughForCell ? "" : "missing"}" data-item-id="${ingId}"><img src="${ingIcon}" alt="${ingData.name}"></div>`;
            }
          }
        }
        miniVisualHtml = `<div class="recipe-mini-grid size-${previewSide}">${cellsHtml}</div>`;
      }

      // Danh sách nguyên liệu cần vs đang có
      const ingRowsHtml = Object.entries(status.required).map(([ingId, needQty]) => {
        const ingData = getItemData(ingId) || { name: ingId };
        const haveQty = ownedCounts[ingId] || 0;
        const ok = haveQty >= needQty;
        return `<div class="recipe-ing-row ${ok ? "ok" : "missing"}"><span>${ingData.name}</span><span>${haveQty}/${needQty} ${ok ? "✓" : "✗"}</span></div>`;
      }).join("");

      const fillBtnLabel = recipe.type === "forge"
        ? (status.needsWorkstation ? "Cần Bàn 3x3" : "⚒️ Nạp Lò")
        : (status.needsWorkstation ? "Cần Bàn 3x3" : "⚡ Xếp 1 bộ");

      const maxBtnHtml = recipe.type === "crafting" && !status.needsWorkstation
        ? `<button type="button" id="btnRecipeFillMax" class="recipe-act-btn secondary" ${status.craftableNow ? "" : "disabled"}>📦 Tối đa</button>`
        : "";

      recipePreviewBox.innerHTML = `
        <div class="recipe-preview-top">
          <span class="recipe-preview-name">${resultData.name}${qtyBadge}</span>
          ${modeTagHtml}
        </div>
        <div class="recipe-preview-body">
          ${miniVisualHtml}
          <div class="recipe-ing-list">
            ${ingRowsHtml}
          </div>
        </div>
        <div class="recipe-preview-actions">
          <button type="button" id="btnRecipeFillOne" class="recipe-act-btn primary" ${status.craftableNow ? "" : "disabled"}>${fillBtnLabel}</button>
          ${maxBtnHtml}
          <button type="button" id="btnRecipeClearGrid" class="recipe-act-btn clear" title="Thu nguyên liệu trên lưới về túi">↩ Thu</button>
        </div>
      `;

      recipePreviewBox.querySelectorAll(".recipe-mini-cell[data-item-id]").forEach((cellEl) => {
        const cellItemId = cellEl.dataset.itemId;
        const cellItemData = getItemData(cellItemId) || { id: cellItemId, name: cellItemId };
        bindMouseHoverTooltip(cellEl, () => cellItemData);
        bindLongPressTouchTooltip(cellEl, () => cellItemData, { preventDefaultOnTouchStart: false });
      });

      const fillOneBtn = document.getElementById("btnRecipeFillOne");
      if (fillOneBtn) {
        fillOneBtn.addEventListener("click", () => autoFillRecipeIntoGrid(recipe, false));
      }
      const fillMaxBtn = document.getElementById("btnRecipeFillMax");
      if (fillMaxBtn) {
        fillMaxBtn.addEventListener("click", () => autoFillRecipeIntoGrid(recipe, true));
      }
      const clearBtn = document.getElementById("btnRecipeClearGrid");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => clearActiveCraftingGridToInventory());
      }
    }

    function renderRecipeBook() {
      if (!recipeBookPanel || !recipeBookGrid) return;

      recipeBookPanel.style.display = isRecipeBookOpen ? "flex" : "none";
      if (inventoryUI) inventoryUI.classList.toggle("recipe-book-open", isRecipeBookOpen);
      if (btnToggleRecipeBook) btnToggleRecipeBook.classList.toggle("active", isRecipeBookOpen);
      if (!isRecipeBookOpen) return;

      const ownedCounts = getOwnedMaterialCounts(true);
      const normQuery = normalizeRecipeSearchText(recipeSearchQuery.trim());

      let totalForCat = 0;
      let craftableCount = 0;
      const visibleEntries = [];

      for (const recipe of RECIPE_BOOK_CATALOG) {
        const status = evaluateRecipeStatus(recipe, ownedCounts);
        const matchesCat = (activeRecipeCategory === "all" || recipe.category === activeRecipeCategory);
        if (matchesCat) {
          totalForCat++;
          if (status.craftableNow) craftableCount++;
        }
        if (!matchesCat) continue;
        if (onlyCraftableRecipes && !status.craftableNow) continue;

        if (normQuery) {
          const itemData = getItemData(recipe.resultId) || {};
          const hay = normalizeRecipeSearchText(`${recipe.name} ${itemData.name || ""} ${recipe.note || ""}`);
          if (!hay.includes(normQuery)) continue;
        }

        visibleEntries.push({ recipe, status });
      }

      if (recipeBookCountBadge) {
        recipeBookCountBadge.textContent = `${craftableCount}/${totalForCat} đủ`;
      }
      if (btnRecipeCraftableFilter) {
        btnRecipeCraftableFilter.classList.toggle("active", onlyCraftableRecipes);
      }
      if (btnClearRecipeSearch) {
        btnClearRecipeSearch.style.display = recipeSearchQuery.length > 0 ? "block" : "none";
      }

      recipeBookGrid.innerHTML = "";
      if (visibleEntries.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "recipe-book-empty";
        emptyEl.textContent = onlyCraftableRecipes
          ? "Chưa đủ nguyên liệu cho công thức nào ở mục này."
          : "Không tìm thấy công thức phù hợp.";
        recipeBookGrid.appendChild(emptyEl);
        renderRecipePreview(null, null, ownedCounts);
        return;
      }

      let selectedEntry = visibleEntries.find((e) => e.recipe.id === selectedRecipeId) || visibleEntries[0];
      selectedRecipeId = selectedEntry.recipe.id;

      for (const entry of visibleEntries) {
        const { recipe, status } = entry;
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "recipe-tile " + (status.craftableNow ? "craftable" : "uncraftable");
        if (recipe.id === selectedRecipeId) tile.classList.add("selected");

        const resData = getItemData(recipe.resultId) || { id: recipe.resultId, name: recipe.name };
        const img = document.createElement("img");
        img.src = getItemIcon(resData);
        img.alt = recipe.name;
        tile.appendChild(img);

        if (recipe.outputQty > 1) {
          const cnt = document.createElement("span");
          cnt.className = "recipe-tile-count";
          cnt.textContent = String(recipe.outputQty);
          tile.appendChild(cnt);
        }

        if (status.needsWorkstation) {
          const badge = document.createElement("span");
          badge.className = "recipe-tile-badge";
          badge.textContent = recipe.type === "forge" ? "🔥" : "3x3";
          tile.appendChild(badge);
        }

        bindMouseHoverTooltip(tile, () => resData);
        bindLongPressTouchTooltip(tile, () => resData, { preventDefaultOnTouchStart: false });

        tile.addEventListener("click", (e) => {
          selectedRecipeId = recipe.id;
          if (status.craftableNow) {
            autoFillRecipeIntoGrid(recipe, Boolean(e.shiftKey));
          } else {
            renderRecipeBook();
            if (status.needsWorkstation) {
              addFloatingText(
                recipe.type === "forge" ? "🔥 Cần đứng gần Bàn Chế Tạo để mở Lò Rèn!" : "🔨 Cần Bàn Chế Tạo (3x3)!",
                player.x - 24,
                player.y - 16,
                "#f59e0b"
              );
            }
          }
        });

        recipeBookGrid.appendChild(tile);
      }

      renderRecipePreview(selectedEntry.recipe, selectedEntry.status, ownedCounts);
    }

    function setRecipeBookOpen(open) {
      isRecipeBookOpen = Boolean(open);
      renderRecipeBook();
    }

    if (btnToggleRecipeBook) {
      btnToggleRecipeBook.addEventListener("click", () => {
        setRecipeBookOpen(!isRecipeBookOpen);
      });
    }

    if (recipeBookGrid) {
      recipeBookGrid.addEventListener("scroll", hideItemTooltip, { passive: true });
    }

    if (recipeTabsEl) {
      recipeTabsEl.querySelectorAll(".recipe-tab").forEach((tabBtn) => {
        tabBtn.addEventListener("click", () => {
          activeRecipeCategory = tabBtn.dataset.cat || "all";
          recipeTabsEl.querySelectorAll(".recipe-tab").forEach((b) => {
            b.classList.toggle("active", b === tabBtn);
          });
          renderRecipeBook();
        });
      });
    }

    if (btnRecipeCraftableFilter) {
      btnRecipeCraftableFilter.addEventListener("click", () => {
        onlyCraftableRecipes = !onlyCraftableRecipes;
        renderRecipeBook();
      });
    }

    if (recipeSearchInput) {
      recipeSearchInput.addEventListener("input", () => {
        recipeSearchQuery = recipeSearchInput.value || "";
        renderRecipeBook();
      });
      recipeSearchInput.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          recipeSearchInput.blur();
        }
      });
      recipeSearchInput.addEventListener("keyup", (e) => e.stopPropagation());
    }

    if (btnClearRecipeSearch && recipeSearchInput) {
      btnClearRecipeSearch.addEventListener("click", () => {
        recipeSearchQuery = "";
        recipeSearchInput.value = "";
        renderRecipeBook();
        recipeSearchInput.focus();
      });
    }

    // Hàm render toàn bộ Túi đồ, Hotbar, Bàn chế tạo & Lò rèn (chỉ render các bảng đang mở)
    function renderInventory() {
      renderHotbar();
      if (isInventoryOpen()) {
        renderStorage();
        renderCrafting();
        renderForge();
        renderEquipmentSlots();
        renderPaperdoll();
        if (isRecipeBookOpen) renderRecipeBook();
      }
      if (isChestOpen()) {
        renderChestUI();
      }
      if (isWandModalOpen()) {
        renderWandCustomizerModal();
      }
    }

    function checkNearCraftingTable() {
      for (const obj of currentObjects) {
        if (obj.type === "crafting_table") {
          const dist = Math.hypot((player.x + 8) - (obj.x + 8), (player.y + 8) - (obj.y + 8));
          if (dist <= INTERACTION_RADIUS + 22) {
            return true;
          }
        }
      }
      return false;
    }

    function consumeEquippedItem() {
      return tryEatConsumable(activeHotbarIndex);
    }

    // Lắng nghe chuột phải trên Canvas để đặt Bàn Chế Tạo / Rương Đồ hoặc mở tương tác
    if (canvas) {
      
      canvas.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || isPaused || isMobileMode()) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const zoom = getCameraZoom();
        const worldX = clientX / zoom + camera.x;
        const worldY = clientY / zoom + camera.y;

        // Nếu bấm trực tiếp vào Vòng Khảm Đũa, Rương Đồ hoặc Bàn Chế Tạo trong tầm với thì không đánh thường
        if (currentMap === "home") {
          const distClickAltar = Math.hypot(worldX - HOME_WAND_ALTAR.x, worldY - HOME_WAND_ALTAR.y);
          if (distClickAltar <= HOME_WAND_ALTAR.hoverRadius + 2) {
            return;
          }
        
          const distClickNPC2 = Math.hypot(worldX - (HOME_MERCHANT.x + 8), worldY - (HOME_MERCHANT.y + 8));
          if (distClickNPC2 <= 34) {
            return;
          }
        }
        for (const obj of currentObjects) {
          if (obj.type === "crafting_table" || obj.type === "chest") {
            const dist = Math.hypot((player.x + 8) - (obj.x + 8), (player.y + 8) - (obj.y + 8));
            if (dist <= INTERACTION_RADIUS + 22 && worldX >= obj.x - 6 && worldX <= obj.x + 22 && worldY >= obj.y - 6 && worldY <= obj.y + 22) {
              return;
            }
          }
        }

        e.preventDefault();
        isMouseActionHeld = true;
        syncActionHeldState();
        const activeIt = playerInventory[activeHotbarIndex];
        if (activeIt && (activeIt.id === 'magic_wand' || activeIt.id === 'fishing_rod' || activeIt.id === 'hunting_bow' || (activeIt.name && activeIt.name.includes('Cung')))) {
          const dx = worldX - (player.x + player.width / 2);
          const dy = worldY - (player.y + player.height / 2);
          if (Math.hypot(dx, dy) > 4) {
            const snapped = snapTo8Directions(Math.atan2(dy, dx));
            lastAimAngle = snapped;
            bowAimAngle = snapped;
            pendingPointerAimAngle = snapped;
          }
          if (activeIt.id === 'fishing_rod') {
            pendingFishingClickPos = { x: worldX, y: worldY };
          }
          if (activeIt.id === 'magic_wand') {
            pendingPointerWorldPos = { x: worldX, y: worldY };
          }
        }
        if (activeIt && (activeIt.id === 'hunting_bow' || (activeIt.name && activeIt.name.includes('Cung')))) {
          pendingQuickBowShot = true;
        }
        if (triggerPlayerAttack()) {
          performAction();
        }
      });

      window.addEventListener("mouseup", (e) => {
        if (e.button === 0 && isMouseActionHeld) {
          isMouseActionHeld = false;
          syncActionHeldState();
          harvestProgress = 0;
          activeHarvestTarget = null;
        }
      });

      canvas.addEventListener("click", (e) => {
        if (isPaused) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const zoom = getCameraZoom();
        const worldX = clientX / zoom + camera.x;
        const worldY = clientY / zoom + camera.y;

        if (currentMap === "home") {
          const distAltar = Math.hypot(worldX - HOME_WAND_ALTAR.x, worldY - HOME_WAND_ALTAR.y);
          if (distAltar <= HOME_WAND_ALTAR.hoverRadius + 2) {
            wandAltarTriggerLock = true;
            openWandCustomizer(true);
            return;
          }
          const distClickNPC3 = Math.hypot(worldX - (HOME_MERCHANT.x + 8), worldY - (HOME_MERCHANT.y + 8));
          if (distClickNPC3 <= 34) {
            const distPlayerNPC3 = Math.hypot((player.x + 8) - (HOME_MERCHANT.x + 8), (player.y + 8) - (HOME_MERCHANT.y + 8));
            if (distPlayerNPC3 <= 52) {
              toggleNpcShopUI(true);
            } else {
              addFloatingText("💬 Lại gần Thương Nhân hơn (2 ô)!", HOME_MERCHANT.x - 24, HOME_MERCHANT.y - 14, "#fde047");
            }
            return;
          }
        }

        for (const obj of currentObjects) {
          if (obj.type === "crafting_table" || obj.type === "chest") {
            const dist = Math.hypot((player.x + 8) - (obj.x + 8), (player.y + 8) - (obj.y + 8));
            if (dist <= INTERACTION_RADIUS + 22 && worldX >= obj.x - 6 && worldX <= obj.x + 22 && worldY >= obj.y - 6 && worldY <= obj.y + 22) {
              if (obj.type === "chest") {
                toggleChestUI(true, obj);
              } else {
                toggleInventory(true, 'workstation');
              }
              return;
            }
          }
        }
      });

      canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (isPaused) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const zoom = getCameraZoom();
        const worldX = clientX / zoom + camera.x;
        const worldY = clientY / zoom + camera.y;

        // 1. Kiểm tra xem có click trúng Rương Đồ hoặc Bàn Chế Tạo trên map không
        for (const obj of currentObjects) {
          if (obj.type === "crafting_table" || obj.type === "chest") {
            const dist = Math.hypot((player.x + 8) - (obj.x + 8), (player.y + 8) - (obj.y + 8));
            if (dist <= INTERACTION_RADIUS + 22 && worldX >= obj.x - 6 && worldX <= obj.x + 22 && worldY >= obj.y - 6 && worldY <= obj.y + 22) {
              if (obj.type === "chest") {
                toggleChestUI(true, obj);
              } else {
                toggleInventory(true, 'workstation');
              }
              return;
            }
          }
        }

        // 2. Nếu đang cầm Rương Đồ hoặc Bàn Chế Tạo trên tay, click chuột phải để đặt xuống vị trí click
        const equippedItem = playerInventory[activeHotbarIndex];
        if (equippedItem && equippedItem.id === "chest") {
          const tileX = Math.floor(worldX / 16) * 16;
          const tileY = Math.floor(worldY / 16) * 16;
          const distToPlayer = Math.hypot((player.x + 8) - (tileX + 8), (player.y + 8) - (tileY + 8));
          if (distToPlayer <= INTERACTION_RADIUS + 20) {
            if (tryPlaceChest(activeHotbarIndex, tileX, tileY)) return;
          }
        }
        if (equippedItem && (equippedItem.id === "crafting_table" || (equippedItem.name && equippedItem.name.includes("Bàn Chế Tạo")))) {
          const tileX = Math.floor(worldX / 16) * 16;
          const tileY = Math.floor(worldY / 16) * 16;
          const distToPlayer = Math.hypot((player.x + 8) - (tileX + 8), (player.y + 8) - (tileY + 8));

          if (distToPlayer <= INTERACTION_RADIUS + 20) {
            const placeBox = { x: tileX, y: tileY, width: 16, height: 16 };
            if (isBoxOnWalkableGround(placeBox)) {
              let collide = false;
              for (const o of currentObjects) {
                if (checkAABB(placeBox, o)) { collide = true; break; }
              }
              if (!collide) {
                equippedItem.quantity -= 1;
                if (equippedItem.quantity <= 0) playerInventory[activeHotbarIndex] = null;
                renderHotbar();
                currentObjects.push({
                  type: "crafting_table",
                  x: tileX,
                  y: tileY,
                  width: 16,
                  height: 16,
                  name: "Bàn Chế Tạo"
                });
                playImpactSound(false);
                spawnHitSparks(tileX + 8, tileY + 8, -Math.PI / 2);
                                updateStatsHUD();
                return;
              }
            }
          }
        }

        // 3. Nếu đang cầm Đũa Phép, chuột phải trên map để mở bảng khảm chiêu
        if (equippedItem && equippedItem.id === "magic_wand") {
          openWandCustomizer(true, equippedItem);
          return;
        }

        // 4. Nếu đang cầm vật phẩm tiêu hao (thức ăn), sử dụng để hồi HP
        consumeEquippedItem();
      });
    }

    // Khởi tạo hiển thị Hotbar ngay khi vào game
    renderHotbar();

    // Cơ chế điều khiển mở / đóng túi đồ và Pause game
    function toggleInventory(forceOpen = null, mode = null) {
      if (!inventoryUI) return;
      const isCurrentlyClosed = (inventoryUI.style.display === "none" || inventoryUI.style.display === "");
      const willOpen = forceOpen !== null ? forceOpen : isCurrentlyClosed;

      if (willOpen) {
        if (mode && mode !== "wand") {
          currentUIMode = mode;
        } else if (forceOpen === true && !mode) {
          currentUIMode = currentUIMode || 'pocket';
        } else {
          currentUIMode = 'pocket';
        }

        if (currentUIMode === 'workstation') {
          if (invTitleText) invTitleText.textContent = "🔨 BÀN CHẾ TẠO & LÒ RÈN";
          if (invModeBadge) {
            invModeBadge.textContent = "WORKSTATION 3x3 + FORGE";
            invModeBadge.style.color = "#fde68a";
            invModeBadge.style.borderColor = "rgba(245, 158, 11, 0.55)";
            invModeBadge.style.background = "rgba(245, 158, 11, 0.14)";
          }
          if (pocketCraftingSection) pocketCraftingSection.style.display = "none";
          if (workstationContainer) workstationContainer.style.display = "flex";
        } else {
          if (invTitleText) invTitleText.textContent = "🎒 TÚI ĐỒ CÁ NHÂN";
          if (invModeBadge) {
            invModeBadge.textContent = "CHẾ TẠO 2x2";
            invModeBadge.style.color = "#7dd3fc";
            invModeBadge.style.borderColor = "rgba(56, 189, 248, 0.45)";
            invModeBadge.style.background = "rgba(56, 189, 248, 0.12)";
          }
          if (pocketCraftingSection) pocketCraftingSection.style.display = "flex";
          if (workstationContainer) workstationContainer.style.display = "none";
        }

        // Nhả tất cả các phím di chuyển đang giữ và reset joystick nếu có
        keys.up = false; keys.down = false; keys.left = false; keys.right = false;
        isKeyActionHeld = false;
        isMouseActionHeld = false;
        isMobileActionHeld = false;
        isActionKeyHeld = false;
        pendingQuickBowShot = false;
        isBowCharging = false;
        bowChargeTimer = 0;
        resetFishingState();
        if (window.resetMobileJoystick) window.resetMobileJoystick();
        if (player.action !== 'die' && player.action !== 'attack') {
          player.action = 'idle';
        }

        syncRealResourcesToPlayerInventory();
        inventoryUI.style.display = "flex";
        isPaused = true;
        needsCanvasRedraw = true;
        renderInventory();
        updateCursorUI();
        syncCampfireAndInventoryState();
        syncChestAndInventoryState();
      } else {
        cancelActiveTouchInvState(true);
        inventoryUI.style.display = "none";
        if (isChestOpen()) {
          activeOpenChest = null;
          const chestUIEl = document.getElementById("chest-ui");
          if (chestUIEl) chestUIEl.style.display = "none";
        }
        if (!isWandModalOpen() && !isChestOpen()) {
          isPaused = false;
          needsCanvasRedraw = true;
        }
        hideItemTooltip();
        updateCursorUI();
        syncCampfireAndInventoryState();
        syncChestAndInventoryState();
      }
      if (window.onMobileHudSync) window.onMobileHudSync();
    }

    if (btnInventoryBtn) {
      btnInventoryBtn.addEventListener("click", () => {
        toggleInventory(null, checkNearCraftingTable() ? 'workstation' : 'pocket');
      });
    }
    if (inventoryUI) {
      inventoryUI.addEventListener("keydown", (e) => {
        const tag = e.target && e.target.tagName;
        const isTyping = (tag === "INPUT" || tag === "TEXTAREA");
        const k = (e.key || "").toLowerCase();
        if (!isTyping && (k === "e" || k === "r" || k === "g" || e.key === "Escape" || e.code === "Escape")) {
          return;
        }
        e.stopPropagation();
      });
      inventoryUI.addEventListener("keyup", (e) => e.stopPropagation());
      inventoryUI.addEventListener("contextmenu", (e) => e.preventDefault());
    }
    if (hotbarUI) {
      hotbarUI.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    const floatingTexts = [];
    function addFloatingText(text, worldX, worldY, color, isItem = false) {
      const now = performance.now();
      // Chống spam trùng lặp thông báo giống nhau trong 0.45s
      const dup = floatingTexts.find(f => f.text === text && (now - (f.createdAt || 0)) < 450);
      if (dup) return;
      if (floatingTexts.length >= 5) floatingTexts.shift();
      floatingTexts.push({
        text: text,
        x: worldX,
        y: worldY,
        color: color,
        opacity: 1.0,
        lifeTime: isItem ? 1.05 : 0.85,
        isItem: isItem,
        vy: isItem ? 22 : 16,
        createdAt: now
      });
    }

    let toastTimeout = null;
    function showNotification(message, isError = true) {
      if (!notificationToast) return;
      notificationToast.textContent = message;
      notificationToast.style.backgroundColor = "rgba(14, 19, 29, 0.96)";
      notificationToast.style.borderColor = isError ? "#ef4444" : "#22c55e";
      notificationToast.style.color = isError ? "#fecaca" : "#bbf7d0";
      notificationToast.style.display = "block";

      notificationToast.style.animation = "none";
      notificationToast.offsetHeight;
      notificationToast.style.animation = "fadeInOut 2.5s forwards";

      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        notificationToast.style.display = "none";
      }, 2500);
    }

    let teleportFlashOpacity = 0;

    // -------------------------------------------------------------
    // 3. THIẾT LẬP NHÂN VẬT & CAMERA (16x16 VÀ TỐC ĐỘ GIẢM) (Yêu cầu 1 & 2)
    // -------------------------------------------------------------
    // KÍCH THƯỚC KHÔNG GIAN BẢN ĐỒ: 512 x 512 pixel (32 x 32 ô theo file LDtk map_home.json)
    const MAP_SIZE = 512;

    // NHÂN VẬT: Kích thước 16x16 pixel, Spawn ngay tại TRUNG TÂM MAP (X: 248, Y: 248)
    // Tốc độ: 110 px/s (tương đương ~1.8 px/frame ở 60fps, phù hợp không gian 16x16)
    const player = {
      x: (MAP_SIZE - TILE_SIZE) / 2, // 248 px (tâm bản đồ 512x512)
      y: (MAP_SIZE - TILE_SIZE) / 2 + 20, // 268 px (dưới lửa trại)
      width: TILE_SIZE,  // 16 px (hitbox)
      height: TILE_SIZE, // 16 px (hitbox)
      color: "blue",
      speed: defaultStats.player.speed,
      // Hệ thống máu (HP) & chiến đấu
      maxHp: defaultStats.player.maxHp,
      hp: defaultStats.player.maxHp,
      displayHp: defaultStats.player.maxHp, // Cho hiệu ứng thanh máu tụt mượt
      invulnerableTimer: 0, // Thời gian bất tử sau khi dính đòn (chớp đỏ)
      hurtFlashTimer: 0,
      attackCooldown: 0,    // Bộ đếm hồi chiêu đánh (nerf spam click)
      // Thuộc tính Sprite Animation (10 hàng x 6 cột)
      frameX: 0,
      frameY: 0,
      maxFrame: 6,
      animTimer: 0,
      animSpeed: 0.1,    // 100ms mỗi frame
      direction: 'down', // 'up', 'down', 'right', 'left'
      action: 'idle',    // 'idle', 'walk', 'attack', 'die'
      isMoving: false
    };

    const camera = {
      x: 0,
      y: 0
    };

    // -------------------------------------------------------------
    // 4. CẤU TRÚC ĐA BẢN ĐỒ VỚI VẬT THỂ & MOBS 16x16 (Yêu cầu 1)
    // -------------------------------------------------------------
    function checkAABB(rectA, rectB) {
      return (
        rectA.x < rectB.x + rectB.width &&
        rectA.x + rectA.width > rectB.x &&
        rectA.y < rectB.y + rectB.height &&
        rectA.y + rectA.height > rectB.y
      );
    }

    // Tìm tọa độ ngẫu nhiên hợp lệ trên bản đồ Rừng (không đè lên vật thể khác, không đè lên player hoặc portal)
    function getRandomValidPosition(size, existingList, excludePlayer = true) {
      let posX = 0, posY = 0, valid = false, attempts = 0;

      while (!valid && attempts < 400) {
        attempts++;
        // Ở map Rừng, hàng rào bao quanh ở ranh giới ô col: 2..29, row: 2..29 (tương ứng pixel 32 đến 480)
        // Tạo vị trí an toàn bên trong hàng rào (từ pixel 48 đến 448)
        posX = 48 + Math.floor(Math.random() * (448 - 48 - size));
        posY = 48 + Math.floor(Math.random() * (448 - 48 - size));

        const tempRect = { x: posX, y: posY, width: size, height: size };

        // Tránh vị trí cổng dịch chuyển (x: 20..50, y: 220..280) và vị trí spawn trung tâm (x: 230..270, y: 230..270)
        if (posX < 64 && Math.abs(posY - MAP_SIZE / 2) < 40) continue;
        if (Math.abs(posX - MAP_SIZE / 2) < 32 && Math.abs(posY - MAP_SIZE / 2) < 32) continue;

        // Tránh vị trí người chơi đang đứng
        if (excludePlayer && typeof player !== "undefined") {
          const playerPadded = {
            x: player.x - 16, y: player.y - 16,
            width: player.width + 32, height: player.height + 32
          };
          if (checkAABB(tempRect, playerPadded)) continue;
        }

        // Kiểm tra xem vị trí có nằm trên đất đi được và không nằm đè lên hàng rào hay nước
        if (!isBoxOnWalkableGround(tempRect, "forest")) continue;

        let overlaps = false;
        for (const obj of existingList) {
          const paddedObj = {
            x: obj.x - 8, y: obj.y - 8,
            width: obj.width + 16, height: obj.height + 16
          };
          if (checkAABB(tempRect, paddedObj)) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) valid = true;
      }

      return valid ? { x: posX, y: posY } : { x: 48 + Math.floor(Math.random() * 380), y: 48 + Math.floor(Math.random() * 380) };
    }

    // Sinh Cây và Mỏ Đá ngẫu nhiên (16x16)
    function generateRandomObject(type, color, existingList) {
      const size = TILE_SIZE; // 16 px
      const pos = getRandomValidPosition(size, existingList);

      const objData = {
        type: type,
        x: pos.x,
        y: pos.y,
        width: size,  // 16 px
        height: size, // 16 px
        color: color,
        lifetime: 0 // Đếm thời gian sống để dịch chuyển sau mỗi 10s
      };

      if (type === "tree") {
        objData.hp = 2; // Cần 2 nhát rìu để hạ cây
        // Đánh dấu cây đang nguyên vẹn (stage: "tree", khi chặt 1 lần biến thành "stump")
        objData.stage = "tree";
      } else if (type === "rock") {
        objData.rockType = Math.floor(Math.random() * 3); // Cột 0, 1 hoặc 2 của hàng 1
      }

      return objData;
    }

    // -------------------------------------------------------------
    // QUẢN LÝ TÁI SINH VẬT THỂ & SINH VẬT (RESPAWN VÀ TĂNG TRƯỞNG CÂY)
    // -------------------------------------------------------------
    const RESPAWN_DELAY = 10.0;     // 10 giây sau khi bị hạ sẽ xuất hiện lại ở chỗ mới
    const TREE_GROW_TIME = 8.0;     // Cây con (gốc cây stump) mọc lên sau 8 giây thành cây hoàn chỉnh
    const pendingRespawns = [];

    function scheduleObjectRespawn(type, color, isBoar = false, isChicken = false) {
      pendingRespawns.push({
        type: type,
        color: color,
        isBoar: isBoar,
        isChicken: isChicken,
        timer: RESPAWN_DELAY
      });
    }

    function updateHarvestablesRespawn(deltaTime) {
      // 1. Kiểm tra danh sách chờ tái sinh (Cây, Đá, Heo)
      if (pendingRespawns.length > 0) {
        for (let i = pendingRespawns.length - 1; i >= 0; i--) {
          const item = pendingRespawns[i];
          item.timer -= deltaTime;
          if (item.timer <= 0) {
            if (item.isBoar) {
              const newBoar = createBoar("boar_" + Date.now(), forestHarvestables);
              forestMobs.push(newBoar);
            } else if (item.isChicken) {
              const newChicken = createChicken("chicken_" + Date.now(), forestHarvestables);
              forestMobs.push(newChicken);
            } else if (item.type === "tree") {
              // TÁI SINH NGƯỢC: Cây mới xuất hiện dưới dạng GỐC CÂY (stump) trước
              const newTree = generateRandomObject("tree", item.color, forestHarvestables);
              newTree.stage = "stump";      // Bắt đầu là stump
              newTree.hp = 1;               // Nếu người chơi chặt ngay thì mất luôn gốc
              newTree.growTimer = TREE_GROW_TIME; // Đếm ngược 8 giây để lớn lên thành cây hoàn chỉnh
              forestHarvestables.push(newTree);
            } else {
              // Mỏ đá hoặc vật thể khác
              const newObj = generateRandomObject(item.type, item.color, forestHarvestables);
              forestHarvestables.push(newObj);
            }
            pendingRespawns.splice(i, 1);
            updateStatsHUD();
          }
        }
      }

      // 2. Quá trình cây lớn lên từ Gốc cây (Stump -> Tree hoàn chỉnh một cách tự nhiên trong im lặng)
      for (const obj of forestHarvestables) {
        if (obj.type === "tree" && obj.stage === "stump" && obj.growTimer !== undefined) {
          obj.growTimer -= deltaTime;
          if (obj.growTimer <= 0) {
            // Lớn lên thành cây hoàn chỉnh
            obj.stage = "tree";
            obj.hp = 2; // Khôi phục 2 nhát chặt
            delete obj.growTimer;
          }
        }
      }
    }

    // Tài nguyên ban đầu của Rừng: Ngẫu nhiên từ 5 đến 10 Cây và 5 đến 10 Mỏ Đá
    const forestHarvestables = [];
    const initialTreeCount = Math.floor(Math.random() * 6) + 5; // 5 - 10 Cây
    const initialRockCount = Math.floor(Math.random() * 6) + 5; // 5 - 10 Đá

    for (let i = 0; i < initialTreeCount; i++) {
      forestHarvestables.push(generateRandomObject("tree", "green", forestHarvestables));
    }
    for (let i = 0; i < initialRockCount; i++) {
      forestHarvestables.push(generateRandomObject("rock", "gray", forestHarvestables));
    }

    // HEO RỪNG (BOAR): Kích thước 16x16, Tốc độ 40 px/s (Yêu cầu 1 & 2)
    const forestMobs = [];

    
    // -------------------------------------------------------------
    // KHỞI TẠO VÀ QUẢN LÝ GÀ TRONG RỪNG (Chicken - 10 HP, Flee AI)
    // -------------------------------------------------------------
    function createChicken(id, existingObstacles) {
      const size = TILE_SIZE; // 16 px
      let posX = 0, posY = 0, valid = false, attempts = 0;

      while (!valid && attempts < 400) {
        attempts++;
        posX = 48 + Math.floor(Math.random() * (448 - 48 - size));
        posY = 48 + Math.floor(Math.random() * (448 - 48 - size));

        const tempRect = { x: posX, y: posY, width: size, height: size };
        if (posX < 64 && Math.abs(posY - MAP_SIZE / 2) < 40) continue;
        if (Math.abs(posX - MAP_SIZE / 2) < 32 && Math.abs(posY - MAP_SIZE / 2) < 32) continue;
        if (!isBoxOnWalkableGround(tempRect, "forest")) continue;

        let overlaps = false;
        for (const obj of existingObstacles) {
          if (checkAABB(tempRect, obj)) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) valid = true;
      }

      return {
        id: id,
        type: "chicken",
        x: posX,
        y: posY,
        width: size,           // 16 px
        height: size,          // 16 px
        color: "#fef08a",      // Màu vàng gà con
        speed: defaultStats.chicken.speed,
        fleeSpeed: defaultStats.chicken.fleeSpeed,
        maxHp: defaultStats.chicken.maxHp,
        hp: defaultStats.chicken.maxHp,
        displayHp: defaultStats.chicken.maxHp,
        state: "idle",         // "idle", "move", "flee"
        stateTimer: Math.random() * 2.0 + 1.0,
        dirX: 0,
        dirY: 0,
        facingLeft: false,
        hurtFlashTimer: 0,
        fleeTimer: 0,          // Thời gian hoảng loạn bỏ chạy
        frameX: 0,
        frameY: 0,
        isMoving: false,
        animTimer: 0
      };
    }

    function createBoar(id, existingObstacles) {
      const size = TILE_SIZE; // 16 px
      let posX = 0, posY = 0, valid = false, attempts = 0;

      while (!valid && attempts < 400) {
        attempts++;
        // Spawn trong phạm vi sân trong hàng rào
        posX = 48 + Math.floor(Math.random() * (448 - 48 - size));
        posY = 48 + Math.floor(Math.random() * (448 - 48 - size));

        const tempRect = { x: posX, y: posY, width: size, height: size };
        if (posX < 64 && Math.abs(posY - MAP_SIZE / 2) < 40) continue;
        if (Math.abs(posX - MAP_SIZE / 2) < 32 && Math.abs(posY - MAP_SIZE / 2) < 32) continue;
        if (!isBoxOnWalkableGround(tempRect, "forest")) continue;

        let overlaps = false;
        for (const obj of existingObstacles) {
          if (checkAABB(tempRect, obj)) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) valid = true;
      }

      return {
        id: id,
        type: "boar",
        x: posX,
        y: posY,
        width: size,           // 16 px
        height: size,          // 16 px
        color: "#8b0000",      // Đỏ sậm (DarkRed)
        speed: defaultStats.boar.speed,
        chaseSpeed: defaultStats.boar.speed,
        maxHp: defaultStats.boar.maxHp,
        hp: defaultStats.boar.maxHp,
        displayHp: defaultStats.boar.maxHp,
        state: "idle",         // "idle", "move", "chase", "hurt"
        stateTimer: Math.random() * 1.5 + 1.0,
        dirX: 0,
        dirY: 0,
        facingLeft: false,
        hurtFlashTimer: 0,
        attackCooldown: 0,     // Cooldown húc người chơi
        lungeProgress: 0,      // Hiệu ứng lao húc
        chaseLostTimer: 0,     // Đếm thời gian người chơi bỏ chạy không đánh trúng (tối đa 5.0s)
        giveUpCooldown: 0,     // Thời gian nghỉ sau khi từ bỏ để không lập tức quay lại đuổi (3.0s)
        // Các thuộc tính Sprite Animation cho Boar
        frameX: 0,
        frameY: 0, // 0: Xuống, 1: Lên, 2: Phải, 3: Trái
        isMoving: false,
        animTimer: 0
      };
    }

    for (let i = 0; i < 3; i++) {
      forestMobs.push(createBoar("boar_" + (i + 1), forestHarvestables));
    }
    for (let i = 0; i < 3; i++) {
      forestMobs.push(createChicken("chicken_" + (i + 1), forestHarvestables));
    }

    const homeHarvestables = [];

    // Cấu hình các Scene/Bản đồ với Cổng 16x16
    const mapConfigs = {
      home: {
        id: "home",
        name: "Nhà (Home)",
        color: "lightgreen",
        gridColor: "#86d686",
        borderColor: "#2e7d32",
        // CỔNG DỊCH CHUYỂN: Kích thước 16x16 pixel (nằm ở x: 476, y: 248)
        portal: {
          x: 476,
          y: (MAP_SIZE - TILE_SIZE) / 2, // 248 px
          width: TILE_SIZE,  // 16 px
          height: TILE_SIZE, // 16 px
          color: "yellow",
          label: "RỪNG",
          targetMap: "forest",
          targetPlayerPos: { x: 40, y: 248 } // Đưa nhân vật xuất hiện ngay đầu lối đi của Rừng
        },
        harvestables: homeHarvestables,
        mobs: []
      },
      forest: {
        id: "forest",
        name: "Rừng (Forest)",
        portalToLake: {
          x: 496,
          y: (MAP_SIZE - TILE_SIZE) / 2, // 248 px
          width: TILE_SIZE,
          height: TILE_SIZE,
          color: "#38bdf8",
          label: "HỒ",
          targetMap: "lake",
          targetPlayerPos: { x: 40, y: 248 }
        },
        color: "forestgreen",
        gridColor: "#1b662a",
        borderColor: "#14421d",
        // CỔNG DỊCH CHUYỂN: Đặt tại x = 0 ngay lối mở không có hàng rào (y: 248)
        portal: {
          x: 0, // x = 0 sát mép lối đi bên trái
          y: (MAP_SIZE - TILE_SIZE) / 2, // 248 px (hàng 15.5)
          width: TILE_SIZE,  // 16 px
          height: TILE_SIZE, // 16 px
          color: "yellow",
          label: "VỀ NHÀ",
          targetMap: "home",
          targetPlayerPos: { x: 440, y: (MAP_SIZE - TILE_SIZE) / 2 } // Trở về Nhà tại x: 440 an toàn
        },
        harvestables: forestHarvestables,
        mobs: forestMobs
      },
      lake: {
        id: "lake",
        name: "Hồ (Lake)",
        color: "#0284c7",
        gridColor: "#38bdf8",
        borderColor: "#0369a1",
        portal: {
          x: 16,
          y: (MAP_SIZE - TILE_SIZE) / 2, // 248 px
          width: TILE_SIZE,
          height: TILE_SIZE,
          color: "#4ade80",
          label: "RỪNG",
          targetMap: "forest",
          targetPlayerPos: { x: 448, y: 248 }
        },
        harvestables: [],
        mobs: []
      }
    };

    let currentObjects = [];
    let currentMobs = [];
    let currentPortal = null;

    function updateStatsHUD() {
      if (!valObjectCounts || !valMobCount) return;
      const trees = currentObjects.filter(o => o.type === "tree").length;
      const rocks = currentObjects.filter(o => o.type === "rock").length;
      const forges = homeHarvestables.filter(o => o.type === "forge").length;
      const boars = currentMobs.filter(m => m.type === "boar").length;
      const chickens = currentMobs.filter(m => m.type === "chicken").length;

      valMobCount.textContent = `${boars} Heo | ${chickens} Gà`;
      if (currentMap === "forest") {
        valObjectCounts.textContent = `${trees} Cây | ${rocks} Đá`;
      } else {
        valObjectCounts.textContent = `0 Công trình`;
      }

      // Cập nhật lại UI túi đồ nếu đang mở
      if (inventoryUI && inventoryUI.style.display === "grid") {
        syncRealResourcesToPlayerInventory();
        renderInventory();
      }
    }

    function loadMap(mapId, newPlayerPos = null) {
      resetFishingState();
      if (timeStopState.active) detonateAndResumeTimeStop(true);
      timeStopState.resumeFlashTimer = 0;
      if (isChestOpen()) toggleChestUI(false);
      wandAltarTriggerLock = false;
      currentMap = mapId;
      const config = mapConfigs[mapId];

      currentPortal = config.portal;
      currentObjects = config.harvestables;
      currentMobs = config.mobs;

      if (newPlayerPos) {
        player.x = newPlayerPos.x;
        player.y = newPlayerPos.y;
        teleportFlashOpacity = 0.5;
        if (typeof savePlayerToStorage === "function") savePlayerToStorage(true);
      }

      // -------------------------------------------------------------
      // LOGIC TÍNH CAMERA KHI CÓ HỆ SỐ ZOOM (Yêu cầu 3)
      const activeZoom = getCameraZoom();
      const visibleWidth = canvas.width / activeZoom;
      const visibleHeight = canvas.height / activeZoom;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      camera.x = playerCenterX - visibleWidth / 2;
      camera.y = playerCenterY - visibleHeight / 2;

      if (valCurrentMap) {
        if (mapId === "home") {
          valCurrentMap.textContent = "NHÀ (home)";
          valCurrentMap.className = "map-badge-home";
        } else if (mapId === "lake") {
          valCurrentMap.textContent = "HỒ (lake)";
          valCurrentMap.className = "map-badge-home";
        } else {
          valCurrentMap.textContent = "RỪNG (forest)";
          valCurrentMap.className = "map-badge-forest";
        }
      }
      updateStatsHUD();
    }

    loadMap("home");

    // -------------------------------------------------------------
    // 5. TRÍ TUỆ NHÂN TẠO WANDERING AI CHO HEO RỪNG (16x16)
    // -------------------------------------------------------------
    function checkMobCollision(box) {
      if (box.x < 0 || box.x + box.width > MAP_SIZE || box.y < 0 || box.y + box.height > MAP_SIZE) {
        return true;
      }
      // Không để heo rừng đi lên hoặc thoát ra khỏi hàng rào/nước
      if (!isBoxOnWalkableGround(box, currentMap)) {
        return true;
      }
      for (const obj of currentObjects) {
        if (checkAABB(box, obj)) {
          return true;
        }
      }
      return false;
    }

    function updateMobsAI(deltaTime) {
      if (currentMap !== "forest") return;

      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      for (let mIdx = currentMobs.length - 1; mIdx >= 0; mIdx--) {
        const mob = currentMobs[mIdx];
        // Vật lý văng ra sau khi hết Dừng Thời Gian hoặc bị đẩy mạnh
        if (mob.knockbackTimer > 0) {
          mob.knockbackTimer = Math.max(0, mob.knockbackTimer - deltaTime);
          const stepX = (mob.knockbackVx || 0) * deltaTime;
          const stepY = (mob.knockbackVy || 0) * deltaTime;
          const steps = Math.max(1, Math.ceil(Math.hypot(stepX, stepY) / 4));
          const subX = stepX / steps;
          const subY = stepY / steps;
          for (let s = 0; s < steps; s++) {
            if (subX !== 0 && !checkMobCollision({ x: mob.x + subX, y: mob.y, width: mob.width, height: mob.height })) {
              mob.x += subX;
            } else {
              mob.knockbackVx = 0;
            }
            if (subY !== 0 && !checkMobCollision({ x: mob.x, y: mob.y + subY, width: mob.width, height: mob.height })) {
              mob.y += subY;
            } else {
              mob.knockbackVy = 0;
            }
          }
          const damp = Math.pow(0.06, deltaTime);
          mob.knockbackVx *= damp;
          mob.knockbackVy *= damp;
          if (deltaTime > 0 && Math.random() < 0.6) {
            combatParticles.push({
              x: mob.x + mob.width / 2,
              y: mob.y + mob.height - 2,
              vx: (Math.random() - 0.5) * 14,
              vy: -8 - Math.random() * 12,
              size: 1.5,
              color: "#cbd5e1",
              life: 0.2,
              maxLife: 0.2,
              isSpark: true
            });
          }
        }
        // Giảm thời gian chớp đỏ bị thương
        if (mob.hurtFlashTimer > 0) {
          mob.hurtFlashTimer -= deltaTime;
        }
        if (mob.attackCooldown > 0) {
          mob.attackCooldown -= deltaTime;
        }
        if (mob.slowTimer > 0) {
          mob.slowTimer = Math.max(0, mob.slowTimer - deltaTime);
        }
        // Xử lý thiêu đốt & cháy lan diện rộng (từ Cộng Hưởng 3 Ngọc Lửa)
        if (mob.burnTimer > 0) {
          mob.burnTimer = Math.max(0, mob.burnTimer - deltaTime);
          mob.burnSparkTimer = (mob.burnSparkTimer || 0) + deltaTime;
          if (mob.burnSparkTimer >= 0.14) {
            mob.burnSparkTimer = 0;
            combatParticles.push({
              x: mob.x + 4 + Math.random() * 8,
              y: mob.y + 4 + Math.random() * 8,
              vx: (Math.random() - 0.5) * 16,
              vy: -18 - Math.random() * 18,
              size: 1.5 + Math.random() * 1.1,
              color: Math.random() > 0.45 ? "#f97316" : "#fde047",
              life: 0.24,
              maxLife: 0.24,
              isMagicMote: true
            });
          }
          mob.burnTickTimer = (mob.burnTickTimer || 0) - deltaTime;
          if (mob.burnTickTimer <= 0) {
            mob.burnTickTimer = 0.65;
            const burnDmg = 2;
            mob.hp -= burnDmg;
            if (combatFxConfig.hitFlash) {
              mob.hurtFlashTimer = Math.max(mob.hurtFlashTimer || 0, 0.05);
            }
            const mCx = mob.x + mob.width / 2;
            const mCy = mob.y + mob.height / 2;
            addFloatingText(`-${burnDmg} 🔥`, mob.x - 2, mob.y - 11, "#fb923c", false);

            // Cháy lan sang các quái vật lân cận trong bán kính 28px (khi Cộng Hưởng 3 Ngọc Viêm Hỏa)
            if (mob.burnSpread) {
              for (const other of currentMobs) {
                if (other === mob || other.hp <= 0) continue;
                const oCx = other.x + other.width / 2;
                const oCy = other.y + other.height / 2;
                if (Math.hypot(oCx - mCx, oCy - mCy) <= 28) {
                  if (!other.burnTimer || other.burnTimer <= 0.3) {
                    other.burnTimer = Math.max(other.burnTimer || 0, 2.4);
                    other.burnTickTimer = 0.55;
                    other.burnSpread = true;
                    addFloatingText("🔥 Cháy lan!", other.x - 10, other.y - 16, "#fde047", true);
                    spawnMagicHitBurst((mCx + oCx) / 2, (mCy + oCy) / 2, 0, "#f97316", "#fde047", 9);
                  } else {
                    other.burnTimer = Math.max(other.burnTimer, 1.8);
                  }
                }
              }
            }

            if (mob.hp <= 0) {
              currentMobs.splice(mIdx, 1);
              handleMobDeath(mob, mCx, mCy);
              continue;
            }
          }
        }
        if (mob.gravitySquash) {
          mob.gravitySquash.elapsed += deltaTime;
          if (mob.gravitySquash.elapsed >= mob.gravitySquash.duration) {
            mob.gravitySquash = null;
          }
        }

        if (mob.sleepTimer > 0) {
          mob.sleepTimer = Math.max(0, mob.sleepTimer - deltaTime);
          mob.isMoving = false;
          continue;
        }
        if (mob.boundTimer > 0) {
          mob.boundTimer = Math.max(0, mob.boundTimer - deltaTime);
          mob.isMoving = false;
          continue;
        }

        // Lerp thanh máu quái vật (tỷ lệ theo maxHp để tụt mượt khi máu cao)
        if (mob.displayHp > mob.hp) {
          const drainSpeed = Math.max(8, (mob.maxHp || 10) * 1.4);
          mob.displayHp = Math.max(mob.hp, mob.displayHp - deltaTime * drainSpeed);
        }

        // Bị trọng lực đè bẹp thì đứng im tại chỗ trong giai đoạn ép xuống
        if (mob.gravitySquash && mob.gravitySquash.elapsed < mob.gravitySquash.duration * 0.58) {
          mob.isMoving = false;
          continue;
        }

        const slowMult = (mob.slowTimer > 0) ? 0.5 : 1.0;
        const mobCenterX = mob.x + mob.width / 2;
        const mobCenterY = mob.y + mob.height / 2;
        const distToPlayer = Math.hypot(playerCenterX - mobCenterX, playerCenterY - mobCenterY);

        // Giảm thời gian hồi phục sau khi từ bỏ đuổi (để quái đi tuần tra bình tĩnh)
        if (mob.giveUpCooldown > 0) {
          mob.giveUpCooldown -= deltaTime;
        }

        
        // === XỬ LÝ RIÊNG CHO GÀ (CHICKEN AI - PACIFIST & FLEE) ===
        if (mob.type === "chicken") {
          // Nếu bị đánh trúng hoặc người chơi tới quá sát (< 45px), gà sẽ hoảng loạn chạy trốn
          if (mob.hurtFlashTimer > 0) {
            mob.fleeTimer = 3.5; // Chạy thục mạng 3.5s
          } else if (distToPlayer < 45 && mob.fleeTimer <= 0) {
            mob.fleeTimer = 2.0; // Hoảng hốt chạy 2.0s
          }

          if (mob.fleeTimer > 0) {
            mob.fleeTimer -= deltaTime;
            mob.state = "flee";
            mob.isMoving = true;

            // Chạy NGƯỢC HƯỚNG người chơi (Flee)
            const awayAngle = Math.atan2(mobCenterY - playerCenterY, mobCenterX - playerCenterX);
            mob.dirX = Math.cos(awayAngle);
            mob.dirY = Math.sin(awayAngle);

            mob.animTimer = (mob.animTimer || 0) + deltaTime;
            if (mob.animTimer >= 0.07) {
              mob.frameX = (mob.frameX + 1) % 4;
              mob.animTimer = 0;
            }

            if (Math.abs(mob.dirX) > Math.abs(mob.dirY)) {
              mob.frameY = mob.dirX > 0 ? 3 : 2;
              mob.facingLeft = mob.dirX < 0;
            } else {
              mob.frameY = mob.dirY > 0 ? 1 : 0;
            }

            const stepX = mob.dirX * mob.fleeSpeed * slowMult * deltaTime;
            const stepY = mob.dirY * mob.fleeSpeed * slowMult * deltaTime;
            const nbX = { x: mob.x + stepX, y: mob.y, width: mob.width, height: mob.height };
            if (!checkMobCollision(nbX)) mob.x = nbX.x;
            const nbY = { x: mob.x, y: mob.y + stepY, width: mob.width, height: mob.height };
            if (!checkMobCollision(nbY)) mob.y = nbY.y;
            continue;
          }

          // Đi dạo mổ thóc bình thường
          mob.stateTimer -= deltaTime;
          if (mob.stateTimer <= 0) {
            if (mob.state === "move") {
              mob.state = "idle";
              mob.stateTimer = Math.random() * 2.0 + 1.0;
              mob.dirX = 0; mob.dirY = 0;
              mob.isMoving = false;
              mob.frameX = 0;
            } else {
              mob.state = "move";
              mob.stateTimer = Math.random() * 2.0 + 1.0;
              mob.isMoving = true;
              const angle = Math.random() * Math.PI * 2;
              mob.dirX = Math.cos(angle);
              mob.dirY = Math.sin(angle);
              if (Math.abs(mob.dirX) > Math.abs(mob.dirY)) {
                mob.frameY = mob.dirX > 0 ? 3 : 2;
                mob.facingLeft = mob.dirX < 0;
              } else {
                mob.frameY = mob.dirY > 0 ? 1 : 0;
              }
            }
          }

          if (mob.state === "move") {
            mob.animTimer = (mob.animTimer || 0) + deltaTime;
            if (mob.animTimer >= 0.14) {
              mob.frameX = (mob.frameX + 1) % 4;
              mob.animTimer = 0;
            }
            const sX = mob.dirX * mob.speed * slowMult * deltaTime;
            const sY = mob.dirY * mob.speed * slowMult * deltaTime;
            const bX = { x: mob.x + sX, y: mob.y, width: mob.width, height: mob.height };
            if (!checkMobCollision(bX)) mob.x = bX.x;
            const bY = { x: mob.x, y: mob.y + sY, width: mob.width, height: mob.height };
            if (!checkMobCollision(bY)) mob.y = bY.y;
          }
          continue;
        }

        // --- CƠ CHẾ ĐUỔI THEO NGƯỜI CHƠI (CHASE AI) ---
        const isEnraged = mob.hp < mob.maxHp;
        const detectionRadius = isEnraged ? 110 : 65;

        // Quái chỉ đuổi nếu phát hiện người chơi, còn sống và không ở trong thời gian vừa từ bỏ
        if (distToPlayer <= detectionRadius && player.action !== 'die' && (mob.giveUpCooldown || 0) <= 0) {
          mob.state = "chase";
          mob.isMoving = true;

          // Hướng về phía người chơi
          const angle = Math.atan2(playerCenterY - mobCenterY, playerCenterX - mobCenterX);
          mob.dirX = Math.cos(angle);
          mob.dirY = Math.sin(angle);

          // Cập nhật hoạt ảnh chạy đuổi
          mob.animTimer = (mob.animTimer || 0) + deltaTime;
          if (mob.animTimer >= 0.08) {
            mob.frameX = (mob.frameX + 1) % 4;
            mob.animTimer = 0;
          }

          // Hướng quay mặt
          if (Math.abs(mob.dirX) > Math.abs(mob.dirY)) {
            mob.frameY = mob.dirX > 0 ? 2 : 3;
            mob.facingLeft = mob.dirX < 0;
          } else {
            mob.frameY = mob.dirY > 0 ? 0 : 1;
          }

          // Giảm hiệu ứng lao húc lướt chậm lại
          if (mob.lungeProgress > 0) {
            mob.lungeProgress -= deltaTime * 2.2;
            if (mob.lungeProgress < 0) mob.lungeProgress = 0;
          }

          // Di chuyển theo tốc độ đuổi nhưng giữ khoảng cách an toàn (20px), không dính đè người chơi
          const STOP_DISTANCE = 20;
          if (distToPlayer > STOP_DISTANCE) {
            const moveStepX = mob.dirX * mob.chaseSpeed * slowMult * deltaTime;
            const moveStepY = mob.dirY * mob.chaseSpeed * slowMult * deltaTime;

            const nextBoxX = { x: mob.x + moveStepX, y: mob.y, width: mob.width, height: mob.height };
            if (!checkMobCollision(nextBoxX)) mob.x = nextBoxX.x;

            const nextBoxY = { x: mob.x, y: mob.y + moveStepY, width: mob.width, height: mob.height };
            if (!checkMobCollision(nextBoxY)) mob.y = nextBoxY.y;

            // Người chơi đang bỏ chạy ngoài tầm đánh: Tăng bộ đếm thời gian truy đuổi không thành công
            mob.chaseLostTimer = (mob.chaseLostTimer || 0) + deltaTime;
          } else {
            // Đã áp sát trong cự ly tấn công 20px
            mob.isMoving = false;
          }

          // Nếu người chơi bỏ chạy quá 5 giây mà quái không thể đánh trúng:
          // -> TỪ BỎ TRUY ĐUỔI, quay trở lại trạng thái tuần tra (Patrol / Idle / Walk)
          if ((mob.chaseLostTimer || 0) >= 5.0) {
            mob.state = "idle";
            mob.stateTimer = 2.5;        // Đứng lại bình tĩnh 2.5s
            mob.chaseLostTimer = 0;      // Reset bộ đếm
            mob.giveUpCooldown = 4.0;    // Nghỉ 4s không đuổi lại
            mob.dirX = 0;
            mob.dirY = 0;
            mob.isMoving = false;
            continue;
          }

          // --- GÂY SÁT THƯƠNG CHO NGƯỜI CHƠI (KHI ÁP SÁT ĐỦ GẦN) ---
          if (distToPlayer <= 22 && mob.attackCooldown <= 0) {
            mob.attackCooldown = defaultStats.boar.attackInterval || 1.2;
            mob.lungeProgress = 1.0;
            mob.chaseLostTimer = 0; // Đánh trúng người chơi -> reset timer 5s
            damagePlayer(defaultStats.boar.attackDamage || 8, mobCenterX, mobCenterY, 20);
            spawnHitSparks(playerCenterX, playerCenterY, angle);
            playImpactSound(false);
          }
          continue;
        }

        // --- NẾU NGOÀI TẦM ĐUỔI: ĐI LANG THANG BÌNH THƯỜNG ---
        if (mob.state === "chase") {
          mob.state = "idle";
          mob.stateTimer = 1.0;
          mob.dirX = 0;
          mob.dirY = 0;
          mob.isMoving = false;
        }

        mob.stateTimer -= deltaTime;
        if (mob.stateTimer <= 0) {
          if (mob.state === "move") {
            mob.state = "idle";
            mob.stateTimer = Math.random() * 1.5 + 1.0;
            mob.dirX = 0;
            mob.dirY = 0;
            mob.isMoving = false;
            mob.frameX = 0;
          } else {
            mob.state = "move";
            mob.stateTimer = Math.random() * 2.0 + 1.0;
            mob.isMoving = true;

            const angle = Math.random() * Math.PI * 2;
            mob.dirX = Math.cos(angle);
            mob.dirY = Math.sin(angle);

            if (Math.abs(mob.dirX) > Math.abs(mob.dirY)) {
              mob.frameY = mob.dirX > 0 ? 2 : 3;
              mob.facingLeft = mob.dirX < 0;
            } else {
              mob.frameY = mob.dirY > 0 ? 0 : 1;
            }
          }
        }

        if (mob.state === "move") {
          mob.animTimer = (mob.animTimer || 0) + deltaTime;
          if (mob.animTimer >= 0.12) {
            mob.frameX = (mob.frameX + 1) % 4;
            mob.animTimer = 0;
          }

          const moveStepX = mob.dirX * mob.speed * deltaTime;
          const moveStepY = mob.dirY * mob.speed * deltaTime;
          let hitObstacle = false;

          const nextBoxX = { x: mob.x + moveStepX, y: mob.y, width: mob.width, height: mob.height };
          if (!checkMobCollision(nextBoxX)) {
            mob.x = nextBoxX.x;
          } else {
            mob.dirX = -mob.dirX;
            hitObstacle = true;
          }

          const nextBoxY = { x: mob.x, y: mob.y + moveStepY, width: mob.width, height: mob.height };
          if (!checkMobCollision(nextBoxY)) {
            mob.y = nextBoxY.y;
          } else {
            mob.dirY = -mob.dirY;
            hitObstacle = true;
          }

          if (hitObstacle) {
            const newAngle = Math.random() * Math.PI * 2;
            mob.dirX = Math.cos(newAngle);
            mob.dirY = Math.sin(newAngle);

            if (Math.abs(mob.dirX) > Math.abs(mob.dirY)) {
              mob.frameY = mob.dirX > 0 ? 2 : 3;
            } else {
              mob.frameY = mob.dirY > 0 ? 0 : 1;
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // HỆ THỐNG CHIẾN ĐẤU & MÁU (COMBAT & HP SYSTEM)
    // -------------------------------------------------------------
    function damagePlayer(amount, fromX = null, fromY = null, customKnockback = null) {
      if (player.action === 'die' || player.invulnerableTimer > 0) return;
      resetFishingState();

      playerOutOfCombatTimer = 0;

      // Hiệu ứng Giáp Kim Cương: giảm 5 DMG nhận (tối thiểu vẫn còn 1 DMG thô)
      let incomingAmount = amount;
      const chestId = (playerEquipment[1] && (getItemData(playerEquipment[1]) || playerEquipment[1]).id) || "";
      if (chestId === "diamond_chest" && incomingAmount > 1) {
        incomingAmount = Math.max(1, incomingAmount - 5);
      }

      let finalDamageToHp = incomingAmount;
      let damageAbsorbedByArmor = 0;

      // CƠ CHẾ HẤP THỤ SÁT THƯƠNG CỦA THANH GIÁP
      if (playerArmor > 0) {
        // Giáp hấp thụ 70% sát thương, máu gánh 30%
        const potentialArmorAbsorb = Math.ceil(incomingAmount * 0.7);
        damageAbsorbedByArmor = Math.min(playerArmor, potentialArmorAbsorb);
        playerArmor -= damageAbsorbedByArmor;

        finalDamageToHp = incomingAmount - damageAbsorbedByArmor;
        if (finalDamageToHp < 1) finalDamageToHp = 1; // Luôn trừ tối thiểu 1 HP

        // Trừ nhẹ độ bền của các món giáp đang mặc khi hấp thụ sát thương
        for (let eq = 0; eq < 4; eq++) {
          if (playerEquipment[eq] && playerEquipment[eq].durability !== undefined) {
            playerEquipment[eq].durability -= 1;
            if (playerEquipment[eq].durability <= 0) {
              playerEquipment[eq].durability = 0;
            }
          }
        }
        renderEquipmentSlots();
      }

      player.hp = Math.max(0, player.hp - finalDamageToHp);
      player.hurtFlashTimer = 0.12;      // Giảm thời gian chớp đỏ xuống 0.12s (nhanh, bớt lòe loẹt)
      player.invulnerableTimer = 0.8;    // Bất tử tạm thời 0.8s để không bị dồn damage

      // Hiệu ứng giật lùi (Knockback) rõ rệt khi bị heo húc
      if (fromX !== null && fromY !== null) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const kbAngle = Math.atan2(playerCenterY - fromY, playerCenterX - fromX);
        const resist = player.knockbackResist || 0;
        const kbDist = (customKnockback !== null ? customKnockback : 16) * (1 - resist);
        const nextX = player.x + Math.cos(kbAngle) * kbDist;
        const nextY = player.y + Math.sin(kbAngle) * kbDist;
        const kbBox = { x: nextX, y: nextY, width: player.width, height: player.height };
        if (!willPlayerCollide(kbBox)) {
          player.x = nextX;
          player.y = nextY;
        }
      }

      // Pop-up sát thương
      const dmgLabel = damageAbsorbedByArmor > 0
        ? `-${finalDamageToHp} HP (-${damageAbsorbedByArmor} 🛡️)`
        : `-${finalDamageToHp} HP`;
      addFloatingText(dmgLabel, player.x - 4, player.y - 12, "#ef4444", true);

      if (valPlayerHP) {
        valPlayerHP.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
      }

      // Kiểm tra người chơi tử trận
      if (player.hp <= 0) {
        handlePlayerDeath();
      }
    }

    function handlePlayerDeath() {
      player.action = 'die';
      player.frameX = 0;
      player.animTimer = 0;
      showNotification("💀 Bạn đã bị hạ gục! Đang hồi sinh về Nhà...", true);

      // Sau 2.5s hồi sinh về Nhà đầy máu
      setTimeout(() => {
        loadMap("home", { x: (MAP_SIZE - TILE_SIZE) / 2, y: (MAP_SIZE - TILE_SIZE) / 2 + 20 });
        player.hp = player.maxHp;
        player.displayHp = player.maxHp;
        playerArmor = playerMaxArmor;
        playerDisplayArmor = playerMaxArmor;
        playerOutOfCombatTimer = 0;
        player.action = 'idle';
        player.direction = 'down';
        player.frameX = 0;
        if (valPlayerHP) {
          valPlayerHP.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
        }
      }, 2500);
    }

    // -------------------------------------------------------------
    // 6. LOGIC HÀNH ĐỘNG: KHAI THÁC & SĂN BẮN
    // -------------------------------------------------------------
    // Hàm đặt vật phẩm (Bàn Chế Tạo) xuống mặt đất ngay trước mặt người chơi
        let hoverTileX = null;
    let hoverTileY = null;

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const zoom = getCameraZoom();
      const wx = (e.clientX - rect.left) / zoom + camera.x;
      const wy = (e.clientY - rect.top) / zoom + camera.y;
      hoverTileX = Math.floor(wx / TILE_SIZE) * TILE_SIZE;
      hoverTileY = Math.floor(wy / TILE_SIZE) * TILE_SIZE;
    });

    function isTilePlaceable(tx, ty) {
      const dist = Math.hypot((tx + 8) - (player.x + 8), (ty + 8) - (player.y + 8));
      if (dist > TILE_SIZE * 1.55) return false;
      const box = { x: tx, y: ty, width: TILE_SIZE, height: TILE_SIZE };
      // Dùng hitbox thu gọn (10x10) ở tâm nhân vật để không chặn nhầm các ô liền kề/góc chéo
      const pInner = { x: player.x + 3, y: player.y + 4, width: 10, height: 10 };
      if (checkAABB(box, pInner)) return false;
      if (!isBoxOnWalkableGround(box)) return false;
      if (currentMap === "lake" && lakeLandGrid) {
        const gx = Math.floor(tx / TILE_SIZE), gy = Math.floor(ty / TILE_SIZE);
        if (gy < 0 || gy >= lakeLandGrid.length || gx < 0 || gx >= lakeLandGrid[0].length || !lakeLandGrid[gy][gx]) return false;
      }
      if (currentMap === "home") {
        const cfBox = { x: HOME_CAMPFIRE.x - 8, y: HOME_CAMPFIRE.y - 6, width: 16, height: 14 };
        if (checkAABB(box, HOME_MERCHANT)) return false;
        if (checkAABB(box, cfBox)) return false;
      }
      for (const obj of currentObjects) {
        if (checkAABB(box, { x: obj.x, y: obj.y, width: obj.width || 16, height: obj.height || 16 })) return false;
      }
      return true;
    }

    function tryPlaceCraftingTable(slotIdx) {
      // Ưu tiên đặt tại ô chuột đang trỏ nếu nằm trong bán kính 2 ô hợp lệ
      let placeX = Math.round(player.x / 16) * 16;
      let placeY = Math.round(player.y / 16) * 16;

      if (hoverTileX !== null && hoverTileY !== null && isTilePlaceable(hoverTileX, hoverTileY)) {
        placeX = hoverTileX;
        placeY = hoverTileY;
      } else {
        if (playerFacing === 'right') placeX += 16;
        else if (playerFacing === 'left') placeX -= 16;
        else if (playerFacing === 'down') placeY += 16;
        else if (playerFacing === 'up') placeY -= 16;
      }

      const placeBox = { x: placeX, y: placeY, width: 16, height: 16 };

      // Kiểm tra mặt đất đi được
      if (!isBoxOnWalkableGround(placeBox)) {
                return false;
      }

      // Kiểm tra không đặt đè lên vị trí Player đang đứng
      const playerBody = { x: player.x, y: player.y, width: 16, height: 16 };
      if (checkAABB(placeBox, playerBody)) {
                return false;
      }

      // Kiểm tra trùng lặp với vật thể khác
      for (const o of currentObjects) {
        if (checkAABB(placeBox, o)) {
                    return false;
        }
      }

      // Tiêu hao 1 bàn chế tạo trên tay
      const item = playerInventory[slotIdx];
      item.quantity -= 1;
      if (item.quantity <= 0) {
        playerInventory[slotIdx] = null;
      }
      renderHotbar();

      // Thêm thực thể Bàn Chế Tạo vào map hiện tại
      const newTable = {
        type: "crafting_table",
        x: placeX,
        y: placeY,
        width: 16,
        height: 16,
        name: "Bàn Chế Tạo"
      };

      currentObjects.push(newTable);
      playImpactSound(false);
      spawnHitSparks(placeX + 8, placeY + 8, -Math.PI / 2);
            showNotification("✨ Đã đặt Bàn Chế Tạo! Đứng gần bấm [E] hoặc [Chuột Phải] để mở.", false);
      updateStatsHUD();
      if (typeof savePlayerToStorage === "function") savePlayerToStorage(true);
      return true;
    }

    // Đặt Rương Đồ (27 ô chứa) xuống mặt đất
    function tryPlaceChest(slotIdx, overrideX = null, overrideY = null) {
      let placeX = overrideX !== null ? overrideX : Math.round(player.x / 16) * 16;
      let placeY = overrideY !== null ? overrideY : Math.round(player.y / 16) * 16;

      if (overrideX === null || overrideY === null) {
        if (playerFacing === 'right') placeX += 16;
        else if (playerFacing === 'left') placeX -= 16;
        else if (playerFacing === 'down') placeY += 16;
        else if (playerFacing === 'up') placeY -= 16;
      }

      const placeBox = { x: placeX, y: placeY, width: 16, height: 16 };
      if (!isBoxOnWalkableGround(placeBox)) {
                return false;
      }
      const playerBody = { x: player.x, y: player.y, width: 16, height: 16 };
      if (checkAABB(placeBox, playerBody)) {
                return false;
      }
      for (const o of currentObjects) {
        if (checkAABB(placeBox, o)) {
                    return false;
        }
      }

      const item = playerInventory[slotIdx];
      if (!item || item.id !== "chest") return false;
      item.quantity -= 1;
      if (item.quantity <= 0) {
        playerInventory[slotIdx] = null;
      }
      renderHotbar();

      const newChest = {
        type: "chest",
        x: placeX,
        y: placeY,
        width: 16,
        height: 16,
        name: "Rương Đồ",
        items: new Array(27).fill(null)
      };

      currentObjects.push(newChest);
      playImpactSound(false);
      spawnHitSparks(placeX + 8, placeY + 8, -Math.PI / 2);
            showNotification("✨ Đã đặt Rương Đồ! Đứng gần bấm [E] hoặc [Chuột Phải] để cất đồ.", false);
      updateStatsHUD();
      if (typeof savePlayerToStorage === "function") savePlayerToStorage(true);
      return true;
    }
    window.tryPlaceChest = tryPlaceChest;

    
    // Tính thời gian yêu cầu và trạng thái công cụ cho Cây (tree) hoặc Đá (rock)
    function getHarvestInfo(targetObj) {
      if (!targetObj) return { time: 1.0, status: 'hand', durabilityCost: 0 };
      const equipped = playerInventory[activeHotbarIndex];
      const id = (equipped && equipped.id) || "";

      // 1. KHAI THÁC CÂY (WOODCUTTING)
      if (targetObj.type === "tree") {
        if (!equipped) {
          return { time: 3.0, status: 'hand', durabilityCost: 0 };
        }
        if (id.includes("axe")) {
          // Đúng công cụ: Rìu
          let time = 1.5;
          if (id.includes("diamond")) time = 0.30;
          else if (id.includes("gold")) time = 0.45;
          else if (id.includes("iron")) time = 0.65;
          else if (id.includes("stone")) time = 1.0;
          return { time, status: 'correct', durabilityCost: 1 };
        } else if (id.includes("sword") || id.includes("pickaxe")) {
          // Sai công cụ: Dùng Kiếm hoặc Cúp chặt cây -> Lâu & Phạt trừ 2 độ bền
          return { time: 2.2, status: 'wrong', durabilityCost: 2 };
        } else {
          return { time: 3.0, status: 'hand', durabilityCost: 0 };
        }
      }

      // 2. KHAI THÁC ĐÁ / KHOÁNG SẢN (MINING)
      if (targetObj.type === "rock") {
        if (!equipped) {
          return { time: 4.0, status: 'hand', durabilityCost: 0 };
        }
        if (id.includes("pickaxe")) {
          // Đúng công cụ: Cúp đào khoáng
          let time = 2.0;
          if (id.includes("diamond")) time = 0.35;
          else if (id.includes("gold")) time = 0.55;
          else if (id.includes("iron")) time = 0.80;
          else if (id.includes("stone")) time = 1.30;
          return { time, status: 'correct', durabilityCost: 1 };
        } else if (id.includes("sword") || id.includes("axe")) {
          // Sai công cụ: Dùng Kiếm hoặc Rìu đập đá -> Lâu 3.0s & Phạt trừ 2 độ bền
          return { time: 3.0, status: 'wrong', durabilityCost: 2 };
        } else {
          return { time: 4.0, status: 'hand', durabilityCost: 0 };
        }
      }

      return { time: 1.0, status: 'hand', durabilityCost: 0 };
    }

    // Thực thi hoàn thành khai thác Cây hoặc Đá
    
    function handleMobDeath(mob, mCenterX, mCenterY) {
      spawnDeathPop(mCenterX, mCenterY, mob.color || "#8b0000");
      if (mob.type === "chicken") {
        // Gà rớt lông vũ + thịt gà sống
        pickupItem({ id: "feather", name: "Lông Vũ", quantity: Math.floor(Math.random() * 2) + 1 });
        pickupItem({ id: "chicken_unripe", name: "Thịt Gà Sống", quantity: 1 });
        addFloatingText("+1 THỊT GÀ 🍗", mob.x - 4, mob.y - 14, "#fef08a", true);
        if (Math.random() < 0.18) {
          const dropGem = Math.random() < 0.5 ? ITEMS_DATABASE.gem_haste : ITEMS_DATABASE.gem_crit;
          pickupItem({ id: dropGem.id, name: dropGem.name, quantity: 1 });
          addFloatingText(`💎 +1 ${dropGem.name.toUpperCase()}!`, mob.x - 16, mob.y - 26, "#22d3ee", true);
        }
        scheduleObjectRespawn("chicken", mob.color, false, true);
      } else {
        // Heo rừng rớt da thú + thịt heo sống + cơ hội rơi Ngọc Trọng Lực hoặc Ngọc Khảm
        pickupItem({ id: "leather_hide", name: "Da Thú", quantity: 1 });
        pickupItem({ id: "boar_unripe", name: "Thịt Heo Sống", quantity: 1 });
        addFloatingText("+1 DA THÚ & THỊT HEO 🥩", mob.x - 4, mob.y - 14, "#ffedd5", true);
        const dropRoll = Math.random();
        if (dropRoll < 0.14) {
          pickupItem({ id: "spell_gravity", name: SPELLS_DATABASE.spell_gravity.name, quantity: 1 });
          addFloatingText("⬇ +1 NGỌC TRỌNG LỰC!", mob.x - 20, mob.y - 26, "#c084fc", true);
        } else if (dropRoll < 0.28) {
          pickupItem({ id: "gem_fire", name: ITEMS_DATABASE.gem_fire.name, quantity: 1 });
          addFloatingText("🔥 +1 NGỌC VIÊM HỎA!", mob.x - 20, mob.y - 26, "#fb923c", true);
        } else if (dropRoll < 0.42) {
          pickupItem({ id: "gem_damage", name: ITEMS_DATABASE.gem_damage.name, quantity: 1 });
          addFloatingText("⚔️ +1 NGỌC SỨC MẠNH!", mob.x - 20, mob.y - 26, "#f87171", true);
        } else if (dropRoll < 0.50) {
          pickupItem({ id: "gem_vampire", name: ITEMS_DATABASE.gem_vampire.name, quantity: 1 });
          addFloatingText("🩸 +1 NGỌC HÚT MÁU!", mob.x - 20, mob.y - 26, "#e879f9", true);
        }
        scheduleObjectRespawn("boar", mob.color || "#8b0000", true, false);
      }
      updateStatsHUD();
    }

    function executeHarvestComplete(target) {
      if (!target) return;
      const info = getHarvestInfo(target);

      // Trừ độ bền tương ứng (1 nếu dùng đúng công cụ, 2 nếu dùng sai công cụ như kiếm/cúp/rìu)
      if (info.durabilityCost > 0) {
        for (let d = 0; d < info.durabilityCost; d++) {
          degradeEquippedItem(activeHotbarIndex);
        }
      }

      // A. HOÀN THÀNH CHẶT CÂY (TREE)
      if (target.type === "tree") {
        if (!target.hp) target.hp = 2;

        if (target.hp === 2) {
          // Nhát 1: Cây ngã thành Gốc cây
          target.hp = 1;
          target.stage = "stump";
          target.growTimer = TREE_GROW_TIME;
          inventory.wood += 1;
          pickupItem({ id: "wood_log", name: "Khúc Gỗ", quantity: 1 });
          addFloatingText("+1 KHÚC GỖ 🪵", target.x - 4, target.y - 14, "#4ade80", true);

          if (Math.random() < 0.6) {
            pickupItem({ id: "wooden_stick", name: "Cành Cây", quantity: 1 });
            addFloatingText("+1 CÀNH CÂY 🌿", target.x - 4, target.y - 24, "#a3e635", true);
          }
          if (Math.random() < 0.3) {
            pickupItem({ id: "plant_seeds", name: "Hạt Giống Cây", quantity: 1 });
            addFloatingText("+1 HẠT GIỐNG 🌱", target.x - 4, target.y - 34, "#86efac", true);
          }

          playImpactSound(false);
          spawnHitSparks(target.x + 8, target.y + 8, -Math.PI / 2);
          triggerHitJuice(3, 40);
        } else if (target.hp === 1) {
          // Nhát 2: Chặt gốc cây nhận thêm gỗ & sợi dây gai
          const removedType = target.type;
          const removedColor = target.color || "#15803d";
          const idx = currentObjects.indexOf(target);
          if (idx !== -1) currentObjects.splice(idx, 1);

          inventory.wood += 1;
          pickupItem({ id: "wood_log", name: "Khúc Gỗ", quantity: 1 });
          addFloatingText("+1 KHÚC GỖ 🪵", target.x - 4, target.y - 14, "#4ade80", true);

          if (Math.random() < 0.5) {
            pickupItem({ id: "plant_fiber", name: "Sợi Dây Gai", quantity: 1 });
            addFloatingText("+1 DÂY GAI 🌾", target.x - 4, target.y - 24, "#facc15", true);
          }

          playImpactSound(false);
          spawnDeathPop(target.x + 8, target.y + 8, "#854d0e");
          triggerHitJuice(3, 40);
          scheduleObjectRespawn(removedType, removedColor);
        }
      }

      // B. HOÀN THÀNH ĐÀO ĐÁ (ROCK)
      else if (target.type === "rock") {
        const removedType = target.type;
        const removedColor = target.color || "#64748b";
        const idx = currentObjects.indexOf(target);
        if (idx !== -1) currentObjects.splice(idx, 1);

        inventory.stone += 1;
        pickupItem({ id: "stone_rock", name: "Đá Cuội", quantity: 1 });
        addFloatingText("+1 ĐÁ CUỘI 🪨", target.x - 4, target.y - 14, "#e2e8f0", true);

        // Chỉ rơi quặng khi dùng đúng Cúp (Pickaxe)
        if (info.status === 'correct') {
          const equipped = playerInventory[activeHotbarIndex];
          const eqId = (equipped && equipped.id) || "";
          const rand = Math.random();

          // Rơi quặng quý (Kim Cương & Vàng) nếu dùng cúp xịn
          if (eqId.includes("diamond") && rand < 0.08) {
            pickupItem({ id: "diamond", name: "Kim Cương", quantity: 1 });
            addFloatingText("💎 +1 KIM CƯƠNG!", target.x - 4, target.y - 24, "#38bdf8", true);
          } else if (rand < 0.08) {
            pickupItem({ id: "gold_ore", name: "Quặng Vàng", quantity: 1 });
            addFloatingText("✨ +1 QUẶNG VÀNG!", target.x - 4, target.y - 24, "#facc15", true);
          } else if (rand < 0.25) {
            pickupItem({ id: "iron_ore", name: "Quặng Sắt", quantity: 1 });
            addFloatingText("+1 QUẶNG SẮT ⚙️", target.x - 4, target.y - 24, "#cbd5e1", true);
          } else if (rand < 0.50) {
            pickupItem({ id: "copper_ore", name: "Quặng Đồng", quantity: 1 });
            addFloatingText("+1 QUẶNG ĐỒNG 🥉", target.x - 4, target.y - 24, "#fb923c", true);
          } else if (rand < 0.85) {
            pickupItem({ id: "coal", name: "Than Đá", quantity: 1 });
            addFloatingText("+1 THAN ĐÁ ⬛", target.x - 4, target.y - 24, "#94a3b8", true);
          }

          if (Math.random() < 0.10) {
            pickupItem({ id: "spell_gravity", name: SPELLS_DATABASE.spell_gravity.name, quantity: 1 });
            addFloatingText("⬇ +1 NGỌC TRỌNG LỰC!", target.x - 16, target.y - 36, "#c084fc", true);
          } else if (Math.random() < 0.08) {
            pickupItem({ id: "gem_damage", name: ITEMS_DATABASE.gem_damage.name, quantity: 1 });
            addFloatingText("💎 +1 NGỌC SỨC MẠNH!", target.x - 16, target.y - 36, "#f87171", true);
          }
        }

        playImpactSound(true);
        spawnDeathPop(target.x + 8, target.y + 8, "#94a3b8");
        triggerHitJuice(4, 50);
        scheduleObjectRespawn(removedType, removedColor);
      }

      updateStatsHUD();
    }

    function castDefaultWandBasicOrb(tipX, tipY, castAngle, gemBonuses = null) {
      const cosA = Math.cos(castAngle);
      const sinA = Math.sin(castAngle);
      const gb = gemBonuses || {};
      const speed = 270;
      activeProjectiles.push({
        x: tipX, y: tipY,
        vx: cosA * speed, vy: sinA * speed,
        angle: castAngle,
        damage: 4 + (gb.damageBonus || 0),
        traveled: 0, maxRange: 260,
        width: 10, height: 10,
        trailTimer: 0,
        isMagicOrb: true,
        critChance: gb.critChance || 0,
        gemBurn: (gb.burnStacks || 0) > 0,
        gemBurnSpread: Boolean(gb.burnSpread),
        gemFrost: (gb.frostStacks || 0) > 0,
        gemFrostSpread: Boolean(gb.frostSpread),
        gemVampire: gb.vampirePct || 0
      });
      spawnMagicCastVfx(tipX, tipY, castAngle);
      playMagicCastSound();
    }

    function castSingleWandSpell(spellId, tipX, tipY, castAngle, clickWorldPos = null, gemBonuses = null) {
      if (spellId === "spell_gravity") {
        spawnMagicCastVfx(tipX, tipY, castAngle, "#a855f7", "#f0abfc", 10);
        castGravitySpell(castAngle, clickWorldPos, gemBonuses);
        playSpellCastSound("spell_gravity");
        return;
      }
      if (spellId === "spell_wood") {
        spawnMagicCastVfx(tipX, tipY, castAngle, "#22c55e", "#86efac", 12);
        castWoodSpell(castAngle, clickWorldPos, gemBonuses);
        playSpellCastSound("spell_wood");
        return;
      }
      if (spellId === "spell_timestop") {
        spawnMagicCastVfx(tipX, tipY, castAngle, "#38bdf8", "#bae6fd", 12);
        castTimestopSpell(castAngle, clickWorldPos, gemBonuses);
        playSpellCastSound("spell_timestop");
        return;
      }

      // Đòn đánh thường mặc định của Đũa Phép (Cầu Năng Lượng Tím + chỉ số Ngọc khảm)
      castDefaultWandBasicOrb(tipX, tipY, castAngle, gemBonuses);
    }

    function computeWandCastTip(castAngle) {
      const walkBobs = [-2, -1, 0, -2, -1, 0];
      const bobY = (player.action === 'walk') ? walkBobs[player.frameX % 6] : 0;
      const { handX, handY, cosA, sinA } = getWandHandAnchor(castAngle, bobY);
      const depthScale = 1.0 - Math.abs(sinA) * 0.24;
      const tipDist = 14.5 * depthScale + 2.5;
      return {
        tipX: handX + cosA * tipDist,
        tipY: handY + sinA * tipDist
      };
    }

    window.castWandSkillSlot = function (slotIdx, useCursorAim = false) {
      if (isPaused || player.action === 'die') return false;
      const wand = getActiveWandItem();
      if (!wand) return false;
      const wd = ensureWandData(wand);
      if (slotIdx < 0 || slotIdx >= 3) return false;

      const spellId = wd.slots[slotIdx];
      if (!spellId || !SPELLS_DATABASE[spellId]) {
        openWandCustomizer(true, wand, slotIdx);
        return false;
      }

      if (wandSkillCooldowns[slotIdx] > 0) {
        return false;
      }

      let rawAngle = getPlayerAimVector().angle;
      let aimWorldPos = null;
      if (useCursorAim && lastCanvasMouseWorld && !isMobileMode()) {
        const dx = lastCanvasMouseWorld.x - (player.x + player.width / 2);
        const dy = lastCanvasMouseWorld.y - (player.y + player.height / 2);
        if (Math.hypot(dx, dy) > 4) {
          rawAngle = Math.atan2(dy, dx);
          aimWorldPos = { x: lastCanvasMouseWorld.x, y: lastCanvasMouseWorld.y };
        }
      }

      const snapped = snapTo8Directions(rawAngle);
      wandCastAngle = snapped;
      lastAimAngle = snapped;
      playerFacing = angleToPlayerFacing(snapped);
      player.direction = playerFacing;
      wandCastTimer = WAND_CAST_DURATION;

      const { tipX, tipY } = computeWandCastTip(snapped);
      const sp = SPELLS_DATABASE[spellId];
      const gemBonuses = getWandGemBonuses(wand);
      castSingleWandSpell(spellId, tipX, tipY, snapped, aimWorldPos, gemBonuses);
      const rawCd = sp.cooldown || 0.92;
      wandSkillCooldowns[slotIdx] = Math.max(0.25, rawCd * gemBonuses.cooldownMult);
      wandSkillMaxCooldowns[slotIdx] = wandSkillCooldowns[slotIdx];

      degradeEquippedItem(activeHotbarIndex);
      if (window.onMobileHudSync) window.onMobileHudSync();
      return true;
    };

    window.getWandSkillButtonsState = function () {
      const wand = getActiveWandItem();
      if (!wand) {
        return { isWand: false, basicCd: player.attackCooldown || 0, slots: [], resonance: null };
      }
      const wd = ensureWandData(wand);
      const res = getWandResonance(wand);
      const slots = wd.slots.map((sid, idx) => ({
        spell: sid ? (SPELLS_DATABASE[sid] || null) : null,
        cd: wandSkillCooldowns[idx] || 0,
        maxCd: wandSkillMaxCooldowns[idx] || 0
      }));
      return {
        isWand: true,
        basicCd: player.attackCooldown || 0,
        slots,
        resonance: res ? {
          id: res.spellId,
          label: res.label,
          shortCap: res.shortCap,
          color: res.color,
          glow: res.glow
        } : null
      };
    };

    window.getPlayerDashState = function () {
      return {
        cd: dashCooldown,
        maxCd: DASH_COOLDOWN,
        active: dashTimer > 0
      };
    };

    window.performPlayerDash = function () {
      if (isPaused || player.action === 'die' || dashCooldown > 0 || dashTimer > 0) return false;
      const axes = getMoveAxesFromKeys();
      let dx = axes.mx;
      let dy = axes.my;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(lastAimAngle || 0);
        dy = Math.sin(lastAimAngle || 0);
      } else {
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
      }

      dashDirX = dx;
      dashDirY = dy;
      dashTimer = DASH_DURATION;
      dashCooldown = DASH_COOLDOWN;
      dashTrailTimer = 0;
      player.invulnerableTimer = Math.max(player.invulnerableTimer || 0, 0.22);
      if (fishingState.phase === "waiting" || fishingState.phase === "biting") {
        resetFishingState("Đã thu cần câu");
      }
      playDashSound();

      const cx = player.x + 8;
      const cy = player.y + 10;
      for (let i = 0; i < 8; i++) {
        const spread = (Math.random() - 0.5) * 1.4;
        const a = Math.atan2(-dy, -dx) + spread;
        const spd = 24 + Math.random() * 44;
        combatParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          size: 1.4 + Math.random() * 1.5,
          color: i % 2 === 0 ? "#7dd3fc" : "#e0f2fe",
          life: 0.2 + Math.random() * 0.12,
          maxLife: 0.32,
          isSpark: true
        });
      }
      if (window.onMobileHudSync) window.onMobileHudSync();
      return true;
    };

    function castResonantBasicAttack(resonance, tipX, tipY, castAngle, gemBonuses = null) {
      const rId = resonance.spellId;
      const cosA = Math.cos(castAngle);
      const sinA = Math.sin(castAngle);
      const gb = gemBonuses || {};

      if (rId === "spell_gravity") {
        const speed = 240;
        activeProjectiles.push({
          x: tipX, y: tipY,
          vx: cosA * speed, vy: sinA * speed,
          angle: castAngle,
          damage: 4 + (gb.damageBonus || 0),
          traveled: 0, maxRange: 245,
          width: 11, height: 11,
          trailTimer: 0,
          isMagicOrb: true,
          resonanceType: "spell_gravity",
          critChance: gb.critChance || 0,
          gemBurn: (gb.burnStacks || 0) > 0,
          gemBurnSpread: Boolean(gb.burnSpread),
          gemFrost: (gb.frostStacks || 0) > 0,
          gemFrostSpread: Boolean(gb.frostSpread),
          gemVampire: gb.vampirePct || 0
        });
        spawnMagicCastVfx(tipX, tipY, castAngle, "#a855f7", "#f0abfc", 10);
        playSpellCastSound("spell_gravity");
        return;
      }
      if (rId === "spell_wood") {
        const speed = 260;
        activeProjectiles.push({
          x: tipX, y: tipY,
          vx: cosA * speed, vy: sinA * speed,
          angle: castAngle,
          damage: 5 + (gb.damageBonus || 0),
          traveled: 0, maxRange: 255,
          width: 12, height: 12,
          trailTimer: 0,
          isMagicOrb: true,
          resonanceType: "spell_wood",
          critChance: gb.critChance || 0,
          gemBurn: (gb.burnStacks || 0) > 0,
          gemBurnSpread: Boolean(gb.burnSpread),
          gemFrost: (gb.frostStacks || 0) > 0,
          gemFrostSpread: Boolean(gb.frostSpread),
          gemVampire: gb.vampirePct || 0
        });
        spawnMagicCastVfx(tipX, tipY, castAngle, "#22c55e", "#86efac", 12);
        playSpellCastSound("spell_wood");
        return;
      }
      if (rId === "spell_timestop") {
        const speed = 275;
        activeProjectiles.push({
          x: tipX, y: tipY,
          vx: cosA * speed, vy: sinA * speed,
          angle: castAngle,
          damage: 5 + (gb.damageBonus || 0),
          traveled: 0, maxRange: 265,
          width: 12, height: 12,
          trailTimer: 0,
          isMagicOrb: true,
          resonanceType: "spell_timestop",
          critChance: gb.critChance || 0,
          gemBurn: (gb.burnStacks || 0) > 0,
          gemBurnSpread: Boolean(gb.burnSpread),
          gemFrost: (gb.frostStacks || 0) > 0,
          gemFrostSpread: Boolean(gb.frostSpread),
          gemVampire: gb.vampirePct || 0
        });
        spawnMagicCastVfx(tipX, tipY, castAngle, "#38bdf8", "#fde047", 12);
        playSpellCastSound("spell_timestop");
        return;
      }

      castDefaultWandBasicOrb(tipX, tipY, castAngle, gemBonuses);
    }

    function performAction() {
      if (player.action === 'die') return;

      // Lấy vũ khí/công cụ đang cầm trên tay (Hotbar active slot)
      const equippedItem = playerInventory[activeHotbarIndex];

      // Nếu đang cầm Rương Đồ: Đặt xuống đất ngay trước mặt!
      if (equippedItem && equippedItem.id === 'chest') {
        tryPlaceChest(activeHotbarIndex);
        return;
      }

      // Nếu đang cầm Bàn Chế Tạo: Đặt xuống đất ngay trước mặt!
      if (equippedItem && (equippedItem.id === 'crafting_table' || (equippedItem.name && equippedItem.name.includes('Bàn Chế Tạo')))) {
        tryPlaceCraftingTable(activeHotbarIndex);
        return;
      }

      // Nếu đang cầm Thức Ăn (consumable): Ăn ngay để hồi Máu!
      if (equippedItem && (getItemData(equippedItem)?.category === "consumable")) {
        tryEatConsumable(activeHotbarIndex);
        return;
      }

      // Nếu đang cầm Đũa Phép: Nút đánh lớn luôn bắn ĐÁNH THƯỜNG (Cộng Hưởng chiêu / Cộng Hưởng 3 Ngọc & chỉ số Ngọc)
      if (equippedItem && equippedItem.id === 'magic_wand') {
        const castAngle = wandCastAngle;
        pendingPointerWorldPos = null;

        const { tipX, tipY } = computeWandCastTip(castAngle);
        const resonance = getWandResonance(equippedItem);
        const gemBonuses = getWandGemBonuses(equippedItem);
        if (resonance) {
          castResonantBasicAttack(resonance, tipX, tipY, castAngle, gemBonuses);
        } else {
          castDefaultWandBasicOrb(tipX, tipY, castAngle, gemBonuses);
        }
        degradeEquippedItem(activeHotbarIndex);
        return;
      }

      // Nếu đang cầm Cần Câu: Quăng xuống nước hoặc kéo cá khi cá cắn câu!
      if (equippedItem && equippedItem.id === 'fishing_rod') {
        if (fishingState.phase === 'idle') {
          const clickWorld = pendingFishingClickPos;
          pendingFishingClickPos = null;
          const rawAngle = (pendingPointerAimAngle !== null)
            ? pendingPointerAimAngle
            : getPlayerAimVector().angle;
          pendingPointerAimAngle = null;
          const aimAngle = snapTo8Directions(rawAngle);
          const waterTarget = findWaterCastTarget(aimAngle, clickWorld);

          if (!waterTarget) {
            playerFacing = angleToPlayerFacing(aimAngle);
            player.direction = playerFacing;
            addFloatingText("💧 Hướng ra mặt nước để quăng cần!", player.x - 32, player.y - 16, "#7dd3fc");
            return;
          }

          const snappedCast = snapTo8Directions(waterTarget.angle);
          fishingState.angle = waterTarget.angle;
          fishingState.slotIdx = activeHotbarIndex;
          fishingState.phase = 'casting';
          fishingState.timer = 0;
          fishingState.castDuration = 0.28;
          fishingState.waitDuration = 1.6 + Math.random() * 2.2;
          fishingState.startX = player.x + player.width / 2;
          fishingState.startY = player.y + 4;
          fishingState.bobberX = waterTarget.x;
          fishingState.bobberY = waterTarget.y;
          fishingState.fishShadow.active = false;
          lastAimAngle = snappedCast;
          playerFacing = angleToPlayerFacing(waterTarget.angle);
          player.direction = playerFacing;
          playFishingSound('cast');
          if (window.onMobileHudSync) window.onMobileHudSync();
          return;
        }

        if (fishingState.phase === 'waiting') {
          fishingState.phase = 'reeling';
          fishingState.timer = 0;
          fishingState.reelDuration = 0.22;
          fishingState.fishShadow.active = false;
          playFishingSound('cast');
                    if (window.onMobileHudSync) window.onMobileHudSync();
          return;
        }

        if (fishingState.phase === 'biting') {
          const loot = rollFishingLoot();
          const lootData = getItemData(loot.id) || {};
          const caughtItem = {
            id: loot.id,
            name: loot.name || lootData.name || "Vật phẩm",
            quantity: loot.quantity || 1
          };

          spawnWaterRipple(fishingState.bobberX, fishingState.bobberY, 14, "rgba(250, 204, 21, 0.9)");
          spawnWaterRipple(fishingState.bobberX, fishingState.bobberY, 9, "rgba(255, 255, 255, 0.9)");
          for (let i = 0; i < 8; i++) {
            const a = -Math.PI * 0.9 + (Math.PI * 0.8 * i) / 7;
            const spd = 25 + Math.random() * 40;
            combatParticles.push({
              x: fishingState.bobberX,
              y: fishingState.bobberY,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              size: 1.6,
              color: i % 2 === 0 ? "#e0f2fe" : "#38bdf8",
              life: 0.28,
              maxLife: 0.28,
              isMagicMote: true
            });
          }

          fishingState.caughtArc = {
            item: caughtItem,
            startX: fishingState.bobberX,
            startY: fishingState.bobberY,
            progress: 0,
            duration: 0.42
          };
          fishingState.phase = 'reeling';
          fishingState.timer = 0;
          fishingState.reelDuration = 0.26;
          fishingState.fishShadow.active = false;

          pickupItem(caughtItem);
          degradeEquippedItem(activeHotbarIndex);
          playFishingSound('catch');
          const txtColor = loot.rare ? "#fde047" : "#4ade80";
          addFloatingText(`+${caughtItem.quantity} ${caughtItem.name.toUpperCase()} ${loot.tag}`, player.x - 16, player.y - 16, txtColor, true);
          if (window.onMobileHudSync) window.onMobileHudSync();
          return;
        }
        return;
      }

      // Nếu đang cầm Cung Săn: Để update loop quản lý việc gồng và nhả phím bắn!
      if (equippedItem && (equippedItem.id === 'hunting_bow' || (equippedItem.name && equippedItem.name.includes('Cung')))) {
        return;
      }

      if (currentMap !== "forest") {
                return;
      }

      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      // 1. Kiểm tra săn Heo Rừng gần nhất
      let nearestMobIndex = -1;
      let minMobDist = INTERACTION_RADIUS + 4; // Tăng cự ly chém lên 28px để người chơi không cần đứng quá sát

      for (let i = 0; i < currentMobs.length; i++) {
        const mob = currentMobs[i];
        const mobCenterX = mob.x + mob.width / 2;
        const mobCenterY = mob.y + mob.height / 2;
        const dist = Math.hypot(playerCenterX - mobCenterX, playerCenterY - mobCenterY);

        if (dist <= minMobDist) {
          minMobDist = dist;
          nearestMobIndex = i;
        }
      }

      if (nearestMobIndex !== -1) {
        const mob = currentMobs[nearestMobIndex];
        // Tính sát thương cận chiến cộng dồn theo vũ khí/công cụ đang cầm
        const eqData = equippedItem ? (getItemData(equippedItem) || equippedItem) : null;
        const weaponBonus = (equippedItem && equippedItem.damage !== undefined)
          ? equippedItem.damage
          : (eqData && eqData.damage ? eqData.damage : 0);
        if (weaponBonus > 0) {
          degradeEquippedItem(activeHotbarIndex);
        }
        const baseDmg = defaultStats.player.attackDamage || 2;
        const totalDamage = baseDmg + weaponBonus;

        // Tính hướng chém từ Player tới quái vật
        const mobCenterX = mob.x + mob.width / 2;
        const mobCenterY = mob.y + mob.height / 2;
        let slashAngle = Math.atan2(mobCenterY - playerCenterY, mobCenterX - playerCenterX);
        // Nếu gần như trùng tọa độ, lấy góc theo direction của Player
        if (Math.abs(mobCenterX - playerCenterX) < 2 && Math.abs(mobCenterY - playerCenterY) < 2) {
          if (player.direction === 'right') slashAngle = 0;
          else if (player.direction === 'left') slashAngle = Math.PI;
          else if (player.direction === 'down') slashAngle = Math.PI / 2;
          else if (player.direction === 'up') slashAngle = -Math.PI / 2;
        }

        const hitRes = applyMobDamageWithTimeStop(mob, totalDamage, {
          angle: slashAngle,
          color: weaponBonus > 0 ? "#fbbf24" : "#f87171",
          floatingText: `-${totalDamage} HP ⚔️`,
          flashDur: combatFxConfig.hitFlashDuration || 0.065
        });

        // TIA LỬA tại điểm chạm văng theo hướng chém
        const contactX = (playerCenterX + mobCenterX) / 2;
        const contactY = (playerCenterY + mobCenterY) / 2;
        spawnHitSparks(contactX, contactY, slashAngle);

        if (!hitRes.queued) {
          // IMPACT SOUND: Âm thanh va chạm đúng frame chém, pitch ngẫu nhiên
          playImpactSound(hitRes.died);

          // KNOCKBACK: Đẩy quái lùi theo hướng đòn, nhân vật bật lại nhẹ (Recoil)
          if (combatFxConfig.knockback) {
            const kbDist = combatFxConfig.knockbackDistance || 14;
            const pushX = mob.x + Math.cos(slashAngle) * kbDist;
            const pushY = mob.y + Math.sin(slashAngle) * kbDist;
            const pushBox = { x: pushX, y: pushY, width: mob.width, height: mob.height };
            if (!checkMobCollision(pushBox)) {
              mob.x = pushX;
              mob.y = pushY;
            }

            // Nhân vật bật lùi nhẹ theo hướng ngược lại
            const recoilDist = combatFxConfig.playerRecoil || 4;
            if (recoilDist > 0) {
              const recoilX = player.x - Math.cos(slashAngle) * recoilDist;
              const recoilY = player.y - Math.sin(slashAngle) * recoilDist;
              const recoilBox = { x: recoilX, y: recoilY, width: player.width, height: player.height };
              if (!willPlayerCollide(recoilBox)) {
                player.x = recoilX;
                player.y = recoilY;
              }
            }
          }

          // SCREEN SHAKE + HIT-STOP: Rung camera nhẹ, dừng game lúc chạm
          triggerHitJuice(combatFxConfig.shakeIntensity || 3, combatFxConfig.hitStopDuration ? combatFxConfig.hitStopDuration * 1000 : 60);

          addFloatingText(`-${totalDamage} HP ⚔️`, mob.x - 4, mob.y - 10, weaponBonus > 0 ? "#fbbf24" : "#f87171");

          // Khi quái hết máu:
          if (hitRes.died) {
            currentMobs.splice(nearestMobIndex, 1);
            handleMobDeath(mob, mobCenterX, mobCenterY);
          }
        }
        return;
      }

      // 2. Khai thác Cây và Đá
      let nearestObj = null;
      let nearestObjIndex = -1;
      let minObjDist = INTERACTION_RADIUS;

      for (let i = 0; i < currentObjects.length; i++) {
        const obj = currentObjects[i];
        if (obj.type !== "tree" && obj.type !== "rock") continue;

        const objCenterX = obj.x + obj.width / 2;
        const objCenterY = obj.y + obj.height / 2;
        const dist = Math.hypot(playerCenterX - objCenterX, playerCenterY - objCenterY);

        if (dist <= minObjDist) {
          minObjDist = dist;
          nearestObj = obj;
          nearestObjIndex = i;
        }
      }

      if (nearestObj && nearestObjIndex !== -1) {
        if (nearestObj.type === "tree" || nearestObj.type === "rock") {
          activeHarvestTarget = nearestObj;
          const info = getHarvestInfo(nearestObj);
          harvestRequiredTime = info.time;
          harvestToolStatus = info.status;
          playImpactSound(nearestObj.type === "rock");
          spawnHitSparks(nearestObj.x + 8, nearestObj.y + 8, -Math.PI / 2);
          return;
        }
      }
    }

    // -------------------------------------------------------------
    // 7. CƠ CHẾ XÂY DỰNG LÒ RÈN (16x16) (Yêu cầu 1)
    // -------------------------------------------------------------
    // tryBuildForge removed

    // -------------------------------------------------------------
    // 8. HỆ THỐNG ĐIỀU KHIỂN
    // -------------------------------------------------------------
    const keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // Theo dõi hướng bấm phím gần nhất để xoay mặt mượt mà khi đi chéo
    let lastHorizontalDir = 'down';
    let lastVerticalDir = 'down';

    
    // LĂN CHUỘT (MOUSE WHEEL) ĐỂ CHUYỂN NHANH Ô HOTBAR [1 - 9]
    window.addEventListener("wheel", (e) => {
      // Nếu túi đồ đang mở, cho phép cuộn nội dung bình thường nếu có
      if (inventoryUI && inventoryUI.style.display !== "none") return;
      if (e.deltaY > 0) {
        // Cuộn xuống -> Chuyển sang ô kế tiếp (0 -> 1 -> ... -> 8 -> 0)
        activeHotbarIndex = (activeHotbarIndex + 1) % 9;
        renderHotbar();
      } else if (e.deltaY < 0) {
        // Cuộn lên -> Chuyển về ô trước (0 -> 8 -> 7 -> ...)
        activeHotbarIndex = (activeHotbarIndex - 1 + 9) % 9;
        renderHotbar();
      }
    }, { passive: true });

    window.addEventListener("keydown", (e) => {
      const activeTag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT" || (e.target && e.target.isContentEditable)) {
        return;
      }
      const profileModalEl = document.getElementById("player-profile-modal");
      if (profileModalEl && profileModalEl.style.display !== "none") {
        return;
      }
      // Nếu đang cầm Đũa Phép: Z, X, C thi triển trực tiếp Chiêu 1, Chiêu 2, Chiêu 3!
      if (!isPaused && getActiveWandItem()) {
        const wandSkillMap = { KeyZ: 0, KeyX: 1, KeyC: 2 };
        if (wandSkillMap[e.code] !== undefined) {
          e.preventDefault();
          if (!e.repeat) {
            window.castWandSkillSlot(wandSkillMap[e.code], true);
          }
          return;
        }
      }

      // Hỗ trợ phím Space, Z, J, X, K, C, V, F, Enter và Numpad0
      const attackKeyCodes = ["Space", "KeyZ", "KeyJ", "KeyX", "KeyK", "KeyC", "KeyV", "KeyF", "Enter", "Numpad0"];
      if (attackKeyCodes.includes(e.code) || attackKeyCodes.includes(e.key)) {
        e.preventDefault();
        if (isPaused) return;
        isKeyActionHeld = true;
        syncActionHeldState();
        if (!e.repeat) {
          const activeIt = playerInventory[activeHotbarIndex];
          if (activeIt && (activeIt.id === 'hunting_bow' || (activeIt.name && activeIt.name.includes('Cung')))) {
            pendingQuickBowShot = true;
          }
          if (triggerPlayerAttack()) {
            performAction();
          }
        }
        return;
      }
      
      // Nhấn Q để ném toàn bộ vật phẩm đang cầm trên tay xuống đất
      if ((e.code === "KeyQ" || e.key === "q" || e.key === "Q") && (!inventoryUI || inventoryUI.style.display === "none") && !isWandModalOpen()) {
        e.preventDefault();
        dropSelectedItem();
        return;
      }
      // Nhấn các phím số 1 đến 9 (hàng phím chính hoặc Numpad) để chọn ô Hotbar tương ứng (Active Slot)
      const digitMatch = (e.code || "").match(/^(?:Digit|Numpad)([1-9])$/);
      if ((e.key >= "1" && e.key <= "9") || digitMatch) {
        const num = (e.key >= "1" && e.key <= "9") ? parseInt(e.key, 10) : parseInt(digitMatch[1], 10);
        activeHotbarIndex = num - 1; // 0 đến 8
        renderHotbar();
        if (window.onMobileHotbarSelect && isMobileMode()) window.onMobileHotbarSelect(activeHotbarIndex);
        return;
      }
      // Nhấn E để đóng / mở Rương đồ (nếu đứng cạnh rương) hoặc túi đồ và tạm dừng (Pause) game
      if (e.key && e.key.toLowerCase() === "i") {
        e.preventDefault();
        togglePlayerInfoUI();
        return;
      }
      if (e.key && e.key.toLowerCase() === "e") {
        if (isWandModalOpen()) openWandCustomizer(false);
        initCampfireUIEvents();
        e.preventDefault();
        if (isChestOpen()) {
          toggleChestUI(false);
          return;
        }
        if (inventoryUI && inventoryUI.style.display !== "none") {
          toggleInventory(false);
          return;
        }
        const nearChest = checkNearChest();
        if (nearChest) {
          toggleChestUI(true, nearChest);
          return;
        }
        // Kiểm tra xem người chơi có đang đứng cạnh Bàn Chế Tạo nào không
        let nearTable = false;
        for (const obj of currentObjects) {
          if (obj.type === "crafting_table") {
            const dist = Math.hypot((player.x + 8) - (obj.x + 8), (player.y + 8) - (obj.y + 8));
            if (dist <= INTERACTION_RADIUS + 22) {
              nearTable = true;
              break;
            }
          }
        }
        toggleInventory(true, nearTable ? 'workstation' : 'pocket');
        return;
      }
      // Nhấn R khi đang mở túi đồ để bật / tắt nhanh Sổ Tay Công Thức
      if (e.key && e.key.toLowerCase() === "r" && inventoryUI && inventoryUI.style.display !== "none") {
        e.preventDefault();
        setRecipeBookOpen(!isRecipeBookOpen);
        return;
      }
      if (e.key === "Escape" || e.code === "Escape") {
        if (isWandModalOpen()) {
          e.preventDefault();
          openWandCustomizer(false);
          return;
        }
        if (isChestOpen()) {
          e.preventDefault();
          toggleChestUI(false);
          return;
        }
        if (combatFxPanel && combatFxPanel.style.display !== "none" && combatFxPanel.style.display !== "") {
          e.preventDefault();
          combatFxPanel.style.display = "none";
          return;
        }
        if (inventoryUI && inventoryUI.style.display !== "none") {
          e.preventDefault();
          toggleInventory(false);
          return;
        }
        const cfUI = document.getElementById("campfire-ui");
        if (cfUI && cfUI.style.display !== "none" && cfUI.style.display !== "") {
          e.preventDefault();
          toggleCampfireUI(false);
          return;
        }
      }
      // Nhấn G để đóng/mở Khảm Chiêu Đũa Phép
      if (e.code === "KeyG" || (e.key && e.key.toLowerCase() === "g")) {
        e.preventDefault();
        openWandCustomizer();
        return;
      }
      // Nhấn Shift để Lướt né đòn
      if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && !e.repeat && !isPaused) {
        e.preventDefault();
        window.performPlayerDash();
        return;
      }
      // Nhấn M để bật/tắt nhanh Mini-Map
      if ((e.code === "KeyM" || (e.key && e.key.toLowerCase() === "m")) && (!inventoryUI || inventoryUI.style.display === "none")) {
        e.preventDefault();
        setMinimapEnabled(!isMinimapEnabled);
        return;
      }
      // KeyB build forge removed
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      const code = e.code;
      const key = e.key;
      let dirChanged = false;

      // Hỗ trợ chuẩn xác 100% cả WASD lẫn 4 Phím Mũi Tên (Up, Down, Left, Right)
      if (code === "KeyW" || code === "ArrowUp" || key === "ArrowUp" || key === "w" || key === "W") {
        if (!keys.up) { keys.up = true; dirChanged = true; }
        lastVerticalDir = 'up';
      }
      if (code === "KeyS" || code === "ArrowDown" || key === "ArrowDown" || key === "s" || key === "S") {
        if (!keys.down) { keys.down = true; dirChanged = true; }
        lastVerticalDir = 'down';
      }
      if (code === "KeyA" || code === "ArrowLeft" || key === "ArrowLeft" || key === "a" || key === "A") {
        if (!keys.left) { keys.left = true; dirChanged = true; }
        lastHorizontalDir = 'left';
      }
      if (code === "KeyD" || code === "ArrowRight" || key === "ArrowRight" || key === "d" || key === "D") {
        if (!keys.right) { keys.right = true; dirChanged = true; }
        lastHorizontalDir = 'right';
      }

      if (dirChanged) {
        const { mx, my } = getMoveAxesFromKeys();
        if (mx !== 0 || my !== 0) {
          lastAimAngle = Math.atan2(my, mx);
          bowAimAngle = lastAimAngle;
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      const attackKeyCodes = ["Space", "KeyZ", "KeyJ", "KeyX", "KeyK", "KeyC", "KeyV", "KeyF", "Enter", "Numpad0"];
      if (attackKeyCodes.includes(e.code) || attackKeyCodes.includes(e.key)) {
        isKeyActionHeld = false;
        syncActionHeldState();
        harvestProgress = 0;
        activeHarvestTarget = null;
      }
      const code = e.code;
      const key = e.key;
      if (code === "KeyW" || code === "ArrowUp" || key === "ArrowUp" || key === "w" || key === "W") {
        keys.up = false;
        if (keys.down) lastVerticalDir = 'down';
      }
      if (code === "KeyS" || code === "ArrowDown" || key === "ArrowDown" || key === "s" || key === "S") {
        keys.down = false;
        if (keys.up) lastVerticalDir = 'up';
      }
      if (code === "KeyA" || code === "ArrowLeft" || key === "ArrowLeft" || key === "a" || key === "A") {
        keys.left = false;
        if (keys.right) lastHorizontalDir = 'right';
      }
      if (code === "KeyD" || code === "ArrowRight" || key === "ArrowRight" || key === "d" || key === "D") {
        keys.right = false;
        if (keys.left) lastHorizontalDir = 'left';
      }

      const { mx, my } = getMoveAxesFromKeys();
      if (mx !== 0 || my !== 0) {
        lastAimAngle = Math.atan2(my, mx);
        bowAimAngle = lastAimAngle;
      }
    });

    window.addEventListener("blur", () => {
      keys.up = false; keys.down = false; keys.left = false; keys.right = false;
      isKeyActionHeld = false;
      isMouseActionHeld = false;
      isMobileActionHeld = false;
      isActionKeyHeld = false;
      pendingQuickBowShot = false;
      harvestProgress = 0;
      activeHarvestTarget = null;
    });

    // Hướng nhìn gần nhất của Player
    let playerFacing = 'down';

    // Trạng thái giữ phím / chuột / nút cảm ứng hành động
    let isKeyActionHeld = false;
    let isMouseActionHeld = false;
    let isMobileActionHeld = false;
    let isActionKeyHeld = false;
    let pendingQuickBowShot = false;

    function syncActionHeldState() {
      isActionKeyHeld = isKeyActionHeld || isMouseActionHeld || isMobileActionHeld;
    }

    window.setMobileActionHeld = function (held) {
      isMobileActionHeld = Boolean(held);
      syncActionHeldState();
      if (isMobileActionHeld) {
        const activeIt = playerInventory[activeHotbarIndex];
        if (activeIt && (activeIt.id === 'hunting_bow' || (activeIt.name && activeIt.name.includes('Cung')))) {
          pendingQuickBowShot = true;
        }
      } else {
        harvestProgress = 0;
        activeHarvestTarget = null;
      }
    };

    let activeHarvestTarget = null; // Cây (tree) hoặc Đá (rock) đang khai thác
    let harvestProgress = 0;        // Tiến trình từ 0.0 -> 1.0
    let harvestRequiredTime = 1.0;  // Thời gian yêu cầu theo công cụ đang cầm
    let harvestToolStatus = 'correct'; // 'correct' (xanh lá), 'wrong' (vàng cam), 'hand' (xám)
    let harvestSoundTimer = 0;

    function triggerPlayerAttack() {
      if (player.action === 'die') return false;
      const curItem = playerInventory[activeHotbarIndex];
      const isBow = curItem && (curItem.id === 'hunting_bow' || (curItem.name && curItem.name.includes('Cung')));

      // NẾU ĐANG CẦM CUNG: Không gán attackCooldown, không hiện thanh hồi chiêu và không ép action 'attack'
      if (isBow) {
        return true;
      }

      // CHỈ VŨ KHÍ CẬN CHIẾN (weapon) & CÔNG CỤ (tool) MỚI CHẠY HOẠT ẢNH VUNG KIẾM
      // Các vật phẩm khác (nguyên liệu, giáp, ngọc, chiêu thức, đạn, đồ đặt, thức ăn...) không chạy animation vung kiếm
      const curItemData = curItem ? (getItemData(curItem) || curItem) : null;
      if (curItemData && curItemData.category !== 'weapon' && curItemData.category !== 'tool') {
        return true;
      }

      // NẾU ĐANG CẦM CẦN CÂU: Không dùng attackCooldown cận chiến để người chơi giật cần ngay khi cá cắn
      if (curItem && curItem.id === 'fishing_rod') {
        return true;
      }

      // NẾU ĐANG CẦM ĐŨA PHÉP: Khóa hướng 8 chiều thật + đánh thường Ngọc Cầu Ma Pháp
      if (curItem && curItem.id === 'magic_wand') {
        if (player.attackCooldown > 0) {
          pendingPointerAimAngle = null;
          pendingPointerWorldPos = null;
          return false;
        }
        const rawAngle = (pendingPointerAimAngle !== null)
          ? pendingPointerAimAngle
          : getPlayerAimVector().angle;
        pendingPointerAimAngle = null;
        const snapped = snapTo8Directions(rawAngle);
        wandCastAngle = snapped;
        lastAimAngle = snapped;
        playerFacing = angleToPlayerFacing(snapped);
        player.direction = playerFacing;

        const gemBonuses = getWandGemBonuses(curItem);
        player.attackCooldown = Math.max(0.18, 0.36 * gemBonuses.cooldownMult);
        wandCastTimer = WAND_CAST_DURATION;
        return true;
      }

      if (player.attackCooldown > 0) return false;
      // Kích hoạt hồi chiêu đánh cận chiến theo thiết lập (mặc định 1.0s)
      player.attackCooldown = defaultStats.player.attackCooldown || 1.0;
      player.action = 'attack';
      player.frameX = 0;
      player.animTimer = 0;
      player.direction = playerFacing;
      return true;
    }

    // Bộ điều khiển cảm ứng đa điểm (Joystick 8 hướng & Cụm nút hành động) được quản lý trong scripts/mobile-controls.js

    // -------------------------------------------------------------
    // HỆ THỐNG VẬT LÝ BẢN ĐỒ: KIỂM TRA MẶT ĐẤT ĐI ĐƯỢC (WALKABLE)
    // -------------------------------------------------------------
    // Kiểm tra xem 1 tọa độ pixel (px, py) có nằm hoàn toàn trên mặt đất hay không
    function isWalkableGround(px, py, mapId = null) {
      const activeMapId = mapId || currentMap;

      if (activeMapId === "home") {
        if (!homeMapData || !homeMapData.layerInstances) return true;
        const cWid = homeMapData.widthInTiles || 32;
        const cHei = homeMapData.heightInTiles || 32;
        const col = Math.floor(px / TILE_SIZE);
        const row = Math.floor(py / TILE_SIZE);

        if (col < 0 || col >= cWid || row < 0 || row >= cHei) return false;

        const idx = row * cWid + col;
        const layers = homeMapData.layerInstances;
        const ground = layers.find(l => l.__identifier === "Ground");
        const water = layers.find(l => l.__identifier === "Water");
        const rock = layers.find(l => l.__identifier === "Rock");

        if (water && water.intGridCsv && water.intGridCsv[idx] > 0) return false;
        if (rock && rock.intGridCsv && rock.intGridCsv[idx] > 0) return false;
        if (ground && ground.intGridCsv && ground.intGridCsv[idx] > 0) return true;
        return false;
      }

      if (activeMapId === "forest") {
        if (!forestMapData || !forestMapData.layerInstances) return true;
        const cWid = forestMapData.widthInTiles || 32;
        const cHei = forestMapData.heightInTiles || 32;
        const col = Math.floor(px / TILE_SIZE);
        const row = Math.floor(py / TILE_SIZE);

        if (col < 0 || col >= cWid || row < 0 || row >= cHei) return false;

        const idx = row * cWid + col;
        const layers = forestMapData.layerInstances;
        const fences = layers.find(l => l.__identifier === "Fences");
        const water = layers.find(l => l.__identifier === "Water");
        const jungles = layers.find(l => l.__identifier === "Jungles");

        // 1. Tuyệt đối không thể đi lên hàng rào Fences
        if (fences && fences.intGridCsv && fences.intGridCsv[idx] > 0) return false;

        // 2. Không thể đi vào nước
        if (water && water.intGridCsv && water.intGridCsv[idx] > 0) return false;

        // 3. Chỗ nào còn tileset đất (Jungles) ngoại trừ hàng rào và nước thì đều di chuyển được hết
        if (jungles && jungles.intGridCsv && jungles.intGridCsv[idx] > 0) return true;

        return false;
      }

      return true;
    }

    // Kiểm tra toàn bộ 4 góc chân của hộp nhân vật có nằm trên mặt đất hay không
    function isBoxOnWalkableGround(box, mapId = null) {
      // Bỏ qua một lượng đệm biên nhỏ (2px) để nhân vật di chuyển êm mượt, không bị khựng sát góc
      const inset = 2;
      const left = box.x + inset;
      const right = box.x + box.width - inset;
      const top = box.y + inset;
      const bottom = box.y + box.height - inset;

      return (
        isWalkableGround(left, top, mapId) &&
        isWalkableGround(right, top, mapId) &&
        isWalkableGround(left, bottom, mapId) &&
        isWalkableGround(right, bottom, mapId)
      );
    }

    // -------------------------------------------------------------
    // 9. CẬP NHẬT LOGIC GAME & VA CHẠM AABB
    // -------------------------------------------------------------
    function getObjectCollisionBox(obj) {
      if (obj.type === "crafting_table" || obj.type === "chest") {
        // Thu hẹp hitbox vật thể đặt 12x12 để người chơi lướt qua các khe hẹp mượt mà, không bao giờ bị kẹt
        return { x: obj.x + 2, y: obj.y + 3, width: 12, height: 11 };
      }
      return obj;
    }

    function willPlayerCollide(targetBox) {
      // Hitbox va chạm của Player thu gọn ở phần chân (12x12 căn giữa)
      const playerFeetBox = {
        x: targetBox.x + 2,
        y: targetBox.y + 3,
        width: 12,
        height: 12
      };

      // 1. Kiểm tra giới hạn vật lý mặt đất
      if (!isBoxOnWalkableGround(playerFeetBox)) {
        return true;
      }

      if (currentMap === "lake" && lakeLandGrid) {
        const corners = [
          { x: playerFeetBox.x, y: playerFeetBox.y },
          { x: playerFeetBox.x + playerFeetBox.width - 1, y: playerFeetBox.y },
          { x: playerFeetBox.x, y: playerFeetBox.y + playerFeetBox.height - 1 },
          { x: playerFeetBox.x + playerFeetBox.width - 1, y: playerFeetBox.y + playerFeetBox.height - 1 }
        ];
        for (const c of corners) {
          const tx = Math.floor(c.x / TILE_SIZE);
          const ty = Math.floor(c.y / TILE_SIZE);
          if (ty < 0 || ty >= lakeLandGrid.length || tx < 0 || tx >= lakeLandGrid[0].length || !lakeLandGrid[ty][tx]) {
            return true; // Chặn đi xuống nước trên map Hồ
          }
        }
      }

      // 2. Va chạm với Lửa Trại ở bản đồ Nhà
      if (currentMap === "home") {
        const campfireBox = {
          x: HOME_CAMPFIRE.x - 7,
          y: HOME_CAMPFIRE.y - 2,
          width: 14,
          height: 8
        };
        if (checkAABB(playerFeetBox, campfireBox)) {
          return true;
        }
      }

      // 3. Va chạm với vật thể thu thập & công trình
      for (const obj of currentObjects) {
        const cBox = getObjectCollisionBox(obj);
        if (checkAABB(playerFeetBox, cBox)) {
          return true;
        }
      }

      // 3. Va chạm với quái vật
      for (const mob of currentMobs) {
        if (checkAABB(playerFeetBox, mob)) {
          return true;
        }
      }
      return false;
    }

    let portalCooldown = 0;

    // -------------------------------------------------------------
    // QUẢN LÝ TRẠNG THÁI VÀ HOẠT ẢNH PLAYER (SPRITE ANIMATION)
    // -------------------------------------------------------------
    function updatePlayerAnimation(deltaTime) {
      // 1. Xác định frameY (hàng) và maxFrame theo action và direction
      // Sprite sheet 10 hàng x 6 cột:
      // Idle:  Down -> Hàng 0 (6 frames), Right/Left -> Hàng 1 (6 frames), Up -> Hàng 2 (6 frames)
      // Walk:  Down -> Hàng 3 (6 frames), Right/Left -> Hàng 4 (6 frames), Up -> Hàng 5 (6 frames)
      // Attack: Down -> Hàng 6 (4 frames), Right/Left -> Hàng 7 (4 frames), Up -> Hàng 8 (4 frames)
      // Die:   Hàng 9 (nếu có)
      let targetRow = 0;
      let targetMaxFrame = 6;

      if (player.action === 'idle') {
        targetMaxFrame = 6;
        if (player.direction === 'down') targetRow = 0;
        else if (player.direction === 'right' || player.direction === 'left') targetRow = 1;
        else if (player.direction === 'up') targetRow = 2;
      } else if (player.action === 'walk') {
        targetMaxFrame = 6;
        if (player.direction === 'down') targetRow = 3;
        else if (player.direction === 'right' || player.direction === 'left') targetRow = 4;
        else if (player.direction === 'up') targetRow = 5;
      } else if (player.action === 'attack') {
        targetMaxFrame = 4;
        if (player.direction === 'down') targetRow = 6;
        else if (player.direction === 'right' || player.direction === 'left') targetRow = 7;
        else if (player.direction === 'up') targetRow = 8;
      } else if (player.action === 'die') {
        // Hàng 9 của sprite sheet dành cho hoạt ảnh tử trận
        targetMaxFrame = 6;
        targetRow = 9;
      }

      player.frameY = targetRow;
      player.maxFrame = targetMaxFrame;
      if (player.action !== 'die' && player.frameX >= targetMaxFrame) {
        player.frameX = 0;
      }

      // 2. Tăng frameX liên tục theo timer (áp dụng attackAnimSpeed riêng nếu đang tấn công)
      const currentAnimSpeed = player.action === 'attack' 
        ? (defaultStats.player.attackAnimSpeed || 0.08) 
        : player.animSpeed;

      player.animTimer = (player.animTimer || 0) + deltaTime;
      if (player.animTimer >= currentAnimSpeed) {
        player.animTimer = 0;
        player.frameX++;

        if (player.action === 'attack') {
          // Khi chạy xong frame cuối của Attack thì tự động chuyển action về 'idle'
          if (player.frameX >= player.maxFrame) {
            player.action = 'idle';
            player.frameX = 0;
          }
        } else if (player.action === 'die') {
          // Hoạt ảnh chết giữ nguyên ở frame cuối
          if (player.frameX >= player.maxFrame - 1) {
            player.frameX = player.maxFrame - 1;
          }
        } else {
          // Vòng lặp hoạt ảnh idle / walk
          if (player.frameX >= player.maxFrame) {
            player.frameX = 0;
          }
        }
      }
    }

    function update(deltaTime) {
      marketTickTimer += deltaTime;
      if (marketTickTimer >= 8.0) {
        marketTickTimer = 0;
        const playerListingIdx = marketListings.findIndex(m => m.isPlayer);
        if (playerListingIdx !== -1) {
          const mk = marketListings[playerListingIdx];
          const baseVal = (ITEMS_DATABASE[mk.itemId]?.value || 5) * mk.qty;
          if (mk.price <= baseVal * 1.8) {
            playerGold += mk.price;
            marketListings.splice(playerListingIdx, 1);
            addFloatingText(`🤝 Chợ đã bán: +${mk.price} Xu!`, player.x - 16, player.y - 16, "#fde047", true);
            const shopUI = document.getElementById("npc-shop-ui");
            if (shopUI && shopUI.style.display === "flex") renderNpcShopUI();
          }
        }
      }
      // --- CẬP NHẬT LỬA TRẠI (NƯỚNG THỊT & CÁ + HÀO QUANG HỒI MÁU) ---
      if (HOME_CAMPFIRE.inputItem) {
        const cookMap = { "boar_unripe": "boar_ripe", "chicken_unripe": "chicken_ripe", "raw_fish": "cooked_fish" };
        const targetOut = cookMap[HOME_CAMPFIRE.inputItem.id];
        if (targetOut) {
          // Tiêu thụ nhiên liệu nếu hết
          if (HOME_CAMPFIRE.fuelRemaining <= 0 && HOME_CAMPFIRE.fuelItem && HOME_CAMPFIRE.fuelItem.quantity > 0) {
            const isCoal = HOME_CAMPFIRE.fuelItem.id === "coal";
            HOME_CAMPFIRE.fuelMax = isCoal ? 16.0 : 6.0;
            HOME_CAMPFIRE.fuelRemaining = HOME_CAMPFIRE.fuelMax;
            HOME_CAMPFIRE.fuelItem.quantity -= 1;
            if (HOME_CAMPFIRE.fuelItem.quantity <= 0) HOME_CAMPFIRE.fuelItem = null;
          }

          if (HOME_CAMPFIRE.fuelRemaining > 0) {
            HOME_CAMPFIRE.fuelRemaining = Math.max(0, HOME_CAMPFIRE.fuelRemaining - deltaTime);
            HOME_CAMPFIRE.cookProgress += deltaTime;
            if (HOME_CAMPFIRE.cookProgress >= HOME_CAMPFIRE.cookDuration) {
              HOME_CAMPFIRE.cookProgress = 0;
              HOME_CAMPFIRE.inputItem.quantity -= 1;
              if (HOME_CAMPFIRE.inputItem.quantity <= 0) HOME_CAMPFIRE.inputItem = null;

              if (!HOME_CAMPFIRE.resultItem) {
                const outData = ITEMS_DATABASE[targetOut];
                HOME_CAMPFIRE.resultItem = { id: targetOut, name: outData.name, quantity: 1 };
              } else if (HOME_CAMPFIRE.resultItem.id === targetOut) {
                HOME_CAMPFIRE.resultItem.quantity += 1;
              }
            }
            const cfUI = document.getElementById("campfire-ui");
            if (cfUI && cfUI.style.display === "block") renderCampfireUI();
          }
        }
      } else if (HOME_CAMPFIRE.fuelRemaining > 0) {
        HOME_CAMPFIRE.fuelRemaining = Math.max(0, HOME_CAMPFIRE.fuelRemaining - deltaTime);
      }

      // Hồi máu khi đứng trong bán kính phát sáng của Lửa Trại ở map Nhà
      if (currentMap === "home" && player.action !== "die") {
        const distCamp = Math.hypot((player.x + 8) - HOME_CAMPFIRE.x, (player.y + 8) - HOME_CAMPFIRE.y);
        if (distCamp <= HOME_CAMPFIRE.lightRadius) {
          HOME_CAMPFIRE.healTimer += deltaTime;
          if (HOME_CAMPFIRE.healTimer >= 1.5) {
            HOME_CAMPFIRE.healTimer = 0;
            if (player.hp < player.maxHp) {
              player.hp = Math.min(player.maxHp, player.hp + 2);
              if (player.hp > player.displayHp) player.displayHp = player.hp;
              if (valPlayerHP) {
                valPlayerHP.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
              }
                          }
          }
        } else {
          HOME_CAMPFIRE.healTimer = 0;
        }
      }

      if (player.action !== "die" && wandCastTimer > 0) {
        wandCastTimer = Math.max(0, wandCastTimer - deltaTime);
      }

      // Nếu game đang ở trạng thái Tạm Dừng (isPaused = true do mở Túi Đồ hoặc Menu), ngừng toàn bộ di chuyển logic
      if (isPaused) {
        return;
      }

      updateTimeStopEffect(deltaTime);
      const worldDt = deltaTime * getTimeStopWorldScale();

      if (portalCooldown > 0) {
        portalCooldown -= deltaTime;
      }

      // Giảm timer bất tử & chớp đỏ của Player
      if (player.invulnerableTimer > 0) player.invulnerableTimer -= deltaTime;
      if (player.hurtFlashTimer > 0) player.hurtFlashTimer -= deltaTime;
      if (player.attackCooldown > 0) player.attackCooldown -= deltaTime;
      if (dashCooldown > 0) {
        dashCooldown = Math.max(0, dashCooldown - deltaTime);
      }
      for (let ws = 0; ws < 3; ws++) {
        if (wandSkillCooldowns[ws] > 0) {
          wandSkillCooldowns[ws] = Math.max(0, wandSkillCooldowns[ws] - deltaTime);
        }
      }

      // Kiểm tra người chơi chạy trực tiếp vào Vòng Khảm Đũa Phép ở map Nhà
      if (currentMap === "home" && player.action !== "die") {
        const distAltar = getPlayerDistToWandAltar();
        if (distAltar <= HOME_WAND_ALTAR.interactRadius) {
          if (!wandAltarTriggerLock) {
            wandAltarTriggerLock = true;
            openWandCustomizer(true);
            return;
          }
        } else if (distAltar > HOME_WAND_ALTAR.interactRadius + 8) {
          wandAltarTriggerLock = false;
        }
      }

      
      const activeItem = playerInventory[activeHotbarIndex];
      const isHoldingBow = Boolean(activeItem && (activeItem.id === 'hunting_bow' || (activeItem.name && activeItem.name.includes('Cung'))));

      // --- CẬP NHẬT CÂU CÁ (FISHING STATE MACHINE) ---
      for (let ri = fishingState.ripples.length - 1; ri >= 0; ri--) {
        const rp = fishingState.ripples[ri];
        rp.life -= deltaTime;
        const p = 1 - Math.max(0, rp.life / rp.maxLife);
        rp.r = 1.5 + (rp.maxR - 1.5) * (1 - Math.pow(1 - p, 2));
        if (rp.life <= 0) fishingState.ripples.splice(ri, 1);
      }

      if (fishingState.caughtArc) {
        fishingState.caughtArc.progress += deltaTime / fishingState.caughtArc.duration;
        if (fishingState.caughtArc.progress >= 1) {
          fishingState.caughtArc = null;
        }
      }

      if (fishingState.phase !== "idle") {
        // Nếu đổi slot khác cần câu hoặc không còn cầm cần câu -> thu cần
        if (!activeItem || activeItem.id !== "fishing_rod" || activeHotbarIndex !== fishingState.slotIdx || player.action === "die") {
          resetFishingState();
        } else {
          fishingState.timer += deltaTime;
          if (fishingState.phase === "casting") {
            if (fishingState.timer >= fishingState.castDuration) {
              fishingState.phase = "waiting";
              fishingState.timer = 0;
              fishingState.rippleTimer = 0.25;
              spawnWaterRipple(fishingState.bobberX, fishingState.bobberY, 10, "rgba(224, 242, 254, 0.9)");
              playFishingSound("splash");
              if (window.onMobileHudSync) window.onMobileHudSync();
            }
          } else if (fishingState.phase === "waiting") {
            fishingState.rippleTimer -= deltaTime;
            if (fishingState.rippleTimer <= 0) {
              fishingState.rippleTimer = 0.75 + Math.random() * 0.45;
              spawnWaterRipple(fishingState.bobberX, fishingState.bobberY, 6.5, "rgba(186, 230, 253, 0.55)");
            }

            // Hiện bóng cá bơi từ dưới nước tiến tới phao trước khi cắn ~0.9s
            const preBiteTime = Math.max(0.5, fishingState.waitDuration - 0.9);
            if (fishingState.timer >= preBiteTime) {
              if (!fishingState.fishShadow.active) {
                const swimAngle = fishingState.angle + (Math.random() - 0.5) * 2.2 + Math.PI;
                let sx = fishingState.bobberX + Math.cos(swimAngle) * 16;
                let sy = fishingState.bobberY + Math.sin(swimAngle) * 16;
                if (!isWaterTileAt(sx, sy)) {
                  sx = fishingState.bobberX;
                  sy = fishingState.bobberY + 10;
                }
                fishingState.fishShadow = {
                  active: true,
                  startX: sx,
                  startY: sy,
                  x: sx,
                  y: sy,
                  progress: 0
                };
              } else {
                const dur = Math.max(0.4, fishingState.waitDuration - preBiteTime);
                fishingState.fishShadow.progress = Math.min(1, (fishingState.timer - preBiteTime) / dur);
                const e = 1 - Math.pow(1 - fishingState.fishShadow.progress, 2);
                fishingState.fishShadow.x = fishingState.fishShadow.startX + (fishingState.bobberX - fishingState.fishShadow.startX) * e;
                fishingState.fishShadow.y = fishingState.fishShadow.startY + (fishingState.bobberY - fishingState.fishShadow.startY) * e;
              }
            }

            if (fishingState.timer >= fishingState.waitDuration) {
              fishingState.phase = "biting";
              fishingState.timer = 0;
              fishingState.biteTimer = fishingState.biteWindow;
              fishingState.rippleTimer = 0;
              fishingState.fishShadow.active = false;
              spawnWaterRipple(fishingState.bobberX, fishingState.bobberY, 12, "rgba(250, 204, 21, 0.95)");
              playFishingSound("bite");
              if (window.onMobileHudSync) window.onMobileHudSync();
            }
          } else if (fishingState.phase === "biting") {
            fishingState.biteTimer -= deltaTime;
            fishingState.rippleTimer -= deltaTime;
            if (fishingState.rippleTimer <= 0) {
              fishingState.rippleTimer = 0.24;
              spawnWaterRipple(fishingState.bobberX, fishingState.bobberY, 9.5, "rgba(255, 255, 255, 0.85)");
            }
            if (fishingState.biteTimer <= 0) {
              fishingState.phase = "reeling";
              fishingState.timer = 0;
              fishingState.reelDuration = 0.22;
              addFloatingText("🐟 Cá chạy mất rồi!", fishingState.bobberX - 24, fishingState.bobberY - 14, "#fb7185");
              if (window.onMobileHudSync) window.onMobileHudSync();
            }
          } else if (fishingState.phase === "reeling") {
            if (fishingState.timer >= fishingState.reelDuration) {
              fishingState.phase = "idle";
              fishingState.timer = 0;
              if (window.onMobileHudSync) window.onMobileHudSync();
            }
          }
        }
      }

      // XỬ LÝ NHẤN GIỮ KHAI THÁC (CHẶT CÂY & ĐÀO ĐÁ) - Không chạy khi đang cầm Cung hoặc Cần Câu
      if (isActionKeyHeld && !isHoldingBow && !(activeItem && activeItem.id === 'fishing_rod') && currentMap === "forest") {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        // Nếu chưa có mục tiêu hoặc mục tiêu đã bị phá vỡ, tìm cây hoặc đá gần nhất
        if (!activeHarvestTarget || !currentObjects.includes(activeHarvestTarget)) {
          activeHarvestTarget = null;
          let minD = INTERACTION_RADIUS + 4;
          for (const obj of currentObjects) {
            if (obj.type === "tree" || obj.type === "rock") {
              const d = Math.hypot(playerCenterX - (obj.x + obj.width / 2), playerCenterY - (obj.y + obj.height / 2));
              if (d <= minD) {
                minD = d;
                activeHarvestTarget = obj;
              }
            }
          }
        }

        if (activeHarvestTarget) {
          const dist = Math.hypot(playerCenterX - (activeHarvestTarget.x + activeHarvestTarget.width / 2), playerCenterY - (activeHarvestTarget.y + activeHarvestTarget.height / 2));
          if (dist <= INTERACTION_RADIUS + 6) {
            const info = getHarvestInfo(activeHarvestTarget);
            harvestRequiredTime = info.time;
            harvestToolStatus = info.status;
            harvestProgress += deltaTime / harvestRequiredTime;

            // Âm thanh và hiệu ứng va chạm định kỳ
            harvestSoundTimer = (harvestSoundTimer || 0) + deltaTime;
            if (harvestSoundTimer >= 0.22) {
              harvestSoundTimer = 0;
              playImpactSound(activeHarvestTarget.type === "rock");
              spawnHitSparks(activeHarvestTarget.x + 8, activeHarvestTarget.y + 8, -Math.PI / 2);
              player.action = 'attack';
              player.animTimer = 0;
            }

            if (harvestProgress >= 1.0) {
              harvestProgress = 0;
              const completedTarget = activeHarvestTarget;
              executeHarvestComplete(completedTarget);

              // Nếu là cây vừa ngã thành gốc (hp === 1), tiếp tục giữ để đào gốc
              if (currentObjects.includes(completedTarget) && completedTarget.type === "tree" && completedTarget.hp === 1) {
                activeHarvestTarget = completedTarget;
              } else {
                activeHarvestTarget = null;
              }
            }
          } else {
            harvestProgress = 0;
            activeHarvestTarget = null;
          }
        } else {
          harvestProgress = 0;
        }
      } else {
        harvestProgress = 0;
        activeHarvestTarget = null;
      }

      
      // --- XỬ LÝ GỒNG LỰC KÉO CUNG (BOW CHARGING) ---
      if (isHoldingBow && isActionKeyHeld && player.action !== 'die') {
        pendingQuickBowShot = false;
        if (!isBowCharging) {
          isBowCharging = true;
          bowChargeTimer = 0;
          // Ghi nhận ngay góc ngắm lúc bắt đầu gồng
          bowAimAngle = getPlayerAimVector().angle;
        }
        bowChargeTimer += deltaTime;

        // Nếu người chơi đang bấm bất kỳ phím di chuyển nào (WASD hoặc Phím mũi tên), liên tục cập nhật góc ngắm 8 chiều
        const currentAim = getPlayerAimVector();
        if (keys.left || keys.right || keys.up || keys.down) {
          bowAimAngle = currentAim.angle;
        }

        // Nếu gồng quá 1.5 giây: Dây cung căng quá làm gãy mũi tên!
        if (bowChargeTimer > BOW_MAX_CHARGE) {
          isBowCharging = false;
          bowChargeTimer = 0;
          isKeyActionHeld = false;
          isMouseActionHeld = false;
          isMobileActionHeld = false;
          isActionKeyHeld = false; // Ngừng giữ phím
          pendingQuickBowShot = false;
          playImpactSound(true);

          let aSlot = -1;
          for (let i = 0; i < playerInventory.length; i++) {
            if (playerInventory[i] && (playerInventory[i].id === 'arrow' || playerInventory[i].name === 'Mũi Tên') && playerInventory[i].quantity > 0) {
              aSlot = i; break;
            }
          }
          if (aSlot !== -1) {
            playerInventory[aSlot].quantity -= 1;
            if (playerInventory[aSlot].quantity <= 0) playerInventory[aSlot] = null;
            renderHotbar();
          }
          addFloatingText("💥 TÊN BỊ GÃY DO QUÁ CĂNG!", player.x - 24, player.y - 20, "#ef4444", true);
          spawnDeathPop(player.x + 8, player.y + 8, "#78716c");
        }
      } else {
        // Người chơi vừa nhả phím Space / Chuột / Nút hành động (hoặc bấm nhả cực nhanh trong 1 frame)
        if (isBowCharging || (isHoldingBow && pendingQuickBowShot && player.action !== 'die')) {
          const chargeTime = isBowCharging ? bowChargeTimer : 0;
          // Ưu tiên góc ngắm đang giữ phím di chuyển, hoặc góc nhắm đã ghi nhận gần nhất
          const currentAim = getPlayerAimVector();
          const shotAngle = (keys.left || keys.right || keys.up || keys.down) 
            ? currentAim.angle 
            : ((bowAimAngle !== null && bowAimAngle !== undefined) ? bowAimAngle : currentAim.angle);
          isBowCharging = false;
          bowChargeTimer = 0;
          pendingQuickBowShot = false;

          // Dưới 0.5s = 5 dmg; Từ 0.5s đến 1.5s = 10 dmg
          const bowBase = (activeItem && typeof activeItem.damage === "number") ? activeItem.damage : 24;
          const dmg = (chargeTime >= BOW_MIN_CHARGE) ? bowBase : Math.max(8, Math.round(bowBase * 0.5));
          tryShootBow(activeItem, dmg, shotAngle);
        } else {
          pendingQuickBowShot = false;
        }
      }

      // Lerp mượt thanh máu & thanh giáp hiển thị của Player (Tweening theo deltaTime)
      if (player.displayHp > player.hp) {
        player.displayHp = Math.max(player.hp, player.displayHp - deltaTime * 40);
      } else if (player.displayHp < player.hp) {
        player.displayHp = Math.min(player.hp, player.displayHp + deltaTime * 60);
      }

      if (playerDisplayArmor > playerArmor) {
        playerDisplayArmor = Math.max(playerArmor, playerDisplayArmor - deltaTime * 35);
      } else if (playerDisplayArmor < playerArmor) {
        playerDisplayArmor = Math.min(playerArmor, playerDisplayArmor + deltaTime * 50);
      }

      // Tự động phục hồi thanh Giáp khi ra khỏi giao tranh (Nón Kim Cương hồi nhanh hơn)
      if (player.action !== 'die' && playerMaxArmor > 0 && playerArmor < playerMaxArmor) {
        playerOutOfCombatTimer += deltaTime;
        const helmId = (playerEquipment[0] && (getItemData(playerEquipment[0]) || playerEquipment[0]).id) || "";
        const hasDiamondHelm = helmId === "diamond_helmet";
        const regenDelay = hasDiamondHelm ? 2.5 : 5.0;
        const regenRate = hasDiamondHelm ? 6.0 : 2.5;
        if (playerOutOfCombatTimer >= regenDelay) {
          playerArmor = Math.min(playerMaxArmor, playerArmor + deltaTime * regenRate);
        }
      }

      
      // --- CẬP NHẬT VẬT PHẨM RƠI TRÊN MẶT ĐẤT (DROPPED GROUND ITEMS) ---
      const pCenterX = player.x + player.width / 2;
      const pCenterY = player.y + player.height / 2;

          function canInventoryFitItem(item) {
      if (!item) return false;
      const maxS = (typeof getItemMaxStack === "function") ? getItemMaxStack(item) : 64;
      for (let i = 0; i < playerInventory.length; i++) {
        const s = playerInventory[i];
        if (!s) return true;
        if (s.id === item.id && s.name === item.name && s.quantity < maxS) return true;
      }
      return false;
    }

      for (let gi = droppedItems.length - 1; gi >= 0; gi--) {
        const gItem = droppedItems[gi];
        if (gItem.mapId && gItem.mapId !== currentMap) continue;
        gItem.bobTimer = (gItem.bobTimer || 0) + deltaTime * 4;

        // Ma sát giảm vận tốc văng ban đầu
        if (gItem.vx !== 0 || gItem.vy !== 0) {
          gItem.x += gItem.vx * deltaTime;
          gItem.y += gItem.vy * deltaTime;
          gItem.vx *= 0.88;
          gItem.vy *= 0.88;
          if (Math.hypot(gItem.vx, gItem.vy) < 0.5) {
            gItem.vx = 0; gItem.vy = 0;
          }
        }

        if (gItem.pickupCooldown > 0) {
          gItem.pickupCooldown -= deltaTime;
        }

        // Tự động hút và nhặt vào túi đồ khi người chơi tiến gần trong bán kính 22px
        const distToPlayer = Math.hypot(pCenterX - (gItem.x + 4), pCenterY - (gItem.y + 4));
        if (gItem.pickupCooldown <= 0 && distToPlayer <= 22 && canInventoryFitItem(gItem.item)) {
          // Nam châm hút nhẹ về phía người chơi
          const pullAngle = Math.atan2(pCenterY - (gItem.y + 4), pCenterX - (gItem.x + 4));
          gItem.x += Math.cos(pullAngle) * 90 * deltaTime;
          gItem.y += Math.sin(pullAngle) * 90 * deltaTime;

          if (distToPlayer <= 10) {
            // Thử nhặt vào túi đồ
            let remaining = gItem.item.quantity;
            const itemId = gItem.item.id || (gItem.item.name ? gItem.item.name.toLowerCase() : "");
            const dbData = getItemData(itemId) || getItemData(gItem.item.name) || {};
            const itemName = gItem.item.name || dbData.name || "Vật phẩm";
            const maxStack = getItemMaxStack({ ...gItem.item, id: itemId, name: itemName });

            // Quét cộng dồn ô có sẵn
            for (let i = 0; i < 36; i++) {
              if (remaining <= 0) break;
              const sIt = playerInventory[i];
              if (sIt && (sIt.id === itemId || sIt.name === itemName) && sIt.quantity < maxStack) {
                const add = Math.min(maxStack - sIt.quantity, remaining);
                sIt.quantity += add;
                remaining -= add;
              }
            }
            // Quét ô trống
            if (remaining > 0) {
              for (let i = 0; i < 36; i++) {
                if (remaining <= 0) break;
                if (playerInventory[i] === null) {
                  const add = Math.min(maxStack, remaining);
                  playerInventory[i] = {
                    id: itemId,
                    name: itemName,
                    quantity: add,
                    durability: gItem.item.durability !== undefined ? gItem.item.durability : dbData.durability,
                    maxDurability: gItem.item.maxDurability || dbData.maxDurability,
                    icon: dbData.icon || gItem.item.icon || "",
                    ...(gItem.item.wandData ? { wandData: cloneWandData(gItem.item.wandData) } : (itemId === "magic_wand" ? { wandData: { slots: [null, null, null], gemSlots: [null, null, null] } } : {}))
                  };
                  remaining -= add;
                }
              }
            }

            renderHotbar();
            renderStorage();

            if (remaining <= 0) {
              // Nhặt hết thành công
              playImpactSound(false);
              addFloatingText("+" + gItem.item.quantity + " " + itemName.toUpperCase(), gItem.x - 6, gItem.y - 12, "#4ade80", true);
              droppedItems.splice(gi, 1);
            } else {
              // Nhặt được một phần, còn dư giữ lại trên đất
              gItem.item.quantity = remaining;
            }
          }
        }
      }

      // --- CẬP NHẬT VẬT THỂ BAY (PROJECTILES - MŨI TÊN & CẦU NĂNG LƯỢNG PHÉP THUẬT) ---
      const detonateResonanceImpact = (proj, ix, iy, primaryMob = null) => {
        const rType = proj.resonanceType;
        if (rType === "spell_gravity") {
          spawnMagicHitBurst(ix, iy, proj.angle, "#a855f7", "#f0abfc", 18);
          groundShockwaves.push({
            x: ix, y: iy, radius: 34, maxRadius: 4,
            life: 0.24, maxLife: 0.24,
            color: "#c084fc", coreColor: "#f5d0fe"
          });
          for (let mIdx = currentMobs.length - 1; mIdx >= 0; mIdx--) {
            const mob = currentMobs[mIdx];
            const mx = mob.x + mob.width / 2;
            const my = mob.y + mob.height / 2;
            const d = Math.hypot(mx - ix, my - iy);
            if (d <= 36) {
              const isTsFreeze = Boolean(timeStopState.active && timestopFxConfig.step5Enabled);
              if (!isTsFreeze) {
                if (d > 4) {
                  const pullA = Math.atan2(iy - my, ix - mx);
                  const pullDist = Math.min(11, d * 0.55);
                  const px = mob.x + Math.cos(pullA) * pullDist;
                  const py = mob.y + Math.sin(pullA) * pullDist;
                  if (!checkMobCollision({ x: px, y: py, width: mob.width, height: mob.height })) {
                    mob.x = px; mob.y = py;
                  }
                }
                mob.gravitySquash = { elapsed: 0, duration: 0.24, targetScaleY: 0.65, targetScaleX: 1.3 };
              }
              if (mob !== primaryMob) {
                const hitRes = applyMobDamageWithTimeStop(mob, 3, {
                  angle: Math.atan2(my - iy, mx - ix),
                  color: "#e879f9",
                  floatingText: "-3 HP 🌌",
                  flashDur: 0.05,
                  burnTimer: proj.gemBurn ? 2.6 : 0,
                  burnSpread: proj.gemBurnSpread,
                  slowTimer: proj.gemFrost ? 2.6 : 0
                });
                if (!hitRes.queued) {
                  addFloatingText("-3 HP 🌌", mob.x - 4, mob.y - 10, "#e879f9", false);
                  if (hitRes.died) {
                    currentMobs.splice(mIdx, 1);
                    handleMobDeath(mob, mx, my);
                  }
                }
              }
            }
          }
          return false;
        }
        if (rType === "spell_timestop") {
          spawnMagicHitBurst(ix, iy, proj.angle, "#38bdf8", "#fde047", 18);
          groundShockwaves.push({
            x: ix, y: iy, radius: 6, maxRadius: 38,
            life: 0.26, maxLife: 0.26,
            color: "#38bdf8", coreColor: "#fef08a"
          });
          for (let mIdx = currentMobs.length - 1; mIdx >= 0; mIdx--) {
            const mob = currentMobs[mIdx];
            if (mob === primaryMob || mob.hp <= 0) continue;
            const mx = mob.x + mob.width / 2;
            const my = mob.y + mob.height / 2;
            const d = Math.hypot(mx - ix, my - iy);
            if (d <= 38) {
              const hitRes = applyMobDamageWithTimeStop(mob, 4, {
                angle: Math.atan2(my - iy, mx - ix),
                color: "#38bdf8",
                floatingText: "-4 HP ⏳",
                flashDur: 0.05,
                burnTimer: proj.gemBurn ? 2.6 : 0,
                burnSpread: proj.gemBurnSpread,
                slowTimer: 2.2
              });
              if (!hitRes.queued) {
                addFloatingText("-4 HP ⏳", mob.x - 4, mob.y - 10, "#38bdf8", false);
                if (hitRes.died) {
                  currentMobs.splice(mIdx, 1);
                  handleMobDeath(mob, mx, my);
                }
              }
            }
          }
          return false;
        }
        return false;
      };

      for (let pIdx = activeProjectiles.length - 1; pIdx >= 0; pIdx--) {
        const proj = activeProjectiles[pIdx];
        const stepX = proj.vx * deltaTime;
        const stepY = proj.vy * deltaTime;
        proj.x += stepX;
        proj.y += stepY;
        proj.traveled += Math.hypot(stepX, stepY);

        // Hạt bụi sao ma pháp bay theo đuôi cầu năng lượng
        if (proj.isMagicOrb) {
          proj.trailTimer = (proj.trailTimer || 0) + deltaTime;
          if (proj.trailTimer >= 0.028) {
            proj.trailTimer = 0;
            const perpAngle = proj.angle + Math.PI / 2;
            const jitter = (Math.random() - 0.5) * 3.5;
            const trailPalette = proj.gemBurn
              ? (Math.random() > 0.4 ? "#f97316" : (Math.random() > 0.5 ? "#fde047" : "#c084fc"))
              : (proj.gemFrost
                ? (Math.random() > 0.4 ? "#38bdf8" : "#e0f2fe")
                : (proj.resonanceType === "spell_timestop"
                  ? (Math.random() > 0.4 ? "#38bdf8" : "#fde047")
                  : (Math.random() > 0.35 ? "#c084fc" : (Math.random() > 0.5 ? "#7dd3fc" : "#ffffff"))));
            combatParticles.push({
              x: proj.x + Math.cos(perpAngle) * jitter - Math.cos(proj.angle) * 2,
              y: proj.y + Math.sin(perpAngle) * jitter - Math.sin(proj.angle) * 2,
              vx: -proj.vx * 0.08 + (Math.random() - 0.5) * 14,
              vy: -proj.vy * 0.08 + (Math.random() - 0.5) * 14,
              size: 1.4 + Math.random() * 1.1,
              color: trailPalette,
              life: 0.16 + Math.random() * 0.10,
              maxLife: 0.26,
              isMagicMote: true
            });
          }
        }

        const isSpellProj = Boolean(proj.isMagicOrb);

        // Kiểm tra va chạm với Mobs (Heo Rừng, Gà Rừng)
        let hitMob = false;
        for (let mIdx = currentMobs.length - 1; mIdx >= 0; mIdx--) {
          const mob = currentMobs[mIdx];
          if (proj.hitMobSet && proj.hitMobSet.has(mob)) continue;
          const mBox = { x: mob.x, y: mob.y, width: mob.width, height: mob.height };
          const pBox = { x: proj.x - 4, y: proj.y - 4, width: 8, height: 8 };

          if (checkAABB(pBox, mBox)) {
            if (proj.hitMobSet) proj.hitMobSet.add(mob);
            if (proj.pierceRemaining && proj.pierceRemaining > 0) {
              proj.pierceRemaining--;
            } else {
              hitMob = true;
            }

            const isCrit = Boolean(proj.critChance && Math.random() < proj.critChance);
            const finalDamage = isCrit ? Math.max(1, Math.round(proj.damage * 1.75)) : proj.damage;
            const mobCenterX = mob.x + mob.width / 2;
            const mobCenterY = mob.y + mob.height / 2;
            const hitTag = isCrit ? " HP 💥" : (proj.isMagicOrb ? " HP ✨" : " HP 🏹");
            const hitColor = isCrit ? "#fde047" : (proj.resonanceType === "spell_timestop" ? "#38bdf8" : (proj.isMagicOrb ? "#e879f9" : "#38bdf8"));

            const hitRes = applyMobDamageWithTimeStop(mob, finalDamage, {
              angle: proj.angle,
              color: hitColor,
              floatingText: "-" + finalDamage + hitTag,
              isCrit,
              flashDur: combatFxConfig.hitFlashDuration || 0.065,
              burnTimer: proj.gemBurn ? 3.0 : 0,
              burnSpread: proj.gemBurnSpread,
              slowTimer: proj.gemFrost ? (proj.gemFrostSpread ? 3.4 : 2.2) : 0,
              vampireHeal: (proj.gemVampire && proj.gemVampire > 0) ? Math.max(1, Math.round(finalDamage * proj.gemVampire)) : 0
            });

            if (proj.isMagicOrb) {
              spawnMagicHitBurst(mobCenterX, mobCenterY, proj.angle);
            } else {
              spawnHitSparks(mobCenterX, mobCenterY, proj.angle);
            }

            if (!hitRes.queued) {
              playImpactSound(hitRes.died);

              // Cộng hưởng 3 viên Cháy Lan AoE
              if (proj.gemBurn && proj.gemBurnSpread) {
                groundShockwaves.push({
                  x: mobCenterX, y: mobCenterY, radius: 6, maxRadius: 34,
                  life: 0.22, maxLife: 0.22,
                  color: "#f97316", coreColor: "#fde047"
                });
                for (const other of currentMobs) {
                  if (other === mob || other.hp <= 0) continue;
                  const ox = other.x + other.width / 2;
                  const oy = other.y + other.height / 2;
                  if (Math.hypot(ox - mobCenterX, oy - mobCenterY) <= 34) {
                    other.burnTimer = Math.max(other.burnTimer || 0, 2.8);
                    other.burnTickTimer = Math.min(other.burnTickTimer || 0.5, 0.5);
                    other.burnSpread = true;
                  }
                }
              }

              // Cộng hưởng 3 viên Sóng Băng Lan
              if (proj.gemFrost && proj.gemFrostSpread) {
                groundShockwaves.push({
                  x: mobCenterX, y: mobCenterY, radius: 6, maxRadius: 34,
                  life: 0.22, maxLife: 0.22,
                  color: "#38bdf8", coreColor: "#e0f2fe"
                });
                for (const other of currentMobs) {
                  if (other === mob || other.hp <= 0) continue;
                  const ox = other.x + other.width / 2;
                  const oy = other.y + other.height / 2;
                  if (Math.hypot(ox - mobCenterX, oy - mobCenterY) <= 34) {
                    other.slowTimer = Math.max(other.slowTimer || 0, 3.0);
                  }
                }
              }

              triggerHitJuice(combatFxConfig.shakeIntensity || 3, 50);
              addFloatingText("-" + finalDamage + hitTag, mob.x - 4, mob.y - 10, hitColor, isCrit);

              // Knockback quái lui lại
              if (combatFxConfig.knockback) {
                const kbDist = 18;
                const pushX = mob.x + Math.cos(proj.angle) * kbDist;
                const pushY = mob.y + Math.sin(proj.angle) * kbDist;
                if (!checkMobCollision({ x: pushX, y: pushY, width: mob.width, height: mob.height })) {
                  mob.x = pushX;
                  mob.y = pushY;
                }
              }

              // Quái chết
              if (hitRes.died) {
                currentMobs.splice(mIdx, 1);
                handleMobDeath(mob, mobCenterX, mobCenterY);
                // Tỉ lệ 75% rơi lại mũi tên (chỉ áp dụng cho cung tên vật lý)
                if (!isSpellProj && Math.random() < 0.75) {
                  spawnGroundItem({ id: "arrow", name: "Mũi Tên", quantity: 1, icon: "assets/items/tools_weapons/arrow.png" }, mobCenterX, mobCenterY);
                }
              }
            }

            if (proj.resonanceType) {
              detonateResonanceImpact(proj, mobCenterX, mobCenterY, mob);
            }
            if (hitMob) break;
          }
        }

        // Kiểm tra va chạm với các vật thể trên bản đồ (Cây cối, Tảng đá)
        let hitObstacle = false;
        if (!hitMob) {
          const pBox = { x: proj.x - 3, y: proj.y - 3, width: 6, height: 6 };
          for (let oIdx = 0; oIdx < currentObjects.length; oIdx++) {
            const obj = currentObjects[oIdx];
            let objBox = null;
            if (obj.type === 'tree') {
              objBox = { x: obj.x, y: obj.y + 4, width: 16, height: 12 };
            } else if (obj.type === 'rock') {
              objBox = { x: obj.x, y: obj.y, width: 16, height: 16 };
            }

            if (objBox && checkAABB(pBox, objBox)) {
              hitObstacle = true;
              playImpactSound(false);
              if (proj.resonanceType === "spell_gravity" || proj.resonanceType === "spell_timestop") {
                detonateResonanceImpact(proj, proj.x, proj.y, null);
              } else if (proj.isMagicOrb) {
                spawnMagicHitBurst(proj.x, proj.y, proj.angle);
              } else {
                spawnHitSparks(proj.x, proj.y, proj.angle);
                // Rơi mũi tên xuống đất để người chơi nhặt lại!
                spawnGroundItem({ id: "arrow", name: "Mũi Tên", quantity: 1, icon: "assets/items/tools_weapons/arrow.png" }, proj.x, proj.y);
              }
              break;
            }
          }
        }

        // Tự hủy khi bắn trúng quái, trúng chướng ngại vật hoặc bay quá tầm tối đa
        if (hitMob || hitObstacle || proj.traveled >= proj.maxRange) {
          if (!hitMob && !hitObstacle && proj.traveled >= proj.maxRange) {
            if (proj.resonanceType === "spell_gravity" || proj.resonanceType === "spell_timestop") {
              detonateResonanceImpact(proj, proj.x, proj.y, null);
            } else if (proj.isMagicOrb) {
              spawnMagicHitBurst(proj.x, proj.y, proj.angle);
            } else {
              spawnHitSparks(proj.x, proj.y, proj.angle);
              // Bay hết tầm rơi xuống đất cho nhặt lại!
              spawnGroundItem({ id: "arrow", name: "Mũi Tên", quantity: 1, icon: "assets/items/tools_weapons/arrow.png" }, proj.x, proj.y);
            }
          }
          activeProjectiles.splice(pIdx, 1);
        }
      }

      // Xử lý di chuyển & trạng thái của Player
      const axes = getMoveAxesFromKeys();
      let moveX = axes.mx;
      let moveY = axes.my;

      const isMovingKeys = (moveX !== 0 || moveY !== 0);

      // Nếu người chơi chủ động di chuyển khi đang chờ cá hoặc đang quăng cần -> thu cần gọn gàng
      if (isMovingKeys && (fishingState.phase === "waiting" || fishingState.phase === "biting")) {
        resetFishingState("Đã thu cần câu");
      }

      // Cập nhật hướng nhìn playerFacing theo hướng di chuyển
      if (isMovingKeys) {
        if (moveY > 0 && Math.abs(moveX) <= Math.abs(moveY)) {
          playerFacing = 'down';
        } else if (moveY < 0 && Math.abs(moveX) <= Math.abs(moveY)) {
          playerFacing = 'up';
        } else if (moveX > 0) {
          playerFacing = 'right';
        } else if (moveX < 0) {
          playerFacing = 'left';
        }
        lastAimAngle = Math.atan2(moveY, moveX);
        bowAimAngle = lastAimAngle;
        lastAimVector = { vx: moveX, vy: moveY, angle: lastAimAngle };
      }

      // Quản lý trạng thái action: nếu không tấn công và không chết
      if (player.action !== 'attack' && player.action !== 'die') {
        if (isMovingKeys) {
          player.action = 'walk';
          player.direction = playerFacing;
        } else {
          player.action = 'idle';
          player.direction = playerFacing;
        }
      }

      // Trong khi đang tấn công hoặc chết, không di chuyển vị trí (đứng chém dứt khoát)
      if (player.action === 'attack' || player.action === 'die') {
        moveX = 0;
        moveY = 0;
      }

      if (moveX !== 0 && moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= length;
        moveY /= length;
      }

      // Khi đang tung chiêu đũa phép hoặc câu cá, giữ hướng thân nhân vật đồng bộ với hướng phóng
      if (wandCastTimer > 0 && player.action !== 'die') {
        player.direction = angleToPlayerFacing(wandCastAngle);
      } else if (fishingState.phase !== "idle" && player.action !== 'die') {
        player.direction = angleToPlayerFacing(fishingState.angle);
      }

      // Cập nhật hoạt ảnh Player (frameX, frameY, maxFrame)
      updatePlayerAnimation(deltaTime);

      let deltaX = moveX * player.speed * deltaTime;
      let deltaY = moveY * player.speed * deltaTime;

      if (dashTimer > 0 && player.action !== 'die') {
        dashTimer = Math.max(0, dashTimer - deltaTime);
        const dashSpeed = player.speed * 3.15;
        deltaX = dashDirX * dashSpeed * deltaTime;
        deltaY = dashDirY * dashSpeed * deltaTime;
        player.direction = angleToPlayerFacing(Math.atan2(dashDirY, dashDirX));
        dashTrailTimer -= deltaTime;
        if (dashTrailTimer <= 0) {
          dashTrailTimer = 0.032;
          combatParticles.push({
            x: player.x + 8,
            y: player.y + 11,
            vx: -dashDirX * 18 + (Math.random() - 0.5) * 14,
            vy: -dashDirY * 18 + (Math.random() - 0.5) * 14,
            size: 1.6,
            color: "#7dd3fc",
            life: 0.18,
            maxLife: 0.18,
            isSpark: true
          });
        }
      }

      // Xử lý va chạm AABB trục X (16x16)
      if (deltaX !== 0) {
        const futureBoxX = {
          x: player.x + deltaX,
          y: player.y,
          width: player.width,
          height: player.height
        };
        const hitMapBoundX = futureBoxX.x < 0 || futureBoxX.x + futureBoxX.width > MAP_SIZE;
        if (!willPlayerCollide(futureBoxX) && !hitMapBoundX) {
          player.x = futureBoxX.x;
        }
      }

      // Xử lý va chạm AABB trục Y (16x16)
      if (deltaY !== 0) {
        const futureBoxY = {
          x: player.x,
          y: player.y + deltaY,
          width: player.width,
          height: player.height
        };
        const hitMapBoundY = futureBoxY.y < 0 || futureBoxY.y + futureBoxY.height > MAP_SIZE;
        if (!willPlayerCollide(futureBoxY) && !hitMapBoundY) {
          player.y = futureBoxY.y;
        }
      }

      // AI Heo Rừng & tài nguyên (đứng yên khi thời gian dừng hẳn)
      if (worldDt > 0) {
        updateMobsAI(worldDt);
        updateHarvestablesRespawn(worldDt);
      }

      // Cổng dịch chuyển (kèm cooldown chống loop dịch chuyển)
      if (currentMap === "forest" && mapConfigs.forest.portalToLake && portalCooldown <= 0 && checkAABB(player, mapConfigs.forest.portalToLake)) {
        portalCooldown = 1.0;
        const p2 = mapConfigs.forest.portalToLake;
        loadMap(p2.targetMap, p2.targetPlayerPos);
                return;
      }
      if (currentPortal && portalCooldown <= 0 && checkAABB(player, currentPortal)) {
        portalCooldown = 1.0; // Đặt thời gian hồi 1 giây khi vừa dịch chuyển sang map mới
        const targetMap = currentPortal.targetMap;
        const newSpawnPos = currentPortal.targetPlayerPos;
        loadMap(targetMap, newSpawnPos);

        const mapName = targetMap === "forest" ? "Khu Rừng (Forest)" : "Ngôi Nhà (Home)";
              }

      // Cập nhật hệ thống hạt Particle & hiệu ứng phép theo dòng thời gian
      if (worldDt > 0) {
        updateCombatParticles(worldDt);
        updateGravityAndSpellEffects(worldDt);
      }

      // Cập nhật Screen Shake
      if (screenShakeTimer > 0) {
        screenShakeTimer -= deltaTime;
        const progress = Math.max(0, screenShakeTimer / Math.max(0.05, screenShakeDuration));
        const currentIntensity = screenShakeIntensity * progress;
        screenShakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
        screenShakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;
      } else {
        screenShakeOffsetX = 0;
        screenShakeOffsetY = 0;
      }

      // -----------------------------------------------------------
      // CẬP NHẬT CAMERA CĂN GIỮA NHÂN VẬT THEO ZOOM 3X (Yêu cầu 3)
      const activeZoom = getCameraZoom();
      const visibleWidth = canvas.width / activeZoom;
      const visibleHeight = canvas.height / activeZoom;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      camera.x = playerCenterX - visibleWidth / 2 + screenShakeOffsetX;
      camera.y = playerCenterY - visibleHeight / 2 + screenShakeOffsetY;

      if (valPlayerPos) {
        valPlayerPos.textContent = `X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`;
      }

      if (teleportFlashOpacity > 0) {
        teleportFlashOpacity -= deltaTime * 1.5;
        if (teleportFlashOpacity < 0) teleportFlashOpacity = 0;
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= (ft.vy || 25) * deltaTime;
        ft.lifeTime -= deltaTime;
        ft.opacity = Math.max(0, ft.lifeTime);
        if (ft.lifeTime <= 0) {
          floatingTexts.splice(i, 1);
        }
      }
    }

    // -------------------------------------------------------------
    // 10. HÀM VẼ TOÀN BỘ GAME (RENDER VỚI SCALE 3X & KHỬ MỜ) (Yêu cầu 3 & 4)
    // -------------------------------------------------------------
    function render() {
      // ĐẢM BẢO KHỬ MỜ RĂNG CƯA MỖI LẦN VẼ (Yêu cầu 4)
      applyPixelPerfectSettings();

      const config = mapConfigs[currentMap] || mapConfigs.home;

      // Xóa toàn màn hình
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- ÁP DỤNG PHÓNG ĐẠI GLOBAL SCALE (3X Desktop / 2X Mobile) & DỜI CAMERA ---
      ctx.save();
      const activeZoom = getCameraZoom();
      const snapPx = (v) => Math.round(v * activeZoom) / activeZoom;
      ctx.scale(activeZoom, activeZoom);
      // Dời hệ quy chiếu theo tọa độ Camera đã căn lưới pixel nguyên để không rớt pixel khi đi 8 hướng
      ctx.translate(-snapPx(camera.x), -snapPx(camera.y));

      // NỀN BẢN ĐỒ:
      // Ở bản đồ 'home', vẽ bản đồ LDtk (Ground, Water, Rock, Plains) từ map_home.json
      // Ở bản đồ 'forest', vẽ bản đồ LDtk (Jungles, Water, Fences) từ map_rung.json
      if (currentMap === "home" && homeMapData) {
        drawMap(ctx, homeMapData);
      } else if (currentMap === "forest" && forestMapData) {
        drawMap(ctx, forestMapData);
      } else if (currentMap === "lake" && lakeMapData) {
        ctx.fillStyle = "#3898d4";
        ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
        drawMap(ctx, lakeMapData);
      } else if (images.grass && images.grass.complete && images.grass.naturalWidth > 0) {
        const grassSrcX = currentMap === "home" ? 0 : 16;
        for (let x = 0; x < MAP_SIZE; x += TILE_SIZE) {
          for (let y = 0; y < MAP_SIZE; y += TILE_SIZE) {
            ctx.drawImage(
              images.grass,
              grassSrcX, 0, 16, 16, // Source rect
              x, y, 16, 16          // Dest rect
            );
          }
        }
      } else {
        // Fallback màu nếu chưa tải xong ảnh
        ctx.fillStyle = config.color;
        ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
      }

      // Viền ranh giới bản đồ
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

      // --- VẼ CỔNG DỊCH CHUYỂN 16x16 (Yêu cầu 1) ---
      if (currentMap === "forest" && mapConfigs.forest.portalToLake) {
        const p2 = mapConfigs.forest.portalToLake;
        ctx.save();
        ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
        ctx.fillRect(p2.x, p2.y, p2.width, p2.height);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p2.x, p2.y, p2.width, p2.height);
        ctx.font = "bold 7px monospace";
        ctx.fillStyle = "#e0f2fe";
        ctx.textAlign = "center";
        ctx.fillText(p2.label, p2.x + p2.width / 2, p2.y - 3);
        ctx.restore();
      }
      if (currentPortal) {
        ctx.fillStyle = currentPortal.color;
        ctx.fillRect(currentPortal.x, currentPortal.y, currentPortal.width, currentPortal.height);

        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1;
        ctx.strokeRect(currentPortal.x, currentPortal.y, currentPortal.width, currentPortal.height);

        // Lõi portal ma thuật
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(currentPortal.x + 4, currentPortal.y + 4, 8, 8);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(currentPortal.x + 6, currentPortal.y + 6, 4, 4);

        // Nhãn chỉ dẫn nhỏ gọn
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 7px monospace";
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = 2;
        const labelX = currentPortal.x > 500 ? currentPortal.x - 45 : currentPortal.x + 20;
        const labelY = currentPortal.y + 11;
        ctx.strokeText(`[${currentPortal.label}]`, labelX, labelY);
        ctx.fillText(`[${currentPortal.label}]`, labelX, labelY);
      }

      // --- HIỆU ỨNG SÓNG NƯỚC & BÓNG CÁ BƠI DƯỚI MẶT NƯỚC ---
      for (const rp of fishingState.ripples) {
        const a = Math.max(0, rp.life / rp.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = rp.color || "rgba(224, 242, 254, 0.8)";
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (fishingState.fishShadow.active) {
        const fs = fishingState.fishShadow;
        const swimAng = Math.atan2(fishingState.bobberY - fs.startY, fishingState.bobberX - fs.startX);
        const tailWag = Math.sin(performance.now() * 0.025) * 0.28;
        ctx.save();
        ctx.translate(fs.x, fs.y);
        ctx.rotate(swimAng + tailWag);
        ctx.fillStyle = "rgba(15, 23, 42, 0.42)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-3.5, 0);
        ctx.lineTo(-6.2, -1.8);
        ctx.lineTo(-6.2, 1.8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Hiệu ứng mặt đất của Phép Trọng Lực, Mộc Độn & Dừng Thời Gian
      const isTimeStopColorLayerActive = Boolean((timeStopState.active || timeStopState.resumeFlashTimer > 0) && timestopFxConfig.step3Enabled);
      const casterDrawFns = [];
      renderGravityGroundEffects(ctx);
      renderWoodGroundEffects(ctx);
      if (!isTimeStopColorLayerActive) {
        renderTimeStopGroundEffects(ctx);
      }

      // --- VẼ CÁC THỰC THỂ CÓ ĐỘ SÂU THEO TRỤC Y (Y-SORTING LAYER LOGIC) ---
      // Gom tất cả các đối tượng: Vật thể (Cây, Đá, Lò rèn), Heo Rừng và Player vào danh sách renderable
      const renderables = [];

      // 1. Thêm các vật thể bản đồ
      for (const obj of currentObjects) {
        // Tọa độ Y chân tiếp đất của vật thể để so sánh lớp
        const sortY = obj.y + (obj.height || 16);
        renderables.push({
          sortY: sortY,
          draw: () => {
            if (obj.type === "tree") {
              const isStump = obj.stage === "stump";
              const treeImg = images.tree1;
              const stumpImg = images.stump1;

              if (isStump && stumpImg && stumpImg.complete && stumpImg.naturalWidth > 0) {
                // Gốc cây: Stump 1.png (X=[75,122] (48px), Y=[200,239] (40px))
                ctx.drawImage(
                  stumpImg,
                  75, 200, 48, 40,
                  obj.x - 4, obj.y - 4, 24, 20
                );
              } else if (!isStump && treeImg && treeImg.complete && treeImg.naturalWidth > 0) {
                // Cây lớn: Tree1.png (X=[37,155] (119px), Y=[51,240] (190px))
                ctx.drawImage(
                  treeImg,
                  37, 51, 119, 190,
                  obj.x - 14, obj.y - 44, 44, 60
                );
              } else if (images.trees && images.trees.complete && images.trees.naturalWidth > 0) {
                const tType = isStump ? 0 : 1;
                ctx.drawImage(images.trees, tType * 16, 0, 16, 16, obj.x, obj.y, 16, 16);
              } else {
                ctx.fillStyle = isStump ? "#78350f" : "#15803d";
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
              }
            } else if (obj.type === "rock") {
              if (images.rocks && images.rocks.complete && images.rocks.naturalWidth > 0) {
                const rType = obj.rockType !== undefined ? obj.rockType : 0;
                ctx.drawImage(
                  images.rocks,
                  rType * 16, 0, 16, 16,
                  obj.x, obj.y, 16, 16
                );
              } else {
                ctx.fillStyle = "#94a3b8";
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
              }
            } else if (obj.type === "crafting_table") {
              const ctImg = images.crafting_table;
              if (ctImg && ctImg.complete && ctImg.naturalWidth > 0) {
                ctx.drawImage(ctImg, obj.x, obj.y, 16, 16);
              } else {
                ctx.fillStyle = "#854d0e";
                ctx.fillRect(obj.x, obj.y, 16, 16);
                ctx.strokeStyle = "#451a03";
                ctx.lineWidth = 1;
                ctx.strokeRect(obj.x, obj.y, 16, 16);
              }
            } else if (obj.type === "chest") {
              const chestImg = images.chest;
              if (chestImg && chestImg.complete && chestImg.naturalWidth > 0) {
                ctx.drawImage(chestImg, obj.x, obj.y, 16, 16);
              } else {
                ctx.fillStyle = "#b45309";
                ctx.fillRect(obj.x + 1, obj.y + 3, 14, 11);
                ctx.strokeStyle = "#451a03";
                ctx.lineWidth = 1;
                ctx.strokeRect(obj.x + 1, obj.y + 3, 14, 11);
                ctx.fillStyle = "#fde047";
                ctx.fillRect(obj.x + 7, obj.y + 7, 2, 3);
              }
              if (obj === activeOpenChest) {
                ctx.fillStyle = "rgba(250, 204, 21, 0.28)";
                ctx.fillRect(obj.x + 1, obj.y + 2, 14, 4);
              } else {
                const distToChest = Math.hypot((player.x + 8) - (obj.x + 8), (player.y + 8) - (obj.y + 8));
                if (distToChest <= INTERACTION_RADIUS + 22) {
                  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
                  ctx.fillRect(obj.x + 2, obj.y - 8, 12, 7);
                  ctx.fillStyle = "#fde047";
                  ctx.font = "bold 5px monospace";
                  ctx.textAlign = "center";
                  ctx.fillText("E", obj.x + 8, obj.y - 3);
                  ctx.textAlign = "left";
                }
              }
            } else if (obj.type === "forge") {
              ctx.fillStyle = "saddlebrown";
              ctx.fillRect(obj.x, obj.y, 16, 16);
              ctx.strokeStyle = "#451a03";
              ctx.lineWidth = 1;
              ctx.strokeRect(obj.x, obj.y, 16, 16);

              ctx.fillStyle = "#1e293b";
              ctx.fillRect(obj.x + 4, obj.y + 6, 8, 7);

              const firePulse = Math.sin(performance.now() / 150);
              ctx.fillStyle = firePulse > 0 ? "red" : "#ff4500";
              ctx.fillRect(obj.x + 6, obj.y + 8, 4, 4);

              ctx.fillStyle = "#fef08a";
              ctx.fillRect(obj.x + 7, obj.y + 9, 2, 2);
            }
          }
        });
      }

      
      // Vẽ vật phẩm rơi trên mặt đất (Pixel art bồng bềnh nhẹ nhàng - dùng Cache Image để chống lag)
      for (const gi of droppedItems) {
        if (gi.mapId && gi.mapId !== currentMap) continue;
        const iconSrc = getItemIcon(gi.item);
        const floatY = Math.sin(gi.bobTimer) * 2;

        renderables.push({
          sortY: gi.y + 8,
          draw: () => {
            ctx.save();
            // Bóng đổ xám mờ dưới đất
            ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
            ctx.beginPath();
            ctx.ellipse(gi.x + 5, gi.y + 10, 4.5, 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vẽ icon vật phẩm nổi bồng bềnh từ cache
            const cachedImg = getCachedIconImage(iconSrc);
            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
              ctx.drawImage(cachedImg, gi.x, gi.y + floatY, 10, 10);
            } else {
              ctx.fillStyle = "#fbbf24";
              ctx.fillRect(gi.x + 1, gi.y + 1 + floatY, 8, 8);
            }
            ctx.restore();
          }
        });
      }

      const getMobSquashTransform = (mob) => {
        const gs = mob.gravitySquash;
        if (!gs) return { scaleX: 1, scaleY: 1, offsetY: 0 };
        const t = Math.max(0, Math.min(1, gs.elapsed / Math.max(0.05, gs.duration)));
        if (gs.isOvercrush) {
          // Đè quá mạnh: bẹp dí như tờ giấy (14% cao, 195% rộng) rồi bật nảy cao lên và đáp xuống
          if (t < 0.42) {
            const k = Math.min(1, t / 0.12);
            return {
              scaleY: 1 + (0.14 - 1) * k,
              scaleX: 1 + (1.95 - 1) * k,
              offsetY: 0
            };
          } else if (t < 0.78) {
            const pop = (t - 0.42) / 0.36;
            const arc = Math.sin(pop * Math.PI);
            const stretch = Math.min(1, pop * 1.6);
            return {
              scaleY: 0.14 + (1.36 - 0.14) * stretch,
              scaleX: 1.95 + (0.76 - 1.95) * stretch,
              offsetY: -arc * 11
            };
          } else {
            const settle = (t - 0.78) / 0.22;
            return {
              scaleY: 1.36 + (1 - 1.36) * settle,
              scaleX: 0.76 + (1 - 0.76) * settle,
              offsetY: 0
            };
          }
        }
        // Đè bẹp tiêu chuẩn (~55% cao, bè ra hai bên, rồi bật lại đàn hồi)
        if (t < 0.22) {
          const k = t / 0.22;
          return {
            scaleY: 1 + (gs.targetScaleY - 1) * k,
            scaleX: 1 + (gs.targetScaleX - 1) * k,
            offsetY: 0
          };
        }
        const r = (t - 0.22) / 0.78;
        const ease = 1 - Math.pow(1 - r, 2.2);
        const bounce = Math.sin(r * Math.PI) * 0.16 * (1 - r);
        return {
          scaleY: gs.targetScaleY + (1 - gs.targetScaleY) * ease + bounce,
          scaleX: gs.targetScaleX + (1 - gs.targetScaleX) * ease - bounce * 0.65,
          offsetY: -Math.max(0, Math.sin(r * Math.PI) * 2.2)
        };
      };

      // 2. Thêm Heo Rừng & Gà Rừng
      for (const mob of currentMobs) {
        
        if (mob.type === "chicken") {
          const sortY = mob.y + mob.height;
          renderables.push({
            sortY: sortY,
            draw: () => {
              const sq = getMobSquashTransform(mob);
              if (sq.offsetY < -0.5) {
                ctx.save();
                ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
                ctx.beginPath();
                ctx.ellipse(mob.x + 8, mob.y + 15, 5.5, 2.2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }
              ctx.save();
              if (mob.hurtFlashTimer > 0) {
                ctx.filter = "brightness(5) contrast(2)";
              } else if (mob.burnTimer > 0) {
                ctx.filter = "sepia(0.6) hue-rotate(-25deg) saturate(2.1) brightness(1.08)";
              } else if (mob.slowTimer > 0) {
                ctx.filter = "hue-rotate(155deg) saturate(1.4)";
              }
              ctx.translate(mob.x + 8, mob.y + 16 + sq.offsetY);
              ctx.scale(sq.scaleX, sq.scaleY);
              if (images.chicken && images.chicken.complete && images.chicken.naturalWidth > 0) {
                const fX = mob.frameX || 0;
                const fY = mob.frameY || 0;
                ctx.drawImage(
                  images.chicken,
                  fX * 16, fY * 16, 16, 16,
                  -8, -16, 16, 16
                );
              } else {
                ctx.fillStyle = mob.color;
                ctx.fillRect(-8, -16, mob.width, mob.height);
              }
              ctx.restore();

              // Thanh máu mini của Gà
              if (mob.hp < mob.maxHp && mob.hp > 0) {
                const barW = 16, barH = 3, barX = mob.x, barY = mob.y - 6 + sq.offsetY;
                ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
                ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
                const ghostPct = Math.max(0, Math.min(1, mob.displayHp / mob.maxHp));
                ctx.fillStyle = "#facc15";
                ctx.fillRect(barX, barY, barW * ghostPct, barH);
                const hpPct = Math.max(0, Math.min(1, mob.hp / mob.maxHp));
                ctx.fillStyle = "#ef4444";
                ctx.fillRect(barX, barY, barW * hpPct, barH);
              }
            }
          });
        }

        if (mob.type === "boar") {
          const sortY = mob.y + mob.height;
          renderables.push({
            sortY: sortY,
            draw: () => {
              // Hiệu ứng lao húc lướt một đoạn ngắn (lungeDist = 12px)
              const lungeDist = (mob.lungeProgress || 0) * 12;
              const drawX = mob.x + (mob.dirX || 0) * lungeDist;
              const drawY = mob.y + (mob.dirY || 0) * lungeDist;
              const sq = getMobSquashTransform(mob);

              if (sq.offsetY < -0.5) {
                ctx.save();
                ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
                ctx.beginPath();
                ctx.ellipse(drawX + 8, drawY + 15, 6.5, 2.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }

              ctx.save();
              // Chớp trắng xóa khi bị đánh trúng (Hurt Flash)
              if (mob.hurtFlashTimer > 0) {
                ctx.filter = "brightness(5) contrast(2)";
              } else if (mob.burnTimer > 0) {
                ctx.filter = "sepia(0.6) hue-rotate(-25deg) saturate(2.1) brightness(1.08)";
              } else if (mob.slowTimer > 0) {
                ctx.filter = "hue-rotate(155deg) saturate(1.4)";
              }

              ctx.translate(drawX + 8, drawY + 16 + sq.offsetY);
              ctx.scale(sq.scaleX, sq.scaleY);

              if (images.boar && images.boar.complete && images.boar.naturalWidth > 0) {
                const fX = mob.frameX || 0;
                const fY = mob.frameY || 0;
                ctx.drawImage(
                  images.boar,
                  fX * 16, fY * 16, 16, 16,
                  -8, -16, 16, 16
                );
              } else {
                ctx.fillStyle = mob.color;
                ctx.fillRect(-8, -16, mob.width, mob.height);
              }
              ctx.restore();

              // HIỆU ỨNG PHẢN LỰC / VỆT GIÓ LAO TỚI NGAY TRƯỚC ĐẦU HEO (Thrust / Jet Trails)
              if (mob.lungeProgress > 0.05) {
                ctx.save();
                const headX = drawX + 8 + (mob.dirX || 0) * 9;
                const headY = drawY + 8 + (mob.dirY || 0) * 9;
                const trailAlpha = Math.min(1.0, mob.lungeProgress);

                // Vệt gió phản lực hình nón xòe ra trước mũi heo
                ctx.fillStyle = "rgba(255, 237, 213, " + (trailAlpha * 0.75) + ")";
                ctx.beginPath();
                ctx.arc(headX, headY, 5 * mob.lungeProgress, 0, Math.PI * 2);
                ctx.fill();

                // Các vệt tia gió tốc độ bay ngược về sau hai bên mạn sườn
                ctx.strokeStyle = "rgba(254, 215, 170, " + (trailAlpha * 0.9) + ")";
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                // Tia 1
                ctx.moveTo(headX, headY);
                ctx.lineTo(drawX + 8 - (mob.dirX || 0) * 6 - (mob.dirY || 0) * 6, drawY + 8 - (mob.dirY || 0) * 6 + (mob.dirX || 0) * 6);
                // Tia 2
                ctx.moveTo(headX, headY);
                ctx.lineTo(drawX + 8 - (mob.dirX || 0) * 6 + (mob.dirY || 0) * 6, drawY + 8 - (mob.dirY || 0) * 6 - (mob.dirX || 0) * 6);
                ctx.stroke();
                ctx.restore();
              }

              // Vẽ thanh máu mini trên đầu Heo Rừng khi bị mất máu
              if (mob.hp < mob.maxHp && mob.hp > 0) {
                const barW = 16;
                const barH = 3;
                const barX = mob.x;
                const barY = mob.y - 6;

                // Nền đen
                ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
                ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

                // Thanh đệm đỏ/vàng theo lerp
                const ghostPct = Math.max(0, Math.min(1, mob.displayHp / mob.maxHp));
                ctx.fillStyle = "#facc15"; // Vàng
                ctx.fillRect(barX, barY, barW * ghostPct, barH);

                // Thanh máu thật
                const hpPct = Math.max(0, Math.min(1, mob.hp / mob.maxHp));
                ctx.fillStyle = "#ef4444"; // Đỏ
                ctx.fillRect(barX, barY, barW * hpPct, barH);
              }
            }
          });
        }
      }

      // 3. Thêm Nhân Vật (Player)
      const playerSortY = player.y + player.height;
      const drawPlayerEntity = () => {
          ctx.save();
          // Hiệu ứng chớp đỏ thuần túy khi bị thương (không lòe loẹt, không sáng quá lâu)
          if (player.hurtFlashTimer > 0) {
            ctx.filter = "sepia(1) saturate(6) hue-rotate(-50deg)";
          } else if (player.invulnerableTimer > 0) {
            // Nhấp nháy mờ nhẹ bình thường trong thời gian invulnerable
            ctx.globalAlpha = Math.floor(performance.now() / 90) % 2 === 0 ? 0.4 : 0.95;
          }

          if (images.player && images.player.complete && images.player.naturalWidth > 0) {
            const playerImg = getEquippedPlayerSprite();
            // Kích thước 1 khung hình từ sprite sheet (10 hàng x 6 cột)
            const frameWidth = (playerImg.naturalWidth || playerImg.width) / 6;
            const frameHeight = (playerImg.naturalHeight || playerImg.height) / 10;
            const sx = player.frameX * frameWidth;
            const sy = player.frameY * frameHeight;

            // Kích thước vẽ trên bản đồ (giữ nguyên tỷ lệ 1:1 pixel art theo frame hoặc 48x48)
            const destWidth = frameWidth;
            const destHeight = frameHeight;

            // Căn chỉnh chân nhân vật khớp với hitbox 16x16:
            const drawOffsetX = (player.width - destWidth) / 2;
            const drawOffsetY = player.height - destHeight;

            // Nhấn nhá động tác rướn người theo hướng bắn khi vung đũa phép
            let castLungeX = 0;
            let castLungeY = 0;
            if (wandCastTimer > 0 && player.action !== 'die') {
              const wt = 1 - (wandCastTimer / WAND_CAST_DURATION);
              const lungeMag = (wt >= 0.12 && wt <= 0.60)
                ? Math.sin(((wt - 0.12) / 0.48) * Math.PI) * 1.4
                : 0;
              castLungeX = Math.cos(wandCastAngle) * lungeMag;
              castLungeY = Math.sin(wandCastAngle) * lungeMag * 0.8;
            }

            const drawX = player.x + drawOffsetX + castLungeX;
            const drawY = player.y + drawOffsetY + castLungeY;
            const pDrawX = snapPx(drawX);
            const pDrawY = snapPx(drawY);
            const pFlipCenterX = snapPx(player.x + player.width / 2 + castLungeX);

            if (player.direction === 'left' && player.action !== 'die') {
              // Lật ngược Canvas theo trục X khi quay sang trái (căn pixel nguyên chống mất nét viền)
              ctx.save();
              ctx.translate(pFlipCenterX, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(
                playerImg,
                sx, sy, frameWidth, frameHeight,
                -destWidth / 2, pDrawY, destWidth, destHeight
              );
              drawHelmetOverlay(ctx, -destWidth / 2, pDrawY, player.direction, player.frameX, player.action);
              ctx.restore();
            } else {
              // Hướng thường: down, right, up
              ctx.drawImage(
                playerImg,
                sx, sy, frameWidth, frameHeight,
                pDrawX, pDrawY, destWidth, destHeight
              );
              drawHelmetOverlay(ctx, pDrawX, pDrawY, player.direction, player.frameX, player.action);
            }
          } else {
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);

            ctx.strokeStyle = "#00008b";
            ctx.lineWidth = 1;
            ctx.strokeRect(player.x, player.y, player.width, player.height);

            ctx.fillStyle = "white";
            ctx.fillRect(player.x + 3, player.y + 3, 3, 3);
            ctx.fillRect(player.x + 10, player.y + 3, 3, 3);
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(player.x + 4, player.y + 4, 2, 2);
            ctx.fillRect(player.x + 11, player.y + 4, 2, 2);
          }
          ctx.restore();
      };
      if (isTimeStopColorLayerActive) {
        casterDrawFns.push(drawPlayerEntity);
      } else {
        renderables.push({
          sortY: playerSortY,
          draw: drawPlayerEntity
        });
      }

      // Sắp xếp thứ tự vẽ theo Y (Y-Sorting): Thực thể nào có chân ở trên (Y nhỏ) vẽ trước, ở dưới (Y lớn) vẽ đè lên
      if (currentMap === "home") {
        // Sprite Pixel-Art Lửa Trại (22x14 đá & củi đan chéo + 6 frame ngọn lửa hữu cơ)
        if (!window._campfireSpriteCache) {
          const basePal = {
            '.': null,
            's': 'rgba(15, 23, 42, 0.34)',
            'o': '#1c1917',
            'd': '#334155',
            'm': '#64748b',
            'h': '#94a3b8',
            'w': '#fdba74',
            'a': '#292524',
            'b': '#27150a',
            'k': '#451a03',
            'l': '#78350f',
            'g': '#a16207',
            'e': '#ea580c',
            'y': '#facc15'
          };
          const baseGrid = [
            "......ooo....ooo......",
            ".....ohmdo..odmho.....",
            "....ohmmwobbowmmho....",
            "...oodddobglgbodddoo..",
            "..ohmmdobkllgkbodmmho.",
            "..omdwoaaklglkaowdmo..",
            "..oodaakleeyyelkaadoo.",
            "...obglkaeyyyyaklgbo..",
            "..obglkbbkaaaakbbklgbo",
            "..obbbdoommaaamoodbbbo",
            "..soohmdommmmmmodmhoss",
            "..soomddoddddddoddmoss",
            "...sooooosooooosoooos.",
            "....ssssssssssssssss.."
          ];
          const baseCv = document.createElement("canvas");
          baseCv.width = 22;
          baseCv.height = 14;
          const bCtx = baseCv.getContext("2d");
          for (let ry = 0; ry < baseGrid.length; ry++) {
            const row = baseGrid[ry];
            for (let rx = 0; rx < row.length; rx++) {
              const col = basePal[row[rx]];
              if (col) {
                bCtx.fillStyle = col;
                bCtx.fillRect(rx, ry, 1, 1);
              }
            }
          }

          const flamePal = {
            '.': null,
            'R': '#b91c1c',
            'O': '#f97316',
            'Y': '#facc15',
            'W': '#fef9c3'
          };
          const flameGrids = [
            [
              "......R.......",
              ".....RO.......",
              ".....ROY..R...",
              "....ROYO.RO...",
              "...ROYYORO....",
              "...ROYYYO.....",
              "..ROYWYYOR....",
              "..ROWWWYOR....",
              ".ROWWWWYYOR...",
              ".ROWWWWWYOR...",
              ".ROWWWWWYOR...",
              "..ROWWYYOR....",
              "...ROYYOR.....",
              "....RRRR......"
            ],
            [
              ".......R......",
              "......OR......",
              "..R..OYOR.....",
              "..RO.OYYOR....",
              "...ROYYYO.....",
              "...ROYYYOR....",
              "..ROYWWYYOR...",
              "..ROWWWYOR....",
              ".ROWWWWWYOR...",
              ".ROWWWWWWOR...",
              ".ROWWWWWYYOR..",
              "..ROWWWYYOR...",
              "...ROYYOR.....",
              "....RRRR......"
            ],
            [
              "........R.....",
              ".......RO.....",
              "......ROYO....",
              "...R..ROYO....",
              "...ROOYYYO....",
              "..ROYYYYOR....",
              "..ROYWYYOR....",
              ".ROWWWYOR.....",
              ".ROWWWWWYOR...",
              ".ROWWWWWYOR...",
              ".ROWWWWYYOR...",
              "..ROWWYYOR....",
              "...ROYYOR.....",
              "....RRRR......"
            ],
            [
              ".....R........",
              "....RO........",
              "....ROY...R...",
              "...ROYO..RO...",
              "...ROYYOOR....",
              "..ROYYYYOR....",
              "..ROYYWWYOR...",
              "..ROWWWWYOR...",
              ".ROWWWWWYOR...",
              ".ROWWWWWWOR...",
              ".ROWWWWYYOR...",
              "..ROWWYYOR....",
              "...ROYYOR.....",
              "....RRRR......"
            ],
            [
              "......R.......",
              ".....RO.......",
              "....ROYO......",
              "....ROYYO.R...",
              "...ROYYYOOR...",
              "..ROYYYYOR....",
              "..ROYWYYOR....",
              ".ROYWWWYOR....",
              ".ROWWWWWYOR...",
              ".ROWWWWWYOR...",
              ".ROWWWWWYYOR..",
              "..ROWWYYOR....",
              "...ROYYOR.....",
              "....RRRR......"
            ],
            [
              ".......R......",
              "......RO......",
              "..R...ROY.....",
              "..RO.ROYYO....",
              "...ROROYYO....",
              "...ROYYYYOR...",
              "..ROYYWWYOR...",
              "..ROWWWWYOR...",
              ".ROWWWWWYOR...",
              ".ROWWWWWWOR...",
              ".ROWWWWYYOR...",
              "..ROWWYYOR....",
              "...ROYYOR.....",
              "....RRRR......"
            ]
          ];
          const flameCanvases = flameGrids.map(grid => {
            const fc = document.createElement("canvas");
            fc.width = 14;
            fc.height = 14;
            const fCtx = fc.getContext("2d");
            for (let ry = 0; ry < grid.length; ry++) {
              const row = grid[ry];
              for (let rx = 0; rx < row.length; rx++) {
                const col = flamePal[row[rx]];
                if (col) {
                  fCtx.fillStyle = col;
                  fCtx.fillRect(rx, ry, 1, 1);
                }
              }
            }
            return fc;
          });
          window._campfireSpriteCache = { baseCv, flameCanvases };
        }

        // Vẽ ánh sáng ấm quanh Lửa Trại
        const nowSec = performance.now() * 0.001;
        const isCooking = HOME_CAMPFIRE.fuelRemaining > 0;
        const flicker = Math.sin(nowSec * 9.5) * 2.4 + Math.cos(nowSec * 15.2) * 1.1;
        const cx = HOME_CAMPFIRE.x;
        const cy = HOME_CAMPFIRE.y;
        const lightR = HOME_CAMPFIRE.lightRadius + (isCooking ? 8 : 0) + flicker;
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, lightR);
        grad.addColorStop(0, isCooking ? "rgba(253, 186, 116, 0.42)" : "rgba(251, 146, 60, 0.30)");
        grad.addColorStop(0.55, "rgba(245, 158, 11, 0.13)");
        grad.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, lightR, 0, Math.PI * 2);
        ctx.fill();

        renderables.push({
          sortY: cy + 6,
          draw: () => {
            const cache = window._campfireSpriteCache;
            const bx = snapPx(cx - 11);
            const by = snapPx(cy - 6);
            ctx.drawImage(cache.baseCv, bx, by);

            // Nhịp hắt sáng than hồng dưới củi
            const emberPulse = 0.45 + 0.35 * Math.sin(nowSec * 6.5);
            ctx.fillStyle = `rgba(251, 146, 60, ${emberPulse})`;
            ctx.fillRect(bx + 9, by + 6, 4, 2);

            // Ngọn lửa 6 frame sắc nét
            const fps = isCooking ? 12 : 8.5;
            const frameIdx = Math.floor(nowSec * fps) % cache.flameCanvases.length;
            const flameX = snapPx(cx - 7);
            const flameY = snapPx(cy - 13);
            ctx.drawImage(cache.flameCanvases[frameIdx], flameX, flameY);

            // Tàn lửa bay lên & làn khói mỏng tự nhiên
            const sparkCount = isCooking ? 4 : 2;
            for (let si = 0; si < sparkCount; si++) {
              const phase = (nowSec * (isCooking ? 0.95 : 0.65) + si * 0.37) % 1;
              const sx = cx + Math.sin(nowSec * 3.8 + si * 2.1) * (2.5 + phase * 2.0);
              const sy = cy - 9 - phase * (isCooking ? 14 : 10);
              ctx.fillStyle = phase < 0.45
                ? `rgba(254, 240, 138, ${(1 - phase) * 0.95})`
                : `rgba(249, 115, 22, ${(1 - phase) * 0.85})`;
              ctx.fillRect(snapPx(sx), snapPx(sy), 1, 1);
            }

            for (let sm = 0; sm < 2; sm++) {
              const sPhase = (nowSec * 0.42 + sm * 0.5) % 1;
              const smX = cx + Math.sin(nowSec * 2.2 + sm * 3.0) * (1.8 + sPhase * 2.5);
              const smY = cy - 13 - sPhase * 12;
              const smSize = sPhase > 0.5 ? 2 : 1;
              ctx.fillStyle = `rgba(203, 213, 225, ${(1 - sPhase) * 0.28})`;
              ctx.fillRect(snapPx(smX), snapPx(smY), smSize, smSize);
            }
          }
        });

        // VẼ VÒNG KHẢM ĐŨA PHÉP (HOME_WAND_ALTAR): Đưa chuột vào nhấn hoặc chạy vào để mở ô thêm chiêu thức
        {
          const ax = HOME_WAND_ALTAR.x;
          const ay = HOME_WAND_ALTAR.y;
          const distPlayerAltar = Math.hypot((player.x + 8) - ax, (player.y + 8) - ay);
          const altarHighlighted = isHoveringWandAltar || distPlayerAltar <= 28;
          const auraR = altarHighlighted ? 26 : 21;

          const altarGrad = ctx.createRadialGradient(ax, ay, 2, ax, ay, auraR);
          altarGrad.addColorStop(0, altarHighlighted ? "rgba(192, 132, 252, 0.42)" : "rgba(168, 85, 247, 0.24)");
          altarGrad.addColorStop(0.6, "rgba(126, 34, 206, 0.12)");
          altarGrad.addColorStop(1, "rgba(126, 34, 206, 0)");
          ctx.fillStyle = altarGrad;
          ctx.beginPath();
          ctx.arc(ax, ay, auraR, 0, Math.PI * 2);
          ctx.fill();

          // Vẽ bệ đá + vòng cổ ngữ xoay nhẹ trên mặt đất (không chặn bước chân)
          ctx.save();
          ctx.translate(ax, ay);
          ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
          ctx.beginPath();
          ctx.ellipse(0, 1, 11, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = altarHighlighted ? "#fde047" : "rgba(192, 132, 252, 0.85)";
          ctx.lineWidth = altarHighlighted ? 1.4 : 1.0;
          ctx.beginPath();
          ctx.ellipse(0, 1, 10.5, 6.5, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.save();
          ctx.scale(1, 0.62);
          ctx.rotate(nowSec * 0.9);
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = altarHighlighted ? "#f0abfc" : "rgba(216, 180, 254, 0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 1.5, 7.2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          ctx.restore();

          // Viên tinh thể & luồng sáng bay lơ lửng theo thứ tự depth
          renderables.push({
            sortY: ay + 2,
            draw: () => {
              const floatY = ay - 6 + Math.sin(nowSec * 3.1) * 1.4;
              ctx.save();
              // Tinh thể ma thuật hình thoi
              ctx.fillStyle = altarHighlighted ? "#fef08a" : "#e879f9";
              ctx.beginPath();
              ctx.moveTo(ax, floatY - 4);
              ctx.lineTo(ax + 3, floatY);
              ctx.lineTo(ax, floatY + 4);
              ctx.lineTo(ax - 3, floatY);
              ctx.closePath();
              ctx.fill();

              ctx.fillStyle = "#ffffff";
              ctx.fillRect(snapPx(ax - 0.5), snapPx(floatY - 2), 1, 2);

              if (altarHighlighted) {
                ctx.font = "bold 6px 'Chakra Petch', sans-serif";
                ctx.textAlign = "center";
                ctx.fillStyle = "rgba(11, 15, 25, 0.85)";
                ctx.fillRect(snapPx(ax - 28), snapPx(floatY - 14), 56, 8);
                ctx.fillStyle = "#fde68a";
                ctx.fillText("🪄 Khảm Đũa", ax, floatY - 8);
              }
              ctx.restore();
            }
          });
        }
      }

      // --- VẼ ĐŨA PHÉP KHI TUNG CHIÊU (TỐI ƯU 8 HƯỚNG + CHIỀU SÂU 2.5D + VỆT MA PHÁP) ---
      if (wandCastTimer > 0 && player.action !== 'die') {
        const playerSortY = player.y + player.height;
        const aimSin = Math.sin(wandCastAngle);
        const wandSortY = (aimSin < -0.2) ? (playerSortY - 2) : (playerSortY + 2);

        const drawWandEntity = () => {
            const walkBobs = [-2, -1, 0, -2, -1, 0];
            const bobY = (player.action === 'walk') ? walkBobs[player.frameX % 6] : 0;
            const { handX, handY, cosA, sinA } = getWandHandAnchor(wandCastAngle, bobY);

            const t = Math.max(0, Math.min(1, 1 - (wandCastTimer / WAND_CAST_DURATION)));

            // 3 pha vung đũa: 1. Nhấc đũa lấy đà -> 2. Quất dứt khoát + đưa tay tới -> 3. Thu nhẹ
            let swingOffset = 0;
            let thrust = 0;
            if (t < 0.18) {
              const p = t / 0.18;
              const ease = 1 - Math.pow(1 - p, 2);
              swingOffset = -0.85 * ease;
              thrust = -1.6 * ease;
            } else if (t < 0.56) {
              const p = (t - 0.18) / 0.38;
              const ease = 1 - Math.pow(1 - p, 3);
              swingOffset = -0.85 + 1.15 * ease;
              thrust = -1.6 + 5.0 * Math.sin(Math.min(1, p * 1.1) * Math.PI * 0.65);
            } else {
              const p = (t - 0.56) / 0.44;
              const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
              swingOffset = 0.30 * (1 - ease);
              thrust = 2.6 * (1 - ease);
            }

            const facingLeft = (cosA < -0.15);
            const localAimAngle = facingLeft ? Math.atan2(sinA, -cosA) : wandCastAngle;
            // Khi bắn thẳng lên trên (-90°), vung từ vai phải sang để không che gáy cứng nhắc
            const swingDir = (sinA < -0.85 && Math.abs(cosA) < 0.35) ? -1 : 1;
            const curLocalAngle = localAimAngle + swingOffset * swingDir;
            const curWorldAngle = facingLeft ? (Math.PI - curLocalAngle) : curLocalAngle;

            // Nén phối cảnh 2.5D khi mũi đũa chĩa theo trục dọc Lên/Xuống
            const foreshorten = 1.0 - Math.abs(Math.sin(curWorldAngle)) * 0.24;
            const tipProximityScale = 1.0 + Math.sin(curWorldAngle) * 0.12;

            const pivotX = handX + cosA * thrust;
            const pivotY = handY + sinA * thrust;

            ctx.save();
            ctx.translate(snapPx(pivotX), snapPx(pivotY));
            if (facingLeft) {
              ctx.scale(-1, 1);
            }

            // Vẽ vệt chém ánh trăng ma pháp (Arcane Crescent Trail) bám theo mặt phẳng 2.5D của tay
            if (t >= 0.14 && t <= 0.72) {
              const arcAlpha = Math.sin(((t - 0.14) / 0.58) * Math.PI);
              const startA = localAimAngle - 0.85 * swingDir;
              const endA = curLocalAngle;
              const arcRadius = 13.5 * (1.0 - Math.abs(sinA) * 0.20);

              ctx.save();
              ctx.scale(1.0, 1.0 - Math.abs(sinA) * 0.18);
              ctx.strokeStyle = `rgba(168, 85, 247, ${arcAlpha * 0.72})`;
              ctx.lineWidth = 3.2;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.arc(0, 0, arcRadius, startA, endA, swingDir < 0);
              ctx.stroke();

              ctx.strokeStyle = `rgba(224, 242, 254, ${arcAlpha * 0.90})`;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.arc(0, 0, arcRadius + 0.6, startA + 0.15 * swingDir, endA, swingDir < 0);
              ctx.stroke();
              ctx.restore();
            }

            // Xoay đúng trục mũi đũa phép (+X là hướng đầu đũa) và nén phối cảnh 2.5D
            ctx.rotate(curLocalAngle);
            ctx.scale(foreshorten, 1);

            // Hào quang và tia sao 4 cánh tại đầu đũa (x = 14.5, y = 0 trong hệ trục mũi đũa)
            const tipGlowAlpha = Math.max(0, 1 - Math.abs(t - 0.28) * 1.6);
            if (tipGlowAlpha > 0.05) {
              const glowR = (4.0 * tipProximityScale) * (0.7 + tipGlowAlpha * 0.5);
              const tipGrad = ctx.createRadialGradient(14.5, 0, 0.5, 14.5, 0, glowR * 1.4);
              tipGrad.addColorStop(0, `rgba(255, 255, 255, ${tipGlowAlpha})`);
              tipGrad.addColorStop(0.45, `rgba(217, 70, 239, ${tipGlowAlpha * 0.75})`);
              tipGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
              ctx.fillStyle = tipGrad;
              ctx.beginPath();
              ctx.arc(14.5, 0, glowR * 1.4, 0, Math.PI * 2);
              ctx.fill();

              // Ngôi sao 4 tia sắc nét
              const starLen = 3.5 * tipGlowAlpha * tipProximityScale;
              ctx.fillStyle = `rgba(255, 255, 255, ${tipGlowAlpha * 0.95})`;
              ctx.fillRect(14.5 - starLen, -0.5, starLen * 2, 1);
              ctx.fillRect(14.0, -starLen, 1, starLen * 2);
            }

            // Bù góc chéo -45° gốc của icon 'đũa phép.png'
            ctx.rotate(Math.PI / 4);
            if (images.magic_wand && images.magic_wand.complete && images.magic_wand.naturalWidth > 0) {
              ctx.drawImage(images.magic_wand, -2, -14, 16, 16);
            }
            ctx.restore();
        };
        if (isTimeStopColorLayerActive) {
          if (aimSin < -0.2) casterDrawFns.unshift(drawWandEntity);
          else casterDrawFns.push(drawWandEntity);
        } else {
          renderables.push({
            sortY: wandSortY,
            draw: drawWandEntity
          });
        }
      }

      // --- VẼ CẦN CÂU 8 HƯỚNG, DÂY CƯỚC & PHAO CÂU TRÊN MẶT NƯỚC ---
      if (fishingState.phase !== "idle" && player.action !== "die") {
        const playerSortY = player.y + player.height;
        const aimSin = Math.sin(fishingState.angle);
        const rodSortY = (aimSin < -0.2) ? (playerSortY - 2) : (playerSortY + 3);

        renderables.push({
          sortY: rodSortY,
          draw: () => {
            const walkBobs = [-2, -1, 0, -2, -1, 0];
            const bobY = (player.action === "walk") ? walkBobs[player.frameX % 6] : 0;
            const g = getFishingRodGeometry(fishingState.angle, bobY);

            // 1. Vẽ thân cần câu pixel 2 đoạn tạo độ cong dẻo khi kéo/quăng
            const midX = (g.baseX + g.tipX) * 0.5;
            const midY = (g.baseY + g.tipY) * 0.5 - (fishingState.phase === "biting" ? 1.2 : 1.5);

            ctx.save();
            ctx.lineCap = "round";
            // Viền gỗ sẫm
            ctx.strokeStyle = "#2a1608";
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(g.baseX, g.baseY);
            ctx.quadraticCurveTo(midX, midY, g.tipX, g.tipY);
            ctx.stroke();

            // Lõi tre/gỗ vàng ấm
            ctx.strokeStyle = "#bf7832";
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(g.baseX, g.baseY);
            ctx.quadraticCurveTo(midX, midY, g.tipX, g.tipY);
            ctx.stroke();

            // Đầu ngọn cần sáng & cuộn máy câu ở tay cầm
            ctx.fillStyle = "#f1d5a5";
            ctx.fillRect(snapPx(g.tipX - 0.6), snapPx(g.tipY - 0.6), 1.4, 1.4);
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect(snapPx(g.baseX + Math.cos(g.rodAngle) * 2.5 - 1), snapPx(g.baseY + Math.sin(g.rodAngle) * 2.5 - 1), 2.2, 2.2);
            ctx.restore();

            // 2. Tính vị trí phao hiện tại theo từng pha
            let bx = fishingState.bobberX;
            let by = fishingState.bobberY;
            let inWater = false;

            if (fishingState.phase === "casting") {
              const p = Math.min(1, fishingState.timer / fishingState.castDuration);
              if (p < 0.35) {
                bx = g.tipX;
                by = g.tipY + 2;
              } else {
                const fly = (p - 0.35) / 0.65;
                const arcHeight = Math.sin(fly * Math.PI) * 14;
                bx = g.tipX + (fishingState.bobberX - g.tipX) * fly;
                by = g.tipY + (fishingState.bobberY - g.tipY) * fly - arcHeight;
              }
            } else if (fishingState.phase === "waiting") {
              inWater = true;
              by += Math.sin(performance.now() * 0.006) * 0.9;
            } else if (fishingState.phase === "biting") {
              inWater = true;
              const dip = Math.abs(Math.sin(performance.now() * 0.028));
              bx += Math.sin(performance.now() * 0.04) * 1.1;
              by += 1.5 + dip * 2.4;
            } else if (fishingState.phase === "reeling") {
              const p = Math.min(1, fishingState.timer / fishingState.reelDuration);
              bx = fishingState.bobberX + (g.tipX - fishingState.bobberX) * p;
              by = fishingState.bobberY + (g.tipY - fishingState.bobberY) * p - Math.sin(p * Math.PI) * 7;
            }

            // 3. Vẽ dây cước nối từ đầu cần tới phao
            ctx.save();
            ctx.strokeStyle = fishingState.phase === "biting" ? "rgba(255, 255, 255, 0.92)" : "rgba(224, 242, 254, 0.78)";
            ctx.lineWidth = fishingState.phase === "biting" ? 0.95 : 0.75;
            ctx.beginPath();
            ctx.moveTo(g.tipX, g.tipY);
            const sag = fishingState.phase === "biting" ? 0.5 : 3.2;
            ctx.quadraticCurveTo((g.tipX + bx) * 0.5, (g.tipY + by) * 0.5 + sag, bx, by - 1);
            ctx.stroke();
            ctx.restore();

            // 4. Vẽ phao câu đỏ-trắng (+ vòng mặt nước khi nổi trên nước)
            ctx.save();
            if (inWater) {
              ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
              ctx.lineWidth = 0.7;
              ctx.beginPath();
              ctx.ellipse(bx, by + 1.5, 3.0, 1.5, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            // Viền tối phao
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(snapPx(bx - 2), snapPx(by - 2.5), 4, 4.5);
            // Nửa trên đỏ, nửa dưới trắng
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(snapPx(bx - 1.3), snapPx(by - 2), 2.6, 2);
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(snapPx(bx - 1.3), snapPx(by), 2.6, 1.5);

            // Chấm than [!] nhấp nháy nổi bật khi cá cắn câu!
            if (fishingState.phase === "biting") {
              const bounce = Math.sin(performance.now() * 0.025) * 1.5;
              const alertY = by - 11 + bounce;
              ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
              ctx.fillRect(snapPx(bx - 3.5), snapPx(alertY - 5), 7, 7);
              ctx.strokeStyle = "#facc15";
              ctx.lineWidth = 0.8;
              ctx.strokeRect(snapPx(bx - 3.5), snapPx(alertY - 5), 7, 7);
              ctx.fillStyle = "#fde047";
              ctx.font = "bold 7px monospace";
              ctx.textAlign = "center";
              ctx.fillText("!", bx, alertY + 0.8);
            }
            ctx.restore();
          }
        });
      }

      // --- VẼ CHIẾN LỢI PHẨM CÂU ĐƯỢC BAY TỪ DƯỚI NƯỚC VÀO TAY ---
      if (fishingState.caughtArc) {
        const ca = fishingState.caughtArc;
        renderables.push({
          sortY: player.y + player.height + 10,
          draw: () => {
            const p = Math.min(1, ca.progress);
            const targetX = player.x + 8;
            const targetY = player.y + 4;
            const ix = ca.startX + (targetX - ca.startX) * p;
            const iy = ca.startY + (targetY - ca.startY) * p - Math.sin(p * Math.PI) * 16;
            const img = images[ca.item.id];
            ctx.save();
            ctx.translate(ix, iy);
            if (img && img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, -6, -6, 12, 12);
            } else {
              ctx.fillStyle = "#38bdf8";
              ctx.fillRect(-4, -3, 8, 6);
            }
            ctx.restore();
          }
        });
      }

      // --- VIỀN TRẮNG Ô CHUỘT ĐANG TRỎ KHI CẦM ĐỒ ĐẶT ---
      const heldPlaceItem = playerInventory[activeHotbarIndex];
      const heldPlaceData = heldPlaceItem ? (getItemData(heldPlaceItem) || heldPlaceItem) : null;
      if (heldPlaceData && (heldPlaceData.category === 'placeable' || heldPlaceItem.id === 'crafting_table' || heldPlaceItem.id === 'chest') && player.action !== 'die') {
        if (hoverTileX !== null && hoverTileY !== null) {
          const dist = Math.hypot((hoverTileX + 8) - (player.x + 8), (hoverTileY + 8) - (player.y + 8));
          if (dist <= TILE_SIZE * 1.55) {
            const valid = isTilePlaceable(hoverTileX, hoverTileY);
            ctx.save();
            ctx.strokeStyle = valid ? "#ffffff" : "rgba(239, 68, 68, 0.85)";
            ctx.lineWidth = 1.25;
            ctx.strokeRect(hoverTileX + 0.5, hoverTileY + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
            ctx.restore();
          }
        }
      }

      if (currentMap === "home") {
        renderables.push({
          sortY: HOME_MERCHANT.y + 16,
          draw: () => {
            const mx = HOME_MERCHANT.x;
            const my = HOME_MERCHANT.y;
            const distPlayerNPC = Math.hypot((player.x + 8) - (mx + 8), (player.y + 8) - (my + 8));
            if (distPlayerNPC <= 40) {
              const pulse = 0.45 + Math.sin(performance.now() * 0.008) * 0.25;
              ctx.save();
              ctx.strokeStyle = `rgba(253, 224, 71, ${pulse})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(mx + 8, my + 9, 12, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = `rgba(253, 224, 71, ${pulse * 0.25})`;
              ctx.fill();
              ctx.restore();
            }
            const bob = Math.sin(performance.now() * 0.004) * 0.8;
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(mx + 2, my + 13, 12, 3);
            ctx.fillStyle = "#581c87";
            ctx.fillRect(mx + 3, my + 6 + bob, 10, 8);
            ctx.fillStyle = "#eab308";
            ctx.fillRect(mx + 6, my + 7 + bob, 4, 6);
            ctx.fillStyle = "#fcd34d";
            ctx.fillRect(mx + 4, my + 1 + bob, 8, 6);
            ctx.fillStyle = "#7e22ce";
            ctx.fillRect(mx + 3, my - 1 + bob, 10, 3);
            if (distPlayerNPC <= 44) {
              ctx.save();
              ctx.font = "700 5.5px 'Chakra Petch', sans-serif";
              ctx.textAlign = "center";
              ctx.fillStyle = "#fef08a";
              ctx.strokeStyle = "rgba(0,0,0,0.85)";
              ctx.lineWidth = 1.4;
              ctx.strokeText("Thương Nhân", mx + 8, my - 4 + bob);
              ctx.fillText("Thương Nhân", mx + 8, my - 4 + bob);
              ctx.restore();
            }
          }
        });
      }

      renderables.sort((a, b) => a.sortY - b.sortY);

      // Tiến hành vẽ tuần tự
      for (const item of renderables) {
        item.draw();
      }

      // --- VẼ CÁC MŨI TÊN & CẦU MA PHÁP ĐANG BAY TRÊN KHÔNG (PROJECTILES) ---
      for (const proj of activeProjectiles) {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.angle);

        if (proj.isMagicOrb) {
          const pulse = 1 + Math.sin(performance.now() * 0.024) * 0.14;
          const rType = proj.resonanceType;
          const orbColors = proj.gemBurn
            ? { tail1: "rgba(239, 68, 68, 0)", tail2: "rgba(249, 115, 22, 0.68)", tail3: "rgba(253, 224, 71, 0.95)", aura: "rgba(249, 115, 22, 0.50)", ring: "rgba(253, 224, 71, 0.85)", core: "#fef08a" }
            : (proj.gemFrost
              ? { tail1: "rgba(14, 165, 233, 0)", tail2: "rgba(56, 189, 248, 0.65)", tail3: "rgba(224, 242, 254, 0.95)", aura: "rgba(56, 189, 248, 0.48)", ring: "rgba(186, 230, 253, 0.85)", core: "#e0f2fe" }
              : (rType === "spell_gravity"
                ? { tail1: "rgba(88, 28, 135, 0)", tail2: "rgba(147, 51, 234, 0.68)", tail3: "rgba(240, 171, 252, 0.95)", aura: "rgba(126, 34, 206, 0.6)", ring: "rgba(216, 180, 254, 0.85)", core: "#f0abfc" }
                : (rType === "spell_timestop"
                  ? { tail1: "rgba(14, 165, 233, 0)", tail2: "rgba(56, 189, 248, 0.72)", tail3: "rgba(253, 224, 71, 0.95)", aura: "rgba(56, 189, 248, 0.56)", ring: "rgba(254, 240, 138, 0.88)", core: "#bae6fd" }
                  : (rType === "spell_wood"
                    ? { tail1: "rgba(20, 83, 45, 0)", tail2: "rgba(34, 197, 94, 0.68)", tail3: "rgba(134, 239, 172, 0.95)", aura: "rgba(22, 163, 74, 0.55)", ring: "rgba(187, 247, 208, 0.85)", core: "#86efac" }
                    : { tail1: "rgba(168, 85, 247, 0)", tail2: "rgba(192, 132, 252, 0.55)", tail3: "rgba(245, 208, 254, 0.9)", aura: "rgba(168, 85, 247, 0.48)", ring: "rgba(56, 189, 248, 0.75)", core: "#f5d0fe" }))));

          const tailGrad = ctx.createLinearGradient(-11, 0, 4, 0);
          tailGrad.addColorStop(0, orbColors.tail1);
          tailGrad.addColorStop(0.6, orbColors.tail2);
          tailGrad.addColorStop(1, orbColors.tail3);
          ctx.fillStyle = tailGrad;
          ctx.beginPath();
          ctx.moveTo(-11, 0);
          ctx.lineTo(1.5, -3.2 * pulse);
          ctx.lineTo(3.5, 0);
          ctx.lineTo(1.5, 3.2 * pulse);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = orbColors.aura;
          ctx.beginPath();
          ctx.arc(0, 0, (rType ? 5.6 : 5.2) * pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = orbColors.ring;
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.arc(0, 0, 3.6 * pulse, 0, Math.PI * 2);
          ctx.stroke();

          ctx.rotate(performance.now() * 0.012);
          ctx.fillStyle = orbColors.core;
          ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
        } else if (images.arrow && images.arrow.complete && images.arrow.naturalWidth > 0) {
          ctx.drawImage(images.arrow, -16, -16, 32, 32);
        } else {
          // Fallback nét vẽ pixel sắc sảo nếu đang tải ảnh
          ctx.fillStyle = "#854d0e";
          ctx.fillRect(-8, -1.5, 16, 3);
          ctx.fillStyle = "#cbd5e1";
          ctx.beginPath();
          ctx.moveTo(8, -3);
          ctx.lineTo(12, 0);
          ctx.lineTo(8, 3);
          ctx.fill();
        }
        ctx.restore();
      }

      // Hiệu ứng cột sáng tím, Mộc Độn & Dừng Thời Gian
      renderGravityAirEffects(ctx);
      renderWoodAirEffects(ctx);
      if (!isTimeStopColorLayerActive) {
        renderTimeStopAirEffects(ctx);
      }

      
      // --- VẼ THANH HIỆU ỨNG GỒNG LỰC CUNG TRÊN ĐẦU NHÂN VẬT ---
      if (isBowCharging && bowChargeTimer > 0) {
        ctx.save();
        const barW = 20;
        const barH = 3.5;
        const barX = Math.round(player.x + (player.width - barW) / 2);
        const barY = Math.round(player.y - 24);

        // Nền đen
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        const progress = Math.min(1.0, bowChargeTimer / BOW_MAX_CHARGE);
        // Màu sắc chuyển dần: Xanh dương nhạt (<0.5s) -> Xanh lục rực rỡ / Vàng cam (0.5s - 1.5s gồng tối đa 2 dmg)
        let barColor = "#38bdf8"; // 1 dmg
        if (bowChargeTimer >= BOW_MIN_CHARGE) {
          barColor = (bowChargeTimer >= 1.2) ? "#ef4444" : "#22c55e"; // Đỏ cảnh báo sắp gãy hoặc Xanh lục cực đại (2 dmg)
        }
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, Math.round(barW * progress), barH);

        // Chữ chỉ số sát thương gồng nhỏ phía trên thanh
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = (bowChargeTimer >= BOW_MIN_CHARGE) ? "#facc15" : "#e2e8f0";
        const dmgText = (bowChargeTimer >= BOW_MIN_CHARGE) ? "2 DMG" : "1 DMG";
        ctx.fillText(dmgText, player.x + 8, barY - 3);

        ctx.restore();
      }

      // --- VẼ THANH COOLDOWN ĐÒN ĐÁNH CỦA PLAYER (Chỉ hiển thị cho vũ khí cận chiến) ---
      const activeSlotItem = playerInventory[activeHotbarIndex];
      const holdingBowNow = activeSlotItem && (activeSlotItem.id === 'hunting_bow' || (activeSlotItem.name && activeSlotItem.name.includes('Cung')));
      if (player.attackCooldown > 0 && player.action !== 'die' && !holdingBowNow && !isBowCharging) {
        ctx.save();
        const maxCd = defaultStats.player.attackCooldown || 1.0;
        // Tiến trình hồi chiêu từ 0 (vừa đánh) đến 1 (sẵn sàng đánh)
        const readyProgress = Math.max(0, Math.min(1, 1 - (player.attackCooldown / maxCd)));
        const barW = 16; // Chiều dài 16px (đúng bằng chiều rộng 1 ô gạch/hitbox nhân vật)
        const barH = 2.5;  // Chiều cao 2.5px nhỏ xíu, thanh mảnh
        const barX = Math.round(player.x + (player.width - barW) / 2);
        // Đỉnh đầu nhân vật: player.y - 20px (nằm ngay phía trên mái tóc nhân vật)
        const barY = Math.round(player.y - 20);

        // Nền đen mờ có viền
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Thanh tiến trình chạy màu xanh ngọc dạ quang (Cyan Neon) cực kỳ sắc nét
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(barX, barY, Math.round(barW * readyProgress), barH);
        ctx.restore();
      }

      // --- VẼ HỆ THỐNG HẠT COMBAT PARTICLES (TIA LỬA, VÒNG PHÉP & MẢNH VỠ DEATH POP) ---
      for (const p of combatParticles) {
        ctx.save();
        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (p.isMagicRing) {
          const progress = 1 - alpha;
          const r = p.radius + (p.maxRadius - p.radius) * (1 - Math.pow(1 - progress, 2));
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(0.7, 1.8 * (1 - progress * 0.6));
          ctx.beginPath();
          // Vòng elip định hướng (nhìn thấy góc nghiêng 3D đúng hướng bắn) hoặc vòng tròn khi nổ trúng
          const rx = p.isCircularBurst ? r : r * 0.42;
          ctx.ellipse(0, 0, rx, r, 0, 0, Math.PI * 2);
          ctx.stroke();

          if (p.coreColor) {
            ctx.strokeStyle = p.coreColor;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.ellipse(0, 0, rx * 0.65, r * 0.65, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (p.isMagicMote) {
          const s = p.size * (0.5 + 0.5 * alpha);
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          if (s >= 1.5) {
            ctx.fillRect(p.x - s * 0.9, p.y - 0.35, s * 1.8, 0.7);
            ctx.fillRect(p.x - 0.35, p.y - s * 0.9, 0.7, s * 1.8);
          }
        } else if (p.isGravityDebris) {
          const py = p.y - (p.z || 0);
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
          ctx.fillRect(p.x - p.size * 0.4, p.y, p.size * 0.8, 1);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, py - p.size / 2, p.size, p.size);
          ctx.strokeStyle = "rgba(15, 23, 42, 0.65)";
          ctx.lineWidth = 0.45;
          ctx.strokeRect(p.x - p.size / 2, py - p.size / 2, p.size, p.size);
        } else if (p.isSpark) {
          // Tia lửa hình vệt dài hoặc chấm sáng pixel
          ctx.fillRect(p.x, p.y, p.size, p.size);
        } else {
          // Mảnh vỡ nổ dạng hạt góc cạnh
          ctx.fillRect(p.x, p.y, p.size, p.size);
          ctx.strokeStyle = "rgba(0,0,0,0.5)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(p.x, p.y, p.size, p.size);
        }
        ctx.restore();
      }

      if (isTimeStopColorLayerActive) {
        applyTimeStopGrayscaleWave(ctx, activeZoom, snapPx);
        renderTimeStopGroundEffects(ctx);
        for (const drawFn of casterDrawFns) {
          drawFn();
        }
        renderTimeStopAirEffects(ctx);
      }

      // Chữ bay tinh gọn (trong không gian World zoom 3x: 6-7px hiển thị sắc nét ~18-21px)
      for (const ft of floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1.0, ft.opacity));
        ctx.textAlign = "center";
        ctx.font = ft.isItem ? "700 7px 'Chakra Petch', sans-serif" : "700 6px 'Chakra Petch', sans-serif";
        ctx.lineWidth = ft.isItem ? 1.8 : 1.5;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.88)";
        ctx.strokeText(ft.text, ft.x + 8, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x + 8, ft.y);
        ctx.restore();
      }

      
      // Vẽ thanh tiến trình khai thác Cây hoặc Đá (Không thông báo chữ vướng mắt)
      if (activeHarvestTarget && harvestProgress > 0) {
        ctx.save();
        const barW = 20;
        const barH = 3;
        const barX = activeHarvestTarget.x + (activeHarvestTarget.width - barW) / 2;
        const barY = activeHarvestTarget.y - 6;

        // Nền đen bán trong suốt
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Màu thanh tiến trình theo công cụ: Xanh lá (đúng), Vàng cam (sai công cụ/kiếm), Xám (tay không)
        let barColor = "#22c55e";
        if (harvestToolStatus === 'wrong') barColor = "#f59e0b";
        else if (harvestToolStatus === 'hand') barColor = "#94a3b8";

        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, Math.min(barW, barW * harvestProgress), barH);

        // Viền pixel mỏng sắc nét
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.restore();
      }

      // Khôi phục Context về Screen Space không bị ảnh hưởng bởi Zoom 3x
      ctx.restore();

      // Hiệu ứng flash khi dịch chuyển
      if (teleportFlashOpacity > 0) {
        ctx.fillStyle = `rgba(254, 240, 138, ${teleportFlashOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // --- VẼ HUD TÚI ĐỒ, THANH MÁU PLAYER & MINI-MAP TRÊN MÀN HÌNH ---
      renderPlayerHUD();
      renderInventoryHUD();
      renderMinimap();
    }

    function drawHudHeartIcon(cx, cy, size) {
      ctx.save();
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      const topY = cy - size * 0.25;
      ctx.moveTo(cx, cy + size * 0.48);
      ctx.bezierCurveTo(cx - size * 0.65, cy + size * 0.05, cx - size * 0.58, topY - size * 0.4, cx, topY);
      ctx.bezierCurveTo(cx + size * 0.58, topY - size * 0.4, cx + size * 0.65, cy + size * 0.05, cx, cy + size * 0.48);
      ctx.fill();
      ctx.restore();
    }

    function drawHudShieldIcon(cx, cy, size) {
      ctx.save();
      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.48);
      ctx.lineTo(cx + size * 0.44, cy - size * 0.28);
      ctx.lineTo(cx + size * 0.36, cy + size * 0.16);
      ctx.lineTo(cx, cy + size * 0.5);
      ctx.lineTo(cx - size * 0.36, cy + size * 0.16);
      ctx.lineTo(cx - size * 0.44, cy - size * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function renderPlayerHUD() {
      const mobile = isMobileMode();
      const padX = mobile ? 10 : 14;
      const padY = mobile ? 8 : 12;
      const panelW = mobile ? 164 : 232;
      const barW = panelW - 18;
      const barX = padX + 9;
      const hpBarH = mobile ? 18 : 22;
      const armorBarH = mobile ? 14 : 18;
      const hpBarY = padY + 9;
      const armorBarY = hpBarY + hpBarH + 6;
      const statsY = armorBarY + armorBarH + 7;
      const statH = mobile ? 20 : 24;
      const panelH = (statsY + statH + 8) - padY;

      // Khung thẻ thông tin nhân vật gọn đẹp, nền tối sang trọng
      drawRoundedBox(
        ctx,
        padX,
        padY,
        panelW,
        panelH,
        10,
        "rgba(10, 15, 26, 0.88)",
        "rgba(148, 163, 184, 0.28)",
        1.2
      );

      // --- 1. THANH MÁU (HP BAR - LỚN, RÕ RÀNG) ---
      drawRoundedBox(ctx, barX, hpBarY, barW, hpBarH, 5, "rgba(18, 24, 38, 0.95)", "rgba(239, 68, 68, 0.45)", 1);
      const safeMaxHp = Math.max(1, player.maxHp);
      const ghostPct = Math.max(0, Math.min(1, player.displayHp / safeMaxHp));
      if (ghostPct > 0) {
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(barX + 1, hpBarY + 1, (barW - 2) * ghostPct, hpBarH - 2);
      }
      const hpPct = Math.max(0, Math.min(1, player.hp / safeMaxHp));
      if (hpPct > 0) {
        const hpGrad = ctx.createLinearGradient(barX, hpBarY, barX, hpBarY + hpBarH);
        hpGrad.addColorStop(0, "#f87171");
        hpGrad.addColorStop(1, "#dc2626");
        ctx.fillStyle = hpGrad;
        ctx.fillRect(barX + 1, hpBarY + 1, (barW - 2) * hpPct, hpBarH - 2);
      }
      drawHudHeartIcon(barX + 12, hpBarY + hpBarH / 2, mobile ? 10 : 12);
      ctx.save();
      ctx.font = mobile ? "700 11px 'Segoe UI', system-ui, sans-serif" : "700 13px 'Segoe UI', system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 3;
      ctx.fillText(`${Math.round(player.hp)} / ${player.maxHp}`, barX + 24, hpBarY + hpBarH / 2 + 0.5);
      ctx.restore();

      // --- 2. THANH GIÁP (ARMOR BAR - MẶC ĐỊNH 50 GIÁP) ---
      const maxArm = Math.max(1, playerMaxArmor);
      drawRoundedBox(ctx, barX, armorBarY, barW, armorBarH, 5, "rgba(18, 24, 38, 0.95)", "rgba(56, 189, 248, 0.45)", 1);
      const ghostArmPct = Math.max(0, Math.min(1, playerDisplayArmor / maxArm));
      if (ghostArmPct > 0) {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(barX + 1, armorBarY + 1, (barW - 2) * ghostArmPct, armorBarH - 2);
      }
      const armPct = Math.max(0, Math.min(1, playerArmor / maxArm));
      if (armPct > 0) {
        const armGrad = ctx.createLinearGradient(barX, armorBarY, barX, armorBarY + armorBarH);
        armGrad.addColorStop(0, "#38bdf8");
        armGrad.addColorStop(1, "#0284c7");
        ctx.fillStyle = armGrad;
        ctx.fillRect(barX + 1, armorBarY + 1, (barW - 2) * armPct, armorBarH - 2);
      }
      drawHudShieldIcon(barX + 12, armorBarY + armorBarH / 2, mobile ? 9 : 11);
      ctx.save();
      ctx.font = mobile ? "700 10.5px 'Segoe UI', system-ui, sans-serif" : "700 12px 'Segoe UI', system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f0f9ff";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 3;
      ctx.fillText(`${Math.round(playerArmor)} / ${playerMaxArmor}`, barX + 24, armorBarY + armorBarH / 2 + 0.5);
      ctx.restore();

      // --- 3. HAI Ô SÁT THƯƠNG & TỐC CHẠY RÕ NÉT ---
      const curHeld = playerInventory[activeHotbarIndex];
      const curHeldData = curHeld ? (getItemData(curHeld) || curHeld) : null;
      const baseDmgNow = defaultStats.player.attackDamage || 10;
      let liveDmg = baseDmgNow;
      if (curHeld) {
        if (curHeld.id === "hunting_bow") liveDmg = (typeof curHeld.damage === "number") ? curHeld.damage : 24;
        else if (curHeld.id === "magic_wand") {
          const wdmg = (typeof curHeld.damage === "number") ? curHeld.damage : (curHeldData?.damage || 5);
          const gemB = getWandGemBonuses({ id: "magic_wand", wandData: ensureWandData({ id: "magic_wand", wandData: curHeld.wandData }) });
          liveDmg = baseDmgNow + wdmg + (gemB.damageBonus || 0);
        } else if (typeof curHeld.damage === "number") {
          liveDmg = baseDmgNow + curHeld.damage;
        } else if (curHeldData && curHeldData.damage) {
          liveDmg = baseDmgNow + curHeldData.damage;
        }
      }
      const liveSpeed = Math.round((player.speed || 65) * ((typeof playerHunger !== 'undefined' && playerHunger <= 0) ? 0.65 : 1.0));

      const halfW = (barW - 6) / 2;
      drawRoundedBox(ctx, barX, statsY, halfW, statH, 5, "rgba(239, 68, 68, 0.14)", "rgba(248, 113, 113, 0.35)", 1);
      drawRoundedBox(ctx, barX + halfW + 6, statsY, halfW, statH, 5, "rgba(34, 197, 94, 0.14)", "rgba(74, 222, 128, 0.35)", 1);

      ctx.save();
      ctx.font = mobile ? "700 10.5px 'Segoe UI', system-ui, sans-serif" : "700 12px 'Segoe UI', system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fecaca";
      ctx.fillText(`⚔️ ${liveDmg} DMG`, barX + halfW / 2, statsY + statH / 2 + 0.5);
      ctx.fillStyle = "#bbf7d0";
      ctx.fillText(`👟 ${liveSpeed} TỐC`, barX + halfW + 6 + halfW / 2, statsY + statH / 2 + 0.5);
      ctx.restore();

    }

    function renderInventoryHUD() {
      // Đã xóa thanh đếm Gỗ/Đá/Thịt cũ; chỉ hiển thị Xu Vàng gọn gàng ở góc trên phải
      const goldText = `🪙 ${playerGold} Xu`;
      ctx.save();
      ctx.font = "700 12.5px 'Segoe UI', system-ui, sans-serif";
      const tw = ctx.measureText(goldText).width;
      const bw = tw + 20;
      const bh = 28;
      const bx = Math.max(12, canvas.width - bw - 144);
      const by = isMobileMode() ? 8 : 14;
      drawRoundedBox(ctx, bx, by, bw, bh, 8, "rgba(10, 15, 26, 0.88)", "rgba(234, 179, 8, 0.48)", 1.2);
      ctx.fillStyle = "#fde047";
      ctx.textBaseline = "middle";
      ctx.fillText(goldText, bx + 10, by + bh / 2 + 0.5);
      ctx.restore();
    }

    function renderMinimap() {
      if (!isMinimapEnabled || !minimapCanvas || !minimapCtx) return;

      const size = minimapCanvas.width; // 128
      const scale = size / MAP_SIZE;
      const mctx = minimapCtx;

      mctx.clearRect(0, 0, size, size);

      // 1. Vẽ nền địa hình LDtk bán trong suốt
      const terrain = getMinimapTerrainCache(currentMap);
      if (terrain) {
        mctx.save();
        mctx.globalAlpha = 0.72;
        mctx.drawImage(terrain, 0, 0, size, size);
        mctx.restore();
      } else {
        mctx.fillStyle = currentMap === "forest" ? "rgba(20, 83, 45, 0.5)" : "rgba(22, 101, 52, 0.45)";
        mctx.fillRect(0, 0, size, size);
      }

      // Lưới chia khu vực mờ 4x4
      mctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      mctx.lineWidth = 1;
      for (let g = 32; g < size; g += 32) {
        mctx.beginPath();
        mctx.moveTo(g + 0.5, 0);
        mctx.lineTo(g + 0.5, size);
        mctx.moveTo(0, g + 0.5);
        mctx.lineTo(size, g + 0.5);
        mctx.stroke();
      }

      // 2. Vẽ các vật thể môi trường chính (Cây, Gốc cây, Mỏ đá, Bàn chế tạo, Lò rèn)
      for (let i = 0; i < currentObjects.length; i++) {
        const obj = currentObjects[i];
        const ox = (obj.x + (obj.width || TILE_SIZE) / 2) * scale;
        const oy = (obj.y + (obj.height || TILE_SIZE) / 2) * scale;

        if (obj.type === "tree") {
          const isStump = obj.stage === "stump";
          mctx.fillStyle = isStump ? "#a16207" : "#22c55e";
          mctx.beginPath();
          mctx.arc(ox, oy, isStump ? 1.5 : 2.3, 0, Math.PI * 2);
          mctx.fill();
          if (!isStump) {
            mctx.strokeStyle = "rgba(5, 46, 22, 0.9)";
            mctx.lineWidth = 0.8;
            mctx.stroke();
          }
        } else if (obj.type === "rock") {
          mctx.fillStyle = "#cbd5e1";
          mctx.fillRect(ox - 1.5, oy - 1.5, 3, 3);
          mctx.strokeStyle = "#475569";
          mctx.lineWidth = 0.7;
          mctx.strokeRect(ox - 1.5, oy - 1.5, 3, 3);
        } else if (obj.type === "crafting_table" || obj.type === "forge") {
          mctx.fillStyle = obj.type === "forge" ? "#f97316" : "#fbbf24";
          mctx.fillRect(ox - 2, oy - 2, 4, 4);
          mctx.strokeStyle = "#451a03";
          mctx.lineWidth = 0.8;
          mctx.strokeRect(ox - 2, oy - 2, 4, 4);
        } else if (obj.type === "chest") {
          mctx.fillStyle = "#d97706";
          mctx.fillRect(ox - 2, oy - 2, 4, 4);
          mctx.strokeStyle = "#fef08a";
          mctx.lineWidth = 0.8;
          mctx.strokeRect(ox - 2, oy - 2, 4, 4);
        }
      }

      // 3. Vẽ vật phẩm rơi trên đất (nhỏ màu vàng sáng)
      for (let i = 0; i < droppedItems.length; i++) {
        const gi = droppedItems[i];
        if (gi.mapId && gi.mapId !== currentMap) continue;
        mctx.fillStyle = "#fde047";
        mctx.fillRect(gi.x * scale - 1, gi.y * scale - 1, 2, 2);
      }

      // 4. Vẽ Cổng dịch chuyển giữa các bản đồ
      if (currentPortal) {
        const px = (currentPortal.x + currentPortal.width / 2) * scale;
        const py = (currentPortal.y + currentPortal.height / 2) * scale;
        const pulse = 3.5 + Math.sin(performance.now() / 220) * 1.1;

        mctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
        mctx.lineWidth = 1.2;
        mctx.beginPath();
        mctx.arc(px, py, pulse, 0, Math.PI * 2);
        mctx.stroke();

        mctx.fillStyle = "#facc15";
        mctx.fillRect(px - 2, py - 2, 4, 4);
      }

      // 5. Vẽ sinh vật (Heo rừng đỏ, Gà hồng nhạt)
      for (let i = 0; i < currentMobs.length; i++) {
        const mob = currentMobs[i];
        if (!mob || mob.hp <= 0 || mob.action === "die") continue;
        const mx = (mob.x + (mob.width || TILE_SIZE) / 2) * scale;
        const my = (mob.y + (mob.height || TILE_SIZE) / 2) * scale;

        if (mob.type === "boar") {
          mctx.fillStyle = "#ef4444";
          mctx.beginPath();
          mctx.arc(mx, my, 2.3, 0, Math.PI * 2);
          mctx.fill();
          mctx.strokeStyle = "#450a0a";
          mctx.lineWidth = 0.8;
          mctx.stroke();
        } else {
          mctx.fillStyle = "#fda4af";
          mctx.beginPath();
          mctx.arc(mx, my, 1.7, 0, Math.PI * 2);
          mctx.fill();
        }
      }

      // 6. Vẽ khung vùng nhìn Camera hiện tại
      const activeZoom = getCameraZoom();
      const visW = (canvas.width / activeZoom) * scale;
      const visH = (canvas.height / activeZoom) * scale;
      const camX = camera.x * scale;
      const camY = camera.y * scale;
      mctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
      mctx.lineWidth = 0.9;
      mctx.strokeRect(camX, camY, visW, visH);

      // 7. Vẽ vị trí & hướng nhìn của Người chơi (Mũi tên xanh ngọc nổi bật)
      const plX = (player.x + player.width / 2) * scale;
      const plY = (player.y + player.height / 2) * scale;
      let aimAng = lastAimAngle;
      if (aimAng === undefined || aimAng === null || isNaN(aimAng)) {
        if (playerFacing === "right") aimAng = 0;
        else if (playerFacing === "left") aimAng = Math.PI;
        else if (playerFacing === "up") aimAng = -Math.PI / 2;
        else aimAng = Math.PI / 2;
      }

      mctx.save();
      mctx.translate(plX, plY);
      mctx.rotate(aimAng);
      mctx.beginPath();
      mctx.moveTo(5, 0);
      mctx.lineTo(-3.5, -3.2);
      mctx.lineTo(-2, 0);
      mctx.lineTo(-3.5, 3.2);
      mctx.closePath();
      mctx.fillStyle = "#38bdf8";
      mctx.fill();
      mctx.strokeStyle = "#ffffff";
      mctx.lineWidth = 1;
      mctx.stroke();
      mctx.restore();

      // 8. Đồng bộ tiêu đề khu vực & tọa độ gọn trong overlay
      const nextTitle = currentMap === "lake" ? "🏞️ HỒ" : (currentMap === "forest" ? "🌲 RỪNG" : "🏠 NHÀ");
      if (minimapTitleEl && nextTitle !== lastMinimapTitle) {
        minimapTitleEl.textContent = nextTitle;
        lastMinimapTitle = nextTitle;
      }
      const nextCoords = `${Math.round(player.x)}, ${Math.round(player.y)}`;
      if (minimapCoordsEl && nextCoords !== lastMinimapCoords) {
        minimapCoordsEl.textContent = nextCoords;
        lastMinimapCoords = nextCoords;
      }
    }

    // -------------------------------------------------------------
    // 11. VÒNG LẶP CHÍNH (GAME LOOP AN TOÀN)
    // -------------------------------------------------------------
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    function gameLoop(currentTime) {
      try {
        let deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        if (isNaN(deltaTime) || deltaTime <= 0) deltaTime = 1 / 60;
        if (deltaTime > 0.1) deltaTime = 0.1;

        // Xử lý Hit-stop theo số frame (Phép Trọng Lực dừng đúng 3 frame lúc chạm đáy)
        if (hitStopFramesRemaining > 0) {
          hitStopFramesRemaining--;
          render();
          requestAnimationFrame(gameLoop);
          return;
        }

        // Xử lý Hit-stop (đóng băng game tạm thời ~80ms để tạo cảm giác lực chém đã tay)
        if (hitStopTimer > 0) {
          hitStopTimer -= deltaTime;
          // Vẫn vẽ lại màn hình (để hiển thị rung camera), nhưng bỏ qua update logic
          render();
          requestAnimationFrame(gameLoop);
          return;
        }

        frameCount++;
        if (currentTime - fpsTimer >= 500) {
          if (valFPS) {
            valFPS.textContent = Math.round((frameCount * 1000) / (currentTime - fpsTimer));
          }
          frameCount = 0;
          fpsTimer = currentTime;
        }

        update(deltaTime);

        // Khi game đang pause mở modal (túi đồ / khảm đũa), chỉ vẽ 1 frame khi mới pause, resize hoặc có thay đổi canvas
        const shouldRenderFrame = !isPaused || !lastRenderedPausedState || needsCanvasRedraw || teleportFlashOpacity > 0;
        if (shouldRenderFrame) {
          render();
          lastRenderedPausedState = isPaused;
          needsCanvasRedraw = false;
        }
      } catch (err) {
        console.error("Lỗi trong vòng lặp Game Loop:", err);
      }

      requestAnimationFrame(gameLoop);
    }

    // Khởi động hệ thống tải ảnh và nạp cả 2 bản đồ LDtk trước khi chạy game loop
    preloadImages(async () => {
      // Tải dữ liệu bản đồ map_home.json và map_rung.json trước khi bắt đầu vòng lặp game chính
      await Promise.all([
        loadMapData("assets/maps/map_home.json", false),
        loadMapData("assets/maps/map_rung.json", true),
        loadMapData("assets/maps/map_ho.json", "lake")
      ]);
      requestAnimationFrame(gameLoop);
    });

    // Khởi tạo hồ sơ người chơi & tự động lưu mỗi 15 giây
    initPlayerProfileAndSave();
    setInterval(() => savePlayerToStorage(true), 15000);
    setInterval(() => {
      if (currentPlayerProfile && isCloudSyncPending(currentPlayerProfile.id)) {
        syncPlayerToCloud();
      }
    }, 120000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        savePlayerToStorage(true);
        syncPlayerToCloud();
      }
    });
    window.addEventListener("pagehide", () => {
      savePlayerToStorage(true);
      syncPlayerToCloud();
    });
    window.addEventListener("beforeunload", () => {
      savePlayerToStorage(true);
      syncPlayerToCloud();
    });
