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
