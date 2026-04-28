// backend/server.js - Production Ready with PostgreSQL (No Payment Integration)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
const { Op } = require('sequelize');
const { sequelize, User, Appointment, Prescription, LabResult, MedicalRecord, Message, Notification, RefillRequest, PharmacyOrder } = require('./models');
const { uploadToCloudinary, deleteFromCloudinary } = require('./services/cloudinaryService');
const geminiService = require('./services/geminiService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
});

// Security middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database connection
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synced');
    
    const userCount = await User.count();
    if (userCount === 0) {
      await seedDatabase();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

async function seedDatabase() {
  const hashedPassword = await bcrypt.hash('patient123', 10);
  const hashedDoctorPassword = await bcrypt.hash('doctor123', 10);
  
  await User.bulkCreate([
    { name: 'John Mwangi', email: 'john@email.com', password: hashedPassword, role: 'patient', phone: '+254712345678', address: '123 Main Street, Nairobi', health_score: 85, date_of_birth: '1990-05-15', emergency_contact: '+254723456789' },
    { name: 'Mary Wanjiku', email: 'mary@email.com', password: hashedPassword, role: 'patient', phone: '+254756789012', address: '456 Kilimani Road, Nairobi', health_score: 78, date_of_birth: '1988-08-22', emergency_contact: '+254767890123' },
    { name: 'Peter Ochieng', email: 'peter@email.com', password: hashedPassword, role: 'patient', phone: '+254767890123', address: '789 Langata Road, Nairobi', health_score: 72, date_of_birth: '1978-11-30', emergency_contact: '+254778901234' },
    { name: 'Natasha Leyla', email: 'natashaleyla9@gmail.com', password: hashedPassword, role: 'patient', phone: '+254712345678', health_score: 100 },
    { name: 'Sarah Moraa', email: 'sarah@health.com', password: hashedDoctorPassword, role: 'doctor', specialty: 'Cardiologist', phone: '+254723456789', address: '123 Medical Center Dr', bio: 'Board-certified cardiologist with over 12 years of experience.', license_number: 'MD-12345', years_of_experience: '12' },
    { name: 'Michael Kibet', email: 'michael@health.com', password: hashedDoctorPassword, role: 'doctor', specialty: 'Pediatrician', phone: '+254734567890', address: '456 Children\'s Way', bio: 'Dedicated pediatrician specializing in child development.', license_number: 'MD-23456', years_of_experience: '8' },
    { name: 'Amina Khan', email: 'amina@health.com', password: hashedDoctorPassword, role: 'doctor', specialty: 'Gynecologist', phone: '+254745678901', address: '789 Women\'s Health Center', bio: 'Experienced gynecologist dedicated to women\'s health.', license_number: 'MD-34567', years_of_experience: '10' }
  ]);
  console.log('Users seeded');

  // Get created user IDs
  const patients = await User.findAll({ where: { role: 'patient' } });
  const doctors = await User.findAll({ where: { role: 'doctor' } });
  
  const john = patients.find(p => p.name === 'John Mwangi');
  const mary = patients.find(p => p.name === 'Mary Wanjiku');
  const peter = patients.find(p => p.name === 'Peter Ochieng');
  const drSarah = doctors.find(d => d.name === 'Sarah Moraa');

  // Seed Lab Results
  if (john && drSarah) {
    await LabResult.bulkCreate([
      {
        patient_id: john.id,
        doctor_id: drSarah.id,
        patient_name: john.name,
        doctor_name: drSarah.name,
        test_name: 'Complete Blood Count (CBC)',
        date: '2026-03-15',
        status: 'approved',
        results: {
          'WBC': { value: 7.2, unit: 'x10^3/uL', normal: '4.0-11.0', status: 'normal' },
          'RBC': { value: 4.8, unit: 'x10^6/uL', normal: '4.5-5.9', status: 'normal' },
          'Hemoglobin': { value: 14.2, unit: 'g/dL', normal: '13.5-17.5', status: 'normal' },
          'Platelets': { value: 250, unit: 'x10^3/uL', normal: '150-450', status: 'normal' }
        },
        doctor_notes: 'All values within normal range. Continue current treatment.'
      },
      {
        patient_id: john.id,
        doctor_id: drSarah.id,
        patient_name: john.name,
        doctor_name: drSarah.name,
        test_name: 'Lipid Panel',
        date: '2026-03-10',
        status: 'approved',
        results: {
          'Total Cholesterol': { value: 210, unit: 'mg/dL', normal: '<200', status: 'high' },
          'HDL': { value: 45, unit: 'mg/dL', normal: '>40', status: 'normal' },
          'LDL': { value: 130, unit: 'mg/dL', normal: '<100', status: 'high' },
          'Triglycerides': { value: 175, unit: 'mg/dL', normal: '<150', status: 'high' }
        },
        doctor_notes: 'Elevated cholesterol levels. Recommend dietary changes and increased physical activity.'
      }
    ]);
    console.log('Lab results seeded for John Mwangi');
  }

  if (mary && drSarah) {
    await LabResult.create({
      patient_id: mary.id,
      doctor_id: drSarah.id,
      patient_name: mary.name,
      doctor_name: drSarah.name,
      test_name: 'Thyroid Function Test',
      date: '2026-03-20',
      status: 'pending',
      results: {
        'TSH': { value: 4.5, unit: 'mIU/L', normal: '0.4-4.0', status: 'high' },
        'T3': { value: 120, unit: 'ng/dL', normal: '80-200', status: 'normal' },
        'T4': { value: 5.2, unit: 'ug/dL', normal: '4.5-12', status: 'normal' }
      },
      doctor_notes: null
    });
    console.log('Lab results seeded for Mary Wanjiku');
  }

  if (peter && drSarah) {
    await LabResult.create({
      patient_id: peter.id,
      doctor_id: drSarah.id,
      patient_name: peter.name,
      doctor_name: drSarah.name,
      test_name: 'Urinalysis',
      date: '2026-03-18',
      status: 'pending',
      results: null,
      doctor_notes: null
    });
    console.log('Lab results seeded for Peter Ochieng');
  }

  console.log('Database seeding completed');
}

// Auth middleware
async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Email transporter
let emailTransporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

async function sendEmail(to, subject, htmlContent) {
  if (!emailTransporter) {
    console.log('Email would be sent to:', to);
    return { success: true };
  }
  try {
    await emailTransporter.sendMail({ from: `"AI-Powered Health Assistant" <${process.env.EMAIL_USER}>`, to, subject, html: htmlContent });
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false };
  }
}

