import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
import subprocess
import imageio_ffmpeg

BASE_DIR = r"C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation"
FRAMES_DIR = os.path.join(BASE_DIR, "frames")
AUDIO_IN = os.path.join(BASE_DIR, "voiceover.wav")
FINAL_OUT = os.path.join(BASE_DIR, "quick_sanjeevani_live_demo.mp4")

FPS = 30
WIDTH = 1920
HEIGHT = 1080

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

# Subtitle timeline matching audio voiceover exactly
SUBTITLES = [
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene1_elder_app.png"),
        "t_start": 0.0,
        "t_end": 6.0,
        "tag": "TAB 1/5: ELDER COMPANION",
        "header": "📱 ELDER MOBILE COMPANION APP",
        "text": "Here is our live deployed application on GitHub Pages.",
        "highlight": "LIVE AT: https://kij-jik.github.io/Quick_Sanjeevani/"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene1_elder_app.png"),
        "t_start": 6.0,
        "t_end": 14.0,
        "tag": "TAB 1/5: ELDER COMPANION",
        "header": "👵 ACCESSIBILITY & OFFLINE PERSISTENCE",
        "text": "We start with the Elder Companion interface: 48px touch targets, high contrast, and zero-crash offline SQLite storage.",
        "highlight": "48px Touch Targets · High Contrast AAA · Offline SQLite Resilience"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene2_whatsapp_bot.png"),
        "t_start": 14.0,
        "t_end": 21.5,
        "tag": "TAB 2/5: WHATSAPP BOT",
        "header": "💬 MULTILINGUAL WHATSAPP VOICE BOT",
        "text": "Next, our multilingual WhatsApp Voice Bot: an elder simply says \"Dolo 650 bhej do\".",
        "highlight": "Voice Order: 'Dolo 650 bhej do' · Hindi · Kannada · English"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene2_whatsapp_bot.png"),
        "t_start": 21.5,
        "t_end": 30.0,
        "tag": "TAB 2/5: WHATSAPP BOT",
        "header": "⚡ 50MS WEBHOOK & 1-TAP RAZORPAY UPI",
        "text": "Sub-50ms webhook acknowledgment, multi-language speech, and instant Razorpay UPI card right in chat.",
        "highlight": "Instant UPI Card in WhatsApp · Solves Business API Limitations"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene3_catalog.png"),
        "t_start": 30.0,
        "t_end": 37.2,
        "tag": "TAB 3/5: MEDICINE CATALOG",
        "header": "💊 62-MEDICINE HYPERLOCAL CATALOG",
        "text": "Here is our live medicine catalog of 62 pre-seeded formulations.",
        "highlight": "62 Formulations · Real Bengaluru MRPs · Verified Stock Levels"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene3_catalog.png"),
        "t_start": 37.2,
        "t_end": 45.0,
        "tag": "TAB 3/5: MEDICINE CATALOG",
        "header": "🔍 FUZZY SALT SEARCH & GENERIC MATCHING",
        "text": "Fuzzy search instantly resolves generic salt alternatives, verified MRPs, and real-time strip availability.",
        "highlight": "Instant Generic Salt Substitutions · Schedule H / Rx Filtering"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene4_pharmacy_network.png"),
        "t_start": 45.0,
        "t_end": 52.0,
        "tag": "TAB 4/5: CHEMIST GRID",
        "header": "🏪 BENGALURU CHEMIST DELIVERY GRID",
        "text": "Orders route automatically to our hyperlocal Bengaluru chemist grid.",
        "highlight": "Hyperlocal Proximity Matching · Pincode 560064 Network"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene4_pharmacy_network.png"),
        "t_start": 52.0,
        "t_end": 59.5,
        "tag": "TAB 4/5: CHEMIST GRID",
        "header": "📍 0.2KM TO 0.8KM NEIGHBORHOOD CHEMISTS",
        "text": "Connecting registered neighborhood pharmacies—from Presidency Gate to Yelahanka—for 15 to 30 minute delivery.",
        "highlight": "Presidency University Gate (0.2km) · 15 to 30 Min Doorstep Delivery"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene5_company_portal.png"),
        "t_start": 59.5,
        "t_end": 67.0,
        "tag": "TAB 5/5: PHARMACY PORTAL",
        "header": "🏢 PHARMACIST DIGITAL STAMP VERIFICATION",
        "text": "Finally, the Pharmacy Verification Portal: licensed pharmacists digitally sign every prescription before dispatch.",
        "highlight": "Pharmacist License Stamp: KA-PH-49201 · Legal & Clinical Compliance"
    },
    {
        "scene_file": os.path.join(FRAMES_DIR, "scene5_company_portal.png"),
        "t_start": 67.0,
        "t_end": 74.0,
        "tag": "TAB 5/5: PHARMACY PORTAL",
        "header": "✅ 76/76 AUTOMATED TESTS PASSED (100%)",
        "text": "Backed by an end-to-end architecture validated by 76 passing automated tests. Quick Sanjeevani.",
        "highlight": "Full E2E Automated Coverage · Reliable Healthcare for Every Elder"
    }
]

