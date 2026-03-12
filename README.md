# ⚡ Calculateur de Section de Câble — NF C 15-100

> Application web de calcul et de vérification de section de câble électrique selon la norme française **NF C 15-100**.

🌐 **Démo en ligne :** [https://adaoequans.github.io/Calculateur-Cable/](https://adaoequans.github.io/Calculateur-Cable/)

---

## ✨ Fonctionnalités

- **Calcul de l'intensité admissible (Iz)** — prise en compte des facteurs de correction (température, groupement, harmoniques TH3)
- **Calcul de la chute de tension (ΔU)** — en volts et en pourcentage, selon la longueur et le cos(φ)
- **Résultats synthétiques** — tableau complet avec statuts visuels : ✅ Optimal, 🔵 Valide, ❌ Invalide
- **Conformité NF C 15-100**
  - Section minimale automatique pour les conducteurs en Aluminium (≥ 10 mm²)
  - Sections minimales pour les liaisons de branchement selon le calibre AGCP
- **Paramètres avancés**
  - Matériaux : Cuivre (Cu), Aluminium (Al)
  - Isolants : PVC, PR/EPR
  - Méthodes de pose (A1, A2, B1, B2, C, D, E, F, G) // BUG DETECTE // EN COURS DE CORRECTION
  - Réseau Monophasé (230V) ou Triphasé (400V)
  - Taux d'harmoniques TH3 (4 cas normatifs)
  - Groupement de circuits (1 à 9+ circuits, selon Tableau 52N)
- **Sauvegarde / Chargement** — export et import de configurations au format `.adsciz`

---

## 🛠️ Technologies

| Technologie | Rôle |
|---|---|
| [React 19](https://react.dev/) | Framework UI |
| [Vite](https://vitejs.dev/) | Bundler et serveur de développement |
| [TypeScript](https://www.typescriptlang.org/) | Typage fort |
| [Tailwind CSS](https://tailwindcss.com/) | Styles |
| [Lucide React](https://lucide.dev/) | Icônes |

---

## 🚀 Lancer le projet en local

**Prérequis :** [Node.js](https://nodejs.org/) v22+

```bash
# 1. Cloner le dépôt
git clone https://github.com/ADAOEquans/Calculateur-Cable.git
cd Calculateur-Cable/calculateur-nfc15100-web

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173/`.

### Scripts disponibles
| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (HMR) |
| `npm run build` | Build de production optimisé |
| `npm run preview` | Prévisualisation du build en local |
| `npm run lint` | Vérification du code |

---

## 📐 Architecture du projet

```
Calculateur-Cable/
└── calculateur-nfc15100-web/   # Application React/Vite
    ├── src/
    │   ├── App.tsx             # Composant principal et UI
    │   ├── data/
    │   │   └── nfc15100.ts     # Données normatives (sections, Iz, facteurs)
    │   └── utils/
    │       └── calculator.ts   # Logique de calcul (Iz, ΔU, conformité)
    └── ...
```

---

## 📄 Licence

Ce projet est distribué sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus d'informations.

---

*Application développée pour faciliter le travail quotidien des électriciens et des ingénieurs en installations basse tension.*
