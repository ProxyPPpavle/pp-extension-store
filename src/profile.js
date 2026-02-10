import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const apiUrl = 'https://pp-server-eight.vercel.app';
    const email = localStorage.getItem('pp_user_email') || '';
    const isVerified = localStorage.getItem('pp_verified') === 'true';
    const clientId = localStorage.getItem('pp_client_id') || '';

    // In-memory selection state
    let selectedExtension = 'ppbot';

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
    const adTargetName = document.getElementById('ad-target-name');

    const creditCountEl = document.getElementById('credit-ppbot');
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

    // --- Initialize Info ---
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

    // --- Extensions Interaction ---
    document.querySelectorAll('.extension-item[data-id]').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            selectedExtension = id;

            // Update UI
            document.querySelectorAll('.extension-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            const name = item.querySelector('.name').textContent;
            currentExtName.textContent = name;
            adTargetName.textContent = name;

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
        // Note: For now, one credits column for all extensions, but logic is ready for split
        const data = await safeFetch(`${apiUrl}/check-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId })
        });

        if (data.status === 'success') {
            creditCountEl.textContent = data.credits;
            // Visual feedback of syncing
            creditCountEl.classList.add('glow');
            setTimeout(() => creditCountEl.classList.remove('glow'), 1000);
        } else {
            creditCountEl.textContent = '--';
        }

        const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
        const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');
        adLimitStatus.textContent = `Rewards Used Today: ${adsToday}/6 | Session: ${adsSession}/3`;

        if (adsToday >= 6 || adsSession >= 3) {
            btnWatchAd.disabled = true;
            btnWatchAd.textContent = 'LINK LIMIT REACHED';
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

        // Call Server to Boost Credits
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
            alert('Booster synchronization failed. Check link status.');
        }
    };

    // Initial Load
    updateCreditsUI();
    updateClientIdUI();
});
