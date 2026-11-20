import awardDetails from './competitionAwards';
import partnerSection from './competitionPartners';
import rules from './competitionRules';
import legal from './competitionLegal';

export default {
  phoneVerificationRequired:
    '請先在帳號設定中綁定與報名一致的手機號，再重試關聯碳帳戶。',
  registrationMobileLocked:
    '報名手機號已儲存，不能在此修改；如需更正請聯絡賽事工作人員。',
  registrationMobileHint:
    '用於賽事聯絡。電郵帳號無需提前綁定手機號；自動關聯已有名冊或碳帳戶時需驗證手機號歸屬。',
  registrationMobileInvalid: '請輸入有效的11位手機號',
  registrationMobileRequired: '請輸入本人聯絡手機號',
  bannerTitle: '首屆中國企業碳管理大賽',
  bannerEnglishTitle: '2026 China Carbon Management Award',
  bannerDescription:
    '以真實碳管理任務為核心，AI賦能專業實踐，共同探索綠色發展新路徑。',
  bannerHighlights: [
    { title: '雙賽道', description: '企業與個人' },
    { title: '萬元', description: '現金大獎' },
    { title: 'Carbon Agent', description: '參賽權益' },
  ],

  invitationLead: '邀請您參加',
  invitationCompetitionTitle: '首屆中國企業碳管理大賽！',
  invitationIndependentBadge: '自主報名',
  invitationContinue: '確認選擇',

  enterpriseDuplicate:
    '該企業已有參賽隊伍。每家企業僅可組建一支隊伍，請聯絡企業內部參賽負責人；如需協助，可聯絡大賽小助手。',
  registrationDeadlineLabel: '報名截止時間（北京時間）：{date}',
  taskDraft: '草稿未提交',

  partnerSection,
  awardDetails,
  rules,
  legal,
  trackLabel: '參賽組別',
  trackNotSelected: '未選擇',
  participationInfo: '個人參賽信息',
  participantAccount: '參賽帳號',
  individualRegistered: '報名成功',
  reviewPendingTitle: '正在審核中',
  reviewRejectedTitle: '審核未通過',
  reviewApprovedHint: '企業資質審核已通過！請繼續添加參賽組員，完成報名。',
  editInformation: '修改資訊',
  refreshStatus: '重新整理狀態',
  inviteFriends: '邀請好友參賽',
  personalInviteHint:
    '每成功邀請 1 位新參賽者完成報名，可獲得 2% 個人得分加成，累計最高 10%。',
  inviteRecordCount: '共 {count} 筆',
  noInvites: '還沒有邀請紀錄，邀請好友一起參賽吧。',
  invitee: '受邀人',
  enrollmentStatus: '報名狀態',
  notRegistered: '未完成報名',
  inviteTeamPending: '審核通過，待組隊',
  inviteTeamPendingBonus: '團隊完成報名後，符合規則的邀請才計入加成。',
  removedCanRegister:
    '你已被移出原參賽團隊，可在報名截止前選擇個人報名或創建自己的企業參賽團隊。',
  memberOtherTeam: '該手機號已加入其他企業參賽隊伍，無法添加到本隊。',
  memberIndividualRegistered: '該手機號已報名個人賽，不能重複加入企業隊伍。',
  memberAlreadyInTeam: '該手機號已在本隊名冊中，無需重複添加。',
  memberRemovedOtherTeam:
    '該成員已被原隊移除，請由本人選擇個人報名或創建企業，不能直接添加到其他隊伍。',
  notCounted: '未計入',
  individualSuccessHint:
    '您已成功報名個人組！請前往「我的參賽任務」查看比賽任務。',

  individualAccountHint: '請填寫本人聯絡手機號，電郵帳號也可直接報名。',
  individualConfirm: '確認報名',

  invitationEmployeeTitle: '確認加入【{team}】參賽團隊？',
  invitationEmployeeHint:
    '企業組僅限本企業員工參加。請確認您屬於該企業，並填寫本人聯絡手機號。加入後，您將參與企業組比賽，同時自動參與個人排名，無需重複報名。',
  invitationDeadline: '最晚新增時間為 {date}。',
  invitationConfirm: '確認加入',

  invitationUnavailable:
    '邀請人的隊伍暫不可加入（未通過審核、已滿員或已截止）。報名開放時仍可獨立報名參賽。',
  invitationBadge: '全鏈減碳 · 共創零碳未來',
  invitationTitle: '{name} 邀請您參加首屆中國企業碳管理大賽！',
  invitationDescription:
    '企業組、個人組均可報名，通過碳管理實戰任務提升專業能力，還有機會獲得賽事獎項與參賽專屬權益。通過專屬鏈接完成有效報名，還可助力邀請人獲得個人得分加成！',
  invitationAccept: '立即加入',
  invitationLater: '瞭解大賽',
  invitationChoose: '請選擇您的參賽方式',
  invitationJoin: '加入邀請人的企業團隊',
  invitationJoinHint:
    '適用於該企業員工，加入現有團隊，共同完成企業組比賽任務。',
  invitationIndependent: '獨立報名參賽',
  invitationIndependentHint: '可創建本企業參賽團隊，或選擇個人組獨立參賽。',

  registrationDetails: '報名權益與邀請紀錄',
  membersStep: '成員管理',
  membersTitle: '參賽小組成員管理（3–10人）',
  membersHint: '請確認所有組員均完成註冊報名',
  membersCount: '成員 {count} / 10',
  accountStatus: '註冊狀態',
  accountRegistered: '已註冊',
  accountUnregistered: '未註冊',
  accountChecking: '校驗中',
  accountUnchecked: '待校驗',
  memberInvalid: '請輸入真實姓名和有效的11位手機號。',
  memberConflict: '該手機號已參賽，無法重複添加。',
  memberCheckFailed: '暫時無法校驗該成員，請稍後點擊「重新校驗」。',
  duplicateMobile: '同一隊伍不能重複添加同一手機號。',
  inviter: '邀請人',
  inviteBonus: '邀請加成',
  memberPersonalBonus: '個人加成',
  memberPersonalBonusHint:
    '僅按該成員本人的有效邀請計算，每人增加 2% 個人組成績加成，最高 10%；達到上限後繼續邀請不再增加加成。',
  currentTeamBonus: '當前團隊加成：',
  currentTeamBonusHint:
    '按已報名團隊的有效入冊註冊人數計算，超過 5 人後每增加 1 人加成 2%，最高 10%。未保存的成員調整暫不計入。',
  inviteBannerTitle: '邀請好友，一起參與碳管理實踐',
  inviteBannerHint: '邀請更多人參與大賽，成功報名即可贏得額外加分。',
  copyInvite: '複製專屬邀請鏈接',
  addMember: '添加組員（最多10人）',
  captainRole: '組長',
  memberRole: '組員',
  confirmTeamTitle: '確認提交參賽小組信息？',
  confirmTeamHint:
    '請確認組員姓名及手機號填寫正確。提交後即完成企業組報名；報名截止前仍可添加、修改或刪除組員，並繼續邀請好友參賽。',
  confirmTeamNotice: '請提醒組員使用報名手機號註冊 Carbon Agent。',
  registrationSuccess: '企業組報名成功！',
  registrationSuccessHint:
    '您的參賽小組已提交成功！請提醒尚未注冊的組員使用報名手機號完成 Carbon Agent 注冊。報名截止前仍可調整組員信息；邀請截止前可繼續邀請好友參賽。',
  qualificationSubmitted: '企業信息已提交！',
  qualificationSubmittedHint:
    '我們正在審核您的企業資料，預計48小時內反饋審核結果。審核通過後，即可繼續添加參賽組員。',
  understood: '我知道了',
  confirmAction: '確認提交',
  minimumMembers: '至少填寫3名成員（含組長）並完成校驗後，才能提交報名。',
  checkAgain: '重新校驗',
  nameFor: '第 {index} 位成員姓名',
  phoneFor: '第 {index} 位成員手機號',
  saveRoster: '儲存名冊草稿',
  registrationComplete: '組隊已提交',

  hot: 'Hot',
  title: '中國企業碳管理大賽',
  backHome: '返回大賽首頁',
  intro: '大賽介紹',
  register: '報名管理',
  tasks: '我的參賽任務',
  results: '大賽結果',
  chooseTrack: '選擇您的參賽組別',
  chooseTrackHint: '大賽設企業組和個人組兩個賽道，請根據您的參賽身份選擇。',
  enterprise: '企業組',
  individual: '個人組',
  enterpriseSize: '3–10人組隊參賽',
  individualSize: '1 人獨立參賽',
  audience: '適合對象',
  method: '核算方式',
  individualTaskLabel: '比賽任務',
  task: '參賽任務',
  registerNow: '立即報名',
  enterpriseAudience: '不限制行業，企業內部組隊',
  individualAudience:
    '高校學生、碳管理及諮詢行業從業者，以及對碳管理感興趣的社會人士。',
  enterpriseMethod: '可使用企業真實數據，或選擇主辦方統一賽題。',
  individualMethod: '使用主辦方提供的個人組統一賽題。',
  enterpriseTask:
    '完成產品碳足跡、企業碳盤查及碳帳戶打卡；入圍決賽後進一步展示減排方案、碳抵消方案和傳播與披露方案。',
  individualTask:
    '通過 Carbon Agent 完成指定產品碳足跡與企業碳盤查任務，並參與碳帳戶打卡。',
  trackNoticeLabel: '特別說明：{notice}',
  trackNotice:
    '企業組成員將自動納入個人組排名，無需重複報名；已報名個人組的選手不得再加入企業組。',
  profile: '參賽人資訊',
  companyInfo: '企業信息填寫',
  companyHint:
    '請填寫真實、準確的企業信息，提交後將由大賽工作人員進行審核。審核通過後，即可添加參賽組員。',
  companyPlaceholder: '請輸入營業執照上的企業全稱',
  creditPlaceholder: '請輸入營業執照上的18位統一社會信用代碼',
  creditInvalid:
    '統一社會信用代碼應為18位英文字母或數字，請核對營業執照後重新輸入。',
  namePlaceholder: '請輸入參賽人的真實姓名',
  next: '下一步',
  previous: '返回',
  uploadImage: '上傳圖片',
  reupload: '重新上傳',
  deleteFile: '刪除',
  removeMemberTitle: '確認刪除該成員？',
  removeMemberHint: '刪除後，該成員將從目前名冊中移除。',
  fileSize: '檔案大小：{size}',
  fileHint: '支持 PDF、JPG、PNG 格式，檔案不超過 10MB',
  logoHint: '建議上傳清晰的 PNG 圖片',
  logoTooltip:
    '企業 Logo 將用於參賽身分識別及大賽物料製作，提交即表示同意主辦方在上述範圍內使用。',
  fileInvalid: '請上傳支持的檔案格式，且檔案大小不超過 10MB。',
  uploaded: '已上傳',
  preview: '查看檔案',
  reviewPending: '企業信息已提交，正在進行資質審核，請留意審核結果。',
  reviewApproved: '審核通過',
  reviewRejected:
    '企業資質審核未通過，請按駁回原因修改後重新提交。如需幫助，可聯繫大賽小助手。',
  groupHint: '獲取賽事通知、培訓資料和參賽答疑。',
  assistantHint: '報名組隊、賽事規則及任務提交問題咨詢。',
  contact: '參賽服務入口',
  qrPending: '二維碼待公佈',
  goalsTitle: '大賽目標',
  goalsHint:
    '以真實任務為基礎，以專業評價為支撐，推動碳管理能力建設、優秀實踐推廣與產業協同減碳。',
  background: [
    '全球氣候風險持續加劇，碳管理正從環境議題轉變為影響企業貿易准入、供應鏈合作、綠色採購、ESG評價和品牌競爭力的重要經營能力。',
    '隨著我國「雙碳」政策、全國碳市場和產品碳足跡管理體系不斷完善，企業面臨的核心問題已從「是否開展碳管理」轉向「能否算得清、減得實、帶得動、講得明」。',
    '但目前不少企業仍存在數據基礎薄弱、核算口徑不統一、減排行動與經營脫節、供應鏈協同不足等問題。',
    '因此，本項目擬搭建全國性碳管理實戰平台，通過真實任務、專業評價和案例傳播，發現並表彰優秀企業與低碳實踐，沉澱可複製的中國企業氣候轉型經驗，推動企業建立系統、可信、持續的碳管理能力。',
  ],
  goals: [
    {
      title: '建立專業評價體系',
      text: '覆蓋碳核算、減排、帶動、抵消與傳播。',
    },
    {
      title: '發現優秀低碳實踐',
      text: '表彰具有示範價值的企業、個人與低碳成果。',
    },
    {
      title: '沉澱優秀實踐成果',
      text: '匯集優秀案例，推動低碳經驗複製推廣。',
    },
    {
      title: '推動供應鏈協同減碳',
      text: '促進上下游企業開展碳數據協同與減排行動。',
    },
    {
      title: '服務企業綠色發展',
      text: '為ESG披露、綠色採購與品牌溝通提供支持。',
    },
    {
      title: '共建綠色低碳生態',
      text: '匯聚政策、產業、學術及社會多方力量。',
    },
  ],
  mechanism: '比賽機制',
  mechanismHint:
    '大賽採用 CREOS 五維評價體系，圍繞量化碳排放、碳減排方案、價值鏈帶動、高質量抵消及披露傳播，對參賽成果進行專業評價。',
  rulesPending: '完整比賽規則待公布。',
  fullRules: '查看完整比賽規則',
  stages: '賽事階段',
  preliminary: '初賽｜C + E',
  preliminaryNote: '（初賽暨個人組決賽）',
  preliminaryHint: '完成產品碳足跡、企業碳盤查及低碳打卡任務。',
  final: '決賽｜R + O + S',
  finalHint:
    '入圍企業提交減排、抵消及披露與傳播方案，由主辦方組織專家團隊開展評審與答辯。',
  dimensions: [
    {
      title: '量化碳排放',
      text: '完成產品碳足跡和企業碳盤查，開啟碳管理第一步。',
    },
    {
      title: '碳減排方案',
      text: '制定科學合理、可實現的減排路徑。',
    },
    {
      title: '價值鏈帶動',
      text: '參與碳帳戶打卡，帶動企業員工、上下游生態夥伴共同減排。',
    },
    {
      title: '高質量抵消',
      text: '針對不可避免的碳排放，合理規劃高質量碳信用抵消方案。',
    },
    {
      title: '披露與傳播',
      text: '傳播與披露碳管理成果，提升可持續影響力。',
    },
  ],
  awards: '大賽獎項',
  awardNotice: '最終獎項設置、評選標準及參賽權益以正式賽事規則為準。',
  enterpriseAwards: [
    '聯合國氣候變化大會COP32藍區名額',
    'SGS/CEC認證服務',
    '《世界環境》雜誌企業專欄',
    'Carbon Agent 年度會員',
    '商道ESG學堂培訓名額',
    '碳中和資料庫會員',
    '優秀案例集與向光獎推薦',
    '榮譽獎盃與證書',
  ],
  individualAwards: [
    '萬元現金大獎',
    'Carbon Agent年度會員',
    '賽事榮譽證書',
    '碳阻跡實習推薦機會（限學生）',
    '低碳英雄購物券',
  ],
  contributionAward: '特別貢獻獎',
  contributionAwardHint:
    '表彰在實際減排、綠色創新及帶動更多人參與低碳行動方面作出突出貢獻的企業與個人。',
  moreBenefits: '更多參賽權益',
  benefitsHint:
    '參賽者可享賽前專業培訓及 Carbon Agent 會員權益，付費用戶可獲贈 1,000 積分。',
  timeline: '大賽時間線',
  timelineHint: '具體安排以大賽官方通知為準。',
  schedulePending: '賽程待公佈',
  partners: '大賽組織單位與專家團隊',
  timelineNodes: {
    registrationOpen: {
      title: '報名開啟',
      description: '企業組、個人組開放報名，{deadline}截止。',
    },
    training: {
      title: '賽前培訓',
      description: '講解比賽規則、碳核算方法及 Carbon Agent 使用操作。',
    },
    registrationClose: {
      title: '報名截止',
      description: '報名通道正式關閉。',
    },
    product: {
      title: '初賽：產品碳足跡',
      description: '完成產品碳足跡核算並提交結果，同時參與碳帳戶打卡。',
    },
    enterprise: {
      title: '初賽：企業碳盤查',
      description: '完成企業碳排放核算並提交結果，繼續參與碳帳戶打卡。',
    },
    review: {
      title: '初賽評審',
      description: '開展初賽評審，核定晉級決賽名單。',
    },
    preliminary: {
      title: '初賽入圍名單公布',
      description: '正式公布晉級決賽企業名單及個人賽排名。',
    },
    final: {
      title: '決賽準備與答辯',
      description: '入圍企業完善減排、抵消及成果展示材料，參加線上決賽答辯。',
    },
    results: {
      title: '最終結果公示',
      description: '公佈獲獎名單，展示優秀參賽成果。',
    },
  },
  phaseNames: {
    REGISTRATION: '報名階段',
    INVITATION: '邀請階段',
    ACCOUNT_REGISTRATION: '賬號註冊',
    C_PRODUCT: '初賽：產品碳足跡',
    C_ENTERPRISE: '初賽：企業碳盤查',
    E_CHECKIN: '低碳打卡',
    PRELIMINARY: '初賽評審與公示',
    FINAL: '決賽',
    RESULTS: '結果公示',
  },

  benefitOpening: '參賽權益開通中，請留意通知。',

  benefitOpened: '參賽權益已開通。',

  benefitPending: '參賽權益待處理，請在報名管理中查看狀態。',

  individualSuccessTitle: '個人組報名成功！',

  invitationBack: '返回選擇',

  memberViewHint: '請確認所有組員均完成註冊報名',

  copyPersonalInvite: '複製我的邀請鏈接',

  submitTeam: '確認提交組隊',

  saveMemberChanges: '保存成員變更',

  registerEnterprise: '報名企業組',

  registerIndividual: '報名個人組',

  teamRequirements: '組隊要求',

  teamRequirementsHint:
    '每家企業僅可組建 1 支隊伍，至少 3 人、最多 10 人，所有組員須為本企業員工。',

  individualRequirements: '參賽要求',

  individualRequirementsHint:
    '無需組隊，登入 Carbon Agent 並填寫本人聯絡手機號即可報名。',

  awardsHint:
    '企業組與個人組分別設置金、銀、銅獎，優秀參賽者有機會獲得賽事榮譽及專屬權益。',

  welcomeTitle: '首屆中國企業碳管理大賽正式開啓！',

  welcomeSubtitle: '報名參賽即享專屬權益，更有機會贏取',

  welcomeAwardsTitle: '萬元現金大獎！',

  welcomeAwardsHint: '雙賽道分別設置金銀銅獎，還有賽事榮譽證書！',

  welcomeBenefitsTitle: '報名參賽享專屬福利',

  welcomeBenefitsHint:
    '非付費用戶贈送一個月個人版套餐；付費用戶贈送 1,000 積分，有效期一個月。',

  welcomeInviteHint: '邀請好友完成有效報名，個人得分系數最高增加 10%。',

  welcomeRegister: '立即加入',

  welcomeDetails: '瞭解大賽',

  invitationPending: '待生效',
  invitationBonusCapped: '已達上限',
  invitationReviewPending: '待核驗',
};
