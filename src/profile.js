import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const apiUrl = 'https://pp-server-eight.vercel.app';
    const email = localStorage.getItem('pp_user_email') || '';
    const isVerified = localStorage.getItem('pp_verified') === 'true';
    const clientId = localStorage.getItem('pp_client_id') || '';

    // Selection state
    let activeExtensionId = 'ppbot';
    let availableAssets = [];

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
    const btnLogout = document.getElementById('btn-logout');
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
    const possessedList = document.getElementById('possessed-extensions-list');

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

    // --- Logout Logic ---
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('pp_user_email');
            localStorage.removeItem('pp_verified');
            localStorage.removeItem('pp_client_id');
            // Optional: clear cached credits to privacy
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('pp_last_credits_')) localStorage.removeItem(key);
            });
            window.location.href = '/';
        });
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

    // --- Dynamic Asset Loading ---
    const loadAssets = async () => {
        const res = await safeFetch(`${apiUrl}/get-user-assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (res.status === 'success') {
            availableAssets = res.assets;
            renderAssetList();
        } else {
            possessedList.innerHTML = '<div class="ext-nav-empty">No active extensions found.</div>';
        }
    };

    const assetConfig = {
        'ppbot': { name: 'PPBot Standard', icon: 'fa-robot' },
        'pp-screen': { name: 'PP Screen', icon: 'fa-desktop' },
        'predictor': { name: 'PP Predictor', icon: 'fa-chart-pie' }
    };

    const renderAssetList = () => {
        const activeAssets = availableAssets.filter(a => a.extension_id !== 'predictor');

        if (activeAssets.length === 0) {
            possessedList.innerHTML = '<div class="ext-nav-empty">No active extensions.</div>';
            return;
        }

        possessedList.innerHTML = '';
        activeAssets.forEach(asset => {
            const config = assetConfig[asset.extension_id] || { name: asset.extension_id, icon: 'fa-plug' };
            const isActive = asset.extension_id === activeExtensionId;

            const item = document.createElement('div');
            item.className = `ext-nav-item ${isActive ? 'active' : ''}`;
            item.setAttribute('data-id', asset.extension_id);
            item.setAttribute('data-name', config.name);
            item.innerHTML = `
                <i class="fas ${config.icon}"></i>
                <div class="ext-nav-text">
                    <span class="name">${config.name}</span>
                    <span class="sub">${asset.account_type.toUpperCase()} Account</span>
                </div>
                <div class="dot"></div>
            `;

            item.addEventListener('click', () => {
                activeExtensionId = asset.extension_id;
                document.querySelectorAll('.ext-nav-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                switchAsset(asset.extension_id, config.name);
            });

            possessedList.appendChild(item);
        });

        // Set initial name and switch to the first valid asset
        const initial = activeAssets[0];
        const initialConfig = assetConfig[initial.extension_id] || { name: initial.extension_id };
        activeExtensionId = initial.extension_id;
        switchAsset(initial.extension_id, initialConfig.name);
    };

    const switchAsset = (id, name) => {
        currentExtName.textContent = name;
        creditsLabel.textContent = `Compute Credits (Sync via Client ID)`;
        if (adTargetName) adTargetName.textContent = name;
        updateCreditsUI(true); // Force update when switching
    };

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
                body: JSON.stringify({ clientId: id, extension_id: activeExtensionId }) // Fixed: changed extensionId to extension_id for check
            });

            if (data.status === 'success') {
                cachedCredits = data.credits.toString();
                localStorage.setItem(cacheKey, cachedCredits);
            } else {
                cachedCredits = '0';
            }
        }

        creditCountEl.textContent = cachedCredits || '0';

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

    // --- VAST Video Ad for Credits ---
    const VAST_URL = 'https://s.magsrv.com/v1/vast.php?idzone=5851404&ex_av=name';
    const VAST_BACKUP_URL = 'https://s.magsrv.com/v1/vast.php?idzone=5851416&ex_av=name';
    const profileVastVideo = document.getElementById('profile-vast-video');
    const profileVastCountdown = document.getElementById('profile-vast-countdown');
    const profileVastTimer = document.getElementById('profile-vast-timer');
    const profileVastProgress = document.getElementById('profile-vast-progress');
    const profileVastProgressClickArea = document.getElementById('profile-vast-progress-click-area');

    let vastCountdownInterval = null;
    let profileClickThroughUrl = '';
    let qSentProfile = { q1: false, q2: false, q3: false, comp: false };

    const loadProfileVast = async (isBackup = false) => {
        const vastUrl = isBackup ? VAST_BACKUP_URL : VAST_URL;
        try {
            const allImpressions = [];
            const allTracking = {
                start: [], firstQuartile: [], midpoint: [], thirdQuartile: [], complete: [], creativeView: [],
                clickTracking: []
            };
            let mediaFile = null;
            let clickThrough = null;
            let currentUrl = vastUrl;
            let depth = 0;

            // --- VAST Follower (Handles Wrappers up to 5 levels) ---
            while (depth < 5) {
                const response = await fetch(currentUrl);
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

                const getTags = (name) => xmlDoc.getElementsByTagName(name);
                for (let imp of getTags('Impression')) allImpressions.push(imp.textContent.trim());
                for (let track of getTags('Tracking')) {
                    const event = track.getAttribute('event');
                    if (allTracking[event]) allTracking[event].push(track.textContent.trim());
                }
                for (let ct of getTags('ClickTracking')) allTracking.clickTracking.push(ct.textContent.trim());

                const ctElem = getTags('ClickThrough')[0];
                if (ctElem && !clickThrough) clickThrough = ctElem.textContent.trim();

                const mfElem = getTags('MediaFile')[0];
                if (mfElem) {
                    mediaFile = mfElem.textContent.trim();
                    break;
                }

                const wrapperElem = getTags('VASTAdTagURI')[0];
                if (wrapperElem) {
                    currentUrl = wrapperElem.textContent.trim();
                    depth++;
                } else {
                    break;
                }
            }

            if (mediaFile && profileVastVideo) {
                profileVastVideo.src = mediaFile;
                profileClickThroughUrl = clickThrough;
                qSentProfile = { q1: false, q2: false, q3: false, comp: false };

                window._vast_beacons = window._vast_beacons || [];
                const fireTrackingUrl = (url) => {
                    if (!url) return;
                    const cleanUrl = url.trim();
                    if (!cleanUrl) return;
                    console.log('[VAST Profile Tracking] Firing Pixel:', cleanUrl);
                    const img = new Image();
                    window._vast_beacons.push(img);
                    img.onload = img.onerror = () => {
                        const idx = window._vast_beacons.indexOf(img);
                        if (idx > -1) window._vast_beacons.splice(idx, 1);
                    };
                    img.src = cleanUrl;
                };

                const fireEvent = (eventName) => {
                    if (allTracking[eventName]) {
                        allTracking[eventName].forEach(url => fireTrackingUrl(url));
                    }
                };

                profileVastVideo.onloadedmetadata = () => fireEvent('creativeView');

                let impressionsFired = false;
                profileVastVideo.ontimeupdate = () => {
                    if (!impressionsFired && profileVastVideo.currentTime > 0.5) {
                        allImpressions.forEach(url => fireTrackingUrl(url));
                        fireEvent('start');
                        impressionsFired = true;
                    }

                    if (profileVastVideo.duration > 0) {
                        const progress = profileVastVideo.currentTime / profileVastVideo.duration;
                        if (!qSentProfile.q1 && progress >= 0.25) { fireEvent('firstQuartile'); qSentProfile.q1 = true; }
                        if (!qSentProfile.q2 && progress >= 0.50) { fireEvent('midpoint'); qSentProfile.q2 = true; }
                        if (!qSentProfile.q3 && progress >= 0.75) { fireEvent('thirdQuartile'); qSentProfile.q3 = true; }

                        // Revenue: Complete signal
                        if (!qSentProfile.comp && progress >= 0.96) {
                            fireEvent('complete');
                            qSentProfile.comp = true;
                            console.log('[VAST Profile] Complete fired at 96%');
                        }

                        if (profileVastProgress) {
                            profileVastProgress.style.width = `${progress * 100}%`;
                        }
                    }
                };

                const handleAdClick = (e) => {
                    console.log('[VAST Profile] User clicked ad');
                    allTracking.clickTracking.forEach(url => fireTrackingUrl(url));
                    if (profileClickThroughUrl) window.open(profileClickThroughUrl, '_blank');
                };

                profileVastVideo.onclick = handleAdClick;
                if (profileVastProgressClickArea) profileVastProgressClickArea.onclick = handleAdClick;

                profileVastVideo.onended = () => {
                    if (!qSentProfile.comp) { fireEvent('complete'); qSentProfile.comp = true; }
                    closeProfileVast();
                    finishAd();
                };

                profileVastVideo.play().catch(() => { });
            } else {
                if (!isBackup) loadProfileVast(true);
                else setTimeout(finishAd, 15000);
            }
        } catch (err) {
            console.error('[VAST Profile] Load error:', err);
            if (!isBackup) loadProfileVast(true);
            else setTimeout(finishAd, 15000);
        }
    };

    const closeProfileVast = () => {
        if (adSimulation) adSimulation.style.display = 'none';
        if (profileVastVideo) {
            profileVastVideo.pause();
            profileVastVideo.src = '';
        }
        if (vastCountdownInterval) clearInterval(vastCountdownInterval);
    };

    btnWatchAd.addEventListener('click', () => {
        const adsToday = parseInt(localStorage.getItem(`pp_ads_today_${email}`) || '0');
        const adsSession = parseInt(sessionStorage.getItem(`pp_ads_session_${email}`) || '0');
        if (adsToday >= 6 || adsSession >= 3) return;

        adSimulation.style.display = 'flex';
        if (profileVastCountdown) profileVastCountdown.style.display = 'block';
        if (profileVastTimer) profileVastTimer.textContent = '15';

        loadProfileVast();

        let timeLeft = 15;
        vastCountdownInterval = setInterval(() => {
            timeLeft--;
            if (profileVastTimer) profileVastTimer.textContent = (timeLeft > 0) ? timeLeft : 0;

            if (timeLeft <= 0) {
                clearInterval(vastCountdownInterval);
                if (profileVastCountdown) profileVastCountdown.style.display = 'none';
            }
        }, 1000);
    });

    const finishAd = async () => {
        closeProfileVast();
        const id = localStorage.getItem('pp_client_id');
        const cacheKey = `pp_last_credits_${activeExtensionId}`;

        // 1. Tell database to boost
        const data = await safeFetch(`${apiUrl}/boost-credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: id, extension_id: activeExtensionId })
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

    loadAssets();
    updateClientIdUI();
});
