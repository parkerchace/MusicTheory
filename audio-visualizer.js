(function(global){
  class AudioVisualizer {
    constructor(){
      this.overlay = null;
      this.canvas = null;
      this.ctx = null;
      this.audioCtx = null;
      this.analyser = null;
      this.source = null;
      this.mediaStream = null;
      this.animId = null;
      this.mode = 'bars'; // 'bars' | 'waves'
      this.gradient = null;
      this.onResize = this.onResize.bind(this);
    }

    async open(){
      if (!this.overlay){ this.buildOverlay(); }
      this.overlay.style.display = 'flex';
      this.requestFullscreen();
      await this.startMic();
      this.draw();
    }

    async startMic(){
      if (this.mediaStream) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.mediaStream = stream;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.source = this.audioCtx.createMediaStreamSource(stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        this.source.connect(this.analyser);
      } catch (err) {
        console.error('Mic permission or setup failed:', err);
        this.close();
      }
    }

    stopMic(){
      if (this.animId){ cancelAnimationFrame(this.animId); this.animId = null; }
      if (this.mediaStream){ this.mediaStream.getTracks().forEach(t => t.stop()); this.mediaStream = null; }
      if (this.source){ try{ this.source.disconnect(); }catch(e){} this.source = null; }
      if (this.analyser){ try{ this.analyser.disconnect(); }catch(e){} this.analyser = null; }
      if (this.audioCtx){ try{ this.audioCtx.close(); }catch(e){} this.audioCtx = null; }
    }

    close(){
      this.stopMic();
      if (this.overlay){ this.overlay.style.display = 'none'; }
    }

    buildOverlay(){
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '9999';

      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      overlay.appendChild(canvas);

      const ui = document.createElement('div');
      ui.style.position = 'absolute';
      ui.style.top = '12px';
      ui.style.left = '12px';
      ui.style.display = 'flex';
      ui.style.gap = '8px';

      const btnClose = document.createElement('button');
      btnClose.textContent = 'Close';
      btnClose.style.padding = '6px 10px';
      btnClose.style.borderRadius = '6px';
      btnClose.style.border = '1px solid #334155';
      btnClose.style.background = '#0b1220';
      btnClose.style.color = '#e2e8f0';
      btnClose.onclick = () => this.close();

      const btnMode = document.createElement('button');
      btnMode.textContent = 'Mode: Bars';
      btnMode.style.padding = '6px 10px';
      btnMode.style.borderRadius = '6px';
      btnMode.style.border = '1px solid #334155';
      btnMode.style.background = '#0b1220';
      btnMode.style.color = '#e2e8f0';
      btnMode.onclick = () => {
        this.mode = this.mode === 'bars' ? 'waves' : 'bars';
        btnMode.textContent = `Mode: ${this.mode.charAt(0).toUpperCase()+this.mode.slice(1)}`;
      };

      ui.appendChild(btnClose);
      ui.appendChild(btnMode);
      overlay.appendChild(ui);

      document.body.appendChild(overlay);

      this.overlay = overlay;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.updateCanvasSize();
      window.addEventListener('resize', this.onResize);
    }

    requestFullscreen(){
      const el = this.overlay;
      if (!el) return;
      const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (fn) { try{ fn.call(el); }catch(e){} }
    }

    onResize(){ this.updateCanvasSize(); }

    updateCanvasSize(){
      if (!this.canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = this.overlay.getBoundingClientRect();
      this.canvas.width = Math.floor(rect.width * dpr);
      this.canvas.height = Math.floor(rect.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.buildGradient(rect.width, rect.height);
    }

    buildGradient(w, h){
      const g = this.ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, '#0ea5e9');
      g.addColorStop(0.5, '#22c55e');
      g.addColorStop(1, '#eab308');
      this.gradient = g;
    }

    draw(){
      if (!this.overlay || this.overlay.style.display === 'none'){ return; }
      const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1); const h = this.canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      if (!this.analyser){ this.animId = requestAnimationFrame(() => this.draw()); return; }

      if (this.mode === 'bars') this.drawBars(w, h); else this.drawWaves(w, h);

      this.animId = requestAnimationFrame(() => this.draw());
    }

    drawBars(w, h){
      const bufferLen = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLen);
      this.analyser.getByteFrequencyData(dataArray);
      const barCount = Math.min(96, bufferLen);
      const barWidth = (w / barCount) * 0.8;
      const gap = (w / barCount) * 0.2;
      for (let i=0;i<barCount;i++){
        const v = dataArray[i] / 255;
        const barH = v * (h * 0.9);
        const x = i * (barWidth + gap) + gap*0.5;
        const y = h - barH;
        this.ctx.fillStyle = this.gradient;
        this.ctx.fillRect(x, y, barWidth, barH);
        // glow
        this.ctx.shadowColor = 'rgba(56,189,248,0.35)';
        this.ctx.shadowBlur = 12;
      }
      // simple XP-like center blur
      this.ctx.fillStyle = 'rgba(255,255,255,0.03)';
      this.ctx.beginPath(); this.ctx.arc(w/2, h/2, Math.min(w,h)*0.3, 0, Math.PI*2); this.ctx.fill();
    }

    drawWaves(w, h){
      const bufferLen = this.analyser.fftSize;
      const dataArray = new Uint8Array(bufferLen);
      this.analyser.getByteTimeDomainData(dataArray);
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = this.gradient;
      this.ctx.beginPath();
      const slice = w / bufferLen;
      for (let i=0;i<bufferLen;i++){
        const v = (dataArray[i] - 128) / 128;
        const y = h/2 + v * (h * 0.35);
        const x = i * slice;
        if (i===0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
      // base glow
      this.ctx.shadowColor = 'rgba(99,102,241,0.4)';
      this.ctx.shadowBlur = 16;
    }
  }

  if (typeof module !== 'undefined' && module.exports){ module.exports = AudioVisualizer; }
  if (typeof window !== 'undefined'){ window.AudioVisualizer = AudioVisualizer; }
})(this);