// ==================== API ROUTES ====================

// Auth routes
app.post('/api/register', [
  body('name').notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  
  const { name, email, password, role, specialty, phone, address } = req.body;
  
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) return res.status(400).json({ error: 'User already exists' });
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    name, email, password: hashedPassword, role: role || 'patient',
    phone, address, specialty: role === 'doctor' ? specialty : null,
    health_score: role === 'patient' ? 100 : null
  });
  
  await sendEmail(email, 'Welcome to AI-Powered Health Assistant!', `<h1>Welcome ${name}!</h1><p>Thank you for joining!</p>`);
  
  res.json({ success: true, message: 'Account created successfully! Please login.', user: { id: newUser.id, name, email, role: newUser.role } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userWithoutPassword } = user.toJSON();
  res.json({ token, user: userWithoutPassword });
});

// Profile routes
app.get('/api/patients', auth, async (req, res) => {
  try {
    const patients = await User.findAll({ 
      where: { role: 'patient' },
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']]
    });
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

app.get('/api/patients/:id', auth, async (req, res) => {
  const patient = await User.findOne({ 
    where: { id: req.params.id, role: 'patient' },
    attributes: { exclude: ['password'] }
  });
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

app.put('/api/patients/:id', auth, async (req, res) => {
  const { name, email, phone, address, date_of_birth, emergency_contact } = req.body;
  await User.update({ name, email, phone, address, date_of_birth, emergency_contact }, { where: { id: req.params.id, role: 'patient' } });
  const patient = await User.findByPk(req.params.id);
  const { password, ...patientWithoutPassword } = patient.toJSON();
  res.json(patientWithoutPassword);
});

app.get('/api/doctors', auth, async (req, res) => {
  const doctors = await User.findAll({ 
    where: { role: 'doctor' }, 
    attributes: { exclude: ['password'] },
    order: [['name', 'ASC']]
  });
  res.json(doctors);
});

app.get('/api/doctors/:id', auth, async (req, res) => {
  const doctor = await User.findOne({ 
    where: { id: req.params.id, role: 'doctor' },
    attributes: { exclude: ['password'] }
  });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json(doctor);
});

app.post('/api/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!await bcrypt.compare(current_password, req.user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hashedPassword = await bcrypt.hash(new_password, 10);
  await User.update({ password: hashedPassword }, { where: { id: req.user.id } });
  res.json({ success: true, message: 'Password changed successfully' });
});

// Appointment routes
app.get('/api/appointments', auth, async (req, res) => {
  const where = req.user.role === 'doctor' ? { doctor_id: req.user.id } : { patient_id: req.user.id };
  const appointments = await Appointment.findAll({
    where,
    order: [['date', 'ASC']]
  });
  res.json(appointments);
});

app.post('/api/appointments', auth, async (req, res) => {
  const { doctor_id, date, time, reason, type } = req.body;
  const doctor = await User.findOne({ where: { id: doctor_id, role: 'doctor' } });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  
  const newAppointment = await Appointment.create({
    patient_id: req.user.id, doctor_id: parseInt(doctor_id),
    patient_name: req.user.name, doctor_name: doctor.name,
    date, time, reason, type: type || 'in-person', status: 'pending'
  });
  
  await sendEmail(req.user.email, 'Appointment Request Received', `<h1>Appointment Request</h1><p>Your appointment with Dr. ${doctor.name} has been requested.</p>`);
  res.status(201).json(newAppointment);
});

app.put('/api/appointments/:id', auth, async (req, res) => {
  const { status } = req.body;
  await Appointment.update({ status, updated_at: new Date() }, { where: { id: req.params.id } });
  const appointment = await Appointment.findByPk(req.params.id);
  res.json({ success: true, appointment });
});

app.get('/api/prescriptions', auth, async (req, res) => {
  const where = req.user.role === 'doctor' ? { doctor_id: req.user.id } : { patient_id: req.user.id };
  const prescriptions = await Prescription.findAll({ 
    where, 
    order: [['prescribed_date', 'DESC']]
  });
  res.json(prescriptions);
});

app.post('/api/prescriptions', auth, async (req, res) => {
  if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Only doctors can issue prescriptions' });
  
  const { patient_id, medication_name, dosage, frequency, instructions, refills } = req.body;
  const patient = await User.findByPk(patient_id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  
  const newPrescription = await Prescription.create({
    patient_id, doctor_id: req.user.id, patient_name: patient.name, doctor_name: req.user.name,
    medication_name, dosage, frequency, instructions, refills: refills || 0,
    prescribed_date: new Date().toISOString().split('T')[0],
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active'
  });
  
  await sendEmail(patient.email, 'New Prescription Issued', `<h1>New Prescription</h1><p>Dr. ${req.user.name} has issued a prescription for ${medication_name}.</p><p>Dosage: ${dosage}</p><p>Frequency: ${frequency}</p>`);
  
  res.status(201).json(newPrescription);
});

// Medical Records routes with Cloudinary
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/medical-records/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const { title, category, description, date, patient_id } = req.body;
  const targetPatientId = parseInt(patient_id || req.user.id);
  
  const result = await uploadToCloudinary(req.file.buffer, `medical-records/${targetPatientId}`);
  
  const newRecord = await MedicalRecord.create({
    patient_id: targetPatientId, patient_name: req.user.name,
    title: title || req.file.originalname, category: category || 'other',
    description, file_name: result.public_id, original_name: req.file.originalname,
    file_size: req.file.size, file_type: req.file.mimetype, file_url: result.secure_url,
    record_date: date || new Date().toISOString().split('T')[0],
    uploaded_by: req.user.id, uploaded_by_name: req.user.name
  });
  
  res.status(201).json(newRecord);
});

app.get('/api/medical-records/:id/download', auth, async (req, res) => {
  const record = await MedicalRecord.findByPk(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json({ url: record.file_url, name: record.original_name });
});

app.delete('/api/medical-records/:id', auth, async (req, res) => {
  const record = await MedicalRecord.findByPk(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  
  await deleteFromCloudinary(record.file_name);
  await record.destroy();
  res.json({ success: true });
});

// Chat routes
app.get('/api/conversations', auth, async (req, res) => {
  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { from_user_id: req.user.id },
        { to_user_id: req.user.id }
      ]
    },
    order: [['createdAt', 'DESC']]
  });
  
  const conversationMap = new Map();
  for (const msg of messages) {
    const otherId = msg.from_user_id === req.user.id ? msg.to_user_id : msg.from_user_id;
    if (!conversationMap.has(otherId)) {
      const otherUser = await User.findByPk(otherId);
      if (otherUser) {
        conversationMap.set(otherId, {
          userId: otherId, name: otherUser.name, role: otherUser.role,
          lastMessage: msg.message, lastMessageTime: msg.createdAt,
          unread: messages.filter(m => m.to_user_id === req.user.id && m.from_user_id === otherId && !m.read).length
        });
      }
    }
  }
  res.json(Array.from(conversationMap.values()));
});

app.get('/api/messages/:userId', auth, async (req, res) => {
  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { from_user_id: req.user.id, to_user_id: req.params.userId },
        { from_user_id: req.params.userId, to_user_id: req.user.id }
      ]
    },
    order: [['createdAt', 'ASC']]
  });
  
  await Message.update({ read: true }, { where: { to_user_id: req.user.id, from_user_id: req.params.userId, read: false } });
  res.json(messages);
});

