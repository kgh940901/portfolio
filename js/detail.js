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
