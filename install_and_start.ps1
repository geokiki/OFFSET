# PowerShell script to install dependencies and start the React app
# Run this script from the project root (C:\Users\Kiki\Downloads\OFFSET)

# Ensure Node.js is on PATH for this session
$nodePath = "C:\Program Files\nodejs"
if (-not ($env:PATH -like "*$nodePath*")) {
    $env:PATH = "$nodePath;" + $env:PATH
}

# Bypass execution policy for this script's scope
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "Installing npm dependencies..."
# Use legacy-peer-deps to avoid TypeScript version conflict
& "npm" install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Starting the development server..."
& "npm" start
