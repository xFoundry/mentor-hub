"use client";

/**
 * Main chat container component.
 * Composes all chat components into a complete interface.
 */

import { RotateCcw, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChat } from "@/hooks/use-chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ChatAgentTrace } from "./chat-agent-trace";
import type { UserContext } from "@/types/chat";

interface ChatContainerProps {
  userContext?: UserContext;
}

export function ChatContainer({ userContext }: ChatContainerProps) {
  const { session, sendMessage, clearChat, newChat, useMemory, setUseMemory } = useChat({ userContext });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">AI Assistant</h2>
          <p className="text-xs text-muted-foreground">
            {session.threadId
              ? `Thread: ${session.threadId.slice(0, 8)}...`
              : "New conversation"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            disabled={session.messages.length === 0}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={newChat}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {session.error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{session.error}</AlertDescription>
        </Alert>
      )}

      {/* Main content area */}
      <div className="flex min-h-0 flex-1">
        {/* Messages area */}
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatMessages
            messages={session.messages}
            isStreaming={session.isStreaming}
          />
          <ChatInput
            onSend={sendMessage}
            isStreaming={session.isStreaming}
            useMemory={useMemory}
            onUseMemoryChange={setUseMemory}
          />
        </div>

        {/* Agent trace sidebar */}
        <div className="border-l p-2">
          <ChatAgentTrace
            traces={session.traces}
            isStreaming={session.isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
