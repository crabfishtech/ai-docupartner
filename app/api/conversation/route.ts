import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdirSync, existsSync, rmSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const conversationsPath = path.join(process.cwd(), "files", "conversations.json");
const filesRoot = path.join(process.cwd(), "files");

function readConversations() {
  if (!existsSync(conversationsPath)) return [];
  const data = readFileSync(conversationsPath, "utf-8");
  return JSON.parse(data);
}

function writeConversations(list: any[]) {
  writeFileSync(conversationsPath, JSON.stringify(list, null, 2));
}

// GET /api/conversation - list all
export async function GET() {
  const conversations = readConversations();
  return NextResponse.json({ conversations });
}

// POST /api/conversation - create new
export async function POST(req: NextRequest) {
  const guid = randomUUID();
  const filesDir = path.join(filesRoot, guid);
  if (!existsSync(filesDir)) {
    mkdirSync(filesDir, { recursive: true });
  }
  const conversations = readConversations();
  const name = `Conversation ${conversations.length + 1}`;
  const newConv = { guid, name };
  conversations.push(newConv);
  writeConversations(conversations);
  return NextResponse.json(newConv);
}

// PUT /api/conversation?guid=... - rename conversation
export async function PUT(req: NextRequest) {
  const guid = req.nextUrl.searchParams.get("guid");
  if (!guid) {
    return NextResponse.json({ error: "Missing conversation GUID" }, { status: 400 });
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Missing name in request body" }, { status: 400 });
    }

    const conversations = readConversations();
    const conversationIndex = conversations.findIndex((c: any) => c.guid === guid);

    if (conversationIndex === -1) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    conversations[conversationIndex].name = name;
    writeConversations(conversations);

    return NextResponse.json({ 
      success: true,
      conversation: conversations[conversationIndex]
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}

// DELETE /api/conversation?guid=...
export async function DELETE(req: NextRequest) {
  const guid = req.nextUrl.searchParams.get("guid");
  if (!guid) return NextResponse.json({ error: "Missing guid" }, { status: 400 });
  const conversations = readConversations();
  const idx = conversations.findIndex((c: any) => c.guid === guid);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  conversations.splice(idx, 1);
  writeConversations(conversations);
  // Remove files folder
  const convDir = path.join(filesRoot, guid);
  if (existsSync(convDir)) {
    rmSync(convDir, { recursive: true, force: true });
  }
  return NextResponse.json({ ok: true });
}
