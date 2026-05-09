$ErrorActionPreference = "Stop"

$mongoExe = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
$dbPath = "C:\Users\Public\zumarlaw-mongo-data-copy"

if (-not (Test-Path $mongoExe)) {
  throw "MongoDB executable not found at $mongoExe"
}

if (-not (Test-Path $dbPath)) {
  New-Item -ItemType Directory -Path $dbPath | Out-Null
}

& $mongoExe --dbpath $dbPath --bind_ip 127.0.0.1 --port 27017
