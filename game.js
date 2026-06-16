// HYPER ARCADE - GAME ENGINE

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 48;
}
window.addEventListener('resize', resizeCanvas);

let state = { score: 0, lives: 3, level: 1, running: false, frame: 0 };
let player = { x: 0, y: 0, w: 40, h: 40, speed: 6, trail: [], invincible: 0 };
let keys = {};
let touch = { active: false, x: 0, y: 0 };

document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);
canvas.addEventListener('touchstart', e => { e.preventDefault(); touch.active = true; touch.x = e.touches[0].clientX; touch.y = e.touches[0].clientY - 48; }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); touch.x = e.touches[0].clientX; touch.y = e.touches[0].clientY - 48; }, { passive: false });
canvas.addEventListener('touchend', () => touch.active = false);

let obstacles = [], particles = [], collectibles = [];

function spawnObstacle() {
  const types = ['horizontal', 'vertical', 'diagonal', 'homing'];
  const type = types[Math.floor(Math.random() * (state.level < 3 ? 2 : types.length))];
  const size = 20 + Math.random() * 20;
  const speed = (2 + state.level * 0.5) * (0.8 + Math.random() * 0.4);
  let obs = { type, size, speed, color: '#ff4444', active: true };
  if (type === 'horizontal') { obs.x = canvas.width + size; obs.y = Math.random() * canvas.height; obs.vx = -speed; obs.vy = 0; }
  else if (type === 'vertical') { obs.x = Math.random() * canvas.width; obs.y = -size; obs.vx = 0; obs.vy = speed; }
  else if (type === 'diagonal') { obs.x = canvas.width + size; obs.y = Math.random() * canvas.height; obs.vx = -speed; obs.vy = (Math.random() - 0.5) * speed; }
  else { obs.x = canvas.width + size; obs.y = Math.random() * canvas.height; obs.vx = -speed * 0.6; obs.vy = 0; obs.color = '#ff00ff'; }
  obstacles.push(obs);
}

function spawnCollectible() {
  collectibles.push({ x: canvas.width + 20, y: 50 + Math.random() * (canvas.height - 100), r: 12, vx: -(2 + state.level * 0.3), type: Math.random() < 0.2 ? 'life' : 'coin', angle: 0, active: true });
}

function burst(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const speed = 2 + Math.random() * 4;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color, size: 3 + Math.random() * 4 });
  }
}

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX, dy = cy - nearY;
  return dx * dx + dy * dy < cr * cr;
}

function update() {
  if (!state.running) return;
  state.frame++;
  state.score += 1;
  if (state.score % 500 === 0) state.level = Math.min(10, state.level + 1);
  const spd = player.speed + state.level * 0.3;
  if (touch.active) {
    const dx = touch.x - player.x, dy = touch.y - player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 5) { player.x += (dx / dist) * spd; player.y += (dy / dist) * spd; }
  } else {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= spd;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += spd;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) player.y -= spd;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) player.y += spd;
  }
  player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
  player.y = Math.max(20, Math.min(canvas.height - 20, player.y));
  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > 12) player.trail.shift();
  if (player.invincible > 0) player.invincible--;
  const spawnRate = Math.max(20, 60 - state.level * 4);
  if (state.frame % spawnRate === 0) spawnObstacle();
  if (state.frame % 90 === 0) spawnCollectible();
  obstacles.forEach(obs => {
    if (obs.type === 'homing') {
      const dx = player.x - obs.x, dy = player.y - obs.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      obs.vy += (dy / dist) * 0.15;
      obs.vy = Math.max(-3, Math.min(3, obs.vy));
    }
    obs.x += obs.vx; obs.y += obs.vy;
    if (obs.x < -100 || obs.x > canvas.width + 100 || obs.y > canvas.height + 100 || obs.y < -100) obs.active = false;
    if (obs.active && player.invincible === 0) {
      if (circleRect(player.x, player.y, 16, obs.x - obs.size/2, obs.y - obs.size/2, obs.size, obs.size)) {
        hit(); obs.active = false; burst(obs.x, obs.y, obs.color, 15);
      }
    }
  });
  collectibles.forEach(c => {
    c.x += c.vx; c.angle += 0.05;
    if (c.x < -40) c.active = false;
    const dx = player.x - c.x, dy = player.y - c.y;
    if (Math.sqrt(dx*dx + dy*dy) < 28) {
      c.active = false;
      if (c.type === 'life' && state.lives < 3) { state.lives++; burst(c.x, c.y, '#00ff88', 10); }
      else { state.score += 50; burst(c.x, c.y, '#ffd700', 8); }
    }
  });
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.03; });
  obstacles = obstacles.filter(o => o.active);
  collectibles = collectibles.filter(c => c.active);
  particles = particles.filter(p => p.life > 0);
  document.getElementById('scoreDisplay').textContent = 'Score: ' + state.score;
  document.getElementById('livesDisplay').textContent = '❤️'.repeat(state.lives);
  document.getElementById('levelDisplay').textContent = 'Level ' + state.level;
}

