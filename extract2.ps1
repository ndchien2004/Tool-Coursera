$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")
# Search for the Xv component (the main React UI)
$p = $c.IndexOf("function Xv")
if ($p -lt 0) { $p = $c.IndexOf("const Xv") }
if ($p -lt 0) { $p = $c.IndexOf("Xv=") }
Write-Host "Xv Position: $p"
if ($p -ge 0) {
    $len = [Math]::Min(8000, $c.Length - $p)
    Write-Host $c.Substring($p, $len)
}
