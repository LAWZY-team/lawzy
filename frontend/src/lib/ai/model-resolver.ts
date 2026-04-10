const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const DEFAULT_PREFERRED_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
] as const

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const unique = (values: string[]): string[] => {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export const normalizeGeminiModelName = (value: string): string =>
  value.trim().replace(/^models\//, '')

const parseModelList = (value: string | undefined): string[] => {
  if (!isNonEmptyString(value)) return []
  return value
    .split(',')
    .map((item) => normalizeGeminiModelName(item))
    .filter((item) => item.length > 0)
}

export const getConfiguredGeminiModelCandidates = (): string[] => {
  const requestedModel = parseModelList(process.env.GEMINI_MODEL)[0]
  const fallbackModels = parseModelList(process.env.GEMINI_FALLBACK_MODELS)
  const baseline = [...DEFAULT_PREFERRED_MODELS]
  const configured = requestedModel
    ? [requestedModel, ...fallbackModels, ...baseline]
    : [...fallbackModels, ...baseline]
  return unique(configured)
}

interface GeminiModelItem {
  name?: string
  supportedGenerationMethods?: string[]
}

interface ListModelsResponse {
  models?: GeminiModelItem[]
}

export interface ResolvedGeminiModel {
  selectedModel: string
  modelCandidates: string[]
  availableGenerateContentModels: string[]
}

const parseAvailableModels = (data: ListModelsResponse): string[] => {
  const models = data.models ?? []
  const available = models
    .filter((model) => (model.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((model) => model.name ?? '')
    .filter(isNonEmptyString)
    .map((name) => normalizeGeminiModelName(name))
  return unique(available)
}

export const resolveGeminiModel = async (apiKey: string): Promise<ResolvedGeminiModel> => {
  const configuredCandidates = getConfiguredGeminiModelCandidates()
  const listModelsUrl = `${GEMINI_API_BASE}/models?key=${apiKey}`
  try {
    const response = await fetch(listModelsUrl, { method: 'GET' })
    if (!response.ok) {
      return {
        selectedModel: configuredCandidates[0] ?? 'gemini-2.5-flash',
        modelCandidates: configuredCandidates,
        availableGenerateContentModels: [],
      }
    }
    const data = (await response.json()) as ListModelsResponse
    const availableModels = parseAvailableModels(data)
    const preferredAvailable = configuredCandidates.filter((candidate) =>
      availableModels.includes(candidate)
    )
    const finalCandidates = unique([
      ...preferredAvailable,
      ...configuredCandidates,
      ...availableModels,
    ])
    return {
      selectedModel: finalCandidates[0] ?? configuredCandidates[0] ?? 'gemini-2.5-flash',
      modelCandidates: finalCandidates,
      availableGenerateContentModels: availableModels,
    }
  } catch {
    return {
      selectedModel: configuredCandidates[0] ?? 'gemini-2.5-flash',
      modelCandidates: configuredCandidates,
      availableGenerateContentModels: [],
    }
  }
}

interface FallbackErrorInput {
  statusCode?: number
  message?: string
}

export const shouldFallbackForGeminiError = ({
  statusCode,
  message,
}: FallbackErrorInput): boolean => {
  if (statusCode === 429 || statusCode === 503) return true
  const text = (message ?? '').toLowerCase()
  if (!text) return false
  return (
    text.includes('not found for api version') ||
    text.includes('not supported for generatecontent') ||
    text.includes('currently experiencing high demand') ||
    text.includes('resource exhausted') ||
    text.includes('rate limit') ||
    text.includes('quota exceeded')
  )
}
