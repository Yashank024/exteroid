/**
 * EXTEROID - Landing Page Animations
 * Simple and clean animations
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- ENTRANCE ANIMATIONS ---
    const fadeElements = document.querySelectorAll('.fade-up');

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => fadeObserver.observe(el));

    // --- PARALLAX EFFECT ON SHAPES ---
    const shapes = document.querySelectorAll('.shape');
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animateShapes() {
        // Smooth interpolation
        currentX += (mouseX - currentX) * 0.05;
        currentY += (mouseY - currentY) * 0.05;

        shapes.forEach((shape, index) => {
            const speed = (index + 1) * 8;
            const x = currentX * speed;
            const y = currentY * speed;

            shape.style.transform = `translate(${x}px, ${y}px)`;
        });

        requestAnimationFrame(animateShapes);
    }

    // Only enable parallax on devices that can handle it
    if (window.innerWidth > 768 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animateShapes();
    }

    // --- SMOOTH SCROLL ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // --- NAVBAR SCROLL EFFECT ---
    const navbar = document.querySelector('.nav-bar');

    if (navbar) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 100) {
                navbar.style.background = 'rgba(0, 0, 0, 0.8)';
                navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
            } else {
                navbar.style.background = 'transparent';
                navbar.style.boxShadow = 'none';
            }
        });
    }

    // --- LOG INITIALIZATION ---
    console.log('%c🚀 EXTEROID Loaded', 'color: #6366f1; font-size: 16px; font-weight: bold;');
    console.log('%cGeometric Hero • Premium Design', 'color: #a5b4fc; font-size: 12px;');
});
