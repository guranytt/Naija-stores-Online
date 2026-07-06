import { supabase } from './src/supabase';

async function testSignup() {
  const email = `test_${Date.now()}@example.com`;
  const password = "password123";
  
  console.log("Attempting to sign up with", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        fullName: "Test User",
        role: "customer",
        location: "Lagos",
        deliveryAddress: "Test Address",
        shopName: "",
        phone: "1234567890"
      }
    }
  });

  if (error) {
    console.error("Signup error:", error.message, error);
  } else {
    console.log("Signup success:", data);
  }
}

testSignup();
