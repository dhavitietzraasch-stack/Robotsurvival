/* ================================================================
   SIGNAL LOST — scanner.js  v2.0
   Sistema de Scanner: UNIDADE-7 escaneia blocos para catalogá-los
   antes de poder usá-los como recursos.

   INTEGRAÇÃO:
   - Carregado APÓS game.js no index.html
   - game.js já chama resetScanner() em startGame (hook preparado)
   - Tecla [G] mantida sobre tile próximo = escanear
   - updateScanner() é chamado de dentro de updateRobot() em game.js:
       if(typeof updateScanner==='function') updateScanner();
   - drawScannerHUD() é chamado em draw() via hook em game.js:
       draw() precisa chamar drawScannerHUD() — injetado abaixo.

   MECÂNICA:
   • Player aponta cursor para tile próximo (≤3 tiles de raio)
   • Pressiona [G] e mantém pressionado durante o scan
   • Barra de progresso aparece no player com linha até o tile
   • Tile escaneado = catalogado no banco de dados da UNIDADE-7
   • Blocos não escaneados ainda são visíveis, mas mostram "?"
     no hover e não podem ser coletados como recurso
   • Score bônus por raridade ao catalogar novo material
   ================================================================ */
'use strict';

// ── Banco de dados de materiais escaneados ────────────────────────
const ScannedDB = new Set();

// ── Definição de materiais escaneáveis (tileId → config) ─────────
const SCANNABLE = {
  // terrain
  [4  /*GRASS*/]:        { name:'Pradaria',          scanTime:40,  rarity:0 },
  [5  /*FOREST*/]:       { name:'Floresta',           scanTime:50,  rarity:0 },
  [3  /*SAND*/]:         { name:'Areia',              scanTime:35,  rarity:0 },
  [6  /*ROCK*/]:         { name:'Rocha',              scanTime:60,  rarity:1, aria:'Material sólido. Densidade: alta.' },
  [7  /*SNOW*/]:         { name:'Neve',               scanTime:30,  rarity:0 },
  [9  /*ICE*/]:          { name:'Gelo',               scanTime:45,  rarity:1, aria:'Cristalização H₂O. Dielétrico.' },
  [10 /*DESERT*/]:       { name:'Areia do Deserto',   scanTime:38,  rarity:0 },
  [19 /*MUSHROOM*/]:     { name:'Fungo Alienígena',   scanTime:80,  rarity:2, aria:'Componentes bioluminescentes detectados.' },
  [20 /*SWAMP*/]:        { name:'Pântano',            scanTime:55,  rarity:0 },
  [21 /*TOXIC*/]:        { name:'Resíduo Tóxico',     scanTime:100, rarity:3, aria:'PERIGO. Neurotóxico. Analisando com cuidado.' },
  [8  /*LAVA*/]:         { name:'Magma Ativo',        scanTime:120, rarity:3, aria:'1200°C. Basáltico. Scanner superaquecendo.' },
  [22 /*VOLCANIC_ASH*/]: { name:'Cinza Vulcânica',    scanTime:55,  rarity:1, aria:'Sílica abrasiva catalogada.' },
  [23 /*CORAL*/]:        { name:'Coral Alienígena',   scanTime:90,  rarity:3, aria:'Biológico complexo. Potencial biomaterial.' },
  [24 /*TUNDRA*/]:       { name:'Tundra',             scanTime:45,  rarity:0 },
  [25 /*SAVANNA*/]:      { name:'Savana',             scanTime:40,  rarity:0 },
  // minerais
  [11 /*DIRT*/]:         { name:'Terra',              scanTime:40,  rarity:0 },
  [12 /*STONE*/]:        { name:'Pedra',              scanTime:70,  rarity:1, aria:'Sedimentar. Integridade estrutural boa.' },
  [13 /*IRON*/]:         { name:'Minério de Ferro',   scanTime:90,  rarity:2, aria:'Fe²⁺ detectado. Pureza: 78%.' },
  [14 /*CRYSTAL*/]:      { name:'Cristal Energético', scanTime:120, rarity:3, aria:'ANOMALIA. Fótons coerentes. Fonte de energia!' },
  [15 /*OBSIDIAN*/]:     { name:'Obsidiana',          scanTime:110, rarity:2, aria:'Vidro vulcânico. Dureza extrema.' },
  // subsolo
  [17 /*CAVE_WALL*/]:    { name:'Parede de Caverna',  scanTime:60,  rarity:1 },
  [18 /*CAVE_FLOOR*/]:   { name:'Chão de Caverna',    scanTime:45,  rarity:0 },
  [34 /*CRYSTAL_FLOOR*/]:{ name:'Chão Cristalino',    scanTime:100, rarity:2, aria:'Cristalização no chão. Energia residual.' },
  // void
  [30 /*VOID_FLOOR*/]:   { name:'Assoalho do Void',   scanTime:150, rarity:4, aria:'Material dimensional. Origem desconhecida.' },
  [35 /*GHOST_GRASS*/]:  { name:'Grama Fantasma',     scanTime:130, rarity:4, aria:'Tecido orgânico interdimensional.' },
  [36 /*RUNE_STONE*/]:   { name:'Runa Antiga',        scanTime:180, rarity:4, aria:'Inscrições desconhecidas. Protocolo NEXUS?' },
  // construção
  [16 /*BUILT_BLOCK*/]:  { name:'Bloco Construído',   scanTime:25,  rarity:0 },
  [26 /*REINFORCED*/]:   { name:'Bloco Reforçado',    scanTime:60,  rarity:1 },
  [37 /*GLASS_BLOCK*/]:  { name:'Vidro',              scanTime:50,  rarity:1 },
  [38 /*COPPER_BLOCK*/]: { name:'Bloco de Cobre',     scanTime:70,  rarity:1, aria:'Condutividade elétrica elevada.' },
  [39 /*CRYSTAL_WALL*/]: { name:'Parede Cristalina',  scanTime:90,  rarity:2 },
  [27 /*TRAP_SLOW*/]:    { name:'Armadilha Lenta',    scanTime:80,  rarity:2 },
  [28 /*TRAP_DAMAGE*/]:  { name:'Armadilha de Dano',  scanTime:80,  rarity:2 },
  [29 /*SPIKE_BLOCK*/]:  { name:'Bloco de Espinhos',  scanTime:80,  rarity:2 },
};

