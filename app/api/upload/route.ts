import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, existsSync, writeFileSync } from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

// POST /api/upload?conversation=GUID&groupId=GUID
export async function POST(req: NextRequest) {
  const conversation = req.nextUrl.searchParams.get("conversation");
  const groupId = req.nextUrl.searchParams.get("groupId");
  
  if (!groupId) {
    return NextResponse.json({ error: "Document group ID is required" }, { status: 400 });
  }
  
  // Determine the target directory
  let filesDir;
  if (conversation) {
    // If we have both conversation and group, store in conversation/group
    filesDir = path.join(process.cwd(), "files", conversation, groupId);
  } else {
    // If we only have group, store in group directory
    filesDir = path.join(process.cwd(), "files", "groups", groupId);
  }
  
  if (!existsSync(filesDir)) {
    mkdirSync(filesDir, { recursive: true });
  }
  
  // Increment document count for the group
  try {
    await fetch(`${req.nextUrl.origin}/api/document-groups?guid=${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ increment: 1 })
    });
  } catch (error) {
    console.error("Error updating document count:", error);
    // Continue with upload even if count update fails
  }
  const formData = await req.formData();
  const files = formData.getAll("file");
  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }
  const saved: string[] = [];
  for (const file of files) {
    if (typeof file === "object" && "arrayBuffer" in file && file.name) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(filesDir, file.name);
      writeFileSync(filePath, buffer);
      saved.push(file.name);
    }
  }
  return NextResponse.json({ saved });
}
