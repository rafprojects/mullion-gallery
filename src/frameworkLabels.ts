/**
 * The framework's own control names in the page's language (P81-A).
 *
 * Each root `MullionProvider` passes these as `labels` and nested providers
 * inherit them. The framework writes its slots in single braces, so each slot
 * is interpolated with itself and comes out of i18next unchanged.
 */
import i18n from './i18n';
import type { UiLabels } from './ui';

let cached: { language: string; labels: UiLabels } | null = null;

export function frameworkLabels(): UiLabels {
  if (cached?.language === i18n.language) return cached.labels;
  const t = i18n.t.bind(i18n);
  const labels: UiLabels = {
    close: t('common_close', 'Close'),
    clear: t('ui_clear', 'Clear'),
    showOptions: t('ui_show_options', 'Show options'),
    remove: t('ui_remove_item', 'Remove {{label}}', { label: '{label}' }),
    showPassword: t('ui_show_password', 'Show password'),
    increment: t('ui_increment', 'Increment'),
    decrement: t('ui_decrement', 'Decrement'),
    openColorPicker: t('ui_open_color_picker', 'Open the color picker'),
    pickFromScreen: t('ui_pick_from_screen', 'Pick a color from the screen'),
    useColor: t('ui_use_color', 'Use {{color}}', { color: '{color}' }),
    colorSurface: t('ui_color_surface', 'Saturation and brightness'),
    colorSurfaceValue: t('ui_color_surface_value', 'Saturation {{saturation}}%, brightness {{brightness}}%', {
      saturation: '{saturation}',
      brightness: '{brightness}',
    }),
    hue: t('ui_hue', 'Hue'),
    opacity: t('ui_opacity', 'Opacity'),
    pagination: t('ui_pagination', 'Pagination'),
    previousPage: t('ui_previous_page', 'Previous page'),
    nextPage: t('ui_next_page', 'Next page'),
    page: t('ui_page', 'Page {{page}}', { page: '{page}' }),
  };
  cached = { language: i18n.language, labels };
  return labels;
}
