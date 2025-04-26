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

// Helper function to get the path to a conversation's messages file
export function getConversationMessagesPath(conversationId: string): string {
  return path.join(conversationsDir, `${conversationId}.xml`);
}

// Helper function to read messages from XML file
export async function readMessages(conversationId: string) {
  const messagesPath = getConversationMessagesPath(conversationId);
  
  if (!existsSync(messagesPath)) {
    return [];
  }
  
  try {
    const xmlData = readFileSync(messagesPath, "utf-8");
    const result = await parseStringPromise(xmlData);
    
    // If no messages exist yet, return empty array
    if (!result.messages || !result.messages.message) {
      return [];
    }
    
    // Convert XML structure to our message format
    return result.messages.message.map((msg: any) => ({
      id: msg.$.id,
      role: msg.$.role,
      content: msg.content[0],
      timestamp: parseInt(msg.$.timestamp),
      sourceType: msg.$.sourceType || undefined,
      sourceUrl: msg.$.sourceUrl || undefined,
      usedRag: msg.$.usedRag === "true" ? true : undefined
    }));
  } catch (error) {
    console.error(`Error reading messages for conversation ${conversationId}:`, error);
    return [];
  }
}

// Helper function to write messages to XML file
export async function writeMessages(conversationId: string, messages: any[]) {
  const messagesPath = getConversationMessagesPath(conversationId);
  
  // Create XML structure
  const xmlObj = {
    messages: {
      message: messages.map(msg => ({
        $: {
          id: msg.id,
          role: msg.role,
          timestamp: msg.timestamp.toString(),
          ...(msg.sourceType && { sourceType: msg.sourceType }),
          ...(msg.sourceUrl && { sourceUrl: msg.sourceUrl }),
          ...(msg.usedRag !== undefined && { usedRag: msg.usedRag.toString() })
        },
        content: [msg.content]
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
  writeFileSync(messagesPath, xml);
}

// Helper function to add a message to a conversation
export async function addMessage(conversationId: string, message: any) {
  // Read existing messages
  const messages = await readMessages(conversationId);
  
  // Create a new message with ID and timestamp if not provided
  const newMessage = {
    ...message,
    id: message.id || crypto.randomUUID(),
    timestamp: message.timestamp || Date.now()
  };
  
  // Add the new message to the list
  messages.push(newMessage);
  
  // Write updated messages back to file
  await writeMessages(conversationId, messages);
  
  return newMessage;
}
