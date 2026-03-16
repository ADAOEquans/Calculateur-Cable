export type MaterialType = 'Cu' | 'Al';
export type InsulationType = 'PVC' | 'PR';
// La méthode de référence est utile pour lire les tableaux 52.8A et 52.8B
export type PoseMethod = 'A1' | 'A2' | 'B1' | 'B2' | 'C' | 'D' | 'D1' | 'D2' | 'E' | 'F' | 'G';
export type ConductorCount = 2 | 3;
export type NetworkType = 'Mono' | 'Tri';
export type CircuitType = 'Standard' | 'Branchement';
export type AGCPCaliber = 30 | 45 | 60 | 90;
export type EnvironmentType = 'Air' | 'Enterré';
export type CableType = 'multiconductor' | 'unipolar';

export interface ModeDePose {
    id: number;
    description: string;
    referenceMethod: PoseMethod;
    environment: EnvironmentType;
    cableTypes: CableType[];
}

export interface CalculationInput {
    material: MaterialType;
    insulation: InsulationType;
    modeId: number; // NOUVEAU: On utilise l'ID du mode au lieu de la méthode générique
    conductorCount: ConductorCount;
    section?: number; // en mm²
    temperature: number; // en °C (Air ou Sol selon le mode)
    groupingCircuits: number; // Nombre de circuits groupés
    groupingLayers: number; // Nombre de couches (pour modes sur tablettes, etc.)
    th3Factor: number; // facteur pour le neutre selon TH3 (ex: 0.86)
    network: NetworkType;
    currentIb: number; // en A
    length: number; // en m
    cosPhi: number; // ex: 0.85
    // Facteurs spécifiques supplémentaires optionnels
    soilResistivity?: number; // en K.m/W (Défaut: 1.0)
    sunExposure?: boolean; // Facteur d'exposition au soleil
    explosionRisk?: boolean; // BE3
}

// ─────────────────────────────────────────────────────────────────────────────
// DICTIONNAIRE DES MODES DE POSE (Extraits simplifiés pour l'exemple, à compléter)
// ─────────────────────────────────────────────────────────────────────────────
export const MODES_DE_POSE: ModeDePose[] = [
    { id: 1, description: 'Conducteurs isolés dans conduits en paroi isolante', referenceMethod: 'A1', environment: 'Air', cableTypes: ['unipolar'] },
    { id: 2, description: 'Câbles multiconducteurs dans conduits en paroi isolante', referenceMethod: 'A2', environment: 'Air', cableTypes: ['multiconductor'] },
    { id: 11, description: 'Câbles/conducteurs sur paroi', referenceMethod: 'C', environment: 'Air', cableTypes: ['multiconductor', 'unipolar'] },
    { id: 21, description: 'Câbles/conducteurs dans conduits en apparent', referenceMethod: 'B1', environment: 'Air', cableTypes: ['multiconductor', 'unipolar'] },
    { id: 24, description: 'Câbles multiconducteurs encastrés dans les parois', referenceMethod: 'B2', environment: 'Air', cableTypes: ['multiconductor'] },
    { id: 31, description: 'Câbles sur chemin de câbles perforé', referenceMethod: 'E', environment: 'Air', cableTypes: ['multiconductor', 'unipolar'] },
    { id: 32, description: 'Câbles sur échelle à câbles', referenceMethod: 'F', environment: 'Air', cableTypes: ['multiconductor', 'unipolar'] },
    { id: 34, description: 'Câbles unipolaires espacés sur chemin de câble', referenceMethod: 'G', environment: 'Air', cableTypes: ['unipolar'] },
    { id: 41, description: 'Câbles/conducteurs en goulotte murale', referenceMethod: 'C', environment: 'Air', cableTypes: ['multiconductor', 'unipolar'] },
    { id: 70, description: 'Câbles dans des conduits enterrés (Ancien 61)', referenceMethod: 'D', environment: 'Enterré', cableTypes: ['multiconductor', 'unipolar'] },
    { id: 71, description: 'Câbles en caniveau enterré (D1 - Ancien 62)', referenceMethod: 'D', environment: 'Enterré', cableTypes: ['multiconductor', 'unipolar'] },
    { id: 72, description: 'Câbles directement enterrés sans protection', referenceMethod: 'D', environment: 'Enterré', cableTypes: ['multiconductor'] },
    { id: 73, description: 'Câbles dans plusieurs conduits enterrés', referenceMethod: 'D', environment: 'Enterré', cableTypes: ['multiconductor', 'unipolar'] }
];

