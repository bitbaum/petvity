ALTER TABLE "users" ADD COLUMN "orangecat_sub" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_orangecat_sub_unique" UNIQUE("orangecat_sub");