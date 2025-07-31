// Quick fix script to reset stuck processing files
import { storage } from "./storage";

async function fixStuckFiles() {
  try {
    console.log("🔧 Checking for stuck processing files...");
    
    // Get all log files
    const { db } = await import("./db");
    const { logFiles } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const stuckFiles = await db
      .select()
      .from(logFiles)
      .where(eq(logFiles.status, "processing"));
    
    console.log(`Found ${stuckFiles.length} files stuck in processing...`);
    
    for (const file of stuckFiles) {
      console.log(`Resetting file: ${file.filename} (${file.id})`);
      await storage.updateLogFileStatus(
        file.id, 
        "completed", 
        file.totalLogs, 
        "Processing reset - Use Traditional ML or Advanced ML analysis buttons for analysis"
      );
    }
    
    console.log("✅ All stuck files have been reset to completed status");
    console.log("💡 Users can now use Traditional ML or Advanced ML analysis buttons");
    
  } catch (error) {
    console.error("❌ Error fixing stuck files:", error);
  }
}

// Run the fix immediately
fixStuckFiles().then(() => process.exit(0));

export { fixStuckFiles };