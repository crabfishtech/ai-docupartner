"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Edit } from "lucide-react";

type MCP = {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  isActive: boolean;
};

type ServicesTabProps = {
  mcps: MCP[];
  setMcps: (mcps: MCP[]) => void;
};

export function ServicesTab({ mcps = [], setMcps }: ServicesTabProps) {
  const [newMcp, setNewMcp] = useState<Partial<MCP>>({
    name: "",
    url: "",
    apiKey: "",
    isActive: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const handleAddMcp = () => {
    if (!newMcp.name || !newMcp.url) return;
    
    const mcp: MCP = {
      id: Date.now().toString(),
      name: newMcp.name || "", // Ensure name is never undefined
      url: newMcp.url || "", // Ensure url is never undefined
      apiKey: newMcp.apiKey,
      isActive: true
    };
    
    setMcps([...mcps, mcp]);
    setNewMcp({ name: "", url: "", apiKey: "", isActive: true });
  };

  const handleDeleteMcp = (id: string) => {
    setMcps(mcps.filter(mcp => mcp.id !== id));
  };

  const handleEditMcp = (id: string) => {
    const mcp = mcps.find(m => m.id === id);
    if (mcp) {
      setEditingId(id);
      setNewMcp({ ...mcp });
    }
  };

  const handleUpdateMcp = () => {
    if (!editingId || !newMcp.name || !newMcp.url) return;
    
    setMcps(mcps.map(mcp => 
      mcp.id === editingId 
        ? { 
            ...mcp, 
            name: newMcp.name || "", // Ensure name is never undefined
            url: newMcp.url || "", // Ensure url is never undefined
            apiKey: newMcp.apiKey 
          } 
        : mcp
    ));
    
    setEditingId(null);
    setNewMcp({ name: "", url: "", apiKey: "", isActive: true });
  };

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleMcpActive = (id: string) => {
    setMcps(mcps.map(mcp => 
      mcp.id === id ? { ...mcp, isActive: !mcp.isActive } : mcp
    ));
  };

  return (
    <Card>
      <CardContent className="pt-0">
        <div className="">
          <div>
            <h3 className="text-lg font-medium mb-2">Machine Comprehension Providers (MCPs)</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Configure external services that can be used to enhance document understanding.
            </p>
          </div>

          {/* MCP List */}
          <div className="space-y-4">
            {mcps.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No services configured yet. Add your first MCP below.
              </div>
            ) : (
              mcps.map(mcp => (
                <div key={mcp.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${mcp.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <h4 className="font-medium">{mcp.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleMcpActive(mcp.id)}
                      >
                        {mcp.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleEditMcp(mcp.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleDeleteMcp(mcp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <span className="font-medium">URL:</span> {mcp.url}
                    </div>
                    {mcp.apiKey && (
                      <div className="flex items-center">
                        <span className="font-medium mr-2">API Key:</span> 
                        <span className="font-mono">
                          {showApiKey[mcp.id] ? mcp.apiKey : '••••••••••••••••'}
                        </span>
                        <button 
                          className="ml-2 text-zinc-500 hover:text-zinc-700"
                          onClick={() => toggleApiKeyVisibility(mcp.id)}
                        >
                          {showApiKey[mcp.id] ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add/Edit MCP Form */}
          <div className="border rounded-md p-4">
            <h4 className="font-medium mb-3">
              {editingId ? 'Edit MCP' : 'Add New MCP'}
            </h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="mcpName" className="block mb-2 text-sm font-medium">Name</Label>
                <Input
                  id="mcpName"
                  value={newMcp.name}
                  onChange={e => setNewMcp({ ...newMcp, name: e.target.value })}
                  placeholder="e.g., OpenAI Vision"
                />
              </div>
              
              <div>
                <Label htmlFor="mcpUrl" className="block mb-2 text-sm font-medium">Service URL</Label>
                <Input
                  id="mcpUrl"
                  value={newMcp.url}
                  onChange={e => setNewMcp({ ...newMcp, url: e.target.value })}
                  placeholder="https://api.example.com/v1"
                />
              </div>
              
              <div>
                <Label htmlFor="mcpApiKey" className="block mb-2 text-sm font-medium">API Key (optional)</Label>
                <Input
                  id="mcpApiKey"
                  value={newMcp.apiKey}
                  onChange={e => setNewMcp({ ...newMcp, apiKey: e.target.value })}
                  placeholder="Enter API key if required"
                  type="password"
                />
              </div>
              
              <div className="pt-2">
                {editingId ? (
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateMcp}>
                      Update Service
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingId(null);
                        setNewMcp({ name: "", url: "", apiKey: "", isActive: true });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleAddMcp}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
