(function(){
  'use strict';
  var root = document.documentElement;
  var THEME = {"shadeA": "#0a4f9c", "shadeB": "#020b1a", "glow0": "rgba(3,149,252,.65)", "glow1": "rgba(2,110,230,.22)", "glow2": "rgba(0,60,160,0)", "ring": "#5ab4ff", "ring2": "#0395fc", "shard": "#4aa8ff", "arc": "#9fd2ff", "p0": "rgba(190,225,255,1)", "p1": "rgba(60,160,255,.7)", "p2": "rgba(0,80,200,0)"};
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* scroll reveal */
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, {threshold:.15});
    els.forEach(function(el){ rio.observe(el); });
  } else { els.forEach(function(el){ el.classList.add('in'); }); }

  /* 3D hero */
  var host = document.getElementById('stage');
  if (!host) return;
  var hero = host.parentNode;
  if (!window.THREE) { root.classList.add('no3d'); return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'});
  } catch (err) { root.classList.add('no3d'); return; }

  var mobile = Math.min(screen.width, screen.height) < 700 || /Mobi|Android/i.test(navigator.userAgent);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  var m = [null, 'assets/logo.webp'];

  function col(hex){ return new THREE.Color(hex).convertSRGBToLinear(); }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  var rig = new THREE.Group();   // everything that tilts with the pointer
  scene.add(rig);

  var LOGO_H = 3.6, LOGO_W = LOGO_H * 651 / 1100;
  var arcs = [], shards = [], parts, partData, ring, ring2, logoGroup, glow;

  function soft(size, stops){
    var c = document.createElement('canvas'); c.width = c.height = size;
    var g = c.getContext('2d'), r = size/2;
    var gr = g.createRadialGradient(r,r,0,r,r,r);
    stops.forEach(function(s){ gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0,0,size,size);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }

  /* any failure in the 3D code drops back to the flat glowing logo, never a blank hero */
  function fail(err){
    try { stop(); } catch (e2) {}
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    root.classList.add('no3d');
    if (window.console) console.warn('3D hero disabled', err);
  }
  function build(tex){
    try { buildScene(tex); } catch (err) { fail(err); }
  }
  function buildScene(tex){
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    /* extruded logo: a stack of the same cut-out plane, darkening toward the back */
    logoGroup = new THREE.Group();
    var N = mobile ? 10 : 16, step = 0.032, geo = new THREE.PlaneGeometry(LOGO_W, LOGO_H);
    for (var i = N; i >= 0; i--){
      var t = i / N;
      var tint = i === 0 ? new THREE.Color(1,1,1) : col(THEME.shadeA).lerp(col(THEME.shadeB), t);
      var mat = new THREE.MeshBasicMaterial({map:tex, transparent:true, alphaTest:.5, color:tint});
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = -i * step;
      logoGroup.add(mesh);
    }
    logoGroup.position.z = N * step * 0.5;
    rig.add(logoGroup);

    /* glow behind the logo */
    glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: soft(256, [[0,THEME.glow0],[.4,THEME.glow1],[1,THEME.glow2]]),
      blending: THREE.AdditiveBlending, depthWrite:false, transparent:true }));
    glow.scale.set(9.5, 9.5, 1); glow.position.z = -1.2;
    rig.add(glow);

    /* halo rings */
    ring = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.014, 8, 220),
      new THREE.MeshBasicMaterial({color: col(THEME.ring)}));
    ring.rotation.set(1.18, 0.25, 0);
    rig.add(ring);
    ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.07, 8, 220),
      new THREE.MeshBasicMaterial({color: col(THEME.ring2), transparent:true, opacity:.16, blending:THREE.AdditiveBlending, depthWrite:false}));
    ring2.rotation.copy(ring.rotation);
    rig.add(ring2);

    /* floating wire shards */
    var SC = mobile ? 7 : 15;
    for (var s = 0; s < SC; s++){
      var sg = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.1 + Math.random()*0.16));
      var sm = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({color: col(THEME.shard), transparent:true, opacity:.35 + Math.random()*.4}));
      var ang = Math.random()*Math.PI*2, rad = 2.6 + Math.random()*2.6;
      sm.position.set(Math.cos(ang)*rad, Math.sin(ang)*rad*0.9, -1.2 + Math.random()*2.6);
      shards.push({o:sm, rx:(Math.random()-.5)*.02, ry:(Math.random()-.5)*.02, ph:Math.random()*6.28, sp:.4+Math.random()*.6, y0:sm.position.y});
      rig.add(sm);
    }

    /* lightning arcs around the logo */
    var AC = mobile ? 2 : 3, PN = 14;
    for (var a = 0; a < AC; a++){
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PN*3), 3));
      var line = new THREE.Line(g, new THREE.LineBasicMaterial({color: col(THEME.arc), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false}));
      line.frustumCulled = false;
      arcs.push({line:line, n:PN, next:Math.random()*2, life:0});
      rig.add(line);
    }

    /* drifting particles (outside the tilt rig so they parallax separately) */
    var PC = mobile ? 260 : 620;
    var pos = new Float32Array(PC*3); partData = [];
    for (var p = 0; p < PC; p++){
      pos[p*3] = (Math.random()-.5)*16; pos[p*3+1] = (Math.random()-.5)*9; pos[p*3+2] = -4 + Math.random()*7;
      partData.push(.15 + Math.random()*.45);
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    parts = new THREE.Points(pg, new THREE.PointsMaterial({
      size: mobile ? .09 : .075, map: soft(64, [[0,THEME.p0],[.35,THEME.p1],[1,THEME.p2]]),
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.85 }));
    scene.add(parts);

    ready = true;               /* only now is it safe to draw */
    layout();
    start();
  }

  function arcUpdate(a){
    var arr = a.line.geometry.attributes.position.array;
    var base = Math.random()*Math.PI*2, r0 = 2.2 + Math.random()*.7, span = .5 + Math.random()*.9;
    for (var i = 0; i < a.n; i++){
      var u = i/(a.n-1), ang = base + u*span, j = (i>0 && i<a.n-1) ? 1 : 0;
      var r = r0 + (Math.random()-.5)*.35*j;
      arr[i*3]   = Math.cos(ang)*r;
      arr[i*3+1] = Math.sin(ang)*r*.92;
      arr[i*3+2] = (Math.random()-.5)*.5*j;
    }
    a.line.geometry.attributes.position.needsUpdate = true;
  }

  /* sizing */
  function layout(){
    if (!logoGroup) return;
    var w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    var vh = 2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z, vw = vh*camera.aspect;
    if (camera.aspect < 1.05){            /* portrait: fit the logo between the menu and the headline */
      var copy = hero.querySelector('.hero-copy .in');
      var topPx = 78;
      var botPx = copy ? copy.getBoundingClientRect().top - hero.getBoundingClientRect().top - 14 : h*.5;
      var availPx = Math.max(150, botPx - topPx);
      var wpp = vh / h;                   /* world units per screen pixel */
      var s = Math.max(.34, Math.min(.95, availPx*wpp/(LOGO_H*1.1), vw/3.4));
      rig.scale.setScalar(s);
      rig.position.set(0, (h/2 - (topPx + availPx/2)) * wpp, 0);
    } else {                              /* landscape: logo on the right */
      var s2 = Math.min(1.05, vh/6.2);
      rig.scale.setScalar(s2);
      rig.position.set(vw*.24, vh*.02, 0);
    }
    base.x = rig.position.x; base.y = rig.position.y;
    if (!running) { try { draw(0); } catch (err) { fail(err); } }
  }
  var base = {x:0, y:0};

  /* pointer tilt */
  var px = 0, py = 0;
  window.addEventListener('pointermove', function(e){
    px = (e.clientX / window.innerWidth - .5) * 2;
    py = (e.clientY / window.innerHeight - .5) * 2;
  }, {passive:true});

  /* render loop */
  var ready = false, running = false, raf = 0, inView = true, t0 = performance.now(), last = t0;
  function draw(t){
    var dy = Math.sin(t*.5)*.12, dx = Math.cos(t*.4)*.04;
    if (!reduce){
      rig.rotation.y += ((px*.5 + dy) - rig.rotation.y) * .06;
      rig.rotation.x += ((py*.28 + dx) - rig.rotation.x) * .06;
    }
    logoGroup.position.y = Math.sin(t*.9)*.07;
    ring.rotation.z = t*.25; ring2.rotation.z = t*.25;
    glow.material.opacity = .85 + Math.sin(t*1.3)*.15;

    shards.forEach(function(s){
      s.o.rotation.x += s.rx; s.o.rotation.y += s.ry;
      s.o.position.y = s.y0 + Math.sin(t*s.sp + s.ph)*.25;
    });

    arcs.forEach(function(a){
      if (t > a.next){ arcUpdate(a); a.life = .06 + Math.random()*.12; a.next = t + a.life + .35 + Math.random()*1.6; a.on = t + a.life; }
      a.line.material.opacity = t < (a.on||0) ? .55 + Math.random()*.45 : 0;
    });

    var arr = parts.geometry.attributes.position.array;
    for (var i = 0; i < partData.length; i++){
      arr[i*3+1] += partData[i]*.006;
      if (arr[i*3+1] > 4.6) arr[i*3+1] = -4.6;
    }
    parts.geometry.attributes.position.needsUpdate = true;
    parts.rotation.y = rig.rotation.y*.35;

    /* ease the logo away as the page scrolls */
    var sc = Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight));
    rig.position.y = base.y + sc*1.2;

    renderer.render(scene, camera);
  }
  function loop(now){
    raf = requestAnimationFrame(loop);
    try { draw((now - t0)/1000); } catch (err) { fail(err); }
  }
  function start(){
    if (!ready) return;
    if (reduce){ draw(0); return; }
    if (running || !inView || document.hidden) return;
    running = true; raf = requestAnimationFrame(loop);
  }
  function stop(){ running = false; cancelAnimationFrame(raf); }

  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      inView = es[0].isIntersecting; inView ? start() : stop();
    }, {threshold:0}).observe(hero);
  }
  document.addEventListener('visibilitychange', function(){ document.hidden ? stop() : start(); });
  var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(layout, 80); });
  window.addEventListener('load', function(){ layout(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ layout(); });

  /* a lost GPU context should fall back to the flat logo instead of a blank hero */
  renderer.domElement.addEventListener('webglcontextlost', function(e){ e.preventDefault(); stop(); root.classList.add('no3d'); });

  new THREE.TextureLoader().load(m[1], build, undefined, function(){ root.classList.add('no3d'); });
})();