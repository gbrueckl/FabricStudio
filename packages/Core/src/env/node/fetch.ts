import * as vscode from 'vscode';

import * as process from 'process';
import * as url from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch, { File, fileFrom, FormData } from 'node-fetch'


export { fetch, FormData, File, fileFrom };
export type { BodyInit, RequestInit, RequestInfo, Response } from 'node-fetch';


function getConfigValue<T = string>(section: string, setting: string): T {
	return vscode.workspace.getConfiguration(section).get<T>(setting);
}


function useProxy(): boolean {
	let httpProxySupport: string = getConfigValue<string>("http", "proxySupport");

	// only check if proxySupport is explicitly set to "off"
	if (httpProxySupport == "off") {
		return false;
	}

	if (httpProxySupport == "on") {
		return true;
	}

	return undefined;
}

function useStrictSSL(): boolean {
	let httpProxyStrictSSL: boolean = getConfigValue<boolean>("http", "proxySupport");
	//let httpProxyStrictSSL: ConfigSetting<boolean> = ThisExtension.getConfigurationSetting<boolean>("http.proxyStrictSSL");

	// check if Strict Proxy SSL is NOT enabled
	if (httpProxyStrictSSL) {
		this.log('Strict Proxy SSL verification enabled due to setting "http.proxyStrictSSL": true !');
	}
	else {
		this.log('Strict Proxy SSL verification disabled due to setting "http.proxyStrictSSL": false !');
	}

	return httpProxyStrictSSL;
}

export function getProxyAgent(strictSSL?: boolean): HttpsProxyAgent | undefined {
	
	let proxyUrl: string | undefined;

	if (useProxy()) {
		strictSSL = strictSSL ?? useStrictSSL();
		proxyUrl = getConfigValue<string>("http", "proxy") || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
	} else {
		strictSSL = strictSSL ?? true;
	}

	if (proxyUrl) {
		return new HttpsProxyAgent({
			...url.parse(proxyUrl),
			rejectUnauthorized: strictSSL,
		});
	}
	
	if (strictSSL === false) {
		return new HttpsProxyAgent({
			rejectUnauthorized: false,
		});
	}

	return undefined;
}

export async function wrapForForcedInsecureSSL<T>(
	ignoreSSLErrors: boolean | 'force',
	fetchFn: () => Promise<T> | Thenable<T>,
): Promise<T> {
	if (ignoreSSLErrors !== 'force') return fetchFn();

	const previousRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	try {
		return await fetchFn();
	} finally {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousRejectUnauthorized;
	}
}
