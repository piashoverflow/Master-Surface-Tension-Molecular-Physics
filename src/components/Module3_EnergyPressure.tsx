import React, { useState, useEffect, useRef } from 'react';
import { Language, Module3Section, BubbleCurvatureModel } from '../types';
import { translations } from '../translations';
import {
  Sparkles,
  Thermometer,
  Layers,
  ArrowRight,
  RotateCcw,
  Play,
  Pause,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Minimize2,
  Split,
  GitMerge,
  Clock,
} from 'lucide-react';

interface Module3Props {
  lang: Language;
}

interface AnimatedDroplet {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  r: number;
  vx: number;
  vy: number;
  color: string;
}

export const Module3_EnergyPressure: React.FC<Module3Props> = ({ lang }) => {
  const t = translations[lang];

  // Active sub-section
  const [activeTab, setActiveTab] = useState<Module3Section>('splitting');

  // --- Sub-Section A: Splitting & Coalescence State ---
  const [initialRadiusMm, setInitialRadiusMm] = useState<number>(4.0); // mm
  const [dropletCountExp, setDropletCountExp] = useState<number>(3); // 10^3 = 1000 droplets
  const [surfaceTension, setSurfaceTension] = useState<number>(0.0728); // N/m
  const [density, setDensity] = useState<number>(1000); // kg/m^3
  const [specHeatCapacity, setSpecHeatCapacity] = useState<number>(4200); // J/kg*K (water)

  // Smooth, slow morphing transition ref (0.0 = single big drop, 1.0 = n micro-droplets)
  const morphProgressRef = useRef<number>(0.0);
  const targetMorphRef = useRef<number>(0.0);
  const [morphDisplayPercent, setMorphDisplayPercent] = useState<number>(0);

  // Sub-Section A Physics Calculations
  const R = initialRadiusMm / 1000; // in meters
  const n = Math.round(Math.pow(10, dropletCountExp)); // e.g. 1000
  const r = R * Math.pow(n, -1 / 3);
  const rMm = r * 1000;

  // Surface Area Change: ΔA = 4π (n r^2 - R^2) = 4π R^2 (n^(1/3) - 1)
  const initialArea = 4 * Math.PI * Math.pow(R, 2);
  const finalArea = n * 4 * Math.PI * Math.pow(r, 2);
  const deltaArea = finalArea - initialArea;

  // Work done against surface tension: W = T * ΔA
  const workDone = surfaceTension * deltaArea;
  const dropletMass = (4 / 3) * Math.PI * Math.pow(R, 3) * density;

  // Temperature Change: Δθ = W / (m * s)
  const deltaThetaSplitting = -(workDone / (dropletMass * specHeatCapacity));
  const deltaThetaCoalescence = Math.abs(deltaThetaSplitting);

  // --- Sub-Section B: Excess Pressure Model State (Default larger radius) ---
  const [curvatureModel, setCurvatureModel] = useState<BubbleCurvatureModel>('soap_bubble');
  const [bubbleRadiusMm, setBubbleRadiusMm] = useState<number>(24); // mm (default larger)

  // Excess pressure formula
  const bRadiusM = bubbleRadiusMm / 1000;
  let excessPressure = 0;
  let modelFormula = '';
  let modelDesc = '';

  if (curvatureModel === 'liquid_drop') {
    excessPressure = (2 * surfaceTension) / bRadiusM;
    modelFormula = 'ΔP = 2T / R';
    modelDesc = lang === 'bn' ? '১টি পৃষ্ঠ ইন্টারফেস (তরল-বায়ু)' : 'Single liquid-air interface';
  } else if (curvatureModel === 'soap_bubble') {
    excessPressure = (4 * surfaceTension) / bRadiusM;
    modelFormula = 'ΔP = 4T / R';
    modelDesc = lang === 'bn' ? '২টি পৃষ্ঠ ইন্টারফেস (ভেতরের ও বাইরের সাবান পর্দা)' : 'Two concentric film surfaces (inner + outer)';
  } else {
    excessPressure = surfaceTension / bRadiusM;
    modelFormula = 'ΔP = T / R';
    modelDesc = lang === 'bn' ? 'সিলিন্ড্রিক্যাল জেট / তরল স্তম্ভ' : 'Cylindrical jet or liquid column';
  }

  // --- Sub-Section C: Two-Bubble Paradox State ---
  const [r1Mm, setR1Mm] = useState<number>(14); // small bubble radius (mm)
  const [r2Mm, setR2Mm] = useState<number>(32); // large bubble radius (mm)
  const [isValveOpen, setIsValveOpen] = useState<boolean>(false);
  const [simR1, setSimR1] = useState<number>(14);
  const [simR2, setSimR2] = useState<number>(32);

  const p1 = (4 * surfaceTension) / (simR1 / 1000);
  const p2 = (4 * surfaceTension) / (simR2 / 1000);
  const pDiff = p1 - p2;

  // Canvas animation refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Droplets for Sub-Section A animation
  const animDropletsRef = useRef<AnimatedDroplet[]>([]);

  useEffect(() => {
    const list: AnimatedDroplet[] = [];
    const visualCount = 52;
    for (let i = 0; i < visualCount; i++) {
      const angle = (i / visualCount) * Math.PI * 2;
      const dist = 75 + Math.random() * 70;
      list.push({
        x: 0,
        y: 0,
        targetX: Math.cos(angle) * dist,
        targetY: Math.sin(angle) * dist,
        r: 3 + Math.random() * 2.5,
        vx: 0,
        vy: 0,
        color: '#0284c7',
      });
    }
    animDropletsRef.current = list;
  }, []);

  // Smooth slow transition triggers
  const handleTriggerSplit = () => {
    targetMorphRef.current = 1.0;
  };

  const handleTriggerCoalesce = () => {
    targetMorphRef.current = 0.0;
  };

  // Two-Bubble paradox air transfer animation
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isValveOpen) {
      timer = setInterval(() => {
        setSimR1((prev1) => {
          if (prev1 <= 6) return 6;
          return prev1 - 0.16;
        });
        setSimR2((prev2) => {
          if (simR1 <= 6) return prev2;
          return prev2 + 0.08;
        });
      }, 45);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isValveOpen, simR1]);

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

      // Silky smooth, slow transition for droplet splitting/coalescing (~2.5s)
      const diff = targetMorphRef.current - morphProgressRef.current;
      if (Math.abs(diff) > 0.001) {
        morphProgressRef.current += diff * dt * 1.5; // slow, smooth easing
        setMorphDisplayPercent(Math.round(morphProgressRef.current * 100));
      } else {
        morphProgressRef.current = targetMorphRef.current;
      }
      const morph = morphProgressRef.current;

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

      const bg = ctx.createLinearGradient(0, 0, 0, displayH);
      bg.addColorStop(0, '#f8fafc');
      bg.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, displayW, displayH);

      const cx = displayW / 2;
      const cy = displayH / 2;

      if (activeTab === 'splitting') {
        drawSplittingCanvas(ctx, cx, cy, displayW, displayH, dt, morph);
      } else if (activeTab === 'excess_pressure') {
        drawExcessPressureDiagram(ctx, cx, cy, displayW, displayH);
      } else {
        drawTwoBubbleCanvas(ctx, cx, cy, displayW, displayH);
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [
    activeTab,
    initialRadiusMm,
    dropletCountExp,
    curvatureModel,
    bubbleRadiusMm,
    excessPressure,
    isValveOpen,
    simR1,
    simR2,
    p1,
    p2,
    lang,
  ]);

  // 1. Draw Droplet Splitting & Coalescence Canvas (Slow & Smooth Transition)
  const drawSplittingCanvas = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    dt: number,
    morph: number
  ) => {
    ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      lang === 'bn'
        ? '১টি বড় ফোঁটা বনাম n টি ক্ষুদ্র ফোঁটা: আয়তন সংরক্ষণ ও পৃষ্ঠশক্তি'
        : 'Droplet Splitting & Coalescence: Thermodynamics',
      30,
      35
    );

    ctx.font = '500 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      lang === 'bn'
        ? 'আয়তন ধ্রুবক: V = n × v  =>  r = R · n^(-1/3)  |  ধীর ও মসৃণ রূপান্তর চলছে'
        : 'Volume conservation: V = n × v => r = R · n^(-1/3) | Smooth transition in progress',
      30,
      52
    );

    const baseDropRadiusPx = Math.min(105, Math.max(55, initialRadiusMm * 14));

    // Dynamic central mother drop: shrinks as morph goes from 0 -> 1
    const currentMotherRadius = baseDropRadiusPx * Math.max(0, 1 - morph * 1.15);

    if (currentMotherRadius > 2) {
      // Shimmering mother drop with capillary wave ripples
      const ripple = Math.sin(performance.now() * 0.005) * 2 * (1 - morph);
      const grad = ctx.createRadialGradient(
        cx - currentMotherRadius * 0.35,
        cy - currentMotherRadius * 0.35,
        currentMotherRadius * 0.1,
        cx,
        cy,
        currentMotherRadius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#38bdf8');
      grad.addColorStop(0.85, '#0284c7');
      grad.addColorStop(1, '#0369a1');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, currentMotherRadius + ripple, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      if (morph < 0.3) {
        // Radius vector
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + currentMotherRadius * 0.8, cy - currentMotherRadius * 0.6);
        ctx.stroke();

        ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(`R = ${initialRadiusMm.toFixed(1)} mm`, cx + 20, cy - 12);
      }
    }

    // Micro droplets: smoothly fly outward as morph increases
    if (morph > 0.02) {
      const droplets = animDropletsRef.current;
      droplets.forEach((d) => {
        const curX = cx + d.targetX * morph;
        const curY = cy + d.targetY * morph;
        const curR = d.r * Math.min(1.8, 0.4 + morph * 1.4);

        const grad = ctx.createRadialGradient(curX - 2, curY - 2, 1, curX, curY, curR * 2.2);
        grad.addColorStop(0, '#bae6fd');
        grad.addColorStop(0.5, '#0284c7');
        grad.addColorStop(1, '#0369a1');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(curX, curY, curR, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Status label below
    ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0369a1';
    ctx.textAlign = 'center';
    if (morph <= 0.05) {
      ctx.fillText(
        lang === 'bn' ? '১টি আদি বড় ফোঁটা (Single Mother Droplet)' : 'Single Mother Droplet (Initial)',
        cx,
        cy + baseDropRadiusPx + 28
      );
    } else if (morph >= 0.95) {
      ctx.fillText(
        `Split into n = 10^${dropletCountExp} (${n.toLocaleString()}) micro-droplets`,
        cx,
        cy + 155
      );
      ctx.font = '600 12px JetBrains Mono, monospace';
      ctx.fillStyle = '#059669';
      ctx.fillText(
        `r = ${rMm < 0.001 ? rMm.toExponential(2) : rMm.toFixed(4)} mm`,
        cx,
        cy + 175
      );
    } else {
      ctx.fillText(
        lang === 'bn'
          ? `ধীর ও মসৃণ রূপান্তর চলছে... (${Math.round(morph * 100)}%)`
          : `Smooth morphing in progress... (${Math.round(morph * 100)}%)`,
        cx,
        cy + 155
      );
    }
    ctx.textAlign = 'start';

    // Thermometer Widget on right side of canvas (tracks morph smoothly)
    const thermoX = w - 70;
    const thermoY = 100;
    const thermoH = 160;

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(thermoX, thermoY, 16, thermoH, 8);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(thermoX + 8, thermoY + thermoH + 10, 16, 0, Math.PI * 2);
    ctx.fillStyle = morph > 0.5 ? '#0284c7' : '#ea580c';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    // Mercury column drops as morph increases (cooling)
    const mercuryH = thermoH * (0.68 - morph * 0.36);
    ctx.fillStyle = morph > 0.5 ? '#0284c7' : '#ea580c';
    ctx.beginPath();
    ctx.roundRect(thermoX + 3, thermoY + thermoH - mercuryH, 10, mercuryH, 5);
    ctx.fill();

    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillStyle = morph > 0.5 ? '#0369a1' : '#c2410c';
    ctx.fillText(morph > 0.5 ? 'Δθ < 0 (Cool)' : 'T_base', thermoX - 75, thermoY + 22);
    ctx.font = '500 10px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(morph > 0.5 ? 'Heat absorbed' : 'Stable temp', thermoX - 75, thermoY + 38);
  };

  // 2. Draw Cleaved Diagram for Laplace's Law (Different for Soap Bubble, Water Drop, and Cylindrical Jet!)
  const drawExcessPressureDiagram = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number
  ) => {
    // Title
    ctx.font = 'bold 14px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      curvatureModel === 'cylindrical_jet'
        ? (lang === 'bn' ? 'সিলিন্ড্রিক্যাল তরল স্তম্ভের দ্বিখণ্ডিত রূপ (Cleaved Half-Cylinder)' : 'Cleaved Half-Cylinder Model')
        : curvatureModel === 'liquid_drop'
        ? (lang === 'bn' ? 'তরলের ফোঁটার দ্বিখণ্ডিত গোলার্ধ (Cleaved Single-Surface Liquid Drop)' : 'Cleaved Liquid Drop (Single Surface)')
        : (lang === 'bn' ? 'সাবানের বুদবুদের দ্বিখণ্ডিত গোলার্ধ (Cleaved Soap Bubble - Dual Films)' : 'Cleaved Soap Bubble (Two Concentric Films)'),
      30,
      35
    );

    ctx.font = '500 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      curvatureModel === 'cylindrical_jet'
        ? (lang === 'bn' ? 'আয়তাকার তলে চাপ বল (ΔP · 2RL) = দুটি সরলরেখা বরাবর পৃষ্ঠটানের টান (2TL)' : 'Pressure across rectangle (ΔP·2RL) = Tension along 2 straight edges (2TL)')
        : (lang === 'bn' ? 'বৃত্তাকার তলে চাপ বল (ΔP · πR²) = সমগ্র পরিধি জুড়ে অন্তর্মুখী পৃষ্ঠটান (4πRT বা 2πRT)' : 'Pressure across circular disk (ΔP·πR²) = Tension all around 360° circumference'),
      30,
      52
    );

    // =========================================================================
    // CASE A: CYLINDRICAL JET / LIQUID COLUMN (ΔP = T / R)
    // Sliced along longitudinal axial plane into Top and Bottom Half-Cylinders!
    // =========================================================================
    if (curvatureModel === 'cylindrical_jet') {
      const cylLen = Math.min(320, w * 0.48); // length L
      const cylR = Math.min(48, Math.max(30, bubbleRadiusMm * 2.0)); // radius R
      const vGap = 135; // vertical separation gap between cleaved half-cylinders
      const topBaseY = cy - 25 - vGap / 2;
      const botBaseY = cy - 25 + vGap / 2;
      const xL = cx - cylLen / 2;
      const xR = cx + cylLen / 2;
      const depthX = 36;
      const depthY = -22;

      ctx.save();

      // =======================================================================
      // 1. UPPER HALF-CYLINDER (Solid 3D Vault Arching UPWARD)
      // =======================================================================

      // A. Curved 3D Cylindrical Vault Shell
      ctx.beginPath();
      // Left arc arching UPWARD from front (xL, topBaseY) to back (xL + depthX, topBaseY + depthY)
      for (let i = 0; i <= 24; i++) {
        const theta = (i / 24) * Math.PI;
        const px = (xL + depthX / 2) - Math.cos(theta) * (depthX / 2);
        const py = (topBaseY + depthY / 2) - Math.cos(theta) * (depthY / 2) - Math.sin(theta) * cylR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      // Top-back straight edge: to (xR + depthX, topBaseY + depthY)
      ctx.lineTo(xR + depthX, topBaseY + depthY);
      // Right arc arching DOWNWARD from back to front
      for (let i = 24; i >= 0; i--) {
        const theta = (i / 24) * Math.PI;
        const px = (xR + depthX / 2) - Math.cos(theta) * (depthX / 2);
        const py = (topBaseY + depthY / 2) - Math.cos(theta) * (depthY / 2) - Math.sin(theta) * cylR;
        ctx.lineTo(px, py);
      }
      // Front straight edge back to (xL, topBaseY)
      ctx.lineTo(xL, topBaseY);
      ctx.closePath();

      const topRoofGrad = ctx.createLinearGradient(0, topBaseY - cylR - 10, 0, topBaseY + 5);
      topRoofGrad.addColorStop(0, 'rgba(186, 230, 253, 0.95)'); // crest highlight
      topRoofGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.8)');
      topRoofGrad.addColorStop(0.85, 'rgba(2, 132, 199, 0.85)');
      topRoofGrad.addColorStop(1, 'rgba(3, 105, 161, 0.9)');
      ctx.fillStyle = topRoofGrad;
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // B. Left Semicircular End-Cap (Arching UPWARD)
      ctx.beginPath();
      ctx.moveTo(xL, topBaseY);
      for (let i = 0; i <= 24; i++) {
        const theta = (i / 24) * Math.PI;
        const px = (xL + depthX / 2) - Math.cos(theta) * (depthX / 2);
        const py = (topBaseY + depthY / 2) - Math.cos(theta) * (depthY / 2) - Math.sin(theta) * cylR;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(xL, topBaseY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // C. Flat Rectangular Cut Base (2R x L) of Upper Half
      ctx.beginPath();
      ctx.moveTo(xL, topBaseY);
      ctx.lineTo(xR, topBaseY);
      ctx.lineTo(xR + depthX, topBaseY + depthY);
      ctx.lineTo(xL + depthX, topBaseY + depthY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // D. Outward Excess Pressure Vectors (Red) pushing UPWARD against curved roof
      for (let ix = 0; ix < 5; ix++) {
        const t = (ix + 1) / 6;
        const px = xL + t * cylLen + depthX * 0.45;
        const py = topBaseY + depthY * 0.45;
        const arrowLen = 28;

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - arrowLen);
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(px, py - arrowLen);
        ctx.lineTo(px - 4, py - arrowLen + 6);
        ctx.lineTo(px + 4, py - arrowLen + 6);
        ctx.closePath();
        ctx.fill();
      }

      // E. Surface Tension along the TWO Longitudinal Straight Edges of Length L
      // Front straight edge of length L
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(xL, topBaseY);
      ctx.lineTo(xR, topBaseY);
      ctx.stroke();

      // Back straight edge of length L
      ctx.beginPath();
      ctx.moveTo(xL + depthX, topBaseY + depthY);
      ctx.lineTo(xR + depthX, topBaseY + depthY);
      ctx.stroke();

      // Tensile arrows along both edges pulling DOWNWARD
      for (let i = 0; i < 4; i++) {
        const t = (i + 1) / 5;
        const axFront = xL + t * cylLen;
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(axFront, topBaseY);
        ctx.lineTo(axFront, topBaseY + 22);
        ctx.stroke();

        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.moveTo(axFront, topBaseY + 22);
        ctx.lineTo(axFront - 4, topBaseY + 16);
        ctx.lineTo(axFront + 4, topBaseY + 16);
        ctx.closePath();
        ctx.fill();
      }

      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.fillText('Upper Half: F_P = ΔP × 2RL (উর্ধ্বমুখী চাপ বল)', cx, topBaseY - cylR - 14);

      // =======================================================================
      // 2. LOWER HALF-CYLINDER (Solid 3D Trough Arching DOWNWARD)
      // =======================================================================

      // A. Curved 3D Cylindrical Trough Shell
      ctx.beginPath();
      // Left arc arching DOWNWARD from front (xL, botBaseY) to back (xL + depthX, botBaseY + depthY)
      for (let i = 0; i <= 24; i++) {
        const theta = (i / 24) * Math.PI;
        const px = (xL + depthX / 2) - Math.cos(theta) * (depthX / 2);
        const py = (botBaseY + depthY / 2) - Math.cos(theta) * (depthY / 2) + Math.sin(theta) * cylR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      // Back straight edge: to (xR + depthX, botBaseY + depthY)
      ctx.lineTo(xR + depthX, botBaseY + depthY);
      // Right arc arching UPWARD from back to front
      for (let i = 24; i >= 0; i--) {
        const theta = (i / 24) * Math.PI;
        const px = (xR + depthX / 2) - Math.cos(theta) * (depthX / 2);
        const py = (botBaseY + depthY / 2) - Math.cos(theta) * (depthY / 2) + Math.sin(theta) * cylR;
        ctx.lineTo(px, py);
      }
      // Front straight edge back to (xL, botBaseY)
      ctx.lineTo(xL, botBaseY);
      ctx.closePath();

      const botTroughGrad = ctx.createLinearGradient(0, botBaseY, 0, botBaseY + cylR + 10);
      botTroughGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
      botTroughGrad.addColorStop(0.65, 'rgba(2, 132, 199, 0.85)');
      botTroughGrad.addColorStop(1, 'rgba(3, 105, 161, 0.95)');
      ctx.fillStyle = botTroughGrad;
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // B. Left Semicircular End-Cap (Arching DOWNWARD)
      ctx.beginPath();
      ctx.moveTo(xL, botBaseY);
      for (let i = 0; i <= 24; i++) {
        const theta = (i / 24) * Math.PI;
        const px = (xL + depthX / 2) - Math.cos(theta) * (depthX / 2);
        const py = (botBaseY + depthY / 2) - Math.cos(theta) * (depthY / 2) + Math.sin(theta) * cylR;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(xL, botBaseY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // C. Flat Rectangular Cut Top Face (2R x L) of Lower Half
      ctx.beginPath();
      ctx.moveTo(xL, botBaseY);
      ctx.lineTo(xR, botBaseY);
      ctx.lineTo(xR + depthX, botBaseY + depthY);
      ctx.lineTo(xL + depthX, botBaseY + depthY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(5, 150, 105, 0.16)';
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // D. Outward Excess Pressure Vectors (Red) pushing DOWNWARD into trough
      for (let ix = 0; ix < 5; ix++) {
        const t = (ix + 1) / 6;
        const px = xL + t * cylLen + depthX * 0.45;
        const py = botBaseY + depthY * 0.45;
        const arrowLen = 28;

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + arrowLen);
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(px, py + arrowLen);
        ctx.lineTo(px - 4, py + arrowLen - 6);
        ctx.lineTo(px + 4, py + arrowLen - 6);
        ctx.closePath();
        ctx.fill();
      }

      // E. Surface Tension along the TWO Longitudinal Straight Edges of Length L
      // Front straight edge
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(xL, botBaseY);
      ctx.lineTo(xR, botBaseY);
      ctx.stroke();

      // Back straight edge
      ctx.beginPath();
      ctx.moveTo(xL + depthX, botBaseY + depthY);
      ctx.lineTo(xR + depthX, botBaseY + depthY);
      ctx.stroke();

      // Tensile arrows along both edges pulling UPWARD
      for (let i = 0; i < 4; i++) {
        const t = (i + 1) / 5;
        const axFront = xL + t * cylLen;
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(axFront, botBaseY);
        ctx.lineTo(axFront, botBaseY - 22);
        ctx.stroke();

        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.moveTo(axFront, botBaseY - 22);
        ctx.lineTo(axFront - 4, botBaseY - 16);
        ctx.lineTo(axFront + 4, botBaseY - 16);
        ctx.closePath();
        ctx.fill();
      }

      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#059669';
      ctx.textAlign = 'center';
      ctx.fillText('2 Straight Boundary Edges: F_T = 2 × (T · L) = 2TL (পৃষ্ঠটানের টান)', cx, botBaseY + cylR + 25);
      ctx.textAlign = 'start';

      // =======================================================================
      // 3. CENTRAL EQUILIBRIUM CARD (In the spacious vertical gap)
      // =======================================================================
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - 95, cy - 48, 190, 56, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText('EQUILIBRIUM (সাম্যাবস্থা)', cx, cy - 28);
      ctx.font = 'bold 14px JetBrains Mono, monospace';
      ctx.fillStyle = '#0284c7';
      ctx.fillText('F_P = F_T', cx, cy - 6);
      ctx.textAlign = 'start';

      // Derivation Box
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(30, h - 90, w - 60, 70, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(
        lang === 'bn' ? 'সিলিন্ড্রিক্যাল জেটের ল্যাপলাস প্রতিপাদন:' : 'Cylindrical Jet Laplace Derivation:',
        45,
        h - 68
      );
      ctx.font = 'bold 13px JetBrains Mono, monospace';
      ctx.fillStyle = '#0369a1';
      ctx.fillText(
        'ΔP · 2RL = 2 · (T · L)   ===>   ΔP · 2R = 2T   ===>   ΔP = T / R',
        45,
        h - 44
      );

      ctx.restore();
      return;
    }

    // =========================================================================
    // CASE B & C: SPHERICAL INTERFACES (Soap Bubble or Liquid Drop)
    // Sliced along equatorial circle into two cleaved hemispheres!
    // USER REQUIREMENTS:
    // 1. "ar duita hemisphere halka aktu dure shoraw" -> wide gap = 240 px
    // 2. "force line to pura circumference niyei thakbe agula thik koro....red line gula mainly nai"
    //    -> 360° rim force arrows on BOTH the Red Left Rim AND the Green Right Rim!
    // =========================================================================
    const bRadiusPx = Math.min(145, Math.max(85, bubbleRadiusMm * 4.8));
    const gap = 240; // generous distance so arrows and center card have plenty of room
    const leftCx = cx - bRadiusPx * 0.45 - gap / 2;
    const rightCx = cx + bRadiusPx * 0.45 + gap / 2;
    const hemiCy = cy - 15;
    const isSoap = curvatureModel === 'soap_bubble';

    // --- LEFT HEMISPHERE (Facing Right with flat cleavage disc) ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCx, hemiCy, bRadiusPx, Math.PI / 2, -Math.PI / 2, false);

    // Liquid drop has solid blue interior; soap bubble is a hollow translucent dome
    ctx.fillStyle = isSoap ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.6)';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    if (isSoap) {
      // Inner concentric film dome
      ctx.beginPath();
      ctx.arc(leftCx, hemiCy, bRadiusPx - 9, Math.PI / 2, -Math.PI / 2, false);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Flat cleavage disc of Left Hemisphere (facing right)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(leftCx, hemiCy, 18, bRadiusPx, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // USER REQUIREMENT FIX: "pura circusference jure force line nai....red line gula mainly nai"
    // 1. Draw 16 RED FORCE ARROWS all around the FULL 360° CIRCUMFERENCE of the red rim!
    const arrowCountRim = 16;
    for (let i = 0; i < arrowCountRim; i++) {
      const angle = (i / arrowCountRim) * Math.PI * 2;
      const startX = leftCx + Math.cos(angle) * 18;
      const startY = hemiCy + Math.sin(angle) * bRadiusPx;
      const arrowLen = 30;

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + arrowLen, startY);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(startX + arrowLen, startY);
      ctx.lineTo(startX + arrowLen - 6, startY - 3.5);
      ctx.lineTo(startX + arrowLen - 6, startY + 3.5);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Interior Pressure Vectors across the circular disk πR^2
    for (let i = 0; i < 8; i++) {
      const angle = ((i + 0.5) / 8) * Math.PI * 2;
      const startX = leftCx + Math.cos(angle) * 9;
      const startY = hemiCy + Math.sin(angle) * (bRadiusPx * 0.5);
      const arrowLen = 28;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + arrowLen, startY);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(startX + arrowLen, startY);
      ctx.lineTo(startX + arrowLen - 5, startY - 3);
      ctx.lineTo(startX + arrowLen - 5, startY + 3);
      ctx.closePath();
      ctx.fill();
    }
    // Center vector
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(leftCx, hemiCy);
    ctx.lineTo(leftCx + 32, hemiCy);
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(leftCx + 32, hemiCy);
    ctx.lineTo(leftCx + 26, hemiCy - 3.5);
    ctx.lineTo(leftCx + 26, hemiCy + 3.5);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'center';
    ctx.fillText('Left Cleaved Hemisphere', leftCx, hemiCy + bRadiusPx + 24);
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.fillText('F_P = ΔP × πR²', leftCx, hemiCy + bRadiusPx + 40);
    ctx.textAlign = 'start';

    // --- RIGHT HEMISPHERE (Facing Left) ---
    ctx.beginPath();
    ctx.arc(rightCx, hemiCy, bRadiusPx, -Math.PI / 2, Math.PI / 2, false);
    ctx.fillStyle = isSoap ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.6)';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    if (isSoap) {
      ctx.beginPath();
      ctx.arc(rightCx, hemiCy, bRadiusPx - 9, -Math.PI / 2, Math.PI / 2, false);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Flat cleavage disc of Right Hemisphere
    ctx.fillStyle = 'rgba(5, 150, 105, 0.12)';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.ellipse(rightCx, hemiCy, 18, bRadiusPx, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw surface tension arrows ALL AROUND THE FULL 360° CIRCUMFERENCE!
    for (let i = 0; i < arrowCountRim; i++) {
      const angle = (i / arrowCountRim) * Math.PI * 2;
      const startX = rightCx + Math.cos(angle) * 18;
      const startY = hemiCy + Math.sin(angle) * bRadiusPx;
      const arrowLen = 30;

      ctx.strokeStyle = '#059669'; // Deep Green
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX - arrowLen, startY);
      ctx.stroke();

      // Arrowhead pointing towards opposing hemisphere
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.moveTo(startX - arrowLen, startY);
      ctx.lineTo(startX - arrowLen + 6, startY - 3.5);
      ctx.lineTo(startX - arrowLen + 6, startY + 3.5);
      ctx.closePath();
      ctx.fill();
    }

    if (isSoap) {
      // Inner film rim arrows for Soap Bubble (2nd surface!)
      const innerRadius = bRadiusPx - 9;
      for (let i = 0; i < 12; i++) {
        const angle = ((i + 0.5) / 12) * Math.PI * 2;
        const startX = rightCx + Math.cos(angle) * 14;
        const startY = hemiCy + Math.sin(angle) * innerRadius;
        const arrowLen = 24;

        ctx.strokeStyle = '#10b981'; // Lighter Emerald for inner rim
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX - arrowLen, startY);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(startX - arrowLen, startY);
        ctx.lineTo(startX - arrowLen + 5, startY - 3.0);
        ctx.lineTo(startX - arrowLen + 5, startY + 3.0);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#059669';
    ctx.textAlign = 'center';
    ctx.fillText('Right Cleaved Hemisphere', rightCx, hemiCy + bRadiusPx + 24);
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    const tensFormula = isSoap ? 'F_T = 2 × (2πR) · T = 4πRT' : 'F_T = (2πR) · T';
    ctx.fillText(tensFormula, rightCx, hemiCy + bRadiusPx + 40);
    ctx.textAlign = 'start';

    // EQUILIBRIUM BADGE IN SPACIOUS CENTER
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 75, hemiCy - 28, 150, 56, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText('EQUILIBRIUM (সাম্যাবস্থা)', cx, hemiCy - 8);
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillStyle = '#0284c7';
    ctx.fillText('F_P = F_T', cx, hemiCy + 14);
    ctx.textAlign = 'start';

    // Derivation Box at bottom
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(30, h - 90, w - 60, 70, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      lang === 'bn' ? 'ল্যাপলাসের সমীকরণ প্রতিপাদন (Laplace Derivation):' : 'Laplace Mathematical Derivation:',
      45,
      h - 68
    );

    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillStyle = '#0369a1';
    if (isSoap) {
      ctx.fillText(
        'ΔP · πR² = 4πR · T   ===>   ΔP = 4T / R  (বাতাসে সাবানের বুদবুদে ২টি মুক্ত তল: ভেতরের ও বাইরের)',
        45,
        h - 44
      );
    } else {
      ctx.fillText(
        'ΔP · πR² = 2πR · T   ===>   ΔP = 2T / R  (পানির ফোঁটা / তরলের মধ্যে বায়ুর বুদবুদে ১টি মুক্ত তল)',
        45,
        h - 44
      );
    }

    ctx.restore();
  };

  // 3. Draw Two-Bubble Paradox Experiment Canvas
  const drawTwoBubbleCanvas = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number
  ) => {
    ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      lang === 'bn' ? 'দুই-বুদবুদ সংযোগ প্যারাডক্স (The Two-Bubble Paradox)' : 'Two-Bubble Connection Paradox',
      30,
      35
    );

    ctx.font = '500 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      lang === 'bn'
        ? 'ΔP = 4T/R অনুযায়ী ছোট বুদবুদের ভেতরের চাপ বেশি! ভালভ খুললে বাতাস ছোট থেকে বড়টিতে প্রবেশ করে।'
        : 'Since ΔP ∝ 1/R, the small bubble has higher internal pressure and blows into the large one!',
      30,
      52
    );

    const tubeY = cy + 45;
    const leftPipeX = cx - 180;
    const rightPipeX = cx + 180;

    // Connecting Glass Tube Pipe
    ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;

    ctx.fillRect(leftPipeX, tubeY - 9, rightPipeX - leftPipeX, 18);
    ctx.strokeRect(leftPipeX, tubeY - 9, rightPipeX - leftPipeX, 18);

    ctx.fillRect(leftPipeX - 10, tubeY - 50, 20, 50);
    ctx.strokeRect(leftPipeX - 10, tubeY - 50, 20, 50);

    ctx.fillRect(rightPipeX - 10, tubeY - 50, 20, 50);
    ctx.strokeRect(rightPipeX - 10, tubeY - 50, 20, 50);

    // Stopcock Valve in Center
    ctx.fillStyle = isValveOpen ? '#059669' : '#dc2626';
    ctx.beginPath();
    ctx.arc(cx, tubeY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isValveOpen) {
      ctx.moveTo(cx - 9, tubeY);
      ctx.lineTo(cx + 9, tubeY);
    } else {
      ctx.moveTo(cx, tubeY - 9);
      ctx.lineTo(cx, tubeY + 9);
    }
    ctx.stroke();

    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillStyle = isValveOpen ? '#059669' : '#dc2626';
    ctx.textAlign = 'center';
    ctx.fillText(isValveOpen ? 'VALVE OPEN (খোলা)' : 'VALVE CLOSED (বন্ধ)', cx, tubeY + 32);
    ctx.textAlign = 'start';

    // Left Bubble (Small Bubble 1)
    const bubble1RadiusPx = Math.max(18, simR1 * 3.8);
    const bubble1CenterY = tubeY - 50 - bubble1RadiusPx;

    const b1Grad = ctx.createRadialGradient(
      leftPipeX - bubble1RadiusPx * 0.3,
      bubble1CenterY - bubble1RadiusPx * 0.3,
      bubble1RadiusPx * 0.1,
      leftPipeX,
      bubble1CenterY,
      bubble1RadiusPx
    );
    b1Grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    b1Grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.45)');
    b1Grad.addColorStop(0.85, 'rgba(168, 85, 247, 0.4)');
    b1Grad.addColorStop(1, 'rgba(2, 132, 199, 0.8)');

    ctx.fillStyle = b1Grad;
    ctx.beginPath();
    ctx.arc(leftPipeX, bubble1CenterY, bubble1RadiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillStyle = '#dc2626';
    ctx.fillText(`R₁ = ${simR1.toFixed(1)} mm`, leftPipeX - 40, bubble1CenterY - bubble1RadiusPx - 15);
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.fillText(`ΔP₁ = ${p1.toFixed(1)} Pa (HIGHER!)`, leftPipeX - 70, bubble1CenterY - bubble1RadiusPx - 2);

    // Right Bubble (Large Bubble 2)
    const bubble2RadiusPx = Math.min(130, simR2 * 3.8);
    const bubble2CenterY = tubeY - 50 - bubble2RadiusPx;

    const b2Grad = ctx.createRadialGradient(
      rightPipeX - bubble2RadiusPx * 0.3,
      bubble2CenterY - bubble2RadiusPx * 0.3,
      bubble2RadiusPx * 0.1,
      rightPipeX,
      bubble2CenterY,
      bubble2RadiusPx
    );
    b2Grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    b2Grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.3)');
    b2Grad.addColorStop(0.85, 'rgba(168, 85, 247, 0.3)');
    b2Grad.addColorStop(1, 'rgba(2, 132, 199, 0.7)');

    ctx.fillStyle = b2Grad;
    ctx.beginPath();
    ctx.arc(rightPipeX, bubble2CenterY, bubble2RadiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillStyle = '#059669';
    ctx.fillText(`R₂ = ${simR2.toFixed(1)} mm`, rightPipeX - 35, bubble2CenterY - bubble2RadiusPx - 15);
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.fillText(`ΔP₂ = ${p2.toFixed(1)} Pa (LOWER)`, rightPipeX - 60, bubble2CenterY - bubble2RadiusPx - 2);

    // Airflow particles
    if (isValveOpen && simR1 > 6) {
      const now = performance.now();
      for (let i = 0; i < 8; i++) {
        const offset = (now * 0.15 + i * 45) % (rightPipeX - leftPipeX);
        const px = leftPipeX + offset;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, tubeY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 30, tubeY - 22);
      ctx.lineTo(cx + 30, tubeY - 22);
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(cx + 30, tubeY - 22);
      ctx.lineTo(cx + 24, tubeY - 26);
      ctx.lineTo(cx + 24, tubeY - 18);
      ctx.closePath();
      ctx.fill();

      ctx.font = '600 10px JetBrains Mono, monospace';
      ctx.fillStyle = '#0284c7';
      ctx.fillText('Air Flow (ছোট -> বড়)', cx - 50, tubeY - 30);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr_320px] gap-4 w-full max-w-[1720px] mx-auto p-4 items-start">
      {/* LEFT SIDEBAR: Controls Dock */}
      <aside className="bg-white rounded-2xl border border-sky-200 shadow-sm p-4 flex flex-col gap-4 text-slate-900 max-h-[calc(100vh-100px)] overflow-y-auto">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-950 mb-1">
            {lang === 'bn' ? '৩. পৃষ্ঠশক্তি ও অতিরিক্ত চাপ' : '3. Energy & Pressure Controls'}
          </h2>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? 'ফোঁটা বিভাজনে তাপগতিবিদ্যা ও বুদবুদের ভেতরের অতিরিক্ত চাপ'
              : 'Thermodynamics of droplet formation & excess internal pressure.'}
          </p>
        </div>

        {/* Sub-Section Switcher */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('splitting')}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
              activeTab === 'splitting'
                ? 'bg-sky-100/70 border-sky-400 text-sky-950 ring-1 ring-sky-300'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Split className="w-4 h-4 text-sky-600" />
              <span>{t.m3.tabs.splitting}</span>
            </div>
            {activeTab === 'splitting' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
          </button>

          <button
            onClick={() => setActiveTab('excess_pressure')}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
              activeTab === 'excess_pressure'
                ? 'bg-sky-100/70 border-sky-400 text-sky-950 ring-1 ring-sky-300'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>{t.m3.tabs.excess_pressure}</span>
            </div>
            {activeTab === 'excess_pressure' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </button>

          <button
            onClick={() => setActiveTab('two_bubble')}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
              activeTab === 'two_bubble'
                ? 'bg-sky-100/70 border-sky-400 text-sky-950 ring-1 ring-sky-300'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-purple-600" />
              <span>{t.m3.tabs.two_bubble}</span>
            </div>
            {activeTab === 'two_bubble' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
          </button>
        </div>

        {/* Dynamic Controls per Sub-Section */}
        {activeTab === 'splitting' && (
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-800">{t.m3.initialRadius} (R)</span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {initialRadiusMm.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={initialRadiusMm}
                onChange={(e) => setInitialRadiusMm(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-800">{t.m3.dropletCount} (n)</span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  10^{dropletCountExp} ({n.toLocaleString()})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={dropletCountExp}
                onChange={(e) => setDropletCountExp(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Split / Coalesce Action Buttons with Slow Smooth Transition */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleTriggerSplit}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all ${
                  targetMorphRef.current === 1.0
                    ? 'bg-sky-600 text-white'
                    : 'bg-white border border-sky-300 text-sky-900 hover:bg-sky-50'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>{t.m3.splitButton} (ধীর ও মসৃণ)</span>
              </button>

              <button
                onClick={handleTriggerCoalesce}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all ${
                  targetMorphRef.current === 0.0
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{t.m3.coalesceButton} (ধীর ও মসৃণ)</span>
              </button>

              {/* Transition status bar */}
              <div className="text-[10px] text-slate-500 font-mono mt-1 text-center">
                Morph Progress: {morphDisplayPercent}%
              </div>
            </div>
          </div>
        )}

        {activeTab === 'excess_pressure' && (
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                {t.m3.modelType}
              </label>
              <div className="flex flex-col gap-1.5">
                {(['soap_bubble', 'liquid_drop', 'cylindrical_jet'] as BubbleCurvatureModel[]).map(
                  (m) => (
                    <button
                      key={m}
                      onClick={() => setCurvatureModel(m)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                        curvatureModel === m
                          ? 'bg-sky-50 border-emerald-500 font-bold text-slate-950 ring-1 ring-emerald-400'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="leading-tight">{t.m3.models[m]}</div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Bubble Radius Slider (Default larger) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-800">{t.m3.bubbleRadius} (R)</span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {bubbleRadiusMm} mm
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="45"
                step="1"
                value={bubbleRadiusMm}
                onChange={(e) => setBubbleRadiusMm(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>8 mm</span>
                <span>24 mm (Default)</span>
                <span>45 mm</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'two_bubble' && (
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-800">{t.m3.bubble1Radius} (R₁)</span>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {r1Mm.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="20"
                step="0.5"
                value={r1Mm}
                disabled={isValveOpen}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setR1Mm(val);
                  setSimR1(val);
                }}
                className="w-full accent-emerald-600"
              />
              <span className="text-[10px] text-slate-400 font-mono">Small Bubble (High ΔP)</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-800">{t.m3.bubble2Radius} (R₂)</span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {r2Mm.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min="22"
                max="50"
                step="1"
                value={r2Mm}
                disabled={isValveOpen}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setR2Mm(val);
                  setSimR2(val);
                }}
                className="w-full accent-emerald-600"
              />
              <span className="text-[10px] text-slate-400 font-mono">Large Bubble (Low ΔP)</span>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setIsValveOpen(!isValveOpen)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors ${
                  isValveOpen
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <span>{isValveOpen ? t.m3.closeValve : t.m3.openValve}</span>
              </button>

              <button
                onClick={() => {
                  setIsValveOpen(false);
                  setSimR1(r1Mm);
                  setSimR2(r2Mm);
                }}
                className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                {t.reset}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* CENTER STAGE: Canvas */}
      <main className="bg-white rounded-2xl border border-sky-200 shadow-sm p-3 flex flex-col gap-2 min-h-[640px]">
        {/* Canvas Toolbar Info */}
        <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-600 bg-sky-50/70 rounded-xl border border-sky-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="font-bold text-slate-900">
              {activeTab === 'splitting'
                ? t.m3.subA_title
                : activeTab === 'excess_pressure'
                ? curvatureModel === 'cylindrical_jet'
                  ? (lang === 'bn' ? 'সিলিন্ড্রিক্যাল তরল স্তম্ভের দ্বিখণ্ডিত রূপ (Cleaved Half-Cylinder)' : 'Cleaved Half-Cylinder Model')
                  : curvatureModel === 'liquid_drop'
                  ? (lang === 'bn' ? 'তরলের ফোঁটার দ্বিখণ্ডিত গোলার্ধ (Cleaved Liquid Drop)' : 'Cleaved Single-Surface Drop')
                  : (lang === 'bn' ? 'সাবানের বুদবুদের দ্বিখণ্ডিত গোলার্ধ (Cleaved Soap Bubble)' : 'Cleaved Soap Bubble')
                : t.m3.subC_title}
            </span>
          </div>

          <span className="font-mono text-sky-800 text-[11px] font-bold">
            {activeTab === 'splitting'
              ? 'Δθ = W / (ms)'
              : curvatureModel === 'cylindrical_jet'
              ? 'ΔP = T / R'
              : curvatureModel === 'liquid_drop'
              ? 'ΔP = 2T / R'
              : 'ΔP = 4T / R'}
          </span>
        </div>

        {/* Canvas Element */}
        <div className="relative w-full flex-1 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[580px]">
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Contextual Banner for Two-Bubble Paradox */}
          {activeTab === 'two_bubble' && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md border border-purple-200 p-2.5 rounded-xl shadow-xs text-xs text-slate-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                {t.m3.paradoxExplanation}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT TELEMETRY: Dynamic Math Monitors */}
      <aside className="bg-white rounded-2xl border border-sky-200 shadow-sm p-4 flex flex-col gap-4 text-slate-900">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-950 mb-1">
            {lang === 'bn' ? 'গাণিতিক বিশ্লেষণ' : 'Mathematical Readouts'}
          </h2>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? 'বাস্তব সময়ে পরিবর্তনশীল সমীকরণ ও মানসমূহ'
              : 'Live algebraic substitution and thermodynamic metrics.'}
          </p>
        </div>

        {activeTab === 'splitting' && (
          <>
            <div className="bg-sky-50/80 p-3.5 rounded-xl border border-sky-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-sky-900">{t.m3.resultingRadius}</span>
                <span className="text-[11px] font-mono text-sky-700 font-bold">r = R·n^(-1/3)</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-950 tabular-nums">
                {rMm < 0.001 ? rMm.toExponential(3) : rMm.toFixed(4)}{' '}
                <span className="text-xs font-normal text-slate-600">mm</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-slate-800">{t.m3.surfaceAreaChange}</span>
                <span className="text-[11px] font-mono text-emerald-600 font-bold">ΔA</span>
              </div>
              <div className="text-lg font-bold font-mono text-emerald-800 tabular-nums">
                {(deltaArea * 10000).toFixed(4)}{' '}
                <span className="text-xs font-normal text-slate-600">cm²</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                A_init: {(initialArea * 10000).toFixed(4)} cm² → A_final: {(finalArea * 10000).toFixed(4)} cm²
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-slate-800">{t.m3.workEnergy}</span>
                <span className="text-[11px] font-mono text-sky-600 font-bold">W = T·ΔA</span>
              </div>
              <div className="text-xl font-bold font-mono text-sky-950 tabular-nums">
                {(workDone * 1000).toFixed(4)}{' '}
                <span className="text-xs font-normal text-slate-600">mJ</span>
              </div>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-300">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-emerald-950">{t.m3.tempChange}</span>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">Δθ = W/(ms)</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-900 tabular-nums">
                {deltaThetaCoalescence < 0.0001
                  ? deltaThetaCoalescence.toExponential(3)
                  : deltaThetaCoalescence.toFixed(4)}{' '}
                <span className="text-xs font-normal text-slate-600">°C (K)</span>
              </div>
              <div className="text-[11px] font-mono text-emerald-800 mt-1">
                {morphProgressRef.current > 0.5 ? t.m3.absorbsHeat : t.m3.releasesHeat}
              </div>
            </div>
          </>
        )}

        {activeTab === 'excess_pressure' && (
          <>
            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-emerald-900">{t.m3.excessPressure}</span>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">{modelFormula}</span>
              </div>
              <div className="text-3xl font-bold font-mono text-emerald-950 tabular-nums">
                {excessPressure.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-600">Pa (N/m²)</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1">{modelDesc}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-semibold text-slate-800 mb-1">{t.m3.pressureBalance}</div>
              <div className="text-xs font-mono text-slate-700 space-y-1">
                {curvatureModel === 'cylindrical_jet' ? (
                  <>
                    <div>Pressure Force F_P = ΔP × 2RL</div>
                    <div>Surface Tension F_T = 2 × (T · L) = 2TL</div>
                    <div className="font-bold text-slate-900 pt-1">
                      {'ΔP · 2RL = 2TL  ==>  ΔP = T / R'}
                    </div>
                  </>
                ) : (
                  <>
                    <div>Pressure Force F_P = ΔP × πR²</div>
                    <div>
                      Surface Tension F_T = {curvatureModel === 'soap_bubble' ? '4πRT (2 surfaces)' : '2πRT (1 surface)'}
                    </div>
                    <div className="font-bold text-slate-900 pt-1">
                      {curvatureModel === 'soap_bubble' ? 'ΔP · πR² = 4πRT  ==>  ΔP = 4T/R' : 'ΔP · πR² = 2πRT  ==>  ΔP = 2T/R'}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 text-[11px] text-slate-700">
              <div className="font-bold text-sky-950 mb-1">
                {curvatureModel === 'cylindrical_jet'
                  ? (lang === 'bn' ? 'সিলিন্ড্রিক্যাল জেটের প্রমাণ' : 'Cylindrical Jet Proof')
                  : (lang === 'bn' ? 'দ্বিখণ্ডিত গোলার্ধের প্রমাণ' : 'Dual Hemispheres Proof')}
              </div>
              <p className="leading-relaxed">
                {curvatureModel === 'cylindrical_jet'
                  ? (lang === 'bn'
                      ? 'সিলিন্ড্রিক্যাল তরল স্তম্ভকে অক্ষ বরাবর কাটলে আয়তাকার ক্ষেত্রফল 2R×L এ চাপ বল = ΔP·2RL। এর দুই প্রান্তিক সরলরেখা বরাবর পৃষ্ঠটানের বল = 2TL। ফলে ΔP = T/R।'
                      : 'Slicing a liquid cylinder longitudinally yields rectangular cut area 2R×L. Opposing surface tension acts along the two straight edges of length L (2TL), yielding ΔP = T/R.')
                  : curvatureModel === 'soap_bubble'
                  ? (lang === 'bn'
                      ? 'সাবানের বুদবুদে ভেতরের ও বাইরের দুটি মুক্ত তল থাকায় পরিধি বরাবর পৃষ্ঠটান বল দ্বিগুণ (4πRT), ফলে অতিরিক্ত চাপ ΔP = 4T/R।'
                      : 'Soap bubble has two concentric film interfaces (inner and outer). Opposing tensile rim force is 4πRT, yielding ΔP = 4T/R.')
                  : (lang === 'bn'
                      ? 'পানির ফোঁটায় কেবল ১টি বাইরের তল থাকায় পরিধি বরাবর পৃষ্ঠটান বল = 2πRT, ফলে অতিরিক্ত চাপ ΔP = 2T/R।'
                      : 'Liquid drop has only one liquid-air boundary surface. Rim tensile force is 2πRT, yielding ΔP = 2T/R.')}
              </p>
            </div>
          </>
        )}

        {activeTab === 'two_bubble' && (
          <>
            <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-rose-900">{t.m3.pressure1}</span>
                <span className="text-[11px] font-mono text-rose-700 font-bold">4T/R₁</span>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-950 tabular-nums">
                {p1.toFixed(1)} <span className="text-xs font-normal text-slate-600">Pa</span>
              </div>
              <div className="text-[11px] font-mono text-rose-800 mt-1">
                R₁ = {simR1.toFixed(1)} mm (High curvature)
              </div>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-emerald-900">{t.m3.pressure2}</span>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">4T/R₂</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-950 tabular-nums">
                {p2.toFixed(1)} <span className="text-xs font-normal text-slate-600">Pa</span>
              </div>
              <div className="text-[11px] font-mono text-emerald-800 mt-1">
                R₂ = {simR2.toFixed(1)} mm (Low curvature)
              </div>
            </div>

            <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-purple-900">{t.m3.pressureDiff}</span>
                <span className="text-[11px] font-mono text-purple-700 font-bold">ΔP₁ - ΔP₂</span>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-950 tabular-nums">
                {pDiff.toFixed(1)} <span className="text-xs font-normal text-slate-600">Pa</span>
              </div>
              <div className="text-[11px] text-purple-900 mt-1 font-medium">
                {pDiff > 0
                  ? (lang === 'bn' ? 'বায়ু প্রবাহ: ছোট → বড়' : 'Air Driving Direction: Small → Large')
                  : 'Balanced'}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};
