"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export type Conversation = {
  guid: string;
  name: string;
};

export default function SidebarNav() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeGuid, setActiveGuid] = useState<string | null>(null);
  const [editingGuid, setEditingGuid] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentConversationId = searchParams.get("id");

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchConversations() {
    const res = await fetch("/api/conversation");
    const data = await res.json();
    setConversations(data.conversations);
    if (!activeGuid && data.conversations.length > 0) {
      setActiveGuid(data.conversations[0].guid);
    }
  }

  function handleNewConversation() {
    // Just redirect to home without creating a conversation
    window.location.href = '/';
  }

  function handleSelectConversation(guid: string) {
    setActiveGuid(guid);
  }

  async function handleDeleteConversation(guid: string) {
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    await fetch(`/api/conversation?guid=${guid}`, { method: "DELETE" });
    await fetchConversations();
    if (activeGuid === guid) {
      setActiveGuid(null);
    }
  }
  
  function startEditing(guid: string, currentName: string) {
    setEditingGuid(guid);
    setNewName(currentName);
  }
  
  async function handleRename(guid: string, e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    
    try {
      // Use the existing API structure
      const res = await fetch(`/api/conversation?guid=${guid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() })
      });
      
      if (!res.ok) throw new Error("Failed to rename conversation");
      await fetchConversations();
    } catch (error) {
      console.error("Error renaming conversation:", error);
    } finally {
      setEditingGuid(null);
      setNewName("");
    }
  }

  return (
    <aside className="h-screen w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-4 gap-4 fixed left-0 top-0 z-20">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-lg">My Conversations</span>
        <button
          className="bg-black text-white rounded px-2 py-1 text-sm hover:bg-zinc-800"
          onClick={handleNewConversation}
        >
          +
        </button>
      </div>
      <nav className="flex-1 overflow-auto">
        <ul className="space-y-1">
          {conversations.map(conv => (
            <li key={conv.guid} className="flex items-center group">
              {editingGuid === conv.guid ? (
                <form 
                  className="flex-1 flex items-center" 
                  onSubmit={(e) => handleRename(conv.guid, e)}
                >
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-500"
                    autoFocus
                    onBlur={() => setEditingGuid(null)}
                  />
                  <button
                    type="submit"
                    className="ml-2 text-green-500 hover:text-green-600"
                    title="Save"
                  >
                    ✓
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    href={`/?id=${conv.guid}`}
                    className={`flex-1 text-left px-3 py-2 rounded transition-colors ${
                      conv.guid === currentConversationId
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {conv.name || conv.guid}
                  </Link>
                  <button
                    className="ml-1 text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEditing(conv.guid, conv.name || conv.guid)}
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    className="ml-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteConversation(conv.guid)}
                    title="Delete"
                  >
                    ×
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <Link href="/" className={`px-3 py-2 rounded ${pathname === "/" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}>Conversations</Link>
        <Link href="/documents" className={`px-3 py-2 rounded ${pathname === "/documents" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}>Documents</Link>
        <Link href="/settings" className={`px-3 py-2 rounded ${pathname === "/settings" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}>Settings</Link>
      </div>
    </aside>
  );
}
