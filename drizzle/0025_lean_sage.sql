CREATE TABLE IF NOT EXISTS "order_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"org_id" text NOT NULL,
	"branch_id" uuid,
	"customer_user_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"unread_by_customer" integer DEFAULT 0 NOT NULL,
	"unread_by_vendor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"org_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"sender_role" text NOT NULL,
	"sender_name" text NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"attachment_url" text,
	"attachment_name" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_conversations_order_id_simulated_orders_id_fk'
    ) THEN
        ALTER TABLE "order_conversations" ADD CONSTRAINT "order_conversations_order_id_simulated_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."simulated_orders"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_conversations_branch_id_branches_id_fk'
    ) THEN
        ALTER TABLE "order_conversations" ADD CONSTRAINT "order_conversations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_chat_messages_conversation_id_order_conversations_id_fk'
    ) THEN
        ALTER TABLE "order_chat_messages" ADD CONSTRAINT "order_chat_messages_conversation_id_order_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."order_conversations"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_conversations_org_id" ON "order_conversations" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_conversations_order_id" ON "order_conversations" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_conversations_branch_id" ON "order_conversations" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_conversations_customer_user_id" ON "order_conversations" USING btree ("customer_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_conversations_status" ON "order_conversations" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_conversations_last_message_at" ON "order_conversations" USING btree ("last_message_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_chat_messages_conversation_id" ON "order_chat_messages" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_chat_messages_org_id" ON "order_chat_messages" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_chat_messages_sender_user_id" ON "order_chat_messages" USING btree ("sender_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_chat_messages_created_at" ON "order_chat_messages" USING btree ("created_at");