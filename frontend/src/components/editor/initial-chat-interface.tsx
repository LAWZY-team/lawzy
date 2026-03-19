"use client"

import { useState } from 'react'
import { Send, FileText, Briefcase, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface InitialChatInterfaceProps {
  onGenerate: (prompt: string) => void
  isGenerating: boolean
}

const QUICK_ACTIONS = [
  {
    icon: Home,
    title: 'Hợp đồng thuê nhà',
    prompt: 'Soạn hợp đồng thuê nhà dân dụng theo pháp luật Việt Nam, bao gồm đầy đủ các điều khoản về thời hạn thuê, giá thuê, phí dịch vụ, trách nhiệm các bên và điều kiện chấm dứt hợp đồng.',
  },
  {
    icon: Briefcase,
    title: 'Hợp đồng lao động',
    prompt: 'Soạn hợp đồng lao động không xác định thời hạn theo Bộ luật Lao động 2019, bao gồm các điều khoản về công việc, lương thưởng, thời giờ làm việc, nghỉ phép, bảo hiểm và các quyền lợi của người lao động.',
  },
  {
    icon: FileText,
    title: 'Hợp đồng mua bán',
    prompt: 'Soạn hợp đồng mua bán hàng hóa giữa hai doanh nghiệp, quy định rõ về sản phẩm, số lượng, giá cả, phương thức thanh toán, giao hàng, bảo hành và xử lý tranh chấp.',
  },
]

export function InitialChatInterface({ onGenerate, isGenerating }: InitialChatInterfaceProps) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = () => {
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim())
    }
  }

  const handleQuickAction = (quickPrompt: string) => {
    if (!isGenerating) {
      setPrompt(quickPrompt)
      onGenerate(quickPrompt)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <Image
              src="/logo/lawzy-triangle.png"
              width={64}
              height={64}
              alt="Lawzy"
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold">Soạn thảo hợp đồng với AI</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mô tả loại hợp đồng bạn muốn soạn, AI sẽ tạo nội dung hoàn chỉnh và tuân thủ pháp luật Việt Nam
          </p>
        </div>

        {/* Quick Actions */}
        {!isGenerating && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <Card
                  key={action.title}
                  className={cn(
                    "p-6 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                    "group"
                  )}
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  <div className="space-y-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {action.prompt.substring(0, 80)}...
                    </p>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Chat Input */}
        <Card className="p-6 space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Mô tả loại hợp đồng bạn muốn soạn..."
            className="min-h-[120px] text-base resize-none"
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit()
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Nhấn <kbd className="px-2 py-1 text-xs border rounded bg-muted">Ctrl</kbd> +{' '}
              <kbd className="px-2 py-1 text-xs border rounded bg-muted">Enter</kbd> để gửi
            </p>
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGenerating}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <span className="mr-2 inline-flex items-center">
                    <Image
                      src="/logo/lawzy-triangle.png"
                      width={16}
                      height={16}
                      alt="Lawzy"
                      className="object-contain animate-pulse"
                    />
                  </span>
                  Đang soạn thảo...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Soạn hợp đồng
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
