/**
 * Silence External 266 · UI Controller
 * Theme switcher, ripples, lightbox, accordion, scroll effects, burger navigation
 */

export const ui = {
    // 1. Initialize Theme (Dark / Light)
    initTheme() {
        const savedTheme = localStorage.getItem('silence_theme') || 'dark';
        this.setTheme(savedTheme);

        const toggleBtns = document.querySelectorAll('.theme-toggle');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme') || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                this.setTheme(next);
            });
        });
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('silence_theme', theme);
        
        // Update icons
        const icons = document.querySelectorAll('.theme-toggle');
        icons.forEach(btn => {
            btn.innerHTML = theme === 'dark'
                ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
                : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        });
    },

    // 2. Button Ripple Effect
    initRipples() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn');
            if (!btn) return;

            const rect = btn.getBoundingClientRect();
            const circle = document.createElement('span');
            circle.classList.add('ripple');

            const size = Math.max(rect.width, rect.height);
            circle.style.width = circle.style.height = `${size}px`;
            circle.style.left = `${e.clientX - rect.left - size / 2}px`;
            circle.style.top = `${e.clientY - rect.top - size / 2}px`;

            btn.appendChild(circle);
            setTimeout(() => circle.remove(), 600);
        });
    },

    // 3. Sticky Navbar Blur & Shrink on Scroll
    initNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Mobile Burger
        const burger = document.querySelector('.burger');
        const navLinks = document.querySelector('.nav-links');
        if (burger && navLinks) {
            burger.addEventListener('click', () => {
                navLinks.classList.toggle('open');
            });
            // Close when clicking a link
            navLinks.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => navLinks.classList.remove('open'));
            });
        }
    },

    // 4. Scroll Fade-in Observer
    initScrollObserver() {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
    },

    // 5. Lightbox Modal Gallery
    initLightbox() {
        let currentIdx = 0;
        let images = [];

        // Build Lightbox DOM if not present
        if (!document.getElementById('global-lightbox')) {
            const lb = document.createElement('div');
            lb.id = 'global-lightbox';
            lb.className = 'lightbox';
            lb.innerHTML = `
                <div class="lightbox-content">
                    <button class="lightbox-close" aria-label="Close">&times;</button>
                    <button class="lightbox-nav lightbox-prev" aria-label="Previous">&larr;</button>
                    <img class="lightbox-img" src="" alt="Media Preview" />
                    <button class="lightbox-nav lightbox-next" aria-label="Next">&rarr;</button>
                </div>
            `;
            document.body.appendChild(lb);
        }

        const lbEl = document.getElementById('global-lightbox');
        const imgEl = lbEl.querySelector('.lightbox-img');
        const closeBtn = lbEl.querySelector('.lightbox-close');
        const prevBtn = lbEl.querySelector('.lightbox-prev');
        const nextBtn = lbEl.querySelector('.lightbox-next');

        const updateImage = () => {
            if (images[currentIdx]) {
                imgEl.src = images[currentIdx];
            }
        };

        const closeLightbox = () => {
            lbEl.classList.remove('active');
        };

        closeBtn.addEventListener('click', closeLightbox);
        lbEl.addEventListener('click', (e) => {
            if (e.target === lbEl) closeLightbox();
        });

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentIdx = (currentIdx - 1 + images.length) % images.length;
            updateImage();
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentIdx = (currentIdx + 1) % images.length;
            updateImage();
        });

        document.addEventListener('keydown', (e) => {
            if (!lbEl.classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prevBtn.click();
            if (e.key === 'ArrowRight') nextBtn.click();
        });

        // Delegate media card clicks
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.media-card');
            if (!card) return;
            const allCards = Array.from(document.querySelectorAll('.media-card'));
            images = allCards.map(c => c.dataset.src || c.querySelector('img')?.src);
            currentIdx = allCards.indexOf(card);
            if (currentIdx !== -1) {
                updateImage();
                lbEl.classList.add('active');
            }
        });
    },

    // 6. Accordion
    initAccordion() {
        document.addEventListener('click', (e) => {
            const header = e.target.closest('.accordion-header');
            if (!header) return;
            const item = header.closest('.accordion-item');
            if (!item) return;

            const isAlreadyActive = item.classList.contains('active');
            
            // Optional: close other items
            const parent = item.parentElement;
            if (parent) {
                parent.querySelectorAll('.accordion-item').forEach(other => {
                    if (other !== item) other.classList.remove('active');
                });
            }

            item.classList.toggle('active', !isAlreadyActive);
        });
    },

    // 7. Toast Notification
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
            background: var(--surface);
            border: 1px solid ${type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : 'var(--accent)'};
            color: var(--text-heading);
            padding: 12px 20px;
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
            box-shadow: var(--shadow);
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
            display: flex;
            align-items: center;
            gap: 10px;
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
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

// Auto-run common UI enhancements on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ui.initTheme();
    ui.initRipples();
    ui.initNavbar();
    ui.initScrollObserver();
    ui.initLightbox();
    ui.initAccordion();
});

