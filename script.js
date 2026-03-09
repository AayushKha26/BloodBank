const header = document.getElementById('mainHeader');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
});

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitForm(event, formEl, successMessage, apiEndpoint) {
    event.preventDefault();
    const form = (typeof formEl === 'string') ? document.getElementById(formEl) : formEl;
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let valid = true;
    inputs.forEach(input => {
        input.style.borderColor = '';
        if (!input.value.trim()) { input.style.borderColor = '#ff3354';
            valid = false; }
    });
    if (!valid) { showToast('⚠ Please fill in all required fields.', true); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    // Collect data mapped to name attributes
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            form.reset();
            setDefaultDates();
            showToast('✓ ' + successMessage);
            if (apiEndpoint === '/api/stock' || apiEndpoint === '/api/donations') {
                initBloodCounter(); // refresh stock from API
            }
        } else {
            const err = await response.json();
            showToast('⚠ Error: ' + (err.error || 'Submission failed'), true);
        }
    } catch (err) {
        showToast('⚠ Error connecting to server', true);
    } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderLeftColor = isError ? '#ff9900' : '#c0001a';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function openModal(id) { document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden'; }

function closeModal(id) { document.getElementById(id).classList.remove('active');
    document.body.style.overflow = ''; }

function closeModalOutside(event) {
    if (event.target.classList.contains('modal-overlay')) { event.target.classList.remove('active');
        document.body.style.overflow = ''; }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = ''; }
});

function initReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) { setTimeout(() => entry.target.classList.add('visible'), i * 80);
                observer.unobserve(entry.target); }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card, .blood, .bbform, h2, .section-sub, .section-label').forEach(el => { el.classList.add('reveal');
        observer.observe(el); });
}

function initBloodGroupClick() {
    document.querySelectorAll('.blood').forEach(el => {
        el.addEventListener('click', () => {
            const group = el.dataset.group;
            const status = el.querySelector('small').textContent;
            showToast(`Blood Group ${group} — Status: ${status}`);
        });
    });
}

async function initBloodCounter() {
    try {
        const response = await fetch('/api/stock/summary');
        let stocks = { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0 };
        if (response.ok) {
            stocks = await response.json();
        }
        
        document.querySelectorAll('.blood').forEach(el => {
            const group = el.dataset.group;
            const units = stocks[group] || 0;
            const small = el.querySelector('small');
            el.classList.remove('low', 'critical');
            if (units < 15) { small.textContent = 'Critical';
                el.classList.add('critical'); } else if (units < 50) { small.textContent = 'Low';
                el.classList.add('low'); } else { small.textContent = 'Available'; }
            el.title = `${group}: ${units} units available`;
        });
    } catch (err) {
        console.warn("Could not fetch stock data from server. Displaying empty states.");
    }
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => { input.value = today; });
}

function initInputEffects() {
    document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(el => {
        el.addEventListener('focus', () => { el.closest('.form-group').querySelector('label').style.color = '#c0001a'; });
        el.addEventListener('blur', () => { el.closest('.form-group').querySelector('label').style.color = ''; });
    });
}

function animateCounters() {
    document.querySelectorAll('.stat span').forEach(span => {
        const text = span.textContent;
        const num = parseInt(text.replace(/\D/g, ''));
        const suffix = text.replace(/[\d,]/g, '');
        let current = 0;
        const step = num / 60;
        const interval = setInterval(() => {
            current += step;
            if (current >= num) { current = num;
                clearInterval(interval); }
            span.textContent = Math.floor(current).toLocaleString() + suffix;
        }, 25);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initBloodGroupClick();
    initBloodCounter();
    initInputEffects();
    initScrollSpy();
    initButtonRipples();
    initScrollTop();
    initPhoneFormatting();
    setTimeout(animateCounters, 600);
});

// Scroll Spy implementation
function initScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a');
    
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });
}

// Premium button ripples
function initButtonRipples() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            let ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            let rect = this.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Scroll to Top
function initScrollTop() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (!scrollBtn) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    });

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Live Phone Auto-Formatter
function initPhoneFormatting() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    
    phoneInputs.forEach(input => {
        input.addEventListener('input', function (e) {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    });
}

// Scroll Progress Bar
window.addEventListener('scroll', () => {
    const element = document.getElementById('scrollProgress');
    if (!element) return;
    const windowScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (windowScroll / documentHeight) * 100;
    element.style.width = scrolled + "%";
});

// Copy to Clipboard Utility
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('✓ Copied to clipboard!');
    }).catch(err => {
        showToast('⚠ Failed to copy', true);
    });
}