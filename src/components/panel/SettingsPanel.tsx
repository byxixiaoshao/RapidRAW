import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Cloud,
  Cpu,
  ExternalLink as ExternalLinkIcon,
  Server,
  Info,
  Trash2,
  Wifi,
  WifiOff,
  Plus,
  X,
  SlidersHorizontal,
  Keyboard,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { open as openLink } from '@tauri-apps/plugin-shell';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useUser } from '@clerk/clerk-react';
import Button from '../ui/Button';
import ConfirmModal from '../modals/ConfirmModal';
import Dropdown, { OptionItem } from '../ui/Dropdown';
import Switch from '../ui/Switch';
import Input from '../ui/Input';
import Slider from '../ui/Slider';
import { ThemeProps, THEMES, DEFAULT_THEME_ID } from '../../utils/themes';
import { Invokes } from '../ui/AppProperties';

interface ConfirmModalState {
  confirmText: string;
  confirmVariant: string;
  isOpen: boolean;
  message: string;
  onConfirm(): void;
  title: string;
}

interface DataActionItemProps {
  buttonAction(): void;
  buttonText: string;
  description: any;
  disabled?: boolean;
  icon: any;
  isProcessing: boolean;
  message: string;
  title: string;
  t: any;
}

interface KeybindItemProps {
  description: string;
  keys: Array<string>;
}

interface SettingItemProps {
  children: any;
  description?: string;
  label: string;
}

interface SettingsPanelProps {
  appSettings: any;
  onBack(): void;
  onLibraryRefresh(): void;
  onSettingsChange(settings: any): void;
  rootPath: string | null;
}

interface TestStatus {
  message: string;
  success: boolean | null;
  testing: boolean;
}

const EXECUTE_TIMEOUT = 3000;

const adjustmentVisibilityDefaults = {
  sharpening: true,
  presence: true,
  noiseReduction: true,
  chromaticAberration: false,
  negativeConversion: false,
  vignette: true,
  colorCalibration: false,
  grain: true,
};

const resolutions: Array<OptionItem> = [
  { value: 720, label: '720px' },
  { value: 1280, label: '1280px' },
  { value: 1920, label: '1920px' },
  { value: 2560, label: '2560px' },
  { value: 3840, label: '3840px' },
];

const backendOptions: OptionItem[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'vulkan', label: 'Vulkan' },
  { value: 'dx12', label: 'DirectX 12' },
  { value: 'metal', label: 'Metal' },
  { value: 'gl', label: 'OpenGL' },
];



const KeybindItem = ({ keys, description }: KeybindItemProps) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-text-secondary text-sm">{description}</span>
    <div className="flex items-center gap-1">
      {keys.map((key: string, index: number) => (
        <kbd
          key={index}
          className="px-2 py-1 text-xs font-sans font-semibold text-text-primary bg-bg-primary border border-border-color rounded-md"
        >
          {key}
        </kbd>
      ))}
    </div>
  </div>
);

const SettingItem = ({ children, description, label }: SettingItemProps) => (
  <div>
    <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
    {children}
    {description && <p className="text-xs text-text-secondary mt-2">{description}</p>}
  </div>
);

const DataActionItem = ({
  buttonAction,
  buttonText,
  description,
  disabled = false,
  icon,
  isProcessing,
  message,
  title,
  t,
}: DataActionItemProps) => (
  <div className="pb-6 border-b border-border-color last:border-b-0 last:pb-0">
    <h3 className="text-sm font-medium text-text-primary mb-2">{title}</h3>
    <p className="text-xs text-text-secondary mb-3">{description}</p>
    <Button variant="destructive" onClick={buttonAction} disabled={isProcessing || disabled}>
      {icon}
      {isProcessing ? t('settings.processing') : buttonText}
    </Button>
    {message && <p className="text-sm text-accent mt-3">{message}</p>}
  </div>
);

