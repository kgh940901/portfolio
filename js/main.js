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

    // 스크롤 스파이: 상단 내비 + 하단 독 동시 반영 (CTA 제외, href 기준)
    (function(){
      const links = Array.prototype.slice.call(document.querySelectorAll('.dock a, .nav-links a'));
      if(!links.length) return;
      const isNav = function(a){ const id=a.getAttribute('href'); return id && id.charAt(0)==='#' && !a.classList.contains('dock-cta') && !a.classList.contains('nl-cta'); };
      const sections = links.filter(isNav).map(function(a){ return { a:a, el:document.querySelector(a.getAttribute('href')) }; }).filter(function(m){ return m.el; });
      const projects = document.getElementById('projects');
      function spy(){
        const mid = innerHeight*0.42; let curHref=null;
        sections.forEach(function(m){ const r=m.el.getBoundingClientRect(); if(r.top<=mid && r.bottom>=mid){ curHref=m.a.getAttribute('href'); } });
        // Work + Project Details를 하나의 영역으로: projects 구간에선 Work 유지
        if(projects){ const r=projects.getBoundingClientRect(); if(r.top<=mid && r.bottom>=mid){ curHref='#work'; } }
        links.forEach(function(a){ if(isNav(a)) a.classList.toggle('active', a.getAttribute('href')===curHref); });
      }
      addEventListener('scroll', spy, { passive:true }); addEventListener('resize', spy); spy();
    })();

    // 상단 내비: 스크롤 시 배경/블러
    (function(){
      const topnav = document.getElementById('topnav'); if(!topnav) return;
      function onScroll(){ topnav.classList.toggle('scrolled', scrollY > 10); }
      addEventListener('scroll', onScroll, { passive:true }); onScroll();
    })();

    // 물결(WebGL ripple) — 인트로(물빛 텍스처) + 그 아래(순검정, 파문만)
    (function(){
      if(!window.jQuery || !jQuery.fn || !jQuery.fn.ripples) return;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      // 모바일/터치에서는 성능을 위해 물결 비활성화(정적 다크 배경 유지)
      if(reduce || innerWidth < 820 || !matchMedia('(pointer:fine)').matches) return;
      function setup(id, interval){
        const el = document.getElementById(id); if(!el) return null;
        const $el = jQuery(el);
        try{ $el.ripples({ resolution: 512, dropRadius: 60, perturbance: 0.012, interactive: false }); }
        catch(e){ return null; } // WebGL 미지원 시 정적 배경 유지
        if(reduce){ try{ $el.ripples('pause'); }catch(e){} return null; }
        // 파문이 퍼지는 속도를 느리게 — 시뮬레이션을 2프레임 중 1번만 실행(렌더는 매 프레임)
        (function(){
          const inst = $el.data('ripples'); if(!inst || !inst.update) return;
          const orig = inst.update; let f = 0;
          inst.update = function(){ if((f++ % 2) === 0) orig.call(inst); }; // 절반 속도로 잔잔히
        })();
        let playing = true;
        function setPlay(p){ if(p===playing) return; playing=p; try{ $el.ripples(p ? 'play' : 'pause'); }catch(e){} }
        function drop(){
          if(!playing || document.hidden) return;   // 정지 중엔 물방울을 쌓지 않음(재개 시 폭우 방지)
          const w=el.clientWidth, h=el.clientHeight; if(!w||!h) return;
          try{ $el.ripples('drop', Math.random()*w, Math.random()*h, 70+Math.random()*50, 0.028+Math.random()*0.02); }catch(e){}
        }
        setInterval(drop, interval);
        let rt; addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ try{ $el.ripples('updateSize'); }catch(e){} }, 200); });
        document.addEventListener('visibilitychange', ()=>{ setPlay(!document.hidden); });
        return { setPlay };
      }
      const hero = setup('heroWater', 3800);   // 인트로 전용 — 물빛 텍스처, 파문 조금 더 천천히
      setup('pageWater', 2400);                // 전체 배경 — 순검정 위 파문만

      // 인트로가 화면 밖이면 인트로 물결 정지(성능) — 정지 중엔 drop도 멈춤
      if(hero){
        const top=document.getElementById('top');
        addEventListener('scroll', ()=>{ const rc=top.getBoundingClientRect();
          hero.setPlay(rc.bottom>0 && rc.top<innerHeight); }, {passive:true});
      }
    })();

    // 커스텀 마우스 커서 (mango-media 스타일: 흰 점 + difference + 0.7s 트레일링, hover 시 확대)
    (function(){
      if(!matchMedia('(pointer:fine)').matches) return;
      const dot=document.getElementById('curDot');
      if(!dot) return;
      document.body.classList.add('cursor-on');
      addEventListener('pointermove', e=>{ dot.style.transform='translate('+e.clientX+'px,'+e.clientY+'px) translate(-50%,-50%)'; }, {passive:true});
      document.querySelectorAll('a, button, summary, .dock a, .pf-card, .ab, .pf-btn, .hmq-track').forEach(el=>{
        el.addEventListener('pointerenter',()=>dot.classList.add('hover'));
        el.addEventListener('pointerleave',()=>dot.classList.remove('hover'));
      });
    })();

    // 텍스트 하이라이트: 스크롤 위치에 연동 — 내리는 만큼 단어가 순차로 켜지고, 올리면 꺼짐
    (function(){
      const stmt = document.getElementById('stmt2');
      if(!stmt) return;
      const words = stmt.textContent.trim().split(/\s+/);
      stmt.innerHTML = words.map(w => '<span class="w">' + w + '</span>').join(' ');
      const spans = Array.prototype.slice.call(stmt.querySelectorAll('.w'));
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){ spans.forEach(s=>s.classList.add('lit')); return; }
      let lit = -1;
      function update(){
        const r = stmt.getBoundingClientRect(), vh = innerHeight;
        const start = vh * 0.82;   // 문단이 화면에 보이기 시작할 때 진행도 0
        const end   = vh * 0.30;   // 문단 상단이 여기 도달하면 진행도 1 (전부 켜짐)
        let p = (start - r.top) / (start - end);
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        const n = Math.round(p * spans.length);
        if(n === lit) return;      // 변화 없으면 스킵
        for(let i=0;i<spans.length;i++){ spans[i].classList.toggle('lit', i < n); }
        lit = n;
      }
      addEventListener('scroll', update, { passive:true });
      addEventListener('resize', update);
      update();
    })();

    // 로딩: 도트 매트릭스 로고 [ GAHYUN ]
    (function(){
      const loader = document.getElementById('loader');
      const canvas = document.getElementById('loaderCanvas');
      function reveal(){ document.body.classList.remove('loading'); document.body.classList.add('loaded'); }
      if(!loader || !canvas){ reveal(); return; }
      // 같은 세션(재방문)에서는 로더 생략
      try{ if(sessionStorage.getItem('pf_seen')){ reveal(); loader.style.display='none'; return; } }catch(e){}
      document.body.classList.add('loading');
      const ctx = canvas.getContext('2d');
      const TEXT = 'PORTFOLIO';
      let W=0, H=0, dpr=1, dots=[], startT=0, raf=0, done=false, grad=null, sprite=null;
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
        const cssW = Math.min(window.innerWidth*0.88, 960);   // 텍스트를 더 크게
        const off = document.createElement('canvas'); const o = off.getContext('2d');
        const FF = "px 'Arial',Helvetica,sans-serif";
        let fs = 160; o.font = '800 '+fs+FF;                  // 굵은 획(도톰·또렷)
        let mw = o.measureText(TEXT).width; fs = fs*(cssW*0.97)/mw;
        o.font = '800 '+fs+FF;
        const textH = Math.ceil(fs*1.05); const padY = 180;
        W = Math.ceil(cssW); H = textH + padY*2;
        off.width=W; off.height=textH; o.font='800 '+fs+FF;
        o.fillStyle='#fff'; o.textAlign='center'; o.textBaseline='middle';
        o.clearRect(0,0,W,textH); o.fillText(TEXT, W/2, textH/2);
        const img = o.getImageData(0,0,W,textH).data;
        const gap = Math.max(3, Math.round(fs/26)); dots=[]; grad=null;   // 촘촘·작은 별(확대 스케일에 맞춰)
        for(let y=0;y<textH;y+=gap){ for(let x=0;x<W;x+=gap){ if(img[(y*W+x)*4+3]>110){
          const tx=x+(R()-0.5)*gap*0.5, ty=y+(R()-0.5)*gap*0.5+padY;      // 살짝 흐트러진 별자리
          dots.push({ tx:tx, ty:ty, sx:tx+(R()-0.5)*80, sy:ty-(80+R()*340),
            delay:R()*420, dur:620+R()*520, r:0.4+R()*0.7, base:0.55+R()*0.45, // 작은 점·밝기 편차
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
        // 1) 별빛 입자가 위에서 은은하게 흩날려 내려와 글자로 모임
        let allIn = true;
        ctx.fillStyle = '#ffffff';             // 순백색
        for(const d of dots){
          let lp=(t-d.delay)/d.dur;
          if(lp<0){ allIn=false; continue; }   // 아직 안 내려온 별
          if(lp<1) allIn=false;
          const cl = lp>1?1:lp;
          const e = 1-Math.pow(1-cl,3);         // 부드럽게 착지
          const cx = d.sx + (d.tx-d.sx)*e + Math.sin(t*0.001*d.swF + d.tw)*d.swA*(1-e); // 흩날림(착지하며 감쇠)
          const cy = d.sy + (d.ty-d.sy)*e;
          let a = cl*1.8; if(a>1) a=1;           // 내려오며 서서히 밝아짐
          a *= d.base;                            // 별마다 밝기 편차 (별자리 무드)
          a *= 0.85 + 0.15*Math.sin(t*0.0035 + d.tw); // 은은한 반짝임
          if(a<0) a=0;
          const size = d.r*5;
          ctx.globalAlpha = a*0.85;
          ctx.drawImage(sprite, cx-size/2, cy-size/2, size, size);   // 작은 글로우
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(cx, cy, d.r*0.85, 0, Math.PI*2); ctx.fill(); // 아주 작은 코어
        }
        ctx.globalAlpha = 1;
        // 촤르르 떨어진 뒤 완성된 PORTFOLIO를 잠시 멈춰 읽히게 (착지 후 홀드)
        if(allIn && t>1950 && !done){ done=true; finish(); }
        raf = requestAnimationFrame(loop);
      }
      function finish(){ done=true; try{ sessionStorage.setItem('pf_seen','1'); }catch(e){} loader.classList.add('done'); reveal(); setTimeout(()=>{ if(raf) cancelAnimationFrame(raf); loader.style.display='none'; }, 450); }
      function start(){ buildDots(); if(raf) cancelAnimationFrame(raf); loop(); }
      if(document.fonts && document.fonts.ready){ document.fonts.ready.then(start); } else { start(); }
      setTimeout(()=>{ if(!W) start(); }, 200);
      setTimeout(()=>{ if(!document.body.classList.contains('loaded')){ finish(); } }, 4000); // 안전장치
    })();

    // 실시간 시계 [ HH:MM:SS ]
    (function(){
      const clk = document.getElementById('heroClock'); if(!clk) return;
      function tick(){ const d=new Date(); clk.textContent = '[ ' + d.toLocaleTimeString('en-GB',{hour12:false}) + ' ]'; }
      tick(); setInterval(tick, 1000);
    })();

    // 프로필 사진: PROFILE 배지가 사진 안에서 마우스를 따라 이동
    (function(){
      if(!matchMedia('(pointer:fine)').matches) return;
      const pf = document.querySelector('.hero-pf');
      const badge = pf && pf.querySelector('.pf-badge');
      if(!pf || !badge) return;
      let tx=0, ty=0, cx=0, cy=0, raf=0, active=false;
      function loop(){
        cx += (tx-cx)*0.18; cy += (ty-cy)*0.18;
        badge.style.left = cx+'px'; badge.style.top = cy+'px';
        if(active || Math.abs(tx-cx)>0.5 || Math.abs(ty-cy)>0.5){ raf = requestAnimationFrame(loop); } else { raf = 0; }
      }
      pf.addEventListener('pointerenter', e=>{
        const r = pf.getBoundingClientRect();
        tx = cx = e.clientX - r.left; ty = cy = e.clientY - r.top;
        badge.style.left = cx+'px'; badge.style.top = cy+'px';
        active = true; document.body.classList.add('no-dot'); if(!raf) loop();
      });
      pf.addEventListener('pointermove', e=>{
        const r = pf.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
      }, {passive:true});
      pf.addEventListener('pointerleave', ()=>{ active = false; document.body.classList.remove('no-dot'); });
    })();

}
