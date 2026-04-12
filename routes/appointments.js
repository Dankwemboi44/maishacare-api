const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { readDB, writeDB } = require('../config/database');
const { sendAppointmentConfirmation, sendAppointmentReminder } = require('../services/emailService');

// Get all appointments for current user
router.get('/', auth, (req, res) => {
  const db = readDB();
  const appointments = db.appointments.filter(a => a.patient_id === req.user.id || a.doctor_id === req.user.id);
  const doctors = db.users.filter(u => u.role === 'doctor');
  const patients = db.users.filter(u => u.role === 'patient');
  
  const result = appointments.map(a => ({
    ...a,
    doctor_name: doctors.find(d => d.id === a.doctor_id)?.name,
    doctor_specialty: doctors.find(d => d.id === a.doctor_id)?.specialty,
    patient_name: patients.find(p => p.id === a.patient_id)?.name,
    patient_phone: patients.find(p => p.id === a.patient_id)?.phone
  }));
  
  res.json(result);
});

// Get single appointment by ID
router.get('/:id', auth, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const appointment = db.appointments.find(a => a.id === parseInt(id));
  
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  // Check authorization
  if (appointment.patient_id !== req.user.id && appointment.doctor_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to view this appointment' });
  }
  
  const doctor = db.users.find(u => u.id === appointment.doctor_id);
  const patient = db.users.find(u => u.id === appointment.patient_id);
  
  res.json({
    ...appointment,
    doctor_name: doctor?.name,
    doctor_specialty: doctor?.specialty,
    patient_name: patient?.name,
    patient_email: patient?.email,
    patient_phone: patient?.phone
  });
});

// Create new appointment (patient only)
router.post('/', auth, authorize('patient'), async (req, res) => {
  const { doctor_id, date, time, reason, notes } = req.body;
  const db = readDB();
  
  // Validate doctor exists
  const doctor = db.users.find(u => u.id === parseInt(doctor_id));
  if (!doctor || doctor.role !== 'doctor') {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  
  // Check if doctor is available at that time
  const existingAppointment = db.appointments.find(a => 
    a.doctor_id === parseInt(doctor_id) && 
    a.date === date && 
    a.time === time && 
    a.status !== 'cancelled'
  );
  
  if (existingAppointment) {
    return res.status(409).json({ error: 'Doctor is not available at this time. Please select another time.' });
  }
  
  // Create new appointment
  const newAppointment = {
    id: db.nextId.appointments++,
    patient_id: req.user.id,
    doctor_id: parseInt(doctor_id),
    date,
    time,
    reason,
    notes: notes || '',
    status: 'pending',
    videoLink: null,
    calendarEventId: null,
    createdAt: new Date().toISOString(),
    reminderSent: false
  };
  
  db.appointments.push(newAppointment);
  writeDB(db);
  
  // Send email notification to patient (appointment requested)
  const patient = req.user;
  sendAppointmentConfirmation(newAppointment, patient, doctor, 'requested').catch(console.error);
  
  // Also send notification to doctor (optional - could be implemented later)
  
  res.status(201).json({
    ...newAppointment,
    doctor_name: doctor.name,
    patient_name: patient.name
  });
});

// Update appointment (doctor can update status, add notes, video link)
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { status, notes, videoLink } = req.body;
  const db = readDB();
  const appointment = db.appointments.find(a => a.id === parseInt(id));
  
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  // Check authorization
  if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to update this appointment' });
  }
  
  if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Patients can only cancel appointments' });
  }
  
  const oldStatus = appointment.status;
  
  // Update appointment
  if (status) appointment.status = status;
  if (notes) appointment.notes = notes;
  if (videoLink) appointment.videoLink = videoLink;
  
  writeDB(db);
  
  // Send email notifications based on status change
  const doctor = db.users.find(u => u.id === appointment.doctor_id);
  const patient = db.users.find(u => u.id === appointment.patient_id);
  
  if (status === 'confirmed' && oldStatus !== 'confirmed') {
    // Send confirmation email when doctor confirms appointment
    sendAppointmentConfirmation(appointment, patient, doctor, 'confirmed').catch(console.error);
    
    // Schedule reminder email for 24 hours before appointment
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const timeUntilAppointment = appointmentDate - now;
    const reminderTime = timeUntilAppointment - (24 * 60 * 60 * 1000); // 24 hours before
    
    if (reminderTime > 0) {
      setTimeout(() => {
        sendAppointmentReminder(appointment, patient, doctor).catch(console.error);
      }, reminderTime);
    }
  }
  
  if (status === 'cancelled' && oldStatus !== 'cancelled') {
    // Send cancellation email
    sendAppointmentConfirmation(appointment, patient, doctor, 'cancelled').catch(console.error);
  }
  
  if (status === 'completed') {
    // Send follow-up email after appointment
    sendAppointmentConfirmation(appointment, patient, doctor, 'completed').catch(console.error);
  }
  
  res.json({
    ...appointment,
    doctor_name: doctor?.name,
    patient_name: patient?.name
  });
});

