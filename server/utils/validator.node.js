import { knowledgeBase } from './knowledge.node.js';

const DRY_REGION_FORBIDDEN_WORDS = ['阴干', '湿窨', '窖藏补水', '水窨', '浸取', '湿法'];

const MOOD_TAGS_POOL = ['宁静', '庄重', '悠远', '治愈', '活泼', '清冷', '清雅', '温暖', '神秘'];
const SCENE_TAGS_POOL = ['书房', '卧室', '古寺', '山林', '春日', '湖畔', '茶席', '雨巷'];
const SEASON_TAGS_POOL = ['春', '夏', '秋', '冬'];

const VALID_MONARCHS = ['沉香', '檀香', '零陵香', '丁香', '玄参', '甘松香'];

function isValidIngredient(name) {
    const normalized = name.trim();
    const validNames = knowledgeBase.getValidIngredientNames();
    const validAliases = knowledgeBase.getIngredientAliases();
    return validNames.includes(normalized) || validAliases.includes(normalized);
}

function isValidIngredientId(id) {
    const validIds = knowledgeBase.getValidIngredientIds();
    return validIds.includes(id);
}

function checkIngredientsValid(formula) {
    const validIds = knowledgeBase.getValidIngredientIds();
    const hasId = formula.ingredients.every(ing => ing.material_id && validIds.includes(ing.material_id));
    if (hasId) return { valid: true, method: 'material_id' };

    const validNames = knowledgeBase.getValidIngredientNames();
    return { valid: formula.ingredients.every(ing => validNames.includes(ing.name)), method: 'name' };
}

function checkConfidence(formula) {
    const result = { low: false, message: '' };
    if (formula.ai_confidence < 0.8) {
        result.low = true;
        result.message = '置信度较低，已标记为创意调香';
        if (formula.ai_confidence < 0.75) {
            result.message += '，地理适配受限';
        }
    }
    return result;
}

function extractIngredients(text) {
    const foundIngredients = [];
    const textLower = text.toLowerCase();
    const validNames = knowledgeBase.getValidIngredientNames();
    const validAliases = knowledgeBase.getIngredientAliases();
    
    validNames.forEach(name => {
        if (text.includes(name)) {
            foundIngredients.push(name);
        }
    });
    
    validAliases.forEach(alias => {
        if (text.includes(alias) && !foundIngredients.includes(alias)) {
            foundIngredients.push(alias);
        }
    });
    
    return [...new Set(foundIngredients)];
}

function validateIngredientAmount(name, amount) {
    const ingredient = knowledgeBase.findIngredient(name);
    if (!ingredient) {
        return { valid: false, message: `未知香材: ${name}` };
    }
    
    if (amount < ingredient.amount_min) {
        return { 
            valid: false, 
            message: `${name}用量(${amount}g)低于最小用量(${ingredient.amount_min}g)` 
        };
    }
    
    if (amount > ingredient.amount_max) {
        return { 
            valid: false, 
            message: `${name}用量(${amount}g)超过最大用量(${ingredient.amount_max}g)` 
        };
    }
    
    return { valid: true, message: '' };
}

function checkMonarchConsistency(aiFormula, baseFormula) {
    if (!baseFormula || !baseFormula.ingredients) {
        return { valid: true, message: '无基底古方可供比对' };
    }
    
    const baseMonarchs = new Set(
        baseFormula.ingredients
            .filter(ing => ing.role === '君')
            .map(ing => ing.name)
    );
    
    const aiMonarchs = new Set(
        aiFormula.ingredients
            .filter(ing => ing.role === '君')
            .map(ing => ing.name)
    );
    
    const missingMonarchs = [...baseMonarchs].filter(m => !aiMonarchs.has(m));
    const extraMonarchs = [...aiMonarchs].filter(m => !baseMonarchs.has(m));
    
    if (missingMonarchs.length > 0 || extraMonarchs.length > 0) {
        const errors = [];
        if (missingMonarchs.length > 0) {
            errors.push(`缺失君药: ${missingMonarchs.join(', ')}`);
        }
        if (extraMonarchs.length > 0) {
            errors.push(`额外君药: ${extraMonarchs.join(', ')}`);
        }
        return { valid: false, message: errors.join('; ') };
    }
    
    return { valid: true, message: '' };
}

