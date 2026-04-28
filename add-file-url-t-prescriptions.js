// add-file-url-to-prescriptions.js
require('dotenv').config();
const { sequelize } = require('./models');

async function addColumn() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    await sequelize.query(`ALTER TABLE "Prescriptions" ADD COLUMN IF NOT EXISTS "file_url" VARCHAR(255);`);
    console.log('✅ Column "file_url" added to Prescriptions table');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addColumn();