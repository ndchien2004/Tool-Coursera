$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")

# Find the yr function (getSource) 
$search = "const yr="
$p = $c.IndexOf($search)
Write-Host "yr (getSource) at: $p"
if ($p -ge 0) {
    $len = [Math]::Min(2000, $c.Length - $p)
    Write-Host $c.Substring($p, $len)
}

# Also search for the getSource function from service worker
$search2 = "getSource"
$pos = 0
$count = 0
while ($pos -lt $c.Length -and $count -lt 5) {
    $p2 = $c.IndexOf($search2, $pos)
    if ($p2 -lt 0) { break }
    $start = [Math]::Max(0, $p2 - 100)
    $len = [Math]::Min(300, $c.Length - $start)
    Write-Host "=== getSource at $p2 ==="
    Write-Host $c.Substring($start, $len)
    Write-Host ""
    $pos = $p2 + $search2.Length
    $count++
}
