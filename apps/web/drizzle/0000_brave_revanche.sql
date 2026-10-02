CREATE TABLE "bis_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"bis_list_id" integer NOT NULL,
	"slot" text NOT NULL,
	"content_type" text NOT NULL,
	"rank" integer NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"item_level" integer NOT NULL,
	"source" jsonb NOT NULL,
	"tier_piece" boolean DEFAULT false NOT NULL,
	"catalystable" boolean DEFAULT false NOT NULL,
	"stat_priority_fit" real NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "bis_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"season" text NOT NULL,
	"class" text NOT NULL,
	"spec" text NOT NULL,
	"armor_type" text NOT NULL,
	"stat_priority" jsonb NOT NULL,
	CONSTRAINT "bis_lists_season_class_spec_unique" UNIQUE("season","class","spec")
);
--> statement-breakpoint
ALTER TABLE "bis_entries" ADD CONSTRAINT "bis_entries_bis_list_id_bis_lists_id_fk" FOREIGN KEY ("bis_list_id") REFERENCES "public"."bis_lists"("id") ON DELETE cascade ON UPDATE no action;