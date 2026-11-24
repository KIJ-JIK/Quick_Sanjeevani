import subprocess
import os
import imageio_ffmpeg

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

video1_in = r"C:\Users\anshv\OneDrive\Pictures\Camera Roll\WIN_20261124_21_49_33_Pro.mp4"
video2_in = r"C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation\quick_sanjeevani_live_demo.mp4"
final_out = r"C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation\quick_sanjeevani_full_pitch_demo.mp4"

print("Stitching Video 1 (Idea/Pitch) and Video 2 (Live Website Demo)...")

# Filter complex to normalize both to 1080p 30fps and 48kHz stereo, then concatenate
filter_complex = (
    "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v0];"
    "[0:a]aformat=sample_rates=48000:channel_layouts=stereo[a0];"
    "[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v1];"
    "[1:a]aformat=sample_rates=48000:channel_layouts=stereo[a1];"
    "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]"
)

cmd = [
    ffmpeg_exe,
    "-y",
    "-i", video1_in,
    "-i", video2_in,
    "-filter_complex", filter_complex,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "256k",
    "-movflags", "+faststart",
    final_out
]

print("Running ffmpeg concat filter...")
res = subprocess.run(cmd, capture_output=True, text=True)

if res.returncode == 0 and os.path.exists(final_out):
    size_mb = os.path.getsize(final_out) / (1024 * 1024)
    print(f"[SUCCESS] Stitched Full Pitch & Demo Video Created: {final_out} ({size_mb:.2f} MB)")
else:
    print("[ERROR] Failed to stitch videos:")
    print(res.stderr)
