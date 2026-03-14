// src/lib/notify.js — 通知送信ヘルパー
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

/**
 * 通知を送る
 * @param {string} toUserId - 受信者のUID
 * @param {string} type - feedback / levelup / badge / mission / report / reminder / manager
 * @param {string} message - 通知メッセージ
 */
export async function sendNotification(toUserId, type, message) {
  if (!toUserId || !message) return
  try {
    await addDoc(collection(db, 'notifications'), {
      toUserId,
      type,
      message,
      read: false,
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('通知送信エラー:', e)
  }
}

/**
 * 複数ユーザーに通知を一括送信
 * @param {string[]} userIds
 * @param {string} type
 * @param {string} message
 */
export async function broadcastNotification(userIds, type, message) {
  await Promise.all(userIds.map(uid => sendNotification(uid, type, message)))
}
