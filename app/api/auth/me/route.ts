import {
  getAuthUser,
  unauthorizedResponse,
} from "@/lib/api/helpers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department,
    },
  });
}
