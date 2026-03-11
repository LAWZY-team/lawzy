"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageBubble } from "./chat-message-bubble";
import { ChatLoadingThinking } from "./chat-loading-thinking";
import type { ChatMessage } from "./types";
import Image from "next/image";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { text: "Soạn hợp đồng dịch vụ" },
  { text: "Kiểm tra rủi ro pháp lý"},
  { text: "Tra cứu Luật Dân sự 2015"},
  { text: "Giải thích điều khoản"},
] as const;

interface ChatMessageListProps {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  isLoading: boolean;
  thinkingSteps: string[];
  thinkingCollapsed: boolean;
  onToggleThinkingCollapsed: () => void;
  userDisplayName?: string;
  isCanvasMode: boolean;
  onOpenCanvas?: () => void;
  expandedThinkingId: string | null;
  onToggleThinking: (id: string) => void;
  onQuickAction: (text: string) => void;
}

export function ChatMessageList({
  scrollAreaRef,
  messages,
  isLoading,
  thinkingSteps,
  thinkingCollapsed,
  onToggleThinkingCollapsed,
  isCanvasMode,
  onOpenCanvas,
  expandedThinkingId,
  onToggleThinking,
  onQuickAction,
}: ChatMessageListProps) {
  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 w-full min-h-0">
      <div
        className={cn(
          "px-4 py-6 md:px-6 space-y-8 w-full pb-6",
          isCanvasMode ? "max-w-none" : "max-w-3xl mx-auto"
        )}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in duration-700">
            <div className="space-y-2 max-w-md">
              {/* Xin chào, {userDisplayName?.trim() || "Luật sư"} */}
              <Image
                width={90}
                height={90}
                src="/logo/lawzy-logo-whitebg.png"
                alt="Lawzy"
                className="object-contain"
              />
              <p className="text-muted-foreground">
                Hôm nay tôi có thể giúp gì cho bạn?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.text}
                  type="button"
                  className="p-4 text-sm text-left bg-background hover:bg-accent border border-border rounded-xl transition-all flex items-center gap-3 text-foreground group"
                  onClick={() => onQuickAction(action.text)}
                >
                  <span>{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                isCanvasMode={isCanvasMode}
                onOpenCanvas={onOpenCanvas}
                expandedThinkingId={expandedThinkingId}
                onToggleThinking={onToggleThinking}
              />
            ))}
          </AnimatePresence>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 w-full"
          >
            <div className="shrink-0 mt-1">
              <Image
                src="/logo/lawzy-triangle.png"
                width={24}
                height={24}
                alt="Lawzy"
                className="object-contain"
              />
            </div>
            <ChatLoadingThinking
              thinkingSteps={thinkingSteps}
              thinkingCollapsed={thinkingCollapsed}
              onToggleCollapsed={onToggleThinkingCollapsed}
            />
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
}
