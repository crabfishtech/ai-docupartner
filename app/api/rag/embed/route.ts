import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

// Helper function to read settings
function readSettings() {
  const settingsPath = path.join(process.cwd(), "files", "app-settings.json");
  
  if (!existsSync(settingsPath)) {
    // Return default settings if file doesn't exist
    return {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant.",
      vector_store: "memory" // Default to memory vector store
    };
  }
  
  try {
    const fileContent = readFileSync(settingsPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading settings file:", error);
    // Return default settings on error
    return {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant.",
      vector_store: "memory" // Default to memory vector store
    };
  }
}

// POST /api/rag/embed?conversation=GUID
export async function POST(req: NextRequest) {
  const conversation = req.nextUrl.searchParams.get("conversation");
  if (!conversation) return NextResponse.json({ error: "Missing conversation GUID" }, { status: 400 });
  const filesDir = path.join(process.cwd(), "files", conversation);
  if (!existsSync(filesDir)) return NextResponse.json({ error: "No files for conversation" }, { status: 404 });

  // Read all text files in the conversation folder
  const files = (await import("fs/promises")).readdir(filesDir);
  const docs: { content: string; name: string }[] = [];
  for (const file of await files) {
    const ext = path.extname(file).toLowerCase();
    if ([".txt", ".md"].includes(ext)) {
      const content = readFileSync(path.join(filesDir, file), "utf8");
      docs.push({ content, name: file });
    }
    // TODO: Add PDF/DOCX parsing as needed
  }

  // Split and embed
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 100 });
  const allChunks = [];
  for (const doc of docs) {
    const splits = await splitter.splitText(doc.content);
    for (const chunk of splits) {
      allChunks.push({ content: chunk, metadata: { file: doc.name } });
    }
  }

  // Get settings to determine which vector store to use
  const settings = readSettings();
  const vectorStoreType = settings.vector_store || "memory";
  
  // Initialize embeddings with proper API key format
  const embeddings = new OpenAIEmbeddings({ 
    apiKey: process.env.OPENAI_API_KEY 
  });
  
  let vectorStore;
  let vectorStorePath;
  
  // Create vector store based on settings
  if (vectorStoreType === "chroma") {
    try {
      // For Chroma, we'll use the external service if it's running
      vectorStore = await Chroma.fromTexts(
        allChunks.map(c => c.content),
        allChunks.map(c => c.metadata),
        embeddings,
        { collectionName: `conv_${conversation}` }
      );
    } catch (error) {
      console.error("Error creating Chroma vector store:", error);
      // Fall back to memory vector store if Chroma fails
      vectorStore = await MemoryVectorStore.fromTexts(
        allChunks.map(c => c.content),
        allChunks.map(c => c.metadata),
        embeddings
      );
      
      // Save the memory vector store to a JSON file
      vectorStorePath = path.join(process.cwd(), "files", conversation, "vector_store.json");
      
      // Since MemoryVectorStore doesn't have a serialize method, we'll manually extract the data
      // @ts-ignore - Accessing internal property for serialization
      const memoryVectors = vectorStore.memoryVectors || [];
      const serialized = {
        memoryVectors: memoryVectors.map((vector: any) => ({
          content: vector.pageContent,
          metadata: vector.metadata,
          embedding: vector.embedding
        }))
      };
      
      writeFileSync(vectorStorePath, JSON.stringify(serialized));
    }
  } else {
    // Use memory vector store
    vectorStore = await MemoryVectorStore.fromTexts(
      allChunks.map(c => c.content),
      allChunks.map(c => c.metadata),
      embeddings
    );
    
    // Save the memory vector store to a JSON file
    vectorStorePath = path.join(process.cwd(), "files", conversation, "vector_store.json");
    
    // Since MemoryVectorStore doesn't have a serialize method, we'll manually extract the data
    // @ts-ignore - Accessing internal property for serialization
    const memoryVectors = vectorStore.memoryVectors || [];
    const serialized = {
      memoryVectors: memoryVectors.map((vector: any) => ({
        content: vector.pageContent,
        metadata: vector.metadata,
        embedding: vector.embedding
      }))
    };
    
    writeFileSync(vectorStorePath, JSON.stringify(serialized));
  }

  return NextResponse.json({ 
    embedded: allChunks.length,
    vectorStore: vectorStoreType,
    fallbackUsed: vectorStorePath ? true : false
  });
}
