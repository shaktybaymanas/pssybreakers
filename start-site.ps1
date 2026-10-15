param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskSiteRoot = $PSScriptRoot

# Prefer the Python runtime already installed with Codex on this computer.
$taskPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
    $taskCommand = Get-Command py.exe, python.exe, python3.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.Source -notlike '*\WindowsApps\*' } | Select-Object -First 1
    if (-not $taskCommand) { throw 'Python was not found. Install Python 3 or open the site with VS Code Live Server.' }
    $taskPython = $taskCommand.Source
}

$taskHash = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($taskSiteRoot))).Replace('-', '').Substring(0, 12)
$taskStateDir = Join-Path ([IO.Path]::GetTempPath()) ('pssybreakers-' + $taskHash)
New-Item -ItemType Directory -Path $taskStateDir -Force | Out-Null
$taskStatePath = Join-Path $taskStateDir 'server.json'
$taskPort = $null

# Reuse only the process previously launched for this exact folder.
if (Test-Path -LiteralPath $taskStatePath) {
    try {
        $taskState = Get-Content -LiteralPath $taskStatePath -Raw | ConvertFrom-Json
        $taskExisting = Get-Process -Id $taskState.processId -ErrorAction Stop
        $taskSavedStart = [DateTime]$taskState.startedAt
        if ($taskExisting.StartTime.ToUniversalTime().Ticks -eq $taskSavedStart.ToUniversalTime().Ticks -and $taskState.root -eq $taskSiteRoot) {
            $taskResponse = Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:' + $taskState.port + '/users.html') -TimeoutSec 3
            if ($taskResponse.StatusCode -eq 200 -and $taskResponse.Content.Contains('users/app.js')) { $taskPort = [int]$taskState.port }
        }
    } catch { }
}

if ($null -eq $taskPort) {
    foreach ($taskCandidate in 8000..8010) {
        $taskProbe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $taskCandidate)
        try { $taskProbe.Start(); $taskPort = $taskCandidate; break }
        catch { }
        finally { $taskProbe.Stop() }
    }
    if ($null -eq $taskPort) { throw 'Ports 8000-8010 are busy. Close another local server and try again.' }
    $taskServer = Start-Process -FilePath $taskPython -ArgumentList @('-m', 'http.server', [string]$taskPort, '--bind', '127.0.0.1') -WorkingDirectory $taskSiteRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskStateDir 'server.log') -RedirectStandardError (Join-Path $taskStateDir 'server-error.log')
    $taskStarted = $false
    for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
        try {
            $taskResponse = Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:' + $taskPort + '/users.html') -TimeoutSec 2
            if ($taskResponse.StatusCode -eq 200 -and $taskResponse.Content.Contains('users/app.js')) { $taskStarted = $true; break }
        } catch { }
        $taskServer.Refresh()
        if ($taskServer.HasExited) { throw 'The server could not start. See the logs in the temporary pssybreakers folder.' }
        Start-Sleep -Milliseconds 200
    }
    if (-not $taskStarted) { throw 'The server did not become ready.' }
    @{ processId = $taskServer.Id; startedAt = $taskServer.StartTime.ToUniversalTime().ToString('o'); root = $taskSiteRoot; port = $taskPort } | ConvertTo-Json | Set-Content -LiteralPath $taskStatePath -Encoding UTF8
}

$taskUrl = 'http://127.0.0.1:' + $taskPort + '/users.html'
Write-Output $taskUrl
if (-not $NoBrowser) { Start-Process $taskUrl }
