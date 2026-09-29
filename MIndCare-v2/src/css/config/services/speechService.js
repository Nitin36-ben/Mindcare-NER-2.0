export const speak = (text) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85; // Elder friendly slower cadence
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
};

export const triggerHaptic = (pattern = [35]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};