const RARITY_COLOR = ['#94a3b8','#22c55e','#3b82f6','#a855f7','#f59e0b'];
const RARITY_NAME  = ['Comum','Incomum','Raro','Épico','Lendário'];
let _scanRangeBase = 3; // tiles de raio (pode ser aumentado por upgrade)
// Alias compatível com game.js (applyPassiveBonuses usa SCANNER.scanRange)
const SCANNER = { get scanRange(){ return _scanRangeBase; }, set scanRange(v){ _scanRangeBase=v; } };
function getScanRange(){ return _scanRangeBase; }

// ── Estado do scanner ─────────────────────────────────────────────
const Scanner = {
  active:   false,
  progress: 0,
  tileId:   null,
  tx: 0, ty: 0,
  totalFrames: 0,
  cooldown: 0,
  keyHeld:  false,
  newScan:  null,  // { name, rarity } — notificação pós-scan
  scanTimer: 0,    // para fade da notificação
  stats: [0,0,0,0,0], // contagem por raridade
};

// ── Checar se tile pode ser escaneado e está no range ────────────
function canScanAt(tx, ty) {
  if (typeof inBounds !== 'function' || !inBounds(tx, ty)) return false;
  const t = getTile(tx, ty);
  if (!SCANNABLE[t]) return false;
  const bx = (tx + 0.5) * TILE, by = (ty + 0.5) * TILE;
  return Math.hypot(robot.x - bx, robot.y - by) <= getScanRange() * TILE;
}

function getTileAtCursor() {
  if (typeof mouseWorld === 'undefined') return null;
  const tx = Math.floor(mouseWorld.x / TILE);
  const ty = Math.floor(mouseWorld.y / TILE);
  if (!canScanAt(tx, ty)) return null;
  return { tx, ty, t: getTile(tx, ty) };
}

// ── Iniciar scan ──────────────────────────────────────────────────
function beginScan(tx, ty, t) {
  const def = SCANNABLE[t];
  if (ScannedDB.has(t)) {
    if (typeof showAlert === 'function') showAlert(`[SCAN] ${def.name} — já catalogado`);
    return;
  }
  Scanner.active = true;
  Scanner.progress = 0;
  Scanner.tileId = t;
  Scanner.tx = tx;
  Scanner.ty = ty;
  Scanner.totalFrames = def.scanTime;
}

function cancelScan() {
  Scanner.active = false;
  Scanner.progress = 0;
}

function completeScan() {
  const t = Scanner.tileId;
  const def = SCANNABLE[t];
  Scanner.active = false;
  Scanner.progress = 0;
  Scanner.cooldown = 18;

  if (ScannedDB.has(t)) return;
  ScannedDB.add(t);
  Scanner.stats[def.rarity]++;

  const scoreBonus = [5, 15, 40, 100, 300][def.rarity] || 5;
  if (typeof score !== 'undefined') score += scoreBonus;

  // Partículas
  const bx = (Scanner.tx + 0.5) * TILE;
  const by = (Scanner.ty + 0.5) * TILE;
  if (typeof spawnBurst === 'function')
    spawnBurst(bx, by, RARITY_COLOR[def.rarity], 14, 3);

  // Alert + ARIA
  const msg = def.aria
    ? `[SCAN] ${def.name} — ${def.aria}`
    : `[SCAN] ${def.name} catalogado (+${scoreBonus}pts)`;
  if (typeof showAlert === 'function') showAlert(msg);

  Scanner.newScan = { name: def.name, rarity: def.rarity };
  Scanner.scanTimer = 200;
}

