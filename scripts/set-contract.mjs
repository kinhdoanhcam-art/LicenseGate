import { writeFile } from 'node:fs/promises';
const address=(process.argv[2]||'').trim();
if(!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Usage: npm run set:contract -- 0x<40-hex-address>');
const out=`// Fresh StudioNet deployment for LicenseGate.\nwindow.LICENSEGATE_CONFIG = {\n  contractAddress: "${address}"\n};\n`;
await writeFile(new URL('../contract-config.js',import.meta.url),out);
console.log(`PASS contract configured ${address}`);
