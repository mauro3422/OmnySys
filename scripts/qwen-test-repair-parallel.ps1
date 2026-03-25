$dirs = @('layer-c', 'layer-c-memory', 'layer-graph', 'services', 'shared', 'validation')
$jobs = @()

Write-Host "Started Full Test Suite Audit and Repair via PARALLEL Qwen"

foreach ($dir in $dirs) {
    Write-Host "Launching parallel repair job for tests/unit/$dir"
    
    $prompt = "The test files in 'tests/unit/$dir' are failing. The system recently moved to 'Canonical DB Enforcement' and removed runtime fallback reads, which is breaking mocks or setups. Please fix these test files or .skip them if they apply to removed features. Verify by running 'npx vitest run tests/unit/$dir'. Save a brief summary to report/$dir-fixes.md."
    
    $jobs += Start-Job -Name "Qwen-$dir" -ScriptBlock {
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
