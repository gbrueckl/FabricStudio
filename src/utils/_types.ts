
export interface iGenericApiError {
	requestId?: string; 	// A unique identifier for the request, which can be used to correlate the request with other logs or diagnostic information.
	errorCode: string; 		// A specific identifier that provides information about an error condition, allowing for standardized communication between our service and its users.
	message: string; 		// human readable representation of the error.
	details?: string; 		// A more detailed human readable representation of the error.`
	moreDetails?: iGenericApiError[]; 	// An array that can contain additional information about the error, which can be of any type and structure, providing flexibility for conveying extra context or data related to the error.
}



export interface iGenericApiResponse<TSucces = any, TError = iGenericApiError> {
	success?: TSucces;
	error?: TError;
	responseHeaders?: { [key: string]: string };
}

export interface iGenericApiCallConfig {
	raw?: boolean;
	raiseErrorOnFailure?: boolean;
	awaitLongRunningOperation?: boolean;
}