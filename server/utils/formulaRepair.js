const VALID_MOOD = ['宁静', '庄重', '悠远', '治愈', '活泼', '清冷', '清雅', '温暖', '神秘', '书香', '温婉', '闲适', '恬淡', '古朴', '雅致', '清幽', '空灵', '醇厚', '芬芳', '馥郁'];
const VALID_SCENE = ['书房', '卧室', '古寺', '山林', '春日', '湖畔', '茶席', '雨巷', '园林', '草原', '沙漠', '海边', '雪山', '古镇', '书院', '庭院', '寺庙', '旷野', '竹林'];
const VALID_SEASON = ['春', '夏', '秋', '冬', '春日', '夏日', '秋日', '冬日', '初春', '暮春', '盛夏', '深秋', '严冬'];

function repairFormula(formula, baseFormula, whitelist) {
    const repaired = JSON.parse(JSON.stringify(formula));

    // 1. 修复标签：不在白名单的过滤掉，取前2个
    repaired.mood_tags = (repaired.mood_tags || []).filter(t => VALID_MOOD.includes(t)).slice(0, 2);
    if (repaired.mood_tags.length === 0 && baseFormula.mood_tags) {
        repaired.mood_tags = baseFormula.mood_tags.slice(0, 2);
    }

    repaired.scene_tags = (repaired.scene_tags || []).filter(t => VALID_SCENE.includes(t)).slice(0, 2);
    if (repaired.scene_tags.length === 0 && baseFormula.scene_tags) {
        repaired.scene_tags = baseFormula.scene_tags.slice(0, 2);
    }

    repaired.season_tags = (repaired.season_tags || []).filter(t => VALID_SEASON.includes(t)).slice(0, 2);
    if (repaired.season_tags.length === 0 && baseFormula.season_tags) {
        repaired.season_tags = baseFormula.season_tags.slice(0, 2);
    }

    // 2. 修复用量浮动：超30%但在安全区间内，拉回30%边界
    if (repaired.ingredients && baseFormula.ingredients) {
        repaired.ingredients = repaired.ingredients.map(ing => {
            const baseIng = baseFormula.ingredients.find(i => i.name === ing.name);
            if (!baseIng) return ing;

            const maxFloat = baseIng.amount * 0.3;
            const upper = baseIng.amount + maxFloat;
            const lower = baseIng.amount - maxFloat;

            if (ing.amount > upper) ing.amount = Number(upper.toFixed(2));
            if (ing.amount < lower) ing.amount = Math.max(Number(lower.toFixed(2)), 0.01);

            return ing;
        });
    }

    // 3. 用量安全区间裁剪（确保在amount_min/max之间）
    if (repaired.ingredients && whitelist) {
        repaired.ingredients = repaired.ingredients.map(ing => {
            const ingredientInfo = whitelist.find(i => i.name === ing.name || i.id === ing.material_id);
            if (!ingredientInfo) return ing;

            if (ing.amount < ingredientInfo.amount_min) {
                ing.amount = ingredientInfo.amount_min;
            } else if (ing.amount > ingredientInfo.amount_max) {
                ing.amount = ingredientInfo.amount_max;
            }

            return ing;
        });
    }

    // 4. 补全缺失字段
    const fallback = {
        card_badge: baseFormula.card_badge || '东方雅香',
        formula_nature: baseFormula.formula_nature || '性味平和',
        efficacy: baseFormula.efficacy || '清心悦神',
        contraindication: '孕妇、婴幼儿、呼吸道敏感者慎用；过敏者禁用；仅作香薰不可内服',
        sensory_text: baseFormula.sensory_text || '香气氤氲，层次和合',
        source: baseFormula.source || '',
        place_insight: baseFormula.place_insight || '',
        memory_insight: baseFormula.memory_insight || '',
        memory_slogan: baseFormula.memory_slogan || '',
        inspiration: baseFormula.inspiration || '',
        adjust_reason: baseFormula.adjust_reason || '',
        formula_ratio: baseFormula.formula_ratio || '',
        top_note: baseFormula.top_note || '',
        middle_note: baseFormula.middle_note || '',
        base_note: baseFormula.base_note || '',
        method: baseFormula.method || '古法合香，细研和蜜，窖藏七日可用',
        adjust_scope: baseFormula.adjust_scope || '',
        changes_made: baseFormula.changes_made || ''
    };
    
    Object.keys(fallback).forEach(key => {
        if (!repaired[key]) repaired[key] = fallback[key];
    });
    
    // 记忆专属字段兜底：缺失时用sensory_text填充
    if (!repaired.memory_insight && repaired.sensory_text) {
        repaired.memory_insight = repaired.sensory_text;
    }
    if (!repaired.memory_slogan && repaired.sensory_text) {
        repaired.memory_slogan = repaired.sensory_text;
    }

    // 5. 总重量检查与调整（8-20g）
    if (repaired.ingredients) {
        const totalWeight = repaired.ingredients.reduce((sum, ing) => sum + (ing.amount || 0), 0);
        
        if (totalWeight < 8) {
            const honey = whitelist ? whitelist.find(i => i.name === '蜂蜜') : null;
            const honeyAmount = Math.min(8 - totalWeight, honey ? honey.amount_max - honey.amount_min : 10);
            repaired.ingredients.push({
                name: '蜂蜜',
                role: '使',
                amount: honeyAmount,
                unit: 'g',
                material_id: 'i103',
                property: '平'
            });
        } else if (totalWeight > 20) {
            const excess = totalWeight - 20;
            let remainingExcess = excess;
            
            for (let i = repaired.ingredients.length - 1; i >= 0 && remainingExcess > 0; i--) {
                const ing = repaired.ingredients[i];
                const ingredientInfo = whitelist ? whitelist.find(w => w.id === ing.material_id || w.name === ing.name) : null;
                if (!ingredientInfo) continue;
                
                const canReduce = Math.min(remainingExcess, ing.amount - ingredientInfo.amount_min);
                if (canReduce > 0) {
                    ing.amount -= canReduce;
                    remainingExcess -= canReduce;
                }
            }
        }
    }

    // 6. 地理适配禁忌词扫描（干旱地区）
    if (repaired.isDryRegion && repaired.method) {
        repaired.method = repaired.method.replace(/阴干|湿窨|窖藏补水|水窨|浸取|湿法/g, '炼蜜为丸');
    }

    return repaired;
}

export { repairFormula };