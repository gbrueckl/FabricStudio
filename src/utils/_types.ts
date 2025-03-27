
export interface iGenericApiError {
	requestId?: string; 	// A unique identifier for the request, which can be used to correlate the request with other logs or diagnostic information.
	errorCode: string; 		// A specific identifier that provides information about an error condition, allowing for standardized communication between our service and its users.
	message: string; 		// human readable representation of the error.
	details?: string; 		// A more detailed human readable representation of the error.`
}



export interface iGenericApiResponse<TSucces = any, TError = iGenericApiError> {
	success?: TSucces;
	error?: TError;
}

export interface iGenericApiCallConfig {
	raw?: boolean;
	raiseErrorOnFailure?: boolean;
	awaitLongRunningOperation?: boolean;
}