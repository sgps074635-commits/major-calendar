<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { 
  Printer, 
  Settings, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Lock, 
  Unlock, 
  Download, 
  Upload, 
  Sun, 
  Moon, 
  Copy, 
  Calendar as CalendarIcon, 
  Sparkles,
  FileSpreadsheet,
  FileText,
  LogOut,
  GripVertical,
  ChevronRight,
  Info,
  Check
} from '@lucide/vue'

// --- State Variables ---
const currentMode = ref('view') // 'view' = 檢視模式, 'edit' = 編輯模式
const isAuthorized = ref(false) // 編輯模式密碼驗證狀態
const showPasswordModal = ref(false)
const adminPasswordInput = ref('')
const passwordError = ref('')

const showSettingsPanel = ref(false)
const schoolName = ref('彰化縣伸港鄉新港國民小學')
const academicYear = ref('115')
const activeTab = ref('上學期') // '上學期' or '下學期'

// Table columns resizing
const colWidths = ref({
  week: 90,
  date: 160,
  events: 550,
  remark: 260
})

// Database
const db = ref({
  savedPassword: 'admin123',
  schoolName: '彰化縣伸港鄉新港國民小學',
  colWidths: {
    week: 90,
    date: 160,
    events: 550,
    remark: 260
  },
  years: {}
})

// Current visible rows and start date
const currentRows = ref([])
const currentStartDate = ref('')

// Modal state for bulk event import
const showEventModal = ref(false)
const targetRowIndex = ref(null)
const newEventText = ref('')

// Password settings state
const oldPasswordVal = ref('')
const newPasswordVal = ref('')
const confirmPasswordVal = ref('')
const passwordMsg = ref('')
const passwordMsgType = ref('success') // 'success' or 'error'

// Dark Mode State
const isDark = ref(false)

// Auto-save feedback message
const showSaveFeedback = ref(false)

// --- Helper: Default rows generator ---
const resetTabStructure = (semester) => {
  const isSem1 = semester === '上學期'
  const rows = []
  
  // Vacation start
  rows.push({ 
    id: 'vacation-start', 
    weekName: isSem1 ? '暑假' : '寒假', 
    dateRange: '', 
    events: [''], 
    remark: '' 
  })
  
  // Weeks 1 to 21
  for (let i = 1; i <= 21; i++) {
    rows.push({ 
      id: `week-${i}`, 
      weekName: `第${i}週`, 
      dateRange: '', 
      events: [''], 
      remark: '' 
    })
  }
  
  // Vacation end
  rows.push({ 
    id: 'vacation-end', 
    weekName: isSem1 ? '寒假' : '暑假', 
    dateRange: '', 
    events: [''], 
    remark: '' 
  })
  
  return rows
}

// --- Data Synchronization ---
const loadDb = () => {
  const raw = localStorage.getItem('calendar_system_db')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      db.value = {
        ...db.value,
        ...parsed,
        colWidths: { ...db.value.colWidths, ...parsed.colWidths },
        years: parsed.years || {}
      }
    } catch (e) {
      console.error("Failed to parse calendar_system_db", e)
    }
  }
  
  colWidths.value = db.value.colWidths || { week: 90, date: 160, events: 550, remark: 260 }
  schoolName.value = db.value.schoolName || '彰化縣伸港鄉新港國民小學'
  
  // Load current year and semester
  loadYearSemester()
}

const saveDb = () => {
  db.value.colWidths = colWidths.value
  db.value.schoolName = schoolName.value
  localStorage.setItem('calendar_system_db', JSON.stringify(db.value))
  
  // Show a brief auto-saved toast/feedback
  showSaveFeedback.value = true
  setTimeout(() => {
    showSaveFeedback.value = false
  }, 1500)
}

