/**
 * showcase.js — 合香有方 Vanilla JS Module
 * Handles: SPA navigation, tab switching, scroll animations,
 *          hero canvas particles, hero parallax, smooth scroll.
 */

;(function () {
    'use strict';

    /* --------------------------------------------------------
       1. Page Navigation
       -------------------------------------------------------- */
    function initPageNavigation() {
        const pageLinks = document.querySelectorAll('[data-page]');
        const views = document.querySelectorAll('.view');

        if (!pageLinks.length || !views.length) return;

        pageLinks.forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();

                var target = this.getAttribute('data-page');

                // Hide all views
                views.forEach(function (view) {
                    view.classList.remove('active');
                });

                // Show target view
                var targetView = document.getElementById(target);
                if (targetView) {
                    targetView.classList.add('active');
                }

                // Update nav active state
                pageLinks.forEach(function (l) {
                    l.classList.remove('active');
                });
                this.classList.add('active');

                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'instant' });
            });
        });
    }

    /* --------------------------------------------------------
       2. Tab Switching (Gallery & Shop)
       -------------------------------------------------------- */
    function initTabs() {
        // Gallery tabs — [data-category]
        initTabGroup('[data-category]', '[data-category-group]', 'data-category');

        // Shop tabs — [data-shop]
        initTabGroup('[data-shop]', '[data-shop-group]', 'data-shop');
    }

    /**
     * Generic tab initializer
     * @param {string} tabSelector    — selector for tab trigger elements
     * @param {string} groupSelector — selector for tab content groups
     * @param {string} dataAttr       — the data attribute name used for matching
     */
    function initTabGroup(tabSelector, groupSelector, dataAttr) {
        var tabs = document.querySelectorAll(tabSelector);
        var groups = document.querySelectorAll(groupSelector);

        if (!tabs.length || !groups.length) return;

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var targetVal = this.getAttribute(dataAttr);

                // Deactivate all tabs in the same parent tab bar
                var parentBar = this.closest('.tab-bar');
                if (parentBar) {
                    parentBar.querySelectorAll(tabSelector).forEach(function (t) {
                        t.classList.remove('active');
                    });
                }
                this.classList.add('active');

                // Hide all groups
                groups.forEach(function (group) {
                    group.classList.remove('active');
                });

                // Show matching group
                var targetGroup = document.querySelector(
                    groupSelector + '[' + dataAttr + '="' + targetVal + '"]'
                );
                if (targetGroup) {
                    targetGroup.classList.add('active');
                }
            });
        });
    }

    /* --------------------------------------------------------
       3. Scroll Animations (IntersectionObserver)
       -------------------------------------------------------- */
    function initScrollAnimations() {
        var sections = document.querySelectorAll('.section');

        if (!sections.length || !('IntersectionObserver' in window)) {
            // Fallback: show all immediately if no IO support
            sections.forEach(function (s) { s.classList.add('visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        sections.forEach(function (section) {
            observer.observe(section);
        });
    }

    /* --------------------------------------------------------
       4. Hero Canvas — Particle Animation
       -------------------------------------------------------- */
    function initHeroCanvas() {
        var canvas = document.querySelector('.hero-canvas');
        if (!canvas) return;

        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var particles = [];
        var PARTICLE_COUNT = 40;
        var animId = null;

        // Warm color palette for particles
        var warmColors = [
            'rgba(194, 59, 34, 0.35)',    // primary
            'rgba(201, 169, 110, 0.4)',   // gold
            'rgba(226, 142, 130, 0.3)',   // primary-light
            'rgba(216, 180, 140, 0.35)',  // gold-light
            'rgba(139, 69, 19, 0.25)',    // warm brown
            'rgba(210, 105, 30, 0.3)',    // chocolate
            'rgba(160, 82, 45, 0.28)',    // sienna
        ];

        function resize() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }

        function createParticle(randomY) {
            return {
                x: Math.random() * canvas.width,
                y: randomY ? Math.random() * canvas.height : canvas.height + Math.random() * 40,
                radius: Math.max(1.5, Math.random() * 4 + 1),
                color: warmColors[Math.floor(Math.random() * warmColors.length)],
                speedY: -(Math.random() * 0.4 + 0.15),
                speedX: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.5 + 0.3,
                drift: Math.random() * Math.PI * 2,
                driftSpeed: Math.random() * 0.005 + 0.002,
            };
        }

        function init() {
            resize();
            particles = [];
            for (var i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(createParticle(true));
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];

                // Update position
                p.drift += p.driftSpeed;
                p.x += p.speedX + Math.sin(p.drift) * 0.15;
                p.y += p.speedY;

                // Reset if out of bounds
                if (p.y < -10) {
                    particles[i] = createParticle(false);
                    continue;
                }

                // Draw circle
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }

            animId = requestAnimationFrame(draw);
        }

        // Observe visibility to avoid running when hero is off-screen
        var heroEl = canvas.closest('.hero');
        var isVisible = true;

        if (heroEl && 'IntersectionObserver' in window) {
            var visObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        if (!animId) draw();
                        isVisible = true;
                    } else {
                        isVisible = false;
                        if (animId) {
                            cancelAnimationFrame(animId);
                            animId = null;
                        }
                    }
                });
            }, { threshold: 0 });
            visObserver.observe(heroEl);
        }

        init();
        if (isVisible) draw();

        // Debounced resize handler
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                resize();
            }, 200);
        });
    }

    /* --------------------------------------------------------
       5. Hero Parallax
       -------------------------------------------------------- */
    function initHeroParallax() {
        var heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;

        var hero = heroContent.closest('.hero');
        if (!hero) return;

        var ticking = false;

        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var scrollY = window.pageYOffset || window.scrollY;
                    var heroHeight = hero.offsetHeight;

                    if (scrollY < heroHeight) {
                        var ratio = scrollY / heroHeight;
                        var translateY = scrollY * 0.35;
                        var opacity = 1 - ratio * 1.2;

                        heroContent.style.transform = 'translateY(' + translateY + 'px)';
                        heroContent.style.opacity = Math.max(0, opacity);
                    }

                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* --------------------------------------------------------
       6. Smooth Scroll — [data-scroll] elements
       -------------------------------------------------------- */
    function initSmoothScroll() {
        var scrollLinks = document.querySelectorAll('[data-scroll]');

        if (!scrollLinks.length) return;

        scrollLinks.forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();

                var targetId = this.getAttribute('data-scroll');
                var target = document.querySelector(targetId);

                if (target) {
                    var offsetTop = target.getBoundingClientRect().top + window.pageYOffset;
                    // Account for fixed header (64px)
                    var headerOffset = 64;
                    var finalTop = offsetTop - headerOffset;

                    window.scrollTo({
                        top: finalTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    /* --------------------------------------------------------
       Init
       -------------------------------------------------------- */
    function init() {
        initPageNavigation();
        initTabs();
        initScrollAnimations();
        initHeroCanvas();
        initHeroParallax();
        initSmoothScroll();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
