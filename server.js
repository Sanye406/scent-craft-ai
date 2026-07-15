import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { knowledgeBase } from './server/utils/knowledge.node.js';
import { validateAndRepair, validateMonarchCompliance, validateMonarchDeduplication } from './server/utils/validator.node.js';
import { repairFormula } from './server/utils/formulaRepair.js';
import { generateTravelFormula, generateMemoryFormula, generateCharacterFormula, generateAdjustFormula } from './server/utils/ai-perfumer.js';
import { isDryRegion } from './server/utils/prompts.js';

dotenv.config();

knowledgeBase.init();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));



app.post('/api/travel-fragrance', async (req, res) => {
  const { userScene, excludeMonarchs = [], userId = '' } = req.body;
  console.log('\n===== 收到调香请求，用户输入：', userScene, ' =====');

  if (!userScene || userScene.trim() === '') {
    console.error('用户输入为空');
    return res.json({ success: false, error: '请输入地域场景', is_ai_generated: false });
  }

  try {
    const baseFormula = knowledgeBase.matchBaseFormulaV2(userScene, 'travel', excludeMonarchs, userId);
    console.log('匹配到基底古方：', baseFormula.name, '(ID:', baseFormula.id, ')');

    if (!baseFormula) {
      console.error('未能匹配到基底古方');
      return res.json({ success: false, error: '未能匹配到基底古方', is_ai_generated: false });
    }

    const aiResult = await generateTravelFormula(baseFormula, knowledgeBase.ingredients, userScene);
    console.log('AI调用结果：', aiResult ? '成功' : '失败，触发兜底');
    
    if (!aiResult) {
      const finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false };
      return res.json({ success: true, data: finalFormula, is_ai_generated: false });
    }

    const dryRegion = isDryRegion(userScene);
    aiResult.isDryRegion = dryRegion;
    
    const repairResult = validateAndRepair(aiResult, baseFormula, knowledgeBase.ingredients);
    console.log('校验修复结果：', repairResult.isValid, repairResult.warnings.length > 0 ? '警告:' + repairResult.warnings.join('; ') : '');

    let finalFormula;
    let isAiGenerated = false;
    
    if (repairResult.isValid) {
      const monarchCompliance = validateMonarchCompliance(repairResult.repairedFormula, 'travel');
      console.log('君药合规校验：', monarchCompliance.valid, monarchCompliance.message);
      
      if (!monarchCompliance.valid) {
        console.warn('君药不合规，返回基底古方');
        finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false, warnings: [...repairResult.warnings, monarchCompliance.message] };
      } else {
        finalFormula = repairFormula(repairResult.repairedFormula, baseFormula, knowledgeBase.ingredients);
        finalFormula = { ...baseFormula, ...finalFormula, formula_type: 'AI定制调香', is_ai_generated: true, warnings: repairResult.warnings };
        isAiGenerated = true;
        console.log('校验修复通过，返回AI定制香方');
      }
    } else {
      console.warn('校验修复失败，返回基底古方');
      finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false, warnings: repairResult.warnings };
    }

    res.json({ success: true, data: finalFormula, is_ai_generated: isAiGenerated, formula_type: isAiGenerated ? 'AI定制调香' : '古籍经典香方' });

  } catch (err) {
    console.error('接口异常:', err.message, err.stack);
    const fallbackFormula = knowledgeBase.getDefaultFormula('travel');
    res.json({ success: true, data: { ...fallbackFormula, formula_type: '古籍经典香方', is_ai_generated: false }, is_ai_generated: false, formula_type: '古籍经典香方', warnings: [], validation_errors: [] });
  }
});

