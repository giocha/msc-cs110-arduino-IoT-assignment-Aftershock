# Contributing

## Workflow

- Branch off `main`: `feature/<short-description>` or `fix/<short-description>`.
- Open a pull request into `main`. CI (lint + typecheck) must pass before merging.
- Prefer small, focused PRs.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add login screen
fix: correct spacing on profile card
chore: update dependencies
```

## Before pushing

```bash
npm run lint
npm run typecheck
```
