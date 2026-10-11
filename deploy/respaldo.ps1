<#
  Copia de seguridad de INGELOP: base de datos (Neon u otro PostgreSQL) + archivos (Cloudflare R2 o carpeta local).

  Requisitos: Docker Desktop encendido. No hace falta instalar PostgreSQL ni rclone: se usan sus imágenes de Docker.
  Configuración: copia deploy/respaldo.env.example a deploy/respaldo.env y complétalo (ese archivo NO se sube a Git).

  Uso (desde la carpeta del proyecto):
      powershell -ExecutionPolicy Bypass -File deploy\respaldo.ps1

  Resultado: backups\ingelop_respaldo_AAAAMMDD_HHMM.zip con
      base-de-datos.dump  (formato de pg_dump -Fc; se restaura con pg_restore)
      archivos\           (planos, documentos, fotos e imágenes)
  Se conservan las últimas RESPALDO_CONSERVAR copias. Instrucciones para restaurar: docs/ALMACENAMIENTO_Y_RESPALDOS.md
#>
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$configuracion = Join-Path $PSScriptRoot 'respaldo.env'

function Escribir([string]$texto) {
  $linea = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $texto
  Write-Host $linea
  Add-Content -Path $script:registro -Value $linea -Encoding UTF8
}

if (-not (Test-Path $configuracion)) {
  throw "No existe deploy\respaldo.env. Copia deploy\respaldo.env.example y complétalo."
}

# Lee KEY=valor (ignora comentarios y comillas)
$cfg = @{}
foreach ($l in Get-Content $configuracion -Encoding UTF8) {
  if ($l -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { $cfg[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'") }
}
function Valor([string]$clave, [string]$porDefecto = '') {
  if ($cfg.ContainsKey($clave) -and $cfg[$clave] -ne '') { return $cfg[$clave] } else { return $porDefecto }
}

$urlBase = Valor 'DATABASE_URL'
if (-not $urlBase) { throw 'Falta DATABASE_URL en deploy\respaldo.env' }
$destino = Valor 'RESPALDO_DESTINO' (Join-Path $raiz 'backups')
$conservar = [int](Valor 'RESPALDO_CONSERVAR' '14')
$imagenPg = Valor 'RESPALDO_IMAGEN_PG' 'postgres:17-alpine'
$fecha = Get-Date -Format 'yyyyMMdd_HHmm'
New-Item -ItemType Directory -Force -Path $destino | Out-Null
$script:registro = Join-Path $destino 'respaldo.log'
$trabajo = Join-Path $destino "en-proceso_$fecha"
New-Item -ItemType Directory -Force -Path (Join-Path $trabajo 'archivos') | Out-Null

try {
  Escribir "Inicio de la copia de seguridad ($fecha)"

  # 1) Base de datos: pg_dump en formato comprimido, escrito en un volumen (no por la consola, para no dañar el binario)
  Escribir 'Copiando la base de datos…'
  # Sin comillas dentro de sh -c: PowerShell 5.1 las quita al llamar a docker. La URL va en una variable
  # (un "&" dentro de una variable no es un operador de sh) y "set -f" evita que el "?" se tome como comodín.
  docker run --rm -e "URL_BD=$urlBase" -v "${trabajo}:/respaldo" $imagenPg sh -c 'set -f; pg_dump $URL_BD -Fc --no-owner -f /respaldo/base-de-datos.dump'
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump falló (revisa DATABASE_URL y que la versión de RESPALDO_IMAGEN_PG sea igual o mayor que la del servidor)' }

  # Verificación: el archivo debe poder leerse y contener tablas
  $tablas = docker run --rm -v "${trabajo}:/respaldo" $imagenPg sh -c 'pg_restore --list /respaldo/base-de-datos.dump | grep -c TABLE.DATA'
  if ($LASTEXITCODE -ne 0 -or [int]$tablas -lt 1) { throw 'La copia de la base de datos no es válida' }
  Escribir "Base de datos copiada: $tablas tablas con datos"

  # 2) Archivos: desde R2/S3 con rclone, o desde una carpeta local
  if (Valor 'S3_BUCKET') {
    Escribir "Copiando archivos del bucket $(Valor 'S3_BUCKET')…"
    docker run --rm `
      -e "RCLONE_S3_PROVIDER=$(Valor 'S3_PROVEEDOR' 'Cloudflare')" `
      -e "RCLONE_S3_ENDPOINT=$(Valor 'S3_ENDPOINT')" `
      -e "RCLONE_S3_ACCESS_KEY_ID=$(Valor 'S3_ACCESS_KEY_ID')" `
      -e "RCLONE_S3_SECRET_ACCESS_KEY=$(Valor 'S3_SECRET_ACCESS_KEY')" `
      -e "RCLONE_S3_REGION=$(Valor 'S3_REGION' 'auto')" `
      -e "RCLONE_S3_FORCE_PATH_STYLE=$(Valor 'S3_FORCE_PATH_STYLE' 'false')" `
      -v "${trabajo}:/respaldo" rclone/rclone copy ":s3:$(Valor 'S3_BUCKET')" /respaldo/archivos --exclude "papelera/**"
    if ($LASTEXITCODE -ne 0) { throw 'rclone no pudo copiar los archivos del bucket' }
  } elseif (Valor 'CARPETA_ARCHIVOS') {
    Escribir "Copiando archivos de $(Valor 'CARPETA_ARCHIVOS')…"
    Copy-Item -Path (Join-Path (Valor 'CARPETA_ARCHIVOS') '*') -Destination (Join-Path $trabajo 'archivos') -Recurse -Force -Exclude 'papelera'
  } else {
    Escribir 'AVISO: no se configuró S3_BUCKET ni CARPETA_ARCHIVOS; solo se copia la base de datos'
  }
  $cantidad = (Get-ChildItem -Path (Join-Path $trabajo 'archivos') -Recurse -File | Measure-Object).Count
  Escribir "Archivos copiados: $cantidad"

  # 3) Comprimir en un solo .zip
  $zip = Join-Path $destino "ingelop_respaldo_$fecha.zip"
  # Se arma entrada por entrada con rutas "/" (Compress-Archive y ZipFile de PowerShell 5.1 usan "\",
  # que otras herramientas no interpretan bien al restaurar)
  Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
  if (Test-Path $zip) { Remove-Item $zip -Force }
  $archivoZip = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    $base = (Resolve-Path $trabajo).Path.TrimEnd([char]92) + [char]92
    foreach ($f in Get-ChildItem -Path $trabajo -Recurse -File) {
      $nombre = $f.FullName.Substring($base.Length).Replace([char]92, [char]47)
      [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archivoZip, $f.FullName, $nombre, [System.IO.Compression.CompressionLevel]::Optimal)
    }
  } finally {
    $archivoZip.Dispose()
  }
  Escribir ("Copia lista: {0} ({1:N1} MB)" -f $zip, ((Get-Item $zip).Length / 1MB))

  # 4) Conservar solo las últimas N copias
  $viejas = Get-ChildItem -Path $destino -Filter 'ingelop_respaldo_*.zip' | Sort-Object Name -Descending | Select-Object -Skip $conservar
  foreach ($v in $viejas) { Remove-Item $v.FullName -Force; Escribir "Copia antigua eliminada: $($v.Name)" }
  Escribir 'Copia de seguridad terminada correctamente'
}
catch {
  Escribir "ERROR: $($_.Exception.Message)"
  exit 1
}
finally {
  if (Test-Path $trabajo) { Remove-Item $trabajo -Recurse -Force }
}
