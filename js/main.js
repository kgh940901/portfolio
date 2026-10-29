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

    // 프로젝트 코드 롤링 + 수치 카운트업 (js/numroll.js)
    if(window.initNumRoll){ try{ window.initNumRoll(); }catch(e){} }

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

    // 전역 사이드 글로우 — 스크롤 진행에 따라 양옆 빛이 안쪽으로 스며듦 (css body::after 의 변수 갱신).
    // 진행률의 순수 함수라 역스크롤도 같은 경로로 자연 복원, 위치별 세로 높이도 천천히 변화.
    (function(){
      const root = document.documentElement;
      let raf = 0;
      function upd(){
        raf = 0;
        const h = innerHeight || 1;
        const p = Math.min(1, Math.max(0, (scrollY - h * .22) / (h * .9)));
        root.style.setProperty('--sg', p.toFixed(3));
        root.style.setProperty('--sy1', (36 + 13 * Math.sin(scrollY * .0004)).toFixed(1) + '%');
        root.style.setProperty('--sy2', (63 + 11 * Math.cos(scrollY * .00033)).toFixed(1) + '%');
      }
      addEventListener('scroll', function(){ if(!raf) raf = requestAnimationFrame(upd); }, { passive:true });
      upd();
    })();

    // (01) About — 양옆 광원: 제목 상단이 뷰포트 55%(TRIG)에 닿으면 바깥에서 '쓱' 등장(시간 기반 0.82s,
    // 우측 90ms 시차, 스크롤을 멈춰도 끝까지 재생). 등장 전엔 opacity 0 — 완전히 숨김.
    // 등장 후엔 스크롤 연동 보조 이동(기준점에서 0이라 등장 종점과 끊김 없이 이어짐).
    // 역방향은 78%(RESET)에서 부드럽게 숨기고 초기화 — 히스테리시스로 기준점 왕복 깜빡임 방지.
    (function(){
      const sec = document.getElementById('about');
      if(!sec) return;
      const gl = sec.querySelector('.ab-glow.gl'), gr = sec.querySelector('.ab-glow.gr');
      const title = sec.querySelector('.stmt-big');
      if(!gl || !gr || !title) return;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const root = document.documentElement;
      const TRIG = .55, RESET = .78;     // 제목 상단 기준(뷰포트 비율) — 조정 가능
      const DUR = 2000, LAG = 120, HIDE = 500;   // 등장 시간 / 우측 시차 / 숨김 시간(ms)
      let top = 0, hgt = 1, raf = 0;
      let phase = 0, t0 = 0, h0L = 0, h0R = 0, eL = 0, eR = 0;   // 0 숨김 / 1 등장 중 / 2 표시 / 3 숨김 중
      function measure(){ const r = sec.getBoundingClientRect(); top = r.top + scrollY; hgt = sec.offsetHeight; }
      function sm(t){ return t * t * (3 - 2 * t); }
      // smootherstep — 양 끝 가속 0: 천천히 번지기 시작해 끝까지 서서히 감속, 튕김 없음
      function ss(t){ t = Math.min(1, Math.max(0, t)); return t * t * t * (t * (t * 6 - 15) + 10); }
      function frame(now){
        raf = 0;
        const vh = innerHeight, mob = innerWidth < 700;
        const tt = title.getBoundingClientRect().top / vh;
        if((phase === 0 || phase === 3) && tt <= TRIG){
          t0 = now - eL * DUR; phase = 1;                       // 숨김 중 재진입도 현재 값에서 이어감
        } else if((phase === 1 || phase === 2) && tt > RESET){
          t0 = now; h0L = eL; h0R = eR; phase = 3;
        }
        if(phase === 1){
          eL = ss((now - t0) / DUR);
          eR = ss((now - t0 - LAG) / DUR);
          if((now - t0 - LAG) / DUR >= 1){ phase = 2; }
        } else if(phase === 3){
          const f = 1 - ss((now - t0) / HIDE);
          eL = h0L * f; eR = h0R * f;
          if(f <= 0){ phase = 0; eL = 0; eR = 0; }
        } else if(phase === 2){ eL = 1; eR = 1; }
        else { eL = 0; eR = 0; }
        // 등장 후 스크롤 연동 보조 이동 — TRIG 지점에서 0
        const ps = sm(Math.min(1, Math.max(0, (TRIG - tt) / .8)));
        const pout = sm(Math.min(1, Math.max(0, (scrollY - (top + hgt - vh * .95)) / (vh * .75))));
        const o = 1 - pout;
        // 이동 거리 축소 — 광원 대부분은 가장자리 근처에 남고 일부만 안쪽으로 번짐
        const xlS = mob ? -58 : -47, xlE = mob ? -38 : -21;     // 좌 중심: -18vw → 8vw
        const xrS = mob ?  49 :  43, xrE = mob ?  33 : 17;      // 우 중심: 118vw → 92vw
        const xl = xlS + (xlE - xlS) * eL + (mob ? 1.5 : 2.5) * ps;
        const xr = xrS + (xrE - xrS) * eR - (mob ? 1.5 : 2.5) * ps;
        gl.style.transform = 'translate(' + xl.toFixed(2) + 'vw, ' + ((1 - eL) * 3 - ps * 2).toFixed(2) + 'vh)';
        gr.style.transform = 'translate(' + xr.toFixed(2) + 'vw, ' + ((1 - eR) * -2 + ps * 2).toFixed(2) + 'vh)';
        // 농도는 이동보다 더 완만하게 차오름 — 흐릿한 가장자리가 먼저 스며들고 중심이 뒤따라옴
        gl.style.opacity = (Math.pow(eL, 1.25) * o).toFixed(3);
        gr.style.opacity = (Math.pow(eR, 1.25) * o).toFixed(3);
        // 01 구간에서는 전역 사이드 글로우를 물러나게 — 등장 전 배경이 깨끗한 흰색이 되도록
        const vIn  = Math.min(1, Math.max(0, (scrollY + vh - top) / (vh * .6)));
        const vOut = 1 - sm(Math.min(1, Math.max(0, (scrollY - (top + hgt - vh * .5)) / (vh * .6))));
        root.style.setProperty('--sgmul', (1 - .85 * vIn * vOut).toFixed(3));
        if(phase === 1 || phase === 3){ raf = requestAnimationFrame(frame); }   // 시간 기반 구간은 계속 재생
      }
      function onScroll(){ if(!raf) raf = requestAnimationFrame(frame); }
      addEventListener('scroll', onScroll, { passive:true });
      addEventListener('resize', function(){ measure(); onScroll(); });
      addEventListener('load', function(){ measure(); onScroll(); });
      measure(); requestAnimationFrame(frame);
    })();

    // (04) Services — 스크롤 연동 작업물 무대.
    // 진행률 p(0~1)의 순수 함수로 모든 상태를 계산: 멈추면 그 상태 유지, 역스크롤 자연 복원,
    // 자동 재생·휠 가로채기 없음. 중간 진입/새로고침에도 현재 p 로 즉시 그려짐.
    (function(){
      const scrollEl = document.getElementById('svcScroll');
      if(!scrollEl) return;
      const stage = scrollEl.querySelector('.svc-stage');
      const head = stage.querySelector('.svc-head');
      const endEl = stage.querySelector('.svc-end');
      const copies = Array.prototype.slice.call(stage.querySelectorAll('.svc-copy'));
      const panels = {};
      stage.querySelectorAll('.svc-panel').forEach(function(el){ panels[el.getAttribute('data-p')] = el; });
      const mobImg = document.getElementById('svcMobImg');
      const babImg = document.getElementById('svcBabImg');
      let babMax = 0;   // 바비 메인 내부 스크롤 거리
      let mobMax = 0;   // 모바일 내부 스크롤 거리 = 이미지 표시 높이 - 프레임 높이 (끝에 빈 공간 없음)
      const popImg = document.getElementById('svcPopImg');
      let popStart = 0, popTravel = 0;   // 팝업 모음: 첫 줄(헤더 띠 제외)에서 시작 → 줄 단위로 아래 내용 노출
      // pro1 시트 실측(px/8348): 첫 줄 위 여백 640 에서 시작해 시트 끝까지 — 종점은 코드에서 이미지 끝에 맞춰 캡
      const POP_START_FRAC = 640 / 8348, POP_END_FRAC = 1;

      // 패널 키프레임 [p, x(vw), y(vh), scale, rotate(deg), opacity, z]
      // 장면 배분(640vh): 0~.10 진입 / .10~.33 Web Design / .40~.62 Publishing / .68~.94 Promo —
      // 대기 구간(진입·전환·마무리)을 줄이고 장면 유지 구간은 거의 그대로 둠. 초기 y 를 올려 제목과 첫 이미지 간격 축소
      const KF = {
        A: [[0,   0,  9, .50,  0, 1, 3], [.10,-17,  2, 1,    0, 1, 5], [.33,-17,  2, 1,   0, 1, 5],
            [.40,-28,-27, .40, -2,.45,2], [.62,-28,-27,.40, -2,.45,2], [.68,-31,-30,.30, -2,.3, 1],
            [.94,-31,-30,.30, -2,.3, 1], [1,   0,  5, .40,  0, 1, 3]],
        B: [[0,  23, 13, .36,2.5, 1, 2], [.10, 36, 18, .26,2.5,.30,1], [.33, 36, 18,.26,2.5,.30,1],
            [.40,-17,  2, 1,    0, 1, 5], [.62,-17,  2, 1,   0, 1, 5], [.68, 33,-30,.26,  2,.3, 1],
            [.94, 33,-30,.26,  2,.3, 1], [1,  13,  8, .34,  0, 1, 2]],
        B2:[[0,   7,  6, .90,  0, 0, 6], [.38,  7,  6, .90,  0, 0, 6], [.44,  7,  6, 1,   0, 1, 6],
            [.62,  7,  6, 1,    0, 1, 6], [.67,  7,  6, .90,  0, 0, 6], [1,  7,  6, .90, 0, 0, 6]],
        C: [[0, -24, 13, .40, -2.5, 1, 2], [.10,-38, 12, .30,-2.5,.3, 1], [.33,-38, 12,.30,-2.5,.3, 1],
            [.40,-38, 12, .30,-2.5,.3, 1], [.62,-38, 12,.30,-2.5,.3, 1], [.68,-18, -2, 1,   0, 1, 5],
            [.94,-18, -2, 1,    0, 1, 5], [1, -20,  8, .38,  0, 1, 3]],
        D: [[0,  11, 22, .75,  2, 1, 4], [.10, 38, 32, .55,  2,.30,1], [.33, 38, 32,.55,  2,.30,1],
            [.40, 38, 32, .55,  2,.30,1], [.62, 38, 32,.55,  2,.30,1], [.68, 38, 32, .55,  2,.30,1],
            [.94, 38, 32, .55,  2,.30,1], [1,  33, 11, .85,  0, 1, 2]]
      };
      function smooth(t){ return t * t * (3 - 2 * t); }
      function sample(kf, p){
        if(p <= kf[0][0]) return kf[0];
        for(let i = 1; i < kf.length; i++){
          if(p <= kf[i][0]){
            const a = kf[i-1], b = kf[i];
            const t = smooth((p - a[0]) / (b[0] - a[0] || 1));
            const o = [p];
            for(let j = 1; j < 7; j++) o[j] = a[j] + (b[j] - a[j]) * t;
            return o;
          }
        }
        return kf[kf.length - 1];
      }
      // 설명 표시 창 [등장 시작, 완료, 퇴장 시작, 완료]
      const CW = [[.11,.15,.33,.37], [.42,.46,.62,.66], [.69,.73,.93,.96]];
      function fade(p, w){
        if(p < w[0] || p > w[3]) return 0;
        if(p < w[1]) return smooth((p - w[0]) / (w[1] - w[0]));
        if(p > w[2]) return 1 - smooth((p - w[2]) / (w[3] - w[2]));
        return 1;
      }
      function apply(p){
        for(const k in KF){
          const s = sample(KF[k], p), el = panels[k];
          if(!el) continue;
          el.style.transform = 'translate(calc(-50% + ' + s[1].toFixed(2) + 'vw), calc(-50% + ' + s[2].toFixed(2) + 'vh)) rotate(' + s[4].toFixed(2) + 'deg) scale(' + s[3].toFixed(3) + ')';
          el.style.opacity = s[5].toFixed(3);
          el.style.zIndex = Math.round(s[6]);
        }
        copies.forEach(function(c, i){
          const o = fade(p, CW[i]);
          c.style.opacity = o.toFixed(3);
          c.style.transform = 'translateY(calc(-50% + ' + ((1 - o) * 22).toFixed(1) + 'px))';
          c.style.visibility = o > 0.01 ? 'visible' : 'hidden';   // 빠른 스크롤에도 문장 겹침 없음
        });
        const ho = p < .04 ? 1 : (p > .10 ? 0 : 1 - smooth((p - .04) / .06));
        head.style.opacity = ho.toFixed(3);
        head.style.transform = 'translate(-50%, ' + (-(1 - ho) * 40).toFixed(1) + 'px)';
        head.style.visibility = ho > 0.01 ? 'visible' : 'hidden';
        const eo = p < .94 ? 0 : smooth(Math.min(1, (p - .94) / .05));
        endEl.style.opacity = eo.toFixed(3);
        // 모바일 프레임 내부 스크롤 — 패널이 자리 잡은 뒤(.48)부터 짧은 구간(.60)에
        // 긴 페이지가 위로 올라감. 경쾌하게 시작해 부드럽게 감속(ease-out), 진행률 연동이라 정지·역방향 모두 자연스러움
        // 바비 메인 내부 스크롤 — 장면1 안정 구간(.13~.31)에서 천천히 아래로
        if(babImg && babMax > 0){
          let bt = p < .13 ? 0 : (p > .31 ? 1 : (p - .13) / .18);
          babImg.style.transform = 'translateY(' + (-babMax * smooth(bt)).toFixed(1) + 'px)';
        }
        if(mobImg && mobMax > 0){
          let t = p < .45 ? 0 : (p > .59 ? 1 : (p - .45) / .14);
          t = 1 - Math.pow(1 - t, 3);
          mobImg.style.transform = 'translateY(' + (-mobMax * t).toFixed(1) + 'px)';
        }
        // 팝업 모음 내부 스크롤 — 패널 정착(.68) 후 .69~.93 에서 차분하게 줄 단위 이동.
        // 항상 첫 줄 오프셋을 기본 적용해 어느 장면에서든 헤더 띠가 보이지 않음
        if(popImg && popTravel >= 0){
          let t = p < .69 ? 0 : (p > .93 ? 1 : (p - .69) / .24);
          popImg.style.transform = 'translateY(' + (-(popStart + popTravel * smooth(t))).toFixed(1) + 'px)';
        }
      }
      let start = 0, range = 1, raf = 0, dynamic = false;
      function measure(){
        const r = scrollEl.getBoundingClientRect();
        start = r.top + scrollY;
        range = Math.max(1, scrollEl.offsetHeight - innerHeight);
        if(mobImg && panels.B2) mobMax = Math.max(0, mobImg.offsetHeight - panels.B2.clientHeight);
        if(babImg && panels.A) babMax = Math.max(0, babImg.offsetHeight - panels.A.clientHeight);
        if(popImg && panels.C){
          const ih = popImg.offsetHeight, fh = panels.C.clientHeight;
          popStart = ih * POP_START_FRAC;
          popTravel = Math.max(0, Math.min(ih * POP_END_FRAC, ih - fh) - popStart);
        }
      }
      function onScroll(){
        if(!dynamic || raf) return;
        raf = requestAnimationFrame(function(){
          raf = 0;
          apply(Math.min(1, Math.max(0, (scrollY - start) / range)));
        });
      }
      function clearInline(){
        stage.querySelectorAll('.svc-panel, .svc-copy').forEach(function(el){ el.removeAttribute('style'); });
        head.removeAttribute('style'); endEl.removeAttribute('style');
        if(mobImg) mobImg.style.transform = '';
        if(babImg) babImg.style.transform = '';
        if(popImg) popImg.style.transform = '';
      }
      function decide(){
        const stat = matchMedia('(max-width:860px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(stat){ scrollEl.classList.add('svc-static'); dynamic = false; clearInline(); return; }
        scrollEl.classList.remove('svc-static');
        dynamic = true; measure(); onScroll();
        apply(Math.min(1, Math.max(0, (scrollY - start) / range)));
      }
      decide();
      addEventListener('scroll', onScroll, { passive:true });
      let rt; addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(decide, 180); });
      addEventListener('load', function(){ if(dynamic){ measure(); onScroll(); } });
      if(mobImg && !mobImg.complete) mobImg.addEventListener('load', function(){ if(dynamic){ measure(); onScroll(); } });
      if(babImg && !babImg.complete) babImg.addEventListener('load', function(){ if(dynamic){ measure(); onScroll(); } });
      if(popImg && !popImg.complete) popImg.addEventListener('load', function(){ if(dynamic){ measure(); onScroll(); } });
    })();

    // 인트로 로더 제거 — 히어로 등장 상태(loaded)만 즉시 적용
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
