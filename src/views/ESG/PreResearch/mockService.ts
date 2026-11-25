import dayjs from 'dayjs';

import {
  DepartmentDutyItem,
  GapDiagnosisItem,
  HighlightCaseItem,
  InterviewQuestionItem,
  PeerBenchmarkRow,
  PeerCompanyItem,
  PreResearchProject,
} from './types';

const STORAGE_KEY = 'esg_pre_research_projects_v1';

export const DEFAULT_STANDARD_OPTIONS = [
  '沪深北交易所《可持续发展报告指引》',
  '港交所《ESG报告守则》',
  'GRI Standards',
  'ISSB (IFRS S1/S2)',
  '欧盟 CSRD',
];

export const DEFAULT_RATING_OPTIONS = [
  'MSCI',
  'S&P CSA',
  'EcoVadis',
  'Wind ESG',
];

export const DEFAULT_DEPARTMENTS: DepartmentDutyItem[] = [
  {
    id: 'dept-ehs',
    deptCode: 'EHS',
    deptName: 'EHS安环部',
    pillars: ['E', 'S'],
    topics: ['应对气候变化', '能源管理', '三废与循环经济', '职业健康与安全'],
    dutySummary:
      '双碳排放统计、能源与水耗台账、环保技改、危废合规处置、安全生产与工伤台账',
    contactRole: '安环总监 / 能源主管',
  },
  {
    id: 'dept-pur',
    deptCode: 'PUR',
    deptName: '采购与供应链部',
    pillars: ['S', 'E'],
    topics: ['可持续供应链', '范围三采购排放'],
    dutySummary:
      '供应商ESG准入、行为准则签署率、现场EHS稽核、绿色包装与物流降碳',
    contactRole: '供应链管理经理',
  },
  {
    id: 'dept-board',
    deptCode: 'SEC',
    deptName: '董事会办公室（证券部）',
    pillars: ['G'],
    topics: ['公司治理架构', 'ESG管治体系', '信息披露与投关'],
    dutySummary:
      '董事会及ESG专门委员会履职记录、独立性与多元化、投资者交流、三重一大决策',
    contactRole: '董秘办主任',
  },
  {
    id: 'dept-hr',
    deptCode: 'HR',
    deptName: '人力资源部',
    pillars: ['S', 'G'],
    topics: ['员工雇佣与权益', '员工培训与发展', '高管ESG薪酬挂钩'],
    dutySummary:
      '员工结构与流失率、劳动合同签订率、分层培训学时、高管KPI中ESG权重核实',
    contactRole: 'HRBP负责人',
  },
  {
    id: 'dept-rd',
    deptCode: 'RD',
    deptName: '研发中心',
    pillars: ['S', 'E'],
    topics: ['研发创新与专利', '产品碳足迹'],
    dutySummary:
      '绿色低碳工艺研发投入占比、有效专利数量、主力产品全生命周期碳足迹核算',
    contactRole: '研发管理部经理',
  },
  {
    id: 'dept-qa',
    deptCode: 'QA',
    deptName: '质量与合规部',
    pillars: ['S', 'G'],
    topics: ['产品质量与安全', '商业道德与反腐败'],
    dutySummary:
      'ISO9001认证覆盖率、产品召回与客诉闭环、反商业贿赂培训及举报人保护机制',
    contactRole: '质量法务负责人',
  },
];

const buildSamplePeers = (): PeerCompanyItem[] => [
  {
    id: 'peer-a',
    name: '行业龙头A（A+H股）',
    tag: '行业龙头·A+H股',
    listingMarket: 'A+H股',
    ratingSummary: 'MSCI AA / CSA 68分',
    reportFileName: '标杆A_2025年度ESG报告.pdf',
    selected: true,
  },
  {
    id: 'peer-b',
    name: '直接竞对B（A股）',
    tag: '直接竞对·A股',
    listingMarket: '上交所主板',
    ratingSummary: 'Wind AA / EcoVadis 银牌',
    reportFileName: '标杆B_2025可持续发展报告.pdf',
    selected: true,
  },
  {
    id: 'peer-c',
    name: '出海标杆C（科创板）',
    tag: '出海标杆·科创板',
    listingMarket: '科创板',
    ratingSummary: 'MSCI A / EcoVadis 金牌',
    reportFileName: '标杆C_2025ESG及气候报告.pdf',
    selected: true,
  },
];

