// hCaptcha verification utility

export async function verifyCaptcha(token: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.HCAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error("HCAPTCHA_SECRET_KEY is not configured");
    return { success: false, error: "Captcha service not configured" };
  }

  if (!token) {
    return { success: false, error: "No captcha token provided" };
  }

  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return { success: true };
    } else {
      console.error("hCaptcha verification failed:", result);
      return { success: false, error: "Captcha verification failed" };
    }
  } catch (error) {
    console.error("Error verifying captcha:", error);
    return { success: false, error: "Captcha verification error" };
  }
}
