$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = "C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation\frames"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$base = "file:///C:/Users/anshv/.gemini/antigravity/scratch/quick_sanjeevani/docs/index.html"

$scenes = @(
    @{ id = "scene1_elder_app"; url = "$base?tab=elder-app" },
    @{ id = "scene2_whatsapp_bot"; url = "$base?tab=whatsapp-bot&action=order" },
    @{ id = "scene3_catalog"; url = "$base?tab=medicine-catalog&action=search" },
    @{ id = "scene4_pharmacy_network"; url = "$base?tab=pharmacy-network" },
    @{ id = "scene5_company_portal"; url = "$base?tab=company-portal&action=verify" }
)

foreach ($s in $scenes) {
    $outFile = Join-Path $outDir "$($s.id).png"
    Write-Host "Capturing $($s.id)..."
    Start-Process -FilePath $edge -ArgumentList "--headless=new", "--hide-scrollbars", "--virtual-time-budget=2000", "--window-size=1920,1080", "--screenshot=$outFile", $s.url -Wait
    if (Test-Path $outFile) {
        $size = (Get-Item $outFile).Length
        Write-Host "  Captured $outFile ($size bytes)"
    }
}
Write-Host "All scenes captured successfully."
