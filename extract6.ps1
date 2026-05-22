$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")
# Search for "isLoadingQuiz" to find Start button
$search = "isLoadingQuiz"
$pos = 0
$count = 0
while ($pos -lt $c.Length -and $count -lt 10) {
    $p = $c.IndexOf($search, $pos)
    if ($p -lt 0) { break }
    $start = [Math]::Max(0, $p - 300)
    $len = [Math]::Min(800, $c.Length - $start)
    Write-Host "=== isLoadingQuiz at $p ==="
    Write-Host $c.Substring($start, $len)
    Write-Host ""
    $pos = $p + $search.Length
    $count++
}
