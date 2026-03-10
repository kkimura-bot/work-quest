// src/lib/xp.js — 経験値・レベル計算ロジック

/** 難易度→獲得XP */
export const DIFFICULTY_XP = { 1: 10, 2: 20, 3: 30, 4: 50, 5: 60 }

/** ボーナスXP */
export const BONUS_XP = {
  weeklyGoal100:     100,  // 週次目標100%達成
  dailyStreak7:       50,  // 7日連続日報
  managerFeedback:    10,  // フィードバック受領
}

/** レベルごとに必要な累計XP */
export function xpForLevel(level) {
  // レベルが上がるほど必要XPが増える
  return Math.floor(200 * Math.pow(level, 1.5))
}

/** 現在のXPからレベルを計算 */
export function calcLevel(totalXp) {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) level++
  return level
}

/** レベルから称号を返す */
export function getTitle(level) {
  if (level >= 25) return '伝説の冒険者'
  if (level >= 18) return 'エース'
  if (level >= 13) return '熟練冒険者'
  if (level >= 8)  return '一人前の冒険者'
  if (level >= 4)  return '駆け出し冒険者'
  return '見習い冒険者'
}

/** 次のレベルまでの残XPと進捗率(0〜1)を返す */
export function levelProgress(totalXp) {
  const level     = calcLevel(totalXp)
  const current   = xpForLevel(level)
  const next      = xpForLevel(level + 1)
  const progress  = (totalXp - current) / (next - current)
  const remaining = next - totalXp
  return { level, progress, remaining, current, next }
}
