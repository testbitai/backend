export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

export class ApiResponse<T = any> {
  success: boolean;
  status: number;
  message?: string;
  data?: T;
  error?: any;

  constructor(
    res: any,
    status: number,
    message?: string,
    data?: T,
    error?: any
  ) {
    this.success = status >= 200 && status < 300;
    this.status = status;
    this.message = message;
    this.data = data;
    this.error = error;
    if (res) {
      res.status(status).json(this);
    }
  }
}
