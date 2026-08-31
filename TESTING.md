# LicenseGate — Testing Evidence

## Final status

Production frontend/runtime verification is **PASS** for the core approved LicenseCompat workflow.

Approved contract source SHA256:

```text
f1cb33f88b6961b322e5203b363de25aee27f4a67d64a93d2afe203c41fce45d
```

Fresh StudioNet deployment:

```text
0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

Explorer:

```text
https://explorer-studio.genlayer.com/address/0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

Production Vercel URL tested:

```text
https://license-gate-iota.vercel.app/
```

Test date:

```text
2026-08-31
```

## Deployment baseline

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

The frontend is configured to the fresh deployment above. The approved contract logic was not modified for the frontend project.

## Static/local gates

Commands:

```bash
npm run check:source
npm run build
npm run test:local
```

Observed coverage:

```text
contract source integrity                 PASS
production static build                   PASS
compatible local flow                     PASS
incompatible local flow                   PASS
registry enforcement                      PASS
390px responsive layout                   PASS
browser console smoke                     PASS
```

Mock mode is only a local UI harness and is not counted as production evidence.

## Production runtime — initial read

The final Vercel app loaded authoritative state from the fresh StudioNet deployment before any evaluation.

Observed:

```text
REGISTERED = 0
LAST DECISION = —
LAST EVALUATED = No evaluation yet
```

Result:

```text
PASS
```

## Production runtime — compatible dependency

MetaMask was connected with the deployer/maintainer wallet.

Dependency:

```text
PermissiveUI
```

License text:

```text
Permission is granted to use, copy, modify, distribute, sublicense, and sell this software, including for commercial purposes. Modified or combined works may be distributed under any license chosen by the user. There is no requirement to disclose source code, publish modifications, or relicense the combined project under this license.
```

Observed after transaction finalization and authoritative state refresh:

```text
LAST DECISION = COMPATIBLE
LAST EVALUATED = PermissiveUI
REGISTERED = 1
```

Result:

```text
PASS
```

This verifies that a permissive dependency satisfying the immutable project policy is admitted and increments the registry.

## Production runtime — incompatible dependency

Dependency:

```text
CopyleftCore
```

License text:

```text
You may use, modify, and redistribute this software only if any combined or derivative work is licensed under the same license terms and its complete corresponding source code is publicly disclosed to recipients.
```

Observed after transaction finalization and authoritative state refresh:

```text
LAST DECISION = INCOMPATIBLE
LAST EVALUATED = CopyleftCore
REGISTERED = 1
```

Result:

```text
PASS
```

The registry count remained exactly `1` after the incompatible evaluation. This verifies the deterministic enforcement boundary: semantic classification may update the last decision, but an incompatible dependency does not grow the authoritative compatible registry.

## Production frontend integration

Observed on the final Vercel URL:

```text
MetaMask connection                      PASS
Fresh contract address displayed         PASS
Immutable compatibility policy displayed PASS
StudioNet state read                      PASS
COMPATIBLE verdict rendered               PASS
Registry count increased to 1             PASS
INCOMPATIBLE verdict rendered             PASS
Registry count remained 1                 PASS
```

## Not re-proven here

The underlying Intelligent Contract had already been accepted before this frontend build. This production frontend pass therefore focuses on contract/frontend parity and the two central semantic branches rather than repeating the full original contract-review suite.

Additional authorization and public-read regression cases may be run if needed, but they are not required to support the production evidence above.

## Final gate

```text
CONTRACT SOURCE: PASS / unchanged
LOCAL FRONTEND: PASS
VERCEL FRONTEND: PASS
COMPATIBLE RUNTIME: PASS
INCOMPATIBLE RUNTIME: PASS
REGISTRY ENFORCEMENT: PASS
```
