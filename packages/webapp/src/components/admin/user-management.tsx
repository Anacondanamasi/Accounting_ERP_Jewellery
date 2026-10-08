"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type TableColumn } from "@/components/admin/data-table";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { deleteUser, listUsers, type UserRow, updateUser } from "@/services/admin-service";

export function UserManagement() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: queryError } = await listUsers();
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as UserRow[]);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const columns = useMemo<TableColumn<UserRow>[]>(
    () => [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      {
        key: "created_at",
        label: "Created At",
        render: (value: unknown) =>
          value ? new Date(String(value)).toLocaleDateString() : "-"
      },
      {
        key: "id",
        label: "Actions",
        render: (_: unknown, row: UserRow) => (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(row)}>
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteUser(row.id);
                await load();
              }}
            >
              Delete
            </Button>
          </div>
        )
      }
    ],
    []
  );

  if (loading) {
    return <p className="text-sm text-slate-600">Loading users...</p>;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Users</h2>
        <p className="text-sm text-slate-500">
          Search, paginate, edit roles, and remove users based on Supabase RLS policy.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {editing ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Edit User</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-600">Full Name</label>
              <Input
                value={editing.full_name ?? ""}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, full_name: event.target.value } : prev
                  )
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Role</label>
              <Input
                value={editing.role ?? "user"}
                onChange={(event) =>
                  setEditing((prev) => (prev ? { ...prev, role: event.target.value } : prev))
                }
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={async () => {
                await updateUser(editing.id, {
                  full_name: editing.full_name,
                  role: editing.role
                });
                setEditing(null);
                await load();
              }}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={["full_name", "email", "role"]}
      />
    </section>
  );
}
