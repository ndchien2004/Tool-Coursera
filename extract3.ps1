$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")
# Search for "Start" text near buttons
$p = $c.IndexOf("Start")
Write-Host "=== Start positions ==="
$pos = 0
$count = 0
while ($pos -lt $c.Length -and $count -lt 20) {
    $p = $c.IndexOf("Start", $pos)
    if ($p -lt 0) { break }
    $start = [Math]::Max(0, $p - 100)
    $len = [Math]::Min(300, $c.Length - $start)
    Write-Host "--- Position $p ---"
    Write-Host $c.Substring($start, $len)
    Write-Host ""
    $pos = $p + 5
    $count++
}
