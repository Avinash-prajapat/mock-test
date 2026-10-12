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

// ============================================
// FULLSCREEN — Sirf test page ke liye
// ============================================
const FS_KEY = 'exam_fullscreen';

function isFsEnabled() {
    return sessionStorage.getItem(FS_KEY) === '1';
}

async function goFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) return true;
    try {
        await el.requestFullscreen({ navigationUI: 'hide' });
        sessionStorage.setItem(FS_KEY, '1');
        console.log('[FS] ✅ Fullscreen entered');
        return true;
    } catch (err) {
        console.warn('[FS] ❌ Failed:', err.message);
        return false;
    }
}

function exitFullscreen() {
    sessionStorage.removeItem(FS_KEY);
    const overlay = document.getElementById('fs-resume-overlay');
    if (overlay) overlay.remove();
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
}

function enforceTestFullscreen() {
    if (!isFsEnabled()) return;
    console.log('[FS] Test fullscreen active');

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
        if (e.key === 'F12') e.preventDefault();
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

    setTimeout(() => {
        if (isFsEnabled() && !document.fullscreenElement) {
            showResumeOverlay();
        }
    }, 200);
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
            You must stay in fullscreen mode during the test.<br><br>
            <strong>Click anywhere to resume.</strong>
        </p>
        <button style="
            padding: 1rem 2.5rem;
            background: #4f46e5; color: white;
            border: none; border-radius: 12px;
            font-size: 1rem; font-weight: 600;
            cursor: pointer;
        ">Resume Test</button>
    `;

    overlay.onclick = async (e) => {
        e.stopPropagation();
        const ok = await goFullscreen();
        if (ok) overlay.remove();
    };

    document.body.appendChild(overlay);
}
