"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type DocumentGroup = {
  guid: string;
  name: string;
  createdAt: string;
  documentCount: number;
};

type DocumentGroupSelectorProps = {
  onSelect: (groupId: string) => void;
  selectedGroupId?: string;
  showCreateOption?: boolean;
  className?: string;
};

export default function DocumentGroupSelector({
  onSelect,
  selectedGroupId,
  showCreateOption = true,
  className = ""
}: DocumentGroupSelectorProps) {
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    setLoading(true);
    try {
      console.log('Fetching document groups...');
      const res = await fetch("/api/document-groups", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch document groups: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Fetched groups:', data);
      
      // Ensure groups is an array
      const fetchedGroups = Array.isArray(data.groups) ? data.groups : [];
      setGroups(fetchedGroups);
      
      // If we have a selectedGroupId, make sure it exists in the groups
      if (selectedGroupId && !fetchedGroups.some((g: DocumentGroup) => g.guid === selectedGroupId)) {
        // If not, select the first group if available
        if (fetchedGroups.length > 0) {
          onSelect(fetchedGroups[0].guid);
        } else {
          onSelect("");
        }
      } else if (!selectedGroupId && fetchedGroups.length > 0 && showCreateOption) {
        // If no group is selected and groups exist, select the first one (only if showCreateOption is true)
        onSelect(fetchedGroups[0].guid);
      }
    } catch (error) {
      console.error("Error fetching document groups:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    setCreating(true);
    try {
      console.log('Creating document group:', newGroupName.trim());
      
      // Make sure we're using POST and not GET
      const response = await fetch('/api/document-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newGroupName.trim() }),
        cache: 'no-store'
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      console.log('Document group created successfully:', data);
      
      // Select the newly created group
      if (data && data.guid) {
        onSelect(data.guid);
      } else {
        console.error('Invalid response data:', data);
        throw new Error('Invalid response from server');
      }
      
      // Reset the form
      setNewGroupName('');
      setShowCreateForm(false);
      
      // Refresh the groups list
      await fetchGroups();
    } catch (error) {
      console.error('Error creating document group:', error);
      alert(`Failed to create document group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={`${className}`}>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        Document Group
      </label>
      
      {loading ? (
        <div className="animate-pulse h-10 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
      ) : (
        <>
          {!showCreateForm ? (
            <div className="flex gap-2">
              <select
                value={selectedGroupId || ""}
                onChange={(e) => onSelect(e.target.value)}
                className="block w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                {groups.length === 0 && (
                  <option value="" disabled>
                    No document groups available
                  </option>
                )}
                {groups.map((group) => (
                  <option key={group.guid} value={group.guid}>
                    {group.name} ({group.documentCount} document{group.documentCount !== 1 ? "s" : ""})
                  </option>
                ))}
              </select>
              
              {showCreateOption && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"
                >
                  +
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="New group name"
                  className="block flex-1 p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGroupName.trim() && !creating) {
                      e.preventDefault();
                      handleCreateGroup(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={creating || !newGroupName.trim()}
                  onClick={(e) => handleCreateGroup(e as React.FormEvent)}
                  className="px-3 py-2 bg-black text-white rounded hover:bg-zinc-800 disabled:opacity-50 transition"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
