export type FileRef = { fileKey: string; uploadReceipt?: string };
export type Phase = {
  code: string;
  opensAt?: string;
  closesAt?: string;
  questionReleaseAt?: string;
  publishNotBefore?: string;
  enabled: boolean;
  confirmed: boolean;
  version: number;
};
export type Content = {
  groupQrFileKey?: string;
  assistantQrFileKey?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  backgroundText?: string;
  goals?: string[];
  publicRuleText?: string;
  awardDescription?: string;
};
export type Overview = {
  publicAssets?: { fileKey: string; url: string; expiresAt: string }[];
  id: string;
  code: string;
  name: string;
  status: string;
  publicContent: Content;
  phases: Phase[];
  registrationAvailable: boolean;
  inviteRecordedBefore?: string;
  accountRegisteredBefore?: string;
};
export type Participant = {
  id: string;
  realName: string;
  mobile?: string;
  mobileMasked: string;
  role?: string;
  track?: string;
  status: string;
  version: number;
  accountRegistered: boolean;
  eligible?: boolean;
  activeMember: boolean;
  inviterName?: string;
  personalBonusRate?: string;
  personalBonusPendingItems?: string[];
};
export type Team = {
  id: string;
  enterpriseName: string;
  creditCode?: string;
  captainName: string;
  licenseFile?: FileRef;
  logoFile?: FileRef;
  qualificationStatus: string;
  registrationStatus: string;
  rejectReason?: string;
  members: Participant[];
  memberCount: number;
  registeredMemberCount: number;
  version: number;
  teamBonusRate?: string;
  allowedActions: string[];
};
export type Benefit = {
  status: string;
  pendingItems: string[];
  errorKey?: string;
  startsAt?: string;
  endsAt?: string;
};
export type Me = {
  inviteReceiptStatus?: 'NONE' | 'ACCEPTED' | 'IGNORED_INVALID';
  participant?: Participant;
  team?: Team;
  benefit: Benefit;
  personalBonusRate?: string;
  personalBonusPendingItems: string[];
};
export type Landing = {
  reason?: string;
  inviterName: string;
  teamName?: string;
  teamId?: string;
  canJoinTeam: boolean;
  registrationOpen: boolean;
  firstTouchReceipt?: string;
};
export type Invite = {
  id: string;
  inviteeName?: string;
  mobileMasked?: string;
  personalEligibility: string;
  personalBonusContribution?: string;
  registrationStatus?: string;
  track?: string;
  personalReason?: string;
  firstOpenedAt?: string;
};
export type Page<T> = {
  rows: T[];
  total: number;
  pageNum: number;
  pageSize: number;
};
export type Change = {
  action: 'ADD' | 'UPDATE' | 'REMOVE';
  participantId?: string;
  realName?: string;
  mobile?: string;
  reason?: string;
  expectedVersion?: number;
};
export type Mutation = {
  requestId: string;
  expectedVersion?: number;
  firstTouchReceipt?: string;
};
export type Link = {
  inviteUrl: string;
  participantId: string;
  version: number;
};

export type Task = {
  taskCode: 'C_PRODUCT' | 'C_ENTERPRISE';
  phaseStatus: string;
  questionReleaseAt?: string;
  opensAt?: string;
  closesAt?: string;
  assignmentId?: string;
  assignmentVersion?: number;
  dataSource?: 'STANDARD' | 'OWN';
  paperTitle?: string;
  downloadAvailable: boolean;
  submissionId?: string;
  submissionVersion?: number;
  status: string;
  sourceVersion?: string;
  snapshotErrorCode?: string;
};

export type ModelRef = {
  accountId?: string;
  reportId?: string;
  year?: string;
  computationIds?: string[];
  shareUrl?: string;
};
export type ModelSummary = {
  title: string;
  year?: string;
  totalEmission?: number;
  emissionUnit?: string;
  inputCount?: number;
};
export type Model = { model: ModelRef; title: string; status: string };
export type PreparedModel = {
  candidates?: Page<Model>;
  selectionYear?: string;
  model: ModelRef;
  sourceVersion: string;
  summary: ModelSummary;
};
export type Submission = {
  id: string;
  taskCode: string;
  status: string;
  version: number;
  submitRevision: number;
  model?: ModelRef;
  sourceVersion?: string;
  contentHash: string;
  summary?: ModelSummary;
  snapshotCode?: string;
  snapshotErrorCode?: string;
  snapshotFailureKind?: string;
  canReset: boolean;
};
export type Snapshot = {
  status: string;
  snapshotCode: string;
  contentHash: string;
  summary: ModelSummary;
  contentJson: string;
};
export type MemberTasks = {
  participantId: string;
  realName: string;
  role: string;
  accountRegistered: boolean;
  tasks: Task[];
};

