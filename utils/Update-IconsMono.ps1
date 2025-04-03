$scriptPath = Switch ($Host.name) {
	'Visual Studio Code Host' { $psEditor.GetEditorContext().CurrentFile.Path }
	'Windows PowerShell ISE Host' { $psISE.CurrentFile.FullPath }
	'ConsoleHost' { $PSCommandPath }
	default { Write-Error 'Unknown host-process or caller!' }
}
$scriptDirectory = Split-Path $scriptPath -Parent

$iconsFolder = Join-Path $scriptDirectory "../resources/icons/color"
$icons = Get-ChildItem -Path $iconsFolder -Filter "*.svg"

# $icon = $icons[0]
foreach($icon in $icons) {

	# Define the path to the SVG file
	$svgPath = $icon.FullName
	$svgPathOut = $svgPath -replace '\\color', '\mono'

	if(Test-Path $svgPathOut) {
		Write-Host "File $svgPathOut already exists, skipping..."
		continue
	}

	# Load as XML
	[xml]$svgXml = Get-Content $svgPath

	# Find all <g> elements
	# Remove simple objects
	for ($i = 0; $i -lt $svgXml.svg.path.Count; $i++) {
		if ($svgXml.svg.path[$i].d.Length -lt 80) {
			$svgXml.svg.RemoveChild($svgXml.svg.path[$i]) | Out-Null
			$i -= 1
		}
	}

	# Save updated SVG
	$svgXml.Save($svgPathOut)

	$svgContent = Get-Content -Path $svgPathOut -Raw

	# Remove strokes (borders)
	$svgContent = $svgContent -replace 'stroke="[^"]*"', ''

	# Make background transparent (usually a rect with fill or background)
	$svgContent = $svgContent -replace '<rect[^>]*fill="[^"]*"[^>]*/?>', ''

	# Change fill colors of shapes (to light grey, e.g., #D3D3D3)
	# Be specific to visible content elements only, like paths or shapes
	$svgContent = $svgContent -replace 'fill="[^"]*"', 'fill="lightgray"'

	# Change fill colors of shapes (to light grey, e.g., #D3D3D3)
	# Be specific to visible content elements only, like paths or shapes
	$svgContent = $svgContent -replace 'color="[^"]*"', 'color="lightgray"'

	# Save the modified SVG
	Set-Content -Path $svgPathOut -Value $svgContent

	Write-Host "Saved modified SVG without first 3 layers to $svgPathOut"
}
