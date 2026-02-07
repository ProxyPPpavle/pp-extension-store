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

    // --- Ad Injection Logic ---
    const adStorage = {
        canShowVignette: true,
        pushInjected: false,
        bannerPushInjected: false
    };

    const injectVignette = () => {
        if (!adStorage.canShowVignette) return;

        // Vignette (Full page overlay)
        (function (s) {
            s.dataset.zone = '10582470';
            s.src = 'https://gizokraijaw.net/vignette.min.js';
            s.setAttribute('data-cfasync', 'false');
        })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));

        adStorage.canShowVignette = false; // Prevent immediate re-trigger
    };

    const injectImmediateAds = () => {
        // 1. Push Notification (Immediately)
        if (!adStorage.pushInjected) {
            const push = document.createElement('script');
            push.src = 'https://3nbf4.com/act/files/tag.min.js?z=10582477';
            push.setAttribute('data-cfasync', 'false');
            push.async = true;
            document.body.appendChild(push);
            adStorage.pushInjected = true;
        }

        // 2. Banner Push / In-Page Push (Immediately)
        if (!adStorage.bannerPushInjected) {
            const bannerPush = document.createElement('script');
            bannerPush.dataset.zone = '10582494';
            bannerPush.src = 'https://nap5k.com/tag.min.js';
            document.body.appendChild(bannerPush);
            adStorage.bannerPushInjected = true;
        }
    };

    // Trigger immediate ads (Push & Banner)
    injectImmediateAds();

    // 1. Global Click Trigger for Vignette (Works like a popunder trigger)
    document.addEventListener('click', () => {
        injectVignette();
    });

    // 2. Allow Vignette to be triggered again every 3 minutes
    setInterval(() => {
        adStorage.canShowVignette = true;
    }, 3 * 60 * 1000);

    // Initial state: false because index.html already injected it once
    adStorage.canShowVignette = false;

    // Registration & Download Logic
    const downloadTriggers = document.querySelectorAll('.download-trigger');
    const modal = document.getElementById('id-modal');
    const idDisplay = document.getElementById('generated-id');
    const copyBtn = document.getElementById('copy-id-btn');

    downloadTriggers.forEach(trigger => {
        trigger.addEventListener('click', async (e) => {
            e.preventDefault();

            const type = trigger.getAttribute('data-type');

            try {
                // Determine API URL (use env var for production)
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

                // 1. Pozovi server da registruje klijenta
                const response = await fetch(`${apiUrl}/register-client`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountType: type })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    // 2. Prikaži modal sa ID-em
                    idDisplay.textContent = data.clientId;
                    modal.style.display = 'flex';

                    // 3. Pokreni pravi download (zip fajla)
                    const downloadLink = document.createElement('a');
                    downloadLink.href = 'assets/PPBot.zip'; // Popravljen put do fajla
                    downloadLink.download = 'PPBot.zip';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                } else {
                    alert("Greška pri registraciji: " + data.message);
                }
            } catch (err) {
                console.error("Server error:", err);
                alert("Server nije dostupan. Proverite da li je test-server pokrenut.");
            }
        });
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