function checkMinisterConsistency(aiFormula, baseFormula) {
    if (!baseFormula || !baseFormula.ingredients) {
        return { valid: true, message: '无基底古方可供比对' };
    }
    
    const baseMinisters = new Set(
        baseFormula.ingredients
            .filter(ing => ing.role === '臣')
            .map(ing => ing.name)
    );
    
    const aiMinisters = new Set(
        aiFormula.ingredients
            .filter(ing => ing.role === '臣')
            .map(ing => ing.name)
    );
    
    const missingMinisters = [...baseMinisters].filter(m => !aiMinisters.has(m));
    const extraMinisters = [...aiMinisters].filter(m => !baseMinisters.has(m));
    
    if (missingMinisters.length > 0 || extraMinisters.length > 0) {
        const errors = [];
        if (missingMinisters.length > 0) {
            errors.push(`缺失臣药: ${missingMinisters.join(', ')}`);
        }
        if (extraMinisters.length > 0) {
            errors.push(`额外臣药: ${extraMinisters.join(', ')}`);
        }
        return { valid: false, message: errors.join('; ') };
    }
    
    return { valid: true, message: '' };
}

function checkForbiddenWords(method, isDryRegion) {
    if (!method || !isDryRegion) {
        return { valid: true, message: '' };
    }
    
    const foundForbidden = DRY_REGION_FORBIDDEN_WORDS.filter(word => method.includes(word));
    if (foundForbidden.length > 0) {
        return { 
            valid: false, 
            message: `干燥地区调制方法包含禁词: ${foundForbidden.join(', ')}` 
        };
    }
    
    return { valid: true, message: '' };
}

function validateTags(formula) {
    const errors = [];
    
    if (formula.mood_tags) {
        const invalidMoodTags = formula.mood_tags.filter(tag => !MOOD_TAGS_POOL.includes(tag));
        if (invalidMoodTags.length > 0) {
            errors.push(`无效情绪标签: ${invalidMoodTags.join(', ')}，可选值: ${MOOD_TAGS_POOL.join(', ')}`);
        }
        if (formula.mood_tags.length > 2) {
            errors.push(`情绪标签超过2个限制，当前数量: ${formula.mood_tags.length}`);
        }
    }
    
    if (formula.scene_tags) {
        const invalidSceneTags = formula.scene_tags.filter(tag => !SCENE_TAGS_POOL.includes(tag));
        if (invalidSceneTags.length > 0) {
            errors.push(`无效场景标签: ${invalidSceneTags.join(', ')}，可选值: ${SCENE_TAGS_POOL.join(', ')}`);
        }
        if (formula.scene_tags.length > 2) {
            errors.push(`场景标签超过2个限制，当前数量: ${formula.scene_tags.length}`);
        }
    }
    
    if (formula.season_tags) {
        const invalidSeasonTags = formula.season_tags.filter(tag => !SEASON_TAGS_POOL.includes(tag));
        if (invalidSeasonTags.length > 0) {
            errors.push(`无效季节标签: ${invalidSeasonTags.join(', ')}，可选值: ${SEASON_TAGS_POOL.join(', ')}`);
        }
        if (formula.season_tags.length > 2) {
            errors.push(`季节标签超过2个限制，当前数量: ${formula.season_tags.length}`);
        }
    }
    
    return { valid: errors.length === 0, errors };
}

function validateTotalWeight(formula) {
    if (!formula.ingredients || formula.ingredients.length === 0) {
        return { valid: true, message: '' };
    }
    
    const totalWeight = formula.ingredients.reduce((sum, ing) => sum + (ing.amount || 0), 0);
    
    if (totalWeight < 8) {
        return { valid: false, message: `配方总重量(${totalWeight}g)低于8g要求` };
    }
    
    if (totalWeight > 20) {
        return { valid: false, message: `配方总重量(${totalWeight}g)超过20g要求` };
    }
    
    return { valid: true, message: '' };
}

