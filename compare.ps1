$c7 = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")
$c4 = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-20ca5320.js")

Write-Host "Build 7 size: $($c7.Length)"
Write-Host "Build 4 size: $($c4.Length)"

# Check if they're different
if ($c7 -eq $c4) {
    Write-Host "Files are IDENTICAL"
} else {
    Write-Host "Files are DIFFERENT"
    # Find first difference
    $minLen = [Math]::Min($c7.Length, $c4.Length)
    for ($i = 0; $i -lt $minLen; $i++) {
        if ($c7[$i] -ne $c4[$i]) {
            Write-Host "First difference at position: $i"
            $start = [Math]::Max(0, $i - 50)
            $len = [Math]::Min(200, $minLen - $start)
            Write-Host "Build 7: $($c7.Substring($start, $len))"
            Write-Host "Build 4: $($c4.Substring($start, $len))"
            break
        }
    }
}

# Check service worker too
$sw7 = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-c1c745bc.js")
$sw4 = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")

Write-Host ""
Write-Host "Service worker Build 7 size: $($sw7.Length)"
Write-Host "Service worker Build 4 size: $($sw4.Length)"
if ($sw7 -eq $sw4) {
    Write-Host "Service workers are IDENTICAL"
} else {
    Write-Host "Service workers are DIFFERENT"
}
