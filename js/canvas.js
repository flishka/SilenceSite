/**
 * Silence External V1.0.0 · Canvas Constellation, Particle Drift & Cursor Spotlight
 * 60 FPS, hardware accelerated, subtle and strictly minimal
 */

export function initCanvasAtmosphere() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let mouse = { x: width / 2, y: height / 2, active: false };

    // Resize listener
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // Cursor tracking
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;

        const spotlight = document.querySelector('.cursor-spotlight');
        if (spotlight) {
            spotlight.style.opacity = '1';
            spotlight.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
        }
    });

    window.addEventListener('mouseleave', () => {
        mouse.active = false;
        const spotlight = document.querySelector('.cursor-spotlight');
        if (spotlight) spotlight.style.opacity = '0';
    });

    // Particles pool (35 particles, soft sky blue and white dots)
    const particleCount = 38;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.25 + 0.1
        });
    }

    function render() {
        ctx.clearRect(0, 0, width, height);

        // Update & draw particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(125, 211, 252, ${p.alpha})`;
            ctx.fill();

            // Connect to mouse if close (subtle constellation lines)
            if (mouse.active) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    const lineAlpha = (1 - dist / 150) * 0.05;
                    ctx.strokeStyle = `rgba(125, 211, 252, ${lineAlpha})`;
                    ctx.stroke();
                }
            }

            // Connect adjacent particles
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    const lineAlpha = (1 - dist / 120) * 0.035;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}


