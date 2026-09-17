function LoadingState({ label = "Loading" }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-indicator" aria-hidden="true" />
      {label}
    </div>
  );
}

export default LoadingState;
