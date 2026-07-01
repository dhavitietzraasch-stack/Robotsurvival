/* ============================================================
   SIGNAL LOST — systems.js  v3.0
   Inventário, Crafting Avançado, Itens de Bioma, Minérios
   (Ciclo dia/noite REMOVIDO — versão beta sem iluminação dinâmica)
   ============================================================ */
'use strict';

// ─── Stub de dia/noite (desabilitado) ──────────────────────────
// Mantemos o objeto DAY para compatibilidade com referências
// existentes no código, mas sem efeito visual.
const DAY = { time:0, phase:'day', light:1.0, skyR:8, skyG:14, skyB:24, sunAngle:0 };
function updateDayCycle(dt){ /* removido */ }
function getDayNightDarkness(){ return 0; } // sempre claro
function drawSkyElements(){ /* removido */ }

// ─── Sistema de Inventário ────────────────────────────────────
const INVENTORY = {
  slots: new Array(30).fill(null), // 30 slots (expandido de 20)
  selected: 0,
  open: false,
  maxStack: 64,
  craftTab: 0,  // aba de crafting selecionada
  filter: 'all', // filtro de categoria: 'all', 'recurso', 'minério', 'material', 'consumível', 'bloco', 'void', 'drop'
  sortMode: 'none', // modo de ordenação: 'none', 'name', 'category', 'quantity'
  favorites: new Set(), // itens favoritos
};

// ─── Definição completa de itens ─────────────────────────────
const ITEM_DEFS = {
  // ── Recursos de Superfície ────────────────────────────────
  'wood':          { name:'Madeira',          icon:'🪵', color:'#92400e', biomes:[5], rarity:0.65, stack:64, cat:'recurso' },
  'fiber':         { name:'Fibra',            icon:'🌿', color:'#16a34a', biomes:[4,25], rarity:0.45, stack:64, cat:'recurso' },
  'mushroom':      { name:'Cogumelo',         icon:'🍄', color:'#c084fc', biomes:[19], rarity:0.55, stack:32, cat:'recurso' },
  'sand_glass':    { name:'Vidro Bruto',      icon:'🔷', color:'#fde68a', biomes:[3], rarity:0.40, stack:32, cat:'recurso' },
  'ice_shard':     { name:'Lasca de Gelo',    icon:'❄',  color:'#bae6fd', biomes:[9,7], rarity:0.50, stack:32, cat:'recurso' },
  'toxic_goo':     { name:'Gosma Tóxica',     icon:'☣',  color:'#6abf3d', biomes:[21,20], rarity:0.45, stack:32, cat:'recurso' },
  'lava_ore':      { name:'Minério de Lava',  icon:'🔥', color:'#f97316', biomes:[8,22], rarity:0.30, stack:16, cat:'recurso' },
  'tundra_moss':   { name:'Musgo da Tundra',  icon:'🌱', color:'#6b7280', biomes:[24], rarity:0.45, stack:64, cat:'recurso' },
  'savanna_bone':  { name:'Osso da Savana',   icon:'🦴', color:'#e5e7eb', biomes:[25], rarity:0.35, stack:32, cat:'recurso' },
  'coral_frag':    { name:'Fragmento Coral',  icon:'🪸', color:'#2dd4bf', biomes:[23], rarity:0.40, stack:32, cat:'recurso' },
  'flint':         { name:'Sílex',            icon:'🪨', color:'#94a3b8', biomes:[6,3], rarity:0.50, stack:32, cat:'recurso' },
  // ── Minérios de Superfície (em rochas) ────────────────────
  'coal':          { name:'Carvão',           icon:'⬛', color:'#1f2937', biomes:[6,12], rarity:0.30, stack:64, cat:'minério', surface:true },
  'copper_ore':    { name:'Cobre Bruto',      icon:'🟠', color:'#ea580c', biomes:[6], rarity:0.20, stack:32, cat:'minério', surface:true },
  // ── Recursos Subterrâneos ─────────────────────────────────
  'stone_chip':    { name:'Lasca de Pedra',   icon:'🪨', color:'#94a3b8', biomes:[12,17,18], rarity:0.70, stack:64, cat:'recurso' },
  'iron_ore':      { name:'Minério de Ferro', icon:'⚙',  color:'#b45309', biomes:[13], rarity:0.55, stack:32, cat:'minério' },
  'gold_ore':      { name:'Minério de Ouro',  icon:'🟡', color:'#fbbf24', biomes:[13], rarity:0.18, stack:16, cat:'minério' },
  'crystal_dust':  { name:'Pó de Cristal',    icon:'💎', color:'#818cf8', biomes:[14,34], rarity:0.40, stack:32, cat:'minério' },
  'obsidian':      { name:'Obsidiana',        icon:'🖤', color:'#4c1d95', biomes:[15], rarity:0.25, stack:16, cat:'minério' },
  'cave_fungi':    { name:'Fungo de Caverna', icon:'🟣', color:'#7c3aed', biomes:[18,11], rarity:0.35, stack:32, cat:'recurso' },
  'deep_iron':     { name:'Ferro Profundo',   icon:'🔩', color:'#6b7280', biomes:[13,12], rarity:0.20, stack:16, cat:'minério' },
  'mana_crystal':  { name:'Cristal de Mana',  icon:'🔮', color:'#7c3aed', biomes:[14], rarity:0.12, stack:8, cat:'minério' },
  // ── Recursos Void ─────────────────────────────────────────
  'void_essence':  { name:'Essência Void',    icon:'✨', color:'#a78bfa', biomes:[30,35], rarity:0.30, stack:16, cat:'void' },
  'ghost_petal':   { name:'Pétala Fantasma',  icon:'🌸', color:'#7c3aed', biomes:[35], rarity:0.35, stack:32, cat:'void' },
  'null_fragment': { name:'Fragmento Nulo',   icon:'◼',  color:'#1e1b4b', biomes:[30], rarity:0.15, stack:8, cat:'void' },
  // ── Drops de Inimigos ─────────────────────────────────────
  'scrap_metal':   { name:'Sucata',           icon:'🔩', color:'#6b7280', biomes:[], rarity:0, stack:64, drop:true, cat:'drop' },
  'energy_cell':   { name:'Célula de Energia',icon:'⚡', color:'#38bdf8', biomes:[], rarity:0, stack:16, drop:true, cat:'drop' },
  'enemy_core':    { name:'Núcleo Inimigo',   icon:'🔴', color:'#ef4444', biomes:[], rarity:0, stack:8,  drop:true, cat:'drop' },
  'void_shard':    { name:'Fragmento Void',   icon:'💜', color:'#7c3aed', biomes:[], rarity:0, stack:8,  drop:true, cat:'drop' },
  // ── Materiais Craftados ───────────────────────────────────
  'iron_ingot':    { name:'Lingote de Ferro', icon:'🟫', color:'#b45309', biomes:[], rarity:0, stack:32, crafted:true, cat:'material' },
  'gold_ingot':    { name:'Lingote de Ouro',  icon:'🟨', color:'#fbbf24', biomes:[], rarity:0, stack:16, crafted:true, cat:'material' },
  'copper_ingot':  { name:'Lingote de Cobre', icon:'🟧', color:'#ea580c', biomes:[], rarity:0, stack:32, crafted:true, cat:'material' },
  'steel_plate':   { name:'Chapa de Aço',     icon:'🔲', color:'#374151', biomes:[], rarity:0, stack:16, crafted:true, cat:'material' },
  'circuit_board': { name:'Placa Eletrônica', icon:'💻', color:'#0ea5e9', biomes:[], rarity:0, stack:8,  crafted:true, cat:'material' },
  'lens':          { name:'Lente Óptica',     icon:'🔍', color:'#e0f2fe', biomes:[], rarity:0, stack:8,  crafted:true, cat:'material' },
  'void_alloy':    { name:'Liga Void',        icon:'🌀', color:'#7c3aed', biomes:[], rarity:0, stack:8,  crafted:true, cat:'material' },
  'rope':          { name:'Corda',            icon:'〰', color:'#92400e', biomes:[], rarity:0, stack:32, crafted:true, cat:'material' },
  'glass':         { name:'Vidro',            icon:'🟦', color:'#bae6fd', biomes:[], rarity:0, stack:32, crafted:true, cat:'material' },
  'explosive':     { name:'Explosivo',        icon:'💥', color:'#f97316', biomes:[], rarity:0, stack:8,  crafted:true, cat:'material' },
  // ── Consumíveis Craftados ─────────────────────────────────
  'repair_kit':    { name:'Kit de Reparo',    icon:'🔧', color:'#22c55e', biomes:[], rarity:0, stack:5,  crafted:true, cat:'consumível' },
  'coolant':       { name:'Resfriador',       icon:'🧊', color:'#bae6fd', biomes:[], rarity:0, stack:5,  crafted:true, cat:'consumível' },
  'energy_pack':   { name:'Pack de Energia',  icon:'🔋', color:'#38bdf8', biomes:[], rarity:0, stack:5,  crafted:true, cat:'consumível' },
  'shield_grenade':{ name:'Granada Escudo',   icon:'🛡', color:'#818cf8', biomes:[], rarity:0, stack:4,  crafted:true, cat:'consumível' },
  'emp_charge':    { name:'Carga EMP',        icon:'⚡', color:'#fbbf24', biomes:[], rarity:0, stack:4,  crafted:true, cat:'consumível' },
  'turret_kit':    { name:'Kit de Torrreta',  icon:'🏗', color:'#6b7280', biomes:[], rarity:0, stack:2,  crafted:true, cat:'consumível' },
  // ── Blocos Craftados ──────────────────────────────────────
  'block_iron':    { name:'Bloco de Ferro',   icon:'🔲', color:'#6b7280', biomes:[], rarity:0, stack:20, crafted:true, cat:'bloco', buildId:16 },
  'block_reinforced':{ name:'Bloco Reforçado',icon:'⬛', color:'#1f2937', biomes:[], rarity:0, stack:10, crafted:true, cat:'bloco', buildId:26 },
  'block_crystal': { name:'Bloco Cristal',    icon:'💎', color:'#818cf8', biomes:[], rarity:0, stack:10, crafted:true, cat:'bloco', buildId:14 },
  'block_void':    { name:'Bloco Void',       icon:'🌀', color:'#7c3aed', biomes:[], rarity:0, stack:8,  crafted:true, cat:'bloco', buildId:31 },
  'trap_slow_kit': { name:'Armadilha Lenta',  icon:'🕸', color:'#38bdf8', biomes:[], rarity:0, stack:8,  crafted:true, cat:'bloco', buildId:27 },
  'trap_dmg_kit':  { name:'Armadilha Dano',   icon:'⚔', color:'#ef4444', biomes:[], rarity:0, stack:5,  crafted:true, cat:'bloco', buildId:28 },
  'spike_kit':     { name:'Espinhos',         icon:'🗡', color:'#dc2626', biomes:[], rarity:0, stack:5,  crafted:true, cat:'bloco', buildId:29 },
};

