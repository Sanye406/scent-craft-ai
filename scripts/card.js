function parseNote(noteText) {
    if (!noteText) return { material: '', sensory: '', scene: '' };
    const parts = noteText.split('，');
    if (parts.length >= 2) {
        const firstPart = parts[0].trim();
        const scenePart = parts.slice(1).join('，').trim();
        const materialMatch = firstPart.match(/^([^\s]+)\s+(.+)/);
        if (materialMatch) {
            return {
                material: materialMatch[1],
                sensory: materialMatch[2],
                scene: scenePart
            };
        }
    }
    return { material: '', sensory: '', scene: noteText };
}

function renderAdjustAnalysis(adjustAnalysis) {
    if (!adjustAnalysis) return '';
    
    const zuoAdjustments = adjustAnalysis.zuo_adjustments || [];
    const shiAdjustments = adjustAnalysis.shi_adjustments || [];
    const processingAdjustments = adjustAnalysis.processing_adjustments || [];
    
    const zuoHtml = zuoAdjustments.length > 0 ? `
        <div class="adjust-item">
            <span class="adjust-label">佐药调整：</span>
            <span class="adjust-content">${zuoAdjustments.join('；')}</span>
        </div>
    ` : '';
    
    const shiHtml = shiAdjustments.length > 0 ? `
        <div class="adjust-item">
            <span class="adjust-label">使药调整：</span>
            <span class="adjust-content">${shiAdjustments.join('；')}</span>
        </div>
    ` : '';
    
    const processingHtml = processingAdjustments.length > 0 ? `
        <div class="adjust-item">
            <span class="adjust-label">炮制调整：</span>
            <span class="adjust-content">${processingAdjustments.join('；')}</span>
        </div>
    ` : '';
    
    return `
        <div class="adjust-analysis">
            <div class="section-label">调香师微调分析</div>
            <div class="adjust-request">
                <span class="adjust-request-label">对应需求：</span>
                <span class="adjust-request-text">精准回应用户提出的「${adjustAnalysis.user_request || ''}」微调诉求</span>
            </div>
            <div class="adjust-details">
                <span class="adjust-details-label">具体调整：</span>
                ${zuoHtml}
                ${shiHtml}
                ${processingHtml}
            </div>
            ${adjustAnalysis.fragrance_change ? `
            <div class="adjust-change">
                <span class="adjust-change-label">香韵变化：</span>
                <span class="adjust-change-text">${adjustAnalysis.fragrance_change}</span>
            </div>
            ` : ''}
        </div>
    `;
}

