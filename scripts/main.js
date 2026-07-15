import { renderDoubleCard } from './card.js';
import { aiClient } from './api.js';

window.openCurtain = function() {
    const curtain = document.getElementById('curtain');
    curtain.classList.add('hide');
};

window.showToast = function(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('on');
    setTimeout(() => {
        toast.classList.remove('on');
    }, 3000);
};

window.closeDetail = function() {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('on');
};

function initParticleEffect() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 40;
    
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 3 + 1;
            this.speedX = (Math.random() - 0.5) * 0.2;
            this.speedY = (Math.random() - 0.5) * 0.2;
            this.opacity = Math.random() * 0.03 + 0.01;
            this.color = '#2c2418';
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x < 0 || this.x > width) this.speedX *= -1;
            if (this.y < 0 || this.y > height) this.speedY *= -1;
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = '#5a4a35';
                    ctx.globalAlpha = (120 - dist) / 120 * 0.15;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            });
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
}

function initHeroInkParticles() {
    const canvas = document.getElementById('heroInkCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const particles = [];
    let animationId = null;

    const resizeCanvas = () => {
        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth * dpr;
        canvas.height = parent.offsetHeight * dpr;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        ctx.scale(dpr, dpr);
        initParticles();
    };

    const initParticles = () => {
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const count = window.innerWidth < 768 ? 20 : 45;
        particles.length = 0;

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 40 + 15,
                speedX: (Math.random() - 0.5) * 0.125,
                speedY: -(Math.random() * 0.25 + 0.1),
                opacity: Math.random() * 0.06 + 0.04
            });
        }
    };

    const render = () => {
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `rgba(44, 36, 24, ${p.opacity})`);
            gradient.addColorStop(1, 'rgba(44, 36, 24, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            p.x += p.speedX;
            p.y += p.speedY;

            if (p.y + p.size < 0) {
                p.y = height + p.size;
                p.x = Math.random() * width;
            }
            if (p.x + p.size < 0) p.x = width + p.size;
            if (p.x - p.size > width) p.x = -p.size;
        });

        animationId = requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    render();

    return () => {
        window.removeEventListener('resize', resizeCanvas);
        if (animationId) cancelAnimationFrame(animationId);
    };
}

