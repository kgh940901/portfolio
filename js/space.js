// ===== 히어로: 우주 배경 + 커서 유리 렌즈 =====
// 배경: 딥 네이비 + 해시 그리드 별 3겹(크기·밝기 편차, 아주 느린 드리프트·반짝임) + 저주파 FBM 성운(블루·보라).
//       중앙은 성운·밝은 별을 줄여 텍스트 가독성 확보. 모두 프로시저럴이라 렌즈 굴절 시 배경을 재평가만 하면 됨.
// 렌즈: 포인터 위치의 구면 캡 — 배경 UV 를 안쪽으로 굴절(가장자리일수록 강하게), 채널별 오프셋으로 색 번짐,
//       림 하이라이트 + 은은한 스펙큘러. 포인터를 빠르게(0.3 lerp) 따라오고, 영역을 벗어나면 강도가 서서히 0 으로.
// 터치 기기: 렌즈 없음(배경만). prefers-reduced-motion: 정지 1프레임. WebGL 실패: 숨김(텍스트·메뉴 무관).
window.initHeroSpace = function(){
  var host = document.getElementById('heroSpace');
  if(!host || host.querySelector('canvas')) return;
  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl', { alpha:false, antialias:false });
  if(!gl){ host.style.display = 'none'; return; }
  host.appendChild(canvas);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer:fine)').matches;

  var VS = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }';
  var FS = [
    'precision highp float; varying vec2 vUv;',
    'uniform float uTime; uniform vec2 uRes; uniform vec2 uLens; uniform float uStr;',
    'float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));',
    '  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);',
    '}',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; } return v; }',
    // 별 한 겹: 그리드 셀마다 확률적으로 하나, 크기·밝기·반짝임 편차
    'float starLayer(vec2 uv, float scale, float density, float t){',
    '  vec2 g = uv * scale;',
    '  vec2 id = floor(g); vec2 f = fract(g);',
    '  float h = hash(id);',
    '  if(h > density) return 0.0;',
    '  vec2 pos = vec2(hash(id+7.1), hash(id+3.7)) * 0.8 + 0.1;',
    '  float d = length(f - pos);',
    '  float size = 0.028 + hash(id+11.3) * 0.05;',
    '  float tw = 0.78 + 0.22 * sin(t * (0.3 + hash(id+5.5)*0.5) + h * 6.283);',  // 느린 반짝임
    '  return smoothstep(size, 0.0, d) * (0.35 + hash(id+9.2)*0.65) * tw;',
    '}',
    // 우주 배경 (aspect 보정된 좌표 q, 중심 거리 cd)
    'vec3 space(vec2 q, float cd, float t){',
    '  vec3 col = mix(vec3(0.022,0.026,0.045), vec3(0.040,0.048,0.082), q.y*0.5+0.5);', // 딥 네이비
    '  float calm = smoothstep(0.12, 0.52, cd);',                                        // 중앙은 차분하게
    '  float neb1 = fbm(q*1.5 + vec2(t*0.006, -t*0.004));',
    '  float neb2 = fbm(q*2.3 - vec2(t*0.004, t*0.005) + 3.7);',
    '  col += vec3(0.16,0.22,0.46) * pow(max(neb1-0.42,0.0)/0.58, 1.5) * 0.44 * calm;',  // 블루 성운
    '  col += vec3(0.30,0.20,0.44) * pow(max(neb2-0.48,0.0)/0.52, 1.7) * 0.36 * calm;',  // 보라 성운
    '  float s = 0.0;',
    '  s += starLayer(q + vec2(t*0.0016, 0.0), 26.0, 0.14, t) * 1.00;',                   // 밝고 적게
    '  s += starLayer(q + vec2(-t*0.0009, t*0.0005) + 4.2, 52.0, 0.20, t) * 0.55;',
    '  s += starLayer(q + vec2(t*0.0005, -t*0.0008) + 9.1, 96.0, 0.26, t) * 0.30;',       // 어둡고 많게
    '  col += vec3(0.92,0.95,1.0) * s * (0.55 + 0.45*calm);',                             // 중앙 별은 약하게
    '  return col;',
    '}',
    'void main(){',
    '  float aspect = uRes.x / uRes.y;',
    '  vec2 q = (vUv - 0.5) * vec2(aspect, 1.0);',
    '  float cd = length(q);',
    '  float t = uTime;',
    '  vec2 lq = (uLens - 0.5) * vec2(aspect, 1.0);',
    '  vec2 toL = q - lq; float r = length(toL);',
    '  float R = 0.125;',                                                                 // 렌즈 반경 (화면높이 기준)
    '  vec3 col;',
    '  float inL = step(r, R) * uStr;',
    '  if(inL > 0.001){',
    '    float k = r / R;',
    '    float bump = sqrt(max(1.0 - k*k, 0.0));',                                        // 구면 캡 높이
    '    vec2 nd = toL / max(r, 1e-5);',
    '    float disp = (1.0 - bump) * 0.42 * uStr;',                                       // 중심 0, 가장자리 강하게
    '    vec2 off = nd * disp * R;',
    '    vec3 cr; ',
    '    cr.r = space(q - off*1.06, cd, t).r;',                                           // 채널별 굴절 — 색 번짐
    '    cr.g = space(q - off,      cd, t).g;',
    '    cr.b = space(q - off*0.94, cd, t).b;',
    '    col = cr * (1.0 + bump*0.22*uStr);',                                             // 렌즈 안 미세한 밝기
    '    float rim = smoothstep(0.86, 0.975, k) * smoothstep(1.0, 0.985, k);',            // 얇은 림
    '    col += vec3(0.62,0.72,1.0) * rim * 0.42 * uStr;',                                // 블루 림 하이라이트
    '    float spec = pow(max(1.0 - length((q - lq - vec2(-0.35,0.35)*R)) / R, 0.0), 3.0);',
    '    col += vec3(1.0) * spec * 0.10 * uStr;',                                         // 좌상단 은은한 반사
    '  } else {',
    '    col = space(q, cd, t);',
    '  }',
    '  col *= 1.0 - smoothstep(0.55, 1.05, cd) * 0.35;',                                  // 비네트
    '  gl_FragColor = vec4(col, 1.0);',
    '}'].join('\n');

  function compile(type, src){
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }
  var prog = gl.createProgram();
  var v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, FS);
  if(!v || !f){ host.style.display = 'none'; return; }
  gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ host.style.display = 'none'; return; }
  gl.useProgram(prog);
  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = { time:gl.getUniformLocation(prog,'uTime'), res:gl.getUniformLocation(prog,'uRes'),
            lens:gl.getUniformLocation(prog,'uLens'), str:gl.getUniformLocation(prog,'uStr') };

  var dpr = Math.min(devicePixelRatio || 1, innerWidth < 860 ? 1 : 1.4);
  function resize(){
    var w = host.clientWidth, h = host.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize(); addEventListener('resize', function(){ resize(); kick(); });

  // 포인터 — 렌즈는 빠르게 따라오고(0.3), 영역을 벗어나면 강도만 서서히 0 으로
  var mx = 0.5, my = 0.5, lx = 0.5, ly = 0.5, str = 0, strT = 0;
  if(fine && !reduce){
    addEventListener('pointermove', function(e){
      if(e.pointerType && e.pointerType !== 'mouse') return;
      var r = host.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      strT = inside ? 1 : 0;
      if(inside){
        mx = (e.clientX - r.left) / r.width;
        my = 1 - (e.clientY - r.top) / r.height;
        if(str < 0.02){ lx = mx; ly = my; }   // 처음 들어올 땐 그 자리에서 바로 떠오름
      }
      kick();
    }, { passive:true });
    document.addEventListener('mouseleave', function(){ strT = 0; kick(); });
  }

  var raf = 0, start = performance.now();
  function draw(now){
    gl.uniform1f(U.time, (now - start) / 1000);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    lx += (mx - lx) * 0.3; ly += (my - ly) * 0.3;
    str += (strT - str) * 0.07;
    gl.uniform2f(U.lens, lx, ly);
    gl.uniform1f(U.str, str);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now){
    raf = 0;
    if(document.hidden || scrollY > innerHeight * 1.2) return;   // 히어로가 덮이면 중단
    draw(now);
    raf = requestAnimationFrame(frame);
  }
  function kick(){ if(!raf && !reduce) raf = requestAnimationFrame(frame); }
  if(reduce){ draw(performance.now()); }                          // 모션 최소화: 정지 1프레임
  else{
    kick();
    addEventListener('scroll', kick, { passive:true });
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) kick(); });
  }
};
try{ window.initHeroSpace(); }catch(e){}
