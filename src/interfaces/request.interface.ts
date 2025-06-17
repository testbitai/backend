import { Request } from "express";

export interface RequestUser {
   _id: string;
    role: string;
    email: string;
}

export interface RequestWithUser extends Request {
  user?: RequestUser;
}
