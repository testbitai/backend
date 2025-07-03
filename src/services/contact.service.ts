import ContactModel, { ContactDocument } from "../models/contact.model";

class ContactService {
  public async createContact(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<ContactDocument> {
    const contact = await ContactModel.create(data);
    return contact;
  }

   public async getAllContacts(query: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, page = 1, limit = 10 } = query;

    const filter: any = {};

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { subject: regex },
        { message: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const data = await ContactModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ContactModel.countDocuments(filter);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export default new ContactService();
