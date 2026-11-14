TETRA NOVA - HUMAN-LIKE BOT MATCH UPDATE

This update changes the bot from instantly placing each piece to playing with visible, step-by-step movement:
- The bot thinks briefly after spawning a piece.
- It rotates and moves horizontally one action at a time.
- It falls at a steady gravity rate and locks when it lands, rather than instantly hard-dropping every piece.
- Easy, Medium, and Hard use different thinking delays, movement cadence, gravity, and placement quality.
- Existing garbage attacks remain: clearing 2, 3, or 4 lines sends 1, 2, or 4 garbage rows to the opponent.
- The bot still sends garbage to the player when it clears multiple lines.

Difficulty pacing:
- Easy: slower movement and gravity, with less consistent placements.
- Medium: balanced movement and more reliable placements.
- Hard: quicker decisions and movement, with stronger placement choices.

Files to replace in the root of the GitHub repository:
- index.html
- style.css
- script.js

The update preserves the existing menus, battle layout, music, settings, and online multiplayer code. JavaScript syntax and ZIP integrity were checked. Please test the actual gameplay in a browser after deploying.
