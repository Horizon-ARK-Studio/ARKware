# Publishing

CI publishes `@horizon-ark-studio/arkware` via **npm Trusted
Publishing (OIDC)** — see
[`.github/workflows/npm-publish.yml`](../.github/workflows/npm-publish.yml).
No `NPM_TOKEN` is stored anywhere in this repo. Instead, the workflow
exchanges its GitHub Actions OIDC identity for a short-lived publish
credential, matched against the Trusted Publisher entry configured on
the package at npmjs.com:

| Trusted Publisher field | Value |
|---|---|
| Org | `Horizon-ARK-Studio` |
| Repo | `ARKware` |
| Workflow | `npm-publish.yml` |

Because the credential is short-lived and scoped to that exact
org/repo/workflow triple, a token leak from elsewhere can't be used to
publish under this package name, and there's no long-lived secret to
rotate.

## The one-time bootstrap

npm cannot attach a Trusted Publisher to a package that doesn't exist
yet, so the very first publish had to happen manually:

```
npm login
npm publish --access public
```

**This has already been done** for `@horizon-ark-studio/arkware` and
does not need to be repeated. It would only apply again if publishing
under a brand-new, never-before-published package name (e.g. a
differently-scoped fork).

## What triggers a publish

Check [`npm-publish.yml`](../.github/workflows/npm-publish.yml)
itself for the exact trigger (tag push, release, or manual dispatch)
and version-bump convention in use at any given time — that workflow
file is the source of truth, not this doc.

## Before publishing a new version

- Confirm `arkware-runtime.json`'s `ref` points at the `main` commit
  you intend to ship against — see
  [`sync-and-versioning.md`](./sync-and-versioning.md).
- Bump `version` in [`package.json`](../package.json).
- Verify both CLIs (`arkware-shell build`, `arkware-spa build`, and
  `emit-android-flavor`) still work against the pinned runtime.
