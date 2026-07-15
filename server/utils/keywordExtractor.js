const SCENE_WORDS = ['书房', '卧室', '古寺', '山林', '春日', '湖畔', '茶席', '雨巷', '园林', '草原', '沙漠', '海边', '雪山', '古镇', '书院', '庭院', '寺庙', '旷野', '竹林'];
const GEO_WORDS = ['苏州', '杭州', '江南', '塞北', '岭南', '西域', '岚山', '京都', '西湖', '断桥', '新疆', '西藏', '北欧', '长安', '洛阳', '成都', '扬州', '广州', '桂林', '大理', '丽江', '绍兴', '徽州', '金陵', '汴京', '临安', '西域', '漠北', '东海', '南海', '中原', '巴蜀', '荆楚', '吴越'];
const MOOD_WORDS = ['宁静', '庄重', '悠远', '治愈', '活泼', '清冷', '清雅', '温暖', '神秘', '书香', '温婉', '闲适', '恬淡', '古朴', '雅致', '清幽', '空灵', '醇厚', '芬芳', '馥郁'];
const SEASON_WORDS = ['春', '夏', '秋', '冬', '春日', '夏日', '秋日', '冬日', '初春', '暮春', '盛夏', '深秋', '严冬'];
const TIME_WORDS = ['清晨', '正午', '黄昏', '夜晚', '月夜', '黎明', '暮色', '晨曦', '深夜'];

function extractCoreKeywords(text) {
    const keywords = [];
    const cleanText = text.replace(/[，。！？、；：""''（）【】《》\s]/g, '');

    [...GEO_WORDS, ...SCENE_WORDS, ...MOOD_WORDS, ...SEASON_WORDS, ...TIME_WORDS].forEach(word => {
        if (cleanText.includes(word)) {
            keywords.push(word);
        }
    });

    return keywords.length > 0 ? keywords : [text];
}

function extractKeywordsByType(text) {
    const cleanText = text.replace(/[，。！？、；：""''（）【】《》\s]/g, '');
    const result = {
        geo: [],
        scene: [],
        mood: [],
        season: [],
        time: []
    };

    GEO_WORDS.forEach(word => {
        if (cleanText.includes(word)) result.geo.push(word);
    });
    SCENE_WORDS.forEach(word => {
        if (cleanText.includes(word)) result.scene.push(word);
    });
    MOOD_WORDS.forEach(word => {
        if (cleanText.includes(word)) result.mood.push(word);
    });
    SEASON_WORDS.forEach(word => {
        if (cleanText.includes(word)) result.season.push(word);
    });
    TIME_WORDS.forEach(word => {
        if (cleanText.includes(word)) result.time.push(word);
    });

    return result;
}

export { extractCoreKeywords, extractKeywordsByType };