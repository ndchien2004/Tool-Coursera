$sw7 = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-c1c745bc.js")

# Check if mellowtel is defined anywhere in the service worker
$hasMellowtelDef = $sw7.Contains("mellowtel=") -or $sw7.Contains("import") -or $sw7.Contains("require")
Write-Host "Has mellowtel definition: $hasMellowtelDef"

# Search for mellowtel occurrences
$pos = 0
while ($pos -lt $sw7.Length) {
    $p = $sw7.IndexOf("mellowtel", $pos)
    if ($p -lt 0) { break }
    $start = [Math]::Max(0, $p - 50)
    $len = [Math]::Min(150, $sw7.Length - $start)
    Write-Host "mellowtel at $p : $($sw7.Substring($start, $len))"
    $pos = $p + 9
}

# Check if mellowtel is in any other file
Write-Host ""
Write-Host "Checking popup.html..."
$popup = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\popup.html")
Write-Host "popup mentions mellowtel: $($popup.Contains('mellowtel'))"
Write-Host "popup mentions popup.js: $($popup.Contains('popup.js'))"

# Check if popup.js exists
Write-Host "popup.js exists: $(Test-Path 'c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\popup.js')"
