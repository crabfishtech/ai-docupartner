import { NextRequest, NextResponse } from "next/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAI } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { RetrievalQAChain } from "langchain/chains";
import path from "path";
import fs from "fs";
import { addMessage } from "../../utils/message-storage";

// Helper function to read settings
function readSettings() {
  const settingsPath = path.join(process.cwd(), "files", "app-settings.json");
  
  if (!fs.existsSync(settingsPath)) {
    // Return default settings if file doesn't exist
    return {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant."
    };
  }
  
  try {
    const fileContent = fs.readFileSync(settingsPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading settings file:", error);
    // Return default settings on error
    return {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant."
    };
  }
}

// Helper function for pretty-printing debug logs
function debugLog(label: string, data: any) {
  console.log('\n' + '='.repeat(80));
  console.log(`${label}:`);
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
  console.log('='.repeat(80) + '\n');
}

// POST /api/rag/ask?conversation=GUID
// Body: { message: string, systemPrompt?: string, webSearch?: boolean, groupId?: string }
export async function POST(req: NextRequest) {
  const conversation = req.nextUrl.searchParams.get("conversation");
  if (!conversation) return NextResponse.json({ error: "Missing conversation GUID" }, { status: 400 });
  
  const requestBody = await req.json();
  const { message, webSearch, groupId } = requestBody;
  
  if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });
  
  // For backward compatibility, support both 'message' and 'question' parameters
  const question = message;
  
  // Get settings from app-settings.json
  const settings = readSettings();
  const provider = settings.llm_provider || "openai";
  const modelName = settings.llm_model || "gpt-4o";
  
  // Always use the system prompt from settings
  var systemPrompt = settings.system_prompt || "You are a helpful assistant.";
  // Ensure all our responses are handled as markdown.
  systemPrompt = systemPrompt + "Return all responses in Markdown.";
  const apiKey = settings.llm_api_key;
  
  // Use settings-supplied key or fallback to env
  const openaiApiKey = provider === "openai" ? (apiKey || process.env.OPENAI_API_KEY) : undefined;
  const anthropicApiKey = provider === "anthropic" ? (apiKey || process.env.ANTHROPIC_API_KEY) : undefined;

  // Embeddings always use OpenAI for now
  const embeddings = new OpenAIEmbeddings({ apiKey: openaiApiKey || process.env.OPENAI_API_KEY });
  
  // Determine which vector store to use based on settings
  const vectorStoreType = settings.vector_store || "memory";
  let vectorStore;
  let useDirectQA = webSearch || false;
  
  // Define paths for both conversation-specific and global vector stores
  const conversationVectorStorePath = path.join(process.cwd(), "files", "conversations", conversation, "vector_store.json");
  const globalVectorStorePath = path.join(process.cwd(), "files", "vector-store.json");
  
  if (vectorStoreType === "chroma") {
    try {
      // Try to use Chroma if it's configured
      vectorStore = await Chroma.fromExistingCollection(embeddings, { 
        collectionName: `conv_${conversation}` 
      });
    } catch (error) {
      console.error("Error connecting to Chroma:", error);
      
      // Fall back to memory vector store if available
      // First check conversation-specific path, then fall back to global path
      let vectorStorePath = null;
      
      if (fs.existsSync(conversationVectorStorePath)) {
        vectorStorePath = conversationVectorStorePath;
      } else if (fs.existsSync(globalVectorStorePath)) {
        vectorStorePath = globalVectorStorePath;
      }
      
      if (vectorStorePath) {
        // Load from the saved JSON file
        try {
          const serializedData = JSON.parse(fs.readFileSync(vectorStorePath, 'utf8'));
          // Create a new MemoryVectorStore with the saved data
          const { memoryVectors } = serializedData;
          
          // Since we can't directly deserialize, we'll need to recreate the vector store
          // This is a simplified approach - in a real app, you'd want a more robust solution
          const documents = memoryVectors.map((vector: any) => ({
            pageContent: vector.content,
            metadata: vector.metadata
          }));
          
          // Create a new memory vector store
          const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
          vectorStore = new MemoryVectorStore(embeddings);
          
          // Add the documents to the vector store
          if (documents.length > 0) {
            await vectorStore.addDocuments(documents);
          } else {
            // Fall back to direct question answering
            useDirectQA = true;
          }
        } catch (err) {
          console.error("Error loading memory vector store:", err);
          // Fall back to direct question answering
          useDirectQA = true;
        }
      } else {
        // Fall back to direct question answering
        useDirectQA = true;
      }
    }
  } else {
    // Use memory vector store
    // First check conversation-specific path, then fall back to global path
    let vectorStorePath = null;
    
    if (fs.existsSync(conversationVectorStorePath)) {
      vectorStorePath = conversationVectorStorePath;
    } else if (fs.existsSync(globalVectorStorePath)) {
      vectorStorePath = globalVectorStorePath;
    }
    
    if (vectorStorePath) {
      // Load from the saved JSON file
      try {
        const serializedData = JSON.parse(fs.readFileSync(vectorStorePath, 'utf8'));
        // Create a new MemoryVectorStore with the saved data
        const { memoryVectors } = serializedData;
        
        // Since we can't directly deserialize, we'll need to recreate the vector store
        const documents = memoryVectors.map((vector: any) => ({
          pageContent: vector.content,
          metadata: vector.metadata
        }));
        
        // Create a new memory vector store
        const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
        vectorStore = new MemoryVectorStore(embeddings);
        
        // Add the documents to the vector store
        if (documents.length > 0) {
          await vectorStore.addDocuments(documents);
        } else {
          // Fall back to direct question answering
          useDirectQA = true;
        }
      } catch (err) {
        console.error("Error loading memory vector store:", err);
        // Fall back to direct question answering
        useDirectQA = true;
      }
    } else {
      // Fall back to direct question answering
      useDirectQA = true;
    }
  }

  let model;
  try {
    if (provider === "anthropic") {
      if (!anthropicApiKey) return NextResponse.json({ error: "Missing Anthropic API key" }, { status: 400 });
      model = new ChatAnthropic({ 
        anthropicApiKey, 
        modelName: modelName, // Use model from settings
        // Note: systemPrompt is handled differently for Anthropic models
        // We'll need to incorporate it in the chain or messages
      });
    } else {
      if (!openaiApiKey) return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 400 });
      // Use ChatOpenAI instead of OpenAI for better compatibility
      model = new ChatOpenAI({ 
        apiKey: openaiApiKey, 
        modelName: modelName, // Use model from settings
        temperature: 0 
      });
    }
  } catch (error) {
    console.error("Error initializing model:", error);
    return NextResponse.json({ error: "Failed to initialize AI model" }, { status: 500 });
  }

  try {
    // Store the user message in XML format
    await addMessage(conversation, {
      role: "user",
      content: question,
      timestamp: Date.now()
    });
    
    // Log the user question
    debugLog('USER QUESTION', question);
    
    let response;
    
    if (useDirectQA) {
      // If no vector store is available, use direct question answering
      console.log("No vector store available, using direct question answering");
      
      // For OpenAI models
      if (provider === "openai") {
        const { ChatOpenAI } = await import("@langchain/openai");
        const { ChatPromptTemplate } = await import("@langchain/core/prompts");
        
        const chat = new ChatOpenAI({
          apiKey: openaiApiKey,
          modelName: modelName,
          temperature: 0.7,
        });
        
        const prompt = ChatPromptTemplate.fromMessages([
          ["system", systemPrompt || "You are a helpful AI assistant."],
          ["human", "{question}"]
        ]);
        
        const chain = prompt.pipe(chat);
        
        debugLog('SENDING TO OPENAI', {
          model: modelName,
          temperature: 0.7,
          systemPrompt,
          question
        });
        
        const result = await chain.invoke({ question });
        
        response = { text: result.content.toString() };
        
        debugLog('OPENAI RESPONSE', response.text);
      } 
      // For Anthropic models
      else {
        const { ChatAnthropic } = await import("@langchain/anthropic");
        const { ChatPromptTemplate } = await import("@langchain/core/prompts");
        
        const chat = new ChatAnthropic({
          anthropicApiKey,
          modelName: modelName,
          temperature: 0.7,
        });
        
        const prompt = ChatPromptTemplate.fromMessages([
          ["system", systemPrompt || "You are a helpful AI assistant."],
          ["human", "{question}"]
        ]);
        
        const chain = prompt.pipe(chat);
        
        debugLog('SENDING TO OPENAI', {
          model: modelName,
          temperature: 0.7,
          systemPrompt,
          question
        });
        
        const result = await chain.invoke({ question });
        
        response = { text: result.content.toString() };
        
        debugLog('OPENAI RESPONSE', response.text);
      }
    } else {
      // Use RAG with the vector store
      if (!vectorStore) {
        throw new Error("Vector store is undefined but useDirectQA is false");
      }
      const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
      
      debugLog('SENDING RAG QUERY', {
        provider,
        model: modelName,
        question
      });
      
      response = await chain.call({ query: question });
      
      // Log the RAG response
      debugLog('RAG RESPONSE', response.text);
    }
    
    // Store the assistant's response in XML format
    await addMessage(conversation, {
      role: "assistant",
      content: response.text,
      timestamp: Date.now(),
      usedRag: !useDirectQA
    });

    // Log the final response being sent to client
    debugLog('FINAL RESPONSE TO CLIENT', {
      answer: response.text,
      usedRag: !useDirectQA
    });
    
    return NextResponse.json({ 
      answer: response.text,
      usedRag: !useDirectQA
    });
  } catch (error: any) {
    console.error("Error processing question:", error);
    
    // Log the error
    debugLog('ERROR PROCESSING QUESTION', {
      error: error?.message || "Unknown error",
      stack: error?.stack
    });
    
    // Store the error message in XML format
    try {
      await addMessage(conversation, {
        role: "system",
        content: "Sorry, there was an error processing your request.",
        timestamp: Date.now()
      });
    } catch (storageError) {
      console.error("Error storing error message:", storageError);
      // Continue even if storage fails
    }
    
    return NextResponse.json({ 
      error: "Error processing your question", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}
