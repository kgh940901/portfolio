// ===== 히어로 유체 왜곡 배경 (Fuel 레퍼런스의 메인 효과) =====
// 마우스가 지나간 자리의 배경 텍스처가 액체처럼 번지고(smear) 서서히 원래대로 돌아옵니다.
// 구현: 변위(displacement) 필드를 핑퐁 FBO에 유지 → 매 프레임 감쇠 + 커서 속도 방향으로 브러시 추가
//       → 배경 이미지를 변위만큼 밀어 샘플링. WebGL 미지원/모션 최소화/터치 기기는 정적 배경 유지.
window.initHeroFluid = function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if(!matchMedia('(pointer:fine)').matches) return;
  var host = document.getElementById('heroFluid');
  if(!host || host.querySelector('canvas')) return;

  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl', { antialias:false, depth:false, stencil:false, alpha:false });
  if(!gl) return;
  host.appendChild(canvas);

  // ---- 셰이더 ----
  var VS = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }';
  var FS_UPDATE = [
    'precision highp float; varying vec2 vUv;',
    'uniform sampler2D uPrev; uniform vec2 uMouse; uniform vec2 uVel; uniform float uRadius; uniform vec2 uAspect; uniform float uDecay; uniform vec2 uTexel;',
    'void main(){',
    // 4방향 확산 — 변위가 주변으로 스며들어 비단처럼 부드럽게 번짐
    '  vec2 c  = texture2D(uPrev, vUv).rg;',
    '  vec2 n1 = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).rg;',
    '  vec2 n2 = texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).rg;',
    '  vec2 n3 = texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).rg;',
    '  vec2 n4 = texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).rg;',
    '  vec2 d = c * 0.64 + (n1 + n2 + n3 + n4) * 0.09;',
    '  vec2 disp = (d - 0.5) * 2.0;',
    '  disp *= uDecay;',
    '  if(length(disp) < 0.0015) disp = vec2(0.0);',   // 8bit 잔상 방지
    '  vec2 diff = (vUv - uMouse) * uAspect;',
    '  float infl = exp(-dot(diff,diff) / (uRadius*uRadius));',
    '  disp += uVel * infl;',
    '  disp = clamp(disp, vec2(-0.26), vec2(0.26));',
    '  gl_FragColor = vec4(disp*0.5+0.5, 0.0, 1.0);',
    '}'].join('\n');
  var FS_RENDER = [
    'precision highp float; varying vec2 vUv;',
    'uniform sampler2D uDisp; uniform sampler2D uImage; uniform vec2 uCover;',
    'void main(){',
    '  vec2 disp = (texture2D(uDisp, vUv).rg - 0.5) * 2.0;',
    '  vec2 uv = vUv - disp * 0.42;',
    '  vec2 iuv = (uv - 0.5) * uCover + 0.5;',
    '  vec3 col = texture2D(uImage, iuv).rgb;',
    '  col += vec3(min(length(disp), 0.14)) * 0.7;',    // 번진 자리가 은은하게 빛남 (상한으로 과열 방지)
    '  gl_FragColor = vec4(col, 1.0);',
    '}'].join('\n');

  function compile(type, src){
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ return null; }
    return s;
  }
  function program(fsSrc){
    var p = gl.createProgram();
    var v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, fsSrc);
    if(!v || !f) return null;
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if(!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    return p;
  }
  var progU = program(FS_UPDATE), progR = program(FS_RENDER);
  if(!progU || !progR) return;

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  function bindQuad(p){
    var loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  // ---- 변위 필드 텍스처 (가능하면 float — 미지원이면 8bit) ----
  var floatOK = !!(gl.getExtension('OES_texture_float') && gl.getExtension('OES_texture_float_linear'));
  var texType = floatOK ? gl.FLOAT : gl.UNSIGNED_BYTE;
  var SIM_W = 200, SIM_H = 120;
  function makeTarget(){
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIM_W, SIM_H, 0, gl.RGBA, texType, null);
    var f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    return { tex:t, fbo:f, ok:ok };
  }
  var a = makeTarget(), b = makeTarget();
  if(!a.ok || !b.ok){
    if(texType === gl.FLOAT){ texType = gl.UNSIGNED_BYTE; a = makeTarget(); b = makeTarget(); }
    if(!a.ok || !b.ok) return;
  }
  // 변위 0 (0.5 회색) 으로 초기화
  [a, b].forEach(function(t){
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.clearColor(0.5, 0.5, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  });

  // ---- 배경 이미지 ----
  var imgTex = gl.createTexture(), imgW = 1, imgH = 1, imgReady = false;
  var img = new Image();
  img.onload = function(){
    imgW = img.naturalWidth; imgH = img.naturalHeight;
    gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    imgReady = true;
  };
  img.src = 'assets/work-sensemom.jpg';   // 히어로 배경 = 본인 작업물 (어두운 그라디언트는 CSS .hero::before 가 담당)

  // ---- 크기 ----
  var dpr = Math.min(devicePixelRatio || 1, 1.5);
  function resize(){
    var w = host.clientWidth, h = host.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  }
  resize(); addEventListener('resize', resize);

  // ---- 마우스 ----
  var mx = -1, my = -1, lx = -1, ly = -1, vx = 0, vy = 0;
  addEventListener('pointermove', function(e){
    if(e.pointerType && e.pointerType !== 'mouse') return;
    var r = host.getBoundingClientRect();
    if(e.clientY < r.top || e.clientY > r.bottom) return;   // 히어로 밖
    mx = (e.clientX - r.left) / r.width;
    my = 1 - (e.clientY - r.top) / r.height;
  }, { passive:true });

  // ---- 루프 (히어로가 화면에 있을 때만) ----
  var visible = true, raf = 0;
  if(window.IntersectionObserver){
    new IntersectionObserver(function(en){ visible = en[0].isIntersecting; if(visible) kick(); }).observe(host);
  }
  var uU = { prev:gl.getUniformLocation(progU,'uPrev'), mouse:gl.getUniformLocation(progU,'uMouse'),
             vel:gl.getUniformLocation(progU,'uVel'), radius:gl.getUniformLocation(progU,'uRadius'),
             aspect:gl.getUniformLocation(progU,'uAspect'), decay:gl.getUniformLocation(progU,'uDecay'),
             texel:gl.getUniformLocation(progU,'uTexel') };
  var uR = { disp:gl.getUniformLocation(progR,'uDisp'), image:gl.getUniformLocation(progR,'uImage'),
             cover:gl.getUniformLocation(progR,'uCover') };

  function frame(){
    raf = 0;
    // 히어로가 고정(sticky)이라 IntersectionObserver 만으론 부족 — 화면 밖으로 충분히 덮이면 중단
    if(!visible || document.hidden || scrollY > innerHeight * 1.35){ return; }
    // 속도: 이번 프레임 이동량 (부드럽게 따라붙도록 보간)
    if(lx >= 0 && mx >= 0){ vx += ((mx - lx) - vx) * 0.38; vy += ((my - ly) - vy) * 0.38; }   // 속도를 더 완만히 따라가 부드럽게
    lx = mx; ly = my;
    var sp = Math.min(1, Math.hypot(vx, vy) * 22);

    // 1) 변위 업데이트 (핑퐁)
    gl.useProgram(progU); bindQuad(progU);
    gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
    gl.viewport(0, 0, SIM_W, SIM_H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.uniform1i(uU.prev, 0);
    gl.uniform2f(uU.mouse, mx, my);
    gl.uniform2f(uU.vel, vx * 6.5 * sp, vy * 6.5 * sp);
    gl.uniform1f(uU.radius, 0.21);                       // 브러시를 크고 연하게 — 뻑뻑한 느낌 제거
    gl.uniform2f(uU.aspect, canvas.width / canvas.height, 1.0);
    gl.uniform1f(uU.decay, 0.967);
    gl.uniform2f(uU.texel, 1 / SIM_W, 1 / SIM_H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    var t = a; a = b; b = t;

    // 2) 렌더
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(progR); bindQuad(progR);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.uniform1i(uR.disp, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.uniform1i(uR.image, 1);
    // background-size: cover 계산
    var ca = canvas.width / canvas.height, ia = imgW / imgH;
    var sx, sy;
    if(ca > ia){ sx = 1; sy = ia / ca; } else { sx = ca / ia; sy = 1; }
    gl.uniform2f(uR.cover, sx, sy);
    if(imgReady) gl.drawArrays(gl.TRIANGLES, 0, 3);
    kick();
  }
  function kick(){ if(!raf) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) kick(); });
  addEventListener('scroll', kick, { passive:true });   // 위로 되돌아오면 재개
  kick();
};
// 섹션이 이미 조립된 뒤에 로드된 경우를 대비해 한 번 시도 (initSite 에서도 호출함)
try{ window.initHeroFluid(); }catch(e){}
