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
      {...props}
      disabled={isLoading || props.disabled}
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}

export default Button;
