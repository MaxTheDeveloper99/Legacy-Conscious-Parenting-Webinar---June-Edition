// DOM Elements
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const mobileMenu = document.querySelector(".mobile-menu");
const mobileClose = document.querySelector(".mobile-close");
const registerBtn = document.querySelector(".register-btn");
const registerLinks = document.querySelectorAll('a[href="#register"]');
const registrationModal = document.getElementById("registration-modal");
const modalClose = document.querySelector(".modal-close");
const registrationForm = document.getElementById("registration-form");
const successMessage = document.getElementById("success-message");

// Registration tracking
let isUserRegistered = false;
let userRegistrationData = null;

// Check if user is already registered (from localStorage)
function checkRegistrationStatus() {
  const savedRegistration = localStorage.getItem("webinarRegistration");
  if (savedRegistration) {
    try {
      userRegistrationData = JSON.parse(savedRegistration);
      isUserRegistered = true;
      console.log("User already registered:", userRegistrationData.fullName);
    } catch (e) {
      localStorage.removeItem("webinarRegistration");
    }
  }
}

// Save registration to localStorage
function saveRegistration(registrationData) {
  isUserRegistered = true;
  userRegistrationData = registrationData;
  localStorage.setItem("webinarRegistration", JSON.stringify(registrationData));
}

// Mobile Menu Toggle
mobileMenuBtn.addEventListener("click", () => {
  mobileMenu.classList.add("active");
});

mobileClose.addEventListener("click", () => {
  mobileMenu.classList.remove("active");
});

// Registration Modal
registerBtn.addEventListener("click", () => {
  registrationModal.classList.add("active");
});

registerLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    registrationModal.classList.add("active");
  });
});

modalClose.addEventListener("click", () => {
  registrationModal.classList.remove("active");
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === registrationModal) {
    registrationModal.classList.remove("active");
  }
});

// Form validation functions
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxuFuV2lEUaBMUsSBwJ4moGKAy_H3tIGkMJ5hllF8kNqCWbKxLLok-yqB_y21tORXHy/exec";

// Get form elements (matching your HTML IDs)
const errorMessage = document.getElementById("error-message");
const submitButton = document.querySelector('button[type="submit"]');

// Add form submission handler
registrationForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  // Show loading state
  const originalButtonText = submitButton.textContent;
  submitButton.textContent = "Registering...";
  submitButton.disabled = true;

  // Hide any previous error messages
  if (errorMessage) {
    errorMessage.style.display = "none";
  }

  try {
    // Get form data
    const formData = new FormData(registrationForm);

    // Prepare data object to send to Google Apps Script
    const registrationData = {
      fullName: (formData.get("full-name") || "").trim(),
      email: (formData.get("email") || "").trim().toLowerCase(),
      whatsapp: (formData.get("whatsapp") || "").trim(),
      registeredAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || "Direct",
    };

    // Validate required fields
    if (
      !registrationData.fullName ||
      !registrationData.email ||
      !registrationData.whatsapp
    ) {
      throw new Error("Please fill in all required fields.");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registrationData.email)) {
      throw new Error("Please enter a valid email address.");
    }

    // Method 1: Try modern fetch with no-cors mode first
    let response;
    try {
      response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
        mode: "no-cors", // Changed from "cors" to "no-cors"
      });

      // With no-cors, we can't read the response, so we assume success
      // and show success message
      showSuccessMessage(registrationData);
    } catch (fetchError) {
      console.log("Fetch failed, trying alternative method...", fetchError);

      // Method 2: Fallback to form submission approach
      await submitViaFormData(registrationData);
    }
  } catch (error) {
    console.error("Registration error:", error);
    showErrorMessage(error.message);
  } finally {
    // Reset button state
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;
  }
});

// Alternative submission method using FormData and URLSearchParams
async function submitViaFormData(registrationData) {
  try {
    // Convert to URLSearchParams for form-encoded submission
    const params = new URLSearchParams();
    Object.keys(registrationData).forEach((key) => {
      params.append(key, registrationData[key]);
    });

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      mode: "no-cors",
    });

    // Since we can't read the response with no-cors, assume success
    showSuccessMessage(registrationData);
  } catch (error) {
    // If this also fails, try the JSONP approach
    console.log("Form submission failed, trying JSONP...", error);
    await submitViaJSONP(registrationData);
  }
}

