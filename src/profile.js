import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const email = localStorage.getItem('pp_user_email') || '';
    const isVerified = localStorage.getItem('pp_verified') === 'true';
    const clientId = localStorage.getItem('pp_client_id') || 'PP-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    if (!isVerified || !email) {
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

    const creditsEls = {
        ppbot: document.getElementById('credit-ppbot'),
        predictor: document.getElementById('credit-predictor'),
        desktop: document.getElementById('credit-desktop')
    };

    const btnWatchAd = document.getElementById('btn-watch-ad');
    const adTargetSelect = document.getElementById('ad-target-select');
    const adLimitStatus = document.getElementById('ad-limit-status');
    const adSimulation = document.getElementById('ad-simulation');
    const adTimer = document.getElementById('ad-timer');
    const adProgress = document.getElementById('ad-progress');

    // --- Initialize Info ---
    userEmailEl.textContent = email;
    let isIdVisible = false;

    const updateClientIdUI = () => {
        clientIdEl.textContent = isIdVisible ? clientId : '••••-••••';
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

    // --- Change Key Logic ---
    btnChangeTrigger.addEventListener('click', () => {
        changeKeySection.style.display = 'block';
        alert('Verification code simulated: check your (imaginary) email for "RESET CODE"');
    });

    btnCancelChange.addEventListener('click', () => {
        changeKeySection.style.display = 'none';
        resetCodeInput.value = '';
    });

    btnConfirmChange.addEventListener('click', () => {
        if (resetCodeInput.value.length === 6) {
            const newId = 'PP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            localStorage.setItem('pp_client_id', newId);
            window.location.reload();
        } else {
            alert('Please enter a valid 6-digit code.');
        }
    });

    // --- Credits Logic ---
    const services = ['ppbot', 'predictor', 'desktop'];
    const today = new Date().toDateString();

    // Daily Reset / Init
    const lastLogin = localStorage.getItem(`pp_last_login_${email}`);
    if (lastLogin !== today) {
        localStorage.setItem(`pp_last_login_${email}`, today);
        localStorage.setItem(`pp_ads_today_${email}`, '0');
        // Initial daily credits
        services.forEach(s => {
            localStorage.setItem(`pp_credits_${email}_${s}`, '10');
        });
    }

    const updateCreditsUI = () => {
        services.forEach(s => {
            const val = localStorage.getItem(`pp_credits_${email}_${s}`) || '0';
            creditsEls[s].textContent = val;
        });

        const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
        const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');
        adLimitStatus.textContent = `Ads used today: ${adsToday}/6 | Session: ${adsSession}/3`;

        if (adsToday >= 6 || adsSession >= 3) {
            btnWatchAd.disabled = true;
            btnWatchAd.textContent = 'Daily/Session Limit Reached';
        }
    };

    // --- Ad Logic ---
    btnWatchAd.addEventListener('click', () => {
        const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
        const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');

        if (adsToday >= 6 || adsSession >= 3) return;

        adSimulation.style.display = 'flex';
        let timeLeft = 15;
        adTimer.textContent = `Advertisement (${timeLeft}s)`;
        adProgress.style.width = '0%';

        const interval = setInterval(() => {
            timeLeft--;
            adTimer.textContent = `Advertisement (${timeLeft}s)`;
            adProgress.style.width = `${((15 - timeLeft) / 15) * 100}%`;

            if (timeLeft <= 0) {
                clearInterval(interval);
                finishAd();
            }
        }, 1000);
    });

    const finishAd = () => {
        adSimulation.style.display = 'none';
        const target = adTargetSelect.value;
        const currentCredits = parseInt(localStorage.getItem(`pp_credits_${email}_${target}`) || '0');
        localStorage.setItem(`pp_credits_${email}_${target}`, (currentCredits + 2).toString());

        const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
        const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');

        localStorage.setItem(`pp_ads_today_${email}`, (adsToday + 1).toString());
        sessionStorage.setItem(`pp_ads_session_${email}`, (adsSession + 1).toString());

        updateCreditsUI();
        alert(`Success! +2 Credits added to ${target.toUpperCase()}`);
    };

    updateCreditsUI();
    updateClientIdUI();
});
