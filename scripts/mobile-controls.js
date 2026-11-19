// ============================================================
// BỘ ĐIỀU KHIỂN CẢM ỨNG ĐA ĐIỂM (8-DIRECTION CIRCULAR JOYSTICK)
// & CỤM 4 NÚT HÀNH ĐỘNG HÌNH CUNG (THÍCH ỨNG KHI CẦM ĐŨA PHÉP)
// ============================================================
(function () {
  const joystickEl = document.getElementById("mobileJoystick");
  const thumbEl = document.getElementById("joystickThumb");
  const tickEls = joystickEl ? Array.from(joystickEl.querySelectorAll(".joystick-tick")) : [];

  const btnAction = document.getElementById("btnAction");
  const btnActionIcon = document.getElementById("btnActionIcon");
  const btnActionCap = document.getElementById("btnActionCap");

  const btnInteract = document.getElementById("btnInteract");
  const btnInteractIcon = document.getElementById("btnInteractIcon");
  const btnInteractCap = document.getElementById("btnInteractCap");
  const sat1CdVeil = document.getElementById("sat1CdVeil");
  const sat1CdText = document.getElementById("sat1CdText");

  const btnDropItem = document.getElementById("btnDropItem");
  const btnDropIcon = document.getElementById("btnDropIcon");
  const btnDropCap = document.getElementById("btnDropCap");
  const sat2CdVeil = document.getElementById("sat2CdVeil");
  const sat2CdText = document.getElementById("sat2CdText");

  const btnDash = document.getElementById("btnDash");
  const btnDashIcon = document.getElementById("btnDashIcon");
  const btnDashCap = document.getElementById("btnDashCap");
  const sat3CdVeil = document.getElementById("sat3CdVeil");
  const sat3CdText = document.getElementById("sat3CdText");

  const btnMobileBag = document.getElementById("btnMobileBag");
  const btnMobileHudInfo = document.getElementById("btnMobileHudInfo");
  const hudEl = document.getElementById("hud");
  const mobileHotbarLabel = document.getElementById("mobileHotbarLabel");
  const dismissRotateBtn = document.getElementById("dismissRotateBtn");

  // SVG icons for dynamic action button states (crisp pixel/geometric strokes)
  const SVG_SWORD = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" stroke-linejoin="miter"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>';
  const SVG_AXE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" stroke-linejoin="miter"><path d="M14 10l7-7"/><path d="M5 19l9-9"/><path d="M11 4c2-1 5-1 7 1s2 5 1 7l-4-4-4-4z"/></svg>';
  const SVG_PICKAXE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" stroke-linejoin="miter"><path d="M14 10l-9 9"/><path d="M6 5c4-2 9-1 13 3l-3 3c-3-3-6-4-10-2V5z"/><path d="M19 8c2 4 1 9-3 13l-2-3c3-3 4-6 2-10h3z"/></svg>';
  const SVG_BOW = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" stroke-linejoin="miter"><path d="M17 3c3 4 3 14 0 18"/><path d="M17 3L6 12l11 9"/><path d="M4 12h16"/><path d="M17 9l3 3-3 3"/></svg>';
  const SVG_WAND = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M17.8 6.2L19 5"/><path d="M12.2 6.2L11 5"/><path d="M15 9l-10 10"/></svg>';
  const SVG_FISHING_ROD = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20L17 4"/><path d="M17 4c1 0 2 1 2 2.5V14"/><circle cx="19" cy="16" r="2"/><path d="M8 15l2 2"/></svg>';
  const SVG_HAND = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" stroke-linejoin="miter"><path d="M7 12V6a1.5 1.5 0 0 1 3 0v5"/><path d="M10 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M13 11V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M16 12V8.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-2a5 5 0 0 1-5-5v-3.5a1.5 1.5 0 0 1 3 0V14"/></svg>';

  const SVG_USE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" stroke-linejoin="miter"><path d="M12 3v6"/><path d="M9 6h6"/><rect x="5" y="11" width="14" height="9"/><path d="M9 15h6"/></svg>';
  const SVG_DROP = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" stroke-linejoin="miter"><path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>';
  const SVG_DASH = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h10a3 3 0 1 0-3-3"/><path d="M3 13h14a3 3 0 1 1-3 3"/><path d="M7 17h4"/></svg>';
  const SVG_PLUS = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';

  // ------------------------------------------------------------
  // 8-DIRECTION CIRCULAR SECTOR TABLE
  // ------------------------------------------------------------
  const SECTOR_KEYS = [
    { up: false, down: false, left: false, right: true  }, // 0: East (+X)
    { up: false, down: true,  left: false, right: true  }, // 1: South-East (+X, +Y)
    { up: false, down: true,  left: false, right: false }, // 2: South (+Y)
    { up: false, down: true,  left: true,  right: false }, // 3: South-West (-X, +Y)
    { up: false, down: false, left: true,  right: false }, // 4: West (-X)
    { up: true,  down: false, left: true,  right: false }, // 5: North-West (-X, -Y)
    { up: true,  down: false, left: false, right: false }, // 6: North (-Y)
    { up: true,  down: false, left: false, right: true  }  // 7: North-East (+X, -Y)
  ];

  const DEADZONE_RATIO = 0.18;
  let activeJoystickPointerId = null;
  let activeActionPointerId = null;
  let hotbarLabelTimer = null;

  function setActiveSectorTick(sectorIndex) {
    for (let i = 0; i < tickEls.length; i++) {
      const el = tickEls[i];
      const idx = Number(el.getAttribute("data-sector"));
      if (idx === sectorIndex) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    }
  }

  function applySectorDirection(sectorIndex) {
    if (sectorIndex < 0 || sectorIndex >= SECTOR_KEYS.length) {
      keys.up = false;
      keys.down = false;
      keys.left = false;
      keys.right = false;
      setActiveSectorTick(-1);
      return;
    }

    const dir = SECTOR_KEYS[sectorIndex];
    keys.up = dir.up;
    keys.down = dir.down;
    keys.left = dir.left;
    keys.right = dir.right;

    if (dir.left) lastHorizontalDir = "left";
    else if (dir.right) lastHorizontalDir = "right";

    if (dir.up) lastVerticalDir = "up";
    else if (dir.down) lastVerticalDir = "down";

    const mx = (dir.right ? 1 : 0) - (dir.left ? 1 : 0);
    const my = (dir.down ? 1 : 0) - (dir.up ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      const snappedAngle = Math.atan2(my, mx);
      lastAimAngle = snappedAngle;
      bowAimAngle = snappedAngle;
    }

    setActiveSectorTick(sectorIndex);
  }

  function updateJoystickFromPoint(clientX, clientY) {
    if (!joystickEl || !thumbEl) return;
    if (typeof isPaused !== "undefined" && isPaused) {
      resetJoystick();
      return;
    }

    const rect = joystickEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = Math.max(24, rect.width * 0.36);

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const visualX = dist > 0.5 ? Math.cos(angle) * clampedDist : 0;
    const visualY = dist > 0.5 ? Math.sin(angle) * clampedDist : 0;

    thumbEl.style.setProperty("--joy-x", `${visualX.toFixed(1)}px`);
    thumbEl.style.setProperty("--joy-y", `${visualY.toFixed(1)}px`);
    joystickEl.classList.add("active");

    if (dist < maxRadius * DEADZONE_RATIO) {
      applySectorDirection(-1);
      return;
    }

    const rawSector = Math.round(angle / (Math.PI / 4));
    const sector = ((rawSector % 8) + 8) % 8;
    applySectorDirection(sector);
  }

  function resetJoystick() {
    activeJoystickPointerId = null;
    if (joystickEl) joystickEl.classList.remove("active");
    if (thumbEl) {
      thumbEl.style.setProperty("--joy-x", "0px");
      thumbEl.style.setProperty("--joy-y", "0px");
    }
    applySectorDirection(-1);
  }

  window.resetMobileJoystick = resetJoystick;

  if (joystickEl) {
    joystickEl.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      if (activeJoystickPointerId !== null) return;
      activeJoystickPointerId = e.pointerId;
      try {
        joystickEl.setPointerCapture(e.pointerId);
      } catch (_) {}
      updateJoystickFromPoint(e.clientX, e.clientY);
    });

    joystickEl.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activeJoystickPointerId) return;
      e.preventDefault();
      updateJoystickFromPoint(e.clientX, e.clientY);
    });

    const releaseJoystickPointer = (e) => {
      if (activeJoystickPointerId === null) return;
      if (e && e.pointerId !== undefined && e.pointerId !== activeJoystickPointerId) return;
      try {
        if (e && e.pointerId !== undefined && joystickEl.hasPointerCapture(e.pointerId)) {
          joystickEl.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      resetJoystick();
    };

    joystickEl.addEventListener("pointerup", releaseJoystickPointer);
    joystickEl.addEventListener("pointercancel", releaseJoystickPointer);
    joystickEl.addEventListener("lostpointercapture", () => {
      if (activeJoystickPointerId !== null) resetJoystick();
    });
    window.addEventListener("pointerup", releaseJoystickPointer);
    window.addEventListener("pointercancel", releaseJoystickPointer);
  }

  // ------------------------------------------------------------
  // PRIMARY ACTION BUTTON (ATTACK / HARVEST / BOW CHARGE / WAND NORMAL)
  // ------------------------------------------------------------
  function startActionPress() {
    if (typeof isPaused !== "undefined" && isPaused) return;
    if (typeof window.setMobileActionHeld === "function") {
      window.setMobileActionHeld(true);
    } else {
      isActionKeyHeld = true;
    }
    if (btnAction) btnAction.classList.add("is-pressed");
    if (typeof triggerPlayerAttack === "function" && triggerPlayerAttack()) {
      if (typeof performAction === "function") performAction();
    }
  }

  function endActionPress() {
    activeActionPointerId = null;
    if (typeof window.setMobileActionHeld === "function") {
      window.setMobileActionHeld(false);
    } else {
      isActionKeyHeld = false;
      harvestProgress = 0;
      activeHarvestTarget = null;
    }
    if (btnAction) btnAction.classList.remove("is-pressed");
  }

  if (btnAction) {
    btnAction.addEventListener("contextmenu", (e) => e.preventDefault());

    btnAction.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (activeActionPointerId !== null) {
        endActionPress();
      }
      activeActionPointerId = e.pointerId;
      try {
        btnAction.setPointerCapture(e.pointerId);
      } catch (_) {}
      startActionPress();
    });

    const releaseActionPointer = (e) => {
      if (activeActionPointerId === null) return;
      if (e && e.pointerId !== undefined && e.pointerId !== activeActionPointerId) return;
      try {
        if (e && e.pointerId !== undefined && btnAction.hasPointerCapture(e.pointerId)) {
          btnAction.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      endActionPress();
    };

    btnAction.addEventListener("pointerup", releaseActionPointer);
    btnAction.addEventListener("pointercancel", releaseActionPointer);
    btnAction.addEventListener("lostpointercapture", () => {
      if (activeActionPointerId !== null) endActionPress();
    });
    window.addEventListener("pointerup", releaseActionPointer);
    window.addEventListener("pointercancel", releaseActionPointer);

    window.addEventListener("touchend", (e) => {
      if (e.touches && e.touches.length === 0) {
        if (activeActionPointerId !== null || btnAction.classList.contains("is-pressed")) {
          endActionPress();
        }
        if (activeJoystickPointerId !== null) {
          resetJoystick();
        }
      }
    }, { passive: true });

    window.addEventListener("touchcancel", (e) => {
      if (!e.touches || e.touches.length === 0) {
        endActionPress();
        resetJoystick();
      }
    }, { passive: true });
  }

  // ------------------------------------------------------------
  // CONTEXTUAL INTERACT (FOR NON-WAND MODE)
  // ------------------------------------------------------------
  function triggerInteract() {
    if (typeof isPaused !== "undefined" && isPaused) return;

    if (typeof window.checkNearWandAltar === "function" && window.checkNearWandAltar()) {
      if (typeof window.openWandCustomizer === "function") {
        window.openWandCustomizer(true);
      }
      return;
    }

    if (typeof window.checkNearChest === "function" && window.checkNearChest()) {
      if (typeof window.openNearestChest === "function") {
        window.openNearestChest();
      }
      return;
    }

    if (typeof checkNearCraftingTable === "function" && checkNearCraftingTable()) {
      if (typeof toggleInventory === "function") {
        toggleInventory(true, "workstation");
      }
      return;
    }

    const equipped = typeof playerInventory !== "undefined" ? playerInventory[activeHotbarIndex] : null;
    if (equipped && equipped.id === "chest") {
      if (typeof window.tryPlaceChest === "function") {
        window.tryPlaceChest(activeHotbarIndex);
      }
      return;
    }
    if (equipped && (equipped.id === "crafting_table" || (equipped.name && equipped.name.includes("Bàn Chế Tạo")))) {
      if (typeof tryPlaceCraftingTable === "function") {
        tryPlaceCraftingTable(activeHotbarIndex);
      }
      return;
    }

    if (typeof consumeEquippedItem === "function" && consumeEquippedItem()) {
      return;
    }

    if (typeof addFloatingText === "function" && typeof player !== "undefined") {
      addFloatingText("Không có vật để dùng", player.x - 18, player.y - 12, "#94a3b8");
    }
  }

  function isWandHeldNow() {
    const equipped = typeof playerInventory !== "undefined" ? playerInventory[activeHotbarIndex] : null;
    return Boolean(equipped && equipped.id === "magic_wand");
  }

  function bindArcSatelliteButton(btn, wandSkillIdx, normalHandler) {
    if (!btn) return;
    let activePid = null;
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
    btn.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      activePid = e.pointerId;
      btn.classList.add("is-pressed");
    });
    btn.addEventListener("pointerup", (e) => {
      if (activePid !== null && e.pointerId !== activePid) return;
      e.preventDefault();
      e.stopPropagation();
      activePid = null;
      btn.classList.remove("is-pressed");
      if (typeof isPaused !== "undefined" && isPaused) return;
      if (isWandHeldNow()) {
        if (typeof window.castWandSkillSlot === "function") {
          window.castWandSkillSlot(wandSkillIdx, false);
        }
      } else {
        normalHandler();
      }
    });
    btn.addEventListener("pointercancel", () => {
      activePid = null;
      btn.classList.remove("is-pressed");
    });
    btn.addEventListener("pointerleave", () => {
      activePid = null;
      btn.classList.remove("is-pressed");
    });
  }

  // Sat 1 = Dùng (hoặc Chiêu 1 khi cầm đũa)
  bindArcSatelliteButton(btnInteract, 0, triggerInteract);

  // Sat 2 = Vứt (hoặc Chiêu 2 khi cầm đũa)
  bindArcSatelliteButton(btnDropItem, 1, () => {
    if (typeof dropSelectedItem === "function") dropSelectedItem();
  });

  // Sat 3 = Lướt né đòn (hoặc Chiêu 3 khi cầm đũa)
  bindArcSatelliteButton(btnDash, 2, () => {
    if (typeof window.performPlayerDash === "function") window.performPlayerDash();
  });

  // ------------------------------------------------------------
  // STANDALONE BAG BUTTON (TÁCH RIÊNG KHỎI CỤM 4 NÚT)
  // ------------------------------------------------------------
  function handleBagToggle() {
    const invEl = document.getElementById("inventory-ui");
    const isClosed = !invEl || invEl.style.display === "none" || invEl.style.display === "";
    if (!isClosed) {
      toggleInventory(false);
    } else {
      const nearTable = typeof checkNearCraftingTable === "function" && checkNearCraftingTable();
      toggleInventory(true, nearTable ? "workstation" : "pocket");
    }
  }

  if (btnMobileBag) {
    btnMobileBag.addEventListener("pointerup", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      handleBagToggle();
    });
  }

  // ------------------------------------------------------------
  // TOP HUD INFO & PORTRAIT DISMISS
  // ------------------------------------------------------------
  if (btnMobileHudInfo && hudEl) {
    btnMobileHudInfo.addEventListener("click", () => {
      const open = hudEl.classList.toggle("mobile-hud-open");
      btnMobileHudInfo.classList.toggle("active", open);
    });
  }

  if (dismissRotateBtn) {
    dismissRotateBtn.addEventListener("click", () => {
      document.body.classList.add("portrait-dismissed");
    });
  }

  // ------------------------------------------------------------
  // HOOKS FROM GAME-CORE.JS
  // ------------------------------------------------------------
  window.onMobileHotbarSelect = function (index) {
    if (!mobileHotbarLabel || typeof playerInventory === "undefined") return;
    const item = playerInventory[index];
    if (hotbarLabelTimer) clearTimeout(hotbarLabelTimer);

    if (item && item.name) {
      mobileHotbarLabel.textContent = item.name;
      mobileHotbarLabel.classList.add("visible");
      hotbarLabelTimer = setTimeout(() => {
        mobileHotbarLabel.classList.remove("visible");
      }, 1500);
    } else {
      mobileHotbarLabel.classList.remove("visible");
    }
    if (window.onMobileHudSync) window.onMobileHudSync();
  };

  const satSlots = [
    {
      btn: btnInteract,
      iconEl: btnInteractIcon,
      capEl: btnInteractCap,
      veilEl: sat1CdVeil,
      cdTextEl: sat1CdText,
      defaultIcon: SVG_USE,
      defaultCap: "Dùng"
    },
    {
      btn: btnDropItem,
      iconEl: btnDropIcon,
      capEl: btnDropCap,
      veilEl: sat2CdVeil,
      cdTextEl: sat2CdText,
      defaultIcon: SVG_DROP,
      defaultCap: "Vứt"
    },
    {
      btn: btnDash,
      iconEl: btnDashIcon,
      capEl: btnDashCap,
      veilEl: sat3CdVeil,
      cdTextEl: sat3CdText,
      defaultIcon: SVG_DASH,
      defaultCap: "Lướt"
    }
  ];

  window.onMobileHudSync = function () {
    const equipped = typeof playerInventory !== "undefined" ? playerInventory[activeHotbarIndex] : null;
    const itemData = equipped && typeof getItemData === "function" ? getItemData(equipped.id || equipped.name) : null;
    const wandState = typeof window.getWandSkillButtonsState === "function"
      ? window.getWandSkillButtonsState()
      : { isWand: Boolean(equipped && equipped.id === "magic_wand"), slots: [] };

    document.body.classList.toggle("wand-equipped", Boolean(wandState.isWand));

    // 1. Nút đánh bự nhất (#btnAction)
    if (btnAction) {
      if (wandState.isWand && wandState.resonance) {
        btnAction.classList.add("has-resonance");
        btnAction.style.setProperty("--res-color", wandState.resonance.color || "#f97316");
        btnAction.style.setProperty("--res-glow", wandState.resonance.glow || "#fde047");
      } else {
        btnAction.classList.remove("has-resonance");
        btnAction.style.removeProperty("--res-color");
        btnAction.style.removeProperty("--res-glow");
      }
    }

    if (btnActionIcon && btnActionCap) {
      if (!equipped) {
        btnActionIcon.innerHTML = SVG_HAND;
        btnActionCap.textContent = "Đánh";
      } else if (wandState.isWand) {
        btnActionIcon.innerHTML = SVG_WAND;
        btnActionCap.textContent = (wandState.resonance && wandState.resonance.shortCap) || "Đánh";
      } else if (equipped.id === "fishing_rod" || (itemData && itemData.toolType === "fishing_rod")) {
        btnActionIcon.innerHTML = SVG_FISHING_ROD;
        const fishPhase = typeof window.getFishingPhase === "function" ? window.getFishingPhase() : "idle";
        if (fishPhase === "biting") btnActionCap.textContent = "Kéo!";
        else if (fishPhase === "waiting" || fishPhase === "casting") btnActionCap.textContent = "Thu cần";
        else btnActionCap.textContent = "Câu";
      } else if (equipped.id === "hunting_bow" || (equipped.name && equipped.name.includes("Cung"))) {
        btnActionIcon.innerHTML = SVG_BOW;
        btnActionCap.textContent = "Bắn";
      } else if (itemData && itemData.toolType === "axe") {
        btnActionIcon.innerHTML = SVG_AXE;
        btnActionCap.textContent = "Chặt";
      } else if (itemData && itemData.toolType === "pickaxe") {
        btnActionIcon.innerHTML = SVG_PICKAXE;
        btnActionCap.textContent = "Đào";
      } else if (equipped.id === "chest" || equipped.id === "crafting_table" || (equipped.name && equipped.name.includes("Bàn Chế Tạo"))) {
        btnActionIcon.innerHTML = SVG_HAND;
        btnActionCap.textContent = "Đặt";
      } else {
        btnActionIcon.innerHTML = SVG_SWORD;
        btnActionCap.textContent = "Đánh";
      }
    }

    // 2. 3 nút xung quanh: biến thành Chiêu 1, 2, 3 khi cầm Đũa Phép
    if (wandState.isWand) {
      for (let i = 0; i < 3; i++) {
        const ui = satSlots[i];
        const info = wandState.slots[i] || { spell: null, cd: 0, maxCd: 0 };
        if (!ui.btn) continue;
        ui.btn.classList.remove("ready", "is-muted");

        if (info.spell) {
          ui.btn.classList.remove("is-wand-empty");
          ui.btn.style.setProperty("--skill-color", info.spell.color || "#fbbf24");
          if (ui.iconEl && ui.iconEl.dataset.spellId !== info.spell.id) {
            ui.iconEl.dataset.spellId = info.spell.id;
            ui.iconEl.innerHTML = `<img class="wand-skill-icon-img" src="${info.spell.icon}" alt="${info.spell.shortName}">`;
          }
          if (ui.capEl) ui.capEl.textContent = info.spell.shortName;

          if (info.cd > 0.03) {
            const maxCd = Math.max(0.1, info.maxCd || info.spell.cooldown || 0.5);
            const deg = Math.min(360, Math.max(0, (info.cd / maxCd) * 360));
            ui.btn.classList.add("is-on-cooldown");
            if (ui.veilEl) ui.veilEl.style.setProperty("--cd-deg", `${deg.toFixed(1)}deg`);
            if (ui.cdTextEl) ui.cdTextEl.textContent = info.cd.toFixed(1);
          } else {
            ui.btn.classList.remove("is-on-cooldown");
            if (ui.cdTextEl) ui.cdTextEl.textContent = "";
          }
        } else {
          ui.btn.classList.add("is-wand-empty");
          ui.btn.classList.remove("is-on-cooldown");
          ui.btn.style.removeProperty("--skill-color");
          if (ui.iconEl && ui.iconEl.dataset.spellId !== "__empty__") {
            ui.iconEl.dataset.spellId = "__empty__";
            ui.iconEl.innerHTML = SVG_PLUS;
          }
          if (ui.capEl) ui.capEl.textContent = "Thêm";
          if (ui.cdTextEl) ui.cdTextEl.textContent = "";
        }
      }
      return;
    }

    // 3. Trạng thái thường (không cầm Đũa Phép): Dùng / Vứt / Lướt
    for (let i = 0; i < 3; i++) {
      const ui = satSlots[i];
      if (!ui.btn) continue;
      ui.btn.classList.remove("is-wand-empty", "is-on-cooldown");
      ui.btn.style.removeProperty("--skill-color");
      if (ui.cdTextEl) ui.cdTextEl.textContent = "";
      if (ui.iconEl && ui.iconEl.dataset.spellId !== "__default__") {
        ui.iconEl.dataset.spellId = "__default__";
        ui.iconEl.innerHTML = ui.defaultIcon;
      }
    }

    if (btnInteract && btnInteractCap) {
      const nearAltar = typeof window.checkNearWandAltar === "function" && window.checkNearWandAltar();
      const nearChest = typeof window.checkNearChest === "function" && window.checkNearChest();
      const nearTable = typeof checkNearCraftingTable === "function" && checkNearCraftingTable();
      const canEat = Boolean(itemData && itemData.category === "consumable" && itemData.healAmount);
      const isChestItem = Boolean(equipped && equipped.id === "chest");
      const isTable = Boolean(equipped && (equipped.id === "crafting_table" || (equipped.name && equipped.name.includes("Bàn Chế Tạo"))));

      if (nearAltar) {
        btnInteract.classList.add("ready");
        btnInteractCap.textContent = "Khảm";
      } else if (nearChest) {
        btnInteract.classList.add("ready");
        btnInteractCap.textContent = "Mở Rương";
      } else if (nearTable) {
        btnInteract.classList.add("ready");
        btnInteractCap.textContent = "Chế tạo";
      } else if (isChestItem) {
        btnInteract.classList.add("ready");
        btnInteractCap.textContent = "Đặt rương";
      } else if (isTable) {
        btnInteract.classList.add("ready");
        btnInteractCap.textContent = "Đặt bàn";
      } else if (canEat) {
        btnInteract.classList.add("ready");
        btnInteractCap.textContent = "Ăn";
      } else {
        btnInteract.classList.remove("ready");
        btnInteractCap.textContent = "Dùng";
      }
    }

    if (btnDropCap) btnDropCap.textContent = "Vứt";

    if (btnDash && btnDashCap) {
      btnDash.classList.remove("is-muted");
      btnDashCap.textContent = "Lướt";
      const dashState = typeof window.getPlayerDashState === "function" ? window.getPlayerDashState() : { cd: 0, maxCd: 1.4 };
      if (dashState.cd > 0.03) {
        const maxCd = Math.max(0.1, dashState.maxCd || 1.4);
        const deg = Math.min(360, Math.max(0, (dashState.cd / maxCd) * 360));
        btnDash.classList.add("is-on-cooldown");
        if (sat3CdVeil) sat3CdVeil.style.setProperty("--cd-deg", `${deg.toFixed(1)}deg`);
        if (sat3CdText) sat3CdText.textContent = dashState.cd.toFixed(1);
      } else {
        btnDash.classList.remove("is-on-cooldown");
        if (sat3CdText) sat3CdText.textContent = "";
      }
    }
  };

  window.addEventListener("blur", () => {
    resetJoystick();
    endActionPress();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resetJoystick();
      endActionPress();
    }
  });

  // Periodic sync (90ms) so radial cooldown sweeps and contextual states stay responsive
  setInterval(() => {
    const paused = typeof isPaused !== "undefined" && isPaused;
    if (paused && activeActionPointerId !== null) {
      endActionPress();
    }
    if (!paused && typeof isMobileMode === "function" && isMobileMode() && window.onMobileHudSync) {
      window.onMobileHudSync();
    }
  }, 90);

  if (window.onMobileHudSync) window.onMobileHudSync();
})();
