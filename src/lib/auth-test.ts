// Authentication test utilities
import { isValidEmail, sanitizeEmail, extractDomain } from "./utils";

// Test function to validate admin role assignment logic
export const testAdminRoleAssignment = () => {
  console.log("Testing admin role assignment logic...");
  
  // Test cases
  const testCases = [
    {
      email: "admin@school.edu",
      adminDomains: ["school.edu"],
      adminEmails: [],
      expected: "admin",
      description: "Admin via domain"
    },
    {
      email: "teacher@school.edu",
      adminDomains: ["school.edu"],
      adminEmails: [],
      expected: "admin",
      description: "Teacher via domain"
    },
    {
      email: "user@gmail.com",
      adminDomains: ["school.edu"],
      adminEmails: [],
      expected: "user",
      description: "Regular user via different domain"
    },
    {
      email: "superadmin@gmail.com",
      adminDomains: [],
      adminEmails: ["superadmin@gmail.com"],
      expected: "admin",
      description: "Admin via explicit email"
    },
    {
      email: "invalid-email",
      adminDomains: ["school.edu"],
      adminEmails: [],
      expected: "user",
      description: "Invalid email fallback"
    },
    {
      email: "",
      adminDomains: ["school.edu"],
      adminEmails: [],
      expected: "user",
      description: "Empty email fallback"
    }
  ];

  // Mock environment variables for testing
  const originalAdminDomains = process.env.ADMIN_DOMAINS;
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  testCases.forEach((testCase, index) => {
    // Set mock environment variables
    process.env.ADMIN_DOMAINS = testCase.adminDomains.join(",");
    process.env.ADMIN_EMAILS = testCase.adminEmails.join(",");

    // Simulate the determineUserRole function
    const determineUserRole = (email: string): "admin" | "user" => {
      if (!email || !isValidEmail(email)) {
        return "user";
      }
      
      const sanitizedEmail = sanitizeEmail(email);
      
      const adminDomains = (process.env.ADMIN_DOMAINS || "")
        .split(",")
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0);
      
      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map(e => e.trim().toLowerCase())
        .filter(e => isValidEmail(e));
      
      const domain = extractDomain(sanitizedEmail);
      
      if (domain && adminDomains.includes(domain)) {
        return "admin";
      }
      
      if (adminEmails.includes(sanitizedEmail)) {
        return "admin";
      }
      
      return "user";
    };

    const result = determineUserRole(testCase.email);
    const passed = result === testCase.expected;
    
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Email: ${testCase.email}`);
    console.log(`  Expected: ${testCase.expected}, Got: ${result}`);
    console.log(`  Status: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    console.log("");

    // Restore original environment variables
    process.env.ADMIN_DOMAINS = originalAdminDomains;
    process.env.ADMIN_EMAILS = originalAdminEmails;
  });
};

// Test email validation utilities
export const testEmailValidation = () => {
  console.log("Testing email validation utilities...");
  
  const testCases = [
    { email: "test@example.com", valid: true },
    { email: "user@school.edu", valid: true },
    { email: "invalid-email", valid: false },
    { email: "", valid: false },
    { email: "@domain.com", valid: false },
    { email: "user@", valid: false },
    { email: "user@.com", valid: false },
    { email: "test.email+tag@example.com", valid: true }
  ];

  testCases.forEach((testCase, index) => {
    const result = isValidEmail(testCase.email);
    const passed = result === testCase.valid;
    
    console.log(`Validation Test ${index + 1}:`);
    console.log(`  Email: "${testCase.email}"`);
    console.log(`  Expected: ${testCase.valid}, Got: ${result}`);
    console.log(`  Status: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    console.log("");
  });
};
