"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("Processing...");
    setLoading(true);

    const form = e.currentTarget;

    const data = {
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phoneNumber: (form.elements.namedItem("phoneNumber") as HTMLInputElement)
        .value,
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      genderId: (form.elements.namedItem("genderId") as HTMLSelectElement)
        .value,
    };

    // ⭐ Debug: Log data being sent
    console.log("📤 Sending registration data:", data);

    try {
      const res = await fetch("http://localhost:3000/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // ⭐ Debug: Log raw response
      const responseText = await res.text();
      console.log("📥 Raw response text:", responseText);
      console.log("📥 Response status:", res.status);
      console.log("📥 Response headers:", Object.fromEntries(res.headers));

      let json;
      try {
        json = JSON.parse(responseText);
        console.log("📥 Parsed response:", json);
      } catch (parseError) {
        console.error("❌ Cannot parse JSON:", parseError);
        setMessage(`Server error: ${responseText}`);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        // ⭐ Debug: Log error details
        console.error("❌ Error details:", {
          status: res.status,
          statusText: res.statusText,
          body: json,
          error: json.error,
          message: json.message,
        });

        // Handle different error codes
        switch (res.status) {
          case 409:
            const conflictDetails =
              json.error?.details || json.message || "Unknown conflict";
            setMessage(
              `Conflict: ${conflictDetails}. Email "${data.email}" or Username "${data.username}" may already exist.`
            );
            console.error(
              "🔴 409 Conflict - Check if email/username/phone already exists in database"
            );
            break;
          case 422:
            setMessage(
              json.error?.message ||
                json.message ||
                "Invalid input. Please check your data."
            );
            console.error("🔴 422 Validation Error:", json);
            break;
          default:
            setMessage(
              json.error?.message || json.message || "Failed to create account."
            );
        }
      } else {
        // Success
        console.log("✅ Account created successfully:", json);
        setMessage("Account created successfully!");
        form.reset();
      }
    } catch (err: unknown) {
      console.error("❌ Network error:", err);
      if (err instanceof Error) {
        setMessage(`Network error: ${err.message}`);
      } else {
        setMessage("Unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // ⭐ Helper function to fill random test data
  const fillRandomData = () => {
    const rand = Math.random().toString(36).substring(7);
    const form = document.querySelector("form") as HTMLFormElement;
    if (form) {
      (
        form.elements.namedItem("email") as HTMLInputElement
      ).value = `test${rand}@example.com`;
      (
        form.elements.namedItem("phoneNumber") as HTMLInputElement
      ).value = `09${Math.floor(Math.random() * 100000000)}`;
      (
        form.elements.namedItem("username") as HTMLInputElement
      ).value = `user${rand}`;
      (form.elements.namedItem("password") as HTMLInputElement).value =
        "password123";
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 glass p-8 rounded-xl card-shadow">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Create your account
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label>Email</label>
          <input
            type="email"
            name="email"
            required
            className="bg-dark-200 rounded-md px-4 py-2 w-full"
          />
        </div>

        <div>
          <label>Phone Number</label>
          <input
            type="text"
            name="phoneNumber"
            required
            className="bg-dark-200 rounded-md px-4 py-2 w-full"
          />
        </div>

        <div>
          <label>Username</label>
          <input
            type="text"
            name="username"
            required
            className="bg-dark-200 rounded-md px-4 py-2 w-full"
          />
        </div>

        <div>
          <label>Password</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="bg-dark-200 rounded-md px-4 py-2 w-full"
          />
        </div>

        <div>
          <label>Gender ID</label>
          <select
            name="genderId"
            required
            className="bg-dark-200 rounded-md px-4 py-2 w-full"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* ⭐ Test button */}
        {/* <button
          type="button"
          onClick={fillRandomData}
          className="bg-purple-600 hover:bg-purple-700 rounded-md py-2 font-bold text-white"
        >
          🎲 Fill Random Test Data
        </button> */}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary/90 rounded-md py-3 font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-center ${
            message.includes("successfully")
              ? "text-green-400"
              : message.includes("Error") || message.includes("Conflict")
              ? "text-red-400"
              : "text-light-100"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
