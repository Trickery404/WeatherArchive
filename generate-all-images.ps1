# Generate all test images for February 2026
# Creates images in testdata/ folder (excluded from build)

$outputDir = "testdata"

# Create output directory if it doesn't exist
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Host "Created directory: $outputDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Generating Test Images for February 2026" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load System.Drawing
Add-Type -AssemblyName System.Drawing

# Background colors by hour
$colors = @(
    @{R=52; G=152; B=219},   # 0: Blue
    @{R=46; G=204; B=113},   # 1: Green
    @{R=155; G=89; B=182},   # 2: Purple
    @{R=241; G=196; B=15},   # 3: Yellow
    @{R=231; G=76; B=60},    # 4: Red
    @{R=26; G=188; B=156},   # 5: Turquoise
    @{R=230; G=126; B=34},   # 6: Orange
    @{R=149; G=165; B=166}   # 7: Gray
)

function Generate-WeatherImage {
    param(
        [string]$City,
        [string]$Date,
        [int]$Hour,
        [int]$Minute,
        [decimal]$Temperature,
        [int]$Humidity,
        [int]$Pressure,
        [string]$OutputPath
    )

    # Image dimensions
    $width = 1280
    $height = 720

    # Select color based on hour (keeps same background for all images within an hour)
    $colorIndex = $Hour % $colors.Count
    $bgColor = $colors[$colorIndex]

    # Create bitmap
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    # Set high quality rendering
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Fill background with chosen color (no extra overlay)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($bgColor.R, $bgColor.G, $bgColor.B))
    $graphics.FillRectangle($brush, 0, 0, $width, $height)

    # Create fonts (only date + time used)
    $fontDate = New-Object System.Drawing.Font("Arial", 64, [System.Drawing.FontStyle]::Bold)
    $fontTime = New-Object System.Drawing.Font("Arial", 96, [System.Drawing.FontStyle]::Bold)

    # White brush for text
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    # String format for centered text
    $centerFormat = New-Object System.Drawing.StringFormat
    $centerFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $centerFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

    # Draw date (center-top area)
    $graphics.DrawString($Date, $fontDate, $whiteBrush, ($width / 2), [int]($height * 0.28), $centerFormat)

    # Draw time (center, larger)
    $timeStr = "{0:D2}:{1:D2}" -f $Hour, $Minute
    $graphics.DrawString($timeStr, $fontTime, $whiteBrush, ($width / 2), [int]($height * 0.44), $centerFormat)

    # Save image as JPEG with reasonable quality
    $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 90)

    $bitmap.Save($OutputPath, $encoder, $encoderParams)

    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $whiteBrush.Dispose()
    $fontDate.Dispose()
    $fontTime.Dispose()
}

$totalImages = 0

# Amsterdam - 2026-02-16
Write-Host "[AMSTERDAM] Generating images for 2026-02-16..." -ForegroundColor Yellow

# Hour 6: 12 images
foreach ($minute in @(0,5,10,15,20,25,30,35,40,45,50,55)) {
    $filename = "amsterdam_2026-02-16_06-$($minute.ToString('D2')).jpg"
    $filepath = Join-Path $outputDir $filename
    Generate-WeatherImage -City "amsterdam" -Date "2026-02-16" -Hour 6 -Minute $minute -Temperature 5.2 -Humidity 75 -Pressure 1013 -OutputPath $filepath
    $totalImages++
    Write-Host "  [$totalImages] Generated: $filename" -ForegroundColor Gray
}

# Hour 7: 11 images
foreach ($minute in @(0,5,10,15,20,25,30,35,40,45,50)) {
    $filename = "amsterdam_2026-02-16_07-$($minute.ToString('D2')).jpg"
    $filepath = Join-Path $outputDir $filename
    Generate-WeatherImage -City "amsterdam" -Date "2026-02-16" -Hour 7 -Minute $minute -Temperature 6.1 -Humidity 72 -Pressure 1013 -OutputPath $filepath
    $totalImages++
    Write-Host "  [$totalImages] Generated: $filename" -ForegroundColor Gray
}

# Hour 8: 12 images
foreach ($minute in @(0,5,10,15,20,25,30,35,40,45,50,55)) {
    $filename = "amsterdam_2026-02-16_08-$($minute.ToString('D2')).jpg"
    $filepath = Join-Path $outputDir $filename
    Generate-WeatherImage -City "amsterdam" -Date "2026-02-16" -Hour 8 -Minute $minute -Temperature 7.3 -Humidity 70 -Pressure 1014 -OutputPath $filepath
    $totalImages++
    Write-Host "  [$totalImages] Generated: $filename" -ForegroundColor Gray
}

# Hour 9: 3 images
foreach ($minute in @(0,15,30)) {
    $filename = "amsterdam_2026-02-16_09-$($minute.ToString('D2')).jpg"
    $filepath = Join-Path $outputDir $filename
    Generate-WeatherImage -City "amsterdam" -Date "2026-02-16" -Hour 9 -Minute $minute -Temperature 8.5 -Humidity 68 -Pressure 1014 -OutputPath $filepath
    $totalImages++
    Write-Host "  [$totalImages] Generated: $filename" -ForegroundColor Gray
}

# Hour 10: 12 images
foreach ($minute in @(0,5,10,15,20,25,30,35,40,45,50,55)) {
    $filename = "amsterdam_2026-02-16_10-$($minute.ToString('D2')).jpg"
    $filepath = Join-Path $outputDir $filename
    Generate-WeatherImage -City "amsterdam" -Date "2026-02-16" -Hour 10 -Minute $minute -Temperature 9.8 -Humidity 65 -Pressure 1015 -OutputPath $filepath
    $totalImages++
    Write-Host "  [$totalImages] Generated: $filename" -ForegroundColor Gray
}

# Hour 11: 12 images
foreach ($minute in @(0,5,10,15,20,25,30,35,40,45,50,55)) {
    $filename = "amsterdam_2026-02-16_11-$($minute.ToString('D2')).jpg"
    $filepath = Join-Path $outputDir $filename
    Generate-WeatherImage -City "amsterdam" -Date "2026-02-16" -Hour 11 -Minute $minute -Temperature 10.5 -Humidity 63 -Pressure 1015 -OutputPath $filepath
    $totalImages++
    Write-Host "  [$totalImages] Generated: $filename" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Image Generation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total images generated: $totalImages" -ForegroundColor Green
Write-Host "Output directory: $outputDir" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: upload-february-testdata-from-folder.cmd" -ForegroundColor Gray
Write-Host "  2. Images will be uploaded to AWS" -ForegroundColor Gray
Write-Host ""
