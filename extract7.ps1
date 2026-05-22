$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")
# Search for "nC" function which is the function that generates answers
$search = "const nC="
$p = $c.IndexOf($search)
Write-Host "nC function at: $p"
if ($p -ge 0) {
    $len = [Math]::Min(3000, $c.Length - $p)
    Write-Host $c.Substring($p, $len)
    Write-Host ""
}

# Also search for "nC" in function definition
$search2 = "function nC("
$p2 = $c.IndexOf($search2)
Write-Host "nC function def at: $p2"

# Search for generativelanguage.googleapis.com
$search3 = "generativelanguage"
$p3 = $c.IndexOf($search3)
Write-Host "generativelanguage at: $p3"
if ($p3 -ge 0) {
    $start = [Math]::Max(0, $p3 - 200)
    $len = [Math]::Min(500, $c.Length - $start)
    Write-Host $c.Substring($start, $len)
}
