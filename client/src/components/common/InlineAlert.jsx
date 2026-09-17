function InlineAlert({ children, tone = "info" }) {
  return (
    <div
      className={`inline-alert inline-alert--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export default InlineAlert;
