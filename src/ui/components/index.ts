/**
 * The framework's components (P79-C, P80-A).
 *
 * P79-C built the thirty the study's section 4 lists as "ours, presentational":
 * no keyboard handling, no ARIA state machine, nothing to buy from a headless
 * primitive. They are also the most-used names in the codebase, which is why
 * they could be built and proved before the primitive arrived.
 *
 * P80-A adds the first components with interaction behaviour, in `./overlay`.
 * None of that behaviour is written here: Base UI owns it and the wrappers
 * supply the portal container, the classes and the tokens (study principle 6).
 *
 * P80-C adds the two imperative stores, in `./notification` and `./confirm`.
 * They are the only exports here that are not components: 42 call sites raise a
 * toast from a callback rather than from a render, so a hook could not reach
 * them and the store is a module singleton instead.
 *
 * They are deliberately NOT re-exported from `@/ui` yet. That barrel is the
 * migration ledger: moving `Text` onto this implementation there would move
 * all 92 files that import it in one commit, which is Phase 81's job and its
 * pixel-refresh budget. Storybook, the unit suite and the e2e showcase import
 * this module directly until then.
 *
 * Importing this module registers the component sheets into the framework's
 * style list, so a tree the provider paints receives them by the same
 * mechanism as everything else (P79-B).
 */

import { registerUiStyles } from '../styles/uiStyles';
import tonesCss from '../styles/tones.css?inline';
import layoutCss from './layout.css?inline';
import surfaceCss from './surface.css?inline';
import typographyCss from './typography.css?inline';
import controlCss from './control.css?inline';
import feedbackCss from './feedback.css?inline';
import displayCss from './display.css?inline';
import overlayCss from './overlay.css?inline';
import inputCss from './input.css?inline';
import selectCss from './select.css?inline';
import tabsCss from './tabs.css?inline';
import accordionCss from './accordion.css?inline';
import toggleCss from './toggle.css?inline';
import paginationCss from './pagination.css?inline';
import colorCss from './color.css?inline';
import notificationCss from './notification.css?inline';
import utilityCss from './utility.css?inline';
import focusCss from '../styles/focus.css?inline';

// Sheets are per family rather than per component: a `.mullion-stack` and a
// `.mullion-group` differ by two declarations and share their padding idiom,
// so a file each would put one rule in each of seven files. The three static
// guards in `../__tests__/componentSheets.test.ts` cover them either way.
// The tone ladder first: it is the vocabulary every other sheet reads.
registerUiStyles('ui/tones', tonesCss);
registerUiStyles('ui/layout', layoutCss);
registerUiStyles('ui/surface', surfaceCss);
registerUiStyles('ui/typography', typographyCss);
registerUiStyles('ui/control', controlCss);
registerUiStyles('ui/feedback', feedbackCss);
registerUiStyles('ui/display', displayCss);
registerUiStyles('ui/overlay', overlayCss);
registerUiStyles('ui/input', inputCss);
// After the field sheet: the select family wears the same shell and overrides
// two of its rules (a chip row's height, a trigger's cursor).
registerUiStyles('ui/select', selectCss);
registerUiStyles('ui/tabs', tabsCss);
registerUiStyles('ui/accordion', accordionCss);
registerUiStyles('ui/toggle', toggleCss);
registerUiStyles('ui/pagination', paginationCss);
// After the toggle sheet: the picker restyles the framework Slider's track.
registerUiStyles('ui/color', colorCss);
// [P80-C] The toast stack. The confirm dialog has no sheet of its own: it is a
// `Modal`, and its two extra rules sit in the overlay sheet registered above.
registerUiStyles('ui/notification', notificationCss);
registerUiStyles('ui/utility', utilityCss);
// Last, so the ring wins a tie inside `@layer mullion.components` against any
// component rule that also sets `box-shadow`: `Paper` and `Card` both do, and
// a focusable card would otherwise lose its halo to its own elevation.
registerUiStyles('ui/focus', focusCss);

