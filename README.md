# LicenseGate V2.1

**Authenticate the package version and license source before asking GenLayer whether the license is compatible.**

LicenseGate is a GenLayer Intelligent Contract + dApp for package-license admission. V2 directly addresses the steward request that the original version relied on maintainer-supplied license text and keyed registry uniqueness by the license itself.

The V2 flow is now:

```text
commit-pinned package manifest
          +
commit-pinned license source
          |
          v
artifact authentication
(name + version + exact license path)
          |
          v
GenLayer semantic compatibility
          |
          +--> COMPATIBLE   -> admitted package record
          |
          +--> INCOMPATIBLE -> verdict recorded, not admitted
```

## V2.1 runtime fetch transport

Commit-pinned GitHub blob/raw locators are deterministically normalized to the equivalent `raw.githubusercontent.com/<owner>/<repo>/<40-hex-commit>/<path>` URL and fetched with `gl.nondet.web.render(..., mode="text")`. This keeps the immutable submitted Git identity while avoiding GitHub REST API authentication/JSON/base64 transport inside validator execution.


## Steward request addressed

The requested changes were:

1. bind each verdict to an authenticated package version;
2. bind each verdict to a verifiable license source instead of pasted maintainer text;
3. include package identity in the registry key so different dependencies using the same license can both be recorded.

V2 implements all three in the Intelligent Contract itself.

### 1. Artifact-authenticated package version

`evaluate_dependency()` requires:

```text
package_name
package_version
package_uri
package_digest
license_uri
license_digest
```

`package_uri` must be a public GitHub file pinned to the submitted 40-hex Git commit. Validators fetch the package manifest and require this schema:

```json
{
  "schema": "licensegate-package-v1",
  "package_name": "PermissiveUI",
  "package_version": "1.4.2",
  "license_path": "fixtures/licenses/permissive.txt"
}
```

The fetched `package_name` and `package_version` must exactly match the submitted package identity. A mismatch fails closed before semantic license classification.

### 2. Verifiable license source

The license is no longer pasted into the transaction.

`license_uri` must be a commit-pinned GitHub file. The contract requires the package manifest and license source to use:

- the same GitHub repository;
- the same immutable 40-hex Git commit;
- the exact `license_path` authenticated by the fetched package manifest.

Validators then fetch that license artifact and compare it with the immutable compatibility policy.

Package fetch failure, malformed manifest, package/version mismatch, license binding mismatch, license fetch failure, or an oversized license artifact all fail closed.

### 3. Package identity is the registry key

V1 deduplicated compatible dependencies by a hash of policy + license text. That incorrectly prevented two different packages using the same license from both being recorded.

V2 derives a package key from:

```text
lowercase(package_name) + exact package_version
```

using length-prefixed canonical encoding and `Keccak256`.

Therefore:

```text
PermissiveUI@1.4.2      -> permissive.txt -> separate package record
PermissiveCharts@2.0.0  -> permissive.txt -> separate package record
```

The same authenticated package name + version may only receive one finalized verdict.

## Immutable compatibility policy

Deploy with:

```text
Dependencies must permit commercial use, modification, and redistribution as part of this project without requiring the combined project to disclose its proprietary source code or to be relicensed under the dependency's license.
```

The policy is stored once in the contract constructor and is not mutable afterward.

## Deterministic state model

Every successful semantic evaluation creates an immutable evaluation record containing:

- package name;
- package version;
- package identity key;
- package manifest URL + commit;
- license source URL + commit;
- `COMPATIBLE` / `INCOMPATIBLE` decision;
- whether that verdict was admitted.

`COMPATIBLE` increments the compatible dependency registry.

`INCOMPATIBLE` remains in evaluation history but does not increment the admitted registry.

This separates **verdict history** from **compatible package admission**.

## Public contract methods

### Write

```text
evaluate_dependency(
  package_name,
  package_version,
  package_uri,
  package_digest,
  license_uri,
  license_digest
)
```

Only the deployment maintainer may submit evaluations.

### Read

```text
get_config()
get_summary()
get_package_evaluation_id(package_name, package_version)
get_evaluation(evaluation_id)
get_dependency(dependency_id)
```

Reads are public.

## Reviewer fixtures

The repository includes three package manifests and two license sources:

```text
fixtures/packages/permissive-ui.json
fixtures/packages/permissive-charts.json
fixtures/packages/copyleft-core.json
fixtures/licenses/permissive.txt
fixtures/licenses/copyleft.txt
```

The first two packages deliberately authenticate the **same** permissive license file. This is the direct regression test for the steward request about package identity in the registry key.

The reviewer fixtures are frozen at public commit:

```text
c14f69383066ec103dfa2654f726cd801455bd96
```

The UI exposes four reviewer presets:

- Package A · permissive
- Package B · same license
- Copyleft
- Version mismatch

## Live V2.1 deployment

This is a fresh Intelligent Contract deployment with the steward-requested trust model.

StudioNet contract:

```text
0x75F709c6bd1ba99bc96847E7e901cfb1A00D3404
```

Explorer:

```text
https://explorer-studio.genlayer.com/address/0x75F709c6bd1ba99bc96847E7e901cfb1A00D3404
```

Production dApp:

```text
https://license-gate-iota.vercel.app/
```

Reviewer fixture commit:

```text
c14f69383066ec103dfa2654f726cd801455bd96
```

Current V2.1 source SHA-256:

```text
56ea2f3d016804aa9bdd7470ac46614553cf04cfe91f2fa9c1aab3faae4bdaa0
```

## Local gates

```bash
npm run check:source
npm run build
npm run test:local
```

Observed verification status:

```text
V2 contract Python syntax                         PASS
V2 source integrity check                        PASS
Static production build                          PASS
Package A authenticated compatible flow          PASS (StudioNet)
Package B same-license distinct package record   PASS (StudioNet)
Copyleft verdict recorded / not admitted         PASS (StudioNet)
Package-version mismatch fail-closed              PASS (StudioNet)
Non-maintainer authorization                     PASS (local mock)
390px responsive smoke                           PASS
Browser console smoke                            PASS
StudioNet fresh deployment                       PASS
Frontend static/local verification                PASS
Vercel Overview / Registry / Evaluate smoke       PASS
```

See [`TESTING.md`](./TESTING.md) for the exact reviewer path and observed StudioNet evidence.

## Frontend

The production frontend:

- connects MetaMask to StudioNet;
- never accepts pasted license text for V2 writes;
- provides commit-pinned package + license artifact fields;
- waits for transaction finalization before re-reading state;
- displays admitted package records and all verdict evidence separately;
- links each record back to the authenticated package and license sources;
- uses `/api/rpc` as the Vercel StudioNet read proxy.

## Honest scope

LicenseGate V2.1 authenticates the submitted package identity and license binding against a commit-pinned public package manifest and license artifact. It does not independently prove that the GitHub repository is the canonical upstream publisher for every ecosystem package. The contract does remove the V1 trust in pasted license prose and makes every finalized verdict auditable against immutable public artifacts.
