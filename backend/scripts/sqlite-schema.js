// Membuat prisma/schema.sqlite.prisma dari prisma/schema.prisma (PostgreSQL) untuk development lokal.
// schema.prisma tetap satu-satunya sumber; jangan edit file hasil generate.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'prisma');
const source = fs.readFileSync(path.join(dir, 'schema.prisma'), 'utf8');

const sqlite = source
  .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
  .replace(/^\s*directUrl\s*=.*\n/m, '');

if (!sqlite.includes('provider = "sqlite"')) throw new Error('Datasource provider "postgresql" tidak ditemukan di schema.prisma');

fs.writeFileSync(
  path.join(dir, 'schema.sqlite.prisma'),
  `// AUTO-GENERATED oleh scripts/sqlite-schema.js dari schema.prisma — jangan diedit.\n${sqlite}`,
);
