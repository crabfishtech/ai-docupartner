"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DocumentGroupSelector from "../components/DocumentGroupSelector";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  sourceType?: "document" | "web";
  sourceUrl?: string;
  usedRag?: boolean; // Whether RAG was used for this message
};

type DocumentGroup = {
  guid: string;
  name: string;
  createdAt: string;
  documentCount: number;
};

export default function Home() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("id") || "new";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [conversationName, setConversationName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
  const [currentGroupName, setCurrentGroupName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch document groups data
  async function fetchDocumentGroups() {
    try {
      const res = await fetch("/api/document-groups");
      if (!res.ok) throw new Error("Failed to fetch document groups");
      const data = await res.json();
      setDocumentGroups(data.groups || []);
    } catch (error) {
      console.error("Error fetching document groups:", error);
    }
  }

  useEffect(() => {
    // Reset messages when conversation changes
    setMessages([]);

    // Fetch document groups
    fetchDocumentGroups();

    // Load conversation details if conversationId exists
    if (conversationId && conversationId !== "new") {
      fetchConversation();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function fetchConversation() {
    try {
      const res = await fetch(`/api/conversation/${conversationId}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      const data = await res.json();
      setConversationName(data.conversation.name);
      
      // Set the selected group ID
      if (data.conversation.groupId) {
        setSelectedGroupId(data.conversation.groupId);
        
        // Find the group name from the document groups
        const group = documentGroups.find(g => g.guid === data.conversation.groupId);
        if (group) {
          setCurrentGroupName(group.name);
        } else {
          // If we don't have the groups loaded yet, fetch the specific group
          try {
            const groupRes = await fetch(`/api/document-groups/${data.conversation.groupId}`);
            if (groupRes.ok) {
              const groupData = await groupRes.json();
              if (groupData.group) {
                setCurrentGroupName(groupData.group.name);
              }
            }
          } catch (groupError) {
            console.error("Error fetching group details:", groupError);
          }
        }
      }

      // Fetch messages for this conversation
      const messagesRes = await fetch(`/api/messages?conversation=${conversationId}`);
      if (!messagesRes.ok) throw new Error("Failed to fetch messages");
      const messagesData = await messagesRes.json();
      setMessages(messagesData.messages);
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
      // Create a new conversation if we're on the new conversation page
      let currentConversationId = conversationId;
      
      if (conversationId === "new") {
        if (!selectedGroupId) {
          alert("Please select or create a document group first");
          setIsLoading(false);
          return;
        }
        
        try {
          // Create a new conversation with the selected group
          const createRes = await fetch("/api/conversation", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: selectedGroupId })
          });
          
          if (!createRes.ok) throw new Error("Failed to create conversation");
          const data = await createRes.json();
          currentConversationId = data.guid;
          
          // Update URL without refreshing the page
          window.history.pushState({}, "", `/?id=${currentConversationId}`);
        } catch (error) {
          console.error("Error creating conversation:", error);
        }
      }
      
      // Determine if we should use web search
      const endpoint = webSearch 
        ? `/api/web-search` 
        : `/api/rag/ask?conversation=${currentConversationId}`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: input,
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
        usedRag: data.usedRag // Add the RAG usage information
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request 1.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    
    // For new conversations, require a group to be selected
    if (conversationId === "new" && !selectedGroupId) {
      alert("Please select or create a document group first");
      return;
    }
    
    // For existing conversations, use the conversation's group
    // (In a real app, you'd fetch the conversation's group)
    const groupId = selectedGroupId;
    
    setUploading(true);
    const formData = new FormData();
    Array.from(e.target.files).forEach(f => formData.append("file", f));
    
    try {
      // Upload to the specific conversation folder with the group ID
      const uploadRes = await fetch(`/api/upload?conversation=${conversationId}&groupId=${groupId}`, {
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
    <main className="flex flex-col h-screen p-0 ml-72 w-full">
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
          <h1 className="text-xl font-semibold">
            {conversationId === "new" ? "New Conversation" : conversationName || "Conversation"}
          </h1>
          {currentGroupName && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Document Group: {currentGroupName}
            </div>
          )}
          {conversationId === "new" && selectedGroupId && documentGroups.length > 0 && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Document Group: {documentGroups.find(g => g.guid === selectedGroupId)?.name || "Unknown group"}
            </div>
          )}
        </div>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-950">
          {messages.length === 0 && conversationId === "new" && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="text-center max-w-md mx-auto">
                <h2 className="text-2xl font-semibold mb-4">What would you like to chat about today?</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">First, select or create a document group</p>
                
                <DocumentGroupSelector 
                  onSelect={setSelectedGroupId} 
                  selectedGroupId={selectedGroupId} 
                  className="mb-8"
                />
                
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Then simply type your question below to get started
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
              <div className="flex justify-between text-xs opacity-70 mt-1">
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                {message.role === "assistant" && message.usedRag !== undefined && (
                  <span title={message.usedRag ? "RAG was used" : "Direct answer (no RAG)"} className="flex items-center">
                    {message.usedRag ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </span>
                )}
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
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded"
                  title="Options"
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-zinc-800 rounded-md shadow-lg z-10 border border-zinc-200 dark:border-zinc-700">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        disabled={uploading}
                      >
                        {uploading ? "Uploading..." : "Upload files"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWebSearch(!webSearch);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-between"
                      >
                        <span>{webSearch ? "Disable web search" : "Enable web search"}</span>
                        {webSearch && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
                            ✓
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.md"
              />
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
