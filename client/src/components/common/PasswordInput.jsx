import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

function PasswordInput(props) {
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? "Hide password" : "Show password";

  return (
    <span className="password-input">
      <input {...props} type={isVisible ? "text" : "password"} />
      <button
        aria-label={label}
        className="password-visibility-toggle"
        onClick={() => setIsVisible((current) => !current)}
        type="button"
      >
        {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </span>
  );
}

export default PasswordInput;
