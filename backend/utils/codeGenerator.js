const { customAlphabet } = require('nanoid');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateRoomCode = customAlphabet(CHARS, 6); 

function generateUniqueCode(existingCodes) {
  let code;
  let attempts = 0;
  do {
    code = generateRoomCode();
    attempts++;
    if (attempts > 100) throw new Error('Could not generate unique room code');
  } while (existingCodes.has(code));
  return code;
}

module.exports = { generateRoomCode, generateUniqueCode };