const mockGalleryData = [
    {
        id: 1,
        name: '西湖雪韵',
        sensory_text: '雪落西湖，暗香浮动',
        mood_tags: ['清冷', '悠远'],
        scene_tags: ['湖畔', '冬日'],
        season_tags: ['冬'],
        type: 'travel',
        ingredients: [
            { name: '沉香', role: '君', amount: 5, unit: 'g', property: '温' },
            { name: '白檀', role: '臣', amount: 4, unit: 'g', property: '温' },
            { name: '冰片', role: '佐', amount: 0.5, unit: 'g', property: '凉' },
            { name: '麝香', role: '使', amount: 0.3, unit: 'g', property: '温' }
        ],
        top_note: '冰片 清冽凉润，如西湖初雪',
        middle_note: '沉香 沉敛醇厚，似古寺钟声',
        base_note: '麝香 温润绵长，若雪后暖阳',
        efficacy: '清心悦神，辟秽怡情',
        contraindication: '孕妇、婴幼儿慎用',
        formula_nature: '性微凉',
        adjust_reason: '以古籍沉香方为骨，佐冰片以应西湖清寒之韵'
    },
    {
        id: 2,
        name: '婉儿墨香',
        sensory_text: '笔底风雷，墨香盈袖',
        mood_tags: ['清雅', '庄重'],
        scene_tags: ['书房', '古寺'],
        season_tags: ['秋'],
        type: 'character',
        ingredients: [
            { name: '檀香', role: '君', amount: 6, unit: 'g', property: '温' },
            { name: '芸香', role: '臣', amount: 4, unit: 'g', property: '平' },
            { name: '冰片', role: '佐', amount: 0.4, unit: 'g', property: '凉' },
            { name: '麝香', role: '使', amount: 0.2, unit: 'g', property: '温' }
        ],
        top_note: '芸香 清芬书卷，如笔墨初落',
        middle_note: '檀香 温润醇厚，似才情内敛',
        base_note: '麝香 悠远绵长，若芳华永存',
        efficacy: '清心悦神，辟秽怡情',
        contraindication: '孕妇、婴幼儿慎用',
        formula_nature: '性平',
        adjust_reason: '以古籍清心香方为骨，佐芸香以应婉儿书香气质'
    },
    {
        id: 3,
        name: '时光印记',
        sensory_text: '岁月留香，温暖如初',
        mood_tags: ['治愈', '温暖'],
        scene_tags: ['书房', '卧室'],
        season_tags: ['秋'],
        type: 'memory',
        ingredients: [
            { name: '檀香', role: '君', amount: 5, unit: 'g', property: '温' },
            { name: '藿香', role: '臣', amount: 4, unit: 'g', property: '温' },
            { name: '乳香', role: '佐', amount: 3, unit: 'g', property: '温' },
            { name: '安息香', role: '使', amount: 2, unit: 'g', property: '平' }
        ],
        top_note: '藿香 清新温暖，如阳光初照',
        middle_note: '檀香 醇厚绵长，似时光沉淀',
        base_note: '安息香 悠远宁静，若岁月静好',
        efficacy: '安神静心，温暖身心',
        contraindication: '孕妇、婴幼儿慎用',
        formula_nature: '性温',
        adjust_reason: '以古籍安神香方为骨，佐乳香以应温暖记忆'
    },
    {
        id: 4,
        name: '大漠孤烟',
        sensory_text: '风沙万里，古韵悠长',
        mood_tags: ['悠远', '神秘'],
        scene_tags: ['山林', '古寺'],
        season_tags: ['秋'],
        type: 'travel',
        ingredients: [
            { name: '沉香', role: '君', amount: 6, unit: 'g', property: '温' },
            { name: '乳香', role: '臣', amount: 4, unit: 'g', property: '温' },
            { name: '龙脑', role: '佐', amount: 0.3, unit: 'g', property: '凉' },
            { name: '麝香', role: '使', amount: 0.2, unit: 'g', property: '温' }
        ],
        top_note: '龙脑 清冽高远，如大漠清风',
        middle_note: '乳香 醇厚烟韵，似驼铃悠远',
        base_note: '沉香 沉敛绵长，若古道沧桑',
        efficacy: '辟秽安神，清心悦神',
        contraindication: '孕妇、婴幼儿慎用',
        formula_nature: '性温',
        adjust_reason: '以古籍沉香方为骨，佐龙脑以应大漠清冽之韵'
    },
    {
        id: 5,
        name: '谪仙风骨',
        sensory_text: '青莲不染，风骨清峻',
        mood_tags: ['清雅', '悠远'],
        scene_tags: ['山林', '古寺'],
        season_tags: ['夏'],
        type: 'character',
        ingredients: [
            { name: '沉香', role: '君', amount: 5, unit: 'g', property: '温' },
            { name: '白檀', role: '臣', amount: 4, unit: 'g', property: '温' },
            { name: '冰片', role: '佐', amount: 0.5, unit: 'g', property: '凉' },
            { name: '麝香', role: '使', amount: 0.2, unit: 'g', property: '温' }
        ],
        top_note: '冰片 清冽如仙，似青莲出水',
        middle_note: '沉香 醇厚内敛，若诗心深沉',
        base_note: '麝香 悠远绵长，如诗名千古',
        efficacy: '清心明志，怡情养性',
        contraindication: '孕妇、婴幼儿慎用',
        formula_nature: '性平微凉',
        adjust_reason: '以古籍清心香方为骨，佐冰片以应谪仙清冽风骨'
    },
    {
        id: 6,
        name: '童年夏夜',
        sensory_text: '星光璀璨，蝉鸣入梦',
        mood_tags: ['治愈', '温暖'],
        scene_tags: ['卧室', '湖畔'],
        season_tags: ['夏'],
        type: 'memory',
        ingredients: [
            { name: '藿香', role: '君', amount: 5, unit: 'g', property: '温' },
            { name: '薄荷', role: '臣', amount: 3, unit: 'g', property: '凉' },
            { name: '丁香', role: '佐', amount: 2, unit: 'g', property: '温' },
            { name: '安息香', role: '使', amount: 2, unit: 'g', property: '平' }
        ],
        top_note: '薄荷 清凉舒爽，如夏夜微风',
        middle_note: '藿香 温暖清新，似蝉鸣入梦',
        base_note: '安息香 宁静悠远，若星光璀璨',
        efficacy: '清凉解暑，安神静心',
        contraindication: '孕妇、婴幼儿慎用',
        formula_nature: '性平',
        adjust_reason: '以古籍消暑香方为骨，佐薄荷以应夏夜清凉'
    }
];

const currentFormulas = {
    travel: null,
    character: null,
    memory: null
};

