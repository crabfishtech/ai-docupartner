"use client";

import { useState } from "react";
import { DocumentGroup } from "../types";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Edit, Check, X, Plus } from "lucide-react";

type GroupsTabProps = {
  groups: DocumentGroup[];
  fetchGroups: () => Promise<void>;
};

export function GroupsTab({ groups, fetchGroups }: GroupsTabProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/document-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newGroupName.trim() }),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Reset the form
      setNewGroupName('');
      
      // Refresh the groups list
      await fetchGroups();
    } catch (error) {
      console.error('Error creating document group:', error);
      alert(`Failed to create document group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleEditGroup = (group: DocumentGroup) => {
    setEditingId(group.guid);
    setEditName(group.name);
  };

  const handleUpdateGroup = async () => {
    if (!editingId || !editName.trim()) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/document-groups?guid=${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName.trim() }),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Reset the form
      setEditingId(null);
      setEditName('');
      
      // Refresh the groups list
      await fetchGroups();
    } catch (error) {
      console.error('Error updating document group:', error);
      alert(`Failed to update document group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group? All documents in this group will become ungrouped.')) {
      return;
    }
    
    setDeleting(groupId);
    try {
      const response = await fetch(`/api/document-groups?guid=${groupId}`, {
        method: 'DELETE',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Refresh the groups list
      await fetchGroups();
    } catch (error) {
      console.error('Error deleting document group:', error);
      alert(`Failed to delete document group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Create New Group</h3>
          <form onSubmit={handleCreateGroup} className="flex gap-2">
            <Input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New group name"
              className="flex-1"
            />
            <Button 
              type="submit"
              disabled={creating || !newGroupName.trim()}
            >
              {creating ? "Creating..." : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </form>
          <br />

          <h3 className="text-lg font-medium mb-4">Document Groups</h3>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              No document groups created yet.
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div 
                  key={group.guid} 
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                >
                  {editingId === group.guid ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        size="sm"
                        onClick={handleUpdateGroup}
                        disabled={updating || !editName.trim()}
                      >
                        {updating ? "Saving..." : <Check className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{group.documentCount} document{group.documentCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditGroup(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteGroup(group.guid)}
                          disabled={deleting === group.guid}
                        >
                          {deleting === group.guid ? (
                            <span className="animate-spin h-4 w-4">⏳</span>
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
