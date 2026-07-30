Replay a player's game.

The service-account key is not in this repo — keep it somewhere outside it and
pass the path with --key. Run from the repo root (guess-blute/), not from this
folder, so Node can resolve firebase-admin.

Serve replays over HTTP, then open replay-viewer.html and point it at the server:

  node "dev/Replay Game/replay-server.js" --key "<path-to-service-account.json>" --port 4321

Or dump a single game to a JSON file and load that file in replay-viewer.html:

  node "dev/Replay Game/replay-game.js" --key "<path-to-service-account.json>" --date 2026-07-28 --uuid <player-uuid>

replay-*.json dumps in this folder are gitignored.
