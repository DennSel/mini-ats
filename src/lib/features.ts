export const FEATURES = {
  teamRoleChange: true, // 09 #13
  teamRemoveMember: true, // 09 #13
  adminEditUser: true, // 09 #14
  adminDeleteUser: true, // 09 #14
  jobAccess: true, // 09 #16
  // 09 #15 (CV upload): keep off until 0005_resume_upload.sql has run in the dev project.
  resumeUpload: false,
} as const;
