import { regionalItems } from '../config/regionalData.js';
import { speak, triggerHaptic } from '../services/speechService.js';

export class GameEngine {
  constructor(options = {}) {
    this.containerId = options.containerId || 'game-interactive-area';
    this.headlineId = options.headlineId || 'game-headline';
    this.subInstructionId = options.subInstructionId || 'game-sub-instruction';
    this.timerId = options.timerId || 'game-timer';
    this.onGameComplete = options.onGameComplete || null;

    this.currentGame = 1;
    this.currentLevel = 1; // 1: Gentle, 2: Active, 3: Hard
    this.currentRound = 1;
    this.elapsedSeconds = 0.0;
    this.timerInterval = null;
    this.microHesitationTimer = null;

    // Mode-specific state
    this.flippedCards = [];
    this.matchedPairsCount = 0;
    this.isBoardLocked = false;
    this.trailCurrentTarget = 1;
    this.trailTotalTargets = 4;
  }

  getContainer() {
    return document.getElementById(this.containerId);
  }

  setHeading(title, subtitle) {
    const head = document.getElementById(this.headlineId);
    const sub = document.getElementById(this.subInstructionId);
    if (head) head.innerText = title;
    if (sub) sub.innerText = subtitle;
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.elapsedSeconds = 0.0;
    const timerEl = document.getElementById(this.timerId);
    if (timerEl) timerEl.innerText = '⏱️ 0.0s';

    this.timerInterval = setInterval(() => {
      this.elapsedSeconds += 0.1;
      if (timerEl) timerEl.innerText = `⏱️ ${this.elapsedSeconds.toFixed(1)}s`;
    }, 100);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
    clearTimeout(this.microHesitationTimer);
  }

  startHesitationWatchdog(hintCallback) {
    clearTimeout(this.microHesitationTimer);
    this.microHesitationTimer = setTimeout(() => {
      if (typeof hintCallback === 'function') {
        hintCallback();
      }
      speak("आराम से देखिए, कोई जल्दी नहीं है।");
    }, 6500);
  }

  resetHesitationWatchdog(hintCallback) {
    this.startHesitationWatchdog(hintCallback);
  }

  loadGame(modeNumber = 1) {
    this.stopTimer();
    this.currentGame = modeNumber;
    const container = this.getContainer();
    if (!container) return;
    container.innerHTML = '';

    this.startTimer();

    switch (modeNumber) {
      case 1:
        this.initVisualCstPairs(container);
        break;
      case 2:
        this.initOddOneOut(container);
        break;
      case 3:
        this.initTrailMaking(container);
        break;
      case 4:
        this.initCategoryFluency(container);
        break;
      case 5:
        this.initStroopInhibition(container);
        break;
      default:
        this.initVisualCstPairs(container);
        break;
    }
  }

  // 1. Visual CST Memory Pairs
  initVisualCstPairs(container) {
    this.setHeading(
      `मोड 1: विज़ुअल CST पेयर्स (L${this.currentLevel})`,
      "एक जैसी दो पारंपरिक छवियां ढूंढकर मिलाएं।"
    );

    this.flippedCards = [];
    this.matchedPairsCount = 0;
    this.isBoardLocked = false;

    let pairCount = this.currentLevel === 1 ? 2 : (this.currentLevel === 2 ? 3 : 4);
    const shuffledItems = [...regionalItems].sort(() => 0.5 - Math.random()).slice(0, pairCount);
    const deck = [...shuffledItems, ...shuffledItems].sort(() => 0.5 - Math.random());

    const colClass = this.currentLevel === 1 ? 'col-6' : (this.currentLevel === 2 ? 'col-4' : 'col-3');

    deck.forEach(item => {
      const col = document.createElement('div');
      col.className = colClass;
      col.innerHTML = `
        <div class="elder-touch-tile">
          <span class="tile-glyph">❓</span>
          <span class="tile-caption">छुएं</span>
        </div>
      `;

      const tile = col.querySelector('.elder-touch-tile');
      tile.onclick = () => {
        this.resetHesitationWatchdog(() => tile.classList.add('glow-hint'));
        this.handleCardFlip(tile, item, deck.length);
      };

      container.appendChild(col);
    });

    this.startHesitationWatchdog(() => {
      const unrevealed = container.querySelector('.elder-touch-tile:not(.matched)');
      if (unrevealed) unrevealed.classList.add('glow-hint');
    });
  }

  handleCardFlip(tile, item, totalCards) {
    if (this.isBoardLocked || tile.classList.contains('matched') || tile.classList.contains('revealed')) {
      return;
    }

    triggerHaptic([30]);
    tile.classList.add('revealed');
    tile.classList.remove('glow-hint');
    tile.innerHTML = `<span class="tile-glyph">${item.icon}</span><span class="tile-caption">${item.name}</span>`;

    this.flippedCards.push({ tile, item });

    if (this.flippedCards.length === 2) {
      this.isBoardLocked = true;
      const [first, second] = this.flippedCards;

      if (first.item.id === second.item.id) {
        first.tile.classList.add('matched');
        second.tile.classList.add('matched');
        this.matchedPairsCount += 2;
        this.flippedCards = [];
        this.isBoardLocked = false;

        if (this.matchedPairsCount === totalCards) {
          this.triggerWin();
        }
      } else {
        setTimeout(() => {
          first.tile.classList.remove('revealed');
          first.tile.innerHTML = `<span class="tile-glyph">❓</span><span class="tile-caption">छुएं</span>`;
          second.tile.classList.remove('revealed');
          second.tile.innerHTML = `<span class="tile-glyph">❓</span><span class="tile-caption">छुएं</span>`;
          this.flippedCards = [];
          this.isBoardLocked = false;
        }, 700);
      }
    }
  }

