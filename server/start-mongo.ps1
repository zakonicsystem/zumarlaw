$ErrorActionPreference = "Stop"

$mongoExe = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
$dbPath = "C:\Users\Public\zumarlaw-mongo-data-copy"

# Prefer the portable executable and existing project database when available.
$projectRoot = Split-Path $PSScriptRoot -Parent
$portableMongo = Join-Path $projectRoot '.local-tools\mongod.exe'
if (Test-Path -LiteralPath $portableMongo) {
  $mongoExe = $portableMongo
  $dbPath = Join-Path $PSScriptRoot 'mongo-data'
}

if (-not (Test-Path $mongoExe)) {
  throw "MongoDB executable not found at $mongoExe"
}

if (-not (Test-Path $dbPath)) {
  New-Item -ItemType Directory -Path $dbPath | Out-Null
}

& $mongoExe --dbpath $dbPath --bind_ip 127.0.0.1 --port 27017
