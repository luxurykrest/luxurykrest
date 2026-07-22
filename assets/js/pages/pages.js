/* ---------- Email step (account.html) ---------- */

const emailInput = document.getElementById("email-input");
const emailError = document.getElementById("email-error");
const continueBtn = document.getElementById("continue-btn");

function isValidEmail(value) {
  // must contain @ and a dot after it, no spaces
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(value.trim());
}

async function saveEmail(email) {
  try {
    const response = await fetch("http://localhost:3000/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Something went wrong. Please try again.");
      return false;
    }

    localStorage.setItem("email", email);
    return true;
  } catch (err) {
    console.error(err);
    alert("Couldn't reach the server. Please try again.");
    return false;
  }
}

if (continueBtn) {
  continueBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const value = emailInput.value.trim();

    if (!isValidEmail(value)) {
      emailInput.classList.add("invalid");
      emailError.classList.add("show");
      return;
    }

    emailInput.classList.remove("invalid");
    emailError.classList.remove("show");

    continueBtn.disabled = true;
    continueBtn.textContent = "Please wait…";

    const ok = await saveEmail(value);

    if (ok) {
      location.href = "pages/details.html";
    } else {
      continueBtn.disabled = false;
      continueBtn.textContent = "Continue";
    }
  });

  // clear the error as soon as the person edits the field again
  emailInput.addEventListener("input", () => {
    if (emailInput.classList.contains("invalid")) {
      emailInput.classList.remove("invalid");
      emailError.classList.remove("show");
    }
  });
}

/* ---------- Details step (pages/details.html) ---------- */

async function saveNames() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = localStorage.getItem("email");

  if (!firstName || !lastName) {
    alert("Please enter your first and last name.");
    return false;
  }

  try {
    const response = await fetch("http://localhost:3000/api/save-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Something went wrong. Please try again.");
      return false;
    }

    localStorage.setItem("firstName", firstName);
    localStorage.setItem("lastName", lastName);
    return true;
  } catch (err) {
    console.error(err);
    alert("Couldn't reach the server. Please try again.");
    return false;
  }
}

async function handleContinue() {
  const ok = await saveNames();
  if (ok) location.href = "verify.html";
}

/* ---------- Verify step (pages/verify.html) ---------- */

async function verifyOtp() {
  const email = localStorage.getItem("email");
  const inputs = document.querySelectorAll(".otp");
  const code = Array.from(inputs)
    .map((i) => i.value)
    .join("");

  if (code.length !== 6) {
    alert("Enter the complete 6-digit code.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "That code isn't right.");
      return;
    }

    location.href = "../account.html";
  } catch (err) {
    console.error(err);
    alert("Couldn't reach the server. Please try again.");
  }
}

let resendInterval;

function startResendCountdown(seconds = 30) {
  const countdownEl = document.getElementById("countdown");
  const resendTextEl = document.getElementById("resendText");
  if (!countdownEl) return;

  let remaining = seconds;
  countdownEl.textContent = remaining;

  clearInterval(resendInterval);
  resendInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(resendInterval);
      resendTextEl.innerHTML = `<a href="#" id="resendLink" class="resend-Link">Send a new code</a>`;
      document.getElementById("resendLink").addEventListener("click", async (e) => {
        e.preventDefault();
        await resendOtp();
      });
    } else {
      countdownEl.textContent = remaining;
    }
  }, 1000);
}

async function resendOtp() {
  const email = localStorage.getItem("email");

  try {
    const response = await fetch("http://localhost:3000/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Something went wrong. Please try again.");
      return;
    }

    document.getElementById("resendText").innerHTML = `Request a new code in <span id="countdown">30</span> seconds`;
    startResendCountdown();
  } catch (err) {
    console.error(err);
    alert("Couldn't reach the server. Please try again.");
  }
}

/* ---------- Shared page setup ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const saved = document.getElementById("savedEmail");
  if (saved) {
    saved.textContent = localStorage.getItem("email") || "";
  }

  const inputs = document.querySelectorAll(".otp");
  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });
  });

  if (document.getElementById("countdown")) {
    startResendCountdown();
  }
});

document.getElementById("account-icon")?.addEventListener("click", (e) => {
  e.preventDefault();
  const email = localStorage.getItem("email");
  window.location.href = email ? "my-requests.html" : "account.html";
});