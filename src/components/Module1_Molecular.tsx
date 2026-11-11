import React, { useState, useEffect, useRef } from 'react';
import { Language, LiquidType, Module1ViewMode } from '../types';
import { translations } from '../translations';
import { LIQUIDS } from '../physicsData';
import {
  Play,
  Pause,
  RotateCcw,
  Info,
  ArrowDown,
  Move,
  Eye,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Module1Props {
  lang: Language;
}

interface SimMolecule {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isSurfaceZone?: boolean;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export const Module1_Molecular: React.FC<Module1Props> = ({ lang }) => {
  const t = translations[lang];

  // State
  const [selectedLiquid, setSelectedLiquid] = useState<LiquidType>('water');
  const [temperature, setTemperature] = useState<number>(20); // 0 to 100 °C
  const [detergentPercent, setDetergentPercent] = useState<number>(0); // 0 to 100%
  // User requested: "default a khali anobik view ta rakho" -> Default to 'micro'
  const [viewMode, setViewMode] = useState<Module1ViewMode>('micro');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Wire frame state
  const [wireLength, setWireLength] = useState<number>(0.10); // meters (0.04 to 0.20)
  const [filmStretch, setFilmStretch] = useState<number>(0.05); // meters (0.01 to 0.15)
  const [isDraggingWire, setIsDraggingWire] = useState<boolean>(false);
  // User requested: "film ta onek tan dile fete jabe ata add koro" -> Film pop state
  const [isFilmPopped, setIsFilmPopped] = useState<boolean>(false);

  // Selected probe molecule
  const [selectedMoleculeId, setSelectedMoleculeId] = useState<number>(0); // 0 is initial surface molecule

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const burstParticlesRef = useRef<BurstParticle[]>([]);

  // Simulation physics parameters
  const liquid = LIQUIDS[selectedLiquid];
  // T(T_c) = T_0 * (1 - alpha * (temp - 20)) * (1 - detergent * 0.65)
  const tempCorrection = Math.max(0.1, 1 - liquid.tempCoeff * (temperature - 20));
  const detergentCorrection = 1 - (detergentPercent / 100) * 0.65;
  const currentSurfaceTension = Math.max(
    0.005,
    liquid.surfaceTension20C * tempCorrection * detergentCorrection
  );

  // Wire restoring force: F = 2 * T * L (if popped, F = 0)
  const restoringForce = isFilmPopped ? 0 : 2 * currentSurfaceTension * wireLength;
  const expandedArea = isFilmPopped ? 0 : 2 * wireLength * filmStretch; // 2 surfaces
  const workDone = isFilmPopped ? 0 : currentSurfaceTension * expandedArea; // W = T * ΔA

  // Molecules array ref for 60 FPS canvas loop
  const moleculesRef = useRef<SimMolecule[]>([]);
  const isDraggingProbeRef = useRef<boolean>(false);
  const probePosRef = useRef<{ x: number; y: number }>({ x: 250, y: 120 });

  // Initialize molecules across full available width
  useEffect(() => {
    const list: SimMolecule[] = [];
    const poolW = canvasRef.current ? canvasRef.current.clientWidth || 1000 : 1000;
    const count = Math.max(180, Math.min(260, Math.floor(poolW * 0.22)));
    const poolH = 550;
    const surfaceY = 95;

    for (let i = 0; i < count; i++) {
      const x = 35 + Math.random() * (poolW - 70);
      const y = surfaceY + 6 + Math.random() * (poolH - surfaceY - 25);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 0.8;
      list.push({
        id: i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }

    // Explicit probe molecule placed exactly on the surface
    probePosRef.current = { x: Math.min(350, poolW * 0.4), y: surfaceY + 4 };
    list[0].x = Math.min(350, poolW * 0.4);
    list[0].y = surfaceY + 4;

    moleculesRef.current = list;
  }, [selectedLiquid]);

  // Handle film burst when stretched too far (x > 12.5 cm)
  const checkFilmBurst = (newStretch: number) => {
    const burstThreshold = 0.125; // 12.5 cm
    if (newStretch >= burstThreshold && !isFilmPopped) {
      setIsFilmPopped(true);
      // Spawn bursting droplet particles
      const particles: BurstParticle[] = [];
      for (let i = 0; i < 40; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 6;
        particles.push({
          x: 0,
          y: 0,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1.0,
          color: i % 2 === 0 ? '#38bdf8' : '#a855f7',
        });
      }
      burstParticlesRef.current = particles;
    }
  };

  const handleResetFilm = () => {
    setIsFilmPopped(false);
    setFilmStretch(0.05);
  };

  // Main 60 FPS Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const dpr = window.devicePixelRatio || 1;
      const displayW = canvas.clientWidth;
      const displayH = canvas.clientHeight;

      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayW, displayH);

      // Render based on viewMode
      if (viewMode === 'micro') {
        drawMicroscopicView(ctx, 0, 0, displayW, displayH, dt);
      } else if (viewMode === 'macro') {
        drawMacroscopicView(ctx, 0, 0, displayW, displayH);
      } else {
        // Split view
        const splitX = Math.floor(displayW * 0.52);
        drawMicroscopicView(ctx, 0, 0, splitX, displayH, dt);
        // Vertical divider
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(splitX, 10);
        ctx.lineTo(splitX, displayH - 10);
        ctx.stroke();
        ctx.setLineDash([]);
        drawMacroscopicView(ctx, splitX, 0, displayW - splitX, displayH);
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    viewMode,
    isPlaying,
    temperature,
    selectedLiquid,
    currentSurfaceTension,
    wireLength,
    filmStretch,
    isFilmPopped,
    selectedMoleculeId,
    lang,
  ]);

  // Microscopic View Drawing: crystal-clear downward cohesive pull!
  const drawMicroscopicView = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    w: number,
    h: number,
    dt: number
  ) => {
    const surfaceY = y0 + 105;
    const poolBottom = h - 25;
    const poolLeft = x0 + 20;
    const poolRight = x0 + w - 20;
    const influenceRadius = 55; // Sphere of molecular influence R

    // Background: Air zone with light sky tint
    const airGrad = ctx.createLinearGradient(0, y0, 0, surfaceY);
    airGrad.addColorStop(0, '#f8fafc');
    airGrad.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = airGrad;
    ctx.fillRect(poolLeft, y0 + 35, poolRight - poolLeft, surfaceY - (y0 + 35));

    // Liquid pool background with depth gradient
    const liquidGrad = ctx.createLinearGradient(0, surfaceY, 0, poolBottom);
    if (selectedLiquid === 'mercury') {
      liquidGrad.addColorStop(0, '#94a3b8');
      liquidGrad.addColorStop(1, '#334155');
    } else if (selectedLiquid === 'ethanol') {
      liquidGrad.addColorStop(0, '#e0e7ff');
      liquidGrad.addColorStop(1, '#a5b4fc');
    } else if (selectedLiquid === 'soap') {
      liquidGrad.addColorStop(0, '#ccfbf1');
      liquidGrad.addColorStop(1, '#5eead4');
    } else {
      liquidGrad.addColorStop(0, '#bae6fd');
      liquidGrad.addColorStop(0.3, '#7dd3fc');
      liquidGrad.addColorStop(1, '#0284c7');
    }
    ctx.fillStyle = liquidGrad;
    ctx.beginPath();
    ctx.roundRect(poolLeft, surfaceY, poolRight - poolLeft, poolBottom - surfaceY, [0, 0, 16, 16]);
    ctx.fill();

    // Container Glass Walls
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(poolLeft, surfaceY - 15);
    ctx.lineTo(poolLeft, poolBottom);
    ctx.lineTo(poolRight, poolBottom);
    ctx.lineTo(poolRight, surfaceY - 15);
    ctx.stroke();

    // Surface Film Layer Zone (Depth = influenceRadius)
    ctx.fillStyle = 'rgba(2, 132, 199, 0.12)';
    ctx.fillRect(poolLeft, surfaceY, poolRight - poolLeft, influenceRadius);

    // Dashed line marking lower boundary of surface film
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(poolLeft, surfaceY + influenceRadius);
    ctx.lineTo(poolRight, surfaceY + influenceRadius);
    ctx.stroke();
    ctx.setLineDash([]);

    // Water surface line (acting like stretched elastic skin)
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(poolLeft, surfaceY);
    ctx.lineTo(poolRight, surfaceY);
    ctx.stroke();

    // Clear Zone Labels
    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0369a1';
    ctx.fillText('AIR PHASE (বায়ু মাধ্যম - No Cohesion)', poolLeft + 12, y0 + 58);

    ctx.font = '600 10px JetBrains Mono, monospace';
    ctx.fillStyle = '#0284c7';
    ctx.fillText(`SURFACE FILM LAYER (t ≈ R ≈ 10⁻⁹ m)`, poolLeft + 12, surfaceY + 22);

    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('BULK LIQUID (অভ্যন্তরস্থ তরল - Isotropic ΣF = 0)', poolLeft + 12, poolBottom - 12);

    // Thermal agitation update for molecules
    const thermalSpeed = 0.4 + (temperature / 100) * 1.3;
    const molecules = moleculesRef.current;

    for (let i = 0; i < molecules.length; i++) {
      const mol = molecules[i];
      if (isPlaying && !(i === selectedMoleculeId && isDraggingProbeRef.current)) {
        mol.x += mol.vx * thermalSpeed;
        mol.y += mol.vy * thermalSpeed;

        // Bounce walls
        if (mol.x < poolLeft + 12) {
          mol.x = poolLeft + 12;
          mol.vx *= -1;
        }
        if (mol.x > poolRight - 12) {
          mol.x = poolRight - 12;
          mol.vx *= -1;
        }
        if (mol.y < surfaceY + 4) {
          mol.y = surfaceY + 4;
          mol.vy *= -1;
        }
        if (mol.y > poolBottom - 12) {
          mol.y = poolBottom - 12;
          mol.vy *= -1;
        }
      }
    }

    // Selected probe molecule coordinates
    const selectedMol = molecules[selectedMoleculeId] || molecules[0];
    const selX = isDraggingProbeRef.current ? probePosRef.current.x : selectedMol.x;
    const selY = isDraggingProbeRef.current ? probePosRef.current.y : selectedMol.y;

    // USER REQUIREMENT: "clear koro jeno molecule gula je nicher dike pulled hooche ata bhuja jai"
    // Draw distinct downward cohesive force arrows for ALL molecules near the surface layer!
    for (let i = 0; i < molecules.length; i++) {
      const mol = molecules[i];
      const distFromSurface = mol.y - surfaceY;
      if (distFromSurface < influenceRadius && i !== selectedMoleculeId) {
        // This molecule is in the surface tension film!
        // Draw an explicit downward pull arrow showing it is pulled inward
        const arrowH = Math.max(8, (1 - distFromSurface / influenceRadius) * 22);
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.65)'; // Crimson arrow
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(mol.x, mol.y + 4);
        ctx.lineTo(mol.x, mol.y + 4 + arrowH);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.beginPath();
        ctx.moveTo(mol.x, mol.y + 4 + arrowH);
        ctx.lineTo(mol.x - 3, mol.y + arrowH);
        ctx.lineTo(mol.x + 3, mol.y + arrowH);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Calculate cohesive forces inside sphere of influence for selected molecule
    let netFx = 0;
    let netFy = 0;
    let neighborCount = 0;

    for (let i = 0; i < molecules.length; i++) {
      if (i === selectedMoleculeId) continue;
      const other = molecules[i];
      const dx = other.x - selX;
      const dy = other.y - selY;
      const dist = Math.hypot(dx, dy);

      if (dist < influenceRadius && dist > 2) {
        neighborCount++;
        const forceMag = (1 - dist / influenceRadius) * 32 * liquid.cohesionFactor;
        const fx = (dx / dist) * forceMag;
        const fy = (dy / dist) * forceMag;

        netFx += fx;
        netFy += fy;

        // Radial attractive bond
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(selX, selY);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();

        // Attraction dot
        const dotX = selX + (dx / dist) * 18;
        const dotY = selY + (dy / dist) * 18;
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw all molecules as shiny spherical atoms
    for (let i = 0; i < molecules.length; i++) {
      const mol = molecules[i];
      const isSel = i === selectedMoleculeId;
      const mx = isSel ? selX : mol.x;
      const my = isSel ? selY : mol.y;
      const isNearSurface = my - surfaceY < influenceRadius;

      ctx.beginPath();
      ctx.arc(mx, my, isSel ? 8 : 5, 0, Math.PI * 2);
      if (isSel) {
        ctx.fillStyle = '#ea580c'; // Vibrant orange probe
      } else if (selectedLiquid === 'mercury') {
        ctx.fillStyle = isNearSurface ? '#334155' : '#64748b';
      } else {
        ctx.fillStyle = isNearSurface ? '#0284c7' : '#38bdf8';
      }
      ctx.fill();
      ctx.strokeStyle = isSel ? '#ffffff' : '#0369a1';
      ctx.lineWidth = isSel ? 2.5 : 0.8;
      ctx.stroke();
    }

    // Draw Sphere of Molecular Influence (R ≈ 10^-9 m) around probe
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.arc(selX, selY, influenceRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Translucent influence sphere fill
    ctx.fillStyle = 'rgba(2, 132, 199, 0.08)';
    ctx.beginPath();
    ctx.arc(selX, selY, influenceRadius, 0, Math.PI * 2);
    ctx.fill();

    // If near surface, show MISSING BONDS in the upper air hemisphere
    if (selY - surfaceY < influenceRadius) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.beginPath();
      // upper portion in air
      ctx.arc(selX, selY, influenceRadius, Math.PI, 0, false);
      ctx.fill();

      ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.fillText(
        lang === 'bn' ? '⚠️ ওপরের বায়ুতে কোনো তরল অণু নেই!' : '⚠️ Missing upper neighbors in air!',
        selX - 85,
        selY - influenceRadius - 8
      );
    }

    // Draw PROMINENT RESULTANT VECTOR ARROW (ΣF)
    const netMag = Math.hypot(netFx, netFy);
    if (netMag > 1.5) {
      const scale = Math.min(85, netMag * 2.2);
      const targetX = selX + (netFx / netMag) * scale;
      const targetY = selY + (netFy / netMag) * scale;

      // Glowing aura for net downward arrow
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#dc2626'; // Bold crimson
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(selX, selY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Large arrowhead
      const angle = Math.atan2(netFy, netFx);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(targetX, targetY);
      ctx.lineTo(
        targetX - 14 * Math.cos(angle - Math.PI / 6),
        targetY - 14 * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        targetX - 14 * Math.cos(angle + Math.PI / 6),
        targetY - 14 * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Net force badge label
      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#dc2626';
      const labelText =
        lang === 'bn'
          ? 'ΣF (নীট তীব্র নিম্নমুখী টান বল!)'
          : 'ΣF (Net Downward Cohesive Pull!)';
      ctx.fillText(labelText, targetX + 10, targetY + 4);
    } else {
      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText(
        lang === 'bn'
          ? 'ΣF ≈ ০ (চারদিকে সমভাবে আকর্ষিত - সাম্যাবস্থা)'
          : 'ΣF ≈ 0 (Symmetric Equilibrium in Bulk)',
        selX + 12,
        selY + 18
      );
    }

    // Top instruction notice
    ctx.font = '600 12px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0369a1';
    ctx.fillText(
      lang === 'bn'
        ? '💡 লাল তীরগুলো নির্দেশ করছে: পৃষ্ঠের অণুগুলো নিচের দিকে আকৃষ্ট হয়ে পৃষ্ঠতলকে টানটান স্থিতিস্থাপক রাখে।'
        : '💡 Red arrows show: Surface molecules are actively pulled downward, creating surface tension.',
      poolLeft,
      y0 + 22
    );
  };

  // Macroscopic U-frame Soap Film Drawing (with film popping!)
  const drawMacroscopicView = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    w: number,
    h: number
  ) => {
    const frameLeft = x0 + 40;
    const frameTop = y0 + 75;
    const frameHeight = Math.min(260, h - 140);
    const maxStretchPx = w - 140;
    const stretchPx = Math.max(30, Math.min(maxStretchPx, (filmStretch / 0.15) * maxStretchPx));

    // U-Frame title & description
    ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      lang === 'bn' ? 'ম্যাক্রোস্কোপিক U-আকৃতির ফ্রেম ও সাবান পর্দা' : 'Macroscopic U-Frame & Liquid Film',
      frameLeft,
      y0 + 35
    );

    ctx.font = '500 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      lang === 'bn'
        ? 'পর্দার দুটি মুক্ত তল থাকায় টান F = 2TL | অতিরিক্ত টানলে পর্দা ফেটে যাবে (x > ১২ সেমি)'
        : 'Dual free surfaces: F = 2TL | Stretching beyond 12.5 cm will burst the film!',
      frameLeft,
      y0 + 52
    );

    // If film is NOT popped, draw soap film
    if (!isFilmPopped) {
      const filmGrad = ctx.createLinearGradient(
        frameLeft,
        frameTop,
        frameLeft + stretchPx,
        frameTop + frameHeight
      );
      filmGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      filmGrad.addColorStop(0.3, 'rgba(167, 139, 250, 0.35)');
      filmGrad.addColorStop(0.6, 'rgba(52, 211, 153, 0.4)');
      filmGrad.addColorStop(1, 'rgba(56, 189, 248, 0.5)');

      ctx.fillStyle = filmGrad;
      ctx.fillRect(frameLeft, frameTop, stretchPx, frameHeight);

      // Film interference wave fringes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const waveX = frameLeft + (stretchPx / 5) * (i + 1);
        ctx.moveTo(waveX, frameTop);
        ctx.bezierCurveTo(
          waveX - 10,
          frameTop + frameHeight * 0.35,
          waveX + 10,
          frameTop + frameHeight * 0.65,
          waveX,
          frameTop + frameHeight
        );
        ctx.stroke();
      }

      // Restoring Force Arrows (Pointing Left into the film)
      const arrowCount = 5;
      for (let i = 0; i < arrowCount; i++) {
        const ay = frameTop + (frameHeight / (arrowCount + 1)) * (i + 1);
        const arrowLen = Math.min(40, currentSurfaceTension * 380);

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(frameLeft + stretchPx - 4, ay);
        ctx.lineTo(frameLeft + stretchPx - arrowLen, ay);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(frameLeft + stretchPx - arrowLen, ay);
        ctx.lineTo(frameLeft + stretchPx - arrowLen + 6, ay - 4);
        ctx.lineTo(frameLeft + stretchPx - arrowLen + 6, ay + 4);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // FILM IS POPPED! Draw burst droplets and empty wire
      ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
      ctx.fillRect(frameLeft, frameTop, stretchPx, frameHeight);

      ctx.font = 'bold 14px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.fillText(
        lang === 'bn' ? '💥 সাবান পর্দা ফেটে গেছে! (F = 0)' : '💥 SOAP FILM POPPED! (F = 0)',
        frameLeft + stretchPx / 2,
        frameTop + frameHeight / 2
      );
      ctx.textAlign = 'start';

      // Draw burst particles
      const parts = burstParticlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;

        ctx.fillStyle = `rgba(56, 189, 248, ${p.life})`;
        ctx.beginPath();
        ctx.arc(frameLeft + stretchPx + p.x, frameTop + frameHeight / 2 + p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) parts.splice(i, 1);
      }
    }

    // Heavy Metal U-Frame
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(frameLeft + maxStretchPx + 20, frameTop);
    ctx.lineTo(frameLeft, frameTop);
    ctx.lineTo(frameLeft, frameTop + frameHeight);
    ctx.lineTo(frameLeft + maxStretchPx + 20, frameTop + frameHeight);
    ctx.stroke();

    // Movable Slider Wire (Length L)
    const wireX = frameLeft + stretchPx;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wireX, frameTop - 8);
    ctx.lineTo(wireX, frameTop + frameHeight + 8);
    ctx.stroke();

    // Pull Handle Knob
    const handleY = frameTop + frameHeight / 2;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(wireX, handleY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Applied pull force arrow if not popped
    if (!isFilmPopped) {
      ctx.strokeStyle = '#059669'; // Emerald
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wireX + 16, handleY);
      ctx.lineTo(wireX + 46, handleY);
      ctx.stroke();

      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.moveTo(wireX + 46, handleY);
      ctx.lineTo(wireX + 38, handleY - 5);
      ctx.lineTo(wireX + 38, handleY + 5);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Canvas Mouse Interactions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    const splitX = viewMode === 'split' ? Math.floor(displayW * 0.52) : displayW;

    if (viewMode === 'macro' || (viewMode === 'split' && mouseX > splitX)) {
      const frameLeft = (viewMode === 'split' ? splitX : 0) + 40;
      const maxStretchPx = (viewMode === 'split' ? displayW - splitX : displayW) - 140;
      const currentWireX = frameLeft + (filmStretch / 0.15) * maxStretchPx;
      if (Math.abs(mouseX - currentWireX) < 28) {
        setIsDraggingWire(true);
      }
    } else {
      const surfaceY = 105;
      const poolBottom = displayH - 25;
      const poolLeft = 20;
      const poolRight = (viewMode === 'split' ? splitX : displayW) - 20;

      if (mouseX >= poolLeft && mouseX <= poolRight && mouseY >= surfaceY && mouseY <= poolBottom) {
        let closestIdx = 0;
        let minDist = 9999;
        const molecules = moleculesRef.current;
        for (let i = 0; i < molecules.length; i++) {
          const d = Math.hypot(molecules[i].x - mouseX, molecules[i].y - mouseY);
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        }
        setSelectedMoleculeId(closestIdx);
        isDraggingProbeRef.current = true;
        probePosRef.current = { x: mouseX, y: mouseY };
        molecules[closestIdx].x = mouseX;
        molecules[closestIdx].y = mouseY;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const displayW = canvas.clientWidth;
    const splitX = viewMode === 'split' ? Math.floor(displayW * 0.52) : displayW;

    if (isDraggingWire) {
      const frameLeft = (viewMode === 'split' ? splitX : 0) + 40;
      const maxStretchPx = (viewMode === 'split' ? displayW - splitX : displayW) - 140;
      const newStretchPx = Math.max(20, Math.min(maxStretchPx, mouseX - frameLeft));
      const newStretch = (newStretchPx / maxStretchPx) * 0.15;
      setFilmStretch(newStretch);
      checkFilmBurst(newStretch);
    } else if (isDraggingProbeRef.current) {
      const surfaceY = 105;
      const poolBottom = canvas.clientHeight - 25;
      const poolLeft = 20;
      const poolRight = (viewMode === 'split' ? splitX : displayW) - 20;

      const clampedX = Math.max(poolLeft + 12, Math.min(poolRight - 12, mouseX));
      const clampedY = Math.max(surfaceY + 2, Math.min(poolBottom - 12, mouseY));

      probePosRef.current = { x: clampedX, y: clampedY };
      if (moleculesRef.current[selectedMoleculeId]) {
        moleculesRef.current[selectedMoleculeId].x = clampedX;
        moleculesRef.current[selectedMoleculeId].y = clampedY;
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingWire(false);
    isDraggingProbeRef.current = false;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] xl:grid-cols-[340px_1fr_340px] gap-3.5 w-full p-2.5 sm:p-3 lg:p-4 items-start flex-1">
      {/* LEFT SIDEBAR: Control Dock */}
      <aside className="bg-white rounded-2xl border border-sky-200 shadow-sm p-4 flex flex-col gap-5 text-slate-900">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold tracking-tight text-slate-950">
              {lang === 'bn' ? '১. নিয়ন্ত্রণ প্যানেল' : '1. Control Dock'}
            </h2>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
              {liquid.nameEn.split(' ')[0]}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? 'আণবিক স্তরে পৃষ্ঠটানের উৎপত্তি ও নিম্নমুখী আকর্ষণ বল পর্যবেক্ষণ'
              : 'Microscopic origin of cohesive downward pull & surface film tension.'}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            {t.m1.viewMode}
          </label>
          <div className="grid grid-cols-3 gap-1 bg-sky-50 p-1 rounded-xl border border-sky-100 text-[11px] font-medium">
            <button
              onClick={() => setViewMode('micro')}
              className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                viewMode === 'micro'
                  ? 'bg-white text-sky-950 font-bold shadow-2xs border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'আণবিক ভিউ' : 'Molecular'}
            </button>
            <button
              onClick={() => setViewMode('macro')}
              className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                viewMode === 'macro'
                  ? 'bg-white text-sky-950 font-bold shadow-2xs border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'U-ফ্রেম' : 'U-Frame'}
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                viewMode === 'split'
                  ? 'bg-white text-sky-950 font-bold shadow-2xs border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'যৌথ' : 'Split'}
            </button>
          </div>
        </div>

        {/* Liquid Medium Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            {t.liquid}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(LIQUIDS) as LiquidType[]).map((key) => {
              const item = LIQUIDS[key];
              const isSelected = selectedLiquid === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedLiquid(key)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-2xs text-slate-950 ring-1 ring-emerald-400'
                      : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold leading-tight">
                    {lang === 'bn' ? item.nameBn : item.nameEn}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1">
                    T = {(item.surfaceTension20C * 1000).toFixed(1)} mN/m
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Emerald Slider 1: Temperature */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-800">{t.temperature}</span>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              {temperature} °C
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>0°C (Ice)</span>
            <span>20°C (Room)</span>
            <span>100°C (Boil)</span>
          </div>
        </div>

        {/* Emerald Slider 2: Detergent / Impurity */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-800">{t.impurity}</span>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              {detergentPercent}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={detergentPercent}
            onChange={(e) => setDetergentPercent(parseFloat(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>{t.clean}</span>
            <span>{t.detergent}</span>
          </div>
        </div>

        {/* Macroscopic U-Frame Controls & Film Burst Reset */}
        {(viewMode === 'macro' || viewMode === 'split') && (
          <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-200 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-800">{t.m1.wireLength}</span>
              <span className="text-xs font-mono font-bold text-sky-800">
                {(wireLength * 100).toFixed(1)} cm
              </span>
            </div>
            <input
              type="range"
              min="0.04"
              max="0.20"
              step="0.01"
              value={wireLength}
              onChange={(e) => setWireLength(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />

            {/* Re-dip / Reset Film Button */}
            {isFilmPopped && (
              <button
                onClick={handleResetFilm}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'নতুন সাবান পর্দা তৈরি করুন' : 'Form New Soap Film'}</span>
              </button>
            )}
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{t.pause}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{t.play}</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              setTemperature(20);
              setDetergentPercent(0);
              setFilmStretch(0.05);
              setSelectedMoleculeId(0);
              setIsFilmPopped(false);
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title={t.reset}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* CENTER STAGE: Canvas Simulation Area (Full Width, Expanded Height) */}
      <main className="bg-white rounded-2xl border border-sky-200 shadow-sm p-3 flex flex-col gap-2 min-h-[700px] xl:min-h-[750px] w-full min-w-0">
        {/* Canvas Toolbar Info */}
        <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-600 bg-sky-50/70 rounded-xl border border-sky-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-900">
              {viewMode === 'micro'
                ? t.m1.viewMicro
                : viewMode === 'macro'
                ? t.m1.viewMacro
                : t.m1.viewSplit}
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-sky-800">60 FPS Microscopic Liquid Pool</span>
          </div>
          <div className="text-[11px] text-slate-500 hidden sm:block">
            {t.m1.dragInstruction}
          </div>
        </div>

        {/* Canvas Viewport */}
        <div className="relative w-full flex-1 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[640px] xl:min-h-[690px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="w-full h-full cursor-crosshair block"
          />

          {/* Contextual downward pull badge */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md border border-rose-300 px-3 py-2 rounded-xl shadow-xs text-xs text-rose-800 flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-rose-600 animate-bounce" />
            <span className="font-bold">
              {lang === 'bn'
                ? 'পৃষ্ঠতলের অণুগুলোতে নীট নিম্নমুখী টান (ΣF > 0)'
                : 'Net Downward Pull on Surface Molecules (ΣF > 0)'}
            </span>
          </div>

          {/* Film Popped Alert on Canvas */}
          {isFilmPopped && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md border-2 border-rose-400 p-4 rounded-2xl shadow-lg flex flex-col items-center gap-2 text-center max-w-sm">
              <AlertTriangle className="w-8 h-8 text-rose-600 animate-bounce" />
              <div className="font-bold text-sm text-slate-950">
                {lang === 'bn' ? 'সাবান পর্দা ফেটে গেছে!' : 'SOAP FILM BURST!'}
              </div>
              <p className="text-xs text-slate-600">
                {lang === 'bn'
                  ? 'স্থিতিস্থাপক সীমার বাইরে বেশি টানায় পর্দা ফেটে গেছে। নতুন পর্দা তৈরি করতে ক্লিক করুন।'
                  : 'Stretched past elastic limit. Re-dip the wire frame to form a new soap film.'}
              </p>
              <button
                onClick={handleResetFilm}
                className="mt-1 py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                {lang === 'bn' ? 'নতুন পর্দা তৈরি করুন' : 'Form New Film'}
              </button>
            </div>
          )}

          {/* Floating guidance tip */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-sky-200 px-3 py-1.5 rounded-xl shadow-sm text-[11px] text-slate-700 flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {lang === 'bn'
                ? 'অণুর উপর ড্র্যাগ করে প্রভাব বলয় ও টান বল পরীক্ষা করুন'
                : 'Click or drag molecule to test influence sphere & downward vector'}
            </span>
          </div>
        </div>
      </main>

      {/* RIGHT TELEMETRY: Math monitors & force balances */}
      <aside className="bg-white rounded-2xl border border-sky-200 shadow-sm p-4 flex flex-col gap-4 text-slate-900">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-950 mb-1">
            {lang === 'bn' ? 'টেলিমেট্রি ও সমীকরণ' : 'Physical Telemetry & Math'}
          </h2>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? 'বাস্তব সময়ে গণনাকৃত মান ও বলের ভারসাম্য'
              : 'Real-time computed variables and vector force equilibrium'}
          </p>
        </div>

        {/* Surface Tension Card */}
        <div className="bg-sky-50/80 p-3.5 rounded-xl border border-sky-200">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-sky-900">{t.surfaceTension}</span>
            <span className="text-[11px] font-mono text-sky-700 font-bold">T</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-950 tabular-nums">
            {(currentSurfaceTension * 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-600">mN/m (or J/m²)</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            = {currentSurfaceTension.toFixed(5)} N/m
          </div>
        </div>

        {/* U-Frame Restoring Force Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-slate-800">{t.restoringForce}</span>
            <span className="text-[11px] font-mono text-emerald-600 font-bold">F = 2TL</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-800 tabular-nums">
            {(restoringForce * 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-600">mN</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">
            {isFilmPopped ? (
              <span className="text-rose-600 font-bold">
                {lang === 'bn' ? '⚠️ পর্দা ফেটে যাওয়ায় বল = ০' : '⚠️ Film popped: Force = 0'}
              </span>
            ) : (
              t.m1.uFramePhysics
            )}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            F = 2 × {currentSurfaceTension.toFixed(4)} × {wireLength.toFixed(2)} ={' '}
            <span className="font-bold text-slate-900">{(restoringForce * 1000).toFixed(2)} mN</span>
          </div>
        </div>

        {/* Work Done Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-slate-800">{t.workDone} (W)</span>
            <span className="text-[11px] font-mono text-sky-600 font-bold">W = T · ΔA</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
            {(workDone * 1000).toFixed(3)}{' '}
            <span className="text-xs font-normal text-slate-600">mJ</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            ΔA = 2 × L × x = {(expandedArea * 10000).toFixed(2)} cm²
          </div>
        </div>

        {/* Cohesion vs Adhesion Ratio */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-800">{t.m1.cohesionVsAdhesion}</span>
            <span className="text-xs font-mono font-bold text-sky-800">
              {(liquid.cohesionFactor / 0.15).toFixed(1)} : 1
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
            <div
              className="h-full bg-sky-600 transition-all duration-300"
              style={{ width: `${Math.min(95, liquid.cohesionFactor * 80)}%` }}
            />
            <div className="h-full bg-slate-400 flex-1" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>Cohesion (Liquid-Liquid)</span>
            <span>Adhesion (Air)</span>
          </div>
        </div>

        {/* Theoretical Concept Card */}
        <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 text-[11px] text-slate-700 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-sky-950">
            <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>{lang === 'bn' ? 'আণবিক ব্যাখ্যা' : 'Microscopic Proof'}</span>
          </div>
          <p className="leading-relaxed">
            {lang === 'bn'
              ? 'পৃষ্ঠতলের অণুগুলোর ওপরের অংশে বায়ু থাকায় কোনো তরল অণু নেই। ফলে নিচের অণুগুলোর প্রবল আকর্ষণ বল অণুগুলোকে সবসময় ভেতরের দিকে টেনে রাখে। এর ফলে তরল পৃষ্ঠ টানটান স্থিতিস্থাপক পর্দার রূপ নেয়।'
              : 'Surface molecules have no liquid neighbors above, creating an intense unbalanced downward cohesive pull that minimizes surface area and gives liquid its tensile skin.'}
          </p>
        </div>
      </aside>
    </div>
  );
};
