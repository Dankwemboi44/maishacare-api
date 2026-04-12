const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Password reset endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { patient_id, current_password, new_password } = req.body;
    
    // Get patient from database
    const patient = await db.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    
    if (!patient.rows.length) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, patient.rows[0].password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    // Update password in database
    await db.query('UPDATE patients SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      hashedPassword,
      patient_id
    ]);
    
    res.json({ success: true, message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Profile update endpoint
router.put('/:patient_id', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { name, email, phone, date_of_birth, address, emergency_contact } = req.body;
    
    const result = await db.query(
      `UPDATE patients 
       SET name = $1, email = $2, phone = $3, date_of_birth = $4, 
           address = $5, emergency_contact = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, email, phone, date_of_birth, address, emergency_contact, patient_id]
    );
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Avatar upload endpoint
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/avatars/',
  filename: (req, file, cb) => {
    cb(null, `patient_${req.body.patient_id}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { patient_id } = req.body;
    const avatar_url = `/uploads/avatars/${req.file.filename}`;
    
    await db.query('UPDATE patients SET avatar_url = $1 WHERE id = $2', [avatar_url, patient_id]);
    
    res.json({ success: true, avatar_url });
    
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

module.exports = router;