export const buildGeneratedGaps = (
  project: Pick<
    PreResearchProject,
    'companyName' | 'standards' | 'ratings' | 'departments'
  >,
): GapDiagnosisItem[] => {
  const primaryStd =
    project.standards[0] || '沪深北交易所《可持续发展报告指引》';
  const ratingTag =
    project.ratings.slice(0, 2).join(' / ') || 'MSCI / EcoVadis';
  const hasDept = (kw: string, fallback: string) =>
    project.departments.find(d => d.deptName.includes(kw))?.deptName ||
    fallback;

  return [
    {
      gap_id: 'GAP-E-01',
      esg_pillar: 'E',
      topic_name: '应对气候变化',
      standard_source: `${primaryStd} · 第22条 / ${ratingTag}`,
      requirement_type: '强制披露',
      requirement_detail:
        '识别气候变化物理风险与转型风险，并定性或定量评估其对公司财务状况（营收/成本）的影响',
      client_status: 'partial',
      evidence_ref:
        '上年报告 P28：仅泛泛提及“关注碳达峰政策”，未列示具体风险清单及财务传导',
      gap_description:
        '缺少物理风险（极端天气停产）与转型风险（欧盟CBAM碳关税）的分类识别矩阵及财务传导分析',
      priority: 'P0',
      action_suggestion:
        '访谈战略/外贸与EHS部，补充《气候风险与机遇矩阵表》，针对欧洲出口产品定性评估CBAM成本影响',
      owner_dept: `${hasDept('EHS', 'EHS安环部')}、${hasDept(
        '研发',
        '战略与外贸部',
      )}`,
      selectedForInterview: true,
    },
    {
      gap_id: 'GAP-E-02',
      esg_pillar: 'E',
      topic_name: '温室气体排放与绿电',
      standard_source: `${primaryStd} · 第25条 / EcoVadis`,
      requirement_type: '强制披露',
      requirement_detail:
        '披露范围一、范围二排放及核算标准与因子来源；披露范围三关键类别、绿电占比与定量减排目标',
      client_status: 'partial',
      evidence_ref:
        '上年报告 P31：披露了范围一/二排放总量，但未写明排放因子版本，且未披露范围三与绿电占比',
      gap_description:
        '缺少核算边界与因子来源说明；海外客户与EcoVadis审核高度关注范围三（外购原料与上游物流）及绿电比例',
      priority: 'P0',
      action_suggestion:
        '本年补充方法学说明；访谈核实各基地光伏及绿电采购量，启动范围三类别1与类别4盘查',
      owner_dept: `${hasDept('EHS', 'EHS安环部')}、${hasDept(
        '采购',
        '采购与供应链部',
      )}`,
      selectedForInterview: true,
    },
    {
      gap_id: 'GAP-E-03',
      esg_pillar: 'E',
      topic_name: '水资源与三废合规',
      standard_source: 'GRI 303 / 306 / MSCI',
      requirement_type: '评级高权重',
      requirement_detail:
        '披露总取水量、循环用水率、危险废物产生及合规委外处置量与减量技改成果',
      client_status: 'compliant',
      evidence_ref:
        '上年报告 P35-P37：已连续两年披露取水总量与危废处置台账，口径完整',
      gap_description:
        '基础数据完备，但缺少中水回用技改投资额与单位产值水耗同比变化说明',
      priority: 'P2',
      action_suggestion: '补充年度节水技改投入与单位产值水耗趋势对比表',
      owner_dept: hasDept('EHS', 'EHS安环部'),
      selectedForInterview: false,
    },
    {
      gap_id: 'GAP-S-01',
      esg_pillar: 'S',
      topic_name: '可持续供应链',
      standard_source: `${primaryStd} · 第47条 / EcoVadis / CSA`,
      requirement_type: '评级高权重',
      requirement_detail:
        '披露供应链ESG风险评估机制、供应商行为准则签署比例及年度现场审核与整改闭环情况',
      client_status: 'missing',
      evidence_ref:
        '上年报告 P54：仅介绍质量考核与交期管理，未提及环保、劳工安全与廉洁条款',
      gap_description:
        '海外客户与EcoVadis对可持续采购权重高达20%，缺乏供应商ESG准入与现场审核数据导致明显失分',
      priority: 'P1',
      action_suggestion:
        '核实采购合同环保/廉洁条款签署比例；制定《供应商行为准则》并统计年度现场稽核整改率',
      owner_dept: hasDept('采购', '采购与供应链部'),
      selectedForInterview: true,
    },
    {
      gap_id: 'GAP-S-02',
      esg_pillar: 'S',
      topic_name: '员工培训与职业安全',
      standard_source: 'GRI 403 / 404 / MSCI',
      requirement_type: '评级高权重',
      requirement_detail:
        '披露按性别/职级拆分的人均培训时长、工伤人数、损工时数及ISO 45001认证覆盖率',
      client_status: 'partial',
      evidence_ref:
        '上年报告 P46：披露了总培训场次与零亡人目标，但未披露人均学时及认证基地覆盖率',
      gap_description:
        '颗粒度不足，缺少分层培训小时数及可记录工伤率（TRIR）定量指标',
      priority: 'P1',
      action_suggestion:
        '向HR与EHS采集各职级人均培训时长、年度安全演练次数及ISO 45001覆盖基地占比',
      owner_dept: `${hasDept('人力', '人力资源部')}、${hasDept(
        'EHS',
        'EHS安环部',
      )}`,
      selectedForInterview: true,
    },
    {
      gap_id: 'GAP-S-03',
      esg_pillar: 'S',
      topic_name: '绿色研发与产品创新',
      standard_source: `${primaryStd} · 第42条 / CSA`,
      requirement_type: '建议披露',
      requirement_detail:
        '披露绿色低碳技术研发投入占比、绿色专利成果及核心产品碳足迹透明化进展',
      client_status: 'missing',
      evidence_ref:
        '上年报告未提及绿色研发占比；年报已披露研发总投入与发明专利数',
      gap_description:
        '未将年报中的研发投入数据转化为ESG维度的清洁技术与产品降碳故事',
      priority: 'P1',
      action_suggestion:
        '结合年报已披露研发总额，访谈研发中心拆出绿色工艺投入占比与典型产品碳足迹项目',
      owner_dept: hasDept('研发', '研发中心'),
      selectedForInterview: true,
    },
    {
      gap_id: 'GAP-G-01',
      esg_pillar: 'G',
      topic_name: 'ESG管治与薪酬挂钩',
      standard_source: `${primaryStd} · 第12条 / MSCI`,
      requirement_type: '强制披露',
      requirement_detail:
        '披露董事会对ESG事务的监督频率、ESG专项委员会职责及ESG绩效是否与高管薪酬挂钩',
      client_status: 'partial',
      evidence_ref:
        '上年报告 P14：仅放了三级架构图，未写明董事会审议ESG议题次数与高管考核挂钩',
      gap_description:
        '监管与MSCI重点核查“董事会实际履职痕迹”与“高管考核挂钩机制”，不能只放空架构图',
      priority: 'P0',
      action_suggestion:
        '向董办收集本年董事会审议ESG/双碳议案次数；向HR确认高管KPI中安全/减碳权重',
      owner_dept: `${hasDept('董事', '董事会办公室（证券部）')}、${hasDept(
        '人力',
        '人力资源部',
      )}`,
      selectedForInterview: true,
    },
    {
      gap_id: 'GAP-G-02',
      esg_pillar: 'G',
      topic_name: '商业道德与反腐败',
      standard_source: 'GRI 205 / MSCI / EcoVadis',
      requirement_type: '强制披露',
      requirement_detail:
        '披露反商业贿赂培训覆盖率（含董事及关键岗位）、举报通道独立性与保护机制及案件数',
      client_status: 'partial',
      evidence_ref:
        '上年报告 P60：提及设立举报邮箱，未披露培训覆盖率与案件统计口径',
      gap_description:
        '缺少反腐败培训覆盖人次、百分比及“举报人保护与保密流程”具体制度阐述',
      priority: 'P0',
      action_suggestion:
        '向质量与合规部核实培训台账、廉洁承诺书签署率及审计监察处理闭环机制',
      owner_dept: hasDept('质量', '质量与合规部'),
      selectedForInterview: true,
    },
  ];
};

