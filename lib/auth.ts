import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users } from "./db/schema/users";
import { betterAuthSessions, betterAuthAccounts, betterAuthVerifications } from "./db/schema/auth";
import { roles, userRoles } from "./db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: betterAuthSessions,
      account: betterAuthAccounts,
      verification: betterAuthVerifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["openid", "email", "profile"],
      accessType: "offline",
      prompt: "consent"
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // Auto-assign mentee role to new users
          if (session.userId) {
            try {
              // Check if user already has any roles
              const existingRoles = await db
                .select()
                .from(userRoles)
                .where(eq(userRoles.userId, session.userId));

              if (existingRoles.length === 0) {
                // Get mentee role
                const [menteeRole] = await db
                  .select()
                  .from(roles)
                  .where(eq(roles.name, 'mentee'))
                  .limit(1);

                if (menteeRole) {
                  // Assign mentee role
                  await db
                    .insert(userRoles)
                    .values({
                      userId: session.userId,
                      roleId: menteeRole.id,
                      assignedBy: session.userId
                    })
                    .onConflictDoNothing();
                  
                  console.log(`✅ Auto-assigned mentee role to user: ${session.userId}`);
                }
              }
            } catch (error) {
              console.error('❌ Failed to auto-assign mentee role:', error);
            }
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session; 