# Removes baked-in smoke from a fire sprite sheet: pixels with low saturation that are not bright (grey / black
# smoke) become transparent, and so do dark pixels below -DarkMax brightness unless strongly saturated (red-lit
# smoke); saturated flame colours and the bright white-yellow core stay.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/strip-grey.ps1 <in.png> <out.png> [-MaxSat 0.4] [-KeepBright 200] [-DarkMax 130] [-DarkSat 0.8]
param(
    [Parameter(Mandatory)][string]$In,
    [Parameter(Mandatory)][string]$Out,
    [double]$MaxSat = 0.4,
    [int]$KeepBright = 200,
    [int]$DarkMax = 130,
    [double]$DarkSat = 0.8
)
Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap -ArgumentList (Resolve-Path $In).Path
$removed = 0
for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -eq 0) { continue }
        $max = [Math]::Max($c.R, [Math]::Max($c.G, $c.B)); $min = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
        $sat = if ($max -eq 0) { 0 } else { ($max - $min) / $max }
        if (($sat -lt $MaxSat -and $max -lt $KeepBright) -or ($max -lt $DarkMax -and $sat -lt $DarkSat)) { $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent); $removed++ }
    }
}
$outPath = [IO.Path]::GetFullPath([IO.Path]::Combine((Get-Location).Path, $Out))
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
Write-Host "$outPath ($removed px removed)"
