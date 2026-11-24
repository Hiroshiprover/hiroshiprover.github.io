# Docusaurus 3.10.1 code-block lifecycle patch

The installed @docusaurus/theme-common 3.10.1 useCodeWordWrap callback measured codeBlockRef.current without checking whether React had detached it. Code-block hydration can remount the component before the passive resize-listener cleanup, so a native viewport resize can observe a null ref. The independent investigation reproduced 31 uncaught errors in 80 native-resize navigations; a response-only experiment reduced them to zero. The baseline logs belonged to the prototype investigation and are not required to install or use this patch.

The persistent patch captures the ref once and cancels measurement only when that node is detached. Mounted width/style measurements and all exceptions other than this valid lifecycle cancellation remain unchanged. No error listener filters or global catches are introduced.

`scripts/patch-docusaurus.cjs` applies the tracked JSON patch during npm postinstall, prebuild and prestart. It requires exact package version 3.10.1 and exact original or patched SHA-256 hashes for both shipped TS source and JS runtime. It validates all files before any write, is idempotent, and fails on drift or upgrades. It does not download code. The existing package-lock pins this exact dependency. No patch-package dependency is needed.

The patched runtime file deliberately drops its old source-map reference because inserted lines invalidate that map. The dependency's TypeScript source is patched consistently. Only this one dependency module lacks source mapping until the patch is retired.

On dependency upgrade, do not relax hashes automatically: inspect the upstream fix, remove or revise this patch and its lifecycle scripts, install fresh dependencies, then run the tests below. npm installs with scripts disabled are still protected by npm prebuild/prestart. Direct invocation of the Docusaurus executable bypasses npm hooks, so run `node scripts/patch-docusaurus.cjs` first in that workflow.

Tests: `node --test tests/search/dependency-patch.cjs` covers pristine application, idempotence, version mismatch, source drift rejection before any write, and mounted/detached measurement semantics. `tests/search/resize-stress.mjs` runs 80 navigations with native viewport resize (NATIVE_ONLY=1) or native plus repeated resize events (default), refuses response probes, records every error and fails if any occur. Use the same PLAYWRIGHT_MODULE/BROWSER_EXECUTABLE environment as the search/science browser tests.
