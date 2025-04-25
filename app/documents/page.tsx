"use client";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileInfo, DocumentGroup } from "./types";
import React from "react";

// Import our tab components
import { DocumentsTab } from "./components/DocumentsTab";
import { GroupsTab } from "./components/GroupsTab";

export default function DocumentsPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [activeTab, setActiveTab] = useState("documents");

  useEffect(() => {
    // Fetch document groups
    fetchGroups();
  }, []);

  useEffect(() => {
    if (showAllGroups) {
      fetchAllFiles();
    } else if (selectedGroupId) {
      fetchFiles(selectedGroupId);
    } else {
      setFiles([]);
      setLoading(false);
    }
  }, [selectedGroupId, showAllGroups]);

  // Fetch document groups
  async function fetchGroups() {
    try {
      const res = await fetch('/api/document-groups');
      if (res.ok) {
        const data = await res.json();
        const fetchedGroups = data.groups || [];
        setGroups(fetchedGroups);
        
        // Initialize expanded state for each group
        const initialExpandedState: Record<string, boolean> = {};
        fetchedGroups.forEach((group: DocumentGroup) => {
          initialExpandedState[group.guid] = false;
        });
        setExpandedGroups(initialExpandedState);
      }
    } catch (error) {
      console.error('Error fetching document groups:', error);
    }
  }

  async function fetchAllFiles() {
    setLoading(true);
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching all files:', error);
      alert('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchFiles(groupId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?groupId=${groupId}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      alert('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(file: FileInfo) {
    if (!window.confirm(`Delete ${file.name}?`)) return;
    setDeleting(file.path);
    
    try {
      // Delete the file
      await fetch(`/api/files?file=${encodeURIComponent(file.path)}${file.groupId ? `&groupId=${file.groupId}` : ''}`, { 
        method: "DELETE" 
      });
      
      // Refresh the file list
      if (showAllGroups) {
        await fetchAllFiles();
      } else {
        await fetchFiles(selectedGroupId);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    if (!input?.files?.length) return;
    if (!selectedGroupId) {
      alert("Please select or create a document group first");
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    Array.from(input.files).forEach(f => formData.append("file", f));
    
    try {
      const res = await fetch(`/api/upload?groupId=${selectedGroupId}`, {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      // Refresh files after upload
      await fetchFiles(selectedGroupId);
      
      // Reset file input
      e.currentTarget.reset();
    } catch (error) {
      console.error("Error uploading files:", error);
      alert(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }

  // Helper function to toggle accordion state
  function toggleAccordion(groupId: string) {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }

  // Helper function to group files by document group
  function getFilesByGroup() {
    const result: { groupId: string; groupName: string; files: FileInfo[] }[] = [];
    
    groups.forEach(group => {
      const groupFiles = files.filter(file => file.groupId === group.guid);
      if (groupFiles.length > 0) {
        result.push({
          groupId: group.guid,
          groupName: group.name,
          files: groupFiles
        });
      }
    });
    
    return result;
  }

  // Define a simple renderFileItem function to pass to DocumentsTab
  function renderFileItem(file: FileInfo) {
    const fileSize = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    
    // Get file icon based on type
    const fileIcon = file.type === 'image' ? '🖼️' : '📄';
    
    return (
      <li key={file.path} className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2 text-lg">{fileIcon}</span>
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-zinc-500">{fileSize} • {new Date(file.lastModified).toLocaleDateString()}</p>
          </div>
        </div>
        <button
          onClick={() => handleDelete(file)}
          disabled={deleting === file.path}
          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition"
          title="Delete file"
        >
          {deleting === file.path ? "⏳" : "🗑️"}
        </button>
      </li>
    );
  }

  return (
    <main className="container mx-auto py-6 px-4 ml-72 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
      </div>

      <Tabs defaultValue="documents" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents">
          <DocumentsTab 
            files={files}
            groups={groups}
            loading={loading}
            deleting={deleting}
            uploading={uploading}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            expandedGroups={expandedGroups}
            showAllGroups={showAllGroups}
            setShowAllGroups={setShowAllGroups}
            fetchFiles={fetchFiles}
            fetchAllFiles={fetchAllFiles}
            handleDelete={handleDelete}
            handleUpload={handleUpload}
            toggleAccordion={toggleAccordion}
            getFilesByGroup={getFilesByGroup}
            renderFileItem={renderFileItem}
          />
        </TabsContent>
        
        <TabsContent value="groups">
          <GroupsTab 
            groups={groups}
            fetchGroups={fetchGroups}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