app.post('/api/memory-fragrance', async (req, res) => {
  const { userMemory, excludeMonarchs = [], userId = '' } = req.body;
  console.log('\n===== 收到记忆调香请求，用户输入：', userMemory, ' =====');

  if (!userMemory || userMemory.trim() === '') {
    console.error('用户输入为空');
    return res.json({ success: false, error: '请输入记忆描述', is_ai_generated: false });
  }

  try {
    const baseFormula = knowledgeBase.matchBaseFormulaV2(userMemory, 'memory', excludeMonarchs, userId);
    console.log('匹配到基底古方：', baseFormula.name, '(ID:', baseFormula.id, ')');

    if (!baseFormula) {
      console.error('未能匹配到基底古方');
      return res.json({ success: false, error: '未能匹配到基底古方', is_ai_generated: false });
    }

    const aiResult = await generateMemoryFormula(baseFormula, knowledgeBase.ingredients, userMemory);
    console.log('AI调用结果：', aiResult ? '成功' : '失败，触发兜底');
    
    if (!aiResult) {
      const finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false };
      return res.json({ success: true, data: finalFormula, is_ai_generated: false });
    }

    aiResult.isDryRegion = false;
    
    const repairResult = validateAndRepair(aiResult, baseFormula, knowledgeBase.ingredients);
    console.log('校验修复结果：', repairResult.isValid, repairResult.warnings.length > 0 ? '警告:' + repairResult.warnings.join('; ') : '');

    let finalFormula;
    let isAiGenerated = false;
    
    if (repairResult.isValid) {
      const monarchCompliance = validateMonarchCompliance(repairResult.repairedFormula, 'memory');
      console.log('君药合规校验：', monarchCompliance.valid, monarchCompliance.message);
      
      if (!monarchCompliance.valid) {
        console.warn('君药不合规，返回基底古方');
        finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false, warnings: [...repairResult.warnings, monarchCompliance.message] };
      } else {
        finalFormula = repairFormula(repairResult.repairedFormula, baseFormula, knowledgeBase.ingredients);
        finalFormula = { ...baseFormula, ...finalFormula, formula_type: 'AI定制调香', is_ai_generated: true, warnings: repairResult.warnings };
        
        if (finalFormula.ai_confidence !== undefined) {
          finalFormula.ai_confidence = Number(finalFormula.ai_confidence);
        }
        
        isAiGenerated = true;
        console.log('校验修复通过，返回AI定制香方');
      }
    } else {
      console.warn('校验修复失败，返回基底古方');
      finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false, warnings: repairResult.warnings };
    }

    res.json({
      success: true,
      data: finalFormula,
      is_ai_generated: isAiGenerated,
      formula_type: isAiGenerated ? 'AI定制调香' : '古籍经典香方'
    });

  } catch (err) {
    console.error('接口异常:', err.message, err.stack);
    const fallbackFormula = knowledgeBase.getDefaultFormula('memory');
    res.json({
      success: true,
      data: { ...fallbackFormula, formula_type: '古籍经典香方', is_ai_generated: false },
      is_ai_generated: false,
      formula_type: '古籍经典香方',
      warnings: [],
      validation_errors: []
    });
  }
});

app.post('/api/character-fragrance', async (req, res) => {
  const { userCharacter, excludeMonarchs = [], userId = '' } = req.body;
  console.log('\n===== 觅味灵犀 请求，用户输入：', userCharacter, ' =====');

  if (!userCharacter || userCharacter.trim() === '') {
    console.error('用户输入为空');
    return res.json({ success: false, error: '请描述人物特征', is_ai_generated: false });
  }

  try {
    const baseFormula = knowledgeBase.matchBaseFormulaV2(userCharacter, 'character', excludeMonarchs, userId);
    console.log('1. 匹配到基底古方：', baseFormula.name);

    if (!baseFormula) {
      console.error('未能匹配到基底古方');
      return res.json({ success: false, error: '未能匹配到基底古方', is_ai_generated: false });
    }

    const aiResult = await generateCharacterFormula(baseFormula, knowledgeBase.ingredients, userCharacter);
    console.log('2. AI调用结果：', aiResult ? '成功' : '失败，触发兜底');

    let finalFormula;
    let isAiGenerated = false;

    if (aiResult) {
      aiResult.isDryRegion = false;
      
      const repairResult = validateAndRepair(aiResult, baseFormula, knowledgeBase.ingredients);
      console.log('3. 校验结果：', repairResult.isValid, repairResult.isValid ? '' : '失败，触发兜底');

      if (repairResult.isValid) {
        const monarchCompliance = validateMonarchCompliance(repairResult.repairedFormula, 'character');
        console.log('4. 君药合规校验：', monarchCompliance.valid, monarchCompliance.message);
        
        if (!monarchCompliance.valid) {
          console.warn('⚠️ 君药不合规，返回基底古籍香方');
          finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false, warnings: [...repairResult.warnings, monarchCompliance.message] };
        } else {
          finalFormula = repairFormula(repairResult.repairedFormula, baseFormula, knowledgeBase.ingredients);
          finalFormula = { ...baseFormula, ...finalFormula, formula_type: 'AI定制角色香', is_ai_generated: true, warnings: repairResult.warnings };
          
          if (finalFormula.ai_confidence !== undefined) {
            finalFormula.ai_confidence = Number(finalFormula.ai_confidence);
          }
          
          isAiGenerated = true;
          console.log('4. 自动修复完成，返回AI定制香方');
        }
      } else {
        console.warn('⚠️ 校验不通过，返回基底古籍香方');
        finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false, warnings: repairResult.warnings };
      }
    } else {
      finalFormula = { ...baseFormula, formula_type: '古籍经典香方', is_ai_generated: false };
    }

    finalFormula = knowledgeBase.sanitizeFormula(finalFormula);
    
    res.json({
      success: true,
      data: finalFormula,
      is_ai_generated: isAiGenerated,
      formula_type: isAiGenerated ? 'AI定制角色香' : '古籍经典香方'
    });

  } catch (err) {
    console.error('接口异常:', err.message, err.stack);
    const fallbackFormula = knowledgeBase.getDefaultFormula('character');
    const finalFormula = knowledgeBase.sanitizeFormula({ ...fallbackFormula, formula_type: '古籍经典香方', is_ai_generated: false });
    res.json({
      success: true,
      data: finalFormula,
      is_ai_generated: false,
      formula_type: '古籍经典香方',
      warnings: [],
      validation_errors: []
    });
  }
});

