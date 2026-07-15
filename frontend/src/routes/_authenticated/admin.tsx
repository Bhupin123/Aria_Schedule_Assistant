import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff, Users, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Aria" },
      { name: "description", content: "Manage users and roles." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: "admin" | "user";
}

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const profilesQ = useQuery({
    enabled: isAdmin,
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const rolesQ = useQuery({
    enabled: isAdmin,
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id,role");
      if (error) throw error;
      return data as RoleRow[];
    },
  });

  const roleByUser = useMemo(() => {
    const m = new Map<string, Set<string>>();
    (rolesQ.data ?? []).forEach((r) => {
      if (!m.has(r.user_id)) m.set(r.user_id, new Set());
      m.get(r.user_id)!.add(r.role);
    });
    return m;
  }, [rolesQ.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = profilesQ.data ?? [];
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.email?.toLowerCase().includes(q) ||
        p.display_name?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [profilesQ.data, query]);

  const promote = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promoted to admin");
      qc.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const demote = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Admin removed");
      qc.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Admins only</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            You don't have permission to view this page.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/chat">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to app
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const totalUsers = profilesQ.data?.length ?? 0;
  const totalAdmins = Array.from(roleByUser.values()).filter((s) => s.has("admin")).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin panel
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Users & roles</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage everyone who can access Aria.
            </p>
          </div>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="glass p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wider">
              <Users className="h-3.5 w-3.5" /> Total users
            </div>
            <p className="mt-2 font-display text-3xl font-bold">{totalUsers}</p>
          </Card>
          <Card className="glass p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" /> Admins
            </div>
            <p className="mt-2 font-display text-3xl font-bold">{totalAdmins}</p>
          </Card>
          <Card className="glass p-5">
            <div className="text-muted-foreground text-xs uppercase tracking-wider">
              Signed in as
            </div>
            <p className="mt-2 truncate text-sm font-medium">{user?.email}</p>
          </Card>
        </div>

        <Card className="glass overflow-hidden">
          <div className="border-b p-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email, name, or ID..."
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profilesQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center text-sm">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const roles = roleByUser.get(p.id) ?? new Set();
                  const isRowAdmin = roles.has("admin");
                  const isSelf = p.id === user?.id;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="gradient-brand-bg grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-primary-foreground">
                              {(p.display_name || p.email || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium">
                              {p.display_name || "—"}
                              {isSelf && (
                                <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">{p.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {isRowAdmin ? (
                          <Badge className="gradient-brand-bg text-primary-foreground">Admin</Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isRowAdmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf || demote.isPending}
                            onClick={() => demote.mutate(p.id)}
                          >
                            Revoke admin
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={promote.isPending}
                            onClick={() => promote.mutate(p.id)}
                          >
                            Make admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Tip: the first admin must be promoted manually via the database. After that, admins can
          manage each other here.
        </p>
      </div>
    </AppShell>
  );
}
