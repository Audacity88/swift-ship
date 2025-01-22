/**
 * PKCE (Proof Key for Code Exchange) utilities for secure authentication
 */

/**
 * Generates a random string for use as a PKCE verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('')
}

/**
 * Generates a SHA-256 hash of the code verifier
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  
  // Convert digest to base64url format
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Generates a PKCE challenge pair (verifier and challenge)
 */
export async function generatePKCEChallenge(): Promise<{
  codeVerifier: string
  codeChallenge: string
}> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  return { codeVerifier, codeChallenge }
}

/**
 * Validates a PKCE code verifier against its challenge
 */
export async function validatePKCE(
  codeVerifier: string,
  storedCodeChallenge: string
): Promise<boolean> {
  const generatedChallenge = await generateCodeChallenge(codeVerifier)
  return generatedChallenge === storedCodeChallenge
} 