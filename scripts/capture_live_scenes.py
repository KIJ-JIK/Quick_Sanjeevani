import subprocess
import time
import os

BASE_URL = "https://kij-jik.github.io/Quick_Sanjeevani/"
OUTPUT_DIR = r"C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation\frames"
EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

os.makedirs(OUTPUT_DIR, exist_ok=True)

scenes = [
    {
        "id": "scene1_elder_app",
        "url": f"{BASE_URL}?tab=elder-app",
        "desc": "Elder Companion & Adherence Timeline"
    },
    {
        "id": "scene2_whatsapp_bot",
        "url": f"{BASE_URL}?tab=whatsapp-bot&action=order",
        "desc": "WhatsApp Voice Refill with UPI Payment Card"
    },
    {
        "id": "scene3_catalog",
        "url": f"{BASE_URL}?tab=medicine-catalog&action=search",
        "desc": "Hyperlocal 62-Medicine Live Catalog & Search"
    },
    {
        "id": "scene4_pharmacy_network",
        "url": f"{BASE_URL}?tab=pharmacy-network",
        "desc": "Bengaluru 5-Chemist Hyperlocal Delivery Grid"
    },
    {
        "id": "scene5_company_portal",
        "url": f"{BASE_URL}?tab=company-portal&action=verify",
        "desc": "Pharmacist Digital Stamp & Dispatch Queue"
    }
]

for s in scenes:
    out_file = os.path.join(OUTPUT_DIR, f"{s['id']}.png")
    cmd = [
        EDGE_EXE,
        "--headless=new",
        "--hide-scrollbars",
        "--window-size=1920,1080",
        f"--screenshot={out_file}",
        s["url"]
    ]
    print(f"Capturing {s['id']} ({s['desc']})...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(out_file) and os.path.getsize(out_file) > 1000:
        print(f"  [OK] {out_file} ({os.path.getsize(out_file)} bytes)")
    else:
        print(f"  [FAIL] Could not capture {s['id']}")

print("All captures completed.")
