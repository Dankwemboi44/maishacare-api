const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { readDB, writeDB } = require('../config/database');

// Simple email function (logs to console instead of sending)
const sendPasswordResetEmail = async (email, name, resetLink) => {
  console.log('\n📧 ===== PASSWORD RESET EMAIL =====');
  console.log(`To: ${email}`);
  console.log(`Subject: Reset Your Password - AI Health Assistant`);
  console.log(`Content: Click here to reset your password: ${resetLink}`);
  console.log('================================\n');
  return true;
};

// Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const db = readDB();
  
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.json({ success: true, message: 'If your email is registered, you will receive a reset link.' });
  }
  
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = Date.now() + 3600000; // 1 hour
  
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = resetExpires;
  writeDB(db);
  
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  await sendPasswordResetEmail(user.email, user.name, resetLink);
  
  res.json({ success: true, message: 'Password reset link sent to your email.' });
});

// Verify reset token
router.get('/verify-reset-token/:token', (req, res) => {
  const { token } = req.params;
  const db = readDB();
  
  const user = db.users.find(u => 
    u.resetPasswordToken === token && 
    u.resetPasswordExpires > Date.now()
  );
  
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  
  res.json({ success: true, message: 'Token is valid' });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const db = readDB();
  
  const user = db.users.find(u => 
    u.resetPasswordToken === token && 
    u.resetPasswordExpires > Date.now()
  );
  
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  
  user.password = bcrypt.hashSync(newPassword, 10);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  writeDB(db);
  
  res.json({ success: true, message: 'Password reset successful!' });
});

module.exports = router;