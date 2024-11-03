$scriptPath = Switch ($Host.name) {
	'Visual Studio Code Host' { $psEditor.GetEditorContext().CurrentFile.Path }
	'Windows PowerShell ISE Host' { $psISE.CurrentFile.FullPath }
	'ConsoleHost' { $PSCommandPath }
	default { Write-Error 'Unknown host-process or caller!' }
}
$scriptDirectory = Split-Path $scriptPath -Parent

$npmUrl = "https://registry.npmjs.org/@fabric-msft/svg-icons"

$latestNpmVersion = Invoke-RestMethod -Method Get -Uri $npmUrl | Select-Object -ExpandProperty "dist-tags" | Select-Object -ExpandProperty "latest"
$tgzUrl = "https://registry.npmjs.org/@fabric-msft/svg-icons/-/svg-icons-$latestNpmVersion.tgz"

$outFile = Join-Path $scriptDirectory "svg-icons.tgz"
$iconsFolder = Join-Path $scriptDirectory "../resources/icons/color"
$outFolder = Join-Path $scriptDirectory "temp-icons"
$outFolderIcons = Join-Path $outFolder "package/dist/svg"

New-Item -Path $outFolder -ItemType Directory -ErrorAction SilentlyContinue
Set-Location $outFolder

$tgzContent = Invoke-WebRequest -Method Get -Uri $tgzUrl -OutFile $outFile
Invoke-Expression "tar.exe -xzf $outFile"

$icons = Get-ChildItem -Path $outFolderIcons -Filter "*.svg"

# $icon = $icons[11]
foreach($icon in $icons) {
	if(!$icon.BaseName.EndsWith("_64_item")) {
		continue
	}

	$newPath = Join-Path $iconsFolder (($icon.BaseName -replace "(_64_item|_)", "").toLower().TrimEnd("s") + $icon.Extension)

	$content = $icon | Get-Content -Raw
	#$content = $content -replace '(fill=")(.*?)(")', '$1lightgray$3'
	Set-Content -Path $newPath -Value $content
}
# do some renamings so the files match the expected names (usually derived from the API path)
Move-Item "$iconsFolder/model.svg" "$iconsFolder/semanticmodel.svg" -Force
Move-Item "$iconsFolder/pipeline.svg" "$iconsFolder/datapipeline.svg" -Force
Move-Item "$iconsFolder/sparkjobdirection.svg" "$iconsFolder/sparkjobdefinition.svg" -Force
Copy-Item "$iconsFolder/warehouse.svg" "$iconsFolder/sqlendpoint.svg" -Force
Copy-Item "$iconsFolder/mirroredgenericdatabase.svg" "$iconsFolder/mirroreddatabase.svg" -Force
Copy-Item "$iconsFolder/mirroredgenericdatabase.svg" "$iconsFolder/mirroredwarehouse.svg" -Force
#Remove-Item (Join-Path $outFolder "package") -recurse

Copy-Item "$outFolderIcons/group_workspace_64_non-item.svg" "$iconsFolder/workspace.svg" -Force
Copy-Item "$outFolderIcons/folder_64_non-item.svg" "$iconsFolder/genericfolder.svg" -Force


