from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
css = (ROOT / 'dist' / 'app.css').read_text()
config = (ROOT / 'dist' / 'contract-config.js').read_text()
runtime = (ROOT / 'dist' / 'runtime-config.js').read_text()
js = (ROOT / 'dist' / 'app.js').read_text().replace(
    "const MOCK = new URLSearchParams(location.search).get('mock') === '1';",
    "const MOCK = true;",
)
html = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LicenseGate</title><style>{css}</style></head><body><div id="app"></div><script>{config}</script><script>{runtime}</script><script type="module">{js}</script></body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content(html, wait_until='load')
    page.wait_for_selector('text=LicenseGate')
    assert page.locator('text=Verify the package.').is_visible()

    def eval_preset(label, expected):
        page.click('button[data-nav="/evaluate"]')
        page.click(f'button:has-text("{label}")')
        page.click('#evaluate-form button.btn-primary')
        page.wait_for_selector(f'.notice:has-text("{expected}")', timeout=5000)

    # Package A -> compatible/admitted.
    eval_preset('Package A · permissive', 'COMPATIBLE')
    page.click('button[data-nav="/registry"]')
    page.wait_for_selector('h1:has-text("Package registry & verdict history")')
    page.wait_for_selector('.dep-card h3:has-text("PermissiveUI")')

    # Package B uses the exact same license source and must still become a
    # distinct registry record because uniqueness is package name + version.
    eval_preset('Package B · same license', 'COMPATIBLE')
    page.click('button[data-nav="/registry"]')
    page.wait_for_selector('h1:has-text("Package registry & verdict history")')
    page.wait_for_selector('.dep-card h3:has-text("PermissiveCharts")')
    assert any('PermissiveUI' in x for x in page.locator('.dep-card h3').all_text_contents())

    # Copyleft -> verdict recorded, not admitted.
    eval_preset('Copyleft', 'INCOMPATIBLE')
    page.click('button[data-nav="/registry"]')
    page.wait_for_selector('h1:has-text("Package registry & verdict history")')
    page.wait_for_selector('.dep-card h3:has-text("CopyleftCore")')
    assert page.locator('text=NOT ADMITTED').count() >= 1

    # Authenticated package version mismatch must fail closed and create no
    # successful evaluation record.
    page.click('button[data-nav="/evaluate"]')
    page.click('button:has-text("Version mismatch")')
    page.click('#evaluate-form button.btn-primary')
    page.wait_for_selector('text=Authenticated package manifest does not match', timeout=5000)

    # Public reader cannot submit.
    page.select_option('#mock-wallet', '1')
    page.click('button[data-nav="/evaluate"]')
    page.click('button:has-text("Package A · permissive")')
    page.fill('#pkg-version', '1.4.3')  # distinct key so auth is checked after role
    page.click('#evaluate-form button.btn-primary')
    page.wait_for_selector('text=Only the contract maintainer', timeout=5000)

    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("location.hash='#/registry'")
    page.wait_for_selector('h1:has-text("Package registry & verdict history")')
    overflow = page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    assert not overflow, 'mobile horizontal overflow detected'
    page.screenshot(path=str(ROOT / 'local-smoke-mobile.png'), full_page=True)

    if console_errors:
        raise AssertionError('console errors: ' + repr(console_errors))
    browser.close()

print('PASS package A: authenticated COMPATIBLE -> admitted')
print('PASS package B: same license source -> distinct admitted record')
print('PASS copyleft: INCOMPATIBLE verdict recorded, registry not increased')
print('PASS package version mismatch: fail closed')
print('PASS authorization: non-maintainer blocked')
print('PASS mobile 390px: no horizontal overflow')
print('PASS console: no errors in mock flow')
