import { LiquidProperties, LiquidType, SpecimenConfig, SpecimenType } from './types';

export const LIQUIDS: Record<LiquidType, LiquidProperties> = {
  water: {
    id: 'water',
    nameEn: 'Pure Water (পানি)',
    nameBn: 'বিশুদ্ধ পানি',
    surfaceTension20C: 0.0728, // N/m at 20°C
    tempCoeff: 0.0020, // 1/°C
    density: 1000, // kg/m^3
    color: '#0284c7', // sky-600
    vaporColor: '#bae6fd',
    cohesionFactor: 1.0,
  },
  soap: {
    id: 'soap',
    nameEn: 'Soap Solution (সাবান পানি)',
    nameBn: 'সাবান দ্রবণ',
    surfaceTension20C: 0.0250,
    tempCoeff: 0.0014,
    density: 1010,
    color: '#0d9488', // teal-600
    vaporColor: '#ccfbf1',
    cohesionFactor: 0.35,
  },
  ethanol: {
    id: 'ethanol',
    nameEn: 'Ethanol (ইথানল)',
    nameBn: 'ইথাইল অ্যালকোহল',
    surfaceTension20C: 0.0223,
    tempCoeff: 0.0028,
    density: 789,
    color: '#8b5cf6', // violet-500
    vaporColor: '#ede9fe',
    cohesionFactor: 0.31,
  },
  mercury: {
    id: 'mercury',
    nameEn: 'Liquid Mercury (পারদ)',
    nameBn: 'তরল পারদ',
    surfaceTension20C: 0.4850,
    tempCoeff: 0.0004,
    density: 13600,
    color: '#64748b', // slate-500
    vaporColor: '#cbd5e1',
    cohesionFactor: 6.66,
  },
};

