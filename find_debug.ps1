$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-20ca5320.js")

# Find nC function to add logging after decryption
$search1 = 'if(!f.ok)throw new Error("HTTP "+f.status);return f[n(421)]()});return await t[n(432)]($v,l)'
$p1 = $c.IndexOf($search1)
Write-Host "nC return with decrypt at: $p1"

# Find what comes right after in nC function (catch block)
$search2 = '}catch(r){return console[n(417)](r),[]}'
$p2 = $c.IndexOf($search2, 369000)
Write-Host "nC catch block at: $p2"
if ($p2 -ge 0) {
    $start = [Math]::Max(0, $p2 - 100)
    $len = [Math]::Min(300, $c.Length - $start)
    Write-Host $c.Substring($start, $len)
}

Write-Host ""
Write-Host "==================================="

# Find where nC is called in r2 (handleAutoquiz)
$search3 = "nC,e"
$pos = 690000
$count = 0
while ($pos -lt $c.Length -and $count -lt 5) {
    $p3 = $c.IndexOf($search3, $pos)
    if ($p3 -lt 0 -or $p3 -gt 700000) { break }
    $start3 = [Math]::Max(0, $p3 - 100)
    $len3 = [Math]::Min(400, $c.Length - $start3)
    Write-Host "nC call at $p3 :"
    Write-Host $c.Substring($start3, $len3)
    Write-Host ""
    $pos = $p3 + 4
    $count++
}

Write-Host ""
Write-Host "==================================="

# Find J3 call - where answer filling happens
$search4 = "J3,u,f"
$pos4 = 690000
$count = 0
while ($pos4 -lt $c.Length -and $count -lt 5) {
    $p4 = $c.IndexOf($search4, $pos4)
    if ($p4 -lt 0 -or $p4 -gt 700000) { break }
    $start4 = [Math]::Max(0, $p4 - 100)
    $len4 = [Math]::Min(400, $c.Length - $start4)
    Write-Host "J3 call at $p4 :"
    Write-Host $c.Substring($start4, $len4)
    Write-Host ""
    $pos4 = $p4 + 6
    $count++
}
