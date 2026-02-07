// Wiener Linien API Configuration
export const API_BASE = 'https://www.wienerlinien.at';

// Multi-proxy strategy: Cloudflare Worker (reliable) with fallbacks
export const CORS_PROXIES = [
    { url: 'https://wannfahrma-cors-proxy.stefan-radakovits.workers.dev/?url=', unwrap: false, name: 'Cloudflare Worker' },
    { url: 'https://api.allorigins.win/get?url=', unwrap: true, name: 'allorigins.win' },
    { url: 'https://corsproxy.io/?', unwrap: false, name: 'corsproxy.io' }
];

// LocalStorage Keys
export const STORAGE_KEYS = {
    FAVORITES: 'wl_favorites',
    RECENT: 'wl_recent_searches',
    VIEW_MODE: 'wl_view_mode',
    THEME: 'theme'
};

// Auto-refresh interval in milliseconds
export const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

// API batch loading configuration
export const BATCH_CONFIG = {
    SIZE: 5,           // RBLs per batch
    DELAY: 300,        // ms between batches
    MAX_RBLS: 15       // Maximum RBLs to load
};
