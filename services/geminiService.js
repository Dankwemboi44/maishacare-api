// backend/services/geminiService.js
// Simple version that doesn't require the Gemini API key

async function getHealthResponse(message, userContext) {
  return `I'm your AI Health Assistant. You said: "${message}". For medical advice, please consult with a doctor.`;
}

async function analyzeSymptoms(symptoms, duration, severity) {
  return `Based on your symptoms (${symptoms}) lasting ${duration} with ${severity} severity, please consult with a healthcare provider for proper diagnosis.`;
}

async function analyzeLabResults(labResults) {
  return `Your lab results have been analyzed. Please review them with your doctor for interpretation.`;
}

async function getWellnessTips(age, gender, healthGoals) {
  return `Wellness tips: Stay hydrated, exercise regularly, get adequate sleep, and maintain a balanced diet.`;
}

async function getMedicationInfo(medicationName) {
  return `Information about ${medicationName}: Please consult your doctor or pharmacist for detailed medication information.`;
}

module.exports = {
  getHealthResponse,
  analyzeSymptoms,
  analyzeLabResults,
  getWellnessTips,
  getMedicationInfo
};