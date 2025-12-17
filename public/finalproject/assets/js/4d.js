// 4D Tesseract Visualization
(() => {
  function createVertices() {
    const verts = [];
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          for (let w = -1; w <= 1; w += 2) {
            verts.push([x, y, z, w]);
          }
        }
      }
    }
    return verts;
  }

  function makeEdges(verts) {
    const edges = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const a = verts[i];
        const b = verts[j];
        let diff = 0;
        for (let k = 0; k < 4; k++) if (a[k] !== b[k]) diff++;
        if (diff === 1) edges.push([i, j]);
      }
    }
    return edges;
  }

  // rotation in 4D for plane (i,j)
  function rotate4D(vec, i, j, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const out = vec.slice();
    out[i] = vec[i] * c - vec[j] * s;
    out[j] = vec[i] * s + vec[j] * c;
    return out;
  }

  function project4Dto2D(v4, wDist) {
    // perspective 4D -> 3D
    const [x, y, z, w] = v4;
    const wFactor = wDist / (wDist - w);
    const x3 = x * wFactor;
    const y3 = y * wFactor;
    const z3 = z * wFactor;
    // simple 3D -> 2D perspective
    const zDist = 4;
    const zFactor = zDist / (zDist - z3);
    return [x3 * zFactor, y3 * zFactor];
  }

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tesseract');
    const ctx = canvas.getContext('2d');
    const sensitivity = 130;
    function resize() {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const verts = createVertices();
    const edges = makeEdges(verts);

    let angle = 0;
    let last = 0;
    const angleSpeedInput = document.getElementById('angleSpeed');
    let angleSpeed = parseFloat(angleSpeedInput.value || '0.6');
    angleSpeedInput.addEventListener('input', e => angleSpeed = parseFloat(e.target.value));

    const projectionDistanceInput = document.getElementById('wDistance');
    let wDist = parseFloat(projectionDistanceInput.value || '3');
    projectionDistanceInput.addEventListener('input', e => wDist = parseFloat(e.target.value));

    function draw(timestamp) {
      const dt = (timestamp - last) / 1000 || 0.016;
      last = timestamp;
      angle += angleSpeed * dt;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // transform vertices
      const rotated = verts.map(v => {
        let r = v.slice();
        r = rotate4D(r, 0, 3, angle * 0.6); // x-w
        r = rotate4D(r, 1, 2, angle * 0.4); // y-z
        r = rotate4D(r, 0, 1, angle * 0.3); // x-y
        return r;
      });

      const proj = rotated.map(v => project4Dto2D(v, wDist));

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) / sensitivity;

      // draw edges
      ctx.strokeStyle = '#8ee6df';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const [i, j] of edges) {
        const [x1, y1] = proj[i];
        const [x2, y2] = proj[j];
        ctx.moveTo(cx + x1 * scale, cy + y1 * scale);
        ctx.lineTo(cx + x2 * scale, cy + y2 * scale);
      }
      ctx.stroke();

      // vertices
      for (let i = 0; i < proj.length; i++) {
        const [x2, y2] = proj[i];
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.arc(cx + x2 * scale, cy + y2 * scale, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  });

  // print/export button
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('downloadPdf');
    if(btn){ btn.addEventListener('click', ()=>window.print()); }
  });
})();
