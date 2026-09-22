/**
 * Silence External 266 · Authentication Module
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

    // 7. Auto-update Public Nav Links
    async updateNavAuthUI() {
        const navAuthSlot = document.getElementById('nav-auth-slot');
        if (!navAuthSlot) return;

        const current = await this.getCurrentUser();
        if (current && current.profile) {
            const isAdmin = current.profile.role === 'ADMIN';
            navAuthSlot.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    ${isAdmin ? `<a href="admin.html" class="chip" style="color:var(--accent-light);border-color:var(--accent);">Админ-панель</a>` : ''}
                    <a href="me.html" class="btn btn-ghost btn-sm" style="color:#ffffff;">
                        ${current.profile.username}
                    </a>
                    <button id="nav-logout-btn" class="btn btn-ghost btn-sm" style="color:var(--text-secondary);">
                        Выйти
                    </button>
                </div>
            `;
            document.getElementById('nav-logout-btn')?.addEventListener('click', () => {
                this.logout();
            });
        } else {
            navAuthSlot.innerHTML = `
                <a href="login.html" class="btn btn-ghost btn-sm">Войти</a>
            `;
        }
    }
};

// Initialize auth state check on public pages
document.addEventListener('DOMContentLoaded', () => {
    auth.updateNavAuthUI();
});

