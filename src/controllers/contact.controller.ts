import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import contactService from "../services/contact.service";
import { ApiResponse } from "../utils/apiResponse";

class ContactController {
  public createContact = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await contactService.createContact(req.body);

      new ApiResponse(
        res,
        httpStatus.CREATED,
        "Your message has been submitted successfully!",
        result
      );
    } catch (error) {
      next(error);
    }
  };

  public getContacts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await contactService.getAllContacts({
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
    });

      new ApiResponse(
        res,
        httpStatus.OK,
        "Contacts fetched successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new ContactController();
