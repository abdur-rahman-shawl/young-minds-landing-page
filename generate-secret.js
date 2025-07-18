// generate-secret.js
const crypto = require('crypto');

// Generate a 32-byte random string encoded in base64
const secret = crypto.randomBytes(32).toString('base64');
 
console.log('Copy this value for BETTER_AUTH_SECRET:');
console.log(secret);
console.log('\nAdd this to your .env.local file:');
console.log(`BETTER_AUTH_SECRET="${secret}"`); 