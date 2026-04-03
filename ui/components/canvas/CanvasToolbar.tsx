'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  ScanIcon,
  ScanTextIcon,
  Wand2Icon,
  TypeIcon,
  LoaderCircleIcon,
  LanguagesIcon,
  CheckIcon,
  ChevronDownIcon,
  SearchIcon,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLlmUiStore } from '@/lib/stores/llmUiStore'
import {
  useLlmModelsQuery,
  useLlmReadyQuery,
  getProviderForModel,
  type LlmModelEntry,
} from '@/lib/query/hooks'
import { useDocumentMutations, useLlmMutations } from '@/lib/query/mutations'
import { useOperationStore } from '@/lib/stores/operationStore'
import { usePreferencesStore } from '@/lib/stores/preferencesStore'
import { getProviderDisplayName } from '@/lib/providers'

export function CanvasToolbar() {
  return (
    <div className='border-border/60 bg-card text-foreground flex items-center gap-2 border-b px-3 py-2 text-xs'>
      <WorkflowButtons />
      <div className='flex-1' />
      <LlmStatusPopover />
    </div>
  )
}

function WorkflowButtons() {
  const { inpaint, detect, ocr, render } = useDocumentMutations()
  const { llmGenerate } = useLlmMutations()
  const { data: llmReady = false } = useLlmReadyQuery()
  const [generating, setGenerating] = useState(false)
  const { t } = useTranslation()
  const operation = useOperationStore((state) => state.operation)

  const isDetecting =
    operation?.type === 'process-current' && operation?.step === 'detect'
  const isOcr =
    operation?.type === 'process-current' && operation?.step === 'ocr'
  const isInpainting =
    operation?.type === 'process-current' && operation?.step === 'inpaint'
  const isRendering =
    operation?.type === 'process-current' && operation?.step === 'render'

  const handleTranslate = async () => {
    setGenerating(true)
    try {
      await llmGenerate(null)
    } catch (error) {
      console.error(error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className='flex items-center gap-0.5'>
      <Button
        variant='ghost'
        size='xs'
        onClick={detect}
        data-testid='toolbar-detect'
        disabled={isDetecting}
      >
        {isDetecting ? (
          <LoaderCircleIcon className='size-4 animate-spin' />
        ) : (
          <ScanIcon className='size-4' />
        )}
        {t('processing.detect')}
      </Button>

      <Separator orientation='vertical' className='mx-0.5 h-4' />

      <Button
        variant='ghost'
        size='xs'
        onClick={ocr}
        data-testid='toolbar-ocr'
        disabled={isOcr}
      >
        {isOcr ? (
          <LoaderCircleIcon className='size-4 animate-spin' />
        ) : (
          <ScanTextIcon className='size-4' />
        )}
        {t('processing.ocr')}
      </Button>

      <Separator orientation='vertical' className='mx-0.5 h-4' />

      <Button
        variant='ghost'
        size='xs'
        onClick={handleTranslate}
        disabled={!llmReady || generating}
        data-testid='toolbar-translate'
      >
        {generating ? (
          <LoaderCircleIcon className='size-4 animate-spin' />
        ) : (
          <LanguagesIcon className='size-4' />
        )}
        {t('llm.generate')}
      </Button>

      <Separator orientation='vertical' className='mx-0.5 h-4' />

      <Button
        variant='ghost'
        size='xs'
        onClick={inpaint}
        data-testid='toolbar-inpaint'
        disabled={isInpainting}
      >
        {isInpainting ? (
          <LoaderCircleIcon className='size-4 animate-spin' />
        ) : (
          <Wand2Icon className='size-4' />
        )}
        {t('mask.inpaint')}
      </Button>

      <Separator orientation='vertical' className='mx-0.5 h-4' />

      <Button
        variant='ghost'
        size='xs'
        onClick={render}
        data-testid='toolbar-render'
        disabled={isRendering}
      >
        {isRendering ? (
          <LoaderCircleIcon className='size-4 animate-spin' />
        ) : (
          <TypeIcon className='size-4' />
        )}
        {t('llm.render')}
      </Button>
    </div>
  )
}

function ModelPickerList({
  models,
  selectedModel,
  onSelect,
  getModelBadge,
  getModelDisplayName,
}: {
  models: LlmModelEntry[]
  selectedModel?: string
  onSelect: (id: string) => void
  getModelBadge: (model: LlmModelEntry) => React.ReactNode
  getModelDisplayName: (model: LlmModelEntry) => string
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return models
    const q = search.toLowerCase()
    return models.filter((m) => m.id.toLowerCase().includes(q))
  }, [models, search])

  return (
    <div className='flex flex-col'>
      <div className='border-border flex items-center gap-1.5 border-b px-2.5 py-1.5'>
        <SearchIcon className='text-muted-foreground size-3.5 shrink-0' />
        <input
          ref={inputRef}
          type='text'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('llm.searchPlaceholder')}
          className='text-foreground placeholder:text-muted-foreground w-full bg-transparent py-0.5 text-xs outline-none'
        />
      </div>
      <div className='max-h-64 overflow-y-auto p-1'>
        {filtered.map((model, index) => (
          <button
            key={model.id}
            type='button'
            data-testid={`llm-model-option-${index}`}
            onClick={() => onSelect(model.id)}
            className={`flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs transition ${
              model.id === selectedModel
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
          >
            {getModelBadge(model)}
            <span className='truncate'>{getModelDisplayName(model)}</span>
            {model.id === selectedModel && (
              <CheckIcon className='ml-auto size-3 shrink-0' />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className='text-muted-foreground px-2 py-3 text-center text-xs'>
            {t('llm.noModelsFound')}
          </p>
        )}
      </div>
    </div>
  )
}

function LlmStatusPopover() {
  const { data: llmModels = [] } = useLlmModelsQuery()
  const llmSelectedModel = useLlmUiStore((state) => state.selectedModel)
  const llmSelectedLanguage = useLlmUiStore((state) => state.selectedLanguage)
  const llmLoading = useLlmUiStore((state) => state.loading)
  const { data: llmReady = false } = useLlmReadyQuery()
  const { llmSetSelectedModel, llmSetSelectedLanguage, llmToggleLoadUnload } =
    useLlmMutations()
  const { t } = useTranslation()
  const providers = usePreferencesStore((state) => state.providers)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)

  const selectedModelInfo = useMemo(
    () => llmModels.find((m) => m.id === llmSelectedModel),
    [llmModels, llmSelectedModel],
  )
  const isApiModel =
    selectedModelInfo?.source !== 'local' &&
    selectedModelInfo?.source !== undefined

  // Check if cloud API key is missing for the selected model
  const selectedProvider = useMemo(() => {
    if (!selectedModelInfo) return undefined
    return getProviderForModel(selectedModelInfo.id, selectedModelInfo.source)
  }, [selectedModelInfo])
  const apiKeyMissing =
    isApiModel &&
    selectedModelInfo?.source !== 'openai-compatible' &&
    !selectedProvider

  const activeLanguages = useMemo(
    () => selectedModelInfo?.languages ?? [],
    [selectedModelInfo],
  )

  useEffect(() => {
    if (llmModels.length === 0) return
    const hasCurrent = llmModels.some((model) => model.id === llmSelectedModel)
    const nextModel = hasCurrent ? llmSelectedModel : llmModels[0]?.id
    if (!nextModel) return
    const languages =
      llmModels.find((model) => model.id === nextModel)?.languages ?? []
    const nextLanguage =
      llmSelectedLanguage && languages.includes(llmSelectedLanguage)
        ? llmSelectedLanguage
        : languages[0]
    const currentState = useLlmUiStore.getState()
    if (
      currentState.selectedModel === nextModel &&
      currentState.selectedLanguage === nextLanguage
    ) {
      return
    }
    useLlmUiStore.setState((state) => ({
      selectedModel: nextModel,
      selectedLanguage: nextLanguage,
      loading: state.loading,
    }))
  }, [llmModels, llmSelectedLanguage, llmSelectedModel])

  /** Get the display name for the model, stripping the provider/id prefix. */
  const getModelDisplayName = (model: (typeof llmModels)[0]) => {
    if (
      model.source === 'openai-compatible' &&
      model.id.split(':').length >= 3
    ) {
      return model.id.split(':').slice(2).join(':')
    }
    if (model.id.includes(':')) {
      return model.id.split(':').slice(1).join(':')
    }
    return model.id
  }

  /** Get the badge label for a model based on its provider config. */
  const getModelBadge = (model: (typeof llmModels)[0]) => {
    if (model.source === 'local') {
      return (
        <span className='bg-muted text-muted-foreground shrink-0 rounded px-1 py-0.5 text-[10px] leading-none font-semibold whitespace-nowrap uppercase'>
          Local
        </span>
      )
    }
    const provider = model.originProviderId
      ? providers.find((p) => p.id === model.originProviderId)
      : providers.find((p) => p.type === model.source)
    const label = provider?.label ?? getProviderDisplayName(model.source)
    const isCompatible = model.source === 'openai-compatible'
    return (
      <span
        className={`shrink-0 rounded px-1 py-0.5 text-[10px] leading-none font-semibold whitespace-nowrap uppercase ${
          isCompatible
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {label}
      </span>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-testid='llm-trigger'
          data-llm-ready={llmReady ? 'true' : 'false'}
          data-llm-loading={llmLoading ? 'true' : 'false'}
          className={`flex h-6 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium shadow-sm transition hover:opacity-80 ${
            llmReady
              ? 'bg-rose-400 text-white ring-1 ring-rose-400/30'
              : 'bg-muted text-muted-foreground ring-border/50 ring-1'
          }`}
        >
          <motion.span
            className={`size-1.5 rounded-full ${
              llmReady ? 'bg-white' : 'bg-muted-foreground/40'
            }`}
            animate={llmReady ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
            transition={
              llmReady
                ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          />
          LLM
          {llmReady && selectedModelInfo && (
            <span className='max-w-[100px] truncate text-[10px] opacity-80'>
              {getModelDisplayName(selectedModelInfo)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-72' data-testid='llm-popover'>
        <div className='space-y-3 text-sm'>
          <p className='text-muted-foreground text-xs font-medium uppercase'>
            {t('panels.llm')}
          </p>

          <Popover open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
            <PopoverTrigger asChild>
              <button
                data-testid='llm-model-select'
                className="border-input [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-7 w-full items-center justify-between gap-1.5 rounded-md border bg-transparent px-2 py-1 text-xs whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
              >
                <span className='flex items-center gap-1.5 truncate'>
                  {llmSelectedModel && selectedModelInfo ? (
                    <>
                      {getModelBadge(selectedModelInfo)}
                      {getModelDisplayName(selectedModelInfo)}
                    </>
                  ) : (
                    <span className='text-muted-foreground'>
                      {t('llm.selectPlaceholder')}
                    </span>
                  )}
                </span>
                <ChevronDownIcon className='size-3.5 shrink-0 opacity-50' />
              </button>
            </PopoverTrigger>
            <PopoverContent align='start' className='w-72 p-0'>
              <ModelPickerList
                models={llmModels}
                selectedModel={llmSelectedModel}
                onSelect={(id) => {
                  llmSetSelectedModel(id)
                  setModelPickerOpen(false)
                }}
                getModelBadge={getModelBadge}
                getModelDisplayName={getModelDisplayName}
              />
            </PopoverContent>
          </Popover>

          {apiKeyMissing && (
            <p className='text-xs text-amber-500'>
              {t('llm.apiKeyMissing', {
                provider: getProviderDisplayName(selectedModelInfo!.source),
              })}
            </p>
          )}

          {llmReady &&
            selectedModelInfo &&
            (() => {
              const provider = selectedModelInfo.originProviderId
                ? providers.find(
                    (p) => p.id === selectedModelInfo.originProviderId,
                  )
                : undefined
              const modelName = getModelDisplayName(selectedModelInfo)
              const configParts: string[] = []
              if (provider?.temperature != null)
                configParts.push(`temp ${provider.temperature}`)
              if (provider?.maxTokens != null)
                configParts.push(`${provider.maxTokens} tokens`)
              return (
                <div className='rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2 text-xs'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5'>
                      <span className='size-1.5 rounded-full bg-emerald-500' />
                      <span className='font-medium text-emerald-700 dark:text-emerald-400'>
                        {t('llm.statusReady')}
                      </span>
                    </div>
                    {provider && (
                      <span className='text-muted-foreground text-[10px] uppercase'>
                        {provider.label}
                      </span>
                    )}
                  </div>
                  <p className='text-muted-foreground mt-1 truncate'>
                    {modelName}
                    {configParts.length > 0 && (
                      <span className='ml-1 opacity-60'>
                        · {configParts.join(' · ')}
                      </span>
                    )}
                  </p>
                </div>
              )
            })()}

          {activeLanguages.length > 0 && (
            <Select
              value={llmSelectedLanguage ?? activeLanguages[0]}
              onValueChange={llmSetSelectedLanguage}
            >
              <SelectTrigger
                data-testid='llm-language-select'
                className='w-full'
              >
                <SelectValue placeholder={t('llm.languagePlaceholder')} />
              </SelectTrigger>
              <SelectContent position='popper'>
                {activeLanguages.map((language, index) => (
                  <SelectItem
                    key={language}
                    value={language}
                    data-testid={`llm-language-option-${index}`}
                  >
                    {t(`llm.languages.${language}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            data-testid='llm-load-toggle'
            data-llm-ready={llmReady ? 'true' : 'false'}
            data-llm-loading={llmLoading ? 'true' : 'false'}
            variant='outline'
            size='sm'
            onClick={llmToggleLoadUnload}
            disabled={!llmSelectedModel || llmLoading}
            className='w-full gap-1.5 text-xs'
          >
            {llmLoading && (
              <LoaderCircleIcon className='size-3.5 animate-spin' />
            )}
            {!llmReady ? t('llm.load') : t('llm.unload')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
