@echo off
set "STUDIOMDL=00_studiomdl_compiler\studiomdl.exe"

set /a SUCCESS=0
set /a ERRORS=0

for %%Q in (*.qc) do (
    echo.
    echo ========================================
    echo Compiling %%Q
    echo ========================================
    "%STUDIOMDL%" "%%Q"

    if errorlevel 1 (
        echo ERROR: %%Q failed to compile!
        set /a ERRORS+=1
    ) else (
        echo SUCCESS: %%Q compiled successfully.
        set /a SUCCESS+=1
    )
)

echo.
echo ========================================
echo All models processed.
echo ========================================
echo Successful: %SUCCESS%
echo Errors:     %ERRORS%
echo ========================================
pause
