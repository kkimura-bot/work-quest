// src/lib/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "AIzaSyCTudVhwguTOl7U50Hfg5AiAZZylUnKumw",
  authDomain:        "work-quest-9dadb.firebaseapp.com",
  projectId:         "work-quest-9dadb",
  storageBucket:     "work-quest-9dadb.firebasestorage.app",
  messagingSenderId: "811617599020",
  appId:             "1:811617599020:web:7439b8be142eac7d551b89",
}

const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)