function hit() {
  state.lives--;
  player.invincible = 90;
  burst(player.x, player.y, '#ff4444', 20);
  if (state.lives <= 0) gameOver();
}

function draw() {
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(0,245,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  player.trail.forEach((t, i) => {
    ctx.save(); ctx.globalAlpha = i / player.trail.length * 0.4; ctx.fillStyle = '#00f5ff';
    ctx.beginPath(); ctx.arc(t.x, t.y, (i / player.trail.length) * 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });
  if (player.invincible === 0 || Math.floor(player.invincible / 6) % 2 === 0) {
    ctx.save(); ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 20; ctx.fillStyle = '#00f5ff';
    ctx.beginPath(); ctx.arc(player.x, player.y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(player.x, player.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  obstacles.forEach(obs => {
    ctx.save(); ctx.shadowColor = obs.color; ctx.shadowBlur = 15; ctx.fillStyle = obs.color;
    ctx.fillRect(obs.x - obs.size/2, obs.y - obs.size/2, obs.size, obs.size); ctx.restore();
  });
  collectibles.forEach(c => {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
    ctx.font = (c.r * 2) + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.type === 'life' ? '❤️' : '⭐', 0, 0); ctx.restore();
  });
  particles.forEach(p => {
    ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showStart() { showScreen('startScreen'); loadTopScores(); }

function startGame() {
  const name = document.getElementById('playerName').value.trim() || 'Spieler';
  localStorage.setItem('playerName', name);
  state = { score: 0, lives: 3, level: 1, running: true, frame: 0 };
  obstacles = []; particles = []; collectibles = [];
  showScreen('gameScreen');
  // Resize AFTER screen is visible so canvas gets correct dimensions
  resizeCanvas();
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.trail = [];
  player.invincible = 0;
}

function gameOver() {
  state.running = false;
  saveScore(state.score);
  document.getElementById('finalScore').textContent = state.score;
  const scores = getScores();
  const rank = scores.findIndex(s => s.score === state.score) + 1;
  const msg = rank === 1 ? '🥇 Neuer Rekord!' : rank <= 3 ? '🏆 Platz ' + rank + ' in der Bestenliste!' : 'Du bist auf Platz ' + rank + '!';
  document.getElementById('rankMessage').textContent = msg;
  showScreen('gameOverScreen');
}

function showLeaderboard() {
  const scores = getScores();
  const medals = ['🥇', '🥈', '🥉'];
  const classes = ['gold', 'silver', 'bronze'];
  document.getElementById('leaderboardList').innerHTML = scores.length === 0
    ? '<p style="color:#555;margin-top:20px">Noch keine Scores. Spiel los!</p>'
    : scores.map((s, i) => '<div class="lb-entry ' + (classes[i] || '') + '"><span class="lb-rank">' + (medals[i] || (i+1)+'.') + '</span><span class="lb-name">' + s.name + '</span><span class="lb-score">' + s.score + '</span></div>').join('');
  showScreen('leaderboardScreen');
}

function loadTopScores() {
  const scores = getScores().slice(0, 3);
  document.getElementById('topScores').innerHTML = scores.map((s, i) =>
    '<div class="lb-entry ' + (['gold','silver','bronze'][i] || '') + '"><span class="lb-rank">' + ['🥇','🥈','🥉'][i] + '</span><span class="lb-name">' + s.name + '</span><span class="lb-score">' + s.score + '</span></div>'
  ).join('');
}

function getScores() { return JSON.parse(localStorage.getItem('hyperArcadeScores') || '[]'); }

function saveScore(score) {
  const name = localStorage.getItem('playerName') || 'Spieler';
  const scores = getScores();
  scores.push({ name, score, date: new Date().toLocaleDateString('de-DE') });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem('hyperArcadeScores', JSON.stringify(scores.slice(0, 20)));
}

function shareScore() {
  const score = state.score;
  const name = localStorage.getItem('playerName') || 'Spieler';
  const text = '🎮 ' + name + ' hat ' + score + ' Punkte in Hyper Arcade erreicht! Kannst du das toppen? 👾';
  if (navigator.share) { navigator.share({ title: 'Hyper Arcade', text }); }
  else { navigator.clipboard.writeText(text); alert('Score kopiert!'); }
}

const savedName = localStorage.getItem('playerName');
if (savedName) document.getElementById('playerName').value = savedName;
loadTopScores();
resizeCanvas();
loop();
