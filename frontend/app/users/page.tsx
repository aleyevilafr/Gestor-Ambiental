import type { Metadata } from "next";

import { DashboardGate } from "@/components/auth/dashboard-gate";
import { UsersManagement } from "@/features/users/users-management";

export const metadata: Metadata = {
  title: "Usuarios | Gestión de Cumplimiento Ambiental",
};

export default function UsersPage() {
  return (
    <DashboardGate>
      <UsersManagement />
    </DashboardGate>
  );
}
