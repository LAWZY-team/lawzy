"use client";

import { useRouter } from "next/navigation";
import { useAssistantChat } from "@/app/hooks/useAssistantChat";
import { InitialView } from "@/components/lpms/assistant/InitialView";
import { ChatView } from "@/components/lpms/assistant/ChatView";
import type { Message } from "@/components/lpms/shared/types";

export default function AssistantPage() {
    const router = useRouter();
    const {
        messages,
        isResponseLoading,
        handleChat,
        handleNewChat,
        cancel,
        chatId,
    } = useAssistantChat();

    async function handleInitialSubmit(message: Message) {
        const chatId = await handleNewChat(message);
        if (chatId) router.push(`/lpms/assistant/chat/${chatId}`);
    }

    if (messages.length === 0) {
        return (
            <InitialView
                onSubmit={(message) => void handleInitialSubmit(message)}
            />
        );
    }

    return (
        <ChatView
            chatId={chatId}
            messages={messages}
            isResponseLoading={isResponseLoading}
            handleChat={handleChat}
            cancel={cancel}
        />
    );
}