const ExternalLink = ({ href, children, className }: { href: string; children: any; className?: string }) => {
  const handleClick = async (e: any) => {
    e.preventDefault();
    try {
      await openLink(href);
    } catch (err) {
      console.error(`Failed to open link: ${href}`, err);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={clsx('text-accent hover:underline inline-flex items-center gap-1', className)}
    >
      {children}
      <ExternalLinkIcon size={12} />
    </a>
  );
};

const aiProviders = [
  { id: 'cpu', label: 'CPU', icon: Cpu },
  { id: 'ai-connector', label: 'AI Connector', icon: Server },
  { id: 'cloud', label: 'Cloud', icon: Cloud },
];

interface AiProviderSwitchProps {
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
}

const AiProviderSwitch = ({ selectedProvider, onProviderChange }: AiProviderSwitchProps) => {
  return (
    <div className="relative flex w-full p-1 bg-bg-primary rounded-md border border-border-color">
      {aiProviders.map((provider) => (
        <button
          key={provider.id}
          onClick={() => onProviderChange(provider.id)}
          className={clsx(
            'relative flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            {
              'text-text-primary hover:bg-surface': selectedProvider !== provider.id,
              'text-button-text': selectedProvider === provider.id,
            },
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {selectedProvider === provider.id && (
            <motion.span
              layoutId="ai-provider-switch-bubble"
              className="absolute inset-0 z-0 bg-accent"
              style={{ borderRadius: 6 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center">
            <provider.icon size={16} className="mr-2" />
            {provider.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default function SettingsPanel({
  appSettings,
  onBack,
  onLibraryRefresh,
  onSettingsChange,
  rootPath,
}: SettingsPanelProps) {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearMessage, setCacheClearMessage] = useState('');
  const [isClearingAiTags, setIsClearingAiTags] = useState(false);
  const [aiTagsClearMessage, setAiTagsClearMessage] = useState('');
  const [isClearingTags, setIsClearingTags] = useState(false);
  const [tagsClearMessage, setTagsClearMessage] = useState('');
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>({
    confirmText: 'Confirm',
    confirmVariant: 'primary',
    isOpen: false,
    message: '',
    onConfirm: () => {},
    title: '',
  });
  const [testStatus, setTestStatus] = useState<TestStatus>({ message: '', success: null, testing: false });
  const [hasInteractedWithLivePreview, setHasInteractedWithLivePreview] = useState(false);

  const settingCategories = [
    { id: 'general', label: t('settings.tabs.general'), icon: SlidersHorizontal },
    { id: 'processing', label: t('settings.tabs.processing'), icon: Cpu },
    { id: 'shortcuts', label: t('settings.tabs.shortcuts'), icon: Keyboard },
  ];

  const [aiProvider, setAiProvider] = useState(appSettings?.aiProvider || 'cpu');
  const [aiConnectorAddress, setAiConnectorAddress] = useState<string>(appSettings?.aiConnectorAddress || '');
  const [newShortcut, setNewShortcut] = useState('');

  const [processingSettings, setProcessingSettings] = useState({
    editorPreviewResolution: appSettings?.editorPreviewResolution || 1920,
    rawHighlightCompression: appSettings?.rawHighlightCompression ?? 2.5,
    processingBackend: appSettings?.processingBackend || 'auto',
    linuxGpuOptimization: appSettings?.linuxGpuOptimization ?? false,
  });
  const [restartRequired, setRestartRequired] = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');
  const [logPath, setLogPath] = useState('');

  useEffect(() => {
    if (appSettings?.aiConnectorAddress !== aiConnectorAddress) {
      setAiConnectorAddress(appSettings?.aiConnectorAddress || '');
    }
    if (appSettings?.aiProvider !== aiProvider) {
      setAiProvider(appSettings?.aiProvider || 'cpu');
    }
    setProcessingSettings({
      editorPreviewResolution: appSettings?.editorPreviewResolution || 1920,
      rawHighlightCompression: appSettings?.rawHighlightCompression ?? 2.5,
      processingBackend: appSettings?.processingBackend || 'auto',
      linuxGpuOptimization: appSettings?.linuxGpuOptimization ?? false,
    });
    setRestartRequired(false);
  }, [appSettings]);

  useEffect(() => {
    const fetchLogPath = async () => {
      try {
        const path: string = await invoke(Invokes.GetLogFilePath);
        setLogPath(path);
      } catch (error) {
        console.error('Failed to get log file path:', error);
        setLogPath('Could not retrieve log file path.');
      }
    };
    fetchLogPath();
  }, []);

  const handleProcessingSettingChange = (key: string, value: any) => {
    setProcessingSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'processingBackend' || key === 'linuxGpuOptimization') {
      setRestartRequired(true);
    } else {
      onSettingsChange({ ...appSettings, [key]: value });
    }
  };

  const handleSaveAndRelaunch = async () => {
    onSettingsChange({
      ...appSettings,
      ...processingSettings,
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await relaunch();
  };

  const handleProviderChange = (provider: string) => {
    setAiProvider(provider);
    onSettingsChange({ ...appSettings, aiProvider: provider });
  };

  const effectiveRootPath = rootPath || appSettings?.lastRootPath;

  const executeClearSidecars = async () => {
    setIsClearing(true);
    setClearMessage('Deleting sidecar files, please wait...');
    try {
      const count: number = await invoke(Invokes.ClearAllSidecars, { rootPath: effectiveRootPath });
      setClearMessage(`${count} sidecar files deleted successfully.`);
      onLibraryRefresh();
    } catch (err: any) {
      console.error('Failed to clear sidecars:', err);
      setClearMessage(`Error: ${err}`);
    } finally {
      setTimeout(() => {
        setIsClearing(false);
        setClearMessage('');
      }, EXECUTE_TIMEOUT);
    }
  };

  const handleClearSidecars = () => {
    setConfirmModalState({
      confirmText: t('settings.dataActions.clearSidecars'),
      confirmVariant: 'destructive',
      isOpen: true,
      message: t('settings.dataActions.clearSidecarsMessage'),
      onConfirm: executeClearSidecars,
      title: t('settings.dataActions.clearSidecarsTitle'),
    });
  };

  const executeClearAiTags = async () => {
    setIsClearingAiTags(true);
    setAiTagsClearMessage('Clearing AI tags from all sidecar files...');
    try {
      const count: number = await invoke(Invokes.ClearAiTags, { rootPath: effectiveRootPath });
      setAiTagsClearMessage(`${count} files updated. AI tags removed.`);
      onLibraryRefresh();
    } catch (err: any) {
      console.error('Failed to clear AI tags:', err);
      setAiTagsClearMessage(`Error: ${err}`);
    } finally {
      setTimeout(() => {
        setIsClearingAiTags(false);
        setAiTagsClearMessage('');
      }, EXECUTE_TIMEOUT);
    }
  };

  const handleClearAiTags = () => {
    setConfirmModalState({
      confirmText: t('settings.dataActions.clearAiTags'),
      confirmVariant: 'destructive',
      isOpen: true,
      message: t('settings.dataActions.clearAiTagsMessage'),
      onConfirm: executeClearAiTags,
      title: t('settings.dataActions.clearAiTagsTitle'),
    });
  };

  const executeClearTags = async () => {
    setIsClearingTags(true);
    setTagsClearMessage('Clearing all tags from sidecar files...');
    try {
      const count: number = await invoke(Invokes.ClearAllTags, { rootPath: effectiveRootPath });
      setTagsClearMessage(`${count} files updated. All non-color tags removed.`);
      onLibraryRefresh();
    } catch (err: any) {
      console.error('Failed to clear tags:', err);
      setTagsClearMessage(`Error: ${err}`);
    } finally {
      setTimeout(() => {
        setIsClearingTags(false);
        setTagsClearMessage('');
      }, EXECUTE_TIMEOUT);
    }
  };

  const handleClearTags = () => {
    setConfirmModalState({
      confirmText: t('settings.dataActions.clearAllTags'),
      confirmVariant: 'destructive',
      isOpen: true,
      message: t('settings.dataActions.clearAllTagsMessage'),
      onConfirm: executeClearTags,
      title: t('settings.dataActions.clearAllTagsTitle'),
    });
  };

  const shortcutTagVariants = {
    visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 500, damping: 30 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
  };

  const executeSetTransparent = async (transparent: boolean) => {
    onSettingsChange({ ...appSettings, transparent });
    await relaunch();
  };

  const handleSetTransparent = (transparent: boolean) => {
    setConfirmModalState({
      confirmText: t('settings.transparency.toggle'),
      confirmVariant: 'primary',
      isOpen: true,
      message: transparent ? t('settings.transparency.enableMessage') : t('settings.transparency.disableMessage'),
      onConfirm: () => executeSetTransparent(transparent),
      title: t('settings.transparency.confirm'),
    });
  };

  const executeClearCache = async () => {
    setIsClearingCache(true);
    setCacheClearMessage('Clearing thumbnail cache...');
    try {
      await invoke(Invokes.ClearThumbnailCache);
      setCacheClearMessage('Thumbnail cache cleared successfully.');
      onLibraryRefresh();
    } catch (err: any) {
      console.error('Failed to clear thumbnail cache:', err);
      setCacheClearMessage(`Error: ${err}`);
    } finally {
      setTimeout(() => {
        setIsClearingCache(false);
        setCacheClearMessage('');
      }, EXECUTE_TIMEOUT);
    }
  };

  const handleClearCache = () => {
    setConfirmModalState({
      confirmText: t('settings.dataActions.clearCache'),
      confirmVariant: 'destructive',
      isOpen: true,
      message: t('settings.dataActions.clearCacheMessage'),
      onConfirm: executeClearCache,
      title: t('settings.dataActions.clearCacheTitle'),
    });
  };

  const handleTestConnection = async () => {
    if (!aiConnectorAddress) {
      return;
    }
    setTestStatus({ testing: true, message: t('settings.ai.testing'), success: null });
    try {
      await invoke(Invokes.TestAIConnectorConnection, { address: aiConnectorAddress });
      setTestStatus({ testing: false, message: t('settings.ai.connectionSuccess'), success: true });
    } catch (err) {
      setTestStatus({ testing: false, message: t('settings.ai.connectionFailed'), success: false });
      console.error('AI Connector connection test failed:', err);
    } finally {
      setTimeout(() => setTestStatus({ testing: false, message: '', success: null }), EXECUTE_TIMEOUT);
    }
  };

  const closeConfirmModal = () => {
    setConfirmModalState({ ...confirmModalState, isOpen: false });
  };

  const handleAddShortcut = () => {
    const shortcuts = appSettings?.taggingShortcuts || [];
    const newTag = newShortcut.trim().toLowerCase();
    if (newTag && !shortcuts.includes(newTag)) {
      const newShortcuts = [...shortcuts, newTag].sort();
      onSettingsChange({ ...appSettings, taggingShortcuts: newShortcuts });
      setNewShortcut('');
    }
  };

  const handleRemoveShortcut = (shortcutToRemove: string) => {
    const shortcuts = appSettings?.taggingShortcuts || [];
    const newShortcuts = shortcuts.filter((s: string) => s !== shortcutToRemove);
    onSettingsChange({ ...appSettings, taggingShortcuts: newShortcuts });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddShortcut();
    }
  };

  return (
    <>
      <ConfirmModal {...confirmModalState} onClose={closeConfirmModal} />
      <div className="flex flex-col h-full w-full text-text-primary">
        <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-y-4 mb-8 pt-4">
          <div className="flex items-center flex-shrink-0">
            <Button
              className="mr-4 hover:bg-surface text-text-primary rounded-full"
              onClick={onBack}
              size="icon"
              variant="ghost"
            >
              <ArrowLeft />
            </Button>
            <h1 className="text-3xl font-bold text-accent whitespace-nowrap">{t('settings.title')}</h1>
          </div>

          <div className="relative flex w-full min-[1200px]:w-[450px] p-2 bg-surface rounded-md">
            {settingCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={clsx(
                  'relative flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  {
                    'text-text-primary hover:bg-surface': activeCategory !== category.id,
                    'text-button-text': activeCategory === category.id,
                  },
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {activeCategory === category.id && (
                  <motion.span
                    layoutId="settings-category-switch-bubble"
                    className="absolute inset-0 z-0 bg-accent"
                    style={{ borderRadius: 6 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center">
                  <category.icon size={16} className="mr-2 flex-shrink-0" />
                  <span className="truncate">{category.label}</span>
                </span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeCategory === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <h2 className="text-xl font-semibold mb-6 text-accent">{t('settings.title')}</h2>
                  <div className="space-y-6">
                    <SettingItem label={t('settings.theme.label')} description={t('settings.theme.description')}>
                      <Dropdown
                        onChange={(value: any) => onSettingsChange({ ...appSettings, theme: value })}
                        options={THEMES.map((theme: ThemeProps) => ({ value: theme.id, label: theme.name }))}
                        value={appSettings?.theme || DEFAULT_THEME_ID}
                      />
                    </SettingItem>

                    <SettingItem
                      description={t('settings.editorTheme.description')}
                      label={t('settings.editorTheme.label')}
                    >
                      <Switch
                        checked={appSettings?.adaptiveEditorTheme ?? false}
                        id="adaptive-theme-toggle"
                        label={t('settings.editorTheme.adaptive')}
                        onChange={(checked) => onSettingsChange({ ...appSettings, adaptiveEditorTheme: checked })}
                      />
                    </SettingItem>

                    <SettingItem label={t('settings.exif.label')} description={t('settings.exif.description')}>
                      <Switch
                        checked={appSettings?.enableExifReading ?? false}
                        id="exif-reading-toggle"
                        label={t('settings.exif.reading')}
                        onChange={(checked) => onSettingsChange({ ...appSettings, enableExifReading: checked })}
                      />
                    </SettingItem>

                    <SettingItem
                      description={t('settings.transparency.description')}
                      label={t('settings.transparency.windowEffects')}
                    >
                      <Switch
                        checked={appSettings?.transparent ?? true}
                        id="window-effects-toggle"
                        label={t('settings.transparency.label')}
                        onChange={handleSetTransparent}
                      />
                    </SettingItem>

                    <SettingItem
                      description="Change the application language."
                      label={t('settings.language')}
                    >
                      <Dropdown
                        onChange={(value: any) => {
                          i18n.changeLanguage(value);
                          onSettingsChange({ ...appSettings, language: value });
                        }}
                        options={[
                          { value: 'en', label: 'English' },
                          { value: 'zh', label: '中文' }
                        ]}
                        value={appSettings?.language || i18n.language}
                      />
                    </SettingItem>
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <h2 className="text-xl font-semibold mb-6 text-accent">{t('settings.adjustmentsVisibility.title')}</h2>
                  <p className="text-sm text-text-secondary mb-4">
                    {t('settings.adjustmentsVisibility.description')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Switch
                      label={t('settings.adjustmentsVisibility.chromaticAberration')}
                      checked={appSettings?.adjustmentVisibility?.chromaticAberration ?? false}
                      onChange={(checked) =>
                        onSettingsChange({
                          ...appSettings,
                          adjustmentVisibility: {
                            ...(appSettings?.adjustmentVisibility || adjustmentVisibilityDefaults),
                            chromaticAberration: checked,
                          },
                        })
                      }
                    />
                    <Switch
                      label={t('settings.adjustmentsVisibility.grain')}
                      checked={appSettings?.adjustmentVisibility?.grain ?? true}
                      onChange={(checked) =>
                        onSettingsChange({
                          ...appSettings,
                          adjustmentVisibility: {
                            ...(appSettings?.adjustmentVisibility || adjustmentVisibilityDefaults),
                            grain: checked,
                          },
                        })
                      }
                    />
                    <Switch
                      label={t('settings.adjustmentsVisibility.colorCalibration')}
                      checked={appSettings?.adjustmentVisibility?.colorCalibration ?? true}
                      onChange={(checked) =>
                        onSettingsChange({
                          ...appSettings,
                          adjustmentVisibility: {
                            ...(appSettings?.adjustmentVisibility || adjustmentVisibilityDefaults),
                            colorCalibration: checked,
                          },
                        })
                      }
                    />
                    <Switch
                      label={t('settings.adjustmentsVisibility.negativeConversion')}
                      checked={appSettings?.adjustmentVisibility?.negativeConversion ?? false}
                      onChange={(checked) =>
                        onSettingsChange({
                          ...appSettings,
                          adjustmentVisibility: {
                            ...(appSettings?.adjustmentVisibility || adjustmentVisibilityDefaults),
                            negativeConversion: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <h2 className="text-xl font-semibold mb-6 text-accent">{t('settings.tagging.title')}</h2>
                  <div className="space-y-6">
                    <SettingItem
                      description={t('settings.tagging.automaticAiTaggingDescription')}
                      label={t('settings.tagging.aiTagging')}
                    >
                      <Switch
                        checked={appSettings?.enableAiTagging ?? false}
                        id="ai-tagging-toggle"
                        label={t('settings.tagging.automaticAiTagging')}
                        onChange={(checked) => onSettingsChange({ ...appSettings, enableAiTagging: checked })}
                      />
                    </SettingItem>
                    <SettingItem
                      label={t('settings.shortcuts.tagging')}
                      description={t('settings.shortcuts.taggingDescription')}
                    >
                      <div>
                        <div className="flex flex-wrap gap-2 p-2 bg-bg-primary rounded-md min-h-[40px] border border-border-color mb-2 items-center">
                          <AnimatePresence>
                            {(appSettings?.taggingShortcuts || []).length > 0 ? (
                              (appSettings?.taggingShortcuts || []).map((shortcut: string) => (
                                <motion.div
                                  key={shortcut}
                                  layout
                                  variants={shortcutTagVariants}
                                  initial={false}
                                  animate="visible"
                                  exit="exit"
                                  onClick={() => handleRemoveShortcut(shortcut)}
                                  title={`Remove shortcut "${shortcut}"`}
                                  className="flex items-center gap-1 bg-surface text-text-primary text-sm font-medium px-2 py-1 rounded group cursor-pointer"
                                >
                                  <span>{shortcut}</span>
                                  <span className="rounded-full group-hover:bg-black/20 p-0.5 transition-colors">
                                    <X size={14} />
                                  </span>
                                </motion.div>
                              ))
                            ) : (
                              <motion.span
                                key="no-shortcuts-placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-sm text-text-secondary italic px-1 select-none"
                              >
                                {t('settings.shortcuts.noShortcutsAdded')}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="relative">
                          <Input
                            type="text"
                            value={newShortcut}
                            onChange={(e) => setNewShortcut(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder={t('settings.shortcuts.enterTag')}
                            className="pr-10"
                          />
                          <button
                            onClick={handleAddShortcut}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface"
                            title={t('settings.shortcuts.addShortcut')}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </SettingItem>

                    <div className="pt-6 border-t border-border-color">
                      <div className="space-y-6">
                        <DataActionItem
                          buttonAction={handleClearAiTags}
                          buttonText={t('settings.dataActions.clearAiTags')}
                          description={t('settings.dataManagement.clearAiTagsDescription')}
                          disabled={!effectiveRootPath}
                          icon={<Trash2 size={16} className="mr-2" />}
                          isProcessing={isClearingAiTags}
                          message={aiTagsClearMessage}
                          title={t('settings.dataActions.clearAiTags')}
                          t={t}
                        />
                        <DataActionItem
                          buttonAction={handleClearTags}
                          buttonText={t('settings.dataActions.clearAllTags')}
                          description={t('settings.dataManagement.clearAllTagsDescription')}
                          disabled={!effectiveRootPath}
                          icon={<Trash2 size={16} className="mr-2" />}
                          isProcessing={isClearingTags}
                          message={tagsClearMessage}
                          title={t('settings.dataActions.clearAllTags')}
                          t={t}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeCategory === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <h2 className="text-xl font-semibold mb-6 text-accent">{t('settings.processing.processingEngine')}</h2>
                  <div className="space-y-6">
                    <SettingItem
                      description={t('settings.processing.previewResolutionDescription')}
                      label={t('settings.processing.previewResolution')}
                    >
                      <Dropdown
                        onChange={(value: any) => handleProcessingSettingChange('editorPreviewResolution', value)}
                        options={resolutions}
                        value={processingSettings.editorPreviewResolution}
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.processing.highQualityZoom')}
                      description={t('settings.processing.highQualityZoomDescription')}
                    >
                      <Switch
                        checked={appSettings?.enableZoomHifi ?? true}
                        id="zoom-hifi-toggle"
                        label={t('settings.processing.enableHighQualityZoom')}
                        onChange={(checked) => onSettingsChange({ ...appSettings, enableZoomHifi: checked })}
                      />
                    </SettingItem>

                    <div className="space-y-4">
                      <SettingItem
                        label={t('settings.processing.liveInteractivePreviews')}
                        description={t('settings.processing.liveInteractivePreviewsDescription')}
                      >
                        <Switch
                          checked={appSettings?.enableLivePreviews ?? true}
                          id="live-previews-toggle"
                          label={t('settings.processing.enableLivePreviews')}
                          onChange={(checked) => {
                            setHasInteractedWithLivePreview(true);
                            onSettingsChange({ ...appSettings, enableLivePreviews: checked });
                          }}
                        />
                      </SettingItem>

                      <AnimatePresence>
                        {(appSettings?.enableLivePreviews ?? true) && (
                          <motion.div
                            initial={hasInteractedWithLivePreview ? { height: 0, opacity: 0 } : false}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 border-l-2 border-border-color ml-1">
                              <SettingItem
                                label={t('settings.processing.highQualityLivePreview')}
                                description={t('settings.processing.highQualityLivePreviewDescription')}
                              >
                                <Switch
                                  checked={appSettings?.enableHighQualityLivePreviews ?? false}
                                  id="hq-live-previews-toggle"
                                  label={t('settings.processing.enableHighQuality')}
                                  onChange={(checked) =>
                                    onSettingsChange({ ...appSettings, enableHighQualityLivePreviews: checked })
                                  }
                                />
                              </SettingItem>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <SettingItem
                      label={t('settings.processing.highlightCompression')}
                      description={t('settings.processing.highlightCompressionDescription')}
                    >
                      <Slider
                        label={t('settings.processing.amount')}
                        min={1}
                        max={10}
                        step={0.1}
                        value={processingSettings.rawHighlightCompression}
                        defaultValue={2.5}
                        onChange={(e: any) =>
                          handleProcessingSettingChange('rawHighlightCompression', parseFloat(e.target.value))
                        }
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.processing.backend')}
                      description={t('settings.processing.backendDescription')}
                    >
                      <Dropdown
                        onChange={(value: any) => handleProcessingSettingChange('processingBackend', value)}
                        options={backendOptions}
                        value={processingSettings.processingBackend}
                      />
                    </SettingItem>

                    <SettingItem
                      label={t('settings.processing.linuxOptimization')}
                      description={t('settings.processing.linuxOptimizationDescription')}
                    >
                      <Switch
                        checked={processingSettings.linuxGpuOptimization}
                        id="gpu-compat-toggle"
                        label={t('settings.processing.linuxOptimizationLabel')}
                        onChange={(checked) => handleProcessingSettingChange('linuxGpuOptimization', checked)}
                      />
                    </SettingItem>

                    {restartRequired && (
                      <>
                        <div className="p-3 bg-blue-900/20 text-blue-300 border border-blue-500/50 rounded-lg text-sm flex items-center gap-3">
                          <Info size={18} />
                          <p>{t('settings.processing.restartRequired')}</p>
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={handleSaveAndRelaunch}>{t('settings.processing.saveAndRestart')}</Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <h2 className="text-xl font-semibold mb-6 text-accent">{t('settings.generativeAi.title')}</h2>
                  <p className="text-sm text-text-secondary mb-4">
                    {t('settings.generativeAi.description')}
                  </p>

                  <AiProviderSwitch selectedProvider={aiProvider} onProviderChange={handleProviderChange} />

                  <div className="mt-6">
                    <AnimatePresence mode="wait">
                      {aiProvider === 'cpu' && (
                        <motion.div
                          key="cpu"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <h3 className="text-lg font-semibold text-text-primary">{t('settings.aiProviders.cpu')}</h3>
                          <p className="text-sm text-text-secondary mt-1">
                            {t('settings.aiDescriptions.cpu')}
                          </p>
                          <ul className="mt-3 space-y-1 list-disc list-inside text-sm text-text-secondary">
                            <li>{t('settings.aiFeatures.cpu.0')}</li>
                            <li>{t('settings.aiFeatures.cpu.1')}</li>
                            <li>{t('settings.aiFeatures.cpu.2')}</li>
                          </ul>
                        </motion.div>
                      )}

                      {aiProvider === 'ai-connector' && (
                        <motion.div
                          key="ai-connector"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <h3 className="text-lg font-semibold text-text-primary">{t('settings.aiProviders.aiConnector')}</h3>
                          <p className="text-sm text-text-secondary mt-1">
                            {t('settings.aiDescriptions.aiConnector')}
                          </p>
                          <ul className="mt-3 mb-6 space-y-1 list-disc list-inside text-sm text-text-secondary">
                            <li>{t('settings.aiFeatures.aiConnector.0')}</li>
                            <li>{t('settings.aiFeatures.aiConnector.1')}</li>
                            <li>{t('settings.aiFeatures.aiConnector.2')}</li>
                          </ul>
                          <div className="space-y-6">
                            <SettingItem
                              label={t('settings.ai.aiConnectorAddress')}
                              description={t('settings.ai.aiConnectorAddressDescription')}
                            >
                              <div className="flex items-center gap-2">
                                <Input
                                  className="flex-grow"
                                  id="ai-connector-address"
                                  onBlur={() => onSettingsChange({ ...appSettings, aiConnectorAddress: aiConnectorAddress })}
                                  onChange={(e: any) => setAiConnectorAddress(e.target.value)}
                                  onKeyDown={(e: any) => e.stopPropagation()}
                                  placeholder="127.0.0.1:8188"
                                  type="text"
                                  value={aiConnectorAddress}
                                />
                                <Button
                                  className="w-32"
                                  disabled={testStatus.testing || !aiConnectorAddress}
                                  onClick={handleTestConnection}
                                >
                                  {testStatus.testing ? t('settings.ai.testing') : t('settings.ai.testConnection')}
                                </Button>
                              </div>
                              {testStatus.message && (
                                <p
                                  className={`text-sm mt-2 flex items-center gap-2 ${
                                    testStatus.success ? 'text-green-400' : 'text-red-400'
                                  }`}
                                >
                                  {testStatus.success === true && <Wifi size={16} />}
                                  {testStatus.success === false && <WifiOff size={16} />}
                                  {testStatus.message}
                                </p>
                              )}
                            </SettingItem>
                          </div>
                        </motion.div>
                      )}

                      {aiProvider === 'cloud' && (
                        <motion.div
                          key="cloud"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <h3 className="text-lg font-semibold text-text-primary">{t('settings.aiProviders.cloud')}</h3>
                          <p className="text-sm text-text-secondary mt-1">
                            {t('settings.aiDescriptions.cloud')}
                          </p>
                          <ul className="mt-3 space-y-1 list-disc list-inside text-sm text-text-secondary">
                            <li>{t('settings.aiFeatures.cloud.0')}</li>
                            <li>{t('settings.aiFeatures.cloud.1')}</li>
                            <li>{t('settings.aiFeatures.cloud.2')}</li>
                          </ul>

                          <div className="mt-6 p-4 bg-bg-primary rounded-lg border border-border-color text-center space-y-3">
                            <span className="inline-block bg-accent text-button-text text-xs font-semibold px-2 py-1 rounded-full">
                              {t('settings.cloudService.comingSoon')}
                            </span>
                            <p className="text-sm text-text-secondary">
                              {t('settings.cloudService.comingSoonDescription')}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <h2 className="text-xl font-semibold mb-6 text-accent">{t('settings.dataManagement.title')}</h2>
                  <div className="space-y-6">
                    <DataActionItem
                      buttonAction={handleClearSidecars}
                      buttonText={t('settings.buttons.deleteAllEdits')}
                      description={
                        <>
                          {t('settings.dataManagement.clearSidecarsDescription')}
                          <code className="bg-bg-primary px-1 rounded text-text-primary">.rrdata</code> files
                          within the current base folder:
                          <span className="block font-mono text-xs bg-bg-primary p-2 rounded mt-2 break-all border border-border-color">
                            {effectiveRootPath || t('settings.dataManagement.noFolderSelected')}
                          </span>
                        </>
                      }
                      disabled={!effectiveRootPath}
                      icon={<Trash2 size={16} className="mr-2" />}
                      isProcessing={isClearing}
                      message={clearMessage}
                      title={t('settings.dataManagement.clearSidecars')}
                      t={t}
                    />

                    <DataActionItem
                      buttonAction={handleClearCache}
                      buttonText={t('settings.buttons.clearCache')}
                      description={t('settings.dataManagement.clearThumbnailCacheDescription')}
                      icon={<Trash2 size={16} className="mr-2" />}
                      isProcessing={isClearingCache}
                      message={cacheClearMessage}
                      title={t('settings.dataManagement.clearThumbnailCache')}
                      t={t}
                    />

                    <DataActionItem
                      buttonAction={async () => {
                        if (logPath && !logPath.startsWith('Could not')) {
                          await invoke(Invokes.ShowInFinder, { path: logPath });
                        }
                      }}
                      buttonText={t('settings.dataManagement.openLogFile')}
                      description={
                        <>
                          {t('settings.dataManagement.viewApplicationLogsDescription')}
                          <span className="block font-mono text-xs bg-bg-primary p-2 rounded mt-2 break-all border border-border-color">
                            {logPath || t('settings.messages.loading')}
                          </span>
                        </>
                      }
                      disabled={!logPath || logPath.startsWith('Could not')}
                      icon={<ExternalLinkIcon size={16} className="mr-2" />}
                      isProcessing={false}
                      message=""
                      title={t('settings.dataManagement.viewApplicationLogs')}
                      t={t}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeCategory === 'shortcuts' && (
              <motion.div
                key="shortcuts"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="p-6 bg-surface rounded-xl shadow-md">
                  <h2 className="text-xl font-semibold mb-6 text-accent">{t('settings.keyboardShortcuts.title')}</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold pt-3 pb-2 text-accent">{t('settings.keyboardShortcuts.categories.general')}</h3>
                      <div className="divide-y divide-border-color">
                        <KeybindItem keys={['Space', 'Enter']} description={t('settings.keyboardShortcuts.openSelectedImage')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'C']} description={t('settings.keyboardShortcuts.copySelectedAdjustments')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'V']} description={t('settings.keyboardShortcuts.pasteCopiedAdjustments')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'Shift', '+', 'C']} description={t('settings.keyboardShortcuts.copySelectedFiles')} />
                        <KeybindItem
                          description={t('settings.keyboardShortcuts.pasteFilesToCurrentFolder')}
                          keys={['Ctrl/Cmd', '+', 'Shift', '+', 'V']}
                        />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'A']} description={t('settings.keyboardShortcuts.selectAllImages')} />
                        <KeybindItem keys={['Delete']} description={t('settings.keyboardShortcuts.deleteSelectedFiles')} />
                        <KeybindItem keys={['0-5']} description={t('settings.keyboardShortcuts.setStarRating')} />
                        <KeybindItem keys={['Shift', '+', '0-5']} description={t('settings.keyboardShortcuts.setColorLabel')} />
                        <KeybindItem keys={['↑', '↓', '←', '→']} description={t('settings.keyboardShortcuts.navigateImagesInLibrary')} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold pt-3 pb-2 text-accent">{t('settings.keyboardShortcuts.categories.editor')}</h3>
                      <div className="divide-y divide-border-color">
                        <KeybindItem keys={['Esc']} description={t('settings.keyboardShortcuts.deselectMask')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'Z']} description={t('settings.keyboardShortcuts.undoAdjustment')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', 'Y']} description={t('settings.keyboardShortcuts.redoAdjustment')} />
                        <KeybindItem keys={['Delete']} description={t('settings.keyboardShortcuts.deleteSelectedMask')} />
                        <KeybindItem keys={['Space']} description={t('settings.keyboardShortcuts.cycleZoom')} />
                        <KeybindItem keys={['←', '→']} description={t('settings.keyboardShortcuts.previousNextImage')} />
                        <KeybindItem keys={['↑', '↓']} description={t('settings.keyboardShortcuts.zoomInOut')} />
                        <KeybindItem keys={['Shift', '+', 'Mouse Wheel']} description={t('settings.keyboardShortcuts.adjustSliderBy2Steps')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', '+']} description={t('settings.keyboardShortcuts.zoomIn')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', '-']} description={t('settings.keyboardShortcuts.zoomOut')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', '0']} description={t('settings.keyboardShortcuts.zoomToFit')} />
                        <KeybindItem keys={['Ctrl/Cmd', '+', '1']} description={t('settings.keyboardShortcuts.zoomTo100')} />
                        <KeybindItem keys={['F']} description={t('settings.keyboardShortcuts.toggleFullscreen')} />
                        <KeybindItem keys={['B']} description={t('settings.keyboardShortcuts.showOriginalImage')} />
                        <KeybindItem keys={['D']} description={t('settings.keyboardShortcuts.toggleAdjustmentsPanel')} />
                        <KeybindItem keys={['R']} description={t('settings.keyboardShortcuts.toggleCropPanel')} />
                        <KeybindItem keys={['M']} description={t('settings.keyboardShortcuts.toggleMaskPanel')} />
                        <KeybindItem keys={['K']} description={t('settings.keyboardShortcuts.toggleAiPanel')} />
                        <KeybindItem keys={['P']} description={t('settings.keyboardShortcuts.togglePresetsPanel')} />
                        <KeybindItem keys={['I']} description={t('settings.keyboardShortcuts.toggleMetadataPanel')} />
                        <KeybindItem keys={['W']} description={t('settings.keyboardShortcuts.toggleWaveformDisplay')} />
                        <KeybindItem keys={['E']} description={t('settings.keyboardShortcuts.toggleExportPanel')} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}