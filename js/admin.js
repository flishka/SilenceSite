/**
 * Silence External 266 · Admin Panel Controller
 * Full CRUD, Dashboard, User moderation, Audit log, Settings
 */

import { getSupabase, db } from './supabase.js';
import { parseMarkdown } from './markdown.js';
import { ui } from './ui.js';

export const admin = {
    async init() {
        this.initTabs();
        await this.loadDashboard();
        this.bindEvents();
    },

    // 1. Tab Switching
    initTabs() {
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.dataset.tab;
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                const activeTabEl = document.getElementById(`tab-${targetTab}`);
                if (activeTabEl) {
                    activeTabEl.classList.add('active');
                }

                // Load content on tab select
                if (targetTab === 'dashboard') this.loadDashboard();
                if (targetTab === 'users') this.loadUsers();
                if (targetTab === 'posts') this.loadPosts();
                if (targetTab === 'status') this.loadStatusEditor();
                if (targetTab === 'roadmap') this.loadRoadmap();
                if (targetTab === 'faq') this.loadFAQ();
                if (targetTab === 'features') this.loadFeatures();
                if (targetTab === 'audit') this.loadAuditLog();
                if (targetTab === 'settings') this.loadSettings();
            });
        });
    },

    // 2. Dashboard
    async loadDashboard() {
        const sb = getSupabase();
        if (!sb) return;

        // Counters
        const [{ count: userCount }, { count: postCount }, statusRow] = await Promise.all([
            sb.from('profiles').select('*', { count: 'exact', head: true }),
            sb.from('posts').select('*', { count: 'exact', head: true }),
            db.getStatus()
        ]);

        const elUserCount = document.getElementById('dash-user-count');
        const elPostCount = document.getElementById('dash-post-count');
        const elStatusVal = document.getElementById('dash-status-val');

        if (elUserCount) elUserCount.textContent = userCount || 0;
        if (elPostCount) elPostCount.textContent = postCount || 0;
        if (elStatusVal && statusRow) elStatusVal.textContent = statusRow.value;

        // Chart.js Registrations graph
        this.renderRegistrationsChart();

        // Recent Audit logs
        this.renderRecentAudit();
    },

    async renderRegistrationsChart() {
        const ctx = document.getElementById('regChart');
        if (!ctx || !window.Chart) return;

        const sb = getSupabase();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: profiles } = await sb
            .from('profiles')
            .select('created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        // Aggregate by date
        const counts = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            const key = d.toISOString().split('T')[0];
            counts[key] = 0;
        }

        (profiles || []).forEach(p => {
            const key = p.created_at.split('T')[0];
            if (counts[key] !== undefined) counts[key]++;
        });

        if (window.myRegChart) {
            window.myRegChart.destroy();
        }

        window.myRegChart = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(counts).map(k => k.slice(5)),
                datasets: [{
                    label: 'Новые регистрации',
                    data: Object.values(counts),
                    borderColor: '#7C3AED',
                    backgroundColor: 'rgba(124, 58, 237, 0.15)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6B7280' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6B7280', stepSize: 1 } }
                }
            }
        });
    },

    async renderRecentAudit() {
        const container = document.getElementById('dash-recent-audit');
        if (!container) return;

        const sb = getSupabase();
        const { data: logs } = await sb
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!logs || logs.length === 0) {
            container.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);">Событий аудита пока нет.</td></tr>';
            return;
        }

        container.innerHTML = logs.map(l => `
            <tr>
                <td><strong>${l.actor}</strong></td>
                <td><span class="badge ${l.action === 'DELETE' ? 'badge-danger' : 'badge-accent'}">${l.action}</span></td>
                <td><code>${l.target}</code></td>
                <td style="color:var(--muted);">${new Date(l.created_at).toLocaleTimeString('ru-RU')}</td>
            </tr>
        `).join('');
    },

    // 3. Users Management
    async loadUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        const sb = getSupabase();
        const searchVal = document.getElementById('users-search')?.value.trim() || '';

        let query = sb.from('profiles').select('*').order('created_at', { ascending: false });
        if (searchVal) {
            query = query.or(`username.ilike.%${searchVal}%,email.ilike.%${searchVal}%`);
        }

        const { data: users, error } = await query;
        if (error) {
            ui.toast('Ошибка загрузки пользователей: ' + error.message, 'error');
            return;
        }

        tbody.innerHTML = (users || []).map(u => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:0.6rem;">
                        <img src="${u.avatar_url}" style="width:24px;height:24px;border-radius:50%;" alt="" />
                        <strong>${u.username}</strong>
                    </div>
                </td>
                <td>${u.email || '<span style="color:var(--muted);">нет</span>'}</td>
                <td>
                    <button class="badge ${u.role === 'ADMIN' ? 'badge-accent' : 'badge'}" onclick="window.adminController.toggleRole('${u.id}', '${u.role}')">
                        ${u.role}
                    </button>
                </td>
                <td>
                    <span class="status-badge ${u.banned ? 'down' : 'undetected'}" style="padding:0.2rem 0.6rem;font-size:0.75rem;">
                        ${u.banned ? 'Banned' : 'Active'}
                    </span>
                </td>
                <td style="color:var(--muted);">${new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                <td>
                    <button class="btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}" onclick="window.adminController.toggleBan('${u.id}', ${u.banned})">
                        ${u.banned ? 'Разбанить' : 'Бан'}
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async toggleBan(userId, currentBanned) {
        const sb = getSupabase();
        const { error } = await sb
            .from('profiles')
            .update({ banned: !currentBanned })
            .eq('id', userId);

        if (error) {
            ui.toast('Не удалось изменить статус бана: ' + error.message, 'error');
        } else {
            ui.toast(`Пользователь ${currentBanned ? 'разбанен' : 'заблокирован'}.`, 'success');
            this.loadUsers();
        }
    },

    async toggleRole(userId, currentRole) {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        if (!confirm(`Изменить роль пользователя на ${newRole}?`)) return;

        const sb = getSupabase();
        const { error } = await sb
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            ui.toast('Ошибка смены роли: ' + error.message, 'error');
        } else {
            ui.toast('Роль успешно обновлена.', 'success');
            this.loadUsers();
        }
    },

    // 4. Posts / Changelog CRUD
    async loadPosts() {
        const tbody = document.getElementById('posts-table-body');
        if (!tbody) return;

        const sb = getSupabase();
        const { data: posts, error } = await sb
            .from('posts')
            .select('*')
            .order('published_at', { ascending: false });

        if (error) return;

        tbody.innerHTML = (posts || []).map(p => `
            <tr>
                <td><strong>${p.title}</strong></td>
                <td><code>${p.version}</code></td>
                <td>${(p.tags || []).join(', ')}</td>
                <td><span class="badge ${p.published ? 'badge-accent' : ''}">${p.published ? 'Опубликован' : 'Черновик'}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="window.adminController.editPost('${p.id}')">Редактировать</button>
                    <button class="btn btn-sm btn-danger" onclick="window.adminController.deletePost('${p.id}')">Удалить</button>
                </td>
            </tr>
        `).join('');
    },

    openPostModal(post = null) {
        const modal = document.getElementById('post-modal');
        if (!modal) return;

        document.getElementById('post-id').value = post ? post.id : '';
        document.getElementById('post-title').value = post ? post.title : '';
        document.getElementById('post-version').value = post ? post.version : 'v266';
        document.getElementById('post-tags').value = post ? (post.tags || []).join(', ') : 'feature';
        document.getElementById('post-body').value = post ? post.body : '';
        document.getElementById('post-published').checked = post ? post.published : true;
        this.updateMarkdownPreview();

        modal.classList.add('active');
    },

    async savePost() {
        const sb = getSupabase();
        const id = document.getElementById('post-id').value;
        const title = document.getElementById('post-title').value.trim();
        const version = document.getElementById('post-version').value.trim();
        const tags = document.getElementById('post-tags').value.split(',').map(t => t.trim()).filter(Boolean);
        const body = document.getElementById('post-body').value;
        const published = document.getElementById('post-published').checked;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

        if (!title || !body) {
            ui.toast('Заполните заголовок и контент поста.', 'error');
            return;
        }

        const payload = { title, version, tags, body, published, slug };

        let res;
        if (id) {
            delete payload.slug; // Keep slug on edit
            res = await sb.from('posts').update(payload).eq('id', id);
        } else {
            res = await sb.from('posts').insert(payload);
        }

        if (res.error) {
            ui.toast('Ошибка сохранения: ' + res.error.message, 'error');
        } else {
            ui.toast('Пост успешно сохранен!', 'success');
            document.getElementById('post-modal').classList.remove('active');
            this.loadPosts();
        }
    },

    async editPost(id) {
        const sb = getSupabase();
        const { data } = await sb.from('posts').select('*').eq('id', id).single();
        if (data) this.openPostModal(data);
    },

    async deletePost(id) {
        if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;
        const sb = getSupabase();
        const { error } = await sb.from('posts').delete().eq('id', id);
        if (error) {
            ui.toast('Ошибка удаления: ' + error.message, 'error');
        } else {
            ui.toast('Пост удален.', 'success');
            this.loadPosts();
        }
    },

    updateMarkdownPreview() {
        const val = document.getElementById('post-body')?.value || '';
        const preview = document.getElementById('post-preview-panel');
        if (preview) {
            preview.innerHTML = parseMarkdown(val);
        }
    },

    // 5. Cheat Status
    async loadStatusEditor() {
        const st = await db.getStatus();
        if (!st) return;

        const select = document.getElementById('status-val-select');
        const comment = document.getElementById('status-comment-input');
        const gameVer = document.getElementById('status-game-input');
        const acVer = document.getElementById('status-ac-input');

        if (select) select.value = st.value;
        if (comment) comment.value = st.comment;
        if (gameVer) gameVer.value = st.game_version;
        if (acVer) acVer.value = st.ac_version;
    },

    async saveStatus() {
        const sb = getSupabase();
        const value = document.getElementById('status-val-select').value;
        const comment = document.getElementById('status-comment-input').value;
        const game_version = document.getElementById('status-game-input').value;
        const ac_version = document.getElementById('status-ac-input').value;

        const { error } = await sb.from('status').insert({
            value,
            comment,
            game_version,
            ac_version,
            updated_at: new Date().toISOString()
        });

        if (error) {
            ui.toast('Ошибка обновления статуса: ' + error.message, 'error');
        } else {
            ui.toast('Статус чита обновлен!', 'success');
        }
    },

    // 6. Roadmap
    async loadRoadmap() {
        const container = document.getElementById('roadmap-admin-list');
        if (!container) return;

        const sb = getSupabase();
        const { data: items } = await sb.from('roadmap').select('*').order('sort_order', { ascending: true });

        container.innerHTML = (items || []).map(it => `
            <div class="card" style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;" data-id="${it.id}">
                <div>
                    <span class="badge ${it.state === 'done' ? 'badge-accent' : 'badge-cyan'}">${it.state}</span>
                    <strong style="margin-left:0.5rem;">${it.title}</strong>
                    <p style="color:var(--muted);font-size:0.85rem;margin-top:0.25rem;">${it.description}</p>
                </div>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-sm btn-danger" onclick="window.adminController.deleteRoadmap(${it.id})">&times;</button>
                </div>
            </div>
        `).join('');
    },

    async deleteRoadmap(id) {
        const sb = getSupabase();
        await sb.from('roadmap').delete().eq('id', id);
        ui.toast('Этап roadmap удален.', 'info');
        this.loadRoadmap();
    },

    // 7. FAQ
    async loadFAQ() {
        const container = document.getElementById('faq-admin-list');
        if (!container) return;

        const sb = getSupabase();
        const { data: items } = await sb.from('faq').select('*').order('sort_order', { ascending: true });

        container.innerHTML = (items || []).map(f => `
            <div class="card" style="margin-bottom:1rem;" data-id="${f.id}">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong>${f.question}</strong>
                    <button class="btn btn-sm btn-danger" onclick="window.adminController.deleteFAQ(${f.id})">&times;</button>
                </div>
                <p style="color:var(--muted-light);font-size:0.9rem;margin-top:0.5rem;">${f.answer}</p>
            </div>
        `).join('');
    },

    async deleteFAQ(id) {
        const sb = getSupabase();
        await sb.from('faq').delete().eq('id', id);
        ui.toast('FAQ пункт удален.', 'info');
        this.loadFAQ();
    },

    // 8. Features
    async loadFeatures() {
        const container = document.getElementById('features-admin-list');
        if (!container) return;

        const sb = getSupabase();
        const { data: items } = await sb.from('features').select('*').order('sort_order', { ascending: true });

        container.innerHTML = (items || []).map(f => `
            <div class="card" style="margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="width:32px;height:32px;color:var(--accent);">${f.icon_svg}</div>
                    <div>
                        <strong>${f.title}</strong>
                        <span class="badge badge-cyan" style="margin-left:0.5rem;">${f.category}</span>
                        <p style="color:var(--muted);font-size:0.85rem;">${f.description}</p>
                    </div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="window.adminController.deleteFeature(${f.id})">&times;</button>
            </div>
        `).join('');
    },

    async deleteFeature(id) {
        const sb = getSupabase();
        await sb.from('features').delete().eq('id', id);
        ui.toast('Фича удалена.', 'info');
        this.loadFeatures();
    },

    // 9. Audit Log
    async loadAuditLog() {
        const tbody = document.getElementById('full-audit-table-body');
        if (!tbody) return;

        const sb = getSupabase();
        const { data: logs } = await sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);

        tbody.innerHTML = (logs || []).map(l => `
            <tr>
                <td><strong>${l.actor}</strong></td>
                <td><span class="badge ${l.action === 'DELETE' ? 'badge-danger' : 'badge-accent'}">${l.action}</span></td>
                <td><code>${l.target}</code></td>
                <td><pre style="font-size:0.75rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;">${JSON.stringify(l.payload)}</pre></td>
                <td style="color:var(--muted);">${new Date(l.created_at).toLocaleString('ru-RU')}</td>
            </tr>
        `).join('');
    },

    // 10. General Settings
    async loadSettings() {
        const settings = await db.getSettings();
        const fVer = document.getElementById('setting-version');
        const fDown = document.getElementById('setting-download-url');
        const fDisc = document.getElementById('setting-discord-url');
        const fTg = document.getElementById('setting-tg-url');

        if (fVer) fVer.value = settings.app_version || '';
        if (fDown) fDown.value = settings.download_url || '';
        if (fDisc) fDisc.value = settings.discord_url || '';
        if (fTg) fTg.value = settings.telegram_url || '';
    },

    async saveSettings() {
        const sb = getSupabase();
        const payload = [
            { key: 'app_version', value: document.getElementById('setting-version').value },
            { key: 'download_url', value: document.getElementById('setting-download-url').value },
            { key: 'discord_url', value: document.getElementById('setting-discord-url').value },
            { key: 'telegram_url', value: document.getElementById('setting-tg-url').value }
        ];

        for (const item of payload) {
            await sb.from('settings').upsert(item);
        }

        ui.toast('Настройки сохранены!', 'success');
    },

    bindEvents() {
        // Real-time markdown preview in post modal
        document.getElementById('post-body')?.addEventListener('input', () => this.updateMarkdownPreview());

        // Users search
        document.getElementById('users-search')?.addEventListener('input', () => this.loadUsers());
    }
};

window.adminController = admin;

