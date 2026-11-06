import { FunctionComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon.js';
import { cn } from '../lib/utils';
import { useEffectiveTheme } from '../hooks/use-effective-theme.js';
import { useLocale } from '../hooks/use-locale.js';
import { getLocale } from '../i18n/index.js';
import { resolveLauncherText } from '../i18n/resolve-launcher-text.js';
import type { LauncherTextBundle } from '../config.js';

interface WidgetLauncherButtonProps {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  buttonText: LauncherTextBundle;
  buttonShape: 'round' | 'rectangle';
  buttonIcon: string | null;
  buttonIconSize: number;
  buttonIconStroke: number;
  theme: 'auto' | 'light' | 'dark';
  lightButtonColor: string;
  lightTextColor: string;
  lightButtonHoverColor: string;
  lightTextHoverColor: string;
  darkButtonColor: string;
  darkTextColor: string;
  darkButtonHoverColor: string;
  darkTextHoverColor: string;
  enableHoverScaleEffect: boolean;
  tooltipEnabled: boolean;
  tooltipText: LauncherTextBundle;
  onClick: () => void;
}

const positionClasses: Record<string, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
};

export const WidgetLauncherButton: FunctionComponent<WidgetLauncherButtonProps> = ({
  position,
  buttonText,
  buttonShape,
  buttonIcon,
  buttonIconSize,
  buttonIconStroke,
  theme,
  lightButtonColor,
  lightTextColor,
  lightButtonHoverColor,
  lightTextHoverColor,
  darkButtonColor,
  darkTextColor,
  darkButtonHoverColor,
  darkTextHoverColor,
  enableHoverScaleEffect,
  tooltipEnabled,
  tooltipText,
  onClick,
}) => {
  useLocale();
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipOffset, setTooltipOffset] = useState({
    left: '50%',
    transform: 'translateX(-50%)',
    arrowLeft: '50%',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const effectiveTheme = useEffectiveTheme(theme);
  const isDarkMode = effectiveTheme === 'dark';
  // Keep the public launcher configuration contract intact for future brand variants.
  void [
    lightButtonColor,
    lightTextColor,
    lightButtonHoverColor,
    lightTextHoverColor,
    darkButtonColor,
    darkTextColor,
    darkButtonHoverColor,
    darkTextHoverColor,
    isDarkMode,
  ];
  const activeLocale = getLocale();
  const resolvedButtonText = resolveLauncherText(
    buttonText.project,
    buttonText.global,
    activeLocale,
    buttonText.builtin?.[activeLocale] ?? null
  );
  const feedbackTooltip = 'Feedback: błędy, poprawki i pomysły';

  // Calculate tooltip position to ensure 4px margin from window edges
  useEffect(() => {
    if (isHovered && tooltipRef.current && buttonRef.current) {
      const tooltip = tooltipRef.current;
      const button = buttonRef.current;

      // Small delay to ensure tooltip is rendered
      requestAnimationFrame(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const margin = 4;

        // Calculate button center in viewport coordinates
        const buttonCenter = buttonRect.left + buttonRect.width / 2;
        const tooltipHalfWidth = tooltipRect.width / 2;

        // Calculate how much to shift from centered position
        let shift = 0;
        const centeredLeft = buttonCenter - tooltipHalfWidth;

        // Check if tooltip would go off-screen on the left
        if (centeredLeft < margin) {
          shift = margin - centeredLeft;
        }
        // Check if tooltip would go off-screen on the right
        else if (centeredLeft + tooltipRect.width > windowWidth - margin) {
          shift = windowWidth - margin - (centeredLeft + tooltipRect.width);
        }

        setTooltipOffset({
          left: '50%',
          transform: `translateX(-50%) translateX(${shift}px)`,
          arrowLeft: '50%',
        });
      });
    }
  }, [isHovered, feedbackTooltip]);

  // This fork is embedded in MyMarg, so the launcher uses the dashboard accent
  // instead of the generic BugPin project palette. Dialog colors remain configurable.
  const buttonColor = isHovered ? '#2563eb' : '#3b82f6';
  const textColor = '#ffffff';
  const tooltipBgColor = '#0f172a';
  const tooltipTextColor = '#f8fafc';

  const borderRadius = '50%';
  const ariaLabel = resolvedButtonText
    ? `Przekaż feedback: ${resolvedButtonText}`
    : 'Przekaż feedback';
  void [buttonShape, buttonIcon, tooltipEnabled, tooltipText];

  return (
    <div
      class={cn(
        'bugpin-launcher fixed z-[2147483647]',
        positionClasses[position],
        position.startsWith('bottom') && 'bugpin-launcher-bottom'
      )}
    >
      <button
        ref={buttonRef}
        class={cn(
          'relative flex h-9 w-9 items-center justify-center border border-solid cursor-pointer transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          enableHoverScaleEffect && 'hover:scale-110 hover:shadow-xl active:scale-105'
        )}
        style={{
          backgroundColor: buttonColor,
          color: textColor,
          borderRadius: borderRadius,
          padding: '0',
          borderColor: 'rgba(147, 197, 253, 0.9)',
          boxShadow: '0 10px 24px rgba(37, 99, 235, 0.28)',
          fontFamily:
            "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          letterSpacing: '0.01em',
        }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={ariaLabel}
      >
        <Icon
          name="message-square"
          size={Math.min(buttonIconSize, 16)}
          strokeWidth={buttonIconStroke}
        />
        <span class="sr-only">{ariaLabel}</span>
      </button>

      {isHovered && (
        <div
          ref={tooltipRef}
          class="absolute bottom-full mb-2 px-3 py-1.5 text-xs rounded whitespace-nowrap pointer-events-none z-[2147483647] animate-[bugpin-tooltip-fade-in_0.2s_ease-in-out_forwards] shadow-md"
          style={{
            backgroundColor: tooltipBgColor,
            color: tooltipTextColor,
            opacity: 0,
            left: tooltipOffset.left,
            transform: tooltipOffset.transform,
          }}
        >
          {feedbackTooltip}
          <div
            class="absolute top-full border-4 border-solid border-transparent"
            style={{
              left: tooltipOffset.arrowLeft,
              transform: 'translateX(-50%)',
              marginTop: '-4px',
              borderTopColor: tooltipBgColor,
            }}
          />
        </div>
      )}
    </div>
  );
};
