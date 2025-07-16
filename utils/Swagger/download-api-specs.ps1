

$REPO_NAME = "fabric-rest-api-specs";
$REPOSITORY_URL = "https://github.com/microsoft/$REPO_NAME";


$scriptPath = Switch ($Host.name) {
	'Visual Studio Code Host' { $psEditor.GetEditorContext().CurrentFile.Path }
	'Windows PowerShell ISE Host' { $psISE.CurrentFile.FullPath }
	'ConsoleHost' { $PSCommandPath }
	default { Write-Error 'Unknown host-process or caller!' }
}

$scriptDirectory = Split-Path -Path $scriptPath -Parent

$ZIP_FILE_NAME = "$scriptDirectory\FabricRESTAPI.zip";


Invoke-WebRequest "$REPOSITORY_URL/archive/refs/heads/main.zip" -OutFile $ZIP_FILE_NAME
Expand-Archive -Path $ZIP_FILE_NAME -DestinationPath $scriptDirectory -Force
Remove-Item -Path "$scriptDirectory\definition" -Recurse -Force -ErrorAction Ignore
Rename-Item "$scriptDirectory\$REPO_NAME-main" "$scriptDirectory\definition"