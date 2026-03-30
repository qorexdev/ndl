const icons = {
  globe:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 3C8.14 3 5 6.14 5 10c0 2.67 1.42 5 3.56 6.32L9 18h6l.44-1.68C17.58 15 19 12.67 19 10 19 6.14 15.86 3 12 3zM8 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM13 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z"/><rect x="9" y="18" width="2.5" height="3" rx="0.5"/><rect x="12.5" y="18" width="2.5" height="3" rx="0.5"/></svg>',
  list:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>',
  trophy:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4V2H6v2H2v3c0 2.97 2.16 5.43 5 5.91V15H5v2h14v-2h-2v-2.09c2.84-.48 5-2.94 5-5.91V4h-4zm-9 7.82C7.16 11.4 6 9.86 6 8V6h3v5.82zM15 15H9v-2.09c.33.06.66.09 1 .09h4c.34 0 .67-.03 1-.09V15zm3-3.18V6h3v2c0 1.86-1.16 3.4-3 3.82z"/></svg>',
  shield:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3zm-1 14-4-4 1.41-1.41L11 13.17l5.59-5.59L18 9l-7 7z"/></svg>',
  upload:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5zm7-18-5.5 5.5 1.42 1.42L11 5.84V16h2V5.84l3.08 3.08 1.42-1.42z"/></svg>',
  book:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H8a4 4 0 0 0-4 4v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 18H8V6h10z"></path><path d="M8 2v4H6a2 2 0 0 1 2-2z"></path></svg>',
  user:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5z"/></svg>',
  spark:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="m13 3 1.7 4.3L19 9l-4.3 1.7L13 15l-1.7-4.3L7 9l4.3-1.7zM5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9zm13 2 .9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z"/></svg>',
  arrowRight:
    '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m13 5 7 7-7 7"></path></svg>',
  search:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
  check:
    '<svg class="inline-icon" viewBox="0 0 24 24" fill="currentColor"><path d="m9 16.17-3.88-3.88L3.7 13.7 9 19l12-12-1.41-1.41z"/></svg>',
  lock:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Zm-6 8.73V18h2v-1.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 1 1 4 0v2Z"/></svg>',
  mail:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5Z"/></svg>',
  plus:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>',
  image:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5a2 2 0 0 0-2-2H5C3.89 3 3 3.9 3 5v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2ZM8.5 11.5l2.5 3.01 3.5-4.51L19 16H5l3.5-4.5Z"/></svg>',
  settings:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="m19.14 12.94.04-.94-.04-.94 2.03-1.58a.5.5 0 0 0 .12-.63l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42L9.16 5.3c-.57.23-1.11.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.62 8.82a.5.5 0 0 0 .12.63l2.03 1.58-.04.97.04.94-2.03 1.58a.5.5 0 0 0-.12.63l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.57-.23 1.11-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.63l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>',
  logout:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67z"></path><path d="M19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"></path></svg>',
  video:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V6c0-1.1-.9-2-2-2H5C3.89 4 3 4.9 3 6v12c0 1.1.89 2 2 2h10c1.1 0 2-.9 2-2v-4.5l4 4v-11l-4 4Z"/></svg>',
  chart:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v18h18v-2H5V3H3Zm14 12 4-5 1.5 1.2-5.5 6.8-4-4-3 3-1.5-1.5 4.5-4.5 4 4Z"/></svg>',
  flag:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h10l-1 4 1 4H8v10H6z"/></svg>',
  discord:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.88-1.52.08.08 0 0 0-.08.04c-.21.37-.44.86-.61 1.25a18.3 18.3 0 0 0-5.49 0c-.16-.39-.41-.88-.62-1.25a.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13 13 0 0 1-1.87-.89.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.08.08 0 0 1 .08-.01 17.3 17.3 0 0 0 12.06 0 .07.07 0 0 1 .08.01c.12.1.25.2.37.29a.08.08 0 0 1-.01.13 12.3 12.3 0 0 1-1.87.89.08.08 0 0 0-.04.11c.36.69.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.7 19.7 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03Z"/></svg>',
  telegram:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0Zm5.89 8.22-1.97 9.28c-.15.66-.54.82-1.08.51l-3-2.21-1.45 1.39c-.14.18-.36.3-.6.3h-.01l.22-3.05 5.56-5.02c.24-.21-.06-.33-.37-.12L8.3 13.62l-2.96-.92c-.64-.2-.66-.64.13-.95l11.57-4.46c.54-.2 1.01.13.83.94Z"/></svg>',
  x:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12Z"/></svg>',
  sun: '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85 1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2h3zM4 11v2H1v-2h4z"/></svg>',
  moon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 7a7 7 0 0 0 12 4.9v.1c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2h.1A6.979 6.979 0 0 0 10 7zm-6 5a8 8 0 0 0 15.062 3.762A9 9 0 0 1 8.238 4.938 7.999 7.999 0 0 0 4 12z"/></svg>',
  bell:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
  chevron:
    '<svg class="chevron-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>',
  github:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.2-.1-.3-.6-1.5.1-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6.2 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>',
  translate:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17A15.44 15.44 0 0 1 11 11.93c-.64-1-1.2-2.07-1.6-3.24H7.32c.46 1.51 1.16 2.97 2.04 4.33l-3.84 3.78L7 18l4-4 2.12 2.12.75-1.05zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33 1.62 4.33h-3.24z"/></svg>',
  share:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>',
  moreHoriz:
    '<svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
};

