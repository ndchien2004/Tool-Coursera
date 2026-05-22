$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-20ca5320.js")

# Find K3 function
$search = "const K3=async"
$p = $c.IndexOf($search)
Write-Host "K3 at position $p"
if ($p -ge 0) {
    $len = [Math]::Min(1500, $c.Length - $p)
    Write-Host $c.Substring($p, $len)
}

# Find Nc
Write-Host ""
Write-Host "====== Nc ======"
$search3 = "const Nc="
$p3 = $c.IndexOf($search3)
Write-Host "Nc at position $p3"
if ($p3 -ge 0) {
    $len3 = [Math]::Min(300, $c.Length - $p3)
    Write-Host $c.Substring($p3, $len3)
}

# Find model reference near K3
Write-Host ""
Write-Host "====== model ======"
$p4 = $c.IndexOf("model", 695500)
Write-Host "model at position $p4"
if ($p4 -ge 0 -and $p4 -lt 700000) {
    $start4 = [Math]::Max(0, $p4 - 50)
    $len4 = [Math]::Min(200, $c.Length - $start4)
    Write-Host $c.Substring($start4, $len4)
}
