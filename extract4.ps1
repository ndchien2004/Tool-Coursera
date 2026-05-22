$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")
# Find the onClick handler for Start button - search for the quiz start area
$search = "handleAutoquiz"
$p = $c.IndexOf($search)
Write-Host "handleAutoquiz pos: $p"

# Search for r2( which is the call to handleAutoquiz  
$search2 = "r2("
$pos = 0
$count = 0
while ($pos -lt $c.Length -and $count -lt 20) {
    $p2 = $c.IndexOf($search2, $pos)
    if ($p2 -lt 0) { break }
    $start = [Math]::Max(0, $p2 - 200)
    $len = [Math]::Min(500, $c.Length - $start)
    Write-Host "--- r2( at position $p2 ---"
    Write-Host $c.Substring($start, $len)
    Write-Host ""
    $pos = $p2 + 3
    $count++
}
