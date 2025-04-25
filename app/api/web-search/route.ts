import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "langchain/llms/openai";
import { ChatAnthropic } from "langchain/llms/anthropic";

// POST /api/web-search
// Body: { question: string, provider?: "openai" | "anthropic", apiKey?: string, systemPrompt?: string }
export async function POST(req: NextRequest) {
  const { question, provider = "openai", apiKey, systemPrompt, useWebSearch } = await req.json();
  if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  // Use user-supplied key or fallback to env
  const openaiApiKey = provider === "openai" ? (apiKey || process.env.OPENAI_API_KEY) : undefined;
  const anthropicApiKey = provider === "anthropic" ? (apiKey || process.env.ANTHROPIC_API_KEY) : undefined;

  try {
    // Perform web search
    const searchResults = await performWebSearch(question);
    
    // Create a context-enhanced prompt
    const enhancedPrompt = createEnhancedPrompt(question, searchResults, systemPrompt);
    
    // Get response from LLM
    let answer;
    if (provider === "anthropic") {
      if (!anthropicApiKey) return NextResponse.json({ error: "Missing Anthropic API key" }, { status: 400 });
      const model = new ChatAnthropic({ 
        anthropicApiKey, 
        modelName: "claude-3-opus-20240229", 
        systemPrompt: enhancedPrompt 
      });
      const response = await model.invoke(question);
      answer = response.content;
    } else {
      if (!openaiApiKey) return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 400 });
      const model = new OpenAI({ 
        openAIApiKey: openaiApiKey, 
        temperature: 0,
        modelName: "gpt-4o",
        systemPrompt: enhancedPrompt
      });
      const response = await model.invoke(question);
      answer = response;
    }

    return NextResponse.json({ 
      answer,
      sources: searchResults.map(r => ({ title: r.title, url: r.url }))
    });
  } catch (error) {
    console.error("Error in web search:", error);
    return NextResponse.json({ error: "Failed to process web search request" }, { status: 500 });
  }
}

async function performWebSearch(query: string) {
  // This is a mock implementation - in a real app, you would integrate with a search API
  // like Google Custom Search, Bing Search, or another search provider
  
  // For now, return mock results
  return [
    {
      title: "Example Search Result 1",
      url: "https://example.com/result1",
      snippet: "This is a snippet from the first search result that might be relevant to the query."
    },
    {
      title: "Example Search Result 2",
      url: "https://example.com/result2",
      snippet: "This is a snippet from the second search result with additional information."
    }
  ];
}

function createEnhancedPrompt(question: string, searchResults: any[], baseSystemPrompt?: string) {
  const searchContext = searchResults.map(result => 
    `Title: ${result.title}\nURL: ${result.url}\nContent: ${result.snippet}`
  ).join("\n\n");
  
  const defaultSystemPrompt = "You are a helpful assistant that answers questions based on web search results.";
  const systemPrompt = baseSystemPrompt || defaultSystemPrompt;
  
  return `${systemPrompt}\n\nThe user asked: "${question}"\n\nHere are some web search results that might be helpful:\n\n${searchContext}\n\nPlease provide a helpful response based on these search results. If the search results don't contain relevant information, you can use your general knowledge but make it clear when you're doing so.`;
}
