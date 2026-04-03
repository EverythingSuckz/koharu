'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
  PlusIcon,
  XIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { isTauri } from '@/lib/backend'
import { api } from '@/lib/api'
import {
  usePreferencesStore,
  isCloudProvider,
  PROVIDER_DEFAULTS,
  type ProviderConfig,
  type ProviderType,
} from '@/lib/stores/preferencesStore'
import { supportedLanguages } from '@/lib/i18n'
import type { BootstrapConfig } from '@/lib/protocol'

const THEME_OPTIONS = [
  { value: 'light', icon: SunIcon, labelKey: 'settings.themeLight' },
  { value: 'dark', icon: MoonIcon, labelKey: 'settings.themeDark' },
  { value: 'system', icon: MonitorIcon, labelKey: 'settings.themeSystem' },
] as const

const ADD_PROVIDER_OPTIONS: {
  value: ProviderType
  labelKey: string
  descKey: string
}[] = [
  {
    value: 'openai',
    labelKey: 'settings.providerTypeOpenai',
    descKey: 'settings.providerTypeOpenaiDesc',
  },
  {
    value: 'gemini',
    labelKey: 'settings.providerTypeGemini',
    descKey: 'settings.providerTypeGeminiDesc',
  },
  {
    value: 'claude',
    labelKey: 'settings.providerTypeClaude',
    descKey: 'settings.providerTypeClaudeDesc',
  },
  {
    value: 'deepseek',
    labelKey: 'settings.providerTypeDeepseek',
    descKey: 'settings.providerTypeDeepseekDesc',
  },
  {
    value: 'ollama',
    labelKey: 'settings.providerTypeOllama',
    descKey: 'settings.providerTypeOllamaDesc',
  },
  {
    value: 'lmstudio',
    labelKey: 'settings.providerTypeLmstudio',
    descKey: 'settings.providerTypeLmstudioDesc',
  },
  {
    value: 'openai-compatible',
    labelKey: 'settings.providerTypeOpenaiCompatible',
    descKey: 'settings.providerTypeOpenaiCompatibleDesc',
  },
]

const DEFAULT_SYSTEM_PROMPT =
  'You are a professional manga translator. Translate Japanese manga dialogue into natural {target_language} that fits inside speech bubbles. Preserve character voice, emotional tone, relationship nuance, emphasis, and sound effects naturally. Keep the wording concise. Do not add notes, explanations, or romanization. If the input contains <block id="N">...</block>, translate only the text inside each block. Keep every block tag exactly unchanged, including ids, order, and block count. Do not merge blocks, split blocks, or add any text outside the blocks.'

const inputClass =
  'border-border bg-card text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-1.5 text-sm transition-colors focus:border-primary focus:outline-none'

