import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const logFiles = pgTable("log_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  totalLogs: integer("total_logs"),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
});

export const anomalies = pgTable("anomalies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logFileId: varchar("log_file_id").notNull().references(() => logFiles.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull(),
  anomalyType: text("anomaly_type").notNull(),
  description: text("description").notNull(),
  riskScore: decimal("risk_score", { precision: 3, scale: 1 }).notNull(),
  sourceData: jsonb("source_data").notNull(),
  aiAnalysis: jsonb("ai_analysis").notNull(),
  status: text("status").notNull().default("pending"), // pending, reviewed, false_positive
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const processingJobs = pgTable("processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logFileId: varchar("log_file_id").notNull().references(() => logFiles.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed
  progress: integer("progress").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  settings: jsonb("settings").notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  logFiles: many(logFiles),
  anomalies: many(anomalies),
  processingJobs: many(processingJobs),
}));

export const logFilesRelations = relations(logFiles, ({ one, many }) => ({
  user: one(users, {
    fields: [logFiles.userId],
    references: [users.id],
  }),
  anomalies: many(anomalies),
  processingJobs: many(processingJobs),
}));

export const anomaliesRelations = relations(anomalies, ({ one }) => ({
  logFile: one(logFiles, {
    fields: [anomalies.logFileId],
    references: [logFiles.id],
  }),
  user: one(users, {
    fields: [anomalies.userId],
    references: [users.id],
  }),
}));

export const processingJobsRelations = relations(processingJobs, ({ one }) => ({
  logFile: one(logFiles, {
    fields: [processingJobs.logFileId],
    references: [logFiles.id],
  }),
  user: one(users, {
    fields: [processingJobs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertLogFileSchema = createInsertSchema(logFiles).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export const insertAnomalySchema = createInsertSchema(anomalies).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LogFile = typeof logFiles.$inferSelect;
export type InsertLogFile = z.infer<typeof insertLogFileSchema>;
export type Anomaly = typeof anomalies.$inferSelect;
export type InsertAnomaly = z.infer<typeof insertAnomalySchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;

// AI Configuration Schema
export const aiConfigSchema = z.object({
  provider: z.enum(["openai", "gcp_gemini"]).default("openai"),
  tier: z.enum(["premium", "standard", "economy"]).default("standard"),
  temperature: z.number().min(0).max(2).default(0.1),
});

export type AIConfig = z.infer<typeof aiConfigSchema>;
