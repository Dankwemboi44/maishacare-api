// backend/models/index.js
const { Sequelize, DataTypes } = require('sequelize');

// IMPORTANT: Use DATABASE_URL in production, local config in development
let sequelize;

if (process.env.DATABASE_URL) {
  // On Render.com - use the DATABASE_URL they provide
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false  // Required for Render's PostgreSQL
      }
    }
  });
} else {
  // Local development
  sequelize = new Sequelize(
    process.env.DB_NAME || 'maishacare_db',
    process.env.DB_USER || 'maishacare_user',
    process.env.DB_PASSWORD || 'maishacare123',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false
    }
  );
}

// Test connection
sequelize.authenticate()
  .then(() => console.log('PostgreSQL connected successfully'))
  .catch(err => console.error('Unable to connect to PostgreSQL:', err.message));

// User Model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('patient', 'doctor'), allowNull: false },
  specialty: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  avatar_url: { type: DataTypes.STRING, allowNull: true },
  bio: { type: DataTypes.TEXT, allowNull: true },
  license_number: { type: DataTypes.STRING, allowNull: true },
  years_of_experience: { type: DataTypes.STRING, allowNull: true },
  health_score: { type: DataTypes.INTEGER, defaultValue: 100 },
  date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
  emergency_contact: { type: DataTypes.STRING, allowNull: true },
  blood_type: { type: DataTypes.STRING, allowNull: true },
  patientsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Appointment Model
const Appointment = sequelize.define('Appointment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  patient_id: { type: DataTypes.INTEGER, allowNull: false },
  doctor_id: { type: DataTypes.INTEGER, allowNull: false },
  patient_name: { type: DataTypes.STRING, allowNull: false },
  doctor_name: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  type: { type: DataTypes.ENUM('video', 'in-person'), defaultValue: 'in-person' },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'), defaultValue: 'pending' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  videoLink: { type: DataTypes.STRING, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Prescription Model
const Prescription = sequelize.define('Prescription', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  patient_id: { type: DataTypes.INTEGER, allowNull: false },
  doctor_id: { type: DataTypes.INTEGER, allowNull: false },
  patient_name: { type: DataTypes.STRING, allowNull: false },
  doctor_name: { type: DataTypes.STRING, allowNull: false },
  medication_name: { type: DataTypes.STRING, allowNull: false },
  dosage: { type: DataTypes.STRING, allowNull: false },
  frequency: { type: DataTypes.STRING, allowNull: false },
  instructions: { type: DataTypes.TEXT, allowNull: true },
  refills: { type: DataTypes.INTEGER, defaultValue: 0 },
  prescribed_date: { type: DataTypes.DATEONLY, allowNull: false },
  expires_at: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'expired', 'completed'), defaultValue: 'active' },
  document_url: { type: DataTypes.STRING, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// LabResult Model
const LabResult = sequelize.define('LabResult', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  patient_id: { type: DataTypes.INTEGER, allowNull: false },
  doctor_id: { type: DataTypes.INTEGER, allowNull: false },
  patient_name: { type: DataTypes.STRING, allowNull: false },
  doctor_name: { type: DataTypes.STRING, allowNull: false },
  test_name: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  results: { type: DataTypes.JSONB, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  doctor_notes: { type: DataTypes.TEXT, allowNull: true },
  document_url: { type: DataTypes.STRING, allowNull: true },
  reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// MedicalRecord Model
const MedicalRecord = sequelize.define('MedicalRecord', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  patient_id: { type: DataTypes.INTEGER, allowNull: false },
  patient_name: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.ENUM('lab_results', 'prescriptions', 'imaging', 'vaccination', 'other'), defaultValue: 'other' },
  description: { type: DataTypes.TEXT, allowNull: true },
  file_name: { type: DataTypes.STRING, allowNull: false },
  original_name: { type: DataTypes.STRING, allowNull: false },
  file_size: { type: DataTypes.INTEGER, allowNull: false },
  file_type: { type: DataTypes.STRING, allowNull: false },
  file_url: { type: DataTypes.STRING, allowNull: false },
  record_date: { type: DataTypes.DATEONLY, allowNull: true },
  uploaded_by: { type: DataTypes.INTEGER, allowNull: false },
  uploaded_by_name: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'approved' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Message Model
const Message = sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  from_user_id: { type: DataTypes.INTEGER, allowNull: false },
  to_user_id: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  from_user_name: { type: DataTypes.STRING, allowNull: false },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Notification Model
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('success', 'error', 'warning', 'info'), defaultValue: 'info' },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// RefillRequest Model
const RefillRequest = sequelize.define('RefillRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  prescription_id: { type: DataTypes.INTEGER, allowNull: false },
  patient_id: { type: DataTypes.INTEGER, allowNull: false },
  patient_name: { type: DataTypes.STRING, allowNull: false },
  doctor_id: { type: DataTypes.INTEGER, allowNull: false },
  medication_name: { type: DataTypes.STRING, allowNull: false },
  requested_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Associations
User.hasMany(Appointment, { foreignKey: 'patient_id' });
User.hasMany(Appointment, { foreignKey: 'doctor_id' });
User.hasMany(Prescription, { foreignKey: 'patient_id' });
User.hasMany(Prescription, { foreignKey: 'doctor_id' });
User.hasMany(Message, { foreignKey: 'from_user_id' });
User.hasMany(Message, { foreignKey: 'to_user_id' });
User.hasMany(Notification, { foreignKey: 'user_id' });
User.hasMany(MedicalRecord, { foreignKey: 'patient_id' });
User.hasMany(LabResult, { foreignKey: 'patient_id' });
User.hasMany(LabResult, { foreignKey: 'doctor_id' });

Appointment.belongsTo(User, { as: 'patient', foreignKey: 'patient_id' });
Appointment.belongsTo(User, { as: 'doctor', foreignKey: 'doctor_id' });

module.exports = {
  sequelize,
  User,
  Appointment,
  Prescription,
  LabResult,
  MedicalRecord,
  Message,
  Notification,
  RefillRequest
};