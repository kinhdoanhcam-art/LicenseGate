const EXPLORER_BASE = 'https://explorer-studio.genlayer.com/address/';
const SDK = {
  main: 'https://esm.sh/genlayer-js@1.0.0?bundle',
  chains: 'https://esm.sh/genlayer-js@1.0.0/chains?bundle',
  types: 'https://esm.sh/genlayer-js@1.0.0/types?bundle'
};
const EXPECTED_POLICY = "Dependencies must permit commercial use, modification, and redistribution as part of this project without requiring the combined project to disclose its proprietary source code or to be relicensed under the dependency's license.";
const MOCK = new URLSearchParams(location.search).get('mock') === '1';
const STORAGE_KEY = 'licensegate.v2.contractAddress';
const MOCK_WALLETS = [
  '0x3065E31B1D993d7C0D59E6786844cBa56780B2d3',
  '0xdaE8968571C6E84f44F86d06F1071bbc8F807500'
];

let walletAddress = '';
let busy = false;
let notice = '';
let error = '';
let txHash = '';
let sdkCache = null;
let summaryCache = null;

function esc(v = '') {
  return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function short(v = '', a = 8, b = 6) {
  const s = String(v || '');
  return s.length <= a + b + 1 ? s : `${s.slice(0, a)}…${s.slice(-b)}`;
}
function same(a = '', b = '') { return !!(a && b && a.toLowerCase() === b.toLowerCase()); }
function validAddress(v = '') { return /^0x[a-fA-F0-9]{40}$/.test(String(v).trim()); }
function validGit(v = '') { return /^[a-fA-F0-9]{40}$/.test(String(v).trim()); }
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'evaluate') return {page:'evaluate'};
  if (h === 'registry') return {page:'registry'};
  const d = h.match(/^dependency\/(\d+)$/);
  if (d) return {page:'dependency', id:Number(d[1])};
  const e = h.match(/^evaluation\/(\d+)$/);
  if (e) return {page:'evaluation', id:Number(e[1])};
  return {page:'home'};
}
function go(path) { location.hash = path.startsWith('/') ? `#${path}` : `#/${path}`; }
function badge(v) {
  const cls = v === 'COMPATIBLE' ? 'good' : v === 'INCOMPATIBLE' ? 'bad' : 'neutral';
  return `<span class="badge ${cls}">${esc(v || 'NO DECISION')}</span>`;
}
function linkTo(uri, label) {
  if (!uri) return '<span class="muted">—</span>';
  return `<a class="artifact-link mono" href="${esc(uri)}" target="_blank" rel="noreferrer">${esc(label || short(uri, 18, 12))} ↗</a>`;
}
function friendly(err) {
  const raw = String(err?.shortMessage ?? err?.message ?? err ?? 'Unknown error');
  const rb = raw.match(/\[rollback\]\s*(.+)/i);
  const msg = rb ? rb[1] : raw;
  if (/Package name\/version does not match authenticated manifest/i.test(msg)) return 'Authenticated package manifest does not match the declared package name/version.';
  if (rb) return msg;
  if (/Only maintainer/i.test(raw)) return 'Only the contract maintainer can submit package evaluations.';
  if (/Package name\/version does not match authenticated manifest/i.test(raw)) return 'Authenticated package manifest does not match the declared package name/version.';
  if (/License source does not match package manifest/i.test(raw)) return 'The submitted license source is not the license path authenticated by the package manifest.';
  if (/same git commit/i.test(raw)) return 'Package manifest and license source must use the same immutable Git commit.';
  if (/same GitHub repository/i.test(raw)) return 'Package manifest and license source must come from the same GitHub repository.';
  if (/artifact could not be fetched/i.test(raw)) return raw.replace(/^Error:\s*/, '');
  if (/already evaluated/i.test(raw)) return 'That package name + version already has a finalized verdict.';
  if (/user rejected|rejected the request|action_rejected/i.test(raw)) return 'Wallet signature was rejected.';
  if (/failed to fetch|network|rpc|blocked|429/i.test(raw)) return `Network/RPC error: ${raw}`;
  return raw.replace(/^Error:\s*/, '');
}
function parseResult(raw) {
  let v = raw;
  if (v && typeof v === 'object' && typeof v.result === 'string') v = v.result;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) throw new Error('Contract returned an empty response');
    try { v = JSON.parse(t); } catch {}
  }
  return v;
}
function parseObject(raw, label) {
  const v = parseResult(raw);
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Unexpected ${label} response`);
  return v;
}
function configuredAddress() {
  if (MOCK) return '0x1111111111111111111111111111111111111111';
  const q = new URLSearchParams(location.search).get('contract');
  if (validAddress(q)) { localStorage.setItem(STORAGE_KEY, q); return q; }
  const hard = window.LICENSEGATE_CONFIG?.contractAddress || '';
  if (validAddress(hard)) return hard;
  const stored = localStorage.getItem(STORAGE_KEY) || '';
  return validAddress(stored) ? stored : '';
}
function saveAddress(v) {
  const a = String(v || '').trim();
  if (!validAddress(a)) throw new Error('Enter a valid 0x contract address.');
  localStorage.setItem(STORAGE_KEY, a);
  summaryCache = null;
  notice = `Using contract ${short(a)}`;
  error = '';
  render();
}
function clearAddress() {
  localStorage.removeItem(STORAGE_KEY);
  summaryCache = null;
  notice = 'Saved contract address cleared.';
  render();
}
function runtimeConfig() {
  if (MOCK) return {repository:'kinhdoanhcam-art/LicenseGate', fixtureCommit:'1111111111111111111111111111111111111111'};
  const repository = String(window.LICENSEGATE_RUNTIME?.repository || '').trim();
  const fixtureCommit = String(window.LICENSEGATE_RUNTIME?.fixtureCommit || '').trim().toLowerCase();
  return {repository, fixtureCommit};
}
function fixtureReady() {
  const {repository, fixtureCommit} = runtimeConfig();
  return /^[^/]+\/[^/]+$/.test(repository) && validGit(fixtureCommit);
}
function artifactUrl(path) {
  const {repository, fixtureCommit} = runtimeConfig();
  return fixtureReady() ? `https://github.com/${repository}/blob/${fixtureCommit}/${path}` : '';
}
function preset(id) {
  const {fixtureCommit} = runtimeConfig();
  const common = {packageDigest:fixtureCommit, licenseDigest:fixtureCommit};
  const presets = {
    ui: {
      ...common,
      name:'PermissiveUI', version:'1.4.2',
      packageUri:artifactUrl('fixtures/packages/permissive-ui.json'),
      licenseUri:artifactUrl('fixtures/licenses/permissive.txt')
    },
    charts: {
      ...common,
      name:'PermissiveCharts', version:'2.0.0',
      packageUri:artifactUrl('fixtures/packages/permissive-charts.json'),
      licenseUri:artifactUrl('fixtures/licenses/permissive.txt')
    },
    copyleft: {
      ...common,
      name:'CopyleftCore', version:'3.1.0',
      packageUri:artifactUrl('fixtures/packages/copyleft-core.json'),
      licenseUri:artifactUrl('fixtures/licenses/copyleft.txt')
    },
    mismatch: {
      ...common,
      name:'PermissiveUI', version:'9.9.9',
      packageUri:artifactUrl('fixtures/packages/permissive-ui.json'),
      licenseUri:artifactUrl('fixtures/licenses/permissive.txt')
    }
  };
  return presets[id];
}

