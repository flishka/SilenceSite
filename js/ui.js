/**
 * Silence External 266 · Smooth UI Controller
 * Scroll effects, count-up animations, magnetic buttons, intersection observer
 */

import { initCanvasAtmosphere } from './canvas.js';

export const ui = {
    init() {
        initCanvasAtmosphere();
        this.initScrollNavbar();
        this.initFadeObserver();
        this.initCountUp();
    },

    initScrollNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 30) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    },

    initFadeObserver() {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

        document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
    },

    initCountUp() {
        const statItems = document.querySelectorAll('.stat-val[data-target]');
        if (statItems.length === 0) return;

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseFloat(el.dataset.target);
                    const suffix = el.dataset.suffix || '';
                    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
                    const duration = 1800; // ms
                    const startTime = performance.now();

                    function update(now) {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // EaseOutExpo
                        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                        const current = (ease * target).toFixed(decimals);

                        el.textContent = current + suffix;

                        if (progress < 1) {
                            requestAnimationFrame(update);
                        } else {
                            el.textContent = target.toFixed(decimals) + suffix;
                        }
                    }

                    requestAnimationFrame(update);
                    obs.unobserve(el);
                }
            });
        }, { threshold: 0.2 });

        statItems.forEach(item => observer.observe(item));
    },

    toast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 9999;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: rgba(10, 10, 11, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid ${type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(125, 211, 252, 0.3)'};
            color: #f2f2f4;
            padding: 12px 22px;
            border-radius: 12px;
            font-size: 0.9rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
            pointer-events: auto;
        `;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ui.init();
});
