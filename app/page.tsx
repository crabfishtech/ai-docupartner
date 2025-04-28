"use client";
import { useEffect, useState, useRef } from "react";
import DebugDrawer from "../components/DebugDrawer";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import DocumentGroupSelector from "../components/DocumentGroupSelector";
import "./styles/markdown.css";
import "./styles/highlight.css";
import "highlight.js/styles/atom-one-dark.css";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  sourceType?: "document" | "web";
  sourceUrl?: string;
  usedRag?: boolean; // Whether RAG was used for this message
};

type DebugMessage = {
  id: string;
  type: 'request' | 'response';
  content: any;
  timestamp: number;
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
  const [debugMode, setDebugMode] = useState(false);
  const [debugMessages, setDebugMessages] = useState<DebugMessage[]>([]);
  const [loadingDebugMessages, setLoadingDebugMessages] = useState(false);
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
  
  // Fetch debug messages when debug mode is toggled on
  useEffect(() => {
    if (debugMode && conversationId !== "new") {
      fetchDebugMessages();
    }
  }, [debugMode, conversationId]);
  
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

  // Fetch debug messages from the server
  async function fetchDebugMessages() {
    if (conversationId === "new") return;
    
    try {
      setLoadingDebugMessages(true);
      const res = await fetch(`/api/debug/${conversationId}`);
      if (!res.ok) throw new Error("Failed to fetch debug messages");
      
      const data = await res.json();
      if (data.debugMessages) {
        // Convert the format to match our DebugMessage type
        const formattedMessages = data.debugMessages.map((msg: any) => ({
          id: msg.id,
          type: msg.type as 'request' | 'response',
          content: msg.content,
          timestamp: msg.timestamp
        }));
        
        setDebugMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error fetching debug messages:", error);
    } finally {
      setLoadingDebugMessages(false);
    }
  }
  
  async function fetchConversation() {
    try {
      // Fetch conversation details
      const res = await fetch(`/api/conversation/${conversationId}`);
      if (!res.ok) {
        console.error(`Error response from API: ${res.status} ${res.statusText}`);
        throw new Error("Failed to fetch conversation");
      }
      
      const data = await res.json();
      if (!data.conversation) {
        console.error("Invalid response format:", data);
        throw new Error("Invalid response format");
      }
      
      // Set conversation name
      setConversationName(data.conversation.name || "Conversation");
      
      // Set the selected group ID if it exists
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
      try {
        const messagesRes = await fetch(`/api/messages?conversation=${conversationId}`);
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(messagesData.messages || []);
        }
      } catch (messageError) {
        console.error("Error fetching messages:", messageError);
        // Continue even if messages can't be fetched
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      // Set a default state to avoid UI errors
      setConversationName("Conversation");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    // Add user message to the UI
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Create a new conversation if needed
      if (conversationId === "new") {
        const res = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: selectedGroupId || undefined }),
        });

        if (!res.ok) {
          throw new Error("Failed to create conversation");
        }

        const newConversation = await res.json();
        // Redirect to the new conversation
        window.location.href = `/?id=${newConversation.guid}`;
        return;
      }



      // Prepare API request
      const payload = {
        message: userMessage.content,
        webSearch,
      };

      if (selectedGroupId) {
        Object.assign(payload, { groupId: selectedGroupId });
      }

      // Clear debug messages when starting a new request in debug mode
      if (debugMode) {
        // We'll fetch the debug messages from the server after the response
        setDebugMessages([]);
      }

      // Send request to the AI
      const response = await fetch(`/api/rag/ask?conversation=${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      // Fetch debug messages if debug mode is enabled
      if (debugMode) {
        fetchDebugMessages();
      }

      // Add AI response to the UI
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: Date.now(),
        usedRag: data.usedRag,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
      };

      setMessages((prev) => [...prev, aiMessage]);


    } catch (error) {
      console.error("Error:", error);
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: "Sorry, there was an error processing your request.",
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
    <main className="flex h-screen w-[calc(100%-18rem)] ml-72">
      {/* Main content */}
      <div className={`flex flex-col ${debugMode ? 'w-2/3' : 'w-full'}`}>
        {/* Chat header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
          <h1 className="text-xl font-semibold">
            {conversationId === "new" ? "New Conversation" : conversationName || "Conversation"}
          </h1>
          {/* Only show document group for existing conversations */}
          {conversationId !== "new" && currentGroupName && (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Document Group: {currentGroupName}
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
              No conversation data was found.
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === "user"
                  ? "ml-auto bg-black text-white text-sm"
                  : message.role === "system"
                  ? "mx-auto bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm"
                  : "mr-auto bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm"
              } rounded-lg p-3`}
            >
              {message.role === "assistant" ? (
                <div className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[
                      rehypeSanitize, 
                      [rehypeHighlight, { detect: true, ignoreMissing: true }]
                    ]}
                    components={{
                      code: ({node, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        return !isInline && match ? (
                          <pre className={`language-${match[1]}`}>
                            <code className={`hljs language-${match[1]}`} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
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
                          setDebugMode(!debugMode);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-between"
                      >
                        <span>{debugMode ? "Disable debug mode" : "Enable debug mode"}</span>
                        {debugMode && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-white text-xs">
                            ✓
                          </span>
                        )}
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
                <span>Web search enabled - responses may include information from the internet.</span>
              </div>
            )}
            {debugMode && (
              <div className="flex items-center px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-xs text-purple-600 dark:text-purple-300 rounded">
                <span>Debug mode enabled - you can see communications with the LLM to the right.</span>
              </div>
            )}
          </form>
        </div>
      </div>
      
      {/* Debug Drawer - mounted alongside the chat */}
      {debugMode && (
        <div className="w-1/3 h-full border-l border-zinc-200 dark:border-zinc-800">
          <DebugDrawer 
            messages={debugMessages} 
            onClose={() => setDebugMode(false)}
            isLoading={loadingDebugMessages}
          />
        </div>
      )}
    </main>
  );
}
