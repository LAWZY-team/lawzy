"use client"

import * as React from "react"
import { useState } from "react"
import { Send, Bot, User, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Xin chào! Tôi là Trợ lý AI của Lawzy. Tôi có thể giúp bạn tra cứu án lệ, phân tích rủi ro pháp lý, hoặc giải đáp các thắc mắc về hợp đồng. Bạn cần tôi giúp gì hôm nay?"
  }
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // MOCK: Gọi AI API
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Đây là phản hồi từ AI (Đang được MOCK). Trong môi trường thực tế, câu hỏi của bạn sẽ được gửi tới LLM thông qua RAG để truy xuất án lệ và tài liệu tham khảo từ thư viện Lawzy."
      }
      setMessages(prev => [...prev, botMessage])
      setIsTyping(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm mt-4 mx-4 mb-4 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b bg-slate-50">
        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Lawzy Assistant</h2>
          <p className="text-xs text-muted-foreground">Trợ lý AI phân tích và tra cứu</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" />
              Giao diện này đang MOCK dữ liệu. Cần kết nối tới API RAG Backend.
            </div>
          </div>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-sm ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-emerald-100 text-emerald-600"
              }`}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-muted text-foreground rounded-tl-none"
              }`}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 text-sm flex-row">
              <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-muted text-foreground rounded-tl-none flex items-center gap-1">
                <span className="animate-bounce h-1.5 w-1.5 bg-gray-400 rounded-full"></span>
                <span className="animate-bounce h-1.5 w-1.5 bg-gray-400 rounded-full" style={{ animationDelay: "0.2s" }}></span>
                <span className="animate-bounce h-1.5 w-1.5 bg-gray-400 rounded-full" style={{ animationDelay: "0.4s" }}></span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-white border-t">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi trợ lý AI (VD: Phân tích giúp tôi rủi ro của điều khoản đền bù...)"
            className="min-h-[60px] max-h-[200px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="h-auto shrink-0 px-6">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-muted-foreground">AI có thể mắc lỗi. Vui lòng kiểm tra lại các thông tin pháp lý quan trọng.</span>
        </div>
      </div>
    </div>
  )
}
