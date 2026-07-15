import { knowledgeBase } from './knowledge.js';

const DRY_REGION_FORBIDDEN_WORDS = ['阴干', '湿窨', '窖藏补水', '水窨', '浸取', '湿法'];

const MOOD_TAGS_POOL = ['宁静', '庄重', '悠远', '治愈', '活泼', '清冷', '清雅', '温暖', '神秘'];
const SCENE_TAGS_POOL = ['书房', '卧室', '古寺', '山林', '春日', '湖畔', '茶席', '雨巷'];
const SEASON_TAGS_POOL = ['春', '夏', '秋', '冬'];

function initValidator() {
}

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

function validateFormula(formula, baseFormula = null, isDryRegion = false) {
    const errors = [];
    const warnings = [];
    
    if (!formula.name || formula.name.trim() === '') {
        errors.push('香方名称不能为空');
    }
    
    if (!formula.ingredients || formula.ingredients.length === 0) {
        errors.push('香方必须包含至少一种香材');
    } else {
        const roles = new Set();
        const validNames = knowledgeBase.getValidIngredientNames();
        const validIds = knowledgeBase.getValidIngredientIds();
        
        formula.ingredients.forEach((ing, index) => {
            if (!ing.name || ing.name.trim() === '') {
                errors.push(`第${index + 1}种香材名称不能为空`);
            } else if (!ing.material_id && !isValidIngredient(ing.name)) {
                errors.push(`第${index + 1}种香材"${ing.name}"不在白名单中`);
            } else if (ing.material_id && !isValidIngredientId(ing.material_id)) {
                errors.push(`第${index + 1}种香材ID"${ing.material_id}"无效`);
            }
            
            if (!ing.role) {
                errors.push(`第${index + 1}种香材"${ing.name}"未指定君臣佐使角色`);
            } else {
                roles.add(ing.role);
            }
            
            if (ing.amount !== undefined && ing.amount !== null) {
                const amountResult = validateIngredientAmount(ing.name, ing.amount);
                if (!amountResult.valid) {
                    errors.push(amountResult.message);
                }
            }
        });
        
        if (!roles.has('君')) {
            errors.push('香方必须包含"君"香材');
        }
    }
    
    const totalWeightResult = validateTotalWeight(formula);
    if (!totalWeightResult.valid) {
        errors.push(totalWeightResult.message);
    }
    
    if (baseFormula) {
        const monarchResult = checkMonarchConsistency(formula, baseFormula);
        if (!monarchResult.valid) {
            errors.push(`君药一致性校验失败: ${monarchResult.message}`);
        }
        
        const ministerResult = checkMinisterConsistency(formula, baseFormula);
        if (!ministerResult.valid) {
            errors.push(`臣药一致性校验失败: ${ministerResult.message}`);
        }
    }
    
    const forbiddenResult = checkForbiddenWords(formula.method, isDryRegion);
    if (!forbiddenResult.valid) {
        errors.push(forbiddenResult.message);
    }
    
    const tagResult = validateTags(formula);
    if (!tagResult.valid) {
        errors.push(...tagResult.errors);
    }
    
    const confidenceResult = checkConfidence(formula);
    if (confidenceResult.low) {
        warnings.push(confidenceResult.message);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        isCreative: confidenceResult.low,
        isGeoLimited: formula.ai_confidence < 0.75
    };
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

export {
    initValidator,
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
    sanitizeFormula,
    detectHallucination
};
