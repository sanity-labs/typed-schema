# Changesets

This folder holds pending release notes. Each file describes one change and the
semver bump it needs.

Add one for every user-facing change:

```sh
pnpm changeset
```

On merge to `main`, the release workflow opens or updates a "chore: version packages"
pull request that applies the pending changesets to `package.json` and
`CHANGELOG.md`. Merging that pull request publishes to npm.

Docs: https://github.com/changesets/changesets
