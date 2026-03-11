// ── 3D Renderer Module (Three.js) ──
// Accesses globals from app.js: managers, mgrPos, mgrW, mgrH, visibleManagers,
//   isManagerVisible, messages, glowManagers, canvas (for dimensions)

(function () {
  'use strict';

  let threeLoaded = false;
  let scene, camera, webglRenderer, labelRenderer;
  let nodeGroup, lineGroup, msgGroup;
  let nodeMeshes = {};
  let nodeLabels = [];  // CSS2DObject array (for cleanup)
  let msgParticles = [];
  let is3DActive = false;
  let cameraTarget = { x: 0, y: 0, z: 14 };
  let cameraLookAt = { x: 0, y: 0, z: 0 };
  let animFrameId = null;
  let orbitTheta = 0, orbitPhi = 0;
  let isDragging = false, prevMouse = { x: 0, y: 0 };

  const NODE_DEPTH = 0.25;
  const NODE_W = 2.0;
  const NODE_H = 1.0;

  // Convert 2D pixel positions to 3D world coordinates
  function pos2Dto3D(pos) {
    if (!pos) return { x: 0, y: 0, z: 0 };
    // Use canvas dimensions as reference
    var cv = document.getElementById('canvas');
    var cw = cv ? cv.width : 1200;
    var ch = cv ? cv.height : 700;
    var cx = cw / 2;
    var cy = ch / 2;
    // Scale factor: map canvas pixels to world units (~20 units wide)
    var scale = 20 / cw;
    return {
      x: (pos.x - cx) * scale,
      y: -(pos.y - cy) * scale,
      z: 0
    };
  }

  // ── Load Three.js ──
  function loadThreeJS(callback) {
    if (threeLoaded) { callback(); return; }
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/three@0.152.0/build/three.min.js';
    s.onload = function () {
      threeLoaded = true;
      console.log('[3D] Three.js loaded:', THREE.REVISION);
      callback();
    };
    s.onerror = function () {
      console.error('[3D] Failed to load Three.js');
      var btn = document.getElementById('btn-3d');
      if (btn) btn.textContent = '3D (err)';
    };
    document.head.appendChild(s);
  }

  // ── Init Scene ──
  function init3D() {
    var container = document.getElementById('three-container');
    if (!container) { console.error('[3D] No container'); return; }

    // Make sure container is visible for sizing
    container.style.display = 'block';

    // WebGL
    webglRenderer = new THREE.WebGLRenderer({ antialias: true });
    webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    webglRenderer.setClearColor(0x0f172a, 1);
    webglRenderer.domElement.style.width = '100%';
    webglRenderer.domElement.style.height = '100%';
    container.appendChild(webglRenderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.03);

    // Camera
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(0, 0, 14);
    camera.userData.lookAt = { x: 0, y: 0, z: 0 };

    // Lights
    scene.add(new THREE.AmbientLight(0x6080a0, 0.7));
    var dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 8, 12);
    scene.add(dir);
    var pt = new THREE.PointLight(0x60a5fa, 0.5, 40);
    pt.position.set(0, 3, 8);
    scene.add(pt);

    // Grid
    var grid = new THREE.GridHelper(40, 40, 0x1e293b, 0x1e293b);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.5;
    scene.add(grid);

    // Groups
    lineGroup = new THREE.Group(); scene.add(lineGroup);
    nodeGroup = new THREE.Group(); scene.add(nodeGroup);
    msgGroup = new THREE.Group(); scene.add(msgGroup);

    // Interaction
    container.addEventListener('mousedown', function (e) {
      isDragging = true; prevMouse = { x: e.clientX, y: e.clientY };
    });
    container.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      orbitTheta += (e.clientX - prevMouse.x) * 0.004;
      orbitPhi = Math.max(-1.0, Math.min(1.0, orbitPhi + (e.clientY - prevMouse.y) * 0.004));
      prevMouse = { x: e.clientX, y: e.clientY };
    });
    container.addEventListener('mouseup', function () { isDragging = false; });
    container.addEventListener('mouseleave', function () { isDragging = false; });
    container.addEventListener('wheel', function (e) {
      cameraTarget.z = Math.max(4, Math.min(30, cameraTarget.z + (e.deltaY > 0 ? 1.2 : -1.2)));
      e.preventDefault();
    }, { passive: false });

    resize3D();
    window.addEventListener('resize', resize3D);
    console.log('[3D] Scene initialized');
  }

  function resize3D() {
    var container = document.getElementById('three-container');
    if (!container || !webglRenderer) return;
    var w = container.clientWidth || 800;
    var h = container.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(w, h);
  }

  // ── Build 3D Nodes ──
  function buildNodes() {
    // Clear existing nodes
    while (nodeGroup.children.length) {
      var c = nodeGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      nodeGroup.remove(c);
    }
    while (lineGroup.children.length) {
      var l = lineGroup.children[0];
      if (l.geometry) l.geometry.dispose();
      if (l.material) l.material.dispose();
      lineGroup.remove(l);
    }
    // Clear label sprites
    nodeLabels.forEach(function (obj) {
      if (obj.parent) obj.parent.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) { if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
    });
    nodeLabels = [];
    nodeMeshes = {};

    // Shared geometry
    var shape = new THREE.Shape();
    var w2 = NODE_W / 2, h2 = NODE_H / 2, r = 0.12;
    shape.moveTo(-w2 + r, -h2);
    shape.lineTo(w2 - r, -h2);
    shape.quadraticCurveTo(w2, -h2, w2, -h2 + r);
    shape.lineTo(w2, h2 - r);
    shape.quadraticCurveTo(w2, h2, w2 - r, h2);
    shape.lineTo(-w2 + r, h2);
    shape.quadraticCurveTo(-w2, h2, -w2, h2 - r);
    shape.lineTo(-w2, -h2 + r);
    shape.quadraticCurveTo(-w2, -h2, -w2 + r, -h2);

    var extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: NODE_DEPTH, bevelEnabled: true,
      bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2
    });

    var ids = Object.keys(managers);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (!isManagerVisible(id)) continue;
      var mgr = managers[id];
      var pos = mgrPos[id];
      if (!pos) continue;

      var p3 = pos2Dto3D(pos);
      var color = new THREE.Color(mgr.color);

      // Mesh
      var mat = new THREE.MeshPhongMaterial({
        color: color, transparent: true, opacity: 0.88,
        shininess: 80, emissive: color, emissiveIntensity: 0.15
      });
      var mesh = new THREE.Mesh(extrudeGeo, mat.clone());
      mesh.position.set(p3.x, p3.y, 0);
      nodeGroup.add(mesh);
      nodeMeshes[id] = mesh;

      // Text label as sprite
      var sprite = makeTextSprite(mgr.label, mgr.color);
      sprite.position.set(p3.x, p3.y, NODE_DEPTH + 0.2);
      scene.add(sprite);
      nodeLabels.push(sprite);
    }

    buildConnectionLines();
    console.log('[3D] Built', Object.keys(nodeMeshes).length, 'nodes');
  }

  // Create a text sprite (canvas texture)
  function makeTextSprite(text, borderColor) {
    var canvas2 = document.createElement('canvas');
    canvas2.width = 256;
    canvas2.height = 128;
    var ctx2 = canvas2.getContext('2d');

    // Background
    ctx2.fillStyle = 'rgba(15,23,42,0.85)';
    roundRect(ctx2, 4, 4, 248, 120, 12);
    ctx2.fill();
    ctx2.strokeStyle = borderColor;
    ctx2.lineWidth = 3;
    roundRect(ctx2, 4, 4, 248, 120, 12);
    ctx2.stroke();

    // Text
    ctx2.fillStyle = '#ffffff';
    ctx2.font = '600 22px Segoe UI, system-ui, sans-serif';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    var lines = text.split('\n');
    var lineH = 28;
    var startY = 64 - (lines.length - 1) * lineH / 2;
    for (var i = 0; i < lines.length; i++) {
      ctx2.fillText(lines[i], 128, startY + i * lineH);
    }

    var texture = new THREE.CanvasTexture(canvas2);
    texture.minFilter = THREE.LinearFilter;
    var spriteMat = new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: false
    });
    var sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(NODE_W * 1.1, NODE_H * 1.1, 1);
    return sprite;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function buildConnectionLines() {
    var evPos = mgrPos.ev;
    if (!evPos) return;
    var evP3 = pos2Dto3D(evPos);

    // EV to inner managers
    var ids = Object.keys(managers);
    var skip = ['ev', 'plc', 'pgsql', 'kafka', 'pred_maint', 'claude_app', 'anthropic', 'mqtt_broker', 'uns_mes', 'uns_hist'];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (skip.indexOf(id) >= 0) continue;
      if (!isManagerVisible(id)) continue;
      var pos = mgrPos[id];
      if (!pos) continue;
      addLine3D(evP3, pos2Dto3D(pos), 0x60a5fa, 0.25);
    }

    // Named connections
    var pairs = [
      ['driver', 'plc', 0x94a3b8], ['nga', 'pgsql', 0x336791],
      ['js_mgr', 'kafka', 0x06b6d4], ['kafka', 'pred_maint', 0x14b8a6],
      ['mcp_server', 'claude_app', 0xd946ef], ['claude_app', 'anthropic', 0xd946ef],
      ['mqtt_pub', 'mqtt_broker', 0x22d3ee], ['mqtt_broker', 'uns_mes', 0x84cc16],
      ['mqtt_broker', 'uns_hist', 0x84cc16], ['ev', 'mcp_server', 0xa855f7],
      ['ev', 'mqtt_pub', 0x22d3ee], ['nga', 'dm', 0x8b5cf6]
    ];
    for (var j = 0; j < pairs.length; j++) {
      var a = pairs[j][0], b = pairs[j][1], c = pairs[j][2];
      if (!isManagerVisible(a) || !isManagerVisible(b)) continue;
      if (!mgrPos[a] || !mgrPos[b]) continue;
      addLine3D(pos2Dto3D(mgrPos[a]), pos2Dto3D(mgrPos[b]), c, 0.35);
    }
  }

  function addLine3D(from, to, color, opacity) {
    var mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity });
    var pts = [new THREE.Vector3(from.x, from.y, -0.1), new THREE.Vector3(to.x, to.y, -0.1)];
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    lineGroup.add(new THREE.Line(geo, mat));
  }

  // ── Message Particles ──
  function updateMessages3D() {
    var activeMessages = (typeof messages !== 'undefined') ? messages : [];

    // Clean finished
    for (var i = msgParticles.length - 1; i >= 0; i--) {
      var p = msgParticles[i];
      if (!activeMessages.includes(p.msgRef)) {
        msgGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        msgParticles.splice(i, 1);
      }
    }

    for (var j = 0; j < activeMessages.length; j++) {
      var msg = activeMessages[j];
      if (!mgrPos[msg.from] || !mgrPos[msg.to]) continue;
      var f3 = pos2Dto3D(mgrPos[msg.from]);
      var t3 = pos2Dto3D(mgrPos[msg.to]);

      var particle = null;
      for (var k = 0; k < msgParticles.length; k++) {
        if (msgParticles[k].msgRef === msg) { particle = msgParticles[k]; break; }
      }

      if (!particle) {
        var geo = new THREE.SphereGeometry(0.1, 10, 10);
        var mColor = new THREE.Color(msg.color);
        var mat = new THREE.MeshBasicMaterial({
          color: mColor, transparent: true, opacity: 0.95
        });
        var mesh = new THREE.Mesh(geo, mat);
        // Glow halo
        var gGeo = new THREE.SphereGeometry(0.22, 8, 8);
        var gMat = new THREE.MeshBasicMaterial({ color: mColor, transparent: true, opacity: 0.3 });
        mesh.add(new THREE.Mesh(gGeo, gMat));
        msgGroup.add(mesh);
        particle = { mesh: mesh, msgRef: msg };
        msgParticles.push(particle);
      }

      var prog = msg.progress || 0;
      particle.mesh.position.set(
        f3.x + (t3.x - f3.x) * prog,
        f3.y + (t3.y - f3.y) * prog,
        Math.sin(prog * Math.PI) * 0.6
      );
    }
  }

  // ── Glow ──
  function updateGlows3D() {
    if (typeof glowManagers === 'undefined') return;
    var ids = Object.keys(nodeMeshes);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var mesh = nodeMeshes[id];
      if (!mesh || !mesh.material) continue;
      if (glowManagers[id]) {
        mesh.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.008) * 0.25;
      } else {
        mesh.material.emissiveIntensity = 0.15;
      }
    }
  }

  // ── Camera ──
  function flyTo3D(managerId) {
    if (!is3DActive) return;
    var pos = mgrPos[managerId];
    if (!pos) return;
    var p3 = pos2Dto3D(pos);
    // Zoom in slightly toward target
    cameraTarget.x = p3.x;
    cameraTarget.y = p3.y;
    cameraTarget.z = Math.min(cameraTarget.z, 12);
    cameraLookAt.x = p3.x;
    cameraLookAt.y = p3.y;
  }

  function updateCamera() {
    var dist = cameraTarget.z;
    var tx = (cameraTarget.x || 0) + dist * Math.sin(orbitTheta) * Math.cos(orbitPhi);
    var ty = (cameraTarget.y || 0) + dist * Math.sin(orbitPhi);
    var tz = dist * Math.cos(orbitTheta) * Math.cos(orbitPhi);

    camera.position.x += (tx - camera.position.x) * 0.05;
    camera.position.y += (ty - camera.position.y) * 0.05;
    camera.position.z += (tz - camera.position.z) * 0.05;

    var look = camera.userData.lookAt;
    look.x += ((cameraLookAt.x || 0) - look.x) * 0.05;
    look.y += ((cameraLookAt.y || 0) - look.y) * 0.05;
    look.z += ((cameraLookAt.z || 0) - look.z) * 0.05;
    camera.lookAt(look.x, look.y, look.z);
  }

  // ── Render Loop ──
  function animate3D() {
    if (!is3DActive) return;
    animFrameId = requestAnimationFrame(animate3D);
    updateCamera();
    updateMessages3D();
    updateGlows3D();
    webglRenderer.render(scene, camera);
  }

  // ── Public API ──
  window.toggle3D = function () {
    var container = document.getElementById('three-container');
    var canvas2d = document.getElementById('canvas');
    var btn = document.getElementById('btn-3d');

    if (!is3DActive) {
      if (!threeLoaded) {
        btn.textContent = '...';
        loadThreeJS(function () {
          init3D();
          buildNodes();
          is3DActive = true;
          canvas2d.style.display = 'none';
          btn.textContent = '2D';
          btn.classList.add('active');
          animate3D();
        });
        return;
      }
      if (!scene) init3D();
      container.style.display = 'block';
      buildNodes();
      is3DActive = true;
      canvas2d.style.display = 'none';
      btn.textContent = '2D';
      btn.classList.add('active');
      resize3D();
      animate3D();
    } else {
      is3DActive = false;
      container.style.display = 'none';
      canvas2d.style.display = 'block';
      btn.textContent = '3D';
      btn.classList.remove('active');
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    }
  };

  window.flyTo3D = flyTo3D;

  window.rebuild3DNodes = function () {
    if (!is3DActive || !scene) return;
    buildNodes();
  };

})();
