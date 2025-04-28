"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProvidersTabProps = {
  provider: string;
  setProvider: (provider: string) => void;
  model: string;
  setModel: (model: string) => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  vectorStore: string;
  setVectorStore: (vectorStore: string) => void;
  chromaUrl: string;
  setChromaUrl: (url: string) => void;
  modelCategories: any;
  models: any;
  // LLM parameters
  temperature?: number;
  setTemperature?: (temp: number) => void;
  topP?: number;
  setTopP?: (value: number) => void;
  maxTokens?: number;
  setMaxTokens?: (tokens: number) => void;
  presencePenalty?: number;
  setPresencePenalty?: (value: number) => void;
  frequencyPenalty?: number;
  setFrequencyPenalty?: (value: number) => void;
};

export function ProvidersTab({
  provider,
  setProvider,
  model,
  setModel,
  apiKey,
  setApiKey,
  showApiKey,
  setShowApiKey,
  vectorStore,
  setVectorStore,
  chromaUrl,
  setChromaUrl,
  modelCategories,
  models,
  // LLM parameters with defaults
  temperature = 0.7,
  setTemperature = () => {},
  topP = 1.0,
  setTopP = () => {},
  maxTokens = 2000,
  setMaxTokens = () => {},
  presencePenalty = 0.0,
  setPresencePenalty = () => {},
  frequencyPenalty = 0.0,
  setFrequencyPenalty = () => {}
}: ProvidersTabProps) {
  return (
    <Card>
      <CardContent className="">
        <div className="">
          <div className="mb-4">
            <Label htmlFor="provider" className="block mb-2 text-sm font-medium">LLM Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic" disabled>Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <Label htmlFor="model" className="block mb-2 text-sm font-medium">LLM Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelCategories[provider]?.map((category: any, index: number) => (
                  <div key={index}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {category.category}
                    </div>
                    {category.models.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <Label htmlFor="apiKey" className="block mb-2 text-sm font-medium">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full pr-10"
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
            <Label htmlFor="vectorStore" className="block mb-2 text-sm font-medium">Vector Store Type</Label>
            <Select value={vectorStore} onValueChange={setVectorStore}>
              <SelectTrigger id="vectorStore" className="w-full">
                <SelectValue placeholder="Select vector store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="memory">In-Memory (Default)</SelectItem>
                <SelectItem value="chroma">Chroma DB</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500 mt-1">
              In-Memory is simpler but requires document re-processing on restart. Chroma provides persistence but requires a running Chroma DB server.
            </p>
          </div>
          
          {vectorStore === "chroma" && (
            <div className="mb-4">
              <Label htmlFor="chromaUrl" className="block mb-2 text-sm font-medium">Chroma Server URL</Label>
              <Input
                id="chromaUrl"
                type="text"
                value={chromaUrl}
                onChange={e => setChromaUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full"
              />
              <p className="text-xs text-zinc-500 mt-1">
                The URL of your Chroma DB server, including protocol and port (e.g., http://localhost:8000).
              </p>
            </div>
          )}
          
          <div className="mt-8 mb-4">
            <h3 className="text-lg font-medium mb-4">LLM Parameters</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              These settings control how the AI generates responses. Adjust them to fine-tune the behavior of the model.
            </p>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="temperature" className="text-sm font-medium">Temperature: {temperature}</Label>
                  <span className="text-xs text-zinc-500">{temperature}</span>
                </div>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Controls randomness: Lower values (0) make responses more focused and deterministic, while higher values (1) make output more random and creative.
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="topP" className="text-sm font-medium">Top P: {topP}</Label>
                  <span className="text-xs text-zinc-500">{topP}</span>
                </div>
                <input
                  id="topP"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={e => setTopP(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. Use either Temperature or Top P, not both.
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="maxTokens" className="text-sm font-medium">Max Tokens: {maxTokens}</Label>
                  <span className="text-xs text-zinc-500">{maxTokens}</span>
                </div>
                <input
                  id="maxTokens"
                  type="range"
                  min="100"
                  max="4000"
                  step="100"
                  value={maxTokens}
                  onChange={e => setMaxTokens(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  The maximum number of tokens to generate. One token is roughly 4 characters for English text. Higher values allow for longer responses.
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="presencePenalty" className="text-sm font-medium">Presence Penalty: {presencePenalty}</Label>
                  <span className="text-xs text-zinc-500">{presencePenalty}</span>
                </div>
                <input
                  id="presencePenalty"
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={presencePenalty}
                  onChange={e => setPresencePenalty(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Positive values discourage the model from repeating the same topics. Increases the likelihood of introducing new topics.
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="frequencyPenalty" className="text-sm font-medium">Frequency Penalty: {frequencyPenalty}</Label>
                  <span className="text-xs text-zinc-500">{frequencyPenalty}</span>
                </div>
                <input
                  id="frequencyPenalty"
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={frequencyPenalty}
                  onChange={e => setFrequencyPenalty(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Positive values discourage the model from repeating the same words or phrases. Useful for reducing verbatim repetition.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
