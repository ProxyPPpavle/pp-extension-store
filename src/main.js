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

    // --- Lockout System ---
    let authAttempts = parseInt(localStorage.getItem('pp_auth_attempts')) || 0;
    let authLockUntil = parseInt(localStorage.getItem('pp_auth_lock_until')) || 0;

    const getLockStatus = () => {
        const now = Date.now();
        if (authLockUntil > now) {
            const diff = authLockUntil - now;
            if (diff > 12 * 60 * 60 * 1000) return "Locked until tomorrow";
            const mins = Math.ceil(diff / 60000);
            const secs = Math.ceil((diff % 60000) / 1000);
            return mins > 1 ? `Locked for ${mins}m` : `Locked for ${secs}s`;
        }
        return null;
    };

    const recordFailedAttempt = () => {
        authAttempts++;
        localStorage.setItem('pp_auth_attempts', authAttempts);
        let lockDuration = 0;

        if (authAttempts >= 10) {
            const tomorrow = new Date();
            tomorrow.setHours(24, 0, 0, 0);
            authLockUntil = tomorrow.getTime();
        } else if (authAttempts >= 6) {
            lockDuration = 20 * 60 * 1000;
        } else if (authAttempts >= 4) {
            lockDuration = 5 * 60 * 1000;
        } else if (authAttempts >= 2) {
            lockDuration = 1 * 60 * 1000;
        }

        if (lockDuration > 0) {
            authLockUntil = Date.now() + lockDuration;
        }

        if (authLockUntil > Date.now()) {
            localStorage.setItem('pp_auth_lock_until', authLockUntil);
        }
    };

    const resetFailedAttempts = () => {
        authAttempts = 0;
        authLockUntil = 0;
        localStorage.removeItem('pp_auth_attempts');
        localStorage.removeItem('pp_auth_lock_until');
    };

    // --- Profile & Verification Logic ---
    const updateProfileUI = () => {
        const lockStatus = getLockStatus();

        if (isVerified && savedClientId) {
            if (loginSection) loginSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'flex';
            if (profileEmail) profileEmail.textContent = currentUserEmail;
            // Update: ID length check for mask
            const parts = savedClientId.split('-');
            const maskPart = (len) => '•'.repeat(len);
            const mask = parts.length > 1 ? `${parts[0]}-${maskPart(parts[1].length)}-${maskPart(parts[2].length)}` : '••••-••••';

            if (displayClientId) displayClientId.textContent = isIdVisible ? savedClientId : mask;
            if (btnReveal) btnReveal.innerHTML = isIdVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            if (authInstruction) authInstruction.textContent = "Member Access: Active";
            loginBox?.classList.add('verified');
        } else {
            if (loginSection) loginSection.style.display = 'flex';
            if (profileSection) profileSection.style.display = 'none';
            loginBox?.classList.remove('verified');

            if (lockStatus) {
                if (authInstruction) authInstruction.textContent = lockStatus;
                if (loginBtn) {
                    loginBtn.disabled = true;
                    loginBtn.textContent = lockStatus;
                }
            } else {
                if (authInstruction) authInstruction.textContent = "Installation disabled for non-members.";
                if (loginBtn) loginBtn.disabled = false;
            }
        }
    };

    updateProfileUI();
    // Periodically update UI to count down lock
    setInterval(() => {
        if (!isVerified) updateProfileUI();
    }, 1000);

    btnReveal?.addEventListener('click', () => {
        isIdVisible = !isIdVisible;
        updateProfileUI();
    });

    const resetSection = document.getElementById('reset-verification-section');
    const resetInput = document.getElementById('reset-code-input');
    const profileActions = document.getElementById('profile-actions-container');

    document.getElementById('btn-change-key')?.addEventListener('click', async () => {
        if (confirm("Request a verification code to PERMANENTLY delete your account data?")) {
            if (currentUserEmail) {
                const res = await safeFetch(`${apiUrl}/send-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentUserEmail })
                });
                if (res.status === 'success') {
                    if (resetSection) resetSection.style.display = 'flex';
                    if (profileActions) profileActions.style.display = 'none';
                    showFeedback(resetInput, 'success');
                } else {
                    alert("Error sending verification code. Please try again.");
                }
            }
        }
    });

    document.getElementById('btn-cancel-reset')?.addEventListener('click', () => {
        if (resetSection) resetSection.style.display = 'none';
        if (profileActions) profileActions.style.display = 'flex';
    });

    document.getElementById('btn-confirm-reset')?.addEventListener('click', async () => {
        const code = resetInput?.value.trim();
        const confirmBtn = document.getElementById('btn-confirm-reset');

        if (!code || code.length !== 6) {
            showFeedback(resetInput, 'error');
            return;
        }

        if (confirm("FINAL WARNING: This will delete everything related to this ID. Proceed?")) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Processing...";

            const res = await safeFetch(`${apiUrl}/reset-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUserEmail, code })
            });

            if (res.status === 'success') {
                resetFailedAttempts();
                localStorage.clear();
                location.reload();
            } else {
                showFeedback(resetInput, 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = "CONFIRM RESET";
                alert(res.message || "Invalid code.");
            }
        }
    });

    loginBtn?.addEventListener('click', async () => {
        const lockStatus = getLockStatus();
        if (lockStatus) return;

        const email = topEmailInput?.value.trim();
        const code = codeInput?.value.trim();

        if (loginBtn.textContent.includes('Verify Status')) {
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
        } else if (loginBtn.textContent.includes('Confirm Code')) {
            if (!code || code.length !== 6) {
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
                resetFailedAttempts(); // Reset attempts on success
                setTimeout(() => {
                    updateProfileUI();
                    toggleLogin(false);
                }, 1000);
            } else {
                showFeedback(codeInput, 'error');
                recordFailedAttempt();
                updateProfileUI();
                if (!getLockStatus()) {
                    loginBtn.textContent = 'Confirm Code';
                    loginBtn.disabled = false;
                }
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

    // --- Guide Slider ---
    const guideSlides = document.querySelectorAll('.slide');
    const guideDots = document.querySelectorAll('.dot');
    const prevStepBtn = document.getElementById('prev-step');
    const nextStepBtn = document.getElementById('next-step');
    let currentStep = 0;

    const updateGuideUI = () => {
        guideSlides.forEach((slide, i) => {
            slide.classList.toggle('active', i === currentStep);
        });
        guideDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentStep);
        });
    };

    prevStepBtn?.addEventListener('click', () => {
        currentStep = (currentStep - 1 + guideSlides.length) % guideSlides.length;
        updateGuideUI();
    });

    nextStepBtn?.addEventListener('click', () => {
        currentStep = (currentStep + 1) % guideSlides.length;
        updateGuideUI();
    });

    guideDots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            currentStep = i;
            updateGuideUI();
        });
    });

    updateGuideUI();

    // --- Review System Logic ---
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('review-rating');
    const reviewForm = document.getElementById('review-form');

    const updateStars = (rating, isHover = false) => {
        stars.forEach(s => {
            const val = parseInt(s.getAttribute('data-value'));
            if (val <= rating) {
                s.classList.add('active');
                if (isHover) s.style.transform = 'scale(1.2)';
            } else {
                s.classList.remove('active');
                if (isHover) s.style.transform = 'scale(1)';
            }
        });
    };

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-value'));
            if (ratingInput) ratingInput.value = rating;
            updateStars(rating);
        });

        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.getAttribute('data-value'));
            updateStars(rating, true);
        });

        star.addEventListener('mouseout', () => {
            const currentRating = parseInt(ratingInput.value || 0);
            updateStars(currentRating);
        });
    });

    reviewForm?.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Check if verified
        if (!currentUserEmail || !isVerified) {
            alert("Please verify your Member Access first to leave a review.");
            toggleLogin(true); // Open login box
            return;
        }

        // 2. One review per email check
        const hasReviewed = localStorage.getItem(`pp_reviewed_${currentUserEmail}`);
        if (hasReviewed) {
            alert("You have already submitted a review with this email address.");
            return;
        }

        const btn = reviewForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;

        btn.disabled = true;
        btn.textContent = 'Publishing...';

        // Simulate API call
        setTimeout(() => {
            localStorage.setItem(`pp_reviewed_${currentUserEmail}`, 'true');
            btn.textContent = 'Success!';
            btn.style.background = 'var(--accent-green)';
            reviewForm.reset();
            if (ratingInput) ratingInput.value = 5;
            updateStars(5);

            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = originalText;
                btn.style.background = '';
            }, 3000);
        }, 1500);
    });

    // Start Loops
    injectVignette();
    startAdGuardian();
});
