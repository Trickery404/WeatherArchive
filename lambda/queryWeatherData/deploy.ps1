# Deploy queryWeatherData Lambda to AWS
# This script packages and deploys the Lambda function with improved error handling

Write-Host "Deploying queryWeatherData Lambda..." -ForegroundColor Cyan

# Set Lambda function name
$FUNCTION_NAME = "queryWeatherData"

# Navigate to lambda directory
Set-Location $PSScriptRoot

Write-Host "Creating deployment package..." -ForegroundColor Yellow

# Remove old zip if exists
if (Test-Path "queryWeatherData.zip") {
    Remove-Item "queryWeatherData.zip" -Force
}

# Create zip file (exclude node_modules/.cache, .git, and zip files)
$compress = @{
    Path = "index.mjs", "package.json", "package-lock.json", "node_modules"
    CompressionLevel = "Optimal"
    DestinationPath = "queryWeatherData.zip"
}
Compress-Archive @compress

Write-Host "Package created: queryWeatherData.zip" -ForegroundColor Green

Write-Host "Updating Lambda function code..." -ForegroundColor Yellow

# Update Lambda function code
aws lambda update-function-code `
    --function-name $FUNCTION_NAME `
    --zip-file fileb://queryWeatherData.zip `
    --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Lambda function updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes deployed:" -ForegroundColor Cyan
    Write-Host "  • Improved error handling (400/404/500)" -ForegroundColor White
    Write-Host "  • Better validation for city, date, hour parameters" -ForegroundColor White
    Write-Host "  • Enhanced logging for debugging" -ForegroundColor White
    Write-Host "  • Graceful error handling for S3 signed URLs" -ForegroundColor White
    Write-Host ""
    Write-Host "Test the function with:" -ForegroundColor Yellow
    Write-Host "  Valid:   https://j7gfdg5i29.execute-api.us-east-1.amazonaws.com/dev/queryWeatherData?city=amsterdam&date=2026-02-16" -ForegroundColor Gray
    Write-Host "  Invalid: https://j7gfdg5i29.execute-api.us-east-1.amazonaws.com/dev/queryWeatherData?city=invalid-city&date=2026-02-16" -ForegroundColor Gray
} else {
    Write-Host "Lambda update failed!" -ForegroundColor Red
    exit 1
}

