import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractCoreKeywords, extractKeywordsByType } from './keywordExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class KnowledgeBase {
  constructor() {
    this.ingredients = [];
    this.formulas = [];
    this.mapping = {};
    this.baseFormulas = [];
    this.monarchFormulaMap = {};
    this.userLastMonarch = new Map();
  }

  init() {
    const dataDir = join(__dirname, '../../data');
    const ing = JSON.parse(readFileSync(join(dataDir, 'ingredients.json'), 'utf-8'));
    const form = JSON.parse(readFileSync(join(dataDir, 'formulas.json'), 'utf-8'));
    const map = JSON.parse(readFileSync(join(dataDir, 'mapping.json'), 'utf-8'));
    this.ingredients = ing;
    this.formulas = form;
    this.mapping = map;
    this.validateData();
    this.buildBaseFormulaLibrary();
  }

  buildBaseFormulaLibrary() {
    const baseFormulaIds = ['f021', 'f026', 'f027', 'f013', 'f028'];
    this.baseFormulas = this.formulas.filter(f => baseFormulaIds.includes(f.id));
    
    this.monarchFormulaMap = {};
    this.baseFormulas.forEach(formula => {
      const monarchs = formula.ingredients
        .filter(ing => ing.role === '君')
        .map(ing => ing.name);
      monarchs.forEach(monarch => {
        if (!this.monarchFormulaMap[monarch]) {
          this.monarchFormulaMap[monarch] = [];
        }
        this.monarchFormulaMap[monarch].push(formula);
      });
    });
    
    console.log('[基底香方库] 已加载', this.baseFormulas.length, '个基底古方');
    console.log('[君药映射]', Object.keys(this.monarchFormulaMap));
  }

  validateData() {
    const formulaIds = new Set(this.formulas.map(f => f.id));
    const defaults = this.mapping.defaults || {};
    for (const [scene, id] of Object.entries(defaults)) {
      if (!formulaIds.has(id)) {
        console.warn(`兜底香方 ${id} (场景:${scene}) 在 formulas 中不存在`);
      }
    }
  }

  sanitizeFormula(formula) {
    if (!formula) return null;

    const fallback = {
      sensory_text: "香气氤氲，自有东方雅韵",
      formula_nature: "性味平和，适配日常",
      efficacy: "清心悦神，辟秽怡情",
      method: "1. 备料：按方称取所有香材，除去杂质，分君臣佐使分类摆放；2. 研磨：君药、臣药先研磨成细粉，过100目筛，混合均匀；佐使药单独研磨；3. 合香：以炼蜜为粘合剂，分次加入香粉，沿同一方向搅拌至成团不粘手；4. 窨藏：制成香丸或香饼，装入瓷罐密封，置阴凉干燥处窖藏7日，待香气圆融后使用",
      contraindication: "孕妇、婴幼儿、呼吸道敏感者慎用；过敏者禁用；仅作香薰不可内服",
      source: "传统合香配方适配",
      card_badge: "东方雅香",
      memory_insight: "旧时光里的细碎温柔",
      memory_slogan: "一炷香里，拾回旧时光",
      place_insight: "一方水土，一炉香韵",
      character_insight: "风骨清峻，气韵自华",
      character_tag: "雅士之风"
    };

    const result = { ...fallback };
    for (const key in formula) {
      if (formula[key] !== undefined && formula[key] !== null && formula[key] !== "") {
        result[key] = formula[key];
      }
    }

    if (!result.card_badge || result.card_badge === "东方雅香") {
      const mood = result.mood_tags?.[0] || "";
      const scene = result.scene_tags?.[0] || "";
      result.card_badge = (scene + mood) || "东方雅香";
    }

    if (result.season_tags?.includes("四季")) {
      result.season_tags = ["春", "夏", "秋", "冬"];
    }
    if (!result.season_tags?.length) {
      result.season_tags = ["春", "夏", "秋", "冬"];
    }

    result.ai_confidence = Number(result.ai_confidence) || 1.0;
    result.is_creative = result.ai_confidence < 0.8;

    if (!result.ingredients) result.ingredients = [];
    result.ingredients.forEach(ing => {
      if (!ing.unit) ing.unit = "g";
      if (!ing.property) ing.property = "平";
      ing.amount = Number((Number(ing.amount) || 1).toFixed(1));
    });

    if (!result.formula_type) result.formula_type = "标准配伍方";

    if (!result.adjust_reason || result.adjust_reason.length < 60) {
      result.adjust_reason = `我以${result.source || '古籍经典香方'}为基底，结合您描述的场景气质微调佐使配伍，既保留古方正统的香气骨架，又适配当下的用香氛围，层次和合，余韵悠长。`;
    }

    if (!result.method || result.method.length < 50) {
      result.method = "1. 备料：按方称取所有香材，除去杂质，分君臣佐使分类摆放；2. 研磨：君药、臣药先研磨成细粉，过100目筛，混合均匀；佐使药单独研磨；3. 合香：以炼蜜为粘合剂，分次加入香粉，沿同一方向搅拌至成团不粘手；4. 窨藏：制成香丸或香饼，装入瓷罐密封，置阴凉干燥处窖藏7日，待香气圆融后使用";
    }

    return result;
  }

  getValidMonarchs() {
    return Object.keys(this.monarchFormulaMap);
  }

  getBaseFormulaByMonarch(monarchName) {
    const formulas = this.monarchFormulaMap[monarchName];
    if (!formulas || formulas.length === 0) return null;
    return formulas[0];
  }

  getSceneMonarchMapping() {
    return {
      '沉香': ['山林', '冬日', '沉稳', '厚重', '古寺', '深幽', '庄重', '静谧'],
      '檀香': ['文人', '书香', '江南', '日常', '茶席', '书房', '清雅', '宁静'],
      '零陵香': ['春日', '草木', '温柔', '佩香', '温暖', '治愈', '清新', '随身'],
      '丁香': ['寒梅', '清冷', '风骨', '雪景', '冬日', '雅致', '悠远', '高洁'],
      '玄参': ['书房', '静坐', '禅意', '旧时光', '宁静', '沉静', '安神', '清和'],
      '甘松香': ['书房', '静坐', '禅意', '旧时光', '宁静', '沉静', '安神', '清和']
    };
  }

  matchMonarchByScene(userInput, excludeMonarchs = []) {
    const text = userInput.toLowerCase();
    const mapping = this.getSceneMonarchMapping();
    const scoreMap = new Map();

    for (const [monarch, keywords] of Object.entries(mapping)) {
      if (excludeMonarchs.includes(monarch)) continue;
      
      let score = 0;
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 2;
        }
      });
      
      if (score > 0) {
        scoreMap.set(monarch, score);
      }
    }

    if (scoreMap.size === 0) {
      const allMonarchs = Object.keys(mapping).filter(m => !excludeMonarchs.includes(m));
      return allMonarchs[Math.floor(Math.random() * allMonarchs.length)];
    }

    const sorted = Array.from(scoreMap.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  matchBaseFormulaV2(userInput, sceneType = 'travel', excludeMonarchs = [], userId = '') {
    const preferredMonarch = this.matchMonarchByScene(userInput, excludeMonarchs);
    console.log('[基底预匹配] 用户输入:', userInput, '推荐君药:', preferredMonarch);
    
    let baseFormula = this.getBaseFormulaByMonarch(preferredMonarch);
    
    if (!baseFormula) {
      console.warn('[基底预匹配] 未找到对应基底，使用原算法');
      return this.matchBaseFormula(userInput, sceneType);
    }

    if (userId) {
      this.userLastMonarch.set(userId, preferredMonarch);
    }
    
    console.log('[基底预匹配] 匹配到基底:', baseFormula.name, '君药:', preferredMonarch);
    return this.sanitizeFormula(baseFormula);
  }

  matchBaseFormula(userInput, sceneType = 'travel') {
    const keywords = extractCoreKeywords(userInput);
    const typedKeywords = extractKeywordsByType(userInput);
    const scoreMap = new Map();

    const sceneKeywords = this.getSceneKeywords(sceneType);
    const commonKeywords = this.mapping.common_keywords || {};

    keywords.forEach(keyword => {
      this.matchKeywords(keyword, sceneKeywords, scoreMap);
      this.matchKeywords(keyword, commonKeywords, scoreMap);
    });

    this.formulas.forEach(formula => {
      let tagScore = 0;
      const formulaTags = this.collectFormulaTags(formula);
      
      typedKeywords.geo.forEach(keyword => {
        if (formulaTags.includes(keyword)) tagScore += 5;
      });
      typedKeywords.scene.forEach(keyword => {
        if (formulaTags.includes(keyword)) tagScore += 4;
      });
      typedKeywords.mood.forEach(keyword => {
        if (formulaTags.includes(keyword)) tagScore += 3;
      });
      typedKeywords.season.forEach(keyword => {
        if (formulaTags.includes(keyword)) tagScore += 2;
      });
      typedKeywords.time.forEach(keyword => {
        if (formulaTags.includes(keyword)) tagScore += 1;
      });

      if (tagScore > 0) {
        this.addScore(scoreMap, formula.id, tagScore);
      }
    });

    const cap = this.mapping._algorithm_hints?.score_cap_per_formula;
    if (cap && cap > 0) {
      for (const [id, score] of scoreMap.entries()) {
        if (score > cap) scoreMap.set(id, cap);
      }
    }

    if (scoreMap.size === 0) {
      const defaultFormula = this.getDefaultFormula(sceneType);
      return this.sanitizeFormula(defaultFormula);
    }

    const sorted = Array.from(scoreMap.entries()).sort((a, b) => b[1] - a[1]);
    const topFormulaId = sorted[0][0];
    const formula = this.formulas.find(f => f.id === topFormulaId);
    return this.sanitizeFormula(formula || this.getDefaultFormula(sceneType));
  }

  preprocessText(text) {
    return text
      .replace(/[，。！？、；：""''（）【】《》\s]/g, '')
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248))
      .toLowerCase();
  }

  getSceneKeywords(sceneType) {
    const scenes = this.mapping[`${sceneType}_scenes`];
    if (!scenes || !scenes.keywords) {
      console.warn(`未找到场景 ${sceneType} 的关键词配置，使用空映射`);
      return {};
    }
    return scenes.keywords;
  }

  matchKeywords(text, keywordMap, scoreMap) {
    for (const keyword in keywordMap) {
      if (text.includes(keyword)) {
        const { formula_id, weight } = keywordMap[keyword];
        this.addScore(scoreMap, formula_id, weight);
      }
    }
  }

  buildTagWeightMap() {
    const pool = this.mapping.tag_pool || {};
    const map = new Map();
    for (const category of Object.values(pool)) {
      if (typeof category === 'object') {
        for (const [tag, weight] of Object.entries(category)) {
          map.set(tag, weight);
        }
      }
    }
    return map;
  }

  extractTagsFromPool(text, tagWeightMap) {
    const matched = new Set();
    for (const tag of tagWeightMap.keys()) {
      if (text.includes(tag)) {
        matched.add(tag);
      }
    }
    return matched;
  }

  collectFormulaTags(formula) {
    const tags = [];
    const tagFields = ['mood_tags', 'scene_tags', 'season_tags', 'weather_tags'];
    for (const field of tagFields) {
      if (Array.isArray(formula[field])) {
        tags.push(...formula[field]);
      }
    }
    return tags;
  }

  addScore(scoreMap, formulaId, score) {
    const current = scoreMap.get(formulaId) || 0;
    scoreMap.set(formulaId, current + score);
  }

  getDefaultFormula(sceneType) {
    const defaults = this.mapping.defaults || {};
    const id = defaults[sceneType] || this.formulas[0]?.id;
    const formula = this.formulas.find(f => f.id === id) || this.formulas[0] || null;
    return this.sanitizeFormula(formula);
  }

  getValidIngredientNames() {
    return this.ingredients.map(i => i.name);
  }

  getValidIngredientIds() {
    return this.ingredients.map(i => i.id);
  }

  findIngredient(name) {
    return this.ingredients.find(item => 
      item.name === name || item.aliases?.includes(name)
    );
  }

  findIngredientById(id) {
    return this.ingredients.find(item => item.id === id);
  }

  findIngredientsByTag(tag, tagType = 'mood_tags') {
    return this.ingredients.filter(item => item[tagType]?.includes(tag));
  }

  findFormulasByTag(tag, tagType = 'scene_tags') {
    return this.formulas.filter(item => item[tagType]?.includes(tag));
  }

  findFormulaById(id) {
    const formula = this.formulas.find(item => item.id === id);
    return this.sanitizeFormula(formula);
  }

  getIngredientAliases() {
    const aliases = new Set();
    this.ingredients.forEach(item => {
      item.aliases?.forEach(alias => aliases.add(alias));
    });
    return Array.from(aliases);
  }

  matchIngredientsByScene(scene) {
    if (this.mapping.scenes && this.mapping.scenes[scene]) {
      return this.mapping.scenes[scene];
    }
    return [];
  }

  matchIngredientsByMood(mood) {
    if (this.mapping.moods && this.mapping.moods[mood]) {
      return this.mapping.moods[mood];
    }
    return [];
  }

  matchIngredientsBySeason(season) {
    if (this.mapping.seasons && this.mapping.seasons[season]) {
      return this.mapping.seasons[season];
    }
    return [];
  }

  calculateCompatibility(ingredient1, ingredient2) {
    const ing1 = this.findIngredient(ingredient1);
    const ing2 = this.findIngredient(ingredient2);
    
    if (!ing1 || !ing2) return 0;
    
    let score = 0;
    
    const sharedMoods = ing1.mood_tags?.filter(tag => ing2.mood_tags?.includes(tag)) || [];
    score += sharedMoods.length * 2;
    
    const sharedScenes = ing1.scene_tags?.filter(tag => ing2.scene_tags?.includes(tag)) || [];
    score += sharedScenes.length;
    
    const sharedSeasons = ing1.season_tags?.filter(tag => ing2.season_tags?.includes(tag)) || [];
    score += sharedSeasons.length;
    
    if (ing1.property === ing2.property) {
      score += 2;
    }
    
    return score;
  }

  generateRecommendedIngredients(scene = '', mood = '', season = '', count = 5) {
    let candidates = [];
    
    if (scene) {
      candidates = candidates.concat(this.matchIngredientsByScene(scene));
    }
    if (mood) {
      candidates = candidates.concat(this.matchIngredientsByMood(mood));
    }
    if (season) {
      candidates = candidates.concat(this.matchIngredientsBySeason(season));
    }
    
    if (candidates.length === 0) {
      candidates = this.getValidIngredientNames().slice(0, 10);
    }
    
    const uniqueCandidates = [...new Set(candidates)];
    
    uniqueCandidates.sort((a, b) => {
      const scoreA = (scene ? this.matchIngredientsByScene(scene).includes(a) : 0) +
                    (mood ? this.matchIngredientsByMood(mood).includes(a) : 0) +
                    (season ? this.matchIngredientsBySeason(season).includes(a) : 0);
      const scoreB = (scene ? this.matchIngredientsByScene(scene).includes(b) : 0) +
                    (mood ? this.matchIngredientsByMood(mood).includes(b) : 0) +
                    (season ? this.matchIngredientsBySeason(season).includes(b) : 0);
      return scoreB - scoreA;
    });
    
    return uniqueCandidates.slice(0, count);
  }
}

export const knowledgeBase = new KnowledgeBase();