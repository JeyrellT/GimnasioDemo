import {
	deriveVideoThumbnail,
	firstSupportedVideoUrl,
} from "@/lib/media/video-url";

interface RoutineExerciseMediaSources {
	routineMediaUrl?: string | null;
	trainerMediaUrl?: string | null;
	catalogMediaUrl?: string | null;
	catalogThumbnailUrl?: string | null;
	catalogGifUrl?: string | null;
}

/**
 * Resolves the thumbnail shown by the routine builder and frozen snapshots.
 *
 * Video-derived posters take precedence because legacy catalog thumbnail
 * paths may point to files that no longer exist in `public/exercises`.
 */
export function resolveRoutineExerciseThumbnail({
	routineMediaUrl,
	trainerMediaUrl,
	catalogMediaUrl,
	catalogThumbnailUrl,
	catalogGifUrl,
}: RoutineExerciseMediaSources): string | null {
	const playableVideo = firstSupportedVideoUrl(
		routineMediaUrl,
		trainerMediaUrl,
		catalogMediaUrl,
	);

	return (
		deriveVideoThumbnail(playableVideo) ??
		catalogThumbnailUrl ??
		catalogGifUrl ??
		null
	);
}
