/**
 * The app's entries in the framework's style registration list (P79-B).
 *
 * Importing this module registers every stylesheet the gallery needs in a
 * tree, in cascade order, with `registerUiStyles` from `@/ui`. The provider
 * adopts the resulting list into every root it paints, so a sheet registered
 * here reaches the gallery shadow root, the overlay root and a light-mount
 * document alike. This file replaces the two lists (`shadowStyles`,
 * `overlayStyles`) that `main.tsx` and `portalTarget.ts` used to write into
 * `<style>` elements by hand, one copy per root.
 *
 * Vendor sheets come first, then our structural sheets, then the CSS modules
 * consumed inside the gallery tree. `src/styles/__tests__/styleDelivery.test.ts`
 * checks that every `*.module.scss` in the tree is registered here; a module
 * left out is dead in every tree but the document.
 *
 * Mantine's two sheets are registered inside the `mullion.vendor` cascade
 * layer. Mantine's `styles.css` declares its default variables at `:root` and
 * `:host`, and its runtime variables sheet overrides them at the same
 * selector by coming later in the tree; an adopted sheet cascades after that
 * runtime sheet, so unlayered the defaults won (measured: the theme's dimmed
 * text reverted to Mantine's `#828282`). Layered, every unlayered rule in the
 * tree beats them whatever the order. See the P79-B notes in
 * docs/PHASE79_REPORT.md. Phase 81 deletes the Mantine lines.
 */

import mantineCoreStyles from '@mantine/core/styles.css?inline';
import mantineNotificationsStyles from '@mantine/notifications/styles.css?inline';
import rowsPhotoAlbumStyles from 'react-photo-album/rows.css?inline';
import masonryPhotoAlbumStyles from 'react-photo-album/masonry.css?inline';
import dockviewStyles from 'dockview/dist/styles/dockview.css?inline';
import builderStyles from './styles/builder.css?inline';
import globalStyles from './styles/global.scss?inline';
import chromePortableStyles from './styles/chrome-portable.scss?inline';
import campaignCardStyles from './components/CampaignGallery/CampaignCard.module.scss?inline';
import cardGalleryStyles from './components/CampaignGallery/CardGallery.module.scss?inline';
import campaignViewerStyles from './components/CardViewer/CampaignViewer.module.scss?inline';
import mediaCardStyles from './components/Admin/MediaCard.module.scss?inline';
import mediaTabStyles from './components/Admin/MediaTab.module.scss?inline';
import templatePickerStyles from './components/Admin/TemplatePickerModal.module.scss?inline';
import { registerUiStyles } from './ui';

const VENDOR = { layer: 'mullion.vendor' };

registerUiStyles('vendor/mantine-core', mantineCoreStyles, VENDOR);
registerUiStyles('vendor/mantine-notifications', mantineNotificationsStyles, VENDOR);
registerUiStyles('vendor/react-photo-album-rows', rowsPhotoAlbumStyles);
registerUiStyles('vendor/react-photo-album-masonry', masonryPhotoAlbumStyles);
// Dockview and builder.css were overlay-root-only until P79-B; the Layout
// Builder is portaled, so the gallery tree never had a reader for them and
// still does not, but one list means one place to look.
registerUiStyles('vendor/dockview', dockviewStyles);
registerUiStyles('app/builder', builderStyles);
registerUiStyles('app/global', globalStyles);
// Also imported as a document stylesheet in main.tsx for the wp-admin apps,
// which have no provider until P81-B. See the header of chrome-portable.scss.
registerUiStyles('app/chrome-portable', chromePortableStyles);
registerUiStyles('app/campaign-card', campaignCardStyles);
registerUiStyles('app/card-gallery', cardGalleryStyles);
registerUiStyles('app/campaign-viewer', campaignViewerStyles);
registerUiStyles('app/media-card', mediaCardStyles);
registerUiStyles('app/media-tab', mediaTabStyles);
// Dead in the overlay root from P77-I until P79-B: the module was listed as
// document-only because the modal used to portal to document.body.
registerUiStyles('app/template-picker', templatePickerStyles);
