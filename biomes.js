/* ============================================================
   SIGNAL LOST — biomes.js  v2.0
   Efeitos reais de bioma: calor, energia, iluminação, partículas
   Carregado ANTES de game.js no index.html
   ============================================================ */
'use strict';

// ─── Tabela mestra — heatRate/energyRate por frame a 60fps ───
const BIOME_FX = {
  [4 /*GRASS*/]:        { heatRate:-0.04, energyRate:0,     visionR:480, trailCol:'#7dd3fc' },
  [5 /*FOREST*/]:       { heatRate:-0.06, energyRate:0.01,  visionR:300, trailCol:'#4ade80' },
  [3 /*SAND*/]:         { heatRate: 0.05, energyRate:0,     visionR:480, trailCol:'#fde68a' },
  [6 /*ROCK*/]:         { heatRate: 0.02, energyRate:0,     visionR:460, trailCol:'#94a3b8' },
  [7 /*SNOW*/]:         { heatRate:-0.10, energyRate:0.015, visionR:460, trailCol:'#bae6fd' },
  [9 /*ICE*/]:          { heatRate:-0.12, energyRate:0.02,  visionR:460, trailCol:'#e0f2fe' },
  [10/*DESERT*/]:       { heatRate: 0.12, energyRate:-0.01, visionR:480, trailCol:'#fbbf24' },
  [8 /*LAVA*/]:         { heatRate: 0.90, energyRate:-0.02, visionR:460, trailCol:'#f97316',  dmg:0.4,  dmgCol:'#f97316' },
  [19/*MUSHROOM*/]:     { heatRate: 0.01, energyRate:0.015, visionR:360, trailCol:'#c084fc' },
  [1 /*DEEP_WATER*/]:   { heatRate:-0.28, energyRate:-0.08, visionR:380, trailCol:'#38bdf8' },
  [2 /*WATER*/]:        { heatRate:-0.20, energyRate:0,     visionR:440, trailCol:'#38bdf8' },
  [20/*SWAMP*/]:        { heatRate: 0.06, energyRate:-0.03, visionR:300, trailCol:'#6abf3d' },
  [21/*TOXIC*/]:        { heatRate: 0.35, energyRate:-0.05, visionR:300, trailCol:'#6abf3d',  dmg:0.12, dmgCol:'#6abf3d' },
  [22/*VOLCANIC_ASH*/]: { heatRate: 0.16, energyRate:0,     visionR:340, trailCol:'#78716c' },
  [23/*CORAL*/]:        { heatRate:-0.15, energyRate:0,     visionR:440, trailCol:'#2dd4bf' },
  [24/*TUNDRA*/]:       { heatRate:-0.07, energyRate:0.01,  visionR:460, trailCol:'#e2e8f0' },
  [25/*SAVANNA*/]:      { heatRate: 0.07, energyRate:0,     visionR:480, trailCol:'#d97706' },
  [11/*DIRT*/]:         { heatRate:0,     energyRate:0,     visionR:200, trailCol:'#92400e' },
  [12/*STONE*/]:        { heatRate:0,     energyRate:0,     visionR:200, trailCol:'#475569' },
  [13/*IRON*/]:         { heatRate:0,     energyRate:0,     visionR:200, trailCol:'#b45309' },
  [14/*CRYSTAL*/]:      { heatRate:-0.05, energyRate:0.02,  visionR:240, trailCol:'#818cf8' },
  [15/*OBSIDIAN*/]:     { heatRate: 0.08, energyRate:0,     visionR:180, trailCol:'#4c1d95' },
  [17/*CAVE_WALL*/]:    { heatRate:0,     energyRate:0,     visionR:200, trailCol:'#374151' },
  [18/*CAVE_FLOOR*/]:   { heatRate:0,     energyRate:0,     visionR:200, trailCol:'#1f2937' },
  [34/*CRYSTAL_FLOOR*/]:{ heatRate:-0.04, energyRate:0.01,  visionR:240, trailCol:'#6d28d9' },
  [30/*VOID_FLOOR*/]:   { heatRate: 0.03, energyRate:-0.04, visionR:160, trailCol:'#a78bfa' },
  [35/*GHOST_GRASS*/]:  { heatRate:0,     energyRate:-0.02, visionR:200, trailCol:'#7c3aed' },
};
const BIOME_FX_DEFAULT = { heatRate:0, energyRate:0, visionR:480, trailCol:'#7dd3fc' };
function getBiomeFX(tileId){ return BIOME_FX[tileId] || BIOME_FX_DEFAULT; }

