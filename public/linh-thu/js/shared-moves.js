/**
 * Global Skill & Body-Action Architecture (Max Level 50, Pokémon-style ATK / SP.ATK / STATUS)
 */

export const BODY_ACTIONS = {
  dash_attack: {
    fps: 14, loop: false,
    labels: [
      '01. Hạ trọng tâm lấy đà', '02. Nén thân lùi sau tụ lực', '03. Chuẩn bị phóng vọt',
      '04. LAO VÚT ÁP SÁT MỤC TIÊU!', '05. Tốc độ cực đại xé gió', '06. Tung cú đánh cận chiến',
      '07. VA CHẠM NỔ LỰC (135%)', '08. Sóng xung kích đẩy lùi mục tiêu', '09. Ép lực cận chiến đỉnh điểm',
      '10. Bật nảy giữ khoảng cách', '11. Xoay người trên không', '12. Tia lửa va chạm bắn tung',
      '13. Chuẩn bị tiếp đất', '14. Chạm đất giảm chấn', '15. Hồi phục thăng bằng',
      '16. Lướt lùi về vị trí đứng', '17. Dứt khoát thu thế', '18. Nhịp thở ổn định',
      '19. Cân chỉnh góc nhìn', '20. Hoàn tất → Về Idle'
    ],
    sample(t) {
      if (t < 0.16) { const k = t / 0.16; return { dx: k * 24, dy: k * 10, scaleX: 1 + k * 0.08, scaleY: 1 - k * 0.12, rot: k * 0.14, limbSwing: -k * 14, sproutBend: k * 16, vfxPower: 0, impact: false }; }
      if (t < 0.56) { const k = (t - 0.16) / 0.4; const d = Math.sin(k * Math.PI); return { dx: 24 - d * 215, dy: -d * 24, scaleX: 1 + d * 0.14, scaleY: 1 - d * 0.08, rot: -0.24 * d, limbSwing: 20 * d, sproutBend: -24 * d, vfxPower: d, impact: k > 0.35 && k < 0.65 }; }
      const k = 1 - (t - 0.56) / 0.44; return { dx: -20 * k, dy: Math.sin(k * Math.PI) * -10, scaleX: 1, scaleY: 1 + 0.04 * k, rot: -0.06 * k, limbSwing: 6 * k, sproutBend: 0, vfxPower: k * 0.4, impact: false };
    }
  },
  slash_attack: {
    fps: 14, loop: false,
    labels: [
      '01. Xoay vai tụ khí vào chi', '02. Nâng cao lưỡi lá/vuốt', '03. Nghiêng thân lấy góc chém',
      '04. Lao tới vung đòn vòng cung 1', '05. Quét ngang mục tiêu tốc độ cao', '06. Lưỡi sáng chém vệt thứ nhất',
      '07. Xoay tiếp nối cú chém chữ X', '08. BÙNG NỔ VỆT CHÉM (145%)', '09. Xé toạc không khí quanh mục tiêu',
      '10. Tia sáng bắn tung tóe', '11. Quán tính xoay theo đòn', '12. Bật lùi nhẹ giữ khoảng cách',
      '13. Dư chấn gió lướt qua', '14. Hạ thấp trọng tâm', '15. Lá rung nhẹ sau cú chém',
      '16. Tàn sáng tan dần', '17. Thu thế gọn gàng', '18. Trả vai về vị trí cân bằng',
      '19. Nhún nhẹ kết thúc', '20. Hoàn tất → Về Idle'
    ],
    sample(t) {
      if (t < 0.18) { const k = t / 0.18; return { dx: k * 16, dy: k * 6, scaleX: 1, scaleY: 1 - k * 0.08, rot: k * 0.16, limbSwing: -k * 22, sproutBend: k * 14, vfxPower: 0, impact: false }; }
      if (t < 0.62) { const k = (t - 0.18) / 0.44; const p = Math.sin(k * Math.PI); return { dx: -p * 195, dy: -p * 16, scaleX: 1 + p * 0.08, scaleY: 1, rot: -0.25 * p, limbSwing: 26 * Math.sin(k * Math.PI * 2), sproutBend: -20 * p, vfxPower: p, impact: k > 0.35 && k < 0.65 }; }
      const k = 1 - (t - 0.62) / 0.38; return { dx: -14 * k, dy: 0, scaleX: 1, scaleY: 1, rot: -0.05 * k, limbSwing: 6 * k, sproutBend: 0, vfxPower: k * 0.35, impact: false };
    }
  },
  cast_roar: {
    fps: 13, loop: false,
    labels: [
      '01. Hít sâu nén linh khí', '02. Hạ thân chuẩn bị kích hoạt', '03. Mầm lá dựng thẳng phát sáng',
      '04. Ngửa mặt tụ vòng hiệu ứng', '05. Bắt đầu phát sóng hiệu ứng!', '06. Vòng sáng tầng 1 lan tỏa',
      '07. Thân rung theo nhịp cộng hưởng', '08. Vòng hiệu ứng phủ lên mục tiêu', '09. ĐỈNH HIỆU ỨNG TRẠNG THÁI (140%)',
      '10. Hào quang tăng lực bừng sáng', '11. Sóng âm/trạng thái lan toàn sân', '12. Giữ tư thế uy nghiêm',
      '13. Hiệu ứng bắt đầu ngấm', '14. Hào quang dịu lại êm ái', '15. Hạ đầu về góc nhìn thẳng',
      '16. Dứt khoát thu khí', '17. Thả lỏng hai bên', '18. Tiếp đất vững vàng',
      '19. Nhịp thở đều trở lại', '20. Hoàn tất → Về Idle'
    ],
    sample(t) {
      if (t < 0.22) { const k = t / 0.22; return { dx: 0, dy: k * 8, scaleX: 1 + k * 0.06, scaleY: 1 - k * 0.08, rot: k * 0.06, limbSwing: -k * 10, sproutBend: k * 10, vfxPower: 0, impact: false }; }
      if (t < 0.72) { const k = (t - 0.22) / 0.5; const p = Math.sin(k * Math.PI); return { dx: Math.sin(k * 45) * 2.5, dy: -p * 12, scaleX: 1 + p * 0.08, scaleY: 1 + p * 0.1, rot: 0.12 * p, limbSwing: 16 * p, sproutBend: -14 * p, vfxPower: p, impact: k > 0.38 && k < 0.62 }; }
      const k = 1 - (t - 0.72) / 0.28; return { dx: 0, dy: -4 * k, scaleX: 1, scaleY: 1 + 0.03 * k, rot: 0.04 * k, limbSwing: 4 * k, sproutBend: 0, vfxPower: k * 0.35, impact: false };
    }
  },
  projectile_shoot: {
    fps: 14, loop: false,
    labels: [
      '01. Tụ linh khí trước thân', '02. Nén cầu năng lượng rực sáng', '03. Nghiêng người khóa mục tiêu',
      '04. Đẩy năng lượng ra phía trước', '05. PHÓNG ĐẠN PHÉP TẦM XA!', '06. Đạn năng lượng bay vút sang trái',
      '07. Tăng tốc lao thẳng vào bia tập', '08. NỔ TRÚNG MỤC TIÊU (145%)!', '09. Vụ nổ ánh sáng lan rộng',
      '10. Dư chấn năng lượng rực rỡ', '11. Giật lùi nhẹ theo phản lực', '12. Khói sáng tản dần',
      '13. Ngắt luồng năng lượng', '14. Bụi sáng lấp lánh bay tan', '15. Hạ trọng tâm giữ thăng bằng',
      '16. Thở nhẹ sau khi phóng chiêu', '17. Thu thế gọn gàng', '18. Cân chỉnh lại dáng đứng',
      '19. Nhún nhẹ kết thúc', '20. Hoàn tất → Về Idle'
    ],
    sample(t) {
      if (t < 0.2) { const k = t / 0.2; return { dx: k * 14, dy: k * 6, scaleX: 1 + k * 0.05, scaleY: 1 - k * 0.07, rot: k * 0.08, limbSwing: -k * 12, sproutBend: k * 14, vfxPower: k * 0.35, projT: 0, impact: false }; }
      if (t < 0.68) { const k = (t - 0.2) / 0.48; const p = Math.sin(k * Math.PI); return { dx: 12 + Math.sin(k * 35) * 2, dy: -p * 6, scaleX: 1 + p * 0.05, scaleY: 1, rot: -0.1 * p, limbSwing: 14 * p, sproutBend: -16 * p, vfxPower: 0.5 + p * 0.9, projT: Math.min(1, k * 1.35), impact: k > 0.62 && k < 0.85 }; }
      const k = 1 - (t - 0.68) / 0.32; return { dx: 4 * k, dy: 0, scaleX: 1, scaleY: 1, rot: 0, limbSwing: 0, sproutBend: 0, vfxPower: k * 0.3, projT: 1, impact: false };
    }
  },
  ultimate_burst: {
    fps: 13, loop: false,
    labels: [
      '01. Khom mình tụ linh khí cực đại', '02. Hào quang triệu hồi bừng sáng', '03. Nâng dần độ cao',
      '04. Bật tung lên không trung!', '05. Mở rộng tối đa tán lá/cánh', '06. TRIỆU HỒI ẤN KÝ TRÊN MỤC TIÊU!',
      '07. Vòng phép/bão xoay cực đại', '08. Mưa năng lượng giáng xuống!', '09. CỘT SÁNG NỔ TUNG (155%)',
      '10. Rực sáng toàn bộ chiến trường!', '11. ĐỈNH TUYỆT KỸ TỐI THƯỢNG!', '12. Sóng xung kích quét ngang bia tập',
      '13. Dư chấn ánh sáng lan rộng', '14. Giảm tốc xoay trên không', '15. Hào quang tản thành bụi sáng',
      '16. Bắt đầu hạ độ cao êm ái', '17. Tiếp đất nhẹ nhàng vững chãi', '18. Thu tán lá/cánh gọn gàng',
      '19. Nhún nhẹ cân bằng dáng đứng', '20. Hoàn tất Tuyệt kỹ → Về Idle'
    ],
    sample(t) {
      if (t < 0.2) { const k = t / 0.2; return { dx: 0, dy: k * 10, scaleX: 1 + k * 0.06, scaleY: 1 - k * 0.1, rot: 0, limbSwing: -k * 16, sproutBend: k * 14, vfxPower: 0, impact: false }; }
      if (t < 0.76) { const k = (t - 0.2) / 0.56; const p = Math.sin(k * Math.PI); return { dx: Math.sin(k * 24) * 4, dy: -28 * p, scaleX: 1 + p * 0.08, scaleY: 1 + p * 0.08, rot: Math.sin(k * Math.PI * 4) * 0.14 * p, limbSwing: 22 * p, sproutBend: -22 * p, vfxPower: 0.45 + p * 1.05, impact: k > 0.38 && k < 0.72 }; }
      const k = 1 - (t - 0.76) / 0.24; return { dx: 0, dy: -6 * k, scaleX: 1, scaleY: 1, rot: 0, limbSwing: 5 * k, sproutBend: 0, vfxPower: k * 0.45, impact: false };
    }
  }
};

