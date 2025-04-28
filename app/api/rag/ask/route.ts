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
import { addDebugMessage } from "../../utils/debug-storage";

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

// Helper function for pretty-printing debug logs and saving to debug file
async function debugLog(label: string, data: any, conversationId?: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`${label}:`);
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
  console.log('='.repeat(80) + '\n');
  
  // Save debug information to XML file if conversation ID is provided
  // Only save JSON objects to avoid duplication, and only for specific labels
  if (conversationId) {
    // Only store SENDING TO OPENAI/ANTHROPIC and FINAL RESPONSE TO CLIENT
    // Skip USER QUESTION (raw text) and other intermediate logs
    if (label === 'SENDING TO OPENAI' || 
        label === 'SENDING TO ANTHROPIC' || 
        label === 'FINAL RESPONSE TO CLIENT') {
      
      const type = label.toLowerCase().includes('response') ? 'response' : 'request';
      await addDebugMessage(conversationId, {
        type,
        content: data,
        timestamp: Date.now()
      });
    }
  }
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
  
  // Get LLM parameters from settings or use defaults
  const llmParams = settings.llm_parameters || {
    temperature: 0.7,
    top_p: 1.0,
    max_tokens: 2000,
    presence_penalty: 0.0,
    frequency_penalty: 0.0
  };
  
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
    
    // Log the user question (console only, not saved to debug file)
    await debugLog('USER QUESTION', question);
    
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
          temperature: llmParams.temperature,
          topP: llmParams.top_p,
          maxTokens: llmParams.max_tokens,
          presencePenalty: llmParams.presence_penalty,
          frequencyPenalty: llmParams.frequency_penalty
        });
        
        const prompt = ChatPromptTemplate.fromMessages([
          ["system", systemPrompt || "You are a helpful AI assistant."],
          ["human", "{question}"]
        ]);
        
        const chain = prompt.pipe(chat);
        
        await debugLog('SENDING TO OPENAI', {
          model: modelName,
          parameters: llmParams,
          systemPrompt,
          question
        }, conversation);
        
        const result = await chain.invoke({ question });
        
        response = { text: result.content.toString() };
        
        // Log the OpenAI response (console only, not saved to debug file)
        await debugLog('OPENAI RESPONSE', response.text);
      } 
      // For Anthropic models
      else {
        const { ChatAnthropic } = await import("@langchain/anthropic");
        const { ChatPromptTemplate } = await import("@langchain/core/prompts");
        
        const chat = new ChatAnthropic({
          anthropicApiKey,
          modelName: modelName,
          temperature: llmParams.temperature,
          topP: llmParams.top_p,
          maxTokens: llmParams.max_tokens
        });
        
        const prompt = ChatPromptTemplate.fromMessages([
          ["system", systemPrompt || "You are a helpful AI assistant."],
          ["human", "{question}"]
        ]);
        
        const chain = prompt.pipe(chat);
        
        await debugLog('SENDING TO OPENAI', {
          model: modelName,
          parameters: llmParams,
          systemPrompt,
          question
        }, conversation);
        
        const result = await chain.invoke({ question });
        
        response = { text: result.content.toString() };
        
        // Log the OpenAI response (console only, not saved to debug file)
        await debugLog('OPENAI RESPONSE', response.text);
      }
    } else {
      // Use RAG with the vector store
      if (!vectorStore) {
        throw new Error("Vector store is undefined but useDirectQA is false");
      }
      const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
      
      await debugLog('SENDING RAG QUERY', {
        provider,
        model: modelName,
        question
      }, conversation);
      
      response = await chain.call({ query: question });
      
      // Log the RAG response (console only, not saved to debug file)
      await debugLog('RAG RESPONSE', response.text);
    }
    
    // Store the assistant's response in XML format
    await addMessage(conversation, {
      role: "assistant",
      content: response.text,
      timestamp: Date.now(),
      usedRag: !useDirectQA
    });

    // Log the final response being sent to client
    await debugLog('FINAL RESPONSE TO CLIENT', {
      answer: response.text,
      usedRag: !useDirectQA
    }, conversation);
    
    return NextResponse.json({ 
      answer: response.text,
      usedRag: !useDirectQA
    });
  } catch (error: any) {
    console.error("Error processing question:", error);
    
    // Log the error
    await debugLog('ERROR PROCESSING QUESTION', {
      error: error?.message || "Unknown error",
      stack: error?.stack
    }, conversation);
    
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
