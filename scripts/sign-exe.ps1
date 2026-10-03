param(
    [Parameter(Mandatory=$false)]
    [string]$FilePath = ""
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$certPath = Join-Path $scriptDir "..\certs\BarCepte.pfx"

if (-not $FilePath) {
    # Default to dist setup exe or Desktop setup exe if exists
    if (Test-Path (Join-Path $scriptDir "..\dist\BarCepte-Setup.exe")) {
        $FilePath = (Join-Path $scriptDir "..\dist\BarCepte-Setup.exe")
    } elseif (Test-Path "$HOME\Desktop\BarCepte-Setup.exe") {
        $FilePath = "$HOME\Desktop\BarCepte-Setup.exe"
    } else {
        Write-Host "Kullanim: .\sign-exe.ps1 <dosya_yolu.exe>" -ForegroundColor Yellow
        exit 1
    }
}

if (-not (Test-Path $certPath)) {
    Write-Host "Hata: Sertifika bulunamadi ($certPath)!" -ForegroundColor Red
    exit 1
}

$certPassword = ConvertTo-SecureString "BarCepte2026!" -AsPlainText -Force
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath, $certPassword)

Write-Host "Dosya imzalaniyor: $FilePath" -ForegroundColor Cyan
$result = Set-AuthenticodeSignature -FilePath $FilePath -Certificate $cert -TimestampServer "http://timestamp.digicert.com"

Write-Host "Imzalama tamamlandi." -ForegroundColor Green
Get-AuthenticodeSignature $FilePath | Format-List Subject, Status, StatusMessage, Path