function AdvancedModelConfig() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const llmTemperature = usePreferencesStore((s) => s.llmTemperature)
  const llmMaxTokens = usePreferencesStore((s) => s.llmMaxTokens)
  const llmCustomSystemPrompt = usePreferencesStore(
    (s) => s.llmCustomSystemPrompt,
  )
  const setLlmConfig = usePreferencesStore((s) => s.setLlmConfig)

  return (
    <section className='mb-8'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-sm font-bold transition'
      >
        <ChevronDownIcon
          className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
        {t('settings.advancedModelConfig')}
      </button>
      <p className='text-muted-foreground mt-1 mb-4 text-sm'>
        {t('settings.advancedModelConfigDescription')}
      </p>

      {open && (
        <div className='animate-in fade-in slide-in-from-top-1 space-y-4 duration-150'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <label className='text-foreground text-sm'>
                {t('settings.providerTemperature')}
              </label>
              <input
                type='number'
                value={llmTemperature ?? ''}
                onChange={(e) =>
                  setLlmConfig({
                    llmTemperature:
                      e.target.value === '' ? null : parseFloat(e.target.value),
                  })
                }
                placeholder={t('settings.providerTemperaturePlaceholder')}
                step={0.1}
                min={0}
                max={2}
                className={inputClass}
              />
            </div>

            <div className='space-y-1'>
              <label className='text-foreground text-sm'>
                {t('settings.providerMaxTokens')}
              </label>
              <input
                type='number'
                value={llmMaxTokens ?? ''}
                onChange={(e) =>
                  setLlmConfig({
                    llmMaxTokens:
                      e.target.value === ''
                        ? null
                        : parseInt(e.target.value, 10),
                  })
                }
                placeholder={t('settings.providerMaxTokensPlaceholder')}
                step={100}
                min={1}
                className={inputClass}
              />
            </div>
          </div>

          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <label className='text-foreground text-sm'>
                {t('settings.providerSystemPrompt')}
              </label>
              {llmCustomSystemPrompt && (
                <button
                  type='button'
                  onClick={() => setLlmConfig({ llmCustomSystemPrompt: '' })}
                  className='text-primary cursor-pointer text-xs hover:underline'
                >
                  {t('settings.providerSystemPromptReset')}
                </button>
              )}
            </div>
            <textarea
              value={llmCustomSystemPrompt}
              onChange={(e) =>
                setLlmConfig({ llmCustomSystemPrompt: e.target.value })
              }
              placeholder={DEFAULT_SYSTEM_PROMPT}
              rows={4}
              className={`${inputClass} resize-y`}
            />
            <span className='text-muted-foreground text-xs'>
              {t('settings.providerSystemPromptPlaceholder')}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}

function ProviderCard({
  provider,
  isOpen,
}: {
  provider: ProviderConfig
  isOpen: boolean
}) {
  const { t } = useTranslation()
  const updateProvider = usePreferencesStore((state) => state.updateProvider)
  const removeProvider = usePreferencesStore((state) => state.removeProvider)
  const cloud = isCloudProvider(provider.type)

  const [cloudApiKey, setCloudApiKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)

  const [pingState, setPingState] = useState<{
    loading: boolean
    result?: { ok: boolean; count: number; latency: number; error?: string }
  }>({ loading: false })
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [pinSearch, setPinSearch] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!cloud) return
    api
      .getApiKey(provider.type)
      .then((key) => {
        if (key) setCloudApiKey(key)
      })
      .catch(() => {})
  }, [cloud, provider.type])

  const persistCloudKey = useCallback(
    async (value: string) => {
      try {
        await api.setApiKey(provider.type, value)
      } catch (error) {
        console.error(`Failed to save API key for ${provider.type}`, error)
      }
    },
    [provider.type],
  )

  const handleCloudKeyChange = useCallback(
    (value: string) => {
      setCloudApiKey(value)
      pendingKeyRef.current = value
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (pendingKeyRef.current !== null) {
          void persistCloudKey(pendingKeyRef.current)
          pendingKeyRef.current = null
        }
      }, 300)
    },
    [persistCloudKey],
  )

  const flushCloudKey = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (pendingKeyRef.current !== null) {
      void persistCloudKey(pendingKeyRef.current)
      pendingKeyRef.current = null
    }
  }, [persistCloudKey])

  // Cleanup on unmount
  useEffect(() => () => flushCloudKey(), [flushCloudKey])

  const fetchModels = useCallback(async () => {
    if (!provider.baseUrl?.trim()) return
    setFetchingModels(true)
    try {
      const result = await api.llmPing(
        provider.baseUrl,
        provider.apiKey || undefined,
      )
      if (result.ok && result.models.length > 0) {
        setDiscoveredModels(result.models)
      }
    } catch {
      // silently fail for auto-fetch
    } finally {
      setFetchingModels(false)
    }
  }, [provider.baseUrl, provider.apiKey])

  // auto fetch models when accordion opens (self-hosted with baseUrl)
  const hasFetchedOnOpenRef = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      hasFetchedOnOpenRef.current = false
      return
    }
    if (cloud || !provider.baseUrl?.trim()) return
    if (hasFetchedOnOpenRef.current) return
    if (discoveredModels.length > 0) {
      hasFetchedOnOpenRef.current = true
      return
    }
    hasFetchedOnOpenRef.current = true
    void fetchModels()
  }, [isOpen, cloud, provider.baseUrl, fetchModels, discoveredModels.length])

  // re-fetch models when base URL changes (self-hosted, debounced)
  const autoFetchRef = useRef<string | null>(null)
  useEffect(() => {
    if (cloud || !provider.baseUrl?.trim()) return
    if (autoFetchRef.current === provider.baseUrl) return
    autoFetchRef.current = provider.baseUrl

    const timer = setTimeout(() => {
      void fetchModels()
    }, 800)
    return () => clearTimeout(timer)
  }, [cloud, provider.baseUrl, fetchModels])

  const handleTestConnection = async () => {
    setPingState({ loading: true })
    try {
      const result = await api.llmPing(
        provider.baseUrl,
        provider.apiKey || undefined,
      )
      if (result.ok) {
        setDiscoveredModels(result.models)
      }
      setPingState({
        loading: false,
        result: {
          ok: result.ok,
          count: result.models.length,
          latency: result.latencyMs ?? 0,
          error: result.error,
        },
      })
    } catch (error) {
      setPingState({
        loading: false,
        result: { ok: false, count: 0, latency: 0, error: String(error) },
      })
    }
  }

  const addPinnedModel = (modelName: string) => {
    if (!provider.pinnedModels.includes(modelName)) {
      updateProvider(provider.id, {
        pinnedModels: [...provider.pinnedModels, modelName],
      })
    }
  }

  const removePinnedModel = (modelName: string) => {
    setConfirmDialog({
      open: true,
      title: t('settings.removePinnedModelConfirm'),
      description: t('settings.removePinnedModelDescription', {
        model: modelName,
      }),
      onConfirm: () =>
        updateProvider(provider.id, {
          pinnedModels: provider.pinnedModels.filter((m) => m !== modelName),
        }),
    })
  }

  const filteredDiscoveredModels = pinSearch
    ? discoveredModels.filter((m) =>
        m.toLowerCase().includes(pinSearch.toLowerCase()),
      )
    : discoveredModels

  return (
    <div className='space-y-3'>
      <div className='space-y-1'>
        <label className='text-foreground text-sm'>
          {t('settings.providerLabel')}
        </label>
        <input
          type='text'
          value={provider.label}
          onChange={(e) =>
            updateProvider(provider.id, { label: e.target.value })
          }
          placeholder={PROVIDER_DEFAULTS[provider.type].label}
          className={inputClass}
        />
      </div>

      {!cloud && (
        <div className='space-y-1'>
          <label className='text-foreground text-sm'>
            {t('settings.providerBaseUrl')}
          </label>
          <input
            type='url'
            value={provider.baseUrl}
            onChange={(e) =>
              updateProvider(provider.id, { baseUrl: e.target.value })
            }
            placeholder={
              PROVIDER_DEFAULTS[provider.type].baseUrl ||
              'http://127.0.0.1:1234/v1'
            }
            className={inputClass}
          />
        </div>
      )}

      <div className='space-y-1'>
        <label className='text-foreground text-sm'>
          {cloud
            ? t('settings.providerApiKey')
            : t('settings.providerApiKeyOptional')}
        </label>
        <div className='relative'>
          <input
            type={keyVisible ? 'text' : 'password'}
            value={cloud ? cloudApiKey : provider.apiKey}
            onChange={(e) =>
              cloud
                ? handleCloudKeyChange(e.target.value)
                : updateProvider(provider.id, { apiKey: e.target.value })
            }
            onBlur={() => cloud && flushCloudKey()}
            placeholder='Enter API key'
            className={`${inputClass} pr-9`}
          />
          <button
            type='button'
            onClick={() => setKeyVisible((v) => !v)}
            className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer transition'
          >
            {keyVisible ? (
              <EyeOffIcon className='size-4' />
            ) : (
              <EyeIcon className='size-4' />
            )}
          </button>
        </div>
      </div>

      {!cloud && (
        <div className='space-y-2'>
          <button
            type='button'
            onClick={handleTestConnection}
            disabled={pingState.loading || !provider.baseUrl?.trim()}
            className='border-border bg-card text-foreground hover:bg-accent disabled:text-muted-foreground inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-1.5 text-sm font-medium transition disabled:cursor-default disabled:opacity-50'
          >
            {pingState.loading ? (
              <>
                <LoaderIcon className='size-4 animate-spin' />
                {t('settings.providerTesting')}
              </>
            ) : (
              t('settings.providerTestConnection')
            )}
          </button>

          {pingState.result && !pingState.loading && (
            <div
              className={`flex items-start gap-2 text-sm ${pingState.result.ok ? 'text-green-500' : 'text-red-500'}`}
            >
              {pingState.result.ok ? (
                <>
                  <CheckCircleIcon className='mt-0.5 size-4 shrink-0' />
                  <span>
                    {t('settings.providerTestSuccess', {
                      count: pingState.result.count,
                      latency: pingState.result.latency,
                    })}
                  </span>
                </>
              ) : (
                <>
                  <XCircleIcon className='mt-0.5 size-4 shrink-0' />
                  <span>
                    {t('settings.providerTestFailed', {
                      error: pingState.result.error,
                    })}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className='flex items-center justify-between'>
        <div>
          <div className='text-foreground text-sm'>
            {t('settings.providerShowAllModels')}
          </div>
          <div className='text-muted-foreground text-xs'>
            {t('settings.providerShowAllModelsDescription')}
          </div>
        </div>
        <Switch
          checked={provider.showAllModels}
          onCheckedChange={(checked) =>
            updateProvider(provider.id, { showAllModels: checked })
          }
        />
      </div>

      {!provider.showAllModels && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <label className='text-foreground text-sm'>
              {t('settings.providerPinnedModels')}
            </label>
            {!cloud && (
              <button
                type='button'
                onClick={fetchModels}
                disabled={fetchingModels || !provider.baseUrl?.trim()}
                className='text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-xs transition disabled:cursor-default disabled:opacity-50'
              >
                <RefreshCwIcon
                  className={`size-3 ${fetchingModels ? 'animate-spin' : ''}`}
                />
                {fetchingModels
                  ? t('settings.providerFetchingModels')
                  : t('settings.providerFetchModels')}
              </button>
            )}
          </div>

          {(discoveredModels.length > 0 || !cloud) && (
            <div className='space-y-1'>
              <input
                type='text'
                value={pinSearch}
                onChange={(e) => setPinSearch(e.target.value)}
                placeholder={t('settings.providerPinnedModelsSearch')}
                className={inputClass}
              />
              {fetchingModels && discoveredModels.length === 0 ? (
                <div className='border-border bg-card flex items-center gap-2 rounded-md border px-3 py-2'>
                  <LoaderIcon className='text-muted-foreground size-3.5 animate-spin' />
                  <span className='text-muted-foreground text-sm'>
                    {t('settings.providerFetchingModels')}
                  </span>
                </div>
              ) : filteredDiscoveredModels.length > 0 ? (
                <div className='border-border bg-card max-h-32 overflow-y-auto rounded-md border'>
                  {filteredDiscoveredModels.map((model) => (
                    <button
                      key={model}
                      type='button'
                      onClick={() => addPinnedModel(model)}
                      disabled={provider.pinnedModels.includes(model)}
                      className='text-foreground hover:bg-accent disabled:text-muted-foreground flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-sm transition disabled:cursor-default disabled:opacity-50'
                    >
                      <span className='truncate'>{model}</span>
                      {!provider.pinnedModels.includes(model) && (
                        <PlusIcon className='size-3.5 shrink-0' />
                      )}
                    </button>
                  ))}
                </div>
              ) : pinSearch && discoveredModels.length > 0 ? (
                <div className='border-border bg-card rounded-md border px-3 py-2'>
                  <span className='text-muted-foreground text-sm'>
                    {t('llm.noModelsFound')}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {provider.pinnedModels.length > 0 ? (
            <div className='flex flex-wrap gap-1.5'>
              {provider.pinnedModels.map((model) => (
                <span
                  key={model}
                  className='bg-muted text-foreground group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium'
                >
                  {model}
                  <button
                    type='button'
                    onClick={() => removePinnedModel(model)}
                    className='text-muted-foreground/50 cursor-pointer transition group-hover:text-red-500'
                    aria-label={`Remove ${model}`}
                  >
                    <XIcon className='size-3' />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className='text-muted-foreground text-xs'>
              {t('settings.providerPinnedModelsEmpty')}
            </p>
          )}
        </div>
      )}

      <div className='border-border border-t pt-3'>
        <button
          type='button'
          onClick={() =>
            setConfirmDialog({
              open: true,
              title: t('settings.removeProviderConfirm'),
              description: t('settings.removeProviderDescription'),
              onConfirm: () => removeProvider(provider.id),
            })
          }
          className='text-muted-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs transition hover:text-red-500'
        >
          <Trash2Icon className='size-3.5' />
          {t('settings.removeProvider')}
        </button>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      >
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size='sm'>
              {t('settings.confirmCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              size='sm'
              onClick={() => {
                confirmDialog.onConfirm()
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }}
            >
              {t('settings.confirmRemove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const locales = useMemo(
    () => Object.keys(i18n.options.resources || {}),
    [i18n.options.resources],
  )
  const [deviceInfo, setDeviceInfo] = useState<{ mlDevice: string }>()

  const providers = usePreferencesStore((state) => state.providers)
  const addProvider = usePreferencesStore((state) => state.addProvider)
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(
    undefined,
  )
  const [showAddCard, setShowAddCard] = useState(false)
  const [bootstrapConfig, setBootstrapConfig] =
    useState<BootstrapConfig | null>(null)
  const proxySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingBootstrapConfigRef = useRef<BootstrapConfig | null>(null)

  const persistBootstrapConfig = async (nextConfig: BootstrapConfig) => {
    try {
      const saved = await api.saveBootstrapConfig(nextConfig)
      setBootstrapConfig(saved)
    } catch (error) {
      console.error('Failed to save bootstrap config', error)
    }
  }

  const flushProxySave = () => {
    if (proxySaveTimerRef.current) {
      clearTimeout(proxySaveTimerRef.current)
      proxySaveTimerRef.current = null
    }
    const pending = pendingBootstrapConfigRef.current
    if (!pending) return
    pendingBootstrapConfigRef.current = null
    void persistBootstrapConfig(pending)
  }

  const handleProxyChange = (value: string) => {
    if (!bootstrapConfig) return
    const nextConfig: BootstrapConfig = {
      ...bootstrapConfig,
      http: { proxy: value.trim() ? value : null },
    }
    setBootstrapConfig(nextConfig)
    pendingBootstrapConfigRef.current = nextConfig
    if (proxySaveTimerRef.current) clearTimeout(proxySaveTimerRef.current)
    proxySaveTimerRef.current = setTimeout(() => {
      proxySaveTimerRef.current = null
      flushProxySave()
    }, 300)
  }

  const handleAddProvider = useCallback(
    (type: ProviderType) => {
      const newId = addProvider(type)
      setShowAddCard(false)
      setOpenAccordion(String(newId))
    },
    [addProvider],
  )

  useEffect(() => {
    if (!isTauri()) return
    const loadDeviceInfo = async () => {
      try {
        const info = await api.deviceInfo()
        setDeviceInfo(info)
      } catch (error) {
        console.error('Failed to load device info', error)
      }
    }
    void loadDeviceInfo()
  }, [])

  useEffect(() => {
    const loadBootstrapConfig = async () => {
      try {
        const config = await api.getBootstrapConfig()
        setBootstrapConfig(config)
      } catch (error) {
        console.error('Failed to load bootstrap config', error)
      }
    }
    void loadBootstrapConfig()
  }, [])

  useEffect(() => {
    return () => flushProxySave()
  }, [])

  return (
    <div className='bg-muted flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ScrollArea className='min-h-0 flex-1' viewportClassName='h-full'>
        <div className='min-h-full px-4 py-6'>
          {/* Content column */}
          <div className='relative mx-auto max-w-xl'>
            {/* Header with back button */}
            <div className='mb-8 flex items-center'>
              <Link
                href='/'
                prefetch={false}
                className='text-muted-foreground hover:bg-accent hover:text-foreground absolute -left-14 flex size-10 items-center justify-center rounded-full transition'
              >
                <ChevronLeftIcon className='size-6' />
              </Link>
              <h1 className='text-foreground text-2xl font-bold'>
                {t('settings.title')}
              </h1>
            </div>

            {/* Appearance Section */}
            <section className='mb-8'>
              <h2 className='text-foreground mb-1 text-sm font-bold'>
                {t('settings.appearance')}
              </h2>
              <p className='text-muted-foreground mb-4 text-sm'>
                {t('settings.appearanceDescription')}
              </p>

              <div className='space-y-3'>
                <div className='text-foreground text-sm'>
                  {t('settings.theme')}
                </div>
                <div className='flex gap-2'>
                  {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      data-active={theme === value}
                      className='border-border bg-card text-muted-foreground hover:border-foreground/30 data-[active=true]:border-primary data-[active=true]:text-foreground flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition'
                    >
                      <Icon className='size-5' />
                      <span className='text-xs font-medium'>{t(labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Language Section */}
            <section className='mb-8'>
              <h2 className='text-foreground mb-1 text-sm font-bold'>
                {t('settings.language')}
              </h2>
              <p className='text-muted-foreground mb-4 text-sm'>
                {t('settings.languageDescription')}
              </p>

              <Select
                value={i18n.language}
                onValueChange={(value) => i18n.changeLanguage(value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((code) => (
                    <SelectItem key={code} value={code}>
                      {t(`menu.languages.${code}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className='mb-8'>
              <h2 className='text-foreground mb-1 text-sm font-bold'>
                {t('settings.httpProxy')}
              </h2>
              <p className='text-muted-foreground mb-4 text-sm'>
                {t('settings.httpProxyDescription')}
              </p>

              <div className='space-y-1'>
                <label className='text-foreground text-sm'>
                  {t('bootstrap.proxyUrl')}
                </label>
                <input
                  type='url'
                  value={bootstrapConfig?.http.proxy ?? ''}
                  onChange={(e) => handleProxyChange(e.target.value)}
                  onBlur={flushProxySave}
                  placeholder={t('bootstrap.proxyUrlPlaceholder')}
                  disabled={!bootstrapConfig}
                  className={inputClass}
                />
              </div>
            </section>

            {/* Device Section */}
            {deviceInfo && (
              <section className='mb-8'>
                <h2 className='text-foreground mb-1 text-sm font-bold'>
                  {t('settings.device')}
                </h2>
                <p className='text-muted-foreground mb-4 text-sm'>
                  {t('settings.deviceDescription')}
                </p>

                <div className='bg-card border-border rounded-lg border p-4'>
                  <div className='space-y-3 text-sm'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>
                        {t('settings.deviceMl')}
                      </span>
                      <span className='text-foreground font-medium'>
                        {deviceInfo.mlDevice}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Providers Section */}
            <section className='mb-8'>
              <h2 className='text-foreground mb-1 text-sm font-bold'>
                {t('settings.providers')}
              </h2>
              <p className='text-muted-foreground mb-4 text-sm'>
                {t('settings.providersDescription')}
              </p>

              <Accordion
                type='single'
                collapsible
                className='w-full'
                value={openAccordion}
                onValueChange={setOpenAccordion}
              >
                {providers.map((provider) => (
                  <AccordionItem
                    key={provider.id}
                    value={String(provider.id)}
                    className='data-[state=open]:bg-card data-[state=open]:border-border transition-all data-[state=open]:-mx-3 data-[state=open]:mb-1 data-[state=open]:rounded-lg data-[state=open]:border data-[state=open]:px-3'
                  >
                    <AccordionTrigger className='hover:no-underline'>
                      <div className='flex flex-1 items-center gap-2'>
                        <span className='text-foreground text-sm font-medium'>
                          {provider.label}
                        </span>
                        <span className='text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium uppercase'>
                          {provider.type === 'openai-compatible'
                            ? 'Custom'
                            : provider.type}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ProviderCard
                        provider={provider}
                        isOpen={openAccordion === String(provider.id)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Add Provider */}
              <div className='mt-4'>
                {!showAddCard ? (
                  <button
                    type='button'
                    onClick={() => setShowAddCard(true)}
                    className='border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition'
                  >
                    <PlusIcon className='size-5' />
                    {t('settings.addProvider')}
                  </button>
                ) : (
                  <div className='border-border bg-card animate-in fade-in slide-in-from-top-2 rounded-lg border p-4 duration-200'>
                    <div className='mb-3 flex items-center justify-between'>
                      <h3 className='text-foreground text-sm font-semibold'>
                        {t('settings.addProviderPickType')}
                      </h3>
                      <button
                        type='button'
                        onClick={() => setShowAddCard(false)}
                        className='text-muted-foreground hover:text-foreground cursor-pointer transition'
                      >
                        <XIcon className='size-4' />
                      </button>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      {ADD_PROVIDER_OPTIONS.map(
                        ({ value, labelKey, descKey }) => (
                          <button
                            key={value}
                            type='button'
                            onClick={() => handleAddProvider(value)}
                            className='border-border bg-card text-muted-foreground hover:border-foreground/30 flex cursor-pointer flex-col items-start rounded-md border px-3 py-2.5 text-left transition'
                          >
                            <span className='text-foreground text-sm font-medium'>
                              {t(labelKey)}
                            </span>
                            <span className='text-muted-foreground text-xs'>
                              {t(descKey)}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Advanced Model Configuration */}
            <AdvancedModelConfig />

            {/* Divider */}
            <div className='border-border mb-8 border-t' />

            {/* About Link */}
            <Link
              href='/about'
              prefetch={false}
              className='hover:bg-accent flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition'
            >
              <span className='text-foreground text-sm font-medium'>
                {t('settings.about')}
              </span>
              <ChevronRightIcon className='text-muted-foreground size-5' />
            </Link>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