// ── Update (chamado dentro de updateRobot em game.js) ────────────
function updateScanner() {
  if (Scanner.cooldown > 0) Scanner.cooldown--;
  if (Scanner.scanTimer > 0) {
    Scanner.scanTimer--;
    if (Scanner.scanTimer <= 0) Scanner.newScan = null;
  }

  if (!Scanner.keyHeld) {
    if (Scanner.active) cancelScan();
    return;
  }

  // Verificar tile alvo ainda válido
  const cur = getTileAtCursor();
  if (!cur) { cancelScan(); return; }

  // Se tile mudou, cancelar
  if (Scanner.active && (cur.tx !== Scanner.tx || cur.ty !== Scanner.ty)) {
    cancelScan();
  }

  if (!Scanner.active && Scanner.cooldown <= 0) {
    beginScan(cur.tx, cur.ty, cur.t);
  }

  if (!Scanner.active) return;

  // Verificar que player não está correndo (velocidade > 2.5 cancela)
  if (typeof robot !== 'undefined') {
    const spd = Math.hypot(robot.vx || 0, robot.vy || 0);
    if (spd > 2.5) {
      cancelScan();
      if (typeof showAlert === 'function') showAlert('[SCAN] Mova-se devagar para escanear');
      return;
    }
    // Custo energético leve
    robot.energy = Math.max(0, robot.energy - 0.025);
  }

  Scanner.progress += 1 / Scanner.totalFrames;
  if (Scanner.progress >= 1) completeScan();
}

// ── Reset ao iniciar jogo (chamado por startGame em game.js) ─────
function resetScanner() {
  ScannedDB.clear();
  Scanner.active = false;
  Scanner.progress = 0;
  Scanner.tileId = null;
  Scanner.keyHeld = false;
  Scanner.cooldown = 0;
  Scanner.newScan = null;
  Scanner.scanTimer = 0;
  Scanner.stats.fill(0);
  // Pré-catalogar tiles básicos que o robô já conhece
  const preKnown = [4/*GRASS*/, 18/*CAVE_FLOOR*/, 16/*BUILT_BLOCK*/];
  for (const t of preKnown) {
    if (SCANNABLE[t]) { ScannedDB.add(t); Scanner.stats[0]++; }
  }
}

// ── Verificar se um tile de construção está descoberto ───────────
// Blocos de construção básicos (BUILT_BLOCK) sempre estão disponíveis.
// Os demais exigem que o tile correspondente tenha sido escaneado no ScannedDB.
// Em modo criativo tudo está liberado.
function isBlockDiscovered(buildTypeId){
  if(typeof gameMode !== 'undefined' && typeof GAME_MODES !== 'undefined'){
    if(gameMode === GAME_MODES.CREATIVE) return true;
  }
  // Bloco básico sempre disponível
  if(buildTypeId === T.BUILT_BLOCK) return true;
  // Verificar se o tile foi escaneado
  if(ScannedDB.has(buildTypeId)) return true;
  // Blocos de construção especiais mapeados para o tile que os representa
  // (TRAP_SLOW/TRAP_DAMAGE/SPIKE_BLOCK não têm equivalente escaneável — liberar por padrão)
  const noScanNeeded = new Set([T.TRAP_SLOW, T.TRAP_DAMAGE, T.SPIKE_BLOCK]);
  if(noScanNeeded.has(buildTypeId)) return true;
  return false;
}
document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.key.toLowerCase() === 'g') {
    Scanner.keyHeld = true;
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() === 'g') {
    Scanner.keyHeld = false;
    cancelScan();
  }
});

