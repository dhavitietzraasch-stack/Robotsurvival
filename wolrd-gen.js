/* ============================================================
   SIGNAL LOST — world-gen.js  v3.0
   Sistema de Geração Climática e Ecológica
   Substitui generateSurface() em game.js

  

   ARQUITETURA:
   • Camadas de noise independentes (temperatura, umidade,
     altitude, erosão, estranheza, corrupção, continentes)
   • Sistema de afinidade de biomas com regras climáticas
   • Anti-repetição com memória regional e penalidade dinâmica
   • Transições graduais entre biomas vizinhos
   • Biomas "não naturais" raros e isolados
   ============================================================ */
'use strict';

/* ─────────────────────────────────────────────────────────────
   TABELA MESTRA DE BIOMAS
   Cada entrada define as condições ideais e comportamento
   de expansão de um bioma.
   ───────────────────────────────────────────────────────────── */
const BIOME_DEF = {
  // ── Biomas comuns / naturais ──────────────────────────────
  [T.GRASS]: {
    name:'Pradaria',
    tempMin:-0.2, tempMax:0.6,
    humidMin:0.1, humidMax:0.7,
    altMin:-0.1,  altMax:0.5,
    weight:10, rarity:0, aggression:0.7,
    repeatLimit:6,  resistance:0.4,
    compatible:[T.FOREST,T.SAVANNA,T.SWAMP,T.SAND],
    incompatible:[T.SNOW,T.ICE,T.DESERT,T.LAVA,T.TUNDRA],
    transitionChance:0.55, sizeTarget:60, sizeMin:15, sizeMax:120,
    natural:true,
  },
  [T.FOREST]: {
    name:'Floresta',
    tempMin:-0.1, tempMax:0.5,
    humidMin:0.3, humidMax:1.0,
    altMin:-0.05, altMax:0.45,
    weight:9, rarity:0, aggression:0.8,
    repeatLimit:5, resistance:0.5,
    compatible:[T.GRASS,T.SWAMP,T.MUSHROOM,T.TUNDRA],
    incompatible:[T.DESERT,T.LAVA,T.VOLCANIC_ASH,T.ICE],
    transitionChance:0.60, sizeTarget:80, sizeMin:20, sizeMax:150,
    natural:true,
  },
  [T.SAVANNA]: {
    name:'Savana',
    tempMin:0.2,  tempMax:0.85,
    humidMin:0.0, humidMax:0.35,
    altMin:-0.1,  altMax:0.4,
    weight:7, rarity:0, aggression:0.6,
    repeatLimit:4, resistance:0.35,
    compatible:[T.GRASS,T.SAND,T.DESERT],
    incompatible:[T.SNOW,T.ICE,T.FOREST,T.SWAMP,T.TUNDRA],
    transitionChance:0.50, sizeTarget:70, sizeMin:15, sizeMax:130,
    natural:true,
  },
  [T.SAND]: {
    name:'Praia/Areia',
    tempMin:0.0,  tempMax:0.9,
    humidMin:0.0, humidMax:0.5,
    altMin:-0.25, altMax:0.2,
    weight:6, rarity:0, aggression:0.5,
    repeatLimit:4, resistance:0.3,
    compatible:[T.SAVANNA,T.DESERT,T.GRASS,T.WATER],
    incompatible:[T.SNOW,T.TUNDRA,T.FOREST],
    transitionChance:0.55, sizeTarget:40, sizeMin:8, sizeMax:90,
    natural:true,
  },
  [T.DESERT]: {
    name:'Deserto',
    tempMin:0.45, tempMax:1.0,
    humidMin:0.0, humidMax:0.15,
    altMin:-0.05, altMax:0.35,
    weight:6, rarity:0.1, aggression:0.55,
    repeatLimit:4, resistance:0.45,
    compatible:[T.SAVANNA,T.SAND,T.VOLCANIC_ASH],
    incompatible:[T.SNOW,T.ICE,T.TUNDRA,T.FOREST,T.SWAMP],
    transitionChance:0.45, sizeTarget:90, sizeMin:25, sizeMax:180,
    natural:true,
  },
  [T.SWAMP]: {
    name:'Pântano',
    tempMin:0.0,  tempMax:0.55,
    humidMin:0.55, humidMax:1.0,
    altMin:-0.3,  altMax:0.1,
    weight:5, rarity:0.1, aggression:0.6,
    repeatLimit:3, resistance:0.4,
    compatible:[T.FOREST,T.GRASS,T.MUSHROOM],
    incompatible:[T.DESERT,T.SAND,T.ICE,T.LAVA,T.TUNDRA],
    transitionChance:0.50, sizeTarget:50, sizeMin:12, sizeMax:100,
    natural:true,
  },
  [T.SNOW]: {
    name:'Neve',
    tempMin:-1.0, tempMax:-0.25,
    humidMin:0.1, humidMax:0.8,
    altMin:-0.1,  altMax:1.0,
    weight:6, rarity:0, aggression:0.65,
    repeatLimit:5, resistance:0.55,
    compatible:[T.TUNDRA,T.ICE],
    incompatible:[T.DESERT,T.SAVANNA,T.LAVA,T.SWAMP,T.GRASS,T.FOREST],
    transitionChance:0.55, sizeTarget:80, sizeMin:20, sizeMax:160,
    natural:true,
  },
  [T.TUNDRA]: {
    name:'Tundra',
    tempMin:-0.6, tempMax:0.0,
    humidMin:0.0, humidMax:0.5,
    altMin:-0.1,  altMax:0.6,
    weight:5, rarity:0, aggression:0.55,
    repeatLimit:4, resistance:0.45,
    compatible:[T.SNOW,T.ICE,T.FOREST],
    incompatible:[T.DESERT,T.SAVANNA,T.LAVA,T.SWAMP],
    transitionChance:0.55, sizeTarget:70, sizeMin:15, sizeMax:140,
    natural:true,
  },
  [T.ICE]: {
    name:'Glacial',
    tempMin:-1.0, tempMax:-0.5,
    humidMin:0.2, humidMax:1.0,
    altMin:0.1,   altMax:1.0,
    weight:4, rarity:0.15, aggression:0.50,
    repeatLimit:3, resistance:0.60,
    compatible:[T.SNOW,T.TUNDRA],
    incompatible:[T.DESERT,T.SAVANNA,T.LAVA,T.SWAMP,T.GRASS,T.FOREST],
    transitionChance:0.40, sizeTarget:50, sizeMin:10, sizeMax:100,
    natural:true,
  },
  [T.MUSHROOM]: {
    name:'Fungal',
    tempMin:0.0,  tempMax:0.45,
    humidMin:0.4, humidMax:0.9,
    altMin:-0.1,  altMax:0.3,
    weight:3, rarity:0.25, aggression:0.4,
    repeatLimit:2, resistance:0.35,
    compatible:[T.FOREST,T.SWAMP],
    incompatible:[T.DESERT,T.SAND,T.ICE,T.LAVA],
    transitionChance:0.40, sizeTarget:35, sizeMin:8, sizeMax:70,
    natural:true,
  },
  [T.VOLCANIC_ASH]: {
    name:'Cinzas Vulcânicas',
    tempMin:0.3,  tempMax:0.95,
    humidMin:0.0, humidMax:0.3,
    altMin:0.0,   altMax:0.6,
    weight:4, rarity:0.2, aggression:0.45,
    repeatLimit:2, resistance:0.5,
    compatible:[T.DESERT,T.SAVANNA,T.ROCK],
    incompatible:[T.FOREST,T.SNOW,T.ICE,T.SWAMP],
    transitionChance:0.45, sizeTarget:45, sizeMin:10, sizeMax:80,
    natural:true,
  },
  // ── Água / Mar — colocados por altitude, não por Voronoi ──
  [T.WATER]: {
    name:'Água',
    tempMin:-1.0, tempMax:1.0,
    humidMin:0.0, humidMax:1.0,
    altMin:-1.0,  altMax:-0.15,
    weight:8, rarity:0, aggression:0.9,
    repeatLimit:99, resistance:0.8,
    compatible:[T.SAND,T.CORAL,T.SWAMP],
    incompatible:[],
    transitionChance:0.8, sizeTarget:200, sizeMin:30, sizeMax:500,
    natural:true,
  },
  [T.DEEP_WATER]: {
    name:'Mar Profundo',
    tempMin:-1.0, tempMax:1.0,
    humidMin:0.0, humidMax:1.0,
    altMin:-1.0,  altMax:-0.38,
    weight:7, rarity:0, aggression:0.9,
    repeatLimit:99, resistance:0.9,
    compatible:[T.WATER,T.CORAL],
    incompatible:[],
    transitionChance:0.85, sizeTarget:300, sizeMin:50, sizeMax:800,
    natural:true,
  },
  [T.CORAL]: {
    name:'Recife de Coral',
    tempMin:0.1,  tempMax:0.7,
    humidMin:0.5, humidMax:1.0,
    altMin:-0.35, altMax:-0.1,
    weight:3, rarity:0.2, aggression:0.3,
    repeatLimit:2, resistance:0.3,
    compatible:[T.WATER,T.SAND],
    incompatible:[T.ICE,T.SNOW,T.TUNDRA],
    transitionChance:0.40, sizeTarget:30, sizeMin:6, sizeMax:60,
    natural:true,
  },
  // ── Biomas "não naturais" — raros, isolados ───────────────
  [T.TOXIC]: {
    name:'Zona Tóxica',
    tempMin:0.0,  tempMax:0.7,
    humidMin:0.3, humidMax:0.8,
    altMin:-0.2,  altMax:0.3,
    weight:1, rarity:0.65, aggression:0.2,
    repeatLimit:1, resistance:0.2,
    compatible:[T.SWAMP],
    incompatible:[T.ICE,T.SNOW,T.DESERT,T.SAVANNA],
    transitionChance:0.20, sizeTarget:18, sizeMin:4, sizeMax:40,
    natural:false,
  },
  [T.LAVA]: {
    name:'Vulcânico',
    tempMin:0.5,  tempMax:1.0,
    humidMin:0.0, humidMax:0.2,
    altMin:0.0,   altMax:0.8,
    weight:1, rarity:0.65, aggression:0.15,
    repeatLimit:1, resistance:0.25,
    compatible:[T.VOLCANIC_ASH],
    incompatible:[T.WATER,T.ICE,T.SNOW,T.FOREST,T.SWAMP],
    transitionChance:0.15, sizeTarget:15, sizeMin:3, sizeMax:35,
    natural:false,
  },
};