// Cancel appointment (patient or doctor)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const appointment = db.appointments.find(a => a.id === parseInt(id));
  
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  // Check authorization
  if (appointment.patient_id !== req.user.id && appointment.doctor_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to cancel this appointment' });
  }
  
  // Instead of deleting, mark as cancelled
  appointment.status = 'cancelled';
  appointment.cancelledAt = new Date().toISOString();
  appointment.cancelledBy = req.user.id;
  
  writeDB(db);
  
  // Send cancellation email
  const doctor = db.users.find(u => u.id === appointment.doctor_id);
  const patient = db.users.find(u => u.id === appointment.patient_id);
  sendAppointmentConfirmation(appointment, patient, doctor, 'cancelled').catch(console.error);
  
  res.json({ success: true, message: 'Appointment cancelled successfully' });
});

// Get all doctors
router.get('/doctors/list', auth, (req, res) => {
  const db = readDB();
  const doctors = db.users.filter(u => u.role === 'doctor');
  res.json(doctors.map(d => ({ 
    id: d.id, 
    name: d.name, 
    specialty: d.specialty || 'General Medicine',
    phone: d.phone,
    email: d.email
  })));
});

// Get doctor availability for a specific date
router.get('/availability/:doctorId/:date', auth, (req, res) => {
  const { doctorId, date } = req.params;
  const db = readDB();
  
  const doctor = db.users.find(u => u.id === parseInt(doctorId));
  if (!doctor || doctor.role !== 'doctor') {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  
  // Get booked appointments for that doctor on that date
  const bookedAppointments = db.appointments.filter(a => 
    a.doctor_id === parseInt(doctorId) && 
    a.date === date && 
    a.status !== 'cancelled'
  );
  
  const bookedTimes = bookedAppointments.map(a => a.time);
  
  // Available time slots (9 AM to 5 PM, hourly)
  const allTimeSlots = [];
  for (let hour = 9; hour <= 17; hour++) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    if (!bookedTimes.includes(timeSlot)) {
      allTimeSlots.push(timeSlot);
    }
  }
  
  res.json({
    doctor: { id: doctor.id, name: doctor.name, specialty: doctor.specialty },
    date,
    availableSlots: allTimeSlots,
    bookedSlots: bookedTimes
  });
});

// Get appointment statistics for dashboard
router.get('/stats/summary', auth, (req, res) => {
  const db = readDB();
  const today = new Date().toISOString().split('T')[0];
  
  let appointments = db.appointments;
  
  // Filter by user role
  if (req.user.role === 'patient') {
    appointments = appointments.filter(a => a.patient_id === req.user.id);
  } else if (req.user.role === 'doctor') {
    appointments = appointments.filter(a => a.doctor_id === req.user.id);
  }
  
  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    today: appointments.filter(a => a.date === today).length,
    upcoming: appointments.filter(a => a.date >= today && a.status !== 'cancelled').length
  };
  
  res.json(stats);
});

// Reschedule appointment
router.put('/:id/reschedule', auth, async (req, res) => {
  const { id } = req.params;
  const { new_date, new_time, reason } = req.body;
  const db = readDB();
  const appointment = db.appointments.find(a => a.id === parseInt(id));
  
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  // Check authorization
  if (appointment.patient_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to reschedule this appointment' });
  }
  
  // Check if new time is available
  const conflictingAppointment = db.appointments.find(a => 
    a.doctor_id === appointment.doctor_id && 
    a.date === new_date && 
    a.time === new_time && 
    a.id !== parseInt(id) &&
    a.status !== 'cancelled'
  );
  
  if (conflictingAppointment) {
    return res.status(409).json({ error: 'New time slot is not available' });
  }
  
  const oldDate = appointment.date;
  const oldTime = appointment.time;
  
  // Update appointment
  appointment.date = new_date;
  appointment.time = new_time;
  appointment.status = 'pending'; // Reset to pending for doctor approval
  appointment.rescheduleReason = reason || 'No reason provided';
  appointment.rescheduledAt = new Date().toISOString();
  
  writeDB(db);
  
  // Send reschedule notification emails
  const doctor = db.users.find(u => u.id === appointment.doctor_id);
  const patient = db.users.find(u => u.id === appointment.patient_id);
  
  // Email to patient
  sendAppointmentConfirmation(appointment, patient, doctor, 'rescheduled').catch(console.error);
  
  res.json({
    ...appointment,
    doctor_name: doctor?.name,
    patient_name: patient?.name,
    message: `Appointment rescheduled from ${oldDate} ${oldTime} to ${new_date} ${new_time}`
  });
});

module.exports = router;