function initPageNavigation() {
    const pageLinks = document.querySelectorAll('[data-page]');
    const pages = document.querySelectorAll('.page');
    const navTabs = document.querySelectorAll('.tab');

    pageLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-page');
            const targetPage = document.getElementById('page-' + target);

            if (!targetPage) return;

            pages.forEach(function(page) {
                page.classList.remove('on');
            });

            targetPage.classList.add('on');

            navTabs.forEach(function(tab) {
                tab.classList.remove('on');
            });

            const activeTab = document.querySelector('.tab[data-page="' + target + '"]');
            if (activeTab) {
                activeTab.classList.add('on');
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (target === 'gallery') {
                renderGallery('all');
            }
        });
    });
}

function initSceneTabs() {
    const sceneTabs = document.querySelectorAll('.scene-tab');
    const sceneContents = document.querySelectorAll('.scene-content');

    sceneTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            const scene = this.getAttribute('data-scene');

            sceneTabs.forEach(function(t) {
                t.classList.remove('on');
            });
            this.classList.add('on');

            sceneContents.forEach(function(content) {
                content.classList.remove('on');
            });

            const targetContent = document.getElementById('scene-' + scene);
            if (targetContent) {
                targetContent.classList.add('on');
            }
        });
    });

    setTimeout(function() {
        document.querySelectorAll('.scene-tab').forEach(function(t) {
            t.classList.remove('on');
        });
        document.querySelector('.scene-tab[data-scene="character"]').classList.add('on');

        document.querySelectorAll('.scene-content').forEach(function(c) {
            c.classList.remove('on');
        });
        document.getElementById('scene-character').classList.add('on');
    }, 100);

    document.querySelectorAll('.feature-card').forEach(function(card) {
        card.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            const scene = this.getAttribute('data-scene');

            document.querySelectorAll('.page').forEach(function(p) {
                p.classList.remove('on');
            });
            document.getElementById('page-' + page).classList.add('on');

            document.querySelectorAll('.tab').forEach(function(t) {
                t.classList.remove('on');
            });
            document.querySelector('.tab[data-page="' + page + '"]').classList.add('on');

            setTimeout(function() {
                document.querySelectorAll('.scene-tab').forEach(function(t) {
                    t.classList.remove('on');
                });
                document.querySelector('.scene-tab[data-scene="' + scene + '"]').classList.add('on');

                document.querySelectorAll('.scene-content').forEach(function(c) {
                    c.classList.remove('on');
                });
                document.getElementById('scene-' + scene).classList.add('on');
            }, 300);
        });
    });
}

function initShopTabs() {
    const shopTabs = document.querySelectorAll('.shop-tab');
    const shopContents = document.querySelectorAll('.shop-content');

    shopTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            const shop = this.getAttribute('data-shop');

            shopTabs.forEach(function(t) {
                t.classList.remove('on');
            });
            this.classList.add('on');

            shopContents.forEach(function(content) {
                content.classList.remove('on');
            });

            const targetContent = document.getElementById('shop-' + shop);
            if (targetContent) {
                targetContent.classList.add('on');
            }
        });
    });
}

function initQuickTags() {
    document.querySelectorAll('.quick-tags .tag').forEach(function(tag) {
        tag.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            const scene = this.closest('.scene-content').getAttribute('id').replace('scene-', '');
            const input = document.getElementById('input-' + scene);
            if (input) {
                input.value = value;
            }
        });
    });
}

async function generateFragrance(sceneType, inputValue) {
    const statusEl = document.getElementById('status-' + sceneType);
    const resultEl = document.getElementById('result-' + sceneType);
    const btn = document.getElementById('btn-' + sceneType);

    if (!inputValue.trim()) {
        showToast('请输入内容');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'AI调香中...';
    statusEl.textContent = '正在翻阅古籍，调配香方...';

    try {
        let response;
        switch (sceneType) {
            case 'travel':
                response = await aiClient.generateTravelFragrance(inputValue);
                break;
            case 'character':
                response = await aiClient.generateCharacterFragrance(inputValue);
                break;
            case 'memory':
                response = await aiClient.generateMemoryFragrance(inputValue);
                break;
        }

        if (response && response.success && response.data) {
            currentFormulas[sceneType] = response.data;
            statusEl.textContent = response.is_ai_generated ? 'AI定制调香完成' : '已为您推荐经典香方';
            renderResultWithActions(sceneType, response.data);
        } else {
            throw new Error('返回数据异常');
        }
    } catch (error) {
        console.error('调香失败:', error);
        statusEl.textContent = 'AI调香暂不可用，已为您推荐经典香方';
        const fallback = getFallbackFormula(sceneType, inputValue);
        currentFormulas[sceneType] = fallback;
        renderResultWithActions(sceneType, fallback);
    } finally {
        btn.disabled = false;
        btn.textContent = '生成香方';
    }
}

function renderResultWithActions(sceneType, formula) {
    const resultEl = document.getElementById('result-' + sceneType);
    resultEl.innerHTML = `
        ${renderDoubleCard(formula)}
        <div class="result-actions">
            <div class="adjust-group">
                <input type="text" class="adjust-input" id="adjust-input-${sceneType}" placeholder="微调要求，如：更清新一些">
                <button class="btn primary" onclick="handleAdjust('${sceneType}')">尝试微调</button>
            </div>
        </div>
    `;
    setTimeout(function() {
        initMiniInkEffect();
    }, 100);
    resultEl.scrollIntoView({ behavior: 'smooth' });
}

window.handleRetry = function(sceneType) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        const input = document.getElementById('input-' + sceneType);
        if (input && input.value.trim()) {
            generateFragrance(sceneType, input.value);
        }
    }, 300);
};

