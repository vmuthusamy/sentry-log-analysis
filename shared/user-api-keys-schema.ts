import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./schema";

export const userApiKeys = pgTable("user_api_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // 'openai' or 'gemini'
  encryptedApiKey: text("encrypted_api_key").notNull(),
  isActive: boolean("is_active").default(true),
  lastTested: timestamp("last_tested"),
  testStatus: text("test_status"), // 'success', 'failed', 'pending'
  testError: text("test_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserApiKeySchema = createInsertSchema(userApiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserApiKeySchema = createSelectSchema(userApiKeys);

export type UserApiKey = typeof userApiKeys.$inferSelect;
export type InsertUserApiKey = typeof insertUserApiKeySchema._type;