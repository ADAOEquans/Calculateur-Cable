import React, { useState, useMemo } from 'react';
import { Settings2, Info, AlertTriangle, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { SECTIONS, BASE_CURRENTS, TEMP_FACTORS, GROUP_FACTORS, RESISTIVITY, REACTANCE } from './data';

export default function App() {
  // --- ÉTATS DE L'APPLICATION ---
  const [material, setMaterial] = useState<'Cu' | 'Al'>('Cu');
  const [insulation, setInsulation] = useState<'PVC' | 'PR'>('PVC');
  const [cableType, setCableType] = useState<'multi' | 'mono'>('multi');
  const [method, setMethod] = useState<'A' | 'B' | 'C' | 'E' | 'F'>('B');
  const [temperature, setTemperature] = useState<number>(30);
  const [grouping, setGrouping] = useState<number>(1);
  const [th3, setTh3] = useState<'<15' | '15-33' | '>33'>('<15');
  
  // Paramètres pour la chute de tension
  const [ib, setIb] = useState<number>(32); // Courant d'emploi (A)
  const [length, setLength] = useState<number>(50); // Longueur (m)
  const [cosPhi, setCosPhi] = useState<number>(0.8); // Facteur de puissance
  const [systemType, setSystemType] = useState<'mono' | 'tri'>('tri'); // Mono 230V ou Tri 400V

  const handleCableTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'multi' | 'mono';
    setCableType(newType);
    // Bascule automatique de la méthode de référence selon le type de câble
    if (newType === 'multi' && method === 'F') setMethod('E');
    if (newType === 'mono' && method === 'E') setMethod('F');
  };

  // --- CALCULS ---
  const results = useMemo(() => {
    const dataKey = `${material}-${insulation}-${method}`;
    const currentsArray = BASE_CURRENTS[dataKey] || [];
    
    // Récupération des facteurs
    const fTemp = TEMP_FACTORS[insulation][temperature] || 1;
    
    // Approximation pour les groupements non listés (ex: 11)
    let groupKey = grouping;
    if (!GROUP_FACTORS[groupKey]) {
      const keys = Object.keys(GROUP_FACTORS).map(Number).sort((a, b) => a - b);
      groupKey = keys.find(k => k >= grouping) || 20;
    }
    const fGroup = GROUP_FACTORS[groupKey] || 0.5;
    
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
    const fTotal = fTemp * fGroup * fNeutral;

    // Calculs pour chaque section
    const voltage = systemType === 'mono' ? 230 : 400;
    const b_factor = systemType === 'mono' ? 2 : Math.sqrt(3);
    const rho = RESISTIVITY[`${material}-${insulation}` as keyof typeof RESISTIVITY];
    const sinPhi = Math.sin(Math.acos(cosPhi));

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
        isApplicable: izBase > 0
      };
    });

    return { fTemp, fGroup, fNeutral, fTotal, adjustedIb, calculatedIz, optimalSection };
  }, [material, insulation, method, temperature, grouping, th3, ib, length, cosPhi, systemType]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans flex flex-col md:flex-row">
      
      {/* PANNEAU LATÉRAL : CONFIGURATION */}
      <aside className="w-full md:w-80 bg-[#151619] text-white p-6 flex flex-col shadow-2xl z-10 h-screen overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#F27D26] rounded-lg">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Calculateur Iz & ΔU</h1>
            <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">Norme NF C 15-100</p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Section : Câble */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 flex items-center gap-2">
              <Settings2 size={14} /> 1. Câble & Pose
            </h2>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1 text-gray-300">Matériau</label>
                <select value={material} onChange={(e) => setMaterial(e.target.value as 'Cu' | 'Al')} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]">
                  <option value="Cu">Cuivre (Cu)</option>
                  <option value="Al">Aluminium (Al)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-300">Isolant</label>
                <select value={insulation} onChange={(e) => setInsulation(e.target.value as 'PVC' | 'PR')} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]">
                  <option value="PVC">PVC (70°C)</option>
                  <option value="PR">PR/EPR (90°C)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-300">Type de câble</label>
              <select value={cableType} onChange={handleCableTypeChange} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]">
                <option value="multi">Câble multiconducteur</option>
                <option value="mono">Câbles monoconducteurs</option>
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-300">Méthode de référence</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]">
                <option value="A">A (Encastré dans paroi isolante)</option>
                <option value="B">B (Sous conduit en apparent)</option>
                <option value="C">C (Fixé sur paroi)</option>
                {cableType === 'multi' && <option value="E">E (Sur chemin de câble perforé)</option>}
                {cableType === 'mono' && <option value="F">F (Câbles jointifs sur tablette)</option>}
              </select>
            </div>
          </div>

          {/* Section : Environnement */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mt-4">
              2. Environnement
            </h2>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1 text-gray-300">Température</label>
                <select value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]">
                  {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(t => (
                    <option key={t} value={t}>{t} °C</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-300">Groupement</label>
                <input type="number" min="1" max="20" value={grouping} onChange={(e) => setGrouping(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]" />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-300">Taux d'harmoniques (TH3) - Neutre</label>
              <select value={th3} onChange={(e) => setTh3(e.target.value as any)} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]">
                <option value="<15">TH3 ≤ 15% (Neutre non chargé)</option>
                <option value="15-33">15% &lt; TH3 ≤ 33% (Facteur 0.86)</option>
                <option value=">33">TH3 &gt; 33% (Surdimensionnement)</option>
              </select>
            </div>
          </div>

          {/* Section : Circuit */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mt-4">
              3. Paramètres du Circuit
            </h2>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1 text-gray-300">Réseau</label>
                <select value={systemType} onChange={(e) => setSystemType(e.target.value as any)} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]">
                  <option value="mono">Mono (230V)</option>
                  <option value="tri">Tri (400V)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-300">Courant Ib (A)</label>
                <input type="number" min="1" value={ib} onChange={(e) => setIb(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1 text-gray-300">Longueur (m)</label>
                <input type="number" min="1" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]" />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-300">Cos(φ)</label>
                <input type="number" min="0.1" max="1" step="0.05" value={cosPhi} onChange={(e) => setCosPhi(Number(e.target.value))} className="w-full bg-[#222429] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#F27D26]" />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Température</div>
              <div className="text-2xl font-light font-mono">{results.fTemp.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Groupement</div>
              <div className="text-2xl font-light font-mono">{results.fGroup.toFixed(2)}</div>
            </div>
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
