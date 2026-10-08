import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { teamService } from "@/services/teamService";
import { useAuthStore } from "@/stores/authStore";
import { ShieldAlert, Link as LinkIcon, Copy } from "lucide-react";
export const TeamSettingsPage = () => {
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRoleId, setInviteRoleId] = useState("");
    const [transferLink, setTransferLink] = useState(null);
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
            if (!inviteRoleId && roleRows[0]?.id)
                setInviteRoleId(roleRows[0].id);
        }
        catch {
            toast.error("Unable to load team data.");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);
    const pending = useMemo(() => members.filter((member) => member.status === "pending"), [members]);
    const invite = async () => {
        if (!inviteEmail || !inviteRoleId)
            return;
        try {
            await teamService.inviteMember(inviteEmail, inviteRoleId);
            toast.success("Invitation sent.");
            setInviteEmail("");
            await load();
        }
        catch {
            toast.error("Unable to send invitation.");
        }
    };
    const changeRole = async (userId, roleId) => {
        try {
            await teamService.updateRole(userId, roleId);
            toast.success("Role updated.");
            await load();
        }
        catch {
            toast.error("Unable to update role.");
        }
    };
    const remove = async (userId) => {
        if (!confirm("Remove this member?"))
            return;
        try {
            await teamService.removeMember(userId);
            toast.success("Member removed.");
            await load();
        }
        catch {
            toast.error("Unable to remove member.");
        }
    };
    const initiateTransfer = async (targetUserId) => {
        if (!confirm("Are you sure you want to transfer ownership to this user? You will no longer be the primary owner."))
            return;
        try {
            const { transferLinkPreview } = await teamService.requestTransfer(targetUserId);
            setTransferLink(transferLinkPreview);
            toast.success("Transfer link generated!");
        }
        catch {
            toast.error("Unable to initiate transfer.");
        }
    };
    const copyTransferLink = () => {
        if (transferLink) {
            navigator.clipboard.writeText(transferLink);
            toast.success("Link copied to clipboard!");
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Team Settings", subtitle: "Manage members, roles, and invitations" }), _jsxs("div", { className: "grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-4", children: [_jsx("input", { className: "h-10 rounded border border-border px-3 text-sm md:col-span-2", placeholder: "Invite by email", value: inviteEmail, onChange: (event) => setInviteEmail(event.target.value) }), _jsx("select", { className: "h-10 rounded border border-border px-3 text-sm", value: inviteRoleId, onChange: (event) => setInviteRoleId(event.target.value), children: roles.map((role) => (_jsx("option", { value: role.id, children: role.name }, role.id))) }), _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: invite, type: "button", children: "Invite" })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4", children: [_jsx("h2", { className: "text-sm font-semibold text-charcoal", children: "Members" }), loading ? _jsx("p", { className: "mt-3 text-sm text-muted", children: "Loading..." }) : null, _jsxs("div", { className: "mt-3 space-y-3", children: [transferLink && (_jsxs("div", { className: "rounded-md border border-gold/30 bg-gold/5 p-4 animate-in fade-in zoom-in duration-300", children: [_jsxs("div", { className: "flex items-center gap-2 text-gold font-bold text-sm", children: [_jsx(ShieldAlert, { className: "h-4 w-4" }), " Ownership Transfer Link"] }), _jsx("p", { className: "mt-1 text-xs text-slate-600", children: "Give this link to the new owner. They must be logged in to accept it." }), _jsxs("div", { className: "mt-3 flex items-center gap-2", children: [_jsx("input", { readOnly: true, className: "h-9 flex-1 rounded border border-border bg-white px-3 text-xs text-muted", value: transferLink }), _jsxs("button", { onClick: copyTransferLink, className: "flex h-9 items-center gap-2 rounded bg-charcoal px-3 text-xs text-white", children: [_jsx(Copy, { className: "h-3.5 w-3.5" }), " Copy"] }), _jsx("button", { onClick: () => setTransferLink(null), className: "text-xs text-muted hover:text-ruby px-2", children: "Cancel" })] })] })), members.map((member) => (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3 group hover:border-gold/30 transition-colors", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-charcoal", children: member.fullName }), member.role === 'owner' && _jsx("span", { className: "bg-gold/10 text-gold text-[10px] font-bold px-1.5 py-0.5 rounded uppercase", children: "Owner" })] }), _jsx("div", { className: "text-xs text-muted", children: member.email })] }), _jsxs("div", { className: "flex items-center gap-2", children: [isOwner && member.role !== 'owner' && member.status === 'active' && (_jsxs("button", { className: "h-9 px-3 rounded border border-border text-xs text-slate-600 hover:bg-gold hover:text-white hover:border-gold transition-all flex items-center gap-1.5", onClick: () => initiateTransfer(member.userId), children: [_jsx(LinkIcon, { className: "h-3.5 w-3.5" }), " Transfer Ownership"] })), _jsx("select", { disabled: member.role === 'owner', className: "h-9 rounded border border-border px-2 text-xs disabled:bg-slate-50 disabled:text-slate-400", value: member.roleId, onChange: (event) => changeRole(member.userId, event.target.value), children: roles.map((role) => (_jsx("option", { value: role.id, children: role.name }, role.id))) }), _jsx("button", { disabled: member.role === 'owner', className: "rounded border border-ruby/30 px-3 py-2 text-xs text-ruby hover:bg-ruby hover:text-white transition-all disabled:opacity-0", onClick: () => remove(member.userId), type: "button", children: "Remove" })] })] }, member.userId)))] })] }), _jsxs("div", { className: "rounded-card border border-border bg-card p-4", children: [_jsx("h2", { className: "text-sm font-semibold text-charcoal", children: "Pending invitations" }), pending.length === 0 ? _jsx("p", { className: "mt-3 text-sm text-muted", children: "No pending invitations." }) : null, _jsx("div", { className: "mt-3 space-y-2", children: pending.map((member) => (_jsxs("div", { className: "flex items-center justify-between rounded border border-border p-3 text-sm", children: [_jsxs("span", { children: [member.email, " \u2022 ", member.role] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => teamService.inviteMember(member.email, member.roleId).then(() => toast.success("Invitation resent.")).catch(() => toast.error("Unable to resend invitation.")), type: "button", children: "Resend" }), _jsx("button", { className: "rounded border border-ruby/30 px-2 py-1 text-xs text-ruby", onClick: () => remove(member.userId), type: "button", children: "Cancel" })] })] }, member.userId))) })] })] }));
};
