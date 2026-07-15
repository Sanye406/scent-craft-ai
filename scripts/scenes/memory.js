import { renderDetailCard, renderPoemCard, showResult } from '../card.js';
import { knowledgeBase } from '../knowledge.js';

let currentFormula = null;
let currentUserInput = '';

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-memory');
    const memoryInput = document.getElementById('memory-input');
    
    async function generateFragrance(userMemory, isRetry = false) {
        if (!userMemory) {
            alert('请描述您的气味记忆');
            return;
        }
        
        generateBtn.disabled = true;
        generateBtn.textContent = 'AI调香中...';
        
        try {
            const res = await fetch('/api/memory-fragrance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userMemory: userMemory })
            });

            if (!res.ok) throw new Error('接口请求失败');
            const result = await res.json();

            if (result.success) {
                currentFormula = result.data;
                currentUserInput = userMemory;

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

                showResult('memory-result', dualLayout);
                setupActionButtons();
                
                if (result.warnings && result.warnings.length > 0) {
                    console.warn('Warnings:', result.warnings);
                }
            } else {
                showResult('memory-result', `<p style="color: red;">生成失败：${result.error}</p>`);
            }
        } catch (err) {
            console.error('调香失败：', err);
            const fallback = knowledgeBase.matchBaseFormula(userMemory, 'memory');
            if (fallback) {
                currentFormula = fallback;
                const detailCard = renderDetailCard(fallback, '古籍经典香方');
                const poemCard = renderPoemCard(fallback);

                const dualLayout = `
                    <div class="dual-card-container">
                        <div class="detail-card-wrapper">${detailCard}</div>
                        <div class="poem-card-wrapper">${poemCard}</div>
                    </div>
                `;

                showResult('memory-result', dualLayout);
            } else {
                showResult('memory-result', `<p style="color: red;">生成失败：${err.message}</p>`);
            }
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '生成香方';
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
                            sceneType: 'memory'
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

                        showResult('memory-result', dualLayout);
                        setupActionButtons();
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
        const userMemory = memoryInput.value.trim();
        await generateFragrance(userMemory, false);
    });
});