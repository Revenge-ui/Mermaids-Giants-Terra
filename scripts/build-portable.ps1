$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseDirectory = Join-Path $projectRoot "release"
$portableDirectory = Join-Path $releaseDirectory "CardGame-v0.4.4-Windows"
$zipFile = Join-Path $releaseDirectory "CardGame-v0.4.4-Windows.zip"
$releaseFullPath = [IO.Path]::GetFullPath($releaseDirectory).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$portableFullPath = [IO.Path]::GetFullPath($portableDirectory)
if (-not $portableFullPath.StartsWith($releaseFullPath, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Portable output must stay inside the release directory."
}

if (Test-Path -LiteralPath $portableDirectory) { Remove-Item -LiteralPath $portableDirectory -Recurse -Force }
if (Test-Path -LiteralPath $zipFile) { Remove-Item -LiteralPath $zipFile -Force }
New-Item -ItemType Directory -Path (Join-Path $portableDirectory "app\client") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $portableDirectory "runtime") -Force | Out-Null

Push-Location $projectRoot
try {
  & npm run build -w @riftbound/shared
  if ($LASTEXITCODE -ne 0) { throw "Shared build failed." }
  & npm run build -w @riftbound/game-core
  if ($LASTEXITCODE -ne 0) { throw "Game core build failed." }
  & npm run build -w @riftbound/game-ai
  if ($LASTEXITCODE -ne 0) { throw "Game AI build failed." }

  $previousServerUrl = $env:VITE_GAME_SERVER_URL
  $env:VITE_GAME_SERVER_URL = "http://localhost:3001"
  try { & npm run build -w @riftbound/client }
  finally {
    if ($null -eq $previousServerUrl) { Remove-Item Env:VITE_GAME_SERVER_URL -ErrorAction SilentlyContinue }
    else { $env:VITE_GAME_SERVER_URL = $previousServerUrl }
  }
  if ($LASTEXITCODE -ne 0) { throw "Client build failed." }

  $esbuild = Join-Path $projectRoot "node_modules\esbuild\bin\esbuild"
  $serverOutput = Join-Path $portableDirectory "app\server.mjs"
  $requireBanner = "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"
  & node $esbuild "apps/server/src/index.ts" --bundle --platform=node --format=esm --target=node24 --banner:js=$requireBanner --outfile=$serverOutput
  if ($LASTEXITCODE -ne 0) { throw "Portable server bundle failed." }
}
finally { Pop-Location }

Copy-Item -Path (Join-Path $projectRoot "client\dist\*") -Destination (Join-Path $portableDirectory "app\client") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "apps\launcher\static-server.mjs") -Destination (Join-Path $portableDirectory "app\static-server.mjs") -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "apps\launcher\portable-readme.txt") -Destination (Join-Path $portableDirectory "README.txt") -Force

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$nodePath = $nodeCommand.Source
$nodeVersion = (& $nodePath -p "process.version.slice(1)").Trim()
Copy-Item -LiteralPath $nodePath -Destination (Join-Path $portableDirectory "runtime\node.exe") -Force

$licenseUrl = "https://raw.githubusercontent.com/nodejs/node/v$nodeVersion/LICENSE"
$licensePath = Join-Path $portableDirectory "runtime\NODE-LICENSE.txt"
Invoke-WebRequest -UseBasicParsing -Uri $licenseUrl -OutFile $licensePath

& powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "apps\launcher\build.ps1") -OutputFile (Join-Path $portableDirectory "CardGame.exe")
if ($LASTEXITCODE -ne 0) { throw "Launcher build failed." }

Set-Content -LiteralPath (Join-Path $portableDirectory "VERSION.txt") -Value "CardGame 0.4.4`r`nBundled Node.js $nodeVersion" -Encoding UTF8
Compress-Archive -Path $portableDirectory -DestinationPath $zipFile -CompressionLevel Optimal

$archive = Get-Item -LiteralPath $zipFile
Write-Output "Portable directory: $portableDirectory"
Write-Output "Portable zip: $zipFile"
Write-Output "Zip size: $([Math]::Round($archive.Length / 1MB, 2)) MB"
