$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-20ca5320.js")

# The nC function reads {profileconsent:s, CAUTH:a, email:x} from chrome.storage.local
# The keys passed to .get() are: [t[n(443)], t[n(437)], t[n(431)]]
# t = {uAMvI:..., zgsBX:n(425), hQhSt:n(419), lhIIY:"CAUTH", CCwMW:"email", ...}

# n = mn, which uses Hs() array at offset 416
# We need to decode mn(419) to find what the actual storage key is

# Look at the Hs() array
$hsStart = $c.IndexOf("function Hs(){")
Write-Host "Hs function at: $hsStart"
if ($hsStart -ge 0) {
    $arrStart = $c.IndexOf("[", $hsStart)
    $arrEnd = $c.IndexOf("];", $arrStart)
    $arrStr = $c.Substring($arrStart, $arrEnd - $arrStart + 1)
    Write-Host "Hs array:"
    Write-Host $arrStr.Substring(0, [Math]::Min(500, $arrStr.Length))
    Write-Host "..."
    
    # mn(419) -> Hs()[419-416] = Hs()[3]
    # Parse the array to find element at index 3
    $items = $arrStr.TrimStart('[').TrimEnd(']').Split(',')
    Write-Host ""
    Write-Host "Hs()[0] = $($items[0].Trim())"
    Write-Host "Hs()[1] = $($items[1].Trim())"
    Write-Host "Hs()[2] = $($items[2].Trim())"
    Write-Host "Hs()[3] = $($items[3].Trim())"  # This is mn(419) raw
    Write-Host "Hs()[4] = $($items[4].Trim())"
    Write-Host "Hs()[5] = $($items[5].Trim())"
    
    # Also check n(443) which maps to t property
    # n(443) -> Hs()[443-416] = Hs()[27]
    Write-Host ""
    Write-Host "Hs()[27] = $($items[27].Trim())"  # This is mn(443) -> property name of t
    
    # n(437) -> Hs()[437-416] = Hs()[21]  
    Write-Host "Hs()[21] = $($items[21].Trim())"  # This is mn(437)
    
    # n(431) -> Hs()[431-416] = Hs()[15]
    Write-Host "Hs()[15] = $($items[15].Trim())"  # This is mn(431)
}

# Also check where "profileconsent" appears in service worker
Write-Host ""
Write-Host "===== Checking service worker ====="
$sw = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")
$pcPos = $sw.IndexOf("eZJRO")
if ($pcPos -ge 0) {
    $start = [Math]::Max(0, $pcPos - 10)
    $len = [Math]::Min(100, $sw.Length - $start)
    Write-Host "eZJRO context: $($sw.Substring($start, $len))"
}
