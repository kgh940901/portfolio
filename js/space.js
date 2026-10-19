// ===== 히어로: 우주 배경 + 중앙 텍스트 + 유리 토러스 링 (Originkit glass-icon 공식 재현) =====
// 데모와 동일 구성: 중앙 큰 텍스트 '뒤판(plate)' 을 텍스처로 올리고, 그 앞에 유리 링을 레이마칭.
// 링에 맞은 픽셀은 공식 셰이더 공식(IOR 1.5 굴절 + 채널 분산 + 프레넬^4 + 프로스트 + 반사 믹스)으로
// 뒤판(별 배경 + 글자)을 왜곡해 샘플링 → 글자가 유리 속에서 일그러지고 가장자리에 색 번짐.
// 모션: 느린 yaw 회전 + 포인터 틸트(공식 TILT_RANGE 0.5, 0.6s급 이즈). 터치: 틸트 없음(회전만).
// prefers-reduced-motion: 정지 1프레임. WebGL 실패: 캔버스 숨김 → DOM 텍스트가 그대로 보임.
window.initHeroSpace = function(){
  var host = document.getElementById('heroSpace');
  if(!host || host.querySelector('canvas')) return;
  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl', { alpha:false, antialias:false });
  if(!gl){ host.style.display = 'none'; return; }
  host.appendChild(canvas);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer:fine)').matches;
  var center = document.querySelector('.hero-center');

  var VS = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }';
  var FS = [
    'precision highp float; varying vec2 vUv;',
    'uniform float uTime; uniform float uAng; uniform vec2 uRes; uniform vec2 uTilt; uniform sampler2D uText;',
    'float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));',
    '  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);',
    '}',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; } return v; }',
    'float starLayer(vec2 uv, float scale, float density, float t){',
    '  vec2 g = uv * scale;',
    '  vec2 id = floor(g); vec2 f = fract(g);',
    '  float h = hash(id);',
    '  if(h > density) return 0.0;',
    '  vec2 pos = vec2(hash(id+7.1), hash(id+3.7)) * 0.8 + 0.1;',
    '  float d = length(f - pos);',
    '  float size = 0.02 + hash(id+11.3) * 0.028;',                                   // 작은 점 위주
    '  float tw = 0.78 + 0.22 * sin(t * (0.3 + hash(id+5.5)*0.5) + h * 6.283);',
    '  return smoothstep(size, 0.0, d) * (0.35 + hash(id+9.2)*0.65) * tw;',
    '}',
    'vec3 space(vec2 q, float t){',
    '  float cd = length(q);',
    '  vec3 col = mix(vec3(0.050,0.062,0.095), vec3(0.085,0.095,0.140), q.y*0.5+0.5);',   // 연한 베이스
    // 레퍼런스풍 파스텔 글로우: 좌상단 틸(청록) + 우하단 바이올렛
    '  col += vec3(0.14,0.30,0.26) * smoothstep(1.05, 0.0, length(q - vec2(-0.62, 0.38))) * 0.40;',
    '  col += vec3(0.26,0.20,0.44) * smoothstep(1.15, 0.0, length(q - vec2( 0.60,-0.42))) * 0.42;',
    '  float calm = smoothstep(0.12, 0.52, cd);',
    '  float neb1 = fbm(q*1.5 + vec2(t*0.006, -t*0.004));',
    '  float neb2 = fbm(q*2.3 - vec2(t*0.004, t*0.005) + 3.7);',
    '  col += vec3(0.16,0.28,0.34) * pow(max(neb1-0.42,0.0)/0.58, 1.5) * 0.22 * calm;',
    '  col += vec3(0.30,0.22,0.46) * pow(max(neb2-0.48,0.0)/0.52, 1.7) * 0.20 * calm;',
    '  float s = 0.0;',
    '  s += starLayer(q + vec2(t*0.0016, 0.0), 26.0, 0.12, t) * 0.85;',
    '  s += starLayer(q + vec2(-t*0.0009, t*0.0005) + 4.2, 52.0, 0.20, t) * 0.55;',
    '  s += starLayer(q + vec2(t*0.0005, -t*0.0008) + 9.1, 96.0, 0.26, t) * 0.30;',
    '  col += vec3(0.92,0.95,1.0) * s * (0.55 + 0.45*calm);',
    '  col *= 1.0 - smoothstep(0.55, 1.05, cd) * 0.35;',
    '  return col;',
    '}',
    // 뒤판 = 우주 배경 + 글자. 유리 밖에선 흰 글자, 유리 안(투과)에선 옐로그린 틴트
    'vec3 plate(vec2 suv, float aspect, float t, vec3 inkCol){',
    '  vec2 q = (suv - 0.5) * vec2(aspect, 1.0);',
    '  vec3 col = space(q, t);',
    '  float a = texture2D(uText, clamp(suv, 0.0, 1.0)).a;',
    '  return mix(col, inkCol, a);',
    '}',
    'mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }',
    'mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }',
    'mat3 orient(){',
    // 데모처럼 크게 세워져 계속 회전(각도 uAng 는 JS 가 누적 — 호버 시 가속) + 포인터 틸트
    '  return rotX(uTilt.y + sin(uTime*0.26)*0.05) * rotY(1.15 + uAng + uTilt.x);',
    '}',
    'float map(vec3 p){',
    '  p = orient() * p;',
    '  vec2 q = vec2(length(p.xy) - 0.85, p.z);',                                     // 큰 링 (데모 비율)
    '  return length(q) - 0.24;',
    '}',
    'vec3 mapNormal(vec3 p){',
    '  const float e = 0.0015;',
    '  vec2 k = vec2(1.0, -1.0);',
    '  return normalize(k.xyy*map(p+k.xyy*e) + k.yyx*map(p+k.yyx*e) + k.yxy*map(p+k.yxy*e) + k.xxx*map(p+k.xxx*e));',
    '}',
    'void main(){',
    '  float aspect = uRes.x / uRes.y;',
    '  float t = uTime;',
    '  vec2 ndc = vUv * 2.0 - 1.0;',
    '  vec3 ro = vec3(0.0, 0.0, 6.1);',
    '  vec3 rd = normalize(vec3(ndc.x * 0.414 * aspect, ndc.y * 0.414, -1.0));',      // FOV 45°
    '  float tt = 0.0; bool hit = false;',
    '  for(int i = 0; i < 80; i++){',
    '    float d = map(ro + rd * tt);',
    '    if(d < 0.0012){ hit = true; break; }',
    '    tt += d * 0.9; if(tt > 9.5) break;',
    '  }',
    '  if(!hit){ gl_FragColor = vec4(plate(vUv, aspect, t, vec3(1.0)), 1.0); return; }',
    // ---- 이하 Originkit glass-icon 공식 셰이더 공식 ----
    '  vec3 p = ro + rd * tt;',
    '  vec3 n = mapNormal(p);',
    '  vec3 viewDir = -rd;',
    '  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);',
    '  float coreFactor = pow(max(dot(n, viewDir), 0.0), 2.0);',
    '  vec2 lensOffset = (vUv - 0.5) * 0.15 * coreFactor;',                            // CORE_REFRACT 1.0
    '  vec3 refractView = refract(rd, n, 1.0/1.5);',                                   // IOR 1.5
    '  vec2 offset = refractView.xy * 0.17 - lensOffset;',                             // THICKNESS 2.0 * 0.1 급
    '  float disp = 0.16;',                                                            // 분산(색 번짐)
    '  vec2 uvR = vUv + offset * (1.0 + disp);',
    '  vec2 uvG = vUv + offset;',
    '  vec2 uvB = vUv + offset * (1.0 - disp);',
    '  vec3 trans = vec3(0.0);',
    '  float rnd = hash(vUv * 437.58) * 6.2831853;',
    '  vec3 ink = vec3(0.84, 1.0, 0.30);',                                             // 유리 투과 글자색 — 옐로그린
    '  for(int i = 0; i < 4; i++){',                                                   // 가벼운 프로스트
    '    float th = float(i) * 2.39996323 + rnd;',
    '    vec2 bo = vec2(cos(th), sin(th)) * (float(i)+1.0) * 0.0005;',
    '    trans.r += plate(uvR + bo, aspect, t, ink).r;',
    '    trans.g += plate(uvG + bo, aspect, t, ink).g;',
    '    trans.b += plate(uvB + bo, aspect, t, ink).b;',
    '  }',
    '  trans *= 0.25;',
    // 반사(스튜디오 소프트박스 근사): 위쪽 밝은 띠 + 은은한 블루
    '  vec3 rfl = reflect(rd, n);',
    '  float band = smoothstep(0.15, 0.45, rfl.y) * smoothstep(0.9, 0.5, rfl.y);',
    '  vec3 reflCol = vec3(0.04,0.045,0.07) + vec3(1.0) * band * 0.9 + vec3(0.35,0.45,0.9) * pow(max(rfl.y,0.0), 5.0) * 0.4;',
    '  vec3 col = mix(trans, reflCol, clamp(fresnel * 0.8, 0.0, 1.0));',
    '  col += vec3(1.0) * pow(max(dot(rfl, normalize(vec3(0.35,0.75,0.55))), 0.0), 60.0) * 0.8;', // 스펙
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
  var U = { time:gl.getUniformLocation(prog,'uTime'), ang:gl.getUniformLocation(prog,'uAng'),
            res:gl.getUniformLocation(prog,'uRes'), tilt:gl.getUniformLocation(prog,'uTilt'),
            text:gl.getUniformLocation(prog,'uText') };

  // ---- 글자 뒤판 텍스처: DOM 과 같은 타이포를 캔버스로 그려 올림 (WebGL 켜지면 DOM 텍스트는 숨김) ----
  var textTex = gl.createTexture();
  function makeTextTex(){
    // 캔버스 실제 픽셀 해상도로 그려야 확대 없이 선명함 (고정 저해상도로 그리면 글자가 뭉개짐)
    var w = Math.max(640, Math.min(canvas.width || 1280, 2560));
    var h = Math.max(2, Math.round(w * host.clientHeight / Math.max(1, host.clientWidth)));
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.clearRect(0, 0, w, h);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    var namePx = Math.min(w * 0.105, h * 0.26);
    x.font = '800 ' + namePx + "px 'Pretendard', sans-serif";
    x.fillText('PORTFOLIO', w/2, h * 0.465);
    var subPx = Math.max(12, namePx * 0.115);
    try{ x.letterSpacing = (subPx * 0.42) + 'px'; }catch(e){}
    x.font = '600 ' + subPx + "px 'Pretendard', sans-serif";
    x.globalAlpha = 0.74;
    x.fillText('GAHYUN KYOUNG · WEB DESIGNER & PUBLISHER', w/2 + subPx*0.21, h * 0.465 + namePx * 0.80);
    x.globalAlpha = 1;
    gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  makeTextTex();
  if(center) center.classList.add('gl-on');   // 캔버스가 글자를 그리므로 DOM 텍스트 숨김(접근성 위해 DOM 은 유지)
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(function(){ makeTextTex(); kick(); }); }

  var dpr = Math.min(devicePixelRatio || 1, innerWidth < 860 ? 1.25 : 1.75);   // 고해상도에서 가장자리·글자 선명하게
  function resize(){
    var w = host.clientWidth, h = host.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
    makeTextTex();
  }
  resize(); addEventListener('resize', function(){ resize(); kick(); });

  // 포인터 틸트(TILT_RANGE 0.5) + 호버 중엔 회전 가속 (링은 중앙 고정)
  var tx = 0, ty = 0, cx = 0, cy = 0, hov = false;
  if(fine && !reduce){
    addEventListener('pointermove', function(e){
      if(e.pointerType && e.pointerType !== 'mouse') return;
      var r = host.getBoundingClientRect();
      if(e.clientY < r.top || e.clientY > r.bottom){ tx = 0; ty = 0; hov = false; kick(); return; }
      hov = true;
      tx = ((e.clientX - r.left) / r.width  - 0.5) * 0.5;
      ty = ((e.clientY - r.top)  / r.height - 0.5) * 0.5;
      kick();
    }, { passive:true });
    document.addEventListener('mouseleave', function(){ tx = 0; ty = 0; hov = false; kick(); });
  }

  var raf = 0, start = performance.now(), last = start;
  var ang = 0, spin = 0.22;                                      // 기본 회전 속도 / 호버 시 가속
  function draw(now){
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    spin += ((hov ? 0.78 : 0.22) - spin) * 0.055;                // 부드럽게 가속·감속
    ang += spin * dt;
    gl.uniform1f(U.time, (now - start) / 1000);
    gl.uniform1f(U.ang, ang);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
    gl.uniform2f(U.tilt, cx, cy);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.uniform1i(U.text, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now){
    raf = 0;
    if(document.hidden || scrollY > innerHeight * 1.2) return;
    draw(now);
    raf = requestAnimationFrame(frame);
  }
  function kick(){ if(!raf && !reduce) raf = requestAnimationFrame(frame); }
  if(reduce){ draw(performance.now()); }
  else{
    kick();
    addEventListener('scroll', kick, { passive:true });
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) kick(); });
  }
};
try{ window.initHeroSpace(); }catch(e){}
