export type ReviewAudienceRole = 'mentor' | 'mentee';
export type ReviewerRole = 'mentor' | 'mentee';

export type ReviewSessionContext = {
  mentorId: string;
  menteeId: string;
};

export type ResolvedReviewContext = {
  reviewerRole: ReviewerRole;
  revieweeRole: ReviewAudienceRole;
  revieweeId: string;
  reviewFlag: 'isReviewedByMentor' | 'isReviewedByMentee';
};

export type WeightedReviewQuestion = {
  id: string;
  weight: string | number;
};

export type ReviewRatingInput = {
  questionId: string;
  rating: number;
};

export function resolveReviewContext(
  session: ReviewSessionContext,
  currentUserId: string
): ResolvedReviewContext | null {
  if (currentUserId === session.menteeId) {
    return {
      reviewerRole: 'mentee',
      revieweeRole: 'mentor',
      revieweeId: session.mentorId,
      reviewFlag: 'isReviewedByMentee',
    };
  }

  if (currentUserId === session.mentorId) {
    return {
      reviewerRole: 'mentor',
      revieweeRole: 'mentee',
      revieweeId: session.menteeId,
      reviewFlag: 'isReviewedByMentor',
    };
  }

  return null;
}

export function canRequestReviewQuestions(
  session: ReviewSessionContext,
  currentUserId: string,
  roleToReview: ReviewAudienceRole
) {
  const context = resolveReviewContext(session, currentUserId);

  return context?.revieweeRole === roleToReview;
}

export function calculateWeightedReviewScore(
  questions: WeightedReviewQuestion[],
  ratings: ReviewRatingInput[]
) {
  const questionWeightMap = new Map(
    questions.map((question) => [question.id, Number(question.weight)])
  );

  let finalScore = 0;

  for (const rating of ratings) {
    const weight = questionWeightMap.get(rating.questionId);

    if (weight === undefined) {
      throw new Error(
        `Invalid question ID ${rating.questionId} for this review type.`
      );
    }

    finalScore += rating.rating * weight;
  }

  return Number(finalScore.toFixed(2));
}
