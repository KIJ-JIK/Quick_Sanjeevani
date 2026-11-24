import subprocess
import os
import imageio_ffmpeg

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
base_dir = r"C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation"

video_in = os.path.join(base_dir, "quick_sanjeevani_live_demo.mp4")
audio_in = os.path.join(base_dir, "voiceover.wav")
temp_video = os.path.join(base_dir, "temp_video.mp4")
final_out = os.path.join(base_dir, "quick_sanjeevani_live_demo_with_audio.mp4")

# Rename current video to temp
if os.path.exists(temp_video):
    os.remove(temp_video)
os.rename(video_in, temp_video)

# Mux video with audio: copy video stream (super fast, zero quality loss), encode audio to AAC
cmd = [
    ffmpeg_exe,
    "-y",
    "-i", temp_video,
    "-i", audio_in,
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    final_out
]

print("Running ffmpeg mux...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode == 0 and os.path.exists(final_out):
    print("Mux successful!")
    # Replace original video_in with the muxed version
    os.remove(temp_video)
    os.rename(final_out, video_in)
    print(f"Final MP4 with Audio: {video_in} ({os.path.getsize(video_in)} bytes)")
else:
    print("Mux failed, restoring video:")
    print(res.stderr)
    os.rename(temp_video, video_in)
