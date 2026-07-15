export class KnowledgeBase {
  constructor() {
    this.ingredients = [];
    this.formulas = [];
    this.mapping = {};
  }

  async init() {
    const [ing, form, map] = await Promise.all([
      fetch('./data/ingredients.json').then(r => r.json()),
      fetch('./data/formulas.json').then(r => r.json()),
      fetch('./data/mapping.json').then(r => r.json())
    ]);
    this.ingredients = ing;
    this.formulas = form;
    this.mapping = map;
    this.validateData();
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
      sensory_text: "香气氤氲，层次和合，自有东方雅韵",
      formula_nature: "性味平和，适配日常",
      efficacy: "清心悦神，辟秽怡情",
      method: "古法合香，细研和蜜，窖藏七日可用",
      contraindication: "合香虽雅，亦需谨慎。孕妇、婴幼儿及过敏体质者请遵医嘱。",
      source: "传统合香配方适配"
    };

    // 1. 补全核心基础字段空值
    if (!formula.sensory_text) formula.sensory_text = fallback.sensory_text;
    if (!formula.card_badge) {
      const mood = formula.mood_tags?.[0] || "";
      const scene = formula.scene_tags?.[0] || "";
      formula.card_badge = (scene + mood) || "东方雅香";
    }

    // 2. 补全详情字段空值
    if (!formula.source) formula.source = fallback.source;
    if (!formula.formula_nature) formula.formula_nature = fallback.formula_nature;
    if (!formula.efficacy) formula.efficacy = fallback.efficacy;
    if (!formula.method) formula.method = fallback.method;
    if (!formula.contraindication) formula.contraindication = fallback.contraindication;

    // 3. 季节标签标准化：兼容历史数据的「四季」
    if (formula.season_tags?.includes("四季")) {
      formula.season_tags = ["春", "夏", "秋", "冬"];
    }
    if (!formula.season_tags || formula.season_tags.length === 0) {
      formula.season_tags = ["春", "夏", "秋", "冬"];
    }

    // 4. AI置信度与创意标记
    if (formula.ai_confidence === undefined) formula.ai_confidence = 1.0;
    formula.is_creative = formula.ai_confidence < 0.8;

    // 5. 配料字段保底
    if (!formula.ingredients) formula.ingredients = [];
    formula.ingredients.forEach(ing => {
      if (!ing.unit) ing.unit = "g";
      if (!ing.property) ing.property = "平";
    });

    // 6. 补全 formula_type
    if (!formula.formula_type) formula.formula_type = "标准配伍方";
    if (formula.is_creative === undefined) formula.is_creative = false;

    return formula;
  }

  matchBaseFormula(userInput, sceneType = 'travel') {
    const text = this.preprocessText(userInput);
    const scoreMap = new Map();

    const sceneKeywords = this.getSceneKeywords(sceneType);
    this.matchKeywords(text, sceneKeywords, scoreMap);

    const commonKeywords = this.mapping.common_keywords || {};
    this.matchKeywords(text, commonKeywords, scoreMap);

    const tagWeightMap = this.buildTagWeightMap();
    const inputTags = this.extractTagsFromPool(text, tagWeightMap);
    if (inputTags.size > 0) {
      this.formulas.forEach(formula => {
        let tagScore = 0;
        const formulaTags = this.collectFormulaTags(formula);
        formulaTags.forEach(tag => {
          if (inputTags.has(tag)) {
            tagScore += tagWeightMap.get(tag) || 1;
          }
        });
        if (tagScore > 0) {
          this.addScore(scoreMap, formula.id, tagScore);
        }
      });
    }

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
      item.name === name || item.aliases.includes(name)
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
