# Run once with administrator privileges. Allows only this app and local Wi-Fi peers.
$ErrorActionPreference = 'Stop'
$ruleName = 'LinhFlowerHouse-Local-5173'
$nodeExecutable = Join-Path $PSScriptRoot '.local-tools/node-v22.23.3-win-x64/node.exe'
if (-not (Test-Path -LiteralPath $nodeExecutable)) { throw 'Local Node.js was not found.' }
try {
  $existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
  if (-not $existing) {
    New-NetFirewallRule -Name $ruleName -DisplayName 'Linh Flower House - local phone access' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet -InterfaceAlias 'Wi-Fi' -Program $nodeExecutable -Profile Any | Out-Null
  }
  'Phone access enabled for local Wi-Fi devices on port 5173.' | Set-Content -LiteralPath (Join-Path $PSScriptRoot '.sites-runtime/phone-access-status.txt')
} catch {
  $_.Exception.Message | Set-Content -LiteralPath (Join-Path $PSScriptRoot '.sites-runtime/phone-access-status.txt')
  throw
}
