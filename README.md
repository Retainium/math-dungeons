# Math Dungeons

A troll walks down the dungeon hallway towards you. Answer its math question on the number wheel before it reaches you to throw your sword and defeat it.

A rewrite of the original Phaser prototype as a dependency-free TypeScript web app: menus are HTML, the battle is DOM and CSS animations, and progress is saved in `localStorage`.

Play it at [games.retainium.ca/math-dungeons](https://games.retainium.ca/math-dungeons/) or [mathdungeons.com](https://mathdungeons.com). It is also embedded in the Retainium app under Learning games.

## Run it

Needs Node 24 and Yarn 4 (`corepack enable`).

```bash
yarn install
yarn dev     # dev server
yarn check   # type-check, lint and unit tests
yarn build   # static build in dist/
```

## Hosting

`dist/` is plain static files with relative paths, so it works from any static host and under any sub-path. Every push to `main` runs the checks and deploys to GitHub Pages through `.github/workflows/deploy.yml`. This repo has no custom domain of its own: it is served under the Retainium org site, so it appears at `games.retainium.ca/math-dungeons/`.

The Retainium app embeds that URL in an iframe. Saved progress lives in the browser's `localStorage` for `games.retainium.ca`, which is shared between the embed and playing the site directly.

## Layout

`src/` is flat:

- `questions.ts`, `round.ts`, `settings.ts`, `missions.ts`: pure game rules with no DOM. Unit-tested.
- `store.ts`: saved progress and settings in `localStorage`.
- `app.ts` and `main.ts`: the screen router and entry point.
- `screen-*.ts`: one module per screen. `wheel.ts`, `sprites.ts` and `top-bar.ts` are the battle and chrome components.
- `dom.ts`: element helpers and `Lifetime`, which cancels a screen's timers, listeners and animations when it closes.
- `audio.ts`: music and sound effects, honouring the sound and music toggles.
- `public/assets/`: art and audio, see [ASSETS.md](./ASSETS.md).

## Controls

- Tap or click a number on the wheel, or type digits on the keyboard. Backspace erases a digit.
- Drag the wheel, or use the arrow buttons or the left and right arrow keys, to turn it.
