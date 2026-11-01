# Assets

Everything under `public/assets/` comes from the original Math Dungeons prototype.

| File                                                    | Source                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `images/troll.png`                                      | Original artwork by the game's author.                                                                                              |
| `images/hallway.png`, `map-background.png`, `title.png` | Purchased art. Check the licence before publishing the raw files in a public repo.                                                  |
| `images/dude.png`, `dudette.png`, `knife.png`           | Purchased art. Same as above.                                                                                                       |
| `images/skull-castle.png`, `little-castle.png`          | Purchased art. Same as above.                                                                                                       |
| `images/wheel.png`, `money-bag.svg`, `hint-bubble.svg`  | Purchased art. Same as above.                                                                                                       |
| `audio/music.mp3` ("Random Race")                       | Open licence, per the original project.                                                                                             |
| `audio/boom.mp3`, `whoosh.mp3`                          | Open licence, per the original project.                                                                                             |
| `audio/growl.mp3`                                       | ZapSplat. Its standard licence needs attribution and may not allow redistributing the file itself; confirm before hosting publicly. |

## Sprite sheets

The battle code depends on these layouts (see `src/ui/sprites.ts`):

- `troll.png`: 9 frames in a row, 505x526 each.
- `dude.png`: 3 frames in a row, 453x627 each.
- `dudette.png`: 3 frames stacked vertically, 460x627 each.
- `knife.png`: 2 frames in a row, 331x696 each (clean, then hit).
