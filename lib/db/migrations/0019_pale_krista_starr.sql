CREATE TYPE "public"."authentication_provider" AS ENUM('PASSWORD', 'GOOGLE');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "authentication_provider" "authentication_provider" DEFAULT 'GOOGLE';--> statement-breakpoint