import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const expected='f1cb33f88b6961b322e5203b363de25aee27f4a67d64a93d2afe203c41fce45d';
const source=await readFile(new URL('../contracts/LicenseCompat.py',import.meta.url));
const sha=createHash('sha256').update(source).digest('hex');
if(sha!==expected) throw new Error(`LicenseCompat.py changed: ${sha}`);
console.log(`PASS LicenseCompat.py SHA256 ${sha}`);
