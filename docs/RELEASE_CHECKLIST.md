# Release checklist

## Automated gates

- `npm run test:release` — production web build, frontend tests, offline Rust tests, and Python document-worker tests.
- `npm run desktop:check` — optimized native desktop compilation without installer generation.
- `npm run desktop:linux` — Linux DEB and RPM installers.
- Verify the package contains the native binary, desktop entry, portrait icons, `document_worker.py`, and `requirements.txt`.
- Execute the extracted packaged document worker with `--help` to prove its installed resource path and Python imports resolve.

## Accessibility baseline

- A skip link reaches the manuscript editor.
- All interactive elements receive a visible `:focus-visible` indicator.
- Project search is a named input and `Ctrl/Cmd+K` focuses it.
- Binder items support Alt+Up/Down keyboard reordering with a polite live announcement.
- Modal workspaces use named dialog semantics and Escape dismissal where appropriate.
- Reduced-motion preferences disable meaningful animation and transition movement.
- Keyboard/modal behavior is covered by the jsdom regression suite.

## Platform status

- Linux optimized binary: verified in this workspace.
- Linux RPM and DEB: generated and package contents audited.
- Linux AppImage: not a release artifact yet; `linuxdeploy` fails in the current build environment after constructing the AppDir.
- macOS and Windows: icon assets and bundle metadata are present, but native installers must be built and smoke-tested on those operating systems.
- Signing/notarization: intentionally not configured for this private personal build.

## Runtime dependency

The installed document worker is resolved from Tauri's resource directory. DOCX and HTML normalization currently require system Python 3 with the versions in `python/requirements.txt`. A fully embedded cross-platform Python runtime remains a release gate before claiming a dependency-free installer.
