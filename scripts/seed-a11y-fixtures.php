<?php
/**
 * Seed a WordPress install with the content the manual accessibility audit needs.
 *
 * Creates campaigns, generated images with and without alt text (the gallery's alt
 * text is the media item's `caption`, falling back to its `title`), a video, a large
 * set for paging and the lightbox, a long title for reflow, a category, a tag, an
 * archived campaign, and a page carrying the gallery shortcode. Everything it creates
 * is marked, so `cleanup` removes exactly that and nothing else.
 *
 * Usage, from the WordPress root:
 *   wp eval-file /path/to/scripts/seed-a11y-fixtures.php --user=<admin login or email>
 *   wp eval-file /path/to/scripts/seed-a11y-fixtures.php cleanup --user=<admin login or email>
 *
 * Campaigns and media go through the plugin's own REST routes in-process, so they
 * pass the same validation the admin UI does.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( "Run with wp eval-file.\n" );
}

const MULLION_A11Y_MARK = '_mullion_a11y_fixture';

$mode = $args[0] ?? 'seed';

if ( ! current_user_can( 'manage_options' ) ) {
	WP_CLI::error( 'Run as an administrator: add --user=<admin login or email>.' );
}

// The plugin's admin routes check a REST nonce, as for a cookie session; this is the
// running user's own, the same token the admin UI sends.
$_SERVER['HTTP_X_WP_NONCE'] = wp_create_nonce( 'wp_rest' );

/** Every post this script created, of any type. */
function mullion_a11y_marked_posts(): array {
	return get_posts( [
		// Named, not 'any': 'any' skips types excluded from search, which campaigns are.
		'post_type'   => [ 'mullion_campaign', 'attachment', 'page' ],
		'post_status' => 'any',
		'numberposts' => -1,
		'meta_key'    => MULLION_A11Y_MARK,
		'fields'      => 'ids',
	] );
}

if ( 'cleanup' === $mode ) {
	foreach ( mullion_a11y_marked_posts() as $id ) {
		'attachment' === get_post_type( $id ) ? wp_delete_attachment( $id, true ) : wp_delete_post( $id, true );
	}
	foreach ( [ 'mullion_campaign_category', 'mullion_campaign_tag' ] as $tax ) {
		foreach ( get_terms( [ 'taxonomy' => $tax, 'hide_empty' => false, 'meta_key' => MULLION_A11Y_MARK ] ) as $term ) {
			wp_delete_term( $term->term_id, $tax );
		}
	}
	WP_CLI::success( 'Removed every fixture this script created.' );
	return;
}

if ( mullion_a11y_marked_posts() ) {
	WP_CLI::error( 'Fixtures already exist. Run with `cleanup` first to reseed.' );
}

/** Call a plugin REST route as the current user, failing loudly. */
function mullion_a11y_rest( string $method, string $route, array $body = [] ) {
	$request = new WP_REST_Request( $method, '/mullion-gallery/v1' . $route );
	$request->set_header( 'content-type', 'application/json' );
	$request->set_body( wp_json_encode( $body ) );
	$response = rest_do_request( $request );
	if ( $response->is_error() ) {
		$error = $response->as_error();
		WP_CLI::error( "{$method} {$route}: " . $error->get_error_message() );
	}
	return $response->get_data();
}

