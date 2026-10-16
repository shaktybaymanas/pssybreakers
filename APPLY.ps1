param([string]$Repository)

$ErrorActionPreference = 'Stop'
$teamUtf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $teamUtf8
[Console]::InputEncoding = $teamUtf8
$OutputEncoding = $teamUtf8

function Invoke-GitText {
    param([string[]]$Arguments)
    $gitOutput = & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw ('Git завершился с ошибкой. Исправьте её перед продолжением: git ' + ($Arguments -join ' '))
    }
    return (($gitOutput -join "`n").Trim())
}

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'Не найден Git. Установите Git for Windows и повторно откройте APPLY.cmd.'
    }
    $part = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'part.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host ('Часть ' + $part.number + '/4 — ' + $part.title) -ForegroundColor Cyan
    Write-Host 'Скрипт подготовит изменения. Коммит и отправку на GitHub вы сделаете сами.'
    Write-Host 'Нужна отдельная чистая копия проекта. Папка с незакоммиченными изменениями не подходит.'

    $defaultPath = Join-Path ([Environment]::GetFolderPath('MyDocuments')) ('pssybreakers-part-' + $part.number.ToString('00'))
    if ([string]::IsNullOrWhiteSpace($Repository)) {
        Write-Host ('Папка по умолчанию: ' + $defaultPath)
        $Repository = Read-Host 'Нажмите Enter или укажите путь к другой чистой копии'
        if ([string]::IsNullOrWhiteSpace($Repository)) { $Repository = $defaultPath }
    }
    $repoDir = [System.IO.Path]::GetFullPath($Repository.Trim().Trim('"'))
    if (Test-Path -LiteralPath $repoDir) {
        if (-not (Test-Path -LiteralPath $repoDir -PathType Container)) {
            throw 'Указанный путь — файл. Выберите папку.'
        }
        if (-not (Test-Path -LiteralPath (Join-Path $repoDir '.git'))) {
            $existingItems = @(Get-ChildItem -LiteralPath $repoDir -Force)
            if ($existingItems.Count -gt 0) { throw 'Папка непустая и не является репозиторием. Выберите новую папку.' }
            Invoke-GitText -Arguments @('clone', '--branch', 'main', '--single-branch', $part.remote, $repoDir) | Write-Host
        }
    } else {
        Invoke-GitText -Arguments @('clone', '--branch', 'main', '--single-branch', $part.remote, $repoDir) | Write-Host
    }

    $actualRoot = Invoke-GitText -Arguments @('-C', $repoDir, 'rev-parse', '--show-toplevel')
    $rootPath = [System.IO.Path]::GetFullPath($actualRoot).TrimEnd([char[]]'\/')
    if ($rootPath -ine $repoDir.TrimEnd([char[]]'\/')) { throw 'Выберите корень репозитория, где лежит index.html.' }
    $origin = Invoke-GitText -Arguments @('-C', $repoDir, 'config', '--get', 'remote.origin.url')
    if ($origin -notmatch '^(https://github\.com/|git@github\.com:)shaktybaymanas/pssybreakers(\.git)?/?$') {
        throw ('Это другой репозиторий: ' + $origin)
    }
    $branch = Invoke-GitText -Arguments @('-C', $repoDir, 'branch', '--show-current')
    if ($branch -ne 'main') { throw 'Нужна ветка main. Выберите отдельную чистую копию проекта.' }
    $dirty = Invoke-GitText -Arguments @('-C', $repoDir, 'status', '--porcelain')
    if ($dirty) { throw 'В этой папке уже есть изменения. Они сохранены. Выберите новую папку и запустите скрипт ещё раз.' }

    Invoke-GitText -Arguments @('-C', $repoDir, 'pull', '--ff-only', 'origin', 'main') | Write-Host
    $beforeTree = Invoke-GitText -Arguments @('-C', $repoDir, 'rev-parse', 'HEAD^{tree}')
    if ($beforeTree -eq $part.expectedAfterTree) { throw 'Эта часть уже закоммичена. Повторно применять её не нужно.' }
    if ($beforeTree -ne $part.expectedBeforeTree) {
        throw ('Версия кода отличается от ожидаемой. Части применяются строго 1 → 2 → 3 → 4, предыдущий участник должен сначала сделать push. Если были другие изменения, не применяйте пакет принудительно.')
    }

    $patch = Join-Path $PSScriptRoot 'changes.patch'
    $patchHasher = [System.Security.Cryptography.SHA256]::Create()
    try { $patchHash = [BitConverter]::ToString($patchHasher.ComputeHash([System.IO.File]::ReadAllBytes($patch))).Replace('-', '') }
    finally { $patchHasher.Dispose() }
    if ($patchHash -ine $part.patchSha256) {
        throw 'Файл changes.patch изменён или повреждён. Распакуйте исходный архив заново.'
    }
    Invoke-GitText -Arguments @('-C', $repoDir, 'apply', '--check', '--index', '--whitespace=nowarn', $patch) | Write-Host
    Invoke-GitText -Arguments @('-C', $repoDir, 'apply', '--index', '--whitespace=nowarn', $patch) | Write-Host
    $afterTree = Invoke-GitText -Arguments @('-C', $repoDir, 'write-tree')
    if ($afterTree -ne $part.expectedAfterTree) { throw 'Результат проверки не совпал. Не делайте коммит, сообщите об этой ошибке.' }
    Invoke-GitText -Arguments @('-C', $repoDir, 'diff', '--cached', '--stat') | Write-Host

    $quotedPath = $repoDir.Replace("'", "''")
    $quotedMessage = $part.commitMessage.Replace("'", "''")
    $commands = @(
        "Set-Location -LiteralPath '$quotedPath'"
        'git diff --cached'
        "git commit -m '$quotedMessage'"
        'git push origin main'
    ) -join "`r`n"
    $commandsPath = Join-Path $PSScriptRoot 'КОМАНДЫ.txt'
    Set-Content -LiteralPath $commandsPath -Value $commands -Encoding UTF8
    Write-Host ''
    Write-Host 'Готово. Только ваша часть добавлена в индекс Git.' -ForegroundColor Green
    Write-Host ('Откройте PowerShell и выполните команды из ' + $commandsPath)
    Write-Host $commands
    Write-Host 'В просмотре git diff нажмите q, чтобы выйти. git add . выполнять не нужно.'
    Write-Host 'После успешного push сообщите следующему участнику. Изменения сайта полностью соберутся после части 4.'
} catch {
    Write-Host ''
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
