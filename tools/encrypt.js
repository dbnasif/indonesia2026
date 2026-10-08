// Cifra stdin (JSON) con AES-256-GCM y clave PBKDF2-SHA256 de la frase (argv[2]).
// Salida compatible con WebCrypto (ct = cifrado || tag), que es lo que usa netlify/firebase-db.js.
const crypto = require('crypto');
const phrase = process.argv[2], iters = 250000;
let input = '';
process.stdin.on('data', d => (input += d)).on('end', () => {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(phrase, salt, iters, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(input, 'utf8'), c.final(), c.getAuthTag()]);
  process.stdout.write(JSON.stringify({ salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'), iters }));
});
