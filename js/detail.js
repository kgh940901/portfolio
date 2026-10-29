// 상세 페이지 공통 — 절제된 스크롤 등장만 (모션 감소 설정에서는 즉시 표시)
(function(){
  var els = document.querySelectorAll('.rv');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    els.forEach(function(e){ e.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });   /* 긴 시트 묶음(뷰포트보다 수십 배 큰 요소)도 발화하도록 비율 대신 교차 여부만 */
  els.forEach(function(e){ io.observe(e); });
})();

// 상단 코드 숫자 롤링 (js/numroll.js)
if(window.initNumRoll){ try{ window.initNumRoll(); }catch(e){} }

// 확대 보기(라이트박스) — img.zm 클릭/Enter 로 원본 크기 열람.
// 닫기 버튼·ESC·배경 탭으로 닫고, 여는 동안 본문 스크롤을 잠갔다가 닫으면 원래 위치로 복귀.
// data-zy(원본 세로 비율)가 있으면 크롭된 표시 영역에 맞춰 처음부터 해당 위치로 스크롤.
(function(){
  var zs = document.querySelectorAll('img.zm');
  if(!zs.length) return;
  var box = null, big = null, sc = null, lastFocus = null, sy = 0, fr = 0;
  function build(){
    box = document.createElement('div');
    box.className = 'lbx';
    box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','이미지 확대 보기');
    box.innerHTML = '<button class="lbx-x" type="button" aria-label="닫기">&times;</button><div class="lbx-scroll"><img alt="" /></div>';
    document.body.appendChild(box);
    big = box.querySelector('img');
    sc = box.querySelector('.lbx-scroll');
    big.addEventListener('load', place);
    box.querySelector('.lbx-x').addEventListener('click', close);
    sc.addEventListener('click', function(e){ if(e.target === sc) close(); });   // 이미지 밖 배경 탭
    addEventListener('keydown', function(e){ if(e.key === 'Escape' && box.classList.contains('on')) close(); });
  }
  function place(){
    sc.scrollLeft = Math.max(0, (big.offsetWidth - sc.clientWidth) / 2);
    sc.scrollTop = fr > 0 ? Math.max(0, big.offsetHeight * fr - 24) : 0;
  }
  function open(src, alt, f){
    if(!box) build();
    sy = scrollY; fr = f || 0; lastFocus = document.activeElement;
    big.alt = alt || '작업 이미지 확대'; big.src = src;
    box.classList.add('on');
    document.body.classList.add('lbx-lock');
    document.body.style.top = -sy + 'px';
    box.querySelector('.lbx-x').focus();
    if(big.complete && big.naturalWidth) place();
  }
  function close(){
    box.classList.remove('on');
    document.body.classList.remove('lbx-lock');
    document.body.style.top = '';
    scrollTo({ top: sy, left: 0, behavior: 'instant' });   // 원래 스크롤 위치로 즉시 복귀(smooth 전역 설정 무시)
    big.removeAttribute('src');                    // 거대 이미지 디코드 해제
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  zs.forEach(function(z){
    z.setAttribute('tabindex','0');
    z.setAttribute('role','button');
    if(!z.getAttribute('aria-label')) z.setAttribute('aria-label','이미지 크게 보기');
    function go(){ open(z.currentSrc || z.src, z.alt, parseFloat(z.getAttribute('data-zy')) || 0); }
    z.addEventListener('click', go);
    z.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); } });
  });
})();
