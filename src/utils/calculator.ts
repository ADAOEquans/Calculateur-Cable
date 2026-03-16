import { 
    type CalculationInput,
    sections, 
    table52_8A, 
    table52_8B, 
    getTempCorrectionFactor,
    getModeDePose,
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
        kSun: number;
        kExplosion: number;
        kSoil: number;
        fGlobal: number;
    };
    networkVoltage: number;
    error?: string;
}

export const calculateAllSections = (
    input: CalculationInput,
    circuitType: 'Standard' | 'Branchement' = 'Standard',
    agcpCaliber?: 30 | 45 | 60 | 90
): CalculationResult => {
    
    const {
        material, insulation, modeId, conductorCount, temperature,
        groupingCircuits, th3Factor, network, currentIb, length, cosPhi,
        sunExposure, explosionRisk, soilResistivity
    } = input;

    // Physical Constants
    const rho = material === 'Cu' ? RHO_CU : RHO_AL;
    const b = network === 'Mono' ? 2 : Math.sqrt(3);
    const vNom = network === 'Mono' ? 230 : 400;
    const sinPhi = Math.sqrt(1 - Math.pow(cosPhi, 2));

    const mode = getModeDePose(modeId);
    if (!mode) {
        return { analyses: [], optimalSection: null, factors: { k1: 1, k2: 1, fNeutre: 1, kSun: 1, kExplosion: 1, kSoil: 1, fGlobal: 1 }, networkVoltage: vNom, error: "Mode de pose invalide" };
    }

    // Correction Factors
    const k1 = getTempCorrectionFactor(temperature, insulation, mode.environment);
    // Le k2 (groupingCircuits) est déjà le facteur sélectionné depuis l'UI dans input.groupingCircuits
    const k2 = groupingCircuits; 
    const fNeutre = th3Factor;
    
    // Facteurs spécifiques
    const kSun = sunExposure ? 0.85 : 1.0; // Tableau 512.2.11 (Approximation)
    const kExplosion = explosionRisk ? 0.85 : 1.0; // BE3 (Tableau 42.3 : facteur 0.85 à moduler selon cas)
    
    // Pour le sol (Tableau 52.11), 1 K.m/W = 1.0. Si résistivité > 1, k<1.
    let kSoil = 1.0;
    if (mode.environment === 'Enterré' && soilResistivity) {
        if (soilResistivity === 1.5) kSoil = 0.9;
        if (soilResistivity === 2.0) kSoil = 0.8;
        if (soilResistivity === 2.5) kSoil = 0.72;
        if (soilResistivity === 3.0) kSoil = 0.65;
    }

    const fGlobal = k1 * k2 * fNeutre * kSun * kExplosion * kSoil;

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

    // Reference method to use for Iz lookup
    const refMethod = mode.referenceMethod;

    for (const s of sections) {
        let izBase = table[s]?.[refMethod]?.[conductorCount] || 0;
        
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
            kSun,
            kExplosion,
            kSoil,
            fGlobal
        },
        networkVoltage: vNom
    };
};

