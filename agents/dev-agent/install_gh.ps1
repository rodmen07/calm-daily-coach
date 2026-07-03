$url = 'https://github.com/cli/cli/releases/latest/download/gh-windows-amd64.msi'
$out = Join-Path $env:TEMP 'gh.msi'
Write-Host "Downloading $url to $out"
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
Write-Host "Running installer $out"
Start-Process msiexec -ArgumentList "/i", $out, "/passive" -Wait
Write-Host "Installer finished, checking gh --version"
gh --version
