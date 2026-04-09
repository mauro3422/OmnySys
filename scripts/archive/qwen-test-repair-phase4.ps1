$jobs = @()

$prompt1 = "The test files in 'tests/unit/layer-c-memory/query/queries/' are failing due to 'TypeError: __vite_ssr_import_0__.vi.mocked(...).mockResolvedValue is not a function' (the mock array isn't properly initialized). Also, 'SQLite not available' because the 'repo' variable is not accessible in nested vi.mock() calls (it needs to be hoisted). Please fix the mock syntax in these test files. Verify by running 'npx vitest run tests/unit/layer-c-memory/query/queries'. Save a brief summary to report/query-queries-fixes2.md."
$jobs += Start-Job -Name "Qwen-Queries" -ScriptBlock { param($p) Set-Location "c:\Dev\OmnySystem"; qwen -y $p } -ArgumentList $prompt1

$prompt2 = "The test files in 'tests/unit/core/file-watcher/guards/' are failing due to 'Cannot find module /tests/unit/src/core/...' in dynamic imports inside test cases. Also, the shared compiler mocks (like classifyFileOperationalRole) are not being applied effectively during vitest runtime execution. Please fix the mock and import path syntax in these tests files. Verify by running 'npx vitest run tests/unit/core/file-watcher/guards'. Save a brief summary to report/guards-fixes2.md."
$jobs += Start-Job -Name "Qwen-Guards" -ScriptBlock { param($p) Set-Location "c:\Dev\OmnySystem"; qwen -y $p } -ArgumentList $prompt2

Write-Host "Started Phase 4 Test Repair via PARALLEL Qwen"
Wait-Job $jobs | Out-Null
Write-Host "All repair jobs finished! Showing job statuses:"
Get-Job | Format-Table -Property Name, State, HasMoreData
Receive-Job $jobs
Remove-Job $jobs
