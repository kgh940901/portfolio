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
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float aspect = uRes.x / uRes.y;',
    '  vec2 q = (uv - .5) * vec2(aspect, 1.);',
    '  vec2 m = (uM - .5) * vec2(aspect, 1.);',
    '  float t = uT;',
    // 화이트 → 아주 옅은 쿨그레이
    '  vec3 base = mix(vec3(.988,.990,.996), vec3(.958,.964,.982), uv.y);',
    '  vec3 col = base;',
    // ── 빛의 흐름 — 색 덩어리의 평행이동이 아니라, 도메인 워프된 노이즈 필드가
    //    계속 재편되며 빛의 굴곡·폭·밝기 분포가 흐름. 서로 다른 방향의 두 흐름(블루/라벤더)이
    //    겹치는 지점은 더 깊어지고, 지나간 자리는 흰색으로 옅어짐. 마우스는 샘플 위치에 소량만 가중.
    '  vec2 p = q * vec2(1.10, 1.35);',
    '  float T = t * .36;',                                 // 전체 흐름 속도 — 1~2초 안에 변화가 보이는 기준
    '  vec2 d1 = vec2( .44, .16) * T;',                     // 블루: 좌→우 대각 흐름
    '  vec2 d2 = vec2(-.36, .26) * T;',                     // 라벤더: 반대 방향 — 겹침·분리가 계속 생김
    '  vec2 w1 = vec2(fbm(p + d1),        fbm(p + d1 + 4.7)) - .5;',
    '  vec2 w2 = vec2(fbm(p*1.2 - d2 + 9.2), fbm(p*1.2 - d2 + 2.8)) - .5;',
    '  float f1 = fbm(p*1.05 + 2.2*w1 - d1*.7 + m*.22);',
    '  float f2 = fbm(p*1.20 + 2.0*w2 + d2*.6 + m*.15 + 3.3);',
    // fbm 은 .5 근처에 몰리므로 분포를 증폭 — 빛이 모이는 곳과 흰 여백이 뚜렷이 갈림
    '  f1 = clamp((f1 - .5)*2.6 + .5, 0., 1.);',
    '  f2 = clamp((f2 - .5)*2.6 + .5, 0., 1.);',
    // 넓은 번짐(L)과 밝은 중심(C)의 2단 농도
    '  float L1 = smoothstep(.40, .80, f1);',
    '  float C1 = smoothstep(.60, .95, f1);',
    '  float L2 = smoothstep(.43, .82, f2);',
    '  float C2 = smoothstep(.62, .96, f2);',
    '  vec3 blue = vec3(.33,.45,1.0);',
    '  vec3 lav  = vec3(.63,.53,.97);',
    '  col = mix(col, blue, min(1., L1*.56 + C1*.36));',
    '  col = mix(col, lav , min(1., L2*.48 + C2*.30));',
    '  col = mix(col, vec3(.22,.32,.92), L1*L2*.38);',      // 흐름이 겹치는 곳의 깊이
    // 가장자리는 흰 배경으로 자연스럽게
    '  float edge = smoothstep(1.08, .40, length(q * vec2(.80, 1.10)));',
    '  col = mix(base, col, edge);',
    // 하단으로 갈수록 본문 배경색으로 옅어짐 (타이틀 가독 + 메인→본문 연결)
    '  col = mix(col, vec3(.980,.980,.976), smoothstep(.66, 1.0, 1.-uv.y));',
    // 정적인 미세 grain — 빛이 진한 곳에서 조금 더 느껴지는 고운 입자, 깜빡임 없음
    '  float lum = clamp(L1*.7 + L2*.6, 0., 1.);',
    '  col += (hash(gl_FragCoord.xy) - .5) * (.011 + .026*lum);',
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
  // 포인터가 창을 벗어나면 기본 흐름으로 부드럽게 복귀 (lerp 가 완만하게 되돌림)
  addEventListener('pointerout', function(e){
    if(!e.relatedTarget){ tx = .5; ty = .55; }
  });

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
