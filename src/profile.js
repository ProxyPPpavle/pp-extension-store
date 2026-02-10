import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const apiUrl = 'https://pp-server-eight.vercel.app';
    const email = localStorage.getItem('pp_user_email') || '';
    const isVerified = localStorage.getItem('pp_verified') === 'true';
    const clientId = localStorage.getItem('pp_client_id') || '';

    // Selection state
    let activeExtensionId = 'ppbot';

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
    const adTargetDisplay = document.getElementById('ad-target-display');

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

        // Icon update
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
        changeKeySection.style.display = 'block';
        btnChangeTrigger.disabled = true;

        const res = await safeFetch(`${apiUrl}/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (res.status === 'success') {
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
            adTargetDisplay.textContent = name;

            updateCreditsUI();
        });
    });

    const today = new Date().toDateString();
    const lastAdReset = localStorage.getItem(`pp_ad_reset_${email}`);
    if (lastAdReset !== today) {
        localStorage.setItem(`pp_ad_reset_${email}`, today);
        localStorage.setItem(`pp_ads_today_${email}`, '0');
    }

    const updateCreditsUI = async () => {
        const id = localStorage.getItem('pp_client_id');
        const data = await safeFetch(`${apiUrl}/check-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: id })
        });

        if (data.status === 'success') {
            creditCountEl.textContent = data.credits;
        } else {
            creditCountEl.textContent = '--';
        }

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
        const data = await safeFetch(`${apiUrl}/boost-credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: id })
        });

        if (data.status === 'success') {
            const adsToday = parseInt(localStorage.getItem('pp_ads_today_${email}') || '0');
            const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');

            localStorage.setItem(`pp_ads_today_${email}`, (adsToday + 1).toString());
            sessionStorage.setItem(`pp_ads_session_${email}`, (adsSession + 1).toString());

            await updateCreditsUI();
            notify('Credits boosted successfully!');
        } else {
            notify('Booster synchronization failed.', 'error');
        }
    };

    updateCreditsUI();
    updateClientIdUI();
});
