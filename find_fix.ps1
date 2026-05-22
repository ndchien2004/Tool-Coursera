$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-20ca5320.js")

# Find the nC function and its fetch error handling
$search = "})[n(448)](f=>f[n(421)]());return await t[n(432)]"
$p = $c.IndexOf($search)
Write-Host "nC fetch handler at: $p"
if ($p -ge 0) {
    $start = [Math]::Max(0, $p - 100)
    $len = [Math]::Min(400, $c.Length - $start)
    Write-Host $c.Substring($start, $len)
}

Write-Host ""
Write-Host "==================================="
Write-Host ""

# Find the y function in service worker for cookie fix
$sw = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")
$search2 = "await chrome.cookies.get("
$p2 = $sw.IndexOf($search2)
Write-Host "Cookie get at: $p2"
if ($p2 -ge 0) {
    $start2 = [Math]::Max(0, $p2 - 80)
    $len2 = [Math]::Min(350, $sw.Length - $start2)
    Write-Host $sw.Substring($start2, $len2)
}

Write-Host ""
Write-Host "==================================="
Write-Host ""

# Also check if the onMessage listener handles getMetadata
$search3 = "getMetadata"
$p3 = $sw.IndexOf($search3)
Write-Host "getMetadata in service worker at: $p3"
if ($p3 -ge 0) {
    $start3 = [Math]::Max(0, $p3 - 200)
    $len3 = [Math]::Min(500, $sw.Length - $start3)
    Write-Host $sw.Substring($start3, $len3)
}
