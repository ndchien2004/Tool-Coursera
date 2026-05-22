$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (7)\build\assets\chunk-20ca5320.js")
# Get a big chunk after the Xv function (the full component render)
$p = $c.IndexOf("function Xv")
if ($p -ge 0) {
    # Get a much bigger chunk to include the entire render return
    $offset = 8000
    $len = [Math]::Min(12000, $c.Length - $p - $offset)
    Write-Host $c.Substring($p + $offset, $len)
}
