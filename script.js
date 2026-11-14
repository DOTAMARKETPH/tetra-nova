(() => {
  "use strict";

  const COLS = 10, ROWS = 20, BLOCK = 30;
  const SHAPES = {
    I: [[1,1,1,1]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1]],
    S: [[0,1,1],[1,1,0]],
    Z: [[1,1,0],[0,1,1]],
    J: [[1,0,0],[1,1,1]],
    L: [[0,0,1],[1,1,1]]
  };
  const COLORS = { I:"#63d9f2", O:"#f5cf68", T:"#b69aff", S:"#72dfa8", Z:"#ff7b91", J:"#75a7ff", L:"#ffa76b" };
  const $ = id => document.getElementById(id);
  const canvas = $("gameCanvas"), ctx = canvas.getContext("2d");
  const holdCanvas = $("holdCanvas"), holdCtx = holdCanvas.getContext("2d");
  const nextCanvas = $("nextCanvas"), nextCtx = nextCanvas.getContext("2d");
  const overlay = $("overlay");
  let board, current, queue, held, canHold, score, lines, level, running = false, paused = false, gameOver = false;
  let mode = "classic", soundOn = true, musicOn = true, musicVolume = 0.16, lastTime = 0, dropCounter = 0, animationId = 0, audioCtx = null;
  let musicTimer = 0, musicStep = 0, nextMusicTime = 0, musicMaster = null;
  let leaderboard = loadScores();
  let peer = null, onlineConnection = null, onlineRole = null, onlineMatch = false;
  let remoteGameOver = false, lastNetworkUpdate = 0, onlineStarting = false;
  let matchmakingChannel = null, matchmakingSession = null, matchmakingActive = false, matchmakingAttempt = "";
  // Add your Supabase project URL and anon/publishable key here to enable Find Match.
  const MATCHMAKING_CONFIG = {
    url: "https://lfygpkeqkapmymxxmbzh.supabase.co",
    key: "sb_publishable_LZsiWCn7_WEVTWJQbogjhQ_MbNoPhRN"
  };
  let matchmakingClient = null;
  const opponentCanvas = $("opponentCanvas"), opponentCtx = opponentCanvas ? opponentCanvas.getContext("2d") : null;

  function loadScores() {
    try { return JSON.parse(localStorage.getItem("fallingBlocksScores") || "[]").slice(0,5); }
    catch { return []; }
  }
  function saveScores() {
    try { localStorage.setItem("fallingBlocksScores", JSON.stringify(leaderboard)); } catch {}
  }
  function bestScore() { return leaderboard.length ? leaderboard[0].score : 0; }
  function formatScore(n) { return String(n).padStart(6, "0"); }
  function renderLeaderboard() {
    $("bestScore").textContent = formatScore(bestScore());
    const list = $("leaderboard");
    list.innerHTML = "";
    if (!leaderboard.length) {
      const li = document.createElement("li"); li.className = "empty-score"; li.textContent = "No scores yet"; list.appendChild(li); return;
    }
    leaderboard.forEach((entry, i) => {
      const li = document.createElement("li");
      const rank = document.createElement("span"); rank.textContent = `0${i+1}  ${entry.mode}`;
      const value = document.createElement("strong"); value.textContent = formatScore(entry.score);
      li.append(rank, value); list.appendChild(li);
    });
  }
  function updateStats() {
    $("score").textContent = formatScore(score);
    $("lines").textContent = lines;
    $("level").textContent = level;
  }
  function sound(freq=440, duration=.07, type="sine", volume=.035) {
    if (!soundOn) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch {}
  }
  // Five original, locally synthesized chiptune tracks. Tracks 1–4 rotate between runs;
  // track 5 is the dedicated game-over / defeat theme. No external audio files needed.
  const MUSIC_STEP = 60 / 112 / 4;
  const MUSIC_TRACKS = [
    { name: "Neon Rush", bpm: 112, melody: [659.25,null,783.99,null,987.77,null,783.99,659.25,587.33,null,659.25,null,783.99,null,587.33,null,523.25,null,659.25,null,783.99,null,1046.5,783.99,587.33,null,523.25,null,493.88,null,587.33,null], bass: [55,null,null,null,55,null,null,null,65.41,null,null,null,65.41,null,null,null,49,null,null,null,49,null,null,null,73.42,null,null,null,73.42,null,null,null], type: "square" },
    { name: "Pixel Pulse", bpm: 126, melody: [783.99,null,659.25,783.99,null,987.77,880,null,783.99,null,659.25,null,587.33,null,659.25,null,880,null,987.77,null,1174.66,null,987.77,880,783.99,null,659.25,null,587.33,null,523.25,null], bass: [65.41,null,65.41,null,82.41,null,82.41,null,55,null,55,null,73.42,null,73.42,null,65.41,null,65.41,null,82.41,null,82.41,null,55,null,55,null,49,null,49,null], type: "triangle" },
    { name: "Midnight Circuit", bpm: 96, melody: [523.25,null,null,659.25,null,783.99,null,null,698.46,null,659.25,null,null,523.25,null,null,587.33,null,null,698.46,null,783.99,null,null,698.46,null,587.33,null,523.25,null,null,null], bass: [49,null,null,null,null,null,49,null,58.27,null,null,null,null,null,58.27,null,43.65,null,null,null,null,null,43.65,null,65.41,null,null,null,null,null,65.41,null], type: "sawtooth" },
    { name: "Gravity Drive", bpm: 138, melody: [987.77,880,null,783.99,880,null,1174.66,null,987.77,null,880,783.99,null,659.25,null,null,783.99,880,null,987.77,null,1318.51,1174.66,null,987.77,null,880,783.99,null,659.25,null,null], bass: [73.42,null,73.42,null,55,null,55,null,65.41,null,65.41,null,49,null,49,null,73.42,null,73.42,null,55,null,55,null,65.41,null,65.41,null,49,null,49,null], type: "square" },
    { name: "System Failure", bpm: 78, melody: [392,null,null,null,349.23,null,329.63,null,293.66,null,null,null,261.63,null,null,null,349.23,null,null,null,329.63,null,293.66,null,261.63,null,null,null,220,null,null,null], bass: [36.71,null,null,null,36.71,null,null,null,43.65,null,null,null,43.65,null,null,null,32.70,null,null,null,32.70,null,null,null,29.14,null,null,null,29.14,null,null,null], type: "triangle" }
  ];
  let activeMusicTrack = 0;

  function musicTone(freq, time, duration, type, peak, endFreq) {
    if (!audioCtx || !musicMaster) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain); gain.connect(musicMaster);
    osc.start(time); osc.stop(time + duration + 0.02);
  }

  function scheduleMusicStep(step, time) {
    const track = MUSIC_TRACKS[activeMusicTrack];
    const stepLength = 60 / track.bpm / 4;
    const beat = step % 16;
    const melody = track.melody[step % track.melody.length];
    const bass = track.bass[step % track.bass.length];
    if (bass) musicTone(bass, time, stepLength * 3.5, "sawtooth", activeMusicTrack === 4 ? 0.13 : 0.20, bass * 0.98);
    if (melody) {
      musicTone(melody, time, stepLength * (activeMusicTrack === 4 ? 2.4 : 1.55), track.type, activeMusicTrack === 4 ? 0.045 : 0.075);
      if (activeMusicTrack !== 4 && step % 4 === 2) musicTone(melody * 2, time, stepLength * 0.65, "triangle", 0.025);
    }
    if (beat === 0 || beat === 8) musicTone(activeMusicTrack === 4 ? 82 : 115, time, 0.13, "sine", activeMusicTrack === 4 ? 0.22 : 0.34, 42);
    if (activeMusicTrack !== 4 && (beat === 4 || beat === 12)) {
      musicTone(185, time, 0.075, "triangle", 0.12, 75);
      musicTone(920, time, 0.045, "square", 0.025, 420);
    }
    if (activeMusicTrack !== 4 && beat % 2 === 0) musicTone(6200, time, 0.018, "square", 0.018, 2400);
  }

  function startMusic(trackIndex = activeMusicTrack) {
    if (!musicOn || (!running && !gameOver) || paused) return;
    activeMusicTrack = trackIndex;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      if (!musicMaster) {
        musicMaster = audioCtx.createGain();
        musicMaster.gain.value = 0;
        musicMaster.connect(audioCtx.destination);
      }
      musicMaster.gain.cancelScheduledValues(audioCtx.currentTime);
      musicMaster.gain.setTargetAtTime(musicVolume, audioCtx.currentTime, 0.12);
      if (musicTimer) clearInterval(musicTimer);
      musicStep = 0;
      nextMusicTime = audioCtx.currentTime + 0.06;
      musicTimer = setInterval(() => {
        if (!musicOn || (!running && !gameOver) || paused || !audioCtx) return;
        const track = MUSIC_TRACKS[activeMusicTrack];
        const stepLength = 60 / track.bpm / 4;
        while (nextMusicTime < audioCtx.currentTime + 0.14) {
          scheduleMusicStep(musicStep, nextMusicTime);
          nextMusicTime += stepLength;
          musicStep = (musicStep + 1) % track.melody.length;
        }
      }, 25);
    } catch (error) { console.warn("Background music could not start:", error); }
  }

  function stopMusic(reset = false) {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = 0;
    if (musicMaster && audioCtx) {
      musicMaster.gain.cancelScheduledValues(audioCtx.currentTime);
      musicMaster.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.045);
    }
    if (reset) musicStep = 0;
  }

  function updateMusicButton() {
    const button = $("musicToggle");
    button.classList.toggle("muted", !musicOn);
    button.textContent = musicOn ? "♪" : "♩";
    button.setAttribute("aria-label", musicOn ? "Mute background music" : "Enable background music");
  }

  function setMusicEnabled(enabled) {
    musicOn = enabled;
    updateMusicButton();
    if (musicOn && running && !paused) startMusic();
    else if (!musicOn) stopMusic();
  }

  function newBoard() { return Array.from({length:ROWS}, () => Array(COLS).fill(null)); }
  function randomPiece() {
    const keys = Object.keys(SHAPES), type = keys[Math.floor(Math.random()*keys.length)];
    return { type, matrix: SHAPES[type].map(row=>row.slice()), x: Math.floor(COLS/2)-Math.ceil(SHAPES[type][0].length/2), y: 0 };
  }
  function refillQueue() { while (queue.length < 6) queue.push(randomPiece()); }
  function spawn() {
    refillQueue();
    current = queue.shift();
    current.x = Math.floor(COLS/2)-Math.ceil(current.matrix[0].length/2);
    current.y = 0;
    canHold = true;
    drawPreviews();
    if (collides(current.matrix,current.x,current.y)) endGame();
  }
  function collides(matrix, x, y) {
    for (let r=0;r<matrix.length;r++) for (let c=0;c<matrix[r].length;c++) {
      if (!matrix[r][c]) continue;
      const nx=x+c, ny=y+r;
      if (nx<0 || nx>=COLS || ny>=ROWS || (ny>=0 && board[ny][nx])) return true;
    }
    return false;
  }
  function rotateMatrix(matrix) {
    return matrix[0].map((_,i)=>matrix.map(row=>row[i]).reverse());
  }
  function rotate() {
    if (!running || paused || !current) return;
    const rotated=rotateMatrix(current.matrix);
    for (const offset of [0,-1,1,-2,2]) {
      if (!collides(rotated,current.x+offset,current.y)) {
        current.matrix=rotated; current.x+=offset; sound(560,.055,"triangle"); draw(); return;
      }
    }
  }
  function move(dx,dy=0) {
    if (!running || paused || !current) return;
    if (!collides(current.matrix,current.x+dx,current.y+dy)) {
      current.x+=dx; current.y+=dy;
      if (dx) sound(220,.025,"sine",.018);
      draw(); return true;
    }
    if (dy>0) lockPiece();
    return false;
  }
  function hardDrop() {
    if (!running || paused || !current) return;
    let distance=0;
    while (!collides(current.matrix,current.x,current.y+1)) { current.y++; distance++; }
    // Dropping distance does not award points; scoring comes from cleared lines.
    sound(125,.12,"sawtooth",.04);
    lockPiece();
  }
  function holdPiece() {
    if (!running || paused || !current || !canHold) return;
    const outgoing={type:current.type,matrix:SHAPES[current.type].map(r=>r.slice())};
    if (!held) { held=outgoing; spawn(); }
    else {
      const incoming=held; held=outgoing;
      current={type:incoming.type,matrix:SHAPES[incoming.type].map(r=>r.slice()),x:Math.floor(COLS/2)-Math.ceil(incoming.matrix[0].length/2),y:0};
      if (collides(current.matrix,current.x,current.y)) endGame();
    }
    canHold=false; drawPreviews(); draw(); sound(390,.09,"triangle");
  }
  function lockPiece() {
    current.matrix.forEach((row,r)=>row.forEach((value,c)=>{
      if (value) { const y=current.y+r, x=current.x+c; if (y>=0) board[y][x]=current.type; }
    }));
    clearLines();
    spawn();
    updateStats(); draw();
  }
  function clearLines() {
    let cleared=0;
    outer: for (let y=ROWS-1;y>=0;y--) {
      if (board[y].every(Boolean)) {
        board.splice(y,1); board.unshift(Array(COLS).fill(null)); cleared++; y++;
      }
    }
    if (!cleared) return;
    if (onlineMatch && onlineConnection && cleared >= 2) sendOnline({ type:"garbage", rows:cleared===2?1:cleared===3?2:4 });
    lines += cleared;
    const classicPoints=[0,100,300,500,800];
    const modernPoints=[0,120,360,600,1000];
    score += (mode==="modern" ? modernPoints[cleared] : classicPoints[cleared]) * level;
    level = Math.floor(lines/10)+1;
    sound(cleared===4?880:660,.22,"triangle",.055);
    if (cleared===4) setTimeout(()=>sound(1100,.18,"sine",.04),100);
  }
  function clearOverlayDetails() {
    $("overlayDetails").hidden = true;
    $("overlayDetails").innerHTML = "";
  }
  function setOverlay(title, eyebrow, message, buttons, details="") {
    $("overlayEyebrow").textContent = eyebrow;
    $("overlayTitle").textContent = title;
    $("overlayText").textContent = message;
    const actions = $("overlayActions");
    actions.innerHTML = "";
    buttons.forEach((button, index) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = index === 0 ? "primary-button" : "overlay-menu-button";
      el.textContent = button.label;
      el.addEventListener("click", button.action);
      actions.appendChild(el);
    });
    const detailBox = $("overlayDetails");
    detailBox.innerHTML = details;
    detailBox.hidden = !details;
  }
  function showPauseMenu() {
    setOverlay("Game paused", "TAKE YOUR TIME", "Your board is waiting right where you left it.", [
      { label: "Resume", action: togglePause },
      { label: "How to play", action: showHowToPlay },
      { label: "Settings", action: showSettings },
      { label: "Main menu", action: showMainMenu }
    ]);
    overlay.classList.remove("hidden");
  }
  function showHowToPlay() {
    const details = `<h3>How to play</h3>
      <p><b>← / →</b> Move the piece left or right</p>
      <p><b>↑</b> Rotate the piece</p>
      <p><b>↓</b> Soft drop · <b>SPACE</b> Hard drop</p>
      <p><b>C</b> Hold a piece · <b>P / ESC</b> Pause or resume</p>
      <p>Complete a horizontal row to clear it. Keep stacking without reaching the top.</p>
      <div class="detail-actions"><button type="button" id="detailsBack">Back</button><button type="button" id="detailsResume">Resume</button></div>`;
    setOverlay("How to play", "QUICK GUIDE", "Learn the controls and build your strategy.", [], details);
    $("detailsBack").addEventListener("click", showPauseMenu);
    $("detailsResume").addEventListener("click", togglePause);
  }
  function showSettings() {
    const details = `<h3>Settings</h3>
      <label for="overlaySound">Sound effects <input id="overlaySound" type="checkbox" ${soundOn ? "checked" : ""}></label>
      <label for="overlayMusic">Background music <input id="overlayMusic" type="checkbox" ${musicOn ? "checked" : ""}></label>
      <label class="volume-row" for="musicVolume">Music volume <input id="musicVolume" type="range" min="0" max="0.35" step="0.01" value="${musicVolume}"></label>
      <p>Game mode: <b>${mode === "classic" ? "Classic" : "Modern"}</b></p>
      <div class="detail-actions"><button type="button" id="settingsBack">Back</button><button type="button" id="settingsResume">Resume</button></div>`;
    setOverlay("Settings", "PREFERENCES", "Adjust your game experience.", [], details);
    $("overlaySound").addEventListener("change", e => {
      soundOn = e.target.checked;
      $("soundToggle").classList.toggle("muted", !soundOn);
      $("soundToggle").textContent = soundOn ? "♫" : "♩";
      if (soundOn) sound(520, .08, "sine");
    });
    $("overlayMusic").addEventListener("change", e => setMusicEnabled(e.target.checked));
    $("musicVolume").addEventListener("input", e => {
      musicVolume = Number(e.target.value);
      if (musicMaster && audioCtx) musicMaster.gain.setTargetAtTime(musicOn && running && !paused ? musicVolume : 0.0001, audioCtx.currentTime, 0.06);
    });
    $("settingsBack").addEventListener("click", showPauseMenu);
    $("settingsResume").addEventListener("click", togglePause);
  }
  function showMainMenu() {
    cleanupOnline();
    $("onlinePanel").hidden = true;
    stopMusic(true);
    cancelAnimationFrame(animationId);
    running = false; paused = false; gameOver = false;
    heldInputs.clear(); activeKeys.clear();
    if (inputFrame) cancelAnimationFrame(inputFrame);
    inputFrame = 0; lastInputTime = 0;
    $("pauseButton").disabled = true;
    $("pauseButton").innerHTML = "Ⅱ <span>PAUSE</span>";
    setOverlay("Make your move.", "READY WHEN YOU ARE", "Clear lines and build your best run.", [
      { label: "Start game", action: showGameModeMenu },
      { label: "How to play", action: showMainHowToPlay },
      { label: "Settings", action: showSettingsFromMenu }
    ]);
    overlay.classList.remove("hidden");
  }
  function showGameModeMenu() {
    setOverlay("Choose your mode.", "SELECT GAME MODE", "How would you like to play TETRA NOVA?", [
      { label: "Single Player", action: startGame },
      { label: "Multiplayer", action: () => {
        overlay.classList.add("hidden");
        $("onlinePanel").hidden = false;
        $("onlinePanel").scrollIntoView({ behavior: "smooth", block: "center" });
      } },
      { label: "Back", action: showMainMenu }
    ]);
    overlay.classList.remove("hidden");
  }
  function showMainHowToPlay() {
    const details = `<h3>How to play</h3>
      <p><b>← / →</b> Move · <b>↑</b> Rotate</p>
      <p><b>↓</b> Soft drop · <b>SPACE</b> Hard drop</p>
      <p><b>C</b> Hold · <b>P / ESC</b> Pause</p>
      <p>Fill a horizontal row to clear it. Keep the blocks from reaching the top.</p>
      <div class="detail-actions"><button type="button" id="mainDetailsBack">Back</button><button type="button" id="mainDetailsStart">Start</button></div>`;
    setOverlay("How to play", "QUICK GUIDE", "The goal is to clear as many lines as you can.", [], details);
    $("mainDetailsBack").addEventListener("click", showMainMenu);
    $("mainDetailsStart").addEventListener("click", showGameModeMenu);
  }
  function showSettingsFromMenu() {
    const details = `<h3>Settings</h3>
      <label for="overlaySound">Sound effects <input id="overlaySound" type="checkbox" ${soundOn ? "checked" : ""}></label>
      <label for="overlayMusic">Background music <input id="overlayMusic" type="checkbox" ${musicOn ? "checked" : ""}></label>
      <label class="volume-row" for="musicVolume">Music volume <input id="musicVolume" type="range" min="0" max="0.35" step="0.01" value="${musicVolume}"></label>
      <p>Choose Classic or Modern mode from the game mode panel before starting.</p>
      <div class="detail-actions"><button type="button" id="settingsBack">Back</button><button type="button" id="settingsStart">Start</button></div>`;
    setOverlay("Settings", "PREFERENCES", "Adjust your game experience.", [], details);
    $("overlaySound").addEventListener("change", e => {
      soundOn = e.target.checked;
      $("soundToggle").classList.toggle("muted", !soundOn);
      $("soundToggle").textContent = soundOn ? "♫" : "♩";
      if (soundOn) sound(520, .08, "sine");
    });
    $("overlayMusic").addEventListener("change", e => setMusicEnabled(e.target.checked));
    $("musicVolume").addEventListener("input", e => { musicVolume = Number(e.target.value); });
    $("settingsBack").addEventListener("click", showMainMenu);
    $("settingsStart").addEventListener("click", showGameModeMenu);
  }
  function endGame() {
    running=false; paused=false; gameOver=true;
    stopMusic(true);
    if (onlineMatch) {
      sendOnline({ type:"gameover", score, lines });
      $("pauseButton").disabled = true;
      setOverlay("Defeat.", "MATCH COMPLETE", `You scored ${formatScore(score)}. Your opponent wins this round.`, [
        { label:"Play again", action:requestOnlineRematch }, { label:"Main menu", action:showMainMenu }
      ]);
      overlay.classList.remove("hidden"); sound(150,.35,"sawtooth",.04); startMusic(4); return;
    }
    $("pauseButton").disabled = true;
    leaderboard.push({score,mode:mode==="modern"?"MODERN":"CLASSIC",date:Date.now()});
    leaderboard.sort((a,b)=>b.score-a.score);
    leaderboard=leaderboard.slice(0,5); saveScores(); renderLeaderboard();
    setOverlay("Game over.", "RUN COMPLETE", `You scored ${formatScore(score)} and cleared ${lines} lines.`, [
      { label: "Play again", action: startGame },
      { label: "Main menu", action: showMainMenu }
    ]);
    overlay.classList.remove("hidden");
    sound(150,.35,"sawtooth",.04);
    startMusic(4); // Switch immediately to the dedicated defeat theme.
  }
  function winOnlineMatch() {
    if (!onlineMatch || gameOver) return;
    running=false; paused=false; gameOver=true; remoteGameOver=true; stopMusic(true);
    $("pauseButton").disabled = true;
    setOverlay("Victory!", "MATCH COMPLETE", `Your opponent topped out. Your score: ${formatScore(score)}.`, [
      { label:"Play again", action:requestOnlineRematch }, { label:"Main menu", action:showMainMenu }
    ]);
    overlay.classList.remove("hidden"); sound(880,.2,"triangle",.05);
  }
  function requestOnlineRematch() {
    if (onlineConnection && onlineConnection.open) {
      sendOnline({type:"rematch-request",mode});
      setOverlay("Rematch requested", "WAITING FOR OPPONENT", "Your opponent needs to agree to play again.", [{label:"Main menu",action:showMainMenu}]);
      overlay.classList.remove("hidden");
    } else showMainMenu();
  }

  function startGame() {
    cancelAnimationFrame(animationId);
    stopMusic(true);
    const previousTrack = activeMusicTrack;
    let nextTrack = Math.floor(Math.random() * 4);
    if (nextTrack === previousTrack) nextTrack = (nextTrack + 1 + Math.floor(Math.random() * 3)) % 4;
    activeMusicTrack = nextTrack;
    board=newBoard(); queue=[]; held=null; score=0; lines=0; level=1;
    canHold=true; running=true; paused=false; gameOver=false; lastTime=0; dropCounter=0;
    $("pauseButton").disabled = false;
    $("pauseButton").innerHTML = "Ⅱ <span>PAUSE</span>";
    refillQueue(); spawn(); updateStats(); draw(); drawPreviews();
    clearOverlayDetails();
    overlay.classList.add("hidden");
    animationId=requestAnimationFrame(update);
    startMusic(activeMusicTrack);
  }
  function togglePause() {
    if (onlineMatch || gameOver || !running) return;
    paused=!paused;
    if (paused) {
      stopMusic();
      heldInputs.clear(); activeKeys.clear();
      if (inputFrame) cancelAnimationFrame(inputFrame);
      inputFrame=0; lastInputTime=0;
      $("pauseButton").innerHTML = "▶ <span>RESUME</span>";
      showPauseMenu();
    } else {
      $("pauseButton").innerHTML = "Ⅱ <span>PAUSE</span>";
      clearOverlayDetails();
      overlay.classList.add("hidden"); lastTime=0;
      animationId=requestAnimationFrame(update);
      startMusic();
    }
  }
  function update(time=0) {
    if (!running || paused) return;
    const delta=lastTime ? time-lastTime : 0; lastTime=time; dropCounter+=delta;
    const interval=Math.max(75, 850-(level-1)*65-(mode==="modern"?70:0));
    if (dropCounter>interval) { move(0,1); dropCounter=0; }
    draw();
    if (onlineMatch && time-lastNetworkUpdate>120) {
      lastNetworkUpdate=time;
      sendOnline({type:"state",board,current:current?{type:current.type,matrix:current.matrix,x:current.x,y:current.y}:null,score,lines,level,alive:true});
    }
    animationId=requestAnimationFrame(update);
  }
  function drawCell(context,x,y,size,color,ghost=false) {
    if (ghost) {
      context.strokeStyle=color; context.lineWidth=1.5;
      context.strokeRect(x+2,y+2,size-4,size-4); return;
    }
    context.fillStyle=color; context.fillRect(x+1,y+1,size-2,size-2);
    context.fillStyle="rgba(255,255,255,.22)"; context.fillRect(x+3,y+3,size-6,3);
    context.fillStyle="rgba(0,0,0,.18)"; context.fillRect(x+3,y+size-5,size-6,2);
  }
  function drawMatrix(context,matrix,ox,oy,size,color,ghost=false) {
    matrix.forEach((row,r)=>row.forEach((v,c)=>{ if(v) drawCell(context,ox+c*size,oy+r*size,size,color,ghost); }));
  }
  function draw() {
    if (!ctx || !board) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#080e1a"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle="rgba(130,155,190,.075)"; ctx.lineWidth=1;
    for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*BLOCK+.5,0);ctx.lineTo(x*BLOCK+.5,600);ctx.stroke();}
    for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*BLOCK+.5);ctx.lineTo(300,y*BLOCK+.5);ctx.stroke();}
    board.forEach((row,y)=>row.forEach((type,x)=>{if(type)drawCell(ctx,x*BLOCK,y*BLOCK,BLOCK,COLORS[type]);}));
    if(current) {
      let ghostY=current.y;
      while(!collides(current.matrix,current.x,ghostY+1)) ghostY++;
      drawMatrix(ctx,current.matrix,current.x*BLOCK,ghostY*BLOCK,BLOCK,COLORS[current.type],true);
      drawMatrix(ctx,current.matrix,current.x*BLOCK,current.y*BLOCK,BLOCK,COLORS[current.type]);
    }
  }
  function drawPreview(context,pieces,heldPiece=false) {
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
    context.fillStyle="#0b1322"; context.fillRect(0,0,context.canvas.width,context.canvas.height);
    if(heldPiece) {
      if(!pieces) return;
      const m=SHAPES[pieces.type], size=22;
      const ox=(context.canvas.width-m[0].length*size)/2, oy=(context.canvas.height-m.length*size)/2;
      drawMatrix(context,m,ox,oy,size,COLORS[pieces.type]);
      return;
    }
    pieces.slice(0,5).forEach((piece,i)=>{
      const m=piece.matrix, size=18, oy=i*58+5;
      const ox=(context.canvas.width-m[0].length*size)/2;
      drawMatrix(context,m,ox,oy,size,COLORS[piece.type]);
    });
  }
  function drawPreviews() {
    drawPreview(holdCtx,held,true);
    drawPreview(nextCtx,queue,false);
  }
  function sendOnline(message) {
    if (onlineConnection && onlineConnection.open) { try { onlineConnection.send(message); } catch (e) { console.warn("Online send failed",e); } }
  }
  function roomStatus(message) { $("roomStatus").textContent=message; }
  function cleanupOnline() {
    matchmakingActive=false; matchmakingAttempt="";
    if(matchmakingChannel && matchmakingClient){try{matchmakingClient.removeChannel(matchmakingChannel);}catch{} matchmakingChannel=null;}
    onlineMatch=false; remoteGameOver=false; onlineStarting=false; onlineRole=null;
    if(onlineConnection){try{onlineConnection.close();}catch{} onlineConnection=null;}
    if(peer){try{peer.destroy();}catch{} peer=null;}
    $("opponentCard").hidden=true;
    const arena=$("battleArena"), opponent=$("opponentCard"), right=$("rightPanel") || document.querySelector(".right-panel");
    if(arena && opponent && right && opponent.parentElement===arena) right.prepend(opponent);
    opponent.classList.remove("battle-player","opponent-battle-player");
    document.querySelector(".game-layout")?.classList.remove("online-battle");
    $("connectionPill").innerHTML="<i></i> LOCAL ARCADE";
    $("roomCodeWrap").hidden=true; $("leaveRoomButton").hidden=true;
    if($("cancelMatchButton")) $("cancelMatchButton").hidden=true;
  }
  function renderOpponent(data) {
    if(!opponentCtx||!data)return;
    $("opponentScore").textContent=formatScore(data.score||0); $("opponentLines").textContent=data.lines||0;
    $("opponentStatus").textContent=data.alive===false?"TOPPED OUT":"ONLINE";
    const c=opponentCtx, cell=30; c.clearRect(0,0,300,600); c.fillStyle="#080e1a"; c.fillRect(0,0,300,600);
    c.strokeStyle="rgba(130,155,190,.09)";
    for(let x=0;x<=10;x++){c.beginPath();c.moveTo(x*cell+.5,0);c.lineTo(x*cell+.5,600);c.stroke();}
    for(let y=0;y<=20;y++){c.beginPath();c.moveTo(0,y*cell+.5);c.lineTo(300,y*cell+.5);c.stroke();}
    (data.board||[]).forEach((row,y)=>row.forEach((type,x)=>{if(type)drawCell(c,x*cell,y*cell,cell,COLORS[type]);}));
    if(data.current){let ghostY=data.current.y;while(data.board && ghostY<20 && data.current.matrix.some((r,ry)=>r.some((v,rx)=>v && (ghostY+ry+1>=20 || data.board[ghostY+ry+1]?.[data.current.x+rx]))))break;drawMatrix(c,data.current.matrix,data.current.x*cell,data.current.y*cell,cell,COLORS[data.current.type]);}
  }
  function handleOnlineMessage(data) {
    if(!data||typeof data!=="object")return;
    if(data.type==="state")renderOpponent(data);
    if(data.type==="gameover"){renderOpponent({score:data.score,lines:data.lines,alive:false});winOnlineMatch();}
    if(data.type==="garbage"&&onlineMatch&&running&&!paused){
      const count=Math.min(4,Math.max(0,Number(data.rows)||0));
      for(let i=0;i<count;i++){board.shift();const hole=Math.floor(Math.random()*COLS);board.push(Array.from({length:COLS},(_,x)=>x===hole?null:"Z"));}
      sound(95,.16,"sawtooth",.05);draw();if(current&&collides(current.matrix,current.x,current.y))endGame();
    }
    if(data.type==="rematch-request"){
      if(data.mode==="classic"||data.mode==="modern")setMode(data.mode);
      setOverlay("Rematch?","YOUR OPPONENT IS READY","Your opponent wants another round.",[
        {label:"Accept rematch",action:()=>{sendOnline({type:"rematch-accepted",mode});startOnlineMatch(false);}},
        {label:"Main menu",action:showMainMenu}
      ]);overlay.classList.remove("hidden");
    }
    if(data.type==="rematch-accepted"){if(data.mode==="classic"||data.mode==="modern")setMode(data.mode);startOnlineMatch(false);}
    if(data.type==="start"){if(data.mode==="classic"||data.mode==="modern")setMode(data.mode);startOnlineMatch(false);}
  }
  async function leaveMatchmakingQueue() {
    if(matchmakingChannel && matchmakingClient){const channel=matchmakingChannel;matchmakingChannel=null;try{await matchmakingClient.removeChannel(channel);}catch{}}
    matchmakingActive=false;
  }
  function attachConnection(connection) {
    onlineConnection=connection;
    connection.on("open",()=>{
      leaveMatchmakingQueue();
      $("opponentCard").hidden=false;
      const arena=$("battleArena"), opponent=$("opponentCard");
      if(arena && opponent && opponent.parentElement!==arena){opponent.classList.add("battle-player","opponent-battle-player");arena.appendChild(opponent);}
      document.querySelector(".game-layout")?.classList.add("online-battle");
      $("connectionPill").innerHTML="<i></i> 1V1 CONNECTED";
      $("leaveRoomButton").hidden=false; roomStatus("Friend connected! Starting the match shortly…");
      if(onlineRole==="host"&&!onlineStarting){onlineStarting=true;setTimeout(()=>{sendOnline({type:"start",mode});startOnlineMatch(false);},1200);}
    });
    connection.on("data",handleOnlineMessage);
    connection.on("close",()=>{
      if(onlineMatch&&!gameOver){running=false;onlineMatch=false;stopMusic();setOverlay("Connection lost","PLAYER DISCONNECTED","Your opponent left the room.",[{label:"Main menu",action:showMainMenu}]);overlay.classList.remove("hidden");}
      roomStatus("The connection was closed.");$("opponentStatus").textContent="OFFLINE";
    });
    connection.on("error",e=>roomStatus(`Connection error: ${e.type||"please try again"}.`));
  }
  function startOnlineMatch(notify=false) {
    if(onlineStarting&&running)return;
    onlineMatch=true;remoteGameOver=false;onlineStarting=false;
    if(notify)sendOnline({type:"start",mode});
    startGame();onlineMatch=true;$("pauseButton").disabled=true;$("opponentCard").hidden=false;
    const arena=$("battleArena"), opponent=$("opponentCard");
    if(arena && opponent && opponent.parentElement!==arena){opponent.classList.add("battle-player","opponent-battle-player");arena.appendChild(opponent);}
    document.querySelector(".game-layout")?.classList.add("online-battle");
    roomStatus("Match in progress! Clear 2+ lines to send garbage to your opponent.");
  }
  function matchmakingConfigured() {
    return window.supabase && MATCHMAKING_CONFIG.url.startsWith("https://") &&
      !MATCHMAKING_CONFIG.url.includes("YOUR_") && MATCHMAKING_CONFIG.key && !MATCHMAKING_CONFIG.key.includes("YOUR_");
  }
  function getMatchmakingClient() {
    if(!matchmakingClient && matchmakingConfigured()) matchmakingClient=window.supabase.createClient(MATCHMAKING_CONFIG.url,MATCHMAKING_CONFIG.key);
    return matchmakingClient;
  }
  function startFindMatch() {
    cleanupOnline();
    if(!window.Peer){roomStatus("The online connection service did not load. Refresh and try again.");return;}
    if(!matchmakingConfigured()){
      roomStatus("Find Match needs a free Supabase setup first. Follow the Supabase setup steps in README-MULTIPLAYER.txt, then add your project URL and anon key in script.js.");
      return;
    }
    matchmakingActive=true; matchmakingSession=`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    $("cancelMatchButton").hidden=false; $("leaveRoomButton").hidden=true;
    roomStatus("Searching for another player… keep this tab open.");
    peer=new Peer();
    peer.on("open",async peerId=>{
      if(!matchmakingActive)return;
      const client=getMatchmakingClient();
      matchmakingChannel=client.channel("falling-blocks-public-matchmaking",{config:{presence:{key:matchmakingSession}}});
      matchmakingChannel.on("presence",{event:"sync"},()=>evaluateMatchQueue(peerId));
      matchmakingChannel.on("presence",{event:"join"},()=>evaluateMatchQueue(peerId));
      const status=await new Promise(resolve=>matchmakingChannel.subscribe(s=>resolve(s)));
      if(status!=="SUBSCRIBED"){roomStatus("Could not join the matchmaking queue. Check your Supabase Realtime setup and try again.");return;}
      await matchmakingChannel.track({sessionId:matchmakingSession,peerId,joinedAt:Date.now()});
      roomStatus("Searching… you'll be connected automatically when another player is available.");
      evaluateMatchQueue(peerId);
    });
    peer.on("error",e=>roomStatus(`Matchmaking connection error: ${e.type||"please try again"}.`));
  }
  function evaluateMatchQueue(ownPeerId) {
    if(!matchmakingActive||!matchmakingChannel||!peer||!peer.open)return;
    const state=matchmakingChannel.presenceState();
    const players=Object.values(state).flat().filter(p=>p&&p.sessionId&&p.peerId)
      .sort((a,b)=>(a.joinedAt-b.joinedAt)||a.sessionId.localeCompare(b.sessionId));
    if(players.length<2)return;
    const pair=players.slice(0,2);
    if(!pair.some(p=>p.sessionId===matchmakingSession))return;
    const pairKey=pair.map(p=>p.sessionId).sort().join("|");
    if(matchmakingAttempt===pairKey)return;
    matchmakingAttempt=pairKey;
    const host=pair[0], guest=pair[1];
    if(matchmakingSession===host.sessionId){
      onlineRole="host";
      roomStatus("Match found! Connecting to your opponent…");
      peer.on("connection",c=>{if(!onlineConnection)attachConnection(c);else c.close();});
    } else {
      onlineRole="guest";
      roomStatus("Match found! Connecting to your opponent…");
      const connection=peer.connect(host.peerId,{reliable:true});
      attachConnection(connection);
    }
    $("cancelMatchButton").hidden=true;
  }
  function createOnlineRoom() {
    cleanupOnline();if(!window.Peer){roomStatus("Multiplayer service did not load. Check your internet and refresh.");return;}
    onlineRole="host";const code=String(Math.floor(100000+Math.random()*900000));
    $("roomCodeDisplay").textContent=code;$("roomCodeWrap").hidden=false;$("leaveRoomButton").hidden=false;
    roomStatus("Creating your room… keep this page open and share the code.");
    peer=new Peer(`falling-blocks-${code}`);
    peer.on("open",()=>roomStatus("Room ready. Waiting for your friend to join…"));
    peer.on("connection",c=>{if(onlineConnection){c.close();return;}attachConnection(c);});
    peer.on("error",e=>roomStatus(e.type==="unavailable-id"?"Room code collision. Create another room.":`Room error: ${e.type||"connection failed"}.`));
  }
  function joinOnlineRoom() {
    cleanupOnline();if(!window.Peer){roomStatus("Multiplayer service did not load. Check your internet and refresh.");return;}
    const code=$("roomCodeInput").value.trim();if(!/^\d{6}$/.test(code)){roomStatus("Enter the 6-digit room code from your friend.");return;}
    onlineRole="guest";roomStatus("Connecting to your friend's room…");peer=new Peer();
    peer.on("open",()=>attachConnection(peer.connect(`falling-blocks-${code}`,{reliable:true})));
    peer.on("error",e=>roomStatus(`Could not join room: ${e.type||"check the code"}.`));
  }
  $("closeOnline").addEventListener("click",()=>{$("onlinePanel").hidden=true;});
  $("findMatchButton").addEventListener("click",startFindMatch);
  $("cancelMatchButton").addEventListener("click",()=>{cleanupOnline();roomStatus("Match search cancelled. You can search again or create a private room.");});
  $("hostRoomButton").addEventListener("click",createOnlineRoom);
  $("joinRoomButton").addEventListener("click",joinOnlineRoom);
  $("copyRoomCode").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("roomCodeDisplay").textContent);roomStatus("Room code copied. Send it to your friend!");}catch{roomStatus(`Share this room code: ${$("roomCodeDisplay").textContent}`);}});
  $("leaveRoomButton").addEventListener("click",()=>{cleanupOnline();roomStatus("You left the room. Create or join another room anytime.");});

  function setMode(nextMode) {
    if (running) return;
    mode=nextMode;
    document.querySelectorAll(".mode-button").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===mode));
    $("modeDescription").textContent=mode==="classic"?"Traditional scoring and steady progression.":"Faster pace, bonus drop points and boosted line clears.";
    if (!running) {
      $("overlayText").textContent=mode==="classic"?"Classic mode: traditional scoring and steady progression.":"Modern mode: faster falling and bonus points.";
    }
  }
  $("startButton").addEventListener("click",()=>{ if(paused) togglePause(); else startGame(); });
  $("pauseButton").addEventListener("click", togglePause);
  document.querySelectorAll(".mode-button").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));
  $("soundToggle").addEventListener("click",()=>{
    soundOn=!soundOn; $("soundToggle").classList.toggle("muted",!soundOn);
    $("soundToggle").textContent=soundOn?"♫":"♩";
    if(soundOn) sound(520,.08,"sine");
  });
  $("musicToggle").addEventListener("click", () => setMusicEnabled(!musicOn));
  updateMusicButton();
  // Responsive input: immediate first move, then configurable DAS/ARR repeat.
  const DAS = 145;       // delay before a held direction starts repeating
  const ARR = 42;        // repeat interval for left/right
  const SOFT_DROP_ARR = 38;
  const heldInputs = new Map();
  let inputFrame = 0;
  let lastInputTime = 0;

  function performAction(action) {
    if (action === "left") move(-1);
    else if (action === "right") move(1);
    else if (action === "down") move(0, 1); else if (action === "rotate") rotate();
    else if (action === "drop") hardDrop();
    else if (action === "hold") holdPiece();
  }

  function beginRepeat(action, source) {
    if (heldInputs.has(source)) return;
    performAction(action);
    if (action !== "left" && action !== "right" && action !== "down") return;
    heldInputs.set(source, { action, elapsed: 0, repeating: false });
    if (!inputFrame) inputFrame = requestAnimationFrame(processHeldInputs);
  }

  function endRepeat(source) {
    heldInputs.delete(source);
    if (!heldInputs.size && inputFrame) {
      cancelAnimationFrame(inputFrame);
      inputFrame = 0;
      lastInputTime = 0;
    }
  }

  function processHeldInputs(time) {
    if (!heldInputs.size) {
      inputFrame = 0;
      lastInputTime = 0;
      return;
    }
    const delta = lastInputTime ? Math.min(time - lastInputTime, 50) : 0;
    lastInputTime = time;

    for (const state of heldInputs.values()) {
      state.elapsed += delta;
      if (!state.repeating && state.elapsed >= DAS) {
        state.repeating = true;
        state.elapsed -= DAS;
        performAction(state.action);
      }
      if (state.repeating) {
        const interval = state.action === "down" ? SOFT_DROP_ARR : ARR;
        while (state.elapsed >= interval) {
          state.elapsed -= interval;
          performAction(state.action);
        }
      }
    }
    inputFrame = requestAnimationFrame(processHeldInputs);
  }

  const keyActions = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "rotate",
    " ": "drop",
    c: "hold",
    C: "hold"
  };
  const activeKeys = new Set();

  document.addEventListener("keydown", e => {
    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      e.preventDefault();
      if (!e.repeat) togglePause();
      return;
    }
    const action = keyActions[e.key];
    if (!action) return;
    e.preventDefault();
    if (activeKeys.has(e.key)) return;
    activeKeys.add(e.key);
    beginRepeat(action, `key:${e.key}`);
  });

  document.addEventListener("keyup", e => {
    if (!keyActions[e.key]) return;
    activeKeys.delete(e.key);
    endRepeat(`key:${e.key}`);
  });

  window.addEventListener("blur", () => {
    activeKeys.clear();
    heldInputs.clear();
    if (inputFrame) cancelAnimationFrame(inputFrame);
    inputFrame = 0;
    lastInputTime = 0;
  });

  document.querySelectorAll("[data-action]").forEach(btn => {
    const action = btn.dataset.action;
    const source = `touch:${action}`;
    btn.addEventListener("pointerdown", e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      beginRepeat(action, source);
    });
    const stop = e => {
      if (e) e.preventDefault();
      endRepeat(source);
    };
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("lostpointercapture", stop);
    btn.addEventListener("contextmenu", e => e.preventDefault());
  });

  board=newBoard(); queue=[]; refillQueue(); draw(); drawPreviews(); updateStats(); renderLeaderboard();
  $("modeDescription").textContent="Traditional scoring and steady progression.";
  showMainMenu();
})();