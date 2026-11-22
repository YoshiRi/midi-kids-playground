/**
 * ミニゲーム1: はなび＆どうぶつパーティー (2〜5さい向け)
 * UIルール準拠: Canvasをステージ100%全面表示し、HUDとモード選択はフローティング配置
 */

const ANIMALS = ['🐶', '🐱', '🐰', '🐻', '🐼', '🦁', '🐸', '🐥', '🦄', '🦖', '🦋', '🐳'];

const MODES = [
  { id: 'party', icon: '🎆', label: 'はなび＆どうぶつ' },
  { id: 'animals', icon: '🐾', label: 'どうぶついっぱい' },
  { id: 'bubbles', icon: '🫧', label: 'シャボンだま' },
];

export const fireworksPartyGame = {
  id: 'fireworks-party',
  title: 'はなび＆どうぶつ',
  subtitle: 'どの けんばんでも たのしく とびだすよ！',
  ageLabel: '2〜5さい',
  icon: '🎆',
  accentColor: '#ff595e',

  mount(ctx) {
    let mode = 'party';
    let noteCount = 0;
    let recentTimestamps = [];

    ctx.container.innerHTML = `
      <div class="game-stage-root game-fireworks">
        <canvas class="stage-canvas"></canvas>

        <div class="stage-hud-top">
          <div class="hud-group">
            <span class="hud-chip">🎵 <span class="js-count">0</span></span>
          </div>
          <div class="hud-group hud-popover-anchor">
            <button type="button" class="hud-chip hud-chip-btn js-opt-toggle" aria-expanded="false">
              <span class="js-mode-label">🎆 はなび＆どうぶつ</span> ▾
            </button>
            <div class="stage-popover is-hidden js-opt-popover" role="dialog" aria-label="あそびモード">
              <div class="popover-title">あそびモード</div>
              <div class="popover-list">
                ${MODES.map(
                  (m) => `
                    <button type="button" class="popover-item ${m.id === mode ? 'is-active' : ''}" data-mode="${m.id}">
                      <span>${m.icon} ${m.label}</span>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="stage-overlay-hint js-empty-hint">
          <div class="hint-big">🎹 けんばんを おしてみよう！</div>
          <div class="hint-sub">つよく おすと おおきく とびだすよ✨</div>
        </div>
      </div>
    `;

    const root = ctx.container.querySelector('.game-stage-root');
    const canvas = ctx.container.querySelector('.stage-canvas');
    const c = canvas.getContext('2d');
    const countEl = ctx.container.querySelector('.js-count');
    const emptyHint = ctx.container.querySelector('.js-empty-hint');
    const optToggle = ctx.container.querySelector('.js-opt-toggle');
    const optPopover = ctx.container.querySelector('.js-opt-popover');
    const modeLabelEl = ctx.container.querySelector('.js-mode-label');
    const modeButtons = ctx.container.querySelectorAll('[data-mode]');

    const closePopover = () => {
      optPopover.classList.add('is-hidden');
      optToggle.setAttribute('aria-expanded', 'false');
    };

    optToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = optPopover.classList.contains('is-hidden');
      optPopover.classList.toggle('is-hidden', !willOpen);
      optToggle.setAttribute('aria-expanded', String(willOpen));
    });

    const onDocClick = (e) => {
      if (!optPopover.contains(e.target) && e.target !== optToggle) {
        closePopover();
      }
    };
    document.addEventListener('click', onDocClick);

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        const found = MODES.find((m) => m.id === mode) || MODES[0];
        modeLabelEl.textContent = `${found.icon} ${found.label}`;
        modeButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
        closePopover();
      });
    });

    // 背景の星
    const bgStars = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.88,
      r: 1 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 2.2,
    }));

    const particles = [];
    const critters = [];
    const rings = [];
    const bubbles = [];
    const labels = [];

    let width = 800;
    let height = 400;
    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(300, rect.width);
      height = Math.max(180, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const spawnFirework = (x, y, color, colorLight, power) => {
      const count = Math.round(22 + power * 24);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
        const speed = (1.6 + Math.random() * 3.8) * (0.7 + power * 0.7);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          size: 3 + Math.random() * 4.5,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? color : colorLight,
          alpha: 1,
          decay: 0.014 + Math.random() * 0.012,
          star: i % 4 === 0,
        });
      }
      rings.push({
        x,
        y,
        r: 8,
        maxR: 60 + power * 55,
        color,
        alpha: 0.9,
      });
    };

    const spawnCritter = (x, noteInfo, power, count = 1) => {
      for (let i = 0; i < count; i++) {
        const emoji = ANIMALS[(noteInfo.pitchClass + i * 3) % ANIMALS.length];
        critters.push({
          x: x + (Math.random() - 0.5) * 32,
          y: height - 12,
          vx: (Math.random() - 0.5) * 3.2,
          vy: -(6.8 + power * 4.6 + Math.random() * 2.2),
          gravity: 0.22,
          rot: (Math.random() - 0.5) * 0.3,
          vrot: (Math.random() - 0.5) * 0.08,
          size: 36 + power * 22,
          emoji,
          alpha: 1,
          life: 0,
          maxLife: 95 + Math.random() * 35,
        });
      }
    };

    const spawnBubbles = (x, noteInfo, power) => {
      const n = Math.round(3 + power * 5);
      for (let i = 0; i < n; i++) {
        bubbles.push({
          x: x + (Math.random() - 0.5) * 44,
          y: height - 10,
          vx: (Math.random() - 0.5) * 1.1,
          vy: -(1.6 + Math.random() * 2.2 + power * 1.4),
          wobblePhase: Math.random() * Math.PI * 2,
          r: 14 + Math.random() * 20 + power * 12,
          color: noteInfo.color,
          solfege: i === 0 ? noteInfo.solfege : '',
          alpha: 0.95,
        });
      }
    };

    const spawnRainbowBurst = () => {
      const cx = width * (0.25 + Math.random() * 0.5);
      const cy = height * (0.28 + Math.random() * 0.25);
      const rainbow = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff66b3'];
      rainbow.forEach((col, idx) => {
        rings.push({
          x: cx,
          y: cy,
          r: 10 + idx * 8,
          maxR: 130 + idx * 14,
          color: col,
          alpha: 0.85,
        });
      });
      labels.push({
        x: cx,
        y: cy,
        vy: -1.1,
        text: '🌈 にじいろ！',
        color: '#ffde7d',
        size: 30,
        alpha: 1,
      });
    };

    let rafId = 0;
    let time = 0;

    const drawStar = (cx, cy, r, color, alpha) => {
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.fill();
      c.restore();
    };

    const tick = () => {
      time += 0.016;

      const grad = c.createLinearGradient(0, 0, 0, height);
      if (mode === 'bubbles') {
        grad.addColorStop(0, '#143266');
        grad.addColorStop(1, '#1e5b88');
      } else {
        grad.addColorStop(0, '#121436');
        grad.addColorStop(1, '#271e5c');
      }
      c.fillStyle = grad;
      c.fillRect(0, 0, width, height);

      for (const s of bgStars) {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
        c.fillStyle = `rgba(255, 250, 220, ${a.toFixed(2)})`;
        c.beginPath();
        c.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        c.fill();
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += (ring.maxR - ring.r) * 0.1 + 1.5;
        ring.alpha -= 0.024;
        if (ring.alpha <= 0) {
          rings.splice(i, 1);
          continue;
        }
        c.save();
        c.globalAlpha = ring.alpha;
        c.strokeStyle = ring.color;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.wobblePhase += 0.07;
        b.x += b.vx + Math.sin(b.wobblePhase) * 0.7;
        b.y += b.vy;
        if (b.y < -b.r * 2) {
          bubbles.splice(i, 1);
          continue;
        }
        c.save();
        c.globalAlpha = b.alpha;
        const g = c.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 2, b.x, b.y, b.r);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(0.5, `${b.color}55`);
        g.addColorStop(1, `${b.color}cc`);
        c.fillStyle = g;
        c.beginPath();
        c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.75)';
        c.lineWidth = 2;
        c.stroke();

        if (b.solfege) {
          c.fillStyle = '#ffffff';
          c.font = `700 ${Math.round(b.r * 0.65)}px "Hiragino Maru Gothic ProN", sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(b.solfege, b.x, b.y + 1);
        }
        c.restore();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.055;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        if (p.star) {
          drawStar(p.x, p.y, p.size * 1.4, p.color, p.alpha);
        } else {
          c.save();
          c.globalAlpha = p.alpha;
          c.fillStyle = p.color;
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }

      for (let i = critters.length - 1; i >= 0; i--) {
        const cr = critters[i];
        cr.life++;
        cr.x += cr.vx;
        cr.y += cr.vy;
        cr.vy += cr.gravity;
        cr.rot += cr.vrot;
        if (cr.y > height + 50 || cr.life > cr.maxLife) {
          cr.alpha -= 0.06;
        }
        if (cr.alpha <= 0) {
          critters.splice(i, 1);
          continue;
        }
        c.save();
        c.globalAlpha = Math.max(0, cr.alpha);
        c.translate(cr.x, cr.y);
        c.rotate(cr.rot);
        c.font = `${Math.round(cr.size)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(cr.emoji, 0, 0);
        c.restore();
      }

      for (let i = labels.length - 1; i >= 0; i--) {
        const lb = labels[i];
        lb.y += lb.vy;
        lb.alpha -= 0.018;
        if (lb.alpha <= 0) {
          labels.splice(i, 1);
          continue;
        }
        c.save();
        c.globalAlpha = lb.alpha;
        c.font = `800 ${lb.size}px "Hiragino Maru Gothic ProN", "Rounded Mplus 1c", sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.lineWidth = 5;
        c.strokeStyle = 'rgba(18, 20, 54, 0.85)';
        c.strokeText(lb.text, lb.x, lb.y);
        c.fillStyle = lb.color;
        c.fillText(lb.text, lb.x, lb.y);
        c.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    ctx.setHintKeys([]);

    return {
      onNoteOn(noteInfo) {
        noteCount++;
        countEl.textContent = String(noteCount);
        if (emptyHint) emptyHint.classList.add('is-hidden');

        let normX = ctx.keyboard.getKeyNormalizedX(noteInfo.midi);
        if (normX <= 0.02 || normX >= 0.98) {
          normX = 0.1 + ((noteInfo.midi - 36) / 48) * 0.8;
        }
        normX = Math.max(0.08, Math.min(0.92, normX));

        const x = normX * width;
        const y = height * (0.2 + ((12 - noteInfo.pitchClass) / 14) * 0.45);
        const power = Math.max(0.3, Math.min(1, noteInfo.velocity || 0.8));

        if (mode === 'party') {
          spawnFirework(x, y, noteInfo.color, noteInfo.colorLight, power);
          spawnCritter(x, noteInfo, power, 1);
        } else if (mode === 'animals') {
          spawnCritter(x, noteInfo, power, 2);
          rings.push({ x, y: height - 24, r: 8, maxR: 55, color: noteInfo.color, alpha: 0.85 });
        } else if (mode === 'bubbles') {
          spawnBubbles(x, noteInfo, power);
        }

        labels.push({
          x,
          y: Math.min(height - 46, y + 18),
          vy: -1.35,
          text: `${noteInfo.solfege}！`,
          color: noteInfo.colorLight,
          size: Math.round(24 + power * 10),
          alpha: 1,
        });

        const now = performance.now();
        recentTimestamps = recentTimestamps.filter((t) => now - t < 240);
        recentTimestamps.push(now);
        if (recentTimestamps.length >= 3) {
          recentTimestamps = [];
          spawnRainbowBurst();
        }
      },

      onNoteOff() {},

      unmount() {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        document.removeEventListener('click', onDocClick);
        ctx.setHintKeys([]);
      },
    };
  },
};
