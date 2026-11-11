export type Language = 'en' | 'bn';

export type ModuleType = 'module1' | 'module2' | 'module3';

// Module 1 Types
export type LiquidType = 'water' | 'soap' | 'ethanol' | 'mercury';

export interface LiquidProperties {
  id: LiquidType;
  nameEn: string;
  nameBn: string;
  surfaceTension20C: number; // N/m
  tempCoeff: number; // alpha (1/K)
  density: number; // kg/m^3
  color: string;
  vaporColor: string;
  cohesionFactor: number; // relative cohesive strength
}

export type Module1ViewMode = 'micro' | 'macro' | 'split';

export interface Molecule {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  isSurface: boolean;
}

// Module 2 Types
export type SpecimenType =
  | 'needle'
  | 'rect_plate'
  | 'wire_ring'
  | 'disc'
  | 'solid_cylinder'
  | 'hollow_cylinder'
  | 'sphere_detachment';

export interface SpecimenConfig {
  type: SpecimenType;
  nameEn: string;
  nameBn: string;
  formulaTex: string;
  formulaDisplay: string;
  descriptionEn: string;
  descriptionBn: string;
  wettedSidesEn: string;
  wettedSidesBn: string;
}

// Module 3 Types
export type Module3Section = 'splitting' | 'excess_pressure' | 'two_bubble';

export type BubbleCurvatureModel = 'liquid_drop' | 'soap_bubble' | 'cylindrical_jet';
