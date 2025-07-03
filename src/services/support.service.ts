import SupportTicketModel, {
  CounterModel,
} from "../models/supportTicket.model";
import mongoose from "mongoose";

const getNextSupportTicketId = async (): Promise<string> => {
  const result = await CounterModel.findByIdAndUpdate(
    "supportTicket",
    { $inc: { sequenceValue: 1 } },
    { upsert: true, new: true }
  );

  const ticketNumber = result?.sequenceValue || 1;
  return `TKT-${ticketNumber.toString().padStart(3, "0")}`;
};

class SupportService {
  public createSupportTicket = async (
    user: any,
    data: {
      subject: string;
      category: string;
      priority: string;
      description: string;
    }
  ) => {
    const ticketId = await getNextSupportTicketId();
    const ticket = await SupportTicketModel.create({
      ticketId,
      ...data,
      createdBy: user._id,
    });
    return ticket;
  };

  public getSupportTicketsByUser = async (
    userId: mongoose.Types.ObjectId,
    query: {
      search?: string;
      category?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      page?: number;
      limit?: number;
    }
  ) => {
    const {
    search,
    category,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 10,
  } = query;

  const filter: any = { createdBy: userId };

  // SEARCH
  if (search) {
    const regex = new RegExp(search, "i"); // case-insensitive
    filter.$or = [
      { ticketId: regex },
      { subject: regex },
      { description: regex },
    ];
  }

  // FILTERS
  if (category) {
    filter.category = category;
  }

  if (status) {
    filter.status = status;
  }

  // SORT
  const sortOptions: any = {};
  const allowedSortFields = ["createdAt", "subject", "priority", "status"];
  if (allowedSortFields.includes(sortBy)) {
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sortOptions["createdAt"] = -1;
  }

  // PAGINATION
  const skip = (page - 1) * limit;

  const tickets = await SupportTicketModel.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const total = await SupportTicketModel.countDocuments(filter);

  return {
    data: tickets,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
  };

  public getAllSupportTickets = async (filters: any) => {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    const tickets = await SupportTicketModel.find(query)
      .populate([
      { path: "createdBy", select: "name email" },
      { path: "resolvedBy", select: "name email" }
      ])
      .sort({ createdAt: -1 });

    return tickets;
  };

  public getSupportTicketById = async (id: string) => {
    const ticket = await SupportTicketModel.findById(id).populate(
      "createdBy resolvedBy"
    );
    if (!ticket) {
      throw new Error("Support ticket not found");
    }
    return ticket;
  };

  public updateSupportTicket = async (
    id: string,
    updates: any,
    adminId: mongoose.Types.ObjectId
  ) => {
    const ticket = await SupportTicketModel.findById(id);

    if (!ticket) {
      throw new Error("Support ticket not found");
    }

    if (updates.status && updates.status === "Resolved") {
      ticket.resolvedBy = adminId;
      ticket.resolvedAt = new Date();
    }

    if (updates.status) {
      ticket.status = updates.status;
    }

    if (updates.resolutionNotes !== undefined) {
      ticket.resolutionNotes = updates.resolutionNotes;
    }

    await ticket.save();

    return ticket;
  };

  public getSupportAnalytics = async () => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Open tickets count
    const openTicketsCount = await SupportTicketModel.countDocuments({
      status: "Open",
    });

    // 2. Tickets resolved today
    const resolvedTodayCount = await SupportTicketModel.countDocuments({
      status: "Resolved",
      resolvedAt: { $gte: startOfToday },
    });

    // 3. Average response time (in hours)
    const avgResponseTimeResult = await SupportTicketModel.aggregate([
      {
        $match: {
          status: "Resolved",
          resolvedAt: { $ne: null },
        },
      },
      {
        $project: {
          resolutionTimeInHours: {
            $divide: [
              { $subtract: ["$resolvedAt", "$createdAt"] },
              1000 * 60 * 60, // milliseconds → hours
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTimeInHours: { $avg: "$resolutionTimeInHours" },
        },
      },
    ]);

    const avgResponseTime =
      avgResponseTimeResult[0]?.avgResponseTimeInHours || 0;

    return {
      openTicketsCount,
      resolvedTodayCount,
      avgResponseTimeInHours: avgResponseTime,
    };
  };
}

export default new SupportService();
