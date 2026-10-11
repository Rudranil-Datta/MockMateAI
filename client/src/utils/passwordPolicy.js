const minimumPasswordBytes = 15;
const maximumPasswordBytes = 72;
const passwordDigitOrSpecialCharacterPattern = /[\p{N}\p{P}\p{S}]/u;
const passwordControlCharacterPattern = /[\p{Cc}\p{Cf}]/u;

function getUtf8ByteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

export function getPasswordPolicyError({ email = "", name = "", password }) {
  const passwordBytes = getUtf8ByteLength(password);

  if (
    passwordBytes < minimumPasswordBytes ||
    passwordBytes > maximumPasswordBytes
  ) {
    return "Use a password between 15 and 72 bytes.";
  }

  if (passwordControlCharacterPattern.test(password)) {
    return "Password cannot contain control characters.";
  }

  if (!passwordDigitOrSpecialCharacterPattern.test(password)) {
    return "Include at least one number or special character.";
  }

  const normalizedPassword = password.toLowerCase();
  if (
    (email && normalizedPassword === email.trim().toLowerCase()) ||
    (name && normalizedPassword === name.trim().toLowerCase())
  ) {
    return "Password must not match your name or email.";
  }

  return "";
}
