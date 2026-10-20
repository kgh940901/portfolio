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
  }, { threshold: .05, rootMargin: '0px 0px -8% 0px' });
  els.forEach(function(e){ io.observe(e); });
})();

// 상단 코드 숫자 롤링 (js/numroll.js)
if(window.initNumRoll){ try{ window.initNumRoll(); }catch(e){} }
