import { describe, expect, it } from 'vitest';

import { isAdminMentorCreateFormDirty } from '@/lib/admin/user-form-state';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  initialPassword: '',
  phoneCountryCode: '',
  phone: '',
  countryId: '101',
  stateId: '',
  cityId: '',
  title: '',
  company: '',
  industry: '',
  otherIndustry: '',
  experience: '',
  expertise: '',
  about: '',
  linkedinUrl: '',
  availability: '',
  profilePicture: null,
  resume: null,
};

describe('isAdminMentorCreateFormDirty', () => {
  it('treats the auto-selected default country as pristine', () => {
    expect(isAdminMentorCreateFormDirty(EMPTY_FORM, '101')).toBe(false);
  });

  it('detects typed values as dirty', () => {
    expect(
      isAdminMentorCreateFormDirty(
        {
          ...EMPTY_FORM,
          fullName: 'Ada Lovelace',
        },
        '101'
      )
    ).toBe(true);
  });

  it('detects uploaded files as dirty', () => {
    expect(
      isAdminMentorCreateFormDirty(
        {
          ...EMPTY_FORM,
          profilePicture: {} as File,
        },
        '101'
      )
    ).toBe(true);
  });
});
