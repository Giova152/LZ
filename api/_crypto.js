const crypto = require('crypto');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function randomSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { sha256, randomSalt, randomToken };