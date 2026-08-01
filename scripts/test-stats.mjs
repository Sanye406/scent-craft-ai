/**
 * 调香结果统计测试脚本
 * 用法：
 *   1. 启动后端服务器：node server.js
 *   2. 另开终端运行：node scripts/test-stats.mjs [BASE_URL]
 *      默认 BASE_URL = http://localhost:3000
 *
 * 脚本会：
 *   - 重置统计计数
 *   - 批量调用 travel / character / memory 三个接口
 *   - 拉取 /api/stats 输出真实 AI成功/兜底 比例报告
 */
const BASE_URL = process.argv[2] || 'http://localhost:3000';

// 测试用例：覆盖不同地域/人物/记忆，尽量触发多种君药与场景
const CASES = {
  travel: [
    '杭州西湖的烟雨江南',
    '敦煌沙漠的苍茫大漠',
    '北京故宫的冬日雪景',
    '苏州园林的春日茶席',
    '西藏高原的古寺禅意',
    '岭南广州的湿热市井',
    '西安古城的厚重历史',
    '云南大理的苍山洱海',
    '江南水乡的雨巷青石',
    '北方雪原的肃杀寒冬'
  ],
  character: [
    '温柔知性的江南女性',
    '清冷孤傲的书生',
    '活泼开朗的少女',
    '沉稳内敛的长者',
    '神秘深邃的修行者',
    '温婉端庄的闺秀',
    '豪迈洒脱的侠客',
    '宁静淡泊的隐士',
    '庄重威严的官员',
    '清雅脱俗的文人'
  ],
  memory: [
    '童年外婆家灶台前的温暖',
    '大学图书馆午后的宁静时光',
    '初恋那个雨季的青涩',
    '母亲缝补衣裳的旧时光',
    '老家院子里夏夜乘凉',
    '寺庙里听经的清净时刻',
    '父亲书房里的墨香',
    '江南老宅的童年夏天',
    '雪夜围炉夜话的温暖',
    '茶馆里听书的悠闲'
  ]
};

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function callOnce(scene, input) {
  const pathMap = {
    travel: '/api/travel-fragrance',
    character: '/api/character-fragrance',
    memory: '/api/memory-fragrance'
  };
  const fieldMap = {
    travel: 'userScene',
    character: 'userCharacter',
    memory: 'userMemory'
  };
  try {
    const r = await post(pathMap[scene], { [fieldMap[scene]]: input, userId: 'stat-test' });
    return r;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function printReport(stats) {
  console.log('\n========== 调香结果统计报告 ==========\n');
  const sceneName = { travel: '寻味山河', character: '觅味灵犀', memory: '拾味光阴', adjust: '香方微调' };
  let totalAll = 0, successAll = 0;
  for (const [scene, s] of Object.entries(stats)) {
    if (s.total === 0) continue;
    const fallback = s.fallback;
    totalAll += s.total;
    successAll += s.ai_success;
    console.log(`【${sceneName[scene] || scene}】 共 ${s.total} 次`);
    console.log(`  ✓ AI成功: ${s.ai_success} 次 (${s.ai_success_rate}%)`);
    console.log(`  ✗ 兜底:   ${fallback} 次 (${s.fallback_rate}%)`);
    console.log(`    ├ AI调用失败: ${s.ai_fail}`);
    console.log(`    ├ 校验修复失败: ${s.validate_fail}`);
    console.log(`    ├ 君药不合规: ${s.monarch_fail}`);
    console.log(`    └ 接口异常: ${s.exception}`);
    if (s.fallback_switch) console.log(`    ※ 触发基底切换: ${s.fallback_switch} 次`);
    console.log('');
  }
  if (totalAll > 0) {
    console.log('---------- 总体 ----------');
    console.log(`  总计 ${totalAll} 次 | AI成功 ${successAll} (${(successAll / totalAll * 100).toFixed(1)}%) | 兜底 ${totalAll - successAll} (${((totalAll - successAll) / totalAll * 100).toFixed(1)}%)`);
  }
  console.log('\n======================================\n');
}

async function main() {
  console.log(`目标服务器: ${BASE_URL}`);

  // 1. 重置统计
  try {
    await post('/api/stats/reset', {});
    console.log('已重置统计计数');
  } catch (e) {
    console.error('重置统计失败，请确认服务器已启动:', e.message);
    process.exit(1);
  }

  // 2. 顺序跑测试用例（避免并发把 DeepSeek 打爆）
  let done = 0;
  const total = Object.values(CASES).flat().length;
  for (const [scene, inputs] of Object.entries(CASES)) {
    for (const input of inputs) {
      done += 1;
      process.stdout.write(`[${done}/${total}] ${scene} ← ${input} ... `);
      const r = await callOnce(scene, input);
      if (r.success) {
        console.log(r.is_ai_generated ? 'AI成功' : '兜底');
      } else {
        console.log(`请求失败: ${r.error}`);
      }
    }
  }

  // 3. 拉取统计报告
  try {
    const r = await fetch(`${BASE_URL}/api/stats`);
    const j = await r.json();
    if (j.success) printReport(j.data);
    else console.error('获取统计失败:', j);
  } catch (e) {
    console.error('获取统计失败:', e.message);
  }
}

main();
