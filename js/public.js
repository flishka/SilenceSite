/**
 * Silence External V1.0.0 · Public Page Controller
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

        if (window.ui && window.ui.initScrollObserver) {
            window.ui.initScrollObserver();
        }
    },

    // 3. Changelog / Posts Feed
    async loadPosts(reset = false) {
        const feed = document.getElementById('posts-feed');
        const loadMoreBtn = document.getElementById('posts-load-more');
        if (!feed) return;

        try {
            const posts = await db.getPosts({
                tag: this.currentTag,
                search: this.searchQuery,
                limit: this.postsLimit,
                offset: this.postOffset
            });

            if (!posts || posts.length === 0) {
                if (this.searchQuery) {
                    feed.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);">Посты по вашему запросу не найдены.</div>';
                }
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            if (reset) {
                feed.innerHTML = '';
            }

            const html = posts.map(post => {
                const previewText = post.body.replace(/[#*`>-]/g, '').slice(0, 160) + '...';
                const parsedContent = parseMarkdown(post.body);
                const tagsHtml = (post.tags || []).map(t => `<span class="badge badge-accent">${t}</span>`).join(' ');

                return `
                    <article class="post-card fade-up in-view" data-id="${post.id}">
                        <div class="post-header">
                            <div class="post-meta">
                                <span class="badge font-mono" style="background:rgba(125,211,252,0.12);color:var(--accent-light);border:1px solid rgba(125,211,252,0.3);padding:4px 10px;border-radius:6px;">${post.version}</span>
                                <span class="post-date">${new Date(post.published_at).toLocaleDateString('ru-RU')}</span>
                            </div>
                            <div class="post-tags">
                                ${tagsHtml}
                            </div>
                        </div>
                        <h3 class="post-title">${post.title}</h3>
                        <div class="post-body">
                            ${parsedContent}
                        </div>
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
        } catch (err) {
            console.warn('Posts load error:', err);
        }
    },

    // 4. Access / Download Section Logic
    async checkAccessSection() {
        const guestActions = document.getElementById('access-guest-actions');
        const userActions = document.getElementById('access-user-actions');
        const heroCtaBtn = document.getElementById('hero-cta-btn');

        const current = await auth.getCurrentUser();

        if (current && (current.profile || current.user)) {
            if (guestActions) guestActions.style.display = 'none';
            if (userActions) userActions.style.display = 'block';
            if (heroCtaBtn) {
                heroCtaBtn.setAttribute('href', 'releases/Silence_V1.0.0.zip');
                heroCtaBtn.setAttribute('download', '');
                heroCtaBtn.innerHTML = `<span>Скачать архив V1.0.0</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
            }
        } else {
            if (guestActions) guestActions.style.display = 'flex';
            if (userActions) userActions.style.display = 'none';
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


