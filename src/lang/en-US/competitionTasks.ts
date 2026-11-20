export default {
  leaderboard: {
    selfCompany: '{name} (my company)',
    namePhone: '{name} ({phone})',
    title: 'Low-carbon check-in leaderboard',
    back: 'Back to check-ins',
    teamRank: 'Company rank',
    personalRank: 'Individual rank',
    myCoins: 'My carbon coins',
    searchPerson: 'Search name or last 4 phone digits',
    searchTeam: 'Search company name',
    selfName: '{name} (me)',
    scoreValue: '{value} pts',
    pendingScore: 'Awaiting verification',
    vacant: 'No ranked entrant',
    noRank: 'No eligible check-in rank yet',
    coins: 'coins',
    people: 'Participants: {count}',
    eScore: 'E stage: {score}',
    phone: 'Phone',
    track: 'Track',
    company: 'Company',
    myTeam: ' (my company)',
    eStage: 'E-stage score',
    total: '{count} results',
    noResults: 'No matching rankings',
  },
  modelErrors: {
    MODEL_DATA_INCOMPLETE:
      'A valid calculation result could not be read from this model. Check and recalculate the original model, or select another completed model.',
    CALCULATION_INCOMPLETE:
      'This model has not finished calculating or is being recalculated. Select it again after calculation completes.',
    SOURCE_VERSION_CHANGED:
      'The model has changed. Select it again and review the latest results before saving or submitting.',
  },
  resultErrors: {
    RESULT_SESSION_UNAVAILABLE:
      'No accessible calculation conversation or share was found. Check your conversation list.',
    RESULT_SHARE_UNAVAILABLE:
      'This member has not shared their results, or the share has expired. Please contact them.',
    SNAPSHOT_NOT_READY:
      'The submission is still processing. Please refresh later.',
    FORBIDDEN: 'You do not have access to this calculation.',
  },
  rankLabel: 'Rank',
  modelLabel: 'Select a completed calculation',
  modelHint:
    'Select a completed calculation. Submission preserves a read-only snapshot for review.',

  captainBadge: 'Team captains only',
  enterpriseBadge: 'Enterprise teams only',
  modelTools: 'Use a calculation result share link',
  modelSearchPlaceholder: 'Search by model name',
  checkinTitle: 'Take low-carbon action and earn carbon coins',
  topFive: 'Low-carbon check-in TOP 5',

  deadlineHint:
    'Submit each task before its deadline. Confirmed submissions are locked and cannot be changed.',
  active: 'In progress',
  selected: 'Viewing this module',
  enterpriseOnly: 'Not required for individual entrants',
  captainOnly:
    'The team captain submits these materials. Members may view submitted content.',
  qualification:
    'Submissions open to qualified company teams after the preliminary finalists are announced.',
  submission: 'Submit tasks',
  progress: 'View progress',
  C: 'Carbon accounting',
  R: 'Carbon reduction',
  E: 'Value-chain engagement',
  O: 'High-quality offsetting',
  S: 'Disclosure and communication',
  CDesc:
    'Complete product footprints and corporate inventories, then submit your Carbon Agent results.',
  RDesc:
    'Analyze major emission sources and design targeted reduction measures.',
  EDesc:
    'Join carbon account check-ins, earn carbon coins and contribute to your team’s low-carbon action.',
  ODesc: 'Assess residual emissions and propose appropriate offsetting plans.',
  SDesc:
    'Present carbon management outcomes and share effective low-carbon practices.',
  product: 'Task 1: Product carbon footprint',
  enterprise: 'Task 2: Enterprise carbon inventory',
  schedule: 'Task submission window: {start} — {end}',
  release: 'Paper downloads open: {time}',
  downloadEventClosed:
    'The competition is not open. Paper downloads are unavailable.',
  downloadTaskClosed:
    'This task is not enabled. Watch for competition announcements.',
  downloadSchedulePending:
    'The task schedule has not been confirmed. Downloads are unavailable.',
  downloadReleasePending: 'The paper release time has not been announced.',
  downloadNotReleased: 'Paper downloads open at {time}.',
  downloadChooseStandard:
    'Select official competition papers first to receive an assignment.',
  downloadNotAssigned:
    'No downloadable paper is available yet. Reload, or contact the competition team if the problem persists.',
  organizer: 'Use official competition papers',
  own: 'Use company data',
  summary: 'Plan summary',
  summaryHint:
    'Briefly describe the selected product for carbon accounting and the company, and outline the highlights of your emissions reduction, offsetting and communication plans.',
  files: 'Plan attachments',
  fileHint: 'PDF, PPTX, Word, PNG or JPG; up to 50 MB per file',
  confirm:
    'Submit materials for this stage? They will be retained for final review and cannot be edited.',
  readonly:
    'Materials for this stage have been submitted and cannot be changed.',
  empty: 'No submitted materials',
  tooLarge: 'Each file must be no larger than 50 MB',
  loading: 'Loading tasks',
  failed: 'Unable to load tasks. Please retry.',
  role: 'Your role: {role}',
  finalTitle: 'Final preparation materials',
  summaryRequired: 'Enter a plan summary',
  statusTitle: 'Task status',
  fileExpired:
    'The upload receipt has expired or belongs to another task. Upload the file again.',
  versionConflict:
    'The task has changed. Refresh and review the latest content.',
  phaseClosed: 'The submission window is not open',
  notStarted: 'Awaiting submission',
  paperExhausted:
    'No standard papers are available. Please contact the competition team and retry after more papers are added.',
  checkinNotOpen:
    'Low-carbon check-ins are not open yet. Watch for the competition schedule.',

  individualOrganizer: 'Use official individual-track papers',

  partial: 'Partially completed',

  completed: 'Completed',

  notOpen: 'Not started',

  submittedHint:
    'Materials submitted. View results opens the original conversation or share. Review uses the results saved at submission.',

  finalDeadlineHint:
    'Submit final-round materials before the deadline. Confirmed content cannot be changed and submissions close at the deadline.',

  finalForms: {
    R: {
      title: 'Final task 1: Carbon reduction plan',
      label: 'Reduction plan',
      placeholder:
        'Briefly describe the selected product for carbon accounting and the company, and outline the highlights of your emissions reduction, offsetting and communication plans.',
      upload: 'Upload reduction plan',
    },
    O: {
      title: 'Final task 2: Carbon offsetting plan',
      label: 'Offsetting plan',
      placeholder:
        'Briefly describe the selected product for carbon accounting and the company, and outline the highlights of your emissions reduction, offsetting and communication plans.',
      upload: 'Upload offsetting plan',
    },
    S: {
      title: 'Final task 3: Carbon management outcomes',
      label: 'Outcomes overview',
      placeholder:
        'Briefly describe the selected product for carbon accounting and the company, and outline the highlights of your emissions reduction, offsetting and communication plans.',
      upload: 'Upload outcomes materials',
    },
  },
};
