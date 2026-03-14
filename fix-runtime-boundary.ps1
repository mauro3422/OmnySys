# Fix compiler files for runtime_boundary_surfaces adoption tracking

Write-Host "=== Fixing standardization-report.js ==="
$file1 = 'C:\Dev\OmnySystem\src\shared\compiler\standardization-report.js'
$content1 = Get-Content $file1 -Raw
# Add runtime_boundary_surfaces after service_boundary
$pattern1 = "(\{ id: 'service_boundary', label: 'Service boundary policy', status: 'canonical' \},)"
$replacement1 = "`$1`n  { id: 'runtime_boundary_surfaces', label: 'Runtime boundary surfaces', status: 'canonical' },"
$content1 = $content1 -replace $pattern1, $replacement1
Set-Content $file1 $content1 -NoNewline
Write-Host "Fixed standardization-report.js"

Write-Host "=== Fixing recommendations.js ==="
$file2 = 'C:\Dev\OmnySystem\src\shared\compiler\standardization-report\recommendations.js'
$content2 = Get-Content $file2 -Raw
# Add hasCanonicalRuntimeBoundarySurfacesAdoption before hasCanonicalScannedFileManifestAdoption
$functionToAdd = "function hasCanonicalRuntimeBoundarySurfacesAdoption(canonicalAdoptions = {}) {`n  return canonicalAdoptions.runtimeBoundarySurfaces === true;`n}`n`n"
$pattern2 = "(function hasCanonicalScannedFileManifestAdoption\(canonicalAdoptions = \{\}\) \{)"
$content2 = $content2 -replace $pattern2, "$functionToAdd`$1"
Set-Content $file2 $content2 -NoNewline
Write-Host "Fixed recommendations.js"

Write-Host "=== Fixing compiler-diagnostics-snapshot.js ==="
$file3 = 'C:\Dev\OmnySystem\src\shared\compiler\compiler-diagnostics-snapshot.js'
$content3 = Get-Content $file3 -Raw
# Add runtimeBoundarySurfaces pattern after scannedFileManifest
$pattern3 = "(scannedFileManifest: /\\\\b[^\n]+/)"
$replacement3 = "`$1,`n    runtimeBoundarySurfaces: /\\bexecuteWithBoundary\\b|\\bexecuteWithNetworkBoundary\\b|\\bclassifyBoundaryError\\b/"
$content3 = $content3 -replace $pattern3, $replacement3
Set-Content $file3 $content3 -NoNewline
Write-Host "Fixed compiler-diagnostics-snapshot.js"

Write-Host "=== All files fixed! ==="
