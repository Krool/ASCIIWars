import { Scene, SceneManager } from '../scenes/Scene';
import { UIAssets } from '../rendering/UIAssets';
import { SpriteLoader, drawSpriteFrame } from '../rendering/SpriteLoader';
import { Race } from '../simulation/types';
import { RACE_COLORS } from '../simulation/data';
import {
  PlayerProfile, loadProfile, saveProfile,
  ACHIEVEMENTS, ALL_AVATARS,
  isAvatarUnlocked, getWinRate, formatTime,
} from './ProfileData';

const ALL_RACES: Race[] = [
  Race.Crown, Race.Horde, Race.Goblins, Race.Oozlings, Race.Demon,
  Race.Deep, Race.Wild, Race.Geists, Race.Tenders,
];
const RACE_LABELS: Record<Race, string> = {
  [Race.Crown]: 'Crown', [Race.Horde]: 'Horde', [Race.Goblins]: 'Goblins',
  [Race.Oozlings]: 'Oozlings', [Race.Demon]: 'Demon', [Race.Deep]: 'Deep',
  [Race.Wild]: 'Wild', [Race.Geists]: 'Geists', [Race.Tenders]: 'Tenders',
};

type Tab = 'stats' | 'achievements' | 'avatars';

export class ProfileScene implements Scene {
  private manager: SceneManager;
  private canvas: HTMLCanvasElement;
  private ui: UIAssets;
  private sprites: SpriteLoader;
  private profile!: PlayerProfile;
  private tab: Tab = 'stats';
  private scrollY = 0;
  private animTime = 0;

  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private touchHandler: ((e: TouchEvent) => void) | null = null;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(manager: SceneManager, canvas: HTMLCanvasElement, ui: UIAssets, sprites: SpriteLoader) {
    this.manager = manager;
    this.canvas = canvas;
    this.ui = ui;
    this.sprites = sprites;
  }