export const translations = {
  en: {
    siteName: "Nerfed DemonList",
    siteShort: "NDL",
    siteTagline: "The definitive list of nerfed Geometry Dash demon levels.",
    navList: "List",
    navLeaderboard: "Leaderboard",
    navSubmit: "Submit",
    navRules: "Rules",
    navModeration: "Moderation",
    navAccount: "Account",
    footerText: "A ranked list of nerfed Geometry Dash demon levels with player records and leaderboards.",
    footerBuilt: "Community-driven project with accounts, submissions and staff tools.",
    footerDev: "Developer",
    footerMod: "Head Moderator",
    footerContacts: "contacts",
    footerChannel: "Telegram Channel",
    langRu: "RU",
    langEn: "EN",
    pageHome: "Home",
    pageList: "List",
    pageLeaderboard: "Leaderboard",
    pageRules: "Rules",
    pageSubmit: "Submit",
    pageModeration: "Moderation",
    pageAccount: "Account",
    pageLevel: "Level",
    pageApi: "API",
    loading: "Loading...",
    errorLoad: "Could not load data from the server.",
    noAccess: "You do not have access to this section.",
    backToList: "Back to list",
    createdBy: "Created by",
    verifiedBy: "Verified by",
    basedOn: "Based on",
    openLevel: "Open level",
    listEmpty: "There are no levels yet.",
    listEmptyHint: "Moderators can add the first level from the moderation page.",
    homeTitle: "Nerfed DemonList — the ranked list of nerfed GD demons.",
    homeText:
      "NDL tracks nerfed versions of Geometry Dash demon levels, player records and leaderboards. Submit your records, climb the rankings!",
    homeActionPrimary: "Open the list",
    homeActionSecondary: "Open account",
    recentChanges: "Recent changes",
    recentChangesEmpty: "No activity yet.",
    whyTitle: "How it works",
    heroUsers: "Users",
    heroRecords: "Records",
    heroLevels: "Levels",
    featureAccountsTitle: "Player accounts",
    featureAccountsText: "Register, track your records and climb the leaderboard. Your country flag and stats are shown publicly.",
    featureModerationTitle: "Staff-verified levels",
    featureModerationText: "Every nerfed level is reviewed and published by the staff with full metadata, IDs and verification videos.",
    featureDynamicSubmitTitle: "Submit records",
    featureDynamicSubmitText: "Submit your completions with video proof and raw footage. Staff reviews and approves records.",
    playerLeaderboard: "Player leaderboard",
    countryLeaderboard: "Country leaderboard",
    leaderboardSearch: "Search players or countries...",
    profilePlaceholder: "Select a player or country to view details.",
    acceptedCompletions: "Accepted completions",
    hardest: "Hardest level",
    accountCountry: "Country",
    score100: "Score (100%)",
    activePlayers: "Active players",
    records: "Records",
    topPlayer: "Top player",
    rulesTitle: "NDL Rules",
    rulesIntro: "These rules define how NDL accepts nerfs, records, raw footage and moderation decisions.",
    rulesSidebar: "Sections",
    submitTitle: "Submit to NDL",
    submitIntro: "Submissions are tied to your account. Google Drive raw footage is always required.",
    signInRequired: "Sign in to submit records, level applications and verifications.",
    signInAction: "Open account page",
    submissionType: "Submission type",
    typeRecord: "Record",
    typeLevel: "New level application",
    typeVerification: "Verification",
    fieldLevelSelect: "Level",
    fieldProgress: "Progress",
    fieldRawUrl: "Raw footage URL",
    fieldVideoUrl: "Video URL",
    fieldNotes: "Notes",
    fieldProposalName: "Proposed nerfed level name",
    fieldOriginalName: "Original level name",
    fieldOriginalPlacement: "Approximate placement in Global Demon List",
    fieldSimilarity: "Gameplay similarity %",
    fieldPreviewImageUrl: "Preview image URL",
    submitButton: "Send submission",
    submitSuccess: "Submission added to the moderation queue.",
    submitNoLevels: "There are no levels in the list yet, so record submissions are unavailable.",
    submitDriveRule: "Raw footage must be a Google Drive link.",
    moderationTitle: "Moderator Control Room",
    moderationIntro: "Create level entries, review submissions and manage roles from one place.",
    moderationStats: "Queue stats",
    queueTitle: "Submission queue",
    queueEmpty: "There are no submissions right now.",
    approve: "Approve",
    reject: "Reject",
    ban: "Ban",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    banned: "Banned",
    rawReady: "Raw ready",
    levelEditorTitle: "Level editor",
    createLevel: "Create level",
    updateLevel: "Update level",
    createLevelIntro: "Moderators manually add full level info, IDs, YouTube verification and artwork.",
    fieldLevelName: "Nerfed level name",
    fieldCreatorNickname: "Creator nickname",
    fieldVerifierNickname: "Verifier nickname",
    fieldRank: "List rank",
    fieldSegment: "Segment",
    fieldNerfedId: "Nerfed level ID",
    fieldOriginalId: "Original level ID",
    fieldPassword: "Password",
    fieldLength: "Length",
    fieldObjects: "Objects",
    fieldVersion: "Version",
    fieldSongUrl: "Song URL",
    fieldVerificationUrl: "Verification YouTube URL",
    fieldThumbnailUrl: "Level image URL",
    fieldRequiredProgress: "Minimum list progress",
    fieldScoreProgress: "Record score",
    fieldDescriptionRu: "Description (RU)",
    fieldDescriptionEn: "Description (EN)",
    createLevelSuccess: "Level saved successfully.",
    usersTitle: "Accounts and roles",
    rolePlayer: "Player",
    roleModerator: "Moderator",
    roleAdmin: "Admin",
    accountAuthTitle: "Account access",
    accountAuthText: "Register a new account or sign in with your nickname/email and password.",
    loginTitle: "Sign in",
    registerTitle: "Create account",
    fieldIdentifier: "Nickname or email",
    fieldEmail: "Email",
    fieldPassword: "Password",
    fieldCurrentPassword: "Current password",
    fieldNewPassword: "New password",
    fieldNickname: "Nickname",
    fieldCountry: "Country",
    fieldAvatarUrl: "Avatar URL",
    fieldBioRu: "Bio (RU)",
    fieldBioEn: "Bio (EN)",
    fieldTwoFactorCode: "",
    enableTwoFactor: "",
    loginButton: "Sign in",
    registerButton: "Register",
    logoutButton: "Log out",
    saveProfile: "Save profile",
    changePassword: "Change password",
    passwordChanged: "Password updated.",
    profileSaved: "Profile updated.",
    accountPanelTitle: "Profile",
    accountSubmissions: "Your submissions",
    accountEmptySubmissions: "You have no submissions yet.",
    twoFactorSetupTitle: "",
    twoFactorSecret: "",
    twoFactorRecovery: "",
    twoFactorHint: "",
    fieldOriginalTop: "Approx. top in Global Demon List",
    fieldImage: "Level image",
    fieldVerificationVideo: "Verification video",
    levelMetaNerfedId: "Nerfed level ID",
    levelMetaOriginalId: "Original level ID",
    levelMetaOriginalTop: "Approx. top in Global Demon List",
    gdBrowser: "GD Browser",
    song: "Song",
    levelRecordsEmpty: "There are no accepted records yet.",
    positionHistory: "Position history",
    segmentMain: "Main",
    segmentExtended: "Extended",
    segmentLegacy: "Legacy",
    managementEmptyUsers: "No additional accounts yet.",
    pageAccounts: "Accounts",
    pageSubmissions: "Submissions",
    navAccounts: "Accounts",
    navSubmissions: "Submissions",
    fieldMinProgress: "Minimum progress %",
    fieldMinProgressScore: "Points at minimum progress",
    deleteRecord: "Delete",
    deleteRecordConfirm: "Delete this record?",
    createFromSubmission: "Create level from submission",
    banUser: "Ban",
    unbanUser: "Unban",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationPage: "Page",
    searchPlaceholder: "Search...",
    sortBy: "Sort by",
    filterByStatus: "Filter by status",
    filterByType: "Filter by type",
    allStatuses: "All statuses",
    allTypes: "All types",
    submissionId: "ID",
    navNotifications: "Notifications",
    notifEmpty: "No notifications",
    notifOpen: "Open",
    notifMarkRead: "Mark all as read",
    navMore: "More",
    navSocials: "Socials",
  },
  ru: {
    siteName: "Nerfed DemonList",
    siteShort: "NDL",
    siteTagline: "Лист занерфленных демонов Geometry Dash.",
    navList: "Лист",
    navLeaderboard: "Лидерборд",
    navSubmit: "Заявки",
    navRules: "Правила",
    navModeration: "Модерация",
    navAccount: "Аккаунт",
    footerText: "Рейтинговый лист занерфленных демонов Geometry Dash с рекордами игроков и лидербордами.",
    footerBuilt: "Комьюнити-проект с аккаунтами, заявками и инструментами стаффа.",
    footerDev: "Разработчик",
    footerMod: "Главный модератор",
    footerContacts: "контакты",
    footerChannel: "Telegram-канал листа",
    langRu: "RU",
    langEn: "EN",
    pageHome: "Главная",
    pageList: "Лист",
    pageLeaderboard: "Лидерборд",
    pageRules: "Правила",
    pageSubmit: "Заявки",
    pageModeration: "Модерация",
    pageAccount: "Аккаунт",
    pageLevel: "Уровень",
    pageApi: "API",
    loading: "Загрузка...",
    errorLoad: "Не удалось загрузить данные с сервера.",
    noAccess: "У тебя нет доступа к этому разделу.",
    backToList: "Назад к листу",
    createdBy: "Создатель",
    verifiedBy: "Верифицировал",
    basedOn: "Основан на",
    openLevel: "Открыть уровень",
    listEmpty: "Уровней пока нет.",
    listEmptyHint: "Первый уровень можно добавить через страницу модерации.",
    homeTitle: "Nerfed DemonList — рейтинговый лист занерфленных GD демонов.",
    homeText:
      "NDL отслеживает занерфленные версии демон-уровней Geometry Dash, рекорды игроков и лидерборды. Отправляй свои рекорды и поднимайся в рейтинге!",
    homeActionPrimary: "Открыть лист",
    homeActionSecondary: "Открыть аккаунт",
    recentChanges: "Последние изменения",
    recentChangesEmpty: "Активности пока нет.",
    whyTitle: "Как это работает",
    heroUsers: "Пользователей",
    heroRecords: "Рекордов",
    heroLevels: "Уровней",
    featureAccountsTitle: "Аккаунты игроков",
    featureAccountsText: "Регистрируйся, отслеживай свои рекорды и поднимайся в лидерборде. Твоя страна и статы видны всем.",
    featureModerationTitle: "Проверенные уровни",
    featureModerationText: "Каждый нерф-уровень проверяется и публикуется стаффом с полными метаданными, ID и видео верификации.",
    featureDynamicSubmitTitle: "Отправка рекордов",
    featureDynamicSubmitText: "Отправляй свои прохождения с видео-доказательством и raw footage. Стафф проверяет и одобряет рекорды.",
    playerLeaderboard: "Лидерборд игроков",
    countryLeaderboard: "Рейтинг стран",
    leaderboardSearch: "Поиск по игрокам или странам...",
    profilePlaceholder: "Выбери игрока или страну, чтобы открыть подробности.",
    acceptedCompletions: "Принятых прохождений",
    hardest: "Самый сложный уровень",
    accountCountry: "Страна",
    score100: "Очки (100%)",
    activePlayers: "Активных игроков",
    records: "Рекорды",
    topPlayer: "Топ игрок",
    rulesTitle: "Правила NDL",
    rulesIntro: "Эти правила определяют, как NDL принимает нерфы, рекорды, raw footage и решения модерации.",
    rulesSidebar: "Разделы",
    submitTitle: "Заявка в NDL",
    submitIntro: "Все заявки привязываются к твоему аккаунту. Google Drive raw footage обязателен всегда.",
    signInRequired: "Чтобы отправлять рекорды, заявки на уровни и верификации, сначала войди в аккаунт.",
    signInAction: "Открыть страницу аккаунта",
    submissionType: "Тип заявки",
    typeRecord: "Рекорд",
    typeLevel: "Заявка на новый уровень",
    typeVerification: "Верификация",
    fieldLevelSelect: "Уровень",
    fieldProgress: "Прогресс",
    fieldRawUrl: "Ссылка на raw footage",
    fieldVideoUrl: "Ссылка на видео",
    fieldNotes: "Заметки",
    fieldProposalName: "Название предлагаемого нерф-уровня",
    fieldOriginalName: "Название оригинального уровня",
    fieldOriginalPlacement: "Примерное место в Global Demon List",
    fieldSimilarity: "Сходство геймплея %",
    fieldPreviewImageUrl: "Ссылка на превью-картинку",
    submitButton: "Отправить заявку",
    submitSuccess: "Заявка добавлена в очередь модерации.",
    submitNoLevels: "В листе пока нет уровней, поэтому отправка рекордов сейчас недоступна.",
    submitDriveRule: "Raw footage должен быть ссылкой Google Drive.",
    moderationTitle: "Центр модерации",
    moderationIntro: "Здесь модераторы создают уровни, проверяют заявки и управляют ролями.",
    moderationStats: "Статистика очереди",
    queueTitle: "Очередь заявок",
    queueEmpty: "Сейчас заявок нет.",
    approve: "Одобрить",
    reject: "Отклонить",
    ban: "Забанить",
    pending: "На проверке",
    approved: "Одобрено",
    rejected: "Отклонено",
    banned: "Бан",
    rawReady: "Raw есть",
    levelEditorTitle: "Редактор уровня",
    createLevel: "Создать уровень",
    updateLevel: "Обновить уровень",
    createLevelIntro: "Модераторы вручную добавляют полную инфу уровня, ID, YouTube-верификацию и картинку.",
    fieldLevelName: "Название нерф-уровня",
    fieldCreatorNickname: "Ник создателя",
    fieldVerifierNickname: "Ник верифера",
    fieldRank: "Позиция в листе",
    fieldSegment: "Сегмент",
    fieldNerfedId: "ID нерфнутого уровня",
    fieldOriginalId: "ID оригинального уровня",
    fieldPassword: "Пароль",
    fieldLength: "Длина",
    fieldObjects: "Объекты",
    fieldVersion: "Версия",
    fieldSongUrl: "Ссылка на саундтрек",
    fieldVerificationUrl: "YouTube-ссылка на верификацию",
    fieldThumbnailUrl: "Ссылка на картинку уровня",
    fieldRequiredProgress: "Минимальный прогресс для листа",
    fieldScoreProgress: "Очки за рекорд",
    fieldDescriptionRu: "Описание (RU)",
    fieldDescriptionEn: "Описание (EN)",
    createLevelSuccess: "Уровень успешно сохранён.",
    usersTitle: "Аккаунты и роли",
    rolePlayer: "Игрок",
    roleModerator: "Модератор",
    roleAdmin: "Админ",
    accountAuthTitle: "Доступ к аккаунту",
    accountAuthText: "Зарегистрируй новый аккаунт или войди по нику/почте и паролю.",
    loginTitle: "Вход",
    registerTitle: "Регистрация",
    fieldIdentifier: "Ник или почта",
    fieldEmail: "Почта",
    fieldPassword: "Пароль",
    fieldCurrentPassword: "Текущий пароль",
    fieldNewPassword: "Новый пароль",
    fieldNickname: "Ник",
    fieldCountry: "Страна",
    fieldAvatarUrl: "Ссылка на аватар",
    fieldBioRu: "Описание (RU)",
    fieldBioEn: "Описание (EN)",
    fieldTwoFactorCode: "",
    enableTwoFactor: "",
    loginButton: "Войти",
    registerButton: "Зарегистрироваться",
    logoutButton: "Выйти",
    saveProfile: "Сохранить профиль",
    changePassword: "Сменить пароль",
    passwordChanged: "Пароль обновлён.",
    profileSaved: "Профиль обновлён.",
    accountPanelTitle: "Профиль",
    accountSubmissions: "Твои заявки",
    accountEmptySubmissions: "У тебя пока нет заявок.",
    twoFactorSetupTitle: "",
    twoFactorSecret: "",
    twoFactorRecovery: "",
    twoFactorHint: "",
    fieldOriginalTop: "Примерное место в Global Demon List",
    fieldImage: "Картинка уровня",
    fieldVerificationVideo: "Видео верификации",
    levelMetaNerfedId: "ID нерфнутого уровня",
    levelMetaOriginalId: "ID оригинального уровня",
    levelMetaOriginalTop: "Место в Global Demon List",
    gdBrowser: "GD Browser",
    song: "Саундтрек",
    levelRecordsEmpty: "Принятых рекордов пока нет.",
    positionHistory: "История позиций",
    segmentMain: "Main",
    segmentExtended: "Extended",
    segmentLegacy: "Legacy",
    managementEmptyUsers: "Дополнительных аккаунтов пока нет.",
    pageAccounts: "Аккаунты",
    pageSubmissions: "Заявки",
    navAccounts: "Аккаунты",
    navSubmissions: "Заявки",
    fieldMinProgress: "Минимальный прогресс %",
    fieldMinProgressScore: "Очки при минимальном прогрессе",
    deleteRecord: "Удалить",
    deleteRecordConfirm: "Удалить этот рекорд?",
    createFromSubmission: "Создать уровень из заявки",
    banUser: "Забанить",
    unbanUser: "Разбанить",
    paginationPrev: "Назад",
    paginationNext: "Далее",
    paginationPage: "Страница",
    searchPlaceholder: "Поиск...",
    sortBy: "Сортировка",
    filterByStatus: "Фильтр по статусу",
    filterByType: "Фильтр по типу",
    allStatuses: "Все статусы",
    allTypes: "Все типы",
    submissionId: "ID",
    navNotifications: "Уведомления",
    notifEmpty: "Нет уведомлений",
    notifOpen: "Открыть",
    notifMarkRead: "Отметить все прочитанными",
    navMore: "Ещё",
    navSocials: "Соцсети",
  },
};

