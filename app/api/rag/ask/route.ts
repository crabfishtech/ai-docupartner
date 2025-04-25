import { NextRequest, NextResponse } from "next/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAI } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { RetrievalQAChain } from "langchain/chains";
import path from "path";
import fs from "fs";

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

// POST /api/rag/ask?conversation=GUID
// Body: { question: string, apiKey?: string }
export async function POST(req: NextRequest) {
  const conversation = req.nextUrl.searchParams.get("conversation");
  if (!conversation) return NextResponse.json({ error: "Missing conversation GUID" }, { status: 400 });
  const { question, apiKey } = await req.json();
  if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  // Get settings from app-settings.json
  const settings = readSettings();
  const provider = settings.llm_provider || "openai";
  const modelName = settings.llm_model || "gpt-4o";
  const systemPrompt = settings.system_prompt || "You are a helpful assistant.";
  
  // Use user-supplied key or fallback to env
  const openaiApiKey = provider === "openai" ? (apiKey || process.env.OPENAI_API_KEY) : undefined;
  const anthropicApiKey = provider === "anthropic" ? (apiKey || process.env.ANTHROPIC_API_KEY) : undefined;

  // Embeddings always use OpenAI for now
  const embeddings = new OpenAIEmbeddings({ apiKey: openaiApiKey || process.env.OPENAI_API_KEY });
  const vectorStore = await Chroma.fromExistingCollection(embeddings, { collectionName: `conv_${conversation}` });

  let model;
  try {
    if (provider === "anthropic") {
      if (!anthropicApiKey) return NextResponse.json({ error: "Missing Anthropic API key" }, { status: 400 });
      model = new ChatAnthropic({ 
        anthropicApiKey, 
        modelName: modelName // Use model from settings
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
    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
    const response = await chain.call({ query: question });

    return NextResponse.json({ answer: response.text });
  } catch (error: any) {
    console.error("Error in RAG chain:", error);
    return NextResponse.json({ 
      error: "Error processing your question", 
      details: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}
