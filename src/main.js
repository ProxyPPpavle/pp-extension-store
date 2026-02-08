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
        banner1Injected: false,
        banner2Injected: false,
        clickCount: 0
    };

    const injectVignette = () => {
        if (!adStorage.canShowVignette) return;

        console.log(">>> POKREĆEM VIGNETTE OGLAS (Zone 10582470) <<<");

        (function (s) {
            s.dataset.zone = '10582470';
            s.src = 'https://gizokraijaw.net/vignette.min.js';
        })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));

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

    const injectImmediateAds = () => {
        console.log("Ucitavam bočne reklame (Zone: 10582494, 10584340)...");

        // Prvo očistimo stare skripte ako postoje da bi mogli ponovo da ih ubacimo
        document.querySelectorAll('script[data-zone="10582494"], script[data-zone="10584340"]').forEach(s => s.remove());

        // Banner Push 1
        const s1 = document.createElement('script');
        s1.dataset.zone = '10582494';
        s1.src = 'https://nap5k.com/tag.min.js';
        document.body.appendChild(s1);
        adStorage.banner1Injected = true;

        // Banner Push 2
        const s2 = document.createElement('script');
        s2.dataset.zone = '10584340';
        s2.src = 'https://nap5k.com/tag.min.js';
        document.body.appendChild(s2);
        adStorage.banner2Injected = true;
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

    // POKRETANJE
    // 1. Vignette odmah
    setTimeout(injectVignette, 500);
    // 2. Bočne reklame sa delay-om
    setTimeout(injectImmediateAds, 3000);
    // 3. Soft ask za push
    showPushModal();

    // TRIK: Svakih 4 minuta radimo "Refresh" bočnih reklama (IPP)
    // Ovo može pomoći da se zaobiđe Frequency Capping i dobiju nove reklame
    setInterval(() => {
        console.log("Vrsim periodični refresh bočnih reklama...");
        injectImmediateAds();
    }, 4 * 60 * 1000);

    // --- Interaction Triggers ---
    document.addEventListener('click', () => {
        adStorage.clickCount++;
        console.log(`Klik broj: ${adStorage.clickCount}`);

        // Svaki 5. klik resetuje Vignette
        if (adStorage.clickCount % 5 === 0) {
            console.log("5. klik - Resetujem Vignette...");
            adStorage.canShowVignette = true;
        }

        injectVignette();
    });

    // Vremenski reset za Vignette (3 minuta)
    setInterval(() => {
        console.log("Vremenski reset Vignette flaga...");
        adStorage.canShowVignette = true;
    }, 3 * 60 * 1000);

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
