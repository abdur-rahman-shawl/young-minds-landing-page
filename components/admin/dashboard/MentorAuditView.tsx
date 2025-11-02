import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mentor } from '@/lib/db/schema';

interface MentorAuditViewProps {
  previousData: Mentor;
  updatedData: Mentor;
}

const DiffField = ({ label, oldValue, newValue }: { label: string; oldValue: any; newValue: any }) => {
  const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

  if (!hasChanged) {
    return (
      <div className="grid grid-cols-3 gap-4 text-sm">
        <dt className="font-medium text-gray-500">{label}</dt>
        <dd className="col-span-2 text-gray-900">{newValue || 'Not provided'}</dd>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 text-sm bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="col-span-2">
        <span className="text-red-600 line-through">{oldValue || 'Not provided'}</span>
        <span className="text-green-600 ml-2">{newValue || 'Not provided'}</span>
      </dd>
    </div>
  );
};

export function MentorAuditView({ previousData, updatedData }: MentorAuditViewProps) {
  const fields: { key: keyof Mentor; label: string }[] = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'title', label: 'Job Title' },
    { key: 'company', label: 'Company' },
    { key: 'industry', label: 'Industry' },
    { key: 'headline', label: 'Headline' },
    { key: 'about', label: 'About' },
    { key: 'experience', label: 'Experience (Years)' },
    { key: 'expertise', label: 'Expertise' },
    { key: 'hourlyRate', label: 'Hourly Rate' },
    { key: 'linkedinUrl', label: 'LinkedIn URL' },
    { key: 'githubUrl', label: 'GitHub URL' },
    { key: 'websiteUrl', label: 'Website URL' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'country', label: 'Country' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Change Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-4">
          {fields.map(({ key, label }) => (
            <DiffField
              key={key}
              label={label}
              oldValue={previousData[key]}
              newValue={updatedData[key]}
            />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
