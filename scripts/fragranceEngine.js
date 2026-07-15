import { aiClient } from './api.js';
import { knowledgeBase } from './knowledge.js';
import { initValidator, validateFormula, sanitizeFormula, checkMonarchConsistency, checkMinisterConsistency, checkForbiddenWords } from './validator.js';

let isInitialized = false;

const DRY_REGIONS = ['西北', '塞北', '新疆', '西藏', '蒙古', '敦煌', '戈壁', '沙漠', '高原', '北欧', '西伯利亚', '阿拉斯加'];

async function init() {
    if (isInitialized) return;
    
    await knowledgeBase.init();
    initValidator();
    isInitialized = true;
}

function isDryRegion(region) {
    return DRY_REGIONS.some(dry => region.includes(dry));
}

function buildIngredientWhitelist() {
    return knowledgeBase.ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        property: ing.property,
        amount_min: ing.amount_min !== undefined ? ing.amount_min : 0,
        amount_max: ing.amount_max !== undefined ? ing.amount_max : 10
    }));
}

async function generateTravelFormula(region) {
    await init();
    
    const baseFormula = knowledgeBase.matchBaseFormula(region, 'travel');
    
    if (!baseFormula) {
        return {
            success: false,
            error: '未能匹配到基底古方'
        };
    }
    
    const ingredientWhitelist = buildIngredientWhitelist();
    
    let formula;
    try {
        formula = await aiClient.generateTravelFragrance(baseFormula, ingredientWhitelist, region);
    } catch (error) {
        console.error('AI调用失败:', error);
    }
    
    if (!formula) {
        console.warn('AI响应为空，使用Mock响应');
        formula = aiClient.getMockTravelResponse(baseFormula, region);
    }
    
    const dryRegion = isDryRegion(region);
    const validation = validateFormula(formula, baseFormula, dryRegion);
    
    if (!validation.valid) {
        console.warn('Validation failed:', validation);
        
        const monarchCheck = checkMonarchConsistency(formula, baseFormula);
        const ministerCheck = checkMinisterConsistency(formula, baseFormula);
        
        if (!monarchCheck.valid || !ministerCheck.valid) {
            console.warn('君臣药一致性校验失败，回退到基底古方');
            return {
                success: true,
                formula: baseFormula,
                warnings: ['AI生成香方君臣药不一致，使用基底古方'],
                hallucinationDetected: false,
                aiGenerated: false
            };
        }
        
        const forbiddenCheck = checkForbiddenWords(formula.method, dryRegion);
        if (!forbiddenCheck.valid) {
            console.warn('干燥地区禁词校验失败，修正调制方法');
            formula.method = formula.method.replace(/阴干|湿窨|窖藏补水|水窨|浸取|湿法/g, '常温压模');
        }
        
        formula = sanitizeFormula(formula);
    }
    
    return {
        success: true,
        formula,
        warnings: validation.warnings,
        hallucinationDetected: false,
        aiGenerated: true,
        isCreative: validation.isCreative,
        isGeoLimited: validation.isGeoLimited
    };
}

async function generateMemoryFormula(memory) {
    await init();
    
    const baseFormula = knowledgeBase.matchBaseFormula(memory, 'memory');
    
    if (baseFormula) {
        return {
            success: true,
            formula: baseFormula,
            warnings: [],
            hallucinationDetected: false,
            aiGenerated: false
        };
    }
    
    const ingredientWhitelist = buildIngredientWhitelist();
    
    let formula;
    try {
        formula = await aiClient.generateMemoryFragrance(memory, ingredientWhitelist);
    } catch (error) {
        console.error('AI调用失败:', error);
    }
    
    if (!formula) {
        console.warn('AI响应为空，使用Mock响应');
        formula = aiClient.getMockMemoryResponse(memory);
    }
    
    const validation = validateFormula(formula);
    if (!validation.valid) {
        console.warn('Validation failed:', validation);
        formula = sanitizeFormula(formula);
    }
    
    return {
        success: true,
        formula,
        warnings: validation.warnings,
        hallucinationDetected: false,
        aiGenerated: true,
        isCreative: validation.isCreative
    };
}

async function generateCharacterResponse(message) {
    await init();
    
    const baseFormula = knowledgeBase.matchBaseFormula(message, 'character');
    
    if (baseFormula) {
        return {
            success: true,
            formula: baseFormula,
            warnings: [],
            hallucinationDetected: false,
            aiGenerated: false
        };
    }
    
    const ingredientWhitelist = buildIngredientWhitelist();
    
    let response;
    try {
        response = await aiClient.generateCharacterResponse(message, ingredientWhitelist);
    } catch (error) {
        console.error('AI调用失败:', error);
    }
    
    if (!response) {
        response = '您好！我是您的专属AI调香师，很高兴为您服务。请问有什么可以帮您？';
    }
    
    return response;
}

export {
    init,
    generateTravelFormula,
    generateMemoryFormula,
    generateCharacterResponse
};
