Add-Type -AssemblyName System.Drawing
$publicDir = "c:\Users\Me\Desktop\chat app\frontend\public\icons"

function Optimize-Png {
    param($Path, $Width, $Height)
    if (Test-Path $Path) {
        $img = [System.Drawing.Image]::FromFile($Path)
        $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
        $graph = [System.Drawing.Graphics]::FromImage($bmp)
        
        $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graph.DrawImage($img, 0, 0, $Width, $Height)
        
        $img.Dispose()
        $graph.Dispose()
        
        $bmp.Save($Path + ".new", [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        
        $oldSize = (Get-Item $Path).Length
        $newSize = (Get-Item ($Path + ".new")).Length
        
        if ($newSize -lt $oldSize) {
            Move-Item ($Path + ".new") $Path -Force
            Write-Host "Optimized ${Path}: $oldSize bytes -> $newSize bytes"
        } else {
            Remove-Item ($Path + ".new")
            Write-Host "Skipped ${Path} (no reduction)."
        }
    }
}

Optimize-Png "$publicDir\icon-192.png" 192 192
Optimize-Png "$publicDir\icon-512.png" 512 512