export const getModeDePose = (id: number): ModeDePose | undefined => {
    return MODES_DE_POSE.find(m => m.id === id);
};

// Constantes pour chute de tension
export const RHO_CU = 0.0225; // Ω.mm²/m
export const RHO_AL = 0.036; // Ω.mm²/m
export const LAMBDA = 0.08; // mΩ/m (réactance par défaut) => 0.00008 Ω/m

// Sections standard (mm²)
export const sections = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];

// Tableau 52.8A — Isolant PVC (Iz en Ampères)
export const table52_8A: Record<number, Record<PoseMethod, Record<ConductorCount, number>>> = {
    1.5:  { A1: {2:13,  3:11.5}, A2: {2:13.5, 3:12},   B1: {2:15.5, 3:13.5}, B2: {2:15.5, 3:13}, C: {2:19.5, 3:17.5}, D: {2:22, 3:18},   D1: {2:22, 3:18}, D2: {2:22, 3:18}, E: {2:22,  3:18.5}, F: {2:24,  3:20},  G: {2:26,  3:22} },
    2.5:  { A1: {2:17.5,3:15.5}, A2: {2:18,   3:16.5},  B1: {2:21,   3:18},   B2: {2:21,   3:18}, C: {2:27,   3:24},   D: {2:29, 3:24.5}, D1: {2:29, 3:24.5}, D2: {2:29, 3:24.5}, E: {2:30,  3:25},   F: {2:33,  3:28},  G: {2:36,  3:30} },
    4:    { A1: {2:23,  3:20},   A2: {2:24,   3:21},    B1: {2:28,   3:24},   B2: {2:28,   3:24}, C: {2:36,   3:32},   D: {2:38, 3:32},   D1: {2:38, 3:32}, D2: {2:38, 3:32}, E: {2:40,  3:34},   F: {2:45,  3:38},  G: {2:49,  3:41} },
    6:    { A1: {2:29,  3:25},   A2: {2:31,   3:27},    B1: {2:36,   3:31},   B2: {2:36,   3:31}, C: {2:46,   3:41},   D: {2:47, 3:40},   D1: {2:47, 3:40}, D2: {2:47, 3:40}, E: {2:51,  3:43},   F: {2:58,  3:49},  G: {2:63,  3:54} },
    10:   { A1: {2:39,  3:34},   A2: {2:42,   3:36},    B1: {2:50,   3:43},   B2: {2:50,   3:43}, C: {2:63,   3:57},   D: {2:63, 3:54},   D1: {2:63, 3:54}, D2: {2:63, 3:54}, E: {2:70,  3:60},   F: {2:80,  3:68},  G: {2:86,  3:73} },
    16:   { A1: {2:52,  3:45},   A2: {2:56,   3:48},    B1: {2:66,   3:57},   B2: {2:66,   3:57}, C: {2:85,   3:76},   D: {2:83, 3:71},   D1: {2:83, 3:71}, D2: {2:83, 3:71}, E: {2:94,  3:80},   F: {2:107, 3:91},  G: {2:115, 3:98} },
    25:   { A1: {2:68,  3:60},   A2: {2:73,   3:64},    B1: {2:89,   3:77},   B2: {2:89,   3:77}, C: {2:112,  3:96},   D: {2:107,3:92},   D1: {2:107, 3:92}, D2: {2:107, 3:92}, E: {2:119, 3:101},  F: {2:138, 3:116}, G: {2:149, 3:127} },
    35:   { A1: {2:85,  3:75},   A2: {2:91,   3:80},    B1: {2:111,  3:96},   B2: {2:111,  3:96}, C: {2:138,  3:119},  D: {2:130,3:112},  D1: {2:130, 3:112}, D2: {2:130, 3:112}, E: {2:148, 3:126},  F: {2:171, 3:144}, G: {2:185, 3:158} },
    50:   { A1: {2:103, 3:91},   A2: {2:110,  3:97},    B1: {2:134,  3:117},  B2: {2:134,  3:117},C: {2:168,  3:144},  D: {2:156,3:135},  D1: {2:156, 3:135}, D2: {2:156, 3:135}, E: {2:180, 3:153},  F: {2:209, 3:176}, G: {2:225, 3:192} },
    70:   { A1: {2:130, 3:116},  A2: {2:139,  3:124},   B1: {2:171,  3:149},  B2: {2:171,  3:149},C: {2:213,  3:184},  D: {2:198,3:171},  D1: {2:198, 3:171}, D2: {2:198, 3:171}, E: {2:232, 3:196},  F: {2:269, 3:226}, G: {2:289, 3:246} },
    95:   { A1: {2:158, 3:141},  A2: {2:169,  3:150},   B1: {2:207,  3:180},  B2: {2:207,  3:180},C: {2:258,  3:223},  D: {2:238,3:207},  D1: {2:238, 3:207}, D2: {2:238, 3:207}, E: {2:282, 3:238},  F: {2:328, 3:275}, G: {2:352, 3:298} },
    120:  { A1: {2:183, 3:163},  A2: {2:195,  3:174},   B1: {2:239,  3:208},  B2: {2:239,  3:208},C: {2:299,  3:259},  D: {2:276,3:240},  D1: {2:276, 3:240}, D2: {2:276, 3:240}, E: {2:328, 3:276},  F: {2:382, 3:320}, G: {2:410, 3:346} },
};