/* ─────────────────────────────────────────────────────────────
   REGRAS DE TRANSIÇÃO: quais biomas podem fazer fronteira
   com quais, e qual bioma intermediário usar.
   ───────────────────────────────────────────────────────────── */
const TRANSITION_RULES = {
  // Deserto → Floresta: passar por savana + grama
  [T.DESERT]: {
    [T.FOREST]: [T.SAVANNA, T.GRASS],
    [T.SNOW]:   [T.SAVANNA, T.GRASS, T.TUNDRA],
    [T.SWAMP]:  [T.SAVANNA, T.GRASS],
    [T.ICE]:    [T.SAVANNA, T.GRASS, T.TUNDRA, T.SNOW],
  },
  [T.SNOW]: {
    [T.DESERT]: [T.TUNDRA, T.GRASS, T.SAVANNA],
    [T.SAVANNA]: [T.TUNDRA, T.GRASS],
    [T.SWAMP]:  [T.TUNDRA, T.GRASS],
    [T.LAVA]:   [T.TUNDRA, T.GRASS, T.SAVANNA],
  },
  [T.LAVA]: {
    [T.SNOW]:   [T.VOLCANIC_ASH, T.DESERT, T.SAVANNA],
    [T.ICE]:    [T.VOLCANIC_ASH, T.DESERT, T.SAVANNA],
    [T.FOREST]: [T.VOLCANIC_ASH, T.SAVANNA],
    [T.SWAMP]:  [T.VOLCANIC_ASH, T.SAVANNA],
  },
};

