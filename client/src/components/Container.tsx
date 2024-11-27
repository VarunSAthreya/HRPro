function Container({ children }) {
  return (
    <div
      className={`py-8 px-6 min-h-screen flex flex-col items-start w-full overflow-y-scroll place-content-center`}
    >
      {children}
    </div>
  );
}

export default Container;