function validateMonarchCompliance(formula, sceneType = 'travel') {
    if (!formula || !formula.ingredients) {
        return { valid: false, message: '配方结构错误' };
    }
    
    const monarchs = formula.ingredients
        .filter(ing => ing.role === '君')
        .map(ing => ing.name);
    
    if (monarchs.length === 0) {
        return { valid: false, message: '配方中没有君药' };
    }
    
    const invalidMonarchs = monarchs.filter(m => !VALID_MONARCHS.includes(m));
    if (invalidMonarchs.length > 0) {
        return { 
            valid: false, 
            message: `君药不在备选库中：${invalidMonarchs.join(', ')}，备选君药：${VALID_MONARCHS.join(', ')}` 
        };
    }
    
    const mapping = {
        'travel': ['山林', '冬日', '沉稳', '江南', '春日', '茶席', '书房'],
        'memory': ['温暖', '治愈', '宁静', '旧时光', '童年', '书房'],
        'character': ['清冷', '温柔', '庄重', '活泼', '神秘', '沉静']
    };
    
    const sceneKeywords = mapping[sceneType] || [];
    const text = (formula.mood_tags?.join('') || '') + (formula.scene_tags?.join('') || '');
    
    let hasMatch = false;
    monarchs.forEach(monarch => {
        const monarchKeywords = knowledgeBase.getSceneMonarchMapping?.()[monarch] || [];
        monarchKeywords.forEach(keyword => {
            if (text.includes(keyword) || sceneKeywords.includes(keyword)) {
                hasMatch = true;
            }
        });
    });
    
    if (!hasMatch) {
        return { 
            valid: false, 
            message: `君药(${monarchs.join(', ')})与场景调性不匹配，请尝试其他君药` 
        };
    }
    
    return { valid: true, message: '' };
}

function validateMonarchDeduplication(formula, lastMonarch) {
    if (!lastMonarch) {
        return { valid: true, message: '无历史记录，无需去重校验' };
    }
    
    const monarchs = formula.ingredients
        .filter(ing => ing.role === '君')
        .map(ing => ing.name);
    
    const hasDuplicate = monarchs.some(m => m === lastMonarch);
    if (hasDuplicate) {
        return { 
            valid: false, 
            message: `君药(${lastMonarch})与上一版重复，请切换基底` 
        };
    }
    
    return { valid: true, message: '' };
}

function validateFormula(aiFormula, baseFormula, whitelist) {
    if (!aiFormula || !aiFormula.ingredients || !Array.isArray(aiFormula.ingredients)) {
        return { pass: false, reason: '配料结构错误' };
    }
    
    const getIngNames = (list, role) =>
        list.filter(i => i.role?.trim() === role).map(i => i.name.trim());
    
    // 红线1：君药名称必须和基底方完全一致（核心骨架不能动）
    const baseKing = getIngNames(baseFormula.ingredients, '君');
    const aiKing = getIngNames(aiFormula.ingredients, '君');
    const kingValid = baseKing.every(name => aiKing.includes(name));
    if (!kingValid) return { pass: false, reason: '君药被替换' };
    
    // 红线2：臣药名称必须和基底方完全一致（核心骨架不能动）
    const baseMinister = getIngNames(baseFormula.ingredients, '臣');
    const aiMinister = getIngNames(aiFormula.ingredients, '臣');
    const ministerValid = baseMinister.every(name => aiMinister.includes(name));
    if (!ministerValid) return { pass: false, reason: '臣药被替换' };
    
    // 红线3：所有香材必须在白名单内
    const validNames = whitelist.map(i => i.name.trim());
    const invalidIng = aiFormula.ingredients.find(ing => !validNames.includes(ing.name.trim()));
    if (invalidIng) return { pass: false, reason: `非法香材：${invalidIng.name}` };
    
    // 红线4：用量必须是数字，且在安全区间内
    const overAmount = aiFormula.ingredients.find(ing => {
        const standard = whitelist.find(i => i.name.trim() === ing.name.trim());
        if (!standard) return true;
        const amount = Number(ing.amount);
        return isNaN(amount) || amount < standard.amount_min || amount > standard.amount_max;
    });
    if (overAmount) return { pass: false, reason: `用量违规：${overAmount.name}` };
    
    return { pass: true, reason: '' };
}

function sanitizeFormula(formula) {
    if (!formula) return null;
    
    const sanitized = { ...formula };
    
    if (sanitized.ingredients) {
        sanitized.ingredients = sanitized.ingredients
            .filter(ing => ing.name && isValidIngredient(ing.name))
            .map(ing => {
                const normalizedIng = { ...ing };
                const ingredient = knowledgeBase.findIngredient(ing.name);
                
                if (ingredient) {
                    normalizedIng.name = ingredient.name;
                    normalizedIng.material_id = ingredient.id;
                    normalizedIng.property = ingredient.property;
                    
                    if (normalizedIng.amount !== undefined && normalizedIng.amount !== null) {
                        normalizedIng.amount = Math.max(
                            ingredient.amount_min,
                            Math.min(ingredient.amount_max, normalizedIng.amount)
                        );
                    }
                }
                
                if (!normalizedIng.unit) normalizedIng.unit = "g";
                if (!normalizedIng.property) normalizedIng.property = "平";
                
                return normalizedIng;
            });
    }
    
    if (sanitized.mood_tags) {
        sanitized.mood_tags = sanitized.mood_tags.filter(tag => MOOD_TAGS_POOL.includes(tag)).slice(0, 2);
    }
    
    if (sanitized.scene_tags) {
        sanitized.scene_tags = sanitized.scene_tags.filter(tag => SCENE_TAGS_POOL.includes(tag)).slice(0, 2);
    }
    
    if (sanitized.season_tags) {
        sanitized.season_tags = sanitized.season_tags.filter(tag => SEASON_TAGS_POOL.includes(tag)).slice(0, 2);
    }
    
    return knowledgeBase.sanitizeFormula(sanitized);
}