/* ─────────────────────────────────────────────────────────────
   GERADOR CLIMÁTICO PRINCIPAL
   Substitui generateSurface() no game.js
   ───────────────────────────────────────────────────────────── */
// NOTA: game.js usa `function generateSurface` (declaration hoisted).
// Para sobrescrever de um script carregado depois, usamos window.generateSurface.
// A flag window._worldGenPatched indica ao generateWorld() que deve usar esta versão.
window._worldGenPatched = true;
window.generateSurface = function generateSurface(rand, rng0) {
  const wg = worldGrids[DIM.SURFACE];
  const ig = integrities[DIM.SURFACE];

  // Safety check: ensure rng0 is a function, fallback to rand if needed
  const seedFunc = (typeof rng0 === 'function') ? rng0 : rand;

  /* ── 1. Criar múltiplas camadas de noise independentes ───── */
  const nContinent = createNoise(mulberry32(seedFunc())); // massa continental
  const nElev      = createNoise(mulberry32(seedFunc())); // altitude local
  const nElev2     = createNoise(mulberry32(seedFunc())); // detalhe de altitude
  const nTemp      = createNoise(mulberry32(seedFunc())); // temperatura regional
  const nHumid     = createNoise(mulberry32(seedFunc())); // umidade
  const nErosion   = createNoise(mulberry32(seedFunc())); // erosão / ondulação
  const nRock      = createNoise(mulberry32(seedFunc())); // afloramentos rochosos
  const nRiver     = createNoise(mulberry32(seedFunc())); // rios
  const nWeird     = createNoise(mulberry32(seedFunc())); // estranheza / anomalia
  const nCorrupt   = createNoise(mulberry32(seedFunc())); // corrupção / tóxico
  const nSpec      = createNoise(mulberry32(seedFunc())); // vulcanismo especial

  /* ── 2. Pré-computar campos climáticos ────────────────────── */
  const W = WORLD_W, H = WORLD_H;
  const sz = W * H;

  const tempField   = new Float32Array(sz);
  const humidField  = new Float32Array(sz);
  const elevField   = new Float32Array(sz);
  const weirdField  = new Float32Array(sz);
  const corruptField= new Float32Array(sz);

  /* Escala de noise: maior = mais detalhado, menor = mais largo */
  const CONT_SCALE  = 0.0025; // continentes gigantes
  const ELEV_SCALE  = 0.007;  // altitude base
  const ELEV2_SCALE = 0.020;  // detalhe de altitude
  const TEMP_SCALE  = 0.006;  // temperatura regional
  const HUMID_SCALE = 0.008;  // umidade regional
  const EROSION_SC  = 0.015;  // erosão
  const WEIRD_SCALE = 0.012;  // estranheza
  const CORR_SCALE  = 0.018;  // corrupção

  // Offsets aleatórios para variar o mundo a cada seed
  const ox = rand() * 9999;
  const oy = rand() * 9999;

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const idx = wi(tx, ty);

      // Latitude normalizada: -1 (norte) a +1 (sul), com variação senoidal
      const lat = (ty / H) * 2.0 - 1.0;
      // Longitude normalizada
      const lon = (tx / W) * 2.0 - 1.0;

      // Massa continental: ilhas/continentes de grande escala
      const continent = nContinent(tx * CONT_SCALE + ox, ty * CONT_SCALE + oy);
      const continent2 = nContinent(tx * CONT_SCALE * 2.2 + ox + 500, ty * CONT_SCALE * 2.2 + oy + 500) * 0.4;
      const continentVal = continent * 0.7 + continent2;

      // Altitude: combinação de continental + local
      const e1 = nElev(tx * ELEV_SCALE + ox, ty * ELEV_SCALE + oy);
      const e2 = nElev2(tx * ELEV2_SCALE + ox + 1000, ty * ELEV2_SCALE + oy + 1000) * 0.35;
      const erosion = nErosion(tx * EROSION_SC + ox + 3000, ty * EROSION_SC + oy + 3000) * 0.15;
      // Continentes elevam a altitude; oceanos a reduzem
      const baseElev = continentVal * 0.55 + e1 * 0.35 + e2 + erosion;
      elevField[idx] = baseElev;

      // Temperatura: latitude (frio nos extremos), altitude (frio em montanhas),
      //              correntes regionais (noise)
      const latCold = Math.abs(lat) * 0.8; // polar cooling
      const altCool = Math.max(0, baseElev * 0.6); // altitude cooling
      const tempNoise = nTemp(tx * TEMP_SCALE + ox + 2000, ty * TEMP_SCALE + oy + 2000) * 0.4;
      // Sombra de chuva: encostas a barlavento mais quentes/secas
      const windShadow = nErosion(tx * 0.009 + ox + 6000, ty * 0.009 + oy + 6000) * 0.12;
      tempField[idx] = 0.5 - latCold - altCool + tempNoise + windShadow;
      // Normalizar grosseiramente em [-1, 1]
      tempField[idx] = Math.max(-1, Math.min(1, tempField[idx]));

      // Umidade: proximidade oceânica (baixa altitude = mais úmido),
      //          correntes de vento regionais, altitude (chuva orográfica)
      const oceanProx = Math.max(0, 0.5 - baseElev) * 1.2; // perto de água = úmido
      const humidNoise = nHumid(tx * HUMID_SCALE + ox + 4000, ty * HUMID_SCALE + oy + 4000) * 0.7;
      // Sombra de chuva: montanhas bloqueiam umidade
      const rainShadow = Math.max(0, baseElev * 0.30);
      humidField[idx] = Math.max(0, Math.min(1, 0.45 + oceanProx + humidNoise - rainShadow + windShadow));

      // Estranheza: anomalias raras
      const w1 = nWeird(tx * WEIRD_SCALE + ox + 7000, ty * WEIRD_SCALE + oy + 7000);
      const w2 = nWeird(tx * WEIRD_SCALE * 2.5 + ox + 7500, ty * WEIRD_SCALE * 2.5 + oy + 7500) * 0.4;
      weirdField[idx] = w1 * 0.7 + w2;

      // Corrupção: zonas tóxicas raras
      const c1 = nCorrupt(tx * CORR_SCALE + ox + 8000, ty * CORR_SCALE + oy + 8000);
      const c2 = nCorrupt(tx * CORR_SCALE * 3.0 + ox + 8500, ty * CORR_SCALE * 3.0 + oy + 8500) * 0.35;
      corruptField[idx] = c1 * 0.65 + c2;
    }
  }

  /* ── 3. Classificar cada tile em um bioma climático ──────── */
  // Primeiro, determinar o bioma "cru" baseado nos campos climáticos
  const rawBiome = new Uint8Array(sz);

  // Contador de biomas para sistema anti-repetição
  const biomeCounts = {};

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const idx = wi(tx, ty);
      const elev  = elevField[idx];
      const temp  = tempField[idx];
      const humid = humidField[idx];
      const weird = weirdField[idx];
      const corr  = corruptField[idx];

      // ── Altitude determina água / neve de montanha ──────────
      if (elev < -0.38) {
        rawBiome[idx] = T.DEEP_WATER; continue;
      }
      if (elev < -0.18) {
        rawBiome[idx] = T.WATER; continue;
      }
      // Praia/areia: transição entre água e terra
      if (elev < -0.04) {
        rawBiome[idx] = T.SAND; continue;
      }
      // Montanhas altas → neve independentemente da latitude
      if (elev > 0.52) {
        rawBiome[idx] = T.SNOW; continue;
      }
      // Montanhas médias em regiões frias → neve/gelo
      if (elev > 0.38 && temp < -0.1) {
        rawBiome[idx] = temp < -0.35 ? T.ICE : T.SNOW; continue;
      }

      // ── Biomas "não naturais" — verificar primeiro (raros) ──
      // Vulcanismo especial (zona geotérmica muito específica)
      const specV = nSpec(tx * 0.030 + ox + 9000, ty * 0.030 + oy + 9000);
      if (specV > 0.72 && temp > 0.3) {
        rawBiome[idx] = T.LAVA; continue;
      }
      if (specV > 0.60 && temp > 0.2) {
        rawBiome[idx] = T.VOLCANIC_ASH; continue;
      }
      // Zona tóxica (corrupção ambiental)
      if (corr > 0.65 && humid > 0.3 && temp > -0.1) {
        rawBiome[idx] = T.TOXIC; continue;
      }
      // Recife de coral (água rasa quente)
      // (Coral aparece como layer sobre água, tratado depois)

      // ── Classificação climática principal ──────────────────
      // Regiões polares / frias
      if (temp < -0.35) {
        if (humid > 0.35)      { rawBiome[idx] = T.ICE; continue; }
        else                   { rawBiome[idx] = T.SNOW; continue; }
      }
      if (temp < -0.05) {
        if (elev > 0.25)       { rawBiome[idx] = T.SNOW; continue; }
        if (humid > 0.3)       { rawBiome[idx] = T.TUNDRA; continue; }
        rawBiome[idx] = T.SNOW; continue;
      }
      if (temp < 0.15) {
        if (humid > 0.45)      { rawBiome[idx] = T.FOREST; continue; }
        if (humid > 0.15)      { rawBiome[idx] = T.TUNDRA; continue; }
        rawBiome[idx] = T.GRASS; continue;
      }

      // Regiões temperadas
      if (temp < 0.40) {
        if (humid > 0.65)      { rawBiome[idx] = T.SWAMP; continue; }
        if (humid > 0.40)      {
          rawBiome[idx] = weird > 0.50 ? T.MUSHROOM : T.FOREST; continue;
        }
        if (humid > 0.18)      { rawBiome[idx] = T.GRASS; continue; }
        rawBiome[idx] = T.SAVANNA; continue;
      }

      // Regiões quentes / tropicais
      if (temp < 0.65) {
        if (humid > 0.60)      { rawBiome[idx] = T.SWAMP; continue; }
        if (humid > 0.35)      { rawBiome[idx] = T.FOREST; continue; }
        if (humid > 0.15)      { rawBiome[idx] = T.SAVANNA; continue; }
        rawBiome[idx] = T.DESERT; continue;
      }

      // Regiões áridas / xéricas