const loadYearSemester = () => {
  const yr = academicYear.value
  const sem = activeTab.value
  const semKey = sem === '上學期' ? 'sem1' : 'sem2'
  
  if (!db.value.years[yr]) {
    db.value.years[yr] = {}
  }
  
  if (!db.value.years[yr][semKey]) {
    db.value.years[yr][semKey] = {
      startDate: '',
      rows: resetTabStructure(sem)
    }
    saveDb()
  }
  
  currentRows.value = db.value.years[yr][semKey].rows
  currentStartDate.value = db.value.years[yr][semKey].startDate || ''
}

// Watchers for automatic saving
watch(currentRows, () => {
  saveDb()
}, { deep: true })

watch(currentStartDate, (newVal) => {
  const yr = academicYear.value
  const semKey = activeTab.value === '上學期' ? 'sem1' : 'sem2'
  if (db.value.years[yr] && db.value.years[yr][semKey]) {
    db.value.years[yr][semKey].startDate = newVal
    saveDb()
  }
})

watch(schoolName, () => {
  saveDb()
})

// Trigger reload on year or tab changes
const onYearChange = () => {
  loadYearSemester()
}

const switchTab = (tabName) => {
  if (activeTab.value !== tabName) {
    activeTab.value = tabName
    loadYearSemester()
  }
}

// --- Theme Switcher ---
const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('calendar_theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('calendar_theme', 'light')
  }
}

// --- Auth Protection ---
const toggleMode = (mode) => {
  if (mode === 'edit') {
    if (isAuthorized.value) {
      currentMode.value = 'edit'
    } else {
      adminPasswordInput.value = ''
      passwordError.value = ''
      showPasswordModal.value = true
    }
  } else {
    currentMode.value = 'view'
  }
}

const verifyPassword = () => {
  if (adminPasswordInput.value === db.value.savedPassword) {
    isAuthorized.value = true
    currentMode.value = 'edit'
    sessionStorage.setItem('isCalendarAuthorized', 'true')
    showPasswordModal.value = false
    passwordError.value = ''
  } else {
    passwordError.value = '密碼錯誤！請重試。'
  }
}

const logOutEdit = () => {
  isAuthorized.value = false
  currentMode.value = 'view'
  sessionStorage.removeItem('isCalendarAuthorized')
}

// Change password
const changePassword = () => {
  passwordMsg.value = ''
  if (oldPasswordVal.value !== db.value.savedPassword) {
    passwordMsg.value = '舊密碼輸入錯誤。'
    passwordMsgType.value = 'error'
    return
  }
  if (!newPasswordVal.value) {
    passwordMsg.value = '新密碼不得為空。'
    passwordMsgType.value = 'error'
    return
  }
  if (newPasswordVal.value !== confirmPasswordVal.value) {
    passwordMsg.value = '兩次輸入的新密碼不一致。'
    passwordMsgType.value = 'error'
    return
  }
  
  db.value.savedPassword = newPasswordVal.value
  saveDb()
  passwordMsg.value = '密碼變更成功！'
  passwordMsgType.value = 'success'
  oldPasswordVal.value = ''
  newPasswordVal.value = ''
  confirmPasswordVal.value = ''
}

// --- Event Editing Operations ---
const moveEventUp = (rowIndex, eventIndex) => {
  if (eventIndex > 0) {
    const events = currentRows.value[rowIndex].events
    const temp = events[eventIndex - 1]
    events[eventIndex - 1] = events[eventIndex]
    events[eventIndex] = temp
    saveDb()
  }
}

const moveEventDown = (rowIndex, eventIndex) => {
  const events = currentRows.value[rowIndex].events
  if (eventIndex < events.length - 1) {
    const temp = events[eventIndex + 1]
    events[eventIndex + 1] = events[eventIndex]
    events[eventIndex] = temp
    saveDb()
  }
}

const removeEvent = (rowIndex, eventIndex) => {
  currentRows.value[rowIndex].events.splice(eventIndex, 1)
  if (currentRows.value[rowIndex].events.length === 0) {
    currentRows.value[rowIndex].events.push('')
  }
  saveDb()
}

const addEmptyEventInline = (rowIndex) => {
  const events = currentRows.value[rowIndex].events
  if (events.length === 1 && events[0].trim() === '') {
    return
  }
  events.push('')
}

