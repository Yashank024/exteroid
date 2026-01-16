/**
 * EXTEROID - Privacy Page JavaScript
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

    // --- NAVBAR SCROLL EFFECT ---
    const navbar = document.querySelector('.nav-bar');

    if (navbar) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                navbar.style.background = 'rgba(0, 0, 0, 0.9)';
                navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
            } else {
                navbar.style.background = 'rgba(0, 0, 0, 0.5)';
                navbar.style.boxShadow = 'none';
            }
        });
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

    // --- LOG INITIALIZATION ---
    console.log('%c🚀 EXTEROID Privacy', 'color: #6366f1; font-size: 16px; font-weight: bold;');
    console.log('%cYour Privacy Matters • 100% Secure', 'color: #a5b4fc; font-size: 12px;');
});
