export default {
  leaderboard: {
    selfCompany: '{name}（本企業）',
    namePhone: '{name}（{phone}）',
    title: '低碳打卡排行榜',
    back: '返回打卡任務',
    teamRank: '企業排名',
    personalRank: '個人排名',
    myCoins: '我的累計碳幣',
    searchPerson: '搜尋姓名或手機號後四位',
    searchTeam: '搜尋企業名稱',
    selfName: '{name}（我）',
    scoreValue: '{value} 分',
    pendingScore: '待核驗',
    vacant: '暫無上榜選手',
    noRank: '暫無有效打卡排名',
    coins: '碳幣',
    people: '打卡人數：{count} 人',
    eScore: 'E 階段 {score}',
    phone: '手機號',
    track: '參賽組別',
    company: '所屬企業',
    myTeam: '（本企業）',
    eStage: 'E 階段得分',
    total: '共 {count} 條資料',
    noResults: '暫無符合條件的排名',
  },
  modelErrors: {
    MODEL_DATA_INCOMPLETE:
      '該模型暫時無法讀取有效核算結果，請回到原核算檢查結果並重新核算，或選擇其他已完成的模型。',
    CALCULATION_INCOMPLETE:
      '該模型尚未完成核算，或正在重新計算。請完成核算後重新選擇。',
    SOURCE_VERSION_CHANGED:
      '模型已發生變化，請重新選擇並核對最新結果後再儲存或提交。',
  },
  resultErrors: {
    RESULT_SESSION_UNAVAILABLE:
      '未找到可存取的核算對話或分享，請到對話列表查看原核算。',
    RESULT_SHARE_UNAVAILABLE:
      '該成員尚未開啟結果分享，或分享已失效，請聯絡該成員。',
    SNAPSHOT_NOT_READY: '核算結果尚未提交完成，請稍後重新整理。',
    FORBIDDEN: '無權查看此核算結果。',
  },
  rankLabel: '排名',
  modelLabel: '選擇核算模型',
  modelHint:
    '請選擇已完成核算的模型。確認提交後，將保存固定結果用於評審，內容不可修改。',

  captainBadge: '僅組長提交',
  enterpriseBadge: '僅企業組開放',
  modelTools: '使用核算結果分享連結',
  modelSearchPlaceholder: '輸入模型名稱搜尋',
  checkinTitle: '參與低碳打卡，積累碳幣',
  topFive: '低碳打卡 TOP 5',

  deadlineHint:
    '請在各項任務截止前完成提交。確認提交後，內容將被鎖定，無法修改。',
  active: '進行中',
  selected: '目前查看模組',
  enterpriseOnly: '個人組無需提交',
  captainOnly: '本階段材料由企業組組長統一提交，組員可查看已提交內容。',
  qualification:
    '本階段材料提交暫未開放，將於初賽入圍名單公佈後向晉級決賽的企業組開放。',
  submission: '任務提交',
  progress: '狀態查看',
  C: '量化碳排放',
  R: '碳減排方案',
  E: '價值鏈帶動',
  O: '高品質抵消',
  S: '披露與傳播',
  CDesc: '完成產品碳足跡與企業碳盤查任務，提交 Carbon Agent 核算結果。',
  RDesc: '分析主要排放環節，制定有針對性的減排措施。',
  EDesc: '參與碳賬戶打卡，積累個人碳幣，助力本隊低碳行動。',
  ODesc: '評估剩餘碳排放，提出合理的碳抵消方案。',
  SDesc: '總結碳管理成果，分享優秀低碳實踐經驗。',
  product: '任務一：產品碳足跡核算',
  enterprise: '任務二：企業碳盤查核算',
  schedule: '任務提交時間：{start} — {end}',
  release: '考題開放下載：{time}',
  downloadEventClosed: '賽事目前未開放，暫不能下載賽題。',
  downloadTaskClosed: '本任務暫未開放，請關注賽事通知。',
  downloadSchedulePending: '本任務賽程尚未確認，暫不能下載賽題。',
  downloadReleasePending: '發題時間尚未公佈，請關注賽事通知。',
  downloadNotReleased: '賽題尚未開放，將於 {time} 開放下載。',
  downloadChooseStandard: '請先選擇統一賽題，完成分配後即可下載。',
  downloadNotAssigned:
    '尚未取得可下載的賽題，請重新載入；若仍不可用，請聯絡賽事營運。',
  organizer: '使用大賽統一賽題',
  own: '使用企業自有數據',
  summary: '方案摘要',
  summaryHint:
    '請簡要說明企業選定的核算產品及企業資訊，並概述減排、抵消和傳播方案的亮點。',
  files: '方案附件',
  fileHint: '支援 PDF、PPTX、Word、PNG、JPG，單個檔案不超過 50MB',
  confirm: '確認提交本階段材料？提交後將保存為決賽評審依據，內容不可修改。',
  readonly: '本階段材料已提交，內容不可修改。',
  empty: '暫無已提交材料',
  tooLarge: '單個附件不能超過 50MB',
  loading: '正在載入任務',
  failed: '任務載入失敗，請重試',
  role: '目前身分：{role}',
  finalTitle: '決賽準備階段材料上傳',
  summaryRequired: '請填寫方案摘要',
  statusTitle: '任務狀態',
  fileExpired: '附件上傳憑據已失效或不屬於目前任務，請重新上傳',
  versionConflict: '任務已更新，請重新整理後核對最新內容',
  phaseClosed: '目前不在提交時間內',
  notStarted: '待提交',
  paperExhausted: '暫無可分配的標準賽題，請聯絡賽事營運補充題目後重試。',
  checkinNotOpen: '低碳打卡尚未開放，具體時間請關注賽事通知。',

  individualOrganizer: '使用個人組統一賽題',

  partial: '部分完成',

  completed: '已完成',

  notOpen: '未開始',

  submittedHint:
    '材料提交成功！查看結果將開啟原核算對話或分享；評審仍以提交時保存的結果為準。',

  finalDeadlineHint:
    '請在規定時間內完成決賽材料提交。確認提交後，內容不可修改，逾期將關閉提交入口。',

  finalForms: {
    R: {
      title: '決賽任務一：碳減排方案',
      label: '減排方案說明',
      placeholder:
        '請簡要說明企業選定的核算產品及企業資訊，並概述減排、抵消和傳播方案的亮點。',
      upload: '上傳減排方案附件',
    },
    O: {
      title: '決賽任務二：碳抵消方案',
      label: '碳抵消方案說明',
      placeholder:
        '請簡要說明企業選定的核算產品及企業資訊，並概述減排、抵消和傳播方案的亮點。',
      upload: '上傳碳抵消方案附件',
    },
    S: {
      title: '決賽任務三：碳管理成果展示',
      label: '成果展示說明',
      placeholder:
        '請簡要說明企業選定的核算產品及企業資訊，並概述減排、抵消和傳播方案的亮點。',
      upload: '上傳成果展示附件',
    },
  },
};
