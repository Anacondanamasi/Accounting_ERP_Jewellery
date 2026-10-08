export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
    const axiosError = error;
    if (axiosError?.userMessage)
        return axiosError.userMessage;
    const responseMessage = axiosError?.response?.data?.error?.message ??
        axiosError?.response?.data?.message;
    if (responseMessage)
        return responseMessage;
    if (axiosError?.code === "ECONNABORTED") {
        return "Request timed out. Please check your connection and retry.";
    }
    if (!axiosError?.response) {
        return "Network error. Please check your internet connection and retry.";
    }
    return fallback;
};
export const isRetryableError = (error) => {
    const axiosError = error;
    if (!axiosError?.response)
        return true;
    const status = axiosError.response.status;
    return status === 408 || status === 429 || status >= 500;
};
