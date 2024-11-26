function PageLayout({ className, children }) {
  return (
    <div
      className={`py-8 px-6 min-h-screen flex flex-col items-start ${className}`}
    >
      {children}
    </div>
  );
}

export default PageLayout;
