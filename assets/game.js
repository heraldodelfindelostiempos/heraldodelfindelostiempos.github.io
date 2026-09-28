(() => {
  const canvas = document.getElementById('heraldo-game');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const startButton = document.getElementById('game-start');
  const punchButton = document.getElementById('game-punch');
  const scoreLabel = document.getElementById('game-score');
  const status = document.getElementById('game-status');
  const en = document.documentElement.lang === 'en';
  const words = en ? {
    ready: 'Press start.', playing: 'The Herald advances. Time your punches.',
    over: 'End of transmission. Hits: ', retry: 'RETRY',
    loading: 'Loading file…', error: 'The game assets could not be loaded.',
    start: 'START', end: 'GAME OVER', hit: 'HIT!', vero: 'VERO! +1000 · APPROPRIATE CHANGE CANCELLED'
  } : {
    ready: 'Pulsa comenzar.', playing: 'El Heraldo avanza. Calcula cada golpe.',
    over: 'Fin de la transmisión. Golpes: ', retry: 'REINTENTAR',
    loading: 'Cargando archivo…', error: 'No se pudieron cargar los recursos del juego.',
    start: 'COMENZAR', end: 'FIN DE PARTIDA', hit: '¡GOLPE!', vero: '¡VERO! +1000 · CAMBIO PERTINENTE CANCELADO'
  };
  const images = {};
  const sources = {hero:'assets/heraldo-game.png', enemy:'assets/yakuza-game.png', vero:'assets/vero-retrato.svg', street:'assets/calle-game.png?v=14000876'};
  let loaded = 0, available = false, running = false, ended = false;
  let elapsed = 0, score = 0, spawnIn = .8, punchFor = 0, cooldown = 0, flashFor = 0, last = 0;
  let enemies = [];
  const heroX = 54, heroY = 91, heroSize = 143, enemySize = 135;

  function overlay(label) {
    ctx.fillStyle = 'rgba(5,12,10,.85)';
    ctx.fillRect(198, 99, 244, 42);
    ctx.strokeStyle = '#c3c89d';
    ctx.strokeRect(198, 99, 244, 42);
    ctx.fillStyle = '#e4e6c5';
    ctx.font = 'bold 19px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, 320, 126);
    ctx.textAlign = 'left';
  }
  function render() {
    ctx.clearRect(0, 0, 640, 240);
    if (!available) {
      ctx.fillStyle = '#0b1512';
      ctx.fillRect(0, 0, 640, 240);
      overlay(loaded < 4 ? words.loading : words.error);
      return;
    }
    const bgWidth = 720;
    const scroll = (elapsed * 39) % bgWidth;
    for (let x = -scroll; x < 640; x += bgWidth) ctx.drawImage(images.street, Math.floor(x), 0, bgWidth, 240);
    const bob = running ? Math.round(Math.sin(elapsed * 18) * 2) : 0;
    const frame = punchFor > 0 ? 1 : 0;
    ctx.drawImage(images.hero, frame * 887, 0, 887, 887, heroX, heroY + bob, heroSize, heroSize);
    for (const enemy of enemies) {
      if (enemy.vero) {
        const y=98 + Math.round(Math.sin(elapsed * 14 + enemy.phase) * 2);
        ctx.save();ctx.fillStyle='#151011';ctx.fillRect(Math.round(enemy.x)+15,y+5,enemySize-30,enemySize-5);ctx.strokeStyle='#a72b32';ctx.lineWidth=3;ctx.strokeRect(Math.round(enemy.x)+15,y+5,enemySize-30,enemySize-5);ctx.drawImage(images.vero,Math.round(enemy.x)+18,y+8,enemySize-36,enemySize-11);ctx.fillStyle='#ef3340';ctx.font='bold 11px monospace';ctx.fillText('VERO',Math.round(enemy.x)+48,y+129);ctx.restore();
      } else ctx.drawImage(images.enemy, Math.round(enemy.x), 98 + Math.round(Math.sin(elapsed * 14 + enemy.phase) * 2), enemySize, enemySize);
    }
    if (flashFor > 0) {
      ctx.fillStyle = '#f4dd8a';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(flashFor > .65 ? words.vero : words.hit, flashFor > .65 ? 132 : 200, 113);
    }
    if (!running) overlay(ended ? words.end : words.start);
  }
  function finish() {
    running = false;
    ended = true;
    punchButton.disabled = true;
    startButton.disabled = false;
    startButton.textContent = words.retry;
    status.textContent = words.over + score;
    render();
  }
  function tick(timestamp) {
    if (!running) return;
    if (!last) last = timestamp;
    const dt = Math.min((timestamp - last) / 1000, .04);
    last = timestamp;
    elapsed += dt;
    punchFor = Math.max(0, punchFor - dt);
    cooldown = Math.max(0, cooldown - dt);
    flashFor = Math.max(0, flashFor - dt);
    const speed = Math.min(360, 125 + elapsed * 2.4 + Math.min(score,30) * 9);
    spawnIn -= dt;
    if (spawnIn <= 0) {
      enemies.push({x:650, phase:Math.random() * 6, vero:Math.random()<.07});
      spawnIn = Math.max(.62, 1.85 - elapsed * .018 - score * .028);
    }
    for (const enemy of enemies) enemy.x -= speed * dt;
    if (punchFor > 0) {
      let gained=0,hitVero=false;
      enemies = enemies.filter(enemy => {
        const hit=enemy.x >= heroX + 71 && enemy.x <= heroX + 147;
        if(hit){gained += enemy.vero ? 1000 : 1;if(enemy.vero)hitVero=true;}
        return !hit;
      });
      if(gained){
        score += gained;
        scoreLabel.textContent=String(score);
        flashFor=hitVero ? .9 : .3;
        if(hitVero) status.textContent=words.vero;
      }
    }
    if (enemies.some(enemy => enemy.x < heroX + 72)) { finish(); return; }
    render();
    requestAnimationFrame(tick);
  }
  function start() {
    if (!available || running) return;
    elapsed = 0; score = 0; spawnIn = .8; punchFor = 0; cooldown = 0; flashFor = 0; last = 0;
    enemies = [];
    scoreLabel.textContent = '0';
    running = true; ended = false;
    startButton.disabled = true;
    punchButton.disabled = false;
    status.textContent = words.playing;
    requestAnimationFrame(tick);
  }
  function punch() {
    if (!running || cooldown > 0) return;
    punchFor = .3;
    cooldown = .42;
  }
  startButton.disabled = true;
  startButton.addEventListener('click', start);
  punchButton.addEventListener('click', punch);
  window.addEventListener('keydown', event => {
    if (!running || event.code !== 'Space' || event.repeat ||
        /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
    event.preventDefault();
    punch();
  });
  document.addEventListener('visibilitychange', () => { last = 0; });
  for (const [key, src] of Object.entries(sources)) {
    const img = new Image();
    img.onload = () => {
      images[key] = img;
      if (++loaded === 4) {
        available = true;
        startButton.disabled = false;
        status.textContent = words.ready;
        render();
      }
    };
    img.onerror = () => { loaded = 4; status.textContent = words.error; render(); };
    img.src = src;
  }
  render();
})();
