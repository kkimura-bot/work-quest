// src/lib/xp.js — 経験値・レベル計算ロジック

/** 難易度→獲得XP（新設計） */
export const DIFFICULTY_XP = { 1: 10, 2: 25, 3: 50, 4: 100, 5: 200 }

/** ボーナスXP定数 */
export const BONUS_XP = {
  dailyReport:        20,
  streak3:          0.10,
  streak7:          0.20,
  report7days:        50,
  report30days:      200,
  weekAllClear:       50,
  feedbackSent:       10,
  satisfaction5:      10,
  firstStar5:        100,
  missionEasy_all:    50,  missionEasy_ind:    30,
  missionNormal_all: 100,  missionNormal_ind:  60,
  missionHard_all:   200,  missionHard_ind:   120,
  missionLegend_all: 400,  missionLegend_ind: 250,
}

/** レベルごとに必要な累計XP（base=2500, step=56, 天井Lv30） */
export function xpForLevel(level) {
  if (level <= 1) return 0
  let total = 0
  for (let i = 2; i <= level; i++) total += 2500 + 56 * (i - 2)
  return total
}

/** XP→レベル（最大30） */
export function calcLevel(totalXp) {
  let level = 1
  while (level < 30 && xpForLevel(level + 1) <= totalXp) level++
  return level
}

/** レベル→称号（14種） */
export function getTitle(level) {
  if (level >= 30) return 'REGAL MASTER'
  if (level >= 27) return '神話の継承者'
  if (level >= 25) return 'アーカイブの番人'
  if (level >= 23) return '星詠みの賢者'
  if (level >= 20) return 'ドラゴンスレイヤー'
  if (level >= 18) return '炎帝の使徒'
  if (level >= 15) return '竜血の勇者'
  if (level >= 12) return '深淵の探索者'
  if (level >= 10) return '暁の騎士'
  if (level >= 8)  return '雷鳴の剣士'
  if (level >= 6)  return '鉄の意志'
  if (level >= 4)  return '草原の狩人'
  if (level >= 2)  return '旅立ちの戦士'
  return '見習い冒険者'
}

/** 次のレベルまでの進捗 */
export function levelProgress(totalXp) {
  const level    = calcLevel(totalXp)
  const current  = xpForLevel(level)
  const next     = level >= 30 ? current + 99999 : xpForLevel(level + 1)
  const progress = level >= 30 ? 1 : (totalXp - current) / (next - current)
  return { level, progress, remaining: Math.max(0, next - totalXp), current, next }
}