if (humid > 0.30) {
    rawBiome[idx] = T.SAVANNA;
    continue;
}

if (humid > 0.12) {
    rawBiome[idx] = rand() < 0.75 ? T.SAVANNA : T.DESERT;
    continue;
}

if (humid > 0.05) {
    rawBiome[idx] = rand() < 0.40 ? T.SAVANNA : T.DESERT;
    continue;
}

rawBiome[idx] = T.DESERT;

  /* ── 4. Adicionar coral em água rasa quente ──────────────── */
  // seedFunc já foi usado 11 vezes acima; continuar a sequência
  const nCoralMask = createNoise(mulberry32(seedFunc()));
  for (let ty = 1; ty < H - 1; ty++) {
    for (let tx = 1; tx < W - 1; tx++) {
      const idx = wi(tx, ty);
      if (rawBiome[idx] !== T.WATER) continue;
      const temp = tempField[idx];
      if (temp < 0.1) continue;
      const coralN = nCoralMask(tx * 0.025 + ox + 11000, ty * 0.025 + oy + 11000);
      if (coralN > 0.55 && rand() < 0.15) {
        rawBiome[idx] = T.CORAL;
      }
    }
  }

  /* ── 5. Suavização / anti-ruído ─────────────────────────── */
  // Remover tiles isolados de biomas "estranhos" rodeados por outro bioma
  // Fazer 2 passes para aumentar coerência regional
  const smoothed = new Uint8Array(rawBiome);

  for (let pass = 0; pass < 2; pass++) {
    const src = new Uint8Array(smoothed);
    for (let ty = 1; ty < H - 1; ty++) {
      for (let tx = 1; tx < W - 1; tx++) {
        const idx = wi(tx, ty);
        const t = src[idx];
        // Não suavizar água, lava ou tiles sólidos
        if (t === T.DEEP_WATER || t === T.WATER || t === T.LAVA) continue;

        // Contar biomas vizinhos (4-vizinhos)
        const neighbors = [
          src[wi(tx-1, ty)], src[wi(tx+1, ty)],
          src[wi(tx, ty-1)], src[wi(tx, ty+1)]
        ];
        let same = 0;
        const counts = {};
        for (const nb of neighbors) {
          counts[nb] = (counts[nb] || 0) + 1;
          if (nb === t) same++;
        }

        // Tile isolado (sem vizinhos do mesmo tipo) → blend com vizinhos
        if (same === 0) {
          // Escolher bioma mais comum entre os 4 vizinhos (excluindo água profunda)
          let bestCount = 0, bestTile = t;
          for (const [tid, cnt] of Object.entries(counts)) {
            const tid2 = +tid;
            if (cnt > bestCount && tid2 !== T.DEEP_WATER) {
              bestCount = cnt; bestTile = tid2;
            }
          }
          smoothed[idx] = bestTile;
        }
        // Tile em minoria (1 vizinho igual, 3 diferentes) → chance de blend
        else if (same === 1 && pass === 0) {
          const def = BIOME_DEF[t];
          // Biomas raros e não-naturais resistem menos à suavização
          const blendChance = def ? (def.natural ? 0.15 : 0.45) : 0.3;
          if (rand() < blendChance) {
            let bestCount = 0, bestTile = t;
            for (const [tid, cnt] of Object.entries(counts)) {
              const tid2 = +tid;
              if (cnt > bestCount && tid2 !== t && tid2 !== T.DEEP_WATER) {
                bestCount = cnt; bestTile = tid2;
              }
            }
            smoothed[idx] = bestTile;
          }
        }
      }
    }
  }

  /* ── 6. Adicionar afloramentos rochosos sobre terreno ──────
     Rochas aparecem em altitude mais alta mas abaixo da neve,
     ou em regiões áridas. Integradas no terreno, não aleatórias. */
  const rockSrc = new Uint8Array(smoothed);
  for (let ty = 1; ty < H - 1; ty++) {
    for (let tx = 1; tx < W - 1; tx++) {
      const idx = wi(tx, ty);
      const t = rockSrc[idx];
      if (t === T.DEEP_WATER || t === T.WATER || t === T.LAVA ||
          t === T.SAND || t === T.CORAL) continue;

      const rn  = nRock(tx * 0.048 + ox + 1234, ty * 0.048 + oy + 5678);
      const rn2 = nRock(tx * 0.090 + ox + 9000, ty * 0.090 + oy + 4321) * 0.35;
      const rockVal = rn + rn2;
      const elev = elevField[idx];

      // Mais rochas em altitudes médias-altas e biomas secos
      const rockBonus = Math.max(0, elev * 0.4) +
        (t === T.DESERT || t === T.VOLCANIC_ASH ? 0.08 : 0);

      if (rockVal + rockBonus > 0.65) {
        let tile;
        if (rockVal > 0.78)      tile = T.STONE;
        else if (rockVal > 0.74) tile = T.IRON;
        else if (rockVal > 0.71) tile = T.CRYSTAL;
        else                     tile = T.ROCK;
        smoothed[idx] = tile;
        ig[idx] = BLOCK_INTEGRITY[tile] || 100;
      }
    }
  }

  /* ── 7. Rios procedurais ──────────────────────────────────── */
  // Rios fluem de áreas de alta altitude para baixa,
  // evitando cortar através de biomas muito quentes
  for (let ty = 1; ty < H - 1; ty++) {
    for (let tx = 1; tx < W - 1; tx++) {
      const idx = wi(tx, ty);
      const t = smoothed[idx];
      if (t === T.DEEP_WATER || t === T.WATER || t === T.LAVA ||
          t === T.ROCK || t === T.STONE || t === T.IRON || t === T.CRYSTAL) continue;

      const elev = elevField[idx];
      // Rios só em altitude baixa-média
      if (elev > 0.30) continue;

      const river = nRiver(tx * 0.016 + ox + 333, ty * 0.016 + oy - 777);
      if (Math.abs(river) < 0.045 && elev < 0.22) {
        smoothed[idx] = T.WATER;
        ig[idx] = 0;
      }
    }
  }

  /* ── 8. Copiar resultado para worldGrid ─────────────────── */
  for (let i = 0; i < sz; i++) {
    wg[i] = smoothed[i];
    // Integridade apenas para blocos destrutíveis
    if (ig[i] === 0 && BLOCK_INTEGRITY[wg[i]] !== undefined) {
      ig[i] = BLOCK_INTEGRITY[wg[i]];
    }
  }

  /* ── 9. Máscara de forma do mundo — continente orgânico ────
     Aplica um blob distorcido por noise para dar ao mundo uma
     forma não-retangular. Tiles fora da máscara viram DEEP_WATER,
     criando costas irregulares e penínsulas.
     ─────────────────────────────────────────────────────────── */
  const nShape  = createNoise(mulberry32(seedFunc()));
  const nShape2 = createNoise(mulberry32(seedFunc()));

  // Centro levemente deslocado do mapa
  const shapeCX = W * (0.48 + rand()*0.04);
  const shapeCY = H * (0.48 + rand()*0.04);
  // Raios semi-elípticos — a elipse cobre ~72–84% do mapa
  const radX = W * (0.36 + rand()*0.06);
  const radY = H * (0.36 + rand()*0.06);

  for(let ty=0; ty<H; ty++){
    for(let tx=0; tx<W; tx++){
      const idx = wi(tx, ty);
      const nx2 = (tx - shapeCX) / radX;
      const ny2 = (ty - shapeCY) / radY;
      // Distância elíptica normalizada (0 = centro, 1 = borda elipse)
      const ellD = Math.sqrt(nx2*nx2 + ny2*ny2);

      // Ângulo e distorção polar por noise — cria costas fractais
      const ang = Math.atan2(ny2, nx2);
      const noiseD = nShape(Math.cos(ang)*2.8 + 300, Math.sin(ang)*2.8 + 400) * 0.20
                   + nShape2(Math.cos(ang*2.3)*1.6 + 600, Math.sin(ang*2.3)*1.6 + 700) * 0.09;
      const dist = ellD - noiseD;

      // Só reescrever tiles que já eram terra (não reescrever água existente
      // gerada pelos campos de altitude, mas estender oceano nas bordas)
      if(dist > 1.0){
        wg[idx] = T.DEEP_WATER;
        ig[idx] = 0;
      } else if(dist > 0.90 && wg[idx] !== T.DEEP_WATER && wg[idx] !== T.WATER){
        wg[idx] = T.WATER;
        ig[idx] = 0;
      }
    }
  }

  /* ── 10. Borda do mapa — espessura irregular 1–8 tiles (orgânica) ── */
  // Usa noise para variar espessura por posição → forma não-quadrada
  // Cada lado tem espessura entre 1 e 8 tiles que oscila suavemente
  const nBorder = createNoise(mulberry32(rng0()));
  function borderThick(pos, sideLen, seedOff){
    // noise retorna -1..1, mapeamos para 1..8
    const n = nBorder(pos * 0.08 + seedOff, seedOff * 0.3);
    return Math.max(1, Math.min(8, Math.round((n * 0.5 + 0.5) * 7 + 1)));
  }
  // Topo e base
  for (let tx = 0; tx < W; tx++) {
    const thTop    = borderThick(tx, W, 0);
    const thBottom = borderThick(tx, W, 50);
    for (let d = 0; d < thTop;    d++) { if(d < H) wg[wi(tx, d)]       = T.STONE; }
    for (let d = 0; d < thBottom; d++) { if(H-1-d >= 0) wg[wi(tx, H-1-d)] = T.STONE; }
  }
  // Laterais
  for (let ty = 0; ty < H; ty++) {
    const thLeft  = borderThick(ty, H, 100);
    const thRight = borderThick(ty, H, 150);
    for (let d = 0; d < thLeft;  d++) { if(d < W) wg[wi(d, ty)]       = T.STONE; }
    for (let d = 0; d < thRight; d++) { if(W-1-d >= 0) wg[wi(W-1-d, ty)] = T.STONE; }
  }

  /* ── 11. Portais para o subsolo ────────────────────────── */
  const NUM_PORTALS = 6;
  const portalPositions = [];
  // clamp() já existe em game.js

  for (let i = 0; i < NUM_PORTALS; i++) {
    const px = 30 + Math.floor(rand() * (W - 60));
    const py = 30 + Math.floor(rand() * (H - 60));
    for (let dr = 0; dr <= 6; dr++) {
      let placed = false;
      for (let ddx = -dr; ddx <= dr && !placed; ddx++) {
        for (let ddy = -dr; ddy <= dr && !placed; ddy++) {
          if (Math.abs(ddx) !== dr && Math.abs(ddy) !== dr) continue;
          const ptx = clamp(px + ddx, 2, W - 3);
          const pty = clamp(py + ddy, 2, H - 3);
          const tt = wg[wi(ptx, pty)];
          if (!SOLID.has(tt) && tt !== T.DEEP_WATER && tt !== T.LAVA && tt !== T.WATER) {
            wg[wi(ptx, pty)] = T.PORTAL;
            portalPositions.push({ tx: ptx, ty: pty, targetDim: DIM.UNDERGROUND });
            placed = true;
          }
        }
      }
      if (placed) break;
    }
  }

  return portalPositions;
}; // ← ponto-e-vírgula obrigatório: impede que a IIFE abaixo seja
   //   interpretada como chamada de window.generateSurface(iife)()

/* ─────────────────────────────────────────────────────────────
   PATCH AUTOMÁTICO
   Sobrescreve a geração de superfície quando generateWorld()
   for chamado, sem alterar o game.js original.
   ───────────────────────────────────────────────────────────── */
(function patchWorldGen() {
  // Este arquivo é carregado APÓS game.js no index.html.
  // A função generateSurface() declarada acima sobrescreve
  // a do game.js no escopo global, pois scripts síncronos
  // executam em ordem e a última declaração de função prevalece.
  if (typeof console !== 'undefined') {
    console.log('[world-gen.js] Sistema climático v3.0 carregado.');
    console.log('[world-gen.js] Camadas: continente · temperatura · umidade · altitude · erosão · estranheza · corrupção · vulcanismo');
  }
})();
