
export const BACKEND_URL =
  import.meta.env.PROD 
    ? "https://crack-monkfish-monthly.ngrok-free.app" 
    : "http://127.0.0.1:8001"
export const EMAIL_KEY = "email_b64"