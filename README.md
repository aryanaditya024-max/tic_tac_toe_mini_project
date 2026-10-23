# tic_tac_toe_mini_project
# Tic-Tac-Toe • Neon Edition

A modern, neon-styled Tic-Tac-Toe game built with plain **HTML, CSS and JavaScript** — no frameworks, no libraries, no build step. Play against a friend or against an AI that ranges from beginner-friendly to truly unbeatable.





## Features

- **Two modes:** 2 Players, or vs AI
- **Three AI levels:** Easy, Medium and Unbeatable (Minimax)
- **Scoreboard** for X wins, O wins and ties, saved between visits
- **Alternating start:** the player who goes first changes every round
- **Animated winning line**, confetti and a result popup
- **Sound effects** generated with the Web Audio API (mute button included)
- **Keyboard support:** arrow keys to move, Enter / Space to play, `R` to restart the round
- **Responsive** layout for phone, tablet and desktop
- **Accessible:** real buttons with labels, screen-reader turn announcements, reduced-motion support

## How to run

No installation needed.

1. Download or clone this repository.
2. Open `index.html` in any modern browser.

```bash
git clone https://github.com/aryanaditya024-max/tic_tac_toe_mini_project.git
cd tic_tac_toe_mini_project
# then open index.html
```

## Project structure

```
├── index.html   # page structure and layout
├── style.css    # theme, animations, responsive rules
└── script.js    # game logic, AI, sound, confetti, saved scores
```

## How the AI works

| Level | Strategy |
|---|---|
| **Easy** | Picks a random empty cell |
| **Medium** | Wins if it can, blocks your win if needed, prefers the centre, otherwise random |
| **Unbeatable** | Minimax: searches every possible continuation of the game and picks the move with the best guaranteed outcome |

**Minimax in short:** the AI imagines every move it could make, every reply you could make, and so on until the game ends. A finished game scores `+10` for an AI win, `-10` for a loss and `0` for a draw, minus the move depth so faster wins score higher. The AI assumes you play perfectly, so the best you can do against it is a draw.

## Tech stack

- HTML5 (`<dialog>` element for the result popup)
- CSS3 (Grid, Flexbox, CSS variables, animations)
- JavaScript ES6+
- Web Audio API, Canvas API, localStorage

## Future ideas

- Choose to play as X or O against the AI
- Undo and move history
- Larger boards (4x4, 5x5) with alpha-beta pruning
- Online multiplayer
- Colour themes

## Author

Aryan Aditya
Made as a mini project

## License

MIT — free to use and modify.
