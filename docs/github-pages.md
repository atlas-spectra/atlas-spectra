# Root GitHub Pages deployment

Atlas Spectra keeps its source, data, issues, and release history in `atlas-spectra/atlas-spectra` while publishing the public site at `https://atlas-spectra.github.io/`.

GitHub reserves that root organization Pages URL for a repository named `atlas-spectra/atlas-spectra.github.io`. The root Pages repository should therefore remain a thin deployment shell rather than becoming a second source tree.

## Architecture

```text
atlas-spectra/atlas-spectra
  source + corpus + tests
          |
          | repository_dispatch(source-updated, source_sha)
          v
atlas-spectra/atlas-spectra.github.io
  .github/workflows/deploy.yml only
          |
          | checkout exact source SHA
          | validate schema/corpus/tests
          | astro check + build
          v
GitHub Pages
https://atlas-spectra.github.io/
```

The Pages build checks out the exact source commit named in the dispatch payload. It reruns both the scientific validation suite and the web build before publishing, so deployment is independently gated even if the source repository dispatches immediately after a merge.

## One-time setup

1. Create a public organization repository named `atlas-spectra.github.io`.
2. Copy `deployment/github-pages/deploy.yml` from the product repository to `.github/workflows/deploy.yml` in that repository.
3. In the `atlas-spectra.github.io` repository, open **Settings → Pages** and select **GitHub Actions** as the publishing source.
4. Create a fine-grained personal access token limited to the `atlas-spectra.github.io` repository with **Contents: read and write** permission. This permission is required by GitHub's repository-dispatch endpoint.
5. In `atlas-spectra/atlas-spectra`, add that token as an Actions secret named `PAGES_DEPLOY_TOKEN`.
6. Run `request root pages deploy` once with **workflow_dispatch**, or merge a web/corpus change to `main`.

After the secret exists, `.github/workflows/pages-dispatch.yml` requests a deployment whenever source files that affect the generated site change on `main`.

## Why the shell repository is intentionally thin

- There is one canonical source tree and one scientific corpus.
- Pages-specific repository naming does not dictate the product repository name.
- The root site can later move to a custom domain without moving code or issues.
- The deployment shell can be recreated from the checked-in workflow template.
- A deployment cannot bypass Atlas schema, corpus, regression, Astro type, or production-build checks.

## Astro URL contract

`astro.config.mjs` sets:

```js
site: "https://atlas-spectra.github.io"
```

No `base` is configured because `atlas-spectra.github.io` is an organization root Pages repository, not a project site under a repository subpath.

When a custom domain is introduced later, update `site` to that domain; the application routes do not need to be rewritten around a repository-name prefix.
