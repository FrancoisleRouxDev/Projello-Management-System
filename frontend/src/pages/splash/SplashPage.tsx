import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./SplashPage.css";
import Logo from "../../assets/Frame 106.svg";

// --- CANVAS SIZE STUFF ---
// W and H are just the canvas dimensions (680x680 px, it's a square)
// CX and CY are the center point of the canvas — we shift CY up by 40px so the bear sits a little higher
// BEAR_SIZE controls how big the bear shape is overall
const W = 680;
const H = 680;
const CX = W / 2;
const CY = H / 2 - 40;
const BEAR_SIZE = 340;

// GRID is the size of each "cell" in the dot grid — think of the canvas as a 10x10px tile map
// CHARS is just a big string of random characters that flash inside the cells during the animation (matrix-ish vibes)
const GRID = 10;
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%@!?*+=<>{}[]|~^&";

// --- BRAND COLORS ---
// These are the three gold/olive/cream tones used throughout the animation
// Each cell kinda blends between these depending on where it is in its cycle
const BRAND_GOLD = { r: 200, g: 168, b: 75 };
const BRAND_OLIVE = { r: 160, g: 140, b: 55 };
const BRAND_CREAM = { r: 230, g: 215, b: 155 };

// --- TIMING CONSTANTS ---
// TOTAL_MS = how long the whole splash lasts before navigating away (10 seconds hardcoded — heads up, not tied to actual loading!)
// EXPAND_MS = how long the bear "reveal" animation takes at the start (1.5s)
// SETTLE_MS = the final 1 second where everything calms down and dots lock into place
// FULL_DOT_R = the final resting radius of each dot once it settles
const TOTAL_MS = 5000;
const EXPAND_MS = 1500;
const SETTLE_MS = 1000;
const FULL_DOT_R = GRID * 0.72;