// ==================== PHARMACY ROUTES ====================

app.post('/api/pharmacy/orders', auth, async (req, res) => {
  try {
    const { items, total_amount, delivery_address, payment_method } = req.body;
    
    const newOrder = await PharmacyOrder.create({
      user_id: req.user.id,
      items: typeof items === 'string' ? items : JSON.stringify(items),
      total_amount,
      delivery_address,
      payment_method: payment_method || 'cash_on_delivery',
      status: 'pending'
    });
    
    await sendEmail(req.user.email, 'Pharmacy Order Confirmed', `
      <h1>Order Confirmed</h1>
      <p>Your order has been placed successfully.</p>
      <p>Order ID: ${newOrder.id}</p>
      <p>Total Amount: KSh ${total_amount}</p>
      <p>Delivery Address: ${delivery_address}</p>
      <p>Payment Method: Cash on Delivery</p>
    `);
    
    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

app.get('/api/pharmacy/orders/:userId', auth, async (req, res) => {
  try {
    const orders = await PharmacyOrder.findAll({
      where: { user_id: req.params.userId },
      order: [['created_at', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

app.post('/api/pharmacy/upload-prescription', auth, upload.single('prescription'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const result = await uploadToCloudinary(req.file.buffer, `pharmacy-prescriptions/${req.user.id}`);
    
    const prescriptionRecord = await Prescription.create({
      patient_id: req.user.id,
      patient_name: req.user.name,
      medication_name: req.body.medication_name || 'Uploaded Prescription',
      dosage: req.body.dosage || 'As prescribed',
      instructions: 'Please verify this prescription',
      prescribed_date: new Date().toISOString().split('T')[0],
      file_url: result.secure_url,
      status: 'pending_verification'
    });
    
    res.json({ success: true, message: 'Prescription uploaded successfully', prescription: prescriptionRecord });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ==================== OTHER ROUTES ====================

app.post('/api/gemini/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const response = await geminiService.getHealthResponse(message, { userId: req.user.id, role: req.user.role, userName: req.user.name });
    res.json({ success: true, response });
  } catch (error) {
    console.error('Gemini chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lab Results routes
app.get('/api/lab-results', auth, async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'doctor') {
      where = { doctor_id: req.user.id };
    } else {
      where = { patient_id: req.user.id };
    }
    const labResults = await LabResult.findAll({ 
      where, 
      order: [['date', 'DESC']]
    });
    res.json(labResults);
  } catch (error) {
    console.error('Error fetching lab results:', error);
    res.status(500).json({ error: 'Failed to fetch lab results' });
  }
});

app.put('/api/lab-results/:id/review', auth, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can review lab results' });
  }
  
  const { status, notes } = req.body;
  await LabResult.update({ 
    status: status || 'approved', 
    doctor_notes: notes,
    reviewed_by: req.user.id,
    reviewed_at: new Date()
  }, { where: { id: req.params.id } });
  const labResult = await LabResult.findByPk(req.params.id);
  res.json({ success: true, labResult });
});

app.get('/api/prescriptions/refill-requests', auth, async (req, res) => {
  if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Access denied' });
  const requests = await RefillRequest.findAll({ where: { doctor_id: req.user.id, status: 'pending' } });
  res.json(requests);
});

app.post('/api/prescriptions/:id/refill', auth, async (req, res) => {
  if (req.user.role !== 'patient') return res.status(403).json({ error: 'Only patients can request refills' });
  
  const prescription = await Prescription.findByPk(req.params.id);
  if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
  if (prescription.patient_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (prescription.refills <= 0) return res.status(400).json({ error: 'No refills remaining' });
  
  const refillRequest = await RefillRequest.create({
    prescription_id: prescription.id,
    patient_id: req.user.id,
    patient_name: req.user.name,
    doctor_id: prescription.doctor_id,
    medication_name: prescription.medication_name,
    status: 'pending'
  });
  
  res.json({ success: true, message: 'Refill request submitted', refillRequest });
});

app.post('/api/send-reminder', auth, async (req, res) => {
  const { appointment_id, method } = req.body;
  const appointment = await Appointment.findByPk(appointment_id);
  
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  
  const patient = await User.findByPk(appointment.patient_id);
  const doctor = await User.findByPk(appointment.doctor_id);
  
  if (method === 'email') {
    await sendEmail(patient.email, 'Appointment Reminder', `
      <h1>Appointment Reminder</h1>
      <p>Dear ${patient.name},</p>
      <p>This is a reminder for your appointment with Dr. ${doctor.name} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}.</p>
    `);
  }
  
  res.json({ success: true, message: `Reminder sent via ${method}` });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) return res.status(400).json({ error: 'All fields required' });
  
  await sendEmail(process.env.EMAIL_USER || 'admin@health.com', `Contact Form: ${subject}`, `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`);
  await sendEmail(email, 'Thank you for contacting us', `<h1>Thank you ${name}!</h1><p>We'll get back to you soon.</p>`);
  res.json({ success: true, message: 'Message sent successfully' });
});

// ==================== WEBSOCKET ====================

const onlineUsers = new Map();
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('user-online', (data) => {
    onlineUsers.set(parseInt(data.userId), { socketId: socket.id, name: data.userName, role: data.userRole });
    io.emit('users-online', Array.from(onlineUsers.entries()).map(([id, d]) => ({ id, name: d.name, role: d.role })));
  });
  
  socket.on('private-message', async (data) => {
    const recipient = onlineUsers.get(parseInt(data.toUserId));
    if (recipient) {
      io.to(recipient.socketId).emit('new-message', {
        fromUserId: parseInt(data.fromUserId),
        fromUserName: data.fromUserName,
        fromUserRole: data.fromUserRole,
        message: data.message,
        timestamp: new Date()
      });
    }
    await Message.create({
      from_user_id: parseInt(data.fromUserId),
      to_user_id: parseInt(data.toUserId),
      message: data.message,
      from_user_name: data.fromUserName
    });
  });
  
  socket.on('typing', (data) => {
    const recipient = onlineUsers.get(parseInt(data.toUserId));
    if (recipient) {
      io.to(recipient.socketId).emit('user-typing', {
        fromUserId: parseInt(data.fromUserId),
        fromUserName: data.fromUserName
      });
    }
  });
  
  socket.on('disconnect', () => {
    for (const [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('users-online', Array.from(onlineUsers.entries()).map(([id, d]) => ({ id, name: d.name, role: d.role })));
    console.log('User disconnected:', socket.id);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await sequelize.close();
  server.close(() => console.log('Server closed'));
});

// Start server
const PORT = process.env.PORT || 5000;
initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});