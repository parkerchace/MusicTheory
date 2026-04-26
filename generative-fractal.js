/**
 * Generative Fractal Visualizer
 * Creates aesthetic, semantic-driven fractal art for composition logs.
 */
class FractalVisualizer {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.options = Object.assign({
            mood: 'calm',
            energy: 0.5,
            intensity: 0.5,
            arcShape: 'flat',
            seed: 123
        }, options);

        this.palette = this.getPalette(this.options.mood);
        this.isAnimating = false;
        this.startTime = Date.now();
    }

    getPalette(mood) {
        const palettes = {
            dark: ['#0f172a', '#1e1b4b', '#4c1d95', '#7c3aed'],
            joyful: ['#fef3c7', '#fbbf24', '#f59e0b', '#06b6d4'],
            hopeful: ['#ecfdf5', '#10b981', '#059669', '#3b82f6'],
            dreamy: ['#f5f3ff', '#a78bfa', '#8b5cf6', '#c084fc'],
            sad: ['#f8fafc', '#94a3b8', '#475569', '#1e293b'],
            calm: ['#f0fdfa', '#5eead4', '#2dd4bf', '#0d9488'],
            intense: ['#fff1f2', '#fda4af', '#f43f5e', '#be123c'],
            angry: ['#450a0a', '#991b1b', '#dc2626', '#ef4444'],
            mysterious: ['#020617', '#1e1b4b', '#312e81', '#4338ca'],
            playful: ['#f0f9ff', '#7dd3fc', '#0ea5e9', '#f472b6']
        };
        return palettes[mood] || palettes.calm;
    }

    draw() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        
        const energy = this.options.energy;
        const intensity = this.options.intensity;
        const angleOffset = (Math.PI / 4) * (1 + energy);
        const maxDepth = Math.floor(4 + energy * 4);
        const branchLength = (height * 0.25) * (0.5 + intensity);

        this.ctx.save();
        this.ctx.translate(centerX, height * 0.85); // Grow from bottom-center
        this.drawBranch(0, branchLength, angleOffset, maxDepth, 1.0);
        this.ctx.restore();
    }

    drawBranch(currentDepth, length, angle, maxDepth, opacity) {
        if (currentDepth > maxDepth) return;

        const p1 = this.palette[currentDepth % this.palette.length];
        this.ctx.strokeStyle = p1;
        this.ctx.lineWidth = Math.max(1, (maxDepth - currentDepth) * 0.8);
        this.ctx.globalAlpha = opacity;

        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, -length);
        this.ctx.stroke();

        this.ctx.translate(0, -length);

        // Branching logic driven by energy
        const branches = this.options.energy > 0.6 ? 3 : 2;
        const nextOpacity = opacity * 0.85;

        for (let i = 0; i < branches; i++) {
            this.ctx.save();
            let branchAngle = angle;
            if (branches === 3) {
                if (i === 0) branchAngle = -angle;
                else if (i === 1) branchAngle = 0;
                else branchAngle = angle;
            } else {
                branchAngle = i === 0 ? -angle : angle;
            }

            // Sub-jitter for "aliveness"
            const jitter = this.isAnimating ? Math.sin(Date.now() / 500 + currentDepth) * 0.05 : 0;
            
            this.ctx.rotate(branchAngle + jitter);
            this.drawBranch(currentDepth + 1, length * 0.75, angle, maxDepth, nextOpacity);
            this.ctx.restore();
        }
    }

    startAnimation() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        const animate = () => {
            if (!this.isAnimating) return;
            this.draw();
            requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        this.isAnimating = false;
    }
}

window.FractalVisualizer = FractalVisualizer;
