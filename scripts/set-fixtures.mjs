import { writeFile, readFile } from 'node:fs/promises';
const commit=(process.argv[2]||'').trim().toLowerCase();
if(!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Usage: npm run set:fixtures -- <40-hex-public-git-commit>');
const existing=await readFile(new URL('../runtime-config.js',import.meta.url),'utf8');
const repository=existing.match(/repository:\s*["']([^"']+)/)?.[1]||'kinhdoanhcam-art/LicenseGate';
const out=`// Public commit-pinned reviewer fixtures for LicenseGate V2.1.\nwindow.LICENSEGATE_RUNTIME = {\n  repository: "${repository}",\n  fixtureCommit: "${commit}"\n};\n`;
await writeFile(new URL('../runtime-config.js',import.meta.url),out);
console.log(`PASS fixture commit configured ${commit}`);
