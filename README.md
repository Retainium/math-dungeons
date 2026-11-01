# Math Dungeons

A troll walks down the dungeon hallway towards you. Answer its math question on the number wheel before it reaches you to throw your sword and defeat it.

A rewrite of the original Phaser prototype as a dependency-free TypeScript web app: menus are HTML, the battle is DOM and CSS animations, and progress is saved in `localStorage`.

## Run it

From the repo root:

```bash
yarn workspace @retainium/games dev:math-dungeons    # dev server
yarn workspace @retainium/games build:math-dungeons  # static build in math-dungeons/dist/
yarn workspace @retainium/games build:embed          # build into app/public/embed/math-dungeons/
```

## Host it on its own

`dist/` is plain static files with relative paths, so it can be served from any static host and under any sub-path. Nothing in this folder depends on the rest of the repo.

To move the game into its own repository, copy this folder and add a `package.json` with `vite` as a dev dependency and `dev`/`build` scripts (`vite`, `vite build`). The unit tests live in `games/__tests__/unit/logic/math-dungeons/` and import `questions.ts`, `round.ts` and `settings.ts` through the `@retainium/games/*` alias; copy them along and point the imports at `src/` if you want them.

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
