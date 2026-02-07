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
            ctx.fillStyle = "rgba(5, 5, 5, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#10b981";
            ctx.font = fontSize + "px monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = letters.charAt(Math.floor(Math.random() * letters.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }
        setInterval(draw, 40);
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    initMatrix();
});
