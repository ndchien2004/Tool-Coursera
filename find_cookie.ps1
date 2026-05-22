$sw = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")

# Find the exact y function
$search = "const y=async(c,t)=>"
$p = $sw.IndexOf($search)
Write-Host "y function at: $p"
if ($p -ge 0) {
    $len = [Math]::Min(250, $sw.Length - $p)
    Write-Host "EXACT TEXT:"
    Write-Host $sw.Substring($p, $len)
}

# Also verify what r(502), r(536), r(511), r(518) decode to by searching
Write-Host ""
Write-Host "==================================="
# Check if chrome.storage.local.set pattern exists
$hasStorage = $sw.Contains("chrome.storage")
Write-Host "Has 'chrome.storage' literal: $hasStorage"

# Check the getMetadata handler that also calls y
$search2 = "csrf3Token"
$p2 = $sw.IndexOf($search2)
Write-Host "csrf3Token call at: $p2"
if ($p2 -ge 0) {
    $start2 = [Math]::Max(0, $p2 - 100)
    $len2 = [Math]::Min(300, $sw.Length - $start2)
    Write-Host $sw.Substring($start2, $len2)
}
