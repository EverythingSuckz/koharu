'use client'

import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query/keys'
import { useEditorUiStore } from '@/lib/stores/editorUiStore'
import { useLlmUiStore } from '@/lib/stores/llmUiStore'
import {
  usePreferencesStore,
  isCloudProvider,
  type ProviderConfig,
} from '@/lib/stores/preferencesStore'
import type { LlmModelInfo } from '@/lib/generated/protocol/LlmModelInfo'
import i18n from '@/lib/i18n'
import { useRpcConnection } from '@/hooks/useRpcConnection'

/** Frontend-extended model entry with provider origin tracking. */
export type LlmModelEntry = LlmModelInfo & {
  /** ID of the ProviderConfig this model belongs to. */
  originProviderId?: number
}

/** Extract provider ID from a frontend model ID like "openai-compatible:5:qwen2.5:7b". */
export const getProviderIdFromModelId = (
  modelId: string,
): number | undefined => {
  const parts = modelId.split(':')
  if (parts[0] === 'openai-compatible' && parts.length >= 3) {
    const id = parseInt(parts[1], 10)
    if (!isNaN(id)) return id
  }
  return undefined
}

/** Look up the ProviderConfig for a given model, either from its encoded ID or its source field. */
export const getProviderForModel = (
  modelId: string,
  source?: string,
): ProviderConfig | undefined => {
  const { providers } = usePreferencesStore.getState()
  const providerId = getProviderIdFromModelId(modelId)
  if (providerId !== undefined)
    return providers.find((p) => p.id === providerId)
  if (source && source !== 'local')
    return providers.find((p) => p.type === source)
  return undefined
}

/**
 * Convert frontend model ID to backend format.
 * "openai-compatible:5:qwen2.5:7b" → "openai-compatible:qwen2.5:7b"
 */
export const toBackendModelId = (modelId: string): string => {
  if (getProviderIdFromModelId(modelId) !== undefined) {
    const parts = modelId.split(':')
    return [parts[0], ...parts.slice(2)].join(':')
  }
  return modelId
}

export const useDocumentsCountQuery = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.documents.count,
    queryFn: () => api.getDocumentsCount(),
    enabled,
  })

export const useCurrentDocumentQuery = (index: number, enabled = true) =>
  useQuery({
    queryKey: queryKeys.documents.current(index),
    queryFn: () => api.getDocument(index),
    enabled,
    placeholderData: keepPreviousData,
    structuralSharing: false,
  })

export const useCurrentDocumentState = () => {
  const currentDocumentIndex = useEditorUiStore(
    (state) => state.currentDocumentIndex,
  )
  const { data: totalPages = 0 } = useDocumentsCountQuery()
  const currentDocumentQuery = useCurrentDocumentQuery(
    currentDocumentIndex,
    totalPages > 0,
  )

  return {
    currentDocumentIndex,
    totalPages,
    currentDocument: currentDocumentQuery.data ?? null,
    currentDocumentLoading: currentDocumentQuery.isPending,
    refreshCurrentDocument: currentDocumentQuery.refetch,
  }
}

export const useThumbnailQuery = (index: number, documentsVersion: number) =>
  useQuery({
    queryKey: queryKeys.documents.thumbnail(documentsVersion, index),
    queryFn: () => api.getThumbnail(index),
    structuralSharing: false,
    staleTime: 60 * 1000,
  })

export const useFontsQuery = () =>
  useQuery({
    queryKey: queryKeys.fonts,
    queryFn: () => api.listFonts(),
    staleTime: 10 * 60 * 1000,
  })

export const useLlmModelsQuery = () => {
  const [language, setLanguage] = useState(i18n.language)
  const rpcConnected = useRpcConnection()
  const providers = usePreferencesStore((state) => state.providers)
  const configVersion = usePreferencesStore(
    (state) => state.providersConfigVersion,
  )

  const hasCompatible = providers.some(
    (p) => !isCloudProvider(p.type) && p.baseUrl?.trim(),
  )

  useEffect(() => {
    const handleLanguageChange = (nextLanguage: string) => {
      setLanguage(nextLanguage)
    }
    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [])

  return useQuery<LlmModelEntry[]>({
    queryKey: queryKeys.llm.models(
      language ?? 'default',
      hasCompatible ? 'configured' : undefined,
      configVersion,
    ),
    queryFn: async () => {
      const raw = await api.llmList(language)
      const models: LlmModelEntry[] = raw
      const apiLanguages =
        models.find((m) => m.source !== 'local' && m.languages.length > 0)
          ?.languages ?? []

      // Tag cloud models with their provider ID
      for (const model of models) {
        if (model.source !== 'local') {
          const provider = providers.find((p) => p.type === model.source)
          if (provider) model.originProviderId = provider.id
        }
      }

      // Discover models from self-hosted providers
      const selfHosted = providers.filter(
        (p) => !isCloudProvider(p.type) && p.baseUrl?.trim(),
      )
      const discoveryResults = await Promise.allSettled(
        selfHosted.map(async (provider) => {
          const result = await api.llmPing(
            provider.baseUrl,
            provider.apiKey || undefined,
          )
          return { provider, models: result.ok ? result.models : [] }
        }),
      )
      for (const result of discoveryResults) {
        if (result.status !== 'fulfilled') continue
        const { provider, models: discovered } = result.value
        for (const modelName of discovered) {
          const id = `openai-compatible:${provider.id}:${modelName}`
          if (!models.some((m) => m.id === id)) {
            models.push({
              id,
              languages: apiLanguages,
              source: 'openai-compatible',
              originProviderId: provider.id,
            })
          }
        }
      }

      // Also inject any pinned models not already discovered
      for (const provider of selfHosted) {
        for (const modelName of provider.pinnedModels) {
          const id = `openai-compatible:${provider.id}:${modelName}`
          if (!models.some((m) => m.id === id)) {
            models.push({
              id,
              languages: apiLanguages,
              source: 'openai-compatible',
              originProviderId: provider.id,
            })
          }
        }
      }

      // Filter by visibility: only keep models whose provider exists and has
      // showAllModels enabled, or whose name is pinned in that provider.
      // Cloud models without a matching provider are hidden (provider removed).
      return models.filter((model) => {
        if (model.source === 'local') return true // local models always visible
        if (!model.originProviderId) return false // cloud model with no matching provider — hide
        const provider = providers.find((p) => p.id === model.originProviderId)
        if (!provider) return false // provider was removed — hide its models
        if (provider.showAllModels) return true
        // Check if this model's name is pinned
        const modelName =
          model.source === 'openai-compatible' &&
          model.id.split(':').length >= 3
            ? model.id.split(':').slice(2).join(':')
            : model.id.includes(':')
              ? model.id.split(':').slice(1).join(':')
              : model.id
        return provider.pinnedModels.includes(modelName)
      })
    },
    enabled: rpcConnected,
    staleTime: hasCompatible ? 0 : 5 * 60 * 1000,
  })
}

export const useLlmReadyQuery = () => {
  const selectedModel = useLlmUiStore((state) => state.selectedModel)
  const backendId = selectedModel ? toBackendModelId(selectedModel) : undefined
  return useQuery({
    queryKey: queryKeys.llm.ready(selectedModel),
    queryFn: () => api.llmReady(backendId),
    enabled: !!selectedModel,
  })
}

export const useDeviceInfoQuery = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.device.info,
    queryFn: () => api.deviceInfo(),
    enabled,
    staleTime: 10 * 60 * 1000,
  })

export const useAppVersionQuery = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.app.version,
    queryFn: () => api.appVersion(),
    enabled,
    staleTime: 10 * 60 * 1000,
  })