/** A labelled test image, so a tester can tell which item a screen reader is describing. */
function mullion_a11y_image( string $label, int $index ): int {
	$w   = 1200;
	$h   = 800;
	$img = imagecreatetruecolor( $w, $h );
	$hue = ( $index * 47 ) % 360;
	for ( $y = 0; $y < $h; $y++ ) {
		[ $r, $g, $b ] = mullion_a11y_hsl( $hue, 0.45, 0.25 + 0.35 * $y / $h );
		imageline( $img, 0, $y, $w, $y, imagecolorallocate( $img, $r, $g, $b ) );
	}
	$white = imagecolorallocate( $img, 255, 255, 255 );
	imagefilledellipse( $img, (int) ( $w * 0.7 ), (int) ( $h * 0.35 ), 260, 260, imagecolorallocatealpha( $img, 255, 255, 255, 80 ) );
	$font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
	if ( function_exists( 'imagettftext' ) && file_exists( $font ) ) {
		imagettftext( $img, 54, 0, 60, $h - 90, $white, $font, $label );
	} else {
		imagestring( $img, 5, 60, $h - 90, $label, $white );
	}
	$path = wp_tempnam( 'mullion-a11y' ) . '.png';
	imagepng( $img, $path );
	imagedestroy( $img );

	$file = [ 'name' => sanitize_file_name( 'a11y-' . $index . '-' . $label ) . '.png', 'tmp_name' => $path ];
	$id   = media_handle_sideload( $file, 0, $label );
	if ( is_wp_error( $id ) ) {
		@unlink( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors -- best effort; the upload already failed.
		WP_CLI::error( 'Image upload failed: ' . $id->get_error_message() . ' Run as the web server user, e.g. sudo -u www-data wp ...' );
	}
	update_post_meta( $id, MULLION_A11Y_MARK, 1 );
	return $id;
}

function mullion_a11y_hsl( float $h, float $s, float $l ): array {
	$c = ( 1 - abs( 2 * $l - 1 ) ) * $s;
	$x = $c * ( 1 - abs( fmod( $h / 60, 2 ) - 1 ) );
	$m = $l - $c / 2;
	$rgb = $h < 60 ? [ $c, $x, 0 ] : ( $h < 120 ? [ $x, $c, 0 ] : ( $h < 180 ? [ 0, $c, $x ] : ( $h < 240 ? [ 0, $x, $c ] : ( $h < 300 ? [ $x, 0, $c ] : [ $c, 0, $x ] ) ) ) );
	return array_map( fn( $v ) => (int) round( ( $v + $m ) * 255 ), $rgb );
}

/**
 * One campaign. Each item is [label, caption, title]: caption is the alt text, title
 * its fallback, and both empty is the "no text alternative" case the audit looks for.
 */
function mullion_a11y_campaign( string $title, string $description, array $items, array $terms = [] ): int {
	static $counter = 0;
	$campaign = mullion_a11y_rest( 'POST', '/campaigns', [ 'title' => $title, 'description' => $description ] );
	$id       = (int) ( $campaign['id'] ?? 0 );
	update_post_meta( $id, MULLION_A11Y_MARK, 1 );
	foreach ( $items as $order => $item ) {
		[ $label, $caption, $item_title ] = $item + [ '', '', '' ];
		if ( str_starts_with( $label, 'https://' ) ) {
			mullion_a11y_rest( 'POST', "/campaigns/{$id}/media", [
				'type' => 'video', 'source' => 'external', 'url' => $label,
				'caption' => $caption, 'title' => $item_title, 'order' => $order,
			] );
			continue;
		}
		$attachment = mullion_a11y_image( $label, ++$counter );
		mullion_a11y_rest( 'POST', "/campaigns/{$id}/media", [
			'type' => 'image', 'source' => 'upload', 'attachmentId' => $attachment,
			'caption' => $caption, 'title' => $item_title, 'order' => $order,
		] );
	}
	foreach ( $terms as $taxonomy => $names ) {
		$ids = [];
		foreach ( (array) $names as $name ) {
			$term = term_exists( $name, $taxonomy ) ?: wp_insert_term( $name, $taxonomy );
			$ids[] = (int) $term['term_id'];
			update_term_meta( (int) $term['term_id'], MULLION_A11Y_MARK, 1 );
		}
		wp_set_object_terms( $id, $ids, $taxonomy );
	}
	WP_CLI::log( "Campaign {$id}: {$title} (" . count( $items ) . ' items)' );
	return $id;
}

$coast = [];
foreach ( [ 'Harbour at dawn', 'Cliff path', 'Lighthouse', 'Rock pools', 'Fishing boats', 'Dunes', 'Tidal flats', 'Sunset over the bay' ] as $label ) {
	$coast[] = [ $label, "{$label}, photographed on the coastal walk", $label ];
}
mullion_a11y_campaign(
	'A11Y Coastal walk',
	'Eight images, every one with alt text. The baseline for the lightbox and carousel checks.',
	$coast,
	[ 'mullion_campaign_category' => 'A11Y Landscapes', 'mullion_campaign_tag' => 'a11y-fixture' ]
);

mullion_a11y_campaign(
	'A11Y Alt text cases',
	'Each image tests one alt-text case. Its label says which, so a tester can compare what is spoken with what should be.',
	[
		[ 'Caption as alt', 'A red door in a white wall', 'Red door' ],
		[ 'Title only', '', 'Blue bicycle against railings' ],
		[ 'No text at all', '', '' ],
		[ 'Long caption', 'A crowded market street at noon, with stalls of fruit on the left, a fishmonger on the right, and a church tower closing the view at the far end of the street', 'Market street' ],
		[ 'Caption with symbols', 'Café & bakery: "Le Pain" (est. 1920)', 'Café' ],
	],
	[ 'mullion_campaign_category' => 'A11Y Street', 'mullion_campaign_tag' => 'a11y-fixture' ]
);

mullion_a11y_campaign(
	'A11Y A campaign with a deliberately long title, to check wrapping at 320px wide and at 200% zoom',
	'Three images. The title is long on purpose; it should wrap, never clip or force horizontal scrolling.',
	[ [ 'Wrap one', 'First image for the long-title campaign', '' ], [ 'Wrap two', 'Second image for the long-title campaign', '' ], [ 'Wrap three', 'Third image for the long-title campaign', '' ] ],
	[ 'mullion_campaign_tag' => 'a11y-fixture' ]
);

mullion_a11y_campaign(
	'A11Y Video and images',
	'A YouTube video between two images, for the video player and mixed-media checks.',
	[
		[ 'Before the video', 'Still image before the video', '' ],
		[ 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'Big Buck Bunny, an open movie by the Blender Foundation', 'Big Buck Bunny' ],
		[ 'After the video', 'Still image after the video', '' ],
	],
	[ 'mullion_campaign_category' => 'A11Y Landscapes', 'mullion_campaign_tag' => 'a11y-fixture' ]
);

$many = [];
for ( $i = 1; $i <= 24; $i++ ) {
	$many[] = [ "Item {$i} of 24", "Numbered test image {$i} of 24", "Item {$i}" ];
}
mullion_a11y_campaign(
	'A11Y Large set',
	'Twenty-four images, for paging, load-more, lightbox position announcements and carousel dots.',
	$many,
	[ 'mullion_campaign_category' => 'A11Y Street', 'mullion_campaign_tag' => 'a11y-fixture' ]
);

$archived = mullion_a11y_campaign(
	'A11Y Archived campaign',
	'Archived on purpose, for the admin panel\'s archive and restore controls. It should not appear on the public gallery.',
	[ [ 'Archived image', 'An image in an archived campaign', '' ] ]
);
mullion_a11y_rest( 'POST', "/campaigns/{$archived}/archive" );

for ( $i = 1; $i <= 7; $i++ ) {
	mullion_a11y_campaign(
		"A11Y Filler campaign {$i}",
		'Filler, so the listing has enough cards to page.',
		[ [ "Filler {$i}", "Cover image for filler campaign {$i}", '' ] ],
		[ 'mullion_campaign_tag' => 'a11y-fixture' ]
	);
}

$page = wp_insert_post( [
	'post_type'    => 'page',
	'post_status'  => 'publish',
	'post_title'   => 'A11Y test gallery',
	'post_content' => "<!-- wp:paragraph -->\n<p>Accessibility audit page. The gallery below is seeded by scripts/seed-a11y-fixtures.php.</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:shortcode -->\n[mullion-gallery]\n<!-- /wp:shortcode -->",
] );
update_post_meta( $page, MULLION_A11Y_MARK, 1 );

WP_CLI::success( 'Seeded. Gallery page: ' . get_permalink( $page ) );