const pageTitles = {
  home: "pageHome",
  list: "pageList",
  leaderboard: "pageLeaderboard",
  rules: "pageRules",
  submit: "pageSubmit",
  moderation: "pageModeration",
  account: "pageAccount",
  level: "pageLevel",
  user: "pageAccount",
  api: "pageApi",
  accounts: "pageAccounts",
  submissions: "pageSubmissions",
};

const navConfig = [
  { id: "list", href: "/list", label: "navList", icon: "list" },
  { id: "leaderboard", href: "/leaderboard", label: "navLeaderboard", icon: "trophy" },
  { id: "submit", href: "/submit", label: "navSubmit", icon: "upload" },
  { id: "rules", href: "/rules", label: "navRules", icon: "book" },
  { id: "moderation", href: "/moderation", label: "navModeration", icon: "shield" },
  { id: "submissions", href: "/submissions", label: "navSubmissions", icon: "chart", modOnly: true },
  { id: "accounts", href: "/accounts", label: "navAccounts", icon: "user", modOnly: true },
];

export function getLang() {
  return window.localStorage.getItem("ndl-lang") || "en";
}

export function setLang(lang) {
  window.localStorage.setItem("ndl-lang", lang);
}

export function getTheme() {
  return window.localStorage.getItem("ndl-theme") || "dark";
}

