import { initializeApp } from 'firebase/app'
import { getFirestore, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'

const firebaseConfig = {
  projectId: "sgps-major-calendar",
  appId: "1:897689865348:web:49d0285840d3ccbf1986d1",
  storageBucket: "sgps-major-calendar.firebasestorage.app",
  apiKey: "AIzaSyBvOMuCbG1Eq4HuYhoQyAwabAi-fyS3qb4",
  authDomain: "sgps-major-calendar.firebaseapp.com",
  messagingSenderId: "897689865348",
  projectNumber: "897689865348"
}

// 初始化 Firebase
const app = initializeApp(firebaseConfig)
export const firestore = getFirestore(app)

// 重大行事曆的主要文檔引用
export const calendarDocRef = doc(firestore, 'major_calendar', 'data')

// 儲存資料至雲端 Firestore
export const saveToCloud = async (calendarData) => {
  try {
    await setDoc(calendarDocRef, {
      ...calendarData,
      updatedAt: new Date().toISOString()
    })
    return { success: true }
  } catch (err) {
    console.error('儲存至雲端失敗:', err)
    return { success: false, error: err }
  }
}

// 監聽雲端資料變化 (即時雙向同步)
export const subscribeToCloud = (callback) => {
  return onSnapshot(calendarDocRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data())
    } else {
      callback(null)
    }
  }, (err) => {
    console.error('雲端即時監聽錯誤:', err)
  })
}
