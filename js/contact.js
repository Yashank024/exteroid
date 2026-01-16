/**
 * EXTEROID - Contact Page JavaScript
 * Handles animations and form submission
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

    // --- CONTACT FORM HANDLING ---
    const contactForm = document.getElementById('contactForm');
    const successMessage = document.getElementById('successMessage');

    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('.submit-btn');
            const btnText = submitBtn.querySelector('span');
            const originalText = btnText.textContent;

            // Disable button and show loading state
            submitBtn.disabled = true;
            btnText.textContent = 'Sending...';
            submitBtn.style.opacity = '0.7';

            try {
                // Submit form data
                const formData = new FormData(contactForm);
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    // Hide form and show success message
                    contactForm.style.display = 'none';
                    successMessage.classList.add('show');

                    // Reset form for future use
                    contactForm.reset();

                    // Scroll to success message
                    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Reset after 5 seconds
                    setTimeout(() => {
                        contactForm.style.display = 'block';
                        successMessage.classList.remove('show');
                        submitBtn.disabled = false;
                        btnText.textContent = originalText;
                        submitBtn.style.opacity = '1';
                    }, 5000);
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Oops! Something went wrong. Please try again or email us directly at exteroid.official@gmail.com');
                submitBtn.disabled = false;
                btnText.textContent = originalText;
                submitBtn.style.opacity = '1';
            }
        });

        // Real-time form validation
        const inputs = contactForm.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            input.addEventListener('blur', function () {
                if (this.hasAttribute('required') && !this.value.trim()) {
                    this.style.borderColor = 'rgba(244, 63, 94, 0.5)';
                } else {
                    this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
            });

            input.addEventListener('focus', function () {
                this.style.borderColor = 'rgba(165, 180, 252, 0.5)';
            });
        });

        // Email validation
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', function () {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (this.value && !emailRegex.test(this.value)) {
                    this.style.borderColor = 'rgba(244, 63, 94, 0.5)';
                    // You could add an error message here
                } else if (this.value) {
                    this.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                }
            });
        }
    }

    // --- LOG INITIALIZATION ---
    console.log('%c🚀 EXTEROID Contact', 'color: #6366f1; font-size: 16px; font-weight: bold;');
    console.log('%cContact Form • Get in Touch', 'color: #a5b4fc; font-size: 12px;');
});