const mockState = {
  wallet:0,
  summary:{evaluation_count:0, dependency_count:0, last_decision:'', last_package_name:'', last_package_version:'', last_evaluation_id:0},
  evaluations:new Map(),
  dependencies:new Map(),
  packageKeys:new Set(),
  tx:1
};
function mockHash() { return '0x' + String(mockState.tx++).padStart(64, '0'); }
function mockPackageKey(name, version) { return `${String(name).toLowerCase()}@${version}`; }
function mockManifestExpected(uri) {
  if (/permissive-ui\.json/i.test(uri)) return {name:'PermissiveUI', version:'1.4.2', license:'fixtures/licenses/permissive.txt'};
  if (/permissive-charts\.json/i.test(uri)) return {name:'PermissiveCharts', version:'2.0.0', license:'fixtures/licenses/permissive.txt'};
  if (/copyleft-core\.json/i.test(uri)) return {name:'CopyleftCore', version:'3.1.0', license:'fixtures/licenses/copyleft.txt'};
  return null;
}
function makeMockClient() {
  return {
    async readContract({functionName,args=[]}) {
      if (functionName === 'get_summary') return JSON.stringify(mockState.summary);
      if (functionName === 'get_config') return JSON.stringify({maintainer:MOCK_WALLETS[0], compatibility_policy:EXPECTED_POLICY});
      if (functionName === 'get_evaluation') {
        const e = mockState.evaluations.get(Number(args[0]));
        if (!e) throw new Error('[rollback] Evaluation not found');
        return JSON.stringify(e);
      }
      if (functionName === 'get_dependency') {
        const e = mockState.dependencies.get(Number(args[0]));
        if (!e) throw new Error('[rollback] Dependency not found');
        return JSON.stringify(e);
      }
      throw new Error(`Unknown read ${functionName}`);
    },
    async writeContract({functionName,args=[]}) {
      if (functionName !== 'evaluate_dependency') throw new Error(`Unknown write ${functionName}`);
      if (mockState.wallet !== 0) throw new Error('[rollback] Only maintainer');
      const [name,version,packageUri,packageDigest,licenseUri,licenseDigest] = args.map(String);
      if (packageDigest !== licenseDigest) throw new Error('[rollback] Package and license artifacts must use the same git commit');
      const expected = mockManifestExpected(packageUri);
      if (!expected) throw new Error('[rollback] Package artifact could not be fetched');
      if (expected.name !== name || expected.version !== version) throw new Error('[rollback] Package name/version does not match authenticated manifest');
      if (!licenseUri.includes(expected.license)) throw new Error('[rollback] License source does not match package manifest');
      const key = mockPackageKey(name, version);
      if (mockState.packageKeys.has(key)) throw new Error('[rollback] Package version already evaluated');
      mockState.packageKeys.add(key);
      const decision = /copyleft/i.test(licenseUri) ? 'INCOMPATIBLE' : 'COMPATIBLE';
      const evaluation_id = ++mockState.summary.evaluation_count;
      const record = {evaluation_id, package_name:name, package_version:version, package_key:key, package_uri:packageUri, package_digest:packageDigest, license_uri:licenseUri, license_digest:licenseDigest, decision, admitted:decision==='COMPATIBLE'};
      mockState.evaluations.set(evaluation_id, record);
      mockState.summary.last_decision = decision;
      mockState.summary.last_package_name = name;
      mockState.summary.last_package_version = version;
      mockState.summary.last_evaluation_id = evaluation_id;
      if (decision === 'COMPATIBLE') {
        const id = ++mockState.summary.dependency_count;
        mockState.dependencies.set(id, record);
      }
      return mockHash();
    },
    async waitForTransactionReceipt() { return {status:'FINALIZED', txExecutionResultName:'FINISHED_WITH_RETURN'}; },
    async connect() { return true; }
  };
}
async function sdk() {
  if (MOCK) return null;
  if (!sdkCache) sdkCache = Promise.all([import(SDK.main), import(SDK.chains), import(SDK.types)]).then(([main,chains,types]) => ({main,chains,types}));
  return sdkCache;
}
async function readClient() {
  if (MOCK) return makeMockClient();
  const address = configuredAddress();
  if (!address) throw new Error('Configure the fresh LicenseGate V2.1 StudioNet contract address first.');
  const {main} = await sdk();
  return main.createClient({endpoint:`${location.origin}/api/rpc`});
}
async function walletClient() {
  if (MOCK) {
    walletAddress = MOCK_WALLETS[mockState.wallet];
    return {client:makeMockClient(), account:walletAddress};
  }
  if (!window.ethereum) throw new Error('MetaMask was not detected.');
  const accounts = await window.ethereum.request({method:'eth_requestAccounts'});
  const account = accounts?.[0];
  if (!account) throw new Error('No wallet account selected.');
  const {main,chains} = await sdk();
  const client = main.createClient({chain:chains.studionet, account, provider:window.ethereum});
  await client.connect('studionet');
  walletAddress = account;
  return {client,account};
}
function executionFailed(r) {
  const n = r?.txExecutionResultName ?? r?.tx_execution_result_name ?? r?.executionResultName ?? r?.execution_result_name ?? '';
  return n === 'FINISHED_WITH_ERROR' || n === 'ERROR';
}
async function waitFinalized(hash) {
  const c = await readClient();
  let last;
  for (let i=1;i<=45;i++) {
    try {
      const opt = {hash,status:'FINALIZED',fullTransaction:true,interval:10000,retries:1};
      if (!MOCK) { const {types} = await sdk(); opt.status = types.TransactionStatus?.FINALIZED ?? 'FINALIZED'; }
      const r = await c.waitForTransactionReceipt(opt);
      if (executionFailed(r)) throw new Error(`Contract reverted (${r.txExecutionResultName || 'FINISHED_WITH_ERROR'})`);
      return r;
    } catch (e) {
      last = e;
      const m = String(e?.message ?? e).toLowerCase();
      const transient = /429|rate limit|failed to fetch|timeout|pending/.test(m);
      if (!transient && i >= 3) throw e;
      await new Promise(r => setTimeout(r, Math.min(3000 + i*1000, 12000)));
    }
  }
  throw new Error(`Finalization timeout: ${friendly(last)}`);
}
async function submitWrite(functionName,args,progress) {
  const address = configuredAddress() || '0x0000000000000000000000000000000000000001';
  const {client} = await walletClient();
  busy = true; error = ''; notice = progress; txHash = ''; render();
  try {
    const hash = await client.writeContract({address,functionName,args,value:0n});
    txHash = hash; notice = `Submitted ${short(hash)}. Waiting for FINALIZED…`; render();
    await waitFinalized(hash);
    notice = 'Transaction finalized. Refreshing authenticated on-chain state…';
    return hash;
  } catch (e) {
    error = friendly(e); notice = ''; busy = false; await render(); throw e;
  } finally { busy = false; }
}
async function loadSummary() {
  const c = await readClient();
  summaryCache = parseObject(await c.readContract({address:configuredAddress() || '0x0000000000000000000000000000000000000001', functionName:'get_summary', args:[]}), 'get_summary');
  return summaryCache;
}
async function loadConfig() {
  const c = await readClient();
  return parseObject(await c.readContract({address:configuredAddress() || '0x0000000000000000000000000000000000000001', functionName:'get_config', args:[]}), 'get_config');
}
async function loadEvaluation(id) {
  const c = await readClient();
  return parseObject(await c.readContract({address:configuredAddress() || '0x0000000000000000000000000000000000000001', functionName:'get_evaluation', args:[Number(id)]}), 'get_evaluation');
}
async function loadDependency(id) {
  const c = await readClient();
  return parseObject(await c.readContract({address:configuredAddress() || '0x0000000000000000000000000000000000000001', functionName:'get_dependency', args:[Number(id)]}), 'get_dependency');
}

