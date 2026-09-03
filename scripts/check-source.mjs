import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const expected='56ea2f3d016804aa9bdd7470ac46614553cf04cfe91f2fa9c1aab3faae4bdaa0';
const source=await readFile(new URL('../contracts/LicenseCompat.py',import.meta.url));
const actual=createHash('sha256').update(source).digest('hex');
if(actual!==expected) throw new Error(`LicenseCompat.py changed: ${actual}`);
console.log(`PASS LicenseCompat.py V2.1 SHA256 ${actual}`);
