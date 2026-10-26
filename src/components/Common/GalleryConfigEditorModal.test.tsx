import { describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, waitFor, pickOption, shownOption } from '@/test/test-utils';
import { getAdapterSelectOptions } from '@/components/Galleries/Adapters/adapterRegistry';

import { GalleryConfigEditorModal } from './GalleryConfigEditorModal';

/**
 * Base UI's number field keeps an aria-hidden twin input for form submission,
 * so a display-value query finds two. This finds the one a user sees and
 * still insists there is exactly one.
 */
function getShownByDisplayValue(value: string) {
  const shown = screen.getAllByDisplayValue(value).filter((el) => el.getAttribute('aria-hidden') !== 'true');
  expect(shown).toHaveLength(1);
  return shown[0]!;
}

async function findShownByDisplayValue(value: string) {
  await screen.findAllByDisplayValue(value);
  return getShownByDisplayValue(value);
}

function openAccordionSection(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('GalleryConfigEditorModal', () => {
  it('renders the first schema-driven adapter-specific field for masonry selections', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'masonry',
                adapterSettings: {
                  masonryColumns: 3,
                  masonryAutoColumnBreakpoints: '480:2,768:3,1024:4,1280:5',
                },
              },
              video: {
                adapterId: 'classic',
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adapter-Specific Settings')).toBeInTheDocument();
    expect(screen.getByText('Masonry Columns (0 = auto)')).toBeInTheDocument();
    expect(getShownByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByLabelText('Auto Column Breakpoints')).toHaveValue('480:2,768:3,1024:4,1280:5');
  });

  it('renders registry-driven compact grid fields for matching adapters', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'compact-grid',
                adapterSettings: {
                  gridCardWidth: 180,
                  gridCardAspectRatio: '3:4',
                  gridCardMaxColumns: 3,
                  gridCardMinHeight: 220,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByLabelText('Card Width')).toBeInTheDocument();
    expect(shownOption('Card Aspect Ratio')).toBe('3:4 (portrait)');
    expect(screen.getByLabelText('Max Columns (0 = auto)')).toBeInTheDocument();
    expect(screen.getByLabelText('Card Min Height (px)')).toBeInTheDocument();
    expect(getShownByDisplayValue('180')).toBeInTheDocument();
    expect(getShownByDisplayValue('3')).toBeInTheDocument();
    expect(getShownByDisplayValue('220')).toBeInTheDocument();
  });

  it('renders schema-driven carousel adapter fields for classic selections', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'unified',
          breakpoints: {
            desktop: {
              unified: {
                adapterId: 'classic',
                adapterSettings: {
                  imageBorderRadius: 14,
                  videoBorderRadius: 18,
                  imageViewportHeight: 560,
                  videoViewportHeight: 500,
                  imageShadowPreset: 'custom',
                  imageShadowCustom: '0 8px 24px rgba(0,0,0,0.35)',
                  videoShadowPreset: 'strong',
                  videoShadowCustom: '0 6px 18px rgba(0,0,0,0.3)',
                  carouselVisibleCards: 3,
                  carouselLoop: false,
                  carouselAutoplayDirection: 'rtl',
                  navArrowPosition: 'bottom',
                  navArrowSize: 42,
                  navArrowColor: '#ff8800',
                  navArrowBgColor: 'rgba(1,2,3,0.5)',
                  navArrowEdgeInset: 18,
                  navArrowMinHitTarget: 56,
                  navArrowFadeDurationMs: 320,
                  navArrowScaleTransitionMs: 210,
                  dotNavEnabled: false,
                  dotNavPosition: 'overlay-top',
                  dotNavMaxVisibleDots: 9,
                  dotNavActiveColor: '#00ffaa',
                  dotNavInactiveColor: 'rgba(4,5,6,0.25)',
                  viewportHeightMobileRatio: 0.7,
                  viewportHeightTabletRatio: 0.85,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adapter-Specific Settings')).toBeInTheDocument();
    expect(screen.getByText('Media Frame')).toBeInTheDocument();
    expect(screen.getByLabelText('Image Border Radius')).toHaveValue('14');
    expect(screen.getByLabelText('Video Border Radius')).toHaveValue('18');
    expect(screen.getByLabelText('Image Viewport Height')).toHaveValue('560');
    expect(screen.getByLabelText('Video Viewport Height')).toHaveValue('500');
    expect(shownOption('Image Shadow Preset')).toBe('Custom');
    expect(screen.getByLabelText('Image Custom Shadow')).toHaveValue('0 8px 24px rgba(0,0,0,0.35)');
    expect(shownOption('Video Shadow Preset')).toBe('Strong');
    expect(screen.queryByLabelText('Video Custom Shadow')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Visible Cards')).toHaveValue('3');
    expect(shownOption('Loop')).toBe('Off');
    expect(shownOption('Autoplay Direction')).toBe('Right to Left');
    expect(shownOption('Arrow Vertical Position')).toBe('Bottom');
    expect(screen.getByLabelText('Arrow Size (px)')).toHaveValue('42');
    expect(screen.getByLabelText('Arrow Color')).toHaveValue('#ff8800');
    expect(screen.getByLabelText('Arrow Background Color')).toHaveValue('rgba(1,2,3,0.5)');
    expect(screen.getByLabelText('Arrow Edge Inset (px)')).toHaveValue('18');
    expect(screen.getByLabelText('Arrow Min Hit Target (px)')).toHaveValue('56');
    expect(screen.getByLabelText('Arrow Fade Duration (ms)')).toHaveValue('320');
    expect(screen.getByLabelText('Arrow Scale Transition (ms)')).toHaveValue('210');
    expect(shownOption('Enable Dot Navigator')).toBe('Off');
    expect(shownOption('Dot Position')).toBe('Overlay Top');
    expect(screen.getByLabelText('Max Visible Dots')).toHaveValue('9');
    expect(screen.getByLabelText('Active Dot Color')).toHaveValue('#00ffaa');
    expect(screen.getByLabelText('Inactive Dot Color')).toHaveValue('rgba(4,5,6,0.25)');
    expect(screen.getByLabelText('Viewport Height Mobile Ratio')).toHaveValue('0.7');
    expect(screen.getByLabelText('Viewport Height Tablet Ratio')).toHaveValue('0.85');
  });

  it('uses breakpoint tabs to edit unified adapter settings without collapsing them to desktop only', async () => {
    const onSave = vi.fn();
    const tabletAdapterLabel = getAdapterSelectOptions({ context: 'unified-gallery', breakpoint: 'tablet' })
      .find((option) => option.value === 'justified')?.label;

    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'unified',
          breakpoints: {
            desktop: {
              unified: {
                adapterId: 'classic',
                adapterSettings: {
                  carouselVisibleCards: 3,
                },
              },
            },
            tablet: {
              unified: {
                adapterId: 'classic',
                adapterSettings: {
                  carouselVisibleCards: 2,
                },
              },
            },
            mobile: {
              unified: {
                adapterId: 'classic',
                adapterSettings: {
                  carouselVisibleCards: 1,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(await screen.findByRole('combobox', { name: 'Unified Gallery Adapter' })).toBeInTheDocument();
    expect(getShownByDisplayValue('3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Tablet' }));

    expect(await screen.findByText('Editing breakpoint-specific unified settings for the Tablet layout.')).toBeInTheDocument();
    expect(getShownByDisplayValue('2')).toBeInTheDocument();
    fireEvent.change(getShownByDisplayValue('2'), { target: { value: '4' } });
    await pickOption('Unified Gallery Adapter', tabletAdapterLabel ?? 'Justified');
    fireEvent.click(screen.getByRole('button', { name: 'Apply Gallery Config' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'unified',
        breakpoints: expect.objectContaining({
          desktop: expect.objectContaining({
            unified: expect.objectContaining({
              adapterSettings: expect.objectContaining({
                carouselVisibleCards: 3,
              }),
            }),
          }),
          tablet: expect.objectContaining({
            unified: expect.objectContaining({
              adapterId: 'justified',
              adapterSettings: expect.objectContaining({
                carouselVisibleCards: 4,
              }),
            }),
          }),
          mobile: expect.objectContaining({
            unified: expect.objectContaining({
              adapterSettings: expect.objectContaining({
                carouselVisibleCards: 1,
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('keeps adapter-specific controls hidden until the active breakpoint has an explicit adapter override', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'unified',
          breakpoints: {
            desktop: {
              unified: {},
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adapter-Specific Settings')).toBeInTheDocument();
    expect(screen.getByText('This breakpoint is currently inheriting its adapter choice. Pick an explicit adapter above to expose adapter-specific settings here.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Visible Cards')).not.toBeInTheDocument();
  });

  it('preserves explicit classic carousel visible-card counts before saving', async () => {
    const onSave = vi.fn();

    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'unified',
          breakpoints: {
            desktop: {
              unified: {
                adapterId: 'classic',
                adapterSettings: {
                  carouselVisibleCards: 1,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = await screen.findByLabelText('Visible Cards');
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Gallery Config' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        breakpoints: expect.objectContaining({
          desktop: expect.objectContaining({
            unified: expect.objectContaining({
              adapterSettings: expect.objectContaining({
                carouselVisibleCards: 4,
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('emits undefined draft changes when clearMode is draft-backed', async () => {
    const onChange = vi.fn();

    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'masonry',
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onChange={onChange}
        clearMode="draft"
        clearLabel="Preview Inherited Gallery Settings"
      />,
    );

    expect(await screen.findByRole('button', { name: 'Preview Inherited Gallery Settings' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview Inherited Gallery Settings' }));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('applies shared common-setting edits to the active breakpoint only', async () => {
    const onSave = vi.fn();

    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'compact-grid',
                common: {
                  sectionPadding: 16,
                },
              },
            },
            tablet: {
              image: {
                adapterId: 'compact-grid',
                common: {
                  sectionPadding: 24,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    openAccordionSection('Shared Section Spacing');
    expect(await screen.findByLabelText('Section Padding (px)')).toHaveValue('16');

    fireEvent.click(screen.getByRole('tab', { name: 'Tablet' }));

    expect(await screen.findByText('Settings below apply to the Tablet breakpoint for the current per-type gallery surface.')).toBeInTheDocument();
    expect(screen.getByLabelText('Section Padding (px)')).toHaveValue('24');

    fireEvent.change(screen.getByLabelText('Section Padding (px)'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Gallery Config' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        breakpoints: expect.objectContaining({
          desktop: expect.objectContaining({
            image: expect.objectContaining({
              common: expect.objectContaining({
                sectionPadding: 16,
              }),
            }),
          }),
          tablet: expect.objectContaining({
            image: expect.objectContaining({
              common: expect.objectContaining({
                sectionPadding: 30,
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('resets a per-type scope back to the opened baseline without touching the sibling scope', async () => {
    const onSave = vi.fn();

    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'compact-grid',
                common: {
                  viewportBgType: 'solid',
                  viewportBgColor: '#112233',
                },
              },
              video: {
                adapterId: 'classic',
                common: {
                  viewportBgType: 'gradient',
                  viewportBgGradient: 'linear-gradient(135deg, #123456 0%, #654321 100%)',
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    openAccordionSection('Viewport Backgrounds');
    expect(await screen.findByLabelText('Image Gallery Background Color')).toHaveValue('#112233');

    fireEvent.change(screen.getByLabelText('Image Gallery Background Color'), { target: { value: '#445566' } });
    fireEvent.click(screen.getByRole('button', { name: /^Reset$/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reset Image Gallery' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Gallery Config' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        breakpoints: expect.objectContaining({
          desktop: expect.objectContaining({
            image: expect.objectContaining({
              common: expect.objectContaining({
                viewportBgType: 'solid',
                viewportBgColor: '#112233',
              }),
            }),
            video: expect.objectContaining({
              common: expect.objectContaining({
                viewportBgType: 'gradient',
                viewportBgGradient: 'linear-gradient(135deg, #123456 0%, #654321 100%)',
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('renders shared photo-grid adapter fields for justified selections', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'justified',
                adapterSettings: {
                  thumbnailGap: 12,
                  mosaicTargetRowHeight: 240,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adapter-Specific Settings')).toBeInTheDocument();
    expect(screen.getByText('Photo Grid')).toBeInTheDocument();
    expect(screen.getByLabelText('Thumbnail Gap (px)')).toHaveValue('12');
    expect(screen.getByLabelText('Target Row Height (px)')).toHaveValue('240');
  });

  it('renders shape layout and shared tile-appearance fields for shape selections', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'hexagonal',
                adapterSettings: {
                  tileBorderWidth: 2,
                  tileBorderColor: '#ff0000',
                  tileHoverBounce: false,
                  tileGlowEnabled: true,
                  tileGlowColor: '#00ffaa',
                  tileGlowSpread: 18,
                  tileGapX: 12,
                  tileGapY: 10,
                  imageTileSize: 180,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adapter-Specific Settings')).toBeInTheDocument();
    expect(screen.getByText('Shape Layout')).toBeInTheDocument();
    expect(screen.getByLabelText('Image Tile Size')).toHaveValue('180');
    expect(screen.getByLabelText('Gap X')).toHaveValue('12');
    expect(screen.getByLabelText('Gap Y')).toHaveValue('10');
    expect(screen.getByText('Tile Appearance')).toBeInTheDocument();
    expect(screen.getByLabelText('Border Width (px)')).toHaveValue('2');
    expect(screen.getByLabelText('Border Color')).toHaveValue('#ff0000');
    expect(shownOption('Hover Bounce')).toBe('Off');
    expect(shownOption('Hover Glow')).toBe('On');
    expect(screen.getByLabelText('Glow Color')).toHaveValue('#00ffaa');
    expect(screen.getByLabelText('Glow Spread (px)')).toHaveValue('18');
  });

  it('renders layout-builder fallback glow defaults for layout-builder selections', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'layout-builder',
                adapterSettings: {
                  layoutBuilderScope: 'viewport',
                  tileGlowColor: '#00ffaa',
                  tileGlowSpread: 18,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adapter-Specific Settings')).toBeInTheDocument();
    expect(shownOption('Layout Builder Scope')).toBe('Viewport Only');
    expect(screen.getByText('Default Glow Spread (px)')).toBeInTheDocument();
    expect(getShownByDisplayValue('18')).toBeInTheDocument();
  });

  it('renders shared common adapter spacing controls from nested common settings', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'compact-grid',
                common: {
                  adapterItemGap: 20,
                  adapterJustifyContent: 'space-between',
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    openAccordionSection('Shared Adapter Sizing');
    expect(await findShownByDisplayValue('20')).toBeInTheDocument();
    expect(shownOption('Adapter Justification')).toBe('Space Between');
  });

  it('renders shared section sizing controls from nested common settings', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'compact-grid',
                common: {
                  sectionMaxWidth: 1200,
                  sectionMinWidth: 350,
                  sectionHeightMode: 'manual',
                  sectionMaxHeight: 640,
                  sectionMinHeight: 240,
                  perTypeSectionEqualHeight: true,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    openAccordionSection('Shared Section Sizing');
    expect(await findShownByDisplayValue('1200')).toBeInTheDocument();
    expect(getShownByDisplayValue('350')).toBeInTheDocument();
    expect(shownOption('Section Height Mode')).toBe('Manual (fixed max height)');
    expect(getShownByDisplayValue('640')).toBeInTheDocument();
    expect(getShownByDisplayValue('240')).toBeInTheDocument();
    expect(shownOption('Equal Height Sections (Per-Type)')).toBe('On');
  });

  it('renders shared adapter sizing controls from nested common settings', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'compact-grid',
                common: {
                  adapterSizingMode: 'manual',
                  adapterMaxWidthPct: 85,
                  adapterMaxHeightPct: 90,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    openAccordionSection('Shared Adapter Sizing');
    await waitFor(() => expect(shownOption('Adapter Sizing Mode')).toBe('Manual (custom %)'));
    expect(getShownByDisplayValue('85')).toBeInTheDocument();
    expect(getShownByDisplayValue('90')).toBeInTheDocument();
  });

  it('renders shared gallery height controls from nested common settings', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'classic',
                common: {
                  gallerySizingMode: 'manual',
                  galleryManualHeight: '75vh',
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    openAccordionSection('Shared Gallery Height');
    expect(shownOption('Height Constraint')).toBe('Manually control height');
    expect(screen.getByLabelText('Manual Gallery Height')).toHaveValue('75vh');
  });

  it('renders shared gallery presentation controls from nested common settings', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'compact-grid',
                common: {
                  galleryImageLabel: 'Photos',
                  galleryVideoLabel: 'Clips',
                  galleryLabelJustification: 'center',
                  showGalleryLabelIcon: true,
                  showCampaignGalleryLabels: false,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    openAccordionSection('Shared Gallery Presentation');
    expect(await screen.findByDisplayValue('Photos')).toBeInTheDocument();
    expect(getShownByDisplayValue('Clips')).toBeInTheDocument();
    expect(shownOption('Gallery Label Justification')).toBe('Center');
    expect(shownOption('Show Gallery Label Icons')).toBe('On');
    expect(shownOption('Show Gallery Section Labels')).toBe('Off');
  });

  it('renders scope-specific viewport background controls from nested common settings', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'compact-grid',
                common: {
                  viewportBgType: 'solid',
                  viewportBgColor: '#112233',
                },
              },
              video: {
                adapterId: 'classic',
                common: {
                  viewportBgType: 'gradient',
                  viewportBgGradient: 'linear-gradient(135deg, #123456 0%, #654321 100%)',
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    openAccordionSection('Viewport Backgrounds');
    expect(shownOption('Image Gallery Background')).toBe('Solid Color');
    expect(screen.getByLabelText('Image Gallery Background Color')).toHaveValue('#112233');
    expect(shownOption('Video Gallery Background')).toBe('Gradient');
    expect(screen.getByLabelText('Video Gallery Background Gradient')).toHaveValue(
      'linear-gradient(135deg, #123456 0%, #654321 100%)',
    );
  });

  it('resets draft changes back to the opened baseline', async () => {
    const onSave = vi.fn();

    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{
          mode: 'per-type',
          breakpoints: {
            desktop: {
              image: {
                adapterId: 'masonry',
                adapterSettings: {
                  masonryColumns: 3,
                },
              },
            },
          },
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = await findShownByDisplayValue('3');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /^Reset$/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reset All Changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Gallery Config' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        breakpoints: expect.objectContaining({
          desktop: expect.objectContaining({
            image: expect.objectContaining({
              adapterSettings: expect.objectContaining({ masonryColumns: 3 }),
            }),
          }),
        }),
      }),
    );
  });

  it('renders the optional clear action when provided', async () => {
    render(
      <GalleryConfigEditorModal
        opened={true}
        title="Responsive Gallery Config"
        value={{ mode: 'per-type' }}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onClear={vi.fn()}
        contextSummary="This campaign is currently inheriting global gallery settings."
        clearLabel="Clear Campaign Overrides"
      />,
    );

    expect(await screen.findByRole('button', { name: 'Clear Campaign Overrides' })).toBeInTheDocument();
    expect(screen.getByText('This campaign is currently inheriting global gallery settings.')).toBeInTheDocument();
  });
});