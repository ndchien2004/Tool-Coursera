$sw = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")

# Find the getSource function (z) in service worker
$search = "export{z as getSource}"
$p = $sw.IndexOf($search)
Write-Host "getSource export at: $p"

# Find where getSource is defined
$search2 = "const z="
$p2 = $sw.IndexOf($search2)
Write-Host "const z= at: $p2"
if ($p2 -ge 0) {
    $len = [Math]::Min(1500, $sw.Length - $p2)
    Write-Host $sw.Substring($p2, $len)
}

Write-Host ""
Write-Host "==================================="
# Check what "openInBackground" does
$search3 = "openInBackground"
$p3 = $sw.IndexOf($search3) 
Write-Host "openInBackground at: $p3"
if ($p3 -ge 0) {
    $start3 = [Math]::Max(0, $p3 - 200)
    $len3 = [Math]::Min(500, $sw.Length - $start3)
    Write-Host $sw.Substring($start3, $len3)
}
