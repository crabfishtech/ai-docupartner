"use client";
import { Group } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

type DocumentGroup = {
  guid: string;
  name: string;
  createdAt: string;
  documentCount: number;
};

export type Conversation = {
  guid: string;
  name: string;
  groupId?: string;
};

export default function SidebarNav() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
  const [activeGuid, setActiveGuid] = useState<string | null>(null);
  const [editingGuid, setEditingGuid] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentConversationId = searchParams.get("id");

  useEffect(() => {
    fetchConversations();
    fetchDocumentGroups();
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
  
  async function fetchDocumentGroups() {
    try {
      const res = await fetch("/api/document-groups");
      if (!res.ok) throw new Error("Failed to fetch document groups");
      const data = await res.json();
      const groups = data.groups || [];
      setDocumentGroups(groups);
      
      // Initialize expanded groups state - expand all groups by default
      if (groups.length > 0) {
        const initialExpandedState: Record<string, boolean> = {};
        groups.forEach((group: DocumentGroup) => {
          initialExpandedState[group.guid] = true; // Expand all groups
        });
        setExpandedGroups(initialExpandedState);
      }
    } catch (error) {
      console.error("Error fetching document groups:", error);
    }
  }

  function handleNewConversation() {
    // Just redirect to home without creating a conversation
    window.location.href = '/';
  }
  
  function toggleGroupExpanded(groupId: string) {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
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
    <aside className="h-screen w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-4 gap-4 fixed left-0 top-0 z-20">
      <div className="flex items-center">
        <img src="/logo.png" alt="Logo" className="" />
      </div>
      <div className="flex items-center justify-between mb-0">
        <span className="font-bold text-lg">My Conversations</span>
        <button
          className="bg-black text-white rounded px-2 py-1 text-sm hover:bg-zinc-800"
          onClick={handleNewConversation}
        >
          +
        </button>
      </div>
      <nav className="flex-1 overflow-auto">
        {documentGroups.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-4">
            No document groups found
          </div>
        ) : (
          <div className="space-y-2">
            {documentGroups.map(group => {
              // Filter conversations for this group
              const groupConversations = conversations.filter(conv => conv.groupId === group.guid);
              
              return (
                <div key={group.guid}>
                  {/* Group header/accordion toggle */}
                  <button 
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors rounded"
                    onClick={() => toggleGroupExpanded(group.guid)}
                  >
                    <div className="font-medium flex items-center">
                      <Group className="h-4 w-4 mr-2 text-zinc-500" />
                      <span className="text-sm">{group.name}</span>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 px-2 py-0.5">
                        {groupConversations.length}
                      </span>
                    </div>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 text-zinc-400 transition-transform ${expandedGroups[group.guid] ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Group conversations */}
                  {expandedGroups[group.guid] && (
                    <ul className="space-y-1 pl-3 mt-1">
                      {groupConversations.length === 0 ? (
                        <li className="text-center text-zinc-500 dark:text-zinc-400 py-1 text-xs">
                          No conversations in this group
                        </li>
                      ) : (
                        groupConversations.map(conv => (
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
                                  className="flex-1 px-2 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-500"
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
                                  className={`flex-1 text-left px-2 py-2 rounded transition-colors text-sm ${
                                    conv.guid === currentConversationId
                                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                  }`}
                                >
                                  {conv.name || conv.guid}
                                </Link>
                                <button
                                  className="ml-2 text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
                                  onClick={() => startEditing(conv.guid, conv.name || conv.guid)}
                                  title="Rename"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  className="ml-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                                  onClick={() => handleDeleteConversation(conv.guid)}
                                  title="Delete"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <Link href="/" className={`px-3 py-2 rounded text-sm ${pathname === "/" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}>Conversations</Link>
        <Link href="/documents" className={`px-3 py-2 rounded text-sm ${pathname === "/documents" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}>Documents</Link>
        <Link href="/database" className={`px-3 py-2 rounded text-sm ${pathname === "/database" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}>Database</Link>
        <Link href="/settings" className={`px-3 py-2 rounded text-sm ${pathname === "/settings" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}>Settings</Link>
      </div>
    </aside>
  );
}
