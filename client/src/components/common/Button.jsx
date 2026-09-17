function Button({
  children,
  className = "",
  isLoading = false,
  loadingLabel = "Working...",
  type = "button",
  ...props
}) {
  return (
    <button
      className={`button ${className}`.trim()}
      type={type}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}

export default Button;