// ─── Mapa de drops por inimigo ────────────────────────────────
const ENEMY_DROPS = {
  SCOUT:         [{ id:'scrap_metal',  chance:0.7, qty:[1,3] }],
  TANK:          [{ id:'scrap_metal',  chance:0.9, qty:[3,7] }, { id:'iron_ore',    chance:0.4, qty:[1,3] }],
  FLYER:         [{ id:'scrap_metal',  chance:0.5, qty:[1,2] }, { id:'energy_cell', chance:0.2, qty:[1,1] }],
  TURRET:        [{ id:'scrap_metal',  chance:1.0, qty:[4,8] }, { id:'energy_cell', chance:0.4, qty:[1,2] }],
  SPECTER:       [{ id:'crystal_dust', chance:0.6, qty:[1,3] }, { id:'void_shard',  chance:0.3, qty:[1,1] }],
  BOMBER:        [{ id:'scrap_metal',  chance:0.8, qty:[2,5] }, { id:'explosive',   chance:0.2, qty:[1,2] }],
  SWARM:         [{ id:'scrap_metal',  chance:0.3, qty:[1,1] }],
  ELITE:         [{ id:'iron_ore',     chance:1.0, qty:[4,8] }, { id:'energy_cell', chance:1.0, qty:[2,4] }, { id:'enemy_core', chance:0.6, qty:[1,2] }],
  VOID_SHADE:    [{ id:'void_essence', chance:0.7, qty:[1,3] }, { id:'void_shard',  chance:0.5, qty:[1,2] }],
  CRYSTAL_GOLEM: [{ id:'crystal_dust', chance:1.0, qty:[3,6] }, { id:'obsidian',    chance:0.5, qty:[1,3] }, { id:'mana_crystal', chance:0.25, qty:[1,1] }],
  NECRO:         [{ id:'cave_fungi',   chance:0.8, qty:[1,4] }, { id:'enemy_core',  chance:0.4, qty:[1,1] }],
};

// ─── Drops de Blocos Quebráveis ──────────────────────────────
// Cada entrada mapeia tile ID → lista de drops possíveis ao destruir o bloco
const BLOCK_DROPS = {
  [6 /*ROCK*/]:        [
    { id:'flint',        chance:0.65, qty:[1,2] },
    { id:'coal',         chance:0.22, qty:[1,2] },
    { id:'copper_ore',   chance:0.10, qty:[1,1] },
  ],
  [12/*STONE*/]:       [
    { id:'stone_chip',   chance:0.80, qty:[1,3] },
    { id:'coal',         chance:0.18, qty:[1,2] },
  ],
  [13/*IRON*/]:        [
    { id:'iron_ore',     chance:0.90, qty:[1,3] },
    { id:'stone_chip',   chance:0.40, qty:[1,2] },
    { id:'deep_iron',    chance:0.12, qty:[1,1] },
  ],
  [14/*CRYSTAL*/]:     [
    { id:'crystal_dust', chance:0.85, qty:[1,2] },
    { id:'mana_crystal', chance:0.08, qty:[1,1] },
  ],
  [15/*OBSIDIAN*/]:    [
    { id:'obsidian',     chance:0.70, qty:[1,1] },
    { id:'void_essence', chance:0.15, qty:[1,1] },
  ],
  [17/*CAVE_WALL*/]:   [
    { id:'stone_chip',   chance:0.45, qty:[1,2] },
    { id:'cave_fungi',   chance:0.12, qty:[1,1] },
  ],
  [11/*DIRT*/]:        [
    { id:'stone_chip',   chance:0.30, qty:[1,1] },
    { id:'cave_fungi',   chance:0.18, qty:[1,1] },
  ],
  [37/*GLASS_BLOCK*/]: [
    { id:'sand_glass',   chance:0.55, qty:[1,2] },
  ],
  [38/*COPPER_BLOCK*/]:[
    { id:'copper_ore',   chance:0.75, qty:[1,2] },
    { id:'copper_ingot', chance:0.20, qty:[1,1] },
  ],
  [39/*CRYSTAL_WALL*/]:[
    { id:'crystal_dust', chance:0.75, qty:[1,2] },
    { id:'mana_crystal', chance:0.06, qty:[1,1] },
  ],
  [16/*BUILT_BLOCK*/]: [
    { id:'scrap_metal',  chance:0.55, qty:[1,2] },
    { id:'iron_ingot',   chance:0.20, qty:[1,1] },
  ],
  [26/*REINFORCED*/]:  [
    { id:'steel_plate',  chance:0.40, qty:[1,1] },
    { id:'obsidian',     chance:0.30, qty:[1,1] },
  ],
  [36/*RUNE_STONE*/]:  [
    { id:'mana_crystal', chance:0.60, qty:[1,1] },
    { id:'void_essence', chance:0.30, qty:[1,1] },
  ],
  [33/*MAGMA_ROCK*/]:  [
    { id:'lava_ore',     chance:0.55, qty:[1,2] },
    { id:'obsidian',     chance:0.20, qty:[1,1] },
  ],
};

