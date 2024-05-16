# a simple PowerShell script to update icons in the resources/icons directory
# the original icons are loaded from https://github.com/microsoft/fabric-samples/blob/main/docs-samples/Icons.zip

$rootPathMono = Get-Item -Path "./resources/icons/mono"
$monoIcons = $rootPathMono | Get-ChildItem -Recurse -Include *.svg

$icon = $monoIcons[0]
foreach($icon in $monoIcons) {
	$newPath = Join-Path $icon.DirectoryName (($icon.BaseName -replace "[\s-]", "").toLower().TrimEnd("s") + $icon.Extension)

	if($newPath -ceq $icon.FullName) {
		#continue
	}

	$content = $icon | Get-Content -Raw
	$content = $content -replace 'fill="black"', 'fill="lightgray"'
	Remove-Item -Path $icon.FullName
	Set-Content -Path $newPath -Value $content
}

Move-Item "$($rootPathMono.FullName)/model.svg" "$($rootPathMono.FullName)/semanticmodel.svg"
Move-Item "$($rootPathMono.FullName)/pipeline.svg" "$($rootPathMono.FullName)/datapipeline.svg"
Move-Item "$($rootPathMono.FullName)/sparkjob.svg" "$($rootPathMono.FullName)/sparkjobdefinition.svg"
Move-Item "$($rootPathMono.FullName)/datawarehouse.svg" "$($rootPathMono.FullName)/warehouse.svg"


$rootPathColor = Get-Item -Path "./resources/icons/color"
$colorIcons = $rootPathColor | Get-ChildItem -Recurse -Include *.svg

$icon = $colorIcons[0]
foreach($icon in $colorIcons) {
	if(!$icon.BaseName.EndsWith("_64")) {
		$icon | Remove-Item
		continue
	}

	$newPath = Join-Path $icon.DirectoryName (($icon.BaseName -replace "[\s-_64]", "").toLower().TrimEnd("s") + $icon.Extension)

	if($newPath -ceq $icon.FullName) {
		continue
	}

	$content = $icon | Get-Content -Raw
	$content = $content -replace 'fill="black"', 'fill="lightgray"'
	Remove-Item -Path $icon.FullName
	Set-Content -Path $newPath -Value $content
}

Move-Item "$($rootPathColor.FullName)/model.svg" "$($rootPath.FullName)/semanticmodel.svg"
Move-Item "$($rootPathColor.FullName)/pipeline.svg" "$($rootPath.FullName)/datapipeline.svg"