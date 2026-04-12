interface SessionAccessInput {
  actorUserId: string;
  mentorId: string;
  menteeId: string;
  isAdmin: boolean;
}

export function canViewSessionDetail(input: SessionAccessInput) {
  if (input.isAdmin) {
    return true;
  }

  return (
    input.actorUserId === input.mentorId || input.actorUserId === input.menteeId
  );
}
