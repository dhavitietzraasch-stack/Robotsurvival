/* ============================================================
   SIGNAL LOST — ai-survival.js  v2.0
   IA ARIA: alertas, navegação holográfica, SEM glitches por corrupção
   Carregado ANTES de game.js
   ============================================================ */
'use strict';

const ARIA = {
  corruption:0, corruptionRate:0.000055,
  lastAlert:0, alertCD:200, queue:[],
  _wHp:false,_wEn:false,_wHeat:false,_prevBiome:'',
  nav:{
    active:false, target:null, path:[],
    pulse:0, glitch:0, fadeTimer:0, fadeDur:600,
    energyCost:0.035, heatCost:0.05,
  }
};

const ARIA_LINES={
  hpCrit:   ['Integridade estrutural comprometida.','Destruição iminente.','UNIDADE-7: status crítico.','Dano severo. Retire-se.'],
  hpLow:    ['Armadura abaixo do limiar seguro.','Reparos imediatos recomendados.','Estrutura danificada.'],
  enCrit:   ['FALHA DE ENERGIA IMINENTE.','Sistemas principais offline em breve.','Energia crítica.'],
  enLow:    ['Reservas energéticas reduzidas.','Bateria abaixo de 20%.','Consumo excede recarga.'],
  heatCrit: ['SUPERAQUECIMENTO CRÍTICO.','Fusão do núcle iminente','Temperatura letal. Resfrie já.'],
  heatHigh: ['Superaquecimento detectado.','Temperatura dos núcleos elevada.','Dissipação insuficiente.'],
  enemy:    ['Inimigos convergindo.','Ameaças detectadas no perímetro.','Contatos hostis próximos.'],
  enemyMass:['ALERTA: força inimiga massiva.','Recalculando... fuga recomendada.','Colapso do perímetro iminente.'],
  navOn:    ['Rota otimizada calculada.','Traçando caminho para antena.','Navegação holográfica ativa.'],
  navOff:   ['Navegação encerrada.','Scanner offline.','Rota apagada.'],
  navNoEn:  ['Energia insuficiente para scanner.','Scanner requer mais energia.'],
  navHeat:  ['Superaquecimento — scanner desligou.','rota falhou por temperatura elevada'],
  ant:      ['Antena ativa. Sinal amplificado.','Mais um transmissor online.'],
  antClose: ['Antena detectada nas proximidades.','Estrutura de transmissão a caminho.'],
  bossWarning:['Assinatura energética massiva se aproximando.','Ameaça de grande porte detectada — alerta máximo.','Recomendo cautela extrema. Algo grande vem por aí.'],
  rescue:   ['Nave de resgate detectada. CORRAM.','Sinal de resgate confirmado. Rota de fuga ativa.','Embarcação tripulada em aproximação!'],
  rescueLow:['30 segundos para partida da nave.','ATENÇÃO: janela de resgate se fechando!'],
  biomeWat: ['Água detectada. Temperatura estabilizando.','Resfriamento via imersão.'],
  biomeLav: ['Zona vulcânica. Temperatura crítica iminente.','PERIGO: lava corrói sistemas.'],
  glitch:   ['enviando mensagem de ajuda... ERRO','planeta desconhecido','onde estamos?',
             'SINAL PERDIDO — sistema parcialmente off.'],
  idle:     ['Monitorando ambiente.','Sistemas operacionais.','Nenhuma ameaça imediata.','Coletando dados de terreno.'],
};

function _glitchText(s,intensity){
  const gc='@#$%&!?Ø01';
  return s.split('').map(c=>c===' '?c:Math.random()<intensity*.14?gc[Math.floor(Math.random()*gc.length)]:c).join('');
}