// ─── Categorias de Crafting ───────────────────────────────────
const CRAFT_TABS = ['Fundição','Equipamentos','Construção','Consumíveis','Especial'];

// ─── Receitas de Crafting expandidas ─────────────────────────
// Cada receita pode ter resultado (item) OU action (consumível direto)
const CRAFT_RECIPES = [
  // ══ FUNDIÇÃO ══════════════════════════════════════════════
  {
    id:'smelt_iron', tab:0,
    name:'Lingote de Ferro', icon:'🟫',
    requireScan:[13/*IRON*/],
    desc:'Fundir minério de ferro + carvão',
    ingredients:[{ id:'iron_ore', qty:2 }, { id:'coal', qty:1 }],
    result:{ id:'iron_ingot', qty:2 },
  },
  {
    id:'smelt_gold', tab:0,
    name:'Lingote de Ouro', icon:'🟨',
    desc:'Ouro fundido em lingote',
    ingredients:[{ id:'gold_ore', qty:2 }, { id:'coal', qty:2 }],
    result:{ id:'gold_ingot', qty:1 },
  },
  {
    id:'smelt_copper', tab:0,
    name:'Lingote de Cobre', icon:'🟧',
    desc:'Fundir cobre bruto',
    ingredients:[{ id:'copper_ore', qty:2 }, { id:'coal', qty:1 }],
    result:{ id:'copper_ingot', qty:2 },
  },
  {
    id:'smelt_steel', tab:0,
    name:'Chapa de Aço', icon:'🔲',
    desc:'Ferro + carvão = aço laminado',
    ingredients:[{ id:'iron_ingot', qty:2 }, { id:'coal', qty:2 }, { id:'obsidian', qty:1 }],
    result:{ id:'steel_plate', qty:1 },
  },
  {
    id:'make_glass', tab:0,
    name:'Vidro', icon:'🟦',
    desc:'Fundir areia',
    ingredients:[{ id:'sand_glass', qty:3 }, { id:'coal', qty:1 }],
    result:{ id:'glass', qty:2 },
  },
  {
    id:'make_void_alloy', tab:0,
    name:'Liga Void', icon:'🌀',
    desc:'Fusion de cristal void com obsidiana',
    ingredients:[{ id:'void_essence', qty:2 }, { id:'obsidian', qty:2 }, { id:'mana_crystal', qty:1 }],
    result:{ id:'void_alloy', qty:1 },
  },
  {
    id:'make_circuit', tab:0,
    name:'Placa Eletrônica', icon:'💻',
    desc:'Circuito de cobre e cristal',
    ingredients:[{ id:'copper_ingot', qty:2 }, { id:'crystal_dust', qty:2 }, { id:'energy_cell', qty:1 }],
    result:{ id:'circuit_board', qty:1 },
  },
  {
    id:'make_lens', tab:0,
    name:'Lente Óptica', icon:'🔍',
    desc:'Vidro + cristal = óptica precisa',
    ingredients:[{ id:'glass', qty:2 }, { id:'crystal_dust', qty:1 }],
    result:{ id:'lens', qty:1 },
  },

  // ══ EQUIPAMENTOS ════════════════════════════════════════
  {
    id:'craft_repair', tab:1,
    name:'Kit de Reparo', icon:'🔧',
    desc:'+35 HP ao usar',
    ingredients:[{ id:'scrap_metal', qty:4 }, { id:'fiber', qty:3 }, { id:'iron_ingot', qty:1 }],
    result:{ id:'repair_kit', qty:1 },
  },
  {
    id:'craft_coolant', tab:1,
    name:'Resfriador', icon:'🧊',
    desc:'Remove todo o calor',
    ingredients:[{ id:'ice_shard', qty:4 }, { id:'toxic_goo', qty:1 }, { id:'glass', qty:1 }],
    result:{ id:'coolant', qty:1 },
  },
  {
    id:'craft_energy_pack', tab:1,
    name:'Pack de Energia', icon:'🔋',
    desc:'+60 Energia ao usar',
    ingredients:[{ id:'energy_cell', qty:2 }, { id:'crystal_dust', qty:2 }, { id:'copper_ingot', qty:1 }],
    result:{ id:'energy_pack', qty:1 },
  },
  {
    id:'craft_emp', tab:1,
    name:'Carga EMP', icon:'⚡',
    desc:'Atordoa inimigos em 300px',
    ingredients:[{ id:'circuit_board', qty:1 }, { id:'energy_cell', qty:3 }, { id:'copper_ingot', qty:2 }],
    result:{ id:'emp_charge', qty:2 },
  },
  {
    id:'craft_shield_grenade', tab:1,
    name:'Granada Escudo', icon:'🛡',
    desc:'Invencibilidade 3s',
    ingredients:[{ id:'steel_plate', qty:1 }, { id:'void_essence', qty:1 }, { id:'energy_cell', qty:2 }],
    result:{ id:'shield_grenade', qty:2 },
  },
  {
    id:'craft_rope', tab:1,
    name:'Corda', icon:'〰',
    desc:'Material de utilidade',
    ingredients:[{ id:'fiber', qty:5 }, { id:'tundra_moss', qty:2 }],
    result:{ id:'rope', qty:3 },
  },
  {
    id:'craft_explosive', tab:1,
    name:'Explosivo', icon:'💥',
    desc:'Componente explosivo',
    ingredients:[{ id:'lava_ore', qty:2 }, { id:'coal', qty:3 }, { id:'toxic_goo', qty:1 }],
    result:{ id:'explosive', qty:2 },
  },

  // ══ CONSTRUÇÃO ═══════════════════════════════════════════
  {
    id:'craft_block_iron', tab:2,
    name:'Bloco de Ferro ×4', icon:'🔲',
    desc:'Bloco resistente para base',
    ingredients:[{ id:'iron_ingot', qty:2 }, { id:'stone_chip', qty:4 }],
    result:{ id:'block_iron', qty:4 },
    buildId:16,
  },
  {
    id:'craft_block_reinforced', tab:2,
    name:'Bloco Reforçado ×2', icon:'⬛',
    desc:'Extremamente resistente',
    ingredients:[{ id:'steel_plate', qty:2 }, { id:'obsidian', qty:2 }, { id:'iron_ingot', qty:2 }],
    result:{ id:'block_reinforced', qty:2 },
    buildId:26,
  },
  {
    id:'craft_block_crystal', tab:2,
    name:'Bloco Cristal ×3', icon:'💎',
    desc:'Bloco que regenera energia próxima',
    ingredients:[{ id:'crystal_dust', qty:4 }, { id:'mana_crystal', qty:1 }, { id:'iron_ingot', qty:1 }],
    result:{ id:'block_crystal', qty:3 },
    buildId:14,
  },
  {
    id:'craft_block_void', tab:2,
    name:'Bloco Void ×2', icon:'🌀',
    desc:'Bloco dimensionalmente instável',
    ingredients:[{ id:'void_alloy', qty:2 }, { id:'null_fragment', qty:1 }],
    result:{ id:'block_void', qty:2 },
    buildId:31,
  },
  {
    id:'craft_trap_slow', tab:2,
    name:'Armadilha Lenta ×3', icon:'🕸',
    desc:'Desacelera inimigos',
    ingredients:[{ id:'rope', qty:2 }, { id:'toxic_goo', qty:2 }, { id:'iron_ingot', qty:1 }],
    result:{ id:'trap_slow_kit', qty:3 },
    buildId:27,
  },
  {
    id:'craft_trap_dmg', tab:2,
    name:'Armadilha Dano ×2', icon:'⚔',
    desc:'Causa dano a inimigos',
    ingredients:[{ id:'explosive', qty:1 }, { id:'steel_plate', qty:1 }, { id:'scrap_metal', qty:3 }],
    result:{ id:'trap_dmg_kit', qty:2 },
    buildId:28,
  },
  {
    id:'craft_spikes', tab:2,
    name:'Espinhos ×3', icon:'🗡',
    desc:'Dano pesado em área',
    ingredients:[{ id:'iron_ingot', qty:2 }, { id:'obsidian', qty:1 }, { id:'steel_plate', qty:1 }],
    result:{ id:'spike_kit', qty:3 },
    buildId:29,
  },

  // ══ CONSUMÍVEIS ══════════════════════════════════════════
  {
    id:'use_repair', tab:3,
    name:'Usar Kit Reparo', icon:'🔧',
    desc:'+35 HP',
    ingredients:[{ id:'repair_kit', qty:1 }],
    result:null,
    action:()=>{ robot.hp=Math.min(robot.maxHp, robot.hp+35); showAlert('🔧 HP +35'); spawnBurst(robot.x,robot.y,'#22c55e',8,3); },
  },
  {
    id:'use_coolant', tab:3,
    name:'Usar Resfriador', icon:'🧊',
    desc:'Calor zerado',
    ingredients:[{ id:'coolant', qty:1 }],
    result:null,
    action:()=>{ robot.heat=0; showAlert('❄ Calor zerado!'); spawnBurst(robot.x,robot.y,'#bae6fd',8,3); },
  },
  {
    id:'use_energy', tab:3,
    name:'Usar Pack Energia', icon:'🔋',
    desc:'+60 Energia',
    ingredients:[{ id:'energy_pack', qty:1 }],
    result:null,
    action:()=>{ robot.energy=Math.min(robot.maxEnergy, robot.energy+60); showAlert('⚡ Energia +60'); spawnBurst(robot.x,robot.y,'#38bdf8',8,3); },
  },
  {
    id:'use_emp', tab:3,
    name:'Detonar EMP', icon:'⚡',
    desc:'Atordoa inimigos próximos',
    ingredients:[{ id:'emp_charge', qty:1 }],
    result:null,
    action:()=>{
      let cnt=0;
      for(const e of enemies){
        if(Math.hypot(e.x-robot.x,e.y-robot.y)<300){ e.slowTimer=120; e.flashTimer=20; cnt++; }
      }
      showAlert(`⚡ EMP: ${cnt} inimigos atingidos`);
      spawnBurst(robot.x,robot.y,'#fbbf24',20,6);
    },
  },
  {
    id:'use_shield', tab:3,
    name:'Ativar Escudo', icon:'🛡',
    desc:'Invencível por 3s',
    ingredients:[{ id:'shield_grenade', qty:1 }],
    result:null,
    action:()=>{ robot.invTimer=180; showAlert('🛡 Escudo ativo!'); spawnBurst(robot.x,robot.y,'#818cf8',15,4); },
  },

  // ══ ESPECIAL ══════════════════════════════════════════════
  {
    id:'craft_beacon', tab:4,
    name:'Sinalizador', icon:'📡',
    desc:'Aumenta força do sinal em +5%',
    ingredients:[{ id:'circuit_board', qty:2 }, { id:'iron_ingot', qty:4 }, { id:'energy_cell', qty:3 }, { id:'lens', qty:1 }],
    result:null,
    action:()=>{ signalProgress=Math.min(100, signalProgress+5); showAlert('📡 Sinal +5%!'); spawnBurst(robot.x,robot.y,'#a855f7',20,5); },
  },
  {
    id:'craft_portal_charge', tab:4,
    name:'Recarga de Portal', icon:'🌀',
    desc:'Reseta cooldown do teleporte',
    ingredients:[{ id:'void_essence', qty:3 }, { id:'mana_crystal', qty:1 }, { id:'energy_cell', qty:2 }],
    result:null,
    action:()=>{ teleportCooldown=0; showAlert('🌀 Teleporte recarregado!'); },
  },
  {
    id:'craft_turret', tab:4,
    name:'Kit de Torreta', icon:'🏗',
    desc:'Implanta torreta automática',
    ingredients:[{ id:'steel_plate', qty:2 }, { id:'circuit_board', qty:1 }, { id:'energy_cell', qty:2 }, { id:'iron_ingot', qty:3 }],
    result:{ id:'turret_kit', qty:1 },
  },
  {
    id:'use_turret', tab:4,
    name:'Implantar Torreta', icon:'🏗',
    desc:'Torreta nas coordenadas do cursor',
    ingredients:[{ id:'turret_kit', qty:1 }],
    result:null,
    action:()=>{ _placeTurretAtMouse(); showAlert('🏗 Torreta implantada!'); },
  },
];

