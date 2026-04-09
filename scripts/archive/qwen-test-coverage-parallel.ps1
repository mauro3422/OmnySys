$dirs = @('layer-c-memory/query/queries', 'core/file-watcher/guards')
$jobs = @()

Write-Host "Started Test Coverage Generation via PARALLEL Qwen"

foreach ($dir in $dirs) {
    Write-Host "Launching parallel coverage job for src/$dir"
    
    $prompt = "The OmnySys project has migrated to a Canonical SQLite Database architecture. The components in 'src/$dir' lack unit tests for their new Database/Memory interactions. Please generate comprehensive vitest unit tests for the complex files in 'src/$dir'. Place the new tests in 'tests/unit/$dir'. Use 'tests/config/setup-sqlite.js' as a helper if needed. Verify by running 'npx vitest run tests/unit/$dir'. Save a summary to 'report/coverage-$($dir -replace '/', '-')-fixes.md'."
    
    $jobs += Start-Job -Name "Qwen-Cov-$($dir -replace '/', '-')" -ScriptBlock {
        param($d, $p)
        Set-Location "c:\Dev\OmnySystem"
        qwen -p $p -y
    } -ArgumentList $dir, $prompt
}

Write-Host "All parallel jobs launched. Waiting for them to complete..."
Wait-Job $jobs | Out-Null
Write-Host "All parallel jobs finished! Showing job statuses:"
Get-Job | Format-Table -Property Name, State, HasMoreData
Receive-Job $jobs
Remove-Job $jobs
