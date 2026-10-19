// ===== 섹션 파일(sections/*.html)을 불러와 조립한 뒤 초기화 =====
(function(){
  var incs = Array.prototype.slice.call(document.querySelectorAll('[data-inc]'));
  if(!incs.length){ initSite(); return; }
  Promise.all(incs.map(function(n){
    return fetch(n.getAttribute('data-inc'))
      .then(function(r){ return r.text(); })
      .then(function(html){ n.outerHTML = html; })
      .catch(function(err){ console.warn('include failed', n.getAttribute('data-inc'), err); });
  })).then(function(){ initSite(); });
})();

function initSite(){
    // 스크롤 등장
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), (i % 4) * 70); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    // 진행바
    const sprog = document.getElementById('sprog');
    function prog(){ const de = document.documentElement; const max = de.scrollHeight - de.clientHeight; if(sprog) sprog.style.transform = 'scaleX(' + (max>0 ? de.scrollTop/max : 0) + ')'; }
    addEventListener('scroll', prog, { passive:true }); addEventListener('resize', prog); prog();

    // 히어로 유체 왜곡 — 마우스를 따라 배경이 액체처럼 번짐 (js/fluid.js)
    if(window.initHeroFluid){ try{ window.initHeroFluid(); }catch(e){} }

    // 툴 카드 마퀴: 끊김 없는 루프를 위해 트랙 내용을 한 번 복제
    (function(){
      const track = document.getElementById('toolTrack');
      if(track) track.innerHTML += track.innerHTML;
    })();

    // (02) 포트폴리오 — 3D 회전 링 갤러리 (Bureau Nine): 스크롤 진행도만큼 링이 회전
    (function(){
      const wrap = document.getElementById('pfCarousel');
      const ring = wrap && wrap.querySelector('.ring');
      if(!wrap || !ring) return;
      const items = Array.prototype.slice.call(ring.children);
      const N = items.length; if(!N) return;
      const STEP = 360 / N;
      function radius(){ return Math.max(400, Math.min(innerWidth * 0.52, 700)); }
      function layout(){
        const r = radius();
        items.forEach(function(el, i){
          const oy = parseFloat(el.getAttribute('data-oy') || '0');
          el.style.transform = 'translateY(calc(-50% + ' + oy + 'px)) rotateY(' + (i * STEP) + 'deg) translateZ(' + r + 'px)';
        });
      }
      layout(); addEventListener('resize', layout);
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let cur = 0, raf = 0, lastIdx = -1;
      function target(){
        const rect = wrap.getBoundingClientRect();
        const total = rect.height - innerHeight;
        let p = total > 0 ? -rect.top / total : 0;
        p = Math.max(0, Math.min(1, p));
        return p * STEP * (N - 1);   // 마지막 작업물이 정면에서 끝남
      }
      function frame(){
        raf = 0;
        const t = target();
        cur = reduce ? t : (Math.abs(t - cur) < 0.04 ? t : cur + (t - cur) * 0.11);
        ring.style.transform = 'translateZ(' + (-radius()) + 'px) rotateY(' + (-cur) + 'deg)';
        const idx = Math.min(N - 1, Math.max(0, Math.round(cur / STEP)));
        if(idx !== lastIdx){
          items.forEach(function(el, i){ el.classList.toggle('front', i === idx); });
          lastIdx = idx;
        }
        if(cur !== t) raf = requestAnimationFrame(frame);
      }
      function kick(){ if(!raf) raf = requestAnimationFrame(frame); }
      addEventListener('scroll', kick, { passive:true });
      addEventListener('resize', kick);
      kick();
    })();

    // (03) 점등 문장: 스크롤 위치에 연동 — 내리는 만큼 단어가 순차로 밝아짐 (Fuel 의 흰→회색 진행)
    (function(){
      const stmt = document.getElementById('stmt2');
      if(!stmt) return;
      const lines = stmt.innerHTML.split(/<br\s*\/?>/i);
      stmt.innerHTML = lines.map(function(line){
        return line.trim().split(/\s+/).filter(Boolean).map(function(w){ return '<span class="w">' + w + '</span>'; }).join(' ');
      }).join('<br>');
      const spans = Array.prototype.slice.call(stmt.querySelectorAll('.w'));
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){ spans.forEach(s=>s.classList.add('lit')); return; }
      let lit = -1;
      function update(){
        const r = stmt.getBoundingClientRect(), vh = innerHeight;
        const start = vh * 0.86;
        const end   = vh * 0.34;
        let p = (start - r.top) / (start - end);
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        const n = Math.round(p * spans.length);
        if(n === lit) return;
        for(let i=0;i<spans.length;i++){ spans[i].classList.toggle('lit', i < n); }
        lit = n;
      }
      addEventListener('scroll', update, { passive:true });
      addEventListener('resize', update);
      update();
    })();

    // 로딩: 도트 매트릭스 [ PORTFOLIO ]
    (function(){
      const loader = document.getElementById('loader');
      const canvas = document.getElementById('loaderCanvas');
      function reveal(){ document.body.classList.remove('loading'); document.body.classList.add('loaded'); }
      if(!loader || !canvas){ reveal(); return; }
      try{ if(sessionStorage.getItem('pf_seen')){ reveal(); loader.style.display='none'; return; } }catch(e){}
      document.body.classList.add('loading');
      const ctx = canvas.getContext('2d');
      const TEXT = 'PORTFOLIO';
      let W=0, H=0, dpr=1, dots=[], startT=0, raf=0, done=false, sprite=null;
      const R = Math.random;
      function makeSprite(){
        const s = document.createElement('canvas'); s.width=s.height=20; const c=s.getContext('2d');
        const g = c.createRadialGradient(10,10,0,10,10,10);
        g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.4,'rgba(255,255,255,.9)');
        g.addColorStop(.7,'rgba(255,255,255,.25)'); g.addColorStop(1,'rgba(255,255,255,0)');
        c.fillStyle=g; c.fillRect(0,0,20,20); sprite=s;
      }
      function buildDots(){
        dpr = Math.min(window.devicePixelRatio||1, 2);
        const cssW = Math.min(window.innerWidth*0.88, 960);
        const off = document.createElement('canvas'); const o = off.getContext('2d');
        const FF = "px 'Arial',Helvetica,sans-serif";
        let fs = 160; o.font = '800 '+fs+FF;
        let mw = o.measureText(TEXT).width; fs = fs*(cssW*0.97)/mw;
        o.font = '800 '+fs+FF;
        const textH = Math.ceil(fs*1.05); const padY = 180;
        W = Math.ceil(cssW); H = textH + padY*2;
        off.width=W; off.height=textH; o.font='800 '+fs+FF;
        o.fillStyle='#fff'; o.textAlign='center'; o.textBaseline='middle';
        o.clearRect(0,0,W,textH); o.fillText(TEXT, W/2, textH/2);
        const img = o.getImageData(0,0,W,textH).data;
        const gap = Math.max(3, Math.round(fs/26)); dots=[];
        for(let y=0;y<textH;y+=gap){ for(let x=0;x<W;x+=gap){ if(img[(y*W+x)*4+3]>110){
          const tx=x+(R()-0.5)*gap*0.5, ty=y+(R()-0.5)*gap*0.5+padY;
          dots.push({ tx:tx, ty:ty, sx:tx+(R()-0.5)*80, sy:ty-(80+R()*340),
            delay:R()*420, dur:620+R()*520, r:0.4+R()*0.7, base:0.55+R()*0.45,
            swA:(R()-0.5)*14, swF:0.9+R()*1.2, tw:R()*6.283 });
        } } }
        makeSprite();
        canvas.style.width=W+'px'; canvas.style.height=H+'px';
        canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
        startT = performance.now();
      }
      function loop(){
        const t = performance.now() - startT;
        ctx.clearRect(0,0,W,H);
        let allIn = true;
        ctx.fillStyle = '#ffffff';
        for(const d of dots){
          let lp=(t-d.delay)/d.dur;
          if(lp<0){ allIn=false; continue; }
          if(lp<1) allIn=false;
          const cl = lp>1?1:lp;
          const e = 1-Math.pow(1-cl,3);
          const cx = d.sx + (d.tx-d.sx)*e + Math.sin(t*0.001*d.swF + d.tw)*d.swA*(1-e);
          const cy = d.sy + (d.ty-d.sy)*e;
          let a = cl*1.8; if(a>1) a=1;
          a *= d.base;
          a *= 0.85 + 0.15*Math.sin(t*0.0035 + d.tw);
          if(a<0) a=0;
          const size = d.r*5;
          ctx.globalAlpha = a*0.85;
          ctx.drawImage(sprite, cx-size/2, cy-size/2, size, size);
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(cx, cy, d.r*0.85, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if(allIn && t>1950 && !done){ done=true; finish(); }
        raf = requestAnimationFrame(loop);
      }
      function finish(){ done=true; try{ sessionStorage.setItem('pf_seen','1'); }catch(e){} loader.classList.add('done'); reveal(); setTimeout(()=>{ if(raf) cancelAnimationFrame(raf); loader.style.display='none'; }, 450); }
      function start(){ buildDots(); if(raf) cancelAnimationFrame(raf); loop(); }
      if(document.fonts && document.fonts.ready){ document.fonts.ready.then(start); } else { start(); }
      setTimeout(()=>{ if(!W) start(); }, 200);
      setTimeout(()=>{ if(!document.body.classList.contains('loaded')){ finish(); } }, 4000); // 안전장치
    })();
}
