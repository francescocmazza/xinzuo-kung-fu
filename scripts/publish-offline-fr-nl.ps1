# Offline FR/NL book translation and PDF release. Does not use GitHub Actions.
# Run from PowerShell in a clone of xinzuo-kung-fu.
param(
    [ValidateSet("Apply","Status","Publish")]
    [string]$Action = "Status",
    [string]$ReleaseTag = ""
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE): $($Arguments -join ' ')" }
}
function Require-Command([string]$Command) {
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "Missing $Command. Install it and retry."
    }
}
Require-Command git
Require-Command py
$root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $root) { throw "Run from inside a clone of xinzuo-kung-fu." }
Set-Location $root.Trim()
$repo = (& git remote get-url origin).Trim()
if ($repo -notmatch "francescocmazza/xinzuo-kung-fu(\\.git)?$") {
    throw "Unexpected repository origin: $repo"
}
$branch = (& git branch --show-current).Trim()
if ($branch -ne "feature/french-dutch-book-editions-20261111") {
    throw "Checkout feature/french-dutch-book-editions-20261111 first; current branch: $branch"
}
$dirty = (& git status --porcelain)
if ($dirty) { throw "Working tree not clean. Commit/stash changes first." }
if ($Action -eq "Apply") {
    if (-not (Test-Path ".translation/pages")) { throw "Translation page batches are missing." }
    Invoke-Checked py @("-3","-m","pip","install","PyYAML>=6,<7")
    Invoke-Checked py @("-3","scripts/chatgpt_translate.py","--apply-page-dir",".translation/pages")
    Invoke-Checked git @("add","translations")
    # Do not delete translation input pages: these document the exact translated prose.
    $staged = (& git diff --cached --name-only)
    if ($staged) {
        Invoke-Checked git @("commit","-m","Apply and validate offline French/Dutch translation pages")
        Invoke-Checked git @("push","origin","HEAD")
    }
}
if ($Action -eq "Status" -or $Action -eq "Apply") {
    Invoke-Checked py @("-3","-m","pip","install","PyYAML>=6,<7")
    Invoke-Checked py @("-3","scripts/chatgpt_translate.py","--prepare-queue",".translation/queue.json","--locales","fr","nl")
    Invoke-Checked py @("-3","scripts/publication_locales.py","--explain")
    Write-Host "The queue reports remaining translations. No PDF publication is attempted while incomplete."
    exit 0
}
# Publication deliberately fails closed unless BOTH locales are complete and valid.
Require-Command gh
Invoke-Checked py @("-3","-m","pip","install","-r","requirements-pdf.txt")
Invoke-Checked py @("-3","scripts/chatgpt_translate.py","--check-only","--locales","fr","nl")
$ready = (& py -3 scripts/publication_locales.py --format space)
if ($LASTEXITCODE -ne 0) { throw "Unable to resolve ready locales." }
$set = @($ready.Trim() -split "\\s+")
if ("fr" -notin $set -or "nl" -notin $set) { throw "French and Dutch must both be READY before publishing." }
Invoke-Checked py @("-3","scripts/pdf_export/apply_a5_profile.py")
Invoke-Checked py @("-3","-m","playwright","install","chromium")
Invoke-Checked py @("-3","scripts/export_pdf_guides.py","--locales","fr","nl","--placeholders","hide","--output-dir","release-assets/offline-fr-nl")
$pdfs = @(Get-ChildItem "release-assets/offline-fr-nl" -Filter "*.pdf" -File)
if ($pdfs.Count -ne 2) { throw "Expected exactly two complete PDFs, found $($pdfs.Count)." }
foreach ($pdf in $pdfs) {
    if ($pdf.Length -lt 2000) { throw "PDF too small: $($pdf.Name)" }
}
Invoke-Checked gh @("auth","status")
$sha = (& git rev-parse --short=10 HEAD).Trim()
if (-not $ReleaseTag) { $ReleaseTag = "fr-nl-offline-$sha" }
# The tag names a reproducible snapshot of the feature branch, not the published main revision.
$existing = & gh release view $ReleaseTag --repo "francescocmazza/xinzuo-kung-fu" 2>$null
if ($LASTEXITCODE -eq 0) { throw "Release $ReleaseTag exists; refusing to overwrite immutable assets." }
$files = @($pdfs | ForEach-Object { $_.FullName })
Invoke-Checked gh (@("release","create",$ReleaseTag) + $files + @("--repo","francescocmazza/xinzuo-kung-fu","--target",((& git rev-parse HEAD).Trim()),"--title","The Gongfu of Xinzuo - Francais / Nederlands ($sha)","--notes","Offline-generated French and Dutch A5 editions. No GitHub Actions used."))
Write-Host "PDFs uploaded: https://github.com/francescocmazza/xinzuo-kung-fu/releases/tag/$ReleaseTag"
Write-Host "GitHub Pages website updates still require a separate Pages deployment path."