function _placeTurretAtMouse(){
  const tx=Math.floor(mouseWorld.x/TILE), ty=Math.floor(mouseWorld.y/TILE);
  const sp=findClearSpawn(tx,ty,false);
  spawnEnemy('TURRET',sp.tx,sp.ty,1.5); // TURRET aliada (placeholder — usando enemy como turret)
  spawnBurst((sp.tx+0.5)*TILE,(sp.ty+0.5)*TILE,'#22c55e',12,3);
}

// ─── Localização de minérios por bioma ───────────────────────
// Chamada durante updateWorldItems para spawnar minérios no chão
// baseados no bioma correto (ex: coal/copper em superfície rochosa)
function _getBiomeDropItems(tile){
  const surface = currentDim === 0;
  const items = [];
  for(const [id, def] of Object.entries(ITEM_DEFS)){
    if(!def.biomes.includes(tile)) continue;
    if(def.drop || def.crafted) continue;
    if(def.surface !== undefined && def.surface !== surface) continue;
    items.push({ id, rarity: def.rarity });
  }
  return items;
}

// ─── Unlock de receitas por scan ────────────────────────────────
// Mapeamento: receita_id → tile IDs que precisam estar escaneados
// Receitas sem entrada aqui ficam sempre disponíveis (básicas)
// Tile IDs: 12=STONE, 13=IRON, 14=CRYSTAL, 15=OBSIDIAN,
//           21=TOXIC, 8=LAVA, 9=ICE, 30=VOID_FLOOR, 35=GHOST_GRASS,
//           19=MUSHROOM, 22=VOLCANIC_ASH, 34=CRYSTAL_FLOOR
const RECIPE_SCAN_UNLOCK = {
  // Fundição — requer escanear o minério correspondente
  'smelt_iron':           [13/*IRON*/],
  'smelt_gold':           [13/*IRON*/],        // ferro como prerequisito
  'smelt_copper':         [13/*IRON*/],
  'smelt_steel':          [13/*IRON*/, 15/*OBSIDIAN*/],
  'make_glass':           [3/*SAND*/],
  'make_void_alloy':      [30/*VOID_FLOOR*/, 15/*OBSIDIAN*/, 14/*CRYSTAL*/],
  'make_circuit':         [13/*IRON*/, 14/*CRYSTAL*/],
  'make_lens':            [14/*CRYSTAL*/],
  // Equipamentos avançados
  'craft_coolant':        [9/*ICE*/],
  'craft_energy_pack':    [14/*CRYSTAL*/],
  'craft_emp':            [13/*IRON*/, 14/*CRYSTAL*/],
  'craft_shield_grenade': [15/*OBSIDIAN*/, 30/*VOID_FLOOR*/],
  // Construção
  'craft_block_crystal':  [14/*CRYSTAL*/],
  'craft_block_void':     [30/*VOID_FLOOR*/],
  'craft_trap_slow':      [9/*ICE*/],
  'craft_trap_dmg':       [13/*IRON*/],
  'craft_spikes':         [13/*IRON*/, 15/*OBSIDIAN*/],
  // Especial
  'craft_turret':         [13/*IRON*/, 14/*CRYSTAL*/],
};

