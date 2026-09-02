# Contributing

## Conventional titles and commits

Pull request titles and commit subjects use the Conventional Commits shape:

```text
<type>(optional-scope): description
```

Allowed types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`.

Examples:

```text
feat(schema): add spectral band representation
fix(data): preserve source uncertainty
chore(ci): enforce conventional metadata
```

Breaking changes may use `!` before the colon, for example `feat(schema)!: revise relationship model`.

The pull request check validates both the PR title and every commit subject on the PR branch. Keeping the PR title conventional also gives squash merges a conventional final subject.
