$sw = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")

# Find the onUpdated listener where y is called for CAUTH
$search1 = "await y("
$pos = 0
$count = 0
while ($pos -lt $sw.Length -and $count -lt 10) {
    $p = $sw.IndexOf($search1, $pos)
    if ($p -lt 0) { break }
    $start = [Math]::Max(0, $p - 30)
    $len = [Math]::Min(200, $sw.Length - $start)
    Write-Host "=== await y( at position $p ==="
    Write-Host $sw.Substring($start, $len)
    Write-Host ""
    $pos = $p + 10
    $count++
}

# Also find the getMetadata handler
Write-Host ""
Write-Host "====== getMetadata calls ======"
$search2 = "csrf3Token"
$p2 = $sw.IndexOf($search2)
if ($p2 -ge 0) {
    $start2 = [Math]::Max(0, $p2 - 60)
    $len2 = [Math]::Min(300, $sw.Length - $start2)
    Write-Host $sw.Substring($start2, $len2)
}