export const DAMAGE_CLASS_LABELS = {
  ATK: '⚔️ Vật lý (ATK)',
  SP_ATK: '✨ Phép (SP.ATK)',
  STATUS: '🌀 Hiệu ứng (STATUS)'
};

export const CATEGORY_LABELS = {
  melee: 'Áp sát',
  ranged: 'Bắn ra',
  status: 'Hiệu ứng',
  summon: 'Triệu hồi'
};

export const MOVES_DB = {
  tackle_seed: {
    id: 'tackle_seed', name: 'Lao Húc', type: 'THƯỜNG', damageClass: 'ATK', category: 'melee', power: 40,
    bodyAction: 'dash_attack', vfx: 'impact_ring',
    desc: 'ATK (Vật lý) • Áp sát: Lấy đà lao thẳng húc đối thủ (Lv.1).'
  },
  roar_cry: {
    id: 'roar_cry', name: 'Gầm Vang', type: 'THƯỜNG', damageClass: 'STATUS', category: 'status', power: 0,
    bodyAction: 'cast_roar', vfx: 'roar_waves',
    desc: 'STATUS (Hiệu ứng): Phát sóng âm uy hiếp giảm ATK đối thủ (Lv.4).'
  },
  vine_whip: {
    id: 'vine_whip', name: 'Roi Mầm Xanh', type: 'THẢO', damageClass: 'ATK', category: 'melee', power: 50,
    bodyAction: 'slash_attack', vfx: 'leaf_slash',
    desc: 'ATK (Vật lý) • Áp sát: Quất roi lá xanh sắc bén vào mục tiêu (Lv.5).'
  },
  seed_shot: {
    id: 'seed_shot', name: 'Đạn Hạt Ngọc', type: 'THẢO', damageClass: 'SP_ATK', category: 'ranged', power: 65,
    bodyAction: 'projectile_shoot', vfx: 'seed_beam',
    desc: 'SP.ATK (Phép) • Bắn ra: Phóng liên hoàn chùm đạn hạt năng lượng từ xa (Lv.12).'
  },
  scratch_claw: {
    id: 'scratch_claw', name: 'Trảo Xé Gió', type: 'THƯỜNG', damageClass: 'ATK', category: 'melee', power: 70,
    bodyAction: 'slash_attack', vfx: 'claw_slash',
    desc: 'ATK (Vật lý) • Áp sát: Chiêu tiến hóa Lv.16, tung 2 vệt trảo sắc lẹm.'
  },
  leaf_blade: {
    id: 'leaf_blade', name: 'Phi Diệp Trảm', type: 'THẢO', damageClass: 'ATK', category: 'melee', power: 85,
    bodyAction: 'slash_attack', vfx: 'leaf_slash',
    desc: 'ATK (Vật lý) • Áp sát: Kiếm lá ngọc tốc độ cao, tỉ lệ chí mạng lớn (Lv.20).'
  },
  solar_bloom: {
    id: 'solar_bloom', name: 'Bão Hạt Vàng', type: 'THẢO', damageClass: 'SP_ATK', category: 'summon', power: 95,
    bodyAction: 'ultimate_burst', vfx: 'golden_grain_storm',
    desc: 'SP.ATK (Phép) • Triệu hồi: Gọi cơn bão hạt vàng & lá ngọc xoáy quanh mục tiêu (Lv.28).'
  },
  royal_canopy: {
    id: 'royal_canopy', name: 'Thịnh Vượng Hoàng Kim', type: 'THẢO', damageClass: 'SP_ATK', category: 'summon', power: 115,
    bodyAction: 'ultimate_burst', vfx: 'harvest_nova',
    desc: 'SP.ATK (Phép) • Triệu hồi: Chiêu tiến hóa Lv.32, giáng cột sáng mùa vàng!'
  },
  emerald_tempest: {
    id: 'emerald_tempest', name: 'Đại Bão Lục Bảo', type: 'THẢO', damageClass: 'SP_ATK', category: 'summon', power: 135,
    bodyAction: 'ultimate_burst', vfx: 'harvest_nova',
    desc: 'SP.ATK (Phép) • Triệu hồi: Tuyệt kỹ cấp tối đa Lv.50, bão năng lượng cực đại!'
  },
  toxic_spore_tm: {
    id: 'toxic_spore_tm', name: 'Bào Tử Độc', type: 'ĐỘC', damageClass: 'STATUS', category: 'status', power: 0,
    bodyAction: 'cast_roar', vfx: 'toxic_cloud',
    desc: 'STATUS • Đĩa TM06: Gieo mây bào tử tím gây Trúng Độc lên mục tiêu.'
  },
  solar_beam_tm: {
    id: 'solar_beam_tm', name: 'Tia Nắng Mặt Trời', type: 'THẢO', damageClass: 'SP_ATK', category: 'ranged', power: 115,
    bodyAction: 'projectile_shoot', vfx: 'solar_laser',
    desc: 'SP.ATK (Phép) • Đĩa TM12: Bắn chùm tia laser năng lượng mặt trời xuyên thấu!'
  },
  synthesis_tm: {
    id: 'synthesis_tm', name: 'Quang Hợp Hồi Sinh', type: 'THẢO', damageClass: 'STATUS', category: 'status', power: 0,
    bodyAction: 'cast_roar', vfx: 'heal_aura',
    desc: 'STATUS • Đĩa TM28: Hấp thụ ánh sáng tạo vòng hồi phục 50% HP.'
  },
  // === CHIÊU HỆ HỎA & BỌ (DÒNG #004 KIẾN LỬA) ===
  bite_fang: {
    id: 'bite_fang', name: 'Ngoạm Lửa', type: 'HỎA', damageClass: 'ATK', category: 'melee', power: 55,
    bodyAction: 'dash_attack', vfx: 'flame_charge',
    desc: 'ATK (Vật lý) • Áp sát: Lao tới ngoạm đối thủ bằng hàm lửa nóng bỏng (Lv.5).'
  },
  ember_shot: {
    id: 'ember_shot', name: 'Tia Lửa Đỏ', type: 'HỎA', damageClass: 'SP_ATK', category: 'ranged', power: 60,
    bodyAction: 'projectile_shoot', vfx: 'fire_orb',
    desc: 'SP.ATK (Phép) • Bắn ra: Phóng cầu lửa nhỏ thiêu đốt từ xa (Lv.12).'
  },
  flame_charge: {
    id: 'flame_charge', name: 'Xung Kích Hỏa Diệm', type: 'HỎA', damageClass: 'ATK', category: 'melee', power: 75,
    bodyAction: 'dash_attack', vfx: 'flame_charge',
    desc: 'ATK (Vật lý) • Áp sát: Chiêu tiến hóa Lv.16, bọc lửa toàn thân lao húc!'
  },
  fire_burst_tm: {
    id: 'fire_burst_tm', name: 'Hỏa Cầu Bùng Nổ', type: 'HỎA', damageClass: 'SP_ATK', category: 'ranged', power: 100,
    bodyAction: 'projectile_shoot', vfx: 'fire_orb',
    desc: 'SP.ATK (Phép) • Đĩa TM38: Bắn đại hỏa cầu nổ tung trên mục tiêu.'
  },
  drill_pierce: {
    id: 'drill_pierce', name: 'Song Mũi Khoan Lửa', type: 'HỎA', damageClass: 'ATK', category: 'melee', power: 115,
    bodyAction: 'slash_attack', vfx: 'drill_pierce',
    desc: 'ATK (Vật lý) • Áp sát: Chiêu tiến hóa Lv.32 (#006), đâm xuyên bằng song mũi khoan!'
  },
  inferno_nova: {
    id: 'inferno_nova', name: 'Bão Lửa Ba Khoang', type: 'HỎA', damageClass: 'SP_ATK', category: 'summon', power: 135,
    bodyAction: 'ultimate_burst', vfx: 'inferno_pillar',
    desc: 'SP.ATK (Phép) • Triệu hồi: Tuyệt kỹ Lv.50 (Max), cột lửa địa ngục thiêu rụi!'
  },
  // === CHIÊU HỆ THỦY & THỔ (DÒNG #007 NGHÉ - TRÂU NƯỚC) ===
  horn_ram: {
    id: 'horn_ram', name: 'Húc Sừng', type: 'THƯỜNG', damageClass: 'ATK', category: 'melee', power: 55,
    bodyAction: 'dash_attack', vfx: 'impact_ring',
    desc: 'ATK (Vật lý) • Áp sát: Lao tới húc mạnh bằng cặp sừng (Lv.5).'
  },
  water_pulse: {
    id: 'water_pulse', name: 'Sóng Thủy Triều', type: 'THỦY', damageClass: 'SP_ATK', category: 'ranged', power: 65,
    bodyAction: 'projectile_shoot', vfx: 'water_wave',
    desc: 'SP.ATK (Phép) • Bắn ra: Bắn vòng sóng nước xoáy vào mục tiêu (Lv.12).'
  },
  mud_stomp: {
    id: 'mud_stomp', name: 'Giậm Đất Lở', type: 'THỔ', damageClass: 'ATK', category: 'melee', power: 80,
    bodyAction: 'dash_attack', vfx: 'earth_quake',
    desc: 'ATK (Vật lý) • Áp sát: Chiêu tiến hóa Lv.16, giậm rung chuyển mặt đất!'
  },
  hydro_pump_tm: {
    id: 'hydro_pump_tm', name: 'Vòi Rồng Thủy Lực', type: 'THỦY', damageClass: 'SP_ATK', category: 'ranged', power: 110,
    bodyAction: 'projectile_shoot', vfx: 'hydro_beam',
    desc: 'SP.ATK (Phép) • Đĩa TM56: Phóng luồng thủy lực áp suất cao xuyên phá!'
  },
  tidal_horn: {
    id: 'tidal_horn', name: 'Sừng Thủy Thần', type: 'THỦY', damageClass: 'ATK', category: 'melee', power: 115,
    bodyAction: 'slash_attack', vfx: 'water_wave',
    desc: 'ATK (Vật lý) • Áp sát: Chiêu tiến hóa Lv.32 (#009), sừng bọc sóng thần húc nát mục tiêu!'
  },
  tsunami_wrath: {
    id: 'tsunami_wrath', name: 'Đại Hồng Thủy', type: 'THỦY', damageClass: 'SP_ATK', category: 'summon', power: 135,
    bodyAction: 'ultimate_burst', vfx: 'tsunami_pillar',
    desc: 'SP.ATK (Phép) • Triệu hồi: Tuyệt kỹ Lv.50 (Max), triệu hồi cột sóng thần cuốn trôi!'
  }
};