// ─── Alerta dedicado da ARIA ───────────────────────────────────
// Antes as falas passavam pelo showAlert() genérico (game.js) e disputavam
// espaço/atenção com avisos de level-up, chefe destruído, mapa exportado etc.
// Agora têm cartão próprio (#ariaAlert, ver index.html/style.css), com um
// timer e visual independentes — inclusive um estado "corrupted" que reflete
// ARIA.corruption, reaproveitando o mesmo tema visual do restante do arquivo.
const ariaAlertEl = document.getElementById('ariaAlert');
const ariaAlertTextEl = ariaAlertEl ? ariaAlertEl.querySelector('.aria-alert-text') : null;
let ariaAlertTimer = 0;
function showARIAAlert(msg){
  if(!ariaAlertEl) return;
  if(ariaAlertTextEl) ariaAlertTextEl.textContent = msg;
  ariaAlertEl.classList.add('show');
  ariaAlertEl.classList.toggle('corrupted', ARIA.corruption>0.5);
  ariaAlertTimer = 220;
}

function ariaSpeak(cat,force=false){
  const lines=ARIA_LINES[cat]; if(!lines) return;
  let line;
  if(ARIA.corruption>.6&&Math.random()<ARIA.corruption*.5)
    line=ARIA_LINES.glitch[Math.floor(Math.random()*ARIA_LINES.glitch.length)];
  else{
    line=lines[Math.floor(Math.random()*lines.length)];
    if(ARIA.corruption>.35) line=_glitchText(line,ARIA.corruption);
  }
  if(force){showARIAAlert(line);ARIA.lastAlert=time;}
  else ARIA.queue.push(line);
}

function updateARIA(){
  // Decrementa o timer do cartão da ARIA independente do resto (fora do
  // early-return abaixo) para a fala sempre sumir com a duração correta.
  if(ariaAlertTimer>0){ariaAlertTimer--;}
  else if(ariaAlertEl){ariaAlertEl.classList.remove('show');}
  if(!running||robot.dead) return;
  ARIA.corruption=Math.min(1,ARIA.corruption+ARIA.corruptionRate);

  // Flush queue
  if(ARIA.queue.length>0&&time-ARIA.lastAlert>ARIA.alertCD){
    showARIAAlert(ARIA.queue.shift()); ARIA.lastAlert=time;
  }

  const can=time-ARIA.lastAlert>ARIA.alertCD;
  if(can){
    // HP
    if(robot.hp<15&&!ARIA._wHp){ARIA._wHp=true;ariaSpeak('hpCrit',true);}
    else if(robot.hp>=15)ARIA._wHp=false;
    if(robot.hp<35&&robot.hp>=15&&Math.random()<.007)ariaSpeak('hpLow');
    // Energia
    if(robot.energy<8&&!ARIA._wEn){ARIA._wEn=true;ariaSpeak('enCrit',true);}
    else if(robot.energy>=8)ARIA._wEn=false;
    if(robot.energy<22&&robot.energy>=8&&Math.random()<.006)ariaSpeak('enLow');
    // Calor
    if(robot.heat>85&&!ARIA._wHeat){ARIA._wHeat=true;ariaSpeak('heatCrit',true);}
    else if(robot.heat<=85)ARIA._wHeat=false;
    if(robot.heat>60&&robot.heat<=85&&Math.random()<.005)ariaSpeak('heatHigh');
    // Inimigos
    let minD=Infinity,cnt=0;
    for(const e of enemies){const d=Math.hypot(e.x-robot.x,e.y-robot.y);if(d<minD)minD=d;if(d<420)cnt++;}
    if(cnt>8&&Math.random()<.004)ariaSpeak('enemyMass');
    else if(minD<300&&Math.random()<.004)ariaSpeak('enemy');
    // Antenas
    for(const a of antennaStructures){
      if(!a.active&&Math.hypot(a.tx*TILE-robot.x,a.ty*TILE-robot.y)<340&&Math.random()<.003){ariaSpeak('antClose');break;}
    }
    // Glitch
    if(ARIA.corruption>.5&&Math.random()<ARIA.corruption*.0025)ariaSpeak('glitch',true);
    if(Math.random()<.001)ariaSpeak('idle');
  }
  _updateARIANav();
}

