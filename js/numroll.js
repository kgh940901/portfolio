// 프로젝트 코드 숫자 롤링 + 실측 수치 카운트업 (animata 계열의 세로 롤링을 절제해 적용)
// - .njs[data-pre][data-num] : "P — 01" 형태. 접두어·유형은 고정, 두 자리 숫자만 아래→위 롤링(00→최종, 1회)
// - .cnt[data-v]             : 0→최종값 카운트업 (~1.1s, ease-out). 단위·설명은 고정
// - 스크린리더에는 최종 코드만(aria-label + aria-hidden), reduced-motion 은 최종값 즉시 표시
window.initNumRoll = function(){
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── ① 코드 롤러 ──
  var rolls = Array.prototype.slice.call(document.querySelectorAll('.njs:not([data-nr])'));
  rolls.forEach(function(el){ el.setAttribute('data-nr', '1'); });
  if(!rm && rolls.length){
    var pending = [];
    rolls.forEach(function(el){
      var pre = el.getAttribute('data-pre') || '';
      var n = parseInt(el.getAttribute('data-num'), 10) || 0;
      var fin = ('0' + n).slice(-2);
      el.setAttribute('aria-label', pre + fin);
      el.textContent = '';
      var ps = document.createElement('span');
      ps.textContent = pre; ps.setAttribute('aria-hidden', 'true');
      el.appendChild(ps);
      var cols = [];
      for(var i = 0; i < 2; i++){
        // 00→n 카운트에서 이 자릿수가 지나는 숫자열 (연속 중복 제거)
        var seq = [];
        for(var v = 0; v <= n; v++){
          var d = +('0' + v).slice(-2)[i];
          if(seq[seq.length - 1] !== d) seq.push(d);
        }
        var col = document.createElement('span'); col.className = 'nd'; col.setAttribute('aria-hidden', 'true');
        var st = document.createElement('span'); st.className = 'nstack';
        seq.forEach(function(d){ var s = document.createElement('span'); s.textContent = d; st.appendChild(s); });
        col.appendChild(st); el.appendChild(col);
        cols.push({ st: st, steps: seq.length - 1 });
      }
      pending.push({ el: el, cols: cols });
    });
    var order = 0;
    var rio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        rio.unobserve(e.target);
        var item = null;
        pending.some(function(p){ if(p.el === e.target){ item = p; return true; } });
        if(!item) return;
        var delay = (order++ % 4) * 120;   // 같은 화면의 여러 행은 짧은 시차
        setTimeout(function(){
          item.cols.forEach(function(c){ c.st.style.transform = 'translateY(' + (-c.steps) + 'em)'; });
        }, delay);
      });
    }, { threshold: .6 });
    pending.forEach(function(p){ rio.observe(p.el); });
  }

  // ── ② 카운트업 ──
  var cnts = Array.prototype.slice.call(document.querySelectorAll('.cnt:not([data-nr])'));
  cnts.forEach(function(el){ el.setAttribute('data-nr', '1'); });
  if(rm || !cnts.length) return;
  function fmt(el, v){
    var s;
    if(el.getAttribute('data-fmt') === 'comma'){ s = v.toLocaleString('en-US'); }
    else { s = String(v); }
    var pad = parseInt(el.getAttribute('data-pad'), 10);
    if(pad) s = ('00' + s).slice(-pad);
    return s;
  }
  cnts.forEach(function(el){
    var p = el.parentElement;
    if(p && !p.getAttribute('aria-label')) p.setAttribute('aria-label', p.textContent.replace(/\s+/g, ' ').trim());
    el.setAttribute('aria-hidden', 'true');
  });
  var cio = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, v = parseInt(el.getAttribute('data-v'), 10) || 0;
      var t0 = performance.now(), DUR = 1100;
      (function tick(now){
        var t = Math.min(1, (now - t0) / DUR);
        var ease = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(el, Math.round(v * ease));
        if(t < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: .6 });
  cnts.forEach(function(el){ cio.observe(el); });
};
