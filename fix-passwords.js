const bcrypt = require('bcryptjs');
const fs = require('fs');

const hashedPatient = bcrypt.hashSync('patient123', 10);
const hashedDoctor = bcrypt.hashSync('doctor123', 10);

console.log('Patient password hash:', hashedPatient);
console.log('Doctor password hash:', hashedDoctor);

// Read current db
const db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));

// Update all passwords
db.users.forEach(user => {
  if (user.role === 'patient') {
    user.password = hashedPatient;
  } else if (user.role === 'doctor') {
    user.password = hashedDoctor;
  }
});

fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
console.log('✅ Passwords updated in db.json');