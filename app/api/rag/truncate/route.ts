import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { existsSync, rmSync } from "fs";

// Function to read settings
function readSettings() {
  const settingsPath = path.join(process.cwd(), "files", "app-settings.json");
  
  if (!existsSync(settingsPath)) {
    return {
      vector_store: "memory"
    };
  }
  
  try {
    const fileContent = fs.readFileSync(settingsPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading settings file:", error);
    return {
      vector_store: "memory"
    };
  }
}

// POST /api/rag/truncate - Truncate the vector database
export async function POST() {
  try {
    const settings = readSettings();
    const vectorStoreType = settings.vector_store || "memory";
    const filesBaseDir = path.join(process.cwd(), "files");
    
    // Handle in-memory vector store
    const vectorStorePath = path.join(filesBaseDir, "vector-store.json");
    if (existsSync(vectorStorePath)) {
      // Delete the vector store file
      rmSync(vectorStorePath);
    }
    
    // Handle Chroma vector store
    if (vectorStoreType === "chroma") {
      const chromaDir = path.join(filesBaseDir, "chroma");
      if (existsSync(chromaDir)) {
        // Remove the entire Chroma directory
        rmSync(chromaDir, { recursive: true, force: true });
      }
    }
    
    return NextResponse.json({ success: true, message: "Database truncated successfully" });
  } catch (error) {
    console.error("Error truncating database:", error);
    return NextResponse.json(
      { error: "Failed to truncate database" },
      { status: 500 }
    );
  }
}
