import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

FRAMES_DIR = r"C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation\frames"
OUT_VIDEO = r"C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation\quick_sanjeevani_live_demo.mp4"
FPS = 30
WIDTH = 1920
HEIGHT = 1080

scenes_info = [
    {
        "file": os.path.join(FRAMES_DIR, "scene1_elder_app.png"),
        "title": "SCENE 1: ELDER COMPANION INTERFACE",
        "caption": "48px Touch Targets · High-Contrast Typography · Zero-Crash Offline SQLite Persistence",
        "sub": "Live at https://kij-jik.github.io/Quick_Sanjeevani/",
        "duration_sec": 14
    },
    {
        "file": os.path.join(FRAMES_DIR, "scene2_whatsapp_bot.png"),
        "title": "SCENE 2: WHATSAPP VOICE BOT & 1-TAP UPI",
        "caption": "Voice Refill ('Dolo 650 bhej do') · <50ms Webhook ACK · Regional Speech & Razorpay UPI Card",
        "sub": "Live at https://kij-jik.github.io/Quick_Sanjeevani/",
        "duration_sec": 16
    },
    {
        "file": os.path.join(FRAMES_DIR, "scene3_catalog.png"),
        "title": "SCENE 3: 62-MEDICINE HYPERLOCAL CATALOG",
        "caption": "Instant Salt Discovery · Generic Substitution · Schedule H Compliance · Verified Bengaluru MRPs",
        "sub": "Live at https://kij-jik.github.io/Quick_Sanjeevani/",
        "duration_sec": 14
    },
    {
        "file": os.path.join(FRAMES_DIR, "scene4_pharmacy_network.png"),
        "title": "SCENE 4: BENGALURU CHEMIST GRID (0.2km - 0.8km)",
        "caption": "Neighborhood Routing (Presidency Gate to Yelahanka) · 15-30 Min Doorstep Fulfillment",
        "sub": "Live at https://kij-jik.github.io/Quick_Sanjeevani/",
        "duration_sec": 14
    },
    {
        "file": os.path.join(FRAMES_DIR, "scene5_company_portal.png"),
        "title": "SCENE 5: PHARMACY PORTAL & REGULATORY STAMP",
        "caption": "Licensed Pharmacist Digital Stamp (KA-PH-49201) · Dispatch Queue · 76/76 Tests Pass (100%)",
        "sub": "Live at https://kij-jik.github.io/Quick_Sanjeevani/",
        "duration_sec": 16
    }
]

# Try loading TrueType font, fallback to default
try:
    font_large = ImageFont.truetype("arial.ttf", 34)
    font_med = ImageFont.truetype("arial.ttf", 26)
    font_small = ImageFont.truetype("arial.ttf", 20)
    font_pill = ImageFont.truetype("arialbd.ttf", 20)
except Exception:
    font_large = ImageFont.load_default()
    font_med = ImageFont.load_default()
    font_small = ImageFont.load_default()
    font_pill = ImageFont.load_default()

def draw_overlay(frame_bgr, scene, progress):
    """Draws sleek lower-third subtitle banner, live watermark, and subtle pan animation."""
    # Convert BGR to RGB PIL Image
    img_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)
    draw = ImageDraw.Draw(pil_img, "RGBA")

    # 1. Top live banner
    draw.rectangle([(0, 0), (WIDTH, 44)], fill=(11, 11, 16, 230))
    # Green live indicator dot
    draw.ellipse([(24, 16), (36, 28)], fill=(38, 166, 154, 255))
    draw.text((46, 12), "LIVE DEPLOYED DEMONSTRATION · GITHUB PAGES", font=font_small, fill=(255, 255, 255, 240))
    draw.text((WIDTH - 420, 12), "wHACKiest 2026 · Track 3: Know Thyself", font=font_small, fill=(200, 200, 210, 200))

    # 2. Lower-third background (gradient dark glass)
    banner_y1 = HEIGHT - 160
    banner_y2 = HEIGHT - 16
    draw.rectangle([(24, banner_y1), (WIDTH - 24, banner_y2)], fill=(15, 20, 32, 235), outline=(0, 121, 107, 180), width=2)

    # Accent pill tag
    pill_w = 260
    draw.rectangle([(44, banner_y1 + 18), (44 + pill_w, banner_y1 + 52)], fill=(0, 121, 107, 240))
    draw.text((56, banner_y1 + 22), "QUICK SANJEEVANI", font=font_pill, fill=(255, 255, 255, 255))

    # Title
    draw.text((44 + pill_w + 16, banner_y1 + 18), scene["title"], font=font_large, fill=(255, 255, 255, 255))

    # Caption / description
    draw.text((44, banner_y1 + 64), scene["caption"], font=font_med, fill=(224, 242, 241, 255))

    # URL / Subtitle
    draw.text((44, banner_y1 + 104), f"🔗 {scene['sub']} · Real-Time Deployed Production Architecture", font=font_small, fill=(160, 175, 190, 230))

    # Progress bar along the bottom of the lower-third
    bar_w = int((WIDTH - 96) * progress)
    draw.rectangle([(48, banner_y2 - 8), (48 + bar_w, banner_y2 - 4)], fill=(38, 166, 154, 255))

    # Convert back to BGR
    result_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return result_bgr

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(OUT_VIDEO, fourcc, FPS, (WIDTH, HEIGHT))

total_scenes = len(scenes_info)
print(f"Starting video assembly: {total_scenes} scenes -> {OUT_VIDEO}")

for idx, sc in enumerate(scenes_info):
    base_frame = cv2.imread(sc["file"])
    if base_frame is None:
        print(f"Warning: could not read {sc['file']}, generating blank frame")
        base_frame = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    else:
        base_frame = cv2.resize(base_frame, (WIDTH, HEIGHT))

    frames_count = sc["duration_sec"] * FPS
    transition_frames = 15  # 0.5s transition

    print(f"Rendering {sc['title']} ({frames_count} frames)...")
    for f in range(frames_count):
        # Progress within scene
        p = f / float(frames_count)

        # Subtle dynamic pan / zoom: slight scale 1.0 -> 1.03 for cinematic camera feel
        zoom = 1.0 + 0.03 * p
        h_zoom = int(HEIGHT / zoom)
        w_zoom = int(WIDTH / zoom)
        y1 = int((HEIGHT - h_zoom) * 0.4)
        x1 = int((WIDTH - w_zoom) * 0.5)
        cropped = base_frame[y1:y1+h_zoom, x1:x1+w_zoom]
        current_frame = cv2.resize(cropped, (WIDTH, HEIGHT))

        # Fade in transition at start of scene (except first scene)
        if idx > 0 and f < transition_frames:
            alpha = f / float(transition_frames)
            current_frame = cv2.convertScaleAbs(current_frame, alpha=alpha)

        # Fade out transition at end of final scene
        if idx == total_scenes - 1 and f > frames_count - transition_frames:
            alpha = (frames_count - f) / float(transition_frames)
            current_frame = cv2.convertScaleAbs(current_frame, alpha=alpha)

        # Apply HUD overlay
        final_frame = draw_overlay(current_frame, sc, p)
        out.write(final_frame)

out.release()
print(f"[DONE] Video rendered successfully: {OUT_VIDEO}")
file_size = os.path.getsize(OUT_VIDEO)
print(f"File size: {file_size / (1024*1024):.2f} MB")
