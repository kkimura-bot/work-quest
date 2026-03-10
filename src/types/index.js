// src/types/index.js
// JSDoc型定義 — TypeScript不使用のため、ここで型を文書化します

/**
 * @typedef {'employee' | 'manager'} UserRole
 *
 * @typedef {Object} User
 * @property {string} uid
 * @property {string} name
 * @property {string} email
 * @property {UserRole} role
 * @property {number} level
 * @property {number} xp
 * @property {string} title  - 称号
 * @property {Date} createdAt
 *
 * @typedef {'todo' | 'in_progress' | 'done' | 'paused'} QuestStatus
 *
 * @typedef {Object} Quest
 * @property {string} id
 * @property {string} userId
 * @property {string} title
 * @property {1|2|3|4|5} difficulty
 * @property {string} category
 * @property {number} [estimatedMinutes]
 * @property {string} [weeklyGoalId]
 * @property {QuestStatus} status
 * @property {number} xp  - 獲得XP（完了時に付与）
 * @property {Date} createdAt
 * @property {Date} [completedAt]
 *
 * @typedef {Object} WeeklyGoal
 * @property {string} id
 * @property {string} userId
 * @property {string} title
 * @property {string} [description]
 * @property {Date} deadline
 * @property {number} achievementRate  - 0〜100
 * @property {string} [reflectionNote]
 * @property {Date} createdAt
 *
 * @typedef {Object} DailyReport
 * @property {string} id
 * @property {string} userId
 * @property {string} date  - "YYYY-MM-DD"
 * @property {string} comment
 * @property {1|2|3|4|5} satisfactionScore
 * @property {number} completedQuestCount
 * @property {Date} createdAt
 */

export {}
