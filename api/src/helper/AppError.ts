type Props = {
  statusCode: number;
  message: string;
  stack?: string;
};

class AppError extends Error {
  statusCode: number;

  constructor({ statusCode, message, stack }: Props) {
    super();
    this.statusCode = statusCode;
    this.message = message;
    this.stack = stack;
  }
}

export default AppError;
