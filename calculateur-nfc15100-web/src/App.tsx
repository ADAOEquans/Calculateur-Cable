import { useState, useMemo } from 'react';
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
  type PoseMethod, 
  type NetworkType,
  type CircuitType,
  type AGCPCaliber
} from './data/nfc15100';
import { calculateAllSections, type CalculationResult } from './utils/calculator';

function App() {
  // --- States for Sidebar Settings ---
  // 1. Câble & Pose
  const [material, setMaterial] = useState<MaterialType>('Cu');
  const [insulation, setInsulation] = useState<InsulationType>('PR');
  const [cableType, setCableType] = useState<string>('multiconductor');
  const [poseMethod, setPoseMethod] = useState<PoseMethod>('E');

  // 2. Environnement
  const [temperature, setTemperature] = useState<number>(30);
  const [groupingFactor, setGroupingFactor] = useState<number>(1.00);
  const [th3Factor, setTh3Factor] = useState<number>(0.86); // Default to 15-33% case

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
      material, insulation, cableType, poseMethod,
      temperature, groupingFactor, th3Factor, network, currentIb, length, cosPhi, circuitType, agcpCaliber
    };
    const data = JSON.stringify(config, null, 2);

    // 1. Try modern File System Access API (allows "Save As" location/name)
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
        // user cancelled or error
        if ((err as Error).name === 'AbortError') return;
        console.error("File System Access API error:", err);
      }
    }

    // 2. Fallback for other browsers (standard download)
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
        if (config.poseMethod) setPoseMethod(config.poseMethod);
        if (config.temperature) setTemperature(config.temperature);
        if (config.groupingFactor) setGroupingFactor(config.groupingFactor);
        if (config.th3Factor) setTh3Factor(config.th3Factor);
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
    // Reset input for same file re-selection
    e.target.value = '';
  };

  const triggerFilePicker = () => {
    document.getElementById('config-upload')?.click();
  };

  // --- Calculation Logic ---
  const results: CalculationResult = useMemo(() => {
    return calculateAllSections(
      currentIb,
      material,
      insulation,
      poseMethod,
      network === 'Mono' ? 2 : 3,
      temperature,
      groupingFactor,
      th3Factor,
      network,
      length,
      cosPhi,
      circuitType,
      agcpCaliber
    );
  }, [currentIb, material, insulation, poseMethod, network, temperature, groupingFactor, th3Factor, length, cosPhi, circuitType, agcpCaliber]);

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-neutral-100 font-sans overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-80 border-r border-neutral-800 bg-[#141414] overflow-y-auto shrink-0 flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-orange-500 p-1.5 rounded-lg shadow-lg shadow-orange-500/20">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Calculateur Iz & ΔU</h1>
          </div>
          <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-[0.2em]">Norme NF C 15-100</p>
        </div>

        <div className="flex-1 p-6 space-y-8">
          
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
            
            <div className="space-y-4">
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
                  value={cableType} onChange={(e) => setCableType(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-neutral-700/50 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none transition-all"
                >
                  <option value="multiconductor">Câble multiconducteur</option>
                  <option value="unipolar">Câble unipolaire</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 mb-1.5 block">Méthode de référence</label>
                <select 
                  value={poseMethod} onChange={(e) => setPoseMethod(e.target.value as PoseMethod)}
                  className="w-full bg-[#1c1c1c] border border-neutral-700/50 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none transition-all truncate"
                >
                  <option value="A1">A1 (Dans conduit en paroi isolante)</option>
                  <option value="A2">A2 (Dans conduit en paroi non isolante)</option>
                  <option value="B1">B1 (Dans conduit en apparent)</option>
                  <option value="B2">B2 (Dans conduit encastré)</option>
                  <option value="C">C (En saillie sur paroi)</option>
                  <option value="D">D (Enterré dans le sol)</option>
                  <option value="E">E (Sur chemin de câble perforé)</option>
                  <option value="F">F (Sur chemin de câble non perforé/corbeaux)</option>
                  <option value="G">G (Câbles unipolaires espacés)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: ENVIRONNEMENT */}
          <section>
            {/* 2. ENVIRONNEMENT */}
            <div className="space-y-6 pt-4 border-t border-neutral-800">
              <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                <Users className="w-3.5 h-3.5" />
                2. ENVIRONNEMENT & CIRCUIT
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                    value={groupingFactor}
                    onChange={(e) => setGroupingFactor(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  >
                    <option value={1.00}>1 (Facteur 1.00)</option>
                    <option value={0.80}>2 (Facteur 0.80)</option>
                    <option value={0.70}>3 (Facteur 0.70)</option>
                    <option value={0.65}>4 (Facteur 0.65)</option>
                    <option value={0.60}>5 (Facteur 0.60)</option>
                    <option value={0.57}>6 (Facteur 0.57)</option>
                    <option value={0.54}>7 (Facteur 0.54)</option>
                    <option value={0.52}>8 (Facteur 0.52)</option>
                    <option value={0.50}>9 ou + (Facteur 0.50)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Taux d'harmoniques (TH3) - Neutre</label>
                <select 
                  value={th3Factor}
                  onChange={(e) => setTh3Factor(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                >
                  <option value={1.00}>TH3 ≤ 15% (Facteur 1.00)</option>
                  <option value={0.86}>15% &lt; TH3 ≤ 33% (Facteur 0.86)</option>
                  <option value={1.01}>33% &lt; TH3 ≤ 45% (Facteur 1.00 / Iz Neutre)</option>
                  <option value={0.861}>TH3 &gt; 45% (Facteur 0.86 / Iz Neutre)</option>
                </select>
                <p className="text-[9px] text-neutral-500 mt-1 italic">
                  Note: Pour TH3 &gt; 33%, le neutre est considéré comme chargé (Tableau 52H).
                </p>
              </div>
            </div>
          </section>

        </div>

        <div className="p-4 bg-orange-500/5 border-t border-neutral-800 m-4 rounded-xl">
          <div className="flex gap-3">
            <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Calculs basés sur la norme NF C 15-100. La chute de tension limite est fixée par défaut à 5%.
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
        <div className="px-10 mb-8 grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200/10 flex flex-col">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">TEMPÉRATURE</span>
            <span className="text-2xl font-semibold text-black">{results.factors.k1.toFixed(2)}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200/10 flex flex-col">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">GROUPEMENT</span>
            <span className="text-2xl font-semibold text-black">{results.factors.k2.toFixed(2)}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200/10 flex flex-col">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">NEUTRE (TH3)</span>
            <span className="text-2xl font-semibold text-black">{results.factors.fNeutre.toFixed(2)}</span>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col text-white shadow-2xl">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">FACTEUR GLOBAL (F)</span>
            <span className="text-2xl font-semibold text-orange-400">{results.factors.fGlobal.toFixed(3)}</span>
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
