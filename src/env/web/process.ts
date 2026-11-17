import { ThisExtension } from "../../ThisExtension";

export function homedir(): string | undefined {
	return undefined;
}

export async function startExternalProcess(executable: string, args: string[]): Promise<void> {
	ThisExtension.Logger.logInfo(`Starting external process is not supported in the web!`)
}