// Retorna true se a receita está desbloqueada (scan completo dos tiles exigidos)
function isRecipeUnlocked(recipe){
  const req = RECIPE_SCAN_UNLOCK[recipe.id];
  if(!req || req.length === 0) return true; // sem requisito = sempre disponível
  // ScannedDB é um Set definido em scanner.js (carregado depois)
  if(typeof ScannedDB === 'undefined') return true; // scanner não carregado
  return req.every(tileId => ScannedDB.has(tileId));
}

// Items no mundo
const worldItems = [];

// BUG FIX: pickup falhava silenciosamente quando o inventário (30 slots)
// estava cheio de OUTROS tipos de item — addToInventory() retornava false
// e nada acontecia. O jogador via "itens no inventário" mas o item
// específico exigido por uma receita nunca era de fato coletado, fazendo
// o craft acusar "ingredientes insuficientes" mesmo parecendo ter de tudo.
// Agora isso é avisado (com cooldown pra não espamar) — zero erros silenciosos.
let _invFullAlertCD = 0;

function addToInventory(itemId, qty=1){
  const def=ITEM_DEFS[itemId];
  if(!def) return false;
  const maxStack=def.stack||64;
  for(const slot of INVENTORY.slots){
    if(slot && slot.id===itemId && slot.qty<maxStack){
      const add=Math.min(qty, maxStack-slot.qty);
      slot.qty+=add; qty-=add;
      if(qty<=0) return true;
    }
  }
  for(let i=0;i<INVENTORY.slots.length;i++){
    if(!INVENTORY.slots[i]){
      const add=Math.min(qty,maxStack);
      INVENTORY.slots[i]={id:itemId,qty:add}; qty-=add;
      if(qty<=0) return true;
    }
  }
  return qty===0;
}

function removeFromInventory(itemId, qty=1){
  // BUG FIX: verificar total disponível ANTES de remover qualquer coisa
  // (antes, consumia parcialmente e ainda retornava false se insuficiente)
  if(countItem(itemId) < qty) return false;
  for(let i=0;i<INVENTORY.slots.length;i++){
    if(qty <= 0) break;
    const slot=INVENTORY.slots[i];
    if(slot && slot.id===itemId){
      if(slot.qty>=qty){ slot.qty-=qty; if(slot.qty===0) INVENTORY.slots[i]=null; qty=0; }
      else { qty-=slot.qty; INVENTORY.slots[i]=null; }
    }
  }
  return true;
}

function countItem(itemId){
  let total=0;
  for(const slot of INVENTORY.slots){ if(slot && slot.id===itemId) total+=slot.qty; }
  return total;
}

function trySpawnBiomeItem(tx,ty){
  if(Math.random()>0.0010) return;
  const tile=getTile(tx,ty);
  const drops=_getBiomeDropItems(tile);
  for(const drop of drops){
    if(Math.random()<drop.rarity*0.012){
      worldItems.push({
        id:drop.id,
        x:(tx+0.5)*TILE+(Math.random()-0.5)*16,
        y:(ty+0.5)*TILE+(Math.random()-0.5)*16,
        qty:1+Math.floor(Math.random()*3),
        bobOffset:Math.random()*Math.PI*2,
        age:0, collected:false,
        ttl:3600,
      });
    }
  }
}

function spawnEnemyDrop(enemy){
  const drops=ENEMY_DROPS[enemy.type]||[];
  for(const drop of drops){
    if(Math.random()<drop.chance){
      const qty=drop.qty[0]+Math.floor(Math.random()*(drop.qty[1]-drop.qty[0]+1));
      worldItems.push({
        id:drop.id, x:enemy.x, y:enemy.y,
        qty, bobOffset:Math.random()*Math.PI*2, age:0, collected:false, ttl:1800,
      });
    }
  }
}

// Dropa itens no mundo ao destruir um bloco pelo jogador
function spawnBlockDrop(tx, ty, tileId){
  const drops = BLOCK_DROPS[tileId];
  if(!drops || drops.length===0) return;
  const wx = (tx + 0.5) * TILE;
  const wy = (ty + 0.5) * TILE;
  for(const drop of drops){
    if(Math.random() < drop.chance){
      const qty = drop.qty[0] + Math.floor(Math.random() * (drop.qty[1] - drop.qty[0] + 1));
      worldItems.push({
        id: drop.id,
        x: wx + (Math.random()-0.5)*16,
        y: wy + (Math.random()-0.5)*16,
        qty,
        bobOffset: Math.random() * Math.PI * 2,
        age: 0, collected: false, ttl: 2400,
      });
    }
  }
}

function updateWorldItems(){
  const pickupR=36;
  if(_invFullAlertCD>0) _invFullAlertCD--;
  for(let i=worldItems.length-1;i>=0;i--){
    const item=worldItems[i];
    if(item.collected){ worldItems.splice(i,1); continue; }
    item.age++;
    if(item.ttl && item.age>item.ttl){ worldItems.splice(i,1); continue; }
    if(item.noPickup>0){ item.noPickup--; continue; }
    const dx=item.x-robot.x, dy=item.y-robot.y;
    if(dx*dx+dy*dy<pickupR*pickupR){
      if(addToInventory(item.id,item.qty)){
        const def=ITEM_DEFS[item.id];
        showAlert(`+${item.qty} ${def?def.name:item.id}`);
        spawnBurst(item.x,item.y,(def&&def.color)||'#facc15',6,2);
        item.collected=true;
      } else if(_invFullAlertCD<=0){
        // BUG FIX: antes, isso falhava em silêncio (item ficava no chão sem
        // explicação). Agora avisamos e damos cooldown de 3s pra não espamar
        // enquanto o jogador estiver parado sobre o item sem conseguir pegá-lo.
        const def=ITEM_DEFS[item.id];
        showAlert(`🎒 Inventário cheio! Não foi possível pegar ${def?def.name:item.id}`);
        _invFullAlertCD=180;
      }
    }
  }
  const ptx=Math.floor(robot.x/TILE), pty=Math.floor(robot.y/TILE);
  if(worldItems.length<180){
    for(let dx=-10;dx<=10;dx++) for(let dy=-10;dy<=10;dy++) trySpawnBiomeItem(ptx+dx,pty+dy);
  }
}