export {
  cx,
  focusable,
  focusableSibling,
  focusableInset,
  renderElement,
  FOCUS_ATTR,
  type UiElementProps,
  type UiRender,
  type UiRenderProps,
  type UiStyle,
  type UiTone,
} from './element';
export {
  customProperties,
  fontSizeValue,
  paddingVars,
  radiusValue,
  shadowValue,
  spacingValue,
  type UiFontSize,
  type UiPaddingProps,
  type UiRadius,
  type UiScaleStep,
  type UiSpacing,
} from './scale';

export {
  Box,
  Center,
  Container,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  type BoxProps,
  type CenterProps,
  type ContainerProps,
  type GridColProps,
  type GridProps,
  type GroupProps,
  type SimpleGridProps,
  type StackProps,
  type UiResponsiveCols,
} from './layout';
export {
  Card,
  Divider,
  Paper,
  type CardProps,
  type CardSectionProps,
  type DividerProps,
  type PaperProps,
} from './surface';
export {
  Anchor,
  Kbd,
  Text,
  Title,
  type AnchorProps,
  type HeadingLevel,
  type KbdProps,
  type TextProps,
  type TitleProps,
} from './typography';
export {
  ActionIcon,
  Button,
  Chip,
  ChipGroup,
  CloseButton,
  CopyButton,
  FileButton,
  UnstyledButton,
  type ActionIconProps,
  type ButtonProps,
  type ChipGroupProps,
  type ChipProps,
  type CloseButtonProps,
  type CopyButtonProps,
  type FileButtonProps,
  type UiControlVariant,
  type UnstyledButtonProps,
} from './control';
export {
  Alert,
  Badge,
  Loader,
  Skeleton,
  type AlertProps,
  type BadgeProps,
  type LoaderProps,
  type SkeletonProps,
  type UiSurfaceVariant,
} from './feedback';
export {
  ColorSwatch,
  Image,
  Table,
  type ColorSwatchProps,
  type ImageProps,
  type TableProps,
  type TableScrollContainerProps,
} from './display';
export {
  NumberInput,
  PasswordInput,
  Textarea,
  TextInput,
  type NumberInputProps,
  type PasswordInputProps,
  type TextareaProps,
  type TextInputProps,
} from './input';
export {
  Accordion,
  type AccordionControlProps,
  type AccordionItemProps,
  type AccordionPanelProps,
  type AccordionProps,
  type UiChevronPosition,
} from './accordion';
export {
  ColorInput,
  ColorPicker,
  formatColor,
  parseColor,
  type ColorInputProps,
  type ColorPickerProps,
  type UiColorFormat,
  type UiHsva,
} from './color';
export {
  Pagination,
  paginationRange,
  type PaginationProps,
} from './pagination';
export {
  Checkbox,
  Slider,
  Switch,
  type CheckboxProps,
  type SliderProps,
  type SwitchProps,
  type UiSliderMark,
} from './toggle';
export {
  SegmentedControl,
  Tabs,
  type SegmentedControlProps,
  type TabProps,
  type TabsListProps,
  type TabsPanelProps,
  type TabsProps,
  type UiSegmentData,
} from './tabs';
export {
  MultiSelect,
  Select,
  TagsInput,
  type MultiSelectProps,
  type SelectProps,
  type TagsInputProps,
  type UiSelectData,
  type UiSelectGroup,
  type UiSelectOption,
} from './select';
export {
  isRoleTone,
  resolveRoleGlyph,
  type UiRoleTone,
} from './roleGlyph';
export {
  Collapse,
  VisuallyHidden,
  type CollapseProps,
  type VisuallyHiddenProps,
} from './utility';
export {
  Notifications,
  notify,
  type NotificationsProps,
  type UiNotifyColor,
  type UiNotifyOptions,
  type UiNotifyPosition,
} from './notification';
export {
  Confirmations,
  confirm,
  type UiConfirmButtonProps,
  type UiConfirmColor,
  type UiConfirmOptions,
} from './confirm';
export {
  Drawer,
  Menu,
  Modal,
  Popover,
  Tooltip,
  type DrawerProps,
  type MenuContentProps,
  type MenuGroupProps,
  type MenuItemProps,
  type MenuProps,
  type ModalProps,
  type PopoverContentProps,
  type PopoverProps,
  type TooltipGroupProps,
  type TooltipProps,
  type UiAlign,
  type UiDrawerSide,
  type UiSide,
} from './overlay';
