#!/usr/bin/env bash
# Brings a video's sound to the site's loudness standard, without touching the
# picture: -14 LUFS integrated, with true peaks under -1 dBTP. That's the level
# YouTube and Spotify play at, so the video is as loud as anything else there,
# and YouTube won't turn it down.
#
#   scripts/normalize-loudness.sh input.mp4 [output.mp4]
#
# (Needs ffmpeg. The output defaults to input-14lufs.mp4, next to the input.)
#
# Two passes with ffmpeg's loudnorm filter: the first measures the whole video;
# the second turns it up or down by one steady amount (linear), so nothing is
# squashed. Only if that would push the peaks over -1 dBTP does loudnorm limit
# them, gently. The picture is copied as it is; only the sound is re-encoded
# (AAC, 192 kb/s, 48 kHz).
set -euo pipefail

in="${1:?usage: $0 input.mp4 [output.mp4]}"
out="${2:-${in%.*}-14lufs.${in##*.}}"
target="I=-14:TP=-1:LRA=11"

measure() {
  ffmpeg -hide_banner -nostats -i "$1" -vn -af "loudnorm=$target:print_format=json" -f null - 2>&1 |
    sed -n '/^{/,/^}/p'
}
field() { printf '%s' "$1" | sed -n "s/.*\"$2\" : \"\([^\"]*\)\".*/\1/p"; }

stats=$(measure "$in")
i=$(field "$stats" input_i)
tp=$(field "$stats" input_tp)
lra=$(field "$stats" input_lra)
thresh=$(field "$stats" input_thresh)
offset=$(field "$stats" target_offset)
echo "Before: $i LUFS, peaks at $tp dBTP"

ffmpeg -hide_banner -loglevel error -y -i "$in" -map '0:v?' -map '0:a?' -c:v copy \
  -af "loudnorm=$target:measured_I=$i:measured_TP=$tp:measured_LRA=$lra:measured_thresh=$thresh:offset=$offset:linear=true" \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$out"

after=$(measure "$out")
echo "After:  $(field "$after" input_i) LUFS, peaks at $(field "$after" input_tp) dBTP -> $out"
