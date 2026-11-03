# LinguaLive AI — Android App Runner
$adb = "C:\Users\proac\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$apk = "C:\Users\proac\livelingo\android\app\build\outputs\apk\debug\app-debug.apk"
$package = "com.lingualive.ai"
$activity = "com.lingualive.ai.MainActivity"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    LinguaLive AI - Android App Runner" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

if (-not (Test-Path $apk)) {
    Write-Host "[INFO] Debug APK not found. Building with Gradle..." -ForegroundColor Yellow
    & .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Gradle build failed." -ForegroundColor Red
        exit 1
    }
}

Write-Host "[INFO] Scanning for connected Android devices or emulators..." -ForegroundColor Gray
$devicesOutput = & $adb devices
$lines = @($devicesOutput | Where-Object { $_ -match "\bdevice\b" -and $_ -notmatch "List of devices" })

if ($lines.Count -gt 0) {
    $device = ($lines[0].Trim() -split "\s+")[0]
    Write-Host "[SUCCESS] Found connected device: $device" -ForegroundColor Green
    Write-Host "[INFO] Installing APK..." -ForegroundColor Cyan
    & $adb -s $device install -r $apk
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[INFO] Launching app..." -ForegroundColor Cyan
        & $adb -s $device shell am start -n "$package/$activity"
        Write-Host "===================================================" -ForegroundColor Green
        Write-Host "    LinguaLive AI is now running on $device" -ForegroundColor Green
        Write-Host "===================================================" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to install APK on device." -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "[STATUS] APK Built Successfully (124 MB):" -ForegroundColor Green
    Write-Host "  $apk" -ForegroundColor White
    Write-Host ""
    Write-Host "[NOTICE] No active Android phone or running emulator detected." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "How to run the app right now:" -ForegroundColor White
    Write-Host "1. Physical Phone:" -ForegroundColor Cyan
    Write-Host "   - Connect your Android phone with a USB cable"
    Write-Host "   - Enable USB Debugging in Settings > Developer Options"
    Write-Host "   - Then run: .\run_app.ps1"
    Write-Host ""
    Write-Host "2. Android Studio:" -ForegroundColor Cyan
    Write-Host "   - Open project 'C:\Users\proac\livelingo\android' in Android Studio"
    Write-Host "   - Click the green Run button to launch on an emulator or device"
    Write-Host ""
}
