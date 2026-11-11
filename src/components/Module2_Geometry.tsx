import React, { useState, useEffect, useRef } from 'react';
import { Language, SpecimenType } from '../types';
import { translations } from '../translations';
import { SPECIMENS, MATERIALS } from '../physicsData';
import {
  Rotate3d,
  ArrowUp,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2,
  Gauge,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Layers,
} from 'lucide-react';

interface Module2Props {
  lang: Language;
}

export const Module2_Geometry: React.FC<Module2Props> = ({ lang }) => {
  const t = translations[lang];

  // Specimen selection
  const [selectedSpecimen, setSelectedSpecimen] = useState<SpecimenType>('wire_ring');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('iron');

  // Geometric dimensions (in meters)
  const [lengthVal, setLengthVal] = useState<number>(0.08); // 8 cm
  const [radiusVal, setRadiusVal] = useState<number>(0.035); // 3.5 cm
  const [innerRadiusVal, setInnerRadiusVal] = useState<number>(0.030); // 3.0 cm
  const [widthVal, setWidthVal] = useState<number>(0.04); // 4 cm
  const [thicknessVal, setThicknessVal] = useState<number>(0.002); // 2 mm

  // Liquid parameters
  const [surfaceTension, setSurfaceTension] = useState<number>(0.0728); // Water default N/m

  // Pull / spring balance elevation (0 to 1)
  const [pullHeight, setPullHeight] = useState<number>(0.2); // 0 = resting, 1.0 = max pull
  const [isSnapped, setIsSnapped] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);

  // User requested: "2nd module tate cut ta horijontally na cut korbo vertically...vertically cut korara por object baki part ta thakbe na amon kore daw...ar contact length o change hoye jabe"
  const [isVerticalCut, setIsVerticalCut] = useState<boolean>(false);

  // 3D Camera Angles & High-Range Zoom
  const yawRef = useRef<number>(0.6); // Horizontal rotation in radians
  const pitchRef = useRef<number>(0.4); // Vertical tilt in radians
  const zoomRef = useRef<number>(1.1); // Zoom factor
  const [zoomDisplay, setZoomDisplay] = useState<number>(1.1);
  const isDraggingCanvasRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Splash particle animation when film snaps
  const snapParticlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);

  const spec = SPECIMENS[selectedSpecimen];
  const mat = MATERIALS.find((m) => m.id === selectedMaterial) || MATERIALS[0];

  // Full Effective Length (L_full) Calculation
  let fullEffectiveLength = 0;
  let formulaExpanded = '';

  switch (selectedSpecimen) {
    case 'needle':
      fullEffectiveLength = 2 * lengthVal;
      formulaExpanded = `L = 2 × l = 2 × ${(lengthVal * 100).toFixed(1)} cm = ${(fullEffectiveLength * 100).toFixed(2)} cm`;
      break;
    case 'rect_plate':
      fullEffectiveLength = 2 * (lengthVal + widthVal);
      formulaExpanded = `L = 2 × (l + b) = 2 × (${(lengthVal * 100).toFixed(1)} + ${(widthVal * 100).toFixed(1)}) = ${(fullEffectiveLength * 100).toFixed(2)} cm`;
      break;
    case 'wire_ring':
      fullEffectiveLength = 2 * Math.PI * (innerRadiusVal + radiusVal);
      formulaExpanded = `L = 2π(r₁ + r₂) = 2π × (${(innerRadiusVal * 100).toFixed(1)} + ${(radiusVal * 100).toFixed(1)}) = ${(fullEffectiveLength * 100).toFixed(2)} cm`;
      break;
    case 'disc':
      fullEffectiveLength = 2 * Math.PI * radiusVal;
      formulaExpanded = `L = 2π × r = 2π × ${(radiusVal * 100).toFixed(1)} cm = ${(fullEffectiveLength * 100).toFixed(2)} cm`;
      break;
    case 'solid_cylinder':
      fullEffectiveLength = 2 * Math.PI * radiusVal;
      formulaExpanded = `L = 2π × r = 2π × ${(radiusVal * 100).toFixed(1)} cm = ${(fullEffectiveLength * 100).toFixed(2)} cm`;
      break;
    case 'hollow_cylinder':
      fullEffectiveLength = 2 * Math.PI * (innerRadiusVal + radiusVal);
      formulaExpanded = `L = 2π(r_in + r_out) = 2π × (${(innerRadiusVal * 100).toFixed(1)} + ${(radiusVal * 100).toFixed(1)}) = ${(fullEffectiveLength * 100).toFixed(2)} cm`;
      break;
    case 'sphere_detachment':
      fullEffectiveLength = 2 * Math.PI * radiusVal;
      formulaExpanded = `L = 2π × r_neck = 2π × ${(radiusVal * 100).toFixed(1)} cm = ${(fullEffectiveLength * 100).toFixed(2)} cm`;
      break;
  }

  // Active contact length (halved if vertically cut as requested)
  const effectiveLength = isVerticalCut ? fullEffectiveLength / 2 : fullEffectiveLength;

  // Volume & Weight Calculation
  let volume = 0; // m^3
  switch (selectedSpecimen) {
    case 'needle':
      volume = Math.PI * Math.pow(0.0006, 2) * lengthVal;
      break;
    case 'rect_plate':
      volume = lengthVal * widthVal * thicknessVal;
      break;
    case 'wire_ring':
      const ringWireRadius = (radiusVal - innerRadiusVal) / 2;
      volume = 2 * Math.PI * radiusVal * Math.PI * Math.pow(Math.max(0.0005, ringWireRadius), 2);
      break;
    case 'disc':
      volume = Math.PI * Math.pow(radiusVal, 2) * thicknessVal;
      break;
    case 'solid_cylinder':
      volume = Math.PI * Math.pow(radiusVal, 2) * 0.05;
      break;
    case 'hollow_cylinder':
      volume = Math.PI * (Math.pow(radiusVal, 2) - Math.pow(innerRadiusVal, 2)) * 0.05;
      break;
    case 'sphere_detachment':
      volume = (4 / 3) * Math.PI * Math.pow(radiusVal, 3);
      break;
  }

  const baseMassKg = Math.max(0.001, volume * mat.density);
  const massKg = isVerticalCut ? baseMassKg / 2 : baseMassKg;
  const gravityForce = massKg * 9.80665; // W = mg
  const surfaceTensionForce = isSnapped ? 0 : surfaceTension * effectiveLength;
  const totalPullRequired = gravityForce + surfaceTension * effectiveLength;

  // Zoom control helpers
  const handleZoomIn = () => {
    zoomRef.current = Math.min(3.5, zoomRef.current + 0.35);
    setZoomDisplay(zoomRef.current);
  };

  const handleZoomOut = () => {
    zoomRef.current = Math.max(0.6, zoomRef.current - 0.35);
    setZoomDisplay(zoomRef.current);
  };

  const handleResetZoom = () => {
    zoomRef.current = 1.1;
    setZoomDisplay(1.1);
  };

  // Meniscus snap threshold
  useEffect(() => {
    if (pullHeight >= 0.75 && !isSnapped) {
      setIsSnapped(true);
      const parts = [];
      for (let i = 0; i < 35; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 5;
        parts.push({
          x: 0,
          y: 0,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 3,
          life: 1.0,
        });
      }
      snapParticlesRef.current = parts;
    } else if (pullHeight < 0.35 && isSnapped) {
      setIsSnapped(false);
    }
  }, [pullHeight, isSnapped]);

  // Main 3D Rendering on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      if (isAutoRotating && !isDraggingCanvasRef.current) {
        yawRef.current += dt * 0.32;
      }

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

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, displayH);
      bgGrad.addColorStop(0, '#f0f9ff');
      bgGrad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, displayW, displayH);

      // 3D Projection Engine
      const cx = displayW / 2;
      const cy = displayH / 2 + 25;
      const fov = 380 * zoomRef.current;
      const camDist = 480;

      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const project = (x: number, y: number, z: number) => {
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;

        const distance = z2 + camDist;
        const scale = distance > 10 ? fov / distance : 0;
        return {
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          scale,
          depth: z2,
        };
      };

      // 1. Water Reservoir Rim & Surface
      const poolRadius = 180;
      const waterLevelY = 40;

      // Draw Pool Basin Ring
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        const pt = project(Math.cos(theta) * poolRadius, waterLevelY + 30, Math.sin(theta) * poolRadius);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Water surface plane
      ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        const pt = project(Math.cos(theta) * poolRadius, waterLevelY, Math.sin(theta) * poolRadius);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Lift position
      const maxLiftPx = 75;
      const currentLiftY = waterLevelY - pullHeight * maxLiftPx;

      // 2. Capillary Meniscus (if not snapped)
      if (!isSnapped && pullHeight > 0.05) {
        drawCapillaryMeniscus(
          ctx,
          project,
          selectedSpecimen,
          currentLiftY,
          waterLevelY,
          radiusVal,
          innerRadiusVal,
          lengthVal,
          widthVal,
          isVerticalCut
        );
      }

      // 3. Draw 3D Specimen Object (Solid Black, vertically cut with other half removed if active)
      drawSpecimenObject(
        ctx,
        project,
        selectedSpecimen,
        currentLiftY,
        radiusVal,
        innerRadiusVal,
        lengthVal,
        widthVal,
        thicknessVal,
        isVerticalCut
      );

      // 4. Highlight Contact Wetting Perimeter in DEEP GREEN
      if (!isSnapped) {
        drawDeepGreenWettingContour(
          ctx,
          project,
          selectedSpecimen,
          currentLiftY,
          radiusVal,
          innerRadiusVal,
          lengthVal,
          widthVal,
          isVerticalCut
        );
      }

      // 5. Suspension Wire
      const topHookPt = project(0, currentLiftY - 110, 0);
      const objCenterPt = project(isVerticalCut ? radiusVal * 500 : 0, currentLiftY, 0);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(topHookPt.x, Math.max(20, topHookPt.y));
      ctx.lineTo(objCenterPt.x, objCenterPt.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(topHookPt.x, Math.max(25, topHookPt.y), 5, 0, Math.PI * 2);
      ctx.fill();

      // 6. Draw Splash Particles
      if (snapParticlesRef.current.length > 0) {
        for (let i = snapParticlesRef.current.length - 1; i >= 0; i--) {
          const p = snapParticlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.25;
          p.life -= 0.025;

          const partPt = project(p.x, waterLevelY + p.y, 0);
          ctx.fillStyle = `rgba(2, 132, 199, ${p.life})`;
          ctx.beginPath();
          ctx.arc(partPt.x, partPt.y, 3 * p.life, 0, Math.PI * 2);
          ctx.fill();

          if (p.life <= 0) snapParticlesRef.current.splice(i, 1);
        }
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [
    selectedSpecimen,
    selectedMaterial,
    pullHeight,
    isSnapped,
    isAutoRotating,
    isVerticalCut,
    lengthVal,
    radiusVal,
    innerRadiusVal,
    widthVal,
    thicknessVal,
    surfaceTension,
  ]);

  // Draw Capillary Meniscus
  const drawCapillaryMeniscus = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z: number) => { x: number; y: number; scale: number },
    type: SpecimenType,
    objY: number,
    waterY: number,
    r: number,
    rIn: number,
    len: number,
    w: number,
    isCut: boolean
  ) => {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.6)';
    ctx.lineWidth = 1;

    const rPx = r * 1400;
    const rInPx = rIn * 1400;

    // Angle range: full [0, 2π] or vertical cut [-π/2, π/2] (half removed)
    const startAngle = isCut ? -Math.PI / 2 : 0;
    const endAngle = isCut ? Math.PI / 2 : Math.PI * 2;

    if (
      type === 'wire_ring' ||
      type === 'disc' ||
      type === 'solid_cylinder' ||
      type === 'sphere_detachment' ||
      type === 'hollow_cylinder'
    ) {
      ctx.beginPath();
      const segments = isCut ? 24 : 48;
      const skirtOuterR = rPx + 14;
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle);
        const topPt = project(Math.cos(theta) * rPx, objY, Math.sin(theta) * rPx);
        const botPt = project(Math.cos(theta) * skirtOuterR, waterY, Math.sin(theta) * skirtOuterR);
        if (i === 0) ctx.moveTo(botPt.x, botPt.y);
        ctx.lineTo(topPt.x, topPt.y);
      }
      ctx.fill();

      if (type === 'wire_ring' || type === 'hollow_cylinder') {
        ctx.beginPath();
        const skirtInnerR = Math.max(5, rInPx - 10);
        for (let i = 0; i <= segments; i++) {
          const theta = startAngle + (i / segments) * (endAngle - startAngle);
          const topPt = project(Math.cos(theta) * rInPx, objY, Math.sin(theta) * rInPx);
          const botPt = project(Math.cos(theta) * skirtInnerR, waterY, Math.sin(theta) * skirtInnerR);
          if (i === 0) ctx.moveTo(botPt.x, botPt.y);
          ctx.lineTo(topPt.x, topPt.y);
        }
        ctx.fill();
      }
    } else if (type === 'needle') {
      const halfL = (len * 1000) / 2;
      const minX = isCut ? 0 : -halfL;
      [-6, 6].forEach((sideZ) => {
        const p1 = project(minX, objY, sideZ);
        const p2 = project(halfL, objY, sideZ);
        const p3 = project(halfL, waterY, sideZ * 2.5);
        const p4 = project(minX, waterY, sideZ * 2.5);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    } else if (type === 'rect_plate') {
      const halfL = (len * 1000) / 2;
      const halfW = (w * 1000) / 2;
      const minX = isCut ? 0 : -halfL;
      const corners = [
        { x: minX, z: -halfW },
        { x: halfL, z: -halfW },
        { x: halfL, z: halfW },
        { x: minX, z: halfW },
      ];
      ctx.beginPath();
      corners.forEach((c, idx) => {
        const next = corners[(idx + 1) % corners.length];
        const pTop1 = project(c.x, objY, c.z);
        const pTop2 = project(next.x, objY, next.z);
        const pBot2 = project(next.x * 1.15, waterY, next.z * 1.15);
        const pBot1 = project(c.x * 1.15, waterY, c.z * 1.15);

        ctx.moveTo(pTop1.x, pTop1.y);
        ctx.lineTo(pTop2.x, pTop2.y);
        ctx.lineTo(pBot2.x, pBot2.y);
        ctx.lineTo(pBot1.x, pBot1.y);
      });
      ctx.fill();
      ctx.stroke();
    }
  };

  // Draw 3D Specimen Models in SOLID BLACK with VERTICAL CUT
  const drawSpecimenObject = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z: number) => { x: number; y: number; scale: number },
    type: SpecimenType,
    objY: number,
    r: number,
    rIn: number,
    len: number,
    w: number,
    thick: number,
    isCut: boolean
  ) => {
    const fillCol = '#0f172a'; // Deep slate-900 / black body
    const cutPlaneFill = '#1e293b'; // Cut face interior
    const strokeCol = '#334155'; // Metallic edge highlight

    const rPx = r * 1400;
    const rInPx = rIn * 1400;
    const halfL = (len * 1000) / 2;
    const halfW = (w * 1000) / 2;

    const startAngle = isCut ? -Math.PI / 2 : 0;
    const endAngle = isCut ? Math.PI / 2 : Math.PI * 2;

    ctx.fillStyle = fillCol;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.0;

    if (type === 'needle') {
      const minX = isCut ? 0 : -halfL;
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const th1 = (i / steps) * Math.PI * 2;
        const th2 = ((i + 1) / steps) * Math.PI * 2;
        const needleR = 5;
        const p1 = project(minX, objY + Math.sin(th1) * needleR, Math.cos(th1) * needleR);
        const p2 = project(halfL, objY + Math.sin(th1) * needleR, Math.cos(th1) * needleR);
        const p3 = project(halfL, objY + Math.sin(th2) * needleR, Math.cos(th2) * needleR);
        const p4 = project(minX, objY + Math.sin(th2) * needleR, Math.cos(th2) * needleR);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // If vertically cut: draw circular cut face at x = 0
      if (isCut) {
        ctx.fillStyle = cutPlaneFill;
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const th = (i / steps) * Math.PI * 2;
          const pt = project(0, objY + Math.sin(th) * 5, Math.cos(th) * 5);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (type === 'rect_plate') {
      const plateH = Math.max(6, thick * 8000);
      const minX = isCut ? 0 : -halfL;

      const topPts = [
        project(minX, objY - plateH, -halfW),
        project(halfL, objY - plateH, -halfW),
        project(halfL, objY - plateH, halfW),
        project(minX, objY - plateH, halfW),
      ];
      const botPts = [
        project(minX, objY, -halfW),
        project(halfL, objY, -halfW),
        project(halfL, objY, halfW),
        project(minX, objY, halfW),
      ];

      ctx.beginPath();
      topPts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        ctx.beginPath();
        ctx.moveTo(topPts[i].x, topPts[i].y);
        ctx.lineTo(topPts[next].x, topPts[next].y);
        ctx.lineTo(botPts[next].x, botPts[next].y);
        ctx.lineTo(botPts[i].x, botPts[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // If vertically cut: draw vertical cut face at x = 0
      if (isCut) {
        ctx.fillStyle = cutPlaneFill;
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        const p1 = project(0, objY - plateH, -halfW);
        const p2 = project(0, objY - plateH, halfW);
        const p3 = project(0, objY, halfW);
        const p4 = project(0, objY, -halfW);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (type === 'wire_ring') {
      const segments = isCut ? 32 : 64;
      // Outer hoop
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle);
        const pt = project(Math.cos(theta) * rPx, objY, Math.sin(theta) * rPx);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Inner hoop
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle);
        const pt = project(Math.cos(theta) * rInPx, objY, Math.sin(theta) * rInPx);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Suspension threads
      const hookPt = project(0, objY - 45, 0);
      const threadCount = isCut ? 2 : 3;
      for (let i = 0; i < threadCount; i++) {
        const theta = isCut ? (i === 0 ? -Math.PI / 4 : Math.PI / 4) : (i / 3) * Math.PI * 2;
        const ringAttachPt = project(Math.cos(theta) * rPx, objY, Math.sin(theta) * rPx);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hookPt.x, hookPt.y);
        ctx.lineTo(ringAttachPt.x, ringAttachPt.y);
        ctx.stroke();
      }

      // Vertical cut end-caps
      if (isCut) {
        [-1, 1].forEach((sign) => {
          const cutPt = project(0, objY, sign * ((rPx + rInPx) / 2));
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(cutPt.x, cutPt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    } else if (type === 'disc') {
      const discH = 6;
      const segments = isCut ? 24 : 48;

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle);
        const pt = project(Math.cos(theta) * rPx, objY - discH, Math.sin(theta) * rPx);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      if (isCut) {
        ctx.lineTo(project(0, objY - discH, 0).x, project(0, objY - discH, 0).y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Disc edge
      for (let i = 0; i < segments; i++) {
        const th1 = startAngle + (i / segments) * (endAngle - startAngle);
        const th2 = startAngle + ((i + 1) / segments) * (endAngle - startAngle);
        const p1 = project(Math.cos(th1) * rPx, objY - discH, Math.sin(th1) * rPx);
        const p2 = project(Math.cos(th2) * rPx, objY - discH, Math.sin(th2) * rPx);
        const p3 = project(Math.cos(th2) * rPx, objY, Math.sin(th2) * rPx);
        const p4 = project(Math.cos(th1) * rPx, objY, Math.sin(th1) * rPx);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Vertical cut plane for disc
      if (isCut) {
        ctx.fillStyle = cutPlaneFill;
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        const p1 = project(0, objY - discH, -rPx);
        const p2 = project(0, objY - discH, rPx);
        const p3 = project(0, objY, rPx);
        const p4 = project(0, objY, -rPx);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (type === 'solid_cylinder' || type === 'hollow_cylinder') {
      const cylH = 50;
      const segments = isCut ? 16 : 32;

      for (let i = 0; i < segments; i++) {
        const th1 = startAngle + (i / segments) * (endAngle - startAngle);
        const th2 = startAngle + ((i + 1) / segments) * (endAngle - startAngle);
        const p1 = project(Math.cos(th1) * rPx, objY - cylH, Math.sin(th1) * rPx);
        const p2 = project(Math.cos(th2) * rPx, objY - cylH, Math.sin(th2) * rPx);
        const p3 = project(Math.cos(th2) * rPx, objY, Math.sin(th2) * rPx);
        const p4 = project(Math.cos(th1) * rPx, objY, Math.sin(th1) * rPx);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Top face
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle);
        const pt = project(Math.cos(theta) * rPx, objY - cylH, Math.sin(theta) * rPx);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      if (isCut) {
        ctx.lineTo(project(0, objY - cylH, rPx).x, project(0, objY - cylH, rPx).y);
        ctx.lineTo(project(0, objY - cylH, -rPx).x, project(0, objY - cylH, -rPx).y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Vertical cut plane
      if (isCut) {
        ctx.fillStyle = cutPlaneFill;
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        const p1 = project(0, objY - cylH, -rPx);
        const p2 = project(0, objY - cylH, rPx);
        const p3 = project(0, objY, rPx);
        const p4 = project(0, objY, -rPx);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (type === 'sphere_detachment') {
      // Physical alignment: sphere center sits in 3D at (0, objY, 0), so its equator of radius rPx
      // lies exactly at objY, perfectly meeting the deep green wetting perimeter and capillary meniscus!
      const sphereCenter = project(0, objY, 0);
      const projR = rPx * sphereCenter.scale;

      const radGrad = ctx.createRadialGradient(
        sphereCenter.x - projR * 0.35,
        sphereCenter.y - projR * 0.35,
        projR * 0.08,
        sphereCenter.x,
        sphereCenter.y,
        projR
      );
      radGrad.addColorStop(0, '#64748b');
      radGrad.addColorStop(0.3, '#334155');
      radGrad.addColorStop(0.8, '#0f172a');
      radGrad.addColorStop(1, '#020617');

      ctx.fillStyle = radGrad;

      if (!isCut) {
        // Full 3D Sphere: screen radius projR exactly matches equatorial width
        ctx.beginPath();
        ctx.arc(sphereCenter.x, sphereCenter.y, projR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Subtle 3D equator guideline
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        for (let i = 0; i <= 32; i++) {
          const theta = (i / 32) * Math.PI * 2;
          const pt = project(Math.cos(theta) * rPx, objY, Math.sin(theta) * rPx);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // VERTICAL HALF SPHERE (Left half x < 0 completely removed; only right half x >= 0 rendered)
        ctx.beginPath();
        ctx.arc(sphereCenter.x, sphereCenter.y, projR, -Math.PI / 2, Math.PI / 2, false);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.stroke();

        // True 3D projected vertical circular cut face at x = 0 (Y-Z plane)
        ctx.fillStyle = cutPlaneFill;
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= 36; i++) {
          const alpha = (i / 36) * Math.PI * 2;
          const pt = project(0, objY + Math.sin(alpha) * rPx, Math.cos(alpha) * rPx);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  // Draw Contact Wetting Perimeter in DEEP GREEN
  const drawDeepGreenWettingContour = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z: number) => { x: number; y: number; scale: number },
    type: SpecimenType,
    objY: number,
    r: number,
    rIn: number,
    len: number,
    w: number,
    isCut: boolean
  ) => {
    ctx.strokeStyle = '#059669'; // Emerald-600 Deep Green
    ctx.lineWidth = 4.2;
    ctx.shadowColor = '#059669';
    ctx.shadowBlur = 10;

    const rPx = r * 1400;
    const rInPx = rIn * 1400;
    const halfL = (len * 1000) / 2;
    const halfW = (w * 1000) / 2;

    const startAngle = isCut ? -Math.PI / 2 : 0;
    const endAngle = isCut ? Math.PI / 2 : Math.PI * 2;
    const segments = isCut ? 32 : 64;

    if (type === 'wire_ring' || type === 'hollow_cylinder') {
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle);
        const pt = project(Math.cos(theta) * rPx, objY, Math.sin(theta) * rPx);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle);
        const pt = project(Math.cos(theta) * rInPx, objY, Math.sin(theta) * rInPx);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    } else if (type === 'disc' || type === 'solid_cylinder' || type === 'sphere_detachment') {
      // Sphere contact circle sits EXACTLY AT objY
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle);
        const pt = project(Math.cos(theta) * rPx, objY, Math.sin(theta) * rPx);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    } else if (type === 'needle') {
      const minX = isCut ? 0 : -halfL;
      [-5, 5].forEach((sideZ) => {
        const p1 = project(minX, objY, sideZ);
        const p2 = project(halfL, objY, sideZ);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    } else if (type === 'rect_plate') {
      const minX = isCut ? 0 : -halfL;
      const corners = [
        project(minX, objY, -halfW),
        project(halfL, objY, -halfW),
        project(halfL, objY, halfW),
        project(minX, objY, halfW),
      ];
      ctx.beginPath();
      corners.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (!isCut) ctx.closePath();
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  };

  // Mouse Orbit Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingCanvasRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCanvasRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    yawRef.current += dx * 0.012;
    pitchRef.current = Math.max(-0.6, Math.min(1.2, pitchRef.current + dy * 0.012));
  };

  const handleMouseUp = () => {
    isDraggingCanvasRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomRef.current = Math.max(0.6, Math.min(3.5, zoomRef.current - e.deltaY * 0.0015));
    setZoomDisplay(zoomRef.current);
  };

  const triggerSnapTest = () => {
    setIsSnapped(false);
    let curr = 0.1;
    const interval = setInterval(() => {
      curr += 0.035;
      if (curr >= 0.85) {
        clearInterval(interval);
        setPullHeight(0.85);
      } else {
        setPullHeight(curr);
      }
    }, 40);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr_320px] gap-4 w-full max-w-[1720px] mx-auto p-4 items-start">
      {/* LEFT SIDEBAR: Specimen Controls */}
      <aside className="bg-white rounded-2xl border border-sky-200 shadow-sm p-4 flex flex-col gap-4 text-slate-900 max-h-[calc(100vh-100px)] overflow-y-auto">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-950 mb-1">
            {t.m2.selectSpecimen}
          </h2>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? 'বস্তু নির্বাচন করুন এবং স্পর্শ পরিধি (L) পর্যবেক্ষণ করুন।'
              : 'Choose geometric specimens to evaluate contact perimeter and pull force.'}
          </p>
        </div>

        {/* Specimen Presets */}
        <div className="flex flex-col gap-1.5">
          {(Object.keys(SPECIMENS) as SpecimenType[]).map((key) => {
            const item = SPECIMENS[key];
            const isSelected = selectedSpecimen === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedSpecimen(key);
                  setIsSnapped(false);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-2xs text-slate-950 ring-1 ring-emerald-400'
                    : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold leading-tight">
                    {lang === 'bn' ? item.nameBn : item.nameEn}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-800 font-semibold mt-0.5">
                    {item.formulaDisplay}
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Vertical Cut Toggle Button (USER REQUIREMENT) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-900">{t.m2.crossSectionCut}</span>
            <Scissors className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-[11px] text-slate-500 mb-2 leading-tight">
            {t.m2.crossSectionCutDesc}
          </p>
          <button
            onClick={() => setIsVerticalCut(!isVerticalCut)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isVerticalCut
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>
              {isVerticalCut
                ? (lang === 'bn' ? 'সম্পূর্ণ ৩D ভিউতে ফিরুন' : 'Restore Full 3D Specimen')
                : (lang === 'bn' ? 'উল্লম্বভাবে অর্ধেক কাটুন (Vertical Half Cut)' : 'Cut Vertically in Half')}
            </span>
          </button>
        </div>

        {/* Geometric Dimension Sliders */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2.5">
          <span className="text-xs font-bold text-slate-800">{t.m2.dimensions}</span>

          {(selectedSpecimen === 'wire_ring' ||
            selectedSpecimen === 'disc' ||
            selectedSpecimen === 'solid_cylinder' ||
            selectedSpecimen === 'hollow_cylinder' ||
            selectedSpecimen === 'sphere_detachment') && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-medium">{t.m2.radius} (r)</span>
                <span className="font-mono font-bold text-emerald-700">
                  {(radiusVal * 100).toFixed(1)} cm
                </span>
              </div>
              <input
                type="range"
                min="0.015"
                max="0.060"
                step="0.002"
                value={radiusVal}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setRadiusVal(val);
                  if (innerRadiusVal >= val) setInnerRadiusVal(val - 0.005);
                }}
                className="w-full accent-emerald-600"
              />
            </div>
          )}

          {(selectedSpecimen === 'wire_ring' || selectedSpecimen === 'hollow_cylinder') && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-medium">{t.m2.innerRadius} (r₁)</span>
                <span className="font-mono font-bold text-emerald-700">
                  {(innerRadiusVal * 100).toFixed(1)} cm
                </span>
              </div>
              <input
                type="range"
                min="0.010"
                max={Math.max(0.012, radiusVal - 0.004)}
                step="0.002"
                value={innerRadiusVal}
                onChange={(e) => setInnerRadiusVal(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          )}

          {(selectedSpecimen === 'needle' || selectedSpecimen === 'rect_plate') && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-medium">{t.m2.length} (l)</span>
                <span className="font-mono font-bold text-emerald-700">
                  {(lengthVal * 100).toFixed(1)} cm
                </span>
              </div>
              <input
                type="range"
                min="0.03"
                max="0.15"
                step="0.005"
                value={lengthVal}
                onChange={(e) => setLengthVal(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          )}

          {selectedSpecimen === 'rect_plate' && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-medium">{t.m2.width} (b)</span>
                <span className="font-mono font-bold text-emerald-700">
                  {(widthVal * 100).toFixed(1)} cm
                </span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.08"
                step="0.005"
                value={widthVal}
                onChange={(e) => setWidthVal(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          )}
        </div>

        {/* Spring Balance Pull Elevation Slider */}
        <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-900">{t.m2.pullSlider}</span>
            <span className="text-xs font-mono font-bold text-sky-800">
              {(pullHeight * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={pullHeight}
            onChange={(e) => setPullHeight(parseFloat(e.target.value))}
            className="w-full accent-emerald-600"
          />

          <button
            onClick={triggerSnapTest}
            className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>{t.m2.detachTest}</span>
          </button>
        </div>

        {/* Orbit Control Options */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium transition-all ${
              isAutoRotating
                ? 'bg-sky-100 border-sky-300 text-sky-900 font-bold'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span>{t.autoRotate}</span>
          </button>
          <button
            onClick={() => {
              yawRef.current = 0.6;
              pitchRef.current = 0.4;
              zoomRef.current = 1.1;
              setZoomDisplay(1.1);
              setPullHeight(0.2);
              setIsSnapped(false);
              setIsVerticalCut(false);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* CENTER STAGE: 360° Interactive Canvas */}
      <main className="bg-white rounded-2xl border border-sky-200 shadow-sm p-3 flex flex-col gap-2 min-h-[640px]">
        {/* Canvas Toolbar Info & Zoom Controls */}
        <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-600 bg-sky-50/70 rounded-xl border border-sky-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="font-bold text-slate-900">
              {lang === 'bn' ? spec.nameBn : spec.nameEn}
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-emerald-800 font-bold">
              {isVerticalCut ? 'L_cut (Half)' : 'L'} = {(effectiveLength * 100).toFixed(2)} cm
            </span>
            {isVerticalCut && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                {lang === 'bn' ? 'উল্লম্ব দ্বিখণ্ডিত (বাকি অংশ অপসারিত, L/2)' : 'Vertical Half Cut (L/2)'}
              </span>
            )}
          </div>

          {/* Interactive Zoom Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-600 mr-1">
              Zoom: {zoomDisplay.toFixed(1)}x
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 shadow-2xs"
              title={t.m2.zoomIn}
            >
              <ZoomIn className="w-3.5 h-3.5 text-emerald-600" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 shadow-2xs"
              title={t.m2.zoomOut}
            >
              <ZoomOut className="w-3.5 h-3.5 text-emerald-600" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg bg-white border border-sky-200 hover:bg-sky-50 text-slate-500 shadow-2xs text-[10px]"
              title={t.m2.zoomReset}
            >
              1x
            </button>
          </div>
        </div>

        {/* 3D Canvas Viewport */}
        <div className="relative w-full flex-1 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[580px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
          />

          {/* Meniscus State Status Banner */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-sky-200 px-3 py-2 rounded-xl shadow-xs text-xs">
            {isSnapped ? (
              <div className="flex items-center gap-2 text-rose-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span>{t.m2.snapped}</span>
              </div>
            ) : pullHeight > 0.05 ? (
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t.m2.pulling}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>{t.m2.resting}</span>
              </div>
            )}
          </div>

          {/* Glowing Deep Green Legend */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-emerald-400 px-3 py-1.5 rounded-xl shadow-xs text-[11px] text-slate-900 flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-sm ring-2 ring-emerald-300" />
            <span className="font-bold text-emerald-950">
              {isVerticalCut
                ? (lang === 'bn' ? 'অর্ধ স্পর্শ পরিধি L_cut = L/2 (Deep Green)' : 'Half Contact Perimeter L_cut = L/2')
                : (lang === 'bn' ? 'কার্যকর স্পর্শ পরিধি L (Deep Green)' : 'Contact Perimeter L')}
            </span>
          </div>

          {/* Solid Black object notice */}
          <div className="absolute bottom-3 right-3 bg-slate-900/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono">
            {isVerticalCut ? 'Specimen: Half Section (Vertical Cut)' : 'Specimen: Solid Black'}
          </div>
        </div>
      </main>

      {/* RIGHT TELEMETRY: Mathematical Monitors & Balances */}
      <aside className="bg-white rounded-2xl border border-sky-200 shadow-sm p-4 flex flex-col gap-4 text-slate-900">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-950 mb-1">
            {lang === 'bn' ? 'বল বিশ্লেষণ ও সমীকরণ' : 'Force Balance & Expansion'}
          </h2>
          <p className="text-xs text-slate-600">
            {lang === 'bn'
              ? 'উত্তোলনের মোট প্রয়োজনীয় বল: F_net = W + T × L'
              : 'Detachment force breakdown: Gravity + Surface tension'}
          </p>
        </div>

        {/* Effective Length Card */}
        <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-300">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-emerald-950">
              {isVerticalCut ? t.m2.halfWettingPerimeter : t.m2.wettingPerimeter}
            </span>
            <span className="text-[11px] font-mono text-emerald-800 font-bold">
              {isVerticalCut ? 'L_cut' : 'L_eff'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-950 tabular-nums">
            {(effectiveLength * 100).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-600">cm</span>
          </div>
          <div className="text-[11px] font-mono text-emerald-900 mt-1 font-semibold">
            {isVerticalCut
              ? `L_cut = L_full / 2 = ${(fullEffectiveLength * 100).toFixed(2)} / 2 = ${(effectiveLength * 100).toFixed(2)} cm`
              : formulaExpanded}
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            {isVerticalCut
              ? (lang === 'bn' ? 'উল্লম্বভাবে অর্ধেক কাটায় স্পর্শ দৈর্ঘ্য অর্ধেক হয়ে গেছে।' : 'Vertical half section cuts contact boundary in half.')
              : (lang === 'bn' ? spec.wettedSidesBn : spec.wettedSidesEn)}
          </div>
        </div>

        {/* Surface Tension Force FT = T * L */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-slate-800">{t.m2.surfaceTensionForce}</span>
            <span className="text-[11px] font-mono text-sky-600 font-bold">FT = T · L</span>
          </div>
          <div className="text-xl font-bold font-mono text-sky-900 tabular-nums">
            {(surfaceTensionForce * 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-600">mN</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            FT = {surfaceTension.toFixed(4)} × {effectiveLength.toFixed(4)} m ={' '}
            <span className="font-bold text-slate-900">
              {(surfaceTensionForce * 1000).toFixed(2)} mN
            </span>
          </div>
        </div>

        {/* Object Weight W = mg */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-slate-800">
              {isVerticalCut ? (lang === 'bn' ? 'অর্ধ বস্তুর ওজন (W_half = mg/2)' : 'Half Object Weight (W = mg/2)') : t.m2.gravityWeight}
            </span>
            <span className="text-[11px] font-mono text-slate-500 font-bold">W = mg</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-800 tabular-nums">
            {(gravityForce * 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-600">mN</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            m = {(massKg * 1000).toFixed(2)} g | g = 9.81 m/s²
          </div>
        </div>

        {/* Total Required Detachment Force */}
        <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-300">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-bold text-sky-950">{t.m2.totalForce}</span>
            <span className="text-[11px] font-mono text-rose-600 font-bold">F_net</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-950 tabular-nums">
            {(totalPullRequired * 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-600">mN</span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 mt-1">
            F_net = W + FT = {(gravityForce * 1000).toFixed(1)} + {(surfaceTensionForce * 1000).toFixed(1)} ={' '}
            <span className="font-bold text-slate-950">{(totalPullRequired * 1000).toFixed(2)} mN</span>
          </div>
        </div>

        {/* Pedagogical Note */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>{lang === 'bn' ? 'কার্যকর দৈর্ঘ্যের নিয়ম' : 'Wetting Rule'}</span>
          </div>
          <p className="leading-relaxed">
            {lang === 'bn'
              ? 'বস্তুটি যে যে সীমারেখা বরাবর তরল স্পর্শ করে থাকে, কেবল সেই সীমারেখাগুলোর মোট পরিধিই কার্যকর দৈর্ঘ্য L। উল্লম্বভাবে কাটলে স্পর্শ পরিধি অর্ধেক (L/2) হয়ে যায়।'
              : 'Only boundaries in actual liquid-air contact contribute to effective wetting length L. Slicing the specimen in half reduces wetting length to L/2.'}
          </p>
        </div>
      </aside>
    </div>
  );
};