// ─── Navegação holográfica ────────────────────────────────────
function toggleARIANav(){
  if(!running) return;
  const nav=ARIA.nav;
  if(nav.active){nav.active=false;nav.path=[];nav.target=null;ariaSpeak('navOff',true);return;}
  if(robot.energy<12){ariaSpeak('navNoEn',true);return;}
  if(robot.heat>80){ariaSpeak('navHeat',true);return;}
  let closest=null,cd=Infinity;
  for(const a of antennaStructures){
    if(a.active) continue;
    const d=Math.hypot(a.tx*TILE-robot.x,a.ty*TILE-robot.y);
    if(d<cd){cd=d;closest=a;}
  }
  if(!closest){showAlert('Todas as antenas já ativas.');return;}
  nav.target=closest; nav.active=true; nav.fadeTimer=nav.fadeDur;
  nav.path=_buildNavPath(robot.x,robot.y,closest.tx*TILE+TILE/2,closest.ty*TILE+TILE/2);
  ariaSpeak('navOn',true);
}

function _buildNavPath(sx,sy,ex,ey){
  const path=[], steps=22;
  const td=Math.hypot(ex-sx,ey-sy)||1;
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    let px=sx+(ex-sx)*t, py=sy+(ey-sy)*t;
    const tx2=Math.floor(px/TILE),ty2=Math.floor(py/TILE);
    if(inBounds(tx2,ty2)&&SOLID.has(getTile(tx2,ty2))){
      const px2=-(ey-sy)/td, py2=(ex-sx)/td, sh=TILE*1.6;
      for(const s of[1,-1]){
        const nx=px+px2*sh*s, ny=py+py2*sh*s;
        if(inBounds(Math.floor(nx/TILE),Math.floor(ny/TILE))&&!SOLID.has(getTile(Math.floor(nx/TILE),Math.floor(ny/TILE)))){px=nx;py=ny;break;}
      }
    }
    path.push({x:px,y:py});
  }
  return path;
}

function _updateARIANav(){
  const nav=ARIA.nav; if(!nav.active) return;
  robot.energy=Math.max(0,robot.energy-nav.energyCost);
  robot.heat=Math.min(robot.maxHeat,robot.heat+nav.heatCost);
  if(robot.energy<2){nav.active=false;ariaSpeak('navNoEn',true);return;}
  if(robot.heat>85){nav.active=false;ariaSpeak('navHeat',true);return;}
  nav.pulse+=0.07; nav.glitch+=0.13; nav.fadeTimer--;
  if(time%90===0&&nav.target)
    nav.path=_buildNavPath(robot.x,robot.y,nav.target.tx*TILE+TILE/2,nav.target.ty*TILE+TILE/2);
  if(nav.fadeTimer<=0){nav.active=false;nav.path=[];ariaSpeak('navOff',true);}
}

