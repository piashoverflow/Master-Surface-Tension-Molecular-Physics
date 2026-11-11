import React from 'react';
import { Language, ModuleType } from '../types';
import { translations } from '../translations';
import { Atom, Compass, Droplets, RotateCcw, Languages } from 'lucide-react';

interface HeaderProps {
  currentModule: ModuleType;
  onSelectModule: (mod: ModuleType) => void;
  lang: Language;
  onToggleLang: () => void;
  onResetAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onSelectModule,
  lang,
  onToggleLang,
  onResetAll,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-200 shadow-xs px-4 lg:px-6 py-2.5 transition-colors">
      <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-3">
        {/* Left: Studio Title & Chapter Marker */}
        <div className="flex items-center gap-3 shrink-0 self-start xl:self-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-sm">
            <Droplets className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold tracking-tight text-slate-950 font-sans">
                {t.appTitle}
              </h1>
            </div>
            <p className="text-xs font-medium text-sky-800 tracking-wide">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Center: 3 Primary Module Tabs (Pill / Segmented Navigation) */}
        <nav className="flex items-center bg-sky-100/70 p-1 rounded-xl border border-sky-200/80 shadow-inner overflow-x-auto max-w-full">
          <button
            onClick={() => onSelectModule('module1')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentModule === 'module1'
                ? 'bg-white text-sky-950 shadow-sm border border-sky-200'
                : 'text-slate-600 hover:text-sky-900 hover:bg-sky-50'
            }`}
          >
            <Atom className="w-4 h-4 text-sky-600" />
            <span>{t.modules.mod1Short}</span>
          </button>

          <button
            onClick={() => onSelectModule('module2')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentModule === 'module2'
                ? 'bg-white text-sky-950 shadow-sm border border-sky-200'
                : 'text-slate-600 hover:text-sky-900 hover:bg-sky-50'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>{t.modules.mod2Short}</span>
          </button>

          <button
            onClick={() => onSelectModule('module3')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentModule === 'module3'
                ? 'bg-white text-sky-950 shadow-sm border border-sky-200'
                : 'text-slate-600 hover:text-sky-900 hover:bg-sky-50'
            }`}
          >
            <Droplets className="w-4 h-4 text-cyan-600" />
            <span>{t.modules.mod3Short}</span>
          </button>
        </nav>

        {/* Right: Language Toggle, Reset, and Bold Red Institution Badge */}
        <div className="flex items-center gap-2.5 shrink-0 self-end xl:self-auto">
          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-sky-200 hover:bg-sky-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors"
            title="Toggle Language / ভাষা পরিবর্তন"
          >
            <Languages className="w-3.5 h-3.5 text-sky-600" />
            <span>{t.langToggle}</span>
          </button>

          {/* Reset button */}
          <button
            onClick={onResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium shadow-2xs transition-colors"
            title={t.resetAll}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{t.resetAll}</span>
          </button>

          {/* Explicit Bold Red Institution Badge requested by user */}
          <span className="bg-rose-100 border border-rose-300 text-rose-600 font-bold px-3 py-1 rounded-full text-sm">
            {t.institutionBadge}
          </span>
        </div>
      </div>
    </header>
  );
};
