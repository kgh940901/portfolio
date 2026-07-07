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

    // 인트로 배경: 물결(WebGL ripple) — merryon 스타일 자동 빗방울 + 마우스 반응
    (function(){
      const el = document.getElementById('heroWater');
      if(!el || !window.jQuery || !jQuery.fn || !jQuery.fn.ripples) return;
      const $el = jQuery(el);
      try{
        $el.ripples({ resolution: 512, dropRadius: 60, perturbance: 0.02, interactive: false });
      }catch(e){ return; } // WebGL 미지원 시 정적 다크 배경 유지
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){ try{ $el.ripples('pause'); }catch(e){} return; }
      // 크고 느린 파문 (merryon 레퍼런스처럼 — 큰 링이 잔잔히 번짐)
      function drop(){
        const w=el.clientWidth, h=el.clientHeight; if(!w||!h) return;
        const x=Math.random()*w, y=Math.random()*h;
        const r=70+Math.random()*50, s=0.02+Math.random()*0.02;
        try{ $el.ripples('drop', x, y, r, s); }catch(e){}
      }
      setInterval(drop, 2600);  // 약 2.6초에 한 번, 큰 파문 하나씩
      // 화면 밖이면 렌더 정지(성능)
      const hero=document.getElementById('top');
      addEventListener('scroll', ()=>{ const rc=hero.getBoundingClientRect();
        try{ $el.ripples((rc.bottom>0 && rc.top<innerHeight) ? 'play' : 'pause'); }catch(e){} }, {passive:true});
    })();

    // 페이지 곳곳 연한 물방울 파문 데코 (CSS 링, 메인 히어로 제외)
    (function(){
      const hosts = [];
      ['#skills','#tools','#work','#career','#about','#projects','#contact'].forEach(sel=>{ const el=document.querySelector(sel); if(el) hosts.push(el); });
      function makeDeco(){
        const d=document.createElement('div'); d.className='ripple-deco'; d.setAttribute('aria-hidden','true');
        d.style.top=(10+Math.random()*76)+'%';
        d.style.left=(6+Math.random()*84)+'%';
        d.style.setProperty('--rs', (0.9+Math.random()*1.2).toFixed(2));
        d.innerHTML='<i></i><i></i><i></i>';
        // 서로 다른 위상으로 (동시에 안 퍼지게)
        d.querySelectorAll('i').forEach((ii,k)=>{ ii.style.animationDelay=(Math.random()*8 + k*2.7).toFixed(1)+'s'; });
        return d;
      }
      hosts.forEach(el=>{
        el.classList.add('deco-host');
        const n = 1 + (Math.random()<0.5 ? 1 : 0); // 섹션당 1~2개
        for(let i=0;i<n;i++) el.appendChild(makeDeco());
      });
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

      // 볼록렌즈 돋보기: 프로젝트 이미지 위에서 원형 확대
      const ZOOM = 1.9, RAD = 95;   // 렌즈 반지름(px), 렌즈 크기=190
      const lens = document.createElement('div'); lens.className = 'lens'; document.body.appendChild(lens);
      document.querySelectorAll('.pf-thumb').forEach(thumb=>{
        const img = thumb.querySelector('img'); if(!img) return;
        thumb.addEventListener('pointerenter', ()=>{
          lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
          lens.classList.add('on'); dot.classList.add('lens');
        });
        thumb.addEventListener('pointerleave', ()=>{
          lens.classList.remove('on'); dot.classList.remove('lens');
        });
        thumb.addEventListener('pointermove', e=>{
          const r = thumb.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          lens.style.transform = 'translate('+e.clientX+'px,'+e.clientY+'px) translate(-50%,-50%)';
          lens.style.backgroundSize = (r.width*ZOOM)+'px ' + (r.height*ZOOM)+'px';
          lens.style.backgroundPosition = (-(x*ZOOM - RAD))+'px ' + (-(y*ZOOM - RAD))+'px';
        }, {passive:true});
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
