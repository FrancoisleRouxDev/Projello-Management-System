import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./SplashPage.css";
import Logo from "../../assets/Frame 106.svg";

const W = 680;
const H = 680;
const CX = W / 2;
const CY = H / 2 - 40;
const BEAR_SIZE = 340;
const GRID = 10;
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%@!?*+=<>{}[]|~^&";

const BRAND_GOLD = { r: 200, g: 168, b: 75 };
const BRAND_OLIVE = { r: 160, g: 140, b: 55 };
const BRAND_CREAM = { r: 230, g: 215, b: 155 };

const TOTAL_MS = 10000;
const EXPAND_MS = 1500;
const SETTLE_MS = 1000;
const FULL_DOT_R = GRID * 0.72;

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function inBear(px: number, py: number) {
  const s = BEAR_SIZE / 300;
  function ell(ox: number, oy: number, rw: number, rh: number) {
    const dx = (px - (CX + ox * s)) / (rw * s * 0.5);
    const dy = (py - (CY + oy * s)) / (rh * s * 0.5);
    return dx * dx + dy * dy <= 1;
  }
  return (
    ell(-88, -115, 100, 100) ||
    ell(88, -115, 100, 100) ||
    ell(0, 0, 238, 218) ||
    ell(0, 62, 148, 118)
  );
}

