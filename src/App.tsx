import React, { useState } from 'react';
import { Header } from './components/Header';
import { Module1_Molecular } from './components/Module1_Molecular';
import { Module2_Geometry } from './components/Module2_Geometry';
import { Module3_EnergyPressure } from './components/Module3_EnergyPressure';
import { Language, ModuleType } from './types';
import { translations } from './translations';

export default function App() {
  const [currentModule, setCurrentModule] = useState<ModuleType>('module1');
  const [lang, setLang] = useState<Language>('bn'); // Default to Bengali as requested by Bangladeshi HSC curriculum context, with instant English toggle
  const [resetKey, setResetKey] = useState<number>(0);

  const t = translations[lang];

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'bn' : 'en'));
  };

  const handleResetAll = () => {
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-sky-50/70 text-slate-900 font-sans selection:bg-sky-200 selection:text-sky-950">
      {/* Top Branding & Navigation Header */}
      <Header
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        lang={lang}
        onToggleLang={handleToggleLang}
        onResetAll={handleResetAll}
      />

      {/* Main Studio Viewport */}
      <div key={resetKey} className="flex-1 flex flex-col">
        {currentModule === 'module1' && <Module1_Molecular lang={lang} />}
        {currentModule === 'module2' && <Module2_Geometry lang={lang} />}
        {currentModule === 'module3' && <Module3_EnergyPressure lang={lang} />}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-sky-200 bg-white/80 py-3 px-3 sm:px-6 text-center text-xs text-slate-500 w-full">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Master Surface Tension Studio</span>
            <span>·</span>
            <span>HSC Physics 1st Paper (Chapter 7: Mechanical Properties of Matter)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>60 FPS HTML5 Canvas Engine</span>
            <span>·</span>
            <span>Interactive 360° Vector Physics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
