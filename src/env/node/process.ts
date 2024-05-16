import { ThisExtension } from "../../ThisExtension";

export async function startExternalProcess(executable: string, args: string[]): Promise<any> {
	ThisExtension.Logger.logInfo(`Starting external process ${executable} with args ${args.join(' ')}`);
	var execFile = require('child_process').execFile;
	var process = execFile(executable, args);

	ThisExtension.Logger.logInfo(`External process started!`);

	return process;
}