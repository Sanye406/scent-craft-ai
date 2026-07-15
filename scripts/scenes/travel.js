import { renderDetailCard, renderPoemCard, showResult } from '../card.js';

let currentFormula = null;
let currentUserInput = '';

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const sceneInput = document.getElementById('scene-input');
    const statusTip = document.querySelector('.status-tip');

    document.querySelectorAll('.quick-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => {
            sceneInput.value = tag.textContent;
        });
    });

    async function generateFragrance(userScene, isRetry = false) {
        if (!userScene) {
            alert('请先描述你想要的地域场景');
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = 'AI调香中...';
        statusTip.textContent = '正在检索古籍基底香方，AI微调配伍中...';
        statusTip.style.color = '#8b5a2b';

        try {
            const res = await fetch('/api/travel-fragrance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userScene: userScene })
            });

            if (!res.ok) throw new Error('接口请求失败');
            const result = await res.json();

            if (result.success) {
                currentFormula = result.data;
                currentUserInput = userScene;

                const detailCard = renderDetailCard(result.data, result.formula_type);
                const poemCard = renderPoemCard(result.data);

                const actionsHtml = `
                    <div class="result-actions">
                        <button id="retry-btn" class="secondary-btn">再调一次</button>
                        <div class="adjust-group">
                            <input id="adjust-input" class="adjust-input" placeholder="输入微调要求，如：更清冷、淡一点、增加温润感">
                            <button id="adjust-btn" class="secondary-btn">继续微调</button>
                        </div>
                    </div>
                `;

                const dualLayout = `
                    <div class="dual-card-container">
                        <div class="detail-card-wrapper">${detailCard}</div>
                        <div class="poem-card-wrapper">${poemCard}</div>
                    </div>
                    ${actionsHtml}
                `;

                showResult('travel-result', dualLayout);

                setupActionButtons();

                if (result.is_ai_generated) {
                    statusTip.textContent = isRetry ? '已为您重新生成AI定制专属香方' : '已为您生成AI定制专属香方';
                    statusTip.style.color = '#b8860b';
                } else {
                    statusTip.textContent = '已为您匹配经典古籍香方';
                    statusTip.style.color = '#cd5c5c';
                }
            } else {
                throw new Error(result.error || '生成失败');
            }

        } catch (err) {
            console.error('调香失败：', err);
            statusTip.textContent = '网络异常，已为您匹配经典古籍香方';
            statusTip.style.color = '#cd5c5c';
            showResult('travel-result', '<p style="color: #888;">已为您匹配经典古籍香方</p>');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '生成专属香方';
        }
    }

    function setupActionButtons() {
        const retryBtn = document.getElementById('retry-btn');
        const adjustBtn = document.getElementById('adjust-btn');
        const adjustInput = document.getElementById('adjust-input');

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (currentUserInput) {
                    generateFragrance(currentUserInput, true);
                }
            });
        }

        if (adjustBtn && adjustInput) {
            adjustBtn.addEventListener('click', async () => {
                const adjustReq = adjustInput.value.trim();
                if (!adjustReq || !currentFormula) {
                    alert('请先输入微调要求');
                    return;
                }

                adjustBtn.disabled = true;
                adjustBtn.textContent = '微调中...';

                try {
                    const res = await fetch('/api/fragrance-adjust', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            baseFormula: currentFormula,
                            adjustRequest: adjustReq,
                            sceneType: 'travel'
                        })
                    });

                    const result = await res.json();
                    if (result.success) {
                        currentFormula = result.data;

                        const detailCard = renderDetailCard(result.data, result.formula_type);
                        const poemCard = renderPoemCard(result.data);

                        const actionsHtml = `
                            <div class="result-actions">
                                <button id="retry-btn" class="secondary-btn">再调一次</button>
                                <div class="adjust-group">
                                    <input id="adjust-input" class="adjust-input" placeholder="输入微调要求，如：更清冷、淡一点、增加温润感">
                                    <button id="adjust-btn" class="secondary-btn">继续微调</button>
                                </div>
                            </div>
                        `;

                        const dualLayout = `
                            <div class="dual-card-container">
                                <div class="detail-card-wrapper">${detailCard}</div>
                                <div class="poem-card-wrapper">${poemCard}</div>
                            </div>
                            ${actionsHtml}
                        `;

                        showResult('travel-result', dualLayout);
                        setupActionButtons();

                        statusTip.textContent = '已按您的要求微调香方';
                        statusTip.style.color = '#b8860b';
                    }
                } catch (err) {
                    console.error('微调失败：', err);
                    alert('微调失败，请重试');
                } finally {
                    adjustBtn.disabled = false;
                    adjustBtn.textContent = '继续微调';
                }
            });

            adjustInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    adjustBtn.click();
                }
            });
        }
    }

    generateBtn.addEventListener('click', async () => {
        const userScene = sceneInput.value.trim();
        await generateFragrance(userScene, false);
    });

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const sceneId = btn.dataset.scene;
            document.querySelectorAll('.scene').forEach(scene => {
                scene.classList.remove('active');
            });
            document.getElementById(`${sceneId}-scene`).classList.add('active');
        });
    });
});