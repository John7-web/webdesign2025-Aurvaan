// Battleground Simulator — 100 players, one Superman and one Batman
(() => {
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  // make canvas fill the window and update on resize
  let W = 1000, H = 700;
  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    W = canvas.width; H = canvas.height;
  }
  window.addEventListener('resize', resizeCanvas);
  // initial resize
  resizeCanvas();

  const NUM_PLAYERS = 300;
  const players = [];
  const bullets = [];
  const particles = [];

  const UI = {
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    speedSel: document.getElementById('speedSel'),
    playerCount: document.getElementById('playerCount'),
    aliveCount: document.getElementById('aliveCount'),
    bulletCount: document.getElementById('bulletCount'),
    scoreList: document.getElementById('scoreList'),
    winnerOverlay: document.getElementById('winnerOverlay'),
    winnerTitle: document.getElementById('winnerTitle'),
    winnerDesc: document.getElementById('winnerDesc'),
    restartBtn: document.getElementById('restartBtn')
  };

  // optional upload element for superman image
  const superUploadInput = document.getElementById('superUpload');
  if(superUploadInput){
    superUploadInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        supermanImgLoaded = false;
        supermanImg.src = reader.result;
      };
      reader.readAsDataURL(f);
    });
  }

  // optional upload for batman image
  const batmanUploadInput = document.getElementById('batmanUpload');
  if(batmanUploadInput){
    batmanUploadInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        batmanImgLoaded = false;
        batmanImg.src = reader.result;
      };
      reader.readAsDataURL(f);
    });
  }

  // optional upload for walter image
  const walterUploadInput = document.getElementById('walterUpload');
  if(walterUploadInput){
    walterUploadInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        walterImgLoaded = false;
        walterImg.src = reader.result;
      };
      reader.readAsDataURL(f);
    });
  }

  // allow drag-and-drop anywhere on the page to set the Batman image quickly
  window.addEventListener('dragover', (e)=>{ e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  window.addEventListener('drop', (e)=>{
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(!f) return;
    // if filename contains 'wal'/'walter' assume it's Walter, if contains 'bat' -> batman, else use for batman by default
    const name = (f.name || '').toLowerCase();
    const reader = new FileReader();
    reader.onload = () => {
      if(name.includes('wal') || name.includes('walter')){ walterImgLoaded = false; walterImg.src = reader.result; }
      else if(name.includes('bat')){ batmanImgLoaded = false; batmanImg.src = reader.result; }
      else { batmanImgLoaded = false; batmanImg.src = reader.result; }
    };
    reader.readAsDataURL(f);
  });

  let running = false;
  let lastTime = 0;

  // try to load a local superman image (place `superman.png` next to this file)
  const supermanImg = new Image();
  let supermanImgLoaded = false;
  supermanImg.onload = () => { supermanImgLoaded = true; };
  supermanImg.onerror = () => { supermanImgLoaded = false; };
  supermanImg.src = 'superman.png';

  // batman image (can be uploaded at runtime)
  const batmanImg = new Image();
  let batmanImgLoaded = false;
  batmanImg.onload = () => { batmanImgLoaded = true; };
  batmanImg.onerror = () => { batmanImgLoaded = false; };
  // Try to load a local file named `batman.png` placed next to this HTML/JS
  batmanImg.src = 'batman.png';

  // walter image (can be uploaded at runtime)
  const walterImg = new Image();
  let walterImgLoaded = false;
  walterImg.onload = () => { walterImgLoaded = true; };
  walterImg.onerror = () => { walterImgLoaded = false; };
  // Try to load a local file named `walter.png` placed next to this HTML/JS
  walterImg.src = 'walter.png';

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function dist(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return Math.sqrt(dx*dx + dy*dy); }

  function randomColor(){
    // generate bright-ish pastel colors
    const h = Math.floor(rand(0,360));
    const s = Math.floor(rand(60,90));
    const l = Math.floor(rand(45,65));
    return `hsl(${h} ${s}% ${l}%)`;
  }

  // big explosion covering quarter of the map area centered on (cx,cy)
  function bigExplosion(cx, cy){
    // area width/height such that area = (W/2)*(H/2) = WH/4
    const areaW = Math.max(60, Math.floor(W/2));
    const areaH = Math.max(60, Math.floor(H/2));
    const left = Math.max(0, Math.min(W - areaW, Math.floor(cx - areaW/2)));
    const top = Math.max(0, Math.min(H - areaH, Math.floor(cy - areaH/2)));

    // spawn many particles across the rectangle
    const parts = 900;
    for(let i=0;i<parts;i++){
      const x = left + Math.random()*areaW;
      const y = top + Math.random()*areaH;
      particles.push({x,y,vx:rand(-4,4),vy:rand(-4,4),life:rand(40,140),col:`hsl(${Math.floor(rand(0,60))} 80% ${Math.floor(rand(40,60))}%)`});
    }

    // kill any non-hero players inside the area
    for(const p of players){
      if(!p.alive) continue;
      if(p.kind) continue; // heroes already handled elsewhere
      if(p.x >= left && p.x <= left + areaW && p.y >= top && p.y <= top + areaH){
        p.alive = false;
        // small local explosion at their position
        explodeAt(p.x, p.y, p.color || '#fff');
      }
    }
  }

  // Apply a buff after a kill: increase size and movement speed moderately (with caps)
  function buffPlayer(p){
    if(!p) return;
    p.kills = (p.kills||0) + 1;
    // grow radius
    p.r = Math.min(40, p.r + 1.6);
    // increase movement speed magnitude while preserving direction
    let vx = p.vx, vy = p.vy;
    let speed = Math.sqrt(vx*vx + vy*vy);
    if(speed < 0.12){
      // give a small nudge if almost stationary
      const a = rand(0, Math.PI*2);
      vx = Math.cos(a) * 0.6; vy = Math.sin(a) * 0.6; speed = 0.6;
    }
    const newSpeed = Math.min(6, speed * 1.16 + 0.12);
    const ang = Math.atan2(vy, vx);
    p.vx = Math.cos(ang) * newSpeed;
    p.vy = Math.sin(ang) * newSpeed;
    // (no auto-win by kills) — winner will be determined when last player remains
  }

  function showWinner(p){
    running = false;
    if(!p) return;
    try{
      UI.winnerTitle.textContent = `Player #${p.id+1} Wins!`;
      UI.winnerDesc.textContent = `Kills: ${p.kills} — Weapon: ${p.weapon} — Shape: ${p.shape}`;
      UI.winnerOverlay.style.display = 'flex';
    }catch(e){ console.warn('Winner UI not available', e); }
  }

  function hideWinner(){ if(UI.winnerOverlay) UI.winnerOverlay.style.display = 'none'; }

  function drawShape(x,y,r,shape,fillStyle){
    ctx.fillStyle = fillStyle || '#eee';
    ctx.beginPath();
    if(shape === 'circle'){
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();
      return;
    }
    if(shape === 'triangle'){
      ctx.moveTo(x, y - r);
      ctx.lineTo(x - r, y + r);
      ctx.lineTo(x + r, y + r);
      ctx.closePath(); ctx.fill(); return;
    }
    if(shape === 'square'){
      ctx.fillRect(x - r, y - r, r*2, r*2); return;
    }
    if(shape === 'diamond'){
      ctx.moveTo(x, y - r);
      ctx.lineTo(x - r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x + r, y);
      ctx.closePath(); ctx.fill(); return;
    }
    if(shape === 'star'){
      // simple 5-point star
      const spikes = 5; let rot = Math.PI/2*3; let cx = x; let cy = y; let step = Math.PI/spikes; ctx.moveTo(cx, cy - r);
      for(let i=0;i<spikes;i++){ ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r); rot += step; ctx.lineTo(cx + Math.cos(rot) * (r/2), cy + Math.sin(rot) * (r/2)); rot += step; }
      ctx.closePath(); ctx.fill(); return;
    }
    // fallback
    ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }

  const SHAPES = ['circle','triangle','square','diamond','star'];
  const RANGE_WEAPONS = ['gun','shotgun','minigun'];
  const MELEE_WEAPONS = ['sword','axe'];

  function makePlayer(id, kind=null){
    return {
      id,
      x: rand(20, W-20),
      y: rand(20, H-20),
      vx: rand(-0.4,0.4),
      vy: rand(-0.4,0.4),
      r: 8,
      color: randomColor(),
      hp: 100,
      kills: 0,
      alive: true,
      lastShot: 0,
  lastMelee: 0,
  // character slot (non-hero special characters)
  character: null,
      // type will be assigned in addPlayers() (heroes vs others)
      type: null,
      weapon: null,
      shootInterval: rand(400,1200),
      // wandering behavior: timer and how often to pick a new direction (ms)
      wanderTimer: rand(0, 1200),
      changeDirInterval: rand(400, 2000),
      shape: SHAPES[Math.floor(Math.random()*SHAPES.length)],
      kind // 'superman' | 'batman' | null
    };
  }

  function addPlayers(){
    players.length = 0;
    for(let i=0;i<NUM_PLAYERS;i++) players.push(makePlayer(i));
  // assign Superman and Batman randomly (distinct). Walter will be a special non-hero character.
  const s = Math.floor(Math.random()*NUM_PLAYERS);
  let b = Math.floor(Math.random()*NUM_PLAYERS);
  while(b===s) b = Math.floor(Math.random()*NUM_PLAYERS);
  players[s].kind = 'superman'; players[s].color = '#1e90ff'; players[s].r = 12; players[s].hp = 200;
  players[b].kind = 'batman'; players[b].color = '#111'; players[b].r = 12; players[b].hp = 200;
  // pick a random non-hero player to be Walter the special character
  let w = Math.floor(Math.random()*NUM_PLAYERS);
  while(w===s || w===b) w = Math.floor(Math.random()*NUM_PLAYERS);
  players[w].character = 'walter'; players[w].color = '#e0b24a'; players[w].r = 12; players[w].hp = 140;

    // assign weapons: heroes (superman/batman) are melee, everyone else is ranged
    for(const p of players){
      if(p.kind === 'superman' || p.kind === 'batman'){
        // heroes melee
        p.type = 'melee';
        p.weapon = MELEE_WEAPONS[Math.floor(Math.random()*MELEE_WEAPONS.length)];
        p.weaponCfg = {damage: Math.floor(rand(70,110)), reach: 10 + rand(0,6), swingInterval: rand(500,1000)};
        // heroes a bit faster
        const ang = Math.atan2(p.vy, p.vx);
        const sp = Math.max(0.6, Math.sqrt(p.vx*p.vx + p.vy*p.vy));
        p.vx = Math.cos(ang) * sp * 1.6; p.vy = Math.sin(ang) * sp * 1.6;
      } else {
        // non-heroes: ranged
        p.type = 'range';
        p.weapon = RANGE_WEAPONS[Math.floor(Math.random()*RANGE_WEAPONS.length)];
        if(p.weapon === 'gun'){ p.shootInterval = rand(600,1100); p.weaponCfg = {damage: 18, bullets:1, spread:0}; }
        else if(p.weapon === 'shotgun'){ p.shootInterval = rand(1200,2000); p.weaponCfg = {damage:9, bullets:6, spread:0.6}; }
        else if(p.weapon === 'minigun'){ p.shootInterval = rand(120,260); p.weaponCfg = {damage:6, bullets:1, spread:0}; }
        // ranged players are slower
        const ang = Math.atan2(p.vy, p.vx);
        const sp = Math.sqrt(p.vx*p.vx + p.vy*p.vy) * 0.6;
        p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
      }
    }
  }

  function spawnBullet(shooter, targetX, targetY){
    // only ranged players spawn bullets
    if(shooter.type !== 'range') return;
    const baseAngle = Math.atan2(targetY - shooter.y, targetX - shooter.x);
    const cfg = shooter.weaponCfg || {damage:20, bullets:1, spread:0};
    // spawn multiple pellets for shotgun
    for(let i=0;i<cfg.bullets;i++){
      // spread offset
      const offset = (cfg.bullets === 1) ? 0 : ( (i - (cfg.bullets-1)/2) * cfg.spread );
      const angle = baseAngle + offset * (Math.random()*0.8 + 0.6);
      const speed = (shooter.weapon === 'minigun') ? 6 : 4;
      bullets.push({x: shooter.x + Math.cos(angle)*(shooter.r+6), y: shooter.y + Math.sin(angle)*(shooter.r+6), vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, owner: shooter.id, life: 220, damage: cfg.damage});
    }
  }

  function explodeAt(x,y,color){
    for(let i=0;i<40;i++) particles.push({x,y,vx:rand(-3,3),vy:rand(-3,3),life:rand(30,80),col:color});
  }

  function handleCollisions(){
    // bullets -> players
    for(let i=bullets.length-1;i>=0;i--){
      const b = bullets[i];
      b.life -= 1;
      if(b.life<=0){ bullets.splice(i,1); continue; }
      for(let j=players.length-1;j>=0;j--){
        const p = players[j];
        if(!p.alive) continue;
        if(p.id === b.owner) continue; // don't hit self
        if(dist(b, p) < p.r + 2){
          // hit - apply bullet damage
          p.hp -= (b.damage || 20);
          bullets.splice(i,1);
          explodeAt(b.x,b.y,'#ffcc66');
          if(p.hp <= 0){
            // attribute the kill to the bullet owner (if present)
            const shooter = players.find(pl => pl.id === b.owner);
            if(shooter){
              buffPlayer(shooter);
            }
            p.alive = false;
            explodeAt(p.x,p.y,p.color||'#fff');
          }
          break;
        }
      }
    }

    // player collisions (movement).
    // First: check if any two heroes touch -> both blow up (generalized for superman/batman/walter)
    const heroList = players.filter(p => p.kind);
    if(heroList.length >= 2){
      let collidedPair = null;
      for(let i=0;i<heroList.length;i++){
        for(let j=i+1;j<heroList.length;j++){
          const a = heroList[i], b = heroList[j];
          if(!a.alive || !b.alive) continue;
          if(dist(a,b) <= a.r + b.r + 2){ collidedPair = [a,b]; break; }
        }
        if(collidedPair) break;
      }
      if(collidedPair){
        const [a,b] = collidedPair;
        a.alive = false; b.alive = false;
        explodeAt(a.x,a.y,a.color); explodeAt(b.x,b.y,b.color);
        const cx = (a.x + b.x)/2; const cy = (a.y + b.y)/2;
        bigExplosion(cx, cy);
      }
    }

    // Then: heroes (superman or batman) instantly oneshot any normal player they run into
    for(const h of players){
      if(!h.alive || !h.kind) continue; // only alive heroes
      for(const p of players){
        if(!p.alive || p.id === h.id) continue;
        // skip other heroes (hero-vs-hero handled above)
        if(p.kind) continue;
        if(dist(h, p) <= h.r + p.r + 1){
          // oneshot the normal player and attribute kill to hero
          p.alive = false;
          explodeAt(p.x, p.y, p.color || '#fff');
          buffPlayer(h);
        }
      }
    }

    // Melee players: contact-based heavy damage (not instant oneshot unless hp falls to 0)
    for(const attacker of players){
      if(!attacker.alive || attacker.type !== 'melee') continue;
      for(const target of players){
        if(!target.alive || target.id === attacker.id) continue;
        // melee can hit heroes and non-heroes alike
        const reach = (attacker.weaponCfg && attacker.weaponCfg.reach) ? attacker.weaponCfg.reach : 8;
        if(dist(attacker, target) <= attacker.r + target.r + reach){
          const swing = (attacker.weaponCfg && attacker.weaponCfg.swingInterval) ? attacker.weaponCfg.swingInterval : 600;
          if(attacker.lastMelee >= swing){
            // apply melee damage
            target.hp -= (attacker.weaponCfg && attacker.weaponCfg.damage) ? attacker.weaponCfg.damage : 80;
            explodeAt(target.x, target.y, '#ff6666');
            attacker.lastMelee = 0;
            if(target.hp <= 0){
              target.alive = false;
              explodeAt(target.x,target.y,target.color||'#fff');
              buffPlayer(attacker);
            }
          }
        }
      }
    }

    // Player vs player physical collision (prevent overlap and exchange a bit of velocity)
    // simple pairwise separation and velocity impulse
    for(let i=0;i<players.length;i++){
      const a = players[i];
      if(!a.alive) continue;
      for(let j=i+1;j<players.length;j++){
        const b = players[j];
        if(!b.alive) continue;
        // skip if same id or either is not alive
        const dx = b.x - a.x; const dy = b.y - a.y;
        let d = Math.sqrt(dx*dx + dy*dy);
        const minDist = a.r + b.r + 1; // small padding
        if(d === 0){
          // jitter them apart
          const nx = rand(-1,1) || 0.1; const ny = rand(-1,1) || 0.1; const nl = Math.sqrt(nx*nx + ny*ny) || 1;
          a.x -= (nx/nl) * 0.5; a.y -= (ny/nl) * 0.5;
          b.x += (nx/nl) * 0.5; b.y += (ny/nl) * 0.5;
          d = 0.5;
        }
        if(d < minDist){
          const nx = dx / d; const ny = dy / d;
          const overlap = (minDist - d);
          // push each away by half overlap
          const shift = overlap * 0.5;
          a.x -= nx * shift; a.y -= ny * shift;
          b.x += nx * shift; b.y += ny * shift;
          // velocity impulse along normal (simple exchange with damping)
          const va = a.vx * nx + a.vy * ny;
          const vb = b.vx * nx + b.vy * ny;
          const impulse = (va - vb) * 0.5; // reduced impulse
          const damp = 0.7;
          a.vx -= impulse * nx * damp; a.vy -= impulse * ny * damp;
          b.vx += impulse * nx * damp; b.vy += impulse * ny * damp;
        }
      }
    }
  }

  function update(dt){
    // players move and have behavior based on weapon type (melee vs range)
    for(const p of players){
      if(!p.alive) continue;

      // find nearest target
      let target = null; let best = Infinity;
      for(const q of players){ if(q.id === p.id || !q.alive) continue; const d = dist(p,q); if(d < best){ best = d; target = q; }}

      // wandering movement: each player picks a random direction occasionally
      // keep target detection (above) so ranged players can still shoot, but movement is randomized
      p.wanderTimer += dt;
      if(p.wanderTimer > p.changeDirInterval){
        p.wanderTimer = 0;
        // randomize next change interval a bit
        p.changeDirInterval = rand(400, 2000);
        // choose base speed depending on type and hero status
        const baseSpeed = (p.type === 'melee') ? (p.kind ? 1.8 : 1.2) : (p.kind ? 0.9 : 0.6);
        const ang2 = Math.random() * Math.PI * 2;
        p.vx = Math.cos(ang2) * baseSpeed;
        p.vy = Math.sin(ang2) * baseSpeed;
      }
      // small continuous jitter so motion looks more organic
      p.vx += rand(-0.06, 0.06);
      p.vy += rand(-0.06, 0.06);
      // clamp max speed to avoid runaway velocities
      const maxSpeed = (p.type === 'melee') ? 2.6 : 1.4;
      let sp = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if(sp > maxSpeed){ p.vx = (p.vx/sp) * maxSpeed; p.vy = (p.vy/sp) * maxSpeed; }

      // integrate position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // bounce
      if(p.x < 10){ p.x = 10; p.vx *= -1; }
      if(p.x > W-10){ p.x = W-10; p.vx *= -1; }
      if(p.y < 10){ p.y = 10; p.vy *= -1; }
      if(p.y > H-10){ p.y = H-10; p.vy *= -1; }

      // timers
      p.lastShot += dt;
      p.lastMelee += dt;
  // (no slow mechanics)

      // ranged players shoot at nearest target
      if(p.type === 'range' && p.lastShot > p.shootInterval){
        if(target) spawnBullet(p, target.x + rand(-6,6), target.y + rand(-6,6));
        p.lastShot = 0;
      }

      // (Walter has no aura ability)
    }

    // bullets
    for(const b of bullets){ b.x += b.vx * dt; b.y += b.vy * dt; }

    // particles
    for(let i=particles.length-1;i>=0;i--){ const pr = particles[i]; pr.x += pr.vx * dt*0.7; pr.y += pr.vy * dt*0.7; pr.vy += 0.05*dt; pr.life -= dt; if(pr.life<=0) particles.splice(i,1); }

    handleCollisions();
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // ground grid subtle
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(0,0,W,H);

    // players
    for(const p of players){
      if(!p.alive) continue;
      // If Superman and we have an image, draw the sprite; otherwise draw a shape based on p.shape
      if(p.kind === 'superman' && supermanImgLoaded){
        const size = Math.max(p.r*3, 24);
        ctx.drawImage(supermanImg, p.x - size/2, p.y - size/2, size, size);
      } else if(p.kind === 'batman' && batmanImgLoaded){
        const size = Math.max(p.r*3, 24);
        ctx.drawImage(batmanImg, p.x - size/2, p.y - size/2, size, size);
      } else if(p.character === 'walter' && walterImgLoaded){
        const size = Math.max(p.r*3, 24);
        ctx.drawImage(walterImg, p.x - size/2, p.y - size/2, size, size);
      } else {
        // draw shape
        drawShape(p.x, p.y, p.r + (p.kind ? 2 : 0), p.shape || 'circle', p.color || '#eee');
      }
      // draw HP bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x - p.r, p.y - p.r - 8, p.r*2, 4);
      ctx.fillStyle = '#76ff7a'; ctx.fillRect(p.x - p.r, p.y - p.r - 8, (p.hp/200)*p.r*2, 4);
      // label for heroes/characters (hide letter if an image is present for that hero/character)
      if(p.kind || p.character){
        const label = p.kind ? p.kind[0].toUpperCase() : (p.character ? p.character[0].toUpperCase() : '?');
        ctx.fillStyle = (p.kind === 'superman') ? '#fff' : '#ffd';
        ctx.font = '12px sans-serif'; ctx.textAlign='center';
        let showLetter = true;
        if((p.kind==='superman' && supermanImgLoaded) || (p.kind==='batman' && batmanImgLoaded) || (p.character==='walter' && walterImgLoaded)) showLetter = false;
        if(showLetter) ctx.fillText(label, p.x, p.y+4);
      }
      // draw player number above the player for identification
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      // stroke for contrast
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(String(p.id+1), p.x, p.y - p.r - 10);
      ctx.fillStyle = '#fff'; ctx.fillText(String(p.id+1), p.x, p.y - p.r - 10);
    }

    // bullets
    ctx.fillStyle = '#ffeb3b';
    for(const b of bullets){ ctx.beginPath(); ctx.arc(b.x,b.y,2.5,0,Math.PI*2); ctx.fill(); }

    // particles
    for(const pr of particles){ ctx.fillStyle = pr.col; ctx.fillRect(pr.x, pr.y, 2, 2); }
  }

  function loop(ts){
    if(!running){ lastTime = ts; requestAnimationFrame(loop); return; }
    const speed = Number(UI.speedSel.value) || 1;
    const dt = Math.min(40, ts - lastTime) * (speed/16); // scale to ~60fps baseline
    update(dt);
    draw();
    lastTime = ts;
    updateUI();
    requestAnimationFrame(loop);
  }

  function updateUI(){
    UI.playerCount.textContent = NUM_PLAYERS;
    UI.aliveCount.textContent = players.filter(p=>p.alive).length;
    UI.bulletCount.textContent = bullets.length;
    // update scoreboard (top 10 by kills)
    try{
      const top = players.slice().sort((a,b)=> (b.kills||0) - (a.kills||0)).slice(0,10);
      UI.scoreList.innerHTML = '';
      for(const p of top){
        const li = document.createElement('li');
        li.style.marginBottom = '4px';
        li.style.listStyle = 'decimal';
        const aliveMark = p.alive ? '●' : '○';
        li.innerHTML = `<span style="display:inline-block;width:10px;height:10px;background:${p.color};margin-right:6px;border-radius:2px;vertical-align:middle;"></span> #${p.id+1} ${aliveMark} — ${p.kills||0} kills — ${p.weapon}`;
        UI.scoreList.appendChild(li);
      }
    }catch(e){ /* ignore if UI missing */ }

    // check last-alive win (if only one non-dead player remains and no overlay shown)
    const alivePlayers = players.filter(p=>p.alive);
    if(alivePlayers.length === 1){
      const winner = alivePlayers[0];
      if(UI.winnerOverlay && UI.winnerOverlay.style.display !== 'flex') showWinner(winner);
    }
  }

  // Controls
  UI.startBtn.addEventListener('click', ()=>{ running = true; });
  UI.pauseBtn.addEventListener('click', ()=>{ running = false; });
  UI.resetBtn.addEventListener('click', ()=>{ hideWinner(); bullets.length = 0; particles.length = 0; addPlayers(); updateUI(); running = true; });
  if(UI.restartBtn){ UI.restartBtn.addEventListener('click', ()=>{ hideWinner(); bullets.length = 0; particles.length = 0; addPlayers(); updateUI(); running = true; }); }

  // initialize
  addPlayers();
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);

  // Expose for debugging in console
  window.battle = { players, bullets, particles, addPlayers };
})();
