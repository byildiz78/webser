const API_KEY = process.env.SECRET_KEY || '';

interface ApiKeyVerification {
  isValid: boolean;
  error?: string;
}

export async function verifyApiKey(apiKey: string | null): Promise<ApiKeyVerification> {
  try {
    console.log('Verifying API key:', { 
      providedKey: apiKey,
      expectedKey: process.env.SECRET_KEY,
      envKeys: Object.keys(process.env)
    });

    if (!apiKey) {
      return { 
        isValid: false, 
        error: 'API key is required' 
      };
    }

    // API key'i doğrudan karşılaştır
    const isValid = apiKey === API_KEY;
    console.log('API key verification result:', { isValid });

    return {
      isValid,
      error: isValid ? undefined : 'Invalid API key'
    };
  } catch (error) {
    console.error('Error verifying API key:', error);
    return {
      isValid: false,
      error: 'Error verifying API key'
    };
  }
}