# a simple PowerShell script to update icons in the resources/icons directory
# the original icons are loaded from https://github.com/microsoft/fabric-samples/blob/main/docs-samples/Icons.zip

$rootPath = Get-Item -Path "./resources/icons"
$icons = $rootPath | Get-ChildItem -Recurse -Include *.svg

$icon = $icons[0]
foreach($icon in $icons) {
	$newPath = Join-Path $icon.DirectoryName (($icon.BaseName -replace "[\s-]", "").toLower().TrimEnd("s") + $icon.Extension)

	if($newPath -ceq $icon.FullName) {
		continue
	}

	$content = $icon | Get-Content -Raw
	$content = $content -replace 'fill="black"', 'fill="gray"'
	Remove-Item -Path $icon.FullName
	Set-Content -Path $newPath -Value $content
}

Move-Item "$($rootPath.FullName)/model.svg" "$($rootPath.FullName)/semanticmodel.svg"
Move-Item "$($rootPath.FullName)/pipeline.svg" "$($rootPath.FullName)/datapipeline.svg"