  // 2. Focus & Odd-One-Out
  initOddOneOut(container) {
    this.setHeading("मोड 2: ध्यान एवं दृश्य अंतर परीक्षण", "जो तस्वीर बाकी से अलग है, उसे पहचानकर छुएं।");
    const shuffled = [...regionalItems].sort(() => 0.5 - Math.random());
    const commonItem = shuffled[0];
    const oddItem = shuffled[1];
    const cards = [commonItem, commonItem, oddItem, commonItem].sort(() => 0.5 - Math.random());

    cards.forEach(item => {
      const col = document.createElement('div');
      col.className = 'col-6';
      col.innerHTML = `
        <div class="elder-touch-tile">
          <span class="tile-glyph">${item.icon}</span>
          <span class="tile-caption">${item.name}</span>
        </div>
      `;

      col.querySelector('.elder-touch-tile').onclick = () => {
        if (item.id === oddItem.id) {
          this.triggerWin();
        } else {
          triggerHaptic([20, 30]);
          speak("दूसरा विकल्प प्रयास करें");
        }
      };

      container.appendChild(col);
    });
  }

  // 3. Trail Making Sequencing
  initTrailMaking(container) {
    this.setHeading("मोड 3: ट्रेल मेकिंग क्रम", "अंकों को क्रम से छुएं: 1 ➔ 2 ➔ 3 ➔ 4");
    this.trailCurrentTarget = 1;
    this.trailTotalTargets = 4;
    const sequence = [1, 2, 3, 4].sort(() => 0.5 - Math.random());

    sequence.forEach(num => {
      const col = document.createElement('div');
      col.className = 'col-6 col-sm-3';
      col.innerHTML = `
        <div class="elder-touch-tile" style="border-width: 4px;">
          <span class="tile-glyph text-primary fw-bold">${num}</span>
          <span class="tile-caption">कदम ${num}</span>
        </div>
      `;

      const tile = col.querySelector('.elder-touch-tile');
      tile.onclick = () => {
        if (num === this.trailCurrentTarget) {
          triggerHaptic([40]);
          tile.classList.add('matched');
          speak(`${num}`);
          this.trailCurrentTarget++;
          if (this.trailCurrentTarget > this.trailTotalTargets) {
            this.triggerWin();
          }
        } else {
          triggerHaptic([20, 40]);
          speak(`अंक ${this.trailCurrentTarget} को छुएं`);
        }
      };

      container.appendChild(col);
    });
  }

  // 4. Category Fluency
  initCategoryFluency(container) {
    this.setHeading("मोड 4: पारंपरिक श्रेणी पहचान", "पारंपरिक वाद्य यंत्र (Bihu Dhol) को पहचानकर छुएं।");
    const target = { id: 'dhol', name: 'Bihu Dhol', icon: '🥁', isTarget: true };
    const distractors = [
      { id: 'car', name: 'कार', icon: '🚗', isTarget: false },
      { id: 'plane', name: 'हवाई जहाज', icon: '✈️', isTarget: false },
      { id: 'clock', name: 'घड़ी', icon: '⌚', isTarget: false }
    ];
    const deck = [target, ...distractors].sort(() => 0.5 - Math.random());

    deck.forEach(item => {
      const col = document.createElement('div');
      col.className = 'col-6 col-sm-3';
      col.innerHTML = `
        <div class="elder-touch-tile">
          <span class="tile-glyph">${item.icon}</span>
          <span class="tile-caption">${item.name}</span>
        </div>
      `;

      col.querySelector('.elder-touch-tile').onclick = () => {
        if (item.isTarget) {
          this.triggerWin();
        } else {
          triggerHaptic([35]);
          speak("वाद्य यंत्र खोजें");
        }
      };

      container.appendChild(col);
    });
  }

  // 5. Stroop Color Inhibition
  initStroopInhibition(container) {
    this.setHeading("मोड 5: स्ट्रूप फोकस (संज्ञानात्मक नियंत्रण)", "हरा (Green) रंग पहचानें।");
    const colors = [
      { icon: '🟢', name: 'हरा', correct: true },
      { icon: '🔴', name: 'लाल', correct: false },
      { icon: '🔵', name: 'नीला', correct: false },
      { icon: '🟡', name: 'पीला', correct: false }
    ].sort(() => 0.5 - Math.random());

    colors.forEach(item => {
      const col = document.createElement('div');
      col.className = 'col-6 col-sm-3';
      col.innerHTML = `
        <div class="elder-touch-tile">
          <span class="tile-glyph">${item.icon}</span>
          <span class="tile-caption">${item.name}</span>
        </div>
      `;

      col.querySelector('.elder-touch-tile').onclick = () => {
        if (item.correct) {
          this.triggerWin();
        } else {
          triggerHaptic([30]);
          speak("हरा रंग चुनें");
        }
      };

      container.appendChild(col);
    });
  }

  triggerWin() {
    this.stopTimer();
    triggerHaptic([60, 40, 60]);
    speak("बहुत सुंदर!");

    if (window.confetti) {
      window.confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    }

    const latency = parseFloat(this.elapsedSeconds.toFixed(1));
    this.adjustDifficulty(latency);
    this.currentRound++;

    if (typeof this.onGameComplete === 'function') {
      this.onGameComplete({
        mode: this.currentGame,
        round: this.currentRound,
        latency: latency,
        level: this.currentLevel
      });
    }

    setTimeout(() => {
      this.loadGame(this.currentGame);
    }, 1500);
  }

  adjustDifficulty(latency) {
    if (latency <= 3.8 && this.currentLevel < 3) {
      this.currentLevel++;
    } else if (latency >= 8.5 && this.currentLevel > 1) {
      this.currentLevel--;
    }
  }
}