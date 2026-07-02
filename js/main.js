    // 스크롤 등장
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), (i % 4) * 70); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    // 진행바
    const sprog = document.getElementById('sprog');
    function prog(){ const de = document.documentElement; const max = de.scrollHeight - de.clientHeight; if(sprog) sprog.style.transform = 'scaleX(' + (max>0 ? de.scrollTop/max : 0) + ')'; }
    addEventListener('scroll', prog, { passive:true }); addEventListener('resize', prog); prog();

    // 벌집 배경: 부드러운 마우스 패럴럭스(이징) + 잔잔한 부유
    // (인트로 배경은 CSS 글로우 비주얼로 대체 — 육각형 canvas 제거됨)

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
