import { NextRequest, NextResponse } from "next/server";
import { readDebugMessages } from "../../utils/debug-storage";

// GET /api/debug/:conversationId
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const conversationId = params.conversationId;
  
  if (!conversationId) {
    return NextResponse.json(
      { error: "Missing conversation ID" },
      { status: 400 }
    );
  }
  
  try {
    // Read debug messages from the XML file
    const debugMessages = await readDebugMessages(conversationId);
    
    return NextResponse.json({ debugMessages });
  } catch (error) {
    console.error(`Error retrieving debug messages for conversation ${conversationId}:`, error);
    
    return NextResponse.json(
      { error: "Failed to retrieve debug messages" },
      { status: 500 }
    );
  }
}
