import * as vscode from 'vscode';

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricLogger {

	private _logLevel: vscode.LogLevel;
	private _name: string;
	private _logger: vscode.OutputChannel;

	constructor(context: vscode.ExtensionContext, loggerName: string, logLevel: vscode.LogLevel = vscode.LogLevel.Info) {
		this._logLevel = logLevel;
		this._name = loggerName;
		this._logger = vscode.window.createOutputChannel(loggerName);

		context.subscriptions.push(this._logger);

		this.log(`Logger '${loggerName}' initialized!`);
	}

	public log(text: string, logLevel: vscode.LogLevel = vscode.LogLevel.Info): void {
		if(this._logLevel > logLevel) {
			return;
		}
		if (!this._logger) {
			vscode.window.showErrorMessage(text);
			return;
		}

		this._logger.append(`${vscode.LogLevel[logLevel].toUpperCase().substring(0, 4)}\t${text}`);
	}

	public logTrace(text: string): void {
		this.log(text, vscode.LogLevel.Trace);
	}

	public logDebug(text: string): void {
		this.log(text, vscode.LogLevel.Debug);
	}

	public logInfo(text: string): void {
		this.log(text, vscode.LogLevel.Info);
	}

	public logWarning(text: string, showWarningWindow: boolean = false): void {
		this.log(text, vscode.LogLevel.Warning);

		if(showWarningWindow) {
			vscode.window.showWarningMessage(text);
		}
	}

	public logError(text: string, showErrorWindow: boolean = false, raiseException: boolean = false): void {
		this.log(text, vscode.LogLevel.Error);

		if(showErrorWindow) {
			vscode.window.showErrorMessage(text);
		}

		if(raiseException) {
			throw new Error(text);
		}
	}
}


