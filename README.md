# MindCare NER 2.0 🧠
> Clinical Cognitive Assessment Battery & Tele-Health Companion for Geriatric Dementia Care (Ages 55+)

An offline-first Progressive Web Application (PWA) built for the **Smart India Hackathon (SIH)**, targeting early cognitive screening, motor stability tracking, and caregiver tele-health monitoring across the North-Eastern Region (NER) of India.

---

## 📌 Problem Statement & Regional Context
In remote and hilly terrains of North-East India, access to specialized geriatric neuropsychologists and memory clinics is limited. **MindCare NER 2.0** provides a zero-cloud, culturally attuned assessment node that operates entirely offline on low-cost tablets and smartphones in Primary Health Centers (PHCs) and homes.

---

## 🚀 Key Modules & Capabilities

- **Clinical 55+ Gatekeeper**: Enforces strict date-of-birth validation and integrates baseline MoCA / Mini-Cog score calibration.
- **Family Recall (Prosopagnosia Support)**: Uses IndexedDB to store family member photos offline with an automated 8-second reassurance hint system.
- **5-Stage Cognitive Battery**:
  1. *Visual CST Pairs*: Semantic matching with regional iconography (Kaziranga Rhino, Assam Tea, Bihu Dhol).
  2. *Odd-One-Out*: Focus and selective attention.
  3. *Trail Making (TMT-A)*: Sequential motor planning (1 ➔ 2 ➔ 3 ➔ 4).
  4. *Category Fluency*: Traditional instrument identification.
  5. *Stroop Inhibition*: Cognitive flexibility and color conflict resolution.
- **Motor Rhythmicity & Tremor Tracking**: Measures tap intervals via high-resolution timers (`performance.now()`) and flags variance ($\sigma \ge 85\text{ ms}$).
- **Acoustic Speech Hesitation Analyzer**: Uses the Web Audio API to detect pause-to-speech ratios ($>35\%$ flagged for linguistic dyspraxia).
- **Caregiver Suite & Tele-Neurology**:
  - 1-touch Emergency SOS calling.
  - Offline P2P telemetry sync via encrypted QR codes for ASHA workers.
  - Automated clinical PDF report export (`jsPDF` + `autoTable`).
- **Tri-Lingual Localization**: Native support for **Assamese**, **Hindi**, and **English** with integrated Web Speech audio guidance.

---

## 🛠️ Technology Stack

- **Frontend Core**: HTML5, CSS3 Custom Properties, JavaScript (ES6+ Modules), Bootstrap 5.3
- **Client Storage**: Cache API (Service Worker), IndexedDB (`MindCare_Faces_DB`), LocalStorage
- **Audio & Speech**: Web Audio API (`AnalyserNode`), Web Speech Synthesis & Recognition API
- **Telemetry & Visualization**: Chart.js, jsPDF, jsPDF-AutoTable, QRCode.js

---

## 📂 Project Architecture

```text
mindcare-ner/
├── index.html            # Main application shell & entry point
├── style.css             # Theme, accessibility variables, and high-contrast styling
├── manifest.json         # PWA installation settings
├── service-worker.js     # Cache-first offline storage engine
├── app.js                # Core controller and routing logic
├── config/
│   └── regionalData.js   # Cultural assets and NER doctor directory
├── engines/
│   ├── gameEngine.js     # 5-stage neuropsychological battery
│   └── aiEngine.js       # Edge cognitive progression scoring
└── services/
    ├── speechService.js  # Voice narration and haptic triggers
    ├── storageService.js # Offline IndexedDB photo vault
    └── pdfService.js     # Diagnostic PDF report generator
