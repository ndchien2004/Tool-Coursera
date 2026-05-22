$sw = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-c1c745bc.js")

# Check that return!0 is removed
$hasEarlyReturn = $sw.Contains('mlGsB:"openInBackground"};return!0;try{')
Write-Host "Has early return bug: $hasEarlyReturn"  # Should be False

$hasFixedCode = $sw.Contains('mlGsB:"openInBackground"};try{')
Write-Host "Has fixed code: $hasFixedCode"  # Should be True

# Check chunk file
$c = [System.IO.File]::ReadAllText("c:\Users\Nguyen Xuan Hoa\Downloads\build (4)\assets\chunk-20ca5320.js")
$hasOldFetch = $c.Contains("f=>f[n(421)]());return await t[n(432)]")
Write-Host "Has old fetch (no error check): $hasOldFetch"  # Should be False

$hasNewFetch = $c.Contains("if(!f.ok)throw new Error")
Write-Host "Has new fetch (with error check): $hasNewFetch"  # Should be True
