// ===== 맨 위 / 맨 아래 이동 버튼 =====
// 모든 페이지 공용. 마크업과 스타일을 스스로 주입하므로 각 페이지엔 이 파일만 불러오면 됩니다.
//   <script src="js/scroll-nav.js" defer></script>
(function(){
  if(document.querySelector('.tbnav')) return;   // 중복 삽입 방지

  var css = [
    '.tbnav{ position:fixed; right:20px; bottom:24px; z-index:70; display:flex; flex-direction:column; gap:8px; }',
    '.tbnav button{ width:44px; height:44px; padding:0; border:1px solid rgba(255,255,255,.12); border-radius:50%;',
    '  cursor:pointer; display:flex; align-items:center; justify-content:center; color:#e9e9e6;',
    '  background:linear-gradient(150deg,#1f1f1f,#131313);',
    '  box-shadow:0 10px 24px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07);',
    '  -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px);',
    '  transition:color .2s, border-color .2s, transform .2s, opacity .25s; }',
    '.tbnav button:hover{ color:#fff; border-color:rgba(255,255,255,.32); transform:translateY(-2px); }',
    '.tbnav button:disabled{ opacity:.26; pointer-events:none; }',
    '.tbnav svg{ width:17px; height:17px; display:block; }',
    /* 모바일에선 하단 중앙 독과 겹치지 않도록 위로 올림 */
    '@media(max-width:760px){ .tbnav{ right:14px; bottom:88px; } .tbnav button{ width:40px; height:40px; } }',
    '@media(prefers-reduced-motion:reduce){ .tbnav button{ transition:none; } .tbnav button:hover{ transform:none; } }'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function icon(d){
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="' + d +
           '" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  var nav = document.createElement('div');
  nav.className = 'tbnav';
  nav.innerHTML =
    '<button type="button" data-dir="top" aria-label="맨 위로 이동" title="맨 위로">'    + icon('M12 19V5M6 11l6-6 6 6') + '</button>' +
    '<button type="button" data-dir="bottom" aria-label="맨 아래로 이동" title="맨 아래로">' + icon('M12 5v14M6 13l6 6 6-6')  + '</button>';
  document.body.appendChild(nav);

  var toTop    = nav.querySelector('[data-dir="top"]');
  var toBottom = nav.querySelector('[data-dir="bottom"]');
  var reduce   = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function go(y){
    try{ scrollTo({ top:y, behavior: reduce ? 'auto' : 'smooth' }); }
    catch(e){ scrollTo(0, y); }   // 옵션 객체 미지원 브라우저
  }
  toTop.addEventListener('click', function(){ go(0); });
  toBottom.addEventListener('click', function(){ go(document.documentElement.scrollHeight); });

  // 이미 끝에 닿아 있으면 해당 버튼을 흐리게 (문서 높이가 화면보다 작으면 둘 다 비활성)
  var ticking = false;
  function sync(){
    ticking = false;
    var de = document.documentElement;
    var max = de.scrollHeight - de.clientHeight;
    var y = de.scrollTop || document.body.scrollTop || 0;
    toTop.disabled    = y < 40;
    toBottom.disabled = max - y < 40;
  }
  function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(sync); } }
  addEventListener('scroll', onScroll, { passive:true });
  addEventListener('resize', onScroll);
  addEventListener('load', onScroll);   // 이미지 로딩으로 문서 높이가 늘어난 뒤 재계산
  // index.html 은 섹션을 나중에 fetch 해 끼워넣으므로 높이 변화를 계속 감시
  if(window.ResizeObserver){ new ResizeObserver(onScroll).observe(document.body); }
  sync();
})();
