const express = require('express');
const router = express.Router();
const {
  sendAppointmentBookedEmail,
  sendAppointmentRescheduledEmail,
  sendPrescriptionIssuedEmail,
  sendLabResultAvailableEmail,
  sendWelcomeEmail
} = require('../services/emailService');

// Send appointment booked email
router.post('/send-appointment-booked', async (req, res) => {
  try {
    const { patientEmail, patientName, doctorName, date, time, type, location } = req.body;
    const result = await sendAppointmentBookedEmail(patientEmail, patientName, doctorName, date, time, type, location);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send appointment rescheduled email
router.post('/send-appointment-rescheduled', async (req, res) => {
  try {
    const { patientEmail, patientName, doctorName, oldDate, oldTime, newDate, newTime } = req.body;
    const result = await sendAppointmentRescheduledEmail(patientEmail, patientName, doctorName, oldDate, oldTime, newDate, newTime);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send prescription issued email
router.post('/send-prescription-issued', async (req, res) => {
  try {
    const { patientEmail, patientName, doctorName, medications, instructions, refills } = req.body;
    const result = await sendPrescriptionIssuedEmail(patientEmail, patientName, doctorName, medications, instructions, refills);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send lab result email
router.post('/send-lab-result', async (req, res) => {
  try {
    const { patientEmail, patientName, testName, doctorName, status } = req.body;
    const result = await sendLabResultAvailableEmail(patientEmail, patientName, testName, doctorName, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send welcome email
router.post('/send-welcome', async (req, res) => {
  try {
    const { patientEmail, patientName } = req.body;
    const result = await sendWelcomeEmail(patientEmail, patientName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;