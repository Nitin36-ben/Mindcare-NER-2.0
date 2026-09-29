import { regionalItems, doctorDirectory } from './config/regionalData.js';
import { saveFamilyFace, getFamilyFaces, deleteFamilyFace } from './services/storageService.js';
import { speak, triggerHaptic } from './services/speechService.js';
import { exportClinicalPdf } from './services/pdfService.js';
import { predictCognitiveStage } from './engines/aiEngine.js';
import { GameEngine } from './engines/gameEngine.js';

// Application State
let currentPatient = JSON.parse(localStorage.getItem('mindcare_registered_patient')) || null;
let activeCaregiver = JSON.parse(localStorage.getItem('mindcare_registered_caregiver')) || null;
let sessionMetrics = { latency: 3.4, retention: 88, adherence: 96, hesitations: 1, aiStage: "Stable" };
let autoHintTimer = null;
let gameEngineInstance = null;

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// PWA Installation Hook
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('pwaInstallBtn');
  if (installBtn) installBtn.classList.remove('d-none');
});

window.triggerPwaInstall = () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        const installBtn = document.getElementById('pwaInstallBtn');
        if (installBtn) installBtn.classList.add('d-none');
      }
      deferredPrompt = null;
    });
  }
};

window.addEventListener('DOMContentLoaded', () => {
  setupCaregiverGateway();
  setupTabNavigation();
  initFamilyRecall();
  initDoctorDirectory();

  // Initialize Diagnostic Game Engine
  gameEngineInstance = new GameEngine({
    containerId: 'gameInteractiveArea',
    headlineId: 'gameHeadline',
    subInstructionId: 'gameSubInstruction',
    timerId: 'gameTimer',
    onGameComplete: async (data) => {
      sessionMetrics.latency = data.latency;
      const aiPrediction = await predictCognitiveStage(sessionMetrics.latency, sessionMetrics.retention, sessionMetrics.hesitations);
      sessionMetrics.aiStage = aiPrediction.stage;
      
      const badge = document.getElementById('aiAdaptiveLevelBadge');
      if (badge) badge.innerText = `AI L${data.level}: Active`;
    }
  });

  if (currentPatient && currentPatient.age >= 55) {
    unlockAppView();
  }
});

