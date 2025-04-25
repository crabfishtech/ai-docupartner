"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PromptsTabProps = {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
};

export function PromptsTab({ systemPrompt, setSystemPrompt }: PromptsTabProps) {
  return (
    <Card>
      <CardContent className="">
        <div className="">
          <div className="mb-4">
            <Label htmlFor="systemPrompt" className="block mb-2 text-sm font-medium">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={12}
              placeholder="You are a helpful assistant."
              className="w-full"
            />
            <p className="text-xs text-zinc-500 mt-1">
              The system prompt sets the behavior and context for the AI model.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
