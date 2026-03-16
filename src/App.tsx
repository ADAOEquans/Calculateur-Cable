import { useState, useMemo, useEffect } from 'react';
import { 
  Zap, 
  Users, 
  Layers, 
  Activity,
  CheckCircle2,
  XCircle,
  Info,
  Save,
  FolderOpen
} from 'lucide-react';
import { 
  type MaterialType, 
  type InsulationType,
  type NetworkType,
  type CircuitType,
  type AGCPCaliber,
  MODES_DE_POSE,
  getModeDePose,
  getGroupingOptions
} from './data/nfc15100';
import { calculateAllSections, type CalculationResult } from './utils/calculator';

function App() {
  // --- States for Sidebar Settings ---
  // 1. Câble & Pose
  const [material, setMaterial] = useState<MaterialType>('Cu');
  const [insulation, setInsulation] = useState<InsulationType>('PR');
  const [cableType, setCableType] = useState<string>('multiconductor');
  // Replacing poseMethod string with modeId
  const [modeId, setModeId] = useState<number>(31); // Default to Mode 31 (Chemin de câble perforé)

  // 2. Environnement
  const [temperature, setTemperature] = useState<number>(30);
  const [groupingCircuits, setGroupingCircuits] = useState<number>(1.00); // Value is now the specific factor
  const [th3Factor, setTh3Factor] = useState<number>(0.86); // Default to 15-33% case
  
  // NOUVEAUX FACTEURS
  const [sunExposure, setSunExposure] = useState<boolean>(false);
  const [explosionRisk, setExplosionRisk] = useState<boolean>(false);
  const [soilResistivity, setSoilResistivity] = useState<number>(1.0); // K.m/W

  const currentMode = getModeDePose(modeId);
  const groupingOptions = useMemo(() => getGroupingOptions(modeId, cableType), [modeId, cableType]);

  // Si on change de mode, réinitialiser le groupement au premier choix (1 circuit)
  useEffect(() => {
    if (groupingOptions.length > 0) {
      setGroupingCircuits(groupingOptions[0].factor);
    }
  }, [modeId, cableType]);

  // 3. Paramètres du Circuit
  const [network, setNetwork] = useState<NetworkType>('Tri');
  const [currentIb, setCurrentIb] = useState<number>(32);
  const [length, setLength] = useState<number>(50);
  const [cosPhi, setCosPhi] = useState<number>(0.85);
  const [circuitType, setCircuitType] = useState<CircuitType>('Standard');
  const [agcpCaliber, setAgcpCaliber] = useState<AGCPCaliber>(45);

  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isNaming, setIsNaming] = useState(false);
  const [configName, setConfigName] = useState('ma_config');

  // --- Persistence Logic (File-based) ---
  const handleSaveConfig = async () => {
    const config = {
      material, insulation, cableType, modeId,
      temperature, groupingCircuits, th3Factor, 
      sunExposure, explosionRisk, soilResistivity,
      network, currentIb, length, cosPhi, circuitType, agcpCaliber
    };
    const data = JSON.stringify(config, null, 2);

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${configName}.adsciz`,
          types: [{
            description: 'Calculateur NF C 15-100 Config',
            accept: { 'application/x-adsciz': ['.adsciz'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        
        setIsNaming(false);
        setLastAction('Enregistré !');
        setTimeout(() => setLastAction(null), 2000);
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error("File System Access API error:", err);
      }
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${configName}.adsciz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsNaming(false);
    setLastAction('Téléchargé !');
    setTimeout(() => setLastAction(null), 2000);
  };

  const handleLoadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        if (config.material) setMaterial(config.material);
        if (config.insulation) setInsulation(config.insulation);
        if (config.modeId) setModeId(config.modeId);
        if (config.temperature) setTemperature(config.temperature);
        if (config.groupingCircuits) setGroupingCircuits(config.groupingCircuits);
        if (config.th3Factor) setTh3Factor(config.th3Factor);
        
        if (config.sunExposure !== undefined) setSunExposure(config.sunExposure);
        if (config.explosionRisk !== undefined) setExplosionRisk(config.explosionRisk);
        if (config.soilResistivity !== undefined) setSoilResistivity(config.soilResistivity);

        if (config.network) setNetwork(config.network);
        if (config.currentIb) setCurrentIb(config.currentIb);
        if (config.length) setLength(config.length);
        if (config.cosPhi) setCosPhi(config.cosPhi);
        if (config.circuitType) setCircuitType(config.circuitType);
        if (config.agcpCaliber) setAgcpCaliber(config.agcpCaliber);
        
        setLastAction(`Configuration "${file.name}" chargée.`);
        setTimeout(() => setLastAction(null), 2000);
      } catch (err) {
        console.error("Erreur lors de l'import :", err);
        setLastAction('Fichier invalide');
        setTimeout(() => setLastAction(null), 2000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const triggerFilePicker = () => {
    document.getElementById('config-upload')?.click();
  };

  // --- Calculation Logic ---
  const results: CalculationResult = useMemo(() => {
    return calculateAllSections(
      {
        material, 
        insulation, 
        modeId, 
        conductorCount: network === 'Mono' ? 2 : 3,
        temperature, 
        groupingCircuits, 
        groupingLayers: 1, // Fixe pour l'instant
        th3Factor, 
        network, 
        currentIb, 
        length, 
        cosPhi,
        sunExposure,
        explosionRisk,
        soilResistivity
      },
      circuitType,
      agcpCaliber
    );
  }, [
    material, insulation, modeId, network, temperature, groupingCircuits, 
    th3Factor, currentIb, length, cosPhi, circuitType, agcpCaliber,
    sunExposure, explosionRisk, soilResistivity
  ]);

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-neutral-100 font-sans overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-[360px] border-r border-neutral-800 bg-[#141414] overflow-hidden shrink-0 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 mb-0.5">
            <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
            <h1 className="font-bold text-base tracking-tight">Calculateur Iz & ΔU</h1>
          </div>
          <p className="text-[9px] text-neutral-500 font-semibold uppercase tracking-[0.2em]">Norme NF C 15-100</p>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          
          {/* Section 1: CÂBLE & POSE */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
                <Layers className="w-3.5 h-3.5" />
                <span>1. CÂBLE & POSE</span>
              </div>
              <div className="flex items-center gap-2">
                {lastAction && (
                  <span className="text-[10px] text-orange-400 font-bold animate-pulse mr-2">{lastAction}</span>
                )}
                {!isNaming ? (
                  <>
                    <button 
                      onClick={() => setIsNaming(true)}
                      title="Sauvegarder la configuration"
                      className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-md transition-all border border-neutral-700/50"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={triggerFilePicker}
                      title="Charger la configuration (.adsciz)"
                      className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-md transition-all border border-neutral-700/50"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 bg-[#1c1c1c] p-1 rounded-lg border border-neutral-700 shadow-xl">
                    <input 
                      autoFocus
                      type="text"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveConfig()}
                      className="bg-transparent text-[10px] px-2 py-0.5 outline-none w-24 text-white"
                      placeholder="Nom..."
                    />
                    <button 
                      onClick={handleSaveConfig}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-bold px-2 py-1 rounded transition-colors"
                    >
                      OK
                    </button>
                    <button 
                      onClick={() => setIsNaming(false)}
                      className="text-neutral-500 hover:text-neutral-300 text-[11px] px-1"
                    >
                      ×
                    </button>
                  </div>
                )}
                <input 
                  type="file" 
                  id="config-upload" 
                  accept=".adsciz" 
                  onChange={handleLoadConfig} 
                  className="hidden" 
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-400 mb-1.5 block">Matériau</label>
                  <select 
                    value={material} onChange={(e) => setMaterial(e.target.value as MaterialType)}
                    className="w-full bg-[#1c1c1c] border border-neutral-700/50 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none transition-all"
                  >
                    <option value="Cu">Cuivre (Cu)</option>
                    <option value="Al">Aluminium (Al)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 mb-1.5 block">Isolant</label>
                  <select 
                    value={insulation} onChange={(e) => setInsulation(e.target.value as InsulationType)}
                    className="w-full bg-[#1c1c1c] border border-neutral-700/50 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none transition-all"
                  >
                    <option value="PR">PR/EPR (90°C)</option>
                    <option value="PVC">PVC (70°C)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 mb-1.5 block">Type de câble</label>
                <select 
                  value={cableType} onChange={(e) => {
                    setCableType(e.target.value);
                    // Réinitialiser le mode de pose à la première option valide pour ce type de câble
                    const firstValidMode = MODES_DE_POSE.find(m => m.cableTypes.includes(e.target.value as 'multiconductor' | 'unipolar'));
                    if (firstValidMode) setModeId(firstValidMode.id);
                  }}
                  className="w-full bg-[#1c1c1c] border border-neutral-700/50 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none transition-all"
                >
                  <option value="multiconductor">Câble multiconducteur</option>
                  <option value="unipolar">Câble unipolaire</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 mb-1.5 block">Mode de pose / Méthode</label>
                <select 
                  value={modeId} onChange={(e) => setModeId(Number(e.target.value))}
                  className="w-full bg-[#1c1c1c] border border-neutral-700/50 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none transition-all truncate"
                >
                  {MODES_DE_POSE.filter(mode => mode.cableTypes.includes(cableType as 'multiconductor' | 'unipolar')).map(mode => (
                    <option key={mode.id} value={mode.id}>
                      Mode {mode.id} - ({mode.referenceMethod}) {mode.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: ENVIRONNEMENT */}
          <section>
            {/* 2. ENVIRONNEMENT */}
            <div className="space-y-3 pt-3 border-t border-neutral-800">
              <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-bold uppercase tracking-widest">
                <Users className="w-3 h-3" />
                2. ENVIRONNEMENT & CIRCUIT
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Température</label>
                  <select 
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  >
                    {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(t => (
                      <option key={t} value={t}>{t} °C</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Nombre de circuits (Groupement)</label>
                  <select 
                    value={groupingCircuits}
                    onChange={(e) => setGroupingCircuits(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  >
                    {groupingOptions.map((opt, idx) => (
                      <option key={idx} value={opt.factor}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">Taux d'harmoniques (TH3) - Neutre</label>
                  <select 
                    value={th3Factor}
                    onChange={(e) => setTh3Factor(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  >
                    <option value={1.00}>TH3 ≤ 15% (Facteur 1.00)</option>
                    <option value={0.86}>15% &lt; TH3 ≤ 33% (Facteur 0.86)</option>
                    <option value={1.01}>33% &lt; TH3 ≤ 45% (Facteur 1.00 / Iz Neutre)</option>
                    <option value={0.861}>TH3 &gt; 45% (Facteur 0.86 / Iz Neutre)</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-neutral-800/50">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase mb-2 block">Facteurs supplémentaires (Tab. NF C 15-100)</label>
                  
                  {currentMode?.environment === 'Enterré' && (
                    <div className="mb-2 space-y-1">
                      <label className="text-[10px] text-neutral-400 block">Résistivité thermique du sol (K.m/W)</label>
                      <select 
                        value={soilResistivity}
                        onChange={(e) => setSoilResistivity(Number(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                      >
                        <option value={1.0}>1.0 K.m/W (Défaut)</option>
                        <option value={1.5}>1.5 K.m/W (Sol sec)</option>
                        <option value={2.0}>2.0 K.m/W (Sol très sec)</option>
                        <option value={2.5}>2.5 K.m/W (Sable sec)</option>
                        <option value={3.0}>3.0 K.m/W (Extrême)</option>
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 mb-1.5 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={sunExposure}
                      onChange={(e) => setSunExposure(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-neutral-900 border-neutral-700 text-orange-500 focus:ring-orange-500/50"
                    />
                    <span className="text-xs text-neutral-300 group-hover:text-white transition-colors">Soleil direct</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={explosionRisk}
                      onChange={(e) => setExplosionRisk(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-neutral-900 border-neutral-700 text-orange-500 focus:ring-orange-500/50"
                    />
                    <span className="text-xs text-neutral-300 group-hover:text-white transition-colors">Risque explosion BE3</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

        </div>

        <div className="p-3 bg-orange-500/5 border-t border-neutral-800 mt-auto">
          <div className="flex gap-2">
            <Info className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-neutral-400 leading-tight">
              Calculs NF C 15-100-1 (Juillet 2024). ΔU max 5%.
            </p>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d] overflow-y-auto">
        
        {/* Header Summary */}
        <div className="px-10 pt-10 pb-6 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-semibold mb-2 text-white">Analyse de la canalisation</h2>
            <p className="text-neutral-500 text-sm">Dimensionnement selon la norme NF C 15-100 (Intensité et Chute de tension)</p>
          </div>
          
          <div className="bg-[#1a2e25] border border-emerald-500/30 px-6 py-3 rounded-xl flex flex-col items-end">
             <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">SECTION OPTIMALE</span>
                <div className="text-3xl font-bold text-emerald-400 mt-1">
                  {results.optimalSection ? `${results.optimalSection} mm²` : '—'}
                </div>
             </div>
          </div>

        {/* --- NEW: Horizontal Circuit Parameters Bar --- */}
        <div className="px-10 mb-8">
          <div className="bg-[#141414] border border-neutral-800 p-6 rounded-3xl shadow-xl flex items-center justify-between gap-8">
            <div className="flex items-center gap-3 pr-6 border-r border-neutral-800">
               <div className="bg-orange-500/10 p-2 rounded-xl">
                 <Activity className="w-5 h-5 text-orange-500" />
               </div>
               <div className="whitespace-nowrap">
                 <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Circuit</h3>
                 <p className="text-[10px] text-neutral-500">Paramètres dynamiques</p>
               </div>
            </div>

            <div className="flex-1 grid grid-cols-4 gap-6">
              <div>
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight mb-2 block">Réseau</label>
                <select 
                  value={network} onChange={(e) => setNetwork(e.target.value as NetworkType)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all cursor-pointer"
                >
                  <option value="Mono">Monophasé (230V)</option>
                  <option value="Tri">Triphasé (400V)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight mb-2 block">Courant Ib (A)</label>
                <div className="relative">
                  <input 
                    type="number" value={currentIb} onChange={(e) => setCurrentIb(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 font-bold">A</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight mb-2 block">Longueur (m)</label>
                <div className="relative">
                  <input 
                    type="number" value={length} onChange={(e) => setLength(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 font-bold">m</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight mb-2 block">Cos(φ)</label>
                <input 
                  type="number" step="0.01" value={cosPhi} onChange={(e) => setCosPhi(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global Factors Cards */}
        <div className="px-10 mb-8 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[120px] bg-white p-5 rounded-2xl shadow-sm border border-neutral-200/10 flex flex-col">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">TEMP. (k1)</span>
            <span className="text-xl font-semibold text-black">{results.factors.k1.toFixed(2)}</span>
          </div>
          <div className="flex-1 min-w-[120px] bg-white p-5 rounded-2xl shadow-sm border border-neutral-200/10 flex flex-col">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">GROUP. (k2)</span>
            <span className="text-xl font-semibold text-black">{results.factors.k2.toFixed(2)}</span>
          </div>
          <div className="flex-1 min-w-[120px] bg-white p-5 rounded-2xl shadow-sm border border-neutral-200/10 flex flex-col">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">NEUTRE</span>
            <span className="text-xl font-semibold text-black">{results.factors.fNeutre.toFixed(2)}</span>
          </div>
          
          {/* Nouveau: Facteurs optionnels affichés conditionnellement */}
          {results.factors.kSun < 1.0 && (
            <div className="flex-1 min-w-[120px] bg-amber-50 p-5 rounded-2xl shadow-sm border border-amber-200/30 flex flex-col">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">SOLEIL</span>
              <span className="text-xl font-semibold text-amber-600">{results.factors.kSun.toFixed(2)}</span>
            </div>
          )}
          {results.factors.kExplosion < 1.0 && (
            <div className="flex-1 min-w-[120px] bg-red-50 p-5 rounded-2xl shadow-sm border border-red-200/30 flex flex-col">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">RISQUE EX.</span>
              <span className="text-xl font-semibold text-red-600">{results.factors.kExplosion.toFixed(2)}</span>
            </div>
          )}
          {results.factors.kSoil !== 1.0 && (
            <div className="flex-1 min-w-[120px] bg-stone-50 p-5 rounded-2xl shadow-sm border border-stone-200/30 flex flex-col">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3">SOL</span>
              <span className="text-xl font-semibold text-stone-600">{results.factors.kSoil.toFixed(2)}</span>
            </div>
          )}

          <div className="flex-[2] min-w-[200px] bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex flex-col text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 bg-orange-500/10 w-24 h-24 rounded-full blur-2xl"></div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em] mb-3 relative z-10">FACTEUR GLOBAL (F)</span>
            <span className="text-2xl font-bold text-orange-400 relative z-10">{results.factors.fGlobal.toFixed(3)}</span>
          </div>
        </div>

        {/* Results Table */}
        <div className="px-10 pb-10 flex-1">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/10 h-full flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    <th className="px-8 py-5">SECTION</th>
                    <th className="px-6 py-5">I'Z BASE</th>
                    <th className="px-6 py-5">IZ FINAL</th>
                    <th className="px-6 py-5">ΔU (V)</th>
                    <th className="px-6 py-5 text-right">ΔU (%)</th>
                    <th className="px-8 py-5 text-center">STATUT</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const analyses = results.analyses;
                    const optimalIndex = analyses.findIndex((a: any) => a.status?.toUpperCase() === 'OPTIMAL');
                    
                    if (optimalIndex === -1) {
                      return analyses.map((analysis: any) => renderRow(analysis));
                    }

                    // Synthetic strategy: 
                    // - Up to 2 non-valid rows before optimal
                    // - The optimal row
                    // - 1 valid row after optimal (if it exists)
                    const startIndex = Math.max(0, optimalIndex - 2);
                    const endIndex = Math.min(analyses.length - 1, optimalIndex + 1);
                    
                    return analyses.slice(startIndex, endIndex + 1).map((analysis: any) => renderRow(analysis));

                    function renderRow(analysis: any) {
                      if (!analysis) return null;
                      const status = analysis.status; // 'invalid', 'optimal', 'valid'
                      
                      let displayStatus = "";
                      let statusStyles = "";
                      let StatusIcon = CheckCircle2;

                      if (status === 'optimal') {
                        displayStatus = "OPTIMAL";
                        statusStyles = "bg-emerald-50 text-emerald-600 border-emerald-200";
                        StatusIcon = CheckCircle2;
                      } else if (status === 'valid') {
                        displayStatus = "VALIDE";
                        statusStyles = "bg-blue-50 text-blue-600 border-blue-200";
                        StatusIcon = CheckCircle2;
                      } else {
                        // Invalid cases
                        statusStyles = "bg-red-50 text-red-500 border-red-100";
                        StatusIcon = XCircle;
                        if (!analysis.isValidMinSection) {
                          displayStatus = "SECTION NON CONFORME";
                        } else if (!analysis.isValidIz) {
                          displayStatus = "IZ INSUFFISANTE";
                        } else if (!analysis.isValidDeltaU) {
                          displayStatus = "ΔU LIMITE";
                          StatusIcon = Info;
                        } else {
                          displayStatus = "NON VALIDE";
                        }
                      }

                      return (
                        <tr key={analysis.section} className={`group border-b border-neutral-100 transition-colors ${status === 'optimal' ? 'bg-orange-50/30' : 'hover:bg-neutral-50/50'}`}>
                          <td className="px-8 py-5 font-bold text-neutral-800 flex items-center gap-2">
                            {analysis.section} <span className="text-neutral-400 font-medium text-xs">mm²</span>
                          </td>
                          <td className="px-6 py-5 font-mono text-sm text-neutral-600">
                            {analysis.izBase?.toFixed(1) ?? '0.0'} A
                          </td>
                          <td className={`px-6 py-5 font-mono text-sm font-bold ${!analysis.isValidIz ? 'text-red-500' : 'text-neutral-700'}`}>
                            {analysis.izFinal?.toFixed(1) ?? '0.0'} A
                          </td>
                          <td className={`px-6 py-5 font-mono text-sm ${!analysis.isValidDeltaU ? 'text-red-400' : 'text-neutral-600'}`}>
                            {analysis.deltaU?.toFixed(2) ?? '0.00'} V
                          </td>
                          <td className={`px-6 py-5 font-mono text-sm text-right font-bold ${!analysis.isValidDeltaU ? 'text-red-500' : 'text-neutral-700'}`}>
                            {analysis.deltaUPercent?.toFixed(2) ?? '0.00'} %
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="inline-flex">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyles}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {displayStatus}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </div>
            
            {/* Empty space filler */}
            <div className="flex-1 bg-white"></div>
          </div>
        </div>
      </main>

    </div>
  );
}

export default App;