// 1. Gatekeeper & Geriatric Age Validation (55+)
function setupCaregiverGateway() {
  const form = document.getElementById('onboardingForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cName = document.getElementById('regCaregiverName').value.trim();
    const cRel = document.getElementById('regCaregiverRel').value.trim();
    const cPhone = document.getElementById('regCaregiverPhone').value.trim();

    const pName = document.getElementById('regPatientName').value.trim();
    const docType = document.getElementById('regDocType').value;
    const docNum = document.getElementById('regDocNumber').value.trim();
    const dob = document.getElementById('regDob').value;
    const state = document.getElementById('regState').value;
    const stage = document.getElementById('regStage').value;

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    if (age < 55) {
      alert(`प्रवेश अस्वीकृत: रोगी की आयु ${age} वर्ष है। यह क्लीनिकल ऐप केवल 55+ नागरिकों के लिए है।`);
      return;
    }

    activeCaregiver = { name: cName, relation: cRel, phone: cPhone };
    currentPatient = {
      patientId: `MC-NER-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name: pName,
      age: age,
      docType: docType,
      docNumber: docNum,
      state: state,
      stage: stage
    };

    localStorage.setItem('mindcare_registered_caregiver', JSON.stringify(activeCaregiver));
    localStorage.setItem('mindcare_registered_patient', JSON.stringify(currentPatient));

    speak(`स्वागत है ${pName}. रोगी प्रोफ़ाइल सत्यापित हो गई है।`);
    unlockAppView();
  });
}

function unlockAppView() {
  document.getElementById('caregiverOnboardingGateway')?.classList.add('d-none');
  document.getElementById('mainPlatformApp')?.classList.remove('d-none');

  const nameDisplay = document.getElementById('patientNameDisplay');
  const metaDisplay = document.getElementById('patientMetaDisplay');
  const idBadge = document.getElementById('patientIdCodeBadge');

  if (nameDisplay) nameDisplay.innerText = currentPatient.name;
  if (metaDisplay) metaDisplay.innerText = `आयु: ${currentPatient.age} | ${currentPatient.state}`;
  if (idBadge) idBadge.innerText = currentPatient.patientId;

  if (gameEngineInstance) gameEngineInstance.loadGame(1);
}

// 2. Navigation & Tab Handling
function setupTabNavigation() {
  window.switchGame = (gameId) => {
    [1, 2, 3, 4, 5].forEach(n => document.getElementById(`btnG${n}`)?.classList.remove('active'));
    document.getElementById(`btnG${gameId}`)?.classList.add('active');
    if (gameEngineInstance) gameEngineInstance.loadGame(gameId);
  };

  window.handleTabSwitch = (tab) => {
    if (tab === 'games' && gameEngineInstance) {
      gameEngineInstance.loadGame(1);
    }
  };
}

// 3. Family Recall & Offline IndexedDB Storage
async function initFamilyRecall() {
  const box = document.getElementById('faceRecallBox');
  const options = document.getElementById('faceChoiceOptions');
  const savedList = document.getElementById('savedMembersList');

  try {
    const faces = await getFamilyFaces();
    if (savedList) {
      savedList.innerHTML = faces.length === 0 
        ? `<small class="text-muted">कोई सदस्य सेव नहीं है।</small>`
        : faces.map(f => `
          <div class="d-flex justify-content-between align-items-center p-2 border rounded-2 bg-light mb-1">
            <div class="d-flex align-items-center gap-2">
              <img src="${f.image}" class="member-thumb" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">
              <div>
                <strong class="d-block small text-dark">${f.name}</strong>
                <small class="text-muted">${f.relation}</small>
              </div>
            </div>
            <button class="btn btn-xs btn-outline-danger" onclick="deleteMember(${f.id})">हटाएं</button>
          </div>
        `).join('');
    }

    if (faces.length > 0 && box) {
      const targetFace = faces[faces.length - 1];
      box.innerHTML = `
        <img src="${targetFace.image}" class="face-recall-img" style="width:100%;height:100%;object-fit:cover;">
        <div class="hint-banner" id="recallHintBanner" style="display:none;position:absolute;bottom:0;width:100%;background:rgba(10,54,99,0.95);color:#fff;padding:6px;text-align:center;"></div>
      `;

      if (options) {
        options.innerHTML = `
          <button type="button" class="btn btn-sm btn-outline-primary fw-bold rounded-pill px-3" onclick="verifyFace(true, '${targetFace.name}')">${targetFace.name}</button>
          <button type="button" class="btn btn-sm btn-outline-secondary fw-bold rounded-pill px-3" onclick="verifyFace(false, '${targetFace.name}')">पड़ोसी / मित्र</button>
        `;
      }

      clearTimeout(autoHintTimer);
      autoHintTimer = setTimeout(() => {
        const hint = document.getElementById('recallHintBanner');
        if (hint) {
          hint.style.display = 'block';
          hint.innerText = `संकेत: यह आपके ${targetFace.relation} ${targetFace.name} हैं।`;
        }
        speak(`चिंता न करें! यह आपके ${targetFace.relation}, ${targetFace.name} हैं।`);
        sessionMetrics.hesitations++;
      }, 8000);
    }
  } catch (err) {
    console.error("IndexedDB error:", err);
  }

  const faceForm = document.getElementById('formAddFaceMember');
  if (faceForm) {
    faceForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('inputFaceName').value.trim();
      const rel = document.getElementById('inputFaceRel').value.trim();
      const file = document.getElementById('inputFaceFile').files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        await saveFamilyFace(name, rel, reader.result);
        alert(`✅ ${name} को सुरक्षित मेमोरी में सेव किया गया।`);
        faceForm.reset();
        initFamilyRecall();
      };
      reader.readAsDataURL(file);
    };
  }
}

window.verifyFace = (isCorrect, name) => {
  clearTimeout(autoHintTimer);
  triggerHaptic([50, 50]);
  if (isCorrect) {
    speak(`बहुत बढ़िया! आपने ${name} को पहचान लिया!`);
    alert(`🎉 सही उत्तर! आपने ${name} को पहचान लिया।`);
  } else {
    speak(`कोई बात नहीं! यह आपके प्रिय ${name} हैं।`);
    alert(`❤️ स्नेहपूर्ण संकेत: यह आपके ${name} हैं।`);
  }
};

window.deleteMember = async (id) => {
  if (confirm("क्या आप इस सदस्य को हटाना चाहते हैं?")) {
    await deleteFamilyFace(id);
    initFamilyRecall();
  }
};

// 4. Doctor Directory
function initDoctorDirectory() {
  const container = document.getElementById('doctorCardsList');
  if (!container) return;

  container.innerHTML = doctorDirectory.map(doc => `
    <div class="col-12 col-md-6">
      <div class="portal-card p-3 h-100 d-flex flex-column justify-content-between">
        <div>
          <h6 class="fw-bold text-dark m-0">${doc.name}</h6>
          <small class="text-primary fw-bold d-block">${doc.specialty}</small>
          <small class="text-muted d-block mt-1">${doc.hospital}</small>
        </div>
        <div class="d-flex gap-2 mt-3 pt-2 border-top">
          <a href="tel:${doc.phone}" class="btn btn-sm btn-outline-primary fw-bold rounded-pill flex-fill">📞 कॉल करें</a>
          <button class="btn btn-sm btn-success fw-bold rounded-pill flex-fill" onclick="sendWhatsAppSummary('${doc.name}', '${doc.phone}')">व्हाट्सएप</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.sendWhatsAppSummary = (docName, phone) => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const msg = encodeURIComponent(`नमस्ते ${docName},\n\nरोगी: ${currentPatient?.name || 'Elderly'} (${currentPatient?.age || 68} वर्ष)\nऔसत लेटेंसी: ${sessionMetrics.latency}s\nसंज्ञानात्मक स्थिति: ${sessionMetrics.aiStage}`);
  window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`, '_blank');
};

// 5. Clinical PDF Report Export
window.downloadActualPdfReport = async () => {
  if (!currentPatient) return;
  const aiResult = await predictCognitiveStage(sessionMetrics.latency, sessionMetrics.retention, sessionMetrics.hesitations);
  sessionMetrics.aiStage = aiResult.stage;
  exportClinicalPdf(currentPatient, sessionMetrics);
};