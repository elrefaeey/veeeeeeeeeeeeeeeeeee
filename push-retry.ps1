$maxAttempts = 10
$attempt = 1

while ($attempt -le $maxAttempts) {
    Write-Host "Attempt $attempt of $maxAttempts..." -ForegroundColor Yellow
    
    git push origin main --verbose 2>&1 | Tee-Object -Variable output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS! Code uploaded!" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "Failed. Waiting 5 seconds..." -ForegroundColor Red
    Start-Sleep -Seconds 5
    $attempt++
}

Write-Host "Failed after $maxAttempts attempts" -ForegroundColor Red
exit 1
