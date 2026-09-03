import { readFile, writeFile, mkdir, rm, copyFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dist=new URL('../dist/',import.meta.url);
const EXPECTED_SHA='56ea2f3d016804aa9bdd7470ac46614553cf04cfe91f2fa9c1aab3faae4bdaa0';
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const f of ['index.html','app.css','app.js','contract-config.js','runtime-config.js']) {
  await copyFile(new URL(`../${f}`,import.meta.url),new URL(`../dist/${f}`,import.meta.url));
}
await cp(new URL('../fixtures/',import.meta.url),new URL('../dist/fixtures/',import.meta.url),{recursive:true});
const source=await readFile(new URL('../contracts/LicenseCompat.py',import.meta.url));
const sha=createHash('sha256').update(source).digest('hex');
if(sha!==EXPECTED_SHA) throw new Error(`Contract source changed: ${sha}`);
const cfg=await readFile(new URL('../contract-config.js',import.meta.url),'utf8');
const address=cfg.match(/contractAddress:\s*["']([^"']*)/)?.[1]||'';
if(address && !/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error(`Invalid configured contract address: ${address}`);
const runtime=await readFile(new URL('../runtime-config.js',import.meta.url),'utf8');
const fixtureCommit=runtime.match(/fixtureCommit:\s*["']([^"']*)/)?.[1]||'';
if(fixtureCommit && !/^[a-fA-F0-9]{40}$/.test(fixtureCommit)) throw new Error(`Invalid fixture commit: ${fixtureCommit}`);
const manifest={name:'LicenseGate V2.1',network:'GenLayer StudioNet',contract:address||null,contract_source_sha256:sha,fixture_commit:fixtureCommit||null,built_at:new Date().toISOString()};
await writeFile(new URL('../dist/build-manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log('PASS static production build');
console.log(address?`PASS contract ${address}`:'PASS contract intentionally unset for fresh deployment candidate');
console.log(fixtureCommit?`PASS fixture commit ${fixtureCommit}`:'PASS fixture commit intentionally unset until public Git commit exists');
console.log(`PASS V2.1 source SHA ${sha}`);
