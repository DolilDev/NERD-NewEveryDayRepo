# NERD Game Simulator

A command-line dungeon arena simulator written in TypeScript. A single hero
explores a 10x10 grid, fights enemies, and collects items, driven entirely
by typed text commands. It ships with a single-player mode and a multiplayer
twist: a small TCP server that lets several players join the same game world
from separate terminals.

Built as part of the [NERD (NewEveryRepoDay)](https://newrepoeveryday.vercel.app)
initiative.

## What it is

The simulator implements the classic building blocks of a text-based game:

- **Game Engine** — the core loop and state machine (`start` → `playing` ⇄
  `paused` → `ended`), with a small event system so any front end (CLI or
  network) can react to state changes.
- **Entity Management** — a typed system for players, enemies and items,
  with bounds checking, collision rules and clear errors for invalid
  operations (moving out of bounds, attacking something already dead,
  referencing an entity that doesn't exist, etc.).
- **Game Logic** — movement, combat resolution, item pickup, and the
  win/loss check (defeat every enemy to win; lose if every player dies).
- **Input Handling** — parses raw text into validated commands and rejects
  malformed input (unknown verbs, wrong number of arguments, invalid
  directions) before it ever reaches the game logic.
- **Multiplayer (the twist)** — a dependency-free TCP server
  (`src/network/GameServer.ts`) that assigns each incoming connection a
  player entity on a shared `GameEngine` instance, and a matching CLI
  client (`src/network/GameClient.ts`). Every player's actions are
  broadcast to everyone else, so all terminals stay in sync.

## What was used

- **Language:** TypeScript (compiled with `tsc`, run directly during
  development with `ts-node`)
- **Runtime:** Node.js (built-in `net` module for multiplayer sockets,
  `readline` for CLI input — no external networking libraries)
- **Testing:** Jest + `ts-jest`, 67 tests across all core modules, 98%+
  statement coverage
- **Tooling:** npm scripts for build, start, test and running the
  multiplayer server/client

## Project structure

```
src/
  types.ts                 shared types and custom error classes
  world.ts                 default scenario (enemies, items, spawn helper)
  cli.ts                   single-player CLI entry point
  entities/
    Entity.ts              Entity class (player / enemy / item)
    EntityManager.ts        add/remove/lookup with validation
  logic/
    GameLogic.ts            movement, combat, pickup, win/loss rules
  input/
    InputHandler.ts         command parsing and validation
  engine/
    GameEngine.ts            game loop / state machine
  network/
    GameServer.ts            multiplayer TCP server
    GameClient.ts            multiplayer TCP client
tests/                      Jest unit tests, one file per module
```

## Setup

Requires Node.js 18+ (developed and tested on Node 22).

```bash
npm install
```

## Running the simulator (single player)

```bash
npm start
```

This spawns a hero at `(0, 0)` on a 10x10 board with a Goblin, an Orc and a
Potion already on the map. Example session:

```
> look
Goblin[enemy] @ (3,2) HP:6
Orc[enemy] @ (6,6) HP:12
Potion[item] @ (1,1) HP:0
Hero[player] @ (0,0) HP:20

> move up
Hero moved up to (0, -1)
! Cannot move Hero: position (0, -1) is out of bounds

> attack goblin
! Goblin is too far away to attack

> pickup potion
! Potion is not at your current position

> quit
Goodbye!
```

### Available commands

| Command                     | Description                              |
|------------------------------|-------------------------------------------|
| `move <up\|down\|left\|right>` | move one tile in a direction            |
| `attack <name>`              | attack an adjacent entity                |
| `pickup <name>`              | pick up an item on your current tile     |
| `look`                       | list every entity and its position/HP    |
| `inventory`                  | show items you've collected              |
| `pause` / `resume`           | pause or resume the game                 |
| `help`                       | show the command list                    |
| `quit`                       | end the session                          |

Invalid input (unknown command, wrong argument count, invalid direction,
attacking something out of range, moving out of bounds, etc.) is caught and
reported with a `!` prefix instead of crashing the program.

## Running the multiplayer mode

Start the server (defaults to port `4090`):

```bash
npm run server
# or: npx ts-node src/network/GameServer.ts <port>
```

Then connect one or more clients, each in its own terminal:

```bash
npm run client
# or: npx ts-node src/network/GameClient.ts <port> <host>
```

Each connecting client is assigned its own player entity at one of four
fixed spawn corners of the board (up to 4 players per server). Typing a
command sends it to the server, which executes it against the shared
`GameEngine` and:

1. sends the result back to that client, and
2. broadcasts a short notice (`* [PlayerN] <command> -> <result>`) to every
   other connected client,

so all terminals see the same game state evolve together. Disconnecting
removes that player's entity from the world.

## Testing

```bash
npm test
```

Runs the full Jest suite with coverage. Current results: **67 tests, all
passing, 98.7% statement coverage**, covering:

- entity creation/validation and bounds checking (`tests/entity.test.ts`)
- entity storage, lookup and collision rules (`tests/entityManager.test.ts`)
- movement, combat, pickup and win/loss logic (`tests/gameLogic.test.ts`)
- command parsing and validation (`tests/inputHandler.test.ts`)
- the full game loop, state machine and edge cases (`tests/gameEngine.test.ts`)

## Design notes / edge cases handled

- Entities can't be created or moved outside the 10x10 board.
- Two non-item entities can't occupy the same tile; items can share a tile
  with a player or enemy.
- Attacks require the target to be adjacent, alive, and not an item.
- Dead entities are removed from the world only *after* the win/loss check
  runs, so a killing blow is correctly detected as a win in the same turn.
- The multiplayer server buffers partial TCP data and splits it on
  newlines, so multiple commands arriving in one network packet (or a
  single command split across two packets) are handled correctly instead
  of being merged into one malformed command.
- Game-state transitions are validated (e.g. you can't `resume` a game that
  was never `paused`), raising a clear error instead of silently doing
  nothing.
