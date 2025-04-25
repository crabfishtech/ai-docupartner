"use client";

import { useState, useEffect } from "react";

export default function DatabasePage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalDocuments: number;
    totalChunks: number;
    lastCompiled: string;
    vectorStoreType: string;
  }>({
    totalDocuments: 0,
    totalChunks: 0,
    lastCompiled: "Never",
    vectorStoreType: "Unknown"
  });

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  async function fetchDatabaseStats() {
    try {
      setLoading(true);
      const res = await fetch("/api/rag/stats");
      if (!res.ok) throw new Error("Failed to fetch database stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching database stats:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompileDatabase() {
    if (!confirm("Are you sure you want to recompile the entire database? This may take some time.")) {
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch("/api/rag/compile", {
        method: "POST"
      });
      
      if (!res.ok) throw new Error("Failed to compile database");
      
      await fetchDatabaseStats(); // Refresh stats after compilation
      alert("Database compiled successfully!");
    } catch (error) {
      console.error("Error compiling database:", error);
      alert("Error compiling database. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTruncateDatabase() {
    if (!confirm("WARNING: This will delete all vector embeddings. Are you sure you want to continue?")) {
      return;
    }
    
    if (!confirm("This action cannot be undone. Documents will remain but all embeddings will be removed. Confirm?")) {
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch("/api/rag/truncate", {
        method: "POST"
      });
      
      if (!res.ok) throw new Error("Failed to truncate database");
      
      await fetchDatabaseStats(); // Refresh stats after truncation
      alert("Database truncated successfully!");
    } catch (error) {
      console.error("Error truncating database:", error);
      alert("Error truncating database. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-start justify-start min-h-screen p-8 ml-72 w-full">
      <div className="w-full flex flex-col gap-8">
        <section className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow p-8 flex flex-col">
          <h1 className="text-2xl font-semibold mb-6">Vector Database</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Database Stats</h3>
              {loading ? (
                <p className="text-zinc-500 dark:text-zinc-400">Loading stats...</p>
              ) : (
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">Vector Store Type:</dt>
                    <dd className="font-medium">{stats.vectorStoreType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">Total Documents:</dt>
                    <dd className="font-medium">{stats.totalDocuments}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">Total Chunks:</dt>
                    <dd className="font-medium">{stats.totalChunks}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">Last Compiled:</dt>
                    <dd className="font-medium">{stats.lastCompiled}</dd>
                  </div>
                </dl>
              )}
            </div>
            
            <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Database Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleCompileDatabase}
                  disabled={loading}
                  className="w-full bg-black text-white py-2 px-4 rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Compile Database"}
                </button>
                <button
                  onClick={handleTruncateDatabase}
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Truncate Database"}
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                Compiling will regenerate all embeddings. Truncating will remove all embeddings but keep documents.
              </p>
            </div>
          </div>
          
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-2">Supported File Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-zinc-200 dark:border-zinc-700 rounded p-3">
                <h4 className="font-medium mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Text Documents
                </h4>
                <ul className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.txt</span>
                    <span>Plain Text</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.md</span>
                    <span>Markdown</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.pdf</span>
                    <span>PDF Documents</span>
                  </li>
                </ul>
              </div>
              
              <div className="border border-zinc-200 dark:border-zinc-700 rounded p-3">
                <h4 className="font-medium mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Office Documents
                </h4>
                <ul className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.docx</span>
                    <span>Word Documents</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.xlsx</span>
                    <span>Excel Spreadsheets</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.csv</span>
                    <span>CSV Data</span>
                  </li>
                </ul>
              </div>
              
              <div className="border border-zinc-200 dark:border-zinc-700 rounded p-3">
                <h4 className="font-medium mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Images & Media
                </h4>
                <ul className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.png</span>
                    <span>PNG Images</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.jpg</span>
                    <span>JPEG Images</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-12 text-xs text-zinc-500">.webp</span>
                    <span>WebP Images</span>
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
              Image files are processed by extracting metadata and dimensions. For best results with images, include descriptive filenames.  
            </p>
          </div>
          
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">About Vector Database</h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-3">
              The vector database stores embeddings of your documents to enable semantic search and retrieval.
              Embeddings are high-dimensional vector representations of text that capture meaning and context.
            </p>
            <p className="text-zinc-600 dark:text-zinc-300">
              When you ask a question, the system finds the most relevant document chunks by comparing the
              question's embedding with the stored document embeddings, then uses these chunks to generate an answer.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
