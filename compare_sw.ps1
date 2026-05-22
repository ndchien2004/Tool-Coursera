$sw7 = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-c1c745bc.js")
$sw4 = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")

$minLen = [Math]::Min($sw7.Length, $sw4.Length)
for ($i = 0; $i -lt $minLen; $i++) {
    if ($sw7[$i] -ne $sw4[$i]) {
        Write-Host "First SW diff at position: $i"
        $start = [Math]::Max(0, $i - 100)
        $len = [Math]::Min(400, $minLen - $start)
        Write-Host "Build 7 SW: $($sw7.Substring($start, $len))"
        Write-Host ""
        Write-Host "Build 4 SW: $($sw4.Substring($start, $len))"
        break
    }
}

# Also find all differences
$diffs = 0
for ($i = 0; $i -lt $minLen; $i++) {
    if ($sw7[$i] -ne $sw4[$i]) {
        $diffs++
    }
}
Write-Host ""
Write-Host "Total different characters: $diffs"
