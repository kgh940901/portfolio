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
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    // 진행바
    const sprog = document.getElementById('sprog');
    function prog(){ const de = document.documentElement; const max = de.scrollHeight - de.clientHeight; if(sprog) sprog.style.transform = 'scaleX(' + (max>0 ? de.scrollTop/max : 0) + ')'; }
    addEventListener('scroll', prog, { passive:true }); addEventListener('resize', prog); prog();

    // 인트로 배경: 플로우 필드 파티클 (Refik 스타일 흐르는 비주얼)
    (function(){
      const c = document.getElementById('flowCanvas'); if(!c) return;
      const ctx = c.getContext('2d'); const hero = document.getElementById('top');
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let W=0, H=0, DPR=1, parts=[], t=0, mx=-999, my=-999;
      const PAL=['#c8407a','#e6c49a','#2f86ad','#8a3b6b','#e0913a','#4657a8','#d9d2c6'];
      const rand=(a,b)=>a+Math.random()*(b-a);
      function field(x,y){ return (Math.sin(x*0.0016+t*0.00022)+Math.cos(y*0.0016-t*0.00016)+Math.sin((x+y)*0.0011+t*0.00012))*Math.PI; }
      function spawn(p){ p.x=rand(0,W); p.y=rand(0,H); p.px=p.x; p.py=p.y; p.life=rand(80,240); p.col=PAL[(Math.random()*PAL.length)|0]; p.sp=rand(0.6,1.7); }
      function init(){
        DPR=Math.min(window.devicePixelRatio||1,1.5);
        W=c.clientWidth||hero.clientWidth; H=c.clientHeight||hero.clientHeight; if(!W||!H) return;
        c.width=Math.round(W*DPR); c.height=Math.round(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0);
        ctx.fillStyle='#06070b'; ctx.fillRect(0,0,W,H);
        const n = W<700?420:950; parts=[];
        for(let i=0;i<n;i++){ const p={}; spawn(p); p.px=p.x; p.py=p.y; parts.push(p); }
      }
      function frame(){
        if(!W){ init(); requestAnimationFrame(frame); return; }
        const rc=hero.getBoundingClientRect();
        if(rc.bottom<0 || rc.top>window.innerHeight){ requestAnimationFrame(frame); return; } // 화면 밖이면 정지
        t+=16;
        ctx.globalCompositeOperation='source-over';
        ctx.fillStyle='rgba(6,7,11,0.025)'; ctx.fillRect(0,0,W,H);
        ctx.globalCompositeOperation='lighter'; ctx.lineWidth=1.4; ctx.lineCap='round';
        for(const p of parts){
          let a=field(p.x,p.y);
          const dx=p.x-mx, dy=p.y-my, d2=dx*dx+dy*dy;
          if(d2<52900){ const d=Math.sqrt(d2)||1; a+=Math.atan2(dy,dx)*0.5*(1-d/230); }
          p.px=p.x; p.py=p.y; p.x+=Math.cos(a)*p.sp; p.y+=Math.sin(a)*p.sp;
          ctx.strokeStyle=p.col; ctx.globalAlpha=0.2;
          ctx.beginPath(); ctx.moveTo(p.px,p.py); ctx.lineTo(p.x,p.y); ctx.stroke();
          if(--p.life<0 || p.x<0||p.x>W||p.y<0||p.y>H) spawn(p);
        }
        ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
        requestAnimationFrame(frame);
      }
      addEventListener('pointermove', e=>{ const r=c.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top; }, {passive:true});
      let rt; addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(init,200); });
      init(); requestAnimationFrame(frame);
    })();

    // 커스텀 마우스 커서 (점 + 링)
    (function(){
      if(!matchMedia('(pointer:fine)').matches) return;
      const dot=document.getElementById('curDot'), ring=document.getElementById('curRing');
      if(!dot||!ring) return;
      document.body.classList.add('cursor-on');
      let rx=window.innerWidth/2, ry=window.innerHeight/2, tx=rx, ty=ry;
      addEventListener('pointermove', e=>{ tx=e.clientX; ty=e.clientY; dot.style.transform='translate('+tx+'px,'+ty+'px)'; }, {passive:true});
      (function loop(){ rx+=(tx-rx)*0.18; ry+=(ty-ry)*0.18; ring.style.transform='translate('+rx+'px,'+ry+'px)'; requestAnimationFrame(loop); })();
      document.querySelectorAll('a, button, summary, .dock a, .pf-card, .ab, .pf-btn, .hero-name').forEach(el=>{
        el.addEventListener('pointerenter',()=>ring.classList.add('big'));
        el.addEventListener('pointerleave',()=>ring.classList.remove('big'));
      });
    })();

    // 스크롤 텍스트 하이라이트
    (function(){
      const stmt = document.getElementById('stmt2');
      if(!stmt) return;
      const words = stmt.textContent.trim().split(/\s+/);
      stmt.innerHTML = words.map(w => '<span class="w">' + w + '</span>').join(' ');
      const spans = Array.prototype.slice.call(stmt.querySelectorAll('.w'));
      function hi(){ const trig = innerHeight * 0.62; for(const s of spans){ const r = s.getBoundingClientRect(); s.classList.toggle('lit', r.top < trig); } }
      addEventListener('scroll', hi, { passive:true }); addEventListener('resize', hi); hi();
    })();

    // 로딩: 도트 매트릭스 로고 [ GAHYUN ]
    (function(){
      const loader = document.getElementById('loader');
      const canvas = document.getElementById('loaderCanvas');
      function reveal(){ document.body.classList.remove('loading'); document.body.classList.add('loaded'); }
      if(!loader || !canvas){ reveal(); return; }
      document.body.classList.add('loading');
      const ctx = canvas.getContext('2d');
      const TEXT = 'PORTFOLIO';
      let W=0, H=0, dpr=1, dots=[], startT=0, raf=0, done=false;
      function buildDots(){
        dpr = Math.min(window.devicePixelRatio||1, 2);
        const cssW = Math.min(window.innerWidth*0.74, 620);
        const off = document.createElement('canvas'); const o = off.getContext('2d');
        let fs = 160; o.font = '800 '+fs+"px 'Arial Black',Arial,sans-serif";
        let tw = o.measureText(TEXT).width; fs = fs*(cssW*0.98)/tw;
        o.font = '800 '+fs+"px 'Arial Black',Arial,sans-serif";
        const cssH = Math.ceil(fs*0.95); W = Math.ceil(cssW); H = cssH;
        off.width=W; off.height=H; o.font='800 '+fs+"px 'Arial Black',Arial,sans-serif";
        o.fillStyle='#fff'; o.textAlign='center'; o.textBaseline='middle';
        o.clearRect(0,0,W,H); o.fillText(TEXT, W/2, H/2);
        const img = o.getImageData(0,0,W,H).data;
        const gap = Math.max(5, Math.round(fs/15)); const r = gap*0.42; dots=[];
        for(let y=0;y<H;y+=gap){ for(let x=0;x<W;x+=gap){ if(img[(y*W+x)*4+3]>90){ dots.push({x:x, y:y, r:r, delay:(x/W)*700 + Math.random()*180}); } } }
        canvas.style.width=W+'px'; canvas.style.height=H+'px';
        canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
        startT = performance.now();
      }
      function loop(){
        const t = performance.now() - startT;
        ctx.clearRect(0,0,W,H); ctx.fillStyle='#f2f2f2';
        let allIn = true;
        for(const d of dots){
          let p=(t-d.delay)/500; if(p<0){ p=0; allIn=false; } else if(p<1){ allIn=false; } if(p>1) p=1;
          const e = 1-Math.pow(1-p,3);
          ctx.globalAlpha=e; ctx.beginPath(); ctx.arc(d.x, d.y, d.r*e, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
        if(allIn && t>1500 && !done){ done=true; finish(); }
        raf = requestAnimationFrame(loop);
      }
      function finish(){ done=true; loader.classList.add('done'); reveal(); setTimeout(()=>{ if(raf) cancelAnimationFrame(raf); loader.style.display='none'; }, 850); }
      function start(){ buildDots(); if(raf) cancelAnimationFrame(raf); loop(); }
      if(document.fonts && document.fonts.ready){ document.fonts.ready.then(start); } else { start(); }
      setTimeout(()=>{ if(!W) start(); }, 250);
      setTimeout(()=>{ if(!document.body.classList.contains('loaded')){ finish(); } }, 6000); // 안전장치
    })();

    // 실시간 시계 [ HH:MM:SS ]
    (function(){
      const clk = document.getElementById('heroClock'); if(!clk) return;
      function tick(){ const d=new Date(); clk.textContent = '[ ' + d.toLocaleTimeString('en-GB',{hour12:false}) + ' ]'; }
      tick(); setInterval(tick, 1000);
    })();

}
