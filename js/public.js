/**
 * Silence External 266 · Public Page Controller
 * Handles live data loading from Supabase: status, changelog, features, roadmap, faq
 */

import { db } from './supabase.js';
import { parseMarkdown } from './markdown.js';
import { auth } from './auth.js';

export const publicPage = {
    currentTag: 'all',
    searchQuery: '',
    postOffset: 0,
    postsLimit: 5,
    allLoaded: false,

    async init() {
        await Promise.all([
            this.loadStatus(),
            this.loadFeatures(),
            this.loadRoadmap(),
            this.loadFAQ(),
            this.loadPosts(true),
            this.loadSettings(),
            this.checkAccessSection()
        ]);

        this.bindEvents();
    },

    // 1. Status Section & Badges
    async loadStatus() {
        const st = await db.getStatus();
        if (!st) return;

        const valLower = st.value.toLowerCase();
        const badgeHtml = `
            <span class="status-dot pulse"></span>
            <span>${st.value}</span>
        `;

        // Update nav status
        const navStatus = document.getElementById('nav-status-badge');
        if (navStatus) {
            navStatus.className = `status-badge ${valLower}`;
            navStatus.innerHTML = badgeHtml;
        }

        // Update hero status
        const heroStatus = document.getElementById('hero-status-badge');
        if (heroStatus) {
            heroStatus.className = `status-badge ${valLower}`;
            heroStatus.innerHTML = badgeHtml;
        }

        // Update detection section box
        const detectBox = document.getElementById('detection-status-display');
        if (detectBox) {
            detectBox.innerHTML = `
                <div class="status-large-indicator status-badge ${valLower}">
                    <span class="status-dot pulse" style="width:14px;height:14px;"></span>
                    <span>${st.value}</span>
                </div>
                <p style="color:var(--text-heading);font-weight:600;font-size:1.1rem;margin-bottom:0.5rem;">
                    Target: ${st.game_version} · Protection: ${st.ac_version}
                </p>
                <p style="color:var(--muted-light);font-size:0.95rem;max-width:480px;margin:0 auto;">
                    ${st.comment}
                </p>
                <div style="margin-top:1.5rem;font-family:var(--font-mono);font-size:0.8rem;color:var(--muted);">
                    Updated: ${new Date(st.updated_at).toLocaleString('ru-RU')}
                </div>
            `;
        }
    },

    // 2. Features Grid
    async loadFeatures() {
        const grid = document.getElementById('features-grid');
        if (!grid) return;

        const features = await db.getFeatures();
        if (!features || features.length === 0) return;

        grid.innerHTML = features.map(feat => `
            <div class="card feature-card fade-up">
                <div class="feature-icon-wrapper">
                    ${feat.icon_svg}
                </div>
                <div class="badge badge-cyan" style="align-self:flex-start;">${feat.category}</div>
                <h3>${feat.title}</h3>
                <p>${feat.description}</p>
            </div>
        `).join('');

        // Re-observe fade-up
        if (window.ui && window.ui.initScrollObserver) {
            window.ui.initScrollObserver();
        }
    },

    // 3. Changelog / Posts Feed
    async loadPosts(reset = false) {
        const feed = document.getElementById('posts-feed');
        const loadMoreBtn = document.getElementById('posts-load-more');
        if (!feed) return;

        if (reset) {
            this.postOffset = 0;
            this.allLoaded = false;
            feed.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Загрузка постов...</div>';
        }

        const posts = await db.getPosts({
            tag: this.currentTag,
            search: this.searchQuery,
            limit: this.postsLimit,
            offset: this.postOffset
        });

        if (reset) {
            feed.innerHTML = '';
        }

        if (posts.length === 0 && this.postOffset === 0) {
            feed.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted);">Посты не найдены.</div>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const html = posts.map(post => {
            const previewText = post.body.replace(/[#*`>-]/g, '').slice(0, 160) + '...';
            const parsedContent = parseMarkdown(post.body);
            const tagsHtml = (post.tags || []).map(t => `<span class="badge badge-accent">${t}</span>`).join(' ');

            return `
                <article class="post-card fade-up" data-id="${post.id}">
                    <div class="post-header">
                        <div class="post-meta">
                            <span class="badge font-mono">${post.version}</span>
                            <span style="font-size:0.85rem;color:var(--muted);">${new Date(post.published_at).toLocaleDateString('ru-RU')}</span>
                            ${tagsHtml}
                        </div>
                    </div>
                    <h3 class="post-title">${post.title}</h3>
                    <p class="post-preview">${previewText}</p>
                    <div class="post-body" id="post-body-${post.id}">
                        ${post.cover_url ? `<img src="${post.cover_url}" style="border-radius:var(--radius-sm);margin-bottom:1rem;" alt="Cover" />` : ''}
                        ${parsedContent}
                    </div>
                    <button class="btn btn-secondary btn-sm toggle-post-btn" style="margin-top:1rem;" data-target="post-body-${post.id}">
                        Читать полностью
                    </button>
                </article>
            `;
        }).join('');

        feed.insertAdjacentHTML('beforeend', html);
        this.postOffset += posts.length;

        if (posts.length < this.postsLimit) {
            this.allLoaded = true;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
            if (loadMoreBtn) loadMoreBtn.style.display = 'inline-flex';
        }
    },

    // 4. Roadmap
    async loadRoadmap() {
        const container = document.getElementById('roadmap-timeline');
        if (!container) return;

        const items = await db.getRoadmap();
        if (!items || items.length === 0) return;

        container.innerHTML = items.map(item => {
            const stateLabel = item.state === 'done' ? 'Completed' : item.state === 'in_progress' ? 'In Progress' : 'Planned';
            return `
                <div class="roadmap-item ${item.state} fade-up">
                    <div class="roadmap-node"></div>
                    <div class="card">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                            <span class="badge ${item.state === 'done' ? 'badge-accent' : 'badge-cyan'}">${stateLabel}</span>
                        </div>
                        <h3>${item.title}</h3>
                        <p style="color:var(--muted-light);font-size:0.95rem;margin-top:0.4rem;">${item.description}</p>
                    </div>
                </div>
            `;
        }).join('');
    },

    // 5. FAQ Accordion
    async loadFAQ() {
        const container = document.getElementById('faq-accordion');
        if (!container) return;

        const faqs = await db.getFAQ();
        if (!faqs || faqs.length === 0) return;

        container.innerHTML = faqs.map((faq, idx) => `
            <div class="accordion-item ${idx === 0 ? 'active' : ''} fade-up">
                <div class="accordion-header">
                    <span>${faq.question}</span>
                    <span class="accordion-icon">+</span>
                </div>
                <div class="accordion-content">
                    <p>${faq.answer}</p>
                </div>
            </div>
        `).join('');
    },

    // 6. Access / Download Section
    async checkAccessSection() {
        const accessContainer = document.getElementById('access-container');
        if (!accessContainer) return;

        const current = await auth.getCurrentUser();
        const settings = await db.getSettings();
        const downloadUrl = settings.download_url || '#';

        if (current) {
            accessContainer.innerHTML = `
                <div class="download-card fade-up">
                    <div class="badge badge-accent" style="margin-bottom:1rem;">Авторизованный доступ</div>
                    <h2>Клиент Silence External 266</h2>
                    <p style="color:var(--muted-light);margin-top:0.5rem;">
                        Привет, <strong style="color:var(--text-heading);">${current.profile.username}</strong>! Ваша сборка готова к инициализации.
                    </p>
                    
                    <div class="checklist">
                        <div class="checklist-item"><span class="checklist-icon">✔</span> Windows 10 / 11 x64</div>
                        <div class="checklist-item"><span class="checklist-icon">✔</span> VT-x / AMD-V включен</div>
                        <div class="checklist-item"><span class="checklist-icon">✔</span> Запуск от имени Администратора</div>
                        <div class="checklist-item"><span class="checklist-icon">✔</span> Скрыт от OBS / Discord</div>
                    </div>

                    <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                        <a href="${downloadUrl}" class="btn btn-primary btn-lg" target="_blank" rel="noopener">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            <span>Скачать клиент (.zip)</span>
                        </a>
                        <a href="me.html" class="btn btn-secondary btn-lg">Личный кабинет</a>
                    </div>
                </div>
            `;
        } else {
            accessContainer.innerHTML = `
                <div class="download-card fade-up">
                    <div class="badge badge-cyan" style="margin-bottom:1rem;">Приватный релиз</div>
                    <h2>Доступ ограничен</h2>
                    <p style="color:var(--muted-light);max-width:520px;margin:0.5rem auto 2rem auto;">
                        Для загрузки клиента Silence 266, получения инструкций и обновлений требуется авторизация в закрытой системе.
                    </p>
                    <div style="display:flex;gap:1rem;justify-content:center;">
                        <a href="login.html" class="btn btn-primary btn-lg">Войти в систему</a>
                        <a href="register.html" class="btn btn-secondary btn-lg">Регистрация</a>
                    </div>
                </div>
            `;
        }
    },

    // 7. Load General Settings
    async loadSettings() {
        const settings = await db.getSettings();
        if (!settings) return;

        if (settings.discord_url) {
            document.querySelectorAll('.link-discord').forEach(el => el.href = settings.discord_url);
        }
        if (settings.telegram_url) {
            document.querySelectorAll('.link-telegram').forEach(el => el.href = settings.telegram_url);
        }
        if (settings.app_version) {
            document.querySelectorAll('.val-app-version').forEach(el => el.textContent = settings.app_version);
        }
    },

    // 8. Event Bindings
    bindEvents() {
        // Tag filters
        const tagBtns = document.querySelectorAll('.filter-btn');
        tagBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tagBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTag = btn.dataset.tag;
                this.loadPosts(true);
            });
        });

        // Search input
        const searchInput = document.getElementById('posts-search');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.searchQuery = e.target.value;
                    this.loadPosts(true);
                }, 300);
            });
        }

        // Load more posts button
        const loadMoreBtn = document.getElementById('posts-load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadPosts(false));
        }

        // Post body expand toggle
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.toggle-post-btn');
            if (!btn) return;

            const targetId = btn.dataset.target;
            const bodyEl = document.getElementById(targetId);
            if (!bodyEl) return;

            const isOpen = bodyEl.classList.contains('open');
            bodyEl.classList.toggle('open', !isOpen);
            btn.textContent = isOpen ? 'Читать полностью' : 'Свернуть';
        });
    }
};

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    publicPage.init();
});

