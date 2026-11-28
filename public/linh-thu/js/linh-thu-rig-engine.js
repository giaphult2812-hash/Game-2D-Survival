/**
 * Continuous 10x10 Soft-Mesh 20-Frame Engine + Target Dummy Showcase
 * - Zero hard-cut seams via continuous 10x10 textured triangle mesh
 * - Renders a Target Dummy on stage during skill previews so Melee, Ranged, Status & Summon moves look visceral and clear!
 */
import { BODY_ACTIONS, MOVES_DB } from './shared-moves.js';

export const LOCOMOTION_ANIM_TEMPLATES = {
  move: {
    label: 'Di chuyển (Move)',
    fps: 12,
    loop: true,
    labels: Array.from({ length: 20 }, (_, i) => {
      const f = i + 1;
      if (f <= 5) return `${String(f).padStart(2, '0')}. Nhún chân lấy đà bước tới`;
      if (f <= 10) return `${String(f).padStart(2, '0')}. Bật nhảy tung tăng • Mầm lá vẫy`;
      if (f <= 15) return `${String(f).padStart(2, '0')}. Đáp đất êm • Nén nhẹ thân`;
      return `${String(f).padStart(2, '0')}. Nhịp bước 2 → Nối mượt Frame 01`;
    }),
    sample(t) {
      const step = Math.abs(Math.sin(t * Math.PI * 2));
      const sway = Math.sin(t * Math.PI * 2);
      return {
        dx: sway * 3, dy: -step * 4.5,
        scaleX: 1 - step * 0.015,
        scaleY: 1 + step * 0.02,
        rot: sway * 0.035,
        limbSwing: Math.sin(t * Math.PI * 4) * 9,
        sproutBend: -sway * 12,
        vfxPower: 0, impact: false
      };
    }
  },
  swim: {
    label: 'Bơi lội (Swim)',
    fps: 12,
    loop: true,
    labels: Array.from({ length: 20 }, (_, i) => `${String(i + 1).padStart(2, '0')}. Lướt sóng nhịp nhàng • Bọt nước`),
    sample(t) {
      const s = Math.sin(t * Math.PI * 2);
      return { dx: s * 10, dy: Math.cos(t * Math.PI * 2) * 10, scaleX: 1, scaleY: 1, rot: -0.14 + s * 0.07, limbSwing: s * 16, sproutBend: s * 18, vfxPower: 0, impact: false };
    }
  },
  fly: {
    label: 'Bay lượn (Fly)',
    fps: 13,
    loop: true,
    labels: Array.from({ length: 20 }, (_, i) => `${String(i + 1).padStart(2, '0')}. Vỗ cánh giữ độ cao • Lượn gió`),
    sample(t) {
      const s = Math.sin(t * Math.PI * 2);
      return { dx: 0, dy: -18 + s * 14, scaleX: 1, scaleY: 1, rot: s * 0.06, limbSwing: Math.sin(t * Math.PI * 4) * 20, sproutBend: -s * 14, vfxPower: 0, impact: false };
    }
  }
};

export const IDLE_TEMPLATE = {
  label: 'Đứng thở (Idle)',
  fps: 12,
  loop: true,
  labels: Array.from({ length: 20 }, (_, i) => {
    const f = i + 1;
    if (f <= 5) return `${String(f).padStart(2, '0')}. Thở nhẹ tự nhiên • Mầm ngọc khẽ rung`;
    if (f <= 10) return `${String(f).padStart(2, '0')}. Phồng thân mochi • Lá bên đung đưa`;
    if (f <= 14) return `${String(f).padStart(2, '0')}. Thư giãn hạ nhẹ trọng tâm`;
    return `${String(f).padStart(2, '0')}. Nhịp thở êm → Nối liền Frame 01`;
  }),
  sample(t) {
    const s = Math.sin(t * Math.PI * 2);
    return {
      dx: 0, dy: s * 2.5,
      scaleX: 1 - s * 0.022, scaleY: 1 + s * 0.028,
      rot: s * 0.02, limbSwing: s * 7,
      sproutBend: Math.sin(t * Math.PI * 2 + 0.6) * 14,
      vfxPower: 0, impact: false
    };
  }
};

