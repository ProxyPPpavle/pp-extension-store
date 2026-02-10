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

    const currentExtName = document.getElementById('current-ext-name');
    const creditsLabel = document.getElementById('credits-label');
    const creditCountEl = document.getElementById('credit-count');
    const adTargetDisplay = document.getElementById('ad-target-display');

    const btnWatchAd = document.getElementById('btn-watch-ad');
    const adLimitStatus = document.getElementById('ad-limit-status');
    const adSimulation = document.getElementById('ad-simulation');
    const adTimer = document.getElementById('ad-timer');
    const adProgress = document.getElementById('ad-progress');

    // --- Initialize Top Global Identity ---
    userEmailEl.textContent = email;
    let isIdVisible = false;

    const updateClientIdUI = () => {
        const mask = '••••-••••';
        clientIdEl.textContent = isIdVisible ? clientId : mask;
        btnReveal.innerHTML = isIdVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    };

    btnReveal.addEventListener('click', () => {
        isIdVisible = !isIdVisible;
        updateClientIdUI();
    });

    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(clientId);
        const originalIcon = btnCopy.innerHTML;
        btnCopy.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => btnCopy.innerHTML = originalIcon, 2000);
    });

    // --- Extension Logic ---
    // Note: Reverted to showing ONLY possessed extensions in the active list.
    const navItems = document.querySelectorAll('.ext-nav-item[data-id]:not(.locked)');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            const name = item.getAttribute('data-name');
            activeExtensionId = id;

            navItems.forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            currentExtName.textContent = name;
            creditsLabel.textContent = `${name} Compute Credits`;
            adTargetDisplay.textContent = name;

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

    const updateCreditsUI = async () => {
        // Fetch Live Credits from Server
        const data = await safeFetch(`${apiUrl}/check-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId })
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
            btnWatchAd.textContent = 'Synthesize Credits';
        }
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

        const data = await safeFetch(`${apiUrl}/boost-credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId })
        });

        if (data.status === 'success') {
            const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
            const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');

            localStorage.setItem(`pp_ads_today_${email}`, (adsToday + 1).toString());
            sessionStorage.setItem(`pp_ads_session_${email}`, (adsSession + 1).toString());

            await updateCreditsUI();
        } else {
            alert('Booster synchronization failed.');
        }
    };

    // Initial Load
    updateCreditsUI();
    updateClientIdUI();
});