function drawARIANav(){
  const nav=ARIA.nav; if(!nav.active||nav.path.length<2) return;
  const fa=Math.min(1,nav.fadeTimer/60);
  const glitching=ARIA.corruption>.4&&Math.sin(nav.glitch)>.7;
  ctx.save();
  // Linha holográfica
  for(let i=0;i<nav.path.length-1;i++){
    const a=nav.path[i],b=nav.path[i+1];
    const sx1=a.x-cam.x+W/2,sy1=a.y-cam.y+H/2;
    const sx2=b.x-cam.x+W/2,sy2=b.y-cam.y+H/2;
    if(glitching&&Math.random()<.3) continue;
    const pulse=Math.sin(nav.pulse*3-(i/nav.path.length)*Math.PI*4)*.5+.5;
    const al=fa*(.5+pulse*.5);
    ctx.strokeStyle=`rgba(0,229,255,${al*.3})`;ctx.lineWidth=pulse*1.4+4;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.lineTo(sx2,sy2);ctx.stroke();
    ctx.strokeStyle=`rgba(0,229,255,${al})`;ctx.lineWidth=pulse*1.4+1.5;
    ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.lineTo(sx2,sy2);ctx.stroke();
    if(i%3===0){
      ctx.setLineDash([4,8]);
      ctx.strokeStyle=`rgba(167,139,250,${al*.6})`;ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.lineTo(sx2,sy2);ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // Marcador de destino
  if(nav.target){
    const tx2=nav.target.tx*TILE+TILE/2-cam.x+W/2;
    const ty2=nav.target.ty*TILE+TILE/2-cam.y+H/2;
    const r2=16+Math.sin(nav.pulse*2)*4;
    ctx.strokeStyle=`rgba(0,229,255,${fa*.8})`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(tx2,ty2,r2,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=`rgba(167,139,250,${fa})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(tx2-8,ty2);ctx.lineTo(tx2+8,ty2);ctx.moveTo(tx2,ty2-8);ctx.lineTo(tx2,ty2+8);ctx.stroke();
    const dist=Math.hypot(nav.target.tx*TILE-robot.x,nav.target.ty*TILE-robot.y);
    ctx.font='9px "Share Tech Mono",monospace';ctx.textAlign='center';
    ctx.fillStyle=`rgba(0,229,255,${fa*.9})`;
    ctx.fillText(glitching?'@#DIST_ERR':`${(dist/TILE).toFixed(0)} tiles`,tx2,ty2+r2+14);
    ctx.fillStyle=`rgba(167,139,250,${fa*.7})`;
    ctx.fillText(glitching?'[ERR%EN]':`⚡~${Math.min(99,(dist/TILE*.5)).toFixed(1)}e`,tx2,ty2+r2+26);
  }
  // Label
  ctx.font='7px "Share Tech Mono",monospace';ctx.textAlign='left';
  ctx.fillStyle=`rgba(0,229,255,${fa*.5})`;
  ctx.fillText(glitching?'A.R.I@_N4V':'A.R.I.A_NAV',14,H-30);
  ctx.fillText(`EN:${robot.energy.toFixed(0)} HEAT:${robot.heat.toFixed(0)}`,14,H-20);
  ctx.restore();
}

function drawARIACorruption(){
  if(ARIA.corruption<.3) return;
  const c=ARIA.corruption;
  ctx.save();
  if(Math.sin(time*.25)>.7){
    ctx.fillStyle=`rgba(255,50,50,${(c-.3)*.06})`;ctx.fillRect(0,0,W,H);
  }
  ctx.font='7px "Share Tech Mono",monospace';ctx.textAlign='left';
  ctx.fillStyle=`rgba(239,68,68,${.3+c*.4})`;
  const lbl=c>.8?'A.R.I.A [CORROMPIDA]':c>.5?'A.R.I.A [INSTÁVEL]':'A.R.I.A [DEGRADANDO]';
  ctx.fillText(lbl,14,H-8);
  ctx.restore();
}

function resetARIA(){
  ARIA.corruption=0;ARIA.lastAlert=0;ARIA.queue=[];
  ARIA._wHp=false;ARIA._wEn=false;ARIA._wHeat=false;ARIA._prevBiome='';
  Object.assign(ARIA.nav,{active:false,target:null,path:[],pulse:0,glitch:0,fadeTimer:0});
  ariaAlertTimer=0;
  if(ariaAlertEl){ariaAlertEl.classList.remove('show','corrupted');}
}
function ariaOnAntenna(){ariaSpeak('ant',true);}
function ariaOnRescueShip(){ariaSpeak('rescue',true);}
function ariaOnRescueLow(){ariaSpeak('rescueLow',true);}
function ariaOnBiome(name){
  if(ARIA._prevBiome===name) return; ARIA._prevBiome=name;
  if(name==='Água Rasa'||name==='Mar Profundo') ariaSpeak('biomeWat');
  else if(name==='Vulcânico') ariaSpeak('biomeLav');
}
