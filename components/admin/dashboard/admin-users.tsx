'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Loader2,
  Search,
  ShieldCheck,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PasswordInput } from '@/components/auth/password-input';
import { countryPhoneCodes } from '@/lib/country-phone-codes';
import { isAdminMentorCreateFormDirty } from '@/lib/admin/user-form-state';
import { useTRPCClient } from '@/lib/trpc/react';
import {
  type AdminUserItem,
  useAdminCreateMentorUserMutation,
  useAdminUsersQuery,
} from '@/hooks/queries/use-admin-queries';

type UserFilter = 'all' | 'mentors' | 'admin-created';

const INDUSTRY_OPTIONS = [
  ['ITSoftware', 'IT & Software'],
  ['Marketing', 'Marketing & Advertising'],
  ['Finance', 'Finance & Banking'],
  ['Education', 'Education'],
  ['Healthcare', 'Healthcare'],
  ['Entrepreneurship', 'Entrepreneurship & Startup'],
  ['Design', 'Design (UI/UX, Graphic)'],
  ['Sales', 'Sales'],
  ['HR', 'Human Resources'],
  ['Other', 'Other'],
] as const;

const EMPTY_FORM = {
  fullName: '',
  email: '',
  initialPassword: '',
  phoneCountryCode: '',
  phone: '',
  countryId: '',
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
  profilePicture: null as File | null,
  resume: null as File | null,
};

function getRoleLabel(user: AdminUserItem) {
  if (!user.roles.length) {
    return 'No role';
  }

  return user.roles.map((role) => role.displayName ?? role.name).join(', ');
}

function formatRelativeDate(value: string | null) {
  return value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : '—';
}