function renderDetailCard(formula) {
    if (!formula) return '';
    
    const ingredients = formula.ingredients || [];
    const ingredientLines = ingredients.map(ing => `
        <div class="detail-ingredient-item">
            <span class="ingredient-role ${ing.role}">${ing.role}</span>
            <span class="ingredient-name">${ing.name}</span>
            <span class="ingredient-property">性${ing.property}</span>
            <span class="ingredient-amount">${parseFloat(ing.amount).toFixed(1)}${ing.unit || 'g'}</span>
        </div>
    `).join('');
    
    const moodTags = formula.mood_tags ? formula.mood_tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '';
    const sceneTags = formula.scene_tags ? formula.scene_tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '';
    const seasonTags = formula.season_tags ? formula.season_tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '';
    
    const analysisText = formula.adjust_reason || '';
    const adjustAnalysis = formula.adjust_analysis || null;
    
    const topNote = parseNote(formula.top_note);
    const middleNote = parseNote(formula.middle_note);
    const baseNote = parseNote(formula.base_note);
    
    return `
        <div class="detail-card">
            <div class="detail-title-section">
                <h3>${formula.name}</h3>
                <div class="type-badge ${formula.is_ai_generated ? 'ai' : 'classic'}">
                    ${formula.is_ai_generated ? 'AI定制调香' : '古籍经典香方'}
                </div>
            </div>
            
            ${formula.sensory_text ? `
            <div class="sensory-text">${formula.sensory_text}</div>
            ` : ''}
            
            ${adjustAnalysis ? renderAdjustAnalysis(adjustAnalysis) : ''}
            
            ${analysisText && !adjustAnalysis ? `
            <div class="perfumer-note">
                <div class="section-label">调香师分析</div>
                <p>${analysisText}</p>
            </div>
            ` : ''}
            
            <div class="section">
                <div class="section-label">香材配料</div>
                <div class="ingredients-list">
                    ${ingredientLines || '<div class="empty-text">暂无配料信息</div>'}
                </div>
            </div>
            
            <div class="section">
                <div class="section-label">香韵三调</div>
                <div class="notes-grid">
                    <div class="note-item">
                        <span class="note-label">前调</span>
                        <div class="note-content">
                            ${topNote.material ? `<span class="note-material">${topNote.material}</span>` : ''}
                            ${topNote.sensory ? `<span class="note-sensory">${topNote.sensory}</span>` : ''}
                            ${topNote.scene ? `<span class="note-scene">${topNote.scene}</span>` : ''}
                        </div>
                    </div>
                    <div class="note-item">
                        <span class="note-label">中调</span>
                        <div class="note-content">
                            ${middleNote.material ? `<span class="note-material">${middleNote.material}</span>` : ''}
                            ${middleNote.sensory ? `<span class="note-sensory">${middleNote.sensory}</span>` : ''}
                            ${middleNote.scene ? `<span class="note-scene">${middleNote.scene}</span>` : ''}
                        </div>
                    </div>
                    <div class="note-item">
                        <span class="note-label">尾调</span>
                        <div class="note-content">
                            ${baseNote.material ? `<span class="note-material">${baseNote.material}</span>` : ''}
                            ${baseNote.sensory ? `<span class="note-sensory">${baseNote.sensory}</span>` : ''}
                            ${baseNote.scene ? `<span class="note-scene">${baseNote.scene}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="base-info">
                <div class="base-info-item">
                    <span class="base-label">整体性味</span>
                    <span class="base-value">${formula.formula_nature || '性味平和'}</span>
                </div>
                <div class="base-info-item">
                    <span class="base-label">古法功效</span>
                    <span class="base-value">${formula.efficacy || '清心悦神，辟秽怡情'}</span>
                </div>
            </div>
            
            ${formula.method ? `
            <div class="method-section">
                <div class="section-label">调制方法</div>
                <ol class="method-list">
                    ${formula.method.split(/\d\./).filter(item => item.trim()).map(step => `<li>${step.trim()}</li>`).join('')}
                </ol>
            </div>
            ` : ''}
            
            ${formula.contraindication ? `
            <div class="warning-box">
                <div class="section-label">使用禁忌</div>
                <p>${formula.contraindication}</p>
            </div>
            ` : ''}
            
            <div class="tag-group">
                <span class="section-label">意境</span>
                ${moodTags}
            </div>
            <div class="tag-group">
                <span class="section-label">场景</span>
                ${sceneTags}
            </div>
            <div class="tag-group">
                <span class="section-label">时节</span>
                ${seasonTags}
            </div>
        </div>
    `;
}

function renderPoemCard(formula) {
    if (!formula) return '';
    
    const ingredients = formula.ingredients || [];
    const displayIngredients = ingredients.slice(0, 6);
    
    return `
        <div class="poem-card">
            <div class="poem-inner">
                <div class="poem-corner poem-corner-tl"></div>
                <div class="poem-corner poem-corner-tr"></div>
                <div class="poem-corner poem-corner-bl"></div>
                <div class="poem-corner poem-corner-br"></div>
                
                <div class="poem-header">
                    <div class="poem-title">${formula.name}</div>
                    <div class="poem-subtitle">「合香有方AI」</div>
                </div>
                
                <div class="poem-divider"></div>
                
                <div class="poem-main">
                    <div class="poem-slogan">${formula.sensory_text || '香气氤氲，自有东方雅韵'}</div>
                </div>
                
                <div class="poem-divider"></div>
                
                <div class="poem-herbs">
                    ${displayIngredients.map(ing => `<span class="herb-tag">${ing.name} ${ing.amount ? parseFloat(ing.amount).toFixed(1) : ''}g</span>`).join('')}
                </div>
                
                <div class="poem-footer">
                    <span class="footer-text">合香有方AI·让无形变有香</span>
                    <img src="./images/logo.png" alt="logo" class="footer-logo">
                </div>
                
                <div class="poem-dots"></div>
            </div>
            <div class="poem-buttons">
                <button class="poem-btn" onclick="showToast('分享成功')">分享</button>
                <button class="poem-btn" onclick="showToast('下载成功')">下载</button>
            </div>
        </div>
    `;
}

function renderDoubleCard(formula) {
    return `
        <div class="detail-container">
            ${renderPoemCard(formula)}
            ${renderDetailCard(formula)}
        </div>
    `;
}

function renderCard(formula) {
    return renderDoubleCard(formula);
}

export {
    renderCard,
    renderDetailCard,
    renderPoemCard,
    renderDoubleCard
};
