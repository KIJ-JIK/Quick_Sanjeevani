$server = Start-Process python -ArgumentList "-m", "http.server", "8089", "--directory", "C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\docs" -PassThru
Start-Sleep -Seconds 2

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = "C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation\frames"

$scenes = @(
    @{ id = "scene1_elder_app"; url = "http://localhost:8089/?tab=elder-app" },
    @{ id = "scene2_whatsapp_bot"; url = "http://localhost:8089/?tab=whatsapp-bot&action=order" },
    @{ id = "scene3_catalog"; url = "http://localhost:8089/?tab=medicine-catalog&action=search" },
    @{ id = "scene4_pharmacy_network"; url = "http://localhost:8089/?tab=pharmacy-network" },
    @{ id = "scene5_company_portal"; url = "http://localhost:8089/?tab=company-portal&action=verify" }
)

foreach ($s in $scenes) {
    $outFile = Join-Path $outDir "$($s.id).png"
    Write-Host "Capturing $($s.id) from $($s.url)..."
    Start-Process -FilePath $edge -ArgumentList "--headless=new", "--hide-scrollbars", "--virtual-time-budget=2000", "--window-size=1920,1080", "--screenshot=$outFile", $s.url -Wait
    $size = (Get-Item $outFile).Length
    Write-Host "  -> $outFile ($size bytes)"
}

Stop-Process -Id $server.Id -Force
Write-Host "Completed capturing all scenes."
