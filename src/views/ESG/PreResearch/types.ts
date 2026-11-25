export type EsgPillar = 'E' | 'S' | 'G';

export type GapClientStatus =
  | 'compliant'
  | 'partial'
  | 'missing'
  | 'not_applicable';

export type GapPriority = 'P0' | 'P1' | 'P2';

export type InterviewStageGroup =
  | 'governance_policy'
  | 'actions_gap_closure'
  | 'quantitative_scope'
  | 'cases_next_plan';

export type PreResearchProjectStatus = 'draft' | 'in_progress' | 'completed';

export interface UploadedMaterialItem {
  id: string;
  name: string;
  url?: string;
  fileSize?: string;
  category: 'esg_report' | 'annual_report' | 'org_doc' | 'peer_report';
  uploadedAt: string;
}

export interface DepartmentDutyItem {
  id: string;
  deptCode: string;
  deptName: string;
  pillars: EsgPillar[];
  topics: string[];
  dutySummary: string;
  contactRole?: string;
}

export interface PeerCompanyItem {
  id: string;
  name: string;
  tag: string;
  listingMarket: string;
  ratingSummary: string;
  reportFileName?: string;
  reportUrl?: string;
}

export interface GapDiagnosisItem {
  gap_id: string;
  esg_pillar: EsgPillar;
  topic_name: string;
  standard_source: string;
  requirement_type: string;
  requirement_detail: string;
  client_status: GapClientStatus;
  evidence_ref: string;
  gap_description: string;
  priority: GapPriority;
  action_suggestion: string;
  owner_dept: string;
  selectedForInterview: boolean;
}

export interface PeerBenchmarkRow {
  id: string;
  dimensionGroup: string;
  metricName: string;
  selfValue: string;
  peerValues: Record<string, string>;
  isPeerBlindSpot: boolean;
  aiDiagnosis: string;
}

export interface HighlightCaseItem {
  id: string;
  peerName: string;
  title: string;
  esgPillar: EsgPillar;
  summary: string;
  adoptedForReport: boolean;
}

export interface InterviewQuestionItem {
  question_id: string;
  target_dept: string;
  stage_group: InterviewStageGroup;
  esg_topic: string;
  priority_level: GapPriority;
  question_origin: string;
  main_question: string;
  follow_up_prompts: string[];
  expected_materials: string[];
}

export interface PreResearchProject {
  id: string;
  projectName: string;
  companyName: string;
  period: string;
  industry: string;
  listingType: string;
  status: PreResearchProjectStatus;
  updatedAt: string;
  /** 看自身 */
  selfMaterials: UploadedMaterialItem[];
  websiteHighlights: string;
  annualReportClues: string;
  departments: DepartmentDutyItem[];
  /** 看监管与评级 */
  standards: string[];
  ratings: string[];
  /** 看同业 */
  peers: PeerCompanyItem[];
  /** 交付物 1 */
  gapItems: GapDiagnosisItem[];
  /** 交付物 2 */
  benchmarkRows: PeerBenchmarkRow[];
  highlightCases: HighlightCaseItem[];
  /** 交付物 3 */
  interviewQuestions: InterviewQuestionItem[];
}
