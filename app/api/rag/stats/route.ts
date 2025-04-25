import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { existsSync, readdirSync, statSync } from "fs";

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

// GET /api/rag/stats - Get database statistics
export async function GET() {
  try {
    const settings = readSettings();
    const vectorStoreType = settings.vector_store || "memory";
    
    // Base directory for files
    const filesBaseDir = path.join(process.cwd(), "files");
    const groupsDir = path.join(filesBaseDir, "groups");
    
    // Stats object
    const stats = {
      totalDocuments: 0,
      totalChunks: 0,
      lastCompiled: "Never",
      vectorStoreType: vectorStoreType === "memory" ? "In-Memory" : "Chroma"
    };
    
    // Count documents
    if (existsSync(groupsDir)) {
      const groups = readdirSync(groupsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const group of groups) {
        const groupPath = path.join(groupsDir, group);
        const files = readdirSync(groupPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile())
          .filter(dirent => !dirent.name.endsWith('.json')); // Exclude JSON files
        
        stats.totalDocuments += files.length;
      }
    }
    
    // Check for vector store data
    const vectorStorePath = path.join(filesBaseDir, "vector-store.json");
    if (existsSync(vectorStorePath)) {
      try {
        const vectorStoreData = JSON.parse(fs.readFileSync(vectorStorePath, "utf8"));
        stats.totalChunks = vectorStoreData.chunks?.length || 0;
        
        // Get last modified time
        const { mtime } = statSync(vectorStorePath);
        stats.lastCompiled = mtime.toLocaleString();
      } catch (error) {
        console.error("Error reading vector store data:", error);
      }
    }
    
    // If using Chroma, check for Chroma directory
    if (vectorStoreType === "chroma") {
      const chromaDir = path.join(filesBaseDir, "chroma");
      if (existsSync(chromaDir)) {
        // Try to estimate chunks from Chroma directory structure
        // This is a simplification - actual count would require Chroma API
        try {
          const collections = readdirSync(chromaDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
            
          if (collections.length > 0) {
            const { mtime } = statSync(chromaDir);
            stats.lastCompiled = mtime.toLocaleString();
          }
        } catch (error) {
          console.error("Error reading Chroma directory:", error);
        }
      }
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error getting database stats:", error);
    return NextResponse.json(
      { error: "Failed to get database statistics" },
      { status: 500 }
    );
  }
}
