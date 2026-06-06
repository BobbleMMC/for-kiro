#!/usr/bin/env node
/**
 * Bundles resources-src/ into resources/studio.bin (gzipped tar) plus a
 * manifest.json describing what's inside. The .bin file ships next to the
 * Tauri executable so the installer stays small and content can be hot-
 * patched without rebuilding the native binary.
 *
 * Format chosen for portability:
 *   - tarball with sha256 of each entry
 *   - gzip wrapper so Rust's flate2+tar crates can read it natively
 *   - manifest.json with version + entry list (path, size, sha256)
 */
import { readdir, readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'resources-src');
const OUT_DIR = join(ROOT, 'resources');
const OUT_BIN = join(OUT_DIR, 'studio.bin');
const OUT_MANIFEST = join(OUT_DIR, 'manifest.json');

// Tiny TAR writer (USTAR/POSIX subset — no need to pull in the npm `tar` package
// for ~10 small text files).
function tarHeader(name, size) {
  const header = Buffer.alloc(512, 0);
  const safeName = name.length > 99 ? name.slice(name.length - 99) : name;
  header.write(safeName, 0, 100, 'utf8');
  header.write('0000644', 100, 8, 'ascii');         // mode
  header.write('0000000', 108, 8, 'ascii');         // uid
  header.write('0000000', 116, 8, 'ascii');         // gid
  header.write(size.toString(8).padStart(11, '0'), 124, 12, 'ascii');
  header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0'), 136, 12, 'ascii');
  header.fill(' ', 148, 156);                       // checksum placeholder
  header.write('0', 156, 1, 'ascii');               // file type = regular
  header.write('ustar', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');

  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  header.write(sum.toString(8).padStart(6, '0'), 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const entries = [];
  const tarChunks = [];

  let total = 0;
  for await (const file of walk(SRC)) {
    const rel = relative(SRC, file).split('\\').join('/');
    const data = await readFile(file);
    const hash = createHash('sha256').update(data).digest('hex');

    tarChunks.push(tarHeader(rel, data.length));
    tarChunks.push(data);
    const padding = (512 - (data.length % 512)) % 512;
    if (padding) tarChunks.push(Buffer.alloc(padding, 0));

    entries.push({ path: rel, size: data.length, sha256: hash });
    total += data.length;
  }
  // Two trailing 512-byte zero blocks per TAR spec
  tarChunks.push(Buffer.alloc(1024, 0));

  // Pipe through gzip
  const tarBuffer = Buffer.concat(tarChunks);
  const gzip = createGzip({ level: 9 });
  const out = createWriteStream(OUT_BIN);
  gzip.end(tarBuffer);
  await pipeline(gzip, out);

  const binStat = await stat(OUT_BIN);
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    format: 'tar+gzip',
    uncompressedSize: total,
    compressedSize: binStat.size,
    entryCount: entries.length,
    entries,
  };
  await writeFile(OUT_MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`✓ ${entries.length} resources packed`);
  console.log(`  raw:        ${(total / 1024).toFixed(1)} KB`);
  console.log(`  compressed: ${(binStat.size / 1024).toFixed(1)} KB → ${OUT_BIN}`);
  console.log(`  manifest:   ${OUT_MANIFEST}`);
}

main().catch((err) => {
  console.error('build-resources failed:', err);
  process.exit(1);
});
