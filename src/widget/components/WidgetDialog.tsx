import { FunctionComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { Crosshair, FileText, Image, X } from 'lucide-preact';
import type { SelectedElement } from '../capture/element-selection.js';
import { ScreenshotManager, CapturedMedia } from './ScreenshotManager.js';
import { Button, Input, Textarea, Select, Label, Tabs } from './ui';
import { ScreenCaptureConsentDialog } from './ScreenCaptureConsentDialog.js';
import { useLocale } from '../hooks/use-locale.js';
import { t } from '../i18n/index.js';
import type { ReportType } from '@shared/types';

export interface FormData {
  type?: ReportType;
  title: string;
  description: string;
  requestedChange?: string;
  expectedResult?: string;
  acceptanceCriteria?: string;
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  reporterEmail: string;
  reporterName: string;
}

interface WidgetDialogProps {
  onClose: () => void;
  onSubmit: (data: FormData, media: CapturedMedia[]) => void;
  onCaptureScreenshot: () => void;
  onAnnotateMedia: (id: string) => void;
  media: CapturedMedia[];
  onAddMedia: (item: CapturedMedia) => void;
  onRemoveMedia: (id: string) => void;
  isSubmitting: boolean;
  isCapturing: boolean;
  enableAnnotation: boolean;
  // Controlled state props (lifted to App for persistence across capture)
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  showScreenCaptureConsent: boolean;
  onConsentConfirm: () => void;
  onConsentCancel: () => void;
  maxImageSize?: number;
  maxVideoSize?: number;
  reduceScreenshotQuality: boolean;
  onReduceScreenshotQualityChange: (value: boolean) => void;
  oversizedCapture: { sizeMb: number; limitMb: number } | null;
  onDismissOversizedCapture: () => void;
  selectedElement?: SelectedElement | null;
  selectionError?: string | null;
  onSelectElement?: () => void;
  onClearSelectedElement?: () => void;
}

const TAB_ICONS = {
  details: <FileText />,
  media: <Image />,
};

export const WidgetDialog: FunctionComponent<WidgetDialogProps> = ({
  onClose,
  onSubmit,
  onCaptureScreenshot,
  onAnnotateMedia,
  media,
  onAddMedia,
  onRemoveMedia,
  isSubmitting,
  isCapturing,
  enableAnnotation,
  activeTab,
  onActiveTabChange,
  formData,
  onFormDataChange,
  showScreenCaptureConsent,
  onConsentConfirm,
  onConsentCancel,
  maxImageSize,
  maxVideoSize,
  reduceScreenshotQuality,
  onReduceScreenshotQualityChange,
  oversizedCapture,
  onDismissOversizedCapture,
  selectedElement,
  selectionError,
  onSelectElement = () => undefined,
  onClearSelectedElement = () => undefined,
}) => {
  useLocale();
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      onFormDataChange({ ...formData, [field]: value });
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [formData, onFormDataChange, errors]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('validation.title.required');
    } else if (formData.title.trim().length < 4) {
      newErrors.title = t('validation.title.minLength');
    }

    if (formData.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reporterEmail)) {
      newErrors.reporterEmail = t('validation.email.invalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    (e: Event) => {
      e.preventDefault();

      if (!validate()) {
        onActiveTabChange('details');
        return;
      }

      onSubmit(formData, media);
    },
    [formData, media, validate, onSubmit, onActiveTabChange]
  );

  const mediaCount = media.length;
  const tabs = [
    { id: 'details', label: t('dialog.tabs.details'), icon: TAB_ICONS.details },
    {
      id: 'media',
      label:
        mediaCount > 0
          ? t('dialog.tabs.mediaWithCount', { count: mediaCount })
          : t('dialog.tabs.media'),
      icon: TAB_ICONS.media,
    },
  ];

  return (
    <div class="fixed inset-0 z-[2147483646] bg-black/50 flex items-center justify-center p-5 animate-[fadeIn_0.2s_ease-out]">
      <div
        class="relative w-full max-w-3xl h-[770px] max-h-[calc(100vh-40px)] min-h-0 bg-background border border-solid border-border rounded shadow-lg overflow-hidden flex flex-col animate-[slideUp_0.2s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bugpin-title"
      >
        {/* Header */}
        <div class="shrink-0 flex items-center justify-between p-6 border-b border-solid border-border">
          <h1 id="bugpin-title">{t('dialog.title')}</h1>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('aria.close')}>
            <X class="w-5 h-5" />
          </Button>
        </div>

        {showScreenCaptureConsent ? (
          <ScreenCaptureConsentDialog onConfirm={onConsentConfirm} onCancel={onConsentCancel} />
        ) : (
          <>
            {/* Tabs */}
            <div class="shrink-0 p-4 pb-0 bg-transparent">
              <Tabs tabs={tabs} activeTab={activeTab} onTabChange={onActiveTabChange} />
            </div>

            {/* Body */}
            <div class="flex-auto min-h-0 flex flex-col">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <form
                  class="flex-auto min-h-0 overflow-y-auto p-6 flex flex-col gap-4"
                  onSubmit={handleSubmit}
                >
                  <div class="flex flex-col gap-1.5">
                    <Label for="bugpin-type">Report type</Label>
                    <Select id="bugpin-type" value={formData.type ?? 'bug'} onChange={(e) => handleInputChange('type', (e.target as HTMLSelectElement).value)}>
                      <option value="bug">Bug</option><option value="ui">UI issue</option>
                      <option value="improvement">Improvement</option><option value="feature">Feature</option>
                    </Select>
                  </div>
                  {/* Title */}
                  <div class="flex flex-col gap-1.5">
                    <Label for="bugpin-title-input" required>
                      {t('dialog.fields.title.label')}
                    </Label>
                    <Input
                      id="bugpin-title-input"
                      type="text"
                      placeholder={t('dialog.fields.title.placeholder')}
                      value={formData.title}
                      onInput={(e) =>
                        handleInputChange('title', (e.target as HTMLInputElement).value)
                      }
                      maxLength={200}
                      error={!!errors.title}
                      aria-describedby={errors.title ? 'bugpin-title-error' : undefined}
                    />
                    {errors.title && (
                      <span id="bugpin-title-error" class="text-destructive text-xs mt-0.5">
                        {errors.title}
                      </span>
                    )}
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <Label for="bugpin-expected-result">{formData.type === 'bug' ? 'Expected result' : 'Desired outcome'}</Label>
                    <Textarea id="bugpin-expected-result" value={formData.expectedResult ?? ''} onInput={(e) => handleInputChange('expectedResult', (e.target as HTMLTextAreaElement).value)} />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <Label for="bugpin-acceptance-criteria">Acceptance criteria</Label>
                    <Textarea id="bugpin-acceptance-criteria" value={formData.acceptanceCriteria ?? ''} onInput={(e) => handleInputChange('acceptanceCriteria', (e.target as HTMLTextAreaElement).value)} />
                  </div>

                  <div class="flex flex-col gap-2">
                    <Label>Page element (optional)</Label>
                    {selectedElement && <details class="text-xs rounded border border-solid border-border p-2">
                      <summary class="cursor-pointer"><code>{selectedElement.selector}</code></summary>
                      <div class="mt-2">{selectedElement.tagName}{selectedElement.id ? `#${selectedElement.id}` : ''} · {Math.round(selectedElement.rect.x)}, {Math.round(selectedElement.rect.y)} · {Math.round(selectedElement.rect.width)}×{Math.round(selectedElement.rect.height)}</div>
                      {selectedElement.text && <pre class="mt-2 whitespace-pre-wrap break-words max-h-24 overflow-auto">{selectedElement.text}</pre>}
                      <pre class="mt-2 whitespace-pre-wrap break-all max-h-32 overflow-auto">{selectedElement.html}</pre>
                      <button type="button" class="mt-2 underline" onClick={onClearSelectedElement}>Clear selected element</button>
                    </details>}
                    {selectionError && <span role="alert" class="text-destructive text-xs">{selectionError}</span>}
                    <Button type="button" variant="outline" data-bugpin-select-element="true" onClick={onSelectElement}><Crosshair class="w-4 h-4" />{selectedElement ? 'Reselect element' : 'Select page element'}</Button>
                  </div>

                  {/* Description */}
                  <div class="flex flex-col gap-1.5">
                    <Label for="bugpin-description">{(formData.type ?? 'bug') === 'bug' ? 'Steps to reproduce' : 'Requested change'}</Label>
                    <Textarea
                      id="bugpin-description"
                      placeholder={t('dialog.fields.description.placeholder')}
                      value={formData.description}
                      onInput={(e) =>
                        handleInputChange('description', (e.target as HTMLTextAreaElement).value)
                      }
                    />
                  </div>

                  {/* Priority */}
                  <div class="flex flex-col gap-1.5">
                    <Label for="bugpin-priority">{t('dialog.fields.priority.label')}</Label>
                    <Select
                      id="bugpin-priority"
                      value={formData.priority}
                      onChange={(e) =>
                        handleInputChange('priority', (e.target as HTMLSelectElement).value)
                      }
                    >
                      <option value="highest">{t('dialog.priority.highest')}</option>
                      <option value="high">{t('dialog.priority.high')}</option>
                      <option value="medium">{t('dialog.priority.medium')}</option>
                      <option value="low">{t('dialog.priority.low')}</option>
                      <option value="lowest">{t('dialog.priority.lowest')}</option>
                    </Select>
                  </div>

                  {/* Name */}
                  <div class="flex flex-col gap-1.5">
                    <Label for="bugpin-name">{t('dialog.fields.name.label')}</Label>
                    <Input
                      id="bugpin-name"
                      type="text"
                      placeholder={t('dialog.fields.name.placeholder')}
                      value={formData.reporterName}
                      onInput={(e) =>
                        handleInputChange('reporterName', (e.target as HTMLInputElement).value)
                      }
                    />
                  </div>

                  {/* Email */}
                  <div class="flex flex-col gap-1.5">
                    <Label for="bugpin-email">{t('dialog.fields.email.label')}</Label>
                    <Input
                      id="bugpin-email"
                      type="email"
                      placeholder={t('dialog.fields.email.placeholder')}
                      value={formData.reporterEmail}
                      onInput={(e) =>
                        handleInputChange('reporterEmail', (e.target as HTMLInputElement).value)
                      }
                      error={!!errors.reporterEmail}
                      aria-describedby={errors.reporterEmail ? 'bugpin-email-error' : undefined}
                    />
                    {errors.reporterEmail && (
                      <span id="bugpin-email-error" class="text-destructive text-xs mt-0.5">
                        {errors.reporterEmail}
                      </span>
                    )}
                  </div>
                </form>
              )}

              {/* Media Tab */}
              {activeTab === 'media' && (
                <ScreenshotManager
                  media={media}
                  onCapture={onCaptureScreenshot}
                  onUpload={onAddMedia}
                  onRemove={onRemoveMedia}
                  onAnnotate={onAnnotateMedia}
                  isCapturing={isCapturing}
                  enableAnnotation={enableAnnotation}
                  maxImageSize={maxImageSize}
                  maxVideoSize={maxVideoSize}
                  reduceQuality={reduceScreenshotQuality}
                  onReduceQualityChange={onReduceScreenshotQualityChange}
                  oversizedCapture={oversizedCapture}
                  onDismissOversizedCapture={onDismissOversizedCapture}
                />
              )}
            </div>

            {/* Footer */}
            <div class="shrink-0 flex gap-3 p-6 border-t border-solid border-border bg-muted">
              <Button variant="outline" class="flex-1" onClick={onClose} disabled={isSubmitting}>
                {t('dialog.buttons.cancel')}
              </Button>
              <Button class="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span class="w-4 h-4 border-2 border-solid border-white/30 border-t-white rounded-full animate-[spin_0.8s_linear_infinite]" />
                ) : (
                  t('dialog.buttons.submit')
                )}
              </Button>
            </div>
          </>
        )}

        {/* Branding */}
        <div class="shrink-0 py-3 px-6 text-center text-xs text-muted-foreground border-t border-solid border-border bg-background">
          {t('dialog.branding.poweredBy')}{' '}
          <a
            href="https://bugpin.io"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary no-underline font-medium hover:underline hover:text-primary-hover"
          >
            BugPin
          </a>
        </div>
      </div>
    </div>
  );
};
