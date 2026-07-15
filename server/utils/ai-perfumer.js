import { TRAVEL_PROMPT, MEMORY_PROMPT, CHARACTER_PROMPT, ADJUST_PROMPT } from '../../config/prompts.js';

const API_BASE = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

async function callAI(systemPrompt, userMessage, retryCount = 0, temperature = 0.65) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: temperature,
                max_tokens: 1500,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ]
            }),
            signal: controller.signal
        });

        clearTimeout(timer);
        if (!response.ok) {
            console.error('API请求失败，状态码：', response.status);
            return null;
        }

        const data = await response.json();
        const rawOutput = data.choices[0].message.content;
        return extractJson(rawOutput);

    } catch (err) {
        clearTimeout(timer);
        if (retryCount < 1) {
            console.log('AI调用失败，自动重试中...');
            return callAI(systemPrompt, userMessage, retryCount + 1, temperature);
        }
        console.error('AI调用最终失败：', err.message);
        return null;
    }
}

function extractJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) return JSON.parse(match[1]);
        throw new Error('JSON解析失败');
    }
}

async function generateTravelFormula(baseFormula, ingredientWhitelist, userScene) {
    const baseFormulaText = JSON.stringify(baseFormula, null, 2);
    const whitelistText = ingredientWhitelist.map(
        ing => `${ing.id} ${ing.name}，性${ing.property}，安全用量：${ing.amount_min}-${ing.amount_max}g`
    ).join('\n');

    const systemPrompt = TRAVEL_PROMPT
        .replace('{{BASE_FORMULA}}', baseFormulaText)
        .replace('{{INGREDIENT_WHITELIST}}', whitelistText)
        .replace('{{USER_SCENE}}', userScene);

    const userMessage = '请为我调配这款专属地域香方';
    return callAI(systemPrompt, userMessage);
}

async function generateMemoryFormula(baseFormula, ingredientWhitelist, userMemory) {
    const baseFormulaText = JSON.stringify(baseFormula, null, 2);
    const whitelistText = ingredientWhitelist.map(
        ing => `${ing.id} ${ing.name}，性${ing.property}，安全用量：${ing.amount_min}-${ing.amount_max}g，适配角色：${ing.role || '佐/使'}`
    ).join('\n');

    const systemPrompt = MEMORY_PROMPT
        .replace('{{BASE_FORMULA}}', baseFormulaText)
        .replace('{{INGREDIENT_WHITELIST}}', whitelistText)
        .replace('{{USER_MEMORY}}', userMemory);

    const userMessage = '请为我调配这款专属记忆香方';
    return callAI(systemPrompt, userMessage);
}

async function generateCharacterFormula(baseFormula, ingredientWhitelist, userCharacter) {
    const baseFormulaText = JSON.stringify(baseFormula, null, 2);
    const whitelistText = ingredientWhitelist.map(
        ing => `${ing.id} ${ing.name}，性${ing.property}，安全用量：${ing.amount_min}-${ing.amount_max}g，适配角色：${ing.role || '佐/使'}`
    ).join('\n');

    const systemPrompt = CHARACTER_PROMPT
        .replace('{{BASE_FORMULA}}', baseFormulaText)
        .replace('{{INGREDIENT_WHITELIST}}', whitelistText)
        .replace('{{USER_CHARACTER}}', userCharacter);

    const userMessage = '请为我调配这款专属人物香方';
    return callAI(systemPrompt, userMessage);
}

async function generateAdjustFormula(baseFormula, ingredientWhitelist, adjustRequest) {
    const baseFormulaText = JSON.stringify(baseFormula, null, 2);
    const whitelistText = ingredientWhitelist.map(
        ing => `${ing.id} ${ing.name}，性${ing.property}，安全用量：${ing.amount_min}-${ing.amount_max}g`
    ).join('\n');

    const systemPrompt = ADJUST_PROMPT
        .replace('{{BASE_FORMULA}}', baseFormulaText)
        .replace('{{INGREDIENT_WHITELIST}}', whitelistText)
        .replace('{{ADJUST_REQUEST}}', adjustRequest);

    const userMessage = '请按要求微调香方';
    return callAI(systemPrompt, userMessage);
}

export {
    callAI,
    extractJson,
    generateTravelFormula,
    generateMemoryFormula,
    generateCharacterFormula,
    generateAdjustFormula
};