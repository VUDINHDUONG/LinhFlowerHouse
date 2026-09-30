param([switch]$PublicPreview)

$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
Set-Location -LiteralPath $projectDirectory
$portable = Get-ChildItem -LiteralPath (Join-Path $projectDirectory '.local-tools') -Filter 'node-v*-win-x64' -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portable) { $nodeExecutable = Join-Path $portable.FullName 'node.exe' } else { $nodeExecutable = (Get-Command node -ErrorAction Stop).Source }
$env:PATH = "$(Split-Path $nodeExecutable);$env:PATH"
$env:NODE_USE_SYSTEM_CA = '1'
if ($PublicPreview) { $env:LINH_ALLOW_TUNNEL = 'true' }
& $nodeExecutable scripts/prepare-local.mjs
if ($LASTEXITCODE -ne 0) { throw 'Cannot configure local access.' }
$lockFile = Join-Path $projectDirectory '.vinext/dev/lock.json'
if (Test-Path -LiteralPath $lockFile) {
  $serverState = Get-Content -LiteralPath $lockFile -Raw | ConvertFrom-Json
  if (Get-Process -Id $serverState.pid -ErrorAction SilentlyContinue) {
    Write-Output "Local server already running: $($serverState.appUrl)"
    Write-Output 'Phone access instructions: .sites-runtime/mobile-access.txt'
    exit 0
  }
}
$server = Start-Process -FilePath $nodeExecutable -ArgumentList 'scripts/run-framework.mjs','dev','--hostname','0.0.0.0' -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput '.sites-runtime/local-web.stdout.log' -RedirectStandardError '.sites-runtime/local-web.stderr.log' -PassThru
Write-Output "Started local server (PID $($server.Id))."
Write-Output 'Access instructions: .sites-runtime/mobile-access.txt'
if ($PublicPreview) { Write-Output 'Public preview host support is enabled for this server.' }