function detectHallucination(text) {
    const ingredients = extractIngredients(text);
    const invalidIngredients = ingredients.filter(ing => !isValidIngredient(ing));
    
    const hallucinationScore = {
        detected: invalidIngredients.length > 0,
        suspiciousIngredients: invalidIngredients,
        confidence: ingredients.length > 0 ? 1 - (invalidIngredients.length / ingredients.length) : 1
    };
    
    return hallucinationScore;
}

function findMostSimilarIngredient(invalidName, whitelist) {
    let bestMatch = null;
    let highestScore = 0;
    const normalizedInvalid = invalidName.trim().toLowerCase();
    
    whitelist.forEach(ing => {
        if (!ing.name) return;
        
        let score = 0;
        const normalizedName = ing.name.toLowerCase();
        
        if (ing.aliases && ing.aliases.includes(normalizedInvalid)) {
            score += 100;
        }
        
        if (normalizedName.includes(normalizedInvalid) || normalizedInvalid.includes(normalizedName)) {
            score += 50;
        }
        
        const nameLength = Math.max(normalizedName.length, normalizedInvalid.length);
        const commonChars = [...normalizedName].filter(c => normalizedInvalid.includes(c)).length;
        const similarity = commonChars / nameLength;
        score += Math.floor(similarity * 40);
        
        if (score > highestScore) {
            highestScore = score;
            bestMatch = ing;
        }
    });
    
    return highestScore > 50 ? bestMatch : null;
}

