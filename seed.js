// backend/seed.js
require('dotenv').config();
const { sequelize, User } = require('./models');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    // Clear existing users first
    await User.destroy({ where: {}, truncate: true, cascade: true });
    console.log('Cleared existing users');
    
    const hashedPatientPassword = await bcrypt.hash('patient123', 10);
    const hashedDoctorPassword = await bcrypt.hash('doctor123', 10);
    
    await User.bulkCreate([
      { name: 'John Mwangi', email: 'john@email.com', password: hashedPatientPassword, role: 'patient', phone: '+254712345678', address: '123 Main Street, Nairobi', health_score: 85 },
      { name: 'Mary Wanjiku', email: 'mary@email.com', password: hashedPatientPassword, role: 'patient', phone: '+254756789012', address: '456 Kilimani Road, Nairobi', health_score: 78 },
      { name: 'Peter Ochieng', email: 'peter@email.com', password: hashedPatientPassword, role: 'patient', phone: '+254767890123', address: '789 Langata Road, Nairobi', health_score: 72 },
      { name: 'Natasha Leyla', email: 'natashaleyla9@gmail.com', password: hashedPatientPassword, role: 'patient', phone: '+254712345678', health_score: 100 },
      { name: 'Dr. Sarah Moraa', email: 'sarah@health.com', password: hashedDoctorPassword, role: 'doctor', specialty: 'Cardiologist', phone: '+254723456789', bio: 'Board-certified cardiologist', license_number: 'MD-12345', years_of_experience: '12' },
      { name: 'Dr. Michael Kibet', email: 'michael@health.com', password: hashedDoctorPassword, role: 'doctor', specialty: 'Pediatrician', phone: '+254734567890', bio: 'Dedicated pediatrician', license_number: 'MD-23456', years_of_experience: '8' },
      { name: 'Dr. Amina Khan', email: 'amina@health.com', password: hashedDoctorPassword, role: 'doctor', specialty: 'Gynecologist', phone: '+254745678901', bio: 'Experienced gynecologist', license_number: 'MD-34567', years_of_experience: '10' }
    ]);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();