// Tableau 52.8B — Isolant PR/EPR (Iz en Ampères)
export const table52_8B: Record<number, Record<PoseMethod, Record<ConductorCount, number>>> = {
    1.5:  { A1: {2:16.5,3:14.5}, A2: {2:17,   3:15},   B1: {2:19,   3:17.5}, B2: {2:19,   3:17}, C: {2:24,   3:22},   D: {2:26, 3:22},   D1: {2:26, 3:22}, D2: {2:26, 3:22}, E: {2:26,  3:23},   F: {2:28,  3:24},  G: {2:30,  3:26} },
    2.5:  { A1: {2:22,  3:19.5}, A2: {2:23,   3:20.5},  B1: {2:26,   3:24},   B2: {2:26,   3:24}, C: {2:33,   3:30},   D: {2:34, 3:29},   D1: {2:34, 3:29}, D2: {2:34, 3:29}, E: {2:36,  3:32},   F: {2:39,  3:35},  G: {2:43,  3:37} },
    4:    { A1: {2:29,  3:25},   A2: {2:31,   3:27},    B1: {2:35,   3:32},   B2: {2:35,   3:32}, C: {2:45,   3:40},   D: {2:44, 3:38},   D1: {2:44, 3:38}, D2: {2:44, 3:38}, E: {2:49,  3:42},   F: {2:53,  3:47},  G: {2:59,  3:51} },
    6:    { A1: {2:37,  3:33},   A2: {2:39,   3:35},    B1: {2:45,   3:41},   B2: {2:45,   3:41}, C: {2:58,   3:52},   D: {2:56, 3:48},   D1: {2:56, 3:48}, D2: {2:56, 3:48}, E: {2:63,  3:54},   F: {2:68,  3:61},  G: {2:75,  3:66} },
    10:   { A1: {2:50,  3:44},   A2: {2:53,   3:47},    B1: {2:61,   3:57},   B2: {2:61,   3:57}, C: {2:80,   3:71},   D: {2:73, 3:63},   D1: {2:73, 3:63}, D2: {2:73, 3:63}, E: {2:86,  3:75},   F: {2:95,  3:84},  G: {2:103, 3:90} },
    16:   { A1: {2:66,  3:58},   A2: {2:70,   3:62},    B1: {2:81,   3:76},   B2: {2:81,   3:76}, C: {2:107,  3:96},   D: {2:95, 3:83},   D1: {2:95, 3:83}, D2: {2:95, 3:83}, E: {2:115, 3:100},  F: {2:127, 3:112}, G: {2:138, 3:119} },
    25:   { A1: {2:86,  3:77},   A2: {2:92,   3:82},    B1: {2:106,  3:96},   B2: {2:106,  3:96}, C: {2:138,  3:119},  D: {2:123,3:107},  D1: {2:123, 3:107}, D2: {2:123, 3:107}, E: {2:149, 3:127},  F: {2:165, 3:145}, G: {2:180, 3:157} },
    35:   { A1: {2:107, 3:95},   A2: {2:114,  3:102},   B1: {2:131,  3:119},  B2: {2:131,  3:119},C: {2:171,  3:147},  D: {2:150,3:130},  D1: {2:150, 3:130}, D2: {2:150, 3:130}, E: {2:185, 3:158},  F: {2:205, 3:180}, G: {2:223, 3:196} },
    50:   { A1: {2:129, 3:114},  A2: {2:138,  3:123},   B1: {2:158,  3:144},  B2: {2:158,  3:144},C: {2:209,  3:179},  D: {2:180,3:157},  D1: {2:180, 3:157}, D2: {2:180, 3:157}, E: {2:225, 3:192},  F: {2:251, 3:220}, G: {2:272, 3:238} },
    70:   { A1: {2:163, 3:145},  A2: {2:174,  3:155},   B1: {2:200,  3:184},  B2: {2:200,  3:184},C: {2:269,  3:229},  D: {2:228,3:199},  D1: {2:228, 3:199}, D2: {2:228, 3:199}, E: {2:289, 3:246},  F: {2:324, 3:284}, G: {2:352, 3:308} },
    95:   { A1: {2:197, 3:175},  A2: {2:210,  3:188},   B1: {2:241,  3:223},  B2: {2:241,  3:223},C: {2:328,  3:278},  D: {2:275,3:241},  D1: {2:275, 3:241}, D2: {2:275, 3:241}, E: {2:352, 3:298},  F: {2:395, 3:346}, G: {2:430, 3:375} },
    120:  { A1: {2:227, 3:203},  A2: {2:243,  3:218},   B1: {2:278,  3:259},  B2: {2:278,  3:259},C: {2:382,  3:322},  D: {2:319,3:280},  D1: {2:319, 3:280}, D2: {2:319, 3:280}, E: {2:410, 3:346},  F: {2:461, 3:403}, G: {2:500, 3:437} },
};