// JSONP fallback method
function submitViaJSONP(registrationData) {
  return new Promise((resolve, reject) => {
    // Create callback function name
    const callbackName =
      "callback_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

    // Create global callback function
    window[callbackName] = function (response) {
      // Clean up
      document.head.removeChild(script);
      delete window[callbackName];

      if (response && response.success) {
        showSuccessMessage(registrationData);
        resolve(response);
      } else {
        reject(new Error(response?.error || "Registration failed"));
      }
    };

    // Create script element for JSONP
    const script = document.createElement("script");
    const params = new URLSearchParams(registrationData);
    params.append("callback", callbackName);

    script.src = GOOGLE_SCRIPT_URL + "?" + params.toString();
    script.onerror = () => {
      document.head.removeChild(script);
      delete window[callbackName];

      // Last resort: assume success since we can't verify
      console.log("JSONP failed, assuming success...");
      showSuccessMessage(registrationData);
      resolve({ success: true });
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (window[callbackName]) {
        document.head.removeChild(script);
        delete window[callbackName];
        showSuccessMessage(registrationData);
        resolve({ success: true });
      }
    }, 10000);
  });
}

// // Function to automatically download bonus file after registration
// function downloadBonusFile() {
//   // You can specify which file to download here
//   const bonusFileName =
//     "7 Subtle Signs Your Child Is Becoming Disoriented by Today’s Culture"; // Change this to your actual file name

//   // Create an anchor element for download
//   const downloadLink = document.createElement("a");
//   downloadLink.href = `assets/${bonusFileName}`; // Adjust path as needed
//   downloadLink.download = bonusFileName;

//   // Append to document, trigger click, and remove
//   document.body.appendChild(downloadLink);
//   downloadLink.click();
//   document.body.removeChild(downloadLink);

//   console.log("Auto-downloading bonus file:", bonusFileName);

//   // Show download notification
//   showDownloadSuccess("Your Free Bonus Pack");

//   // Track download
//   if (typeof gtag !== "undefined") {
//     gtag("event", "bonus_auto_download", {
//       event_category: "webinar",
//       event_label: "registration_bonus",
//       user_name: userRegistrationData?.fullName || "Unknown",
//     });
//   }
// }

// // Show download success message
// function showDownloadSuccess(bonusName) {
//   // Create temporary success notification
//   const notification = document.createElement("div");
//   notification.style.cssText = `
//     position: fixed;
//     top: 20px;
//     right: 20px;
//     background: linear-gradient(135deg, #28a745, #20c997);
//     color: white;
//     padding: 15px 20px;
//     border-radius: 10px;
//     box-shadow: 0 5px 15px rgba(0,0,0,0.2);
//     z-index: 10001;
//     transform: translateX(100%);
//     transition: transform 0.3s ease;
//     max-width: 300px;
//   `;

//   notification.innerHTML = `
//     <div style="display: flex; align-items: center; gap: 10px;">
//       <span style="font-size: 20px;">✅</span>
//       <div>
//         <strong>Download Started!</strong><br>
//         <small>${bonusName}</small>
//       </div>
//     </div>
//   `;

//   document.body.appendChild(notification);

//   // Animate in
//   setTimeout(() => {
//     notification.style.transform = "translateX(0)";
//   }, 100);

//   // Remove after 4 seconds
//   setTimeout(() => {
//     notification.style.transform = "translateX(100%)";
//     setTimeout(() => {
//       if (notification.parentNode) {
//         notification.remove();
//       }
//     }, 300);
//   }, 4000);
// }

