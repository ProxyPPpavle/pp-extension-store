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

    // POKRETANJE
    setTimeout(injectVignette, 500);
    setTimeout(() => {
        injectImmediateAds();
        startAdGuardian();
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

    // --- Registration & Email Logic ---
    const topEmailInput = document.getElementById('user-email-top');
    const loginBtn = document.getElementById('btn-login-top');
    const downloadTriggers = document.querySelectorAll('.download-trigger');
    const modal = document.getElementById('id-modal');
    const idDisplay = document.getElementById('generated-id');
    const copyBtn = document.getElementById('copy-id-btn');

    let currentUserEmail = localStorage.getItem('pp_user_email') || '';
    if (currentUserEmail) {
        topEmailInput.value = currentUserEmail;
        topEmailInput.style.borderColor = 'var(--accent-green)';
    }

    loginBtn.addEventListener('click', () => {
        const email = topEmailInput.value.trim();
        if (!email || !email.includes('@')) {
            topEmailInput.style.borderColor = '#ef4444';
            topEmailInput.focus();
            return;
        }
        currentUserEmail = email;
        localStorage.setItem('pp_user_email', email);
        topEmailInput.style.borderColor = 'var(--accent-green)';
        alert('Email verified! You can now download extensions.');
    });

    downloadTriggers.forEach(trigger => {
        trigger.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!currentUserEmail) {
                alert('Please enter your email in the Member Access box (top-left) first!');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                topEmailInput.focus();
                topEmailInput.style.borderColor = '#ef4444';
                return;
            }

            const type = trigger.getAttribute('data-type');

            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

                const response = await fetch(`${apiUrl}/register-client`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accountType: type,
                        email: currentUserEmail
                    })
                });

                if (data.status === 'success') {
                    idDisplay.textContent = data.clientId;
                    modal.style.display = 'flex';
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (err) {
                console.error("Server error:", err);
                alert('Server connection error.');
            }
        });
    });

    // --- Reviews system (Floating & Form) ---
    const reviewsContainer = document.getElementById('reviews-container');
    const reviewForm = document.getElementById('review-form');

    const startFloatingReviews = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/get-reviews`);
            const data = await res.json();

            if (data.status === 'success' && data.reviews && data.reviews.length > 0) {
                // Initial burst
                data.reviews.slice(0, 5).forEach((rev, i) => {
                    setTimeout(() => createFloatingReview(rev), i * 2000);
                });

                // Continuous drift
                setInterval(() => {
                    const randomRev = data.reviews[Math.floor(Math.random() * data.reviews.length)];
                    createFloatingReview(randomRev);
                }, 7000);
            }
        } catch (err) {
            console.error('Reviews error:', err);
        }
    };

    const createFloatingReview = (rev) => {
        const div = document.createElement('div');
        div.className = 'review-float';
        div.style.left = Math.random() * 80 + 5 + '%';
        div.style.top = '110vh';
        div.innerHTML = `
            <span class="name">${rev.name}</span>
            <p class="comment">"${rev.comment}"</p>
            <span class="stars">${'⭐'.repeat(rev.rating)}</span>
        `;
        reviewsContainer.appendChild(div);

        setTimeout(() => div.classList.add('active'), 100);

        // Drifting effect using JS to avoid CSS keyframe limitations on dynamic values
        let pos = 110;
        const driftInt = setInterval(() => {
            pos -= 0.15;
            div.style.top = pos + 'vh';
            if (pos < -20) {
                clearInterval(driftInt);
                div.remove();
            }
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
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/add-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.status === 'success') {
                alert('Review published! Thank you for your feedback.');
                reviewForm.reset();
            }
        } catch (err) {
            alert('Error submitting review.');
        } finally {
            btn.textContent = 'Publish Review';
            btn.disabled = false;
        }
    });

    // Copy ID Logic
    copyBtn.addEventListener('click', () => {
        const id = idDisplay.textContent;
        navigator.clipboard.writeText(id).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Kopirano!';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Kopiraj ID';
            }, 2000);
        });
    });

    // Matrix Effect
    function initMatrix() {
        const canvas = document.getElementById('matrix-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$¥€£₿";
        const fontSize = 14;
        const columns = canvas.width / fontSize;

        const drops = [];
        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }

        function draw() {
            ctx.fillStyle = "rgba(5, 5, 5, 0.1)"; // Increased contrast
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Glow effect
            ctx.shadowBlur = 8;
            ctx.shadowColor = "#10b981";
            ctx.font = fontSize + "px monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = letters.charAt(Math.floor(Math.random() * letters.length));

                // Variating colors for "blještav" effect
                if (Math.random() > 0.9) {
                    ctx.fillStyle = "#fff"; // Occasional bright white flash
                } else {
                    ctx.fillStyle = "#10b981"; // Emerald green
                }

                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }
        setInterval(draw, 20); // Faster execution
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Recalculate columns on resize
            const newColumns = canvas.width / fontSize;
            while (drops.length < newColumns) drops.push(1);
        });
    }

    initMatrix();
});
