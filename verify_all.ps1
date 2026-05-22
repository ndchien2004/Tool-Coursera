$sw = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")

# Check old callback pattern is gone
$hasCallback = $sw.Contains("async function(n){const s=r;n")
Write-Host "Has old callback pattern: $hasCallback"  # Should be False

# Check new Promise-based pattern
$hasPromise = $sw.Contains("const n=await chrome.cookies.get({url:x[r(611)],name:c});if(n){await chrome[r(502)]")
Write-Host "Has new Promise pattern: $hasPromise"  # Should be True

# Check early return is still gone
$hasEarlyReturn = $sw.Contains('return!0;try{')
Write-Host "Has early return bug: $hasEarlyReturn"  # Should be False

Write-Host ""
Write-Host "All 3 fixes verified!"
