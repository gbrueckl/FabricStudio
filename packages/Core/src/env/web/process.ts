import { Core } from "./../../Core";

export async function startExternalProcess(executable: string, args: string[]): Promise<void> {
	Core.Logger.logInfo(`Starting external process is not supported in the web!`)
}