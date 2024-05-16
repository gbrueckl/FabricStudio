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

		this.log(`Logger ${loggerName} initialized!`);
	}

	public log(text: string, newLine: boolean = true, logLevel: vscode.LogLevel = vscode.LogLevel.Info): void {
		if(this._logLevel < logLevel) {
			return;
		}
		if (!this._logger) {
			vscode.window.showErrorMessage(text);
		}
		if (newLine) {
			this._logger.appendLine(`${vscode.LogLevel[logLevel].toUpperCase().substring(0, 4)}\t${text}`);
		}
		else {
			this._logger.append(`${vscode.LogLevel[logLevel].toUpperCase().substring(0, 4)}\t${text}`);
		}
	}

	public logTrace(text: string, newLine: boolean = true): void {
		this.log(text, newLine, vscode.LogLevel.Trace);
	}

	public logDebug(text: string, newLine: boolean = true): void {
		this.log(text, newLine, vscode.LogLevel.Debug);
	}

	public logInfo(text: string, newLine: boolean = true): void {
		this.log(text, newLine, vscode.LogLevel.Info);
	}

	public logWarning(text: string, newLine: boolean = true): void {
		this.log(text, newLine, vscode.LogLevel.Warning);
	}

	public logError(text: string, newLine: boolean = true): void {
		this.log(text, newLine, vscode.LogLevel.Error);
	}
}