app.post('/api/fragrance-adjust', async (req, res) => {
  const { baseFormula, adjustRequest, sceneType, lastMonarch, userId = '' } = req.body;
  console.log('\n===== 香方微调请求，要求：', adjustRequest, ' =====');

  if (!baseFormula || !adjustRequest) {
    return res.json({ success: false, error: '缺少参数', is_ai_generated: false });
  }

  try {
    const aiResult = await generateAdjustFormula(baseFormula, knowledgeBase.ingredients, adjustRequest);
    console.log('AI微调结果：', aiResult ? '成功' : '失败，返回原方');

    let finalFormula;
    let isAiGenerated = false;

    if (aiResult) {
      const repairResult = validateAndRepair(aiResult, baseFormula, knowledgeBase.ingredients);
      console.log('微调校验结果：', repairResult.isValid);

      if (repairResult.isValid) {
        const monarchDeduplication = validateMonarchDeduplication(repairResult.repairedFormula, lastMonarch);
        console.log('君药去重校验：', monarchDeduplication.valid, monarchDeduplication.message);
        
        if (!monarchDeduplication.valid) {
          console.warn('⚠️ 君药去重校验失败，强制切换基底');
          const currentMonarchs = baseFormula.ingredients?.filter(ing => ing.role === '君').map(ing => ing.name) || [];
          const excludeMonarchs = [...currentMonarchs, lastMonarch].filter(Boolean);
          const newBaseFormula = knowledgeBase.matchBaseFormulaV2(adjustRequest, sceneType, excludeMonarchs, userId);
          console.log('切换新基底：', newBaseFormula.name);
          
          const newAiResult = await generateAdjustFormula(newBaseFormula, knowledgeBase.ingredients, adjustRequest);
          if (newAiResult) {
            const newRepairResult = validateAndRepair(newAiResult, newBaseFormula, knowledgeBase.ingredients);
            if (newRepairResult.isValid) {
              finalFormula = repairFormula(newRepairResult.repairedFormula, newBaseFormula, knowledgeBase.ingredients);
              finalFormula = { ...newBaseFormula, ...finalFormula, formula_type: 'AI微调定制香', is_ai_generated: true, warnings: [...newRepairResult.warnings, '已切换基底避免君药重复'] };
              isAiGenerated = true;
            } else {
              finalFormula = { ...newBaseFormula, formula_type: '古籍经典香方', is_ai_generated: false, warnings: ['已切换基底，AI微调失败'] };
            }
          } else {
            finalFormula = { ...newBaseFormula, formula_type: '古籍经典香方', is_ai_generated: false, warnings: ['已切换基底，AI微调失败'] };
          }
        } else {
          finalFormula = repairFormula(repairResult.repairedFormula, baseFormula, knowledgeBase.ingredients);
          finalFormula = { ...baseFormula, ...finalFormula, formula_type: 'AI微调定制香', is_ai_generated: true };
          isAiGenerated = true;
        }
      } else {
        console.warn('⚠️ 微调校验不通过，返回原方');
        finalFormula = { ...baseFormula, formula_type: baseFormula.formula_type || '古籍经典香方', is_ai_generated: baseFormula.is_ai_generated || false };
      }
    } else {
      finalFormula = { ...baseFormula, formula_type: baseFormula.formula_type || '古籍经典香方', is_ai_generated: baseFormula.is_ai_generated || false };
    }

    finalFormula = knowledgeBase.sanitizeFormula(finalFormula);
    res.json({ success: true, data: finalFormula, is_ai_generated: isAiGenerated, formula_type: finalFormula.formula_type });

  } catch (err) {
    console.error('微调接口异常:', err.message, err.stack);
    const finalFormula = knowledgeBase.sanitizeFormula({ ...baseFormula, formula_type: baseFormula.formula_type || '古籍经典香方', is_ai_generated: baseFormula.is_ai_generated || false });
    res.json({ success: true, data: finalFormula, is_ai_generated: false, formula_type: finalFormula.formula_type });
  }
});

app.post('/api/perfume', async (req, res) => {
  try {
    const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    const data = await aiResponse.json();
    res.status(aiResponse.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: '代理请求失败', details: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});