// Enhanced hCaptcha verification with detailed debugging

export async function verifyCaptchaDebug(token: string): Promise<{ success: boolean; error?: string; debug?: any }> {
  console.log("🔍 [DEBUG] Starting captcha verification");
  console.log("🔍 [DEBUG] Token provided:", token ? "YES" : "NO");
  console.log("🔍 [DEBUG] Token length:", token?.length || 0);
  
  const secretKey = process.env.HCAPTCHA_SECRET_KEY;
  console.log("🔍 [DEBUG] Secret key exists:", secretKey ? "YES" : "NO");
  console.log("🔍 [DEBUG] Secret key length:", secretKey?.length || 0);
  
  if (!secretKey) {
    console.error("❌ [ERROR] HCAPTCHA_SECRET_KEY is not configured");
    return { success: false, error: "Captcha service not configured", debug: { step: "secret_key_missing" } };
  }

  if (!token) {
    console.error("❌ [ERROR] No captcha token provided");
    return { success: false, error: "No captcha token provided", debug: { step: "token_missing" } };
  }

  try {
    console.log("🔍 [DEBUG] Sending request to hCaptcha API...");
    
    const requestBody = new URLSearchParams({
      secret: secretKey,
      response: token,
    });
    
    console.log("🔍 [DEBUG] Request body:", requestBody.toString());
    
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody,
    });

    console.log("🔍 [DEBUG] Response status:", response.status);
    console.log("🔍 [DEBUG] Response headers:", Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log("🔍 [DEBUG] hCaptcha API response:", result);

    if (result.success) {
      console.log("✅ [SUCCESS] Captcha verification passed");
      return { success: true, debug: { step: "success", api_response: result } };
    } else {
      console.error("❌ [ERROR] hCaptcha verification failed:", result);
      return { 
        success: false, 
        error: `Captcha verification failed: ${JSON.stringify(result)}`, 
        debug: { step: "api_failure", api_response: result } 
      };
    }
  } catch (error) {
    console.error("❌ [ERROR] Exception during captcha verification:", error);
    return { 
      success: false, 
      error: `Captcha verification error: ${error}`, 
      debug: { step: "exception", error: error } 
    };
  }
}
