const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');
const { readDB, writeDB } = require('../config/database');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images are allowed'));
  }
});

// Get profile
router.get('/profile', auth, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  const { password, ...profile } = user;
  res.json(profile);
});

// Update profile
router.put('/profile', auth, (req, res) => {
  const { name, phone, address, dateOfBirth, gender, bloodType } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  
  if (user) {
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (bloodType) user.bloodType = bloodType;
    
    writeDB(db);
    const { password, ...profile } = user;
    res.json(profile);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Upload avatar
router.post('/avatar', auth, upload.single('avatar'), (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  
  if (user && req.file) {
    // Delete old avatar if exists
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatar));
      if (fs.existsSync(oldAvatarPath)) fs.unlinkSync(oldAvatarPath);
    }
    
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    writeDB(db);
    res.json({ avatar: user.avatar });
  } else {
    res.status(400).json({ error: 'Upload failed' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const isValid = bcrypt.compareSync(currentPassword, user.password);
  if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });
  
  user.password = bcrypt.hashSync(newPassword, 10);
  writeDB(db);
  
  res.json({ success: true, message: 'Password changed successfully' });
});

// Update notification preferences
router.put('/notifications', auth, (req, res) => {
  const { emailNotifications, smsNotifications, appointmentReminders, medicationReminders } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  
  if (user) {
    user.notifications = {
      email: emailNotifications !== undefined ? emailNotifications : (user.notifications?.email ?? true),
      sms: smsNotifications !== undefined ? smsNotifications : (user.notifications?.sms ?? false),
      appointments: appointmentReminders !== undefined ? appointmentReminders : (user.notifications?.appointments ?? true),
      medications: medicationReminders !== undefined ? medicationReminders : (user.notifications?.medications ?? true)
    };
    writeDB(db);
    res.json({ success: true, preferences: user.notifications });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

module.exports = router;