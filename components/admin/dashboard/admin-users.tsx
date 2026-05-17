'use client';

import { FormEvent, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PasswordInput } from '@/components/auth/password-input';
import {
  type AdminCreateMentorUserInput,
  type AdminUserItem,
  useAdminCreateMentorUserMutation,
  useAdminUsersQuery,
} from '@/hooks/queries/use-admin-queries';

type UserFilter = 'all' | 'mentors' | 'admin-created';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  initialPassword: '',
  phone: '',
  title: '',
  company: '',
  industry: '',
  expertise: '',
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useAdminUsersQuery();
  const createMentorMutation = useAdminCreateMentorUserMutation();

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

  const updateForm = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  const handleCreateMentor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: AdminCreateMentorUserInput = {
      fullName: form.fullName,
      email: form.email,
      initialPassword: form.initialPassword,
      phone: form.phone.trim() || undefined,
      title: form.title.trim() || undefined,
      company: form.company.trim() || undefined,
      industry: form.industry.trim() || undefined,
      expertise: form.expertise
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    };

    try {
      await createMentorMutation.mutateAsync(payload);
      toast.success('Mentor user created successfully');
      setShowCreateDialog(false);
      resetForm();
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
          setShowCreateDialog(open);
          if (!open && !createMentorMutation.isPending) {
            resetForm();
          }
        }}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Add mentor user</DialogTitle>
            <DialogDescription>
              Creates a login-ready mentor account and marks the mentor as
              verified immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMentor} className='space-y-5'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='fullName'>Full name</Label>
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
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='initialPassword'>Initial password</Label>
                <PasswordInput
                  id='initialPassword'
                  value={form.initialPassword}
                  onChange={(event) =>
                    updateForm('initialPassword', event.target.value)
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='phone'>Phone</Label>
                <Input
                  id='phone'
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='title'>Title</Label>
                <Input
                  id='title'
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='company'>Company</Label>
                <Input
                  id='company'
                  value={form.company}
                  onChange={(event) =>
                    updateForm('company', event.target.value)
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='industry'>Industry</Label>
                <Input
                  id='industry'
                  value={form.industry}
                  onChange={(event) =>
                    updateForm('industry', event.target.value)
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='expertise'>Expertise</Label>
                <Input
                  id='expertise'
                  value={form.expertise}
                  onChange={(event) =>
                    updateForm('expertise', event.target.value)
                  }
                  placeholder='AI, Leadership, Product'
                />
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
                onClick={() => setShowCreateDialog(false)}
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
    </div>
  );
}
