import { describe, expect, it } from 'vitest';

import {
  calculateWeightedReviewScore,
  canRequestReviewQuestions,
  resolveReviewContext,
} from '@/lib/learning/reviews';

describe('resolveReviewContext', () => {
  it('resolves mentee review context correctly', () => {
    expect(
      resolveReviewContext(
        {
          mentorId: 'mentor-1',
          menteeId: 'mentee-1',
        },
        'mentee-1'
      )
    ).toEqual({
      reviewerRole: 'mentee',
      revieweeRole: 'mentor',
      revieweeId: 'mentor-1',
      reviewFlag: 'isReviewedByMentee',
    });
  });

  it('resolves mentor review context correctly', () => {
    expect(
      resolveReviewContext(
        {
          mentorId: 'mentor-1',
          menteeId: 'mentee-1',
        },
        'mentor-1'
      )
    ).toEqual({
      reviewerRole: 'mentor',
      revieweeRole: 'mentee',
      revieweeId: 'mentee-1',
      reviewFlag: 'isReviewedByMentor',
    });
  });

  it('returns null for non-participants', () => {
    expect(
      resolveReviewContext(
        {
          mentorId: 'mentor-1',
          menteeId: 'mentee-1',
        },
        'outsider-1'
      )
    ).toBeNull();
  });
});

describe('canRequestReviewQuestions', () => {
  const session = {
    mentorId: 'mentor-1',
    menteeId: 'mentee-1',
  };

  it('allows the mentee to request mentor review questions', () => {
    expect(canRequestReviewQuestions(session, 'mentee-1', 'mentor')).toBe(true);
  });

  it('blocks the mentee from requesting mentee review questions', () => {
    expect(canRequestReviewQuestions(session, 'mentee-1', 'mentee')).toBe(false);
  });
});

describe('calculateWeightedReviewScore', () => {
  it('calculates the weighted score using the question weights', () => {
    expect(
      calculateWeightedReviewScore(
        [
          { id: 'q1', weight: '0.50' },
          { id: 'q2', weight: '0.25' },
          { id: 'q3', weight: '0.25' },
        ],
        [
          { questionId: 'q1', rating: 4 },
          { questionId: 'q2', rating: 5 },
          { questionId: 'q3', rating: 3 },
        ]
      )
    ).toBe(4);
  });

  it('throws on question IDs that do not belong to the review type', () => {
    expect(() =>
      calculateWeightedReviewScore(
        [{ id: 'q1', weight: '1.00' }],
        [{ questionId: 'q2', rating: 5 }]
      )
    ).toThrowError('Invalid question ID q2 for this review type.');
  });
});