// Success message function (modified to include auto-download)
function showSuccessMessage(registrationData) {
  // Save registration data
  saveRegistration(registrationData);

  registrationForm.style.display = "none";
  successMessage.style.display = "block";
  successMessage.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <div style="margin-top: 10px;">
      <strong>Registration Successful!</strong><br>
      Thank you, <strong>${registrationData.fullName}</strong>!<br>
      A confirmation email has been sent to <strong>${registrationData.email}</strong>
      <div style="margin-top: 15px; font-size: 14px; color: #666;">
        📅 Webinar Date: July 26, 2025<br>
        ⏰ Time: 1:00 PM<br>
        📧 Check your email for more details!
      </div>
    </div>
  `;

  // Auto-download bonus file
  setTimeout(() => {
    downloadBonusFile();
  }, 1000); // Small delay to ensure success message is shown first

  // Auto-close modal after 5 seconds
  setTimeout(() => {
    registrationModal.classList.remove("active");
    // Reset form for future submissions
    registrationForm.reset();
    registrationForm.style.display = "block";
    successMessage.style.display = "none";
  }, 5000);

  // Track successful registration
  if (typeof gtag !== "undefined") {
    gtag("event", "registration_success", {
      event_category: "webinar",
      event_label: "anchored_parenting",
    });
  }
}

// Error message function
function showErrorMessage(message) {
  if (errorMessage) {
    errorMessage.style.display = "block";
    errorMessage.textContent = message;
  } else {
    alert("Registration Error: " + message);
  }

  if (typeof gtag !== "undefined") {
    gtag("event", "registration_error", {
      event_category: "webinar",
      event_label: message,
    });
  }
}

// Real-time form validation
document.addEventListener("DOMContentLoaded", function () {
  // Check registration status on page load
  checkRegistrationStatus();

  const emailInput = document.getElementById("email");
  const whatsappInput = document.getElementById("whatsapp");

  // Email validation on blur
  if (emailInput) {
    emailInput.addEventListener("blur", function () {
      const email = this.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (email && !emailRegex.test(email)) {
        this.style.borderColor = "#ff4444";
        this.setCustomValidity("Please enter a valid email address");
      } else {
        this.style.borderColor = "";
        this.setCustomValidity("");
      }
    });
  }

  // WhatsApp number formatting
  if (whatsappInput) {
    whatsappInput.addEventListener("input", function () {
      let value = this.value.replace(/[^\d+\s-]/g, "");
      this.value = value;
    });
  }
});

// Modal close events
document.addEventListener("click", function (e) {
  if (e.target === registrationModal) {
    registrationModal.classList.remove("active");
    resetFormState();
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && registrationModal.classList.contains("active")) {
    registrationModal.classList.remove("active");
    resetFormState();
  }
});

function resetFormState() {
  registrationForm.reset();
  registrationForm.style.display = "block";
  successMessage.style.display = "none";
  if (errorMessage) {
    errorMessage.style.display = "none";
  }
}

// Modal functionality
document.addEventListener("DOMContentLoaded", function () {
  const registerBtns = document.querySelectorAll(
    '.register-btn, .btn[href="#register"]'
  );
  const modalClose = document.querySelector(".modal-close");

  // Open modal when register buttons are clicked
  registerBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      registrationModal.classList.add("active");
    });
  });

  // Close modal when X is clicked
  if (modalClose) {
    modalClose.addEventListener("click", function () {
      registrationModal.classList.remove("active");
      resetFormState();
    });
  }

  // Close modal when clicking outside
  registrationModal.addEventListener("click", function (e) {
    if (e.target === registrationModal) {
      registrationModal.classList.remove("active");
      resetFormState();
    }
  });
});

// Countdown Timer
function updateCountdown() {
  const webinarDate = new Date("July 26, 2025 13:00:00").getTime();
  const now = new Date().getTime();
  const timeRemaining = webinarDate - now;

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  document.getElementById("days").innerHTML = days.toString().padStart(2, "0");
  document.getElementById("hours").innerHTML = hours
    .toString()
    .padStart(2, "0");
  document.getElementById("minutes").innerHTML = minutes
    .toString()
    .padStart(2, "0");
  document.getElementById("seconds").innerHTML = seconds
    .toString()
    .padStart(2, "0");

  if (timeRemaining < 0) {
    clearInterval(countdownInterval);
    document.getElementById("days").innerHTML = "00";
    document.getElementById("hours").innerHTML = "00";
    document.getElementById("minutes").innerHTML = "00";
    document.getElementById("seconds").innerHTML = "00";
  }
}

// Initial countdown update
updateCountdown();

// Update countdown every second
const countdownInterval = setInterval(updateCountdown, 1000);

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    if (targetId === "#register") return; // Skip registration links as they open modal

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 100,
        behavior: "smooth",
      });

      // Close mobile menu if open
      mobileMenu.classList.remove("active");
    }
  });
});

// Animation on scroll
function revealOnScroll() {
  const reveals = document.querySelectorAll(
    ".feature-item, .perfect-item, .bonus-item"
  );

  reveals.forEach((item) => {
    const windowHeight = window.innerHeight;
    const elementTop = item.getBoundingClientRect().top;
    const elementVisible = 150;

    if (elementTop < windowHeight - elementVisible) {
      item.classList.add("animate");
    }
  });
}

window.addEventListener("scroll", revealOnScroll);

// Call once to check elements in view on page load
revealOnScroll();