// Facteurs de correction k1 (Température)
export const getTempCorrectionFactor = (temp: number, insulation: InsulationType, environment: EnvironmentType): number => {
    // Température de référence : 30°C dans l'air, 20°C dans le sol
    if (environment === 'Air' && temp === 30) return 1.0;
    if (environment === 'Enterré' && temp === 20) return 1.0;

    // Tableau 52.9 (Air)
    const pvcAir: Record<number, number> = { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1.0, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.5 };
    const prAir: Record<number, number> = { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1.0, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58, 75: 0.50, 80: 0.41 };

    // Tableau 52.10 (Sol)
    const pvcSol: Record<number, number> = { 10: 1.10, 15: 1.05, 20: 1.0, 25: 0.95, 30: 0.89, 35: 0.84, 40: 0.77, 45: 0.71, 50: 0.63, 55: 0.55, 60: 0.45 };
    const prSol: Record<number, number> = { 10: 1.07, 15: 1.04, 20: 1.0, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85, 45: 0.80, 50: 0.76, 55: 0.71, 60: 0.65, 65: 0.60, 70: 0.53, 75: 0.46, 80: 0.38 };

    const nearestTemp = Math.round(temp / 5) * 5;
    
    if (environment === 'Enterré') {
        const factors = insulation === 'PVC' ? pvcSol : prSol;
        return factors[nearestTemp] || 1.0;
    } else {
        const factors = insulation === 'PVC' ? pvcAir : prAir;
        return factors[nearestTemp] || 1.0;
    }
};

// Facteurs de correction k2 (Groupement) - Tableau 52.12 et autres
export interface GroupingOption {
    circuits: number;
    label: string;
    factor: number;
}