export const buildGeneratedBenchmarks = (
  project: Pick<PreResearchProject, 'companyName' | 'peers'>,
): {
  benchmarkRows: PeerBenchmarkRow[];
  highlightCases: HighlightCaseItem[];
} => {
  const basePeers =
    project.peers.length > 0 ? project.peers : buildSamplePeers();
  const selectedPeers = basePeers.filter(p => p.selected !== false);
  const peers = selectedPeers.length > 0 ? selectedPeers : basePeers;
  const val = (idx: number, vals: string[]) =>
    vals[idx] ?? vals[vals.length - 1];
  const mapPeers = (vals: string[]) =>
    peers.reduce<Record<string, string>>((acc, p, idx) => {
      acc[p.id] = val(idx, vals);
      return acc;
    }, {});

  const benchmarkRows: PeerBenchmarkRow[] = [
    {
      id: 'bm-1',
      dimensionGroup: '一、基本信息与鉴证',
      metricName: '报告页数与发布语种',
      selfValue: '62页；仅中文版',
      peerValues: mapPeers([
        '118页；中英双语',
        '86页；中英双语',
        '94页；中英双语',
      ]),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【同业盲区】3家标杆均已同步发布中英双语版，建议本年至少配套输出英文版以支持出海客户审核',
    },
    {
      id: 'bm-2',
      dimensionGroup: '一、基本信息与鉴证',
      metricName: '对标披露准则矩阵',
      selfValue: 'GRI Standards',
      peerValues: mapPeers([
        '上交所+港交所+ISSB+GRI',
        '上交所+GRI',
        '上交所+GRI+TCFD',
      ]),
      isPeerBlindSpot: false,
      aiDiagnosis:
        '建议本年补齐《沪深北交易所指引》四支柱对标及ISSB气候财务影响披露',
    },
    {
      id: 'bm-3',
      dimensionGroup: '一、基本信息与鉴证',
      metricName: '第三方独立鉴证 / 核查',
      selfValue: '无第三方鉴证',
      peerValues: mapPeers([
        '毕马威有限鉴证（覆盖18项KPI）',
        'SGS温室气体核查声明',
        'TÜV莱茵独立鉴证',
      ]),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【同业盲区】竞对已全面引入外部鉴证或ISO 14064碳核查声明，建议本年优先落地温室气体核查',
    },
    {
      id: 'bm-4',
      dimensionGroup: '二、实质性议题与框架',
      metricName: '双重实质性评估模型',
      selfValue: '单维度重要性矩阵',
      peerValues: mapPeers([
        '财务×影响双重实质性+量化得分',
        '双重实质性调研（回收1,200份）',
        '双重实质性+四支柱映射主表',
      ]),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【同业盲区】需升级为“财务实质性×影响实质性”二维评估，并在目录中显性映射核心议题四支柱',
    },
    {
      id: 'bm-5',
      dimensionGroup: '三、双碳目标与KPI颗粒度',
      metricName: '双碳目标与减排路径',
      selfValue: '无定量减碳目标',
      peerValues: mapPeers([
        '2030年核心运营碳中和（已提交SBTi）',
        '2030年单位产值碳排放较2023年降35%',
        '2035年运营碳中和',
      ]),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【同业盲区】竞对均设立了带基准年与时间节点的量化减碳目标，访谈EHS与战略部需摸底阶段目标规划',
    },
    {
      id: 'bm-6',
      dimensionGroup: '三、双碳目标与KPI颗粒度',
      metricName: '绿电使用占比与自建光伏',
      selfValue: '未披露绿电占比',
      peerValues: mapPeers(['绿电占比 62%', '绿电占比 38%', '绿电占比 45%']),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【同业盲区】3家竞对绿电占比均达38%以上，需在访谈中重点摸排屋顶光伏及绿证采购台账',
    },
    {
      id: 'bm-7',
      dimensionGroup: '三、双碳目标与KPI颗粒度',
      metricName: '范围三排放与产品碳足迹',
      selfValue: '仅披露范围一/二',
      peerValues: mapPeers([
        '披露范围三8个类别',
        '披露范围三3个类别',
        '披露范围三5个类别及6款产品碳足迹',
      ]),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【同业盲区】建议本年至少启动范围三类别1（外购原料）与类别4（物流）盘查，补齐出海客户要求',
    },
    {
      id: 'bm-8',
      dimensionGroup: '四、社会与供应链亮点',
      metricName: '供应商ESG准则签署与审核',
      selfValue: '仅披露质量与交期考核',
      peerValues: mapPeers([
        '100%核心供应商签署，现场审计120家',
        '85%主要供应商签环保廉洁协议',
        '92%一级供应商完成ESG风险自评',
      ]),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【同业盲区】供应链ESG审核已是行业标配，需重点核实采购合同环保/廉洁条款覆盖率',
    },
    {
      id: 'bm-9',
      dimensionGroup: '四、社会与供应链亮点',
      metricName: '安全生产与ISO 45001覆盖',
      selfValue: '仅披露零亡人定性描述',
      peerValues: mapPeers([
        '100%基地通过ISO 45001，披露TRIR',
        '95%基地认证，安全事故一票否决制',
        '100%基地认证，AI隐患识别系统',
      ]),
      isPeerBlindSpot: false,
      aiDiagnosis: '建议补充体系认证覆盖率百分比及千人负伤率/损工时等定量指标',
    },
    {
      id: 'bm-10',
      dimensionGroup: '五、治理与特色专题',
      metricName: 'ESG绩效与高管薪酬挂钩',
      selfValue: '未提及高管ESG考核',
      peerValues: mapPeers([
        '高管绩效10%与安全及减碳挂钩',
        '披露安全事故一票否决制',
        '高管考核挂钩碳目标完成率',
      ]),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【同业盲区】需向HR和董办核实厂长与高管年度KPI中安全、环保、降碳指标的实际权重',
    },
    {
      id: 'bm-11',
      dimensionGroup: '五、治理与特色专题',
      metricName: '年度特色专题章节设置',
      selfValue: '无独立专题章节',
      peerValues: mapPeers([
        '《零碳工厂与全生命周期回收》',
        '《绿色智造与光储微电网实践》',
        '《应对欧盟碳关税：产品碳足迹透明化》',
      ]),
      isPeerBlindSpot: peers.length >= 3,
      aiDiagnosis:
        '【选题建议】建议结合公司出口及工艺改造实践，新增1—2个年度深度专题专栏',
    },
  ];

  const highlightCases: HighlightCaseItem[] = [
    {
      id: 'case-1',
      peerName: peers[0]?.name || '行业龙头A',
      title: '零碳工厂创建与电池/废料循环回收专题',
      esgPillar: 'E',
      summary:
        '通过屋顶光伏、余热回收和余料闭环再生，单工厂范围一/二排放下降42%，附带完整减排成本收益表。',
      adoptedForReport: true,
    },
    {
      id: 'case-2',
      peerName: peers[2]?.name || '出海标杆C',
      title: '应对欧盟碳关税（CBAM）：产品碳足迹透明化行动',
      esgPillar: 'E',
      summary:
        '选取6款出口主力产品完成ISO 14067碳足迹核算并生成数字护照，直接回应欧洲大客户招标审查。',
      adoptedForReport: true,
    },
    {
      id: 'case-3',
      peerName: peers[1]?.name || '直接竞对B',
      title: '一级供应商绿色包装循环箱与ESG分级稽核',
      esgPillar: 'S',
      summary:
        '推行可循环周转箱替代一次性木箱，同时对高风险供应商实施红黄绿牌现场审核与限期整改。',
      adoptedForReport: false,
    },
    {
      id: 'case-4',
      peerName: peers[0]?.name || '行业龙头A',
      title: '董事会ESG监督实录与高管双碳考核机制',
      esgPillar: 'G',
      summary:
        '公开全年4次董事会ESG专门委员会审议议题清单，并说明高管年终绩效10%与安全环保指标挂钩细节。',
      adoptedForReport: true,
    },
  ];

  return { benchmarkRows, highlightCases };
};

