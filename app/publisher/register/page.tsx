"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublisherRegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Hàm tạo dữ liệu ngẫu nhiên
  const generateRandomData = () => {
    const publishers = [
      "Tech Media",
      "Digital News",
      "Creative Hub",
      "Modern Press",
      "Smart Content",
    ];
    const domains = ["gmail.com", "yahoo.com", "outlook.com"];
    const banks = ["Vietcombank", "Techcombank", "BIDV", "MB Bank"];
    const socialPlatforms = [
      "facebook.com/",
      "instagram.com/",
      "twitter.com/",
      "linkedin.com/in/",
    ];

    const randomName =
      publishers[Math.floor(Math.random() * publishers.length)] +
      " " +
      Math.floor(Math.random() * 1000);
    const randomEmail = `publisher${Math.floor(Math.random() * 10000)}@${
      domains[Math.floor(Math.random() * domains.length)]
    }`;
    const randomPhone = `09${Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0")}`;
    const randomPassword = `Pass${Math.floor(Math.random() * 10000)}!`;
    const randomDate = new Date(
      2024,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    )
      .toISOString()
      .split("T")[0];
    const randomDuration = [6, 12, 24, 36][Math.floor(Math.random() * 4)];
    const randomSocial =
      socialPlatforms[Math.floor(Math.random() * socialPlatforms.length)] +
      randomName.toLowerCase().replace(/\s/g, "");
    const randomBank = banks[Math.floor(Math.random() * banks.length)];
    const randomBankName =
      randomName.split(" ")[0] + Math.floor(Math.random() * 1000);

    return {
      publisherName: randomName,
      email: randomEmail,
      phoneNumber: randomPhone,
      password: randomPassword,
      contractDate: randomDate,
      contractDuration: randomDuration.toString(),
      socialMedia: randomSocial,
      bankType: randomBank,
      bankName: randomBankName,
    };
  };

  const handleAutoFill = (e: React.MouseEvent) => {
    e.preventDefault();
    const randomData = generateRandomData();

    const inputs = document.querySelectorAll("input, select");
    inputs.forEach((input: any) => {
      if (input.name && randomData[input.name as keyof typeof randomData]) {
        input.value = randomData[input.name as keyof typeof randomData];
      }
    });

    setMessage("✨ Đã điền thông tin ngẫu nhiên!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Processing...");

    const form = e.currentTarget;

    const data = {
      publisherName: (
        form.elements.namedItem("publisherName") as HTMLInputElement
      ).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phoneNumber: (form.elements.namedItem("phoneNumber") as HTMLInputElement)
        .value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      contractDate: (
        form.elements.namedItem("contractDate") as HTMLInputElement
      ).value,
      contractDuration: Number(
        (form.elements.namedItem("contractDuration") as HTMLInputElement).value
      ),
      socialMedia: (form.elements.namedItem("socialMedia") as HTMLInputElement)
        .value,
      bankType: (form.elements.namedItem("bankType") as HTMLSelectElement)
        .value,
      bankName: (form.elements.namedItem("bankName") as HTMLInputElement).value,
    };

    console.log("📤 Publisher Register Data:", data);

    try {
      const res = await fetch("http://localhost:3000/auth/publisher/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const text = await res.text();
      console.log("📥 Raw response:", text);

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        setMessage(text);
        return;
      }

      if (!res.ok) {
        setMessage(json.message || "Failed to create publisher account");
      } else {
        setMessage("🎉 Đăng ký thành công! Đang chuyển đến trang đăng nhập...");
        setTimeout(() => {
          router.push("/login/publisher");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-20 glass p-8 rounded-xl card-shadow">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Publisher Registration
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
        <Input label="Publisher Name" name="publisherName" />
        <Input label="Email" name="email" type="email" />
        <Input label="Phone Number" name="phoneNumber" />
        <Input label="Password" name="password" type="password" />

        <Input label="Contract Date" name="contractDate" type="date" />
        <Input
          label="Contract Duration (months)"
          name="contractDuration"
          type="number"
          min={1}
        />

        <Input
          label="Social Media"
          name="socialMedia"
          placeholder="Facebook / Website"
        />

        <div>
          <label>Bank Type</label>
          <select
            name="bankType"
            required
            className="bg-dark-200 rounded-md px-4 py-2 w-full"
          >
            <option value="Vietcombank">Vietcombank</option>
            <option value="Techcombank">Techcombank</option>
            <option value="BIDV">BIDV</option>
            <option value="MB Bank">MB Bank</option>
          </select>
        </div>

        <Input label="Bank Name" name="bankName" />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleAutoFill}
            className="bg-purple-600 hover:bg-purple-700 rounded-md py-3 font-bold text-white transition"
          >
            🎲 Điền Ngẫu Nhiên
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 rounded-md py-3 font-bold text-black disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Publisher Account"}
          </button>
        </div>
      </form>

      {message && (
        <p
          className={`mt-4 text-center ${
            message.includes("success") || message.includes("thành công")
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/* Reusable Input */
function Input({
  label,
  name,
  type = "text",
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  [key: string]: any;
}) {
  return (
    <div>
      <label>{label}</label>
      <input
        name={name}
        type={type}
        required
        className="bg-dark-200 rounded-md px-4 py-2 w-full"
        {...props}
      />
    </div>
  );
}
