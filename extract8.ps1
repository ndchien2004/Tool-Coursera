$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")

# Search for the getSource call in context of the Xv start button handler
$search = "onClick:async()=>"
$pos = 333081 # After Xv function start
$count = 0
while ($pos -lt $c.Length -and $count -lt 15) {
    $p = $c.IndexOf($search, $pos)
    if ($p -lt 0 -or $p -gt 360000) { break }
    $len = [Math]::Min(1200, $c.Length - $p)
    Write-Host "=== onClick handler at $p ==="
    Write-Host $c.Substring($p, $len)
    Write-Host ""
    $pos = $p + $search.Length
    $count++
}
