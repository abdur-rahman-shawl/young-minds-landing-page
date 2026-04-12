type MentorRoleName = 'admin' | 'mentor' | 'mentee' | string;

type MentorDetailLike = {
  email?: string | null;
  phone?: string | null;
  resumeUrl?: string | null;
  userEmail?: string | null;
};

export function canBrowseMentorDirectory(roleNames: readonly MentorRoleName[]) {
  return roleNames.includes('mentee') || roleNames.includes('admin');
}

export function canAccessMentorOperations(roleNames: readonly MentorRoleName[]) {
  return roleNames.includes('mentor') || roleNames.includes('admin');
}

export function sanitizeMentorDetailForViewer<T extends MentorDetailLike>(
  mentor: T,
  isAdmin: boolean
) {
  if (isAdmin) {
    return mentor;
  }

  return {
    ...mentor,
    email: null,
    phone: null,
    resumeUrl: null,
    userEmail: null,
  };
}
