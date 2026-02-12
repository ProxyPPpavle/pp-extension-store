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

    loginToggle?.addEventListener('click', () => {
        if (isVerified) {
            window.open('/profile.html', '_blank');
        } else {
            toggleLogin();
        }
    });
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
    if (isVerified && loginToggle) {
        loginToggle.innerHTML = '<i class="fas fa-user-check"></i> <span class="toggle-text">My Profile</span>';
    }

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

            // --- Click Rate Limit / Debounce ---
            const lastRequest = parseInt(localStorage.getItem('pp_last_code_request') || '0');
            const now = Date.now();
            const cooldown = 60000; // 60 seconds

            if (now - lastRequest < cooldown) {
                const wait = Math.ceil((cooldown - (now - lastRequest)) / 1000);
                alert(`Please wait ${wait}s before requesting another code.`);
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
                localStorage.setItem('pp_last_code_request', Date.now().toString());
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
                    window.open('/profile.html', '_blank');
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

    // --- Downloads with VAST Video Ads ---
    // --- Downloads with VAST Video Ads ---
    const VAST_URL = 'https://s.magsrv.com/v1/vast.php?idzone=5851404&ex_av=name';
    const VAST_BACKUP_URL = 'https://s.magsrv.com/v1/vast.php?idzone=5851416&ex_av=name';

    const vastModal = document.getElementById('vast-modal');
    const vastVideo = document.getElementById('vast-video-player');
    const vastSkipBtn = document.getElementById('vast-skip-btn');
    const vastCountdown = document.getElementById('vast-countdown');
    const vastTimer = document.getElementById('vast-timer');

    let vastResolveCallback = null;
    let skipTimer = null;
    let countdownInterval = null;

    const showVastAd = () => {
        return new Promise((resolve) => {
            vastResolveCallback = resolve;

            // Show modal
            if (vastModal) vastModal.style.display = 'flex';

            // Reset UI
            if (vastSkipBtn) vastSkipBtn.style.display = 'none';
            if (vastCountdown) vastCountdown.style.display = 'block';
            if (vastTimer) vastTimer.textContent = '15';

            // Parse VAST and load video
            loadVastVideo(VAST_URL);

            // Start 15-second countdown
            let timeLeft = 15;
            countdownInterval = setInterval(() => {
                timeLeft--;
                if (vastTimer) vastTimer.textContent = timeLeft;

                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    // Show skip button after 15 seconds
                    if (vastCountdown) vastCountdown.style.display = 'none';
                    if (vastSkipBtn) vastSkipBtn.style.display = 'block';
                }
            }, 1000);
        });
    };

    const closeVastAd = () => {
        if (vastModal) vastModal.style.display = 'none';
        if (vastVideo) {
            vastVideo.pause();
            vastVideo.src = '';
        }
        if (skipTimer) clearTimeout(skipTimer);
        if (countdownInterval) clearInterval(countdownInterval);

        if (vastResolveCallback) {
            vastResolveCallback();
            vastResolveCallback = null;
        }
    };

    const loadVastVideo = async (vastUrl, isBackup = false) => {
        try {
            const response = await fetch(vastUrl);
            const vastXml = await response.text();

            // Parse VAST XML to extract video URL
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(vastXml, 'text/xml');

            // Try to find MediaFile (video URL)
            const mediaFile = xmlDoc.querySelector('MediaFile');
            if (mediaFile && vastVideo) {
                const videoUrl = mediaFile.textContent.trim();
                vastVideo.src = videoUrl;

                // CRITICAL: Extract and fire impression tracking URLs
                const impressionTrackers = xmlDoc.querySelectorAll('Impression');
                console.log(`[VAST] Found ${impressionTrackers.length} impression trackers`);

                // Fire impressions when video starts playing
                const fireImpressions = () => {
                    impressionTrackers.forEach((tracker, index) => {
                        const impressionUrl = tracker.textContent.trim();
                        if (impressionUrl) {
                            console.log(`[VAST] Firing impression ${index + 1}:`, impressionUrl);
                            // Use fetch with no-cors to avoid CORS issues
                            fetch(impressionUrl, { method: 'GET', mode: 'no-cors' }).catch(err => {
                                console.warn('[VAST] Impression tracking failed:', err);
                            });
                        }
                    });
                    // Remove listener after firing once
                    vastVideo.removeEventListener('play', fireImpressions);
                };

                // Add listener to fire impressions on first play
                vastVideo.addEventListener('play', fireImpressions, { once: true });

                // Extract click tracking URLs
                const clickTrackers = xmlDoc.querySelectorAll('ClickTracking');
                if (clickTrackers.length > 0) {
                    vastVideo.addEventListener('click', () => {
                        clickTrackers.forEach((tracker) => {
                            const clickUrl = tracker.textContent.trim();
                            if (clickUrl) {
                                console.log('[VAST] Firing click tracker:', clickUrl);
                                fetch(clickUrl, { method: 'GET', mode: 'no-cors' }).catch(() => { });
                            }
                        });
                    });
                }

                vastVideo.play().catch(err => {
                    console.warn('[VAST] Autoplay blocked:', err);
                    // If autoplay fails, user must click play manually
                });
            } else {
                console.warn('[VAST] No MediaFile found in VAST response');
                // If primary failed and we haven't tried backup yet, try backup
                if (!isBackup) {
                    console.log('[VAST] Trying backup VAST URL...');
                    loadVastVideo(VAST_BACKUP_URL, true);
                } else {
                    // Both failed, close after 15 seconds
                    console.warn('[VAST] Backup also failed, closing modal');
                    setTimeout(closeVastAd, 15000);
                }
            }
        } catch (err) {
            console.error('[VAST] Error loading video:', err);
            // If primary failed and we haven't tried backup yet, try backup
            if (!isBackup) {
                console.log('[VAST] Primary failed, trying backup VAST URL...');
                loadVastVideo(VAST_BACKUP_URL, true);
            } else {
                // Both failed, close after 15 seconds
                console.warn('[VAST] Both VAST URLs failed, closing modal');
                setTimeout(closeVastAd, 15000);
            }
        }
    };

    // Skip button click
    vastSkipBtn?.addEventListener('click', () => {
        console.log('[VAST] User skipped ad');
        closeVastAd();
    });

    // Video ended naturally
    vastVideo?.addEventListener('ended', () => {
        console.log('[VAST] Video completed');
        closeVastAd();
    });

    const simulateDownload = (type) => {
        console.log(`[DOWNLOAD] Starting download for: ${type}`);
        // Trigger the actual zip download from the public root
        // Note: type is usually 'ppbot' (lowercase) but file is 'PPBot.zip'
        // We will hardcode for now to be safe or map it.
        let fileUrl = './PPBot.zip';
        if (type.toLowerCase() === 'predictor') fileUrl = './Predictor.zip';

        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = `PPBot_Extension.zip`; // Renaming for user clarity
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link);
    };

    downloadTriggers.forEach(trigger => {
        trigger.addEventListener('click', async (e) => {
            e.preventDefault();
            const type = trigger.getAttribute('data-type'); // e.g. 'ppbot' or 'predictor'

            // 1. Show VAST ad and wait for skip/completion
            console.log(`[ADS] Showing VAST ad for ${type} download...`);
            await showVastAd();
            console.log(`[ADS] Ad completed/skipped, proceeding with download...`);

            // 2. If verified, register the asset in the database
            if (isVerified && currentUserEmail) {
                const data = await safeFetch(`${apiUrl}/register-client`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountType: 'free', email: currentUserEmail, extensionId: type })
                });

                if (data.status === 'success') {
                    if (idDisplayModal) idDisplayModal.textContent = data.clientId;
                    if (idModal) idModal.style.display = 'flex';
                }
            } else {
                // If not verified, just show the login prompt AFTER the download simulation
                // OR just let them download and prompt login for "Cloud Sync / Credits"
                console.log("[DOWNLOAD] User not verified, skipping DB registration.");
            }

            simulateDownload(type);
        });
    });

    copyIdBtnModal?.addEventListener('click', () => {
        if (idDisplayModal) {
            navigator.clipboard.writeText(idDisplayModal.textContent);
            copyIdBtnModal.textContent = 'Copied!';
            setTimeout(() => copyIdBtnModal.textContent = 'Copy to Clipboard', 2000);
        }
    });

    // --- ExoClick Ads Only (Propeller Ads Removed) ---
    // All ad serving is now handled by ExoClick zones embedded in HTML

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

    reviewForm?.addEventListener('submit', async (e) => {
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
        const formData = new FormData(reviewForm);
        const name = formData.get('name') || 'Anonymous';
        const comment = formData.get('comment');
        const rating = ratingInput.value;

        if (!comment) {
            showFeedback(reviewForm.querySelector('textarea'), 'error');
            return;
        }

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Publishing...';

        const res = await safeFetch(`${apiUrl}/add-review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: currentUserEmail, comment, rating })
        });

        if (res.status === 'success') {
            localStorage.setItem(`pp_reviewed_${currentUserEmail}`, 'true');
            btn.textContent = 'Success!';
            btn.style.background = 'var(--accent-green)';
            reviewForm.reset();
            if (ratingInput) ratingInput.value = 5;
            updateStars(5);

            // Refresh reviews to include the new one
            initFloatingReviews();

            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = originalText;
                btn.style.background = '';
            }, 3000);
        } else {
            notify(res.message || 'Error publishing review', 'error');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    // --- Floating Reviews Logic ---
    const fragContainer = document.getElementById('floating-reviews-container');
    let dynamicReviews = [];
    let reviewIndex = 0;

    const spawnFloatingReview = (rev) => {
        if (!fragContainer) return;

        const card = document.createElement('div');
        card.className = 'floating-review';

        // Pick a side: Left (0-15%) or Right (85-100%)
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const horizontalPos = Math.random() * 15; // 0-15% range

        if (side === 'left') {
            card.style.left = `${horizontalPos}%`;
        } else {
            card.style.right = `${horizontalPos}%`;
        }

        // Random duration between 15s and 25s
        const duration = 15 + Math.random() * 10;
        card.style.animationDuration = `${duration}s`;

        const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);

        card.innerHTML = `
            <div class="rev-name">
                <i class="fas fa-user-circle"></i>
                ${rev.name}
            </div>
            <div class="rev-stars">${stars}</div>
            <div class="rev-text">"${rev.comment}"</div>
        `;

        fragContainer.appendChild(card);

        // Cleanup after animation
        setTimeout(() => card.remove(), duration * 1000);
    };

    const initFloatingReviews = async () => {
        const res = await safeFetch(`${apiUrl}/get-reviews`);
        if (res.status === 'success' && res.reviews.length > 0) {
            dynamicReviews = res.reviews;
        } else {
            dynamicReviews = []; // USER: "Ako nema recenzija ne moraju da lete"
        }
    };

    const startReviewLoop = () => {
        setInterval(() => {
            if (dynamicReviews && dynamicReviews.length > 0) {
                const rev = dynamicReviews[reviewIndex];
                spawnFloatingReview(rev);
                reviewIndex = (reviewIndex + 1) % dynamicReviews.length;
            }
        }, 4000); // Spawn every 4 seconds
    };

    initFloatingReviews();
    startReviewLoop();

    // Refresh reviews from DB every 10 minutes (for testing)
    setInterval(initFloatingReviews, 10 * 60 * 1000);
});
