export const exportClinicalPdf = (patient, metrics) => {
  if (!window.jspdf) {
    alert("jsPDF loading...");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("MINDCARE NER: CLINICAL NEURO-TELEMETRY REPORT", 14, 18);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.text(`Patient Name: ${patient.name} | Age: ${patient.age} Yrs`, 14, 42);
  doc.text(`Target Condition: Mild Cognitive Impairment (MCI) Protocol`, 14, 50);
  doc.text(`Date Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 58);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 64, 196, 64);

  doc.setFontSize(13);
  doc.text("1. Longitudinal Quantitative Telemetry", 14, 74);
  doc.setFontSize(10);
  doc.text(`• Mean Psychomotor Latency: ${metrics.latency}s (Threshold: <5.0s)`, 18, 84);
  doc.text(`• Cognitive Retention Accuracy: ${metrics.retention}% (MMSE Benchmarked)`, 18, 92);
  doc.text(`• Pharmacological Adherence (Donepezil 5mg): ${metrics.adherence}%`, 18, 100);
  doc.text(`• Auto-Hint Triggers (>8s Hesitation): ${metrics.hesitations} instances`, 18, 108);

  doc.setFontSize(13);
  doc.text("2. AI Trajectory & Diagnostic Recommendation", 14, 126);
  doc.setFontSize(10);
  doc.text(`• On-Device Staging Prediction: ${metrics.aiStage}`, 18, 136);
  doc.text("• Action: Non-pharmacological Cognitive Stimulation Therapy (CST) continued.", 18, 144);

  doc.save(`MindCare_Telemetry_${patient.name.replace(/\s+/g, '_')}.pdf`);
};