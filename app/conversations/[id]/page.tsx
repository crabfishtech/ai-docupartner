"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  sourceType?: "document" | "web";
  sourceUrl?: string;
};

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [conversationName, setConversationName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load settings from localStorage
    const storedProvider = localStorage.getItem("llm_provider");
    const storedKey = localStorage.getItem("llm_api_key");
    const storedPrompt = localStorage.getItem("system_prompt");
    if (storedProvider) setProvider(storedProvider);
    if (storedKey) setApiKey(storedKey);
    if (storedPrompt) setSystemPrompt(storedPrompt);

    // Load conversation details if conversationId exists
    if (conversationId && conversationId !== "new") {
      fetchConversation();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function fetchConversation() {
    try {
      const res = await fetch(`/api/conversation?guid=${conversationId}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      const data = await res.json();
      if (data.conversation) {
        setConversationName(data.conversation.name || data.conversation.guid);
        // If we had message history, we would load it here
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Determine if we should use web search
      const endpoint = webSearch 
        ? `/api/web-search` 
        : `/api/rag/ask?conversation=${conversationId}`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: input,
          provider,
          apiKey,
          systemPrompt,
          useWebSearch: webSearch,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    
    setUploading(true);
    const formData = new FormData();
    Array.from(e.target.files).forEach(f => formData.append("file", f));
    
    try {
      // Upload to the specific conversation folder
      const uploadRes = await fetch(`/api/upload?conversation=${conversationId}`, {
        method: "POST",
        body: formData,
      });
      
      if (!uploadRes.ok) throw new Error("Upload failed");
      
      // Add file upload message to chat
      const fileNames = Array.from(e.target.files).map(f => f.name).join(", ");
      const uploadMessage: Message = {
        id: Date.now().toString(),
        role: "system",
        content: `Files uploaded: ${fileNames}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, uploadMessage]);
      
      // Trigger embedding of the new files
      const embedRes = await fetch(`/api/rag/embed?conversation=${conversationId}`, {
        method: "POST",
      });
      
      if (!embedRes.ok) throw new Error("Embedding failed");
      
      const embedMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: "Files processed and ready for questions.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, embedMessage]);
      
    } catch (error) {
      console.error("Error uploading files:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "system",
        content: "Error uploading or processing files.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <main className="flex flex-col h-screen p-0 ml-64 w-full">
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
          <h1 className="text-xl font-semibold">
            {conversationId === "new" ? "New Conversation" : conversationName || "Conversation"}
          </h1>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-950">
          {messages.length === 0 && conversationId === "new" && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="text-center max-w-md mx-auto">
                <h2 className="text-2xl font-semibold mb-4">What would you like to chat about today?</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8">Choose how you'd like to start this conversation</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    disabled={uploading}
                  >
                    <div className="text-3xl mb-2">📄</div>
                    <h3 className="font-medium mb-1">Upload Documents</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      Upload files to chat about their contents
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setWebSearch(true)}
                    className="flex flex-col items-center p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div className="text-3xl mb-2">🔍</div>
                    <h3 className="font-medium mb-1">Web Search</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      Enable web search for up-to-date information
                    </p>
                  </button>
                </div>
                
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Or simply type your question below to get started
                </p>
              </div>
            </div>
          )}
          
          {messages.length === 0 && conversationId !== "new" && (
            <div className="text-center text-zinc-400 my-8">
              Start a conversation or upload documents to chat about.
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === "user"
                  ? "ml-auto max-w-3xl bg-black text-white"
                  : message.role === "system"
                  ? "mx-auto max-w-3xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  : "mr-auto max-w-3xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
              } rounded-lg p-3`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="mr-auto max-w-3xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                disabled={uploading}
                title="Upload files"
              >
                {uploading ? "Uploading..." : "📎"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.md"
              />
              <button
                type="button"
                onClick={() => setWebSearch(!webSearch)}
                className={`p-2 ${webSearch ? 'text-blue-500 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                title={webSearch ? "Web search enabled" : "Enable web search"}
              >
                🔍
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-black text-white p-2 rounded hover:bg-zinc-800 disabled:opacity-50"
                disabled={isLoading || !input.trim()}
              >
                Send
              </button>
            </div>
            {webSearch && (
              <div className="flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-600 dark:text-blue-300 rounded">
                <span>Web search enabled - responses may include information from the internet</span>
                <button 
                  onClick={() => setWebSearch(false)} 
                  className="ml-auto text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ✕
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
