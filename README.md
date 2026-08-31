# LicenseGate

**Consensus-verified dependency license admission on GenLayer StudioNet.**

LicenseGate is a production frontend built around the already-approved `LicenseCompat.py` Intelligent Contract. It keeps the contract source unchanged and exposes its existing workflow as a usable product:

- connect MetaMask on GenLayer StudioNet;
- submit a dependency name and full license text;
- wait for validator consensus;
- show the finalized `COMPATIBLE` / `INCOMPATIBLE` decision;
- show deterministic registry growth only after `COMPATIBLE`;
- browse every stored compatible dependency by on-chain ID.

## Studio project name

Use:

```text
LicenseGate
```

The contract file remains:

```text
LicenseCompat.py
```

Changing the Studio project name does not require changing the approved contract source.

## Contract integrity

The packaged contract is unchanged from the uploaded/approved source.

```text
SHA256: f1cb33f88b6961b322e5203b363de25aee27f4a67d64a93d2afe203c41fce45d
```

## Fresh deployment

Current fresh StudioNet deployment:

```text
0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

Explorer:

```text
https://explorer-studio.genlayer.com/address/0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

This address is now stamped into `contract-config.js` and the production build. The approved compatibility policy used for deployment is:

```text
Dependencies must permit commercial use, modification, and redistribution as part of this project without requiring the combined project to disclose its proprietary source code or to be relicensed under the dependency's license.
```

The fresh deployment is already configured in this repository. To verify the checked-in address:

```bash
npm run build
```

Expected build output includes:

```text
PASS contract 0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
```

The Vercel app should therefore open against this deployment automatically; the runtime address override remains available only as a recovery/testing convenience.

## Frontend architecture

This is a dependency-light static frontend with a Vercel `/api/rpc` proxy for StudioNet reads and transaction monitoring. Wallet writes are signed directly by MetaMask.

The UI never invents a semantic verdict from a submitted transaction hash. It waits for finalization and then re-reads authoritative contract state with `get_summary()` / `get_dependency()`.

## Contract behavior preserved

`LicenseCompat.py` remains the authority:

```text
COMPATIBLE   -> dependency_count increments and dependency is stored
INCOMPATIBLE -> dependency_count does not increment
```

Only the deployer/maintainer may call `evaluate_dependency`. Registry reads remain public.

## Commands

```bash
npm install
npm run check:source
npm run build
npm run test:local
```

The build has no third-party npm runtime dependencies.


## Current pre-production verification

```text
Fresh contract configured: 0x7D2DA7eA1aE728Aa6c673D439d26be389BE44736
Contract source SHA check: PASS
Production static build: PASS
Local browser smoke: PASS
390px responsive smoke: PASS
Console smoke: PASS
Vercel on-chain runtime: pending final production test
```
