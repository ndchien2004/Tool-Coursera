$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")
$p = $c.IndexOf("const r2")
Write-Host "Position: $p"
if ($p -ge 0) {
    $len = [Math]::Min(5000, $c.Length - $p)
    Write-Host $c.Substring($p, $len)
}