// --- EASING FUNCTIONS ---
// these just make animations feel smooth instead of robotic/linear
// easeOut = starts fast, slows down at the end (good for things "landing")
// easeInOut = slow start, fast middle, slow end (good for transitions that feel natural)
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- BEAR SHAPE DETECTION ---
// This function checks if a given pixel (px, py) falls inside the bear silhouette
// The bear is made up of 4 ellipses stacked together:
//   - Two small ones at the top = the ears
//   - One big one in the middle = the head/body
//   - One smaller one below = the lower body/chin area
// If a grid cell lands inside any of these ellipses, it's part of the bear and gets animated
function inBear(px: number, py: number) {
  const s = BEAR_SIZE / 300; // scale factor so the shape matches BEAR_SIZE
  function ell(ox: number, oy: number, rw: number, rh: number) {
    const dx = (px - (CX + ox * s)) / (rw * s * 0.5);
    const dy = (py - (CY + oy * s)) / (rh * s * 0.5);
    return dx * dx + dy * dy <= 1; // standard ellipse equation
  }
  return (
    ell(-88, -115, 100, 100) || // left ear
    ell(88, -115, 100, 100) ||  // right ear
    ell(0, 0, 238, 218) ||      // main head/body
    ell(0, 62, 148, 118)        // lower chin/body area
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

    // --- CELL SETUP ---
    // We loop through every grid position on the canvas and check if it's inside the bear
    // For each one that IS inside, we create a "cell" object with a bunch of randomized properties
    // These random values make each dot feel alive and unique instead of all pulsing in sync
    const cells: Array<{
      mx: number;       // center x of this cell
      my: number;       // center y of this cell
      dist: number;     // distance from canvas center (used to stagger the reveal animation)
      distNorm: number; // normalized version of dist (0 to 1), calculated after the loop
      timeOffset: number;  // random time offset so cells don't all animate in sync
      cycleDur: number;    // how long one full dot→square→char→dot cycle takes
      sizePhase: number;   // random starting phase for the size pulse
      sizeSpeed: number;   // how fast the size pulses
      sizeMin: number;     // minimum dot size
      sizeMax: number;     // maximum dot size
      brightPhase: number; // random starting phase for the brightness pulse
      brightSpeed: number; // how fast brightness pulses
      colorBias: number;   // random value that shifts this cell toward cream vs olive
      char: string;        // the current random character shown during the "char" phase
      charTimer: number;   // counts up to charRate before swapping to a new character
      charRate: number;    // how often the character changes (lower = faster flipping)
    }> = [];

    let maxDist = 0;

    for (let gy = 0; gy < H - GRID; gy += GRID) {
      for (let gx = 0; gx < W - GRID; gx += GRID) {
        const mx = gx + GRID * 0.5;
        const my = gy + GRID * 0.5;
        if (!inBear(mx, my)) continue; // skip anything outside the bear shape

        const dx = mx - CX;
        const dy = my - CY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) maxDist = dist; // track the furthest cell so we can normalize later

        cells.push({
          mx,
          my,
          dist,
          distNorm: 0, // placeholder, we fill this in below once we know maxDist
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

    // now that we know maxDist, normalize everyone's distance to a 0-1 range
    // this is what controls the "ripple outward" reveal effect — cells closer to center appear first
    for (const c of cells) {
      c.distNorm = c.dist / maxDist;
    }

    let t0: number | null = null; // timestamp of the first frame, used to calculate elapsed time
    let frameId: number;
    let hasNavigated = false; // guard so we don't call navigate() more than once

    // --- MAIN ANIMATION LOOP ---
    // This runs every frame via requestAnimationFrame (~60fps)
    // Everything visual is recalculated and redrawn from scratch each frame
    function drawFrame(ts: number) {
      if (!t0) t0 = ts;
      const elapsed = Math.min(ts - t0, TOTAL_MS); // clamp so we don't go past 10s
      const loadProg = elapsed / TOTAL_MS;          // 0 to 1, drives the progress ring %
      const expandT = Math.min(1, elapsed / EXPAND_MS); // 0 to 1, drives the bear reveal
      const settleStart = TOTAL_MS - SETTLE_MS;

      // settleT goes from 0 to 1 only in the final 1 second — this is when everything "locks in"
      const settleT =
        elapsed >= settleStart ? easeInOut(Math.min(1, (elapsed - settleStart) / SETTLE_MS)) : 0;

      // once we hit 10 seconds, go to /login
      // NOTE: this is hardcoded — ideally this would fire when actual app data is loaded, not just after 10s
      if (loadProg >= 1 && !hasNavigated) {
        hasNavigated = true;
        navigate("/login");
        return;
      }

      // wave effect — a slow ripple that rolls across the bear shape continuously
      const WAVE_SPEED = 0.0014;
      const WAVE_FREQ = 3.5;
      const waveAngle = elapsed * WAVE_SPEED;

      // clear the canvas each frame with the dark background color
      ctx.fillStyle = "#1a2420";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // --- PER-CELL DRAWING ---
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];

        // cellReveal = how "visible" this cell is during the expand phase
        // cells closer to center reveal first, outer cells catch up — creates the ripple-in effect
        const cellReveal = Math.max(0, Math.min(1, (expandT - c.distNorm) / 0.4));
        if (cellReveal <= 0) continue; // not revealed yet, skip

        // localT = where this cell is in its current animation cycle (0 to 1)
        const localT = ((elapsed + c.timeOffset) % c.cycleDur) / c.cycleDur;

        // rawMorph = a 0-1 value that controls the shape transition for this cell
        // it ramps up, holds at 1, then ramps back down — like a triangle wave with a flat top
        let rawMorph;
        if (localT < 0.35) rawMorph = localT / 0.35;
        else if (localT < 0.65) rawMorph = 1;
        else rawMorph = 1 - (localT - 0.65) / 0.35;

        // during settle phase, morph fades to 0 so all cells return to plain dots
        const morph = rawMorph * (1 - settleT);

        // wave math — gives each cell a sin-based multiplier based on its distance from center
        const waveSin = Math.sin(c.distNorm * WAVE_FREQ - waveAngle);
        const waveMul = 1 + waveSin * 0.35 * (1 - settleT);

        // size oscillation — each cell pulses in size at its own speed/phase
        const sizeSin = 0.5 + 0.5 * Math.sin(elapsed * c.sizeSpeed * 0.001 + c.sizePhase);
        const baseSize = (c.sizeMin + (c.sizeMax - c.sizeMin) * sizeSin) * GRID * waveMul;

        // during settle, displayR transitions from the animated size to the fixed FULL_DOT_R
        const displayR = baseSize * 0.48 * (1 - settleT) + FULL_DOT_R * settleT;
        const r = displayR * easeOut(cellReveal); // eased so it pops in smoothly

        // brightness oscillation — same idea as size but for opacity
        const brightSin = 0.5 + 0.5 * Math.sin(elapsed * c.brightSpeed * 0.001 + c.brightPhase);
        const waveAlpha = 0.7 + 0.3 * waveSin * (1 - settleT);
        const baseAlpha = (0.45 + 0.55 * brightSin) * waveAlpha;

        // during settle, alpha goes to 1.0 (fully opaque) so dots are solid at the end
        const alpha = (baseAlpha * (1 - settleT) + 1.0 * settleT) * cellReveal;

        // color blending — each cell has a colorBias that shifts it between olive and cream
        // then during settle, everything lerps toward brand gold
        const cr = BRAND_OLIVE.r + (BRAND_CREAM.r - BRAND_OLIVE.r) * c.colorBias * brightSin;
        const cg = BRAND_OLIVE.g + (BRAND_CREAM.g - BRAND_OLIVE.g) * c.colorBias * brightSin;
        const cb = BRAND_OLIVE.b + (BRAND_CREAM.b - BRAND_OLIVE.b) * c.colorBias * brightSin;
        const gr = Math.floor(cr + (BRAND_GOLD.r - cr) * settleT);
        const gg = Math.floor(cg + (BRAND_GOLD.g - cg) * settleT);
        const gb = Math.floor(cb + (BRAND_GOLD.b - cb) * settleT);

        // character flipping — when morph is high (cell is "active"), chars flip faster
        c.charTimer += morph > 0.5 ? 1.6 : 0.25;
        if (c.charTimer >= c.charRate) {
          c.char = CHARS[Math.floor(Math.random() * CHARS.length)];
          c.charTimer = 0;
        }

        // skip drawing if basically invisible — performance optimization
        if (r < 0.5 || alpha < 0.04) continue;

        ctx.globalAlpha = alpha;

        // --- MORPH PHASES ---
        // Each cell cycles through 4 visual states based on morph value:
        //
        // morph 0.00–0.15 = CIRCLE (plain dot, with a glow gradient if it's early in settle)
        // morph 0.15–0.45 = CIRCLE → SQUARE transition (dot shrinks, square grows in)
        // morph 0.45–0.85 = SQUARE + CHARACTER (full square with a random char drawn on top)
        // morph 0.85–1.00 = SQUARE → CIRCLE transition (square fades, dot returns)

        if (morph < 0.15) {
          // plain dot phase — add a glow halo before settle kicks in
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
          // transitioning from circle to square — dot shrinks while square fades in
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
          // full square + character phase — this is the "matrix" looking part
          const t = (morph - 0.45) / 0.4;
          const s2 = r * 2;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.fillRect(c.mx - s2 * 0.5, c.my - s2 * 0.5, s2, s2);
          if (s2 > 5) { // only draw text if the cell is big enough to actually see it
            const fSize = Math.max(5, s2 - 1.5);
            ctx.font = `bold ${fSize}px monospace`;
            ctx.globalAlpha = alpha * Math.min(1, t * 2.5) * 0.85;
            ctx.fillStyle = "rgba(26,36,32,0.92)"; // dark text on gold square
            ctx.fillText(c.char, c.mx, c.my);
          }
        } else {
          // transitioning back from square to circle to complete the cycle
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

      // --- PROGRESS RING ---
      // Drawn below the bear, fades in after the bear is halfway revealed
      // labelY = vertical position just below the bear shape
      // labelAlpha = fades in once expandT passes 0.5 (so it doesn't show up immediately)
      const labelY = CY + BEAR_SIZE * 0.44 + 38;
      const labelAlpha = Math.min(1, Math.max(0, (expandT - 0.5) / 0.5));

      const ringY = labelY + 50;
      const ringR = 26;
      const ringRot = (elapsed / 1000) * 1.6; // ring slowly rotates the whole time

      // faint full circle in the background (the "track" of the progress ring)
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.globalAlpha = labelAlpha * 0.2;
      ctx.strokeStyle = `rgb(${BRAND_GOLD.r},${BRAND_GOLD.g},${BRAND_GOLD.b})`;
      ctx.beginPath();
      ctx.arc(CX, ringY, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // the actual progress arc — grows from 0 to full circle as loadProg goes 0 → 1
      // once complete it stops rotating and just sits as a full ring
      ctx.globalAlpha = labelAlpha;
      ctx.strokeStyle = `rgb(${BRAND_GOLD.r},${BRAND_GOLD.g},${BRAND_GOLD.b})`;
      const arcSpan = loadProg >= 1 ? Math.PI * 2 : Math.PI * 2 * loadProg;
      const arcStart = loadProg >= 1 ? -Math.PI * 0.5 : ringRot - Math.PI * 0.5;
      ctx.beginPath();
      ctx.arc(CX, ringY, ringR, arcStart, arcStart + arcSpan);
      ctx.stroke();

      // the percentage text in the center of the ring (e.g. "42%")
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = `rgb(${BRAND_GOLD.r},${BRAND_GOLD.g},${BRAND_GOLD.b})`;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.floor(loadProg * 100)}%`, CX, ringY);

      // queue up the next frame
      frameId = requestAnimationFrame(drawFrame);
    }

    frameId = requestAnimationFrame(drawFrame); // kick off the loop
    return () => cancelAnimationFrame(frameId); // cleanup on unmount so we don't get memory leaks
  }, [navigate]);

  // --- RENDER ---
  // Just a canvas + the brand logo layered on top via CSS (check SplashPage.css for positioning)
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
}  //Just a nice to have , splash screens are usually to load info for a app behind the scenes, so this is a fun thing to add incase its ever needed.