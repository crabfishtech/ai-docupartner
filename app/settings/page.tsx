"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProvidersTab } from "./components/ProvidersTab";
import { PromptsTab } from "./components/PromptsTab";
import { ServicesTab } from "./components/ServicesTab";

type MCP = {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  isActive: boolean;
};

export default function SettingsPage() {
  const [provider, setProvider] = useState<string>("openai");
  const [model, setModel] = useState<string>("gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [vectorStore, setVectorStore] = useState<string>("memory");
  const [chromaUrl, setChromaUrl] = useState<string>("");
  const [mcps, setMcps] = useState<MCP[]>([]);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("providers");
  
  // LLM parameters
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(1.0);
  const [maxTokens, setMaxTokens] = useState<number>(2000);
  const [presencePenalty, setPresencePenalty] = useState<number>(0.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState<number>(0.0);
  
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
        if (settings.vector_store) setVectorStore(settings.vector_store);
        if (settings.chroma_url) setChromaUrl(settings.chroma_url);
        if (settings.mcps) setMcps(settings.mcps);
        
        // Load LLM parameters if available
        if (settings.llm_parameters) {
          if (settings.llm_parameters.temperature !== undefined) 
            setTemperature(settings.llm_parameters.temperature);
          if (settings.llm_parameters.top_p !== undefined) 
            setTopP(settings.llm_parameters.top_p);
          if (settings.llm_parameters.max_tokens !== undefined) 
            setMaxTokens(settings.llm_parameters.max_tokens);
          if (settings.llm_parameters.presence_penalty !== undefined) 
            setPresencePenalty(settings.llm_parameters.presence_penalty);
          if (settings.llm_parameters.frequency_penalty !== undefined) 
            setFrequencyPenalty(settings.llm_parameters.frequency_penalty);
        }
        
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
  
  async function handleSave() {
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
          system_prompt: systemPrompt,
          vector_store: vectorStore,
          chroma_url: chromaUrl,
          mcps: mcps,
          llm_parameters: {
            temperature,
            top_p: topP,
            max_tokens: maxTokens,
            presence_penalty: presencePenalty,
            frequency_penalty: frequencyPenalty
          }
        })
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container mx-auto py-6 px-4 ml-72 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSave}
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
          </Button>
        </div>
      </div>
      
      {saved && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">Settings saved successfully!</span>
        </div>
      )}

      <Tabs defaultValue="providers" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="services">Tooling</TabsTrigger>
        </TabsList>
        
        <TabsContent value="providers">
          <ProvidersTab 
            provider={provider}
            setProvider={setProvider}
            model={model}
            setModel={setModel}
            apiKey={apiKey}
            setApiKey={setApiKey}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            vectorStore={vectorStore}
            setVectorStore={setVectorStore}
            chromaUrl={chromaUrl}
            setChromaUrl={setChromaUrl}
            modelCategories={modelCategories}
            models={models}
            temperature={temperature}
            setTemperature={setTemperature}
            topP={topP}
            setTopP={setTopP}
            maxTokens={maxTokens}
            setMaxTokens={setMaxTokens}
            presencePenalty={presencePenalty}
            setPresencePenalty={setPresencePenalty}
            frequencyPenalty={frequencyPenalty}
            setFrequencyPenalty={setFrequencyPenalty}
          />
        </TabsContent>
        
        <TabsContent value="prompts">
          <PromptsTab 
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
          />
        </TabsContent>
        
        <TabsContent value="services">
          <ServicesTab 
            mcps={mcps}
            setMcps={setMcps}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
