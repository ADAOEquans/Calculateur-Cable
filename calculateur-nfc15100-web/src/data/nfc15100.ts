export type MaterialType = 'Cu' | 'Al';
export type InsulationType = 'PVC' | 'PR';
export type PoseMethod = 'B' | 'C' | 'E' | 'F';
export type ConductorCount = 2 | 3;
export type NetworkType = 'Mono' | 'Tri';
export type CircuitType = 'Standard' | 'Branchement';
export type AGCPCaliber = 30 | 45 | 60 | 90;

export interface CalculationInput {
    material: MaterialType;
    insulation: InsulationType;
    poseMethod: PoseMethod;
    conductorCount: ConductorCount;
    section: number; // en mm²
    temperature: number; // en °C
    groupingFactor: number; // k2 (1 par défaut)
    th3Factor: number; // facteur pour le neutre selon TH3 (ex: 0.86)
    network: NetworkType;
    currentIb: number; // en A
    length: number; // en m
    cosPhi: number; // ex: 0.85
}

// Constantes pour chute de tension
export const RHO_CU = 0.0225; // Ω.mm²/m
export const RHO_AL = 0.036; // Ω.mm²/m
export const LAMBDA = 0.08; // mΩ/m (réactance par défaut) => 0.00008 Ω/m

// Tableaux simplifiés 52.8A (PVC) et 52.8B (PR)
// Section (mm²) -> [Méthode B 2 cond, Méthode B 3 cond, Méthode C 2 cond, Méthode C 3 cond, ...]
export const sections = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];

// Valeurs approximatives pour PVC (Iz en Ampères)
export const table52_8A: Record<number, Record<PoseMethod, Record<ConductorCount, number>>> = {
    1.5: { B: { 2: 15.5, 3: 13.5 }, C: { 2: 19.5, 3: 17.5 }, E: { 2: 22, 3: 18.5 }, F: { 2: 24, 3: 20 } },
    2.5: { B: { 2: 21, 3: 18 }, C: { 2: 27, 3: 24 }, E: { 2: 30, 3: 25 }, F: { 2: 33, 3: 28 } },
    4: { B: { 2: 28, 3: 24 }, C: { 2: 36, 3: 32 }, E: { 2: 40, 3: 34 }, F: { 2: 45, 3: 38 } },
    6: { B: { 2: 36, 3: 31 }, C: { 2: 46, 3: 41 }, E: { 2: 51, 3: 43 }, F: { 2: 58, 3: 49 } },
    10: { B: { 2: 50, 3: 43 }, C: { 2: 63, 3: 57 }, E: { 2: 70, 3: 60 }, F: { 2: 80, 3: 68 } },
    16: { B: { 2: 66, 3: 57 }, C: { 2: 85, 3: 76 }, E: { 2: 94, 3: 80 }, F: { 2: 107, 3: 91 } },
    25: { B: { 2: 89, 3: 77 }, C: { 2: 112, 3: 96 }, E: { 2: 119, 3: 101 }, F: { 2: 138, 3: 116 } },
    35: { B: { 2: 111, 3: 96 }, C: { 2: 138, 3: 119 }, E: { 2: 148, 3: 126 }, F: { 2: 171, 3: 144 } },
    50: { B: { 2: 134, 3: 117 }, C: { 2: 168, 3: 144 }, E: { 2: 180, 3: 153 }, F: { 2: 209, 3: 176 } },
    70: { B: { 2: 171, 3: 149 }, C: { 2: 213, 3: 184 }, E: { 2: 232, 3: 196 }, F: { 2: 269, 3: 226 } },
    95: { B: { 2: 207, 3: 180 }, C: { 2: 258, 3: 223 }, E: { 2: 282, 3: 238 }, F: { 2: 328, 3: 275 } },
    120: { B: { 2: 239, 3: 208 }, C: { 2: 299, 3: 259 }, E: { 2: 328, 3: 276 }, F: { 2: 382, 3: 320 } }
};

// Valeurs approximatives pour PR (Iz en Ampères)
export const table52_8B: Record<number, Record<PoseMethod, Record<ConductorCount, number>>> = {
    1.5: { B: { 2: 19, 3: 17.5 }, C: { 2: 24, 3: 22 }, E: { 2: 26, 3: 23 }, F: { 2: 28, 3: 24 } },
    2.5: { B: { 2: 26, 3: 24 }, C: { 2: 33, 3: 30 }, E: { 2: 36, 3: 32 }, F: { 2: 39, 3: 35 } },
    4: { B: { 2: 35, 3: 32 }, C: { 2: 45, 3: 40 }, E: { 2: 49, 3: 42 }, F: { 2: 53, 3: 47 } },
    6: { B: { 2: 45, 3: 41 }, C: { 2: 58, 3: 52 }, E: { 2: 63, 3: 54 }, F: { 2: 68, 3: 61 } },
    10: { B: { 2: 61, 3: 57 }, C: { 2: 80, 3: 71 }, E: { 2: 86, 3: 75 }, F: { 2: 95, 3: 84 } },
    16: { B: { 2: 81, 3: 76 }, C: { 2: 107, 3: 96 }, E: { 2: 115, 3: 100 }, F: { 2: 127, 3: 112 } },
    25: { B: { 2: 106, 3: 96 }, C: { 2: 138, 3: 119 }, E: { 2: 149, 3: 127 }, F: { 2: 165, 3: 145 } },
    35: { B: { 2: 131, 3: 119 }, C: { 2: 171, 3: 147 }, E: { 2: 185, 3: 158 }, F: { 2: 205, 3: 180 } },
    50: { B: { 2: 158, 3: 144 }, C: { 2: 209, 3: 179 }, E: { 2: 225, 3: 192 }, F: { 2: 251, 3: 220 } },
    70: { B: { 2: 200, 3: 184 }, C: { 2: 269, 3: 229 }, E: { 2: 289, 3: 246 }, F: { 2: 324, 3: 284 } },
    95: { B: { 2: 241, 3: 223 }, C: { 2: 328, 3: 278 }, E: { 2: 352, 3: 298 }, F: { 2: 395, 3: 346 } },
    120: { B: { 2: 278, 3: 259 }, C: { 2: 382, 3: 322 }, E: { 2: 410, 3: 346 }, F: { 2: 461, 3: 403 } }
};

// Facteurs de correction k1 (Température)
export const getTempCorrectionFactor = (temp: number, insulation: InsulationType): number => {
    if (temp === 30) return 1.0;

    // Tables simplifiées k1
    const pvcFactors: Record<number, number> = { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1.0, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.5 };
    const prFactors: Record<number, number> = { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1.0, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58, 75: 0.50, 80: 0.41 };

    // Arrondir au multiple de 5 le plus proche
    const nearestTemp = Math.round(temp / 5) * 5;
    const factors = insulation === 'PVC' ? pvcFactors : prFactors;

    return factors[nearestTemp] || 1.0;
};