export function setTheme(theme) {
  window.localStorage.setItem("ndl-theme", theme);
  document.documentElement.dataset.theme = theme;
}

export function t(key) {
  const lang = getLang();
  return translations[lang][key] ?? translations.en[key] ?? key;
}

export function localize(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const lang = getLang();
    return value[lang] ?? value.en ?? value.ru ?? "";
  }
  return value ?? "";
}

export function icon(name) {
  return icons[name] ?? "";
}

function pageTitle(page) {
  return `${translations[getLang()].siteShort} | ${t(pageTitles[page] || "pageHome")}`;
}

function backgroundGeometry() {
  return `<div class="bg-geometry" aria-hidden="true"></div>`;
}

function header(page) {
  const ch = icon("chevron");
  const listPages = ["list", "level", "leaderboard", "submit"];
  const morePages = ["rules", "api", "moderation", "submissions", "accounts"];

  return `
    <header>
      <a class="logo" href="/">
        <div class="logo-icon-wrap">
          ${icon("globe")}
        </div>
        <span class="logo-wordmark">${t("siteName").toUpperCase()}</span>
      </a>

      <nav class="nav-links" aria-label="Primary">
        <div class="nav-dropdown ${listPages.includes(page) ? "is-active" : ""}" id="navd-list">
          <button class="nav-dropdown-btn" data-dropdown="navd-list">
            ${icon("list")} ${t("navList")} ${ch}
          </button>
          <div class="nav-dropdown-menu">
            <a class="nav-dropdown-item" id="nav-list" href="/list">${icon("list")} ${t("navList")}</a>
            <a class="nav-dropdown-item" id="nav-leaderboard" href="/leaderboard">${icon("trophy")} ${t("navLeaderboard")}</a>
            <a class="nav-dropdown-item" id="nav-submit" href="/submit">${icon("upload")} ${t("navSubmit")}</a>
          </div>
        </div>

        <div class="nav-dropdown ${morePages.includes(page) ? "is-active" : ""}" id="navd-more">
          <button class="nav-dropdown-btn" data-dropdown="navd-more">
            ${icon("moreHoriz")} ${t("navMore")} ${ch}
          </button>
          <div class="nav-dropdown-menu">
            <a class="nav-dropdown-item" id="nav-rules" href="/rules">${icon("book")} ${t("navRules")}</a>
            <a class="nav-dropdown-item" id="nav-api" href="/api">${icon("chart")} API Docs</a>
            <hr class="nav-dropdown-divider is-hidden" data-mod-only />
            <a class="nav-dropdown-item is-hidden" id="nav-moderation" href="/moderation" data-mod-only>${icon("shield")} ${t("navModeration")}</a>
            <a class="nav-dropdown-item is-hidden" id="nav-submissions" href="/submissions" data-mod-only>${icon("chart")} ${t("navSubmissions")}</a>
            <a class="nav-dropdown-item is-hidden" id="nav-accounts" href="/accounts" data-mod-only>${icon("user")} ${t("navAccounts")}</a>
          </div>
        </div>

        <div class="nav-dropdown" id="navd-socials">
          <button class="nav-dropdown-btn" data-dropdown="navd-socials">
            ${icon("share")} ${t("navSocials")} ${ch}
          </button>
          <div class="nav-dropdown-menu">
            <a class="nav-dropdown-item" href="https://t.me/NDemonList" target="_blank" rel="noreferrer">${icon("telegram")} Telegram</a>
            <a class="nav-dropdown-item" href="https://github.com/qorexdev" target="_blank" rel="noreferrer">${icon("github")} GitHub</a>
          </div>
        </div>
      </nav>

      <div class="header-actions">
        <div class="nav-dropdown" id="navd-lang">
          <button class="nav-dropdown-btn nav-dropdown-btn--sm nav-dropdown-btn--icon" data-dropdown="navd-lang" aria-label="Language">
            ${icon("translate")} ${ch}
          </button>
          <div class="nav-dropdown-menu nav-dropdown-menu--right">
            <button class="nav-dropdown-item lang-btn ${getLang() === "en" ? "lang-active" : ""}" data-lang="en">🇬🇧 English</button>
            <button class="nav-dropdown-item lang-btn ${getLang() === "ru" ? "lang-active" : ""}" data-lang="ru">🇷🇺 Русский</button>
          </div>
        </div>

        <button class="icon-btn theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme">
          ${getTheme() === "dark" ? icon("sun") : icon("moon")}
        </button>

        <a class="icon-btn notif-bell ${page === "notifications" ? "active" : ""}" href="/notifications" id="notif-bell-btn" aria-label="${t("navNotifications")}">
          ${icon("bell")}
          <span class="notif-badge" id="notif-badge" style="display:none">0</span>
        </a>

        <a class="user-chip ${page === "account" ? "active" : ""}" href="/account">
          <span class="user-chip-avatar" id="shell-user-avatar">ND</span>
          <span class="user-chip-name" id="shell-user-label">${t("navAccount")}</span>
        </a>
      </div>
    </header>
  `;
}

