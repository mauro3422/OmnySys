# Fix standardization-report.js
$file = 'C:\Dev\OmnySystem\src\shared\compiler\standardization-report.js'
$content = Get-Content $file -Raw
$content = $content -replace "(\\{ id: 'service_boundary', label: 'Service boundary policy', status: 'canonical' \\},)", "`$1`n  { id: 'runtime_boundary_surfaces', label: 'Runtime boundary surfaces', status: 'canonical' },"
Set-Content $file $content -NoNewline
Write-Host "Fixed standardization-report.js"

# Fix recommendations.js
$file2 = 'C:\Dev\OmnySystem\src\shared\compiler\standardization-report\recommendations.js'
$content2 = Get-Content $file2 -Raw
$functionToAdd = @"
function hasCanonicalRuntimeBoundarySurfacesAdoption(canonicalAdoptions = {}) {
  return canonicalAdoptions.runtimeBoundarySurfaces === true;
}

"@
$content2 = $content2 -replace "(function hasCanonicalScannedFileManifestAdoption\\(canonicalAdoptions = \\{\\}\\) \\{)", "$functionToAdd`$1"
Set-Content $file2 $content2 -NoNewline
Write-Host "Fixed recommendations.js"

# Fix compiler-diagnostics-snapshot.js
$file3 = 'C:\Dev\OmnySystem\src\shared\compiler\compiler-diagnostics-snapshot.js'
$content3 = Get-Content $file3 -Raw
$content3 = $content3 -replace "(scannedFileManifest: /\\\\b[^\n]+/)", "`$1,`n    runtimeBoundarySurfaces: /\\bexecuteWithBoundary\\b|\\bexecuteWithNetworkBoundary\\b|\\bclassifyBoundaryError\\b/"
Set-Content $file3 $content3 -NoNewline
Write-Host "Fixed compiler-diagnostics-snapshot.js"

Write-Host "All files fixed!"
