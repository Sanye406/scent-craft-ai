import { renderDetailCard, renderPoemCard, appendChatMessage, showResult } from '../card.js';
import { knowledgeBase } from '../knowledge.js';

let currentFormula = null;
let currentUserInput = '';

document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('send-chat');
    const chatInput = document.getElementById('chat-input');
    
    async function generateFragrance(userCharacter, isRetry = false) {
        if (!userCharacter) {
            alert('请描述人物的性格与特质');
            return;
        }
        
        if (!isRetry) {
            appendChatMessage('chat-area', userCharacter, true);
        }
        chatInput.value = '';
        sendBtn.disabled = true;
        sendBtn.textContent = 'AI调香中...';
        
        try {
            const res = await fetch('/api/character-fragrance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCharacter })
            });

            if (!res.ok) throw new Error('接口请求失败');
            const result = await res.json();

            if (result.success) {
                currentFormula = result.data;
                currentUserInput = userCharacter;

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

                showResult('character-result', dualLayout);
                setupActionButtons();
            } else {
                appendChatMessage('chat-area', `生成失败：${result.error}`, false);
            }
        } catch (err) {
            console.error('调香失败：', err);
            const fallback = knowledgeBase.matchBaseFormula(userCharacter, 'character');
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

                showResult('character-result', dualLayout);
            } else {
                appendChatMessage('chat-area', `抱歉，我无法回答这个问题：${err.message}`, false);
            }
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = '生成专属香方';
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
                            sceneType: 'character'
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

                        showResult('character-result', dualLayout);
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
    
    sendBtn.addEventListener('click', async () => {
        const userCharacter = chatInput.value.trim();
        await generateFragrance(userCharacter, false);
    });
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });
});