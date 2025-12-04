CREATE TABLE "ai_chatbot_message_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"chat_session_id" uuid NOT NULL,
	"user_id" text,
	"intent" text DEFAULT 'general' NOT NULL,
	"question_text" text,
	"question_hash" text,
	"is_question" boolean DEFAULT false NOT NULL,
	"universities" text[],
	"source" text DEFAULT 'heuristic' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "ai_chatbot_question_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "payment_status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "is_coupon_code_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_chatbot_message_insights" ADD CONSTRAINT "ai_chatbot_message_insights_message_id_ai_chatbot_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_chatbot_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chatbot_message_insights" ADD CONSTRAINT "ai_chatbot_message_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;