window.handleAdjust = async function(sceneType) {
    const adjustInput = document.getElementById('adjust-input-' + sceneType);
    const statusEl = document.getElementById('status-' + sceneType);

    const adjustRequest = adjustInput.value.trim();
    if (!adjustRequest) {
        showToast('请输入微调要求');
        return;
    }

    const currentFormula = currentFormulas[sceneType];
    if (!currentFormula) {
        showToast('请先生成香方');
        return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        statusEl.textContent = '正在微调香方...';
    }, 300);

    try {
        const response = await aiClient.adjustFragrance(currentFormula, adjustRequest);
        
        if (response && response.success && response.data) {
            currentFormulas[sceneType] = response.data;
            statusEl.textContent = response.is_ai_generated ? '香方微调完成' : '微调受限，已返回原方';
            renderResultWithActions(sceneType, response.data);
        } else {
            throw new Error('微调失败');
        }
    } catch (error) {
        console.error('微调失败:', error);
        statusEl.textContent = '微调暂不可用';
    }
};

function getFallbackFormula(sceneType, input) {
    const fallbacks = {
        travel: {
            name: '山河古韵',
            sensory_text: '一方水土，一缕芬芳',
            is_ai_generated: false,
            ingredients: [
                { name: '沉香', role: '君', amount: 5, unit: 'g', property: '温' },
                { name: '白檀', role: '臣', amount: 4, unit: 'g', property: '温' },
                { name: '乳香', role: '佐', amount: 3, unit: 'g', property: '温' },
                { name: '麝香', role: '使', amount: 0.3, unit: 'g', property: '温' }
            ],
            top_note: '清香雅致，如初见山水',
            middle_note: '温润绵长，似沉浸其中',
            base_note: '悠远深沉，若回味无穷',
            efficacy: '清心悦神，辟秽怡情',
            contraindication: '孕妇、婴幼儿、呼吸道敏感者慎用；香材过敏者禁用；仅作香薰，不可内服',
            formula_nature: '性温',
            adjust_reason: '以经典古籍香方为基础，适配地域气质',
            mood_tags: ['悠远', '清雅'],
            scene_tags: ['山林', '古寺'],
            season_tags: ['春', '秋']
        },
        character: {
            name: '风骨清韵',
            sensory_text: '闻香识人，气韵自华',
            is_ai_generated: false,
            ingredients: [
                { name: '檀香', role: '君', amount: 6, unit: 'g', property: '温' },
                { name: '沉香', role: '臣', amount: 4, unit: 'g', property: '温' },
                { name: '冰片', role: '佐', amount: 0.5, unit: 'g', property: '凉' },
                { name: '麝香', role: '使', amount: 0.2, unit: 'g', property: '温' }
            ],
            top_note: '清冽如霜，似风骨凛然',
            middle_note: '醇厚内敛，若才情深沉',
            base_note: '悠远绵长，如气韵永存',
            efficacy: '清心明志，怡情养性',
            contraindication: '孕妇、婴幼儿、呼吸道敏感者慎用；香材过敏者禁用；仅作香薰，不可内服',
            formula_nature: '性平微凉',
            adjust_reason: '以经典古籍香方为基础，凸显人物气质',
            mood_tags: ['清雅', '庄重'],
            scene_tags: ['书房', '古寺'],
            season_tags: ['秋']
        },
        memory: {
            name: '时光印记',
            sensory_text: '岁月留香，温暖如初',
            is_ai_generated: false,
            ingredients: [
                { name: '檀香', role: '君', amount: 5, unit: 'g', property: '温' },
                { name: '藿香', role: '臣', amount: 4, unit: 'g', property: '温' },
                { name: '乳香', role: '佐', amount: 3, unit: 'g', property: '温' },
                { name: '安息香', role: '使', amount: 2, unit: 'g', property: '平' }
            ],
            top_note: '温暖清新，如记忆初醒',
            middle_note: '醇厚绵长，似沉浸回忆',
            base_note: '宁静悠远，若岁月静好',
            efficacy: '安神静心，温暖身心',
            contraindication: '孕妇、婴幼儿、呼吸道敏感者慎用；香材过敏者禁用；仅作香薰，不可内服',
            formula_nature: '性温',
            adjust_reason: '以经典安神香方为基础，唤起温暖记忆',
            mood_tags: ['治愈', '温暖'],
            scene_tags: ['书房', '卧室'],
            season_tags: ['秋']
        }
    };

    return fallbacks[sceneType] || fallbacks.travel;
}

