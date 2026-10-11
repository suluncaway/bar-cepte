param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

# Only use a NEW, private certificate. The formerly committed key is compromised.
# Configure CSC_LINK / CSC_KEY_PASSWORD in the process environment or CI secret store.
if (-not $env:CSC_LINK -or -not $env:CSC_KEY_PASSWORD) {
    throw "Yeni ozel sertifika icin CSC_LINK ve CSC_KEY_PASSWORD gerekli."
}
if (-not (Test-Path $env:CSC_LINK) -or -not (Test-Path $FilePath)) {
    throw "Sertifika veya imzalanacak dosya bulunamadi."
}
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
    $env:CSC_LINK, $env:CSC_KEY_PASSWORD
)
try {
    $result = Set-AuthenticodeSignature -FilePath $FilePath -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
    if ($result.Status -ne "Valid") { throw "Imza dogrulanamadi: $($result.Status)" }
    Write-Host "Imza dogrulandi."
} finally {
    $cert.Dispose()
}