TOTAL_DURATION = 74.0
TOTAL_FRAMES = int(TOTAL_DURATION * FPS)

# Load fonts
try:
    font_top = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 22)
    font_tag = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 20)
    font_hdr = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 28)
    font_sub = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 34)
    font_hl = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 22)
except Exception:
    font_top = font_tag = font_hdr = font_sub = font_hl = ImageFont.load_default()

# Preload unique scene images
scene_cache = {}
for item in SUBTITLES:
    fn = item["scene_file"]
    if fn not in scene_cache:
        img = cv2.imread(fn)
        if img is None:
            img = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
        else:
            img = cv2.resize(img, (WIDTH, HEIGHT))
        scene_cache[fn] = img

def get_current_subtitle(t):
    for sub in SUBTITLES:
        if sub["t_start"] <= t < sub["t_end"]:
            return sub
    return SUBTITLES[-1]

def draw_frame(t, frame_idx):
    sub = get_current_subtitle(t)
    base = scene_cache[sub["scene_file"]]

    # Subtle cinematic zoom: 1.0 -> 1.025 per scene
    scene_dur = sub["t_end"] - sub["t_start"]
    rel_p = (t - sub["t_start"]) / scene_dur if scene_dur > 0 else 0
    zoom = 1.0 + 0.02 * rel_p
    h_z = int(HEIGHT / zoom)
    w_z = int(WIDTH / zoom)
    y1 = int((HEIGHT - h_z) * 0.45)
    x1 = int((WIDTH - w_z) * 0.5)
    cropped = base[y1:y1+h_z, x1:x1+w_z]
    current = cv2.resize(cropped, (WIDTH, HEIGHT))

    # Convert to PIL
    pil_img = Image.fromarray(cv2.cvtColor(current, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img, "RGBA")

    # 1. Top status header
    draw.rectangle([(0, 0), (WIDTH, 48)], fill=(10, 15, 25, 240))
    # Pulsing live dot
    dot_color = (0, 230, 118, 255) if (frame_idx // 15) % 2 == 0 else (0, 200, 83, 255)
    draw.ellipse([(28, 16), (44, 32)], fill=dot_color)
    draw.text((54, 12), "LIVE DEPLOYED DEMONSTRATION · QUICK SANJEEVANI", font=font_top, fill=(255, 255, 255, 255))
    draw.text((WIDTH - 480, 12), "https://kij-jik.github.io/Quick_Sanjeevani/", font=font_top, fill=(178, 223, 219, 255))

    # 2. Main Subtitle Box (Prominent, High-Contrast Lower Third)
    box_w = 1760
    box_x1 = int((WIDTH - box_w) / 2)
    box_x2 = box_x1 + box_w
    box_y1 = HEIGHT - 210
    box_y2 = HEIGHT - 24

    # Background card (deep glass rounded box with double border)
    draw.rounded_rectangle([(box_x1, box_y1), (box_x2, box_y2)], radius=18, fill=(8, 14, 26, 248), outline=(0, 150, 136, 255), width=3)

    # Accent tab badge (e.g. TAB 2/5: WHATSAPP BOT)
    tag_w = 320
    draw.rounded_rectangle([(box_x1 + 24, box_y1 + 16), (box_x1 + 24 + tag_w, box_y1 + 52)], radius=8, fill=(0, 121, 107, 255))
    draw.text((box_x1 + 38, box_y1 + 22), sub["tag"], font=font_tag, fill=(255, 255, 255, 255))

    # Scene Header
    draw.text((box_x1 + tag_w + 44, box_y1 + 20), sub["header"], font=font_hdr, fill=(255, 215, 64, 255))

    # Subtitle Text (Large, 34px bold, crisp white)
    draw.text((box_x1 + 28, box_y1 + 68), sub["text"], font=font_sub, fill=(255, 255, 255, 255))

    # Highlight metadata pill (bottom row)
    draw.text((box_x1 + 28, box_y1 + 124), f"✨ {sub['highlight']}", font=font_hl, fill=(128, 203, 196, 255))

    # Segment progress bar inside subtitle card
    sub_progress = (t - sub["t_start"]) / (sub["t_end"] - sub["t_start"])
    p_bar_w = int((box_w - 56) * max(0.0, min(1.0, sub_progress)))
    draw.rounded_rectangle([(box_x1 + 28, box_y2 - 12), (box_x1 + 28 + p_bar_w, box_y2 - 6)], radius=3, fill=(0, 230, 118, 255))

    # Global video progress line at very bottom edge
    global_p = t / TOTAL_DURATION
    draw.rectangle([(0, HEIGHT - 4), (int(WIDTH * global_p), HEIGHT)], fill=(255, 215, 64, 255))

    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

# Launch ffmpeg pipeline: rawvideo from stdin + voiceover.wav -> H.264 + AAC
cmd = [
    ffmpeg_exe,
    "-y",
    # Input 0: rawvideo from stdin
    "-f", "rawvideo",
    "-pix_fmt", "bgr24",
    "-s", f"{WIDTH}x{HEIGHT}",
    "-r", str(FPS),
    "-i", "-",
    # Input 1: audio file
    "-i", AUDIO_IN,
    # Video encoding: H.264, standard 8-bit yuv420p
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-level", "4.1",
    # Audio encoding: AAC stereo 44.1kHz with volume normalization boost
    "-c:a", "aac",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", "256k",
    "-filter:a", "volume=2.2,loudnorm=I=-16:TP=-1.5:LRA=11",
    # Faststart: web-optimized moov atom at beginning
    "-movflags", "+faststart",
    "-shortest",
    "-t", str(TOTAL_DURATION),
    FINAL_OUT
]

print("Launching ffmpeg video + audio encoding pipeline...")
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

print(f"Piping {TOTAL_FRAMES} frames ({TOTAL_DURATION}s @ {FPS}fps) into ffmpeg...")

for f in range(TOTAL_FRAMES):
    t = f / float(FPS)
    frame_bgr = draw_frame(t, f)
    proc.stdin.write(frame_bgr.tobytes())
    if f % 150 == 0:
        print(f"  Progress: frame {f}/{TOTAL_FRAMES} ({t:.1f}s)...", flush=True)

proc.stdin.close()
out, err = proc.communicate()

if proc.returncode == 0:
    print(f"\n[SUCCESS] Rendered 1080p MP4 with AAC Audio & Burned-in Subtitles:")
    print(f"  Output: {FINAL_OUT}")
    print(f"  File size: {os.path.getsize(FINAL_OUT) / (1024*1024):.2f} MB")
else:
    print("\n[ERROR] ffmpeg failed:")
    print(err.decode('utf-8', errors='ignore'))
