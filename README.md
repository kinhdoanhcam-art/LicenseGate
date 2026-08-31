# LicenseGate

**Consensus-verified dependency license admission on GenLayer StudioNet.**

LicenseGate is a production frontend built around the already-approved `LicenseCompat.py` Intelligent Contract. It keeps the approved contract source unchanged and exposes its existing workflow as a usable product:

- connect MetaMask on GenLayer StudioNet;
- submit a dependency name and full license text;
- wait for validator consensus;
- display the finalized `COMPATIBLE` / `INCOMPATIBLE` decision;
- deterministically grow the registry only after `COMPATIBLE`;
- browse stored compatible dependencies from authoritative on-chain state.

## Studio project name

```text
LicenseGate
```

Contract file:

```text
LicenseCompat.py
```

Changing the Studio project name does not change the approved contract logic.

## Contract integrity

The packaged contract remains unchanged from the approved source.

```text
SHA256: f1cb33f88b6961b322e5203b363de25aee27f4a67d64a93d2afe203c41fce45d
```

## Production deployment

Fresh StudioNet contract used by the frontend and production runtime test:

```text
0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

Explorer:

```text
https://explorer-studio.genlayer.com/address/0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

Production frontend tested on:

```text
https://license-gate-iota.vercel.app/
```

The deployed compatibility policy is immutable:

```text
Dependencies must permit commercial use, modification, and redistribution as part of this project without requiring the combined project to disclose its proprietary source code or to be relicensed under the dependency's license.
```

The address is stamped into `contract-config.js` and the production build. `npm run build` verifies the configured address.

## Contract behavior preserved

`LicenseCompat.py` remains the authority:

```text
COMPATIBLE   -> dependency_count increments and dependency is stored
INCOMPATIBLE -> dependency_count does not increment
```

Only the deployer/maintainer may call `evaluate_dependency`. Registry reads remain public.

The frontend does not infer a semantic verdict from a transaction hash. It waits for transaction finalization and then re-reads contract state through the StudioNet RPC proxy.

## Production runtime evidence — Aug 31, 2026

The final Vercel deployment was tested with MetaMask against the fresh StudioNet contract above.

Initial authoritative read:

```text
REGISTERED = 0
LAST DECISION = —
LAST EVALUATED = No evaluation yet
```

Compatible test:

```text
Dependency: PermissiveUI
Decision: COMPATIBLE
REGISTERED: 1
LAST EVALUATED: PermissiveUI
```

The license explicitly permitted commercial use, modification, redistribution, sublicensing/sale, and did not impose source-disclosure or same-license obligations on combined works.

Negative test:

```text
Dependency: CopyleftCore
Decision: INCOMPATIBLE
REGISTERED: 1
LAST EVALUATED: CopyleftCore
```

The negative license required combined/derivative works to use the same license and disclose complete corresponding source code. The authoritative registry count remained `1`, proving the incompatible evaluation did not grow the registry.

## Verification status

```text
Approved contract source preserved                  PASS
Contract source SHA check                           PASS
Fresh StudioNet deployment configured               PASS
Production static build                             PASS
Local compatible/incompatible smoke                 PASS
Registry enforcement smoke                          PASS
390px responsive smoke                              PASS
Browser console smoke                               PASS
Vercel MetaMask connection                          PASS
Vercel initial on-chain read                        PASS
Vercel COMPATIBLE -> registry count 1              PASS
Vercel INCOMPATIBLE -> registry remains count 1    PASS
```

## Commands

```bash
npm install
npm run check:source
npm run build
npm run test:local
```

The build has no third-party npm runtime dependencies.
