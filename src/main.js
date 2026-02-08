import './style.css';

document.addEventListener('DOMContentLoaded', () => {

    // --- Console Noise Suppression (Handling excessive WebGL warnings from Ads) ---
    (function () {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        let webGLCount = 0;
        HTMLCanvasElement.prototype.getContext = function (type, attributes) {
            if (type === 'webgl' || type === 'experimental-webgl') {
                webGLCount++;
                if (webGLCount > 15) return null; // Hard limit for ads fingerprinting
            }
            return originalGetContext.call(this, type, attributes);
        };
    })();

    // --- Core State & Config ---
    const apiUrl = import.meta.env.VITE_API_URL || 'https://pp-server-eight.vercel.app';
    let currentUserEmail = localStorage.getItem('pp_user_email') || '';
    let isVerified = localStorage.getItem('pp_verified') === 'true';
    let savedClientId = localStorage.getItem('pp_client_id') || '';
    let isIdVisible = false;

    const adStorage = {
        canShowVignette: true,
        pushInjected: false,
        clickCount: 0
    };

    // --- UI Helpers ---
    const showFeedback = (el, type) => {
        if (!el) return;
        el.classList.remove('input-success', 'input-error');
        void el.offsetWidth;
        el.classList.add(`input-${type}`);
        setTimeout(() => el.classList.remove(`input-${type}`), 3000);
    };

    async function safeFetch(url, options = {}) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`[API] Failure at ${url}:`, err.message);
            return { status: 'error', message: err.message };
        }
    }

    // --- UI Elements ---
    const loginToggle = document.getElementById('login-toggle');
    const closeLogin = document.getElementById('close-login');
    const loginBox = document.getElementById('login-box');
    const loginSection = document.getElementById('login-section');
    const profileSection = document.getElementById('profile-section');
    const profileEmail = document.getElementById('profile-email');
    const topEmailInput = document.getElementById('user-email-top');
    const loginBtn = document.getElementById('btn-login-top');
    const codeSection = document.getElementById('code-section');
    const codeInput = document.getElementById('verify-code-input');
    const displayClientId = document.getElementById('display-client-id');
    const btnReveal = document.getElementById('btn-reveal-id');
    const authInstruction = document.getElementById('auth-instruction');
    const downloadTriggers = document.querySelectorAll('.download-trigger');
    const idModal = document.getElementById('id-modal');
    const idDisplayModal = document.getElementById('generated-id');
    const copyIdBtnModal = document.getElementById('copy-id-btn');

    // --- Toggle Logic ---
    const toggleLogin = (force) => {
        if (!loginBox) return;
        const isOpening = force !== undefined ? force : !loginBox.classList.contains('active');
        if (isOpening) {
            loginBox.style.display = 'flex';
            setTimeout(() => {
                loginBox.classList.add('active');
                loginToggle?.classList.add('active');
            }, 10);
        } else {
            loginBox.classList.remove('active');
            loginToggle?.classList.remove('active');
            setTimeout(() => {
                if (!loginBox.classList.contains('active')) loginBox.style.display = 'none';
            }, 500);
        }
    };

    loginToggle?.addEventListener('click', () => toggleLogin());
    closeLogin?.addEventListener('click', () => toggleLogin(false));

    // --- Profile & Verification Logic ---
    const updateProfileUI = () => {
        if (isVerified && savedClientId) {
            if (loginSection) loginSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'flex';
            if (profileEmail) profileEmail.textContent = currentUserEmail;
            if (displayClientId) displayClientId.textContent = isIdVisible ? savedClientId : '••••-••••';
            if (btnReveal) btnReveal.innerHTML = isIdVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            if (authInstruction) authInstruction.textContent = "Member Access: Active";
            loginBox?.classList.add('verified');
        } else {
            if (loginSection) loginSection.style.display = 'flex';
            if (profileSection) profileSection.style.display = 'none';
            loginBox?.classList.remove('verified');
            if (authInstruction) authInstruction.textContent = "Installation disabled for non-members.";
        }
    };

    updateProfileUI();

    btnReveal?.addEventListener('click', () => {
        isIdVisible = !isIdVisible;
        updateProfileUI();
    });

    document.getElementById('btn-change-key')?.addEventListener('click', () => {
        if (confirm("Reset account status? New verification required.")) {
            localStorage.clear();
            location.reload();
        }
    });

    loginBtn?.addEventListener('click', async () => {
        const email = topEmailInput?.value.trim();
        const code = codeInput?.value.trim();

        if (loginBtn.textContent === 'Verify Status') {
            if (!email || !email.includes('@')) {
                showFeedback(topEmailInput, 'error');
                return;
            }
            loginBtn.disabled = true;
            loginBtn.textContent = 'Sending...';

            const data = await safeFetch(`${apiUrl}/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (data.status === 'success') {
                showFeedback(topEmailInput, 'success');
                currentUserEmail = email;
                localStorage.setItem('pp_user_email', email);
                if (codeSection) codeSection.style.display = 'flex';
                loginBtn.textContent = 'Confirm Code';
                if (topEmailInput) topEmailInput.disabled = true;
            } else {
                showFeedback(topEmailInput, 'error');
                loginBtn.textContent = 'Verify Status';
            }
            loginBtn.disabled = false;
        } else {
            if (!code || code.length !== 4) {
                showFeedback(codeInput, 'error');
                return;
            }
            loginBtn.disabled = true;
            loginBtn.textContent = 'Verifying...';

            const data = await safeFetch(`${apiUrl}/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUserEmail, code })
            });

            if (data.status === 'success') {
                showFeedback(codeInput, 'success');
                isVerified = true;
                savedClientId = data.clientId;
                localStorage.setItem('pp_verified', 'true');
                localStorage.setItem('pp_client_id', data.clientId);
                setTimeout(() => {
                    updateProfileUI();
                    toggleLogin(false);
                }, 1000);
            } else {
                showFeedback(codeInput, 'error');
                loginBtn.textContent = 'Confirm Code';
                loginBtn.disabled = false;
            }
        }
    });

    document.getElementById('btn-copy-id-mini')?.addEventListener('click', (e) => {
        if (!savedClientId) return;
        navigator.clipboard.writeText(savedClientId);
        const originalText = e.target.textContent;
        e.target.textContent = 'COPIED!';
        setTimeout(() => e.target.textContent = originalText, 2000);
    });

    // --- Downloads ---
    downloadTriggers.forEach(trigger => {
        trigger.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!isVerified) {
                toggleLogin(true);
                showFeedback(topEmailInput, 'error');
                return;
            }
            const type = trigger.getAttribute('data-type');
            const data = await safeFetch(`${apiUrl}/register-client`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountType: type, email: currentUserEmail })
            });
            if (data.status === 'success') {
                if (idDisplayModal) idDisplayModal.textContent = data.clientId;
                if (idModal) idModal.style.display = 'flex';
            }
        });
    });

    copyIdBtnModal?.addEventListener('click', () => {
        if (idDisplayModal) {
            navigator.clipboard.writeText(idDisplayModal.textContent);
            copyIdBtnModal.textContent = 'Copied!';
            setTimeout(() => copyIdBtnModal.textContent = 'Copy to Clipboard', 2000);
        }
    });

    // --- Ad Injection (Stabilized) ---
    const injectVignette = () => {
        if (!adStorage.canShowVignette) return;
        try {
            document.querySelectorAll('script[src*="vignette.min.js"]').forEach(s => s.remove());
            const s = document.createElement('script');
            s.dataset.zone = '10582470';
            s.src = 'https://gizokraijaw.net/vignette.min.js';
            s.setAttribute('data-cfasync', 'false');
            (document.head || document.documentElement).appendChild(s);
        } catch (err) { }
        adStorage.canShowVignette = false;
    };

    const startAdGuardian = () => {
        setInterval(() => {
            const hasAds = document.querySelectorAll('iframe[id*="pro-"], div[class*="pro-"]').length > 0;
            if (!hasAds) {
                try {
                    const adContainer = document.getElementById('ad-loop-container') || document.body;
                    const s1 = document.createElement('script');
                    s1.dataset.zone = '10582494';
                    s1.src = 'https://nap5k.com/tag.min.js';
                    adContainer.appendChild(s1);
                } catch (e) { }
            }
        }, 5000);
    };

    document.addEventListener('click', () => {
        adStorage.clickCount++;
        if (adStorage.clickCount % 3 === 0) {
            adStorage.canShowVignette = true;
            injectVignette();
        }
    });

    // --- Matrix Optimization ---
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: false });
        let width, height, columns, drops;
        const initMatrix = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            columns = Math.floor(width / 20);
            drops = new Array(columns).fill(0).map(() => Math.random() * -100);
        };
        const drawMatrix = () => {
            ctx.fillStyle = 'rgba(5, 5, 5, 0.15)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#10b981';
            ctx.font = '15px monospace';
            for (let i = 0; i < drops.length; i++) {
                const text = String.fromCharCode(33 + Math.random() * 94);
                ctx.fillText(text, i * 20, drops[i] * 20);
                if (drops[i] * 20 > height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        };
        initMatrix();
        setInterval(drawMatrix, 40);
        window.addEventListener('resize', initMatrix);
    }

    // --- Initial AOS & AOS triggers ---
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 1000, once: true, offset: 50 });
    }

    // Start Loops
    injectVignette();
    startAdGuardian();
});
