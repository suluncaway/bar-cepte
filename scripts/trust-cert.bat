@echo off
chcp 65001 >nul
echo ===================================================
echo   Bar Cepte Sertifikasını Güvenilenlere Ekleme
echo ===================================================
echo.
cd /d "%~dp0.."
echo Sertifika Windows Güvenilen Kök Sertifika Yetkilileri'ne yükleniyor...
echo (Açılan onay penceresinde "Evet / Yes" seçeneğine basınız)
echo.
certutil -addstore -user Root "certs\BarCepte.cer"
echo.
if %errorlevel% equ 0 (
    echo [BASARILI] Sertifika basariyla yuklendi!
    echo Artik "BarCepte-Setup.exe" bu bilgisayarda guvenilir yayimci olarak gorunecektir.
) else (
    echo [HATA] Sertifika yuklenirken bir sorun olustu.
)
echo.
pause
