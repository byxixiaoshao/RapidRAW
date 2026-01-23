import Slider from '../ui/Slider';
import { Adjustments, DetailsAdjustment, Effect } from '../../utils/adjustments';
import { AppSettings } from '../ui/AppProperties';
import { useTranslation } from 'react-i18next';

interface DetailsPanelProps {
  adjustments: Adjustments;
  setAdjustments(adjustments: Partial<Adjustments>): any;
  appSettings: AppSettings | null;
  isForMask?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
}

export default function DetailsPanel({
  adjustments,
  setAdjustments,
  appSettings,
  isForMask = false,
  onDragStateChange,
}: DetailsPanelProps) {
  const { t } = useTranslation();
  const handleAdjustmentChange = (key: string, value: string) => {
    const numericValue = parseInt(value, 10);
    setAdjustments((prev: Partial<Adjustments>) => ({ ...prev, [key]: numericValue }));
  };

  const adjustmentVisibility = appSettings?.adjustmentVisibility || {};

  return (
    <div>
      {adjustmentVisibility.sharpening !== false && (
        <div className="mb-4 p-2 bg-bg-tertiary rounded-md">
          <p className="text-md font-semibold mb-2 text-primary">{t('details.sharpening')}</p>
          <Slider
            label={t('details.sharpness')}
            max={100}
            min={-100}
            onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Sharpness, e.target.value)}
            step={1}
            value={adjustments.sharpness}
            onDragStateChange={onDragStateChange}
          />
        </div>
      )}

      {adjustmentVisibility.presence !== false && (
        <div className="p-2 bg-bg-tertiary rounded-md">
          <p className="text-md font-semibold mb-2 text-primary">{t('details.presence')}</p>
          <Slider
            label={t('details.clarity')}
            max={100}
            min={-100}
            onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Clarity, e.target.value)}
            step={1}
            value={adjustments.clarity}
            onDragStateChange={onDragStateChange}
          />
          <Slider
            label={t('details.dehaze')}
            max={100}
            min={-100}
            onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Dehaze, e.target.value)}
            step={1}
            value={adjustments.dehaze}
            onDragStateChange={onDragStateChange}
          />
          <Slider
            label={t('details.structure')}
            max={100}
            min={-100}
            onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Structure, e.target.value)}
            step={1}
            value={adjustments.structure}
            onDragStateChange={onDragStateChange}
          />
          {!isForMask && (
            <Slider
              label={t('details.centre')}
              max={100}
              min={-100}
              onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.Centré, e.target.value)}
              step={1}
              value={adjustments.centré}
              onDragStateChange={onDragStateChange}
            />
          )}
        </div>
      )}

      {/* Hide noise reduction to stop people from thinking it exists
      {adjustmentVisibility.noiseReduction !== false && (
        <div className="p-2 bg-bg-tertiary rounded-md">
          <p className="text-md font-semibold mb-2 text-primary">Noise Reduction</p>
          <Slider
            label="Luminance"
            max={100}
            min={0}
            onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.LumaNoiseReduction, e.target.value)}
            step={1}
            value={adjustments.lumaNoiseReduction}
          />
          <Slider
            label="Color"
            max={100}
            min={0}
            onChange={(e: any) => handleAdjustmentChange(DetailsAdjustment.ColorNoiseReduction, e.target.value)}
            step={1}
            value={adjustments.colorNoiseReduction}
          />
        </div>
      )}
      */}

      {adjustmentVisibility.chromaticAberration !== false && (
        <div className="mt-4 p-2 bg-bg-tertiary rounded-md">
          <p className="text-md font-semibold mb-2 text-primary">{t('details.chromaticAberration')}</p>
          <Slider
            label={t('details.redCyan')}
            max={100}
            min={-100}
            onChange={(e: any) =>
              handleAdjustmentChange(DetailsAdjustment.ChromaticAberrationRedCyan, e.target.value)
            }
            step={1}
            value={adjustments.chromaticAberrationRedCyan}
            onDragStateChange={onDragStateChange}
          />
          <Slider
            label={t('details.blueYellow')}
            max={100}
            min={-100}
            onChange={(e: any) =>
              handleAdjustmentChange(DetailsAdjustment.ChromaticAberrationBlueYellow, e.target.value)
            }
            step={1}
            value={adjustments.chromaticAberrationBlueYellow}
            onDragStateChange={onDragStateChange}
          />
        </div>
      )}
    </div>
  );
}