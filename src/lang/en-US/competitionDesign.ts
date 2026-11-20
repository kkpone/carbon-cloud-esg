import awardDetails from './competitionAwards';
import partnerSection from './competitionPartners';
import rules from './competitionRules';
import legal from './competitionLegal';

export default {
  phoneVerificationRequired:
    'First link the same phone number as your registration in account settings, then retry linking your carbon account.',
  registrationMobileLocked:
    'Your registration phone number is saved. Contact competition support to correct it.',
  registrationMobileHint:
    'Used for competition contact. Email accounts can register without linking a phone first. Linking an existing roster entry or carbon account requires a verified phone number.',
  registrationMobileInvalid: 'Enter a valid 11-digit mobile number',
  registrationMobileRequired: 'Enter your contact mobile number',
  bannerTitle: 'China Carbon Management Award',
  bannerEnglishTitle: '2026 China Carbon Management Award',
  bannerDescription:
    'Put carbon management into practice with AI and explore new paths to a greener future.',
  bannerHighlights: [
    { title: 'Two tracks', description: 'Companies & individuals' },
    { title: 'CNY 10,000', description: 'Cash prizes' },
    { title: 'Carbon Agent', description: 'Participant benefits' },
  ],

  invitationLead: 'invites you to join',
  invitationCompetitionTitle: 'China Corporate Carbon Management Competition!',
  invitationIndependentBadge: 'Own entry',
  invitationContinue: 'Continue',

  enterpriseDuplicate:
    'This company already has a competition team. Each company may enter one team. Contact your company’s team organizer or the competition assistant for help.',
  registrationDeadlineLabel: 'Registration deadline (Beijing time): {date}',
  taskDraft: 'Draft, not submitted',

  partnerSection,
  awardDetails,
  rules,
  legal,
  trackLabel: 'Track',
  trackNotSelected: 'Not selected',
  participationInfo: 'Individual entry details',
  participantAccount: 'Participant account',
  individualRegistered: 'Registered',
  reviewPendingTitle: 'Under review',
  reviewRejectedTitle: 'Changes required',
  reviewApprovedHint:
    'Your company has been approved. Add your team members to complete registration.',
  editInformation: 'Edit information',
  refreshStatus: 'Refresh status',
  inviteFriends: 'Invite friends',
  personalInviteHint:
    'Each eligible new entrant you invite adds 2% to your personal score bonus, up to 10%.',
  inviteRecordCount: '{count} records',
  noInvites: 'No invitations yet. Invite friends to join the competition.',
  invitee: 'Invitee',
  enrollmentStatus: 'Registration status',
  notRegistered: 'Not registered',
  inviteTeamPending: 'Approved · Team registration pending',
  inviteTeamPendingBonus:
    'Eligible invitations count toward the bonus after the team completes registration.',
  removedCanRegister:
    'You have been removed from your previous team. Before registration closes, you can register individually or create your own enterprise team.',
  memberOtherTeam:
    'This phone number belongs to another enterprise team and cannot be added to this team.',
  memberIndividualRegistered:
    'This phone number is registered in the individual track and cannot join an enterprise team.',
  memberAlreadyInTeam:
    'This phone number is already on your team roster. There is no need to add it again.',
  memberRemovedOtherTeam:
    'This member was removed from their previous team. They can register individually or create their own enterprise team, but cannot be added directly to another team.',
  notCounted: 'Not counted',
  individualSuccessHint:
    'You have registered for the individual track. Visit My tasks to view your competition tasks.',

  individualAccountHint:
    'Enter your contact mobile number. Email accounts can register directly.',
  individualConfirm: 'Confirm registration',

  invitationEmployeeTitle: 'Join the {team} competition team?',
  invitationEmployeeHint:
    'Only employees of this company may join. Confirm that you work for this company and enter your contact mobile number. Team members also enter the individual ranking; no separate entry is needed.',
  invitationDeadline: ' Members can join until {date}.',
  invitationConfirm: 'Confirm and join',

  invitationUnavailable:
    'The inviter’s team is not approved, full or closed. You may register independently while registration is open.',
  invitationBadge: 'Decarbonize together · Create a net-zero future',
  invitationTitle:
    '{name} invites you to the first China Enterprise Carbon Management Competition!',
  invitationDescription:
    'Enter as a company team or an individual, develop practical carbon management skills and compete for awards and participant benefits. Eligible registration through this link also contributes to your inviter’s personal score bonus.',
  invitationAccept: 'Join now',
  invitationLater: 'Explore the competition',
  invitationChoose: 'Choose how to participate',
  invitationJoin: 'Join the inviter’s company team',
  invitationJoinHint:
    'For employees of this company: join its team and complete enterprise-track tasks together.',
  invitationIndependent: 'Register independently',
  invitationIndependentHint:
    'Create a team for your own company or enter the individual track.',

  registrationDetails: 'Registration benefits and invitations',
  membersStep: 'Team members',
  membersTitle: 'Competition team members (3–10 people)',
  membersHint:
    'Please ensure all team members have completed account and competition registration.',
  membersCount: 'Members {count} / 10',
  accountStatus: 'Account status',
  accountRegistered: 'Registered',
  accountUnregistered: 'Not registered',
  accountChecking: 'Checking',
  accountUnchecked: 'Not checked',
  memberInvalid: 'Enter a name and a valid 11-digit mobile number.',
  memberConflict:
    'This phone number is already registered for the competition.',
  memberCheckFailed:
    'Unable to check this member right now. Please use “Check again” later.',
  duplicateMobile: 'Each mobile number can appear only once on the team.',
  inviter: 'Invited by',
  inviteBonus: 'Invite bonus',
  memberPersonalBonus: 'Personal bonus',
  memberPersonalBonusHint:
    'Each of this member’s own eligible invitations adds 2% to their individual score bonus, up to 10%. Further invitations do not increase the bonus once the cap is reached.',
  currentTeamBonus: 'Current team bonus:',
  currentTeamBonusHint:
    'Each eligible registered roster member beyond five adds 2%, up to 10%, after team registration. Unsaved roster changes are not included.',
  inviteBannerTitle: 'Invite friends to practise carbon management',
  inviteBannerHint:
    'Invite more people to the competition. Successful registrations can earn a score bonus.',
  copyInvite: 'Copy invitation link',
  addMember: 'Add member (up to 10)',
  captainRole: 'Captain',
  memberRole: 'Member',
  confirmTeamTitle: 'Confirm your team registration?',
  confirmTeamHint:
    'Check each member’s name and mobile number. Submission completes enterprise-track registration. You may edit members and invite friends before registration closes.',
  confirmTeamNotice:
    'Remind team members to register for Carbon Agent using the mobile number on the roster.',
  registrationSuccess: 'Enterprise registration successful!',
  registrationSuccessHint:
    'Your team registration is complete. Ask unregistered members to create a Carbon Agent account with their roster number. You may edit the roster before registration closes and invite friends before the invitation deadline.',
  qualificationSubmitted: 'Company information submitted!',
  qualificationSubmittedHint:
    'We are reviewing your company details and expect to respond within 48 hours. Once approved, you can add team members.',
  understood: 'Got it',
  confirmAction: 'Confirm submission',
  minimumMembers:
    'Enter and validate at least 3 members, including the captain, before submitting.',
  checkAgain: 'Check again',
  nameFor: 'Member {index} name',
  phoneFor: 'Member {index} mobile number',
  saveRoster: 'Save roster draft',
  registrationComplete: 'Team registration submitted',

  hot: 'Hot',
  title: 'China Enterprise Carbon Management Competition',
  backHome: 'Back to competition home',
  intro: 'Overview',
  register: 'Registration',
  tasks: 'My tasks',
  results: 'Results',
  chooseTrack: 'Choose your competition track',
  chooseTrackHint:
    'Choose the enterprise or individual track based on how you will participate.',
  enterprise: 'Enterprise',
  individual: 'Individual',
  enterpriseSize: 'Teams of 3–10',
  individualSize: 'One participant',
  audience: 'Who can enter',
  method: 'Calculation data',
  individualTaskLabel: 'Competition tasks',
  task: 'Competition tasks',
  registerNow: 'Register now',
  enterpriseAudience:
    'Open to all industries; form a team within your company.',
  individualAudience:
    'Students, carbon management and consulting professionals, and anyone interested in carbon management.',
  enterpriseMethod: 'Use real company data or the official competition papers.',
  individualMethod: 'Use the official individual-track paper.',
  enterpriseTask:
    'Complete product footprints, corporate inventories and carbon account check-ins. Finalists present reduction, offsetting, communication and disclosure plans.',
  individualTask:
    'Use Carbon Agent to complete the assigned product footprint and corporate inventory, and participate in carbon account check-ins.',
  trackNoticeLabel: 'Special note: {notice}',
  trackNotice:
    'Enterprise team members are automatically included in the individual-track rankings; no separate registration is needed. Participants already registered in the individual track cannot join an enterprise team.',
  profile: 'Participant details',
  companyInfo: 'Company information',
  companyHint:
    'Enter accurate company details for review by the competition team. Add members once approved.',
  companyPlaceholder: 'Full company name on the business license',
  creditPlaceholder:
    'Enter the 18-character credit code on the business license',
  creditInvalid:
    'Enter exactly 18 letters or digits, as shown on your business license.',
  namePlaceholder: 'Participant’s full name',
  next: 'Next',
  previous: 'Back',
  uploadImage: 'Upload image',
  reupload: 'Replace file',
  deleteFile: 'Delete',
  removeMemberTitle: 'Remove this member?',
  removeMemberHint: 'This member will be removed from the current roster.',
  fileSize: 'File size: {size}',
  fileHint: 'PDF, JPG or PNG, up to 10 MB',
  logoHint: 'A clear PNG image is recommended',
  logoTooltip:
    'Your company logo will be used to identify your competition entry and produce competition materials. By submitting it, you authorize the organizer to use it for these purposes.',
  fileInvalid: 'Choose a supported file format no larger than 10 MB.',
  uploaded: 'Uploaded',
  preview: 'View file',
  reviewPending:
    'Company details submitted. Please watch for the qualification review result.',
  reviewApproved: 'Approved',
  reviewRejected:
    'Your company application was not approved. Address the rejection reason and resubmit, or contact competition support for help.',
  groupHint: 'Competition updates, training resources and participant support.',
  assistantHint:
    'Help with registration, teams, competition rules and task submissions.',
  contact: 'Participant support',
  qrPending: 'QR code to be announced',
  goalsTitle: 'Competition goals',
  goalsHint:
    'Build carbon management capabilities, share effective practices and support industry collaboration through real-world tasks and professional evaluation.',
  background: [
    'As global climate risks intensify, carbon management is becoming a core business capability that affects market access, supply-chain partnerships, green procurement, ESG assessments and brand competitiveness.',
    'As China develops its carbon peaking and neutrality policies, national carbon market and product carbon footprint management system, the question for businesses is shifting from whether to manage carbon to how to measure accurately, reduce effectively, engage others and communicate clearly.',
    'Many businesses still face weak data foundations, inconsistent accounting methods, reduction efforts disconnected from operations and limited supply-chain collaboration.',
    'This initiative aims to build a national platform for practical carbon management. Through real-world tasks, professional evaluation and shared case studies, it will recognize outstanding companies and low-carbon practices, share replicable climate-transition experience, and help businesses build systematic, credible and lasting carbon management capabilities.',
  ],
  goals: [
    {
      title: 'Build a professional evaluation framework',
      text: 'Cover carbon accounting, reduction, engagement, offsetting and communication.',
    },
    {
      title: 'Recognize outstanding low-carbon practices',
      text: 'Recognize exemplary companies, individuals and low-carbon outcomes.',
    },
    {
      title: 'Share proven practical outcomes',
      text: 'Collect successful cases and help others replicate low-carbon practices.',
    },
    {
      title: 'Support supply-chain decarbonization',
      text: 'Enable upstream and downstream businesses to collaborate on carbon data and reduction.',
    },
    {
      title: 'Support greener business growth',
      text: 'Support ESG disclosure, green procurement and brand communication.',
    },
    {
      title: 'Build a low-carbon ecosystem',
      text: 'Bring together policy, industry, academia and wider society.',
    },
  ],
  mechanism: 'How the competition works',
  mechanismHint:
    'The CREOS framework evaluates competition outcomes across five dimensions: calculating emissions, reducing emissions, engaging the value chain, high-quality offsetting, and disclosure and communication.',
  rulesPending: 'The full competition rules will be announced soon.',
  fullRules: 'View competition rules',
  stages: 'Competition stages',
  preliminary: 'Preliminary | C + E',
  preliminaryNote: '(Preliminary round and individual final)',
  preliminaryHint:
    'Complete product footprints, corporate inventories and low-carbon check-ins.',
  final: 'Final | R + O + S',
  finalHint:
    'Qualified companies submit reduction, offsetting, and disclosure and communication plans for expert review and defense.',
  dimensions: [
    {
      title: 'Measure emissions',
      text: 'Complete product footprints and corporate inventories as the first step in carbon management.',
    },
    {
      title: 'Reduce emissions',
      text: 'Develop scientifically sound, achievable emission reduction pathways.',
    },
    {
      title: 'Engage participants',
      text: 'Join carbon account check-ins and engage employees and upstream and downstream partners in reducing emissions together.',
    },
    {
      title: 'High-quality offsets',
      text: 'Plan high-quality carbon credit offsets for unavoidable emissions.',
    },
    {
      title: 'Disclose and communicate',
      text: 'Communicate and disclose carbon management outcomes to strengthen sustainability impact.',
    },
  ],
  awards: 'Competition awards',
  awardNotice:
    'Final awards, selection criteria and benefits are subject to the official competition rules.',
  enterpriseAwards: [
    'Access to the UN Climate Change Conference COP32 Blue Zone',
    'SGS/CEC certification services',
    'Company feature in World Environment magazine',
    'Carbon Agent annual membership',
    'Training places at SynTao ESG Academy',
    'Carbon Neutrality Resource Library membership',
    'Outstanding case collection and For Good Award recommendations',
    'Trophies and certificates',
  ],
  individualAwards: [
    'Cash prizes of CNY 10,000',
    'Carbon Agent annual membership',
    'Competition certificates of recognition',
    'Carbonstop internship recommendations (students only)',
    'Low Carbon Hero shopping vouchers',
  ],
  contributionAward: 'Special contribution award',
  contributionAwardHint:
    'Recognizing companies and individuals for outstanding emission reductions, green innovation and encouraging low-carbon action.',
  moreBenefits: 'More participant benefits',
  benefitsHint:
    'Participants can access professional training and Carbon Agent membership benefits. Paying users can receive 1,000 points.',
  timeline: 'Competition timeline',
  timelineHint: 'Please refer to official notices for the final schedule.',
  schedulePending: 'Schedule to be announced',
  partners: 'Competition organizers and expert team',
  timelineNodes: {
    registrationOpen: {
      title: 'Registration opens',
      description:
        'Enterprise and individual registration opens until {deadline}.',
    },
    training: {
      title: 'Pre-competition training',
      description:
        'Learn the rules, carbon accounting methods and Carbon Agent workflows.',
    },
    registrationClose: {
      title: 'Registration closes',
      description: 'The registration window closes.',
    },
    product: {
      title: 'Preliminary: product footprint',
      description:
        'Complete and submit the product footprint and participate in carbon account check-ins.',
    },
    enterprise: {
      title: 'Preliminary: corporate inventory',
      description:
        'Complete and submit the corporate inventory and continue carbon account check-ins.',
    },
    review: {
      title: 'Preliminary review',
      description: 'Review preliminary submissions and confirm the finalists.',
    },
    preliminary: {
      title: 'Preliminary qualifiers announced',
      description: 'Publish the enterprise finalists and individual rankings.',
    },
    final: {
      title: 'Final preparation and defense',
      description:
        'Finalists prepare reduction, offsetting and presentation materials for the online defense.',
    },
    results: {
      title: 'Final results announced',
      description:
        'Announce award recipients and showcase outstanding competition outcomes.',
    },
  },
  phaseNames: {
    REGISTRATION: 'Registration',
    INVITATION: 'Invitations',
    ACCOUNT_REGISTRATION: 'Account registration',
    C_PRODUCT: 'Product footprint',
    C_ENTERPRISE: 'Corporate inventory',
    E_CHECKIN: 'Low-carbon check-ins',
    PRELIMINARY: 'Preliminary review and results',
    FINAL: 'Final',
    RESULTS: 'Results',
  },

  benefitOpening:
    'Your benefits are being activated. Please watch for updates.',

  benefitOpened: 'Your competition benefits are active.',

  benefitPending:
    'Your benefits require processing. Check their status under Registration.',

  individualSuccessTitle: 'Individual registration successful!',

  invitationBack: 'Back to selection',

  memberViewHint:
    'Please ensure all team members have completed account and competition registration.',

  copyPersonalInvite: 'Copy my invitation link',

  submitTeam: 'Submit team registration',

  saveMemberChanges: 'Save member changes',

  registerEnterprise: 'Enter the enterprise track',

  registerIndividual: 'Enter the individual track',

  teamRequirements: 'Team requirements',

  teamRequirementsHint: 'Each company may enter one team of 3–10 employees.',

  individualRequirements: 'Entry requirements',

  individualRequirementsHint:
    'No team is needed. Sign in to Carbon Agent and enter your contact mobile number to register.',

  awardsHint:
    'Both tracks offer gold, silver and bronze awards, with recognition and benefits for outstanding entrants.',

  welcomeTitle:
    'The first China Enterprise Carbon Management Competition is open!',

  welcomeSubtitle: 'Register for exclusive benefits and a chance to win',

  welcomeAwardsTitle: 'Cash prizes of RMB 10,000!',

  welcomeAwardsHint:
    'Both tracks offer gold, silver and bronze awards, plus certificates of recognition.',

  welcomeBenefitsTitle: 'Participant benefits',

  welcomeBenefitsHint:
    'Non-paying users receive a one-month Personal plan. Paying users receive 1,000 points valid for one month.',

  welcomeInviteHint:
    'Eligible friend referrals add up to 10% to your personal score multiplier.',

  welcomeRegister: 'Join now',

  welcomeDetails: 'Explore the competition',

  invitationPending: 'Pending activation',
  invitationBonusCapped: 'Bonus cap reached',
  invitationReviewPending: 'Pending verification',
};
