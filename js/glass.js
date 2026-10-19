// ===== 히어로 유리 오브젝트 (Originkit Glass Icon 과 같은 기법의 바닐라 구현) =====
// 단일 풀스크린 쿼드에서 SDF 레이마칭으로 유리 토러스를 그림 — 메시·three.js 없음.
// 채널별 굴절률로 가장자리 색 번짐, 프레넬 반사(스튜디오 소프트박스 근사),
// 느린 사인 부유 + 포인터 기울임(작은 범위, ~0.6s 이즈). 배경은 투명(캔버스 밖 차콜과 자연 합성).
// prefers-reduced-motion: 정지 프레임 1장만 렌더. WebGL 미지원: 숨김(텍스트·버튼은 영향 없음).
window.initHeroGlass = function(){
  var host = document.getElementById('heroGlass');
  if(!host || host.querySelector('canvas')) return;
  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl', { alpha:true, antialias:true, premultipliedAlpha:true });
  if(!gl){ host.style.display = 'none'; return; }
  host.appendChild(canvas);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer:fine)').matches;

  var VS = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos; gl_Position = vec4(aPos,0.0,1.0); }';
  var FS = [
    'precision highp float; varying vec2 vUv;',
    'uniform float uTime; uniform vec2 uTilt;',
    'mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }',
    'mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }',
    'float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz)-t.x, p.y); return length(q)-t.y; }',
    'mat3 orient(){',
    '  float wob = sin(uTime*0.22)*0.07;',                        // 느린 부유 틸트
    '  return rotX(0.95 + uTilt.y + wob) * rotY(uTime*0.10 + uTilt.x);', // 아주 느린 세차 회전
    '}',
    'float map(vec3 p){ return sdTorus(orient()*p, vec2(0.60, 0.27)); }',
    'vec3 normalAt(vec3 p){',
    '  vec2 e = vec2(0.0015, 0.0);',
    '  return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));',
    '}',
    // 환경: 차콜 그라디언트 + 상단 소프트박스 + 은은한 블루 글로우 + 수평 하이라이트 띠
    'vec3 env(vec3 d){',
    '  float t = d.y*0.5+0.5;',
    '  vec3 col = mix(vec3(0.035,0.040,0.050), vec3(0.085,0.095,0.115), t);',
    '  col += vec3(0.85,0.88,0.95) * pow(max(d.y,0.0), 7.0) * 0.55;',                       // 천장 소프트박스
    '  col += vec3(0.45,0.58,1.0) * pow(max(dot(d, normalize(vec3(-0.55,0.2,0.45))),0.0), 4.0) * 0.38;', // 블루 글로우
    '  float band = smoothstep(0.16,0.20,d.y) * smoothstep(0.30,0.24,d.y);',
    '  col += vec3(0.55,0.60,0.72) * band * 0.5;',                                           // 수평 반사 띠
    '  return col;',
    '}',
    'void main(){',
    '  vec2 uv = vUv;',
    '  vec3 ro = vec3(0.0, 0.0, 2.35);',
    '  vec3 rd = normalize(vec3(uv*0.78, -1.6));',
    '  float t = 0.0; float d; bool hit = false;',
    '  for(int i=0;i<72;i++){',
    '    d = map(ro + rd*t);',
    '    if(d < 0.0018){ hit = true; break; }',
    '    t += d; if(t > 5.0) break;',
    '  }',
    '  if(!hit){ gl_FragColor = vec4(0.0); return; }',
    '  vec3 p = ro + rd*t;',
    '  vec3 n = normalAt(p);',
    '  float fres = 0.06 + 0.94*pow(1.0 - max(dot(-rd,n),0.0), 5.0);',
    // 채널별 굴절(색 번짐) — 유리 두께감은 법선 방향 보정으로 근사
    '  vec3 refr;',
    '  refr.r = env(refract(rd, n, 1.0/1.430)).r;',
    '  refr.g = env(refract(rd, n, 1.0/1.445)).g;',
    '  refr.b = env(refract(rd, n, 1.0/1.465)).b;',
    '  vec3 refl = env(reflect(rd, n));',
    '  vec3 col = mix(refr * 1.25, refl, clamp(fres,0.0,1.0));',
    '  col += vec3(1.0) * pow(max(dot(reflect(rd,n), normalize(vec3(0.4,0.8,0.5))),0.0), 60.0) * 0.9;', // 스펙 하이라이트
    '  col += vec3(0.45,0.58,1.0) * pow(1.0 - max(dot(-rd,n),0.0), 3.0) * 0.10;',            // 블루 림
    '  float a = 0.96;',
    '  gl_FragColor = vec4(col * a, a);',                          // premultiplied
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
  var uTime = gl.getUniformLocation(prog, 'uTime');
  var uTilt = gl.getUniformLocation(prog, 'uTilt');

  var dpr = Math.min(devicePixelRatio || 1, innerWidth < 860 ? 1 : 1.5);
  function resize(){
    var w = host.clientWidth, h = host.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize(); addEventListener('resize', function(){ resize(); kick(); });

  // 포인터 기울임 — 작은 범위(±0.14rad), ~0.6s 이즈로 따라감
  var tx = 0, ty = 0, cx = 0, cy = 0;
  if(fine && !reduce){
    addEventListener('pointermove', function(e){
      if(e.pointerType && e.pointerType !== 'mouse') return;
      tx = (e.clientX / innerWidth  - 0.5) * 0.28;
      ty = (e.clientY / innerHeight - 0.5) * 0.20;
    }, { passive:true });
  }

  var raf = 0, start = performance.now();
  function draw(now){
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, (now - start) / 1000);
    cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
    gl.uniform2f(uTilt, cx, cy);
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
try{ window.initHeroGlass(); }catch(e){}