function validateAndRepair(aiFormula, baseFormula, whitelist) {
    const warnings = [];
    let repaired = JSON.parse(JSON.stringify(aiFormula));
    
    // 1. 君药臣药一致性校验与修复（宽松版：允许AI添加额外君臣药，自动恢复被替换的君臣药）
    const baseKingNames = new Set(
        baseFormula.ingredients
            .filter(ing => ing.role === '君')
            .map(ing => ing.name)
    );
    
    const baseMinisterNames = new Set(
        baseFormula.ingredients
            .filter(ing => ing.role === '臣')
            .map(ing => ing.name)
    );
    
    const aiKingNames = new Set(
        repaired.ingredients
            .filter(ing => ing.role === '君')
            .map(ing => ing.name)
    );
    
    const aiMinisterNames = new Set(
        repaired.ingredients
            .filter(ing => ing.role === '臣')
            .map(ing => ing.name)
    );
    
    // 检查君药是否缺失
    const missingKings = [...baseKingNames].filter(name => !aiKingNames.has(name) && !aiMinisterNames.has(name));
    // 检查臣药是否缺失
    const missingMinisters = [...baseMinisterNames].filter(name => !aiMinisterNames.has(name) && !aiKingNames.has(name));
    
    if (missingKings.length > 0 || missingMinisters.length > 0) {
        const messages = [];
        if (missingKings.length > 0) messages.push(`缺失君药: ${missingKings.join(', ')}`);
        if (missingMinisters.length > 0) messages.push(`缺失臣药: ${missingMinisters.join(', ')}`);
        return {
            isValid: false,
            repairedFormula: baseFormula,
            warnings: [`君药臣药不一致: ${messages.join('; ')}`]
        };
    }
    
    // 自动修复君臣药角色：确保基底方的君臣药角色正确
    repaired.ingredients = repaired.ingredients.map(ing => {
        const fixedIng = { ...ing };
        if (baseKingNames.has(ing.name) && ing.role !== '君') {
            warnings.push(`香材"${ing.name}"角色从"${ing.role}"修正为"君"`);
            fixedIng.role = '君';
        } else if (baseMinisterNames.has(ing.name) && ing.role !== '臣') {
            warnings.push(`香材"${ing.name}"角色从"${ing.role}"修正为"臣"`);
            fixedIng.role = '臣';
        }
        return fixedIng;
    });
    
    // 2. 香材白名单校验与修复
    repaired.ingredients = (repaired.ingredients || []).map(ing => {
        let fixedIng = { ...ing };
        
        const validIng = whitelist.find(i => 
            i.id === ing.material_id || 
            i.name === ing.name ||
            (i.aliases && i.aliases.includes(ing.name))
        );
        
        if (!validIng) {
            const similarIng = findMostSimilarIngredient(ing.name, whitelist);
            if (similarIng) {
                warnings.push(`香材"${ing.name}"替换为相似香材"${similarIng.name}"`);
                fixedIng = {
                    ...similarIng,
                    role: ing.role,
                    amount: ing.amount
                };
            } else {
                warnings.push(`移除无效香材: ${ing.name}`);
                return null;
            }
        } else {
            fixedIng.name = validIng.name;
            fixedIng.material_id = validIng.id;
            fixedIng.property = validIng.property;
        }
        
        // 3. 用量安全区间检查
        const ingredientInfo = whitelist.find(i => i.id === fixedIng.material_id) || validIng;
        if (ingredientInfo && fixedIng.amount !== undefined && fixedIng.amount !== null) {
            if (fixedIng.amount < ingredientInfo.amount_min) {
                warnings.push(`${fixedIng.name}用量(${fixedIng.amount}g)低于最小用量，已调整至${ingredientInfo.amount_min}g`);
                fixedIng.amount = ingredientInfo.amount_min;
            } else if (fixedIng.amount > ingredientInfo.amount_max) {
                warnings.push(`${fixedIng.name}用量(${fixedIng.amount}g)超过最大用量，已调整至${ingredientInfo.amount_max}g`);
                fixedIng.amount = ingredientInfo.amount_max;
            }
        }
        
        if (!fixedIng.unit) fixedIng.unit = "g";
        if (!fixedIng.property) fixedIng.property = "平";
        
        return fixedIng;
    }).filter(Boolean);
    
    // 总重量检查
    const totalWeight = repaired.ingredients.reduce((sum, ing) => sum + (ing.amount || 0), 0);
    if (totalWeight < 8) {
        const honey = whitelist.find(i => i.name === '蜂蜜');
        const honeyAmount = Math.min(8 - totalWeight, honey ? honey.amount_max - honey.amount_min : 10);
        warnings.push(`配方总重量(${totalWeight.toFixed(1)}g)低于8g，已补充蜂蜜${honeyAmount.toFixed(1)}g`);
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
            const ingredientInfo = whitelist.find(w => w.id === ing.material_id);
            if (!ingredientInfo) continue;
            
            const canReduce = Math.min(remainingExcess, ing.amount - ingredientInfo.amount_min);
            if (canReduce > 0) {
                ing.amount -= canReduce;
                remainingExcess -= canReduce;
            }
        }
        
        warnings.push(`配方总重量(${totalWeight.toFixed(1)}g)超过20g，已按比例减少用量至20g`);
    }
    
    // 4. 标签池校验
    repaired.mood_tags = (repaired.mood_tags || []).filter(tag => MOOD_TAGS_POOL.includes(tag)).slice(0, 2);
    repaired.scene_tags = (repaired.scene_tags || []).filter(tag => SCENE_TAGS_POOL.includes(tag)).slice(0, 2);
    repaired.season_tags = (repaired.season_tags || []).filter(tag => SEASON_TAGS_POOL.includes(tag)).slice(0, 2);
    
    // 5. 地理适配禁忌词扫描
    if (repaired.isDryRegion && repaired.method) {
        const foundForbidden = DRY_REGION_FORBIDDEN_WORDS.filter(word => repaired.method.includes(word));
        if (foundForbidden.length > 0) {
            repaired.method = repaired.method.replace(/阴干|湿窨|窖藏补水|水窨|浸取|湿法/g, '炼蜜为丸');
            warnings.push(`干燥地区调制方法包含禁词"${foundForbidden.join('、')}"，已替换为"炼蜜为丸"`);
        }
    }
    
    return {
        isValid: true,
        repairedFormula: repaired,
        warnings
    };
}

export {
    isValidIngredient,
    isValidIngredientId,
    checkIngredientsValid,
    checkConfidence,
    checkMonarchConsistency,
    checkMinisterConsistency,
    checkForbiddenWords,
    validateTags,
    validateTotalWeight,
    extractIngredients,
    validateIngredientAmount,
    validateFormula,
    validateMonarchCompliance,
    validateMonarchDeduplication,
    sanitizeFormula,
    detectHallucination,
    findMostSimilarIngredient,
    validateAndRepair
};