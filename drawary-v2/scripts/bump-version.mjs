/**
 * Sets the app's version name in the three places it lives (package.json, package-lock.json, android/app/build.gradle.kts).
 * Usage (from drawary-v2/):  node scripts/bump-version.mjs 0.1.1
 * Rule: middle number = a new feature, last number = a bug fix or small change, first number = a major release.
 * versionCode (the Play upload number) is separate: it is typed into the release workflow / its push fallback.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next ?? '')) {
  console.error('Give the new version as x.y.z, for example: node scripts/bump-version.mjs 0.1.1');
  process.exit(1);
}
const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

const pkgPath = path('package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const previous = pkg.version;
pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const lockPath = path('package-lock.json');
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
lock.version = next;
if (lock.packages?.['']) lock.packages[''].version = next;
writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

const gradlePath = path('android/app/build.gradle.kts');
const gradle = readFileSync(gradlePath, 'utf8');
if (!/versionName = "[^"]*"/.test(gradle)) throw new Error('versionName not found in build.gradle.kts');
writeFileSync(gradlePath, gradle.replace(/versionName = "[^"]*"/, `versionName = "${next}"`));

console.log(`Version name ${previous} -> ${next} (package.json, package-lock.json, build.gradle.kts)`);
