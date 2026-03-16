# Calculateur Iz & ΔU - Norme NF C 15-100

![Version](https://img.shields.io/badge/version-2.0.0-orange.svg)
![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)

Une application web moderne et performante pour le dimensionnement des canalisations électriques selon la norme **NF C 15-100** (édition 2024).

## 🚀 Fonctionnalités

- **Calcul d'Intensité Admissible (Iz)** : Intégration complète des Tableaux 52.8 à 52.18.
- **Modes de Pose Dynamiques** : Support des modes 1 à 74 avec filtrage intelligent par type de câble (Mono/Multiconducteur).
- **Chute de Tension (ΔU)** : Calcul précis en monophasé et triphasé incluant le Cos(φ) et la réactance.
- **Facteurs Correcteurs Avancés** : 
  - Température ambiante / Sol.
  - Facteur de groupement ($k_2$).
  - Taux d'harmoniques (TH3) avec les 4 cas normatifs.
  - Rayonnement solaire direct.
  - Risque d'explosion (BE3).
- **Conformité Normative** : 
  - Sections minimales (Alu 10mm² min).
  - Branchement AGCP (10, 16, 25 mm²).
- **Persistence des données** : Sauvegarde et chargement de configurations via des fichiers `.adsciz`.
- **Interface Premium** : Design sombre réactif, dashboard d'analyse et tableau de résultats synthétique.

## 🛠️ Installation et Démarrage

### Pré-requis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- npm (installé avec Node.js)

### Installation
```bash
git clone https://github.com/votre-compte/Calculateur-Cable.git
cd Calculateur-Cable/calculateur-nfc15100-web
npm install
```

### Démarrage en mode développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:5173/`.

### Construction pour la production
```bash
npm run build
```
Les fichiers générés se trouveront dans le dossier `dist/`.

## 📖 Utilisation

1. **Configuration du Câble** : Choisissez le matériau, l'isolant et le type de câble.
2. **Mode de Pose** : Sélectionnez le numéro de mode correspondant à votre installation.
3. **Environnement** : Ajustez la température et les facteurs de groupement.
4. **Paramètres Circuit** : Saisissez l'intensité d'emploi (Ib), la longueur et le Cos(φ).
5. **Analyse** : Obtenez immédiatement la section optimale et les détails de conformité.

## 📝 Licence

Ce projet est sous licence **GPL-3.0**. Consultez le fichier `LICENSE` pour plus de détails.

---
*Développé pour la conformité électrique professionnelle.*