export const buildGeneratedInterviews = (
  project: Pick<
    PreResearchProject,
    | 'companyName'
    | 'period'
    | 'departments'
    | 'gapItems'
    | 'annualReportClues'
    | 'websiteHighlights'
  >,
): InterviewQuestionItem[] => {
  const depts =
    project.departments.length > 0 ? project.departments : DEFAULT_DEPARTMENTS;
  const cluesText =
    project.annualReportClues || '年报已披露研发总投入与主要生产基地布局';
  const webText = project.websiteHighlights || '官网新闻提及推进智能化节能改造';
  const period = project.period || '2025';
  const questions: InterviewQuestionItem[] = [];

  depts.forEach(dept => {
    const code = (dept.deptCode || 'DEPT').toUpperCase();
    const matchedGaps = project.gapItems.filter(g =>
      g.owner_dept.includes(dept.deptName),
    );
    const firstGap = matchedGaps[0];

    if (dept.deptName.includes('EHS')) {
      questions.push(
        {
          question_id: `Q-${code}-01`,
          target_dept: dept.deptName,
          stage_group: 'governance_policy',
          esg_topic: '环境与安全管理体系',
          priority_level: 'P0',
          question_origin:
            '对应GAP-E-03/S-02（上年未披露认证基地覆盖率）+ 三级管理架构核验',
          main_question: `想确认一下${period}年公司各生产基地ISO 14001和ISO 45001体系认证的新增或覆盖情况，以及今年有没有新修订环保、安全生产管理制度？`,
          follow_up_prompts: [
            '目前已取证基地占全部生产基地的比例是多少？预计未取证基地何时完成取证？',
            '公司安委会/EHS例会多久召开一次，隐患整改闭环率是否保持100%？',
          ],
          expected_materials: [
            'ISO 14001 / ISO 45001 有效证书扫描件',
            `${period}年新修订EHS制度清单`,
          ],
        },
        {
          question_id: `Q-${code}-02`,
          target_dept: dept.deptName,
          stage_group: 'actions_gap_closure',
          esg_topic: '应对气候变化与极端天气',
          priority_level: 'P0',
          question_origin: `对应GAP-E-01（物理/转型风险识别强制项）+ 公开线索：${webText.slice(
            0,
            36,
          )}`,
          main_question: `今年夏季出现持续高温和部分地区限电，咱们各生产基地有没有遇到拉闸限电、暴雨内涝等极端天气影响生产？公司针对这类极端天气和未来碳关税有哪些应急预案与应对动作？`,
          follow_up_prompts: [
            '极端天气是否造成过短期停工或制冷电费显著上升？',
            '各车间今年实施了哪些节能或节水技改项目（请举1-2个带投入金额和节能量的案例）？',
          ],
          expected_materials: [
            '《极端天气/突发环境事件应急预案》',
            `${period}年节能节水技改项目结项验收单`,
          ],
        },
        {
          question_id: `Q-${code}-03`,
          target_dept: dept.deptName,
          stage_group: 'quantitative_scope',
          esg_topic: '碳排放与绿电比例',
          priority_level: 'P0',
          question_origin:
            '对应GAP-E-02（未写因子来源、缺范围三与绿电）+ 同业盲区（竞对绿电占比>38%）',
          main_question: `看到公司去年已经统计了范围一和范围二碳排放，${period}年各基地有没有建设屋顶光伏或采购绿电/绿证？碳盘查具体采用哪一版电网排放因子，是否启动了范围三核查？`,
          follow_up_prompts: [
            '屋顶光伏装机容量、全年自发自用电量及绿电交易电量分别是多少？',
            '范围一/二排放边界是否覆盖本年新投产的子公司或仓库？',
          ],
          expected_materials: [
            `${period}年各基地电费/光伏结算汇总表`,
            '第三方温室气体核查声明或绿证凭证',
          ],
        },
        {
          question_id: `Q-${code}-04`,
          target_dept: dept.deptName,
          stage_group: 'cases_next_plan',
          esg_topic: '技改亮点与减碳目标',
          priority_level: 'P1',
          question_origin:
            '同业盲区（3家竞对均设阶段减碳目标）+ STAR亮点案例挖掘',
          main_question: `明年和“十五五”期间公司在节能降碳和零碳工厂创建上有哪些明确规划？今年最值得写入报告专题的环保或安全技改案例是哪一个？`,
          follow_up_prompts: [
            '这个技改项目从哪个月投运，投入了多少资金，年节约多少电/水/天然气？',
            '内部是否有讨论过2030年单位产值碳排放下降的定量目标？',
          ],
          expected_materials: ['亮点技改项目总结PPT或前后对比数据表'],
        },
      );
      return;
    }

    if (dept.deptName.includes('采购')) {
      questions.push(
        {
          question_id: `Q-${code}-01`,
          target_dept: dept.deptName,
          stage_group: 'governance_policy',
          esg_topic: '可持续供应链准入',
          priority_level: 'P1',
          question_origin:
            '对应GAP-S-01（上年未写供应商ESG管理）+ 标杆A/C均披露准则签署率超90%',
          main_question: `目前在引入新供应商或年度复审时，除了质量、交期和价格之外，有没有要求供应商签署包含环保合规、安全生产、禁止童工和反商业贿赂条款的协议或《供应商行为准则》？`,
          follow_up_prompts: [
            `如果已有相关条款，${period}年一级核心供应商的签署覆盖率大概是多少？`,
            '有没有针对化学原料、运输等高风险供应商制定专门的ESG评分门槛？',
          ],
          expected_materials: [
            '标准采购合同环保/廉洁条款模板或《供应商行为准则》',
          ],
        },
        {
          question_id: `Q-${code}-02`,
          target_dept: dept.deptName,
          stage_group: 'actions_gap_closure',
          esg_topic: '供应商现场审核与绿色包装',
          priority_level: 'P1',
          question_origin: '对应GAP-S-01 + EcoVadis可持续采购20%高权重项',
          main_question: `${period}年有没有对供应商开展过EHS现场稽核或ESG问卷自评？另外，在包材减量化、循环周转箱或物流低碳运输方面有没有落地的降碳举措？`,
          follow_up_prompts: [
            '全年共现场审核了多少家供应商，发现多少项不合格并完成整改？是否发生过因ESG不达标淘汰供应商？',
            '可循环包装箱使用比例或本地化采购比例有多少？',
          ],
          expected_materials: [`${period}年供应商准入审核表及年度稽核统计台账`],
        },
        {
          question_id: `Q-${code}-03`,
          target_dept: dept.deptName,
          stage_group: 'quantitative_scope',
          esg_topic: '范围三供应链碳数据',
          priority_level: 'P0',
          question_origin: '对应GAP-E-02（范围三类别1外购商品/类别4上游运输）',
          main_question: `为了配合今年范围三（外购原料和上游物流）碳排放盘查，采购台账里能否导出主要原材料的年度采购重量（吨）及物流运输里程？有没有头部供应商已经提供过产品碳足迹数据？`,
          follow_up_prompts: [
            '前十大采购品类的重量和产地统计口径是否齐全？',
            '是否计划明年要求核心供应商报送碳排放数据？',
          ],
          expected_materials: [`${period}年主要原料采购量及物流方式汇总表`],
        },
      );
      return;
    }

    if (dept.deptName.includes('董事')) {
      questions.push(
        {
          question_id: `Q-${code}-01`,
          target_dept: dept.deptName,
          stage_group: 'governance_policy',
          esg_topic: '董事会ESG监督履职',
          priority_level: 'P0',
          question_origin:
            '对应GAP-G-01（上年只有架构图无履职次数）+ MSCI管治核查重点',
          main_question: `${period}年董事会或下设ESG/战略委员会一共召开了几次会议审议双碳、安全生产或ESG报告相关议题？具体审议通过了哪些重要决议？`,
          follow_up_prompts: [
            '董事会专门委员会中独立董事占比和女性董事人数/占比分别是多少？',
            'ESG报告发布前是否经过董事会正式审批？',
          ],
          expected_materials: [
            `${period}年董事会/专门委员会会议召开次数及ESG议题摘要`,
            'ESG三级管治架构正式发文',
          ],
        },
        {
          question_id: `Q-${code}-02`,
          target_dept: dept.deptName,
          stage_group: 'actions_gap_closure',
          esg_topic: '投关沟通与合规内控',
          priority_level: 'P1',
          question_origin: '上交所指引信息披露与投资者沟通要求',
          main_question: `报告期内公司在投资者关系活动（业绩说明会、机构调研）中，投资者或海外客户最常问到哪些ESG问题？公司面向境外评级（MSCI/Wind）有没有专人对接？`,
          follow_up_prompts: [
            '全年业绩说明会、投资者现场调研共举办了多少场？',
            '是否制定了《信息披露事务管理制度》修订版及舆情应对预案？',
          ],
          expected_materials: [`${period}年投资者交流活动统计表`],
        },
      );
      return;
    }

    questions.push(
      {
        question_id: `Q-${code}-01`,
        target_dept: dept.deptName,
        stage_group: 'governance_policy',
        esg_topic: dept.topics[0] || '制度与合规建设',
        priority_level: firstGap?.priority || 'P1',
        question_origin: firstGap
          ? `对应${firstGap.gap_id}（${firstGap.topic_name}）`
          : `结合部门职责（${dept.dutySummary.slice(0, 24)}）补齐披露依据`,
        main_question: `${period}年在${
          dept.topics.join('、') || dept.deptName
        }方面，公司新制定或修订了哪些核心管理制度，日常是如何分工落地到各子公司的？`,
        follow_up_prompts: [
          '这些制度是否覆盖全部控股子公司及海外运营主体？',
          '日常执行中如何开展合规检查和闭环跟踪？',
        ],
        expected_materials: [`${dept.deptName}核心管理制度文本（PDF/Word）`],
      },
      {
        question_id: `Q-${code}-02`,
        target_dept: dept.deptName,
        stage_group: 'quantitative_scope',
        esg_topic: dept.topics[1] || dept.topics[0] || '定量数据口径',
        priority_level: 'P0',
        question_origin: `年报已知线索免问：${cluesText.slice(
          0,
          40,
        )}；重点补充ESG颗粒度指标`,
        main_question: `围绕${dept.dutySummary.slice(
          0,
          32,
        )}，请确认${period}年有哪些可以对外披露的定量数据（如投入金额、覆盖率、培训人次或认证比例）？`,
        follow_up_prompts: [
          '这些指标近三年的数据口径是否一致，有没有因为新并表范围导致同比波动？',
          '哪些数据有第三方检测报告、台账或系统导出凭证支撑？',
        ],
        expected_materials: [
          `${period}年${dept.deptName}定量指标汇总台账及佐证附件`,
        ],
      },
      {
        question_id: `Q-${code}-03`,
        target_dept: dept.deptName,
        stage_group: 'cases_next_plan',
        esg_topic: '标杆案例挖掘',
        priority_level: 'P2',
        question_origin: '落实STAR四步法案例框要求，补齐定量成果',
        main_question: `${period}年部门内部有没有最亮眼的一个创新实践或改进项目（有明确背景问题、改造动作和省钱/提效数字）可以作为专栏案例写入ESG报告？`,
        follow_up_prompts: [
          '项目上线前后在效率、质量或客户满意度上具体提升了多少？',
          '明年在该领域有哪些量化改进目标？',
        ],
        expected_materials: ['年度亮点项目简介或现场照片素材'],
      },
    );
  });

  return questions;
};