export const getGroupingOptions = (modeId: number, cableType: string): GroupingOption[] => {
    // Mode G: Unipolaires espacés (Mode 34)
    if (modeId === 34) {
        return [
            { circuits: 1, label: '1 ou + (Espacés - Facteur 1.00)', factor: 1.0 }
        ];
    }

    // Modes E, F: Chemin de câble perforé / Echelles (Modes 31, 32)
    // Tableau 52.13 (1 couche)
    if ([31, 32].includes(modeId)) {
        return [
            { circuits: 1, label: '1 (Facteur 1.00)', factor: 1.00 },
            { circuits: 2, label: '2 (Facteur 0.88)', factor: 0.88 },
            { circuits: 3, label: '3 (Facteur 0.82)', factor: 0.82 },
            { circuits: 4, label: '4 (Facteur 0.77)', factor: 0.77 },
            { circuits: 5, label: '5 (Facteur 0.75)', factor: 0.75 },
            { circuits: 6, label: '6 (Facteur 0.73)', factor: 0.73 },
            { circuits: 7, label: '7 (Facteur 0.73)', factor: 0.73 },
            { circuits: 8, label: '8 (Facteur 0.72)', factor: 0.72 },
            { circuits: 9, label: '9 ou + (Facteur 0.72)', factor: 0.72 },
        ];
    }

    // Modes D: Enterré (Tableau 52.17 - Conduits jointifs)
    if ([70, 71, 72, 73].includes(modeId)) {
        if (cableType === 'unipolar') {
            return [
                { circuits: 1, label: '1 circuit (1.00)', factor: 1.00 },
                { circuits: 2, label: '2 circuits (0.80)', factor: 0.80 },
                { circuits: 3, label: '3 circuits (0.70)', factor: 0.70 },
                { circuits: 4, label: '4 circuits (0.65)', factor: 0.65 },
                { circuits: 5, label: '5 circuits (0.60)', factor: 0.60 },
                { circuits: 6, label: '6 ou + (0.60)', factor: 0.60 },
            ];
        } else {
            return [
                { circuits: 1, label: '1 câble (1.00)', factor: 1.00 },
                { circuits: 2, label: '2 câbles (0.85)', factor: 0.85 },
                { circuits: 3, label: '3 câbles (0.75)', factor: 0.75 },
                { circuits: 4, label: '4 câbles (0.70)', factor: 0.70 },
                { circuits: 5, label: '5 câbles (0.65)', factor: 0.65 },
                { circuits: 6, label: '6 câbles (0.60)', factor: 0.60 },
            ];
        }
    }

    // Mode C (sur paroi) - Tableau 52.12 Point 2 (Modes 11, 41)
    if ([11, 41].includes(modeId)) {
        return [
            { circuits: 1, label: '1 circuit (1.00)', factor: 1.00 },
            { circuits: 2, label: '2 circuits (0.85)', factor: 0.85 },
            { circuits: 3, label: '3 circuits (0.79)', factor: 0.79 },
            { circuits: 4, label: '4 circuits (0.75)', factor: 0.75 },
            { circuits: 5, label: '5 circuits (0.73)', factor: 0.73 },
            { circuits: 6, label: '6 circuits (0.72)', factor: 0.72 },
            { circuits: 9, label: '9 ou + (0.70)', factor: 0.70 },
        ];
    }

    // Modes par défaut (A1, A2, B1, B2) - Encastrés, conduits - Tableau 52.12 Point 1
    return [
        { circuits: 1, label: '1 circuit (1.00)', factor: 1.00 },
        { circuits: 2, label: '2 circuits (0.80)', factor: 0.80 },
        { circuits: 3, label: '3 circuits (0.70)', factor: 0.70 },
        { circuits: 4, label: '4 circuits (0.65)', factor: 0.65 },
        { circuits: 5, label: '5 circuits (0.60)', factor: 0.60 },
        { circuits: 6, label: '6 circuits (0.57)', factor: 0.57 },
        { circuits: 9, label: '9 circuits (0.50)', factor: 0.50 },
    ];
};

