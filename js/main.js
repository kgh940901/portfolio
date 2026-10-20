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
    // 섹션이 fetch 로 늦게 조립되므로, 주소에 해시가 있으면 조립 후 앵커 위치를 복원
    if(location.hash){
      try{
        const t = document.querySelector(location.hash);
        if(t) setTimeout(function(){ t.scrollIntoView(); }, 80);
      }catch(e){}
    }

    // 스크롤 등장
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), (i % 4) * 70); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    // (02) Case Studies — 커서를 따라다니는 프로젝트 프리뷰 (Signal-A 방식)
    // 확인된 레퍼런스 동작: position:fixed 이미지가 커서 중앙에 고정되어 따라오고,
    // 프로젝트별 엘리먼트가 각자 opacity 로 크로스페이드(이전 것은 마지막 위치에서 사라짐),
    // 목록 이탈 시 모두 페이드아웃, 이미지는 글자 위(z 높음)·pointer-events 없음.
    (function(){
      const list = document.getElementById('csList');
      if(!list) return;
      const rows = Array.prototype.slice.call(list.querySelectorAll('.cs-row'));
      if(!rows.length) return;
      if(!matchMedia('(pointer:fine)').matches) return;                    // 터치: CSS 모바일 레이아웃이 담당
      if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // 모션 최소화: 큰 제목(CSS)만
      // 프로젝트별 이미지 엘리먼트를 미리 만들어 로딩 — 첫 호버에 빈 화면 방지, 잘못된 이미지 교체 없음
      const imgs = rows.map(function(row){
        const im = document.createElement('img');
        im.src = row.getAttribute('data-img'); im.alt = '';
        im.className = 'cs-cursor-img'; im.setAttribute('aria-hidden','true');
        document.body.appendChild(im);
        return im;
      });
      let x = 0, y = 0, cx = 0, cy = 0, active = -1, raf = 0;
      function placeActive(){
        if(active < 0) return;
        imgs[active].style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-50%)';
      }
      function frame(){
        raf = 0;
        cx += (x - cx) * 0.3; cy += (y - cy) * 0.3;    // 경쾌한 추적 (과한 지연 없음)
        placeActive();
        if(active >= 0 && (Math.abs(x - cx) > 0.3 || Math.abs(y - cy) > 0.3)) raf = requestAnimationFrame(frame);
      }
      function kick(){ if(!raf) raf = requestAnimationFrame(frame); }
      function setActive(i){
        if(i === active) return;
        if(active >= 0) imgs[active].classList.remove('on');   // 이전 프리뷰는 제자리에서 페이드아웃
        active = i;
        if(i >= 0){ placeActive(); imgs[i].classList.add('on'); }
        kick();
      }
      rows.forEach(function(row, i){
        row.addEventListener('pointerenter', function(e){
          if(e.pointerType && e.pointerType !== 'mouse') return;
          x = e.clientX; y = e.clientY;
          if(active < 0){ cx = x; cy = y; }                    // 목록 첫 진입은 커서 자리에서 바로
          setActive(i);
        });
        row.addEventListener('focusin',  function(){            // 키보드 포커스: 행 중앙에 프리뷰
          const r = row.getBoundingClientRect();
          x = cx = r.left + r.width * 0.5; y = cy = r.top + r.height * 0.55;
          setActive(i);
        });
        row.addEventListener('focusout', function(){ setActive(-1); });
      });
      list.addEventListener('pointerleave', function(){ setActive(-1); });
      addEventListener('pointermove', function(e){
        if(active < 0) return;
        if(e.pointerType && e.pointerType !== 'mouse') return;
        x = e.clientX; y = e.clientY; kick();
      }, { passive:true });
      // 스크롤로 커서 밑 행이 바뀌면 상태가 어긋나므로 정리 (fixed 라 위치 자체는 어긋나지 않음)
      addEventListener('scroll', function(){ if(active >= 0) setActive(-1); }, { passive:true });
    })();

    // 진행바
    const sprog = document.getElementById('sprog');
    function prog(){ const de = document.documentElement; const max = de.scrollHeight - de.clientHeight; if(sprog) sprog.style.transform = 'scaleX(' + (max>0 ? de.scrollTop/max : 0) + ')'; }
    addEventListener('scroll', prog, { passive:true }); addEventListener('resize', prog); prog();

    // 히어로 우주 배경 + 커서 유리 렌즈 (js/space.js)
    if(window.initHeroSpace){ try{ window.initHeroSpace(); }catch(e){} }

    // 툴 띠: 끊김 없는 루프를 위해 트랙 내용을 한 번 복제 (복제분은 스크린리더에서 제외)
    (function(){
      const track = document.getElementById('toolTrack');
      if(!track) return;
      const dup = document.createElement('div');
      dup.className = 'logo-dup';
      dup.setAttribute('aria-hidden', 'true');
      dup.innerHTML = track.innerHTML;
      track.appendChild(dup);
    })();

    // 툴 띠: 자동 이동 정지/재생 토글 — play-state 만 바꾸므로 멈춘 위치에서 그대로 이어짐
    (function(){
      const btn = document.getElementById('toolsToggle');
      const strip = document.querySelector('.logo-strip');
      if(!btn || !strip) return;
      btn.addEventListener('click', function(){
        const paused = strip.classList.toggle('paused');
        btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        btn.setAttribute('aria-label', paused ? '도구 목록 자동 이동 재생' : '도구 목록 자동 이동 일시정지');
      });
    })();

    // 툴 태그: 커서 근접 효과 — gerd-web.de menu-container 실측 이식.
    // 가장 가까운 태그가 최대 scale(~1.05), 거리에 따라 감쇠하며 이웃은 커서 반대쪽으로 수 px 밀림.
    // 인라인 transform 을 매 프레임 lerp — transform 뿐이라 레이아웃(주변 태그)은 밀리지 않고,
    // 빠르게 오가도 목표값으로 수렴할 뿐 누적되지 않음. 이탈 시 모두 0/1 로 복귀.
    (function(){
      const strip = document.querySelector('.logo-strip');
      if(!strip) return;
      if(!matchMedia('(pointer:fine)').matches) return;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const SIGMA = 120, AMP = 0.05, PUSH = 9;      // 영향 반경·최대 확대·이웃 밀림(px)
      let cards = null, mx = 0, active = false, raf = 0;
      function collect(){
        cards = Array.prototype.slice.call(strip.querySelectorAll('.logo-card'))
          .map(function(el){ return { el: el, s: 1, x: 0 }; });
      }
      function frame(){
        raf = 0;
        let settled = true;
        for(let i = 0; i < cards.length; i++){
          const c = cards[i];
          let sT = 1, xT = 0;
          if(active){
            const r = c.el.getBoundingClientRect();
            const cx = r.left + r.width / 2 - c.x;    // 자신의 밀림값을 빼서 원래 중심 기준으로 계산
            const d = cx - mx;
            if(Math.abs(d) < SIGMA * 2.6){
              const g = Math.exp(-(d / SIGMA) * (d / SIGMA));
              sT = 1 + AMP * g;
              xT = (d > 0 ? 1 : -1) * PUSH * g * Math.min(Math.abs(d) / 40, 1); // 커서 바로 위는 밀림 0
            }
          }
          c.s += (sT - c.s) * 0.16;
          c.x += (xT - c.x) * 0.16;
          if(Math.abs(c.s - 1) < 0.002 && Math.abs(c.x) < 0.05 && !active){ c.s = 1; c.x = 0; c.el.style.transform = ''; }
          else{
            c.el.style.transform = 'translateX(' + c.x.toFixed(2) + 'px) scale(' + c.s.toFixed(4) + ')';
            settled = false;
          }
        }
        if(active || !settled) raf = requestAnimationFrame(frame);
      }
      function kick(){ if(!raf) raf = requestAnimationFrame(frame); }
      strip.addEventListener('pointerenter', function(e){
        if(e.pointerType && e.pointerType !== 'mouse') return;
        if(!cards) collect();
        mx = e.clientX; active = true; kick();
      });
      strip.addEventListener('pointermove', function(e){
        if(e.pointerType && e.pointerType !== 'mouse') return;
        mx = e.clientX; if(active) kick();
      }, { passive: true });
      strip.addEventListener('pointerleave', function(){ active = false; kick(); });
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
