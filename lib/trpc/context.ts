import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function createTRPCContext(opts: {
  headers: Headers;
  req: Request;
}) {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    db,
    req: opts.req,
    session,
    userId: session?.user?.id ?? null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
