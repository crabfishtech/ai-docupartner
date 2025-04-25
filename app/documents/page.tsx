"use client";
import { useEffect, useState } from "react";
import DocumentGroupSelector from "../../components/DocumentGroupSelector";

// Define the file info type to match the API response
type FileInfo = {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  groupId?: string;
  conversationId?: string;
  type: string;
};

// Define a type for document groups
type DocumentGroup = {
  guid: string;
  name: string;
  createdAt: string;
  documentCount: number;
};

export default function DocumentsPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAllGroups, setShowAllGroups] = useState(false);

  useEffect(() => {
    // Fetch document groups
    const fetchGroups = async () => {
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
    };
    
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
      await fetchFiles(selectedGroupId);
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
    
    const res = await fetch(`/api/upload?groupId=${selectedGroupId}`, {
      method: "POST",
      body: formData,
    });
    
    setUploading(false);
    if (!res.ok) {
      alert("Upload failed");
    } else {
      alert("Files uploaded!");
      await fetchFiles(selectedGroupId);
    }
    input.value = "";
  }

  // Helper function to toggle accordion state
  const toggleAccordion = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Helper function to group files by document group
  const getFilesByGroup = () => {
    const filesByGroup: Record<string, FileInfo[]> = {};
    const ungroupedFiles: FileInfo[] = [];
    
    // Initialize with empty arrays for all groups
    groups.forEach(group => {
      filesByGroup[group.guid] = [];
    });
    
    // Add files to their respective groups
    files.forEach(file => {
      if (file.groupId && filesByGroup[file.groupId]) {
        filesByGroup[file.groupId].push(file);
      } else {
        ungroupedFiles.push(file);
      }
    });
    
    return { filesByGroup, ungroupedFiles };
  };

  // Render a file item
  const renderFileItem = (file: FileInfo) => (
    <li key={file.path} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium">
          {file.type === 'pdf' ? 'PDF' : 
           file.type === 'word' ? 'DOC' : 
           file.type === 'text' ? 'TXT' : 
           file.type === 'image' ? 'IMG' : 'DOC'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {file.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {(file.size / 1024).toFixed(1)} KB • {new Date(file.lastModified).toLocaleDateString()}
          </p>
        </div>
      </div>
      <button
        className="text-red-600 hover:underline ml-4 text-sm disabled:opacity-50"
        onClick={() => handleDelete(file)}
        disabled={deleting === file.path}
      >
        {deleting === file.path ? "Deleting..." : "Delete"}
      </button>
    </li>
  );

  return (
    <main className="flex flex-col items-start justify-start min-h-screen p-8 ml-64 w-full">
      <div className="w-full flex flex-col gap-8">
        <section className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow p-8 flex flex-col">
          <h1 className="text-2xl font-semibold mb-6">Upload Documents</h1>
          <form className="flex flex-col w-full gap-4" onSubmit={handleUpload}>
            <DocumentGroupSelector 
              onSelect={setSelectedGroupId} 
              selectedGroupId={selectedGroupId} 
              className="mb-4"
            />
            <input
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              multiple
              className="w-full file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
            />
            <button
              type="submit"
              className="bg-black text-white py-2 px-6 rounded hover:bg-zinc-800 transition w-full"
              disabled={uploading || !selectedGroupId}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
            {!selectedGroupId && (
              <p className="text-amber-600 text-sm mt-1">Please select a document group first</p>
            )}
          </form>
        </section>

        <section className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Uploaded Documents</h2>
            <div className="flex items-center">
              <button 
                onClick={() => setShowAllGroups(!showAllGroups)}
                className={`px-3 py-1 text-sm rounded-md transition ${showAllGroups ? 'bg-black text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                {showAllGroups ? 'Filter by Group' : 'Show All Documents'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-zinc-400 py-4 text-center">No files uploaded.</div>
          ) : (
            <div className="w-full space-y-4">
              {showAllGroups ? (
                // Group files by document group
                <div className="space-y-4">
                  {(() => {
                    const { filesByGroup, ungroupedFiles } = getFilesByGroup();
                    
                    return (
                      <>
                        {groups.map(group => {
                          const groupFiles = filesByGroup[group.guid] || [];
                          if (groupFiles.length === 0) return null;
                          
                          return (
                            <div key={group.guid} className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleAccordion(group.guid)}
                                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                              >
                                <div className="flex items-center">
                                  <span className="font-medium">{group.name}</span>
                                  <span className="ml-2 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                                    {groupFiles.length} file{groupFiles.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <svg
                                  className={`w-5 h-5 transition-transform ${expandedGroups[group.guid] ? 'transform rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              
                              {expandedGroups[group.guid] && (
                                <div className="p-4 bg-white dark:bg-zinc-900">
                                  <div className="mb-2">
                                    <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Documents</h4>
                                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                      {groupFiles.filter(file => ['pdf', 'word', 'text', 'document'].includes(file.type)).length > 0 ? (
                                        groupFiles
                                          .filter(file => ['pdf', 'word', 'text', 'document'].includes(file.type))
                                          .map(renderFileItem)
                                      ) : (
                                        <li className="p-3 text-zinc-500 dark:text-zinc-400 text-sm">No documents in this group</li>
                                      )}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Images</h4>
                                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                      {groupFiles.filter(file => file.type === 'image').length > 0 ? (
                                        groupFiles
                                          .filter(file => file.type === 'image')
                                          .map(renderFileItem)
                                      ) : (
                                        <li className="p-3 text-zinc-500 dark:text-zinc-400 text-sm">No images in this group</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {ungroupedFiles.length > 0 && (
                          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleAccordion('ungrouped')}
                              className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                            >
                              <div className="flex items-center">
                                <span className="font-medium">Ungrouped Files</span>
                                <span className="ml-2 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                                  {ungroupedFiles.length} file{ungroupedFiles.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <svg
                                className={`w-5 h-5 transition-transform ${expandedGroups['ungrouped'] ? 'transform rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {expandedGroups['ungrouped'] && (
                              <div className="p-4 bg-white dark:bg-zinc-900">
                                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                  {ungroupedFiles.map(renderFileItem)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                // Show files for the selected group only
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Documents</h3>
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                      {files.filter(file => ['pdf', 'word', 'text', 'document'].includes(file.type)).length > 0 ? (
                        files
                          .filter(file => ['pdf', 'word', 'text', 'document'].includes(file.type))
                          .map(renderFileItem)
                      ) : (
                        <li className="p-3 text-zinc-500 dark:text-zinc-400 text-sm">No documents uploaded</li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Images</h3>
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                      {files.filter(file => file.type === 'image').length > 0 ? (
                        files
                          .filter(file => file.type === 'image')
                          .map(renderFileItem)
                      ) : (
                        <li className="p-3 text-zinc-500 dark:text-zinc-400 text-sm">No images uploaded</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
