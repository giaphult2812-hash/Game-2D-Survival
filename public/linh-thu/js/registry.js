/**
 * Master Registry of All Linh Thú (Max Level 50, Cumulative Evolution Learnset)
 * - Lv.1 -> Lv.16 (#001 Hạt Lúa)
 * - Lv.16 -> Lv.32 (#002 Bông Lúa — keeps all Lv.1..16 moves + learns Lv.16..32 moves!)
 * - Lv.32 -> Lv.50 (#003 Lúa Chín — keeps all Lv.1..32 moves + learns Lv.32..50 moves!)
 */
const STAGE1_MOVES = [
  { moveId: 'tackle_seed', source: 'level', badge: 'Lv.1' },
  { moveId: 'roar_cry', source: 'level', badge: 'Lv.4' },
  { moveId: 'vine_whip', source: 'level', badge: 'Lv.5' },
  { moveId: 'seed_shot', source: 'level', badge: 'Lv.12' },
  { moveId: 'leaf_blade', source: 'level', badge: 'Lv.16' }
];

const STAGE2_NEW_MOVES = [
  { moveId: 'scratch_claw', source: 'evolution', badge: 'Tiến hóa Lv.16' },
  { moveId: 'solar_bloom', source: 'level', badge: 'Lv.24' },
  { moveId: 'solar_beam_tm', source: 'level', badge: 'Lv.32' }
];

const STAGE3_NEW_MOVES = [
  { moveId: 'royal_canopy', source: 'evolution', badge: 'Tiến hóa Lv.32' },
  { moveId: 'emerald_tempest', source: 'level', badge: 'Lv.50 (Max)' }
];

const SHARED_TM_AND_HIDDEN = [
  { moveId: 'toxic_spore_tm', source: 'tm', badge: 'Đĩa TM06' },
  { moveId: 'synthesis_tm', source: 'tm', badge: 'Đĩa TM28' },
  { moveId: 'solar_bloom', source: 'hidden', badge: 'Chiêu Ẩn' }
];

