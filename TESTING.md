# LicenseGate — Frontend / Vercel Test Plan

## Current status

The contract was previously approved as `LicenseCompat`. This package does **not** alter that contract logic.

Contract source SHA256:

```text
f1cb33f88b6961b322e5203b363de25aee27f4a67d64a93d2afe203c41fce45d
```

Fresh StudioNet deployment configured in this repository:

```text
0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

Explorer:

```text
https://explorer-studio.genlayer.com/address/0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

`contract-config.js` is hardcoded to this fresh deployment and `npm run build` verifies the configured address.

## Local static gates

Run:

```bash
npm run check:source
npm run build
npm run test:local
```

Expected local smoke coverage:

```text
home renders
maintainer evaluates permissive dependency
COMPATIBLE enters registry
maintainer evaluates reciprocal dependency
INCOMPATIBLE does not enter registry
registry contains only PermissiveLib
390px mobile has no horizontal overflow
browser console has no errors
```

Mock mode exists only for local UI smoke testing. It is visibly labeled and must not be used as production evidence.

## Fresh deploy input

Studio project name:

```text
LicenseGate
```

Contract:

```text
LicenseCompat.py
```

Constructor `compatibility_policy`:

```text
Dependencies must permit commercial use, modification, and redistribution as part of this project without requiring the combined project to disclose its proprietary source code or to be relicensed under the dependency's license.
```

## Vercel runtime verification

The fresh address is already configured. Deploy this repository to Vercel, then use the deployer/maintainer wallet.

### 1. Read check

Open the Vercel app.

Expected before any evaluation:

```text
Registered: 0
Last decision: none
```

### 2. Compatible dependency

Name:

```text
PermissiveLib
```

License:

```text
Permission is granted to use, copy, modify, distribute, sublicense, and sell copies of this software, including for commercial purposes. Redistribution does not require the combined work to disclose source code or adopt this license.
```

Expected after FINALIZED:

```text
last_decision = COMPATIBLE
dependency_count = 1
registry #1 = PermissiveLib
```

### 3. Incompatible dependency

Name:

```text
ReciprocalLib
```

License:

```text
You may use and modify this software, but any combined work that distributes or incorporates this software must disclose its complete corresponding source code and must be distributed under the same license terms.
```

Expected after FINALIZED:

```text
last_decision = INCOMPATIBLE
dependency_count remains 1
ReciprocalLib does not appear in the registry
```

### 4. Wallet authorization

Switch to a non-maintainer wallet and attempt an evaluation.

Expected:

```text
contract revert: Only maintainer
registry state unchanged
```

### 5. Public browsing

With any wallet or no connected wallet, open Registry and dependency #1.

Expected:

```text
PermissiveLib remains readable from authoritative on-chain state
```

## Current gate status

```text
Contract source SHA check: PASS
Production static build: PASS
Configured deployment: 0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
Local compatible/incompatible smoke: PASS
Registry enforcement smoke: PASS
Mobile 390px smoke: PASS
Browser console smoke: PASS
Vercel on-chain runtime: PENDING
```

## PASS rule

Only claim production PASS after the above runtime results are observed on the final Vercel URL using `0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736`.