export function AdminUsers() {
  const trpcClient = useTRPCClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [profilePicturePreview, setProfilePicturePreview] = useState<
    string | null
  >(null);
  const [countries, setCountries] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [states, setStates] = useState<Array<{ id: number; name: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
  const [locationsLoading, setLocationsLoading] = useState({
    countries: false,
    states: false,
    cities: false,
  });
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useAdminUsersQuery();
  const createMentorMutation = useAdminCreateMentorUserMutation();
  const phoneCodeOptions = useMemo(
    () =>
      countryPhoneCodes.map((country) => ({
        value: country.code,
        label: `+${country.code} (${country.name})`,
      })),
    []
  );
  const countryOptions = countries.map((country) => ({
    value: country.id.toString(),
    label: country.name,
  }));
  const stateOptions = states.map((state) => ({
    value: state.id.toString(),
    label: state.name,
  }));
  const cityOptions = cities.map((city) => ({
    value: city.id.toString(),
    label: city.name,
  }));
  const defaultCountryId =
    countries.find((country) => country.name === 'India')?.id.toString() ?? '';
  const isCreateFormDirty = isAdminMentorCreateFormDirty(
    form,
    defaultCountryId
  );

  useEffect(() => {
    const fetchCountries = async () => {
      setLocationsLoading((current) => ({ ...current, countries: true }));

      try {
        const data = await trpcClient.public.listCountries.query();
        setCountries(data);

        const india = data.find(
          (country: { id: number; name: string }) => country.name === 'India'
        );
        if (india) {
          setForm((current) =>
            current.countryId
              ? current
              : { ...current, countryId: india.id.toString() }
          );
        }
      } catch (locationError) {
        console.error('Failed to fetch countries', locationError);
      } finally {
        setLocationsLoading((current) => ({ ...current, countries: false }));
      }
    };

    void fetchCountries();
  }, [trpcClient]);

  useEffect(() => {
    if (!form.countryId) {
      setStates([]);
      setCities([]);
      return;
    }

    const fetchStates = async () => {
      setLocationsLoading((current) => ({ ...current, states: true }));
      setStates([]);
      setCities([]);
      setForm((current) => ({ ...current, stateId: '', cityId: '' }));

      try {
        const data = await trpcClient.public.listStates.query({
          countryId: Number(form.countryId),
        });
        setStates(data);
      } catch (locationError) {
        console.error('Failed to fetch states', locationError);
      } finally {
        setLocationsLoading((current) => ({ ...current, states: false }));
      }
    };

    void fetchStates();
  }, [form.countryId, trpcClient]);

  useEffect(() => {
    if (!form.stateId) {
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setLocationsLoading((current) => ({ ...current, cities: true }));
      setCities([]);
      setForm((current) => ({ ...current, cityId: '' }));

      try {
        const data = await trpcClient.public.listCities.query({
          stateId: Number(form.stateId),
        });
        setCities(data);
      } catch (locationError) {
        console.error('Failed to fetch cities', locationError);
      } finally {
        setLocationsLoading((current) => ({ ...current, cities: false }));
      }
    };

    void fetchCities();
  }, [form.stateId, trpcClient]);

  const stats = useMemo(() => {
    const mentors = users.filter((user) => user.mentor);
    const adminCreatedMentors = mentors.filter(
      (user) => user.mentor?.creationSource === 'ADMIN_CREATED'
    );
    const verifiedMentors = mentors.filter(
      (user) => user.mentor?.verificationStatus === 'VERIFIED'
    );

    return {
      totalUsers: users.length,
      mentors: mentors.length,
      adminCreatedMentors: adminCreatedMentors.length,
      verifiedMentors: verifiedMentors.length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      if (filter === 'mentors' && !user.mentor) {
        return false;
      }

      if (
        filter === 'admin-created' &&
        user.mentor?.creationSource !== 'ADMIN_CREATED'
      ) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        user.name,
        user.email,
        user.firstName,
        user.lastName,
        user.phone,
        ...user.roles.map((role) => role.displayName ?? role.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [filter, search, users]);

  const updateForm = <Key extends keyof typeof EMPTY_FORM>(
    key: Key,
    value: (typeof EMPTY_FORM)[Key]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      countryId: defaultCountryId,
    });
    setProfilePicturePreview(null);
  };

  const closeCreateDialogWithoutPrompt = () => {
    setShowDiscardDialog(false);
    setShowCreateDialog(false);
    resetForm();
  };

  const requestCloseCreateDialog = () => {
    if (createMentorMutation.isPending) {
      return;
    }

    if (isCreateFormDirty) {
      setShowDiscardDialog(true);
      return;
    }

    closeCreateDialogWithoutPrompt();
  };

  const handleCreateMentor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedCountry = countries.find(
      (country) => country.id.toString() === form.countryId
    );
    const selectedState = states.find(
      (state) => state.id.toString() === form.stateId
    );
    const selectedCity = cities.find(
      (city) => city.id.toString() === form.cityId
    );

    if (!form.profilePicture) {
      toast.error('Profile picture is required');
      return;
    }

    const payload = new FormData();
    payload.append('fullName', form.fullName);
    payload.append('email', form.email);
    payload.append('initialPassword', form.initialPassword);
    payload.append('phoneCountryCode', form.phoneCountryCode);
    payload.append('phone', form.phone);
    payload.append('country', selectedCountry?.name ?? '');
    payload.append('state', selectedState?.name ?? '');
    payload.append('city', selectedCity?.name ?? '');
    payload.append('title', form.title);
    payload.append('company', form.company);
    payload.append('industry', form.industry);
    payload.append('otherIndustry', form.otherIndustry);
    payload.append('experience', form.experience);
    payload.append('expertise', form.expertise);
    payload.append('about', form.about);
    payload.append('linkedinUrl', form.linkedinUrl);
    payload.append('availability', form.availability);
    payload.append('profilePicture', form.profilePicture);
    if (form.resume) {
      payload.append('resume', form.resume);
    }

    try {
      await createMentorMutation.mutateAsync(payload);
      toast.success('Mentor user created successfully');
      closeCreateDialogWithoutPrompt();
    } catch (creationError) {
      toast.error(
        creationError instanceof Error
          ? creationError.message
          : 'Failed to create mentor user'
      );
    }
  };

  if (isLoading) {
    return (
      <div className='flex h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground'>
        <Loader2 className='h-6 w-6 animate-spin' />
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex h-[70vh] flex-col items-center justify-center gap-3 text-center text-sm text-red-600'>
        <Users className='h-6 w-6' />
        <p>We ran into a problem loading users.</p>
        <p className='text-xs text-muted-foreground'>
          {error instanceof Error ? error.message : 'Unable to load users'}
        </p>
        <Button size='sm' onClick={() => void refetch()} className='mt-2'>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6'>
      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Total users</CardDescription>
            <CardTitle className='text-3xl'>{stats.totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Mentors</CardDescription>
            <CardTitle className='text-3xl'>{stats.mentors}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Admin-created mentors</CardDescription>
            <CardTitle className='text-3xl'>
              {stats.adminCreatedMentors}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Verified mentors</CardDescription>
            <CardTitle className='text-3xl'>
              {stats.verifiedMentors}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className='gap-4'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <CardTitle>User Management Console</CardTitle>
              <CardDescription>
                Manage platform users and provision verified mentor accounts.
              </CardDescription>
            </div>
            <Button
              type='button'
              className='gap-2'
              onClick={() => setShowCreateDialog(true)}
            >
              <UserPlus className='h-4 w-4' />
              Add Mentor
            </Button>
          </div>

          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex flex-wrap gap-2'>
              {(
                [
                  ['all', `All users (${users.length})`],
                  [
                    'mentors',
                    `Mentors (${stats.mentors})`,
                  ],
                  [
                    'admin-created',
                    `Added by us (${stats.adminCreatedMentors})`,
                  ],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type='button'
                  size='sm'
                  variant={filter === value ? 'default' : 'outline'}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className='flex w-full max-w-sm items-center gap-2'>
              <Search className='h-4 w-4 text-muted-foreground' />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Search by name, email, role...'
                className='h-9'
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Mentor status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className='py-10 text-center text-sm text-muted-foreground'
                  >
                    No users found for the current filters.
                  </TableCell>
                </TableRow>
              )}

              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className='space-y-1'>
                      <div className='font-medium text-gray-900 dark:text-gray-50'>
                        {user.name || 'Unnamed user'}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {getRoleLabel(user)}
                  </TableCell>
                  <TableCell>
                    {user.mentor ? (
                      <Badge variant='outline'>
                        {user.mentor.verificationStatus.replace(/_/g, ' ')}
                      </Badge>
                    ) : (
                      <span className='text-sm text-muted-foreground'>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.mentor?.creationSource === 'ADMIN_CREATED' ? (
                      <Badge className='gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100'>
                        <ShieldCheck className='h-3 w-3' />
                        Added by us
                      </Badge>
                    ) : user.mentor ? (
                      <Badge variant='secondary'>Self-registered</Badge>
                    ) : (
                      <span className='text-sm text-muted-foreground'>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-wrap gap-2'>
                      <Badge
                        variant={user.isBlocked ? 'destructive' : 'outline'}
                      >
                        {user.isBlocked
                          ? 'Blocked'
                          : user.isActive
                            ? 'Active'
                            : 'Inactive'}
                      </Badge>
                      <Badge variant='outline'>
                        {user.emailVerified ? 'Email verified' : 'Email pending'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {formatRelativeDate(user.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (open) {
            setShowCreateDialog(true);
            return;
          }

          requestCloseCreateDialog();
        }}
      >
        <DialogContent
          className='max-h-[90vh] max-w-4xl overflow-y-auto'
          onInteractOutside={(event) => {
            if (createMentorMutation.isPending || isCreateFormDirty) {
              event.preventDefault();
            }

            if (!createMentorMutation.isPending && isCreateFormDirty) {
              setShowDiscardDialog(true);
            }
          }}
          onEscapeKeyDown={(event) => {
            if (createMentorMutation.isPending || isCreateFormDirty) {
              event.preventDefault();
            }

            if (!createMentorMutation.isPending && isCreateFormDirty) {
              setShowDiscardDialog(true);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Add mentor user</DialogTitle>
            <DialogDescription>
              Creates a login-ready mentor account and marks the mentor as
              verified immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMentor} className='space-y-6'>
            <div className='flex flex-col items-center gap-3'>
              <Label htmlFor='profilePicture'>
                Profile picture <span className='text-red-500'>*</span>
              </Label>
              <label htmlFor='profilePicture' className='cursor-pointer'>
                <Avatar className='h-24 w-24'>
                  <AvatarImage
                    src={profilePicturePreview || undefined}
                    alt='Profile picture preview'
                  />
                  <AvatarFallback>
                    <User className='h-10 w-10' />
                  </AvatarFallback>
                </Avatar>
              </label>
              <input
                id='profilePicture'
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  updateForm('profilePicture', file);

                  if (!file) {
                    setProfilePicturePreview(null);
                    return;
                  }

                  const reader = new FileReader();
                  reader.onloadend = () =>
                    setProfilePicturePreview(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              <Button
                type='button'
                variant='ghost'
                onClick={() =>
                  document.getElementById('profilePicture')?.click()
                }
              >
                Upload picture
              </Button>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='fullName'>
                  Full name <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='fullName'
                  value={form.fullName}
                  onChange={(event) =>
                    updateForm('fullName', event.target.value)
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>
                  Email <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='email'
                  type='email'
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='initialPassword'>
                  Initial password <span className='text-red-500'>*</span>
                </Label>
                <PasswordInput
                  id='initialPassword'
                  value={form.initialPassword}
                  onChange={(event) =>
                    updateForm('initialPassword', event.target.value)
                  }
                  required
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='phone'>
                  Phone number <span className='text-red-500'>*</span>
                </Label>
                <div className='grid gap-2 md:grid-cols-[220px_1fr]'>
                  <Combobox
                    options={phoneCodeOptions}
                    value={form.phoneCountryCode}
                    onValueChange={(value) =>
                      updateForm('phoneCountryCode', value)
                    }
                    placeholder='Select code'
                    searchPlaceholder='Search codes...'
                    className='w-full'
                  />
                  <Input
                    id='phone'
                    type='tel'
                    value={form.phone}
                    onChange={(event) =>
                      updateForm('phone', event.target.value)
                    }
                    required
                  />
                </div>
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='linkedinUrl'>
                  LinkedIn profile URL <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='linkedinUrl'
                  value={form.linkedinUrl}
                  onChange={(event) =>
                    updateForm('linkedinUrl', event.target.value)
                  }
                  placeholder='https://www.linkedin.com/in/your-profile'
                  required
                />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='country'>
                  Country <span className='text-red-500'>*</span>
                </Label>
                <Combobox
                  options={countryOptions}
                  value={form.countryId}
                  onValueChange={(value) => updateForm('countryId', value)}
                  placeholder={
                    locationsLoading.countries ? 'Loading...' : 'Select country'
                  }
                  searchPlaceholder='Search countries...'
                  className='w-full'
                  disabled={locationsLoading.countries}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='state'>
                  State <span className='text-red-500'>*</span>
                </Label>
                <Combobox
                  options={stateOptions}
                  value={form.stateId}
                  onValueChange={(value) => updateForm('stateId', value)}
                  placeholder={
                    locationsLoading.states ? 'Loading...' : 'Select state'
                  }
                  searchPlaceholder='Search states...'
                  emptyMessage='No state found.'
                  className='w-full'
                  disabled={locationsLoading.states || states.length === 0}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='city'>
                  City <span className='text-red-500'>*</span>
                </Label>
                <Combobox
                  options={cityOptions}
                  value={form.cityId}
                  onValueChange={(value) => updateForm('cityId', value)}
                  placeholder={
                    locationsLoading.cities ? 'Loading...' : 'Select city'
                  }
                  searchPlaceholder='Search cities...'
                  emptyMessage='No city found.'
                  className='w-full'
                  disabled={locationsLoading.cities || cities.length === 0}
                />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='title'>
                  Current job title <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='title'
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='company'>
                  Current company / organization{' '}
                  <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='company'
                  value={form.company}
                  onChange={(event) =>
                    updateForm('company', event.target.value)
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='industry'>
                  Primary industry <span className='text-red-500'>*</span>
                </Label>
                <Select
                  value={form.industry}
                  onValueChange={(value) => updateForm('industry', value)}
                >
                  <SelectTrigger id='industry'>
                    <SelectValue placeholder='Select industry' />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.industry === 'Other' && (
                  <Input
                    id='otherIndustry'
                    value={form.otherIndustry}
                    onChange={(event) =>
                      updateForm('otherIndustry', event.target.value)
                    }
                    placeholder='Specify industry'
                    required
                  />
                )}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='experience'>
                  Years of professional experience{' '}
                  <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='experience'
                  type='number'
                  min='2'
                  value={form.experience}
                  onChange={(event) =>
                    updateForm('experience', event.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='expertise'>
                Areas of expertise <span className='text-red-500'>*</span>
              </Label>
              <Textarea
                id='expertise'
                value={form.expertise}
                onChange={(event) =>
                  updateForm('expertise', event.target.value)
                }
                placeholder='List at least 5 skills, separated by commas'
                maxLength={500}
                required
              />
              <p className='text-xs text-muted-foreground'>
                Minimum 5 skills, comma-separated.
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='about'>About</Label>
              <Textarea
                id='about'
                value={form.about}
                onChange={(event) => updateForm('about', event.target.value)}
                rows={4}
              />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='availability'>
                  Preferred mentorship availability{' '}
                  <span className='text-red-500'>*</span>
                </Label>
                <Select
                  value={form.availability}
                  onValueChange={(value) =>
                    updateForm('availability', value)
                  }
                >
                  <SelectTrigger id='availability'>
                    <SelectValue placeholder='Select availability' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Weekly'>Weekly</SelectItem>
                    <SelectItem value='BiWeekly'>Bi-weekly</SelectItem>
                    <SelectItem value='Monthly'>Monthly</SelectItem>
                    <SelectItem value='AsNeeded'>As needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='resume'>Resume (optional)</Label>
                <Input
                  id='resume'
                  type='file'
                  accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  onChange={(event) =>
                    updateForm('resume', event.target.files?.[0] ?? null)
                  }
                />
                <p className='text-xs text-muted-foreground'>
                  PDF, DOC, or DOCX up to 5MB.
                </p>
              </div>
            </div>

            <p className='text-xs text-muted-foreground'>
              The initial password is required because this repository does not
              yet have an invitation or password-setup flow. Share it securely
              with the mentor after creation.
            </p>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={requestCloseCreateDialog}
                disabled={createMentorMutation.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={createMentorMutation.isPending}>
                {createMentorMutation.isPending && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Create mentor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard mentor details?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved information in this form. If you discard it,
              the entered mentor details and selected files will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={closeCreateDialogWithoutPrompt}
              className='bg-red-600 text-white hover:bg-red-700'
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