export const createDefaultSampleProject = (): PreResearchProject => {
  const peers = buildSamplePeers();
  const base: PreResearchProject = {
    id: 'pr-sample-9001',
    projectName: '绿源智造 2025年度 ESG 阶段一调研（示例）',
    companyName: '绿源智造',
    period: '2025',
    industry: '精密制造 / 新能源装备（出海欧洲）',
    listingType: 'A股上市公司（上交所主板）',
    status: 'in_progress',
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    selfMaterials: [
      {
        id: 'mat-1',
        name: '绿源智造_2024年度ESG报告.pdf',
        fileSize: '4.20 MB',
        category: 'esg_report',
        uploadedAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
      },
      {
        id: 'mat-2',
        name: '绿源智造_2025年年度报告.pdf',
        fileSize: '6.85 MB',
        category: 'annual_report',
        uploadedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      },
      {
        id: 'mat-3',
        name: '公司组织架构与各部门职责说明书.xlsx',
        fileSize: '186 KB',
        category: 'org_doc',
        uploadedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      },
    ],
    websiteHighlights:
      '官网2025年7月发布《华东高温保供与苏州基地屋顶光伏一期并网投运》新闻；9月公告新增欧洲储能客户定点协议。',
    annualReportClues:
      '2025年报已公开信息：全年研发投入3.2亿元（同比增长18%），共拥有有效发明专利146项，苏州/合肥两大生产基地已全部投产。',
    departments: DEFAULT_DEPARTMENTS,
    standards: [
      '沪深北交易所《可持续发展报告指引》',
      'GRI Standards',
      'ISSB (IFRS S1/S2)',
    ],
    ratings: ['MSCI', 'S&P CSA', 'EcoVadis'],
    peers,
    gapItems: [],
    benchmarkRows: [],
    highlightCases: [],
    interviewQuestions: [],
  };
  base.gapItems = buildGeneratedGaps(base);
  const bm = buildGeneratedBenchmarks(base);
  base.benchmarkRows = bm.benchmarkRows;
  base.highlightCases = bm.highlightCases;
  base.interviewQuestions = buildGeneratedInterviews(base);
  return base;
};

const readStore = (): PreResearchProject[] => {
  if (typeof window === 'undefined') {
    return [createDefaultSampleProject()];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [createDefaultSampleProject()];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as PreResearchProject[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [createDefaultSampleProject()];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return [createDefaultSampleProject()];
  }
};

const writeStore = (list: PreResearchProject[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
};

export const getLocalPreResearchList = (): PreResearchProject[] => readStore();

export const getLocalPreResearchById = (
  id: string,
): PreResearchProject | undefined => readStore().find(item => item.id === id);

export const saveLocalPreResearchProject = (
  project: PreResearchProject,
): PreResearchProject => {
  const list = readStore();
  const updated: PreResearchProject = {
    ...project,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  };
  const idx = list.findIndex(item => item.id === project.id);
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.unshift(updated);
  }
  writeStore(list);
  return updated;
};

export const deleteLocalPreResearchProject = (id: string): void => {
  const list = readStore().filter(item => item.id !== id);
  writeStore(list);
};
