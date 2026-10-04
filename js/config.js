// ============================================
// API CONFIG
// ============================================
const API_BASE = 'https://AvinashKumar1.pythonanywhere.com';

async function apiCall(path, options = {}) {
    try {
        const res = await fetch(API_BASE + path, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            ...options
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await res.text();
            console.error(`[API] Non-JSON from ${path}:`, text.slice(0, 200));
            return {
                success: false,
                error: `Server returned ${res.status}. Check if Flask is running.`
            };
        }

        return await res.json();
    } catch (err) {
        console.error('[API] Error:', err);
        return { success: false, error: 'Network error: ' + err.message };
    }
}

async function requireAuth() {
    const data = await apiCall('/api/auth/me');
    if (!data.success) {
        window.location.href = 'login.html';
        return null;
    }
    return data;
}

async function redirectIfLoggedIn() {
    const data = await apiCall('/api/auth/me');
    if (data.success) {
        window.location.href = 'dashboard.html';
    }
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

const FS_KEY = 'fs_enabled_v2';

function isFsEnabled() {
    return localStorage.getItem(FS_KEY) === '1';
}

async function goFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) return true;
    try {
        await el.requestFullscreen({ navigationUI: 'hide' });
        localStorage.setItem(FS_KEY, '1');
        console.log('[FS] ✅ Fullscreen entered');
        return true;
    } catch (err) {
        console.warn('[FS] ❌ Failed:', err.message);
        return false;
    }
}

function exitFullscreen() {
    localStorage.removeItem(FS_KEY);
    const overlay = document.getElementById('fs-resume-overlay');
    if (overlay) overlay.remove();
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
}

function autoRestoreFullscreen() {
    if (!isFsEnabled()) return;
    console.log('[FS] Auto-restore armed on', window.location.pathname);

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && isFsEnabled()) {
            showResumeOverlay();
        } else {
            const overlay = document.getElementById('fs-resume-overlay');
            if (overlay) overlay.remove();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!isFsEnabled()) return;
        if (e.key === 'Escape' || e.key === 'F11') e.preventDefault();
        if (e.ctrlKey && ['w', 'r', 't', 'n'].includes(e.key.toLowerCase())) e.preventDefault();
        if (e.altKey && e.key === 'F4') e.preventDefault();
    }, true);

    document.addEventListener('contextmenu', (e) => {
        if (isFsEnabled()) e.preventDefault();
    });
    document.addEventListener('copy', (e) => {
        if (isFsEnabled()) e.preventDefault();
    });
    document.addEventListener('cut', (e) => {
        if (isFsEnabled()) e.preventDefault();
    });

    const firstClickRestore = async () => {
        if (!isFsEnabled()) return;
        if (document.fullscreenElement) {
            document.removeEventListener('click', firstClickRestore);
            return;
        }
        if (document.getElementById('fs-resume-overlay')) return;
        const ok = await goFullscreen();
        if (ok) document.removeEventListener('click', firstClickRestore);
    };
    document.addEventListener('click', firstClickRestore);

    setTimeout(() => {
        if (isFsEnabled() && !document.fullscreenElement) {
            showResumeOverlay();
        }
    }, 150);
}

function showResumeOverlay() {
    if (document.getElementById('fs-resume-overlay')) return;
    if (document.fullscreenElement) return;

    const overlay = document.createElement('div');
    overlay.id = 'fs-resume-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 999999;
        background: rgba(0,0,0,0.95); color: white;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center; padding: 2rem; cursor: pointer;
        user-select: none;
    `;
    overlay.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1rem;">⛶</div>
        <h2 style="font-size: 1.6rem; margin-bottom: 0.6rem; font-weight: 700;">
            Fullscreen Mode Required
        </h2>
        <p style="opacity: 0.8; margin-bottom: 2rem; max-width: 400px; line-height: 1.6;">
            This is an exam session. You must stay in fullscreen mode.<br><br>
            <strong>Click anywhere to continue.</strong>
        </p>
        <button style="
            padding: 1rem 2.5rem;
            background: #4f46e5; color: white;
            border: none; border-radius: 12px;
            font-size: 1rem; font-weight: 600;
            cursor: pointer;
        ">Enter Fullscreen</button>
    `;

    overlay.onclick = async (e) => {
        e.stopPropagation();
        const ok = await goFullscreen();
        if (ok) overlay.remove();
    };

    document.body.appendChild(overlay);
}

function createFullscreenIndicator() {
    if (!isFsEnabled()) return;
    if (document.getElementById('fs-indicator')) return;

    const el = document.createElement('div');
    el.id = 'fs-indicator';
    el.innerHTML = '⛶';
    el.style.cssText = `
        position: fixed; bottom: 12px; right: 12px;
        width: 34px; height: 34px;
        background: rgba(79,70,229,0.85); color: white;
        border-radius: 50%; display: flex;
        align-items: center; justify-content: center;
        font-size: 16px; cursor: pointer; z-index: 99998;
        user-select: none; opacity: 0.5;
        transition: opacity 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    el.onmouseenter = () => el.style.opacity = '1';
    el.onmouseleave = () => el.style.opacity = '0.5';
    el.onclick = (e) => {
        e.stopPropagation();
        if (document.fullscreenElement) exitFullscreen();
        else goFullscreen();
    };
    document.body.appendChild(el);
}
