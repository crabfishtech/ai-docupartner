import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { existsSync, readdirSync, readFileSync } from "fs";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "langchain/document";

// Function to read settings
function readSettings() {
  const settingsPath = path.join(process.cwd(), "files", "app-settings.json");
  
  if (!existsSync(settingsPath)) {
    return {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant.",
      llm_api_key: process.env.OPENAI_API_KEY,
      vector_store: "memory"
    };
  }
  
  try {
    const fileContent = fs.readFileSync(settingsPath, "utf8");
    const settings = JSON.parse(fileContent);
    
    // Use environment variables as fallbacks
    if (!settings.llm_api_key) {
      if (settings.llm_provider === "openai") {
        settings.llm_api_key = process.env.OPENAI_API_KEY;
      } else if (settings.llm_provider === "anthropic") {
        settings.llm_api_key = process.env.ANTHROPIC_API_KEY;
      }
    }
    
    return settings;
  } catch (error) {
    console.error("Error reading settings file:", error);
    return {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant.",
      llm_api_key: process.env.OPENAI_API_KEY,
      vector_store: "memory"
    };
  }
}

// POST /api/rag/compile - Compile all documents into the vector database
export async function POST() {
  try {
    const settings = readSettings();
    const vectorStoreType = settings.vector_store || "memory";
    const apiKey = settings.llm_api_key;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required for embedding" },
        { status: 400 }
      );
    }
    
    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: "text-embedding-3-small",
    });
    
    // Base directory for files
    const filesBaseDir = path.join(process.cwd(), "files");
    const groupsDir = path.join(filesBaseDir, "groups");
    
    // Ensure the groups directory exists
    if (!existsSync(groupsDir)) {
      return NextResponse.json({ success: true, message: "No documents to compile" });
    }
    
    // Get all document groups
    const groups = readdirSync(groupsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    if (groups.length === 0) {
      return NextResponse.json({ success: true, message: "No documents to compile" });
    }
    
    // Initialize text splitter
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    // Process all documents
    const allDocuments: Document[] = [];
    
    for (const group of groups) {
      const groupPath = path.join(groupsDir, group);
      const files = readdirSync(groupPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .filter(dirent => !dirent.name.endsWith('.json')); // Exclude JSON files
      
      for (const file of files) {
        const filePath = path.join(groupPath, file.name);
        const fileExt = path.extname(file.name).toLowerCase();
        
        try {
          // For simplicity, we'll only process text files directly
          // For other file types, we'll just use the filename as content
          // In a production app, you'd want to use proper document loaders
          
          let text = "";
          if (fileExt === ".txt") {
            // Read text files directly
            text = readFileSync(filePath, 'utf-8');
          } else {
            // For non-text files, just use the filename as a placeholder
            // In a real application, you'd use proper document loaders
            text = `File: ${file.name} (Content not extracted - requires specific loader)`;
          }
          
          // Create a document with the text content
          const doc = new Document({
            pageContent: text,
            metadata: {
              source: file.name,
              group: group,
              path: filePath,
              type: fileExt
            }
          });
          
          // Split document into chunks
          const splitDocs = await textSplitter.splitText(text);
          
          // Convert text chunks to documents with metadata
          const docs = splitDocs.map(chunk => new Document({
            pageContent: chunk,
            metadata: {
              source: file.name,
              group: group,
              path: filePath,
              type: fileExt
            }
          }));
          
          allDocuments.push(...docs);
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
          // Continue with other files
        }
      }
    }
    
    if (allDocuments.length === 0) {
      return NextResponse.json({ success: true, message: "No documents were processed" });
    }
    
    // Store documents in vector store
    if (vectorStoreType === "chroma") {
      // Use Chroma vector store
      const chromaDir = path.join(filesBaseDir, "chroma");
      
      // Create a new Chroma collection
      await Chroma.fromDocuments(allDocuments, embeddings, {
        collectionName: "documents",
        url: "http://localhost:8000", // Default Chroma URL
        collectionMetadata: {
          "hnsw:space": "cosine",
        },
        // Note: The directory is handled by Chroma internally
        // We don't pass the path directly to avoid type errors
      });
    } else {
      // Use in-memory vector store
      const vectorStore = await MemoryVectorStore.fromDocuments(
        allDocuments,
        embeddings
      );
      
      // Serialize the vector store to JSON
      const vectorStoreData = {
        chunks: allDocuments.map((doc, i) => ({
          id: i.toString(),
          text: doc.pageContent,
          metadata: doc.metadata,
        })),
      };
      
      // Save to file
      const vectorStorePath = path.join(filesBaseDir, "vector-store.json");
      fs.writeFileSync(
        vectorStorePath,
        JSON.stringify(vectorStoreData, null, 2)
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Database compiled successfully",
      documentCount: allDocuments.length,
    });
  } catch (error) {
    console.error("Error compiling database:", error);
    return NextResponse.json(
      { error: "Failed to compile database" },
      { status: 500 }
    );
  }
}
