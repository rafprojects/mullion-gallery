/**
 * The framework's presentational components (P79-C).
 *
 * The thirty components the study's section 4 lists as "ours, presentational":
 * no keyboard handling, no ARIA state machine, nothing to buy from a headless
 * primitive. They are also the most-used names in the codebase, which is why
 * they can be built and proved before Phase 80 installs the primitive.
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
registerUiStyles('ui/utility', utilityCss);
// Last, so the ring wins a tie inside `@layer mullion.components` against any
// component rule that also sets `box-shadow`: `Paper` and `Card` both do, and
// a focusable card would otherwise lose its halo to its own elevation.
registerUiStyles('ui/focus', focusCss);

export {
  cx,
  focusable,
  focusableSibling,
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
  CloseButton,
  CopyButton,
  FileButton,
  UnstyledButton,
  type ActionIconProps,
  type ButtonProps,
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
  Collapse,
  VisuallyHidden,
  type CollapseProps,
  type VisuallyHiddenProps,
} from './utility';
