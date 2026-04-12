const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, authorize } = require('../middleware/auth');
const { readDB, writeDB } = require('../config/database');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/lab-results');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lab-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images and PDFs are allowed'));
  }
});

// Get all lab results for a user
router.get('/lab-results', auth, (req, res) => {
  const db = readDB();
  const labResults = db.labResults?.filter(l => l.patient_id === req.user.id) || [];
  
  const doctors = db.users.filter(u => u.role === 'doctor');
  const enhancedResults = labResults.map(result => ({
    ...result,
    doctor_name: doctors.find(d => d.id === result.doctor_id)?.name
  }));
  
  res.json(enhancedResults);
});

// Upload lab result (doctors only)
router.post('/lab-results', auth, authorize('doctor'), upload.single('file'), (req, res) => {
  const { patient_id, test_name, test_date, notes, normal_range, result_value, units } = req.body;
  const db = readDB();
  
  if (!db.labResults) db.labResults = [];
  if (!db.nextId.labResults) db.nextId.labResults = 1;
  
  const newResult = {
    id: db.nextId.labResults++,
    patient_id: parseInt(patient_id),
    doctor_id: req.user.id,
    test_name,
    test_date,
    notes,
    normal_range,
    result_value,
    units,
    file_url: req.file ? `/uploads/lab-results/${req.file.filename}` : null,
    status: 'pending',
    annotations: [],
    created_at: new Date().toISOString()
  };
  
  db.labResults.push(newResult);
  writeDB(db);
  res.json(newResult);
});

// Update lab result status (doctors only)
router.put('/lab-results/:id', auth, authorize('doctor'), (req, res) => {
  const { id } = req.params;
  const { status, doctor_notes } = req.body;
  const db = readDB();
  
  const labResult = db.labResults.find(l => l.id === parseInt(id));
  if (!labResult) return res.status(404).json({ error: 'Lab result not found' });
  
  if (status) labResult.status = status;
  if (doctor_notes) labResult.doctor_notes = doctor_notes;
  
  writeDB(db);
  res.json(labResult);
});

// Add annotation (doctor only)
router.post('/lab-results/:id/annotate', auth, authorize('doctor'), (req, res) => {
  const { id } = req.params;
  const { annotation } = req.body;
  const db = readDB();
  
  const labResult = db.labResults.find(l => l.id === parseInt(id));
  if (!labResult) return res.status(404).json({ error: 'Lab result not found' });
  
  if (!labResult.annotations) labResult.annotations = [];
  labResult.annotations.push({
    id: Date.now(),
    doctor_id: req.user.id,
    doctor_name: req.user.name,
    annotation,
    date: new Date().toISOString()
  });
  
  writeDB(db);
  res.json(labResult);
});

// Get lab result by ID
router.get('/lab-results/:id', auth, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const labResult = db.labResults.find(l => l.id === parseInt(id));
  if (!labResult) return res.status(404).json({ error: 'Lab result not found' });
  
  if (labResult.patient_id !== req.user.id && req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const doctor = db.users.find(u => u.id === labResult.doctor_id);
  res.json({ ...labResult, doctor_name: doctor?.name });
});

module.exports = router;