TETRA NOVA - LIVE 1v1 BATTLE VIEW

This update changes the connected multiplayer match layout to show both complete game boards side by side. The opponent board is rendered at full 10x20 board size and continues to receive live board, falling-piece, score, and line updates through the existing PeerJS connection.

Files to replace in the root of your GitHub repository:
- index.html
- style.css
- script.js

Keep README-MULTIPLAYER.txt if it is already in your repository. The Supabase project URL and publishable key configuration from the previous project package are preserved in script.js.

After uploading all three replacement files and committing them, wait for GitHub Pages to redeploy. Test with two separate browser sessions or devices, join the same room or use Find Match, and confirm both boards are visible. A live two-player test is still required to verify connectivity in the deployed environment.
