// Enhanced hCaptcha verification with detailed debugging

export async function verifyCaptchaDebug(
  token: string,
  remoteIp?: string,
): Promise<{ success: boolean; error?: string; debug?: any }> {
  console.log("🔍 [DEBUG] Starting captcha verification");
  console.log("🔍 [DEBUG] Token provided:", token ? "YES" : "NO");
  console.log("🔍 [DEBUG] Token length:", token?.length || 0);
  console.log("🔍 [DEBUG] Remote IP:", remoteIp || "NOT_PROVIDED");

  const secretKey = process.env.HCAPTCHA_SECRET_KEY;
  console.log("🔍 [DEBUG] Secret key exists:", secretKey ? "YES" : "NO");
  console.log("🔍 [DEBUG] Secret key length:", secretKey?.length || 0);

  if (!secretKey) {
    console.error("❌ [ERROR] HCAPTCHA_SECRET_KEY is not configured");
    return {
      success: false,
      error: "Captcha service not configured",
      debug: { step: "secret_key_missing" },
    };
  }

  if (!token) {
    console.error("❌ [ERROR] No captcha token provided");
    return {
      success: false,
      error: "No captcha token provided",
      debug: { step: "token_missing" },
    };
  }

  try {
    console.log("🔍 [DEBUG] Sending request to hCaptcha API...");

    const requestBody = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    // Add remoteip if provided (helps with verification accuracy)
    if (remoteIp) {
      requestBody.append("remoteip", remoteIp);
    }

    console.log(
      "🔍 [DEBUG] Request body:",
      requestBody.toString().replace(secretKey, "***REDACTED***"),
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Maintenance-Facility-Management/1.0",
      },
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("🔍 [DEBUG] Response status:", response.status);
    console.log(
      "🔍 [DEBUG] Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      console.error(
        "❌ [ERROR] HTTP error:",
        response.status,
        response.statusText,
      );
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
        debug: {
          step: "http_error",
          status: response.status,
          statusText: response.statusText,
        },
      };
    }

    const result = await response.json();
    console.log("🔍 [DEBUG] hCaptcha API response:", result);

    if (result.success) {
      console.log("✅ [SUCCESS] Captcha verification passed");
      return {
        success: true,
        debug: { step: "success", api_response: result },
      };
    } else {
      console.error("❌ [ERROR] hCaptcha verification failed:", result);

      // Provide more specific error messages based on error codes
      let errorMessage = "Captcha verification failed";
      if (result["error-codes"] && Array.isArray(result["error-codes"])) {
        const errorCodes = result["error-codes"];
        if (errorCodes.includes("invalid-input-secret")) {
          errorMessage = "Invalid secret key configuration";
        } else if (errorCodes.includes("invalid-input-response")) {
          errorMessage = "Invalid captcha response";
        } else if (errorCodes.includes("timeout-or-duplicate")) {
          errorMessage = "Captcha expired or already used";
        } else if (errorCodes.includes("bad-request")) {
          errorMessage = "Invalid request format";
        }
      }

      return {
        success: false,
        error: `${errorMessage}: ${JSON.stringify(result)}`,
        debug: {
          step: "api_failure",
          api_response: result,
          error_codes: result["error-codes"],
        },
      };
    }
  } catch (error) {
    console.error("❌ [ERROR] Exception during captcha verification:", error);

    let errorMessage = "Captcha verification error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Captcha verification timed out";
      } else if (error.message.includes("fetch")) {
        errorMessage = "Network error during verification";
      }
    }

    return {
      success: false,
      error: `${errorMessage}: ${error}`,
      debug: {
        step: "exception",
        error: error,
        errorType: error?.constructor?.name,
      },
    };
  }
}
