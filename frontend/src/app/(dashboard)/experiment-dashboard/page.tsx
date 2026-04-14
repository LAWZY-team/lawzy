"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function LlmExperimentDashboard() {
  const [prompt, setPrompt] = React.useState("Please generate a standard Non-Disclosure Agreement (NDA) between two parties: Company A and Employee B. Include sections for Confidential Information, Term, and Exclusions.")
  const [loading, setLoading] = React.useState(false)
  const [metrics, setMetrics] = React.useState<any>(null)
  const [lastResult, setLastResult] = React.useState<any>(null)

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/proxy/llm-experiment/metrics")
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  React.useEffect(() => {
    fetchMetrics()
  }, [])

  const runTest = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/proxy/llm-experiment/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) throw new Error("Test failed")
      const data = await res.json()
      setLastResult(data)
      toast.success("Experiment run completed!")
      await fetchMetrics() // Refresh aggregations
    } catch (e) {
      console.error(e)
      toast.error("Failed to run experiment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">LLM A/B Testing Dashboard</h1>
        <Badge variant="outline" className="text-base px-4 py-1">Experiment Mode</Badge>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Run New Comparison Test</h2>
        <p className="text-sm text-muted-foreground">
          Enter a prompt to ask the LLM to generate a contract. The system will dispatch two concurrent requests using JSON mode and Markdown mode natively.
        </p>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          className="resize-none font-mono text-sm"
          placeholder="Enter prompt for the contract generation..."
        />
        <Button onClick={runTest} disabled={loading || !prompt.trim()} className="w-full h-12 text-lg">
          {loading ? "Generating parallel variants..." : "Launch Parallel Test"}
        </Button>
      </Card>

      {lastResult && (
        <div className="grid grid-cols-2 gap-6">
          <FormatResultBox title="JSON Variant Analysis" data={lastResult.jsonResult} />
          <FormatResultBox title="Markdown Variant Analysis" data={lastResult.markdownResult} />
        </div>
      )}

      {metrics && (
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            Aggregate Metrics Database
            <span className="text-sm font-normal text-muted-foreground ml-auto bg-muted px-3 py-1 rounded-full">
              Total Pair Tests: {metrics.totalTests}
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-8 divide-x">
             <MetricsSection title="JSON Averages" data={metrics.json} />
             <div className="pl-8">
               <MetricsSection title="Markdown Averages" data={metrics.markdown} />
             </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function FormatResultBox({ title, data }: { title: string, data: any }) {
  if (!data) return null
  return (
    <Card className="p-6 flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <Badge variant={data.isSuccess ? "default" : "destructive"}>
          {data.isSuccess ? "Parse Success" : "Parse Failed"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
         <div className="space-y-1">
           <p className="text-muted-foreground">Input Tokens</p>
           <p className="font-medium text-lg">{data.inputTokens}</p>
         </div>
         <div className="space-y-1">
           <p className="text-muted-foreground">Output Tokens</p>
           <p className="font-medium text-lg">{data.outputTokens}</p>
         </div>
         <div className="space-y-1">
           <p className="text-muted-foreground">Latency (ms)</p>
           <p className="font-medium text-lg">{data.latencyMs} ms</p>
         </div>
      </div>
      {!data.isSuccess && data.errorMessage && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 whitespace-pre-wrap break-words">
          <strong>Error:</strong> {data.errorMessage}
        </div>
      )}
    </Card>
  )
}

function MetricsSection({ title, data }: { title: string, data: any }) {
  if (!data) return <div className="text-muted-foreground">No data yet.</div>
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-medium tracking-tight text-primary/80">{title}</h3>
      <div className="space-y-4">
        <MetricRow label="Parsing Success Rate" value={data.successRate.toFixed(1) + "%"} />
        <MetricRow label="Avg Input Tokens" value={Math.round(data.avgInputTokens).toLocaleString()} />
        <MetricRow label="Avg Output Tokens" value={Math.round(data.avgOutputTokens).toLocaleString()} />
        <MetricRow label="Avg Response Latency" value={Math.round(data.avgLatency).toLocaleString() + " ms"} />
      </div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0 border-primary/10">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-lg">{value}</span>
    </div>
  )
}
