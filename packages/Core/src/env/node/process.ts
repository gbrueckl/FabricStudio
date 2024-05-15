import { Core } from "./../../Core";

export async function startExternalProcess(executable: string, args: string[]): Promise<any> {
	Core.Logger.logInfo(`Starting external process ${executable} with args ${args.join(' ')}`);
	var execFile = require('child_process').execFile;
	var process = execFile(executable, args);

	Core.Logger.logInfo(`External process started!`);

	return process;
}