// Entrypoint service Vercel. Vercel mengecek file entrypoint sebelum build, sedangkan
// dist/server.js baru dibuat oleh `npm run build` (bundle mandiri, lihat scripts/build.js).
module.exports = require('./dist/server.js');