function shell(content) {
  const contract = configuredAddress();
  return `${MOCK ? `<div class="mockbar">LOCAL MOCK MODE · Wallet <select id="mock-wallet"><option value="0">Maintainer</option><option value="1">Reader</option></select></div>` : ''}
  <header class="header"><div class="container header-inner">
    <button class="brand link-btn" data-nav="/"><span class="brand-mark">§</span><span><div class="brand-name">LicenseGate</div><div class="brand-sub">artifact-bound license admission</div></span></button>
    <nav class="nav"><button data-nav="/">Overview</button><button data-nav="/evaluate">Evaluate</button><button data-nav="/registry">Registry</button></nav>
    <button id="wallet" class="wallet-btn">◈ ${esc(walletAddress ? short(walletAddress) : 'Connect wallet')}</button>
  </div></header>
  ${(notice || error) ? `<div class="container notice-wrap">${notice ? `<div class="notice">${esc(notice)}${txHash ? ` <span class="mono">${esc(short(txHash))}</span>` : ''}</div>` : ''}${error ? `<div class="error">${esc(error)}</div>` : ''}</div>` : ''}
  ${content}
  <footer class="footer"><div class="container footer-inner"><div>Authenticated package + license evidence first. Semantic compatibility second. Admission remains deterministic.</div>${contract ? `<a class="mono" target="_blank" rel="noreferrer" href="${EXPLORER_BASE}${contract}">${short(contract)} ↗</a>` : '<span class="mono">fresh V2 contract not configured</span>'}</div></footer>`;
}
function setupCard() {
  const c = configuredAddress();
  return `<div class="panel panel-pad setup"><div class="eyebrow">V2 protocol connection</div><div class="panel-title"><h2>${c ? 'Fresh V2 contract configured' : 'Add fresh V2 deployment'}</h2>${c ? '<span class="status-dot live">LIVE</span>' : '<span class="status-dot">SETUP</span>'}</div><p class="muted small">${c ? 'Reads and writes use this artifact-bound StudioNet contract.' : 'Deploy contracts/LicenseCompat.py as a new contract, then paste the address here for runtime testing.'}</p><div class="lookup-row"><input id="contract-address" class="field mono" placeholder="0x..." value="${esc(c)}"/><button id="save-contract" class="btn-primary">Use contract</button></div>${c ? `<div class="contract-actions"><a class="btn-secondary" target="_blank" href="${EXPLORER_BASE}${c}">Explorer ↗</a><button id="clear-contract" class="btn-ghost">Change address</button></div>` : ''}</div>`;
}
function policyCard() {
  return `<div class="panel panel-pad"><div class="eyebrow">Immutable deployment baseline</div><h2>Compatibility policy</h2><div class="policy-box">${esc(EXPECTED_POLICY)}</div><p class="muted small">Validators receive this fixed policy only after the package manifest authenticates package identity and its license source.</p></div>`;
}
function fixtureCard() {
  const {repository,fixtureCommit} = runtimeConfig();
  const ready = fixtureReady();
  return `<div class="panel panel-pad"><div class="eyebrow">Reviewer fixtures</div><div class="panel-title"><h2>${ready ? 'Commit-pinned fixtures ready' : 'Pin fixtures before runtime'}</h2>${ready ? '<span class="status-dot live">PINNED</span>' : '<span class="status-dot">TODO</span>'}</div><p class="muted small">Repository <span class="mono">${esc(repository || 'not configured')}</span></p><div class="policy-box mono">${ready ? esc(fixtureCommit) : 'Run npm run set:fixtures -- <40-hex-public-commit>'}</div><p class="muted small">Two different package manifests intentionally point to the same permissive license file. This directly tests the steward-requested package-identity registry key.</p></div>`;
}
async function home() {
  let summary = summaryCache;
  let config = null;
  const contract = configuredAddress();
  if (contract) {
    try { [summary,config] = await Promise.all([loadSummary(),loadConfig()]); error = ''; } catch (e) { if (!error) error = friendly(e); }
  }
  const last = summary?.last_package_name ? `${summary.last_package_name}@${summary.last_package_version}` : 'No evaluation yet';
  return shell(`<main>
    <section class="container hero"><div><div class="eyebrow">AUTHENTICATED PACKAGE LICENSE GATE</div><h1>Verify the package.<br/><span class="gradient-text">Then judge the license.</span></h1><p class="hero-copy">LicenseGate V2.1 binds every verdict to a commit-pinned package version and its authenticated license source. GenLayer validators judge only the fetched license artifact; the contract keys registry state by package identity.</p><div class="actions"><button class="btn-primary" data-nav="/evaluate">Run authenticated evaluation →</button><button class="btn-secondary" data-nav="/registry">Browse evidence</button></div></div>
    <div class="panel panel-pad hero-panel"><div class="eyebrow">LIVE V2 STATE</div><div class="panel-title"><h2>Package admission gate</h2><span class="shield">◈</span></div><div class="metrics three"><div class="metric soft"><div class="metric-label">EVALUATED</div><div class="metric-value">${summary?.evaluation_count ?? '—'}</div></div><div class="metric soft"><div class="metric-label">ADMITTED</div><div class="metric-value">${summary?.dependency_count ?? '—'}</div></div><div class="metric soft"><div class="metric-label">LAST VERDICT</div><div class="metric-value compact">${summary?.last_decision ? badge(summary.last_decision) : '—'}</div></div></div><div class="last-name"><span class="metric-label">LAST PACKAGE</span><strong>${esc(last)}</strong></div></div></section>
    <section class="container two-col">${setupCard()}${fixtureCard()}</section>
    <section class="container two-col">${policyCard()}<div class="panel panel-pad"><div class="eyebrow">Trust boundary</div><h2>What V2 authenticates</h2><div class="evidence-stack"><div><b>1</b><span>Package manifest is fetched from an immutable Git commit.</span></div><div><b>2</b><span>Manifest name/version must equal the submitted package identity.</span></div><div><b>3</b><span>Manifest license_path must equal the submitted license source path in the same repo + commit.</span></div><div><b>4</b><span>Only then does GenLayer classify the fetched license against policy.</span></div></div>${config ? `<p class="muted small">Maintainer: <span class="mono">${esc(short(config.maintainer,10,8))}</span></p>` : ''}</div></section>
    <section class="container features"><div class="panel feature"><div class="feature-icon">1</div><h3>Authenticated version</h3><p>Name and version are verified against the fetched package manifest, not maintainer prose.</p></div><div class="panel feature"><div class="feature-icon">2</div><h3>Authenticated license</h3><p>The manifest binds the exact license path inside the same repository snapshot.</p></div><div class="panel feature"><div class="feature-icon">3</div><h3>Package-keyed registry</h3><p>Different packages can share one license source and still become distinct records.</p></div></section>
  </main>`);
}
function evaluatePage() {
  const connected = !!configuredAddress();
  const fixtures = fixtureReady();
  return shell(`<main class="container page"><button class="page-back" data-nav="/">← Overview</button><div class="page-head"><div><div class="eyebrow">MAINTAINER · ARTIFACT-BOUND WRITE</div><h1>Evaluate authenticated package evidence</h1><p class="muted">Submit a commit-pinned package manifest and the license source it authenticates. No pasted license text is accepted by V2.</p></div>${connected ? badge(summaryCache?.last_decision || '') : '<span class="badge neutral">NO CONTRACT</span>'}</div>
    <div class="preset-bar"><span>Reviewer presets</span><button type="button" class="btn-secondary preset" data-preset="ui" ${fixtures?'':'disabled'}>Package A · permissive</button><button type="button" class="btn-secondary preset" data-preset="charts" ${fixtures?'':'disabled'}>Package B · same license</button><button type="button" class="btn-secondary preset" data-preset="copyleft" ${fixtures?'':'disabled'}>Copyleft</button><button type="button" class="btn-secondary preset" data-preset="mismatch" ${fixtures?'':'disabled'}>Version mismatch</button></div>
    ${!fixtures ? `<div class="instruction-card">Reviewer fixtures are not pinned yet. You can enter artifact fields manually, or configure a public 40-hex fixture commit before runtime testing.</div>` : ''}
    <div class="evaluate-grid"><div class="panel form-panel"><form id="evaluate-form">
      <div class="field-pair"><div><label class="label" for="pkg-name">Package name</label><input id="pkg-name" class="field" maxlength="120" placeholder="PermissiveUI" required/></div><div><label class="label" for="pkg-version">Package version</label><input id="pkg-version" class="field mono" maxlength="80" placeholder="1.4.2" required/></div></div>
      <div class="form-row"><label class="label" for="pkg-uri">Commit-pinned package manifest URL</label><input id="pkg-uri" class="field mono" maxlength="700" placeholder="https://github.com/.../blob/<commit>/fixtures/packages/package.json" required/></div>
      <div class="form-row"><label class="label" for="pkg-digest">Package Git object ID</label><input id="pkg-digest" class="field mono" maxlength="40" minlength="40" placeholder="40-hex commit" required/></div>
      <div class="form-row"><label class="label" for="license-uri">Commit-pinned license source URL</label><input id="license-uri" class="field mono" maxlength="700" placeholder="https://github.com/.../blob/<same-commit>/fixtures/licenses/LICENSE.txt" required/></div>
      <div class="form-row"><label class="label" for="license-digest">License Git object ID</label><input id="license-digest" class="field mono" maxlength="40" minlength="40" placeholder="same 40-hex commit" required/></div>
      <button class="btn-primary full" ${(!connected || busy) ? 'disabled' : ''}>✦ Authenticate evidence & run consensus</button>
    </form><div class="role-warning">Only the contract maintainer can submit evaluations. Reads and evidence browsing are public.</div></div>${policyCard()}</div>
  </main>`);
}
function evaluationCard(e) {
  return `<article class="panel dep-card evaluation-card"><div class="card-top"><div><div class="dep-id">EVALUATION #${e.evaluation_id}</div><h3>${esc(e.package_name)} <span class="version-tag">${esc(e.package_version)}</span></h3></div>${badge(e.decision)}</div><div class="artifact-mini"><span>PACKAGE</span>${linkTo(e.package_uri, short(e.package_digest,10,8))}</div><div class="artifact-mini"><span>LICENSE</span>${linkTo(e.license_uri, short(e.license_digest,10,8))}</div><div class="admission-line ${e.admitted ? 'admitted' : 'blocked'}">${e.admitted ? 'ADMITTED TO COMPATIBLE REGISTRY' : 'NOT ADMITTED'}</div><button class="btn-secondary" data-nav="/evaluation/${e.evaluation_id}">Open evidence record →</button></article>`;
}
async function registryPage() {
  let summary = summaryCache;
  const deps = [];
  const evals = [];
  if (configuredAddress()) {
    try {
      summary = await loadSummary();
      for (let id = summary.dependency_count; id >= Math.max(1, summary.dependency_count - 19); id--) {
        try { deps.push({id, ...(await loadDependency(id))}); } catch {}
      }
      for (let id = summary.evaluation_count; id >= Math.max(1, summary.evaluation_count - 19); id--) {
        try { evals.push(await loadEvaluation(id)); } catch {}
      }
    } catch (e) { error = friendly(e); }
  }
  const depCards = deps.length ? deps.map(d => `<article class="panel dep-card"><div class="card-top"><div><div class="dep-id">ADMITTED #${d.id}</div><h3>${esc(d.package_name)} <span class="version-tag">${esc(d.package_version)}</span></h3></div>${badge(d.decision)}</div><p class="package-key mono">package key ${esc(short(d.package_key,12,10))}</p><div class="artifact-mini"><span>PACKAGE</span>${linkTo(d.package_uri, short(d.package_digest,10,8))}</div><div class="artifact-mini"><span>LICENSE</span>${linkTo(d.license_uri, short(d.license_digest,10,8))}</div><button class="btn-secondary" data-nav="/dependency/${d.id}">Open admitted record →</button></article>`).join('') : '<div class="panel empty">No compatible package version has entered the registry yet.</div>';
  const evalCards = evals.length ? evals.map(evaluationCard).join('') : '<div class="panel empty">No authenticated package evaluation has finalized yet.</div>';
  return shell(`<main class="container page"><div class="page-head"><div><div class="eyebrow">AUTHORITATIVE ON-CHAIN STATE</div><h1>Package registry & verdict history</h1><p class="muted">Every verdict retains its authenticated package/version and license artifacts. Only COMPATIBLE verdicts enter the admitted registry.</p></div><div class="stat-pair"><div class="stat-pill"><span>Evaluated</span><strong>${summary?.evaluation_count ?? '—'}</strong></div><div class="stat-pill"><span>Admitted</span><strong>${summary?.dependency_count ?? '—'}</strong></div></div></div><div class="section-title"><div><div class="eyebrow">PACKAGE-KEYED REGISTRY</div><h2>Compatible package versions</h2></div></div><div class="registry-grid">${depCards}</div><div class="section-title spaced"><div><div class="eyebrow">VERDICT EVIDENCE</div><h2>Recent authenticated evaluations</h2></div></div><div class="registry-grid">${evalCards}</div></main>`);
}
function evidenceRecord(e, eyebrow) {
  return `<div class="panel record"><div class="card-top"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(e.package_name)} <span class="version-tag big">${esc(e.package_version)}</span></h1></div>${badge(e.decision)}</div><div class="evidence-grid"><div><span>Package identity key</span><strong class="mono">${esc(e.package_key)}</strong></div><div><span>Admitted</span><strong>${e.admitted ? 'YES' : 'NO'}</strong></div><div><span>Package manifest</span>${linkTo(e.package_uri, e.package_uri)}</div><div><span>Package commit</span><strong class="mono">${esc(e.package_digest)}</strong></div><div><span>License source</span>${linkTo(e.license_uri, e.license_uri)}</div><div><span>License commit</span><strong class="mono">${esc(e.license_digest)}</strong></div></div><div class="record-note">This verdict is bound to the authenticated package name/version and the exact license source shown above. The package and license use the same repository snapshot.</div></div>`;
}
async function dependencyPage(id) {
  let d;
  try { d = await loadDependency(id); } catch (e) { return shell(`<main class="container page"><button class="page-back" data-nav="/registry">← Registry</button><div class="panel empty">${esc(friendly(e))}</div></main>`); }
  return shell(`<main class="container page narrow"><button class="page-back" data-nav="/registry">← Registry</button>${evidenceRecord(d, `ADMITTED DEPENDENCY #${id}`)}</main>`);
}
async function evaluationPage(id) {
  let e;
  try { e = await loadEvaluation(id); } catch (err) { return shell(`<main class="container page"><button class="page-back" data-nav="/registry">← Registry</button><div class="panel empty">${esc(friendly(err))}</div></main>`); }
  return shell(`<main class="container page narrow"><button class="page-back" data-nav="/registry">← Registry</button>${evidenceRecord(e, `EVALUATION #${id}`)}</main>`);
}
async function render() {
  const r = route();
  let html;
  if (r.page === 'evaluate') html = evaluatePage();
  else if (r.page === 'registry') html = await registryPage();
  else if (r.page === 'dependency') html = await dependencyPage(r.id);
  else if (r.page === 'evaluation') html = await evaluationPage(r.id);
  else html = await home();
  document.getElementById('app').innerHTML = html;
  bind();
}
function fillPreset(id) {
  const p = preset(id);
  if (!p || !p.packageUri) return;
  document.getElementById('pkg-name').value = p.name;
  document.getElementById('pkg-version').value = p.version;
  document.getElementById('pkg-uri').value = p.packageUri;
  document.getElementById('pkg-digest').value = p.packageDigest;
  document.getElementById('license-uri').value = p.licenseUri;
  document.getElementById('license-digest').value = p.licenseDigest;
  notice = id === 'mismatch' ? 'Loaded negative control: declared version intentionally mismatches authenticated manifest.' : `Loaded ${p.name}@${p.version} authenticated fixture.`;
  error = '';
  document.querySelector('.notice-wrap')?.remove();
}
function bind() {
  document.querySelectorAll('[data-nav]').forEach(el => el.onclick = () => go(el.dataset.nav));
  document.querySelectorAll('[data-copy]').forEach(el => el.onclick = async () => { try { await navigator.clipboard.writeText(el.dataset.copy); notice = 'Copied to clipboard.'; render(); } catch {} });
  document.querySelectorAll('[data-preset]').forEach(el => el.onclick = () => { fillPreset(el.dataset.preset); render(); setTimeout(() => fillPreset(el.dataset.preset), 0); });
  const wallet = document.getElementById('wallet');
  if (wallet) wallet.onclick = async () => { error=''; try { const {account} = await walletClient(); notice = `Wallet connected: ${short(account)}`; } catch (e) { error = friendly(e); } render(); };
  const sel = document.getElementById('mock-wallet');
  if (sel) { sel.value = String(mockState.wallet); sel.onchange = () => { mockState.wallet = Number(sel.value); walletAddress = MOCK_WALLETS[mockState.wallet]; notice = `Mock wallet switched: ${short(walletAddress)}`; render(); }; }
  const ca = document.getElementById('contract-address');
  const sc = document.getElementById('save-contract');
  if (sc) sc.onclick = () => { try { saveAddress(ca.value); } catch (e) { error = friendly(e); render(); } };
  const cc = document.getElementById('clear-contract');
  if (cc) cc.onclick = clearAddress;
  const form = document.getElementById('evaluate-form');
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const name = document.getElementById('pkg-name').value.trim();
    const version = document.getElementById('pkg-version').value.trim();
    const packageUri = document.getElementById('pkg-uri').value.trim();
    const packageDigest = document.getElementById('pkg-digest').value.trim().toLowerCase();
    const licenseUri = document.getElementById('license-uri').value.trim();
    const licenseDigest = document.getElementById('license-digest').value.trim().toLowerCase();
    if (!name || !version || !packageUri || !packageDigest || !licenseUri || !licenseDigest) return;
    if (!validGit(packageDigest) || !validGit(licenseDigest)) { error = 'Both Git object IDs must be exactly 40 hexadecimal characters.'; render(); return; }
    try {
      const before = await loadSummary();
      await submitWrite('evaluate_dependency', [name,version,packageUri,packageDigest,licenseUri,licenseDigest], 'Authenticating package/version + license source, then requesting GenLayer consensus…');
      txHash = '';
      const after = await loadSummary();
      const evaluated = Number(after.evaluation_count) > Number(before.evaluation_count);
      const admitted = Number(after.dependency_count) > Number(before.dependency_count);
      notice = evaluated ? `${after.last_decision}: ${name}@${version} finalized as evaluation #${after.last_evaluation_id}${admitted ? ' and entered the compatible registry.' : '; registry count did not increase.'}` : 'Finalized without a new evaluation record.';
      await render();
    } catch {} finally { busy = false; }
  };
}
async function init() {
  if (MOCK) {
    document.documentElement.classList.add('mock');
    walletAddress = MOCK_WALLETS[0];
    summaryCache = mockState.summary;
  } else if (window.ethereum) {
    window.ethereum.on?.('accountsChanged', a => { walletAddress = a?.[0] || ''; txHash=''; notice=''; render(); });
    window.ethereum.on?.('chainChanged', () => location.reload());
    window.ethereum.request({method:'eth_accounts'}).then(a => { walletAddress = a?.[0] || ''; render(); }).catch(() => {});
  }
  window.addEventListener('hashchange', () => { notice=''; error=''; txHash=''; render(); });
  await render();
}
init();
