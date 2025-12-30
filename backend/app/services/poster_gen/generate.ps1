# generate.ps1
# Generate event posters with SDXL-Lightning + AI Keywords
# FAST: ~10 seconds per poster!

# =============================================================================
# CONFIGURATION - EDIT THESE FOR YOUR EVENT
# =============================================================================

$EventTitle = "Hackathon"
$Subtitle = "Winter Championship"
$Date = "December 20-22, 2024"
$Deadline = "Register by December 15"
$Location = "New York Arena"
$Prize = "10,000,000 USD Prize Pool"
$Fee = "USD 150"
$Contact = "contact@sumo.com"

# Generation Settings
$Aesthetic = "premium"      # Options: modern, minimal, premium, dark, vibrant, tech, elegant, gaming
$AspectRatio = "4:5"       # Options: 1:1, 4:5, 9:16, 16:9, 2:3
$OutputFile = "poster.png"
$Seed = 42                 # Change for different variations
$Steps = 8                 # SDXL-Lightning: 4-8 steps (default: 8)
$Guidance = 2.0            # SDXL-Lightning: 1.0-3.0 (default: 2.0)
$SkipAI = $false           # Set to $true to skip AI keywords (faster but less specific)

# =============================================================================
# BUILD PROMPT
# =============================================================================

$Prompt = @"
Title: $EventTitle
Subtitle: $Subtitle
Date: $Date
Deadline: $Deadline
Location: $Location
Prize: $Prize
Fee: $Fee
Contact: $Contact
"@

# =============================================================================
# INFO
# =============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SDXL-Lightning Poster Generator" -ForegroundColor Cyan
Write-Host "  ⚡ With AI-Powered Keywords" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python script exists
if (-not (Test-Path "generate_base_sdxl.py")) {
    Write-Host "ERROR: generate_base_sdxl.py not found" -ForegroundColor Red
    Write-Host "Make sure you're in the correct directory." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "ai_keyword_generator.py")) {
    Write-Host "WARNING: ai_keyword_generator.py not found" -ForegroundColor Yellow
    Write-Host "AI keywords will be disabled. Generation will be less event-specific." -ForegroundColor Yellow
    $SkipAI = $true
    Write-Host ""
}

Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Event: $EventTitle" -ForegroundColor White
Write-Host "  Aesthetic: $Aesthetic" -ForegroundColor White
Write-Host "  Aspect Ratio: $AspectRatio" -ForegroundColor White
Write-Host "  Output: $OutputFile" -ForegroundColor White
Write-Host "  Seed: $Seed" -ForegroundColor White
Write-Host "  Steps: $Steps (Lightning fast!)" -ForegroundColor White
Write-Host "  Guidance: $Guidance" -ForegroundColor White
if ($SkipAI) {
    Write-Host "  AI Keywords: Disabled" -ForegroundColor Yellow
} else {
    Write-Host "  AI Keywords: Enabled ✨" -ForegroundColor Cyan
}
Write-Host ""

Write-Host "NOTE: First run downloads ~6-7GB SDXL-Lightning model" -ForegroundColor Yellow
Write-Host "      (Cached for future use)" -ForegroundColor Yellow
Write-Host ""

# =============================================================================
# GENERATE
# =============================================================================

Write-Host "⚡ Generating poster..." -ForegroundColor Cyan
Write-Host "This will take ~10 seconds..." -ForegroundColor Gray
Write-Host ""

# Build command
$Command = "python generate_base_sdxl.py " +
    "--prompt `"$Prompt`" " +
    "--aesthetic $Aesthetic " +
    "--aspect_ratio $AspectRatio " +
    "--seed $Seed " +
    "--steps $Steps " +
    "--guidance $Guidance " +
    "--out $OutputFile"

# Add skip AI flag if needed
if ($SkipAI) {
    $Command += " --skip_ai_keywords"
}

# Execute
Invoke-Expression $Command

# =============================================================================
# RESULT
# =============================================================================

Write-Host ""

if (Test-Path $OutputFile) {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  ✅ SUCCESS!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Saved to: $OutputFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Speed comparison:" -ForegroundColor Yellow
    Write-Host "  - SDXL-Lightning: ~10 seconds ⚡" -ForegroundColor Green
    Write-Host "  - Base SDXL: ~30-60 seconds 🐌" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Tips for better results:" -ForegroundColor Yellow
    Write-Host "  - Try different seeds: 100, 200, 500, 999, 2024" -ForegroundColor Gray
    Write-Host "  - Try different aesthetics: minimal, premium, dark, vibrant" -ForegroundColor Gray
    Write-Host "  - Adjust guidance: 1.5 (more creative) to 2.5 (more controlled)" -ForegroundColor Gray
    Write-Host "  - Try 4 steps for even faster (slightly lower quality)" -ForegroundColor Gray
    Write-Host ""
    
    $OpenImage = Read-Host "Open the poster now? (y/n)"
    if ($OpenImage -eq "y" -or $OpenImage -eq "Y") {
        Start-Process $OutputFile
    }
}
else {
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  ❌ GENERATION FAILED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Missing dependencies: pip install -r requirements.txt" -ForegroundColor Gray
    Write-Host "  2. No CUDA/GPU: Model will run on CPU (slower)" -ForegroundColor Gray
    Write-Host "  3. Network issues: First download needs internet" -ForegroundColor Gray
    Write-Host "  4. Out of memory: Try lower resolution or batch size" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Check error messages above for details." -ForegroundColor Red
}

# =============================================================================
# QUICK PRESETS
# =============================================================================

Write-Host ""
Write-Host "Quick Presets (edit this script to use):" -ForegroundColor Cyan
Write-Host "  - Gaming Tournament: aesthetic=gaming, guidance=2.0" -ForegroundColor Gray
Write-Host "  - Tech Conference: aesthetic=tech, guidance=2.5" -ForegroundColor Gray
Write-Host "  - Music Festival: aesthetic=vibrant, guidance=1.8" -ForegroundColor Gray
Write-Host "  - Business Event: aesthetic=minimal, guidance=2.5" -ForegroundColor Gray
Write-Host "  - Art Show: aesthetic=elegant, guidance=2.0" -ForegroundColor Gray
Write-Host ""