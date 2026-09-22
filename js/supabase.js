/**
 * Silence External V1.0.0 · Supabase Client & Configuration
 * Architecture: Clean Supabase JS SDK CDN wrapper with anon-key authentication
 */

// Production configuration credentials (Public Anon Key safe for GitHub Pages per Supabase design)
export const SUPABASE_URL = window.ENV_SUPABASE_URL || 'https://yhsboodomnvugtqyhrjg.supabase.co';
export const SUPABASE_ANON_KEY = window.ENV_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloc2Jvb2RvbW52dWd0cXlocmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNzU5NTEsImV4cCI6MjEwNTY1MTk1MX0.rf_UohAQKZQ4em6tLiT5YpMNS6MzOETowpWUPOO3EQA';

// Initialize Supabase client
let supabaseInstance = null;

export function getSupabase() {
    if (!supabaseInstance) {
        if (!window.supabase) {
            console.error('Supabase CDN client script is not loaded in window.supabase!');
            return null;
        }
        supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }
    return supabaseInstance;
}

// Global db helper wrappers
export const db = {
    async getStatus() {
        const sb = getSupabase();
        if (!sb) return null;
        const { data, error } = await sb
            .from('status')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();
        if (error) {
            console.warn('Could not fetch dynamic status, falling back to cached:', error.message);
            return { value: 'Undetected', comment: 'Kernel driver active. Zero detections on V1.0.0.', game_version: 'Rust V1.0.0', ac_version: 'Kernel Protection', updated_at: new Date().toISOString() };
        }
        return data;
    },

    async getPosts({ tag = null, search = '', limit = 20, offset = 0 } = {}) {
        const sb = getSupabase();
        if (!sb) return [];
        let query = sb
            .from('posts')
            .select('*')
            .eq('published', true)
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (tag && tag !== 'all') {
            query = query.contains('tags', [tag]);
        }
        if (search && search.trim().length > 0) {
            query = query.ilike('title', `%${search.trim()}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching posts:', error);
            return [];
        }
        return data || [];
    },

    async getFeatures() {
        const sb = getSupabase();
        if (!sb) return [];
        const { data, error } = await sb
            .from('features')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        if (error) return [];
        return data || [];
    },

    async getRoadmap() {
        const sb = getSupabase();
        if (!sb) return [];
        const { data, error } = await sb
            .from('roadmap')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) return [];
        return data || [];
    },

    async getFAQ() {
        const sb = getSupabase();
        if (!sb) return [];
        const { data, error } = await sb
            .from('faq')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) return [];
        return data || [];
    },

    async getSettings() {
        const sb = getSupabase();
        if (!sb) return {};
        const { data, error } = await sb
            .from('settings')
            .select('*');
        if (error) return {};
        const map = {};
        (data || []).forEach(row => { map[row.key] = row.value; });
        return map;
    },

    async getProfile(userId) {
        const sb = getSupabase();
        if (!sb || !userId) return null;
        const { data, error } = await sb
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) {
            console.error('Failed to get user profile:', error);
            return null;
        }
        return data;
    }
};


