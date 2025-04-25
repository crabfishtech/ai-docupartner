import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const groupsPath = path.join(process.cwd(), "files", "document-groups.json");

// Helper functions
function readGroups() {
  if (!fs.existsSync(groupsPath)) {
    // Create the directory if it doesn't exist
    const dir = path.dirname(groupsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create the initial file with an empty groups array
    fs.writeFileSync(groupsPath, JSON.stringify({ groups: [] }, null, 2));
    return [];
  }
  
  try {
    // Read the existing file
    const fileContent = fs.readFileSync(groupsPath, "utf8");
    if (!fileContent.trim()) {
      // If the file is empty, initialize it
      fs.writeFileSync(groupsPath, JSON.stringify({ groups: [] }, null, 2));
      return [];
    }
    
    const data = JSON.parse(fileContent);
    return Array.isArray(data.groups) ? data.groups : [];
  } catch (error) {
    console.error("Error reading groups file:", error);
    // If there's an error parsing the file, reset it
    fs.writeFileSync(groupsPath, JSON.stringify({ groups: [] }, null, 2));
    return [];
  }
}

function writeGroups(groups: any[]) {
  try {
    // Make sure the directory exists
    const dir = path.dirname(groupsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the groups to the file
    fs.writeFileSync(groupsPath, JSON.stringify({ groups }, null, 2));
  } catch (error) {
    console.error("Error writing groups file:", error);
    throw new Error("Failed to save document groups");
  }
}

// GET /api/document-groups - list all document groups
export async function GET(req: NextRequest) {
  const groups = readGroups();
  return NextResponse.json({ groups });
}

// POST /api/document-groups - create a new document group
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const groups = readGroups();
    
    // Check if a group with this name already exists
    const existingGroup = groups.find((g: any) => g.name.toLowerCase() === name.toLowerCase());
    if (existingGroup) {
      return NextResponse.json({ 
        message: "Group already exists", 
        group: existingGroup 
      });
    }
    
    const newGroup = {
      guid: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      documentCount: 0
    };
    
    groups.push(newGroup);
    writeGroups(groups);
    
    return NextResponse.json(newGroup);
  } catch (error) {
    console.error("Error creating document group:", error);
    return NextResponse.json({ error: "Failed to create document group" }, { status: 500 });
  }
}

// PUT /api/document-groups?guid=... - update a document group
export async function PUT(req: NextRequest) {
  const guid = req.nextUrl.searchParams.get("guid");
  if (!guid) {
    return NextResponse.json({ error: "Missing group GUID" }, { status: 400 });
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Missing name in request body" }, { status: 400 });
    }

    const groups = readGroups();
    const groupIndex = groups.findIndex((g: any) => g.guid === guid);

    if (groupIndex === -1) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    groups[groupIndex].name = name;
    writeGroups(groups);

    return NextResponse.json({ 
      success: true,
      group: groups[groupIndex]
    });
  } catch (error) {
    console.error("Error updating document group:", error);
    return NextResponse.json({ error: "Failed to update document group" }, { status: 500 });
  }
}

// DELETE /api/document-groups?guid=... - delete a document group
export async function DELETE(req: NextRequest) {
  const guid = req.nextUrl.searchParams.get("guid");
  if (!guid) {
    return NextResponse.json({ error: "Missing group GUID" }, { status: 400 });
  }

  const groups = readGroups();
  const filteredGroups = groups.filter((g: any) => g.guid !== guid);
  
  if (filteredGroups.length === groups.length) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  
  writeGroups(filteredGroups);
  
  return NextResponse.json({ success: true });
}

// PATCH /api/document-groups?guid=... - increment document count
export async function PATCH(req: NextRequest) {
  const guid = req.nextUrl.searchParams.get("guid");
  if (!guid) {
    return NextResponse.json({ error: "Missing group GUID" }, { status: 400 });
  }

  try {
    const { increment = 1 } = await req.json();
    
    const groups = readGroups();
    const groupIndex = groups.findIndex((g: any) => g.guid === guid);

    if (groupIndex === -1) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Increment document count
    groups[groupIndex].documentCount = (groups[groupIndex].documentCount || 0) + increment;
    
    // Ensure count doesn't go below 0
    if (groups[groupIndex].documentCount < 0) {
      groups[groupIndex].documentCount = 0;
    }
    
    writeGroups(groups);

    return NextResponse.json({ 
      success: true,
      group: groups[groupIndex]
    });
  } catch (error) {
    console.error("Error updating document count:", error);
    return NextResponse.json({ error: "Failed to update document count" }, { status: 500 });
  }
}
