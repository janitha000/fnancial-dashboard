"use server";
import { cookies } from "next/headers";

export async function verifyPin(pin: string) {
  const correctPin = process.env.APP_PIN;
  
  if (!correctPin) {
    console.error("CRITICAL: APP_PIN is not configured in environment variables.");
    return false; // Fail securely if no configuration
  }
  
  if (pin === correctPin) {
    // Generate secure HttpOnly cookie for session persistence across the browser
    (await cookies()).set("auth_pin", "true", { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days session
      path: "/",
      sameSite: "strict"
    });
    return true;
  }
  
  return false;
}

export async function checkAuth() {
  const cookieStore = await cookies();
  const authVal = cookieStore.get("auth_pin")?.value;
  return authVal === "true";
}