function footer() {
  const githubIcon = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.2-.1-.3-.6-1.5.1-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6.2 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>`;
  const tgIcon = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.4l-2.948-.924c-.64-.203-.658-.64.135-.954l11.57-4.461c.537-.194 1.006.131.947.16z"/></svg>`;
  const year = new Date().getFullYear();
  return `
    <footer>
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <div class="footer-logo">${icon("globe")} ${t("siteName")}</div>
            <div class="footer-desc">${t("footerText")}</div>
          </div>
          <div class="footer-socials">
            <a class="footer-social" href="https://t.me/NDemonList" target="_blank" rel="noreferrer" aria-label="Telegram channel">${tgIcon}</a>
            <a class="footer-social" href="https://github.com/qorexdev/ndl" target="_blank" rel="noreferrer" aria-label="GitHub">${githubIcon}</a>
          </div>
        </div>
        <div class="footer-divider"></div>
        <div class="footer-bottom">
          <span class="footer-copy">© ${year} <a href="/" class="footer-domain">ndlist.space</a> · developed by <span class="footer-dev-link">qorex</span></span>
        </div>
      </div>
    </footer>
  `;
}

export function mountShell(page) {
  document.documentElement.lang = getLang();
  document.documentElement.dataset.theme = getTheme();
  document.title = pageTitle(page);

  const shell = document.getElementById("app-shell");
  shell.innerHTML = `
    ${backgroundGeometry()}
    ${header(page)}
    <main class="container site-main">
      <section class="page-view" id="page-content"></section>
    </main>
    ${footer()}
  `;
}

