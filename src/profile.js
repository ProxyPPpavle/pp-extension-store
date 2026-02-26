import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const apiUrl = 'https://pp-server-eight.vercel.app';
    const email = localStorage.getItem('pp_user_email') || '';
    const isVerified = localStorage.getItem('pp_verified') === 'true';
    const clientId = localStorage.getItem('pp_client_id') || '';

    // Selection state
    let activeExtensionId = 'ppbot';
    let userSubscriptions = []; // Tracks which apps the user has premiums for

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
    const creditCountEl = document.getElementById('credit-count');
    const planBadge = document.getElementById('plan-badge');

    const possessedList = document.getElementById('possessed-extensions-list');
    const marketplaceList = document.getElementById('marketplace-list');

    const freePlanView = document.getElementById('free-plan-view');
    const premiumPlanView = document.getElementById('premium-plan-view');
    const btnBuyKey = document.getElementById('btn-buy-key');
    const btnResetKey = document.getElementById('btn-reset-key');

    const paymentModal = document.getElementById('payment-modal');
    const purchaseAppName = document.getElementById('purchase-app-name');
    const btnConfirmPurchase = document.getElementById('btn-confirm-purchase');

    // Toast logic
    const toast = document.getElementById('pp-toast');
    const toastMsg = document.getElementById('toast-msg');

    function notify(message, type = 'success') {
        toastMsg.textContent = message;
        toast.className = type === 'error' ? 'show error' : 'show';
        const icon = toast.querySelector('i');
        icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // --- Logout Logic ---
    btnLogout?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/';
    });

    document.getElementById('btn-exit')?.addEventListener('click', () => {
        window.location.href = '/';
    });

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
        notify('Client ID copied!');
        setTimeout(() => btnCopy.innerHTML = originalIcon, 2000);
    });

    // --- Change Key Logic ---
    btnChangeTrigger.addEventListener('click', async () => {
        changeKeySection.style.display = 'block';
        btnChangeTrigger.disabled = true;
        await safeFetch(`${apiUrl}/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        notify('Security reset code sent to your email.');
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
                notify('Global Client Key updated!');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                notify(res.message || 'Verification failed.', 'error');
            }
        }
    });

    // --- Product & Marketplace Config ---
    const allProducts = [
        { id: 'ppbot', name: 'PPBot (Extension & App)', icon: 'fa-robot', desc: 'Unified AI Assistant' },
        { id: 'ppsaver', name: 'PP Saver (Desktop)', icon: 'fa-sd-card', desc: 'Stealth Text Manager' }
    ];

    const loadData = async () => {
        const res = await safeFetch(`${apiUrl}/get-user-assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (res.status === 'success') {
            userSubscriptions = res.assets;
            renderMarketAndManage();
        }
    };

    const renderMarketAndManage = () => {
        possessedList.innerHTML = '';
        marketplaceList.innerHTML = '';

        const subIds = userSubscriptions.map(s => s.extension_id);

        allProducts.forEach(product => {
            const hasUsed = subIds.includes(product.id);
            const subData = userSubscriptions.find(s => s.extension_id === product.id);
            const isPremium = subData?.account_type === 'premium';

            const item = document.createElement('div');
            item.className = `ext-nav-item ${product.id === activeExtensionId ? 'active' : ''}`;
            item.innerHTML = `
                <i class="fas ${product.icon}"></i>
                <div class="ext-nav-text">
                    <span class="name">${product.name}</span>
                    <span class="sub">${isPremium ? 'PREMIUM KEY' : 'FREE USER'}</span>
                </div>
                ${isPremium ? '<div class="dot"></div>' : ''}
            `;

            item.addEventListener('click', () => {
                activeExtensionId = product.id;
                document.querySelectorAll('.ext-nav-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                switchAsset(product.id, product.name);
            });

            if (hasUsed || isPremium) {
                possessedList.appendChild(item);
            } else {
                marketplaceList.appendChild(item);
            }
        });

        const activeProd = allProducts.find(p => p.id === activeExtensionId);
        if (activeProd) switchAsset(activeExtensionId, activeProd.name);
    };

    const switchAsset = async (id, name) => {
        activeExtensionId = id;
        currentExtName.textContent = name;

        const subData = userSubscriptions.find(s => s.extension_id === id);
        const isPremium = subData?.account_type === 'premium';

        if (isPremium) {
            planBadge.textContent = 'PREMIUM PLAN';
            planBadge.style.background = 'rgba(251, 191, 36, 0.2)';
            planBadge.style.color = '#fbbf24';
            freePlanView.style.display = 'none';
            premiumPlanView.style.display = 'block';
        } else {
            planBadge.textContent = id === 'ppsaver' ? 'BETA VERSION' : 'FREE VERSION';
            planBadge.style.background = id === 'ppsaver' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)';
            planBadge.style.color = id === 'ppsaver' ? '#3b82f6' : '#fff';
            freePlanView.style.display = 'block';
            premiumPlanView.style.display = 'none';

            // Hide upgrade button for Beta apps
            if (id === 'ppsaver') {
                btnBuyKey.style.display = 'none';
                const betaMsg = document.createElement('p');
                betaMsg.id = 'beta-notice';
                betaMsg.style.fontSize = '0.75rem';
                betaMsg.style.color = 'var(--text-gray)';
                betaMsg.style.marginTop = '1rem';
                betaMsg.innerHTML = '<i class="fas fa-info-circle"></i> Premium features are currently disabled during the Beta phase.';

                // Remove existing notice if any
                document.getElementById('beta-notice')?.remove();
                freePlanView.appendChild(betaMsg);
            } else {
                btnBuyKey.style.display = 'block';
                document.getElementById('beta-notice')?.remove();
            }
        }

        creditCountEl.textContent = '...';
        const data = await safeFetch(`${apiUrl}/check-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, extension_id: id })
        });

        if (data.status === 'success') {
            creditCountEl.textContent = data.credits;
        } else {
            creditCountEl.textContent = '3';
        }
    };

    btnBuyKey?.addEventListener('click', () => {
        const product = allProducts.find(p => p.id === activeExtensionId);
        purchaseAppName.textContent = product.name;
        paymentModal.style.display = 'flex';
    });

    btnConfirmPurchase?.addEventListener('click', async () => {
        btnConfirmPurchase.disabled = true;
        btnConfirmPurchase.textContent = 'Processing...';

        const res = await safeFetch(`${apiUrl}/upgrade-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                extension_id: activeExtensionId,
                clientId
            })
        });

        if (res.status === 'success') {
            notify(`Premium Key activated for ${activeExtensionId}!`);
            paymentModal.style.display = 'none';
            await loadData();
        } else {
            notify('Payment simulation failed.', 'error');
        }

        btnConfirmPurchase.disabled = false;
        btnConfirmPurchase.textContent = 'Complete Payment';
    });

    btnResetKey?.addEventListener('click', () => {
        if (confirm("Reset key access? This will force the app to re-sync with your Client ID.")) {
            notify("Key access signal reset.");
        }
    });

    loadData();
    updateClientIdUI();
});
