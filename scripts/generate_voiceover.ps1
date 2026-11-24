$voice = New-Object -ComObject SAPI.SpVoice
$stream = New-Object -ComObject SAPI.SpFileStream
$outFile = "C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani\presentation\voiceover.wav"
$stream.Open($outFile, 3) # 3 = SSFMCreateForWrite
$voice.AudioOutputStream = $stream

# Set rate to +1 (slightly crisper pace) so it speaks cleanly and engagingly
$voice.Rate = 1

$scriptText = @"
Here is our live deployed application on GitHub Pages.
We start with the Elder Companion interface, specifically engineered with 48-pixel touch targets, high contrast typography, and zero-crash offline SQLite storage for our senior citizens.
Next, our multilingual WhatsApp Voice Bot. An elder simply says: Dolo 650 bhej do. The system parses speech in Hindi, English, or Kannada, acknowledges under 50 milliseconds, and delivers an instant 1-tap Razorpay UPI payment card right in chat.
Here is our live medicine catalog of 62 pre-seeded formulations. Fuzzy search instantly resolves generic salt alternatives, verified MRPs, and real-time strip availability across Bengaluru.
Orders route automatically to our hyperlocal chemist grid, connecting registered neighborhood pharmacies, from Presidency University Gate to Yelahanka, guaranteeing 15 to 30 minute doorstep delivery.
Finally, the Pharmacy Verification Portal. Licensed pharmacists digitally sign every prescription before dispatch, backed by an end-to-end architecture validated by 76 passing automated tests.
Quick Sanjeevani: making healthcare accessible, reliable, and gentle for every elder.
Thank you!
"@

$voice.Speak($scriptText)
$stream.Close()

Write-Host "Voiceover file created successfully."
Get-Item $outFile | Select-Object Name, Length