const openAddEventModal = (rowIndex) => {
  targetRowIndex.value = rowIndex
  newEventText.value = ''
  showEventModal.value = true
}

const confirmAddEvent = () => {
  if (newEventText.value.trim()) {
    const newEvents = newEventText.value.split('\n').filter(e => e.trim() !== '')
    const currentEvents = currentRows.value[targetRowIndex.value].events
    if (currentEvents.length === 1 && currentEvents[0].trim() === '') {
      currentRows.value[targetRowIndex.value].events = newEvents
    } else {
      currentRows.value[targetRowIndex.value].events.push(...newEvents)
    }
  }
  showEventModal.value = false
  saveDb()
}

// --- Date Math ---
const calculateDates = () => {
  if (!currentStartDate.value) return
  const d = new Date(currentStartDate.value)
  if (d.getDay() !== 0) {
    alert("請選擇「星期日」作為每週的開始時間！")
    return
  }
  const formatDate = (date) => {
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${mm}/${dd}`
  }
  for (let i = 1; i <= 21; i++) {
    let start = new Date(d.getTime() + (i - 1) * 7 * 24 * 60 * 60 * 1000)
    let end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
    if (currentRows.value[i]) {
      currentRows.value[i].dateRange = `${formatDate(start)}~${formatDate(end)}`
    }
  }
  saveDb()
}

// --- Copy Prev Year ---
const copyPreviousYearData = () => {
  const prevYear = parseInt(academicYear.value) - 1
  if (isNaN(prevYear)) {
    alert("學年度格式錯誤，無法計算前一年度。")
    return
  }

  const prevYearStr = prevYear.toString()
  const prevYearDb = db.value.years[prevYearStr]
  const semKey = activeTab.value === '上學期' ? 'sem1' : 'sem2'
  
  if (!prevYearDb || !prevYearDb[semKey] || !prevYearDb[semKey].rows) {
    alert(`找不到 ${prevYearStr} 學年度 ${activeTab.value} 的舊資料。`)
    return
  }

  if (!confirm(`確定要載入 ${prevYearStr} 學年度「${activeTab.value}」的重大行事與備註嗎？\n⚠️ 警告：這將會覆蓋您目前學期表格中的行事與備註！`)) {
    return
  }

  const prevRows = prevYearDb[semKey].rows
  for (let i = 0; i < currentRows.value.length; i++) {
    if (prevRows[i]) {
      currentRows.value[i].events = [...prevRows[i].events]
      currentRows.value[i].remark = prevRows[i].remark
    }
  }
  saveDb()
  alert(`✅ 已成功載入 ${prevYearStr} 學年度資料！`)
}

// --- Column Resizing ---
let resizingCol = null
let startX = 0
let startWidth = 0

const startResize = (e, colName) => {
  resizingCol = colName
  startX = e.pageX
  startWidth = colWidths.value[colName] || 150
  
  document.addEventListener('mousemove', doResize)
  document.addEventListener('mouseup', stopResize)
  
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const doResize = (e) => {
  if (!resizingCol) return
  const delta = e.pageX - startX
  colWidths.value[resizingCol] = Math.max(50, startWidth + delta)
}

const stopResize = () => {
  resizingCol = null
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)
  
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  saveDb()
}

// --- Drag & Drop Reordering ---
const dragSource = ref(null) // { rowIndex, eventIndex }
const dragOverRowIndex = ref(null)

const handleDragStart = (e, rowIndex, eventIndex) => {
  dragSource.value = { rowIndex, eventIndex }
  e.dataTransfer.effectAllowed = 'move'
}

const handleDragOver = (e, rowIndex) => {
  e.preventDefault()
  if (currentMode.value !== 'edit') return
  dragOverRowIndex.value = rowIndex
}

const handleDragLeave = () => {
  dragOverRowIndex.value = null
}

const handleDrop = (e, targetRowIndex) => {
  dragOverRowIndex.value = null
  if (currentMode.value !== 'edit' || !dragSource.value) return
  
  const { rowIndex: srcRowIndex, eventIndex: srcEventIndex } = dragSource.value
  if (srcRowIndex === targetRowIndex) {
    // Same row, dragging handles fine or ignores
    dragSource.value = null
    return
  }
  
  const eventText = currentRows.value[srcRowIndex].events[srcEventIndex]
  if (!eventText.trim()) {
    dragSource.value = null
    return
  }
  
  // Remove from source
  currentRows.value[srcRowIndex].events.splice(srcEventIndex, 1)
  if (currentRows.value[srcRowIndex].events.length === 0) {
    currentRows.value[srcRowIndex].events.push('')
  }
  
  // Add to target
  const targetEvents = currentRows.value[targetRowIndex].events
  if (targetEvents.length === 1 && targetEvents[0].trim() === '') {
    currentRows.value[targetRowIndex].events = [eventText]
  } else {
    currentRows.value[targetRowIndex].events.push(eventText)
  }
  
  dragSource.value = null
  saveDb()
}

// --- Export & Import ---
const exportJson = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db.value, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute("href", dataStr)
  downloadAnchor.setAttribute("download", `school_calendar_database_backup.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

const triggerImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      try {
        const parsed = JSON.parse(readerEvent.target.result)
        if (parsed.years && parsed.savedPassword) {
          db.value = {
            ...db.value,
            ...parsed,
            colWidths: parsed.colWidths || db.value.colWidths
          }
          saveDb()
          loadDb()
          alert("✅ 全系統行事曆資料庫匯入成功！")
        } else {
          alert("❌ 匯入失敗：此檔案非相容的重大行事曆備份格式。")
        }
      } catch (err) {
        alert("❌ 匯入失敗：檔案解析錯誤。")
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

const exportCsv = () => {
  let csvContent = "\uFEFF" // UTF-8 BOM
  csvContent += "周次,起訖時間,重大行事,備註\n"
  
  currentRows.value.forEach(row => {
    const weekName = `"${row.weekName.replace(/"/g, '""')}"`
    const dateRange = `"${row.dateRange.replace(/"/g, '""')}"`
    const filteredEvents = row.events.filter(e => e.trim() !== '')
    const eventsStr = `"${filteredEvents.join('\n').replace(/"/g, '""')}"`
    const remark = `"${row.remark.replace(/"/g, '""')}"`
    
    csvContent += `${weekName},${dateRange},${eventsStr},${remark}\n`
  })
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${schoolName.value}_${academicYear.value}學年度_${activeTab.value}_重大行事曆.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const exportWord = () => {
  const yr = academicYear.value
  const sem = activeTab.value
  const titleText = `${schoolName.value}${yr}學年度${sem}重大行事 課發會討論版`
  
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`
  html += `<head><meta charset="utf-8"><title>${titleText}</title>`
  html += `<style>`
  html += `
    @page {
      size: A4 portrait;
      margin: 1.5cm 1.2cm 1.5cm 1.2cm;
    }
    body {
      font-family: "微軟正黑體", "Microsoft JhengHei", "新細明體", sans-serif;
      margin: 0;
      padding: 0;
    }
    .title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 20px;
      font-family: "微軟正黑體", "Microsoft JhengHei", sans-serif;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #000000;
      padding: 8px 10px;
      font-size: 11pt;
      vertical-align: top;
      word-break: break-all;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .center {
      text-align: center;
      vertical-align: middle;
    }
    .left {
      text-align: left;
    }
    .event-line {
      margin: 0;
      padding: 0;
      line-height: 1.4;
      font-size: 11pt;
    }
  `
  html += `</style></head><body>`
  html += `<div class="title">${titleText}</div>`
  html += `<table>`
  html += `<thead>`
  html += `<tr>`
  html += `<th style="width: 12%;">周次</th>`
  html += `<th style="width: 20%;">起訖時間</th>`
  html += `<th style="width: 48%;">重大行事</th>`
  html += `<th style="width: 20%;">備註</th>`
  html += `</tr>`
  html += `</thead>`
  html += `<tbody>`
  
  currentRows.value.forEach(row => {
    const isVacation = row.id.includes('vacation')
    const rowStyle = isVacation ? 'background-color: #fafafa;' : ''
    
    html += `<tr style="${rowStyle}">`
    html += `<td class="center" style="font-weight: bold;">${row.weekName}</td>`
    html += `<td class="center">${row.dateRange || ''}</td>`
    
    const filteredEvents = row.events
      .filter(e => e.trim() !== '')
      .map(e => `<div class="event-line">${e}</div>`)
      .join('')
    html += `<td class="left">${filteredEvents || ''}</td>`
    
    const remarkHtml = row.remark ? row.remark.replace(/\n/g, '<br>') : ''
    html += `<td class="left">${remarkHtml}</td>`
    html += `</tr>`
  })
  
  html += `</tbody></table>`
  html += `</body></html>`
  
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${titleText}.doc`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const triggerPrint = () => {
  window.print()
}

// --- Lifecycle Hooks ---
onMounted(() => {
  // Theme check
  const savedTheme = localStorage.getItem('calendar_theme')
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  }
  
  // Session Auth check
  if (sessionStorage.getItem('isCalendarAuthorized') === 'true') {
    isAuthorized.value = true
  }
  
  // Load Database
  loadDb()
})
</script>

<template>
  <div class="app-container">
    <div class="glass-card">
      
      <!-- Dashboard Top Header Bar (Hidden in Printing) -->
      <header class="dashboard-header no-print">
        <div class="brand-section">
          <Sparkles class="w-8 h-8 text-yellow-300 animate-pulse" />
          <input 
            type="text" 
            v-model="academicYear" 
            @change="onYearChange" 
            class="academic-year-input"
            placeholder="115"
          >
          <span class="system-title">學年度重大行事曆系統</span>
          
          <!-- Auto save status indicator -->
          <div class="flex items-center text-xs bg-white/20 px-2 py-1 rounded text-white/90 gap-1 ml-2 font-medium" style="opacity: 0.8;">
            <Check class="w-3 h-3 text-green-300" />
            <span>本機智慧存檔中</span>
          </div>
        </div>
        
        <div class="control-section">
          <!-- Dark / Light mode toggle -->
          <button @click="toggleTheme" class="theme-toggle-btn" title="切換深/淺色模式">
            <Sun v-if="isDark" class="w-5 h-5 text-yellow-300" />
            <Moon v-else class="w-5 h-5 text-indigo-100" />
          </button>
          
          <!-- Edit/View Switcher -->
          <div class="btn-group">
            <button 
              @click="toggleMode('view')" 
              :class="{'active': currentMode === 'view'}"
              class="btn-toggle"
            >
              <Unlock class="w-4 h-4" /> 檢視模式
            </button>
            <button 
              @click="toggleMode('edit')" 
              :class="{'active': currentMode === 'edit'}"
              class="btn-toggle"
            >
              <Lock class="w-4 h-4" /> 編輯模式
            </button>
          </div>

          <!-- Lock/Logout button in edit mode -->
          <button 
            v-if="currentMode === 'edit'" 
            @click="logOutEdit"
            class="btn btn-secondary py-2 border-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            title="鎖定並退出編輯"
          >
            <LogOut class="w-4 h-4" /> 鎖定
          </button>

          <!-- Settings panel toggle -->
          <button 
            @click="showSettingsPanel = !showSettingsPanel"
            :class="{'bg-white/25 text-white': showSettingsPanel, 'text-white/80': !showSettingsPanel}"
            class="theme-toggle-btn" 
            title="系統與資料庫設定"
          >
            <Settings class="w-5 h-5" />
          </button>

          <!-- Export Word -->
          <button @click="exportWord" class="btn btn-primary" style="background-color: hsl(210, 80%, 42%);" title="匯出 Word 討論版">
            <FileText class="w-4 h-4" /> 匯出 Word
          </button>

          <!-- Print Trigger -->
          <button @click="triggerPrint" class="btn btn-success">
            <Printer class="w-4 h-4" /> 列印 / 儲存 PDF
          </button>
        </div>
      </header>

      <!-- Advanced Settings Panel (Hidden in Printing) -->
      <section v-if="showSettingsPanel" class="settings-panel no-print">
        <div class="settings-group border-r border-color pr-4">
          <h3 class="setting-card-title"><Sparkles class="w-4 h-4 text-purple-500" /> 系統客製化設定</h3>
          <div class="form-group mt-2">
            <label class="form-label">學校名稱</label>
            <input type="text" v-model="schoolName" class="form-input" placeholder="例如：新港國民小學">
          </div>
          <div class="form-group">
            <label class="form-label">目前學年度</label>
            <input type="text" v-model="academicYear" @change="onYearChange" class="form-input">
          </div>
        </div>

        <div class="settings-group border-r border-color pr-4">
          <h3 class="setting-card-title"><Lock class="w-4 h-4 text-indigo-500" /> 變更編輯管理密碼</h3>
          <div class="form-group mt-2">
            <input type="password" v-model="oldPasswordVal" class="form-input mb-2" placeholder="請輸入舊密碼">
            <input type="password" v-model="newPasswordVal" class="form-input mb-2" placeholder="輸入新密碼">
            <input type="password" v-model="confirmPasswordVal" class="form-input" placeholder="確認新密碼">
          </div>
          <button @click="changePassword" class="btn btn-primary w-full text-xs py-2">確認修改密碼</button>
          <p v-if="passwordMsg" :class="passwordMsgType === 'success' ? 'text-green-500' : 'text-red-500'" class="text-xs mt-2 font-medium">
            {{ passwordMsg }}
          </p>
        </div>

        <div class="settings-group">
          <h3 class="setting-card-title"><Download class="w-4 h-4 text-emerald-500" /> 資料庫匯入與備份</h3>
          <p class="text-xs text-muted mb-4">本系統完全使用本機 LocalStorage 儲存，建議定期匯出備份以防資料遺失。</p>
          <div class="flex flex-col gap-2">
            <button @click="exportJson" class="btn btn-secondary w-full text-left py-2 text-xs">
              <Download class="w-4 h-4 text-indigo-500" /> 匯出系統完整備份 (JSON)
            </button>
            <button @click="triggerImport" class="btn btn-secondary w-full text-left py-2 text-xs">
              <Upload class="w-4 h-4 text-indigo-500" /> 匯入系統備份檔 (JSON)
            </button>
            <button @click="exportCsv" class="btn btn-secondary w-full text-left py-2 text-xs">
              <FileSpreadsheet class="w-4 h-4 text-green-600" /> 匯出當前學期行事曆為 Excel (CSV)
            </button>
            <button @click="exportWord" class="btn btn-secondary w-full text-left py-2 text-xs">
              <FileText class="w-4 h-4 text-blue-600" /> 匯出當前學期行事曆為 Word (.doc)
            </button>
          </div>
        </div>
      </section>

      <!-- Semester Tab Switches (Hidden in Printing) -->
      <nav class="tabs-navigation no-print">
        <button 
          @click="switchTab('上學期')" 
          :class="{'active': activeTab === '上學期'}"
          class="tab-btn"
        >
          上學期
        </button>
        <button 
          @click="switchTab('下學期')" 
          :class="{'active': activeTab === '下學期'}"
          class="tab-btn"
        >
          下學期
        </button>
      </nav>

      <!-- Edit Mode Toolbar (Hidden in Printing, Visible only in Edit Mode) -->
      <div v-if="currentMode === 'edit'" class="tool-settings-bar no-print">
        <!-- Date calculator input -->
        <div class="setting-card">
          <h4 class="setting-card-title">
            <CalendarIcon class="w-4 h-4 text-indigo-500" /> 
            設定第1週開始時間 (星期日)
          </h4>
          <div class="setting-card-content">
            <input 
              type="date" 
              v-model="currentStartDate" 
              @change="calculateDates" 
              class="input-date"
            >
            <div class="help-text">
              選擇週日後，系統會自動遞增推算第 1 ~ 21 週的日期區間。
            </div>
          </div>
        </div>

        <!-- Copy prev year data -->
        <div class="setting-card max-w-xs flex justify-center items-center">
          <button @click="copyPreviousYearData" class="btn btn-secondary w-full border-dashed py-3">
            <Copy class="w-4 h-4 text-orange-500" /> 
            沿用 {{ parseInt(academicYear) - 1 || '前一' }} 學年重大行事與備註
          </button>
        </div>
      </div>

      <!-- Main Calendar Title (Always Visible, dynamic styles for printing) -->
      <div class="view-title-section">
        <h1 class="view-school-title">
          {{ schoolName }}{{ academicYear }}學年度{{ activeTab }}重大行事
        </h1>
        <div class="view-sub-title">課發會討論版本</div>
      </div>

      <!-- Table Area -->
      <div class="table-wrapper">
        <table class="calendar-table">
          <thead>
            <tr>
              <!-- Week Column -->
              <th :style="{ width: colWidths.week + 'px' }">
                周次
                <div class="resize-handle no-print" @mousedown.prevent="startResize($event, 'week')"></div>
              </th>
              
              <!-- Date Range Column -->
              <th :style="{ width: colWidths.date + 'px' }">
                起訖時間
                <div class="resize-handle no-print" @mousedown.prevent="startResize($event, 'date')"></div>
              </th>
              
              <!-- Events Column -->
              <th :style="{ width: colWidths.events + 'px' }">
                重大行事
                <div class="resize-handle no-print" @mousedown.prevent="startResize($event, 'events')"></div>
              </th>
              
              <!-- Remarks Column -->
              <th :style="{ width: colWidths.remark + 'px' }">
                備註
                <div class="resize-handle no-print" @mousedown.prevent="startResize($event, 'remark')"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(row, rowIndex) in currentRows" 
              :key="row.id"
              :class="{
                'row-vacation': row.id.includes('vacation'),
                'drag-over-row': dragOverRowIndex === rowIndex
              }"
              @dragover="handleDragOver($event, rowIndex)"
              @dragleave="handleDragLeave"
              @drop="handleDrop($event, rowIndex)"
            >
              <!-- Week Cell -->
              <td class="week-cell">
                {{ row.weekName }}
              </td>
              
              <!-- Date Range Cell -->
              <td class="date-cell">
                <input 
                  v-if="currentMode === 'edit'" 
                  type="text" 
                  v-model="row.dateRange"
                  class="date-input-inline"
                  placeholder="例如: 08/30~09/05"
                >
                <span v-else>{{ row.dateRange || '—' }}</span>
              </td>
              
              <!-- Events Cell -->
              <td>
                <!-- View Mode List -->
                <ul v-if="currentMode === 'view'" class="event-list">
                  <template v-for="(event, eIdx) in row.events" :key="eIdx">
                    <li v-if="event.trim() !== ''" class="event-item-view">
                      {{ event }}
                    </li>
                  </template>
                  <li v-if="row.events.filter(e => e.trim() !== '').length === 0" class="text-muted text-sm italic">
                    無安排行事
                  </li>
                </ul>

                <!-- Edit Mode Drag-and-Drop Event Editor -->
                <div v-else class="event-editor-container">
                  <div 
                    v-for="(event, eIdx) in row.events" 
                    :key="eIdx" 
                    class="event-item-edit"
                    draggable="true"
                    @dragstart="handleDragStart($event, rowIndex, eIdx)"
                  >
                    <!-- Drag handle icon -->
                    <div class="event-drag-handle" title="拖曳搬移事件到別週">
                      <GripVertical class="w-4 h-4" />
                    </div>
                    
                    <input 
                      type="text" 
                      v-model="row.events[eIdx]" 
                      class="event-input-inline" 
                      placeholder="請輸入行事內容..."
                    >

                    <!-- Control buttons -->
                    <button 
                      @click="moveEventUp(rowIndex, eIdx)" 
                      :disabled="eIdx === 0"
                      class="btn-icon-only" 
                      title="往上移"
                    >
                      <ArrowUp class="w-3.5 h-3.5" />
                    </button>
                    <button 
                      @click="moveEventDown(rowIndex, eIdx)" 
                      :disabled="eIdx === row.events.length - 1"
                      class="btn-icon-only" 
                      title="往下移"
                    >
                      <ArrowDown class="w-3.5 h-3.5" />
                    </button>
                    <button 
                      @click="removeEvent(rowIndex, eIdx)" 
                      class="btn-icon-only text-red-500 hover:text-red-600 hover:bg-red-50" 
                      title="刪除"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <!-- Quick Add buttons -->
                  <div class="flex gap-2">
                    <button @click="addEmptyEventInline(rowIndex)" class="btn-add-event-popup">
                      <Plus class="w-3 h-3" /> 新增單行
                    </button>
                    <button @click="openAddEventModal(rowIndex)" class="btn-add-event-popup">
                      <Sparkles class="w-3 h-3" /> 批次新增事件
                    </button>
                  </div>
                </div>
              </td>
              
              <!-- Remark Cell -->
              <td>
                <textarea 
                  v-if="currentMode === 'edit'" 
                  v-model="row.remark" 
                  class="remark-textarea"
                  placeholder="輸入備註事項..."
                ></textarea>
                <div v-else class="remark-text">{{ row.remark || '—' }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- Modals (Hidden in Printing) -->
    
    <!-- Admin Unlock Password Modal -->
    <div v-if="showPasswordModal" class="modal-overlay no-print">
      <div class="modal-content">
        <header class="modal-header">
          <h3 class="modal-title flex items-center gap-2">
            <Lock class="w-5 h-5 text-indigo-500" />
            解鎖編輯模式
          </h3>
          <button @click="showPasswordModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </header>
        <div class="modal-body">
          <p class="text-sm text-slate-500 mb-4">
            此頁面已發布在網路，為了防止未授權更改，進入編輯模式需要輸入管理密碼。
            <br>
            <span class="text-xs font-semibold text-indigo-600">(本機預設密碼為: admin123)</span>
          </p>
          <div class="form-group">
            <label class="form-label">請輸入管理密碼</label>
            <input 
              type="password" 
              v-model="adminPasswordInput" 
              @keyup.enter="verifyPassword"
              class="form-input" 
              placeholder="••••••••" 
              autofocus
            >
            <span v-if="passwordError" class="text-red-500 text-xs mt-1 block font-medium">
              {{ passwordError }}
            </span>
          </div>
        </div>
        <footer class="modal-footer">
          <button @click="showPasswordModal = false" class="btn btn-secondary py-2">取消</button>
          <button @click="verifyPassword" class="btn btn-primary py-2">解鎖並進入編輯</button>
        </footer>
      </div>
    </div>

    <!-- Bulk Event Add Modal -->
    <div v-if="showEventModal" class="modal-overlay no-print">
      <div class="modal-content">
        <header class="modal-header">
          <h3 class="modal-title">批次新增重大行事</h3>
          <button @click="showEventModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </header>
        <div class="modal-body">
          <p class="text-xs text-muted mb-2">請在下方逐行輸入多個行事事件。按下 Enter 換行代表新增下一筆。</p>
          <textarea 
            v-model="newEventText" 
            class="form-textarea" 
            placeholder="例如：&#10;期中定期評量&#10;校慶體育發表會&#10;第二次領域會議"
            autofocus
          ></textarea>
        </div>
        <footer class="modal-footer">
          <button @click="showEventModal = false" class="btn btn-secondary py-2">取消</button>
          <button @click="confirmAddEvent" class="btn btn-primary py-2">確認批次新增</button>
        </footer>
      </div>
    </div>

    <!-- Saved Auto indicator Toast -->
    <transition name="fade">
      <div v-if="showSaveFeedback" class="fixed bottom-6 right-6 z-50 bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700/50 text-sm font-medium">
        <Check class="w-4 h-4 text-green-400 dark:text-green-600" />
        <span>變更已自動存檔</span>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
