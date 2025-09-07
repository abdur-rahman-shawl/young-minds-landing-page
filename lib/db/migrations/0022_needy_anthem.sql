ALTER TABLE "users" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "authentication_provider";--> statement-breakpoint
DROP TYPE "public"."authentication_provider";