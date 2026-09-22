/**
 * Silence External V1.0.0 · Authentication Module
 * Supabase Auth, username -> internal email mapping, session guard, password strength
 */

import { getSupabase, db } from './supabase.js';
import { ui } from './ui.js';

export const auth = {
    // 1. Check Password Strength
    evaluatePassword(password) {
        let score = 0;
        if (!password) return { score: 0, label: 'none', class: '' };
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 1) return { score: 1, label: 'Слабый', class: 'weak' };
        if (score <= 3) return { score: 2, label: 'Средний', class: 'medium' };
        return { score: 3, label: 'Надёжный', class: 'strong' };
    },

    // 2. Register
    async register({ username, realEmail, password, confirmPassword }) {
        const sb = getSupabase();
        if (!sb) throw new Error('Supabase client uninitialized');

        // Validation
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            throw new Error('Username должен содержать 3–20 символов (буквы, цифры, подчёркивание).');
        }
        if (password.length < 8) {
            throw new Error('Пароль должен содержать минимум 8 символов.');
        }
        if (password !== confirmPassword) {
            throw new Error('Пароли не совпадают.');
        }

        // Map username to internal auth email if no real email provided
        const authEmail = realEmail && realEmail.trim().length > 0 
            ? realEmail.trim() 
            : `${username.toLowerCase()}@silence.local`;

        const { data, error } = await sb.auth.signUp({
            email: authEmail,
            password: password,
            options: {
                data: {
                    username: username,
                    real_email: realEmail || null
                }
            }
        });

        if (error) {
            if (error.message.includes('User already registered')) {
                throw new Error('Пользователь с таким логином или почтой уже существует.');
            }
            throw error;
        }

        return data;
    },

    // 3. Login
    async login({ usernameOrEmail, password, rememberMe = true }) {
        const sb = getSupabase();
        if (!sb) throw new Error('Supabase client uninitialized');

        let email = usernameOrEmail.trim();
        if (!email.includes('@')) {
            email = `${email.toLowerCase()}@silence.local`;
        }

        const { data, error } = await sb.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Неверное имя пользователя или пароль.');
            }
            throw error;
        }

        // Check if user is banned
        const profile = await db.getProfile(data.user.id);
        if (profile && profile.banned) {
            await sb.auth.signOut();
            throw new Error('Ваш аккаунт заблокирован администратором.');
        }

        // Update last login
        await sb
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', data.user.id);

        return { user: data.user, profile };
    },

    // 4. Logout
    async logout() {
        const sb = getSupabase();
        if (sb) {
            await sb.auth.signOut();
        }
        window.location.href = 'index.html';
    },

    // 5. Get Active Session & Profile
    async getCurrentUser() {
        const sb = getSupabase();
        if (!sb) return null;

        const { data: { session } } = await sb.auth.getSession();
        if (!session || !session.user) return null;

        const profile = await db.getProfile(session.user.id);
        return { user: session.user, profile };
    },

    // 6. Navigation Guard
    async guard({ requireAuth = false, requireAdmin = false } = {}) {
        const current = await this.getCurrentUser();

        if (requireAuth && !current) {
            window.location.href = 'login.html';
            return null;
        }

        if (requireAdmin) {
            if (!current || !current.profile || current.profile.role !== 'ADMIN') {
                ui.toast('Доступ запрещен. Требуются права администратора.', 'error');
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                return null;
            }
        }

        return current;
    },

    // 7. Auto-update Public Nav Links & Access Download Section
    async updateNavAuthUI() {
        const navAuthSlot = document.getElementById('nav-auth-slot');
        const guestActions = document.getElementById('access-guest-actions');
        const userActions = document.getElementById('access-user-actions');
        const heroCtaBtn = document.getElementById('hero-cta-btn');

        const current = await this.getCurrentUser();
        if (current && (current.profile || current.user)) {
            const username = (current.profile && current.profile.username) 
                || (current.user.user_metadata && current.user.user_metadata.username) 
                || 'user';
            const isAdmin = current.profile && current.profile.role === 'ADMIN';

            if (navAuthSlot) {
                navAuthSlot.innerHTML = `
                    <div class="nav-user-container">
                        ${isAdmin ? `<a href="admin.html" class="nav-admin-badge" title="Панель администратора">Админ</a>` : ''}
                        <span class="nav-username">@${username}</span>
                        <button id="nav-logout-btn" class="nav-logout-btn" type="button" title="Выйти из учетной записи">
                            Выйти
                        </button>
                    </div>
                `;

                document.getElementById('nav-logout-btn')?.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await this.logout();
                });
            }

            // Logged-in access CTA
            if (guestActions) guestActions.style.display = 'none';
            if (userActions) userActions.style.display = 'block';
            if (heroCtaBtn) {
                heroCtaBtn.setAttribute('href', 'releases/Silence_V1.0.0.zip');
                heroCtaBtn.setAttribute('download', '');
                heroCtaBtn.innerHTML = `<span>Скачать архив V1.0.0</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
            }
        } else {
            if (navAuthSlot) {
                navAuthSlot.innerHTML = `
                    <a href="login.html" class="btn btn-ghost btn-sm">Войти</a>
                `;
            }
            if (guestActions) guestActions.style.display = 'flex';
            if (userActions) userActions.style.display = 'none';
        }
    }
};

// Initialize auth state check on public pages
document.addEventListener('DOMContentLoaded', () => {
    auth.updateNavAuthUI();
});