function drawTexturedTriangle(ctx, img, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2) {
  const cx = (x0 + x1 + x2) / 3;
  const cy = (y0 + y1 + y2) / 3;
  const inf = (x, y) => {
    const dx = x - cx, dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * 0.65, y + (dy / len) * 0.65];
  };
  const [ix0, iy0] = inf(x0, y0);
  const [ix1, iy1] = inf(x1, y1);
  const [ix2, iy2] = inf(x2, y2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ix0, iy0); ctx.lineTo(ix1, iy1); ctx.lineTo(ix2, iy2);
  ctx.closePath();
  ctx.clip();

  const du1 = u1 - u0, dv1 = v1 - v0;
  const du2 = u2 - u0, dv2 = v2 - v0;
  const det = du1 * dv2 - du2 * dv1;
  if (Math.abs(det) < 1e-5) { ctx.restore(); return; }

  const dx1 = x1 - x0, dy1 = y1 - y0;
  const dx2 = x2 - x0, dy2 = y2 - y0;
  const a = (dx1 * dv2 - dx2 * dv1) / det;
  const b = (dy1 * dv2 - dy2 * dv1) / det;
  const c = (du1 * dx2 - du2 * dx1) / det;
  const d = (du1 * dy2 - du2 * dy1) / det;
  const e = x0 - a * u0 - c * v0;
  const f = y0 - b * u0 - d * v0;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export class LinhThuRigPlayer {
  constructor(monsterDef) {
    this.def = monsterDef;
    this.img = new Image();
    this.img.src = monsterDef.baseImage;
    this.animKey = 'idle';
    this.frame = 0;
    this.timer = 0;
    this.customFps = null;
    this.onComplete = null;
  }

  isSkillMode() {
    return Boolean(MOVES_DB[this.animKey]);
  }

  getAnimDef(key = this.animKey) {
    if (key === 'idle') return IDLE_TEMPLATE;
    if (LOCOMOTION_ANIM_TEMPLATES[key]) return LOCOMOTION_ANIM_TEMPLATES[key];
    const move = MOVES_DB[key];
    if (move) {
      const action = BODY_ACTIONS[move.bodyAction] || BODY_ACTIONS.dash_attack;
      return { ...action, label: move.name, move };
    }
    return IDLE_TEMPLATE;
  }

  play(key, onComplete = null) {
    this.animKey = key;
    this.frame = 0;
    this.timer = 0;
    this.onComplete = onComplete;
  }

  update(dt) {
    const anim = this.getAnimDef();
    const fps = this.customFps || anim.fps || 12;
    const dur = 1000 / fps;
    this.timer += dt;
    if (this.timer >= dur) {
      this.timer -= dur;
      this.frame++;
      if (this.frame >= 20) {
        if (anim.loop) {
          this.frame = 0;
        } else {
          const cb = this.onComplete;
          this.onComplete = null;
          this.play('idle');
          if (cb) cb();
        }
      }
    }
  }

  /**
   * Draws a cute Training Target Dummy ("Bia Tập Lĩnh Chiêu") on the left side during skill previews
   */
  drawTargetDummy(ctx, tx, ty, pose, move) {
    const hit = pose.impact && move.vfx !== 'heal_aura';
    const recoilX = hit ? -16 * Math.sin(this.frame * 1.4) : 0;
    const squashY = hit ? 0.86 : 1 + Math.sin(performance.now() * 0.005) * 0.025;
    const squashX = hit ? 1.14 : 1;

    ctx.save();
    ctx.translate(tx + recoilX, ty);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(squashX, squashY);

    // Cute Training Slime/Straw Dummy Body
    const flash = hit && this.frame % 2 === 0;
    ctx.fillStyle = flash ? '#ffffff' : '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, -44, 34, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dummy Target Bullseye on chest
    ctx.strokeStyle = flash ? '#ff595e' : '#f43f5e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -34, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath(); ctx.arc(0, -34, 5, 0, Math.PI * 2); ctx.fill();

    // Cute X eyes when hit, O O when idle
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    if (hit) {
      ctx.beginPath();
      ctx.moveTo(-16, -64); ctx.lineTo(-8, -56); ctx.moveTo(-8, -64); ctx.lineTo(-16, -56);
      ctx.moveTo(8, -64); ctx.lineTo(16, -56); ctx.moveTo(16, -64); ctx.lineTo(8, -56);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(-12, -60, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(12, -60, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Label
    ctx.fillStyle = 'rgba(15,23,42,0.8)';
    ctx.fillRect(-34, -104, 68, 16);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bia Lĩnh Chiêu', 0, -92);

    ctx.restore();

    // Floating Damage / Status Popup calculated from real ATK vs SP.ATK stats!
    if (hit) {
      ctx.save();
      const popY = ty - 115 - (this.frame % 6) * 4;
      ctx.font = '900 19px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 4.5;
      let text = '-ATK!';
      let col = '#c084fc';
      if (move.power > 0) {
        const stat = move.damageClass === 'SP_ATK' ? (this.def.stats.spAtk || 60) : (this.def.stats.atk || 60);
        const dmg = Math.round((move.power * stat) / 65);
        text = move.damageClass === 'SP_ATK' ? `-${dmg} (SP.ATK)` : `-${dmg} (ATK)`;
        col = move.damageClass === 'SP_ATK' ? '#38bdf8' : '#ff6b6b';
      } else if (move.vfx === 'toxic_cloud') {
        text = 'TRÚNG ĐỘC!';
      }
      ctx.strokeText(text, tx, popY);
      ctx.fillStyle = col;
      ctx.fillText(text, tx, popY);
      ctx.restore();
    }
  }

  draw(ctx, canvasW, canvasH, facing = -1, showMesh = false) {
    if (!this.img.complete || !this.img.width) return;

    const anim = this.getAnimDef();
    const move = anim.move || null;
    const t = this.frame / 19;
    const pose = anim.sample(t);

    const skillMode = Boolean(move);
    const size = skillMode ? 245 : 325;
    const scale = size / 512;
    const casterBaseX = skillMode ? 385 : canvasW / 2;
    const casterBaseY = canvasH - 44;
    const targetX = 115;
    const targetY = canvasH - 44;

    // Screen shake on peak impact!
    const shakeX = pose.impact && move && move.power >= 70 ? (Math.random() - 0.5) * 8 : 0;
    const shakeY = pose.impact && move && move.power >= 70 ? (Math.random() - 0.5) * 8 : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Target Dummy (only in Skill Mode so user sees Melee / Ranged / Status / Summon!)
    if (skillMode) {
      this.drawTargetDummy(ctx, targetX, targetY, pose, move);
    }

    // 2. Caster Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(casterBaseX + pose.dx, casterBaseY - 4, skillMode ? 62 : 84, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Caster Soft-Mesh Sprite
    const sproutBend = pose.sproutBend !== undefined ? pose.sproutBend : 0;
    const limbSwing = pose.limbSwing || 0;

    ctx.save();
    ctx.translate(casterBaseX + pose.dx, casterBaseY + pose.dy);
    if (facing > 0) ctx.scale(-1, 1);
    ctx.scale(scale * pose.scaleX, scale * pose.scaleY);
    ctx.translate(-256, -488);
    ctx.save();
    ctx.translate(256, 488);
    ctx.rotate(pose.rot || 0);
    ctx.translate(-256, -488);

    const G = 10, S = 512, pts = [];
    for (let r = 0; r <= G; r++) {
      const row = [], v = r / G;
      for (let c = 0; c <= G; c++) {
        const u = c / G;
        let x = u * S, y = v * S;
        if (v < 0.34) {
          const w = Math.pow(1 - v / 0.34, 1.8);
          x += sproutBend * w;
          y += Math.abs(sproutBend) * 0.12 * w;
        }
        const sideDist = Math.abs(u - 0.5);
        if (sideDist > 0.24 && v > 0.42 && v < 0.82) {
          const w = Math.min(1, (sideDist - 0.24) / 0.22);
          y += limbSwing * w * (u < 0.5 ? -1 : 1) * 0.6;
        }
        row.push({ x, y, u: u * S, v: v * S });
      }
      pts.push(row);
    }

    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        const p00 = pts[r][c], p10 = pts[r][c + 1], p01 = pts[r + 1][c], p11 = pts[r + 1][c + 1];
        drawTexturedTriangle(ctx, this.img, p00.x, p00.y, p10.x, p10.y, p11.x, p11.y, p00.u, p00.v, p10.u, p10.v, p11.u, p11.v);
        drawTexturedTriangle(ctx, this.img, p00.x, p00.y, p11.x, p11.y, p01.x, p01.y, p00.u, p00.v, p11.u, p11.v, p01.u, p01.v);
      }
    }

    if (showMesh) this.drawMeshAndBones(ctx, pts, G, sproutBend);
    ctx.restore();
    ctx.restore();

    // 4. High-Impact Stage VFX (positioned relative to Caster & Target Dummy!)
    if (skillMode) {
      this.drawStageVfx(ctx, move, pose, t, casterBaseX + pose.dx, casterBaseY - 110, targetX, targetY - 50);
    }

    ctx.restore();
  }

  drawCelStarburst(ctx, x, y, r, spikes, fill, stroke = '#1e1b18') {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? r : r * 0.48;
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  }

  drawStageVfx(ctx, move, pose, t, cx, cy, tx, ty) {
    const p = pose.vfxPower || 0;
    if (p <= 0.02) return;
    ctx.save();

    const vfx = move.vfx;
    if (vfx === 'impact_ring') {
      // Cel-shaded anime starburst impact + crisp shockwave
      this.drawCelStarburst(ctx, tx + 10, ty, 52 * p, 9, '#fef08a', '#451a03');
      this.drawCelStarburst(ctx, tx + 10, ty, 28 * p, 7, '#ffffff', '#b45309');
    } else if (vfx === 'claw_slash' || vfx === 'leaf_slash') {
      const isLeaf = vfx === 'leaf_slash';
      const fill = isLeaf ? '#4ade80' : '#fde047';
      const stroke = isLeaf ? '#064e3b' : '#451a03';
      // Crisp cel-shaded crescent slashes with dark outlines
      for (let s = -1; s <= 1; s += 2) {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(s * 0.72);
        ctx.beginPath();
        ctx.moveTo(-64 * p, 0);
        ctx.quadraticCurveTo(0, -24 * p, 64 * p, 0);
        ctx.quadraticCurveTo(0, 6 * p, -64 * p, 0);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = stroke;
        ctx.stroke();
        ctx.restore();
      }
    } else if (vfx === 'roar_waves') {
      for (let i = 0; i < 3; i++) {
        const prog = ((t * 2.5 + i * 0.33) % 1);
        const rx = cx - (cx - tx) * prog;
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(rx, ty, 22 + prog * 45, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke();
        ctx.strokeStyle = `rgba(253, 224, 71, ${(1 - prog) * p})`;
        ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.arc(rx, ty, 22 + prog * 45, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke();
      }
    } else if (vfx === 'toxic_cloud') {
      for (let i = 0; i < 6; i++) {
        const ox = tx + Math.sin(i * 1.7 + t * 8) * 38;
        const oy = ty - 15 - ((t * 70 + i * 18) % 65);
        const rad = 14 + (i % 3) * 5;
        ctx.fillStyle = '#a855f7';
        ctx.strokeStyle = '#3b0764';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ox, oy, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e9d5ff';
        ctx.beginPath(); ctx.arc(ox - rad * 0.3, oy - rad * 0.3, rad * 0.25, 0, Math.PI * 2); ctx.fill();
      }
    } else if (vfx === 'heal_aura') {
      for (let i = 0; i < 6; i++) {
        const ox = cx + Math.sin(i * 1.9 + t * 6) * 52;
        const oy = cy + 60 - ((t * 110 + i * 22) % 130);
        ctx.fillStyle = '#4ade80';
        ctx.strokeStyle = '#064e3b';
        ctx.lineWidth = 2.5;
        ctx.fillRect(ox - 3, oy - 8, 6, 16); ctx.strokeRect(ox - 3, oy - 8, 6, 16);
        ctx.fillRect(ox - 8, oy - 3, 16, 6);
      }
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 4;
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('+50% HP!', cx, cy - 115);
      ctx.fillText('+50% HP!', cx, cy - 115);
    } else if (vfx === 'seed_beam') {
      const pt = pose.projT !== undefined ? pose.projT : t;
      const bx = cx - 40 - (cx - 40 - tx) * pt;
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.ellipse(bx, ty, 22, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.ellipse(bx - 4, ty - 2, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
      if (pt > 0.82) this.drawCelStarburst(ctx, tx, ty, 52 * p, 8, '#bbf7d0', '#064e3b');
    } else if (vfx === 'solar_laser') {
      const h = 36 * p;
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 4;
      ctx.fillRect(tx - 18, ty - h / 2, (cx - 35) - (tx - 18), h);
      ctx.strokeRect(tx - 18, ty - h / 2, (cx - 35) - (tx - 18), h);
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(tx - 14, ty - h * 0.22, (cx - 35) - (tx - 14), h * 0.44);
      this.drawCelStarburst(ctx, tx, ty, 62 * p, 10, '#fde047', '#713f12');
    } else if (vfx === 'golden_grain_storm') {
      this.drawCelStarburst(ctx, tx, ty, 58 * p, 10, 'rgba(254, 240, 138, 0.75)', '#854d0e');
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + t * Math.PI * 6;
        const rx = tx + Math.cos(a) * (76 * p);
        const ry = ty + Math.sin(a) * (36 * p);
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#4ade80';
        ctx.strokeStyle = i % 2 === 0 ? '#78350f' : '#064e3b';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    } else if (vfx === 'harvest_nova') {
      const pW = 80 * p;
      ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.fillRect(tx - pW / 2, 0, pW, ty + 32);
      ctx.strokeRect(tx - pW / 2, 0, pW, ty + 32);
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(tx - pW * 0.24, 0, pW * 0.48, ty + 32);
      this.drawCelStarburst(ctx, tx, ty + 10, 74 * p, 12, '#fde047', '#78350f');
    } else if (vfx === 'flame_charge') {
      this.drawCelStarburst(ctx, tx + 8, ty, 58 * p, 10, '#fb923c', '#7c2d12');
      this.drawCelStarburst(ctx, tx + 8, ty, 32 * p, 7, '#fef08a', '#c2410c');
    } else if (vfx === 'fire_orb') {
      const pt = pose.projT !== undefined ? pose.projT : t;
      const bx = cx - 40 - (cx - 40 - tx) * pt;
      ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(bx, ty, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(bx - 3, ty - 3, 9, 0, Math.PI * 2); ctx.fill();
      if (pt > 0.82) this.drawCelStarburst(ctx, tx, ty, 60 * p, 10, '#fb923c', '#7c2d12');
    } else if (vfx === 'drill_pierce') {
      for (let s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.translate(tx, ty + s * 14);
        ctx.fillStyle = '#fdba74'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(45 * p, -12); ctx.lineTo(-48 * p, 0); ctx.lineTo(45 * p, 12); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    } else if (vfx === 'inferno_pillar') {
      const pW = 86 * p;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.88)'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 4;
      ctx.fillRect(tx - pW / 2, 0, pW, ty + 32); ctx.strokeRect(tx - pW / 2, 0, pW, ty + 32);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(tx - pW * 0.25, 0, pW * 0.5, ty + 32);
      this.drawCelStarburst(ctx, tx, ty + 10, 78 * p, 12, '#fb923c', '#7c2d12');
    } else if (vfx === 'water_wave') {
      const pt = pose.projT !== undefined ? pose.projT : t;
      const bx = cx - 40 - (cx - 40 - tx) * pt;
      ctx.fillStyle = '#38bdf8'; ctx.strokeStyle = '#0c4a6e'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(bx, ty, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath(); ctx.arc(bx - 4, ty - 4, 8, 0, Math.PI * 2); ctx.fill();
      if (pt > 0.8 || pose.projT === undefined) this.drawCelStarburst(ctx, tx, ty, 58 * p, 9, '#7dd3fc', '#0c4a6e');
    } else if (vfx === 'earth_quake') {
      this.drawCelStarburst(ctx, tx, ty + 14, 62 * p, 8, '#d97706', '#451a03');
      this.drawCelStarburst(ctx, tx, ty + 14, 34 * p, 6, '#fde68a', '#78350f');
    } else if (vfx === 'hydro_beam') {
      const h = 34 * p;
      ctx.fillStyle = '#0284c7'; ctx.strokeStyle = '#082f49'; ctx.lineWidth = 4;
      ctx.fillRect(tx - 18, ty - h / 2, (cx - 35) - (tx - 18), h);
      ctx.strokeRect(tx - 18, ty - h / 2, (cx - 35) - (tx - 18), h);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(tx - 14, ty - h * 0.22, (cx - 35) - (tx - 14), h * 0.44);
      this.drawCelStarburst(ctx, tx, ty, 64 * p, 10, '#7dd3fc', '#0c4a6e');
    } else if (vfx === 'tsunami_pillar') {
      const pW = 86 * p;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.88)'; ctx.strokeStyle = '#082f49'; ctx.lineWidth = 4;
      ctx.fillRect(tx - pW / 2, 0, pW, ty + 32); ctx.strokeRect(tx - pW / 2, 0, pW, ty + 32);
      ctx.fillStyle = '#e0f2fe'; ctx.fillRect(tx - pW * 0.25, 0, pW * 0.5, ty + 32);
      this.drawCelStarburst(ctx, tx, ty + 10, 78 * p, 12, '#38bdf8', '#082f49');
    }
    ctx.restore();
  }

  drawMeshAndBones(ctx, pts, G, sproutBend) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        const p00 = pts[r][c], p10 = pts[r][c + 1], p01 = pts[r + 1][c];
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y); ctx.lineTo(p10.x, p10.y);
        ctx.moveTo(p00.x, p00.y); ctx.lineTo(p01.x, p01.y);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#38bdf8'; ctx.fillStyle = '#fde047'; ctx.lineWidth = 3;
    const chain = [[256, 465], [256, 310], [256, 175], [256 + sproutBend * 0.85, 72]];
    ctx.beginPath(); chain.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))); ctx.stroke();
    for (const [x, y] of chain) { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  export20FrameSheet() {
    const cols = 5, rows = 4, cell = 256;
    const out = document.createElement('canvas');
    out.width = cols * cell; out.height = rows * cell;
    const octx = out.getContext('2d');
    const prevFrame = this.frame;
    for (let f = 0; f < 20; f++) {
      this.frame = f;
      const col = f % cols, row = Math.floor(f / cols);
      octx.save();
      octx.translate(col * cell, row * cell);
      this.draw(octx, cell, cell, -1, false);
      octx.restore();
    }
    this.frame = prevFrame;
    return out.toDataURL('image/png');
  }
}
