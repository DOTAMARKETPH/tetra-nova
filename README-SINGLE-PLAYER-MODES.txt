TETRA NOVA — SMARTER BOT + GARBAGE BATTLE UPDATE

Replace these files in the root of your GitHub repository:
- index.html
- style.css
- script.js

SINGLE PLAYER MENU
Start Game > Single Player > Bot Match / Endless
Bot Match > Easy / Medium / Hard

BOT AI
- The bot now evaluates legal placements across rotations and columns.
- It scores possible board outcomes using line clears, stack height, holes, bumpiness, and wells.
- Easy chooses from a wider group of reasonable moves and plays more slowly.
- Medium usually chooses one of the best moves, with occasional variation.
- Hard consistently chooses the strongest evaluated move and plays faster.

GARBAGE IN BOT MATCH
- Clearing 2 lines sends 1 garbage row.
- Clearing 3 lines sends 2 garbage rows.
- Clearing 4 lines sends 4 garbage rows.
- Both the player and NOVA BOT can send garbage to the other side.
- Garbage rows contain one random open hole.
- If incoming garbage pushes occupied blocks off the top of a board, that player loses.
- This follows the same attack thresholds used by the online multiplayer battle.

The bot match keeps the same side-by-side battle layout as online multiplayer. Endless, online multiplayer, existing music, settings, and other game features are retained.

INSTALL
1. Download and extract this ZIP.
2. Open your GitHub repository.
3. Upload/replace index.html, style.css, and script.js in the repository root.
4. Commit the changes.
5. Refresh the GitHub Pages site. Use Ctrl + F5 if the old version is cached.

TESTING NOTE
The JavaScript syntax and ZIP archive have been checked. Please test the game in your browser, especially garbage attacks, top-outs, and all three difficulty levels.
