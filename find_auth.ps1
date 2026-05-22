$sw = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")

# Find the getMetadata handler  
$search = "getMetadata"
$p = $sw.IndexOf($search)
Write-Host "getMetadata context:"
$start = [Math]::Max(0, $p - 50)
$len = [Math]::Min(600, $sw.Length - $start)
Write-Host $sw.Substring($start, $len)
Write-Host ""
Write-Host "==================================="

# Find csrf3Token to understand how cookies are stored
$search2 = "csrf3Token"
$pos = 0
$count = 0
while ($pos -lt $sw.Length -and $count -lt 5) {
    $p2 = $sw.IndexOf($search2, $pos)
    if ($p2 -lt 0) { break }
    $start2 = [Math]::Max(0, $p2 - 100)
    $len2 = [Math]::Min(300, $sw.Length - $start2)
    Write-Host "csrf3Token at $p2 :"
    Write-Host $sw.Substring($start2, $len2)
    Write-Host ""
    $pos = $p2 + $search2.Length
    $count++
}

Write-Host "==================================="
# Check how CAUTH is handled in service worker onMessage
$search3 = "CAUTH"
$pos = 0
$count = 0
while ($pos -lt $sw.Length -and $count -lt 5) {
    $p3 = $sw.IndexOf($search3, $pos)
    if ($p3 -lt 0) { break }
    $start3 = [Math]::Max(0, $p3 - 100)
    $len3 = [Math]::Min(300, $sw.Length - $start3)
    Write-Host "CAUTH at $p3 :"
    Write-Host $sw.Substring($start3, $len3)
    Write-Host ""
    $pos = $p3 + $search3.Length
    $count++
}
