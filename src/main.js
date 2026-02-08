import './style.css';
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            offset: 100,
            easing: 'ease-out-cubic'
        });
    }

    // Navbar scroll effect
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(5, 5, 5, 0.95)';
            nav.style.padding = '0.5rem 0';
            nav.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        } else {
            nav.style.background = 'rgba(5, 5, 5, 0.7)';
            nav.style.padding = '1rem 0';
            nav.style.boxShadow = 'none';
        }
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.classList.contains('download-trigger')) return;
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- Global Error Silencing for Ad Scripts ---
    if (window.performance && window.performance.measure) {
        const originalMeasure = window.performance.measure.bind(window.performance);
        window.performance.measure = function (name, startMark, endMark) {
            try {
                if (startMark && !performance.getEntriesByName(startMark).length) performance.mark(startMark);
                if (endMark && !performance.getEntriesByName(endMark).length) performance.mark(endMark);
                return originalMeasure(name, startMark, endMark);
            } catch (e) { }
        };
    }

    // --- Ad Injection Logic ---
    const adStorage = {
        canShowVignette: true,
        pushInjected: false,
        banner1Injected: false,
        banner2Injected: false,
        clickCount: 0
    };

    const injectVignette = () => {
        if (!adStorage.canShowVignette) return;

        try {
            // Čistimo stare skripte i objekte da ne bi dolazilo do konflikta
            document.querySelectorAll('script[src*="vignette.min.js"]').forEach(s => s.remove());

            // Ispaljujemo skriptu
            const s = document.createElement('script');
            s.dataset.zone = '10582470';
            s.src = 'https://gizokraijaw.net/vignette.min.js';
            s.setAttribute('data-cfasync', 'false');
            (document.head || document.documentElement).appendChild(s);

        } catch (err) { }

        adStorage.canShowVignette = false;
    };

    const injectPushScript = () => {
        if (adStorage.pushInjected) return;
        const push = document.createElement('script');
        push.src = 'https://3nbf4.com/act/files/tag.min.js?z=10582477';
        push.setAttribute('data-cfasync', 'false');
        push.async = true;
        document.body.appendChild(push);
        adStorage.pushInjected = true;
    };

    // Dedicated container for looped ads
    let adContainer = document.getElementById('ad-loop-container');
    if (!adContainer) {
        adContainer = document.createElement('div');
        adContainer.id = 'ad-loop-container';
        adContainer.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
        document.body.appendChild(adContainer);
    }

    const injectImmediateAds = () => {
        try {
            // Potpuno čišćenje kontejnera pre nove injekcije
            adContainer.innerHTML = '';

            // Banner Push 1
            const s1 = document.createElement('script');
            s1.dataset.zone = '10582494';
            s1.src = 'https://nap5k.com/tag.min.js';
            adContainer.appendChild(s1);

            // Banner Push 2
            const s2 = document.createElement('script');
            s2.dataset.zone = '10584340';
            s2.src = 'https://nap5k.com/tag.min.js';
            adContainer.appendChild(s2);
        } catch (e) { }
    };

    // --- Soft Ask (Performance & Support) ---
    const showPushModal = () => {
        if (window.Notification && Notification.permission !== 'granted' && !localStorage.getItem('push_consent_given')) {
            setTimeout(() => {
                const modal = document.getElementById('push-consent');
                if (modal) modal.classList.add('active');
            }, 6000);
        } else if (Notification.permission === 'granted') {
            injectPushScript();
        }
    };

    document.getElementById('push-allow')?.addEventListener('click', (e) => {
        e.stopPropagation();
        injectPushScript();
        localStorage.setItem('push_consent_given', 'true');
        document.getElementById('push-consent').classList.remove('active');
    });

    document.getElementById('push-deny')?.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('push_consent_given', 'denied');
        document.getElementById('push-consent').classList.remove('active');
    });

    // --- AD GUARDIAN (Non-stop Loop) ---
    const startAdGuardian = () => {
        setInterval(() => {
            // Provera da li postoji bilo koji ad iframe (Propeller specifičan)
            const hasAds = document.querySelectorAll('iframe[id*="pro-"], div[class*="pro-"], [id*="inpage_push"]').length > 0;
            if (!hasAds) {
                injectImmediateAds();
            }
        }, 3000); // Brža provera (3 sekunde)
    };

    // --- UI Helpers & Robust Fetch ---
    async function safeFetch(url, options = {}) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data;
        } catch (err) {
            console.warn(`[API] Failure at ${url}:`, err.message);
            return { status: 'error', message: err.message };
        }
    }

    // POKRETANJE
    setTimeout(injectVignette, 500);
    setTimeout(() => {
        try {
            injectImmediateAds();
            startAdGuardian();
        } catch (e) { console.warn("Ad components initialized with warnings."); }
    }, 2000);
    showPushModal();

    // --- Interaction Triggers ---

    // 1. Specijalni trigger za high-value dugmiće
    const hiTriggers = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-partner, .download-trigger');
    hiTriggers.forEach(btn => {
        btn.addEventListener('click', () => {
            adStorage.canShowVignette = true;
            injectVignette();
        });
    });

    // 2. Globalni click listener (svaka 3 klika resetuje Vignette)
    document.addEventListener('click', () => {
        adStorage.clickCount++;
        if (adStorage.clickCount % 3 === 0) {
            adStorage.canShowVignette = true;
        }
        injectVignette();
    });

    // Vremenski reset za Vignette (svaka 2 minuta)
    setInterval(() => {
        adStorage.canShowVignette = true;
    }, 2 * 60 * 1000);

    // --- Registration & Email Verification Logic ---
    const topEmailInput = document.getElementById('user-email-top');
    const loginBtn = document.getElementById('btn-login-top');
    const codeSection = document.getElementById('code-section');
    const codeInput = document.getElementById('verify-code-input');
    const downloadTriggers = document.querySelectorAll('.download-trigger');
    const loginBox = document.querySelector('.login-box');
    const verifiedSection = document.getElementById('verified-section');
    const emailSection = document.getElementById('email-section');
    const displayClientId = document.getElementById('display-client-id');
    const authInstruction = document.getElementById('auth-instruction');
    const modal = document.getElementById('id-modal');
    const idDisplay = document.getElementById('generated-id');

    let currentUserEmail = localStorage.getItem('pp_user_email') || '';
    let isVerified = localStorage.getItem('pp_verified') === 'true';
    let savedClientId = localStorage.getItem('pp_client_id') || '';

    const showFeedback = (el, type) => {
        el.classList.remove('input-success', 'input-error');
        void el.offsetWidth; // Trigger reflow
        el.classList.add(`input-${type}`);
        setTimeout(() => el.classList.remove(`input-${type}`), 3000);
    };

    const updateUIForVerified = (cid) => {
        isVerified = true;
        savedClientId = cid;
        localStorage.setItem('pp_verified', 'true');
        localStorage.setItem('pp_client_id', cid);

        loginBox.classList.add('verified');
        emailSection.style.display = 'none';
        codeSection.style.display = 'none';
        loginBtn.style.display = 'none';
        authInstruction.textContent = "Welcome back, Member! Your access is active.";

        displayClientId.textContent = cid;
        verifiedSection.style.display = 'block';

        if (currentUserEmail) document.getElementById('review-email').value = currentUserEmail;
    };

    if (isVerified && savedClientId) {
        updateUIForVerified(savedClientId);
    }

    loginBtn.addEventListener('click', async () => {
        const email = topEmailInput.value.trim();
        const code = codeInput.value.trim();
        const apiUrl = import.meta.env.VITE_API_URL || 'https://pp-server-eight.vercel.app';

        if (loginBtn.textContent === 'Verify Status') {
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

                codeSection.style.display = 'flex';
                loginBtn.textContent = 'Confirm Code';
                topEmailInput.disabled = true;
            } else {
                showFeedback(topEmailInput, 'error');
                loginBtn.textContent = 'Verify Status';
            }
            loginBtn.disabled = false;

        } else {
            if (!code || code.length !== 4) {
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
                setTimeout(() => updateUIForVerified(data.clientId), 500);
            } else {
                showFeedback(codeInput, 'error');
                loginBtn.textContent = 'Confirm Code';
                loginBtn.disabled = false;
            }
        }
    });

    // Mini-copy logic
    document.getElementById('btn-copy-id-mini').addEventListener('click', (e) => {
        navigator.clipboard.writeText(savedClientId);
        e.target.textContent = 'Copied!';
        setTimeout(() => e.target.textContent = 'Copy ID', 2000);
    });

    downloadTriggers.forEach(trigger => {
        trigger.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!isVerified) {
                showFeedback(topEmailInput, 'error');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const type = trigger.getAttribute('data-type');
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'https://pp-server-eight.vercel.app';
                const response = await fetch(`${apiUrl}/register-client`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountType: type, email: currentUserEmail })
                });
                const data = await response.json();
                if (data.status === 'success') {
                    idDisplay.textContent = data.clientId;
                    modal.style.display = 'flex';
                }
            } catch (err) { showFeedback(trigger, 'error'); }
        });
    });

    // --- Star Rating Interaction ---
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('review-rating');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const val = star.getAttribute('data-value');
            ratingInput.value = val;
            updateStarsUI(val);
        });
    });

    const updateStarsUI = (val) => {
        stars.forEach(s => {
            if (s.getAttribute('data-value') <= val) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    };
    updateStarsUI(5); // Default

    // --- Reviews system (Floating & Form) ---
    const reviewsContainer = document.getElementById('reviews-container');
    const reviewForm = document.getElementById('review-form');

    const startFloatingReviews = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://pp-server-eight.vercel.app';
            const res = await fetch(`${apiUrl}/get-reviews`);
            const data = await res.json();
            if (data.status === 'success' && data.reviews && data.reviews.length > 0) {
                data.reviews.slice(0, 5).forEach((rev, i) => setTimeout(() => createFloatingReview(rev), i * 3000));
                setInterval(() => {
                    const randomRev = data.reviews[Math.floor(Math.random() * data.reviews.length)];
                    createFloatingReview(randomRev);
                }, 8000);
            }
        } catch (err) { console.error('Reviews error:', err); }
    };

    const createFloatingReview = (rev) => {
        const div = document.createElement('div');
        div.className = 'review-float';
        div.style.left = Math.random() * 80 + 5 + '%';
        div.style.top = '110vh';
        div.innerHTML = `<span class="name">${rev.name}</span><p class="comment">"${rev.comment}"</p><span class="stars">${'⭐'.repeat(rev.rating)}</span>`;
        reviewsContainer.appendChild(div);
        setTimeout(() => div.classList.add('active'), 100);
        let pos = 110;
        const driftInt = setInterval(() => {
            pos -= 0.12;
            div.style.top = pos + 'vh';
            if (pos < -20) { clearInterval(driftInt); div.remove(); }
        }, 30);
    };

    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = reviewForm.querySelector('button');
        btn.textContent = 'Publishing...';
        btn.disabled = true;
        const formData = {
            name: document.getElementById('review-name').value,
            email: document.getElementById('review-email').value,
            rating: document.getElementById('review-rating').value,
            comment: document.getElementById('review-comment').value
        };
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://pp-server-eight.vercel.app';
            const res = await fetch(`${apiUrl}/add-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if ((await res.json()).status === 'success') {
                alert('Review published!');
                reviewForm.reset();
                updateStarsUI(5);
                if (currentUserEmail) document.getElementById('review-email').value = currentUserEmail;
            }
        } catch (err) { alert('Post failed.'); }
        finally { btn.textContent = 'Publish Review'; btn.disabled = false; }
    });

    // START ALL
    setTimeout(startFloatingReviews, 2000);
    setTimeout(injectVignette, 500);
    startAdGuardian();

    // Copy ID logic
    const copyBtn = document.getElementById('copy-id-btn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(idDisplay.textContent);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
    });

    // --- Optimized Matrix Effect ---
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height, columns, drops;

        const initMatrix = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            columns = Math.floor(width / 20);
            drops = new Array(columns).fill(0).map(() => Math.random() * -100);
        };

        const draw = () => {
            ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#10b981';
            ctx.font = '15px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = String.fromCharCode(33 + Math.random() * 94);
                ctx.fillText(text, i * 20, drops[i] * 20);

                if (drops[i] * 20 > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        initMatrix();
        setInterval(draw, 35);

        window.addEventListener('resize', () => {
            initMatrix();
        });
    }
});