export default function SplashPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    canvas.width = W;
    canvas.height = H;

    const cells: Array<{
      mx: number;
      my: number;
      dist: number;
      distNorm: number;
      timeOffset: number;
      cycleDur: number;
      sizePhase: number;
      sizeSpeed: number;
      sizeMin: number;
      sizeMax: number;
      brightPhase: number;
      brightSpeed: number;
      colorBias: number;
      char: string;
      charTimer: number;
      charRate: number;
    }> = [];

    let maxDist = 0;

    for (let gy = 0; gy < H - GRID; gy += GRID) {
      for (let gx = 0; gx < W - GRID; gx += GRID) {
        const mx = gx + GRID * 0.5;
        const my = gy + GRID * 0.5;
        if (!inBear(mx, my)) continue;

        const dx = mx - CX;
        const dy = my - CY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) maxDist = dist;

        cells.push({
          mx,
          my,
          dist,
          distNorm: 0,
          timeOffset: Math.random() * 9000,
          cycleDur: 1600 + Math.random() * 2800,
          sizePhase: Math.random() * Math.PI * 2,
          sizeSpeed: 0.4 + Math.random() * 1.2,
          sizeMin: 0.3 + Math.random() * 0.25,
          sizeMax: 0.65 + Math.random() * 0.6,
          brightPhase: Math.random() * Math.PI * 2,
          brightSpeed: 0.5 + Math.random() * 1.0,
          colorBias: Math.random(),
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          charTimer: Math.random() * 20,
          charRate: 3 + Math.random() * 14,
        });
      }
    }

    for (const c of cells) {
      c.distNorm = c.dist / maxDist;
    }

    let t0: number | null = null;
    let frameId: number;
    let hasNavigated = false;

    function drawFrame(ts: number) {
      if (!t0) t0 = ts;
      const elapsed = Math.min(ts - t0, TOTAL_MS);
      const loadProg = elapsed / TOTAL_MS;
      const expandT = Math.min(1, elapsed / EXPAND_MS);
      const settleStart = TOTAL_MS - SETTLE_MS;
      const settleT =
        elapsed >= settleStart ? easeInOut(Math.min(1, (elapsed - settleStart) / SETTLE_MS)) : 0;

      if (loadProg >= 1 && !hasNavigated) {
        hasNavigated = true;
        navigate("/login");
        return;
      }

      const WAVE_SPEED = 0.0014;
      const WAVE_FREQ = 3.5;
      const waveAngle = elapsed * WAVE_SPEED;

      ctx.fillStyle = "#1a2420";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const cellReveal = Math.max(0, Math.min(1, (expandT - c.distNorm) / 0.4));
        if (cellReveal <= 0) continue;

        const localT = ((elapsed + c.timeOffset) % c.cycleDur) / c.cycleDur;
        let rawMorph;
        if (localT < 0.35) rawMorph = localT / 0.35;
        else if (localT < 0.65) rawMorph = 1;
        else rawMorph = 1 - (localT - 0.65) / 0.35;

        const morph = rawMorph * (1 - settleT);
        const waveSin = Math.sin(c.distNorm * WAVE_FREQ - waveAngle);
        const waveMul = 1 + waveSin * 0.35 * (1 - settleT);
        const sizeSin = 0.5 + 0.5 * Math.sin(elapsed * c.sizeSpeed * 0.001 + c.sizePhase);
        const baseSize = (c.sizeMin + (c.sizeMax - c.sizeMin) * sizeSin) * GRID * waveMul;
        const displayR = baseSize * 0.48 * (1 - settleT) + FULL_DOT_R * settleT;
        const r = displayR * easeOut(cellReveal);

        const brightSin = 0.5 + 0.5 * Math.sin(elapsed * c.brightSpeed * 0.001 + c.brightPhase);
        const waveAlpha = 0.7 + 0.3 * waveSin * (1 - settleT);
        const baseAlpha = (0.45 + 0.55 * brightSin) * waveAlpha;
        const alpha = (baseAlpha * (1 - settleT) + 1.0 * settleT) * cellReveal;

        const cr = BRAND_OLIVE.r + (BRAND_CREAM.r - BRAND_OLIVE.r) * c.colorBias * brightSin;
        const cg = BRAND_OLIVE.g + (BRAND_CREAM.g - BRAND_OLIVE.g) * c.colorBias * brightSin;
        const cb = BRAND_OLIVE.b + (BRAND_CREAM.b - BRAND_OLIVE.b) * c.colorBias * brightSin;
        const gr = Math.floor(cr + (BRAND_GOLD.r - cr) * settleT);
        const gg = Math.floor(cg + (BRAND_GOLD.g - cg) * settleT);
        const gb = Math.floor(cb + (BRAND_GOLD.b - cb) * settleT);

        c.charTimer += morph > 0.5 ? 1.6 : 0.25;
        if (c.charTimer >= c.charRate) {
          c.char = CHARS[Math.floor(Math.random() * CHARS.length)];
          c.charTimer = 0;
        }

        if (r < 0.5 || alpha < 0.04) continue;

        ctx.globalAlpha = alpha;

        if (morph < 0.15) {
          if (settleT < 0.5) {
            ctx.globalAlpha = alpha * 0.2 * (1 - settleT * 2);
            const grd = ctx.createRadialGradient(c.mx, c.my, 0, c.mx, c.my, r * 3);
            grd.addColorStop(0, `rgb(${gr},${gg},${gb})`);
            grd.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(c.mx, c.my, r * 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.beginPath();
          ctx.arc(c.mx, c.my, r, 0, Math.PI * 2);
          ctx.fill();
        } else if (morph < 0.45) {
          const t = (morph - 0.15) / 0.3;
          const dr = r * (1 - t * 0.7);
          ctx.globalAlpha = alpha * (1 - t * 0.7);
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.beginPath();
          ctx.arc(c.mx, c.my, dr, 0, Math.PI * 2);
          ctx.fill();
          const s2 = r * 2 * t;
          ctx.globalAlpha = alpha * t;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.fillRect(c.mx - s2 * 0.5, c.my - s2 * 0.5, s2, s2);
        } else if (morph < 0.85) {
          const t = (morph - 0.45) / 0.4;
          const s2 = r * 2;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.fillRect(c.mx - s2 * 0.5, c.my - s2 * 0.5, s2, s2);
          if (s2 > 5) {
            const fSize = Math.max(5, s2 - 1.5);
            ctx.font = `bold ${fSize}px monospace`;
            ctx.globalAlpha = alpha * Math.min(1, t * 2.5) * 0.85;
            ctx.fillStyle = "rgba(26,36,32,0.92)";
            ctx.fillText(c.char, c.mx, c.my);
          }
        } else {
          const t = (morph - 0.85) / 0.15;
          const s2 = r * 2;
          ctx.globalAlpha = alpha * (1 - t);
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.fillRect(c.mx - s2 * 0.5, c.my - s2 * 0.5, s2, s2);
          ctx.globalAlpha = alpha * t;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.beginPath();
          ctx.arc(c.mx, c.my, r * t, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      const labelY = CY + BEAR_SIZE * 0.44 + 38;
      const labelAlpha = Math.min(1, Math.max(0, (expandT - 0.5) / 0.5));

      const ringY = labelY + 50;
      const ringR = 26;
      const ringRot = (elapsed / 1000) * 1.6;

      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.globalAlpha = labelAlpha * 0.2;
      ctx.strokeStyle = `rgb(${BRAND_GOLD.r},${BRAND_GOLD.g},${BRAND_GOLD.b})`;
      ctx.beginPath();
      ctx.arc(CX, ringY, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = labelAlpha;
      ctx.strokeStyle = `rgb(${BRAND_GOLD.r},${BRAND_GOLD.g},${BRAND_GOLD.b})`;
      const arcSpan = loadProg >= 1 ? Math.PI * 2 : Math.PI * 2 * loadProg;
      const arcStart = loadProg >= 1 ? -Math.PI * 0.5 : ringRot - Math.PI * 0.5;
      ctx.beginPath();
      ctx.arc(CX, ringY, ringR, arcStart, arcStart + arcSpan);
      ctx.stroke();

      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = `rgb(${BRAND_GOLD.r},${BRAND_GOLD.g},${BRAND_GOLD.b})`;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.floor(loadProg * 100)}%`, CX, ringY);

      frameId = requestAnimationFrame(drawFrame);
    }

    frameId = requestAnimationFrame(drawFrame);

    return () => cancelAnimationFrame(frameId);
  }, [navigate]);

  return (
    <div className="splash-container">
      <canvas ref={canvasRef} className="splash-canvas" />
      <img
        src={Logo}
        alt="Logo"
        className="splash-brand-logo"
      />
    </div>
  );
}