const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or 'outlook', 'yahoo', or custom SMTP
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS  // your app password
  }
});

// Email templates
const emailTemplates = {
  // Appointment Booking Confirmation
  appointmentBooked: (patientName, doctorName, date, time, type, location) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px; }
        .details { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Appointment Confirmed</h1>
          <p>AI Health</p>
        </div>
        <div class="content">
          <h2>Dear ${patientName},</h2>
          <p>Your appointment has been successfully booked. Here are the details:</p>
          <div class="details">
            <p><strong>👨‍⚕️ Doctor:</strong> ${doctorName}</p>
            <p><strong>📅 Date:</strong> ${new Date(date).toLocaleDateString()}</p>
            <p><strong>⏰ Time:</strong> ${time}</p>
            <p><strong>📋 Type:</strong> ${type === 'video' ? '💻 Video Consultation' : '🏥 In-Person Visit'}</p>
            <p><strong>📍 Location:</strong> ${location}</p>
          </div>
          <p>Please arrive 10 minutes before your scheduled time.</p>
          <a href="${process.env.FRONTEND_URL}/dashboard/appointments" class="button">View My Appointments</a>
          <p><br>Need to reschedule? You can do so from your dashboard.</p>
        </div>
        <div class="footer">
          <p>AI Health - Your Health, Our Priority</p>
          <p>© 2026 AI Health. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Appointment Rescheduled
  appointmentRescheduled: (patientName, doctorName, oldDate, oldTime, newDate, newTime) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; }
        .old-details { background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0; text-decoration: line-through; }
        .new-details { background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔄 Appointment Rescheduled</h1>
          <p>AI Health</p>
        </div>
        <div class="content">
          <h2>Dear ${patientName},</h2>
          <p>Your appointment has been rescheduled. Here are the updated details:</p>
          
          <div class="old-details">
            <h3>❌ Previous Appointment</h3>
            <p><strong>Date:</strong> ${new Date(oldDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${oldTime}</p>
          </div>
          
          <div class="new-details">
            <h3>✅ New Appointment with Dr. ${doctorName}</h3>
            <p><strong>📅 Date:</strong> ${new Date(newDate).toLocaleDateString()}</p>
            <p><strong>⏰ Time:</strong> ${newTime}</p>
          </div>
          
          <a href="${process.env.FRONTEND_URL}/dashboard/appointments" class="button">View My Appointments</a>
        </div>
        <div class="footer">
          <p>AI Health - Your Health, Our Priority</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Prescription Issued
  prescriptionIssued: (patientName, doctorName, medications, instructions, refills) => {
    const medicationList = medications.map(med => `
      <li><strong>${med.name}</strong> - ${med.dosage} (${med.frequency})</li>
    `).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; }
          .medication-list { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; }
          .instructions { background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💊 New Prescription Issued</h1>
            <p>AI Health</p>
          </div>
          <div class="content">
            <h2>Dear ${patientName},</h2>
            <p>Dr. ${doctorName} has issued a new prescription for you.</p>
            
            <div class="medication-list">
              <h3>📋 Prescribed Medications:</h3>
              <ul>${medicationList}</ul>
              <p><strong>Refills:</strong> ${refills}</p>
            </div>
            
            <div class="instructions">
              <h3>📝 Instructions:</h3>
              <p>${instructions || 'Take as directed by your doctor. Contact your doctor if you have any questions.'}</p>
            </div>
            
            <a href="${process.env.FRONTEND_URL}/dashboard/prescriptions" class="button">View My Prescriptions</a>
            <p><br>To request a refill, visit your dashboard.</p>
          </div>
          <div class="footer">
            <p>AI Health - Your Health, Our Priority</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  // Lab Result Available
  labResultAvailable: (patientName, testName, doctorName, status) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔬 Lab Results Available</h1>
          <p>AI Health</p>
        </div>
        <div class="content">
          <h2>Dear ${patientName},</h2>
          <p>Your lab results for <strong>${testName}</strong> are now available.</p>
          <p><strong>Status:</strong> ${status === 'approved' ? '✅ Reviewed by Dr. ' + doctorName : '⏳ Pending Review'}</p>
          <a href="${process.env.FRONTEND_URL}/dashboard/lab-results" class="button">View Lab Results</a>
        </div>
        <div class="footer">
          <p>AI Health - Your Health, Our Priority</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Welcome Email
  welcomeEmail: (patientName) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to AI Health!</h1>
        </div>
        <div class="content">
          <h2>Dear ${patientName},</h2>
          <p>Thank you for joining AI Health! We're excited to help you on your health journey.</p>
          <p>With AI Health, you can:</p>
          <ul>
            <li>📅 Book appointments with top doctors</li>
            <li>💊 Manage your prescriptions</li>
            <li>🔬 View lab results</li>
            <li>💬 Chat with our AI Health Assistant</li>
            <li>📹 Attend video consultations</li>
          </ul>
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Get Started</a>
        </div>
        <div class="footer">
          <p>AI Health - Your Health, Our Priority</p>
        </div>
      </div>
    </body>
    </html>
  `
};

// Send email function
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: `"AI Health" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Specific email functions
const sendAppointmentBookedEmail = async (patientEmail, patientName, doctorName, date, time, type, location) => {
  const subject = '✅ Appointment Confirmed - AI Health';
  const html = emailTemplates.appointmentBooked(patientName, doctorName, date, time, type, location);
  return await sendEmail(patientEmail, subject, html);
};

const sendAppointmentRescheduledEmail = async (patientEmail, patientName, doctorName, oldDate, oldTime, newDate, newTime) => {
  const subject = '🔄 Appointment Rescheduled - AI Health';
  const html = emailTemplates.appointmentRescheduled(patientName, doctorName, oldDate, oldTime, newDate, newTime);
  return await sendEmail(patientEmail, subject, html);
};

const sendPrescriptionIssuedEmail = async (patientEmail, patientName, doctorName, medications, instructions, refills) => {
  const subject = '💊 New Prescription Issued - AI Health';
  const html = emailTemplates.prescriptionIssued(patientName, doctorName, medications, instructions, refills);
  return await sendEmail(patientEmail, subject, html);
};

const sendLabResultAvailableEmail = async (patientEmail, patientName, testName, doctorName, status) => {
  const subject = '🔬 Lab Results Available - AI Health';
  const html = emailTemplates.labResultAvailable(patientName, testName, doctorName, status);
  return await sendEmail(patientEmail, subject, html);
};

const sendWelcomeEmail = async (patientEmail, patientName) => {
  const subject = '🎉 Welcome to AI Health!';
  const html = emailTemplates.welcomeEmail(patientName);
  return await sendEmail(patientEmail, subject, html);
};

module.exports = {
  sendAppointmentBookedEmail,
  sendAppointmentRescheduledEmail,
  sendPrescriptionIssuedEmail,
  sendLabResultAvailableEmail,
  sendWelcomeEmail
};