function drawWorldItems(){
  ctx.save();
  for(const item of worldItems){
    if(item.collected) continue;
    const sx=item.x-cam.x+W/2, sy=item.y-cam.y+H/2;
    if(sx<-24||sx>W+24||sy<-24||sy>H+24) continue;
    const def=ITEM_DEFS[item.id];
    if(!def) continue;
    const bob=Math.sin(item.age*0.07+item.bobOffset)*3;
    // Sombra
    ctx.globalAlpha=0.3;
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(sx,sy+10,7,3,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    // Brilho
    const fadeIn=Math.min(1,item.age/30);
    ctx.globalAlpha=fadeIn;
    const glowG=ctx.createRadialGradient(sx,sy+bob,0,sx,sy+bob,18);
    glowG.addColorStop(0,(def.color||'#fff')+'55');
    glowG.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glowG; ctx.fillRect(sx-18,sy+bob-18,36,36);
    ctx.font='18px serif'; ctx.textAlign='center';
    ctx.shadowColor=def.color||'#fff'; ctx.shadowBlur=10;
    ctx.fillText(def.icon||'?',sx,sy+bob+7);
    ctx.shadowBlur=0;
    if(item.qty>1){
      ctx.font="bold 8px 'Share Tech Mono',monospace";
      ctx.fillStyle='#fff';
      ctx.fillText('x'+item.qty,sx,sy+bob+19);
    }
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

// ─── HUD Inventário ───────────────────────────────────────────
let invUI={open:false,_craftBounds:[],_slotBounds:[],hoverSlot:-1,selectedRecipe:-1,craftTabSel:0};

function toggleInventory(){ invUI.open=!invUI.open; }

function drawInventoryHUD(){
  if(!running) return;
  // Hotbar (10 slots)
  const slotSize=40, gap=3, cols=10;
  const startX=W/2-(cols*(slotSize+gap))/2;
  const startY=H-slotSize-56;
  ctx.save();
  for(let i=0;i<cols;i++){
    const slot=INVENTORY.slots[i];
    const sx=startX+i*(slotSize+gap), sy=startY;
    const active=i===INVENTORY.selected;
    ctx.fillStyle=active?'rgba(0,229,255,0.22)':'rgba(4,10,22,0.78)';
    roundRect(ctx,sx,sy,slotSize,slotSize,6); ctx.fill();
    ctx.strokeStyle=active?'#00e5ff':'rgba(0,229,255,0.2)';
    ctx.lineWidth=active?2:1;
    roundRect(ctx,sx,sy,slotSize,slotSize,6); ctx.stroke();
    if(slot){
      const def=ITEM_DEFS[slot.id];
      ctx.font='20px serif'; ctx.textAlign='center';
      ctx.shadowColor=(def&&def.color)||'#fff'; ctx.shadowBlur=6;
      ctx.fillText(def?def.icon:'?',sx+slotSize/2,sy+slotSize/2+8);
      ctx.shadowBlur=0;
      if(slot.qty>1){
        ctx.font="bold 9px 'Share Tech Mono',monospace";
        ctx.fillStyle='#fff'; ctx.textAlign='right';
        ctx.fillText(slot.qty,sx+slotSize-3,sy+slotSize-4);
      }
    }
    ctx.font="8px 'Orbitron',monospace"; ctx.textAlign='center';
    ctx.fillStyle='rgba(200,220,255,0.35)';
    ctx.fillText(i<9?i+1:'0',sx+slotSize/2,sy+10);
  }
  // Tooltip do item selecionado na hotbar
  const selSlot=INVENTORY.slots[INVENTORY.selected];
  if(selSlot){
    const selDef=ITEM_DEFS[selSlot.id];
    if(selDef){
      const tipW=140, tipH=26;
      const tipX=startX+INVENTORY.selected*(slotSize+gap)+(slotSize-tipW)/2;
      const tipY=startY-tipH-6;
      ctx.save();
      ctx.fillStyle='rgba(2,6,18,0.90)';
      roundRect(ctx,tipX,tipY,tipW,tipH,5); ctx.fill();
      ctx.strokeStyle='rgba(0,229,255,0.35)'; ctx.lineWidth=1;
      roundRect(ctx,tipX,tipY,tipW,tipH,5); ctx.stroke();
      ctx.fillStyle='#e0f7ff'; ctx.font="8px 'Share Tech Mono',monospace";
      ctx.textAlign='center';
      ctx.fillText(selDef.icon+' '+selDef.name+' ×'+selSlot.qty, tipX+tipW/2, tipY+11);
      ctx.fillStyle='rgba(150,200,220,0.6)'; ctx.font="7px 'Share Tech Mono',monospace";
      ctx.fillText(selDef.cat||'', tipX+tipW/2, tipY+22);
      ctx.restore();
    }
  }
  ctx.restore();
  if(invUI.open) drawFullInventory();
}

function drawFullInventory(){
  const panW=600, panH=560;
  const px=(W-panW)/2, py=(H-panH)/2;
  ctx.save();
  ctx.fillStyle='rgba(2,6,18,0.97)';
  roundRect(ctx,px,py,panW,panH,14); ctx.fill();
  ctx.strokeStyle='rgba(0,229,255,0.5)'; ctx.lineWidth=2;
  roundRect(ctx,px,py,panW,panH,14); ctx.stroke();

  // ── Título
  ctx.fillStyle='#00e5ff'; ctx.font="bold 13px 'Orbitron',sans-serif";
  ctx.textAlign='center';
  ctx.fillText('INVENTÁRIO  [I] fechar',W/2,py+24);

  // ── Grade de inventário (30 slots, 2 linhas de 10 + 1 linha de 10)
  const slotSize=42, gap=5, cols2=10;
  const iStartX=px+16, iStartY=py+36;
  invUI._slotBounds=[];
  for(let i=0;i<30;i++){
    const slot=INVENTORY.slots[i];
    const sx=iStartX+(i%cols2)*(slotSize+gap);
    const sy=iStartY+Math.floor(i/cols2)*(slotSize+gap);
    const hov=invUI.hoverSlot===i;
    ctx.fillStyle=hov?'rgba(0,229,255,0.15)':'rgba(10,20,40,0.85)';
    roundRect(ctx,sx,sy,slotSize,slotSize,5); ctx.fill();
    ctx.strokeStyle=hov?'rgba(0,229,255,0.5)':'rgba(0,229,255,0.15)'; ctx.lineWidth=1;
    roundRect(ctx,sx,sy,slotSize,slotSize,5); ctx.stroke();
    invUI._slotBounds[i]={sx,sy,w:slotSize,h:slotSize};
    if(slot){
      const def=ITEM_DEFS[slot.id];
      ctx.font='22px serif'; ctx.textAlign='center';
      ctx.shadowColor=(def&&def.color)||'#fff'; ctx.shadowBlur=8;
      ctx.fillText(def?def.icon:'?',sx+slotSize/2,sy+slotSize/2+8);
      ctx.shadowBlur=0;
      if(slot.qty>1){
        ctx.font="bold 9px 'Share Tech Mono',monospace";
        ctx.fillStyle='#fff'; ctx.textAlign='right';
        ctx.fillText(slot.qty,sx+slotSize-4,sy+slotSize-4);
      }
      ctx.fillStyle='rgba(200,220,255,0.7)'; ctx.font="7px 'Share Tech Mono',monospace";
      ctx.textAlign='center';
      ctx.fillText(def?def.name.slice(0,8):'?',sx+slotSize/2,sy+slotSize+10);
    }
  }

  // ── Linha divisória
  const divY=iStartY+3*(slotSize+gap)+10;
  ctx.strokeStyle='rgba(0,229,255,0.2)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(px+12,divY); ctx.lineTo(px+panW-12,divY); ctx.stroke();

  // ── Abas de crafting
  const tabY=divY+10;
  CRAFT_TABS.forEach((tab,ti)=>{
    const tw=88, th=22;
    const tx2=px+16+ti*(tw+5);
    const sel=invUI.craftTabSel===ti;
    ctx.fillStyle=sel?'rgba(0,229,255,0.25)':'rgba(10,20,40,0.8)';
    roundRect(ctx,tx2,tabY,tw,th,5); ctx.fill();
    ctx.strokeStyle=sel?'#00e5ff':'rgba(0,229,255,0.15)'; ctx.lineWidth=sel?1.5:1;
    roundRect(ctx,tx2,tabY,tw,th,5); ctx.stroke();
    ctx.fillStyle=sel?'#00e5ff':'rgba(200,220,255,0.5)';
    ctx.font=`bold ${sel?8:7}px 'Orbitron',sans-serif`; ctx.textAlign='center';
    ctx.fillText(tab,tx2+tw/2,tabY+14);
  });

  // ── Receitas da aba selecionada
  const tabRecipes=CRAFT_RECIPES.filter(r=>r.tab===invUI.craftTabSel);
  const recStartY=tabY+30, recW=panW-32, recH=52;
  invUI._craftBounds=[];
  ctx.save();
  ctx.rect(px+16,recStartY,panW-32,panH-recStartY+py-10);
  ctx.clip();

  const maxVisible=Math.floor((panH-(recStartY-py)-20)/recH);
  const scroll=invUI._craftScroll||0;
  const visibleRecipes=tabRecipes.slice(scroll, scroll+maxVisible);

  visibleRecipes.forEach((recipe,ri)=>{
    const ry2=recStartY+ri*recH;
    const unlocked=isRecipeUnlocked(recipe);
    const canCraft=unlocked && recipe.ingredients.every(ing=>countItem(ing.id)>=ing.qty);
    const sel=invUI.selectedRecipe===ri+scroll;
    // Bloqueada: exibe com opacidade e cadeado, não mostra ingredientes
    ctx.fillStyle=!unlocked?'rgba(10,10,20,0.85)':sel?'rgba(0,229,255,0.12)':canCraft?'rgba(0,180,100,0.10)':'rgba(15,25,45,0.7)';
    roundRect(ctx,px+16,ry2,recW,recH-4,6); ctx.fill();
    ctx.strokeStyle=!unlocked?'rgba(255,200,0,0.15)':sel?'#00e5ff':canCraft?'rgba(34,197,94,0.4)':'rgba(0,229,255,0.08)';
    ctx.lineWidth=sel?1.5:1;
    roundRect(ctx,px+16,ry2,recW,recH-4,6); ctx.stroke();
    invUI._craftBounds[ri+scroll]={x:px+16,y:ry2,w:recW,h:recH-4,recipe,ri:ri+scroll};

    // Ícone + nome
    ctx.font='20px serif'; ctx.textAlign='left';
    if(!unlocked){
      // Receita bloqueada: mostrar cadeado + hint de scan
      ctx.fillText('🔒',px+24,ry2+30);
      ctx.fillStyle='rgba(255,200,0,0.5)';
      ctx.font=`bold 9px 'Orbitron',sans-serif`;
      ctx.fillText('??? — ESCANEAR para desbloquear',px+50,ry2+16);
      const req=RECIPE_SCAN_UNLOCK[recipe.id]||[];
      const missing=req.filter(id=>typeof ScannedDB!=='undefined'&&!ScannedDB.has(id));
      ctx.fillStyle='rgba(255,200,0,0.35)'; ctx.font=`7px 'Share Tech Mono',monospace`;
      ctx.fillText(`Tiles necessários: ${missing.length} não escaneados`,px+50,ry2+30);
      return; // pular resto do render
    }
    ctx.fillText(recipe.icon||'?',px+24,ry2+30);
    ctx.fillStyle=canCraft?'#4ade80':'rgba(200,220,255,0.85)';
    ctx.font=`bold 9px 'Orbitron',sans-serif`;
    ctx.fillText(recipe.name,px+50,ry2+16);
    ctx.fillStyle='rgba(180,200,230,0.55)'; ctx.font=`8px 'Share Tech Mono',monospace`;
    ctx.fillText(recipe.desc||'',px+50,ry2+28);

    // Ingredientes
    let ingX=px+50;
    recipe.ingredients.forEach((ing,ii)=>{
      const def=ITEM_DEFS[ing.id];
      const have=countItem(ing.id);
      ctx.font='12px serif'; ctx.textAlign='left';
      ctx.fillText(def?def.icon:'?',ingX,ry2+42);
      ctx.font="8px 'Share Tech Mono',monospace"; ctx.textAlign='left';
      ctx.fillStyle=have>=ing.qty?'#4ade80':'#ef4444';
      ctx.fillText(`${have}/${ing.qty}`,ingX+14,ry2+42);
      ingX+=56;
    });

    // Resultado
    if(recipe.result){
      const rdef=ITEM_DEFS[recipe.result.id];
      ctx.font='14px serif'; ctx.textAlign='right';
      ctx.fillText(`→${rdef?rdef.icon:'?'}×${recipe.result.qty}`,px+panW-18,ry2+28);
    }

    // Craftar [C]
    if(canCraft){
      ctx.fillStyle='#00e5ff'; ctx.font=`bold 8px 'Orbitron',sans-serif`;
      ctx.textAlign='right';
      ctx.fillText('[CLICK/C]',px+panW-18,ry2+44);
    }
  });
  ctx.restore();

  // Scroll hints
  if(scroll>0){
    ctx.fillStyle='rgba(0,229,255,0.5)'; ctx.font='10px sans-serif'; ctx.textAlign='center';
    ctx.fillText('▲ scroll',W/2,recStartY-5);
  }
  if(scroll+maxVisible<tabRecipes.length){
    ctx.fillStyle='rgba(0,229,255,0.5)'; ctx.font='10px sans-serif'; ctx.textAlign='center';
    ctx.fillText('▼ scroll',W/2,py+panH-8);
  }

  ctx.restore();
}

// Craft via teclado (C) → encontra a primeira receita craftável na aba atual
function tryPlayerCraft(){
  if(!invUI.open) return;
  const tabRecipes=CRAFT_RECIPES.filter(r=>r.tab===invUI.craftTabSel);
  for(const recipe of tabRecipes){
    if(!isRecipeUnlocked(recipe)) continue; // pular bloqueadas por scan
    const canCraft=recipe.ingredients.every(ing=>countItem(ing.id)>=ing.qty);
    if(canCraft){ _doCraft(recipe); return; }
  }
  showAlert('Ingredientes insuficientes');
}

function _doCraft(recipe){
  for(const ing of recipe.ingredients) removeFromInventory(ing.id,ing.qty);
  if(recipe.result){
    addToInventory(recipe.result.id, recipe.result.qty);
    const rdef=ITEM_DEFS[recipe.result.id];
    showAlert(`✅ Craftado: ${rdef?rdef.name:recipe.name} ×${recipe.result.qty}`);
  }
  if(recipe.action) recipe.action();
  spawnBurst(robot.x,robot.y,'#4ade80',10,3);
}

// Clique no painel de craft
function handleInventoryClick(cx,cy){
  if(!invUI.open) return false;
  const panW=600, panH=560;
  const px=(W-panW)/2, py=(H-panH)/2;
  if(cx<px||cx>px+panW||cy<py||cy>py+panH) return false;

  // Clique em aba
  const tabY=py+(3*(42+5)+36+20);
  CRAFT_TABS.forEach((tab,ti)=>{
    const tw=88, th=22, tx2=px+16+ti*(tw+5);
    if(cx>=tx2&&cx<=tx2+tw&&cy>=tabY&&cy<=tabY+th){
      invUI.craftTabSel=ti; invUI._craftScroll=0; invUI.selectedRecipe=-1;
    }
  });

  // Clique em receita
  for(const [ri, bounds] of Object.entries(invUI._craftBounds||{})){
    if(!bounds) continue;
    if(cx>=bounds.x&&cx<=bounds.x+bounds.w&&cy>=bounds.y&&cy<=bounds.y+bounds.h){
      invUI.selectedRecipe=parseInt(ri);
      const recipe=bounds.recipe;
      if(!isRecipeUnlocked(recipe)){ showAlert('🔒 Escaneie os materiais para desbloquear'); return true; }
      const canCraft=recipe.ingredients.every(ing=>countItem(ing.id)>=ing.qty);
      if(canCraft) _doCraft(recipe);
      else showAlert('Ingredientes insuficientes');
      return true;
    }
  }
  return true;
}

// Scroll no painel de craft
function handleInventoryScroll(delta){
  if(!invUI.open) return;
  const tabRecipes=CRAFT_RECIPES.filter(r=>r.tab===invUI.craftTabSel);
  const panH=560, recH=52;
  const divY=3*(42+5)+36+20+30+30;
  const maxVisible=Math.floor((panH-divY)/recH);
  const maxScroll=Math.max(0,tabRecipes.length-maxVisible);
  invUI._craftScroll=Math.max(0,Math.min(maxScroll,(invUI._craftScroll||0)+Math.sign(delta)));
}

function resetInventory(){
  INVENTORY.slots.fill(null);
  INVENTORY.selected=0;
  INVENTORY.filter='all';
  INVENTORY.sortMode='none';
  INVENTORY.favorites.clear();
  invUI.open=false;
  invUI._craftBounds=[];
  invUI._slotBounds=[];
  invUI.selectedRecipe=-1;
  invUI.craftTabSel=0;
  invUI._craftScroll=0;
  worldItems.length=0;
}

// ─── Inventory Sorting & Filtering ─────────────────────────────
function sortInventory(){
  if(INVENTORY.sortMode==='none') return;
  
  const items = INVENTORY.slots.filter(s => s !== null);
  const emptySlots = INVENTORY.slots.length - items.length;
  
  if(INVENTORY.sortMode==='name'){
    items.sort((a,b) => {
      const defA = ITEM_DEFS[a.id] || {name:a.id};
      const defB = ITEM_DEFS[b.id] || {name:b.id};
      return defA.name.localeCompare(defB.name);
    });
  } else if(INVENTORY.sortMode==='category'){
    items.sort((a,b) => {
      const defA = ITEM_DEFS[a.id] || {cat:'other'};
      const defB = ITEM_DEFS[b.id] || {cat:'other'};
      return defA.cat.localeCompare(defB.cat);
    });
  } else if(INVENTORY.sortMode==='quantity'){
    items.sort((a,b) => b.qty - a.qty);
  }
  
  // Rebuild slots
  INVENTORY.slots.fill(null);
  for(let i=0; i<items.length; i++){
    INVENTORY.slots[i] = items[i];
  }
}

function getFilteredSlots(){
  if(INVENTORY.filter==='all') return INVENTORY.slots;
  
  return INVENTORY.slots.map((slot, idx) => ({slot, idx}))
    .filter(({slot}) => {
      if(!slot) return false;
      const def = ITEM_DEFS[slot.id];
      return def && def.cat === INVENTORY.filter;
    })
    .map(({slot, idx}) => ({slot, originalIdx: idx}));
}

function toggleFavorite(itemId){
  if(INVENTORY.favorites.has(itemId)){
    INVENTORY.favorites.delete(itemId);
    showAlert('⭐ Removido dos favoritos');
  } else {
    INVENTORY.favorites.add(itemId);
    showAlert('⭐ Adicionado aos favoritos');
  }
}

// ─── Descarte de item ───────────────────────────────────────────
// ADIÇÃO: antes não existia nenhuma forma de esvaziar um slot. Sem isso,
// um inventário cheio (ver BUG FIX em updateWorldItems) travava o jogador
// permanentemente — ele ficaria sabendo que está cheio, mas sem poder agir.
// dropAll=false descarta 1 unidade; dropAll=true descarta a pilha inteira.
function discardFromInventory(slotIndex, dropAll=false){
  if(slotIndex<0 || slotIndex>=INVENTORY.slots.length) return false;
  const slot=INVENTORY.slots[slotIndex];
  if(!slot) return false;
  const def=ITEM_DEFS[slot.id];
  const dropQty=dropAll?slot.qty:1;
  worldItems.push({
    id:slot.id,
    x:robot.x+(Math.random()-0.5)*30,
    y:robot.y+(Math.random()-0.5)*30,
    qty:dropQty,
    bobOffset:Math.random()*Math.PI*2,
    age:0, collected:false, ttl:1800,
    // Imunidade de coleta por ~1s: sem isso, o item cai dentro do próprio
    // raio de pickup do jogador e é reabsorvido na MESMA atualização —
    // antes até de outro item que já estava esperando vaga (a fila de
    // updateWorldItems processa em ordem inversa de inserção).
    noPickup:60,
  });
  slot.qty-=dropQty;
  if(slot.qty<=0) INVENTORY.slots[slotIndex]=null;
  showAlert(`🗑 Descartado: ${def?def.name:slot.id} ×${dropQty}`);
  return true;
}

// Usar item selecionado na hotbar com Enter/T
function useHotbarItem(){
  const slot=INVENTORY.slots[INVENTORY.selected];
  if(!slot) return;
  const def=ITEM_DEFS[slot.id];
  if(!def) return;
  // Consumíveis têm receita de uso na tab 3
  const useRecipe=CRAFT_RECIPES.find(r=>r.tab===3 && r.ingredients.length===1 && r.ingredients[0].id===slot.id);
  if(useRecipe){
    const canUse=countItem(slot.id)>=1;
    if(canUse){ removeFromInventory(slot.id,1); if(useRecipe.action) useRecipe.action(); }
  }
}
