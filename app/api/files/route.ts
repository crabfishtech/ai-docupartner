import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { existsSync, readdirSync, unlinkSync, statSync } from "fs";

// GET /api/files - list all uploaded files (all conversations, flat list)
// DELETE /api/files?file=filename - delete a file by name (from any conversation)

const filesBaseDir = path.join(process.cwd(), "files");

type FileInfo = {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  groupId?: string;
  conversationId?: string;
  type: string;
};

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get("groupId");
  const conversationId = req.nextUrl.searchParams.get("conversation");
  
  if (!existsSync(filesBaseDir)) return NextResponse.json({ files: [] });
  
  let files: FileInfo[] = [];
  
  // Helper function to get file info
  const getFileInfo = (filePath: string, fileName: string, groupId?: string, conversationId?: string): FileInfo => {
    const fullPath = path.join(filesBaseDir, filePath);
    const stats = statSync(fullPath);
    const extension = path.extname(fileName).toLowerCase();
    
    // Determine file type based on extension
    let type = "document";
    if (['.pdf'].includes(extension)) type = "pdf";
    else if (['.doc', '.docx'].includes(extension)) type = "word";
    else if (['.txt'].includes(extension)) type = "text";
    else if (['.jpg', '.jpeg', '.png', '.gif'].includes(extension)) type = "image";
    
    return {
      name: fileName,
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      groupId,
      conversationId,
      type
    };
  };
  
  if (groupId) {
    // If we have a specific group ID
    if (conversationId) {
      // List files in conversation/group directory
      const groupPath = path.join(filesBaseDir, conversationId, groupId);
      if (existsSync(groupPath)) {
        const fileNames = readdirSync(groupPath);
        for (const fileName of fileNames) {
          const filePath = path.join(conversationId, groupId, fileName);
          files.push(getFileInfo(filePath, fileName, groupId, conversationId));
        }
      }
    } else {
      // List files in the group directory (not tied to a conversation)
      const groupPath = path.join(filesBaseDir, "groups", groupId);
      if (existsSync(groupPath)) {
        const fileNames = readdirSync(groupPath);
        for (const fileName of fileNames) {
          const filePath = path.join("groups", groupId, fileName);
          files.push(getFileInfo(filePath, fileName, groupId));
        }
      }
      
      // Also list files in all conversation folders for this group
      const convDirs = readdirSync(filesBaseDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== "groups");
      
      for (const dir of convDirs) {
        const groupInConvPath = path.join(filesBaseDir, dir.name, groupId);
        if (existsSync(groupInConvPath)) {
          const fileNames = readdirSync(groupInConvPath);
          for (const fileName of fileNames) {
            const filePath = path.join(dir.name, groupId, fileName);
            files.push(getFileInfo(filePath, fileName, groupId, dir.name));
          }
        }
      }
    }
  } else {
    // No group specified, list all files
    
    // List files in the root directory
    const rootEntries = readdirSync(filesBaseDir, { withFileTypes: true })
      .filter(f => f.isFile() && f.name !== 'conversations.json' && f.name !== 'document-groups.json');
    
    for (const entry of rootEntries) {
      files.push(getFileInfo(entry.name, entry.name));
    }
    
    // List files in the groups directory
    const groupsPath = path.join(filesBaseDir, "groups");
    if (existsSync(groupsPath)) {
      const groupDirs = readdirSync(groupsPath, { withFileTypes: true }).filter(d => d.isDirectory());
      for (const groupDir of groupDirs) {
        const groupDirPath = path.join(groupsPath, groupDir.name);
        const fileNames = readdirSync(groupDirPath);
        for (const fileName of fileNames) {
          const filePath = path.join("groups", groupDir.name, fileName);
          files.push(getFileInfo(filePath, fileName, groupDir.name));
        }
      }
    }
    
    // List all files in all conversation folders
    const convDirs = readdirSync(filesBaseDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== "groups");
    
    for (const dir of convDirs) {
      const dirPath = path.join(filesBaseDir, dir.name);
      // List files directly in the conversation folder
      if (existsSync(dirPath)) {
        const dirEntries = readdirSync(dirPath, { withFileTypes: true });
        
        // Get files in the conversation root
        const directFiles = dirEntries.filter(f => f.isFile());
        for (const file of directFiles) {
          const filePath = path.join(dir.name, file.name);
          files.push(getFileInfo(filePath, file.name, undefined, dir.name));
        }
        
        // Get files in group subfolders of this conversation
        const groupSubDirs = dirEntries.filter(d => d.isDirectory());
        for (const groupDir of groupSubDirs) {
          const groupPath = path.join(dirPath, groupDir.name);
          const fileNames = readdirSync(groupPath);
          for (const fileName of fileNames) {
            const filePath = path.join(dir.name, groupDir.name, fileName);
            files.push(getFileInfo(filePath, fileName, groupDir.name, dir.name));
          }
        }
      }
    }
  }
  
  return NextResponse.json({ files });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file");
  const groupId = url.searchParams.get("groupId");
  
  if (!file) return NextResponse.json({ error: "Missing file param" }, { status: 400 });
  
  const filePath = path.join(filesBaseDir, file);
  if (!existsSync(filePath)) return NextResponse.json({ error: "File not found" }, { status: 404 });
  
  // Delete the file
  unlinkSync(filePath);
  
  // If a groupId was provided, decrement the document count
  if (groupId) {
    try {
      await fetch(`${req.nextUrl.origin}/api/document-groups?guid=${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: -1 })
      });
    } catch (error) {
      console.error("Error updating document count:", error);
      // Continue anyway since the file was deleted
    }
  }
  
  return NextResponse.json({ success: true });
}