function getCurrentVisionRadius(){
  const tile = getTile(Math.floor(robot.x/TILE), Math.floor(robot.y/TILE));
  let r = getBiomeFX(tile).visionR;
  const ep = robot.energy / robot.maxEnergy;
  if(ep < 0.3) r *= 0.5 + ep;
  const hp2 = robot.heat / robot.maxHeat;
  if(hp2 > 0.75) r *= 0.82 + Math.sin(time*0.42)*0.18;
  return Math.max(80, r);
}

function applyBiomeEffects(tile){
  const fx = getBiomeFX(tile);
  if(fx.heatRate > 0)      robot.heat = Math.min(robot.maxHeat, robot.heat + fx.heatRate);
  else if(fx.heatRate < 0) robot.heat = Math.max(0,             robot.heat + fx.heatRate);
  if(fx.energyRate !== 0)
    robot.energy = Math.max(0, Math.min(robot.maxEnergy, robot.energy + fx.energyRate));
  if(fx.dmg){
    robot.hp = Math.max(0, robot.hp - fx.dmg);
    if(Math.random()<0.18)
      spawnParticle(robot.x+(Math.random()-.5)*20, robot.y+(Math.random()-.5)*20,
        (Math.random()-.5)*1.5,(Math.random()-.5)*1.5, 20, fx.dmgCol, 3);
  }
  if(robot.heat >= robot.maxHeat){
    robot.hp = Math.max(0, robot.hp - 0.3);
    if(Math.random()<0.15)
      spawnParticle(robot.x+(Math.random()-.5)*20, robot.y,
        (Math.random()-.5)*1.5,-1-Math.random()*2, 20,'#ef4444',3);
  }
  biomeAmbientParticles(tile);
}

function biomeAmbientParticles(tile){
  const rx=robot.x, ry=robot.y;
  switch(tile){
    case 7: case 24: case 9:
      if(Math.random()<0.025)spawnParticle(rx+(Math.random()-.5)*40,ry+(Math.random()-.5)*40,(Math.random()-.5)*.3,-.2,40,'#e0f2fe',2);break;
    case 19:
      if(Math.random()<0.018)spawnParticle(rx+(Math.random()-.5)*28,ry+(Math.random()-.5)*28,(Math.random()-.5)*.6,-.4,35,'#c084fc',2);break;
    case 14: case 34:
      if(Math.random()<0.035)spawnParticle(rx+(Math.random()-.5)*22,ry+(Math.random()-.5)*22,(Math.random()-.5)*.4,(Math.random()-.5)*.4,22,'#818cf8',2);break;
    case 1:
      if(Math.random()<0.04)spawnParticle(rx+(Math.random()-.5)*18,ry+(Math.random()-.5)*18,(Math.random()-.5)*.4,(Math.random()-.5)*.4,28,'#38bdf8',2);break;
    case 20:
      if(Math.random()<0.015)spawnParticle(rx+(Math.random()-.5)*24,ry+(Math.random()-.5)*24,(Math.random()-.5)*.3,-.3,30,'#6abf3d',2);break;
  }
}

function getBiomeThrust(tile, speedBonus){
  if(tile===2||tile===23) return 0.14*speedBonus;
  if(tile===1)            return 0.10*speedBonus;
  if(tile===20)           return 0.10*speedBonus;
  if(tile===9)            return 0.46*speedBonus;
  return 0.32*speedBonus;
}
function getBiomeMaxSpeed(tile){
  if(tile===1)return 1.5;
  if(tile===2||tile===20||tile===23)return 2.5;
  if(tile===9)return 8.5;
  return 6.5;
}
function getBiomeDrag(tile){
  const m={[1]:.880,[2]:.940,[9]:.975,[8]:.900,[20]:.970,[21]:.930,[23]:.890};
  return m[tile]||0.984;
}
