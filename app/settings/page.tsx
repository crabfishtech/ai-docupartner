"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [provider, setProvider] = useState<string>("openai");
  const [model, setModel] = useState<string>("gpt-5");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saved, setSaved] = useState(false);
  
  // Define model categories and models for each provider
  const modelCategories = {
    openai: [
      {
        category: "GPT-4 Models",
        models: [
          { id: "gpt-4o", name: "GPT-4o" },
          { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
          { id: "gpt-4", name: "GPT-4" }
        ]
      },
      {
        category: "Cost Optimized Models",
        models: [
          { id: "gpt-4o-mini", name: "GPT-4o Mini" },
          { id: "gpt-4-turbo-preview", name: "GPT-4 Turbo Preview" }
        ]
      }
    ],
    anthropic: [
      {
        category: "Claude Models",
        models: [
          { id: "claude-3.7-sonnet-thinking", name: "Claude 3.7 Sonnet (Thinking)" },
          { id: "claude-3.7-sonnet", name: "Claude 3.7 Sonnet" },
          { id: "claude-3.5-haiku", name: "Claude 3.5 Haiku" }
        ]
      }
    ]
  };
  
  // Flatten models for easier access
  const models = {
    openai: modelCategories.openai.flatMap(category => category.models),
    anthropic: modelCategories.anthropic.flatMap(category => category.models)
  };

  const [loading, setLoading] = useState(true);

  // Load settings from the API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to fetch settings');
        
        const settings = await res.json();
        
        // Set state from loaded settings
        if (settings.llm_provider) setProvider(settings.llm_provider);
        if (settings.llm_model) setModel(settings.llm_model);
        if (settings.llm_api_key) setApiKey(settings.llm_api_key);
        if (settings.system_prompt) setSystemPrompt(settings.system_prompt);
        
        // If no model is set but provider is, set default model
        if (!settings.llm_model && settings.llm_provider) {
          const providerModels = models[settings.llm_provider as keyof typeof models];
          if (providerModels && providerModels.length > 0) {
            setModel(providerModels[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        // Keep default values if settings can't be loaded
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // Update model when provider changes
  useEffect(() => {
    // Set default model for the selected provider
    const providerModels = models[provider as keyof typeof models];
    if (providerModels && providerModels.length > 0) {
      setModel(providerModels[0].id);
    }
  }, [provider]);

  const [saving, setSaving] = useState(false);
  
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Save settings to the API
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          llm_provider: provider,
          llm_model: model,
          llm_api_key: apiKey,
          system_prompt: systemPrompt
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      
      // Also save to localStorage as a backup
      localStorage.setItem("llm_provider", provider);
      localStorage.setItem("llm_model", model);
      localStorage.setItem("llm_api_key", apiKey);
      localStorage.setItem("system_prompt", systemPrompt);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-col items-start justify-start min-h-screen p-8 ml-64 w-full">
      <div className="w-full flex flex-col gap-8"></div>
      <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-lg shadow w-full flex flex-col p-8">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">Provider</label>
          <select
            className="w-full p-2 border rounded bg-zinc-100 dark:bg-zinc-800"
            value={provider}
            onChange={e => setProvider(e.target.value)}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">Model</label>
          <select
            className="w-full p-2 border rounded bg-zinc-100 dark:bg-zinc-800"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {modelCategories[provider as keyof typeof modelCategories].map(category => (
              <optgroup key={category.category} label={category.category}>
                {category.models.map(modelOption => (
                  <option key={modelOption.id} value={modelOption.id}>
                    {modelOption.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-zinc-500 mt-1">
            {provider === "openai" ? 
              "GPT-4o offers the most advanced capabilities for document understanding." : 
              "Claude 3.7 Sonnet (Thinking) provides enhanced reasoning for complex documents."}
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              className="w-full p-2 border rounded bg-zinc-100 dark:bg-zinc-800 pr-10"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key`}
            />
            <button 
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Your API key is stored securely and never shared with third parties.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">System Prompt</label>
          <textarea
            className="w-full p-2 border rounded bg-zinc-100 dark:bg-zinc-800"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            rows={12}
            placeholder="You are a helpful assistant."
          />
          <p className="text-xs text-zinc-500 mt-1">
            The system prompt sets the behavior and context for the AI model.
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
        >
          {saving ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            "Save Settings"
          )}
        </button>
        {saved && <p className="text-green-600 mt-2 text-center">Settings saved successfully!</p>}
      </form>
    </main>
  );
}
