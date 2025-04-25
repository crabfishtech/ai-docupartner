"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [provider, setProvider] = useState<string>("openai");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedProvider = localStorage.getItem("llm_provider");
    const storedKey = localStorage.getItem("llm_api_key");
    const storedPrompt = localStorage.getItem("system_prompt");
    if (storedProvider) setProvider(storedProvider);
    if (storedKey) setApiKey(storedKey);
    if (storedPrompt) setSystemPrompt(storedPrompt);
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("llm_provider", provider);
    localStorage.setItem("llm_api_key", apiKey);
    localStorage.setItem("system_prompt", systemPrompt);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <main className="flex flex-col items-start p-8 ml-64 w-full">
      <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-lg shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <label className="block mb-2 text-sm font-medium">Provider</label>
        <select
          className="w-full p-2 border rounded mb-4 bg-zinc-100 dark:bg-zinc-800"
          value={provider}
          onChange={e => setProvider(e.target.value)}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
        <label className="block mb-2 text-sm font-medium">API Key</label>
        <input
          type="password"
          className="w-full p-2 border rounded mb-4 bg-zinc-100 dark:bg-zinc-800"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={provider === "openai" ? "sk-..." : "sk-ant-..."}
        />
        <label className="block mb-2 text-sm font-medium">System Prompt</label>
        <textarea
          className="w-full p-2 border rounded mb-4 bg-zinc-100 dark:bg-zinc-800"
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          rows={4}
          placeholder="You are a helpful assistant."
        />
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded hover:bg-zinc-800 transition"
        >
          Save
        </button>
        {saved && <p className="text-green-600 mt-2">Saved!</p>}
      </form>
    </main>
  );
}
