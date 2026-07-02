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
      function spawn(p){ p.x=rand(0,W); p.y=rand(0,H); p.px=p.x; p.py=p.y; p.life=rand(60,220); p.col=PAL[(Math.random()*PAL.length)|0]; p.sp=rand(1.4,3.4); }
      function init(){
        DPR=Math.min(window.devicePixelRatio||1,1.5);
        W=c.clientWidth||hero.clientWidth; H=c.clientHeight||hero.clientHeight; if(!W||!H) return;
        c.width=Math.round(W*DPR); c.height=Math.round(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0);
        ctx.fillStyle='#06070b'; ctx.fillRect(0,0,W,H);
        const n = W<700?900:2200; parts=[];
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
          if(d2<52900){ const d=Math.sqrt(d2)||1; a+=Math.atan2(dy,dx)*0.8*(1-d/230); }
          p.px=p.x; p.py=p.y; p.x+=Math.cos(a)*p.sp; p.y+=Math.sin(a)*p.sp;
          ctx.strokeStyle=p.col; ctx.globalAlpha=0.42;
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
      document.querySelectorAll('a, button, summary, .dock a, .pf-card, .ab, .pf-btn').forEach(el=>{
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

    // 로딩 인사말: 안녕하세요 → Hello → 你好 → こんにちは → 공개
    (function(){
      const loader = document.getElementById('loader');
      const lw = [document.getElementById('lw0'), document.getElementById('lw1')];
      function reveal(){ document.body.classList.remove('loading'); document.body.classList.add('loaded'); }
      if(!loader || !lw[0] || !lw[1]){ reveal(); return; }
      document.body.classList.add('loading');
      // 한국어 가장 길게 → 영어 → 중국어 → 일본어. 전환은 두 글자가 겹쳐 부드럽게 이어짐(크로스페이드)
      const seq = [
        { t:'안녕하세요', d:1000 }, { t:'Hello', d:600 }, { t:'你好', d:540 }, { t:'こんにちは', d:640 }
      ];
      // 글자를 스팬으로 쪼갬. stagger=true면 한 글자씩 순차, false면 통째로 한 번에
      function build(el, text, stagger){
        el.innerHTML = '';
        Array.prototype.forEach.call(text, (ch, idx) => {
          const s = document.createElement('span');
          s.className = 'lchar';
          s.textContent = ch;
          s.style.transitionDelay = (stagger ? idx * 0.07 : 0) + 's';
          el.appendChild(s);
        });
      }
      let i = 0, active = 0;
      function step(){
        const cur = seq[i];
        const inEl = lw[active], outEl = lw[active ^ 1];
        outEl.classList.remove('show'); outEl.classList.add('exit');   // 이전 글자 위로 빠짐
        inEl.classList.remove('exit', 'show');
        build(inEl, cur.t, i === 0);    // 첫 단어(안녕하세요)만 한 글자씩, 나머진 한 번에
        void inEl.offsetWidth;          // 리플로우로 초기 위치 확정
        inEl.classList.add('show');     // 아래→위로 떠오름
        active ^= 1; i++;
        setTimeout(i < seq.length ? step : finish, cur.d);
      }
      function finish(){ lw[active ^ 1].classList.remove('show'); lw[active ^ 1].classList.add('exit'); loader.classList.add('done'); reveal(); setTimeout(() => { loader.style.display = 'none'; }, 900); }
      setTimeout(step, 100);
      setTimeout(() => { if(!document.body.classList.contains('loaded')){ finish(); } }, 7000); // 안전장치
    })();
