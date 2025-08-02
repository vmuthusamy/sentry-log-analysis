import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("user"), // user, admin, system
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isSystemUser: boolean("is_system_user").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

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
  // Blob storage support
  blobStorageUrl: text("blob_storage_url"), // URL to blob storage
  blobStorageProvider: text("blob_storage_provider"), // local, s3, gcs, azure
  blobStorageKey: text("blob_storage_key"), // Storage key/path
  archivedAt: timestamp("archived_at"), // When file was archived
  archivePolicy: text("archive_policy").default("default"), // default, extended, permanent
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
  detectionMethod: text("detection_method").notNull().default("traditional"),
  status: text("status").notNull().default("pending"), // pending, under_review, confirmed, false_positive, dismissed
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  // Enhanced SOC analyst fields
  rawLogEntry: text("raw_log_entry"), // Store original log line for reference
  logLineNumber: integer("log_line_number"), // Line number in original file
  analystNotes: text("analyst_notes"), // SOC analyst comments
  escalationReason: text("escalation_reason"), // Why it was escalated
  assignedTo: varchar("assigned_to").references(() => users.id), // Assigned analyst
  priority: text("priority").default("medium"), // low, medium, high, critical
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System metrics for tracking anomaly update actions
export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type").notNull(), // "anomaly_update", "webhook_success", "webhook_failure", etc.
  metricName: text("metric_name").notNull(),
  value: integer("value").notNull().default(1),
  metadata: jsonb("metadata"), // Additional context (userId, anomalyId, webhookId, etc.)
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const processingJobs = pgTable("processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logFileId: varchar("log_file_id").notNull().references(() => logFiles.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed
  progress: integer("progress").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  analysisTimeMs: integer("analysis_time_ms"), // Analysis time in milliseconds
  detectionMethod: text("detection_method"), // ai, advanced_ml, traditional_ml
  anomaliesFound: integer("anomalies_found"), // Number of anomalies detected
  logEntriesProcessed: integer("log_entries_processed"), // Total log entries analyzed
  errorMessage: text("error_message"),
  settings: jsonb("settings").notNull(),
});

// Webhook integrations for external workflow automation
export const webhookIntegrations = pgTable("webhook_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(), // User-friendly name
  provider: text("provider").notNull().default("zapier"), // zapier, make, custom, etc.
  webhookUrl: text("webhook_url").notNull(),
  isActive: boolean("is_active").default(true),
  triggerConditions: jsonb("trigger_conditions").notNull(), // Risk level, keywords, etc.
  payloadTemplate: jsonb("payload_template"), // Custom payload structure
  lastTriggered: timestamp("last_triggered"),
  totalTriggers: integer("total_triggers").default(0),
  successfulTriggers: integer("successful_triggers").default(0), // Successful webhook deliveries
  failedTriggers: integer("failed_triggers").default(0), // Failed webhook deliveries
  lastSuccessfulTrigger: timestamp("last_successful_trigger"),
  lastFailedTrigger: timestamp("last_failed_trigger"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  logFiles: many(logFiles),
  anomalies: many(anomalies),
  processingJobs: many(processingJobs),
  webhookIntegrations: many(webhookIntegrations),
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

export const webhookIntegrationsRelations = relations(webhookIntegrations, ({ one }) => ({
  user: one(users, {
    fields: [webhookIntegrations.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertLogFileSchema = createInsertSchema(logFiles).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export const insertWebhookIntegrationSchema = createInsertSchema(webhookIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTriggered: true,
  totalTriggers: true,
});

// Type exports
export type WebhookIntegration = typeof webhookIntegrations.$inferSelect;
export type InsertWebhookIntegration = typeof webhookIntegrations.$inferInsert;

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

// User Settings Table
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  storageConfig: jsonb("storage_config").notNull().default(sql`'{}'::jsonb`),
  aiConfig: jsonb("ai_config").notNull().default(sql`'{}'::jsonb`),
  notificationSettings: jsonb("notification_settings").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type LogFile = typeof logFiles.$inferSelect;
export type InsertLogFile = z.infer<typeof insertLogFileSchema>;
export type Anomaly = typeof anomalies.$inferSelect;
export type InsertAnomaly = z.infer<typeof insertAnomalySchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Export user API keys schema
export * from "./user-api-keys-schema";

// Metrics Events Table
export const metricsEvents = pgTable("metrics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  eventType: varchar("event_type").notNull(), // 'file_upload', 'file_analysis_view', 'anomaly_detection', 'ai_analysis'
  status: varchar("status").notNull(), // 'success', 'failure', 'error'
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

export const insertMetricsEventSchema = createInsertSchema(metricsEvents);
export type MetricsEvent = typeof metricsEvents.$inferSelect;
export type InsertMetricsEvent = z.infer<typeof insertMetricsEventSchema>;

// Storage and Archive Settings Schema
export const storageConfigSchema = z.object({
  defaultArchivePolicy: z.enum(["default", "extended", "permanent"]).default("default"),
  defaultRetentionDays: z.number().default(90), // Default 90 days
  blobStorageProvider: z.enum(["local", "s3", "gcs", "azure"]).default("local"),
  maxFileSize: z.number().default(52428800), // 50MB default
  autoArchiveEnabled: z.boolean().default(true),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

// AI Configuration Schema
export const aiConfigSchema = z.object({
  provider: z.enum(["openai", "gcp_gemini"]).default("openai"),
  tier: z.enum(["premium", "standard", "economy"]).default("standard"),
  temperature: z.number().min(0).max(2).default(0.1),
});

export type AIConfig = z.infer<typeof aiConfigSchema>;
