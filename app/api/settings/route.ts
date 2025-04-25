import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const settingsPath = path.join(process.cwd(), "files", "app-settings.json");

// Helper functions
function readSettings() {
  if (!fs.existsSync(settingsPath)) {
    // Create the directory if it doesn't exist
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create the initial file with default settings
    const defaultSettings = {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant."
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  
  try {
    // Read the existing file
    const fileContent = fs.readFileSync(settingsPath, "utf8");
    if (!fileContent.trim()) {
      // If the file is empty, initialize it
      const defaultSettings = {
        llm_provider: "openai",
        llm_model: "gpt-4o",
        system_prompt: "You are a helpful assistant."
      };
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
    
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading settings file:", error);
    // If there's an error parsing the file, reset it
    const defaultSettings = {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant."
    };
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
}

function writeSettings(settings: any) {
  try {
    // Make sure the directory exists
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the settings to the file
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing settings file:", error);
    throw new Error("Failed to save settings");
  }
}

// GET /api/settings - get all settings
export async function GET(req: NextRequest) {
  try {
    const settings = readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error getting settings:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}

// POST /api/settings - update settings
export async function POST(req: NextRequest) {
  try {
    const newSettings = await req.json();
    
    // Validate required fields
    if (!newSettings.llm_provider || !newSettings.llm_model) {
      return NextResponse.json({ error: "Provider and model are required" }, { status: 400 });
    }
    
    // Get current settings and merge with new settings
    const currentSettings = readSettings();
    const mergedSettings = { ...currentSettings, ...newSettings };
    
    // Write the merged settings to the file
    writeSettings(mergedSettings);
    
    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

// PATCH /api/settings - update specific settings
export async function PATCH(req: NextRequest) {
  try {
    const updates = await req.json();
    
    // Get current settings and merge with updates
    const currentSettings = readSettings();
    const mergedSettings = { ...currentSettings, ...updates };
    
    // Write the merged settings to the file
    writeSettings(mergedSettings);
    
    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
