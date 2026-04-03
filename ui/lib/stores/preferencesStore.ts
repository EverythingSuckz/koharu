'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ProviderType =
  | 'openai'
  | 'gemini'
  | 'claude'
  | 'deepseek'
  | 'ollama'
  | 'lmstudio'
  | 'openai-compatible'

export type ProviderConfig = {
  /** Stable auto-incrementing identifier. */
  id: number
  /** Provider type – determines which fields are shown and default values. */
  type: ProviderType
  /** User-editable display label, e.g. "My Ollama Server". */
  label: string
  /** Base URL (only used for self-hosted providers). */
  baseUrl: string
  /** API key (only stored locally for self-hosted providers; cloud keys use OS keyring). */
  apiKey: string
  /** When true, all models from this provider appear in the toolbar picker. */
  showAllModels: boolean
  /** When showAllModels is false, only these model names appear in the picker. */
  pinnedModels: string[]
  /** Optional temperature override. */
  temperature: number | null
  /** Optional max tokens override. */
  maxTokens: number | null
  /** Optional custom system prompt override. */
  customSystemPrompt: string
}

const CLOUD_TYPES: ProviderType[] = ['openai', 'gemini', 'claude', 'deepseek']

export const isCloudProvider = (type: ProviderType) =>
  CLOUD_TYPES.includes(type)

export const PROVIDER_DEFAULTS: Record<
  ProviderType,
  { label: string; baseUrl: string }
> = {
  openai: { label: 'OpenAI', baseUrl: '' },
  gemini: { label: 'Gemini', baseUrl: '' },
  claude: { label: 'Claude', baseUrl: '' },
  deepseek: { label: 'DeepSeek', baseUrl: '' },
  ollama: { label: 'Ollama', baseUrl: 'http://localhost:11434/v1' },
  lmstudio: { label: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1' },
  'openai-compatible': { label: 'Custom', baseUrl: '' },
}

const makeDefaultProvider = (
  id: number,
  type: ProviderType,
  overrides?: Partial<ProviderConfig>,
): ProviderConfig => ({
  id,
  type,
  label: PROVIDER_DEFAULTS[type].label,
  baseUrl: PROVIDER_DEFAULTS[type].baseUrl,
  apiKey: '',
  showAllModels: true,
  pinnedModels: [],
  temperature: null,
  maxTokens: null,
  customSystemPrompt: '',
  ...overrides,
})

type PreferencesState = {
  brushConfig: {
    size: number
    color: string
  }
  setBrushConfig: (config: Partial<PreferencesState['brushConfig']>) => void
  fontFamily?: string
  setFontFamily: (font?: string) => void

  /** Dynamic provider list – replaces the old apiKeys + localLlm sections. */
  providers: ProviderConfig[]
  /** Counter for generating unique provider IDs. */
  nextProviderId: number
  /** Bumped on any provider change; used as a query key dependency. */
  providersConfigVersion: number

  addProvider: (type: ProviderType) => number
  updateProvider: (
    id: number,
    patch: Partial<Omit<ProviderConfig, 'id' | 'type'>>,
  ) => void
  removeProvider: (id: number) => void

  resetPreferences: () => void
}

const initialProviders: ProviderConfig[] = [
  makeDefaultProvider(1, 'openai'),
  makeDefaultProvider(2, 'gemini'),
  makeDefaultProvider(3, 'claude'),
  makeDefaultProvider(4, 'deepseek'),
  makeDefaultProvider(5, 'ollama'),
]
const INITIAL_NEXT_ID = 6

const initialPreferences = {
  brushConfig: {
    size: 36,
    color: '#ffffff',
  },
  fontFamily: undefined as string | undefined,
  providers: initialProviders,
  nextProviderId: INITIAL_NEXT_ID,
  providersConfigVersion: 0,
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...initialPreferences,

      setBrushConfig: (config) =>
        set((state) => ({
          brushConfig: { ...state.brushConfig, ...config },
        })),

      setFontFamily: (font) => set({ fontFamily: font }),

      addProvider: (type) => {
        const id = get().nextProviderId
        set((state) => ({
          providers: [...state.providers, makeDefaultProvider(id, type)],
          nextProviderId: id + 1,
          providersConfigVersion: state.providersConfigVersion + 1,
        }))
        return id
      },

      updateProvider: (id, patch) =>
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
          providersConfigVersion: state.providersConfigVersion + 1,
        })),

      removeProvider: (id) =>
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
          providersConfigVersion: state.providersConfigVersion + 1,
        })),

      resetPreferences: () => set({ ...initialPreferences }),
    }),
    {
      name: 'koharu-config',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          const providers: ProviderConfig[] = []
          let nextId = 1

          // Migrate OpenAI Compatible provider if it had a base URL configured
          const compatBaseUrl = (
            persisted?.providerBaseUrls?.openaiCompatible as string | undefined
          )?.trim()
          if (compatBaseUrl) {
            const compatModelName = (
              persisted?.providerModelNames?.openaiCompatible as
                | string
                | undefined
            )?.trim()
            providers.push(
              makeDefaultProvider(nextId++, 'openai-compatible', {
                baseUrl: compatBaseUrl,
                pinnedModels: compatModelName ? [compatModelName] : [],
              }),
            )
          }

          // Cloud providers (openai/gemini/claude/deepseek) are NOT
          // pre-created during migration — their API keys live in the OS
          // keyring and we can't check them synchronously. Users add the
          // providers they need via "Add Provider"; the keyring key will
          // auto-populate when they do.

          persisted.providers = providers
          persisted.nextProviderId = nextId

          // Clean up old fields
          delete persisted.localLlm
          delete persisted.apiKeys
          delete persisted.providerBaseUrls
          delete persisted.providerModelNames
          delete persisted.openAiCompatibleConfigVersion
        }

        return persisted
      },
      partialize: (state) => ({
        brushConfig: state.brushConfig,
        fontFamily: state.fontFamily,
        providers: state.providers,
        nextProviderId: state.nextProviderId,
      }),
    },
  ),
)
