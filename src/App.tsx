import React, { useState, useMemo } from 'react';
import { Settings2, Info, AlertTriangle, Zap, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { SECTIONS, BASE_CURRENTS, TEMP_FACTORS, TEMP_FACTORS_GROUND, SOIL_RESISTIVITY_FACTORS, GROUP_FACTORS, GROUP_FACTORS_TRAYS_MULTI, GROUP_FACTORS_TRAYS_MONO, GROUP_FACTORS_GROUND, RESISTIVITY, REACTANCE } from './data';

export default function App() {
  // --- ÉTATS DE L'APPLICATION ---
  const [environment, setEnvironment] = useState<'air' | 'ground'>('air');
  const [material, setMaterial] = useState<'Cu' | 'Al'>('Cu');
  const [insulation, setInsulation] = useState<'PVC' | 'PR'>('PVC');
  const [cableType, setCableType] = useState<'multi' | 'mono'>('multi');
  const [method, setMethod] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('B');
  
  // Paramètres Air
  const [temperatureAir, setTemperatureAir] = useState<number>(30);
  const [trayCount, setTrayCount] = useState<number>(0); // 0 = standard, 1-3 = tablettes
  
  // Paramètres Sol
  const [temperatureGround, setTemperatureGround] = useState<number>(20);
  const [soilResistivity, setSoilResistivity] = useState<number>(1.0);
  
  const [grouping, setGrouping] = useState<number>(1);
  const [th3, setTh3] = useState<'<15' | '15-33' | '>33'>('<15');
  
  // Paramètres pour la chute de tension
  const [ib, setIb] = useState<number>(32); // Courant d'emploi (A)
  const [length, setLength] = useState<number>(50); // Longueur (m)
  const [cosPhi, setCosPhi] = useState<number>(0.8); // Facteur de puissance
  const [systemType, setSystemType] = useState<'mono' | 'tri'>('tri'); // Mono 230V ou Tri 400V

  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const env = e.target.value as 'air' | 'ground';
    setEnvironment(env);
    if (env === 'ground') {
      setMethod('D');
    } else {
      setMethod(cableType === 'multi' ? 'E' : 'F');
    }
  };

  const handleCableTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'multi' | 'mono';
    setCableType(newType);
    if (environment === 'air') {
      if (newType === 'multi' && method === 'F') setMethod('E');
      if (newType === 'mono' && method === 'E') setMethod('F');
    }
  };

  // --- CALCULS ---
  const results = useMemo(() => {
    const dataKey = `${material}-${insulation}-${method}`;
    const currentsArray = BASE_CURRENTS[dataKey] || [];
    
    let fTemp = 1.0;
    let fGroup = 1.0;
    let fSoil = 1.0;

    if (environment === 'air') {
      fTemp = TEMP_FACTORS[insulation][temperatureAir] || 1;
      
      if (trayCount === 0) {
        // Groupement standard (Tableau 52.E1)
        let groupKey = grouping;
        if (!GROUP_FACTORS[groupKey]) {
          const keys = Object.keys(GROUP_FACTORS).map(Number).sort((a, b) => a - b);
          groupKey = keys.find(k => k >= grouping) || 20;
        }
        fGroup = GROUP_FACTORS[groupKey] || 0.5;
      } else {
        // Groupement sur tablettes (Tableau 52.E2 / 52.E3)
        const maxGroup = cableType === 'multi' ? 9 : 5; // Limites des tableaux
        const safeGroup = Math.min(grouping, maxGroup);
        if (cableType === 'multi') {
          fGroup = GROUP_FACTORS_TRAYS_MULTI[trayCount]?.[safeGroup] || 0.7;
        } else {
          fGroup = GROUP_FACTORS_TRAYS_MONO[trayCount]?.[safeGroup] || 0.8;
        }
      }
    } else {
      // Environnement Sol
      fTemp = TEMP_FACTORS_GROUND[insulation][temperatureGround] || 1;
      fSoil = SOIL_RESISTIVITY_FACTORS[soilResistivity] || 1;
      
      let groupKey = grouping;
      if (!GROUP_FACTORS_GROUND[groupKey]) {
        const keys = Object.keys(GROUP_FACTORS_GROUND).map(Number).sort((a, b) => a - b);
        groupKey = keys.find(k => k >= grouping) || 9;
      }
      fGroup = GROUP_FACTORS_GROUND[groupKey] || 0.5;
    }
    
    // Facteur pour neutre chargé (TH3)
    let fNeutral = 1.0;
    let adjustedIb = ib;
    
    if (th3 === '15-33') {
      fNeutral = 0.86;
    } else if (th3 === '>33') {
      // Si TH3 > 33%, le courant dans le neutre est prépondérant.
      // On dimensionne par rapport au courant du neutre (Ib * 1.45)
      adjustedIb = ib * 1.45;
    }
    
    // Facteur global
    const fTotal = fTemp * fGroup * fSoil * fNeutral;

    // Calculs pour chaque section
    const voltage = systemType === 'mono' ? 230 : 400;
    const b_factor = systemType === 'mono' ? 2 : Math.sqrt(3);
    const rho = RESISTIVITY[`${material}-${insulation}` as keyof typeof RESISTIVITY];
    const sinPhi = Math.sin(Math.acos(cosPhi));

    let optimalIndex: number | null = null;
    let optimalSection: number | null = null;

    const calculatedIz = SECTIONS.map((section, index) => {
      const izBase = currentsArray[index] || 0;
      const izFinal = izBase * fTotal;
      
      // Calcul chute de tension
      // ΔU = b * (ρ * L / S * cosφ + λ * L * sinφ) * Ib
      const r = rho / section;
      const deltaU_V = b_factor * adjustedIb * length * (r * cosPhi + REACTANCE * sinPhi);
      const deltaU_Percent = (deltaU_V / voltage) * 100;
      
      const isValidIz = izFinal >= adjustedIb;
      const isValidDu = deltaU_Percent <= 5.0; // Limite standard 5%
      const isValid = izBase > 0 && isValidIz && isValidDu;
      
      if (isValid && optimalSection === null) {
        optimalSection = section;
        optimalIndex = index;
      }

      return {
        section,
        izBase,
        izFinal,
        deltaU_V,
        deltaU_Percent,
        isValidIz,
        isValidDu,
        isValid,
        isApplicable: izBase > 0,
        originalIndex: index
      };
    });

    // Filtrer pour ne garder que jusqu'à 1 section au-dessus de l'optimale
    let filteredIz = calculatedIz;
    if (optimalIndex !== null) {
      filteredIz = calculatedIz.filter(row => row.originalIndex <= optimalIndex! + 1);
    }

    return { fTemp, fGroup, fSoil, fNeutral, fTotal, adjustedIb, calculatedIz: filteredIz, optimalSection };
  }, [environment, material, insulation, method, temperatureAir, temperatureGround, soilResistivity, trayCount, grouping, th3, ib, length, cosPhi, systemType]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans flex flex-col md:flex-row">
      
      {/* PANNEAU LATÉRAL : CONFIGURATION */}
      <aside className="w-full md:w-[380px] bg-[#151619] text-white p-6 md:p-8 flex flex-col shadow-2xl z-10 h-screen overflow-y-auto custom-scrollbar border-r border-gray-800">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-[#F27D26] rounded-xl shadow-lg shadow-orange-500/20">
            <Zap size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-tight tracking-tight">Calculateur Iz & ΔU</h1>
            <p className="text-xs text-gray-400 font-mono uppercase tracking-widest mt-1">Norme NF C 15-100</p>
          </div>
        </div>

        <div className="space-y-10">
          
          {/* Section : Câble */}
          <div className="space-y-5">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-3 flex items-center gap-2">
              <Settings2 size={16} /> 1. Câble & Pose
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-300">Environnement</label>
                <select value={environment} onChange={handleEnvironmentChange} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                  <option value="air">À l'air libre (Méthodes A, B, C, E, F)</option>
                  <option value="ground">Enterré (Méthode D)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-300">Matériau</label>
                  <select value={material} onChange={(e) => setMaterial(e.target.value as 'Cu' | 'Al')} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                    <option value="Cu">Cuivre (Cu)</option>
                    <option value="Al">Aluminium (Al)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-300">Isolant</label>
                  <select value={insulation} onChange={(e) => setInsulation(e.target.value as 'PVC' | 'PR')} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                    <option value="PVC">PVC (70°C)</option>
                    <option value="PR">PR/EPR (90°C)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-300">Type de câble</label>
                <select value={cableType} onChange={handleCableTypeChange} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                  <option value="multi">Câble multiconducteur</option>
                  <option value="mono">Câbles monoconducteurs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-300">Méthode de référence</label>
                <select value={method} onChange={(e) => setMethod(e.target.value as any)} disabled={environment === 'ground'} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {environment === 'ground' ? (
                    <option value="D">D (Câbles enterrés)</option>
                  ) : (
                    <>
                      <option value="A">A (Encastré dans paroi isolante)</option>
                      <option value="B">B (Sous conduit en apparent)</option>
                      <option value="C">C (Fixé sur paroi)</option>
                      {cableType === 'multi' && <option value="E">E (Sur chemin de câble perforé)</option>}
                      {cableType === 'mono' && <option value="F">F (Câbles jointifs sur tablette)</option>}
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Section : Environnement */}
          <div className="space-y-5">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-3 flex items-center gap-2">
              <Layers size={16} /> 2. Environnement
            </h2>
            
            <div className="space-y-4">
              {environment === 'air' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-300">Température</label>
                      <select value={temperatureAir} onChange={(e) => setTemperatureAir(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                        {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(t => (
                          <option key={t} value={t}>{t} °C</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-300">Groupement</label>
                      <select value={grouping} onChange={(e) => setGrouping(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                        <option value="1">1 circuit (Seul)</option>
                        <option value="2">2 circuits</option>
                        <option value="3">3 circuits</option>
                        <option value="4">4 circuits</option>
                        <option value="5">5 circuits</option>
                        <option value="6">6 circuits</option>
                        <option value="7">7 circuits</option>
                        <option value="8">8 circuits</option>
                        <option value="9">9 circuits</option>
                        <option value="10">10 circuits</option>
                        <option value="12">12 circuits</option>
                        <option value="14">14 circuits</option>
                        <option value="16">16 circuits</option>
                        <option value="18">18 circuits</option>
                        <option value="20">20 circuits</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-300">Disposition (Tablettes/Échelles)</label>
                    <select value={trayCount} onChange={(e) => setTrayCount(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                      <option value="0">Standard (Paroi, Goulotte...)</option>
                      <option value="1">1 tablette / chemin de câble</option>
                      <option value="2">2 tablettes superposées</option>
                      <option value="3">3 tablettes superposées</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-300">Température Sol</label>
                      <select value={temperatureGround} onChange={(e) => setTemperatureGround(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                        {[10, 15, 20, 25, 30].map(t => (
                          <option key={t} value={t}>{t} °C</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-300">Groupement</label>
                      <select value={grouping} onChange={(e) => setGrouping(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                        <option value="1">1 circuit (Seul)</option>
                        <option value="2">2 circuits</option>
                        <option value="3">3 circuits</option>
                        <option value="4">4 circuits</option>
                        <option value="5">5 circuits</option>
                        <option value="6">6 circuits</option>
                        <option value="7">7 circuits</option>
                        <option value="8">8 circuits</option>
                        <option value="9">9 circuits</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-300">Résistivité thermique du sol</label>
                    <select value={soilResistivity} onChange={(e) => setSoilResistivity(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                      <option value="0.4">0.4 K.m/W (Très humide)</option>
                      <option value="0.7">0.7 K.m/W (Humide)</option>
                      <option value="1.0">1.0 K.m/W (Normal/Standard)</option>
                      <option value="1.5">1.5 K.m/W (Sec)</option>
                      <option value="2.0">2.0 K.m/W (Très sec)</option>
                      <option value="3.0">3.0 K.m/W (Cendres/Mâchefer)</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-300">Taux d'harmoniques (TH3) - Neutre</label>
                <select value={th3} onChange={(e) => setTh3(e.target.value as any)} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                  <option value="<15">TH3 ≤ 15% (Neutre non chargé)</option>
                  <option value="15-33">15% &lt; TH3 ≤ 33% (Facteur 0.86)</option>
                  <option value=">33">TH3 &gt; 33% (Surdimensionnement)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section : Circuit */}
          <div className="space-y-5">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-3 mt-4 flex items-center gap-2">
              <Zap size={16} /> 3. Paramètres du Circuit
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-300">Réseau</label>
                  <select value={systemType} onChange={(e) => setSystemType(e.target.value as any)} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all">
                    <option value="mono">Mono (230V)</option>
                    <option value="tri">Tri (400V)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-300">Courant Ib (A)</label>
                  <input type="number" min="1" value={ib} onChange={(e) => setIb(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-300">Longueur (m)</label>
                  <input type="number" min="1" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-300">Cos(φ)</label>
                  <input type="number" min="0.1" max="1" step="0.05" value={cosPhi} onChange={(e) => setCosPhi(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* PANNEAU PRINCIPAL : RÉSULTATS */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <header className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-light tracking-tight mb-1">Analyse de la canalisation</h2>
              <p className="text-gray-600 text-sm">
                Dimensionnement selon la norme NF C 15-100 (Intensité et Chute de tension)
              </p>
            </div>
            {results.optimalSection && (
              <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-right">
                <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Section Optimale</div>
                <div className="text-2xl font-bold font-mono">{results.optimalSection} mm²</div>
              </div>
            )}
          </header>

          {/* Cartes des facteurs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Température</div>
              <div className="text-2xl font-light font-mono">{results.fTemp.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Groupement</div>
              <div className="text-2xl font-light font-mono">{results.fGroup.toFixed(2)}</div>
            </div>
            {environment === 'ground' && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Sol (Résistivité)</div>
                <div className="text-2xl font-light font-mono">{results.fSoil.toFixed(2)}</div>
              </div>
            )}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Neutre (TH3)</div>
              <div className="text-2xl font-light font-mono">{results.fNeutral.toFixed(2)}</div>
            </div>
            <div className="bg-[#141414] text-white p-4 rounded-xl shadow-lg">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Facteur Global (f)</div>
              <div className="text-2xl font-light font-mono text-[#F27D26]">{results.fTotal.toFixed(3)}</div>
            </div>
          </div>

          {/* Alertes si TH3 > 33% */}
          {th3 === '>33' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>
                <strong>Attention : Taux d'harmoniques &gt; 33%</strong>
                <p>Le courant dans le neutre est supérieur au courant de phase. Le dimensionnement est effectué sur la base du courant du neutre : <code className="font-mono bg-orange-100 px-1 rounded">Ib_calcul = Ib × 1.45 = {results.adjustedIb.toFixed(1)} A</code>.</p>
              </div>
            </div>
          )}

          {/* Tableau des résultats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="p-3 font-semibold w-24">Section</th>
                    <th className="p-3 font-semibold">I'z base</th>
                    <th className="p-3 font-semibold border-r border-gray-200">Iz final</th>
                    <th className="p-3 font-semibold">ΔU (V)</th>
                    <th className="p-3 font-semibold border-r border-gray-200">ΔU (%)</th>
                    <th className="p-3 font-semibold text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {results.calculatedIz.length > 0 ? (
                    results.calculatedIz.map((row) => {
                      const isOptimal = row.section === results.optimalSection;
                      return (
                        <tr key={row.section} className={`transition-colors ${isOptimal ? 'bg-emerald-50/50' : 'hover:bg-gray-50'} ${!row.isApplicable ? 'opacity-60 bg-gray-50/50' : ''}`}>
                          <td className="p-3 font-mono font-medium">
                            {row.section} <span className="text-xs text-gray-400">mm²</span>
                          </td>
                          {!row.isApplicable ? (
                            <>
                              <td colSpan={4} className="p-3 text-center text-xs text-gray-400 italic border-r border-gray-200">
                                Non défini par la norme pour cette configuration
                              </td>
                              <td className="p-3 text-center">
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-medium bg-gray-200 text-gray-500">
                                  N/A
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 font-mono text-gray-500">{row.izBase.toFixed(1)} A</td>
                              <td className="p-3 font-mono font-semibold border-r border-gray-200">
                                <span className={row.isValidIz ? 'text-gray-900' : 'text-red-500'}>
                                  {row.izFinal.toFixed(1)} A
                                </span>
                              </td>
                              <td className="p-3 font-mono text-gray-500">{row.deltaU_V.toFixed(2)} V</td>
                              <td className="p-3 font-mono font-semibold border-r border-gray-200">
                                <span className={row.isValidDu ? 'text-gray-900' : 'text-red-500'}>
                                  {row.deltaU_Percent.toFixed(2)} %
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {row.isValid ? (
                                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isOptimal ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                    <CheckCircle2 size={14} /> {isOptimal ? 'Optimal' : 'Valide'}
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-600">
                                    <XCircle size={14} /> 
                                    {!row.isValidIz && !row.isValidDu ? 'Iz & ΔU' : !row.isValidIz ? 'Iz insuffisant' : 'ΔU > 5%'}
                                  </div>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        <Info className="mx-auto mb-2 text-gray-400" size={24} />
                        Aucune donnée disponible pour cette méthode de pose.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
