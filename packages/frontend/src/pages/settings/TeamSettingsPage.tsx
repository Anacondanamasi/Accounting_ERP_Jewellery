import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { teamService } from "@/services/teamService";
import { useAuthStore } from "@/stores/authStore";
import { ShieldAlert, Link as LinkIcon, Copy } from "lucide-react";

type TeamMember = {
  userId: string;
  email: string;
  fullName: string;
  roleId: string;
  role: string;
  status: "pending" | "active" | "suspended" | "revoked";
  joinedAt?: string | null;
};

type TeamRole = {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: string[];
};

export const TeamSettingsPage = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [transferLink, setTransferLink] = useState<string | null>(null);

  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const companies = useAuthStore((state) => state.companies);
  const isOwner = useMemo(() => {
    return companies.find((c) => c.id === currentCompanyId)?.role === "owner";
  }, [companies, currentCompanyId]);

  const load = async () => {
    try {
      setLoading(true);
      const [memberRows, roleRows] = await Promise.all([
        teamService.listMembers(),
        teamService.listRoles(),
      ]);
      setMembers(memberRows);
      setRoles(roleRows);
      if (!inviteRoleId && roleRows[0]?.id) setInviteRoleId(roleRows[0].id);
    } catch {
      toast.error("Unable to load team data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(() => members.filter((member) => member.status === "pending"), [members]);

  const invite = async () => {
    if (!inviteEmail || !inviteRoleId) return;
    try {
      await teamService.inviteMember(inviteEmail, inviteRoleId);
      toast.success("Invitation sent.");
      setInviteEmail("");
      await load();
    } catch {
      toast.error("Unable to send invitation.");
    }
  };

  const changeRole = async (userId: string, roleId: string) => {
    try {
      await teamService.updateRole(userId, roleId);
      toast.success("Role updated.");
      await load();
    } catch {
      toast.error("Unable to update role.");
    }
  };

  const remove = async (userId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await teamService.removeMember(userId);
      toast.success("Member removed.");
      await load();
    } catch {
      toast.error("Unable to remove member.");
    }
  };

  const initiateTransfer = async (targetUserId: string) => {
    if (!confirm("Are you sure you want to transfer ownership to this user? You will no longer be the primary owner.")) return;
    try {
      const { transferLinkPreview } = await teamService.requestTransfer(targetUserId);
      setTransferLink(transferLinkPreview);
      toast.success("Transfer link generated!");
    } catch {
      toast.error("Unable to initiate transfer.");
    }
  };

  const copyTransferLink = () => {
    if (transferLink) {
      navigator.clipboard.writeText(transferLink);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Team Settings" subtitle="Manage members, roles, and invitations" />

      <div className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4">
        <input
          className="h-10 rounded border border-border px-3 text-sm md:col-span-2"
          placeholder="Invite by email"
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
        />
        <select className="h-10 rounded border border-border px-3 text-sm" value={inviteRoleId} onChange={(event) => setInviteRoleId(event.target.value)}>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-btn bg-gold px-4 text-sm text-white" onClick={invite} type="button">
          Invite
        </button>
      </div>

      <div className="rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-charcoal">Members</h2>
        {loading ? <p className="mt-3 text-sm text-muted">Loading...</p> : null}
         <div className="mt-3 space-y-3">
          {transferLink && (
            <div className="rounded-md border border-gold/30 bg-gold/5 p-4 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-2 text-gold font-bold text-sm">
                <ShieldAlert className="h-4 w-4" /> Ownership Transfer Link
              </div>
              <p className="mt-1 text-xs text-slate-600">Give this link to the new owner. They must be logged in to accept it.</p>
              <div className="mt-3 flex items-center gap-2">
                <input readOnly className="h-9 flex-1 rounded border border-border bg-white px-3 text-xs text-muted" value={transferLink} />
                <button onClick={copyTransferLink} className="flex h-9 items-center gap-2 rounded bg-charcoal px-3 text-xs text-white">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button onClick={() => setTransferLink(null)} className="text-xs text-muted hover:text-ruby px-2">Cancel</button>
              </div>
            </div>
          )}
          {members.map((member) => (
            <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3 group hover:border-gold/30 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-charcoal">{member.fullName}</span>
                  {member.role === 'owner' && <span className="bg-gold/10 text-gold text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Owner</span>}
                </div>
                <div className="text-xs text-muted">{member.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && member.role !== 'owner' && member.status === 'active' && (
                  <button 
                    className="h-9 px-3 rounded border border-border text-xs text-slate-600 hover:bg-gold hover:text-white hover:border-gold transition-all flex items-center gap-1.5"
                    onClick={() => initiateTransfer(member.userId)}
                  >
                    <LinkIcon className="h-3.5 w-3.5" /> Transfer Ownership
                  </button>
                )}
                <select
                  disabled={member.role === 'owner'}
                  className="h-9 rounded border border-border px-2 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                  value={member.roleId}
                  onChange={(event) => changeRole(member.userId, event.target.value)}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <button 
                  disabled={member.role === 'owner'}
                  className="rounded border border-ruby/30 px-3 py-2 text-xs text-ruby hover:bg-ruby hover:text-white transition-all disabled:opacity-0" 
                  onClick={() => remove(member.userId)} 
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-charcoal">Pending invitations</h2>
        {pending.length === 0 ? <p className="mt-3 text-sm text-muted">No pending invitations.</p> : null}
        <div className="mt-3 space-y-2">
          {pending.map((member) => (
            <div key={member.userId} className="flex items-center justify-between rounded border border-border p-3 text-sm">
              <span>{member.email} • {member.role}</span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border border-border px-2 py-1 text-xs"
                  onClick={() => teamService.inviteMember(member.email, member.roleId).then(() => toast.success("Invitation resent.")).catch(() => toast.error("Unable to resend invitation."))}
                  type="button"
                >
                  Resend
                </button>
                <button className="rounded border border-ruby/30 px-2 py-1 text-xs text-ruby" onClick={() => remove(member.userId)} type="button">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
