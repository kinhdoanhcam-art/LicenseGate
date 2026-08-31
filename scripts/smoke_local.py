from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
css=(ROOT/'dist'/'app.css').read_text()
config=(ROOT/'dist'/'contract-config.js').read_text()
js=(ROOT/'dist'/'app.js').read_text().replace("const MOCK=new URLSearchParams(location.search).get('mock')==='1';","const MOCK=true;")
html=f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LicenseGate</title><style>{css}</style></head><body><div id="app"></div><script>{config}</script><script type="module">{js}</script></body></html>'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    console_errors=[]
    page.on('console',lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
    page.set_content(html,wait_until='load')
    page.wait_for_selector('text=LicenseGate')
    assert page.title()=='LicenseGate'
    assert page.locator('text=Keep policy intact.').is_visible()
    page.click('button[data-nav="/evaluate"]')
    page.fill('#dep-name','PermissiveLib')
    page.fill('#license-text','Permission is granted to use, copy, modify, distribute, sublicense, and sell copies of this software, including for commercial purposes. Redistribution does not require the combined work to disclose source code or adopt this license.')
    page.click('#evaluate-form button.btn-primary')
    page.wait_for_selector('text=COMPATIBLE')
    page.click('button[data-nav="/evaluate"]')
    page.fill('#dep-name','ReciprocalLib')
    page.fill('#license-text','You may use and modify this software, but any combined work that distributes or incorporates this software must disclose its complete corresponding source code and must be distributed under the same license terms.')
    page.click('#evaluate-form button.btn-primary')
    page.wait_for_selector('text=INCOMPATIBLE')
    page.click('button[data-nav="/registry"]')
    page.wait_for_selector('text=PermissiveLib')
    assert page.locator('text=ReciprocalLib').count()==0
    page.set_viewport_size({'width':390,'height':844})
    overflow=page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    assert not overflow, 'mobile horizontal overflow detected'
    page.screenshot(path=str(ROOT/'local-smoke-mobile.png'),full_page=True)
    if console_errors: raise AssertionError('console errors: '+repr(console_errors))
    browser.close()
print('PASS local browser smoke: compatible admitted, incompatible blocked')
print('PASS registry: only compatible dependency visible')
print('PASS mobile 390px: no horizontal overflow')
print('PASS console: no errors in mock flow')
