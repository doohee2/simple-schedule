Add-Type -AssemblyName System.Drawing

$src = "C:\Users\doohe\.gemini\antigravity\brain\651848e3-17af-4914-ad21-fdb29d50092b\pwa_calendar_icon_1781430627387.png"
$destDir = "c:\Users\doohe\OneDrive\Desktop\바이브코딩\simple-schedule\public"

$img = [System.Drawing.Image]::FromFile($src)

$sizes = @(192, 512, 180)
$names = @("icon-192x192.png", "icon-512x512.png", "apple-touch-icon.png")

for ($i=0; $i -lt $sizes.Length; $i++) {
    $size = $sizes[$i]
    $name = $names[$i]
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    
    $outPath = Join-Path $destDir $name
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "Saved $outPath"
}

$img.Dispose()
