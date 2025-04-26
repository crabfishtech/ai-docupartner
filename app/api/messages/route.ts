import { NextRequest, NextResponse } from "next/server";
import { readMessages, addMessage } from "../utils/message-storage";

// GET /api/messages?conversation=<conversationId>
export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversation");
  
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversation parameter" }, { status: 400 });
  }
  
  try {
    const messages = await readMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return NextResponse.json({ error: "Failed to retrieve messages" }, { status: 500 });
  }
}
