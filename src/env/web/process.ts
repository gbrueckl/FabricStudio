import { ThisExtension } from "../../ThisExtension";

export async function startExternalProcess(executable: string, args: string[]): Promise<void> {
	ThisExtension.Logger.logInfo(`Starting external process is not supported in the web!`)
}