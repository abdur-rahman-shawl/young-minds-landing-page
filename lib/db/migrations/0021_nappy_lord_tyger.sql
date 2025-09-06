ALTER TABLE "mentors" ADD COLUMN "country_id" integer;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "state_id" integer;--> statement-breakpoint
ALTER TABLE "mentors" ADD COLUMN "city_id" integer;--> statement-breakpoint
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;