  enter(): void {
    this.profile = loadProfile();
    this.scrollY = 0;
    this.tab = 'stats';

    this.clickHandler = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.handleClick(e.clientX - rect.left, e.clientY - rect.top);
    };
    this.touchHandler = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0] ?? e.changedTouches[0];
      if (!t) return;
      const rect = this.canvas.getBoundingClientRect();
      this.handleClick(t.clientX - rect.left, t.clientY - rect.top);
    };
    this.wheelHandler = (e: WheelEvent) => { this.scrollY = Math.max(0, this.scrollY + e.deltaY * 0.5); };
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.manager.switchTo('title');
    };

    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('touchstart', this.touchHandler, { passive: false });
    this.canvas.addEventListener('wheel', this.wheelHandler, { passive: true });
    window.addEventListener('keydown', this.keyHandler);
  }

  exit(): void {
    if (this.clickHandler) this.canvas.removeEventListener('click', this.clickHandler);
    if (this.touchHandler) this.canvas.removeEventListener('touchstart', this.touchHandler);
    if (this.wheelHandler) this.canvas.removeEventListener('wheel', this.wheelHandler);
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.clickHandler = null; this.touchHandler = null; this.wheelHandler = null; this.keyHandler = null;
  }

  update(dt: number): void { this.animTime += dt; }

  // ─── Simple panel background (dark rounded rect) ───

  private drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = 'rgba(40, 30, 25, 0.75)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.stroke();
  }

  // ─── Layout ───

  private getLayout() {
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    const headerH = 180;
    const tabBarY = 84;
    const tabH = 60;
    return { W, H, headerH, tabBarY, tabH };
  }

  // ─── Click handling ───

  private handleClick(cx: number, cy: number): void {
    const { W, tabBarY, tabH, headerH } = this.getLayout();

    // Back button (top-left)
    if (cy < 72 && cx < 80) {
      this.manager.switchTo('title');
      return;
    }

    // Tab bar
    if (cy >= tabBarY && cy <= tabBarY + tabH) {
      const tabs: Tab[] = ['stats', 'achievements', 'avatars'];
      const gap = 12;
      const tabW = Math.min(200, (W - 160 - gap * 2) / 3);
      const totalW = tabW * 3 + gap * 2;
      const startX = (W - totalW) / 2;
      for (let i = 0; i < tabs.length; i++) {
        const tx = startX + i * (tabW + gap);
        if (cx >= tx && cx <= tx + tabW) {
          this.tab = tabs[i];
          this.scrollY = 0;
          return;
        }
      }
    }

    // Avatar selection
    if (this.tab === 'avatars' && cy > headerH) {
      this.handleAvatarClick(cx, cy);
    }
  }

  private handleAvatarClick(cx: number, cy: number): void {
    const { W, headerH } = this.getLayout();
    const pad = 28;
    const cols = Math.max(3, Math.floor((W - pad * 2 - 40) / 160));
    const cellSize = Math.floor((W - pad * 2 - 40) / cols);
    const startX = pad + 20;
    const startY = headerH + 28 - this.scrollY;

    for (let i = 0; i < ALL_AVATARS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ax = startX + col * cellSize;
      const ay = startY + row * cellSize;

      if (cx >= ax && cx < ax + cellSize && cy >= ay && cy < ay + cellSize) {
        const avatar = ALL_AVATARS[i];
        if (isAvatarUnlocked(this.profile, avatar)) {
          this.profile.avatarId = avatar.id;
          saveProfile(this.profile);
        }
        return;
      }
    }
  }

  // ─── Main Render ───

  render(ctx: CanvasRenderingContext2D): void {
    const { W, H, headerH, tabBarY, tabH } = this.getLayout();

    // Water background
    if (!this.ui.drawWaterBg(ctx, W, H, this.animTime * 0.001)) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, H);
    }

    // Content area (clipped, scrollable)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, headerH, W, H - headerH);
    ctx.clip();

    if (this.tab === 'stats') this.renderStats(ctx, W, H, headerH);
    else if (this.tab === 'achievements') this.renderAchievements(ctx, W, H, headerH);
    else if (this.tab === 'avatars') this.renderAvatars(ctx, W, H, headerH);

    ctx.restore();

    // ─── Fixed header ───
    // Dark overlay for header area
    ctx.fillStyle = 'rgba(10,10,20,0.85)';
    ctx.fillRect(0, 0, W, headerH);

    // Title ribbon
    const ribbonW = Math.min(W * 0.5, 560);
    const ribbonH = 64;
    const ribbonX = (W - ribbonW) / 2;
    const ribbonY = 8;
    this.ui.drawBigRibbon(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 2); // yellow ribbon
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('PROFILE', W / 2, ribbonY + ribbonH / 2);

    // Back button — small blue round
    const backSize = 64;
    this.ui.drawSmallBlueRoundButton(ctx, 8, 6, backSize);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('<', 8 + backSize / 2, 6 + backSize / 2);

    // Tab bar — blue buttons
    const tabs: { key: Tab; label: string }[] = [
      { key: 'stats', label: 'STATS' },
      { key: 'achievements', label: 'ACHIEVE' },
      { key: 'avatars', label: 'AVATARS' },
    ];
    const gap = 12;
    const tabW = Math.min(200, (W - 160 - gap * 2) / 3);
    const totalW = tabW * 3 + gap * 2;
    const startX = (W - totalW) / 2;
    for (let i = 0; i < tabs.length; i++) {
      const tx = startX + i * (tabW + gap);
      const active = this.tab === tabs[i].key;
      this.ui.drawBigBlueButton(ctx, tx, tabBarY, tabW, tabH, active);
      ctx.fillStyle = active ? '#fff' : '#a0c4e8';
      ctx.font = `bold ${tabW < 160 ? 20 : 22}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tabs[i].label, tx + tabW / 2, tabBarY + tabH / 2);
    }

    // Summary line under tabs
    ctx.fillStyle = '#aaa';
    ctx.font = '22px monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    const wr = getWinRate(this.profile.wins, this.profile.gamesPlayed);
    ctx.fillText(
      `${this.profile.gamesPlayed} games  |  ${this.profile.wins}W ${this.profile.losses}L  |  ${wr}`,
      W / 2, headerH - 12,
    );
  }

  // ─── Stats Tab ───

  private renderStats(ctx: CanvasRenderingContext2D, W: number, _H: number, headerH: number): void {
    let y = headerH + 20 - this.scrollY;
    const pad = 28;
    const panelW = W - pad * 2;

    // ── Overview panel ──
    const overH = 200;
    this.drawPanel(ctx, pad, y, panelW, overH);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const inset = 44; // content inset from pad edge
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#ffd740';
    ctx.fillText('Overview', pad + inset, y + 44);

    ctx.font = '24px monospace'; ctx.fillStyle = '#e0e0e0';
    const c1 = pad + inset;
    const c2 = pad + panelW / 2;
    ctx.fillText(`Games: ${this.profile.gamesPlayed}`, c1, y + 84);
    ctx.fillText(`Wins: ${this.profile.wins}`, c2, y + 84);
    ctx.fillText(`Losses: ${this.profile.losses}`, c1, y + 120);
    ctx.fillText(`Win Rate: ${getWinRate(this.profile.wins, this.profile.gamesPlayed)}`, c2, y + 120);
    ctx.fillText(`Play Time: ${formatTime(this.profile.totalPlayTimeSec)}`, c1, y + 156);
    ctx.fillText(`Best Streak: ${this.profile.bestWinStreak}`, c2, y + 156);
    y += overH + 24;

    // ── Race stats panel ──
    const rowH = 44;
    const raceH = 72 + ALL_RACES.length * rowH + 28;
    this.drawPanel(ctx, pad, y, panelW, raceH);

    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#ffd740';
    ctx.textAlign = 'left';
    ctx.fillText('Race Stats', pad + inset, y + 40);
    y += 60;

    // Column headers
    ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#999';
    const rCols = [pad + inset, pad + 200, pad + 330, pad + 460];
    ctx.fillText('RACE', rCols[0], y);
    ctx.fillText('GAMES', rCols[1], y);
    ctx.fillText('WIN%', rCols[2], y);
    ctx.fillText('TIME', rCols[3], y);
    y += 12;

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad + 40, y);
    ctx.lineTo(pad + panelW - 20, y);
    ctx.stroke();

    ctx.font = '22px monospace';
    for (const race of ALL_RACES) {
      y += rowH;
      const rs = this.profile.raceStats[race];
      const rc = RACE_COLORS[race];

      // Alternating row bg
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      if (ALL_RACES.indexOf(race) % 2 === 0) {
        ctx.fillRect(pad + 28, y - rowH + 12, panelW - 36, rowH);
      }

      ctx.fillStyle = rc.primary;
      ctx.fillText(RACE_LABELS[race], rCols[0], y);
      ctx.fillStyle = '#ccc';
      ctx.fillText(`${rs?.gamesPlayed ?? 0}`, rCols[1], y);
      ctx.fillText(getWinRate(rs?.wins ?? 0, rs?.gamesPlayed ?? 0), rCols[2], y);
      ctx.fillText(formatTime(rs?.playTimeSec ?? 0), rCols[3], y);
    }
  }

  // ─── Achievements Tab ───

  private renderAchievements(ctx: CanvasRenderingContext2D, W: number, _H: number, headerH: number): void {
    let y = headerH + 20 - this.scrollY;
    const pad = 28;
    const panelW = W - pad * 2;
    const cardH = 124;
    const cardGap = 16;

    const totalCardsH = ACHIEVEMENTS.length * (cardH + cardGap) + 32;
    this.drawPanel(ctx, pad, y, panelW, totalCardsH);

    y += 16;

    for (const ach of ACHIEVEMENTS) {
      const state = this.profile.achievements[ach.id];
      const unlocked = state?.unlocked ?? false;
      const progress = state?.progress ?? 0;

      // Card inner background
      ctx.fillStyle = unlocked ? 'rgba(100,180,100,0.15)' : 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.roundRect(pad + 12, y, panelW - 24, cardH, 8); ctx.fill();

      // Border
      ctx.strokeStyle = unlocked ? 'rgba(129,199,132,0.4)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(pad + 12, y, panelW - 24, cardH, 8); ctx.stroke();

      // Icon area
      const iconX = pad + 24;
      const iconY = y + 12;
      const iconSz = cardH - 24;

      // Icon bg
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.roundRect(iconX, iconY, iconSz, iconSz, 8); ctx.fill();

      if (ach.avatarUnlock) {
        if (!unlocked) ctx.globalAlpha = 0.4;
        this.drawAvatarSprite(ctx, ach.avatarUnlock, iconX + 4, iconY + 4, iconSz - 8);
        if (!unlocked) ctx.globalAlpha = 1;
      }

      // Text content
      const textX = iconX + iconSz + 20;
      const textW = panelW - 24 - (textX - pad - 12) - 16;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

      // Achievement name
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = unlocked ? '#81c784' : '#e0e0e0';
      ctx.fillText(ach.name, textX, y + 36);

      // Description
      ctx.font = '20px monospace';
      ctx.fillStyle = '#999';
      ctx.fillText(ach.desc, textX, y + 64);

      // Progress bar using UIAssets bar
      const barX = textX;
      const barY = y + 80;
      const barW = textW;
      const barH = 20;
      const pct = Math.min(1, progress / ach.goal);
      if (!this.ui.drawBar(ctx, barX, barY, barW, barH, pct)) {
        // Fallback bar
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 6); ctx.fill();
        ctx.fillStyle = unlocked ? '#81c784' : '#4fc3f7';
        if (pct > 0) {
          ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(12, barW * pct), barH, 6); ctx.fill();
        }
      }

      // Progress text
      ctx.fillStyle = unlocked ? '#81c784' : '#777';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.min(progress, ach.goal)}/${ach.goal}`, pad + panelW - 28, y + 36);

      if (unlocked) {
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('✓', pad + panelW - 28, y + 104);
      }

      y += cardH + cardGap;
    }
  }

  // ─── Avatars Tab ───

  private renderAvatars(ctx: CanvasRenderingContext2D, W: number, _H: number, headerH: number): void {
    const pad = 28;
    const panelW = W - pad * 2;
    const cols = Math.max(3, Math.floor((panelW - 40) / 160));
    const cellSize = Math.floor((panelW - 40) / cols);
    const rows = Math.ceil(ALL_AVATARS.length / cols);
    const gridH = rows * cellSize + 32;
    const startX = pad + 20;
    const startY = headerH + 28 - this.scrollY;

    this.drawPanel(ctx, pad, startY - 8, panelW, gridH + 8);

    for (let i = 0; i < ALL_AVATARS.length; i++) {
      const avatar = ALL_AVATARS[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ax = startX + col * cellSize;
      const ay = startY + row * cellSize;

      const unlocked = isAvatarUnlocked(this.profile, avatar);
      const selected = this.profile.avatarId === avatar.id;

      // Cell background
      ctx.fillStyle = selected ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.roundRect(ax + 3, ay + 3, cellSize - 6, cellSize - 6, 4); ctx.fill();

      if (selected) {
        ctx.strokeStyle = '#ffd740';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(ax + 3, ay + 3, cellSize - 6, cellSize - 6, 4); ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(ax + 3, ay + 3, cellSize - 6, cellSize - 6, 4); ctx.stroke();
      }

      if (unlocked) {
        this.drawAvatarSprite(ctx, avatar.id, ax + 8, ay + 4, cellSize - 16);
      } else {
        // Locked — desaturated
        ctx.globalAlpha = 0.15;
        this.drawAvatarSprite(ctx, avatar.id, ax + 8, ay + 4, cellSize - 16);
        ctx.globalAlpha = 1;
        // Lock overlay
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.roundRect(ax + 3, ay + 3, cellSize - 6, cellSize - 6, 4); ctx.fill();
        ctx.fillStyle = '#666';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', ax + cellSize / 2, ay + cellSize / 2 - 8);
      }

      // Race + category label
      const rc = RACE_COLORS[avatar.race];
      ctx.font = '14px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = unlocked ? (rc?.primary ?? '#aaa') : '#444';
      const catLabel = avatar.category === 'melee' ? 'M' : avatar.category === 'ranged' ? 'R' : 'C';
      ctx.fillText(`${RACE_LABELS[avatar.race]} ${catLabel}`, ax + cellSize / 2, ay + cellSize - 14);
    }
  }

  // ─── Draw avatar sprite from ID ───

  private drawAvatarSprite(ctx: CanvasRenderingContext2D, avatarId: string, x: number, y: number, size: number): void {
    const parts = avatarId.split(':');
    const raceStr = parts[0] as Race;
    const cat = parts[1] as 'melee' | 'ranged' | 'caster';
    const upgradeNode = parts[2] as string | undefined;
    const sprData = this.sprites.getUnitSprite(raceStr, cat, 0, false, upgradeNode);
    if (sprData) {
      const [img, def] = sprData;
      const tick = Math.floor(this.animTime / 50);
      const ticksPerFrame = Math.max(1, Math.round(20 / def.cols));
      const frame = Math.floor(tick / ticksPerFrame) % def.cols;
      const aspect = def.frameW / def.frameH;
      const drawH = size;
      const drawW = drawH * aspect;
      const drawX = x + (size - drawW) / 2;
      const gY = def.groundY ?? 0.71;
      const feetY = y + size * 0.85;
      const drawY = feetY - drawH * gY;
      drawSpriteFrame(ctx, img, def, frame, drawX, drawY, drawW, drawH);
    } else {
      const rc = RACE_COLORS[raceStr as Race];
      if (rc) {
        ctx.fillStyle = rc.primary;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
