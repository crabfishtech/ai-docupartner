"use client";
import { useState } from "react";

export type Conversation = {
  guid: string;
  name: string;
};

export default function ConversationSelector({
  conversations,
  activeGuid,
  onNewConversation,
  onSelectConversation,
}: {
  conversations: Conversation[];
  activeGuid: string | null;
  onNewConversation: () => Promise<void>;
  onSelectConversation: (guid: string) => void;
}) {
  return (
    <div className="flex gap-2 items-center mb-6">
      <select
        className="p-2 rounded border bg-zinc-100 dark:bg-zinc-800"
        value={activeGuid || ""}
        onChange={e => onSelectConversation(e.target.value)}
      >
        <option value="">Select Conversation...</option>
        {conversations.map(c => (
          <option key={c.guid} value={c.guid}>
            {c.name || c.guid}
          </option>
        ))}
      </select>
      <button
        className="bg-black text-white py-2 px-4 rounded hover:bg-zinc-800 transition"
        onClick={onNewConversation}
        type="button"
      >
        + New Conversation
      </button>
    </div>
  );
}