export const SPECIMENS: Record<SpecimenType, SpecimenConfig> = {
  needle: {
    type: 'needle',
    nameEn: 'Horizontal Thin Needle / Straight Wire',
    nameBn: 'অনুভূমিক সরু সুচ / সোজা তার',
    formulaTex: 'F_T = 2 \\cdot T \\cdot l',
    formulaDisplay: 'FT = 2 × T × l',
    descriptionEn: 'The needle floats horizontally on the surface. Water forms a contact meniscus along both its left and right longitudinal edges.',
    descriptionBn: 'সুচটি পানির উপর অনুভূমিকভাবে ভাসমান থাকে। সুচের দুই পাশ বরাবর তরলের স্পর্শ বা মেনিস্কাস তৈরি হয়, ফলে কার্যকর দৈর্ঘ্য L = 2l।',
    wettedSidesEn: 'Both longitudinal sides (L = 2l)',
    wettedSidesBn: 'উভয় পার্শ্বরেখা (L = 2l)',
  },
  rect_plate: {
    type: 'rect_plate',
    nameEn: 'Rectangular Glass Plate (পাত)',
    nameBn: 'আয়তাকার কাঁচের পাত',
    formulaTex: 'F_T = 2 \\cdot T \\cdot (l + b)',
    formulaDisplay: 'FT = 2 × T × (l + b)',
    descriptionEn: 'When the thin plate touches the water surface, meniscus forms along both length edges and width edges: L = 2(l + b).',
    descriptionBn: 'পাতটির তল তরল স্পর্শ করলে দুই দৈর্ঘ্য ও দুই প্রস্থ বরাবর তরলের স্পর্শ রেখা তৈরি হয়, ফলে L = 2(l + b)।',
    wettedSidesEn: 'Perimeter of rectangle (L = 2(l + b))',
    wettedSidesBn: 'আয়তক্ষেত্রের পরিধি (L = 2(l + b))',
  },
  wire_ring: {
    type: 'wire_ring',
    nameEn: 'Thin Wire Ring / Hoop (তারের রিং)',
    nameBn: 'সরু তারের রিং (হুপ)',
    formulaTex: 'F_T = 2\\pi (r_1 + r_2) \\cdot T \\approx 4\\pi r T',
    formulaDisplay: 'FT = 2π(r₁ + r₂) × T ≈ 4π r T',
    descriptionEn: 'A wire hoop has both an inner circumference and an outer circumference wetted by the liquid: L = 2π(r₁ + r₂) ≈ 4πr.',
    descriptionBn: 'একটি তারের রিং এর ভেতরে ও বাইরে উভয় পরিধি তরলের সংস্পর্শে থাকে, ফলে কার্যকর দৈর্ঘ্য L = 2πr₁ + 2πr₂ ≈ 4πr।',
    wettedSidesEn: 'Inner and outer circumferences (L ≈ 4πr)',
    wettedSidesBn: 'ভেতরের ও বাইরের দ্বিগুণ পরিধি (L ≈ 4πr)',
  },
  disc: {
    type: 'disc',
    nameEn: 'Flat Circular Disc (চাকতি)',
    nameBn: 'গোলাকার সমতল চাকতি',
    formulaTex: 'F_T = 2\\pi r \\cdot T',
    formulaDisplay: 'FT = 2π r × T',
    descriptionEn: 'Only the outer circumference of a flat disc is in contact with the liquid-air boundary line: L = 2πr.',
    descriptionBn: 'চাকতির শুধুমাত্র বাইরের একদিকের বৃত্তাকার কিনারা তরল-বায়ু সংযোগে থাকে, ফলে L = 2πr।',
    wettedSidesEn: 'Single outer circumference (L = 2πr)',
    wettedSidesBn: 'শুধুমাত্র বহিস্থ পরিধি (L = 2πr)',
  },
  solid_cylinder: {
    type: 'solid_cylinder',
    nameEn: 'Solid Cylinder (Vertical)',
    nameBn: 'নিরেট সিলিন্ডার (উল্লম্ব)',
    formulaTex: 'F_T = 2\\pi r \\cdot T',
    formulaDisplay: 'FT = 2π r × T',
    descriptionEn: 'The vertical solid cylinder touches the liquid surface along its outer circular perimeter: L = 2πr.',
    descriptionBn: 'উল্লম্ব নিরেট সিলিন্ডারের বৃত্তাকার পাদদেশ বরাবর একক স্পর্শরেখা থাকে: L = 2πr।',
    wettedSidesEn: 'Outer base perimeter (L = 2πr)',
    wettedSidesBn: 'বাইরের বৃত্তাকার পরিধি (L = 2πr)',
  },
  hollow_cylinder: {
    type: 'hollow_cylinder',
    nameEn: 'Hollow Cylinder (Vertical Pipe)',
    nameBn: 'ফাঁপা সিলিন্ডার (উল্লম্ব নল)',
    formulaTex: 'F_T = 2\\pi (r_{\\text{inner}} + r_{\\text{outer}}) \\cdot T',
    formulaDisplay: 'FT = 2π(r_inner + r_outer) × T',
    descriptionEn: 'The hollow tube has two concentric contact boundaries: the inside wall perimeter and the outside wall perimeter.',
    descriptionBn: 'ফাঁপা নলের ভেতরের প্রাচীর ও বাইরের প্রাচীর উভয় বৃত্তাকার কিনারাই তরল স্পর্শ করে: L = 2π(r_inner + r_outer)।',
    wettedSidesEn: 'Inner + outer wall perimeters (L = 2π(ri + ro))',
    wettedSidesBn: 'অভ্যন্তরীণ ও বহিঃস্থ উভয় পরিধি (L = 2π(ri + ro))',
  },
  sphere_detachment: {
    type: 'sphere_detachment',
    nameEn: 'Solid Sphere at Detachment Point',
    nameBn: 'নিরেট গোলক (বিচ্ছেদ মুহূর্ত)',
    formulaTex: 'F_T = 2\\pi r \\cdot T',
    formulaDisplay: 'FT = 2π r × T',
    descriptionEn: 'At the critical detachment instant as the sphere is lifted, the liquid meniscus necks down into a circular contact line of radius r.',
    descriptionBn: 'গোলকটি তরল থেকে উত্তোলনের সময় বিচ্ছেদ মুহূর্তে একটি বৃত্তাকার বলয়ে তরলের টান ধরে রাখে: L = 2πr।',
    wettedSidesEn: 'Contact neck perimeter circle (L = 2πr)',
    wettedSidesBn: 'বিচ্ছেদ বৃত্তাকার রেখা (L = 2πr)',
  },
};

export const MATERIALS = [
  { id: 'glass', nameEn: 'Glass (কাঁচ)', nameBn: 'কাঁচ', density: 2500 },
  { id: 'iron', nameEn: 'Steel / Iron (ইস্পাত)', nameBn: 'ইস্পাত / লোহা', density: 7800 },
  { id: 'aluminum', nameEn: 'Aluminum (অ্যালুমিনিয়াম)', nameBn: 'অ্যালুমিনিয়াম', density: 2700 },
  { id: 'acrylic', nameEn: 'Acrylic (প্লাস্টিক)', nameBn: 'প্লাস্টিক / অ্যাক্রিলিক', density: 1180 },
];
