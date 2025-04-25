import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// GET /api/conversation/[id] - Get a specific conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guid = params.id;
  if (!guid) {
    return NextResponse.json({ error: "Missing conversation GUID" }, { status: 400 });
  }

  const conversationsPath = path.join(process.cwd(), "files", "conversations.json");
  
  if (!fs.existsSync(conversationsPath)) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const conversationsData = JSON.parse(fs.readFileSync(conversationsPath, "utf8"));
  // Handle both formats: direct array or {conversations: [...]}
  const conversationsArray = Array.isArray(conversationsData) ? conversationsData : conversationsData.conversations || [];
  const conversation = conversationsArray.find((c: any) => c.guid === guid);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

// PUT /api/conversation/[id] - Update a conversation (name, etc)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guid = params.id;
  if (!guid) {
    return NextResponse.json({ error: "Missing conversation GUID" }, { status: 400 });
  }

  const { name } = await request.json();
  
  const conversationsPath = path.join(process.cwd(), "files", "conversations.json");
  
  if (!fs.existsSync(conversationsPath)) {
    return NextResponse.json({ error: "Conversations file not found" }, { status: 404 });
  }

  const conversationsData = JSON.parse(fs.readFileSync(conversationsPath, "utf8"));
  const conversationIndex = conversationsData.conversations.findIndex((c: any) => c.guid === guid);

  if (conversationIndex === -1) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Update the conversation name
  conversationsData.conversations[conversationIndex].name = name;
  
  fs.writeFileSync(conversationsPath, JSON.stringify(conversationsData, null, 2));

  return NextResponse.json({ 
    conversation: conversationsData.conversations[conversationIndex]
  });
}
