export default {
  leaderboard: {
    selfCompany: '{name}（本企业）',
    namePhone: '{name}（{phone}）',
    title: '低碳打卡排行榜',
    back: '返回打卡任务',
    teamRank: '企业排名',
    personalRank: '个人排名',
    myCoins: '我的累计碳币',
    searchPerson: '搜索姓名或手机号后四位',
    searchTeam: '搜索企业名称',
    selfName: '{name}（我）',
    scoreValue: '{value} 分',
    pendingScore: '待核验',
    vacant: '暂无上榜选手',
    noRank: '暂无有效打卡排名',
    coins: '碳币',
    people: '打卡人数：{count} 人',
    eScore: 'E 阶段 {score}',
    phone: '手机号',
    track: '参赛组别',
    company: '所属企业',
    myTeam: '（本企业）',
    eStage: 'E 阶段得分',
    total: '共 {count} 条数据',
    noResults: '暂无符合条件的排名',
  },
  modelErrors: {
    MODEL_DATA_INCOMPLETE:
      '该模型暂时无法读取有效核算结果，请回到原核算检查结果并重新核算，或选择其他已完成的模型。',
    CALCULATION_INCOMPLETE:
      '该模型尚未完成核算，或正在重新计算。请完成核算后重新选择。',
    SOURCE_VERSION_CHANGED:
      '模型已发生变化，请重新选择并核对最新结果后再保存或提交。',
  },
  resultErrors: {
    RESULT_SESSION_UNAVAILABLE:
      '未找到可访问的核算对话或分享，请到对话列表查看原核算。',
    RESULT_SHARE_UNAVAILABLE:
      '该成员尚未开启结果分享，或分享已失效，请联系该成员。',
    SNAPSHOT_NOT_READY: '核算结果尚未提交完成，请稍后刷新。',
    FORBIDDEN: '无权查看此核算结果。',
  },
  rankLabel: '排名',
  modelLabel: '选择核算模型',
  modelHint:
    '请选择已完成核算的模型。确认提交后，将保存固定结果用于评审，内容不可修改。',

  captainBadge: '仅组长提交',
  enterpriseBadge: '仅企业组开放',
  modelTools: '使用核算结果分享链接',
  modelSearchPlaceholder: '输入模型名称搜索',
  checkinTitle: '参与低碳打卡，积累碳币',
  topFive: '低碳打卡 TOP 5',

  deadlineHint:
    '请在各项任务截止前完成提交。确认提交后，内容将被锁定，无法修改。',
  active: '进行中',
  selected: '当前查看模块',
  enterpriseOnly: '个人组无需提交',
  captainOnly: '本阶段材料由企业组组长统一提交，组员可查看已提交内容。',
  qualification:
    '本阶段材料提交暂未开放，将于初赛入围名单公布后向晋级决赛的企业组开放。',
  submission: '任务提交',
  progress: '状态查看',
  C: '量化碳排放',
  R: '碳减排方案',
  E: '价值链带动',
  O: '高质量抵消',
  S: '披露与传播',
  CDesc: '完成产品碳足迹与企业碳盘查任务，提交 Carbon Agent 核算结果。',
  RDesc: '分析主要排放环节，制定有针对性的减排措施。',
  EDesc: '参与碳账户打卡，积累个人碳币，助力本队低碳行动。',
  ODesc: '评估剩余碳排放，提出合理的碳抵消方案。',
  SDesc: '总结碳管理成果，分享优秀低碳实践经验。',
  product: '任务一：产品碳足迹核算',
  enterprise: '任务二：企业碳盘查核算',
  schedule: '任务提交时间：{start} — {end}',
  release: '考题开放下载：{time}',
  downloadEventClosed: '赛事当前未开放，暂不能下载赛题。',
  downloadTaskClosed: '本任务暂未开放，请关注赛事通知。',
  downloadSchedulePending: '本任务赛程尚未确认，暂不能下载赛题。',
  downloadReleasePending: '发题时间尚未公布，请关注赛事通知。',
  downloadNotReleased: '赛题尚未开放，将于 {time} 开放下载。',
  downloadChooseStandard: '请先选择统一赛题，完成分配后即可下载。',
  downloadNotAssigned:
    '尚未取得可下载的赛题，请重新加载；若仍不可用，请联系赛事运营。',
  organizer: '使用大赛统一赛题',
  own: '使用企业自有数据',
  summary: '方案摘要',
  summaryHint:
    '请简要说明企业选定的核算产品及企业信息，并概述减排、抵消和传播方案的亮点。',
  files: '方案附件',
  fileHint: '支持 PDF、PPTX、Word、PNG、JPG，单个文件不超过 50MB',
  confirm: '确认提交本阶段材料？提交后将保存为决赛评审依据，内容不可修改。',
  readonly: '本阶段材料已提交，内容不可修改。',
  empty: '暂无已提交材料',
  tooLarge: '单个附件不能超过 50MB',
  loading: '正在加载任务',
  failed: '任务加载失败，请重试',
  role: '当前身份：{role}',
  finalTitle: '决赛准备阶段材料上传',
  summaryRequired: '请填写方案摘要',
  statusTitle: '任务状态',
  fileExpired: '附件上传凭据已失效或不属于当前任务，请重新上传',
  versionConflict: '任务已更新，请刷新后核对最新内容',
  phaseClosed: '当前不在提交时间内',
  notStarted: '待提交',
  paperExhausted: '暂无可分配的标准赛题，请联系赛事运营补充题目后重试。',
  checkinNotOpen: '低碳打卡尚未开放，具体时间请关注赛事通知。',

  individualOrganizer: '使用个人组统一赛题',

  partial: '部分完成',

  completed: '已完成',

  notOpen: '未开始',

  submittedHint:
    '材料提交成功！查看结果将打开原核算对话或分享；评审仍以提交时保存的结果为准。',

  finalDeadlineHint:
    '请在规定时间内完成决赛材料提交。确认提交后，内容不可修改，逾期将关闭提交入口。',

  finalForms: {
    R: {
      title: '决赛任务一：碳减排方案',
      label: '减排方案说明',
      placeholder:
        '请简要说明企业选定的核算产品及企业信息，并概述减排、抵消和传播方案的亮点。',
      upload: '上传减排方案附件',
    },
    O: {
      title: '决赛任务二：碳抵消方案',
      label: '碳抵消方案说明',
      placeholder:
        '请简要说明企业选定的核算产品及企业信息，并概述减排、抵消和传播方案的亮点。',
      upload: '上传碳抵消方案附件',
    },
    S: {
      title: '决赛任务三：碳管理成果展示',
      label: '成果展示说明',
      placeholder:
        '请简要说明企业选定的核算产品及企业信息，并概述减排、抵消和传播方案的亮点。',
      upload: '上传成果展示附件',
    },
  },
};
