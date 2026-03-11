import { 
    type MaterialType, 
    type InsulationType, 
    type PoseMethod, 
    type ConductorCount, 
    type NetworkType,
    type CircuitType,
    type AGCPCaliber,
    sections, 
    table52_8A, 
    table52_8B, 
    getTempCorrectionFactor,
    RHO_CU,
    RHO_AL,
    LAMBDA
} from '../data/nfc15100';

export interface SectionAnalysis {
    section: number;
    izBase: number;
    izFinal: number;
    deltaU: number; // in Volts
    deltaUPercent: number; // in %
    isValidIz: boolean;
    isValidDeltaU: boolean;
    isValidMinSection: boolean;
    status: 'invalid' | 'optimal' | 'valid';
}

export interface CalculationResult {
    analyses: SectionAnalysis[];
    optimalSection: number | null;
    factors: {
        k1: number;
        k2: number;
        fNeutre: number;
        fGlobal: number;
    };
    networkVoltage: number;
    error?: string;
}

export const calculateAllSections = (
    currentIb: number,
    material: MaterialType,
    insulation: InsulationType,
    poseMethod: PoseMethod,
    conductorCount: ConductorCount,
    temperature: number,
    groupingFactor: number,
    th3Factor: number,
    network: NetworkType,
    length: number,
    cosPhi: number,
    circuitType: CircuitType = 'Standard',
    agcpCaliber?: AGCPCaliber
): CalculationResult => {
    
    // Physical Constants
    const rho = material === 'Cu' ? RHO_CU : RHO_AL;
    const b = network === 'Mono' ? 2 : Math.sqrt(3);
    const vNom = network === 'Mono' ? 230 : 400;
    const sinPhi = Math.sqrt(1 - Math.pow(cosPhi, 2));

    // Correction Factors
    const k1 = getTempCorrectionFactor(temperature, insulation);
    const k2 = groupingFactor;
    const fNeutre = th3Factor;
    const fGlobal = k1 * k2 * fNeutre;

    const table = insulation === 'PVC' ? table52_8A : table52_8B;
    const analyses: SectionAnalysis[] = [];
    let optimalFound = false;

    // Standard Voltage Drop Limit (e.g. 5%)
    const DELTA_U_LIMIT = 5;

    // Determine Minimum Section (NF C 15-100 rules)
    let minSectionNorme = material === 'Al' ? 10 : 1.5;

    // Table 52.21 for Branchement (Main Supply)
    if (circuitType === 'Branchement' && agcpCaliber) {
        if (agcpCaliber <= 45) minSectionNorme = Math.max(minSectionNorme, 10);
        else if (agcpCaliber === 60) minSectionNorme = Math.max(minSectionNorme, 16);
        else if (agcpCaliber === 90) minSectionNorme = Math.max(minSectionNorme, 25);
    }

    for (const s of sections) {
        let izBase = table[s]?.[poseMethod]?.[conductorCount] || 0;
        
        // Material adjustment factor for Al if using Cu tables (Simplified approach)
        if (material === 'Al') {
            izBase *= 0.78; 
        }

        const izFinal = izBase * fGlobal;

        // Voltage Drop calculation
        const duVal = b * length * currentIb * ((rho / s) * cosPhi + (LAMBDA / 1000) * sinPhi);
        const duPercent = (duVal / vNom) * 100;

        const isValidIz = izFinal >= currentIb;
        const isValidDeltaU = duPercent <= DELTA_U_LIMIT;
        const isValidMinSection = s >= minSectionNorme;
        
        let status: 'invalid' | 'optimal' | 'valid' = 'invalid';
        if (isValidIz && isValidDeltaU && isValidMinSection) {
            if (!optimalFound) {
                status = 'optimal';
                optimalFound = true;
            } else {
                status = 'valid';
            }
        }

        analyses.push({
            section: s,
            izBase,
            izFinal,
            deltaU: duVal,
            deltaUPercent: duPercent,
            isValidIz,
            isValidDeltaU,
            isValidMinSection,
            status
        });
    }

    const optimalSection = analyses.find(a => a.status === 'optimal')?.section || null;

    return {
        analyses,
        optimalSection,
        factors: {
            k1,
            k2,
            fNeutre,
            fGlobal
        },
        networkVoltage: vNom
    };
};
