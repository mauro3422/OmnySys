$dirs = @('layer-b-semantic', 'layer-c', 'layer-c-memory', 'layer-graph', 'services', 'shared', 'validation')

Write-Host "Started Full Test Suite Audit and Repair via Qwen (Part 3)"

foreach ($dir in $dirs) {
    Write-Host "====================================="
    Write-Host "Delegating repair for tests/unit/$dir"
    Write-Host "====================================="
    
    $prompt = "The test files in 'tests/unit/$dir' are failing. The system recently moved to 'Canonical DB Enforcement' and removed runtime fallback reads, which is breaking mocks or setups. Please fix these test files or .skip them if they apply to removed features. Verify by running 'npx vitest run tests/unit/$dir'. Save a brief summary to report/$dir-fixes.md."
    
    # Run Qwen synchronously for each directory to avoid OOM or API rate limit issues
    qwen -p $prompt -y
}

Write-Host "Finished massive test sweep."
