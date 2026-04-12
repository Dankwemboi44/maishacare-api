const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return null;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database:', err);
    return null;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

function initDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [
        { id: 1, name: 'John Mwangi', email: 'john@email.com', password: require('bcryptjs').hashSync('patient123', 10), role: 'patient', phone: '+254712345678', emergencyContact: { name: 'Jane Mwangi', phone: '+254723456789', relationship: 'Spouse' }, createdAt: new Date().toISOString(), preferences: { language: 'en', theme: 'light' } },
        { id: 2, name: 'Dr. Sarah Johnson', email: 'dr.sarah@health.com', password: require('bcryptjs').hashSync('doctor123', 10), role: 'doctor', specialty: 'Cardiologist', phone: '+254723456789', createdAt: new Date().toISOString(), preferences: { language: 'en', theme: 'light' } }
      ],
      appointments: [
        { id: 1, patient_id: 1, doctor_id: 2, date: '2024-04-15', time: '10:00', reason: 'Chest pain', status: 'confirmed', notes: '', videoLink: null, calendarEventId: null, createdAt: new Date().toISOString(), reminderSent: false },
        { id: 2, patient_id: 1, doctor_id: 2, date: '2024-04-20', time: '14:30', reason: 'Follow up', status: 'pending', notes: '', videoLink: null, calendarEventId: null, createdAt: new Date().toISOString(), reminderSent: false }
      ],
      medicalRecords: [
        { id: 1, patient_id: 1, doctor_id: 2, diagnosis: 'Mild hypertension', prescription: 'Lisinopril 10mg daily', notes: 'Monitor blood pressure', date: '2024-03-15', attachments: [] }
      ],
      prescriptions: [
        { id: 1, patient_id: 1, doctor_id: 2, medication: 'Lisinopril', dosage: '10mg daily', instructions: 'Take in the morning', refills: 2, issuedDate: '2024-03-15', expiresDate: '2024-06-15', status: 'active' }
      ],
      healthMetrics: [
        { id: 1, user_id: 1, type: 'blood_pressure', systolic: 120, diastolic: 80, recordedDate: '2024-04-01', notes: '' },
        { id: 2, user_id: 1, type: 'weight', value: 75, unit: 'kg', recordedDate: '2024-04-01', notes: '' }
      ],
      healthJournal: [
        { id: 1, user_id: 1, date: '2024-04-01', mood: 'good', sleep: 7, activity: 'Walked 30 mins', symptoms: 'None', notes: 'Felt energetic' }
      ],
      medicationReminders: [
        { id: 1, user_id: 1, medication: 'Lisinopril', time: '08:00', frequency: 'daily', active: true, lastTaken: null }
      ],
      vaccinationRecords: [
        { id: 1, user_id: 1, vaccine: 'COVID-19', date: '2023-06-15', dose: 'Booster', administeredBy: 'Nairobi Hospital', nextDue: '2024-06-15' }
      ],
      messages: [],
      videoCalls: [],
      nextId: { 
        users: 3, 
        appointments: 3, 
        medicalRecords: 2, 
        prescriptions: 2, 
        healthMetrics: 3, 
        healthJournal: 2, 
        medicationReminders: 2, 
        vaccinationRecords: 2, 
        messages: 1, 
        videoCalls: 1 
      }
    };
    writeDB(initialData);
    console.log('✅ Database created with all features');
  } else {
    console.log('✅ Database loaded');
  }
}

module.exports = { readDB, writeDB, initDatabase };