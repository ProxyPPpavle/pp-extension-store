import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const apiUrl = 'https://pp-server-eight.vercel.app';
    const email = localStorage.getItem('pp_user_email') || '';
    const isVerified = localStorage.getItem('pp_verified') === 'true';
    const clientId = localStorage.getItem('pp_client_id') || '';

    // Selection state
    let activeExtensionId = 'ppbot';

    // Optimization: Visit Tracking
    let visitCount = parseInt(localStorage.getItem('pp_profile_visits') || '0');
    visitCount++;
    localStorage.setItem('pp_profile_visits', visitCount.toString());

    if (!isVerified || !email || !clientId) {
        window.location.href = '/';
        return;
    }

    // --- UI Elements ---
    const userEmailEl = document.getElementById('user-email');
    const clientIdEl = document.getElementById('client-id');
    const btnReveal = document.getElementById('btn-reveal');
    const btnCopy = document.getElementById('btn-copy');
    const btnChangeTrigger = document.getElementById('btn-change-trigger');
    const changeKeySection = document.getElementById('change-key-section');
    const resetCodeInput = document.getElementById('reset-code');
    const btnConfirmChange = document.getElementById('btn-confirm-change');
    const btnCancelChange = document.getElementById('btn-cancel-change');

    const currentExtName = document.getElementById('current-ext-name');
    const creditsLabel = document.getElementById('credits-label');
    const creditCountEl = document.getElementById('credit-count');
    const adTargetName = document.getElementById('ad-target-name');

    const btnWatchAd = document.getElementById('btn-watch-ad');
    const adLimitStatus = document.getElementById('ad-limit-status');
    const adSimulation = document.getElementById('ad-simulation');
    const adTimer = document.getElementById('ad-timer');
    const adProgress = document.getElementById('ad-progress');

    // Toast logic
    const toast = document.getElementById('pp-toast');
    const toastMsg = document.getElementById('toast-msg');

    function notify(message, type = 'success') {
        toastMsg.textContent = message;
        toast.className = type === 'error' ? 'show error' : 'show';

        const icon = toast.querySelector('i');
        icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';

        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // --- Initialize Top Global Identity ---
    userEmailEl.textContent = email;
    let isIdVisible = false;

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

    const updateClientIdUI = () => {
        const mask = '••••-••••';
        const displayId = localStorage.getItem('pp_client_id') || 'PP-ERR';
        clientIdEl.textContent = isIdVisible ? displayId : mask;
        btnReveal.innerHTML = isIdVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    };

    btnReveal.addEventListener('click', () => {
        isIdVisible = !isIdVisible;
        updateClientIdUI();
    });

    btnCopy.addEventListener('click', () => {
        const id = localStorage.getItem('pp_client_id');
        navigator.clipboard.writeText(id);
        const originalIcon = btnCopy.innerHTML;
        btnCopy.innerHTML = '<i class="fas fa-check"></i>';
        notify('Client ID copied to clipboard!');
        setTimeout(() => btnCopy.innerHTML = originalIcon, 2000);
    });

    // --- Change Key Logic ---
    btnChangeTrigger.addEventListener('click', async () => {
        const lastRequest = parseInt(localStorage.getItem('pp_last_reset_request') || '0');
        const now = Date.now();
        const cooldown = 60000;

        if (now - lastRequest < cooldown) {
            const wait = Math.ceil((cooldown - (now - lastRequest)) / 1000);
            notify(`Wait ${wait}s before another request.`, 'error');
            return;
        }

        changeKeySection.style.display = 'block';
        btnChangeTrigger.disabled = true;

        const res = await safeFetch(`${apiUrl}/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (res.status === 'success') {
            localStorage.setItem('pp_last_reset_request', Date.now().toString());
            notify('Security reset code sent to your email.');
        } else {
            notify('Failed to send reset code. Try again.', 'error');
            changeKeySection.style.display = 'none';
            btnChangeTrigger.disabled = false;
        }
    });

    btnCancelChange.addEventListener('click', () => {
        changeKeySection.style.display = 'none';
        btnChangeTrigger.disabled = false;
        resetCodeInput.value = '';
    });

    btnConfirmChange.addEventListener('click', async () => {
        const code = resetCodeInput.value.trim();
        if (code.length === 6) {
            const res = await safeFetch(`${apiUrl}/reset-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            if (res.status === 'success') {
                localStorage.setItem('pp_client_id', res.newClientId);
                // Clear cached credits for all extensions on ID change
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('pp_last_credits_')) localStorage.removeItem(key);
                });
                notify('Global Client Key successfully updated!');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                notify(res.message || 'Verification failed.', 'error');
            }
        } else {
            notify('Enter the 6-digit security code.', 'error');
        }
    });

    const navItems = document.querySelectorAll('.ext-nav-item[data-id]:not(.locked)');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            const name = item.getAttribute('data-name');
            activeExtensionId = id;

            navItems.forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            currentExtName.textContent = name;
            creditsLabel.textContent = `Compute Credits (Sync via Client ID)`;
            if (adTargetName) adTargetName.textContent = name;

            updateCreditsUI();
        });
    });

    // --- Credits & Ad Logic ---
    const today = new Date().toDateString();
    const lastAdReset = localStorage.getItem(`pp_ad_reset_${email}`);
    if (lastAdReset !== today) {
        localStorage.setItem(`pp_ad_reset_${email}`, today);
        localStorage.setItem(`pp_ads_today_${email}`, '0');
    }

    const updateCreditsUI = async (forceFetch = false) => {
        const id = localStorage.getItem('pp_client_id');
        const cacheKey = `pp_last_credits_${activeExtensionId}`;
        let cachedCredits = localStorage.getItem(cacheKey);

        // Strategy: Only fetch if forceFetch, OR first time for this ext, OR every 10th visit
        const shouldFetch = forceFetch || !cachedCredits || visitCount === 1 || visitCount % 10 === 0;

        if (shouldFetch) {
            const data = await safeFetch(`${apiUrl}/check-client`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: id, extensionId: activeExtensionId })
            });

            if (data.status === 'success') {
                cachedCredits = data.credits.toString();
                localStorage.setItem(cacheKey, cachedCredits);
            } else {
                // If it doesn't exist in DB, maybe it hasn't been registered. Show 0 or fetch from server.
                cachedCredits = '0';
            }
        }

        creditCountEl.textContent = cachedCredits || '--';

        const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
        const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');
        adLimitStatus.textContent = `Today: ${adsToday}/6 Rewards Used | Session: ${adsSession}/3`;

        if (adsToday >= 6 || adsSession >= 3) {
            btnWatchAd.disabled = true;
            btnWatchAd.textContent = 'LIMIT REACHED';
        } else {
            btnWatchAd.disabled = false;
            btnWatchAd.textContent = 'Add Credits (Watch Ad)';
        }
    };

    btnWatchAd.addEventListener('click', () => {
        const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
        const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');
        if (adsToday >= 6 || adsSession >= 3) return;

        adSimulation.style.display = 'flex';
        let timeLeft = 15;
        adTimer.textContent = `${timeLeft}s`;
        adProgress.style.width = '0%';

        const interval = setInterval(() => {
            timeLeft--;
            adTimer.textContent = `${timeLeft}s`;
            adProgress.style.width = `${((15 - timeLeft) / 15) * 100}%`;

            if (timeLeft <= 0) {
                clearInterval(interval);
                finishAd();
            }
        }, 1000);
    });

    const finishAd = async () => {
        adSimulation.style.display = 'none';
        const id = localStorage.getItem('pp_client_id');
        const cacheKey = `pp_last_credits_${activeExtensionId}`;

        // 1. Tell database to boost
        const data = await safeFetch(`${apiUrl}/boost-credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: id, extensionId: activeExtensionId })
        });

        if (data.status === 'success') {
            // 2. Optimization: Update UI & LocalStorage without fresh fetch
            let updatedCredits = parseInt(localStorage.getItem(cacheKey) || '0') + 2;
            localStorage.setItem(cacheKey, updatedCredits.toString());
            creditCountEl.textContent = updatedCredits;

            const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
            const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');

            localStorage.setItem(`pp_ads_today_${email}`, (adsToday + 1).toString());
            sessionStorage.setItem(`pp_ads_session_${email}`, (adsSession + 1).toString());

            notify('Credits boosted successfully!');

            // Re-update the limit text
            const newAdsToday = adsToday + 1;
            const newAdsSession = adsSession + 1;
            adLimitStatus.textContent = `Today: ${newAdsToday}/6 Rewards Used | Session: ${newAdsSession}/3`;
            if (newAdsToday >= 6 || newAdsSession >= 3) {
                btnWatchAd.disabled = true;
                btnWatchAd.textContent = 'LIMIT REACHED';
            }
        } else {
            notify('Booster synchronization failed.', 'error');
        }
    };

    updateCreditsUI();
    updateClientIdUI();
});
