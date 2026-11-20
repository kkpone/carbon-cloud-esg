import awardDetails from './competitionAwards';
import partnerSection from './competitionPartners';
import rules from './competitionRules';
import legal from './competitionLegal';

export default {
  phoneVerificationRequired:
    '请先在账号设置中绑定与报名一致的手机号，再重试关联碳账户。',
  registrationMobileLocked:
    '报名手机号已保存，不能在此修改；如需更正请联系赛事工作人员。',
  registrationMobileHint:
    '用于赛事联系。邮箱账号无需提前绑定手机号；自动关联已有名册或碳账户时需验证手机号归属。',
  registrationMobileInvalid: '请输入有效的11位手机号',
  registrationMobileRequired: '请输入本人联系手机号',
  bannerTitle: '首届中国企业碳管理大赛',
  bannerEnglishTitle: '2026 China Carbon Management Award',
  bannerDescription:
    '以真实碳管理任务为核心，AI赋能专业实践，共同探索绿色发展新路径。',
  bannerHighlights: [
    { title: '双赛道', description: '企业与个人' },
    { title: '万元', description: '现金大奖' },
    { title: 'Carbon Agent', description: '参赛权益' },
  ],

  invitationLead: '邀请您参加',
  invitationCompetitionTitle: '首届中国企业碳管理大赛！',
  invitationIndependentBadge: '自主报名',
  invitationContinue: '确认选择',

  enterpriseDuplicate:
    '该企业已有参赛队伍。每家企业仅可组建一支队伍，请联系企业内部参赛负责人；如需帮助，可联系大赛小助手。',
  registrationDeadlineLabel: '报名截止时间（北京时间）：{date}',
  taskDraft: '草稿未提交',

  partnerSection,
  awardDetails,
  rules,
  legal,
  trackLabel: '参赛组别',
  trackNotSelected: '未选择',
  participationInfo: '个人参赛信息',
  participantAccount: '参赛账号',
  individualRegistered: '报名成功',
  reviewPendingTitle: '正在审核中',
  reviewRejectedTitle: '审核未通过',
  reviewApprovedHint: '企业资质审核已通过！请继续添加参赛组员，完成报名。',
  editInformation: '修改信息',
  refreshStatus: '刷新状态',
  inviteFriends: '邀请好友参赛',
  personalInviteHint:
    '每成功邀请 1 位新参赛者完成报名，可获得 2% 个人得分加成，累计最高 10%。',
  inviteRecordCount: '共 {count} 条',
  noInvites: '还没有邀请记录，邀请好友一起参赛吧。',
  invitee: '受邀人',
  enrollmentStatus: '报名状态',
  notRegistered: '未完成报名',
  inviteTeamPending: '审核通过，待组队',
  inviteTeamPendingBonus: '团队完成报名后，符合规则的邀请才计入加成。',
  removedCanRegister:
    '你已被移出原参赛团队，可在报名截止前选择个人报名或创建自己的企业参赛团队。',
  memberOtherTeam: '该手机号已加入其他企业参赛队伍，无法添加到本队。',
  memberIndividualRegistered: '该手机号已报名个人赛，不能重复加入企业队伍。',
  memberAlreadyInTeam: '该手机号已在本队名册中，无需重复添加。',
  memberRemovedOtherTeam:
    '该成员已被原队移除，请由本人选择个人报名或创建企业，不能直接添加到其他队伍。',
  notCounted: '未计入',
  individualSuccessHint:
    '您已成功报名个人组！请前往「我的参赛任务」查看比赛任务。',

  individualAccountHint: '请填写本人联系手机号，邮箱账号也可直接报名。',
  individualConfirm: '确认报名',

  invitationEmployeeTitle: '确认加入【{team}】参赛团队？',
  invitationEmployeeHint:
    '企业组仅限本企业员工参加。请确认您属于该企业，并填写本人联系手机号。加入后，您将参与企业组比赛，同时自动参与个人排名，无需重复报名。',
  invitationDeadline: '最晚添加时间为 {date}。',
  invitationConfirm: '确认加入',

  invitationUnavailable:
    '邀请人的队伍暂不可加入（未通过审核、已满员或已截止）。报名开放时仍可独立报名参赛。',
  invitationBadge: '全链减碳 · 共创零碳未来',
  invitationTitle: '{name} 邀请您参加首届中国企业碳管理大赛！',
  invitationDescription:
    '企业组、个人组均可报名，通过碳管理实战任务提升专业能力，还有机会获得赛事奖项与参赛专属权益。通过专属链接完成有效报名，还可助力邀请人获得个人得分加成！',
  invitationAccept: '立即加入',
  invitationLater: '了解大赛',
  invitationChoose: '请选择您的参赛方式',
  invitationJoin: '加入邀请人的企业团队',
  invitationJoinHint:
    '适用于该企业员工，加入现有团队，共同完成企业组比赛任务。',
  invitationIndependent: '独立报名参赛',
  invitationIndependentHint: '可创建本企业参赛团队，或选择个人组独立参赛。',

  registrationDetails: '报名权益与邀请记录',
  membersStep: '成员管理',
  membersTitle: '参赛小组成员管理（3–10人）',
  membersHint: '请确认所有组员均完成注册报名',
  membersCount: '成员 {count} / 10',
  accountStatus: '注册状态',
  accountRegistered: '已注册',
  accountUnregistered: '未注册',
  accountChecking: '校验中',
  accountUnchecked: '待校验',
  memberInvalid: '请输入真实姓名和有效的11位手机号。',
  memberConflict: '该手机号已参赛，无法重复添加。',
  memberCheckFailed: '暂时无法校验该成员，请稍后点击“重新校验”。',
  duplicateMobile: '同一队伍不能重复添加同一手机号。',
  inviter: '邀请人',
  inviteBonus: '邀请加成',
  memberPersonalBonus: '个人加成',
  memberPersonalBonusHint:
    '仅按该成员本人的有效邀请计算，每人增加 2% 个人组成绩加成，最高 10%；达到上限后继续邀请不再增加加成。',
  currentTeamBonus: '当前团队加成：',
  currentTeamBonusHint:
    '按已报名团队的有效入册注册人数计算，超过 5 人后每增加 1 人加成 2%，最高 10%。未保存的成员调整暂不计入。',
  inviteBannerTitle: '邀请好友，一起参与碳管理实践',
  inviteBannerHint: '邀请更多人参与大赛，成功报名即可赢得额外加分。',
  copyInvite: '复制专属邀请链接',
  addMember: '添加组员（最多10人）',
  captainRole: '组长',
  memberRole: '组员',
  confirmTeamTitle: '确认提交参赛小组信息？',
  confirmTeamHint:
    '请确认组员姓名及手机号填写正确。提交后即完成企业组报名；报名截止前仍可添加、修改或删除组员，并继续邀请好友参赛。',
  confirmTeamNotice: '请提醒组员使用报名手机号注册 Carbon Agent。',
  registrationSuccess: '企业组报名成功！',
  registrationSuccessHint:
    '您的参赛小组已提交成功！请提醒尚未注册的组员使用报名手机号完成 Carbon Agent 注册。报名截止前仍可调整组员信息；邀请截止前可继续邀请好友参赛。',
  qualificationSubmitted: '企业信息已提交！',
  qualificationSubmittedHint:
    '我们正在审核您的企业资料，预计48小时内反馈审核结果。审核通过后，即可继续添加参赛组员。',
  understood: '我知道了',
  confirmAction: '确认提交',
  minimumMembers: '至少填写3名成员（含组长）并完成校验后，才能提交报名。',
  checkAgain: '重新校验',
  nameFor: '第 {index} 位成员姓名',
  phoneFor: '第 {index} 位成员手机号',
  saveRoster: '保存名册草稿',
  registrationComplete: '组队已提交',

  hot: 'Hot',
  title: '中国企业碳管理大赛',
  backHome: '返回大赛首页',
  intro: '大赛介绍',
  register: '报名管理',
  tasks: '我的参赛任务',
  results: '大赛结果',
  chooseTrack: '选择您的参赛组别',
  chooseTrackHint: '大赛设企业组和个人组两个赛道，请根据您的参赛身份选择。',
  enterprise: '企业组',
  individual: '个人组',
  enterpriseSize: '3–10人组队参赛',
  individualSize: '1 人独立参赛',
  audience: '适合对象',
  method: '核算方式',
  individualTaskLabel: '比赛任务',
  task: '参赛任务',
  registerNow: '立即报名',
  enterpriseAudience: '不限制行业，企业内部组队',
  individualAudience:
    '高校学生、碳管理及咨询行业从业者，以及对碳管理感兴趣的社会人士。',
  enterpriseMethod: '可使用企业真实数据，或选择主办方统一赛题。',
  individualMethod: '使用主办方提供的个人组统一赛题。',
  enterpriseTask:
    '完成产品碳足迹、企业碳盘查及碳账户打卡；入围决赛后进一步展示减排方案、碳抵消方案和传播与披露方案。',
  individualTask:
    '通过 Carbon Agent 完成指定产品碳足迹与企业碳盘查任务，并参与碳账户打卡。',
  trackNoticeLabel: '特别说明：{notice}',
  trackNotice:
    '企业组成员将自动纳入个人组排名，无需重复报名；已报名个人组的选手不得再加入企业组。',
  profile: '参赛人信息',
  companyInfo: '企业信息填写',
  companyHint:
    '请填写真实、准确的企业信息，提交后将由大赛工作人员进行审核。审核通过后，即可添加参赛组员。',
  companyPlaceholder: '请输入营业执照上的企业全称',
  creditPlaceholder: '请输入营业执照上的18位统一社会信用代码',
  creditInvalid:
    '统一社会信用代码应为18位字母或数字，请核对营业执照后重新输入。',
  namePlaceholder: '请输入参赛人的真实姓名',
  next: '下一步',
  previous: '返回',
  uploadImage: '上传图片',
  reupload: '重新上传',
  deleteFile: '删除',
  removeMemberTitle: '确认删除该成员？',
  removeMemberHint: '删除后，该成员将从当前名册中移除。',
  fileSize: '文件大小：{size}',
  fileHint: '支持 PDF、JPG、PNG 格式，文件不超过 10MB',
  logoHint: '建议上传清晰的 PNG 图片',
  logoTooltip:
    '企业 Logo 将用于参赛身份识别及大赛物料制作，提交即表示同意主办方在上述范围内使用。',
  fileInvalid: '请上传支持的文件格式，且文件大小不超过 10MB。',
  uploaded: '已上传',
  preview: '查看文件',
  reviewPending: '企业信息已提交，正在进行资质审核，请留意审核结果。',
  reviewApproved: '审核通过',
  reviewRejected:
    '企业资质审核未通过，请按驳回原因修改后重新提交。如需帮助，可联系大赛小助手。',
  groupHint: '获取赛事通知、培训资料和参赛答疑。',
  assistantHint: '报名组队、赛事规则及任务提交问题咨询。',
  contact: '参赛服务入口',
  qrPending: '二维码待公布',
  goalsTitle: '大赛目标',
  goalsHint:
    '以真实任务为基础，以专业评价为支撑，推动碳管理能力建设、优秀实践推广与产业协同减碳。',
  background: [
    '全球气候风险持续加剧，碳管理正从环境议题转变为影响企业贸易准入、供应链合作、绿色采购、ESG评价和品牌竞争力的重要经营能力。',
    '随着我国“双碳”政策、全国碳市场和产品碳足迹管理体系不断完善，企业面临的核心问题已从“是否开展碳管理”转向“能否算得清、减得实、带得动、讲得明”。',
    '但目前不少企业仍存在数据基础薄弱、核算口径不统一、减排行动与经营脱节、供应链协同不足等问题。',
    '因此，本项目拟搭建全国性碳管理实战平台，通过真实任务、专业评价和案例传播，发现并表彰优秀企业与低碳实践，沉淀可复制的中国企业气候转型经验，推动企业建立系统、可信、持续的碳管理能力。',
  ],
  goals: [
    {
      title: '建立专业评价体系',
      text: '覆盖碳核算、减排、带动、抵消与传播。',
    },
    {
      title: '发现优秀低碳实践',
      text: '表彰具有示范价值的企业、个人与低碳成果。',
    },
    {
      title: '沉淀优秀实践成果',
      text: '汇集优秀案例，推动低碳经验复制推广。',
    },
    {
      title: '推动供应链协同减碳',
      text: '促进上下游企业开展碳数据协同与减排行动。',
    },
    {
      title: '服务企业绿色发展',
      text: '为ESG披露、绿色采购与品牌沟通提供支持。',
    },
    {
      title: '共建绿色低碳生态',
      text: '汇聚政策、产业、学术及社会多方力量。',
    },
  ],
  mechanism: '比赛机制',
  mechanismHint:
    '大赛采用 CREOS 五维评价体系，围绕量化碳排放、碳减排方案、价值链带动、高质量抵消及披露传播，对参赛成果进行专业评价。',
  rulesPending: '完整比赛规则待公布。',
  fullRules: '查看完整比赛规则',
  stages: '赛事阶段',
  preliminary: '初赛｜C + E',
  preliminaryNote: '（初赛暨个人组决赛）',
  preliminaryHint: '完成产品碳足迹、企业碳盘查及低碳打卡任务。',
  final: '决赛｜R + O + S',
  finalHint:
    '入围企业提交减排、抵消及披露与传播方案，由主办方组织专家团队开展评审与答辩。',
  dimensions: [
    {
      title: '量化碳排放',
      text: '完成产品碳足迹和企业碳盘查，开启碳管理第一步。',
    },
    {
      title: '碳减排方案',
      text: '制定科学合理、可实现的减排路径。',
    },
    {
      title: '价值链带动',
      text: '参与碳账户打卡，带动企业员工、上下游生态伙伴共同减排。',
    },
    {
      title: '高质量抵消',
      text: '针对不可避免的碳排放，合理规划高质量碳信用抵消方案。',
    },
    {
      title: '披露与传播',
      text: '传播与披露碳管理成果，提升可持续影响力。',
    },
  ],
  awards: '大赛奖项',
  awardNotice: '最终奖项设置、评选标准及参赛权益以正式赛事规则为准。',
  enterpriseAwards: [
    '联合国气候变化大会COP32蓝区名额',
    'SGS/CEC认证服务',
    '《世界环境》杂志企业专栏',
    'Carbon Agent 年度会员',
    '商道ESG学堂培训名额',
    '碳中和资料库会员',
    '优秀案例集与向光奖推荐',
    '荣誉奖杯与证书',
  ],
  individualAwards: [
    '万元现金大奖',
    'Carbon Agent年度会员',
    '赛事荣誉证书',
    '碳阻迹实习推荐机会（限学生）',
    '低碳英雄购物券',
  ],
  contributionAward: '特别贡献奖',
  contributionAwardHint:
    '表彰在实际减排、绿色创新及带动更多人参与低碳行动方面作出突出贡献的企业与个人。',
  moreBenefits: '更多参赛权益',
  benefitsHint:
    '参赛者可享赛前专业培训及 Carbon Agent 会员权益，付费用户可获赠 1,000 积分。',
  timeline: '大赛时间线',
  timelineHint: '具体安排以大赛官方通知为准。',
  schedulePending: '赛程待公布',
  partners: '大赛组织单位与专家团队',
  timelineNodes: {
    registrationOpen: {
      title: '报名开启',
      description: '企业组、个人组开放报名，{deadline}截止。',
    },
    training: {
      title: '赛前培训',
      description: '讲解比赛规则、碳核算方法及 Carbon Agent 使用操作。',
    },
    registrationClose: {
      title: '报名截止',
      description: '报名通道正式关闭。',
    },
    product: {
      title: '初赛：产品碳足迹',
      description: '完成产品碳足迹核算并提交结果，同时参与碳账户打卡。',
    },
    enterprise: {
      title: '初赛：企业碳盘查',
      description: '完成企业碳排放核算并提交结果，继续参与碳账户打卡。',
    },
    review: {
      title: '初赛评审',
      description: '开展初赛评审，核定晋级决赛名单。',
    },
    preliminary: {
      title: '初赛入围名单公布',
      description: '正式公布晋级决赛企业名单及个人赛排名。',
    },
    final: {
      title: '决赛准备与答辩',
      description: '入围企业完善减排、抵消及成果展示材料，参加线上决赛答辩。',
    },
    results: {
      title: '最终结果公示',
      description: '公布获奖名单，展示优秀参赛成果。',
    },
  },
  phaseNames: {
    REGISTRATION: '报名阶段',
    INVITATION: '邀请阶段',
    ACCOUNT_REGISTRATION: '账号注册',
    C_PRODUCT: '初赛：产品碳足迹',
    C_ENTERPRISE: '初赛：企业碳盘查',
    E_CHECKIN: '低碳打卡',
    PRELIMINARY: '初赛评审与公示',
    FINAL: '决赛',
    RESULTS: '结果公示',
  },

  benefitOpening: '参赛权益开通中，请留意通知。',

  benefitOpened: '参赛权益已开通。',

  benefitPending: '参赛权益待处理，请在报名管理中查看状态。',

  individualSuccessTitle: '个人组报名成功！',

  invitationBack: '返回选择',

  memberViewHint: '请确认所有组员均完成注册报名',

  copyPersonalInvite: '复制我的邀请链接',

  submitTeam: '确认提交组队',

  saveMemberChanges: '保存成员变更',

  registerEnterprise: '报名企业组',

  registerIndividual: '报名个人组',

  teamRequirements: '组队要求',

  teamRequirementsHint:
    '每家企业仅可组建 1 支队伍，至少 3 人、最多 10 人，所有组员须为本企业员工。',

  individualRequirements: '参赛要求',

  individualRequirementsHint:
    '无需组队，登录 Carbon Agent 并填写本人联系手机号即可报名。',

  awardsHint:
    '企业组与个人组分别设置金、银、铜奖，优秀参赛者有机会获得赛事荣誉及专属权益。',

  welcomeTitle: '首届中国企业碳管理大赛正式开启！',

  welcomeSubtitle: '报名参赛即享专属权益，更有机会赢取',

  welcomeAwardsTitle: '万元现金大奖！',

  welcomeAwardsHint: '双赛道分别设置金银铜奖，还有赛事荣誉证书！',

  welcomeBenefitsTitle: '报名参赛享专属福利',

  welcomeBenefitsHint:
    '非付费用户赠送一个月个人版套餐；付费用户赠送 1,000 积分，有效期一个月。',

  welcomeInviteHint: '邀请好友完成有效报名，个人得分系数最高增加 10%。',

  welcomeRegister: '立即加入',

  welcomeDetails: '了解大赛',

  invitationPending: '待生效',
  invitationBonusCapped: '已达上限',
  invitationReviewPending: '待核验',
};