function initGenerateButtons() {
    document.getElementById('btn-travel').addEventListener('click', function() {
        const input = document.getElementById('input-travel').value;
        generateFragrance('travel', input);
    });

    document.getElementById('btn-character').addEventListener('click', function() {
        const input = document.getElementById('input-character').value;
        generateFragrance('character', input);
    });

    document.getElementById('btn-memory').addEventListener('click', function() {
        const input = document.getElementById('input-memory').value;
        generateFragrance('memory', input);
    });

    document.getElementById('input-travel').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateFragrance('travel', this.value);
        }
    });

    document.getElementById('input-character').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateFragrance('character', this.value);
        }
    });

    document.getElementById('input-memory').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateFragrance('memory', this.value);
        }
    });
}

function renderGallery(filter) {
    const grid = document.getElementById('gallery-grid');
    let data = mockGalleryData;

    if (filter !== 'all') {
        data = data.filter(item => item.type === filter);
    }

    grid.innerHTML = data.map(item => `
        <div class="gallery-card" onclick="openGalleryDetail(${item.id})">
            <div class="gallery-card-title">${item.name}</div>
            <div class="gallery-card-sensory">${item.sensory_text}</div>
            <div class="gallery-card-tags">
                ${item.mood_tags.map(tag => `<span class="gallery-card-tag">${tag}</span>`).join('')}
                ${item.scene_tags.map(tag => `<span class="gallery-card-tag">${tag}</span>`).join('')}
                ${item.season_tags.map(tag => `<span class="gallery-card-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

window.openGalleryDetail = function(id) {
    const item = mockGalleryData.find(item => item.id === id);
    if (!item) return;

    const modal = document.getElementById('detail-modal');
    const content = modal.querySelector('.detail-content');
    content.innerHTML = renderDoubleCard(item);
    modal.classList.add('on');
    setTimeout(function() {
        initMiniInkEffect();
    }, 100);
};

function initGalleryFilters() {
    document.querySelectorAll('.filter-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(function(c) {
                c.classList.remove('on');
            });
            this.classList.add('on');
            renderGallery(this.getAttribute('data-filter'));
        });
    });
}

function initSmoothScroll() {
    document.querySelectorAll('[data-scroll]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-scroll');
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function initCartButtons() {
    document.querySelectorAll('.product-card .btn.primary').forEach(function(btn) {
        btn.addEventListener('click', function() {
            showToast('已加入购物车');
        });
    });
}

function initMiniInkEffect() {
    document.querySelectorAll('.poem-canvas').forEach(function(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = canvas.offsetHeight;
        
        const particles = [];
        for (let i = 0; i < 6; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 15 + 3,
                opacity: Math.random() * 0.12 + 0.03,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15
            });
        }
        
        function draw() {
            ctx.clearRect(0, 0, width, height);
            
            particles.forEach(function(p) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(44, 36, 24, ${p.opacity})`;
                ctx.fill();
                
                p.x += p.vx;
                p.y += p.vy;
                
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
            });
            
            requestAnimationFrame(draw);
        }
        
        draw();
    });
}

function initImagePaths() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const basePath = isLocal ? 'images' : 'https://github.com/Sanye406/scent-craft-ai/raw/master/images-optimized';
    
    document.querySelectorAll('[data-img]').forEach(el => {
        const imgName = el.getAttribute('data-img');
        const fullPath = `${basePath}/${imgName}`;
        if (el.tagName === 'SOURCE') {
            el.srcset = fullPath;
        } else if (el.tagName === 'IMG') {
            el.src = fullPath;
        }
    });
}

function init() {
    initImagePaths();
    initPageNavigation();
    initSceneTabs();
    initShopTabs();
    initQuickTags();
    initGenerateButtons();
    initGalleryFilters();
    initSmoothScroll();
    initCartButtons();
    initHeroInkParticles();
    renderGallery('all');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.initMiniInk = initMiniInkEffect;