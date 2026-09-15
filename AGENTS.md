# Agent instructions

## Stack

- Expo (managed workflow), React Native, TypeScript
- ESLint (flat config, `eslint-config-expo`) + Prettier
- Node 24 (see `.nvmrc`)

## Commands

```bash
npm install       # install dependencies
npm start         # start the Expo dev server
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
```

Run `lint` and `typecheck` before considering any change complete.

## Conventions

- Conventional Commits for commit messages (see `CONTRIBUTING.md`).
- No native `ios/`/`android/` folders are checked in — this stays a managed
  Expo project unless a deliberate decision is made to eject.
- Expo SDK versions move fast; if unsure whether an API still matches this
  project's SDK version, check `package.json` for the exact `expo` version
  and consult the matching versioned docs at
  `https://docs.expo.dev/versions/vX.0.0/` rather than assuming.
