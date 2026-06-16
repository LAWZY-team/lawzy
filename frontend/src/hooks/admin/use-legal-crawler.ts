import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api/client'

export interface CrawlJob {
  id: string
  status: 'running' | 'completed' | 'failed'
  total: number
  processed: number
  created: number
  skipped: number
  errors: string[]
  startedAt: string
  completedAt?: string
  currentDoc?: string
}

export interface StartCrawlParams {
  pageFrom: number
  pageTo: number
  fieldIds?: number[]
  docTypeIds?: number[]
}

export const useLegalCrawler = () => {
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<CrawlJob | null>(null)
  const [starting, setStarting] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startCrawl = useCallback(async (params: StartCrawlParams) => {
    setStarting(true)
    try {
      const result = await api.post<{ jobId: string }>('/admin/sources/crawl', params)
      setJobId(result.jobId)
      setJob({
        id: result.jobId,
        status: 'running',
        total: 0,
        processed: 0,
        created: 0,
        skipped: 0,
        errors: [],
        startedAt: new Date().toISOString(),
      })
      return result.jobId
    } finally {
      setStarting(false)
    }
  }, [])

  useEffect(() => {
    if (!jobId) return
    stopPolling()

    const poll = async () => {
      try {
        const status = await api.get<CrawlJob>(`/admin/sources/crawl/${jobId}/status`)
        setJob(status)
        if (status.status !== 'running') {
          stopPolling()
        }
      } catch {
        stopPolling()
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)

    return stopPolling
  }, [jobId, stopPolling])

  const reset = useCallback(() => {
    stopPolling()
    setJobId(null)
    setJob(null)
  }, [stopPolling])

  return { startCrawl, job, starting, reset }
}
