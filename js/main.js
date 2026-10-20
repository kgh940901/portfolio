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

    // 커서를 따라다니는 프로젝트 프리뷰 (Signal-A 실측 방식 — Case Studies 목록과 award-item 목록 동일 메커니즘)
    // 확인된 레퍼런스 동작: position:fixed 이미지가 커서 중앙에 고정되어 따라오고,
    // 프로젝트별 엘리먼트가 각자 opacity 로 크로스페이드(이전 것은 마지막 위치에서 사라짐),
    // 목록 이탈 시 모두 페이드아웃, 이미지는 글자 위(z 높음)·pointer-events 없음 → 클릭/호버를 가로채지 않음.
    function initCursorPreview(listId, rowSel, imgClass){
      const list = document.getElementById(listId);
      if(!list) return;
      const rows = Array.prototype.slice.call(list.querySelectorAll(rowSel));
      if(!rows.length) return;
      if(!matchMedia('(pointer:fine)').matches) return;                    // 터치: 링크 이동이 우선
      if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // 모션 최소화: 텍스트 목록만
      // 프로젝트별 이미지 엘리먼트를 미리 만들어 로딩 — 첫 호버에 빈 화면 방지, 잘못된 이미지 교체 없음
      const imgs = rows.map(function(row){
        const im = document.createElement('img');
        im.src = row.getAttribute('data-img'); im.alt = '';
        im.className = imgClass; im.setAttribute('aria-hidden','true');
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
        if(active >= 0) imgs[active].classList.remove('on');   // 이전 프리뷰는 제자리에서 페이드아웃 — 누적 없음
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
    }
    initCursorPreview('csList', '.cs-row', 'cs-cursor-img');
    initCursorPreview('archList', '.arow', 'cs-cursor-img sm');   // More Works: 레퍼런스처럼 더 작은 프리뷰

    // (03) More Works — 프로젝트명 스크램블 (scramble-hover 참고).
    // 주의: 레퍼런스 실측에서 헤드리스 환경에선 텍스트 변화가 관찰되지 않아 리듬·시간은 보수적 자체값(450ms).
    // 진입(pointerenter/focusin) 1회만 실행 — 같은 행 안에서 마우스를 움직여도 재시작 없음.
    // 글자는 왼쪽부터 순차 복원되고 종료 시 원문 완전 복원. 공백·비ASCII(한글 등)는 치환하지 않아 자모 분리 없음.
    // 행 이탈 시 진행 중이던 애니메이션은 즉시 취소 + 원문 복구. aria-label 이 행 이름을 고정 제공하므로 접근성 이름은 흔들리지 않음.
    (function(){
      const list = document.getElementById('archList');
      if(!list) return;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&';
      const DUR = 450;
      list.querySelectorAll('.arow').forEach(function(row){
        const nm = row.querySelector('.an');
        if(!nm) return;
        const orig = nm.textContent;
        let raf = 0, t0 = 0;
        function stop(){ if(raf){ cancelAnimationFrame(raf); raf = 0; } nm.textContent = orig; }
        function tick(now){
          const p = Math.min((now - t0) / DUR, 1);
          const keep = Math.floor(p * orig.length);
          let out = '';
          for(let i = 0; i < orig.length; i++){
            const ch = orig[i];
            if(i < keep || ch === ' ' || ch.charCodeAt(0) > 126){ out += ch; }  // 공백·한글 등은 그대로
            else{ out += CHARS[(Math.random() * CHARS.length) | 0]; }
          }
          nm.textContent = out;
          if(p < 1){ raf = requestAnimationFrame(tick); }
          else{ raf = 0; nm.textContent = orig; }                 // 종료: 원문 정확 복원
        }
        function start(){
          if(raf) cancelAnimationFrame(raf);                      // 빠른 재진입: 이전 것 정리 후 새로
          t0 = performance.now();
          raf = requestAnimationFrame(tick);
        }
        row.addEventListener('pointerenter', function(e){
          if(e.pointerType && e.pointerType !== 'mouse') return;  // 터치 제외
          start();
        });
        row.addEventListener('pointerleave', stop);
        row.addEventListener('focusin', start);
        row.addEventListener('focusout', stop);
      });
    })();

    // CTA 배너 별빛 — 1회만 그리는 정적 캔버스 (렌더 루프 없음, 메인보다 낮은 밀도·밝기)
    (function(){
      const cv = document.querySelector('.cb-stars');
      if(!cv) return;
      function draw(){
        const r = cv.getBoundingClientRect();
        if(!r.width || !r.height) return;
        const d = Math.min(devicePixelRatio || 1, 2);
        cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
        const ctx = cv.getContext('2d');
        ctx.scale(d, d);
        ctx.fillStyle = '#e8eeff';
        const n = Math.round(r.width * r.height / 5200);
        for(let i = 0; i < n; i++){
          ctx.globalAlpha = 0.16 + Math.random() * 0.5;
          ctx.beginPath();
          ctx.arc(Math.random() * r.width, Math.random() * r.height, 0.3 + Math.random() * 0.9, 0, 6.283);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      draw();
      let t; addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(draw, 200); });
    })();

    // CTA 마퀴 속도 — 레퍼런스 실측 50px/s 등속을 트랙 폭과 무관하게 유지
    (function(){
      const tr = document.querySelector('.cb-track');
      if(!tr) return;
      function speed(){
        const half = tr.scrollWidth / 2;
        if(half > 0) tr.style.animationDuration = (half / 50).toFixed(1) + 's';
      }
      speed();
      if(document.fonts && document.fonts.ready) document.fonts.ready.then(speed);
      let t; addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(speed, 200); });
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

    // 툴 띠: 수동 정지/재생 토글 — .paused 클래스는 마우스가 나가도 유지(호버 임시 정지와 별개).
    // play-state 만 바꾸므로 재생은 항상 멈춘 위치에서 이어짐
    (function(){
      const btn = document.getElementById('toolsToggle');
      const strip = document.querySelector('.logo-strip');
      if(!btn || !strip) return;
      btn.addEventListener('click', function(){
        const paused = strip.classList.toggle('paused');
        btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        btn.setAttribute('aria-label', paused ? '툴 목록 재생' : '툴 목록 일시정지');
      });
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
