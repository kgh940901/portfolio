// ===== HERO — 밝은 배경 위를 흐르는 블루·라벤더 빛 (WebGL 단일 쿼드) =====
// 레퍼런스에서 실측한 동작: 커서 위치에 따라 빛의 중심이 이동(즉시가 아니라 지연 추종),
// 멈추면 서서히 안정, 영역을 벗어나도 튀지 않음. 터치/무마우스 기기는 느린 자동 드리프트.
// prefers-reduced-motion: 정적인 한 프레임만 렌더.
window.initHeroSpace = function(){
  var host = document.getElementById('heroSpace');
  if(!host) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.createElement('canvas');
  host.appendChild(canvas);
  var gl = canvas.getContext('webgl', { antialias:false, alpha:false, powerPreference:'low-power' });
  if(!gl){ return; }   // 폴백: .hero 의 CSS 그라데이션이 그대로 보임

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uT; uniform vec2 uM;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }',
    'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }',
    'float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }',
    // 경계가 선명한 원이 아닌, fbm 으로 가장자리를 흔든 부드러운 빛 덩어리
    'float blob(vec2 q, vec2 c, float r, float t){',
    '  vec2 d = q - c;',
    '  d += .26 * vec2(fbm(q*1.6 + t*.05) - .5, fbm(q*1.6 - t*.04 + 7.) - .5);',
    '  return smoothstep(r, 0., length(d));',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float aspect = uRes.x / uRes.y;',
    '  vec2 q = (uv - .5) * vec2(aspect, 1.);',
    '  vec2 m = (uM - .5) * vec2(aspect, 1.);',
    '  float t = uT;',
    // 화이트 → 아주 옅은 쿨그레이
    '  vec3 base = mix(vec3(.988,.990,.996), vec3(.958,.964,.982), uv.y);',
    '  vec3 col = base;',
    // 빛 중심 3개: 마우스를 서로 다른 비율로 따라오며 자체 드리프트
    '  vec2 c1 = m*.72 + vec2(-.26 + .15*sin(t*.17),  .22 + .11*cos(t*.14));',
    '  vec2 c2 = m*.50 + vec2( .30 + .16*sin(t*.11+2.), .14 + .12*sin(t*.19+1.));',
    '  vec2 c3 = m*.32 + vec2( .02 + .12*cos(t*.09),  .34 + .09*sin(t*.13));',
    '  float b1 = blob(q, c1, .60, t);',
    '  float b2 = blob(q, c2, .70, t + 13.);',
    '  float b3 = blob(q, c3, .52, t + 31.);',
    '  vec3 blue = vec3(.33,.45,1.0);',
    '  vec3 lav  = vec3(.63,.53,.97);',
    '  vec3 sky  = vec3(.56,.72,1.0);',
    '  col = mix(col, blue, b2*.50);',
    '  col = mix(col, lav , b1*.46);',
    '  col = mix(col, sky , b3*.34);',
    '  col = mix(col, blue*.82, b1*b2*.22);',            // 겹치는 곳의 깊이감
    // 가장자리는 흰 배경으로 자연스럽게
    '  float edge = smoothstep(1.05, .42, length(q * vec2(.82, 1.12)));',
    '  col = mix(base, col, edge);',
    // 하단으로 갈수록 본문 배경색으로 옅어짐 (메인→본문 연결)
    '  col = mix(col, vec3(.980,.980,.976), smoothstep(.66, 1.0, 1.-uv.y));',
    // 낮은 강도의 grain
    '  col += (hash(gl_FragCoord.xy + fract(t)) - .5) * .012;',
    '  gl_FragColor = vec4(col, 1.);',
    '}'
  ].join('\n');

  function sh(type, src){
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ return null; }
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if(!vs || !fs){ return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(prog, 'uRes');
  var uT   = gl.getUniformLocation(prog, 'uT');
  var uM   = gl.getUniformLocation(prog, 'uM');

  var isTouch = !matchMedia('(pointer:fine)').matches;
  function resize(){
    var r = host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.1 : 1.5);   // 모바일은 해상도 낮춰 가볍게
    canvas.width = Math.max(2, Math.round(r.width * dpr));
    canvas.height = Math.max(2, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  addEventListener('resize', resize);

  var mx = .5, my = .55, tx = .5, ty = .55, hasMouse = false;
  addEventListener('pointermove', function(e){
    if(e.pointerType && e.pointerType !== 'mouse') return;
    hasMouse = true;
    tx = e.clientX / innerWidth;
    ty = 1 - e.clientY / innerHeight;
  }, { passive:true });

  var visible = true;
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }, { threshold:0 }).observe(host);
  }

  function draw(t){
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, t);
    gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  if(reduced){ draw(10); return; }   // 정적 1프레임

  function frame(now){
    requestAnimationFrame(frame);
    if(!visible) return;             // 화면 밖에서는 그리지 않음
    var t = now * .001;
    if(!hasMouse){                   // 마우스 없는 기기: 약한 자동 움직임
      tx = .5 + .16 * Math.sin(t * .12);
      ty = .55 + .10 * Math.cos(t * .1);
    }
    mx += (tx - mx) * .07;          // 지연 추종 — 멈추면 서서히 안정
    my += (ty - my) * .07;
    draw(t);
  }
  requestAnimationFrame(frame);
};
