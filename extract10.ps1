$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")

# Find $v function 
$search = "const `$v="
$p = $c.IndexOf($search)
Write-Host "`$v function at: $p"

# Find J3 function (called in r2: s=await J3(u,f))
$search2 = "const J3="
$p2 = $c.IndexOf($search2)
Write-Host "J3 at: $p2"
if ($p2 -ge 0) {
    $len = [Math]::Min(3000, $c.Length - $p2)
    Write-Host $c.Substring($p2, $len)
}

# Find O3 function (called at end of r2)
$search3 = "const O3="
$p3 = $c.IndexOf($search3)
Write-Host "O3 at: $p3"
if ($p3 -ge 0) {
    $len = [Math]::Min(2000, $c.Length - $p3)
    Write-Host $c.Substring($p3, $len)
}
