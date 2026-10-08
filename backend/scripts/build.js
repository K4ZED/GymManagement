// Bundle server jadi satu file (dist/server.js) tanpa ketergantungan node_modules saat runtime,
// karena service Vercel tidak menyertakan node_modules ke function.
const fs = require('fs');
const esbuild = require('esbuild');

// Prisma (engineType "client") membaca query_compiler_bg.wasm dari disk lewat fs.
// Ganti dengan versi base64 bawaan @prisma/client supaya wasm ikut ter-bundle.
const prismaWasmInline = {
  name: 'prisma-wasm-inline',
  setup(build) {
    build.onLoad({ filter: /[\\/]\.prisma[\\/]client[\\/]index\.js$/ }, (args) => {
      const source = fs.readFileSync(args.path, 'utf8');
      const pattern =
        /const queryCompilerWasmFilePath = require\('path'\)\.join\(config\.dirname, 'query_compiler_bg\.wasm'\)\s*const queryCompilerWasmFileBytes = require\('fs'\)\.readFileSync\(queryCompilerWasmFilePath\)/;
      if (!pattern.test(source)) throw new Error('Pola pemuatan wasm Prisma tidak ditemukan; cek versi Prisma');
      const contents = source.replace(
        pattern,
        "const queryCompilerWasmFileBytes = Buffer.from(require('@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.js').wasm, 'base64')",
      );
      return { contents, loader: 'js' };
    });
  },
};

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/server.js',
    external: ['pg-native'],
    plugins: [prismaWasmInline],
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
