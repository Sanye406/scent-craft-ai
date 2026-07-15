export const DRY_REGIONS = ['西北', '塞北', '新疆', '西藏', '蒙古', '敦煌', '戈壁', '沙漠', '高原', '北欧', '西伯利亚', '阿拉斯加'];

export function isDryRegion(region) {
    return DRY_REGIONS.some(dry => region.includes(dry));
}