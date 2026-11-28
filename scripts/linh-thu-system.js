/**
 * Linh Thú System Module (Overworld Spawn + 2.5D Battle/Capture + Evolution Lv.16/Lv.32 Max Lv.50)
 * Hooks cleanly into game-core.js without altering existing movement or AABB collision logic.
 */
(function () {
  const SPECIES = {
    '001_hat_lua': {
      id: '001_hat_lua', dex: '#001', name: 'Hạt Lúa', element: 'THẢO',
      imgSrc: 'linh-thu/001_hat_lua/base.png?v=3',
      evolveTo: '002_bong_lua', evolveLevel: 16,
      baseStats: { hp: 55, atk: 52, def: 58, spAtk: 56, spDef: 55, spd: 48 },
      learnset: [
        { moveId: 'tackle_seed', lv: 1 },
        { moveId: 'roar_cry', lv: 4 },
        { moveId: 'vine_whip', lv: 5 },
        { moveId: 'seed_shot', lv: 12 },
        { moveId: 'leaf_blade', lv: 16 }
      ]
    },
    '002_bong_lua': {
      id: '002_bong_lua', dex: '#002', name: 'Bông Lúa', element: 'THẢO',
      imgSrc: 'linh-thu/002_bong_lua/base.png?v=3',
      evolveTo: '003_lua_chin', evolveLevel: 32,
      baseStats: { hp: 78, atk: 74, def: 72, spAtk: 88, spDef: 80, spd: 86 },
      learnset: [
        { moveId: 'tackle_seed', lv: 1 },
        { moveId: 'roar_cry', lv: 4 },
        { moveId: 'vine_whip', lv: 5 },
        { moveId: 'seed_shot', lv: 12 },
        { moveId: 'leaf_blade', lv: 16 },
        { moveId: 'scratch_claw', lv: 16 },
        { moveId: 'solar_bloom', lv: 24 },
        { moveId: 'solar_beam_tm', lv: 32 }
      ]
    },
    '003_lua_chin': {
      id: '003_lua_chin', dex: '#003', name: 'Lúa Chín Cuối Đầu', element: 'THẢO',
      imgSrc: 'linh-thu/003_lua_chin/base.png?v=3',
      evolveTo: null, evolveLevel: null,
      baseStats: { hp: 105, atk: 96, def: 94, spAtk: 124, spDef: 108, spd: 102 },
      learnset: [
        { moveId: 'tackle_seed', lv: 1 },
        { moveId: 'roar_cry', lv: 4 },
        { moveId: 'vine_whip', lv: 5 },
        { moveId: 'seed_shot', lv: 12 },
        { moveId: 'leaf_blade', lv: 16 },
        { moveId: 'scratch_claw', lv: 16 },
        { moveId: 'solar_bloom', lv: 24 },
        { moveId: 'solar_beam_tm', lv: 32 },
        { moveId: 'royal_canopy', lv: 32 },
        { moveId: 'emerald_tempest', lv: 50 }
      ]
    },
    '004_kien_lua': {
      id: '004_kien_lua', dex: '#004', name: 'Kiến Lửa', element: 'HỎA',
      imgSrc: 'linh-thu/004_kien_lua/base.png?v=1',
      evolveTo: '005_kien_canh', evolveLevel: 16,
      baseStats: { hp: 50, atk: 62, def: 48, spAtk: 58, spDef: 46, spd: 64 },
      learnset: [
        { moveId: 'tackle_seed', lv: 1 },
        { moveId: 'roar_cry', lv: 4 },
        { moveId: 'bite_fang', lv: 5 },
        { moveId: 'ember_shot', lv: 12 },
        { moveId: 'flame_charge', lv: 16 }
      ]
    },
    '005_kien_canh': {
      id: '005_kien_canh', dex: '#005', name: 'Kiến Cánh', element: 'HỎA',
      imgSrc: 'linh-thu/005_kien_canh/base.png?v=1',
      evolveTo: '006_kien_ba_khoang', evolveLevel: 32,
      baseStats: { hp: 72, atk: 86, def: 68, spAtk: 82, spDef: 64, spd: 96 },
      learnset: [
        { moveId: 'tackle_seed', lv: 1 },
        { moveId: 'bite_fang', lv: 5 },
        { moveId: 'ember_shot', lv: 12 },
        { moveId: 'flame_charge', lv: 16 },
        { moveId: 'scratch_claw', lv: 16 },
        { moveId: 'fire_burst_tm', lv: 24 },
        { moveId: 'drill_pierce', lv: 32 }
      ]
    },
    '006_kien_ba_khoang': {
      id: '006_kien_ba_khoang', dex: '#006', name: 'Kiến Ba Khoang', element: 'HỎA',
      imgSrc: 'linh-thu/006_kien_ba_khoang/base.png?v=1',
      evolveTo: null, evolveLevel: null,
      baseStats: { hp: 94, atk: 122, def: 88, spAtk: 108, spDef: 82, spd: 118 },
      learnset: [
        { moveId: 'flame_charge', lv: 16 },
        { moveId: 'fire_burst_tm', lv: 24 },
        { moveId: 'drill_pierce', lv: 32 },
        { moveId: 'inferno_nova', lv: 50 }
      ]
    },
    '007_nghe': {
      id: '007_nghe', dex: '#007', name: 'Nghé', element: 'THỦY',
      imgSrc: 'linh-thu/007_nghe/base.png?v=1',
      evolveTo: '008_suu_nhi', evolveLevel: 16,
      baseStats: { hp: 64, atk: 60, def: 62, spAtk: 52, spDef: 56, spd: 46 },
      learnset: [
        { moveId: 'tackle_seed', lv: 1 },
        { moveId: 'roar_cry', lv: 4 },
        { moveId: 'horn_ram', lv: 5 },
        { moveId: 'water_pulse', lv: 12 },
        { moveId: 'mud_stomp', lv: 16 }
      ]
    },
    '008_suu_nhi': {
      id: '008_suu_nhi', dex: '#008', name: 'Sửu Nhi', element: 'THỦY',
      imgSrc: 'linh-thu/008_suu_nhi/base.png?v=1',
      evolveTo: '009_trau_nuoc', evolveLevel: 32,
      baseStats: { hp: 88, atk: 88, def: 86, spAtk: 74, spDef: 78, spd: 68 },
      learnset: [
        { moveId: 'tackle_seed', lv: 1 },
        { moveId: 'horn_ram', lv: 5 },
        { moveId: 'water_pulse', lv: 12 },
        { moveId: 'mud_stomp', lv: 16 },
        { moveId: 'hydro_pump_tm', lv: 24 },
        { moveId: 'tidal_horn', lv: 32 }
      ]
    },
    '009_trau_nuoc': {
      id: '009_trau_nuoc', dex: '#009', name: 'Trâu Nước', element: 'THỦY',
      imgSrc: 'linh-thu/009_trau_nuoc/base.png?v=1',
      evolveTo: null, evolveLevel: null,
      baseStats: { hp: 122, atk: 118, def: 114, spAtk: 96, spDef: 102, spd: 82 },
      learnset: [
        { moveId: 'mud_stomp', lv: 16 },
        { moveId: 'hydro_pump_tm', lv: 24 },
        { moveId: 'tidal_horn', lv: 32 },
        { moveId: 'tsunami_wrath', lv: 50 }
      ]
    }
  };

  const MOVES = {
    tackle_seed: { id: 'tackle_seed', name: 'Lao Húc', cls: 'ATK', power: 40, color: '#fde047' },
    roar_cry: { id: 'roar_cry', name: 'Gầm Vang', cls: 'STATUS', power: 0, color: '#fbbf24' },
    vine_whip: { id: 'vine_whip', name: 'Roi Mầm Xanh', cls: 'ATK', power: 50, color: '#4ade80' },
    seed_shot: { id: 'seed_shot', name: 'Đạn Hạt Ngọc', cls: 'SP.ATK', power: 65, color: '#34d399' },
    leaf_blade: { id: 'leaf_blade', name: 'Phi Diệp Trảm', cls: 'ATK', power: 85, color: '#22c55e' },
    scratch_claw: { id: 'scratch_claw', name: 'Trảo Xé Gió', cls: 'ATK', power: 70, color: '#facc15' },
    solar_bloom: { id: 'solar_bloom', name: 'Bão Hạt Vàng', cls: 'SP.ATK', power: 95, color: '#fbbf24' },
    solar_beam_tm: { id: 'solar_beam_tm', name: 'Tia Nắng Mặt Trời', cls: 'SP.ATK', power: 115, color: '#a3e635' },
    royal_canopy: { id: 'royal_canopy', name: 'Thịnh Vượng Hoàng Kim', cls: 'SP.ATK', power: 120, color: '#f59e0b' },
    emerald_tempest: { id: 'emerald_tempest', name: 'Đại Bão Lục Bảo', cls: 'SP.ATK', power: 135, color: '#10b981' },
    bite_fang: { id: 'bite_fang', name: 'Ngoạm Lửa', cls: 'ATK', power: 55, color: '#fb923c' },
    ember_shot: { id: 'ember_shot', name: 'Tia Lửa Đỏ', cls: 'SP.ATK', power: 60, color: '#f97316' },
    flame_charge: { id: 'flame_charge', name: 'Xung Kích Hỏa Diệm', cls: 'ATK', power: 75, color: '#ea580c' },
    fire_burst_tm: { id: 'fire_burst_tm', name: 'Hỏa Cầu Bùng Nổ', cls: 'SP.ATK', power: 100, color: '#ef4444' },
    drill_pierce: { id: 'drill_pierce', name: 'Song Mũi Khoan Lửa', cls: 'ATK', power: 115, color: '#fdba74' },
    inferno_nova: { id: 'inferno_nova', name: 'Bão Lửa Ba Khoang', cls: 'SP.ATK', power: 135, color: '#dc2626' },
    horn_ram: { id: 'horn_ram', name: 'Húc Sừng', cls: 'ATK', power: 55, color: '#fde68a' },
    water_pulse: { id: 'water_pulse', name: 'Sóng Thủy Triều', cls: 'SP.ATK', power: 65, color: '#38bdf8' },
    mud_stomp: { id: 'mud_stomp', name: 'Giậm Đất Lở', cls: 'ATK', power: 80, color: '#d97706' },
    hydro_pump_tm: { id: 'hydro_pump_tm', name: 'Vòi Rồng Thủy Lực', cls: 'SP.ATK', power: 110, color: '#0284c7' },
    tidal_horn: { id: 'tidal_horn', name: 'Sừng Thủy Thần', cls: 'ATK', power: 115, color: '#7dd3fc' },
    tsunami_wrath: { id: 'tsunami_wrath', name: 'Đại Hồng Thủy', cls: 'SP.ATK', power: 135, color: '#0ea5e9' }
  };

  const imgCache = {};
  const crispCache = {};
  function getSprite(speciesId) {
    if (!imgCache[speciesId]) {
      const im = new Image();
      im.onload = () => {
        // Two-step downscale (512 -> 128 -> 48) for crisp, non-blurry rendering on 16x16 map
        const c1 = document.createElement('canvas');
        c1.width = 128; c1.height = 128;
        const ctx1 = c1.getContext('2d');
        ctx1.imageSmoothingEnabled = true;
        ctx1.imageSmoothingQuality = 'high';
        ctx1.drawImage(im, 0, 0, 128, 128);

        const c2 = document.createElement('canvas');
        c2.width = 48; c2.height = 48;
        const ctx2 = c2.getContext('2d');
        ctx2.imageSmoothingEnabled = true;
        ctx2.imageSmoothingQuality = 'high';
        ctx2.drawImage(c1, 2, 2, 44, 44);

        // Bake a crisp 1.5px dark silhouette outline (zero fuzzy halo/glow!)
        const sil = document.createElement('canvas');
        sil.width = 48; sil.height = 48;
        const sctx = sil.getContext('2d');
        sctx.drawImage(c2, 0, 0);
        sctx.globalCompositeOperation = 'source-in';
        sctx.fillStyle = '#0f172a';
        sctx.fillRect(0, 0, 48, 48);

        const out = document.createElement('canvas');
        out.width = 48; out.height = 48;
        const octx = out.getContext('2d');
        const d = 1.6;
        [[-d,0],[d,0],[0,-d],[0,d],[-d,-d],[d,-d],[-d,d],[d,d]].forEach(([ox, oy]) => {
          octx.drawImage(sil, ox, oy);
        });
        octx.drawImage(c2, 0, 0);
        crispCache[speciesId] = out;
      };
      im.src = SPECIES[speciesId].imgSrc;
      imgCache[speciesId] = im;
    }
    return imgCache[speciesId];
  }
  Object.keys(SPECIES).forEach(getSprite);

  function calcStats(speciesId, lv) {
    const b = SPECIES[speciesId].baseStats;
    const scale = (stat) => Math.floor((stat * 2 * lv) / 100) + lv + 10;
    const maxHp = Math.floor((b.hp * 2 * lv) / 100) + lv + 20;
    return {
      maxHp,
      atk: scale(b.atk),
      def: scale(b.def),
      spAtk: scale(b.spAtk),
      spDef: scale(b.spDef),
      spd: scale(b.spd)
    };
  }

  function getActiveMoves(speciesId, lv) {
    const learned = SPECIES[speciesId].learnset.filter((m) => m.lv <= lv).map((m) => MOVES[m.moveId]);
    return learned.slice(-4);
  }

  function createInstance(speciesId, level) {
    const st = calcStats(speciesId, level);
    return {
      uid: 'lt_' + Math.random().toString(36).slice(2, 8),
      speciesId,
      level: Math.min(50, level),
      exp: 0,
      hp: st.maxHp,
      stats: st
    };
  }

  // Player's Linh Thú Party (starts with Lv.5 #001 Hạt Lúa!)
  const party = [createInstance('001_hat_lua', 5)];
  let activePartyIdx = 0;

  // Overworld wild Linh Thú per map
  const wildSpawns = {
    home: [
      { id: 'w_home_1', speciesId: '001_hat_lua', level: 4, x: 282, y: 268, vx: 8, vy: 4, facing: -1, timer: 2.5 },
      { id: 'w_home_2', speciesId: '004_kien_lua', level: 5, x: 266, y: 254, vx: -7, vy: 4, facing: 1, timer: 2.8 },
      { id: 'w_home_3', speciesId: '007_nghe', level: 5, x: 224, y: 274, vx: 6, vy: -5, facing: -1, timer: 3.0 }
    ],
    forest: [
      { id: 'w_for_1', speciesId: '001_hat_lua', level: 6, x: 220, y: 210, vx: 8, vy: -5, facing: -1, timer: 2.5 },
      { id: 'w_for_2', speciesId: '004_kien_lua', level: 9, x: 320, y: 295, vx: -8, vy: 6, facing: 1, timer: 2.8 },
      { id: 'w_for_3', speciesId: '002_bong_lua', level: 17, x: 290, y: 150, vx: 9, vy: 5, facing: -1, timer: 2.5 },
      { id: 'w_for_4', speciesId: '005_kien_canh', level: 18, x: 175, y: 270, vx: 7, vy: -6, facing: -1, timer: 2.6 },
      { id: 'w_for_5', speciesId: '006_kien_ba_khoang', level: 32, x: 400, y: 245, vx: -7, vy: -5, facing: 1, timer: 3.0 }
    ],
    lake: [
      { id: 'w_lake_1', speciesId: '007_nghe', level: 7, x: 210, y: 220, vx: 7, vy: 5, facing: -1, timer: 2.8 },
      { id: 'w_lake_2', speciesId: '008_suu_nhi', level: 18, x: 310, y: 260, vx: -7, vy: -5, facing: 1, timer: 2.6 },
      { id: 'w_lake_3', speciesId: '009_trau_nuoc', level: 32, x: 260, y: 175, vx: 6, vy: 4, facing: -1, timer: 3.0 }
    ]
  };

  let nearestWild = null;
  let battleState = null;
  let uiMounted = false;

  function mountUI() {
    if (uiMounted) return;
    uiMounted = true;

    // Floating HUD button (top-right) to open Linh Thú Party / Battle
    const hudBtn = document.createElement('button');
    hudBtn.id = 'linhThuHudBtn';
    hudBtn.textContent = '🐾 Linh Thú (1)';
    hudBtn.style.cssText = 'position:fixed;top:58px;right:16px;z-index:900;background:linear-gradient(135deg,#0f766e,#115e59);color:#ecfdf5;border:1px solid #2dd4bf;padding:7px 12px;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.4)';
    hudBtn.onclick = () => openPartyModal();
    document.body.appendChild(hudBtn);

    // Battle & Party Modal
    const modal = document.createElement('div');
    modal.id = 'linhThuModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(6,10,18,0.82);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif;color:#f1f5f9';
    modal.innerHTML = `
      <div style="background:#0f172a;border:2px solid #2dd4bf;border-radius:16px;max-width:740px;width:100%;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,0.7)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <strong id="ltModalTitle" style="font-size:16px;color:#5eead4">⚔️ SÂN ĐẤU LINH THÚ</strong>
          <button id="ltCloseBtn" style="background:#1e293b;color:#cbd5e1;border:1px solid #475569;border-radius:8px;padding:4px 10px;cursor:pointer;font-weight:700">✖ Đóng</button>
        </div>
        <div id="ltBattleView">
          <canvas id="ltBattleCanvas" width="700" height="330" style="width:100%;border-radius:12px;border:1px solid #334155;background:#0b1322;display:block"></canvas>
          <div id="ltLog" style="margin:8px 0;padding:8px 10px;background:#090e1a;border:1px solid #1e293b;border-radius:8px;font-size:12.5px;color:#fde047;min-height:20px"></div>
          <div id="ltMovesBar" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:8px"></div>
          <div style="display:flex;gap:8px">
            <button id="ltCatchBtn" style="flex:1;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border:none;border-radius:9px;padding:9px;font-weight:800;cursor:pointer">🎯 Ném Cầu Bắt Thú</button>
            <button id="ltRunBtn" style="background:#334155;color:#fff;border:none;border-radius:9px;padding:9px 16px;font-weight:700;cursor:pointer">🏃 Rút Lui</button>
          </div>
        </div>
        <div id="ltPartyView" style="display:none;max-height:380px;overflow-y:auto"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('ltCloseBtn').onclick = closeModal;
    document.getElementById('ltRunBtn').onclick = closeModal;
    document.getElementById('ltCatchBtn').onclick = attemptCatch;
  }

  function closeModal() {
    battleState = null;
    const modal = document.getElementById('linhThuModal');
    if (modal) modal.style.display = 'none';
  }

  function openPartyModal() {
    mountUI();
    document.getElementById('ltModalTitle').textContent = `🐾 ĐỘI HÌNH LINH THÚ (${party.length} con • Max Lv.50)`;
    document.getElementById('ltBattleView').style.display = 'none';
    const pv = document.getElementById('ltPartyView');
    pv.style.display = 'block';
    pv.innerHTML = party.map((p, idx) => {
      const sp = SPECIES[p.speciesId];
      const moves = getActiveMoves(p.speciesId, p.level).map(m => m.name).join(', ');
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:8px;background:#1e293b;border:1px solid ${idx === activePartyIdx ? '#2dd4bf' : '#334155'};border-radius:10px">
          <img src="${sp.imgSrc}" style="width:54px;height:54px;object-fit:contain;background:#0f172a;border-radius:8px;padding:4px" />
          <div style="flex:1">
            <div style="font-weight:800;font-size:14px">${sp.dex} ${sp.name} <span style="color:#fde047">Lv.${p.level}</span></div>
            <div style="font-size:12px;color:#94a3b8">HP: ${p.hp}/${p.stats.maxHp} • ATK ${p.stats.atk} • SP.ATK ${p.stats.spAtk} • SPD ${p.stats.spd}</div>
            <div style="font-size:11.5px;color:#5eead4;margin-top:2px">Chiêu: ${moves}</div>
          </div>
          <button onclick="window.LinhThuSystem.setActive(${idx})" style="background:${idx === activePartyIdx ? '#0d9488' : '#334155'};color:#fff;border:none;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer">
            ${idx === activePartyIdx ? '✅ Đang xuất trận' : 'Chọn'}
          </button>
        </div>
      `;
    }).join('');
    document.getElementById('linhThuModal').style.display = 'flex';
  }

  function startBattle(wildMob, currentMap) {
    mountUI();
    const ally = party[activePartyIdx];
    ally.hp = ally.stats.maxHp; // Full heal for clean skirmish
    const enemy = createInstance(wildMob.speciesId, wildMob.level);

    battleState = {
      wildMob,
      currentMap,
      ally,
      enemy,
      busy: false,
      vfx: null,
      shake: 0,
      popup: null
    };

    document.getElementById('ltModalTitle').textContent = `⚔️ CHẠM TRÁN ${SPECIES[enemy.speciesId].name.toUpperCase()} Lv.${enemy.level}!`;
    document.getElementById('ltPartyView').style.display = 'none';
    document.getElementById('ltBattleView').style.display = 'block';
    document.getElementById('ltLog').textContent = `✨ ${SPECIES[ally.speciesId].name} Lv.${ally.level} xuất trận! Hãy chọn chiêu hoặc Ném Cầu Bắt Thú.`;
    renderMoveButtons();
    document.getElementById('linhThuModal').style.display = 'flex';
    requestAnimationFrame(renderBattleFrame);
  }

  function renderMoveButtons() {
    if (!battleState) return;
    const bar = document.getElementById('ltMovesBar');
    const moves = getActiveMoves(battleState.ally.speciesId, battleState.ally.level);
    bar.innerHTML = '';
    moves.forEach((m) => {
      const btn = document.createElement('button');
      btn.disabled = battleState.busy;
      btn.style.cssText = 'background:#1e293b;color:#f8fafc;border:1px solid #38bdf8;border-radius:9px;padding:9px 10px;text-align:left;cursor:pointer;font-weight:700;font-size:12.5px';
      btn.innerHTML = `${m.name} <span style="float:right;color:#fde047;font-size:11px">${m.cls} ${m.power ? '• ' + m.power : ''}</span>`;
      btn.onclick = () => executePlayerMove(m);
      bar.appendChild(btn);
    });
  }

  function executePlayerMove(move) {
    if (!battleState || battleState.busy) return;
    battleState.busy = true;
    renderMoveButtons();

    const { ally, enemy } = battleState;
    let dmg = 0;
    if (move.power > 0) {
      const atkStat = move.cls === 'SP.ATK' ? ally.stats.spAtk : ally.stats.atk;
      const defStat = move.cls === 'SP.ATK' ? enemy.stats.spDef : enemy.stats.def;
      dmg = Math.max(8, Math.round((((2 * ally.level) / 5 + 2) * move.power * (atkStat / defStat)) / 36 + 4));
      enemy.hp = Math.max(0, enemy.hp - dmg);
    }

    battleState.vfx = { color: move.color, timer: 0.45 };
    battleState.shake = move.power >= 80 ? 10 : 5;
    battleState.popup = { text: dmg > 0 ? `-${dmg} (${move.cls})` : 'HIỆU ỨNG!', x: 520, y: 95, color: move.color, timer: 0.85 };
    document.getElementById('ltLog').textContent = `🔥 ${SPECIES[ally.speciesId].name} dùng ${move.name}${dmg > 0 ? ` gây ${dmg} sát thương!` : '!'}`;

    if (enemy.hp <= 0) {
      setTimeout(() => winBattle(false), 750);
      return;
    }

    setTimeout(() => {
      if (!battleState) return;
      const eMoves = getActiveMoves(enemy.speciesId, enemy.level);
      const eMove = eMoves[Math.floor(Math.random() * eMoves.length)];
      const eDmg = eMove.power > 0 ? Math.max(5, Math.round(eMove.power * 0.25)) : 0;
      ally.hp = Math.max(1, ally.hp - eDmg);
      battleState.shake = 5;
      document.getElementById('ltLog').textContent = `⚡ ${SPECIES[enemy.speciesId].name} phản công bằng ${eMove.name}${eDmg > 0 ? ` (-${eDmg} HP)!` : '!'}`;
      battleState.busy = false;
      renderMoveButtons();
    }, 650);
  }

  function attemptCatch() {
    if (!battleState || battleState.busy) return;
    battleState.busy = true;
    renderMoveButtons();
    const { enemy } = battleState;
    const rate = 0.45 + (1 - enemy.hp / enemy.stats.maxHp) * 0.5;
    document.getElementById('ltLog').textContent = '🎯 Đang ném Cầu Bắt Thú...';

    setTimeout(() => {
      if (!battleState) return;
      if (Math.random() <= rate) {
        party.push(enemy);
        document.getElementById('linhThuHudBtn').textContent = `🐾 Linh Thú (${party.length})`;
        battleState.popup = { text: 'THU PHỤC!', x: 520, y: 95, color: '#2dd4bf', timer: 1.0 };
        document.getElementById('ltLog').textContent = `🎉 Tuyệt vời! Đã bắt được ${SPECIES[enemy.speciesId].name} Lv.${enemy.level}!`;
        setTimeout(() => winBattle(true), 850);
      } else {
        document.getElementById('ltLog').textContent = '💨 Quái thú thoát khỏi cầu! Hãy đánh yếu nó thêm chút nữa!';
        battleState.busy = false;
        renderMoveButtons();
      }
    }, 750);
  }

  function winBattle(caught) {
    if (!battleState) return;
    const { ally, enemy, wildMob, currentMap } = battleState;
    // Grant EXP & check Lv.16 / Lv.32 Evolution (Max Lv.50)
    const gainedLv = enemy.level >= ally.level ? 2 : 1;
    ally.level = Math.min(50, ally.level + gainedLv);
    const sp = SPECIES[ally.speciesId];
    let evoMsg = '';
    if (sp.evolveTo && ally.level >= sp.evolveLevel) {
      ally.speciesId = sp.evolveTo;
      evoMsg = ` 🌟 TIẾN HÓA THÀNH ${SPECIES[ally.speciesId].name.toUpperCase()}!`;
    }
    ally.stats = calcStats(ally.speciesId, ally.level);
    ally.hp = ally.stats.maxHp;

    // Respawn wild mob elsewhere on map
    const list = wildSpawns[currentMap] || [];
    const idx = list.indexOf(wildMob);
    if (idx !== -1 && caught) {
      wildMob.x = 140 + Math.random() * 260;
      wildMob.y = 140 + Math.random() * 220;
    }

    document.getElementById('ltLog').textContent = `🏆 Chiến thắng! ${SPECIES[ally.speciesId].name} lên Lv.${ally.level}!${evoMsg}`;
    setTimeout(closeModal, 1100);
  }

  function renderBattleFrame() {
    if (!battleState) return;
    const c = document.getElementById('ltBattleCanvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    const sx = battleState.shake > 0 ? (Math.random() - 0.5) * battleState.shake * 2 : 0;
    const sy = battleState.shake > 0 ? (Math.random() - 0.5) * battleState.shake * 2 : 0;
    if (battleState.shake > 0) battleState.shake *= 0.85;

    ctx.save();
    ctx.translate(sx, sy);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#172554');
    grad.addColorStop(0.55, '#1e3a5f');
    grad.addColorStop(1, '#14532d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Platforms
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(520, 195, 95, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(180, 295, 115, 32, 0, 0, Math.PI * 2); ctx.fill();

    // Enemy Sprite (top-right)
    const eImg = getSprite(battleState.enemy.speciesId);
    const bob = Math.sin(performance.now() * 0.004) * 4;
    if (eImg.complete) ctx.drawImage(eImg, 520 - 75, 55 + bob, 150, 150);

    // Ally Sprite (bottom-left, flipped facing right)
    const aImg = getSprite(battleState.ally.speciesId);
    if (aImg.complete) {
      ctx.save();
      ctx.translate(180, 130 - bob);
      ctx.scale(-1, 1);
      ctx.drawImage(aImg, -90, 0, 180, 180);
      ctx.restore();
    }

    // VFX Flash
    if (battleState.vfx && battleState.vfx.timer > 0) {
      battleState.vfx.timer -= 0.016;
      ctx.fillStyle = battleState.vfx.color;
      ctx.globalAlpha = Math.max(0, battleState.vfx.timer);
      ctx.beginPath(); ctx.arc(520, 130, 68, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Popup
    if (battleState.popup && battleState.popup.timer > 0) {
      battleState.popup.timer -= 0.016;
      battleState.popup.y -= 0.6;
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
      ctx.strokeText(battleState.popup.text, battleState.popup.x, battleState.popup.y);
      ctx.fillStyle = battleState.popup.color;
      ctx.fillText(battleState.popup.text, battleState.popup.x, battleState.popup.y);
    }

    ctx.restore();

    // HP HUD Boxes
    drawHp(ctx, 24, 20, `${SPECIES[battleState.enemy.speciesId].name} Lv.${battleState.enemy.level}`, battleState.enemy.hp, battleState.enemy.stats.maxHp);
    drawHp(ctx, 410, 250, `${SPECIES[battleState.ally.speciesId].name} Lv.${battleState.ally.level}`, battleState.ally.hp, battleState.ally.stats.maxHp);

    requestAnimationFrame(renderBattleFrame);
  }

  function drawHp(ctx, x, y, label, hp, maxHp) {
    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    ctx.fillRect(x, y, 260, 52); ctx.strokeRect(x, y, 260, 52);
    ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 12.5px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(label, x + 10, y + 19);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(x + 10, y + 28, 240, 12);
    const ratio = Math.max(0, hp / maxHp);
    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(x + 10, y + 28, 240 * ratio, 12);
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'b' && nearestWild && !battleState) {
      startBattle(nearestWild.mob, nearestWild.map);
    } else if (k === 'p' && !battleState) {
      openPartyModal();
    }
  });

  window.LinhThuSystem = {
    setActive(idx) {
      activePartyIdx = idx;
      openPartyModal();
    },
    update(dt, currentMap, player, isPaused) {
      mountUI();
      if (isPaused || battleState) return;
      const list = wildSpawns[currentMap] || [];
      nearestWild = null;
      let bestDist = 42;

      for (const m of list) {
        m.timer -= dt;
        if (m.timer <= 0) {
          m.timer = 2.8 + Math.random() * 2.5;
          if (Math.random() < 0.5) {
            m.vx = 0; m.vy = 0;
          } else {
            m.vx = (Math.random() - 0.5) * 14;
            m.vy = (Math.random() - 0.5) * 14;
          }
        }
        m.x = Math.max(48, Math.min(460, m.x + m.vx * dt));
        m.y = Math.max(48, Math.min(460, m.y + m.vy * dt));
        if (Math.abs(m.vx) > 1) m.facing = m.vx > 0 ? 1 : -1;

        if (player) {
          const d = Math.hypot(m.x - player.x, m.y - player.y);
          if (d < bestDist) {
            bestDist = d;
            nearestWild = { mob: m, map: currentMap };
          }
        }
      }
    },
    collectRenderables(renderables, currentMap, ctx, player) {
      const list = wildSpawns[currentMap] || [];
      const now = performance.now();
      for (const m of list) {
        renderables.push({
          sortY: m.y + 8,
          draw: () => {
            const sp = SPECIES[m.speciesId];
            const im = crispCache[m.speciesId] || getSprite(m.speciesId);
            const ready = crispCache[m.speciesId] ? true : (im.complete && im.naturalWidth > 0);
            const isMoving = Math.abs(m.vx) > 0.5 || Math.abs(m.vy) > 0.5;
            const calmSway = isMoving ? Math.sin(now * 0.008 + m.x) * 0.04 : 0;
            const drawSize = (m.speciesId === '001_hat_lua' || m.speciesId === '004_kien_lua' || m.speciesId === '007_nghe') ? 11 : (m.speciesId === '002_bong_lua' || m.speciesId === '005_kien_canh' || m.speciesId === '008_suu_nhi') ? 13 : 15;
            const cx = m.x + 8;
            const footY = m.y + 8;

            ctx.save();
            // 1. Clean solid ground shadow (like classic 2D RPGs)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
            ctx.beginPath(); ctx.ellipse(cx, footY, drawSize * 0.38, 1.9, 0, 0, Math.PI * 2); ctx.fill();

            // 2. Crisp outlined sprite (no shadowBlur / no halo)
            if (ready) {
              ctx.save();
              ctx.translate(cx, footY - drawSize * 0.5);
              ctx.rotate(calmSway);
              if (m.facing > 0) ctx.scale(-1, 1);
              ctx.drawImage(im, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
              ctx.restore();
            }

            // 3. Clean minimal outlined label
            ctx.font = 'bold 4.2px sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = 'rgba(9, 14, 26, 0.92)';
            const lbl = `${sp.name} Lv.${m.level}`;
            ctx.strokeText(lbl, cx, footY - drawSize - 1.5);
            ctx.fillStyle = '#fef08a';
            ctx.fillText(lbl, cx, footY - drawSize - 1.5);

            if (nearestWild && nearestWild.mob === m) {
              ctx.fillStyle = 'rgba(13,148,136,0.95)';
              ctx.fillRect(cx - 17, footY - drawSize - 11.5, 34, 6.5);
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 4.2px sans-serif';
              ctx.fillText('[B] Bắt / Đấu', cx, footY - drawSize - 7);
            }
            ctx.restore();
          }
        });
      }
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI);
  } else {
    mountUI();
  }
})();
