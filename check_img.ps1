Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('connecting_ui.png')
Write-Output ("connecting_ui: " + $img.Width + "x" + $img.Height)
$img.Dispose()

$img2 = [System.Drawing.Image]::FromFile('done_ui.png')
Write-Output ("done_ui: " + $img2.Width + "x" + $img2.Height)
$img2.Dispose()
