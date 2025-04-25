import { NextRequest, NextResponse } from "next/server";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAI } from "langchain/llms/openai";
import { ChatAnthropic } from "langchain/llms/anthropic";
import { RetrievalQAChain } from "langchain/chains";

// POST /api/rag/ask?conversation=GUID
// Body: { question: string, provider?: "openai" | "anthropic", apiKey?: string, systemPrompt?: string }
export async function POST(req: NextRequest) {
  const conversation = req.nextUrl.searchParams.get("conversation");
  if (!conversation) return NextResponse.json({ error: "Missing conversation GUID" }, { status: 400 });
  const { question, provider = "openai", apiKey, systemPrompt } = await req.json();
  if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  // Use user-supplied key or fallback to env
  const openaiApiKey = provider === "openai" ? (apiKey || process.env.OPENAI_API_KEY) : undefined;
  const anthropicApiKey = provider === "anthropic" ? (apiKey || process.env.ANTHROPIC_API_KEY) : undefined;

  // Embeddings always use OpenAI for now
  const embeddings = new OpenAIEmbeddings({ openAIApiKey: openaiApiKey || process.env.OPENAI_API_KEY });
  const vectorStore = await Chroma.fromExistingCollection(embeddings, { collectionName: `conv_${conversation}` });

  let model;
  if (provider === "anthropic") {
    if (!anthropicApiKey) return NextResponse.json({ error: "Missing Anthropic API key" }, { status: 400 });
    model = new ChatAnthropic({ anthropicApiKey, modelName: "claude-3-opus-20240229", systemPrompt });
  } else {
    if (!openaiApiKey) return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 400 });
    model = new OpenAI({ openAIApiKey, temperature: 0, systemPrompt });
  }

  const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
  const response = await chain.call({ query: question });

  return NextResponse.json({ answer: response.text });
}