export const LINH_THU_REGISTRY = [
  {
    id: '001_hat_lua',
    dexNumber: '#001',
    name: 'Hạt Lúa',
    element: 'THẢO',
    elementColor: '#2ec4b6',
    maxLevel: 50,
    evolveLevel: 16,
    evolutionLine: 'Dạng 1 (Lv.1–16) → Tiến hóa #002 ở Lv.16 → #003 ở Lv.32 (Max Lv.50)',
    status: 'ready',
    baseImage: '/linh-thu/001_hat_lua/base.png?v=3',
    locomotions: ['move'],
    stats: { hp: 55, atk: 52, def: 58, spAtk: 56, spDef: 55, spd: 48 },
    learnset: [...STAGE1_MOVES, ...SHARED_TM_AND_HIDDEN]
  },
  {
    id: '002_bong_lua',
    dexNumber: '#002',
    name: 'Bông Lúa',
    element: 'THẢO',
    elementColor: '#2ec4b6',
    maxLevel: 50,
    evolveLevel: 32,
    evolutionLine: 'Dạng 2 (Tiến hóa Lv.16 — giữ toàn bộ chiêu Lv.1–16 + học thêm đến Lv.32)',
    status: 'ready',
    baseImage: '/linh-thu/002_bong_lua/base.png?v=3',
    locomotions: ['move', 'fly'],
    stats: { hp: 78, atk: 74, def: 72, spAtk: 88, spDef: 80, spd: 86 },
    learnset: [...STAGE1_MOVES, ...STAGE2_NEW_MOVES, { moveId: 'toxic_spore_tm', source: 'tm', badge: 'Đĩa TM06' }, { moveId: 'synthesis_tm', source: 'tm', badge: 'Đĩa TM28' }, { moveId: 'royal_canopy', source: 'hidden', badge: 'Chiêu Ẩn' }]
  },
  {
    id: '003_lua_chin',
    dexNumber: '#003',
    name: 'Lúa Chín Cuối Đầu',
    element: 'THẢO',
    elementColor: '#ffb703',
    maxLevel: 50,
    evolveLevel: null,
    evolutionLine: 'Dạng 3 Cuối (Tiến hóa Lv.32 — giữ toàn bộ chiêu trước + tuyệt kỹ Lv.50 Max)',
    status: 'ready',
    baseImage: '/linh-thu/003_lua_chin/base.png?v=3',
    locomotions: ['move', 'fly'],
    stats: { hp: 105, atk: 96, def: 94, spAtk: 124, spDef: 108, spd: 102 },
    learnset: [...STAGE1_MOVES, ...STAGE2_NEW_MOVES, ...STAGE3_NEW_MOVES, { moveId: 'toxic_spore_tm', source: 'tm', badge: 'Đĩa TM06' }, { moveId: 'synthesis_tm', source: 'tm', badge: 'Đĩa TM28' }]
  },
  {
    id: '004_kien_lua',
    dexNumber: '#004',
    name: 'Kiến Lửa',
    element: 'HỎA',
    elementColor: '#ff6b35',
    maxLevel: 50,
    evolveLevel: 16,
    evolutionLine: 'Dạng 1 (Lv.1–16) → Tiến hóa #005 Kiến Cánh (Lv.16) → #006 Kiến Ba Khoang (Lv.32)',
    status: 'ready',
    baseImage: '/linh-thu/004_kien_lua/base.png?v=1',
    locomotions: ['move'],
    stats: { hp: 50, atk: 62, def: 48, spAtk: 58, spDef: 46, spd: 64 },
    learnset: [
      { moveId: 'tackle_seed', source: 'level', badge: 'Lv.1' },
      { moveId: 'roar_cry', source: 'level', badge: 'Lv.4' },
      { moveId: 'bite_fang', source: 'level', badge: 'Lv.5' },
      { moveId: 'ember_shot', source: 'level', badge: 'Lv.12' },
      { moveId: 'flame_charge', source: 'level', badge: 'Lv.16' },
      { moveId: 'fire_burst_tm', source: 'tm', badge: 'Đĩa TM38' },
      { moveId: 'toxic_spore_tm', source: 'tm', badge: 'Đĩa TM06' }
    ]
  },
  {
    id: '005_kien_canh',
    dexNumber: '#005',
    name: 'Kiến Cánh',
    element: 'HỎA',
    elementColor: '#ff6b35',
    maxLevel: 50,
    evolveLevel: 32,
    evolutionLine: 'Dạng 2 (Tiến hóa Lv.16 — giữ chiêu Lv.1–16 + học thêm đến Lv.32)',
    status: 'ready',
    baseImage: '/linh-thu/005_kien_canh/base.png?v=1',
    locomotions: ['move', 'fly'],
    stats: { hp: 72, atk: 86, def: 68, spAtk: 82, spDef: 64, spd: 96 },
    learnset: [
      { moveId: 'tackle_seed', source: 'level', badge: 'Lv.1' },
      { moveId: 'roar_cry', source: 'level', badge: 'Lv.4' },
      { moveId: 'bite_fang', source: 'level', badge: 'Lv.5' },
      { moveId: 'ember_shot', source: 'level', badge: 'Lv.12' },
      { moveId: 'flame_charge', source: 'level', badge: 'Lv.16' },
      { moveId: 'scratch_claw', source: 'evolution', badge: 'Tiến hóa Lv.16' },
      { moveId: 'fire_burst_tm', source: 'level', badge: 'Lv.24' },
      { moveId: 'drill_pierce', source: 'level', badge: 'Lv.32' },
      { moveId: 'toxic_spore_tm', source: 'tm', badge: 'Đĩa TM06' },
      { moveId: 'inferno_nova', source: 'hidden', badge: 'Chiêu Ẩn' }
    ]
  },
  {
    id: '006_kien_ba_khoang',
    dexNumber: '#006',
    name: 'Kiến Ba Khoang',
    element: 'HỎA',
    elementColor: '#e63946',
    maxLevel: 50,
    evolveLevel: null,
    evolutionLine: 'Dạng 3 Cuối (Tiến hóa Lv.32 — giữ toàn bộ chiêu trước + tuyệt kỹ Lv.50 Max)',
    status: 'ready',
    baseImage: '/linh-thu/006_kien_ba_khoang/base.png?v=1',
    locomotions: ['move', 'fly'],
    stats: { hp: 94, atk: 122, def: 88, spAtk: 108, spDef: 82, spd: 118 },
    learnset: [
      { moveId: 'tackle_seed', source: 'level', badge: 'Lv.1' },
      { moveId: 'roar_cry', source: 'level', badge: 'Lv.4' },
      { moveId: 'bite_fang', source: 'level', badge: 'Lv.5' },
      { moveId: 'ember_shot', source: 'level', badge: 'Lv.12' },
      { moveId: 'flame_charge', source: 'level', badge: 'Lv.16' },
      { moveId: 'scratch_claw', source: 'evolution', badge: 'Tiến hóa Lv.16' },
      { moveId: 'fire_burst_tm', source: 'level', badge: 'Lv.24' },
      { moveId: 'drill_pierce', source: 'evolution', badge: 'Tiến hóa Lv.32' },
      { moveId: 'inferno_nova', source: 'level', badge: 'Lv.50 (Max)' },
      { moveId: 'toxic_spore_tm', source: 'tm', badge: 'Đĩa TM06' }
    ]
  },
  {
    id: '007_nghe',
    dexNumber: '#007',
    name: 'Nghé',
    element: 'THỦY',
    elementColor: '#3a86ff',
    maxLevel: 50,
    evolveLevel: 16,
    evolutionLine: 'Dạng 1 (Lv.1–16) → Tiến hóa #008 Sửu Nhi (Lv.16) → #009 Trâu Nước (Lv.32)',
    status: 'ready',
    baseImage: '/linh-thu/007_nghe/base.png?v=1',
    locomotions: ['move', 'swim'],
    stats: { hp: 64, atk: 60, def: 62, spAtk: 52, spDef: 56, spd: 46 },
    learnset: [
      { moveId: 'tackle_seed', source: 'level', badge: 'Lv.1' },
      { moveId: 'roar_cry', source: 'level', badge: 'Lv.4' },
      { moveId: 'horn_ram', source: 'level', badge: 'Lv.5' },
      { moveId: 'water_pulse', source: 'level', badge: 'Lv.12' },
      { moveId: 'mud_stomp', source: 'level', badge: 'Lv.16' },
      { moveId: 'hydro_pump_tm', source: 'tm', badge: 'Đĩa TM56' },
      { moveId: 'synthesis_tm', source: 'tm', badge: 'Đĩa TM28' }
    ]
  },
  {
    id: '008_suu_nhi',
    dexNumber: '#008',
    name: 'Sửu Nhi',
    element: 'THỦY',
    elementColor: '#3a86ff',
    maxLevel: 50,
    evolveLevel: 32,
    evolutionLine: 'Dạng 2 (Tiến hóa Lv.16 — giữ chiêu Lv.1–16 + học thêm đến Lv.32)',
    status: 'ready',
    baseImage: '/linh-thu/008_suu_nhi/base.png?v=1',
    locomotions: ['move', 'swim'],
    stats: { hp: 88, atk: 88, def: 86, spAtk: 74, spDef: 78, spd: 68 },
    learnset: [
      { moveId: 'tackle_seed', source: 'level', badge: 'Lv.1' },
      { moveId: 'roar_cry', source: 'level', badge: 'Lv.4' },
      { moveId: 'horn_ram', source: 'level', badge: 'Lv.5' },
      { moveId: 'water_pulse', source: 'level', badge: 'Lv.12' },
      { moveId: 'mud_stomp', source: 'evolution', badge: 'Tiến hóa Lv.16' },
      { moveId: 'hydro_pump_tm', source: 'level', badge: 'Lv.24' },
      { moveId: 'tidal_horn', source: 'level', badge: 'Lv.32' },
      { moveId: 'tsunami_wrath', source: 'hidden', badge: 'Chiêu Ẩn' }
    ]
  },
  {
    id: '009_trau_nuoc',
    dexNumber: '#009',
    name: 'Trâu Nước',
    element: 'THỦY',
    elementColor: '#0284c7',
    maxLevel: 50,
    evolveLevel: null,
    evolutionLine: 'Dạng 3 Cuối (Tiến hóa Lv.32 — giữ toàn bộ chiêu trước + tuyệt kỹ Lv.50 Max)',
    status: 'ready',
    baseImage: '/linh-thu/009_trau_nuoc/base.png?v=1',
    locomotions: ['move', 'swim'],
    stats: { hp: 122, atk: 118, def: 114, spAtk: 96, spDef: 102, spd: 82 },
    learnset: [
      { moveId: 'tackle_seed', source: 'level', badge: 'Lv.1' },
      { moveId: 'roar_cry', source: 'level', badge: 'Lv.4' },
      { moveId: 'horn_ram', source: 'level', badge: 'Lv.5' },
      { moveId: 'water_pulse', source: 'level', badge: 'Lv.12' },
      { moveId: 'mud_stomp', source: 'evolution', badge: 'Tiến hóa Lv.16' },
      { moveId: 'hydro_pump_tm', source: 'level', badge: 'Lv.24' },
      { moveId: 'tidal_horn', source: 'evolution', badge: 'Tiến hóa Lv.32' },
      { moveId: 'tsunami_wrath', source: 'level', badge: 'Lv.50 (Max)' }
    ]
  }
];