export function updateShellUser(user) {
  const labelNode = document.getElementById("shell-user-label");
  const avatarNode = document.getElementById("shell-user-avatar");

  if (labelNode) {
    labelNode.textContent = user?.nickname || t("navAccount");
  }

  if (avatarNode) {
    if (user?.avatarUrl) {
      avatarNode.innerHTML = `<img src="${user.avatarUrl}" alt="${user.nickname || "avatar"}" />`;
    } else {
      avatarNode.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" class="default-avatar-icon"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5z"/></svg>`;
    }
  }

  // Show/hide mod-only items
  document.querySelectorAll("[data-mod-only]").forEach((el) => {
    el.classList.toggle("is-hidden", !user || !["moderator", "admin"].includes(user.role));
  });
}

export function bindShellEvents(onChange) {
  // Dropdown toggle
  document.querySelectorAll(".nav-dropdown-btn[data-dropdown]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetId = btn.dataset.dropdown;
      const dropdown = document.getElementById(targetId);
      const isOpen = dropdown?.classList.contains("open");
      document.querySelectorAll(".nav-dropdown.open").forEach((d) => d.classList.remove("open"));
      if (dropdown && !isOpen) dropdown.classList.add("open");
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".nav-dropdown.open").forEach((d) => d.classList.remove("open"));
  });

  // Language buttons (now inside dropdown)
  document.querySelectorAll(".lang-btn[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextLang = button.dataset.lang;
      if (nextLang === getLang()) return;
      setLang(nextLang);
      onChange();
    });
  });

  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const nextTheme = getTheme() === "dark" ? "light" : "dark";
      setTheme(nextTheme);
      themeBtn.innerHTML = nextTheme === "dark" ? icon("sun") : icon("moon");
    });
  }
}

export function updateShellNav(page) {
  document.title = pageTitle(page);
  const listPages = ["list", "level", "leaderboard", "submit"];
  const morePages = ["rules", "api", "moderation", "submissions", "accounts"];

  document.getElementById("navd-list")?.classList.toggle("is-active", listPages.includes(page));
  document.getElementById("navd-more")?.classList.toggle("is-active", morePages.includes(page));

  // Update active item inside dropdowns
  document.querySelectorAll(".nav-dropdown-item[id]").forEach((a) => {
    const id = a.id.replace("nav-", "");
    a.classList.toggle("active", id === page || (page === "level" && id === "list"));
  });

  // User chip active
  const userChip = document.querySelector(".user-chip");
  if (userChip) userChip.classList.toggle("active", page === "account");
  // Bell active
  const bell = document.getElementById("notif-bell-btn");
  if (bell) bell.classList.toggle("active", page === "notifications");
}

export function renderLoading() {
  return `<div class="state-panel">${t("loading")}</div>`;
}

export function renderError(message) {
  return `<div class="state-panel error">${message || t("errorLoad")}</div>`;
}

export function formatDate(value) {
  const lang = getLang() === "ru" ? "ru-RU" : "en-US";
  return new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