// ── drawScannerHUD ───────────────────────────────────────────────
function drawScannerHUD() {
  if (typeof running === 'undefined' || !running) return;
  if (typeof ctx === 'undefined' || typeof W === 'undefined') return;

  const cur = getTileAtCursor();
  const rx = robot.x - cam.x + W / 2;
  const ry = robot.y - cam.y + H / 2;

  // ── Highlight do tile sob o cursor (se escaneável) ───────────
  if (cur) {
    const def = SCANNABLE[cur.t];
    const col = RARITY_COLOR[def.rarity];
    const sx = cur.tx * TILE - cam.x + W / 2;
    const sy = cur.ty * TILE - cam.y + H / 2;
    const pulse = 0.6 + Math.sin(typeof time !== 'undefined' ? time * 0.12 : 0) * 0.3;

    ctx.save();
    // Borda pulsante no tile
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = pulse;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(sx, sy, TILE, TILE);
    ctx.setLineDash([]);

    // Label acima do tile
    const known = ScannedDB.has(cur.t);
    ctx.globalAlpha = 0.9;
    ctx.font = '7px "Share Tech Mono",monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    const label = known
      ? `✓ ${def.name}`
      : `[G] ${def.name} · ${RARITY_NAME[def.rarity]}`;
    ctx.fillText(label, sx + TILE / 2, sy - 4);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Barra de progresso do scan ────────────────────────────────
  if (Scanner.active) {
    const def = SCANNABLE[Scanner.tileId];
    const col = RARITY_COLOR[def.rarity];
    const bw = 110, bh = 9;
    const bx = rx - bw / 2, by = ry - 50;

    ctx.save();

    // Label do material
    ctx.font = 'bold 9px "Orbitron",sans-serif';
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.fillText(`SCAN: ${def.name.toUpperCase()}`, rx, by - 5);
    ctx.shadowBlur = 0;

    // Track
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    _roundBar(ctx, bx - 1, by - 1, bw + 2, bh + 2, 4);

    // Fill
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.88;
    _roundBar(ctx, bx, by, bw * Scanner.progress, bh, 4);
    ctx.globalAlpha = 1;

    // Percent
    ctx.font = '7px "Share Tech Mono",monospace';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
    ctx.fillText(`${(Scanner.progress * 100).toFixed(0)}%`, rx, by + bh - 1);
    ctx.shadowBlur = 0;

    // Linha player → tile
    const tx2 = Scanner.tx * TILE + TILE / 2 - cam.x + W / 2;
    const ty2 = Scanner.ty * TILE + TILE / 2 - cam.y + H / 2;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.28;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(tx2, ty2); ctx.stroke();
    ctx.setLineDash([]);

    // Pulso no tile alvo
    const p2 = 0.5 + Math.sin((typeof time !== 'undefined' ? time : 0) * 0.2) * 0.4;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.globalAlpha = p2;
    ctx.strokeRect(Scanner.tx * TILE - cam.x + W / 2, Scanner.ty * TILE - cam.y + H / 2, TILE, TILE);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ── Notificação de novo scan ───────────────────────────────────
  if (Scanner.newScan) {
    const { name, rarity } = Scanner.newScan;
    const alpha = Math.min(1, Scanner.scanTimer / 40);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 11px "Orbitron",sans-serif';
    ctx.fillStyle = RARITY_COLOR[rarity];
    ctx.textAlign = 'center';
    ctx.shadowColor = RARITY_COLOR[rarity];
    ctx.shadowBlur = 14;
    ctx.fillText(`✦ NOVO: ${name} [${RARITY_NAME[rarity]}]`, W / 2, H / 2 + 68);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Mini painel de status (canto esquerdo, acima do teleporte) ─
  _drawScanPanel();
}

function _drawScanPanel() {
  const total = ScannedDB.size;
  if (total === 0) return;

  const allCount = Object.keys(SCANNABLE).length;
  const bx = 14, by = H - 98;

  ctx.save();
  ctx.fillStyle = 'rgba(4,10,22,0.72)';
  _roundRect(ctx, bx, by, 92, 24, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,229,255,0.28)'; ctx.lineWidth = 1;
  _roundRect(ctx, bx, by, 92, 24, 5); ctx.stroke();

  ctx.font = 'bold 7px "Orbitron",sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'left';
  ctx.fillText('SCANNER', bx + 5, by + 9);

  ctx.font = '7px "Share Tech Mono",monospace';
  ctx.fillStyle = 'rgba(150,230,255,0.75)';
  ctx.fillText(`${total}/${allCount} catalogados`, bx + 5, by + 19);
  ctx.restore();
}

function _roundBar(c, x, y, w, h, r) {
  if (w <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  c.lineTo(x + w, y + h - r); c.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  c.lineTo(x + r, y + h); c.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, -Math.PI / 2);
  c.closePath(); c.fill();
}

function _roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

// ── Hook em draw() para incluir drawScannerHUD ───────────────────
// game.js define draw() como function declaration.
// Fazemos wrap via window.draw após carregamento.
(function hookScannerDraw() {
  const _origDraw = typeof draw === 'function' ? draw : null;
  window.draw = function draw() {
    if (_origDraw) _origDraw();
    if (typeof running !== 'undefined' && running) drawScannerHUD();
  };
})();

// Inicializar
resetScanner();

console.log('[scanner.js] Sistema de Scanner v2.0 carregado.');
console.log('[scanner.js] Tecla [G] sobre tile próximo = escanear. Requer quietude (vel < 2.5).');
