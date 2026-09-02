# GitHub Pages deployment

Atlas Spectra publishes the product site from the canonical repository at:

`https://atlas-spectra.github.io/atlas-spectra/`

The organization root site at `https://atlas-spectra.github.io/` is intentionally only a redirect to that project Pages URL.

## Architecture

```text
atlas-spectra/atlas-spectra
  source + corpus + tests + Astro app
          |
          | push to main
          v
GitHub Actions
  astro check + build
          |
          v
GitHub Pages
https://atlas-spectra.github.io/atlas-spectra/

atlas-spectra/atlas-spectra.github.io
  tiny static redirect only
          |
          v
https://atlas-spectra.github.io/
  -> /atlas-spectra/
```

There is no cross-repository credential. Each Pages repository deploys with its own repository-scoped `GITHUB_TOKEN`.

## One-time setup

For `atlas-spectra/atlas-spectra`:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Merge a web change to `main`.

The `web` workflow validates the Astro project on pull requests. On a push to `main`, the same workflow uploads `dist/` as the Pages artifact and deploys it.

For `atlas-spectra/atlas-spectra.github.io`:

1. Keep only the redirect page plus its tiny deployment workflow.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

## Astro URL contract

`astro.config.mjs` sets:

```js
site: "https://atlas-spectra.github.io",
base: "/atlas-spectra"
```

Application-internal links use Astro/Vite's `BASE_URL` rather than assuming deployment at `/`.

When Atlas Spectra moves to a custom domain later, remove the project `base` and update `site` to the custom origin.
