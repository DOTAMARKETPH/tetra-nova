FALLING BLOCKS — ONLINE 1v1 + FIND MATCH

FILES
- index.html
- style.css
- script.js

PUBLISH ON GITHUB PAGES
1. Open your GitHub repository for the game.
2. Upload/replace index.html, style.css, script.js, and this README file in the same folder.
3. Commit the changes to your main branch.
4. In the repository, open Settings > Pages.
5. Under Build and deployment, select Deploy from a branch.
6. Choose the main branch and / (root), then Save.
7. Wait for GitHub Pages to publish. Open the HTTPS URL shown in Settings > Pages.
8. Test the game in two separate browsers/devices. Do not use file://; both players must open the published HTTPS page.

PRIVATE ROOM MATCHES
1. Open 1v1 ONLINE > Create room.
2. Share the six-digit room code with your friend.
3. Your friend opens the same website, enters the code, and selects Join room.

AUTOMATIC FIND MATCH — ONE-TIME SUPABASE SETUP
Find Match uses Supabase Realtime Presence to put players into a shared public queue. It does not require a database table or SQL migration.
1. Create a free project at https://supabase.com/.
2. Open Project Settings > API (or Data API/API Keys, depending on the dashboard layout).
3. Copy the Project URL and the anon/public publishable key. Never use a service_role or secret key in browser code.
4. Open script.js and find MATCHMAKING_CONFIG near the top.
5. Replace YOUR_SUPABASE_PROJECT_URL with your Project URL and YOUR_SUPABASE_ANON_KEY with the anon/public key.
6. Save and upload the updated script.js to GitHub, then wait for Pages to redeploy.
7. Open the HTTPS game page and click 1v1 ONLINE > Find Match on two devices/browsers. Both players should be placed into a match automatically.

SUPABASE NOTES
- Supabase Realtime must be enabled for the project (it is normally enabled by default).
- This prototype uses a public Realtime channel for matchmaking presence. It shares only a temporary PeerJS peer ID and random session metadata, not a player's name or email.
- Do not put a Supabase service_role/secret key in script.js. Only use the anon/public key.
- Find Match will show setup instructions until the project URL and anon/public key are configured.

GAMEPLAY
- Both players have separate boards and play at the same time.
- Clearing two or more lines sends garbage rows to the opponent.
- The first player to top out loses.
- Private room play and single-player mode remain available.
- The five synthesized music tracks remain built into the game.

TECHNICAL NOTES
- PeerJS uses its public cloud signaling service for WebRTC peer connections.
- Supabase Realtime Presence is used only to find an available opponent.
- Both services and a working internet connection are required for online play. Casual prototype only; it is not cheat-resistant ranked matchmaking.