export type LeaderboardEntry = {
  track?: string;
  teamId?: string;
  teamName?: string;
  mobileMasked?: string;
  eScore?: number;
  subjectId: string;
  name: string;
  points: number | null;
  participants: number;
  rank?: number | null;
  status: string;
};
export type Leaderboard = Page<LeaderboardEntry> & {
  batchId?: string;
  updatedAt?: string;
  status: string;
  eScoreStatus: string;
};
export type CheckinMe = {
  bindingStatus: string;
  bindingVersion: number;
  points?: number;
  teamPoints?: number;
  rank?: number;
  teamRank?: number;
  updatedAt?: string;
  rulesUrl?: string;
  status: string;
};

export type AwardLevel = 'GOLD' | 'SILVER' | 'BRONZE' | 'COMPLETED';

export type PreliminaryResult = {
  subjectType: string;
  subjectId: string;
  teamId?: string;
  displayName: string;
  teamNameSnapshot?: string;
  trackSnapshot?: string;
  productScore?: number;
  enterpriseScore?: number;
  rosterCount?: number;
  registeredMemberCount?: number;
  cScore?: number;
  eScore?: number;
  bonusRate?: number;
  totalScore?: number;
  ranking?: number;
  qualified?: number;
  awardLevel?: AwardLevel | string;
  certificateNo?: string;
  issuedAt?: string;
};

export type FinalResult = {
  subjectId: string;
  teamId?: string;
  displayName: string;
  preliminaryScore?: number;
  rScore?: number;
  oScore?: number;
  sScore?: number;
  finalScore?: number;
  totalScore?: number;
  ranking?: number;
  awardLevel?: AwardLevel | string;
  certificateNo?: string;
  issuedAt?: string;
};

export type PublishedResults = {
  id?: string;
  status: string;
  batchVersion?: number;
  publishedAt?: string;
  results: PreliminaryResult[];
  finalStatus?: string;
  finalPublishedAt?: string;
  finalResults?: FinalResult[];
};

export type CompetitionAwardMedal = {
  scope: 'PERSONAL' | 'ENTERPRISE';
  level: Exclude<AwardLevel, 'COMPLETED'>;
  title: string;
  recipientName: string;
  ranking?: number;
};

export type CompetitionAwardSummary = {
  personal?: CompetitionAwardMedal;
  enterprise?: CompetitionAwardMedal;
};

export type Poster = {
  kind: string;
  batchId: string;
  shareUrl?: string;
  inviteUrl?: string;
  inviteEnabled: boolean;
  certificateNo?: string;
  issuedAt?: string;
  awardLevel?: AwardLevel | string;
  result?: PreliminaryResult;
  finalResult?: FinalResult;
  checkin?: LeaderboardEntry;
};

export type ModelQuery = {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  year?: string;
};
export type ModelResolveRequest = { model?: ModelRef; shareUrl?: string };
export type MaterialDraftRequest = Mutation & {
  model: ModelRef;
  sourceVersion: string;
};
export type MaterialSubmitRequest = Mutation & { contentHash: string };
export type AssignmentRequest = Mutation & { dataSource: 'STANDARD' | 'OWN' };
export type PosterRequest = {
  kind: 'CHECKIN' | 'RESULT';
  subjectType: string;
  batchId?: string;
};
export type PosterQuery = {
  kind: string;
  batchId: string;
  inviteCode?: string;
};
export type LeaderboardQuery = {
  board: string;
  pageNum: number;
  pageSize: number;
  keyword?: string;
  batchId?: string;
};

export type FinalTaskCode = 'R' | 'O' | 'S';
export type MaterialFile = FileRef & {
  fileName: string;
  fileSize?: number;
  mimeType?: string;
};
export type FinalMaterial = {
  taskCode: FinalTaskCode;
  status: string;
  phaseStatus: string;
  canEdit: boolean;
  reason?: string;
  summaryText?: string;
  files: MaterialFile[];
  version?: number;
  opensAt?: string;
  closesAt?: string;
  submittedAt?: string;
};

export type CarbonCompany = {
  companyId: string;
  companyName?: string;
  companyNum?: string;
  inviteCode?: string;
  qrCodeUrl?: string;
};
