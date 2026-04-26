/**
 * logic-path-3d.js
 * Lightweight rotatable "3D" path viewer for generation logic.
 */
(function () {
  const state = {
    latest: null,
    yaw: 0.5,
    pitch: -0.35,
    zoom: 1,
    expanded: false,
    dragging: false,
    lastX: 0,
    lastY: 0
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function buildPoints(payload) {
    const out = [];
    const tone = (payload && payload.context && payload.context.emotionalTone) || "unknown";
    const scale = (payload && payload.context && payload.context.harmonicProfile && payload.context.harmonicProfile.recommendedScale) || "major";
    out.push({ x: 0, y: 0, z: 0, label: "input", value: payload && payload.input ? payload.input : "(none)" });
    out.push({ x: 1, y: 0.7, z: 0.3, label: "emotion", value: tone });
    out.push({ x: 2, y: 0.4, z: -0.2, label: "scale", value: scale });

    const seq = payload && payload.harmony && Array.isArray(payload.harmony.chordSequence)
      ? payload.harmony.chordSequence
      : [];
    if (seq.length) {
      const max = Math.min(seq.length, 8);
      for (let i = 0; i < max; i++) {
        const row = seq[i] || {};
        out.push({
          x: 3 + i * 0.5,
          y: clamp((Number(row.energy) || 0.5) * 1.4 - 0.2, -1.2, 1.2),
          z: ((i % 2) === 0 ? 0.6 : -0.6) + (Number(row.beat) || 0) * 0.1,
          label: `chord ${i + 1}`,
          value: row.chord || "?"
        });
      }
    }

    const notes = payload && payload.melody && Array.isArray(payload.melody.notes) ? payload.melody.notes : [];
    out.push({
      x: 3.5 + Math.min(4, notes.length / 12),
      y: clamp(notes.length / 20, -1.1, 1.1),
      z: 0,
      label: "melody density",
      value: String(notes.length)
    });
    out.push({ x: out[out.length - 1].x + 1, y: 0, z: 0, label: "sheet render", value: "musicGenerated" });
    return out;
  }

  function project(p, cx, cy, scale) {
    const cyaw = Math.cos(state.yaw);
    const syaw = Math.sin(state.yaw);
    const cp = Math.cos(state.pitch);
    const sp = Math.sin(state.pitch);

    const x1 = p.x * cyaw - p.z * syaw;
    const z1 = p.x * syaw + p.z * cyaw;
    const y1 = p.y * cp - z1 * sp;
    const z2 = p.y * sp + z1 * cp;

    const perspective = 1 / (1 + (z2 + 4) * 0.12);
    return {
      x: cx + x1 * scale * perspective * state.zoom,
      y: cy - y1 * scale * perspective * state.zoom,
      depth: z2
    };
  }

  function draw(canvas, payload) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(320, Math.floor(rect.width));
    canvas.height = Math.max(220, Math.floor(rect.height));
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2 + 8;
    const baseScale = Math.min(W, H) * 0.14;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.fillRect(0, 0, W, H);

    const points = buildPoints(payload);
    const projected = points.map((p) => ({ raw: p, p2: project(p, cx, cy, baseScale) }));

    ctx.strokeStyle = "rgba(56,189,248,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    projected.forEach((item, i) => {
      if (i === 0) ctx.moveTo(item.p2.x, item.p2.y);
      else ctx.lineTo(item.p2.x, item.p2.y);
    });
    ctx.stroke();

    projected
      .sort((a, b) => a.p2.depth - b.p2.depth)
      .forEach((item) => {
        ctx.beginPath();
        ctx.fillStyle = "rgba(251,146,60,0.95)";
        ctx.arc(item.p2.x, item.p2.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "11px monospace";
        ctx.fillStyle = "rgba(226,232,240,0.95)";
        ctx.fillText(`${item.raw.label}: ${item.raw.value}`, item.p2.x + 8, item.p2.y - 6);
      });
  }

  function mountViewer() {
    const host = document.getElementById("logic-path-3d-container");
    const btn = document.getElementById("open-logic-path-btn");
    if (!host || !btn) return;

    host.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
        <button id="logic-path-expand-btn" class="btn-icon" type="button">[EXPAND]</button>
        <label style="font-size:11px;color:#bfdbfe;">Yaw <input id="logic-path-yaw" type="range" min="-180" max="180" value="30" style="width:130px;"></label>
        <label style="font-size:11px;color:#bfdbfe;">Pitch <input id="logic-path-pitch" type="range" min="-80" max="80" value="-20" style="width:130px;"></label>
        <label style="font-size:11px;color:#bfdbfe;">Zoom <input id="logic-path-zoom" type="range" min="60" max="180" value="100" style="width:130px;"></label>
      </div>
      <canvas id="logic-path-canvas" style="width:100%;height:240px;border:1px solid rgba(148,163,184,0.25);border-radius:4px;cursor:grab;"></canvas>
    `;

    const canvas = host.querySelector("#logic-path-canvas");
    const yaw = host.querySelector("#logic-path-yaw");
    const pitch = host.querySelector("#logic-path-pitch");
    const zoom = host.querySelector("#logic-path-zoom");
    const expandBtn = host.querySelector("#logic-path-expand-btn");

    const redraw = () => draw(canvas, state.latest);
    redraw();

    yaw.addEventListener("input", () => {
      state.yaw = (Number(yaw.value) * Math.PI) / 180;
      redraw();
    });
    pitch.addEventListener("input", () => {
      state.pitch = (Number(pitch.value) * Math.PI) / 180;
      redraw();
    });
    zoom.addEventListener("input", () => {
      state.zoom = Number(zoom.value) / 100;
      redraw();
    });

    canvas.addEventListener("mousedown", (e) => {
      state.dragging = true;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      canvas.style.cursor = "grabbing";
    });
    window.addEventListener("mouseup", () => {
      state.dragging = false;
      canvas.style.cursor = "grab";
    });
    window.addEventListener("mousemove", (e) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.yaw += dx * 0.01;
      state.pitch = clamp(state.pitch + dy * 0.008, -1.3, 1.3);
      yaw.value = String(Math.round((state.yaw * 180) / Math.PI));
      pitch.value = String(Math.round((state.pitch * 180) / Math.PI));
      redraw();
    });

    expandBtn.addEventListener("click", () => {
      state.expanded = !state.expanded;
      host.style.position = state.expanded ? "fixed" : "";
      host.style.inset = state.expanded ? "8% 8%" : "";
      host.style.zIndex = state.expanded ? "12000" : "";
      host.style.background = state.expanded ? "rgba(2,6,23,0.97)" : "rgba(2,6,23,0.65)";
      const h = state.expanded ? "72vh" : "240px";
      canvas.style.height = h;
      expandBtn.textContent = state.expanded ? "[COLLAPSE]" : "[EXPAND]";
      redraw();
    });

    btn.addEventListener("click", () => {
      host.style.display = host.style.display === "none" ? "block" : "none";
      if (host.style.display !== "none") redraw();
    });

    window.addEventListener("resize", redraw);
  }

  document.addEventListener("musicGenerated", (event) => {
    state.latest = event && event.detail ? event.detail : null;
    const canvas = document.getElementById("logic-path-canvas");
    if (canvas) draw(canvas, state.latest);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountViewer);
  } else {
    mountViewer();
  }
})();
