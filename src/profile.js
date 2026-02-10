import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const apiUrl = 'https://pp-server-eight.vercel.app';
    const email = localStorage.getItem('pp_user_email') || '';
    const isVerified = localStorage.getItem('pp_verified') === 'true';
    const clientId = localStorage.getItem('pp_client_id') || '';

    // In-memory UI Selection
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

    // --- Helpers ---
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

    // --- Initialize Bottom Global Identity ---
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

    // --- Extension Switching Logic ---
    const navItems = document.querySelectorAll('.ext-nav-item[data-id]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            const name = item.getAttribute('data-name');

            // Switch State
            activeExtensionId = id;

            // Update Sidebar UI
            navItems.forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            // Update Main View
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
        // Note: Currently server has 1 credit column. 
        // We'll split it in the UI for Predictor if needed, or just show the same for demo.
        const data = await safeFetch(`${apiUrl}/check-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId })
        });

        if (data.status === 'success') {
            // DEMO LOGIC: If it's predictor, maybe show a different number or simulated split
            if (activeExtensionId === 'predictor') {
                // Mocking: Just show -10 credits to differentiate for the user
                creditCountEl.textContent = Math.max(0, data.credits - 10);
            } else {
                creditCountEl.textContent = data.credits;
            }
        } else {
            creditCountEl.textContent = '--';
        }

        const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
        const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');
        adLimitStatus.textContent = `Limit Check: ${adsToday}/6 Rewards Today | ${adsSession}/3 Session`;

        if (adsToday >= 6 || adsSession >= 3) {
            btnWatchAd.disabled = true;
            btnWatchAd.textContent = 'LINK LIMIT REACHED';
        } else {
            btnWatchAd.disabled = false;
            btnWatchAd.textContent = 'Initiate Boost';
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

        // Sync with server
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
            alert('Booster synchronization failed. Check identity uplink.');
        }
    };

    // Initial Load
    updateCreditsUI();
    updateClientIdUI();
});
