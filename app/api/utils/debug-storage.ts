import crypto from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { parseStringPromise, Builder } from "xml2js";

// Path to conversations directory
const conversationsDir = path.join(process.cwd(), "files", "conversations");

// Ensure conversations directory exists
if (!existsSync(conversationsDir)) {
  mkdirSync(conversationsDir, { recursive: true });
}

// Helper function to get the path to a conversation's debug file
export function getConversationDebugPath(conversationId: string): string {
  return path.join(conversationsDir, `${conversationId}-debug.xml`);
}

// Helper function to read debug messages from XML file
export async function readDebugMessages(conversationId: string) {
  const debugPath = getConversationDebugPath(conversationId);
  
  if (!existsSync(debugPath)) {
    return [];
  }
  
  try {
    const xmlData = readFileSync(debugPath, "utf-8");
    const result = await parseStringPromise(xmlData);
    
    // If no debug messages exist yet, return empty array
    if (!result.debugMessages || !result.debugMessages.debugMessage) {
      return [];
    }
    
    // Convert XML structure to our debug message format
    return result.debugMessages.debugMessage.map((msg: any) => ({
      id: msg.$.id,
      type: msg.$.type,
      timestamp: parseInt(msg.$.timestamp),
      content: JSON.parse(msg.content[0])
    }));
  } catch (error) {
    console.error(`Error reading debug messages for conversation ${conversationId}:`, error);
    return [];
  }
}

// Helper function to write debug messages to XML file
export async function writeDebugMessages(conversationId: string, messages: any[]) {
  const debugPath = getConversationDebugPath(conversationId);
  
  // Create XML structure
  const xmlObj = {
    debugMessages: {
      debugMessage: messages.map(msg => ({
        $: {
          id: msg.id,
          type: msg.type,
          timestamp: msg.timestamp.toString()
        },
        content: [JSON.stringify(msg.content, null, 2)]
      }))
    }
  };
  
  // Convert to XML string
  const builder = new Builder({
    renderOpts: { pretty: true, indent: '  ', newline: '\n' },
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });
  const xml = builder.buildObject(xmlObj);
  
  // Write to file
  writeFileSync(debugPath, xml);
}

// Helper function to add a debug message to a conversation
export async function addDebugMessage(conversationId: string, message: any) {
  // Read existing debug messages
  const messages = await readDebugMessages(conversationId);
  
  // Create a new debug message with ID and timestamp if not provided
  const newMessage = {
    ...message,
    id: message.id || crypto.randomUUID(),
    timestamp: message.timestamp || Date.now()
  };
  
  // Add the new debug message to the list
  messages.push(newMessage);
  
  // Write updated debug messages back to file
  await writeDebugMessages(conversationId, messages);
  
  return newMessage;
}
