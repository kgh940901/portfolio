// ===== 커스텀 마우스 커서 (원형) =====
// 모든 페이지 공용. 스타일과 마크업을 스스로 주입하므로 각 페이지엔 이 파일만 불러오면 됩니다.
//   <script src="js/cursor.js" defer></script>
//
// 성능 메모 — 이전 커서가 밀렸던 원인을 전부 피함:
//   1. transform 에 transition 을 걸지 않음 (예전엔 .12s 라 항상 뒤처져 보였음)
//   2. mix-blend-mode 미사용 (전체화면 WebGL 캔버스 위에서 재합성 비용이 큼)
//      → 대신 어두운 외곽선으로 밝은 배경에서도 보이게 함
//   3. pointermove 는 좌표만 저장하고, 실제 적용은 requestAnimationFrame 으로 프레임당 1회
(function(){
  if(!matchMedia('(pointer:fine)').matches) return;   // 터치·펜 기기는 기본 동작 유지
  if(document.querySelector('.mcur')) return;

  // 마우스를 올리면 링으로 커지는 대상 (썸네일·프로필도 전부 a 태그라 여기에 포함됨)
  var LINK = 'a, button, summary, [role="button"], input, select, textarea, .dock a, .demo, .ab, .pf-btn';

  var css = [
    'html.mcur-on, html.mcur-on *{ cursor:none !important; }',
    '.mcur{ position:fixed; top:0; left:0; z-index:10000; pointer-events:none; opacity:0;',
    '  transition:opacity .25s ease; will-change:transform; }',
    '.mcur.on{ opacity:1; }',
    '.mcur span{ position:absolute; top:0; left:0; border-radius:50%; display:block;',
    '  transition:transform .3s cubic-bezier(.22,1,.36,1), opacity .2s ease; }',
    // 기본 상태 — 작은 흰 점
    '.mcur-dot{ width:10px; height:10px; margin:-5px 0 0 -5px; background:#f3f3f1;',
    '  box-shadow:0 0 0 1px rgba(0,0,0,.28); transform:scale(1); }',
    // 링크·버튼·썸네일 위 — 링으로 확장되고 점은 작아짐
    '.mcur-ring{ width:46px; height:46px; margin:-23px 0 0 -23px; border:1.5px solid rgba(243,243,241,.75);',
    '  box-shadow:0 0 0 1px rgba(0,0,0,.18), inset 0 0 0 1px rgba(0,0,0,.18);',
    '  transform:scale(.22); opacity:0; }',
    '.mcur.link .mcur-dot{ transform:scale(.42); }',
    '.mcur.link .mcur-ring{ transform:scale(1); opacity:1; }',
    // 누르는 동안 살짝 눌리는 반응
    '.mcur.down .mcur-dot{ transform:scale(.7); }',
    '.mcur.down.link .mcur-ring{ transform:scale(.82); }',
    '@media(prefers-reduced-motion:reduce){ .mcur span{ transition:none; } }'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var cur = document.createElement('div');
  cur.className = 'mcur';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<span class="mcur-dot"></span><span class="mcur-ring"></span>';
  document.body.appendChild(cur);
  document.documentElement.classList.add('mcur-on');

  var x = 0, y = 0, raf = 0, shown = false;

  function draw(){
    raf = 0;
    cur.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }

  addEventListener('pointermove', function(e){
    if(e.pointerType && e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if(!shown){ shown = true; cur.classList.add('on'); draw(); }   // 첫 등장은 즉시 위치 잡기
    if(!raf) raf = requestAnimationFrame(draw);
  }, { passive:true });

  // 이벤트 위임 — index.html 처럼 섹션을 나중에 끼워넣어도 자동으로 인식됨
  addEventListener('pointerover', function(e){
    var t = e.target;
    if(!t || !t.closest) return;
    cur.classList.toggle('link', !!t.closest(LINK));
  }, { passive:true });

  addEventListener('pointerdown', function(){ cur.classList.add('down'); }, { passive:true });
  addEventListener('pointerup',   function(){ cur.classList.remove('down'); }, { passive:true });

  function hide(){ shown = false; cur.classList.remove('on'); }
  document.addEventListener('mouseleave', hide);
  addEventListener('blur', hide);
})();
