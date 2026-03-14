# Fix compiler-diagnostics-snapshot.js - add runtimeBoundarySurfaces pattern
$file3 = 'C:\Dev\OmnySystem\src\shared\compiler\compiler-diagnostics-snapshot.js'
$content3 = Get-Content $file3 -Raw

# Find the scannedFileManifest line and add runtimeBoundarySurfaces after it
$oldPattern = "scannedFileManifest: /\bsyncPersistedScannedFileManifest\b|\bsummarizePersistedScannedFileCoverage\b|\bgetPersistedScannedFilePaths\b|\bloadPersistedScannedFilePaths\b/"
$newPattern = "scannedFileManifest: /\bsyncPersistedScannedFileManifest\b|\bsummarizePersistedScannedFileCoverage\b|\bgetPersistedScannedFilePaths\b|\bloadPersistedScannedFilePaths\b/,`n    runtimeBoundarySurfaces: /\bexecuteWithBoundary\b|\bexecuteWithNetworkBoundary\b|\bclassifyBoundaryError\b/"

$content3 = $content3 -replace [regex]::Escape($oldPattern), $newPattern
Set-Content $file3 $content3 -NoNewline
Write-Host "Fixed compiler-diagnostics-snapshot.js"
