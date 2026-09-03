# LicenseGate V2.1 — Reviewer Testing


## Purpose

This test path directly exercises the steward request:

> bind each verdict to an authenticated package version and license source, and include package identity in the registry key so different dependencies using the same license can both be recorded.

## Frozen contract source

```text
contracts/LicenseCompat.py
SHA-256: 56ea2f3d016804aa9bdd7470ac46614553cf04cfe91f2fa9c1aab3faae4bdaa0
```

Frozen StudioNet deployment:

```text
0x75F709c6bd1ba99bc96847E7e901cfb1A00D3404
```

Explorer:

```text
https://explorer-studio.genlayer.com/address/0x75F709c6bd1ba99bc96847E7e901cfb1A00D3404
```

Reviewer fixture commit:

```text
c14f69383066ec103dfa2654f726cd801455bd96
```

## Static/local verification — PASS

Commands:

```bash
npm run check:source
npm run build
npm run test:local
```

Observed:

```text
V2 source integrity                         PASS
static production build                     PASS
Package A compatible -> admitted            PASS
Package B same license -> distinct admitted PASS
copyleft -> incompatible / not admitted     PASS
version mismatch -> fail closed              PASS
non-maintainer write -> rejected             PASS
390px mobile overflow                       PASS
browser console                             PASS
```

Local mock mode is UI/integration validation only. It is not presented as StudioNet semantic evidence.

---

# Reviewer self-test path

Use the exact immutable compatibility policy shown in README when deploying.

Before running the reviewer presets, the fixture files must already exist in a public GitHub commit and `runtime-config.js` must contain that 40-hex commit.

## Step 1 — Verify frozen deployment

Open the frozen deployment in Explorer and confirm the repository source matches `contracts/LicenseCompat.py`.

Constructor policy:

```text
Dependencies must permit commercial use, modification, and redistribution as part of this project without requiring the combined project to disclose its proprietary source code or to be relicensed under the dependency's license.
```

The recorded runtime sequence began from:

```text
evaluation_count = 0
dependency_count = 0
```

## Step 2 — Verify immutable references

The repository is configured with:

```text
contract = 0x75F709c6bd1ba99bc96847E7e901cfb1A00D3404
fixture commit = c14f69383066ec103dfa2654f726cd801455bd96
```

Both package and license presets point to files under that same immutable commit.

## Step 3 — Package A / permissive

Connect the deployment maintainer wallet.

Open **Evaluate** and choose:

```text
Package A · permissive
```

The preset submits:

```text
PermissiveUI
1.4.2
fixtures/packages/permissive-ui.json
fixtures/licenses/permissive.txt
same public Git commit for both artifacts
```

Wait for `FINALIZED` and automatic state refresh.

Expected:

```text
last verdict = COMPATIBLE
evaluation_count = 1
dependency_count = 1
PermissiveUI@1.4.2 appears in compatible registry
Evaluation #1 retains package URI/digest + license URI/digest
```

This proves a verdict is attached to authenticated package/version + license evidence rather than pasted license text.

## Step 4 — Package B using the exact same license source

Choose:

```text
Package B · same license
```

The preset submits:

```text
PermissiveCharts
2.0.0
fixtures/packages/permissive-charts.json
fixtures/licenses/permissive.txt
```

The license URI/digest is intentionally identical to Package A.

Expected:

```text
last verdict = COMPATIBLE
evaluation_count = 2
dependency_count = 2
PermissiveUI@1.4.2 remains recorded
PermissiveCharts@2.0.0 is also recorded
```

**Critical steward gate:** two distinct package identities using the same license must both exist in the registry.

## Step 5 — Copyleft negative branch

Choose:

```text
Copyleft
```

Expected:

```text
last verdict = INCOMPATIBLE
evaluation_count = 3
dependency_count remains 2
CopyleftCore@3.1.0 appears in evaluation history
CopyleftCore@3.1.0 does not appear as an admitted compatible dependency
```

This proves semantic classification and deterministic admission remain separated.

## Step 6 — Authenticated package-version mismatch

Choose:

```text
Version mismatch
```

The preset intentionally declares:

```text
PermissiveUI@9.9.9
```

while the fetched package manifest authenticates:

```text
PermissiveUI@1.4.2
```

Expected transaction execution error:

```text
Package name/version does not match authenticated manifest
```

Expected state:

```text
evaluation_count remains 3
dependency_count remains 2
no verdict record is created
```

This is the direct negative proof that a maintainer cannot obtain a verdict for an arbitrary claimed version using another package artifact.

## Step 7 — License binding mismatch negative control

Manually load the Package A fields, then change only `license_uri` to the copyleft license path while leaving the Package A manifest unchanged.

Expected transaction execution error:

```text
License source does not match package manifest
```

Expected state does not change.

This proves a real package manifest cannot be paired with an unrelated license source.

## Step 8 — Public read / maintainer write boundary

Switch to another wallet.

Expected:

```text
Registry and evaluation evidence remain publicly readable
evaluate_dependency write fails with Only maintainer
```

---

# Observed StudioNet evidence — PASS

The steward-critical sequence was executed on the frozen V2.1 deployment with maintainer `0x3065E31B1D993d7C0D59E6786844cBa56780B2d3`:

```text
Initial state
  evaluation_count = 0
  dependency_count = 0

PermissiveUI@1.4.2
  transaction = SUCCESS / ACCEPTED-FINALIZED
  decision = COMPATIBLE
  evaluation_count = 1
  dependency_count = 1

PermissiveCharts@2.0.0
  exact same permissive license artifact as Package A
  transaction = SUCCESS / ACCEPTED-FINALIZED
  decision = COMPATIBLE
  evaluation_count = 2
  dependency_count = 2

CopyleftCore@3.1.0
  transaction = SUCCESS / FINALIZED
  decision = INCOMPATIBLE
  evaluation_count = 3
  dependency_count = 2

PermissiveUI@9.9.9 using the 1.4.2 authenticated manifest
  result = ERROR / rollback
  consensus = PACKAGE_IDENTITY_MISMATCH
  error = Package name/version does not match authenticated manifest
  evaluation_count remains 3
  dependency_count remains 2
```

This directly demonstrates both parts of the steward request: verdicts are bound to authenticated package/version + license evidence, and different package identities using the same license are recorded independently.

---

# Final resubmission acceptance matrix

```text
Fresh V2.1 contract deployed                              PASS
Exact V2.1 source hash locked                             PASS
Fixture commit public + immutable                         PASS
Package A authenticated -> COMPATIBLE -> admitted         PASS
Package B same license -> COMPATIBLE -> second record     PASS
Copyleft -> INCOMPATIBLE -> not admitted                  PASS
Version mismatch -> execution error / no state mutation   PASS
Registry identity keyed by package name + version         PASS
Frontend source/build/local smoke                         PASS
Vercel points to frozen V2.1 contract                     VERIFY AFTER DEPLOY
```

For resubmission, use only the frozen V2.1 Explorer address above together with the current GitHub repository and production Vercel URL.
